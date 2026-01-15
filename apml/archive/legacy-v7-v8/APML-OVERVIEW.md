# SSi Course Production - APML Specification Overview

## What This Document Is

`ssi-course-production.apml` is the **Single Source of Truth** for the entire SSi course production system. It captures:

1. **What we want the system to achieve** (intent and purpose)
2. **How the system works** (architecture and flow)
3. **All the intelligence that makes it work** (phase prompts with detailed methodology)
4. **Every important name and path** (Variable Registry)
5. **Interface specifications** (what the dashboard does)

## Why This Exists

**The Problem We Solve:**
During the v7 redesign, we lost 250+ lines of critical Phase 3 intelligence because prompts were scattered across multiple files and got replaced with generic summaries. The dashboard showed pretty documentation that didn't match what Claude actually received.

**The Solution:**
One APML specification that is:
- ✅ The source for automation_server.cjs (what Claude executes)
- ✅ The source for TrainingPhase.vue (what humans see)
- ✅ Version controlled (tracks every change)
- ✅ Self-documenting (specification IS the implementation)
- ✅ Published with dashboard (Vercel always has latest)

## What's Inside the APML

### Section 1: System Overview & Intent
**What it contains:**
- System purpose (what we're building and why)
- Architecture diagram (User → Dashboard → Tunnel → Claude Code → VFS)
- Critical success factors

**Why it matters:**
Anyone can understand the entire system in 5 minutes. No need to reverse-engineer code.

### Section 2: Variable Registry (Single Source of Truth)
**What it contains:**
- Core concepts (amino acids, UUIDs, provenance, VFS structure)
- API endpoints (exact paths and parameters)
- Batch configurations (how many seeds per batch per phase)
- Course code formats (fra_for_eng_speakers, etc.)

**Why it matters:**
Every variable name, path, and configuration in ONE place. If you need to change a batch size or API path, you change it here and regenerate everything.

### Section 3: Phase Specifications (The Critical Intelligence)

Each phase has:
- **NAME** - What it's called
- **PURPOSE** - What it achieves
- **INPUT** - What files it reads
- **OUTPUT** - What files it creates
- **CRITICAL_INTELLIGENCE** - The detailed methodology (especially Phase 3!)
- **PROMPT** - The exact text Claude receives

**Phase 3 Example** (the one we almost lost):
- 250+ lines of FD_LOOP test methodology
- FCFS semantic territory claiming rules
- Automatic rejection lists (function words that always fail)
- Dual-pass validation process
- Componentization requirements
- Concrete examples with exact JSON structure

**Why it matters:**
This is the BRAIN of the system. Without these detailed prompts, Claude would have no idea how to properly decompose sentences into LEGOs. These prompts are battle-tested and represent months of refinement.

### Section 4: Dashboard Interface Specifications
**What it contains:**
- Component layouts and interactions
- Data flow between frontend and backend
- Real-time status polling
- Edit/regeneration workflows

**Why it matters:**
Documents how the dashboard uses the phase prompts and connects to the automation server.

## How It's Used

### During Development
```
Developer edits ssi-course-production.apml
  ↓
Compiler generates .apml-registry.json (machine-readable)
  ↓
automation_server.cjs reads prompts from registry
  ↓
TrainingPhase.vue displays prompts from registry
  ↓
Both execution and documentation stay in sync
```

### During Course Generation
```
User clicks "Generate Course" in dashboard
  ↓
Dashboard sends request to automation_server.cjs
  ↓
automation_server.cjs reads PHASE_PROMPTS from .apml-registry.json
  ↓
Spawns Claude Code with actual working prompts
  ↓
Claude receives detailed, battle-tested intelligence
  ↓
Generates high-quality course outputs
  ↓
Dashboard polls and displays results
```

### When Intelligence Changes
```
Developer updates Phase 3 prompt in APML
  ↓
Git tracks the change (full version history)
  ↓
Regenerate .apml-registry.json
  ↓
Both Claude execution AND dashboard docs update automatically
  ↓
No drift between what we document and what we run
```

## Key Metrics

- **668 canonical seed sentences** in the corpus
- **7 phases** (0, 1, 2, 3, 3.5, 4, 5, 6) plus compilation
- **3 critical batch sizes:**
  - Phase 1 (Translation): 100 seeds per batch (easier work)
  - Phase 3 (LEGO Decomposition): 20 seeds per batch (complex work)
  - Phase 5 (Baskets): 20 LEGOs per batch
- **250+ lines** of Phase 3 intelligence (FD_LOOP, FCFS, validation)
- **1 source of truth** for all prompts, variables, and specifications

## The Guarantee

With this APML specification:

✅ **No more intelligence loss** - Everything is documented in one place
✅ **No more drift** - Dashboard shows what Claude actually receives
✅ **No more guessing** - Every decision is documented with rationale
✅ **Easy onboarding** - New developers understand the system quickly
✅ **Confident refactoring** - Can rewrite UI without losing intelligence
✅ **Version history** - Can see how prompts evolved over time

## Quick Start

1. **Read this overview** to understand the structure
2. **Read ssi-course-production.apml** for complete details
3. **Check .apml-registry.json** for machine-readable format
4. **View PROJECT-DASHBOARD.html** for visual navigation

## Next Steps

After completing the APML specification, we will:

1. ✅ Complete all phase specifications (Phases 3.5-6)
2. ✅ Add dashboard interface specifications
3. ✅ Generate .apml-registry.json (machine-readable)
4. ✅ Update automation_server.cjs to read from registry
5. ✅ Update TrainingPhase.vue to display from registry
6. ✅ Add prompt editing API endpoints
7. ✅ Deploy to Vercel with self-documentation

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    ssi-course-production.apml                    │
│                     (Single Source of Truth)                     │
│                                                                  │
│  • System Intent & Architecture                                 │
│  • Variable Registry (all names, paths, configs)                │
│  • Phase Prompts (complete intelligence)                        │
│  • Dashboard Interface Specs                                    │
└────────────────┬─────────────────────────┬──────────────────────┘
                 │                         │
                 ↓                         ↓
    ┌────────────────────────┐  ┌──────────────────────┐
    │  .apml-registry.json   │  │  TrainingPhase.vue   │
    │  (Machine-Readable)    │  │  (Human UI)          │
    └────────┬───────────────┘  └──────────────────────┘
             │
             ↓
    ┌────────────────────────┐
    │  automation_server.cjs │
    │  (Orchestrator)        │
    └────────┬───────────────┘
             │
             ↓
    ┌────────────────────────┐
    │    osascript           │
    │    Claude Code         │
    │    Sonnet 4.5          │
    └────────┬───────────────┘
             │
             ↓
    ┌────────────────────────┐
    │    VFS (courses/)      │
    │    Amino Acids         │
    │    Course Outputs      │
    └────────────────────────┘
```

## The Promise

**Before (v6):**
- Prompts scattered across multiple files
- Dashboard showed generic summaries
- Lost 250+ lines during v7 redesign
- Docs didn't match execution

**After (v7 with APML):**
- One specification = one truth
- Dashboard shows actual prompts
- Intelligence preserved forever
- Docs = execution = reality

---

**Last Updated:** 2025-10-13
**APML Version:** 1.1.0
**System Version:** 7.0.0
