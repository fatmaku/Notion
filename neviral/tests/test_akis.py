"""Uçtan uca duman testi: örnek arşiv → tarama → Instagram eşleme → arama → üretim → hatırlatıcı.
Çalıştırma (neviral klasöründe): python3 -m unittest tests.test_akis -v   (ffmpeg gerekir; yoksa ARSIV_FFMPEG=... verin)"""
import datetime as dt
import os
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
TMP = Path(tempfile.mkdtemp(prefix="arsiv-test-"))
os.environ["ARSIV_HOME"] = str(TMP / "home")
os.environ.pop("ARSIV_DB", None)
os.environ["ARSIV_NO_CLAUDE"] = "1"

from arsiv import config, db, instagram, marketing, media, reminders, scan, score, studio  # noqa: E402
from tests import ornek_veri  # noqa: E402

quiet = lambda *_: None  # noqa: E731


class Akis(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.arsiv, cls.ig = ornek_veri.build(TMP / "ornek")
        cls.con = db.connect()

    @classmethod
    def tearDownClass(cls):
        cls.con.close()
        shutil.rmtree(TMP, ignore_errors=True)

    def test_01_tarama(self):
        r = scan.scan_folder(self.con, self.arsiv, progress=quiet)
        self.assertEqual(r["yeni"], 11)
        self.assertEqual(r["hata"], 0)
        r2 = scan.scan_folder(self.con, self.arsiv, progress=quiet)
        self.assertEqual(r2["atlanan"], 11, "ikinci tarama değişmeyenleri atlamalı")
        it = db.search(self.con, q="reel-deneme")["items"][0]
        self.assertEqual((it["kind"], it["aspect"], it["year"]), ("video", "9:16", 2020))
        self.assertAlmostEqual(it["duration"], 12, delta=0.5)
        self.assertTrue(Path(it["thumb"]).exists())
        foto = db.search(self.con, q="deniz1")["items"][0]
        self.assertEqual(foto["created_at"][:10], "2019-06-01", "EXIF tarihi okunmalı")
        self.assertIn("Yaz Tatili", foto["albums"])

    def test_01b_instagram_zip(self):
        """Instagram büyük dışa aktarımı parçalı zip'lerle gelir; açmadan içe aktarılabilmeli."""
        import shutil
        import zipfile
        zdir = self.ig.parent / "zipler"
        zdir.mkdir(exist_ok=True)
        files = sorted(p for p in self.ig.rglob("*") if p.is_file())
        half = len(files) // 2
        for i, part in enumerate((files[:half], files[half:]), 1):
            with zipfile.ZipFile(zdir / f"instagram-test-2026-part-{i}.zip", "w") as zf:
                for f in part:
                    zf.write(f, f.relative_to(self.ig))
                if i == 1:
                    zf.writestr("../../kacak.txt", "zip-slip")  # dışarı yazmaya çalışan üye atlanmalı
        out = instagram.prepare_source(zdir, progress=quiet)
        self.assertTrue(any(out.rglob("posts_1.json")))
        self.assertFalse((config.HOME / "kacak.txt").exists())
        self.assertFalse((out.parent / "kacak.txt").exists())
        single = instagram.prepare_source(zdir / "instagram-test-2026-part-1.zip", progress=quiet)
        self.assertTrue(single.is_dir())
        self.assertEqual(instagram.prepare_source(self.ig, progress=quiet), self.ig, "açık klasör olduğu gibi kullanılmalı")
        shutil.rmtree(out, ignore_errors=True); shutil.rmtree(single, ignore_errors=True)

    def test_02_instagram(self):
        r = instagram.import_export(self.con, self.ig, progress=quiet)
        self.assertEqual(r["bulunan"], 4, "insights dosyaları paylaşım sayılmamalı")
        self.assertGreaterEqual(r["eslesen"], 3)
        self.assertEqual(r["istatistik"], 3, "past_instagram_insights'tan 3 kayıt okunmalı")
        posts = db.posts(self.con)["posts"]
        reel = next(p for p in posts if p["kind"] == "reel")
        self.assertEqual(reel["matched_by"], "gorsel")
        self.assertEqual((reel["reach"], reel["likes"], reel["shares"], reel["saves"]), (40210, 3100, 410, 260))
        lans = next(p for p in posts if "lansman" in (p["media_path"] or ""))
        self.assertEqual((lans["reach"], lans["likes"], lans["comments"]), (12345, 980, 45), "Almanca başlıklar + binlik nokta okunmalı")
        self.assertEqual(len(posts), 4, "istatistik satırları yeni paylaşım yaratmamalı (tarihle eşleşti)")
        captions = [p["caption"] or "" for p in posts]
        self.assertTrue(any("Kitap lansmanı bugün! 📚" in c for c in captions), f"mojibake düzeltilmeli: {captions}")
        confirmed = {p["item_id"] for p in posts if p["item_id"] and p["matched_by"] != "tarih?"}
        self.assertEqual(db.search(self.con, posted=True)["total"], len(confirmed))

    def test_03_arama_ve_puan(self):
        self.assertEqual(db.search(self.con, q="yaz tatili")["total"], 3)
        self.assertEqual(db.search(self.con, kind="video", min_dur=10, max_dur=30)["total"], 2)
        top = db.search(self.con, sort="score", limit=1)["items"][0]
        self.assertGreaterEqual(top["social_score"], 70)
        self.assertTrue(score.on_this_day(self.con, dt.date(2025, 6, 2)))
        self.assertTrue(score.reshare_queue(self.con, min_days=30))
        self.assertTrue(marketing.ideas(self.con))

    def test_04_uretim_carousel(self):
        ids = [i["id"] for i in db.search(self.con, kind="foto", limit=3)["items"]]
        res = studio.render(self.con, {"sablon": "carousel", "ogeler": ids, "baslik": "Test", "etiket": "@test"}, progress=quiet)
        self.assertEqual(len(res["dosyalar"]), 3)
        self.assertTrue(all(Path(f).exists() for f in res["dosyalar"]))
        self.assertIn("#", res["caption"])

    def test_05_uretim_montaj(self):
        foto = db.search(self.con, kind="foto", limit=1)["items"][0]["id"]
        vid = db.search(self.con, q="plaj")["items"][0]["id"]
        res = studio.render(self.con, {"sablon": "montaj", "ogeler": [foto, {"id": vid, "baslangic": 1, "sure": 3}], "baslik": "Montaj",
                                       "cta": "Takip et", "etiket": "@t", "muzik": "enerjik", "kalite": "orta", "foto_suresi": 2},
                            progress=quiet)
        info = media.probe(res["output"])
        self.assertEqual((info["width"], info["height"]), (1080, 1920))
        self.assertAlmostEqual(info["duration"], 4.5, delta=0.3)  # 2 + 3 - 0.5 geçiş
        self.assertTrue(info["has_audio"])
        self.assertTrue(Path(res["cover"]).exists())

    def test_06_hatirlatici(self):
        created = reminders.plan_reshares(self.con, weeks=2, per_week=2, min_days=30, progress=quiet)
        self.assertTrue(created)
        ics = reminders.export_ics(self.con, TMP / "t.ics")
        self.assertIn("BEGIN:VEVENT", Path(ics).read_text())
        reminders.mark(self.con, created[0]["id"], "tamam")
        self.assertNotIn(created[0]["id"], [r["id"] for r in db.reminders(self.con, status="acik")])


if __name__ == "__main__":
    unittest.main()
