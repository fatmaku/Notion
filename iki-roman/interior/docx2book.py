#!/usr/bin/env python3
"""docx2book.py — Manuskript (DOCX) → Druck-PDF (A5, KDP) und Kindle-EPUB.

Aufruf:
    python3 docx2book.py --book BY|SA [--pdf] [--epub] [--cover kapak.jpg] [--out out/] [--preview]

Ablauf:
    DOCX ──parse──▶ Absatzliste (Stil, Runs, Bilder)
         ──build──▶ Buchmodell (Titelblock, Vorwort, Akte, Kapitel, Bildtafeln)
         ──render─▶ (a) Druck-HTML + print.css ──WeasyPrint──▶ PDF (zwei Durchläufe:
                        1. Layout, 2. Seitenzähler-Neustart auf der ersten Werkseite)
                    (b) EPUB-3-Paket mit epub.css ──epubcheck──▶ Bericht

Türkisch: Groß-/Kleinschreibung wird nie per CSS verändert (i→İ, ı→I nur in Python).
Weiche Trennzeichen (tr_hyphen) nur im Druck-HTML, nie im EPUB.
Alle Ausgaben sind deterministisch (feste Zeitstempel im EPUB, uuid5-Kennung).
"""
from __future__ import annotations

import argparse
import datetime as dt
import difflib
import html
import io
import json
import math
import os
import re
import sys
import uuid
import zipfile
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import docx
from docx.oxml.ns import qn
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from tr_hyphen import SHY, hyphenate_text  # noqa: E402

ROOT = HERE.parent
FONT_DIR = ROOT / "fonts"
UPLOADS = Path("/root/.claude/uploads/6549e111-23e7-5e00-8587-d424b5294a16")

# ----------------------------------------------------------------------------
# Buchregister
# ----------------------------------------------------------------------------
BOOKS = {
    "BY": {
        "docx": UPLOADS / "d3456fe2-BEN_YOKSAM_1453_TR.docx",
        "slug": "YOLCU",
        "title": "YOLCU",             # vormals BEN YOKSAM (Titeländerung 01.10.2026)
        "author": "Tuncay Sancak",
        "expected_h1": 45,
        "expected_images": 4,
        "heads_italic": True,      # Kolumnentitel recto kursiv (gemischte Schreibung)
    },
    "SA": {
        "docx": UPLOADS / "883e6864-SAHIDI_ARARKEN_TR.docx",
        "slug": "SAHIT",
        "title": "ŞAHİT",             # vormals ŞAHİDİ ARARKEN
        "author": "Mustafa Sefa Güvenir",
        "expected_h1": 34,
        "expected_images": 0,
        "heads_italic": False,     # Kapiteltitel sind Versalien → gesperrte Kapitälchen-Optik
        "genre": "Roman",
    },
}

PAGE_W, PAGE_H = 148.0, 210.0
M_INNER, M_OUTER, M_TOP, M_BOTTOM = 20.0, 15.5, 16.5, 16.5
TYPE_W = PAGE_W - M_INNER - M_OUTER   # 112.5 mm
TYPE_H = PAGE_H - M_TOP - M_BOTTOM    # 177 mm

ORNAMENT = "•  •  •"


def tr_upper(s: str) -> str:
    """Türkische Versalien: i→İ, ı→I (Python-.upper() allein macht i→I)."""
    return s.replace("i", "İ").replace("ı", "I").upper()


def esc(s: str) -> str:
    return html.escape(s, quote=False)


# ----------------------------------------------------------------------------
# 1. DOCX → Absätze
# ----------------------------------------------------------------------------
@dataclass
class Run:
    text: str
    bold: bool = False
    italic: bool = False


@dataclass
class Para:
    idx: int
    style: str
    runs: list[Run]
    image: Optional[tuple[str, bytes]] = None   # (Dateiendung, Bytes)

    @property
    def text(self) -> str:
        return "".join(r.text for r in self.runs)


def _run_flag(rpr, tag: str) -> bool:
    if rpr is None:
        return False
    el = rpr.find(qn(tag))
    if el is None:
        return False
    val = el.get(qn("w:val"))
    return val not in ("0", "false", "off")


def parse_docx(path: Path) -> list[Para]:
    """Liest alle Absätze in Dokumentreihenfolge (Tabellen → Fehler)."""
    d = docx.Document(str(path))
    body = d.element.body
    paras: list[Para] = []
    for child in body.iterchildren():
        tag = child.tag.split("}")[1]
        if tag == "tbl":
            raise SystemExit("FEHLER: Tabelle im Manuskript gefunden – nicht unterstützt.")
        if tag != "p":
            continue  # sectPr u. ä.
        p = docx.text.paragraph.Paragraph(child, d)
        style = p.style.name if p.style is not None else "Normal"
        runs: list[Run] = []
        for r in child.iter(qn("w:r")):
            rpr = r.find(qn("w:rPr"))
            bold, italic = _run_flag(rpr, "w:b"), _run_flag(rpr, "w:i")
            buf = []
            for el in r:
                t = el.tag.split("}")[1]
                if t == "t":
                    buf.append(el.text or "")
                elif t == "tab":
                    buf.append("\t")
                elif t in ("br", "cr"):
                    buf.append("\n")
                elif t == "noBreakHyphen":
                    buf.append("‑")
                elif t == "softHyphen":
                    buf.append(SHY)
            text = "".join(buf)
            if not text:
                continue
            if runs and runs[-1].bold == bold and runs[-1].italic == italic:
                runs[-1].text += text
            else:
                runs.append(Run(text, bold, italic))
        text = "".join(r.text for r in runs)
        if text != p.text:
            raise SystemExit(f"FEHLER: Run-Text weicht von Absatztext ab (Absatz {len(paras)}).")
        image = None
        blips = child.findall(".//" + qn("a:blip"))
        if blips:
            rid = blips[0].get(qn("r:embed"))
            part = d.part.related_parts[rid]
            ext = part.content_type.split("/")[-1].replace("jpeg", "jpg")
            image = (ext, bytes(part.blob))
        paras.append(Para(len(paras), style, runs, image))
    return paras


# ----------------------------------------------------------------------------
# 2. Absätze → Buchmodell
# ----------------------------------------------------------------------------
@dataclass
class Block:
    kind: str                       # 'p' | 'opening' | 'h2' | 'inset' | 'scenebreak' | 'blank'
    paras: list[Para] = field(default_factory=list)
    noindent: bool = False
    id: str = ""


@dataclass
class Unit:
    kind: str                       # 'preface' | 'chapter' | 'act' | 'plate'
    id: str
    title: str = ""                 # Überschrift wie im Manuskript
    number: str = ""                # Kapitelnummer ('1'), leer wenn keine
    name: str = ""                  # Titel ohne Nummer
    blocks: list[Block] = field(default_factory=list)
    para: Optional[Para] = None     # Überschrift/Bild-Absatz
    act_label: str = ""             # 'BİRİNCİ PERDE'
    act_name: str = ""              # 'KAPI'


@dataclass
class TitleBlock:
    title: str = ""
    subtitle: str = ""
    genre: str = ""
    motto: str = ""
    ornament: str = ""
    author: str = ""
    frontispiece: Optional[Para] = None
    paras: list[Para] = field(default_factory=list)
    dedication: list[Para] = field(default_factory=list)   # Absatzvorlage „Dedication“ (SA)


@dataclass
class Book:
    key: str
    cfg: dict
    front: TitleBlock
    units: list[Unit]
    paras: list[Para]

    @property
    def chapters(self) -> list[Unit]:
        return [u for u in self.units if u.kind == "chapter"]

    @property
    def plates(self) -> list[Unit]:
        return [u for u in self.units if u.kind == "plate"]


