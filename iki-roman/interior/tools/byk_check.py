#!/usr/bin/env python3
"""BEN YOKSAM – mechanische Prüfung der Neufassung.

  python3 tools/byk_check.py --unit U05     prüft benyoksam/work/U05.json gegen src/U05.json + constraints + forbidden
  python3 tools/byk_check.py --all          fügt alle Units zusammen (benyoksam/BEN_YOKSAM_units.json) und prüft das ganze Buch:
                                            Akrosticha SENİ BUL / BAŞA DÖN / BENİ ARAMA, Kapitelnummern, Akte, Bilder, Schlusszeile,
                                            verbotene ŞAHİT-Bezüge, alte Namen.
Unit-Datei: {"uid": "U05", "paras": [{"style": "Heading 1", "text": "5. …"}, {"style": "Normal", "text": "…"}, {"image": 1238}, …]}
Exit 0 = OK (Warnungen erlaubt), Exit 1 = Fehler.
"""
import argparse, json, re, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from i18n_common import KNOT, MARK, strip_tags, tags_balanced  # noqa: E402

I = Path(__file__).resolve().parent.parent
BYK = I / "benyoksam"
STYLES = {"Title", "Heading 1", "Heading 2", "Book Part", "Opening", "Normal", "Book Inset", "Scene Break", "Book Metadata"}
INTERLUDE_STYLES = {"Interlude Title", "Interlude Subtitle", "Interlude Lead", "Interlude Heading", "Interlude"}
INTERLUDES = BYK / "interludes.json"     # Tuncays „ÜÇÜNCÜ GÖZ“ als Zwischenkapitel; nur hier, nie in den Unit-Dateien


def interlude_paras(il):
    """Ein Zwischenkapitel aus interludes.json → Absatzliste im Unit-Format."""
    out = [{"style": "Interlude Title", "text": il.get("title") or "ÜÇÜNCÜ GÖZ"}]
    if il.get("subtitle"):
        out.append({"style": "Interlude Subtitle", "text": il["subtitle"]})
    out += [{"style": "Interlude Lead", "text": t} for t in il.get("lead", []) if t.strip()]
    for sec in il["sections"]:
        out.append({"style": "Interlude Heading", "text": sec["heading"]})
        out += [{"style": "Interlude", "text": t} for t in sec["paras"] if t.strip()]
    return out


def insert_interludes(merged, errs, warns, fb):
    """Fügt die Zwischenkapitel an den in interludes.json festgelegten Stellen ein."""
    if not INTERLUDES.exists():
        warns.append("interludes.json fehlt – Buch ohne Zwischenkapitel")
        return merged
    data = json.load(open(INTERLUDES, encoding="utf-8"))
    for il in sorted(data["interludes"], key=lambda x: -x["n"]):     # von hinten, damit Indizes stimmen
        idx = [k for k, p in enumerate(merged) if p.get("uid") == il["after_uid"]]
        if not idx:
            errs.append(f"Zwischenkapitel {il['n']}: Unit {il['after_uid']} fehlt"); continue
        if il.get("insert", "end_of_unit") == "before_book_part":
            bp = [k for k in idx if merged[k].get("style") == "Book Part"]
            if not bp:
                errs.append(f"Zwischenkapitel {il['n']}: {il['after_uid']} hat keine Akt-Überschrift"); continue
            pos = bp[0]
            while pos - 1 in idx and not text_of(merged[pos - 1]).strip() and not merged[pos - 1].get("image"):
                pos -= 1                                                  # vor Leerabsätzen vor der Akt-Seite
        else:
            pos = idx[-1] + 1
            last = merged[idx[-1]]                                         # Anker: letztes Element der Unit muss unverändert sein
            if il.get("after_image"):
                if last.get("image") != il.get("after_pid"):
                    errs.append(f"Zwischenkapitel {il['n']}: letztes Element von {il['after_uid']} muss Bild {il.get('after_pid')} sein "
                                f"(after_pid) – gefunden {last.get('image') or text_of(last)[:50]!r}")
            elif il.get("after_text") is not None:
                if strip_tags(last.get("text", "")).strip() != strip_tags(il["after_text"]).strip():
                    errs.append(f"Zwischenkapitel {il['n']}: letzter Absatz von {il['after_uid']} muss pid {il.get('after_pid')} unverändert sein "
                                f"({strip_tags(il['after_text'])[:50]!r}) – gefunden {text_of(last)[:50]!r}")
        paras = [dict(p, uid=f"IL{il['n']}") for p in interlude_paras(il)]
        w_calc = sum(len(text_of(p).split()) for p in paras if p["style"] != "Interlude Title")
        if il.get("words") is not None and il["words"] != w_calc:
            warns.append(f"Zwischenkapitel {il['n']}: words={il['words']} ≠ gezählt {w_calc}")
        for k, p in enumerate(paras):
            if not tags_balanced(p["text"]):
                errs.append(f"Zwischenkapitel {il['n']} [{k}] Auszeichnung fehlerhaft: {p['text'][:60]!r}")
        for w in check_forbidden(paras, fb, where=f"IL{il['n']}"):
            warns.append("Zwischenkapitel: " + w)
        merged[pos:pos] = paras
    n = len(data["interludes"])
    if n != 6:
        warns.append(f"{n} Zwischenkapitel (geplant 6)")
    return merged
