export const meta = {
  name: 'ceviri-paket',
  description: 'Paket paket çeviri: çevirmen → mekanik kontrol → revizyon → karşıt okuyucu → düzeltme (kitap × dil)',
  phases: [{ title: 'Çeviri' }, { title: 'Revizyon' }, { title: 'Doğrulama' }, { title: 'Düzeltme' }],
}
const { book, lang, bids } = args
const LANG = lang.toUpperCase()
const L = lang === 'en' ? 'Englisch (britische Rechtschreibung; Anführungszeichen “ ” und ‘ ’)' : 'Deutsch (neue Rechtschreibung; Anführungszeichen „ “ und ‚ ‘)'
const I = '/home/user/Notion/iki-roman/interior'
const WORK = `${I}/i18n/work/${book}_${LANG}`
const TITLE = book === 'BY' ? (lang === 'en' ? 'THE TRAVELLER' : 'DER REISENDE') : (lang === 'en' ? 'THE WITNESS' : 'DER ZEUGE')
const src = bid => `${I}/i18n/${book}/batches/${bid}_src.json`
const ctx = bid => `${I}/i18n/${book}/ctx_${lang}/${bid}_ctx.json`
const out = bid => `${WORK}/${bid}.json`
const CHECK = bid => `cd ${I} && python3 tools/i18n_check.py --book ${book} --lang ${lang} --batch ${bid}`
const RULES = bid => `Grundlagen: Roman ${book === 'BY' ? 'YOLCU – 1453 Uyanışın Bedeli (Tuncay Sancak)' : 'ŞAHİT (Mustafa Sefa Güvenir)'}, Zielsprache ${L}, Zieltitel ${TITLE}.
Dateien: Quelle ${src(bid)} (paras: pid, style, text mit <b>/<i>, keep, constraint, fixed, label; prev_tail = letzte Absätze des vorigen Pakets als Kontext; units = Kapitel). Kontext ${ctx(bid)} (style_guide, labels, names, glossary, fixed = verbindliche Übersetzungen fester Sätze dieses Pakets, constraints = Absätze, die mit einem bestimmten Buchstaben beginnen MÜSSEN (Akrostichon), titles = verbindliche Überschriften, synopsis der umliegenden Kapitel, tricky = Entscheidungen zu Wortspielen/Code, cipher_note). Ergebnisdatei ${out(bid)} im Format {"paras": {"<pid>": "<Übersetzung mit <b>/<i>>", …}} – ein Eintrag für JEDEN Absatz mit keep=false (auch Überschriften, Akte, Einschübe, Opening-Absätze, den Titel); keep=true-Absätze (Leerabsätze, Bilder, Szenenwechsel, „14.53 ↺“, Autorname) NICHT aufnehmen.
Verbindliche Regeln: (1) Ein Zielabsatz je Quellabsatz – nie zusammenlegen, nie teilen, nichts auslassen, nichts hinzudichten; Reihenfolge der Sätze beibehalten, wenn die Zielsprache es erlaubt. (2) Überschriften exakt wie in titles; Sprecherlabels der Einschübe exakt wie in labels (Versalien + Doppelpunkt); feste Sätze exakt wie in fixed (wörtlich, Satzzeichen eingeschlossen); Namen wie in names. (3) Absätze mit constraint müssen mit dem angegebenen Buchstaben beginnen (erster Buchstabe nach Anführungszeichen/Gedankenstrich zählt) – umformulieren, bis es passt, ohne den Sinn zu verbiegen. (4) Auszeichnung <b>/<i> an den entsprechenden Wörtern erhalten; keine anderen Tags, kein Markdown. (5) Zahlen, Uhrzeiten (14.53), Daten, 1453 unverändert. (6) Dialogsatzzeichen der Zielsprache; Gedankenstriche nach Zielsprache. (7) Ton laut style_guide: literarisch, präzise, natürlich – so, dass es wie ein in der Zielsprache geschriebener Roman klingt; Aphorismen knapp und scharf; keine Erklärungen, keine Fußnoten, keine Übersetzernotizen im Text. (8) Türkische Realien gemäß style_guide/glossary. (9) Nach dem Schreiben der Datei IMMER die Prüfung ausführen: ${CHECK(bid)} – Fehler beheben, bis „ERGEBNIS: OK“; Warnungen lesen und beheben, wenn berechtigt (Längenverhältnis kann bei Dialogzeilen harmlos sein).`
const STAGE = { type: 'object', properties: { ok: { type: 'boolean' }, errors: { type: 'array', items: { type: 'string' } }, warnings: { type: 'array', items: { type: 'string' } }, notes: { type: 'string' } }, required: ['ok', 'errors', 'warnings', 'notes'] }
const ISSUES = { type: 'object', properties: { issues: { type: 'array', items: { type: 'object', properties: { pid: { type: 'integer' }, severity: { type: 'string', enum: ['high', 'medium', 'low'] }, problem: { type: 'string' }, fix: { type: 'string' } }, required: ['pid', 'severity', 'problem', 'fix'] } }, verdict: { type: 'string' } }, required: ['issues', 'verdict'] }

