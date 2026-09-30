#!/bin/bash
# Renders the memoir trailer for one language in 4 parallel chunks and adds the score.
# Usage: ikv/render.sh <tr|en|de> <output-name>
cd "$(dirname "$0")/.."
export FFMPEG=${FFMPEG:-ffmpeg}
L=$1; NAME=$2; N=1800; C=450
for i in 0 1 2 3; do PAGE="ikv/trailer.html?capture&lang=$L" node capture.js ikv/part$i.mp4 30 $((i*C)) $(((i+1)*C)) > ikv/part$i.log 2>&1 & done; wait
printf "file 'part0.mp4'\nfile 'part1.mp4'\nfile 'part2.mp4'\nfile 'part3.mp4'\n" > ikv/parts.txt
$FFMPEG -y -loglevel error -f concat -safe 0 -i ikv/parts.txt -i ikv/music.wav -c:v libx264 -preset slow -b:v 2300k -maxrate 3500k -bufsize 7000k -c:a aac -b:a 160k -shortest -movflags +faststart ikv/${NAME}.mp4
rm -f ikv/part*.mp4 ikv/part*.log ikv/parts.txt
ls -la ikv/${NAME}.mp4
