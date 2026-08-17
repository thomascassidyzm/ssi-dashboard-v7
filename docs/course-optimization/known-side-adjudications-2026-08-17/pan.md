# A135 residual adjudication — eng_for_pan (known side = Panjabi, Gurmukhi)

Sample: `node .a135-scratch/adjudicate-helper.cjs eng_for_pan --sample=40`
40 residual cases, one verdict each. "Debut" column facts come from a read-only probe of
`course_legos.known_text` + `components[].known` for eng_for_pan (`.a135-scratch/pan-debut-probe.cjs`).

| phrase_id | flagged word | gloss | verdict | reason |
|---|---|---|---|---|
| S0486L01U03 | ਸੁੰਦਰ | beautiful | REAL | Never introduced by any lego at any seed; nearest neighbours (ਸੁਣਿਆ, ਸੁੱਤਾ) are unrelated lexemes sharing only the ਸੁ- onset. |
| S0486L01U02 | ਸੁੰਦਰ | beautiful | REAL | Same new adjective, seed 486, no debut anywhere in the course. |
| S0500L01U03 | ਸੁੰਦਰ | beautiful | REAL | Same new adjective, seed 500, still never taught. |
| S0315L02U03 | ਖਰੀਦ | buy (verb stem) | REAL | New content verb ਖਰੀਦਣਾ; zero lego slots contain it anywhere in the course. |
| S0315L02U04 | ਖਰੀਦ | buy (verb stem) | REAL | Same untaught verb stem, second phrase. |
| S0292L01U03 | ਯੋਗ | able / capable (ਯੋਗ ਹੋਣਾ) | REAL | Content word; debuts only at seed 379 ("ਦੇ ਯੋਗ ਹੋਇਆ"), used here at seed 292 — order breach. |
| S0221L01U05 | ਫਿਰ | then / again | REAL | Adverb with its own lego debut at seed 490 ("ਫਿਰ" = then), used here at seed 221 — order breach, and a word a course does teach. |
| S0256L01U02 | ਵੱਧ | more (comparative, ਤੋਂ ਵੱਧ) | REAL | Degree word, debuts seed 485, used at seed 256. Borderline (it lives in a fixed ਤੋਂ ਵੱਧ frame) but ਵੱਖਰਾ is a different lexeme, so nothing prepares it. |
| S0256L01U04 | ਵੱਧ | more (comparative) | REAL | Same, second phrase at seed 256. |
| S0454L01U01 | ਥੱਕੇ | tired (masc pl / oblique) | FP-MORPH | Direct-plural of ਥੱਕਿਆ, given seed 39. Same lexeme, agreement only. |
| S0040L02U04 | ਥੱਕੇ | tired (masc pl / oblique) | FP-MORPH | Same lexeme as ਥੱਕਿਆ (seed 39). |
| S0015L03U01 | ਬੋਲੋ | speak (2pl imperative/subjunctive) | FP-MORPH | Same lexeme as ਬੋਲਣਾ / ਬੋਲਦਾ / ਬੋਲ, all given by seed 13. |
| S0028L02U06 | ਕਰੋ | do (2pl imperative/subjunctive) | FP-MORPH | Same lexeme as ਕਰਨਾ / ਕਰ / ਕਰਦੇ, given from seed 2. |
| S0231L01U03 | ਬੰਦੇ | man (oblique sg) | FP-MORPH | Oblique of ਬੰਦਾ, given seed 226 — case form under ਨੂੰ, not a new word. |
| S0268L02B02 | ਭੇਜੀ | sent (fem sg perfective) | FP-MORPH | Gender agreement with ਈਮੇਲ on ਭੇਜਿਆ, given in the same seed 268. |
| S0268L02U05 | ਭੇਜੀ | sent (fem sg perfective) | FP-MORPH | Same, same seed. |
| S0268L03U04 | ਭੇਜੀਆਂ | sent (fem pl perfective) | FP-MORPH | Fem-plural agreement on ਭੇਜਿਆ, same seed 268. |
| S0294L02U02 | ਕੋਲ | at / with (possessive postposition) | FP-FUNCTION | Postposition forming the "X has" frame; no course teaches it as vocabulary. (Debuts as a lego only at seed 356.) |
| S0259L01U03 | ਕੋਲ | possessive postposition | FP-FUNCTION | Same postposition. |
| S0178L01U01 | ਕੋਲ | possessive postposition | FP-FUNCTION | Same postposition. |
| S0178L01U03 | ਕੋਲ | possessive postposition | FP-FUNCTION | Same postposition. |
| S0181L01U01 | ਕੋਲ | to / at (goal postposition) | FP-FUNCTION | Same postposition, locative sense. |
| S0181L03U05 | ਕੋਲ | to / at (goal postposition) | FP-FUNCTION | Same postposition. |
| S0273L01B03 | ਕੋਲ | possessive postposition | FP-FUNCTION | Same postposition. |
| S0052L03U03 | ਆਪਣੇ | own (reflexive poss., obl/pl) | FP-FUNCTION | Reflexive possessive pronoun, obligatory Panjabi grammar, not a vocabulary item. |
| S0052L03U04 | ਆਪਣੇ | own (reflexive possessive) | FP-FUNCTION | Same pronoun. |
| S0051L03U05 | ਆਪਣੇ | own (reflexive possessive) | FP-FUNCTION | Same pronoun. |
| S0054L01U04 | ਆਪਣੇ | own (reflexive possessive) | FP-FUNCTION | Same pronoun. |
| S0121L01U01 | ਆਪਣੀ | own (fem sg) | FP-FUNCTION | Feminine agreement of the same reflexive possessive. |
| S0121L01U04 | ਆਪਣੀ | own (fem sg) | FP-FUNCTION | Same. |
| S0065L03U03 | ਆਪਣੀ | own (fem sg) | FP-FUNCTION | Same; ਆਪਣੇ ਆਪ already given in this very seed. |
| S0143L01U04 | ਜਿਸ | which / that (rel. pron., oblique) | FP-FUNCTION | Oblique relative pronoun; a relativiser, not lexis. |
| S0143L03U02 | ਜਿਸ | relative pronoun (oblique) | FP-FUNCTION | Same. |
| S0143L03U03 | ਜਿਸ | relative pronoun (oblique) | FP-FUNCTION | Same. |
| S0051L02U06 | ਮੇਰੀ | my (fem sg) | FP-FUNCTION | Gender agreement of ਮੇਰਾ (seed 8) — possessive pronoun. |
| S0121L02B04 | ਮੇਰੀ | my (fem sg) | FP-FUNCTION | Same. |
| S0435L01U02 | ਸਾਡੀ | our (fem sg) | FP-FUNCTION | Gender agreement of ਸਾਡਾ (seed 111) / ਸਾਡੇ (seed 271) — possessive pronoun. |
| S0069L02U05 | ਉਸਦੇ | his / her (oblique) | FP-FUNCTION | Oblique of ਉਸਦਾ (seed 20) / ਉਸਦੀ (seed 21) — possessive pronoun agreement. |
| S0452L01U04 | ਕੌਣ | who | FP-FUNCTION | Bare interrogative pronoun in an embedded question; a grammatical word, and the learner's own L1 basic inventory. Weakest of the FP-FUNCTION calls. |
| S0042L03U03 | ਕੇ | conjunctive-participle marker ("having …") | FP-FUNCTION | Clitic that turns a verb stem into "having V-ed"; never taught as a word. Its own debut lego is at seed 497 for the same reason. |

Counts: REAL 9, FP-MORPH 8, FP-FUNCTION 23, FP-OTHER 0, UNSURE 0.
Confirmed-real rate: 9/40 = 22.5%.
