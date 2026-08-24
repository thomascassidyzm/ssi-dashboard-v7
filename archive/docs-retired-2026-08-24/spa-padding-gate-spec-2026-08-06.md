# Adverbial-padding gate — implementable spec

**Date:** 2026-08-06 · **Status:** SPEC ONLY, nothing implemented, nothing committed
**Scope:** `services/course-builder` submit path. Read-only investigation; all code facts below were verified by reading the files and by executing the existing validators against real `spa_for_eng` rows.

---

## 0. The defect, restated precisely

A practice phrase whose entire content is `<round LEGO> + <stock adverbial>`, with no other new or recombined material:

```
S0522L02U02  it was stupid here          fue estúpido aquí
S0522L02U03  it was stupid before        fue estúpido antes
S0522L02U04  it was stupid yesterday     fue estúpido ayer
S0522L02U05  it was stupid at the end    fue estúpido al final
```

That is 4 of the 5 USE rows for round 1103. The learner is drilled on one sentence four times and learns nothing about how `fue estúpido` combines with the course's prior material.

**Measured in `spa_for_eng` (my own query, this session):** 14,916 non-deprecated `build`+`use` rows. 491 rows are `known_text == lego.known_text + " " + <stock tail>`; 389 of them (101 build / 288 use) sit in a round with ≥2 such rows and ≥2 distinct tails, across 128 of 1,339 rounds. The brief's figure of 394 (291 use / 103 build) is within noise of this — the difference is tail-list wording and the intervening repair campaigns, not a disagreement.

The role split is the point: **74% of the confirmed rows are `use`**, and the only anti-template gate in the submit path never looks at `use`.

---

## 1. Where the gate is, what it actually does, and where USE coverage goes

### 1.1 Current control flow (verified by reading)

`services/course-builder/routes/seed-complete.cjs`, route `POST /seed/complete` (declared line 890).

- **Line 1215–1300** — the per-LEGO loop that accumulates vocabulary in introduction order.
- **Line 1221:**
  ```js
  if (!isDuplicate && !SKIP_VALIDATION && usesBuildUseFormat(lego)) {
    const priorVocab = new Set(vocabSet);
    const gate = checkBuildRecombination(lego, course_code, seed_number, priorVocab);
    if (!gate.valid) buildGateFailures.push({ lego, legoId, gate, priorVocab });
  }
  ```
  `priorVocab` is snapshotted *before* this LEGO's own vocab is added — correct, and the new gate must preserve that ordering if it wants the same vocabulary view.
- **`checkBuildRecombination`** (`services/course-builder/lib/validation.cjs:968`) iterates **`lego.build` only** (line 970: `const build = lego.build || []`). `lego.use` is read at line 973 solely to build `useStemNorms`, i.e. USE rows are used as *evidence against BUILD* and are themselves never judged.
- **Line 1288–1387** — 3-strike escalation: a failing BUILD basket is re-rolled, and on the third consecutive strike the server regenerates just that basket via Opus (`escalateBuildPhrases`), re-validates through the same gate + vocab check, and proceeds silently on success. Only if escalation fails does `errors.push({type:'build_template'})` fire (line 1375).
- **Line 1694** — `if (errors.length > 0)` → HTTP 400, **nothing is inserted**, whole seed rejected.

### 1.2 Three holes, not one

1. **Role**: `checkBuildRecombination` reads `lego.build` only. USE is unwatched. (Confirmed by code read.)
2. **Shape**: the filler-tag classifier requires a comma (§2.1).
3. **Format and route**: the gate is behind `usesBuildUseFormat(lego)` (`phrase-structure.cjs:99` — true only if `build[]` or `use[]` is an array), so a legacy `lego.phrases[]` submission skips it entirely. And `checkBuildRecombination` is referenced *only* from `seed-complete.cjs:1223` and `:1340` — `POST /lego` (line 399) and `POST /batch` (line 694) never call it at all. A course assembled lego-by-lego through `/lego` has never seen this gate. Hole 3 is out of scope for the fix below but should be recorded.

### 1.3 Where to put the new check

**Do not widen `checkBuildRecombination`.** It is a *recombination floor* keyed to BUILD's ramp (`minBuild`, `required = min(2, minBuild)` at `validation.cjs:983–986`), it is exercised by `build-recombination.test.cjs`, it is re-run inside the escalation loop at line 1340, and it is imported by `tools/course-optimization/regenerate-stamped-builds.cjs`. Bolting a USE rule onto it changes the meaning of `gate.valid` for all four callers.

