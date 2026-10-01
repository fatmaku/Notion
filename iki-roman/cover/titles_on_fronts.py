#!/usr/bin/env python3
"""Neue Titel auf die Front-Panels setzen (je Sprache): alte Rastertitel der Referenz werden ausgemalt (Inpainting),
die neuen Titel (texts.json: title_lines_i18n, subtitle_i18n) in goldener Cinzel-Typografie gesetzt.
Ausgabe: assets/upscaled/{BY,SA}_front_{tr,en,de}.png und {BY,SA}_ebook_art_{lang}.png
Läuft nach prep_art.py (braucht referenz_x4_esrgan.png) und vor build_cover.py."""
import os, json, sys
import cv2, numpy as np
from PIL import Image, ImageFilter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from prep_art import SRC, ASSETS, X_SEAM, FRONT_PX, BLEED_PX, PANEL_W, GENRE_RECT, ebook_art
from title_art import place

HERE = os.path.dirname(os.path.abspath(__file__))
TEXTS = json.load(open(os.path.join(HERE, 'texts.json'), encoding='utf-8'))
LANGS = ['tr', 'en', 'de']
X0 = {'SA': X_SEAM - FRONT_PX - BLEED_PX, 'BY': X_SEAM - BLEED_PX}
# Alte Titelblöcke (Panel-Koordinaten des 4×-Bildes): BY "BEN / YOKSAM" + Untertitel, SA "ŞAHİDİ / ARARKEN"
TITLE_RECT = {'BY': (230, 198, 1440, 796), 'SA': (150, 172, 1350, 674)}   # großzügig, bis knapp an Autorenzeile/Genrezeile/Ornament
# Layout der neuen Titel (Panel-Koordinaten): Block, Versalhöhen, Untertitel-Mitte
LAYOUT = {'BY': dict(block=(250, 600), cap1=215, caps2=(120, 185), max_w=1180, sub_cy=735, sub_cap=50),
          'SA': dict(block=(200, 640), cap1=230, caps2=(125, 190), max_w=1180, sub_cy=None, sub_cap=0)}

def inpaint_soft(bgr, rect, down=4, radius=12, feather=10):
    """Großflächiges Inpainting in reduzierter Auflösung (weicher, wolkenartig) mit weichem Maskenrand."""
    x0, y0, x1, y1 = rect
    H, W = bgr.shape[:2]
    small = cv2.resize(bgr, (W // down, H // down), interpolation=cv2.INTER_AREA)
    mask = np.zeros(small.shape[:2], np.uint8)
    mask[y0 // down:y1 // down, x0 // down:x1 // down] = 255
    filled = cv2.inpaint(small, mask, radius, cv2.INPAINT_TELEA)
    filled = cv2.resize(filled, (W, H), interpolation=cv2.INTER_CUBIC)
    m = np.zeros((H, W), np.float32); m[y0:y1, x0:x1] = 1.0
    # innen voll, nur nach außen weich auslaufend (sonst bleiben Reste der alten Schrift am Rand sichtbar)
    m = np.maximum(m, cv2.GaussianBlur(cv2.dilate(m, np.ones((feather, feather), np.uint8)), (0, 0), feather / 2))[..., None]
    out = bgr.astype(np.float32) * (1 - m) + filled.astype(np.float32) * m
    # feines Korn zurückgeben, damit die Fläche nicht "plastisch" wirkt
    rng = np.random.default_rng(7)
    noise = rng.normal(0, 2.2, (H, W, 1)).astype(np.float32) * m
    return np.clip(out + noise, 0, 255).astype(np.uint8)

def main():
    src_bgr = cv2.imread(SRC, cv2.IMREAD_COLOR)
    nogenre_bgr = None
    for key in ('BY', 'SA'):
        x0 = X0[key]
        panel = src_bgr[:, x0:x0 + PANEL_W].copy()
        gx0, gy0, gx1, gy1 = GENRE_RECT[key]
        genre_rect_panel = (gx0 - x0, gy0, gx1 - x0, gy1)
        base_tr = inpaint_soft(panel, TITLE_RECT[key])
        base_x = inpaint_soft(base_tr, genre_rect_panel, down=2, radius=8, feather=6)   # EN/DE: Genrezeile wird vektoriell gesetzt
        t = TEXTS[key]; L = LAYOUT[key]
        for lang in LANGS:
            art = Image.fromarray(cv2.cvtColor(base_tr if lang == 'tr' else base_x, cv2.COLOR_BGR2RGB))
            lines = t['title_lines_i18n'][lang]
            b0, b1 = L['block']; bh = b1 - b0
            if len(lines) == 1:
                place(art, lines[0], L['cap1'], L['max_w'], (b0 + b1) / 2)
            else:
                c1, c2 = L['caps2']
                place(art, lines[0], c1, L['max_w'], b0 + 0.24 * bh, tracking=0.10)
                place(art, lines[1], c2, L['max_w'], b0 + 0.72 * bh)
            sub = t.get('subtitle_i18n', {}).get(lang, '')
            if sub and L['sub_cy']:
                place(art, sub, L['sub_cap'], 1120, L['sub_cy'], weight=700, tracking=0.08)
            art.save(os.path.join(ASSETS, f'{key}_front_{lang}.png'))
            ebook_art(np.array(art)).save(os.path.join(ASSETS, f'{key}_ebook_art_{lang}.png'), quality=95)
            print(key, lang, lines, '|', sub)

if __name__ == '__main__':
    main()
