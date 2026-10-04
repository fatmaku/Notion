# ŞAHİT v6, Schritt 1: Sefas „Edisyon Tuncay'a“ (Okt. 2026) als Basis übernehmen,
# Titel/Schluss/Brücken angleichen, offenen Faden „üç roman“ schließen, Satzfehler in
# Sefas neuen Passagen korrigieren. Erzeugt ops_sa_entegrasyon.json für tools/docx_ops.py.
import json, pathlib
O = []
def rep(old, new, why, kap, match=None):
    d = {"op": "replace", "old": old, "new": new, "why": why, "kap": kap}
    if match: d["match"] = match
    O.append(d)
def ins(match, text, why, kap, style=None):
    d = {"op": "insert_after", "match": match, "text": text, "why": why, "kap": kap}
    if style: d["style"] = style
    O.append(d)
def dele(match, why, kap): O.append({"op": "delete", "match": match, "why": why, "kap": kap})
def sty(match, style, why, kap): O.append({"op": "style", "match": match, "style": style, "why": why, "kap": kap})

K0 = "(Ön kısım)"
# --- Ön kısım --------------------------------------------------------------
rep("Şahit ve Yolcu", "ŞAHİT", "Kitabın adı ŞAHİT olarak kalıyor (Tuncay'ın kararı); „Yolcu“ ve „Şahit“ ithafta kalın harfle duruyor.", K0, match="Şahit ve Yolcu")
O.append({"op": "delete_empty", "to": "Bu Kitap:", "why": "Boş satırlar (dizgi sayfayı kendisi düzenliyor).", "kap": K0})
for m in ["Bu Kitap:", "İyi bir insan, adam, eş", "Galip Kaşkaya"]:
    sty(m, "Dedication", "İthaf kendi sayfasında, ortalı dizilsin diye ayrı biçim.", K0)
rep("kardeş arkadaş,", "kardeş, arkadaş,", "Virgül.", K0)
rep("eniştem, abim", "eniştem, abim", "—", K0)  # Platzhalter (keine Änderung), hält Anker stabil
O.pop()
rep(" ithaf edilmiştir", " ithaf edilmiştir.", "Nokta.", K0)
O.append({"op": "delete_empty", "from": "Galip Kaşkaya", "to": "Farkında mısın? Deliler", "why": "Boş satırlar.", "kap": K0})
O.append({"op": "strip_ws_runs", "match": "Sefarizmalar", "why": "Sekme karakterleri; kaynak satırı dizgide sağa yaslanıyor.", "kap": K0})
sty("Sefarizmalar", "Normal", "Epigraf kaynağı (v5'teki gibi).", K0)
rep("ahmaksın", "ahmaksın.", "Nokta.", K0, match="Farkında mısın? Deliler")
O.append({"op": "delete_empty", "from": "Sefarizmalar", "to": "Bu hikâye hatırladığım gibi başlamadı", "why": "Boş satırlar.", "kap": K0})

# --- AZ ÇOK -----------------------------------------------------------------
K = "AZ ÇOK"
rep("böyle bir dönemden geçiyor:", "böyle bir dönemden geçiyordum:", "Fiil eksik kalmış (dizinin sonu „bakıyordum“).", K)
rep("açmıyordum mesela... Derken", "açmıyordum mesela… Derken", "Üç nokta tek karakter.", K)
rep("ben bile bitiremedim tanımı daha”", "ben bile bitiremedim tanımı daha.”", "Nokta.", K)

# --- DAKTİLO ----------------------------------------------------------------
K = "DAKTİLO"
rep("değildi ve Vildan Hanımı da bunlar şaşırtıyordu. ", "değildi ve Vildan Hanım'ı da bunlar şaşırtıyordu.", "Kesme işareti.", K)
rep("“Mustafa Sefa Bey, yazdıklarınız tamamen", "“‘Mustafa Sefa Bey, yazdıklarınız tamamen", "İç tırnak açılmamıştı (kapanış ’ vardı).", K)
rep("aşamasında, muallak...”", "aşamasında, muallak…”", "Üç nokta tek karakter.", K)
rep("kendisine ulaşmak, yani vakanın yazdıklarını derlemek, romanlaştırmak senin, vakayı tedavi etmek benim, sırrı çözmek devletin işi”",
    "kendisine ulaşmak. Yani vakanın yazdıklarını derlemek, romanlaştırmak senin; vakayı tedavi etmek benim; sırrı çözmek devletin işi.”",
    "Cümle bölündü, nokta.", K)
