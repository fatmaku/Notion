#!/usr/bin/env python3
"""Übersetzungs-JSON + Quell-DOCX + Bibel → Ziel-DOCX (gleiche Absatzvorlagen, Bilder, Struktur) mit Prüfung.

Aufruf:
  python3 tools/i18n_build.py --export i18n/BY_source.json --trans i18n/work/BY_EN/final.json \
      --bible i18n/BY_EN_bible.json --out src/i18n/YOLCU_EN.docx [--check-only]

trans-JSON: {"paras": {"<pid>": "<Text mit <b>/<i>>", …}} (nur nicht-keep-Absätze; fehlende = Fehler).
Bibel-JSON (Auszug): {"lang": "en", "title": "…", "ciphers": {"SENI_BUL": {"solution": "FIND YOU"}, …},
  "fixed": {"<tr>": "<ziel>", …}}  bzw. SA: {"ciphers": {"BISMILLAH": {"solution": "…"}}}

Prüfungen (Exit 1 bei Fehler): Vollständigkeit, Auszeichnung, Akrosticha (BY) bzw. Fettbuchstaben (SA),
feste Sätze an gleicher Stelle, Title/Metadata, Kapitelzahl, Bilder.
"""
import argparse, copy, json, re, sys
from pathlib import Path
from docx import Document
from docx.oxml.ns import qn

sys.path.insert(0, str(Path(__file__).resolve().parent))
from i18n_common import MARK, first_letter, parse_markup, strip_tags, tags_balanced  # noqa: E402


def letters_of(solution: str) -> str:
    return re.sub(r"[^A-Za-zÀ-ÿĀ-žİıŞşĞğ]", "", solution).upper()


def check_translation(exp, trans, bible):
    """Reine Textprüfung (ohne DOCX). Liefert Liste von Fehlern."""
    errs = []
    paras = {p["pid"]: p for p in exp["paras"]}
    for p in exp["paras"]:
        pid = str(p["pid"])
        if p["keep"]:
            continue
        t = trans.get(pid)
        if t is None:
            errs.append(f"[{pid}] fehlt")
            continue
        if not t.strip():
            errs.append(f"[{pid}] leer")
            continue
        if not tags_balanced(t):
            errs.append(f"[{pid}] Auszeichnung fehlerhaft: {t[:60]!r}")
        for f in p["fixed"]:
            tgt = bible["fixed"].get(f)
            if not tgt:
                errs.append(f"[{pid}] Bibel ohne Übersetzung für festen Satz {f!r}")
            elif tgt not in strip_tags(t):
                errs.append(f"[{pid}] fester Satz fehlt: {f!r} → erwartet {tgt!r}")
        c = p["constraint"]
        if c:
            want = letters_of(bible["ciphers"][c["group"]]["solution"])
            if len(want) != c["n"]:
                errs.append(f"[{pid}] Lösung {c['group']} hat {len(want)} Buchstaben, nötig {c['n']}")
            else:
                got = first_letter(t)
                if got != want[c["index"]]:
                    errs.append(f"[{pid}] Akrostichon {c['group']} Position {c['index'] + 1}: beginnt mit {got!r}, nötig {want[c['index']]!r}")
    if exp["book"] == "SA":
        sol = re.sub(r"[^a-zà-ÿā-ž]", "", bible["ciphers"]["BISMILLAH"]["solution"].lower())
        rng = exp["ciphers"]["BISMILLAH"]["pids"]
        text = "".join(strip_tags(trans.get(str(pid), "")) for pid in rng if not paras[pid]["keep"]).lower()
        if not is_subsequence(sol, text):
            errs.append("Fettbuchstaben-Lösung ist keine Teilfolge des ersten Kapitels")
    return errs


def is_subsequence(sol, text):
    k = 0
    for ch in text:
        if k < len(sol) and ch == sol[k]:
            k += 1
    return k == len(sol)


