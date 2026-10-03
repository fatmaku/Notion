// One-pager generator: builds OnePager_DE.pdf, OnePager_TR.pdf, OnePager_EN.pdf (A4, one page each).
// Usage: node build-onepager.js [de|tr|en ...]
// Uses Playwright (Chromium) and the Aybal brand fonts from ../aybal-show/assets/fonts.css.
const fs = require('fs');
const os = require('os');
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const ROOT = path.resolve(__dirname, '..');
const FONTS = 'file://' + path.join(ROOT, 'aybal-show/assets/fonts.css');

const T = {
  de: {
    lang: 'de', file: 'OnePager_DE.pdf',
    kicker: 'Portfolio-Investment · Vertraulich · Oktober 2026',
    title: 'Eine Stimme, drei Produkte',
    sub: 'Sprachtechnologie für Familie, Bildung und Creator – in Deutsch, Türkisch und Englisch.',
    askLabel: 'Gesamtvolumen', ask: '500.000 €',
    pillars: [['Sprachtechnologie', 'Vorlesen mit Stimme (Aybal) und Sprache → Live-Effekt in < 1 s (LiveFX)'], ['Drei Sprachen', 'DE/TR/EN von Anfang an – nicht nachträglich lokalisiert'], ['Familie · Bildung · Creator', 'Ein Publikum, drei Zugänge, gemeinsame Content-IP']],
    projects: [
      { c: 'gold', tag: 'Aybal', what: 'Familienvorlesen mit natürlichen und persönlichen Stimmen; eigene Bücher und Dokumente werden Wort für Wort vorgelesen.', status: 'Plattform gebaut · Closed Beta ab 12.10.2026 · DE-Launch 20.11.2026', nums: [['1.779', 'automatisierte Tests'], ['13', 'Stimmsprachen'], ['101 Mio.', 'Familien im Zielmarkt'], ['7,6 Mrd. €', 'TAM']], extra: 'Plus 9,99 €/Monat · Family 24,99 €/Monat · Break-even (Szenario) Aug. 2030 / Okt. 2031', src: 'Aybal_Investor_Deck.pptx' },
      { c: 'pink', tag: 'LiveFX', what: 'Live-Streams, die zuhören: Memes, Sounds und Szenen per Stimme; Story-Modus, Zuschauer-Trigger.', status: 'Version 2.0 funktionsfähig · noch keine Umsätze · TR-Launch Q4 2026', nums: [['238', 'Trigger in 5 Paketen'], ['13', 'animierte Szenen'], ['97–157 Mrd. USD', 'Live-Streaming-Markt 2026'], ['5.000–15.000', 'Zahlende J3 (SOM, Schätz.)']], extra: 'Pro 9,99 €/Monat · Bedarf laut Businessplan 250–350 T€ Seed', src: 'live-fx/business/BUSINESSPLAN.md' },
      { c: 'violet', tag: 'Buchreihe', what: '„Benim Nörofarklı Pusulam / Mein neurodiverser Kompass / My Neurodivergent Compass“ – Content-IP für Aybal und LiveFX.', status: '5 Bände in TR/DE/EN · Trailer in 3 Sprachen · Teen-Ableger in Arbeit', nums: [['5', 'Bände'], ['3', 'Sprachen'], ['4', 'Teen-Titel'], ['1', 'Geschenkbuch in 3 Sprachen']], extra: '„İyi ki Varsın / Gut, dass es dich gibt / Good That You Exist“', src: 'deniz-trailer/, deniz-teen/books.js' },
    ],
    splitHead: 'Vorgeschlagene Aufteilung der 500.000 €', proposal: 'Vorschlag – bitte bestätigen',
    split: [['Aybal', '250.000 €', 50, 'wie im Aybal-Deck: Cap 1,30 Mio. € pre-money'], ['LiveFX', '200.000 €', 40, 'Basis-Kosten J1 165 T€ + Puffer'], ['Buchreihe', '50.000 €', 10, 'Hörfassungen, Editionen, Rechte']],
    synHead: 'Synergien', syn: ['Gemeinsamer Sprach- und Stimm-Stack', 'Buchreihe speist Aybal-Titel und LiveFX-Story-Packs', 'Gemeinsame DE/TR-Community als Startmarkt', 'Cross-Selling: Vorlese-Streams → Aybal → WortBild'],
    msHead: '24 Monate (Auszug)', ms: [['Aybal', 'Beta Q4 26 · Closing Mär. 27 · Gate 1 Apr. 27 · Gate 2 Q1 28'], ['LiveFX', 'TR-Launch Q4 26 · Pro Q1 27 · Mobile Q2 27 · Plattform-Pilot Q3 27'], ['Buchreihe', 'Hörfassungen Q1 27 · Verlags-Pilot Q3 27 (Vorschlag)']],
    structHead: 'Struktur', struct: 'Holding, getrennte SPVs oder Hybrid – neutral dargestellt, Rechts- und Steuerberatung erforderlich.',
    riskHead: 'Risiken', risk: 'Nachfrage unbewiesen · Schlüsselpersonen · Fokus · Stimme/Urheberrecht/Kinder-Datenschutz · Plattformen · TRY',
    team: 'Tuncay Sancak – Gründer & Erfinder (Aybal) · Gönül Demet – Investor Relations · [Name] – Gründerin LiveFX, Autorin der Buchreihe',
    contact: 'Kontakt: Gönül Demet · [E-Mail] · [Telefon]',
    disc: 'Szenarien und Schätzungen aus den Projektunterlagen, keine Prognosen. Eine Investition kann zum Totalverlust führen.',
  },
  tr: {
    lang: 'tr', file: 'OnePager_TR.pdf',
    kicker: 'Portföy yatırımı · Gizli · Ekim 2026',
    title: 'Tek ses, üç ürün',
    sub: 'Aile, eğitim ve içerik üreticileri için ses teknolojisi – Türkçe, Almanca ve İngilizce.',
    askLabel: 'Toplam yatırım', ask: '500.000 €',
    pillars: [['Ses teknolojisi', 'Sesli okuma (Aybal) ve konuşmadan < 1 sn’de canlı efekt (LiveFX)'], ['Üç dil', 'Baştan itibaren TR/DE/EN – sonradan yerelleştirme değil'], ['Aile · Eğitim · Yayıncılar', 'Tek kitle, üç giriş noktası, ortak içerik']],
    projects: [
      { c: 'gold', tag: 'Aybal', what: 'Doğal ve kişisel seslerle ailece sesli okuma; ailenin kendi kitapları ve belgeleri kelime kelime okunur.', status: 'Platform hazır · Kapalı beta 12.10.2026 · Almanya lansmanı 20.11.2026', nums: [['1.779', 'otomatik test'], ['13', 'ses dili'], ['101 milyon', 'hedef pazarda aile'], ['7,6 milyar €', 'TAM']], extra: 'Plus aylık 9,99 € · Family aylık 24,99 € · Başabaş (senaryo) Ağu. 2030 / Eki. 2031', src: 'Aybal_Investor_Deck.pptx' },
      { c: 'pink', tag: 'LiveFX', what: 'Dinleyen canlı yayınlar: sesle meme, ses efekti ve sahneler; hikâye modu, izleyici tetikleyicileri.', status: 'Sürüm 2.0 çalışıyor · henüz gelir yok · TR lansmanı 4Ç 2026', nums: [['238', 'tetikleyici, 5 paket'], ['13', 'animasyonlu sahne'], ['97–157 milyar USD', '2026 canlı yayın pazarı'], ['5.000–15.000', '3. yıl ücretli (SOM, tahmin)']], extra: 'Pro aylık 9,99 € · İş planına göre ihtiyaç 250–350 bin € seed', src: 'live-fx/business/BUSINESSPLAN.md' },
      { c: 'violet', tag: 'Kitap serisi', what: '“Benim Nörofarklı Pusulam / Mein neurodiverser Kompass / My Neurodivergent Compass” – Aybal ve LiveFX için içerik.', status: 'TR/DE/EN 5 kitap · 3 dilde fragmanlar · Gençlik serisi hazırlanıyor', nums: [['5', 'kitap'], ['3', 'dil'], ['4', 'gençlik kitabı'], ['1', '3 dilde hediye kitap']], extra: '“İyi ki Varsın / Gut, dass es dich gibt / Good That You Exist”', src: 'deniz-trailer/, deniz-teen/books.js' },
    ],
    splitHead: '500.000 €’nun önerilen dağılımı', proposal: 'Öneri – lütfen onaylayın',
    split: [['Aybal', '250.000 €', 50, 'Aybal sunumundaki gibi: tavan 1,30 milyon € pre-money'], ['LiveFX', '200.000 €', 40, '1. yıl baz maliyeti 165 bin € + tampon'], ['Kitap serisi', '50.000 €', 10, 'Sesli sürümler, baskılar, haklar']],
    synHead: 'Sinerjiler', syn: ['Ortak konuşma ve ses altyapısı', 'Kitap serisi Aybal kitaplarını ve LiveFX hikâye paketlerini besler', 'Başlangıç pazarı olarak ortak TR/DE topluluğu', 'Çapraz satış: okuma yayınları → Aybal → WortBild'],
    msHead: '24 ay (özet)', ms: [['Aybal', 'Beta 4Ç 26 · Kapanış Mart 27 · Kapı 1 Nisan 27 · Kapı 2 1Ç 28'], ['LiveFX', 'TR lansmanı 4Ç 26 · Pro 1Ç 27 · Mobil 2Ç 27 · Platform pilotu 3Ç 27'], ['Kitap serisi', 'Sesli sürümler 1Ç 27 · Yayıncı pilotu 3Ç 27 (öneri)']],
    structHead: 'Yapı', struct: 'Holding, ayrı SPV’ler ya da hibrit – tarafsız sunulmuştur, hukuk ve vergi danışmanlığı gereklidir.',
    riskHead: 'Riskler', risk: 'Talep kanıtlanmadı · Kilit kişiler · Odak · Ses/telif/çocuk verileri · Platformlar · TL kuru',
    team: 'Tuncay Sancak – Kurucu & Mucit (Aybal) · Gönül Demet – Yatırımcı İlişkileri · [İsim] – LiveFX kurucusu, kitap serisinin yazarı',
    contact: 'İletişim: Gönül Demet · [E-posta] · [Telefon]',
    disc: 'Senaryolar ve tahminler proje belgelerinden alınmıştır, öngörü değildir. Yatırım, sermayenin tamamen kaybına yol açabilir.',
  },
  en: {
    lang: 'en', file: 'OnePager_EN.pdf',
    kicker: 'Portfolio investment · Confidential · October 2026',
    title: 'One voice, three products',
    sub: 'Voice technology for families, education and creators – in German, Turkish and English.',
    askLabel: 'Total round', ask: '€500,000',
    pillars: [['Voice technology', 'Read-aloud with voice (Aybal) and speech → live effect in < 1 s (LiveFX)'], ['Three languages', 'DE/TR/EN from day one – not localised later'], ['Family · education · creators', 'One audience, three entry points, shared content IP']],
    projects: [
      { c: 'gold', tag: 'Aybal', what: 'Family read-aloud with natural and personal voices; a family’s own books and documents read word by word.', status: 'Platform built · closed beta from 12 Oct 2026 · Germany launch 20 Nov 2026', nums: [['1,779', 'automated tests'], ['13', 'voice languages'], ['101M', 'families in target markets'], ['€7.6B', 'TAM']], extra: 'Plus €9.99/month · Family €24.99/month · break-even (scenario) Aug 2030 / Oct 2031', src: 'Aybal_Investor_Deck.pptx' },
      { c: 'pink', tag: 'LiveFX', what: 'Live streams that listen: memes, sounds and scenes by voice; story mode, viewer triggers.', status: 'Version 2.0 working · no revenue yet · Turkish launch Q4 2026', nums: [['238', 'triggers in 5 packs'], ['13', 'animated scenes'], ['$97–157B', 'live-streaming market 2026'], ['5,000–15,000', 'paying users Y3 (SOM, est.)']], extra: 'Pro €9.99/month · need per business plan €250–350k seed', src: 'live-fx/business/BUSINESSPLAN.md' },
      { c: 'violet', tag: 'Book series', what: '“Benim Nörofarklı Pusulam / Mein neurodiverser Kompass / My Neurodivergent Compass” – content IP for Aybal and LiveFX.', status: '5 books in TR/DE/EN · trailers in 3 languages · teen spin-off in progress', nums: [['5', 'books'], ['3', 'languages'], ['4', 'teen titles'], ['1', 'gift book in 3 languages']], extra: '“İyi ki Varsın / Gut, dass es dich gibt / Good That You Exist”', src: 'deniz-trailer/, deniz-teen/books.js' },
    ],
    splitHead: 'Proposed split of the €500,000', proposal: 'Proposal – please confirm',
    split: [['Aybal', '€250,000', 50, 'as in the Aybal deck: €1.30M pre-money cap'], ['LiveFX', '€200,000', 40, 'year-1 base costs €165k + buffer'], ['Book series', '€50,000', 10, 'audio editions, print, rights']],
    synHead: 'Synergies', syn: ['Shared speech and voice stack', 'Book series feeds Aybal titles and LiveFX story packs', 'Shared DE/TR community as launch market', 'Cross-selling: read-aloud streams → Aybal → WortBild'],
    msHead: '24 months (excerpt)', ms: [['Aybal', 'Beta Q4 26 · close Mar 27 · Gate 1 Apr 27 · Gate 2 Q1 28'], ['LiveFX', 'Turkish launch Q4 26 · Pro Q1 27 · mobile Q2 27 · platform pilot Q3 27'], ['Book series', 'Audio editions Q1 27 · publisher pilot Q3 27 (proposal)']],
    structHead: 'Structure', struct: 'Holding, separate SPVs or hybrid – presented neutrally, legal and tax advice required.',
    riskHead: 'Risks', risk: 'Demand unproven · key people · focus · voice/copyright/children’s data · platforms · TRY',
    team: 'Tuncay Sancak – Founder & Inventor (Aybal) · Gönül Demet – Investor Relations · [Name] – Founder of LiveFX, author of the book series',
    contact: 'Contact: Gönül Demet · [email] · [phone]',
    disc: 'Scenarios and estimates from the project documents, not forecasts. An investment may result in total loss.',
  },
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function html(d) {
  const col = { gold: '#D4B27A', pink: '#FF2D75', violet: '#A08FFF' };
  return `<!doctype html><html lang="${d.lang}"><head><meta charset="utf-8"><title>${esc(d.title)}</title>
<link rel="stylesheet" href="${FONTS}">
<style>
@page { size: A4; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 210mm; height: 297mm; }
body { background: #15111A; color: #F4EDE2; font-family: 'Jost', Arial, sans-serif; font-size: 8.6pt; line-height: 1.38; padding: 11mm 12mm 9mm; display: flex; flex-direction: column; gap: 4.2mm; }
h1, h2, .num, .ask { font-family: 'Cormorant Garamond', Georgia, serif; }
.top { display: flex; justify-content: space-between; align-items: flex-end; gap: 8mm; }
.kicker { font-size: 7.5pt; letter-spacing: .22em; text-transform: uppercase; color: #D4B27A; font-weight: 600; }
h1 { font-size: 33pt; line-height: 1; font-weight: 700; margin: 2mm 0 1.5mm; }
.sub { color: #BDB3C4; font-size: 10pt; max-width: 120mm; }
.askbox { background: #241C2A; border: 1px solid #3A2E40; border-radius: 4mm; padding: 3.5mm 5mm; text-align: right; min-width: 48mm; }
.askbox small { display: block; font-size: 7pt; letter-spacing: .2em; text-transform: uppercase; color: #D4B27A; font-weight: 600; }
.ask { font-size: 26pt; font-weight: 700; line-height: 1.05; }
.wave { display: flex; align-items: center; gap: 1.1mm; height: 7mm; }
.wave i { display: block; width: 1.2mm; border-radius: 1mm; }
.pillars { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; }
.pillar { border-top: 0; background: #1E1823; border-radius: 3mm; padding: 2.6mm 3.4mm; }
.pillar b { display: block; font-size: 9.4pt; margin-bottom: .6mm; }
.pillar span { color: #BDB3C4; }
.projects { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; }
.proj { background: #241C2A; border: 1px solid #3A2E40; border-radius: 3.5mm; padding: 3.6mm; display: flex; flex-direction: column; gap: 2mm; }
.tag { align-self: flex-start; border: 1.2px solid currentColor; border-radius: 9mm; padding: .5mm 3mm; font-size: 7pt; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; }
.proj p { color: #E6DCEB; }
.status { color: #BDB3C4; font-size: 7.8pt; }
.nums { display: grid; grid-template-columns: 1fr 1fr; gap: 1.6mm 2.5mm; }
.num { font-size: 15pt; font-weight: 700; line-height: 1.05; }
.nums small { display: block; color: #BDB3C4; font-size: 7pt; line-height: 1.25; }
.extra { font-size: 7.8pt; color: #E6DCEB; }
.src { margin-top: auto; font-size: 6.6pt; color: #8C8294; font-style: italic; }
.split { background: #241C2A; border: 1px solid #3A2E40; border-radius: 3.5mm; padding: 3.6mm 4mm; }
.split .head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2.5mm; }
h2 { font-size: 13.5pt; font-weight: 700; }
.prop { border: 1.2px solid #FF2D75; color: #FF2D75; border-radius: 9mm; padding: .5mm 3mm; font-size: 7pt; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
.bar { display: flex; height: 7mm; border-radius: 2mm; overflow: hidden; margin-bottom: 2.2mm; }
.bar div { display: flex; align-items: center; justify-content: center; color: #15111A; font-weight: 700; font-size: 8pt; }
.legend { display: grid; grid-template-columns: 5fr 4fr 3fr; gap: 3mm; }
.legend b { font-size: 9.5pt; }
.legend .amt { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 14pt; font-weight: 700; margin-left: 1.5mm; }
.legend small { display: block; color: #BDB3C4; font-size: 7.4pt; }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; }
.box { background: #1E1823; border-radius: 3mm; padding: 3mm 3.6mm; }
.box h3 { font-size: 7.5pt; letter-spacing: .18em; text-transform: uppercase; color: #D4B27A; margin-bottom: 1.4mm; }
.box ul { list-style: none; }
.box li { padding-left: 3.4mm; position: relative; margin-bottom: .8mm; }
.box li::before { content: ''; position: absolute; left: 0; top: 1.6mm; width: 1.5mm; height: 1.5mm; border-radius: 50%; background: #FF2D75; }
.ms div { margin-bottom: 1mm; display: grid; grid-template-columns: 21mm 1fr; gap: 2mm; }
.foot { margin-top: auto; border-top: 1px solid #3A2E40; padding-top: 2.6mm; display: flex; flex-direction: column; gap: 1mm; }
.foot .contact { font-weight: 600; font-size: 9.2pt; color: #FFFFFF; }
.foot .disc { font-size: 6.8pt; color: #8C8294; font-style: italic; }
</style></head><body>
<div class="top"><div>
<div class="kicker">${esc(d.kicker)}</div>
<h1>${esc(d.title)}</h1>
<div class="sub">${esc(d.sub)}</div>
</div>
<div class="askbox"><small>${esc(d.askLabel)}</small><div class="ask">${esc(d.ask)}</div></div></div>
<div class="wave">${Array.from({ length: 70 }, (_, i) => { const a = Math.abs(Math.sin(i * 0.55) * 0.75 + Math.sin(i * 1.7) * 0.25); return `<i style="height:${(1.2 + 5.6 * a).toFixed(1)}mm;background:${i < 35 ? '#D4B27A' : '#FF2D75'}"></i>`; }).join('')}</div>
<div class="pillars">${d.pillars.map(([h, t]) => `<div class="pillar"><b>${esc(h)}</b><span>${esc(t)}</span></div>`).join('')}</div>
<div class="projects">${d.projects.map((p) => `<div class="proj"><span class="tag" style="color:${col[p.c]}">${esc(p.tag)}</span>
<p>${esc(p.what)}</p><div class="status">${esc(p.status)}</div>
<div class="nums">${p.nums.map(([n, l]) => `<div><div class="num" style="color:${col[p.c]}">${esc(n)}</div><small>${esc(l)}</small></div>`).join('')}</div>
<div class="extra">${esc(p.extra)}</div><div class="src">${esc(p.src)}</div></div>`).join('')}</div>
<div class="split"><div class="head"><h2>${esc(d.splitHead)}</h2><span class="prop">${esc(d.proposal)}</span></div>
<div class="bar">${d.split.map(([, , p], i) => `<div style="width:${p}%;background:${[col.gold, col.pink, col.violet][i]}">${p} %</div>`).join('')}</div>
<div class="legend">${d.split.map(([n, a, , s], i) => `<div><b style="color:${[col.gold, col.pink, col.violet][i]}">${esc(n)}</b><span class="amt">${esc(a)}</span><small>${esc(s)}</small></div>`).join('')}</div></div>
<div class="two">
<div class="box"><h3>${esc(d.synHead)}</h3><ul>${d.syn.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></div>
<div class="box ms"><h3>${esc(d.msHead)}</h3>${d.ms.map(([n, t]) => `<div><b>${esc(n)}</b><span>${esc(t)}</span></div>`).join('')}</div>
<div class="box"><h3>${esc(d.structHead)}</h3>${esc(d.struct)}</div>
<div class="box"><h3>${esc(d.riskHead)}</h3>${esc(d.risk)}</div>
</div>
<div class="foot"><div>${esc(d.team)}</div><div class="contact">${esc(d.contact)}</div><div class="disc">${esc(d.disc)}</div></div>
</body></html>`.replace(/(\d+) %/g, d.lang === 'tr' ? '%$1' : (d.lang === 'en' ? '$1%' : '$1 %'));
}

(async () => {
  const langs = process.argv.slice(2).length ? process.argv.slice(2) : ['de', 'tr', 'en'];
  const browser = await chromium.launch();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'onepager-'));
  for (const l of langs) {
    const d = T[l];
    const f = path.join(tmp, `onepager-${l}.html`);
    fs.writeFileSync(f, html(d));
    const page = await browser.newPage();
    await page.goto('file://' + f);
    await page.evaluate(() => document.fonts.ready);
    const h = await page.evaluate(() => document.body.scrollHeight);
    await page.pdf({ path: path.join(__dirname, d.file), format: 'A4', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 }, pageRanges: '1' });
    console.log('wrote', d.file, 'content height px', h);
    await page.close();
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
