# spa_for_eng padding campaign — false-positive audit

**Date:** 2026-08-06 · **Scope:** read-only. No DB writes, no TTS, no commits, no files touched outside `scripts/spa-padding/`.
**Inputs:** `scripts/spa-padding/audit-input.json` (391 adjudicated + 102 plausible), round context read live from `course_practice_phrases` / `course_legos` / `course_round_index`.

---

## Headline

The DEFECT label is **reliable inside rounds 1050–1199 and close to worthless below round 1050.**

| Round band | DEFECT rows | Sampled | Judged false-positive | FP rate | 95% CI (Wilson) |
|---|---|---|---|---|---|
| < 1050 | 81 | 45 | 42 | **93.3%** | 82.1% – 97.7% |
| 1050–1199 | 286 | 40 | 5 | **12.5%** | 5.5% – 26.1% |
| ≥ 1200 | **0** | — | — | — | — |

**Population estimate (stratified, with finite-population correction): ~111 of the 367 DEFECT rows are false positives — 30.3%, 95% CI 22.9%–37.8% (84–139 rows).**

Had those rows been rewritten, ~111 perfectly good practice phrases would have been replaced and ~330 audio clips regenerated for nothing.

### The judging criterion I used (state it, because it decides the answer)

A row is a **TRUE DEFECT** if it is ungrammatical or unnatural in English, wrong/unidiomatic in Spanish, a mistranslation, or a bare fragment presented as a **USE** row. A row is a **FALSE POSITIVE** if it is a natural, correct utterance — *even if its round is repetitive*. In the SSi method a **BUILD** row is legitimately a short incremental fragment scaffolding toward the round's USE sentences; LEGO + a real, taught, load-bearing word is the method working, not the defect. Deborah's complaint was about vacuous and ungrammatical padding ("I am feeling sad yesterday", "small here"), not about monotony. If you instead want "the round is boring" treated as a defect, the FP rate below 1050 collapses and my numbers do not apply — but that is a different campaign with a different cost.

---

## 1. False positives in the DEFECT set

Stratified sample of **85 of 367** DEFECT rows (45 of the 81 below round 1050 = 55% of that stratum; 40 of the 286 in 1050–1199), drawn by a deterministic hash of the row id so it is reproducible and not cherry-picked. Every sampled row was judged against the **full content of its round**, pulled live from the DB.

**47 of 85 sampled rows (55%) are wrongly flagged.**

Two structural tells:

- **By role.** Build rows: 32 FP / 9 TD. Use rows: 15 FP / 29 TD. The detector has no concept of role, so it treats a legitimate build fragment identically to a bare fragment masquerading as a USE sentence.
- **The adjudicator contradicts itself inside single rounds.** In round 418 it spared `S0175L01B04` "What do you want to do now?" as LEGITIMATE while condemning `S0175L01U02` "What do you want to do today?" and `S0175L01U04` "…this afternoon?" — which are equally natural, and are the round's entire point. Round 667: spared "I've seen her before", condemned "I've seen her over there". That inconsistency is on its own sufficient evidence that the labels below the hot band are noise.

### Every row I judge wrongly flagged (47)

