# Phase Intelligence - APML v11.0

**IMPORTANT**: Phase prompts have moved!

## New Location (SSoT)

As of APML v11.0, phase prompts are **co-located with their services**:

| Phase | Location |
|-------|----------|
| Phase 1: Translation + LEGO Extraction | `services/phases/phase1-translation/PROMPT.md` |
| Phase 2: Conflict Resolution | `services/phases/phase1-lego-extraction/PROMPT.md` |
| Phase 3: Basket Generation | `services/phases/phase3-basket-generation/PROMPT.md` |
| Phase 8: Audio Generation | `services/phases/phase8-audio-generation/PROMPT.md` |
| Phase 9: Manifest Compilation | `services/phases/phase9-manifest-compilation/PROMPT.md` |

## Why the Move?

**Single Source of Truth**: Each phase's prompt lives alongside its service code. When you update a service, you see its prompt right there. They can't drift out of sync.

**Proximity Principle**: The prompt and the service that uses it are together.

**Easy Discovery**: `ls services/phases/phase1-translation/` shows everything.

## API Access

The orchestrator serves prompts via API:

```
GET /api/phase-intelligence/:phase
```

Examples:
- `/api/phase-intelligence/1` → Phase 1 prompt
- `/api/phase-intelligence/3` → Phase 3 prompt
- `/api/phase-intelligence/audio` → Phase 8 prompt
- `/api/phase-intelligence/manifest` → Phase 9 prompt

## Archive

Old phase intelligence files are preserved in `./archive/` for reference. These are no longer the source of truth.

## Supporting Documents

These reference documents remain here:

- `CANONICAL_CONTENT.md` - 3-parameter input model
- `COURSE_GENERATION_ARCHITECTURE.md` - Pipeline overview
- `PHASE_EVOLUTION.md` - Historical phase changes
- `translate_encouragements.md` - Encouragement translation guide

---

**Last Updated**: Dec 8, 2025
**APML Version**: 11.0
