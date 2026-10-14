"""Silbentrennung je Sprache (weiche Trennzeichen, U+00AD) für das Druck-HTML.

    tr  regelbasiert über tr_hyphen (unverändert, türkische Silbenregeln)
    en  pyphen-Wörterbuch en_GB
    de  pyphen-Wörterbuch de_DE

Für en/de gilt wie im Türkischen: nur Buchstabenfolgen ab 5 Buchstaben werden getrennt
(mindestens 2 Zeichen links, 3 rechts der Trennstelle); Ziffern, Apostrophe und Bindestriche
sind keine Wortbestandteile, d. h. „doesn't“ wird als „doesn“ + „t“ gesehen und nicht am
Apostroph getrennt. Die Wörterbücher werden erst beim ersten Gebrauch geladen, sodass der
türkische Satz nicht von pyphen abhängt.
"""
from __future__ import annotations

import re

from tr_hyphen import SHY, hyphenate_text as _tr_hyphenate_text

WORD_RE = re.compile(r"[^\W\d_]{5,}")      # Unicode-Buchstabenfolgen ab 5 Zeichen
DICTS = {"en": "en_GB", "de": "de_DE"}     # Sprache → pyphen-Wörterbuch
MIN_LEFT, MIN_RIGHT = 2, 3
_LOADED: dict[str, object] = {}


def _dictionary(lang: str):
    if lang not in _LOADED:
        import pyphen
        _LOADED[lang] = pyphen.Pyphen(lang=DICTS[lang], left=MIN_LEFT, right=MIN_RIGHT)
    return _LOADED[lang]


def hyphenate_word(word: str, lang: str) -> str:
    """Fügt weiche Trennzeichen in ein einzelnes Wort ein (nur Buchstaben)."""
    if lang == "tr":
        return _tr_hyphenate_text(word)
    return _dictionary(lang).inserted(word, hyphen=SHY)


def hyphenate_text(text: str, lang: str = "tr") -> str:
    """Setzt weiche Trennzeichen in alle Wörter ab 5 Buchstaben, sprachabhängig."""
    if lang == "tr":
        return _tr_hyphenate_text(text)
    if lang not in DICTS:
        raise ValueError(f"keine Silbentrennung für Sprache {lang!r} (bekannt: tr, {', '.join(DICTS)})")
    d = _dictionary(lang)
    return WORD_RE.sub(lambda m: d.inserted(m.group(0), hyphen=SHY), text)


if __name__ == "__main__":
    samples = {
        "tr": "Hatırlamak psikolojik kontrol İstanbul Leyla'nın çocuklarını",
        "en": "The traveller's extraordinary psychological journey doesn't end in 2026.",
        "de": "Die außergewöhnliche Straßenbahn des Schriftstellers hält nicht an.",
    }
    for lang, s in samples.items():
        print(lang, "->", hyphenate_text(s, lang).replace(SHY, "-"))