| id | round | current_known | current_target |
|---|---|---|---|
| spa_for_eng:S0048L01B04 | 132 | I don't care now | No me importa ahora |
| spa_for_eng:S0048L01B03 | 132 | I don't care today | No me importa hoy |
| spa_for_eng:S0051L02B02 | 138 | interesting things here | cosas interesantes aquí |
| spa_for_eng:S0115L04B05 | 262 | I don't feel as if I'm ready to have a conversation right now | …ahora |
| spa_for_eng:S0115L04B02 | 262 | I don't feel as if I'm ready to have a conversation today | …hoy |
| spa_for_eng:S0115L04U04 | 262 | I don't feel as if I'm ready to have a conversation this afternoon | …esta tarde |
| spa_for_eng:S0116L04B05 | 265 | This isn't the best choice I could make right now | …ahora |
| spa_for_eng:S0116L04B04 | 265 | This isn't the best choice I could make today | …hoy |
| spa_for_eng:S0117L03B05 | 268 | We talked last night | Hablamos anoche |
| spa_for_eng:S0117L03B06 | 268 | We talked yesterday | Hablamos ayer |
| spa_for_eng:S0119L02B02 | 275 | Can I ask you something before you leave this evening? | …esta noche? |
| spa_for_eng:S0119L02B03 | 275 | Can I ask you something before you leave now? | …ahora? |
| spa_for_eng:S0128L05B02 | 303 | Before now | Antes de ahora |
| spa_for_eng:S0128L05B04 | 303 | Before today | Antes de hoy |
| spa_for_eng:S0175L01U04 | 418 | What do you want to do this afternoon? | ¿Qué quieres hacer esta tarde? |
| spa_for_eng:S0175L01U02 | 418 | What do you want to do today? | ¿Qué quieres hacer hoy? |
| spa_for_eng:S0180L01U02 | 426 | I'd like to read my book today | Me gustaría leer mi libro hoy |
| spa_for_eng:S0180L01U03 | 426 | I'd like to read my book this afternoon | …esta tarde |
| spa_for_eng:S0180L01U04 | 426 | I'd like to read my book tonight | …esta noche |
| spa_for_eng:S0180L01U05 | 426 | I'd like to read my book tomorrow | …mañana |
| spa_for_eng:S0180L01B04 | 426 | I'd like to read my book here | …aquí |
| spa_for_eng:S0180L01B03 | 426 | I'd like to read my book now | …ahora |
| spa_for_eng:S0193L01B04 | 450 | Too busy this morning | Demasiado ocupado esta mañana |
| spa_for_eng:S0195L03B06 | 454 | That I left on the table this morning | Que dejé en la mesa esta mañana |
| spa_for_eng:S0195L03B05 | 454 | That I left on the table yesterday | Que dejé en la mesa ayer |
| spa_for_eng:S0214L01B05 | 498 | Did you have a good time last night? | ¿Lo pasaste bien anoche? |
| spa_for_eng:S0214L01B04 | 498 | Did you have a good time there? | ¿Lo pasaste bien allí? |
| spa_for_eng:S0256L01B03 | 579 | I think I'll be ready in less than an hour this evening | …esta noche |
| spa_for_eng:S0256L01U08 | 579 | I think I'll be ready in less than an hour this morning | …esta mañana |
| spa_for_eng:S0256L01U03 | 579 | I think I'll be ready in less than an hour this evening | …esta noche |
| spa_for_eng:S0257L02U01 | 580 | I like that blue thing over there | Me gusta esa cosa azul de allí |
| spa_for_eng:S0261L01B04 | 584 | It might be something important here | Podría ser algo importante aquí |
| spa_for_eng:S0281L02B04 | 612 | I finish here | Termino aquí |
| spa_for_eng:S0281L02B03 | 612 | I finish everything | Termino todo |
| spa_for_eng:S0297L04B04 | 643 | I don't know many people who speak Spanish well | …hablen español bien |
| spa_for_eng:S0297L04B03 | 643 | I don't know many people who speak Spanish here | …hablen español aquí |
| spa_for_eng:S0299L03B03 | 648 | He wants to pay half now | Él quiere pagar la mitad ahora |
| spa_for_eng:S0299L03B04 | 648 | He wants to pay half today | …hoy |
| spa_for_eng:S0299L03B05 | 648 | He wants to pay half tonight | …esta noche |
| spa_for_eng:S0309L02U03 | 667 | I've seen her over there | la he visto allí |
| spa_for_eng:S0474L01B03 | 969 | not even here | ni siquiera aquí |
| spa_for_eng:S0494L01B03 | 1020 | what happens here? | ¿qué pasa aquí? |
| spa_for_eng:S0517L02U04 | 1091 | they left with each other yesterday | se fueron juntos ayer |
| spa_for_eng:S0520L01B03 | 1097 | it might have happened here | podría haberle pasado aquí |
| spa_for_eng:S0524L01U03 | 1107 | I'll call you tomorrow | te llamaré mañana |
| spa_for_eng:S0556L01U03 | 1167 | they play music for everyone | ponen música para todos |
| spa_for_eng:S0567L01U03 | 1189 | it's been lovely for everyone | ha sido encantador para todos |

