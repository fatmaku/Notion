"""Bağımlılıksız QR Code üreticisi (ISO/IEC 18004, bayt kipi, ECI yok).

matrix() -> modül matrisi (True = koyu, sessiz bölge yok), svg() / terminal() / png() -> hazır çıktılar.
Maske seçimi segno ile aynıdır: cezalar biçim/sürüm bilgisi yazılmadan önce hesaplanır."""
import functools
import re
from xml.sax.saxutils import escape, quoteattr

_SEVIYE = {"L": 0, "M": 1, "Q": 2, "H": 3}
_BICIM_BITI = {"L": 1, "M": 0, "Q": 3, "H": 2}

# Sürüm başına (indeks 0 boş) blok başına hata düzeltme kod sözcüğü ve blok sayısı; satırlar L, M, Q, H.
_EC_SOZCUK = (
    (-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30),
    (-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28),
    (-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30),
    (-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30),
)
_BLOK = (
    (-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25),
    (-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49),
    (-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68),
    (-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81),
)

_MASKELER = (
    lambda i, j: (i + j) % 2 == 0,
    lambda i, j: i % 2 == 0,
    lambda i, j: j % 3 == 0,
    lambda i, j: (i + j) % 3 == 0,
    lambda i, j: (i // 2 + j // 3) % 2 == 0,
    lambda i, j: (i * j) % 2 + (i * j) % 3 == 0,
    lambda i, j: ((i * j) % 2 + (i * j) % 3) % 2 == 0,
    lambda i, j: ((i + j) % 2 + (i * j) % 3) % 2 == 0,
)

# GF(256), indirgeme polinomu x^8 + x^4 + x^3 + x^2 + 1
_US = [0] * 512
_LOG = [0] * 256
_x = 1
for _k in range(255):
    _US[_k] = _x
    _LOG[_x] = _k
    _x <<= 1
    if _x & 0x100:
        _x ^= 0x11D
for _k in range(255, 512):
    _US[_k] = _US[_k - 255]
del _x, _k


def _carp(a, b):
    return _US[_LOG[a] + _LOG[b]] if a and b else 0


@functools.lru_cache(maxsize=None)
def _uretec(derece):
    sonuc = [0] * (derece - 1) + [1]
    kok = 1
    for _ in range(derece):
        for j in range(derece):
            sonuc[j] = _carp(sonuc[j], kok)
            if j + 1 < derece:
                sonuc[j] ^= sonuc[j + 1]
        kok = _carp(kok, 2)
    return tuple(sonuc)


def _rs_kalan(veri, derece):
    gen = _uretec(derece)
    loglar = [_LOG[g] for g in gen]
    kalan = [0] * derece
    for b in veri:
        f = b ^ kalan.pop(0)
        kalan.append(0)
        if f:
            lf = _LOG[f]
            for i, lg in enumerate(loglar):
                kalan[i] ^= _US[lg + lf]
    return kalan


def _ham_modul(surum):
    sonuc = (16 * surum + 128) * surum + 64
    if surum >= 2:
        n = surum // 7 + 2
        sonuc -= (25 * n - 10) * n - 55
        if surum >= 7:
            sonuc -= 36
    return sonuc


def _veri_sozcuk(surum, seviye):
    s = _SEVIYE[seviye]
    return _ham_modul(surum) // 8 - _EC_SOZCUK[s][surum] * _BLOK[s][surum]


def _hizalama(surum):
    if surum == 1:
        return []
    n = surum // 7 + 2
    adim = (surum * 8 + n * 3 + 5) // (n * 4 - 4) * 2
    boyut = 17 + 4 * surum
    return [6] + sorted(boyut - 7 - i * adim for i in range(n - 1))


@functools.lru_cache(maxsize=None)
def _iskelet(surum):
    """Fonksiyon desenleri yerleşmiş satırlar (2 = veri hücresi) ve veri hücrelerinin zikzak sırası."""
    n = 17 + 4 * surum
    g = [bytearray([2]) * n for _ in range(n)]
    for mr, mc in ((3, 3), (3, n - 4), (n - 4, 3)):
        for dr in range(-4, 5):
            for dc in range(-4, 5):
                r, c = mr + dr, mc + dc
                if 0 <= r < n and 0 <= c < n:
                    g[r][c] = int(max(abs(dr), abs(dc)) not in (2, 4))
    konum = _hizalama(surum)
    for r in konum:
        for c in konum:
            if (r, c) in ((6, 6), (6, konum[-1]), (konum[-1], 6)):
                continue
            for dr in range(-2, 3):
                for dc in range(-2, 3):
                    g[r + dr][c + dc] = int(max(abs(dr), abs(dc)) != 1)
    for i in range(n):
        if g[6][i] == 2:
            g[6][i] = int(i % 2 == 0)
        if g[i][6] == 2:
            g[i][6] = int(i % 2 == 0)
    for i in range(9):
        if g[8][i] == 2:
            g[8][i] = 0
        if g[i][8] == 2:
            g[i][8] = 0
    for i in range(1, 9):
        g[8][n - i] = 0
        g[n - i][8] = 0
    if surum >= 7:
        for i in range(6):
            for j in range(n - 11, n - 8):
                g[i][j] = 0
                g[j][i] = 0
    sira = []
    for sag in range(n - 1, 0, -2):
        if sag <= 6:
            sag -= 1
        yukari = ((sag + 1) & 2) == 0
        for dikey in range(n):
            r = n - 1 - dikey if yukari else dikey
            for c in (sag, sag - 1):
                if g[r][c] == 2:
                    sira.append((r, c))
    return tuple(bytes(s) for s in g), tuple(sira)


@functools.lru_cache(maxsize=None)
def _maske_hucreleri(surum, maske):
    f = _MASKELER[maske]
    return tuple((r, c) for r, c in _iskelet(surum)[1] if f(r, c))


def _kod_sozcukleri(veri, surum, seviye):
    s = _SEVIYE[seviye]
    kapasite = _veri_sozcuk(surum, seviye)
    bitler = ["0100", format(len(veri), "08b" if surum < 10 else "016b")]
    bitler.extend(format(b, "08b") for b in veri)
    akis = "".join(bitler)
    akis += "0" * min(4, kapasite * 8 - len(akis))
    # segno ile birebir: hizalı akışa da tam bir 0x00 eklenir (sonlandırıcıdan sonra okunmaz), taşarsa atılır
    akis = (akis + "0" * (8 - len(akis) % 8))[:kapasite * 8]
    sozcuk = [int(akis[i:i + 8], 2) for i in range(0, len(akis), 8)]
    for i in range(kapasite - len(sozcuk)):
        sozcuk.append(0xEC if i % 2 == 0 else 0x11)

    blok_sayi = _BLOK[s][surum]
    ec = _EC_SOZCUK[s][surum]
    ham = _ham_modul(surum) // 8
    kisa_sayi = blok_sayi - ham % blok_sayi
    kisa_veri = ham // blok_sayi - ec
    bloklar, eclar, k = [], [], 0
    for i in range(blok_sayi):
        uzunluk = kisa_veri + (0 if i < kisa_sayi else 1)
        parca = sozcuk[k:k + uzunluk]
        k += uzunluk
        bloklar.append(parca)
        eclar.append(_rs_kalan(parca, ec))
    sonuc = []
    for i in range(kisa_veri + 1):
        for b in bloklar:
            if i < len(b):
                sonuc.append(b[i])
    for i in range(ec):
        for e in eclar:
            sonuc.append(e[i])
    return sonuc


_N1 = re.compile(rb"\x00{5,}|\x01{5,}")
_N3 = b"\x01\x00\x01\x01\x01\x00\x01"
_IKILI = bytes.maketrans(b"\x00\x01", b"01")


def _n3(dizi, n):
    puan = 0
    idx = dizi.find(_N3)
    while idx != -1:
        son = idx + 7
        if idx in (0, n - 7) or not any(dizi[max(idx - 4, 0):idx]) or not any(dizi[son:son + 4]):
            puan += 40
        else:
            son = idx + 4
        idx = dizi.find(_N3, son)
    return puan


def _ceza(satirlar):
    n = len(satirlar)
    sutunlar = [bytes(t) for t in zip(*satirlar)]
    puan = 0
    for dizi in (*satirlar, *sutunlar):
        for m in _N1.finditer(dizi):
            puan += m.end() - m.start() - 2
        puan += _n3(dizi, n)
    tam = (1 << (n - 1)) - 1
    onceki = None
    for s in satirlar:
        v = int(s.translate(_IKILI), 2)
        yatay = ~(v ^ (v >> 1)) & tam
        if onceki is not None:
            pv, py = onceki
            puan += 3 * bin(yatay & py & ~(v ^ pv) & tam).count("1")
        onceki = (v, yatay)
    koyu = sum(sum(s) for s in satirlar)
    puan += 10 * int(abs(float(koyu) / (n * n) * 100 - 50) / 5)
    return puan


def _bicim_bitleri(seviye, maske):
    veri = _BICIM_BITI[seviye] << 3 | maske
    kalan = veri
    for _ in range(10):
        kalan = (kalan << 1) ^ ((kalan >> 9) * 0x537)
    return (veri << 10 | kalan) ^ 0x5412


def _surum_bitleri(surum):
    kalan = surum
    for _ in range(12):
        kalan = (kalan << 1) ^ ((kalan >> 11) * 0x1F25)
    return surum << 12 | kalan


def _bayt(data):
    if isinstance(data, str):
        return data.encode("utf-8")
    if isinstance(data, (bytes, bytearray, memoryview)):
        return bytes(data)
    raise ValueError("data str ya da bytes olmalı")


def _sigar_mi(uzunluk, surum, seviye):
    bit = 4 + (8 if surum < 10 else 16) + 8 * uzunluk
    return bit <= _veri_sozcuk(surum, seviye) * 8


def kodla(data, ecc="M", version=None, mask=None):
    """(satırlar: tuple[bytearray] 0/1, sürüm, maske) döndürür."""
    veri = _bayt(data)
    seviye = str(ecc).upper()
    if seviye not in _SEVIYE:
        raise ValueError(f"geçersiz hata düzeltme seviyesi: {ecc!r}")
    if mask is not None and (not isinstance(mask, int) or not 0 <= mask <= 7):
        raise ValueError(f"geçersiz maske: {mask!r}")
    if version is None:
        surum = next((v for v in range(1, 41) if _sigar_mi(len(veri), v, seviye)), None)
        if surum is None:
            raise ValueError(f"veri QR koduna sığmıyor ({len(veri)} bayt, seviye {seviye})")
    else:
        if not isinstance(version, int) or not 1 <= version <= 40:
            raise ValueError(f"geçersiz sürüm: {version!r}")
        surum = version
        if not _sigar_mi(len(veri), surum, seviye):
            raise ValueError(f"veri {surum}. sürüme sığmıyor ({len(veri)} bayt, seviye {seviye})")

    iskelet, sira = _iskelet(surum)
    taban = [bytearray(s) for s in iskelet]
    sozcuk = _kod_sozcukleri(veri, surum, seviye)
    bit_say = len(sozcuk) * 8
    for k, (r, c) in enumerate(sira):
        taban[r][c] = (sozcuk[k >> 3] >> (7 - (k & 7))) & 1 if k < bit_say else 0

    def maskele(m):
        g = [bytearray(s) for s in taban]
        for r, c in _maske_hucreleri(surum, m):
            g[r][c] ^= 1
        return g

    if mask is None:
        en_iyi = None
        for m in range(8):
            g = maskele(m)
            p = _ceza(g)
            if en_iyi is None or p < en_iyi[0]:
                en_iyi = (p, m, g)
        _, maske, g = en_iyi
    else:
        maske, g = mask, maskele(mask)

    n = len(g)
    b = _bicim_bitleri(seviye, maske)
    for i in range(8):
        alt = (b >> i) & 1
        ust = (b >> (14 - i)) & 1
        k = i + (i >= 6)
        g[k][8] = alt
        g[8][k] = ust
        g[8][n - 1 - i] = alt
        g[n - 1 - i][8] = ust
    g[n - 8][8] = 1
    if surum >= 7:
        vb = _surum_bitleri(surum)
        for i in range(18):
            bit = (vb >> i) & 1
            a, k = n - 11 + i % 3, i // 3
            g[a][k] = bit
            g[k][a] = bit
    return g, surum, maske


def matrix(data, ecc="M", version=None, mask=None):
    g, _, _ = kodla(data, ecc, version, mask)
    return [[bool(x) for x in s] for s in g]


def _kenarli(data, ecc, border):
    if not isinstance(border, int) or border < 0:
        raise ValueError(f"geçersiz kenar: {border!r}")
    g, _, _ = kodla(data, ecc)
    n = len(g)
    bos = bytearray(n + 2 * border)
    kenar = bytearray(border)
    return [bytearray(bos) for _ in range(border)] + [kenar + s + kenar for s in g] + [bytearray(bos) for _ in range(border)]


def svg(data, ecc="M", border=4, scale=None, dark="#000000", light="#ffffff", title=None):
    if scale is not None and (isinstance(scale, bool) or not isinstance(scale, (int, float)) or not scale > 0):
        raise ValueError(f"geçersiz ölçek: {scale!r}")
    satirlar = _kenarli(data, ecc, border)
    n = len(satirlar)
    yol = []
    for y, s in enumerate(satirlar):
        for m in re.finditer(rb"\x01+", bytes(s)):
            yol.append(f"M{m.start()} {y}h{m.end() - m.start()}v1h-{m.end() - m.start()}z")
    boyut = f' width="{n * scale:g}" height="{n * scale:g}"' if scale else ""
    parcalar = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {n} {n}"{boyut} role="img" shape-rendering="crispEdges">']
    if title:
        parcalar.append(f"<title>{escape(str(title))}</title>")
    if light:
        parcalar.append(f'<rect width="{n}" height="{n}" fill={quoteattr(light)}/>')
    parcalar.append(f'<path fill={quoteattr(dark)} d="{"".join(yol)}"/>')
    parcalar.append("</svg>")
    return "".join(parcalar)


def terminal(data, ecc="M", border=2, ansi=True):
    satirlar = _kenarli(data, ecc, border)
    if len(satirlar) % 2:
        satirlar.append(bytearray(len(satirlar[0])))
    cikti = []
    for ust, alt in zip(satirlar[0::2], satirlar[1::2]):
        if ansi:
            # ön plan = üst modül, arka plan = alt modül; siyah 30/40, parlak beyaz 97/107
            parca, onceki = [], None
            for a, b in zip(ust, alt):
                renk = (a, b)
                if renk != onceki:
                    parca.append(f"\x1b[{30 if a else 97};{40 if b else 107}m")
                    onceki = renk
                parca.append("▀")
            parca.append("\x1b[0m")
            cikti.append("".join(parca))
        else:
            cikti.append("".join(" ▄▀█"[a * 2 + b] for a, b in zip(ust, alt)))
    return "\n".join(cikti)


def png(data, ecc="M", scale=8, border=4):
    from io import BytesIO

    from PIL import Image

    if not isinstance(scale, int) or scale < 1:
        raise ValueError(f"geçersiz ölçek: {scale!r}")
    satirlar = _kenarli(data, ecc, border)
    n = len(satirlar)
    img = Image.frombytes("L", (n, n), b"".join(bytes(s).translate(bytes.maketrans(b"\x00\x01", b"\xff\x00")) for s in satirlar))
    img = img.resize((n * scale, n * scale), Image.NEAREST).convert("1")
    buf = BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()
