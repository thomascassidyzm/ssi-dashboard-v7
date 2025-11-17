# Automation Server Update: v7.0 → v7.6

## Critical Gap Identified

The **automation_server.cjs** is using the **old v7.0 pipeline** while real courses use **v7.6**.

This document details ALL changes needed to bring automation_server.cjs up to v7.6 reality.

---

## 1. Pipeline Changes

### OLD v7.0 Pipeline (automation_server.cjs)
```
Phase 0:   Corpus Pre-Analysis
Phase 1:   Pedagogical Translation
Phase 2:   Corpus Intelligence (FCFS)
Phase 3:   LEGO Extraction
Phase 3.5: Graph Construction
Phase 4:   LEGO Deduplication
Phase 5:   Basket Generation
Phase 6:   Introductions
```

### NEW v7.6 Pipeline (actual courses)
```
Phase 1:   Pedagogical Translation
Phase 3:   LEGO Extraction (BASE/COMPOSITE/FEEDER)
Phase 5:   Basket Generation
Phase 5.5: Basket Deduplication + Provenance Map
Phase 6:   Introductions (with componentization)
```

### **REMOVED PHASES:**
- ❌ Phase 0: Corpus Pre-Analysis (no longer needed)
- ❌ Phase 2: Corpus Intelligence/FCFS (no longer needed)
- ❌ Phase 3.5: Graph Construction (no longer needed)
- ❌ Phase 4: LEGO Deduplication (replaced by Phase 5.5)

### **NEW PHASES:**
- ✅ Phase 5.5: Basket Deduplication (creates provenance map)

### **ENHANCED PHASES:**
- 🔄 Phase 3: Now outputs BASE/COMPOSITE/FEEDER types + feeder_pairs
- 🔄 Phase 5: Now generates baskets with feeders included
- 🔄 Phase 6: Uses provenance map to skip duplicates, adds componentization

---

## 2. File Structure Changes

### Phase 1: Pedagogical Translation
**Output: `translations.json`**

```json
{
  "S0001": ["Quiero hablar español contigo ahora.", "I want to speak Spanish with you now."],
  "S0002": ["Estoy intentando aprender.", "I'm trying to learn."]
}
```

✅ **No change** - same structure as v7.0

---

### Phase 3: LEGO Extraction
**Output: `LEGO_BREAKDOWNS_COMPLETE.json`**

#### NEW Structure (v7.6):
```json
{
  "lego_breakdowns": [
    {
      "seed_id": "S0001",
      "original_target": "Quiero hablar español contigo ahora.",
      "original_known": "I want to speak Spanish with you now.",
      "lego_pairs": [
        {
          "lego_id": "S0001L01",
          "lego_type": "BASE",           // ← NEW: BASE/COMPOSITE/FEEDER
          "target_chunk": "Quiero",
          "known_chunk": "I want",
          "fd_validated": true
        }
      ],
      "feeder_pairs": []                  // ← NEW: empty if no COMPOSITE
    },
    {
      "seed_id": "S0002",
      "original_target": "Estoy intentando aprender.",
      "original_known": "I'm trying to learn.",
      "lego_pairs": [
        {
          "lego_id": "S0002L01",
          "lego_type": "COMPOSITE",       // ← NEW: COMPOSITE type
          "target_chunk": "Estoy intentando",
          "known_chunk": "I'm trying",
          "fd_validated": true,
          "componentization": "I'm trying = Estoy intentando, where Estoy = I'm and intentando represents trying"  // ← NEW
        }
      ],
      "feeder_pairs": [                    // ← NEW: feeders for COMPOSITE
        {
          "feeder_id": "S0002F01",
          "target_chunk": "Estoy",
          "known_chunk": "I'm",
          "parent_lego_id": "S0002L01"
        },
        {
          "feeder_id": "S0002F02",
          "target_chunk": "intentar",
          "known_chunk": "to try",
          "parent_lego_id": "S0002L01"
        }
      ]
    }
  ]
}
```

#### OLD Structure (v7.0):
```json
{
  "lego_breakdowns": [
    {
      "seed_id": "S0001",
      "original_target": "...",
      "original_known": "...",
      "lego_pairs": [
        {
          "lego_id": "S0001L01",
          // NO lego_type field
          // NO componentization field
          "target_chunk": "...",
          "known_chunk": "..."
        }
      ]
      // NO feeder_pairs field
    }
  ]
}
```

