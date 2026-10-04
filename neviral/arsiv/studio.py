"""Stüdyo: seçilen foto/videolardan hazır paylaşım videoları (hikâye, reel), alıntı kartları ve carousel üretir."""
import datetime as dt
import json
import random
import re
import subprocess
from pathlib import Path

from . import config, db, ffilters, fix, highlights, i18n, kalite, media, music, photos_mac, tasarim, text_overlay

DEFAULT_BRIEF = {
    "sablon": "montaj",          # montaj | tekli | eskiden-simdi | alinti | carousel | yeniden
    "format": "9:16",
    "baslik": "", "altbaslik": "", "cta": "", "etiket": "",
    "ogeler": [],                # [{"id": 12, "baslangic": 3.0, "sure": 4.0, "yazi": "2019"}] ya da [12, 13]
    "foto_suresi": 3.0, "klip_max": 6.0, "max_sure": 60,
    "gecis": "fade", "gecis_suresi": 0.5, "sigdirma": "otomatik",
    "muzik": "sakin", "muzik_ses": 0.7, "orijinal_ses": 1.0,
    "renk": "#101828", "vurgu": "#FFD166", "yazi_tipi": None,
    "kalite": "yuksek", "fps": 30, "etiketler_goster": True,
    "sabitle": False, "gurultu": False, "keskinlik": True, "renk_duzelt": True, "stil": "otomatik",
}
TEMPLATES = {
    "montaj": "Montaj: fotoğraf + video kesitleri, geçişler, giriş/kapanış kartı, müzik",
    "tekli": "Tekli hikâye: tek foto/video, başlık + açıklama etiketi",
    "eskiden-simdi": "Eskiden / Şimdi: çiftler halinde üst-alt karşılaştırma",
    "alinti": "Alıntı kartı: bulanık arka plan üstünde büyük söz (video + JPG)",
    "carousel": "Carousel: 1080x1350 kaydırmalı gönderi görselleri (JPG)",
    "yeniden": "Yeniden paylaş: eski videoyu düzelt (dikey format, ses, titreşim, renk)",
}


HEX = re.compile(r"#?[0-9A-Fa-f]{6}")
AUDIO_EXT = {".mp3", ".m4a", ".wav", ".aac", ".aif", ".aiff", ".flac", ".ogg"}
FONT_EXT = {".ttf", ".otf", ".ttc"}


def _safe_user_file(value, exts):
    """Kullanıcının kendi dosyası: var olan, uzantısı uygun ve ev klasörü altında olmalı."""
    try:
        p = Path(str(value)).expanduser().resolve()
    except (OSError, ValueError):
        return None
    if p.suffix.lower() not in exts or not p.is_file():
        return None
    try:
        p.relative_to(Path.home().resolve())
    except ValueError:
        if not str(p).startswith(("/Library/Fonts", "/System/Library/Fonts", "/Volumes/")):
            return None
    return str(p)