CH_NUM_RE = re.compile(r"^(\d+)\.\s+(.+)$")


def build_book(key: str, paras: list[Para]) -> Book:
    cfg = BOOKS[key]
    # --- Titelblock: alles bis einschließlich erstem 'Book Metadata'
    front = TitleBlock()
    i = 0
    while i < len(paras):
        p = paras[i]
        i += 1
        if p.image is not None:
            front.frontispiece = p
            continue
        if not p.text.strip():
            continue
        front.paras.append(p)
        st = p.style
        if st == "Title":
            front.title = p.text.strip()
        elif st == "Heading 1":
            front.subtitle = p.text.strip()
        elif st == "Opening":
            front.genre = p.text.strip()
        elif st == "Book Inset":
            front.motto = p.text.strip()
        elif st == "Scene Break":
            front.ornament = p.text.strip()
        elif st == "Book Metadata":
            front.author = p.text.strip()
            break
        else:
            raise SystemExit(f"FEHLER: unerwarteter Stil im Titelblock: {st!r} ({p.text[:40]!r})")
    if not front.title or not front.author:
        raise SystemExit("FEHLER: Titelblock unvollständig (Title/Book Metadata fehlt).")

    # --- Werkteil
    units: list[Unit] = []
    n_ch = n_act = n_plate = 0
    cur: Optional[Unit] = None
    pending_inset: Optional[Block] = None
    prev_kind = None  # Art des zuletzt gesetzten Blocks (für Einzug)

    def close_inset():
        nonlocal pending_inset
        pending_inset = None

    def new_unit(u: Unit):
        nonlocal cur, prev_kind
        close_inset()
        units.append(u)
        cur = u
        prev_kind = "heading"

    for p in paras[i:]:
        st = p.style
        if st == "Dedication":
            if p.text.strip():
                front.dedication.append(p)
            continue
        if p.image is not None:
            n_plate += 1
            new_unit(Unit("plate", f"plate-{n_plate}", para=p))
            cur = None
            prev_kind = "heading"
            continue
        text = p.text
        if not text.strip():
            if cur is not None and cur.blocks:
                close_inset()
                cur.blocks.append(Block("blank"))
            continue
        if st == "Book Part":
            n_act += 1
            u = Unit("act", f"act-{n_act}", title=text.strip(), para=p)
            if " — " in u.title:
                u.act_label, u.act_name = [s.strip() for s in u.title.split(" — ", 1)]
            else:
                u.act_label, u.act_name = "", u.title
            new_unit(u)
            cur = None
            continue
        if st == "Heading 1":
            n_ch += 1
            u = Unit("chapter", f"ch-{n_ch:02d}", title=text.strip(), para=p)
            m = CH_NUM_RE.match(u.title)
            if m:
                u.number, u.name = m.group(1), m.group(2).strip()
            else:
                u.name = u.title
            new_unit(u)
            continue
        if cur is None:
            # Text vor der ersten Überschrift (SA: Epigraph + Vorwort)
            new_unit(Unit("preface", "preface"))
        if st == "Heading 2":
            close_inset()
            cur.blocks.append(Block("h2", [p], id=f"{cur.id}-s{sum(1 for b in cur.blocks if b.kind == 'h2') + 1}"))
            prev_kind = "heading"
        elif st == "Book Inset":
            if pending_inset is None:
                pending_inset = Block("inset", [], id=f"{cur.id}-i{sum(1 for b in cur.blocks if b.kind == 'inset') + 1}")
                cur.blocks.append(pending_inset)
            pending_inset.paras.append(p)
            prev_kind = "inset"
        elif st == "Scene Break":
            close_inset()
            cur.blocks.append(Block("scenebreak", [p]))
            prev_kind = "scenebreak"
        elif st in ("Normal", "Opening"):
            close_inset()
            noindent = st == "Opening" or prev_kind in ("heading", "inset", "scenebreak")
            cur.blocks.append(Block("opening" if st == "Opening" else "p", [p], noindent=noindent))
            prev_kind = "p"
        else:
            raise SystemExit(f"FEHLER: unbekannter Absatzstil {st!r} (Absatz {p.idx}).")

    # Leerabsätze am Anfang/Ende einer Einheit entfernen
    for u in units:
        while u.blocks and u.blocks[0].kind == "blank":
            u.blocks.pop(0)
        while u.blocks and u.blocks[-1].kind == "blank":
            u.blocks.pop()

    book = Book(key, cfg, front, units, paras)
    # Zählprüfung: alle 'Heading 1'-Absätze des DOCX (inkl. Untertitel im Titelblock, DİKKAT)
    n_h1 = sum(1 for p in paras if p.style == "Heading 1")
    if n_h1 != cfg["expected_h1"]:
        raise SystemExit(f"FEHLER: {n_h1} Absätze 'Heading 1' gefunden, erwartet {cfg['expected_h1']}.")
    n_body = len(book.chapters) + (1 if front.subtitle else 0)
    if n_body != n_h1:
        raise SystemExit(f"FEHLER: {len(book.chapters)} Kapitel im Modell, {n_h1} Heading-1-Absätze im DOCX.")
    n_img = len(book.plates) + (1 if front.frontispiece else 0)
    if n_img != cfg["expected_images"]:
        raise SystemExit(f"FEHLER: {n_img} Bilder gefunden, erwartet {cfg['expected_images']}.")
    return book


# ----------------------------------------------------------------------------
# 3. Selbstprüfung: Textvollständigkeit
# ----------------------------------------------------------------------------
WS_RE = re.compile(r"\s+")


def norm(s: str) -> str:
    return WS_RE.sub("", s.replace(SHY, "").replace(" ", ""))


def docx_text(paras: list[Para]) -> str:
    return "".join(p.text for p in paras)


def model_text(book: Book) -> str:
    """Text des Modells in Manuskriptreihenfolge (ohne Nummern-Splitting)."""
    out = [p.text for p in book.front.paras] + [p.text for p in book.front.dedication]
    for u in book.units:
        if u.kind in ("chapter", "act"):
            out.append(u.title)
        for b in u.blocks:
            out.extend(p.text for p in b.paras)
    return "".join(out)


def expected_body_text(book: Book) -> str:
    """Erwarteter Text des Werkteils, wie er im HTML erscheint (Kapitelnummer ohne Punkt)."""
    out = []
    for u in book.units:
        if u.kind == "chapter":
            out.append((u.number + u.name) if u.number else u.title)
        elif u.kind == "act":
            out.append(u.title)
        for b in u.blocks:
            out.extend(p.text for p in b.paras)
    return "".join(out)


def html_to_text(s: str) -> str:
    s = re.sub(r"<(style|head)[^>]*>.*?</\1>", "", s, flags=re.S)
    s = re.sub(r"<[^>]+>", "", s)
    return html.unescape(s)


def diff_report(expected: str, got: str) -> str:
    a, b = norm(expected), norm(got)
    if a == b:
        return "ok"
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag != "equal":
            return (f"ABWEICHUNG ({tag}) bei Zeichen {i1}: erwartet …{a[max(0, i1 - 30):i2 + 30]}… "
                    f"erhalten …{b[max(0, j1 - 30):j2 + 30]}… (Längen {len(a)} / {len(b)})")
    return "ABWEICHUNG"


# ----------------------------------------------------------------------------
# 4. HTML-Bausteine (gemeinsam für Druck und EPUB)
# ----------------------------------------------------------------------------
LABEL_RE = re.compile(r"^([^:\n]{1,40}):")


