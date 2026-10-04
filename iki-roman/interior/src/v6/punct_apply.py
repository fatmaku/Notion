# Satzschlusszeichen in Dialogen ergänzen (Vorschläge aus punct_proposals.py,
# Entscheidungen manuell geprüft: OVERRIDE). Gedankenstrich-Dialoge (Hattat-Erzählung)
# bekommen „– “. Schreibt Protokoll punct_log.json.
import json, re, sys
from docx import Document
inp, props, out, logp = sys.argv[1:5]
P = {o["i"]: o for o in json.load(open(props))}
OVERRIDE = {  # Absatzindex (v6_step1) → Zeichen
 27: ".", 73: ".", 74: ".", 84: ".", 85: "…", 98: "?", 105: "?", 380: ".", 385: "?", 388: "?",
 391: "?", 393: "?", 395: "?", 407: ".", 408: ".", 409: ".", 420: "?", 421: ".", 434: "!",
 447: "?", 451: "?", 480: ".", 483: ".", 487: ".", 496: ".", 500: ".", 503: ".", 504: ".",
 508: "?", 510: ".", 524: "?", 527: "?", 538: "?", 540: "?", 547: "?", 573: ".", 585: ".",
 626: "?", 635: ".", 638: "…", 641: "?", 642: ".", 643: "?", 650: ".", 693: ".", 726: ".",
 738: ".", 742: "?", 1156: ".", 1162: ".", 1169: ".", 1202: ".", 1220: "?", 1229: ".",
 1240: ".", 1297: ".", 1306: ".", 1333: "?",
}
MID = {  # zusätzliche Binnenkorrekturen (Absatzindex → (alt, neu))
 496: ("Hocam ne demek oluyor bunlar, adamın", "Hocam, ne demek oluyor bunlar? Adamın"),
 500: ("Yahu ne oluyor mübarek, paldır", "Yahu, ne oluyor mübarek? Paldır"),
 1202: ("Hangi mızrak olacak çarpık,", "Hangi mızrak olacak? Çarpık,"),
 1297: ("Duydun mu Yesrib’e", "Duydun mu? Yesrib’e"),
}
doc = Document(inp); ps = doc.paragraphs; log = []
def put_end(p, ch):
    runs = [r for r in p.runs if r.text]
    last = runs[-1]
    t = last.text.rstrip()
    if t and t[-1] in "”’\"":
        if len(t) == 1 and len(runs) > 1:
            prev = runs[-2]; prev.text = prev.text.rstrip() + ch
        else:
            last.text = t[:-1].rstrip() + ch + t[-1]
    else:
        last.text = t + ch
for i, o in P.items():
    p = ps[i]; before = p.text
    if i in MID:
        a, b = MID[i]
        for r in p.runs:
            if a in r.text: r.text = r.text.replace(a, b); break
        else: raise SystemExit(f"MID nicht gefunden {i}")
    ch = OVERRIDE.get(i, o["dec"].replace("W", ""))
    put_end(p, ch)
    if o["kind"] == "dash":
        r0 = next(r for r in p.runs if r.text)
        r0.text = re.sub(r"^\s*-\s*", "– ", r0.text)
    log.append({"i": i, "alt": before[-80:], "neu": p.text[-80:]})
# übrige Gedankenstrich-Zeilen (mit Satzzeichen) ebenfalls „– “
for p in ps:
    if re.match(r"^\s*-[^\s-]", p.text) or re.match(r"^\s*-\s", p.text):
        r0 = next(r for r in p.runs if r.text)
        if r0.text.lstrip().startswith("-"):
            r0.text = re.sub(r"^\s*-\s*", "– ", r0.text)
doc.save(out)
json.dump(log, open(logp, "w"), ensure_ascii=False, indent=0)
print(len(log), "Absätze ergänzt")
