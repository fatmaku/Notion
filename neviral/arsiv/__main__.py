"""Komut satırı: python3 -m arsiv <komut> [seçenekler]"""
import argparse
import datetime as dt
import json
import sys
from pathlib import Path

from . import config, db


def _print(*a):
    print(*a, flush=True)


def cmd_tara(args):
    from . import scan
    con = db.connect(args.db)
    for root in args.klasor:
        scan.scan_folder(con, root, source=args.kaynak, workers=args.paralel, force=args.zorla)


def cmd_fotograflar(args):
    from . import photos_mac
    con = db.connect(args.db)
    photos_mac.import_photos(con, args.kutuphane, limit=args.limit)


def cmd_instagram(args):
    from . import instagram
    con = db.connect(args.db)
    if args.csv:
        instagram.import_insights_csv(con, args.klasor)
    else:
        instagram.import_export(con, args.klasor)


def _fmt_item(i):
    dur = f" {i['duration']:.0f}sn" if i.get("kind") == "video" else ""
    posted = " ✓paylaşıldı" if i.get("posted_at") else ""
    return f"#{i['id']:<6} {i['social_score']:>5.1f}p  {i.get('created_at', '')[:10]}  {i.get('kind')}{dur:<6} {i.get('aspect', ''):<5} {i.get('filename')}{posted}"


def cmd_ara(args):
    con = db.connect(args.db)
    res = db.search(con, q=args.q, kind=args.tur, aspect=args.oran, orientation=args.yon, year=args.yil, year_from=args.yil_bas,
                    year_to=args.yil_son, min_dur=args.min_sure, max_dur=args.max_sure, favorite=(True if args.favori else None),
                    posted=(False if args.paylasilmamis else (True if args.paylasilmis else None)), min_score=args.min_puan,
                    available=(True if args.yerel else None), sort=args.sirala, limit=args.limit)
    _print(f"{res['total']} sonuç (ilk {len(res['items'])}):")
    for i in res["items"]:
        _print(_fmt_item(i))
    if args.json:
        _print(json.dumps(res["items"], ensure_ascii=False, indent=1))


def cmd_adaylar(args):
    from . import score
    con = db.connect(args.db)
    res = score.candidates(con, kind=args.tur, min_score=args.min_puan, limit=args.limit)
    _print(f"Paylaşılmamış en uygun {len(res['items'])} öğe (toplam {res['total']}):")
    for i in res["items"]:
        _print(_fmt_item(i), " —", ", ".join(i.get("score_reasons") or []))


def cmd_yeniden(args):
    from . import score
    con = db.connect(args.db)
    q = score.reshare_queue(con, min_days=args.gun, limit=args.limit)
    _print(f"Yeniden paylaşım kuyruğu ({len(q)}):")
    for i in q:
        _print(_fmt_item(i), " —", "; ".join(i.get("gerekce") or []))


def cmd_bugun(args):
    from . import score
    con = db.connect(args.db)
    date = dt.date.fromisoformat(args.tarih) if args.tarih else dt.date.today()
    items = score.on_this_day(con, date, limit=args.limit)
    _print(f"{date} — geçmiş yıllarda aynı günler ({len(items)}):")
    for i in items:
        _print(_fmt_item(i))


def cmd_topla(args):
    from . import collect, score
    con = db.connect(args.db)
    if args.id:
        ids = [int(x) for x in args.id]
    elif args.adaylar:
        ids = [i["id"] for i in score.candidates(con, min_score=args.min_puan, limit=args.limit)["items"]]
    elif args.yeniden:
        ids = [i["id"] for i in score.reshare_queue(con, limit=args.limit)]
    else:
        ids = [i["id"] for i in db.search(con, q=args.q, min_score=args.min_puan, limit=args.limit, available=True)["items"]]
    collect.collect(con, ids, args.ad, mode=args.mod)


def cmd_uret(args):
    from . import studio
    con = db.connect(args.db)
    if args.brief:
        brief = json.loads(Path(args.brief).read_text(encoding="utf-8"))
    else:
        brief = {}
    if args.id:
        brief["ogeler"] = [int(x) for x in args.id]
    for k in ("sablon", "format", "baslik", "altbaslik", "cta", "etiket", "muzik", "gecis"):
        v = getattr(args, k, None)
        if v is not None:
            brief[k] = v
    if args.max_sure:
        brief["max_sure"] = args.max_sure
    res = studio.render(con, brief, progress=_print)
    rid = db.add_render(con, res["sablon"], brief, brief.get("ogeler", []))
    db.set_render(con, rid, output=res["output"], cover=res.get("cover"), caption=res.get("caption"), status="hazir", duration=res.get("duration"))
    _print("\nAçıklama önerisi:\n" + (res.get("caption") or ""))