def runs_html(runs: list[Run], hyph: bool) -> str:
    """Runs → HTML (<em>/<strong>); im Druck mit weichen Trennzeichen, außer im letzten Wort
    des Absatzes (kein abgetrennter Wortrest als letzte Zeile)."""
    out = []
    for r in runs:
        t = hyphenate_text(r.text) if hyph else r.text
        t = esc(t).replace("\n", "<br/>")
        if r.bold:
            t = f"<strong>{t}</strong>"
        if r.italic:
            t = f"<em>{t}</em>"
        out.append(t)
    s = "".join(out)
    if hyph and SHY in s:
        cut = max(s.rfind(" "), s.rfind(" ")) + 1   # Beginn des letzten Wortes (Tags enthalten keine Leerzeichen)
        s = s[:cut] + s[cut:].replace(SHY, "")
    return s


def split_runs(runs: list[Run], n: int) -> tuple[list[Run], list[Run]]:
    """Teilt eine Run-Liste nach n Zeichen."""
    head, tail, pos = [], [], 0
    for r in runs:
        if pos >= n:
            tail.append(r)
        elif pos + len(r.text) <= n:
            head.append(r)
        else:
            k = n - pos
            head.append(Run(r.text[:k], r.bold, r.italic))
            tail.append(Run(r.text[k:], r.bold, r.italic))
        pos += len(r.text)
    return head, tail


def inset_para_html(p: Para, hyph: bool) -> str:
    """Einschub: Sprecherlabel (Text vor dem ersten Doppelpunkt, nur wenn VERSALIEN) hervorheben."""
    m = LABEL_RE.match(p.text)
    if m and m.group(1).isupper():
        head, tail = split_runs(p.runs, len(m.group(0)))
        label = esc("".join(r.text for r in head))
        return f'<span class="label">{label}</span>{runs_html(tail, hyph)}'
    return runs_html(p.runs, hyph)


def blocks_html(blocks: list[Block], mode: str) -> str:
    hyph = mode == "print"
    inset_tag = "div" if mode == "print" else "aside"
    out = []
    for b in blocks:
        if b.kind == "h2":
            out.append(f'<h2 class="sub" id="{b.id}">{runs_html(b.paras[0].runs, False)}</h2>')
        elif b.kind == "inset":
            inner = "".join(f"<p>{inset_para_html(p, hyph)}</p>" for p in b.paras)
            out.append(f'<{inset_tag} class="inset" id="{b.id}">{inner}</{inset_tag}>')
        elif b.kind == "scenebreak":
            out.append(f'<p class="scenebreak">{esc(b.paras[0].text.strip())}</p>')
        elif b.kind == "blank":
            out.append('<p class="blank"></p>' if mode == "print" else '<p class="blank">&#160;</p>')
        else:
            cls = "opening" if b.kind == "opening" else ("noindent" if b.noindent else "")
            cls_attr = f' class="{cls}"' if cls else ""
            out.append(f"<p{cls_attr}>{runs_html(b.paras[0].runs, hyph)}</p>")
    return "\n".join(out)


def chapter_head_html(u: Unit, book: Book, mode: str = "print") -> str:
    num = f'<p class="ch-num">{esc(u.number)}</p>' if u.number else ""
    attrs = (f' data-head="{esc(u.name)}" data-verso="{esc(tr_upper(book.front.author))}"'
             if mode == "print" else "")
    return f'<header class="ch-head">{num}<h1 class="ch-title"{attrs}>{esc(u.name)}</h1></header>'


def act_html(u: Unit) -> str:
    label = f'<p class="act-label">{esc(u.act_label)}</p><p class="act-dash">—</p>' if u.act_label else ""
    return f'{label}<h1 class="act-title">{esc(u.act_name)}</h1>'


def preface_html(u: Unit, mode: str) -> str:
    """SA: Epigraph (Opening + Quelle) und Vorwortabsätze ohne Überschrift."""
    blocks = list(u.blocks)
    out = []
    if blocks and blocks[0].kind == "opening":
        out.append(f'<p class="epigraph">{runs_html(blocks[0].paras[0].runs, False)}</p>')
        blocks.pop(0)
        if blocks and blocks[0].kind == "p" and len(blocks[0].paras[0].text) < 60:
            out.append(f'<p class="epigraph-source">{runs_html(blocks[0].paras[0].runs, False)}</p>')
            blocks.pop(0)
        if blocks:
            blocks[0].noindent = True
    out.append(f'<div class="preface-body">{blocks_html(blocks, mode)}</div>')
    return "\n".join(out)


def copyright_lines(book: Book) -> list[tuple[str, str]]:
    a = book.front.author
    lines = [("cp-title", book.front.title)]
    if book.front.subtitle:
        lines.append(("cp-subtitle", book.front.subtitle))
    return lines + [
        ("", f"© 2026 {a}. Tüm hakları saklıdır."),
        ("", "Bu kitabın hiçbir bölümü yazarın yazılı izni olmadan çoğaltılamaz."),
        ("cp-gap", "Kapak tasarımı: ____________"),
        ("", "ISBN: ____________ (KDP tarafından atanır)"),
        ("", "Birinci baskı, 2026"),
        ("cp-gap", "Dizgi: Literata & Cinzel (SIL Open Font License)"),
    ]


def dedication_html(book: Book) -> str:
    """Ithaf: erster kurzer Absatz („Bu Kitap:“) als Einleitung, Rest zentriert kursiv."""
    out = []
    for k, p in enumerate(book.front.dedication):
        cls = "ded-lead" if k == 0 and len(p.text) < 30 else "ded"
        out.append(f'<p class="{cls}">{runs_html(p.runs, False)}</p>')
    return "\n".join(out)


def titlepage_html(book: Book) -> str:
    f = book.front
    parts = [f'<p class="tp-title">{esc(f.title)}</p>']
    if f.subtitle:
        parts.append(f'<p class="tp-subtitle">{esc(f.subtitle)}</p>')
    genre = f.genre or book.cfg.get("genre", "")
    if genre:
        parts.append(f'<p class="tp-genre">{esc(genre)}</p>')
    if f.motto:
        parts.append(f'<p class="tp-motto">{esc(f.motto)}</p>')
    parts.append(f'<p class="tp-ornament">{esc(f.ornament or ORNAMENT)}</p>')
    parts.append(f'<p class="tp-author">{esc(f.author)}</p>')
    return "\n".join(parts)


# ----------------------------------------------------------------------------
# 5. Bilder
# ----------------------------------------------------------------------------
def _print_lut() -> list[int]:
    """Graustufen-Kurve für Druck auf cremefarbenem Papier: Schatten leicht anheben, sanfte S-Kurve."""
    lut = []
    for v in range(256):
        t = v / 255.0
        t = 0.045 + 0.955 * t            # Schwarzpunkt anheben (Zulaufen vermeiden)
        t = t ** 0.92                    # Mitteltöne minimal aufhellen
        t = t - 0.035 * math.sin(2 * math.pi * t)   # sanfte S-Kurve (Kontrast)
        lut.append(max(0, min(255, round(t * 255))))
    return lut


def image_for_print(blob: bytes) -> tuple[bytes, tuple[int, int]]:
    im = Image.open(io.BytesIO(blob)).convert("L").point(_print_lut())
    buf = io.BytesIO()
    im.save(buf, "PNG", optimize=True)
    return buf.getvalue(), im.size


def image_for_epub(blob: bytes) -> bytes:
    im = Image.open(io.BytesIO(blob)).convert("RGB")
    w, h = im.size
    if max(w, h) > 1600:
        s = 1600 / max(w, h)
        im = im.resize((round(w * s), round(h * s)), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=85, optimize=True, progressive=False)
    return buf.getvalue()


