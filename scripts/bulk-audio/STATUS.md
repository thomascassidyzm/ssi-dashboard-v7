# Bulk Audio Generation — Status & Resume Guide

> **Last updated: 2026-02-25**
> If Kai says anything like "encouragement and welcome batch generation side-mission", this is the file to read.

---

## Overview

This is a side-mission to bulk-generate **encouragement** and **welcome** audio for SSi courses using ElevenLabs TTS (eleven_v3 model). Everything lives in `scripts/bulk-audio/` (gitignored).

---

## 1. Encouragements — COMPLETE

**Status: Done. Fully generated, mastered, uploaded, and in the database.**

- **2,744 samples** across 28 known languages (74 encouragements x 2 voices per language, but 28 languages selected = 28 x 2 voices x ~49 encouragements each)
- Actually: 28 languages x ~74 encouragement texts x 2 voices = 2,744 total
- All mastered (ffmpeg -16 LUFS normalize), uploaded to S3 (`mastered/{UUID}.mp3`), inserted into `shared_audio` table
- Zero failures

### Key files
- `generate-28.cjs` — Generation script (ElevenLabs TTS)
- `process-and-upload.cjs` — Master + S3 upload + DB insert pipeline
- `data/translations/encouragements/*.json` — 74 language translation files
- `data/voices.json` — Voice configurations (2 voices per language)
- `data/voice-selections.json` — Which voice index was chosen per language
- `generated/encouragements/production/` — Raw MP3s + manifests

### No further action needed on encouragements.

---

## 2. Welcomes — IN PROGRESS

**Status: Generation ~96% complete for the first 113 targets. 32 more targets queued for next credit cycle.**

### What are welcomes?
Each known language gets a welcome message for every target language. Example: a Finnish welcome for someone learning Spanish says "Tervetuloa tähän epätavalliseen peliin..." with Spanish-specific placeholders filled in. The welcome is spoken in the known language by that language's voice.

### Template system
- Location: `data/translations/welcomes/*.json` (29 files: 28 known languages + eng.json)
- Each file has a `template` with placeholders: `{in_target}`, `{a_target_speaker}`, `{target_speakers}`, `{in_known}`
- The `targets` object maps ISO 639-3 codes to the localized placeholder values
- **Currently 145 targets per known language** (expanded over multiple sessions)

### Target language expansion history
| Batch | Count | Languages added |
|-------|-------|-----------------|
| Original | 73 | All 74 SSi languages minus self |
| Minority 1 | +27 | Celtic (bre, gla, cor, glv), European minority (roh, eus, oci, srd), Italian regional (nap, scn), African (yor, ibo, zul, xho, amh), Americas (que, nav, grn), Other (ain, yid, sme), Portuguese variants (por_BR, por_EU), Chinese variants (yue, wuu, nan, hak) |
| Minority 2 | +13 | Arabic variants (arz, apc, afb, ary), Spanish variants (spa_SA, spa_EU), Sami (smj, smn, sms), Kurdish (kur), Suret (aii), Mohawk (moh), Uyghur (uig) |
| Minority 3 | +11 | Palestinian Arabic (ajp), Sorbian (hsb, dsb), Friulian (fur), Griko (grk), Frisian (fry, frr), Flemish (vls), Corsican (cos), Maori (mri), Faroese (fao) |
| Minority 4 | +13 | Asturian (ast), Aragonese (arg), Ladino (lad), Kashubian (csb), Ligurian (lij), Venetian (vec), Walloon (wln), Limburgish (lim), Swiss German (gsw), Bavarian (bar), Scots (sco), Hawaiian (haw), Cherokee (chr) |
| Pacific/Indigenous | +7 | Ojibwe (oji), Inuktitut (iku), Greenlandic (kal), Samoan (smo), Tongan (ton), Fijian (fij), Tahitian (tah) |
| Austrian German | +1 | deu_AT |
| **Total** | **145** | |

### Generation status

**28 non-English known languages (eleven_v3):**
- 3,164 samples generated (28 x 113 targets) — COMPLETE (2026-02-26)
- 576 more samples generated (18 priority languages x 32 newer targets) — COMPLETE (2026-04-02)
- All 3,740 mastered and uploaded to S3
- 18 languages now at 145 targets: ara, cmn, deu, fra, hin, ind, ita, jpn, kor, msa, nld, pol, por, rus, spa, tam, tur, ukr
- 10 languages still at 113 targets: bul, ces, dan, ell, fil, fin, hrv, ron, slk, swe

**English known language — robo-Aran (eleven_multilingual_v2) — COMPLETE (2026-04-02):**
- 146 samples generated (all 145 expanded targets + eng itself)
- Voice: robo-Aran (FVdzAUsp8apoOdc0907A), stability=0.4, similarity_boost=1.0
- All mastered (-16 LUFS) and uploaded to S3
- Indexed in `_welcome_index.json` under `eng`
- NOT auto-inserted into course_audio — real Aran recordings take priority
- Use `apply-welcomes-to-courses.cjs` to apply to new courses (skips existing welcomes)

