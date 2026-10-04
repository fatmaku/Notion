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
    per_week = max(1, min(7, int(per_week)))
    days = sorted(DEFAULT_DAYS[:per_week])
    # önce gelecekteki boş zaman dilimlerini sırala, sonra dağıt (aynı gün/saate iki hatırlatıcı düşmesin)
    taken = {r["due"][:13] for r in db.reminders(con, status="acik")}
    slots = []
    for w in range(weeks + 2):
        for d in days:
            date = monday + dt.timedelta(days=w * 7 + d)
            if date < today:
                continue
            due = dt.datetime.combine(date, dt.time(_best_hour(date.weekday(), hours), 0))
            if due.isoformat()[:13] not in taken:
                slots.append(due)
    slots = slots[:weeks * per_week]
    created, k = [], 0
    for item in queue:
        if (item["id"],) in existing:
            continue
        if k >= len(slots):
            break
        due = slots[k]
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
        # değerler betik kaynağına gömülmez, argüman olarak verilir (kaçış sorunu yok)
        subprocess.run(["osascript", "-e", "on run argv", "-e", "display notification (item 2 of argv) with title (item 1 of argv)",
                        "-e", "end run", str(title), str(text)], capture_output=True)
    print(f"🔔 {title} — {text}")


def notify_due(con, hours=24):
    rows = due(con, hours)
    for r in rows:
        notify(r["title"], (r.get("note") or "")[:120] + f"  ({r['due'][:16].replace('T', ' ')})")
    return rows


def _ics(v):
    """RFC 5545 metin kaçışı (satır sonu enjeksiyonunu engeller)."""
    return (str(v).replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,")
            .replace("\r\n", "\\n").replace("\n", "\\n").replace("\r", ""))


def export_ics(con, path, status="acik"):
    """Takvim uygulamasına aktarılabilir .ics dosyası (uyarılı)."""
    lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ArsivStudyo//TR", "CALSCALE:GREGORIAN"]
    for r in db.reminders(con, status=status):
        start = dt.datetime.fromisoformat(r["due"][:19])
        end = start + dt.timedelta(minutes=30)
        desc = _ics(r.get("note") or "")
        lines += ["BEGIN:VEVENT", f"UID:arsiv-{r['id']}-{uuidlib.uuid4().hex[:8]}",
                  f"DTSTAMP:{dt.datetime.now(dt.timezone.utc):%Y%m%dT%H%M%SZ}", f"DTSTART:{start:%Y%m%dT%H%M%S}", f"DTEND:{end:%Y%m%dT%H%M%S}",
                  f"SUMMARY:{_ics(r['title'])}", f"DESCRIPTION:{desc}", "BEGIN:VALARM", "TRIGGER:-PT0M", "ACTION:DISPLAY",
                  f"DESCRIPTION:{_ics(r['title'])}", "END:VALARM", "END:VEVENT"]
    lines.append("END:VCALENDAR")
    with open(path, "w", encoding="utf-8") as f:
        f.write("\r\n".join(lines) + "\r\n")
    return path


def mark(con, rid, status="tamam"):
    db.set_reminder(con, rid, status=status)


def plan_special_days(con, days_ahead=35, lang=None, lead_days=3):
    """Özel günlerden `lead_days` gün önce hazırlık hatırlatıcısı (ör. Dünya Kitap Günü)."""
    from . import takvim
    lang = lang or i18n.lang_of(con)
    existing = {r["title"] for r in db.reminders(con, status="hepsi", limit=5000)}
    created = []
    for d in takvim.upcoming(lang, days=days_ahead):
        due = dt.datetime.combine(dt.date.fromisoformat(d["tarih"]) - dt.timedelta(days=lead_days), dt.time(10, 0))
        if due < dt.datetime.now():
            due = dt.datetime.now().replace(minute=0, second=0, microsecond=0) + dt.timedelta(hours=1)
        title = i18n.t(lang, "Hazırlan: {ad} ({tarih})", ad=d["ad"], tarih=d["tarih"][8:10] + "." + d["tarih"][5:7])
        if title in existing:
            continue
        rid = db.add_reminder(con, due.replace(microsecond=0).isoformat(), title, note=d["fikir"])
        created.append({"id": rid, "due": due.isoformat(), "title": title})
    return created
