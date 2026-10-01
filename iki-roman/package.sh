#!/bin/bash
# Packt die Lieferdateien (ohne Quellgrafiken/Skripte) in iki-roman/out/Iki_Roman_KDP_Paket.zip
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p out
rm -f out/Iki_Roman_KDP_Paket.zip
zip -q -r out/Iki_Roman_KDP_Paket.zip \
  README.md \
  cover/out \
  interior/out/YOLCU_Innenteil_A5.pdf interior/out/SAHIT_Innenteil_A5.pdf \
  interior/out/YOLCU.epub interior/out/SAHIT.epub \
  interior/out/epubcheck_BY.txt interior/out/epubcheck_SA.txt interior/out/report.json \
  trailer/out/*.mp4 trailer/out/*.srt trailer/out/storyboard trailer/out/render_report.txt trailer/README-trailer.md \
  marketing/*.pdf marketing/*.md \
  analyse \
  -x '*/Vorschau.png' '*/Fullcover_Guides.png'
ls -la out/Iki_Roman_KDP_Paket.zip
