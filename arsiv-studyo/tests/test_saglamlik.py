"""Gözden geçirmede bulunan hataların ve güvenlik açıklarının regresyon testleri."""
import datetime as dt
import http.client
import json
import os
import shutil
import sqlite3
import sys
import tempfile
import threading
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
TMP = Path(tempfile.mkdtemp(prefix="arsiv-sag-"))
os.environ["ARSIV_HOME"] = str(TMP / "home")
os.environ.pop("ARSIV_DB", None)
os.environ["ARSIV_NO_CLAUDE"] = "1"

from arsiv import collect, config, db, highlights, instagram, media, reminders, scan, server, studio, takvim, text_overlay  # noqa: E402
from tests import ornek_veri  # noqa: E402

quiet = lambda *_: None  # noqa: E731


class Saglamlik(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.arsiv, cls.ig = ornek_veri.build(TMP / "ornek")
        cls.con = db.connect()
        scan.scan_folder(cls.con, cls.arsiv, progress=quiet)
        cls.ids = {i["filename"]: i["id"] for i in db.search(cls.con, limit=100)["items"]}

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(TMP, ignore_errors=True)

    # ---------------------------------------------------------------- veritabanı
    def test_fts_turkce_ve_tirnak(self):
        it = self.ids["deniz1.jpg"]
        db.set_item(self.con, it, albums=["Işık Festivali", "Yaz Tatili", "2019"])
        for q in ("ışık", "isik", "IŞIK", "Işık"):
            self.assertGreaterEqual(db.search(self.con, q=q)["total"], 1, q)
        self.assertEqual(db.search(self.con, q='ab"cd')["total"], 0)

    def test_fts_eski_semadan_gecis(self):
        path = TMP / "eski.db"
        c = sqlite3.connect(path)
        c.execute("CREATE TABLE items(id INTEGER PRIMARY KEY, uuid TEXT UNIQUE NOT NULL, source TEXT NOT NULL, kind TEXT NOT NULL, filename TEXT, albums TEXT DEFAULT '[]')")
        c.execute("INSERT INTO items(uuid,source,kind,filename,albums) VALUES('a','t','foto','x.jpg','[\"Kitap Fuarı\"]')")
        c.execute("CREATE VIRTUAL TABLE items_fts USING fts5(uuid UNINDEXED, text)")
        c.commit(); c.close()
        try:
            c2 = db.connect(path)
        except sqlite3.OperationalError:
            self.skipTest("eski tablo şeması yeni sütunlardan yoksun (yalnızca FTS geçişi test ediliyor)")
        cols = [r[1] for r in c2.execute("PRAGMA table_info(items_fts)")]
        self.assertNotIn("uuid", cols)
        self.assertEqual(c2.execute("SELECT COUNT(*) FROM items_fts WHERE items_fts MATCH '\"kitap\"*'").fetchone()[0], 1)

    def test_istatistik(self):
        s = db.stats(self.con)
        self.assertEqual(s["toplam"], db.search(self.con, limit=1)["total"])
        self.assertTrue(any(name == "Yaz Tatili" for name, _ in s["albumler"]))

    # ---------------------------------------------------------------- üretim
    def _render(self, brief):
        return studio.render(self.con, dict({"kalite": "orta", "muzik": "yok"}, **brief), progress=quiet)

    def test_eskiden_simdi_45_foto(self):
        res = self._render({"sablon": "eskiden-simdi", "format": "4:5", "ogeler": [self.ids["deniz1.jpg"], self.ids["ilk-gun.jpg"]], "foto_suresi": 2})
        info = media.probe(res["output"])
        self.assertEqual((info["width"], info["height"]), (1080, 1350))

    def test_baslangic_videodan_uzun(self):
        res = self._render({"sablon": "montaj", "ogeler": [self.ids["deniz2.jpg"], {"id": self.ids["plaj.mov"], "baslangic": 99}, self.ids["deniz3.png"]],
                            "foto_suresi": 2})
        info = media.probe(res["output"])
        self.assertGreater(info["duration"], 3.5)

    def test_eksik_dosya_atlanir(self):
        extra = TMP / "extra"; extra.mkdir(exist_ok=True)
        f = extra / "gone.jpg"; shutil.copy(self.arsiv / "2023/deniz3.png", f.with_suffix(".png"))
        scan.scan_folder(self.con, extra, progress=quiet)
        gid = db.search(self.con, q="gone")["items"][0]["id"]
        f.with_suffix(".png").unlink()
        res = self._render({"sablon": "montaj", "ogeler": [self.ids["deniz1.jpg"], gid, self.ids["deniz2.jpg"]], "foto_suresi": 2})
        self.assertTrue(Path(res["output"]).exists())

    def test_kisa_klip_gecis(self):
        b = studio.normalize_brief({"foto_suresi": 0.5, "max_sure": 0, "gecis_suresi": 5})
        self.assertGreaterEqual(b["foto_suresi"], 1.0)
        self.assertGreaterEqual(b["max_sure"], 2.0)
        self.assertLessEqual(b["gecis_suresi"], 2.0)

    def test_carousel_varsayilan_45_ve_limitsiz(self):
        ph = [self.ids[n] for n in ("deniz1.jpg", "deniz2.jpg", "deniz3.png", "ilk-gun.jpg", "stant.jpg", "kitap-lansman.jpg")]
        res = self._render({"sablon": "carousel", "ogeler": ph, "max_sure": 5})
        self.assertEqual(len(res["dosyalar"]), 6)
        from PIL import Image
        self.assertEqual(Image.open(res["dosyalar"][0]).size, (1080, 1350))

    def test_yeniden_kesit_suresi(self):
        res = self._render({"sablon": "yeniden", "ogeler": [{"id": self.ids["uzun-vlog.mp4"], "baslangic": 5, "sure": 4}]})
        self.assertAlmostEqual(media.probe(res["output"])["duration"], 4, delta=0.4)

    def test_ses_video_esit(self):
        res = self._render({"sablon": "montaj", "ogeler": [self.ids["imza.mp4"], self.ids["deniz1.jpg"]], "klip_max": 3, "foto_suresi": 2})
        out = subprocess_streams(res["output"])
        self.assertAlmostEqual(out["video"], out["audio"], delta=0.15)

    def test_renk_enjeksiyonu(self):
        b = studio.normalize_brief({"renk": "#000000,hflip", "vurgu": "red;x", "muzik": "/etc/passwd", "yazi_tipi": "/etc/hosts"})
        self.assertEqual(b["renk"], studio.DEFAULT_BRIEF["renk"])
        self.assertEqual(b["vurgu"], studio.DEFAULT_BRIEF["vurgu"])
        self.assertEqual(b["muzik"], "sakin")
        self.assertIsNone(b["yazi_tipi"])

    def test_en_iyi_an(self):
        p = self.arsiv / "2022/uzun-vlog.mp4"
        st = highlights.best_start(p, media.probe(p)["duration"], 6)
        self.assertTrue(0 <= st <= 95 - 6)

    def test_yazi_tasmaz(self):
        for W, H in ((1080, 1920), (1080, 1080), (1920, 1080)):
            for img in (text_overlay.caption_card(W, H, "çok uzun açıklama " * 20), text_overlay.intro_card(W, H, "Kindergartenabschlussfeier"),
                        text_overlay.label_card(W, H, "x " * 60)):
                bbox = img.getbbox()
                self.assertTrue(bbox and bbox[0] >= 0 and bbox[1] >= 0 and bbox[2] <= W and bbox[3] <= H)
        z = text_overlay.safe_zone(1080, 1920)
        bb = text_overlay.label_card(1080, 1920, "2019").getbbox()
        self.assertLessEqual(bb[3], 1920 - z["bottom"] + 2, "etiket Reels alt arayüzünün altında kalmamalı")

    # ---------------------------------------------------------------- diğer
    def test_hatirlatici_cakismaz(self):
        instagram.import_export(self.con, self.ig, progress=quiet)
        created = reminders.plan_reshares(self.con, weeks=2, per_week=3, min_days=30, start=dt.date(2026, 10, 3), progress=quiet)
        dues = [c["due"][:13] for c in created]
        self.assertEqual(len(dues), len(set(dues)))

    def test_ics_kacis(self):
        db.add_reminder(self.con, "2026-10-10T10:00:00", "Benign\r\nX-INJECTED:1", note="a;b")
        out = TMP / "x.ics"
        reminders.export_ics(self.con, out)
        self.assertNotIn("\r\nX-INJECTED:1", out.read_text())

    def test_koleksiyon_ayni_ad(self):
        a, b = TMP / "dup/A", TMP / "dup/B"
        a.mkdir(parents=True, exist_ok=True); b.mkdir(parents=True, exist_ok=True)
        shutil.copy(self.arsiv / "2019/Yaz Tatili/deniz1.jpg", a / "IMG_0001.JPG")
        shutil.copy(self.arsiv / "2019/Yaz Tatili/deniz2.jpg", b / "IMG_0001.JPG")
        scan.scan_folder(self.con, TMP / "dup", progress=quiet)
        ids = [i["id"] for i in db.search(self.con, q="IMG_0001")["items"]]
        r = collect.collect(self.con, ids, "..", mode="copy", progress=quiet)
        self.assertEqual(len([p for p in Path(r["klasor"]).iterdir() if p.suffix == ".JPG"]), 2)
        self.assertTrue(Path(r["klasor"]).resolve().is_relative_to(config.COLLECT.resolve()))

    def test_csv_meta_bicimi(self):
        p = TMP / "insights.csv"
        p.write_text("Publish time,Description,Date,Reach,Likes\n11/12/2019 12:00,Kitap,Lifetime,800,120\n", encoding="utf-8")
        self.assertEqual(instagram.import_insights_csv(self.con, p, progress=quiet), 1)

    def test_takvim(self):
        rows = takvim.upcoming("de", dt.date(2026, 4, 20), 10)
        names = [r["ad"] for r in rows]
        self.assertIn("Welttag des Buches", names)
        self.assertEqual(takvim._easter(2026), dt.date(2026, 4, 5))

    # ---------------------------------------------------------------- sunucu güvenliği
    def test_sunucu_guvenlik(self):
        httpd = server.ThreadingHTTPServer(("127.0.0.1", 0), server.Handler)
        port = httpd.server_address[1]
        threading.Thread(target=httpd.serve_forever, daemon=True).start()
        try:
            def req(method, path, body=None, headers=None):
                c = http.client.HTTPConnection("127.0.0.1", port, timeout=10)
                c.request(method, path, body=body, headers=headers or {})
                r = c.getresponse(); data = r.read(); c.close()
                return r.status, data
            self.assertEqual(req("GET", "/api/stats")[0], 200)
            self.assertEqual(req("GET", "/api/stats", headers={"Host": "evil.example:%d" % port})[0], 403)
            self.assertEqual(req("GET", "/ui//etc/hostname")[0], 404)
            self.assertEqual(req("GET", "/ui/....//....//etc/hostname")[0], 404)
            self.assertEqual(req("GET", "/ui/i18n.js")[0], 200)
            body = json.dumps({"dil": "de"})
            self.assertEqual(req("POST", "/api/settings", body, {"Content-Type": "text/plain"})[0], 403)
            self.assertEqual(req("POST", "/api/settings", body, {"Content-Type": "application/json", "Origin": "http://evil.example"})[0], 403)
            self.assertEqual(req("POST", "/api/settings", body, {"Content-Type": "application/json", "Origin": f"http://127.0.0.1:{port}"})[0], 200)
            st, data = req("POST", "/api/reminders", json.dumps({"due": "2026-10-10T10:00", "title": "x", "item_ids": ['"><b>']}),
                           {"Content-Type": "application/json"})
            self.assertNotEqual(st, 200)
            self.assertEqual(req("POST", "/api/scan", json.dumps({"path": "/"}), {"Content-Type": "application/json"})[0], 400)
            self.assertEqual(req("POST", "/api/open", json.dumps({"path": "/etc"}), {"Content-Type": "application/json"})[0] in (200, 403), True)
        finally:
            httpd.shutdown()


def subprocess_streams(path):
    import re
    import subprocess
    err = subprocess.run([media.ffmpeg_path(), "-hide_banner", "-i", str(path), "-f", "null", "-"], capture_output=True, text=True).stderr
    times = re.findall(r"time=(\d+):(\d+):([\d.]+)", err)
    total = None
    if times:
        h, m, s = times[-1]
        total = int(h) * 3600 + int(m) * 60 + float(s)
    # akış süreleri: ffprobe yoksa paket zamanlarından
    import json as _j
    fp = media.ffprobe_path()
    if fp:
        j = _j.loads(subprocess.run([fp, "-v", "error", "-show_streams", "-of", "json", str(path)], capture_output=True, text=True).stdout)
        d = {s["codec_type"]: float(s.get("duration") or 0) for s in j["streams"]}
        return {"video": d.get("video", 0), "audio": d.get("audio", 0)}
    v = subprocess.run([media.ffmpeg_path(), "-hide_banner", "-i", str(path), "-map", "0:v", "-f", "null", "-"], capture_output=True, text=True).stderr
    a = subprocess.run([media.ffmpeg_path(), "-hide_banner", "-i", str(path), "-map", "0:a", "-f", "null", "-"], capture_output=True, text=True).stderr

    def last(t):
        x = re.findall(r"time=(\d+):(\d+):([\d.]+)", t)
        h, m, s = x[-1]
        return int(h) * 3600 + int(m) * 60 + float(s)
    return {"video": last(v), "audio": last(a)}


if __name__ == "__main__":
    unittest.main()
