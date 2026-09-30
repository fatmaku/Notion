"""ffmpeg / ffprobe keşfi, medya bilgisi okuma, küçük resim ve hash üretimi."""
import datetime as dt
import functools
import hashlib
import json
import os
import re
import shutil
import subprocess
from pathlib import Path

from . import config


class MediaError(RuntimeError):
    pass


# ---------------------------------------------------------------- ffmpeg keşfi
def _has_x264(exe):
    try:
        out = subprocess.run([exe, "-hide_banner", "-encoders"], capture_output=True, text=True, timeout=30).stdout
        return "libx264" in out
    except Exception:
        return False


@functools.lru_cache(maxsize=None)
def ffmpeg_path():
    cands = [os.environ.get("ARSIV_FFMPEG"), shutil.which("ffmpeg"), "/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg"]
    try:
        import imageio_ffmpeg  # type: ignore
        cands.append(imageio_ffmpeg.get_ffmpeg_exe())
    except Exception:
        pass
    for c in cands:
        if c and Path(c).exists() and _has_x264(c):
            return c
    raise MediaError("ffmpeg bulunamadı. macOS: `brew install ffmpeg`  (alternatif: `pip install imageio-ffmpeg`)")


@functools.lru_cache(maxsize=None)
def ffprobe_path():
    for c in [os.environ.get("ARSIV_FFPROBE"), shutil.which("ffprobe"), "/opt/homebrew/bin/ffprobe", "/usr/local/bin/ffprobe"]:
        if c and Path(c).exists():
            return c
    sib = Path(ffmpeg_path()).with_name("ffprobe")
    return str(sib) if sib.exists() else None


def run_ffmpeg(args, timeout=None):
    cmd = [ffmpeg_path(), "-y", "-hide_banner", "-loglevel", "error", "-nostdin", *[str(a) for a in args]]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    if r.returncode != 0:
        raise MediaError("ffmpeg hatası: " + (r.stderr.strip()[-2000:] or "bilinmeyen") + "\nkomut: " + " ".join(cmd[:12]) + " ...")
    return r


# ---------------------------------------------------------------- tarih yardımcıları
def parse_iso(s):
    """'2019-06-01T10:20:30.000000Z' / '2019:06:01 10:20:30' gibi tarihleri yerel saate çevirir (naive)."""
    if not s:
        return None
    s = str(s).strip()
    if re.match(r"^\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}", s):  # EXIF
        try:
            return dt.datetime.strptime(s[:19], "%Y:%m:%d %H:%M:%S")
        except ValueError:
            return None
    utc = s.endswith("Z")
    s = s.rstrip("Z")
    if "." in s:
        s = s.split(".")[0]
    try:
        d = dt.datetime.fromisoformat(s)
    except ValueError:
        return None
    if d.tzinfo is not None:
        return d.astimezone().replace(tzinfo=None)
    if utc:
        return d.replace(tzinfo=dt.timezone.utc).astimezone().replace(tzinfo=None)
    return d


def _frac(s):
    try:
        a, b = s.split("/")
        return float(a) / float(b) if float(b) else 0.0
    except Exception:
        try:
            return float(s)
        except Exception:
            return 0.0


