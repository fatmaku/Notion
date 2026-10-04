#!/bin/bash
# Değişiklik listesi v6 (YOLCU v5, ŞAHİT v6) → analyse/Degisiklik_Listesi_v6.md + .pdf
set -euo pipefail
cd "$(dirname "$0")/.."
I=interior; T=$(mktemp -d)
python3 $I/tools/changelist.py $I/src/SAHIT_Edisyon_Sefa_2026-10.docx $I/src/v6/SAHIT_v6a_entegre.docx $T/A.md \
  --title "A. ŞAHİT – Sefa Abi'nin „Edisyon Tuncay'a“ dosyasının işlenmesi" \
  $I/src/v6/ops_sa_entegrasyon.json $I/src/v6/ops_sa_noktalama_ek.json >/dev/null
python3 $I/tools/changelist.py $I/src/v6/SAHIT_v6a_entegre.docx $I/src/SAHIT_TR_v6.docx $T/B.md \
  --title "B. ŞAHİT – Sıkılaştırma" \
  $I/src/v6/straff/ops_SA_alle.json $I/src/v6/ops_editor_SA.json $I/src/v6/review/fix_SA_alle.json >/dev/null
python3 $I/tools/changelist.py $I/src/YOLCU_TR_v4.docx $I/src/YOLCU_TR_v5.docx $T/C.md \
  --title "C. YOLCU – Sıkılaştırma" \
  $I/src/v6/straff/ops_BY_alle.json $I/src/v6/ops_editor_BY.json $I/src/v6/review/fix_BY_alle.json >/dev/null
python3 $I/tools/changelist.py $I/src/v6/SAHIT_v6b_vor_Korrektorat.docx $I/src/SAHIT_TR_v6.docx $T/D.md \
  --title "D. ŞAHİT – Son okuma ve jüri sonrası düzeltmeler" \
  $I/src/v6/korrektur/kor_SA_alle.json $I/src/v6/ops_editor2_SA.json $I/src/v6/ops_editor3_SA.json >/dev/null
python3 $I/tools/changelist.py $I/src/v6/YOLCU_v5a_vor_Korrektorat.docx $I/src/YOLCU_TR_v5.docx $T/E.md \
  --title "E. YOLCU – Son okuma ve jüri sonrası düzeltmeler" \
  $I/src/v6/korrektur/kor_BY_alle.json $I/src/v6/ops_editor2_BY.json >/dev/null
python3 - "$T" <<'PY'
import json, sys, pathlib
T = pathlib.Path(sys.argv[1])
punct = json.load(open("interior/src/v6/punct_log.json"))
geri = json.load(open("interior/src/v6/straff/geri_alinanlar.json"))
def shift(md):  # Überschriften eine Ebene tiefer
    return "\n".join(("#" + l) if l.startswith("#") else l for l in md.splitlines())