rep("“Hayır, yarın olarak kalsın. Hastaların da işi beklemesin”", "“Hayır, yarına kalsın. Hastaların da işi beklemesin.”", "„yarın olarak kalsın“ → „yarına kalsın“ (toplantı yarına alındı); nokta.", K)
rep("Biz de ardı sıra beraberinde çıktık.", "Biz de ardı sıra çıktık.", "„ardı sıra beraberinde“ çift anlatım.", K)

# --- TECRİT ODASI -----------------------------------------------------------
K = "TECRİT ODASI"
sty("Derken Vildan Hanım yanımızdan ayrılmıştı.", "Normal", "Açılış biçimi yalnız bölümün ilk paragrafında.", K)
rep("Derken Vildan Hanım yanımızdan ayrılmıştı. ", "Derken Vildan Hanım yanımızdan ayrılmıştı.", "Sondaki boşluk.", K)
rep("“Kitap yazacağım, yazma demiyorum yaz elbet ama nedir bu dağınıklık, artık ben de yoruluyorum arkanı toplamaktan. İnanılmaz düzensizsin, uyku düzenin zaten yoktu, hepten saldın kendini”",
    "“‘Kitap yazacağım’ diyorsun; yazma demiyorum, yaz elbet. Ama nedir bu dağınıklık? Artık ben de yoruluyorum arkanı toplamaktan. İnanılmaz düzensizsin; uyku düzenin zaten yoktu, hepten saldın kendini.”",
    "Annenin sözü: „Kitap yazacağım“ oğlunun sözü, iç tırnakla; soru ve noktalar.", K)
rep("Hocam kelimesi beni esprili", "“Hocam” kelimesi beni esprili", "Alıntılanan kelime tırnakta.", K)
rep("Lan demesindeki hikmet ise çocukluktan gelen dostluğumuzdandı. ", "“Lan” demesindeki hikmet ise çocukluktan gelen dostluğumuzdandı.", "Alıntılanan kelime tırnakta; sondaki boşluk.", K)
O.append({"op": "insert_after", "match": "“Hocam, EEG nedir?”", "text": "Bunu az önce sormuş muydum? O gün fark etmedim; şimdi de emin değilim, olduğu gibi bırakıyorum.",
          "why": "v3'teki anlatıcı cümlesi geri geldi: EEG iki kez anlatıldıktan sonra yine sorulması bir revizyon artığı gibi değil, hafıza kaybının izi gibi okunsun (Sefa'nın temel aldığı dosyada bu cümle yoktu).", "kap": K})

# --- UNUTMA -----------------------------------------------------------------
K = "UNUTMA"
rep("“Nazım Efendi siz misiniz”", "“Nazım Efendi siz misiniz?”", "Soru işareti.", K)
rep("Bir hafta olur, on gün olur… Ama bu kadar erken değil”", "Bir hafta olur, on gün olur… Ama bu kadar erken değil.”", "Nokta.", K)
rep("“Abi, sen Nazım Efendi misin onu söyle?”", "“Abi, sen Nazım Efendi misin, onu söyle.”", "Emir cümlesi (soru işareti değil).", K)
rep("yani okumuş, mürekkep yalamış ademler”", "yani okumuş, mürekkep yalamış ademler.”", "Nokta.", K)
rep("yalamak için değil, yazmak için kullanıyorum”", "yalamak için değil, yazmak için kullanıyorum.”", "Nokta.", K)
rep("Sanki biraz gereksiz mi yükseldim diye düşünürken, biraz mahcuptum:", "Gereksiz yere mi yükseldim diye düşünürken biraz mahcup oldum:", "„Sanki … mi … biraz … biraz“ toparlandı.", K)
rep("Oysa orada sağlam bir ikaz vardı: Muhyiddin İbnü'l-Arabî'nin;", "Oysa orada sağlam bir ikaz vardı, Muhyiddin İbnü'l-Arabî'ye atfedilen bir söz:", "Söz İbnü'l-Arabî'ye atfediliyor (kesin kaynak yok, v5'teki gibi „atfedilen“).", K)
rep("“İnsan hakikati öğrenmez, hatırlar” Çözülebilir bir şifreyle oyalanacağıma bu sözlere", "“İnsan hakikati öğrenmez, hatırlar!” Çözülebilir bir şifreyle oyalanacağıma bu söze", "Motto kitabın her yerindeki biçimde (ünlemle); tek söz → „bu söze“.", K)

