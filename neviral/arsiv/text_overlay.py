"""Pillow ile yazı kartları (şeffaf PNG), fotoğraf ön işleme ve carousel görselleri.
ffmpeg'in drawtext desteğine bağımlı kalmamak için tüm yazılar burada çizilir."""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

BOLD_NAMES = ["Arial Bold.ttf", "Helvetica.ttc", "HelveticaNeue.ttc", "Arial.ttf", "DejaVuSans-Bold.ttf", "FreeSansBold.ttf",
              "NotoSans-Bold.ttf", "Roboto-Bold.ttf", "arialbd.ttf", "LiberationSans-Bold.ttf"]
REG_NAMES = ["Arial.ttf", "Helvetica.ttc", "DejaVuSans.ttf", "FreeSans.ttf", "NotoSans-Regular.ttf", "Roboto-Regular.ttf",
             "arial.ttf", "LiberationSans-Regular.ttf"]
FONT_DIRS = ["/System/Library/Fonts/Supplemental", "/System/Library/Fonts", "/Library/Fonts", str(Path.home() / "Library/Fonts"),
             "/usr/share/fonts/truetype/dejavu", "/usr/share/fonts/truetype/freefont", "/usr/share/fonts/truetype/noto",
             "/usr/share/fonts/truetype/liberation", "/usr/share/fonts", "C:/Windows/Fonts"]


def find_font(weight="bold", custom=None):
    if custom and Path(custom).expanduser().exists():
        return str(Path(custom).expanduser())
    for d in FONT_DIRS:
        for n in (BOLD_NAMES if weight == "bold" else REG_NAMES):
            p = Path(d) / n
            if p.exists():
                return str(p)
    return None


def load_font(size, weight="bold", custom=None):
    size = max(8, int(size))
    p = find_font(weight, custom)
    try:
        if p:
            f = ImageFont.truetype(p, size)
            if p.endswith(".ttc") and weight == "bold":
                try:
                    f = ImageFont.truetype(p, size, index=1)
                except Exception:
                    pass
            return f
    except Exception:
        pass
    return ImageFont.load_default(size=size)


def rgba(hex_color, alpha=255):
    h = (hex_color or "#ffffff").lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), int(alpha))


def _text_w(draw, text, font):
    box = draw.textbbox((0, 0), text, font=font)
    return box[2] - box[0]


def _break_word(draw, word, font, max_w):
    """Tek başına satıra sığmayan uzun kelimeyi (ör. Almanca bileşik kelimeler) tireyle böler."""
    parts, cur = [], ""
    for ch in word:
        if _text_w(draw, cur + ch + "-", font) > max_w and cur:
            parts.append(cur + "-")
            cur = ch
        else:
            cur += ch
    parts.append(cur)
    return parts


def wrap_text(draw, text, font, max_w):
    lines = []
    for para in str(text).split("\n"):
        words, cur = para.split(), ""
        if not words:
            lines.append("")
            continue
        for w in words:
            pieces = _break_word(draw, w, font, max_w) if _text_w(draw, w, font) > max_w else [w]
            for piece in pieces:
                cand = (cur + " " + piece).strip()
                if _text_w(draw, cand, font) <= max_w or not cur:
                    cur = cand
                else:
                    lines.append(cur)
                    cur = piece
        lines.append(cur)
    return lines


def safe_zone(W, H):
    """Platform arayüzünün kapattığı alanlar (px): Reels/TikTok/Shorts'ta üstte hesap adı, altta açıklama+düğmeler,
    sağda beğen/yorum sütunu. Yazılar bu alanların dışına yerleştirilir."""
    if H / W >= 1.6:  # 9:16
        return {"top": int(H * 0.11), "bottom": int(H * 0.21), "left": int(W * 0.06), "right": int(W * 0.13)}
    m = int(min(W, H) * 0.06)
    return {"top": m, "bottom": m, "left": m, "right": m}


