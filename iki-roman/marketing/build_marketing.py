#!/usr/bin/env python3
"""Marketing_<SPRACHE>.md → Marketing_Story_Storyboard_<SPRACHE>.pdf (A4, WeasyPrint).
Fügt, falls vorhanden, Storyboard-Stills aus trailer/out/storyboard/ als Bildleiste ein."""
import glob, os, re, sys
import markdown
from weasyprint import HTML

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..'))
FONTS = os.path.join(ROOT, 'fonts')
STILLS = os.path.join(ROOT, 'trailer', 'out', 'storyboard')

CSS = f"""
@font-face {{ font-family: 'Literata'; src: url('file://{FONTS}/Literata-400.ttf'); }}
@font-face {{ font-family: 'Literata'; font-weight: 700; src: url('file://{FONTS}/Literata-700.ttf'); }}
@font-face {{ font-family: 'Literata'; font-style: italic; src: url('file://{FONTS}/Literata-400-italic.ttf'); }}
@font-face {{ font-family: 'Cinzel'; font-weight: 700; src: url('file://{FONTS}/Cinzel-700.ttf'); }}
@page {{ size: A4; margin: 18mm 16mm 20mm 16mm; @bottom-center {{ content: counter(page); font-family: Literata; font-size: 8pt; color: #666; }} }}
body {{ font-family: 'Literata', serif; font-size: 9.6pt; line-height: 1.45; color: #1c1a17; }}
h1 {{ font-family: 'Cinzel', serif; font-size: 17pt; color: #7a5a1c; margin: 0 0 2mm 0; letter-spacing: 0.03em; }}
h2 {{ font-family: 'Cinzel', serif; font-size: 12.5pt; color: #7a5a1c; margin: 8mm 0 2mm 0; border-bottom: 0.4pt solid #c9a24e; padding-bottom: 1mm; page-break-after: avoid; }}
h3 {{ font-size: 10.5pt; font-weight: 700; margin: 5mm 0 1.5mm 0; page-break-after: avoid; }}
p {{ margin: 0 0 2.2mm 0; }}
blockquote {{ margin: 2mm 0 3mm 4mm; padding-left: 3mm; border-left: 1.2pt solid #c9a24e; color: #3b2f1a; }}
table {{ border-collapse: collapse; width: 100%; margin: 2mm 0 4mm 0; font-size: 8.6pt; page-break-inside: auto; }}
th, td {{ border: 0.4pt solid #bbb; padding: 1.3mm 1.8mm; vertical-align: top; text-align: left; }}
th {{ background: #f3ecdc; font-weight: 700; }}
tr {{ page-break-inside: avoid; }}
code, pre {{ font-family: 'DejaVu Sans Mono', monospace; font-size: 7.8pt; }}
pre {{ background: #f6f4ef; border: 0.4pt solid #ddd; padding: 2.5mm; white-space: pre-wrap; word-break: break-word; }}
hr {{ border: 0; border-top: 0.4pt solid #c9a24e; margin: 4mm 0; }}
ul, ol {{ margin: 0 0 2.5mm 0; padding-left: 5mm; }}
li {{ margin-bottom: 0.8mm; }}
.stills {{ display: flex; flex-wrap: wrap; gap: 2mm; margin: 2mm 0 4mm 0; }}
.stills figure {{ margin: 0; width: 44mm; }}
.stills img {{ width: 44mm; display: block; border: 0.3pt solid #999; }}
.stills figcaption {{ font-size: 7pt; color: #555; text-align: center; }}
"""


def stills_html(prefix, label):
    files = sorted(glob.glob(os.path.join(STILLS, f'{prefix}_*.jpg')), key=lambda f: float(re.search(r'_t([\d.]+)\.jpg$', f).group(1)))
    if not files:
        return ''
    def tsec(f):
        return re.search(r'_t([\d.]+)', f).group(1)
    figs = ''.join(f'<figure><img src="file://{f}"><figcaption>{label} · t = {tsec(f)} s</figcaption></figure>' for f in files)
    return f'<div class="stills">{figs}</div>'


def build(lang):
    md = open(os.path.join(HERE, f'Marketing_{lang}.md'), encoding='utf-8').read()
    html = markdown.markdown(md, extensions=['tables', 'fenced_code'])
    # Stills nach den Storyboard-Tabellen einfügen (Marker: Überschrift 4.2 bzw. 4.3)
    st60 = stills_html('16x9_tr', '16:9 · 60 s')
    st30 = stills_html('9x16_tr', '9:16 · 30 s')
    if st60:
        html = re.sub(r'(<h3>4\.2[^<]*</h3>)', st60 + r'\1', html, count=1)
    if st30:
        html = re.sub(r'(<h3>4\.3[^<]*</h3>)', st30 + r'\1', html, count=1)
    doc = f'<!doctype html><html lang="{lang.lower()}"><head><meta charset="utf-8"><style>{CSS}</style></head><body>{html}</body></html>'
    out = os.path.join(HERE, f'Marketing_Story_Storyboard_{lang}.pdf')
    HTML(string=doc, base_url=HERE).write_pdf(out)
    print('→', out)


if __name__ == '__main__':
    for lang in (sys.argv[1:] or ['TR', 'EN', 'DE']):
        build(lang)
