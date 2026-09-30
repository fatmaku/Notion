#!/usr/bin/env python3
"""Bildaufbereitung für die Cover aus der hochskalierten Referenz (6144 × 2048 px = 4× 1536 × 512).

Erzeugt in assets/upscaled/:
  SA_front.png / BY_front.png            – Frontpanel inkl. Beschnitt (3,175 mm) an allen Kanten; Höhe = 216,35 mm
  SA_front_nogenre.png / BY_front_nogenre.png – dito, Genrezeile entfernt (für EN/DE-Varianten)
  SA_ebook_art.png / BY_ebook_art.png (+ _nogenre) – 1600 × 2560 px für das Kindle-Cover
  SA_back_bg.png / BY_back_bg.png        – Rückseiten-Hintergrund (prozedurale Wolken + Skyline aus der Referenz)
  SA_portrait.png / BY_portrait.png      – Portraits (RGBA) mit identischer weicher Vignette und Gradation
  SA_spine_bg.png / BY_spine_bg.png      – Rücken-Hintergrund (prozedural)

Die Titel-/Autoren-Typografie der Fronten bleibt bewusst aus der Referenz (vom Autor als perfekt bezeichnet);
nur die sprachabhängige Genrezeile wird in build_cover.py als Vektortext neu gesetzt.
Koordinaten beziehen sich auf das 4×-Bild. Die Faust-Naht (Berührungspunkt) liegt bei X_SEAM.
"""
import os, sys
import numpy as np
import cv2
from PIL import Image, ImageOps, ImageEnhance, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, '..', 'assets', 'upscaled')
SRC = os.path.join(ASSETS, 'referenz_x4_esrgan.png')
if not os.path.exists(SRC):
    SRC = os.path.join(ASSETS, 'referenz_x4_lanczos.png')
    print('WARNUNG: ESRGAN-Datei fehlt, nutze Lanczos-Version', file=sys.stderr)

BLEED_MM = 3.175
TRIM_W, TRIM_H = 148.0, 210.0
PX_PER_MM = 2048 / (TRIM_H + 2 * BLEED_MM)      # 9.465 px/mm  (≈ 240 dpi)
X_SEAM = 3048                                     # Berührungspunkt der Fäuste
FRONT_PX = int(round(TRIM_W * PX_PER_MM))         # 1401
BLEED_PX = int(round(BLEED_MM * PX_PER_MM))       # 30
PANEL_W = FRONT_PX + 2 * BLEED_PX                 # 1461  (148 mm + 2 × Beschnitt)
PANEL_H = 2048

# Genrezeilen (Panorama-Koordinaten), werden für EN/DE entfernt
GENRE_RECT = {'SA': (2240, 760, 2460, 840), 'BY': (3390, 795, 4350, 880)}


def inpaint_full(img, rects, radius=10):
    mask = np.zeros(img.shape[:2], np.uint8)
    for x0, y0, x1, y1 in rects:
        mask[y0:y1, x0:x1] = 255
    return cv2.inpaint(img, mask, radius, cv2.INPAINT_TELEA)


def fbm(h, w, octaves=6, seed=3, persistence=0.55):
    rng = np.random.default_rng(seed)
    out = np.zeros((h, w), np.float32)
    amp, total = 1.0, 0.0
    for k in range(octaves):
        sh, sw = max(2, h >> (octaves - k + 1)), max(2, w >> (octaves - k + 1))
        layer = rng.random((sh, sw)).astype(np.float32)
        layer = cv2.resize(layer, (w, h), interpolation=cv2.INTER_CUBIC)
        out += amp * layer
        total += amp
        amp *= persistence
    out /= total
    out = (out - out.min()) / (out.max() - out.min() + 1e-6)
    return out


def clouds_bg(w, h, base, cloud, seed, strength=0.85):
    n = fbm(h, w, seed=seed)
    n = np.clip((n - 0.35) / 0.65, 0, 1) ** 2.0 * strength
    yy, xx = np.mgrid[0:h, 0:w]
    # Wolken oben dichter, unten dunkler; leichte Vignette
    vert = np.clip(1.0 - yy / h * 0.9, 0.05, 1.0)
    vign = 1 - 0.55 * (((xx - w * 0.5) / (w * 0.72)) ** 2 + ((yy - h * 0.45) / (h * 0.75)) ** 2)
    f = (n * vert * np.clip(vign, 0, 1))[..., None]
    img = np.array(base, float)[None, None, :] * (1 - f) + np.array(cloud, float)[None, None, :] * f
    noise = np.random.default_rng(seed + 11).normal(0, 1.8, (h, w, 1))
    return np.clip(img + noise, 0, 255).astype(np.uint8)   # RGB


