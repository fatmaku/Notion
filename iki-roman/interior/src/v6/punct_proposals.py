# Vorschläge für fehlende Satzschlusszeichen in Dialogen (TDK: Satzzeichen des
# zitierten Satzes steht vor dem schließenden Anführungszeichen).
import re, json, sys
from docx import Document
QP = re.compile(r"(?<![\wçğıöşü])(mı|mi|mu|mü)(sın|sin|sun|sün|yım|yim|yum|yüm|yız|yiz|yuz|yüz|sınız|siniz|sunuz|sünüz|dır|dir|dur|dür|ydı|ydi|ydu|ydü|ymış|ymiş|ymuş|ymüş|ydın|ydin|ydun|ydün)?(?![\wçğıöşü])", re.I)
QW = re.compile(r"(?<![\wçğıöşü])(ne|neden|niye|niçin|nasıl|kim|kime|kimi|kimin|kimden|kimdir|nerede|nereye|nereden|neresi|hangi|kaç|nedir|neyi|neler|nesi)(?![\wçğıöşü])", re.I)
def last_clause(q):
    parts = re.split(r"[.!?…;:]", q)
    return parts[-1] if parts else q
def classify(q):
    c = last_clause(q)
    if QP.search(c): return "?"
    if QW.search(c): return "?W"   # Fragewort: manuell prüfen
    return "."
doc = Document(sys.argv[1])
out = []
for i, p in enumerate(doc.paragraphs):
    t = p.text.rstrip()
    if not t: continue
    m = re.search(r"([\wçğıöşüâîûÇĞİÖŞÜ])([”’\"])$", t)
    if m:
        # Zitat am Absatzende ohne Schlusszeichen
        q = t[t.rfind("“")+1:-1] if "“" in t else t
        out.append({"i": i, "kind": "end_quote", "dec": classify(q), "tail": t[-90:]})
        continue
    if re.match(r"^[“-]", t) and re.search(r"[\wçğıöşüâîûÇĞİÖŞÜ)]$", t):
        q = t
        out.append({"i": i, "kind": "open_end" if t.startswith("“") else "dash", "dec": classify(q) if t.startswith("-") else ".", "tail": t[-90:]})
json.dump(out, open(sys.argv[2], "w"), ensure_ascii=False, indent=0)
for o in out:
    print(o["i"], o["kind"][:4], o["dec"], "|", o["tail"])
