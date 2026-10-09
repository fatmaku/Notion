"""arsiv.qr: bağımlılıksız QR kodlayıcı. Öz-tutarlılık testleri her zaman; segno kuruluysa birebir karşılaştırma."""
import base64
import io
import math
import random
import re
import sys
import time
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from arsiv import qr  # noqa: E402

try:
    import segno
except ImportError:  # segno yalnızca test/geliştirme ortamında, depo bağımlılığı değil
    segno = None

SEVIYELER = "LMQH"


def kapasite(surum, seviye):
    """Bayt kipinde sığan en fazla bayt (sayaç alanı: 1-9 → 8 bit, 10-40 → 16 bit)."""
    return (qr._veri_sozcuk(surum, seviye) * 8 - 4 - (8 if surum < 10 else 16)) // 8


def finder_beklenen(r, c):
    d = max(abs(r - 3), abs(c - 3))
    return d != 2


class OzTutarlilik(unittest.TestCase):
    # ISO/IEC 18004 Tablo 7: bayt kipinde sığan en fazla bayt (bağımsız referans)
    BILINEN = {1: (17, 14, 11, 7), 2: (32, 26, 20, 14), 6: (134, 106, 74, 58), 7: (154, 122, 86, 64), 9: (230, 180, 130, 98),
               10: (271, 213, 151, 119), 26: (1367, 1059, 751, 593), 27: (1465, 1125, 805, 625), 40: (2953, 2331, 1663, 1273)}

    def test_boyut_ve_surum_secimi(self):
        for surum, caps in self.BILINEN.items():
            for seviye, cap in zip(SEVIYELER, caps):
                self.assertEqual(kapasite(surum, seviye), cap, (surum, seviye))
        for surum in range(1, 41):
            for seviye in SEVIYELER:
                veri = b"a" * kapasite(surum, seviye)
                if surum in (1, 9, 10, 26, 27, 40):
                    m = qr.matrix(veri, seviye, version=surum)
                    self.assertEqual(len(m), 17 + 4 * surum)
                    self.assertTrue(all(len(s) == len(m) for s in m))
                self.assertEqual(qr._sigar_mi(len(veri), surum, seviye), True, (surum, seviye))
                self.assertFalse(qr._sigar_mi(len(veri) + 1, surum, seviye), (surum, seviye))
                if surum < 40:
                    self.assertTrue(qr._sigar_mi(len(veri) + 1, surum + 1, seviye))
            with self.assertRaises(ValueError):
                qr.matrix(b"a" * (kapasite(surum, "M") + 1), "M", version=surum)
        for surum in (1, 9, 10, 26, 27):
            veri = b"a" * kapasite(surum, "L")
            self.assertEqual(qr.kodla(veri, "L")[1], surum)
            self.assertEqual(qr.kodla(veri + b"a", "L")[1], surum + 1)
        self.assertEqual(len(qr.matrix("")), 21)

    def test_svg_olcek_dogrulama(self):
        self.assertIn('width="58"', qr.svg("x", scale=2))
        for bad in ("2", '1" onload="x', -1, 0, True):
            with self.assertRaises(ValueError):
                qr.svg("x", scale=bad)

    def test_finder_zamanlama_koyu_modul(self):
        for surum in (1, 5, 7, 21, 40):
            m = qr.matrix(b"x", "Q", version=surum)
            n = len(m)
            for r0, c0 in ((0, 0), (0, n - 7), (n - 7, 0)):
                for r in range(7):
                    for c in range(7):
                        self.assertEqual(m[r0 + r][c0 + c], finder_beklenen(r, c), (surum, r0, c0, r, c))
            for i in range(8):  # ayırıcılar
                self.assertFalse(m[7][i] or m[i][7] or m[7][n - 1 - i] or m[i][n - 8] or m[n - 8][i] or m[n - 1 - i][7])
            for i in range(8, n - 8):
                self.assertEqual(m[6][i], i % 2 == 0)
                self.assertEqual(m[i][6], i % 2 == 0)
            self.assertTrue(m[n - 8][8])

    def test_hizalama_desenleri(self):
        m = qr.matrix(b"hizalama", "M", version=7)
        konum = qr._hizalama(7)
        self.assertEqual(konum, [6, 22, 38])
        for r in konum:
            for c in konum:
                if (r, c) in ((6, 6), (6, 38), (38, 6)):
                    continue
                for dr in range(-2, 3):
                    for dc in range(-2, 3):
                        self.assertEqual(m[r + dr][c + dc], max(abs(dr), abs(dc)) != 1)
        self.assertEqual(qr._hizalama(32), [6, 34, 60, 86, 112, 138])
        self.assertEqual(qr._hizalama(40), [6, 30, 58, 86, 114, 142, 170])

    def test_bicim_ve_surum_bilgisi(self):
        # bilinen değerler: M/maske 0 → 101010000010010, L/maske 4 → 110011000101111, sürüm 7 → 0x07C94
        self.assertEqual(qr._bicim_bitleri("M", 0), 0b101010000010010)
        self.assertEqual(qr._bicim_bitleri("L", 4), 0b110011000101111)
        self.assertEqual(qr._surum_bitleri(7), 0x07C94)
        self.assertEqual(qr._surum_bitleri(40), 0x28C69)
        m = qr.matrix(b"neviral", "M", version=1, mask=0)
        n = len(m)
        bit = [bool((0b101010000010010 >> i) & 1) for i in range(15)]  # bit[0] = LSB
        self.assertEqual([m[r][8] for r in (0, 1, 2, 3, 4, 5, 7, 8)], bit[:8])
        self.assertEqual([m[8][c] for c in (7, 5, 4, 3, 2, 1, 0)], bit[8:])
        self.assertEqual([m[8][c] for c in range(n - 1, n - 9, -1)], bit[:8])
        self.assertEqual([m[r][8] for r in range(n - 7, n)], bit[8:])
        m = qr.matrix(b"surum", "H", version=7, mask=3)
        n = len(m)
        v = 0x07C94
        for i in range(18):
            self.assertEqual(m[n - 11 + i % 3][i // 3], bool((v >> i) & 1))
            self.assertEqual(m[i // 3][n - 11 + i % 3], bool((v >> i) & 1))

    def test_str_utf8_ve_bayt_ayni(self):
        metin = "Kurulum: ğüşıöçİ äöüß 📱"
        self.assertEqual(qr.matrix(metin), qr.matrix(metin.encode("utf-8")))
        self.assertEqual(qr.matrix(metin, "q"), qr.matrix(metin, "Q"))

    def test_hatali_parametreler(self):
        with self.assertRaises(ValueError):
            qr.matrix(b"x", "X")
        with self.assertRaises(ValueError):
            qr.matrix(b"x", mask=8)
        with self.assertRaises(ValueError):
            qr.matrix(b"x", version=0)
        with self.assertRaises(ValueError):
            qr.matrix(b"x", version=41)
        with self.assertRaises(ValueError):
            qr.matrix(12345)
        with self.assertRaises(ValueError):
            qr.matrix(b"a" * (kapasite(1, "M") + 1), "M", version=1)
        for seviye in SEVIYELER:
            qr.matrix(b"a" * kapasite(40, seviye), seviye)
            with self.assertRaises(ValueError):
                qr.matrix(b"a" * (kapasite(40, seviye) + 1), seviye)
        with self.assertRaises(ValueError):
            qr.svg(b"x", border=-1)
        with self.assertRaises(ValueError):
            qr.png(b"x", scale=0)

    def test_maske_secimi_en_dusuk_ceza(self):
        for veri in (b"a", b"http://192.168.1.20:8765/m?k=" + b"A" * 22, bytes(range(200))):
            g, surum, maske = qr.kodla(veri, "M")
            cezalar = []
            for m in range(8):
                g2, _, _ = qr.kodla(veri, "M", version=surum, mask=m)
                self.assertEqual(g2 == g, m == maske)
            # seçim, biçim bilgisi yazılmadan önceki cezaya göre yapılır; doğrudan yeniden hesapla
            taban, sira = qr._iskelet(surum)
            for m in range(8):
                g2, _, _ = qr.kodla(veri, "M", version=surum, mask=m)
                h = [bytearray(s) for s in taban]
                for r, c in sira:
                    h[r][c] = g2[r][c]
                cezalar.append(qr._ceza(h))
            self.assertEqual(maske, cezalar.index(min(cezalar)))

    def test_hiz(self):
        veri = bytes(random.Random(1).randrange(256) for _ in range(300))
        for seviye in SEVIYELER:
            qr._iskelet.cache_clear()
            qr._maske_hucreleri.cache_clear()
            t = time.perf_counter()
            qr.matrix(veri, seviye)
            self.assertLess(time.perf_counter() - t, 0.3, seviye)

    def test_svg(self):
        m = qr.matrix("http://192.168.1.20:8765/m?k=abc")
        s = qr.svg("http://192.168.1.20:8765/m?k=abc", border=4, scale=5, title="Telefon <kurulum> & QR")
        kok = ET.fromstring(s)
        ns = "{http://www.w3.org/2000/svg}"
        self.assertEqual(kok.tag, ns + "svg")
        n = len(m) + 8
        self.assertEqual(kok.get("viewBox"), f"0 0 {n} {n}")
        self.assertEqual(kok.get("width"), str(n * 5))
        self.assertEqual(kok.get("height"), str(n * 5))
        self.assertEqual(kok.get("role"), "img")
        self.assertEqual(kok.get("shape-rendering"), "crispEdges")
        self.assertEqual(kok.find(ns + "title").text, "Telefon <kurulum> & QR")
        rect = kok.findall(ns + "rect")
        self.assertEqual(len(rect), 1)
        self.assertEqual(rect[0].get("fill"), "#ffffff")
        yollar = kok.findall(ns + "path")
        self.assertEqual(len(yollar), 1)
        # yol koyu modülleri birebir kapsamalı
        cizim = [[False] * n for _ in range(n)]
        for x, y, w in re.findall(r"M(\d+) (\d+)h(\d+)v1h-\d+z", yollar[0].get("d")):
            for k in range(int(w)):
                cizim[int(y)][int(x) + k] = True
        beklenen = [[False] * n for _ in range(n)]
        for r, s_ in enumerate(m):
            for c, v in enumerate(s_):
                beklenen[r + 4][c + 4] = v
        self.assertEqual(cizim, beklenen)
        sade = ET.fromstring(qr.svg(b"x", border=0, dark="#123", light="#fefefe"))
        self.assertIsNone(sade.get("width"))
        self.assertEqual(sade.get("viewBox"), "0 0 21 21")
        self.assertEqual(sade.find(ns + "path").get("fill"), "#123")

    def test_terminal(self):
        veri = "http://192.168.1.20:8765/m?k=" + "x" * 22
        n = len(qr.matrix(veri))
        for kenar in (0, 1, 2, 4):
            for ansi in (True, False):
                cikti = qr.terminal(veri, border=kenar, ansi=ansi)
                satirlar = cikti.split("\n")
                self.assertEqual(len(satirlar), math.ceil((n + 2 * kenar) / 2))
                for s in satirlar:
                    if ansi:
                        self.assertTrue(s.endswith("\x1b[0m"))
                        self.assertEqual(s.count("▀"), n + 2 * kenar)
                        self.assertEqual(re.sub(r"\x1b\[[0-9;]*m", "", s), "▀" * (n + 2 * kenar))
                    else:
                        self.assertEqual(len(s), n + 2 * kenar)
                        self.assertTrue(set(s) <= set("█▀▄ "))
        # düz çıktı modülleri birebir taşır (kenar 2: ilk satır tamamen boş)
        m = qr.matrix(veri)
        duz = qr.terminal(veri, border=1, ansi=False).split("\n")
        tam = [[False] * (n + 2)] + [[False] + s + [False] for s in m] + [[False] * (n + 2)]
        if len(tam) % 2:
            tam.append([False] * (n + 2))
        for i, s in enumerate(duz):
            for j, ch in enumerate(s):
                self.assertEqual(ch, " ▄▀█"[tam[2 * i][j] * 2 + tam[2 * i + 1][j]])
        renkli = qr.terminal(veri, border=1)
        self.assertIn("\x1b[97;107m", renkli)  # açık üstte açık: parlak beyaz ön+arka plan
        self.assertIn("\x1b[30;40m", qr.terminal(b"x" * 10, border=0))

    def test_png(self):
        from PIL import Image

        veri = "http://192.168.1.20:8765/m?k=abc"
        n = len(qr.matrix(veri))
        b = qr.png(veri, scale=3, border=2)
        self.assertTrue(b.startswith(b"\x89PNG\r\n\x1a\n"))
        img = Image.open(io.BytesIO(b))
        img.load()
        boyut = (n + 4) * 3
        self.assertEqual(img.size, (boyut, boyut))
        gri = img.convert("L")
        m = qr.matrix(veri)
        for r in range(n):
            for c in range(n):
                px = gri.getpixel(((c + 2) * 3 + 1, (r + 2) * 3 + 1))
                self.assertEqual(px == 0, m[r][c])
        self.assertEqual(gri.getpixel((0, 0)), 255)


def segno_matrisi(veri, seviye, surum=None, maske=None):
    # micro=False: aksi halde segno kısa veride Micro QR seçer; bayt + ECI yok + seviye yükseltme yok
    kod = segno.make(veri, error=seviye, version=surum, mask=maske, mode="byte", boost_error=False, eci=False, micro=False)
    m = [[bool(x) for x in s] for s in kod.matrix]
    boyut = 17 + 4 * kod.version
    if len(m) != boyut:  # segno .matrix kenarsızdır; değilse kenarı soy
        k = (len(m) - boyut) // 2
        m = [s[k:k + boyut] for s in m[k:k + boyut]]
    return m, kod.version, kod.mask


def rastgele_veri(rng):
    tur = rng.randrange(5)
    uzunluk = rng.randint(1, 400)
    if tur == 0:
        metin = "".join(chr(rng.randint(32, 126)) for _ in range(uzunluk))
    elif tur == 1:
        anahtar = base64.urlsafe_b64encode(rng.randbytes(16)).decode().rstrip("=")[:22]
        metin = f"http://192.168.{rng.randint(0, 255)}.{rng.randint(1, 254)}:{rng.randint(1024, 65535)}/m?k={anahtar}"
    elif tur == 2:
        harf = "ğüşıöçİĞÜŞÖÇ äöüßÄÖÜ abcxyz 0123456789.,-"
        metin = "".join(rng.choice(harf) for _ in range(uzunluk))
    elif tur == 3:
        emoji = ["📱", "😀", "🇹🇷", "👍🏽", "✨", "❤️", "🎉", " ", "a", "ş"]
        metin = "".join(rng.choice(emoji) for _ in range(uzunluk))
    else:
        parca = ["Kurulum ", "Einrichtung ", "für Handy ", "telefon için ", "📲 ", "QR ", "https://örnek.com.tr/ğ?x=1 "]
        metin = "".join(rng.choice(parca) for _ in range(max(1, uzunluk // 8)))[:uzunluk]
    return metin


@unittest.skipUnless(segno, "segno kurulu değil")
class SegnoKarsilastirma(unittest.TestCase):
    def test_segno_kenarsiz(self):
        kod = segno.make(b"x", error="M", mode="byte", boost_error=False, micro=False)
        self.assertEqual(len(kod.matrix), 21)
        self.assertEqual(kod.symbol_size(border=0), (21, 21))

    def test_tum_surumler_seviyeler_maskeler(self):
        rng = random.Random(18004)
        for surum in range(1, 41):
            for seviye in SEVIYELER:
                k = kapasite(surum, seviye)
                veri = rng.randbytes(k)
                with self.assertRaises(ValueError):
                    segno.make(veri + b"a", error=seviye, version=surum, mode="byte", boost_error=False, micro=False)
                with self.assertRaises(ValueError):
                    qr.matrix(veri + b"a", seviye, version=surum)
                for maske in range(8):
                    # tam kapasite ve biraz daha kısa veri (ped kod sözcükleri)
                    v = veri if maske % 2 == 0 else veri[:max(1, k - 1 - rng.randrange(max(1, k // 3)))]
                    beklenen, sv, sm = segno_matrisi(v, seviye, surum, maske)
                    self.assertEqual((sv, sm), (surum, maske))
                    self.assertEqual(qr.matrix(v, seviye, version=surum, mask=maske), beklenen,
                                     f"sürüm {surum} seviye {seviye} maske {maske} uzunluk {len(v)}")

    def test_otomatik_surum_ve_maske(self):
        rng = random.Random(20261009)
        sayac = 0
        for i in range(400):
            metin = rastgele_veri(rng)
            seviye = SEVIYELER[i % 4]
            veri = metin.encode("utf-8")
            sinir = kapasite(40, seviye)
            if len(veri) > sinir:
                veri = veri[:sinir]
            beklenen, sv, sm = segno_matrisi(veri, seviye)
            g, surum, maske = qr.kodla(veri, seviye)
            self.assertEqual((surum, maske), (sv, sm), f"{i}: {metin[:40]!r} {seviye}")
            self.assertEqual([[bool(x) for x in s] for s in g], beklenen, f"{i}: {metin[:40]!r} {seviye}")
            if veri == metin.encode("utf-8"):
                self.assertEqual(qr.matrix(metin, seviye), beklenen)
            sayac += 1
        self.assertGreaterEqual(sayac, 300)

    def test_kucuk_girdiler_ve_sinirlar(self):
        for seviye in SEVIYELER:
            for uzunluk in range(0, 40):
                veri = bytes((7 * j + uzunluk) % 256 for j in range(uzunluk))
                beklenen, sv, sm = segno_matrisi(veri, seviye) if uzunluk else segno_matrisi(b"", seviye)
                self.assertEqual(qr.matrix(veri, seviye), beklenen, (seviye, uzunluk))
            for surum in range(1, 41):
                veri = b"\xff" * kapasite(surum, seviye)
                beklenen, sv, sm = segno_matrisi(veri, seviye)
                g, s2, m2 = qr.kodla(veri, seviye)
                self.assertEqual((s2, m2), (sv, sm))
                self.assertEqual([[bool(x) for x in s] for s in g], beklenen)


if __name__ == "__main__":
    unittest.main()