def normalize_brief(brief):
    brief = brief or {}
    b = dict(DEFAULT_BRIEF)
    b.update({k: v for k, v in brief.items() if v is not None})
    if b["sablon"] not in TEMPLATES:
        b["sablon"] = "montaj"
    if b["sablon"] == "carousel" and not brief.get("format"):
        b["format"] = "4:5"
    if b["format"] not in config.FORMATS:
        b["format"] = "4:5" if b["sablon"] == "carousel" else "9:16"
    items = []
    for o in b.get("ogeler") or []:
        if isinstance(o, dict) and str(o.get("id", "")).isdigit():
            it = {"id": int(o["id"])}
            for k in ("baslangic", "sure"):
                try:
                    if o.get(k) not in (None, ""):
                        it[k] = max(0.0, float(o[k]))
                except (TypeError, ValueError):
                    pass
            if it.get("sure") is not None:
                it["sure"] = max(1.0, it["sure"])
            if o.get("yazi") not in (None, ""):
                it["yazi"] = str(o["yazi"])[:60]
            items.append(it)
        elif isinstance(o, (int, str)) and str(o).isdigit():
            items.append({"id": int(o)})
    b["ogeler"] = items[:60]
    for k in ("foto_suresi", "klip_max", "max_sure", "gecis_suresi", "muzik_ses", "orijinal_ses"):
        try:
            b[k] = float(b[k])
        except (TypeError, ValueError):
            b[k] = DEFAULT_BRIEF[k]
    b["foto_suresi"] = min(30.0, max(1.0, b["foto_suresi"]))
    b["klip_max"] = min(600.0, max(1.0, b["klip_max"]))
    b["max_sure"] = min(600.0, max(2.0, b["max_sure"]))
    b["gecis_suresi"] = min(2.0, max(0.0, b["gecis_suresi"]))
    b["muzik_ses"] = min(2.0, max(0.0, b["muzik_ses"]))
    b["orijinal_ses"] = min(2.0, max(0.0, b["orijinal_ses"]))
    try:
        b["fps"] = 25 if int(b.get("fps") or 30) == 25 else (60 if int(b.get("fps") or 30) == 60 else 30)
    except (TypeError, ValueError):
        b["fps"] = 30
    if b["gecis"] not in ffilters.TRANSITIONS and b["gecis"] != "rastgele":
        b["gecis"] = "fade"
    for k in ("renk", "vurgu"):  # ffmpeg filtre grafiğine girer: yalnızca #RRGGBB
        b[k] = ("#" + str(b[k]).lstrip("#")) if HEX.fullmatch(str(b[k] or "")) else DEFAULT_BRIEF[k]
    m = str(b.get("muzik") or "yok")
    if m.lower() in ("", "yok", "none", "hayir", "false"):
        b["muzik"] = "yok"
    elif m not in music.MOODS:
        b["muzik"] = _safe_user_file(m, AUDIO_EXT) or "sakin"
    b["yazi_tipi"] = _safe_user_file(b["yazi_tipi"], FONT_EXT) if b.get("yazi_tipi") else None
    if b["sigdirma"] not in ("otomatik", "kirp", "bulanik", "sigdir"):
        b["sigdirma"] = "otomatik"
    if b["kalite"] not in ("yuksek", "orta"):
        b["kalite"] = "yuksek"
    b["iyilestir"] = bool(b.get("iyilestir"))
    if b.get("stil") not in tasarim.STYLES and b.get("stil") != "klasik":
        b["stil"] = "otomatik"
    for k in ("baslik", "altbaslik", "cta", "etiket"):
        b[k] = str(b.get(k) or "")[:300]
    if b["sablon"] in ("tekli", "alinti", "yeniden"):
        b["klip_max"] = b["max_sure"]
    return b


def _slug(s):
    s = re.sub(r"[^\w\- ]+", "", str(s or ""), flags=re.UNICODE).strip().replace(" ", "-")
    return s[:40] or "uretim"


