# xAI de-hiss — PR #17 / issue #17

**Status:** Reprocess of all existing xAI audio **complete** (142,973 files, 0 failures).
Pipeline change for *future* renders is **PR #17, OPEN**, awaiting Tom's call on mastering approach
(de-hiss vs clean-master — see divergence note below). Pipeline wiring lives on `kai-stage`; `main`
does **not** have it.

## The finding (proven, not guessed)

xAI voices (eve/ara/leo) bake a steady **~−79 dBFS broadband noise bed ("tape hiss")** into their
**raw** output. Azure/ElevenLabs raw is true digital silence. Our master chain's make-up gain
(loudness-normalise to −16 LUFS; xAI renders quiet at ~−26 dB RMS) then lifts that bed to an audible
**~−67 dB** at ship. Deborah flagged it on the new `eve` intro voice.

Stage-by-stage probe (`local-tooling/hiss-chain-probe.cjs`, same English text, eve vs Azure Sonia control):

| stage | xAI eve | Azure (control) |
|---|---|---|
| raw (pre-master) | **−79 dB** | −inf (silent) |
| + make-up gain | −62.6 (+16.5 dB) | −128.9 (+14.9 dB) |
| shipped | **−67 dB** | −133 dB |
| + denoise (the fix) | **−inf** | −inf |

Same chain, near-identical gain, 66 dB apart at ship → **the hiss is in xAI's raw render, not
manufactured by the chain.** "Fix the chain" isn't available: the +16.5 dB is real loudness
normalisation. Full writeup: `docs/xai-hiss-chain-analysis-2026-07-29.md` (now committed).

## The fix (PR #17)

Mild FFT denoise **`afftdn=nf=-25:nt=w`** prepended to the chain **before** `PRE_COMPRESS`, **gated
to `provider==='xai'`**:
- `services/audio-processor.cjs`: `PRE_DENOISE` const + `normalizeAudio(…, {denoise})`.
- `phase8-audio-v13.cjs`: `masterAudio(buf, text, {provider})` → denoise only when xai; all 7 call
  sites pass their provider var. Azure/ElevenLabs pass through unchanged (verified: nothing to remove).
- Speech preserved: core 300–3400 Hz −0.56 dB, consonant 3.4–8 kHz −1.7 dB, duration bit-identical.

## Reprocess of existing audio (DONE, out of band — not part of the PR)

- **142,973 files reprocessed, 0 failures, 0 ms duration drift.** DB `xai_*` counts == processed counts.
- Denoise-only (NOT a re-master): download mastered mp3 → `afftdn` → upload to a **new** s3 key →
  PATCH `course_audio.s3_key` only. Originals **retained** under old keys for rollback.
- Tools (copied into `local-tooling/`): `reprocess-xai-hiss.cjs` (original, `--rollback <log>`),
  `tmp-dehiss-reprocess.cjs` (floor-gated idempotent version — only de-hisses rows measuring
  RMS-trough > −75 dB, so it never double-denoises and skips clean/ElevenLabs rows).
- Rollback: `node scripts/reprocess-xai-hiss.cjs --rollback <course-log>`. Mapping logs
  (old→new per row) at `temp/hiss-reprocess/*-done-*.jsonl` (local) **and** durably at
  `s3://<bucket>/backups/hiss-reprocess-logs-2026-07-29/` (19 files).

## ⚠️ The branch-divergence gotcha (critical for whoever generates audio next)

- The de-hiss pipeline wiring is commit `df61179a`, on **kai-stage** — never merged to origin/main.
  Tom on 2026-07-29 took a **different** direction on main ("clean-master", `ad11908e` /
  `normalizeAudioClean` — drops the compressor + make-up gain instead of denoising). Neither branch
  is a superset of the other.
- **Generating xAI audio from a `main` checkout produces HISSY renders** (main's default
  `normalizeAudio` has no `afftdn`). Symptom: ~−60 dB noise floor.
- `d0d1910e` merged origin/main → kai-stage **keeping de-hiss** (so kai-stage now has main's audio
  gates *and* de-hiss). **Generate from kai-stage phase8 (has de-hiss + gates)** — or cherry-pick
  `df61179a` into a main worktree first.
- The 07-29 reprocess was **not** fleet-complete: `eng_for_hin`/`eng_for_ben` pre-07-29 xAI rows
  were still hissy on 08-03 (kan/sin were clean). Never assume "old = already reprocessed" — use the
  floor-gated `tmp-dehiss-reprocess.cjs`, which measures before acting.

## Exact next step

1. **Tom's decision on PR #17:** land the gated denoise, OR converge the production path onto his
   `normalizeAudioClean` clean-master approach instead. PR #17 explicitly offers to close if he
   prefers clean-master; the probe data is meant to inform that call. Kept `normalizeAudioClean`
   untouched.
2. Kai: A/B-listen the clone voices (samples: `temp/hiss-ab-2026-07-29/`), then commit the pipeline
   wiring on whichever branch is canonical + re-enable Mac sleep (`sudo pmset -a disablesleep 0` —
   was disabled to let the overnight reprocess run).
3. Follow-up: `pod-explainer-composite.cjs:302` (mixed-provider composite) left as-is; revisit once
   the mastering approach is settled.

## Gotchas

- `voice_id LIKE 'xai_%'` **times out** on `course_audio` (unindexed) — use `voice_id=in.(…)` +
  **keyset pagination by id**. Equality/IN filters are fast.
- `known` side is **mixed provenance**: old rows have hash voice_ids (e.g. `gfzdpspr5fdp`, clean
  ElevenLabs) — only `xai_*` (and unprefixed eve) are hissy. Never touch target1/target2 (Azure).
- `aws` CLI = 9 s cold-start per call → use `@aws-sdk/client-s3` persistent client (0.2/s → 12/s).