def feather_paste(dst, patch, x, y, fade_l=0, fade_r=0, fade_t=0, fade_b=0, alpha_max=1.0):
    """Setzt patch (RGB) in dst (RGB) an (x,y) mit weichen Kanten ein."""
    ph, pw = patch.shape[:2]
    yy, xx = np.mgrid[0:ph, 0:pw]
    a = np.ones((ph, pw), np.float32) * alpha_max
    if fade_l: a *= np.clip(xx / fade_l, 0, 1)
    if fade_r: a *= np.clip((pw - 1 - xx) / fade_r, 0, 1)
    if fade_t: a *= np.clip(yy / fade_t, 0, 1)
    if fade_b: a *= np.clip((ph - 1 - yy) / fade_b, 0, 1)
    a = a[..., None]
    reg = dst[y:y + ph, x:x + pw].astype(np.float32)
    dst[y:y + ph, x:x + pw] = (reg * (1 - a) + patch.astype(np.float32) * a).astype(np.uint8)
    return dst


def ebook_art(front_rgb):
    """1461 × 2048 → 1600 × 2560: Breite skalieren, Himmel oben und Wasser unten weich verlängern."""
    im = Image.fromarray(front_rgb)
    im = im.resize((1600, int(round(2048 * 1600 / 1461))), Image.LANCZOS)   # 1600 × 2243
    need = 2560 - im.height                                                  # 317
    top_h, bot_h = int(need * 0.55), need - int(need * 0.55)
    top = im.crop((0, 0, 1600, 60)).resize((1600, top_h), Image.LANCZOS).filter(ImageFilter.GaussianBlur(6))
    bot = im.crop((0, im.height - 60, 1600, im.height)).resize((1600, bot_h), Image.LANCZOS).filter(ImageFilter.GaussianBlur(6))
    out = Image.new('RGB', (1600, 2560))
    out.paste(top, (0, 0)); out.paste(im, (0, top_h)); out.paste(bot, (0, top_h + im.height))
    return out


