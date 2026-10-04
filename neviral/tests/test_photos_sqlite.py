"""Photos.sqlite doğrudan okuma yolunun sahte bir kütüphaneyle testi (macOS gerekmez)."""
import os
import shutil
import sqlite3
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
TMP = Path(tempfile.mkdtemp(prefix="arsiv-ptest-"))
os.environ["ARSIV_HOME"] = str(TMP / "home")
os.environ.pop("ARSIV_DB", None)

from PIL import Image  # noqa: E402

from arsiv import db, photos_mac  # noqa: E402

APPLE = 978307200


def make_library(root):
    lib = root / "Test.photoslibrary"
    (lib / "database").mkdir(parents=True)
    (lib / "originals" / "A").mkdir(parents=True)
    (lib / "resources" / "derivatives" / "B").mkdir(parents=True)
    Image.new("RGB", (3000, 4000), (10, 120, 200)).save(lib / "originals/A/IMG_0001.JPG", quality=80)
    Image.new("RGB", (640, 480), (200, 40, 40)).save(lib / "resources/derivatives/B/BBBB-2_1_105_c.jpeg", quality=70)
    con = sqlite3.connect(lib / "database" / "Photos.sqlite")
    con.executescript("""
    CREATE TABLE ZASSET(Z_PK INTEGER PRIMARY KEY, ZUUID TEXT, ZFILENAME TEXT, ZDIRECTORY TEXT, ZDATECREATED REAL, ZWIDTH INTEGER, ZHEIGHT INTEGER,
        ZFAVORITE INTEGER, ZKIND INTEGER, ZHIDDEN INTEGER, ZTRASHEDSTATE INTEGER, ZADJUSTMENTSSTATE INTEGER, ZLATITUDE REAL, ZLONGITUDE REAL,
        ZAVALANCHEUUID TEXT, ZAVALANCHEPICKTYPE INTEGER, ZCLOUDBATCHPUBLISHDATE REAL, ZOVERALLAESTHETICSCORE REAL);
    CREATE TABLE ZADDITIONALASSETATTRIBUTES(Z_PK INTEGER PRIMARY KEY, ZASSET INTEGER, ZORIGINALFILENAME TEXT, ZTITLE TEXT, ZTIMEZONEOFFSET INTEGER);
    CREATE TABLE ZEXTENDEDATTRIBUTES(Z_PK INTEGER PRIMARY KEY, ZASSET INTEGER, ZDURATION REAL);
    CREATE TABLE ZGENERICALBUM(Z_PK INTEGER PRIMARY KEY, ZTITLE TEXT, ZKIND INTEGER, ZTRASHEDSTATE INTEGER);
    CREATE TABLE Z_28ASSETS(Z_28ALBUMS INTEGER, Z_3ASSETS INTEGER, Z_FOK_3ASSETS INTEGER);
    """)
    # 1: yerel foto (düzenlenmiş, konum yok = -180 işareti, İstanbul saat dilimi)
    con.execute("INSERT INTO ZASSET VALUES(1,'AAAA-1','IMG_0001.JPG','A',?,3000,4000,1,0,0,0,2,-180.0,-180.0,NULL,NULL,NULL,0.71)",
                (1559376000 - APPLE,))  # 2019-06-01 08:00 UTC
    con.execute("INSERT INTO ZADDITIONALASSETATTRIBUTES VALUES(1,1,'IMG_0001.JPG','Deniz kenarı',10800)")
    # 2: bulutta video (yerelde yok), türev jpeg var, süre ZEXTENDEDATTRIBUTES'ta
    con.execute("INSERT INTO ZASSET VALUES(2,'BBBB-2','IMG_0002.MOV','B',?,1080,1920,0,1,0,0,0,41.0,29.0,NULL,NULL,NULL,0.4)", (1600000000 - APPLE,))
    con.execute("INSERT INTO ZADDITIONALASSETATTRIBUTES VALUES(2,2,'IMG_0002.MOV',NULL,NULL)")
    con.execute("INSERT INTO ZEXTENDEDATTRIBUTES VALUES(1,2,14.5)")
    # 3: çöpte; 4: seri çekimde seçilmemiş kare; 5: seri çekimde seçilmiş kare
    con.execute("INSERT INTO ZASSET VALUES(3,'CCCC-3','IMG_0003.JPG','C',?,100,100,0,0,0,1,0,-180.0,-180.0,NULL,NULL,NULL,NULL)", (1600000000 - APPLE,))
    con.execute("INSERT INTO ZASSET VALUES(4,'DDDD-4','IMG_0004.JPG','D',?,100,100,0,0,0,0,0,-180.0,-180.0,'burst',2,NULL,NULL)", (1600000000 - APPLE,))
    con.execute("INSERT INTO ZASSET VALUES(5,'EEEE-5','IMG_0005.JPG','E',?,100,100,0,0,0,0,0,-180.0,-180.0,'burst',16,NULL,NULL)", (1600000000 - APPLE,))
    # albümler: kullanıcı albümü (2), çöpteki albüm, akıllı albüm (kind 4000) → yalnızca ilki sayılmalı
    con.execute("INSERT INTO ZGENERICALBUM VALUES(10,'Yaz Tatili',2,0)")
    con.execute("INSERT INTO ZGENERICALBUM VALUES(11,'Silinen Albüm',2,1)")
    con.execute("INSERT INTO ZGENERICALBUM VALUES(12,'Akıllı',4000,0)")
    con.executemany("INSERT INTO Z_28ASSETS VALUES(?,?,?)", [(10, 1, 0), (11, 1, 1), (12, 1, 2), (10, 2, 3)])
    con.commit(); con.close()
    return lib


