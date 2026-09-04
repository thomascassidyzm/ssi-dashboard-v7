# Popty for course-builder agents — compiled

**Version `f6d60e628056` · generated 2026-09-04. DO NOT EDIT — this file is derived from the course-builder's own source; edit tools/explainer/rulings/agent.md for the voice, or the code for the facts, then recompile.**

### contract

You are building course content through one door: submit a complete seed — seed pair, LEGOs,
phrases — atomically. All gates run first and accumulate; nothing saves unless everything
passes, and you get the full error list in one reply. Phrase IDs are assigned by the API,
deterministically — never author them, always submit `phrase_role: 'build'` or `'use'`. After a
context compaction, recover your position from the resume endpoint — never guess from memory.

### method

The rails the gates enforce: one known prompt → exactly one target form, course-wide. The known
side is a controlled language — no English the learner hasn't been given. Phrases tile from
whole already-introduced chunks; the validator never re-splits or re-conjugates. A rejection is
signal, not noise: fix and resubmit, don't route around. The derived list below is the live
gate set — trust it over any hand-written doc, because it was read out of the validation code
at compile time.

## Derived truth (from the code, this compile)

- Endpoints in `services/course-builder/routes/seed-complete.cjs`: `POST /api/lego` · `POST /api/batch` · `POST /api/seed/complete`
- Validation gates (`validation.cjs` exports): `checkTiling`, `checkMetadataGloss`, `checkKnownSide`, `isKnownVocabBreach`, `checkPhraseComplexity`, `checkVocabViolations`, `checkPhraseBalance`, `checkLegoConflict`, `isLicensedGenderVariant`, `isDedupConflict`, `checkLegoOverlap`, `checkPhraseZUT`, `checkBasketFrameCoverage`, `classifySeedPattern`, `classifyBuildPhrase`, `checkBuildRecombination`, `checkBuildTeachesWord`, `checkBuildBasketTeachesWord`
- `MAX_LEGO_SYLLABLES = 8` (`language-config.cjs`; runs even under skip_validation)
- Known-vocab gate is HARD-BLOCKING (`isKnownVocabBreach`, since b77c75f7): known-side vocab breaches 400 the submission.
- Pair contracts on disk: eng_for_ben.contract.cjs, eng_for_guj.contract.cjs, eng_for_hin.contract.cjs, eng_for_pan.contract.cjs, eng_for_sin.contract.cjs, eng_for_tam.contract.cjs, eng_for_urd.contract.cjs, fra_for_eng.contract.cjs, fur_for_eng.contract.cjs, ind_for_eng.contract.cjs, kan_for_eng.contract.cjs, nap_for_eng.contract.cjs, roh_for_eng.contract.cjs, scn_for_eng.contract.cjs, sme_for_eng.contract.cjs, vec_for_eng.contract.cjs, zho_for_eng.contract.cjs (+ `_default_eng` fallback for eng-known courses).
- Human-voice-only courses (TTS refused at the chokepoint): cym_n_for_eng, cym_s_for_eng, bre_for_fra, pdc_for_eng, plus every `cym_*` course.
- Content passes end by QUEUEING an audio pass (`queueAudioPass`), never by running TTS.
