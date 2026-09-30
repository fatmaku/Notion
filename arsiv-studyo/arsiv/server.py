"""Yerel web arayüzü: standart kütüphane http.server + JSON API. Dış bağımlılık yok."""
import json
import mimetypes
import os
import threading
import traceback
import urllib.parse
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from . import config, db, media

UI_DIR = Path(__file__).parent / "ui"
_lock = threading.Lock()
_jobs = {}  # id -> {"tur":..., "durum":..., "log":[...]}


def _job(kind, fn, *args):
    jid = f"{kind}-{len(_jobs) + 1}"
    _jobs[jid] = {"tur": kind, "durum": "calisiyor", "log": [], "sonuc": None}

    def log(msg):
        _jobs[jid]["log"].append(str(msg))
        _jobs[jid]["log"] = _jobs[jid]["log"][-200:]

    def run():
        try:
            _jobs[jid]["sonuc"] = fn(log, *args)
            _jobs[jid]["durum"] = "bitti"
        except Exception as e:
            log(f"HATA: {e}")
            _jobs[jid]["durum"] = "hata"
            _jobs[jid]["hata"] = str(e)
            traceback.print_exc()

    threading.Thread(target=run, daemon=True).start()
    return jid


class Handler(BaseHTTPRequestHandler):
    db_path = None

    def log_message(self, fmt, *args):  # sessiz
        if os.environ.get("ARSIV_DEBUG"):
            super().log_message(fmt, *args)

    # ------------------------------------------------------------ yardımcılar
    def _json(self, obj, status=200):
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
        raw = self.rfile.read(n) if n else b""
        try:
            return json.loads(raw.decode("utf-8")) if raw else {}
        except ValueError:
            return {}

    def _con(self):
        return db.connect(self.db_path)

    # ------------------------------------------------------------ GET
    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        q = {k: v[0] for k, v in urllib.parse.parse_qs(u.query).items()}
        path = u.path
        try:
            if path in ("/", "/index.html"):
                return self._file(UI_DIR / "index.html", "text/html; charset=utf-8", cache=False)
            if path.startswith("/ui/"):
                return self._file(UI_DIR / path[4:].replace("..", ""), cache=False)
            if path == "/api/stats":
                return self._json(db.stats(self._con()))
            if path == "/api/items":
                return self._json(self._items(q))
            if path.startswith("/api/thumb/"):
                return self._thumb(int(path.rsplit("/", 1)[1]))
            if path.startswith("/api/file/"):
                item = db.get_item(self._con(), int(path.rsplit("/", 1)[1]))
                if not item or not item.get("path"):
                    return self._json({"hata": "yerelde yok"}, 404)
                return self._file(item["path"])
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
                return self._json(score.reshare_queue(self._con(), min_days=int(q.get("min_days", 180)), limit=int(q.get("limit", 60))))
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
            if path == "/api/besttimes":
                from . import marketing
                return self._json(marketing.best_times(self._con()))
            if path == "/api/ideas":
                from . import marketing
                return self._json(marketing.ideas(self._con()))
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
            if item.get("path") and Path(item["path"]).exists():
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
    def do_POST(self):
        u = urllib.parse.urlparse(self.path)
        path = u.path
        body = self._body()
        try:
            con = self._con()
            if path == "/api/scan":
                from . import scan
                root = body.get("path")
                if not root or not Path(root).expanduser().exists():
                    return self._json({"hata": "klasör bulunamadı"}, 400)
                jid = _job("tara", lambda log, r: scan.scan_folder(db.connect(self.db_path), r, source=body.get("source") or "klasor", progress=log), root)
                return self._json({"job": jid})
            if path == "/api/import/photos":
                from . import photos_mac
                jid = _job("fotograflar", lambda log, lib: photos_mac.import_photos(db.connect(self.db_path), lib, progress=log), body.get("library") or None)
                return self._json({"job": jid})
            if path == "/api/import/instagram":
                from . import instagram
                root = body.get("path")
                if not root or not Path(root).expanduser().exists():
                    return self._json({"hata": "klasör bulunamadı"}, 400)
                if body.get("csv"):
                    jid = _job("instagram-csv", lambda log, r: instagram.import_insights_csv(db.connect(self.db_path), r, progress=log), root)
                else:
                    jid = _job("instagram", lambda log, r: instagram.import_export(db.connect(self.db_path), r, progress=log), root)
                return self._json({"job": jid})
            if path == "/api/render":
                from . import studio
                brief = studio.normalize_brief(body)
                if not brief["ogeler"]:
                    return self._json({"hata": "öğe seçilmedi"}, 400)
                rid = db.add_render(con, brief["sablon"], brief, [o["id"] for o in brief["ogeler"]])

                def run(log, brief=brief, rid=rid):
                    c = db.connect(self.db_path)
                    db.set_render(c, rid, status="calisiyor")
                    try:
                        res = studio.render(c, brief, progress=log)
                        db.set_render(c, rid, output=res["output"], cover=res.get("cover"), caption=res.get("caption"),
                                      status="hazir", duration=res.get("duration"))
                        return res
                    except Exception as e:
                        db.set_render(c, rid, status="hata", error=str(e))
                        raise
                jid = _job("uretim", run)
                return self._json({"job": jid, "render_id": rid})
            if path == "/api/caption":
                from . import marketing
                items = db.get_items(con, [int(x) for x in body.get("ids", [])])
                return self._json({"caption": marketing.caption(body, items, use_claude=not body.get("claude_yok"))})
            if path == "/api/collect":
                from . import collect
                res = collect.collect(con, [int(x) for x in body.get("ids", [])], body.get("name") or "secim", mode=body.get("mode", "link"))
                return self._json(res)
            if path == "/api/reminders":
                rid = db.add_reminder(con, body["due"], body["title"], note=body.get("note"), item_ids=body.get("item_ids") or [],
                                      render_id=body.get("render_id"))
                return self._json({"id": rid})
            if path.startswith("/api/reminders/") and path.endswith("/status"):
                db.set_reminder(con, int(path.split("/")[3]), status=body.get("status", "tamam"))
                return self._json({"ok": True})
            if path == "/api/reminders/plan":
                from . import reminders
                a = reminders.plan_reshares(con, weeks=int(body.get("weeks", 4)), per_week=int(body.get("per_week", 3)), min_days=int(body.get("min_days", 180)), progress=lambda *_: None)
                b2 = reminders.plan_on_this_day(con, days_ahead=int(body.get("weeks", 4)) * 7, progress=lambda *_: None)
                return self._json({"yeniden": a, "bugun": b2})
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
                import subprocess
                target = body.get("path")
                if target and Path(target).exists() and platform.system() == "Darwin":
                    subprocess.Popen(["open", "-R", target] if Path(target).is_file() else ["open", target])
                    return self._json({"ok": True})
                return self._json({"ok": False, "not": "Finder'da gösterme yalnızca macOS'ta çalışır"})
            return self._json({"hata": "bulunamadı"}, 404)
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
            raise SystemExit(f"{port} portu kullanımda: Arşiv Stüdyo zaten açık olabilir. Tarayıcıda http://{host}:{port}/ adresini açın "
                             "ya da Durdur.command ile durdurup yeniden başlatın.")
        raise
    url = f"http://{host}:{port}/"
    print(f"Arşiv Stüdyo çalışıyor: {url}  (durdurmak için Ctrl+C)", flush=True)
    if open_browser:
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()
