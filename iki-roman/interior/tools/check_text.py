#!/usr/bin/env python3
"""Inhaltliche Schutzprüfung der Manuskripte (vor jedem Neubau laufen lassen).

Prüft die Dinge, die beim Kürzen/Überarbeiten nie kaputtgehen dürfen:
  YOLCU: Akrostichon der fehlenden Kapitelnummern (SENİ BUL), der sieben
         „14.53 ↺“-Marken (BAŞA DÖN) und der neun Knoten-Sätze (BENİ ARAMA).
  ŞAHİT: Fettbuchstaben-Akrostichon im ersten Brief
         („bismillah, alemlere rahmet olan Allahın adıyla“).
  Beide: Brückensätze zwischen den Büchern, Motto, Schlussfragen, Kapitelzahl.

Aufruf: python3 tools/check_text.py --by src/YOLCU_TR_v4.docx --sa src/SAHIT_TR_v5.docx [--json out.json]
Exit-Code 1, wenn eine Prüfung fehlschlägt.
"""
import argparse, json, re, sys
from docx import Document

TR_UP = str.maketrans("iı", "İI")
def up(s): return s.translate(TR_UP).upper()

def paras(path):
    return [p for p in Document(path).paragraphs]

def nonempty_after(ps, i):
    for j in range(i + 1, len(ps)):
        t = ps[j].text.strip()
        if t:
            return j, t
    return None, ""

def first_letter(t):
    m = re.search(r"\w", t)
    return up(m.group(0)) if m else "?"

BRIDGES_BOTH = [
    "Öleceğimi ilk kez o sabah düşünmedim.",
    "Kapıyı açtım. İçeri girecek adamın adını henüz bilmiyorum.",
    "Okurken hangi elinle tuttuğunu kontrol et.",
    "seni ikinci kez öldürmüş gibi oluruz",
    "Bazen onları ben yazmıyorum gibi geliyor",
    "İnsan hakikati öğrenmez, hatırlar",
    "Hakan Hıdıroğlu", "Muhibbi", "Erenköy", "siyah paket", "kırmızı ip",
    "Tümör",
]
BY_ONLY = ["Kırılmış", "Bana verilen hayatla ne yapmıştım?", "antlı başparma", "sağ başparmak"]
SA_ONLY = ["sana verilen bu hayatla ne yapacaksın?", "Kırılmış", "Kapak", "sağ başparmağı bantlı"]
OLD_TITLES = ["BEN YOKSAM", "ŞAHİDİ ARARKEN", "Ben Yoksam", "Şahidi Ararken"]


def check_by(path, res):
    ps = paras(path)
    full = "\n".join(p.text for p in ps)
    # 1 SENİ BUL: Kapitel, deren Vorgänger-Nummer fehlt
    nums = []
    for p in ps:
        if p.style.name == "Heading 1":
            m = re.match(r"^(\d+)\.\s+(.+)$", p.text.strip())
            if m:
                nums.append((int(m.group(1)), m.group(2)))
    seq, prev = "", 0
    missing = []
    for n, title in nums:
        if n != prev + 1:
            missing.extend(range(prev + 1, n))
            seq += first_letter(title)
        prev = n
    res["BY_kapitel"] = len(nums)
    res["BY_fehlende_nummern"] = missing
    res["BY_SENI_BUL"] = seq
    ok = seq == "SENİBUL" and missing == [6, 10, 14, 19, 27, 33, 41]
    # 2 BAŞA DÖN
    seq2 = ""
    for i, p in enumerate(ps):
        if p.text.strip().startswith("14.53 ↺") or p.text.strip() == "14.53 ↺":
            j, t = nonempty_after(ps, i)
            seq2 += first_letter(t)
    res["BY_BASA_DON"] = seq2
    ok &= seq2 == "BAŞADÖN"
    # 3 BENİ ARAMA
    seq3 = ""
    for i, p in enumerate(ps):
        if "Düğümün iki ucu aynı uzunluktaydı" in p.text:
            j, t = nonempty_after(ps, i)
            seq3 += first_letter(t)
    res["BY_BENI_ARAMA"] = seq3
    ok &= seq3 == "BENİARAMA"
    miss = [b for b in BRIDGES_BOTH + BY_ONLY if b not in full]
    res["BY_bruecken_fehlen"] = miss
    ok &= not miss
    old = [o for o in OLD_TITLES if o in full]
    res["BY_alte_titel"] = old
    ok &= not old
    res["BY_motto"] = full.count("İnsan hakikati öğrenmez, hatırlar")
    res["BY_woerter"] = len(full.split())
    return ok


def check_sa(path, res):
    ps = paras(path)
    full = "\n".join(p.text for p in ps)
    # Fettbuchstaben bis zur ersten Kapitelüberschrift nach „Başlangıç“ (erster Brief)
    letters = ""
    started = False
    n_h1 = 0
    for p in ps:
        if p.style.name == "Heading 1":
            n_h1 += 1
            if n_h1 == 2:
                break
            started = True
            continue
        if not started:
            continue
        for r in p.runs:
            if r.bold and r.text.strip():
                letters += r.text
    norm = re.sub(r"\W", "", letters.lower())
    res["SA_fettbuchstaben"] = letters
    ok = norm == "bismillahalemlererahmetolanallahınadıyla"
    miss = [b for b in BRIDGES_BOTH + SA_ONLY if b not in full]
    res["SA_bruecken_fehlen"] = miss
    ok &= not miss
    old = [o for o in OLD_TITLES if o in full]
    res["SA_alte_titel"] = old
    ok &= not old
    res["SA_kapitel"] = sum(1 for p in ps if p.style.name == "Heading 1")
    res["SA_motto"] = full.count("İnsan hakikati öğrenmez, hatırlar")
    res["SA_titel"] = next((p.text for p in ps if p.style.name == "Title"), "")
    ok &= res["SA_titel"] == "ŞAHİT"
    ok &= "Kitabın adını yazdım:" in full and "\nŞAHİT\n" in full
    res["SA_woerter"] = len(full.split())
    return ok


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--by"); ap.add_argument("--sa"); ap.add_argument("--json")
    a = ap.parse_args()
    res, ok = {}, True
    if a.by:
        r = check_by(a.by, res); res["BY_OK"] = r; ok &= r
    if a.sa:
        r = check_sa(a.sa, res); res["SA_OK"] = r; ok &= r
    print(json.dumps(res, ensure_ascii=False, indent=1))
    if a.json:
        open(a.json, "w").write(json.dumps(res, ensure_ascii=False, indent=1))
    print("ERGEBNIS:", "OK" if ok else "FEHLER")
    sys.exit(0 if ok else 1)

if __name__ == "__main__":
    main()
