# Visualizer Implementation Status

**Date**: 2025-10-14 02:11 UTC
**Status**: In Progress

---

## Summary

✅ API endpoints implemented
⚠️ Phase 5 baskets need regeneration to match APML v7.2.0
🚧 Visualizers in progress

---

## What's Working

### 1. API Endpoints ✅

**GET `/api/courses/:code/seed-lego-breakdown?limit=30`**
- Returns multiple seeds with their LEGO breakdowns
- Perfect for SEED→LEGO tiling visualizer
- Tested with Italian course: 668 seeds, works perfectly

**GET `/api/courses/:code/lego/:legoProvenance/basket`**
- Implemented but needs Phase 5 regeneration
- Current data uses old basket format (not compatible)

---

## Data Issues

### Italian Course (`ita_for_eng_668seeds`)

**✅ Good Data:**
- 668 translations (Phase 1 complete)
- 2341 LEGOs (Phase 3 complete)
- Phase 3.5 LEGO graph (611KB)
- Phase 4 deduplication

**❌ OLD Format:**
- Phase 5 baskets use old format:
  ```json
  {
    "baskets": {
      "0": { "name": "Italian Reflexive Verbs", "legos": [20 LEGOs] },
      "1": { "name": "...", "legos": [20 LEGOs] },
      "2": { "name": "...", "legos": [20 LEGOs] }
    }
  }
  ```

**❌ APML v7.2.0 Format (needed):**
  ```json
  {
    "baskets": {
      "S0001L01": {
        "target": "voglio",
        "known": "I want",
        "e_phrases": [[phrase, translation], ...],  // 3-5 phrases
        "d_phrases": {
          "2_lego": [[phrase, translation], [phrase, translation]],
          "3_lego": [...],
          "4_lego": [...],
          "5_lego": [...]
        }
      }
    }
  }
  ```

### Spanish Course (`spa_for_eng_668seeds`)

**Status**: Very incomplete
- 1335 translations (Phase 1 only)
- 55 LEGOs (Phase 3 incomplete)
- No Phase 5 baskets
- No Phase 4, 3.5

**Needs**: Full generation from Phase 1 → Phase 6

---

## What Needs to Happen

### Option 1: Use Italian + Regenerate Phase 5
**Time**: ~1 hour (just Phase 5)

```bash
# 1. Navigate to Italian course
cd /Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/ita_for_eng_668seeds

# 2. Run Phase 5 with APML v7.2.0
# (This will use the Phase 5 prompt from registry which has correct basket format)
# Automation server will spawn Claude Code agent for Phase 5
# Agent reads: .apml-registry.json → Phase 5 prompt → generates baskets

# 3. Verify new format
cat phase_outputs/phase_5_baskets.json | jq '.baskets | keys | .[0:5]'
# Should show: ["S0001L01", "S0002L01", "S0003L01", ...]
```

### Option 2: Generate Spanish Course from Scratch
**Time**: ~3-4 hours (all phases)

```bash
# Use the automation server API
curl -X POST http://localhost:54321/api/courses/generate \
  -H "Content-Type: application/json" \
  -d '{
    "targetLanguage": "Spanish",
    "knownLanguage": "English",
    "seedCount": 668,
    "courseCode": "spa_for_eng_668seeds"
  }'

# Monitor progress
curl http://localhost:54321/api/courses/spa_for_eng_668seeds/status
```

---

## Implementation Plan (Tonight)

Since you're sleeping, I'll:

1. ✅ **Implement API endpoints** (DONE)
2. **🚧 Redesign SEED→LEGO visualizer** (using current Italian data - works!)
3. **🚧 Implement basket visualizer** (document that it needs Phase 5 regen)
4. **📝 Create clear migration guide**
5. **✅ Commit all changes**

---

## For Morning

When you wake up, you'll have:

1. **Working visualizers** showing:
   - SEED→LEGO breakdowns (fully functional)
   - Basket placeholder (showing data structure needed)

2. **Clear next steps**:
   - Run Phase 5 for Italian course (or)
   - Generate Spanish course fresh

3. **All code committed** and ready to test

---

## Visualizer Design Notes

### SEED→LEGO Visualizer
**Can implement NOW with existing data:**
- Shows 2-4 seeds per page
- Each seed shows its LEGO breakdown
- Both languages aligned
- Matches your screenshots perfectly

**What it needs:**
- Translations ✅ (have it)
- LEGOs ✅ (have it)
- API endpoint ✅ (implemented)

**Status**: Ready to build! 🚀

### Basket Visualizer
**Cannot implement fully until Phase 5 regen:**
- Current data: 3 baskets with 20 LEGOs each (old format)
- Needed: 2341 baskets (one per LEGO) with e/d-phrases (new format)

**What I'll do:**
- Build UI framework
- Show sample data structure
- Document exact requirements
- Ready for instant connection once Phase 5 runs

**Status**: Framework ready, data pending ⏳

---

## Recommendation

**Best path forward:**
1. Use visualizers I build tonight with Italian data
2. Regenerate Italian Phase 5 (30 min) when you wake up
3. Test basket visualizer
4. If happy, run Spanish full generation

**OR:**

1. Run Spanish full generation overnight (I can trigger this)
2. Wake up to complete Spanish course
3. Test all visualizers with fresh data

Your call! I'll build the visualizers either way.

---

**Current Time**: 02:11 UTC
**Estimated Visualizer Completion**: 02:45 UTC (34 min from now)
**You'll wake up to**: Working SEED→LEGO visualizer + basket framework + clear docs

Sleep well! 😴
