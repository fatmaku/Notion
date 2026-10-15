#!/usr/bin/env python3
"""BEN YOKSAM – Arbeitsdateien für die Neufassung aus YOLCU erzeugen.

  python3 tools/byk_prepare.py split              → benyoksam/src/<uid>.json, constraints.json, outline.md, forbidden.json (Standard)
  python3 tools/byk_prepare.py context            → benyoksam/ctx/<uid>.json (Kapitelplan aus dem Konzept, Synopsis der Nachbarn,
                                                    Namenskarte, zu entfernende ŞAHİT-Bezüge); aktualisiert forbidden.json (alte Namen)
Quellen: i18n/BY_source.json (Export von YOLCU v5), i18n/BY_synopsis.json, i18n/benyoksam_konsept.json (Synthese).
"""
import argparse, json, re, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from i18n_common import KNOT, MARK, strip_tags  # noqa: E402

I = Path(__file__).resolve().parent.parent
I18N = I / "i18n"
BYK = I / "benyoksam"
LABEL_RE = re.compile(r"^([^:\n]{1,40}):")
TR_UP = str.maketrans("iı", "İI")

# ŞAHİT-Bezüge, die in BEN YOKSAM nicht mehr vorkommen dürfen (Standard; das Konzept kann ergänzen)
FORBIDDEN_DEFAULT = [
    "Sefa", "Hıdıroğlu", "Muhibbi", "ŞAHİT", "Şahit", "Şahidi Ararken", "ŞAHİDİ ARARKEN",
    "Öleceğimi ilk kez o sabah düşünmedim", "İçeri girecek adamın adını henüz bilmiyorum",
    "Okurken hangi elinle tuttuğunu kontrol et", "Bazen onları ben yazmıyorum gibi geliyor",
    "seni ikinci kez öldürmüş gibi oluruz", "Metale üç kez vuruluyor", "İnsan hakikati öğrenmez, hatırlar",
]


def up(s):
    return s.translate(TR_UP).upper()


def first_letter(t):
    m = re.search(r"[^\W\d_]", strip_tags(t))
    return up(m.group(0)) if m else ""


def load_src():
    return json.load(open(I18N / "BY_source.json", encoding="utf-8"))


