// LiveFX one-pager generator: builds OnePager_DE.pdf, OnePager_TR.pdf, OnePager_EN.pdf (A4, one page each).
// Usage: node build-onepager.js [de|tr|en ...]
// Uses Playwright (Chromium), the Lexend font and stills from ../live-fx/business/video/.
const fs = require('fs');
const os = require('os');
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const ROOT = path.resolve(__dirname, '..');
const VID = path.join(ROOT, 'live-fx/business/video');
const url = (p) => 'file://' + p;

const T = {
  de: {
    lang: 'de', file: 'OnePager_DE.pdf',
    kicker: 'Vertraulich · Pre-Seed · Oktober 2026',
    title: 'LiveFX – Live-Streams, die zuhören',
    sub: 'Die Stimme des Creators wird in unter einer Sekunde zu Meme, Sound und animierter Szene – und morgen zum Bild für alles Gesprochene.',
    askLabel: 'Pre-Seed-Runde', ask: '500.000 €', askSub: 'für LiveFX und alle LiveFX-Linien · 24 Monate',
    three: [['Problem', 'Kurzvideos werden geschnitten, Live bleibt roh. Alerts reagieren auf Zuschauer, Soundboards auf Tasten – kein Tool auf das, was der Creator sagt.'], ['Lösung', 'Sprache → Effekt: DE/TR/EN automatisch erkannt, Dialekt-Toleranz, Story-Modus, Zuschauer-Trigger, Handy-Fernbedienung, offline, offene API.'], ['Status', 'Version 2.0 funktionsfähig, im Einsatz in eigenen Streams; noch keine Umsätze. TR-Launch Q4 2026, Pro-Abo Q1 2027.']],
    nums: [['238', 'Trigger in 5 Paketen'], ['13 · 12', 'Szenen · Loops'], ['38', 'eigene Sounds'], ['< 1 s', 'Stimme → Effekt'], ['240+', 'automat. Tests'], ['3', 'Sprachen auto']],
    visionHead: 'Vision 2027–2029: Du redest. Es wird Bild.',
    vision: [['A', 'Erzählfilm', 'Live-Video aus Worten · Prototyp'], ['B', 'WortBild', 'Sprachenlernen mit Bild + Aussprache · Prototyp'], ['C', 'Räume', 'Bühne, Klassenzimmer, AR/VR, Brille'], ['D', 'Studio', 'Highlights und Auto-Edit fertiger Videos']],
    mktHead: 'Markt', mkt: [['97–157 Mrd. USD', 'Live-Streaming 2026 [Q 1, 2]'], ['~50 %', 'Geschenke am Streamer-Einkommen [Q 5, 6]'], ['10–20 Mio. / 1–3 Mio.', 'TAM / SAM Creator (Schätzung)'], ['5.000–15.000', 'Zahlende J3 (SOM, Schätzung)'], ['1,54 Mrd. USD', 'Sprachlern-Apps [Q 33]'], ['3,67 Mrd. USD', 'KI-Video 2026 [Q 23]']],
    modelHead: 'Geschäftsmodell', model: ['Free · Pro 9,99 €/Monat · Packs 2,99–4,99 €', 'Vision: Pro+ 14,99 € · WortBild Familie 4,99 €/Monat', 'Lizenzen: Schule 300–800 €/Jahr · Kurs · Event · Verlag · Agentur · B2B/SDK', 'Grenzkosten nahe null (lokal); Szenen 240- bis > 10.000-mal günstiger als Video-KI'],
    splitHead: 'Mittelverwendung 500.000 € (24 Monate)', proposal: 'Vorschlag – bitte bestätigen',
    split: [[50, 'Team', '250.000 €'], [20, 'Vision-Linien', '100.000 €'], [15, 'GTM & Piloten', '75.000 €'], [10, 'Recht & Datenschutz', '50.000 €'], [5, 'Reserve', '25.000 €']],
    gatesHead: 'KPI-Gates (Zielwerte, Schätzung)',
    gates: [['H1 2027', 'Pro live · 20 Beta-Creator · W4-Retention ≥ [Zahl] %'], ['H2 2027', '20.000 Registrierte · ≈ 800 Pro · 1 Plattform-Pilot'], ['H1 2028', 'Free → Pro ≥ 4 % · M3-Retention ≥ [Zahl] %'], ['H2 2028', '80.000 Registrierte · ≈ 3.200 Pro · B2B 50 T€']],
    finHead: 'Szenario & Runway', fin: ['Basis (BP §11): Ergebnis −114 / −62 / +329 T€ (J1–J3); mit Vision Break-even in J2', 'Runway bei null Umsatz ≈ 22 Monate (250–350 T€ laut BP: ≈ 15–18)', 'Konservativ −316 T€ über 3 J. – mit 500 T€ gedeckt'],
    team: 'Tuncay Sancak – Gründer & Erfinder, Geschäftsführer · Gönül Demet – Investor Relations & Fundraising · Konditionen [offen]',
    contact: 'Investor-Kontakt: Gönül Demet · [E-Mail]',
    disc: 'Quellen: live-fx/business (BUSINESSPLAN, MARKTANALYSE, VISION, QUELLEN); [Q n] = Quelle n. Szenarien und Schätzungen, keine Prognosen. Eine Investition kann zum Totalverlust führen.',
  },
  tr: {
    lang: 'tr', file: 'OnePager_TR.pdf',
    kicker: 'Gizli · Pre-Seed · Ekim 2026',
    title: 'LiveFX – Dinleyen canlı yayınlar',
    sub: 'Yayıncının sesi bir saniyeden kısa sürede meme’e, sese ve animasyonlu sahneye dönüşür – yarın da konuşulan her şeyin görüntüsüne.',
    askLabel: 'Pre-seed turu', ask: '500.000 €', askSub: 'LiveFX ve tüm LiveFX hatları için · 24 ay',
    three: [['Sorun', 'Kısa videolar kurgulanır, canlı yayın ham kalır. Uyarılar izleyiciye, ses panoları tuşlara tepki verir – hiçbir araç yayıncının söylediğine tepki vermez.'], ['Çözüm', 'Konuşma → efekt: DE/TR/EN otomatik tanıma, şive toleransı, hikâye modu, izleyici tetikleyicileri, telefondan kumanda, çevrimdışı, açık API.'], ['Durum', 'Sürüm 2.0 çalışıyor, kendi yayınlarda kullanımda; henüz gelir yok. TR lansmanı 4Ç 2026, Pro abonelik 1Ç 2027.']],
    nums: [['238', 'tetikleyici, 5 paket'], ['13 · 12', 'sahne · döngü'], ['38', 'kendi sesleri'], ['< 1 sn', 'ses → efekt'], ['240+', 'otomatik test'], ['3', 'dil otomatik']],
    visionHead: 'Vizyon 2027–2029: Sen anlat – sahne oluşsun.',
    vision: [['A', 'Anlatı Filmi', 'Kelimelerden canlı video · prototip'], ['B', 'Kelime-Resim', 'Resim + telaffuzla dil öğrenme · prototip'], ['C', 'Mekânlar', 'Sahne, sınıf, AR/VR, gözlük'], ['D', 'Studio', 'Öne çıkan anlar ve otomatik kurgu']],
    mktHead: 'Pazar', mkt: [['97–157 milyar USD', 'Canlı yayın 2026 [K 1, 2]'], ['~%50', 'Hediyelerin yayıncı gelirindeki payı [K 5, 6]'], ['10–20 / 1–3 milyon', 'TAM / SAM yayıncı (tahmin)'], ['5.000–15.000', '3. yıl ücretli (SOM, tahmin)'], ['1,54 milyar USD', 'Dil öğrenme uygulamaları [K 33]'], ['3,67 milyar USD', 'Yapay zekâ ile video 2026 [K 23]']],
    modelHead: 'İş modeli', model: ['Free · Pro aylık 9,99 € · paketler 2,99–4,99 €', 'Vizyon: Pro+ 14,99 € · Kelime-Resim Aile aylık 4,99 €', 'Lisanslar: okul yılda 300–800 € · kurs · etkinlik · yayınevi · ajans · B2B/SDK', 'Marjinal maliyet sıfıra yakın (yerel); sahneler video yapay zekâsından 240 ile 10.000 kattan fazla ucuz'],
    splitHead: '500.000 €’nun kullanımı (24 ay)', proposal: 'Öneri – lütfen onaylayın',
    split: [[50, 'Ekip', '250.000 €'], [20, 'Vizyon hatları', '100.000 €'], [15, 'Pazara giriş, pilotlar', '75.000 €'], [10, 'Hukuk, veri koruma', '50.000 €'], [5, 'Yedek', '25.000 €']],
    gatesHead: 'KPI kapıları (hedef değer, tahmin)',
    gates: [['1Y 2027', 'Pro canlı · 20 beta yayıncı · 4. hafta elde tutma ≥ %[Sayı]'], ['2Y 2027', '20.000 kayıtlı · ≈ 800 Pro · 1 platform pilotu'], ['1Y 2028', 'Free → Pro ≥ %4 · 3. ay elde tutma ≥ %[Sayı]'], ['2Y 2028', '80.000 kayıtlı · ≈ 3.200 Pro · B2B 50 bin €']],
    finHead: 'Senaryo ve pist', fin: ['Baz (İP §11): sonuç −114 / −62 / +329 bin € (1.–3. yıl); vizyonla başabaş 2. yılda', 'Sıfır gelirle pist ≈ 22 ay (İP’deki 250–350 bin € ile: ≈ 15–18 ay)', 'Temkinli senaryo 3 yılda −316 bin € – 500 bin € ile karşılanır'],
    team: 'Tuncay Sancak – Kurucu & Mucit, Genel Müdür · Gönül Demet – Yatırımcı İlişkileri & Fon Toplama · Koşullar [açık]',
    contact: 'Yatırımcı iletişimi: Gönül Demet · [E-posta]',
    disc: 'Kaynaklar: live-fx/business (BUSINESSPLAN, MARKTANALYSE, VISION, QUELLEN); [K n] = Kaynak n. Senaryolar ve tahminler, öngörü değildir. Yatırım, sermayenin tamamen kaybına yol açabilir.',
  },
  en: {
    lang: 'en', file: 'OnePager_EN.pdf',
    kicker: 'Confidential · Pre-Seed · October 2026',
    title: 'LiveFX – Live streams that listen',
    sub: 'The creator’s voice becomes a meme, a sound and an animated scene in under a second – and tomorrow, a picture for everything spoken.',
    askLabel: 'Pre-seed round', ask: '€500,000', askSub: 'for LiveFX and every LiveFX line · 24 months',
    three: [['Problem', 'Short videos get edited, live stays raw. Alerts react to viewers, soundboards to keys – no tool reacts to what the creator says.'], ['Solution', 'Voice → effect: DE/TR/EN auto-detected, dialect tolerance, story mode, viewer triggers, phone remote, offline, open API.'], ['Status', 'Version 2.0 works and is used in our own streams; no revenue yet. TR launch Q4 2026, Pro subscription Q1 2027.']],
    nums: [['238', 'triggers in 5 packs'], ['13 · 12', 'scenes · loops'], ['38', 'own sounds'], ['< 1 s', 'voice → effect'], ['240+', 'automated tests'], ['3', 'languages, auto']],
    visionHead: 'Vision 2027–2029: You talk. It becomes a scene.',
    vision: [['A', 'Story Film', 'Live video from words · prototype'], ['B', 'WordPicture', 'Language learning with picture + pronunciation · prototype'], ['C', 'Spaces', 'Stage, classroom, AR/VR, glasses'], ['D', 'Studio', 'Highlights and auto-edit of finished videos']],
    mktHead: 'Market', mkt: [['USD 97–157bn', 'live streaming 2026 [S 1, 2]'], ['~50%', 'gifts in streamer income [S 5, 6]'], ['10–20m / 1–3m', 'TAM / SAM creators (estimate)'], ['5,000–15,000', 'paying users Y3 (SOM, estimate)'], ['USD 1.54bn', 'language-learning apps [S 33]'], ['USD 3.67bn', 'AI video 2026 [S 23]']],
    modelHead: 'Business model', model: ['Free · Pro €9.99/month · packs €2.99–4.99', 'Vision: Pro+ €14.99 · WordPicture Family €4.99/month', 'Licences: school €300–800/year · course · events · publishers · agencies · B2B/SDK', 'Marginal cost close to zero (local); scenes 240 to 10,000+ times cheaper than video AI'],
    splitHead: 'Use of the €500,000 (24 months)', proposal: 'Proposal – please confirm',
    split: [[50, 'Team', '€250,000'], [20, 'Vision lines', '€100,000'], [15, 'GTM & pilots', '€75,000'], [10, 'Legal & privacy', '€50,000'], [5, 'Reserve', '€25,000']],
    gatesHead: 'KPI gates (targets, estimate)',
    gates: [['H1 2027', 'Pro live · 20 beta creators · week-4 retention ≥ [number]%'], ['H2 2027', '20,000 registered · ≈ 800 Pro · 1 platform pilot'], ['H1 2028', 'Free → Pro ≥ 4% · month-3 retention ≥ [number]%'], ['H2 2028', '80,000 registered · ≈ 3,200 Pro · B2B €50k']],
    finHead: 'Scenario & runway', fin: ['Base (BP §11): result −114 / −62 / +329 €k (Y1–Y3); with the vision, break-even in Y2', 'Runway at zero revenue ≈ 22 months (the BP’s €250–350k: ≈ 15–18)', 'Conservative −316 €k over 3 years – covered by €500k'],
    team: 'Tuncay Sancak – Founder & Inventor, Managing Director · Gönül Demet – Investor Relations & Fundraising · Terms [open]',
    contact: 'Investor contact: Gönül Demet · [email]',
    disc: 'Sources: live-fx/business (BUSINESSPLAN, MARKTANALYSE, VISION, QUELLEN); [S n] = Source n. Scenarios and estimates, not forecasts. An investment may result in total loss.',
  },
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const col = { pink: '#FF2D75', mint: '#2DFFB5', gold: '#FFD166', blue: '#6CC4FF', grey: '#5A6070' };
const pct = (lang, v) => (lang === 'tr' ? `%${v}` : lang === 'de' ? `${v} %` : `${v}%`);

function html(d) {
  const lc = [col.mint, col.gold, col.blue, col.pink], stills = ['8s', '15s', '22s', '29s'];
  const sc = [col.pink, col.mint, col.gold, col.blue, col.grey];
  return `<!doctype html><html lang="${d.lang}"><head><meta charset="utf-8"><style>
@font-face{font-family:'Lexend';src:url('${url(path.join(VID, 'assets/lexend-5.woff2'))}') format('woff2');font-weight:400 700;unicode-range:U+0100-02BA,U+02BD-02C5,U+1E00-1E9F,U+1EF2-1EFF}
@font-face{font-family:'Lexend';src:url('${url(path.join(VID, 'assets/lexend-3.woff2'))}') format('woff2');font-weight:400 700;unicode-range:U+0000-00FF,U+0131,U+2000-206F,U+20AC}
@page { size: A4; margin: 0; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: 210mm; height: 297mm; }
body { background: #0F1115; color: #FFFFFF; font-family: 'Lexend', Arial, sans-serif; font-size: 8pt; line-height: 1.38; padding: 10mm 11mm 8mm; display: flex; flex-direction: column; gap: 3mm; overflow: hidden; }
.top { display: flex; justify-content: space-between; align-items: flex-start; gap: 6mm; }
.kicker { font-size: 7pt; letter-spacing: .22em; text-transform: uppercase; color: #FF2D75; font-weight: 600; }
h1 { font-size: 23pt; line-height: 1.05; font-weight: 700; margin: 1.6mm 0 1.4mm; }
h1 span { color: #FF2D75; }
.sub { color: #A9B0BD; font-size: 9pt; max-width: 122mm; }
.askbox { background: #3A0F22; border: 1px solid #FF2D75; border-radius: 4mm; padding: 3mm 4.5mm; min-width: 50mm; }
.askbox small { display: block; font-size: 6.6pt; letter-spacing: .2em; text-transform: uppercase; color: #FF2D75; font-weight: 600; }
.ask { font-size: 24pt; font-weight: 700; line-height: 1.1; }
.askbox .s { color: #E6E8EE; font-size: 7pt; }
.wave { display: flex; align-items: center; gap: 1mm; height: 6mm; }
.wave i { display: block; width: 1.1mm; border-radius: 1mm; }
.three { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2.6mm; }
.box { background: #1A1D24; border: 1px solid #2A2E38; border-radius: 3mm; padding: 2.6mm 3.2mm; }
.box h3 { font-size: 6.8pt; letter-spacing: .18em; text-transform: uppercase; color: #FFD166; margin-bottom: 1.2mm; }
.box p { color: #D9DCE3; }
.nums { display: grid; grid-template-columns: repeat(6, 1fr); gap: 2mm; }
.num { background: #1A1D24; border-radius: 3mm; padding: 2mm 2.6mm; }
.num b { display: block; font-size: 15pt; line-height: 1.1; }
.num small { color: #A9B0BD; font-size: 6.8pt; }
.vh { font-size: 10.5pt; font-weight: 700; }
.vision { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2.6mm; }
.vcard { background: #1A1D24; border-radius: 3mm; overflow: hidden; }
.vcard img { width: 100%; aspect-ratio: 16/9; object-fit: cover; display: block; }
.vcard div { padding: 1.8mm 2.4mm 2.2mm; }
.vcard b { font-size: 8.6pt; }
.vcard .l { display: inline-block; width: 4.2mm; height: 4.2mm; border-radius: 50%; color: #0F1115; text-align: center; font-weight: 700; font-size: 6.6pt; line-height: 4.2mm; margin-right: 1.2mm; }
.vcard small { display: block; color: #A9B0BD; font-size: 6.8pt; }
.two { display: grid; grid-template-columns: 1fr 1fr; gap: 2.6mm; }
.mkt { display: grid; grid-template-columns: 1fr 1fr; gap: 1.4mm 3mm; }
.mkt b { display: block; font-size: 10pt; }
.mkt small { color: #A9B0BD; font-size: 6.6pt; }
ul { list-style: none; }
li { padding-left: 3.2mm; position: relative; margin-bottom: .7mm; color: #D9DCE3; }
li::before { content: ''; position: absolute; left: 0; top: 1.4mm; width: 1.4mm; height: 1.4mm; border-radius: 50%; background: #2DFFB5; }
.split .head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2mm; }
.split h3 { margin: 0; }
.prop { border: 1.2px solid #FF2D75; color: #FF2D75; border-radius: 9mm; padding: .4mm 2.6mm; font-size: 6.4pt; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
.bar { display: flex; height: 6.5mm; border-radius: 2mm; overflow: hidden; margin-bottom: 1.8mm; }
.bar div { display: flex; align-items: center; justify-content: center; color: #0F1115; font-weight: 700; font-size: 7.4pt; }
.legend { display: grid; grid-template-columns: repeat(5, 1fr); gap: 2mm; }
.legend b { display: block; font-size: 9pt; }
.legend small { color: #A9B0BD; font-size: 6.8pt; }
.gates div { display: grid; grid-template-columns: 15mm 1fr; gap: 1.6mm; margin-bottom: .9mm; color: #D9DCE3; }
.gates b { color: #FFFFFF; }
.foot { margin-top: auto; border-top: 1px solid #2A2E38; padding-top: 2.2mm; display: flex; flex-direction: column; gap: .8mm; }
.foot .contact { font-weight: 600; font-size: 8.6pt; }
.foot .disc { font-size: 6.4pt; color: #8A909C; font-style: italic; }
</style></head><body>
<div class="top"><div>
<div class="kicker">${esc(d.kicker)}</div>
<h1>${esc(d.title).replace('LiveFX', '<span>LiveFX</span>')}</h1>
<div class="sub">${esc(d.sub)}</div>
</div>
<div class="askbox"><small>${esc(d.askLabel)}</small><div class="ask">${esc(d.ask)}</div><div class="s">${esc(d.askSub)}</div></div></div>
<div class="wave">${Array.from({ length: 80 }, (_, i) => { const a = Math.abs(Math.sin(i * 0.55) * 0.75 + Math.sin(i * 1.7) * 0.25); return `<i style="height:${(1.2 + 4.8 * a).toFixed(1)}mm;background:${i < 40 ? col.pink : col.mint}"></i>`; }).join('')}</div>
<div class="three">${d.three.map(([h, t]) => `<div class="box"><h3>${esc(h)}</h3><p>${esc(t)}</p></div>`).join('')}</div>
<div class="nums">${d.nums.map(([n, l], i) => `<div class="num"><b style="color:${[col.pink, col.mint, col.gold, col.blue][i % 4]}">${esc(n)}</b><small>${esc(l)}</small></div>`).join('')}</div>
<div class="vh">${esc(d.visionHead)}</div>
<div class="vision">${d.vision.map(([L, n, t], i) => `<div class="vcard"><img src="${url(path.join(VID, `stills/vision-${d.lang}-16x9-${stills[i]}.jpg`))}"><div><span class="l" style="background:${lc[i]}">${L}</span><b>${esc(n)}</b><small>${esc(t)}</small></div></div>`).join('')}</div>
<div class="two">
<div class="box"><h3>${esc(d.mktHead)}</h3><div class="mkt">${d.mkt.map(([n, l]) => `<div><b>${esc(n)}</b><small>${esc(l)}</small></div>`).join('')}</div></div>
<div class="box"><h3>${esc(d.modelHead)}</h3><ul>${d.model.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></div>
</div>
<div class="box split"><div class="head"><h3>${esc(d.splitHead)}</h3><span class="prop">${esc(d.proposal)}</span></div>
<div class="bar">${d.split.map(([p], i) => `<div style="width:${p}%;background:${sc[i]}">${pct(d.lang, p)}</div>`).join('')}</div>
<div class="legend">${d.split.map(([, n, a], i) => `<div><b style="color:${sc[i] === col.grey ? '#A9B0BD' : sc[i]}">${esc(a)}</b><small>${esc(n)}</small></div>`).join('')}</div></div>
<div class="two">
<div class="box gates"><h3>${esc(d.gatesHead)}</h3>${d.gates.map(([w, t]) => `<div><b>${esc(w)}</b><span>${esc(t)}</span></div>`).join('')}</div>
<div class="box"><h3>${esc(d.finHead)}</h3><ul>${d.fin.map((s) => `<li>${esc(s)}</li>`).join('')}</ul></div>
</div>
<div class="foot"><div>${esc(d.team)}</div><div class="contact">${esc(d.contact)}</div><div class="disc">${esc(d.disc)}</div></div>
</body></html>`;
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
    const over = await page.evaluate(() => { const b = document.body; return b.scrollHeight - b.clientHeight; });
    await page.pdf({ path: path.join(__dirname, d.file), format: 'A4', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 }, pageRanges: '1' });
    console.log('wrote', d.file, over > 0 ? `OVERFLOW ${over}px` : 'fits');
    await page.close();
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
