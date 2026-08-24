# scn_for_eng — decomposition build report

**2026-08-15 · Sicilian for English speakers · TEXT ONLY, NO AUDIO GENERATED**

---

## How far it got

| | Before tonight | After tonight | Remaining |
|---|---|---|---|
| Translated seeds | 668 | 668 | 0 |
| Seeds decomposed | **0** | **30** | **638** |
| LEGOs | **0** | **83** | — |
| Practice phrases | **0** | **697** (241 BUILD + 384 USE + 72 component) | — |
| Audio clips | 1 (pre-existing) | **1 — unchanged** | — |

**30 of 668 seeds (4.5%) are decomposed.** The course is *not* built. It is a quality-checked
opening block with everything downstream of decomposition in place for those 30 seeds, and a clean
runway from seed 31.

**No TTS was run. No audio was generated.** `course_audio` holds exactly the one clip it held
before this session. Kai's hard rule was observed without exception.

Shape: 2.77 LEGOs per seed, 23.2 practice phrases per seed, USE outnumbering BUILD 1.6 : 1.
Self-assessed USE scores average **7.65** (275 at 8, 92 at 7, 14 at 6, 5 at 5, none below 5).

---

## The tier flag in the brief — resolved, and the census was wrong

The brief flagged that "300-seed standard tier" was inferred rather than read. **It was inferred,
and it is wrong.** Measured directly:

- `course_seeds` holds **668 rows** for `scn_for_eng`, numbered 1–668 with no gaps, every one
  carrying a Sicilian `target_text`.
- `courses.seed_count` is **NULL**. The database does not say 300 anywhere.
- `GET /api/resume/scn_for_eng` nonetheless answers *"Translate all seeds to Sicilian. 300/300
  done"* and *"Seeds 301+ are ignored until seed_count is increased"* — because the resume
  endpoint **defaults to 300 when `seed_count` is NULL**.

So the "300-seed standard tier" reading is an artefact of that default, not a fact about the
course. **On the evidence this is a 668-seed flagship build**, and the resume endpoint will
under-report it to every future agent until `courses.seed_count` is set to 668. That is a
one-line fix somebody should make deliberately, so I have not made it.

Everything else in the census was correct: 0 LEGOs, 0 practice phrases, 1 pre-existing audio row.

---

## The slice defect — I ran the check on my own output. RESULT: ZERO.

The brief required this and required the numbers even if zero. Here they are, with the method,
because a clean result is only evidence if you can see how it was produced.

All 83 LEGOs and 697 phrases were read back **out of the database** (not from my authoring files)
and tested:

| Test | What it catches | Result |
|---|---|---|
| **Missing LEGO** | a word the seed sentence needs that no LEGO ever teaches | **0** of 30 seeds |
| **Non-nested overlap** | two LEGOs on the same words pointing at *different* parts of the sentence — the real slice defect | **0** |
| Benign nested overlap | deliberate layered teaching (one target a substring of the other) | 1 (S10, explained below) |
| **Orphan LEGO** | a LEGO whose target is not a span of its own seed | 1 (S6, explained below) |
| **ZUT contradiction** | same known text → two different targets; one must be wrong | **0** |
| Convergence | same target ← two different knowns (legal, but review) | **0** |
| **Rotation / order inversion** | candidate swapped counterparts within a seed | **0** |

**And a fidelity check of the machinery itself:** all 83 LEGOs were byte-compared, submitted
versus stored — known side, target side and every component. **83 of 83 identical, 0 altered,
0 missing.** That independently reproduces the Neapolitan build's finding on a second language
pair: the shared machinery is not corrupting what it is given.

### Two calibration corrections I had to make before believing any of it

I am reporting these because my first two runs produced **confident nonsense**, and a checker
nobody has calibrated is worse than no checker:

1. **First run reported 20 "missing LEGOs".** All 20 were false. My detector looked only at the
   *current* seed's LEGOs, so every word carried forward from an earlier seed looked untaught —
   which is the entire point of a cumulative course. Fixed to accumulate; 20 → 0.
2. **My normaliser stripped apostrophes**, exactly the trap the Neapolitan build warned about. In
   Sicilian the apostrophe is a **letter**: `'n` (in) is not `n`, `'mparari` is not `mparari`,
   and `l'àutri` / `d'arricurdàrimi` are single tokens. Stripping it merges distinct words and
   manufactures false contradictions. Fixed to treat `'` as a letter and only normalise curly
   quotes *to* it.