def cmd_duzelt(args):
    from . import fix
    out = args.cikti or str(Path(args.video).with_name(Path(args.video).stem + "-duzeltilmis.mp4"))
    r = fix.fix_video(args.video, out, fmt=args.format, stabilize=args.sabitle, denoise=args.gurultu, max_dur=args.max_sure,
                      headline=args.baslik, handle=args.etiket, progress=_print)
    _print(json.dumps(r, ensure_ascii=False))


def cmd_hatirlat(args):
    from . import reminders
    con = db.connect(args.db)
    if args.alt == "planla":
        reminders.plan_reshares(con, weeks=args.hafta, per_week=args.haftada, min_days=args.gun)
        reminders.plan_on_this_day(con, days_ahead=args.hafta * 7)
    elif args.alt == "ekle":
        rid = db.add_reminder(con, args.tarih, args.baslik, note=args.not_, item_ids=[int(x) for x in (args.id or [])])
        _print(f"hatırlatıcı #{rid} eklendi")
    elif args.alt == "tamam":
        reminders.mark(con, args.no, "tamam")
    elif args.alt == "bildir":
        reminders.notify_due(con, hours=args.saat)
    elif args.alt == "ics":
        _print("yazıldı:", reminders.export_ics(con, args.cikti))
    else:
        for r in db.reminders(con, status=args.durum):
            _print(f"#{r['id']:<4} {r['due'][:16].replace('T', ' ')}  [{r['status']}] {r['title']}  {('— ' + r['note']) if r.get('note') else ''}")


def cmd_pazarlama(args):
    from . import marketing
    con = db.connect(args.db)
    if args.alt == "saatler":
        _print(json.dumps(marketing.best_times(con), ensure_ascii=False, indent=1))
    elif args.alt == "fikirler":
        for i in marketing.ideas(con):
            _print(f"• {i['baslik']}: {i['aciklama']}  → şablon: {i['sablon']}, öğeler: {i['ogeler']}")
    else:
        items = db.get_items(con, [int(x) for x in (args.id or [])])
        _print(marketing.caption({"baslik": args.baslik, "altbaslik": args.altbaslik, "cta": args.cta, "etiket": args.etiket}, items,
                                 use_claude=not args.claude_yok))


def cmd_puanla(args):
    from . import score
    con = db.connect(args.db)
    _print(score.rescore_all(con, progress=lambda n: _print(f"  {n}")), "öğe yeniden puanlandı")


def cmd_durum(args):
    con = db.connect(args.db)
    s = db.stats(con)
    _print(f"Veritabanı: {args.db or config.DB_PATH}")
    _print(f"Öğe: {s['toplam']} (foto {s['foto']}, video {s['video']} / {s['video_saat']} saat), {s['boyut_gb']} GB")
    _print(f"Paylaşılmış: {s['paylasilan']}   Aday (≥60p, paylaşılmamış): {s['aday']}   Favori: {s['favori']}   Yerelde olmayan: {s['yerel_degil']}")
    _print("Yıllar:", ", ".join(f"{y['year']}:{y['n']}" for y in s["yillar"]))
    _print("Açık hatırlatıcı:", s["hatirlatici_acik"], "  Üretim:", s["uretim"])


def cmd_viral(args):
    from . import viral
    con = db.connect(args.db)
    if args.alt == "analiz":
        viral.analyze(con, progress=_print, force=args.zorla, deep_videos=args.derin)
    elif args.alt == "puanla":
        _print(viral.rescore(con, progress=_print), "öğe puanlandı")
    elif args.alt == "paket":
        r = viral.package(con, args.id, platforms=args.platform, langs=args.dil, progress=_print, use_claude=not args.claude_yok,
                          opts={"stil": args.stil, "ab": args.ab, "hook": args.kanca or ""})
        _print(json.dumps(r, ensure_ascii=False))
    elif args.alt == "eniyi":
        viral.top_packages(con, args.n, platforms=args.platform, langs=args.dil, progress=_print, use_claude=not args.claude_yok,
                           opts={"stil": args.stil, "ab": args.ab})
    else:
        lang = i18n_lang(con)
        res = viral.rank(con, lang=lang, platform=args.platform, kind=args.tur, limit=args.limit)
        _print(f"{res['total']} öğe (analiz bekleyen: {res['analiz_bekleyen']})")
        for it in res["items"]:
            n = it["neviral"]
            mk = " ".join(f"{m['bayrak']}{int(m['pay'] * 100)}%" for m in n["pazarlar"])
            _print(f"#{it['id']:<6} {it['viral_score']:>5.1f}  {n['en_iyi']['ad']:<18} {mk}  {it.get('filename')}  — {', '.join(n['nedenler'][:2])}")


