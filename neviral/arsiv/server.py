"""Yerel web arayüzü: standart kütüphane http.server + JSON API. Dış bağımlılık yok."""
import itertools
import re
import json
import mimetypes
import os
import sqlite3
import subprocess
import sys
import threading
import time
import traceback
import urllib.parse
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from . import config, db, i18n, media

UI_DIR = Path(__file__).parent / "ui"
UI_FILES = {"i18n.js": "application/javascript; charset=utf-8", "yok.svg": "image/svg+xml"}
ALLOWED_HOSTS = {"127.0.0.1", "localhost", "[::1]", "::1"}
MAX_BODY = 2 * 1024 * 1024
MAX_UPLOAD = 8 * 1024 ** 3  # 8 GB
_lock = threading.Lock()
_render_slot = threading.Semaphore(1)  # aynı anda tek ffmpeg üretimi: Mac'i kilitlemesin
_ids = itertools.count(1)
_jobs = {}  # id -> {"tur":..., "durum":..., "log":[...]}
_stats_cache = {"t": 0.0, "v": None}


def _invalidate():
    _stats_cache["t"] = 0.0


def _new_job(kind):
    jid = f"{kind}-{next(_ids)}"
    _jobs[jid] = {"tur": kind, "durum": "calisiyor", "log": [], "sonuc": None, "basladi": time.time()}
    return jid


def _log(jid, msg):
    j = _jobs[jid]
    j["log"].append(str(msg))
    if len(j["log"]) > 300:
        del j["log"][:-200]


def _job(kind, fn, *args):
    """İş parçacığında çalışan iş (üretim gibi zaten ffmpeg alt sürecine dayanan işler için)."""
    jid = _new_job(kind)

    def run():
        try:
            _jobs[jid]["sonuc"] = fn(lambda m: _log(jid, m), *args)
            _jobs[jid]["durum"] = "bitti"
        except Exception as e:
            _log(jid, f"HATA: {e}")
            _jobs[jid]["durum"] = "hata"
            _jobs[jid]["hata"] = str(e)
            traceback.print_exc()
        finally:
            _invalidate()

    threading.Thread(target=run, daemon=True).start()
    return jid


def _proc_job(kind, argv, db_path=None):
    """Uzun içe aktarma işleri ayrı süreçte çalışır: arayüz donmaz (Python GIL'i paylaşılmaz)."""
    jid = _new_job(kind)
    cmd = [sys.executable, "-m", "arsiv"] + (["--db", str(db_path)] if db_path else []) + [str(a) for a in argv]
    env = dict(os.environ, PYTHONUNBUFFERED="1")

    def run():
        try:
            proc = subprocess.Popen(cmd, cwd=str(Path(__file__).resolve().parent.parent), stdout=subprocess.PIPE,
                                    stderr=subprocess.STDOUT, text=True, env=env, bufsize=1)
            _jobs[jid]["pid"] = proc.pid
            last = ""
            for line in proc.stdout:
                line = line.rstrip()
                if line:
                    last = line
                    _log(jid, line)
            proc.wait()
            if proc.returncode == 0:
                _jobs[jid]["durum"] = "bitti"
            else:
                _jobs[jid]["durum"] = "hata"
                _jobs[jid]["hata"] = last.replace("HATA: ", "") or f"çıkış kodu {proc.returncode}"
        except Exception as e:
            _log(jid, f"HATA: {e}")
            _jobs[jid]["durum"] = "hata"
            _jobs[jid]["hata"] = str(e)
        finally:
            _invalidate()

    threading.Thread(target=run, daemon=True).start()
    return jid


def _under(path, *roots):
    try:
        rp = Path(path).resolve()
    except OSError:
        return False
    for r in roots:
        try:
            rp.relative_to(Path(r).resolve())
            return True
        except ValueError:
            continue
    return False


