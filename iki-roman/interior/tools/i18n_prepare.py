#!/usr/bin/env python3
"""Arbeitsdateien der Übersetzungspipeline erzeugen.

  python3 tools/i18n_prepare.py --book BY split         → i18n/BY/batches/B00_src.json … (je Paket Quelltext + Metadaten)
  python3 tools/i18n_prepare.py --book BY bible-input   → i18n/BY_bible_input.md (Material für die Bibel-Verfasser)
  python3 tools/i18n_prepare.py --book BY --lang en context → i18n/BY/ctx_en/B00_ctx.json … (Bibel-Auszug je Paket)
"""
import argparse, collections, json, re, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from i18n_common import strip_tags  # noqa: E402

I18N = Path(__file__).resolve().parent.parent / "i18n"
LABEL_RE = re.compile(r"^([^:\n]{1,40}):")


def label_of(p):
    if p["style"] != "Book Inset":
        return None
    m = LABEL_RE.match(strip_tags(p["text"]))
    return m.group(1) if m and m.group(1).isupper() else None


def load(book):
    return json.load(open(I18N / f"{book}_source.json", encoding="utf-8"))


def split(book):
    exp = load(book)
    paras = {p["pid"]: p for p in exp["paras"]}
    units = {u["uid"]: u for u in exp["units"]}
    out_dir = I18N / book / "batches"; out_dir.mkdir(parents=True, exist_ok=True)
    prev_tail = []
    for b in exp["batches"]:
        ps = []
        for pid in b["pids"]:
            p = paras[pid]
            ps.append({"pid": pid, "style": p["style"], "text": p["text"], "keep": p["keep"],
                       "constraint": p["constraint"], "fixed": p["fixed"], "label": label_of(p)})
        d = {"book": book, "bid": b["bid"], "units": [{"uid": u, "title": units[u]["title"]} for u in b["units"]],
             "words": b["words"], "prev_tail": prev_tail, "paras": ps}
        (out_dir / f"{b['bid']}_src.json").write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding="utf-8")
        tail = [(p["pid"], p["text"]) for p in ps if strip_tags(p["text"]).strip() and p["style"] in ("Normal", "Opening", "Book Inset")]
        prev_tail = [{"pid": a, "text": t} for a, t in tail[-8:]]
    print(f"{book}: {len(exp['batches'])} Pakete → {out_dir}")


REVEAL_KEYS = {"BY": ["ilk harf", "eksik numara", "dönüş işareti", "BENİ ARAMA", "14.53"],
               "SA": ["kalın", "besmele", "âlemlere rahmet", "alemlere rahmet", "koyu basıl", "harfler"]}


