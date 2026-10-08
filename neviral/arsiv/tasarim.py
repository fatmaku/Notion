"""neviral tasarım sistemi: 5 stil (+klasik), görüntüden renk paleti, hareketli yazı (kelime kelime animasyon),
stile özel renk derecelendirme (color grade), film greni, vinyet, sinema bantları. Yazılar platform güvenli alanında kalır."""
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

from . import media
from .text_overlay import safe_zone

FONT_DIR = Path(__file__).parent / "fonts"

STYLES = {
    "editoryal": {"ad": ("Editoryal", "Editorial", "Editorial"),
                  "aciklama": ("Zarif serif başlık, ince çizgi, film greni, sıcak ton", "Elegante Serifen, feine Linie, Filmkorn, warmer Look",
                               "Elegant serif, hairline rule, film grain, warm look"),
                  "baslik": "Gloock-Regular.ttf", "metin": "InstrumentSans-Regular.ttf", "metin_kalin": "InstrumentSans-Bold.ttf",
                  "buyuk": False, "anim": "satir", "panel": None, "renk_yazi": "#F7F1E8"},
    "pop": {"ad": ("Pop", "Pop", "Pop"),
            "aciklama": ("Kalın büyük harfler, fosforlu kalem vurgusu, kelime kelime patlayan yazı", "Fette Versalien, Textmarker, Wort für Wort",
                         "Bold caps, highlighter marks, word-by-word pop"),
            "baslik": "BricolageGrotesque-Bold.ttf", "metin": "Outfit-Regular.ttf", "metin_kalin": "Outfit-Bold.ttf",
            "buyuk": True, "anim": "kelime", "panel": "isaret", "renk_yazi": "#111111"},
    "masal": {"ad": ("Masal", "Märchen", "Storybook"),
              "aciklama": ("Çocuk kitabı hissi: yumuşak kâğıt kart, sevimli serif, süzülen yazı", "Kinderbuch-Gefühl: weiche Papierkarte, freundliche Serifen",
                           "Children's-book feel: soft paper card, friendly serif"),
              "baslik": "YoungSerif-Regular.ttf", "metin": "Outfit-Regular.ttf", "metin_kalin": "Outfit-Bold.ttf",
              "buyuk": False, "anim": "suzul", "panel": "kagit", "renk_yazi": "#2B2335"},
    "minimal": {"ad": ("Minimal", "Minimal", "Minimal"),
                "aciklama": ("Sade alt yazı paneli, modern sans, yumuşak kayma", "Schlichtes Panel unten, moderne Grotesk, sanftes Einblenden",
                             "Clean lower-third panel, modern sans, soft slide"),
                "baslik": "InstrumentSans-Bold.ttf", "metin": "InstrumentSans-Regular.ttf", "metin_kalin": "InstrumentSans-Bold.ttf",
                "buyuk": False, "anim": "kay", "panel": "cam", "renk_yazi": "#FFFFFF"},
    "sinema": {"ad": ("Sinema", "Kino", "Cinema"),
               "aciklama": ("Sinema bantları, geniş aralıklı başlık, turkuaz-turuncu ton, gren", "Kinobalken, gesperrte Versalien, Teal-Orange, Korn",
                            "Letterbox bars, tracked caps, teal-orange grade, grain"),
               "baslik": "BigShoulders-Bold.ttf", "metin": "CrimsonPro-Italic.ttf", "metin_kalin": "CrimsonPro-Regular.ttf",
               "buyuk": True, "anim": "acil", "panel": None, "renk_yazi": "#FFFFFF", "aralik": 0.12},
}
LANG_IDX = {"tr": 0, "de": 1, "en": 2}
TOPIC_STYLE = {"kitap": "editoryal", "cocuk": "masal", "okul": "masal", "hayvan": "pop", "kutlama": "pop", "yemek": "pop",
               "seyahat": "sinema", "sahne": "sinema", "noro": "minimal", "gunluk": "minimal"}


def style_for(topic_keys):
    for k in topic_keys or []:
        if k in TOPIC_STYLE:
            return TOPIC_STYLE[k]
    return "minimal"


def style_list(lang="tr"):
    li = LANG_IDX.get(lang, 0)
    return [{"key": k, "ad": v["ad"][li], "aciklama": v["aciklama"][li]} for k, v in STYLES.items()]