LABEL_RE = re.compile(r"^([^:\n]{1,40}):")
TR_UP = str.maketrans("iı", "İI")
MISSING = [6, 10, 14, 19, 27, 33, 41]


def up(s):
    return s.translate(TR_UP).upper()


def first_letter(t):
    m = re.search(r"[^\W\d_]", strip_tags(t))
    return up(m.group(0)) if m else ""


def text_of(p):
    return strip_tags(p.get("text", "")) if not p.get("image") else ""


def word_re(name):
    return re.compile(r"(?<![\wçğıöşüÇĞİÖŞÜ])" + re.escape(name) + r"(?![\wçğıöşüÇĞİÖŞÜ])")


def forbidden_exempt(fb, uid, s, t):
    """Konsept-İSTİSNA: verbotene Zeichenkette nur in genau diesem Absatz (uid + exakter Text) erlaubt."""
    return any(e.get("uid") == uid and e.get("string") == s and strip_tags(t).strip() == strip_tags(e.get("text", "")).strip()
               for e in fb.get("exceptions", []))


def check_forbidden(paras, fb, where="", uid=None):
    errs = []
    for k, p in enumerate(paras):
        t = text_of(p)
        if not t:
            continue
        for s in fb["strings"]:
            if s in t and not (uid and forbidden_exempt(fb, uid, s, t)):
                errs.append(f"{where}[{k}] verbotener ŞAHİT-Bezug {s!r}: {t[:80]!r}")
        for old, new in fb.get("old_names", {}).items():
            if word_re(old).search(t):
                errs.append(f"{where}[{k}] alter Name {old!r} (jetzt {new!r}): {t[:80]!r}")
    return errs