def bible_input(book):
    exp = load(book)
    paras = exp["paras"]
    L = [f"# Bibel-Material {book} (automatisch aus dem Manuskript)", ""]
    L += ["## Alle Überschriften (pid · Stil · Text)", ""]
    for p in paras:
        if p["style"] in ("Title", "Heading 1", "Heading 2", "Book Part", "Book Metadata") or (p["style"] == "Opening" and p["pid"] < 40):
            L.append(f"- [{p['pid']}] {p['style']}: {strip_tags(p['text'])}")
    L += ["", "## Sprecherlabels der Einschübe (Book Inset)", ""]
    cnt = collections.Counter(l for p in paras if (l := label_of(p)))
    L += [f"- {k}: {v}×" for k, v in cnt.most_common()]
    L += ["", "## Akrosticha / Code – betroffene Absätze", ""]
    for name, c in exp["ciphers"].items():
        L.append(f"### {name} (tr: {c.get('tr')!r}; Regel: {c['rule']}; {len(c['pids'])} Positionen)")
        if name != "BISMILLAH":
            for p in paras:
                if p["constraint"] and p["constraint"]["group"] == name:
                    L.append(f"- [{p['pid']}] Position {p['constraint']['index'] + 1}: {strip_tags(p['text'])[:200]}")
        else:
            for pid in c["pids"]:
                L.append(f"- [{pid}] {strip_tags(paras[pid]['text'])[:160]}")
        L.append("")
    L += ["## Absätze, die den Code erklären (Stichwortsuche)", ""]
    for p in paras:
        t = strip_tags(p["text"])
        if any(k in t for k in REVEAL_KEYS[book]) and len(t) > 5:
            L.append(f"- [{p['pid']}] {t[:400]}")
    L += ["", "## Feste Sätze (müssen in beiden Büchern wörtlich gleich übersetzt werden) – Fundstellen", ""]
    for f in exp["fixed"]:
        hits = [p for p in paras if f in strip_tags(p["text"])]
        L.append(f"### {f!r} ({len(hits)}×)")
        for p in hits[:4]:
            L.append(f"- [{p['pid']}] {strip_tags(p['text'])[:300]}")
        L.append("")
    L += ["## Häufige Eigennamen / Begriffe (Großschreibung im Satzinneren, ≥ 3×)", ""]
    words = collections.Counter()
    for p in paras:
        t = strip_tags(p["text"])
        for m in re.finditer(r"(?<=[a-zçğıöşü,;:] )([A-ZÇĞİÖŞÜ][\wçğıöşü'’\-]+)", t):
            words[re.sub(r"['’].*$", "", m.group(1))] += 1
    L += [f"- {w}: {n}×" for w, n in words.most_common(220) if n >= 3]
    L += ["", "## Textproben (Stimme): Vorspann, erstes und letztes Kapitel", ""]
    units = exp["units"]
    sample = [u for u in units[:4]] + [units[-1]]
    pmap = {p["pid"]: p for p in paras}
    for u in sample:
        L.append(f"### {u['uid']} {u['title']}")
        for pid in u["pids"]:
            t = strip_tags(pmap[pid]["text"])
            if t.strip():
                L.append(f"[{pid}] ({pmap[pid]['style']}) {t}")
        L.append("")
    (I18N / f"{book}_bible_input.md").write_text("\n".join(L), encoding="utf-8")
    print(f"{I18N / f'{book}_bible_input.md'}: {len(L)} Zeilen")


def context(book, lang):
    exp = load(book)
    bible = json.load(open(I18N / f"{book}_{lang.upper()}_bible.json", encoding="utf-8"))
    syn = {s["uid"]: s for s in bible.get("synopsis", [])}
    units = exp["units"]
    uidx = {u["uid"]: k for k, u in enumerate(units)}
    out_dir = I18N / book / f"ctx_{lang}"; out_dir.mkdir(parents=True, exist_ok=True)
    pmap = {p["pid"]: p for p in exp["paras"]}
    for b in exp["batches"]:
        pids = b["pids"]
        ks = [uidx[u] for u in b["units"]]
        around = [units[k]["uid"] for k in range(max(0, ks[0] - 1), min(len(units), ks[-1] + 2))]
        ctx = {
            "book": book, "lang": lang, "bid": b["bid"],
            "title": bible["title"], "author": bible.get("author", ""),
            "style_guide": bible["style_guide"],
            "labels": bible["labels"], "names": bible.get("names", {}), "glossary": bible["glossary"],
            "fixed": {f: bible["fixed"][f] for pid in pids for f in pmap[pid]["fixed"] if f in bible["fixed"]},
            "constraints": [{"pid": pid, "group": c["group"], "position": c["index"] + 1,
                             "must_start_with": re.sub(r"[^A-Za-zÀ-ÿĀ-žİıŞşĞğ]", "", bible["ciphers"][c["group"]]["solution"]).upper()[c["index"]],
                             "solution": bible["ciphers"][c["group"]]["solution"]}
                            for pid in pids if (c := pmap[pid]["constraint"])],
            "titles": {str(pid): bible["chapter_titles"][str(pid)] for pid in pids if str(pid) in bible["chapter_titles"]},
            "synopsis": [syn[u] for u in around if u in syn],
            "tricky": [t for t in bible.get("tricky", []) if t.get("pid") in pids or t.get("pid") is None],
            "cipher_note": bible["ciphers"].get("BISMILLAH") if book == "SA" else None,
        }
        (out_dir / f"{b['bid']}_ctx.json").write_text(json.dumps(ctx, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{book}/{lang}: {len(exp['batches'])} Kontextdateien → {out_dir}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--book", required=True, choices=["BY", "SA"])
    ap.add_argument("--lang", choices=["en", "de"])
    ap.add_argument("stage", choices=["split", "bible-input", "context"])
    a = ap.parse_args()
    if a.stage == "split":
        split(a.book)
    elif a.stage == "bible-input":
        bible_input(a.book)
    else:
        context(a.book, a.lang)


if __name__ == "__main__":
    main()