class PhotosSqlite(unittest.TestCase):
    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(TMP, ignore_errors=True)

    def test_import(self):
        lib = make_library(TMP)
        con = db.connect()
        res = photos_mac._import_sqlite(con, lib, progress=lambda *_: None)
        self.assertEqual(res["hata"], 0)
        self.assertEqual(res["seri_atlanan"], 1)
        items = {i["filename"]: i for i in db.search(con, limit=50, sort="date")["items"]}
        self.assertEqual(set(items), {"IMG_0001.JPG", "IMG_0002.MOV", "IMG_0005.JPG"})
        a = items["IMG_0001.JPG"]
        self.assertEqual(a["edited"], 1, "ZADJUSTMENTSSTATE düzenlenmiş sayılmalı")
        self.assertIsNone(a["lat"]); self.assertIsNone(a["lon"])
        self.assertEqual(a["created_at"], "2019-06-01T11:00:00", "saat dilimi ofseti (+3) uygulanmalı")
        self.assertEqual(a["albums"], ["Yaz Tatili"])
        self.assertEqual(a["title"], "Deniz kenarı")
        self.assertEqual(a["available"], 1)
        self.assertAlmostEqual(a["apple_score"], 0.71)
        self.assertTrue(a.get("thumb") and Path(a["thumb"]).exists())
        v = items["IMG_0002.MOV"]
        self.assertEqual((v["kind"], v["available"], v["duration"]), ("video", 0, 14.5))
        self.assertEqual(v["aspect"], "9:16")
        self.assertTrue(v.get("thumb") and Path(v["thumb"]).exists(), "türev jpeg'den küçük resim üretilmeli")
        self.assertEqual(db.search(con, q="yaz tatili")["total"], 2)
        con.close()

    def test_permission_message(self):
        lib = TMP / "Kapali.photoslibrary"
        (lib / "database").mkdir(parents=True)
        f = lib / "database" / "Photos.sqlite"
        f.write_bytes(b"x")
        if os.geteuid() == 0:
            self.skipTest("root her dosyayı okuyabilir")
        f.chmod(0)
        with self.assertRaises(PermissionError) as cm:
            photos_mac._copy_db(lib)
        self.assertIn("Tam Disk Erişimi", str(cm.exception))


if __name__ == "__main__":
    unittest.main()