def check_unit(uid, work, src, cons, fb, plan=None):
    errs, warns = [], []
    paras = work.get("paras")
    if not isinstance(paras, list) or not paras:
        return ["paras fehlt oder leer"], warns
    for k, p in enumerate(paras):
        if p.get("image"):
            continue
        if p.get("style") not in STYLES:
            errs.append(f"[{k}] unbekannter Stil {p.get('style')!r}")
        t = p.get("text", "")
        if not isinstance(t, str):
            errs.append(f"[{k}] text fehlt"); continue
        if not tags_balanced(t):
            errs.append(f"[{k}] Auszeichnung fehlerhaft: {t[:60]!r}")
        if p.get("style") == "Book Inset":
            m = LABEL_RE.match(strip_tags(t))
            if m and not m.group(1).isupper() and m.group(1) != m.group(1).lower():
                warns.append(f"[{k}] Einschub-Label nicht in Versalien: {m.group(1)!r}")
        if "<" in strip_tags(t):
            errs.append(f"[{k}] spitze Klammer im Text: {strip_tags(t)[:60]!r}")
    texts = [text_of(p) for p in paras]
    c = cons[uid]
    # Kapitelüberschrift
    if c["number"] is not None:
        h = next((p for p in paras if p.get("style") == "Heading 1"), None)
        if not h or paras.index(h) != 0:
            errs.append("erste Zeile muss die Kapitelüberschrift (Heading 1) sein")
        else:
            m = re.match(r"^(\d+)\.\s+(.+)$", strip_tags(h["text"]))
            if not m or int(m.group(1)) != c["number"]:
                errs.append(f"Kapitelnummer muss {c['number']} sein: {strip_tags(h['text'])!r}")
            elif c["title_letter"] and first_letter(m.group(2)) != c["title_letter"]:
                errs.append(f"Kapiteltitel muss mit {c['title_letter']!r} beginnen (Akrostichon SENİ BUL): {m.group(2)!r}")
    else:
        n_h1 = sum(1 for p in paras if p.get("style") == "Heading 1")
        src_h1 = sum(1 for p in src["paras"] if p["style"] == "Heading 1")
        if n_h1 != src_h1:
            errs.append(f"Heading-1-Zahl {n_h1} ≠ Quelle {src_h1}")
    # Marken und Knoten
    mark_idx = [k for k, t in enumerate(texts) if t.strip() == MARK]
    knot_idx = [k for k, t in enumerate(texts) if KNOT in t]
    if len(mark_idx) != len(c["marks"]):
        errs.append(f"„14.53 ↺“-Marken: {len(mark_idx)}, nötig {len(c['marks'])}")
    if len(knot_idx) != len(c["knots"]):
        errs.append(f"Knotensätze („{KNOT}“): {len(knot_idx)}, nötig {len(c['knots'])}")

    def after(k):
        for j in range(k + 1, len(texts)):
            if texts[j].strip():
                return texts[j]
        return ""
    for k, L in zip(mark_idx, c["marks"]):
        got = first_letter(after(k))
        if got != L:
            errs.append(f"Absatz nach Marke {k} muss mit {L!r} beginnen (BAŞA DÖN), beginnt mit {got!r}: {after(k)[:60]!r}")
    for k, L in zip(knot_idx, c["knots"]):
        got = first_letter(after(k))
        if got != L:
            errs.append(f"Absatz nach Knotensatz {k} muss mit {L!r} beginnen (BENİ ARAMA), beginnt mit {got!r}: {after(k)[:60]!r}")
    # Bilder, Akte
    imgs = [p.get("image") for p in paras if p.get("image")]
    if imgs != c["images"]:
        errs.append(f"Bilder {imgs} ≠ Quelle {c['images']} (Einträge {{\"image\": pid}} an derselben Stelle)")
    if c["book_part"] and not any(p.get("style") == "Book Part" for p in paras):
        errs.append(f"Akt-Überschrift (Book Part) fehlt: Quelle hat {c['book_part']!r}")
    if not c["book_part"] and any(p.get("style") == "Book Part" for p in paras):
        errs.append("Akt-Überschrift (Book Part), die die Quelle nicht hat")
    # Länge
    words = sum(len(t.split()) for t in texts)
    change = (plan or {}).get("change", "")
    lo, hi = (0.35, 1.8) if change in ("yeniden", "yeni", "çıkar") else (0.6, 1.5)
    if c["words"] >= 150 and not (lo * c["words"] <= words <= hi * c["words"]):
        warns.append(f"Länge {words} Wörter vs. Quelle {c['words']} (Plan: {change or '–'})")
    errs += check_forbidden(paras, fb, uid=uid)
    return errs, warns


