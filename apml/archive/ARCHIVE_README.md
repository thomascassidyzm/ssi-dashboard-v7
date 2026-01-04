# APML Archive

**Date:** 2026-01-04

This directory contains deprecated APML specifications kept for historical reference.

## Archived Files

### phases/
- `phase-index-v9.apml` - Earlier pipeline structure
- `phase-index-v10.apml` - Pre-Supabase architecture
- `phase-index-v11.apml` - Hash-based UUIDs (fragile)
- `phase-index-v12.apml` - Superseded by v13 (texts/audio_files indirection removed)
- `phase-audio-generation-v10.apml` - Old audio generation spec
- `phase-6-content-generation-v2.apml` - Deprecated naming convention
- `phase-7-manifest-compilation.apml` - Superseded by phase-9

### core/
- `course-structure-v9.apml` - Old course structure
- `course-structure.apml` - Superseded by ssi-variable-registry
- `variable-registry.apml` - Superseded by ssi-variable-registry.apml
- `execution-modes.apml` - Old execution modes
- `audio-registry-v12.apml` - Superseded by v13 (texts/audio_files tables removed)

## Current Active Specs

See `/apml/phases/ARCHIVE_NOTE.md` for the list of current active specifications.

**Current canonical version:** APML v13

## Why Archived

These files contain:
- References to deprecated `popty-bach-lfs` S3 bucket (now `ssi-audio-stage`)
- Old `source` audio role (now `known`)
- v12 `texts` and `audio_files` tables (removed in v13)
- Hash-based UUID generation (replaced by database-assigned UUIDs)
- Superseded architecture patterns

## v13 Key Changes (from v12)

- `course_audio` is flat - course owns audio directly
- `courses` table uses `code` as primary key
- `voice_config` is JSONB on courses table
- `shared_audio` for encouragements/instructions only
- S3 storage is flat: `{uuid}.mp3` at root level
- Audio roles: `known`, `target1`, `target2`, `presentation`
- Origin: `tts` (regenerable) or `human` (precious)

## Do Not Delete

Keep these files for:
- Historical reference
- Understanding evolution of the system
- Debugging legacy issues
