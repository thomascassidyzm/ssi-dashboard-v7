# A-136 — Noor is out of the Dutch cast

**Date:** 2026-08-17 · **Ruling:** Tom, A-136 — drop Noor, re-render on Femke, make-before-break.

Noor (`247783ebdd51`, xAI Dutch female) clicked on 5 of 5 diagnostic lines. She is now out of
`nld_for_eng` everywhere she could be cast, and every clip that was hers is Femke's.

**Nothing was deleted.** Every superseded Noor object is still on S3 at the key recorded in
`course_audio_revisions`. If any of this is wrong, it reverts.

---

## Listen — is the click gone?

LISTEN_LINK_PLACEHOLDER

Same line twice: **A** is the Noor take that was serving until today, **B** is what is live now.

---

## Before and after

| | before | after |
|---|---|---|
| clips credited to Noor in `nld_for_eng` | **341** | **BEFORE_AFTER_NOOR** |
| of those, learner-reachable | 185 | 0 |
| clips credited to Femke | 161 | **FEMKE_AFTER** |
| Noor in the pod cast (`listening_pods.speakers`) | 6 speakers × 2 pods | 0 |
| Noor in the pod voice pool (`app_config`) | already absent | absent |
| Noor in `courses.voice_config` | already absent | absent |
| Noor in `tools/pod-voices-xai.json` | present in `nl` | removed |
| `voices.is_active` | `true` | `false` |

**Total spend: SPEND_PLACEHOLDER.**

---

## What "clean" was measured against

Main's render chain is compressor-free since A-131/A-132, but it has **no end-of-speech trim** — the
250 ms tail pad is wired into the chain only on `feat/a133-tail-pad-in-chain-2026-08-17`, which is
**not merged**, and this pass was told not to merge it. So the chain that produced these clips cannot
remove a tick; it can only avoid rendering one. That makes the gate the whole safety argument, so the
gate had to earn trust before any money was spent.

It was calibrated against the nine published A-133 evidence takes, whose verdicts came from Tom's
ear. It independently reproduces the doc's headline number — Noor's loudest tick at **−24.8 dB rel
peak, +44.8 dB above the room floor it interrupts, a quarter-second after the last word** — and
returns **zero** for every voice A-133 measured clean (Femke, Thijs, Azure, and Noor's own trimmed
take), on both chain variants. It is committed as `--calibrate`, so it can be re-run whenever the
gate is touched.

The first version of the detector was wrong and flagged Azure and Thijs too: the end-of-speech mark
was landing mid-sentence, so trailing speech read as impulses. Rewritten as run-length segmentation —
a tick is a *short detached burst in dead air*, not the last syllable of a word.

Every clip also had to clear: object alive on S3 at the byte length written, decodable, duration
within 5% of the mastered length, duration not collapsed or runaway against the clip it replaces, and
an unprimed whisper decode within CER 0.25 of the text.

RESULTS_PLACEHOLDER

---

## Why Femke, and why that is not a cast collision

Tom named Femke. Three independent things agree with him:

1. She sits at **index 0 of `app_config.pod_voice_pools.nld.f`** — after the A-133 recast she *is* the
   cast female for Dutch.
2. A-133 measured her raw provider tail at a **−83.4 dB floor with zero post-speech impulses**, where
   Noor showed two. She is the measured-clean member of the pool.
3. `POD_VOICES_PER_GENDER = 1` — a pod is **one voice per gender by design**.

Point 3 is the one worth flagging, because the surface reading goes the other way. Femke already
voiced Narrator and Sarah, and every one of Noor's six speakers shares a scene with the Narrator, so
this looks like it merges the narrator and the characters into one voice. It does — and that is the
intended end state, not a regression: a multi-voice stored cast is earlier casting leakage, and
convergence to one voice per gender is what the pool is for. Dutch pod-0 now runs **8 female speakers
on Femke**, all 23 speakers intact, none left without a voice.

**If you'd rather Dutch kept distinct voices per character, say so and it is a re-render, not an
argument** — but it would be a change to the pod design, not a fix to this pass.

---

## How the swap was done

**In-place voice swap on the clip row, not insert-and-relink.** All 185 learner-reachable references
live in `listening_pod_sentences` across three columns, two of them `uuid[]` arrays
(`target_audio_id`, `takeg_audio_ids`, `sentence_audio_ids`). Rewriting those arrays was the only
step in this job that could silently orphan a learner-facing slot, so it was avoided entirely:
updating the row moves every reference for free.

Checked safe before relying on it — none of the 341 rows had a `clip_id`, an `audio_clips` canon row
or a `course_audio_envelope` row, and a sweep of **twelve** other audio-reference surfaces
(`sentence_known_audio_ids`, `pod_legos`, `seed_cycles`, `practice_prompts`, `lego_introductions`,
signoffs, flags, QA clips…) returned zero. The three pod columns are the complete set.

Per clip: render → upload → verify the new object on S3 → and only then does the live row point at
it, inside a transaction whose `UPDATE` is guarded on the old `s3_key`, old `voice_id` and exact
text, with post-conditions that abort on any text/audio desync. A rejected render is left on S3 as
evidence and the old clip keeps serving.

### The six duplicates

Six Noor rows shared `(course, text, language, role)` with a Femke clip that already existed, so
their `voice_id` could not move to Femke without violating `unique_course_audio_per_voice`. Those
were **relinked to the existing Femke clip** — no render, no spend — and each relink asserts zero
remaining references to the Noor row before committing.

DUPLICATES_PLACEHOLDER

---

## Verification, from the live DB and S3

VERIFY_PLACEHOLDER

---

## Explicit gaps

GAPS_PLACEHOLDER
