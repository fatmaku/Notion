# Çeviri hattı – DURUM (duraklatıldı, 15.10.2026)

Yazarın kararı: önce BEN YOKSAM bitecek; YOLCU/ŞAHİT'in EN/DE çevirisi **durduruldu**, hiçbir akış çalışmıyor. Kaldığı yer:

| Adım | Durum |
|---|---|
| Araçlar (`tools/i18n_*.py`, docx2book `BY_EN/BY_DE/SA_EN/SA_DE`, `build_cover.py --pages`) | hazır, test edildi |
| Bölüm özetleri `BY_synopsis.json` (46), `SA_synopsis.json` (36) | tamam |
| Ortak köprü cümleleri `shared_en.json`, `shared_de.json` | tamam, doğrulandı (`i18n_bible_check.py --shared en/de` → OK) |
| Bible'lar `BY_EN`, `BY_DE`, `SA_EN`, `SA_DE` | **yapılmadı** (kullanım sınırı; dört akış da başlamadan düştü) |
| Çeviri paketleri, bütün kitap kontrolü, dizgi, kapaklar | yapılmadı |

## Devam etmek için

```bash
cd iki-roman/interior
python3 tools/i18n_export.py --book BY --docx src/YOLCU_TR_v5.docx --out i18n/BY_source.json   # derived, gitignored
python3 tools/i18n_export.py --book SA --docx src/SAHIT_TR_v6.docx --out i18n/SA_source.json
for b in BY SA; do python3 tools/i18n_prepare.py --book $b split; python3 tools/i18n_prepare.py --book $b bible-input; done
```
Sonra `i18n/workflows/ceviri-bible.js` (args `{book, lang}`) dört kez; her bible için `i18n_bible_check.py --book … --lang …` OK olmalı;
`i18n_prepare.py --book … --lang … context`; `ceviri-paket.js` (args `{book, lang, bids}`); `i18n_check.py --merge`; `i18n_build.py`;
`ceviri-kitap-kontrol.js`; `docx2book.py --book BY_EN …`; `build_cover.py --langs en,de`.
