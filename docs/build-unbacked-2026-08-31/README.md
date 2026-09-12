# Unbacked target words in BUILD phrases — estate sweep, 2026-08-31

**The defect class** (Tom's ruling, from the hand-fix of `spa_for_eng:S0403L03B02`):
a word in the target text that the known-side prompt never asked for and the
phrase's own tiling does not back. Known: "stay quiet". Target: "quedarnos
callados **aquí**". The known prompt is authoritative and is never rewritten;
the target is what gets corrected.

## The numbers

| | |
|---|---|
| BUILD phrases swept | **293,974** across **114 courses** |
| Mechanical candidates | 4,056 (5 courses too small for a reliable lexicon, skipped and named below) |
| Read individually by a judging reader, no sampling | **3,895** |
| DEFECT | **336** |
| AMBIGUOUS — logged, no action | **171** |
| REJECT — detector noise | **3,388** |
| Confirmed by an adversarial verifier | **321** |
| Overturned by the verifier | **15** |
| **Rows repaired** | **327** (321 estate + 5 BUILD + 1 USE in spa_for_eng) |

Clear defects to ambiguous ran about 2:1. Not Spanish-specific: 48 courses
carry the class, and Spanish is one of the lighter ones.

## What the defect actually is

Not diffuse quality drift — **sibling contamination in bursts**, one filler word
leaked across a range of seeds by a batch event. The signature is that deleting
the surplus lands the row on a byte-identical match to an unflagged sibling,
usually the bare parent LEGO. All four verifiers converged on that test
independently.

| course | leaked content | span |
|---|---|---|
| kor_for_eng | `작은 교회가` ("a small church") | **24 rows, seeds 589–635** |
| por_br_for_eng | `já` ("already") | ~22 rows, seeds 258–296 |
| ara_lb_for_eng | `بشوي` ("a little"), `بكرا` ("tomorrow") | 15 rows S0106–S0113, 4 rows S0196–S0210 |
| srp_for_eng | `sada` ("now") | 14 unrelated seeds |
| eus_for_eng | `gero` ("later") | 14 rows |
| fas_for_eng | `ولی` ("but") | 14 rows, on fragment-tagged BUILDs |
| lav_for_eng | `kopā` ("together") | 8 rows |
| fra_for_eng | `là` ("there") | ~11 rows |
| gla_for_eng | `a-nis`/`an-diugh`/`roimhe`/`a-màireach` | 10 rows — a fixed BUILD-slot rotation |
| swa_for_eng | `sasa` ("now"), `tu` ("only") | 6 rows |
| ita_for_eng | `adesso` ("now") | 5 rows |

Scottish Gaelic is the clearest proof of mechanism: in each seed, BUILD slot 1
is the clean base form and slots 2–4 are a fixed rotation of time adverbs
stamped on regardless of the English.

Six of the defects are larger than a filler word — fabricated verbal content
(Hindi `इसका अनुमान लगाऊँ`, `की कोशिश`; Swiss German `z versueche`; Korean
`에 대해`; Bulgarian `хора`). Those needed the verifier's remnant test, not just
deletion arithmetic.

## The repair rule

**Deletion only.** A rewrite could import vocabulary the learner has not been
taught at that seed, which is a worse defect than the one being fixed. Any row
whose honest repair was a rewrite, a re-inflection, a reorder or an addition was
logged as AMBIGUOUS and left alone. `tools/course-optimization/fix-unbacked-target-words.cjs`
enforces this: it recomputes `corrected_target` from `target` minus
`surplus_span` and refuses anything that does not match character for character.

Gates, all fail-closed: dry run by default; per-row before-state assertion
(abort on drift); deletion-reachability; production-direction ZUT over
LEGO/BUILD/USE rows. Every row logged whether applied or not.

**ZUT:** 0 edits forked a known prompt. **30 edits resolved a pre-existing ZUT
fork** — the leaked word had been causing a same-known/two-targets split.
10 rows sit inside a pre-existing fork this edit neither worsened nor fixed.

## Audio — the pattern holds, and here is why

**189 of 321 relinked automatically; 132 went silent.** Sampled 40 of the 377
relinked clips and decoded the deployed S3 bytes with whisper: **40/40 say the
corrected text**, mean CER 0.074, zero failures. In spa_for_eng all 10 relinked
clips were decoded, CER 0.

The mechanism: this repair is a *deletion*, so the corrected target lands on
wording a sibling row already uses, and that wording already has clips. Contrast
the 2026-08-26 USE sweep, where only 4 of 58 relinked — those repairs were
rewrites into novel text. **Deletion-only repair is why the audio is usually
already there.**

**No TTS was generated.** Audio-pass requests are queued for all 40 courses
carrying silent rows; per-row list in `silent-rows.json`.

## Detector — and its measured limits

`tools/qa/build-unbacked/detect-unbacked.cjs`. The existing
`tools/qa/known-target-mismatch/detect-mismatch.cjs` returns on `kt.length < 4`,
so it has never been able to see a BUILD phrase — that is why this population
was untouched. The new detector runs the reverse direction (target content with
no known counterpart) over a Dice co-occurrence lexicon built from the course's
own corpus, gated on the parent LEGO surface and on a **symmetry test**: if a
known content word is *also* unrendered, the two are usually each other's
rendering under a lexicon the corpus aligned differently.

Measured, not asserted:

- **False negatives on BUILD**: 60 randomly sampled cleared rows read individually
  → 0 clear defects, 1 borderline idiom. It clears well.
- **Precision**: ~8.6% of candidates survived to a confirmed fix. It is a reading
  list, never a fix list.
- **Recall on long USE rows: 3 of 12** labelled DEFECT-ADDED rows. The symmetry
  test that buys precision on short prompts costs recall wherever a row carries a
  surplus *and* a substitution at once — rare on BUILD, normal on long USE
  sentences. **This detector is scoped to BUILD for that reason.**
- **Blind to morphology it wasn't trained on.** Welsh initial-consonant mutation
  (805 candidates across three courses, **0 defects**), Austrian German dialect
  spelling (112, 0), Finnish agglutination, Basque ergative case, Bengali
  pro-drop, Korean obligatory head nouns, Breton VSO fronting, Irish and Greek
  auxiliaries. That is most of the 3,388 rejections in one diagnosis.
- Turkish agglutinative suffixes fold into terse English glosses and read as
  unbacked — two of the fifteen overturns. The discriminator: a genuine leak is
  **inconsistent with its siblings**; a real LEGO rendering is **consistent
  across all of them**.

Courses skipped for having too few pairs for a reliable lexicon (<200):
reported per-course in the sweep log; they carry no verdict either way and are
an explicit gap, not a clean bill.

## The 12 known USE instances from the 2026-08-26 sweep

All 12 confirmed still live. Verdicts in `spa-use-12-verdicts.json`.

- **1 fixed**: `S0370L01U05`, deleted `allí`. Relinked, whisper-verified, CER 0.
- **1 is not this class**: `S0557L02U01` — `música` sits *inside* the parent LEGO
  `no pusieran música`, so the tiling backs it. The gap is on that M-LEGO's known
  gloss, which is authoritative and not ours to rewrite.
- **10 are substitutions, not surplus words.** Deleting the flagged span leaves
  ungrammatical Spanish, and the correct rendering needs vocabulary untaught at
  that seed (`diciendo` s174 for an s58 row; `apreciar` s419 for an s245 row).
  Forcing them would import untaught vocabulary. **Left unfixed, with reasons.**

## What the verifier overturned — 15 rows, and why it mattered

Two classes, both of which would have damaged correct content:

1. **The word is the seed's own LEGO rendering**, consistent across every sibling,
   and the terse English gloss simply doesn't spell it out (Turkish ×2, French
   `encore`, Egyptian Arabic `أو لأ` ×2).
