"""ffmpeg filtre zinciri yardımcıları (studio ve fix ortak kullanır)."""

TRANSITIONS = {"fade", "wipeleft", "wiperight", "wipeup", "wipedown", "slideleft", "slideright", "slideup", "slidedown",
               "circlecrop", "rectcrop", "distance", "fadeblack", "fadewhite", "radial", "smoothleft", "smoothright",
               "smoothup", "smoothdown", "circleopen", "circleclose", "vertopen", "vertclose", "horzopen", "horzclose",
               "dissolve", "pixelize", "diagtl", "diagtr", "diagbl", "diagbr", "hlslice", "hrslice", "vuslice", "vdslice",
               "hblur", "fadegrays", "wipetl", "wipetr", "wipebl", "wipebr", "squeezeh", "squeezev", "zoomin", "fadefast",
               "fadeslow", "coverleft", "coverright", "coverup", "coverdown", "revealleft", "revealright", "revealup", "revealdown"}
NICE_TRANSITIONS = ["fade", "smoothleft", "circleopen", "slideup", "dissolve", "wipeleft", "zoomin", "fadeblack"]


def hex_ff(hex_color):
    return "0x" + (hex_color or "#000000").lstrip("#")


def fit_chain(src, dst, W, H, mode="kirp", bg="#101828", uid="f"):
    """[src] → [dst] tuvale sığdırma. Birden çok filtre satırı döndürür."""
    if mode == "bulanik":
        return [
            f"[{src}]split[{uid}a][{uid}b]",
            f"[{uid}a]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},boxblur=28:4,eq=brightness=-0.08[{uid}bg]",
            f"[{uid}b]scale={W}:{H}:force_original_aspect_ratio=decrease[{uid}fg]",
            f"[{uid}bg][{uid}fg]overlay=(W-w)/2:(H-h)/2,setsar=1[{dst}]",
        ]
    if mode == "sigdir":
        return [f"[{src}]scale={W}:{H}:force_original_aspect_ratio=decrease,pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:color={hex_ff(bg)},setsar=1[{dst}]"]
    return [f"[{src}]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},setsar=1[{dst}]"]


def auto_fit(src_w, src_h, W, H):
    """Kaynak yatay, tuval dikey (ya da tersi) ise bulanık arka plan; yoksa kırp."""
    if not src_w or not src_h:
        return "kirp"
    r_src, r_dst = src_w / src_h, W / H
    if (r_src > 1.15 and r_dst < 1) or (r_src < 0.85 and r_dst > 1):
        return "bulanik"
    return "kirp"


def hdr_chain():
    """HDR (HLG/PQ) iPhone videoları için SDR'a ton eşleme."""
    return "zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p"


def kenburns(src, dst, W, H, frames, fps, variant=0, zmax=1.12):
    """Tek kare fotoğraftan (2x tuval) Ken Burns hareketi."""
    step = (zmax - 1) / max(1, frames)
    cx, cy = "iw/2-(iw/zoom/2)", "ih/2-(ih/zoom/2)"
    v = variant % 4
    if v == 0:
        z, x, y = f"min(zoom+{step:.6f},{zmax})", cx, cy
    elif v == 1:
        z, x, y = f"if(lte(on,1),{zmax},max(1.0,zoom-{step:.6f}))", cx, cy
    elif v == 2:
        z, x, y = f"{zmax}", f"(iw-iw/zoom)*on/{frames}", cy
    else:
        z, x, y = f"{zmax}", cx, f"(ih-ih/zoom)*on/{frames}"
    return [f"[{src}]zoompan=z='{z}':x='{x}':y='{y}':d={frames}:s={W}x{H}:fps={fps},setsar=1[{dst}]"]


def overlay_chain(base, ov_index, dst, start, end, fade=0.4, uid="o"):
    """PNG girişini (ov_index) [base] üstüne start-end arası bindirir (alfa fade ile)."""
    lines = []
    ov = f"{uid}v"
    f_in = f"fade=t=in:st={start:.3f}:d={fade:.2f}:alpha=1" if fade else "null"
    f_out = f",fade=t=out:st={max(start, end - fade):.3f}:d={fade:.2f}:alpha=1" if fade else ""
    lines.append(f"[{ov_index}:v]format=rgba,{f_in}{f_out}[{ov}]")
    lines.append(f"[{base}][{ov}]overlay=0:0:enable='between(t,{start:.3f},{end:.3f})':eof_action=pass[{dst}]")
    return lines


def loudness():
    return "loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000"
