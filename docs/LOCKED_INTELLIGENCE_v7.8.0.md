# Locked Intelligence v7.8.0

**Date**: 2025-10-28
**Status**: 🔒 Production-ready SSoT for course generation
**Previous Version**: 7.7.0

---

## Overview

This document captures the locked, tested intelligence that serves as the Single Source of Truth (SSoT) for SSi course production v7.8.0.

**Active Workflow**: Phase 1 → 3 → 5

---

## 🔒 Locked Phase Intelligence

### Phase 1: Pedagogical Translation → seed_pairs.json
**Version**: v2.5 (2025-10-28)
**File**: `docs/phase_intelligence/phase_1_seed_pairs.md`
**Status**: ✅ ACTIVE (Locked SSoT)

**Key Principles**:
- **TWO ABSOLUTE RULES**:
  1. NEVER change canonical meaning (even to avoid complex grammar)
  2. Strongly prefer cognates for seeds 1-100 (when available)
- **Examples over precepts**: Spanish, French, Mandarin thinking patterns
- **Use canonical English directly**: When English is target OR known (no back-translation)
- **Balance principle**: Cognate transparency vs known language smoothness
- **Zero-variation**: "First Word Wins" for consistency
- **Extended Thinking**: Required for quality translation decisions

**Tested with**: spa_for_eng_20seeds (Oct 28, 2025)
**Output quality**: ✅ Correct subjunctive preservation, natural English, balanced vocab

---

### Phase 3: LEGO Extraction → lego_pairs.json
**Version**: v3.3 (2025-10-27)
**File**: `docs/phase_intelligence/phase_3_lego_pairs.md`
**Status**: ✅ ACTIVE (Locked SSoT)

**Key Principles**:
- **TILING FIRST**: Every seed must decompose into LEGOs that reconstruct it perfectly
- **Isolated seed approach**: Treat each seed independently (no premature deduplication)
- **4-step decomposition**: Tiling → Feeders → COMPOSITE marking → FD validation
- **COMPOSITE LEGOs**: With componentization arrays showing literal translations
- **Feeder extraction**: Extract meaningful chunks that reduce cognitive load
- **Functional Determinism**: One input = one output (no ambiguity)

**Tested with**: spa_for_eng_20seeds (Oct 28, 2025)
**Output quality**: ✅ COMPOSITE LEGOs present, componentization arrays, TILING verified

---

### Phase 5: Basket Generation → lego_baskets.json
**Version**: v2.1 (2025-10-26)
**File**: `docs/phase_intelligence/phase_5_lego_baskets.md`
**Status**: ✅ ACTIVE (Locked SSoT)

**Key Principles**:
- **Eternal phrases (e)**: 3-4 high-value phrases for spaced repetition (returned to repeatedly)
- **Debut phrases (d)**: Expanding windows (2, 3, 4, 5 LEGOs) for first presentation only
- **ABSOLUTE GATE**: Vocabulary constraint (LEGO #N can only use LEGOs #1 to N-1)
- **Balanced vocabulary**: Eternal phrases draw from diverse previous LEGOs
- **Grammatical accuracy**: Perfect grammar in BOTH languages (never sacrifice for variety)
- **Semantic value**: All phrases must be meaningful and useful

**Tested with**: spa_for_eng_20seeds (Oct 28, 2025)
**Output quality**: ✅ High-value eternal phrases, systematic debut phrases, vocab balance

---

## 📊 Test Results

### Test Course: spa_for_eng_20seeds
**Date**: 2025-10-28
**Seeds**: 20
**LEGOs**: 64
**Baskets**: 64

**Phase 1 Output** (`seed_pairs.json`):
- ✅ Canonical meaning preserved (S0015 subjunctive correct)
- ✅ Canonical English used directly (no back-translation)
- ⚠️ S0003 uses "a menudo" instead of "frecuentemente" (acceptable variation)

**Phase 3 Output** (`lego_pairs.json`):
- ✅ COMPOSITE LEGOs present (vs previous "all BASE" garbage)
- ✅ Componentization arrays with literal translations
- ✅ TILING verified (all seeds reconstruct perfectly)
- ✅ Good LEGO reuse across seeds
- ✅ Subjunctive captured correctly (S0015L02 "que hables")

**Phase 5 Output** (`lego_baskets.json`):
- ✅ Eternal phrases: High-value, balanced vocabulary
- ✅ Debut phrases: Systematic expanding windows
- ✅ ABSOLUTE GATE enforced (vocabulary constraint working)
- ✅ Grammatical accuracy in both languages
- ✅ Semantic value maintained

**Example Quality** (S0020L03 "rápidamente"):
```json
{
  "e": [
    "Quieres aprender su nombre rápidamente",
    "Quiero hablar español rápidamente",
    "Me gustaría poder descubrir la respuesta rápidamente",
    "Queremos encontrarnos rápidamente"
  ],
  "d": {
    "2": ["aprender rápidamente", "hablar rápidamente"],
    "3": ["Quieres aprender rápidamente", "su nombre rápidamente"],
    ...
  }
}
```

---

## 🔧 Next Implementation Targets

### Phase 5.5: Basket Deduplication
**Status**: 🔨 TODO
**Purpose**: Identify duplicate LEGOs (same target + known text), keep first occurrence
**Expected**: ~22% deduplication rate

### Phase 6: Introduction Generation
**Status**: 🔨 TODO
**Purpose**: Component-based presentations for each LEGO
**Input**: Componentization arrays from Phase 3

---

## 📝 Dashboard Integration

### Updated Components
- **PhaseIntelligence.vue**: Updated with v2.5, v3.3, v2.1 versions
- **API Endpoint**: Corrected to `/api/prompts/:phase`
- **Visual Indicators**: 🔒 Lock icon for production-ready intelligence
- **Status Colors**: active (green), inactive (gray), todo (yellow), complete (blue), documented (purple)

### Serving Intelligence
**Endpoint**: `GET /api/prompts/:phase`
**Response**: JSON with `prompt` (raw markdown), `version`, `phase`
**Available Phases**: 1, 3, 5 (locked intelligence)

---

## 📚 Reference Documentation

- **Phase Intelligence README**: `docs/phase_intelligence/README.md`
- **Main README**: `README.md` (updated with locked intelligence versions)
- **Automation Server**: `automation_server.cjs` (lines 56-86 load from markdown files)

---

## 🎯 Success Criteria

For intelligence to be "locked":
1. ✅ Tested with real course generation (20+ seeds)
2. ✅ Output quality verified (no garbage, correct patterns)
3. ✅ Versioned in markdown files with clear version history
4. ✅ Served by automation server from markdown SSoT
5. ✅ Documented in README and Phase Intelligence README
6. ✅ Dashboard UI reflects current versions
7. ✅ Committed to version control

**All criteria met for Phase 1 v2.5, Phase 3 v3.3, Phase 5 v2.1** 🔒

---

**This document serves as the definitive reference for v7.8.0 locked intelligence state.**
