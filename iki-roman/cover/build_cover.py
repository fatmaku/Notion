#!/usr/bin/env python3
"""Cover-Satz für Amazon KDP (Taschenbuch A5, Schwarz-Weiß auf Creme) und Kindle (eBook-Cover).

Ausgabe je Buch und Sprache in cover/out/<BUCH>/<SPRACHE>/:
  Fullcover.pdf        – KDP-Wrap [Rückseite | Rücken | Front] mit 3,175 mm Beschnitt, 1 Seite, Fonts eingebettet
  Frontcover.pdf       – Front allein (Trim + Beschnitt umlaufend)
  Backcover.pdf        – Rückseite allein (Trim + Beschnitt umlaufend)
  eBook-Cover.jpg      – 1600 × 2560 px, RGB, für KDP-eBook
  Vorschau.png         – Fullcover gerastert
  Fullcover_Guides.png – Vorschau mit Trim-, Beschnitt-, Sicherheits- und Rückenlinien
Zusätzlich in cover/out/: Doppelansicht_<sprache>.png (beide Fronten nebeneinander) und
Panorama_Marketing_<sprache>.png (sechs Panels wie in der Referenz – nur für Marketing).

Maße (KDP): Trim 148 × 210 mm, Beschnitt 3,175 mm, Rücken = Seiten × 0,0635 mm (Creme),
Text-Sicherheitszone 6,35 mm vom Trim, Rückentext ≥ 1,6 mm von den Rückenkanten,
Barcode-Freifläche 50,8 × 30,5 mm unten rechts auf der Rückseite (6,35 mm von Trim und Rücken).

Aufruf: python3 build_cover.py [--pages-by N] [--pages-sa N] [--langs tr,en,de] [--books BY,SA]
Ohne --pages-* wird interior/out/report.json gelesen; fehlt es, gelten Schätzwerte (Warnung).
"""
import argparse, json, os, sys, math
from weasyprint import HTML
import pymupdf
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..'))
ASSETS = os.path.join(ROOT, 'assets', 'upscaled')
FONTS = os.path.join(ROOT, 'fonts')
OUT = os.path.join(HERE, 'out')
TEXTS = json.load(open(os.path.join(HERE, 'texts.json'), encoding='utf-8'))

BLEED = 3.175
TRIM_W, TRIM_H = 148.0, 210.0
SAFE = 6.35
SPINE_MM_PER_PAGE = 0.0635          # KDP: Creme-Papier 0,0025 in/Seite
BARCODE_W, BARCODE_H = 50.8, 30.5
LANG_NAMES = {'tr': 'TR', 'en': 'EN', 'de': 'DE'}
ESTIMATES = {'BY': 190, 'SA': 165}

FONT_CSS = f"""
@font-face {{ font-family: 'Cinzel'; font-weight: 400; src: url('file://{FONTS}/Cinzel-400.ttf'); }}
@font-face {{ font-family: 'Cinzel'; font-weight: 700; src: url('file://{FONTS}/Cinzel-700.ttf'); }}
@font-face {{ font-family: 'Cinzel'; font-weight: 900; src: url('file://{FONTS}/Cinzel-900.ttf'); }}
@font-face {{ font-family: 'Literata'; font-weight: 400; src: url('file://{FONTS}/Literata-400.ttf'); }}
@font-face {{ font-family: 'Literata'; font-weight: 400; font-style: italic; src: url('file://{FONTS}/Literata-400-italic.ttf'); }}
@font-face {{ font-family: 'Literata'; font-weight: 600; src: url('file://{FONTS}/Literata-600.ttf'); }}
@font-face {{ font-family: 'Literata'; font-weight: 700; src: url('file://{FONTS}/Literata-700.ttf'); }}
@font-face {{ font-family: 'Cormorant'; font-weight: 600; src: url('file://{FONTS}/CormorantGaramond-600.ttf'); }}
"""

GOLD = '#E6C878'
GOLD_DEEP = '#C9A24E'
CREAM = '#EFE6D3'


def spine_width(pages):
    return round(pages * SPINE_MM_PER_PAGE, 2)


