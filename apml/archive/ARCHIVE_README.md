# APML Archive

**Date:** 2025-12-24

This directory contains deprecated APML specifications kept for historical reference.

## Archived Files

### phases/
- `phase-index-v9.apml` - Earlier pipeline structure
- `phase-index-v10.apml` - Pre-Supabase architecture
- `phase-index-v11.apml` - Superseded by v12
- `phase-audio-generation-v10.apml` - Old audio generation spec
- `phase-6-content-generation-v2.apml` - Deprecated naming convention
- `phase-7-manifest-compilation.apml` - Superseded by phase-9

### core/
- `course-structure-v9.apml` - Old course structure
- `course-structure.apml` - Superseded by ssi-variable-registry
- `variable-registry.apml` - Superseded by ssi-variable-registry.apml
- `execution-modes.apml` - Old execution modes

## Current Active Specs

See `/apml/phases/ARCHIVE_NOTE.md` for the list of current active specifications.

## Why Archived

These files contain:
- References to deprecated `popty-bach-lfs` S3 bucket (now `ssi-audio-stage`)
- Old `source` audio role (now `known`)
- Lowercase UUID references (now UPPERCASE)
- Superseded architecture patterns

## Do Not Delete

Keep these files for:
- Historical reference
- Understanding evolution of the system
- Debugging legacy issues
