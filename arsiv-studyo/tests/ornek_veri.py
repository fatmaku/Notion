"""Sentetik örnek arşiv üretir (test ve deneme için): farklı oranlarda foto/video + sahte Instagram dışa aktarımı.
Kullanım: python3 tests/ornek_veri.py <hedef-klasor>"""
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
