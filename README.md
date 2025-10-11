# SSi Course Production Dashboard v7.0 (Clean Build)

**Pure v7.0 implementation - No legacy dependencies**

## Overview

Clean, minimal dashboard for SSi Course Production APML v7.0 specification.

### Features

- ✅ All v7.0 phases (0, 1, 2, 3, 3.5, 4, 5, 6)
- ✅ Amino acid storage architecture
- ✅ Graph intelligence (Phase 3.5)
- ✅ **Inline Translation Editing** with impact analysis
- ✅ **Provenance Tracking** - trace seed impact through all phases
- ✅ **Course Library Browser** - view and edit existing courses
- ✅ Beautiful, subtle design (emerald/slate theme)
- ✅ No garish colors or flickering animations
- ✅ Zero legacy baggage

### Tech Stack

- Vue 3 (Composition API)
- Vite (Build tool)
- Tailwind CSS 4
- No router (single page for now)

### Phase Coverage

| Phase | Name | Description |
|-------|------|-------------|
| 0 | Corpus Pre-Analysis | Translation intelligence |
| 1 | Pedagogical Translation | 6 heuristics optimization |
| 2 | Corpus Intelligence | FCFS mapping + utility |
| 3 | LEGO Extraction | FCFS vs Utility + IRON RULE |
| 3.5 | Graph Construction | LEGO adjacency edges (NEW) |
| 4 | Deduplication | Provenance preservation |
| 5 | Pattern-Aware Baskets | Graph-driven edge coverage |
| 6 | Introductions | Known-only priming |

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy to Vercel

```bash
vercel --prod
```

Or connect to GitHub and auto-deploy.

## Architecture

### Editing Workflow

1. **User edits translation** in Course Editor UI
2. **Impact analysis** shown before save (LEGOs affected, baskets impacted)
3. **PUT /api/courses/:code/translations/:uuid** updates amino acid file
4. **Course metadata flagged** with `needs_regeneration: true`
5. **Phases 3-6 regenerate** to propagate changes through pipeline
6. **Deterministic UUIDs** ensure automatic reference updates

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/courses` | List all courses |
| GET | `/api/courses/:code` | Get full course data |
| GET | `/api/courses/:code/provenance/:seedId` | Trace provenance chain |
| PUT | `/api/courses/:code/translations/:uuid` | Update translation |
| POST | `/api/courses/generate` | Generate new course |

### VFS Structure

```
vfs/courses/:courseCode/
├── amino_acids/
│   ├── translations/
│   │   └── {uuid}.json          # Translation amino acids
│   ├── legos/
│   │   └── {uuid}.json          # LEGO amino acids
│   ├── legos_deduplicated/
│   │   └── {uuid}.json          # Deduplicated LEGOs
│   ├── baskets/
│   │   └── basket_{id}.json     # Basket amino acids
│   └── introductions/
│       └── intro_basket_{id}.json
├── phase_outputs/
│   ├── phase_2_corpus_intelligence.json
│   ├── phase_3_lego_extraction.json
│   ├── phase_3.5_graph.json
│   ├── phase_4_deduplication.json
│   ├── phase_5_baskets.json
│   └── phase_6_introductions.json
└── course_metadata.json
```

## Design Philosophy

- Clean, professional aesthetic
- Subtle emerald green accents (#10b981)
- Slate gray backgrounds
- Simple hover effects (translateY, no scale/flicker)
- Matches training page design language

## What's NOT Included

- No legacy v6.x phase references (Phase 7, 8 removed)
- No DEBUT/ETERNAL terminology (outdated)
- No old FD testing workflows
- No Python corpus analysis references
- Clean slate, v7.0 only

---

**Version:** 7.0.0
**Build:** Clean
**Date:** 2025-10-10
