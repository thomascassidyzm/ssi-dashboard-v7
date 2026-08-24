# ara_lb_for_eng — reconciling "20,757 missing" with "430 of 432 present"

**2026-08-06. Read-only investigation. No audio generated, no rows written, no links repaired.**

---

## The answer in one line

**Both numbers are right. There is no contradiction — a *round* is not a *seed*.**

Rounds 500–519, the range Tom checked, are LEGOs 500–519, which live in **seeds 223–233** —
comfortably inside the audio-complete zone. The audio cliff at seed 301 falls at **round 639**, not
round 500. Tom's screenshot and the earlier count were measuring two different parts of the course.

| What was said | Verdict |
|---|---|
| "Rounds 500–519: 430 of 432 with audio, 2 missing" | **Correct.** Reproduced live: 450/452, 2 flagged. |
| "Seeds 301–668 have zero audio" | **Correct as to *linked* audio** — 0 bound slots. But 1,324 of those slots have audio already sitting in this course's own library, unbound. |
| "20,757 clips to generate" | **Correct**, and it is the live tool's own number, not a bad query. |

Tom's unlinked theory is **partly right**: 1,324 slots are recoverable for free. It is not the
explanation for the apparent contradiction, though — the round/seed unit mismatch is.

---

## The true state, three buckets, whole course (release target 668)

| Bucket | Count | Cost to fix |
|---|---|---|
| **(a) LINKED — playable now** | **19,934** | — |
| of which text slots (known / target1 / target2) | 19,295 | |
| of which LEGO presentation clips | 639 | |
| **(b) PRESENT BUT UNLINKED — audio exists, slot unbound** | **1,324** | **free — a link pass, no TTS** |
| known (English, `azure_en-GB-SoniaNeural`) | 312 | |
| target1 (`azure_ar-LB-LaylaNeural`) | 506 | |
| target2 (`azure_ar-LB-RamiNeural`) | 506 | |
| **(c) GENUINELY ABSENT — nothing anywhere** | **23,022 slots → 20,757 jobs** | TTS + authoring |
| distinct texts needing TTS (after dedup) | 19,474 | TTS |
| LEGO + component presentations needing authoring first | 1,283 | text authoring, then TTS |
| **Storage-broken** — a bound row whose S3 object is gone | **0** | — |
| **Copyable** from another course in this course's voices | **0** | — |

Location of the gap: **seeds 1–300 are essentially complete** (1,320 of the 1,324 unlinked and
essentially all of the absent slots sit at seed 301+). That is exactly the deliberate MVP-to-300
release policy, working as intended.

Every one of the 1,324 unlinked slots is a **duplicate of a text already rendered and bound
elsewhere in this same course at seed ≤ 300**, in the course's own configured voices — e.g. the
English word "you" at seed 301 is the same clip already bound at seed 1. This is ordinary
normalisation drift on repeated texts, not damage.

---

## The 12 real gaps inside seeds 1–300

The complete zone is not 100%. Twelve USE phrases carry gaps:

| Seed | Known text | State |
|---|---|---|
| S65L1 | It's important | known ABSENT, targets UNLINKED |
| S164L1 | A book | known ABSENT, targets UNLINKED |
| S182L1 | I saw your car | all three ABSENT |
| S205L1 | I forgot the subject | all three ABSENT |
| S216L2 | I saw some friends on the bus | all three ABSENT |
| S216L2 | I saw some friends at the pub | all three ABSENT |
| **S223L1** | **he'll ask you questions** | **all three ABSENT** |
| S234L2 | he works with your brother in an office | all three ABSENT |
| S239L2 | she likes to read this book | all three ABSENT |
| S289L2 | she's going to be there early next week | all three ABSENT |
| S293L2 | he's going to meet me tomorrow afternoon | all three ABSENT |
| S293L2 | he's going to meet me next year | all three ABSENT |

**S223L1 is the phrase in Tom's screenshot.** The Script Viewer's two flags in rounds 500–519 are
the *same* phrase twice — once as the BUILD in round 500, once as its review in round 508. One
defective phrase, two rows.

