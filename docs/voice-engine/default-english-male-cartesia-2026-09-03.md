# The default English male voice is Tom's Cartesia clone

**Tom's ruling, 2026-09-03.** Applied to the live estate the same night. Forward-only: **nothing was
re-rendered and nothing was deleted.** Every existing clip still plays on the voice it was made with.

## What the default WAS, and where it was stated

Read off the live database and the code on `origin/main` — not off documents. It was stated in
**three** places, none of which knew about the others:

| # | Where | What it said | Governs |
|---|---|---|---|
| 1 | `app_config.pod_voice_pools` → `eng.m[0]` | `{ name: Tom, provider: xai, voice_id: gfzdpspr5fdp }` | every new pod cast by `tools/pod-sync.cjs` (with `POD_VOICES_PER_GENDER=1`, index 0 IS the default) |
| 2 | `voice_language_roles` | **zero rows** | every course role, via `services/shared/language-voice-cast.cjs` — the table the estate DESIGNED as the single definition, which nothing had ever written to |
| 3 | `courses.voice_config` per course | 18 courses naming `gfzdpspr5fdp` by hand | one course each — the "94 copies of one decision" the language cast exists to replace |

The xAI voice id appears in **no code file on `origin/main`**. It was pure data.

## What changed

1. **`voice_language_roles`** gained its first row ever: `('eng', 'm', 'phrase', rank 0) → cartesia_8fef4d59-0a7e-4ad2-a261-6a3bb50734d2`.
   This is the definition. `services/phases/phase8-audio-v13.cjs` resolves every render through it.
2. **`voices.gender`** for the clone set to `'m'` — not cosmetic. `genderForRole()` reads the gender
   of the voice a course currently holds; a null gender falls to `DEFAULT_GENDER`, which is `'f'` for
   the `known` role, so a second resolution would have silently flipped every `*_for_eng` known track
   to a female voice.
3. **`tools/pod-sync.cjs`** now DERIVES each pool's rank-0 primary from that same cast row
   (`overlayCastPrimaries`), keeping the stored list as depth behind it. One row now changes the
   default for pods and courses together. Invariant kept and tested: **with no cast rows the pools
   are byte-identical.** 10 new unit tests, plus the 12 existing cast-override tests, green.
4. **`app_config.pod_voice_pools` → `eng.m[0]`** updated to the clone in the same pass, so the
   maintenance tools that read the row directly agree with what the casting path decides.

Nothing touched: any FEMALE English default (the cast is keyed by gender and only the `m` row was
written), any Welsh voice, any human recording, and the `presentation` role — which is deliberately
outside `CAST_ROLES` and remains per-course.

## Blast radius — the old xAI default, as fact

Measured directly off `course_audio`, 2026-09-03:

- **327,375 clips** on `gfzdpspr5fdp` / `xai_gfzdpspr5fdp`
- **80 courses**
- **211.1 hours** of audio
- first clip 2026-02-16, last 2026-09-03 22:40 (tonight's Senedd pod)
- by role: target2 144,175 · known 105,522 · pod_fine_known 41,992 · presentation 22,083 · pod_explainer ~11,300 · target1 295
- also frozen into **115 pod casts across 58 courses** (`listening_pods.speakers`)

**None of it has been re-rendered.** Whether any of it should be is Tom's call.

## What the change decides on the NEXT render — 25 course roles

Simulated through the real resolver (`applyLanguageCast`) before applying, and verified live after:

| Course | Role | Was |
|---|---|---|
| eng_for_jpn | target2 | gfzdpspr5fdp |
| eng_for_deu | target2 | en-GB-RyanNeural |
| eng_for_kor | target2 | en-GB-RyanNeural |
| deu_for_eng | known | gfzdpspr5fdp |
| eng_for_hin | target2 | gfzdpspr5fdp |
| eng_for_guj | target2 | gfzdpspr5fdp |
| eng_for_por | target2 | en-GB-RyanNeural |
| eng_for_tam | target2 | gfzdpspr5fdp |
| por_br_for_eng | known | gfzdpspr5fdp |
| eng_template | target2 | — |
| eng_for_ita | target2 | en-GB-RyanNeural |
| eng_for_mar | target2 | gfzdpspr5fdp |
| eng_for_ara | target2 | gfzdpspr5fdp |
| eng_for_kan | target2 | gfzdpspr5fdp |
| eng_for_spa | target2 | en-GB-RyanNeural |
| fra_for_eng | known | gfzdpspr5fdp |
| spa_mx_for_eng | known | gfzdpspr5fdp |
| fra_ca_for_eng | known | gfzdpspr5fdp |
| eng_for_tel | target2 | gfzdpspr5fdp |
| eng_for_sin | target2 | gfzdpspr5fdp |
| eng_for_urd | target2 | gfzdpspr5fdp |
| eng_for_zho | target2 | gfzdpspr5fdp |
| eng_for_pan | target2 | gfzdpspr5fdp |
| eng_for_fra | target2 | en-GB-RyanNeural |
| eng_for_ben | target2 | gfzdpspr5fdp |

All 25 now resolve to `cartesia_8fef4d59-0a7e-4ad2-a261-6a3bb50734d2`. `spa_for_eng` was already on
the clone (91 clips, 2026-08-27) and reports `cast-same`. `cym_n_for_eng` reports
`human-recorded` for all five roles — the human-voice stop holds ahead of the cast, as designed.

## Open for Tom

1. **WHICH clone.** Three of his Cartesia clones are registered and consent-authorised: `tom_001`
   (`8fef4d59…`), `Tom_002` (`e7ed10ad…`), `Tom_003` (`f56e05e2…`). `tom_001` was chosen because it
   is the only one this estate has ever rendered with and the only one named on the render path in
   code. If he wants a different one it is **one row** — that is the point of the change.
2. **Presentation.** 22,083 xAI-Tom presentation clips. `presentation` is deliberately outside the
   language cast ("the course's own presenter, not a specimen of the language"). One word from him
   moves it in.
3. **Re-render or not.** 211 hours on a deprecated provider. Not started, not planned.

## Reverting

`node tools/voice/set-default-english-male-cartesia.cjs --revert --apply` — deletes the row, puts the
pool head back. Nothing else to undo, because nothing else was written.
