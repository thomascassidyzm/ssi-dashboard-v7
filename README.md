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

### Phase Coverage (Locked Intelligence)

**Active Workflow**: Phase 1 → 3 → 5

| Phase | Name | Version | Status | Description |
|-------|------|---------|--------|-------------|
| 1 | Pedagogical Translation | v2.5 🔒 | ACTIVE | TWO ABSOLUTE RULES, examples over precepts, English handling |
| 2 | Corpus Intelligence | v1.0 | Inactive | FCFS mapping + utility (not in current workflow) |
| 3 | LEGO Extraction | v3.3 🔒 | ACTIVE | TILING FIRST, COMPOSITE with componentization |
| 3.5 | Graph Construction | v1.0 | Inactive | LEGO adjacency edges (not in current workflow) |
| 4 | Deduplication | - | TODO | Provenance preservation (Phase 5.5) |
| 5 | Basket Generation | v2.1 🔒 | ACTIVE | Eternal/debut phrases, ABSOLUTE GATE constraint |
| 6 | Introductions | v1.0 | TODO | Component-based presentations |
| 7 | Compilation | v1.0 | Complete | Legacy format manifest |
| 8 | Audio | v1.0 | Documented | TTS + S3 upload (Kai) |

🔒 = Locked, production-ready SSoT

**Phase Intelligence**: See `docs/phase_intelligence/README.md` for detailed methodology

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

- No legacy v6.x workflows (pre-v7.0 architecture)
- No manual APML registry compilation (now markdown-based intelligence)
- No monolithic phase orchestration (now modular, locked intelligence)
- Clean v7.0+ architecture with locked SSoT

---

**Version:** 7.0.1 (Locked Intelligence)
**Build:** Clean
**Phase Intelligence**: Phase 1 v2.5, Phase 3 v3.3, Phase 5 v2.1 (🔒 Locked SSoT)
**Date:** 2025-10-28