def i18n_lang(con):
    from . import i18n
    return i18n.lang_of(con)


def cmd_sunucu(args):
    from . import server
    server.serve(args.db, host=args.host, port=args.port, open_browser=not args.tarayici_yok)


def main(argv=None):
    p = argparse.ArgumentParser(prog="arsiv", description="neviral — iCloud/klasör arşivinden sosyal medya içeriği")
    p.add_argument("--db", help=f"veritabanı yolu (varsayılan {config.DB_PATH})")
    sp = p.add_subparsers(dest="cmd", required=True)

    s = sp.add_parser("tara", help="klasörleri tara (iCloud Drive, harici disk, indirilmiş orijinaller)")
    s.add_argument("klasor", nargs="+"); s.add_argument("--kaynak", default="klasor"); s.add_argument("--paralel", type=int, default=4)
    s.add_argument("--zorla", action="store_true", help="değişmemiş dosyaları da yeniden işle"); s.set_defaults(f=cmd_tara)

    s = sp.add_parser("fotograflar", help="macOS Fotoğraflar (iCloud Fotoğraflar) kütüphanesini içe aktar")
    s.add_argument("--kutuphane"); s.add_argument("--limit", type=int); s.set_defaults(f=cmd_fotograflar)

    s = sp.add_parser("instagram", help="Instagram 'Bilgilerini indir' klasörünü içe aktar ve eşle")
    s.add_argument("klasor"); s.add_argument("--csv", action="store_true", help="Profesyonel Panel performans CSV'si"); s.set_defaults(f=cmd_instagram)

    s = sp.add_parser("ara", help="arşivde ara")
    s.add_argument("q", nargs="?"); s.add_argument("--tur", choices=["foto", "video"]); s.add_argument("--oran"); s.add_argument("--yon", choices=["dikey", "yatay", "kare"])
    s.add_argument("--yil", type=int); s.add_argument("--yil-bas", type=int); s.add_argument("--yil-son", type=int)
    s.add_argument("--min-sure", type=float); s.add_argument("--max-sure", type=float); s.add_argument("--favori", action="store_true")
    s.add_argument("--paylasilmamis", action="store_true"); s.add_argument("--paylasilmis", action="store_true"); s.add_argument("--yerel", action="store_true")
    s.add_argument("--min-puan", type=float); s.add_argument("--sirala", default="score", choices=list(db.SORTS)); s.add_argument("--limit", type=int, default=40)
    s.add_argument("--json", action="store_true"); s.set_defaults(f=cmd_ara)

    s = sp.add_parser("adaylar", help="paylaşıma en uygun, henüz paylaşılmamış öğeler")
    s.add_argument("--tur", choices=["foto", "video"]); s.add_argument("--min-puan", type=float, default=50); s.add_argument("--limit", type=int, default=30); s.set_defaults(f=cmd_adaylar)

    s = sp.add_parser("yeniden", help="yeniden paylaşım kuyruğu")
    s.add_argument("--gun", type=int, default=180); s.add_argument("--limit", type=int, default=30); s.set_defaults(f=cmd_yeniden)

    s = sp.add_parser("bugun", help="bugün geçen yıllarda")
    s.add_argument("--tarih"); s.add_argument("--limit", type=int, default=20); s.set_defaults(f=cmd_bugun)

    s = sp.add_parser("topla", help="öğeleri bir klasörde topla")
    s.add_argument("ad"); s.add_argument("--id", nargs="*"); s.add_argument("--adaylar", action="store_true"); s.add_argument("--yeniden", action="store_true")
    s.add_argument("--q"); s.add_argument("--min-puan", type=float, default=55); s.add_argument("--limit", type=int, default=100)
    s.add_argument("--mod", default="link", choices=["link", "symlink", "copy"]); s.set_defaults(f=cmd_topla)

    s = sp.add_parser("uret", help="hikâye / reel / carousel üret")
    s.add_argument("--brief", help="JSON brief dosyası"); s.add_argument("--id", nargs="*"); s.add_argument("--sablon", choices=["montaj", "tekli", "eskiden-simdi", "alinti", "carousel", "yeniden"])
    s.add_argument("--format", choices=list(config.FORMATS)); s.add_argument("--baslik"); s.add_argument("--altbaslik"); s.add_argument("--cta"); s.add_argument("--etiket")
    s.add_argument("--muzik", help="sakin | enerjik | duygusal | yok | dosya.mp3"); s.add_argument("--gecis"); s.add_argument("--max-sure", type=float); s.set_defaults(f=cmd_uret)

    s = sp.add_parser("duzelt", help="tek videoyu yeniden paylaşım için düzelt")
    s.add_argument("video"); s.add_argument("--cikti"); s.add_argument("--format", default="9:16", choices=list(config.FORMATS))
    s.add_argument("--sabitle", action="store_true"); s.add_argument("--gurultu", action="store_true"); s.add_argument("--max-sure", type=float)
    s.add_argument("--baslik"); s.add_argument("--etiket"); s.set_defaults(f=cmd_duzelt)

    s = sp.add_parser("hatirlat", help="hatırlatıcılar")
    ss = s.add_subparsers(dest="alt")
    a = ss.add_parser("planla"); a.add_argument("--hafta", type=int, default=4); a.add_argument("--haftada", type=int, default=3); a.add_argument("--gun", type=int, default=180)
    a = ss.add_parser("ekle"); a.add_argument("tarih", help="2026-10-05T19:00"); a.add_argument("baslik"); a.add_argument("--not", dest="not_"); a.add_argument("--id", nargs="*")
    a = ss.add_parser("tamam"); a.add_argument("no", type=int)
    a = ss.add_parser("bildir"); a.add_argument("--saat", type=int, default=24)
    a = ss.add_parser("ics"); a.add_argument("cikti")
    a = ss.add_parser("liste"); a.add_argument("--durum", default="acik")
    s.set_defaults(f=cmd_hatirlat, durum="acik")

    s = sp.add_parser("pazarlama", help="açıklama, hashtag, en iyi saatler, fikirler")
    ss = s.add_subparsers(dest="alt")
    a = ss.add_parser("aciklama"); a.add_argument("--id", nargs="*"); a.add_argument("--baslik"); a.add_argument("--altbaslik"); a.add_argument("--cta"); a.add_argument("--etiket"); a.add_argument("--claude-yok", action="store_true")
    ss.add_parser("saatler"); ss.add_parser("fikirler")
    s.set_defaults(f=cmd_pazarlama)

    sp.add_parser("puanla", help="tüm öğeleri yeniden puanla").set_defaults(f=cmd_puanla)

    s = sp.add_parser("viral", help="neviral: viral potansiyel analizi, sıralama, paket")
    ss = s.add_subparsers(dest="alt")
    a = ss.add_parser("analiz"); a.add_argument("--zorla", action="store_true"); a.add_argument("--derin", type=int, default=300)
    ss.add_parser("puanla")
    a = ss.add_parser("liste"); a.add_argument("--platform"); a.add_argument("--tur", choices=["foto", "video"]); a.add_argument("--limit", type=int, default=30)
    from .tasarim import STYLES
    stiller = [*STYLES, "klasik", "otomatik"]
    a = ss.add_parser("paket"); a.add_argument("id", type=int); a.add_argument("--platform", nargs="*"); a.add_argument("--dil", nargs="*"); a.add_argument("--claude-yok", action="store_true")
    a.add_argument("--stil", choices=stiller, default="otomatik"); a.add_argument("--ab", action="store_true", help="2 video: en iyi + ikinci kanca"); a.add_argument("--kanca", help="ekrandaki başlık")
    a = ss.add_parser("eniyi"); a.add_argument("n", type=int, nargs="?", default=10); a.add_argument("--platform", nargs="*"); a.add_argument("--dil", nargs="*"); a.add_argument("--claude-yok", action="store_true")
    a.add_argument("--stil", choices=stiller, default="otomatik"); a.add_argument("--ab", action="store_true")
    s.set_defaults(f=cmd_viral, platform=None, tur=None, limit=30)
    sp.add_parser("durum", help="özet").set_defaults(f=cmd_durum)

    s = sp.add_parser("sunucu", help="web arayüzünü başlat")
    s.add_argument("--host", default="127.0.0.1"); s.add_argument("--port", type=int, default=8765); s.add_argument("--tarayici-yok", action="store_true"); s.set_defaults(f=cmd_sunucu)

    args = p.parse_args(argv)
    try:
        args.f(args)
    except KeyboardInterrupt:
        sys.exit(130)
    except Exception as e:  # kullanıcıya anlaşılır hata
        _print(f"HATA: {e}")
        if "--debug" in (argv or sys.argv):
            raise
        sys.exit(1)


if __name__ == "__main__":
    main()
