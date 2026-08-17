# A135 — residual adjudication, eng_for_hin (known language = Hindi)

Sample: 40 residual hits from `node .a135-scratch/adjudicate-helper.cjs eng_for_hin --sample=40`.
Evidence for "already given" was re-derived directly from `course_legos` (known_text + components,
stemmed with the same `stemKnownGloss`/`tokenizeKnown` the gate uses), not from the helper's
shared-prefix heuristic — that heuristic is blind to single-character tokens (आ) and merges
unrelated lexemes (जानना "know" vs जाना "go").

First-introduction facts used repeatedly below:
आना seed 16 · जाना seed 95 · से seed 22 · को seed 30 · बताना seed 70 · खड़ा seed 390 ·
थका seed 39 · जगह seed 364 · रहना seed 34 / रहता seed 506 · करना seed 5 · होना/हुआ seed 39 ·
चलाना seed 599 · बड़ी seed 468 · पहले ("before") seed 25.
Never given anywhere in the course: सिर, दाईं, बाईं, दायाँ, बायाँ, समाज, पहला.

| phrase_id | flagged word | gloss | verdict | reason |
|---|---|---|---|---|
| S0445L01U02 | आ | come (bare stem) | FP-MORPH | stem of आना, given seed 16; 1-char token so the prefix heuristic can't see it |
| S0599L03U01 | चलाकर | having driven | FP-MORPH | conjunctive participle (-कर) of चलाना, given in the same seed 599 |
| S0468L01B03 | बड़ा | big (m.sg) | FP-MORPH | gender agreement form of बड़ी, given in the same seed 468 |
| S0214L02B02 | हुए | been (m.pl/obl participle) | FP-MORPH | oblique/plural of हुआ (होना), given seed 39 |
| S0599L02B04 | चलाकर | having driven | FP-MORPH | same as S0599L03U01 |
| S0534L02U03 | जाओ | go! (imperative) | FP-MORPH | imperative of जाना, given seed 95 ("घर जाना") |
| S0502L02U04 | बाईं | left (f.obl) | REAL | no form of बायाँ/बाईं ever introduced; a new content word |
| S0494L02U02 | पहला | first (ordinal) | REAL | only पहले = "before" (seed 25) was given; the ordinal sense "first" is new and not recoverable from the adverbial |
| S0281L02B03 | करूँ | (that) I do (1sg subj.) | FP-MORPH | subjunctive of करना, given seed 5 |
| S0030L01U02 | आपसे | from/with you | FP-FUNCTION | pronoun आप (seed 14) + postposition से (seed 22), written as one orthographic word |
| S0054L01U04 | आपको | to you | FP-FUNCTION | आप + को (seed 30); postpositional portmanteau, never taught as vocabulary |
| S0063L02U05 | आपको | to you | FP-FUNCTION | as above |
| S0083L02U01 | आपसे | from/with you | FP-FUNCTION | as above |
| S0214L02U04 | हुए | been (participle) | FP-MORPH | oblique/plural of हुआ, seed 39 |
| S0238L01U02 | आएँ | (that they) come (subj.pl) | FP-MORPH | subjunctive of आना (seed 16); आए already given seed 185 |
| S0263L01U04 | आ | come (bare stem) | FP-MORPH | stem of आना, seed 16 |
| S0281L02B04 | करूँ | (that) I do | FP-MORPH | subjunctive of करना, seed 5 |
| S0030L03U02 | आपसे | from/with you | FP-FUNCTION | आप + से |
| S0054L02U05 | आपको | to you | FP-FUNCTION | आप + को |
| S0513L02U01 | सिर | head | REAL | body-part noun, never introduced in any form |
| S0083L01U01 | आपसे | from/with you | FP-FUNCTION | आप + से |
| S0281L02U05 | करूँ | (that) I do | FP-MORPH | subjunctive of करना, seed 5 |
| S0631L01B04 | बताओ | tell! (imperative) | FP-MORPH | imperative of बताना, given seed 70 |
| S0628L01U05 | बताओ | tell! (imperative) | FP-MORPH | as above |
| S0418L02U01 | समाज | society | REAL | the course taught समुदाय for "community" in this very seed; समाज is a distinct lexeme, never given |
| S0494L02U05 | पहला | first (ordinal) | REAL | as S0494L02U02 |
| S0506L02U03 | रहते | live (habitual m.pl) | FP-MORPH | habitual participle of रहना (seed 34); रहता given in the same seed 506 |
| S0513L03U01 | सिर | head | REAL | never introduced |
| S0515L01U05 | पहला | first (ordinal) | REAL | as S0494L02U02 |
| S0394L01U03 | खड़ी | standing (f.) | FP-MORPH | feminine agreement form of खड़ा, given seed 390 |
| S0435L01U04 | आ | come (bare stem) | FP-MORPH | stem of आना, seed 16 |
| S0502L03U01 | दाईं | right (f.obl) | REAL | no form of दायाँ/दाईं ever introduced |
| S0447L01U03 | आ | come (bare stem) | FP-MORPH | stem of आना, seed 16 |
| S0599L02U01 | चलाकर | having driven | FP-MORPH | -कर participle of चलाना, seed 599 |
| S0418L02U02 | समाज | society | REAL | distinct lexeme from the taught समुदाय |
| S0513L02U03 | सिर | head | REAL | never introduced |
| S0513L02U05 | सिर | head | REAL | never introduced |
| S0477L02U03 | थके | tired (m.pl) | FP-MORPH | plural agreement form of थका, given seed 39 |
| S0492L01U03 | जगहें | places (nom.pl) | FP-MORPH | plural of जगह (seed 364); the oblique plural जगहों is given in the same seed 492 |
| S0502L02U02 | दाईं | right (f.obl) | REAL | never introduced |

## Tally

| verdict | count |
|---|---|
| REAL | 12 |
| FP-MORPH | 21 |
| FP-FUNCTION | 7 |
| FP-OTHER | 0 |
| UNSURE | 0 |

Confirmed-real rate: **12 / 40 = 30%**.

Distinct REAL lexemes behind those 12 hits: सिर (head), दाईं / बाईं (right / left),
समाज (society), पहला (first). Five lexemes, four of them clustered in seeds 494–515.

## Note on the two borderline calls

- **पहला (3 hits)** is scored REAL rather than FP-MORPH. पहले *is* historically the oblique of
  पहला, but the learner was given it only in the fixed adverbial "जाने से पहले = before I have to
  go". Meeting पहला = "first" is meeting a new meaning, not a new ending, so it fails the
  "not a new word to a learner who has the base" test.
- **समाज (2 hits)** is REAL and is arguably a genuine content defect: seed 418 introduces
  समुदाय for "the community", then the practice phrases say समाज. Different lexeme, same gloss.
