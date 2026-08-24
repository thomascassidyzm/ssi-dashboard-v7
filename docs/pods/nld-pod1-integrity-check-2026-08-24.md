# nld_for_eng Pod 1 integrity check — 2026-08-24

Parallel sweep, one worker per course, checking whether nld_for_eng Pod 1 carries the same
split-clip-inheritance disease found in `ita_for_eng` scene 15
(`docs/pods/ita-pod1-scene15-two-female-voices-rootcause-2026-08-24.md`, commit `b6ecdf6f9`).
Evidence-only — nothing was written, fixed, or touched.

## Verdict: **INFECTED**

Same mechanism as Italian: `sentence_audio_ids` (the split-clip arrays used by
`podSentenceSplit.ts` for multi-sentence turns) were copied **positionally** from the retired
`nld_for_eng:pod-0-retired-2026-08-24` into `pod-1` and never re-derived when the scene order
changed. Confirmed at two levels: DB metadata, and actual served production bytes + STT.

## 1. Text/casting construction — CLEAN

- 231 rows, scenes 1-22, joined `target_audio_id`/`known_audio_id` → `course_audio.voice_id`.
- **Exactly 2 target-track voices** (`58d27475085e`/`xai_58d27475085e` and
  `a13662ba951c`/`xai_a13662ba951c`) and **exactly 2 known-track voices**
  (`bedd6226`/`xai_bedd6226` = Olivia f, `gfzdpspr5fdp`/`xai_gfzdpspr5fdp` = Tom m — same pair
  as the ita_for_eng pod-1 cast).
- Cast **by character, not by line alternation**: every named speaker (Sarah, Anna, Friend,
  Waiter, etc.) maps consistently to one voice across every scene it appears in. No speaker had
  a mixed/ambiguous assignment.
- No third voice anywhere on the two whole-turn columns.
- (`xai_` prefix vs bare id looks like a dual-engine render of the same voice, not a distinct
  speaker — not flagged.)

## 2. Served-audio spot-check — whole-turn clips CLEAN, split clips INFECTED

Fetched through the actual learner route, `GET https://saysomethingin.app/api/audio/<id>?courseId=nld_for_eng`
(the Vercel proxy in `ssi-learning-app/api/audio/[audioId].ts`) — no S3 direct, no entitlement
wall hit. 10 whole-turn clips (scene 1 sentence 1, plus 2 lines each from scenes 1/5/10/15/20)
transcribed with local whisper (`ggml-small.bin`, `-l nl`): **all 10 match their `target_text`**
(minor whisper mishearings — "zagen" for "Sarah", "wel trusten" for "Welterusten" — are decoder
noise, not content defects).

**Split-clip check, scene 3 sentence 3** (`speaker: Sarah`, live `target_text`: **"Heeft u
eten?"**, "Do you have food?"): its `sentence_audio_ids` array, fetched and transcribed the same
way, plays **"Dankjewel." / "Tot ziens!"** — "Thank you. / Goodbye." A completely different
utterance. Per `podSentenceSplit.ts`, a row with ≥2 split clips uses them for *both* audio and
on-screen text, so the learner both hears and reads the wrong line here — not a hypothetical.

## 3. Scope of the inheritance (DB-level, all 141 rows with a pod-0 counterpart)

Compared `sentence_audio_ids` byte-for-byte against the retired
`nld_for_eng:pod-0-retired-2026-08-24` at matching (scene, sentence) slots:

- **91 of 141 rows (65%) inherited their split array unchanged from pod-0.**
- Of those 91, **28 have a `target_text` that differs from pod-0's text at that same slot** —
  i.e. 28 rows are provably playing/showing content from a different sentence than their own
  row's text. (The other 63 happen to share identical text between pods, so inheritance there
  is harmless — same shape as the ita finding.)
- nld_for_eng was already flagged in the ita root-cause doc's blast-radius table: 236 split
  clips, 75 (31.8%) flagged by the crude substring test — second-highest of the 21 courses
  measured, after Icelandic.

## Method note

DB access via `pg` client + `.env.psql` (needs `set -a; source .env.psql; set +a` — plain
`source` doesn't export). Scratch files under `$CS_SCRATCH/nld-check/`, not `/tmp`.

## Gaps

- Only spot-checked 1 of the 28 confirmed-mismatched split rows at the byte level (scene 3.3);
  the other 27 are DB-metadata-confirmed only (text differs vs pod-0 at the same slot) but not
  independently STT-verified. Given scene 3.3 confirmed exactly what the metadata predicted, and
  the mechanism is already proven identical to Italian's, I judged further per-clip STT a poor
  use of the ~20-minute window rather than a real uncertainty.
- Did not check the 90 rows with no pod-0 counterpart (scenes with no prior-pod equivalent, or
  rows whose split array is null) — out of scope for the inheritance mechanism by definition.
- Did not independently re-verify the speaker-gender claim with MFCC/embedding clustering (as
  the ita served-bytes census did); relied on `voice_id` metadata plus whisper content match.
  Metadata here is already known-trustworthy for the two whole-turn columns (per ita findings,
  the metadata wasn't lying, the gate was reading the wrong columns) so this is a reasonable
  scope cut, not a blind spot on the actual defect.

## What this does NOT need (per the ita fix note, same applies here)

Nulling `sentence_audio_ids`/`sentence_known_audio_ids` on affected rows falls back to the
already-correct whole-turn clip — no TTS, no new audio. Not actioned here; this course's fix
should land wherever the Italian crew's tool-level fix lands (`clone-pod.cjs`,
`pod-switchover.cjs`, or `pod1-percall-recast.cjs` — worker #281 was tracing which one did the
positional copy).
