"""Sosyal medya uygunluk puanı (0-100) ve aday / yeniden paylaşım listeleri."""
import datetime as dt

from . import config, db, i18n


def _has_social_word(values):
    text = " ".join(str(v).lower() for v in values or [])
    return any(w in text for w in config.SOCIAL_WORDS)


def compute(item):
    """(puan, nedenler) döndürür. Kural tabanlı; Apple'ın estetik puanı varsa onu da katar."""
    score, why = 0.0, []
    aspect = item.get("aspect") or ""
    kind = item.get("kind")
    dur = float(item.get("duration") or 0)
    w, h = int(item.get("width") or 0), int(item.get("height") or 0)

    asp_pts = {"9:16": 30, "4:5": 24, "1:1": 20, "3:4": 18, "2:3": 16, "16:9": 8, "4:3": 8, "3:2": 8, "5:4": 10}
    a = asp_pts.get(aspect, 10)
    score += a
    if a >= 16:
        why.append("dikey/kare format")

    if kind == "video":
        if 5 <= dur <= 60:
            score += 20; why.append("ideal süre (5-60 sn)")
        elif 60 < dur <= 90:
            score += 15; why.append("reel süresi (60-90 sn)")
        elif 3 <= dur < 5:
            score += 10
        elif 90 < dur <= 180:
            score += 8; why.append("uzun; kırpılabilir")
        else:
            score += 3
        if item.get("has_audio"):
            score += 3
    else:
        score += 12

    m = min(w, h)
    if m >= 1080:
        score += 15; why.append("yüksek çözünürlük")
    elif m >= 720:
        score += 10
    elif m > 0:
        score += 4; why.append("düşük çözünürlük")

    if item.get("favorite"):
        score += 10; why.append("favori")
    if item.get("edited"):
        score += 8; why.append("düzenlenmiş")
    if item.get("shared"):
        score += 6; why.append("paylaşılan albümde")
    if item.get("persons"):
        score += 5; why.append("kişi var")
    if _has_social_word(list(item.get("albums") or []) + list(item.get("keywords") or [])):
        score += 8; why.append("sosyal medya albümü/etiketi")
    ap = item.get("apple_score")
    if ap is not None:
        try:
            ap = float(ap)
            score += ap * 15
            if ap >= 0.6:
                why.append("Apple estetik puanı yüksek")
        except (TypeError, ValueError):
            pass
    return round(min(100.0, score), 1), why


def rescore_all(con, progress=None):
    n = 0
    for r in con.execute("SELECT * FROM items").fetchall():
        item = db.row_to_item(r)
        s, why = compute(item)
        con.execute("UPDATE items SET social_score=?, score_reasons=? WHERE id=?", (s, db_json(why), item["id"]))
        n += 1
        if progress and n % 1000 == 0:
            progress(n)
    con.commit()
    return n


def db_json(v):
    import json
    return json.dumps(v, ensure_ascii=False)


def candidates(con, kind=None, unposted=True, min_score=50, limit=60, offset=0, **filters):
    """Paylaşıma en uygun, henüz paylaşılmamış öğeler."""
    return db.search(con, kind=kind, posted=(False if unposted else None), min_score=min_score,
                     sort="score", limit=limit, offset=offset, **filters)


def reshare_queue(con, min_days=180, limit=60, lang=None):
    """Eskiden paylaşılmış, yeniden paylaşmaya değer öğeler (en az min_days gün önce paylaşılmış)."""
    cutoff = (dt.datetime.now() - dt.timedelta(days=min_days)).isoformat()
    rows = con.execute("""
        SELECT i.*, p.likes, p.reach, p.caption AS post_caption, p.kind AS post_kind, p.platform
        FROM items i LEFT JOIN posts p ON p.id = i.post_id
        WHERE i.posted_at IS NOT NULL AND i.posted_at <= ? AND i.hidden=0
        ORDER BY (i.social_score + COALESCE(p.likes,0)/10.0) DESC, i.posted_at ASC LIMIT ?""", (cutoff, limit)).fetchall()
    lang = lang or i18n.lang_of(con)
    out = []
    for r in rows:
        d = db.row_to_item(r)
        d["gerekce"] = []
        if d.get("likes"):
            d["gerekce"].append(i18n.t(lang, "{n} beğeni almıştı", n=d["likes"]))
        days = (dt.datetime.now() - dt.datetime.fromisoformat(d["posted_at"][:19])).days if d.get("posted_at") else None
        if days:
            d["gerekce"].append(i18n.t(lang, "{n} gün önce paylaşıldı", n=days))
        d["gerekce"] += [i18n.t(lang, x) for x in (d.get("score_reasons") or [])]
        out.append(d)
    return out


def on_this_day(con, date=None, limit=30, span_days=3):
    """'Bugün geçen yıllarda' — aynı gün (±span_days) önceki yıllardan çekilenler."""
    date = date or dt.date.today()
    days = [(date + dt.timedelta(days=k)) for k in range(-span_days, span_days + 1)]
    pairs = sorted({(d.month, d.day) for d in days})
    where = " OR ".join("(month=? AND day=?)" for _ in pairs)
    args = [x for p in pairs for x in p] + [date.year, limit]
    rows = con.execute(f"SELECT * FROM items WHERE ({where}) AND year<? AND hidden=0 ORDER BY social_score DESC, created_at DESC LIMIT ?",
                       args).fetchall()
    return [db.row_to_item(r) for r in rows]
