# Phase 8 re-think: the slot ledger + judgment-authored presentations

*2026-07-05. Status: **DESIGN AGREED with Tom** (register, model, voice delivery all ruled). Implementation not started.*

## Why (the ben_for_eng story)

On 2026-07-04 the audio page for ben_for_eng showed **20,385 Total / 18,528 Generated / 1,857 Pending / 0 Failed** next to a Missing Audio panel showing **3 missing**. Both panels read the same backend computation (`getAudioNeeds()` in `services/phases/phase8-audio-v13.cjs`) but surface different fields in different units:

- "Generated" counts **deduped audio assets** (distinct text+lang+role keys),
- "Pending" counts **work-queue items** (what Generate would TTS),
- "Missing" counts **unlinked slots** (null FK pointers — the only unit a learner would notice).

The 1,857 was almost entirely **presentation placeholder rows**: LEGO-intro *text* written by the "Generate Missing Presentation Text" button and parked in `course_audio` with `s3_key LIKE 'pending/%'`, awaiting TTS. 1,147 of them had `lego_id = null` (component intros), a class the code itself warns can be orphaned. "Failed" is hard-coded 0.

**Root causes:** (1) audio-that-doesn't-exist stored in the audio table; (2) a two-trigger pipeline (text, then audio) whose intermediate state leaks into every counter; (3) three units presented as one progress bar.

## The source of truth (unchanged, now stated)

The FK pointers on content rows — `course_practice_phrases` / `course_legos` / `course_seeds` → `*_audio_id` → `course_audio` — are what the learner app plays. Everything else is a derived view.

## Part 1 — the slot ledger

A **slot** = content row × role. Every slot is in exactly one state:

| State | Meaning | Transition (one button each) |
|---|---|---|
| LINKED | real audio bound | — |
| LINKABLE | audio exists, pointer missing | Link (free) |
| NEEDS-TTS | text known, no audio | Generate (costs money; cost estimate = this count × rate) |
| UNGENERATABLE | punctuation-only text | surfaced, never counted as work |
| OUT-OF-SCOPE | beyond release target / unreleased status | — |

Progress = LINKED ÷ in-scope. One number per state; no second panel that counts differently. The former NEEDS-TEXT state is **abolished** (see Part 2). `course_audio` only ever holds real audio — the `pending/%` convention dies.

## Part 2 — presentations: frozen frames, judged context, known-voice delivery

Presentation text was never creative *per LEGO* — it's a frame with slots. The one per-LEGO decision that matters is **whether to include the disambiguating context** ("as in — '<seed>'"), whose job is to let the learner place a mid-sentence fragment. That decision needs judgment, not a dice-roll (the old code used ~15% random variety).

**Authoring (agent, at generate time — no stored intermediate):**
- **Frames are frozen per known language** in `presentation_templates`, hand-verified once. Exactly two shapes:
  - Frame A (bare): `The {target_lang_name} for '{chunk}' is —`
  - Frame B (context): `The {target_lang_name} for '{chunk}' — as in — '{seed}' — is —`
  - For non-English known languages the frames are rendered natively ONCE (e.g. Hindi "…की अंग्रेज़ी है:", and the native "in the sentence '{seed}' — the chunk '{chunk}' —" construction for Frame B), then frozen. Register drift becomes impossible by construction.
- **The agent (Sonnet 5, `--effort low`, via the Claude CLI — never the SDK/API) does three things only:** choose A or B per LEGO, fill the slots verbatim, and emit `FLAG:` lines for suspected content errors. Batched ~25 LEGOs/call; output is regex-validatable against the frozen frame (retry on mismatch).
- **Both intros end at "is —".** The target form is NOT spoken in the intro clip.

**Delivery (matches the existing player flow — no player change):**
- The intro clip is **known-side voice only**; the player then plays the LEGO's existing target audio (target1/target2 clips), which every LEGO already has. Perfect voice-consistency with the reps, zero extra TTS on the target side.
- Known-side voice: English-known courses (X_for_eng) use **Tom's xAI clone** (`voice_id gfzdpspr5fdp`, ruled 2026-07-04). eng_for_X courses keep their per-language known voice.
- **Piloted and REJECTED 2026-07-05:** a single multilingual voice speaking the whole intro *including* the target form. Tom's ear test: the clone needs "priming" to render target languages reliably — not worth the uncertainty across the whole course suite. Clips: `~/Desktop/presentation-pilot/`.

**Model choice (measured 2026-07-05, identical locked-register prompts, 4 courses):**
- Sonnet 5 low effort: 5–9s per 8-LEGO batch; correct A/B judgment on fragments; clean scripts everywhere; caught a real data bug (eng_for_hin S0021L03 'उसकी नाम' vs seed's 'उसका नाम') plus a Tamil chunk/seed case mismatch.
- Haiku 4.5: 25–134s (overthinks); barely exercised the A/B judgment (zho: 0 of 8); **corrupted Tamil script with Devanagari characters** — disqualifying for unattended multilingual runs.
- Ruling: **Sonnet 5, effort low.** (Consistent with the 2026-07-03 tiering rule: Haiku only when "dumb enough is the feature"; this task has a decision in it.)

## One button

`Generate` = for every NEEDS-TTS presentation slot: author (frozen frame + A/B judgment) → validate against frame → TTS (known voice) → write real `course_audio` row → bind `presentation_audio_id`, all in one pass. Plan/Preview shows the authored lines (and FLAGs) before spend. The per-LEGO override endpoint (`providedText`) survives as the manual exception. The readiness gate (`checkPresentationReadiness`) and `/regenerate-presentations` as a user-facing stage are deleted.

`FLAG:` lines are logged (surface in the dashboard as a content-QA feed — free QA channel from the authoring pass).

## Consumer paths (verified 2026-07-05 — NOT an open decision)

Two playback paths exist in ssi-learning-app and BOTH are live: `api/courses/[code]/cycles.ts` INTRO cycles read `lego.presentation_audio_id`, and `LearningPlayer.vue` loads intro audio via `loadIntroAudio()` (useScriptCache) from the `lego_introductions` table (22,650 rows / 45 courses; carries both `presentation_audio_id` and legacy `audio_uuid`).

They are two synced projections of one fact, not two sources: phase8's post-TTS write already upserts `lego_introductions` AND binds `course_legos.presentation_audio_id` in the same pass (`onConflict: course_code,lego_id` — see phase8-audio-v13 ~L3125 bulk, ~L3784 single-LEGO). **The new one-button Generate must reuse that same bind helper — nothing more.** Pre-TTS `pending/%` rows never enter `lego_introductions`, so the pending-row purge needs no reconciliation. Collapsing the redundancy (retiring one projection) is optional later tidying, not a gate. Component intros bind on `course_practice_phrases.presentation_audio_id`.

## Migration

1. Ship the one-button path (author→TTS→bind in `/generate`).
2. Delete all `s3_key LIKE 'pending/%'` rows across courses — they are recomputable by construction (ben_for_eng alone: 1,856).
3. Remove the gate + the separate text stage from UI and phase8.
4. Repoint the dashboard counters at the slot ledger (Part 1).
5. Pilot course: ben_for_eng; then the suite. Existing already-generated presentation audio is untouched (regenerate per course only when re-voicing is wanted).

## Open items

- eng_for_X known-voice frame renderings: hand-verify the frozen frames per known language (one-off, ~19 languages).
- The sibling confusions logged on WORKLIST 2026-07-04 (schools rollup etc.) are separate lanes.
