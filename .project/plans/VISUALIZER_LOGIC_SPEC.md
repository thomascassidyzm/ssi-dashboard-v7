# Visualizer Logic Specification
**Dashboard Display Items Analysis**
**Date:** 2025-10-14

## Overview

The SSi Dashboard v7.0 contains multiple visualization tools, each serving a specific purpose in understanding different aspects of course generation. This document maps out what each visualizer displays, what data it needs, and what its purpose is.

---

## Dashboard Structure

### Main Sections:
1. **Quick Actions** - Generate/Browse courses
2. **Quality Review & Self-Healing** - Review quality and prompt evolution
3. **Visualization Tools** - 3 main visualizers
4. **Phase Training Pages** - Phase 0-6 documentation
5. **Reference Materials** - Overview, Seeds, APML spec

---

## Visualization Tools (Main Dashboard Cards)

### 1. LEGO Visualizer
**Route:** `/visualize/lego` or `/visualize/lego/:courseCode`
**Component:** `LegoVisualizerExample.vue`

**Purpose:**
- Visual breakdown of LEGO extraction with provenance labels
- Shows how individual LEGOs are extracted from seeds
- Displays provenance tracking (S{seed}L{position})

**Expected Display:**
- Individual LEGO pairs (target/known language)
- Provenance label (e.g., S0001L01)
- Word count
- UUID
- Color-coded by extraction phase

**API Endpoint:** Not yet clear (likely `/api/courses/:code/legos`)

**Current Status:** ⚠️ Demo mode - needs API integration

---

### 2. Seed Visualizer
**Route:** `/visualize/seed` or `/visualize/seed/:translationUuid`
**Component:** `SeedVisualizerDemo.vue`

**Purpose:**
- Visualize seed pairs and extracted LEGOs with translations
- Shows canonical seed → target language → known language flow
- Displays LEGO breakdown from a single seed

**Expected Display:**
- Seed ID (e.g., S1, S2, S3...)
- Canonical English text
- Target language translation
- Known language translation
- Extracted LEGOs from that seed
- Provenance labels

**API Endpoint:** Likely `/api/courses/:code/seeds/:seedId` or similar

**Current Status:** ⚠️ Demo mode - needs API integration

---

### 3. Basket Visualizer
**Route:** `/visualize/basket` or `/visualize/basket/:courseCode`
**Component:** `BasketVisualizerView.vue`

**Purpose:**
- View pattern-aware basket construction with graph coverage
- Shows how LEGOs are grouped into practice baskets
- Displays Phase 5 output (pattern-aware basket construction)

**Expected Display:**
- Basket ID
- LEGOs in basket (with target/known pairs)
- Patterns included (e.g., "pronoun_verb", "modal_infinitive")
- Composite score
- Graph coverage metrics

**API Endpoint:** `/api/courses/:code/baskets`

**Current Status:** ⚠️ Needs testing with real course data

---

## Additional Visualizers (Router Routes)

### 4. SEED → LEGO Breakdown
**Route:** `/visualize/seed-lego/:courseCode?`
**Component:** `SeedLegoVisualizer.vue`

**Purpose:**
- **PRIMARY VISUALIZER** for understanding Phase 3 output
- Shows how seeds decompose into LEGO pairs (teaching units)
- Displays all 668 seeds (or subset) with their LEGO breakdowns

**Expected Display:**
```
SEED 10 (2 LEGOs, 14 words)

Target Language:
┌──────────────┐ ┌────────────────────────────────┐
│ Non sono     │ │ sicuro se riesco a ricordare   │
│ S10L1        │ │ tutta la frase                 │
└──────────────┘ └────────────────────────────────┘

Known Language:
┌──────────────┐ ┌────────────────────────────────┐
│ I'm not      │ │ sure if I can remember the     │
│              │ │ whole sentence                 │
└──────────────┘ └────────────────────────────────┘
```

**API Endpoint:** ✅ **WORKING**
```bash
GET /api/courses/:code/seed-lego-breakdown?limit=2&offset=0
```