Borderline calls I made *against* the row (i.e. I kept them as TRUE_DEFECT but a reasonable reviewer could disagree): `S0051L02B03` (R138, "interesting things today" — the tail is not reused anywhere in the round, unlike "here"), `S0522L02B03` (R1103, "it was stupid here"), `S0541L02B03` (R1145), `S0257L02B04` (R580, "I like that blue thing here" — deixis clash "that … here", which the round's U06 fixes properly).

### ⚠️ Gap: the ">1200" half of the brief cannot be tested

The brief asked me to over-sample rounds **above 1200**. **There are none.** The DEFECT set stops at round 1194; the raw detector's CONFIRMED set stops there too (394 hits: 100 below 1050, 294 in 1050–1199, **0** at ≥1200) — even though the course runs to round **1339**. So:

- I could not measure precision above 1200, because the detector produced nothing there to measure.
- The more interesting question this raises: is the detector *blind* above 1200, or is that material genuinely clean? Partial evidence from the plausible set (10 singleton hits at ≥1200, of which I judge 1 defective) points at "genuinely cleaner", but 10 rows is not enough to settle it and I did not sweep rounds 1200–1339 independently. **That sweep has not been done.**

---

## 2. False negatives — the 102 `plausible` rows

I reviewed all 102 against their full round context. I report two tiers rather than forcing a binary, because the honest answer has a hard core and a soft edge.

**18 are clear defects that were wrongly spared (17.6%).** Ungrammatical, mistranslated, or a bare fragment posing as a USE sentence:

| id | round | text | what's wrong |
|---|---|---|---|
| spa_for_eng:S0187L02B01 | 442 | "So far now" / "Hasta ahora" | "So far now" is not English; also a duplicate of B02 |
| spa_for_eng:S0262L01B07 | 585 | "Who was there?" / "¿Quién era allí?" | Spanish wrong — needs *estaba*, not *era* |
| spa_for_eng:S0376L02B01 | 778 | "nowhere anywhere" / "ningún sitio" | "nowhere anywhere" is not English |
| spa_for_eng:S0392L02B03 | 810 | "opposite here" / "enfrente de aquí" | non-idiomatic in both languages |
| spa_for_eng:S0440L02B02 | 896 | "while still here" / "mientras todavía aquí" | ungrammatical in both |
| spa_for_eng:S0467L01B02 | 954 | "next to here" / "al lado de aquí" | non-idiomatic in both |
| spa_for_eng:S0499L03U04 | 1036 | "open the door now" / "abrir la puerta ahora" | Spanish is an infinitive, not the imperative the English asks for |
| spa_for_eng:S0499L04U03 | 1037 | "close the window now" / "cerrar la ventana ahora" | same |
| spa_for_eng:S0503L02U02 | 1049 | "making trouble here" / "causar problemas aquí" | bare gerund fragment as a USE row |
| spa_for_eng:S0521L01B04 | 1099 | "I'm afraid that here" / "me temo que aquí" | subordinator + adverb, no clause |
| spa_for_eng:S0521L02B04 | 1100 | "you'll forget why before" | incoherent |
| spa_for_eng:S0525L01B04 | 1109 | "to check if before" / "para comprobar si antes" | ungrammatical |
| spa_for_eng:S0526L01B03 | 1111 | "I'm finding it hard to believe here" | ungrammatical |
| spa_for_eng:S0535L01B03 | 1131 | "he made a promise that here" | ungrammatical |
| spa_for_eng:S0536L01B03 | 1134 | "I used to think that here" | ungrammatical |
| spa_for_eng:S0538L01B04 | 1138 | "I don't want to seem before" | incoherent |
| spa_for_eng:S0540L01B03 | 1141 | "I don't mind if here" / "no me importa si aquí" | ungrammatical |
| spa_for_eng:S0661L01B03 | 1332 | "you're all doing very well" / "estáis haciendo muy bien" | Spanish needs *lo* — "lo estáis haciendo muy bien" |

**11 more are borderline** — vacuous tails that drill nothing, but not linguistically wrong, so under my stated criterion they survive: `S0321L01B01` (689), `S0324L03B02` (695), `S0417L02B03` (857), `S0434L01B02` (886), `S0449L02B02` (914), `S0496L04B03` (1028), `S0512L03B04` (1078), `S0514L02U02` (1085), `S0533L02B03` (1128), `S0535L02U02` (1132), `S0635L01B02` (1304).

So the false-negative count is **18 firm, up to 29 (28.4%) if the borderline tier is included**.

The band breakdown is the important part:

| Band | plausible rows | clear defects | rate |
|---|---|---|---|
| < 1050 | 76 | 6 | 7.9% |
| 1050–1199 | 16 | **11** | **68.8%** |
| ≥ 1200 | 10 | 1 | 10.0% |

**Inside the hot band, being the only such phrase in a round says nothing about innocence — 11 of those 16 rows are real defects.**

---

## 3. The 16 LEGITIMATE calls

**All 16 sparings were correct.** Every one is a natural, correctly-translated build fragment (or, for the two USE rows, a natural complete sentence) whose tail is genuinely reused by the round's USE phrases:

`S0042L02B02` · `S0042L02B03` (121) · `S0175L01B04` (418) · `S0183L02B03` (435) · `S0257L02B03` (580) · `S0285L01B04` · `S0285L01B05` (621) · `S0309L02B02` (667) · `S0411L02B03` (842) · `S0453L02B04` (921) · `S0454L02B02` (923) · `S0513L01B03` (1079) · `S0518L01B04` (1092) · `S0537L01U04` (1137) · `S0543L01U03` (1147) · `S0562L02B04` (1179)

The two USE rows (`S0537L01U04` "but I was wrong about everything", `S0543L01U03` "she was right about everything") are correctly spared for a specific reason: in both rounds the build ladder is "…about the film / the number / the problem / the game", so "about everything" is the same taught complement, not a stock tag. Their siblings ("but I was wrong here / before / yesterday") are the genuine defects.

The problem with the LEGITIMATE set is not its 16 members but its **size**. The adjudicator spared 16 of 383 rows (4.2%) when the true innocent share is ~30%. It applied the "build fragments are legitimate scaffolding" reasoning correctly when it applied it at all — and then failed to apply it to ~111 near-identical rows.

### ⚠️ Gap: 8 rows were never adjudicated

`machine_verdict: GATE_FAILED` — never given a verdict by anything, and not covered by the campaign in either direction. My read: 3 are real defects (`S0520L02U02`, `S0520L02U05` at R1098, `S0553L01U01` "small here" at R1162 — Deborah's own example), 5 are fine (`S0175L01B03`, `S0255L02U03/U04/U07`, `S0280L01U04`). They need a rerun.

---

## Is the CONFIRMED/PLAUSIBLE split criterion sound?

No — the split is measuring the wrong thing and should be replaced. "2+ vacuous-tailed phrases in the same round" is a proxy for *round-level generation collapse*, and it works only because rounds 1050–1199 were built by a generator that emitted whole rounds of LEGO+tag filler; there, density and defectiveness happen to coincide. Below round 1050 the same density signal fires on rounds that are simply *tiled well* — a build ladder walking a LEGO through "today / now / here" toward richer USE sentences produces 2+ hits by design, which is why 93% of the sub-1050 CONFIRMED set is innocent. And the criterion is symmetrically wrong in the other direction: inside the hot band a lone hit is 69% likely to be a real defect, so "PLAUSIBLE" spared 11 rows that should have been fixed. Density is not evidence about any individual row. The gate should instead be **per-row and role-aware**: a USE row that is a bare LEGO + stock tail is a defect almost regardless of neighbours; a BUILD row is a defect only when it is ungrammatical, mistranslated, or its tail appears nowhere else in the round. Round-level density is still useful — but as a *triage ordering* for which rounds to look at first, never as the accept/reject decision. Practical consequence: rerun adjudication under the per-row rule, and treat every existing DEFECT label below round 1050 as unproven.

---

## What I could not verify

- **Precision above round 1200** — no DEFECT rows exist there to sample (see §1). Rounds 1200–1339 have never been swept for this defect with the round-density gate producing anything; I did not sweep them independently either.
- **Whether the detector's ADJ vocabulary list is complete.** It hardcodes 30 tails. Defective rows whose padding uses a word outside that list were never candidates in the first place, and I did not measure that miss rate.
- **Deborah's own judgements.** I never saw them. I calibrated against the defect *description* in the brief and against the SSi method rails, not against her actual annotations. If her standard is stricter than mine — e.g. if she considers "I'd like to read my book tomorrow" defective because the round is monotonous — my false-positive rate is an overestimate.
- **Inter-rater agreement.** I intended to run two independent cross-checkers over the same rows to put a second opinion behind the 30% figure. The dispatch was refused by the fan-out depth ceiling (this session is already at maximum worker depth), so **every judgement in this document is a single rater's — mine — with no independent confirmation.** The band *contrast* (93% vs 12.5%) is large enough that it will survive reasonable disagreement; the exact rate will not.

## Incidental findings (outside the padding defect, not counted anywhere above)

- **R896 (`while still`) is broken end to end** — the LEGO "while still" / "mientras todavía" is not a usable unit, and all six USE rows are truncated ("I want to do it while still").
- **R1097** LEGO Spanish "podría haberle pasado" carries a stray *le* ("it might have happened **to him/her**") across the whole round.
- **R1149** LEGO pairs known "it would be difficult" with target "**que** sería difícil" — an unlicensed subordinator, propagated to every row.
- **R239 `S0106L02B04`** maps "this evening" → "esta tarde", where the rest of the course uses "esta noche".
- **Duplicate rows** are common in the hot band: R1099/R1100/R1109/R1134/R1141 each have B01 and B02 identical; R1092 has B04 identical to U01.