**Course-specific welcomes inserted (2026-04-02):**
- 14 English courses: robo-Aran (eleven_multilingual_v2) — bul, cat, ell, gla, hrv, hye, isl, lav, mkd, nor, por_br, ron, tha, ukr
- 1 Tamil course (eng_for_tam): applied from bulk index
- 3 non-English courses: por_for_aze (Leyla, eleven_v3), por_for_lit (Vytautas, eleven_v3), eng_for_sin (Azure SameeraNeural)
- **79/80 courses now have welcomes** (only eng_template excluded)

**What still needs generating:**
- 10 known languages x 32 newer targets = 320 samples (~186k credits)
- Wait for ElevenLabs credit reset before running

### How to generate the remaining 320 samples

```bash
cd scripts/bulk-audio
# Run all 10 remaining languages at once (~186k credits)
for lang in bul ces dan ell fil fin hrv ron slk swe; do
  node generate-welcomes.cjs --execute --resume --lang $lang
done
# Then master + upload:
node process-welcomes.cjs --execute
```

### Processing & upload — DONE for first 3,164 samples (2026-02-26)

3,164 samples mastered (-16 LUFS) and uploaded to S3, 0 failures, 20.8 minutes.

- `_welcome_index.json` written with full mapping: `known_lang → target_lang → { uuid, s3_key, duration_ms, size_kb }`
- All in S3 at `mastered/{UUID}.mp3` in bucket `ssi-audio-stage`
- No DB insert — welcomes are course-specific, will go in `course_audio` when courses are created

**After generating the remaining 896 samples, run process-welcomes.cjs again:**
```bash
node process-welcomes.cjs --plan     # Will show only unprocessed samples
node process-welcomes.cjs --execute  # Masters + uploads new ones, skips existing (checks S3 via HeadObject)
```
This will update `_welcome_index.json` with the new entries.

### Key files
- `generate-welcomes.cjs` — Generation script (ElevenLabs TTS, concurrency 10)
- `process-welcomes.cjs` — Master + S3 upload pipeline (concurrency 20)
- `data/translations/welcomes/*.json` — 29 template files (28 known + eng)
- `generated/welcomes/production/` — Raw MP3s + per-language `_manifest.json` + `_progress.json`
- `generated/welcomes/production/_progress.json` — Tracks completed samples (used by --resume)

### Bug fix applied
- `generateWithRetry()` in `generate-welcomes.cjs` had a bug where exhausting all retries on 429 rate limits returned `undefined` instead of a failure object. Fixed by adding a return statement after the for loop.

---

## 3. Infrastructure & Config

### Voices
- `data/voices.json` — Full voice catalog (2+ voices per language from ElevenLabs)
- `data/voice-selections.json` — Selected voice index per language (28 entries)
- Same voice used for both encouragements and welcomes per language

### ElevenLabs API
- Model: `eleven_v3`
- `voice_settings: { voice_stability: 0.4 }`
- `language_code` parameter: ISO 639-1 code for the known language (not the target)
- Concurrency: 10 for generation, 20 for processing
- Rate limit handling: exponential backoff on 429s, 3 retries

### AWS/S3
- Bucket: `ssi-audio-stage` (from .env `S3_BUCKET`)
- Region: `eu-west-1`
- Path: `mastered/{UPPERCASE_UUID}.mp3`
- Credentials from .env: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`

### Language code mapping (LANG_CODE_MAP)
Only needed for **known languages** (the language the voice speaks in). Maps ISO 639-3 to ISO 639-1 for the ElevenLabs `language_code` parameter. Target languages are just text within the spoken sentence and don't need a language code.

---

## 4. Resume Checklist

When coming back to this:

- [ ] Check ElevenLabs credit balance (need ~450k for remaining 896 welcome samples)
- [ ] Verify current run completed: `node -e "const p=require('./generated/welcomes/production/_progress.json'); console.log(Object.keys(p.completed).length)"` — should be 3,164
- [ ] Run remaining welcome generation: `node generate-welcomes.cjs --plan` then `--execute --resume`
- [ ] After ALL generation done, run processing: `node process-welcomes.cjs --plan` then `--execute`
- [ ] Future: Kai mentioned integrating mastering+upload into the generation script itself

---

## 5. Possible Future Additions

Kai expressed interest in adding even more target languages. The template expansion pattern is well-established — launch parallel agents to add new target entries to all 28 template files, then run `--execute --resume`. Some ideas discussed but not yet added:
- More indigenous languages
- More regional dialects/variants
- Any new languages SSi adds to their roadmap