**Add a new pure function** in `services/course-builder/lib/validation.cjs`:

```js
function checkBasketPadding(lego, courseCode, opts) -> { flags: [ ... ] }
```

- **Input**: the lego (`{known, target, build[], use[], phrases[]}`), the course code, and `opts.knownLang` / `opts.contract` (for the tail lexicon, §2.3).
- **Judges each role basket separately**: `build[]`, `use[]`, and — for legacy submissions — `phrases[]` as a single basket. Not the concatenation: the density signal is per-role (§2.4), and concatenating is exactly the bug that neuters `checkBasketFrameCoverage` (§1.4).
- **Export** it alongthe others at `validation.cjs:1029–1045`.

**Call site**: a new section `3a-PAD` in `seed-complete.cjs`, placed **after** the BUILD escalation block ends (line 1387) and **before** `3a-FRAME` (line 1460). Two reasons: (a) it must see the *post-escalation* `lego.build`, so Opus replacements are judged too; (b) the frame-coverage loop at 1460–1472 is the right structural sibling — same iteration shape, same `duplicateLegos` skip, so the new block can be a near copy:

```js
// 3a-PAD. ADVERBIAL PADDING (see docs/spa-padding-gate-spec-2026-08-06.md)
for (const lego of legos) {
  const legoId = `${seedId}L${String(lego.idx).padStart(2, '0')}`;
  if (duplicateLegos.some(d => d.lego_id === legoId)) continue;
  const { flags } = checkBasketPadding(lego, course_code, { knownLang, contract: loadPairContract(course_code) });
  for (const f of flags) { /* warn or error per §3 */ }
}
```

`knownLang` and `loadPairContract` are already in scope at that point in the handler (used by the `3a-KNOWN` block at 1477–1481).

`SKIP_VALIDATION` (`seed_number <= 3` only, line 939) should suppress it, consistent with every other content gate.

### 1.4 Why `checkBasketFrameCoverage` cannot be repaired into this role

`validation.cjs:717`. Two independent defeats, both verified by running it:

```
$ node -e "checkBasketFrameCoverage([...build, ...use], 'fue estúpido')"
R1103 lego="fue estúpido"  frameCoverage: []
R1097 lego="podría haberle pasado"  frameCoverage: []
R426  lego="me gustaría leer mi libro"  frameCoverage: []
```

Zero warnings on the three worst baskets in the course, with or without `role:'use'` tags.

- **Defeat 1 — signature granularity.** `phraseFrameSignature` (line 692) slots the LEGO out to `◇` and keeps the residue verbatim, so the four padded rows yield `◇·aquí`, `◇·antes`, `◇·ayer`, `◇·al·final` — four distinct signatures, each with count 1. `repeated_frame` needs `count >= 3` on one signature; `low_frame_diversity` computes `sigTargets.size / distinctTotal` = 4/4 = **1.00** against a `< 0.6` threshold. Varying the adverbial *increases* the diversity score. Exactly as the brief states.
- **Defeat 2 — role filter.** Line 718: `const r = p.role || p.phrase_role; return !r || r === 'use'`. Submit-path payload phrases carry **no** role field — role is derived at insert time from which array the phrase came from (`computePhraseRole` / `generateBuildupPhrases`, `phrase-structure.cjs:243–293`). So at line 1468, where the caller passes `[...build, ...use]`, every BUILD row is silently counted as USE. Any density metric computed there is computed over the wrong denominator.

The new gate must therefore split by array membership itself, and must collapse the residue to a placeholder rather than keeping it verbatim.

---

## 2. The detection rule

### 2.1 What the current shape test does, and why the comma has to go

`validation.cjs:928`:
```js
const FILLER_TAG_RE = /,\s*¿?[^,]{1,18}$/;
```
`classifyBuildPhrase` (line 940) only reaches the `comma-tag` / `use-stem+tag` verdicts *inside* `if (FILLER_TAG_RE.test(...))`. Demonstrated:

```
classifyBuildPhrase('fue estúpido aquí',  'fue estúpido')  → { cls: 'ok' }
classifyBuildPhrase('fue estúpido, aquí', 'fue estúpido')  → { cls: 'comma-tag' }
classifyBuildPhrase('me gustaría leer mi libro esta tarde', 'me gustaría leer mi libro') → { cls: 'ok' }
```

