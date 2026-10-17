#!/usr/bin/env python3
"""Cover-Satz für DECCAL = YAPAY ZEKÂ?! (Arbeitstitel BEN YOKSAM; Schlüssel BYK in texts.json) – eigenständiges
Buch mit eigenem Frontmotiv, in drei Sprachen (tr/en/de; Titel/Untertitel/Rückseite je Sprache aus texts.json).

Amazon KDP, Taschenbuch A5 (148 × 210 mm, Beschnitt 3,175 mm, Rücken = Seiten × 0,0635 mm) und eBook-Cover.
Geometrie, CSS-Bausteine und Prüfroutinen kommen aus build_cover.py (dort ändert sich nichts).

Ausgabe in cover/out/BYK/<TR|EN|DE>/:
  Fullcover.pdf, Frontcover.pdf, Backcover.pdf, eBook-Cover.jpg (1600 × 2560), Vorschau.png, Fullcover_Guides.png
cover/out/cover_report.json wird unter dem Schlüssel "BYK" fortgeschrieben (BY/SA bleiben erhalten).

Frontmotiv: assets/benyoksam/front_art_x4plus.png (4096 × 6144), sonst front_art_2048x3072.png.
Das Motiv (2:3) wird auf das Frontpanel inkl. Beschnitt (154,35 × 216,35 mm) „cover“-skaliert; der Überhang
wird unten (Boden) beschnitten, damit oben der Himmel für den Titel frei bleibt. Titel, Untertitel und
Autorname werden als goldene Cinzel-Rastertypografie (title_art.py) ins Motiv gesetzt, die Genrezeile als
Vektortext. Alle Positionen sind relativ zum Quellbild definiert (u = x/Breite, v = y/Höhe), damit Druck-
front und eBook-Cover (anderer Zuschnitt) dieselbe Komposition zeigen.

Abgeleitete Bilder (werden bei jedem Lauf neu erzeugt): assets/benyoksam/derived/
  BYK_front.png (1823 × 2555 px = 300 dpi inkl. Beschnitt), BYK_ebook_art.png (1600 × 2560),
  BYK_back_bg.png (unscharfer, abgedunkelter Motivausschnitt), BYK_spine_bg.png

Aufruf: python3 build_cover_byk.py [--lang tr|en|de] [--pages N]
Seitenzahl: --pages > interior/out/report.json ["BYK" | "BYK_EN" | "BYK_DE"]["pdf_pages"] > Schätzung mit Warnung.

Sicherheitsprüfung (KDP): jede Textzeile im fertigen PDF (Vektortext) und jede Rastertypografie der Front muss
≥ 6,35 mm von allen Trimkanten und Rückenfalzen entfernt sein, Rückentext ≥ 1,6 mm von den Falzen; Verstöße
sind Fehler (Exit 1).
"""
import argparse, json, os, sys, math
import numpy as np
from weasyprint import HTML
import pymupdf
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from build_cover import (BLEED, TRIM_W, TRIM_H, SAFE, BARCODE_W, BARCODE_H, FONT_CSS, GOLD, CREAM, ROOT, OUT,
                         spine_width, css_base, back_css, spine_css, front_css, check_pdf, render_png, guides_png)
from title_art import place, gold_text
from PIL import ImageFont

BOOK = 'BYK'
LANG = 'tr'                                         # main() setzt --lang
TEXTS = json.load(open(os.path.join(HERE, 'texts.json'), encoding='utf-8'))
LANGS = ('tr', 'en', 'de')


def resolve(v, lang):
    """Sprachabhängige Felder ({"tr": …, "en": …, "de": …}) auflösen; alles andere unverändert."""
    if isinstance(v, dict) and v and set(v) <= set(LANGS) | {'_note'}:
        return v.get(lang)
    return v


def texts_for(lang):
    return {k: resolve(v, lang) for k, v in TEXTS[BOOK].items() if not k.startswith('_')}


