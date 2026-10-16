#!/usr/bin/env python3
"""BEN YOKSAM – Lesefassung für Ganzbuchprüfungen (aus benyoksam/work/U*.json).

  python3 tools/byk_reading.py [--chunks 5]
→ benyoksam/reading/chunk_<n>.txt (Zeilen „[uid:index] Text“), full.txt, index.json
"""
import argparse, json, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from i18n_common import strip_tags  # noqa: E402

B = Path(__file__).resolve().parent.parent / "benyoksam"


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--chunks", type=int, default=5)
    a = ap.parse_args()
    cons = json.load(open(B / "constraints.json", encoding="utf-8"))
    out = B / "reading"; out.mkdir(exist_ok=True)
    units = []
    merged = B / "BEN_YOKSAM_units.json"      # von byk_check.py --all: Kapitel + Zwischenkapitel (uid IL1…IL6)
    if merged.exists():
        allp = json.load(open(merged, encoding="utf-8"))["paras"]
        order = []
        for p in allp:
            if not order or order[-1] != p["uid"]:
                order.append(p["uid"])
        groups = [(uid, [p for p in allp if p["uid"] == uid]) for uid in order]
    else:
        groups = [(uid, json.load(open(B / "work" / f"{uid}.json", encoding="utf-8"))["paras"]) for uid in cons]
    for uid, paras in groups:
        w = {"paras": paras}
        lines, words = [], 0
        for k, p in enumerate(w["paras"]):
            if p.get("image"):
                lines.append(f"[{uid}:{k}] ⟨resim {p['image']}⟩"); continue
            t = strip_tags(p.get("text", ""))
            words += len(t.split())
            tag = {"Heading 1": "# ", "Heading 2": "## ", "Book Part": "=== ", "Title": "TITLE: ", "Book Inset": "    | ", "Book Metadata": "YAZAR: ",
                   "Interlude Title": "~~~ ARA BÖLÜM (Tuncay'ın metni, değiştirilmez): ", "Interlude Heading": "~~ ", "Interlude": "~ ",
                   "Interlude Subtitle": "~ ", "Interlude Lead": "~ "}.get(p.get("style"), "")
            if t.strip():
                lines.append(f"[{uid}:{k}] {tag}{t}")
        units.append((uid, lines, words))
    total = sum(w for _, _, w in units); target = total / a.chunks
    chunks, cur, acc = [], [], 0
    for u in units:
        cur.append(u); acc += u[2]
        if acc >= target and len(chunks) < a.chunks - 1:
            chunks.append(cur); cur, acc = [], 0
    if cur:
        chunks.append(cur)
    full, index = [], []
    for k, ch in enumerate(chunks, 1):
        lines = [l for u in ch for l in u[1]]
        (out / f"chunk_{k}.txt").write_text("\n".join(lines), encoding="utf-8")
        full += lines
        index.append({"chunk": k, "units": [u[0] for u in ch], "titles": [cons[u[0]]["title"] if u[0] in cons else "ARA BÖLÜM " + u[0] for u in ch], "words": sum(u[2] for u in ch)})
    (out / "full.txt").write_text("\n".join(full), encoding="utf-8")
    (out / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{out}: {len(chunks)} Abschnitte, {total} Wörter")


if __name__ == "__main__":
    main()