# ---------------------------------------------------------------- video bilgisi
def probe(path):
    """Video bilgisi: duration, width, height (döndürme uygulanmış), fps, has_audio, codec, created."""
    info = {"duration": 0.0, "width": 0, "height": 0, "rotation": 0, "fps": 0.0, "has_audio": False,
            "codec": None, "created": None, "hdr": False}
    fp = ffprobe_path()
    if fp:
        r = subprocess.run([fp, "-v", "error", "-print_format", "json", "-show_format", "-show_streams", str(path)],
                           capture_output=True, text=True)
        if r.returncode == 0 and r.stdout.strip():
            j = json.loads(r.stdout)
            fmt = j.get("format", {})
            info["duration"] = float(fmt.get("duration") or 0)
            info["created"] = (fmt.get("tags") or {}).get("creation_time")
            for s in j.get("streams", []):
                if s.get("codec_type") == "video" and not info["width"]:
                    info["width"] = int(s.get("width") or 0)
                    info["height"] = int(s.get("height") or 0)
                    info["codec"] = s.get("codec_name")
                    info["hdr"] = (s.get("color_transfer") or "") in ("arib-std-b67", "smpte2084")
                    rot = (s.get("tags") or {}).get("rotate")
                    for sd in s.get("side_data_list") or []:
                        if sd.get("rotation") is not None:
                            rot = sd["rotation"]
                    info["rotation"] = int(round(float(rot or 0)))
                    info["fps"] = _frac(s.get("avg_frame_rate") or s.get("r_frame_rate") or "0/1")
                    if not info["duration"] and s.get("duration"):
                        info["duration"] = float(s["duration"])
                    if not info["created"]:
                        info["created"] = (s.get("tags") or {}).get("creation_time")
                elif s.get("codec_type") == "audio":
                    info["has_audio"] = True
            return _finish(info)
    # ffprobe yoksa: ffmpeg -i çıktısını ayrıştır
    r = subprocess.run([ffmpeg_path(), "-hide_banner", "-i", str(path)], capture_output=True, text=True)
    err = r.stderr
    m = re.search(r"Duration:\s*(\d+):(\d+):([\d.]+)", err)
    if m:
        info["duration"] = int(m[1]) * 3600 + int(m[2]) * 60 + float(m[3])
    m = re.search(r"Video:\s*(\w+).*?(?<![\dx])(\d{2,5})x(\d{2,5})", err)
    if m:
        info["codec"], info["width"], info["height"] = m[1], int(m[2]), int(m[3])
    m = re.search(r"([\d.]+) fps", err)
    if m:
        info["fps"] = float(m[1])
    m = re.search(r"rotation of (-?[\d.]+) degrees", err) or re.search(r"rotate\s*:\s*(-?\d+)", err)
    if m:
        info["rotation"] = int(round(float(m[1])))
    info["has_audio"] = "Audio:" in err
    info["hdr"] = ("arib-std-b67" in err) or ("smpte2084" in err)
    m = re.search(r"creation_time\s*:\s*(\S+)", err)
    if m:
        info["created"] = m[1]
    if not info["width"] and "Invalid data" in err:
        raise MediaError(f"okunamadı: {path}")
    return _finish(info)


def _finish(info):
    if abs(info["rotation"]) % 180 == 90:
        info["width"], info["height"] = info["height"], info["width"]
    info["created"] = parse_iso(info["created"]) if info["created"] else None
    return info


# ---------------------------------------------------------------- görüntü bilgisi
_HEIF_READY = None


def _heif():
    global _HEIF_READY
    if _HEIF_READY is None:
        try:
            import pillow_heif  # type: ignore
            pillow_heif.register_heif_opener()
            _HEIF_READY = True
        except Exception:
            _HEIF_READY = False
    return _HEIF_READY


def _sips_convert(src):
    """macOS'ta pillow-heif yoksa HEIC'i sistemin sips aracıyla JPEG'e çevirir."""
    if not shutil.which("sips"):
        return None
    config.CACHE.mkdir(parents=True, exist_ok=True)
    dst = config.CACHE / ("heic-" + hashlib.sha1(str(src).encode()).hexdigest()[:16] + ".jpg")
    if not dst.exists():
        r = subprocess.run(["sips", "-s", "format", "jpeg", str(src), "--out", str(dst)], capture_output=True)
        if r.returncode != 0:
            return None
    return dst


def open_image(path):
    """Pillow ile açar; HEIC ve EXIF döndürmeyi halleder."""
    from PIL import Image, ImageOps
    p = Path(path)
    if p.suffix.lower() in (".heic", ".heif") and not _heif():
        conv = _sips_convert(p)
        if not conv:
            raise MediaError("HEIC için `pip install pillow-heif` gerekli (macOS'ta sips de bulunamadı)")
        p = conv
    img = Image.open(p)
    try:
        img = ImageOps.exif_transpose(img)
    except Exception:
        pass
    return img