def plate_geometry(size: tuple[int, int]) -> tuple[float, float, float]:
    """Breite, Höhe, oberer Abstand (mm) für ein Bild, das in den Satzspiegel eingepasst wird."""
    w, h = size
    scale = min(TYPE_W / w, TYPE_H / h)
    pw, ph = w * scale, h * scale
    return round(pw, 2), round(ph, 2), round((TYPE_H - ph) / 2, 2)


def make_temp_cover(book: Book, path: Path) -> None:
    """Einfaches vorläufiges Cover (1600×2560), damit das EPUB validiert."""
    W, H = 1600, 2560
    im = Image.new("RGB", (W, H), (16, 20, 26))
    dr = ImageDraw.Draw(im)
    dr.rectangle([70, 70, W - 70, H - 70], outline=(120, 108, 80), width=3)
    f_title = ImageFont.truetype(str(FONT_DIR / "Cinzel-700.ttf"), 150)
    f_sub = ImageFont.truetype(str(FONT_DIR / "Cinzel-400.ttf"), 58)
    f_auth = ImageFont.truetype(str(FONT_DIR / "Cinzel-400.ttf"), 72)
    f_note = ImageFont.truetype(str(FONT_DIR / "Literata-400.ttf"), 34)

    def wrap(text, font, maxw):
        words, lines, cur = text.split(), [], ""
        for w in words:
            cand = (cur + " " + w).strip()
            if dr.textlength(cand, font=font) <= maxw or not cur:
                cur = cand
            else:
                lines.append(cur)
                cur = w
        lines.append(cur)
        return lines

    y = 760
    for line in wrap(book.front.title, f_title, W - 260):
        tw = dr.textlength(line, font=f_title)
        dr.text(((W - tw) / 2, y), line, font=f_title, fill=(232, 224, 200))
        y += 190
    if book.front.subtitle:
        y += 40
        tw = dr.textlength(book.front.subtitle, font=f_sub)
        dr.text(((W - tw) / 2, y), book.front.subtitle, font=f_sub, fill=(190, 178, 140))
    dr.line([W / 2 - 120, 1900, W / 2 + 120, 1900], fill=(120, 108, 80), width=2)
    tw = dr.textlength(book.front.author, font=f_auth)
    dr.text(((W - tw) / 2, 2000), book.front.author, font=f_auth, fill=(220, 214, 196))
    note = "GEÇİCİ KAPAK"
    tw = dr.textlength(note, font=f_note)
    dr.text(((W - tw) / 2, 2400), note, font=f_note, fill=(110, 110, 110))
    im.save(path, "JPEG", quality=90, optimize=True)


# ----------------------------------------------------------------------------
# 6. Druck-HTML + PDF
# ----------------------------------------------------------------------------
def print_html(book: Book, build_dir: Path, first_body_page: Optional[int],
               tracking: Optional[dict[str, float]] = None) -> str:
    """Druck-HTML. `tracking`: {Kapitel-ID: letter-spacing in em} zur Vermeidung verwaister
    Kapitelenden (1–2 Zeilen allein auf der letzten Seite)."""
    cfg, f = book.cfg, book.front
    css_path = HERE / "print.css"
    img_dir = build_dir / "img_print"
    img_dir.mkdir(parents=True, exist_ok=True)

    def plate_section(p: Para, uid: str, extra_cls: str = "") -> str:
        data, size = image_for_print(p.image[1])
        fn = img_dir / f"{uid}.png"
        if not fn.exists() or fn.read_bytes() != data:
            fn.write_bytes(data)
        w, h, top = plate_geometry(size)
        return (f'<section class="plate {extra_cls}" id="{uid}">'
                f'<img src="{fn.as_uri()}" alt="" style="width:{w}mm;height:{h}mm;margin-top:{top}mm"/></section>')

    # buchspezifische Stilregeln
    head_style = ("font-style: italic; font-size: 8.5pt; letter-spacing: 0;" if cfg["heads_italic"]
                  else "font-style: normal; font-size: 7.5pt; letter-spacing: 0.16em;")
    extra_css = f"@page :right {{ @top-center {{ {head_style} }} }}\n"
    if first_body_page:
        extra_css += f"@page :nth({first_body_page}) {{ counter-reset: page 1; }}\n"
    for uid, em in sorted((tracking or {}).items()):
        if em:
            extra_css += f"#{uid} p {{ letter-spacing: {em:+.3f}em; }}\n"

    out = [f'<!DOCTYPE html>\n<html lang="tr"><head><meta charset="utf-8"/>',
           f"<title>{esc(f.title)}</title>",
           f'<meta name="author" content="{esc(f.author)}"/>',
           f'<meta name="description" content="{esc(f.title)} — {esc(f.author)}. İç sayfa dizgisi, A5."/>',
           f'<meta name="generator" content="docx2book.py"/>',
           f'<link rel="stylesheet" href="{css_path.as_uri()}"/>',
           f"<style>{extra_css}</style></head><body>"]
    # Vorspann
    out.append(f'<section class="page halftitle" id="halftitle"><p class="ht-title">{esc(f.title)}</p></section>')
    if f.frontispiece is not None:
        out.append(plate_section(f.frontispiece, "frontispiece", "frontis"))
    out.append(f'<section class="page titlepage" id="titlepage">{titlepage_html(book)}</section>')
    cp = "".join(f'<p class="{c}">{esc(t)}</p>' if c else f"<p>{esc(t)}</p>" for c, t in copyright_lines(book))
    out.append(f'<section class="page copyright" id="copyright">{cp}</section>')
    if f.dedication:
        out.append(f'<section class="page dedication" id="dedication">{dedication_html(book)}</section>')
    # Inhaltsverzeichnis (Tabelle: Nummernspalte + Titel mit Punktleader und Seitenzahl;
    # ohne Nummernspalte, wenn kein Kapitel nummeriert ist)
    numbered = any(u.number for u in book.chapters)
    ncol = '<td class="n">{}</td>' if numbered else ""
    span = ' colspan="2"' if numbered else ""
    toc = ['<nav class="toc" id="toc"><h1>İÇİNDEKİLER</h1><table>']
    for u in book.units:
        if u.kind == "act":
            toc.append(f'<tr class="toc-act"><td{span}><a href="#{u.id}">{esc(u.title)}</a></td></tr>')
        elif u.kind == "chapter":
            num = ncol.format(f"{esc(u.number)}." if u.number else "")
            toc.append(f'<tr class="toc-ch">{num}<td class="t"><a href="#{u.id}">{esc(u.name)}</a></td></tr>')
            for b in u.blocks:
                if b.kind == "h2":
                    toc.append(f'<tr class="toc-sub">{ncol.format("")}<td class="t"><a href="#{b.id}">{esc(b.paras[0].text.strip())}</a></td></tr>')
    toc.append("</table></nav>")
    out.append("\n".join(toc))
    # Werkteil
    out.append('<div class="body">')
    first = True
    for u in book.units:
        bs = ' data-first="1"' if first else ""
        anchor = '<span id="body-start"></span>' if first else ""
        if u.kind == "preface":
            attrs = f' data-head="{esc(f.title)}" data-verso="{esc(tr_upper(f.author))}"'
            out.append(f'<section class="preface" id="{u.id}"{attrs}{bs}>{anchor}{preface_html(u, "print")}</section>')
        elif u.kind == "act":
            out.append(f'<section class="act" id="{u.id}"{bs}>{anchor}{act_html(u)}</section>')
        elif u.kind == "plate":
            out.append(plate_section(u.para, u.id))
        else:
            out.append(f'<section class="chapter" id="{u.id}"{bs}>{anchor}{chapter_head_html(u, book)}\n'
                       f'{blocks_html(u.blocks, "print")}</section>')
        first = False
    out.append('<span id="end"></span></div></body></html>')
    return "\n".join(out)


