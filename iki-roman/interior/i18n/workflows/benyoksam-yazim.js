export const meta = {
  name: 'benyoksam-yazim',
  description: 'BEN YOKSAM – bölüm bölüm yeniden yazım: yazar → mekanik kontrol → editör okuması → düzeltme',
  phases: [{ title: 'Yazım' }, { title: 'Editör' }, { title: 'Düzeltme' }],
}
const { units } = args
const I = '/home/user/Notion/iki-roman/interior'
const B = `${I}/benyoksam`
const src = u => `${B}/src/${u}.json`
const ctx = u => `${B}/ctx/${u}.json`
const out = u => `${B}/work/${u}.json`
const CHECK = u => `cd ${I} && python3 tools/byk_check.py --unit ${u}`
const RULES = u => `BEN YOKSAM – Tuncay Sancak'ın YOLCU romanından türetilen, kendi başına duran YENİ kitap. Konsept belgesi (bağlayıcı): ${I}/../analyse/BEN_YOKSAM_Konsept.md ve makine hâli ${I}/i18n/benyoksam_konsept.json. Kitabın bütün bölüm listesi: ${B}/outline.md. Okurun defteri (korunacak cümleler, iki eleştiri): ${I}/../analyse/Okur_Notlari_Tuncay_2026-10.md.
Bu bölüm: kaynak ${src(u)} (YOLCU'daki hâli: paras = pid, style, text (<b>/<i> ile), image, label; constraints = kalması gereken sistem; synopsis), bağlam ${ctx(u)} (plan = bu bölüm için konseptteki değişiklik düzeyi ve ne yapılacağı; synopsis_around = komşu bölümler; name_map = ad haritası; remove_sahit = bu bölümde kaldırılacak ŞAHİT bağları; forbidden = yasak dizeler ve eski adlar).
Tuncay'ın „ÜÇÜNCÜ GÖZ“ metni (${I}/../analyse/BEN_YOKSAM_Ucuncu_Goz_Tuncay_Metni.md; yerleşim ${I}/../analyse/BEN_YOKSAM_Ucuncu_Goz_Yerlesim.md) perde aralarında ARA BÖLÜM olarak otomatik eklenir (${B}/interludes.json): bölüm dosyasına YAZMA, sahnelerde tekrar etme; bağlamdaki ctx.ucuncu_goz.frame (bu bölümde yapılacak çerçeve cümleleri) ve ctx.ucuncu_goz.irfan_dedupe (irfan dokunuşlarının kısaltılması/kaldırılması) uygulanır; bu bölümden sonra bir ara bölüm geliyorsa (interlude_after_this_chapter) bölümün son sahnesi ona yumuşakça açılır, ama metinden alıntı yapmaz.
Çıktı: ${out(u)} → {"uid": "${u}", "paras": [{"style": "Heading 1", "text": "…"}, {"style": "Opening", "text": "…"}, {"style": "Normal", "text": "…"}, {"style": "Book Inset", "text": "ŞÜPHECİ: …"}, {"style": "Scene Break", "text": "•  •  •"}, {"image": 1238}, …]} – kaynaktaki sırayla, bölümün TAMAMI (kısaltma yapılacaksa plan ne diyorsa o kadar).
KURALLAR (makineyle denetlenir): (1) İlk satır kaynaktaki numarayla bölüm başlığı (Heading 1, „N. Başlık“); numaralar YOLCU'daki gibi kalır (6, 10, 14, 19, 27, 33, 41 yok – bu boşluklar SENİ BUL şifresidir). constraints.title_letter doluysa başlık o harfle başlamalı. (2) „14.53 ↺“ paragrafları (style Normal, metin aynen „14.53 ↺“) kaynaktaki sayıda ve sırada; her birinden SONRAKİ ilk dolu paragraf constraints.marks'taki harfle başlar (BAŞA DÖN). (3) „Düğümün iki ucu aynı uzunluktaydı“ cümlesi kaynaktaki sayıda, aynen; her birinden SONRAKİ paragraf constraints.knots'taki harfle başlar (BENİ ARAMA). (4) Resimler {"image": pid} kaynaktaki yerde; Book Part (perde başlığı) kaynakta varsa burada da var (metni konsepte göre değişebilir). (5) Yasak dizeler ve eski adlar (forbidden) geçmez; adlar name_map'e göre. (6) İç sesler Book Inset ve „ETİKET: metin“ biçiminde, etiketler VERSAL. (7) <b>/<i> dışında işaret yok; Markdown yok. (8) Türkçe, TDK yazımı; diyalog noktalaması kaynaktaki gibi (“…” tırnak, „…” dedi“ önünde virgül). (9) Yazarın sesi: okurun defterindeki yıldızlı/sayfa numaralı cümleler aynen kalır; sahne sonu özdeyişleri yaklaşık üçte bir azaltılır, hukuk/mahkeme usul dili seyreltilir (okurun eleştirileri). Kaynaktaki iyi cümleleri gereksiz yere yeniden yazma: plan „aynen“ diyorsa yalnız ad değişimi, ŞAHİT bağlarının kaldırılması ve planın istediği tek cümlelik tohumlar; „hafif“ ise ek olarak kısaltma/seyreltme ve planın eklemeleri; „yeniden“ ise sahne düzeyinde yeniden kurgu, ama olay örgüsünün iskeleti ve sistem korunur. (10) Yapay zekâ–Deccal katmanı, araştırmacı/nörofarklı gizli kahraman, Tuncay Sancak/@happytuncay ve kutsal cevaplar YALNIZ konseptin bu bölüm için öngördüğü ölçüde girer; başka bölümlere ait açıklamaları öne alma. (11) Mantık: tarih/saat, kim nerede, kimin ne bildiği komşu bölümlerin özetleriyle tutarlı. (12) Dosyayı yazdıktan sonra MUTLAKA: ${CHECK(u)} – „ERGEBNIS: OK“ gelene kadar düzelt; uyarıları oku (uzunluk uyarısı plana uygunsa kabul).`
const STAGE = { type: 'object', properties: { ok: { type: 'boolean' }, errors: { type: 'array', items: { type: 'string' } }, warnings: { type: 'array', items: { type: 'string' } }, notes: { type: 'string' } }, required: ['ok', 'errors', 'warnings', 'notes'] }
const ISSUES = { type: 'object', properties: { issues: { type: 'array', items: { type: 'object', properties: { index: { type: 'integer' }, severity: { type: 'string', enum: ['high', 'medium', 'low'] }, kind: { type: 'string' }, problem: { type: 'string' }, fix: { type: 'string' } }, required: ['index', 'severity', 'kind', 'problem', 'fix'] } }, verdict: { type: 'string' } }, required: ['issues', 'verdict'] }

