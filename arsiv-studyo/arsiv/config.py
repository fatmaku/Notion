"""Ortak yollar, uzantılar ve sabitler."""
import os
from pathlib import Path

HOME = Path(os.environ.get("ARSIV_HOME") or (Path.home() / "ArsivStudyo")).expanduser()
DB_PATH = Path(os.environ.get("ARSIV_DB") or (HOME / "arsiv.db"))
THUMBS = HOME / "kucuk-resimler"
RENDERS = HOME / "ciktilar"
CACHE = HOME / "onbellek"
COLLECT = HOME / "koleksiyonlar"

IMAGE_EXT = {".jpg", ".jpeg", ".png", ".heic", ".heif", ".webp", ".tif", ".tiff", ".gif", ".dng", ".bmp"}
VIDEO_EXT = {".mov", ".mp4", ".m4v", ".avi", ".mkv", ".webm", ".3gp", ".mts", ".m2ts", ".mpg", ".mpeg"}
MEDIA_EXT = IMAGE_EXT | VIDEO_EXT

# Albüm / klasör / anahtar kelime adlarında geçtiğinde "sosyal medya için" sinyali sayılan sözcükler
SOCIAL_WORDS = ["instagram", "insta", "story", "stories", "hikaye", "reel", "reels", "tiktok", "youtube",
                "shorts", "paylaş", "paylas", "sosyal", "post", "facebook", "linkedin", "twitter", "tanıtım",
                "tanitim", "fragman", "kitap", "lansman", "reklam", "kampanya"]

# Platform sınırları (saniye)
PLATFORM_LIMITS = {"story": 60, "reel": 90, "post": 60, "tiktok": 180, "shorts": 60}

# Tuval boyutları
FORMATS = {"9:16": (1080, 1920), "4:5": (1080, 1350), "1:1": (1080, 1080), "16:9": (1920, 1080), "3:4": (1080, 1440)}


def ensure_dirs():
    for d in (HOME, THUMBS, RENDERS, CACHE, COLLECT):
        d.mkdir(parents=True, exist_ok=True)
