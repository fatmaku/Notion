"""Telefon bağlantısı: QR eşleştirme, Wi-Fi dinleyicisi güvenliği, telefon API'leri, kurulum asistanı."""
import http.client
import json
import os
import shutil
import sys
import tempfile
import threading
import time
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
TMP = Path(tempfile.mkdtemp(prefix="neviral-mobil-"))
os.environ["ARSIV_HOME"] = str(TMP / "home")
os.environ.pop("ARSIV_DB", None)
os.environ["ARSIV_NO_CLAUDE"] = "1"

from arsiv import db, mobil, scan, server, viral  # noqa: E402
from tests import ornek_veri  # noqa: E402

quiet = lambda *_: None  # noqa: E731


class Mobil(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.arsiv, cls.ig = ornek_veri.build(TMP / "ornek")
        cls.dbp = str(TMP / "m.db")
        con = db.connect(cls.dbp)
        scan.scan_folder(con, cls.arsiv, progress=quiet)
        viral.analyze(con, progress=quiet)
        # hazır bir paket (gerçek render yerine: video + kapak + paket.json)
        out = TMP / "paket"
        out.mkdir()
        (out / "Sizce-burası-neresi-9x16.mp4").write_bytes(b"\x00\x00\x00\x18ftypmp42" + b"0" * 2000)  # Türkçe harfli ad
        (out / "kapak.jpg").write_bytes((cls.arsiv / "2019/Yaz Tatili/deniz1.jpg").read_bytes())
        (out / "instagram-4x5.jpg").write_bytes((cls.arsiv / "2019/Yaz Tatili/deniz1.jpg").read_bytes())
        (out / "paket.json").write_text(json.dumps({
            "kanca": "Wie entsteht ein Kinderbuch?", "en_iyi_platform": "ig_reels",
            "dosyalar": [str(out / "Sizce-burası-neresi-9x16.mp4"), str(out / "instagram-4x5.jpg"), "/etc/passwd"],
            "metinler": {"de": {"ig_reels": {"hook": "Wie entsteht ein Kinderbuch?", "caption": "Zeile 1\nZeile 2 🎉"}},
                         "tr": {"ig_reels": {"hook": "Bir kitap nasıl doğar?", "caption": "Satır 1"}}},
            "zamanlar": {"ig_reels": [{"kullanici": "2026-10-09T19:00", "yerel": "19:00"}]},
            "karar": {"ozet": "Jetzt posten."}}, ensure_ascii=False), encoding="utf-8")
        cls.rid = db.add_render(con, "neviral", {"baslik": "x"}, [1])
        db.set_render(con, cls.rid, output=str(out / "Sizce-burası-neresi-9x16.mp4"), cover=str(out / "kapak.jpg"), status="hazir", caption="Zeile 1")
        cls.item = con.execute("SELECT id FROM items LIMIT 1").fetchone()[0]
        con.close()
        server.Handler.db_path = cls.dbp
        cls.httpd = server.ThreadingHTTPServer(("127.0.0.1", 0), server.Handler)
        cls.port = cls.httpd.server_address[1]
        threading.Thread(target=cls.httpd.serve_forever, daemon=True).start()
        cls._lan_ip_orig = mobil.lan_ip
        mobil.lan_ip = lambda: "127.0.0.1"  # test makinesinde Wi-Fi adresi yerine
        cls.lan_ip, cls.lan_port = mobil.start_lan(server.Handler, port=0, ip="127.0.0.1")

    @classmethod
    def tearDownClass(cls):
        mobil.lan_ip = cls._lan_ip_orig
        mobil.stop_lan()
        cls.httpd.shutdown()
        cls.httpd.server_close()
        shutil.rmtree(TMP, ignore_errors=True)

    # --- yardımcılar
    def req(self, method, path, body=None, headers=None, lan=False, cookie=None):
        port = self.lan_port if lan else self.port
        h = {"Host": f"127.0.0.1:{port}"}
        if cookie:
            h["Cookie"] = f"{mobil.COOKIE}={cookie}"
        h.update(headers or {})
        c = http.client.HTTPConnection("127.0.0.1", port, timeout=30)
        c.request(method, path, body=body, headers=h)
        r = c.getresponse()
        data = r.read()
        hdrs = {k.lower(): v for k, v in r.getheaders()}
        c.close()
        return r.status, data, hdrs

    def pair(self):
        st, body, _ = self.req("POST", "/api/mobil/eslestir", json.dumps({}), {"Content-Type": "application/json"})
        self.assertEqual(st, 200, body[:200])
        d = json.loads(body)
        tok = d["url"].split("k=", 1)[1].split("#")[0]
        st, _, h = self.req("GET", f"/m?k={tok}", lan=True)
        self.assertEqual(st, 303)
        cookie = h["set-cookie"].split(";", 1)[0].split("=", 1)[1]
        return cookie, tok, d

    # --- Wi-Fi tarafı: oturumsuz her şey kapalı
    def test_lan_kapali_kapilar(self):
        self.assertEqual(self.req("GET", "/api/mobil/paketler", lan=True)[0], 401)
        for p in ("/", "/api/stats", "/api/items", "/api/file/1", "/api/kurulum", "/api/mobil/terminal", "/ui/i18n.js", "/api/qr.svg?t=x"):
            self.assertEqual(self.req("GET", p, lan=True)[0], 404, p)
        st, _, _ = self.req("POST", "/api/scan", json.dumps({"path": "/"}), {"Content-Type": "application/json"}, lan=True)
        self.assertEqual(st, 404)
        st, _, _ = self.req("GET", "/m", headers={"Host": f"evil.example:{self.lan_port}"}, lan=True)
        self.assertEqual(st, 403, "DNS rebinding: yabancı Host reddedilmeli")
        st, body, _ = self.req("GET", "/m", lan=True)
        self.assertEqual(st, 200)
        self.assertIn(b"<html", body.lower())
        self.assertEqual(self.req("GET", "/m/icon.png", lan=True)[0], 200)
        self.assertEqual(self.req("GET", "/m/manifest.webmanifest", lan=True)[0], 200)

    def test_eslestirme_ve_oturum(self):
        st, body, h = self.req("GET", "/m?k=yanlis-anahtar", lan=True)
        self.assertEqual(st, 200)
        self.assertNotIn("set-cookie", h)
        cookie, tok, d = self.pair()
        self.assertTrue(d["svg"].lstrip().startswith("<svg"))
        self.assertIn(f"127.0.0.1:{self.lan_port}/m?k=", d["url"])
        self.assertTrue(d["acik"])
        st, _, h = self.req("GET", f"/m?k={tok}", lan=True)
        self.assertEqual(st, 200, "tek kullanımlık: ikinci kez çerez yok")
        self.assertNotIn("set-cookie", h)
        st, body, _ = self.req("GET", "/api/mobil/ben", lan=True, cookie=cookie)
        self.assertEqual(st, 200)
        self.assertFalse(json.loads(body)["yerel"])
        self.assertEqual(json.loads(self.req("GET", "/api/mobil/ben")[1])["yerel"], True, "Mac'te önizleme")
        # oturumlu tarayıcıyla yeni QR: yeni cihaz kaydı açılmaz
        n_before = len(json.loads(self.req("GET", "/api/mobil/durum")[1])["cihazlar"])
        _, body, _ = self.req("POST", "/api/mobil/eslestir", json.dumps({"render": self.rid}), {"Content-Type": "application/json"})
        d2 = json.loads(body)
        self.assertTrue(d2["url"].endswith(f"#r{self.rid}"))
        tok2 = d2["url"].split("k=", 1)[1].split("#")[0]
        st, _, h = self.req("GET", f"/m?k={tok2}", lan=True, cookie=cookie)
        self.assertEqual(st, 303)
        self.assertNotIn("set-cookie", h)
        self.assertEqual(len(json.loads(self.req("GET", "/api/mobil/durum")[1])["cihazlar"]), n_before)

    def test_telefon_verileri(self):
        cookie, _, _ = self.pair()
        st, body, _ = self.req("GET", "/api/mobil/paketler", lan=True, cookie=cookie)
        self.assertEqual(st, 200)
        p = next(x for x in json.loads(body)["paketler"] if x["id"] == self.rid)
        self.assertTrue(p["video"] and p["kapak"])
        self.assertEqual(p["en_iyi_platform"], "ig_reels")
        self.assertEqual(p["metinler"]["de"]["ig_reels"]["caption"], "Zeile 1\nZeile 2 🎉")
        self.assertEqual(p["zaman"]["ig_reels"][0]["yerel"], "19:00")
        self.assertEqual(p["karar_ozet"], "Jetzt posten.")
        st, data, h = self.req("GET", f"/api/render/{self.rid}/file?indir=1", lan=True, cookie=cookie)
        self.assertEqual(st, 200)
        cd = h.get("content-disposition", "")
        self.assertIn("attachment", cd)
        self.assertIn('filename="Sizce-burasi-neresi-9x16.mp4"', cd, "ASCII yedek ad (ı → i)")
        self.assertIn("filename*=UTF-8''Sizce-buras%C4%B1-neresi-9x16.mp4", cd)
        self.assertEqual(p["bilder"], [{"n": 0, "ad": "instagram-4x5.jpg"}], "yalnızca klasör içindeki görseller; kapak ve /etc/passwd yok")
        st, data, h = self.req("GET", f"/api/render/{self.rid}/dosya/0", lan=True, cookie=cookie)
        self.assertEqual((st, h.get("content-type")), (200, "image/jpeg"))
        self.assertEqual(data[:2], b"\xff\xd8")
        st, _, h = self.req("GET", f"/api/render/{self.rid}/dosya/0?indir=1", lan=True, cookie=cookie)
        self.assertIn("instagram-4x5.jpg", h.get("content-disposition", ""))
        self.assertEqual(self.req("GET", f"/api/render/{self.rid}/dosya/3", lan=True, cookie=cookie)[0], 404)
        self.assertEqual(self.req("GET", f"/api/render/{self.rid}/dosya/0", lan=True)[0], 401)
        self.assertEqual(self.req("GET", f"/api/render/{self.rid}/cover", lan=True, cookie=cookie)[0], 200)
        st, body, _ = self.req("GET", "/api/mobil/top?limit=5", lan=True, cookie=cookie)
        self.assertEqual(st, 200)
        items = json.loads(body)["items"]
        self.assertTrue(items and items[0]["thumb_url"].startswith("/api/thumb/"))
        self.assertIn("baslik", items[0]["karar_kisa"])
        self.assertEqual(self.req("GET", items[0]["thumb_url"], lan=True, cookie=cookie)[0], 200)
        self.assertEqual(self.req("GET", "/api/mobil/top?limit=abc", lan=True, cookie=cookie)[0], 200, "bozuk sayı varsayılana düşer")

    def test_telefondan_yukleme_ve_paket_kapisi(self):
        cookie, _, _ = self.pair()
        data = (self.arsiv / "2019/Yaz Tatili/deniz1.jpg").read_bytes()
        base = {"Content-Type": "application/octet-stream", "X-Neviral": "1", "X-Lang": "de"}
        st, body, _ = self.req("POST", "/api/upload?name=IMG_0001.jpg", data, base, lan=True)
        self.assertEqual(st, 401, "oturumsuz yükleme yok")
        st, body, _ = self.req("POST", "/api/upload?name=IMG_0001.jpg", data, dict(base, Origin=f"http://127.0.0.1:{self.lan_port}"), lan=True,
                               cookie=cookie)
        self.assertEqual(st, 200, body[:300])
        it = json.loads(body)
        self.assertEqual(it["source"], "harici")
        self.assertIn("karar_kisa", it["neviral"])
        st, _, _ = self.req("POST", "/api/upload?name=a.jpg", data, dict(base, Origin="http://evil.example"), lan=True, cookie=cookie)
        self.assertEqual(st, 403)
        st, _, _ = self.req("POST", "/api/viral/settings", json.dumps({}), {"Content-Type": "application/json"}, lan=True, cookie=cookie)
        self.assertEqual(st, 404, "beyaz listede olmayan POST")
        st, _, _ = self.req("POST", "/api/mobil/eslestir", json.dumps({}), {"Content-Type": "application/json"}, lan=True, cookie=cookie)
        self.assertEqual(st, 404, "telefon yeni telefon eşleştiremez")
        st, _, _ = self.req("POST", "/api/viral/package", "{}", {"Content-Type": "text/plain"}, lan=True, cookie=cookie)
        self.assertEqual(st, 403, "CSRF: JSON olmayan POST reddedilir (kapıdan geçti, korumaya takıldı)")
        st, _, _ = self.req("POST", "/api/viral/package", json.dumps({"id": self.item}),
                            {"Content-Type": "application/json", "Origin": "http://evil.example"}, lan=True, cookie=cookie)
        self.assertEqual(st, 403)

    def test_cikis_ve_cihaz_silme(self):
        cookie, _, _ = self.pair()
        st, _, h = self.req("POST", "/api/mobil/cikis", "{}", {"Content-Type": "application/json"}, lan=True, cookie=cookie)
        self.assertEqual(st, 200)
        self.assertIn("Max-Age=0", h.get("set-cookie", ""))
        self.assertEqual(self.req("GET", "/api/mobil/ben", lan=True, cookie=cookie)[0], 401)
        cookie2, _, _ = self.pair()
        devs = json.loads(self.req("GET", "/api/mobil/durum")[1])["cihazlar"]
        self.assertNotIn("h", devs[0], "oturum özeti dışarı verilmez")
        self.req("POST", "/api/mobil/cihaz-sil", json.dumps({"id": devs[0]["id"]}), {"Content-Type": "application/json"})
        self.assertEqual(self.req("GET", "/api/mobil/ben", lan=True, cookie=cookie2)[0], 401)

    def test_anahtar_kurallari(self):
        tok = mobil.new_token()
        self.assertTrue(mobil.consume_token(tok, "9.9.9.9"))
        self.assertFalse(mobil.consume_token(tok, "9.9.9.9"))
        old = mobil.new_token()
        mobil._tokens[old] = time.time() - 1
        self.assertFalse(mobil.consume_token(old, "9.9.9.8"), "süresi dolmuş")
        for _ in range(mobil.MAX_FAILS):
            mobil.consume_token("x" * 22, "6.6.6.6")
        good = mobil.new_token()
        self.assertTrue(mobil.blocked("6.6.6.6"))
        self.assertTrue(mobil.consume_token(good, "6.6.6.6"), "geçerli anahtar engelden bağımsız kabul edilir (kilitlenme saldırısı yok)")
        used = mobil.new_token()
        self.assertTrue(mobil.consume_token(used, "4.4.4.4"))
        for _ in range(mobil.MAX_FAILS + 5):
            mobil.consume_token(used, "4.4.4.4")  # sayfa yenileme: harcanmış anahtar hatalı deneme sayılmaz
        self.assertFalse(mobil.blocked("4.4.4.4"))
        self.assertFalse(mobil.consume_token("<script>", "3.3.3.3"))
        con = db.connect(self.dbp)
        sid = mobil.new_session(con, "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) Safari/604.1")
        self.assertEqual(mobil.check_session(con, sid)["ad"], "iPhone Safari")
        devs = mobil._load(con)
        devs[-1]["olusturma"] = "2020-01-01T00:00:00"
        mobil._save(con, devs)
        self.assertIsNone(mobil.check_session(con, sid), "90 günden eski oturum geçersiz")
        self.assertIsNone(mobil.check_session(con, "x" * 500))
        con.close()

    def test_masaustu_yardimcilari(self):
        self.pair()
        st, body, h = self.req("GET", "/api/mobil/terminal")
        self.assertEqual(st, 200)
        txt = body.decode("utf-8")
        self.assertIn("/m?k=", txt)
        self.assertIn("▀", txt)
        st, body, h = self.req("GET", "/api/qr.svg?t=" + "https%3A%2F%2Fexample.com")
        self.assertEqual(st, 200)
        self.assertIn("image/svg+xml", h["content-type"])
        st, body, _ = self.req("GET", "/api/kurulum", headers={"X-Lang": "de"})
        self.assertEqual(st, 200)
        k = json.loads(body)
        steps = {s["key"]: s for s in k["adimlar"]}
        for key in ("python", "ffmpeg", "arsiv", "analiz", "instagram", "handy", "claude"):
            self.assertIn(key, steps)
        self.assertTrue(steps["arsiv"]["ok"])
        self.assertTrue(steps["handy"]["ok"], "eşleşmiş cihaz var")
        self.assertTrue(steps["instagram"]["qr"].startswith("https://accountscenter.instagram.com/"))
        self.assertEqual(steps["handy"]["baslik"], "Handy verbinden")
        self.assertLessEqual(k["tamam"], k["toplam"])

    def test_lan_kapsami_ve_sinirlar(self):
        cookie, _, _ = self.pair()
        con = db.connect(self.dbp)
        hid = con.execute("SELECT id FROM items LIMIT 1 OFFSET 1").fetchone()[0]
        con.execute("UPDATE items SET hidden=1 WHERE id=?", (hid,))
        con.commit()
        self.assertEqual(self.req("GET", f"/api/thumb/{hid}", lan=True, cookie=cookie)[0], 404, "gizli öğe telefonda yok")
        self.assertEqual(self.req("GET", f"/api/thumb/{hid}")[0], 200, "Mac'te görünür")
        con.execute("UPDATE items SET hidden=0 WHERE id=?", (hid,))
        con.commit()
        con.close()
        server._jobs["tara-99"] = {"tur": "tara", "durum": "bitti", "log": ["/gizli/yol"], "sonuc": None}
        self.assertEqual(self.req("GET", "/api/job/tara-99", lan=True, cookie=cookie)[0], 404, "masaüstü işleri telefona kapalı")
        mobil.lan_jobs.add("tara-99")
        self.assertEqual(self.req("GET", "/api/job/tara-99", lan=True, cookie=cookie)[0], 200)
        mobil.lan_jobs.discard("tara-99")
        srv = mobil._lan["server"]
        self.assertEqual(srv.RequestHandlerClass.timeout, mobil.LAN_TIMEOUT, "boşta bağlantı zaman aşımı")
        import socket
        socks = []
        try:
            for _ in range(mobil.LAN_MAX_CONN):
                socks.append(socket.create_connection(("127.0.0.1", self.lan_port), timeout=5))
            time.sleep(0.3)
            extra = socket.create_connection(("127.0.0.1", self.lan_port), timeout=5)
            extra.settimeout(5)
            self.assertEqual(extra.recv(10), b"", "sınırın üstündeki bağlantı hemen kapanır")
            extra.close()
            self.assertEqual(self.req("GET", "/api/stats")[0], 200, "Mac arayüzü etkilenmez")
        finally:
            for c in socks:
                c.close()
        time.sleep(0.3)
        self.assertEqual(self.req("GET", "/api/mobil/ben", lan=True, cookie=cookie)[0], 200, "yuvalar serbest kalır")

    def test_lan_hata_mesaji_dilde(self):
        orig = mobil.lan_ip
        mobil.stop_lan()
        mobil.lan_ip = lambda: None
        try:
            st, body, _ = self.req("POST", "/api/mobil/eslestir", "{}", {"Content-Type": "application/json", "X-Lang": "de"})
            self.assertEqual(st, 400)
            d = json.loads(body)
            self.assertEqual(d["kod"], "wifi_yok")
            self.assertIn("WLAN", d["hata"])
        finally:
            mobil.lan_ip = orig
            type(self).lan_ip, type(self).lan_port = mobil.start_lan(server.Handler, port=0, ip="127.0.0.1")

    def test_z_kapatma(self):
        self.req("POST", "/api/mobil/kapat", "{}", {"Content-Type": "application/json"})
        self.assertFalse(mobil.running())
        k = json.loads(self.req("GET", "/api/kurulum", headers={"X-Lang": "de"})[1])
        handy = next(s for s in k["adimlar"] if s["key"] == "handy")
        self.assertFalse(handy["ok"], "erişim kapalıyken telefon adımı tamam sayılmaz")
        self.assertEqual(handy["detay"], "Handy-Zugang ist aus")
        self.assertEqual(self.req("GET", "/api/mobil/terminal")[1], b"")
        with self.assertRaises(OSError):
            self.req("GET", "/m", lan=True)
        # kapatmadan önce açılmış bağlantı: kapatınca kesilir ya da reddedilir
        type(self).lan_ip, type(self).lan_port = mobil.start_lan(server.Handler, port=0, ip="127.0.0.1")
        cookie, _, _ = self.pair()
        c = http.client.HTTPConnection("127.0.0.1", self.lan_port, timeout=10)
        c.connect()
        time.sleep(0.2)
        mobil.stop_lan()
        try:
            c.request("GET", "/api/mobil/ben", headers={"Host": f"127.0.0.1:{self.lan_port}", "Cookie": f"{mobil.COOKIE}={cookie}"})
            self.assertNotEqual(c.getresponse().status, 200, "kapatılan dinleyicideki eski bağlantı hizmet vermez")
        except OSError:
            pass
        finally:
            c.close()
        # yeniden aç (sonraki testler için)
        type(self).lan_ip, type(self).lan_port = mobil.start_lan(server.Handler, port=0, ip="127.0.0.1")


if __name__ == "__main__":
    unittest.main()
