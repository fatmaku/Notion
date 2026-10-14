#!/usr/bin/env python3
"""Manuskript (DOCX) → Übersetzungs-JSON.

Aufruf: python3 tools/i18n_export.py --book BY --docx src/YOLCU_TR_v5.docx --out i18n/BY_source.json

Ausgabe:
  units    – Abschnitte je 'Heading 1' (U00 = Titelblock/Vorspann), mit Absatz-IDs und Wortzahl
  batches  – Übersetzungspakete (aufeinanderfolgende Units, ≤ MAX_WORDS, Unit nie geteilt)
  paras    – jeder Absatz: pid, style, text (mit <b>/<i>), keep (nicht übersetzen: leer, Bild,
             Szenenwechsel, „14.53 ↺“, Autorname), constraint (Akrostichon-Position),
             fixed (feste Sätze, die der Absatz enthält)
  ciphers  – BY: Positionen der drei Akrosticha; SA: Absatzbereich des Fettbuchstaben-Codes
"""
import argparse, json, re, sys
from pathlib import Path
from docx import Document

sys.path.insert(0, str(Path(__file__).resolve().parent))
from i18n_common import MARK, KNOT, fixed_for, runs_to_markup  # noqa: E402

MAX_WORDS = 2600


def nonempty_after(ps, i):
    for j in range(i + 1, len(ps)):
        if ps[j].text.strip():
            return j
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--book", required=True, choices=["BY", "SA"])
    ap.add_argument("--docx", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    ps = Document(a.docx).paragraphs
    book = a.book

    # Fettbuchstaben-Code (SA): alle fetten Runs zwischen 1. und 2. Heading 1
    cipher_range = None
    if book == "SA":
        h1 = [i for i, p in enumerate(ps) if p.style.name == "Heading 1"]
        cipher_range = [h1[0] + 1, h1[1] - 1]

    paras = []
    for i, p in enumerate(ps):
        st = p.style.name
        is_img = bool(p._element.xpath('.//*[local-name()="blip"]'))
        text = p.text
        in_cipher = cipher_range is not None and cipher_range[0] <= i <= cipher_range[1]
        runs = [(r.text, bool(r.bold) and not in_cipher, bool(r.italic)) for r in p.runs]
        assert "".join(r[0] for r in runs) == text, f"Absatz {i}: Runs ≠ Text"
        markup = runs_to_markup(runs)
        keep = (not text.strip()) or is_img or st in ("Scene Break", "Book Metadata") or text.strip() == MARK
        fixed = [f for f in fixed_for(book) if f in text]
        paras.append({"pid": i, "style": st, "text": markup, "keep": keep, "image": is_img,
                      "constraint": None, "fixed": fixed, "cipher_bold_stripped": in_cipher,
                      "words": len(text.split())})

    ciphers = {}
    if book == "BY":
        # SENİ BUL: Kapitel, deren Vorgängernummer fehlt → erster Buchstabe des Titels
        prev, seq = 0, []
        for i, p in enumerate(ps):
            if p.style.name == "Heading 1":
                m = re.match(r"^(\d+)\.\s+(.+)$", p.text.strip())
                if m:
                    n = int(m.group(1))
                    if n != prev + 1:
                        seq.append(i)
                    prev = n
        ciphers["SENI_BUL"] = {"tr": "SENİ BUL", "pids": seq, "rule": "Kapiteltitel-Anfangsbuchstabe"}
        marks = [nonempty_after(ps, i) for i, p in enumerate(ps) if p.text.strip() == MARK]
        ciphers["BASA_DON"] = {"tr": "BAŞA DÖN", "pids": marks, "rule": "Anfangsbuchstabe des Absatzes nach „14.53 ↺“"}
        knots = [nonempty_after(ps, i) for i, p in enumerate(ps) if KNOT in p.text]
        ciphers["BENI_ARAMA"] = {"tr": "BENİ ARAMA", "pids": knots, "rule": "Anfangsbuchstabe des Absatzes nach dem Knotensatz"}
        for name, c in ciphers.items():
            for k, pid in enumerate(c["pids"]):
                assert paras[pid]["constraint"] is None, f"Absatz {pid} doppelt belegt"
                paras[pid]["constraint"] = {"group": name, "index": k, "n": len(c["pids"])}
        assert [len(c["pids"]) for c in ciphers.values()] == [7, 7, 9], ciphers
    else:
        letters = "".join(r.text for i in range(cipher_range[0], cipher_range[1] + 1)
                          for r in ps[i].runs if r.bold and r.text.strip())
        ciphers["BISMILLAH"] = {"tr": letters, "tr_norm": re.sub(r"\W", "", letters.lower()),
                                "pids": list(range(cipher_range[0], cipher_range[1] + 1)),
                                "rule": "fette Einzelbuchstaben im ersten Kapitel, in Lesefolge"}

    # Units je Heading 1 (U00 = alles vor dem ersten Heading 1)
    units, cur = [], {"uid": "U00", "title": "(Titelblock)", "pids": [], "words": 0}
    for p in paras:
        if p["style"] == "Heading 1":
            units.append(cur)
            cur = {"uid": f"U{len(units):02d}", "title": p["text"], "pids": [], "words": 0}
        cur["pids"].append(p["pid"])
        cur["words"] += p["words"]
    units.append(cur)
    # Pakete
    batches, b = [], None
    for u in units:
        if b is None or b["words"] + u["words"] > MAX_WORDS:
            b = {"bid": f"B{len(batches):02d}", "units": [], "pids": [], "words": 0}
            batches.append(b)
        b["units"].append(u["uid"]); b["pids"] += u["pids"]; b["words"] += u["words"]
    out = {"book": book, "src_docx": a.docx, "n_paras": len(paras), "units": units, "batches": batches,
           "ciphers": ciphers, "fixed": fixed_for(book), "paras": paras}
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    Path(a.out).write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    n_tr = sum(1 for p in paras if not p["keep"])
    print(f"{a.out}: {len(paras)} Absätze, {n_tr} zu übersetzen, {len(units)} Units, {len(batches)} Pakete "
          f"({', '.join(str(x['words']) for x in batches)} Wörter), ciphers={ {k: len(v['pids']) for k, v in ciphers.items()} }")


if __name__ == "__main__":
    main()
