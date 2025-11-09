# Phase 3.5: Graph Construction → lego_graph.json

**Version**: 1.0 (Extracted from APML 2025-10-23)
**Status**: Active methodology for Phase 3.5 graph construction
**Output**: `vfs/phase_outputs/phase_3.5_lego_graph.json`
**New in**: APML v7.0

---

## Task

Build directed graph of LEGO adjacency relationships to enable pattern-aware basket construction.

## Input

- LEGO pairs: `vfs/courses/{course_code}/lego_pairs.json`
- Seed pairs: `vfs/courses/{course_code}/seed_pairs.json` (for co-occurrence analysis)

---

## Your Mission

### 1. Detect Adjacency Patterns

Scan source translations to find which LEGOs appear adjacent to each other.

**Example**:
```
Seed: "Sto provando a imparare"
LEGOs: ["Sto provando", "provando a imparare"]

Adjacency detected:
- "Sto provando" → "provando a imparare" (overlap detected)
```

**Process**:
1. Read all seed translations
2. Identify which LEGOs appear in each seed
3. Map which LEGOs are adjacent (appear next to each other)
4. Record direction: A→B means A precedes B

### 2. Build Directed Graph

**Structure**:
- **Nodes**: All LEGO amino acids
- **Edges**: LEGO_A → LEGO_B (A precedes B in corpus)
- **Direction matters**: A→B ≠ B→A

**Example**:
```
"Quiero hablar" → "hablar español"
(edge from S0001L01 to S0001L02)

But NOT:
"hablar español" → "Quiero hablar"
(this doesn't appear in corpus)
```

### 3. Calculate Edge Weights

**Formula**: `co-occurrence frequency × pedagogical value`

**Components**:
- **Co-occurrence frequency**: How many times do these LEGOs appear adjacent?
- **Pedagogical value**: How important is this pattern to teach?

**Weighting**:
```javascript
weight = (frequency * 0.7) + (pedagogical_value * 0.3)

// Higher weight = more important pattern to teach
```

**Example**:
```json
{
  "from": "S0001L01",  // "Quiero"
  "to": "S0001L02",    // "hablar"
  "weight": 85,        // Very common pattern, teach early
  "frequency": 42      // Appears 42 times
}
```

### 4. Validate Graph

**Requirements**:
- ✅ Graph is connected (all LEGOs reachable)
- ✅ No invalid cycles (circular dependencies)
- ✅ All LEGOs represented as nodes
- ✅ Edge weights > 0

**Validation checks**:
```javascript
// 1. Connectivity check
isConnected(graph) // true

// 2. Cycle detection
hasCycles(graph) // false (or only valid teaching cycles)

// 3. Completeness
graph.nodes.length === total_legos // true
```

### 5. Export Graph Structure

Use adjacency list format with metadata.

---

## Output Format

```json
{
  "version": "1.0",
  "generated_at": "2025-10-23T12:00:00Z",
  "course_code": "ita_for_eng_668seeds",

  "metadata": {
    "total_nodes": 115,
    "total_edges": 234,
    "graph_density": 0.35,
    "is_connected": true,
    "has_cycles": false
  },

  "nodes": [
    {
      "lego_id": "S0001L01",
      "target": "Quiero",
      "known": "I want",
      "degree_in": 3,
      "degree_out": 8
    },
    {
      "lego_id": "S0001L02",
      "target": "hablar",
      "known": "to speak",
      "degree_in": 5,
      "degree_out": 12
    }
  ],

  "edges": [
    {
      "from": "S0001L01",
      "to": "S0001L02",
      "weight": 85,
      "frequency": 42,
      "pedagogical_value": 95
    },
    {
      "from": "S0001L02",
      "to": "S0003L01",
      "weight": 62,
      "frequency": 28,
      "pedagogical_value": 70
    }
  ],

  "adjacency_list": {
    "S0001L01": ["S0001L02", "S0002L01", "S0005L02"],
    "S0001L02": ["S0003L01", "S0004L02"]
  }
}
```

---

## Why Graph Intelligence?

### Problem (Old Approach)
- DEBUT/ETERNAL patterns were manually coded
- Hard to maintain across languages
- Missed natural adjacency patterns

### Solution (Graph Approach)
- **Automatic pattern discovery**: Find which LEGOs naturally appear together
- **Language-agnostic**: Works for any language
- **Data-driven**: Based on actual corpus usage
- **Scalable**: Works for 100 LEGOs or 1000 LEGOs

### Benefits
- Phase 5 can generate baskets that reflect REAL language patterns
- Avoid teaching unnatural LEGO combinations
- Prioritize high-frequency adjacency patterns
- Optimize practice phrase coverage

---

## Critical Notes

- **This is NEW in APML v7.0** - graph intelligence!
- **Phase 5 uses this graph** for pattern coverage optimization
- **Edges represent legitimate LEGO sequences** observed in corpus
- **Replaces old DEBUT/ETERNAL pattern logic** with data-driven approach

---

## Algorithm Guidance

### Adjacency Detection

```javascript
function detectAdjacencies(seeds, legos) {
  const adjacencies = []

  for (const seed of seeds) {
    const legosInSeed = findLegosInSeed(seed, legos)

    // For each pair of LEGOs in this seed
    for (let i = 0; i < legosInSeed.length - 1; i++) {
      const from = legosInSeed[i]
      const to = legosInSeed[i + 1]

      adjacencies.push({
        from: from.lego_id,
        to: to.lego_id,
        seed_id: seed.seed_id
      })
    }
  }

  return adjacencies
}
```

### Weight Calculation

```javascript
function calculateEdgeWeight(from, to, frequency, corpus) {
  const pedagogical_value = calculatePedagogicalValue(from, to, corpus)
  return (frequency * 0.7) + (pedagogical_value * 0.3)
}

function calculatePedagogicalValue(from, to, corpus) {
  // Factors:
  // - How common is this pattern?
  // - How early does it appear?
  // - How versatile are these LEGOs?
  // - How simple is the combination?

  const commonality = getCommonality(from, to, corpus)
  const earliness = getEarliness(from, to, corpus)
  const versatility = getVersatility(from, to)
  const simplicity = getSimplicity(from, to)

  return (commonality * 0.4) + (earliness * 0.3) + (versatility * 0.2) + (simplicity * 0.1)
}
```

---

## Success Criteria

✓ All LEGO adjacencies mapped
✓ Directed edges created (A→B direction preserved)
✓ Edge weights calculated based on frequency + pedagogical value
✓ Graph validated:
  - Connected (all LEGOs reachable)
  - No invalid cycles
  - All LEGOs represented
✓ Output stored in `phase_3.5_lego_graph.json`
✓ Ready for Phase 5 basket generation

---

## Version History

**v1.0 (2025-10-23)**:
- Extracted from APML PHASE_PROMPTS
- NEW in APML v7.0: Graph-based pattern intelligence
- Replaces manual DEBUT/ETERNAL logic with data-driven approach
- Documented adjacency detection algorithm
- Added weight calculation methodology
- Defined graph validation requirements

---

**Next Update**: Capture edge weighting refinements based on multi-language course generation