def lines_per_page(pdf_bytes: bytes) -> list[int]:
    """Textzeilen je Seite innerhalb des Satzspiegels (ohne Kolumnentitel/Pagina)."""
    import pymupdf
    top, bottom = (M_TOP - 0.5) * 72 / 25.4, (PAGE_H - M_BOTTOM + 0.5) * 72 / 25.4
    counts = []
    d = pymupdf.open(stream=pdf_bytes, filetype="pdf")
    for page in d:
        n = 0
        for block in page.get_text("dict")["blocks"]:
            for line in block.get("lines", []):
                y0, y1 = line["bbox"][1], line["bbox"][3]
                if y0 >= top and y1 <= bottom and any(sp["text"].strip() for sp in line["spans"]):
                    n += 1
        counts.append(n)
    return counts


TRACKING_STEPS = (-0.008, -0.015, 0.010, 0.020)   # em; Reihenfolge der Versuche je Kapitel


def stranded_endings(book: Book, anchors: dict[str, int], counts: list[int], max_lines: int = 2) -> dict[str, int]:
    """Kapitel, deren letzte Seite höchstens `max_lines` Zeilen trägt → {Kapitel-ID: Zeilen}."""
    order = [u for u in book.units if u.kind in ("chapter", "preface")]
    result = {}
    for u in order:
        start = anchors[u.id]
        later = [anchors[v.id] for v in book.units if anchors[v.id] > start]
        last = (min(later) - 1) if later else anchors["end"]
        if last > start and 0 < counts[last - 1] <= max_lines:
            result[u.id] = counts[last - 1]
    return result


def render_pdf(book: Book, out_dir: Path, build_dir: Path) -> dict:
    import logging
    import weasyprint
    logging.getLogger("weasyprint").setLevel(logging.ERROR)
    logging.getLogger("fontTools").setLevel(logging.ERROR)

    def anchors_of(doc) -> dict[str, int]:
        m = {}
        for i, page in enumerate(doc.pages, 1):
            for name in page.anchors:
                m.setdefault(name, i)
        return m

    html_path = build_dir / f"{book.cfg['slug']}_print.html"

    def render(first_body, tracking):
        src = print_html(book, build_dir, first_body, tracking)
        html_path.write_text(src, encoding="utf-8")
        doc = weasyprint.HTML(string=src, base_url=str(html_path)).render()
        return src, doc, anchors_of(doc)

    # Durchlauf 1: Layout ermitteln (erste Werkseite)
    src, doc, anchors = render(None, None)
    first_body = anchors["body-start"]
    # Durchlauf 2 ff.: Seitenzähler-Neustart; verwaiste Kapitelenden per Laufweite korrigieren
    tracking: dict[str, float] = {}
    tried: dict[str, int] = {}
    log = []
    for attempt in range(1 + len(TRACKING_STEPS)):
        src, doc, anchors = render(first_body, tracking)
        if anchors["body-start"] != first_body:
            raise SystemExit("FEHLER: Seitenlayout instabil (body-start).")
        pdf_bytes = doc.write_pdf()
        counts = lines_per_page(pdf_bytes)
        stranded = stranded_endings(book, anchors, counts)
        log.append({"attempt": attempt, "tracking": dict(tracking), "stranded": dict(stranded)})
        if not stranded:
            break
        changed = False
        for uid in stranded:
            k = tried.get(uid, 0)
            if k < len(TRACKING_STEPS):
                tracking[uid] = TRACKING_STEPS[k]
                tried[uid] = k + 1
                changed = True
            else:
                tracking.pop(uid, None)   # keine Stufe hilft → Original-Laufweite behalten
        if not changed:
            break
    # Kapitel, bei denen keine Stufe half, laufen ohne Änderung
    if any(uid in stranded and tried.get(uid, 0) >= len(TRACKING_STEPS) for uid in list(tracking)):
        for uid in list(tracking):
            if uid in stranded:
                tracking.pop(uid)
        src, doc, anchors = render(first_body, tracking)
        pdf_bytes = doc.write_pdf()
        counts = lines_per_page(pdf_bytes)
        stranded = stranded_endings(book, anchors, counts)
    pdf_path = out_dir / f"{book.cfg['slug']}_Innenteil_A5.pdf"
    n_pages = len(doc.pages)
    if n_pages % 2:
        # KDP verlangt intern eine gerade Seitenzahl und hängt sonst selbst eine Leerseite an; dann passt die
        # Rückenbreite des Covers nicht mehr. Deshalb hier eine leere Schlussseite (verso) im gleichen Format.
        import io
        from pypdf import PdfReader, PdfWriter
        rd = PdfReader(io.BytesIO(pdf_bytes)); wr = PdfWriter(clone_from=rd)
        mb = rd.pages[-1].mediabox
        wr.add_blank_page(width=float(mb.width), height=float(mb.height))
        buf = io.BytesIO(); wr.write(buf); pdf_bytes = buf.getvalue()
        n_pages += 1
        counts = list(counts) + [0]          # Leerseite: 0 Zeilen
    pdf_path.write_bytes(pdf_bytes)
    # Textprüfung des Druck-HTML (Werkteil)
    body_part = src.split('<div class="body">', 1)[1]
    text_check = diff_report(expected_body_text(book), html_to_text(body_part))
    pages = {"pdf": str(pdf_path), "pages": n_pages, "first_body_page": first_body, "anchors": anchors,
             "lines_per_page": counts, "tracking": tracking, "tracking_log": log}
    (build_dir / f"{book.cfg['slug']}_pages.json").write_text(json.dumps(pages, ensure_ascii=False, indent=1), encoding="utf-8")
    return {"pdf_path": pdf_path, "pages": n_pages, "first_body_page": first_body,
            "anchors": anchors, "print_html_text_check": text_check,
            "tracking": tracking, "stranded_remaining": stranded, "tracking_log": log,
            "line_counts": counts}


def verify_toc_numbers(pdf_path: Path, book: Book, anchors: dict[str, int], first_body: int) -> str:
    """Vergleicht die im PDF gedruckten IHV-Seitenzahlen mit den tatsächlichen Ankerseiten."""
    import pymupdf
    d = pymupdf.open(str(pdf_path))
    # Zeilen der IHV-Seiten als Wortlisten (nach y-Position gruppiert)
    lines: list[list[str]] = []
    for i in range(anchors["toc"] - 1, first_body - 1):
        rows: dict[int, list[tuple[float, str]]] = {}
        for x0, y0, x1, y1, word, *_ in d[i].get_text("words"):
            rows.setdefault(round(y1), []).append((x0, word))
        for y in sorted(rows):
            lines.append([w for _, w in sorted(rows[y])])
    problems = []
    entries = [(u.id, u.number, u.name if u.number else u.title) for u in book.units if u.kind in ("chapter", "act")]
    entries += [(b.id, "", b.paras[0].text.strip()) for u in book.chapters for b in u.blocks if b.kind == "h2"]
    for uid, number, name in entries:
        expected = anchors[uid] - first_body + 1
        first_words = name.split()[:2]
        found = None
        for k, words in enumerate(lines):
            start = [w for w in words if not (number and w == number + ".")]
            if start[:len(first_words)] == first_words and (not number or (number + ".") in words):
                # Seitenzahl steht am Ende dieser oder einer der folgenden (umbrochenen) Zeilen
                for words2 in lines[k:k + 3]:
                    last = words2[-1].rstrip(".")
                    if last.isdigit():
                        found = int(last)
                        break
                break
        if found != expected:
            problems.append(f"{name} → erwartet {expected}, gefunden {found}")
    return "ok" if not problems else "ABWEICHUNG: " + "; ".join(problems[:5])


