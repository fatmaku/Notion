#!/usr/bin/env python3
"""check_pdf.py — Prüfung der Druck-PDFs (A5, KDP).

Geprüft wird je PDF:
  * Seitengröße 148 × 210 mm (±0.2 mm) auf jeder Seite
  * Seitenzahl
  * alle Schriften eingebettet (FontFile/FontFile2/FontFile3 oder Type3)
  * kein Textzeichen im Satzspiegel-Rand (innen 20 mm, außen 15.5 mm, oben/unten 16.5 mm);
    erlaubte Ausnahme: Kolumnentitel/Pagina, d. h. Zeichen, deren Box vollständig im oberen
    oder unteren 16.5-mm-Band liegt UND mindestens 8 mm vom Beschnitt entfernt ist.

Aufruf:  python3 check_pdf.py out/A.pdf [out/B.pdf ...] [--json out/check.json]
Exit-Code 0 = alles bestanden, 1 = mindestens eine Prüfung fehlgeschlagen.
"""
from __future__ import annotations

import argparse
import json
import statistics
import sys
from collections import defaultdict

import pdfplumber
from pypdf import PdfReader

MM = 72 / 25.4  # Punkt je Millimeter

PAGE_W_MM, PAGE_H_MM = 148.0, 210.0
M_INNER, M_OUTER, M_TOP, M_BOTTOM = 20.0, 15.5, 16.5, 16.5
SAFE_FROM_TRIM = 8.0        # Kolumnentitel/Pagina: Mindestabstand zum Beschnitt
SIZE_TOL_MM = 0.2
GLYPH_TOL_MM = 0.35         # Toleranz für Glyphen-Boxen (Ober-/Unterlängen, Kursiv-Überhang)


def check_page_sizes(reader: PdfReader) -> tuple[bool, list[str]]:
    problems = []
    for i, page in enumerate(reader.pages, 1):
        box = page.mediabox
        w = float(box.width) / MM
        h = float(box.height) / MM
        if abs(w - PAGE_W_MM) > SIZE_TOL_MM or abs(h - PAGE_H_MM) > SIZE_TOL_MM:
            problems.append(f"Seite {i}: {w:.2f} × {h:.2f} mm")
    return not problems, problems


def _font_embedded(font) -> bool:
    font = font.get_object()
    subtype = str(font.get("/Subtype", ""))
    if subtype == "/Type3":
        return True
    if subtype == "/Type0":
        desc_fonts = font.get("/DescendantFonts")
        if not desc_fonts:
            return False
        return all(_font_embedded(df) for df in desc_fonts)
    fd = font.get("/FontDescriptor")
    if fd is None:
        return False
    fd = fd.get_object()
    return any(k in fd for k in ("/FontFile", "/FontFile2", "/FontFile3"))


def check_fonts(reader: PdfReader) -> tuple[bool, dict[str, bool]]:
    """Liefert {Schriftname: eingebettet?} über alle Seiten."""
    fonts: dict[str, bool] = {}
    for page in reader.pages:
        res = page.get("/Resources")
        if res is None:
            continue
        res = res.get_object()
        fdict = res.get("/Font")
        if fdict is None:
            continue
        for _, ref in fdict.get_object().items():
            f = ref.get_object()
            name = str(f.get("/BaseFont", "?"))
            fonts[name] = fonts.get(name, True) and _font_embedded(f)
    return all(fonts.values()) and bool(fonts), fonts


def _allowed_in_band(x0, x1, top, bottom) -> bool:
    """Kolumnentitel/Pagina: ganz im oberen oder unteren Band, ≥ 8 mm vom Beschnitt."""
    in_top = bottom <= M_TOP + GLYPH_TOL_MM
    in_bottom = top >= PAGE_H_MM - M_BOTTOM - GLYPH_TOL_MM
    if not (in_top or in_bottom):
        return False
    return (x0 >= SAFE_FROM_TRIM and x1 <= PAGE_W_MM - SAFE_FROM_TRIM
            and top >= SAFE_FROM_TRIM and bottom <= PAGE_H_MM - SAFE_FROM_TRIM)


