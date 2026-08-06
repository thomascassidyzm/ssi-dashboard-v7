# French: why the same clip plays for different English prompts

**Live trace of Tom's `fra_for_eng` session, 2026-08-06 18:45:18Z – 19:04:43Z, dev, iPhone.**
Read-only. No content, links or audio were changed.

---

## Headline

**The clips are not wrong and they are not mislinked — the same *phrase* is being scheduled three or four times inside ten minutes, so Tom hears the identical English sentence again and again.** 40% of the known-side audio in his session (32 of 81 plays) was a repeat of a clip he had already heard in that same session, and the cause is the script generator filling a guaranteed 7-slot practice run out of the USE pool whenever a lego has fewer than 7 BUILD phrases — which in `fra_for_eng` is **every lego in the first 30 seeds**.

His testimony is exactly right. The mechanism is just not the one the audio pipeline would have suggested.

---

## Calibration — run before any number below

The detector's rule is: group content rows by the `course_audio` row their `known_audio_id` points at; a group is a **defect** only if the pointing rows carry genuinely different `known_text` after normalisation, and **noise (legitimate dedup)** if the text is identical.

Fed the five audio ids that actually repeated in Tom's session:

```
75b3e263  rows=6  distinct known_text=1  -> NOISE (legit dedup)
     fra_for_eng:S0002L03C01    component  "I'm trying to"
     fra_for_eng:S0002L02B01    build      "I'm trying to"
     fra_for_eng:S0638L02B01    build      "I'm trying to"
     fra_for_eng:S0006L01C01    component  "I'm trying to"
     S0638L02                   lego       "I'm trying to"
     S0002L02                   lego       "I'm trying to"
53f34530  rows=1  distinct known_text=1  -> NOISE (legit dedup)
     fra_for_eng:S0002L03U01    use        "I'm trying to learn now"
bf7f96a0  rows=1  distinct known_text=1  -> NOISE (legit dedup)
     fra_for_eng:S0003L01U01    use        "I want to learn how to speak"
ab0eb137  rows=1  distinct known_text=1  -> NOISE (legit dedup)
     fra_for_eng:S0002L03U02    use        "I'm trying to learn with you"
09800651  rows=1  distinct known_text=1  -> NOISE (legit dedup)
     fra_for_eng:S0002L03U03    use        "I'm trying to learn with you now"
```

Two things this establishes, and they are the load-bearing facts of the whole report:

1. The detector correctly classifies the real collisions as legitimate dedup rather than manufacturing a defect.
2. **The four clips Tom heard 3–4 times each point at exactly ONE phrase row.** One row, one clip, played four times. That single line kills the "wrong link" hypothesis outright — there is no second row to have been mislinked.

## How Tom's session was identified

`player_events` filtered to `occurred_at >= 2026-08-06T17:30:00Z` returned 22 distinct
`(course_code, user_id, client_version, device_type)` groups. Exactly one was French with a
signed-in user: `fra_for_eng` / `81987d60-0c00-4553-8a36-79f83cdf1774` / `a414309` / mobile,
286 events. That is the same `user_id` as the German session traced three hours earlier, and the
`cold_start` payload carries `iPhone OS 18_7`, `ip_country: GB`, `env: dev`. **Environment is `dev`**,
confirmed from the row's own `env` column, not assumed. Re-queried at the end of this work: his last
French event is 19:04:43Z, so the window below is the complete session.

Known-side role value established empirically from the payloads, not guessed — role counts across
his 271 `audio_play` events were `known: 81, target1: 78, target2: 78, ps: 24, trans: 8,
pod_intro: 1, pod_outro: 1`. `known` is the English prompt side. `audio_failed` events for Tom in
the window: **0**.

---

## The colliding plays — what Tom actually heard

Ten clips played three or four times each. Every one is the correct English for its slot.