def page_counts(args):
    counts = {}
    rep = os.path.join(ROOT, 'interior', 'out', 'report.json')
    data = json.load(open(rep)) if os.path.exists(rep) else {}
    for key in ('BY', 'SA'):
        cli = getattr(args, f'pages_{key.lower()}')
        if cli:
            counts[key] = (cli, 'CLI')
        elif key in data and data[key].get('pdf_pages'):
            counts[key] = (int(data[key]['pdf_pages']), 'interior/out/report.json')
        else:
            counts[key] = (ESTIMATES[key], 'SCHÄTZUNG – vor dem Upload mit der echten Seitenzahl neu bauen!')
    return counts


# ----------------------------------------------------------------------------- HTML-Bausteine
def css_base(page_w, page_h):
    return f"""
    {FONT_CSS}
    @page {{ size: {page_w:.3f}mm {page_h:.3f}mm; margin: 0; }}
    html, body {{ margin: 0; padding: 0; }}
    body {{ width: {page_w:.3f}mm; height: {page_h:.3f}mm; position: relative; overflow: hidden; background: #05070c; }}
    .abs {{ position: absolute; }}
    img.fill {{ position: absolute; display: block; }}
    .cinzel {{ font-family: 'Cinzel', serif; }}
    .lit {{ font-family: 'Literata', serif; }}
    .gold {{ color: {GOLD}; }}
    .cream {{ color: {CREAM}; }}
    """


def back_panel_html(book, lang, x, y, with_left_bleed=True, with_right_bleed=False):
    """Rückseite: Trim-Box beginnt bei (x, y) in mm. Text fließt um das rechts gefloatete Portrait (rückenseitig)."""
    t = TEXTS[book]
    s = TEXTS['series']
    P = lambda mm: f'{mm:.3f}mm'
    bg_x = x - BLEED
    bg_w = TRIM_W + 2 * BLEED
    headline = t['headline'][lang]
    sub_tr = t['subtitle_translation'].get(lang, '')
    questions = ''.join(f'<div class="q">{q}</div>' for q in t['questions'][lang])
    blurb = ''.join(f'<p>{p}</p>' for p in t['blurb'][lang])
    tagline = s['tagline'][lang]
    claim = s['claim'][lang]
    bar_x = x + TRIM_W - SAFE - BARCODE_W
    bar_y = y + TRIM_H - SAFE - BARCODE_H
    return f"""
    <img class="fill" src="file://{ASSETS}/{book}_back_bg.png" style="left:{P(bg_x)}; top:{P(y - BLEED)}; width:{P(bg_w)}; height:{P(TRIM_H + 2 * BLEED)};">
    <div class="abs backflow" style="left:{P(x + 10)}; top:{P(y + 9)}; width:{P(TRIM_W - 19)}; height:{P(TRIM_H - 9 - 48)};">
      <img class="portrait" src="file://{ASSETS}/{book}_portrait.png">
      <div class="cinzel gold headline">{headline}</div>
      {f'<div class="cinzel gold subtr">{sub_tr}</div>' if sub_tr else ''}
      <div class="orn"><span class="line"></span><img src="file://{HERE}/assets/butterfly.svg" class="bf"><span class="line"></span></div>
      {f'<div class="lit cream blurb first">{blurb}</div><div class="lit cream questions after">{questions}</div>' if book == 'SA' else f'<div class="lit cream questions">{questions}</div><div class="lit cream blurb">{blurb}</div>'}
    </div>
    <div class="abs bottomblock" style="left:{P(x + 10)}; top:{P(y + TRIM_H - 44.5)}; width:{P(TRIM_W - 20)};">
      <div class="cinzel gold tagline">{tagline}</div>
      <div class="lit cream claim" style="width:{P(TRIM_W - 20 - BARCODE_W - 5)};">{claim}</div>
    </div>
    <img src="file://{HERE}/assets/skyline.svg" class="abs" style="left:{P(x + 10)}; top:{P(y + TRIM_H - 17)}; width:20mm; height:8.3mm;">
    <div class="abs barcode" style="left:{P(bar_x)}; top:{P(bar_y)}; width:{P(BARCODE_W)}; height:{P(BARCODE_H)};"></div>
    """


