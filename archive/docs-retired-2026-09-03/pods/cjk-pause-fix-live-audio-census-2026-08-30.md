# CJK pause fix — what is still bad in LIVE audio (2026-08-30)

**988 pod turns are being served to learners today with pre-fix, cue-less audio** — a single
undifferentiated take, recorded before the 2026-08-24 regex fix, in a pod whose visibility is
`live`. A further 426 turns have the same pre-fix audio problem but sit in `held` pods, not
reaching a learner yet.

This builds on `docs/pods/cjk-pause-cue-fix-2026-08-24.md` ("the fix doc"), which counted **1,431
turns that would render differently** under the new sentence splitter — a count of *text*, not of
*existing audio*. This document answers the question the fix doc explicitly did not: of those
turns, how many have a rendered clip, and is a learner hearing it right now.

No audio was rendered, queued, deleted or edited to produce this document. Read-only queries only.

## Headline

| | Turns |
|---|---|
| Affected turns re-derived today (fix doc: 1,431 on 2026-08-24) | **1,418** |
| — of which have a rendered whole-turn clip linked at all | 1,414 |
| — of which that clip is confirmed pre-fix (see method, below) | 1,414 |
| **→ pre-fix clip, in a `live` pod (served to learners now)** | **988** |
| → pre-fix clip, in a `held` pod (staged, not yet reaching a learner) | 426 |
| Affected turns with no clip linked at all (genuinely unrendered) | 4 |

The 1,431 → 1,418 drop from the fix doc's snapshot is expected content churn over six days, not a
methodology difference — I re-ran the identical regex from `services/phases/phase8-audio-v13.cjs`
(`origin/main`, unchanged since the fix landed) against the current DB, and the **total row count
matches the fix doc exactly (23,872 `listening_pod_sentences` rows)**. Someone edited a handful of
these specific rows' text in the interim (most likely `ara_for_eng`/`ara_eg_for_eng`/`ara_sy_for_eng`/
`fas_for_eng`/`jpn_for_eng`, each 2–3 lower than the fix doc's table), which is normal pod-content
work, not a sign the fix doc's method was wrong.

## Method — two independent checks, and they agree everywhere

For each of the 1,418 affected turns with a clip, I checked pre-fix status two ways, per the brief:

1. **By timestamp**: `course_audio.created_at` before the fix landed, `2026-08-24 14:06:42Z`.
2. **By text**: the fix doc records that the pause cue (`" … "`) *is* the clip's stored/canonical
   text — a post-fix render of a multi-sentence turn would carry the cue, a pre-fix one won't. I
   checked whether `course_audio.text` contains the cue.

**The two discriminators agree on all 1,414 rows with linked audio — zero disagreements.** Every
clip that predates the fix by timestamp also lacks the cue in its stored text, and vice versa.
That is a clean result: it means no partial/silent re-render has slipped through uncounted, and
the "pre-fix" bucket below is not a judgment call.

"Rendered clip" here means the **whole-turn take** the regex bug actually produced (one clip per
turn) — not the per-sentence spliced clips in `sentence_audio_ids`/`sentence_known_audio_ids`,
which is the other reading the brief flagged as possible. For reference, the per-sentence reading:
of the 1,418 affected turns, only **1,034 have ever been spliced into per-sentence clips at all**
(1,859 live spliced clips + 893 held spliced clips = 2,752 individual clips); the other **384 have
a whole-turn take but were never spliced** — plausibly *because* of this exact bug (no engineered
pause meant the splicer had nothing reliable to cut on, which is what the fix doc says forced 3
Chinese turns out of the 2026-08-24 Pod 1 splice pass). I have not verified that causal link; it's
offered as context, not a finding.

## By course and track

| Course | Track | Affected turns | Have a rendered clip | Live (served now) | Held (staged) |
|---|---|---:|---:|---:|---:|
| jpn_for_eng | target | 300 | 300 | 102 | 198 |
| zho_for_eng | target | 270 | 270 | 93 | 177 |
| ita_for_jpn | known | 97 | 97 | 97 | 0 |
| zho_for_jpn | known | 97 | 97 | 97 | 0 |
| fra_for_jpn | known | 95 | 95 | 95 | 0 |
| deu_for_jpn | known | 94 | 94 | 94 | 0 |
| spa_for_jpn | known | 94 | 94 | 94 | 0 |
| eng_for_jpn | known | 92 | 92 | 92 | 0 |
| eng_for_zho | known | 92 | 92 | 92 | 0 |
| zho_for_jpn | target | 83 | 83 | 83 | 0 |
| ara_eg_for_eng | target | 26 | 26 | 9 | 17 |
| ara_for_eng | target | 26 | 26 | 9 | 17 |
| ara_sy_for_eng | target | 18 | 15 | 6 | 9 |
| fas_for_eng | target | 17 | 16 | 8 | 8 |
| eng_for_ara | known | 8 | 8 | 8 | 0 |
| eng_for_urd | known | 9 | 9 | 9 | 0 |
| **TOTAL** | | **1,418** | **1,414** | **988** | **426** |

