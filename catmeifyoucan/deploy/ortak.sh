# Cat Me If You Can – ortak yardımcılar (gemeinsame Helfer) für kur.sh, guncelle.sh, yedek.sh,
# geri-yukle.sh, sifirla.sh. Wird mit „source“ geladen, nicht direkt ausgeführt.
# shellcheck shell=bash

KOK="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY="$KOK/deploy"
ENV_DOSYA="$DEPLOY/.env"
# shellcheck disable=SC2034 # benutzt von kur.sh
ORNEK_ENV="$DEPLOY/.env.example"

if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  _C_INFO=$'\033[1;36m' _C_OK=$'\033[1;32m' _C_WARN=$'\033[1;33m' _C_ERR=$'\033[1;31m' _C_OFF=$'\033[0m'
else
  _C_INFO='' _C_OK='' _C_WARN='' _C_ERR='' _C_OFF=''
fi
bilgi() { printf '%s▸ %s%s\n' "$_C_INFO" "$*" "$_C_OFF"; }
tamam() { printf '%s✔ %s%s\n' "$_C_OK" "$*" "$_C_OFF"; }
uyari() { printf '%s! %s%s\n' "$_C_WARN" "$*" "$_C_OFF" >&2; }
hata() {
  printf '%s✖ %s%s\n' "$_C_ERR" "$*" "$_C_OFF" >&2
  exit 1
}

# docker compose immer im Ordner deploy/ – dort liegen docker-compose.yml und .env
# (eine eigene deploy/docker-compose.override.yml würde automatisch mitgelesen).
dc() { (cd "$DEPLOY" && docker compose "$@"); }

docker_kontrol() {
  if ! command -v docker >/dev/null 2>&1; then
    uyari "Docker kurulu değil. Kurmak için şu iki satırı çalıştırın (Ubuntu):"
    echo "    curl -fsSL https://get.docker.com | sudo sh"
    echo "    sudo bash deploy/kur.sh <alan-adınız>"
    hata "Önce Docker gerekli."
  fi
  if ! docker compose version >/dev/null 2>&1; then
    uyari "Docker Compose eklentisi eksik. Kurmak için:"
    echo "    sudo apt-get update && sudo apt-get install -y docker-compose-plugin"
    echo "    (ya da Docker'ı yeniden kurun: curl -fsSL https://get.docker.com | sudo sh)"
    hata "Önce Docker Compose gerekli."
  fi
  local out
  if ! out="$(docker info 2>&1 >/dev/null)"; then
    if grep -qi 'permission denied' <<<"$out"; then
      hata "Docker'a erişim izni yok. Aynı komutu başına sudo koyarak tekrar çalıştırın (ör. sudo bash deploy/kur.sh …)."
    fi
    uyari "Docker çalışmıyor. Başlatmak için: sudo systemctl enable --now docker"
    hata "Docker servisi kapalı."
  fi
}

# .env okuma/yazma – nur einfache Zeilen KEY=WERT
env_get() {
  [ -f "$ENV_DOSYA" ] || return 0
  local v
  v="$(sed -n "s/^$1=//p" "$ENV_DOSYA" | tail -n 1)"
  v="${v%$'\r'}"
  case "$v" in
    \"*\") v="${v#\"}" v="${v%\"}" ;;
    \'*\') v="${v#\'}" v="${v%\'}" ;;
  esac
  printf '%s' "$v"
}

env_set() {
  local tmp
  tmp="$(mktemp "$ENV_DOSYA.XXXXXX")"
  K="$1" V="$2" awk '
    BEGIN { k = ENVIRON["K"]; v = ENVIRON["V"]; done = 0 }
    index($0, k "=") == 1 { if (!done) { print k "=" v; done = 1 } ; next }
    { print }
    END { if (!done) print k "=" v }
  ' "$ENV_DOSYA" >"$tmp"
  chmod 600 "$tmp"
  mv "$tmp" "$ENV_DOSYA"
}

app_calisiyor() {
  [ -n "$(dc ps -q --status running app 2>/dev/null || true)" ]
}

# Wartet, bis der Container „app“ laut HEALTHCHECK gesund ist (max. ~3 Minuten).
saglik_bekle() {
  local cid st _
  for _ in $(seq 1 90); do
    cid="$(dc ps -q app 2>/dev/null || true)"
    if [ -n "$cid" ]; then
      st="$(docker inspect -f '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{end}}' "$cid" 2>/dev/null || true)"
      case "$st" in
        "running healthy") return 0 ;;
        *unhealthy* | exited* | dead*) return 1 ;;
      esac
    fi
    sleep 2
  done
  return 1
}

# Datenordner leeren – läuft im Container (BusyBox-sh) und in test/deploy.test.js gegen einen
# Temp-Ordner:   sh -c "$VERI_TEMIZLE_SH" sh <ordner> [behalten]
# <behalten> = ein Dateiname, der stehen bleibt (sifirla.sh: game.override.json). Auch Punkt-Dateien
# werden gelöscht; scheitert ein rm, endet das Snippet mit Fehler (dann wird nichts entpackt).
# shellcheck disable=SC2016 # $1, $2, $f wertet erst das sh im Container aus
VERI_TEMIZLE_SH='d="$1"; keep="${2:-}"; [ -d "$d" ] || exit 1; for f in "$d"/* "$d"/.[!.]* "$d"/..?*; do { [ -e "$f" ] || [ -L "$f" ]; } || continue; if [ -n "$keep" ] && [ "${f##*/}" = "$keep" ]; then continue; fi; rm -rf -- "$f" || exit 1; done'
# Leeren und dann das Archiv von stdin entpacken (geri-yukle.sh)
# shellcheck disable=SC2016,SC2034 # wie oben · benutzt von geri-yukle.sh und den Tests
GERI_YUKLE_SH="$VERI_TEMIZLE_SH"'; tar xzf - -C "$d"'

# /api/health aus dem Container heraus (kein curl auf dem Server nötig)
saglik_json() {
  dc exec -T app node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||8790)+'/api/health',r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>console.log(d))}).on('error',()=>process.exit(1))" 2>/dev/null || true
}

# Einrichtungs-QR im Terminal (server/setup-qr.js im Container): qr_goster admin | partner <id> | volunteer <n>
# Farben (schwarz auf weiß, auf hellen und dunklen Terminals lesbar) nur bei echtem Terminal ohne NO_COLOR.
# App läuft → fragt die App (--online: nie selbst ins Journal schreiben). App aus → eigener Wegwerf-Container
# mit demselben Daten-Volume: der Code kommt ins Journal und gilt, sobald die App wieder läuft.
qr_goster() {
  local -a ek=()
  if [ -n "${NO_COLOR:-}" ] || [ ! -t 1 ]; then ek+=(--plain); fi
  if app_calisiyor; then
    dc exec -T app node server/setup-qr.js "$@" --online ${ek[@]+"${ek[@]}"}
  else
    dc run --rm --no-deps -T app node server/setup-qr.js "$@" ${ek[@]+"${ek[@]}"}
  fi
}
