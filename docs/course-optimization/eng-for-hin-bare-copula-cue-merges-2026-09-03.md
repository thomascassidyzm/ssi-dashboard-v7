# eng_for_hin — the bare copula/auxiliary cues

**Date:** 2026-09-03 · **Course:** `eng_for_hin` (known = Hindi, target = English) · **Kai's approval:** 2026-09-03
**Precedent:** the same defect fixed this morning for है/हैं and चाहिए —
`docs/course-optimization/eng-for-hin-chunk-merges-hai-chahiye-kal-2026-09-03.md` (commit `e5f8162f6`).

**Six cues retired. Four left deliberately. Three found beyond the brief's list.**
Zero phrases stranded, zero text rewritten, zero audio pointers lost, zero TTS generated.

---

## 0. The defect, and where it lives

A grammatical word standing alone as a drilled cue, carrying an English meaning that belongs to the
construction around it rather than to the word.

As with the precedent, none of these are top-level LEGOs. They are entries in
`course_legos.components`, and each one is emitted as a real `course_practice_phrases` row with
`phrase_role = 'component'` — a cue the learner is actually asked to answer.

**Kai's standing rule — merging expands both sides — was already satisfied by the parent in every
case.** In all six the parent M-LEGO already carries the full Hindi chunk *and* the full English
chunk (`बोलता हूँ → "I speak"`, `पर विचार करना होगा → "needs to consider"`, …). The copula was
being split back out *below* the LEGO. So the fix is to retire the sub-cue and leave the licensing
chunk whole: no LEGO text was grown, because none needed growing, and neither side went out of
correspondence.

---

## 1. Verifying the list before acting

The brief named eight. I swept the class myself against the live DB rather than trusting it:
every LEGO and every component in all 1,489 LEGOs whose known side is composed **entirely** of
copula/auxiliary/negation tokens.

**The eight are real and the list is exactly right** — the single-token sweep returns
`था, थी ×2, थे, हूँ, हो, होगा ×2` and nothing else.

**Three more of the same class exist that the list does not name:**

| Seed | Cue | Glossed | Verdict |
|---|---|---|---|
| 354 | `नहीं था` | **"didn't need to"** | Misleading — `नहीं था` is *"wasn't"*. **Fixed.** |
| 621 | `नहीं होती` | **"wouldn't have"** | Misleading — `नहीं होती` is *"doesn't happen / isn't"*. **Fixed.** |
| 355 | `क्या` | **"did"** | Misleading, but not a copula and not free to remove — see §5. |

---

## 2. The test I applied

For each cue: **is the English gloss a true translation of the Hindi word standing alone?**

That test sorts the eleven cleanly, and it is the same test behind Kai's four named examples.

| Cue | Seed | Gloss | True of the bare word? | Action |
|---|---|---|---|---|
| `हूँ` | 9 | "I" | **No** — हूँ is *am*; the "I" is मैं | merged |
| `होगा` | 325 | "needs to" | **No** — होगा is *will be* | merged |
| `होगा` | 327 | "needs to" | **No** | merged |
| `नहीं था` | 354 | "didn't need to" | **No** — *wasn't* | merged |
| `थी` | 355 | "need to" | **No** — थी is *was* (f.) | merged |
| `नहीं होती` | 621 | "wouldn't have" | **No** | merged |
| `हो` | 346 | "be" | **Yes** — हो is the subjunctive of होना | left |
| `थी` | 364 | "was" | **Yes** | left |
| `थे` | 385 | "were" | **Yes** | left |
| `था` | 386 | "was" | **Yes** | left |

---

## 3. What was merged, and the blast radius per chunk

Every one of these was dry-run first through the dashboard's own sweep
(`POST /api/v2/validate/eng_for_hin` with the `override` payload, which validates a *simulated*
post-edit state without mutating the DB), and separately through the course-builder's own
`checkVocabViolations` over the whole course with correctly accumulated vocabulary. Both were run
per-chunk and for all six combined.

