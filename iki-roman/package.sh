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
  cp trailer/out/Iki_Roman_Fragman_*_"$l".mp4 trailer/out/Iki_Roman_Fragman_*_"$l".srt "$P/4_Fragmanlar/$l/"
done
cp trailer/out/Iki_Roman_Fragman_16x9_60s_TR_web.mp4 "$P/4_Fragmanlar/TR/"
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
ls -la out/Iki_Roman_KDP_Paket.zip
(cd out && unzip -l Iki_Roman_KDP_Paket.zip | tail -1)
