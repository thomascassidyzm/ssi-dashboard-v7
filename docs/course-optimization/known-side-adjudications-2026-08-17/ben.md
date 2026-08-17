# A135 — false-positive adjudication, eng_for_ben (known side = Bengali)

40 residual cases from `adjudicate-helper.cjs eng_for_ben --sample=40`.
Debut seeds verified against `course_legos` (known_text + components) with a
substring probe, not just the helper's shared-prefix list — the prefix list
misses Bengali stem-vowel alternation (শেখা ↔ শিখ-, পাওয়া ↔ পে-, হওয়া ↔ হয়),
and that alternation alone accounts for the two cases I first scored REAL.

| phrase_id | flagged | gloss | verdict | reason |
|---|---|---|---|---|
| S0159L01U05 | শিখতে | to learn (inf.) | FP-MORPH | শেখা "to learn" given seed 2; শিখছি/শিখি seeds 38/111 — same lexeme, infinitive |
| S0008L01U01 | করতে | to do (inf.) | FP-MORPH | করা given seed 5, করছি seed 2 — infinitive of the same verb |
| S0004L01U05 | বলার | of saying (verbal noun, gen.) | FP-MORPH | বলা "to say" given same seed 4 — genitive of the verbal noun |
| S0023L03B02 | করতে | to do (inf.) | FP-MORPH | করা seed 5 |
| S0003L02U01 | হয় | is / one must (3sg copula) | FP-FUNCTION | copula/impersonal auxiliary in the বলতে হয় "how to X" periphrasis; course itself glosses বলতে হয় as one unit (seed 137) |
| S0008L02U05 | হয় | is / one must | FP-FUNCTION | same periphrasis, বোঝাতে হয় "how to explain" |
| S0016L02U04 | আসতে | to come (inf.) | FP-MORPH | আসা given same seed 16 ("ফিরে আসা") |
| S0023L01U02 | করতে | to do (inf.) | FP-MORPH | করা seed 5 |
| S0031L01U04 | দিতে | to give (inf.) | FP-MORPH | দেওয়া "to give/answer" given seed 27 — দি-/দে- stem alternation, same lexeme |
| S0037L03B02 | ভাবতে | to think (inf.) | FP-MORPH | ভাবা given same seed 37 |
| S0117L02U05 | অপরের | of the other (gen.) | FP-MORPH | অপর given same seed 117 ("একে অপর") — genitive -এর |
| S0226L01B01 | একজন | a / one (person) | FP-FUNCTION | numeral এক (seed 38) + human classifier -জন = indefinite article; listed as its own lego only at seed 265 |
| S0611L01U04 | চান | wants (honorific 3sg) | FP-MORPH | চাই/চায়/চাও/চাইতাম all given from seed 1 — honorific agreement form of চাওয়া |
| S0054L01U02 | দিতে | to give (inf.) | FP-MORPH | দেওয়া seed 27 |
| S0018L02B02 | করতে | to do (inf.) | FP-MORPH | করা seed 5 |
| S0021L03B03 | শিখতে | to learn (inf.) | FP-MORPH | শেখা seed 2; শিখছ same seed 21 |
| S0020L02U01 | শিখতে | to learn (inf.) | FP-MORPH | শেখা seed 2 — prefix search missed it on the শে/শি vowel alternation |
| S0016L01U03 | করতে | to do (inf.) | FP-MORPH | করা seed 5 |
| S0023L03U02 | করতে | to do (inf.) | FP-MORPH | করা seed 5 |
| S0087L01U01 | শিখতে | to learn (inf.) | FP-MORPH | শেখা seed 2 |
| S0084L01U03 | যা | what / that which (rel. pron.) | FP-FUNCTION | relative pronoun of the য-series; যে "that" given seed 47. Note the helper's যাওয়া/যারা matches are a different lexeme |
| S0066L01U03 | পেতে | to get / to find (inf.) | **REAL** | পাওয়া "to find" does not debut until seed 195 (খুঁজে পাওয়া); no পা-/পে- form of this lexeme exists at seed 66 — পারা "be able" is an unrelated verb |
| S0043L01U03 | ভাবতে | to think (inf.) | FP-MORPH | ভাবা seed 37 |
| S0089L01U04 | যা | what / that which | FP-FUNCTION | relative pronoun; see S0084L01U03 |
| S0071L04B02 | শুনতে | to hear (inf.) | FP-MORPH | শোনা "hear" given same seed 71 — শো/শু alternation |
| S0107L02U04 | দেখতে | to see (inf.) | FP-MORPH | দেখা "to see" given seed 18 |
| S0024L02B03 | রাখতে | to keep/remember (inf.) | FP-MORPH | মনে রাখা given seed 10 |
| S0019L01U03 | করতে | to do (inf.) | FP-MORPH | করা seed 5 |
| S0009L01U01 | শিখতে | to learn (inf.) | FP-MORPH | শেখা seed 2 |
| S0010L04U03 | বলার | of saying | FP-MORPH | বলা seed 4 |
| S0021L03U02 | রাখতে | to keep/remember (inf.) | FP-MORPH | রাখা seed 10 |
| S0034L02U05 | থাকতে | to stay/remain (inf.) | FP-MORPH | থাকা given seed 19 ("চুপ থাকা") |
| S0043L01U01 | ভাবতে | to think (inf.) | FP-MORPH | ভাবা seed 37 |
| S0065L02U07 | বলার | of speaking | FP-MORPH | বলা seed 4 |
| S0090L02U01 | পারো | you can (2sg familiar) | FP-MORPH | পারা/পারি/পারব/পারবে given seeds 7–61 — person agreement only |
| S0142L02U01 | এবং | and | FP-FUNCTION | coordinating conjunction; listed as its own lego only at seed 168 |
| S0264L01U04 | একজন | a / one (person) | FP-FUNCTION | এক + classifier -জন; see S0226L01B01 |
| S0045L01B03 | হয় | is / one must | FP-FUNCTION | বলতে হয় periphrasis; হওয়া also already given at seed 28 |
| S0203L01U05 | ভাবতে | to think (inf.) | FP-MORPH | ভাবা seed 37 |
| S0414L03U01 | পেতে | to get (inf.) | FP-MORPH | পাওয়া given seed 195, this phrase is seed 414 |

## Tally

| verdict | n |
|---|---|
| REAL | 1 |
| FP-MORPH | 31 |
| FP-FUNCTION | 8 |
| FP-OTHER | 0 |
| UNSURE | 0 |

Confirmed-real rate **1/40 = 2.5 %**.

Strict alternative reading: all 8 FP-FUNCTION items are function words that this
course nonetheless *does* list as legos at a later seed (হয় 90, একজন 265, এবং 168,
যা — য-series, যে at 47). If a known-side ordering breach on a function word is
counted as a defect, the rate is 9/40 = 22.5 %. Neither number is above ~1/4;
under the vocabulary-only reading it is 1 in 40.
