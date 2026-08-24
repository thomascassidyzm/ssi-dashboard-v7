# Quality sweep — `ita_for_eng` (Italian for English speakers)

**Date:** 2026-08-06 · **Course status:** released / new_app live / public — **LIVE TO LEARNERS**
**Scope:** 668 seeds, 1,457 LEGOs, 13,509 practice phrases (counts reconciled exactly against the
live DB with `Prefer: count=exact` before any work started — no `IN`-clause truncation).

All work used the **service key**. The live database was treated as the source of truth throughout.

---

## 0. Method and calibration

Every detector below was calibrated against a case known to be present **before** its count was
believed, and every hit list was hand-read in full before any row was touched.

| Detector | Calibration (known positive) | Result |
|---|---|---|
| Presentation drift | `S0004L01` (screen "something" / clip "to say") — supplied in the brief | fired; 0 rows unparsed |
| Subjunctive after obligatory triggers | `prima che` — 73 of 74 rows correct, so the detector had a large known-good body to sit against | fired on the 1 outlier |
| ZUT across `is_new` LEGOs | run before and after every `known_text` edit | 0 before, 0 after |
| Empty LEGOs | brief asserted "ZERO are empty" — I re-ran it | 60 found, all `draft`/`is_new=false` (see §1.5) |

**Unicode discipline.** No `\b` anywhere. All word matching uses `(?<!\p{L})…(?!\p{L})` with `/u`.
Italian carries `è à ù ò ì` and elisions (`un'ora`, `l'avrei`, `po'`), so ASCII boundaries would have
silently under-reported. **One detector bug was caught and fixed mid-run**: an early subjunctive
sweep used a `/g` regex with `.test()`, whose `lastIndex` statefulness skipped alternate matches. It
was rebuilt without `/g`. An early presentation-drift comparison also returned 1,385 "drift" rows
because it compared raw clip text to `known_text`; the clips carry a carrier sentence
(`The Italian for: 'X', as in — 'Y', is:`). Parsing X out dropped it to 134. **Both are examples of
why a raw count is an input, not a finding.**

---

## 1. Structural findings (verified by hand)

### 1.1 Presentation-audio drift — 134 rows, the largest structural defect in the course

The presentation clip announces the LEGO's `known_text` inside a carrier sentence. In 134 of 1,379
linked LEGOs, the clip announces **something other than what the screen shows**. In every case the
clip is correctly *linked* (`course_audio.lego_id` matches) — the LEGO's `known_text` was edited
after the clip was cut. Hand-classified into four classes, both lists read in full:

| Class | Count | What the learner gets | Action |
|---|---|---|---|
| **A — swapped with a sibling** | 17 | screen "that book", voice "give me" | 6 relinked, 11 unlinked |
| **B — clip speaks an annotation the text no longer has** | 37 | voice says *"quiet **slash** calm"*, *"student **(f)**"*, *"could you **(formal)**"* | unlinked |
| **C — clip announces a different chunk entirely** | 58 | screen "our children", voice "we want to" | unlinked |
| **D — benign (function-word/contraction difference only)** | 22 | screen "to pay", voice "pay" | **left linked** |

**Class B is the most damaging and the most interesting.** LEGO `known_text` was correctly cleaned of
slash-glosses and parentheticals at some point — Checks 1 and 2 genuinely return 0 today — but the
**audio was never re-cut**, so the annotations the cleanup removed from the screen are still being
*spoken*. Seeds **644–654** are a solid block of eleven `(formal)` LEGOs where the text was reworded
naturally ("could you say that sir?") and the voice still says "could you, formal".

**Sub-finding: 6 presentation clips are shared by two LEGOs each.** One is legitimate (S0054L05 and
S0096L01 are both "a little more time"). The other five are a LEGO borrowing its sibling's clip, so
the borrowing LEGO's own clip is simply absent: `S0142L03`, `S0143L03`, `S0253L01`, `S0325L02`,
`S0567L01`. All five unlinked.

**Post-fix state: drift is 134 → 22** (the D class, deliberately left).

*Why D was left linked:* nulling 22 near-correct clips mints 22 TTS jobs under a cost hold for a
difference the learner will not notice ("to relax" vs "relax"). Present-and-nearly-right beats
missing. Wrong-and-confident does not — which is why B and C were unlinked. **This is a judgement
call and Kai may want it the other way; the 22 are listed in `scripts/ita-pres-classified.json`.**