"Known" track = the course's *known* language is CJK (e.g. `eng_for_jpn` teaches English to
Japanese speakers; the Japanese side is the known-language pod text that hit the same bug).

## By language

`course_audio.language` is stored inconsistently across these courses (`jpn`/`ja`/`ja-JP` all
appear for Japanese, `ara`/`ar`/`ar-EG`/`ar-SA`/`ar-SY` for Arabic, etc. — this is the same
"language does two jobs" mess `phase8-audio-v13.cjs`'s own comments flag elsewhere in the file). I
normalised for readability below; the raw column still has the variants.

| Language | Affected turns w/ clip | Live | Held |
|---|---:|---:|---:|
| Japanese | 856 | 658 | 198 |
| Chinese | 445 | 268 | 177 |
| Arabic | 75 | 32 | 43 |
| Persian | 16 | 8 | 8 |
| Urdu | 9 | 9 | 0 |
| English (known side of eng_for_jpn/eng_for_zho) | 13 | 13 | 0 |
| **TOTAL** | **1,414** | **988** | **426** |

## Separately labelled, per the brief

- **Pending/unrendered slots** (clip row exists but `s3_key` starts `pending/`): **0** among the
  affected population.
- **Human-origin recordings** (`origin='human'`): **0** among the affected population. Nothing
  here would risk re-rendering a real human recording.
- **Genuinely no clip at all** (no `target_audio_id`/`known_audio_id` linked): **4** rows — 3 in
  `ara_sy_for_eng:pod-0` (a **live** pod) and 1 in `fas_for_eng:pod-0-unrecorded` (a **held** pod,
  named for exactly this). These aren't part of the 988/426 above; they're a different problem
  (missing audio entirely, not stale audio) and outside this census's question, but flagged since
  they sit inside the same affected-turn population:
  - `ara_sy_for_eng:pod-0:SC18-S007`, `SC08-S006`, `SC22-S001` (live)
  - `fas_for_eng:pod-0-unrecorded:SC07-S011` (held)
- **Arabic/Persian `؟` rows**: **104** of the 1,418 affected turns (75 Arabic-language + 16
  Persian-language + a handful of English-known-side rows in `eng_for_ara`/`eng_for_urd` that
  split on the target side) are the `؟` half of the new expression, not CJK — carried forward from
  the fix doc's own labelling, not newly conflated here.

## Gaps

- **6-day drift between the fix doc's snapshot and today's**: 13 fewer affected turns overall
  (1,431 → 1,418), concentrated in the Arabic/Persian/`fas` courses and `jpn_for_eng`. I did not
  chase down which specific rows changed or why — that's pod-content history, not this job's
  question, and the total `listening_pod_sentences` row count is unchanged (23,872), so nothing
  was deleted wholesale.
- **`audio_revision` / in-place update risk**: the brief warned that a clip could in principle be
  re-rendered *in place* (same `course_audio.id`, `audio_revision` bumped, `created_at`
  unchanged) rather than via a new row, which would make the timestamp discriminator lie. I did
  not independently audit `audio_revision` history for these 1,414 rows beyond the text-cue cross-
  check above. The text-cue discriminator does **not** have this blind spot — an in-place re-render
  that finally added the cue would show up as a text-based "post-fix" even if `created_at` were
  stale — and it agrees with the timestamp discriminator on all 1,414 rows. I read that agreement
  as strong evidence no in-place re-render has happened yet, but I have not proven the negative by
  inspecting `course_audio_revisions` directly.
- **The 4 no-clip-at-all rows**: I did not determine why (e.g. whether they're scheduled, blocked,
  or simply never reached in the render queue) — flagged above as a separate line, not folded into
  either the 988 or the 426.

## What this document does not do

No recommendation on whether to re-render, and no cost estimate — that's Tom's ruling on the
standing TTS approval gate, and Watson's framing, not this document's.
