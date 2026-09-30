#!/bin/bash
# Nachkodierung der fertigen Trailer auf Plattform-übliche Bitraten (YouTube/Instagram/TikTok):
# H.264 High, CRF 21, max. 8 Mbit/s (16:9) bzw. 6 Mbit/s (9:16, 1:1), AAC bleibt erhalten, faststart.
# Ersetzt die Dateien in out/ (Originale bleiben in out/tmp/ bis zum Aufräumen).
set -euo pipefail
cd "$(dirname "$0")"
FFMPEG=${FFMPEG:-$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")}
mkdir -p out/tmp
for f in out/Iki_Roman_Fragman_*.mp4; do
  base=$(basename "$f")
  case "$base" in *16x9*) rate=8M; buf=16M;; *) rate=6M; buf=12M;; esac
  tmp="out/tmp/${base%.mp4}_reenc.mp4"
  "$FFMPEG" -y -loglevel error -i "$f" -c:v libx264 -preset medium -crf 21 -maxrate "$rate" -bufsize "$buf" \
    -pix_fmt yuv420p -profile:v high -level 4.1 -c:a copy -movflags +faststart "$tmp"
  mv "$tmp" "$f"
  printf '%-44s %6.1f MB\n' "$base" "$(python3 -c "import os;print(os.path.getsize('$f')/1e6)")"
done
