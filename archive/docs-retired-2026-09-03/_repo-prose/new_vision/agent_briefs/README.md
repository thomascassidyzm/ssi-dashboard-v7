# Master Agent Briefs

This folder contains standalone briefs for each Master Agent building the Course Production Suite.

## Execution Order

### Phase 1: UI Components (COMPLETE)

```
MASTER 1 (Infrastructure) ──────────────────┐
         │                                   │
         │ [BLOCKS - must complete first]    │
         ▼                                   │
    ┌────┴────┬────────────┐                │
    │         │            │                │
    ▼         ▼            ▼                │
MASTER 2  MASTER 3    MASTER 4              │
(QA)      (Audio)     (Autocue)             │
    │         │            │                │
    └─────────┴────────────┘                │
              │                              │
              ▼                              │
         MERGE TO MAIN ◄────────────────────┘  ✓ DONE
```

### Phase 2: Backend Integration (CURRENT)

```
    ┌─────────────────────────────────┐
    │                                 │
    ▼                                 ▼
AGENT 5                           AGENT 6
(Backend)                         (Frontend)
    │                                 │
    ├─ Production API                 ├─ Router setup
    ├─ WebSocket server               ├─ API client calls
    └─ Flag persistence               └─ WebSocket wiring
    │                                 │
    └─────────────┬───────────────────┘
                  │
                  ▼
             MERGE TO MAIN
```

## Brief Files

### Phase 1 (Complete)

| File | Agent | Focus | Status |
|------|-------|-------|--------|
| `MASTER_AGENT_1_INFRASTRUCTURE.md` | Master 1 | Pinia store, S3 service, API, WebSocket | ✓ Merged |
| `MASTER_AGENT_2_QA_WORKFLOW.md` | Master 2 | Script Viewer, Samples Browser, FlagMenu | ✓ Merged |
| `MASTER_AGENT_3_AUDIO_PRODUCTION.md` | Master 3 | Mission Control, Audio Pipeline | ✓ Merged |
| `MASTER_AGENT_4_AUTOCUE_RECORDING.md` | Master 4 | Autocue Studio, Teleprompter, Recording | ✓ Merged |

### Phase 2 (Current)

| File | Agent | Focus | Dependencies |
|------|-------|-------|--------------|
| `AGENT_5_BACKEND_INTEGRATION.md` | Agent 5 | Production API, WebSocket server, Flag persistence | None (can start) |
| `AGENT_6_FRONTEND_WIRING.md` | Agent 6 | Router, API calls, WebSocket subscription | None (can start in parallel) |

## For Master Orchestrator

### Phase 2 Instructions

1. Launch **Agent 5** and **Agent 6** in parallel
2. They can work independently - API contract already defined
3. Review PRs as they come in
4. Merge in any order
5. Final integration test after both merged

## Branch Names

### Phase 1 (Merged)
- `claude/master-agent-1-infrastructure-*` ✓
- `claude/review-qa-workflow-brief-*` ✓
- `claude/audio-production-tools-*` ✓
- `claude/autocue-recording-system-*` ✓

### Phase 2 (Current)
- `feature/production-backend-integration` (Agent 5)
- `feature/production-frontend-wiring` (Agent 6)

## Design Reference

All agents should reference:
- `new_vision/autocue-teleprompter-prototype.html` - Working prototype with exact styling
- `new_vision/AUTOCUE_TWO_MODE_SYSTEM.md` - Detailed autocue spec

## Cinematic Dark Palette

```css
--color-void: #0a0b0f;
--color-shadow: #16181f;
--color-slate: #23262f;
--color-graphite: #34384a;

--color-film-red: #e63946;
--color-tungsten: #ffa630;
--color-emerald: #06ffa5;

--color-paper: #f7f7f2;
--color-paper-dim: #c1c1bb;

--font-display: 'Crimson Pro', serif;
--font-ui: 'Josefin Sans', sans-serif;
--font-mono: 'IBM Plex Mono', monospace;
```
