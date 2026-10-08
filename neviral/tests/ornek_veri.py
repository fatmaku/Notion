"""Sentetik örnek arşiv üretir (test ve deneme için): farklı oranlarda foto/video + sahte Instagram dışa aktarımı.
Kullanım: python3 tests/ornek_veri.py <hedef-klasor>"""
import datetime as dt
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from arsiv import media  # noqa: E402

PHOTOS = [  # (yol, boy, tarih, renk)
    ("2019/Yaz Tatili/deniz1.jpg", (3024, 4032), "2019:06:01 10:20:30", (40, 120, 200)),
    ("2019/Yaz Tatili/deniz2.jpg", (4032, 3024), "2019:06:02 18:05:00", (230, 160, 60)),
    ("2019/Instagram/kitap-lansman.jpg", (1080, 1350), "2019:11:12 12:00:00", (120, 60, 160)),
    ("2021/Okul/ilk-gun.jpg", (3024, 4032), "2021:09:06 08:30:00", (60, 160, 90)),
    ("2023/deniz3.png", (2000, 2000), "2023:06:01 16:45:00", (200, 80, 80)),
    ("2024/Kitap Fuari/stant.jpg", (4032, 3024), "2024:03:15 14:00:00", (90, 90, 90)),
]
VIDEOS = [  # (yol, boy, süre, tarih, ses)
    ("2019/Yaz Tatili/plaj.mov", "1920x1080", 8, "2019-06-03T09:00:00Z", True),
    ("2020/Instagram/reel-deneme.mp4", "1080x1920", 12, "2020-05-01T10:00:00Z", True),
    ("2021/Okul/kare.mp4", "1080x1080", 4, "2021-09-07T15:00:00Z", False),
    ("2022/uzun-vlog.mp4", "720x1280", 95, "2022-08-10T11:00:00Z", True),
    ("2024/Kitap Fuari/imza.mp4", "1080x1920", 20, "2024-03-16T12:00:00Z", True),
]


def make_photo(path, size, date, color):
    path.parent.mkdir(parents=True, exist_ok=True)
    img = Image.new("RGB", size, color)
    d = ImageDraw.Draw(img)
    w, h = size
    for k in range(6):
        d.ellipse([w * .1 + k * w * .12, h * .2 + k * h * .08, w * .3 + k * w * .12, h * .45 + k * h * .08],
                  fill=(255 - k * 30, 255 - k * 20, 200 - k * 25))
    d.rectangle([w * .1, h * .7, w * .9, h * .9], fill=(255, 255, 255))
    ex = Image.Exif()
    ex[306] = date
    try:
        ex.get_ifd(0x8769)[36867] = date
    except Exception:
        pass
    img.save(path, quality=88, exif=ex.tobytes())


def make_video(path, size, dur, date, audio):
    path.parent.mkdir(parents=True, exist_ok=True)
    args = ["-f", "lavfi", "-i", f"testsrc2=size={size}:rate=30", "-t", str(dur)]
    if audio:
        args += ["-f", "lavfi", "-i", "sine=frequency=440:sample_rate=48000", "-t", str(dur), "-c:a", "aac", "-b:a", "96k", "-shortest"]
    args += ["-c:v", "libx264", "-preset", "veryfast", "-crf", "28", "-pix_fmt", "yuv420p", "-metadata", f"creation_time={date}", "-movflags", "+faststart", path]
    media.run_ffmpeg(args)