async function write(u) {
  let r = await agent(`${RULES(u)}
Rolün: Tuncay Sancak'ın sesini taşıyan romancı-editör. Kaynağı, bağlamı ve konseptin ilgili bölümlerini tamamen oku; bölümü BEN YOKSAM için yaz; dosyayı yaz; denetle; düzelt. Dön: ok, errors, warnings, notes (ne değişti, hangi tohumlar ekildi, hangi cümleler aynen kaldı, editöre sorular).`, { label: `${u} yazım`, phase: 'Yazım', schema: STAGE, effort: 'high' })
  for (let k = 0; r && !r.ok && k < 2; k++) {
    r = await agent(`${RULES(u)}
${out(u)} var ama denetim hata veriyor: ${JSON.stringify(r.errors)}. Yalnız bu hataları gider, dosyayı yeniden yaz, denetle (OK olana kadar). Dön: ok, errors, warnings, notes.`, { label: `${u} yazım-fix${k + 1}`, phase: 'Yazım', schema: STAGE, effort: 'high' })
  }
  return r
}
async function review(u, prev) {
  return agent(`${RULES(u)}
Rolün: sıkı yayınevi editörü ve mantık okuru. ${out(u)} dosyasını kaynakla, konseptle, komşu bölüm özetleriyle ve okurun defteriyle karşılaştır. Yazarın notları: ${JSON.stringify(prev && prev.notes)}. Ara: (a) plana aykırılık (eksik tohum, fazla açıklama, başka bölümün sırrını erken verme), (b) mantık/süreklilik hatası (zaman, mekân, kim ne biliyor, adlar), (c) ŞAHİT kalıntısı ya da YOLCU çiftine gönderme, (d) sesin bozulması (YOLCU'nun kısa, keskin, ironik cümleleri yerine açıklayıcı/şişkin anlatım; yapay zekâ katmanında klişe), (e) okurun sevdiği cümlelerin kaybı, (f) kutsal cevaplarda saygısızlık ya da doktrin iddiası, (g) dil ve yazım. Her bulgu: index (paras dizisindeki sıra), severity, kind, problem, fix (somut yeni metin). Dosyayı DEĞİŞTİRME. verdict: bir cümle.`, { label: `${u} editör`, phase: 'Editör', schema: ISSUES, effort: 'high' })
}
async function fix(u, issues) {
  return agent(`${RULES(u)}
${out(u)} dosyasında editör bulguları var: ${JSON.stringify(issues, null, 1)}. high ve medium bulguları uygula (low'u kendi kararınla), yeni sorun ekleme, dosyayı yeniden yaz, denetle (OK). Dön: ok, errors, warnings, notes (uygulanan/reddedilen).`, { label: `${u} düzeltme`, phase: 'Düzeltme', schema: STAGE, effort: 'high' })
}
const results = await pipeline(units,
  u => write(u),
  (w, u) => review(u, w).then(v => ({ w, v })),
  async ({ w, v }, u) => {
    let rounds = 0, f = null, cur = v
    while (cur && cur.issues.some(i => i.severity !== 'low') && rounds < 2) {
      f = await fix(u, cur.issues.filter(i => i.severity !== 'low'))
      rounds++
      cur = await review(u, f)
    }
    const high = cur ? cur.issues.filter(i => i.severity === 'high').length : -1
    const medium = cur ? cur.issues.filter(i => i.severity === 'medium').length : -1
    log(`${u}: bitti – açık bulgu high ${high}, medium ${medium}, düzeltme turu ${rounds}`)
    return { uid: u, ok: !!(f ? f.ok : w && w.ok), high, medium, rounds, verdict: cur && cur.verdict }
  }
)
return { units: results.filter(Boolean), failed: units.filter((u, i) => !results[i]) }