One comma is the entire difference between rejected and shipped. The comma requirement must go — but note *why* it was there: it made the test nearly FP-free, because `", sí"` is unambiguously a tag. Remove it and the shape test alone becomes useless, which the next section quantifies.

### 2.2 A purely structural rule does not work — measured

Candidate: "phrase target = LEGO target + a ≤3-token suffix, ≥2 per basket with distinct suffixes", no lexicon at all. Run over `spa_for_eng`:

```
baskets 1339   flagged 529   (39.5%)
```

and the flags include:

```
R27  lego "puedo"           →  "Puedo hablar" / "Puedo recordar" / "Puedo explicar"
R347 lego "parece"          →  "Parece bien" / "Parece difícil" / "Parece interesante"
R885 lego "no pudieron"     →  "no pudieron descubrir porque" / "no pudieron visitarnos porque"
```

Those are correct, load-bearing phrases. A short LEGO plus a short suffix is the *normal* shape of good early material. **The rule cannot be lexicon-free.** It needs a closed class of semantically vacuous tails.

### 2.3 The proposed rule

**Per role basket** (`build[]`, `use[]`, or legacy `phrases[]`):

**Step 1 — candidate rows.** A row is a *padding candidate* if, after normalisation (lowercase, strip `¿¡?!.,;:'"“”`, collapse whitespace):

- `known_text` equals `lego.known_text` plus a contiguous **edge residue** (suffix, or prefix for LEGOs that are themselves adjuncts) and nothing else; **and**
- that residue, in full, is a member of the known-language **vacuous-tail lexicon**.

Judge on the **known side**, not the target side. The known side is a controlled language with a bounded vocabulary (methodology rail), the padding is authored there and translated mechanically, and one lexicon covers every `*_for_eng` course. Target-side judging would need a lexicon per target language — 74 of them.

**Step 2 — basket verdict.** Flag the basket when:

- candidates ≥ 2, **and**
- distinct residues ≥ 2 (two rows with the *same* tail are already caught as near-duplicates by other machinery, and single-tail repetition is a different defect), **and**
- **candidates ≥ 3 OR candidates ≥ 50% of that role basket.**

The density clause is the whole precision story. It is not cosmetic — §2.5 shows it is what separates the defect from legitimate material.

**Vacuous-tail lexicon.** ~30 entries for English, the list the audit already uses:

> here, there, over there, anywhere, everywhere · now, right now, today, tonight, tomorrow, yesterday, last night, this morning, this afternoon, this evening, before, after, soon, again, at the end · well, very well · a lot, everything, about everything, too, also · for me, for us, for everyone

**Home for the lexicon:** `docs/pair-contracts/`, as a `vacuousTails: [...]` key. `_default_eng.contract.cjs` already holds exactly this kind of known-side closed class (`freeGlue`, `npiTokens`, `negationWords`) and is loaded for every English-known course via `loadPairContract`'s `_for_eng` fallback (`validation.cjs:896–905`). Courses whose known language is not English get **no** lexicon and therefore **no** flags until someone writes one — the gate must degrade to a no-op, not to a guess.

> **Explicit gap.** I verified the lexicon against `spa_for_eng` only. The 73 other affected courses are asserted by the brief; I did not query them. `eng_for_*` courses (known side is Bengali, Hindi, Tamil, …) get zero coverage from this spec.

### 2.4 On "the signature is really 2+ phrases in one basket, not any single phrase"

Agreed, and the rule is built that way — but the honest version is more specific than "2+".

A single phrase ending in a vacuous tail is **normal and often good**:

```
R116 build  lego "I feel"        → "I feel well"          Me siento bien
R192 build  lego "I will be"     → "I will be here"       Estaré aquí
R184 build  lego "I have learned"→ "I have learned a lot"  He aprendido mucho
```

102 of the 491 shape-matching rows in `spa_for_eng` are basket singletons, and most read like the above. Those must never be flagged, which is why the unit of judgment is the basket.

But "2+ per basket" alone still over-fires, because two padded rows in a rich 8-row basket is waste, not defect:

