#!/bin/bash
# Baut das Gesamtpaket iki-roman/out/Iki_Roman_KDP_Paket.zip (Ordner wird nicht versioniert).
# Struktur (türkische Ordnernamen, Inhalt siehe 00_OKU_BENI.txt):
#   1_KDP_YOLCU_TR, 2_KDP_SAHIT_TR   – sofort bei KDP hochladbar (Druck + Kindle + Word)
#   3_Kapaklar_EN_DE                 – Cover für spätere Übersetzungen / Werbung
#   4_Fragmanlar/<TR|EN|DE>          – Trailer (MP4) + Untertitel (SRT)
#   5_Pazarlama                      – Marketing-Story, Storyboard, KDP-Listing, Bilder
#   6_Raporlar                       – Analyse, Änderungslisten, Prüfung von Sefas Fassung
set -euo pipefail
cd "$(dirname "$0")"
P=out/Iki_Roman_KDP_Paket
rm -rf "$P" out/Iki_Roman_KDP_Paket.zip
mkdir -p "$P"

book() {   # $1 = BY|SA  $2 = YOLCU|SAHIT  $3 = Ordner  $4 = docx
  local d="$P/$3"; mkdir -p "$d"
  cp "interior/out/$2_Innenteil_A5.pdf"   "$d/$2_Ic_Sayfalar_A5.pdf"
  cp "cover/out/$1/TR/Fullcover.pdf"      "$d/$2_Tam_Kapak_KDP.pdf"
  cp "cover/out/$1/TR/Frontcover.pdf"     "$d/$2_On_Kapak.pdf"
  cp "cover/out/$1/TR/Backcover.pdf"      "$d/$2_Arka_Kapak.pdf"
  cp "cover/out/$1/TR/Vorschau.png"       "$d/$2_Kapak_Onizleme.png"
  cp "interior/out/$2.epub"               "$d/$2_Kindle.epub"
  cp "cover/out/$1/TR/eBook-Cover.jpg"    "$d/$2_eKitap_Kapagi.jpg"
  cp "interior/src/$4"                    "$d/$2_Word.docx"
}
book BY YOLCU 1_KDP_YOLCU_TR YOLCU_TR_v4.docx
book SA SAHIT 2_KDP_SAHIT_TR SAHIT_TR_v5.docx

