#!/bin/bash
# Baut das KDP-Paket für BEN YOKSAM (eigenständiges Buch): iki-roman/out/BEN_YOKSAM_KDP_Paket(.zip)
# (Ordner out/ wird nicht versioniert). Inhalt siehe 00_OKU_BENI_BEN_YOKSAM.txt.
#   1_KDP_BEN_YOKSAM_TR – sofort bei KDP hochladbar (Druck + Kindle + Word)
#   2_Pazarlama         – KDP-Beschreibung, Keywords, Kategorien, Bio
#   3_Raporlar          – Änderungsliste YOLCU → BEN YOKSAM, Konzept, Irfan-Schicht, Üçüncü Göz, Sırlar Çemberi
# Zusätzlich: out/ben_yoksam_parcalar/ – dasselbe ZIP in Stücken zu 25 MiB (Chat-Upload), SHA256.txt
set -euo pipefail
cd "$(dirname "$0")"
N=BEN_YOKSAM
P=out/${N}_KDP_Paket
rm -rf "$P" "out/${N}_KDP_Paket.zip" out/ben_yoksam_parcalar
mkdir -p "$P/1_KDP_${N}_TR" "$P/2_Pazarlama" "$P/3_Raporlar"

d="$P/1_KDP_${N}_TR"
cp interior/out/${N}_Innenteil_A5.pdf "$d/${N}_Ic_Sayfalar_A5.pdf"
cp cover/out/BYK/TR/Fullcover.pdf     "$d/${N}_Tam_Kapak_KDP.pdf"
cp cover/out/BYK/TR/Frontcover.pdf    "$d/${N}_On_Kapak.pdf"
cp cover/out/BYK/TR/Backcover.pdf     "$d/${N}_Arka_Kapak.pdf"
cp cover/out/BYK/TR/Vorschau.png      "$d/${N}_Kapak_Onizleme.png"
cp interior/out/${N}.epub             "$d/${N}_Kindle.epub"
cp cover/out/BYK/TR/eBook-Cover.jpg   "$d/${N}_eKitap_Kapagi.jpg"
cp interior/src/${N}_TR_v1.docx       "$d/${N}_Word.docx"

cp marketing/${N}_Pazarlama_TR.md marketing/${N}_Pazarlama_TR.pdf "$P/2_Pazarlama/"

for f in Degisiklik_Listesi Konsept Irfan_Katmani Ucuncu_Goz_Yerlesim Sirlar_Cemberi; do
  cp "analyse/${N}_${f}.pdf" "$P/3_Raporlar/"
done

cp 00_OKU_BENI_BEN_YOKSAM.txt "$P/00_OKU_BENI.txt"
(cd out && zip -q -r -X ${N}_KDP_Paket.zip ${N}_KDP_Paket && unzip -tq ${N}_KDP_Paket.zip)

mkdir -p out/ben_yoksam_parcalar
(cd out && split -b 25M -d -a 3 --numeric-suffixes=1 ${N}_KDP_Paket.zip ben_yoksam_parcalar/${N}_KDP_Paket.zip.
 sha256sum ${N}_KDP_Paket.zip > ben_yoksam_parcalar/SHA256.txt)
ls -la out/${N}_KDP_Paket.zip out/ben_yoksam_parcalar/