def font(name, size):
    p = FONT_DIR / name
    try:
        return ImageFont.truetype(str(p), max(8, int(size)))
    except OSError:
        from .text_overlay import load_font
        return load_font(size)


def _hex(c, a=255):
    c = c.lstrip("#")
    return (int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16), a)


def _lum(rgb):
    r, g, b = [x / 255 for x in rgb[:3]]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


# ---------------------------------------------------------------- görüntüden palet
def palette(path):
    """Görüntünün baskın renklerinden uyumlu bir vurgu rengi (#RRGGBB) ve koyu ton döndürür."""
    try:
        img = (path if isinstance(path, Image.Image) else media.open_image(path, draft=(200, 200))).convert("RGB")
        img.thumbnail((120, 120))
        q = img.quantize(colors=6, method=Image.Quantize.MEDIANCUT)
        pal = q.getpalette()[:18]
        counts = sorted(q.getcolors(), reverse=True)
        cols = [tuple(pal[i * 3:i * 3 + 3]) for _, i in counts]
    except Exception:
        return {"vurgu": "#FFD166", "koyu": "#14121A"}
    import colorsys

    def sat(c):
        h, l, s = colorsys.rgb_to_hls(*[x / 255 for x in c])
        return s * (1 - abs(l - 0.55))
    best = max(cols, key=sat)
    h, l, s = colorsys.rgb_to_hls(*[x / 255 for x in best])
    # vurguyu canlı ve okunur yap: doygunluk ≥0.55, açıklık 0.62
    r, g, b = colorsys.hls_to_rgb(h, 0.62, max(0.55, min(0.9, s + 0.25)))
    dark = colorsys.hls_to_rgb(h, 0.1, min(0.5, s))
    return {"vurgu": "#%02X%02X%02X" % (int(r * 255), int(g * 255), int(b * 255)),
            "koyu": "#%02X%02X%02X" % tuple(int(x * 255) for x in dark)}


# ---------------------------------------------------------------- renk derecelendirme
def grade(style, W, H, grain=True):
    """Stile özel ffmpeg filtre zinciri (video katmanına, yazılardan önce)."""
    hf = lambda f: media.has_filter(f) and (grain or f != "noise")  # noqa: E731
    parts = []
    if style == "editoryal":
        parts.append("eq=contrast=1.05:saturation=0.9:gamma=1.02")
        if hf("colorbalance"):
            parts.append("colorbalance=rs=0.04:gs=0.01:bs=-0.04:rh=0.03:bh=-0.03")
        if hf("vignette"):
            parts.append("vignette=PI/5")
        if hf("noise"):
            parts.append("noise=alls=5:allf=t+u")
    elif style == "pop":
        parts.append("eq=contrast=1.1:saturation=1.25")
    elif style == "masal":
        parts.append("eq=brightness=0.02:saturation=1.06:gamma=1.04")
        if hf("colorbalance"):
            parts.append("colorbalance=rs=0.03:bs=-0.02:rm=0.02")
        if hf("vignette"):
            parts.append("vignette=PI/6")
    elif style == "minimal":
        parts.append("eq=contrast=1.03")
    elif style == "sinema":
        parts.append("eq=contrast=1.08:saturation=0.95")
        if hf("colorbalance"):
            parts.append("colorbalance=rs=-0.05:gs=0.0:bs=0.06:rh=0.06:gh=0.01:bh=-0.05")
        if hf("vignette"):
            parts.append("vignette=PI/4.5")
        if hf("noise"):
            parts.append("noise=alls=6:allf=t+u")
        bar = int(H * 0.055) if H > W else int(H * 0.09)
        parts.append(f"drawbox=x=0:y=0:w=iw:h={bar}:color=black:t=fill,drawbox=x=0:y=ih-{bar}:w=iw:h={bar}:color=black:t=fill")
    return ",".join(parts)


# ---------------------------------------------------------------- yerleşim
def _split_long(draw, word, fnt, maxw, track=0.0):
    """Tek başına satıra sığmayan kelimeyi (uzun hashtag, URL, boşluksuz yazı) harf harf böler."""
    parts, cur = [], ""
    for ch in word:
        if cur and _tw(draw, cur + ch, fnt, track) > maxw:
            parts.append(cur); cur = ch
        else:
            cur += ch
    return parts + ([cur] if cur else [])


