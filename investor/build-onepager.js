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
    askLabel: 'Pre-Seed-Runde', ask: '250.000 €', askSub: 'für 18 Monate · Runway 18 Monate',
    three: [['Problem', 'Kurzvideos werden geschnitten, Live bleibt roh. Alerts reagieren auf Zuschauer, Soundboards auf Tasten – kein Tool auf das, was der Creator sagt.'], ['Lösung', 'Sprache → Effekt: DE/TR/EN automatisch erkannt, Dialekt-Toleranz, Story-Modus, 143 freie Sticker, sichere GIF-Suche (KLIPY/GIPHY, Jugendschutz-Filter), Handy-Fernbedienung, offline.'], ['Status', 'Version 2.1 funktionsfähig, im Einsatz in eigenen Streams; Leistungsmodus senkt die Bildzeit um 63–69 %. Noch keine Umsätze. TR-Launch Q4 2026, Pro-Abo ab Monat 3.']],
    nums: [['238', 'Trigger in 5 Paketen'], ['143', 'freie Sticker (MIT)'], ['−63–69 %', 'Bildzeit, v2.1'], ['< 1 s', 'Stimme → Effekt'], ['575+', 'automat. Tests'], ['3', 'Sprachen auto']],
    visionHead: 'Vision: Du redest. Es wird Bild. Pre-Seed finanziert WortBild.',
    vision: [['A', 'Erzählfilm', 'Live-Video aus Worten · Seed-Runde'], ['B', 'WortBild', 'Sprachenlernen · Pre-Seed, M4–15'], ['C', 'Räume', 'Bühne, Klassenzimmer, AR/VR · Seed-Runde'], ['D', 'Studio', 'Highlights, Auto-Edit · Seed-Runde']],
    mktHead: 'Markt', mkt: [['97–157 Mrd. USD', 'Live-Streaming 2026 [Q 1, 2]'], ['~50 %', 'Geschenke am Streamer-Einkommen [Q 5, 6]'], ['10–20 Mio. / 1–3 Mio.', 'TAM / SAM Creator (Schätzung)'], ['5.000–15.000', 'Zahlende J3 (SOM, Schätzung)'], ['1,54 Mrd. USD', 'Sprachlern-Apps [Q 33]'], ['3,67 Mrd. USD', 'KI-Video 2026 [Q 23]']],
    modelHead: 'Geschäftsmodell', model: ['Free · Pro 9,99 €/Monat · Packs 2,99–4,99 €', 'Vision: Pro+ 14,99 € · WortBild Familie 4,99 €/Monat', 'Lizenzen: Schule 300–800 €/Jahr · Kurs · Event · Verlag · Agentur · B2B/SDK', 'Grenzkosten nahe null (lokal); Szenen 240- bis > 10.000-mal günstiger als Video-KI'],
    splitHead: 'Mittelverwendung 250.000 € (18 Monate)', proposal: 'Vorschlag – mit Steuer-/Rechtsberater prüfen',
    split: [[50, 'Team/Produkt', '125.000 €'], [20, 'Markteintritt', '50.000 €'], [15, 'WortBild', '37.500 €'], [10, 'Recht & Datenschutz', '25.000 €'], [5, 'Reserve', '12.500 €']],
    gatesHead: 'Gates, 18 Monate (Ziel; Schwelle)',
    gates: [['Monat 3', 'G0: Pro live · Entwickler:in an Bord'], ['Monat 6', 'G1: 10.000 Registrierte (4.000) · 400 Pro (120)'], ['Monat 12', 'G2a: 20.000 (8.000) · 800 Pro · MRR 8.073 €'], ['Monat 18', 'G2: 50.000 (19.000) · 2.000 Pro · MRR 22.586 € → Seed']],
    finHead: 'Runway, Finanzen, Bewertung', fin: ['Runway 18 Monate ohne Umsatz; Basis: Kasse ≥ 125 T€, Break-even M22', 'Basis 5 Jahre: Umsatz 51 T€ → 3,15 Mio. € (J5); EBITDA positiv ab J2', 'Angebot: 2,25 Mio. € Pre · 2,5 Mio. € Post · 10 % – unter allen 4 Referenzmethoden; oder SAFE: Cap 2,25 Mio. €, 20 % Discount', 'Folgerunde: Seed ≈ 350 T€ bis Monat 18 (Story-Engine, Studio, VR)'],
    team: 'Tuncay Sancak – Gründer & Erfinder, Geschäftsführer · Gönül Demet – Investor Relations & Fundraising',
    contact: 'Investor-Kontakt: Gönül Demet · [E-Mail]',
    disc: 'Quellen: live-fx/business (BUSINESSPLAN, MARKTANALYSE, VISION, QUELLEN, LiveFX_Finanzmodell.xlsx), live-fx/CHANGELOG.md; [Q n] = Quelle n. Szenarien und Schätzungen, keine Prognosen. Bewertung und Konditionen: Verhandlungsrahmen – mit Steuer-/Rechtsberater prüfen. Eine Investition kann zum Totalverlust führen.',
  },
  tr: {
    lang: 'tr', file: 'OnePager_TR.pdf',
    kicker: 'Gizli · Pre-Seed · Ekim 2026',
    title: 'LiveFX – Dinleyen canlı yayınlar',
    sub: 'Yayıncının sesi bir saniyeden kısa sürede meme’e, sese ve animasyonlu sahneye dönüşür – yarın da konuşulan her şeyin görüntüsüne.',
    askLabel: 'Pre-seed turu', ask: '250.000 €', askSub: '18 ay için · 18 ay nakit ömrü',
    three: [['Sorun', 'Kısa videolar kurgulanır, canlı yayın ham kalır. Uyarılar izleyiciye, ses panoları tuşlara tepki verir – hiçbir araç yayıncının söylediğine tepki vermez.'], ['Çözüm', 'Konuşma → efekt: DE/TR/EN otomatik tanıma, şive toleransı, hikâye modu, 143 ücretsiz çıkartma, güvenli GIF araması (KLIPY/GIPHY, çocuk koruma filtresi), telefondan kumanda, çevrimdışı.'], ['Durum', 'Sürüm 2.1 çalışıyor, kendi yayınlarda kullanımda; performans modu kare süresini %63–69 kısaltır. Henüz gelir yok. TR lansmanı 4Ç 2026, Pro abonelik 3. aydan.']],
    nums: [['238', 'tetikleyici, 5 paket'], ['143', 'ücretsiz çıkartma (MIT)'], ['%63–69', 'daha kısa kare süresi'], ['< 1 sn', 'ses → efekt'], ['575+', 'otomatik test'], ['3', 'dil otomatik']],
    visionHead: 'Vizyon: Sen anlat – sahne oluşsun. Pre-seed: Kelime-Resim.',
    vision: [['A', 'Anlatı Filmi', 'Kelimelerden canlı video · seed turu'], ['B', 'Kelime-Resim', 'Dil öğrenme · pre-seed, 4–15. ay'], ['C', 'Mekânlar', 'Sahne, sınıf, AR/VR · seed turu'], ['D', 'Studio', 'Otomatik kurgu · seed turu']],
    mktHead: 'Pazar', mkt: [['97–157 milyar USD', 'Canlı yayın 2026 [K 1, 2]'], ['~%50', 'Hediyelerin gelir payı [K 5, 6]'], ['10–20 / 1–3 milyon', 'TAM / SAM yayıncı (tahmin)'], ['5.000–15.000', '3. yıl ücretli (SOM, tahmin)'], ['1,54 milyar USD', 'Dil öğrenme uygul. [K 33]'], ['3,67 milyar USD', 'YZ ile video 2026 [K 23]']],
    modelHead: 'İş modeli', model: ['Free · Pro aylık 9,99 € · paketler 2,99–4,99 €', 'Vizyon: Pro+ 14,99 € · Kelime-Resim Aile aylık 4,99 €', 'Lisanslar: okul yılda 300–800 € · kurs · etkinlik · yayınevi · ajans · B2B/SDK', 'Marjinal maliyet sıfıra yakın (yerel); sahneler video yapay zekâsından 240–10.000+ kat ucuz'],
    splitHead: '250.000 €’nun kullanımı (18 ay)', proposal: 'Öneri – vergi/hukuk danışmanıyla kontrol edin',
    split: [[50, 'Ekip/ürün', '125.000 €'], [20, 'Pazara giriş', '50.000 €'], [15, 'Kelime-Resim', '37.500 €'], [10, 'Hukuk, veri koruma', '25.000 €'], [5, 'Yedek', '12.500 €']],
    gatesHead: 'Kapılar, 18 ay (hedef; eşik)',
    gates: [['3. ay', 'G0: Pro canlı · geliştirici ekipte'], ['6. ay', 'G1: 10.000 kayıtlı (4.000) · 400 Pro (120)'], ['12. ay', 'G2a: 20.000 (8.000) · 800 Pro · MRR 8.073 €'], ['18. ay', 'G2: 50.000 (19.000) · 2.000 Pro · MRR 22.586 € → seed']],
    finHead: 'Nakit ömrü, finansallar, değerleme', fin: ['Gelirsiz 18 ay nakit ömrü; baz: nakit ≥ 125 bin €, başabaş 22. ay', '5 yıllık baz: gelir 51 bin € → 3,15 milyon € (5. yıl); FAVÖK 2. yıldan pozitif', 'Teklif: 2,25 milyon € öncesi · 2,5 milyon € sonrası · %10 – 4 referans yöntemin altında; SAFE: tavan 2,25 milyon €, %20 iskonto', 'Sonraki tur: 18. aya kadar ≈ 350 bin € seed (hikâye motoru, Studio, VR)'],
    team: 'Tuncay Sancak – Kurucu & Mucit, Genel Müdür · Gönül Demet – Yatırımcı İlişkileri & Fon Toplama',
    contact: 'Yatırımcı iletişimi: Gönül Demet · [E-posta]',
    disc: 'Kaynaklar: live-fx/business (BUSINESSPLAN, MARKTANALYSE, VISION, QUELLEN, LiveFX_Finanzmodell.xlsx), live-fx/CHANGELOG.md; [K n] = Kaynak n. Senaryolar ve tahminler, öngörü değildir. Değerleme ve koşullar: pazarlık aralığı – vergi/hukuk danışmanıyla kontrol edin. Yatırım, sermayenin tamamen kaybına yol açabilir.',
  },
  en: {
    lang: 'en', file: 'OnePager_EN.pdf',
    kicker: 'Confidential · Pre-Seed · October 2026',
    title: 'LiveFX – Live streams that listen',
    sub: 'The creator’s voice becomes a meme, a sound and an animated scene in under a second – and tomorrow, a picture for everything spoken.',
    askLabel: 'Pre-seed round', ask: '€250,000', askSub: 'for 18 months · runway 18 months',
    three: [['Problem', 'Short videos get edited, live stays raw. Alerts react to viewers, soundboards to keys – no tool reacts to what the creator says.'], ['Solution', 'Voice → effect: DE/TR/EN auto-detected, dialect tolerance, story mode, 143 free stickers, safe GIF search (KLIPY/GIPHY, child-safety filter), phone remote, offline.'], ['Status', 'Version 2.1 works and is used in our own streams; performance mode cuts frame time by 63–69%. No revenue yet. TR launch Q4 2026, Pro subscription month 3.']],
    nums: [['238', 'triggers in 5 packs'], ['143', 'free stickers (MIT)'], ['−63–69%', 'frame time, v2.1'], ['< 1 s', 'voice → effect'], ['575+', 'automated tests'], ['3', 'languages, auto']],
    visionHead: 'Vision: You talk. It becomes a scene. Pre-seed funds WordPicture.',
    vision: [['A', 'Story Film', 'Live video from words · seed round'], ['B', 'WordPicture', 'Language learning · pre-seed, M4–15'], ['C', 'Spaces', 'Stage, classroom, AR/VR · seed round'], ['D', 'Studio', 'Highlights, auto-edit · seed round']],
    mktHead: 'Market', mkt: [['USD 97–157bn', 'live streaming 2026 [S 1, 2]'], ['~50%', 'gifts in streamer income [S 5, 6]'], ['10–20m / 1–3m', 'TAM / SAM creators (estimate)'], ['5,000–15,000', 'paying users Y3 (SOM, estimate)'], ['USD 1.54bn', 'language-learning apps [S 33]'], ['USD 3.67bn', 'AI video 2026 [S 23]']],
    modelHead: 'Business model', model: ['Free · Pro €9.99/month · packs €2.99–4.99', 'Vision: Pro+ €14.99 · WordPicture Family €4.99/month', 'Licences: school €300–800/year · course · events · publishers · agencies · B2B/SDK', 'Marginal cost close to zero (local); scenes 240 to 10,000+ times cheaper than video AI'],
    splitHead: 'Use of the €250,000 (18 months)', proposal: 'Proposal – review with tax/legal advisor',
    split: [[50, 'Team/product', '€125,000'], [20, 'Go-to-market', '€50,000'], [15, 'WordPicture', '€37,500'], [10, 'Legal & privacy', '€25,000'], [5, 'Reserve', '€12,500']],
    gatesHead: 'Gates, 18 months (targets; threshold)',
    gates: [['Month 3', 'G0: Pro live · developer on board'], ['Month 6', 'G1: 10,000 registered (4,000) · 400 Pro (120)'], ['Month 12', 'G2a: 20,000 (8,000) · 800 Pro · MRR €8,073'], ['Month 18', 'G2: 50,000 (19,000) · 2,000 Pro · MRR €22,586 → seed']],
    finHead: 'Runway, financials, valuation', fin: ['Runway 18 months even without revenue; base case: cash ≥ €125k, break-even month 22', '5-year base: revenue €51k (Y1) → €3.15M (Y5); EBITDA positive from Y2', 'Founder offer: €2.25M pre · €2.5M post · 10% for investors – below all four reference methods (€2.35–3.0M); or SAFE: cap €2.25M, 20% discount', 'Follow-on: seed ≈ €350k by month 18; story engine, Studio, VR from the seed'],
    team: 'Tuncay Sancak – Founder & Inventor, Managing Director · Gönül Demet – Investor Relations & Fundraising',
    contact: 'Investor contact: Gönül Demet · [email]',
    disc: 'Sources: live-fx/business (BUSINESSPLAN, MARKTANALYSE, VISION, QUELLEN, LiveFX_Finanzmodell.xlsx), live-fx/CHANGELOG.md; [S n] = Source n. Scenarios and estimates, not forecasts. Valuation and terms: negotiation range – review with tax/legal advisor. An investment may result in total loss.',
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
body { background: #0F1115; color: #FFFFFF; font-family: 'Lexend', Arial, sans-serif; font-size: 8pt; line-height: 1.38; padding: 8.5mm 11mm 7mm; display: flex; flex-direction: column; gap: 2.4mm; overflow: hidden; }
.top { display: flex; justify-content: space-between; align-items: flex-start; gap: 6mm; }
.kicker { font-size: 7pt; letter-spacing: .22em; text-transform: uppercase; color: #FF2D75; font-weight: 600; }
h1 { font-size: 23pt; line-height: 1.05; font-weight: 700; margin: 1.6mm 0 1.4mm; }
h1 span { color: #FF2D75; }
.sub { color: #A9B0BD; font-size: 9pt; max-width: 122mm; }
.askbox { background: #3A0F22; border: 1px solid #FF2D75; border-radius: 4mm; padding: 3mm 4.5mm; min-width: 50mm; }
.askbox small { display: block; font-size: 6.6pt; letter-spacing: .2em; text-transform: uppercase; color: #FF2D75; font-weight: 600; }
.ask { font-size: 24pt; font-weight: 700; line-height: 1.1; white-space: nowrap; }
.askbox .s { color: #E6E8EE; font-size: 7pt; }
.wave { display: flex; align-items: center; gap: 1mm; height: 6mm; }
.wave i { display: block; width: 1.1mm; border-radius: 1mm; }
.three { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2.6mm; }
.box { background: #1A1D24; border: 1px solid #2A2E38; border-radius: 3mm; padding: 2.6mm 3.2mm; }
.box h3 { font-size: 6.8pt; letter-spacing: .18em; text-transform: uppercase; color: #FFD166; margin-bottom: 1.2mm; }
.box p { color: #D9DCE3; }
.nums { display: grid; grid-template-columns: repeat(6, 1fr); gap: 2mm; }
.num { background: #1A1D24; border-radius: 3mm; padding: 2mm 2.6mm; }
.num b { display: block; font-size: 14pt; line-height: 1.1; white-space: nowrap; }
.num small { color: #A9B0BD; font-size: 6.8pt; }
.vh { font-size: 10.5pt; font-weight: 700; }
.vision { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2.6mm; }
.vcard { background: #1A1D24; border-radius: 3mm; overflow: hidden; }
.vcard img { width: 100%; aspect-ratio: 2/1; object-fit: cover; display: block; }
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
