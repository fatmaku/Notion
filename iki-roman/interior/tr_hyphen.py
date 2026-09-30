"""Regelbasierte türkische Silbentrennung (weiche Trennzeichen, U+00AD).

Türkische Silben haben genau einen Vokal. Regeln (Standard-Orthografie):
  1. Ein Konsonant zwischen zwei Vokalen gehört zur folgenden Silbe:   a-ra-ba
  2. Bei zwei Konsonanten zwischen Vokalen wird dazwischen getrennt:    kal-dı
  3. Bei drei Konsonanten gehört nur der letzte zur folgenden Silbe:     kont-rol
  4. Aufeinanderfolgende Vokale werden getrennt (kein Diphthong):        sa-at
  5. Keine einbuchstabigen Silben am Zeilenende/-anfang (a-ile → nicht trennen vor 'i'
     ist erlaubt, aber ein einzelner Buchstabe wird nicht abgetrennt).
Wörter mit Apostroph (Leyla'nın) werden am Apostroph nicht getrennt, aber davor/danach.
"""
import re

VOWELS = set("aeıioöuüâîûAEIİOÖUÜÂÎÛ")
WORD_RE = re.compile(r"[A-Za-zÇĞİÖŞÜçğıöşüÂÎÛâîû]{5,}")
SHY = "­"


def syllables(word: str) -> list[str]:
    """Zerlegt ein Wort in Silben (nur Buchstaben)."""
    if not word:
        return []
    w = word
    n = len(w)
    is_v = [c in VOWELS for c in w]
    if not any(is_v):
        return [w]
    cuts = []  # Indizes, vor denen getrennt wird
    i = 0
    # Finde Vokalpositionen
    vpos = [k for k, v in enumerate(is_v) if v]
    for a, b in zip(vpos, vpos[1:]):
        gap = b - a - 1  # Konsonanten zwischen den Vokalen
        if gap == 0:
            cuts.append(b)              # sa|at
        elif gap == 1:
            cuts.append(a + 1)          # a|ra|ba  -> vor dem Konsonanten
        elif gap == 2:
            cuts.append(a + 2)          # kal|dı
        else:
            cuts.append(b - 1)          # kont|rol : letzter Konsonant zur Folgesilbe
    parts, last = [], 0
    for c in cuts:
        parts.append(w[last:c]); last = c
    parts.append(w[last:])
    return [p for p in parts if p]


def hyphenate_word(word: str, left: int = 2, right: int = 2) -> str:
    """Fügt weiche Trennzeichen ein; mindestens `left` Zeichen vor und `right` nach der Trennung."""
    if "'" in word or "’" in word:
        head, sep, tail = re.split(r"(['’])", word, maxsplit=1) if re.search(r"['’]", word) else (word, "", "")
        return hyphenate_word(head, left, right) + sep + tail
    syl = syllables(word)
    if len(syl) < 2:
        return word
    out, pos = "", 0
    for k, s in enumerate(syl):
        if k > 0:
            before = sum(len(x) for x in syl[:k])
            after = len(word) - before
            if before >= left and after >= right:
                out += SHY
        out += s
    return out


def hyphenate_text(text: str) -> str:
    """Setzt weiche Trennzeichen in alle Wörter ab 5 Buchstaben."""
    return WORD_RE.sub(lambda m: hyphenate_word(m.group(0)), text)


if __name__ == "__main__":
    for w in ["hatırlamak", "psikolojik", "kontrol", "saat", "İstanbul", "Leyla'nın", "elektrik", "sürtünme", "başparmağımı", "uyanış", "çocuklarını", "Meralis'in"]:
        print(w, "->", hyphenate_word(w).replace(SHY, "-"))
