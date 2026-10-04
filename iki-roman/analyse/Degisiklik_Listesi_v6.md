# Değişiklik Listesi v6 – YOLCU v5 ve ŞAHİT v6

**Tarih:** 04.10.2026 · **Kaynaklar:** YOLCU v4 (Tuncay Sancak), Sefa Abi'nin „Edisyon Tuncay'a“ dosyası (Ekim 2026) · **Sonuç dosyaları:** `interior/src/YOLCU_TR_v5.docx`, `interior/src/SAHIT_TR_v6.docx`

## Özet

1. **ŞAHİT – Sefa Abi'nin son dosyası esas alındı.** Kitabın adı ŞAHİT olarak kaldı (Tuncay'ın kararı); Sefa Abi'nin ithafı („Bu Kitap: … Galip Kaşkaya'ya …“) kendi sayfasında. Sefa Abi'nin kendine yazdığı not („Romanlarım nerede?“) metinden çıkarıldı ve içeriği işlendi: DAKTİLO'da Hakan'ın çekmeceden çıkardığı üç roman AYNI EL'de delil olarak geri geliyor, SU'da imzalanıyor („Bu işin sonunda romanlarınızı imzalamanızı da isteyeceğim“ sözü kapanıyor). YOLCU ile köprü olan „sağ başparmağı bantlı adam“ üç yerde geri getirildi. Sefa Abi'nin yeni pasajlarındaki yazım ve noktalama hataları düzeltildi; yeni sahneler ve tercihleri (ilk bölümün adı „Başlangıç“, „FİT NE?“, „Doğum …“) korundu.
2. **Diyalog noktalaması:** 282 diyalog satırının sonunda eksik olan nokta / soru işareti / üç nokta eklendi (TDK: tırnak içindeki sözün noktalaması kapanış tırnağından önce gelir). Hattat–oduncu menkıbesindeki kısa çizgili diyaloglar „– “ ile dizildi. Liste: `interior/src/v6/punct_log.json`.
3. **Sıkılaştırma (iki kitap, olay örgüsü değişmeden):** jürinin işaret ettiği yerler (YOLCU: 5. bölüm, deneme blokları 17/20/26/38, 40 ve 45'teki soru–cevap çözümü, 44–47; ŞAHİT: açılış masalı, FİT NE?, HODRİ, MIZRAĞIN İKİ UCU, SUSAYANIN YOLU, vaaz pasajları, „Yahu / hocam / Bu defa“ tekrarları) on bir lektör bloğunda kısaltıldı. **YOLCU 44.749 → 40.669 kelime (−%9,1), ŞAHİT 39.918 → 36.452 kelime (−%8,7)** (son okuma ve düzeltmeler dâhil). HODRİ iki bölüme ayrıldı; yeni bölüm **SOLUCAN** („Mektup, hiç bitmesin istesem de bitmişti.“ ile başlıyor). ŞAHİT artık 35 bölüm.
4. **Editör müdahaleleri (jüri önerileri):** YOLCU'da „Sessiz Ses“in adı ilk geçtiği yerde tek cümleyle açıklandı; 49. bölümde ölüm saatinin (14.53) kesinliği 35. bölümdeki babanın saati gibi açık bırakıldı; 13. bölümde „Cevap yerine bir soru geldi“ → „Kısa bir cevap geldi“. ŞAHİT'te „Rava kalbi an Rabbi“ sözü Şems'e değil „erenler“e bağlandı; ÜÇ VURUŞ'ta telefona yazılan not „kâğıt“ değil „ekran“ olarak gösteriliyor.
5. **Bağımsız kontrol:** dört ayrı kontrolcü her kesintiyi bağlamında okudu ve iki kitabın tamamında, silinen her somut ayrıntının başka yerde geçip geçmediğini aradı. Beş dikiş düzeltmesi yapıldı. İki kesinti editör tarafından geri alındı (aşağıda).
6. **Bağımsız jüri (beş okuma) ve sonrası:** iki kitap birer yayınevi editörü ve birer dikkatli okur gözüyle, çift ise ayrıca bir okumayla değerlendirildi (`analyse/Juri_v6.pdf`). Jürinin bulduğu gerçek hatalar giderildi: YOLCU'da Edirne treninin saati (dönüş treni 14.53), 35./40. bölüm zaman çizgisi, 39. bölümdeki „Berlin“, 44. bölümdeki kalp cihazı, konuşanı belirsiz satırlar, 50. bölümdeki kapı (BAŞA DÖN'e bağlandı); ŞAHİT'te klinik tutarlılık („ön tanı“, sağ ayak), Selman kıssasının kaynağa uygunluğu (Kelbli tüccarlar, Vâdi'l-Kurâ, Amuriye/Emirdağ), „Belam“ (Baura babasının adı), „dumansız ateş“, besmele ifadesinin yazan elin hatası olarak işaretlenmesi, iki kitap arasındaki köprüler (yeşil acil odası ve plastik bardak, boş sandalye, „bir çocuk sesi“, harfi harfine aynı SES cümlesi).
7. **Son okuma (düzelti):** dört düzeltmen iki kitabı kelime kelime okudu: ŞAHİT'te 208, YOLCU'da 24 düzeltme (TDK yazımı, ek hataları, anlamı ters dönmüş cümleler, eksik sözcükler, „hâlâ / hikâye / kâğıt / âşık / Âdem / Hz.“ birliği). Üslup ve söz seçimi değiştirilmedi.
8. **Kilitli içerik makineyle doğrulandı:** YOLCU'nun üç şifresi (SENİ BUL, BAŞA DÖN, BENİ ARAMA), ŞAHİT'in kalın harf şifresi („bismillah, alemlere rahmet olan Allahın adıyla“), iki kitap arasındaki köprü cümleleri, slogan, son sorular. Sonuç: `interior/src/v6/check_text_v6.json` (OK).

### Geri alınan kesintiler
- BY replace (paragraf 624): Leyla'nın şaman gelenekleri listesi kalıyor: 39. bölümdeki tekrarı (2791) zaten kısaltıldı; ikisi birden gidince „o geleneklerden“ dayanaksız kalıyordu.
- BY delete (paragraf 2792): „ŞAMAN, bu yüzden bir kimlik değil, hatırlatma olmalıydı“ bölümün kısaltma (Ş-A-M-A-N) listesinin anahtar cümlesi; Leyla'nın „eşiği geçen ve geri dönen“ tanımını kapatıyor.

### Kurz auf Deutsch
ŞAHİT basiert jetzt auf Sefas „Edisyon“ (Titel ŞAHİT, Widmung, Faden „drei Romane“ geschlossen, Brücke „sağ başparmağı bantlı“ wiederhergestellt, Satzfehler und 282 fehlende Satzzeichen in Dialogen korrigiert). Beide Bücher wurden ohne Plotänderung gestrafft: YOLCU −9,1 %, ŞAHİT −8,7 %; HODRİ ist in zwei Kapitel geteilt (neu: SOLUCAN). Jede Änderung steht unten mit Begründung; zwei Kürzungen wurden zurückgenommen, fünf Nahtstellen nach unabhängiger Gegenprüfung korrigiert. Danach eine unabhängige Jury (fünf Lesungen), deren Fehlerbefunde behoben wurden, und ein vollständiges Korrektorat (ŞAHİT 208, YOLCU 24 Korrekturen). Akrosticha, Brückensätze, Motto und Schlussfragen sind maschinell geprüft.

---

## A. ŞAHİT – Sefa Abi'nin „Edisyon Tuncay'a“ dosyasının işlenmesi

Toplam 73 işlem.

**Toplam:** 39.763 → 39.918 kelime (+155; +0.4 %)

| Bölüm | Önce | Sonra | Fark |
|---|---:|---:|---:|
| (Ön kısım) | 132 | 130 | -2 |
| Başlangıç | 1038 | 1038 | +0 |
| AZ ÇOK | 1466 | 1466 | +0 |
| DAKTİLO | 2829 | 2827 | -2 |
| TECRİT ODASI | 1969 | 1986 | +17 |
| UNUTMA | 1937 | 1940 | +3 |
| AN | 562 | 562 | +0 |
| FİT NE? | 1869 | 1869 | +0 |
| MUHİBBİ | 958 | 958 | +0 |
| OKU | 1866 | 1851 | -15 |
| AŞK İLE | 1633 | 1680 | +47 |
| GÜL KOKUSU | 995 | 995 | +0 |
| HODRİ | 4275 | 4275 | +0 |
| ON BİR | 2421 | 2423 | +2 |
| KAYIT | 1473 | 1473 | +0 |
| NAZIM'IN ANAHTARI | 365 | 365 | +0 |
| HAKAN'IN DOSYASI | 367 | 367 | +0 |
| MIZRAĞIN İKİ UCU | 3140 | 3142 | +2 |
| ŞEHRİN ÜÇ ŞAHİDİ | 423 | 423 | +0 |
| SUSAYANIN YOLU | 1292 | 1292 | +0 |
| MUHİBBİ'NİN SOFRASI | 839 | 839 | +0 |
| MEKTUBU KİM YAZDI? | 473 | 474 | +1 |
| KÂĞIDIN ÖTE YANI | 435 | 435 | +0 |
| ANNEMİN SESİ | 567 | 567 | +0 |
| SUSUZLUK | 422 | 422 | +0 |
| MUHİBBİ YOK | 318 | 318 | +0 |
| HAKİKAT MEDENİ | 1100 | 1100 | +0 |
| BOŞ SIRA | 350 | 344 | -6 |
| AYNI EL | 1155 | 1242 | +87 |
| HAKAN'IN CEVABI | 566 | 566 | +0 |
| VİLDAN'IN GÖRDÜĞÜ | 682 | 682 | +0 |
| ÜÇ VURUŞ | 333 | 333 | +0 |
| İÇERİDEKİ YAZAR | 448 | 450 | +2 |
| ŞAHİT | 466 | 466 | +0 |
| SU | 599 | 618 | +19 |

### Edisyon'un işlenmesi (başlık, ithaf, köprüler, üç roman, yazım)


#### (Ön kısım)