---

## Cross-check against the live tool

The methodology now agrees with the working surfaces on every number it can be compared against:

| Measure | My independent census | Live tool |
|---|---|---|
| Unlinked (linkable) slots | 1,324 | `phase8 /needs` → `toLink` 1,324 |
| Unlinked by role | 312 / 506 / 506 | `unlinkedBreakdown` 312 / 506 / 506 |
| Distinct TTS jobs | 19,474 | `toGenerate` 19,474 |
| Linked | 19,934 | `ledger.linked` 19,933 |
| Storage-broken | 0 | 0 |
| Rounds 500–519 flagged | 1 phrase, 2 rows | Script Viewer: `itemsMissingAudio` 2 |

The rounds 500–519 journey was fetched from the live `/learning-journey` endpoint the viewer itself
calls; it returned 452 items, 450 with audio, 2 flagged — Tom's 432/430 is the same picture with the
filter's own row accounting.

---

## Why the round/seed mismatch is easy to make

`ara_lb_for_eng` has **668 seeds but 1,414 rounds** — 2.3 LEGOs per seed on average, and a round is
one LEGO's debut, not one seed. Confirmed against the generator (`loadAllUniqueLegos` orders by
seed/lego\_index, dedups by `lego_id`, drops `is_new === false`):

- round 500 → seed **223**, LEGO 1 — "going to ask you"
- round 519 → seed **233**, LEGO 2 — "who knows your sister"
- round 638 → last round with audio, seed 300
- round **639** → seed **301**, LEGO 1 — **the cliff**
- round 1414 → seed 668, the end

So the audio boundary Tom would need to open to see the gap is round 639, roughly 140 rounds past
where he looked. Anyone reasoning about coverage by seed and checking it by round will land ~2.1×
too early in the course.

---

## Why the prior worker's framing was wrong even though the number wasn't

The 20,757 figure came from the live `phase8 /needs` endpoint and is accurate. What was wrong:

1. **"Zero audio for seeds 301–668"** — true of *linked* audio, false of audio in existence. 1,324
   of those slots already have their clip sitting in `course_audio`.
2. **Framing the gap as a broken or unfinished recording run** — it is the deliberate MVP-to-300
   release policy. This is unlike `fra_for_eng`, where the gap really was an unfinished 08-03
   re-voice with a full audit trail. Here there is no purge and no interrupted run: seeds 1–300 were
   rendered, seeds 301+ were never scheduled.

---

## Two things worth Tom's attention — not acted on

1. **The free 1,324.** A link-only pass binds them at zero cost. It is the `/generate` link step, no
   TTS. I have not run it; this was a read-only investigation.
2. **The voice question.** Every clip in this course is Azure — `azure_ar-LB-LaylaNeural`,
   `azure_ar-LB-RamiNeural`, `azure_en-GB-SoniaNeural`. That is the same voice class the fra/deu
   re-voicing programme has been sweeping *out* of the estate. If ara\_lb is meant to follow, both
   the link pass and any future generation change shape. That is a call, not an inference.

The $7.40 / 20,757-clip generation proposal remains cancelled. Nothing here reopens it.

---

## Method

- Direct census of `course_legos`, `course_practice_phrases`, `course_seeds` (status `released`)
  against `course_audio`, matching on `normalizeForAudio(text)|language|role` — the same key
  `services/phases/phase8-audio-v13.cjs` uses, via the same
  `services/shared/text-normalize.cjs` helper.
- One trap worth recording: this course's target audio is stored under language **`ara`**, not
  `ara_lb`. Keying on the course code's language suffix silently reports **0** unlinked target
  slots instead of 1,012. That alone would have hidden three quarters of bucket (b).
- Round↔seed mapping reproduced from `services/learning-script-generator.cjs`, not assumed.
- Live cross-checks: `GET localhost:3465/needs/ara_lb_for_eng` and
  `GET localhost:3470/api/production/ara_lb_for_eng/learning-journey?maxLegos=20&offset=499|655`.
- Scripts under `scripts/ara-audit/` (gitignored workspace). No writes of any kind.