```
R1079 lego "it hurts"  →  build: "it hurts here"; use: "it hurts a lot"
      (rest of the USE basket: "it hurts more than before", "when does it hurt most?",
       "it hurts here more than there", "why does it hurt here?")
R621  lego "she speaks" →  build: "She speaks a lot", "She speaks very well"
      (14 USE rows, all substantive recombinations)
```

Both are flagged by a bare 2+ rule and both are fine. The **density** clause drops both. This is also why I *rejected* the more elegant-looking refinement I tried — grouping tails by semantic axis (place / time / manner / quantity) and exempting single-axis baskets on the theory that `here` vs `over there` is a deliberate contrast. Measured: 16 baskets are single-axis with exactly 2 candidates, and **15 of the 16 are still the defect** (`"To be quiet now"` / `"To be quiet today"`, `"We talked last night"` / `"We talked yesterday"`). Axis-mixing is not a usable exemption; density is.

### 2.5 False-positive rate — measured, with the residue named

Four rules, over all 1,339 `spa_for_eng` rounds. Exemplars: **must-flag** = R1103, R1097, R426, R578; **must-not-flag** = R1079, R1031, R621.

| Rule | baskets flagged | rows caught | fires on R1079 | R1031 | R621 | catches R578 |
|---|---|---|---|---|---|---|
| A — any 2+, round-level (build+use merged) | 128 | 389 | **yes** | **yes** | **yes** | yes |
| B — **per role, 2+ AND (3+ OR ≥50%)** | **86** | **272** | no | no | no | **yes** |
| C — per role, 2+ AND ≥40% | 107 | 310 | no | **yes** | **yes** | yes |
| D — per role, 2+ AND ≥50% | 83 | 262 | no | no | no | **no** |

**Rule B is the recommendation.** It catches 272 of the 389 confirmed rows (70%), clears all three known-good baskets, and unlike D it still catches R578 (`when do you think you'll be ready to leave` × 4 tails), whose padded rows are only 25% of a 16-row USE basket but 40% of its BUILD basket — the `3+` disjunct is what saves it.

Honest accounting of what B costs:

- **Recall loss: 117 rows (30%).** These are the low-density residue — one or two padded rows in an otherwise healthy basket. They are the rows I would *not* want a gate to block anyway. If Kai wants them cleaned, that is a repair-campaign query, not a submit-time gate.
- **Residual FP risk: I estimate 3–6 of the 86 baskets (~4–7%), from eyeballing all 86.** This is my judgement, not a ratified ground truth — nobody has adjudicated these 86 against the methodology. Any FP number in this document, including this one, is an estimate from one reader.
- The FP-prone shape is a **short LEGO whose teaching point genuinely is the adjunct** — a locative or temporal contrast where `aquí`/`allí` is the material being exercised (`R1031 "he's standing here" / "he's standing over there"`, which B happens to clear at 2/5 but which a 40% threshold catches). If FPs surface in practice, the correct knob is **not** loosening the density threshold; it is exempting the case where the tail's target-side word is itself introduced by the current round or the immediately preceding one. That refinement is deliberately **not** in v1 — it needs `loadIntroducedLegoPairs` data and a round-window parameter, and it should be added only against observed FPs rather than anticipated ones.

---

## 3. Reject or warn

**Recommendation: WARN on first submission; REJECT only via the existing 3-strike escalation path — and only on the high-density core.**

Concretely, three tiers:

| Condition | Verdict |
|---|---|
| candidates ≥ 2, distinct ≥ 2, but density below the Rule-B bar | `warnings.push({type:'basket_padding'})` — surfaced, never blocks |
| Rule B satisfied (≥3 candidates, or ≥50% of the basket), strikes 1–2 | `errors.push({type:'basket_padding'})` → 400, re-roll, exactly like `build_template` |
| Rule B satisfied, strike 3 | Opus regenerates that basket, re-validate, proceed silently if clean |
| Rule B satisfied, ≥80% of the basket (e.g. 4 of 5 USE rows) | `errors.push` immediately, no warn tier |

**Why reject rather than warn-only.** A warn-only gate is what already exists and it is why 394 rows shipped. `checkBasketFrameCoverage` has been warn-only since it was written, with a comment at `seed-complete.cjs:551–553` explaining that its FPs made blocking unsafe; the result is a check nobody acts on. Warn-only here would be the same outcome with better wording.

