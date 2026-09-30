#!/bin/bash
# Renders the series explainer in 4 parallel chunks, joins them and adds the score.
# Usage: render.sh [lang] [output-name]   (defaults: tr, Pusulam_Serisi_Zorluklar_ve_Cozumler)
cd "$(dirname "$0")/.."
LANG_=${1:-tr}; NAME=${2:-Pusulam_Serisi_Zorluklar_ve_Cozumler}
export FFMPEG=${FFMPEG:-ffmpeg}
N=$(python3 -c "print(round(172.5*30))"); C=$(( (N + 3) / 4 ))
for i in 0 1 2 3; do PAGE="series/explainer.html?capture&lang=$LANG_" node capture.js series/part$i.mp4 30 $((i*C)) $(((i+1)*C)) > series/part$i.log 2>&1 & done; wait
printf "file 'part0.mp4'\nfile 'part1.mp4'\nfile 'part2.mp4'\nfile 'part3.mp4'\n" > series/parts.txt
$FFMPEG -y -loglevel error -f concat -safe 0 -i series/parts.txt -c copy series/silent.mp4
$FFMPEG -y -loglevel error -i series/silent.mp4 -i series/music-series.wav -c:v libx264 -preset slow -b:v 1900k -maxrate 3000k -bufsize 6000k -c:a aac -b:a 160k -shortest -movflags +faststart series/${NAME}_1080p.mp4
$FFMPEG -y -loglevel error -i series/${NAME}_1080p.mp4 -vf scale=720:1280 -c:v libx264 -preset slow -b:v 780k -maxrate 1200k -bufsize 2400k -c:a aac -b:a 96k -movflags +faststart series/${NAME}_720p.mp4
rm -f series/part*.mp4 series/silent.mp4 series/parts.txt
ls -la series/*.mp4
