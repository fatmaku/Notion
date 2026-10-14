#!/usr/bin/env python3
"""Prüft eine Übersetzungs-Bibel (i18n/<BOOK>_<LANG>_bible.json) gegen Export und gemeinsame Sätze.

  python3 tools/i18n_bible_check.py --book BY --lang en        (Exit 1 bei Fehlern)
  python3 tools/i18n_bible_check.py --shared en                (prüft nur i18n/shared_en.json)
"""
import argparse, json, re, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from i18n_common import FIXED, strip_tags  # noqa: E402

I18N = Path(__file__).resolve().parent.parent / "i18n"
LABEL_RE = re.compile(r"^([^:\n]{1,40}):")
REQ = ["book", "lang", "title", "author", "style_guide", "labels", "names", "glossary", "fixed", "ciphers", "chapter_titles", "synopsis", "tricky"]


def letters(s):
    return re.sub(r"[^A-Za-zÀ-ÿĀ-žİıŞşĞğ]", "", s).upper()


def check_shared(lang):
    errs = []
    f = I18N / f"shared_{lang}.json"
    if not f.exists():
        return [f"{f} fehlt"]
    try:
        sh = json.load(open(f, encoding="utf-8"))
    except Exception as e:  # noqa: BLE001
        return [f"shared_{lang}.json ungültig: {e}"]
    for k in FIXED["both"]:
        v = sh.get("fixed", {}).get(k)
        if not v or not v.strip():
            errs.append(f"shared: Übersetzung fehlt für {k!r}")
        elif v.strip() == k:
            errs.append(f"shared: unübersetzt: {k!r}")
    if lang == "en" and any("„" in v for v in sh.get("fixed", {}).values()):
        errs.append("shared: deutsche Anführungszeichen im Englischen")
    for k in ("names", "motto", "book_titles"):
        if k not in sh:
            errs.append(f"shared: Feld {k!r} fehlt")
    return errs


def check_bible(book, lang):
    errs, warns = [], []
    exp = json.load(open(I18N / f"{book}_source.json", encoding="utf-8"))
    f = I18N / f"{book}_{lang.upper()}_bible.json"
    if not f.exists():
        return [f"{f} fehlt"], warns
    try:
        b = json.load(open(f, encoding="utf-8"))
    except Exception as e:  # noqa: BLE001
        return [f"Bibel ist kein gültiges JSON: {e}"], warns
    for k in REQ:
        if k not in b:
            errs.append(f"Feld fehlt: {k}")
    if errs:
        return errs, warns
    if b["book"] != book or b["lang"] != lang:
        errs.append("book/lang stimmen nicht")
    if len(b["style_guide"].split()) < 150:
        errs.append("style_guide zu kurz (< 150 Wörter)")
    # gemeinsame Sätze
    sh_errs = check_shared(lang)
    if sh_errs:
        errs += sh_errs
    else:
        sh = json.load(open(I18N / f"shared_{lang}.json", encoding="utf-8"))
        for k in FIXED["both"]:
            if b["fixed"].get(k) != sh["fixed"][k]:
                errs.append(f"fixed[{k!r}] weicht von shared_{lang}.json ab: {b['fixed'].get(k)!r} ≠ {sh['fixed'][k]!r}")
        for n, v in sh.get("names", {}).items():
            if b["names"].get(n, v) != v:
                errs.append(f"names[{n!r}] weicht von shared ab")
    for k in FIXED[book]:
        v = b["fixed"].get(k)
        if not v or not v.strip():
            errs.append(f"fixed: Übersetzung fehlt für {k!r}")
        elif v.strip() == k:
            errs.append(f"fixed: unübersetzt: {k!r}")
    # Akrosticha
    for name, c in exp["ciphers"].items():
        sol = b["ciphers"].get(name, {}).get("solution")
        if not sol:
            errs.append(f"ciphers[{name}].solution fehlt"); continue
        if name == "BISMILLAH":
            if len(re.sub(r"[^a-zà-ÿā-ž]", "", sol.lower())) < 12:
                errs.append("BISMILLAH-Lösung zu kurz")
        else:
            n, got = len(c["pids"]), len(letters(sol))
            if got != n:
                errs.append(f"ciphers[{name}]: Lösung {sol!r} hat {got} Buchstaben, nötig {n}")
    if book == "BY" and "BENİ ARAMA." in b["fixed"] and "BENI_ARAMA" in b["ciphers"]:
        if letters(b["fixed"]["BENİ ARAMA."]) != letters(b["ciphers"]["BENI_ARAMA"]["solution"]):
            errs.append("Schlusszeile fixed['BENİ ARAMA.'] muss die Akrostichon-Lösung BENI_ARAMA sein (gleiche Buchstaben)")
    # Überschriften
    want = [p for p in exp["paras"] if p["style"] in ("Title", "Heading 1", "Heading 2", "Book Part")]
    for p in want:
        t = b["chapter_titles"].get(str(p["pid"]))
        if not t or not t.strip():
            errs.append(f"chapter_titles[{p['pid']}] fehlt ({strip_tags(p['text'])[:40]!r})"); continue
        m = re.match(r"^(\d+)\.\s", strip_tags(p["text"]))
        if m and not t.startswith(m.group(1) + ". "):
            errs.append(f"chapter_titles[{p['pid']}] muss mit {m.group(1)!r}. beginnen: {t!r}")
        c = p["constraint"]
        if c:
            sol = letters(b["ciphers"][c["group"]]["solution"])
            first = re.search(r"[^\W\d_]", re.sub(r"^\d+\.\s*", "", t))
            if sol and first and first.group(0).upper() != sol[c["index"]]:
                errs.append(f"chapter_titles[{p['pid']}] muss mit {sol[c['index']]!r} beginnen (Akrostichon {c['group']}): {t!r}")
    if b["title"] != b["chapter_titles"].get("0"):
        warns.append("title ≠ chapter_titles['0']")
    # Labels
    labels = {m.group(1) for p in exp["paras"] if p["style"] == "Book Inset" and (m := LABEL_RE.match(strip_tags(p["text"]))) and m.group(1).isupper()}
    for l in labels:
        v = b["labels"].get(l)
        if not v:
            errs.append(f"labels[{l!r}] fehlt")
        elif not v.isupper():
            errs.append(f"labels[{l!r}] muss Versalien sein: {v!r}")
    # Glossar, Synopsis
    if len(b["glossary"]) < 40:
        errs.append(f"glossary zu klein ({len(b['glossary'])} Einträge, mindestens 40)")
    for g in b["glossary"]:
        if not g.get("tr") or not g.get("target"):
            errs.append(f"glossary-Eintrag unvollständig: {g}"); break
    uids = {u["uid"] for u in exp["units"]}
    have = {s.get("uid") for s in b["synopsis"]}
    miss = sorted(uids - have)
    if miss:
        errs.append(f"synopsis fehlt für Units: {miss[:10]}")
    return errs, warns


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--book", choices=["BY", "SA"]); ap.add_argument("--lang", choices=["en", "de"])
    ap.add_argument("--shared", choices=["en", "de"])
    a = ap.parse_args()
    if a.shared:
        errs, warns = check_shared(a.shared), []
    else:
        errs, warns = check_bible(a.book, a.lang)
    for w in warns:
        print("WARNUNG", w)
    if errs:
        print("\n".join("FEHLER " + e for e in errs)); print(f"ERGEBNIS: {len(errs)} Fehler"); sys.exit(1)
    print("ERGEBNIS: OK")


if __name__ == "__main__":
    main()
