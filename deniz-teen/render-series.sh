#!/bin/bash
# Renders the teen series explainer (all 5 books) in 4 parallel chunks with the score.
# Usage: deniz-teen/render-series.sh <tr|en|de> <output-name>
cd "$(dirname "$0")/../deniz-trailer"
export FFMPEG=${FFMPEG:-ffmpeg}
L=$1; NAME=$2; O=../deniz-teen/out; mkdir -p $O
N=$(python3 -c "print(round(132.5*30))"); C=$(( (N + 3) / 4 ))
for i in 0 1 2 3; do PAGE="../deniz-teen/series.html?capture&lang=$L" node capture.js $O/spart$i.mp4 30 $((i*C)) $(((i+1)*C)) > $O/spart$i.log 2>&1 & done; wait
printf "file 'spart0.mp4'\nfile 'spart1.mp4'\nfile 'spart2.mp4'\nfile 'spart3.mp4'\n" > $O/sparts.txt
$FFMPEG -y -loglevel error -f concat -safe 0 -i $O/sparts.txt -i ../deniz-teen/music-series.wav -c:v libx264 -preset slow -b:v 1000k -maxrate 1800k -bufsize 3600k -vf scale=720:1280 -c:a aac -b:a 128k -shortest -movflags +faststart $O/${NAME}.mp4
rm -f $O/spart* $O/sparts.txt; ls -la $O/${NAME}.mp4