T = texts_for(LANG)
ART_DIR = os.path.join(ROOT, 'assets', 'benyoksam')
DERIVED = os.path.join(ART_DIR, 'derived')
PORTRAIT = os.path.join(ROOT, 'assets', 'upscaled', 'BY_portrait.png')     # Portrait Tuncay Sancak (wie YOLCU-Rückseite)
SRC_CANDIDATES = ['front_art_x4plus.png', 'front_art_2048x3072.png']
ESTIMATE = 260
ESTIMATE_WARNING = 'SCHÄTZUNG – vor dem Upload mit der echten Seitenzahl neu bauen!'

DPI = 300
PX_PER_MM = DPI / 25.4
PANEL_W_MM, PANEL_H_MM = TRIM_W + 2 * BLEED, TRIM_H + 2 * BLEED          # 154,35 × 216,35 mm
PANEL_W_PX, PANEL_H_PX = int(round(PANEL_W_MM * PX_PER_MM)), int(round(PANEL_H_MM * PX_PER_MM))   # 1823 × 2555
EBOOK_W, EBOOK_H = 1600, 2560

# Komposition relativ zum Quellbild (2:3). Das Motiv wird in Zielbreite eingepasst; sichtbar bleibt im Druck
# v ∈ [0, 0.934] (Trim-Unterkante bei v ≈ 0.921, Sicherheitszone bis v ≈ 0.893). Kopf des Mannes ab v ≈ 0.22,
# Buch v 0.56–0.69, Katze v 0.55–0.68, Feder v 0.87–0.905 (u 0.60–0.76), roter Faden mittig unten.
LAYOUT = dict(
    # Titelzeilen werden von oben gestapelt (title_top = Oberkante der ersten Versalzeile); Größen in Anteilen der
    # Quellbildbreite. title_lines in texts.json: [[Text, "big"|"mid"|"small"], …]; der Stapel samt Untertitel muss
    # über dem Kopf der Figur (v 0.215) enden – sonst werden alle Größen gemeinsam verkleinert.
    title_top=0.046, title_bottom_max=0.212, line_gap=0.010, sub_gap=0.014,
    sizes=dict(big=dict(cap=0.1070, tracking=0.05, weight=900),
               mid=dict(cap=0.0520, tracking=0.06, weight=900),
               small=dict(cap=0.0518, tracking=0.12, weight=900)),
    subtitle=dict(cap=0.0240, tracking=0.08, weight=700),
    author=dict(v=0.8500, cap=0.0255, tracking=0.22),     # über der Feder, innerhalb der Sicherheitszone
    genre_v=0.8130,                                       # Genrezeile (Vektortext), Zeilenmitte
    max_w=0.80,                                           # max. Titelbreite in Anteilen der Panelbreite
)
PALE_GOLD = ((0.0, (255, 246, 214)), (0.35, (244, 222, 150)), (0.65, (222, 184, 96)), (1.0, (170, 124, 48)))
BACK_CROP = (0.0, 0.05, 0.56, 0.62)                       # Quellbild-Ausschnitt (u0, v0, u1, v1) für die Rückseite


# ----------------------------------------------------------------------------- Quellbild & Zuschnitt
def load_source():
    """Bestes vorhandenes Frontmotiv; eine gerade entstehende (unvollständige) Datei wird übersprungen."""
    for name in SRC_CANDIDATES:
        p = os.path.join(ART_DIR, name)
        if not os.path.exists(p):
            continue
        try:
            im = Image.open(p); im.load()
            return im.convert('RGB'), p
        except Exception as e:                      # z. B. truncated PNG während des Schreibens
            print(f'WARNUNG: {name} nicht lesbar ({e}), nächste Quelle', file=sys.stderr)
    sys.exit(f'Kein Frontmotiv in {ART_DIR} ({", ".join(SRC_CANDIDATES)})')