# ----------------------------------------------------------------------------
# 7. EPUB
# ----------------------------------------------------------------------------
XHTML_HEAD = ('<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html>\n'
              '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" '
              'xml:lang="tr" lang="tr">\n<head>\n<meta charset="utf-8"/>\n<title>{title}</title>\n'
              '<link rel="stylesheet" type="text/css" href="../epub.css"/>\n</head>\n<body{body_attr}>\n')
XHTML_FOOT = "\n</body>\n</html>\n"


def xhtml(title: str, body: str, epub_type: str = "") -> str:
    attr = f' epub:type="{epub_type}"' if epub_type else ""
    return XHTML_HEAD.format(title=esc(title), body_attr=attr) + body + XHTML_FOOT


def build_epub(book: Book, out_dir: Path, build_dir: Path, cover: Optional[Path]) -> dict:
    cfg, f = book.cfg, book.front
    slug = cfg["slug"]
    src_dir = build_dir / f"{slug}_epub"
    for sub in ("META-INF", "OEBPS/text", "OEBPS/images", "OEBPS/fonts"):
        (src_dir / sub).mkdir(parents=True, exist_ok=True)
    files: list[tuple[str, bytes]] = []   # (Pfad im ZIP, Inhalt)

    # Cover
    cover_path = src_dir / "OEBPS/images/cover.jpg"
    if cover:
        im = Image.open(cover).convert("RGB")
        im.save(cover_path, "JPEG", quality=90, optimize=True)
        cover_source = str(cover)
    else:
        make_temp_cover(book, cover_path)
        cover_source = "geçici (otomatik üretildi)"
    files.append(("OEBPS/images/cover.jpg", cover_path.read_bytes()))
    files.append(("OEBPS/epub.css", (HERE / "epub.css").read_bytes()))
    files.append(("OEBPS/fonts/Cinzel-700.ttf", (FONT_DIR / "Cinzel-700.ttf").read_bytes()))

    manifest = [
        ('nav', 'nav.xhtml', 'application/xhtml+xml', 'nav'),
        ('ncx', 'toc.ncx', 'application/x-dtbncx+xml', ''),
        ('css', 'epub.css', 'text/css', ''),
        ('font-cinzel', 'fonts/Cinzel-700.ttf', 'font/ttf', ''),
        ('cover-image', 'images/cover.jpg', 'image/jpeg', 'cover-image'),
    ]
    spine: list[str] = []          # Manifest-IDs
    nav_entries = []               # (Ebene, Text, href)
    text_files: dict[str, str] = {}

    def add_page(pid: str, fname: str, title: str, body: str, epub_type: str = "", linear: bool = True):
        content = xhtml(title, body, epub_type)
        text_files[fname] = content
        files.append((f"OEBPS/text/{fname}", content.encode("utf-8")))
        manifest.append((pid, f"text/{fname}", "application/xhtml+xml", ""))
        spine.append(pid if linear else pid + "|no")

    def add_image(pid: str, fname: str, blob: bytes):
        files.append((f"OEBPS/images/{fname}", blob))
        manifest.append((pid, f"images/{fname}", "image/jpeg", ""))

    # Vorspann
    add_page("cover", "cover.xhtml", f.title,
             f'<section class="cover" epub:type="cover"><img src="../images/cover.jpg" alt="{esc(f.title)} — kapak"/></section>',
             "frontmatter")
    add_page("titlepage", "titlepage.xhtml", f.title,
             f'<section class="titlepage" epub:type="titlepage">{titlepage_html(book)}</section>', "frontmatter")
    if f.frontispiece is not None:
        add_image("img-frontispiece", "frontispiece.jpg", image_for_epub(f.frontispiece.image[1]))
        add_page("frontispiece", "frontispiece.xhtml", f.title,
                 '<section class="frontispiece"><img src="../images/frontispiece.jpg" alt="İllüstrasyon"/></section>',
                 "frontmatter")
    cp = "".join(f'<p class="{c}">{esc(t)}</p>' if c else f"<p>{esc(t)}</p>" for c, t in copyright_lines(book))
    add_page("copyright", "copyright.xhtml", "Telif", f'<section class="copyright" epub:type="copyright-page">{cp}</section>',
             "frontmatter")
    if f.dedication:
        add_page("dedication", "dedication.xhtml", "İthaf",
                 f'<section class="dedication" epub:type="dedication">{dedication_html(book)}</section>', "frontmatter")

    # Werkteil-Dateien (zuerst erzeugen, damit das HTML-IHV die Dateinamen kennt)
    body_pages = []   # (pid, fname, unit)
    for u in book.units:
        fname = f"{u.id}.xhtml"
        if u.kind == "preface":
            body = f'<section class="preface" id="{u.id}">{preface_html(u, "epub")}</section>'
            title = f.title
        elif u.kind == "act":
            body = f'<section class="act" id="{u.id}" epub:type="part">{act_html(u)}</section>'
            title = u.title
        elif u.kind == "plate":
            add_image(f"img-{u.id}", f"{u.id}.jpg", image_for_epub(u.para.image[1]))
            body = f'<section class="plate" id="{u.id}"><img src="../images/{u.id}.jpg" alt="İllüstrasyon"/></section>'
            title = "İllüstrasyon"
        else:
            body = (f'<section class="chapter" id="{u.id}" epub:type="chapter">{chapter_head_html(u, book, "epub")}\n'
                    f'{blocks_html(u.blocks, "epub")}</section>')
            title = u.title
        body_pages.append((u.id, fname, u, title, body))

    # HTML-Inhaltsverzeichnis
    toc = ['<section class="toc"><h1>İçindekiler</h1>']
    for u in book.units:
        if u.kind == "act":
            toc.append(f'<p class="toc-act"><a href="{u.id}.xhtml">{esc(u.title)}</a></p>')
        elif u.kind == "chapter":
            toc.append(f'<p class="toc-ch"><a href="{u.id}.xhtml">{esc(u.title)}</a></p>')
            for b in u.blocks:
                if b.kind == "h2":
                    toc.append(f'<p class="toc-sub"><a href="{u.id}.xhtml#{b.id}">{esc(b.paras[0].text.strip())}</a></p>')
    toc.append("</section>")
    add_page("toc", "toc.xhtml", "İçindekiler", "\n".join(toc), "frontmatter")

    first_body_file = None
    for pid, fname, u, title, body in body_pages:
        add_page(pid, fname, title, body, "bodymatter")
        if first_body_file is None:
            first_body_file = fname

    # Navigation (nav.xhtml, verschachtelt: Akte → Kapitel → Zwischenüberschriften) und NCX
    def nav_tree():
        tree = []      # Liste von (text, href, children)
        cur_act = None
        for u in book.units:
            if u.kind == "act":
                cur_act = (u.title, f"text/{u.id}.xhtml", [])
                tree.append(cur_act)
            elif u.kind == "chapter":
                subs = [(b.paras[0].text.strip(), f"text/{u.id}.xhtml#{b.id}", []) for b in u.blocks if b.kind == "h2"]
                node = (u.title, f"text/{u.id}.xhtml", subs)
                (cur_act[2] if cur_act else tree).append(node)
        return tree

    def ol(nodes, indent=1):
        pad = "  " * indent
        out = [f"{pad}<ol>"]
        for text, href, children in nodes:
            out.append(f'{pad}  <li><a href="{href}">{esc(text)}</a>')
            if children:
                out.append(ol(children, indent + 2))
            out.append(f"{pad}  </li>")
        out.append(f"{pad}</ol>")
        return "\n".join(out)

    tree = nav_tree()
    nav_body = (f'<nav epub:type="toc" id="toc">\n<h1>İçindekiler</h1>\n{ol(tree)}\n</nav>\n'
                f'<nav epub:type="landmarks" hidden="hidden">\n<ol>\n'
                f'  <li><a epub:type="cover" href="text/cover.xhtml">Kapak</a></li>\n'
                f'  <li><a epub:type="toc" href="text/toc.xhtml">İçindekiler</a></li>\n'
                f'  <li><a epub:type="bodymatter" href="text/{first_body_file}">Başlangıç</a></li>\n'
                f'</ol>\n</nav>')
    nav = xhtml("İçindekiler", nav_body).replace('href="../epub.css"', 'href="epub.css"')
    files.append(("OEBPS/nav.xhtml", nav.encode("utf-8")))

    book_uuid = "urn:uuid:" + str(uuid.uuid5(uuid.NAMESPACE_URL, f"https://kdp.example/{slug}/{f.author}"))
    counter = [0]

    def navpoint(nodes, depth=1):
        out = []
        for text, href, children in nodes:
            counter[0] += 1
            n = counter[0]
            pad = "  " * depth
            out.append(f'{pad}<navPoint id="np-{n}" playOrder="{n}">\n{pad}  <navLabel><text>{esc(text)}</text></navLabel>\n'
                       f'{pad}  <content src="{href}"/>')
            if children:
                out.append(navpoint(children, depth + 1))
            out.append(f"{pad}</navPoint>")
        return "\n".join(out)

    ncx_nodes = [("İçindekiler", "text/toc.xhtml", [])] + tree
    ncx = (f'<?xml version="1.0" encoding="utf-8"?>\n'
           f'<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1" xml:lang="tr">\n<head>\n'
           f'  <meta name="dtb:uid" content="{book_uuid}"/>\n  <meta name="dtb:depth" content="3"/>\n'
           f'  <meta name="dtb:totalPageCount" content="0"/>\n  <meta name="dtb:maxPageNumber" content="0"/>\n</head>\n'
           f'<docTitle><text>{esc(f.title)}</text></docTitle>\n<docAuthor><text>{esc(f.author)}</text></docAuthor>\n'
           f'<navMap>\n{navpoint(ncx_nodes)}\n</navMap>\n</ncx>\n')
    files.append(("OEBPS/toc.ncx", ncx.encode("utf-8")))

    # OPF
    d = docx.Document(str(cfg["docx"]))
    modified = d.core_properties.modified or dt.datetime(2026, 1, 1)
    modified = max(modified.replace(microsecond=0, tzinfo=None), dt.datetime(2026, 1, 1))
    modified = modified.isoformat() + "Z"
    items = []
    for pid, href, mt, prop in manifest:
        prop_attr = f' properties="{prop}"' if prop else ""
        items.append(f'    <item id="{pid}" href="{href}" media-type="{mt}"{prop_attr}/>')
    items = "\n".join(items)
    refs = []
    for s in spine:
        lin = ' linear="no"' if s.endswith("|no") else ""
        refs.append(f'    <itemref idref="{s.split("|")[0]}"{lin}/>')
    refs = "\n".join(refs)
    subtitle = (f'    <dc:title id="subtitle">{esc(f.subtitle)}</dc:title>\n'
                f'    <meta refines="#subtitle" property="title-type">subtitle</meta>\n') if f.subtitle else ""
    opf = (f'<?xml version="1.0" encoding="utf-8"?>\n'
           f'<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="tr">\n'
           f'  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">\n'
           f'    <dc:identifier id="bookid">{book_uuid}</dc:identifier>\n'
           f'    <dc:title id="title">{esc(f.title)}</dc:title>\n'
           f'    <meta refines="#title" property="title-type">main</meta>\n{subtitle}'
           f'    <dc:creator id="creator">{esc(f.author)}</dc:creator>\n'
           f'    <meta refines="#creator" property="role" scheme="marc:relators">aut</meta>\n'
           f'    <dc:language>tr</dc:language>\n'
           f'    <dc:publisher>{esc(f.author)}</dc:publisher>\n'
           f'    <dc:date>2026-01-01</dc:date>\n'
           f'    <meta property="dcterms:modified">{modified}</meta>\n'
           f'    <meta name="cover" content="cover-image"/>\n'
           f'  </metadata>\n  <manifest>\n{items}\n  </manifest>\n'
           f'  <spine toc="ncx">\n{refs}\n  </spine>\n'
           f'  <guide>\n    <reference type="cover" title="Kapak" href="text/cover.xhtml"/>\n'
           f'    <reference type="toc" title="İçindekiler" href="text/toc.xhtml"/>\n'
           f'    <reference type="text" title="Başlangıç" href="text/{first_body_file}"/>\n  </guide>\n'
           f'</package>\n')
    files.append(("OEBPS/content.opf", opf.encode("utf-8")))
    files.append(("META-INF/container.xml", (
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">\n'
        '  <rootfiles>\n    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>\n'
        '  </rootfiles>\n</container>\n').encode("utf-8")))

    # Quellbaum ablegen (zur Ansicht) und ZIP schreiben (mimetype zuerst, unkomprimiert, feste Zeitstempel)
    for rel, data in files:
        fp = src_dir / rel
        fp.parent.mkdir(parents=True, exist_ok=True)
        fp.write_bytes(data)
    epub_path = out_dir / f"{slug}.epub"
    stamp = (1980, 1, 1, 0, 0, 0)
    with zipfile.ZipFile(epub_path, "w") as z:
        zi = zipfile.ZipInfo("mimetype", date_time=stamp)
        zi.compress_type = zipfile.ZIP_STORED
        z.writestr(zi, b"application/epub+zip")
        for rel, data in files:
            zi = zipfile.ZipInfo(rel, date_time=stamp)
            zi.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(zi, data)

    # Textprüfung: Werkteil-Dateien in Spine-Reihenfolge
    body_text = "".join(html_to_text(text_files[fname]) for _, fname, *_ in body_pages)
    text_check = diff_report(expected_body_text(book), body_text)
    shy_found = any(SHY in text_files[fn] for fn in text_files)
    if shy_found:
        raise SystemExit("FEHLER: weiches Trennzeichen im EPUB gefunden.")

    # epubcheck
    from epubcheck import EpubCheck
    chk = EpubCheck(str(epub_path))
    report_lines = [f"epubcheck {chk.checker.checkerVersion} — {epub_path.name}",
                    f"gültig: {chk.valid}   Fehler: {chk.checker.nError}   Warnungen: {chk.checker.nWarning}   fatal: {chk.checker.nFatal}",
                    ""]
    for m in chk.messages:
        report_lines.append(f"{m.level} {m.id}: {m.message} [{m.location}]")
    (out_dir / f"epubcheck_{book.key}.txt").write_text("\n".join(report_lines) + "\n", encoding="utf-8")
    return {"epub_path": epub_path, "epubcheck": {"errors": chk.checker.nError + chk.checker.nFatal,
                                                  "warnings": chk.checker.nWarning, "valid": chk.valid},
            "epub_text_check": text_check, "cover": cover_source}