def _wrap(draw, text, fnt, maxw, track=0.0):
    words, lines, cur = [], [], []
    for w in str(text).split():
        words += _split_long(draw, w, fnt, maxw, track) if _tw(draw, w, fnt, track) > maxw else [w]
    for w in words:
        cand = " ".join(cur + [w])
        if _tw(draw, cand, fnt, track) <= maxw or not cur:
            cur.append(w)
        else:
            lines.append(cur); cur = [w]
    if cur:
        lines.append(cur)
    return lines


def _tw(draw, text, fnt, track=0.0):
    w = draw.textbbox((0, 0), text, font=fnt)[2]
    return w + int(track * fnt.size * max(0, len(text) - 1))


def _draw_text(d, xy, text, fnt, fill, track=0.0, shadow=None):
    x, y = xy
    if not track:
        if shadow:
            d.text((x + shadow[0], y + shadow[1]), text, font=fnt, fill=shadow[2])
        d.text((x, y), text, font=fnt, fill=fill)
        return
    for ch in text:
        if shadow:
            d.text((x + shadow[0], y + shadow[1]), ch, font=fnt, fill=shadow[2])
        d.text((x, y), ch, font=fnt, fill=fill)
        x += d.textbbox((0, 0), ch, font=fnt)[2] + int(track * fnt.size)


def layout_hook(text, style, W, H, pos="center"):
    """Kanca yazısını satır/kelime konumlarına yerleştirir (animasyonda her kare bu planı kullanır)."""
    st = STYLES[style]
    z = safe_zone(W, H)
    S = min(W, H)
    txt = str(text).upper() if st["buyuk"] else str(text)
    track = st.get("aralik", 0.0)
    maxw = int((W - z["left"] - z["right"]) * 0.9)
    size = int(S * (0.105 if st["buyuk"] else 0.088))
    probe = ImageDraw.Draw(Image.new("RGBA", (10, 10)))
    for _ in range(12):
        fnt = font(st["baslik"], size)
        lines = _wrap(probe, txt, fnt, maxw, track)
        lh = int(size * (1.08 if st["buyuk"] else 1.18))
        if len(lines) <= 4 and all(_tw(probe, " ".join(l), fnt, track) <= maxw for l in lines):
            break
        size = int(size * 0.9)
    block_h = len(lines) * lh
    avail_top, avail_bot = z["top"], H - z["bottom"]
    if pos == "top":
        y0 = avail_top + int(S * 0.04)
    elif pos == "bottom":
        y0 = avail_bot - block_h - int(S * 0.05)
    else:
        y0 = avail_top + (avail_bot - avail_top - block_h) // 2 - int(S * 0.02)
    cx0, cx1 = z["left"], W - z["right"]
    words = []
    for li, line in enumerate(lines):
        lw = _tw(probe, " ".join(line), fnt, track)
        x = cx0 + (cx1 - cx0 - lw) // 2
        for w in line:
            ww = _tw(probe, w, fnt, track)
            words.append({"w": w, "x": x, "y": y0 + li * lh, "wdt": ww, "line": li})
            x += ww + _tw(probe, " ", fnt)
    return {"words": words, "font": fnt, "size": size, "lh": lh, "y0": y0, "h": block_h, "lines": len(lines), "track": track,
            "cx0": cx0, "cx1": cx1}


def _ease(t):
    t = max(0.0, min(1.0, t))
    return 1 - (1 - t) ** 3


def _back(t):
    t = max(0.0, min(1.0, t))
    c = 1.70158
    return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2