def back_css():
    return f"""
    .backflow {{ overflow: hidden; }}
    .portrait {{ float: right; width: 58mm; height: 71mm; margin: -2mm -1mm 3mm 4mm; }}
    .headline {{ font-weight: 700; font-size: 14pt; line-height: 1.22; padding-top: 4mm; }}
    .subtr {{ font-weight: 400; font-size: 8.5pt; letter-spacing: 0.06em; margin-top: 2.2mm; }}
    .orn {{ text-align: left; height: 6.5mm; margin: 4mm 0 3mm 0; white-space: nowrap; }}
    .orn .line {{ display: inline-block; width: 22mm; height: 0.35mm; background: linear-gradient(to right, transparent, {GOLD}, transparent); vertical-align: middle; margin: 0 1.5mm; }}
    .orn .bf {{ width: 7mm; height: 6.3mm; vertical-align: middle; }}
    .questions .q {{ font-weight: 600; font-size: 10.4pt; line-height: 1.5; }}
    .questions.after {{ margin-top: 5mm; }}
    .blurb {{ margin-top: 4.5mm; }}
    .blurb.first {{ margin-top: 1mm; }}
    .blurb p {{ font-weight: 400; font-size: 10.2pt; line-height: 1.48; margin: 0 0 3mm 0; text-align: left; }}
    .tagline {{ font-weight: 400; font-size: 9pt; letter-spacing: 0.04em; line-height: 1.3; white-space: nowrap; }}
    .claim {{ font-style: italic; font-size: 7.8pt; line-height: 1.35; opacity: 0.9; margin-top: 1.5mm; }}
    .barcode {{ background: #ffffff; border-radius: 1.2mm; }}
    """


# YOLCU: Die Faust beginnt genau am Rückenfalz (ŞAHİT liegt links daneben). Damit bei Falzversatz kein dunkler
# Rückenstreifen vor der Faust erscheint, bleibt das Frontmotiv auf den letzten 1,6 mm des Rückens sichtbar.
FOLD_OVERLAP = 1.6


def spine_panel_html(book, x, y, sw, lang='tr'):
    t = TEXTS[book]
    P = lambda mm: f'{mm:.3f}mm'
    # Textzeilen werden um 90° gedreht: Box hat Breite = Höhe des Rückens, wird dann rotiert.
    inner = sw - 2 * 1.8                     # 1,6 mm Pflichtabstand + Reserve
    title_pt = max(6.0, min(15.0, inner / 0.72 * 2.835 * 0.92))   # Cap-Höhe Cinzel ≈ 0,72 em; 1 mm = 2,835 pt
    author_pt = max(5.0, title_pt * 0.62)
    return f"""
    <img class="fill" src="file://{ASSETS}/{book}_spine_bg.png" style="left:{P(x)}; top:{P(y - BLEED)}; width:{P(sw - (FOLD_OVERLAP if book == 'BY' else 0))}; height:{P(TRIM_H + 2 * BLEED)}; object-fit: cover; object-position: left;">
    <div class="abs spine-title cinzel gold" style="left:{P(x + sw / 2 - 80)}; top:{P(y + 12 + 80 - sw / 2)}; width:160mm; height:{P(sw)}; font-size:{title_pt:.1f}pt; line-height:{P(sw)}; transform: rotate(90deg); transform-origin: 80mm {P(sw / 2)};">{t.get('title_i18n', {}).get(lang, t['title'])}</div>
    <img src="file://{HERE}/assets/butterfly.svg" class="abs" style="left:{P(x + sw / 2 - 2.6)}; top:{P(y + 108)}; width:5.2mm; height:4.7mm;">
    <div class="abs spine-author cinzel cream" style="left:{P(x + sw / 2 - 45)}; top:{P(y + 120 + 45 - sw / 2)}; width:90mm; height:{P(sw)}; font-size:{author_pt:.1f}pt; line-height:{P(sw)}; transform: rotate(90deg); transform-origin: 45mm {P(sw / 2)};">{t['author_caps']}</div>
    <img src="file://{HERE}/assets/skyline.svg" class="abs" style="left:{P(x + sw / 2 - 2.8)}; top:{P(y + TRIM_H - 12)}; width:5.6mm; height:2.4mm;">
    """


def spine_css():
    return """
    .spine-title { font-weight: 700; letter-spacing: 0.10em; text-align: left; white-space: nowrap; }
    .spine-author { font-weight: 400; letter-spacing: 0.14em; text-align: left; white-space: nowrap; }
    """