class Handler(BaseHTTPRequestHandler):
    db_path = None

    def log_message(self, fmt, *args):  # sessiz
        if os.environ.get("ARSIV_DEBUG"):
            super().log_message(fmt, *args)

    # ------------------------------------------------------------ yardımcılar
    def _lang(self):
        return i18n.norm(self.headers.get("X-Lang") or db.get_setting(self._con(), "dil", "tr"))

    def _json(self, obj, status=200):
        try:
            obj = i18n.localize(obj, self._lang())
        except Exception:
            pass
        data = json.dumps(obj, ensure_ascii=False, default=str).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def _file(self, path, ctype=None, cache=True):
        p = Path(path)
        if not p.exists() or not p.is_file():
            return self._json({"hata": "dosya yok"}, 404)
        ctype = ctype or mimetypes.guess_type(str(p))[0] or "application/octet-stream"
        size = p.stat().st_size
        rng = self.headers.get("Range")
        start, end = 0, size - 1
        if rng and rng.startswith("bytes="):
            a, _, b = rng[6:].partition("-")
            start = int(a) if a else max(0, size - int(b))
            end = int(b) if (b and a) else size - 1
            end = min(end, size - 1)
        self.send_response(206 if rng else 200)
        self.send_header("Content-Type", ctype)
        self.send_header("Accept-Ranges", "bytes")
        if rng:
            self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.send_header("Content-Length", str(end - start + 1))
        if cache:
            self.send_header("Cache-Control", "max-age=86400")
        self.end_headers()
        with open(p, "rb") as f:
            f.seek(start)
            remaining = end - start + 1
            while remaining > 0:
                chunk = f.read(min(1 << 20, remaining))
                if not chunk:
                    break
                try:
                    self.wfile.write(chunk)
                except (BrokenPipeError, ConnectionResetError):
                    break
                remaining -= len(chunk)

    def _body(self):
        n = int(self.headers.get("Content-Length") or 0)
        if n > MAX_BODY:
            return {}
        raw = self.rfile.read(n) if n else b""
        try:
            return json.loads(raw.decode("utf-8")) if raw else {}
        except ValueError:
            return {}

    def _con(self):
        return db.connect(self.db_path)

    def _host_ok(self):
        """DNS rebinding koruması: yalnızca localhost adlarıyla gelen isteklere yanıt ver."""
        host = (self.headers.get("Host") or "").strip()
        name = host.rsplit(":", 1)[0] if not host.startswith("[") else host.split("]")[0] + "]"
        return name in ALLOWED_HOSTS

    def _post_ok(self):
        """CSRF koruması: başka sitelerden gelen 'basit' POST'ları reddet."""
        ctype = (self.headers.get("Content-Type") or "").split(";")[0].strip().lower()
        if ctype != "application/json":
            return False
        if (self.headers.get("Sec-Fetch-Site") or "").lower() == "cross-site":
            return False
        origin = self.headers.get("Origin")
        if origin:
            o = urllib.parse.urlparse(origin)
            if o.hostname not in ALLOWED_HOSTS or o.port != self.server.server_address[1]:
                return False
        return True

    # ------------------------------------------------------------ GET
    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        q = {k: v[0] for k, v in urllib.parse.parse_qs(u.query).items()}
        path = u.path
        if not self._host_ok():
            return self._json({"hata": "forbidden"}, 403)
        try:
            if path in ("/", "/index.html"):
                return self._file(UI_DIR / "index.html", "text/html; charset=utf-8", cache=False)
            if path.startswith("/ui/"):
                name = path[4:]
                if name not in UI_FILES:  # yalnızca bilinen dosyalar (yol geçişi yok)
                    return self._json({"hata": "yok"}, 404)
                return self._file(UI_DIR / name, UI_FILES[name], cache=False)
            if path == "/api/stats":
                if not _stats_cache["v"] or time.time() - _stats_cache["t"] > 30:
                    _stats_cache["v"], _stats_cache["t"] = db.stats(self._con()), time.time()
                return self._json(_stats_cache["v"])
            if path == "/api/items":
                return self._json(self._items(q))
            if path.startswith("/api/thumb/"):
                return self._thumb(int(path.rsplit("/", 1)[1]))
            if path.startswith("/api/file/"):
                item = db.get_item(self._con(), int(path.rsplit("/", 1)[1]))
                if not item or not item.get("path"):
                    return self._json({"hata": "yerelde yok"}, 404)
                return self._file(item["path"])
            if path.startswith("/api/preview/"):
                from . import preview
                con = self._con()
                item = db.get_item(con, int(path.rsplit("/", 1)[1]))
                if not item:
                    return self._json({"hata": "yok"}, 404)
                st = preview.status(con, item)
                if q.get("info") or st["durum"] != "hazir":
                    return self._json({k: v for k, v in st.items() if k != "yol"}, 200)
                return self._file(st["yol"], "image/jpeg" if item["kind"] == "foto" else "video/mp4")
            if path.startswith("/api/item/"):
                item = db.get_item(self._con(), int(path.rsplit("/", 1)[1]))
                return self._json(item or {"hata": "yok"}, 200 if item else 404)
            if path == "/api/candidates":
                from . import score
                con = self._con()
                return self._json(score.candidates(con, kind=q.get("kind") or None, min_score=float(q.get("min_score", 50)),
                                                   limit=int(q.get("limit", 60)), offset=int(q.get("offset", 0)),
                                                   year=q.get("year") or None, q=q.get("q") or None))
            if path == "/api/reshare":
                from . import score
                return self._json(score.reshare_queue(self._con(), min_days=int(q.get("min_days", 180)), limit=int(q.get("limit", 60)), lang=self._lang()))
            if path == "/api/settings":
                con = self._con()
                return self._json({"dil": db.get_setting(con, "dil", "tr")})
            if path == "/api/onthisday":
                from . import score
                import datetime as dt
                date = dt.date.fromisoformat(q["date"]) if q.get("date") else None
                return self._json(score.on_this_day(self._con(), date, limit=int(q.get("limit", 30))))
            if path == "/api/posts":
                m = q.get("matched")
                return self._json(db.posts(self._con(), matched=(None if m in (None, "") else m == "1"), limit=int(q.get("limit", 200))))
            if path == "/api/reminders":
                return self._json(db.reminders(self._con(), status=q.get("status", "acik")))
            if path == "/api/renders":
                return self._json(db.renders(self._con()))
            if path.startswith("/api/render/") and path.endswith("/file"):
                r = db.get_render(self._con(), int(path.split("/")[3]))
                if not r or not r.get("output") or not Path(r["output"]).is_file():
                    return self._json({"hata": "çıktı yok"}, 404)
                return self._file(r["output"], cache=False)
            if path.startswith("/api/render/") and path.endswith("/cover"):
                r = db.get_render(self._con(), int(path.split("/")[3]))
                if not r or not r.get("cover") or not Path(r["cover"]).is_file():
                    return self._json({"hata": "kapak yok"}, 404)
                return self._file(r["cover"], cache=False)
            if path == "/api/templates":
                from . import studio
                return self._json({"sablonlar": studio.TEMPLATES, "varsayilan": studio.DEFAULT_BRIEF, "formatlar": list(config.FORMATS)})
            if path == "/api/viral":
                from . import viral
                def num(k):
                    return float(q[k]) if q.get(k) else None
                pv = q.get("posted")
                return self._json(viral.rank(self._con(), lang=self._lang(), platform=q.get("platform") or None, kind=q.get("kind") or None,
                                             source=q.get("source") or None,
                                             market=q.get("market") or None, topic=q.get("topic") or None,
                                             posted=None if pv in (None, "") else pv == "1", min_score=num("min_score"), q=q.get("q") or None,
                                             limit=min(200, int(q.get("limit", 50))), offset=int(q.get("offset", 0))))
            if path.startswith("/api/viral/item/"):
                from . import viral
                con = self._con()
                it = db.get_item(con, int(path.rsplit("/", 1)[1]))
                if not it:
                    return self._json({"hata": "yok"}, 404)
                if not it.get("viral"):
                    viral.rescore(con, lambda *_: None)
                    it = db.get_item(con, it["id"])
                total = con.execute("SELECT COUNT(*) FROM items WHERE hidden=0 AND viral_score IS NOT NULL").fetchone()[0]
                it["neviral"] = viral.present(con, it, self._lang(), total=total, detail=True)
                return self._json(it)
            if path.startswith("/api/viral/karsilastir/"):
                from . import viral
                try:
                    return self._json(viral.compare(self._con(), int(path.rsplit("/", 1)[1]), lang=self._lang(),
                                                    hook=(q.get("hook") or "")[:60] or None))
                except ValueError:
                    return self._json({"hata": "yok"}, 404)
            if path.startswith("/api/viral/onizleme/"):
                name = path.rsplit("/", 1)[1]
                f = config.CACHE / "stil" / name
                if not re.fullmatch(r"\d+-\w+-[0-9a-f]{10}\.jpg", name) or not f.is_file():
                    return self._json({"hata": "yok"}, 404)
                return self._file(f, "image/jpeg", cache=False)
            if path == "/api/viral/settings":
                from . import viral, yazi
                st = viral.settings(self._con())
                st["claude"] = yazi.claude_available()
                from . import tasarim
                st["stiller"] = tasarim.style_list(self._lang())
                return self._json(st)
            if path == "/api/calendar":
                from . import takvim
                return self._json(takvim.upcoming(self._lang(), days=min(366, int(q.get("days", 60)))))
            if path == "/api/besttimes":
                from . import marketing
                return self._json(marketing.best_times(self._con(), lang=self._lang()))
            if path == "/api/ideas":
                from . import marketing
                return self._json(marketing.ideas(self._con(), lang=self._lang()))
            if path == "/api/duplicates":
                return self._json(db.duplicates(self._con(), limit=int(q.get("limit", 100))))
            if path == "/api/jobs":
                return self._json(_jobs)
            if path.startswith("/api/job/"):
                return self._json(_jobs.get(path.rsplit("/", 1)[1]) or {"hata": "yok"})
            if path == "/api/reminders.ics":
                from . import reminders
                out = config.CACHE / "hatirlaticilar.ics"
                config.ensure_dirs()
                reminders.export_ics(self._con(), out)
                return self._file(out, "text/calendar; charset=utf-8", cache=False)
            return self._json({"hata": "bulunamadı"}, 404)
        except Exception as e:
            traceback.print_exc()
            return self._json({"hata": str(e)}, 500)

    def _items(self, q):
        def b(k):
            v = q.get(k)
            return None if v in (None, "") else v in ("1", "true", "evet")
        kw = dict(q=q.get("q") or None, kind=q.get("kind") or None, aspect=q.get("aspect") or None,
                  orientation=q.get("orientation") or None, year=q.get("year") or None, year_from=q.get("year_from") or None,
                  year_to=q.get("year_to") or None, month=q.get("month") or None,
                  min_dur=float(q["min_dur"]) if q.get("min_dur") else None, max_dur=float(q["max_dur"]) if q.get("max_dur") else None,
                  favorite=b("favorite"), edited=b("edited"), posted=b("posted"), available=b("available"),
                  min_score=float(q["min_score"]) if q.get("min_score") else None, source=q.get("source") or None,
                  album=q.get("album") or None, person=q.get("person") or None,
                  sort=q.get("sort", "score"), limit=int(q.get("limit", 60)), offset=int(q.get("offset", 0)))
        if q.get("ids"):
            kw["ids"] = [int(x) for x in q["ids"].split(",") if x]
        return db.search(self._con(), **kw)

    def _thumb(self, item_id):
        con = self._con()
        item = db.get_item(con, item_id)
        if not item:
            return self._json({"hata": "yok"}, 404)
        t = item.get("thumb")
        if not t or not Path(t).exists():
            src = item.get("path")
            if src and Path(src).exists() and not media.is_dataless(Path(src).stat()):
                try:
                    config.ensure_dirs()
                    t = str(config.THUMBS / f"{item['uuid']}.jpg")
                    media.thumbnail(item["path"], t, item["kind"], duration=item.get("duration") or 0)
                    db.set_item(con, item_id, thumb=t)
                except Exception:
                    t = None
        if not t or not Path(t).exists():
            return self._file(UI_DIR / "yok.svg", "image/svg+xml")
        return self._file(t, "image/jpeg")

    # ------------------------------------------------------------ POST
    def _drain(self, limit=64 * 1024 * 1024):
        """Reddedilen küçük gövdeyi oku ki bağlantı düzgün kapansın; büyükse bağlantıyı kapat."""
        n = int(self.headers.get("Content-Length") or 0)
        if 0 < n <= limit:
            while n > 0:
                chunk = self.rfile.read(min(1 << 20, n))
                if not chunk:
                    break
                n -= len(chunk)
        elif n:
            self.close_connection = True

    def _upload(self, q):
        """Dışarıdan dosya yükleme: gövde doğrudan diske akar (büyük videolar için), sonra anında analiz + puan."""
        import datetime as dt
        import re
        name = Path(q.get("name") or "dosya").name
        ext = Path(name).suffix.lower()
        if ext not in config.MEDIA_EXT:
            return self._json({"hata": f"desteklenmeyen dosya türü: {ext or '?'}"}, 400)
        n = int(self.headers.get("Content-Length") or 0)
        if n <= 0 or n > MAX_UPLOAD:
            return self._json({"hata": "dosya boş ya da çok büyük"}, 400)
        stem = re.sub(r"[^\w\-. ]+", "_", Path(name).stem, flags=re.UNICODE).strip(" .") or "dosya"
        folder = config.HOME / "harici" / dt.date.today().isoformat()
        folder.mkdir(parents=True, exist_ok=True)
        dst = folder / f"{stem}{ext}"
        k = 1
        while dst.exists():
            dst = folder / f"{stem}-{k}{ext}"; k += 1
        tmp = dst.with_name("." + dst.name + ".part")
        remaining = n
        with open(tmp, "wb") as f:
            while remaining > 0:
                chunk = self.rfile.read(min(1 << 20, remaining))
                if not chunk:
                    break
                f.write(chunk)
                remaining -= len(chunk)
        if remaining:
            tmp.unlink(missing_ok=True)
            return self._json({"hata": "yükleme yarıda kesildi"}, 400)
        tmp.replace(dst)
        from . import viral
        con = self._con()
        try:
            iid = viral.ingest_external(con, dst)
        except Exception as e:
            return self._json({"hata": f"dosya okunamadı: {e}"}, 400)
        it = db.get_item(con, iid)
        total = con.execute("SELECT COUNT(*) FROM items WHERE hidden=0 AND viral_score IS NOT NULL").fetchone()[0]
        it["neviral"] = viral.present(con, it, self._lang(), total=total)
        _invalidate()
        return self._json(it)

    def do_POST(self):
        u = urllib.parse.urlparse(self.path)
        path = u.path
        if path == "/api/upload":
            # özel başlık zorunlu: başka sitelerden gelen istekler ön kontrole (preflight) takılır
            origin = self.headers.get("Origin")
            if not self._host_ok() or self.headers.get("X-Neviral") != "1" or \
                    (self.headers.get("Sec-Fetch-Site") or "").lower() == "cross-site" or \
                    (origin and urllib.parse.urlparse(origin).hostname not in ALLOWED_HOSTS):
                self._drain()
                return self._json({"hata": "forbidden"}, 403)
            try:
                return self._upload({k: v[0] for k, v in urllib.parse.parse_qs(u.query).items()})
            except Exception as e:
                traceback.print_exc()
                return self._json({"hata": str(e)}, 500)
        if not self._host_ok() or not self._post_ok():
            return self._json({"hata": "forbidden"}, 403)
        body = self._body()
        if not isinstance(body, dict):
            return self._json({"hata": "geçersiz istek"}, 400)
        _invalidate()
        try:
            con = self._con()
            if path == "/api/scan":
                root = Path(str(body.get("path") or "")).expanduser()
                if not str(body.get("path") or "").strip() or not root.is_dir():
                    return self._json({"hata": "klasör bulunamadı"}, 400)
                if root.resolve() in (Path("/"), Path.home().resolve()):
                    return self._json({"hata": "Tüm disk ya da ev klasörünün tamamı taranamaz; bir alt klasör seçin."}, 400)
                src = "".join(ch for ch in str(body.get("source") or "klasor") if ch.isalnum() or ch in "-_")[:30] or "klasor"
                return self._json({"job": _proc_job("tara", ["tara", str(root), "--kaynak", src], self.db_path)})
            if path == "/api/import/photos":
                lib = str(body.get("library") or "").strip()
                if lib and not Path(lib).expanduser().is_dir():
                    return self._json({"hata": "kütüphane bulunamadı"}, 400)
                return self._json({"job": _proc_job("fotograflar", ["fotograflar"] + (["--kutuphane", lib] if lib else []), self.db_path)})
            if path == "/api/import/instagram":
                root = Path(str(body.get("path") or "")).expanduser()
                if not str(body.get("path") or "").strip() or not root.exists():
                    return self._json({"hata": "klasör bulunamadı"}, 400)
                argv = ["instagram", str(root)] + (["--csv"] if body.get("csv") else [])
                return self._json({"job": _proc_job("instagram-csv" if body.get("csv") else "instagram", argv, self.db_path)})
            if path == "/api/render":
                from . import studio
                brief = studio.normalize_brief(body)
                brief["dil"] = body.get("dil") or self._lang()
                if not brief["ogeler"]:
                    return self._json({"hata": "öğe seçilmedi"}, 400)
                rid = db.add_render(con, brief["sablon"], brief, [o["id"] for o in brief["ogeler"]])

                def run(log, brief=brief, rid=rid):
                    c = db.connect(self.db_path)
                    if not _render_slot.acquire(blocking=False):
                        log("sırada: önceki üretim bitince başlayacak…")
                        _render_slot.acquire()
                    db.set_render(c, rid, status="calisiyor")
                    try:
                        res = studio.render(c, brief, progress=log)
                        db.set_render(c, rid, output=res["output"], cover=res.get("cover"), caption=res.get("caption"),
                                      status="hazir", duration=res.get("duration"))
                        return res
                    except Exception as e:
                        db.set_render(c, rid, status="hata", error=str(e))
                        raise
                    finally:
                        _render_slot.release()
                jid = _job("uretim", run)
                return self._json({"job": jid, "render_id": rid})
            if path == "/api/viral/analyze":
                argv = ["viral", "analiz"] + (["--zorla"] if body.get("force") else []) + ["--derin", str(min(5000, int(body.get("deep", 300))))]
                return self._json({"job": _proc_job("neviral-analiz", argv, self.db_path)})
            if path == "/api/viral/settings":
                from . import viral
                st = viral.save_settings(con, kitle=body.get("kitle"), saat_dilimi=body.get("saat_dilimi"), hesap=body.get("hesap"))
                return self._json({"ayarlar": st, "job": _proc_job("neviral-puan", ["viral", "puanla"], self.db_path)})
            if path == "/api/viral/hookpuan":
                from . import metin
                lang = body.get("lang") if body.get("lang") in ("tr", "de", "en") else self._lang()
                tops = [str(x)[:20] for x in (body.get("topics") or [body.get("topic") or ""]) if isinstance(x, str)][:3]
                sc, why, warn = metin.score_for(str(body.get("text") or "")[:120], lang, tops)
                return self._json({"puan": sc, "neden": why, "uyari": warn})
            if path in ("/api/viral/package", "/api/viral/top"):
                from . import tasarim, viral
                plats = [x for x in (body.get("platforms") or []) if isinstance(x, str)][:6] or None
                langs = [x for x in (body.get("langs") or []) if x in ("tr", "de", "en")] or None
                use_ai = not body.get("claude_yok")
                o = body.get("opts") if isinstance(body.get("opts"), dict) else {}
                opts = {"format": o.get("format") if o.get("format") in ("9:16", "4:5", "1:1") else "9:16",
                        "sure": float(o["sure"]) if str(o.get("sure") or "").replace(".", "", 1).isdigit() else None,
                        "muzik": o.get("muzik") if o.get("muzik") in ("auto", "yok", "sakin", "enerjik", "duygusal") else "auto",
                        "hook": str(o.get("hook") or "")[:60], "iyilestir": o.get("iyilestir", True) is not False,
                        "hatirlat": o.get("hatirlat", True) is not False,
                        "stil": o.get("stil") if o.get("stil") in (*tasarim.STYLES, "klasik", "otomatik") else "otomatik",
                        "ab": o.get("ab") is True}
                if path == "/api/viral/package":
                    iid = int(body["id"])
                    fn = lambda log, iid=iid: viral.package(db.connect(self.db_path), iid, plats, langs, log, use_ai, opts)  # noqa: E731
                else:
                    n = max(1, min(50, int(body.get("n", 10))))
                    fn = lambda log, n=n: viral.top_packages(db.connect(self.db_path), n, plats, langs, log, use_ai, opts)  # noqa: E731

                def run(log, fn=fn):
                    if not _render_slot.acquire(blocking=False):
                        log("sırada: önceki üretim bitince başlayacak…")
                        _render_slot.acquire()
                    try:
                        return fn(log)
                    finally:
                        _render_slot.release()
                return self._json({"job": _job("neviral-paket", run)})
            if path.startswith("/api/render/") and path.endswith("/photos"):
                from . import paylas
                r = db.get_render(con, int(path.split("/")[3]))
                if not r or r.get("status") != "hazir" or not r.get("output"):
                    return self._json({"hata": "çıktı yok"}, 404)
                ok, msg = paylas.add_to_photos(r["output"])
                return self._json({"ok": ok, "mesaj": msg}, 200 if ok else 400)
            if path == "/api/caption":
                from . import marketing
                items = db.get_items(con, [int(x) for x in body.get("ids", [])])
                return self._json({"caption": marketing.caption(body, items, use_claude=not body.get("claude_yok"), lang=body.get("dil") or self._lang())})
            if path == "/api/settings":
                if body.get("dil"):
                    db.set_setting(con, "dil", i18n.norm(body["dil"]))
                return self._json({"dil": db.get_setting(con, "dil", "tr")})
            if path == "/api/collect":
                from . import collect
                mode = body.get("mode", "link")
                if mode not in ("link", "symlink", "copy"):
                    return self._json({"hata": "geçersiz mod"}, 400)
                ids = [int(x) for x in body.get("ids", [])][:5000]
                res = collect.collect(con, ids, str(body.get("name") or "secim")[:80], mode=mode)
                return self._json(res)
            if path == "/api/reminders":
                due = str(body.get("due") or "")[:19]
                try:
                    import datetime as dt
                    dt.datetime.fromisoformat(due)
                except ValueError:
                    return self._json({"hata": "tarih geçersiz"}, 400)
                rid = db.add_reminder(con, due, str(body.get("title") or "")[:200], note=(str(body["note"])[:1000] if body.get("note") else None),
                                      item_ids=[int(x) for x in (body.get("item_ids") or [])][:200],
                                      render_id=int(body["render_id"]) if body.get("render_id") else None)
                return self._json({"id": rid})
            if path.startswith("/api/reminders/") and path.endswith("/status"):
                st = body.get("status", "tamam")
                if st not in ("acik", "tamam", "atla"):
                    return self._json({"hata": "geçersiz durum"}, 400)
                db.set_reminder(con, int(path.split("/")[3]), status=st)
                return self._json({"ok": True})
            if path == "/api/reminders/plan":
                from . import reminders
                lang = self._lang()
                a = reminders.plan_reshares(con, weeks=int(body.get("weeks", 4)), per_week=int(body.get("per_week", 3)), min_days=int(body.get("min_days", 180)), progress=lambda *_: None, lang=lang)
                b2 = reminders.plan_on_this_day(con, days_ahead=int(body.get("weeks", 4)) * 7, progress=lambda *_: None, lang=lang)
                c2 = reminders.plan_special_days(con, days_ahead=int(body.get("weeks", 4)) * 7 + 7, lang=lang)
                return self._json({"yeniden": a, "bugun": b2, "ozel": c2})
            if path.startswith("/api/item/") and path.endswith("/posted"):
                import datetime as dt
                iid = int(path.split("/")[3])
                if body.get("posted", True):
                    pid, _ = db.upsert_post(con, {"platform": body.get("platform", "instagram"), "kind": body.get("kind", "post"),
                                                  "posted_at": body.get("posted_at") or dt.datetime.now().replace(microsecond=0).isoformat(),
                                                  "media_path": f"manuel:{iid}", "caption": body.get("caption")})
                    db.link_post(con, pid, iid, "manuel", 1.0)
                else:
                    con.execute("UPDATE items SET posted_at=NULL, post_id=NULL WHERE id=?", (iid,))
                con.commit()
                return self._json({"ok": True})
            if path.startswith("/api/item/") and path.endswith("/hide"):
                db.set_item(con, int(path.split("/")[3]), hidden=1 if body.get("hidden", True) else 0)
                return self._json({"ok": True})
            if path.startswith("/api/item/") and path.endswith("/favorite"):
                iid = int(path.split("/")[3])
                item = db.get_item(con, iid)
                from . import score
                item["favorite"] = 1 if body.get("favorite", True) else 0
                s, why = score.compute(item)
                db.set_item(con, iid, favorite=item["favorite"], social_score=s, score_reasons=why)
                return self._json({"ok": True, "social_score": s})
            if path.startswith("/api/post/") and path.endswith("/unlink"):
                db.unlink_post(con, int(path.split("/")[3]))
                return self._json({"ok": True})
            if path.startswith("/api/post/") and path.endswith("/link"):
                db.link_post(con, int(path.split("/")[3]), int(body["item_id"]), "manuel", 1.0)
                con.commit()
                return self._json({"ok": True})
            if path == "/api/open":
                import platform
                target = str(body.get("path") or "")
                if platform.system() != "Darwin":
                    return self._json({"ok": False, "not": "Finder'da gösterme yalnızca macOS'ta çalışır"})
                allowed = target and Path(target).exists() and (
                    con.execute("SELECT 1 FROM items WHERE path=? LIMIT 1", (target,)).fetchone()
                    or _under(target, config.RENDERS, config.COLLECT))
                if not allowed:
                    return self._json({"hata": "izin yok"}, 403)
                subprocess.Popen(["open", "-R", target])  # yalnızca Finder'da gösterir, hiçbir şeyi çalıştırmaz
                return self._json({"ok": True})
            return self._json({"hata": "bulunamadı"}, 404)
        except (ValueError, KeyError, TypeError) as e:
            return self._json({"hata": f"geçersiz istek: {e}"}, 400)
        except sqlite3.OperationalError as e:
            if "locked" in str(e):
                return self._json({"hata": "Veritabanı şu an meşgul (içe aktarma sürüyor); birkaç saniye sonra tekrar deneyin."}, 503)
            traceback.print_exc()
            return self._json({"hata": str(e)}, 500)
        except Exception as e:
            traceback.print_exc()
            return self._json({"hata": str(e)}, 500)


def serve(db_path=None, host="127.0.0.1", port=8765, open_browser=True):
    config.ensure_dirs()
    db.connect(db_path).close()
    Handler.db_path = db_path
    try:
        httpd = ThreadingHTTPServer((host, port), Handler)
    except OSError as e:
        if e.errno in (48, 98):  # EADDRINUSE (macOS / Linux)
            raise SystemExit(f"{port} portu kullanımda: neviral zaten açık olabilir. Tarayıcıda http://{host}:{port}/ adresini açın "
                             "ya da Durdur.command ile durdurup yeniden başlatın.")
        raise
    url = f"http://{host}:{port}/"
    print(f"neviral çalışıyor: {url}  (durdurmak için Ctrl+C)", flush=True)
    if open_browser:
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()