**CHANGES:**
- ✅ Added `lego_type`: "BASE" | "COMPOSITE" | "FEEDER"
- ✅ Added `componentization` for COMPOSITE LEGOs
- ✅ Added `feeder_pairs` array (components of COMPOSITE LEGOs)
- ✅ Feeder IDs format: `S####F##` (not `L##`)

---

### Phase 5: Basket Generation
**Output: `baskets.json`**

```json
{
  "S0001L01": {
    "lego": ["Quiero", "I want"],
    "e": [],                              // eternal phrases
    "d": {                                // debut phrases (by difficulty)
      "2": [],
      "3": [],
      "4": [],
      "5": []
    }
  }
}
```

✅ **Same structure** - but now includes FEEDER LEGOs too

---

### Phase 5.5: Basket Deduplication (NEW!)
**Outputs:**
1. `baskets_deduplicated.json` (same structure as baskets.json)
2. `lego_provenance_map.json` (NEW!)

**`lego_provenance_map.json` structure:**
```json
{
  "S0015F01": "S0001L02",    // S0015F01 is duplicate of S0001L02
  "S0029F01": "S0002F01",    // S0029F01 is duplicate of S0002F01
  "S0008F02": "S0002F02"
}
```

**Purpose:** Track which LEGOs are duplicates so Phase 6 can skip them

---

### Phase 6: Introductions
**Output: `introductions.json`**

#### NEW Structure (v7.6):
```json
{
  "introductions": [
    {
      "lego_id": "S0001L01",
      "lego_type": "BASE",
      "target_chunk": "Quiero",
      "known_chunk": "I want",
      "seed_context": "I want to speak Spanish with you now.",
      "introduction_text": "The Spanish for I want, as in I want to speak Spanish with you now., is: Quiero"
    },
    {
      "lego_id": "S0002L01",
      "lego_type": "COMPOSITE",
      "target_chunk": "Estoy intentando",
      "known_chunk": "I'm trying",
      "seed_context": "I'm trying to learn.",
      "introduction_text": "The Spanish for I'm trying, as in I'm trying to learn., is: Estoy intentando, I'm trying = Estoy intentando, where Estoy = I'm and intentando represents trying"
    }
  ]
}
```

**CHANGES:**
- ✅ Reads `lego_provenance_map.json` to **skip duplicates**
- ✅ For COMPOSITE LEGOs: appends componentization to introduction_text
- ✅ Annotates feeders as "(you know already)" if they're duplicates

**Example with duplicate annotation:**
```
"The Spanish for I'm going to try, as in ..., is: Voy a intentar, where Voy = I'm going (you know already) and intentar = to try"
```

---

## 3. APML Registry Issues

Current `.apml-registry.json` has **stale phase prompts**:

```json
{
  "PHASE_1": "...",     // ✅ Keep
  "PHASE_2": "...",     // ❌ Remove (deprecated)
  "PHASE_3": "...",     // ✅ Keep (update for FEEDERS)
  "PHASE_3_5": "...",   // ❌ Remove (deprecated)
  "PHASE_5": "...",     // ✅ Keep
  "PHASE_5_5": "..."    // ✅ Keep (NEW!)
  // ❌ MISSING: PHASE_6
}
```

**TODO:** Update APML registry or load Phase 6 prompt from training page.

---

## 4. Automation Server Changes Needed

### File: `automation_server.cjs`

#### A. Update Phase Sequence

**OLD (lines ~416-477):**
```javascript
async function cascadePhases(courseCode, params) {
  // Phase 0: Corpus Pre-Analysis
  job.phase = 'phase_0';
  await spawnPhaseAgent('0', PHASE_PROMPTS['0'], courseDir, courseCode);

  // Phase 1: Pedagogical Translation
  job.phase = 'phase_1';
  await spawnPhaseAgent('1', PHASE_PROMPTS['1'], courseDir, courseCode);

  // Phase 2: Corpus Intelligence
  job.phase = 'phase_2';
  await spawnPhaseAgent('2', PHASE_PROMPTS['2'], courseDir, courseCode);

  // Phase 3: LEGO Extraction
  job.phase = 'phase_3';
  await spawnPhaseAgent('3', PHASE_PROMPTS['3'], courseDir, courseCode);

  // Phase 3.5: Graph Construction
  job.phase = 'phase_3.5';
  await spawnPhaseAgent('3.5', PHASE_PROMPTS['3.5'], courseDir, courseCode);

  // Phase 4: Deduplication
  job.phase = 'phase_4';
  await spawnPhaseAgent('4', PHASE_PROMPTS['4'], courseDir, courseCode);

  // Phase 5: Baskets
  job.phase = 'phase_5';
  await spawnPhaseAgent('5', PHASE_PROMPTS['5'], courseDir, courseCode);

  // Phase 6: Introductions
  job.phase = 'phase_6';
  await spawnPhaseAgent('6', PHASE_PROMPTS['6'], courseDir, courseCode);
}
```

