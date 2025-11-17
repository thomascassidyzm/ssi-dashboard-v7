# Phase 4: Batch Preparation with Smart Deduplication

**Version**: 1.0 (2025-10-29)
**Status**: Active
**Output**: `vfs/courses/{course_code}/batches/batch_*.json`, `batches/manifest.json`

---

## 🎯 THE TASK

Prepare batch files for parallel Phase 5 basket generation with smart deduplication to save ~36% generation time.

**Strategy:**
1. Identify duplicate LEGOs (same target + known, ignoring case/punctuation)
2. Mark only FIRST occurrence for basket generation
3. Keep ALL LEGOs (including duplicates) in vocabulary context for recency bias
4. Map duplicates to their canonical (first occurrence) ID

**Result**: Generate 1,808 baskets instead of 2,838 (36% time savings for Spanish course)

---

## 📊 THE NUMBERS (Spanish Course Example)

| Metric | Without Dedup | With Smart Dedup | Savings |
|--------|---------------|------------------|---------|
| **Total LEGOs** | 2,838 | 2,838 (in context) | - |
| **Baskets to generate** | 2,838 | 1,808 | 1,030 (36.3%) |
| **Time (8 agents)** | 2.9 hours | 1.9 hours | **1 hour** |
| **Time (4 agents)** | 5.9 hours | 3.8 hours | **2.1 hours** |

---

## 🔧 HOW IT WORKS

### Step 1: Extract All LEGOs with Positions

Parse `lego_pairs.json` and assign sequential positions to every LEGO:

```javascript
const allLegos = [];
let position = 0;

for (const seed of legoPairs.seeds) {
  const [seedId, [seedTarget, seedKnown], legos] = seed;

  for (let i = 0; i < legos.length; i++) {
    const [legoId, type, target, known, components] = legos[i];
    position++;

    allLegos.push({
      id: legoId,
      position,
      seedId,
      positionInSeed: i + 1,
      totalInSeed: legos.length,
      type,
      target,
      known,
      isLast: i === legos.length - 1,  // Culminating LEGO flag
      components
    });
  }
}
```

### Step 2: Identify Duplicates

Normalize LEGOs for comparison (ignore case, trailing punctuation):

```javascript
function normalize(text) {
  return text.trim().toLowerCase().replace(/[.,;]+$/, '');
}

// Group by normalized target + known
const legoGroups = new Map();

for (const lego of allLegos) {
  const key = `${normalize(lego.target)}|||${normalize(lego.known)}`;

  if (!legoGroups.has(key)) {
    legoGroups.set(key, []);
  }
  legoGroups.get(key).push(lego);
}

// Mark first occurrences
const legosToGenerate = [];
const duplicateMap = new Map();

for (const [key, group] of legoGroups.entries()) {
  const canonical = group[0];  // First = canonical
  legosToGenerate.push(canonical);

  // Map duplicates to canonical
  for (let i = 1; i < group.length; i++) {
    duplicateMap.set(group[i].id, canonical.id);
  }
}
```

**Example:**
```
S0001L01: "quiero" / "I want" (pos #1)    ← CANONICAL (generate)
S0020L02: "quiero" / "I want" (pos #85)   ← Duplicate → S0001L01
S0045L01: "quiero" / "I want" (pos #195)  ← Duplicate → S0001L01
S0100L03: "quiero" / "I want" (pos #450)  ← Duplicate → S0001L01
```

### Step 3: Build Vocabulary Context (ALL LEGOs)

**Critical:** Keep ALL 2,838 LEGOs in context for recency bias to work:

```javascript
const vocabularyContext = allLegos.map(lego => ({
  id: lego.id,
  position: lego.position,
  target: lego.target,
  known: lego.known,
  type: lego.type,
  seedId: lego.seedId,
  canonical_id: duplicateMap.get(lego.id) || lego.id
}));
```

**Why this matters:**