def fit_cover(src, W, H, ax=0.5, ay=0.0):
    """object-fit: cover – Quelle auf (W, H) skalieren und beschneiden; ax/ay = Anteil des Überhangs, der
    links/oben wegfällt. Liefert (Bild, Abbildung (u, v) → (x, y) in Zielpixeln, Skalierung)."""
    s = max(W / src.width, H / src.height)
    sw, sh = int(math.ceil(src.width * s)), int(math.ceil(src.height * s))
    im = src.resize((sw, sh), Image.LANCZOS)
    ox, oy = int(round((sw - W) * ax)), int(round((sh - H) * ay))
    im = im.crop((ox, oy, ox + W, oy + H))
    def to_px(u, v):
        return (u * src.width * s - ox, v * src.height * s - oy)
    return im, to_px, s


def vertical_shade(im, top=(0.0, 0.30, 0.32), bottom=(0.74, 1.0, 0.22)):
    """Dezenter dunkler Verlauf oben (hinter dem Titel) und unten (hinter dem Autornamen): (v0, v1, max. Alpha)."""
    a = np.asarray(im).astype(np.float32)
    H = a.shape[0]
    v = np.linspace(0, 1, H, dtype=np.float32)
    def ramp(v0, v1, amax, rising):
        t = np.clip((v - v0) / (v1 - v0), 0, 1)
        t = t * t * (3 - 2 * t)
        return amax * (t if rising else (1 - t))
    alpha = ramp(top[0], top[1], top[2], False) + ramp(bottom[0], bottom[1], bottom[2], True)
    a *= (1 - alpha)[:, None, None]
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def title_lines():
    raw = T.get('title_lines') or [T['title']]
    return [(l, 'big') if isinstance(l, str) else (l[0], l[1]) for l in raw if (l if isinstance(l, str) else l[0]).strip()]


def set_typography(art, to_px, scale_w):
    """Titelzeilen (gestapelt), Untertitel und Autorname als goldene Cinzel-Raster ins Motiv setzen.
    scale_w = Quellbildbreite in Zielpixeln (Bezug für Versalhöhen); liefert Glyphenboxen für die Prüfung."""
    max_w = LAYOUT['max_w'] * art.width
    cx = art.width / 2
    y_top = to_px(0.5, LAYOUT['title_top'])[1]
    y_max = to_px(0.5, LAYOUT['title_bottom_max'])[1]
    v_px = to_px(0.5, 1.0)[1] - to_px(0.5, 0.0)[1]           # Quellbildhöhe in Zielpixeln
    sub = (T.get('subtitle') or '').strip()
    items = [(text, LAYOUT['sizes'][size]) for text, size in title_lines()]
    if sub:
        items.append((sub, LAYOUT['subtitle']))
    for f in (1.0, 0.95, 0.90, 0.85, 0.80, 0.75, 0.70):      # gemeinsam verkleinern, bis der Stapel passt
        rendered = []
        for text, L in items:
            kw = dict(weight=L['weight'], tracking=L['tracking'])
            img, pad = gold_text(text, L['cap'] * scale_w * f, max_w, **kw)
            rendered.append((img, pad))
        gaps = [LAYOUT['line_gap'] * v_px * f] * (len(items) - 1)
        if sub and gaps:
            gaps[-1] = LAYOUT['sub_gap'] * v_px * f
        total = sum(img.height - 2 * pad for img, pad in rendered) + sum(gaps)
        if y_top + total <= y_max:
            break
    else:
        print(f'  WARNUNG: Titelstapel ({total:.0f} px) reicht bis in die Figur', file=sys.stderr)
    boxes, y = {}, y_top
    names = [f'title{k + 1}' for k in range(len(items) - (1 if sub else 0))] + (['subtitle'] if sub else [])
    for k, ((img, pad), name) in enumerate(zip(rendered, names)):
        gx0, gy0, gx1, gy1 = pad, pad, img.width - pad, img.height - pad
        x = int(round(cx - (gx0 + gx1) / 2)); yy = int(round(y - gy0))
        art.paste(img, (x, yy), img)
        boxes[name] = (x + gx0, yy + gy0, x + gx1, yy + gy1)
        y += (gy1 - gy0) + (gaps[k] if k < len(gaps) else 0)
    L = LAYOUT['author']
    boxes['author'] = place(art, T['author_caps'], L['cap'] * scale_w, max_w, to_px(0.5, L['v'])[1], cx,
                            weight=700, tracking=L['tracking'], stops=PALE_GOLD, glow=(0.10, 120), shadow=(0, 0.05, 0.06, 220))
    return boxes