# --- OKU ---------------------------------------------------------------------
K = "OKU"
rep("İndirilen ilk ayetten ve Peygamberimize gelen ilk ve ilk vahiyden bahsediyordu.", "İndirilen ilk ayetten, Peygamberimize gelen ilk vahiyden bahsediyordu.", "„ilk ve ilk“ yazım hatası.", K)
rep("kendime de zulüm olacak”", "kendime de zulüm olacak.”", "Nokta.", K)
rep("“Alimlik meslek değildir ancak mesleğini aşk ile yapan alimdir yeğenim, alimi alim yapan okuduğu kendinden önceki peygamberlerin hayatları, sahabelerin hayatı, alimlerin yaptıkları veya yazdıklarını okuyarak, öğrenerek yola çıkarlar.",
    "“Alimlik meslek değildir, ancak mesleğini aşk ile yapan alimdir yeğenim. Alimler, kendilerinden önceki peygamberlerin, sahabelerin, alimlerin hayatlarını, yaptıklarını, yazdıklarını okuyarak, öğrenerek yola çıkarlar.",
    "Cümle yapısı (özne iki kez değişiyordu).", K)
rep("meşakkati zorlu bir yolculuktur. İlim öğrendikçe", "meşakkatli, zorlu bir yolculuktur. İlim, öğrendikçe", "„meşakkatli“; virgül.", K)
rep("İşte alim kişiler hatırladıkça havsala tatmin olur ve keyif verir. İşte kişi O’dur ki ilmi öğrenmek, öğrendikçe hatırlamaya başlamak keyif verir böylece insana ve diğer insanlar o kişiye alim derler.",
    "İşte alim kişi hatırladıkça havsalası tatmin olur, keyif alır. İlmi öğrenmek, öğrendikçe hatırlamaya başlamak kime keyif veriyorsa, diğer insanlar o kişiye alim derler.",
    "İki cümle anlaşılır hale getirildi (anlam aynı).", K)

# --- HODRİ -------------------------------------------------------------------
K = "HODRİ"
rep("çünkü bayılmanın içerisine sanırım uykumda karışmıştı. Saat neredeyse öğlene geliyordu,",
    "çünkü bayılmanın içine sanırım uyku da karışmıştı. Saat öğlene geliyor gibiydi,",
    "„uykumda“ → „uyku da“; saat bir izlenim (ON BİR'deki 10.44 ile çelişmesin, v2'deki düzeltme yeni cümleye uyarlandı).", K)
rep("harekete etmeye halim", "hareket etmeye halim", "Yazım hatası.", K)
rep("doğru ve afili bol cümlelerdi", "doğru ve bol afili cümlelerdi", "Sözcük sırası.", K)
rep("Yaşamadıklarımı dahası yaşantıma yansıtmadığım sözlerim mi yansıyordu bu öfkeye.", "Yaşamadıklarım, dahası yaşantıma yansıtmadığım sözlerim mi yansıyordu bu öfkeye?", "Soru işareti, virgül.", K)
rep("Sen zaferden değil, seferden mesulsün kulum”", "Sen zaferden değil, seferden mesulsün kulum.”", "Nokta.", K)
rep("hak etmiyor muşum”", "hak etmiyormuşum.”", "„-muşum“ bitişik yazılır; nokta.", K)
rep("Peki Ya ALLAH bunun hesabını sormayacak mı sana.", "Peki ya ALLAH bunun hesabını sormayacak mı sana?", "Soru işareti.", K)
rep("eşrefi mahlukat eder Mütekamil olmaya müşteri insanı.", "mütekâmil olmaya müşteri insanı eşrefi mahlukat eder.", "Sözcük sırası (nesne fiilden önce); „müşteri“ (talip) Sefa'nın sözcüğü olarak kaldı.", K)
rep("“Hürriyet, Hakk’a esaret halkasındadır”", "“Hürriyet, Hakk’a esaret halkasındadır.”", "Nokta.", K)

