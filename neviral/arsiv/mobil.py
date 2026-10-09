"""Handy bağlantısı: QR ile eşleştirme, yerel ağ (Wi-Fi) dinleyicisi, cihaz oturumları.

Güvenlik: Mac'teki arayüz yalnızca 127.0.0.1'de dinler. Handy açılınca ayrı bir dinleyici Mac'in Wi-Fi adresinde
başlar; orada yalnızca beyaz listedeki birkaç adres (handy sayfası, paketler, yükleme) ve yalnızca geçerli bir
oturum çereziyle açılır. Oturum, Mac ekranındaki QR kodundaki tek kullanımlık, 15 dakikalık bir anahtarla doğar."""
import hashlib
import hmac
import json
import re
import secrets
import socket
import threading
import time
from http.server import ThreadingHTTPServer

from . import db

TOKEN_TTL = 15 * 60
SESSION_MAX_AGE = 90 * 86400
COOKIE = "nv_m"
MAX_FAILS = 20  # 10 dakikada IP başına geçersiz anahtar denemesi
_tokens = {}    # anahtar -> son geçerlilik zamanı
_fails = {}     # ip -> [zaman damgaları]
_lan = {"server": None, "ip": None, "port": None}
_lock = threading.Lock()

# Wi-Fi tarafında açık olan adresler (geri kalan her şey 404)
LAN_GET = {"/m", "/m/icon.png", "/m/manifest.webmanifest", "/api/mobil/ben", "/api/mobil/paketler", "/api/mobil/top"}
LAN_GET_RE = re.compile(r"^/api/(render/\d+/(file|cover|dosya/\d+)|thumb/\d+|job/[\w-]+)$")
LAN_POST = {"/api/upload", "/api/viral/package", "/api/mobil/cikis"}
LAN_PUBLIC = {"/m", "/m/icon.png", "/m/manifest.webmanifest"}  # oturumsuz da açılır (sayfa "QR'ı tara" der)


# ---------------------------------------------------------------- ağ
def _mac_wifi_ip():
    """macOS: önce Wi-Fi/Ethernet arayüzü (en0, en1…). VPN açıkken yönlendirme tablosu VPN adresini verebilir; telefon ona ulaşamaz."""
    import subprocess
    import sys
    if sys.platform != "darwin":
        return None
    for ifc in ("en0", "en1", "en2", "en3"):
        try:
            out = subprocess.run(["ipconfig", "getifaddr", ifc], capture_output=True, text=True, timeout=1.5).stdout.strip()
        except (OSError, subprocess.SubprocessError):
            return None
        if re.fullmatch(r"\d+\.\d+\.\d+\.\d+", out) and not out.startswith(("127.", "169.254.")):
            return out
    return None


def lan_ip():
    """Mac'in yerel ağ adresi (Wi-Fi/Ethernet). Paket gönderilmez: UDP 'connect' yalnızca yönlendirme tablosuna bakar."""
    ip = _mac_wifi_ip()
    if ip:
        return ip
    for target in ("192.168.255.255", "10.255.255.255", "172.31.255.255", "8.8.8.8"):
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            s.connect((target, 1))
            ip = s.getsockname()[0]
            if ip and not ip.startswith(("127.", "0.", "169.254.")):
                return ip
        except OSError:
            pass
        finally:
            s.close()
    try:
        ip = socket.gethostbyname(socket.gethostname())
        if ip and not ip.startswith(("127.", "0.")):
            return ip
    except OSError:
        pass
    return None


def _host_names(ip):
    names = {ip}
    try:
        h = socket.gethostname().strip().lower()
        if h:
            names.add(h if h.endswith(".local") else h + ".local")
    except OSError:
        pass
    return names


class LanError(RuntimeError):
    """kod: 'wifi_yok' (adres bulunamadı) | 'baglanamadi' (dinleyici açılamadı)."""

    def __init__(self, kod, detay=""):
        super().__init__(f"{kod}: {detay}" if detay else kod)
        self.kod = kod
        self.detay = detay


