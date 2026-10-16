export const meta = {
  name: 'benyoksam-revizyon',
  description: 'BEN YOKSAM – yazılmış bölümlere hedefli revizyon (yama dosyasına göre): revizyoncu → mekanik kontrol → editör → düzeltme',
  phases: [{ title: 'Revizyon' }, { title: 'Editör' }, { title: 'Düzeltme' }],
}
const { patch, units } = args
const I = '/home/user/Notion/iki-roman/interior'
const B = `${I}/benyoksam`
const out = u => `${B}/work/${u}.json`
const CHECK = u => `cd ${I} && python3 tools/byk_check.py --unit ${u}`
const RULES = u => `BEN YOKSAM – Tuncay Sancak'ın romanı. Bağlayıcı: konsept ${I}/../analyse/BEN_YOKSAM_Konsept.md ve ${I}/i18n/benyoksam_konsept.json; ara bölümler ${B}/interludes.json (Tuncay'ın ÜÇÜNCÜ GÖZ metni – bölüm dosyasına YAZILMAZ); yama dosyası ${patch} (bu bölüm için units[].uid == "${u}" girdisi: what, text, remove; ayrıca decision); bölüm kaynağı ${B}/src/${u}.json, bağlam ${B}/ctx/${u}.json; bütün kitap ${B}/reading/full.txt ([uid:index]).
Bölüm dosyası ${out(u)} ZATEN YAZILMIŞ ve editörden geçmiş metindir: {"uid", "paras": [{"style","text"} | {"image": pid}]}. Ayrıca ${B}/open_issues.json içinde bu bölüm ("${u}") için kayıtlı önceki editör bulguları (high/medium; index, problem, fix) varsa onlar da uygulanır (yama ile çelişirse yama önceliklidir). Görev yalnız yamanın ve bu bulguların bu bölüm için istediğini uygulamak: istenen sahne/cümleleri doğru yere eklemek, remove listesindekileri çıkarmak/değiştirmek, bağlantı cümlelerini düzeltmek. Geri kalan metin KELİMESİ KELİMESİNE korunur. Yama metni öneridir: romanın sesine, sahnenin akışına ve komşu bölümlere uydurarak yerleştir; çelişki görürsen yamanın amacını (decision) koruyarak çöz ve notlarda belirt.
Kurallar (makineyle denetlenir): ilk satır bölüm başlığı (numara ve harf kısıtı aynen); „14.53 ↺“ paragrafları ve sonrasındaki harfler; „Düğümün iki ucu aynı uzunluktaydı“ cümleleri ve sonrasındaki harfler; resimler {"image": pid} aynı yerde; Book Part aynen; yasak dizeler ve eski adlar yok; iç sesler „ETİKET: metin“ (Book Inset); yalnız <b>/<i>; TDK yazımı. Dosyayı yazınca MUTLAKA: ${CHECK(u)} – „ERGEBNIS: OK“ olana kadar düzelt.`
const STAGE = { type: 'object', properties: { ok: { type: 'boolean' }, errors: { type: 'array', items: { type: 'string' } }, warnings: { type: 'array', items: { type: 'string' } }, notes: { type: 'string' } }, required: ['ok', 'errors', 'warnings', 'notes'] }
const ISSUES = { type: 'object', properties: { issues: { type: 'array', items: { type: 'object', properties: { index: { type: 'integer' }, severity: { type: 'string', enum: ['high', 'medium', 'low'] }, kind: { type: 'string' }, problem: { type: 'string' }, fix: { type: 'string' } }, required: ['index', 'severity', 'kind', 'problem', 'fix'] } }, verdict: { type: 'string' } }, required: ['issues', 'verdict'] }
async function revise(u) {
  let r = await agent(`${RULES(u)}
Rolün: romanın yazar-editörü (Tuncay Sancak'ın sesi). Yamayı uygula, dosyayı yaz, denetle. Dön: ok, errors, warnings, notes (ne eklendi/çıkarıldı, index'leriyle).`, { label: `${u} revizyon`, phase: 'Revizyon', schema: STAGE, effort: 'high' })
  for (let k = 0; r && !r.ok && k < 2; k++) {
    r = await agent(`${RULES(u)}
Denetim hata veriyor: ${JSON.stringify(r.errors)}. Yalnız bunları gider, dosyayı yeniden yaz, denetle. Dön: ok, errors, warnings, notes.`, { label: `${u} revizyon-fix${k + 1}`, phase: 'Revizyon', schema: STAGE, effort: 'high' })
  }
  return r
}
async function review(u, prev) {
  return agent(`${RULES(u)}
Rolün: sıkı yayınevi editörü ve mantık okuru. Revizyon notları: ${JSON.stringify(prev && prev.notes)}. ${out(u)} dosyasını yama, konsept ve komşu bölümlerle (reading/full.txt) karşılaştır: yama eksiksiz ve doğru yerde mi; yeni sahneler inandırıcı, yoğun ve romanın sesinde mi (vaaz/aforizma yığılması yok); zaman çizgisi, kim ne biliyor, gizli kahramanın kimliği erken açılmıyor mu; korunması gereken metin bozulmuş mu; dil ve yazım. Her bulgu: index, severity, kind, problem, fix (somut metin). Dosyayı DEĞİŞTİRME.`, { label: `${u} editör`, phase: 'Editör', schema: ISSUES, effort: 'high' })
}
async function fix(u, issues) {
  return agent(`${RULES(u)}
Editör bulguları: ${JSON.stringify(issues, null, 1)}. high ve medium bulguları uygula (low'u kendi kararınla), yeni sorun ekleme, dosyayı yaz, denetle. Dön: ok, errors, warnings, notes.`, { label: `${u} düzeltme`, phase: 'Düzeltme', schema: STAGE, effort: 'high' })
}
const results = await pipeline(units,
  u => revise(u),
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
    log(`${u}: revizyon bitti – açık bulgu high ${high}, medium ${medium}, tur ${rounds}`)
    return { uid: u, ok: !!(f ? f.ok : w && w.ok), high, medium, rounds, verdict: cur && cur.verdict }
  }
)
return { units: results.filter(Boolean), failed: units.filter((u, i) => !results[i]) }