I also adopted the Neapolitan build's discriminator for overlap: intentional layering has one
target as a literal **substring** of the other with the glosses nesting the same way; a real
defect has two rows overlapping with **neither** containing the other. Only the second is
reported as a candidate.

### The two flags that did fire, and why neither is a defect

- **S10 nested overlap** — `pozzu` ("I can") and `mi pozzu arricurdari` ("I can remember") both
  cover the word `pozzu`. This is the methodology's deliberate overlapping-LEGO pattern: the
  learner meets the small piece, then sees how the clitic `mi` climbs in front of it. Nesting is
  in the same direction on both sides, so it passes the discriminator.
- **S6 orphan** — the LEGO `arricurdàrimi` is not a literal span of the seed
  `staju circannu d'arricurdàrimi na palora`, because the seed **elides** `di` + `arricurdàrimi`
  into `d'arricurdàrimi`. That elision is real Sicilian and I taught it explicitly as a third
  LEGO (`staju circannu d'arricurdàrimi`) rather than papering over it. The flag is the detector
  correctly refusing to see through an apostrophe — which, per the correction above, is exactly
  what it should do.

### The honest limit of this result — please read this before trusting it

**The self-contradiction test only catches a pairing that contradicts ANOTHER pairing in the same
course.** It is structurally incapable of catching a pairing that is wrong *consistently
everywhere*, because nothing contradicts it. Every Sicilian phrase in this build is either copied
from the existing 668 or assembled from their pieces, so it is guaranteed *consistent with* those
translations — and consistency is not correctness.

**A clean self-check does not mean this content is verified correct.** Only a Sicilian speaker
closes that gap. That is what the questions list is for.

---

## The untaught-word rule

> *A practice phrase may only use LEGOs the learner has already been taught at that point.*

Checked **twice**. First as the build ran: `POST /api/seed/complete` rejects a violating seed
outright and inserts nothing — it did so **14 times**, and every rejection was fixed rather than
bypassed. Then **independently afterwards**: a separate script read all 83 LEGOs and all phrases
back out of the database, rebuilt the learner's vocabulary in strict seed-then-LEGO order, and
re-tiled every phrase from scratch.

**Result: 625 phrases checked, 0 violations.**

Three things worth knowing, learned the hard way:

- **The known side is policed too, and it does no stemming.** `coming`, `meeting`, `practising`,
  `starting`, `take` were all rejected as untaught even though `come back`, `to meet`,
  `to practise`, `to start`, `taking` were taught. Prompts were rewritten, never waved through.
- **`that` is not free glue.** Five phrases of the form "I like feeling *that* I can…" were
  rejected and rebuilt without it.
- **My own worst error class was forward reference** — using vocabulary a *later* seed
  introduces. It caused a 5-seed and then an 8-seed cascade. I built a pre-flight linter that
  seeds itself from the live database and walks the authored file in order; after that, seeds
  21–30 went in with the linter at zero problems.

**3 phrases of 628 submitted were not stored**, all at seed 1: one bare-LEGO repeat the
anti-template gate correctly dropped, and two USE rows identical to their own BUILD rows. No
material was lost — all three are still taught as BUILD.

---

## Orthography: is the existing translation internally consistent?

**Verdict: consistent enough to decompose against, and I did not normalise anything.**