**NEW:**
```javascript
async function cascadePhases(courseCode, params) {
  // Phase 1: Pedagogical Translation
  job.phase = 'phase_1';
  job.progress = 10;
  await spawnPhaseAgent('1', PHASE_PROMPTS['1'], courseDir, courseCode);
  job.progress = 25;

  // Phase 3: LEGO Extraction (BASE/COMPOSITE/FEEDER)
  job.phase = 'phase_3';
  job.progress = 30;
  await spawnPhaseAgent('3', PHASE_PROMPTS['3'], courseDir, courseCode);
  job.progress = 55;

  // Phase 5: Basket Generation
  job.phase = 'phase_5';
  job.progress = 60;
  await spawnPhaseAgent('5', PHASE_PROMPTS['5'], courseDir, courseCode);
  job.progress = 80;

  // Phase 5.5: Basket Deduplication
  job.phase = 'phase_5.5';
  job.progress = 85;
  await spawnPhaseAgent('5.5', PHASE_PROMPTS['5.5'], courseDir, courseCode);
  job.progress = 90;

  // Phase 6: Introductions
  job.phase = 'phase_6';
  job.progress = 92;
  await spawnPhaseAgent('6', PHASE_PROMPTS['6'] || loadPhase6Prompt(), courseDir, courseCode);
  job.progress = 100;

  job.status = 'completed';
}
```

#### B. Update Orchestrator Brief

**File location:** Line ~240-320

**OLD brief includes:**
- Phase 0, 2, 3.5, 4 (all deprecated)
- No mention of COMPOSITE/FEEDER LEGOs
- No mention of provenance map
- No mention of componentization

**NEW brief should say:**
```markdown
## APML v7.6 Specification

**Streamlined 5-Phase Pipeline:**

1. **Phase 1: Pedagogical Translation**
   - Input: `seeds/canonical_seeds.json` (668 seeds)
   - Output: `translations.json`
   - Apply 6 pedagogical heuristics for natural translations

2. **Phase 3: LEGO Extraction**
   - Input: `translations.json`
   - Output: `LEGO_BREAKDOWNS_COMPLETE.json`
   - Extract LEGOs with types: BASE, COMPOSITE, FEEDER
   - For COMPOSITE LEGOs: provide componentization explanation
   - For COMPOSITE LEGOs: extract FEEDER components

3. **Phase 5: Basket Generation**
   - Input: `LEGO_BREAKDOWNS_COMPLETE.json`
   - Output: `baskets.json`
   - Generate d-phrases (debut) and e-phrases (eternal)
   - Include both LEGOs and FEEDERs in practice contexts

4. **Phase 5.5: Basket Deduplication**
   - Input: `baskets.json`
   - Outputs: `baskets_deduplicated.json` + `lego_provenance_map.json`
   - Identify duplicate LEGOs (same target + known chunks)
   - Create provenance map tracking first occurrence
   - Remove duplicate baskets

5. **Phase 6: Introductions**
   - Input: `LEGO_BREAKDOWNS_COMPLETE.json` + `lego_provenance_map.json`
   - Output: `introductions.json`
   - Skip LEGOs that are keys in provenance map (duplicates)
   - Format: "The [LANG] for [KNOWN], as in [SEED_CONTEXT], is: [TARGET]"
   - For COMPOSITE: append componentization explanation
   - Annotate duplicate feeders with "(you know already)"
```

#### C. Update Phase Names for UI

**File location:** Line ~203-212 (in CourseGeneration.vue, needs server update too)

**OLD:**
```javascript
const phaseNames = [
  { id: 0, name: 'Phase 1: Generate SEED_PAIRS' },
  { id: 1, name: 'Phase 2: Corpus Intelligence (FCFS)' },
  { id: 2, name: 'Phase 3: Extract LEGO_PAIRS' },
  { id: 3, name: 'Phase 3.5: LEGO Graph Construction' },
  { id: 4, name: 'Phase 4: LEGO Deduplication' },
  { id: 5, name: 'Phase 5: Generate LEGO_BASKETS' },
  { id: 6, name: 'Phase 6: Generate LEGO_INTRODUCTIONS' },
  { id: 7, name: 'Compilation' }
]
```