**Why the cost of rejecting is lower than it looks.** The existing `build_template` gate already rejects, and the reason that is affordable is the machinery at lines 1288–1387: the rejection is consumed by the *builder agent*, which re-rolls, and after three strikes the server repairs the basket itself with Opus and proceeds. A false positive there costs one wasted generation cycle and some tokens — it does not park a human. **The new gate must be wired into that same `buildGateStrikes` / `escalateBuildPhrases` path, extended to regenerate a USE basket, or it must stay warn-only.** Rejecting without an escalation path is the one option that is genuinely too expensive: it can hard-stop a course build at seed 400 over an adjudication nobody has made.

`escalateBuildPhrases` currently takes `{lego, usePhrases, priorPairs, need, rejected}` and returns BUILD rows. Making it regenerate USE rows instead is a real change (different prompt, USE rows must be complete standalone sentences, and the result must re-pass containment + vocab + `checkBuildUsePhrases`'s `minUse` count). **I did not read `escalateBuildPhrases` itself** — it is imported into `seed-complete.cjs` from elsewhere. Scope it before committing to the reject tier.

**Also required if the reject tier ships:** the error payload must be actionable. Follow the `build_template` shape (line 1375–1385) — list the offending rows, name the tails, and inject the prior-vocabulary list, because the fix the agent needs to make is "recombine with introduced material", and it cannot do that without seeing what is introduced. `vocabInjectionFor` is already attached to every 400 (line 1709).

---

## 4. Should `minUse = 5` change?

`services/course-builder/lib/phrase-structure.cjs:105–124`. `minUse` is 0 at S1L1, 1 for seeds 1–3, and **5 from seed 4 onward, forever**. It is a hard floor: `checkBuildUsePhrases` returns `valid:false` → `errors.push({type:'build_use'})` at `seed-complete.cjs:1583` → 400.

### The evidence I have

Flag rate (Rule A, round level) bucketed by USE-basket size across all 1,339 `spa_for_eng` rounds:

| USE rows in basket | rounds | flagged | rate |
|---|---|---|---|
| 4 | 95 | 14 | 14.7% |
| **5** | **469** | **74** | **15.8%** |
| 6 | 219 | 9 | 4.1% |
| 7 | 90 | 5 | 5.6% |
| 8 | 141 | 8 | 5.7% |
| ≥9 | 248 | 17 | 6.9% |

Baskets sitting **exactly on the quota floor** are flagged at ~2.5–4× the rate of baskets that cleared it. And within flagged 5-row baskets, the mean number of padded USE rows is **2.74 of 5** — the majority of the basket. 74 of the 128 flagged rounds (58%) are `nu == 5`.

That is a strong, consistent signal in the direction the brief predicts: a hard quota met with thin prior vocabulary makes bolting on an adverbial the cheapest legal move.

### Why it does not settle the question

It is **correlational and confounded**. `nu == 5` is the *default* — it is what you get by doing the minimum, so it collects both "author hit the floor honestly" and "author padded to reach the floor". Basket size is also confounded with build epoch, builder model, and which agent session produced the round. **Nothing in this data distinguishes "the quota caused padding" from "the same low-effort sessions both padded and stopped at 5".**

### What would settle it

1. **The clean A/B, and the only real one:** ship the §2 gate first, warn-tier included, then take a cohort of seeds and generate them at `minUse = 5` vs `minUse = 3`, same course, same builder, same prior-vocabulary depth. Measure (a) padding-flag rate per basket, (b) *substantive* USE rows per basket — total minus flagged. If the 3-floor cohort yields the same or more substantive rows with fewer flags, the quota was the forcing function. If it just yields 3 rows and no more quality, the quota was load-bearing and the padding has another cause.
2. **Confound control on existing data:** partition flagged vs clean `nu == 5` baskets by build epoch (`created_at`) and by whichever builder-model signal is recoverable. If padding clusters by session rather than by basket size, the quota is not the driver.
3. **Prior-vocabulary depth as the real covariate.** The brief's causal claim is "five complete Use sentences with *thin prior vocabulary*". That is testable directly: compute introduced-vocab size at each round and check whether padding rate tracks vocab depth better than it tracks basket size. If it does, the fix is not `minUse` at all — it is a **vocab-aware ramp**, `minUse = f(introduced_vocab_size)`, low early and rising as recombination material accumulates.

### Recommendation

**Do not change `minUse` in the same change as the gate.** Two reasons: (a) lowering it is irreversible in practice — nothing back-fills the USE rows you stop requiring, and thin baskets are a worse learner outcome than padded ones; (b) with the gate in place, padding stops being a legal way to satisfy the quota, so the quota's true cost becomes *observable* — you will see honest `build_use` count failures where you currently see silent padding. That failure rate, over a few hundred seeds, is the cheapest evidence available, and it arrives for free. Read it, then decide.

A vocab-aware ramp is the most likely correct answer. It should be designed against evidence (3), not shipped on intuition.

---

## 5. Test plan

Fixtures are real `spa_for_eng` rows, IDs are `course_practice_phrases.id`. Re-query any of them with:
`node scripts/spa-padding/db.cjs "SELECT id, phrase_role, known_text, target_text FROM course_practice_phrases WHERE id LIKE 'spa_for_eng:S0522L02%' AND status <> 'deprecated' ORDER BY position"`

### 5.1 MUST FLAG (Rule B fires, error tier)

**T1 — R1103 / S522L2, lego `it was stupid` / `fue estúpido`. USE basket: 4 of 5 padded → error tier, no warn.**
```
S0522L02U01  let's agree that it was stupid        estemos de acuerdo en que fue estúpido   ← must NOT be a candidate
S0522L02U02  it was stupid here                    fue estúpido aquí                        ← candidate
S0522L02U03  it was stupid before                  fue estúpido antes                       ← candidate
S0522L02U04  it was stupid yesterday               fue estúpido ayer                        ← candidate
S0522L02U05  it was stupid at the end              fue estúpido al final                    ← candidate
```
Assert: 4 candidates, 4 distinct tails, density 4/5 = 0.80 → error, ≥80% tier. Assert `U01` is untouched.

**T2 — R1097 / S520L1, lego `it might have happened`. Both baskets flag independently.**
```
use:   U01 it might have happened here      · U02 ... before · U03 ... yesterday · U05 ... at the end   → 4/5
       U04 it might have happened a long time ago                                    ← NOT a candidate ("a long time ago" ∉ lexicon)
build: B03 it might have happened here      · B04 ... before                          → 2/4, plus
       B02 it might have happened a moment ago                                        ← NOT a candidate
```
Assert: USE flags at 4/5 (error). BUILD flags at 2/4 = 0.50 (error, density clause). Assert the two "ago" rows are not candidates — this pins the lexicon boundary and proves the rule is lexical, not "any short suffix".
Regression note: `checkBuildRecombination` currently returns `valid: true` on this LEGO's BUILD basket. That must not change — the new gate is the one that flags it.

**T3 — R426 / S180L1, lego `I'd like to read my book`. The `3+` disjunct in a large basket.**
```
use:   U02 ... today · U03 ... this afternoon · U04 ... tonight · U05 ... tomorrow     → 4 candidates of 8 = 0.50
       U01 ... for a while · U06 ... next week · U07 ... here for a while · U08 ... on Sunday morning  ← NOT candidates
build: B03 ... now · B04 ... here                                                     → 2/3 = 0.67
```
Assert: flags on both count (4 ≥ 3) and density. Assert `U07 "...my book here for a while"` is **not** a candidate — it contains `here` but the residue is not wholly in the lexicon. This is the single most important negative in the suite: it proves the rule matches the *whole* residue, not a substring.

**T4 — R578 / S255L2, lego `when do you think you'll be ready to leave`. The case that separates Rule B from Rule D.**
```
use:   U03 ... this evening · U04 ... tomorrow · U07 ... this afternoon · U08 ... soon  → 4 of 16 = 0.25
build: B05 ... this evening · B06 ... soon                                             → 2 of 5 = 0.40
```
Assert: USE flags on the **count** disjunct (4 ≥ 3) despite density 0.25 — a pure ≥50% rule misses this. BUILD lands in the **warn** tier (2 candidates, 0.40 density, below the bar). Assert the embedding rows (`I want to know when...`, `Can you tell me when...`, `Before you go, ...`) are never candidates.

**T5 — comma regression.** `it was stupid, here` and `it was stupid here` must both be candidates. The comma-ful form must **still** be caught by `classifyBuildPhrase`'s existing `comma-tag` class in BUILD; the two gates may double-report and that is acceptable. Currently `classifyBuildPhrase('fue estúpido aquí', 'fue estúpido')` returns `{cls:'ok'}` — the new gate is what changes that outcome, and `build-recombination.test.cjs`'s existing expectations must not move.

### 5.2 MUST NOT FLAG

**N1 — R1079 / S513L1, lego `it hurts` / `duele`. A healthy basket with one padded row.**
```
build: B02 it hurts more · B03 it hurts here                      → 1 candidate of 3
use:   U01 it hurts a lot                                          → 1 candidate of 5
       U02 it hurts more than before · U03 when does it hurt most? · U04 it hurts here more than there · U05 why does it hurt here?
```
Assert: **no flag at any tier** — 1 candidate per basket fails the `≥2` precondition. Note `U04` contains both `here` and `there` and must not be a candidate. This is the load-bearing negative for "the defect is basket-level, not phrase-level".

**N2 — R621 / S285L1, lego `she speaks` / `habla`. Two padded BUILD rows in a rich basket.**
```
build: B04 She speaks a lot · B05 She speaks very well            → 2 candidates of 5 = 0.40
       B03 She speaks Spanish · B06 She speaks Spanish all day     ← not candidates
use:   14 substantive rows, 0 candidates
```
Assert: **warn tier at most, never error.** 2 candidates, distinct tails, density 0.40 < 0.50, count < 3. This is the FP a naive 2+ rule produces and the case that justifies the density clause.

**N3 — R1031 / S498L1, lego `he's standing` / `está de pie`. Deliberate locative contrast.**
```
use:   U02 he's standing here · U03 he's standing over there       → 2 of 5 = 0.40
       U01 he's standing alone · U04 he's standing with me · U05 he's standing right there
```
Assert: **no error.** Warn is acceptable. Assert `U05 "right there"` is not a candidate (not in the lexicon — and if anyone adds it, this test turns into 3/5 and starts erroring, which is precisely the tripwire the lexicon needs).

**N4 — singleton adjuncts across the early course. All must be candidate-free at basket level.**
```
spa_for_eng:S…  R116 build  I feel well          Me siento bien
                R192 build  I will be here       Estaré aquí
                R184 build  I have learned a lot  He aprendido mucho
                R230 build  We are here          Estamos aquí
                R212 build  It will work well     Va a funcionar bien
```
Assert: each is a lone candidate in its basket → no flag. (These are the rows a gate must never block; they are correct early material.)

**N5 — the lexicon-free control, from §2.2. These must not be candidates at all.**
```
R27  Puedo hablar / Puedo recordar / Puedo explicar        (lego "puedo")
R347 Parece bien / Parece difícil / Parece interesante     (lego "parece")
R885 no pudieron descubrir porque / no pudieron visitarnos porque
```
Assert zero candidates. `Parece bien` is the sharp one: `well`/`bien` **is** in the vacuous lexicon, but the known side is `Seems okay`, whose residue `okay` is not — so it must not match. If an implementation judges the target side instead of the known side, this test fails and tells you why.

### 5.3 Course-level regression harness

Before merging, run the finished `checkBasketPadding` over all 1,339 `spa_for_eng` rounds offline and assert the aggregate against §2.5: **86 role-baskets, 272 rows, error tier** under Rule B. A number that drifts far from those means the implementation is not the rule that was measured. Then repeat on 2–3 of the other 73 affected courses **before** enabling the error tier — I have measured Spanish only, and a lexicon calibrated on one course is a lexicon calibrated on one course.

---

## 6. Things I could not verify

1. **`escalateBuildPhrases`** — I read every call site but not its implementation; it is imported into `seed-complete.cjs` from another module. The reject tier in §3 depends on it being extensible to USE baskets. Unscoped.
2. **The 73 other courses.** Every measurement here is `spa_for_eng`. The brief's cross-course claim is taken on trust; the tail lexicon's fitness elsewhere, and the whole question of non-English-known courses, are open.
3. **FP ground truth.** The ~4–7% residual FP estimate is my own reading of 86 baskets against the methodology docs. It has not been adjudicated by anyone who owns the method.
4. **Whether `warnings` are persisted.** They are returned in the HTTP response and logged; I did not trace whether the warn tier would leave any durable record for a later sweep. If it does not, the warn tier is advice that evaporates — worth checking before relying on it.
5. **`/lego` and `/batch`.** Confirmed by grep that neither calls `checkBuildRecombination`, so neither would call the new gate unless it is wired in separately. I did not audit how much content actually arrives through those routes.
