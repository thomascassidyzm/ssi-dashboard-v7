# deu_for_eng re-voice — completed 2026-08-04

Closes the re-voice started in a47e1d6d. 129 clips moved onto the course's
configured voices; **0 failures**; the course still gates to **0 confirmed silent**.

## The bug Kai heard

`voice_config` (verified live, unchanged since 2026-01) is
known=`eve` / target1=`ara` / target2=`leo` / presentation=`eve`, all xAI.

80 English `known` clips were narrated by a **German** voice. The cause was not
random: the pod builder inherited the known-side voice from whichever character
voice the *target* line used, instead of taking it from `voice_config`. The
mapping was mechanical and total —

| pod target voice | known narration got | rows |
|---|---|---|
| `41321eb41295`, `40f31906b23d` | `leo` (German target2) | 58 |
| `458705c07139` | `bedd6226` | 19 |
| `3a7889066fa2`, `ara`, `eve` | `eve` ✅ | 72 |

— so a learner heard the German male voice read the English prompt in exactly
the pods cast with those two speakers.

## What was changed

| group | n | action |
|---|---|---|
| `known` on `leo` / `bedd6226` / `gfzdpspr5fdp` | 80 | → `eve` (61 rendered, 19 merged) |
| `presentation` on `xai_gfzdpspr5fdp` | 35 | → `eve` (4 rendered, 31 merged) |
| `target2` on `azure_de-DE-ConradNeural` | 11 | → `leo` |
| `target1` on `azure_de-DE-KatjaNeural` | 1 | → `ara` |

~3.9k characters of TTS. No Azure/ElevenLabs clip remains in the course.

## What was deliberately LEFT — and why

**The pod target voices are deliberate character casting, not a defect.** A
single pod (`deu_for_eng:pod-0`) legitimately runs six distinct target voices,
mapped 1:1 to the `speaker` column: Barista=`eve`, Waiter/Guest/Friend=`41321eb41295`,
Narrator/Sarah=`458705c07139`, Customer=`3a7889066fa2`, Customer 2=`ara`.
Re-voicing them to `ara` would collapse a multi-speaker dialogue into one
speaker and destroy the pod. **Do not "fix" these:**

- `target1` on `3a7889066fa2` (49), `41321eb41295` (48), `458705c07139` (17),
  `40f31906b23d` (10) — all linked from `listening_pod_sentences.target_audio_id`
- `target1` on `eve` (11) — `eve` cast as the Barista/Tourist character
- `target1` on `44c91d64` (1) — pod-era, unlinked, harmless
- every `pod_*` role (`pod_fine_known`, `pod_explainer`, `pod_take_g`)
- `instruction` / `encouragement` / `welcome` on `human_recording` — never re-synthesised

**`presentation` on `en-GB-SoniaNeural` (27)** — unrendered stubs
(`s3_key='pending/…'`, NULL duration), unlinked, and all 27 texts already covered
by live `eve` clips. Nothing to re-voice. Deleting them would CASCADE into
`lego_introductions.presentation_audio_id`, so they stay.

The 35 `xai_gfzdpspr5fdp` presentations were checked against that same standard
and came out the *other* way — really rendered, real durations, 7 of them linked
to live introductions, against 2369 presentations on `eve`. So they were moved.
`lego_introductions` held 1404 rows with 1404 links before and after.

## Two things learned the hard way

**The tail-guard failures are caused by concurrency, not by the text.** The 12
clips that failed the previous run all died on `masterAudio`'s tail-defect guard
after every retry. Rendered *serially* the same two stubborn texts were accepted
~40% of the time (2/5 each); under `--concurrency 3` they failed 10/10. Adding
terminal punctuation made it **worse** (1/5, then 0/5) — that hypothesis is dead.
Retry stragglers at `--concurrency 1` before concluding a clip cannot be rendered.

**`sentence_known_audio_ids` needed re-linking, not refusal.** 12 of the clips
were referenced from `listening_pod_sentences`' unconstrained ARRAY columns. The
tool could previously only refuse those, which would have left the German voice
reading English in exactly those places. It now swaps the id positionally
(never appends, never dedupes — the arrays are ordered segment indexes).

## Verification

- Every new clip decoded back from S3: duration matches the DB exactly,
  mean −15.0…−16.8 dB, peak −1.9…−5.6 dB, 100% speech.
- All 350 ids deleted across both runs: 0 still in `course_audio`,
  0 dangling scalar links, 0 dangling array entries, 0 nulled pod links.
- `node tools/audio-batch-gate.cjs deu_for_eng` → **0 confirmed**, 18 suspect of
  47,281 (0.04%). All 18 measured audible (0 silent, 0 near-silent), all
  duration/rate-only, and **none of the 18 was created by this job**.