# ----------------------------------------------------------------------------
# 8. Vorschaubilder
# ----------------------------------------------------------------------------
def make_previews(book: Book, pdf_path: Path, anchors: dict[str, int], n_pages: int, out_dir: Path) -> list[str]:
    import pymupdf
    prev_dir = out_dir / "preview"
    prev_dir.mkdir(parents=True, exist_ok=True)
    for old in prev_dir.glob(f"{book.cfg['slug']}_p*.png"):   # veraltete Vorschauen entfernen
        old.unlink()
    first_body = anchors["body-start"]
    pages: list[int] = [1, anchors["titlepage"], anchors["copyright"]]
    if "dedication" in anchors:
        pages.append(anchors["dedication"])
    if "frontispiece" in anchors:
        pages.append(anchors["frontispiece"])
    pages += list(range(anchors["toc"], first_body))            # IHV-Seite(n) (+ evtl. Leerseite)
    acts = [u for u in book.units if u.kind == "act"]
    if acts:
        pages.append(anchors[acts[0].id])
    chapters = book.chapters
    if "preface" in anchors:
        pages.append(anchors["preface"])
    pages.append(anchors[chapters[0].id])
    if len(chapters) > 1:
        pages.append(anchors[chapters[1].id])

    def spread(p: int) -> list[int]:
        return [p - 1, p] if p % 2 == 1 else [p, p + 1]

    inset_ids = [b.id for u in chapters for b in u.blocks if b.kind == "inset"]
    if inset_ids:
        pages += spread(anchors[inset_ids[0]])
    plates = book.plates
    if plates:
        pages.append(anchors[plates[0].id])
    mid = (first_body + n_pages) // 2
    pages += spread(mid)
    pages.append(n_pages)
    slug = book.cfg["slug"]
    doc = pymupdf.open(str(pdf_path))
    written = []
    for p in sorted({p for p in pages if 1 <= p <= n_pages}):
        fn = prev_dir / f"{slug}_p{p:03d}.png"
        doc[p - 1].get_pixmap(dpi=150).save(str(fn))
        written.append(str(fn))
    return written