### 1.2 Subjunctive (Italian-specific, Check 17b) — the brief's zero was wrong, but only just

The brief reported zero and asked me to calibrate before believing it. I did, and the honest answer
is **the brief's zero was very nearly right**.

Raw flags: **97**. Hand-adjudicated true positives: **1**.

The false-positive class is large and worth writing down: **the conditional after `penso che` is
correct Italian**. `penso che sarebbe meglio`, `penso che potrebbe essere difficile`,
`penso che dovrebbe andare` are all standard — the subjunctive rule bites on the present/past
indicative, not on the conditional. That single class accounts for ~70 of the 97 flags. A further
batch (`penso che finirai`, `temo che sarà`) is future indicative after a trigger, which is
prescriptively loose but universally accepted in modern Italian because there is no future
subjunctive. I did not "fix" any of those.

**The one real defect — `S0508` BUILD `"before you'll pay" | "prima che pagherai"`.** `prima che`
takes the subjunctive without exception. This is a textbook §4 **island**: the course has 74
`prima che` rows and **73 use the subjunctive correctly**. One outlier against a consistent body is a
defect, not a variant. Fixed to `prima che tu paghi`.

### 1.3 Identical `known_text == target_text` (Check 15) — all 10 are false positives

`idea`/`idea` (×2 LEGOs + 1 phrase), `in`/`in` (×6), `Africa`/`Africa`. Every one is a genuine
Italian–English cognate or a shared preposition. **Nothing fixed, nothing to fix.** These are the
cognate false positives the brief predicted.

### 1.4 Multi-sentence candidates (Check 5) — 8 flags, 2 real

See §3.1. Six of the eight are one speaker musing aloud and are fine; two are broken.

### 1.5 "Zero empty LEGOs" — re-checked, and the claim needs a qualifier

The brief said Check 16 found 375 underpopulated LEGOs of which **zero are empty**. I found **60
LEGOs with no practice phrases at all**. They are not a defect: **all 60 are `status=draft` and
`is_new=false`** — revision tiles for words already taught elsewhere, not on the learner path. So the
brief's conclusion holds; only its wording ("zero are empty") doesn't. Recorded so the next worker
doesn't re-discover them and panic.

### 1.6 Learner-facing lowercase "i" — **not mine**, owned by another worker

Left untouched as instructed. Noted only because my `S0281`/`S0082` edits happened to sit near some.

---

## 2. Cross-course observations — REPORTED, NOT FIXED (rule 1)

Both patterns below are *shapes* I found in Italian that are very likely generator families rather
than Italian-specific typos, so the other six Romance workers should be told to look:

1. **Presentation clips speaking a stripped annotation** (§1.1 class B). The paren/slash cleanup ran
   on `known_text` and not on the audio. If the same cleanup ran estate-wide, every cleaned course
   has a silent block of clips still speaking `(formal)` / `quiet/calm`. **This is the highest-value
   cross-course check I can hand over.** It is invisible to Checks 1 and 2, which pass cleanly.
2. **Presentation clips shared between two sibling LEGOs** (§1.1 sub-finding). A trivially cheap
   query (`GROUP BY presentation_audio_id HAVING count(*) > 1`) and it found 5 real defects here.

I did not query any other course.

---

## 3. What HAND-READING found that no structural checker could see

I read **34 seeds** end to end — seed row, every LEGO, every component/build/use phrase, in learner
order — spread deliberately across the range: **1, 2, 4, 25, 33, 38, 47, 52, 54, 56, 59, 60, 76, 77,
82, 92, 119, 136, 143, 163, 213, 215, 220, 249, 250, 256, 270, 281, 325, 470, 506, 508, 550, 610**,
plus targeted reads of 651/666 and the 644–654 formal block. Each finding below was then **swept
across the whole course** to find out how big its class was.

### 3.1 Seed 82: "Why not?" bolted onto a question — the flagged case, and what it really was

The brief flagged 7 USE phrases. Reading the seed, the split is cleaner than "all 7 are bad":

- Five are **one speaker musing aloud** and are perfectly natural: *"I want to try this. Why not?"*,
  *"I'm ready to start. Why not?"*, *"I can do that now. Why not?"*, *"I think I can do that. Why
  not?"*, *"I want to speak slowly. Why not?"* Kept.
