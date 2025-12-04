# Master Agent Briefs

This folder contains standalone briefs for each Master Agent building the Course Production Suite.

## Execution Order

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
         MERGE TO MAIN ◄────────────────────┘
```

## Brief Files

| File | Agent | Focus | Dependencies |
|------|-------|-------|--------------|
| `MASTER_AGENT_1_INFRASTRUCTURE.md` | Master 1 | Pinia store, S3 service, API, WebSocket | None (start first) |
| `MASTER_AGENT_2_QA_WORKFLOW.md` | Master 2 | Script Viewer, Samples Browser, FlagMenu | Master 1 |
| `MASTER_AGENT_3_AUDIO_PRODUCTION.md` | Master 3 | Mission Control, Audio Pipeline | Master 1 |
| `MASTER_AGENT_4_AUTOCUE_RECORDING.md` | Master 4 | Autocue Studio, Teleprompter, Recording | Master 1 |

## For Master Orchestrator

1. Launch **Master 1** first and wait for PR
2. Review and merge Master 1's PR to main
3. Launch **Masters 2, 3, 4** in parallel
4. Review PRs as they come in
5. Merge in any order (they don't conflict)
6. Final integration test after all merged

## Branch Names

- `feature/production-suite-infrastructure` (Master 1)
- `feature/production-suite-qa` (Master 2)
- `feature/production-suite-audio` (Master 3)
- `feature/autocue-recording` (Master 4)

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
