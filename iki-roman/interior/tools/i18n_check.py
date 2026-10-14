#!/usr/bin/env python3
"""Mechanische Prüfung einer Übersetzung (Paket oder ganzes Buch) gegen Export + Bibel.

  python3 tools/i18n_check.py --book BY --lang en --batch B03      prüft i18n/work/BY_EN/B03.json
  python3 tools/i18n_check.py --book BY --lang en --merge          fügt alle Pakete zu final.json zusammen und prüft

Paketdatei: {"paras": {"<pid>": "<Text mit <b>/<i>>", …}}  (alle nicht-keep-Absätze des Pakets)
Exit 0 = OK (Warnungen erlaubt), Exit 1 = Fehler.
"""
import argparse, json, re, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from i18n_common import NAMES_KEEP, first_letter, strip_tags, tags_balanced  # noqa: E402
from i18n_build import check_translation  # noqa: E402

I18N = Path(__file__).resolve().parent.parent / "i18n"
LABEL_RE = re.compile(r"^([^:\n]{1,40}):")
TR_ONLY = re.compile(r"[ğşıĞŞİ]")


def norm(s):
    return re.sub(r"\s+", " ", strip_tags(s)).strip()


def check_batch(exp, bible, bid, trans, lang):
    errs, warns = [], []
    batch = next(b for b in exp["batches"] if b["bid"] == bid)
    pmap = {p["pid"]: p for p in exp["paras"]}
    sub = {"book": exp["book"], "paras": [pmap[pid] for pid in batch["pids"]], "ciphers": exp["ciphers"]}
    if exp["book"] == "SA" and not any(pid in exp["ciphers"]["BISMILLAH"]["pids"] for pid in batch["pids"]):
        sub["book"] = "SA_nocipher"
    errs += [e for e in check_translation({**sub, "book": "BY" if sub["book"] != "SA" else "SA"}, trans, bible)
             if not (sub["book"] == "SA_nocipher" and "Fettbuchstaben" in e)]
    keep_names = set(NAMES_KEEP) | set(bible.get("names", {}).values())
    for pid in batch["pids"]:
        p = pmap[pid]
        if p["keep"]:
            continue
        t = trans.get(str(pid))
        if t is None or not t.strip():
            continue
        src = strip_tags(p["text"]); tgt = strip_tags(t)
        if p["style"] in ("Heading 1", "Heading 2", "Book Part", "Title") and str(pid) in bible["chapter_titles"]:
            if norm(t) != norm(bible["chapter_titles"][str(pid)]):
                errs.append(f"[{pid}] Überschrift weicht von der Bibel ab: {norm(t)!r} ≠ {norm(bible['chapter_titles'][str(pid)])!r}")
        m = LABEL_RE.match(src)
        if p["style"] == "Book Inset" and m and m.group(1).isupper():
            want = bible["labels"].get(m.group(1))
            if not want:
                errs.append(f"[{pid}] Bibel ohne Label für {m.group(1)!r}")
            elif not tgt.startswith(want + ":"):
                errs.append(f"[{pid}] Einschub muss mit {want + ':'!r} beginnen: {tgt[:50]!r}")
            elif not want.isupper():
                errs.append(f"[{pid}] Label muss Versalien sein: {want!r}")
        if "14.53" in src and "14.53" not in tgt:
            errs.append(f"[{pid}] Uhrzeit 14.53 fehlt")
        if "1453" in src and "1453" not in tgt:
            errs.append(f"[{pid}] Zahl 1453 fehlt")
        sw, tw = len(src.split()), len(tgt.split())
        if sw >= 8 and (tw < 0.55 * sw or tw > 1.9 * sw):
            warns.append(f"[{pid}] Längenverhältnis auffällig: {sw} → {tw} Wörter")
        if sw >= 4 and norm(src) == norm(tgt):
            errs.append(f"[{pid}] unübersetzt (Text = Quelle)")
        bad = [w for w in re.findall(r"[\w'’\-]+", tgt) if TR_ONLY.search(w) and not any(w.startswith(n.split()[0]) or n in w for n in keep_names)]
        if bad:
            warns.append(f"[{pid}] türkische Buchstaben außerhalb bekannter Namen: {sorted(set(bad))[:6]}")
        if lang == "en" and re.search(r"[„‚]", tgt):
            warns.append(f"[{pid}] deutsche Anführungszeichen im englischen Text")
        if lang == "de" and re.search(r"[“”]", tgt) and not re.search(r"„", tgt):
            warns.append(f"[{pid}] englische Anführungszeichen im deutschen Text (erwartet „…“)")
    return errs, warns


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--book", required=True, choices=["BY", "SA"]); ap.add_argument("--lang", required=True, choices=["en", "de"])
    ap.add_argument("--batch"); ap.add_argument("--merge", action="store_true")
    a = ap.parse_args()
    exp = json.load(open(I18N / f"{a.book}_source.json", encoding="utf-8"))
    bible = json.load(open(I18N / f"{a.book}_{a.lang.upper()}_bible.json", encoding="utf-8"))
    work = I18N / "work" / f"{a.book}_{a.lang.upper()}"
    if a.batch:
        f = work / f"{a.batch}.json"
        if not f.exists():
            print(f"FEHLER: {f} fehlt"); sys.exit(1)
        try:
            trans = json.load(open(f, encoding="utf-8"))["paras"]
        except Exception as e:  # noqa: BLE001
            print(f"FEHLER: {f} ist kein gültiges JSON mit 'paras': {e}"); sys.exit(1)
        errs, warns = check_batch(exp, bible, a.batch, trans, a.lang)
    else:
        trans, errs, warns = {}, [], []
        for b in exp["batches"]:
            f = work / f"{b['bid']}.json"
            if not f.exists():
                errs.append(f"{b['bid']}: Datei fehlt"); continue
            t = json.load(open(f, encoding="utf-8"))["paras"]
            e, w = check_batch(exp, bible, b["bid"], t, a.lang)
            errs += [f"{b['bid']} {x}" for x in e]; warns += [f"{b['bid']} {x}" for x in w]
            trans.update(t)
        if not errs:
            errs += check_translation(exp, trans, bible)
            (work / "final.json").write_text(json.dumps({"paras": trans}, ensure_ascii=False, indent=1), encoding="utf-8")
            words = sum(len(strip_tags(t).split()) for t in trans.values())
            print(f"final.json: {len(trans)} Absätze, {words} Wörter")
    for w in warns:
        print("WARNUNG", w)
    if errs:
        print("\n".join("FEHLER " + e for e in errs[:60]))
        print(f"ERGEBNIS: {len(errs)} Fehler, {len(warns)} Warnungen"); sys.exit(1)
    print(f"ERGEBNIS: OK ({len(warns)} Warnungen)")


if __name__ == "__main__":
    main()
