# Exportiert ein Manuskript mit Absatz-IDs (pid) und Sperr-/Formatmarken für die Straffung.
import json, re, sys
from docx import Document
key, path, outdir = sys.argv[1:4]
ps = Document(path).paragraphs
LOCK_STR = {
 "BY": ["Öleceğimi ilk kez o sabah düşünmedim.", "Kapıyı açtım. İçeri girecek adamın adını henüz bilmiyorum.",
        "Okurken hangi elinle tuttuğunu kontrol et.", "seni ikinci kez öldürmüş gibi oluruz",
        "Bazen onları ben yazmıyorum gibi geliyor", "İnsan hakikati öğrenmez", "Bana verilen hayatla ne yapmıştım?",
        "antlı başparma", "sağ başparmak", "Kırılmış", "Kapak", "Tümör", "Hakan Hıdıroğlu", "Muhibbi", "Erenköy",
        "14.53 ↺", "Düğümün iki ucu aynı uzunluktaydı"],
 "SA": ["Öleceğimi ilk kez o sabah düşünmedim.", "Kapıyı açtım. İçeri girecek adamın adını henüz bilmiyorum.",
        "Okurken hangi elinle tuttuğunu kontrol et.", "seni ikinci kez öldürmüş gibi oluruz",
        "Bazen onları ben yazmıyorum gibi geliyor", "İnsan hakikati öğrenmez", "sana verilen bu hayatla ne yapacaksın?",
        "sağ başparmağı bantlı", "Kırılmış", "Kapak", "Tümör", "ikinci kez yaşıyoruz", "Kitabın adını yazdım",
        "Bismillah; Alemlerin", "lemlere rahmet olan", "Mrhb", "Üç romanımı da sordum", "Çantamdan üç romanımı",
        "Kafedeki Mahmut da"],
}[key]
locked, lines, chapters = set(), [], []
def nonempty_after(i):
    for j in range(i + 1, len(ps)):
        if ps[j].text.strip():
            return j
for i, p in enumerate(ps):
    st = p.style.name; t = p.text
    L = st not in ("Normal", "Opening", "Book Inset") or bool(p._element.xpath(".//w:drawing"))
    if any(s in t for s in LOCK_STR): L = True
    if key == "SA" and any(r.bold and r.text.strip() for r in p.runs): L = True
    if L: locked.add(i)
    if key == "BY" and ("14.53 ↺" in t or "Düğümün iki ucu aynı uzunluktaydı" in t):
        j = nonempty_after(i); locked.add(j)
for i, p in enumerate(ps):
    st = p.style.name; t = p.text
    if st == "Heading 1": chapters.append((i, t.strip()))
    fl = "L" if i in locked else ""
    fm = [r.text for r in p.runs if r.text.strip() and (r.italic or r.bold or r.underline)]
    mixed = fm and len({(bool(r.italic), bool(r.bold)) for r in p.runs if r.text.strip()}) > 1
    tag = f"[{i}{'|L' if fl else ''}]"
    if st not in ("Normal",): tag += f" <{st}>"
    if mixed: tag += " {FORMATLI: " + " | ".join(repr(x[:40]) for x in fm[:6]) + "}"
    elif fm: tag += " {TÜMÜ " + ("İTALİK" if p.runs and any(r.italic for r in p.runs) else "BİÇİMLİ") + "}"
    lines.append(f"{tag} {t if t.strip() else '(boş)'}")
open(f"{outdir}/{key}_full.txt", "w").write("\n".join(lines) + "\n")
json.dump(sorted(locked), open(f"{outdir}/{key}_locked.json", "w"))
json.dump(chapters, open(f"{outdir}/{key}_chapters.json", "w"), ensure_ascii=False)
print(key, len(ps), "Absätze,", len(locked), "gesperrt,", len(chapters), "Kapitel")
