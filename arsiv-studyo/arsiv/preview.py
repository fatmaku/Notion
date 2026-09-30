"""Tarayıcı dostu ön izlemeler: HEIC → JPEG, HEVC/MOV → H.264 MP4 (720p). Önbelleğe alınır, arka planda üretilir."""
import threading
from pathlib import Path

from . import config, db, ffilters, media, photos_mac

_jobs = {}  # item_id -> {"durum": "hazirlaniyor"|"hata", "hata": str}
_lock = threading.Lock()
DIRECT_IMG = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
DIRECT_VID_CODECS = {"h264"}


def cache_path(item):
    d = config.CACHE / "onizleme"
    d.mkdir(parents=True, exist_ok=True)
    return d / (item["uuid"].replace(":", "_") + (".mp4" if item["kind"] == "video" else ".jpg"))


def _make_photo(src, dst):
    img = media.open_image(src)
    img.thumbnail((1800, 1800))
    img.convert("RGB").save(dst, "JPEG", quality=86, optimize=True)


def _make_video(src, dst):
    info = media.probe(src)
    vf = "scale='min(1280,iw)':-2"
    if info.get("hdr") and media.has_filter("tonemap") and media.has_filter("zscale"):
        vf = ffilters.hdr_chain() + "," + vf
    args = ["-i", src, "-vf", vf, "-c:v", "libx264", "-preset", "veryfast", "-crf", "26", "-pix_fmt", "yuv420p",
            "-movflags", "+faststart", "-t", "240"]
    args += ["-c:a", "aac", "-b:a", "96k", "-ac", "2"] if info.get("has_audio") else ["-an"]
    tmp = dst.with_suffix(".part.mp4")
    media.run_ffmpeg([*args, tmp])
    tmp.replace(dst)


def status(con, item):
    """{'durum': 'hazir'|'hazirlaniyor'|'hata'|'yok', 'yol': ..., 'dogrudan': bool}"""
    iid = item["id"]
    dst = cache_path(item)
    if dst.exists():
        return {"durum": "hazir", "yol": str(dst), "dogrudan": False}
    src = item.get("path")
    if src and Path(src).exists():
        ext = Path(src).suffix.lower()
        if item["kind"] == "foto" and ext in DIRECT_IMG:
            return {"durum": "hazir", "yol": src, "dogrudan": True}
        if item["kind"] == "video" and ext in (".mp4", ".m4v", ".mov"):
            try:
                info = media.probe(src)
                if (info.get("codec") or "") in DIRECT_VID_CODECS and not info.get("hdr") and min(info["width"], info["height"]) <= 1440:
                    return {"durum": "hazir", "yol": src, "dogrudan": True}
            except media.MediaError:
                pass
    with _lock:
        j = _jobs.get(iid)
        if j:
            return dict(j, yol=None, dogrudan=False)
        _jobs[iid] = {"durum": "hazirlaniyor"}
    threading.Thread(target=_run, args=(item,), daemon=True).start()
    return {"durum": "hazirlaniyor", "yol": None, "dogrudan": False}


def _run(item):
    dst = cache_path(item)
    try:
        con = db.connect()
        src = photos_mac.ensure_local(con, item, progress=lambda *_: None)
        if item["kind"] == "foto":
            _make_photo(src, dst)
        else:
            _make_video(src, dst)
        with _lock:
            _jobs.pop(item["id"], None)
    except Exception as e:
        with _lock:
            _jobs[item["id"]] = {"durum": "hata", "hata": str(e)[:300]}