def check_all(cons, fb):
    errs, warns, merged = [], [], []
    units = list(cons.keys())
    for uid in units:
        f = BYK / "work" / f"{uid}.json"
        if not f.exists():
            errs.append(f"{uid}: Datei fehlt"); continue
        w = json.load(open(f, encoding="utf-8"))
        src = json.load(open(BYK / "src" / f"{uid}.json", encoding="utf-8"))
        e, wn = check_unit(uid, w, src, cons, fb)
        errs += [f"{uid} {x}" for x in e]; warns += [f"{uid} {x}" for x in wn]
        merged += [dict(p, uid=uid) for p in w["paras"]]
    if errs:
        return errs, warns, merged
    merged = insert_interludes(merged, errs, warns, fb)
    if errs:
        return errs, warns, merged
    il_words = sum(len(text_of(p).split()) for p in merged if p.get("style") in INTERLUDE_STYLES)
    if il_words:
        print(f"Zwischenkapitel: {sum(1 for p in merged if p.get('style') == 'Interlude Title')} Stück, {il_words} Wörter")
    texts = [text_of(p) for p in merged]
    # Titelblock
    title = json.load(open(BYK / "book_meta.json", encoding="utf-8"))["title"]
    if merged[0].get("style") != "Title" or texts[0].strip() != title:
        errs.append(f"erster Absatz muss Title „{title}“ sein: {texts[0]!r}")
    if sum(1 for p in merged if p.get("style") == "Book Metadata") != 1:
        errs.append("genau ein Absatz Book Metadata (Autorname) nötig")
    n_h1 = sum(1 for p in merged if p.get("style") == "Heading 1")
    if n_h1 != 45:
        errs.append(f"Heading 1: {n_h1}, erwartet 45")
    nums = [int(m.group(1)) for p in merged if p.get("style") == "Heading 1" and (m := re.match(r"^(\d+)\.\s", text_of(p)))]
    want = [n for n in range(1, 51) if n not in MISSING]
    if nums != want:
        errs.append(f"Kapitelnummern {nums} ≠ {want}")
    # Akrosticha
    seq, prev = "", 0
    for p in merged:
        if p.get("style") == "Heading 1" and (m := re.match(r"^(\d+)\.\s+(.+)$", text_of(p))):
            n = int(m.group(1))
            if n != prev + 1:
                seq += first_letter(m.group(2))
            prev = n
    if seq != "SENİBUL":
        errs.append(f"Akrostichon SENİ BUL: {seq!r}")

    def after(k):
        for j in range(k + 1, len(texts)):
            if texts[j].strip():
                return texts[j]
        return ""
    s2 = "".join(first_letter(after(k)) for k, t in enumerate(texts) if t.strip() == MARK)
    if s2 != "BAŞADÖN":
        errs.append(f"Akrostichon BAŞA DÖN: {s2!r}")
    s3 = "".join(first_letter(after(k)) for k, t in enumerate(texts) if KNOT in t)
    if s3 != "BENİARAMA":
        errs.append(f"Akrostichon BENİ ARAMA: {s3!r}")
    if sum(1 for p in merged if p.get("style") == "Book Part") != 5:
        errs.append("5 Akte (Book Part) nötig")
    if [p.get("image") for p in merged if p.get("image")] != [3, 35, 1238, 3384]:
        errs.append("Bilder müssen in der Reihenfolge 3, 35, 1238, 3384 stehen")
    last = next((t for t in reversed(texts) if t.strip()), "")
    if last.strip() != "BENİ ARAMA.":
        errs.append(f"letzte Zeile muss „BENİ ARAMA.“ sein: {last!r}")
    words = sum(len(t.split()) for t in texts)
    if not errs:
        (BYK / "BEN_YOKSAM_units.json").write_text(json.dumps({"paras": merged}, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"BEN_YOKSAM_units.json: {len(merged)} Absätze, {words} Wörter, {n_h1} Kapitelüberschriften")
    return errs, warns, merged


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--unit"); ap.add_argument("--all", action="store_true")
    a = ap.parse_args()
    cons = json.load(open(BYK / "constraints.json", encoding="utf-8"))
    fb = json.load(open(BYK / "forbidden.json", encoding="utf-8"))
    if a.unit:
        f = BYK / "work" / f"{a.unit}.json"
        if not f.exists():
            print(f"FEHLER: {f} fehlt"); sys.exit(1)
        try:
            w = json.load(open(f, encoding="utf-8"))
        except Exception as e:  # noqa: BLE001
            print(f"FEHLER: ungültiges JSON: {e}"); sys.exit(1)
        src = json.load(open(BYK / "src" / f"{a.unit}.json", encoding="utf-8"))
        plan = None
        cf = BYK / "ctx" / f"{a.unit}.json"
        if cf.exists():
            plan = json.load(open(cf, encoding="utf-8")).get("plan")
        errs, warns = check_unit(a.unit, w, src, cons, fb, plan)
    else:
        errs, warns, _ = check_all(cons, fb)
    for w in warns:
        print("WARNUNG", w)
    if errs:
        print("\n".join("FEHLER " + e for e in errs[:80])); print(f"ERGEBNIS: {len(errs)} Fehler, {len(warns)} Warnungen"); sys.exit(1)
    print(f"ERGEBNIS: OK ({len(warns)} Warnungen)")


if __name__ == "__main__":
    main()