2. **The remnant doesn't stand.** Lithuanian `pasakei ką` needs the pronoun
   fronted; Korean `이 보여요` strands an adnominal-only determiner; Korean
   `실수라고` carries the quotative the embedded clause requires; Punjabi rows
   where deletion also drops content the known side does ask for.

One deserves naming: `fra_for_eng:S0405L04B02`. Every "oui X" BUILD row in seeds
396–405 pairs with a known gloss saying "yes X". This row is the lone exception,
so the **English is missing its "yes"** — the target is not surplus. Under the
rule that the known side is authoritative and untouchable, the correct action is
no action. Logged, not repaired.

## Out of scope, found anyway — corrupted known fields

Eight rows across four courses where the *known* side is broken, so there is
nothing authoritative to judge against:

- `lav_for_eng:S0245L02B03`, `S0203L01B02` — known duplicates the Latvian target
- `swe_for_eng` ×2 — known contains Swedish where English should be
- `cym_n_for_eng` seeds 301–303, 4 rows — one English sentence stuck across BUILD
  rows with unrelated targets

Separate defect class. Logged, untouched, **not swept** — flagging rather than
widening scope.

## Files

- `all-verdicts.json` — every one of the 3,895 judged rows
- `confirmed.json` / `overturned.json` — the 321 applied and the 15 refused
- `estate-dryrun-log.json` / `estate-applied-log.json` — per-row, with ZUT verdict and audio outcome
- `estate-audio-verify.json` / `spa-audio-verify.json` — whisper decodes of deployed bytes
- `silent-rows.json` — the 132 rows now needing audio
- `spa-*` — the spa_for_eng BUILD and USE passes

---

# SECOND PASS — the recall gap, and 242 more rows

**The first pass missed a whole cluster and I found it by inspection, not by the
detector.** After applying the 321, spot-checking `kor_for_eng` for the leaked
phrase `작은 교회가` turned up **19 further rows still carrying it** — 16 of them
genuine defects the Dice detector never flagged. Its symmetry test suppresses
exactly this shape: when a row carries a surplus word *and* has other known
content unrendered, the penalty cancels the signal.

## A better instrument, once a leak is known

