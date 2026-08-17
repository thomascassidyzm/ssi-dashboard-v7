# cor_for_eng — Cornish decomposition, night of 2026-08-15

**Bottom line in numbers:** seeds 1–25 of 668 are decomposed and banked as text. **73 LEGOs** (25 atomic, 48 molecular), **642 practice phrases** (200 BUILD, 330 USE, 112 component). **Zero audio generated, zero TTS spend** — the one `course_audio` row on this course predates tonight (created 2026-07-27, the word "welcome"). The build is **25/300 of the stated target, 25/668 of the corpus that actually exists** — it is a bank of good content, not a finished course, and I say exactly where it stops below.

**Self-check for the estate slice-defect: 0 instances in my own output**, confirmed by an independent adversarial verifier (worker #707). Method and its honest limit are in §3.

**A correction to the first version of this report:** two of my checks were reporting a *false clean* because the join key I used was empty. I caught it only because the independent verifier reported six findings where I had reported zero, and I went looking for the discrepancy instead of assuming I was right. §3 now carries the real numbers. The conclusion did not change; my confidence in how I got there did.

---

## 1. What was actually there before I started (verified, not assumed)

I queried the live database before writing anything. The census brief was right on the shape and **wrong on the size**.

| Claim in the brief | What the database says |
|---|---|
| translated seeds exist | ✅ **668 seed rows, seed_number 1–668, every one has a non-empty Cornish translation. Zero empty targets.** |
| zero LEGOs | ✅ confirmed (0 before I started) |
| zero practice phrases | ✅ confirmed (0 before I started) |
| zero real seed audio | ✅ confirmed (1 unrelated pre-existing clip) |
| "300-seed standard-tier build" | ❌ **Not what the data says.** |

### The tier finding — this is a decision for Kai, and I have not made it

`courses.seed_count` for cor_for_eng is **NULL**. The builder API therefore falls back to a default and reports `seed_range: {target: 300}` with the note *"Seeds 301+ are ignored until seed_count is increased."* But there are **668 fully-translated seed rows**. Someone translated all 668. The 300 is an inferred default, not a recorded intention — exactly the honest gap the census flagged.

So the evidence points at a **flagship-scale (668) corpus** sitting behind a 300-seed gate. **I did not raise the gate** — changing a course's declared size is not a build-time fix. I built inside the existing 300 window. If Kai wants the full 668, `seed_count` needs setting and seeds 301–668 become in scope; if 300 is right, 368 translated seeds are dead weight and someone should know that.

---

## 2. Orthography — the revived-language question, answered with counts

Cornish has several competing spelling standards in circulation, so I had this audited independently (worker **#670**, read-only, no edits). Verdict, from 1,007 distinct tokens across 5,658 target tokens:

**The corpus is internally consistent on every letter-level diagnostic. Zero mixed-standard instances.** It reads as **SWF Main-form / Kernewek Kemmyn-compatible**.

| Diagnostic | Form found | Count | Counter-form | Count |
|---|---|---|---|---|
| voiceless w | `hw-` | 23 types, 100+ tokens | `wh-` | **0** |
| k/c before a,o,u | `k-` | 40+ types | `c-` | **0** |
| vowel-length doubling | `-mm`/`-nn` | 86 types, 361 tokens | single `-m`/`-n` | **0** |
| 2pl pronoun | `hwi` | 24 | `why` | **0** |
| a- compounds | hyphenated (`a-dro`, `a-vorow`) | 36 | joined | **0** |

**It is not** SWF Traditional-graph, not Unified/UCR, not Revived Late Cornish, on every test run.

**Nothing was normalised.** Three genuine same-word spelling splits were found and are being *reported*, not fixed — that is a human's call:

1. **"said": `leveris` (21 seeds) vs `leverys` (8 seeds).** The `leverys` spelling clusters almost entirely in one contiguous block, seeds 342–367; `leveris` is spread from seed 84 to 589. That clustering pattern looks like two authoring passes rather than noise.
2. **"important": `posek` (6) vs `poesek` (1, seed 356) vs `poosekka` (1, seed 137).** Exactly the oo/oe/o vowel-graph axis.
3. **"ask": `govynn` (12) vs `govyn` (7)** — no grammatical rule found for the doubling; looks orthographic.
4. **"because": `drefenn` (seeds 22, 136) vs `drefen` (seed 47)** — found in my own reading of the corpus.

Also cleared, with counts: **0** empty Cornish fields, **0** truncated seeds, **0** seeds left in English, **0** length-ratio outliers. Seven very short Cornish seeds were checked individually and all seven have genuinely short English ("An idea.", "A book.") — not truncations.

---

## 3. THE DEFECT CHECK — run on my own output, numbers even where zero

The brief named a live estate defect: a LEGO's known and target failing to correspond because one side was **sliced from a different word in the same seed sentence**, sometimes as a multi-card rotation. I ran this against everything I produced.

**Method notes that matter:**
- **The apostrophe is treated as a letter, not punctuation.** Only `.,?!;:` are stripped. Cornish contracts `a` + `an` → `a'n`, and merging that with plain `an` would have manufactured a false defect. (This is also why check 3b below reports a *real* difference rather than swallowing it.)
- **Intentional overlap is not counted as double-claiming.** The method deliberately teaches a small unit inside a larger one. The discriminator used: a pair is intentional if one target is a literal substring of the other; it is a **candidate defect only if the same gloss is simultaneously held by a *different* sibling row with a different target** — i.e. counterparts genuinely swapped.

| Check | Result |
|---|---|
| **1. Phrase target does not contain its own LEGO's target** (the direct slice-defect detector) | **0** of 530 BUILD/USE phrases |
| **1b. Phrase known side does not contain its LEGO's known side** | **6** of 530 — all one benign English pattern, see below |
| **2a. Same known gloss → different targets** (ZUT fork) | **0** across 73 LEGOs + 112 components |
| **2b. Same target → different knowns** (convergence) | **5**, all benign — listed below |
| **2c. Within-seed overlap: borrowed-from-sibling** | **0**, from **132 nested overlaps examined** |
| **2c. Disjoint partial overlaps needing eyes** | **1** — the `a'n`/`an` case, benign |
| **3. Missing LEGO** — a seed-target token no LEGO ever teaches | **0** across all 25 seeds |
| **3b. LEGO token absent from its own seed sentence** | **1** — the same `a'n`/`an` case |
| **Phrase-level: same known → different target** | **0** across 642 phrases |
| **Cross-store: `course_legos.components` vs materialised component rows** | **112 checked, 0 disagreements** |

**The 6 known-side cases are not slice defects.** All six are the same English fact: the LEGO's citation gloss is an infinitive ("to guess", "to meet", "to remember the whole sentence") while a natural phrase renders it after a modal ("I'm not sure if I can **guess**"), which drops the "to". **The target side is intact in all six** — and the target side is the one that detects the hunted defect. Full list: S0010L04U01, S0012L02U02, S0016L02U04, S0017L02U05, S0018L02U04, S0022L03U05.

### How I nearly reported a false clean — and what caught it

My first run of checks 1 and 1b joined phrases to LEGOs on `course_practice_phrases.lego_id`. **That column is NULL on all 642 rows of this course.** Every lookup missed, every row was skipped, and both checks printed a confident `0 of 530` having examined **nothing**. A second bug compounded it: the query never even selected `seed_number`/`lego_index`, so my first attempted fix still joined on `undefined`.

What caught it was **not** my own re-reading. The independent verifier (#707) reported 6 containment findings where I had reported 0, and I chased the discrepancy rather than assuming my number was the right one. Joining correctly on `(seed_number, lego_index)` gives 530 phrases matched, 0 orphans, and the numbers in the table above.

**The lesson generalises past this course:** a self-check that reports zero because it silently matched nothing is worse than no check, because it manufactures confidence. Any sameness or containment check on this schema must assert its matched-row count against an expected number before it is allowed to report a zero. My checker now joins on `(seed_number, lego_index)` and the note is written into the script.

**No rotation, no swap, no off-by-one slice was found in my own output** — on checks that have now been proven to actually execute. Given two other builds have verified the shared machinery does not corrupt what is submitted, a zero here is the expected result, and it is stated with its method rather than left silent.

### The self-check DID catch two real defects — in my own authoring, mid-run

This is worth saying loudly because it shows the check has teeth rather than rubber-stamping:

1. **S0014L01** — I glossed both the LEGO *and* one of its components as "do you speak", pointing at `a gewsydh jy` and `a gewsydh`. Same English intention, two different Cornish targets: a genuine ZUT fork of exactly the shape being hunted. Caught by check 2a, fixed, re-verified clean.
2. **S0025L02** — I glossed `ow` as "me" while `vy` was already "me" in four earlier seeds. Second genuine fork. Caught, fixed, re-verified clean.

Both were **my authoring**, not the tool.

### A tooling finding worth passing on

Fixing #1 by hand exposed something: **updating `course_legos.components` does NOT re-materialise the corresponding component rows in `course_practice_phrases`.** For a moment I had `course_legos` saying one thing and the phrase rows saying another — two stores disagreeing about the same component, which is precisely how a known side and a target side end up mismatched. I fixed both sides and added a permanent cross-store check (112 checked, 0 disagreements). **Anyone editing components by hand must write both stores.** No audio existed on either row, so nothing was orphaned.

### The five convergences, and why none is a defect

`a vynn` ← "want"/"wants" · `a wra` ← "am going to"/"is going to" · `a gews` ← "speak"/"who speak" · `a` ← "of the"/"do" · `ow` ← "in the middle of"/"my own". All five are on **silent components** (`introduce:false`) that never face a learner; the first three are English inflection of one intention. Convergence runs in the *reception* direction, which the methodology explicitly permits. The `a` and `ow` pairs are genuine Cornish homographs — flagged for a speaker below.

### The one disjoint overlap

S0010: `an lavar dien` ("the whole sentence") vs `perthi kov a'n lavar dien` ("to remember the whole sentence"). Neither contains the other **because the article contracts**: `a` + `an` → `a'n`. Both are correct; the check surfaced it precisely because apostrophes were preserved. Benign.

### THE HONEST LIMIT — do not read the zeros as more than they are

Every check above is **self-consistency only**. It catches a pairing that contradicts *another* pairing in the same course. **It cannot catch a pairing that is wrong consistently everywhere**, because nothing contradicts it. A clean self-check is **not** a claim that the Cornish is correct. Only a Cornish speaker closes that gap — hence §6.

---

## 4. The untaught-word rule

**0 violations across 530 BUILD/USE phrases**, verified two independent ways:

1. **The API enforced it live.** Its vocabulary and known-side gates rejected four of my submissions — S5, S16, S22 twice — for exactly this. Examples: `speaking` used before `to speak` was the introduced gloss; `she` used at seed 16 when it is not introduced until seed 17; `pan wredh` ("when you") smuggled in with no `when` taught. Each was rewritten, not waved through. **This gate is live and it works.**
2. **I re-checked independently afterwards**, recomputing for every phrase the vocabulary legitimately available at its own (seed, lego_index) — prior seeds plus LEGOs 1..N of its own seed, never a later sibling. **0 phrases used untaught material, over 530 phrases matched with 0 orphans.** This check always joined on `(seed_number, lego_index)` and so was never affected by the NULL-`lego_id` bug above. **Worker #707 independently reproduced this zero.**

Checked as I built, not after.

---

## 5. Method — followed, and where Cornish forced a departure

I followed this repo's process: read `ralph-methodology.md` and the layered-decomposition brief, completed the two-pass workflow (the API was gated at "TRANSLATE ONLY" until a translation analysis was posted), then decomposed against it. Seeds 1–3 used the documented `SKIP_VALIDATION` escape for the sparse-vocabulary floor; seeds 4–25 passed the full validator with no bypass.

**Three departures, all forced by the language, all deliberate:**

**(a) Initial consonant mutation breaks naive tiling.** Cornish mutates the first consonant of a word after certain triggers: `kewsel` → `a gews` / `ow kewsel`, `dyski` → `ow tyski`, `gorfenna` → `dhe worfenna`, `mynnes` → `a vynn` / `y fynn`. A dictionary-form LEGO is therefore often **not a literal substring of the seed**, so it cannot tile. **Rule I adopted: never teach a mutated fragment as if it were a base form.** Where a preposition plus mutation glues onto a verb, the glued form is taught whole as an overlapping M-LEGO, and the mutated piece stays a silent component. Example: seed 6's "a word" is `ger`, which mutates to `er` after `a`. Teaching `a er` = "a word" would have the learner producing `my a vynn a er`. Instead `perthi kov a er` ("to remember a word") is taught whole, overlapping `perthi kov`, and `er` is never presented as a citation form.

**(b) Mutation forces contrived silent component glosses.** Because components enter the ZUT table, and Cornish gives one verb many surface forms, honest-but-distinct glosses are needed on silent components to avoid *false* forks (`ow` as "in the middle of" vs "my own"). These are `introduce:false` and never reach a learner, but they are ugly and I would rather flag them than hide them.

**(c) The verbal noun is the universal complement.** Every English "to V" and every "-ing" after a preposition is the same Cornish verbal noun. This is a large simplification and I front-loaded it as an inference target.

**Golden keys taught first**, by corpus frequency: `my a vynn` + verbal noun (want to V, 131 seeds), `yth esov vy ow/owth` + verbal noun (progressive, 98), `my a wra` (going to, 28), `an pyth a…` (headless "what", 49), `fatel wra` (how to, 21), `ny`/`nyns` negation (135 combined).

**Register:** informal singular `ty`/`jy`/`dha` throughout, matching the corpus. The polite `hwi` appears in 24 seeds concentrated in a deliberate sir/madam block at 529 and 642–654 — a taught contrast, not drift, and out of scope tonight.

---

## 6. Questions only a Cornish speaker can answer

Neither Kai nor I speaks Cornish. These are the points where I refused to guess. Each is answerable by a Cornish speaker who knows nothing about our software.

**Spelling (pick one — we will not change anything until you do):**
1. "said" is spelled **leveris** in 21 seeds and **leverys** in 8 (seeds 342–367). Are both acceptable, or is one wrong?
2. "important" is **posek** in 6 seeds, **poesek** in seed 356, and **poosekka** ("more important") in seed 137. All acceptable?
3. "ask" is **govynn** in 12 seeds and **govyn** in 7. Which is right?
4. "because" is **drefenn** in seeds 22 and 136 but **drefen** in seed 47. Which is right?

**Meaning — these decide how we teach, and I have guessed provisionally:**
5. **Two words for "meet".** Seed 18 uses **omvetya** ("We want to meet at six o'clock"); seed 22 uses **metya orth** ("to meet people"). Is one for meeting-up-with-each-other and the other for meeting-a-person? A learner must be able to choose without thinking.
6. **Two words for "know".** **godhvos** is used for knowing facts (8 seeds), **aswonn** for knowing people (14 seeds). Is that the correct rule, and does it hold in every case?
7. **Two words for "think".** **tybi/dyb** for "I think *that*…" and **prederi** for "think *about*…". Correct?
8. **Two ways to say "need".** **res yw dhymm** (31 seeds) and **yma edhom dhymm a** (7 seeds). Both take the same kind of complement, so we could not find the rule from the text. What decides which one you say?
9. Does **perthi kov** ("remember") always take **a** before its object? Seed 6 has `perthi kov a er` and seed 10 `perthi kov a'n lavar dien`, but seed 24 has `perthi kov yn es` with no `a`. We taught it as: the `a` belongs with the object, not the verb.
10. Is **ger** the ordinary word for "a word", and does it become **er** after **a**?
11. "What I mean" is rendered **an pyth a vynnav leverel**, literally "what I want to say". Is that natural? And should "who you mean" at seed 263 (currently bare **a venydh jy**) use the same shape, so that one English idea has one Cornish form?
12. Is **ow** in **ow gweres** ("help me") genuinely the same little word as the **ow** in **ow tyski** ("learning")? We treated them as two different words that look alike.
13. Seed 22 renders "Because I want to…" as **drefenn my dhe vynnes** rather than **drefenn my a vynn**. Is the first form required after "because"?

**Standard:**
14. The whole 668-seed corpus consistently uses *hwath* (not *whath*), *kewsel* (not *cewsel*), *hwi* (not *why*), and doubled letters like *dhymm*/*henna*. Does that read to you as one specific named Cornish spelling standard — and if so, which?

---

## 7. Explicit gaps — what I did not do

- **643 of 668 seeds are not decomposed.** I stopped at 25. Nothing beyond seed 25 has a LEGO, a phrase, or a basket. This is a bank of quality content, not a course.
- **The 300-vs-668 tier is unresolved** and I deliberately left it that way. `seed_count` is still NULL.
- **No pair-contract file exists** for cor_for_eng (`docs/pair-contracts/cor_for_eng.contract.cjs`). Without it the known-side gate runs on the default English contract. It caught real violations tonight, so it is not silent — but a Cornish-specific contract is owed before a large parallel build.
- **No audio, by instruction.** No TTS, no voice, no sample clips, and no audio-pass queued — queueing one would be the start of an audio conversation the brief closed. When these 25 seeds are recorded, that queue call is the correct next step.
- **The orthographic sweep is letter-level.** It cannot distinguish SWF Main-form from Kernewek Kemmyn, whose differences are lexical rather than graphical. Question 14 covers it.
- **The fork scan is co-occurrence, not alignment.** It surfaces candidates for a human; it proves nothing on its own, and it swept verbs first — nouns and adjectives were not separately swept.
- **Two of my own checks initially reported a false clean** (§3). They are fixed and re-run, and the independent verifier agrees with the corrected numbers — but the first version of this report carried two wrong zeros for about an hour, and that is worth knowing about how much weight to put on a single agent's self-check.
- **`course_practice_phrases.lego_id` is NULL for every row on this course**, while `course_legos.lego_id` is populated. I do not know whether that is expected for this write path or a gap in it. I did not change it. Anyone writing tooling against these phrase rows must join on `(seed_number, lego_index)`.
- **The verifier's own English-side note:** it flagged that "speaking"/"talking" gerunds appear in seeds 5, 19 and 23 without a distinct -ing component gloss. English morphology is not ZUT-gated the way target vocabulary is, so this is likely a non-issue, but it is recorded rather than dropped.

---

## Workers used

- **#670** cor-orthography-audit (sonnet, read-only) — orthographic standard determination, spelling-split hunt. Delivered.
- **#672** cor-zut-fork-scan (sonnet, read-only) — fork candidates across 668 seeds, with a calibration step it ran and reported before trusting its own method. Delivered.
- **#701** cor-slice-verify (sonnet, read-only) — **FAILED and delivered nothing**, killed mid-run by an account-limit re-route. Reported here rather than quietly dropped.
- **#707** cor-slice-verify-2 (sonnet, read-only) — the retry. **Delivered.** It asserted the row counts (73/642/200/330/112) before analysing, paginated all three tables, and returned: rotation/swap **0** (including an independent known-vs-target ordering test across each seed), missing-LEGO **0**, untaught-word **0**, cross-store **0**, self-contradiction **5** (the same five benign homographs), containment **6** (the six benign infinitive cases). **Its verdict: no evidence of the hunted defect.** Its six containment findings are what exposed the false clean in my own checker.

---

**Landing line: NO COMMITS.** Nothing was committed to any branch, nothing merged, nothing deployed. All 25 seeds of work live as rows in the Supabase `course_legos` and `course_practice_phrases` tables for cor_for_eng, written through the validating course-builder API — that is where the deliverable is, and it is live there now.