def hook_frame(lay, style, W, H, t, accent, sub=None, subfont=None):
    """t saniyesindeki tek kare (RGBA). Animasyon ~1.1 sn'de tamamlanır."""
    st = STYLES[style]
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    fnt, track, S = lay["font"], lay["track"], min(W, H)
    color = _hex(st["renk_yazi"])
    acc = _hex(accent)
    pad_x, pad_y = int(lay["size"] * 0.22), int(lay["size"] * 0.08)
    # arka panel / gölge zemin
    if st["panel"] == "kagit":
        a = _ease(t / 0.45)
        x0, x1 = lay["cx0"] - int(S * 0.01), lay["cx1"] + int(S * 0.01)
        y0, y1 = lay["y0"] - int(S * 0.06), lay["y0"] + lay["h"] + int(S * 0.125 if sub else S * 0.05)
        off = int((1 - a) * S * 0.05)
        sh = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ImageDraw.Draw(sh).rounded_rectangle([x0 + 10, y0 + 18 + off, x1 + 10, y1 + 18 + off], radius=int(S * 0.04), fill=(0, 0, 0, int(90 * a)))
        img.alpha_composite(sh.filter(ImageFilter.GaussianBlur(int(S * 0.02))))
        d.rounded_rectangle([x0, y0 + off, x1, y1 + off], radius=int(S * 0.04), fill=(250, 244, 233, int(245 * a)))
        d.rounded_rectangle([x0 + 14, y0 + 14 + off, x1 - 14, y1 - 14 + off], radius=int(S * 0.03), outline=acc[:3] + (int(200 * a),), width=3)
    elif st["panel"] == "cam":
        a = _ease(t / 0.4)
        x0, x1 = lay["cx0"], lay["cx1"]
        y0, y1 = lay["y0"] - int(S * 0.04), lay["y0"] + lay["h"] + int(S * (0.115 if sub else 0.04))
        off = int((1 - a) * S * 0.06)
        d.rounded_rectangle([x0, y0 + off, x1, y1 + off], radius=int(S * 0.035), fill=(12, 14, 20, int(170 * a)),
                            outline=(255, 255, 255, int(60 * a)), width=2)
        d.rounded_rectangle([x0 + int(S * 0.03), y0 + off + int(S * 0.025), x0 + int(S * 0.09), y0 + off + int(S * 0.025) + 6],
                            radius=3, fill=acc[:3] + (int(255 * a),))
    elif style in ("editoryal", "sinema"):
        # okunurluk için yumuşak karartma (yazının arkasında, kenarlara doğru söner)
        a = _ease(t / 0.5)
        glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow)
        gd.rounded_rectangle([lay["cx0"] - S * 0.05, lay["y0"] - S * 0.08, lay["cx1"] + S * 0.05, lay["y0"] + lay["h"] + S * 0.12],
                             radius=int(S * 0.1), fill=(0, 0, 0, int(120 * a)))
        img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(int(S * 0.06))))
    # kelimeler
    n = len(lay["words"])
    for i, w in enumerate(lay["words"]):
        anim = st["anim"]
        if anim == "kelime":
            start, durw = 0.08 + i * 0.11, 0.28
        elif anim == "satir":
            start, durw = 0.1 + w["line"] * 0.22, 0.55
        elif anim == "suzul":
            start, durw = 0.25 + w["line"] * 0.18 + (i % 3) * 0.03, 0.6
        elif anim == "kay":
            start, durw = 0.2 + w["line"] * 0.12, 0.45
        else:  # acil (sinema)
            start, durw = 0.15 + w["line"] * 0.25, 0.9
        p = (t - start) / durw
        if p <= 0:
            continue
        a = _ease(p)
        word_img = Image.new("RGBA", (w["wdt"] + 2 * pad_x + 20, lay["lh"] + 2 * pad_y + 20), (0, 0, 0, 0))
        wd = ImageDraw.Draw(word_img)
        if st["panel"] == "isaret":  # fosforlu kalem: kutu soldan sağa çizilir
            sweep = _ease(p * 1.4)
            bw = int((w["wdt"] + 2 * pad_x) * sweep)
            wd.rounded_rectangle([10, 10 + int(lay["lh"] * 0.12), 10 + bw, 10 + lay["lh"] + pad_y], radius=int(lay["size"] * 0.12), fill=acc)
        shadow = (3, 5, (0, 0, 0, int(140 * a))) if st["panel"] not in ("kagit", "isaret") else None
        fill = color[:3] + (int(255 * min(1, a * 1.2)),)
        _draw_text(wd, (10 + pad_x, 10 + pad_y), w["w"], fnt, fill, track, shadow)
        x, y = w["x"] - pad_x - 10, w["y"] - pad_y - 10
        if anim == "kelime":
            sc = 0.6 + 0.4 * _back(p)
            nw, nh = max(1, int(word_img.width * sc)), max(1, int(word_img.height * sc))
            word_img = word_img.resize((nw, nh), Image.LANCZOS)
            x += (word_img.width and ((w["wdt"] + 2 * pad_x + 20) - nw) // 2)
            y += ((lay["lh"] + 2 * pad_y + 20) - nh) // 2
        elif anim in ("satir", "kay"):
            y += int((1 - a) * lay["size"] * 0.5)
        elif anim == "suzul":
            y += int((1 - a) * lay["size"] * 0.7)
            x += int(math.sin((1 - a) * 3) * 6)
        elif anim == "acil":
            pass
        if a < 1:
            alpha = word_img.getchannel("A").point(lambda v, a=a: int(v * min(1, a * 1.15)))
            word_img.putalpha(alpha)
        img.alpha_composite(word_img, (int(x), int(y)))
    # vurgu çizgisi + alt satır
    if style in ("editoryal", "sinema"):
        p = _ease((t - 0.5) / 0.6)
        if p > 0:
            ln = int(S * 0.12 * p)
            cx = (lay["cx0"] + lay["cx1"]) // 2
            yy = lay["y0"] + lay["h"] + int(S * 0.025)
            d.rectangle([cx - ln // 2, yy, cx + ln // 2, yy + 3], fill=acc[:3] + (255,))
    if sub:
        p = _ease((t - 0.6) / 0.5)
        if p > 0:
            sf = font(subfont or st["metin"], int(S * 0.036))
            sw = _tw(d, sub, sf)
            sx = (lay["cx0"] + lay["cx1"] - sw) // 2
            sy = lay["y0"] + lay["h"] + int(S * 0.05)
            col = (60, 50, 70) if st["panel"] == "kagit" else (255, 255, 255)
            d.text((sx, sy + int((1 - p) * 12)), sub, font=sf, fill=col + (int(235 * p),))
    return img


def hook_sequence(text, style, W, H, out_dir, accent, fps=30, anim_dur=1.4, sub=None, pos="center"):
    """Animasyon kareleri (PNG) + tutma karesi. Dönüş: (desen, kare_sayisi, statik_png)."""
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    lay = layout_hook(text, style, W, H, pos)
    n = max(2, int(anim_dur * fps))
    for k in range(n):
        hook_frame(lay, style, W, H, k / fps, accent, sub).save(out_dir / f"hook_{k:04d}.png", compress_level=1)
    static = out_dir / "hook_static.png"
    hook_frame(lay, style, W, H, 5.0, accent, sub).save(static)
    return str(out_dir / "hook_%04d.png"), n, str(static)


# ---------------------------------------------------------------- statik stil kartları
def chip(W, H, text, style, accent, pos="bottom-left"):
    st = STYLES[style]
    z = safe_zone(W, H)
    S = min(W, H)
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    f = font(st["metin_kalin"], int(S * 0.038))
    t = str(text).upper() if st["buyuk"] else str(text)
    tw = _tw(d, t, f, st.get("aralik", 0))
    px, py = int(S * 0.022), int(S * 0.012)
    x = z["left"]
    y = H - z["bottom"] - f.size - 2 * py - int(S * 0.02) if pos.startswith("bottom") else z["top"]
    if style == "pop":
        d.rounded_rectangle([x, y, x + tw + 2 * px, y + f.size + 2 * py + 6], radius=int(S * 0.015), fill=_hex(accent))
        _draw_text(d, (x + px, y + py), t, f, (17, 17, 17, 255), st.get("aralik", 0))
    elif style == "masal":
        d.rounded_rectangle([x, y, x + tw + 2 * px, y + f.size + 2 * py + 6], radius=int(S * 0.04), fill=(250, 244, 233, 240))
        _draw_text(d, (x + px, y + py), t, f, (43, 35, 53, 255))
    elif style == "minimal":
        d.rounded_rectangle([x, y, x + tw + 2 * px, y + f.size + 2 * py + 6], radius=int(S * 0.02), fill=(12, 14, 20, 170),
                            outline=(255, 255, 255, 60), width=2)
        _draw_text(d, (x + px, y + py), t, f, (255, 255, 255, 255))
    else:  # editoryal / sinema: ince çizgi + yazı
        d.rectangle([x, y + f.size // 2, x + int(S * 0.04), y + f.size // 2 + 3], fill=_hex(accent))
        _draw_text(d, (x + int(S * 0.055), y), t, f, (255, 255, 255, 255), st.get("aralik", 0), (2, 3, (0, 0, 0, 160)))
    return img


def end_card(W, H, cta, handle, style, accent):
    """Kapanış kartı: harekete çağrı + hesap."""
    st = STYLES[style]
    S = min(W, H)
    img = Image.new("RGBA", (W, H), (0, 0, 0, int(140 if style != "masal" else 90)))
    lay = layout_hook(cta, style, W, H, "center")
    frame = hook_frame(lay, style, W, H, 5.0, accent)
    img.alpha_composite(frame)
    if handle:
        d = ImageDraw.Draw(img)
        f = font(st["metin_kalin"], int(S * 0.042))
        tw = _tw(d, handle, f)
        x = (lay["cx0"] + lay["cx1"] - tw) // 2
        y = lay["y0"] + lay["h"] + int(S * 0.07)
        d.rounded_rectangle([x - 22, y - 10, x + tw + 22, y + f.size + 16], radius=int(S * 0.03), fill=_hex(accent))
        d.text((x, y), handle, font=f, fill=(17, 17, 17, 255))
    return img


def handle_mark(W, H, handle, style):
    st = STYLES[style]
    z = safe_zone(W, H)
    S = min(W, H)
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    f = font(st["metin_kalin"], int(S * 0.03))
    tw = _tw(d, handle, f)
    x, y = W - z["right"] - tw, z["top"] - int(S * 0.005)
    d.text((x + 2, y + 3), handle, font=f, fill=(0, 0, 0, 120))
    d.text((x, y), handle, font=f, fill=(255, 255, 255, 215))
    return img


def caption_panel(W, H, text, style, accent):
    """Uzun açıklama (tekli şablon): alt güvenli alanda stile uygun panel."""
    st = STYLES[style]
    z = safe_zone(W, H)
    S = min(W, H)
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    f = font(st["metin"], int(S * 0.042))
    maxw = W - z["left"] - z["right"] - int(S * 0.08)
    lines = [" ".join(l) for l in _wrap(d, text, f, maxw)][:5]
    lh = int(f.size * 1.3)
    h = len(lines) * lh + int(S * 0.06)
    y0 = H - z["bottom"] - h - int(S * 0.02)
    x0, x1 = z["left"], W - z["right"]
    if st["panel"] == "kagit":
        d.rounded_rectangle([x0, y0, x1, y0 + h], radius=int(S * 0.035), fill=(250, 244, 233, 238))
        col = (43, 35, 53, 255)
    elif st["panel"] == "isaret":
        d.rounded_rectangle([x0, y0, x1, y0 + h], radius=int(S * 0.02), fill=(17, 17, 17, 225))
        d.rectangle([x0, y0, x0 + 10, y0 + h], fill=_hex(accent))
        col = (255, 255, 255, 255)
    else:
        d.rounded_rectangle([x0, y0, x1, y0 + h], radius=int(S * 0.03), fill=(12, 14, 20, 175), outline=(255, 255, 255, 50), width=2)
        col = (255, 255, 255, 255)
    for i, ln in enumerate(lines):
        d.text((x0 + int(S * 0.04), y0 + int(S * 0.03) + i * lh), ln, font=f, fill=col)
    return img


# ---------------------------------------------------------------- önizleme + okunurluk puanı
def placeholder(W, H, accent="#5B6CFF"):
    """Kaynak açılamadığında tasarımın yine de görülebilmesi için yumuşak degrade arka plan."""
    acc = _hex(accent)[:3]
    top, bot = (22, 24, 34), tuple(int(c * 0.35 + d * 0.65) for c, d in zip(acc, (14, 12, 20)))
    t = np.linspace(0.0, 1.0, H, dtype=np.float32)[:, None, None]
    arr = np.asarray(top, dtype=np.float32) * (1 - t) + np.asarray(bot, dtype=np.float32) * t
    img = Image.fromarray(np.repeat(arr, W, axis=1).astype(np.uint8), "RGB")
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse([W * 0.15, H * 0.2, W * 0.85, H * 0.65], fill=acc + (70,))
    glow = glow.filter(ImageFilter.GaussianBlur(min(W, H) * 0.18))
    out = img.convert("RGBA")
    out.alpha_composite(glow)
    return out.convert("RGB")


def video_frame(src_path, at=1.0):
    """Videodan tek kare (JPEG yolu). Kısa videolarda başa döner; kare çıkmazsa MediaError."""
    import shutil
    import tempfile
    d = Path(tempfile.mkdtemp(prefix="nv-"))
    tmp = d / "f.jpg"
    for t in sorted({max(0.0, at), 0.0}, reverse=True):
        try:
            media.run_ffmpeg(["-ss", f"{t:.2f}", "-i", src_path, "-frames:v", "1", "-q:v", "3", tmp])
        except media.MediaError:
            continue
        if tmp.exists() and tmp.stat().st_size > 0:
            try:
                img = media.open_image(tmp).convert("RGB")
                img.load()
                return img
            except Exception:
                pass
    shutil.rmtree(d, ignore_errors=True)
    raise media.MediaError("videodan kare alınamadı")


def preview(src_path, kind, text, style, accent=None, W=540, H=960, sub=None, at=1.0):
    """Stilin hazır bir karesi (tasarımları karşılaştırmak için) ve okunurluk/dikkat puanı.
    Kaynak yoksa/açılamazsa degrade bir arka plan kullanır (kaynak_yok=True ile anlaşılır)."""
    from .text_overlay import fit_image
    base = None
    if src_path:
        try:
            if kind == "video":
                base = video_frame(src_path, at)
            else:
                base = media.open_image(src_path, draft=(W * 2, H * 2)).convert("RGB")
                base.load()
        except Exception:
            base = None
    if base is None:
        accent = accent or "#5B6CFF"
        img = placeholder(W, H, accent)
    else:
        img = _grade_preview(fit_image(base, W, H, "kirp"), style)
        accent = accent or palette(base)["vurgu"]
    lay = layout_hook(text, style, W, H)
    over = hook_frame(lay, style, W, H, 5.0, accent, sub)
    out = img.convert("RGBA")
    out.alpha_composite(over)
    if style == "sinema":
        bar = int(H * 0.055)
        dd = ImageDraw.Draw(out)
        dd.rectangle([0, 0, W, bar], fill=(0, 0, 0, 255)); dd.rectangle([0, H - bar, W, H], fill=(0, 0, 0, 255))
    return out.convert("RGB"), legibility(img, over, lay), accent


def _grade_preview(img, style):
    from PIL import ImageEnhance
    if style == "pop":
        img = ImageEnhance.Color(ImageEnhance.Contrast(img).enhance(1.1)).enhance(1.25)
    elif style == "editoryal":
        img = ImageEnhance.Color(img).enhance(0.9)
        r, g, b = img.split()
        img = Image.merge("RGB", (r.point(lambda v: min(255, v + 8)), g, b.point(lambda v: max(0, v - 8))))
    elif style == "sinema":
        r, g, b = img.split()
        img = Image.merge("RGB", (r.point(lambda v: min(255, int(v * 1.04))), g, b.point(lambda v: min(255, int(v * 1.05 + 6)))))
    elif style == "masal":
        img = ImageEnhance.Brightness(img).enhance(1.04)
    return img


def legibility(base, overlay, lay):
    """Yazı ile arka plan arasındaki karşıtlık + yazı büyüklüğü → 0-100 (okunurluk/dikkat çekme tahmini)."""
    a = np.asarray(overlay, dtype=np.float32)
    mask = a[..., 3] > 200
    if mask.sum() < 50:
        return 50.0
    b = np.asarray(base.convert("RGB"), dtype=np.float32)
    comp = np.asarray(Image.alpha_composite(base.convert("RGBA"), overlay).convert("RGB"), dtype=np.float32)
    lum = lambda x: 0.2126 * x[..., 0] + 0.7152 * x[..., 1] + 0.0722 * x[..., 2]  # noqa: E731
    text_l = lum(comp)[mask].mean()
    ys, xs = np.where(mask)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    ring = lum(comp)[max(0, y0 - 20):y1 + 20, max(0, x0 - 20):x1 + 20]
    bg_l = np.median(ring)
    contrast = (max(text_l, bg_l) + 13) / (min(text_l, bg_l) + 13)
    size = lay["size"] / overlay.width
    busy = float(np.abs(np.diff(lum(b)[y0:y1 + 1, x0:x1 + 1], axis=1)).mean()) if y1 > y0 and x1 > x0 else 10
    score = 45 * min(1, (contrast - 1) / 6) + 35 * min(1, size / 0.09) + 20 * max(0, 1 - busy / 30)
    return round(float(score), 1)