- Two bolt "Why not?" onto a **question**, which no speaker of any language produces:
  *"do you want to try? Why not?"* and *"can you help me? Why not?"* **Deleted.** (Kai named the
  second one himself.) L2 keeps 4 BUILD / 5 USE — exactly at the 3/5 floor, so nothing needed
  backfilling.
- The hand-read also turned up a BUILD the structural check never flagged: **`"you want. why not"` |
  `"vuoi. perché no"`** — that is not English. Reworded to `"I want to. Why not?"` | `"voglio. Perché
  no?"` (both sides verified unused anywhere else in the course first).

### 3.2 The biggest naturalness finding: English object **"it"** rendered as **`questo`** ("this")

Found by reading S0060, where the learner is prompted *"I don't know how to do it"* and must produce
*"non so come fare **questo**"* — literally "how to do **this**". Any Italian speaker says
*"non so come far**lo**"*.

Swept the whole course. **The course teaches the enclitic `-lo` at S0092** (`"do it" → "farlo"`), and
the split falls exactly on that line:

- **Before S0092 (59 rows / 13 seeds):** the clitic has not been introduced, so `fare questo` is a
  *legitimate methodological workaround*. The defect is on the **English side** — the prompt says
  "it" when the Italian says "this". **Not fixed** — see §5.
- **After S0092 (17 rows):** here the course contradicts itself. **S0213 is the sharpest case: two
  USE phrases inside the same LEGO, adjacent** — `"they're trying to do it now" | "stanno provando a
  far**lo** adesso"` and `"they're trying to find it" | "stanno provando a trovare **questo**"`. Same
  construction, same English word, two different renderings, side by side.

**This also creates a genuine ZUT defect** (the harmful direction): the English chunk `"how to do
it"` maps to `"come farlo"` at S0213 and `"come fare questo"` at S0060.

**Fixed: 6 rows** where the target is an infinitive, the enclitic is already attested, *and* a
sibling phrase in the same LEGO already uses it — S0213 (×4), S0215, S0528. That is the subset where
the course's own internal evidence settles the answer.

**Sub-finding the sweep exposed: `questo` is used as a bare object pronoun from S0052, but the LEGO
that teaches `"this" → "questo"` is at S0126.** The word is *seen* earlier (`questo pomeriggio`,
S0035) but that sense is not taught — §3's "a word being seen is not the same as its sense being
taught". Reported, not fixed: it is a course-design question, not a row fix.

### 3.3 Same-subject `penso che` — 17 rows of ungrammatical Italian, invisible to every check

Reading S0076 I hit *"I think that I'm very happy with it"* → **`penso che sia molto contento`**.
That does not mean "I think I'm very happy" — `sia` is syncretic across io/tu/lui, so it reads as
*"I think **he** is very happy"*. Italian requires **`penso di` + infinitive** whenever the subject
is the same on both sides of `che`.

Swept: **17 rows** across seeds 76, 77, 83, 168, 192, 256, 270, 524 — `penso che sarò pronto`,
`penso che arriverò presto`, `penso che potrò finire`, `non penso che sarò troppo occupato`.

**Consistency check before fixing (§0):** is `penso di` introduced? **Yes — attested from S0062**
(`"I don't think I can help you" | "non penso di poter aiutarti"`), and again at S0082, S0089, S0091,
S0096. So the corrected form was already met by the learner, well before every row I changed.
**All 17 fixed.** One of them is a seed row (S0256); I verified its two LEGOs (`"an hour"`,
`"in less than"`) still tile into the new target before touching it.

I deliberately did **not** touch `penso che dovrei` / `penso che l'avrei fatto` (S0098, S0127, S0152,
S0153, S0242). Same-subject conditional after `penso che` is marginal but genuinely current Italian,
and forcing it would be preference, not correction.

**Related, same underlying cause (ladder rung 4):** `S0139` *"I think you're leaving so early"* |
`"penso che stia andando via così presto"`. Syncretic subjunctive again — without an explicit
pronoun this reads as *he/she*. Fixed to `penso che **tu** stia andando via`. (I checked S0655's
`penso che stia andando molto bene, signora` — that one is **correct**, because formal *Lei* takes
exactly that form. Not touched.)

### 3.4 Wrong grammatical person hiding behind a duplicate target — S0506