head = f"""# Değişiklik Listesi v6 – YOLCU v5 ve ŞAHİT v6

**Tarih:** 04.10.2026 · **Kaynaklar:** YOLCU v4 (Tuncay Sancak), Sefa Abi'nin „Edisyon Tuncay'a“ dosyası (Ekim 2026) · **Sonuç dosyaları:** `interior/src/YOLCU_TR_v5.docx`, `interior/src/SAHIT_TR_v6.docx`

## Özet

1. **ŞAHİT – Sefa Abi'nin son dosyası esas alındı.** Kitabın adı ŞAHİT olarak kaldı (Tuncay'ın kararı); Sefa Abi'nin ithafı („Bu Kitap: … Galip Kaşkaya'ya …“) kendi sayfasında. Sefa Abi'nin kendine yazdığı not („Romanlarım nerede?“) metinden çıkarıldı ve içeriği işlendi: DAKTİLO'da Hakan'ın çekmeceden çıkardığı üç roman AYNI EL'de delil olarak geri geliyor, SU'da imzalanıyor („Bu işin sonunda romanlarınızı imzalamanızı da isteyeceğim“ sözü kapanıyor). YOLCU ile köprü olan „sağ başparmağı bantlı adam“ üç yerde geri getirildi. Sefa Abi'nin yeni pasajlarındaki yazım ve noktalama hataları düzeltildi; yeni sahneler ve tercihleri (ilk bölümün adı „Başlangıç“, „FİT NE?“, „Doğum …“) korundu.
2. **Diyalog noktalaması:** {len(punct)} diyalog satırının sonunda eksik olan nokta / soru işareti / üç nokta eklendi (TDK: tırnak içindeki sözün noktalaması kapanış tırnağından önce gelir). Hattat–oduncu menkıbesindeki kısa çizgili diyaloglar „– “ ile dizildi. Liste: `interior/src/v6/punct_log.json`.
3. **Sıkılaştırma (iki kitap, olay örgüsü değişmeden):** jürinin işaret ettiği yerler (YOLCU: 5. bölüm, deneme blokları 17/20/26/38, 40 ve 45'teki soru–cevap çözümü, 44–47; ŞAHİT: açılış masalı, FİT NE?, HODRİ, MIZRAĞIN İKİ UCU, SUSAYANIN YOLU, vaaz pasajları, „Yahu / hocam / Bu defa“ tekrarları) on bir lektör bloğunda kısaltıldı. **YOLCU 44.749 → 40.687 kelime (−%9,1), ŞAHİT 39.918 → 36.464 kelime (−%8,7)** (son okuma ve düzeltmeler dâhil). HODRİ iki bölüme ayrıldı; yeni bölüm **SOLUCAN** („Mektup, hiç bitmesin istesem de bitmişti.“ ile başlıyor). ŞAHİT artık 35 bölüm.
4. **Editör müdahaleleri (jüri önerileri):** YOLCU'da „Sessiz Ses“in adı ilk geçtiği yerde tek cümleyle açıklandı; 49. bölümde ölüm saatinin (14.53) kesinliği 35. bölümdeki babanın saati gibi açık bırakıldı; 13. bölümde „Cevap yerine bir soru geldi“ → „Kısa bir cevap geldi“. ŞAHİT'te „Rava kalbi an Rabbi“ sözü Şems'e değil „erenler“e bağlandı; ÜÇ VURUŞ'ta telefona yazılan not „kâğıt“ değil „ekran“ olarak gösteriliyor.
5. **Bağımsız kontrol:** dört ayrı kontrolcü her kesintiyi bağlamında okudu ve iki kitabın tamamında, silinen her somut ayrıntının başka yerde geçip geçmediğini aradı. Beş dikiş düzeltmesi yapıldı. İki kesinti editör tarafından geri alındı (aşağıda).
6. **Bağımsız jüri (beş okuma) ve sonrası:** iki kitap birer yayınevi editörü ve birer dikkatli okur gözüyle, çift ise ayrıca bir okumayla değerlendirildi (`analyse/Juri_v6.pdf`). Jürinin bulduğu gerçek hatalar giderildi: YOLCU'da Edirne treninin saati (dönüş treni 14.53), 35./40. bölüm zaman çizgisi, 39. bölümdeki „Berlin“, 44. bölümdeki kalp cihazı, konuşanı belirsiz satırlar, 50. bölümdeki kapı (BAŞA DÖN'e bağlandı); ŞAHİT'te klinik tutarlılık („ön tanı“, sağ ayak), Selman kıssasının kaynağa uygunluğu (Kelbli tüccarlar, Vâdi'l-Kurâ, Amuriye/Emirdağ), „Belam“ (Baura babasının adı), „dumansız ateş“, besmele ifadesinin yazan elin hatası olarak işaretlenmesi, iki kitap arasındaki köprüler (yeşil acil odası ve plastik bardak, boş sandalye, „bir çocuk sesi“, harfi harfine aynı SES cümlesi).
7. **Son okuma (düzelti):** dört düzeltmen iki kitabı kelime kelime okudu: ŞAHİT'te 208, YOLCU'da 24 düzeltme (TDK yazımı, ek hataları, anlamı ters dönmüş cümleler, eksik sözcükler, „hâlâ / hikâye / kâğıt / âşık / Âdem / Hz.“ birliği). Üslup ve söz seçimi değiştirilmedi. Ardından iki editör son metni yeniden okudu (kontrol turu); bulguları da giderildi (ŞAHİT 34, YOLCU 9 düzeltme) ve ŞAHİT'te doğrudan anlatım öncesindeki noktalı virgüller iki noktaya, „…” dedi“ kalıbındaki eksik virgüller TDK'ye göre tamamlandı (93 paragraf; liste `interior/src/v6/punct2_log.json`).
8. **Kilitli içerik makineyle doğrulandı:** YOLCU'nun üç şifresi (SENİ BUL, BAŞA DÖN, BENİ ARAMA), ŞAHİT'in kalın harf şifresi („bismillah, alemlere rahmet olan Allahın adıyla“), iki kitap arasındaki köprü cümleleri, slogan, son sorular. Sonuç: `interior/src/v6/check_text_v6.json` (OK).

### Geri alınan kesintiler
""" + "\n".join(f"- {g['key']} {g['op']} (paragraf {g['pid']}): {g['neden']}" for g in geri) + """

### Kurz auf Deutsch
ŞAHİT basiert jetzt auf Sefas „Edisyon“ (Titel ŞAHİT, Widmung, Faden „drei Romane“ geschlossen, Brücke „sağ başparmağı bantlı“ wiederhergestellt, Satzfehler und 282 fehlende Satzzeichen in Dialogen korrigiert). Beide Bücher wurden ohne Plotänderung gestrafft: YOLCU −9,1 %, ŞAHİT −8,7 %; HODRİ ist in zwei Kapitel geteilt (neu: SOLUCAN). Jede Änderung steht unten mit Begründung; zwei Kürzungen wurden zurückgenommen, fünf Nahtstellen nach unabhängiger Gegenprüfung korrigiert. Danach eine unabhängige Jury (fünf Lesungen), deren Fehlerbefunde behoben wurden, ein vollständiges Korrektorat (ŞAHİT 208, YOLCU 24 Korrekturen) und eine Kontroll-Jury auf den Endfassungen (weitere 34 / 9 Korrekturen, Redezeichen nach TDK). Akrosticha, Brückensätze, Motto und Schlussfragen sind maschinell geprüft.

---
"""
out = head + "\n" + shift((T / "A.md").read_text()) + "\n\n" + shift((T / "B.md").read_text()) + "\n\n" + shift((T / "C.md").read_text()) + "\n\n" + shift((T / "D.md").read_text()) + "\n\n" + shift((T / "E.md").read_text())
pathlib.Path("analyse/Degisiklik_Listesi_v6.md").write_text(out)
print("analyse/Degisiklik_Listesi_v6.md", len(out))
PY
python3 analyse/build_pdf.py analyse/Degisiklik_Listesi_v6.md
