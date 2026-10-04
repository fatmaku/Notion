"""neviral 0.5: premium tasarım stilleri, kanca formülleri/puanlama, karşılaştırma ve A/B paketi."""
import http.client
import json
import os
import shutil
import sys
import tempfile
import threading
import unittest
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
TMP = Path(tempfile.mkdtemp(prefix="neviral-tasarim-"))
os.environ["ARSIV_HOME"] = str(TMP / "home")
os.environ.pop("ARSIV_DB", None)
os.environ["ARSIV_NO_CLAUDE"] = "1"

from PIL import Image  # noqa: E402

from arsiv import db, konu, media, metin, scan, server, tasarim, viral, yazi  # noqa: E402
from tests import ornek_veri  # noqa: E402

quiet = lambda *_: None  # noqa: E731


class Tasarim(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.arsiv, _ = ornek_veri.build(TMP / "ornek")
        cls.dbp = TMP / "t.db"
        cls.con = db.connect(cls.dbp)
        scan.scan_folder(cls.con, cls.arsiv, progress=quiet)
        viral.analyze(cls.con, progress=quiet)
        cls.photo = next(cls.arsiv.rglob("*.jpg"))

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(TMP, ignore_errors=True)

    def _id(self, name):
        return self.con.execute("SELECT id FROM items WHERE filename=?", (name,)).fetchone()[0]

    # --- tasarım
    def test_fontlar_paketli(self):
        for st in tasarim.STYLES.values():
            for k in ("baslik", "metin"):
                self.assertTrue((tasarim.FONT_DIR / st[k]).is_file(), st[k])
        self.assertEqual({s["key"] for s in tasarim.style_list("de")}, set(tasarim.STYLES))

    def test_konuya_gore_stil(self):
        self.assertIn(tasarim.style_for(["kitap"]), tasarim.STYLES)
        self.assertIn(tasarim.style_for([]), tasarim.STYLES)

    def test_vurgu_rengi_gorselden(self):
        p = tasarim.palette(self.photo)
        for k in ("vurgu", "koyu"):
            self.assertRegex(p[k], r"^#[0-9a-fA-F]{6}$")

    def test_her_stil_onizleme_okunur(self):
        for key in tasarim.STYLES:
            img, leg, accent = tasarim.preview(str(self.photo), "foto", "Wie entsteht ein Kinderbuch?", key, None, W=270, H=480)
            self.assertEqual(img.size, (270, 480))
            self.assertGreaterEqual(leg, 35, key)

    def test_animasyonlu_kanca_dizisi(self):
        out = TMP / "seq"
        out.mkdir()
        pattern, n, static = tasarim.hook_sequence("Vor 7 Jahren war dieses Buch nur ein Traum", "pop", 360, 640, out, "#ff5a36", fps=15, anim_dur=0.8)
        self.assertGreater(n, 3)
        self.assertTrue(Path(static).is_file())
        first = Image.open(str(pattern) % 0).convert("RGBA").getchannel("A").getbbox()
        last = Image.open(str(pattern) % (n - 1)).convert("RGBA").getchannel("A").getbbox()
        self.assertIsNotNone(last, "son karede yazı görünmeli")
        self.assertNotEqual(first, last, "kanca animasyonlu olmalı")

    # --- kanca & metin
    def test_kanca_puani_kurallari(self):
        good, why, _ = metin.score_hook("Wie entsteht eigentlich ein Kinderbuch?", "de", "kitap")
        bad, _, warn = metin.score_hook("Throwback zu einem sehr schönen und wirklich unvergesslichen Moment aus dem letzten Sommerurlaub", "de", "kitap")
        self.assertGreater(good, bad + 20)
        self.assertTrue(why)
        self.assertTrue(warn)

    def test_varyantlar_uc_dil_konuya_ozel(self):
        it = db.get_item(self.con, self._id("imza.mp4"))
        keys = [k for k, _ in konu.topics(it)]
        for lang in yazi.LANGS:
            v = metin.variants(it, keys, lang, konu.nostalgia(it, 2026), n=6)
            self.assertGreaterEqual(len(v), 3, lang)
            sc = [x["score"] for x in v]
            self.assertEqual(sc, sorted(sc, reverse=True))
            self.assertEqual(len({x["text"] for x in v}), len(v), "tekrar yok")
            self.assertTrue(all(len(x["text"]) <= 60 for x in v))

    def test_aciklama_hikaye_varyantli(self):
        it = db.get_item(self.con, self._id("imza.mp4"))
        tops = konu.topics(it)
        caps = yazi.rule_captions(it, tops, konu.nostalgia(it, 2026), handle="@neviral")
        self.assertIn("_varyantlar", caps["de"])
        cap = next(v for k, v in caps["de"].items() if k != "_varyantlar" and isinstance(v, dict) and v.get("caption"))
        self.assertGreater(len(cap["caption"].split("\n")), 2, "açıklama hikâye + çağrı satırları içermeli")

    # --- karşılaştırma
    def test_karsilastirma(self):
        c = viral.compare(self.con, self._id("imza.mp4"), lang="de", size=(180, 320))
        self.assertEqual(len(c["stiller"]), len(tasarim.STYLES))
        self.assertEqual(sum(s["en_iyi"] for s in c["stiller"]), 1)
        self.assertEqual(sum(s["onerilen"] for s in c["stiller"]), 1)
        self.assertEqual(set(c["kancalar"]), set(yazi.LANGS))
        c2 = viral.compare(self.con, self._id("imza.mp4"), lang="en", hook="My own hook")
        self.assertEqual(c2["kanca"], "My own hook")

    def test_api_karsilastir_onizleme_puan(self):
        server.Handler.db_path = str(self.dbp)
        httpd = server.ThreadingHTTPServer(("127.0.0.1", 0), server.Handler)
        port = httpd.server_address[1]
        threading.Thread(target=httpd.serve_forever, daemon=True).start()

        def req(method, path, body=None, headers=None):
            c = http.client.HTTPConnection("127.0.0.1", port, timeout=120)
            c.request(method, path, body=body, headers=headers or {})
            r = c.getresponse(); data = r.read(); c.close()
            return r.status, data
        try:
            iid = self._id("imza.mp4")
            st, body = req("GET", f"/api/viral/karsilastir/{iid}?hook=" + urllib.parse.quote("Kurz & stark?"), headers={"X-Lang": "de"})
            self.assertEqual(st, 200, body[:300])
            c = json.loads(body)
            self.assertEqual(c["kanca"], "Kurz & stark?")
            st, img = req("GET", c["stiller"][0]["url"])
            self.assertEqual(st, 200)
            self.assertEqual(img[:2], b"\xff\xd8")
            for bad in ("../../etc/passwd", "x.jpg", "1-pop-zzzzzzzzzz.jpg", "..%2F..%2Fviral.db"):
                st, _ = req("GET", "/api/viral/onizleme/" + bad)
                self.assertEqual(st, 404, bad)
            st, _ = req("GET", "/api/viral/karsilastir/999999")
            self.assertEqual(st, 404)
            st, body = req("POST", "/api/viral/hookpuan", json.dumps({"text": "Wie entsteht ein Kinderbuch?", "lang": "de", "topic": "kitap"}),
                           {"Content-Type": "application/json"})
            self.assertEqual(st, 200)
            r = json.loads(body)
            self.assertGreater(r["puan"], 50)
            self.assertTrue(r["neden"])
            st, body = req("GET", "/api/viral/settings", headers={"X-Lang": "en"})
            self.assertEqual(len(json.loads(body)["stiller"]), len(tasarim.STYLES))
        finally:
            httpd.shutdown()
            httpd.server_close()

    # --- paket: stil seçimi + A/B
    def test_ab_paketi_stilli(self):
        iid = self._id("imza.mp4")
        r = viral.package(self.con, iid, platforms=["ig_reels"], langs=["de"], progress=quiet,
                          opts={"sure": 6, "muzik": "yok", "stil": "sinema", "ab": True, "hatirlat": False})
        d = Path(r["klasor"])
        pkg = json.loads((d / "paket.json").read_text())
        self.assertEqual(pkg["stil"], "sinema")
        self.assertTrue(pkg["kanca_varyantlari"])
        self.assertNotEqual(pkg["ab_test"]["A"]["hook"], pkg["ab_test"]["B"]["hook"])
        vids = [f for f in r["dosyalar"] if f.endswith(".mp4")]
        self.assertEqual(len(vids), 2)
        self.assertTrue(any(Path(v).name.startswith("B-") for v in vids))
        for v in vids:
            info = media.probe(v)
            self.assertEqual((info["width"], info["height"]), (1080, 1920))
        self.assertEqual(json.loads((d / "brief.json").read_text())["stil"], "sinema")
        self.assertNotIn("_varyantlar", pkg["metinler"]["de"])


if __name__ == "__main__":
    unittest.main()
