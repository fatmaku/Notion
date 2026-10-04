"""Eski videoları yeniden paylaşıma hazırlar: dikey format, ses normalizasyonu, titreşim giderme, gürültü, renk, yazı."""
import tempfile
from pathlib import Path

from . import config, ffilters, media, text_overlay


def fix_video(src, dst, fmt="9:16", fit="otomatik", stabilize=False, denoise=False, sharpen=True, color=True, loud=True,
              start=0.0, max_dur=None, headline=None, handle=None, accent="#FFD166", bg="#101828", font=None,
              fps=30, crf=20, preset="medium", progress=print):
    """Tek videoyu iyileştirip dst'ye yazar. Sözlük döndürür."""
    src, dst = Path(src), Path(dst)
    dst.parent.mkdir(parents=True, exist_ok=True)
    W, H = config.FORMATS.get(fmt, config.FORMATS["9:16"])
    info = media.probe(src)
    if fit == "otomatik":
        fit = ffilters.auto_fit(info["width"], info["height"], W, H)
    dur = max(0.5, float(info["duration"] or 0) - start - 0.05)
    if max_dur:
        dur = min(dur, float(max_dur))
    inputs = ["-ss", f"{start:.3f}", "-t", f"{dur:.3f}", "-i", str(src)]
    n_in = 1
    pre = []
    if info.get("hdr") and media.has_filter("tonemap") and media.has_filter("zscale"):
        pre.append(ffilters.hdr_chain())
    if stabilize and not media.has_filter("vidstabdetect"):
        progress("uyarı: bu ffmpeg'de titreşim giderme (vidstab) yok; atlanıyor")
        stabilize = False
    if stabilize:
        trf = Path(tempfile.mkdtemp(prefix="arsiv-stab-")) / "transforms.trf"
        progress("titreşim analizi (1/2)…")
        media.run_ffmpeg(["-ss", f"{start:.3f}", "-t", f"{dur:.3f}", "-i", src, "-vf",
                          f"vidstabdetect=shakiness=5:accuracy=15:result={trf}", "-f", "null", "-"])
        pre.append(f"vidstabtransform=input={trf}:smoothing=20:zoom=2:optzoom=1,unsharp=5:5:0.8:3:3:0.4")
    if denoise:
        pre.append("hqdn3d=3:2:4:3")
    if sharpen and not stabilize:
        pre.append("unsharp=5:5:0.6:3:3:0.0")
    if color:
        pre.append("eq=contrast=1.05:saturation=1.12:brightness=0.01")
    lines = [f"[0:v]{','.join(pre) if pre else 'null'}[pre]"]
    lines += ffilters.fit_chain("pre", "fit", W, H, fit, bg)
    lines.append(f"[fit]fps={fps},format=yuv420p,setsar=1[v0]")
    base = "v0"
    cards = []
    if headline:
        cards.append(text_overlay.label_card(W, H, headline, accent, "bottom-left", font))
    if handle:
        cards.append(text_overlay.handle_card(W, H, handle, font))
    tmpdir = Path(tempfile.mkdtemp(prefix="arsiv-fix-"))
    for k, img in enumerate(cards):
        png = tmpdir / f"kart{k}.png"
        img.save(png)
        inputs += ["-loop", "1", "-framerate", str(fps), "-t", f"{dur:.3f}", "-i", str(png)]
        lines += ffilters.overlay_chain(base, n_in, f"ov{k}", 0.0, dur, fade=0.4, uid=f"o{k}")
        base = f"ov{k}"
        n_in += 1
    if info["has_audio"]:
        lines.append(f"[0:a]{ffilters.loudness() if loud else 'anull'}[aout]")
    else:
        inputs += ["-f", "lavfi", "-t", f"{dur:.3f}", "-i", "anullsrc=r=48000:cl=stereo"]
        lines.append(f"[{n_in}:a]anull[aout]")
        n_in += 1
    script = tmpdir / "filtre.txt"
    script.write_text(";\n".join(lines))
    progress("kodlanıyor…")
    media.run_ffmpeg([*inputs, "-filter_complex_script", str(script), "-map", f"[{base}]", "-map", "[aout]",
                      "-c:v", "libx264", "-preset", preset, "-crf", str(crf), "-pix_fmt", "yuv420p", "-r", str(fps),
                      "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-movflags", "+faststart", "-t", f"{dur:.3f}", str(dst)])
    return {"output": str(dst), "duration": round(dur, 2), "fit": fit, "format": fmt, "hdr": bool(info.get("hdr"))}
