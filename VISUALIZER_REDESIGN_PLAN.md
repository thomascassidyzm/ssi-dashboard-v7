# Visualizer Redesign Plan

**Date**: 2025-10-14
**Status**: Planning Phase
**Priority**: High (UX improvement)

---

## Problem Statement

Current visualizers don't match the intended SSi pedagogical model:
- **LEGO Visualizer**: Shows list of LEGOs with filters (not useful for understanding tiling)
- **Basket Visualizer**: Shows random LEGO collection with patterns (wrong concept)
- **Missing**: SEED-to-LEGO breakdown visualizer

---

## Three Visualizers Needed

### 1. SEED Breakdown Visualizer (NEW)
**Purpose**: Show how a SEED decomposes into LEGO_PAIRS

**Design** (based on user's screenshots):
```
┌─────────────────────────────────────────────────────────────┐
│  SEED: S0180                      3 LEGOs • 4 FEEDERs       │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐ ┌──────────────────┐ ┌─────────────┐ │
│  │ Él puede         │ │ construir        │ │ una nueva   │ │
│  │ construir        │ │                  │ │ vida        │ │
│  │ S180L01          │ │ S180L02          │ │ S180L03     │ │
│  └──────────────────┘ └──────────────────┘ └─────────────┘ │
│                            ↓                                 │
│  ┌──────────────────┐ ┌──────────────────┐ ┌─────────────┐ │
│  │ He can build     │ │ a new life       │ │ for his     │ │
│  │                  │ │                  │ │ sister      │ │
│  └──────────────────┘ └──────────────────┘ └─────────────┘ │
├─────────────────────────────────────────────────────────────┤
│  COMPONENTIZATION: S180L01                                  │
│  "He can build" = "Él puede construir"                      │
│  - "él" = "he"                                              │
│  - "puede" = "can"                                          │
│  - "construir" = "build" (which you already know)           │
│                                                             │
│  ASSOCIATED FEEDERs:                                        │
│  ┌──────────────────────┐                                  │
│  │ S180F01              │                                  │
│  │ construir ↔ build    │                                  │
│  └──────────────────────┘                                  │
├─────────────────────────────────────────────────────────────┤
│  ALL SEED FEEDERs:                                          │
│  ┌────────────────┐  ┌────────────────┐                   │
│  │ S180F01        │  │ S180F02        │                   │
│  │ construir↔build│  │ nueva ↔ new    │                   │
│  └────────────────┘  └────────────────┘                   │
│  ┌────────────────┐  ┌────────────────┐                   │
│  │ S180F03        │  │ S180F04        │                   │
│  │ vida ↔ life    │  │ hermana↔sister │                   │
│  └────────────────┘  └────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

**Features**:
- Click any LEGO to see its componentization
- Show FEEDER_LEGOS (atomic bilingual pairs) at bottom
- Bilingual alignment (target language above, known language below)
- Clear visual hierarchy: SEED → LEGOs → FEEDERs

**Data Required**:
- Seed translation (from `amino_acids/translations/*.json`)
- LEGOs for that seed (from `amino_acids/legos/*.json` with matching provenance)
- FEEDER_LEGOS extracted from seed (Phase 2 output)

---

### 2. LEGO Tiling Visualizer (REDESIGN)
**Purpose**: Show how LEGOs tile together to form SEEDs, with adjustable boundaries

**Design Concept**:
```
┌─────────────────────────────────────────────────────────────┐
│  LEGO TILING EDITOR                                         │
│  Showing: S0180, S0181, S0182 (3 seeds using common LEGOs) │
├─────────────────────────────────────────────────────────────┤
│  ┌────────┬────────┬────────────────────────────┐          │
│  │ Él     │ puede  │ construir                  │          │
│  │ puede  │        │                            │          │
│  │ const- │        │                            │          │
│  │ ruir   │        │                            │          │
│  │ S180L01│        │ S180L02 ←[drag]→ S180L03  │          │
│  └────────┴────────┴────────────────────────────┘          │
│                                                             │
│  Boundary Controls:                                         │
│  • Drag dividers to reposition LEGO boundaries             │
│  • Must maintain valid Spanish/English alignment           │
│  • Shows which LEGOs would be affected by change           │
├─────────────────────────────────────────────────────────────┤
│  TILING RULES:                                              │
│  ✓ LEGOs must tile perfectly (no gaps)                     │
│  ✓ Both languages must align at boundaries                 │
│  ✓ Changes propagate to all seeds using these LEGOs        │
└─────────────────────────────────────────────────────────────┘
```

**Features**:
- **Interactive boundaries**: Drag dividers to change where LEGOs split
- **Tiling validation**: Show warnings if boundaries would break alignment
- **2 LEGOs side-by-side**: Show 2 seeds that share LEGOs (max 4 on page)
- **Preview mode**: Show "before/after" for boundary changes
- **"Save & Regenerate" button**: Allow experimenting before triggering Phase 3+ regeneration

**Data Required**:
- Multiple seeds with their LEGO breakdowns
- Word-level alignment data (to validate boundaries)
- LEGO deduplication graph (to see which seeds share LEGOs)

---

### 3. Basket Visualizer (FIX)
**Purpose**: Show practice phrases (e-phrases & d-phrases) for ONE LEGO

**Current Problem**: Shows collection of random LEGOs with pattern tags
**Should Show**: Practice phrases generated in Phase 5 for a single LEGO

**Design**:
```
┌─────────────────────────────────────────────────────────────┐
│  BASKET for LEGO: S180L02 "una nueva vida" / "a new life"  │
├─────────────────────────────────────────────────────────────┤
│  E-PHRASES (Eternal Practice - 3-5 phrases)                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 1. Quiero construir una nueva vida contigo aquí     │  │
│  │    I want to build a new life with you here         │  │
│  │    [7 words] ✓                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 2. Ella necesita una nueva vida después del trabajo │  │
│  │    She needs a new life after that work             │  │
│  │    [8 words] ✓                                       │  │
│  └──────────────────────────────────────────────────────┘  │
│  ... (1-3 more, depending on quality)                      │
├─────────────────────────────────────────────────────────────┤
│  D-PHRASES (Debut Practice - Progressive Complexity)        │
│                                                             │
│  2-LEGO Phrases:                                            │
│  ┌────────────────────────────────────┐                   │
│  │ una nueva vida para • a new life for│                   │
│  └────────────────────────────────────┘                   │
│  ┌────────────────────────────────────┐                   │
│  │ construir una nueva vida • build a new life │           │
│  └────────────────────────────────────┘                   │
│                                                             │
│  3-LEGO Phrases:                                            │
│  ┌────────────────────────────────────┐                   │
│  │ quiero una nueva vida contigo • I want a new life with you│
│  └────────────────────────────────────┘                   │
│  ... (1 more)                                               │
│                                                             │
│  4-LEGO Phrases:                                            │
│  ... (2 phrases)                                            │
│                                                             │
│  5-LEGO Phrases:                                            │
│  ... (2 phrases)                                            │
└─────────────────────────────────────────────────────────────┘
```

**Features**:
- **LEGO header**: Show target LEGO clearly (both languages)
- **E-phrases section**: 3-5 practice phrases (7-15 words each, quality over quantity)
- **D-phrases section**: Progressive 2/3/4/5-LEGO combinations (2x each = 8 total)
- **Word count validation**: Show if phrase meets 7-15 word requirement
- **Progressive vocabulary indicator**: Show which prior LEGOs are used
- **Browse by UID order**: Simple next/prev navigation through LEGO sequence

**Data Required**:
- Phase 5 output: `phase_outputs/phase_5_baskets.json`
- Basket structure:
```json
{
  "S####L##": {
    "target": "una nueva vida",
    "known": "a new life",
    "seed_origin": "S####",
    "e_phrases": [
      ["7-15 word phrase with target LEGO", "translation"],
      ["another 7-15 word phrase", "translation"],
      ["third phrase", "translation"]
      // 3-5 phrases total (quality over quantity)
    ],
    "d_phrases": {
      "2_lego": [
        ["2-LEGO phrase", "translation"],
        ["another 2-LEGO phrase", "translation"]
      ],
      "3_lego": [
        ["3-LEGO phrase", "translation"],
        ["another 3-LEGO phrase", "translation"]
      ],
      "4_lego": [
        ["4-LEGO phrase", "translation"],
        ["another 4-LEGO phrase", "translation"]
      ],
      "5_lego": [
        ["5-LEGO phrase", "translation"],
        ["another 5-LEGO phrase", "translation"]
      ]
    }
  }
}
```

---

## Implementation Plan

### Phase 1: Data Layer (API Endpoints)
**Priority**: High

1. **GET `/api/courses/:code/seed/:seedId/breakdown`**
   - Returns: Seed translation + LEGOs + FEEDERs
   - Data: Read from translations + legos with matching provenance

2. **GET `/api/courses/:code/lego/:legoId/basket`**
   - Returns: E-phrases + D-phrases for one LEGO
   - Data: Read from `phase_5_baskets.json`

3. **GET `/api/courses/:code/lego-tiling/:seedIds`**
   - Returns: Multiple seeds with LEGO boundaries
   - Data: Read translations + legos for multiple seeds
   - Shows: How boundaries align across seeds

**Estimated Time**: 2 hours

### Phase 2: Redesign Components
**Priority**: High

1. **Create `SeedBreakdownVisualizer.vue`** (new)
   - Replaces current LegoVisualizer
   - Shows SEED → LEGO decomposition
   - Based on user's screenshots

2. **Redesign `LegoTilingVisualizer.vue`** (redesign)
   - Show 3-5 seeds side-by-side
   - Draggable boundaries between LEGOs
   - Validation warnings for invalid boundaries

3. **Fix `BasketVisualizer.vue`** (complete rewrite)
   - Show e-phrases (5 phrases)
   - Show d-phrases (2+2+2+2 phrases)
   - Navigate between LEGO baskets

**Estimated Time**: 6 hours

### Phase 3: Routing & Navigation
**Priority**: Medium

Update routes:
```javascript
{
  path: '/visualize/seed/:courseCode/:seedId',
  name: 'SeedBreakdown',
  component: SeedBreakdownVisualizer
},
{
  path: '/visualize/tiling/:courseCode/:seedIds',
  name: 'LegoTiling',
  component: LegoTilingVisualizer
},
{
  path: '/visualize/basket/:courseCode/:legoId',
  name: 'BasketVisualizer',
  component: BasketVisualizer
}
```

**Estimated Time**: 1 hour

### Phase 4: Testing & Polish
**Priority**: Medium

- Test with real Italian course data
- Verify FEEDER_LEGO extraction
- Test boundary dragging with multiple seeds
- Verify baskets load from Phase 5 output

**Estimated Time**: 2 hours

---

## Total Estimated Time: 11 hours

---

## Data Structure Reference

### Seed Translation (from VFS)
```json
{
  "uuid": "...",
  "seed_id": "180",
  "source": "He can build a new life for his sister.",
  "target": "Él puede construir una nueva vida para su hermana.",
  "lego_count": 3,
  "quality_score": 85
}
```

### LEGO (from VFS)
```json
{
  "uuid": "...",
  "text": "una nueva vida",
  "provenance": "S180L02",
  "source_translation_uuid": "...",
  "position": 2,
  "word_count": 3,
  "pedagogical_score": 75
}
```

### Basket (from Phase 5)
```json
{
  "S180L02": {
    "target": "una nueva vida",
    "known": "a new life",
    "seed_origin": "S180",
    "e_phrases": [
      ["Quiero construir una nueva vida contigo aquí hoy", "I want to build a new life with you here today"],
      ...
    ],
    "d_phrases": {
      "2_lego": [
        ["una nueva vida para", "a new life for"],
        ["construir una nueva vida", "build a new life"]
      ],
      "3_lego": [...],
      "4_lego": [...],
      "5_lego": [...]
    }
  }
}
```

---

## User Clarifications ✅

1. **Boundary editing**: ✅ Separate "Save & Regenerate" button - allow experimenting with different boundaries before triggering regeneration

2. **FEEDER terminology**: ✅ Old term - now use **BASE LEGOs** vs **COMPOSITE LEGOs**
   - FEEDERs (S####F##) = sub-components of multi-word LEGOs
   - Derive from componentization (should be in Phase 3 JSON already)
   - **TODO**: Verify this data exists in VFS, or implement derivation logic

3. **Basket navigation**: ✅ No click-through needed - view baskets in LEGO sequence UID order directly

4. **Multi-seed tiling view**: ✅ Max 2 LEGOs side-by-side, possibly 4 on a page for easy visualization

5. **Basket specs** (from APML v7.2.0):
   - **3-5 e-phrases** (NOT 5 fixed) - quality over quantity
   - 7-15 words in target language (MINIMUM 7, MAXIMUM 15)
   - 2x 2-LEGO, 2x 3-LEGO, 2x 4-LEGO, 2x 5-LEGO d-phrases
   - Progressive vocabulary constraint (LEGO #N can only use LEGOs #1 to #N-1)

---

## Success Metrics

✅ Users can see how SEEDs break into LEGOs
✅ Users can understand LEGO tiling (how they combine)
✅ Users can explore practice phrases (e-phrases & d-phrases)
✅ Users can adjust LEGO boundaries (advanced feature)
✅ All visualizers use real VFS/Phase 5 data

---

**Next Step**: Get user approval, then implement Phase 1 (API endpoints)
