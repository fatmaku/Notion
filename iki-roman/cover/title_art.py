#!/usr/bin/env python3
"""Goldene Titeltypografie als Raster (Cinzel), passend zur Referenzgrafik: Verlauf, Kante, Schlagschatten.
Wird von prep_art.py benutzt, um die neuen Titel (YOLCU / ŞAHİT bzw. Übersetzungen) in die Front-Panels zu setzen."""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(HERE, '..', 'fonts')
SS = 3   # Supersampling

def _font_for_cap(path, cap_px):
    """Schriftgröße so wählen, dass die Versalhöhe (H) = cap_px."""
    f = ImageFont.truetype(path, 100)
    bb = f.getbbox('H'); h100 = bb[3] - bb[1]
    return ImageFont.truetype(path, max(8, int(round(100 * cap_px / h100))))

def _text_mask(text, font, tracking):
    """Weiße Schrift auf Schwarz, Buchstaben einzeln gesetzt (Sperrung in em)."""
    asc, desc = font.getmetrics()
    size = font.size
    adv = [font.getlength(ch) for ch in text]
    track = tracking * size
    W = int(sum(adv) + track * (len(text) - 1) + size)
    H = int(asc + desc + size * 0.4)
    m = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(m)
    x = size * 0.5
    for ch, a in zip(text, adv):
        d.text((x, size * 0.2), ch, font=font, fill=255)
        x += a + track
    return m.crop(m.getbbox())

def gold_text(text, cap_px, max_w, weight=900, tracking=0.05,
              stops=((0.0, (252, 236, 176)), (0.30, (236, 196, 92)), (0.55, (210, 152, 44)), (0.78, (160, 104, 26)), (1.0, (110, 68, 14))),
              shadow=(0, 0.05, 0.06, 255), outline=(40, 24, 6, 235), glow=(0.12, 150)):
    """RGBA-Bild (Zielauflösung) mit goldener Schrift; Versalhöhe = cap_px, Breite ≤ max_w (sonst verkleinert). Liefert (Bild, Rand)."""
    path = os.path.join(FONTS, f'Cinzel-{weight}.ttf')
    font = _font_for_cap(path, cap_px * SS)
    mask = _text_mask(text, font, tracking)
    if mask.width > max_w * SS:
        font = _font_for_cap(path, cap_px * SS * (max_w * SS / mask.width))
        mask = _text_mask(text, font, tracking)
    w, h = mask.size
    pad = int(0.25 * h) + 12 * SS
    cw, ch = w + 2 * pad, h + 2 * pad
    M = Image.new('L', (cw, ch), 0); M.paste(mask, (pad, pad))

    # Verlauf über die Buchstabenhöhe
    bb = M.getbbox(); y0, y1 = bb[1], bb[3]
    col_rows = []
    for y in range(ch):
        t = min(1.0, max(0.0, (y - y0) / max(1, (y1 - y0))))
        col = stops[-1][1]
        for i in range(len(stops) - 1):
            (ta, ca), (tb, cb) = stops[i], stops[i + 1]
            if ta <= t <= tb:
                u = (t - ta) / (tb - ta); col = tuple(int(ca[k] + (cb[k] - ca[k]) * u) for k in range(3)); break
        col_rows.append(col)
    grad = Image.new('RGB', (1, ch)); grad.putdata(col_rows); grad = grad.resize((cw, ch))
    light = Image.new('L', (cw, 1)); light.putdata([int(255 * (1 - 0.18 * (abs(x / cw - 0.5) * 2) ** 2)) for x in range(cw)])
    light = light.resize((cw, ch))
    grad = ImageChops.multiply(grad, Image.merge('RGB', (light, light, light)))

    # Kanten: oben hell, unten dunkel
    k = max(1, int(1.6 * SS))
    up = ImageChops.subtract(M, ImageChops.offset(M, 0, k))
    dn = ImageChops.subtract(M, ImageChops.offset(M, 0, -k))
    face = Image.composite(Image.new('RGB', (cw, ch), (255, 250, 225)), grad, up.point(lambda v: int(v * 0.85)))
    face = Image.composite(Image.new('RGB', (cw, ch), (96, 58, 12)), face, dn.point(lambda v: int(v * 0.8)))

    # dünne dunkle Kontur + Fläche
    ring = ImageChops.subtract(M.filter(ImageFilter.MaxFilter(5)), M)
    layer = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
    layer.paste(Image.new('RGB', (cw, ch), outline[:3]), (0, 0), ring.point(lambda v: int(v * outline[3] / 255)))
    layer.paste(face, (0, 0), M)

    # Schlagschatten
    dx, dy, blur, alpha = shadow
    sh = M.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(blur * h))
    sh = ImageChops.offset(sh, int(dx * h), int(dy * h)).point(lambda v: int(v * alpha / 255))
    shadow_layer = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
    shadow_layer.paste(Image.new('RGB', (cw, ch), (12, 7, 3)), (0, 0), sh)
    # dunkler Halo rund um die Schrift (Lesbarkeit auf hellem Himmel, wie in der Referenz)
    gr, ga = glow
    halo = M.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.GaussianBlur(gr * h)).point(lambda v: int(min(255, v * 1.6) * ga / 255))
    halo_layer = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
    halo_layer.paste(Image.new('RGB', (cw, ch), (10, 8, 6)), (0, 0), halo)
    out = Image.alpha_composite(Image.alpha_composite(halo_layer, shadow_layer), layer).resize((cw // SS, ch // SS), Image.LANCZOS)
    return out, pad // SS

def place(art, text, cap_px, max_w, cy, cx=None, **kw):
    """Setzt text zentriert (cx; cy = Mitte der Versalhöhe) in das RGB-Bild art; liefert die Glyphenbox."""
    img, pad = gold_text(text, cap_px, max_w, **kw)
    cx = art.width / 2 if cx is None else cx
    gx0, gy0, gx1, gy1 = pad, pad, img.width - pad, img.height - pad
    x = int(round(cx - (gx0 + gx1) / 2)); y = int(round(cy - (gy0 + gy1) / 2))
    art.paste(img, (x, y), img)
    return (x + gx0, y + gy0, x + gx1, y + gy1)

if __name__ == '__main__':
    bg = Image.new('RGB', (1461, 520), (40, 60, 90))
    print(place(bg, 'YOLCU', 210, 1200, 200))
    print(place(bg, '1453 — UYANIŞIN BEDELİ', 48, 1100, 430, weight=700, tracking=0.08))
    bg.save('/tmp/claude-0/-home-user-Notion/6549e111-23e7-5e00-8587-d424b5294a16/scratchpad/title_test.png'); print('ok')