Measured across all 668 seeds (worker **#678**, independently spot-checked by me):

- **The retroflex consonant `ḍḍ` is 100% consistent** — `iḍḍu`, `iḍḍa`, `chiḍḍu` are dotted in
  every one of 146 seeds, with **zero** counter-examples. The 9 plain-`dd` hits (`siddu`,
  `addumannari`) are a different consonant entirely.
- **The article system `lu`/`la`/`li` is 100% consistent** — 0 instances of elided `u`/`a`/`i`
  as articles.

Those are the two features most likely to break a decomposition, and both are clean at 668/668.

**Which authority?** #678 could reach Sicilian Wikipedia but **could not reach Cademia
Siciliana's actual orthography document** — an explicit gap. What it could see is that the two
authorities **disagree with each other**: Wikipedia predominantly uses `lu`/`la`/`li` (matching
the corpus), while Cademia's own homepage uses `u`/`i`. **Recommendation, for Kai to rule on:
adopt the corpus's own dominant-form norm**, which already agrees with the one authority we could
verify on both structural features. This is *not* the Neapolitan situation, where Wikipedia was a
clean single answer — here the reference authorities fork, so "follow Sicilian Wikipedia" is not
the safe default it was for Neapolitan.

**The inconsistency that does exist** is confined to ten high-frequency words, 32 of 668 seeds
(4.8%), each with a clear majority spelling. **One of them lands inside the built band:**

> **Seed 25 uses the minority spelling `aiutàrimi`** ("to help me") — the `ai-` form appears in 8
> seeds, the `aj-` form in 18. The course therefore currently teaches the minority spelling. I did
> **not** change it: normalising someone's translations without a speaker's ruling is not mine to
> do. It is question **G** in the speaker list, and if the answer is "use `ajut-`" the fix is one
> LEGO and its phrases.

I also found a pair **#678 missed**: `accuminzari` (11 seeds) vs `accuminciari` (3). Both of my
in-band seeds (23, 28) use the majority form, so there is no exposure — but it belongs on the
list for seeds 31+.

---

## Two things produced alongside the content

**1. A pair-contract** — `docs/pair-contracts/scn_for_eng.contract.cjs`. There was none for this
pair. It records the convergences found in the corpus (`pirchì` = why *and* because; `aju a` =
going to *and* have to; `lu sò` = his *and* her; `prestu` = quickly *and* soon), the bound English
units, which English machinery is licensed by which Sicilian carrier, and — most useful to the
next author — **the clitic-placement rule** (enclitic on a bare infinitive, proclitic before a
finite verb, climbing optional), each with the seed numbers that attest it. Marked
**`ratified: null`**: nobody here speaks Sicilian, so it runs advisory.

**2. A speaker-question list** —
`docs/a108/scn-for-eng-native-speaker-questions-2026-08-15.md`. Ten areas in plain English that a
Sicilian speaker with no technical knowledge can answer, four marked **BLOCKING** because the
course currently teaches a guess. The sharpest is **A: `lu sò nomu` is both "his name" and "her
name"** — seeds 20 and 21 are identical Sicilian for different English, and a learner is currently
told it means "his".

---

## Explicit gaps

1. **638 of 668 seeds are not decomposed.** The course is 4.5% built. Seeds 31 onward untouched.
2. **No Sicilian speaker has reviewed any of this.** The self-scores average 7.65 and are honest
   about the weak ones, but a self-score from a non-speaker is a statement about pedagogical
   shape, not about whether a Sicilian would say it. See the limit stated above.
3. **Worker #679 (ZUT risk map + verb paradigm sheet) FAILED** — it hit an account limit and
   exited 1 with no report. I re-dispatched it as **#704**; it had not returned by the time of
   writing. Its intended output — an exhaustive verb-paradigm sheet across all 668 seeds — would
   materially help whoever builds seeds 31+. **I did the subset I needed myself** (the modal and
   auxiliary paradigms are in the pair-contract, read directly from the corpus), so nothing in
   this build rests on the missing report, but the full sheet is genuinely absent.
4. **Cademia Siciliana's orthography document was unreachable.** The orthography recommendation
   therefore rests on Sicilian Wikipedia plus the corpus's internal norm only.
5. **The pair-contract is written but not live.** The running course-builder executes from a
   different checkout (`ssi-dashboard-v7-clean-prod`, on `main`), outside this session's
   workspace. The contract sat on the branch while the build ran and the known-side gate used the
   generic `_default_eng` fallback. Practical effect: the gate was **stricter**, not looser, so no
   bad content got through because of it. It activates when the branch reaches `main`.
6. **Seeds 1–3 used the API's sanctioned bootstrap bypass** (`SKIP_VALIDATION`, which the server
   itself caps at `seed_number <= 3`). Those three seeds have too little prior vocabulary to meet
   the minimum phrase counts. Their gates were therefore *not* enforced by the API — I
   hand-checked them instead, and they are included in every after-the-fact verification above.
7. **No QA checkpoint ran.** `/checkpoint-qa` has not been run against this content.

---

## Where the next agent picks up

Next seed is **31**. Everything needed is on the branch under `.a108-scn/`:

- `lint.cjs` — pre-flight linter; seeds itself from the live DB and catches forward references,
  containment failures, duplicates and untaught glosses **before** a round trip. Use it.
- `submit.cjs` — posts authored seeds to `/api/seed/complete`.
- `slice-check.cjs` — the slice-defect audit above, re-runnable on any course.
- `verify-untaught.cjs`, `verify-fidelity.cjs` — the two independent after-the-fact checks.

Before going much further, someone should settle speaker questions **A** (his/her) and **D**
(clitic placement) — A because seeds 20–21 already teach a guess, and D because whole classes of
sentence are being avoided until it is ruled on.
