#!/usr/bin/env python3
"""Gemeinsame Definitionen der Übersetzungspipeline (TR → EN/DE).

Inline-Auszeichnung in den JSON-Dateien: <i>…</i> kursiv, <b>…</b> fett (verschachtelbar).
Feste Sätze (FIXED): Brückensätze, Motto, Schlussfragen, Knotensatz, Schlusszeile – ihre
Übersetzung wird einmal in der „Bibel“ festgelegt und in beiden Büchern wörtlich verwendet.
"""
import re

MARK = "14.53 ↺"                                   # Rückkehrzeichen (BY), bleibt unübersetzt
KNOT = "Düğümün iki ucu aynı uzunluktaydı"          # Knotensatz (BY), 9× wörtlich gleich

# Feste Sätze/Wendungen beider Bücher (Schlüssel = türkischer Wortlaut). Die Bibel liefert je
# Sprache die verbindliche Übersetzung; Prüfung: jede Übersetzung muss im Zieltext an derselben
# Stelle (gleicher Absatz) wörtlich vorkommen.
FIXED = {
    "both": [
        "Öleceğimi ilk kez o sabah düşünmedim.",
        "Kapıyı açtım. İçeri girecek adamın adını henüz bilmiyorum.",
        "Okurken hangi elinle tuttuğunu kontrol et.",
        "seni ikinci kez öldürmüş gibi oluruz",
        "Bazen onları ben yazmıyorum gibi geliyor",
        "İnsan hakikati öğrenmez, hatırlar",
        "Metale üç kez vuruluyor, sonra biri su istiyordu",
        "Kırılmış.",
        "siyah paket",
        "kırmızı ip",
        "Tümör",
    ],
    "BY": [
        "Bana verilen hayatla ne yapmıştım?",
        KNOT,
        "BENİ ARAMA.",
    ],
    "SA": [
        "sana verilen bu hayatla ne yapacaksın?",
        "Kapak.",
        "sağ başparmağı bantlı",
        "Kitabın adını yazdım:",
    ],
}

# Eigennamen, die in allen Sprachen unverändert bleiben (Prüfung: dürfen nicht „übersetzt“ werden)
NAMES_KEEP = ["Hakan Hıdıroğlu", "Muhibbi", "Erenköy", "Nehir", "Tarık", "Leyla", "Yusuf", "Cem",
              "Meralis", "Sefa", "Vildan", "Nazım", "Hodri", "Mehmet", "Galip Kaşkaya", "Kadıköy"]

TAG_RE = re.compile(r"</?[bi]>")


def fixed_for(book: str) -> list[str]:
    return FIXED["both"] + FIXED[book]


def strip_tags(s: str) -> str:
    return TAG_RE.sub("", s)


def first_letter(s: str) -> str:
    """Erster Buchstabe eines Absatzes (ohne Auszeichnung, Anführungszeichen, Gedankenstriche)."""
    m = re.search(r"[^\W\d_]", strip_tags(s))
    return m.group(0).upper().replace("I", "I") if m else ""


def tags_balanced(s: str) -> bool:
    """<b>/<i> korrekt geöffnet und geschlossen (Verschachtelung erlaubt, keine Fremdtags)."""
    if re.search(r"<(?!/?[bi]>)", s):
        return False
    stack = []
    for m in re.finditer(r"</?([bi])>", s):
        t = m.group(0)
        if t[1] != "/":
            stack.append(t[1])
        else:
            if not stack or stack[-1] != m.group(1):
                return False
            stack.pop()
    return not stack


def parse_markup(s: str) -> list[tuple[str, bool, bool]]:
    """'<i>a <b>b</b></i> c' → [('a ', False, True), ('b', True, True), (' c', False, False)]."""
    if not tags_balanced(s):
        raise ValueError(f"Auszeichnung fehlerhaft: {s[:80]!r}")
    runs, b, i, pos = [], 0, 0, 0
    for m in re.finditer(r"</?[bi]>", s):
        if m.start() > pos:
            runs.append((s[pos:m.start()], b > 0, i > 0))
        t = m.group(0)
        if t == "<b>":
            b += 1
        elif t == "</b>":
            b -= 1
        elif t == "<i>":
            i += 1
        else:
            i -= 1
        pos = m.end()
    if pos < len(s):
        runs.append((s[pos:], b > 0, i > 0))
    # benachbarte gleiche Runs verschmelzen
    out = []
    for t, bb, ii in runs:
        if out and out[-1][1:] == (bb, ii):
            out[-1] = (out[-1][0] + t, bb, ii)
        else:
            out.append((t, bb, ii))
    return out


def runs_to_markup(runs) -> str:
    """[(text, bold, italic)] → Text mit <b>/<i>; Leerraum an Run-Rändern bleibt außerhalb der Tags."""
    segs = []
    for t, b, i in runs:
        if not t:
            continue
        if not t.strip() and segs:
            segs[-1][0] += t
            continue
        if segs and segs[-1][1] == (b, i):
            segs[-1][0] += t
        else:
            segs.append([t, (b, i)])
    out = []
    for t, (b, i) in segs:
        lead = t[: len(t) - len(t.lstrip())]
        trail = t[len(t.rstrip()):]
        core = t.strip()
        if not core:
            out.append(t)
            continue
        if b:
            core = f"<b>{core}</b>"
        if i:
            core = f"<i>{core}</i>"
        out.append(lead + core + trail)
    return "".join(out)