| Times | Over | English (known side) | Audio id | Heard at | Scheduled as |
|---|---|---|---|---|---|
| 4× | 9 min | "I'm trying to learn now" | `53f34530` | 18:48, 18:50, 18:52, 18:56 | build / use / spaced_rep / spaced_rep |
| 4× | 15 min | "I'm trying to learn with you" | `ab0eb137` | 18:48, 18:50, 18:53, 19:03 | build / use / spaced_rep / spaced_rep |
| 4× | 12 min | "I want to learn how to speak" | `bf7f96a0` | 18:52, 18:54, 18:55, 19:03 | build / use / spaced_rep / spaced_rep |
| 3× | 7 min | "I'm trying to speak French" | `a1b1bd28` | 18:46, 18:48, 18:53 | use / spaced_rep / spaced_rep |
| 3× | 10 min | "I'm trying to speak now" | `2349eb88` | 18:46, 18:49, 18:56 | use / spaced_rep / spaced_rep |
| 3× | 5 min | "I'm trying to learn with you now" | `09800651` | 18:48, 18:51, 18:53 | build / use / spaced_rep |
| 3× | 4 min | "I want to learn how to speak French" | `df73f6f2` | 18:52, 18:54, 18:56 | build / use / spaced_rep |
| 3× | 4 min | "I'm trying to learn how to speak French" | `491cac00` | 18:52, 18:54, 18:56 | build / use / spaced_rep |
| 3× | 8 min | "I'm trying to learn often" | `6d1266a7` | 18:55, 18:57, 19:03 | build / use / spaced_rep |
| 3× | 8 min | "I want to speak French often" | `0a9de513` | 18:55, 18:57, 19:03 | build / use / spaced_rep |

URLs are `/api/audio/<id>` — bare uuid, no `.vN` suffix, because every one of these rows is
`audio_revision = 1`. **78 of the 81 known-side plays were `cacheHit: true`** (3 misses, all at
session start).

Session totals: 81 known-side plays, 49 distinct clips, **32 repeats (40%)**. Distribution: 30 clips
heard once, 9 twice, 7 three times, 3 four times.

### The worked example — lego `S0003L01`, in play order

Its complete phrase inventory in the DB is 3 BUILD and 3 USE:

```
fra_for_eng:S0003L01B01  build  "how to speak"
fra_for_eng:S0003L01B02  build  "how to speak French"
fra_for_eng:S0003L01B03  build  "how to learn"
fra_for_eng:S0003L01U01  use    "I want to learn how to speak"
fra_for_eng:S0003L01U02  use    "I want to learn how to speak French"
fra_for_eng:S0003L01U03  use    "I'm trying to learn how to speak French"
```

What the player did with it:

```
18:51:35 S0003L01_build_94   build       -> B01  "how to speak"
18:51:43 S0003L01_build_95   build       -> B03  "how to learn"
18:51:52 S0003L01_build_96   build       -> B02  "how to speak French"
18:52:02 S0003L01_build_97   build       -> U01  <-- USE phrase, in a build slot
18:52:16 S0003L01_build_98   build       -> U02
18:52:33 S0003L01_build_99   build       -> U03
18:54:00 S0003L01_use_106    use         -> U01  <-- U01 again, 2 min later
18:54:14 S0003L01_use_107    use         -> U02
18:54:31 S0003L01_use_108    use         -> U03
18:55:57 S0003L01_spaced_rep_116          -> U01  <-- U01 a third time
18:56:11 S0003L01_spaced_rep_117          -> U02
18:56:28 S0003L01_spaced_rep_118          -> U03
19:03:33 S0003L01_spaced_rep_136          -> U01  <-- U01 a fourth time, same session
```

Three USE phrases, twelve plays.

---

## The DB rows behind them

All queried live from Supabase via PostgREST with the service key. The link column followed is
`known_audio_id`, on `course_practice_phrases` / `course_legos` / `course_seeds` — the actual column,
not an assumption.

Two facts worth recording because they cost time and will cost the next person time:

- **`course_practice_phrases.lego_id` is NULL for `fra_for_eng`.** The join key is
  `(seed_number, lego_index)`. A first pass joining on `lego_id` returned zero rows and looked like
  missing data; it was a wrong join.
- **`course_audio.lego_id` is NULL on all 49 clips Tom heard**, and 8 of the 49 (the presentation/
  debut lines) have no content row pointing at them at all. The player resolves those by a different
  path. Not a defect for this bug, but it means `course_audio.lego_id` cannot be used as an ownership
  key.

`fra_for_eng` has 15,898 phrase rows, 15,897 of which carry a `known_audio_id` — link coverage is
essentially total.

---

## Verdict: (d) — scheduling. Not (a), not (b), not (c).

The brief offered three hypotheses. The answer is none of them, and the evidence rules each out
individually.

### Rejected — (a) duplicate content rows

Would look like: two phrase rows with genuinely identical `known_text`, correctly deduped to one
clip.

**Evidence against:** the ten repeating clips resolve to **one phrase row each** (see calibration).
There is no duplicate row. Separately, of the 49 clips Tom heard, **zero pairs carry identical
normalised text** — every clip in the session is a distinct English sentence.