def front_panel_html(book, lang, x, y, with_left_bleed=False):
    """Front: Trim-Box bei (x, y). Bild enthält Beschnitt beidseitig; links liegt er ggf. unter dem Rücken."""
    t = TEXTS[book]
    P = lambda mm: f'{mm:.3f}mm'
    genre = t['genre'][lang]
    art = f'{book}_front_{lang}.png'     # Titel je Sprache gesetzt (titles_on_fronts.py)
    # Genrezeile: Position aus der Referenz (Panorama-y 800 bzw. 838 px → mm ab Beschnittoberkante)
    gy = {'SA': 800, 'BY': 838}[book] / 9.465 - BLEED    # mm ab Trim-Oberkante
    return f"""
    <img class="fill" src="file://{ASSETS}/{art}" style="left:{P(x - BLEED)}; top:{P(y - BLEED)}; width:{P(TRIM_W + 2 * BLEED)}; height:{P(TRIM_H + 2 * BLEED)};">
    {'' if lang == 'tr' else f'<div class="abs genre lit {"dark" if book == "BY" else "cream"}" style="left:{P(x + 10)}; top:{P(y + gy - 2.3)}; width:{P(TRIM_W - 20)};">{genre}</div>'}
    """


def front_css():
    return """
    .genre { text-align: center; font-size: 10.5pt; font-weight: 400; letter-spacing: 0.02em; }
    .genre.dark { color: #2b1d10; font-weight: 600; }
    """


def build_fullcover(book, lang, pages, outdir):
    sw = spine_width(pages)
    page_w = 2 * BLEED + 2 * TRIM_W + sw
    page_h = TRIM_H + 2 * BLEED
    bx, by = BLEED, BLEED                 # Rückseite Trim-Box
    sx = BLEED + TRIM_W                   # Rücken
    fx = BLEED + TRIM_W + sw              # Front Trim-Box
    html = f"""<!doctype html><html lang="{lang}"><head><meta charset="utf-8"><style>
    {css_base(page_w, page_h)}{back_css()}{spine_css()}{front_css()}
    </style></head><body>
    {back_panel_html(book, lang, bx, by)}
    {front_panel_html(book, lang, fx, by)}
    {spine_panel_html(book, sx, by, sw, lang)}
    </body></html>"""
    pdf = os.path.join(outdir, 'Fullcover.pdf')
    HTML(string=html, base_url=HERE).write_pdf(pdf)
    return pdf, dict(page_w=page_w, page_h=page_h, spine=sw, back_x=bx, spine_x=sx, front_x=fx)


def build_single(book, lang, outdir, which):
    page_w = TRIM_W + 2 * BLEED
    page_h = TRIM_H + 2 * BLEED
    body = back_panel_html(book, lang, BLEED, BLEED) if which == 'back' else front_panel_html(book, lang, BLEED, BLEED)
    html = f"""<!doctype html><html lang="{lang}"><head><meta charset="utf-8"><style>
    {css_base(page_w, page_h)}{back_css()}{front_css()}
    </style></head><body>{body}</body></html>"""
    pdf = os.path.join(outdir, 'Backcover.pdf' if which == 'back' else 'Frontcover.pdf')
    HTML(string=html, base_url=HERE).write_pdf(pdf)
    return pdf


def build_ebook(book, lang, outdir):
    """1600 × 2560 px. Seite in CSS-px (96 dpi) → Raster mit 96 dpi = exakt 1600 × 2560."""
    t = TEXTS[book]
    art = f'{book}_ebook_art_{lang}.png'
    genre = t['genre'][lang]
    # Genrezeile: y-Position aus der Referenz skaliert (Panorama 800/838 px von 2048 → Art-Skalierung 1.095, Offset oben 174 px)
    gy_px = {'SA': 800, 'BY': 838}[book] * (1600 / 1461) + int(317 * 0.55)
    html = f"""<!doctype html><html lang="{lang}"><head><meta charset="utf-8"><style>
    {FONT_CSS}
    @page {{ size: 1600px 2560px; margin: 0; }}
    html, body {{ margin:0; padding:0; }}
    body {{ width:1600px; height:2560px; position:relative; overflow:hidden; background:#000; }}
    img.art {{ position:absolute; left:0; top:0; width:1600px; height:2560px; }}
    .genre {{ position:absolute; left:120px; width:1360px; top:{gy_px - 26:.0f}px; text-align:center; font-family:'Literata',serif; font-size:44px; color:{'#2b1d10' if book == 'BY' else CREAM}; font-weight:{600 if book == 'BY' else 400}; }}
    </style></head><body><img class="art" src="file://{ASSETS}/{art}">{'' if lang == 'tr' else f'<div class="genre">{genre}</div>'}</body></html>"""
    tmp = os.path.join(outdir, '_ebook.pdf')
    HTML(string=html, base_url=HERE).write_pdf(tmp)
    doc = pymupdf.open(tmp)
    pix = doc[0].get_pixmap(dpi=96, alpha=False)
    jpg = os.path.join(outdir, 'eBook-Cover.jpg')
    Image.frombytes('RGB', (pix.width, pix.height), pix.samples).save(jpg, quality=92, subsampling=0)
    doc.close(); os.remove(tmp)
    return jpg, (pix.width, pix.height)


