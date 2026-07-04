# TTS staged for approval — cue-library v1.0 fold-in sweep (spa_for_eng)

*Generated 2026-07-04 by the fold-in sweep. No TTS was generated. This is the "flag it" step
per CLAUDE.md's approval gate: known_text/target_text changed on the rows below, their
`*_audio_id` fields were nulled (staged as missing-audio, per `docs/specs/edit-cascade-spec.md`
§2d), and they now sit in the course's "Generate Missing Audio" queue. Nothing renders until
Phase 8 `/generate` (or the dashboard's Generate Missing Audio action) is explicitly run for
`spa_for_eng` — that step needs Tom's go-ahead per the TTS-approval rule.*

## What's staged (audio_id nulled, awaiting approved regen)

**Structural (known + target both changed — new target audio needed):**
- Seed 38 lego `S0038L01` — split-frame re-debut, "I've been learning" → "I've been learning all day" / "llevo aprendiendo" → "llevo todo el día aprendiendo". **This is the one true re-record**: the target-side audio changes, not just the English gloss.
- Seed 497 lego `S0497L02` + component `S0497L02C01` — "you needed to sleep"→"as if you needed to sleep" / "necesitaras dormir"→"como si necesitaras dormir". Same note: target audio changes.

**Known-side only (English gloss changed, Spanish/target audio untouched — only the known-language narration needs a re-record, not the target-language clip):**
- Seed 297 lego `S0297L03` (who speak / que hablen — target changed too, so full re-record)
- Seed 396 lego `S0396L03` + component `S0396L03C01`
- Seed 506 component `S0506L04C02`
- Seed 542 component `S0542L01C02`
- Seed 646 lego `S0646L01` + phrases B01, B02, B03, U03, U04, U05
- Seed 651 lego `S0651L01` + phrases U03, U04, U05
- Seed 653 lego `S0653L01` + phrases B01, U03, U04, U05
- Seed 655 phrases U03, U04, U05
- Seed 642 lego `S0642L02` + phrase B01
- Seed 497 phrase U01 (tense fix, known-side only)

Full machine-readable list with before/after text: `tools/course-optimization/cue-library-v1-spa-foldins-applied-log.json`.

## Recommended next step (needs Tom's go-ahead, not taken here)
Run Phase 8 "Generate Missing Audio" scoped to `spa_for_eng` — it only renders rows with a
null `*_audio_id` (see edit-cascade-spec §2d: "absence IS the signal"), so this will not
touch any other course content or re-render anything that wasn't just changed above.