# --- ON BİR ------------------------------------------------------------------
K = "ON BİR"
rep("iki çayla donat denmiş kendisine”", "iki çayla donat denmiş kendisine.”", "Nokta.", K)
rep("Hakan’dan telefonumu almış kesin, Hakan da ne yapacağını sorunca kahvaltıdan bahsetmiş, Hakan da bu jesti yapmıştır. ",
    "Telefonumu Hakan’dan almış olmalı, diye düşündüm; ne yapacağını sorunca Hakan da kahvaltıdan bahsetmiş, bu jesti de o yapmıştır.",
    "İç ses netleşti (üç kez „Hakan da“).", K)

# --- KAYIT -------------------------------------------------------------------
K = "KAYIT"
rep("“Özellikle mi seçtiniz?” diye aklımdan geçirdim", "“Özellikle mi seçtiniz?” diye aklımdan geçirdim.", "Nokta.", K)
rep("“Neyi?” der gibi yüzüme baktı", "“Neyi?” der gibi yüzüme baktı.", "Nokta.", K)

# --- MIZRAĞIN İKİ UCU --------------------------------------------------------
K = "MIZRAĞIN İKİ UCU"
rep("Allah için; savaşmak, yemek, içmek,", "Her şey Allah için; savaşmak, yemek, içmek,", "Sefa „Sanat …“ kısmını HODRİ'ye taşıdı; kalan cümle öznesiz başlıyordu.", K)

# --- MEKTUBU KİM YAZDI? / İÇERİDEKİ YAZAR (köprü) -----------------------------
rep("KAPI'nın altında eli bantlı bir adam", "KAPI'nın altında sağ başparmağı bantlı bir adam", "Köprü: YOLCU'daki „sağ başparmak“ ve „bantlı başparmak“ ile aynı ayrıntı (v2'den; Sefa'nın temel aldığı dosyada yoktu).", "MEKTUBU KİM YAZDI?")
rep("kırmızı ip, parmağı sargılı adam.", "kırmızı ip, sağ başparmağı bantlı adam.", "Köprü (aynı).", "İÇERİDEKİ YAZAR")
rep("Parmağı bantlı adam, kendi çantasını", "Sağ başparmağı bantlı adam, kendi çantasını", "Köprü (aynı).", "İÇERİDEKİ YAZAR")

# --- SUSUZLUK ----------------------------------------------------------------
rep("Bu beni küçültmedi odayı büyüttü.", "Bu beni küçültmedi, odayı büyüttü.", "Virgül.", "SUSUZLUK")

# --- HAKİKAT MEDENİ ----------------------------------------------------------
K = "HAKİKAT MEDENİ"
rep("Ben de burada olacağım”", "Ben de burada olacağım.”", "Nokta.", K)
rep("“Ne oldu oğlum, bir durum mu var”", "“Ne oldu oğlum, bir durum mu var?”", "Soru işareti.", K)
rep("“Yok ana, sen sadece gel”", "“Yok ana, sen sadece gel.”", "Nokta.", K)
rep("bu oğlum olduğun sonucunu hiç değiştirmedi”", "bu oğlum olduğun sonucunu hiç değiştirmedi.”", "Nokta.", K)
rep("Oysa annem benim yanımda oturuyordu ve aklımda susmayan o ses, Hakan’ın mı benim mi yanında oturuyor.",
    "Oysa annem benim yanımda oturuyordu. Aklımda susmayan o ses soruyordu: Hakan’ın mı, benim mi yanında oturuyor?",
    "Soru cümlesi olarak kuruldu.", K)

# --- BOŞ SIRA / AYNI EL -------------------------------------------------------
rep("Gözümün önünde bir sahne canlandı; su dolu bir akvaryuma, her yeri zincirlerle sarılı bir sihirbaz… Boğuluyor ama ne seyirciler ne de asistanlar buna müdahale etmiyorlar, çünkü bu gösterinin bir parçası zannediyor herkes. İşte ben o gün öğrencilere tam da kendi durumumu anlatırken, yani bir bedende çift kişilik dersini anlatırken, onlar verdiğim dersin gereği bu tavırları yaptığımı düşünmüşler, kameranın kadrajı dahi olmayan kişiye mi anlık olarak dönmüştü? Öğrenciler bu derse bir örnek verdiğimi mi zannetmişlerdi de kimsenin sesi çıkmamıştı?",
    "Gözümün önünde bir sahne canlandı: su dolu bir akvaryumda, her yeri zincirlerle sarılı bir sihirbaz… Boğuluyor ama ne seyirciler ne de asistanlar müdahale ediyor, çünkü herkes bunu gösterinin bir parçası sanıyor. Ben o gün öğrencilere tam da kendi durumumu, bir bedende iki kişiliği anlatırken, onlar bu tavırları dersin gereği yaptığımı düşünmüşlerdi. Kameranın kadrajında bile olmayan birine dönüp konuşmam da mı dersin parçasıydı? Öğrenciler bir örnek verdiğimi mi sanmışlardı da kimsenin sesi çıkmamıştı?",
    "Sefa'nın yeni imgesi korundu; cümleler toparlandı (özne/zaman uyumu).", "BOŞ SIRA")