| Seed | LEGO | Chunk that now carries the meaning whole | Cue retired | Sibling cues kept | Own basket | Decomposition refs to the LEGO, course-wide | Phrases course-wide containing the Hindi cue | Repaired |
|---|---|---|---|---|---|---|---|---|
| 9 | S0009L02 | `बोलता हूँ → "I speak"` | `हूँ → "I"` | `बोलता → "speak"` | 8 | 30 | 364 | **0** |
| 325 | S0325L02 | `पर विचार करना होगा → "needs to consider"` | `होगा → "needs to"` | `पर → "on"`, `विचार करना → "consider"` | 9 | 12 | 50 | **0** |
| 327 | S0327L01 | `पेश करना होगा → "needs to offer"` | `होगा → "needs to"` | `पेश करना → "offer"` | 9 | 15 | 50 | **0** |
| 354 | S0354L01 | `नहीं दिखना था → "didn't need to appear"` | `नहीं था → "didn't need to"` | `दिखना → "appear"` | 9 | 15 | 52 | **0** |
| 355 | S0355L01 | `से बात करनी थी → "need to talk to"` | `थी → "need to"` | `से → "to"`, `बात करनी → "talk"` | 9 | 17 | 115 | **0** |
| 621 | S0621L02 | `हिम्मत नहीं होती → "wouldn't have dared"` | `नहीं होती → "wouldn't have"` | `हिम्मत → "dared"` | 9 | 9 | 5 | **0** |

**Nothing needed repair, and that is a measured result, not an assumption.** The reason is the
one the precedent's seed-30 revert taught: the question is not "how many phrases use this word"
but "how many phrases *depend on this tile existing separately*".

The course's vocabulary gate tiles a phrase out of whole taught chunks (`extractVocab` returns
the entire chunk string). Removing a component removes one tile. So I ran the real gate over
**every phrase in the course** with the tile present and with it absent:

| | phrases |
|---|---|
| Phrases failing the vocabulary gate before | 587 (all pre-existing) |
| Phrases failing after all six merges | 587 |
| **Phrases that lost tileability** | **0** |
| Seeds failing the course-wide validator before / after | 46 / 46, **identical sets** |

Why zero, when e.g. `"need to"` had **exactly one** source in the whole course? Because the 326
phrases containing "need to" all tile through larger obligation chunks that are themselves taught
whole (`"need to talk to"`, `"didn't need to appear"`, `"doesn't need to buy"`). The bare tile was
never load-bearing. `"needs to"` survives independently at seed 326 (`की ज़रूरत है`) as well.

**This is the check that killed the seed-30 कल attempt** — 113 phrases tiled through that chunk and
only 17 involved the frame being fixed. Here the same check comes back clean, which is why these
six could proceed and that one could not.

---

## 4. The four left alone, and why

`हो → "be"` (346), `थी → "was"` (364), `थे → "were"` (385), `था → "was"` (386).

These are the same *shape* — a bare copula standing as a drilled cue — but the gloss is a **true
translation of the word standing alone**. A learner cued `था` answers "was" and is right. Nothing
about the surrounding construction has been smuggled into the gloss, so there is no learner-facing
defect to fix, and the brief's rail is explicit: do not rewrite text that is not wrong.

Removing them would also cost something for nothing:

| Cue | Phrases that would lose tileability |
|---|---|
| `थी → "was"` (364) | 1 — `S0365L01U03` *"he didn't hear that I was there"* |
| `थे → "were"` (385) | 2 — `S0477L03B02` *"were sick"*, `S0604L01U03` *"…and we were very happy"* |
| `हो → "be"` (346), `था → "was"` (386) | 0 |

**If Kai wants the class removed on the structural argument** (a copula is a construction-feature,
never a unit of meaning — canon L7), all four go the same way and three phrases at seeds 365, 477
and 604 need re-tiling first. One word from him and it is a small job. I did not take that decision
myself because it is a taste call about what a cue may teach, not a correctness call.

---

## 5. Found beyond the eight, not fixed

### 5a. `क्या → "did"` at seed 355 — real, but not free

`S0355L03` is `क्या उसे → "did she"` and its first component cue is `क्या → "did"`.

`क्या` is the Hindi yes/no question particle. It is not "did" — the past tense in the English
answer comes from `थी` at the end of the sentence. So this is the same defect, and by canon **L7**
("grammatical particles are construction-features, never atomic LEGOs") it should not stand as a cue.

**But it is the only source of the tile `"did"` in the entire course**, and retiring it strands five
phrases at seed 385:

> "did you agree with her there?" · "did you agree with her?" · "did you agree with her today?" ·
> "did you agree with her last year?" · "did you agree with her here?"

Those five are *related* to the construction, not unrelated bystanders, so this is not the seed-30
situation — it is a genuinely fixable case that needs authoring rather than deletion:
`S0385L01` would need its own question chunk (e.g. `क्या आप … थे → "did you …"`) before `क्या` can
be retired. That is new content on a live course, so it is Kai's call, not mine.

No ZUT risk today: bare `क्या` appears exactly once in the course, so it has one right answer.

### 5b. `से बात करनी थी → "need to talk to"` is the wrong tense

Seed 355's LEGO glosses a **past** Hindi chunk (`थी`) with a **present** English one. Its own USE
phrases already say "did you *need to* talk to…", which carries the past through the question frame,
but the bare chunk and its debut BUILD read "need to talk to". Changing the LEGO target would ripple
through 9 phrases and null audio on a course that cannot re-render, so I left it. Flagged.

