# ŞAHİT: Satzzeichen vor/nach direkter Rede vereinheitlichen (TDK):
#  (a) Semikolon vor direkter Rede → Doppelpunkt („devam etti;“ + Redeabsatz, „dedi; “…”“)
#  (b) fehlendes Komma vor dem schließenden Anführungszeichen vor „dedi/diye/sordu …“
#      („Geldim” dedi → „Geldim,” dedi); einzelne zitierte Wörter („Bayılmak” deyince) bleiben.
import json, re, sys
from docx import Document
inp, out, logp = sys.argv[1:4]
doc = Document(inp); ps = doc.paragraphs; log = []
SPEECH = ("“", "‘", "–", "-")
VERBS = r"(dedi|dedim|dedik|diye|der|derdi|dermiş|sordu|sordum|deyip|deyince|demişti|demiş|dediğinde|diyerek|diyordu|söyledi|cevap verdi|seslendi|fısıldadı|bağırdı)\b"
def nxt(i):
    for j in range(i + 1, len(ps)):
        if ps[j].text.strip():
            return ps[j]
for i, p in enumerate(ps):
    runs = [r for r in p.runs if r.text]
    if not runs:
        continue
    before = p.text
    # (a1) Absatzende „;“ und nächster Absatz ist Rede
    last = runs[-1]
    n = nxt(i)
    if last.text.rstrip().endswith(";") and n is not None and n.text.strip()[:1] in SPEECH:
        t = last.text.rstrip()
        last.text = t[:-1] + ":"
    # (a2) „; “…“ innerhalb eines Runs
    for r in runs:
        if re.search(r";\s*[“‘]", r.text):
            r.text = re.sub(r";(\s*)([“‘])", r":\1\2", r.text)
    # (b) Komma vor ” + Redeverb (nur wenn Zitat im selben Run beginnt und mehr als ein Wort hat)
    for r in runs:
        def fix(m):
            start = r.text.rfind("“", 0, m.start())
            if start < 0:
                return m.group(0)
            inner = r.text[start + 1:m.start() + 1]
            if " " not in inner.strip():
                return m.group(0)
            return m.group(1) + ",”" + m.group(2) + m.group(3)
        r.text = re.sub(r"([\wçğıöşüâîûÇĞİÖŞÜ])”(\s+)" + VERBS, fix, r.text)
    if p.text != before:
        log.append({"i": i, "alt": before[-160:], "neu": p.text[-160:]})
doc.save(out)
json.dump(log, open(logp, "w"), ensure_ascii=False, indent=0)
print(len(log), "Absätze angepasst")