**NEW:**
```javascript
const phaseNames = [
  { id: 1, name: 'Phase 1: Pedagogical Translation' },
  { id: 3, name: 'Phase 3: LEGO Extraction (BASE/COMPOSITE/FEEDER)' },
  { id: 5, name: 'Phase 5: Generate Practice Baskets' },
  { id: 5.5, name: 'Phase 5.5: Basket Deduplication' },
  { id: 6, name: 'Phase 6: Generate Introductions' }
]
```

#### D. Update Progress Calculation

**OLD:** Progress divided by 8 phases (0-7)
**NEW:** Progress divided by 5 phases (1, 3, 5, 5.5, 6)

```javascript
const currentPhaseIndex = computed(() => {
  const phase = currentPhase.value
  if (phase === 'initializing') return -1
  if (phase === 'phase_1') return 0
  if (phase === 'phase_3') return 1
  if (phase === 'phase_5') return 2
  if (phase === 'phase_5.5') return 3
  if (phase === 'phase_6') return 4
  return -1
})
```

---

## 5. Testing Checklist

After updating automation_server.cjs:

### Phase 1 Test
```bash
# Should create translations.json
ls vfs/courses/test_course/translations.json

# Check structure
jq 'keys | length' vfs/courses/test_course/translations.json
# Should show: 30 (or 668 for full)
```

### Phase 3 Test
```bash
# Should create LEGO_BREAKDOWNS_COMPLETE.json
# Check for lego_type and feeder_pairs
jq '.lego_breakdowns[0] | keys' vfs/courses/test_course/LEGO_BREAKDOWNS_COMPLETE.json
# Should include: "lego_pairs", "feeder_pairs"

jq '.lego_breakdowns[].lego_pairs[] | .lego_type' vfs/courses/test_course/LEGO_BREAKDOWNS_COMPLETE.json | sort -u
# Should show: "BASE", "COMPOSITE"
```

### Phase 5 Test
```bash
# Should create baskets.json
jq 'keys | length' vfs/courses/test_course/baskets.json
# Should show: ~100-150 baskets (includes LEGOs + FEEDERs)
```

### Phase 5.5 Test
```bash
# Should create TWO files
ls vfs/courses/test_course/baskets_deduplicated.json
ls vfs/courses/test_course/lego_provenance_map.json

# Check provenance map
jq 'keys | length' vfs/courses/test_course/lego_provenance_map.json
# Should show: number of duplicates found
```

### Phase 6 Test
```bash
# Should create introductions.json
jq '.introductions | length' vfs/courses/test_course/introductions.json
# Should be LESS than total LEGOs (because duplicates are skipped)

# Check for componentization in COMPOSITE LEGOs
jq '.introductions[] | select(.lego_type == "COMPOSITE") | .introduction_text' vfs/courses/test_course/introductions.json | head -3
# Should see componentization appended
```

---

## 6. Script to Generate Phase 6 Introductions

The script `vfs/courses/generate-introductions.cjs` implements Phase 6.

It should be invoked by the orchestrator or run standalone:

```bash
cd vfs/courses/
node generate-introductions.cjs spa_for_eng_30seeds
```

This script:
1. Reads `LEGO_BREAKDOWNS_COMPLETE.json`
2. Reads `lego_provenance_map.json`
3. Skips LEGOs that are duplicate keys
4. Generates contextual introductions
5. Appends componentization for COMPOSITE LEGOs
6. Writes `introductions.json`

---

## 7. Summary of Required Changes

### automation_server.cjs
- [ ] Remove Phase 0, 2, 3.5, 4 from cascadePhases()
- [ ] Add Phase 5.5 between Phase 5 and 6
- [ ] Update orchestrator brief to v7.6 pipeline
- [ ] Update progress calculation (5 phases, not 8)
- [ ] Load Phase 6 prompt (currently missing from registry)

### CourseGeneration.vue (frontend)
- [ ] Update phaseNames array to match v7.6
- [ ] Update currentPhaseIndex mapping
- [ ] Remove deprecated phase UI elements

### .apml-registry.json
- [ ] Remove PHASE_2, PHASE_3_5
- [ ] Update PHASE_3 to mention COMPOSITE/FEEDER
- [ ] Add PHASE_6 prompt

---

## 8. Next Steps

1. **Update automation_server.cjs** with v7.6 pipeline
2. **Test with 30-seed course** to verify all phases work
3. **Update APML registry** or load Phase 6 from training page
4. **Deploy updated frontend** with new phase names
5. **Run full 668-seed generation** to validate at scale

---

**Once updated, the automation system will match the actual v7.6 course generation workflow!**