**Response Format:**
```json
{
  "total": 668,
  "seeds": [
    {
      "seed_id": "10",
      "uuid": "02a34ce1-1d39-eeaa-eedc-37ff7ee83199",
      "source": "I'm not sure if I can remember the whole sentence.",
      "target": "Non sono sicuro se riesco a ricordare tutta la frase.",
      "lego_count": 5,
      "legos": [
        {
          "uuid": "lego-uuid",
          "target": "Non sono",
          "known": "I'm not",
          "provenance": "S10L1",
          "word_count": 2
        },
        ...
      ]
    }
  ]
}
```

**Current Status:** ✅ **FULLY FUNCTIONAL** - API working, component implemented

---

### 5. LEGO Basket Practice Phrases
**Route:** `/visualize/lego-basket/:courseCode?`
**Component:** `LegoBasketVisualizer.vue`

**Purpose:**
- Shows eternal phrases (e-phrases) and debut phrases (d-phrases) for LEGO practice
- For a specific LEGO (by provenance), shows all practice phrases that include it
- Demonstrates Phase 5 basket construction from LEGO perspective

**Expected Display:**
```
LEGO Provenance: S0001L01

Target: "Dw i"
Known: "I am"

Total Phrases: 47

Eternal Phrases (32):
1. Dw i → I am
2. Dw i'n mynd → I go / I am going
3. Dw i eisiau → I want
...

Debut Phrases (15):
1. Dw i'n hoffi coffi → I like coffee
2. Dw i'n siarad Cymraeg → I speak Welsh
...
```

**API Endpoint:** ⚠️ **NEEDS CLARIFICATION**
```bash
GET /api/courses/:code/lego/:legoProvenance/basket
```

**Expected Response Format:**
```json
{
  "lego_provenance": "S0001L01",
  "target": "Dw i",
  "known": "I am",
  "stats": {
    "totalPhrases": 47,
    "eternalPhrases": 32,
    "debutPhrases": 15
  },
  "eternal_phrases": [
    {
      "basket_id": 1,
      "target": "Dw i",
      "known": "I am",
      "provenance": ["S1L1"]
    }
  ],
  "debut_phrases": [...]
}
```

**Current Status:** ⚠️ Endpoint exists (automation_server.cjs:2033) but needs testing

---

### 6. Phrase Visualizer
**Route:** `/visualize/phrases/:courseCode`
**Component:** `PhraseVisualizer.vue`

**Purpose:**
- Navigate through baskets (Phase 5 output)
- View LEGO phrases within baskets
- Edit basket order (if editable mode enabled)
- Shows patterns included in each basket

**Expected Display:**
```
Basket 42 of 150
3 LEGOs | Score: 8.7

Patterns Included: [pronoun_verb, modal_infinitive]

LEGOs:
1. Dw i eisiau → I want (S3L1)
2. mynd → to go (S2L2)
3. i'r dref → to town (S47L3)
```

**API Endpoint:** `/api/courses/:code/baskets`

**Current Status:** ⚠️ Needs testing with real basket data

---

## Quality Review & Self-Healing

### 7. Quality Dashboard
**Route:** `/quality/:courseCode`
**Component:** `QualityDashboard.vue`

**Purpose:**
- Review extraction quality across all seeds
- Flag problematic seeds
- Trigger regeneration for specific seeds
- View quality metrics (acceptance rate, flagged rate, etc.)

**Expected Display:**
- Overall course quality score
- Seeds requiring review (flagged/failed)
- Quality distribution chart
- "Regenerate" buttons for flagged seeds

**API Endpoint:** `/api/courses/:code/quality`

**Current Status:** ⚠️ Needs testing

---

### 8. Prompt Evolution View
**Route:** `/quality/:courseCode/evolution`
**Component:** `PromptEvolutionView.vue`

**Purpose:**
- Track prompt versions over time
- Show learned rules from failed extractions
- Display A/B testing results
- View self-improvement history

**Expected Display:**
```
Prompt v1.0 (2025-10-14)
- Apply 6 pedagogical heuristics
- IRON RULE: No LEGOs with preposition boundaries
- Prioritize naturalness over literal translation
Success Rate: 85%

Learned Rules (0 so far):
[Empty - system learns over time]

Experimental Rules:
[A/B testing in progress]
```

