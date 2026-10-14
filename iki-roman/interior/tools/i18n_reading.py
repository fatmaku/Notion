#!/usr/bin/env python3
"""Lesefassung einer Übersetzung für Ganzbuch-Prüfungen erzeugen.

  python3 tools/i18n_reading.py --book BY --lang en [--chunks 5]
→ i18n/work/BY_EN/reading/chunk_1.txt … (fortlaufende Units, Absätze mit [pid]), reading/index.json,
  reading/full.txt (ganzes Buch) und reading/batch_of_pid.json (pid → Paket, für Korrekturen).
"""
import argparse, json, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from i18n_common import strip_tags  # noqa: E402

I18N = Path(__file__).resolve().parent.parent / "i18n"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--book", required=True); ap.add_argument("--lang", required=True); ap.add_argument("--chunks", type=int, default=5)
    a = ap.parse_args()
    exp = json.load(open(I18N / f"{a.book}_source.json", encoding="utf-8"))
    work = I18N / "work" / f"{a.book}_{a.lang.upper()}"
    trans = json.load(open(work / "final.json", encoding="utf-8"))["paras"]
    pmap = {p["pid"]: p for p in exp["paras"]}
    out = work / "reading"; out.mkdir(exist_ok=True)
    units = exp["units"]
    total = sum(u["words"] for u in units)
    target = total / a.chunks
    chunks, cur, acc = [], [], 0
    for u in units:
        cur.append(u); acc += u["words"]
        if acc >= target and len(chunks) < a.chunks - 1:
            chunks.append(cur); cur, acc = [], 0
    if cur:
        chunks.append(cur)
    index, full = [], []
    for k, ch in enumerate(chunks, 1):
        lines = []
        for u in ch:
            for pid in u["pids"]:
                p = pmap[pid]
                if p["keep"]:
                    if p["text"].strip():
                        lines.append(f"[{pid}] {p['text']}")
                    continue
                t = trans.get(str(pid), "⟪FEHLT⟫")
                tag = {"Heading 1": "# ", "Heading 2": "## ", "Book Part": "=== ", "Title": "TITLE: ", "Opening": "", "Book Inset": "    | "}.get(p["style"], "")
                lines.append(f"[{pid}] {tag}{t}")
        (out / f"chunk_{k}.txt").write_text("\n".join(lines), encoding="utf-8")
        full += lines
        index.append({"chunk": k, "units": [u["uid"] for u in ch], "titles": [strip_tags(u["title"]) for u in ch], "words": sum(u["words"] for u in ch)})
    (out / "full.txt").write_text("\n".join(full), encoding="utf-8")
    (out / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding="utf-8")
    b_of = {str(pid): b["bid"] for b in exp["batches"] for pid in b["pids"]}
    (out / "batch_of_pid.json").write_text(json.dumps(b_of), encoding="utf-8")
    print(f"{out}: {len(chunks)} Abschnitte, {len(full)} Zeilen")


if __name__ == "__main__":
    main()
