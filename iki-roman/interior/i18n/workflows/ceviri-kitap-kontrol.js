export const meta = {
  name: 'ceviri-kitap-kontrol',
  description: 'Çevirinin bütün kitap kontrolü: süreklilik okuyucuları, terim taraması, son okuma, düzeltme, jüri',
  phases: [{ title: 'Okuma' }, { title: 'Düzeltme' }, { title: 'Jüri' }],
}
const { book, lang, chunks } = args
const LANG = lang.toUpperCase()
const I = '/home/user/Notion/iki-roman/interior'
const WORK = `${I}/i18n/work/${book}_${LANG}`
const RD = `${WORK}/reading`
const BIBLE = `${I}/i18n/${book}_${LANG}_bible.json`
const NAT = lang === 'en' ? 'Englisch' : 'Deutsch'
const TITLE = book === 'BY' ? (lang === 'en' ? 'THE TRAVELLER' : 'DER REISENDE') : (lang === 'en' ? 'THE WITNESS' : 'DER ZEUGE')
const ISSUES = { type: 'object', properties: { issues: { type: 'array', items: { type: 'object', properties: { pid: { type: 'integer' }, severity: { type: 'string', enum: ['high', 'medium', 'low'] }, kind: { type: 'string' }, problem: { type: 'string' }, fix: { type: 'string' } }, required: ['pid', 'severity', 'kind', 'problem', 'fix'] } }, summary: { type: 'string' } }, required: ['issues', 'summary'] }
const COMMON = `Buch: ${TITLE} (${book === 'BY' ? 'YOLCU, Tuncay Sancak' : 'ŞAHİT, Mustafa Sefa Güvenir'}), Übersetzung ins ${NAT}. Lesefassung: ${RD}/chunk_<n>.txt (Zeilen „[pid] Text“; # = Kapitel, === = Akt, „    | “ = Einschub/innere Stimme), Übersicht ${RD}/index.json, ganzes Buch ${RD}/full.txt. Verbindliche Vorgaben: ${BIBLE} (style_guide, glossary, names, labels, fixed, chapter_titles, ciphers). Türkische Quelle bei Bedarf: ${I}/i18n/${book}_TR_full.txt (gleiche [pid]-Nummern).
Befunde IMMER mit pid und konkretem Ersatztext (fix = vollständiger neuer Satz oder Absatzteil), severity: high = Sinnfehler/Widerspruch/Auslassung; medium = Regel-/Konsistenzverstoß oder deutlich unnatürlich; low = Geschmack. Keine Dateien ändern.`
phase('Okuma')
const readers = await parallel([
  ...chunks.map(k => () => agent(`${COMMON}
Rolle: Kontinuitätsleser:in. Lies ${RD}/chunk_${k}.txt vollständig (und zur Orientierung index.json). Prüfe: Figuren- und Ortsnamen, Anreden, Terminologie gegen glossary; Tempus und Erzählperspektive; Wiederholungen fester Sätze (fixed) wörtlich gleich; Kapitelüberschriften wie chapter_titles; Einschub-Labels; Logik innerhalb des Abschnitts (wer spricht, Zeitangaben, 14.53); unübersetzte oder halb türkische Reste; Stellen, die wie Übersetzerdeutsch/-englisch klingen. Vergleiche Zweifelsfälle mit der türkischen Quelle.`, { label: `${book} ${lang} chunk ${k}`, phase: 'Okuma', schema: ISSUES, effort: 'high' })),
  () => agent(`${COMMON}
Rolle: Terminologie- und Konsistenzprüfer:in für das GANZE Buch. Arbeite mit grep auf ${RD}/full.txt: Für jeden glossary-Eintrag, jeden Namen und jedes Label prüfe, ob im ganzen Text EINE Form benutzt wird (z. B. nicht „the Silent Voice“ und „Silent Voice“ und „the quiet voice“ gemischt; nicht „Hakan Hoca“ und „Dr Hakan“ gemischt, außer die Bibel sieht es vor). Prüfe die festen Sätze (fixed): jede Fundstelle wörtlich gleich? Prüfe Anführungszeichen-System (${lang === 'en' ? '“ ” / ‘ ’' : '„ “ / ‚ ‘'}) und Gedankenstriche buchweit. Melde jede Abweichung mit pid.`, { label: `${book} ${lang} terms`, phase: 'Okuma', schema: ISSUES, effort: 'high' }),
  ...chunks.map(k => () => agent(`${COMMON}
Rolle: Korrektor:in mit Muttersprache ${NAT} (Verlagsniveau). Lies ${RD}/chunk_${k}.txt Wort für Wort: Rechtschreibung, Grammatik, Zeichensetzung, Kongruenz, Idiomatik, Wortwiederholungen in Nachbarsätzen, holprige Satzrhythmen, falsche Kollokationen, Anglizismen/Germanismen, Konsistenz von Zahlen- und Datumsschreibung. Melde nur, was du mit einem konkreten Ersatztext beheben würdest.`, { label: `${book} ${lang} proof ${k}`, phase: 'Okuma', schema: ISSUES, effort: 'high' })),
])
const all = readers.filter(Boolean).flatMap(r => r.issues)
const act = all.filter(i => i.severity !== 'low')
log(`${book} ${lang}: ${all.length} Befunde, davon ${act.length} high/medium`)
phase('Düzeltme')
const APPLY = { type: 'object', properties: { ok: { type: 'boolean' }, applied: { type: 'integer' }, rejected: { type: 'array', items: { type: 'string' } }, notes: { type: 'string' } }, required: ['ok', 'applied', 'rejected', 'notes'] }
const fixResult = act.length ? await agent(`${COMMON}
Rolle: Schlussredaktion. Befunde (high/medium) aus Kontinuitäts-, Terminologie- und Korrekturlesung: ${JSON.stringify(act, null, 1)}
Die Übersetzung liegt paketweise in ${WORK}/B*.json ({"paras": {"<pid>": "<Text mit <b>/<i>>"}}); welches Paket eine pid enthält, steht in ${RD}/batch_of_pid.json. Setze jeden berechtigten Befund in der jeweiligen Paketdatei um (Absatz vollständig neu schreiben, Auszeichnung erhalten; widersprüchliche Befunde entscheiden; Befunde, die der Bibel widersprechen oder falsch sind, ablehnen). Danach für JEDES geänderte Paket die Prüfung ausführen: cd ${I} && python3 tools/i18n_check.py --book ${book} --lang ${lang} --batch <bid> (muss OK sein), zum Schluss --merge (muss OK sein). Gib zurück: ok, applied (Anzahl), rejected (pid + Grund), notes.`, { label: `${book} ${lang} apply`, phase: 'Düzeltme', schema: APPLY, effort: 'high' }) : { ok: true, applied: 0, rejected: [], notes: 'keine Befunde' }
phase('Jüri')
const JURY = { type: 'object', properties: { score_language: { type: 'number' }, score_fidelity: { type: 'number' }, score_novel: { type: 'number' }, overall: { type: 'number' }, verdict: { type: 'string' }, issues: { type: 'array', items: { type: 'object', properties: { pid: { type: 'integer' }, severity: { type: 'string', enum: ['high', 'medium', 'low'] }, problem: { type: 'string' }, fix: { type: 'string' } }, required: ['pid', 'severity', 'problem', 'fix'] } } }, required: ['score_language', 'score_fidelity', 'score_novel', 'overall', 'verdict', 'issues'] }
const jury = await parallel(['Lektor:in eines großen Publikumsverlags, Muttersprache ' + NAT, 'Literaturübersetzer:in TR→' + NAT + ' (prüft Treue und Ton)'].map((role, i) => () => agent(`${COMMON}
Rolle: ${role}. Lies das GANZE Buch ${RD}/full.txt (nach der Schlussredaktion; die Paketdateien sind aktueller als full.txt – wenn ${WORK}/final.json neuer ist, nimm dessen Texte). Bewerte 1–10: score_language (liest es sich wie ein Original?), score_fidelity (Stichproben gegen die türkische Quelle, mindestens 15 Absätze aus Anfang, Mitte, Ende), score_novel (Spannung/Wirkung in der Zielsprache), overall. Nenne die verbleibenden Probleme mit pid und Ersatztext.`, { label: `${book} ${lang} jury ${i + 1}`, phase: 'Jüri', schema: JURY, effort: 'high' })))
const js = jury.filter(Boolean)
return { book, lang, findings: all.length, acted: act.length, applied: fixResult && fixResult.applied, rejected: fixResult && fixResult.rejected, jury: js.map(j => ({ overall: j.overall, language: j.score_language, fidelity: j.score_fidelity, novel: j.score_novel, verdict: j.verdict, open: j.issues.filter(x => x.severity !== 'low').length })), jury_issues: js.flatMap(j => j.issues.filter(x => x.severity !== 'low')) }
