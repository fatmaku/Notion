#!/bin/bash
# Renders one teen trailer (book, language) in 4 parallel chunks with the score.
# Usage: deniz-teen/render.sh <rhythm|wave|bound|voice> <tr|en|de> <output-name>
cd "$(dirname "$0")/../deniz-trailer"
export FFMPEG=${FFMPEG:-ffmpeg}
B=$1; L=$2; NAME=$3; O=../deniz-teen/out; mkdir -p $O
for i in 0 1 2 3; do PAGE="../deniz-teen/trailer.html?capture&book=$B&lang=$L" node capture.js $O/part$i.mp4 30 $((i*450)) $(((i+1)*450)) > $O/part$i.log 2>&1 & done; wait
printf "file 'part0.mp4'\nfile 'part1.mp4'\nfile 'part2.mp4'\nfile 'part3.mp4'\n" > $O/parts.txt
$FFMPEG -y -loglevel error -f concat -safe 0 -i $O/parts.txt -i ../deniz-teen/music.wav -c:v libx264 -preset slow -b:v 2300k -maxrate 3500k -bufsize 7000k -c:a aac -b:a 160k -shortest -movflags +faststart $O/${NAME}.mp4
rm -f $O/part* $O/parts.txt; ls -la $O/${NAME}.mp4