- **kısaltıldı:** „Şahit ve Yolcu“ → „ŞAHİT“ — Kitabın adı ŞAHİT olarak kalıyor (Tuncay'ın kararı); „Yolcu“ ve „Şahit“ ithafta kalın harfle duruyor.
- **biçim:** „Bu Kitap:“ → Dedication — İthaf kendi sayfasında, ortalı dizilsin diye ayrı biçim.
- **biçim:** „İyi bir insan, adam, eş“ → Dedication — İthaf kendi sayfasında, ortalı dizilsin diye ayrı biçim.
- **biçim:** „Galip Kaşkaya“ → Dedication — İthaf kendi sayfasında, ortalı dizilsin diye ayrı biçim.
- **değiştirildi:** „kardeş arkadaş,“ → „kardeş, arkadaş,“ — Virgül.
- **değiştirildi:** „ithaf edilmiştir“ → „ithaf edilmiştir.“ — Nokta.
- **biçim:** „Sefarizmalar“ → Normal — Epigraf kaynağı (v5'teki gibi).
- **değiştirildi:** „ahmaksın“ → „ahmaksın.“ — Nokta.

#### AZ ÇOK

- **değiştirildi:** „böyle bir dönemden geçiyor:“ → „böyle bir dönemden geçiyordum:“ — Fiil eksik kalmış (dizinin sonu „bakıyordum“).
- **değiştirildi:** „açmıyordum mesela... Derken“ → „açmıyordum mesela… Derken“ — Üç nokta tek karakter.
- **değiştirildi:** „ben bile bitiremedim tanımı daha”“ → „ben bile bitiremedim tanımı daha.”“ — Nokta.

#### DAKTİLO

- **değiştirildi:** „değildi ve Vildan Hanımı da bunlar şaşırtıyordu.“ → „değildi ve Vildan Hanım'ı da bunlar şaşırtıyordu.“ — Kesme işareti.
- **değiştirildi:** „“Mustafa Sefa Bey, yazdıklarınız tamamen“ → „“‘Mustafa Sefa Bey, yazdıklarınız tamamen“ — İç tırnak açılmamıştı (kapanış ’ vardı).
- **değiştirildi:** „aşamasında, muallak...”“ → „aşamasında, muallak…”“ — Üç nokta tek karakter.
- **değiştirildi:** „kendisine ulaşmak, yani vakanın yazdıklarını derlemek, romanlaştırmak senin, vakayı tedavi etmek benim, sırrı çözmek devletin işi”“ → „kendisine ulaşmak. Yani vakanın yazdıklarını derlemek, romanlaştırmak senin; vakayı tedavi etmek benim; sırrı çözmek devletin işi.”“ — Cümle bölündü, nokta.
- **değiştirildi:** „“Hayır, yarın olarak kalsın. Hastaların da işi beklemesin”“ → „“Hayır, yarına kalsın. Hastaların da işi beklemesin.”“ — „yarın olarak kalsın“ → „yarına kalsın“ (toplantı yarına alındı); nokta.
- **değiştirildi:** „Biz de ardı sıra beraberinde çıktık.“ → „Biz de ardı sıra çıktık.“ — „ardı sıra beraberinde“ çift anlatım.

#### TECRİT ODASI

- **biçim:** „Derken Vildan Hanım yanımızdan ayrılmıştı.“ → Normal — Açılış biçimi yalnız bölümün ilk paragrafında.
- **değiştirildi:** „Derken Vildan Hanım yanımızdan ayrılmıştı.“ → „Derken Vildan Hanım yanımızdan ayrılmıştı.“ — Sondaki boşluk.
- **değiştirildi:** „“Kitap yazacağım, yazma demiyorum yaz elbet ama nedir bu dağınıklık, artık ben de yoruluyorum arkanı toplamaktan. İnanılmaz düzensizsin, uyku düzenin zaten yok…“ → „“‘Kitap yazacağım’ diyorsun; yazma demiyorum, yaz elbet. Ama nedir bu dağınıklık? Artık ben de yoruluyorum arkanı toplamaktan. İnanılmaz düzensizsin; uyku düze…“ — Annenin sözü: „Kitap yazacağım“ oğlunun sözü, iç tırnakla; soru ve noktalar.
- **değiştirildi:** „Hocam kelimesi beni esprili“ → „“Hocam” kelimesi beni esprili“ — Alıntılanan kelime tırnakta.
- **değiştirildi:** „Lan demesindeki hikmet ise çocukluktan gelen dostluğumuzdandı.“ → „“Lan” demesindeki hikmet ise çocukluktan gelen dostluğumuzdandı.“ — Alıntılanan kelime tırnakta; sondaki boşluk.
- **eklendi:** „Bunu az önce sormuş muydum? O gün fark etmedim; şimdi de emin değilim, olduğu gibi bırakıyorum.“ — v3'teki anlatıcı cümlesi geri geldi: EEG iki kez anlatıldıktan sonra yine sorulması bir revizyon artığı gibi değil, hafıza kaybının izi gibi okunsun (Sefa'nın temel aldığı dosyada bu cümle yoktu).

#### UNUTMA

- **değiştirildi:** „“Nazım Efendi siz misiniz”“ → „“Nazım Efendi siz misiniz?”“ — Soru işareti.
- **değiştirildi:** „Bir hafta olur, on gün olur… Ama bu kadar erken değil”“ → „Bir hafta olur, on gün olur… Ama bu kadar erken değil.”“ — Nokta.
- **değiştirildi:** „“Abi, sen Nazım Efendi misin onu söyle?”“ → „“Abi, sen Nazım Efendi misin, onu söyle.”“ — Emir cümlesi (soru işareti değil).
- **değiştirildi:** „yani okumuş, mürekkep yalamış ademler”“ → „yani okumuş, mürekkep yalamış ademler.”“ — Nokta.
- **değiştirildi:** „yalamak için değil, yazmak için kullanıyorum”“ → „yalamak için değil, yazmak için kullanıyorum.”“ — Nokta.
- **değiştirildi:** „Sanki biraz gereksiz mi yükseldim diye düşünürken, biraz mahcuptum:“ → „Gereksiz yere mi yükseldim diye düşünürken biraz mahcup oldum:“ — „Sanki … mi … biraz … biraz“ toparlandı.
- **değiştirildi:** „Oysa orada sağlam bir ikaz vardı: Muhyiddin İbnü'l-Arabî'nin;“ → „Oysa orada sağlam bir ikaz vardı, Muhyiddin İbnü'l-Arabî'ye atfedilen bir söz:“ — Söz İbnü'l-Arabî'ye atfediliyor (kesin kaynak yok, v5'teki gibi „atfedilen“).
- **değiştirildi:** „“İnsan hakikati öğrenmez, hatırlar” Çözülebilir bir şifreyle oyalanacağıma bu sözlere“ → „“İnsan hakikati öğrenmez, hatırlar!” Çözülebilir bir şifreyle oyalanacağıma bu söze“ — Motto kitabın her yerindeki biçimde (ünlemle); tek söz → „bu söze“.

#### OKU

- **değiştirildi:** „İndirilen ilk ayetten ve Peygamberimize gelen ilk ve ilk vahiyden bahsediyordu.“ → „İndirilen ilk ayetten, Peygamberimize gelen ilk vahiyden bahsediyordu.“ — „ilk ve ilk“ yazım hatası.
- **değiştirildi:** „kendime de zulüm olacak”“ → „kendime de zulüm olacak.”“ — Nokta.
- **değiştirildi:** „“Alimlik meslek değildir ancak mesleğini aşk ile yapan alimdir yeğenim, alimi alim yapan okuduğu kendinden önceki peygamberlerin hayatları, sahabelerin hayatı,…“ → „“Alimlik meslek değildir, ancak mesleğini aşk ile yapan alimdir yeğenim. Alimler, kendilerinden önceki peygamberlerin, sahabelerin, alimlerin hayatlarını, yapt…“ — Cümle yapısı (özne iki kez değişiyordu).
- **değiştirildi:** „meşakkati zorlu bir yolculuktur. İlim öğrendikçe“ → „meşakkatli, zorlu bir yolculuktur. İlim, öğrendikçe“ — „meşakkatli“; virgül.
- **değiştirildi:** „İşte alim kişiler hatırladıkça havsala tatmin olur ve keyif verir. İşte kişi O’dur ki ilmi öğrenmek, öğrendikçe hatırlamaya başlamak keyif verir böylece insana…“ → „İşte alim kişi hatırladıkça havsalası tatmin olur, keyif alır. İlmi öğrenmek, öğrendikçe hatırlamaya başlamak kime keyif veriyorsa, diğer insanlar o kişiye ali…“ — İki cümle anlaşılır hale getirildi (anlam aynı).

#### HODRİ

- **değiştirildi:** „çünkü bayılmanın içerisine sanırım uykumda karışmıştı. Saat neredeyse öğlene geliyordu,“ → „çünkü bayılmanın içine sanırım uyku da karışmıştı. Saat öğlene geliyor gibiydi,“ — „uykumda“ → „uyku da“; saat bir izlenim (ON BİR'deki 10.44 ile çelişmesin, v2'deki düzeltme yeni cümleye uyarlandı).
- **değiştirildi:** „harekete etmeye halim“ → „hareket etmeye halim“ — Yazım hatası.
- **değiştirildi:** „doğru ve afili bol cümlelerdi“ → „doğru ve bol afili cümlelerdi“ — Sözcük sırası.
- **değiştirildi:** „Yaşamadıklarımı dahası yaşantıma yansıtmadığım sözlerim mi yansıyordu bu öfkeye.“ → „Yaşamadıklarım, dahası yaşantıma yansıtmadığım sözlerim mi yansıyordu bu öfkeye?“ — Soru işareti, virgül.
- **değiştirildi:** „Sen zaferden değil, seferden mesulsün kulum”“ → „Sen zaferden değil, seferden mesulsün kulum.”“ — Nokta.
- **değiştirildi:** „hak etmiyor muşum”“ → „hak etmiyormuşum.”“ — „-muşum“ bitişik yazılır; nokta.
- **değiştirildi:** „Peki Ya ALLAH bunun hesabını sormayacak mı sana.“ → „Peki ya ALLAH bunun hesabını sormayacak mı sana?“ — Soru işareti.
- **değiştirildi:** „eşrefi mahlukat eder Mütekamil olmaya müşteri insanı.“ → „mütekâmil olmaya müşteri insanı eşrefi mahlukat eder.“ — Sözcük sırası (nesne fiilden önce); „müşteri“ (talip) Sefa'nın sözcüğü olarak kaldı.
- **değiştirildi:** „“Hürriyet, Hakk’a esaret halkasındadır”“ → „“Hürriyet, Hakk’a esaret halkasındadır.”“ — Nokta.

#### ON BİR

- **değiştirildi:** „iki çayla donat denmiş kendisine”“ → „iki çayla donat denmiş kendisine.”“ — Nokta.
- **değiştirildi:** „Hakan’dan telefonumu almış kesin, Hakan da ne yapacağını sorunca kahvaltıdan bahsetmiş, Hakan da bu jesti yapmıştır.“ → „Telefonumu Hakan’dan almış olmalı, diye düşündüm; ne yapacağını sorunca Hakan da kahvaltıdan bahsetmiş, bu jesti de o yapmıştır.“ — İç ses netleşti (üç kez „Hakan da“).

#### KAYIT

- **değiştirildi:** „“Özellikle mi seçtiniz?” diye aklımdan geçirdim“ → „“Özellikle mi seçtiniz?” diye aklımdan geçirdim.“ — Nokta.
- **değiştirildi:** „“Neyi?” der gibi yüzüme baktı“ → „“Neyi?” der gibi yüzüme baktı.“ — Nokta.

#### MIZRAĞIN İKİ UCU

- **değiştirildi:** „Allah için; savaşmak, yemek, içmek,“ → „Her şey Allah için; savaşmak, yemek, içmek,“ — Sefa „Sanat …“ kısmını HODRİ'ye taşıdı; kalan cümle öznesiz başlıyordu.

#### MEKTUBU KİM YAZDI?

- **değiştirildi:** „KAPI'nın altında eli bantlı bir adam“ → „KAPI'nın altında sağ başparmağı bantlı bir adam“ — Köprü: YOLCU'daki „sağ başparmak“ ve „bantlı başparmak“ ile aynı ayrıntı (v2'den; Sefa'nın temel aldığı dosyada yoktu).

#### İÇERİDEKİ YAZAR

- **değiştirildi:** „kırmızı ip, parmağı sargılı adam.“ → „kırmızı ip, sağ başparmağı bantlı adam.“ — Köprü (aynı).
- **değiştirildi:** „Parmağı bantlı adam, kendi çantasını“ → „Sağ başparmağı bantlı adam, kendi çantasını“ — Köprü (aynı).

#### SUSUZLUK

- **değiştirildi:** „Bu beni küçültmedi odayı büyüttü.“ → „Bu beni küçültmedi, odayı büyüttü.“ — Virgül.

#### HAKİKAT MEDENİ

- **değiştirildi:** „Ben de burada olacağım”“ → „Ben de burada olacağım.”“ — Nokta.
- **değiştirildi:** „“Ne oldu oğlum, bir durum mu var”“ → „“Ne oldu oğlum, bir durum mu var?”“ — Soru işareti.
- **değiştirildi:** „“Yok ana, sen sadece gel”“ → „“Yok ana, sen sadece gel.”“ — Nokta.
- **değiştirildi:** „bu oğlum olduğun sonucunu hiç değiştirmedi”“ → „bu oğlum olduğun sonucunu hiç değiştirmedi.”“ — Nokta.
- **değiştirildi:** „Oysa annem benim yanımda oturuyordu ve aklımda susmayan o ses, Hakan’ın mı benim mi yanında oturuyor.“ → „Oysa annem benim yanımda oturuyordu. Aklımda susmayan o ses soruyordu: Hakan’ın mı, benim mi yanında oturuyor?“ — Soru cümlesi olarak kuruldu.

#### BOŞ SIRA

- **değiştirildi:** „Gözümün önünde bir sahne canlandı; su dolu bir akvaryuma, her yeri zincirlerle sarılı bir sihirbaz… Boğuluyor ama ne seyirciler ne de asistanlar buna müdahale …“ → „Gözümün önünde bir sahne canlandı: su dolu bir akvaryumda, her yeri zincirlerle sarılı bir sihirbaz… Boğuluyor ama ne seyirciler ne de asistanlar müdahale ediy…“ — Sefa'nın yeni imgesi korundu; cümleler toparlandı (özne/zaman uyumu).

#### AYNI EL

- **değiştirildi:** „hastane koridorunda kızına suyu az diye söylenen adam da. Onların“ → „hastane koridorunda kızına suyu az diye söylenen adam da. Kafedeki Mahmut da, telefonun öbür ucundaki iki Emrah da. Onların“ — Ayrım listesi: Mahmut (TECRİT ODASI) ve HODRİ'de Sefa'nın genişlettiği iki Emrah da „kendi hayatı olan insanlar“ tarafında (v3'teki satırın kısaltılmış hâli; Suat artık kitapta geçmiyor).
- **değiştirildi:** „İşte az önce aklımdan geçenler de maalesef bunlardı, boğuluyordum ve kimse bunun farkında değildi öğrencilerden.“ → „İşte az önce aklımdan geçen de buydu: Boğuluyordum ve öğrencilerden kimse bunun farkında değildi.“ — Cümle düzeni.
- **eklendi:** „Üç romanımı da sordum. Hakikat, makam odasındaki çekmeceden getirtti. Sağ üst gözden çıktıkları sırayla, ilk günkü gibi üst üste duruyorlardı. Kapaklarında adım yazıyordu: Mustafa Sefa Güvenir. Basılmış, satılmış, birilerinin elinden geçmiş kitaplardı; onları ben uydurmamıştım. Sayfaların kenarındaki kurşun kalem notlarını ise tanıdım. Mektuplardaki düzeltmelerle aynı eldendi. Kitaplar bir yazarı…“ — Sefa'nın notu („Romanlarım nerede?“): DAKTİLO'da Hakan'ın çekmeceden çıkardığı üç roman sonra hiç görünmüyordu. Kanıt incelemesinin yapıldığı bölümde romanlar geri geliyor: varlıkları yazarı kanıtlıyor, ikinci bir bedeni değil.

#### SU

- **eklendi:** „Çantamdan üç romanımı çıkardım. Hakan bu işin sonunda onları imzalamamı istemişti. İş bitmiş miydi, bilmiyordum; bir yere varmıştı. Üçünün de ilk sayfasını açıp imzaladım. Kime yazdığımı imzanın üstüne yazmadım. Hakan'a mı, kendime mi, yoksa bir gün onları raftan alacak birine mi; o soruyu kapının aralığına bıraktım.“ — DAKTİLO'daki söz („romanlarınızı imzalamanızı da isteyeceğim“) kapanıyor; son sayfadaki köprü cümleleri değişmedi.
- **kısaltıldı:** „ŞAHİDİ ARARKEN“ → „ŞAHİT“ — Kitabın adı (son sayfa).
- **silindi:** „Romanlarım nerede?“ — Sefa'nın kendine notu, metnin parçası değil; içeriği AYNI EL ve SU'da işlendi.
- **silindi:** „Sefanın yazdığı üç roman nerede?“ — Not (aynı).

### Ek noktalama ve boşluk temizliği


#### FİT NE?

- **değiştirildi:** „Allah halifesini yaratmış’ dedi“ → „Allah halifesini yaratmış’ dedi.“ — Nokta.
- **değiştirildi:** „İblis, şeytana yaklaştı ve fısıldadı“ → „İblis, şeytana yaklaştı ve fısıldadı:“ — Konuşmadan önce iki nokta.
- **değiştirildi:** „hafifçe geriye yaslandı ama hala hiddetliydi“ → „hafifçe geriye yaslandı ama hâlâ hiddetliydi.“ — Nokta; „hâlâ“.

#### MUHİBBİ

- **değiştirildi:** „Sorumu düzelterek sordum bu seferinde“ → „Sorumu düzelterek sordum bu seferinde:“ — İki nokta.

#### MIZRAĞIN İKİ UCU

- **değiştirildi:** „Hanzeb’i dinlemeye devam etti“ → „Hanzeb’i dinlemeye devam etti.“ — Nokta.
- **değiştirildi:** „gerdan bükerek konuşmaya“ → „gerdan bükerek konuşmaya:“ — İki nokta.


## B. ŞAHİT – Sıkılaştırma

Toplam 337 işlem.

**Toplam:** 39.918 → 36.452 kelime (-3.466; -8.7 %)

| Bölüm | Önce | Sonra | Fark |
|---|---:|---:|---:|
| (Ön kısım) | 130 | 130 | +0 |
| Başlangıç | 1038 | 884 | -154 |
| AZ ÇOK | 1466 | 1383 | -83 |
| DAKTİLO | 2827 | 2565 | -262 |
| TECRİT ODASI | 1986 | 1793 | -193 |
| UNUTMA | 1940 | 1714 | -226 |
| AN | 562 | 553 | -9 |
| FİT NE? | 1869 | 1707 | -162 |
| MUHİBBİ | 958 | 890 | -68 |
| OKU | 1851 | 1670 | -181 |
| AŞK İLE | 1680 | 1609 | -71 |
| GÜL KOKUSU | 995 | 947 | -48 |
| HODRİ | 4275 | 1914 | -2361 |
| SOLUCAN | 0 | 1905 | +1905 |
| ON BİR | 2423 | 2230 | -193 |
| KAYIT | 1473 | 1425 | -48 |
| NAZIM'IN ANAHTARI | 365 | 365 | +0 |
| HAKAN'IN DOSYASI | 367 | 354 | -13 |
| MIZRAĞIN İKİ UCU | 3142 | 2428 | -714 |
| ŞEHRİN ÜÇ ŞAHİDİ | 423 | 412 | -11 |
| SUSAYANIN YOLU | 1292 | 1140 | -152 |
| MUHİBBİ'NİN SOFRASI | 839 | 737 | -102 |
| MEKTUBU KİM YAZDI? | 474 | 469 | -5 |
| KÂĞIDIN ÖTE YANI | 435 | 432 | -3 |
| ANNEMİN SESİ | 567 | 541 | -26 |
| SUSUZLUK | 422 | 364 | -58 |
| MUHİBBİ YOK | 318 | 304 | -14 |
| HAKİKAT MEDENİ | 1100 | 1057 | -43 |
| BOŞ SIRA | 344 | 324 | -20 |
| AYNI EL | 1242 | 1214 | -28 |
| HAKAN'IN CEVABI | 566 | 539 | -27 |
| VİLDAN'IN GÖRDÜĞÜ | 682 | 663 | -19 |
| ÜÇ VURUŞ | 333 | 296 | -37 |
| İÇERİDEKİ YAZAR | 450 | 419 | -31 |
| ŞAHİT | 466 | 464 | -2 |
| SU | 618 | 611 | -7 |

### Sıkılaştırma (beş lektör bloğu)


#### Başlangıç

- **silindi:** „Ceylan hangi çimenin konuştuğunu anlamış, hatta cevabını da vermişti;“ — Gereksiz anlatım etiketi; cevabın kime ait olduğu belli.
- **kısaltıldı:** „bir yolculuk, üstelik bu sana özel, sadece senin için, şahit seni bekliyor.“ → „bir yolculuk, şahit seni bekliyor.“ — Tekrar: 'sana özel' vurgusu fazlalık.
- **kısaltıldı:** „, Şahit dediğin mi yapacak bunu? O bahsettiğin kim ki bunu yapabilsin?“ → „?“ — Şahit sorusu 18'de zaten soruldu.
- **silindi:** „Ceylan öfkelenerek ve biraz da ürkmeye başlayarak;“ — Konuşma etiketi; 23'teki tehdit öfkeyi zaten gösteriyor.
- **kısaltıldı:** „diledim, senden çok şey mi istedim, anla artık ben şahidi tanımak isterim, bin ömrün bereketini görmeliyim.“ → „diledim.“ — Aynı dilek üçüncü kez tekrarlanıyor.
- **kısaltıldı:** „şu işi, beni yiyerek kat bedenine, ruhum“ → „şu işi, ruhum“ — 'Beni yiyerek' tekrarı.
- **kısaltıldı:** „Kulaklarının duyduğunu susturmuştu ama içinden, korkuyla atan kalbinden gelen sesi susturamıyordu.“ çıkarıldı — Kalpten gelen fısıltı paragrafın sonunda zaten söyleniyor.
- **değiştirildi:** „sürünün içindeki diğer ceylanlar ürktü, bir aslan gören ceylan ancak bu kadar hızlı kaçardı ama ortada onları avlayacak“ → „bir aslan gören ceylan ancak bu kadar hızlı kaçardı ama ortada onu avlayacak“ — Yan imge kısaltıldı; zamir uyarlandı.
- **kısaltıldı:** „Bu arada gülleri yemeye hiç niyeti yoktu, onların dikenleri ölümcül ve de çoktu.“ çıkarıldı — Diken korkusu 23'te kurulmuştu; ara açıklama.
- **kısaltıldı:** „Ceylanın şaşkınlığı değil ama korkusu arttı.“ çıkarıldı — Korku 32'de zaten veriliyor.
- **kısaltıldı:** „Şimdi ceylan onun gibi kalkmayı, koşmayı, kaçmayı ne çok istiyordu.“ çıkarıldı — Ölüm anını yavaşlatan ek cümle.
- **silindi:** „Güller ve bülbüller susmuşlar mıydı, yoksa kararan gözleri gibi kulakları da seslere mi perdelenmişti. Duyduğu sözler ile öyle olmadığını anladı;“ — Ara soru; güllerin cevabı doğrudan 'Yalancılar'a bağlanıyor.
- **kısaltıldı:** „Ey! Ceylan, ismi derine yazılacak olan gül kokulu, ismi cennet“ → „Ey! Ceylan, ismi cennet“ — Derine yazılma aynı cümlede tekrar ediliyor.
- **kısaltıldı:** „bundan dolayı da tüm çiçeklerin içinde en güzel kokan bizleriz,“ çıkarıldı — 'Güller Ahmed kokar' sözünün açıklaması; fazlalık.
- **kısaltıldı:** „İşte o günden sonra nice edebiyatçıya“ → „İşte nice edebiyatçıya“ — 'o günden sonra … o gün' tekrarı.
- **kısaltıldı:** „nice sözler bir ceylan gözüne yazıldı“ çıkarıldı — Aşıklar cümlesiyle aynı fikir.
- **kısaltıldı:** „Çünkü o bakışta Hak vardı, Hakk’ı görmek ve Hakk’a vuslat vardı.“ çıkarıldı — Sır, 'Hakk'a sürme çekilen gözler'de zaten verildi.

#### AZ ÇOK

- **kısaltıldı:** „Beni oraya götüren merakım mıydı, egom muydu, bunu bile sorgulamadım. Sadece gittim. Konuşma hevesim, gençlere bir şeyler aktarma isteğim yoktu.“ çıkarıldı — Sorgulamama hali üçüncü kez söyleniyor.
- **kısaltıldı:** „Görünüşe bakılırsa, hitabetini değerlendirmem için beni seçmişti.“ çıkarıldı — Sonraki cümleyle aynı tahmin.
- **kısaltıldı:** „Şimdi kestiremiyorum; belli bir sebebi de yoktu.“ çıkarıldı — 'Nedenini bilmiyorum' tekrarı.
- **kısaltıldı:** „Belki sesi net duymak istiyordum.“ çıkarıldı — Ses netleşmesi hemen ardından anlatılıyor.
- **değiştirildi:** „Yahu sahne adamı olmama tamam“ → „Sahne adamı olmama tamam“ — Dolgu ünlem 'Yahu'.
- **kısaltıldı:** „Hani derler ya; “Adama bakarım adam mı diye, sözüne bakarım söz mü diye” misali.“ çıkarıldı — Esprinin akışını kesen atasözü.
- **kısaltıldı:** „Neden hiçbir şey yapmak istemediğimi, neden tükenmiş gibi hissettiğimi, yatmaktan, kalkmaktan, yürümekten, yemekten, içmekten neden bu kadar vazgeçtiğimi…“ çıkarıldı — İçe kapanma listesi; suskunluk zaten anlatıldı.
- **kısaltıldı:** „, sonra sizinle cep telefonu ile temasa geçmeye çalışmış, sonra da mesajla ulaşabilmiş.“ → „.“ — Okurun gördüğü arama/mesaj sahnesinin özeti.

#### DAKTİLO

- **kısaltıldı:** „Hakan Hoca’yı soluksuz dinliyordum.“ çıkarıldı — Dinleme hali tekrarı.
- **değiştirildi:** „Hem samimiyetini gösteriyor hem de onu dikkatle dinleyip dinlemediğimi ölçüyordu: “Nerede kalmıştık, Sefa?”“ → „Hem samimiyetini gösteriyor hem de onu dikkatle dinleyip dinlemediğimi ölçüyordu.“ — Az önceki repliğin aynen tekrarı.
- **değiştirildi:** „“Hocam, hastanızın“ → „“Hastanızın“ — Ardışık 'Hocam' hitaplarından biri.
- **kısaltıldı:** „Sonra bakışı değişti; bana döndüğünü hissettim.“ çıkarıldı — 113'teki göz teması sahnesinin önden özeti.
- **kısaltıldı:** „Belki de ortada devlete ait bir sır falan yoktur; devlet baba, evladının iyileşmesini istiyordur. Bilemem.“ çıkarıldı — Devlet sırrı öncülünü erken söndürüyor; sonra hiç alıntılanmıyor.
- **kısaltıldı:** „Hoca konuştukça iş ilginçleşiyordu. Ama bütün“ → „Bütün“ — Boş geçiş cümlesi.
- **kısaltıldı:** „Bu çok büyük bir şey sayılmazdı belki ama önemli bir adımdı.“ çıkarıldı — Vaka raporunda gereksiz değerlendirme.
- **silindi:** „Emin olmak için sormadan duramadım:“ — Konuşma etiketi; 'Daktilo mu?' kendini anlatıyor.
- **kısaltıldı:** „Sonunda bu adamın tedavi sürecini yönetenler, İl Sağlık Müdürlüğü aracılığıyla Sağlık Bakanlığı'ndan“ → „Sonunda Sağlık Bakanlığı'ndan“ — Vaka raporunda bürokrasi zinciri kısaltıldı.
- **kısaltıldı:** „; teklifini ne kadar merak ettiğimi biliyordu“ çıkarıldı — Önceki cümleyle aynı bilgi.
- **kısaltıldı:** „Kâğıda bir şeyler yazmış mıydı, yoksa bütün bu heyecanım boşuna mıydı?“ çıkarıldı — Umutsuzluk 130'da zaten söylendi.
- **kısaltıldı:** „Aradığım kişiyi görünce sebebini anlatırım.“ çıkarıldı — Sebep hemen ardından söyleniyor; çelişkili dolgu.
- **kısaltıldı:** „Ama araca biner binmez bu gürültünün yorgunluğunu gerçekten hissettim.“ çıkarıldı — Yorgunluk önceki cümlede var.
- **kısaltıldı:** „Nizamiyeden içeri girdiğimizde karşılaştığımız herkes Hakan Hoca'ya selam veriyordu.“ çıkarıldı — Selam verme sahnesi iki kez; ikincisi kaldı.
- **kısaltıldı:** „Makam insana yalnızca bir oda değil, çevresindekilerin ses tonunu da veriyordu sanki.“ çıkarıldı — Sahneyi yorumlayan aforizma.
- **kısaltıldı:** „En önemlisi de buydu; hâlâ anlamakta güçlük çekiyordum.“ çıkarıldı — Soru zaten soruldu.
- **kısaltıldı:** „Bu kadar isabetli yargılara nasıl varıyordu, bilemiyordum.“ çıkarıldı — Aynı şaşkınlık tekrarı.
- **kısaltıldı:** „Belli ki hocamızın alışıldık davranışları değildi ve Vildan Hanım'ı da bunlar şaşırtıyordu.“ çıkarıldı — Önceki cümlenin açıklamasını tekrarlıyor.
- **silindi:** „Hoca ile sekreteri arasındaki bu kısa, net, hatta keskin konuşma birkaç saniye sürmüştü. Ama beklemek bana bir ömür gibi gelmişti.“ — Bekleme süresi yorumu; sahneyi uzatıyor.
- **kısaltıldı:** „Merak, şaşkınlık ve gurur birbirine karışmıştı.“ çıkarıldı — 173'ün ilk cümlesinde aynı duygular.
- **kısaltıldı:** „Küçük fincanın kulpunu tutarken kahveyi dökmemek için elimi zor zapt ediyordum.“ çıkarıldı — 'Dökmeden içebilme' cümlesiyle aynı.
- **kısaltıldı:** „Geriye iki tür kalıyordu: Yazar olduğunu sananlar ve zaten yazar olduğunun farkında olanlar.“ çıkarıldı — Aforizma yığını; asıl cümle kaldı.
- **kısaltıldı:** „Ama önce kâğıtların sıraya konmasını istiyorum.“ çıkarıldı — İlk cümledeki ricanın tekrarı.
- **kısaltıldı:** „Hatta eminim, bu işi onlar da yapar.“ çıkarıldı — Önceki cümlenin tekrarı.
- **kısaltıldı:** „Sizin gibi ifade edersem, bu sözüm açıklığın ve netliğin bir tık ötesinde, keskin bir ifade olur.“ çıkarıldı — Espriyi açıklayan fazla cümle.
- **kısaltıldı:** „Ülkemizde aydınlarımızın bile yalnızca yüzde ikisi okuyor; bu yüzden sadece yazarların yazdıklarına odaklanılıyor. ‘Peki, bu yazara bunları yazdıran olaylar ne…“ çıkarıldı — Konudan sapan vaaz; 194'teki okur sorusuyla da çelişiyor.
- **değiştirildi:** „“Yahu hocam, yalnızca“ → „“Hocam, yalnızca“ — Dolgu 'Yahu'.
- **değiştirildi:** „“Hocam, mektupları“ → „“Mektupları“ — Ardışık 'Hocam' hitaplarından biri.

#### TECRİT ODASI

- **kısaltıldı:** „Sonucu tek başına yorumlamayız; gerekirse başka değerlendirmeler de yaparız.“ çıkarıldı — Aynı uyarı 248 ve 259'da var (döngü korunuyor).
- **değiştirildi:** „“Hocam, vallahi süper olur.“ → „“Vallahi süper olur.“ — Dolgu 'Hocam'.
- **değiştirildi:** „“Vallahi hocam, çok makbule geçer.”“ → „“Vallahi, çok makbule geçer.”“ — Dolgu 'hocam'.
- **kısaltıldı:** „Gerçek yaşadıklarımı kaleme almak benim için değişik bir deneyim olacak.“ çıkarıldı — Önceki bölümde konuşulan niyetin tekrarı.
- **değiştirildi:** „“Evet hocam, haklısınız.”“ → „“Evet, haklısınız.”“ — Dolgu 'hocam'.
- **değiştirildi:** „Yahu, ne garip hayatlar vardı.“ → „Ne garip hayatlar vardı.“ — Dolgu 'Yahu'.
- **kısaltıldı:** „Yine de içime bir şüphe düşmedi değil: Genç ve idealist bir profesörün anlattıkları uydurma olabilir miydi? Bunu okuduğum hikâyelerden anlayacağımı düşündüm. B…“ çıkarıldı — Öncülü erken söndüren şüphe; 'keskinleşirdi' tekrarı.
- **kısaltıldı:** „Gevezeliklerinden sıkılan annem, ablalarım, kız kardeşim, halam ve çocukları bile eski Mustafa Sefa'yı özlemişlerdi: geveze, her haltı bilen, her konuda bilgis…“ çıkarıldı — Geveze Sefa özlemi 72'de ve önceki cümlede var.
- **kısaltıldı:** „Önce bulunduğum yeri anlamaya çalıştım.“ çıkarıldı — Sonraki cümle bunu gösteriyor.
- **kısaltıldı:** „Yardım çağırmayı düşündüm ama seslenebilir miydim, emin değildim. Annem birkaç adım ötedeydi; onun yanına gitmekle kendi başıma kalkmaya çalışmak arasında, o a…“ çıkarıldı — Yardım çağırma ve koridor mesafesi birkaç cümle sonra tekrar.
- **kısaltıldı:** „; gittiğimiz doktor bunun yaşa bağlı işitme kaybı olduğunu söylemişti“ çıkarıldı — Fazla açıklama.
- **kısaltıldı:** „Üstelik devletim bir profesör aracılığıyla bana ulaşmış, beni muhatap almıştı. Benim gibi vatansever biri için bunun ne anlama geldiğini anlatamam.“ çıkarıldı — Devlete hizmet duygusu 272'de tekrar ediliyor.
- **kısaltıldı:** „Ben ona göre gençtim, çabuk toparlanırdım. Oysa böyle bir şeye tanık olsa bunu kolay atlatamazdı.“ çıkarıldı — Annenin bayılacağı cümlesinin tekrarı.
- **kısaltıldı:** „Ona cevap da veremedim.“ çıkarıldı — Hemen ardından cevap veriyor; çelişki.
- **kısaltıldı:** „Kendimi tuhaf bulmam bir şeydi; başkalarının da eski hâlimi aradığını duymak başka.“ çıkarıldı — Önceki cümlenin tekrarı.
- **kısaltıldı:** „ceylana döndüm: Onun yolculuğu beni nereye götürecek, nasıl bir hikâye çıkacaktı?“ → „ceylana döndüm.“ — Aynı soru paragrafın sonunda tekrar soruluyor.

#### DAKTİLO

- **kısaltıldı:** „Üstelik çayla ıslananları masanın başka bir yerine, kalorifer peteğinin üzerine sermiş.“ çıkarıldı — Dağınıklığı süsleyen ek ayrıntı; başka yerde geçmiyor.
- **kısaltıldı:** „Fincandaki acılık, elimdeki titremeden daha az dikkat çekiyordu.“ çıkarıldı — Titreme ve saklama sonraki cümlede zaten var.

#### TECRİT ODASI

- **kısaltıldı:** „Nasıl olsa acıkacaktım; açlığım zirveye ulaşmadan bir şeyler atıştırıp günü geçirirdim.“ çıkarıldı — Kahvaltı sahnesinden hemen sonra gereksiz ara not.

#### UNUTMA

- **kısaltıldı:** „Ama bazı şeyler tecrübeyle sabitti; devletin tecrübesi, iyi ya da kötü, tek tek insanların niyetinden daha genişti.“ çıkarıldı — Aforizma; sahneye bir şey katmıyor
- **kısaltıldı:** „Bu kadar selamı peş peşe duyunca hepsinin bana verildiğine inanmak istemedim; ama başımı kaldırdığımda selam verenlerin gözleri bir an üstümde kalıyordu. Ben d…“ çıkarıldı — Selam motifinin tekrarı
- **kısaltıldı:** „Onu içimden bir kez daha tebrik ettim.“ çıkarıldı — Sonraki övgüyle aynı düşünce
- **kısaltıldı:** „Yahu, anlamlı“ → „Anlamlı“ — Tik: Yahu
- **kısaltıldı:** „O an bunu yalnızca şifrenin şaşırtıcılığı sandım; en azından öyle düşündüm.“ çıkarıldı — Kendi içinde tekrar eden ihtiyat cümlesi
- **kısaltıldı:** „En iyisi diğer mektupları beklemek… Ama bunu fark ettiğimi anlarsa?“ çıkarıldı — Soru zincirini kısaltma
- **değiştirildi:** „Yahu, biliyorum.“ → „Biliyorum.“ — Tik: Yahu
- **kısaltıldı:** „Her seferinde benimle paylaşmanız gerekmiyor.“ çıkarıldı — Aynı uyarı 325 ve 327'de tekrar ediliyor
- **kısaltıldı:** „Ama her bulguyu benimle paylaşman gerekmiyor.“ çıkarıldı — Uyarının tekrarı; 327 en güçlü hâli
- **kısaltıldı:** „Sen de yazar ve editör olarak bu izole ortamda oku ve yaz.“ çıkarıldı — 327'deki 'Sadece oku ve yaz' ile aynı
- **kısaltıldı:** „Bu duyguyu çabucak üzerimden atıp yazma isteğimi kaybetmemeliydim.“ çıkarıldı — İç açıklama fazlası
- **kısaltıldı:** „Nazım Efendi kâğıtları uzatırken de mahcup görünmüştü.“ çıkarıldı — 338'deki mahcubiyetin tekrarı
- **yeniden kuruldu:** „Az önce bu yaşlı adama kâğıtları taşıma işini verdiği için Hakan Hoca'ya içimden hayıflanmıştım. Şimdi anladım: Hoca odayı benim için değiştirmişti; ama Nazım …“ → „Hakan Hoca odayı benim için değiştirmişti; ama Nazım Efendi'nin hatırasını silememişti.“ — 343'ün özeti ve aynı düşüncenin ikinci kez söylenişi çıkarıldı
- **kısaltıldı:** „Biraz önce bu adamı cahil diye küçümsemiştim. Oysa o, odanın bende henüz oluşmamış hafızasını benden iyi biliyordu.“ çıkarıldı — Sahneden hemen sonra açıklama; tek aforizma kalıyor
- **kısaltıldı:** „Tost çaydan önce bitti.“ çıkarıldı — Sahne dolgusu
- **kısaltıldı:** „Bazı kâğıtlar tel zımbayla birbirine tutturulmuştu; önce onları ayırdım.“ çıkarıldı — 370'teki zımbalı sayfa kararıyla çelişen tekrar
- **kısaltıldı:** „En çok merak ettiğim, başka şifreli sayfalar olup olmadığıydı.“ çıkarıldı — Aynı paragrafta 'başka bir şifre arıyordum' ile tekrar
- **kısaltıldı:** „; zihnimde açık bıraktığım dosyalar gibi, bakmadıkça orada olduklarını biliyordum.“ → „.“ — Fazladan benzetme
- **kısaltıldı:** „Evet, evren dedim: Güneş sistemi güneşe; atmosferdeki gazlar, iklim, toprak, hava, kök, gövde, yaprak ve çiçek meyveye…“ çıkarıldı — Ağaç listesinin tekrarı
- **kısaltıldı:** „Beşer, ten; beşeriyet de tenle ilgili değil miydi?“ çıkarıldı — Tekrarlayan soru
- **kısaltıldı:** „Zekâ bir yazılımsa, yazılım da bir işletim sistemi değil miydi?“ çıkarıldı — Tekrarlayan soru

#### AN

- **kısaltıldı:** „Üstelik ne kadar süreyle?“ çıkarıldı — Soru yığılması
- **kısaltıldı:** „Evet, hepsi geçmişte olmuş ve yaşanmış, bitmiş, mürekkep kurumuş“ → „Evet, mürekkep kurumuş“ — 404'teki 'hepsi yaşanmış ve bitmiştir' tekrarı

#### FİT NE?

- **kısaltıldı:** „ama Saygınlığım ve itibarım sonsuz değilmiş ama öyle sanıyordum.“ → „.“ — Bozuk ve tekrarlı yan cümle
- **kısaltıldı:** „Verdiğim bilgiler hem doğru hem şaşırtıcı hem de her biri, bir sonraki için iştah açıcıydı.“ çıkarıldı — 'İlmim üstüne ilim' ile aynı övünç
- **kısaltıldı:** „Birkaç saf öne geçtim, çünkü en arkada kalanlar da benim gibi sadece meraktan ilerliyorlardı kalabalığa doğru.“ çıkarıldı — 425'teki 'safları yararak' ile tekrar
- **kısaltıldı:** „anlat bir daha, anlat, muhkem anlat kahkahalarım“ → „anlat bir daha, kahkahalarım“ — 437'deki 'muhkem anlat' ile tekrar
- **kısaltıldı:** „Ruhu öyle rahatsız oldu ki yeni bineğinden, yetmezmiş gibi dört zıtlık ile kuşandırıldı.“ çıkarıldı — Paragraf sonundaki ruh/dört zıt cümlesiyle aynı
- **kısaltıldı:** „beni öldüreceksiniz, bilmediğim lisanlarla konuşup, pis planlarınızı mı uygulayacaksınız?“ → „beni öldüreceksiniz?“ — Soru yığılması
- **kısaltıldı:** „Sizin gücünüz bana yeter mi gafil?“ çıkarıldı — Soru yığılması
- **kısaltıldı:** „Bunu cennetin kapısında ismi yazılanın yolundan gidenlere karşı kullanacaksınız, iki ucu da“ → „Bu mızrağın iki ucu da“ — Mızrak kuralı tek yerde (463) anlatılsın
- **kısaltıldı:** „O soy çok kalabalık, kimi sizi dinleyecek kimi dinlemeyecek, cennet kapısında“ → „Cennet kapısında“ — 456'daki çoğalma bilgisinin tekrarı
- **kısaltıldı:** „Yoldan çıkardıklarınız ya da zaten yola hiç girmeyecek Âdem oğullarını bu silahla kuşandıracaksınız ama bu silahı onlar da kullanmayacaklar. Yani sizin ardınız…“ → „Sizin ardınızda saf tutanlar için değil bu silah.“ — Mızrak kuralının ikinci anlatımı kısaltıldı
- **silindi:** „“Bunu tekrar etmek zorundayım efendim, sakın ola ki unutmayın, bu sizi sevenlerle Allah’ı sevenlerin savaşmalarına sebep olmaktan çok Allah’a yönelenlerin kend…“ — Mızrak kuralının üçüncü tekrarı ('Bunu tekrar etmek zorundayım')
- **silindi:** „“Söz veriyorum, hadi söyle üstünde ne yazıyor?”“ — 469 silinince Şeytan iki kez arka arkaya konuşuyordu; söz 470'e taşındı
- **değiştirildi:** „Söyle adını işte“ → „Söz veriyorum! Söyle adını işte“ — 468'deki söz bu repliğe birleştirildi
- **kısaltıldı:** „ve en önemlisi aşklarını hatırlayacaklar“ çıkarıldı — Hemen ardından gelen 'Aşkı…' cevabını önceden söylüyor
- **kısaltıldı:** „Bir ara Kabil’e verecek gibi oldum mızrağı, babası ve kardeşi için kullanmasını istedim ama ne Âdem ne de Habil yanaşmadılar, hatta“ → „Hatta“ — Habil'in mızrağı tutmaması zaten söylendi

#### MUHİBBİ

- **silindi:** „İşte az önce yazdıklarım koridor boyunca odasına gidene kadar aklımdan geçen tonlarca sözün özetiydi.“ — 492'deki 'aklımdan geçen tonlarca şey'in özeti
- **değiştirildi:** „Yahu, ne oluyor“ → „Ne oluyor“ — Tik: Yahu
- **kısaltıldı:** „mektuplardan birinden, o da benim gördüğüm birinden benim adım çıktı, yazan adam“ → „yazan adam“ — 496'da söylenenin tekrarı
- **değiştirildi:** „Yahu niye kaçayım“ → „Niye kaçayım“ — Tik: Yahu
- **kısaltıldı:** „Öyle her markanın kahvesi de içilmezdi ki…“ çıkarıldı — Dolgu
- **kısaltıldı:** „ve hepsinin önünde de haliyle kâğıt bardakları vardı buna karşın“ → „, buna karşın“ — Aynı bilginin tekrarı
- **değiştirildi:** „Yahu, kahve bahanedir“ → „Kahve bahanedir“ — Tik: 516'da hemen önce 'Yahu mübarek'
- **kısaltıldı:** „, zira kemale eren diğerleri arasında yalın bir şekilde sırıtırdı“ çıkarıldı — Aynı imgenin tekrarı
- **kısaltıldı:** „Şehrin stresinde aklı korumak için bence de biçilmiş kaftandı.“ çıkarıldı — 'Mükemmeldi' cümlesinin tekrarı
- **kısaltıldı:** „ya da hayatta kalabilmek için madde dünyasında geçimini sağlamak…“ → „…“ — Aynı fikrin tekrarı

#### OKU

- **kısaltıldı:** „, hele daha yazarken düşünüyorum bu cümle üzerinde“ çıkarıldı — Dolgu
- **kısaltıldı:** „, dediğim gibi antrenman için biçilmiş kaftan lakin yeterli değil“ çıkarıldı — 545'teki antrenman fikrinin tekrarı
- **kısaltıldı:** „Aktarmak, aktarıcı olmak ötesinde bir yol ya da ufkum yok.“ çıkarıldı — Daktilo imgesinin tekrarı
- **kısaltıldı:** „Bu ciddi bir motivasyon istemez mi?“ çıkarıldı — Soru yığılması
- **kısaltıldı:** „, çünkü bazen yazan, yazan değildir yazdırılmıştır, bazen söyleyen, söyleyen değildir, söyletilmiştir, bilemem!“ → „.“ — 551'deki 'yazan ben değilim' fikrinin tekrarı
- **kısaltıldı:** „O konuşsun, ben sabahlara kadar dinleyeyim.“ çıkarıldı — 568 ve 576'da aynı istek
- **kısaltıldı:** „Bence kelimesi ile aynı manaya geliyor nasılsa hepsi.“ çıkarıldı — Açıklama fazlası
- **kısaltıldı:** „Sende başlayan senden ötürü değil, sence de öyle olmamalı.“ çıkarıldı — Kapalı, tekrar eden cümle
- **kısaltıldı:** „Yani biz kendimizi tanımaya, anlamaya bir ömür boyu çaba göstersek, ilimle de bilimle de bir yere kadar ilerleriz, ilerledikçe geride kaldığımızı, öğrendikçe b…“ çıkarıldı — 550'deki acizlik/bilmediğini bilme argümanının tekrarı
- **kısaltıldı:** „Kişisel olarak gelişmez, keşfeder insan ve bunu muhafaza eder.“ çıkarıldı — Keşif argümanının tekrarı
- **kısaltıldı:** „, hatta çok bilmiş hallerim vardır benim, bilgim olmayan konularda bile illa bir fikrim vardır“ çıkarıldı — Fazladan öz-nitelendirme
- **kısaltıldı:** „Ya da sınavdasın bir talebe olarak, bir sorunun cevabını hatırlamamak ne kadar üzücüyse, hatırlamak da o kadar keyiflidir.“ çıkarıldı — Hatırlama örneğinin ikincisi
- **kısaltıldı:** „İşte alim kişi hatırladıkça havsalası tatmin olur, keyif alır.“ çıkarıldı — Sonraki cümleyle aynı
- **kısaltıldı:** „Bunun sebepleri kadar sonuçları da vardır elbet.“ çıkarıldı — Dolgu
- **kısaltıldı:** „Alim olan Allah, yarattığı kullarının soracakları soruları zaten cevaplamıştır, kimi alim kulları bu soru ve cevaplardan keyif alan tebliğ edicilerdir, onların…“ çıkarıldı — Önceki iki cümlenin tekrarı

#### AŞK İLE

- **değiştirildi:** „sebep olurdu maazallah, bu eller“ → „sebep olurdu, bu eller“ — Aynı cümlede ikinci 'maazallah'
- **kısaltıldı:** „, her ana gibi o da isterdi ki oğullarım az nefes tüketsin çok yaşasın“ çıkarıldı — Az nefes/çok ömür fikrinin tekrarı
- **kısaltıldı:** „her şey bu kadar tamamken sadece eksik olmaktan kork, eksik olmamak için tamam olmak gerek madem,“ çıkarıldı — Eksik/tamam fikrinin tekrarı
- **kısaltıldı:** „ayrıca neden sanat demiştim, sanat niçin“ → „ayrıca sanat niçin“ — İç tekrar
- **kısaltıldı:** „Hayretler, gayretler, gayeler, mesleğe duyulan aşkın önemi ve daha birçok şey. Yaşananların bir açıklaması var, anlatılanların da… Yaşayan ve aktaran benim, aç…“ çıkarıldı — Özet; 553'teki 'nasibi olan buyursun' fikrinin tekrarı
- **kısaltıldı:** „aslında kulaklarım değil de beynimde demek daha doğru olurdu,“ çıkarıldı — Sonraki 'beyin uğultusu' imgesiyle aynı

#### GÜL KOKUSU

- **kısaltıldı:** „, normalde odada sevdiğim doğal ışık tonları anında bu renk ile boğuldular ama gül kokusunun nereden geldiğini bulmak için ortamın daha da aydınlanması gerekiy…“ → „.“ — Işığı açma gerekçesi iki kez; kokunun kaynağını arama sonraki cümlede var.
- **kısaltıldı:** „Bu arayışın bir adı vardı ama benim ilgimi çeken bu değildi.“ çıkarıldı — Muğlak ara cümle; sonraki „Kim yolcuymuş…“ aynı şeyi söylüyor.
- **kısaltıldı:** „Bunu yazan deli, beni iyi tanıyordu da ben onu bir iki satırla nasıl geçiştirmiş olabilirdim ki?“ çıkarıldı — Bir önceki cümlenin tekrarı.

#### HODRİ

- **kısaltıldı:** „Sanırım çay ocağını işleten hacı abinin söyleminden almıştım bu cesareti.“ çıkarıldı — „niyeyse“den sonra gereksiz açıklama.
- **kısaltıldı:** „, duymazdan gelenin kulakları, en sağlam ses geçirmez surlardan daha kalın duvarlara sahiptir, sözler gülle olsalar nafiledir iyi bilirim.“ → „.“ — Üst üste aforizma; ana fikir cümlede zaten var.
- **kısaltıldı:** „, duymuştum ama kendime gelemiyordum.“ → „.“ — „Sesini duymuş, uyanamamıştım“ tekrarı.
- **kısaltıldı:** „Ama bu defa durum farklıydı, diğer halüsinasyonlar gibi değildi bu seferinde.“ → „Ama bu defa durum farklıydı.“ — Aynı cümle içinde çift söyleyiş.
- **kısaltıldı:** „Bu olanlara anlam veremedim ama bunu asla umursamadım çünkü anlattıkları öyle bir uyuşturucuydu ki acımı silip atmakla kalmıyor, beni hafifletiyordu.“ çıkarıldı — „Yüküm hafifledi“ tekrarı.
- **kısaltıldı:** „Neyse çok sonları aklımca bir cevap bulmuştum; bütün o miskin, müptezel günlerimde, cami avlusunu çepeçevre saran rahmet belki beni de sarmıştı. Uyuyan bedenim…“ çıkarıldı — Açıklama kilitli 713'te (dualar, aminler) zaten veriliyor; erken tekrar.
- **kısaltıldı:** „İşte bundan dolayı yarım kalır bütün mecazi aşklar, aslında yarım kalmaz, yarımdır ve biz bunu birbirimize âşık olarak tamam etmeye çalışırız beyhude bir şekil…“ çıkarıldı — 703'teki yarım/mecazi aşk fikrinin tekrarı.
- **kısaltıldı:** „Allah bu sahte aşk acısı ile mecazen aşıkları ayırmaz, aslında kendine yaklaştırır ve maalesef pek azımız ona ulaşır eski dostum.“ çıkarıldı — Vaaz tekrarı; meczup/veli cümlesi kalıyor.
- **yeni bölüm:** „SOLUCAN“ bu paragrafla başlıyor: „Mektup, hiç bitmesin istesem de bitmişti. Ötesini berisini, işin sırrını çözme çabamı bir kenara bı…“ — Hodri'nin mektubu imzayla biter; anlatıcının öfke-nöbet-solucan krizi kendi bölümü olur.
- **kısaltıldı:** „Kan şekerim düşmüş, halim mecalim kalmamıştı.“ çıkarıldı — Hemen sonra „Düşen kan şekerim“ diye tekrar ediliyor.
- **kısaltıldı:** „Etrafımda bir şeyler dönüyordu ama niye dönsün ki?“ çıkarıldı — Kumpas sorusunun tekrarı.
- **kısaltıldı:** „ama olaylar sanki direkt benimle alakalı gibime geliyordu.“ → „.“ — Mahkeme imgesinden sonra gereksiz açıklama.
- **kısaltıldı:** „Suç olmayınca suçlu da olmuyor haliyle, suçun ve suçlunun olmadığı bir mahkeme ne anlam taşırdı ki?“ çıkarıldı — „Ortada tek bir eksik vardı; suç!“ yeterli; tekrar.
- **kısaltıldı:** „Tanımadığım bir delinin mektupları içinde ne ara benden bahsetmesine sıra gelmişti, anlam veremediğim bu anafordan çıkmakta niye bu kadar zorlanıyordum, sahi b…“ → „Sahi ben niye“ — Öfke monoloğunda tekrar eden sorular kısaltıldı.
- **kısaltıldı:** „Ne halt etmeye katlanıyorum bunca zahmete.“ çıkarıldı — „Niye bunların mücadelesi içindeyim“ ile aynı soru.
- **kısaltıldı:** „son birkaç aydır zaten kabuğuma çekilmiş ki bu kabuğuma çekilmiş halimin sebebini çözmek varken, hatta belki de benim bir tedaviye“ → „belki de bir tedaviye“ — Bilinen içe kapanmanın özeti; tekrar.
- **kısaltıldı:** „hasılı var oğlu varken,“ çıkarıldı — Dolgu.
- **kısaltıldı:** „Daha işim gücüm yok, bunlarla mı uğraşacağım.“ çıkarıldı — Aynı itirazın tekrarı.
- **kısaltıldı:** „Başta ailem, doktorlar, hademeler, öğrenciler, herkes ama herkes en başından beri sebebini bilmediğim şekilde gereksiz bir tuzağa çekiyorlar beni.“ çıkarıldı — Bir önceki „herkes kumpasta“ cümlesinin tekrarı.
- **kısaltıldı:** „Bu kadar mı önemli unvanlar, bu kadar mı aşağılık oldu insanlar.“ çıkarıldı — Unvan şikâyeti „Hocalar, üstatlar…“ ile kalıyor; tekrar.
- **kısaltıldı:** „Herkes birilerini bir yerlere konumlandırmak pahasına burada beni de vaktimi de saygımı da harcıyor, niye harcıyor bu insanlar beni, ne istiyorlar benden?“ çıkarıldı — Saygı/teveccüh şikâyetinin tekrarı.
- **kısaltıldı:** „Nasılsa onun ardına düşecek, başhekimlik odasından içeri girince aslında başhekim olduğunu Sefa anlayacak, “Aaa! Müthiş tevazulu, benimle yaşıt ama koca bir pr…“ çıkarıldı — Gizli kibir fikri önceki cümlede söylendi; açıklama tekrarı.
- **kısaltıldı:** „Hatta bir ara o mektupları yazan herifi bulup, ağzını burnunu kırmak da geçmişti içimden, peki ben ne yapmıştım?“ → „Peki ben ne yapmıştım?“ — Öfke hayallerinin üçüncü tekrarı.
- **kısaltıldı:** „İyi ki oturmuşum, tek şeyi doğru tahmin etmiştim, o da birazdan kendimden geçeceğimdi.“ çıkarıldı — Bir önceki cümlenin tekrarı.
- **kısaltıldı:** „Süresini bilmiyordum, çünkü bayılmanın“ → „Bayılmanın“ — „Süresini bilmediğim“ hemen önce söylendi.
- **silindi:** „“Uyandırmadım inşallah.”“ — Dolgu replik.
- **silindi:** „“Yok kardeş buyur.”“ — Dolgu replik.
- **silindi:** „“Yanına gelelim abi.”“ — Reddediş 730'da söylendi; tekrar.
- **silindi:** „“Emrah mesele gelmek gitmek değil, istemiyorum kardeş.”“ — Reddediş 730'da söylendi; tekrar.
- **kısaltıldı:** „Herkes, her şeyin farkında mıydı bilmiyordum ama gerçekten de umurumda değildi.“ çıkarıldı — „Umurumda değildi“ kalıbının tekrarı.
- **kısaltıldı:** „, bir şeyler ters gidiyordu, ruh halim karmaşık, zihnim bulanık, yetmezmiş gibi hiçbir şey yapmak istemiyordum.“ → „, ruh halim karmaşık, zihnim bulanıktı.“ — „İçimden gelmiyordu“ tekrarı; dikiş.
- **kısaltıldı:** „İnsanlar için emek verdim, en çok da yakınımda yöremde olanlar, kıymet verdiklerim, karşılığı neydi bunların, emek vermek yormuyor da insanı, alamadığı karşılı…“ çıkarıldı — Saygı şikâyeti öfke monoloğunda var; öz-hesap sözlerle başlıyor.
- **kısaltıldı:** „Mevcut ilminden keyif alan bir kişiye Alim denirdi ve henüz dünyada“ → „Henüz dünyada“ — Araya giren tanım; soru tek başına daha güçlü.
- **kısaltıldı:** „Allah’ım affet, senin sevgin, merhametinden mahrum olmak, dahası rızanı kazanmadan ölmek dehşet.“ çıkarıldı — Rıza korkusu 735'te ve sonraki cümlede var; „ömür sermayesi“ (bkz. 35) kalıyor.
- **kısaltıldı:** „Yahu, kâğıt“ → „Kâğıt“ — „Yahu“ tiki.
- **kısaltıldı:** „, düşünmekte bereket, tefekkürde rahmet vardır, üstelik düşünmek kapıyı açar“ → „, düşünmek kapıyı açar“ — Üst üste antitez; en güçlüsü (kapı) kalıyor.
- **kısaltıldı:** „Gerçeklik senin yorumundur ancak… Ve ancak hakikat algılarının üstünde olandır, sen gerçeği değil,“ → „Sen gerçeği değil,“ — Gerçek/hakikat ayrımı önceki cümlede söylendi; tekrar.

#### ON BİR

- **kısaltıldı:** „İşte insanı insana getiren şey bazen hikmetli bir söz, bazen de ağzındaki kekremsi tattır. Ölümü“ → „Ölümü“ — 765'teki „beden felsefeyi susturur“ fikrinin tekrarı.
- **kısaltıldı:** „Belki de iyi ki böyleydi. Yoksa iki güzel cümle kuran herkes, ayağının yerden kesildiğini sanıp kendini göklere yazardı. Ben de yazmıştım elbette; hem de yerde…“ çıkarıldı — Büyük sözler öz-eleştirisi önceki bölümde yapıldı; tekrar.
- **kısaltıldı:** „Musluktan akan suyun bir kısmı yüzümden lavaboya, bir kısmı dirseklerimden yere indi.“ çıkarıldı — İşlevsiz sahne ayrıntısı.
- **kısaltıldı:** „ve kahvaltıya indim.“ → „.“ — „Bahçeye indim“ 779'da; çift iniş.
- **silindi:** „İnsan bazen akıllı olduğunu kanıtlamak için öyle aptalca işler yapar ki deliler uzaktan izleyip mesleklerine hakaret edildiğini düşünürler.“ — Aforizma; 779 aynı düşünceyi işliyor.
- **kısaltıldı:** „Yahu düşünsenize, adam hastanenin içinde, başhekim bir üst katta, acil servis birkaç bina ötede ama o, “Beni bir ihtiyar kahvaltıda bekliyor” diye bayılma nöbe…“ → „Bunun“ — 777'deki „Normal bir insan doktora giderdi“nin tekrarı; „Yahu“.
- **kısaltıldı:** „Cimriliğe tedbir, korkaklığa temkin, kibre özgüven diyen de aynı insan değil mi?“ çıkarıldı — Üst üste antitez; kendi örnekleri yetiyor.
- **kısaltıldı:** „Ya da sevdiğin biri yalan söylese, sevgin yalanı doğru mu yapar?“ çıkarıldı — İkinci örnek; birincisi yetiyor.
- **kısaltıldı:** „Terazinin iki kefesine de kendi nefsimizi koyup adalet bekliyoruz.“ çıkarıldı — Bir önceki cümlenin imgeyle tekrarı.
- **kısaltıldı:** „Hakikat bunlardan birini seçip beni rahatlatmalıydı aklımca.“ çıkarıldı — Önceki cümlelerde söylendi.
- **kısaltıldı:** „Bulutken su, denizdeyken su, gözünden akarken yaş, alnından akarken ter, ağzından çıkarken sözün buharı… Adı değişiyor, hâli değişiyor, su nereye gitti sanıyor…“ çıkarıldı — 906'da aynı liste ve fikir (ad/kap) işleniyor.
- **kısaltıldı:** „Dar sorunun cevabı kolay olur, insanı da daraltır.“ çıkarıldı — Üst üste aforizma.
- **kısaltıldı:** „İnsan bazen kendisine anlatılmayan şeyi ne güzel işitiyordu.“ çıkarıldı — Önceki cümlenin aforizma tekrarı.
- **değiştirildi:** „Yahu sen benim sesimsin“ → „Sen benim sesimsin“ — „Yahu“ tiki.

#### KAYIT

- **kısaltıldı:** „İnsan, düşmemek için demire sarılınca bedenin ne kadar ikna edici bir gerçeklik olduğunu anlıyordu.“ çıkarıldı — Yerçekimi cümlesiyle aynı düşünce; güçlü olan kalsın.
- **kısaltıldı:** „; insan kendini en çaresiz hissettiği anda küçük bir şart koşunca hayatının iplerini hâlâ elinde tuttuğunu sanıyordu.“ → „.“ — Pazarlık cümlesinin ardından gelen açıklayıcı vecize.
- **kısaltıldı:** „Elimi kaldır dediğimde kalkacak, nefes al dediğimde alacak, geceleri uyuyacak, sabahları kaldıracak; biz onu“ → „Biz onu“ — Aynı düşüncenin uzatılmış sayımı kısaltıldı.
- **kısaltıldı:** „Hastanenin bütün pencereleri aynı karanlıkta değildi ama insan aradığı yüzü birinde bulamayınca hepsinin ışığı sönmüş gibi oluyordu.“ çıkarıldı — 'Cam karanlıktı' imgesini açıklayan fazla cümle.

#### HAKAN'IN DOSYASI

- **değiştirildi:** „Yahu bir profesöre“ → „Bir profesöre“ — 'Yahu' tiki.
- **kısaltıldı:** „Bu beni rahatlatmadı. Beni kandırdığını düşündüğüm insanın da kandığı ihtimali vardı artık.“ çıkarıldı — Aynı fikir sonraki bölüm açılışında işleniyor.

#### MIZRAĞIN İKİ UCU

- **kısaltıldı:** „Engin ufuklar boyu ilerlerken çepeçevre kızıl ışıkla sarılmıştı dört bir yanı.“ çıkarıldı — Kızıllık tasviri tekrarı.
- **kısaltıldı:** „Önce adımlarını hızlandırdı, ardından da olağanca gücüyle koşmaya başladı.“ çıkarıldı — Sahneyi yavaşlatan ara cümle.
- **kısaltıldı:** „Şeytan kalabalığı süzdü, elindeki kadehi kaldırdı ve ters çevirdi, sanılanın aksine içinden bir şey dökülmedi.“ çıkarıldı — İşlevsiz sahne ayrıntısı.
- **kısaltıldı:** „safları yararak, hani tabiri yerindeyse, yol açmak için önüne“ → „safları yararak, önüne“ — 'Yol açmak' tekrarı.
- **silindi:** „“Unutma Velhan tahtta kim oturuyor, haddini bil ve çatallı dilini ağzında tut, koparıvermeyeyim şuracıkta.”“ — Velhan atışması uzatması; olay örgüsüne katkısı yok.
- **silindi:** „Velhan mahcup bakışlar atıp şeytana, Hanzeb’i dinlemeye devam etti.“ — Velhan atışması uzatması.
- **kısaltıldı:** „Ne yaptın da onu yolundan saptırdın anlat evladım, anlat ki kardeşlerinin de keyfi yerine gelsin.“ çıkarıldı — Şeytan'ın 'anlat' çağrısı az önce yapıldı.
- **kısaltıldı:** „Onun yanında durmak, cehennemdeki buzdağlarının zirvesinde ayakta kalabilmek kadar zor ve kaygandı.“ çıkarıldı — Övünme tekrarı.
- **kısaltıldı:** „Rüyasının ne olduğunu öğrenmek için cinler gece gündüz çalıştılar, onlar da Musa generallerine orduları toplaması emrini verene kadar bilememişler.“ çıkarıldı — Yan ayrıntı; olay akışı değişmiyor.
- **silindi:** „“İşte gerçek bir vâris, işte gerçek bir plancı, işte gerçek bir öz tohum. Bu şeytani zekanın meyvesidir, bu benim oğlumdur.”“ — Şeytan'ın övgü tekrarı.
- **kısaltıldı:** „Ne kadar ince çalışırsa, o kadar iş bitirici, kalıcı olur, nefesi ve salyası ile kemirdiğini uyuşturan bir kemirgen gibi.“ çıkarıldı — İğne imgesini tekrar eden ikinci benzetme.
- **kısaltıldı:** „Bu kardeşiniz Hanzeb’in hırslı çalışması ile gerçekleşmiştir, şimdi devam et evladım.“ → „Şimdi devam et evladım.“ — Övgü tekrarı.
- **kısaltıldı:** „İşte bu şekilde Baura’ya ilk mızrak hamlesini yapma kararını vezir Balakt sayesinde becerdim.”“ çıkarıldı — Az önce anlatılanın özeti, övünme.
- **kısaltıldı:** „, diyarımızın kurdunu, kuşunu, kuzusunu bile seven kralımızın sevgi ve selamını katarak hediyelerimize geldik, bizi boş çevirmeyiniz. Yurdumuz“ → „. Yurdumuz“ — Dalkavukluk konuşması kısaltıldı.
- **kısaltıldı:** „efendim. Kralımız elbet düşünmüştür bunları, ancak kurdundan, kuzusuna, her kişiden mesuldür, kaldı ki koskoca Belam Baura bizim için de çok önemli bir şahsiye…“ → „efendim’“ — Vezir konuşmasında tekrar eden iltifat.
- **silindi:** „Hanzeb kalkmadan tahttan şeklini değiştirdi, dişlerinin arasından bir şeyleri çıkartmak için kirli tırnaklarını aralarında gezdirdi. Şeytan bu oğlunu çok seviy…“ — Sabırsızlık sahnesini önceden açıklayan anlatıcı yorumu.
- **değiştirildi:** „diğer ucu bekliyordu.”“ → „diğer ucu bekliyordu.“ — Kesilen ara sahne sonrası konuşma sürüyor.
- **silindi:** „Gözleri hafif dışa şehla, dili dışarı sarkan bir Zebani;“ — Mızrağın yeniden açıklandığı şaka sahnesi.
- **silindi:** „“Hangi mızrak, ben neyi kaçırdım” deyince şeytan da dahil herkes kahkaha attı;“ — Mızrağın yeniden açıklandığı şaka sahnesi.
- **silindi:** „“Hangi mızrak olacak? Çarpık, iki uçlu mızrak, hani adına fitne dediğimiz.”“ — Mızrak/fitne açıklamasının tekrarı.
- **silindi:** „“O mızrak mıydı? Ben onu çatal sanıyordum.”“ — Mızrak şakası.
- **silindi:** „Yine bir kahkaha tufanı koptu, ense köküne tokatlar yiyen zebani daha da sersemdi artık.“ — Mızrak şakası.
- **kısaltıldı:** „“Kadın elindeki, daha doğrusu aklındaki mızrağı öyle bir şevk ve azimle tuttu ki, babamız kızmasın bana ama onun yaptığı planları babam bile ancak yapardı. Der…“ → „Derken“ — Mızrak imgesi ve övünme tekrarı; konuşma kesintisiz sürüyor.
- **kısaltıldı:** „Asil, seçkin, mümtaz insanlardır.“ çıkarıldı — Sıfat yığını.
- **kısaltıldı:** „Halbuki sen de bilirsin, şu kavmin üç yüz beş senedir sana bakmıyorlar mı? Seni sevip, saymıyorlar mı?’“ → „’“ — Kadının az önce söylediği 'üç yüz beş yıl' tekrarı.
- **kısaltıldı:** „o kadar ağır giydirdim ki babacığım o andan beni görseydiniz, sabrıma, hırsıma…”“ → „o kadar ağır giydirdim ki…“ — Övünme tekrarı; anlatı sürüyor.
- **silindi:** „“Bana değil kardeşlerine anlat, sana ancak onlar hayran olur” diyerek şeytan oğluna haddini anında bildirdi.“ — Övünmeye verilen ara cevap.
- **değiştirildi:** „“Sonra, Baura“ → „Sonra, Baura“ — Konuşma kesintisiz sürüyor (tırnak düzeni).
- **kısaltıldı:** „Acaba gök yere mi çalınacak diye aklından geçirdi, sesin şiddetini duymamak için kulaklarını indirdi, gözlerini sımsıkı yumdu. Gözlerini aralama cesareti göste…“ → „Şeytan ve“ — Dehşet tasvirinde tekrar.
- **kısaltıldı:** „Şimdi bakınca göreceksiniz ki, içinizden bazılarınız eksiliyorlar.“ çıkarıldı — Mikail'in az önceki sözünün tekrarı.
- **kısaltıldı:** „Kadir Gecesi insana öğretildi, Hz. Muhammed (SAV) ve ümmeti onu kıyamete kadar kullanacaklar,“ çıkarıldı — 'İnsana Kadir ismi öğretildi' cümlesinin tekrarı.
- **kısaltıldı:** „Oğulların ile görüştürülen Hz. Muhammed onlara getirilen dini söyledi, onlara yedikleri helal hayvanların kemiklerini ikram edeceklerini, hatta oğullarının kul…“ çıkarıldı — Cinlerin Müslüman oluşu ikinci kez anlatılıyor; vaaz uzantısı.
- **kısaltıldı:** „Bu mukayese bile edilemezdi, değil ölümle bu başka hiçbir şerefle mukayese edilemezdi…“ çıkarıldı — Terazi imgesinin açıklamalı tekrarı.
- **kısaltıldı:** „Belli ki Belam Baura bir alimdi, sayılan, sevilen, diyarında itibar sahibi ve yine diyarın en güzel kadınına aşıktı.“ çıkarıldı — Okurun bildiği kıssanın özeti.
- **kısaltıldı:** „Her şey Allah için; savaşmak, yemek, içmek, bedenine bakmak dahi Allah için ya da Allah’a varmak için değilse beyhude. Şeytan ister ki onda olmayan kimsede olm…“ çıkarıldı — Vecize yığını; 'aşksız kalp kibirlenir' aynı fikri taşıyor.
- **kısaltıldı:** „Buraya kendimizi tanık etmeye geldik.“ çıkarıldı — 'Kendini şahit ettiğin köprü' cümlesinin tekrarı.
- **kısaltıldı:** „Dünyaya geliş amacımızı, içimizde olan potansiyel Allah aşkımızı, hangi aşkla hangi mabutla takas etmişiz ancak bu durum belirler.“ çıkarıldı — Denemenin özet cümlesi; vaaz tekrarı.
- **silindi:** „Emir ve yasaklara uy“ — Şiirin ikinci, öğüt veren kıtası; ilk kıtayı tekrarlıyor.
- **silindi:** „Hakk’dan gelen sözü duy“ — Şiirin ikinci, öğüt veren kıtası; ilk kıtayı tekrarlıyor.
- **silindi:** „Bedenin arzuladığı nefis huyudur“ — Şiirin ikinci, öğüt veren kıtası; ilk kıtayı tekrarlıyor.
- **silindi:** „Huyundan maada ruhunu doyur“ — Şiirin ikinci, öğüt veren kıtası; ilk kıtayı tekrarlıyor.
- **silindi:** „Kabrini nurla doldur“ — Şiirin ikinci, öğüt veren kıtası; ilk kıtayı tekrarlıyor.
- **silindi:** „Allah’ın istediği senden budur“ — Şiirin ikinci, öğüt veren kıtası; ilk kıtayı tekrarlıyor.

#### ŞEHRİN ÜÇ ŞAHİDİ

- **kısaltıldı:** „Hastanenin içinde tanımadığım birinin yazdığına inanınca irkiliyor, kendi elimden çıkınca geçiştiriyordum.“ çıkarıldı — Önceki ve sonraki soruyla aynı fikir.

#### SUSAYANIN YOLU

- **kısaltıldı:** „Evinden bu kadar uzağa gitmiş olması, başlarda onu ürkütmüş olsa da özgürleşmiş olması onda başka ufuklara henüz yelken açtırıyordu.“ çıkarıldı — Anlatıyı geciktiren açıklama.
- **kısaltıldı:** „Her dinde olduğu gibi Mecusilerde de temiz ahlak, yozlaşmış olmamak çok ama çok kıymetliydi.“ çıkarıldı — Genel açıklama.
- **kısaltıldı:** „ancak ateş, arama susuzluğuna yetmiyor, bilakis arttırıyordu, körük“ → „ancak körük“ — Aynı imge iki kez.
- **kısaltıldı:** „Nöbetlerini, çiftliklerindeki işleri aksatmayan genç Mabeh,“ → „Genç Mabeh,“ — Nöbet sadakati az önce söylendi.
- **kısaltıldı:** „Körük bu sefer babasının öfkesini körüklemişti, Hakk“ → „Hakk“ — Babanın öfkesi önceki cümlede verildi.
- **kısaltıldı:** „ve yeni piskoposa hayran olmuştur“ çıkarıldı — Sonraki tasvirle aynı.
- **kısaltıldı:** „Piskopostan izin isteyip yanında bir süre yaşadıktan sonra, piskopos“ → „Piskopos“ — Gereksiz ara adım.
- **kısaltıldı:** „İnsan susamaya görsün, içinde Hakk’ı arama ateşi yanmaya görsün…“ çıkarıldı — Anlatıyı bölen ünlem; susuzluk imgesi başka yerde var.
- **kısaltıldı:** „manastırdaki ibadet dolu günlerinde,“ çıkarıldı — Dolgu.
- **kısaltıldı:** „ancak bulmuş olsa da artık“ → „ancak artık“ — Tekrar.
- **kısaltıldı:** „Sonunda susadığı suya çok yaklaştığından emindir, sadece ona suyu getirecek olan ahir zaman peygamberini beklemektedir.“ çıkarıldı — Önceki 'emin olmuştur' cümlesinin tekrarı.
- **silindi:** „Belli ki haberi veren şahıs bu durumdan oldukça rahatsız olmuş, bunu dile getiriyordu.“ — Sahiplerin rahatsızlığı bedduayla zaten gösteriliyor.
- **kısaltıldı:** „Sahibi olan adam da diğeri gibi bu durumdan rahatsız olmuştu.“ çıkarıldı — Beddua cümlesi bunu gösteriyor.
- **kısaltıldı:** „Mabeh indiği ağaçtan hemen sonra sormuştu,“ → „Mabeh sormuştu,“ — Ağaçtan iniş önceki cümlede.
- **silindi:** „O dönemler kölelerin değil soru sormaları, konuşmaları bile yasaktı.“ — Sahnenin zaten gösterdiği açıklama.
- **kısaltıldı:** „Bu övgü dolu sözlerle yolculuğunu anlatmaya çalışan Mabeh’in sözlerini yanlış aktaran Yahudi, bir süre sonra“ → „Tercüman, bir süre sonra“ — Önceki cümlenin tekrarı.

#### MUHİBBİ'NİN SOFRASI

- **kısaltıldı:** „Bunları Muhibbi Amcaya olduğu gibi aktarmak, onunla bu konuda fikir alışverişinde bulunmak istiyordum. Hastane bahçesindeki büfeye çıktım, onu aradı gözlerim b…“ → „Büfede kendime bir çay söyledim,“ — Arama ve istişare niyeti açılışta ve sonraki paragrafta var.
- **kısaltıldı:** „aklı selim bir adamla durumu istişare edecektim, sonuçta benim medeniyeti“ → „medeniyeti“ — 'İstişare edecektim' tekrarı.
- **kısaltıldı:** „Yahu, ilk“ → „İlk“ — 'Yahu' tiki.
- **kısaltıldı:** „Mekke’de köle olarak doğan ve ömrünün bir kısmında ilk cümlesini bir duruşla Allah tektir diyen Bilal, gür ve güzel sesiyle ezanı ilk okuyan önemli bir sahabed…“ çıkarıldı — Aynı paragrafta söylenenlerin özeti.
- **kısaltıldı:** „Sadece kendi mutluluğuna odaklı, et yığınları arasında dolaşan, kendinden ve kendi ırkından başkasını alçak gören bir nesil var, hem de bütün dünyada.“ çıkarıldı — Medeniyet yakınmasının ikinci kez söylenişi.
- **kısaltıldı:** „Ancak kimin hakikati, senin mi benim mi, onların mı? Hakikat senin kimsenin ulaşamadığı yerde başlıyor.“ çıkarıldı — Sondaki 'herkesin hakikati kendine' ile aynı.

#### MIZRAĞIN İKİ UCU

- **kısaltıldı:** „Şeytan elini kaldırdı ve kalabalık susup dinlemeye başladı.“ çıkarıldı — Aynı jest birazdan tekrarlanıyor.
- **kısaltıldı:** „Vezir hızlıca düşünmeye, çözüm bulmaya çalıştı, oysa ben bunu çoktan planlamıştım, ben fısıldamaya“ → „Ben fısıldamaya“ — Övünme.
- **kısaltıldı:** „üç insan asrı boyunca çalışmalarımın ilk meyvesini almak için,“ çıkarıldı — 'Üç asır' övünmesinin tekrarı.
- **silindi:** „Hanzeb amacına ulaşmanın keyfiyle, derin bir iç çekip; ‘…Sonra’ dedikten sonra yine sustu bir süre ve devam etti sözlerine baygın gözleriyle bakarak diğerlerin…“ — Duraklama zaten '…Sonra' ile gösteriliyor.
- **kısaltıldı:** „aslında doğru duymuş, kendince biraz zaman kazanmış, aklında düşüncelerini ölçüp tartmıştı“ → „ölçüp tartmıştı“ — Dolgu.
- **kısaltıldı:** „‘Nefesimi tuttum o anda babacığım, acaba kadın ne diyecek’ diye.“ çıkarıldı — Hanzeb'in araya giren üçüncü övünme/tepkisi.
- **kısaltıldı:** „, çünkü olayları yaşayan oydu ve Allah buna şahitti“ çıkarıldı — Fazla açıklama.
- **kısaltıldı:** „‘Sen kim oluyorsun da beni dinlemiyorsun efsunlu merkep’ dedi yine dinletemeyince merkebini dövmeye başladı.”“ → „”“ — Dayak sahnesi Mikail'in sorusundan sonra anlatılıyor; tekrar.

#### SUSAYANIN YOLU

- **kısaltıldı:** „bunca sarıp sarmaladıkları çocuğun sağlığı açısından“ çıkarıldı — Dolgu.
- **kısaltıldı:** „Mevcut kast sisteminin hemen ilgi odağı olmuş, dönemin“ → „Dönemin“ — 'İlgi' tekrarı.

#### MUHİBBİ'NİN SOFRASI

- **kısaltıldı:** „O dönemde kölenin iyisi sahibinin yakınında duranlardı.“ çıkarıldı — Sonraki cümle aynı şeyi söylüyor.

#### MIZRAĞIN İKİ UCU

- **kısaltıldı:** „Bu sefer ışığı değil, sesleri takip etti.“ çıkarıldı — 'Bu sefer' formülü; uğultu zaten söylendi.
- **silindi:** „Yüzünü kalabalığa çevirdi, ağaç kütüğü gibi kalın, kaba parmağının ucunda kıvrılan tırnağıyla Hanzeb’i işaret ederek;“ — Sahne hareketi; konuşan Şeytan, bağlam açık.
- **silindi:** „Kalabalıktan çıt çıkmıyordu, Hanzeb tahta kurulup, yayılarak devam etti konuşmasına, seyrek kıllı çenesini yukarı dikti, kulağına parmağını sokup çevirdi, tırn…“ — Sahne hareketi (kulak pası vb.); Hanzeb'in konuşması kesintisiz sürüyor.
- **değiştirildi:** „“İşte kudretli“ → „İşte kudretli“ — Konuşma kesintisiz sürüyor (tırnak düzeni).
- **kısaltıldı:** „, bunu babanız şeytan çok iyi biliyor ama bilmediği bir şey var ki hepinizi birazdan hayretler içerisinde bırakacak.“ → „.“ — Mikail'in 'birazdan şahit olun' sözünün tekrarı.
- **kısaltıldı:** „Biri birine ya da bir şeye aşık ise ve o âşık olduğu onu Allah’a taşımıyorsa, sırtında amaçsızca taş taşıyan hamaldan ne farkı vardır.“ çıkarıldı — Vecize yığını; önceki paragraf aynı soruyu cevaplıyor.

#### SUSAYANIN YOLU

- **kısaltıldı:** „defnettikten hemen sonra vakit kaybetmeden,“ → „defnettikten sonra,“ — Dolgu.
- **kısaltıldı:** „Yesrib’e bir köle olarak götürülüp satılan Mabeh“ → „Yesrib’e götürülen Mabeh“ — 'Köle/satılmak' tekrarı.
- **kısaltıldı:** „, ondan hiçbir ücret istemeden, onunla sırf Müslüman kardeşi oldukları için destek görmüştü.“ → „.“ — Sahabenin yardımı önceki cümlede anlatıldı.

#### MEKTUBU KİM YAZDI?

- **kısaltıldı:** „bu defa mektuba“ → „mektuba“ — “Bu defa” kalıbı
- **kısaltıldı:** „Hele değiştirince cümle daha tanıdık geliyorsa!“ çıkarıldı — Üst üste aforizma, düşünce zaten 1351'de
- **kısaltıldı:** „Birini cevaplamayınca ötekinden vazgeçmem gerekmiyordu. Fakat ikisini birbirinin yerine de koyamazdım.“ çıkarıldı — Antitez zinciri kısaltıldı

#### KÂĞIDIN ÖTE YANI

- **kısaltıldı:** „Bu defa konuyu kapatmak için söylememiştim.“ çıkarıldı — “Bu defa” kalıbı, gereksiz açıklama
- **kısaltıldı:** „Bu defa ona dönüp“ → „Ona dönüp“ — “Bu defa” kalıbı

#### ANNEMİN SESİ

- **kısaltıldı:** „Benim korktuğum şeyler de vardı onun içinde, yalnız tek işi onlar değildi.“ çıkarıldı — 1406'daki tespitin tekrarı
- **kısaltıldı:** „Demek ki bir insanın görmediği şeyi anlatmak başka, fark etmediğini sanmak başkaydı.“ çıkarıldı — Formül antitez; sonraki cümleler yeterli
- **kısaltıldı:** „Bu defa bilmediğimi“ → „Bilmediğimi“ — “Bu defa” kalıbı

#### SUSUZLUK

- **kısaltıldı:** „Bu defa beni“ → „Beni“ — “Bu defa” kalıbı
- **kısaltıldı:** „İnsan her kelimeyi bilse de ihtiyacı olduğu anda çağırabilecek miydi?“ çıkarıldı — Önceki cümleyi tekrarlayan aforizma
- **silindi:** „Gece annem evden birkaç eşya getirmek için çıkarken telefonunu erişebileceğim yere bıraktı; sonra kendi telefonunu bırakırsa yoldayken ona nasıl ulaşacağımı fa…“ — Dolgu sahne; gülüş 1457'de zaten var
- **kısaltıldı:** „İlk defa bir kâğıttaki saati şifreye çevirmedim.“ çıkarıldı — 1706'daki “ilk defa… şifre” ile mükerrer
- **değiştirildi:** „Vildan Hanım bu kez saatini“ → „Vildan Hanım saatini“ — “Bu kez” kalıbı
- **değiştirildi:** „; bu defa hemen deftere değil“ → „, hemen deftere değil“ — “Bu defa” kalıbı

#### MUHİBBİ YOK

- **kısaltıldı:** „Anneme haber vermek için telefonu çıkaracak oldum; vazgeçtim. Önce ne diyeceğimi kendim duymak istiyordum.“ çıkarıldı — 1460'taki “önce kendim konuşmak” tekrarı

#### HAKİKAT MEDENİ

- **değiştirildi:** „adı bu defa sahibinin“ → „adı sahibinin“ — “Bu defa” kalıbı
- **kısaltıldı:** „İnsan yardım istemeye gelince bile karşısındakine hemen yüz vermemeyi bir meziyet sanıyor.“ çıkarıldı — “İnsan … sanıyor” aforizma tiki
- **kısaltıldı:** „Hakan'la konuşmaktan vazgeçmemiştim. Yalnız önce annemi bekleyecektim.“ çıkarıldı — Sahnenin gösterdiğini tekrar ediyor
- **kısaltıldı:** „Bu defa annem yanımdaydı çünkü onu ben aramıştım; burada ne konuşulduğunu henüz bilmiyordu.“ çıkarıldı — Bilinen durumun özeti; 1536 yeterli
- **kısaltıldı:** „İnsan kendi adını söyleyemeyecek kadar korkarken annesinin elini de yanlış anlayabiliyordu.“ çıkarıldı — Jesti açıklayan aforizma

#### BOŞ SIRA

- **kısaltıldı:** „Bir şeyi taşımayı birbirimize bırakabiliyorduk; neye bakacağımızı değil.“ çıkarıldı — Formül antitez
- **kısaltıldı:** „Bu defa ekrandaki“ → „Ekrandaki“ — “Bu defa” kalıbı
- **kısaltıldı:** „Öğrenciler bir örnek verdiğimi mi sanmışlardı da kimsenin sesi çıkmamıştı?“ çıkarıldı — Önceki cümle ve 1576 ile mükerrer soru

#### AYNI EL

- **kısaltıldı:** „İşte az önce aklımdan geçen de buydu: Boğuluyordum ve öğrencilerden kimse bunun farkında değildi.“ çıkarıldı — 1571'deki sihirbaz imgesinin tekrarı
- **kısaltıldı:** „Bu defa anneme“ → „Anneme“ — “Bu defa” kalıbı
- **kısaltıldı:** „İlk günkü kadar kolay olmadı bu; kolay olmadığı halde yapılabildi.“ çıkarıldı — Dolgu aforizma
- **kısaltıldı:** „Bu defa bakışımı“ → „Bakışımı“ — “Bu defa” kalıbı

#### HAKAN'IN CEVABI

- **kısaltıldı:** „Fakat bilmekle kendi sabahına kabul etmek arasında bir gece değil, koca bir ömür duruyordu.“ çıkarıldı — Formül antitez; 1619 bunu gösteriyor
- **kısaltıldı:** „Bu defa Muhibbi'nin“ → „Muhibbi'nin“ — “Bu defa” kalıbı
- **kısaltıldı:** „Ben de bu defa ona“ → „Ben de ona“ — “Bu defa” kalıbı
- **değiştirildi:** „yere bu kez gelebilmiştim“ → „yere gelebilmiştim“ — “Bu kez” kalıbı
- **kısaltıldı:** „Ömrümün geri kalanı bir cümleyle düzene girmedi.“ çıkarıldı — Olumsuzlama üçlemesi ikiye indirildi

#### VİLDAN'IN GÖRDÜĞÜ

- **kısaltıldı:** „Bu kez gülmeyişini yanlış anladığımı düşünmedim.“ çıkarıldı — “Bu kez” kalıbı, gereksiz yorum
- **kısaltıldı:** „açtığında annem yanımdaydı. Bu defa cümlelerin“ → „açtığında cümlelerin“ — Annenin varlığı 1688'de var; “Bu defa” kalıbı
- **kısaltıldı:** „Kimse benden bu iki şeyi aynı dosyaya koymamı istemedi.“ çıkarıldı — 1695'teki kararın tekrarı

#### ÜÇ VURUŞ

- **kısaltıldı:** „Bu defa kayıttaki“ → „Kayıttaki“ — “Bu defa” kalıbı
- **kısaltıldı:** „Birini bulmuş olmak, ötekini de bulmuşum gibi davranmama izin vermiyordu.“ çıkarıldı — Önceki cümlenin tekrarı; not 1714'te
- **kısaltıldı:** „Dünya da o sırada yerinden oynamadı. Belki değişen dünya değildi; ben, bir sesin nerede bittiğini ve ona verdiğim anlamın nerede başladığını ilk kez ayırmaya ç…“ çıkarıldı — 1698/1713/1714'teki tespitin tekrarı

#### İÇERİDEKİ YAZAR

- **kısaltıldı:** „O ikisini de yapmadı.“ çıkarıldı — Dolgu
- **kısaltıldı:** „Herkes kendi hayatının merkezindeydi. Onların sırları, korkuları ve alışkanlıkları vardı.“ çıkarıldı — 1737'de aynı düşünce
- **kısaltıldı:** „Bir romanın kapısını ben açtım diye içindeki herkesin üzerine hüküm veremezdim.“ çıkarıldı — Önceki cümlenin tekrarı
- **kısaltıldı:** „Bu defa kendimi“ → „Kendimi“ — “Bu defa” kalıbı
- **kısaltıldı:** „Görmekle doğrulamak arasındaki çizgiyi unutmadım.“ çıkarıldı — Sonraki cümleler aynı ayrımı somutluyor

#### ŞAHİT

- **değiştirildi:** „Bu kez bir mektubun“ → „Bir mektubun“ — “Bu kez” kalıbı

#### SU

- **kısaltıldı:** „Bir insanın toparlanması alkış isteyen bir sahne değildi.“ çıkarıldı — Önceki cümleyi tekrarlayan aforizma

### Editör müdahaleleri (jüri önerileri, lektör notları)


#### MUHİBBİ'NİN SOFRASI

- **değiştirildi:** „ne demiş Şems Tebrizi; ‘Rava kalbi an Rabbi’“ → „ne demiş erenler; ‘Rava kalbi an Rabbi’“ — Söz geleneksel olarak Şems'e değil, Bâyezîd/İbn Arabî çizgisine („haddesenî kalbî an Rabbî“) bağlanır; Muhibbi'nin ağzında „erenler“ doğru ve doğal (jüri önerisi).

#### ÜÇ VURUŞ

- **değiştirildi:** „Sonuna bir soru işareti koydum. Kâğıdı anneme gösterdim.“ → „Sonuna bir soru işareti koydum. Ekranı anneme gösterdim.“ — Not telefona yazılıyor; anneye gösterilen „kâğıt“ değil, ekran (jüri ve lektör notu).

### Bağımsız kontrol sonrası dikiş düzeltmeleri


#### TECRİT ODASI

- **değiştirildi:** „Bu riski almaya değerdi.“ → „Bu işin riskini almaya değerdi.“ — „Bu risk“ silinen şüpheye işaret ediyordu; şüphe (öncülü erkenden boşaltan cümle, jüri) geri getirilmedi, risk işin kendisine bağlandı.

#### MIZRAĞIN İKİ UCU

- **değiştirildi:** „ona ve eşine büyük hürmet gösterirler.”“ → „ona ve eşine büyük hürmet gösterirler. Ne yaptın da onu yolundan saptırdın anlat evladım.”“ — Şeytan'ın sorusu silinince [1155]'i kimin söylediği belirsizleşti ve Hanzeb'in [1156]'daki cevabı silinmiş soruya cevap veriyor; eski cümlenin ilk yarısı geri kondu

#### SUSAYANIN YOLU

- **değiştirildi:** „neredeyse düşecekti.“ → „neredeyse düşecekti. Sahibi olan adam bu durumdan rahatsız olmuştu.“ — Rahatsızlık cümleleri silinince sonraki “Allah Kayleoğulları’nın belasını versin.” satırı Mabeh'e ait okunuyor; sahibin tepkisi (eski cümle, 'da diğeri gibi' olmadan) geri kondu


## C. YOLCU – Sıkılaştırma

Toplam 326 işlem.

**Toplam:** 44.749 → 40.669 kelime (-4.080; -9.1 %)

| Bölüm | Önce | Sonra | Fark |
|---|---:|---:|---:|
| (Ön kısım) | 1 | 1 | +0 |
| 1453 — UYANIŞIN BEDELİ | 17 | 17 | +0 |
| DİKKAT | 341 | 341 | +0 |
| 1. Sonmuş Gibi Sıradan Bir Sabah | 1586 | 1512 | -74 |
| 2. Siyah Paket | 1400 | 1339 | -61 |
| 3. Kamera Boşluğu | 501 | 497 | -4 |
| 4. Sahte Görüntü, Gerçek Yas | 701 | 667 | -34 |
| 5. Bir Tanının Geldiği Yer | 2973 | 2222 | -751 |
| 7. Silinen Satır | 843 | 790 | -53 |
| 8. İki Kötü Seçenek | 486 | 464 | -22 |
| 9. Bölgesel Bir İmparatorluk | 985 | 938 | -47 |
| 11. Emanetin Peşindeki Karga | 1028 | 992 | -36 |
| 12. Yedi Yıl Önce Çaldığım Kapı | 2153 | 1967 | -186 |
| 13. Bedenin İtirazı | 1074 | 1023 | -51 |
| 15. Nüshaların Söylemediği | 723 | 705 | -18 |
| 16. Görmek ile Yetişmek Arasındaki Mesafe | 588 | 572 | -16 |
| 17. Ormanda Beceri, Şehirde Belirti | 1802 | 1501 | -301 |
| 18. Birincil Ayna | 293 | 256 | -37 |
| 20. İnanmayan İlk Kişi | 1818 | 1561 | -257 |
| 21. Bir Hata, İki Kız Kardeş | 837 | 804 | -33 |
| 22. On Bir Saniyenin İçindeki Ses | 332 | 333 | +1 |
| 23. Silah Olmayan Ses | 710 | 694 | -16 |
| 24. Yusuf'un Dili | 495 | 495 | +0 |
| 25. Unuttuğumu Ateş Seçti | 827 | 795 | -32 |
| 26. Aynı Yöntemin Farklı Logoları | 1436 | 1181 | -255 |
| 28. Bir Gün Daha Yaşamak | 352 | 333 | -19 |
| 29. Trenin İçindeki Ben | 325 | 325 | +0 |
| 30. Yüzümün Benden Habersiz Hayatı | 1072 | 1002 | -70 |
| 31. Lambaları Yanan Boş Kat | 840 | 806 | -34 |
| 32. Leyla'nın Son Kaynağı | 462 | 462 | +0 |
| 34. Unutulmuş Dükkânın Anahtarı | 645 | 606 | -39 |
| 35. Kızımın Dosyası | 1456 | 1330 | -126 |
| 36. İki Ayrı Gelecek | 943 | 906 | -37 |
| 37. Görünmeyen Kameranın Gördüğü | 529 | 519 | -10 |
| 38. Adı Hastalık Olan Yetenek | 1689 | 1255 | -434 |
| 39. ŞAMAN | 544 | 523 | -21 |
| 40. Yusuf Olmadan Önce | 2596 | 2225 | -371 |
| 42. Labirentin Emanetleri | 883 | 872 | -11 |
| 43. Başlangıç Sensin | 961 | 944 | -17 |
| 44. Bedenin Bildiği Tarih | 419 | 418 | -1 |
| 45. Beni Öldürmeyen Adam | 2263 | 1909 | -354 |
| 46. Son Olabilecek Şeyler | 988 | 902 | -86 |
| 47. Son Olduğunu Bilmeden | 1462 | 1272 | -190 |
| 48. Saat 14.53 | 296 | 296 | +0 |
| 49. Geride Kalanlar | 739 | 790 | +51 |
| 50. Boş Bırakılan Son Cümle | 1335 | 1307 | -28 |

### Sıkılaştırma (altı lektör bloğu)


#### 1. Sonmuş Gibi Sıradan Bir Sabah

- **kısaltıldı:** „Bir yeri aratamaz, bir dosyayı açtıramaz, kimseyi sorgulayamazdım.“ çıkarıldı — Yetkisizlik bir önceki cümlede zaten söylendi
- **kısaltıldı:** „Çocuklar, yetişkinlerin sakladığı gerçeği çoğu zaman bilmez; ama saklama biçimlerini ezberler.“ çıkarıldı — Sahne sonrası aforizma
- **silindi:** „Emir doğduğunda daha sakin olduğumu sandım. Bu kez nefesini kontrol etmedim; yalnız bebek telsizinin frekansını komşunun cihazıyla karışmasın diye değiştirdim,…“ — Duru doğumundaki korku-görev esprisinin tekrarı
- **silindi:** „Bazen bir çocuğun senden aldığı en güçlü yetenek, sana karşı kullandığı yetenektir.“ — Sahneyi açıklayan aforizma

#### 2. Siyah Paket

- **kısaltıldı:** „Bunu eski bir inançtan mı, kendi annesinden mi, kapının tahtasını korumak için mi söylediğini hiçbir zaman öğrenemedim.“ çıkarıldı — Eşik fikrine bir şey katmayan ek
- **silindi:** „İnsan hayatının yönünü değiştirecek bir kitabın karşısında bile yoğurdu unutmuyorsa ya çok olgundur ya da daha önce yeterince bozuk süt içmiştir. Ben ikincisiy…“ — Yoğurt esprisini açıklayan genelleme
- **kısaltıldı:** „Bir soruyu yarım dinleyip cevabın sonuna atladıysan saygısızsındır.“ çıkarıldı — Yığılmış antitezlerden biri azaltıldı
- **silindi:** „Çünkü bazen bir çocuğun doğru çıkması, yetişkinin kurduğu düzeni düzeltmez; bozar.“ — Bir sonraki paragrafta tekrar edilen aforizma
- **kısaltıldı:** „İnsanın tehlikeli bir fikre inanması için o fikrin bütünüyle yalan olması gerekmez. Hatta bütünüyle yalanlar çabuk yorulur.“ çıkarıldı — Aynı düşünce; en güçlü cümle kaldı

#### 3. Kamera Boşluğu

- **kısaltıldı:** „Hayata dair planım vardı.“ çıkarıldı — Önceki cümlelerin özeti

#### 4. Sahte Görüntü, Gerçek Yas

- **kısaltıldı:** „Leyla'nın bedeninin üç gündür sessiz kaldığını yalnız o sabah öğrenmişti ve Nehir, ilk şokunu“ → „Nehir ilk şokunu“ — Önceki bölümde verilen bilginin tekrarı
- **kısaltıldı:** „Bir insan beni kurtarmaya çalıştığında, önce yöntemini eleştirme huyum vardı.“ çıkarıldı — Benzetmenin zaten gösterdiği açıklama
- **kısaltıldı:** „Bunu başka biri fark etmeyebilirdi. Ben fark ettim.“ çıkarıldı — Sonraki cümlede söylenen gözlem tekrarı
- **kısaltıldı:** „Empatiyi kalpten önce kaslarda okuyordum.“ çıkarıldı — Aynı fikrin üçüncü söylenişi

#### 5. Bir Tanının Geldiği Yer

- **kısaltıldı:** „O satır o anda aklıma takılmış; kitaba yeniden erişmem ancak daha sonra adli görüntü üzerinden mümkün olmuştu.“ çıkarıldı — Kırk ikinci sayfa bilgisi 550'de yineleniyor
- **kısaltıldı:** „Birincisi sabit, ikincisi kesik, üçüncüsü arada bir incelen bir ses çıkarıyordu.“ çıkarıldı — Duyusal ayrıntı fazlası
- **kısaltıldı:** „Bir doktor onu on beş dakikada tanımlamadı.“ çıkarıldı — 'Aylar aldı' cümlesinin tekrarı
- **silindi:** „Bir konu ilgisini çektiğinde çevresini unutur muydu?“ — Soru listesi 1. bölümde (137) zaten verildi
- **silindi:** „Ses, ışık, koku ya da dokunma günlük yaşamını zorlaştırır mıydı?“ — Soru listesi 1. bölümde (137) zaten verildi
- **silindi:** „Çocukken sık sık eşyalarını kaybeder miydi?“ — Soru listesi 1. bölümde (137) zaten verildi
- **silindi:** „İnsan bazen yirmi yıllık bir ilişkinin bütün tartışmalarını tek bakışta yeniden yaşar. Unuttuğum faturalar, yarım bıraktığım dolap, üç gece uyumadan bitirdiğim…“ — Evlilik yükleri 1. bölümde (104) anlatıldı
- **silindi:** „Aradaki fark küçücük görünüyordu. Bir uçurum kadar derindi.“ — Diyaloğu açıklayan antitez
- **kısaltıldı:** „Okul, önerilen düzenlemelerin hepsini hemen kabul etmedi. Sınav için daha sessiz oda istendiğinde bir öğretmen bunun “ayrıcalık” olacağını söyledi. Zeynep, göz…“ çıkarıldı — Okul düzenlemesi ara sahnesi; olay örgüsüne bağlanmıyor
- **silindi:** „“İşe yaradı mı?” diye sordum.“ — Kulaklık sahnesinde ikinci 'susma' anı; 493-495 yeterli
- **silindi:** „“Evet.”“ — Kulaklık sahnesinde ikinci 'susma' anı; 493-495 yeterli
- **silindi:** „“O zaman onların aptallığı yüzünden—”“ — Kulaklık sahnesinde ikinci 'susma' anı; 493-495 yeterli
- **silindi:** „Zeynep elimle ağzımın arasına bakarak cümleyi durdurdu. Duru çözüm istemiyordu. Küçük düşürülmenin canını acıttığını söylemek istiyordu.“ — Kulaklık sahnesinde ikinci 'susma' anı; 493-495 yeterli
- **silindi:** „Yetenek ve zorluk ayrı kişiler değildi. Aynı kızın aynı kulağında yaşıyordu.“ — Sahnenin gösterdiğini açıklayan aforizma
- **silindi:** „Yine de kendi değerlendirmemi erteledim. Kızımın sürecini kendime çevirmekten utandığımı söyledim. Gerçekte, raporda kendimi bulursam geçmişte yaptığım hatalar…“ — Erteleme 502'de gösteriliyor; açıklama 1. bölümde (105) var
- **kısaltıldı:** „İlk üç ay randevu aradım. Sonraki iki ay bulduğum randevunun saatini değiştirdim.“ çıkarıldı — Erteleme esprisi kısaltıldı
- **silindi:** „Testlerden birinde ekranda beliren harflere basmam gerekiyordu. İlk dakikalarda kusursuzdum. Sonra klimanın pervanesinde hafif bir dengesizlik duydum. Her yedi…“ — Klik sahnesiyle aynı dikkat örneğinin tekrarı
- **değiştirildi:** „Başka bir testte“ → „Bir testte“ — 505 silindiği için dikiş
- **kısaltıldı:** „Uzman, bunların birbirini bazen sakladığını, bazen büyüttüğünü anlattı.“ çıkarıldı — Sonraki iki cümlenin özeti
- **kısaltıldı:** „İlaç dikkatimi toplamış, fakat hangi dikkati toplamam gerektiğini hâlâ bana bırakmıştı.“ çıkarıldı — Espriyi açıklayan cümle
- **kısaltıldı:** „Faturayı son gün değil, geldiği gün ödedim. Bir toplantının sonuna kadar sandalyede kaldım.“ çıkarıldı — Faydaların örnekleri; 517'de zaten gösterildi
- **kısaltıldı:** „Uyku, kafein, yemek ve stres kaydı tuttum.“ çıkarıldı — Tıbbi ayrıntı fazlası
- **silindi:** „“Otizm ve DEHB birlikteyse ilaçlar zaten işe yaramıyormuş,” dedim son kontrolde. İnternette bulduğum kesin cümlelerden birini masaya koymuştum.“ — Tıbbi tartışma fazlası; hekimin ana cümleleri 531'de
- **silindi:** „Hekim dosyayı kapattı. “Bu kadar kesin değil. Çocuklarda yanıt ve tolerans daha değişken olabilir. Yetişkinlerde veri sınırlı; bir karşılaştırmalı çalışmada ik…“ — Çalışma ayrıntısı; sonra kullanılmıyor
- **silindi:** „“Amerika bu konuda Avrupa'dan ileride değil mi?”“ — Amerika-Avrupa tartışması; sonra kullanılmıyor
- **silindi:** „“Ülkelerin onayları, reçete alışkanlıkları ve sağlık sistemleri farklı. Bir yerde daha çok ilaç kullanılması, o yerin insan zihnini kesin çözdüğü anlamına gelm…“ — Amerika-Avrupa tartışması; sonra kullanılmıyor
- **değiştirildi:** „“Ya ilaç beni sıradanlaştırıyorsa?”“ → „“Ya ilaç beni sıradanlaştırıyorsa?” diye sordum son kontrolde.“ — 526 silindiği için dikiş
- **kısaltıldı:** „Bir tedavi dikkatinizi artırırken hayatınızda değer verdiğiniz bir şeyi dayanılmaz ölçüde azaltıyorsa bunu söylersiniz; doz, tür veya yöntem yeniden değerlendi…“ çıkarıldı — Tıbbi prosedür; 525'te gösterildi
- **silindi:** „Bu yüzden ilaç kullanmıyordum. İlaca karşı olduğum için değil. Benim denediğim biçimi, hayatımın o döneminde, yararıyla bedeli arasında bana uygun bir denge ku…“ — İlacı bırakma 525'te anlatıldı; tekrar
- **kısaltıldı:** „Bir tiyatronun oyuncuları gitmiş, ben ışıkları söndürmek için içeride seyirci kalıp kalmadığına bakıyordum. Bakmaya çalışan da içerideydi.“ çıkarıldı — 'Dinleyen vardı' imgesini yineleyen benzetme
- **kısaltıldı:** „İnsan birine iki günde okuyacağını söyleyince takvim bazen doğrudan arkeolojiye dönüşüyordu.“ çıkarıldı — Ara espri; tempo
- **kısaltıldı:** „Yalanın en dayanıklı türü, gerçeğin size ait parçasını çalıp geri kalanını kendi yazdığı hikâyeyle doldurandı.“ çıkarıldı — Aynı fikir 2. bölümde (270) var
- **silindi:** „Geçmişi hatırlamak artık yalnız kendimi anlamak değildi. Birinin beni hangi kapıdan izlediğini bulmaktı.“ — Sahneyi özetleyen antitez
- **kısaltıldı:** „Sonra internetten bulduğum her bilgiyi kendime uyguladım. Bir hafta içinde çocukluğumdaki bütün anıları yeni tanının deliline çevirdim.“ çıkarıldı — Leyla'yla konuşmada (580) tekrar ediliyor
- **kısaltıldı:** „Mikrofon kesilince sesimi yükselterek devam etmem, bugün bile arkadaş ortamında anlatılan kısmıdır. Ben o gün komik bulmamıştım.“ çıkarıldı — Anekdot kısaltıldı
- **kısaltıldı:** „İnsan bana hayran olduğunda ne söyleyeceğini tahmin edebiliyordum. Karşı çıktığında merak ediyordum.“ çıkarıldı — Önceki iki cümleyi açıklıyor
- **kısaltıldı:** „Tanının destek ve dil sağlayabileceğini, fakat insanın bütün öfkesini, sevgisini, hatasını ve ahlakını açıklayamayacağını söyledi.“ çıkarıldı — Az önceki diyaloğun özeti
- **kısaltıldı:** „O vaka bilgilerini korur, isim vermeden insanların zihinlerini hangi koşullarda daha iyi kullandığını anlatırdı.“ çıkarıldı — Dinamik son cümlede zaten veriliyor
- **silindi:** „Salondakiler güldü. Ben sinirlendim. Sonra katılımcılardan biri, tanının hayatını kurtardığını; ilaç, düzenleme ve terapi olmadan işini kaybedeceğini anlattı. …“ — Atölye tartışması kısaltıldı; yeni açılış cümlesi kaldı
- **silindi:** „Molada Leyla bana su verdi.“ — Atölye tartışması kısaltıldı; yeni açılış cümlesi kaldı
- **silindi:** „“Beni insanların önünde düzelttin.”“ — Atölye tartışması kısaltıldı; yeni açılış cümlesi kaldı
- **silindi:** „“İnsanların önünde söyledin.”“ — Atölye tartışması kısaltıldı; yeni açılış cümlesi kaldı
- **silindi:** „“Sonra söyleyebilirdin.”“ — Atölye tartışması kısaltıldı; yeni açılış cümlesi kaldı
- **silindi:** „“Sonra alkışını almış olacaktın. Yanlış cümle daha sıcak kalacaktı.”“ — Atölye tartışması kısaltıldı; yeni açılış cümlesi kaldı
- **silindi:** „Leyla yeni cümleyi duyunca alkışlamadı. Yalnız başını salladı. Onun onayı gösterişli değildi; bu yüzden benim için daha değerli olmuştu.“ — Onayı açıklayan ek
- **kısaltıldı:** „Havaalanlarında kaybolduk, bir otelde aynı numaranın iki ayrı kişiye verildiğini keşfettik, Berlin treninde bütün yol boyunca “empati hissetmek midir, doğru da…“ çıkarıldı — Yolculuk anekdotları kısaltıldı
- **kısaltıldı:** „İnsanlar benim doğaçlama konuşabileceğimi sanıyordu. Konuşabilirdim; ama hoparlörden“ → „Hoparlörden“ — Gereksiz ara açıklama
- **silindi:** „Bu ayrımı unutmamı hiç istemezdi. Yardım eden kişi kahraman olursa, yardım alan kişi hikâyede borçlu kalırdı.“ — 'Ortamı değiştirdim'i açıklayan aforizma
- **silindi:** „O gün söylediği cümle beni tatmin etmemişti. Ben kapının ardında tek bir oda, bütün işaretleri açıklayan son bir plan istiyordum. Leyla ise her cevabın daha iy…“ — Diyaloğun özeti; 640 ve 645 yeterli

#### 7. Silinen Satır

- **kısaltıldı:** „Nehir klasöre o adı vermişti; ad, içindekilerden daha eksiksiz görünüyordu.“ çıkarıldı — Klasör adına dair, önceki cümleyi tekrarlayan yorum.
- **silindi:** „Haklı çıkmıştım. Ama haklı çıkmakla doğru yöntem kullanmak aynı şey değildi.“ — Selin'in yanıtının zaten gösterdiği dersi tekrarlayan özdeyiş.
- **kısaltıldı:** „Ekrandaki harfler birden insana dönüşmedi.“ çıkarıldı — Sonraki cümleyle aynı düşünce; güçlüsü kalıyor.
- **kısaltıldı:** „O an yasın kanıt toplamaya benzemediğini ikimiz de biliyorduk; yine de başka bir dilimiz yoktu.“ çıkarıldı — Sonraki paragraf aynı düşünceyi söylüyor.
- **kısaltıldı:** „İnsanların size kötü haber vermeden önce kullandığı türden bir ses değildi. Daha tehlikelisiydi.“ çıkarıldı — Üst üste antitez; en güçlü cümle kalıyor.

#### 8. İki Kötü Seçenek

- **kısaltıldı:** „polisi arayacak; yalnızca merak edip beklemeyecekti.“ → „polisi arayacaktı.“ — Gereksiz ek açıklama.
- **kısaltıldı:** „İnsan sevdiği iki kadından aynı cümleyi duyunca bunun evrensel mesaj olduğunu kabul etmek yerine ikisinin önceden konuştuğundan şüphelenebiliyor.“ çıkarıldı — Diyaloğu yavaşlatan ara yorum.

#### 9. Bölgesel Bir İmparatorluk

- **kısaltıldı:** „Bazı insanlar paralarını göstermek için giyinir. Cem, göstermeye ihtiyacı olmadığını göstermek için.“ çıkarıldı — Önceki betimlemeyi açıklayan tekrar.
- **kısaltıldı:** „O, aradaki güvenli sayıyı biliyordu.“ çıkarıldı — Önceki cümlenin zaten söylediği sonuç.
- **kısaltıldı:** „Bir insanın duygusunu doğru okuyup onu herkesin önünde açmıştı. Kadın kendisini görülmüş hissetmişti. Aynı anda mahremiyeti alınmıştı.“ çıkarıldı — Okurun az önce gördüğü sahnenin özeti.
- **kısaltıldı:** „Ben bazen bunu söylemeyip beklemeyi öğrenmeye çalışıyordum. Cem ise görmenin, kullanma izni olduğuna inanıyordu.“ çıkarıldı — Ardından gelen kapı özdeyişiyle aynı fikir.

#### 11. Emanetin Peşindeki Karga

- **kısaltıldı:** „Bunlar şirket sicilinden çıkmıyordu.“ çıkarıldı — Gereksiz açıklama.
- **kısaltıldı:** „Hayvan, insandan daha aşağı sayıldığı bir dünyada ona medeniyetin ilk derslerinden birini veriyordu.“ çıkarıldı — Önceki iki cümleyi tekrarlayan sonuç cümlesi.
- **kısaltıldı:** „Aynı siyah kuş bir hikâyede gömmenin bilgisini, başka bir hikâyede düşünceyle hatırlamayı taşıyordu. Hiçbirinde “kötü” olmak zorunda değildi.“ çıkarıldı — Sentezi ardından diyalog yapıyor; kötü olmama fikri önceki paragrafta.
- **silindi:** „Nehir cevap vermedi.“ — Bağlamsız kalmış dolgu cümlesi; soru yok.

#### 12. Yedi Yıl Önce Çaldığım Kapı

- **kısaltıldı:** „Oysa hayatımızın önemli bir bölümü market listeleri, aceleyle kabul ettiğimiz koşullar, uyumadan önce yazdığımız notlar ve “bunu sonra düşünürüm” diyerek verdi…“ → „Bugünkü“ — Deneme bloğu kısaltıldı; kiracı imgesi kalıyor.
- **kısaltıldı:** „Fakat hangi eski metne dayandıklarını aradığımda kaynakların çoğu birbirini gösteriyor, en sonunda yakın zamanda yazılmış bir numeroloji kitabına veya kaynaksı…“ çıkarıldı — 11.11 şüphesi üç kez anlatılıyor; özlü cümle kalıyor.
- **kısaltıldı:** „Bir sayısı birçok düşünce sisteminde başlangıç ve birlikle ilişkilendirilebilirdi. Dört kez yan yana gelince simetrisi göze çarpıyordu. Ama sayı“ → „Sayı“ — Sayı yorumunun tekrarı; asıl düşünce kalıyor.
- **kısaltıldı:** „Bunun güvenlik açısından hiçbir faydası yoktu. Yalnızca beynim klasörleri böyle hatırlıyordu.“ çıkarıldı — Esprinin kendisi aynı şeyi söylüyor.
- **kısaltıldı:** „Mesaj tek başına bu e-postayı gönderdiğimi göstermiyordu; fotoğraf da bilgisayarın başında kimin olduğunu söylemiyordu.“ çıkarıldı — Nehir'in sonraki cümlesi aynı şeyi söylüyor.
- **kısaltıldı:** „Fakat bunu sınamadan, “okumuşsun” sözü de “yaşamışsın” kadar aceleydi.“ çıkarıldı — Nehir'in düzeltmesi aynı düşünceyi taşıyor.
- **kısaltıldı:** „İnsan bazen kendi başına gelecekleri önceden biliyor, yine de terbiyesinden kaçamıyordu.“ çıkarıldı — Sahneyi uzatan özdeyiş.
- **kısaltıldı:** „O, sahnenin hangi cümleden doğduğunu; ben, gerçekten nerede çalıştığımı arıyordum. İkisi aynı araştırma değildi.“ çıkarıldı — Önceki iki cümlenin açıklaması.
- **kısaltıldı:** „Ekranda bir isim bulunmamasından, insanın bulunmadığı sonucunu çıkaramazdım.“ çıkarıldı — Nehir'in az önceki sözünü tekrarlıyor.
- **kısaltıldı:** „Kendimi açıklayacak bir dil arıyor; okuduğum her tarifte başka bir parçamı buluyordum.“ çıkarıldı — Genel cümle; ardından gelen somut örnekler aynı şeyi söylüyor.
- **kısaltıldı:** „İnsan geçmişini hatırlamayınca dedektiflik, kendi hayatının muhasebesine dönüşüyordu.“ çıkarıldı — Özdeyiş; somut kayıtlar zaten gösteriyor.
- **kısaltıldı:** „Aralarda kelimeleri yutuyor, sonra aynı cümleyi daha düzgün söylemeye çalışıyordum.“ çıkarıldı — Önceki cümleyi uzatan ayrıntı.
- **kısaltıldı:** „Bazen duygu, hangi resme ait olduğunu bilmeden yıllarca içinde durur.“ çıkarıldı — Bedenin hafızası özdeyişi bölümde zaten var.
- **kısaltıldı:** „Özür, karşı tarafın sizin kadar uzun bir tören düzenlemek zorunda olduğu anlamına gelmiyordu.“ çıkarıldı — Sahnenin gösterdiğini özetleyen özdeyiş.

#### 13. Bedenin İtirazı

- **kısaltıldı:** „İnsanı rahatlatmaz; ama yalan bir kesinlikle yanlış yere götürmez.“ çıkarıldı — Özdeyiş zinciri kısaltıldı.
- **kısaltıldı:** „Sandalye sayısından da şifre çıkaracaktım. Sonra rakamın insanları oturtmak dışında bir görevi olmayabileceğini düşündüm.“ çıkarıldı — Örüntü takıntısı motifinin tekrarı.
- **kısaltıldı:** „Bir zamanlar bunu öğrenmek bana güven verirdi. Şimdi güvenebileceğim şeylerin sayısını azaltıyordu.“ çıkarıldı — Üst üste yorum; mantık cümlesi yeterli.
- **kısaltıldı:** „Bedenimin bana ait olduğundan şüphe etmiyordum. Fakat bedenimden“ → „Bedenimden“ — Üst üste antitez kısaltıldı.
- **kısaltıldı:** „Vedaya hazırlanmak, insana her anı ağırlaştırma hakkı vermiyordu.“ çıkarıldı — İki özdeyişten somut olanı kalıyor.

#### 15. Nüshaların Söylemediği

- **kısaltıldı:** „Dışarıdan bakmak, aramak değildi. O gece bunu ikisi aynı şeymiş gibi duymuştum.“ çıkarıldı — Önceki cümleler aynı ayrımı zaten yapıyor.
- **kısaltıldı:** „Kapıyı ben açtırmadım. Böyle bir yetkim yoktu.“ çıkarıldı — Sonraki cümle anahtarı kimin çevirdiğini söylüyor.

#### 16. Görmek ile Yetişmek Arasındaki Mesafe

- **kısaltıldı:** „Gri paltolu adam, güçlü olduğum şeyi kullanarak beni durdurmuştu. Bütün sesleri duymam, doğru sesi seçebildiğim anlamına gelmiyordu.“ çıkarıldı — Nehir'in sözünü ve radyo imgesini tekrarlıyor.

#### 17. Ormanda Beceri, Şehirde Belirti

- **kısaltıldı:** „Hafıza günleri yan yana dizer. Hukuk ise her dakikanın arasına bir imza koyar.“ çıkarıldı — Usul paragrafı sonunda yığılmış aforizma çifti.
- **kısaltıldı:** „Kişisel bir yan etkiyi bütün tıbbın niyeti, kötü bir deneyimi devletin planı yapmıştı.“ çıkarıldı — Aynı karşıtlık 1334'te daha keskin kuruluyor.
- **kısaltıldı:** „Her cümle gerçek bir acıya dokunuyor, sonra acıya uygun bir düşman seçiyordu.“ çıkarıldı — Hemen ardından gelen gizli talimatı önceden söylüyor.
- **silindi:** „Yıllar boyunca farklı yerlerde benzer hikâyeler dinlemiştim. Berlin'de bir mühendis, toplantıda hiçbir şeyi duyamadığını ama sistemdeki hatayı herkesten önce g…“ — Ek örnekler; 1368'deki tez zaten söylenmişti.
- **silindi:** „Bunların hiçbiri “DEHB'liler avcıdır, otistikler toplayıcıdır” tezini kanıtlamıyordu. Yalnız insanların farklı dikkat biçimlerine her yerde başka anlamlar verd…“ — 1381'e bağlı tekrar; aynı tez 1368'de.
- **silindi:** „Ormanda beceri olan şey, trafikte ölümcül olabilirdi.“ — Üst üste üçüncü özdeyiş; 1383 ve 1385 yetiyor.
- **kısaltıldı:** „Sanki yaratılış her kaybın yanına görünmez bir hediye çeki bırakıyordu.“ çıkarıldı — Leyla'nın piyango notuyla aynı imge, tekrar.
- **silindi:** „Bir duyu kaybından sonra beynin bazı görevleri yeniden dağıtabildiğini, insanın kalan duyularını eğitim ve ihtiyaçla daha ustaca kullanabildiğini biliyorduk. A…“ — Deneme bloğu; Duru'nun ayak/el cümlesi aynı şeyi sahnede söylüyor.
- **kısaltıldı:** „Oysa eşit değerde yaratılmak, eşit yükle sınanmak değildi. İnsanların imkânı, sağlığı, parası, güvenliği ve karşılaştığı şans aynı değildi. Eşit olan, acıların…“ çıkarıldı — Vaaz; terazi cümlesi (1399) aynı fikri diyalogda veriyor.
- **silindi:** „Yine de kendi hayatımda bir denge görüyordum. Beynim bir işi kolaylaştırırken başka bir işi pahalılaştırıyordu. Buna evrensel kanun değil, kişisel kullanım kıl…“ — 1385'teki bedel fikrinin tekrarı.
- **silindi:** „İnsan bazen çocuklarına bir teori anlatır ve onların o teorinin seni kurtaracak cümlesini seçmesini izler.“ — Duru'nun cümlesinden sonra açıklayıcı aforizma.
- **kısaltıldı:** „Yazmamakla cevap vermemek de aynı şey değilmiş; insan bazen karşı tarafa göndermediği tartışmayı kendi içinde saatlerce sürdürebiliyordu.“ çıkarıldı — Esprinin açıklaması; taslak cümlesi yetiyor.
- **kısaltıldı:** „Nehir'e ilk başta güvenmemiş; ona üç sahte belge verip hangisini yayımlayacağını izlemişti. Nehir hiçbirini yayımlamayınca gerçek kayıtları getirmişti.“ çıkarıldı — Tarık'ın geçmişinde ikincil ayrıntı, başka yerde geçmiyor.
- **silindi:** „Zeynep'in gücü buydu. Ben bir sistemin ahlakını çözmeye çalışırken o, sistemin içinde yarın sabah atölyeye gidecek çocuğu görüyordu.“ — Zeynep'in sözlerini yeniden yorumlayan özet.
- **kısaltıldı:** „Başka bir deyişle destek özgür değildi. Sessizlik teminatıyla verilmişti.“ → „Destek, sessizlik teminatıyla verilmişti.“ — “Başka bir deyişle” tekrarı sıkıştırıldı.

#### 18. Birincil Ayna

- **silindi:** „Sonradan Yusuf'un 1978 tarihli el kitabında göreceğimiz eski Almanca metin, yöntemi daha çıplak söylüyordu:“ — Almanca formül 24. bölümde sahnesiyle veriliyor; önceden söyleme tekrarı.
- **silindi:** „BESCHÄMEN — ISOLIEREN — ERHÖHEN — LENKEN — VERWERTEN“ — Aynı iç metin 24. bölümde (1926) birebir tekrar ediliyor.
- **silindi:** „Altına Yusuf'un Türkçe çevirisi yazılmıştı:“ — Aynı geçiş 24. bölümde (1927) tekrar ediliyor.
- **silindi:** „UTANDIR — YALNIZLAŞTIR — YÜCELT — YÖNLENDİR — KULLAN“ — Aynı iç metin 24. bölümde (1928) birebir tekrar ediliyor.

#### 20. İnanmayan İlk Kişi

- **kısaltıldı:** „Nehir, sorumluluğu ölü ablasının üstüne bırakmıyordu.“ çıkarıldı — Nehir'in az önceki cümlesini tekrar ediyor.
- **kısaltıldı:** „Genel bir cümleyi kendine özel sanıyor.“ çıkarıldı — 1562'deki gösterimin tekrarı.
- **silindi:** „“Burçlar da böyle mi?” diye sordu Nehir.“ — Burç örneği fal mekanizmasının tekrarı.
- **silindi:** „“Günlük yorumların çoğu, çok kişiye uyacak kadar geniş. Ama biri ‘Bugün otoriteyle çatışabilirsin’ diye okuyunca patronunun sıradan cümlesini saldırı olarak se…“ — Burç örneği fal mekanizmasının tekrarı.
- **değiştirildi:** „“Büyü?”“ → „“Peki büyü?” diye sordu Nehir.“ — Burç kesilince konuşanı belirten dikiş.
- **kısaltıldı:** „Enfeksiyona olumlu cümle söylemek antibiyotiğin yaptığı işi yapmaz.“ çıkarıldı — Örnek yığını; mermi cümlesi yetiyor.
- **silindi:** „“Eski bir vaka yazısında okumuştum,” dedim. “Bir kişinin farklı kimlik durumlarında alerjik tepkisinin de değiştiği aktarılıyordu. Aynı beden, başka cevap. Düş…“ — Üçüncü beden-beklenti örneği; Leyla'nın uyarısını ikinci kez tekrarlatıyor.
- **silindi:** „“Düşünürüm,” dedi Leyla. “Ama tek bir vaka anlatısını kanıtlanmış genel kural diye taşımam. Ne ölçülmüş, hangi koşulda, başka açıklamalar elenmiş mi? Bunları b…“ — 1570'teki “sınırlı” uyarısının tekrarı.
- **silindi:** „“Yani şaşıramıyoruz da.”“ — Kesilen vaka konuşmasına bağlı.
- **silindi:** „“Şaşır. Hükmü geciktir. İkisi gayet iyi anlaşır. Bir de kimse bunu denemek için alerjisi olan şeye dokunmasın.”“ — Kesilen vaka konuşmasına bağlı.
- **kısaltıldı:** „Aynı bedende bulunmak, bütün odaların anahtarını taşımak mıydı?“ çıkarıldı — Kesilen vaka örneğine bağlı soru.
- **silindi:** „Kolyeyi avucuma bıraktım. “Bunu aldığım dükkânda daha pahalısının daha güçlü olduğu yazıyordu. Huzurun taksiti oluyorsa son iki taksitte yine huzursuz mu olaca…“ — Kristal bahsi uzatması; ana fikir 1583 ve 1588'de.
- **silindi:** „Leyla güldü. “Taşı sevmen için dünyayı iyileştirmesi gerekmiyor.”“ — Kristal bahsi uzatması.
- **silindi:** „“Benim derdim de o. Sahilde birlikte bulduğun bir çakıl sana iyi bir günü hatırlatabilir. Aynı taşı seni kıran biri verse eline aldığında için daralabilir. Taş…“ — Çakıl örneği 1583'ün tekrarı; para fikri 1593'te.
- **silindi:** „“O zaman itirazın başkasının sevdiği kolyeye değil,” dedi Nehir. “Onu takmayanın eksik olduğunu söyleyen satıcıya.”“ — Kesilen itiraza yanıt; para/itaat fikri 1593'te.
- **kısaltıldı:** „Özgürlük, etkilenmemek değil; etkiyi gördükten sonra mümkün olan yerde seçim alanını geri kurmaktı.“ çıkarıldı — Nehir'in düzeltmesinin ardından ek özdeyiş.
- **silindi:** „Bir karşı sesin görevi ışığını söndürmek değildi. Sana gözünün de görüntünün içinde olduğunu hatırlatmaktı.“ — Ayna benzetmesinin üstüne yığılmış özdeyiş.
- **kısaltıldı:** „Dikkatin nereye bakacağını, bedenin hangi sinyalini büyüteceğini ve insanın yaşadığı şeyi hangi kelimeyle anlatacağını etkiliyordu.“ çıkarıldı — Hemen önceki ALGI ÖN TOHUMU maddelerinin tekrarı.

#### 21. Bir Hata, İki Kız Kardeş

- **kısaltıldı:** „Duru hatta kalıp gördüğünü bize aktarırken, biz dört sokak boyunca aynı doğrultuda ilerledik.“ çıkarıldı — Sonraki cümle (dört sokak ötede bulduk) aynı bilgiyi veriyor.
- **kısaltıldı:** „Çocuğumun güçlü olduğu yerden ona ulaşmıştı.“ çıkarıldı — Merak cümlesinin tekrarı.
- **silindi:** „Çocuklarımız bazen bizden güvenlik değil, duygunun doğru etiketini ister. Çünkü adı konmayan korku, onların üstüne öfke olarak yağar.“ — Sahne sonrası açıklayıcı aforizma; Emir'in cümlesi bölümü kapatıyor.

#### 23. Silah Olmayan Ses

- **silindi:** „Bu cümlede savunma yoktu. Yalnız sonuç vardı.“ — “Yoktu/vardı” kalıbı; aynı bölümde 1834-1835'te daha güçlüsü var.
- **kısaltıldı:** „İlacı kesmiş, yeniden almadan kendi hekimine danışmaya karar vermişti.“ çıkarıldı — Hemen önce alıntılanan notun özeti.

#### 25. Unuttuğumu Ateş Seçti

- **kısaltıldı:** „Mühürlenmiş kitapların ön tarafta olduğunu biliyordum. Yine de bir sayfanın yanışını izlerken insan kopyayla aslı hemen ayıramıyordu.“ çıkarıldı — 1958'deki “asılları korunuyordu, biliyordum” tekrarı.
- **kısaltıldı:** „İnsan tehlikede yanlış bir şeyi düşündüğünde, kendisini iyi ilan eden yalana değil, seçtiği davranışa tutunmalıydı.“ çıkarıldı — “Düşünmek yapmak değildir”in vaaz tekrarı.

#### 26. Aynı Yöntemin Farklı Logoları

- **kısaltıldı:** „Göz, bütün satırı benim el yazım sanıyordu; büyütme, iki ayrı zamanı gösteriyordu.“ çıkarıldı — Bulguyu ikinci kez açıklıyor; gereksiz tekrar.
- **silindi:** „Bu, ağın bizden hızlı olduğunu gösteriyordu. Biz ne olduğunu anlamaya çalışırken onlar, insanların ne düşüneceğine dair seçenekleri sıraya koymuştu.“ — Karşı anlatının hızını ikinci kez anlatan açıklama.
- **silindi:** „Toronto'daki başka bir dosya Malik adında bir veri mühendisini anlatıyordu. İş arkadaşlarının duygularını yüz hareketlerinden çok iyi okuyor, şirket içindeki g…“ — Malik vakası: Entegrasyon fikri 2093–94'te ve Cem bağlantısında zaten var.
- **silindi:** „Malik ENTEGRASYON adayıydı.“ — Malik vakasıyla birlikte; ENTEGRASYON kodu Yusuf sahnesinde açıklanıyor.
- **silindi:** „“Kötü uyanmış,” dedim.“ — Malik vakasıyla birlikte; 'kötü uyanmış' sorusu 2093'te geliyor.
- **silindi:** „Nehir başını salladı. “Bu, siyah kitabın kelimesi. Dosyada ahlaki karar yazıyor. Malik'in beyni kötü değil. Yaptığı iş kötü.”“ — Ahlaki seçim/biyoloji ayrımı 2100–2101'de daha güçlü veriliyor.
- **silindi:** „Aradaki farkı korumak önemliydi. Yoksa iyiliği kendi doğamıza, kötülüğü başkasının tanısına yazar; hiçbir seçimden sorumlu kalmazdık.“ — Aynı ahlaki ayrımı tekrarlayan deneme cümlesi.
- **değiştirildi:** „Üçüncü dosya“ → „İkinci dosya“ — Malik dosyası çıkınca sayım düzeltmesi.
- **kısaltıldı:** „inanmıştı. Otobüste benzin kokusu alınca iniyor, iş arkadaşının cevabı gecikince kendisine komplo kurulduğunu düşünüyor, uyumak için içiyor“ → „inanmıştı. Uyumak için içiyor“ — Örnek dizisi kısaltıldı; aşırı tetikte olma 2052'de zaten var.
- **silindi:** „Bu ayrım siyah kitabın işine gelmiyordu. Kitap, dayanılmaz bir dünyayı sonunda “olduğu gibi” gördüğünüzü söylüyor; geri kalan herkesi uyuyanlar diye küçültüyor…“ — Siyah kitap eleştirisi 2062'de daha net tekrar ediliyor.
- **kısaltıldı:** „Oysa bazen“ → „Bazen“ — Önceki paragraf çıkınca bağlaç düzeltmesi.
- **silindi:** „Çalışma defterime yazdım:“ — Defter aforizması 2062'nin ardından üst üste vecize.
- **silindi:** „Uyanmak gözünü sürekli açık tutmak değildir. Gördüğün şeyin seni kör etmesine izin vermemektir.“ — Üst üste vecize; düşünce 2058–2062'de sahnede gösterildi.
- **kısaltıldı:** „İnsanların gizli buluşma için mezarlığı güvenli sanması bana hep tuhaf gelmiştir. Ölüler konuşmaz diye düşünürler. Oysa yaşayanlar en rahat orada telefonla kon…“ çıkarıldı — Mekândan sonra gelen vecize zinciri; yer bilgisi korunuyor.
- **kısaltıldı:** „Dünyanın en tehlikeli insanları bazen tehlikeli görünmez; ama en suçlu görünenlerin çoğu da yalnız kötü giyinmiştir. Görüntü, ahlak için zayıf delildir.“ çıkarıldı — Betimlemeyi izleyen üst üste aforizmalar.
- **silindi:** „“Kitaptaki yöntemler hem iyilik hem kötülük için kullanılmış,” dedim.“ — Bıçak benzetmesi atışması; 2071'deki liste yöntemi zaten gösteriyor.
- **silindi:** „“Bıçak benzetmesi yapmayacağım,” dedi Yusuf. “Çok tembel.”“ — Atışma; tempoyu kesiyor.
- **silindi:** „“Siz de benzetme eleştiriyor musunuz?”“ — Atışma; tempoyu kesiyor.
- **silindi:** „“Yaşlandıkça insanın başkasına benzeyen yanları artıyor.”“ — Atışma; tempoyu kesiyor.

#### 28. Bir Gün Daha Yaşamak

- **kısaltıldı:** „Neden ile sonuç birbirini kovalayan iki köpek olmuştu; hangisinin önde olduğunu göremiyordum.“ çıkarıldı — Önceki iki cümleyi imgeyle yeniden söylüyor.
- **silindi:** „İnsanın her fark ettiği şeyi düzeltmesi gerekmiyordu.“ — Sahnenin gösterdiğini açıklayan vecize.

#### 30. Yüzümün Benden Habersiz Hayatı

- **kısaltıldı:** „Bir doktorun duraksaması, bir arabanın şeridinden çıkması, sevdiğiniz birinin “Konuşmamız lazım,” demesi bazen daha az sürer.“ çıkarıldı — Örnek yığını; on dokuz saniye fikri korunuyor.
- **kısaltıldı:** „Bu karar küçük görünüyordu. Benim için değildi.“ çıkarıldı — Gereksiz girizgâh; paragrafın kendisi önemi gösteriyor.
- **silindi:** „Yüzüm yedi ülkeyi dolaşmıştı. Telefonu uçak moduna almak, o gün yaptığımız en normal seyahat düzenlemesiydi.“ — Uçak modu esprisi; 2217 aynı geçişi yapıyor.
- **kısaltıldı:** „Beni, “çok hızlı çalışan ve bazen hata günlüğü tutmayan bir analiz programı” diye tarif etmişti.“ çıkarıldı — Sahne ortasındaki geri dönüşü kısaltma.
- **kısaltıldı:** „Verinin garip tarafı buydu: Alındığı gün önemsiz görünen şey, onu elinde tutan kişi sabırlıysa gelecekte silah olabilirdi.“ çıkarıldı — Önceki cümleyi genelleyen açıklama.

#### 31. Lambaları Yanan Boş Kat

- **kısaltıldı:** „Bu yol daha az sinematikti; fakat gerçek hayattaki büyük kötülüklerin çoğu, maskeli adamların lazerlerin arasından geçmesiyle değil, doğru yetkiye sahip sıkılm…“ çıkarıldı — Hukuki planı izleyen deneme cümlesi.
- **kısaltıldı:** „Plan basit görünüyordu ve bu yüzden basit değildi.“ çıkarıldı — Formül cümle; paragraf sonu aynı uyarıyı veriyor.

#### 34. Unutulmuş Dükkânın Anahtarı

- **kısaltıldı:** „İkisi dışarıdan birbirine çok benzer; farkı, karşıdakini korumak mı yoksa acıtmak mı istediğiniz belirler.“ çıkarıldı — Sınır/ceza ayrımını açıklayan genelleme.
- **kısaltıldı:** „Haklı insanlara hemen haklı olduklarını söylemek, insanlığın ulaşamadığı bir olgunluk seviyesi olabilir.“ çıkarıldı — Üstüne eklenen vecize.
- **kısaltıldı:** „Sonra içeriden ses geldi.“ çıkarıldı — 2418 aynı anı daha somut veriyor.
- **kısaltıldı:** „Güvenlik, çoğu zaman sahibini dışarıda bırakmayacak kadar kusurlu tasarlanır.“ çıkarıldı — İkinci aforizma; açıklama önceki cümlede var.

#### 35. Kızımın Dosyası

- **kısaltıldı:** „İtirafı, yöntemin zekâsını küçültmüyor; zekâsı da aldığı riski temizlemiyordu.“ çıkarıldı — Karşıtlık formülü; Meralis paralelliği korunuyor.
- **kısaltıldı:** „Kızım benden öğrenmiş, sonra onu bana karşı kullanmıştı. Eğitim bazen silahın el değiştirmesidir.“ çıkarıldı — Açık olanı açıklıyor ve vecizeyle kapatıyor.
- **kısaltıldı:** „Özgür irade, sonucu hoşumuza gitmeyen seçimlerde de özgür iradeydi. Onu yalnız mağdur saymak yaptığı riski görmezden gelmek, yalnız suçlamak ise tuzağı kuranla…“ çıkarıldı — Zeynep'in sözünü deneme diliyle tekrarlıyor.
- **kısaltıldı:** „Ölüm büyük anlamları değil, küçük işleri yarım bırakıyordu.“ çıkarıldı — Ekmek imgesinden sonra üçüncü özet cümle.
- **kısaltıldı:** „İç içe iki daire birçok yerde birlik diye okunabilirdi. Babam içinse kusursuz birleşme değildi; iki çarkın hareket edebilmesi için arada kalan paydı. Sembol bi…“ çıkarıldı — Mührün anlamı 2482 ve 2497'de zaten anlatıldı.
- **silindi:** „On yedi yaşındaki birinin sizi tek cümleyle çözmesi gurur verici olabilir. Çözdüğü kişi sizseniz daha az keyiflidir.“ — Espri vecize; duygusal vuruşu 'Haklısın' cevabından önce dağıtıyor.
- **kısaltıldı:** „Demek ki anonimlik, ismin silinip insanın geriye kalan her şeyinin bırakılmasıymış.“ çıkarıldı — Önceki cümlenin ironisini açıklıyor.
- **kısaltıldı:** „Bir ailede suçluluk dağıtılırken sandalyeler bile taraf seçiyor gibi görünür.“ çıkarıldı — Jesti açıklayan vecize.

#### 36. İki Ayrı Gelecek

- **kısaltıldı:** „İnsanları zincirle taşımaya gerek yoktu; doğru yarayı gösterirseniz kendi ayaklarıyla giderlerdi.“ çıkarıldı — Önceki cümlenin söylediğini vecizeyle tekrarlıyor.
- **kısaltıldı:** „Kahraman mı, çocuklarını koruyamayan bir baba mı, öfkesini doğru kişiye yönelttiği için kendini adil sanan biri mi?“ çıkarıldı — Soru listesi; iç ses kısaltıldı.
- **kısaltıldı:** „Eski kitabın içinden çıkmamıştı; biri bizi şimdi, ayrı bir kanaldan izlediğini gösteriyordu.“ çıkarıldı — 2594 aynı bilgiyi daha çarpıcı veriyor.

#### 37. Görünmeyen Kameranın Gördüğü

- **kısaltıldı:** „Yasa, onu uygulayan kişinin sezgisinden daha dar bir koridorda yürürdü.“ çıkarıldı — Sahne sonrası açıklayıcı vecize.

#### 38. Adı Hastalık Olan Yetenek

- **kısaltıldı:** „Banka riskten kaçınıyordu. Yayınevi itibarını koruyordu. Okul tedbir alıyordu. Ev sahibi huzur istiyordu.“ çıkarıldı — 2644'teki listeyi tekrar eden cümle zinciri.
- **silindi:** „Odada kısa bir sessizlik oldu.“ — Gereksiz sahne dolgusu.
- **silindi:** „Bütün okulu düşman ilan etseydim, Duru'nun yanında duran öğretmeni de görünmez yapacaktım.“ — 2669'daki tespiti tekrar eden yorum.
- **kısaltıldı:** „Her iki grupta da aynı yeni açılmış hesaplar vardı.“ çıkarıldı — Duru'nun hemen sonraki repliği aynı bilgiyi gösteriyor.
- **silindi:** „Bir aile bazen büyük bir sırrın ortasında, kötü bir şirketin küresel saldırısına uğrarken bile aile olarak kalır. Belki insanı kurtaran tam da budur. Büyük anl…“ — Sahnenin gösterdiğini açıklayan yorum paragrafı.
- **kısaltıldı:** „İlk bakışta birbirine benzemeyen bu şeyleri birleştiren, doğru veya yanlış olmalarından önce insana ne yaptırdıklarıydı.“ çıkarıldı — Ardından gelen iki italik satır aynı fikri söylüyor.
- **silindi:** „Eli kitabın kenarında durdu. Benden bir yöntem bekliyordu; yalnızca korkmamasını söylersem ertesi gün korktuğunu saklayabilirdi.“ — Açıklama; 20. bölümdeki büyü konuşmasının tekrarı.
- **silindi:** „“Sonra birlikte bakarız,” dedim. “Ne yapmış, senden ne istiyor? Bir söz uykunu kaçırabilir. Tehdit kapına gelmişse yalnız inanmamakla korunamazsın. Etkilenmiş …“ — Leyla ve Nehir'in 20. bölümdeki açıklamalarını yineliyor.
- **silindi:** „Kitapta dört yeni soru vardı:“ — Deneme bloğu kısaltıldı; dört soru yöntemi başka yerde geçmiyor.
- **silindi:** „Fiziksel olarak tam ne oldu?“ — Deneme bloğu kısaltıldı; dört soru yöntemi başka yerde geçmiyor.
- **silindi:** „Olayın adını ilk kim koydu?“ — Deneme bloğu kısaltıldı; dört soru yöntemi başka yerde geçmiyor.
- **silindi:** „Bu ada inanınca hangi davranışım değişti?“ — Deneme bloğu kısaltıldı; dört soru yöntemi başka yerde geçmiyor.
- **silindi:** „Korkumdan, paramdan veya itaatimden kim yararlanıyor?“ — Deneme bloğu kısaltıldı; dört soru yöntemi başka yerde geçmiyor.
- **silindi:** „Nehir, “Meralis'in sevmediği sorular,” dedi.“ — Dört soru üzerine yorum; blokla birlikte çıkarıldı.
- **silindi:** „“Çünkü büyüyü kanıtlamıyorlar,” dedi Emir.“ — Dört soru üzerine yorum; blokla birlikte çıkarıldı.
- **silindi:** „“Çürütmekle de başlamıyorlar,” dedim. “Önce ne olduğunu araştırıyorlar.”“ — Dört soru üzerine yorum; blokla birlikte çıkarıldı.
- **silindi:** „Nehir dört sorunun fotoğrafını çekti. “Toz varsa ne tozu, tehdit varsa kimden. Geri kalanına sonra bakarız.”“ — Dört soru üzerine yorum; blokla birlikte çıkarıldı.
- **silindi:** „Bilmediğin yere “bilmiyorum” demek başka, o boşluğu seni korkutan kişiye bırakmak başkaydı.“ — Üst üste dizilmiş özdeyiş.
- **silindi:** „Ona hazır bir din cümlesi vermek istemedim. Hazır cevaplar çocukların zihninde bazen kilitli kapıya dönüşür.“ — Gerekçe açıklaması; cevap kendini taşıyor.
- **silindi:** „Nehir bana baktı. “Ya inanmayan biri?”“ — Vaaz bloğu kısaltıldı.
- **silindi:** „“Aynı hakkı başka kelimelerle kurabilir. İnsan onuru için aynı inancı paylaşmak gerekmiyor.”“ — Vaaz bloğu kısaltıldı.
- **silindi:** „Beceri, sağlık ve şans eşit dağılmamıştı. Ama hiçbiri bir insanı ötekinin sahibi yapmıyordu.“ — Araya giren özdeyiş; Duru'nun sorusu inanç cevabına bağlanıyor.
- **silindi:** „Leyla'nın fincanı aklıma geldi. Masada gerçekten rahatlamıştım; bu, telvenin geleceği bildiğini göstermiyordu. Fincan beni rahatlatmış, zihnim hemen ona kartvi…“ — 20. bölümdeki fincan sahnesinin özeti.
- **kısaltıldı:** „Şüphe de tek başına uyanıklık değil; bazen şüpheci insan yalnız kendi korkusuna inanır.“ çıkarıldı — Cevaba eklenen ikinci özdeyiş.
- **silindi:** „GÖLGE: İnsan kendini yargılarken bile terazinin başında durmak ister.“ — İç ses dizisi kısaltıldı; ŞÜPHECİ ve SESSİZ SES kalıyor.
- **silindi:** „Beyaz kitabın “melek” dediği insanın kanadı yoktu. Gücü olduğu hâlde başkasının iradesini çalmamayı seçiyordu. Altını çizmek kolaydı. Cem'in karşısında buna uy…“ — 2587'deki 'melek' tanımını tekrar ediyor.
- **kısaltıldı:** „Beyaz kitapta, o sorunun altında alkolle, maddeyle, aşırı çalışmayla ya da sonsuz ekranlarla susmaya çalışan insanlardan söz ediliyordu. Kitap onları küçümsemi…“ → „O geceyi“ — 26. bölümdeki bağımlılık açıklamasının tekrarı.
- **kısaltıldı:** „Özgür irade ile çoktan var olan zaman fikrini aynı cümlede uzlaştırmaya çalıştım.“ çıkarıldı — Soru zaten sahnede; açıklama fazlası.
- **silindi:** „“Vaktin çocuğu olmak sorumsuzluk gibi,” dedi Emir.“ — Yusuf'un notunu yeniden açıklayan diyalog.
- **silindi:** „“Tam tersi olabilir,” dedim. “Şu anın hakkını vermek, yarın yokmuş gibi davranmak değil. Yarını kontrol edeceğim diye bugünü harcamamak.”“ — Yusuf'un notunu yeniden açıklayan diyalog.
- **silindi:** „“Bunu sen mi söylüyorsun?” dedi Duru.“ — Yusuf'un notunu yeniden açıklayan diyalog.
- **silindi:** „“Kitap söylüyor. Ben yeni öğreniyorum.”“ — Yusuf'un notunu yeniden açıklayan diyalog.
- **silindi:** „Geçmiş hakkında konuşurken kokuyu fark etmiyordum. Geleceği çözmeye çalışırken de Duman'ın üçüncü kez cama çarpıp şaşırmasını kaçıracaktım.“ — Sahneyi açıklayan yorum; 2770 aynı şeyi söylüyor.
- **silindi:** „Hayatın sonunu bilmemek eksiklik gibi gelmişti. O akşam ilk kez bilinmezliği bir alan olarak gördüm. Cevap yok diye boş değildi. Kokusu, sesi, dokusu ve yanımd…“ — Sahne sonrası özet; ardından gelen iki satır yeterli.

#### 39. ŞAMAN

- **kısaltıldı:** „Kelimenin modern dünyadaki yolculuğu Sibirya'nın Tunguz dillerinden geçmiş, sonra birbirinden çok farklı halkların şifacıları, ruhani aracıları ve tören yöneti…“ çıkarıldı — Leyla'nın 9. bölümdeki itirazını tekrar ediyor.

#### 40. Yusuf Olmadan Önce

- **silindi:** „“Bir insan oğlunuz olmaktan çıkmaz,” dedi Nehir.“ — 'Oğlumdu' zaten söylüyor; özdeyiş tekrarı.
- **silindi:** „“Bazen insan, kaybettiği şeyin adını geçmiş zamanla söyler.”“ — 'Oğlumdu' zaten söylüyor; özdeyiş tekrarı.
- **kısaltıldı:** „Yusuf o kazanın tesadüf olduğuna inanamıyordu.“ çıkarıldı — Sonraki soru-cevap aynı şüpheyi veriyor.
- **silindi:** „“Sevgi diye öğrettiğiniz şey, sonra silah olmuş.”“ — Yusuf'un cevabını yineleyen soru.
- **silindi:** „“Evet.”“ — Yusuf'un cevabını yineleyen soru.
- **kısaltıldı:** „Sevgi bazen kontrol eder. Bazen de özgürlük kelimesinin arkasına geçip korkar.“ çıkarıldı — Üst üste özdeyiş.
- **kısaltıldı:** „. Bunu kabul etmesi, tehlikenin azaldığı anlamına gelmiyordu; yalnız hepimizin“ → „; hepimizin“ — Açıklayıcı ara cümle kısaltıldı.
- **kısaltıldı:** „Aylin o an bir davanın kayıp tanığı olmaktan çıktı. Bu adam, bir insanın elinin değdiği plastiği saklıyordu.“ çıkarıldı — Jest kendini anlatıyor; yorum fazlası.
- **silindi:** „“Önce hikâyeyi anlat,” dedim.“ — Soru-cevap kısaltıldı; geçiş repliği.
- **silindi:** „“Hikâyeler insanı delilden uzaklaştırır.”“ — Soru-cevap kısaltıldı; geçiş repliği.
- **silindi:** „“Delili hikâyeye koyarsan ikisini de dinlerim.”“ — Soru-cevap kısaltıldı; geçiş repliği.
- **silindi:** „Bu ailede ve çevresinde sır, kalıtsal bir eşya gibi el değiştiriyordu.“ — Az önceki replikleri özetleyen yorum.
- **kısaltıldı:** „Yusuf'la ilk kez on yedi yaşımda, kendisini yalnız “Saatçi” diye tanıttığı gün karşılaşmıştım. Ona verdiğim ilk paket“ → „On yedi yaşımda Saatçi'ye verdiğim ilk paket“ — 24. bölümde anlatılan tanışmanın tekrarı kısaltıldı.
- **silindi:** „Fetih sözü yalnız yenmek değil, açmak anlamını da taşıyordu. 1453, yaşadığım şehrin tarihsel hafızasında dışarıdaki surların aşılmasıydı. Genç ben sayıyı ters …“ — 2880'deki iç şehir fikrini yeniden anlatıyor.
- **silindi:** „“Yani beni korkutan işaretlerin bir kısmını yine ben yerleştirdim.”“ — 2880 ve 2904–2905'te aynı fikir; soru-cevap tekrarı.
- **silindi:** „“Kendini uyandırmak için bıraktığın zili, onlar yangın alarmına çevirdi.”“ — 2880 ve 2904–2905'te aynı fikir; soru-cevap tekrarı.
- **kısaltıldı:** „Senin kurduğun tanığı gözcüye çevirdiler.“ çıkarıldı — Aynı 'çevirdiler' kalıbının tekrarı.
- **silindi:** „Ben saklama yerini seçmiş, Yusuf kitabı yerleştirmiş, Meralis eski sistemimi aileme karşı kullanmıştı. Lambaya her baktığımda hangimizi görecektim?“ — Az önce anlatılanın özeti.
- **silindi:** „İnsan bazen bir şeyi doğaüstü biçimde unutmaz. Her hatırlama fırsatında başka yöne bakarak unutur.“ — Özdeyiş; 2888'deki kaçınma fikrini tekrar ediyor.
- **kısaltıldı:** „Maddi zincirin ilk parçası böylece ayrıldı: Ben koşulu hazırlamıştım; Leyla doğru kitabı teslim etmeye çalışmıştı; Meralis yolu ele geçirip yanlış kitabı aynı …“ çıkarıldı — Yusuf'un az önceki cevaplarının özeti.
- **kısaltıldı:** „Ama rastlantı, sonucu değersizleştirmiyordu. Duman kendi sebebiyle yürümüş; ben kendi sorumla peşine düşmüştüm.“ çıkarıldı — Yorum fazlası; bölüm sonu kedi cümlesi yeterli.
- **kısaltıldı:** „“Koşullu bir alarm kurdun.”“ çıkarıldı — 2904–2905'teki alarm fikrinin tekrarı.
- **kısaltıldı:** „Yusuf bana kanıt göstermek istemiş, Meralis kanıtı bulduğuma inanmamı istemişti.“ çıkarıldı — 2936–2938'deki cevapları tekrar ediyor.
- **kısaltıldı:** „Fiziksel yol açıklanabiliyordu: Ben planlamış, Yusuf saklamış, tetikleyiciler paketleri harekete geçirmişti.“ → „Fiziksel yol açıklanabiliyordu.“ — Bilinen zincirin yeniden sayılması.
- **silindi:** „Bir bilmecenin yarısını çözmek, öteki yarısını daha karanlık yapmıştı.“ — Üst üste özdeyiş.
- **kısaltıldı:** „Tek bir simya öğretisi yoktu; renklerin sırası ve anlamı metinden metne değişiyordu. Yine de üçlü, yüzyıllar boyunca güçlü bir dönüşüm hikâyesi taşımıştı.“ çıkarıldı — Nehir'in 2955'teki itirazı aynı çekinceyi taşıyor.
- **silindi:** „Üç kitap bana kader yazmıyordu. Aynı dönüşüm dilini üç ayrı elin nasıl kullandığını gösteriyordu.“ — Renk bölümünün özeti.
- **silindi:** „“Duman?”“ — Duman sorusu 2932–2934'te zaten cevaplandı.
- **silindi:** „“Kedi senden daha bağımsız.”“ — Duman sorusu 2932–2934'te zaten cevaplandı.
- **silindi:** „Eski Mısır'da kedi biçimi ev, doğum ve korunmayla ilişkilendirilen Bastet'i hatırlatabiliyordu. İstanbul'da ise kediler cami avlusuyla balıkçı tezgâhı arasında…“ — Kedi üzerine deneme; 2934 ve 2969 yeterli.
- **silindi:** „Paketi koklamış, yangında çıkışı bulmuş, istediğinde ortadan kaybolmuştu. Davranışının fiziksel nedenleri vardı: koku, ısı, ses, merak. Ona anlam yükleyen bend…“ — Kedi üzerine deneme; 2934 ve 2969 yeterli.

#### 42. Labirentin Emanetleri

- **kısaltıldı:** „Hukuk bazen kapıyı tamamen tutamaz; ama karşı tarafın hangi eşikten geçtiğini kayda alır.“ çıkarıldı — Sahne sonu özdeyiş.
- **kısaltıldı:** „; buna yetkileri yoktu“ çıkarıldı — 2982 ve 2997'de söylendi.

#### 43. Başlangıç Sensin

- **kısaltıldı:** „Herhangi bir telefon bizi sihirli biçimde dinlemiyordu.“ çıkarıldı — Değil-idi kalıbı; son cümle yeterli.
- **silindi:** „Sonra bunun zafer olduğunu anladım.“ — Üst üste özdeyiş; 3079 yeterli.
- **silindi:** „Küresel bir yapı bir gecede çökmedi.“ — 3083 aynı fikri daha güçlü söylüyor.

#### 44. Bedenin Bildiği Tarih

- **kısaltıldı:** „Yaşamın sonunu anlamlı bulmak, sonu hızlandırma hakkı vermiyordu.“ çıkarıldı — Önceki cümleyi tekrar eden ikinci antitez
- **kısaltıldı:** „Geçmiş çoktan anlatıya, gelecek tahmine dönüşmüştür.“ çıkarıldı — Üst üste aforizma; sahne zaten gösteriyor

#### 45. Beni Öldürmeyen Adam

- **kısaltıldı:** „İnsan aynı hatayı tekrar etmeyince kendini çok bilge sanıyor. Aslında yalnız o hata konusunda biraz daha az acemidir.“ çıkarıldı — Sahneyi durduran aforizma
- **kısaltıldı:** „“Hastane güvenliği koridoru kapattı. Sivil“ → „“Sivil“ — Önceki paragrafta söylenen bilginin tekrarı
- **silindi:** „“Bu kadar tanığa mı ihtiyacın var?” diye sordu Cem.“ — Tanık düzenini tekrar açıklayan atışma; tempo
- **silindi:** „“Geçen sefer yalnız senin kaydın vardı.”“ — Tanık düzenini tekrar açıklayan atışma; tempo
- **silindi:** „“Bu kez seninki olacak. Fark ne?”“ — Tanık düzenini tekrar açıklayan atışma; tempo
- **silindi:** „“Benimkine itiraz edebilirsin. Selin o yüzden hatta.”“ — Tanık düzenini tekrar açıklayan atışma; tempo
- **kısaltıldı:** „Yine de susturabileceği bir tanığın karşısında değildi artık. Kendi bütçe onayı çoktan dosyadaydı; şimdi üstündeki imzaların da görünmesini istiyordu. Kendini …“ çıkarıldı — Cem'in az önce söylediğini yeniden açıklıyor
- **kısaltıldı:** „Mucize sandığım bazı şeylerin iyi finanse edilmiş bir bakım sözleşmesi çıkması, gizem duygumu incitiyor; öfkemi ise büyütüyordu.“ çıkarıldı — ‘Mucize değil operasyon’ fikri 3191'de toplu olarak var
- **silindi:** „Cem başını eğdi. Sorudan kaçmıyor, cevabın bende yaratacağı görüntüyü bekliyordu.“ — Soru-cevap arasında bilgi taşımayan sahne işi
- **kısaltıldı:** „Onu tavandan indirince her şeyi öğrenmemiştik. Şimdi görüntünün hangi masaya gittiği, notun hangi elden çıktığı da ortaya çıkıyordu.“ çıkarıldı — Okurun az önce öğrendiğinin özeti
- **silindi:** „Mistik bir oda sandığımız yer, kablo, batarya ve bir çocuğun nasıl davranacağını önceden hesaplayan yetişkinlerden kurulmuştu. Açıklama sahneyi daha az korkunç…“ — Aynı yorum 3154 ve 3191'de; üçlü tekrar
- **kısaltıldı:** „Yeni bir karar çıkarmadılar. Elindekinin kapsamını olabildiğince geniş göstermeye çalıştılar.“ çıkarıldı — 3170'teki bilgiyi tekrar ediyor
- **silindi:** „Mavi tüyün fotoğrafını açtım. Defterin yanında, Duru'nun boş sandalyesindeydi. Cem açıklamayı bitirmişti; ben fotoğrafı kapatamadım.“ — Bilinen görüntünün (2374) tekrarı; soru-cevabı uzatıyor
- **kısaltıldı:** „Cem bununla beni suçlu yapabileceğini düşündü. Oysa bir anahtarı geri istemeyi unutmak, eve girene izin vermek değildi.“ çıkarıldı — Aynı savunma 3151'de yapıldı
- **kısaltıldı:** „Cem'in her şeyi bilirmiş gibi konuşması, bilmediğimiz her şeyi ona hediye etmemizi gerektirmiyordu.“ çıkarıldı — Aynı düşünce 3193'te; orada daha güçlü
- **silindi:** „“Hâlâ iyi tarafta olduğunu sanıyorsun.”“ — Üst üste antitez; 3225 aynı ahlaki noktayı koyuyor
- **silindi:** „“Hayır. İyi taraf diye kalıcı bir adres olmadığını öğrendim. Her kararda yeniden seçiliyor.”“ — Üst üste antitez; 3225 aynı ahlaki noktayı koyuyor
- **kısaltıldı:** „İfadeyi kendi seçtiği yerden başlatabileceğini sanıyordu.“ çıkarıldı — 3236'da gösterilen tutumu önceden açıklıyor
- **kısaltıldı:** „O gün Cem gözaltına alındı.“ çıkarıldı — Gözaltı 3229'da zaten anlatıldı
- **kısaltıldı:** „Yanımızdaki balıkçı oltasını üç kez atıp her seferinde plastik poşet çekti. Dördüncü kez yine denedi. İnsanın umudu bazen aptallıkla aynı montu giyer; hangisin…“ çıkarıldı — Aforizmaya bağlı dekor; sonrası sahneyi yavaşlatıyor
- **silindi:** „İkimiz de kötülüğü bütünüyle istememiştik. Yine de kararlarımız kötülüğün yoluna taş koymak yerine bazen yol döşemişti. Kendimizi şeytan ilan etmek kolay olurd…“ — Diyalogda gösterilen suçluluğu deneme diliyle tekrar ediyor
- **kısaltıldı:** „Nehir, yıllardır aramızdaki tamamlanmamış şeyi ilk kez doğrudan göstermişti.“ çıkarıldı — Sahnenin açıkça gösterdiğini açıklıyor
- **kısaltıldı:** „Mükemmel olmadı. Gerçek oldu.“ çıkarıldı — Üst üste aforizma; 3286'daki yeterli
- **kısaltıldı:** „Hayatıma devam etmek, bedenime hiç sorun yokmuş gibi davranmak değildi. İlaç saatini, nabız uyarısını, yorgunluğu ve yardım istemeyi günün sıradan işleri arası…“ çıkarıldı — Doktorun cümlesinden sonra açıklayıcı deneme
- **kısaltıldı:** „Seni susturmak, söylediklerini büyütürdü.“ çıkarıldı — Önceki cümlenin tekrarı
- **silindi:** „“Deniz kıyısında mesafe daha yavaş geçer.”“ — Kısa yürüyüş esprisi uzuyor; 3247 motifi taşıyor
- **silindi:** „“Kalbin şiir ölçmüyor.”“ — Kısa yürüyüş esprisi uzuyor; 3247 motifi taşıyor
- **kısaltıldı:** „Cem'in yaptıklarını açıklayabilecek bir çocukluk vardı; onları onun yerine üstlenecek bir çocukluk yoktu.“ çıkarıldı — Aynı yargı finalde (3634) daha güçlü

#### 46. Son Olabilecek Şeyler

- **kısaltıldı:** „Çocukların intikam duygusu bazen pedagojik bir ceket giyer.“ çıkarıldı — Esprinin kendisinden sonra gelen yorum-aforizma
- **kısaltıldı:** „Bazen sevgi vardır, fakat iki insanın yaraları aynı evde birbirine sürekli yanlış görev verir.“ çıkarıldı — Üst üste genelleme; önceki cümleler yeterli
- **kısaltıldı:** „Güçlü sezginin doğruya daha hızlı ulaştırdığına inanmıştım; oysa yanlış bir varsayıma da aynı hızla gidebiliyordu.“ çıkarıldı — Dört örnekten biri; liste kısaltıldı
- **kısaltıldı:** „İnsanların her sakladığı duyguyu açmak gerekmiyordu.“ çıkarıldı — Jesti açıklayan aforizma
- **kısaltıldı:** „Bir teknoloji şirketi veri paylaşımını kabul etti. Aynı hafta başka bir Meralis fonu yeni adla kuruldu.“ çıkarıldı — Yeni adla devam fikri 3243'te zaten var
- **kısaltıldı:** „Biri kozasından çıkarak değişimi, diğeri sevdiği ateşte kendini kaybetmeyi çağrıştırıyordu.“ çıkarıldı — Önceki iki cümlenin özeti
- **silindi:** „Elbette kelebeğin Yunan sanatından veya Divan şiirinden haberi yoktu. Sembolün bilgisi onda değil, ona bakarken verdiğim karardaydı.“ — 3350 ile üst üste; aynı fikir 3370'te de var

#### 47. Son Olduğunu Bilmeden

- **kısaltıldı:** „Duru'ya bıraktığım defterden farklıydı: Ona tamamlayacağı bir görev değil, dilerse hiç açmayacağı bir boşluk kalacaktı.“ çıkarıldı — Boş sayfa fikrini ikinci kez açıklıyor
- **kısaltıldı:** „Çocuklara bir kehanet daha bırakmak istemiyordum. Benden kalacak sesin nerede durduğunu bilmelerini istiyordum.“ çıkarıldı — Gerekçe 3536 ve 3551'de yeniden söyleniyor
- **kısaltıldı:** „Büyük bir şey yaptığımda bedenim ya saatlerce aynı yerde oturmak ya da amaçsızca yürümek isterdi. Bu kez yürüdüm.“ çıkarıldı — Açıklayıcı ara cümle; tempo
- **kısaltıldı:** „Düzeni bulmak için bütün dağınıklığın görünür kalması gerekiyordu.“ çıkarıldı — Önceki cümlenin açıklaması
- **silindi:** „“Bizim yeteneklerimiz birleşince niye düzen çıkmıyor?” diye sordum.“ — Çekmece sahnesi jestle zaten anlatılıyor; tempo
- **silindi:** „“Çünkü sen sistem kuruyorsun ama sisteme uymuyorsun.”“ — Çekmece sahnesi jestle zaten anlatılıyor; tempo
- **silindi:** „“Sen?”“ — Çekmece sahnesi jestle zaten anlatılıyor; tempo
- **silindi:** „“Ben sistemin daha iyisini yaparken eskisini bozuyorum.”“ — Çekmece sahnesi jestle zaten anlatılıyor; tempo
- **kısaltıldı:** „Süresinin kısa olması sevgisinin küçük olduğu anlamına gelmiyordu.“ çıkarıldı — Jesti açıklayan cümle
- **silindi:** „“Bu kadar basit mi?”“ — Esprili ek atışma; tempo
- **silindi:** „“Hayır. Basit cümle kurdum diye kolay sanma.”“ — Esprili ek atışma; tempo
- **kısaltıldı:** „Radyoda eski bir türkü çalıyordu.“ çıkarıldı — Dekor; finalde dönmeyen ayrıntı
- **silindi:** „İnsanı kibirden kurtaran şey bazen kozmik vahiy değil, trafiktir.“ — 3436'nın gösterdiğini aforizmayla bağlıyor
- **silindi:** „İnsan bütün hakikati hatırlasa bile çocuğu karşısında son sözü söyleyemiyordu. Bu, evrenin dengesiydi.“ — Sahnenin gösterdiğini aforizmayla tekrar ediyor
- **kısaltıldı:** „Emir, eski duvar saatine dijital bir kalp sensörü takmış; saatin benim nabzımla hızlanmasını sağlamıştı. Bunun rahatlatıcı olmadığını söyleyince “En azından ge…“ çıkarıldı — Nabızlı saat aynı gün 3399'da anlatıldı
- **silindi:** „Hayat, büyük final duygumuza saygı göstermeden ayrıntı üretmeye devam ediyordu.“ — ‘Büyük final’ fikri 3436-3437'de var
- **silindi:** „Kaydetmek bazen yaşamamak için kullandığımız şık bir bahanedir. Anı kaybolmasın diye ekrana bakar, tam da o sırada anın içinden çıkarız.“ — Sahnenin gösterdiğini öğüt olarak tekrar ediyor
- **kısaltıldı:** „Temasın ne zaman başlayacağını kendisi seçmek isterdi.“ çıkarıldı — Jesti açıklayan cümle; okur çıkarabiliyor
- **kısaltıldı:** „Hiçbir plan buna cevap hazırlamamıştı.“ çıkarıldı — Önceki cümlenin tekrarı

#### 50. Boş Bırakılan Son Cümle

- **kısaltıldı:** „Başladıkları yer, yaşadıklarını geri almıyordu.“ çıkarıldı — Üst üste antitez; sonraki cümle daha güçlü
- **kısaltıldı:** „Geçmişi anlamak, orada söylenmiş sözü geri almak değildi.“ çıkarıldı — Aynı antitez 3609'da; üst üste
- **kısaltıldı:** „Ben onların sahibi olmamıştım.“ çıkarıldı — Önceki cümlenin tekrarı
- **kısaltıldı:** „Yıllardır bildiğim cümleyi, ilk defa taşıdığım hayatların içinden duyuyordum.“ çıkarıldı — Önceki cümlenin tekrarı
- **kısaltıldı:** „Hatırlamak da başkasının hayatını kendi rüyam ilan etme hakkı vermiyordu.“ çıkarıldı — Üç antitez üst üste; ikisi kaldı
- **kısaltıldı:** „Bir hayatın hafızasına ötekini ekledikçe yer daralmıyordu.“ çıkarıldı — İki cümle aynı fikir; güçlüsü kaldı

### Editör müdahaleleri (jüri önerileri, lektör notları)


#### 2. Siyah Paket

- **değiştirildi:** „Sessiz Ses konuşmadı.“ → „Sessiz Ses konuşmadı. Ona bu adı en çok sustuğu için vermiştim; konuştuğu nadir anlarda da sesini hiç yükseltmezdi.“ — „Sessiz Ses“ hem susan tanık hem de en otoriter iç ses olarak okunuyordu (jüri); ilk geçtiği yerde adı tek cümleyle açıklanıyor, sonraki konuşmaları tutarlı hâle geliyor.

#### 49. Geride Kalanlar

- **eklendi:** „Ölüm belgesine 14.53 yazılmıştı. Emir, monitörün saatiyle koridordaki saat arasında iki dakika fark olduğunu söyledi; doktorun hangisine bakarak saati söylediğini kimse bilmiyordu. Duru karganın 14.52'de konduğunu anlatmaktan vazgeçmedi. İkisi de haklı olabilirdi. Babamın saati bana suçluluğun bir saate ihtiyacı olduğunu öğretmişti; çocuklarımın elinde aynı saat suçluluk olarak değil, hatıra olar…“ — Sayıların çift anlamı (35. bölümde babanın saati: „zihnim 14.53'ü seçmişti“) finalde de açık kalıyor; olay örgüsü değişmiyor, ölüm saati yalnızca kesinlik iddiasını kaybediyor (jüri önerisi).

#### 13. Bedenin İtirazı

- **değiştirildi:** „Başka kişilerin isimlerini kapattım. Cevap yerine bir soru geldi:“ → „Başka kişilerin isimlerini kapattım. Kısa bir cevap geldi:“ — Ardından gelen mesaj soru değil; „Cevap yerine bir soru geldi“ metinle çelişiyordu (lektör notu).

### Bağımsız kontrol sonrası dikiş düzeltmeleri


#### 5. Bir Tanının Geldiği Yer

- **eklendi:** „Geçmişi hatırlamak artık yalnız kendimi anlamak değildi. Birinin beni hangi kapıdan izlediğini bulmaktı.“ — Nehir'in sorusundan geri dönüşe geçiş köprüsüz kalıyordu; eski cümle aynen geri getirildi (kurgu açısından da gerekli: izlenme izleği).

#### 39. ŞAMAN

- **değiştirildi:** „Ben o geleneklerden birinin“ → „Ben Leyla'nın saydığı geleneklerden birinin“ — „o gelenekler“ silinen Tunguz cümlesine bağlıydı; Leyla'nın 5. bölümdeki listesine açıkça bağlandı.


## D. ŞAHİT – Son okuma ve jüri sonrası düzeltmeler

Toplam 235 işlem.

**Toplam:** 36.400 → 36.452 kelime (+52; +0.1 %)

| Bölüm | Önce | Sonra | Fark |
|---|---:|---:|---:|
| (Ön kısım) | 130 | 130 | +0 |
| Başlangıç | 884 | 884 | +0 |
| AZ ÇOK | 1382 | 1383 | +1 |
| DAKTİLO | 2565 | 2565 | +0 |
| TECRİT ODASI | 1791 | 1793 | +2 |
| UNUTMA | 1714 | 1714 | +0 |
| AN | 552 | 553 | +1 |
| FİT NE? | 1708 | 1707 | -1 |
| MUHİBBİ | 889 | 890 | +1 |
| OKU | 1668 | 1670 | +2 |
| AŞK İLE | 1608 | 1609 | +1 |
| GÜL KOKUSU | 945 | 947 | +2 |
| HODRİ | 1916 | 1914 | -2 |
| SOLUCAN | 1907 | 1905 | -2 |
| ON BİR | 2230 | 2230 | +0 |
| KAYIT | 1414 | 1425 | +11 |
| NAZIM'IN ANAHTARI | 365 | 365 | +0 |
| HAKAN'IN DOSYASI | 354 | 354 | +0 |
| MIZRAĞIN İKİ UCU | 2428 | 2428 | +0 |
| ŞEHRİN ÜÇ ŞAHİDİ | 412 | 412 | +0 |
| SUSAYANIN YOLU | 1127 | 1140 | +13 |
| MUHİBBİ'NİN SOFRASI | 737 | 737 | +0 |
| MEKTUBU KİM YAZDI? | 455 | 469 | +14 |
| KÂĞIDIN ÖTE YANI | 427 | 432 | +5 |
| ANNEMİN SESİ | 541 | 541 | +0 |
| SUSUZLUK | 364 | 364 | +0 |
| MUHİBBİ YOK | 304 | 304 | +0 |
| HAKİKAT MEDENİ | 1055 | 1057 | +2 |
| BOŞ SIRA | 324 | 324 | +0 |
| AYNI EL | 1214 | 1214 | +0 |
| HAKAN'IN CEVABI | 539 | 539 | +0 |
| VİLDAN'IN GÖRDÜĞÜ | 663 | 663 | +0 |
| ÜÇ VURUŞ | 296 | 296 | +0 |
| İÇERİDEKİ YAZAR | 418 | 419 | +1 |
| ŞAHİT | 464 | 464 | +0 |
| SU | 610 | 611 | +1 |

### Son okuma (düzelti): yazım, dilbilgisi, noktalama, tutarlılık


#### Başlangıç

- **değiştirildi:** „Şahitle“ → „şahitle“ — [tutarlılık] [14]’teki aynı soruyla uyum: cins isim küçük harfle (büyük harfle özel ad olsa kesme gerekirdi)
- **değiştirildi:** „aşığız“ → „âşığız“ — [tutarlılık] âşık (TDK) yazımıyla birlik
- **değiştirildi:** „Halk etmiştir“ → „halk etmiştir“ — [yazım] halk etmek = yaratmak; cümle içinde küçük harf
- **değiştirildi:** „Nâsıra’lı“ → „Nâsıralı“ — [yazım] -lı yapım eki kesmeyle ayrılmaz (TDK)
- **değiştirildi:** „Ahmed’ten“ → „Ahmed’den“ — [yazım] ünsüz uyumu: d ile biten ada -den
- **değiştirildi:** „tüm aşıklar“ → „tüm âşıklar“ — [tutarlılık] âşık (TDK) yazımıyla birlik

#### AZ ÇOK

- **değiştirildi:** „Bana tarif edilen bina, amfinin bulunduğu aynı bina,“ → „Bana tarif edilen binada, amfinin bulunduğu aynı binada,“ — [dilbilgisi] yüklemsiz kalan özne; bulunma durumu eki
- **değiştirildi:** „müdahale mi eder” dedi“ → „müdahale mi eder?” dedi“ — [noktalama] soru cümlesinde eksik soru işareti
- **değiştirildi:** „otursa mıydım.“ → „otursa mıydım?“ — [noktalama] soru cümlesi soru işaretiyle biter
- **değiştirildi:** „arttırdım“ → „artırdım“ — [yazım] artır- (TDK), çoğaltmak anlamında
- **değiştirildi:** „ateş basan halinden“ → „ateş basan hâlinden“ — [tutarlılık] kitapta baskın yazım: hâl
- **değiştirildi:** „aile evradımdan“ → „aile efradımdan“ — [yazım] efrat (fertler) → efradımdan
- **değiştirildi:** „tabi siz de“ → „tabii siz de“ — [yazım] tabii (elbette); tabi = bağımlı
- **değiştirildi:** „Memnun oldum Hocam.“ → „Memnun oldum hocam.“ — [yazım] seslenmede tek başına hocam küçük harf (kitap genelinde)
- **değiştirildi:** „Kaptan Arif sokağa“ → „Kaptan Arif Sokağı’na“ — [tutarlılık] sokak adı; [127] Kaptan Arif Sokağı’nı ile uyum
- **değiştirildi:** „her sosyal medya yorumlarına“ → „her sosyal medya yorumuna“ — [dilbilgisi] her + tekil
- **değiştirildi:** „Bu vakanın kişilik“ → „Bu vaka kişilik“ — [dilbilgisi] bozuk cümle: özne yalın olmalı (Bu vaka … önem arz ediyor)
- **değiştirildi:** „karışmış durumdaki şu anda“ → „karışmış durumda ki şu anda“ — [yazım] o kadar … ki: bağlaç ki ayrı yazılır

#### DAKTİLO

- **değiştirildi:** „pür dikkat“ → „pürdikkat“ — [yazım] TDK: pürdikkat bitişik
- **değiştirildi:** „binbir dil“ → „bin bir dil“ — [yazım] TDK: bin bir ayrı yazılır
- **değiştirildi:** „kapanmış halde“ → „kapanmış hâlde“ — [tutarlılık] kitapta baskın yazım: hâl
- **değiştirildi:** „yetenekli vakanızla“ → „yetenekli hastanızla“ — [anlam] Hakan’ın [150]’deki ‘hasta değil, vaka’ düzeltmesi ancak Sefa ‘hasta’ derse anlamlı (bkz. [104], [111])
- **değiştirildi:** „Yolcu ve Şahidin“ → „Yolcu ve Şahit'in“ — [yazım] özel ad olarak büyük harfli Şahit kesmeyle; [320] Yolcu ile Şahit'i ile uyum
- **değiştirildi:** „Kapıdan çıkınca“ → „Kapıdan çıkmadan“ — [anlam] Vildan odadan [218]’de çıkıyor, onlar [219]’da ardından çıkıyor; ‘çıkınca’ çelişiyordu

#### TECRİT ODASI

- **değiştirildi:** „sarkmış halde“ → „sarkmış hâlde“ — [tutarlılık] aynı paragrafta ‘bu hâlde’; baskın yazım hâl
- **değiştirildi:** „tavırlarındaki değişimi“ → „tavırlarımdaki değişimi“ — [dilbilgisi] iyelik: anlatıcının tavırları
- **değiştirildi:** „hikayesi?“ → „hikâyesi?“ — [tutarlılık] kitapta baskın yazım: hikâye

#### UNUTMA

- **değiştirildi:** „Beyim, Size“ → „beyim, size“ — [yazım] cümle içinde seslenme ve zamir küçük harf

#### AN

- **değiştirildi:** „kimse bu şahit önemli“ → „her kimse bu şahit, önemli“ — [dilbilgisi] ‘kimse’ (hiç kimse) ile karışmasın: her kimse (kim ise)
- **değiştirildi:** „Meryem Oğlu“ → „Meryem oğlu“ — [tutarlılık] [36] Meryem oğlu İsa ile uyum
- **değiştirildi:** „Hz İsa’ya“ → „Hz. İsa’ya“ — [yazım] Hz. kısaltması noktalı
- **değiştirildi:** „Hz İsa’nın“ → „Hz. İsa’nın“ — [yazım] Hz. kısaltması noktalı
- **değiştirildi:** „Hz Muhammed’i“ → „Hz. Muhammed’i“ — [yazım] Hz. kısaltması noktalı
- **değiştirildi:** „son sözlerini henüz“ → „son sözleri henüz“ — [dilbilgisi] özne yalın: sözleri … yankılandı

#### FİT NE?

- **değiştirildi:** „şeddeliydi“ → „şiddetliydi“ — [yazım] şiddetli
- **değiştirildi:** „saflar halinde“ → „saflar hâlinde“ — [tutarlılık] kitapta baskın yazım: hâl
- **değiştirildi:** „nereye gidiyorsunuz’ dedim“ → „nereye gidiyorsunuz?’ dedim“ — [noktalama] soru cümlesinde eksik soru işareti
- **değiştirildi:** „olağanca“ → „olanca“ — [yazım] olanca hızımla
- **değiştirildi:** „‘Adem’e“ → „‘Âdem’e“ — [tutarlılık] kitapta baskın yazım: Âdem
- **değiştirildi:** „Müsaade istemem“ → „Müsaade istedim“ — [anlam] İblis izin istemiş ve almıştır ([450]); ‘istemem’ anlamı tersine çeviriyordu
- **değiştirildi:** „Havva ve Adem’i“ → „Havva ve Âdem’i“ — [tutarlılık] kitapta baskın yazım: Âdem
- **değiştirildi:** „Şecere Adem’in“ → „Şecere Âdem’in“ — [tutarlılık] kitapta baskın yazım: Âdem
- **değiştirildi:** „Adem’in ağlaması“ → „Âdem’in ağlaması“ — [tutarlılık] kitapta baskın yazım: Âdem
- **değiştirildi:** „Toprak olan“ → „toprak olan“ — [yazım] cümle içinde cins isim küçük harf (su, hava, ateş gibi)
- **değiştirildi:** „arttırarak“ → „artırarak“ — [yazım] artır- (TDK)
- **değiştirildi:** „Bu nedir İblis“ → „Bu nedir iblis“ — [tutarlılık] seslenmede bölüm boyunca küçük harf (Söyle iblis, Aptal iblis)
- **değiştirildi:** „Adem’in“ → „Âdem’in“ — [tutarlılık] kitapta baskın yazım: Âdem
- **değiştirildi:** „isimlerin hepsi“ → „isimlerinin hepsi“ — [dilbilgisi] Âdem soyunun isimlerinin hepsi (iyelik)
- **değiştirildi:** „sen hala“ → „sen hâlâ“ — [yazım] hâlâ (henüz); hala = babanın kız kardeşi
- **değiştirildi:** „yer yüzüne“ → „yeryüzüne“ — [yazım] yeryüzü bitişik
- **değiştirildi:** „bu tahtta oturttuğum“ → „bu tahta oturttuğum“ — [dilbilgisi] oturtmak yönelme durumu ister

#### MUHİBBİ

- **değiştirildi:** „halim harap“ → „hâlim harap“ — [tutarlılık] kitapta baskın yazım: hâl
- **değiştirildi:** „yavana atılır“ → „yabana atılır“ — [yazım] yabana atılmak
- **değiştirildi:** „iyi misiniz” dedi“ → „iyi misiniz?” dedi“ — [noktalama] soru cümlesinde eksik soru işareti
- **değiştirildi:** „ne hocası...”“ → „ne hocası…”“ — [noktalama] kitap genelinde üç nokta karakteri (…)
- **değiştirildi:** „Hemen Hocam.“ → „Hemen hocam.“ — [yazım] seslenmede tek başına hocam küçük harf (kitap genelinde)
- **değiştirildi:** „o hoşbeş“ → „o hoş beş“ — [tutarlılık] TDK: hoş beş ayrı; aynı paragrafta ‘İki hoş beşten’
- **değiştirildi:** „Kriton Curi parkı“ → „Kriton Curi Parkı“ — [yazım] özel adın parçası büyük harf
- **değiştirildi:** „neler yazıyorsunuz” gibi“ → „neler yazıyorsunuz?” gibi“ — [noktalama] soru cümlesinde eksik soru işareti
- **değiştirildi:** „yığınlar halinde“ → „yığınlar hâlinde“ — [tutarlılık] kitapta baskın yazım: hâl

#### OKU

- **değiştirildi:** „iyi hikayeler“ → „iyi hikâyeler“ — [tutarlılık] hikâye (kitaptaki baskın yazım)
- **değiştirildi:** „Hala karışık!“ → „Hâlâ karışık!“ — [yazım] hâlâ (henüz anlamında)
- **değiştirildi:** „Hz Adem’i“ → „Hz. Âdem’i“ — [tutarlılık] Hz. noktalı; Âdem (kitaptaki baskın yazım)
- **değiştirildi:** „kan dökücü Can Tayfasına“ → „kan dökücü can tayfasına“ — [tutarlılık] aynı paragrafta 'can tayfası' küçük harfle
- **değiştirildi:** „söylenen hikâyelerine.“ → „söylenen hikâyelerine ulaşacaktım.“ — [dilbilgisi] eksik yüklem: 'tanışacaktım' -la ister, 'hikâyelerine' yüklemsiz kalıyordu
- **değiştirildi:** „Tabi en doğrusunu“ → „Tabii en doğrusunu“ — [yazım] tabii (elbette), tabi (bağlı) değil
- **değiştirildi:** „akıl baliğ“ → „âkil bâliğ“ — [yazım] âkil bâliğ
- **değiştirildi:** „ilk minik adımı“ → „ilk minik adımını“ — [dilbilgisi] belirtme hâli: adımını atmak
- **değiştirildi:** „ciddi miydi acaba”“ → „ciddi miydi acaba?”“ — [noktalama] iç sesteki soru cümlesi soru işaretiyle bitmeli
- **değiştirildi:** „köpek necisi hayvandır“ → „köpek necis hayvandır“ — [yazım] necis (murdar); 'necisi' yanlış
- **değiştirildi:** „sanatın neden icra etmesi“ → „sanatın neden icra edilmesi“ — [dilbilgisi] edilgen: sanat icra edilir
- **değiştirildi:** „Pek tabi,“ → „Pek tabii,“ — [yazım] tabii (elbette)
- **değiştirildi:** „yazar bir ademle“ → „yazar bir âdemle“ — [tutarlılık] âdem (insan); kitapta 'arif âdem'
- **değiştirildi:** „anlatacağım hikayeyi“ → „anlatacağım hikâyeyi“ — [tutarlılık] hikâye

#### AŞK İLE

- **değiştirildi:** „Kasım Ay’ının“ → „Kasım ayının“ — [yazım] ay adıyla 'ay' sözcüğü: Kasım ayının
- **değiştirildi:** „Pazar yerinde“ → „pazar yerinde“ — [yazım] pazar yeri özel ad değil
- **değiştirildi:** „Sağ omuzunun“ → „Sağ omzunun“ — [yazım] omuz → omzu (ünlü düşmesi)
- **değiştirildi:** „60 senendir“ → „60 senedir“ — [yazım] yazım hatası: senedir
- **değiştirildi:** „oğlum B’de mi görmedin“ → „oğlum B de mi görmedin“ — [yazım] bağlaç 'de' ayrı yazılır (B de mi)
- **değiştirildi:** „terbiye eden ademin“ → „terbiye eden âdemin“ — [tutarlılık] âdem (insan)
- **değiştirildi:** „sesi kulaklarımda yattığım“ → „sesi kulaklarımda, yattığım“ — [noktalama] iki yargı arasında virgül eksik; cümle yanlış okunuyordu
- **değiştirildi:** „odun kırmaya aşık“ → „odun kırmaya âşık“ — [tutarlılık] âşık (aynı paragrafta 'âşık olmadığın')
- **değiştirildi:** „yazmaya aşık senden“ → „yazmaya âşık senden“ — [tutarlılık] âşık
- **değiştirildi:** „yazmaya aşık değilsen“ → „yazmaya âşık değilsen“ — [tutarlılık] âşık
- **değiştirildi:** „Allah, Allah; Ne“ → „Allah, Allah; ne“ — [noktalama] noktalı virgülden sonra küçük harf

#### GÜL KOKUSU

- **değiştirildi:** „namazımı niyaz ettim“ → „namazımı eda ettim“ — [anlam] namaz niyaz edilmez; eda edilir
- **değiştirildi:** „mesaini bitirenlerle“ → „mesaisini bitirenlerle“ — [dilbilgisi] 3. tekil iyelik: mesaisini
- **değiştirildi:** „yoktu, kağıtlar masanın“ → „yoktu, kâğıtlar masanın“ — [tutarlılık] kâğıt
- **değiştirildi:** „bu kağıtları gül kokusunda bulayıp“ → „bu kâğıtları gül kokusuna bulayıp“ — [dilbilgisi] bulamak yönelme ister: kokusuna bulamak; kâğıt
- **değiştirildi:** „Kağıtları çıkarttım“ → „Kâğıtları çıkarttım“ — [tutarlılık] kâğıt
- **değiştirildi:** „hayat hikayemi“ → „hayat hikâyemi“ — [tutarlılık] hikâye
- **değiştirildi:** „roman karakterlerin çoğu“ → „roman karakterlerinin çoğu“ — [dilbilgisi] tamlayan eki eksik: karakterlerinin çoğu
- **değiştirildi:** „hızımı arttırarak“ → „hızımı artırarak“ — [yazım] artırmak (TDK)
- **değiştirildi:** „sebebini ikimizde biliyoruz“ → „sebebini ikimiz de biliyoruz“ — [yazım] bağlaç 'de' ayrı: ikimiz de
- **değiştirildi:** „İşte konumuzda tam“ → „İşte konumuz da tam“ — [yazım] bağlaç 'da' ayrı: konumuz da
- **değiştirildi:** „direnen ve diremeyenler“ → „direnen ve direnemeyenler“ — [yazım] direnmek → direnemeyenler
- **değiştirildi:** „Kim neyin sahip ki“ → „Kim neyin sahibi ki“ — [dilbilgisi] neyin sahibi (tamlanan eki eksik)

#### HODRİ

- **değiştirildi:** „Onikiler caminde“ → „Onikiler camisinde“ — [yazım] cami → camisi (kitapta da 'camisinde')
- **değiştirildi:** „vakit veya Cuma namazlarını“ → „vakit veya cuma namazlarını“ — [yazım] cuma namazı küçük harfle (bkz. 'bir cuma günü')
- **değiştirildi:** „“Aç mısın” dedim?“ → „“Aç mısın?” dedim.“ — [noktalama] soru işareti alıntının içinde olmalı
- **değiştirildi:** „kafamı Hodri ’ye“ → „kafamı Hodri’ye“ — [noktalama] kesme işaretinden önce boşluk olmaz
- **değiştirildi:** „hiç tanımadığı bir müptezelin“ → „hiç tanımadığım bir müptezelin“ — [dilbilgisi] özne anlatıcı: tanımadığım
- **değiştirildi:** „Gayri ihtiyari ardıma“ → „Gayriihtiyari ardıma“ — [yazım] gayriihtiyari bitişik (TDK)
- **değiştirildi:** „yüzü traşlı“ → „yüzü tıraşlı“ — [yazım] tıraşlı (TDK)
- **değiştirildi:** „caddesindeki Gül Pastanesine“ → „Caddesi’ndeki Gül Pastanesi’ne“ — [yazım] özel ad: Mandıra Caddesi’ndeki, Gül Pastanesi’ne (bkz. Gül Pastanesi’nin)
- **değiştirildi:** „o yarım hikayesi“ → „o yarım hikâyesi“ — [tutarlılık] hikâye
- **değiştirildi:** „zaten aşıklardır“ → „zaten âşıklardır“ — [tutarlılık] âşık
- **değiştirildi:** „yarım hikayelerini“ → „yarım hikâyelerini“ — [tutarlılık] hikâye
- **değiştirildi:** „tam da Cuma namazı“ → „tam da cuma namazı“ — [yazım] cuma namazı küçük harfle
- **değiştirildi:** „çimenle olan hikayesini“ → „çimenle olan hikâyesini“ — [tutarlılık] hikâye
- **değiştirildi:** „Fikirtepe’ de“ → „Fikirtepe’de“ — [noktalama] kesme işaretinden sonra boşluk olmaz
- **değiştirildi:** „rüyam hala bitmedi“ → „rüyam hâlâ bitmedi“ — [yazım] hâlâ (henüz)
- **değiştirildi:** „o sıkıntılı halde kalmamıştı“ → „o sıkıntılı hal de kalmamıştı“ — [yazım] bağlaç 'de' ayrı: hal de kalmamıştı
- **değiştirildi:** „birkaç aşık dervişin hikayelerini“ → „birkaç âşık dervişin hikâyelerini“ — [tutarlılık] âşık, hikâye
- **değiştirildi:** „dünyada gelmeden“ → „dünyaya gelmeden“ — [dilbilgisi] yönelme hâli: dünyaya gelmek
- **değiştirildi:** „Mustafa Sefa, Umre ziyaretimi“ → „Mustafa Sefa, umre ziyaretimi“ — [yazım] umre küçük harfle (bkz. 'umreye gittim')
- **değiştirildi:** „Fikirtepe ’de“ → „Fikirtepe’de“ — [noktalama] kesme işaretinden önce boşluk olmaz
- **değiştirildi:** „aylarını hiçte hastane“ → „aylarını hiç de hastane“ — [yazım] bağlaç 'de' ayrı: hiç de
- **değiştirildi:** „“abdestin var mı“ → „“Abdestin var mı“ — [yazım] alıntı cümlesi büyük harfle başlar

#### SOLUCAN

- **değiştirildi:** „Saygı adı başlığı altında“ → „Saygı adı altında“ — [dilbilgisi] iki sözcük üst üste kalmış (adı/başlığı); 'adı altında'
- **değiştirildi:** „tabi saklar“ → „tabii saklar“ — [yazım] tabii (elbette)
- **değiştirildi:** „mütevaziliğinin“ → „mütevazılığının“ — [yazım] mütevazı → mütevazılık (TDK)
- **değiştirildi:** „haşmetli hünkarımız“ → „haşmetli hünkârımız“ — [yazım] hünkâr (TDK)
- **değiştirildi:** „jargonlu hikayeler“ → „jargonlu hikâyeler“ — [tutarlılık] hikâye
- **değiştirildi:** „baş danışması ile“ → „başdanışmanı ile“ — [yazım] başdanışman bitişik; 'danışması' yanlış
- **değiştirildi:** „Tüyap Kongre Merkezinde“ → „Tüyap Kongre Merkezi’nde“ — [yazım] özel ada gelen ek kesmeyle ayrılır
- **değiştirildi:** „fark ettik abi bizde“ → „fark ettik abi biz de“ — [yazım] bağlaç 'de' ayrı: biz de
- **değiştirildi:** „Allah’ın benden razı olmadan“ → „Allah benden razı olmadan“ — [dilbilgisi] özne yalın olmalı: Allah benden razı olmadan
- **değiştirildi:** „katipleriniz“ → „kâtipleriniz“ — [tutarlılık] kâtip (kitapta 'kâtip')
- **değiştirildi:** „150 milyon metre kare“ → „150 milyon kilometre kare“ — [olgu] Dünya'nın kara yüzölçümü ~150 milyon km²
- **değiştirildi:** „bu kadarının yapmışsın“ → „bu kadarını yapmışsın“ — [dilbilgisi] belirtme hâli: bu kadarını
- **değiştirildi:** „Katiplerim“ → „Kâtiplerim“ — [tutarlılık] kâtip
- **değiştirildi:** „her elçimin ordularımı vardı peşinden takip eden.“ → „her elçimin orduları mı vardı peşinden takip eden?“ — [yazım] soru eki ayrı yazılır; cümle soru
- **değiştirildi:** „Hakk’ı Hakikati“ → „Hakk’ı hakikati“ — [tutarlılık] bkz. [734] 'Hakk’ı hakikati'
- **değiştirildi:** „üç kağıtçı“ → „üçkâğıtçı“ — [yazım] üçkâğıtçı bitişik (TDK)
- **değiştirildi:** „anti sosyal“ → „antisosyal“ — [yazım] antisosyal bitişik (TDK)
- **değiştirildi:** „kendi hikayesinin“ → „kendi hikâyesinin“ — [tutarlılık] hikâye
- **değiştirildi:** „oranda taktim ve tahsis“ → „oranda takdir ve tahsis“ — [yazım] takdir (taktim değil)
- **değiştirildi:** „Bulduğunu zannediyor mu evet, içiyor mu? Evet.“ → „Bulduğunu zannediyor mu? Evet. İçiyor mu? Evet.“ — [noktalama] soru-cevap dizisinde eksik soru işareti ve büyük harf

#### ON BİR

- **değiştirildi:** „deniz Ben artık deniz değilim mi der?“ → „deniz ‘Ben artık deniz değilim’ mi der?“ — [noktalama] iç alıntı tırnak içine
- **değiştirildi:** „Sen Şahit kim? diye“ → „Sen ‘Şahit kim?’ diye“ — [noktalama] iç alıntı tırnak içine
- **değiştirildi:** „Bir gün Kim şahitlik ediyor?, sonra Şahitlik kime ait?, belki en sonunda Bu soruyu duyan ne? diyeceksin“ → „Bir gün ‘Kim şahitlik ediyor?’ sonra ‘Şahitlik kime ait?’ belki en sonunda ‘Bu soruyu duyan ne?’ diyeceksin“ — [noktalama] iç alıntılar tırnak içine; '?,' birleşimi kaldırıldı

#### MIZRAĞIN İKİ UCU

- **değiştirildi:** „vermişti, İşte bunu“ → „vermişti, işte bunu“ — [noktalama] Virgülden sonra büyük harf: ', İşte' → ', işte'
- **değiştirildi:** „aynını yaptılar“ → „aynısını yaptılar“ — [yazım] 'aynını' → 'aynısını'
- **değiştirildi:** „Kızıl denizi“ → „Kızıldeniz’i“ — [yazım] Özel ad bitişik ve kesme işaretiyle: Kızıldeniz’i (TDK)
- **değiştirildi:** „Allahtan emir“ → „Allah’tan emir“ — [yazım] Özel ada gelen ek kesmeyle ayrılır
- **değiştirildi:** „endişelerini arttırmak“ → „endişelerini artırmak“ — [yazım] 'arttır-' → 'artır-' (TDK, çoğaltmak anlamında)
- **değiştirildi:** „vehmini arttırdı“ → „vehmini artırdı“ — [yazım] 'arttır-' → 'artır-' (TDK)
- **değiştirildi:** „Allahtan yüz“ → „Allah’tan yüz“ — [yazım] Özel ada gelen ek kesmeyle ayrılır
- **değiştirildi:** „adı Balakt’ı.“ → „adı Balakt’tı.“ — [dilbilgisi] Ek-fiil: 'Balakt’tı' (adı Balakt idi); 'Balakt’ı' belirtme hâli
- **değiştirildi:** „kuklam bu olmadı“ → „kuklam bu olmalı“ — [anlam] Anlam ters: şeytan kuklasını seçiyor → 'bu olmalı'
- **değiştirildi:** „zevki sefaya“ → „zevk ü sefaya“ — [yazım] TDK: zevk ü sefa
- **değiştirildi:** „âlimdir’ Vezir“ → „âlimdir.’ Vezir“ — [noktalama] Alıntı cümlesi bitiyor, yeni cümle başlıyor: nokta eksik
- **değiştirildi:** „karısına çok aşıktı“ → „karısına çok âşıktı“ — [tutarlılık] âşık (TDK; kitapta birleştirme)
- **değiştirildi:** „ondan ricalimiz vardır“ → „ondan ricamız vardır“ — [yazım] 'rical' (devlet adamları) değil, 'rica': ricamız
- **değiştirildi:** „Diye geçirdi“ → „diye içinden geçirdi“ — [noktalama] ’ Diye → ’ diye; 'içinden' eksik (kitaptaki kullanım: diye geçirdim içimden)
- **değiştirildi:** „‘tamam bu işi bitmiş bilin’ Artık“ → „‘Tamam bu işi bitmiş bilin.’ Artık“ — [noktalama] Alıntı büyük harfle başlar, cümle sonu noktası eksik
- **değiştirildi:** „bize sahiplenir“ → „bizi sahiplenir“ — [dilbilgisi] 'sahiplenmek' belirtme hâli ister: bizi sahiplenir
- **değiştirildi:** „ilk söz sahibi senin olacağına“ → „ilk söz sahibinin sen olacağına“ — [dilbilgisi] Yanlış hâl eki: 'ilk söz sahibinin sen olacağına dair'
- **değiştirildi:** „‘Musaa peygamberdir“ → „‘Musa peygamberdir“ — [yazım] Yazım hatası: Musaa → Musa
- **değiştirildi:** „Ceylanın burada“ → „Ceylan’ın burada“ — [yazım] Bölümde özel ad olarak kullanılıyor (Ceylan’ın, 1198): kesme işareti
- **değiştirildi:** „Mikail Ceylanı“ → „Mikail Ceylan’ı“ — [yazım] Özel ada gelen ek kesmeyle ayrılır
- **değiştirildi:** „şeytandır’ Belam“ → „şeytandır.’ Belam“ — [noktalama] Alıntı cümlesi bitiyor: nokta eksik
- **değiştirildi:** „Sonra ağaçları,“ → „Sonra ağaçların,“ — [dilbilgisi] Sıralama 'ağaçların, ... taşların ettiği' olmalı (ilgi hâli)
- **değiştirildi:** „Konkoça Sahrasına“ → „Konkoça Sahrası’na“ — [yazım] Özel ada gelen ek kesmeyle ayrılır
- **değiştirildi:** „kalabalığı neredeyse her birini“ → „kalabalığın neredeyse her birini“ — [dilbilgisi] Çift nesne: 'kalabalığın neredeyse her birini'
- **değiştirildi:** „alemlerin onun yüzü“ → „alemleri onun yüzü“ — [dilbilgisi] 'alemleri ... yaratan Allah' (belirtme hâli)
- **değiştirildi:** „ümmeti Muhammed’in“ → „ümmet-i Muhammed’in“ — [yazım] Farsça tamlama: ümmet-i Muhammed
- **değiştirildi:** „diye yad edilen“ → „diye yâd edilen“ — [yazım] 'yâd etmek' (anmak); 'yad' = yabancı
- **değiştirildi:** „en başta gelen, hatta“ → „en başta geleni, hatta“ — [dilbilgisi] 'öğrenmişti' fiilinin nesnesi: en başta geleni
- **değiştirildi:** „aşıklar düşer“ → „âşıklar düşer“ — [tutarlılık] âşık (TDK; kitapta birleştirme)
- **değiştirildi:** „Ademler gelir“ → „Âdemler gelir“ — [tutarlılık] Âdem (kitapta baskın biçim)

#### ŞEHRİN ÜÇ ŞAHİDİ

- **değiştirildi:** „evrakların arasında başını“ → „evrakların arasından başını“ — [dilbilgisi] Başını ... arasından kaldırdı (ayrılma hâli)
- **değiştirildi:** „ağırlığını arttırmak“ → „ağırlığını artırmak“ — [yazım] 'arttır-' → 'artır-' (TDK)

#### SUSAYANIN YOLU

- **değiştirildi:** „onun diğer çocuklar gibi“ → „onu diğer çocuklar gibi“ — [dilbilgisi] 'sokağa salmak' belirtme hâli ister: onu
- **değiştirildi:** „Abülmülk ailenin“ → „Abülmülk ailesinin“ — [dilbilgisi] İyelik eki eksik: Abülmülk ailesinin
- **değiştirildi:** „Dİhkan“ → „Dihkan“ — [yazım] Büyük harf hatası: Dİhkan → Dihkan
- **değiştirildi:** „Hakk bir dinin“ → „Hak bir dinin“ — [yazım] 'Hakk' yalnız ünlüyle başlayan ekten önce; burada 'Hak'
- **değiştirildi:** „olup, biteni“ → „olup biteni“ — [noktalama] 'olup bitmek' kalıbına virgül girmez
- **değiştirildi:** „içindeki Hak ateşi, taptığı hiçbir ateş kadar yakıcı değildi“ → „taptığı hiçbir ateş, içindeki Hak ateşi kadar yakıcı değildi“ — [anlam] Anlam ters: Hak ateşinin taptığı ateşlerden zayıf olduğunu söylüyordu; bağlam tersini istiyor
- **değiştirildi:** „Orada bulunan piskopos, bu işi“ → „Orada bulunan piskopostan, bu işi“ — [anlam] Özne hatası: Şam’a giden Mabeh, piskopos değil (bkz. 1261)
- **değiştirildi:** „bir başka piskopostan öğrendiği“ → „bir başka piskoposun bildiğini öğrendiği“ — [anlam] Özne hatası düzeltmesinin devamı
- **değiştirildi:** „buradaki kimsede bir süre“ → „buradaki kimse de bir süre“ — [yazım] Bağlaç 'de' ayrı yazılır: kimse de
- **değiştirildi:** „aradığı kısmen“ → „aradığını kısmen“ — [dilbilgisi] Belirtme hâli eksik: aradığını
- **değiştirildi:** „ateş hala serinlememiştir“ → „ateş hâlâ serinlememiştir“ — [yazım] hâlâ (henüz anlamında); 'hala' = babanın kız kardeşi
- **değiştirildi:** „Barnabas İncilinde“ → „Barnabas İncili’nde“ — [yazım] Özel ada gelen ek kesmeyle ayrılır
- **değiştirildi:** „Kendisinin Arap topraklarından“ → „Kendisi Arap topraklarından“ — [dilbilgisi] Özne ilgi hâlinde olamaz: Kendisi ... çıkacak
- **değiştirildi:** „1.Hediyenden“ → „1. Hediyenden“ — [noktalama] Sıra sayısı noktasından sonra boşluk
- **değiştirildi:** „2.Ama“ → „2. Ama“ — [noktalama] Sıra sayısı noktasından sonra boşluk
- **değiştirildi:** „evladım” bir süre“ → „evladım.” Bir süre“ — [noktalama] Alıntı bitiyor, yeni cümle başlıyor: nokta ve büyük harf
- **değiştirildi:** „Arap Haydutlarına saldırılarına“ → „Arap haydutlarının saldırılarına“ — [dilbilgisi] Tamlama bozuk: Arap haydutlarının saldırılarına (küçük harf)
- **değiştirildi:** „henüz emin olmuştur“ → „henüz emin olamamıştır“ — [anlam] Anlam ters: 'henüz' ve sonraki haber, emin olmadığını gösteriyor
- **değiştirildi:** „bir başka yanına“ → „bir başkası yanına“ — [dilbilgisi] Kelime eksik/özne: 'bir başkası yanına koşarak gelmişti'
- **değiştirildi:** „Yesrib’e Kuba köyüne hicret“ → „Yesrib’e, Kuba köyüne biri hicret“ — [dilbilgisi] Özne eksik ('biri'); açıklayıcı iki yönelme arasına virgül
- **değiştirildi:** „verildiğini görünce“ → „verdiğini görünce“ — [dilbilgisi] 'hurmaları ... verdiğini' (etken; nesne belirtme hâlinde)
- **değiştirildi:** „peygamberlik alametinin ikincisidir“ → „peygamberlik alametlerinin ikincisidir“ — [dilbilgisi] 'ikincisi' çoğul tamlayan ister: alametlerinin
- **değiştirildi:** „Cebrail (AS) peygamberimize“ → „Cebrail’in (AS) peygamberimize“ — [dilbilgisi] 'aktarması' tamlayanı ilgi hâli ister: Cebrail’in
- **değiştirildi:** „40 altın ve üç yüz“ → „40 altın vermesini ve üç yüz“ — [dilbilgisi] Eksik yüklem: altın 'ekilmez'; 'vermesini' eklendi
- **değiştirildi:** „Hicaz’lı“ → „Hicazlı“ — [yazım] Yapım eki -lı kesmeyle ayrılmaz

#### MUHİBBİ'NİN SOFRASI

- **değiştirildi:** „yapıyordu, hala şahidi“ → „yapıyordu, hâlâ şahidi“ — [yazım] hâlâ (henüz anlamında)
- **değiştirildi:** „Bilali Habeşi“ → „Bilal-i Habeşi“ — [yazım] Farsça tamlama: Bilal-i Habeşi (bkz. Selman-ı Farisi)
- **değiştirildi:** „"Habeşî"“ → „‘Habeşî’“ — [noktalama] Konuşma içindeki alıntı tek tırnakla, düz tırnak yerine
- **değiştirildi:** „Ümeyye Bilal’e,“ → „Ümeyye Bilal’i,“ — [dilbilgisi] 'kamçılatmış ... ezmiştir' belirtme hâli ister: Bilal’i
- **değiştirildi:** „Hz Ebu Bekir“ → „Hz. Ebu Bekir“ — [yazım] Kısaltma noktası: Hz.
- **değiştirildi:** „Muhibbi amca“ → „Muhibbi Amca“ — [tutarlılık] Kitapta her yerde 'Muhibbi Amca'
- **değiştirildi:** „Selman’ı Farisi’yi“ → „Selman-ı Farisi’yi“ — [yazım] Farsça tamlama: Selman-ı Farisi (bkz. 1283)
- **değiştirildi:** „batılı olmayı“ → „Batılı olmayı“ — [yazım] TDK: Batılı

#### VİLDAN'IN GÖRDÜĞÜ

- **değiştirildi:** „diğeri mesaini paylaştığı“ → „diğeri mesaisini paylaştığı“ — [dilbilgisi] İyelik eki hatalı: mesaisini

### Jüri v6 sonrası editör müdahaleleri (içerik tutarlılığı, köprüler)


#### HAKİKAT MEDENİ

- **değiştirildi:** „Dosyanın bir sayfasında şizofreni tanısını gördüm.“ → „Dosyanın bir sayfasında şizofreni ön tanısını gördüm.“ — Beyindeki oluşum ve nöbetler henüz netleşmemişken kesin tanı klinik olarak tutarsız; „ön tanı“ (jüri).
- **değiştirildi:** „Bu tanı Hakan’a mı aitti yoksa bana mı?“ → „Bu ön tanı Hakan’a mı aitti yoksa bana mı?“ — Aynı.

#### DAKTİLO

- **değiştirildi:** „Hakan Hoca'nın sol ayağı eşiğe hafifçe takıldı.“ → „Hakan Hoca'nın sağ ayağı eşiğe hafifçe takıldı.“ — Oluşum konuşma bölgesine yakın (sol yarıküre); motor belirti sağ tarafta olur (jüri, nöroloji).

#### VİLDAN'IN GÖRDÜĞÜ

- **değiştirildi:** „Birkaç defa da sol ayağınız eşiğe sürttü.“ → „Birkaç defa da sağ ayağınız eşiğe sürttü.“ — Aynı (DAKTİLO ile uyumlu).

#### SOLUCAN

- **değiştirildi:** „Saat öğlene geliyor gibiydi, bıyıklarıma“ → „Saatin kaç olduğunu bilmiyordum; bıyıklarıma“ — ON BİR'de saat 10.44 okunuyor; nöbet sonrası „öğlene geliyor gibiydi“ izlenimi okurda çelişki gibi duruyordu (iki jüri).

#### ÜÇ VURUŞ

- **değiştirildi:** „Ertesi gün Psikiyatr Dr. Hakikat Bey’e“ → „Ertesi gün Prof. Dr. Hakikat Bey’e“ — KAYIT'taki unvanla aynı („Prof. Dr. Hakikat Medeni“).

#### TECRİT ODASI

- **değiştirildi:** „“Hani konuşmakta zorlandığını ve çalışmak istemediğini söylemiştin ya…“ → „“Hani konuşmakta zorlandığını, kabuğuna çekildiğini ve çalışmak istemediğini söylemiştin ya…“ — Hemen ardından gelen „Kabuk derken hocam?“ sorusunun dayanağı (AZ ÇOK'taki „kabuğuma çekilmiştim“ sözünü Hakan geri veriyor); iki jüri „kimse kabuk demedi“ diye işaretledi.

#### SUSAYANIN YOLU

- **değiştirildi:** „Hicaz bölgesine gidecek olan Yahudi bir kervancı başı ile tanışır.“ → „Hicaz bölgesine gidecek olan Kelb kabilesinden bir kervancı başı ile tanışır.“ — Kaynaklarda (İbn İshak) Selman'ı köle olarak satan Kelbli tüccarlardır; Yahudi'ye satılır (jüri: olgu düzeltmesi).
- **değiştirildi:** „Yahudi kervancı başı, sözünde durmayarak Mabeh’i köle olarak satmıştır. Yesrib’e götürülen Mabeh, bir hurma bahçesinde çalıştırılmak üzere, yine bir Yahudi’ye …“ → „kervancı başı, sözünde durmayarak Mabeh’i Vâdi’l-Kurâ’da bir Yahudi’ye köle olarak satmıştır. Yesrib’e götürülen Mabeh, bir hurma bahçesinde çalıştırılmak üzer…“ — Aynı (kaynaktaki sıra).
- **değiştirildi:** „Amuriye (Sivrihisar) taraflarında“ → „Amuriye (bugünkü Emirdağ yakınları) taraflarında“ — Amorium Sivrihisar değil, Emirdağ'a bağlı Hisarköy'dedir (jüri).
- **değiştirildi:** „Arap lisanını bilmeyen Mabeh bir tercüman ister“ → „derdini Arap lisanıyla anlatamayan Mabeh bir tercüman ister“ — Mabeh daha önce Araplarla konuşuyor; „hiç bilmeyen“ çelişkiydi.

#### FİT NE?

- **değiştirildi:** „isli ateşlerden libaslar“ → „dumansız ateşlerden libaslar“ — Cinler/şeytan „dumansız ateşten“ (mâric min nâr) yaratılmıştır (jüri).

#### MIZRAĞIN İKİ UCU

- **değiştirildi:** „Belam’ın güzel karısı kapıyı açtı“ → „Güzel karısı kapıyı açtı“ — Ad düzeltmesinden sonra arka arkaya iki „Belam’ın“ kalmasın.

#### OKU

- **değiştirildi:** „çünkü inançlarına göre dünyaya yani bu aleme geliş bir günahtır.“ → „çünkü inançlarına göre insan, Âdem’den miras kalan bir günahla dünyaya gelir.“ — Hristiyan „asli günah“ inancı doğru aktarıldı (jüri); Muhibbi'nin karşılaştırması aynen duruyor.

#### MEKTUBU KİM YAZDI?

- **değiştirildi:** „Ben alıştığım tamlamayı araya sokmuş, okuduğumu düzeltirken kendimi doğru sanmıştım.“ → „Ben alıştığım tamlamayı araya sokmuş, okuduğumu düzeltirken kendimi doğru sanmıştım. Oysa âlemlere rahmet olmak Peygamber’in sıfatıydı; mektubu yazan el, o sıf…“ — Kalın harf şifresindeki ifade Peygamber'in sıfatı; anlatıcı bunu yazanın hatası olarak işaretliyor (jüri önerisi; şifre değişmedi).

#### KAYIT

- **değiştirildi:** „Acil serviste tansiyonum, şekerim, ateşim ölçüldü.“ → „Acil servisin duvarları soluk yeşildi. Hakan Hoca plastik bir bardakla su uzattı; içtim. Tansiyonum, şekerim, ateşim ölçüldü.“ — İki kitap köprüsü: YOLCU 12'deki „Yeşil oda … Su uzatan bir doktor … ‘Hakan’ … plastik bardak“ sahnesi ŞAHİT'te bu acil odasına bağlanıyor (çift jürisi).

#### MEKTUBU KİM YAZDI?

- **değiştirildi:** „Sahnedeki kayıtta metale üç kez vuruluyor, ardından biri su istiyordu.“ → „Sahnedeki kayıtta metale üç kez vuruluyor, sonra biri su istiyordu.“ — YOLCU 12'de alıntılanan cümleyle harfi harfine aynı.

#### KÂĞIDIN ÖTE YANI

- **eklendi:** „Altına boş bir sandalye çizdim.“ — YOLCU 5'te aynı notun altında „boş bir sandalye“ çizili; köprü tamamlandı (çift jürisi).

#### SU

- **değiştirildi:** „Adam başını çevirdi; içeriden çocuğunun sesini duydu. Paketle ilgili sorumu orada bırakıp çocuğa gitti.“ → „Adam başını çevirdi; içeriden bir çocuk sesi duydu. Paketle ilgili sorumu orada bırakıp sese gitti.“ — YOLCU 2'de paket geldiğinde çocuklar evde değil; „bir çocuk sesi“ iki kitapla da uyumlu.

#### İÇERİDEKİ YAZAR

- **değiştirildi:** „O dünyaya bir profesör girmişti.“ → „O dünyaya bir doktor girmişti.“ — YOLCU'da Hakan „su uzatan bir doktor“ olarak geçiyor; „profesör“ YOLCU'da yok.
- **değiştirildi:** „Muhibbi'nin sorduğu soru bir odanın duvarına dönüşüyor;“ → „Muhibbi'nin adı bir sayfanın kenarında çay lekesine dönüşüyor;“ — YOLCU 12'deki gerçek yankı: Muhibbi'nin geçtiği sayfanın kenarında çay lekesi.

#### HODRİ

- **değiştirildi:** „yarım hikayemin“ → „yarım hikâyemin“ — Yazım birliği (hikâye).
- **değiştirildi:** „ne de Âşık olduğum hatundu“ → „ne de âşık olduğum hatundu“ — Cümle ortasında büyük harf.

#### AZ ÇOK

- **değiştirildi:** „sahne insanı olmuş bir ademin“ → „sahne insanı olmuş bir âdemin“ — Yazım birliği („âdem“ = insan; kitabın geri kalanıyla aynı).

#### UNUTMA

- **değiştirildi:** „mürekkep yalamış ademler.“ → „mürekkep yalamış âdemler.“ — Aynı.


## E. YOLCU – Son okuma ve jüri sonrası düzeltmeler

Toplam 35 işlem.

**Toplam:** 40.621 → 40.669 kelime (+48; +0.1 %)

| Bölüm | Önce | Sonra | Fark |
|---|---:|---:|---:|
| (Ön kısım) | 1 | 1 | +0 |
| 1453 — UYANIŞIN BEDELİ | 17 | 17 | +0 |
| DİKKAT | 341 | 341 | +0 |
| 1. Sonmuş Gibi Sıradan Bir Sabah | 1513 | 1512 | -1 |
| 2. Siyah Paket | 1339 | 1339 | +0 |
| 3. Kamera Boşluğu | 497 | 497 | +0 |
| 4. Sahte Görüntü, Gerçek Yas | 667 | 667 | +0 |
| 5. Bir Tanının Geldiği Yer | 2222 | 2222 | +0 |
| 7. Silinen Satır | 789 | 790 | +1 |
| 8. İki Kötü Seçenek | 464 | 464 | +0 |
| 9. Bölgesel Bir İmparatorluk | 937 | 938 | +1 |
| 11. Emanetin Peşindeki Karga | 990 | 992 | +2 |
| 12. Yedi Yıl Önce Çaldığım Kapı | 1967 | 1967 | +0 |
| 13. Bedenin İtirazı | 1023 | 1023 | +0 |
| 15. Nüshaların Söylemediği | 704 | 705 | +1 |
| 16. Görmek ile Yetişmek Arasındaki Mesafe | 571 | 572 | +1 |
| 17. Ormanda Beceri, Şehirde Belirti | 1501 | 1501 | +0 |
| 18. Birincil Ayna | 256 | 256 | +0 |
| 20. İnanmayan İlk Kişi | 1561 | 1561 | +0 |
| 21. Bir Hata, İki Kız Kardeş | 800 | 804 | +4 |
| 22. On Bir Saniyenin İçindeki Ses | 332 | 333 | +1 |
| 23. Silah Olmayan Ses | 694 | 694 | +0 |
| 24. Yusuf'un Dili | 495 | 495 | +0 |
| 25. Unuttuğumu Ateş Seçti | 795 | 795 | +0 |
| 26. Aynı Yöntemin Farklı Logoları | 1181 | 1181 | +0 |
| 28. Bir Gün Daha Yaşamak | 333 | 333 | +0 |
| 29. Trenin İçindeki Ben | 325 | 325 | +0 |
| 30. Yüzümün Benden Habersiz Hayatı | 1002 | 1002 | +0 |
| 31. Lambaları Yanan Boş Kat | 805 | 806 | +1 |
| 32. Leyla'nın Son Kaynağı | 462 | 462 | +0 |
| 34. Unutulmuş Dükkânın Anahtarı | 606 | 606 | +0 |
| 35. Kızımın Dosyası | 1333 | 1330 | -3 |
| 36. İki Ayrı Gelecek | 903 | 906 | +3 |
| 37. Görünmeyen Kameranın Gördüğü | 519 | 519 | +0 |
| 38. Adı Hastalık Olan Yetenek | 1255 | 1255 | +0 |
| 39. ŞAMAN | 522 | 523 | +1 |
| 40. Yusuf Olmadan Önce | 2224 | 2225 | +1 |
| 42. Labirentin Emanetleri | 867 | 872 | +5 |
| 43. Başlangıç Sensin | 943 | 944 | +1 |
| 44. Bedenin Bildiği Tarih | 405 | 418 | +13 |
| 45. Beni Öldürmeyen Adam | 1908 | 1909 | +1 |
| 46. Son Olabilecek Şeyler | 902 | 902 | +0 |
| 47. Son Olduğunu Bilmeden | 1272 | 1272 | +0 |
| 48. Saat 14.53 | 296 | 296 | +0 |
| 49. Geride Kalanlar | 790 | 790 | +0 |
| 50. Boş Bırakılan Son Cümle | 1292 | 1307 | +15 |

### Son okuma (düzelti): yazım, dilbilgisi, noktalama, tutarlılık


#### DİKKAT

- **değiştirildi:** „yanım... Hepsinin“ → „yanım… Hepsinin“ — [tutarlılık] Üç nokta: kitapta tek karakterli … da kullanılıyor (…bana geri…, Nehir…); tek biçime getirildi

#### 2. Siyah Paket

- **değiştirildi:** „Paket halinde“ → „Paket hâlinde“ — [tutarlılık] Kitapta her yerde hâl/hâlde/hâline; TDK: hâlinde

#### 5. Bir Tanının Geldiği Yer

- **değiştirildi:** „gün...”“ → „gün…”“ — [tutarlılık] Üç nokta tek karaktere (…) getirildi

#### 7. Silinen Satır

- **değiştirildi:** „kişiler...”“ → „kişiler…”“ — [tutarlılık] Üç nokta tek karaktere (…) getirildi
- **değiştirildi:** „önizleme kopyasını“ → „ön izleme kopyasını“ — [tutarlılık] Kitapta hem önizleme hem ön izleme (1373) var; TDK’ye uygun ayrı yazımda birleştirildi (krş. ön inceleme)
- **değiştirildi:** „acil talep aldı“ → „acil onay aldı“ — [anlam] Talepte bulunan Selin; savcıdan alınan şey onaydır (krş. 382: savcılık onayından sonra)

#### 9. Bölgesel Bir İmparatorluk

- **değiştirildi:** „çevrimiçi“ → „çevrim içi“ — [yazım] TDK: çevrim içi (ayrı)

#### 11. Emanetin Peşindeki Karga

- **değiştirildi:** „hakedişe“ → „hak edişe“ — [yazım] TDK: hak ediş (ayrı)
- **değiştirildi:** „çevrimdışı“ → „çevrim dışı“ — [yazım] TDK: çevrim dışı (ayrı)

#### 15. Nüshaların Söylemediği

- **değiştirildi:** „işyerinin“ → „iş yerinin“ — [yazım] TDK: iş yeri; kitapta başka yerde de iş yeri (1203, 2572)

#### 21. Bir Hata, İki Kız Kardeş

- **değiştirildi:** „ilk şansı bile“ → „ilk şans için bile“ — [dilbilgisi] Belirtme durumundaki şansı’yı yönetecek fiil yok; belge istemek ‘için’ gerektirir

#### 22. On Bir Saniyenin İçindeki Ses

- **değiştirildi:** „çevrimdışı“ → „çevrim dışı“ — [yazım] TDK: çevrim dışı (ayrı)

#### 25. Unuttuğumu Ateş Seçti

- **değiştirildi:** „aynı ânı“ → „aynı anı“ — [tutarlılık] Kitapta ‘an’ her yerde düzeltme işaretsiz (güldükleri anı, öldüğü anı, tuttuğu anı)

#### 31. Lambaları Yanan Boş Kat

- **değiştirildi:** „özgüvenli“ → „öz güvenli“ — [yazım] TDK: öz güven (ayrı)
- **değiştirildi:** „sigorta dosyasında sonradan“ → „sigorta dosyasının sonradan“ — [dilbilgisi] Değiştirilen şey dosyanın kendisi (sonraki cümle: poliçenin sürüm geçmişi); -ında eki öznesiz bırakıyor

#### 35. Kızımın Dosyası

- **değiştirildi:** „Taksiye dükkânın“ → „Taksiden dükkânın“ — [dilbilgisi] inmek ayrılma durumu ister: taksiden inmiş (taksiye 2381’de binmişti)

#### 36. İki Ayrı Gelecek

- **değiştirildi:** „belediye çalışması görünen“ → „belediye çalışması gibi görünen“ — [dilbilgisi] Eksik kelime: ad + görünmek için ‘gibi’ gerekli
- **değiştirildi:** „önizlemede“ → „ön izlemede“ — [tutarlılık] ön izleme yazımında birleştirildi (bkz. 629, 1373)
- **değiştirildi:** „çevrimdışı“ → „çevrim dışı“ — [yazım] TDK: çevrim dışı (ayrı)

#### 40. Yusuf Olmadan Önce

- **değiştirildi:** „itaattan“ → „itaatten“ — [yazım] TDK: itaat, -ti → itaatten (krş. 1877 itaatle)
- **değiştirildi:** „alçakgönüllüydü“ → „alçak gönüllüydü“ — [yazım] TDK: alçak gönüllü (ayrı)

#### 43. Başlangıç Sensin

- **değiştirildi:** „çevrimdışı“ → „çevrim dışı“ — [yazım] TDK: çevrim dışı (ayrı)

#### 45. Beni Öldürmeyen Adam

- **değiştirildi:** „çevrimdışıydı“ → „çevrim dışıydı“ — [yazım] TDK: çevrim dışı (ayrı)

#### 47. Son Olduğunu Bilmeden

- **değiştirildi:** „Siyah Kitap da“ → „Siyah kitap da“ — [tutarlılık] Kitapta her yerde ‘siyah kitap’ küçük harfle (özel ad değil); cümle başı olduğu için yalnız Siyah büyük

### Jüri v6 sonrası editör müdahaleleri (içerik tutarlılığı)


#### 16. Görmek ile Yetişmek Arasındaki Mesafe

- **değiştirildi:** „Emir ulaştıktan sonra gri paltolunun“ → „Arama emri ulaştıktan sonra gri paltolunun“ — Cümle başındaki „Emir“ oğul Emir gibi okunuyordu (jüri).

#### 35. Kızımın Dosyası

- **değiştirildi:** „ikincisinde Yusuf'la beyaz kitabın sayfalarını tasnif ediyor,“ → „ikincisinde kütüphanede sınava çalışıyor,“ — 40. bölüme göre anlatıcı 19 yaşında belgeleri Yusuf'a bırakıp hayatına dönmüştü; babası öldüğünde (20) Yusuf'la çalışıyor olması çelişkiydi ve 40'taki açıklamayı önceden veriyordu (iki jüri).

#### 39. ŞAMAN

- **değiştirildi:** „Leyla'nın Berlin'de sorduğu soru geri döndü:“ → „Leyla'nın son görüşmemizde sorduğu soru geri döndü:“ — 5. bölümde soru „son yüz yüze görüşmemizde“ soruluyor, Berlin'de değil (jüri).

#### 1. Sonmuş Gibi Sıradan Bir Sabah

- **kısaltıldı:** „üstüne yalnızca“ → „üstüne“ — 4. bölümde zarflarda isimler, 28'de „Ben açamazsam ölüm belgesiyle açın“ notu var; „yalnızca“ çelişki yaratıyordu (jüri).

#### 12. Yedi Yıl Önce Çaldığım Kapı

- **değiştirildi:** „İstanbul'dan Edirne'ye, 14.53.“ → „Edirne'den İstanbul'a, 14.53.“ — 14.53'te İstanbul'dan kalkan trenle aynı akşam dönüp okul gösterisinin son beş dakikasına yetişmek mümkün değildi; dönüş treni 14.53 (yön de 1453'ün yönü) (jüri).

#### 44. Bedenin Bildiği Tarih

- **değiştirildi:** „İlk rapor normal görünmüştü.“ → „İlk rapor normal görünmüştü. Nehir'e “Doktor, yaşım için fena olmadığımı söyledi,” derken bu cihazdan hiç söz etmemiştim.“ — 4. bölümdeki „yaşım için fena değilim“ sözü ile iki ay önce takılan cihaz arasındaki çelişki, anlatıcının saklaması olarak açıklanıyor (iki jüri).

#### 42. Labirentin Emanetleri

- **değiştirildi:** „Tünelin çıkışında Nehir bekliyordu.“ → „Nehir önden koşmuş, tünelin çıkışında arabanın kapısını açık tutuyordu.“ — Nehir grupla birlikte batı kapısından çıkıyordu; çıkışta „bekliyor“ olması çelişkiydi (jüri).

#### 21. Bir Hata, İki Kız Kardeş

- **değiştirildi:** „“Çocuğun kayıp. Kavganızı sonra yaparsınız.”“ → „“Çocuğun kayıp,” dedi Duru telefondan. “Kavganızı sonra yaparsınız.”“ — Konuşan belli değildi (jüri).

#### 37. Görünmeyen Kameranın Gördüğü

- **değiştirildi:** „“Bu kez oturan bendim. İmzayı atınca geçmişi kapattığımı sandım.”“ → „“Hareketi de hatırlamak istemedim. İmzayı atınca geçmişi kapattığımı sandım.”“ — „Bu kez oturan bendim“ anlaşılmıyordu (iki jüri); bir önceki cümleye (hareket) ve devamındaki „kaçınma“ya bağlandı.

#### 50. Boş Bırakılan Son Cümle

- **değiştirildi:** „Sonra yeniden bir kapı sezdim. Kolu yoktu.“ → „Sonra yeniden bir kapı sezdim. Kolu yoktu. Başka bir bedenin kapısı değildi bu; kitabın başına dönen, okunduğu her yerde yeniden açılan kapıydı.“ — Pasaj tenasüh (ruh göçü) gibi okunabiliyordu (iki jüri); kapı, kitabın BAŞA DÖN şifresine bağlandı.

#### 2. Siyah Paket

- **değiştirildi:** „Ellerimdeki poşetleri yere bıraktım.“ → „Elimdeki poşetleri yere bıraktım.“ — Birkaç satır önce poşetler yalnız sol elde; „ellerimdeki“ çelişkiydi (jüri). Paragrafın ilk harfi (şifre) değişmedi.