async function translate(bid) {
  let r = await agent(`${RULES(bid)}
Deine Rolle: literarische:r Übersetzer:in TR→${L} mit Muttersprachniveau in der Zielsprache. Lies Kontext und Quelle vollständig, übersetze das ganze Paket, schreibe ${out(bid)}, prüfe, behebe. Gib zurück: ok (Prüfung OK?), errors, warnings (verbleibende), notes (Entscheidungen, Zweifelsfälle für die Revision).`, { label: `${book} ${lang} ${bid} translate`, phase: 'Çeviri', schema: STAGE, effort: 'high' })
  for (let k = 0; r && !r.ok && k < 2; k++) {
    r = await agent(`${RULES(bid)}
Die Datei ${out(bid)} existiert, aber die Prüfung meldet Fehler: ${JSON.stringify(r.errors)}. Behebe genau diese Fehler (und nur sie), schreibe die Datei neu, prüfe erneut bis OK. Gib zurück: ok, errors, warnings, notes.`, { label: `${book} ${lang} ${bid} translate-fix${k + 1}`, phase: 'Çeviri', schema: STAGE, effort: 'high' })
  }
  return r
}
async function revise(bid, prev) {
  return agent(`${RULES(bid)}
Deine Rolle: zweisprachige:r Reviser:in (Senior-Lektorat). In ${out(bid)} liegt eine Rohübersetzung (Notizen des Übersetzers: ${JSON.stringify(prev && prev.notes)}). Vergleiche JEDEN Absatz mit der Quelle: Bedeutungstreue (Nuancen, Negationen, Tempus, Perspektive), Auslassungen/Zusätze, Terminologie laut glossary, Rhythmus und Natürlichkeit in der Zielsprache, Dialogsatzzeichen, Konsistenz innerhalb des Pakets und mit prev_tail. Verbessere direkt im Text (du darfst Sätze neu bauen, nicht aber Inhalt ändern), schreibe die Datei neu, prüfe bis OK. Gib zurück: ok, errors, warnings, notes (Anzahl und Art der Änderungen; offene Zweifel).`, { label: `${book} ${lang} ${bid} revise`, phase: 'Revizyon', schema: STAGE, effort: 'high' })
}
async function verify(bid) {
  return agent(`${RULES(bid)}
Deine Rolle: unbestechliche:r Prüfleser:in mit Muttersprache ${lang === 'en' ? 'Englisch' : 'Deutsch'} und sehr gutem Türkisch. Lies ${out(bid)} gegen ${src(bid)} und ${ctx(bid)}. Finde Fehler: Sinnabweichung, ausgelassene oder hinzugefügte Inhalte, falsche Figurenzuordnung, Tempus-/Perspektivbrüche, Glossar-/Label-/Titelverstöße, unnatürliche Lehnübersetzungen, falsche Anführungszeichen, Tippfehler, Grammatik. Je Fund: pid, severity (high = Sinn/Inhalt falsch; medium = deutlich unnatürlich oder Regelverstoß; low = Geschmack), problem, konkreter fix (Zielsatz). Keine Datei ändern. verdict: ein Satz zur Gesamtqualität.`, { label: `${book} ${lang} ${bid} verify`, phase: 'Doğrulama', schema: ISSUES, effort: 'high' })
}
async function fix(bid, issues) {
  return agent(`${RULES(bid)}
In ${out(bid)} liegt die revidierte Übersetzung. Ein:e Prüfleser:in hat Befunde: ${JSON.stringify(issues, null, 1)}. Setze alle high- und medium-Befunde um (low nach eigenem Urteil), ohne Neues einzuführen; schreibe die Datei neu, prüfe bis OK. Gib zurück: ok, errors, warnings, notes (was umgesetzt, was begründet abgelehnt).`, { label: `${book} ${lang} ${bid} fix`, phase: 'Düzeltme', schema: STAGE, effort: 'high' })
}

const results = await pipeline(bids,
  bid => translate(bid),
  (t, bid) => revise(bid, t).then(r => ({ t, r })),
  async ({ t, r }, bid) => {
    let v = await verify(bid)
    let rounds = 0, f = null
    while (v && v.issues.some(i => i.severity !== 'low') && rounds < 2) {
      f = await fix(bid, v.issues.filter(i => i.severity !== 'low'))
      rounds++
      v = await verify(bid)
    }
    const high = v ? v.issues.filter(i => i.severity === 'high').length : -1
    const medium = v ? v.issues.filter(i => i.severity === 'medium').length : -1
    log(`${book} ${lang} ${bid}: fertig – offene Befunde high ${high}, medium ${medium}, Fix-Runden ${rounds}`)
    return { bid, ok: !!(f ? f.ok : r && r.ok), high, medium, rounds, verdict: v && v.verdict, notes: r && r.notes }
  }
)
const done = results.filter(Boolean)
return { book, lang, batches: done, failed: bids.filter((b, i) => !results[i]) }
