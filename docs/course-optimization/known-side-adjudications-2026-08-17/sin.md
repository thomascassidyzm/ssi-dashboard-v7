# A135 — false-positive adjudication, eng_for_sin (known side = Sinhala)

40 residual cases from `adjudicate-helper.cjs eng_for_sin --sample=40`.
Each verdict was cross-checked against an **exact-token** debut probe over
`course_legos.known_text` + `components[].known` (the helper's "shared prefix" and
"appears inside a gloss" hints are substring-based and are misleading for Sinhala —
see notes).

| phrase_id | flagged word | gloss | verdict | reason |
|---|---|---|---|---|
| S0069L02B02 | මිනිස්සු | people (pl.) | REAL | Plural of මිනිසා/මිනිහා; මිනිහා does not debut until seed 226, nothing related given by seed 69. |
| S0069L02U03 | මිනිස්සු | people | REAL | Same: used 157 seeds before any form of the lexeme is introduced. |
| S0085L01B01 | මිනිස්සු | people | REAL | Still un-introduced at seed 85. |
| S0085L01U04 | මිනිස්සු | people | REAL | Still un-introduced at seed 85. |
| S0091L01U05 | මිනිස්සු | people | REAL | Still un-introduced at seed 91. |
| S0098L02U05 | මිනිස්සු | people | REAL | Still un-introduced at seed 98. |
| S0221L01U02 | ඒයා | he/she (colloq.) | REAL | Distinct colloquial 3sg pronoun; only ඔහු was given (seed 16). එයා/ඒයා never appear as a lego token at all. Closed class but genuinely never given. |
| S0122L02U08 | නව | new (literary) | REAL | Different lexeme from the taught අලුත් (seed 109). Exact token නව: 0 legos ever. Helper's 225 "matches" are the verb ending -නවා. |
| S0111L03U06 | නව | new (literary) | REAL | Same. |
| S0049L02U05 | ඉතා | very (literary) | REAL | 0 legos ever. Helper's only near-match is ඉතාලියේ "in Italy" (seed 462) — unrelated. |
| S0132L02U04 | ඉතා | very | REAL | Same. |
| S0056L01U06 | නිසා | because / so | REAL | නිසා debuts at seed 105; used here at seed 56, 49 seeds early. Content-bearing connective, not a bound particle. |
| S0111L01U04 | ලිහිල් | loose / relaxed | REAL | 0 legos in the whole course. Never introduced anywhere. |
| S0116L02U03 | ලිහිල් | relaxed | REAL | Same. |
| S0118L02U04 | ලිහිල් | relaxed | REAL | Same. |
| S0126L02U02 | ලිහිල් | relaxed | REAL | Same. |
| S0143L01U04 | ගාවෙ | near / with (person) | REAL | ගාව debuts at seed 454; used at 143. Helper's only near-match ගාඩිය "car" is unrelated. |
| S0146L04U06 | ගාවෙ | near / with | REAL | Same, seed 146. |
| S0155L02U03 | ගාවෙ | near / with | REAL | Same, seed 155. |
| S0156L01U06 | ගාවෙ | near / with | REAL | Same, seed 156. |
| S0158L02U06 | ගාවෙ | near / with | REAL | Same, seed 158. |
| S0191L01U01 | ගාව | near / with | REAL | Same lexeme, seed 191 — still 263 seeds before debut. |
| S0277L01U02 | ගාව | near / with | REAL | Same, seed 277. |
| S0246L02U01 | හැබැයි | but / however | REAL | හැබැයි debuts at seed 469; used at 246. |
| S0276L01U04 | ඉස්සර | before / earlier | REAL | ඉස්සර debuts at seed 480; used at 276. |
| S0216L01B01 | දැක්කා | saw | FP-MORPH | Past tense of දකිනවා (seed 140) / දැකලා (seed 182), both given before seed 216. |
| S0372L03U02 | දැක්කාද | did (you) see? | FP-MORPH | දැක්කා + interrogative clitic ද. Same verb, already given. |
| S0384L01U05 | දැක්කාද | did (you) see? | FP-MORPH | Same. |
| S0086L01U01 | වුණා | became / was | FP-MORPH | Past tense of වෙනවා, given at seed 80 (before 86). |
| S0089L01U03 | දේ | thing | FP-MORPH | Singular base of දේවල් "things" (seed 51). |
| S0104L01B02 | දේ | thing | FP-MORPH | Same. |
| S0292L01B03 | ළඟ | near / at | FP-MORPH | Bare form of the postposition given inflected as ළඟට (seed 181) and ළඟදීම (seed 23). |
| S0196L01U02 | මේක | this one | FP-FUNCTION | Demonstrative මේ (seed 31) + nominaliser -ක. Closed-class deictic, not vocabulary. |
| S0092L01U01 | මේක | this one | FP-FUNCTION | Same. |
| S0065L03U02 | ඔයාව | you (acc.) | FP-FUNCTION | ඔයා (seed 1) + accusative -ව; ඔයාට (seed 20) already shows the case paradigm. |
| S0076L04U04 | ගොඩාක් | a lot / very | FP-OTHER | Spelling variant (lengthened vowel) of ගොඩක්, given at seed 13. Same word. |
| S0077L01U06 | ගොඩාක් | a lot / very | FP-OTHER | Same spelling variant. |
| S0151L01U06 | මමා | I | FP-OTHER | Non-standard lengthened spelling of මම (seed 1); the course's own later legos gloss මමා = "I". |
| S0183L02B03 | ඔොළා | (intended: your / you) | FP-OTHER | Malformed orthography — ඔ is an independent vowel letter and cannot take the ො vowel sign, so this is not a Sinhala word at all. A corrupt-text defect, not an un-taught lexeme. |
| S0189L01U04 | ඔොළා | (intended: your / you) | FP-OTHER | Same corrupt token. |

## Tally

| verdict | count |
|---|---|
| REAL | 25 |
| FP-MORPH | 7 |
| FP-FUNCTION | 3 |
| FP-OTHER | 5 |
| UNSURE | 0 |
| **total** | **40** |

**Confirmed-real rate: 25/40 = 62.5%.**

## Notes on the helper's own hints

- "APPEARS INSIDE an already-given gloss" is substring matching and is actively
  wrong for Sinhala: it justified නව "new" with කරනවාද "are going to help",
  because the present-tense verb ending is -නවා. Never trust that line for sin.
- "shares N characters" prefix matching also fails both ways: ගාව vs ගාඩිය
  (unrelated, 2 chars shared) and දැක්කා vs දැකලා (same verb, 3 chars shared)
  score identically.
- Distinct lexemes flagged here cluster: 6× මිනිස්සු, 7× ගාව/ගාවෙ, 4× ලිහිල්,
  2× ඉතා, 2× නව. 25 REAL hits are only **9 distinct un-taught lexemes**.