LAN_TIMEOUT = 30       # sn: boşta bekleyen bağlantı kapanır (yükleme sürerken her okuma yeniden sayar)
LAN_MAX_CONN = 32      # aynı anda en fazla bağlantı; fazlası hemen kapatılır


class _LanServer(ThreadingHTTPServer):
    """Wi-Fi tarafı: bağlantı sayısı sınırlı, açık bağlantılar kapatılınca kesilir."""
    daemon_threads = True

    def __init__(self, addr, handler):
        self._slots = threading.BoundedSemaphore(LAN_MAX_CONN)
        self._live = set()
        self._live_lock = threading.Lock()
        super().__init__(addr, handler)

    def process_request(self, request, client_address):
        if not self._slots.acquire(blocking=False):
            self.shutdown_request(request)
            return
        with self._live_lock:
            self._live.add(request)
        try:
            super().process_request(request, client_address)
        except Exception:
            self._release(request)
            raise

    def process_request_thread(self, request, client_address):
        try:
            super().process_request_thread(request, client_address)
        finally:
            self._release(request)

    def _release(self, request):
        with self._live_lock:
            if request in self._live:
                self._live.discard(request)
                self._slots.release()

    def handle_error(self, request, client_address):
        import sys
        if isinstance(sys.exc_info()[1], (ConnectionError, TimeoutError)):
            return  # telefon bağlantıyı kesti / boşta kaldı: Terminal'e iz basma
        super().handle_error(request, client_address)

    def close_live(self):
        with self._live_lock:
            live = list(self._live)
        for sock in live:
            try:
                sock.shutdown(socket.SHUT_RDWR)
            except OSError:
                pass


def start_lan(handler_cls, port=8765, ip=None):
    """Wi-Fi dinleyicisini başlatır (zaten açıksa dokunmaz). Dönüş: (ip, port). Ağ yoksa LanError."""
    with _lock:
        if _lan["server"]:
            return _lan["ip"], _lan["port"]
        ip = ip or lan_ip()
        if not ip:
            raise LanError("wifi_yok")
        lan_handler = type("LanHandler", (handler_cls,), {"timeout": LAN_TIMEOUT})
        last = None
        for p in ([port, port + 1, port + 2] if port else [0]):
            try:
                srv = _LanServer((ip, p), lan_handler)
                break
            except OSError as e:
                last = e
        else:
            raise LanError("baglanamadi", str(last))
        srv.lan = True
        srv.lan_hosts = _host_names(ip)
        threading.Thread(target=srv.serve_forever, name="neviral-lan", daemon=True).start()
        _lan.update(server=srv, ip=ip, port=srv.server_address[1])
        return _lan["ip"], _lan["port"]


def ensure_lan(handler_cls, port=8765):
    """Dinleyiciyi açık tutar; Mac'in Wi-Fi adresi değiştiyse (başka ağ, yeni DHCP adresi) yeni adreste yeniden başlatır."""
    cur = lan_ip()
    if running() and cur and cur != _lan["ip"]:
        stop_lan()
    return start_lan(handler_cls, port, ip=cur)


def stop_lan():
    with _lock:
        srv = _lan["server"]
        _lan.update(server=None, ip=None, port=None)
    if srv:
        srv.shutdown()
        srv.server_close()
        srv.close_live()  # önceden açılmış bağlantılar da kesilir


def is_active(server):
    """Bu istek şu anki Wi-Fi dinleyicisinden mi? (kapatılmış/eski dinleyicideki bağlantılar reddedilir)"""
    return server is not None and server is _lan["server"]


def running():
    return _lan["server"] is not None


def pair_url(token, render_id=None):
    url = f"http://{_lan['ip']}:{_lan['port']}/m?k={token}"
    return url + (f"#r{int(render_id)}" if render_id else "")


# ---------------------------------------------------------------- tek kullanımlık anahtar
def new_token():
    tok = secrets.token_urlsafe(16)
    now = time.time()
    with _lock:
        for k in [k for k, exp in _tokens.items() if exp < now]:
            del _tokens[k]
        _tokens[tok] = now + TOKEN_TTL
    return tok


