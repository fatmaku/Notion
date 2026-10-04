"""Görsel kalite ölçümleri (küçük resimden, saniyeler içinde) ve videonun 'kanca' gücü (ilk saniyeler).
Hepsi 0..1 aralığında; ağır ML modeli gerekmez."""
import subprocess
from pathlib import Path

import numpy as np

from . import media

W, H, FPS = 96, 54, 2.0


def _clip01(x):
    return float(max(0.0, min(1.0, x)))


def image_metrics(path):
    """Küçük resim/görselden: keskinlik, pozlama, kontrast, renk canlılığı, odak, genel kalite."""
    from PIL import Image
    with Image.open(path) as im:
        im = im.convert("RGB")
        im.thumbnail((256, 256))
        a = np.asarray(im, dtype=np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    gray = 0.299 * r + 0.587 * g + 0.114 * b
    lap = np.abs(gray[1:-1, 2:] + gray[1:-1, :-2] + gray[2:, 1:-1] + gray[:-2, 1:-1] - 4 * gray[1:-1, 1:-1])
    sharp_raw = float(lap.var())
    sharp = _clip01((np.log1p(sharp_raw) - 2.5) / 4.5)
    hh, ww = lap.shape
    center = lap[hh // 4: 3 * hh // 4, ww // 4: 3 * ww // 4]
    focus = _clip01((center.mean() + 1) / (lap.mean() + 1) / 1.6)  # özne ortada net mi
    mean = float(gray.mean())
    clipped = float(((gray < 8) | (gray > 247)).mean())
    exposure = _clip01(1 - abs(mean - 125) / 125 - clipped * 1.5)
    contrast = _clip01(float(gray.std()) / 64)
    rg, yb = r - g, 0.5 * (r + g) - b
    colorful = float(np.sqrt(rg.std() ** 2 + yb.std() ** 2) + 0.3 * np.sqrt(rg.mean() ** 2 + yb.mean() ** 2))
    color = _clip01(colorful / 90)
    quality = 0.38 * sharp + 0.24 * exposure + 0.14 * contrast + 0.14 * color + 0.10 * focus
    return {"sharp": round(sharp, 3), "exposure": round(exposure, 3), "contrast": round(contrast, 3), "color": round(color, 3),
            "focus": round(focus, 3), "brightness": round(mean, 1), "quality": round(quality, 3)}


def decode_frames(path, span, start=0.0):
    """Saniyede 2 küçük gri kare: (n, H, W) float32 dizi ya da None."""
    cmd = [media.ffmpeg_path(), "-hide_banner", "-loglevel", "error", "-nostdin", "-ss", f"{start:.2f}", "-t", f"{span:.2f}",
           "-i", str(path), "-vf", f"fps={FPS},scale={W}:{H}", "-f", "rawvideo", "-pix_fmt", "gray", "-an", "-"]
    try:
        raw = subprocess.run(cmd, capture_output=True, timeout=120).stdout
    except (subprocess.TimeoutExpired, OSError):
        return None
    n = len(raw) // (W * H)
    if n < 2:
        return None
    return np.frombuffer(raw[: n * W * H], dtype=np.uint8).reshape(n, H, W).astype(np.float32)


def video_metrics(path, duration):
    """İlk 20 sn: kanca (ilk 3 sn hareket+netlik), tempo (kesme sıklığı), hareket, karanlık oranı."""
    span = min(float(duration or 0), 20.0)
    if span < 1.5:
        return {}
    f = decode_frames(path, span)
    if f is None:
        return {}
    n = len(f)
    motion = np.concatenate([[0.0], np.abs(np.diff(f, axis=0)).reshape(n - 1, -1).mean(axis=1)])
    lap = np.abs(f[:, 1:-1, 2:] + f[:, 1:-1, :-2] + f[:, 2:, 1:-1] + f[:, :-2, 1:-1] - 4 * f[:, 1:-1, 1:-1])
    sharp = lap.reshape(n, -1).var(axis=1)
    bright = f.reshape(n, -1).mean(axis=1)
    first = slice(0, max(2, int(3 * FPS)))
    m_all = float(motion[1:].mean() + 1e-6)
    hook_motion = _clip01(float(motion[first][1:].mean()) / 18)          # mutlak hareket
    hook_rel = _clip01(float(motion[first][1:].mean()) / m_all / 1.5)     # videonun geri kalanına göre
    hook_sharp = _clip01((np.log1p(float(sharp[first].mean())) - 2.5) / 4.5)
    hook_bright = _clip01(1 - abs(float(bright[first].mean()) - 125) / 125)
    cuts = int((motion > motion.mean() + 3 * motion.std() + 2).sum())
    pace = _clip01(cuts / max(1.0, span / 4))                              # ~4 sn'de bir kesme = hızlı
    hook = 0.4 * hook_motion + 0.2 * hook_rel + 0.25 * hook_sharp + 0.15 * hook_bright
    return {"hook": round(hook, 3), "motion": round(_clip01(m_all / 15), 3), "pace": round(pace, 3),
            "dark": round(float((bright < 30).mean()), 3), "vsharp": round(_clip01((np.log1p(float(sharp.mean())) - 2.5) / 4.5), 3)}


def eq_for(q):
    """Kalite ölçümüne göre otomatik renk/pozlama düzeltmesi (ffmpeg eq + unsharp)."""
    if not q:
        return "eq=contrast=1.04:saturation=1.08"
    bright = q.get("brightness", 125)
    adj = max(-0.08, min(0.12, (118 - bright) / 255 * 0.7))
    sat = 1.15 if q.get("color", 0.5) < 0.35 else 1.07
    con = 1.08 if q.get("contrast", 0.5) < 0.35 else 1.03
    chain = f"eq=brightness={adj:.3f}:contrast={con:.2f}:saturation={sat:.2f}"
    if q.get("sharp", 0.5) < 0.45:
        chain += ",unsharp=5:5:0.7:3:3:0.0"
    return chain
