# Proofreading brief (Türkçe son okuma / düzelti)

Two Turkish companion novels are going to print: **YOLCU** (Tuncay Sancak, key BY) and **ŞAHİT** (Mustafa Sefa Güvenir, key SA). They have already been edited and tightened. An independent jury read them and found remaining **real errors**: spelling against TDK, grammar, broken or inverted sentences, missing words, wrong suffixes, inconsistent spellings, a few factual slips. You are the final proofreader (son okuma editörü). Your job is to find and fix **every** such error in your range — the jury lists are examples, not the complete list.

Folder: `/tmp/claude-0/-home-user-Notion/6549e111-23e7-5e00-8587-d424b5294a16/scratchpad/korrektur/`
- `<KEY>_full.txt`: the manuscript, one paragraph per line, `[pid] text`; `[pid|L]` = locked (do not touch); `<Style>`; `{FORMATLI: …}` lists italic/bold segments of mixed-format paragraphs.
- `<KEY>_base.docx`, `<KEY>_locked.json`.
- Jury reports with error lists: `jury_YOLCU_lektor.md`, `jury_YOLCU_okur.md`, `jury_SAHIT_lektor.md`, `jury_SAHIT_okur.md`. Read the "errors" sections first and fix those that fall in your range (verify each one in the text; jurors can be wrong).

## Fix
- Spelling (TDK Yazım Kılavuzu): e.g. „aile evradımdan“ → „efradımdan“, „şeddeliydi“ → „şiddetliydi“, „olağanca“ → „olanca“, „traşlı“ → „tıraşlı“, „hiçte“ → „hiç de“, „ikimizde“ (= ikimiz de) → „ikimiz de“, „konumuzda tam“ → „konumuz da“ where meant, „kimsede“ → „kimse de“, „Fikirtepe’ de“ → „Fikirtepe’de“, „Hodri ’ye“ → „Hodri’ye“, „yavana atılır“ → „yabana atılır“, „akıl baliğ“ → „âkil bâliğ“, „Dİhkan“ → „Dihkan“, „taktim“ → „takdir“, „itaattan“ → „itaatten“, de/da and ki separation, -mi question particle separation, apostrophes with proper names (no space), capitalization („Kasım ayının“, „pazar yerinde“ unless a proper name).
- Grammar: wrong case/possessive suffixes („isimlerin hepsi“ → „isimlerinin hepsi“, „Balakt'ı“ → „Balakt'tı“), broken sentences, subject–verb agreement, a missing word that makes a sentence ungrammatical (add the minimal word).
- **Inverted meaning** (sentence says the opposite of what context requires): e.g. „henüz emin olmuştur“ where he is not yet sure → „henüz emin olamamıştır“; „kuklam bu olmadı“ → „kuklam bu olmalı“ — verify by context.
- Clear factual slips of numbers/units: „150 milyon metre kare“ (Earth's land surface) → „150 milyon kilometre kare“.
- Consistency of spelling within a book: hâlâ (not „hala“ when it means „still“; „hala“ = aunt), hikâye, kâğıt, âşık, Âdem (pick the dominant form in that book and unify), „Hz.“ with dot, „arttır-“ → „artır-“ (TDK) where it means increase.
- Punctuation errors that remain (missing closing quotes, „?,“ combinations, stray spaces before punctuation, „’ Diye“ → „’ diye“).

## Do not
- Do not change style, word choice, dialect, oral tone, religious vocabulary or the author's deliberate wordplay („FİT NE?“, „Sefarizmalar“, puns, archaic words like „müşteri“ in the sense of „talip“). Do not „improve“ correct sentences. Do not cut or add content (except a single missing word).
- Do not touch `[L]` paragraphs. Do not change names of people/places, dates, times or numbers (except the clear unit slip above).
- In SA, speeches that continue over several paragraphs open each paragraph without closing the previous one — this is the author's convention, not an error.

## Output
JSON list in the output file named in your task; each op on the base docx (pid as in `<KEY>_full.txt`):
```
{"op":"replace","pid":123,"old":"<exact substring, as short as possible but unique in the paragraph>","new":"<corrected>","tur":"yazım|dilbilgisi|anlam|noktalama|tutarlılık|olgu","not":"<short Turkish note>"}
```
Use short `old` strings (a word or a few words) to avoid overlaps; several ops per paragraph are fine if they do not overlap. In FORMATLI paragraphs the `old` must not straddle a formatting border.
Validate: `cd /home/user/Notion/iki-roman/interior && python3 tools/docx_ops.py <BASE_DOCX> <YOUR_JSON> /tmp/<KEY>_<PART>_kor.docx --locked <LOCKED_JSON>` (all ops must apply) and `python3 tools/check_text.py --by|--sa /tmp/<KEY>_<PART>_kor.docx` → OK.

Final answer (short): number of fixes by type, the ones that change meaning (inverted sentences, missing words, facts) listed individually, and jury items you rejected as not being errors (with reason).