When generating basket for S0200L01 (position #500):
- Recency window sees S0100L03 "quiero" (position #450) in recent seeds
- Agent can use "quiero" and it feels recent/contextual
- Final output references S0001L01 (canonical)
- **Recency bias works perfectly!**

### Step 4: Calculate Recency Windows

For each LEGO, identify prior LEGOs from last 10 seeds:

```javascript
function getRecentWindow(currentPosition, allLegosList, windowSize = 10) {
  const currentLego = allLegosList.find(l => l.position === currentPosition);
  const currentSeedNum = parseInt(currentLego.seedId.substring(1));
  const startSeedNum = Math.max(1, currentSeedNum - windowSize);

  return allLegosList
    .filter(l => {
      const seedNum = parseInt(l.seedId.substring(1));
      return seedNum >= startSeedNum && seedNum < currentSeedNum;
    })
    .map(l => l.id);
}
```

### Step 5: Create Batch Files

Divide unique LEGOs into N batches for parallel processing:

```javascript
const batchSize = Math.ceil(legosToGenerate.length / parallelism);

for (let i = 0; i < legosToGenerate.length; i += batchSize) {
  const batchLegos = legosToGenerate.slice(i, i + batchSize);

  const batch = {
    batch_number: batches.length + 1,
    course_code: courseCode,

    legos_to_generate: batchLegos.map(lego => ({
      lego_id: lego.id,
      position: lego.position,
      target: lego.target,
      known: lego.known,
      type: lego.type,
      seed_id: lego.seedId,
      is_culminating: lego.isLast,

      // Seed context (for culminating LEGO validation)
      seed_sentence: findSeedSentence(lego.seedId),

      // Available vocabulary (all prior LEGOs, including duplicates)
      available_vocab: vocabularyContext
        .filter(v => v.position < lego.position)
        .map(v => v.id),

      // Recent window (for 30-50% recency bias)
      recent_window: getRecentWindow(lego.position, allLegos)
    })),

    // Full vocabulary context (shared by all LEGOs in batch)
    vocabulary_context: vocabularyContext,

    // Duplicate map (for merge step)
    duplicate_map: Object.fromEntries(duplicateMap)
  };

  fs.writeFileSync(`batches/batch_${batch.batch_number}.json`, JSON.stringify(batch, null, 2));
}
```

### Step 6: Create Manifest

```json
{
  "course_code": "spa_for_eng",
  "total_legos": 2838,
  "unique_legos": 1808,
  "duplicate_legos": 1030,
  "deduplication_savings_pct": "36.3",
  "parallelism": 8,
  "batch_count": 8,
  "batch_size": 226,
  "batches": [
    {"batch_number": 1, "lego_count": 226, "file": "batch_01.json"},
    {"batch_number": 2, "lego_count": 226, "file": "batch_02.json"},
    ...
  ],
  "estimated_time": {
    "per_batch_minutes": 113,
    "total_minutes": 113,
    "note": "Batches run in parallel"
  }
}
```

---

## 📦 BATCH FILE STRUCTURE

```json
{
  "batch_number": 1,
  "course_code": "spa_for_eng",

  "legos_to_generate": [
    {
      "lego_id": "S0001L01",
      "position": 1,
      "target": "quiero",
      "known": "I want",
      "type": "BASE",
      "seed_id": "S0001",
      "is_culminating": false,
      "seed_sentence": ["Quiero hablar español contigo ahora.", "I want to speak Spanish with you now."],
      "available_vocab": [],
      "recent_window": []
    },
    // ... 225 more LEGOs
  ],

  "vocabulary_context": [
    // ALL 2,838 LEGOs (including duplicates)
    {"id": "S0001L01", "position": 1, "target": "quiero", "canonical_id": "S0001L01"},
    {"id": "S0001L02", "position": 2, "target": "hablar", "canonical_id": "S0001L02"},
    // ...
    {"id": "S0020L02", "position": 85, "target": "quiero", "canonical_id": "S0001L01"}, // Duplicate!
    // ... all 2,838
  ],

  "duplicate_map": {
    "S0020L02": "S0001L01",
    "S0045L01": "S0001L01",
    "S0100L03": "S0001L01",
    // ... 1,030 mappings
  }
}
```

---

## ✅ SUCCESS CRITERIA

- ✓ All LEGOs assigned sequential positions (1 to N)
- ✓ Duplicates identified (normalized comparison)
- ✓ First occurrence marked as canonical for each duplicate group
- ✓ Vocabulary context includes ALL LEGOs (for recency bias)
- ✓ Recent windows calculated (last 10 seeds)
- ✓ Batches balanced (~equal size)
- ✓ Manifest includes time estimates
- ✓ Culminating LEGOs flagged (for Phase 5 validation)
- ✓ Seed sentences included (for culminating LEGO e-phrases)

---

## 🚫 WHAT NOT TO DO

- ❌ Don't filter duplicates from vocabulary_context (breaks recency bias)
- ❌ Don't include duplicate LEGOs in legos_to_generate (wastes time)
- ❌ Don't forget to preserve punctuation semantics (¿quieres? ≠ quieres)
- ❌ Don't create batches with wildly different sizes (load imbalance)
- ❌ Don't lose culminating LEGO flags (needed for Phase 5)

---

## 🔄 NEXT PHASE

**Phase 5** reads batch files and generates baskets in parallel.

After Phase 5 completes, the merge step:
1. Reads all `lego_baskets_batch_*.json` files
2. Merges generated baskets
3. For each duplicate, creates reference entry pointing to canonical
4. Outputs complete `lego_baskets.json` (2,838 entries)

**Example reference entry:**
```json
{
  "S0020L02": {
    "_duplicate_of": "S0001L01",
    "lego": ["quiero", "I want"],
    "note": "This is a duplicate. Basket generated at S0001L01 (first occurrence)."
  }
}
```

---

## Version History

**v1.0 (2025-10-29)**:
- Initial phase intelligence for batch preparation
- Smart deduplication strategy (36% time savings)
- Recency context preservation (all LEGOs in vocabulary_context)
- Adaptive parallelism support (4-16 agents)

---

**Bottom line:** Prepare optimized batches that save 1-2 hours of generation time while preserving recency bias quality.