def image_info(path):
    """Fotoğraf bilgisi: width, height (döndürme uygulanmış), created (EXIF)."""
    from PIL import Image
    p = Path(path)
    if p.suffix.lower() in (".heic", ".heif") and not _heif():
        conv = _sips_convert(p)
        if not conv:
            return {"width": 0, "height": 0, "created": None}
        p = conv
    with Image.open(p) as img:
        w, h = img.size
        created, orient = None, 1
        try:
            ex = img.getexif()
            orient = int(ex.get(274) or 1)
            raw = ex.get_ifd(0x8769).get(36867) or ex.get_ifd(0x8769).get(36868) or ex.get(306)
            created = parse_iso(raw) if raw else None
        except Exception:
            pass
    if orient in (5, 6, 7, 8):
        w, h = h, w
    return {"width": w, "height": h, "created": created}


# ---------------------------------------------------------------- küçük resim / hash
def thumbnail(src, dst, kind, size=480, at=None, duration=0.0):
    dst = Path(dst)
    dst.parent.mkdir(parents=True, exist_ok=True)
    if kind == "foto":
        img = open_image(src)
        img.thumbnail((size, size))
        img.convert("RGB").save(dst, "JPEG", quality=85)
    else:
        t = at if at is not None else min(1.0, max(0.0, float(duration or 0) * 0.15))
        vf = f"scale='if(gt(iw,ih),{size},-2)':'if(gt(iw,ih),-2,{size})'"
        try:
            run_ffmpeg(["-ss", f"{t:.3f}", "-i", src, "-frames:v", "1", "-vf", vf, "-q:v", "4", dst])
        except MediaError:
            run_ffmpeg(["-i", src, "-frames:v", "1", "-vf", vf, "-q:v", "4", dst])
    return dst


def dhash(img):
    """9x8 gri farklarından 64 bit algısal hash (16 hex)."""
    from PIL import Image
    g = img.convert("L").resize((9, 8), Image.LANCZOS)
    px = list(g.getdata())
    bits = 0
    for y in range(8):
        for x in range(8):
            bits = (bits << 1) | (1 if px[y * 9 + x + 1] > px[y * 9 + x] else 0)
    return f"{bits:016x}"


def dhash_file(path):
    return dhash(open_image(path))


def hamming(a, b):
    if not a or not b:
        return 64
    return bin(int(a, 16) ^ int(b, 16)).count("1")


def quick_hash(path, size=None):
    """Hızlı içerik hash'i: boyut + ilk/son 64 KB (2 TB arşivde tam hash yerine)."""
    p = Path(path)
    size = size if size is not None else p.stat().st_size
    h = hashlib.sha1(str(size).encode())
    with open(p, "rb") as f:
        h.update(f.read(65536))
        if size > 131072:
            f.seek(-65536, 2)
            h.update(f.read(65536))
    return h.hexdigest()[:24]


def classify_aspect(w, h):
    """(aspect, orientation): ('9:16','dikey') gibi."""
    if not w or not h:
        return "bilinmiyor", "bilinmiyor"
    r = w / h
    orientation = "kare" if abs(r - 1) < 0.04 else ("dikey" if r < 1 else "yatay")
    cands = {"9:16": 9 / 16, "4:5": 4 / 5, "1:1": 1.0, "3:4": 3 / 4, "2:3": 2 / 3,
             "16:9": 16 / 9, "4:3": 4 / 3, "3:2": 3 / 2, "5:4": 5 / 4}
    best = min(cands, key=lambda k: abs(cands[k] - r))
    if abs(cands[best] - r) > 0.06:
        best = "diger"
    return best, orientation


def fmt_duration(sec):
    sec = int(round(sec or 0))
    return f"{sec // 60}:{sec % 60:02d}"
