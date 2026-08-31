# No consent, no voice — the block, and what is already cast without one

**Tom's ruling, 2026-08-31:** a voice with no valid recorded consent must be **refused**, not
warned about. *"we are never going to use a voice without consent."* A standing principle, not
a screen.

This document is the other half of that: **what the estate already holds**. Nothing below has
been changed. Whether any of it gets uncast is Tom's decision.

---

## 1. What now refuses, and where

| Where | What it does now | What it did before |
|---|---|---|
| `PUT /api/voicelab/languages/:language/slot` (`services/voicelab/router.cjs`) | 409 `NO_RECORDED_CONSENT`, no row written, no `voices` row registered | wrote the cast; the screen showed a dialog you could click through |
| `saveVoiceConfig()` (`services/voice-config-service.cjs`) | refuses a save that **newly assigns** an unconsented person's voice to a role | **unchecked** — and this is where every voice actually speaking in the estate is cast |
| `generate()` (`services/tts-service.cjs`) | throws `Voice consent blocked (403)` before any provider is called | **unchecked** — phase8, the pod path, the Voice Lab runner, the tools and production-api all synthesised whatever they were handed |
| Voice Lab casting UI (`CandidateVoices.vue`, `LanguagesPanel.vue`) | no Cast button at all on an unconsented voice — a "consent needed" note instead | a `window.confirm("Cast it anyway?")` |

The decision itself lives in **one** place, `services/shared/voice-consent-gate.cjs`, so the
four call sites cannot drift apart. It reads `services/voicelab/consent.cjs` and forms no second
opinion of its own.

**Who it is about.** Only where the consent question is real: a clone this estate made, a human
recordist, or any voice with a consent state already recorded. The 290 vendor catalogue voices
have nobody behind them to ask and are untouched — the estate renders exactly as it did.

**One addition the data forced.** A `human_*` id with **no `voices` row at all** is refused.
Six of the nine voices below are exactly that: real people, cast, with no record anywhere.
Knowing nothing about a person is the strongest reason to refuse, never a reason to allow.

**It fails closed.** If the consent record cannot be read, the answer is no.

---

## 2. Currently cast with no valid consent: **9 voices**

`voice_language_roles` — the Voice Lab's casting table — holds **zero rows**. Every one of
these is cast in `courses.voice_config`, in `courses.voice_config.podCast`, or in
`listening_pods.speakers`.

| Voice | Consent | What it is | Cast in | Where | Courses | Last touched |
|---|---|---|---|---|---|---|
| `gfzdpspr5fdp` | not_recorded | **Tom's own xAI voice clone** | **1,826** | 20 course roles; 1,566 pod speaker *known* legs; 240 pod speaker *target* legs | deu/fra/fra_ca/por_br/spa_mx `known` + `presentation`, 14 × `eng_for_*` `target2`, +71 more | 2026-08-07 |
| `human_aran_cym_n` | no `voices` row | human recordist (Aran) | 82 | 30 podCast speakers; 52 pod speaker legs | cym_n_for_eng, cym_nnew_for_eng | 2026-01-06 |
| `human_catrinlliar_cym_n` | no `voices` row | human recordist (Catrin) | 58 | 22 podCast speakers; 36 pod speaker legs | cym_n_for_eng, cym_nnew_for_eng | 2026-01-06 |
| `human_aran_cym_s` | no `voices` row | human recordist (Aran) | 56 | 56 pod speaker legs | cym_s_for_eng | 2026-08-23 |
| `human_catrinlliar_cym_s` | no `voices` row | human recordist (Catrin) | 44 | 44 pod speaker legs | cym_s_for_eng | 2026-08-23 |
| `human_tom_zzz` | no `voices` row | test identity | 3 | podCast speakers | zzz_test_for_eng, zzz_test2_for_eng | 2026-08-22 |
| `human_test_f_zzz` | no `voices` row | test identity | 2 | podCast speakers | zzz_test_for_eng, zzz_test2_for_eng | 2026-08-22 |
| `human_sasha_wanasky_deu_at` | no `voices` row | human recordist (Sasha) | 1 | `deu_at_for_eng/target2` | deu_at_for_eng | 2026-08-04 |
| `human_kai_fin` | not_recorded | human recordist (test cast) | 1 | `fin_for_eng/target1` | fin_for_eng | 2026-08-06 |

"Last touched" is the config's own `updatedAt` or the row's `updated_at` — **nothing records
when an individual role was cast**, so it is an upper bound on the cast date, not the date
itself. That is a gap in the data, not in the count.

Reproduce from a checkout with `.env.psql`:
`node tools/voice/census-unconsented-cast-voices.cjs` (every call site) or
`node tools/voice/census-unconsented-cast-summary.cjs` (this table).

### The whole registry, for context

| Consent state | Voices |
|---|---|
| `not_recorded`, type `tts` | 290 |
| `not_recorded`, type `human` | 17 |
| `not_recorded`, type `synthetic` | 1 |
| `authorised` | **1** — `cartesia_f56e05e2-…` (Tom_003), the clone Tom authorised on 2026-08-31 |

Two other clones exist and are **not** cast anywhere: `cartesia_e7ed10ad-…` (Tom_002,
not_recorded) and, of course, `gfzdpspr5fdp` above, which is.

---

## 3. What this means in practice, before anyone is surprised

- **`gfzdpspr5fdp` is Tom's voice and it renders the English side of most pods.** With the
  block live, any *new* render using it fails with the consent message until consent is
  recorded for it. Recording that consent is one form in the Voice Lab and it clears all 1,826
  of these at once. **Nothing already rendered is touched, unlinked or stops being served.**
- **The Welsh recordists are not affected by the render block** — human recordings are spliced,
  never synthesised, and `assertNotHumanVoiceCourse` already refuses TTS on those courses. What
  the block does add is that they cannot be *newly* cast anywhere until there is a record.
- **Nothing was uncast, cleared or deleted.** Item 4 of the brief, honoured exactly.

---

## 4. Explicit gaps — paths NOT covered, said out loud

1. **Serving already-rendered audio is not gated.** The block refuses *casting* and
   *generating*. A clip already in `course_audio`, rendered months ago in an unconsented voice,
   still plays. Pulling shipped audio is a destructive, learner-facing act and is Tom's call —
   the honest position is that the block stops the estate *adding* to the problem and does not
   pretend to have solved it.
2. **`api/pod-cast-voices.js` (PodLab's manual voice choice) writes `listening_pods.speakers`
   directly** and does not consult the gate. It selects from curated `xai`/`azure`/`elevenlabs`
   pools, so in practice it casts stock voices — but it is a write path and it is currently
   unchecked. Named here rather than left quiet.
3. **`tools/pod-sync.cjs` `assignVoices` and the recast/recolour tools** write casts from pools
   by the same route.
4. Anything that reaches a provider **without** `tts-service.generate()` bypasses the render
   block. `services/azure-tts-service.cjs` is required directly by `welcome-service.cjs`,
   `orchestration/orchestrator.cjs` and `phases/phase8-audio-from-baskets.cjs`. Azure is
   stock-voice-only, so no clone can travel that way today — but the guard is not there.