**API Endpoint:** ✅ **WORKING**
```bash
GET /api/courses/:code/prompt-evolution
```

**Current Status:** ✅ API working, returns version history and learned rules

---

### 9. Course Health Report
**Route:** `/quality/:courseCode/health`
**Component:** `CourseHealthReport.vue`

**Purpose:**
- Overall course health metrics
- Identify systemic issues
- Track improvement over regeneration cycles

**Expected Display:**
- Quality score over time
- Common error patterns
- Recommendations for improvement

**API Endpoint:** Not clear

**Current Status:** ⚠️ Needs specification

---

## Course Management

### 10. Course Browser
**Route:** `/courses`
**Component:** `CourseBrowser.vue`

**Purpose:**
- List all generated courses
- Show course metadata (language pair, seed count, completion status)
- Link to course editor and visualizers

**API Endpoint:** ✅ **WORKING**
```bash
GET /api/courses
```

**Current Status:** ✅ API returns 4 courses

---

### 11. Course Editor
**Route:** `/courses/:courseCode`
**Component:** `CourseEditor.vue`

**Purpose:**
- Edit individual seed translations
- Review LEGO extractions
- Trigger regeneration
- View provenance tracking

**Expected Display:**
- All 668 seeds (or subset)
- Edit translation inline
- View extracted LEGOs
- Mark for regeneration

**API Endpoint:** ✅ **WORKING**
```bash
GET /api/courses/:courseCode
```

**Current Status:** ✅ API returns full course data with translations

---

## Summary: What Each Visualizer SHOULD Display

### Phase 3 Output (LEGO Extraction)
- **SEED → LEGO Breakdown** ✅ - Shows how seeds break into LEGOs
  - Example: "I want coffee" → ["I want", "coffee"]
  - Provenance labels: S3L1, S3L2

### Phase 4 Output (Deduplication)
- No dedicated visualizer yet
- Could show: "LEGO 'I want' appears in 47 seeds, deduplicated to single node"

### Phase 5 Output (Baskets)
- **Phrase Visualizer** ⚠️ - Navigate through baskets, view LEGO phrases
- **LEGO Basket Practice Phrases** ⚠️ - For a LEGO, show all phrases containing it
- **Basket Visualizer** ⚠️ - Pattern-aware basket construction visualization

### Phase 3.5 Output (Graph)
- No dedicated visualizer yet
- Could show: LEGO adjacency graph with edges (which LEGOs appear next to each other)

---

## API Endpoints Status

| Endpoint | Status | Used By |
|----------|--------|---------|
| `/api/health` | ✅ Working | System health |
| `/api/languages` | ✅ Working | Course generation dropdown |
| `/api/courses` | ✅ Working | Course browser |
| `/api/courses/:code` | ✅ Working | Course editor, Course detail |
| `/api/courses/:code/seed-lego-breakdown` | ✅ Working | SEED → LEGO visualizer |
| `/api/courses/:code/prompt-evolution` | ✅ Working | Prompt evolution view |
| `/api/prompts/:id` | ✅ Working | Phase training pages |
| `/api/courses/:code/quality` | ⚠️ Untested | Quality dashboard |
| `/api/courses/:code/baskets` | ❌ 404 Error | Basket visualizers |
| `/api/courses/:code/lego-graph` | ❌ 404 Error | (No visualizer yet) |
| `/api/courses/:code/lego/:id/basket` | ⚠️ Exists but untested | LEGO basket practice |
| `/api/courses/:code/provenance/:seedId` | ❌ Error | Provenance tracking |

---

## Recommendations

### Critical Missing Endpoints
1. **Baskets API** - `/api/courses/:code/baskets`
   - Current: Returns 404
   - Needed for: Phrase Visualizer, Basket Visualizer
   - Should return: Array of baskets with LEGOs, patterns, scores

2. **LEGO Graph API** - `/api/courses/:code/lego-graph`
   - Current: Returns 404
   - Needed for: Phase 3.5 visualization (future)
   - Should return: Graph nodes (LEGOs) and edges (adjacency)

### Clarifications Needed

