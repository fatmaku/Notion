#!/usr/bin/env python3
"""Cat Me If You Can – kleine Türkisch-Schriftdateien (Erweiterung perf).

Türkische Texte brauchen aus „latin-ext“ nur fünf Zeichen: Ğ ğ İ Ş ş. Die ganze latin-ext-Datei
ist aber groß (Unbounded: 118 KB). Dieses Skript schneidet genau diese Zeichen heraus – mit allen
Achsen der variablen Schrift und allen OpenType-Funktionen, die Form bleibt also gleich.
css/fonts.css lädt die kleinen Dateien für diese Zeichen; alles andere aus latin-ext kommt wie
bisher aus der großen Datei.

Aufruf (einmalig, wenn sich eine Schrift ändert):
    pip install fonttools brotli
    python3 scripts/fonts-tr-subset.py
"""

import os
import sys

from fontTools import subset

HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(HERE, '..', 'public', 'vendor', 'fonts')
TR_CODEPOINTS = [0x011E, 0x011F, 0x0130, 0x015E, 0x015F]  # Ğ ğ İ Ş ş
FAMILIES = ['unbounded', 'manrope', 'vazirmatn']


def main():
    for fam in FAMILIES:
        src = os.path.join(FONTS, f'{fam}-latin-ext.woff2')
        out = os.path.join(FONTS, f'{fam}-latin-ext-tr.woff2')
        opts = subset.Options()
        opts.flavor = 'woff2'
        opts.layout_features = ['*']  # alle Funktionen behalten (Kerning, Zeichenvarianten …)
        opts.name_IDs = ['*']
        opts.name_languages = ['*']
        opts.notdef_outline = True
        opts.glyph_names = False
        opts.hinting = True
        opts.legacy_kern = True
        opts.drop_tables = []  # nichts wegwerfen (fvar/gvar/STAT/HVAR … bleiben)
        font = subset.load_font(src, opts)
        sub = subset.Subsetter(opts)
        sub.populate(unicodes=TR_CODEPOINTS)
        sub.subset(font)
        subset.save_font(font, out, opts)
        print(f'{os.path.basename(out)}: {os.path.getsize(src)} → {os.path.getsize(out)} Bytes')
    return 0


if __name__ == '__main__':
    sys.exit(main())