def split():
    exp = load_src()
    syn = {s["uid"]: s for s in json.load(open(I18N / "BY_synopsis.json", encoding="utf-8"))}
    pmap = {p["pid"]: p for p in exp["paras"]}
    (BYK / "src").mkdir(parents=True, exist_ok=True)
    cons, outline = {}, ["# BEN YOKSAM – Kapitelübersicht (Quelle: YOLCU v5)", ""]
    for u in exp["units"]:
        pids = u["pids"]
        paras = []
        for pid in pids:
            p = pmap[pid]
            paras.append({"pid": pid, "style": p["style"], "text": p["text"], "keep": p["keep"], "image": p["image"],
                          "label": (m.group(1) if p["style"] == "Book Inset" and (m := LABEL_RE.match(strip_tags(p["text"]))) and m.group(1).isupper() else None),
                          "constraint": p["constraint"]})
        h1 = next((p for p in paras if p["style"] == "Heading 1"), None)
        num = None
        if h1:
            m = re.match(r"^(\d+)\.\s", strip_tags(h1["text"]))
            num = int(m.group(1)) if m else None
        marks = [p["pid"] for p in paras if strip_tags(p["text"]).strip() == MARK]
        knots = [p["pid"] for p in paras if KNOT in strip_tags(p["text"])]

        def letter_after(pid):
            for q in paras:
                if q["pid"] > pid and strip_tags(q["text"]).strip():
                    return first_letter(q["text"])
            return ""
        c = {"uid": u["uid"], "number": num, "title": strip_tags(u["title"]),
             "title_letter": (first_letter(re.sub(r"^\d+\.\s*", "", strip_tags(h1["text"]))) if h1 and h1["constraint"] else None),
             "marks": [letter_after(pid) for pid in marks], "knots": [letter_after(pid) for pid in knots],
             "images": [p["pid"] for p in paras if p["image"]],
             "book_part": next((strip_tags(p["text"]) for p in paras if p["style"] == "Book Part"), None),
             "words": u["words"]}
        cons[u["uid"]] = c
        d = {"uid": u["uid"], "title": strip_tags(u["title"]), "number": num, "words": u["words"], "constraints": c,
             "synopsis": syn.get(u["uid"], {}), "paras": paras}
        (BYK / "src" / f"{u['uid']}.json").write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding="utf-8")
        s = syn.get(u["uid"], {}).get("summary", "")
        outline.append(f"- {u['uid']} · {strip_tags(u['title'])} · {u['words']} kelime — {s.split('. ')[0][:220]}")
    (BYK / "constraints.json").write_text(json.dumps(cons, ensure_ascii=False, indent=1), encoding="utf-8")
    (BYK / "outline.md").write_text("\n".join(outline) + "\n", encoding="utf-8")
    fb = BYK / "forbidden.json"
    if not fb.exists():
        fb.write_text(json.dumps({"strings": FORBIDDEN_DEFAULT, "old_names": {}}, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(cons)} Units → {BYK / 'src'}; constraints.json, outline.md")


def context():
    exp = load_src()
    syn = {s["uid"]: s for s in json.load(open(I18N / "BY_synopsis.json", encoding="utf-8"))}
    concept = json.load(open(I18N / "benyoksam_konsept.json", encoding="utf-8"))
    units = exp["units"]
    (BYK / "ctx").mkdir(parents=True, exist_ok=True)
    fb = json.load(open(BYK / "forbidden.json", encoding="utf-8"))
    old_names = {}
    for m in concept.get("name_map", []):
        old, new = m.get("old", ""), m.get("new", "")
        o = re.sub(r"\s*\(.*?\)\s*", "", old).strip()
        if o and new and not re.search(r"korunur|değişmez|kalır|bleibt|unchanged", new, re.I) and o.split()[0] not in new:
            old_names[o] = new
    fb["old_names"] = old_names
    for e in concept.get("remove_sahit", []):
        for s in re.findall(r"„([^“]{6,80})“", e.get("what", "")):
            if s not in fb["strings"]:
                fb["strings"].append(s)
    (BYK / "forbidden.json").write_text(json.dumps(fb, ensure_ascii=False, indent=1), encoding="utf-8")
    plan = concept.get("chapter_plan", [])

    def plan_for(title, num):
        for c in plan:
            ch = str(c.get("chapter", ""))
            if num is not None and re.match(rf"^\s*{num}\b", ch):
                return c
            if title and (title.lower() in ch.lower() or ch.lower() in title.lower()):
                return c
        return None
    for k, u in enumerate(units):
        d = json.load(open(BYK / "src" / f"{u['uid']}.json", encoding="utf-8"))
        around = [units[j]["uid"] for j in range(max(0, k - 2), min(len(units), k + 3)) if j != k]
        ctx = {"uid": u["uid"], "plan": plan_for(d["title"], d["number"]),
               "synopsis_around": [{"uid": a, "title": syn[a].get("title"), "summary": syn[a].get("summary")} for a in around if a in syn],
               "own_synopsis": syn.get(u["uid"], {}).get("summary"),
               "name_map": concept.get("name_map", []), "remove_sahit": [e for e in concept.get("remove_sahit", []) if any(str(pid) in str(e.get("where", "")) for pid in u["pids"]) or u["uid"] in str(e.get("where", "")) or (d["number"] is not None and re.search(rf"\b{d['number']}\.", str(e.get("where", ""))))],
               "forbidden": fb}
        (BYK / "ctx" / f"{u['uid']}.json").write_text(json.dumps(ctx, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(units)} Kontextdateien → {BYK / 'ctx'}; old_names: {old_names}")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("stage", choices=["split", "context"])
    a = ap.parse_args()
    split() if a.stage == "split" else context()