def _out_dir(name):
    d = config.RENDERS / f"{dt.datetime.now():%Y%m%d-%H%M%S}-{_slug(name)}"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _run(cmd, total, progress):
    """ffmpeg'i -progress ile çalıştırır; yüzde ilerlemeyi progress'e verir."""
    full = [media.ffmpeg_path(), "-y", "-hide_banner", "-loglevel", "error", "-nostdin", *[str(c) for c in cmd],
            "-progress", "pipe:1", "-nostats"]
    proc = subprocess.Popen(full, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    last = -10
    for line in proc.stdout:
        if line.startswith("out_time_us=") or line.startswith("out_time_ms="):
            try:
                pct = min(99, int(int(line.split("=")[1]) / 1e6 / max(0.1, total) * 100))
            except ValueError:
                continue
            if pct >= last + 10:
                last = pct
                progress(f"  %{pct}")
    err = proc.stderr.read()
    proc.wait()
    proc.stdout.close()
    proc.stderr.close()
    if proc.returncode != 0:
        raise media.MediaError("ffmpeg hatası: " + err.strip()[-2500:])


# ---------------------------------------------------------------- klipler
def build_clips(con, b, progress):
    items = db.get_items(con, [o["id"] for o in b["ogeler"]])
    by_id = {it["id"]: it for it in items}
    carousel = b["sablon"] == "carousel"
    clips, total, T = [], 0.0, (b["gecis_suresi"] if len(b["ogeler"]) > 1 else 0.0)
    for o in b["ogeler"]:
        it = by_id.get(o["id"])
        if not it:
            progress(f"  ! öğe bulunamadı: {o['id']}")
            continue
        try:  # tek bir eksik/indirilemeyen dosya tüm üretimi durdurmasın
            path = photos_mac.ensure_local(con, it, progress)
            info = media.probe(path) if it["kind"] == "video" else None
        except (FileNotFoundError, media.MediaError, OSError) as e:
            progress(f"  ! atlandı: {it.get('filename')}: {e}")
            continue
        c = {"item": it, "path": path, "kind": it["kind"], "start": 0.0, "has_audio": False, "hdr": False,
             "w": it.get("width") or 0, "h": it.get("height") or 0, "label": o.get("yazi")}
        if it["kind"] == "foto":
            default = min(b["max_sure"], 8.0) if b["sablon"] in ("alinti", "tekli") else b["foto_suresi"]
            c["dur"] = float(o.get("sure") or default)
        else:
            vdur = float(info["duration"] or 0)
            c.update(has_audio=info["has_audio"], hdr=info.get("hdr", False), w=info["width"] or c["w"], h=info["height"] or c["h"])
            want = float(o.get("sure") or b["klip_max"] or vdur)
            if o.get("baslangic") is not None:
                c["start"] = min(float(o["baslangic"]), max(0.0, vdur - 1.0))
            elif vdur > want + 1 and b["sablon"] in ("montaj", "tekli", "eskiden-simdi", "yeniden"):
                c["start"] = highlights.best_start(path, vdur, want)  # uzun videoda en iyi anı otomatik bul
                if c["start"]:
                    progress(f"  ✨ {it.get('filename')}: en iyi an {c['start']:.1f}. saniyeden başlıyor")
            avail = max(0.5, vdur - c["start"] - 0.05)
            c["dur"] = max(0.5, min(avail, want))
        if c["label"] is None and b.get("etiketler_goster") and b["sablon"] == "montaj":
            c["label"] = str(it.get("year") or "")
        if not carousel:
            room = b["max_sure"] - (total - T if clips else 0.0)
            if room < 1.5 and clips:
                progress(f"  ! süre sınırı ({b['max_sure']:.0f} sn): kalan öğeler atlandı")
                break
            if c["dur"] > room:
                c["dur"] = room
        clips.append(c)
        total += c["dur"] - (T if len(clips) > 1 else 0.0)
    if not clips:
        raise ValueError("Üretim için kullanılabilir öğe yok (dosyalar yerelde mi?)")
    return clips


class _Ctx:
    def __init__(self, W, H, b, out_dir):
        self.W, self.H, self.b, self.out_dir = W, H, b, out_dir
        self.inputs, self.lines, self.alabels, self.n_in = [], [], [], 0
        self.fps = b["fps"]

    def add_input(self, args):
        self.inputs += [str(a) for a in args]
        self.n_in += 1
        return self.n_in - 1


def _emit_clip(ctx, c, i, dst, W, H, offset, T, want_audio):
    """Klibi WxH boyutunda [dst] video etiketine çevirir; sesi zaman çizelgesine yerleştirir."""
    b, fps = ctx.b, ctx.fps
    frames = max(2, int(round(c["dur"] * fps)))
    # neviral: ölçülen kaliteye göre otomatik pozlama/renk/netlik düzeltmesi
    eq = ("," + kalite.eq_for(c["item"].get("quality") if isinstance(c["item"].get("quality"), dict) else None)) if b.get("iyilestir") else ""
    if c["kind"] == "foto":
        mode = b["sigdirma"] if b["sigdirma"] in ("kirp", "bulanik", "sigdir", "otomatik") else "otomatik"
        key = (c["item"].get("qhash") or c["item"]["uuid"]).replace(":", "_")
        pre = text_overlay.prep_photo(c["path"], W, H, mode, config.CACHE / f"kb-{key}-{W}x{H}-{mode}-{b['renk'].lstrip('#')}.jpg", bg=b["renk"])
        idx = ctx.add_input(["-i", pre])
        ctx.lines += ffilters.kenburns(f"{idx}:v", f"kb{dst}", W, H, frames, fps, variant=i)
        ctx.lines.append(f"[kb{dst}]settb=AVTB,fps={fps},format=yuv420p{eq}[{dst}]")
    else:
        idx = ctx.add_input(["-ss", f"{c['start']:.3f}", "-t", f"{c['dur']:.3f}", "-i", c["path"]])
        mode = b["sigdirma"] if b["sigdirma"] in ("kirp", "bulanik", "sigdir") else ffilters.auto_fit(c["w"], c["h"], W, H)
        src = f"{idx}:v"
        if c.get("hdr") and media.has_filter("tonemap") and media.has_filter("zscale"):
            ctx.lines.append(f"[{src}]{ffilters.hdr_chain()}[hdr{dst}]")
            src = f"hdr{dst}"
        ctx.lines += ffilters.fit_chain(src, f"fit{dst}", W, H, mode, b["renk"], uid=f"f{dst}")
        # klibi tam olarak nominal uzunluğa sabitle (eksik kare → son kare tutulur): geçiş zinciri kaymaz
        ctx.lines.append(f"[fit{dst}]setpts=PTS-STARTPTS,settb=AVTB,fps={fps},format=yuv420p{eq},"
                         f"tpad=stop_mode=clone:stop_duration={c['dur']:.3f},trim=duration={frames / fps:.4f},setpts=PTS-STARTPTS,settb=AVTB,fps={fps}[{dst}]")
        if want_audio and c["has_audio"] and b["orijinal_ses"] > 0:
            fd = max(0.3, T)
            ctx.lines.append(f"[{idx}:a]volume={b['orijinal_ses']:.2f},aformat=sample_rates=48000:channel_layouts=stereo,"
                             f"afade=t=in:d={min(0.3, fd):.2f},afade=t=out:st={max(0, c['dur'] - fd):.3f}:d={fd:.2f},"
                             f"adelay={int(offset * 1000)}:all=1[a{dst}]")
            ctx.alabels.append(f"a{dst}")
    return dst


def _xfade(ctx, labels, durs, T):
    if len(labels) == 1:
        return labels[0], durs[0]
    prev, t = labels[0], durs[0]
    for i in range(1, len(labels)):
        off = t - T
        trans = random.choice(ffilters.NICE_TRANSITIONS) if ctx.b["gecis"] == "rastgele" else ctx.b["gecis"]
        ctx.lines.append(f"[{prev}][{labels[i]}]xfade=transition={trans}:duration={T:.3f}:offset={off:.3f}[x{i}]")
        prev = f"x{i}"
        t = off + durs[i]
    return prev, t


def _overlay(ctx, base, img, start, end, fade, k, total):
    png = ctx.out_dir / f"kart-{k}.png"
    img.save(png)
    idx = ctx.add_input(["-loop", "1", "-framerate", ctx.fps, "-t", f"{total:.3f}", "-i", png])
    ctx.lines += ffilters.overlay_chain(base, idx, f"ov{k}", start, end, fade=fade, uid=f"o{k}")
    return f"ov{k}"


def _audio(ctx, total):
    b = ctx.b
    m = b.get("muzik")
    if m and str(m).lower() not in ("", "yok", "none", "hayir", "false"):
        if m in music.MOODS:
            wav = config.CACHE / f"muzik-{m}-{total:.2f}s.wav"
            if not wav.exists():
                music.synth(str(m), max(1.0, total), wav)
            idx = ctx.add_input(["-i", wav])
        else:  # kullanıcının kendi dosyası (normalize_brief doğruladı)
            idx = ctx.add_input(["-protocol_whitelist", "file", "-stream_loop", "-1", "-t", f"{total:.3f}", "-i", m])
        ctx.lines.append(f"[{idx}:a]volume={b['muzik_ses']:.2f},aformat=sample_rates=48000:channel_layouts=stereo,"
                         f"afade=t=in:d=1,afade=t=out:st={max(0, total - 2.5):.3f}:d=2.5[am]")
        ctx.alabels.append("am")
    if not ctx.alabels:
        idx = ctx.add_input(["-f", "lavfi", "-t", f"{total:.3f}", "-i", "anullsrc=r=48000:cl=stereo"])
        ctx.lines.append(f"[{idx}:a]anull[aout]")
    elif len(ctx.alabels) == 1:
        ctx.lines.append(f"[{ctx.alabels[0]}]{ffilters.loudness()},apad=whole_dur={total:.3f}[aout]")
    else:
        ctx.lines.append("".join(f"[{a}]" for a in ctx.alabels) + f"amix=inputs={len(ctx.alabels)}:duration=longest:normalize=0,"
                         f"{ffilters.loudness()},apad=whole_dur={total:.3f}[aout]")


def _encode(ctx, base, total, out, progress):
    script = ctx.out_dir / "filtre.txt"
    script.write_text(";\n".join(ctx.lines))
    crf, preset = (18, "medium") if ctx.b["kalite"] == "yuksek" else (23, "veryfast")
    _run([*ctx.inputs, "-filter_complex_script", script, "-map", f"[{base}]", "-map", "[aout]",
          "-c:v", "libx264", "-preset", preset, "-crf", crf, "-pix_fmt", "yuv420p", "-r", ctx.fps,
          "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-movflags", "+faststart", "-t", f"{total:.3f}", out], total, progress)
    cover = out.with_name("kapak.jpg")
    media.run_ffmpeg(["-ss", f"{min(1.5, total * 0.3):.2f}", "-i", out, "-frames:v", "1", "-q:v", "3", cover])
    return cover


# ---------------------------------------------------------------- video şablonları
def _classic_cards(ctx, b, windows, base, total, W, H):
    font, accent = b.get("yazi_tipi"), b["vurgu"]
    # kartlar
    k = 0
    intro_end = 0.0
    if b["sablon"] == "alinti":
        base = _overlay(ctx, base, text_overlay.quote_card(W, H, b["baslik"] or "", b.get("altbaslik"), accent, font), 0.3, total, 0.6, k, total); k += 1
    elif b["baslik"]:
        intro_end = min(3.2, total * 0.45)
        base = _overlay(ctx, base, text_overlay.intro_card(W, H, b["baslik"], b.get("altbaslik") if b["sablon"] != "tekli" else None, accent, font),
                        0.0, intro_end, 0.5, k, total); k += 1
    if b["sablon"] == "tekli" and b.get("altbaslik"):
        base = _overlay(ctx, base, text_overlay.caption_card(W, H, b["altbaslik"], accent, font), intro_end, total, 0.4, k, total); k += 1
    for (s, e, top, bottom) in windows:
        s2 = max(s + 0.15, intro_end + 0.2 if s < intro_end else s + 0.15)
        e2 = e - 0.15
        if e2 - s2 < 0.8:
            continue
        img = text_overlay.split_labels(W, H, top, bottom, accent, font) if bottom else text_overlay.label_card(W, H, top, accent, "bottom-left", font)
        base = _overlay(ctx, base, img, s2, e2, 0.3, k, total); k += 1
    if b.get("cta") and total > 4:
        base = _overlay(ctx, base, text_overlay.cta_card(W, H, b["cta"], b.get("etiket"), accent, font), total - 3.0, total, 0.5, k, total); k += 1
    if b.get("etiket") and b["sablon"] != "alinti":
        base = _overlay(ctx, base, text_overlay.handle_card(W, H, b["etiket"], font), 0.0, total, 0.0, k, total); k += 1
    return base


def _accent_for(b, clips):
    if b.get("vurgu") and b["vurgu"].upper() != DEFAULT_BRIEF["vurgu"].upper():
        return b["vurgu"]  # kullanıcı rengi seçti
    c = clips[0]
    src = c["path"] if c["kind"] == "foto" else (c["item"].get("thumb") or None)
    return tasarim.palette(src)["vurgu"] if src else b["vurgu"]


def _styled_cards(ctx, b, clips, windows, base, total, W, H, stil):
    """Tasarım stili: renk derecelendirme + hareketli kanca + stil kartları."""
    g = tasarim.grade(stil, W, H, grain=b.get("kalite") == "yuksek")
    if g:
        ctx.lines.append(f"[{base}]{g}[gr]")
        base = "gr"
    accent = _accent_for(b, clips)
    k = 100
    hook_end = 0.0
    hook = b["baslik"]
    if hook:
        alinti = b["sablon"] == "alinti"
        sub = b.get("altbaslik") if (alinti or b["sablon"] not in ("tekli",)) else None
        anim = 1.4 if stil != "sinema" else 1.8
        hook_end = total if alinti else min(max(2.8, anim + 1.4), total * 0.55)
        seq_dir = ctx.out_dir / "kanca"
        pattern, n, static = tasarim.hook_sequence(hook, stil, W, H, seq_dir, accent, fps=ctx.fps, anim_dur=anim, sub=sub)
        idx = ctx.add_input(["-framerate", ctx.fps, "-start_number", 0, "-i", pattern])
        ctx.lines.append(f"[{idx}:v]format=rgba,setpts=PTS-STARTPTS[hk]")
        ctx.lines.append(f"[{base}][hk]overlay=0:0:eof_action=pass:enable='lte(t,{n / ctx.fps:.3f})'[hka]")
        base = "hka"
        if hook_end > n / ctx.fps:
            base = _overlay_png(ctx, base, static, n / ctx.fps, hook_end, 0.0 if alinti else 0.35, k, total); k += 1
    if b["sablon"] == "tekli" and b.get("altbaslik"):
        base = _overlay(ctx, base, tasarim.caption_panel(W, H, b["altbaslik"], stil, accent), hook_end, total, 0.4, k, total); k += 1
    for (s0, e0, top, bottom) in windows:
        s2 = max(s0 + 0.15, hook_end + 0.2 if s0 < hook_end else s0 + 0.15)
        e2 = e0 - 0.15
        if e2 - s2 < 0.8:
            continue
        img = tasarim.chip(W, H, top, stil, accent, "top" if bottom else "bottom-left")
        if bottom:
            low = tasarim.chip(W, H // 2, bottom, stil, accent, "top")
            img.alpha_composite(low, (0, H // 2 + int(min(W, H) * 0.02)))
        base = _overlay(ctx, base, img, s2, e2, 0.3, k, total); k += 1
    if b.get("cta") and total > 4:
        base = _overlay(ctx, base, tasarim.end_card(W, H, b["cta"], b.get("etiket"), stil, accent), total - 3.0, total, 0.5, k, total); k += 1
    if b.get("etiket") and b["sablon"] != "alinti":
        base = _overlay(ctx, base, tasarim.handle_mark(W, H, b["etiket"], stil), 0.0, total, 0.0, k, total); k += 1
    return base


def _overlay_png(ctx, base, png, start, end, fade, k, total):
    idx = ctx.add_input(["-loop", "1", "-framerate", ctx.fps, "-t", f"{total:.3f}", "-i", png])
    ctx.lines += ffilters.overlay_chain(base, idx, f"ov{k}", start, end, fade=fade, uid=f"o{k}")
    return f"ov{k}"


def render_video(b, clips, out_dir, progress):
    W, H = config.FORMATS[b["format"]]
    ctx = _Ctx(W, H, b, out_dir)
    font, accent = b.get("yazi_tipi"), b["vurgu"]
    # geçiş en kısa klibin yarısından uzun olamaz (yoksa zaman çizelgesi çöker)
    T = min(b["gecis_suresi"], 0.45 * min(c["dur"] for c in clips)) if len(clips) > 1 else 0.0
    labels, durs, windows = [], [], []
    if b["sablon"] == "eskiden-simdi" and len(clips) >= 2:
        pairs = [clips[i:i + 2] for i in range(0, len(clips), 2)]
        t = 0.0
        for k, pair in enumerate(pairs):
            off = t - (T if k else 0.0)
            if len(pair) == 2:
                vids = [x["dur"] for x in pair if x["kind"] == "video"]
                d = (max(vids) if vids else pair[0]["dur"])  # fotoğraflar videonun süresine uyar
                for x in pair:
                    x["dur"] = d if x["kind"] == "foto" else min(x["dur"], d)
                Ht = (H // 2) & ~1  # çift yükseklik: tek sayılı yükseklik ffmpeg'i çökertiyordu (4:5)
                _emit_clip(ctx, pair[0], 2 * k, f"t{k}", W, Ht, off, T, True)
                _emit_clip(ctx, pair[1], 2 * k + 1, f"b{k}", W, H - Ht, off, T, True)
                ctx.lines.append(f"[t{k}][b{k}]vstack,settb=AVTB,fps={ctx.fps},format=yuv420p[v{k}]")
                lang = b.get("dil") or "tr"
                windows.append((off, off + d, pair[0].get("label") or i18n.t(lang, "ESKİDEN"), pair[1].get("label") or i18n.t(lang, "ŞİMDİ")))
            else:
                d = pair[0]["dur"]
                _emit_clip(ctx, pair[0], 2 * k, f"v{k}", W, H, off, T, True)
            labels.append(f"v{k}"); durs.append(d)
            t = off + d
    else:
        t = 0.0
        for i, c in enumerate(clips):
            off = t - (T if i else 0.0)
            _emit_clip(ctx, c, i, f"v{i}", W, H, off, T, True)
            labels.append(f"v{i}"); durs.append(c["dur"])
            if c.get("label"):
                windows.append((off, off + c["dur"], c["label"], None))
            t = off + c["dur"]
    base, total = _xfade(ctx, labels, durs, T)
    stil = b.get("stil") or "klasik"
    if stil in tasarim.STYLES:
        base = _styled_cards(ctx, b, clips, windows, base, total, W, H, stil)
    else:
        base = _classic_cards(ctx, b, windows, base, total, W, H)
    _audio(ctx, total)
    out = out_dir / f"{_slug(b['baslik'] or b['sablon'])}-{b['format'].replace(':', 'x')}.mp4"
    progress(f"render: {len(clips)} klip, {total:.1f} sn, {W}x{H}")
    cover = _encode(ctx, base, total, out, progress)
    if b["sablon"] == "alinti":  # ayrıca JPG kart
        if b.get("stil") in tasarim.STYLES:
            img, _, _ = tasarim.preview(clips[0]["path"], clips[0]["kind"], b["baslik"] or "", b["stil"], _accent_for(b, clips),
                                        W=W, H=H, sub=b.get("altbaslik") or None, at=clips[0].get("start", 0) + 0.5)
            img.save(out_dir / "alinti.jpg", quality=92)
        else:
            still = text_overlay.fit_image(text_overlay._open(clips[0]["path"] if clips[0]["kind"] == "foto" else str(cover)), W, H, "kirp").convert("RGBA")
            still.alpha_composite(text_overlay.quote_card(W, H, b["baslik"] or "", b.get("altbaslik"), accent, font))
            still.convert("RGB").save(out_dir / "alinti.jpg", quality=92)
    return {"output": str(out), "cover": str(cover), "duration": round(total, 2)}


def render_carousel(b, clips, out_dir, progress):
    W, H = config.FORMATS[b["format"]]
    files = []
    n = len(clips)
    for i, c in enumerate(clips, 1):
        src = c["path"]
        if c["kind"] == "video":
            frame = out_dir / f"kare-{i}.jpg"
            media.run_ffmpeg(["-ss", f"{c['start']:.3f}", "-i", src, "-frames:v", "1", "-q:v", "2", frame])
            src = frame
        mode = b["sigdirma"] if b["sigdirma"] in ("kirp", "bulanik", "sigdir") else "kirp"
        img = text_overlay.carousel_slide(src, W, H, i, n, b["baslik"] if i == 1 else None, b.get("etiket"), b["vurgu"], mode, b.get("yazi_tipi"), b["renk"])
        f = out_dir / f"slayt-{i:02d}.jpg"
        img.save(f, "JPEG", quality=92)
        files.append(str(f))
        progress(f"  slayt {i}/{n}")
    return {"output": str(out_dir), "cover": files[0], "duration": 0, "dosyalar": files}


def render_fix(b, clips, out_dir, progress):
    c = next((c for c in clips if c["kind"] == "video"), None)
    if not c:
        raise ValueError("'yeniden' şablonu bir video ister")
    out = out_dir / f"{_slug(Path(c['path']).stem)}-duzeltilmis-{b['format'].replace(':', 'x')}.mp4"
    crf, preset = (18, "medium") if b["kalite"] == "yuksek" else (23, "veryfast")
    r = fix.fix_video(c["path"], out, b["format"], b["sigdirma"] if b["sigdirma"] != "otomatik" else "otomatik",
                      stabilize=bool(b.get("sabitle")), denoise=bool(b.get("gurultu")), sharpen=bool(b.get("keskinlik", True)),
                      color=bool(b.get("renk_duzelt", True)), start=c["start"], max_dur=min(c["dur"], b["max_sure"]), headline=b.get("baslik") or None,
                      handle=b.get("etiket") or None, accent=b["vurgu"], bg=b["renk"], font=b.get("yazi_tipi"), fps=b["fps"],
                      crf=crf, preset=preset, progress=progress)
    cover = out.with_name("kapak.jpg")
    media.run_ffmpeg(["-ss", f"{min(1.5, r['duration'] * 0.3):.2f}", "-i", out, "-frames:v", "1", "-q:v", "3", cover])
    return {"output": str(out), "cover": str(cover), "duration": r["duration"]}


# ---------------------------------------------------------------- giriş noktası
def render(con, brief, progress=print):
    """Brief'e göre üretim yapar; çıktı bilgilerini döndürür."""
    b = normalize_brief(brief)
    b["dil"] = i18n.norm(b.get("dil") or i18n.lang_of(con))
    config.ensure_dirs()
    if b.get("stil") == "otomatik":  # konuya göre stil: kitap → editoryal, çocuk → masal, hayvan/kutlama → pop…
        from . import konu
        its = db.get_items(con, [o["id"] for o in b["ogeler"]][:3])
        b["stil"] = tasarim.style_for([k for it in its for k, _ in konu.topics(it)])
    out_dir = _out_dir(b["baslik"] or b["sablon"])
    (out_dir / "brief.json").write_text(json.dumps(b, ensure_ascii=False, indent=2), encoding="utf-8")
    clips = build_clips(con, b, progress)
    if b["sablon"] == "carousel":
        res = render_carousel(b, clips, out_dir, progress)
    elif b["sablon"] == "yeniden":
        res = render_fix(b, clips, out_dir, progress)
    else:
        res = render_video(b, clips, out_dir, progress)
    from . import marketing
    caption = marketing.caption(b, [c["item"] for c in clips], lang=b["dil"])
    (out_dir / "aciklama.txt").write_text(caption, encoding="utf-8")
    res.update(caption=caption, klasor=str(out_dir), sablon=b["sablon"], format=b["format"])
    progress(f"Hazır: {res['output']}")
    return res