def blocked(ip):
    now = time.time()
    with _lock:
        recent = [t for t in _fails.get(ip, []) if now - t < 600]
        _fails[ip] = recent
        return len(recent) >= MAX_FAILS


_used = {}  # yakın zamanda harcanmış anahtarlar (sayfa yenilemesi hatalı deneme sayılmasın)
_TOKEN_RE = re.compile(r"^[A-Za-z0-9_-]{16,64}$")


def consume_token(tok, ip="?"):
    """Geçerliyse True (ve anahtar harcanır). Geçerli bir anahtar engelden bağımsız kabul edilir; yalnızca hiç verilmemiş
    biçimce doğru anahtarlar hatalı deneme sayılır (çok deneme → o adresten 10 dakika yeni deneme sayılmaz/kabul edilmez)."""
    if not tok or not isinstance(tok, str) or not _TOKEN_RE.match(tok):
        return False
    now = time.time()
    with _lock:
        exp = _tokens.pop(tok, None)
        if exp and exp >= now:
            _used[tok] = now + TOKEN_TTL
            return True
        for k in [k for k, e in _used.items() if e < now]:
            del _used[k]
        if tok in _used:
            return False
        if len(_fails) > 1000:
            _fails.clear()
        _fails.setdefault(ip, []).append(now)
        _fails[ip] = _fails[ip][-MAX_FAILS * 2:]
    return False


# ---------------------------------------------------------------- cihaz oturumları
def _h(sid):
    return hashlib.sha256(sid.encode()).hexdigest()


def _load(con):
    try:
        v = json.loads(db.get_setting(con, "mobil_cihazlar", "") or "[]")
        return v if isinstance(v, list) else []
    except ValueError:
        return []


def _save(con, devs):
    db.set_setting(con, "mobil_cihazlar", json.dumps(devs[-20:], ensure_ascii=False))


def device_name(ua):
    ua = ua or ""
    dev = "iPhone" if "iPhone" in ua else "iPad" if "iPad" in ua else "Android" if "Android" in ua else \
        "Mac" if "Macintosh" in ua else "Windows" if "Windows" in ua else "Gerät"
    br = "Chrome" if ("CriOS" in ua or "Chrome" in ua) else "Firefox" if ("FxiOS" in ua or "Firefox" in ua) else \
        "Safari" if "Safari" in ua else ""
    return f"{dev} {br}".strip()


_dev_lock = threading.Lock()  # cihaz listesi: oku-değiştir-yaz tek kilit altında (silinen cihaz geri gelmesin)


def new_session(con, ua=""):
    sid = secrets.token_urlsafe(32)
    now = db.now()
    with _dev_lock:
        devs = _load(con)
        devs.append({"id": secrets.token_hex(4), "h": _h(sid), "ad": device_name(ua), "olusturma": now, "son": now})
        _save(con, devs)
    return sid


def check_session(con, sid):
    """Geçerli oturumun cihaz kaydı ya da None. Karşılaştırma sabit zamanlı."""
    if not sid or len(sid) > 100:
        return None
    import datetime as dt
    h = _h(sid)
    with _dev_lock:
        devs = _load(con)
        hit = None
        for d in devs:
            if hmac.compare_digest(str(d.get("h", "")), h):
                hit = d
        if not hit:
            return None
        try:
            if (dt.datetime.now() - dt.datetime.fromisoformat(str(hit.get("olusturma"))[:19])).total_seconds() > SESSION_MAX_AGE:
                return None
            if (dt.datetime.now() - dt.datetime.fromisoformat(str(hit.get("son"))[:19])).total_seconds() > 600:
                hit["son"] = db.now()
                _save(con, devs)
        except ValueError:
            return None
    return hit


def drop_session(con, sid=None, cihaz_id=None):
    h = _h(sid) if sid else None
    with _dev_lock:
        devs = _load(con)
        keep = [d for d in devs if not ((h and d.get("h") == h) or (cihaz_id and d.get("id") == cihaz_id))]
        _save(con, keep)
    return len(devs) - len(keep)