def render_png(pdf, png, dpi=72):
    doc = pymupdf.open(pdf)
    pix = doc[0].get_pixmap(dpi=dpi, alpha=False)
    pix.save(png)
    doc.close()
    return pix.width, pix.height


def guides_png(pdf, png, geo, dpi=110):
    from PIL import ImageDraw
    doc = pymupdf.open(pdf)
    pix = doc[0].get_pixmap(dpi=dpi, alpha=False)
    im = Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
    doc.close()
    d = ImageDraw.Draw(im)
    k = dpi / 25.4
    W, H = im.size
    def vline(xmm, col, w=1): d.line([(xmm * k, 0), (xmm * k, H)], fill=col, width=w)
    def rect(x0, y0, x1, y1, col): d.rectangle([x0 * k, y0 * k, x1 * k, y1 * k], outline=col, width=2)
    # Beschnitt (rot), Trim (cyan), Sicherheitszone (gelb), Rücken (magenta)
    rect(BLEED, BLEED, geo['page_w'] - BLEED, geo['page_h'] - BLEED, (0, 220, 255))
    rect(BLEED + SAFE, BLEED + SAFE, BLEED + TRIM_W - SAFE, BLEED + TRIM_H - SAFE, (255, 220, 0))
    rect(geo['front_x'] + SAFE, BLEED + SAFE, geo['front_x'] + TRIM_W - SAFE, BLEED + TRIM_H - SAFE, (255, 220, 0))
    vline(geo['spine_x'], (255, 0, 255), 2); vline(geo['front_x'], (255, 0, 255), 2)
    vline(geo['spine_x'] + 1.6, (255, 120, 255), 1); vline(geo['front_x'] - 1.6, (255, 120, 255), 1)
    d.text((8, 8), f"Fullcover {geo['page_w']:.2f} x {geo['page_h']:.2f} mm | Rücken {geo['spine']:.2f} mm | cyan=Trim, gelb=Sicherheitszone 6,35 mm, magenta=Rückenkanten (+1,6 mm)", fill=(255, 255, 255))
    im.save(png)


def check_pdf(pdf, expect_w, expect_h):
    from pypdf import PdfReader
    r = PdfReader(pdf)
    assert len(r.pages) == 1, 'Cover-PDF muss genau eine Seite haben'
    box = r.pages[0].mediabox
    w_mm, h_mm = float(box.width) * 25.4 / 72, float(box.height) * 25.4 / 72
    fonts, embedded = set(), True
    def walk(res):
        for k, f in (res.get('/Font') or {}).items():
            f = f.get_object(); name = str(f.get('/BaseFont')); fonts.add(name)
            desc = f.get('/FontDescriptor')
            if f.get('/Subtype') == '/Type0':
                d0 = f['/DescendantFonts'][0].get_object(); desc = d0.get('/FontDescriptor')
            if desc is not None:
                desc = desc.get_object()
                if not any(x in desc for x in ('/FontFile', '/FontFile2', '/FontFile3')):
                    nonlocal_flag[0] = False
    nonlocal_flag = [True]
    res = r.pages[0].get('/Resources')
    if res: walk(res.get_object())
    ok = abs(w_mm - expect_w) < 0.2 and abs(h_mm - expect_h) < 0.2 and nonlocal_flag[0]
    return dict(width_mm=round(w_mm, 2), height_mm=round(h_mm, 2), fonts=sorted(fonts), fonts_embedded=nonlocal_flag[0], ok=ok)


