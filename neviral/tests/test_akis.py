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

from arsiv import config, db, instagram, marketing, media, reminders, scan, score, studio, viral  # noqa: E402
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

    def test_01c_istatistik_ayri_medya_ayri_satir(self):
        """Aynı akşam 30 dk arayla 2 hikâye + 1 reel: istatistikler birbirini EZMEMELİ (3 ayrı satır); bozuk kayıt diğerlerini düşürmemeli."""
        import json
        root = TMP / "sadece-istatistik"
        (root / "past_instagram_insights").mkdir(parents=True, exist_ok=True)

        def node(uri, ts, **vals):
            smd = {"Zeitstempel der Erstellung": {"value": "", "timestamp": ts}}
            smd.update({k: {"value": str(v), "timestamp": 0} for k, v in vals.items()})
            return {"media_map_data": {"Medien-Miniaturbild": {"uri": uri, "creation_timestamp": ts}}, "string_map_data": smd}
        t0 = int(dt.datetime(2026, 6, 1, 20, 0).timestamp())
        stories = [node("media/stories/202606/s1.mp4", t0, **{"Erreichte Konten": 300, "Antworten": 4}),
                   node("media/stories/202606/s2.mp4", t0 + 1800, **{"Erreichte Konten": 120}),
                   {"media_map_data": [1, 2], "string_map_data": {"Zeitstempel der Erstellung": {"timestamp": "abc"}}},  # bozuk
                   node("media/stories/202606/s3.mp4", (t0 + 3600) * 1000, **{"Erreichte Konten": 50})]  # ms zaman damgası
        reels = [node("media/posts/202606/r1.mp4", t0 + 600, **{"Erreichte Konten": 9000, "\u00e2\u0080\u009eGef\u00c3\u00a4llt mir\u00e2\u0080\u009c-Angaben": 800, "Geteilte Inhalte": 90})]
        live = [node("media/posts/202606/l1.jpg", t0 + 900, **{"Erreichte Konten": 59, "Kommentare": 6})]
        (root / "past_instagram_insights/stories.json").write_text(json.dumps({"organic_insights_stories": stories}), encoding="utf-8")
        (root / "past_instagram_insights/reels.json").write_text(json.dumps({"organic_insights_reels": reels}), encoding="utf-8")
        (root / "past_instagram_insights/live_videos.json").write_text(json.dumps({"organic_insights_live": live}), encoding="utf-8")
        con = db.connect(TMP / "ist.db")
        n = instagram.import_insights_export(con, root, progress=quiet)
        self.assertEqual(n, 5, "4 geçerli + 1 ms-zaman-damgalı kayıt; bozuk kayıt atlanır")
        rows = {Path(r["media_path"]).name: dict(r) for r in con.execute("SELECT * FROM posts")}
        self.assertEqual(set(rows), {"s1.mp4", "s2.mp4", "s3.mp4", "r1.mp4", "l1.jpg"}, "her medya kendi satırı")
        self.assertEqual((rows["s1.mp4"]["reach"], rows["s1.mp4"]["comments"]), (300, 4))
        self.assertEqual(rows["s2.mp4"]["reach"], 120)
        self.assertEqual((rows["r1.mp4"]["kind"], rows["r1.mp4"]["reach"], rows["r1.mp4"]["likes"], rows["r1.mp4"]["shares"]), ("reel", 9000, 800, 90))
        self.assertEqual((rows["l1.jpg"]["kind"], rows["l1.jpg"]["reach"], rows["l1.jpg"]["comments"]), ("live", 59, 6))
        self.assertEqual(rows["s3.mp4"]["posted_at"][:4], "2026", "milisaniye zaman damgası saniyeye çevrilmeli")
        # ikinci içe aktarma aynı satırları günceller, çoğaltmaz
        instagram.import_insights_export(con, root, progress=quiet)
        self.assertEqual(con.execute("SELECT COUNT(*) FROM posts").fetchone()[0], 5)
        # dosya adı eşleşmesi: 'party.jpg' LIKE '%y.jpg' gibi son-ek kazaları olmamalı
        db.upsert_post(con, {"platform": "instagram", "kind": "post", "posted_at": "2026-06-02T10:00:00", "media_path": "/x/party.jpg", "reach": 7})
        self.assertIsNone(instagram._find_post(con, {"uri": "media/posts/y.jpg", "kind": "post", "posted_at": "2026-06-02T10:00:00"})[0])
        self.assertIsNotNone(instagram._find_post(con, {"uri": "media/posts/party.jpg", "kind": "post", "posted_at": "2026-06-02T10:00:00"})[0])
        con.close()

    def test_02_instagram(self):
        r = instagram.import_export(self.con, self.ig, progress=quiet)
        self.assertEqual(r["bulunan"], 4, "insights dosyaları paylaşım sayılmamalı")
        self.assertGreaterEqual(r["eslesen"], 3)
        posts = db.posts(self.con)["posts"]
        reel = next(p for p in posts if p["kind"] == "reel")
        self.assertEqual(reel["matched_by"], "gorsel")
        self.assertEqual((reel["reach"], reel["likes"], reel["shares"], reel["saves"]), (40210, 3100, 410, 260))
        lans = next(p for p in posts if "lansman" in (p["media_path"] or ""))
        self.assertEqual((lans["reach"], lans["likes"], lans["comments"]), (12345, 980, 45), "Almanca başlıklar + binlik nokta okunmalı")
        self.assertEqual(len(posts), 4 + 9, "istatistik satırları mevcut paylaşımlara bağlanmalı (dosya adı/tarih); yalnızca 9 hikâye yeni")
        self.assertEqual((lans["views"], lans["follows"]), (14533, 2), "gösterim ve yeni takipçi okunmalı")
        self.assertIn("#kitap", lans["caption"] or "", "istatistik dosyasındaki açıklama paylaşıma yazılmalı")
        stories = [p for p in posts if p["kind"] == "story"]
        self.assertEqual(len(stories), 10, "dışa aktarımdaki 1 hikâye + istatistikten 9 hikâye")
        self.assertEqual(sum(1 for p in stories if p["reach"]), 9)
        self.assertEqual(r["istatistik"], 12)
        st = viral.settings(self.con)
        self.assertAlmostEqual(st["kitle"]["DE"], 0.94, delta=0.01, msg="kitle ülke dağılımından otomatik ayarlanmalı (DE+CH+AT)")
        self.assertAlmostEqual(st["kitle"]["TR"], 0.036, delta=0.005)
        oz = st["ozet"]
        self.assertEqual(oz["kitle"]["takipci"], 10801)
        self.assertEqual(oz["kitle"]["kadin"], 78.8)
        self.assertEqual(oz["kitle"]["yas"]["35-44"], 43.1)
        self.assertEqual(oz["etkilesim"]["reels"], 6173)
        self.assertEqual(oz["etkilesim"]["takipci_disi_pct"], 83.2)
        bt = marketing.best_times(self.con, lang="de")
        self.assertEqual([h["saat"] for h in bt["hikaye_saatleri"]], [9], "hikâye saatleri: ≥5 örnekli saatler, erişime göre")
        self.assertEqual(bt["hikaye_saatleri"][0]["erisim_medyan"], 125)
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
