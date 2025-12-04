# APML Phase Index Archive Note

**Date:** 2025-12-04

## Current Version

**`phase-index-v11.apml`** is the current active specification.

## Archived Versions

The following files are kept for historical reference but are **superseded by v11**:

- `phase-index-v10.apml` - Pre-Supabase architecture
- `phase-index-v9.apml` - Earlier pipeline structure

## Key Changes in v11

1. **Supabase Database Layer** - Replaces file-based MAR
2. **Audio-First Generation** - Generate audio before manifest
3. **Manifest Pruning** - `new: false` LEGOs don't get intro_items
4. **Deterministic UUIDs** - `hash(voice_id|text|lang|role|cadence)`
5. **Supabase Realtime** - Replaces Socket.io

## Reference Documents

- `/new_vision/COURSE_PRODUCTION_SUITE_ARCHITECTURE.md` - Full architecture
- `/new_vision/supabase-schema.sql` - Database schema
- `/ssi-course-production.apml` - Master spec (changelog_v11_0_0)