# ----------------------------------------------------------------------------
# 9. Hauptprogramm
# ----------------------------------------------------------------------------
def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--book", required=True, choices=sorted(BOOKS))
    ap.add_argument("--pdf", action="store_true", help="Druck-PDF erzeugen")
    ap.add_argument("--epub", action="store_true", help="EPUB erzeugen")
    ap.add_argument("--cover", type=Path, help="Cover-JPEG für das EPUB (sonst vorläufiges Cover)")
    ap.add_argument("--out", type=Path, default=HERE / "out", help="Ausgabeordner (Standard: out/)")
    ap.add_argument("--preview", action="store_true", help="PNG-Vorschauen (150 dpi) ausgewählter PDF-Seiten")
    ap.add_argument("--docx", type=Path, help="abweichende Manuskriptdatei (z. B. korrigierte v2-Fassung)")
    args = ap.parse_args(argv)
    if not (args.pdf or args.epub):
        args.pdf = args.epub = True

    out_dir = args.out if args.out.is_absolute() else (Path.cwd() / args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    build_dir = out_dir / "build"
    build_dir.mkdir(exist_ok=True)

    cfg = dict(BOOKS[args.book])
    if args.docx:
        cfg["docx"] = args.docx if args.docx.is_absolute() else (Path.cwd() / args.docx)
    print(f"[{args.book}] lese {cfg['docx'].name}")
    paras = parse_docx(cfg["docx"])
    book = build_book(args.book, paras)
    model_check = diff_report(docx_text(paras), model_text(book))
    print(f"[{args.book}] {len(paras)} Absätze, {len(book.chapters)} Kapitel, "
          f"{len([u for u in book.units if u.kind == 'act'])} Akte, {len(book.plates)} Bildtafeln; Modellprüfung: {model_check}")
    if model_check != "ok":
        raise SystemExit("FEHLER: Modelltext weicht vom DOCX ab.")

    report_path = out_dir / "report.json"
    report = json.loads(report_path.read_text(encoding="utf-8")) if report_path.exists() else {}
    entry = report.get(args.book, {})
    entry.update({
        "title": book.front.title, "author": book.front.author,
        "chapters": len(book.chapters),
        "heading1_paragraphs": sum(1 for p in paras if p.style == "Heading 1"),
        "heading1_expected": cfg["expected_h1"],
        "subtitle_is_heading1": bool(book.front.subtitle),
        "acts": len([u for u in book.units if u.kind == "act"]),
        "images": len(book.plates) + (1 if book.front.frontispiece else 0),
        "docx_paragraphs": len(paras),
        "words": len(re.findall(r"\w+", docx_text(paras))),
        "text_check": {"model_vs_docx": model_check},
    })

    if args.pdf:
        print(f"[{args.book}] PDF wird gesetzt (zwei WeasyPrint-Durchläufe) …")
        r = render_pdf(book, out_dir, build_dir)
        entry["text_check"]["print_html_vs_model"] = r["print_html_text_check"]
        import check_pdf
        chk = check_pdf.check_pdf(str(r["pdf_path"]), verbose=True)
        first_body = r["first_body_page"]
        import statistics
        opener_pages = {r["anchors"][u.id] for u in book.units}
        full_pages = [r["line_counts"][p - 1] for p in range(first_body, r["pages"] + 1)
                      if p not in opener_pages and r["line_counts"][p - 1] >= 20]
        stats = check_pdf.page_stats(str(r["pdf_path"]), [p for p in range(first_body, r["pages"] + 1)
                                                          if p not in opener_pages][:40])
        stats["lines_per_page_typical"] = statistics.mode(full_pages) if full_pages else None
        toc_check = verify_toc_numbers(r["pdf_path"], book, r["anchors"], first_body)
        entry.update({
            "pdf": str(r["pdf_path"]),
            "pdf_pages": r["pages"],
            "body_pages": r["pages"] - first_body + 1,
            "first_body_page_number": first_body,
            "front_matter_pages": first_body - 1,
            "page_numbering": "Vorspann römisch (IHV), Werkteil beginnt mit 1 auf der ersten Werkseite (recto)",
            "lines_per_page_typical": stats["lines_per_page_typical"],
            "chars_per_line_typical": stats["chars_per_line_typical"],
            "fonts": chk["fonts"],
            "fonts_embedded_check": chk["fonts_embedded_check"],
            "page_size_check": chk["page_size_check"],
            "margin_check": chk["margin_check"],
            "margin_problems": chk["margin_problems"],
            "toc_page_numbers_check": toc_check,
            "tracking_adjustments_em": r["tracking"],
            "stranded_chapter_endings_remaining": r["stranded_remaining"],
            "chapter_pages": {u.id: r["anchors"][u.id] - first_body + 1 for u in book.units if u.kind in ("chapter", "act", "plate")},
        })
        print(f"[{args.book}] PDF: {r['pdf_path']} ({r['pages']} Seiten, Werkteil ab PDF-Seite {first_body}); "
              f"Textprüfung Druck-HTML: {r['print_html_text_check']}; IHV-Seitenzahlen: {toc_check}")
        if args.preview:
            written = make_previews(book, r["pdf_path"], r["anchors"], r["pages"], out_dir)
            entry["previews"] = [os.path.basename(w) for w in written]
            print(f"[{args.book}] {len(written)} Vorschauen in {out_dir / 'preview'}")

    if args.epub:
        print(f"[{args.book}] EPUB wird gebaut …")
        r = build_epub(book, out_dir, build_dir, args.cover)
        entry["text_check"]["epub_vs_model"] = r["epub_text_check"]
        entry["epub"] = str(r["epub_path"])
        entry["epubcheck"] = r["epubcheck"]
        entry["epub_cover"] = r["cover"]
        print(f"[{args.book}] EPUB: {r['epub_path']}; epubcheck: {r['epubcheck']}; Textprüfung: {r['epub_text_check']}")

    # Bericht erst jetzt (erneut) lesen, damit parallele Läufe des anderen Buches nicht überschrieben werden
    report = json.loads(report_path.read_text(encoding="utf-8")) if report_path.exists() else {}
    report[args.book] = entry
    report_path.write_text(json.dumps(dict(sorted(report.items())), ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[{args.book}] Bericht: {report_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