### 5c. `सकता हूँ → "I can"` (seed 10) and `चाहूँगा → "I'd like"` (seed 12)

Same "where did the *I* come from" shape, but these are **not** bare copulas — `चाहूँगा` is a
lexical verb carrying its own 1sg inflection, and `सकता हूँ` is a two-word modal chunk. In a
pro-drop language, glossing an inflected 1sg form with an English subject pronoun is defensible.
Not touched, mentioned for completeness.

### 5d. `उससे सहमत थे → "agree with her"` (seed 385) is present-tense English on a past Hindi chunk

Noticed while checking 385. Its sibling at 386 (`उससे सहमत था → "agreed with her"`) gets it right.
Out of scope, not touched.

---

## 6. The invariants the brief named

### Decomposition still concatenates to `target_text`

The failure repaired earlier today (a punctuation edit that broke 1,194 rows) was checked
explicitly, course-wide, before and after:

| | phrases |
|---|---|
| Phrases with a stored decomposition | 10,931 |
| Decomposition not concatenating to `target_text` (whitespace-normalised) — **before** | **0** |
| — **after** | **0** |

*(Note for the next agent: the decomposition tiles concatenate with **no** separator — their `target`
fields carry their own leading spaces. Joining them with a space instead reports ~1,600 false
positives, all of them a phantom gap before a "?".)*

### Audio — nothing lost, nothing generated

This course is all-xAI and xAI is retired, so a lost clip pointer here cannot be re-rendered.
The components backfill route deletes and re-creates component rows, which drops their audio
pointers, so every surviving cue was re-linked afterwards under a guard: the clip's `role` and
`text_normalized` had to match the row's current text before the pointer was written.

| | count |
|---|---|
| Practice-phrase rows before / after | 10,953 / 10,947 |
| Rows removed (the six retired cues) | 6 |
| Build/use phrase texts changed | **0** |
| **Surviving rows anywhere in the course that lost an audio pointer** | **0** |
| Clip pointers re-linked after the delete/recreate | **24** (8 surviving cues × known + target1 + target2) |
| Guard failures / mismatches | 0 |
| Parent LEGO rows that lost audio | 0 (all six keep known + target1 + target2 + presentation) |
| TTS generated | **none** |
| Audio passes queued | **none** — no learner-facing text changed, so none is warranted |

One row changed text: `S0621L02C01` went from `नहीं होती → "wouldn't have"` to
`हिम्मत → "dared"`. That is the component slot-id shifting up when the *first* component is the
one retired, not an edit — and its pointers were re-linked to हिम्मत's own clips, verified against
`course_audio.text_normalized`.

**A ruling discovered in passing:** component rows are refused a `presentation_audio_id` by a DB
trigger — *"Components are never introduced (Tom, 2026-08-06): only LEGOs get introductions."*
The old rows carried one; the re-created rows correctly do not. That pointer was not restored, and
should not be.

### Seed approval (O5)

All six seeds have `approved_at = null`. Unapproving is a no-op here.

---

## 7. How this was done

All content writes went through the dashboard's own endpoints. No bespoke data script:

- `POST /api/course/eng_for_hin/components/backfill?force=true` (course-builder, 3471) — set the
  reduced component list and regenerate the cue rows
- `POST /api/v2/validate/eng_for_hin` (3471) — the dry runs (via `override`) and the before/after sweeps

The one exception, stated plainly: the 24 guarded audio re-links are direct `PATCH`es of the
`known_audio_id` / `target1_audio_id` / `target2_audio_id` columns, because no dashboard endpoint
exposes them and the alternative was leaving live slots silent on a course that cannot re-render.
This is the same exception the precedent job took, for the same reason.

Work ran strictly sequentially in ascending seed order — 9, 325, 327, 354, 355, 621 — one seed at a
time, re-reading each LEGO and its cue rows immediately before writing. A second worker was applying
a course-wide कल rule to the same course concurrently; that worker moved the validator baseline from
86 failing seeds to 46 mid-run, which was detected by re-baselining and is why the numbers above are
all quoted against the fresh 46-seed baseline.

---

## 8. Open for Kai

1. **The four truthful bare copulas** (§4) — remove the whole class on the structural argument, or
   leave them? Three phrases need re-tiling first if they go.
2. **`क्या → "did"`** (§5a) — needs a question chunk authored at seed 385 before it can be retired.
3. **Seed 355's tense** (§5b) and **seed 385's tense** (§5d) — both are LEGO-text edits on a live
   course that cannot re-render audio.