**Question 1:** What's the difference between these basket visualizers?
- `BasketVisualizerView.vue` (Dashboard card)
- `PhraseVisualizer.vue` (Route: `/visualize/phrases/:code`)
- `LegoBasketVisualizer.vue` (Route: `/visualize/lego-basket/:code`)

**Answer:**
- **BasketVisualizerView:** Overview of pattern-aware baskets (Phase 5 high-level)
- **PhraseVisualizer:** Navigate basket-by-basket, see LEGO phrases, edit order
- **LegoBasketVisualizer:** LEGO-centric view - for a specific LEGO, show all phrases

**Question 2:** What's the difference between these LEGO visualizers?
- `LegoVisualizerExample.vue` (Dashboard card)
- `SeedLegoVisualizer.vue` (Route: `/visualize/seed-lego/:code`)

**Answer:**
- **LegoVisualizerExample:** Shows individual LEGO breakdown (demo/example mode)
- **SeedLegoVisualizer:** Shows ALL seeds and their LEGO breakdowns (production tool)

**Question 3:** Do we need to implement the missing basket endpoints?

**Suggested Priority:**
1. ✅ **DONE:** SEED → LEGO breakdown (most critical - shows Phase 3 output)
2. 🔴 **HIGH:** Baskets API (needed for 3 visualizers)
3. 🟡 **MEDIUM:** LEGO → Basket practice phrases (useful for understanding basket construction)
4. 🟢 **LOW:** LEGO graph visualization (Phase 3.5 - more advanced)

---

## Expected User Flow

### Learning About Course Structure
1. Dashboard → **Canonical Seeds** reference → Understand the 668 seeds
2. Dashboard → **Process Overview** → Understand the 8-phase pipeline
3. Dashboard → **APML Spec** → Understand the amino acid storage model

### Understanding a Course
1. Dashboard → **Browse Courses** → Select "ita_for_eng_668seeds"
2. Course Detail → View translations and metadata
3. **SEED → LEGO Breakdown** → See how seeds break into LEGOs
4. **LEGO Basket Practice** → See how LEGOs are grouped into practice phrases
5. **Phrase Visualizer** → Navigate through baskets

### Quality Review
1. Dashboard → **Quality Dashboard** → See overall course quality
2. Flag problematic seeds
3. **Prompt Evolution** → View learned rules
4. Trigger regeneration for flagged seeds

### Generating New Course
1. Dashboard → **Generate New Course**
2. Select language pair (50 options)
3. Set seed count (1-668)
4. Monitor progress (Phase 0 → 6 → Compilation)
5. View generated course

---

## Data Flow Architecture

```
Canonical Seeds (668)
    ↓ Phase 1: Pedagogical Translation
Translation Pairs (668 × target + known)
    ↓ Phase 2: Corpus Intelligence
FCFS Mapping + Utility Scores
    ↓ Phase 3: LEGO Extraction
LEGOs (~2000-3000 with provenance)
    ↓ Phase 3.5: Graph Construction
LEGO Adjacency Graph (edges)
    ↓ Phase 4: Deduplication
Deduplicated LEGOs (~500-800 unique)
    ↓ Phase 5: Pattern-Aware Baskets
Baskets (~150-200) with e-phrases/d-phrases
    ↓ Phase 6: Introductions
Final Course with priming phrases
```

### Visualizers Map to Pipeline Stages

| Phase | Output | Visualizer |
|-------|--------|------------|
| Phase 1 | Translations | Course Editor |
| Phase 3 | LEGOs | SEED → LEGO Breakdown ✅ |
| Phase 3.5 | Graph | (Not yet implemented) |
| Phase 4 | Deduplicated LEGOs | (Not yet implemented) |
| Phase 5 | Baskets | Phrase Visualizer, Basket Visualizers ⚠️ |
| Phase 6 | Introductions | (Not yet implemented) |

---

## Next Steps

1. **Test SEED → LEGO Breakdown** ✅ (Already working!)
2. **Implement Baskets API** - Required for 3 visualizers
3. **Test Basket Visualizers** - Once API is available
4. **Clarify Phase 3.5 visualization** - Do we need LEGO graph display?
5. **Manual UI Testing** - User should test live site to verify display correctness
