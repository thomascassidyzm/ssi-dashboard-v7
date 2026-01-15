# Archived Phase Files (v13)

**Archived**: 2026-01-15
**Reason**: Superseded by Course Builder (v14)

## What Changed in v14

Phases 0-3 were consolidated into a single **Course Builder API** that handles:
- Language brief generation
- Translation
- LEGO extraction
- Conflict resolution
- Basket generation

All in one atomic operation via `POST /api/seed/complete` (port 3471).

## Files in This Archive

| File | Original Purpose |
|------|-----------------|
| `phase-0-language-brief.apml` | Language intelligence brief generation |
| `phase-1-translation.apml` | Translation + LEGO extraction |
| `phase-2-conflict-resolution.apml` | ZUT conflict resolution |
| `phase-3-basket-generation.apml` | Practice basket generation |
| `phase-lego-extraction.apml` | LEGO component extraction |
| `phase-phrase-assembly.apml` | Practice phrase assembly |
| `phase-index-v12.apml` | Phase index v12 |
| `phase-index-v13.apml` | Phase index v13 |

## Current Architecture (v14)

```
Course Builder (3471) → Phase 8 Audio (3465) → Phase 9 Manifest (3466)
```

See: `apml/phases/phase-index-v14.apml`