def check_margins(pdf_path: str) -> tuple[bool, list[str], dict]:
    """Prüft alle Zeichen gegen den Satzspiegel; ungerade Seiten = recto (Innensteg links)."""
    problems = []
    worst = {"inside": 0.0, "outside": 0.0, "top": 0.0, "bottom": 0.0}
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages, 1):
            recto = (i % 2 == 1)
            left = M_INNER if recto else M_OUTER
            right = PAGE_W_MM - (M_OUTER if recto else M_INNER)
            bad = 0
            example = None
            for ch in page.chars:
                if not ch.get("text", "").strip():
                    continue
                x0, x1 = ch["x0"] / MM, ch["x1"] / MM
                top, bottom = ch["top"] / MM, ch["bottom"] / MM
                inside_type_area = (x0 >= left - GLYPH_TOL_MM and x1 <= right + GLYPH_TOL_MM
                                    and top >= M_TOP - GLYPH_TOL_MM
                                    and bottom <= PAGE_H_MM - M_BOTTOM + GLYPH_TOL_MM)
                if inside_type_area:
                    continue
                if _allowed_in_band(x0, x1, top, bottom):
                    continue
                bad += 1
                # Überschreitung protokollieren
                worst["inside" if recto else "outside"] = max(worst["inside" if recto else "outside"], left - x0)
                worst["outside" if recto else "inside"] = max(worst["outside" if recto else "inside"], x1 - right)
                worst["top"] = max(worst["top"], M_TOP - top)
                worst["bottom"] = max(worst["bottom"], bottom - (PAGE_H_MM - M_BOTTOM))
                if example is None:
                    example = f"'{ch['text']}' x={x0:.1f}–{x1:.1f} y={top:.1f}–{bottom:.1f} mm"
            if bad:
                problems.append(f"Seite {i}: {bad} Zeichen außerhalb des Satzspiegels, z. B. {example}")
    return not problems, problems, worst


def page_stats(pdf_path: str, page_numbers: list[int], body_size_pt: float = 10.5) -> dict:
    """Typische Zeilen je Seite und Zeichen je Zeile (Median über die angegebenen Seiten)."""
    lines_per_page, chars_per_line = [], []
    with pdfplumber.open(pdf_path) as pdf:
        for n in page_numbers:
            if n < 1 or n > len(pdf.pages):
                continue
            page = pdf.pages[n - 1]
            rows = defaultdict(list)
            for ch in page.chars:
                if abs(ch.get("size", 0) - body_size_pt) > 0.6:
                    continue
                if ch["top"] / MM < M_TOP - 1 or ch["bottom"] / MM > PAGE_H_MM - M_BOTTOM + 1:
                    continue
                rows[round(ch["bottom"], 0)].append(ch)
            lines = [r for r in rows.values() if len(r) >= 10]
            if not lines:
                continue
            lines_per_page.append(len(lines))
            widths = [(max(c["x1"] for c in r) - min(c["x0"] for c in r)) / MM for r in lines]
            full = [len(r) for r, w in zip(lines, widths) if w >= 0.9 * (PAGE_W_MM - M_INNER - M_OUTER)]
            chars_per_line.extend(full)
    return {
        "lines_per_page_typical": int(statistics.median(lines_per_page)) if lines_per_page else None,
        "chars_per_line_typical": int(statistics.median(chars_per_line)) if chars_per_line else None,
    }


def check_pdf(pdf_path: str, verbose: bool = True) -> dict:
    reader = PdfReader(pdf_path)
    n_pages = len(reader.pages)
    size_ok, size_problems = check_page_sizes(reader)
    fonts_ok, fonts = check_fonts(reader)
    margins_ok, margin_problems, worst = check_margins(pdf_path)
    result = {
        "pdf": pdf_path,
        "pages": n_pages,
        "page_size_check": "pass" if size_ok else "fail",
        "fonts_embedded_check": "pass" if fonts_ok else "fail",
        "fonts": fonts,
        "margin_check": "pass" if margins_ok else "fail",
        "margin_problems": margin_problems[:20],
        "margin_worst_overshoot_mm": {k: round(v, 2) for k, v in worst.items()},
        "ok": size_ok and fonts_ok and margins_ok,
    }
    if verbose:
        print(f"== {pdf_path}")
        print(f"   Seiten: {n_pages}")
        print(f"   Seitengröße 148×210 mm: {'OK' if size_ok else 'FEHLER'}")
        for p in size_problems[:10]:
            print("     -", p)
        print(f"   Schriften eingebettet: {'OK' if fonts_ok else 'FEHLER'}")
        for name, emb in sorted(fonts.items()):
            print(f"     - {name}: {'eingebettet' if emb else 'NICHT eingebettet'}")
        print(f"   Satzspiegel/Ränder: {'OK' if margins_ok else 'FEHLER'}")
        for p in margin_problems[:10]:
            print("     -", p)
        if len(margin_problems) > 10:
            print(f"     … und {len(margin_problems) - 10} weitere Seiten")
    return result


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pdfs", nargs="+", help="zu prüfende PDF-Dateien")
    ap.add_argument("--json", help="Ergebnis zusätzlich als JSON speichern")
    args = ap.parse_args(argv)
    results = [check_pdf(p) for p in args.pdfs]
    if args.json:
        with open(args.json, "w", encoding="utf-8") as fh:
            json.dump(results, fh, ensure_ascii=False, indent=2)
    ok = all(r["ok"] for r in results)
    print("GESAMT:", "bestanden" if ok else "FEHLGESCHLAGEN")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