`"she used to live around here before we moved"` | **`"vivevo da queste parti prima che ci
trasferissimo"`**. `vivevo` is *I* used to live. The tell is that this phrase's target is a
character-for-character copy of its own sibling USE (`"I used to live around here years ago…"`) with
`anni fa` deleted — a copy-paste where the English was changed and the verb was not. Fixed to
`viveva`. This is the class of defect that only turns up by reading two adjacent phrases together.

### 3.5 Pleonastic `ne … di questo` — 2 rows

`S0651` *"what do you think about it madam?"* | `"che cosa **ne** pensa **di questo**, signora?"` and
`S0666` likewise. `ne` already *is* "about it"; doubling it with `di questo` is ungrammatical.
Both fixed by dropping `di questo`. These sit in the late formal block, where the whole seed range
had already shown itself to be weakly proofed (§1.1 class B).

### 3.6 `chiederlo a lei` — 2 rows

`S0136` *"I think it's important to ask her about this"* | `"…chieder**lo a lei** di questo"`.
That is not Italian; the indirect object is `le`. Fixed to `chiederle di questo` and
`posso chiederle`.

### 3.7 A translation with the object simply missing — S0325

*"I think that he needs to consider it"* | `"penso che debba considerare"` — the Italian has no
object at all and stops mid-thought. Fixed to `considerarlo`.

### 3.8 S0281 `"before that"` — a broken gloss with a ZUT trap underneath it, and how it was resolved

LEGO `S0281L04` is glossed **`"before that"` → `"prima che"`**, and two of its BUILDs read
*"before that I go"* and *"before that you go"* — neither is English. Every other `prima che` seed in
the course glosses it properly (`"before you"` S0119, `"before you go"` S0249, `"before I answer"`
S0250). S0281 is the island.

**My first fix was wrong and I caught it in dry-run.** Renaming *"before that I go"* → *"before I
go"* would have collided with **S0025**, where *"before I go"* already maps to `"prima di andare"` —
i.e. my own cleanup would have minted a fresh ZUT conflict out of two clean rows. That is precisely
rule 6, and it is the reason the dry-run gate exists. Resolved instead by:

- *"before that you go"* → **`"before you go"`**, which **consolidates onto S0249's established
  mapping** (`prima che tu vada`) rather than competing with it — same target, so it is a merge, not
  a fork;
- *"before that I go"* | *"prima che io vada"* → **`"before you start"` | `"prima che tu cominci"`**,
  lifted from **S0281's own seed sentence**, so it tiles and reinforces. Both sides verified unused
  anywhere in the course before writing. Deleting it would have dropped L4 to 2 BUILDs, under the
  floor; it now keeps 3 BUILD / 5 USE.

The LEGO gloss `"before that"` itself I left alone — see §5.

### 3.9 Things I read, judged, and decided were **not** defects

Worth recording so nobody re-litigates them:

- **`prima di` vs `prima che`** (S0025 vs S0119/249/250/281/470/506) — same English "before", two
  Italian forms. This is the target language being right (infinitive with a shared subject,
  subjunctive with a different one) and the course applies it **consistently across 74 rows**.
  §4's "is there a REASON?" — yes. Left alone.
- **`sia` glossed as `"it is"`** (S0047L02 component) — a subjunctive form with an indicative gloss.
  It looks wrong, but it is only ever used inside `penso che …` in that seed. Component, never
  drilled bare. Left alone.
- **`S0038` `"for a week"` → `per una settimana` vs `da una settimana`** — real grammatical split
  (planned duration vs ongoing), cued by the English tense. Defensible; noted, not touched.
- **`penso che sia insegnante`** (S0197) — Italian correctly drops the article before a profession.
- **`a meno che siano`** (S0532, 17 rows) — prescriptively wants pleonastic `non`; universally
  omitted in speech. Not worth 17 edits and 34 orphaned clips.

---

## 4. What was FIXED — counts

