"""Einrichtungs-/kurulum asistanı: her adımın durumu, ne yapılacağı ve telefonda açılacak QR bağlantısı."""
import platform
import shutil
import sys
from pathlib import Path

from . import db

INSTAGRAM_DYI = "https://accountscenter.instagram.com/info_and_permissions/dyi/"
PRO_HESAP = "https://help.instagram.com/502981923235522"

# anahtar -> (başlık TR/DE/EN, açıklama TR/DE/EN)
TEXT = {
    "python": (("Python ve uygulama", "Python und App", "Python and app"),
               ("Uygulama çalışıyor", "Die App läuft", "The app is running")),
    "ffmpeg": (("Video motoru (ffmpeg)", "Video-Engine (ffmpeg)", "Video engine (ffmpeg)"),
               ("Video üretimi için gerekli. Kur.command otomatik kurar; olmazsa Terminal'de: brew install ffmpeg",
                "Nötig für die Videoerstellung. Kur.command installiert es automatisch; sonst im Terminal: brew install ffmpeg",
                "Needed to render videos. Kur.command installs it; otherwise in Terminal: brew install ffmpeg")),
    "fotolar": (("Fotoğraflar kütüphanesine erişim", "Zugriff auf die Fotos-Mediathek", "Access to the Photos library"),
                ("Sistem Ayarları › Gizlilik ve Güvenlik › Tam Disk Erişimi › Terminal'i açın, sonra Terminal'i yeniden başlatın",
                 "Systemeinstellungen › Datenschutz & Sicherheit › Festplattenvollzugriff › Terminal einschalten, dann Terminal neu starten",
                 "System Settings › Privacy & Security › Full Disk Access › enable Terminal, then restart Terminal")),
    "arsiv": (("Arşivi bağla", "Archiv verbinden", "Connect your archive"),
              ("İçe aktar › Fotoğraflar kütüphanesi ya da bir klasör. Dosyalar kopyalanmaz.",
               "Importieren › Fotos-Mediathek oder ein Ordner. Es wird nichts kopiert.",
               "Import › Photos library or a folder. Nothing is copied.")),
    "analiz": (("Viral analizi", "Viral-Analyse", "Viral analysis"),
               ("Tüm arşiv puanlanır (bir kez; sonra yalnızca yeniler)", "Das ganze Archiv wird bewertet (einmal; danach nur Neues)",
                "The whole archive is scored (once; afterwards only new files)")),
    "instagram": (("Instagram verilerini ekle", "Instagram-Daten hinzufügen", "Add your Instagram data"),
                  ("QR kodunu telefonla tara: Instagram'ın veri indirme sayfası açılır (JSON, tüm zamanlar). Gelen ZIP'i İçe aktar › 3'e ver.",
                   "QR-Code mit dem Handy scannen: Instagrams Download-Seite öffnet sich (JSON, gesamter Zeitraum). Die ZIP dann unter Importieren › 3 angeben.",
                   "Scan the QR code with your phone: Instagram's download page opens (JSON, all time). Then give the ZIP to Import › 3.")),
    "kitle": (("Kitle ve istatistik", "Zielgruppe und Statistik", "Audience and statistics"),
              ("Profesyonel hesapta dışa aktarım erişim/beğeni/kitle verisini de getirir; puanlar buna göre öğrenir.",
               "Mit einem Profi-Konto enthält der Export Reichweite, Likes und Zielgruppe; die Bewertung lernt daraus.",
               "With a professional account the export includes reach, likes and audience; scoring learns from it.")),
    "handy": (("Telefonu bağla", "Handy verbinden", "Connect your phone"),
              ("QR kodunu telefon kamerasıyla tara: paketler telefona gelir, telefondan foto/video puanlatırsın.",
               "QR-Code mit der Handy-Kamera scannen: Pakete landen auf dem Handy, Fotos/Videos vom Handy bewerten.",
               "Scan the QR code with your phone camera: packages arrive on the phone, score photos/videos from it.")),
    "claude": (("Claude metinleri", "Claude-Texte", "Claude texts"),
               ("ANTHROPIC_API_KEY tanımlanırsa Claude görsele bakıp metin yazar", "Mit ANTHROPIC_API_KEY schreibt Claude die Texte passend zum Bild",
                "With ANTHROPIC_API_KEY Claude writes texts that match the picture")),
}
LI = {"tr": 0, "de": 1, "en": 2}


