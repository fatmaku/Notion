#!/bin/bash
# Renders the trailers for books 1, 2, 4 and 5 with the shared music bed (two at a time).
cd "$(dirname "$0")"
export FFMPEG=${FFMPEG:-ffmpeg}
render() {
  PAGE="engine.html?capture&book=$1" node capture.js "silent-b$1.mp4" 30 > /dev/null &&
  $FFMPEG -y -loglevel error -i "silent-b$1.mp4" -i music.wav -c:v libx264 -preset slow -b:v 1850k -maxrate 2800k -bufsize 5600k -c:a aac -b:a 128k -shortest -movflags +faststart "$2" &&
  rm "silent-b$1.mp4"
}
render 1 Kitap1_Benim_Norofarkli_Pusulam_Fragman.mp4 & render 2 Kitap2_Bedeninin_Gizli_Mesajlari_Fragman.mp4 & wait
render 4 Kitap4_Arkadaslik_Pusulasi_Fragman.mp4 & render 5 Kitap5_Degisiklikler_Adasi_Fragman.mp4 & wait
