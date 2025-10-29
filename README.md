# SSi Course Production Dashboard v7.8.3

**Production-ready with locked phase intelligence + smart resume**

## Overview

Clean, minimal dashboard for SSi Course Production with locked phase intelligence (v7.8.3).

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

**Active Workflow**: Phase 1 → 3 → 5 → 5.5 → 6 → 7

**Architectural Boundary**:
- **Phases 1-6**: Evolvable intelligence (can iterate, refactor, improve internal processing)
- **Phase 7**: Immutable contract (fixed JSON manifest format for mobile app - cannot change without app update)

| Phase | Name | Version | Status | Description |
|-------|------|---------|--------|-------------|
| 1 | Pedagogical Translation | v2.6 🔒 | ACTIVE | TWO ABSOLUTE RULES, examples over precepts, synonym flexibility |
| 2 | Corpus Intelligence | v1.0 | Inactive | FCFS mapping + utility (not in current workflow) |
| 3 | LEGO Extraction | v4.0.2 🔒 | ACTIVE | ONE RULE: Known → Target 1:1 (zero uncertainty), 3-step protocol (TILE/TEST/FIX) |
| 3.5 | Graph Construction | v1.0 | Inactive | LEGO adjacency edges (not in current workflow) |
| 5 | Basket Generation | v2.2 🔒 | ACTIVE | Eternal/debut phrases, batch-aware edge targeting |
| 5.5 | Deduplication | v2.0 🔒 | ACTIVE | Character-identical matching, first occurrence wins |
| 6 | Introductions | v2.0 🔒 | ACTIVE | BASE/COMPOSITE presentations, "means" wording, literal reading |
| 7 | Compilation | v1.0 🔐 | IMMUTABLE | Fixed app manifest format (API contract) |
| 8 | Audio | v1.0 | Documented | TTS + S3 upload (Kai) |

🔒 = Locked, production-ready SSoT (evolvable)
🔐 = Immutable contract (cannot change without external system update)

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
| GET | `/api/courses/:code/analyze` | **NEW** Analyze progress + smart resume suggestions |
| GET | `/api/courses/:code/provenance/:seedId` | Trace provenance chain |
| PUT | `/api/courses/:code/translations/:uuid` | Update translation |
| POST | `/api/courses/generate` | Generate new course (supports startSeed/endSeed) |

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

## Course Validation

Comprehensive validation tools for quality assurance and self-healing batch generation.

### Evolution Principle

**Validators are NOT fixed specifications** - they are v1.0 measurement tools that can evolve. The system can refine validators, create new ones, and iterate on measurement algorithms as it learns. Validators feed the SELF-REGULATION layer, enabling batch-aware course generation where each batch reads previous quality metrics and self-corrects.

### Validators (v1.0)

| Tool | Purpose | Key Metrics |
|------|---------|-------------|
| **analyze-lego-frequency.cjs** | Vocabulary coverage | Practice distribution, under/over-practiced LEGOs |
| **analyze-pattern-coverage.cjs** | LEGO combination diversity | Pattern density, missing/over-used edges |
| **analyze-completeness.cjs** | Overall quality score | Multi-dimensional completeness (0-100%) |

### Quick Start

```bash
# Run all validators on a course
COURSE="spa_for_eng_20seeds"

node validators/analyze-lego-frequency.cjs $COURSE --output vfs/courses/$COURSE/frequency_report.json
node validators/analyze-pattern-coverage.cjs $COURSE --output vfs/courses/$COURSE/pattern_report.json
node validators/analyze-completeness.cjs $COURSE --output vfs/courses/$COURSE/completeness_report.json
```

### Completeness Score Dimensions

1. **Vocabulary (35%)** - Coverage + balance of practice distribution
2. **Patterns (35%)** - Diversity of LEGO combinations (edge coverage)
3. **Distribution (15%)** - Semantic diversity across LEGO types
4. **Progression (15%)** - Complexity increase over time

**Target**: Overall score > 70% for production courses

### Self-Healing Batch Generation

When generating courses in batches (e.g., 20 seeds at a time), validators provide feedback for the next batch:
- Pattern density too low? Next batch prioritizes underused LEGO combinations
- Vocabulary imbalanced? Next batch targets under-practiced LEGOs
- System reads validator output and self-corrects recursively

**See**: `validators/README.md` for detailed documentation and `ssi-course-production.apml` for batch-aware generation architecture

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

## Smart Resume (NEW in v7.8.3)

The dashboard now intelligently analyzes course progress and suggests sensible next actions:

```bash
GET /api/courses/cmn_for_eng/analyze
```

Returns:
- What seed_pairs exist (Phase 1 status)
- What lego_pairs exist (Phase 3 status)
- Missing seed ranges
- Smart recommendations:
  - "Test Run: First 50 Seeds" (always available)
  - "Resume: Seeds 1-70" (if missing contiguous range)
  - "Process All Missing" (if partial completion)
  - "Continue: Phase 4" (if Phase 3 complete)

**No config files needed** - dashboard inspects actual VFS files and figures out what's done.

See: `docs/SMART_RESUME_API.md` for details

---

**Version:** 7.8.3 (Smart Resume + Phase 3 v4.0.2)
**Build:** Clean
**Phase Intelligence**: Phase 1 v2.6, Phase 3 v4.0.2, Phase 5 v2.2 (batch-aware), Phase 5.5 v2.0, Phase 6 v2.0 (🔒 Locked SSoT)
**Date:** 2025-10-29
