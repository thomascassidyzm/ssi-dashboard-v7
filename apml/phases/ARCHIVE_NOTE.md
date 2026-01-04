# APML Phase Index Archive Note

**Date:** 2026-01-04

## Current Version

**`phase-index-v13.apml`** is the current active specification.

## Archived Versions

The following files have been moved to `apml/archive/phases/`:

- `phase-index-v12.apml` - Superseded by v13 (texts/audio_files indirection removed)
- `phase-index-v11.apml` - Hash-based UUIDs (fragile)
- `phase-index-v10.apml` - Pre-Supabase architecture
- `phase-index-v9.apml` - Earlier pipeline structure
- `phase-audio-generation-v10.apml` - Old audio generation spec
- `phase-6-content-generation-v2.apml` - Deprecated naming
- `phase-7-manifest-compilation.apml` - Superseded by phase-9

## Key Changes in v13

1. **Flat course_audio table** - Course owns audio directly (no texts/audio_files indirection)
2. **courses.code as primary key** - Simplified from course_code
3. **voice_config JSONB** - Voice assignments stored on courses table
4. **shared_audio table** - Only for encouragements/instructions
5. **S3 flat storage** - `{uuid}.mp3` at root level (no mastered/ prefix)
6. **origin column** - `tts` (regenerable) or `human` (precious)
7. **Audio roles** - `known`, `target1`, `target2`, `presentation`

## Removed/Deprecated (v12 to v13)

- `texts` table - Removed (over-engineered indirection)
- `audio_files` table - Removed (merged into course_audio)
- `audio_samples` table - Legacy, don't use
- Separate voice columns on courses - Now in voice_config JSONB

## Active Phase Specs

- `phase-1-translation.apml`
- `phase-2-conflict-resolution.apml`
- `phase-3-basket-generation.apml`
- `phase-audio-generation.apml` (current)
- `phase-human-recording.apml`
- `phase-incremental-publishing.apml`
- `phase-lego-extraction.apml`
- `phase-phrase-assembly.apml`
- `natural-language-qa.apml`

## Reference Documents

- `/apml/core/ssi-variable-registry.apml` - Single Source of Truth
- `/apml/core/audio-registry-v13.apml` - Audio schema spec (CANONICAL)
- `/ssi-course-production.apml` - Master spec