def choose_cipher_positions(sol, para_texts):
    """Wählt für jeden Lösungsbuchstaben eine Position (para_index, char_index), gleichmäßig verteilt."""
    flat = [(pi, ci, ch.lower()) for pi, t in enumerate(para_texts) for ci, ch in enumerate(t)]
    n_alpha = sum(1 for _, _, ch in flat if ch.isalpha())
    spacing = max(1, n_alpha // max(1, len(sol)))
    for gap in (int(spacing * 0.6), int(spacing * 0.3), 0):
        pos, k, last = [], 0, -10**9
        for idx, (pi, ci, ch) in enumerate(flat):
            if k < len(sol) and ch == sol[k] and idx - last >= gap:
                pos.append((pi, ci)); last = idx; k += 1
        if k == len(sol):
            return pos
    return None


def set_runs(p, runs, rpr_template):
    for r in list(p.runs):
        r._element.getparent().remove(r._element)
    for text, b, i in runs:
        run = p.add_run()
        if rpr_template is not None:
            run._element.insert(0, copy.deepcopy(rpr_template))
        run.text = text
        run.bold = True if b else None
        run.italic = True if i else None


def rpr_of(p):
    for r in p.runs:
        rpr = r._element.find(qn("w:rPr"))
        if rpr is not None:
            t = copy.deepcopy(rpr)
            for tag in ("w:b", "w:bCs", "w:i", "w:iCs"):
                for el in t.findall(qn(tag)):
                    t.remove(el)
            return t
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--export", required=True); ap.add_argument("--trans", required=True)
    ap.add_argument("--bible", required=True); ap.add_argument("--out")
    ap.add_argument("--check-only", action="store_true")
    a = ap.parse_args()
    exp = json.load(open(a.export)); bible = json.load(open(a.bible))
    trans = json.load(open(a.trans))["paras"]
    errs = check_translation(exp, trans, bible)
    if errs:
        print("\n".join(errs[:80])); print(f"FEHLER: {len(errs)} Prüfungen fehlgeschlagen"); sys.exit(1)
    print("Textprüfung ok")
    if a.check_only:
        return
    src = exp["src_docx"]
    doc = Document(src)
    ps = doc.paragraphs
    assert len(ps) == exp["n_paras"], "Quell-DOCX passt nicht zum Export"
    paras = {p["pid"]: p for p in exp["paras"]}
    # SA: Fettbuchstaben vorbereiten
    bold_pos = {}
    if exp["book"] == "SA":
        rng = [pid for pid in exp["ciphers"]["BISMILLAH"]["pids"] if not paras[pid]["keep"]]
        sol = re.sub(r"[^a-zà-ÿā-ž]", "", bible["ciphers"]["BISMILLAH"]["solution"].lower())
        texts = [strip_tags(trans[str(pid)]) for pid in rng]
        pos = choose_cipher_positions(sol, texts)
        if pos is None:
            print("FEHLER: Fettbuchstaben nicht platzierbar"); sys.exit(1)
        for pi, ci in pos:
            bold_pos.setdefault(rng[pi], set()).add(ci)
    for pid, p in paras.items():
        if p["keep"]:
            continue
        runs = parse_markup(trans[str(pid)])
        if pid in bold_pos:
            chars = [(ch, b, i) for t, b, i in runs for ch in t]
            chars = [(ch, b or (k in bold_pos[pid]), i) for k, (ch, b, i) in enumerate(chars)]
            runs = []
            for ch, b, i in chars:
                if runs and runs[-1][1:] == (b, i):
                    runs[-1] = (runs[-1][0] + ch, b, i)
                else:
                    runs.append((ch, b, i))
        set_runs(ps[pid], runs, rpr_of(ps[pid]))
    # Dokumenteigenschaften
    doc.core_properties.title = bible.get("title", "")
    doc.core_properties.language = bible.get("lang", "")
    Path(a.out).parent.mkdir(parents=True, exist_ok=True)
    doc.save(a.out)
    # Nachprüfung am gebauten DOCX
    ps2 = Document(a.out).paragraphs
    assert len(ps2) == len(ps)
    bad = [i for i, (x, y) in enumerate(zip(ps, ps2)) if x.style.name != y.style.name]
    assert not bad, f"Stil geändert bei {bad[:5]}"
    for pid, p in paras.items():
        if p["keep"]:
            assert ps2[pid].text == ps[pid].text, f"keep-Absatz {pid} verändert"
        else:
            assert ps2[pid].text == strip_tags(trans[str(pid)]), f"Absatz {pid}: Text ≠ Übersetzung"
    if exp["book"] == "SA":
        got = "".join(r.text for pid in exp["ciphers"]["BISMILLAH"]["pids"] for r in ps2[pid].runs if r.bold and r.text.strip())
        want = re.sub(r"[^a-zà-ÿā-ž]", "", bible["ciphers"]["BISMILLAH"]["solution"].lower())
        assert re.sub(r"\W", "", got.lower()) == want, f"Fettbuchstaben: {got!r}"
        print(f"Fettbuchstaben gesetzt: {got!r}")
    n_img = sum(1 for p in ps2 if p._element.xpath('.//*[local-name()="blip"]'))
    n_h1 = sum(1 for p in ps2 if p.style.name == "Heading 1")
    words = sum(len(p.text.split()) for p in ps2)
    print(f"{a.out}: {len(ps2)} Absätze, {n_h1} Heading 1, {n_img} Bilder, {words} Wörter – OK")


if __name__ == "__main__":
    main()
