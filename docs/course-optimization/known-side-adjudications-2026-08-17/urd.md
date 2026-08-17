# A135 — known-side gate residual adjudication: eng_for_urd (known language = Urdu)

40 residual cases, sampled by `.a135-scratch/adjudicate-helper.cjs eng_for_urd --sample=40`.

| phrase_id | flagged word | gloss | verdict | reason |
|---|---|---|---|---|
| S0490L02B03 | جاؤں | "(that) I go" | FP-MORPH | 1sg subjunctive of جانا (given seed 25); جانے/جا/جانا all already given |
| S0025L02U03 | لوگوں | "people (obl.)" | FP-MORPH | oblique plural of لوگ, debut seed 22 — same seed-block, pure case marking |
| S0116L03U05 | لگتا | "seems / (I) think" | FP-MORPH | imperfective participle of لگنا; لگا/لگی/لگ given from seed 41–77 |
| S0015L03U05 | بولیں | "(that you) speak" | FP-MORPH | subjunctive of بولنا, debut seed 1 |
| S0131L01U05 | اہم | "important" | REAL | new content adjective, no relative of any form in the given corpus |
| S0064L03U04 | چیزیں | "things" | REAL | چیز "thing" was never given in any form; only lookalike is unrelated چین |
| S0067L01U01 | رکنا | "to stop" | REAL | distinct lexeme from رکھنا "to put"; رکنا itself does not debut until seed 155 |
| S0281L03B03 | جاؤں | "(that) I go" | FP-MORPH | as S0490 — subjunctive of given جانا |
| S0502L03U03 | آئیں | "come (polite/subj.)" | FP-MORPH | of آنا; آئی (346) and آئے (185) already given |
| S0088L01B02 | لوگوں | "people (obl.)" | FP-MORPH | oblique plural of given لوگ |
| S0053L01U02 | تھی | "was (f.sg)" | FP-FUNCTION | past copula agreement form; تھا/تھے already given — no course teaches copula genders as vocabulary |
| S0638L01U04 | رکیں | "wait (polite)" | FP-MORPH | subjunctive/imperative of رکنا, given seed 155 |
| S0468L02U03 | بڑا | "big (m.)" | FP-MORPH | masculine of بڑی, given in the *same* seed 468 |
| S0534L03B03 | آئیں | "come/let's" | FP-MORPH | of given آنا |
| S0448L01U04 | آئیں | "they'll come" | FP-MORPH | of given آنا |
| S0508L02U05 | ہر | "every" | REAL | quantifier-determiner never given in any form; a course does teach "every" |
| S0428L01U05 | آئیں | "come (subj.)" | FP-MORPH | of given آنا |
| S0583L01U05 | بڑا | "big (m.)" | FP-MORPH | masculine of given بڑی |
| S0620L01U01 | لمبا | "long" | REAL | new content adjective, no relative given |
| S0597L03U01 | سنی | "heard (f.)" | FP-MORPH | feminine perfective of سننا (71); سنا given at 196 |
| S0015L02U02 | بولیں | "(that you) speak" | FP-MORPH | subjunctive of بولنا (seed 1) |
| S0022L03U01 | لوگوں | "people (obl.)" | FP-MORPH | oblique plural of لوگ, debut in this very seed |
| S0413L03B01 | گر | "fall (stem)" | FP-MORPH | bare stem of گرنا, introduced in the same seed 413 |
| S0060L01U03 | چیزیں | "things" | REAL | چیز never given; new content noun |
| S0071L03U03 | تھی | "was (f.sg)" | FP-FUNCTION | copula gender agreement on given تھا/تھے |
| S0087L01U05 | لوگوں | "people (obl.)" | FP-MORPH | oblique plural of given لوگ |
| S0085L01U05 | لوگوں | "people (obl.)" | FP-MORPH | oblique plural of given لوگ |
| S0100L02B01 | مت | "don't (prohibitive)" | FP-FUNCTION | negative-imperative particle; a clitic-class function word, not taught as vocabulary |
| S0171L01U04 | خوشی | "happiness / gladness" | REAL | derivational noun, not an inflection of the adjective خوش — a new lexeme to the learner |
| S0245L01U01 | خوشی | "happiness" | REAL | as above |
| S0286L01U03 | لوگوں | "people (obl.)" | FP-MORPH | oblique plural of given لوگ |
| S0417L01B02 | سی | "sort of / (in بہت سی) a lot of" | FP-FUNCTION | feminine of the approximative particle سا; a quantifier clitic, never taught as an item |
| S0446L01U03 | کھڑی | "standing (f.)" | FP-MORPH | feminine of کھڑا (390) / کھڑے (396) |
| S0468L02U02 | بڑا | "big (m.)" | FP-MORPH | masculine of same-seed بڑی |
| S0466L02U03 | مت | "don't" | FP-FUNCTION | prohibitive particle, as S0100 |
| S0494L02U01 | شو | "show" | REAL | English loanword noun, entirely new |
| S0498L03U02 | آئیں | "come in (polite)" | FP-MORPH | of given آنا |
| S0510L01U01 | کھڑی | "standing / (گاڑی کھڑی کرنا) to park" | FP-MORPH | same lexeme کھڑا in a causative light-verb construction |
| S0514L01U04 | بڑا | "big (m.)" | FP-MORPH | masculine of given بڑی |
| S0533L01U01 | ہر | "every" | REAL | as S0508 — never given in any form |

## Totals

| verdict | count |
|---|---|
| REAL | 10 |
| FP-MORPH | 25 |
| FP-FUNCTION | 5 |
| FP-OTHER | 0 |
| UNSURE | 0 |
| **total** | **40** |

Confirmed-real rate: **10/40 = 25%**.

Noted doubt (kept as REAL, not UNSURE): ہر "every" (2 cases) is a determiner rather than a
content word, but nothing in its paradigm was ever given and SSi does introduce "every" as an
item, so it is a genuine unmet word. خوشی (2 cases) is transparently derived from given خوش,
but derivation is not inflection, so it is a new lexeme per the strict rule.

## The three dominant false-positive patterns

1. **Oblique/plural noun case marking** — `لوگ → لوگوں`. Urdu marks the oblique on every noun
   before a postposition; the gate sees a different string every time. 6 of 40 cases are this one
   noun alone.
2. **Verb-paradigm forms of an already-given infinitive** — `جانا → جاؤں`, `آنا → آئیں`,
   `بولنا → بولیں`, `رکنا → رکیں`, `سننا → سنی`, `گرنا → گر`. The corpus gives the infinitive (and
   often 2–4 other forms) and the gate still flags the subjunctive, the bare stem and the
   feminine perfective. 12 of 40.
3. **Gender/number agreement on adjectives and the copula** — `بڑی → بڑا`, `کھڑا → کھڑی`,
   `تھا/تھے → تھی`, `سا → سی`. Twice the masculine and feminine of the *same* adjective debut in
   the *same seed* and one of the two is still flagged. 8 of 40.

(The residual fourth pattern, small but clean: prohibitive/quantifier particles — مت, سی — which
no course lists as vocabulary.)

## Is an exact-form mechanical gate usable for Urdu?

No — at a 25% confirmed-real rate three quarters of its output is paradigm noise, so the gate
needs morphological normalisation (at minimum: noun oblique/plural stripping, verb-stem
lemmatisation off the given infinitive, adjective/copula gender-number folding, and a
function-word stoplist) before an exact-form comparison means anything for Urdu.
