#!/usr/bin/env python3
"""Wörter je Kapitel (Heading 1) zweier DOCX-Fassungen vergleichen.
Aufruf: python3 tools/wordcount.py ALT.docx NEU.docx [--from PID --to PID]"""
import sys
from docx import Document
def per_chapter(path):
    rows, cur = [], ["(Vorspann)", 0]
    for p in Document(path).paragraphs:
        if p.style.name == "Heading 1":
            rows.append(cur); cur = [p.text.strip(), 0]
        else:
            cur[1] += len(p.text.split())
    rows.append(cur)
    return rows
a, b = per_chapter(sys.argv[1]), per_chapter(sys.argv[2])
da = dict(a)
ta = tb = 0
for name, w in b:
    w0 = da.get(name, 0)
    if w0 != w:
        print(f"{name[:45]:45s} {w0:6d} → {w:6d}  ({w - w0:+d}, {100 * (w - w0) / max(w0, 1):+.0f}%)")
    ta += w0; tb += w
print(f"{'GESAMT':45s} {sum(x[1] for x in a):6d} → {tb:6d}  ({tb - sum(x[1] for x in a):+d})")
