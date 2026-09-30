#!/usr/bin/env python3
"""Markdown → PDF (A4, WeasyPrint) mit dem Stil der Marketing-Dokumente.
Aufruf: python3 build_pdf.py <datei.md> [weitere.md …]  → gleichnamige .pdf daneben."""
import os, sys
import markdown
from weasyprint import HTML
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'marketing'))
from build_marketing import CSS  # gleiche Schriften/Farben wie die Marketing-PDFs

for src in sys.argv[1:]:
    md = open(src, encoding='utf-8').read()
    body = markdown.markdown(md, extensions=['tables', 'fenced_code'])
    html = f'<!doctype html><html lang="de"><head><meta charset="utf-8"><style>{CSS}</style></head><body>{body}</body></html>'
    out = os.path.splitext(src)[0] + '.pdf'
    HTML(string=html, base_url=os.path.dirname(os.path.abspath(src))).write_pdf(out)
    print('ok', out)