The one genuine dedup case in his session is `75b3e263` "I'm trying to", shared by 6 rows across
`S0002L02`, `S0002L03`, `S0006L01` and `S0638L02`, all with byte-identical known text. That is
deduplication working exactly as designed and it is not a defect. It accounts for **one** of his 32
repeats (the `S0002L02_debut` → `S0002L02_build_1` back-to-back pair at 18:45:52 / 18:46:01).

### Rejected — (b) wrong clip links

Would look like: rows with different `known_text` pointing at the same audio row.

**Evidence against:** the detector, run across all 18,218 known-side links in `fra_for_eng`, found
**2,265 legitimate dedup groups and ZERO link defects**. Zero. Every English prompt in French
resolves to a clip whose text matches it. Cross-course known-side links in `fra_for_eng`: **0** —
the `xcourse-audio-mislinks-swept-2026-08-06.md` mechanism (one Japanese clip serving 22 courses) is
**not** present here, and the same-course variant it could not see is also absent.

### Rejected — (c) serving / cache

This was the live candidate, given `6c68d9bf` ("revision-1 URLs are cache keys, so in-place byte
rewrites never reach the learner") and the fact that 78/81 plays were `cacheHit: true`.

**Evidence against:** the cache is serving the *right* bytes. Each repeated play uses a **different
`cycleId` but the same `audio_id`**, and that `audio_id` is the one the DB says belongs to that
phrase. If this were a cache-key collision, we would see one url serving bytes belonging to a
different row — instead the url, the row, and the text all agree. The revision-1 staleness problem
is real on this estate but it is a *content freshness* bug; it cannot produce "different prompts,
same clip", because here the prompts are not different — they are the same phrase requested again.

### Confirmed — (d) the script generator replays the same phrase

Root cause, in `ssi-learning-app`, `packages/player-vue/src/providers/generateLearningScript.ts`.
Three mechanisms, each defensible alone, compounding at low seed numbers:

**1. The BUILD run is padded from the USE pool.** `generateLearningScript.ts:1268` and its comment:

```js
// Fill remaining BUILD slots with USE phrases (BUILD priority > CONSOLIDATE)
// CONSOLIDATE can repeat BUILD phrases if needed — filling 7 BUILD is non-negotiable
```

When a lego has fewer than `MAX_BUILD_PHRASES` (7) BUILD rows, the generator takes USE rows to fill
the gap. `S0003L01` has 3 BUILD rows, so 3 USE rows get promoted into build slots.

**2. CONSOLIDATE then replays them.** `generateLearningScript.ts:1416`:

```js
// Phase 5: CONSOLIDATE ×2 - prefer unused USE phrases, allow reuse if pool exhausted
```

It prefers unused USE phrases — but step 1 just consumed the entire USE pool, so the pool *is*
exhausted, and it falls through to reuse. The learner hears U01/U02/U03 a second time, ~90 seconds
later.

**3. Spaced repetition lands almost immediately.** `generateLearningScript.ts:94`:

```js
spacedRepOffsets: [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584],
```

The offsets are in **legos**, not in time. At seed 2–3 a learner has completed roughly ten legos
total, so offsets 1, 2 and 3 point at the legos he finished *minutes* ago. `S0003L01`'s USE phrases
come back at 18:55 (offset ~1–2) and again at 19:03. The Fibonacci curve is designed to space
reviews out; at the start of a course there is nothing to space them across.

**There is no within-round or within-session de-duplication on `known_audio_id` or on
`known_text`.** The generator dedupes on `getPhraseId(known_text, target_text)` via
`usedPhrasesThisRound` (line 1243) — but that set is scoped to the round, and CONSOLIDATE and
spaced_rep deliberately bypass it.

### And underneath all three: the phrase floors are not met

The methodology floor is **≥4 BUILD + ≥5 USE per lego, always** (`feedback_ssi_build_use_phrase_floor`
— "fewer phrases is a FAIL"). `fra_for_eng` early seeds:

```
lego       build use     verdict
S0001L01      1    0     UNDER FLOOR
S0001L02      1    0     UNDER FLOOR
S0002L02      3    6
S0002L03      1    3
S0003L01      3    3
S0003L03      3    2
S0004L01      2    5     UNDER FLOOR
S0006L01      2    6     UNDER FLOOR
S0009L01      2    6     UNDER FLOOR
S0010L01      1    6     UNDER FLOOR
```

**Every one of the 100+ legos in `fra_for_eng` seeds 1–30 has a BUILD pool below 7**, so the
USE-cannibalisation path in mechanism 1 fires on *every round* of the early course. The repetition
Tom is hearing is the script coping with a phrase inventory that is too thin to fill the slots it
guarantees.

Worth naming separately: the phrases that do exist in these legos are combinatorially padded —
`S0002L02`'s six USE phrases are "I'm trying to speak French", "…speak now", "…speak French with
you", "…speak French now", "…speak with you now", "…speak French with you now". Even the *first*
plays sound repetitive. That is the subject of `docs/build-phrase-padding-2026-08-06.md` and is a
content problem, not a scheduling one, but it compounds the same symptom.

---

## Estate-wide number

Detector run across all courses: **520,703 known-side links, 437,504 distinct audio ids.**

- **56,429 legitimate dedup groups** (identical `known_text` sharing one clip) — the noise class.
- **44 real link defects** (one clip, genuinely different English prompts) — 0.008% of links.
- **1 cross-course known-side link** remaining after this morning's sweep.

*(These figures are from a scan whose phrase-table read reached a 400,000-row cap; a full-cap rerun
was still in flight at the time of writing. The cap truncates the phrase table only — legos and
seeds are complete — so the true defect count is a floor, not a ceiling. Flagged here as an explicit
gap rather than presented as final.)*

**`fra_for_eng`'s share of those 44 defects is zero.** French is clean on the link layer.

The 44 split into two classes:

- **Gender-agreement divergence between a seed row and its phrase row** (~30, almost all
  `eng_for_ita`): e.g. `6eb93397` — phrase `eng_for_ita:S0010L04U01` says "non sono sicur**a**",
  seed `S0010` says "Non sono sicur**o**", and both point at the one clip. Minor, real, and a
  different bug from Tom's.
- **Genuine wrong clips** (a handful, and these are the German pattern): `6ba0144c` is a clip saying
  **"my toys"** serving `deu_for_eng:S0566L02B02` whose prompt is **"my idea"**; `e3eabc9c` says
  **"she wants my toys"** serving a row whose prompt is **"she wants my idea"**; `cd1c50e5` says
  **"she wants"** serving `ara_for_eng` lego `S0017L03` whose prompt is **"she finds out"**.
  These are exactly hypothesis (b) — just not in French.

Reconciliation with the sibling scan: `docs/dup-target-cross-course-2026-08-06.md` (the target-side
mirror) lists `fra_for_eng` at **5 same-lego / 2 cross-lego** hits. Those are *target*-side
collisions and are a separate, small question; they do not overlap this known-side finding, and its
`build`↔`use` noise-class lesson is the direct analogue of the dedup noise class above.

---

## Recommended fix — NOT applied

**The one-line fix I would make**, and the smallest thing that would change what Tom hears tonight:
in `generateLearningScript.ts`, make CONSOLIDATE and spaced_rep respect a session-scoped
recently-played set rather than only `usedPhrasesThisRound`, so a phrase already heard in the last
N cycles is skipped rather than replayed. Concretely, at the CONSOLIDATE fall-through (line ~1416)
and the spaced_rep emit (line ~1398), skip any phrase whose `known_audio_id` was played within the
last ~40 cycles, and drop the slot rather than filling it.

**What I would need to be confident in it:** a ruling from Tom on the trade-off, because this
deliberately breaks a rule the code calls non-negotiable. Filling 7 BUILD slots and replaying a
phrase four times are the same decision. Dropping slots means shorter rounds early in a course.
That is a methodology call, not an engineering one, and it is his.

**The real fix**, which is slower and better: bring `fra_for_eng` seeds 1–30 up to the ≥4 BUILD /
≥5 USE floor with genuinely varied phrases rather than combinatorial padding. Then the generator
never needs to cannibalise, CONSOLIDATE always has fresh material, and the symptom disappears
without touching the player. This is a content pass and ends by queueing an audio-pass request, not
by running TTS.

**What I would not do:** anything to the audio rows or the links. They are correct.

---

## Gaps, stated explicitly

- The estate-wide phrase-table scan hit a row cap (see above). Rerun in flight; the 44 is a floor.
- `course_audio.lego_id` is NULL across every clip in this session, and 8 of the 49 clips have no
  content row pointing at them. Whatever path resolves those presentation/debut lines was not
  traced — it was not needed for this verdict, but it is unexamined.
- Whether the same USE-cannibalisation fires as hard in other courses was not measured. Every
  `fra_for_eng` lego in seeds 1–30 is below the 7-BUILD threshold; no other course was checked for
  that, so the "is this French-only?" question is open.

---

*Detector committed at `tools/audio/detect-known-audio-collisions.cjs` (read-only). Per-course JSON
at `docs/audio/fra-known-audio-collisions-2026-08-06.json`.*
