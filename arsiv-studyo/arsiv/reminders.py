"""Hatırlatıcılar: yeniden paylaşım planı, 'bugün geçen yıl', takvim (.ics) dışa aktarımı, macOS bildirimi."""
import datetime as dt
import shutil
import subprocess
import uuid as uuidlib

from . import db, i18n, score

# Varsayılan iyi saatler (hafta günü 0=Pzt): analiz verisi yoksa kullanılır
DEFAULT_HOURS = {0: [12, 19], 1: [11, 19], 2: [12, 19], 3: [12, 20], 4: [11, 18], 5: [10, 19], 6: [11, 19]}
DEFAULT_DAYS = [1, 3, 5, 0, 2, 4, 6]  # Sal, Per, Cmt, Pzt, Çar, Cum, Paz


def _best_hour(weekday, hours_by_day):
    hs = hours_by_day.get(weekday) or DEFAULT_HOURS.get(weekday) or [12]
    return hs[0]


def plan_reshares(con, weeks=4, per_week=3, min_days=180, start=None, progress=print, lang=None):
    """Yeniden paylaşım kuyruğunu önümüzdeki haftalara dağıtır; hatırlatıcı oluşturur."""
    from . import marketing
    lang = lang or i18n.lang_of(con)
    queue = score.reshare_queue(con, min_days=min_days, limit=weeks * per_week * 2, lang=lang)
    if not queue:
        progress("Yeniden paylaşım kuyruğu boş (önce Instagram dışa aktarımını içe aktarın ya da öğeleri 'paylaşıldı' işaretleyin).")
        return []
    existing = {tuple(r["item_ids"]) for r in db.reminders(con, status="acik")}
    hours = {}
    for row in marketing.best_times(con).get("saatler", []):
        hours.setdefault(row["gun"], []).append(row["saat"])
    today = start or dt.date.today()
    monday = today - dt.timedelta(days=today.weekday())
    days = DEFAULT_DAYS[:per_week]
    created, k = [], 0
    for item in queue:
        if (item["id"],) in existing:
            continue
        if k >= weeks * per_week:
            break
        week, slot = divmod(k, per_week)
        date = monday + dt.timedelta(days=week * 7 + days[slot])
        if date < today:
            date += dt.timedelta(days=7)
        due = dt.datetime.combine(date, dt.time(_best_hour(date.weekday(), hours), 0))
        title = i18n.t(lang, "Yeniden paylaş: {f}", f=item.get('filename') or item['id'])
        rid = db.add_reminder(con, due.isoformat(), title, note="; ".join(item.get("gerekce") or []),
                              item_ids=[item["id"]], post_id=item.get("post_id"))
        created.append({"id": rid, "due": due.isoformat(), "title": title, "item_id": item["id"]})
        k += 1
    progress(f"{len(created)} hatırlatıcı oluşturuldu")
    return created


def plan_on_this_day(con, days_ahead=14, min_score=55, progress=print, lang=None):
    """Önümüzdeki günler için 'bugün geçen yıl' hatırlatıcıları."""
    lang = lang or i18n.lang_of(con)
    created = []
    existing = {(r["due"][:10], r["title"]) for r in db.reminders(con, status="acik")}
    for k in range(days_ahead):
        date = dt.date.today() + dt.timedelta(days=k)
        items = [i for i in score.on_this_day(con, date, limit=8, span_days=0) if (i.get("social_score") or 0) >= min_score]
        if not items:
            continue
        years = sorted({str(i.get("year")) for i in items})
        title = i18n.t(lang, "Bugün geçen yıl: {n} öğe ({y})", n=len(items), y=', '.join(years))
        if (date.isoformat(), title) in existing:
            continue
        due = dt.datetime.combine(date, dt.time(_best_hour(date.weekday(), {}), 0))
        rid = db.add_reminder(con, due.isoformat(), title, note=i18n.t(lang, "Hikâye ya da 'Eskiden/Şimdi' için uygun"), item_ids=[i["id"] for i in items])
        created.append({"id": rid, "due": due.isoformat(), "title": title})
    progress(f"{len(created)} 'bugün geçen yıl' hatırlatıcısı oluşturuldu")
    return created


def due(con, hours=24):
    until = (dt.datetime.now() + dt.timedelta(hours=hours)).isoformat()
    return db.reminders(con, status="acik", until=until)


def notify(title, text):
    """macOS bildirimi (osascript); yoksa konsola yazar."""
    if shutil.which("osascript"):
        safe_t, safe_x = title.replace('"', "'"), text.replace('"', "'")
        subprocess.run(["osascript", "-e", f'display notification "{safe_x}" with title "{safe_t}"'], capture_output=True)
    print(f"🔔 {title} — {text}")


def notify_due(con, hours=24):
    rows = due(con, hours)
    for r in rows:
        notify(r["title"], (r.get("note") or "")[:120] + f"  ({r['due'][:16].replace('T', ' ')})")
    return rows


def export_ics(con, path, status="acik"):
    """Takvim uygulamasına aktarılabilir .ics dosyası (uyarılı)."""
    lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ArsivStudyo//TR", "CALSCALE:GREGORIAN"]
    for r in db.reminders(con, status=status):
        start = dt.datetime.fromisoformat(r["due"][:19])
        end = start + dt.timedelta(minutes=30)
        desc = (r.get("note") or "").replace("\n", "\\n").replace(",", "\\,")
        lines += ["BEGIN:VEVENT", f"UID:arsiv-{r['id']}-{uuidlib.uuid4().hex[:8]}",
                  f"DTSTAMP:{dt.datetime.utcnow():%Y%m%dT%H%M%SZ}", f"DTSTART:{start:%Y%m%dT%H%M%S}", f"DTEND:{end:%Y%m%dT%H%M%S}",
                  f"SUMMARY:{r['title']}", f"DESCRIPTION:{desc}", "BEGIN:VALARM", "TRIGGER:-PT0M", "ACTION:DISPLAY",
                  f"DESCRIPTION:{r['title']}", "END:VALARM", "END:VEVENT"]
    lines.append("END:VCALENDAR")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\r\n".join(lines) + "\r\n")
    return path


def mark(con, rid, status="tamam"):
    db.set_reminder(con, rid, status=status)