rep("hastane koridorunda kızına suyu az diye söylenen adam da. Onların", "hastane koridorunda kızına suyu az diye söylenen adam da. Kafedeki Mahmut da, telefonun öbür ucundaki iki Emrah da. Onların",
    "Ayrım listesi: Mahmut (TECRİT ODASI) ve HODRİ'de Sefa'nın genişlettiği iki Emrah da „kendi hayatı olan insanlar“ tarafında (v3'teki satırın kısaltılmış hâli; Suat artık kitapta geçmiyor).", "AYNI EL")
rep("İşte az önce aklımdan geçenler de maalesef bunlardı, boğuluyordum ve kimse bunun farkında değildi öğrencilerden.",
    "İşte az önce aklımdan geçen de buydu: Boğuluyordum ve öğrencilerden kimse bunun farkında değildi.", "Cümle düzeni.", "AYNI EL")

# --- Üç roman ipliği (Sefa'nın notu) -----------------------------------------
K = "AYNI EL"
ins("Zehra'nın ilk davetini de aradım.",
    "Üç romanımı da sordum. Hakikat, makam odasındaki çekmeceden getirtti. Sağ üst gözden çıktıkları sırayla, ilk günkü gibi üst üste duruyorlardı. Kapaklarında adım yazıyordu: Mustafa Sefa Güvenir. Basılmış, satılmış, birilerinin elinden geçmiş kitaplardı; onları ben uydurmamıştım. Sayfaların kenarındaki kurşun kalem notlarını ise tanıdım. Mektuplardaki düzeltmelerle aynı eldendi. Kitaplar bir yazarın yaşadığını kanıtlıyordu; o yazarın masanın öbür yanında ayrı bir sandalyede oturduğunu kanıtlamıyordu. Hakan'ın ilk gün, “Bu işin sonunda romanlarınızı imzalamanızı da isteyeceğim,” dediğini hatırladım. İmzalamadan çantama koydum. İş henüz bitmemişti.",
    "Sefa'nın notu („Romanlarım nerede?“): DAKTİLO'da Hakan'ın çekmeceden çıkardığı üç roman sonra hiç görünmüyordu. Kanıt incelemesinin yapıldığı bölümde romanlar geri geliyor: varlıkları yazarı kanıtlıyor, ikinci bir bedeni değil.", K)
K = "SU"
ins("Yalnız kapının öte yanında bir insanın ihtiyacı vardı ve ben onu duymuştum.",
    "Çantamdan üç romanımı çıkardım. Hakan bu işin sonunda onları imzalamamı istemişti. İş bitmiş miydi, bilmiyordum; bir yere varmıştı. Üçünün de ilk sayfasını açıp imzaladım. Kime yazdığımı imzanın üstüne yazmadım. Hakan'a mı, kendime mi, yoksa bir gün onları raftan alacak birine mi; o soruyu kapının aralığına bıraktım.",
    "DAKTİLO'daki söz („romanlarınızı imzalamanızı da isteyeceğim“) kapanıyor; son sayfadaki köprü cümleleri değişmedi.", K)
rep("ŞAHİDİ ARARKEN", "ŞAHİT", "Kitabın adı (son sayfa).", K)
dele("Romanlarım nerede?", "Sefa'nın kendine notu, metnin parçası değil; içeriği AYNI EL ve SU'da işlendi.", K)
dele("Sefanın yazdığı üç roman nerede?", "Not (aynı).", K)

pathlib.Path(__file__).with_suffix(".json").write_text(json.dumps(O, ensure_ascii=False, indent=1))
print(len(O), "ops")