def doppelansicht(langs, report):
    """Beide Fronten (Trim) nebeneinander: SA links, BY rechts → Faust-Naht-Nachweis. Plus Marketing-Panorama."""
    for lang in langs:
        fronts = []
        for book in ('SA', 'BY'):
            pdf = os.path.join(OUT, book, LANG_NAMES[lang], 'Frontcover.pdf')
            doc = pymupdf.open(pdf); pix = doc[0].get_pixmap(dpi=150, alpha=False)
            im = Image.frombytes('RGB', (pix.width, pix.height), pix.samples); doc.close()
            k = 150 / 25.4
            fronts.append(im.crop((int(BLEED * k), int(BLEED * k), int((BLEED + TRIM_W) * k), int((BLEED + TRIM_H) * k))))
        pair = Image.new('RGB', (fronts[0].width + fronts[1].width, fronts[0].height))
        pair.paste(fronts[0], (0, 0)); pair.paste(fronts[1], (fronts[0].width, 0))
        pair.save(os.path.join(OUT, f'Doppelansicht_{LANG_NAMES[lang]}.png'))
        # Marketing-Panorama: SA-Fullcover + BY-Fullcover gespiegelt in der Anordnung (Front|Rücken|Rückseite)
        panels = []
        for book in ('SA', 'BY'):
            pdf = os.path.join(OUT, book, LANG_NAMES[lang], 'Fullcover.pdf')
            doc = pymupdf.open(pdf); pix = doc[0].get_pixmap(dpi=110, alpha=False)
            im = Image.frombytes('RGB', (pix.width, pix.height), pix.samples); doc.close()
            k = 110 / 25.4; geo = report[book][lang]['geometry']
            back = im.crop((int(BLEED * k), int(BLEED * k), int((BLEED + TRIM_W) * k), int((BLEED + TRIM_H) * k)))
            spine = im.crop((int(geo['spine_x'] * k), int(BLEED * k), int(geo['front_x'] * k), int((BLEED + TRIM_H) * k)))
            front = im.crop((int(geo['front_x'] * k), int(BLEED * k), int((geo['front_x'] + TRIM_W) * k), int((BLEED + TRIM_H) * k)))
            panels.append((back, spine, front))
        order = [panels[0][0], panels[0][1], panels[0][2], panels[1][2], panels[1][1], panels[1][0]]
        W = sum(p.width for p in order); H = order[0].height
        pano = Image.new('RGB', (W, H)); x = 0
        for p in order:
            pano.paste(p, (x, 0)); x += p.width
        pano.save(os.path.join(OUT, f'Panorama_Marketing_{LANG_NAMES[lang]}.png'))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--pages-by', type=int); ap.add_argument('--pages-sa', type=int)
    ap.add_argument('--langs', default='tr,en,de'); ap.add_argument('--books', default='BY,SA')
    args = ap.parse_args()
    langs = args.langs.split(','); books = args.books.split(',')
    counts = page_counts(args)
    report = {}
    for book in books:
        pages, source = counts[book]
        sw = spine_width(pages)
        print(f'{book}: {pages} Seiten ({source}) → Rücken {sw:.2f} mm')
        report[book] = {'pages': pages, 'pages_source': source, 'spine_mm': sw}
        for lang in langs:
            outdir = os.path.join(OUT, book, LANG_NAMES[lang]); os.makedirs(outdir, exist_ok=True)
            pdf, geo = build_fullcover(book, lang, pages, outdir)
            chk = check_pdf(pdf, geo['page_w'], geo['page_h'])
            build_single(book, lang, outdir, 'front'); build_single(book, lang, outdir, 'back')
            jpg, size = build_ebook(book, lang, outdir)
            render_png(pdf, os.path.join(outdir, 'Vorschau.png'), dpi=72)
            guides_png(pdf, os.path.join(outdir, 'Fullcover_Guides.png'), geo)
            report[book][lang] = {'geometry': geo, 'fullcover_check': chk, 'ebook_px': size}
            print(f'  {LANG_NAMES[lang]}: Fullcover {chk["width_mm"]} x {chk["height_mm"]} mm, Fonts eingebettet: {chk["fonts_embedded"]}, eBook {size}')
    if set(books) >= {'BY', 'SA'}:
        doppelansicht(langs, report)
    json.dump(report, open(os.path.join(OUT, 'cover_report.json'), 'w'), indent=2, ensure_ascii=False)
    print('fertig →', OUT)


if __name__ == '__main__':
    main()