| # | Fix | Rows |
|---|---|---|
| 1 | Presentation clips **relinked** to the correct LEGO (S0004, S0038, S0054 — clean mutual swaps, both clips verified correct for the other) | **6** |
| 2 | Presentation clips **unlinked** (classes A-unpaired 11, B 37, C 58) | **106** |
| 3 | Same-subject `penso che` → `penso di` + infinitive | **17** |
| 4 | Syncretic subjunctive given its explicit pronoun (S0139) | 1 |
| 5 | `prima che` + future → subjunctive (S0508 island) | 1 |
| 6 | Wrong person `vivevo` → `viveva` (S0506) | 1 |
| 7 | Pleonastic `ne … di questo` (S0651, S0666) | 2 |
| 8 | `chiederlo a lei` → `chiederle` (S0136) | 2 |
| 9 | Missing object `considerare` → `considerarlo` (S0325) | 1 |
| 10 | `questo` → enclitic `-lo` where a sibling already proves it (S0213 ×4, S0215, S0528) | 6 |
| 11 | Ungrammatical English BUILDs (S0281 ×2, S0082 ×1) | 3 |
| 12 | **Deleted** — "Why not?" bolted onto a question (S0082) | 2 |
| | **Total rows changed** | **148** |

**Distinct fix-clusters: 11** (plus 1 deletion). The row count is an input; 11 is the number that
means anything.

**Reversibility.** Every edit was applied through one gate script that (a) re-read the live row,
(b) refused to write unless the current value matched what I planned against — so a concurrent
worker's edit shows up as a drift-skip, never a silent overwrite — and (c) wrote a full
before-image. Backups: `scripts/ita-backup-plan-pres.json`, `-plan-lang.json`, `-plan-lang2.json`,
and `scripts/ita-backup-deletions.json` for the two deleted rows. **0 drift-skips occurred**, so
nothing was contended.

**Post-fix verification** (re-dumped from the live DB, not asserted):

- presentation drift **134 → 22** (the D class, as designed)
- ZUT collisions among `is_new` LEGOs: **0 before, 0 after** — my `known_text` edits minted none
- each of the three English strings I introduced maps to exactly one target
- `prima che pagherai` no longer flags
- phrase count 13,509 → **13,507** (the two deletions)
- S0082 L2 = 4 BUILD / 5 USE, S0281 L4 = 3 BUILD / 5 USE — **both still at or above the 3/5 floor**

---

## 5. Found but NOT fixed, and why

1. **English object "it" → `questo` before S0092 — 59 rows / 13 seeds (52, 53, 56, 57, 58, 59, 60,
   71, 74, 76, 77, 78, 79, 91).** The *Italian* is defensible: the enclitic is not introduced yet.
   The fix is 59 **English** prompt edits ("do it" → "do this"), which would orphan 59 known-audio
   clips on a live course under a cost hold. It is also arguably an upstream design question —
   introduce `-lo` earlier and the whole class evaporates. **This is the single biggest remaining
   item and it needs Kai's call, not mine.**
2. **S0220 — 11 rows of `"did you watch it?"` | `"hai guardato questo?"`.** Same class, on the wrong
   side of S0092. I did **not** fix the target, because the correct Italian (`l'hai guardato?`)
   needs a **proclitic**, and proclitic `lo` is never introduced as a LEGO until **S0464**. Writing
   it at S0220 would be a new vocabulary violation dressed up as a fix. §3 says: when unsure, skip.
   *Separately:* S0220 L1's nine USE phrases are near-identical time variants and **two are exact
   duplicates** ("did you watch it yesterday?" ×2). Worth a rewrite pass; out of scope here.
3. **The `"before that"` LEGO gloss (S0281L04) itself.** The honest gloss for bare `prima che` is
   "before", which collides with S0025's `"before" → "prima di"`. §4's preferred resolution is to
   expand the LEGO with context from the seed — but changing a LEGO's `target_text` de-links the
   BUILD/USE phrases that no longer literally contain it, which would drop L4 under its minimums and
   risks the phrase-vaporisation seen on `spa_for_eng` S53. **Needs a builder-driven reseed, not a
   row edit.** I fixed the two ungrammatical BUILDs beneath it and left the gloss.
4. **22 benign presentation-drift clips** (§1.1 class D) — left linked deliberately. Two of them
   (S0373L01 / S0374L02) are a "beautiful"/"very beautiful" swap between seeds.
