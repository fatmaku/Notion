# Review brief: checking the tightening of two Turkish novels

Two companion novels, **YOLCU** (BY) and **ŞAHİT** (SA), were just tightened by about 9 % by several editors working in parallel, each on a block of chapters. The rule was: **no plot change**, only removal of redundancy (repeated thoughts, stacked aphorisms, sermon repeats, recaps, verbal tics), with minimal seam repairs. Because each editor saw only their own block, two things can have gone wrong, and that is what you check:

1. **Seams:** after a cut, does the text still read naturally in Turkish? Look for: a pronoun or demonstrative ("bu", "o", "bunu", "onlar", "aynı", "bu yüzden", "Sonra", "Ama", "Çünkü", "Yine", "de/da" meaning "too") that now points to something deleted; a reply that answers a deleted question; a dialogue line whose speaker is no longer clear; broken punctuation or quotation marks (opening “ without closing ” in a paragraph that is not a deliberate multi-paragraph quote; doubled spaces; lowercase sentence start); a paragraph that now begins mid-thought; a chapter that now starts or ends abruptly; numbering words ("üçüncü", "ikinci", "son") that no longer match.
2. **Lost references:** something deleted (a detail, name, object, phrase, image, question) that is referred to or echoed **anywhere else in the new text** (also in other blocks, earlier or later). For every deleted sentence that contains a concrete detail, grep the new full text for its key words. If a later passage now refers to something the reader never saw, that is an error.
3. **Continuity:** contradictions introduced by the cuts (who is present, time of day, sequence of events, what a character knows).

Do **not** re-litigate taste: if a cut is clean and nothing refers to it, it stays. Do not propose new cuts. Do not rewrite style.

## Files (folder `/tmp/claude-0/-home-user-Notion/6549e111-23e7-5e00-8587-d424b5294a16/scratchpad/review/`)
- `<KEY>_neu.txt`: the new full text, one paragraph per line, `[pid] text` (pid = index in the NEW docx; `<Style>` for non-Normal styles such as Heading 1, Opening, Book Inset).
- `<KEY>_hunks.txt`: every change as a hunk: `- alt[...]` old paragraphs, `+ neu[...]` new paragraphs, with the nearest unchanged paragraph before and after ("KONTEXT").
- New docx: `/home/user/Notion/iki-roman/interior/src/YOLCU_TR_v5.docx` (BY) / `/home/user/Notion/iki-roman/interior/src/SAHIT_TR_v6.docx` (SA).
- The other book's new text is also there (`BY_neu.txt` / `SA_neu.txt`); the books share scenes and sentences, so also grep the other book when a deleted detail looks like a cross-book echo.

Known and intended: ŞAHİT got a new chapter heading "SOLUCAN" (HODRİ was split); in YOLCU ch. 26 a case file was removed so the next file is now "İkinci dosya"; in YOLCU ch. 18 the advance quotation of the 1978 handbook was removed (it is quoted in ch. 24); YOLCU ch. 49 got a new paragraph about the time 14.53; editor additions about "Sessiz Ses" (ch. 2) and the three novels (ŞAHİT AYNI EL / SU). Acrostics and bridge sentences are machine-checked and fine.

## Output
Write a JSON list of fixes to the output file named in your task. Each fix is an operation on the NEW docx (pid = new index):
```
{"op":"replace","pid":123,"old":"<exact substring of new paragraph 123>","new":"<fixed text>","sorun":"<problem, Turkish or English, 1 line>","tip":"seam|lost_reference|continuity|punctuation"}
{"op":"insert_after","pid":123,"text":"<sentence or paragraph to restore, normally copied verbatim from the old text>","sorun":"…","tip":"lost_reference"}
```
- `old` must be copied exactly from the new paragraph and occur once in it.
- To restore a deleted sentence inside a paragraph, use replace with an anchor (e.g. old = the sentence before, new = that sentence + " " + restored sentence).
- Keep fixes minimal: restore the old wording where possible rather than inventing new text.
- Validate: `cd /home/user/Notion/iki-roman/interior && python3 tools/docx_ops.py <NEW_DOCX> <YOUR_JSON> /tmp/<KEY>_<PART>_fix.docx` must apply all ops; then `python3 tools/check_text.py --by|--sa /tmp/<KEY>_<PART>_fix.docx` must say OK.

Final answer (short): number of hunks reviewed, list of fixes (pid, type, one line each), and any doubtful point you decided not to fix.
