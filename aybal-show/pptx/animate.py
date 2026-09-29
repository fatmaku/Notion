"""Adds PowerPoint entrance animations and slide transitions to raw.pptx.

Every shape whose name is "anim:<effect>:<delayMs>[:<durMs>]" gets an entrance effect that
starts automatically when the slide appears (With Previous + delay), so the deck plays like
a show without clicking. Effects: fade, float (Float In), wipeL, wipeU, zoom, wheel.
"""
import re, sys, zipfile, pathlib

HERE = pathlib.Path(__file__).parent
SRC, DST = HERE / "raw.pptx", HERE.parent / "Aybal_Investor_Deck.pptx"

# (presetID, presetSubtype, presetClass) per effect
PRESET = {"fade": (10, 0), "float": (42, 0), "wipeL": (22, 8), "wipeU": (22, 4), "zoom": (53, 16), "wheel": (21, 1)}


class Ids:
    def __init__(self): self.n = 2
    def __call__(self): self.n += 1; return self.n


def tgt(spid): return f'<p:tgtEl><p:spTgt spid="{spid}"/></p:tgtEl>'


def visible(nid, spid):
    return (f'<p:set><p:cBhvr><p:cTn id="{nid()}" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn>{tgt(spid)}'
            '<p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr><p:to><p:strVal val="visible"/></p:to></p:set>')


def filt(nid, spid, f, dur):
    return f'<p:animEffect transition="in" filter="{f}"><p:cBhvr><p:cTn id="{nid()}" dur="{dur}"/>{tgt(spid)}</p:cBhvr></p:animEffect>'


def prop(nid, spid, attr, frm, to, dur, decel=False):
    v = lambda s: f'<p:fltVal val="{s}"/>' if re.fullmatch(r"-?[\d.]+", s) else f'<p:strVal val="{s}"/>'
    dc = ' decel="100000"' if decel else ''
    return (f'<p:anim calcmode="lin" valueType="num"><p:cBhvr><p:cTn id="{nid()}" dur="{dur}" fill="hold"{dc}/>{tgt(spid)}'
            f'<p:attrNameLst><p:attrName>{attr}</p:attrName></p:attrNameLst></p:cBhvr><p:tavLst>'
            f'<p:tav tm="0"><p:val>{v(frm)}</p:val></p:tav><p:tav tm="100000"><p:val>{v(to)}</p:val></p:tav></p:tavLst></p:anim>')


def effect(nid, spid, kind, delay, dur, grp):
    pid, sub = PRESET[kind]
    body = visible(nid, spid)
    if kind == "fade":
        body += filt(nid, spid, "fade", dur)
    elif kind == "float":
        body += filt(nid, spid, "fade", dur) + prop(nid, spid, "ppt_x", "#ppt_x", "#ppt_x", dur, True) + prop(nid, spid, "ppt_y", "#ppt_y+.1", "#ppt_y", dur, True)
    elif kind == "wipeL":
        body += filt(nid, spid, "wipe(right)", dur)
    elif kind == "wipeU":
        body += filt(nid, spid, "wipe(up)", dur)
    elif kind == "zoom":
        body += prop(nid, spid, "ppt_w", "0", "#ppt_w", dur, True) + prop(nid, spid, "ppt_h", "0", "#ppt_h", dur, True) + filt(nid, spid, "fade", dur)
    elif kind == "wheel":
        body += filt(nid, spid, "wheel(1)", dur)
    outer, inner = nid(), nid()
    return (f'<p:par><p:cTn id="{outer}" fill="hold"><p:stCondLst><p:cond delay="{delay}"/></p:stCondLst><p:childTnLst>'
            f'<p:par><p:cTn id="{inner}" presetID="{pid}" presetClass="entr" presetSubtype="{sub}" fill="hold" grpId="{grp}" nodeType="withEffect">'
            f'<p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>{body}</p:childTnLst></p:cTn></p:par></p:childTnLst></p:cTn></p:par>')


DEFAULT_DUR = {"fade": 700, "float": 900, "wipeL": 800, "wipeU": 800, "zoom": 700, "wheel": 1400}


def timing(xml):
    # (spid, kind, delay, dur, element-type) for every named shape
    items = []
    for m in re.finditer(r'<p:(sp|pic|graphicFrame)>\s*<p:nv\w+Pr>\s*<p:cNvPr id="(\d+)" name="anim:([^"]+)"', xml):
        tag, spid, spec = m.groups()
        kind, delay, *rest = spec.split(":")
        items.append((spid, kind, int(delay), int(rest[0]) if rest else DEFAULT_DUR[kind], tag))
    if not items:
        return ""
    nid = Ids()
    effects = "".join(effect(nid, s, k, d, u, 0) for s, k, d, u, _ in sorted(items, key=lambda i: i[2]))
    bld = "".join(
        f'<p:bldGraphic spid="{s}" grpId="0"><p:bldAsOne/></p:bldGraphic>' if t == "graphicFrame"
        else f'<p:bldP spid="{s}" grpId="0" animBg="1"/>' if t == "sp" else ""
        for s, _, _, _, t in items)
    click = nid()
    return ('<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>'
            '<p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>'
            f'<p:par><p:cTn id="{click}" fill="hold"><p:stCondLst><p:cond delay="indefinite"/><p:cond evt="onBegin" delay="0"><p:tn val="2"/></p:cond></p:stCondLst>'
            f'<p:childTnLst>{effects}</p:childTnLst></p:cTn></p:par>'
            '</p:childTnLst></p:cTn><p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>'
            '<p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq>'
            f'</p:childTnLst></p:cTn></p:par></p:tnLst>{"<p:bldLst>" + bld + "</p:bldLst>" if bld else ""}</p:timing>')


def main():
    zin = zipfile.ZipFile(SRC)
    with zipfile.ZipFile(DST, "w", zipfile.ZIP_DEFLATED) as zout:
        for info in zin.infolist():
            data = zin.read(info.filename)
            if re.fullmatch(r"ppt/slides/slide\d+\.xml", info.filename):
                xml = data.decode("utf8")
                assert "<p:timing" not in xml and "<p:transition" not in xml
                xml = xml.replace("</p:clrMapOvr>", '</p:clrMapOvr><p:transition spd="slow"><p:fade/></p:transition>' + timing(xml), 1)
                data = xml.encode("utf8")
            zout.writestr(info, data)
    print("wrote", DST.name)


if __name__ == "__main__":
    main()