def make_instagram(root, arsiv):
    """Sahte 'Bilgilerini indir' klasörü: 2 gönderi (medya dosyası var), 1 reel (var), 1 hikâye (dosya yok)."""
    (root / "media" / "posts").mkdir(parents=True, exist_ok=True)
    (root / "content").mkdir(parents=True, exist_ok=True)
    shutil.copy(arsiv / "2019/Instagram/kitap-lansman.jpg", root / "media/posts/lansman.jpg")
    shutil.copy(arsiv / "2019/Yaz Tatili/deniz1.jpg", root / "media/posts/deniz.jpg")
    shutil.copy(arsiv / "2020/Instagram/reel-deneme.mp4", root / "media/posts/reel.mp4")
    posts = [
        {"media": [{"uri": "media/posts/lansman.jpg", "creation_timestamp": 1573560000, "title": "Kitap lansmanÄ± bugÃ¼n! ð\x9f\x93\x9a"}]},
        {"media": [{"uri": "media/posts/deniz.jpg", "creation_timestamp": 1559600000}], "title": "Yaz geldi â\x98\x80ï¸\x8f"},
    ]
    (root / "content/posts_1.json").write_text(json.dumps(posts, ensure_ascii=False), encoding="utf-8")
    reels = {"ig_reels_media": [{"media": [{"uri": "media/posts/reel.mp4", "creation_timestamp": 1588500000, "title": "Ä°lk reel denemem"}]}]}
    (root / "content/reels.json").write_text(json.dumps(reels, ensure_ascii=False), encoding="utf-8")
    stories = {"ig_stories": [{"uri": "media/stories/yok.mp4", "creation_timestamp": 1710600000, "title": "Fuar hikÃ¢yesi"}]}
    (root / "content/stories.json").write_text(json.dumps(stories, ensure_ascii=False), encoding="utf-8")
    # profesyonel hesap: past_instagram_insights (gerçek dışa aktarımdaki yapı; Almanca arayüzle indirilmiş gibi)
    (root / "past_instagram_insights").mkdir(exist_ok=True)
    ins_posts = {"organic_insights_posts": [
        {"media_map_data": {"Media Thumbnail": {"uri": "media/posts/lansman.jpg", "creation_timestamp": 1573560000, "title": "Kitap lansmanÄ± bugÃ¼n! ð\x9f\x93\x9a #kitap #HappyTuncay"}},
         "string_map_data": {"Erstellungszeitstempel": {"timestamp": 1573560000}, "Erreichte Konten": {"value": "12.345"},
                             "\u00e2\u0080\u009eGef\u00c3\u00a4llt mir\u00e2\u0080\u009c-Angaben": {"value": "980"}, "Impressionen": {"value": "14.533"}, "Neue Follower": {"value": "2"}, "Kommentare": {"value": "45"}, "Geteilt": {"value": "60"},
                             "Gespeichert": {"value": "120"}, "Profilaufrufe": {"value": "33"}}},
        {"media_map_data": {"Media Thumbnail": {"uri": "https://scontent.cdninstagram.com/y.jpg", "creation_timestamp": 1559600000}},
         "string_map_data": {"Erstellungszeitstempel": {"timestamp": 1559600000}, "Erreichte Konten": {"value": "2100"},
                             "\u00e2\u0080\u009eGef\u00c3\u00a4llt mir\u00e2\u0080\u009c-Angaben": {"value": "150"}, "Kommentare": {"value": "3"}, "Gespeichert": {"value": "10"}}},
    ]}
    (root / "past_instagram_insights/posts.json").write_text(json.dumps(ins_posts, ensure_ascii=False), encoding="utf-8")
    ins_reels = {"organic_insights_reels": [
        {"media_map_data": {"Media Thumbnail": {"uri": "media/posts/reel.mp4", "creation_timestamp": 1588500000}},
         "string_map_data": {"Upload Timestamp": {"timestamp": 1588500000}, "Accounts reached": {"value": "40.210"}, "Instagram Plays": {"value": "55000"},
                             "Likes": {"value": "3100"}, "Comments": {"value": "120"}, "Shares": {"value": "410"}, "Saves": {"value": "260"}}},
    ]}
    (root / "past_instagram_insights/reels.json").write_text(json.dumps(ins_reels, ensure_ascii=False), encoding="utf-8")
    # kitle + etkileşim özeti (gerçek dışa aktarımdaki anahtarlar; mojibake dahil)
    aud = {"organic_insights_audience": [{"media_map_data": {}, "string_map_data": {
        "Zeitraum": {"value": "9. Juli - 6. Okt.", "timestamp": 0}, "Follower": {"value": "10.801", "timestamp": 0},
        "Delta von Followern": {"value": "-1,9% im Vergleich zu 10. Apr. - 8. Juli", "timestamp": 0},
        "Neue Follower": {"value": "264", "timestamp": 0}, "Verlorene Follower": {"value": "471", "timestamp": 0},
        "Prozentualer Anteil der Follower nach Land": {"value": "Deutschland: 84,5%, Schweiz: 5,1%, \u00c3\u0096sterreich: 4,4%, T\u00c3\u00bcrkei: 3,6%, Spanien: 0,2%", "timestamp": 0},
        "Prozentualer Anteil an Followern nach Alter f\u00c3\u00bcr alle Geschlechter": {"value": "13-17: 0,1%, 18-24: 1,5%, 25-34: 18,7%, 35-44: 43,1%, 45-54: 26,1%, 55-64: 8%, 65+: 2,1%", "timestamp": 0},
        "Prozentualer Anteil an weiblichen Followern insgesamt": {"value": "78,8%", "timestamp": 0},
        "Prozentualer Anteil an m\u00c3\u00a4nnlichen Followern insgesamt": {"value": "21,1%", "timestamp": 0},
        "Follower-Aktivit\u00c3\u00a4t am Montag": {"value": "9.298", "timestamp": 0}}}]}
    (root / "past_instagram_insights/audience_insights.json").write_text(json.dumps(aud, ensure_ascii=False), encoding="utf-8")
    inter = {"organic_insights_interactions": [{"media_map_data": {}, "string_map_data": {
        "Zeitraum": {"value": "9. Juli - 6. Okt.", "timestamp": 0}, "Content-Interaktionen": {"value": "7.257", "timestamp": 0},
        "Delta mehr Content-Interaktionen": {"value": "-52,7% im Vergleich zu 10. Apr. - 8. Juli", "timestamp": 0},
        "Beitragsinteraktionen": {"value": "614", "timestamp": 0}, "Story-Interaktionen": {"value": "465", "timestamp": 0},
        "Reels-Interaktionen": {"value": "6.173", "timestamp": 0}, "Geteilte Reels": {"value": "571", "timestamp": 0},
        "Gespeicherte Reels": {"value": "572", "timestamp": 0}, "Geteilte Beitr\u00c3\u00a4ge": {"value": "69", "timestamp": 0},
        "Konten, die interagiert haben, nach Follower-Status": {"value": "Follower: 16,8%, Nicht-Follower: 83,2%", "timestamp": 0}}}]}
    (root / "past_instagram_insights/content_interactions.json").write_text(json.dumps(inter, ensure_ascii=False), encoding="utf-8")
    # hikâyeler: saat 20'de 4, saat 9'da 5 → hikâye saatleri 9:00 (n=5) olmalı; 20:00 n<5 elenir
    st_rows = []
    for k, (h, reach) in enumerate([(20, 900), (20, 800), (20, 700), (20, 650), (9, 120), (9, 130), (9, 110), (9, 140), (9, 125)]):
        ts = int(dt.datetime(2026, 3, 1 + k, h, 15).timestamp())
        st_rows.append({"media_map_data": {"Medien-Miniaturbild": {"uri": f"media/stories/202603/st{k}.mp4", "creation_timestamp": ts}},
                        "string_map_data": {"Zeitstempel der Erstellung": {"value": "", "timestamp": ts}, "Erreichte Konten": {"value": str(reach), "timestamp": 0},
                                            "Impressionen": {"value": str(reach + 10), "timestamp": 0}, "Antworten": {"value": "2", "timestamp": 0},
                                            "Geteilte Inhalte": {"value": "1", "timestamp": 0}, "Reaktionen": {"value": "3", "timestamp": 0}}})
    (root / "past_instagram_insights/stories.json").write_text(json.dumps({"organic_insights_stories": st_rows}, ensure_ascii=False), encoding="utf-8")


def build(target):
    target = Path(target)
    arsiv = target / "Arsiv"
    for rel, size, date, color in PHOTOS:
        make_photo(arsiv / rel, size, date, color)
    for rel, size, dur, date, audio in VIDEOS:
        make_video(arsiv / rel, size, dur, date, audio)
    make_instagram(target / "instagram-export", arsiv)
    return arsiv, target / "instagram-export"


if __name__ == "__main__":
    a, i = build(sys.argv[1] if len(sys.argv) > 1 else "ornek")
    print("arşiv:", a)
    print("instagram:", i)
