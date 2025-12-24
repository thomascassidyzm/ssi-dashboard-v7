# APML Phase Index Archive Note

**Date:** 2025-12-24

## Current Version

**`phase-index-v12.apml`** is the current active specification.

## Archived Versions

The following files have been moved to `apml/archive/phases/`:

- `phase-index-v11.apml` - Superseded by v12
- `phase-index-v10.apml` - Pre-Supabase architecture
- `phase-index-v9.apml` - Earlier pipeline structure
- `phase-audio-generation-v10.apml` - Old audio generation spec
- `phase-6-content-generation-v2.apml` - Deprecated naming
- `phase-7-manifest-compilation.apml` - Superseded by phase-9

## Key Changes in v12

1. **ssi-audio-stage bucket** - All audio in single S3 bucket
2. **UPPERCASE UUIDs** - Standardized UUID format for S3 paths
3. **'known' audio role** - Renamed from 'source' for clarity
4. **v12 audio schema** - texts + audio_files + course_audio tables

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
- `/apml/core/audio-registry-v12.apml` - Audio schema spec
- `/ssi-course-production.apml` - Master spec