def card(size, blocks, valign="center", y=None, dim=0.0, gradient=None, font_path=None, margin=None, safe=True):
    """Şeffaf kart. blocks: [{text,size,weight,color,align,box,box_alpha,pad,shadow,upper,spacing,maxw}] ya da
    {'rule': True, 'color': '#..', 'width': 90} (kısa vurgu çizgisi).  valign: top|center|bottom, y: grup üstü (0-1).
    Yazı her zaman güvenli alanın içinde kalır; sığmazsa yazı boyutu küçültülür."""
    W, H = size
    z = safe_zone(W, H) if safe else {"top": int(H * 0.04), "bottom": int(H * 0.04), "left": int(W * 0.05), "right": int(W * 0.05)}
    if margin is not None:
        z = {k: max(v, int((H if k in ("top", "bottom") else W) * margin)) for k, v in z.items()}
    avail_w, avail_h = W - z["left"] - z["right"], H - z["top"] - z["bottom"]
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    if dim:
        img.alpha_composite(Image.new("RGBA", (W, H), (0, 0, 0, int(255 * dim))))
    if gradient in ("bottom", "top"):
        g = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        gd = ImageDraw.Draw(g)
        span = int(H * 0.5)
        for i in range(span):
            a = int(200 * (i / span) ** 1.6)
            yy = H - span + i if gradient == "bottom" else span - i
            gd.line([(0, yy), (W, yy)], fill=(0, 0, 0, a))
        img.alpha_composite(g)
    gap = int(H * 0.012)

    def measure(scale):
        laid, total_h = [], 0
        for b in blocks:
            if b.get("rule"):
                laid.append(("rule", b, int(b.get("height", 6))))
                total_h += int(b.get("height", 6)) + gap * 3
                continue
            font = load_font(b.get("size", 48) * scale, b.get("weight", "bold"), font_path)
            text = str(b.get("text") or "")
            if b.get("upper"):
                text = text.upper()
            pad = int(b.get("pad", 0) * scale)
            max_w = min(avail_w, int(W * b.get("maxw", 1.0))) - 2 * pad
            lines = wrap_text(draw, text, font, max(40, max_w))
            lh = int(font.size * b.get("spacing", 1.18))
            mode = b.get("box_mode", "line") if b.get("box") else None
            h = len(lines) * (lh + (2 * pad if mode == "line" else 0)) + (2 * pad if mode == "block" else 0)
            laid.append(("text", b, h, font, lines, lh, pad))
            total_h += h + gap
        return laid, max(0, total_h - gap)

    scale = 1.0
    laid, total_h = measure(scale)
    while total_h > avail_h and scale > 0.4:  # sığmıyorsa küçült
        scale *= 0.88
        laid, total_h = measure(scale)
    lo, hi = z["top"], H - z["bottom"] - total_h
    if y is not None:
        cy = int(H * y)
    elif valign == "top":
        cy = lo
    elif valign == "bottom":
        cy = hi
    else:
        cy = z["top"] + (avail_h - total_h) // 2
    cy = max(lo, min(cy, max(lo, hi)))
    cx0, cx1 = z["left"], W - z["right"]

    def xpos(align, w):
        if align == "left":
            return cx0
        if align == "right":
            return cx1 - w
        return cx0 + (cx1 - cx0 - w) // 2

    for entry in laid:
        if entry[0] == "rule":
            _, b, h = entry
            w = int(b.get("width", 90) * scale)
            x = xpos(b.get("align", "center"), w)
            draw.rounded_rectangle([x, cy + gap, x + w, cy + gap + h], radius=h // 2, fill=rgba(b.get("color", "#FFD166")))
            cy += h + gap * 3
            continue
        _, b, h, font, lines, lh, pad = entry
        align = b.get("align", "center")
        color = rgba(b.get("color", "#ffffff"), b.get("alpha", 255))
        box = b.get("box")
        mode = b.get("box_mode", "line") if box else None
        yy = cy
        if mode == "block":
            wmax = max(_text_w(draw, ln, font) for ln in lines) + 2 * pad
            x0 = xpos(align, wmax)
            draw.rounded_rectangle([x0, yy, x0 + wmax, yy + h], radius=int(b.get("radius", 18)), fill=rgba(box, b.get("box_alpha", 255)))
            yy += pad
        for ln in lines:
            tw = _text_w(draw, ln, font)
            x = xpos(align, tw + (2 * pad if mode == "line" else 0)) + (pad if mode == "line" else 0)
            if mode == "line" and ln:
                draw.rounded_rectangle([x - pad, yy, x + tw + pad, yy + lh + 2 * pad - int(lh * 0.1)], radius=int(b.get("radius", 14)),
                                       fill=rgba(box, b.get("box_alpha", 255)))
            ty = yy + pad if mode == "line" else yy
            if b.get("shadow", True):
                draw.text((x + 3, ty + 3), ln, font=font, fill=(0, 0, 0, 150))
            draw.text((x, ty), ln, font=font, fill=color)
            yy += lh + (2 * pad if mode == "line" else 0)
        cy += h + gap
    return img


# ---------------------------------------------------------------- hazır kartlar
def intro_card(W, H, title, subtitle=None, accent="#FFD166", font_path=None):
    blocks = [{"text": title, "size": int(min(W, H) * 0.085), "weight": "bold", "color": "#ffffff"},
              {"rule": True, "color": accent, "width": int(min(W, H) * 0.09)}]
    if subtitle:
        blocks.append({"text": subtitle, "size": int(min(W, H) * 0.038), "weight": "regular", "color": "#ffffff", "alpha": 235, "maxw": 0.8})
    return card((W, H), blocks, dim=0.35, font_path=font_path)


def label_card(W, H, text, accent="#FFD166", pos="bottom-left", font_path=None):
    align = "left" if pos.endswith("left") else ("right" if pos.endswith("right") else "center")
    valign = "top" if pos.startswith("top") else "bottom"
    block = {"text": text, "size": int(min(W, H) * 0.042), "weight": "bold", "color": "#111111", "align": align,
             "box": accent, "pad": int(min(W, H) * 0.016), "shadow": False, "maxw": 0.84}
    return card((W, H), [block], valign=valign, font_path=font_path)


def cta_card(W, H, cta, handle=None, accent="#FFD166", font_path=None):
    blocks = [{"text": cta, "size": int(min(W, H) * 0.07), "weight": "bold", "color": "#ffffff"}]
    if handle:
        blocks.append({"text": handle, "size": int(min(W, H) * 0.04), "weight": "bold", "color": "#111111", "box": accent,
                       "pad": int(min(W, H) * 0.018), "shadow": False, "box_mode": "block"})
    return card((W, H), blocks, dim=0.5, font_path=font_path)


def handle_card(W, H, handle, font_path=None):
    return card((W, H), [{"text": handle, "size": int(min(W, H) * 0.032), "weight": "bold", "color": "#ffffff", "alpha": 220}],
                valign="top", font_path=font_path)


def quote_card(W, H, quote, author=None, accent="#FFD166", font_path=None):
    blocks = [{"text": "\u201c", "size": int(min(W, H) * 0.2), "weight": "bold", "color": accent, "spacing": 0.7},
              {"text": quote, "size": int(min(W, H) * 0.065), "weight": "bold", "color": "#ffffff", "spacing": 1.25, "maxw": 0.82}]
    if author:
        blocks.append({"rule": True, "color": accent, "width": int(min(W, H) * 0.08)})
        blocks.append({"text": author, "size": int(min(W, H) * 0.036), "weight": "regular", "color": accent})
    return card((W, H), blocks, dim=0.45, font_path=font_path)


def caption_card(W, H, text, accent="#FFD166", font_path=None):
    return card((W, H), [{"text": text, "size": int(min(W, H) * 0.045), "weight": "bold", "color": "#111111", "box": "#ffffff",
                          "box_alpha": 235, "pad": int(min(W, H) * 0.018), "shadow": False, "maxw": 0.86}],
                valign="bottom", gradient="bottom", font_path=font_path)


def split_labels(W, H, top, bottom, accent="#FFD166", font_path=None):
    a = card((W, H), [{"text": top, "size": int(min(W, H) * 0.04), "weight": "bold", "color": "#111111", "align": "left",
                       "box": accent, "pad": int(min(W, H) * 0.014), "shadow": False}], valign="top", font_path=font_path)
    b = card((W, H), [{"text": bottom, "size": int(min(W, H) * 0.04), "weight": "bold", "color": "#111111", "align": "left",
                       "box": "#ffffff", "pad": int(min(W, H) * 0.014), "shadow": False}], y=0.5 + 0.03, font_path=font_path)
    a.alpha_composite(b)
    return a


# ---------------------------------------------------------------- fotoğraf ön işleme
def _open(path):
    from . import media
    return media.open_image(path).convert("RGB")


def fit_image(img, W, H, mode="kirp", bg="#101828"):
    """kirp: kapla+kırp, bulanik: bulanık arka plan üstünde sığdır, sigdir: düz renk üstünde sığdır."""
    if mode == "kirp":
        return ImageOps.fit(img, (W, H), Image.LANCZOS, centering=(0.5, 0.45))
    fg = ImageOps.contain(img, (W, H), Image.LANCZOS)
    if mode == "bulanik":
        base = ImageOps.fit(img, (W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(max(12, W // 30)))
        base = Image.blend(base, Image.new("RGB", (W, H), (0, 0, 0)), 0.25)
    else:
        base = Image.new("RGB", (W, H), rgba(bg)[:3])
    base.paste(fg, ((W - fg.width) // 2, (H - fg.height) // 2))
    return base


def prep_photo(src, W, H, mode, out, scale=2.0, bg="#101828"):
    """Ken Burns için tuvalin scale katı büyüklüğünde JPEG hazırlar (HEIC/EXIF sorunlarını da çözer)."""
    out = Path(out)
    if out.exists():
        return out
    img = _open(src)
    w, h = int(W * scale), int(H * scale)
    if mode == "otomatik":
        r_img, r_canvas = img.width / img.height, W / H
        mode = "bulanik" if (r_img > 1.15 and r_canvas < 1) or (r_img < 0.85 and r_canvas > 1) else "kirp"
    fit_image(img, w, h, mode, bg).save(out, "JPEG", quality=90)
    return out


def carousel_slide(src, W, H, index, total, title=None, handle=None, accent="#FFD166", mode="kirp", font_path=None, bg="#101828"):
    base = fit_image(_open(src), W, H, mode, bg).convert("RGBA")
    blocks = []
    if title:
        blocks = [{"text": title, "size": int(W * 0.075), "weight": "bold", "color": "#ffffff", "align": "left", "maxw": 0.84},
                  {"rule": True, "color": accent, "width": int(W * 0.09), "align": "left"}]
        base.alpha_composite(card((W, H), blocks, valign="bottom", gradient="bottom", font_path=font_path, safe=False))
    counter = card((W, H), [{"text": f"{index}/{total}", "size": int(W * 0.03), "weight": "bold", "color": "#111111", "align": "right",
                             "box": accent, "pad": int(W * 0.012), "shadow": False}], valign="top", font_path=font_path, safe=False)
    base.alpha_composite(counter)
    if handle:
        base.alpha_composite(card((W, H), [{"text": handle, "size": int(W * 0.03), "weight": "bold", "color": "#ffffff", "align": "left"}],
                                  valign="top", font_path=font_path, safe=False))
    if index < total:
        arrow = card((W, H), [{"text": "\u2192", "size": int(W * 0.05), "weight": "bold", "color": "#ffffff", "align": "right"}],
                     valign="bottom", font_path=font_path, safe=False)
        base.alpha_composite(arrow)
    return base.convert("RGB")