Once a leak is confirmed, its **exact string** beats any lexicon. The second pass
is lexicon-free:

1. For every confirmed leak span, find every BUILD row in that course containing
   it — **3,250 rows**.
2. Keep only those where **deleting the span lands on a byte-identical sibling**
   (the parent LEGO or another row in the same seed) — **1,536**. This is the test
   all four verifiers converged on independently.
3. Clear the ones whose known side genuinely asks for the span, by a
   **counterpart pattern authored once per cluster** — `hoje`→"today",
   `agora`→"now", `hier`→"here", and for the eng_for_* courses the same trick in
   the other script (`오늘`, `지금`, `아직`, `곧`, `ਇੱਥੇ`). This cleared **1,265**,
   which is the honest measure of how badly pure containment over-reports.
4. **250 survived. I read every one and ruled: 244 DEFECT, 6 OVERTURNED.**
   242 applied; 2 refused by the ZUT gate.

The counterpart step is the whole trick: **one semantic decision per cluster
instead of 1,536 per-row reads.**

## The leak contaminated BOTH sides

**21 `gla_for_eng` rows carry the Gaelic word `roimhe` inside their ENGLISH known
text** — "yes of course roimhe", "I'll ask him if he's able to help roimhe",
"what would you do roimhe". The batch event wrote the stray word into the prompt
as well as the answer, across seeds 172–203.

These are **not repaired**. The known side is authoritative and never rewritten,
and where it is corrupt there is nothing authoritative left to judge the target
against. Listed in `p2-known_echo.json`. This is the same class as the eight
corrupted-known rows found in pass one, and it is now nine courses' worth of
evidence that a known-side sweep is its own job.

## Second-pass results

| | |
|---|---|
| Rows carrying a confirmed leak span | 3,250 |
| Deleting the span lands on a byte-identical sibling | 1,536 |
| Cleared — the known side does ask for it | 1,265 |
| Read individually by me | **250** |
| Applied | **242** |
| Overturned | 6 |
| Refused by the ZUT gate | 2 |

By course: gla 74, eng_for_kor 43, mlt 20, lav 17, kor_for_eng 16, ita 14,
ara_lb 12, srp 7, fas 7, eng_for_pan 7, swa 7, fra 6, cat 4, por_br 2, por 2,
rus 2, eus 2.

**Audio: 147 relinked, 95 silent.** Sampled 30 relinked clips and decoded the
deployed bytes: **30/30 correct**. Audio passes queued for gla_for_eng (74),
mlt_for_eng (20) and lav_for_eng (1). No TTS generated.

## The six overturns

- `fra_for_eng:S0390L01B02` — `celle-là` is one word; deletion leaves `celle-`.
- `fra_for_eng:S0388L02B03` — `cette personne-là` *is* "that person"; `là` renders "that".
- `ara_lb_for_eng:S0513L01B02` — known "it hurts me most"; `أكتر` renders "most".
- `lav_for_eng:S0235L01B03` — remnant `kas teica, ka` strands a dangling conjunction.
- `por_for_eng:S0120L02B04` — known says "there"; `aqui` is a mistranslation, so the fix is a substitution.
- `eng_for_pan:S0485L02B03` — the Punjabi known says `ਇੱਥੋਂ` ("from here"); the span is backed.

## The two the ZUT gate refused

`gla_for_eng:S0283L01B04` and `S0283L02B04` share the known "which of your
friends speaks Gaelic?" and currently share an identical target. Fixing either
one alone forks that prompt into two targets, so the gate refuses both. They need
a paired edit the tool deliberately does not do. **Left as they are, named here.**

## Running total

**569 rows repaired** — 6 in spa_for_eng, 321 in the first estate pass, 242 in
the second. Across **49 courses**.

## What I would do differently, stated for the next run

The lexicon detector was the wrong primary instrument and the cluster/counterpart
method is the right one. **Find leaks with a small high-precision sample, then
expand each confirmed leak by exact string and clear it with one counterpart
decision per cluster.** That found 242 rows the detector could not see, at a
fraction of the reading cost, and it needs no lexicon, so it ports to any pair.

---

## Correction — one row reverted, 2026-09-01

`eng_for_pan:S0220L01B02` was applied in the second pass **against a ruling the
verifier had already made in the first.** Verifier 4 overturned it on test 3: the
Punjabi known `ਟੀਵੀ ਦੇਖਣਾ` means *watching* television, and the remnant
"television" drops the verb, so the row still does not say what the known says.
The pass-two mechanical filter had no way to see that ruling and re-convicted it.

**Reverted to "television here".** The audio relinked to its original clips and
both were whisper-verified on the deployed bytes, CER 0. Logged as a judgement
item — both states are defective, and the honest repair is not a deletion.

It was the **only** collision: of 242 pass-two applications, one contradicted a
pass-one overturn and zero rows were edited twice. The lesson for any future
combined pass: **a mechanical second pass must be diffed against the first pass's
overturns before it is applied**, not after.

**Final total: 568 rows repaired across 49 courses.**