def _photos_library():
    libs = sorted(Path.home().glob("Pictures/*.photoslibrary"))
    if not libs:
        return None, None
    db_file = libs[0] / "database" / "Photos.sqlite"
    try:
        with open(db_file, "rb") as f:
            f.read(1)
        return libs[0], True
    except OSError:
        return libs[0], False


def status(con, lang="tr"):
    from . import media, mobil, yazi
    li = LI.get(lang, 0)
    steps = []

    def add(key, ok, detail=None, action=None, qr=None, optional=False):
        title, hint = TEXT[key]
        steps.append({"key": key, "ok": ok, "opsiyonel": optional, "baslik": title[li], "detay": detail or hint[li],
                      "ipucu": hint[li], "aksiyon": action, "qr": qr})

    add("python", True, f"Python {platform.python_version()} · {sys.platform}")
    try:
        media.ffmpeg_path()
        add("ffmpeg", True, ("hazır", "bereit", "ready")[li])
    except Exception:
        add("ffmpeg", False)
    if sys.platform == "darwin":
        lib, readable = _photos_library()
        if lib is not None:
            add("fotolar", bool(readable), lib.name if readable else None, optional=True)
    n_items = con.execute("SELECT COUNT(*) FROM items").fetchone()[0]
    add("arsiv", n_items > 0, (f"{n_items} öğe", f"{n_items} Elemente", f"{n_items} items")[li] if n_items else None,
        action={"tip": "sekme", "hedef": "iceaktar"})
    n_scored = con.execute("SELECT COUNT(*) FROM items WHERE viral_score IS NOT NULL").fetchone()[0]
    add("analiz", n_items > 0 and n_scored >= n_items * 0.9,
        (f"{n_scored}/{n_items} puanlandı", f"{n_scored}/{n_items} bewertet", f"{n_scored}/{n_items} scored")[li] if n_items else None,
        action={"tip": "fn", "hedef": "vAnalyze"})
    n_posts = con.execute("SELECT COUNT(*) FROM posts WHERE COALESCE(kind,'post') NOT IN ('story','live')").fetchone()[0]
    n_stats = con.execute("SELECT COUNT(*) FROM posts WHERE COALESCE(kind,'post') NOT IN ('story','live') "
                          "AND (reach IS NOT NULL OR likes IS NOT NULL)").fetchone()[0]
    add("instagram", n_posts > 0,
        (f"{n_posts} paylaşım, {n_stats} istatistikli", f"{n_posts} Beiträge, {n_stats} mit Statistik", f"{n_posts} posts, {n_stats} with stats")[li]
        if n_posts else None, action={"tip": "sekme", "hedef": "iceaktar"}, qr=INSTAGRAM_DYI)
    has_ozet = bool(db.get_setting(con, "hesap_ozeti", ""))
    add("kitle", has_ozet, None, action={"tip": "sekme", "hedef": "iceaktar"}, qr=None if has_ozet else PRO_HESAP, optional=True)
    st = mobil.status(con)
    on = bool(st["cihazlar"]) and st["acik"] and st["calisiyor"]
    n_dev = len(st["cihazlar"])
    detail = ((f"{n_dev} cihaz bağlı", f"{n_dev} Gerät(e) verbunden", f"{n_dev} device(s) connected")[li] if on else
              ("Telefon erişimi kapalı", "Handy-Zugang ist aus", "Phone access is off")[li] if n_dev else None)
    add("handy", on, detail, action={"tip": "fn", "hedef": "phoneOpen"})
    add("claude", yazi.claude_available(), None, optional=True)
    req = [s for s in steps if not s["opsiyonel"]]
    return {"adimlar": steps, "tamam": sum(1 for s in req if s["ok"]), "toplam": len(req),
            "bitti": all(s["ok"] for s in req), "ffmpeg_yok": not any(s["key"] == "ffmpeg" and s["ok"] for s in steps),
            "sistem": {"python": platform.python_version(), "platform": sys.platform, "sips": bool(shutil.which("sips"))}}
