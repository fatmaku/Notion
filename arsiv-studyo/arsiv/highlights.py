"""Uzun videolarda en iyi anı otomatik bulur: keskinlik + hareket + parlaklık puanıyla en iyi zaman penceresi."""
import subprocess

import numpy as np

from . import media

W, H, FPS = 96, 54, 2.0
MAX_ANALYZE = 300.0  # sn: çok uzun videolarda ilk 5 dakikaya bakılır


def frame_scores(path, duration):
    """Saniyede 2 küçük gri kare çözer; her kare için puan döndürür (np.array) ya da None."""
    span = min(float(duration or 0), MAX_ANALYZE)
    if span < 3:
        return None
    cmd = [media.ffmpeg_path(), "-hide_banner", "-loglevel", "error", "-nostdin", "-t", f"{span:.2f}", "-i", str(path),
           "-vf", f"fps={FPS},scale={W}:{H}", "-f", "rawvideo", "-pix_fmt", "gray", "-an", "-"]
    try:
        raw = subprocess.run(cmd, capture_output=True, timeout=180).stdout
    except (subprocess.TimeoutExpired, OSError):
        return None
    n = len(raw) // (W * H)
    if n < 4:
        return None
    f = np.frombuffer(raw[: n * W * H], dtype=np.uint8).reshape(n, H, W).astype(np.float32)
    # keskinlik: Laplace benzeri ikinci türevlerin varyansı
    lap = np.abs(f[:, 1:-1, 2:] + f[:, 1:-1, :-2] + f[:, 2:, 1:-1] + f[:, :-2, 1:-1] - 4 * f[:, 1:-1, 1:-1])
    sharp = lap.reshape(n, -1).var(axis=1)
    motion = np.concatenate([[0.0], np.abs(np.diff(f, axis=0)).reshape(n - 1, -1).mean(axis=1)])
    bright = f.reshape(n, -1).mean(axis=1)

    def z(x):
        sd = x.std()
        return (x - x.mean()) / sd if sd > 1e-6 else np.zeros_like(x)

    score = z(np.log1p(sharp)) + 0.7 * z(np.minimum(motion, np.percentile(motion, 95)))
    score -= 2.0 * (bright < 25)  # karanlık kareler
    score -= 1.0 * (bright > 235)  # patlamış kareler
    # sahne kesmeleri: çok büyük sıçrama pencere içinde istenmez
    cut = motion > (motion.mean() + 4 * motion.std() + 1)
    score -= 1.5 * cut
    return score


def best_start(path, duration, length):
    """`length` saniyelik en iyi pencerenin başlangıcı (sn). Analiz olmazsa ilk saniyeler atlanır."""
    duration = float(duration or 0)
    if duration <= length + 0.5:
        return 0.0
    sc = frame_scores(path, duration)
    if sc is None:
        return min(1.0, max(0.0, duration - length))
    win = max(1, int(round(length * FPS)))
    if len(sc) <= win:
        return 0.0
    csum = np.concatenate([[0.0], np.cumsum(sc)])
    means = (csum[win:] - csum[:-win]) / win
    # videonun en başı/sonu genelde hazırlık: hafif ceza
    pos = np.arange(len(means)) / FPS
    means -= 0.15 * (pos < 0.8)
    k = int(np.argmax(means))
    return round(min(k / FPS, max(0.0, duration - length - 0.1)), 2)