lan_jobs = set()  # telefondan başlatılan işler: telefon yalnızca bunların durumunu görebilir


def devices(con):
    return [{k: d.get(k) for k in ("id", "ad", "olusturma", "son")} for d in reversed(_load(con))]


def cookie_value(headers):
    raw = headers.get("Cookie") or ""
    for part in raw.split(";"):
        k, _, v = part.strip().partition("=")
        if k == COOKIE:
            return v.strip()
    return None


def status(con):
    return {"acik": db.get_setting(con, "mobil_acik", "0") == "1", "calisiyor": running(), "ip": _lan["ip"], "port": _lan["port"],
            "cihazlar": devices(con)}


# ---------------------------------------------------------------- handy için veri
def _paket_json(output):
    from pathlib import Path
    if not output:
        return None
    p = Path(output)
    f = (p.parent if p.suffix else p) / "paket.json"
    try:
        return json.loads(f.read_text(encoding="utf-8")) if f.is_file() else None
    except (OSError, ValueError):
        return None


IMG_EXT = (".jpg", ".jpeg", ".png", ".webp")


def render_images(r):
    """Paketin telefona alınabilecek görselleri (4:5 akış görseli, carousel slaytları…), yalnızca üretim klasörünün içinden."""
    from pathlib import Path
    out = r.get("output") if r else None
    if not out:
        return []
    p = Path(out)
    folder = p if p.is_dir() else p.parent
    try:
        folder = folder.resolve()
    except OSError:
        return []
    pkg = _paket_json(out) or {}
    names = pkg.get("dosyalar") if isinstance(pkg.get("dosyalar"), list) else None
    cands = [Path(str(x)) for x in names] if names else sorted(folder.glob("*"))
    files = []
    for f in cands:
        try:
            f = f.resolve()
        except OSError:
            continue
        if f.parent == folder and f.suffix.lower() in IMG_EXT and f.is_file() and not f.name.startswith((".", "kapak")):
            files.append(f)
    return files[:20]


def packages(con, limit=30):
    from pathlib import Path
    out = []
    for r in db.renders(con, limit=limit):
        outp = r.get("output")
        is_video = bool(outp) and Path(outp).suffix.lower() in (".mp4", ".mov", ".m4v") and Path(outp).is_file()
        pkg = _paket_json(outp) or {}
        brief = r.get("brief") or {}
        kr = pkg.get("karar") if isinstance(pkg.get("karar"), dict) else {}
        out.append({
            "id": r["id"], "baslik": pkg.get("kanca") or brief.get("baslik") or r.get("template"), "sablon": r.get("template"),
            "durum": r.get("status"), "hata": r.get("error"), "olusturma": r.get("created_at"), "sure": r.get("duration"),
            "video": is_video, "kapak": bool(r.get("cover")) and Path(r["cover"]).is_file(),
            "dosya_adi": Path(outp).name if is_video else None, "en_iyi_platform": pkg.get("en_iyi_platform"),
            "metinler": pkg.get("metinler") if isinstance(pkg.get("metinler"), dict) else None,
            "caption": r.get("caption"), "zaman": pkg.get("zamanlar") if isinstance(pkg.get("zamanlar"), dict) else None,
            "karar_ozet": kr.get("ozet"),
            "bilder": [{"n": i, "ad": f.name} for i, f in enumerate(render_images(r))] if r.get("status") == "hazir" else [],
        })
    return out


def top_items(con, lang, limit=20):
    from . import viral
    res = viral.rank(con, lang=lang, posted=False, limit=max(1, min(50, int(limit))))
    items = []
    for it in res["items"]:
        n = it.get("neviral") or {}
        items.append({"id": it["id"], "filename": it.get("filename"), "kind": it.get("kind"), "viral_score": it.get("viral_score"),
                      "thumb_url": f"/api/thumb/{it['id']}", "karar_kisa": n.get("karar_kisa"), "en_iyi": n.get("en_iyi"),
                      "konular": [k.get("ad") for k in n.get("konular") or []]})
    return items