def main():
    os.makedirs(ASSETS, exist_ok=True)
    src_bgr = cv2.imread(SRC, cv2.IMREAD_COLOR)
    H, W = src_bgr.shape[:2]
    assert (W, H) == (6144, 2048), (W, H)
    src = cv2.cvtColor(src_bgr, cv2.COLOR_BGR2RGB)

    # ------------------------------------------------------------------ Fronten
    nogenre = cv2.cvtColor(inpaint_full(src_bgr, list(GENRE_RECT.values()), 10), cv2.COLOR_BGR2RGB)
    fronts = {'SA': X_SEAM - FRONT_PX - BLEED_PX,   # Trim endet an der Naht, Beschnitt läuft nach rechts weiter
              'BY': X_SEAM - BLEED_PX}              # Trim beginnt an der Naht, Beschnitt läuft nach links
    for key, x0 in fronts.items():
        for suffix, img in (('', src), ('_nogenre', nogenre)):
            crop = img[:, x0:x0 + PANEL_W]
            Image.fromarray(crop).save(os.path.join(ASSETS, f'{key}_front{suffix}.png'))
            ebook_art(crop).save(os.path.join(ASSETS, f'{key}_ebook_art{suffix}.png'), quality=95)
        print(key, 'front + ebook art ok; Naht bei Panel-x =', X_SEAM - x0, 'px (', round((X_SEAM - x0) / PX_PER_MM, 2), 'mm )')

    # ------------------------------------------------------------------ Rückseiten
    # Rückseite = 148 mm + Beschnitt beidseitig (1461 px); im Wrap liegt die rechte Beschnittzone unter dem Rücken.
    sa_bg = clouds_bg(PANEL_W, PANEL_H, base=(7, 10, 20), cloud=(58, 70, 96), seed=3, strength=0.75)
    by_bg = clouds_bg(PANEL_W, PANEL_H, base=(12, 9, 9), cloud=(104, 66, 40), seed=9, strength=0.80)
    # Skyline-Streifen aus der Referenz, unten links (Außenseite), weich eingeblendet
    sa_strip = src[1440:1780, 900:1400]                       # 500 × 340 (warme Skyline, SA-Rückseite)
    sa_strip = cv2.resize(sa_strip, (720, 490), interpolation=cv2.INTER_CUBIC)
    sa_bg = feather_paste(sa_bg, sa_strip, 0, PANEL_H - 490, fade_r=260, fade_t=200, alpha_max=0.95)
    by_strip = src[1450:2048, 4775:5120]                      # 345 × 598 (Moscheen/Bäume, BY-Rückseite; ohne Rückenband)
    by_strip = cv2.resize(by_strip, (560, 970), interpolation=cv2.INTER_CUBIC)
    by_bg = feather_paste(by_bg, by_strip, 0, PANEL_H - 970, fade_r=220, fade_t=300, alpha_max=0.95)
    # Beschnitt-/Randzonen leicht abdunkeln (nichts Helles am Schnitt)
    for bg in (sa_bg, by_bg):
        yy, xx = np.mgrid[0:PANEL_H, 0:PANEL_W]
        edge = np.clip(np.minimum(xx, PANEL_W - xx) / 90.0, 0, 1) * np.clip(np.minimum(yy, PANEL_H - yy) / 90.0, 0, 1)
        bg[:] = (bg.astype(np.float32) * (0.75 + 0.25 * edge)[..., None]).astype(np.uint8)
    Image.fromarray(sa_bg).save(os.path.join(ASSETS, 'SA_back_bg.png'))
    Image.fromarray(by_bg).save(os.path.join(ASSETS, 'BY_back_bg.png'))
    print('backs ok')

    # ------------------------------------------------------------------ Portraits (identische Behandlung)
    def portrait(rect, name, warm=0.0, gamma=1.0, contrast=1.0, sat=1.0, centering=(0.5, 0.35)):
        x0, y0, x1, y1 = rect
        im = Image.fromarray(src[y0:y1, x0:x1])
        im = ImageOps.fit(im, (900, 1100), Image.LANCZOS, centering=centering)
        im = ImageEnhance.Contrast(im).enhance(contrast)
        im = ImageEnhance.Color(im).enhance(sat)
        arr = (np.asarray(im).astype(np.float32) / 255) ** gamma
        if warm:
            arr[..., 0] = np.clip(arr[..., 0] * (1 + warm), 0, 1)
            arr[..., 2] = np.clip(arr[..., 2] * (1 - warm), 0, 1)
        rgb = (np.clip(arr, 0, 1) * 255).astype(np.uint8)
        h, w = rgb.shape[:2]
        yy, xx = np.mgrid[0:h, 0:w]
        cx, cy, rx, ry = w * 0.5, h * 0.40, w * 0.60, h * 0.60
        d = np.sqrt(((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2)
        alpha = np.clip((1.12 - d) / 0.42, 0, 1).astype(np.float32)
        alpha = cv2.GaussianBlur(alpha, (0, 0), 20)
        rgba = np.dstack([rgb, (alpha * 255).astype(np.uint8)])
        Image.fromarray(rgba, 'RGBA').save(os.path.join(ASSETS, name))

    # Textreste der Referenz neben dem SA-Portrait (weiße Schrift auf dunklem Grund, x 500..720) entfernen
    def white_text(reg):
        r, g, b = reg[..., 0].astype(int), reg[..., 1].astype(int), reg[..., 2].astype(int)
        return ((r + g + b) / 3 > 110) & (np.abs(r - b) < 45)
    sa_bgr = cv2.cvtColor(src, cv2.COLOR_RGB2BGR)
    mask = np.zeros(src.shape[:2], np.uint8)
    reg = src[80:1350, 480:815]
    mask[80:1350, 480:815] = np.where(white_text(reg), 255, 0).astype(np.uint8)
    mask = cv2.dilate(mask, np.ones((9, 9), np.uint8))
    src_clean = cv2.cvtColor(cv2.inpaint(sa_bgr, mask, 9, cv2.INPAINT_TELEA), cv2.COLOR_BGR2RGB)
    src_backup = src.copy(); src[:] = src_clean
    portrait((620, 0, 1380, 1060), 'SA_portrait.png', warm=0.03, gamma=1.02, contrast=1.06, sat=1.0, centering=(0.6, 0.30))
    src[:] = src_backup
    portrait((4775, 10, 5470, 1070), 'BY_portrait.png', warm=0.02, gamma=1.12, contrast=1.04, sat=0.92, centering=(0.42, 0.30))
    print('portraits ok')

    # ------------------------------------------------------------------ Rücken-Hintergründe (prozedural)
    def spine_bg(name, top, bottom, seed):
        h, w = 2048, 160
        t = np.linspace(0, 1, h)[:, None, None]
        col = (1 - t) * np.array(top, float)[None, None, :] + t * np.array(bottom, float)[None, None, :]
        col = np.repeat(col, w, axis=1)
        xx = np.linspace(-1, 1, w)[None, :, None]
        col = col * (1 + 0.12 * np.exp(-(xx / 0.55) ** 2))
        n = fbm(h, w, octaves=5, seed=seed)[..., None] * 14
        img = np.clip(col + n - 7, 0, 255).astype(np.uint8)
        Image.fromarray(img, 'RGB').save(os.path.join(ASSETS, name))

    spine_bg('SA_spine_bg.png', (16, 24, 44), (5, 7, 13), 21)
    spine_bg('BY_spine_bg.png', (52, 34, 22), (8, 6, 9), 22)
    print('spines ok — fertig')


if __name__ == '__main__':
    main()