mkdir -p "$P/3_Kapaklar_EN_DE"
for b in BY:YOLCU SA:SAHIT; do k=${b%%:*}; n=${b##*:}
  for l in EN DE; do
    for f in Fullcover Frontcover Backcover; do cp "cover/out/$k/$l/$f.pdf" "$P/3_Kapaklar_EN_DE/${n}_${l}_${f}.pdf"; done
    cp "cover/out/$k/$l/eBook-Cover.jpg" "$P/3_Kapaklar_EN_DE/${n}_${l}_eBook-Cover.jpg"
    cp "cover/out/$k/$l/Vorschau.png"    "$P/3_Kapaklar_EN_DE/${n}_${l}_Vorschau.png"
  done
done

for l in TR EN DE; do
  mkdir -p "$P/4_Fragmanlar/$l"
  cp trailer/out/Iki_Roman_Fragman_*_"$l".mp4 trailer/out/Iki_Roman_Fragman_*_"$l".srt "$P/4_Fragmanlar/$l/"   # volle Qualität
done
for l in TR EN DE; do cp "trailer/out/Iki_Roman_Fragman_16x9_60s_${l}_web.mp4" "$P/4_Fragmanlar/$l/"; done
cp trailer/out/render_report.txt "$P/4_Fragmanlar/"

mkdir -p "$P/5_Pazarlama/Storyboard"
cp marketing/Marketing_Story_Storyboard_*.pdf cover/out/Doppelansicht_*.png cover/out/Panorama_Marketing_*.png "$P/5_Pazarlama/"
cp trailer/out/storyboard/*.jpg "$P/5_Pazarlama/Storyboard/"

mkdir -p "$P/6_Raporlar"
cp analyse/Bewertung_Ben_Yoksam_Sahidi_Ararken.pdf "$P/6_Raporlar/Analiz_Raporu_YOLCU_SAHIT_DE.pdf"
cp analyse/Degisiklik_Listesi_v2.pdf               "$P/6_Raporlar/Degisiklik_Listesi_TR_DE.pdf"
cp analyse/Sefa_Degisiklikleri_v5.pdf              "$P/6_Raporlar/SAHIT_v5_Sefa_Degisiklikleri_TR.pdf"
cp analyse/Son_Kontrol_Raporu.pdf                  "$P/6_Raporlar/Son_Kontrol_Raporu_TR.pdf"

cp 00_OKU_BENI.txt "$P/"
(cd out && zip -q -r Iki_Roman_KDP_Paket.zip Iki_Roman_KDP_Paket)
# Zusätzlich in zwei Teilen (< 500 MiB je Datei, z. B. für Upload/Mail):
#   Teil 1: Bücher, Cover, Marketing, Berichte · Teil 2: Trailer
rm -f out/Iki_Roman_1_Kitaplar_Kapaklar_Pazarlama.zip out/Iki_Roman_2_Fragmanlar.zip
(cd out && zip -q -r Iki_Roman_1_Kitaplar_Kapaklar_Pazarlama.zip Iki_Roman_KDP_Paket -x 'Iki_Roman_KDP_Paket/4_Fragmanlar/*')
(cd out && zip -q -r Iki_Roman_2_Fragmanlar.zip Iki_Roman_KDP_Paket/00_OKU_BENI.txt Iki_Roman_KDP_Paket/4_Fragmanlar)
# Teile unter 30 MiB (Upload-Grenze des Chat-Clients): out/parcalar/
rm -rf out/parcalar && mkdir -p out/parcalar && (
  cd out; Q=Iki_Roman_KDP_Paket
  zip -q -j parcalar/01a_YOLCU_Baski_KDP.zip $Q/00_OKU_BENI.txt $Q/1_KDP_YOLCU_TR/YOLCU_Ic_Sayfalar_A5.pdf $Q/1_KDP_YOLCU_TR/YOLCU_Tam_Kapak_KDP.pdf $Q/1_KDP_YOLCU_TR/YOLCU_Kapak_Onizleme.png
  zip -q -j parcalar/01b_YOLCU_Kindle_Word_Kapaklar.zip $Q/1_KDP_YOLCU_TR/YOLCU_Kindle.epub $Q/1_KDP_YOLCU_TR/YOLCU_eKitap_Kapagi.jpg $Q/1_KDP_YOLCU_TR/YOLCU_Word.docx $Q/1_KDP_YOLCU_TR/YOLCU_On_Kapak.pdf $Q/1_KDP_YOLCU_TR/YOLCU_Arka_Kapak.pdf
  zip -q -r parcalar/02_KDP_SAHIT_TR.zip $Q/00_OKU_BENI.txt $Q/2_KDP_SAHIT_TR
  zip -q -j parcalar/03_Raporlar.zip $Q/6_Raporlar/*
  for b in YOLCU SAHIT; do for l in EN DE; do zip -q -j parcalar/04_Kapak_${b}_${l}.zip $Q/3_Kapaklar_EN_DE/${b}_${l}_*; done; done
  for l in TR EN DE; do zip -q -j parcalar/05_Pazarlama_${l}.zip $Q/5_Pazarlama/Marketing_Story_Storyboard_${l}.pdf $Q/5_Pazarlama/Doppelansicht_${l}.png $Q/5_Pazarlama/Panorama_Marketing_${l}.png; done
  zip -q -j parcalar/06_Storyboard_Kareleri.zip $Q/5_Pazarlama/Storyboard/*
  zip -q -j parcalar/07_Fragman_Altyazilar_SRT.zip $Q/4_Fragmanlar/*/*.srt $Q/4_Fragmanlar/render_report.txt
  for l in TR EN DE; do cp $Q/4_Fragmanlar/$l/Iki_Roman_Fragman_16x9_60s_${l}_web.mp4 $Q/4_Fragmanlar/$l/Iki_Roman_Fragman_9x16_30s_${l}.mp4 $Q/4_Fragmanlar/$l/Iki_Roman_Fragman_1x1_30s_${l}.mp4 parcalar/; done
)
ls -la out/*.zip
(cd out && for z in *.zip; do printf '%-48s ' "$z"; unzip -l "$z" | tail -1; done)