5. **S0550 "the end of the village"** — the USE phrases ("the end of the village is dreadful", "…is
   very sad", "I was wrong about the end of the village") read as the village's *demise* rather than
   its far edge. If the seed means the physical edge, the Italian wants `in fondo al villaggio` and
   the whole LEGO is mis-glossed. **I could not tell from the course which was intended, so I did not
   guess.** Flagged for a human who knows the source material.
6. **Assorted single-row wobbles** noted while reading, each too small to be worth an orphaned clip
   pair on its own but recorded for a future batch: S0311 *"three most important facts"* (missing
   "the"), S0143 *"the thing"* → `la stessa cosa` ("the **same** thing"), S0492 *"of those"* → `di
   quei posti` ("those **places**"), S0488 *"the road"* → `quella strada` ("**that** road"),
   S0273 "just" dropped, S0060 `fare cose` (wants `le cose`), and inconsistent placement of
   *ancora* for "yet" within S0060 itself (`non riesco a fare questo **ancora**` vs the correct
   `non so **ancora** come dire questo`).
7. **Lowercase "i"** — owned by another worker, untouched.
8. **Underpopulated LEGOs (375)** — informational, and the brief said not to spend the run on it.
   I confirmed none of them is empty on the learner path (§1.5).

---

## AUDIO NOW OUT OF SYNC — NEEDS APPROVAL

**No TTS was generated, regenerated or queued. No `course_audio` row was deleted.**
Six existing clips were **relinked** (moved to the LEGO whose text they already speak) — that costs
nothing and repairs three swaps outright.

**175 clips unlinked** (`…_audio_id` set to `NULL`, rows preserved), so the affected content now
correctly reads as *missing* instead of silently serving the wrong text:

| Column | Count | Cause |
|---|---|---|
| `presentation_audio_id` | **106** | pre-existing drift, classes A-unpaired / B / C (§1.1) |
| `target1_audio_id` | **33** | my 33 `target_text` edits |
| `target2_audio_id` | **33** | my 33 `target_text` edits |
| `known_audio_id` | **3** | my 3 `known_text` edits |
| | **175 total** | |

Plus **6 clips orphaned by row deletion** (known + target1 + target2 on each of the two S0082 rows).
Those `course_audio` rows still exist and were not touched; they simply have no phrase pointing at
them now.

**Important distinction for whoever approves the pass:** the 106 presentation clips are **not
breakage I caused**. They were already wrong — the learner was hearing a different prompt from the
one on screen. Unlinking converts an invisible wrong into a visible gap. The 69 target/known clips
*are* consequences of my text edits and are the genuine new backlog.

---

## EXPLICIT GAPS

1. **I do not have native-speaker Italian certainty on every judgement.** Where the call was
   genuinely contested I said so and left the row alone (§3.9) rather than imposing a preference.
   The `penso che` + conditional class in particular I ruled a **false positive** on grammatical
   grounds; if a native reviewer disagrees, ~70 rows change status. That verdict is the load-bearing
   one in this report.
2. **34 seeds of 668 were read by hand (5%).** Everything outside that sample was reached only by
   the sweeps the hand-read *generated*. A different 34 seeds would very likely surface classes I
   never saw. Absence of findings in seeds 300–500 means unread, not clean.
3. **The 59-row + 11-row "it"/`questo` class is unresolved, not cleared.** I have scoped and counted
   it precisely and deliberately not acted (§5.1, §5.2). It needs a decision.
4. **I did not query any other course** — the two cross-course patterns in §2 are inferences from
   Italian's shape, offered as leads, not as measured findings.
5. **Class D presentation drift (22 clips) was left linked on my judgement**, trading a small known
   wrongness against 22 TTS jobs under a cost hold. Reversible either way; the list is on disk.
6. **`display_tiling` / `decomposition` columns were not inspected.** My text edits may have
   invalidated cached tiling for the 34 edited rows. I do not know whether anything regenerates
   those, and I did not want to guess at a mechanism I had not read.
7. **Seed approval status.** Several edited seeds carry an `approved_at` that predates my change
   (§7 of the fix rules says those go back to review). I did **not** reset any approval flag,
   because I could not establish from the code what consumes it. **Seeds touched: 76, 77, 82, 83,
   136, 139, 168, 192, 213, 215, 256, 270, 281, 325, 506, 508, 524, 528, 651, 666** — plus the 112
   LEGOs whose presentation link changed.

---

## Scripts

All under `scripts/` (gitignored workspace), not committed:
`ita-dump.cjs` (paged dump), `ita-seed.cjs` (learner-order seed reader), `ita-presdrift2.cjs`
(carrier-parsing drift detector), `ita-plan-pres.cjs`, `ita-subj.cjs`, `ita-it2.cjs`,
`ita-plan-lang.cjs`, `ita-apply.cjs` (the verify-then-write gate), plus the backup JSONs named in §4.