def build_art(src):
    """Erzeugt die abgeleiteten Rasterbilder; liefert Glyphenboxen (Druckfront, px) und Genre-Positionen."""
    os.makedirs(DERIVED, exist_ok=True)
    # Druckfront inkl. Beschnitt (300 dpi)
    front, to_px, s = fit_cover(src, PANEL_W_PX, PANEL_H_PX, ax=0.5, ay=0.0)
    front = vertical_shade(front)
    boxes = set_typography(front, to_px, src.width * s)
    front.save(os.path.join(DERIVED, f'BYK_front_{LANG}.png'))
    genre_y_mm = to_px(0.5, LAYOUT['genre_v'])[1] / PX_PER_MM          # ab Panel-Oberkante (= Beschnittkante)
    # eBook-Art 1600 × 2560 (schmaler: seitlich leicht beschnitten, oben/unten nichts)
    eb, to_px_e, s_e = fit_cover(src, EBOOK_W, EBOOK_H, ax=0.5, ay=0.5)
    eb = vertical_shade(eb)
    set_typography(eb, to_px_e, src.width * s_e)
    eb.save(os.path.join(DERIVED, f'BYK_ebook_art_{LANG}.png'))
    genre_y_px = to_px_e(0.5, LAYOUT['genre_v'])[1]
    # Rückseiten-Hintergrund: unscharfer, abgedunkelter Motivausschnitt im Blau-Nacht-Klima – linker Bildteil
    # (Wolken, Skyline mit Moschee, Wasser) ohne die Figur, damit keine Silhouette als Fleck durchscheint.
    small = src.resize((src.width // 2, src.height // 2), Image.LANCZOS) if src.width > 2100 else src
    u0, v0, u1, v1 = BACK_CROP
    region = small.crop((int(u0 * small.width), int(v0 * small.height), int(u1 * small.width), int(v1 * small.height)))
    bg, _, _ = fit_cover(region, PANEL_W_PX, PANEL_H_PX, ax=0.5, ay=0.5)
    bg = bg.filter(ImageFilter.GaussianBlur(48))
    a = np.asarray(bg).astype(np.float32)
    H, W = a.shape[:2]
    yy, xx = np.mgrid[0:H, 0:W]
    v, u = yy / H, xx / W
    # Grundabdunklung; Textspalte links etwas stärker; Ränder dunkel (nichts Helles am Schnitt)
    k = 0.60 * (1 - 0.30 * np.clip((0.62 - u) / 0.62, 0, 1)) * (1 - 0.25 * np.clip((v - 0.55) / 0.45, 0, 1))
    edge = np.clip(np.minimum(xx, W - 1 - xx) / 110.0, 0, 1) * np.clip(np.minimum(yy, H - 1 - yy) / 110.0, 0, 1)
    k *= 0.72 + 0.28 * edge
    a *= k[..., None]
    a += np.random.default_rng(5).normal(0, 1.6, (H, W, 1)).astype(np.float32)      # feines Korn gegen Banding
    Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).save(os.path.join(DERIVED, 'BYK_back_bg.png'))
    # Rücken-Hintergrund: Nachtblau, Verlauf oben → unten mit leichtem Korn
    h, w = PANEL_H_PX, 240
    t = np.linspace(0, 1, h, dtype=np.float32)[:, None, None]
    col = (1 - t) * np.array((18, 26, 46), np.float32) + t * np.array((6, 8, 15), np.float32)
    col = np.repeat(col, w, axis=1)
    x = np.linspace(-1, 1, w, dtype=np.float32)[None, :, None]
    col = col * (1 + 0.10 * np.exp(-(x / 0.55) ** 2))
    col += np.random.default_rng(23).normal(0, 2.0, (h, w, 1)).astype(np.float32)
    Image.fromarray(np.clip(col, 0, 255).astype(np.uint8)).save(os.path.join(DERIVED, 'BYK_spine_bg.png'))
    return boxes, genre_y_mm, genre_y_px


# ----------------------------------------------------------------------------- HTML-Panels
def back_panel_html(x, y):
    """Rückseite wie das BY-Template: Portrait oben rückenseitig (rechts), Text außen; Tagline unten; Barcode-Feld."""
    P = lambda mm: f'{mm:.3f}mm'
    headline = T['headline']
    questions = ''.join(f'<div class="q">{q}</div>' for q in T['questions'])
    blurb = ''.join(f'<p>{p}</p>' for p in T['blurb'] if p.strip())
    tagline = (T.get('tagline') or '').strip()
    bar_x = x + TRIM_W - SAFE - BARCODE_W
    bar_y = y + TRIM_H - SAFE - BARCODE_H
    return f"""
    <img class="fill" src="file://{DERIVED}/BYK_back_bg.png" style="left:{P(x - BLEED)}; top:{P(y - BLEED)}; width:{P(TRIM_W + 2 * BLEED)}; height:{P(TRIM_H + 2 * BLEED)};">
    <div class="abs backflow" style="left:{P(x + 10)}; top:{P(y + 9)}; width:{P(TRIM_W - 19)}; height:{P(TRIM_H - 9 - 48)};">
      <img class="portrait" src="file://{PORTRAIT}">
      <div class="cinzel gold headline">{headline}</div>
      <div class="orn"><span class="line"></span><img src="file://{HERE}/assets/butterfly.svg" class="bf"><span class="line"></span></div>
      <div class="lit cream questions">{questions}</div>
      <div class="lit cream blurb">{blurb}</div>
    </div>
    {f'<div class="abs bottomblock" style="left:{P(x + 10)}; top:{P(y + TRIM_H - 44.5)}; width:{P(TRIM_W - 20)};"><div class="cinzel gold tagline">{tagline}</div></div>' if tagline else ''}
    <div class="abs barcode" style="left:{P(bar_x)}; top:{P(bar_y)}; width:{P(BARCODE_W)}; height:{P(BARCODE_H)};"></div>
    """


SPINE_TITLE_TOP, SPINE_TITLE_END = 12.0, 103.0      # mm ab Trim-Oberkante: Titel endet vor dem Schmetterling (108 mm)
SPINE_AUTHOR_TOP, SPINE_AUTHOR_END = 120.0, TRIM_H - SAFE - 9.0


def text_len_mm(text, pt, weight, tracking_em):
    """Lauflänge einer Cinzel-Zeile in mm (Glyphenvorschub + Sperrung), wie WeasyPrint sie setzt."""
    f = ImageFont.truetype(os.path.join(ROOT, 'fonts', f'Cinzel-{weight}.ttf'), 1000)
    adv = sum(f.getlength(ch) for ch in text) / 1000          # in em
    return (adv + tracking_em * len(text)) * pt / 2.835


def fit_pt(text, pt_max, length_mm, weight, tracking_em):
    pt = pt_max
    while pt > 5.0 and text_len_mm(text, pt, weight, tracking_em) > length_mm:
        pt -= 0.1
    return round(pt, 1)


def spine_panel_html(x, y, sw):
    P = lambda mm: f'{mm:.3f}mm'
    inner = sw - 2 * 1.8                                           # 1,6 mm Pflichtabstand + Reserve
    cap_pt = max(6.0, min(15.0, inner / 0.72 * 2.835 * 0.92))     # Versalhöhe Cinzel ≈ 0,72 em; 1 mm = 2,835 pt
    spine_title = T.get('spine_title') or T['title']
    title_pt = fit_pt(spine_title, cap_pt, SPINE_TITLE_END - SPINE_TITLE_TOP, 700, 0.10)
    author_pt = fit_pt(T['author_caps'], max(5.0, cap_pt * 0.62), SPINE_AUTHOR_END - SPINE_AUTHOR_TOP, 400, 0.14)
    return f"""
    <img class="fill" src="file://{DERIVED}/BYK_spine_bg.png" style="left:{P(x)}; top:{P(y - BLEED)}; width:{P(sw)}; height:{P(TRIM_H + 2 * BLEED)}; object-fit: cover; object-position: center;">
    <div class="abs spine-title cinzel gold" style="left:{P(x + sw / 2 - 80)}; top:{P(y + SPINE_TITLE_TOP + 80 - sw / 2)}; width:160mm; height:{P(sw)}; font-size:{title_pt:.1f}pt; line-height:{P(sw)}; transform: rotate(90deg); transform-origin: 80mm {P(sw / 2)};">{spine_title}</div>
    <img src="file://{HERE}/assets/butterfly.svg" class="abs" style="left:{P(x + sw / 2 - 2.6)}; top:{P(y + 108)}; width:5.2mm; height:4.7mm;">
    <div class="abs spine-author cinzel cream" style="left:{P(x + sw / 2 - 45)}; top:{P(y + SPINE_AUTHOR_TOP + 45 - sw / 2)}; width:90mm; height:{P(sw)}; font-size:{author_pt:.1f}pt; line-height:{P(sw)}; transform: rotate(90deg); transform-origin: 45mm {P(sw / 2)};">{T['author_caps']}</div>
    """


def front_panel_html(x, y, genre_y_mm):
    """Front: fertig komponiertes Motiv (inkl. Beschnitt) + Genrezeile als Vektortext."""
    P = lambda mm: f'{mm:.3f}mm'
    genre = (T.get('genre') or '').strip()
    return f"""
    <img class="fill" src="file://{DERIVED}/BYK_front_{LANG}.png" style="left:{P(x - BLEED)}; top:{P(y - BLEED)}; width:{P(TRIM_W + 2 * BLEED)}; height:{P(TRIM_H + 2 * BLEED)};">
    {f'<div class="abs genre lit cream" style="left:{P(x + 10)}; top:{P(y - BLEED + genre_y_mm - 2.3)}; width:{P(TRIM_W - 20)};">{genre}</div>' if genre else ''}
    """


def byk_css():
    return f"""
    .genre {{ font-size: 10pt; letter-spacing: 0.04em; opacity: 0.92; }}
    """


# ----------------------------------------------------------------------------- Builds
def build_fullcover(pages, outdir, genre_y_mm):
    sw = spine_width(pages)
    page_w = 2 * BLEED + 2 * TRIM_W + sw
    page_h = TRIM_H + 2 * BLEED
    bx, by = BLEED, BLEED
    sx = BLEED + TRIM_W
    fx = BLEED + TRIM_W + sw
    html = f"""<!doctype html><html lang="{LANG}"><head><meta charset="utf-8"><style>
    {css_base(page_w, page_h)}{back_css()}{spine_css()}{front_css()}{byk_css()}
    </style></head><body>
    {back_panel_html(bx, by)}
    {front_panel_html(fx, by, genre_y_mm)}
    {spine_panel_html(sx, by, sw)}
    </body></html>"""
    pdf = os.path.join(outdir, 'Fullcover.pdf')
    HTML(string=html, base_url=HERE).write_pdf(pdf)
    return pdf, dict(page_w=page_w, page_h=page_h, spine=sw, back_x=bx, spine_x=sx, front_x=fx)


def build_single(outdir, which, genre_y_mm):
    page_w, page_h = TRIM_W + 2 * BLEED, TRIM_H + 2 * BLEED
    body = back_panel_html(BLEED, BLEED) if which == 'back' else front_panel_html(BLEED, BLEED, genre_y_mm)
    html = f"""<!doctype html><html lang="{LANG}"><head><meta charset="utf-8"><style>
    {css_base(page_w, page_h)}{back_css()}{front_css()}{byk_css()}
    </style></head><body>{body}</body></html>"""
    pdf = os.path.join(outdir, 'Backcover.pdf' if which == 'back' else 'Frontcover.pdf')
    HTML(string=html, base_url=HERE).write_pdf(pdf)
    return pdf


def build_ebook(outdir, genre_y_px):
    """1600 × 2560 px: Seite in CSS-px (96 dpi) → Raster mit 96 dpi = exakt 1600 × 2560."""
    genre = (T.get('genre') or '').strip()
    html = f"""<!doctype html><html lang="{LANG}"><head><meta charset="utf-8"><style>
    {FONT_CSS}
    @page {{ size: {EBOOK_W}px {EBOOK_H}px; margin: 0; }}
    html, body {{ margin:0; padding:0; }}
    body {{ width:{EBOOK_W}px; height:{EBOOK_H}px; position:relative; overflow:hidden; background:#000; }}
    img.art {{ position:absolute; left:0; top:0; width:{EBOOK_W}px; height:{EBOOK_H}px; }}
    .genre {{ position:absolute; left:120px; width:{EBOOK_W - 240}px; top:{genre_y_px - 26:.0f}px; text-align:center; font-family:'Literata',serif; font-size:42px; letter-spacing:0.04em; color:{CREAM}; opacity:0.92; }}
    </style></head><body><img class="art" src="file://{DERIVED}/BYK_ebook_art_{LANG}.png">{f'<div class="genre">{genre}</div>' if genre else ''}</body></html>"""
    tmp = os.path.join(outdir, '_ebook.pdf')
    HTML(string=html, base_url=HERE).write_pdf(tmp)
    doc = pymupdf.open(tmp)
    pix = doc[0].get_pixmap(dpi=96, alpha=False)
    jpg = os.path.join(outdir, 'eBook-Cover.jpg')
    Image.frombytes('RGB', (pix.width, pix.height), pix.samples).save(jpg, quality=92, subsampling=0)
    doc.close(); os.remove(tmp)
    return jpg, (pix.width, pix.height)


def page_count(args):
    if args.pages:
        return args.pages, 'CLI'
    rep = os.path.join(ROOT, 'interior', 'out', 'report.json')
    data = json.load(open(rep, encoding='utf-8')) if os.path.exists(rep) else {}
    key = BOOK if LANG == 'tr' else f'{BOOK}_{LANG.upper()}'
    if isinstance(data.get(key), dict) and data[key].get('pdf_pages'):
        return int(data[key]['pdf_pages']), f'interior/out/report.json [{key}]'
    return ESTIMATE, ESTIMATE_WARNING


def check_layout(boxes):
    """Glyphenboxen der Druckfront gegen Sicherheitszone (6,35 mm ab Trim) prüfen."""
    lo = (BLEED + SAFE) * PX_PER_MM
    hi_x, hi_y = PANEL_W_PX - lo, PANEL_H_PX - lo
    problems = []
    for name, (x0, y0, x1, y1) in boxes.items():
        if x0 < lo or y0 < lo or x1 > hi_x or y1 > hi_y:
            problems.append(f'{name}: Box ({x0 / PX_PER_MM:.1f}, {y0 / PX_PER_MM:.1f})–({x1 / PX_PER_MM:.1f}, {y1 / PX_PER_MM:.1f}) mm verletzt die Sicherheitszone')
    return problems


def check_text_zones(pdf, geo):
    """Alle Vektortextzeilen des Fullcovers gegen die KDP-Zonen prüfen: Rückseite/Front ≥ SAFE von Trim und Falz,
    Rücken ≥ 1,6 mm von beiden Falzen und ≥ SAFE von oben/unten. Liefert Liste von Verstößen (leer = ok)."""
    doc = pymupdf.open(pdf)
    k = 72 / 25.4
    probs = []
    top, bot = BLEED + SAFE, BLEED + TRIM_H - SAFE
    for b in doc[0].get_text('dict')['blocks']:
        for line in b.get('lines', []):
            text = ''.join(s['text'] for s in line['spans']).strip()
            if not text:
                continue
            x0, y0, x1, y1 = (c / k for c in line['bbox'])
            cx = (x0 + x1) / 2
            if cx < geo['spine_x']:
                zone, lo, hi = 'Rückseite', geo['back_x'] + SAFE, geo['spine_x'] - SAFE
            elif cx < geo['front_x']:
                zone, lo, hi = 'Rücken', geo['spine_x'] + 1.6, geo['front_x'] - 1.6
            else:
                zone, lo, hi = 'Front', geo['front_x'] + SAFE, geo['front_x'] + TRIM_W - SAFE
            if x0 < lo - 0.05 or x1 > hi + 0.05 or y0 < top - 0.05 or y1 > bot + 0.05:
                probs.append(f'{zone}: „{text[:40]}“ ({x0:.1f}, {y0:.1f})–({x1:.1f}, {y1:.1f}) mm außerhalb ({lo:.1f}–{hi:.1f}, {top:.1f}–{bot:.1f})')
    doc.close()
    return probs


def main():
    global LANG, T
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--lang', default='tr', choices=LANGS)
    ap.add_argument('--pages', type=int, help=f'Seitenzahl des Innenteils (sonst interior/out/report.json [{BOOK}…])')
    args = ap.parse_args()
    LANG, T = args.lang, texts_for(args.lang)
    if args.pages is not None and args.pages <= 0:
        sys.exit('--pages muss > 0 sein')
    pages, source = page_count(args)
    sw = spine_width(pages)
    print(f'{BOOK} {LANG.upper()}: {pages} Seiten ({source}) → Rücken {sw:.2f} mm')

    src, src_path = load_source()
    print(f'Frontmotiv: {os.path.relpath(src_path, ROOT)} {src.size}')
    boxes, genre_y_mm, genre_y_px = build_art(src)
    for name, b in boxes.items():
        print(f'  {name}: x {b[0] / PX_PER_MM:.1f}–{b[2] / PX_PER_MM:.1f} mm, y {b[1] / PX_PER_MM:.1f}–{b[3] / PX_PER_MM:.1f} mm (ab Beschnittkante)')
    for p in check_layout(boxes):
        print('  WARNUNG:', p)

    outdir = os.path.join(OUT, BOOK, LANG.upper()); os.makedirs(outdir, exist_ok=True)
    pdf, geo = build_fullcover(pages, outdir, genre_y_mm)
    chk = check_pdf(pdf, geo['page_w'], geo['page_h'])
    zone_probs = check_text_zones(pdf, geo) + check_layout(boxes)
    for p in zone_probs:
        print('  FEHLER Sicherheitszone:', p)
    build_single(outdir, 'front', genre_y_mm); build_single(outdir, 'back', genre_y_mm)
    jpg, size = build_ebook(outdir, genre_y_px)
    render_png(pdf, os.path.join(outdir, 'Vorschau.png'), dpi=72)
    guides_png(pdf, os.path.join(outdir, 'Fullcover_Guides.png'), geo)

    report_path = os.path.join(OUT, 'cover_report.json')
    report = json.load(open(report_path, encoding='utf-8')) if os.path.exists(report_path) else {}
    entry = report.setdefault(BOOK, {})
    lang_entry = {'pages': pages, 'pages_source': source, 'spine_mm': sw, 'geometry': geo, 'title': T['title'],
                  'subtitle': T.get('subtitle', ''), 'fullcover_check': chk, 'ebook_px': list(size),
                  'front_art': os.path.relpath(src_path, ROOT), 'safe_zone_violations': zone_probs}
    entry[LANG] = lang_entry
    if LANG == 'tr':
        entry.update({'pages': pages, 'pages_source': source, 'spine_mm': sw, 'title': T['title']})
    json.dump(report, open(report_path, 'w', encoding='utf-8'), indent=2, ensure_ascii=False)
    print(f'  Fullcover {chk["width_mm"]} x {chk["height_mm"]} mm (Soll {geo["page_w"]:.2f} x {geo["page_h"]:.2f}), '
          f'Fonts eingebettet: {chk["fonts_embedded"]}, ok: {chk["ok"]}, Sicherheitszonen: {"OK" if not zone_probs else f"{len(zone_probs)} Verstöße"}, eBook {size}')
    print('fertig →', outdir)
    if zone_probs or not chk['ok']:
        sys.exit(1)


if __name__ == '__main__':
    main()
