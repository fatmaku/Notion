"""neviral: analiz, sıralama, pazar/dil, metinler ve tek tıkla paket."""
import json
import os
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
TMP = Path(tempfile.mkdtemp(prefix="neviral-"))
os.environ["ARSIV_HOME"] = str(TMP / "home")
os.environ.pop("ARSIV_DB", None)
os.environ["ARSIV_NO_CLAUDE"] = "1"

from arsiv import algoritma, db, instagram, kalite, konu, media, scan, viral, yazi  # noqa: E402
from tests import ornek_veri  # noqa: E402

quiet = lambda *_: None  # noqa: E731


class Viral(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.arsiv, cls.ig = ornek_veri.build(TMP / "ornek")
        cls.con = db.connect(TMP / "viral.db")
        scan.scan_folder(cls.con, cls.arsiv, progress=quiet)
        instagram.import_export(cls.con, cls.ig, progress=quiet)
        cls.res = viral.analyze(cls.con, progress=quiet)

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(TMP, ignore_errors=True)

    def test_analiz_hepsini_puanlar(self):
        n = self.con.execute("SELECT COUNT(*) FROM items WHERE viral_score IS NULL").fetchone()[0]
        self.assertEqual(n, 0)
        q = self.con.execute("SELECT quality FROM items WHERE filename='imza.mp4'").fetchone()[0]
        self.assertIn("hook", json.loads(q), "video kanca analizi yapılmalı")

    def test_siralama_azalan(self):
        r = viral.rank(self.con, lang="de", posted=None, limit=50)
        scores = [i["viral_score"] for i in r["items"]]
        self.assertEqual(scores, sorted(scores, reverse=True))
        self.assertGreaterEqual(len(scores), 11)
        n = r["items"][0]["neviral"]
        self.assertTrue(n["platformlar"] and n["pazarlar"] and n["konular"])
        self.assertAlmostEqual(sum(m["pay"] for m in n["pazarlar"]), 1.0, delta=0.01)
        self.assertIn(n["pazarlar"][0]["dil"], ("tr", "de", "en"))

    def test_platform_siralamasi(self):
        r = viral.rank(self.con, platform="tiktok", posted=None, limit=50)
        tk = [next(p["puan"] for p in i["neviral"]["platformlar"] if p["key"] == "tiktok") for i in r["items"]]
        self.assertEqual(tk, sorted(tk, reverse=True))

    def test_video_feed_yok(self):
        v = self.con.execute("SELECT viral FROM items WHERE kind='video' LIMIT 1").fetchone()[0]
        self.assertNotIn("ig_feed", json.loads(v)["p"])

    def test_dikey_video_yatayi_gecer(self):
        a = self.con.execute("SELECT viral FROM items WHERE filename='imza.mp4'").fetchone()[0]
        b = self.con.execute("SELECT viral FROM items WHERE filename='plaj.mov'").fetchone()[0]
        self.assertGreater(json.loads(a)["p"]["tiktok"], json.loads(b)["p"]["tiktok"])

    def test_pazar_ipuclari(self):
        it = {"place": "Berlin, Deutschland", "albums": [], "labels": []}
        m = konu.markets(it, viral.DEFAULT_AUDIENCE, konu.topics(it))
        self.assertEqual(next(iter(m)), "DE")
        it = {"place": "İstanbul", "albums": ["Kitap fuarı"]}
        self.assertEqual(next(iter(konu.markets(it, {"TR": 0.2, "DE": 0.6, "INT": 0.2}, konu.topics(it)))), "TR")

    def test_metinler_uc_dil(self):
        it = db.search(self.con, q="kitap-lansman")["items"][0]
        caps = yazi.rule_captions(it, konu.topics(it), 0.0, "@test")
        for lang in ("tr", "de", "en"):
            for p in algoritma.PLATFORMS:
                c = caps[lang][p]
                self.assertTrue(c["hook"] and c["caption"] and c["hashtags"])
                self.assertLessEqual(len(c["hashtags"]), yazi.TAG_COUNT[p])
        self.assertIn("#Shorts", caps["de"]["yt_shorts"]["title"])
        self.assertIn("#booktok", " ".join(caps["en"]["ig_reels"]["hashtags"]).lower() + " ".join(caps["en"]["tiktok"]["hashtags"]).lower())

    def test_kalite_olcumu(self):
        q = kalite.image_metrics(self.arsiv / "2019/Yaz Tatili/deniz1.jpg")
        for k in ("sharp", "exposure", "contrast", "color", "quality"):
            self.assertTrue(0 <= q[k] <= 1)
        self.assertIn("brightness=", kalite.eq_for({"brightness": 60, "color": 0.2, "contrast": 0.2, "sharp": 0.2}))

    def test_gecmisten_ogrenme(self):
        rows = self.con.execute("SELECT id FROM posts WHERE item_id IS NOT NULL").fetchall()
        for k, r in enumerate(rows):
            self.con.execute("UPDATE posts SET likes=?, reach=? WHERE id=?", (100 + 50 * k, 1000, r["id"]))
        for k in range(8):
            db.upsert_post(self.con, {"platform": "instagram", "kind": "post", "posted_at": f"2020-01-0{k + 1}T10:00:00", "media_path": f"x{k}",
                                      "item_id": rows[k % len(rows)]["id"], "likes": 10 * k, "reach": 1000})
        self.con.commit()
        self.assertGreaterEqual(viral.learn(self.con)["n"], 8)

    def test_paket(self):
        iid = self.con.execute("SELECT id FROM items WHERE filename='imza.mp4'").fetchone()[0]
        r = viral.package(self.con, iid, platforms=["ig_reels", "tiktok"], langs=["tr", "de"], progress=quiet)
        d = Path(r["klasor"])
        pkg = json.loads((d / "paket.json").read_text())
        self.assertEqual(set(pkg["metinler"]), {"tr", "de"})
        self.assertTrue(pkg["zamanlar"]["tiktok"])
        vid = next(f for f in r["dosyalar"] if f.endswith(".mp4"))
        info = media.probe(vid)
        self.assertEqual((info["width"], info["height"]), (1080, 1920))
        self.assertLessEqual(info["duration"], 30.5)
        self.assertTrue((d / "aciklamalar.txt").read_text().count("[DE]") >= 2)

    def test_foto_paketi_akis_gorseli(self):
        iid = self.con.execute("SELECT id FROM items WHERE filename='deniz2.jpg'").fetchone()[0]
        r = viral.package(self.con, iid, platforms=["ig_feed"], langs=["en"], progress=quiet)
        from PIL import Image
        img = next(f for f in r["dosyalar"] if f.endswith("instagram-4x5.jpg"))
        self.assertEqual(Image.open(img).size, (1080, 1350))

    def test_paket_secenekleri(self):
        iid = self.con.execute("SELECT id FROM items WHERE filename='uzun-vlog.mp4'").fetchone()[0]
        r = viral.package(self.con, iid, platforms=["tiktok"], langs=["en"], progress=quiet,
                          opts={"format": "4:5", "sure": 7, "muzik": "enerjik", "hook": "Mein eigener Hook", "iyilestir": False, "hatirlat": False})
        info = media.probe(next(f for f in r["dosyalar"] if f.endswith(".mp4")))
        self.assertEqual((info["width"], info["height"]), (1080, 1350))
        self.assertAlmostEqual(info["duration"], 7, delta=0.5)
        pkg = json.loads((Path(r["klasor"]) / "brief.json").read_text())
        self.assertEqual(pkg["baslik"], "Mein eigener Hook")

    def test_disaridan_yukleme(self):
        import http.client
        import threading
        from arsiv import server
        server.Handler.db_path = str(TMP / "viral.db")
        httpd = server.ThreadingHTTPServer(("127.0.0.1", 0), server.Handler)
        port = httpd.server_address[1]
        threading.Thread(target=httpd.serve_forever, daemon=True).start()
        try:
            data = (self.arsiv / "2024/Kitap Fuari/imza.mp4").read_bytes()

            def up(headers):
                c = http.client.HTTPConnection("127.0.0.1", port, timeout=60)
                c.request("POST", "/api/upload?name=" + "WhatsApp%20Video.mp4", body=data, headers=headers)
                r = c.getresponse(); body = r.read(); c.close()
                return r.status, body
            st, _ = up({"Content-Type": "application/octet-stream"})
            self.assertEqual(st, 403, "özel başlık olmadan (CSRF) reddedilmeli")
            st, body = up({"Content-Type": "application/octet-stream", "X-Neviral": "1", "X-Lang": "de"})
            self.assertEqual(st, 200, body[:300])
            it = json.loads(body)
            self.assertEqual(it["source"], "harici")
            self.assertGreater(it["viral_score"], 0)
            self.assertTrue(it["neviral"]["platformlar"])
            self.assertIn("hook", it["quality"])
            st, _ = up({"Content-Type": "application/octet-stream", "X-Neviral": "1", "Origin": "http://evil.example"})
            self.assertEqual(st, 403)
            r = viral.rank(self.con, source="harici", posted=None)
            self.assertGreaterEqual(r["total"], 1)
        finally:
            httpd.shutdown()

    def test_karar(self):
        from arsiv import karar
        r = viral.rank(self.con, lang="de", posted=None, limit=50)
        for it in r["items"]:
            kk = it["neviral"]["karar_kisa"]
            self.assertIn(kk["seviye"], ("simdi", "optimize", "guclu_kanca", "arsiv"))
            self.assertGreaterEqual(kk["sonra"], round(it["viral_score"]) - 1)
        it = db.get_item(self.con, self.con.execute("SELECT id FROM items WHERE filename='uzun-vlog.mp4'").fetchone()[0])
        for lang in ("tr", "de", "en"):
            n = viral.present(self.con, it, lang, total=r["analiz_edilen"], detail=True)
            k = n["karar"]
            self.assertIn(k["baslik"], k["ozet"])
            self.assertAlmostEqual(k["sonra"], min(100, k["simdi"] + sum(g["kazanc"] for g in k["kazanclar"])), delta=0.15)
            plat = next(p["puan"] for p in n["platformlar"] if p["key"] == k["oneri"]["platform"])
            self.assertAlmostEqual(sum(p["puan"] for p in k["katkilar"]), plat, delta=0.6, msg="katkılar platform puanını vermeli")
            self.assertTrue(any(g["key"] == "duration" for g in k["kazanclar"]), "uzun video: kesme kazancı olmalı")
            self.assertTrue(k["guven"]["neden"])
            self.assertIn(k["oneri"]["dil"], ("tr", "de", "en"))
        self.assertIn("Jetzt posten", [t[1] for _, _, t, _ in karar.LEVELS])

    def test_mevsim_ve_seri(self):
        import datetime as dt
        ctx = viral.context(self.con, today=dt.date(2026, 4, 10))  # 23 Nisan Dünya Kitap Günü 13 gün sonra
        self.assertIn("kitap", ctx["events"])
        self.assertLessEqual(ctx["events"]["kitap"]["gun"], 13)
        it = db.get_item(self.con, self.con.execute("SELECT id FROM items WHERE filename='imza.mp4'").fetchone()[0])
        ex = viral.extras(it, [("kitap", 1.0)], ctx)
        self.assertGreater(ex["season"], 0.5)
        far = viral.context(self.con, today=dt.date(2026, 7, 1))
        self.assertNotIn("kitap", far["events"])
        base = dict(it, kind="foto", aspect="4:5", duration=0)
        s0 = {"quality": 0.6, "hook": 0.4, "people": 0.5, "novelty": 1.0, "history": 0.5, "nostalgia": 0.0}
        a, _ = algoritma.score_platform("ig_feed", s0, base, [("kitap", 1.0)])
        b, _ = algoritma.score_platform("ig_feed", dict(s0, series=0.5), base, [("kitap", 1.0)])
        c, _ = algoritma.score_platform("ig_reels", dict(s0, season=1.0), base, [("kitap", 1.0)])
        a2, _ = algoritma.score_platform("ig_reels", s0, base, [("kitap", 1.0)])
        self.assertGreater(b, a, "aynı gün serisi carousel puanını artırmalı")
        self.assertGreater(c, a2, "yaklaşan özel gün konu puanını artırmalı")
        fake = {"events": {}, "series": {(it["year"], it["month"], it["day"]): 5}}
        self.assertEqual(viral.extras(dict(it, kind="foto"), [("kitap", 1.0)], fake)["seri"], 5)

    def test_ayarlar(self):
        st = viral.save_settings(self.con, kitle={"TR": 10, "DE": 80, "INT": 10}, saat_dilimi="Europe/Istanbul", hesap="@neviral")
        self.assertAlmostEqual(st["kitle"]["DE"], 0.8, delta=0.01)
        self.assertEqual(st["saat_dilimi"], "Europe/Istanbul")
        viral.rescore(self.con, quiet)
        de_best = self.con.execute("SELECT COUNT(*) FROM items WHERE json_extract(viral,'$.mb')='DE'").fetchone()[0]
        self.assertGreater(de_best, 0)


if __name__ == "__main__":
    unittest.main()
