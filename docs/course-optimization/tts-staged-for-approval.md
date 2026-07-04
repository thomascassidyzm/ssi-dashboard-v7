# TTS staged for approval — cue-library v1.0 fold-in sweep (spa_for_eng) + formal-vous pass (fra_for_eng)

## fra_for_eng — formal-vous pass, 2026-07-04 (seeds 642-655)

*Same rules as below: no TTS generated; changed rows' `*_audio_id` fields nulled (staged
per edit-cascade-spec §2d) and now sit in fra_for_eng's "Generate Missing Audio" queue,
which only renders on explicit go-ahead.*

**Full re-record (known + target both changed — lego realigned to the seed's own spoken
vocative form, French target audio changes):** seed 642 lego `S0642L02`, 643 `S0643L01`,
645 `S0645L01`, 647 `S0647L01`, 649 `S0649L02`, 650 `S0650L01`, 651 `S0651L01`,
652 `S0652L01`, 653 `S0653L02` — 9 legos.

**Known-side only (English cue gained a vocative marker, French target audio untouched):**
seed 644 lego `S0644L02` + B01/B02/B03/U03/U04/U05; 654 lego `S0654L02` + B01/B02/U02-U05;
655 lego `S0655L01` + B01-B03/U02-U04; plus the marked build/USE rows of seeds 642 (U02-U04),
643 (U04), 645 (B02/B03/U03-U05), 647 (B02/B03/U03-U05), 648 (B02/B03/U02-U05),
649 (B03/U03/U05), 650 (B02/B03/U04/U05), 651 (B02/U04), 652 (U04), 653 (L01 U04/U05 +
L02 B02/B03/U03-U05) — 50 rows.

**Deleted (redundant bare precursors, no audio needed):** 14 build rows — see the applied log.

Full machine-readable before/after: `tools/course-optimization/formal-vous-pass-fra-applied-log.json`.


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
