export const meta = {
  name: 'benyoksam-konsept',
  description: 'BEN YOKSAM – bağımsız yeni kitap konsepti: üç mimar, üç jüri, sentez (TR konsept belgesi)',
  phases: [{ title: 'Konseptler' }, { title: 'Jüri' }, { title: 'Sentez' }],
}
const R = '/home/user/Notion/iki-roman'
const BRIEF = `YAZARIN (Tuncay Sancak, Instagram @happytuncay) İSTEĞİ – kendi sözleriyle özetlenmiş, hiçbir madde atlanmayacak:
1. YOLCU (1453 Uyanışın Bedeli) ile ŞAHİT bir çift olarak bitti ve yayımlanacak. Bu çiftten AYRI, yazarın KENDİ başına duran yeni bir kitabı çıkacak: adı BEN YOKSAM. ŞAHİT'le hiçbir bağı kalmayacak (Sefa Abi, Sefa'nın romanı, Hakan Hıdıroğlu/Muhibbi/Erenköy köprüleri, iki kitabın ortak açılış cümlesi ve ortak „Kapıyı açtım…“ notu, „Metale üç kez vuruluyor“ ortak sahnesi: hepsi ya çıkar ya da ŞAHİT'e gönderme yapmayacak biçimde yeniden kurulur; YOLCU'nun kendi iç sistemi – SENİ BUL / BAŞA DÖN / BENİ ARAMA şifreleri, 14.53, kırmızı ip, siyah paket, Meralis, FETİH, A-1453, beş şehir, Alfa sınıflaması, uyananların halkası, Yusuf Vural – korunur).
2. Yeni katman: DECCAL ASLINDA YAPAY ZEKÂDIR. Herkesin hayatına sızmıştır; önce bize hizmet etmiş, sonra kötülerin suistimaliyle kontrolden çıkmış, insanlara karşı ve kötülüğe geçmiştir – Deccal anlatısıyla PARALEL bir yol; bunu kurguya bağlayan bir hikâye. Mantık bozulmadan, kurgu ve sistem bozulmadan, keyifle okunacak biçimde. Kitabın içinde „kutsal cevaplar“ da verilmiş olacak (Deccal'e dair İslami kaynaklardaki işaretler – tek gözlülük, cennet-cehennem vaadi, rızık/yağmur üzerinde güç, hız, kırk gün, Kehf suresinin ilk on ayeti, Mekke-Medine'ye girememesi, alnındaki yazıyı her müminin okuması – yapay zekâ paralelinde SAYGIYLA ve kurmaca olduğunu unutmadan işlenir; okurun defterindeki anahtar cümle: „İnanç; tedbiri bırakmak değil, korkumu başka bir yaratılmışın egemenliğine vermemektir.“).
3. Karakterlerin HEPSİ oldukça uluslararası adlar taşıyacak (örnek: Âdem → Adam); İngilizce ve Almanca okur için ad seçimi önemli; konu yine İSTANBUL'da geçecek. Kitap „adam gibi yürüyecek“ (sağlam, kendine yeten).
4. Bu sefer kitabın içinde yazarın kendisi daha çok yer alacak: happytuncay / Tuncay Sancak – kitaplar söz konusu olunca Sefa değil, Tuncay. Yeni kurguda bir ARAŞTIRMACI karakter: kendisi nörofarklı (DEHB/otizm spektrumu – YOLCU'nun avcı/toplayıcı temasıyla uyumlu) ve GİZLİ KAHRAMAN. Bunu kurguya uyumlu, sistemi bozmadan ekle.
5. Önce Türkçe; sonra Almanca ve İngilizce de çıkacak.
6. Okurun (Tuncay) defter notları ${R}/analyse/Okur_Notlari_Tuncay_2026-10.md: sevdiği cümleler (korunacak), iki eleştiri („Her düşünceyi mahkemeye çıkarmak!!!!!“ – hukuk/mahkeme dili fazla; „yargıya varmış aforizmalar çoğunlukta“ – sahne sonu özdeyişleri azaltılacak) ve izlediği olay örgüsü iskeleti. Jürinin yapısal önerileri ${R}/analyse/Juri_v6.md (YOLCU: 40/45'teki soru-cevap çözümünü keşif sahnelerine taşımak; hukuki usul cümlelerini seyreltmek; aforizma yoğunluğu; dördüncü perdenin dış doruğunu sahneye dönüştürmek) bu yeni kitapta uygulanabilir.`
const MATERIAL = `Malzeme: ${R}/interior/i18n/BY_synopsis.json (YOLCU'nun bütün bölümlerinin özeti, karakterler, terimler), ${R}/interior/i18n/BY_TR_full.txt (tam metin, [pid] numaralı – büyük; grep/sed ile gerekli yerleri oku: açılış U00–U03, 12–13. bölümler (Sefa/Hakan köprüleri, pid 521–1200), 39–45 (çözüm), 48–50 (final)), ${R}/interior/i18n/BY_bible_input.md (başlıklar, şifre konumları, köprü cümleleri), ${R}/analyse/Bewertung_Ben_Yoksam_Sahidi_Ararken.md (önceki analiz), ${R}/analyse/Juri_v6.md, ${R}/analyse/Okur_Notlari_Tuncay_2026-10.md.`
const CONCEPT = { type: 'object', properties: {
  title: { type: 'string' }, logline: { type: 'string' },
  ai_deccal_mechanism: { type: 'string', description: 'Yapay zekâ Deccal katmanının kurgudaki somut mekanizması: ne, kim, nasıl, Meralis/FETİH/beş şehir/Alfa/A-1453 ile ilişkisi; hangi sahnelerde görünür olur; sonu' },
  sacred_answers: { type: 'string', description: 'Kutsal cevaplar: hangi kaynak/işaret, hangi karakterin ağzında, hangi bölümde; saygı ve kurmaca sınırı' },
  researcher_hero: { type: 'string', description: 'Araştırmacı/nörofarklı gizli kahraman ve yazar personasının (Tuncay Sancak / happytuncay) kurgudaki yeri' },
  name_map: { type: 'array', items: { type: 'object', properties: { old: { type: 'string' }, new: { type: 'string' }, why: { type: 'string' } }, required: ['old', 'new', 'why'] } },
  remove_sahit: { type: 'array', items: { type: 'object', properties: { where: { type: 'string' }, what: { type: 'string' }, replacement: { type: 'string' } }, required: ['where', 'what', 'replacement'] } },
  chapter_plan: { type: 'array', items: { type: 'object', properties: { chapter: { type: 'string' }, change: { type: 'string', enum: ['aynen', 'hafif', 'yeniden', 'yeni', 'çıkar'] }, what: { type: 'string' } }, required: ['chapter', 'change', 'what'] } },
  system_preservation: { type: 'string', description: 'Şifreler (7/7/9 konum), 14.53, kırmızı ip, eksik bölüm numaraları nasıl korunur; değişen başlıklarda akrostiş' },
  risks: { type: 'array', items: { type: 'string' } },
  rewrite_share: { type: 'string', description: 'Metnin yüzde kaçı aynen kalır / değişir / yeni yazılır (tahmin)' },
}, required: ['title', 'logline', 'ai_deccal_mechanism', 'sacred_answers', 'researcher_hero', 'name_map', 'remove_sahit', 'chapter_plan', 'system_preservation', 'risks', 'rewrite_share'] }
const ANGLES = [
  { key: 'koruyucu', prompt: 'Açı: KORUYUCU MİMAR. Mevcut metnin en az %80\'ini aynen koru; yapay zekâ-Deccal katmanını var olan unsurlara (Meralis, FETİH, beş şehir, A-1453, kameralar, dosyalar) bağlayarak en az müdahaleyle ekle; yazarın sesini ve aforizmalarını koru, yalnız okurun ve jürinin eleştirdiği yerleri seyrelt.' },
  { key: 'gerilim', prompt: 'Açı: GERİLİM MİMARI. Uluslararası okur için tempo: jürinin yapısal önerilerini uygula (40/45 soru-cevap çözümünü keşif sahnelerine taşı, hukuk dilini seyrelt, dördüncü perdede bir şehri sahneye dönüştür); yapay zekâ-Deccal katmanı görünür bir antagonist mekanizma olsun (ama klişe „kötü robot“ değil: insanların suistimaliyle kontrolden çıkan, herkesin cebindeki asistan).' },
  { key: 'irfan', prompt: 'Açı: İRFAN MİMARI. Önce kutsal cevaplar: Deccal işaretlerinin (tek göz, cennet-cehennem vaadi, rızık, hız, Kehf, alındaki yazı) yapay zekâ paralelini derinlikli, saygılı ve kurmaca içinde kalan bir okumayla kur; araştırmacı/nörofarklı gizli kahramanı bu okumanın taşıyıcısı yap; sonra kurguyu buna göre hafifçe bük. Okurun defterindeki „İnanç; tedbiri bırakmak değil…“ cümlesi kitabın omurgası olsun.' },
]
phase('Konseptler')
const concepts = await parallel(ANGLES.map(a => () => agent(`${BRIEF}
${MATERIAL}
${a.prompt}
Görev: YOLCU'yu BEN YOKSAM'a dönüştürecek eksiksiz bir konsept üret (Türkçe). Malzemeyi gerçekten oku (synopsis'in tamamı; tam metinde en az açılış, 12–13, 39–45, 48–50). Somut ol: mekanizma, sahneler, bölüm bölüm plan (bütün 45 Heading 1 için), ad haritası (bütün karakterler; Türkçe okunuşu da rahat, İngilizce/Almanca okura da tanıdık adlar; örnek Âdem→Adam; Nehir, Tarık, Leyla, Yusuf, Cem, Duru, Zeynep, Hakan … için gerekçeli öneri), ŞAHİT bağlarını kaldırma listesi (pid'lerle), sistemin korunması. Mantık hatası bırakma; riskleri açıkça yaz.`, { label: `konsept ${a.key}`, phase: 'Konseptler', schema: CONCEPT, effort: 'high' })))
const valid = concepts.map((c, i) => ({ angle: ANGLES[i].key, c })).filter(x => x.c)
log(`${valid.length} konsept hazır`)
const SCORE = { type: 'object', properties: { scores: { type: 'array', items: { type: 'object', properties: { angle: { type: 'string' }, logic: { type: 'number' }, integration: { type: 'number' }, appeal: { type: 'number' }, sacred: { type: 'number' }, voice: { type: 'number' }, feasibility: { type: 'number' }, total: { type: 'number' }, comment: { type: 'string' } }, required: ['angle', 'logic', 'integration', 'appeal', 'sacred', 'voice', 'feasibility', 'total', 'comment'] } }, best: { type: 'string' }, graft: { type: 'array', items: { type: 'string' }, description: 'kazanana diğerlerinden aşılanacak somut fikirler' } }, required: ['scores', 'best', 'graft'] }
phase('Jüri')
const judges = await parallel(['yayınevi editörü (uluslararası gerilim)', 'ilahiyat ve edebiyat bilen okur', 'YOLCU\'yu tanıyan sıkı mantık okuru'].map((role, i) => () => agent(`${BRIEF}
${MATERIAL}
Rolün: ${role}. Üç konsept aşağıda. Her birini 1–10 puanla: logic (mantık/tutarlılık), integration (var olan kurgu ve sistemle kaynaşma), appeal (uluslararası okur için çekicilik), sacred (kutsal cevapların saygı ve derinliği), voice (Tuncay'ın sesi ve okurun sevdiği cümlelerin korunması), feasibility (uygulanabilirlik); total = ortalama. Kazananı seç ve diğerlerinden aşılanacak somut fikirleri listele.
${JSON.stringify(valid, null, 1)}`, { label: `jüri ${i + 1}`, phase: 'Jüri', schema: SCORE, effort: 'high' })))
const js = judges.filter(Boolean)
const tally = {}
for (const j of js) for (const s of j.scores) tally[s.angle] = (tally[s.angle] || 0) + s.total
const winner = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]
log(`jüri: ${JSON.stringify(tally)} → kazanan ${winner && winner[0]}`)
phase('Sentez')
const doc = await agent(`${BRIEF}
${MATERIAL}
Üç konsept ve üç jüri değerlendirmesi aşağıda; kazanan açı: ${winner && winner[0]}. Görev: kazanan konsepti temel alıp jürinin aşı listesindeki iyi fikirleri ekleyerek TEK, tutarlı, uygulanabilir bir konsept belgesi yaz: ${R}/analyse/BEN_YOKSAM_Konsept.md (Türkçe, Markdown; yazar Tuncay için; bölümler: 1 Özet ve logline, 2 Yapay zekâ–Deccal mekanizması (kurguda adım adım), 3 Kutsal cevaplar (kaynak, karakter, bölüm), 4 Araştırmacı/nörofarklı gizli kahraman ve yazar personası, 5 Ad haritası (tablo: eski → yeni → neden), 6 ŞAHİT bağlarının kaldırılması (tablo: yer/pid → ne → yerine ne), 7 Bölüm bölüm plan (tablo: bölüm → aynen/hafif/yeniden/yeni/çıkar → ne), 8 Sistemin korunması (şifreler, 14.53, kırmızı ip, eksik numaralar; değişen başlıklarda akrostiş harfleri), 9 Okur ve jüri eleştirilerinin işlenmesi, 10 Riskler ve açık kararlar (yazara 3–5 soru), 11 Tahmini iş: aynen/değişen/yeni oran). Ayrıca aynı içeriği makine için ${R}/interior/i18n/benyoksam_konsept.json olarak yaz (CONCEPT şemasındaki alanlar + "open_questions"). Dosyaları yaz; dön: özet.
KONSEPTLER: ${JSON.stringify(valid, null, 1)}
JÜRİ: ${JSON.stringify(js, null, 1)}`, { label: 'sentez', phase: 'Sentez', schema: { type: 'object', properties: { summary: { type: 'string' }, open_questions: { type: 'array', items: { type: 'string' } } }, required: ['summary', 'open_questions'] }, effort: 'high' })
return { tally, winner: winner && winner[0], summary: doc && doc.summary, open_questions: doc && doc.open_questions }
