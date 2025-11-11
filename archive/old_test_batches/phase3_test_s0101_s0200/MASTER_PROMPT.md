# Master Prompt: Extract LEGOs for S0101-S0200 (10 Seeds per Agent)

Extract LEGOs from Spanish seeds S0101-S0200 using 10 parallel agents (10 seeds each).

---

## Context

You have S0001-S0100 already extracted with 278 LEGOs. Now extract S0101-S0200 in parallel.

**Existing data**:
- `public/vfs/courses/spa_for_eng/seed_pairs.json` - all 668 seeds
- `public/vfs/courses/spa_for_eng/lego_pairs.json` - S0001-S0100 extraction (278 LEGOs)
- `phase3_test_s0101_s0200/batch_input/seeds_0101_0110.json` etc - 10 batch files ready
- `phase3_test_s0101_s0200/templates/lego_registry_s0001_s0100.json` - registry of existing LEGOs

---

## What You Need to Do

### Step 1: Launch 10 Agents in Parallel

Each agent extracts LEGOs from 10 seeds following these principles:

**FD (Functionally Deterministic)**: IF IN DOUBT → CHUNK UP
- ✅ "quiero" = "I want" (1:1)
- ✅ "estoy intentando" = "I'm trying" (present continuous pattern, keep together)
- ❌ "que" alone (ambiguous, needs context)

**Complete Tiling**: Show ALL LEGOs (new + referenced) so seed reconstructs
- Check `lego_registry_s0001_s0100.json` for existing LEGOs
- Mark existing: `{"id": "S0023L02", "ref": "S0023", "new": false}`
- Mark new: `{"provisional_id": "PROV_S0101_01", "new": true}`

**Componentization**: For M-type LEGOs, show ALL WORDS
```json
{
  "type": "M",
  "target": "estoy intentando",
  "known": "I'm trying",
  "components": [
    ["estoy", "I am"],
    ["intentando", "trying"]
  ]
}
```

**A vs M Classification**:
- Atomic (A): Single word, unambiguous
- Molecular (M): Multi-word OR pattern OR ambiguous if split

### Agent Output Format

Each agent writes `phase3_test_s0101_s0200/batch_output/batch_0X_provisional.json`:

```json
{
  "batch_id": "S0101_S0110",
  "batch_number": 1,
  "extractor": "Agent 1",
  "extracted_at": "2025-11-07T...",
  "seeds": [
    {
      "seed_id": "S0101",
      "seed_pair": {
        "target": "Estoy disfrutando descubrir más sobre este lenguaje",
        "known": "I'm enjoying finding out more about this language."
      },
      "legos": [
        {
          "provisional_id": "PROV_S0101_01",
          "type": "M",
          "target": "estoy disfrutando",
          "known": "I'm enjoying",
          "new": true,
          "components": [
            ["estoy", "I am"],
            ["disfrutando", "enjoying"]
          ]
        },
        {
          "provisional_id": "PROV_S0101_02",
          "type": "A",
          "target": "descubrir",
          "known": "to find out",
          "new": true
        },
        {
          "id": "S0023L02",
          "type": "A",
          "target": "más",
          "known": "more",
          "ref": "S0023",
          "new": false
        },
        {
          "provisional_id": "PROV_S0101_03",
          "type": "A",
          "target": "sobre",
          "known": "about",
          "new": true
        },
        {
          "provisional_id": "PROV_S0101_04",
          "type": "A",
          "target": "este",
          "known": "this",
          "new": true
        },
        {
          "provisional_id": "PROV_S0101_05",
          "type": "A",
          "target": "lenguaje",
          "known": "language",
          "new": true
        }
      ]
    }
  ]
}
```

### Agent Assignments

- Agent 1: `seeds_0101_0110.json` → `batch_01_provisional.json`
- Agent 2: `seeds_0111_0120.json` → `batch_02_provisional.json`
- Agent 3: `seeds_0121_0130.json` → `batch_03_provisional.json`
- Agent 4: `seeds_0131_0140.json` → `batch_04_provisional.json`
- Agent 5: `seeds_0141_0150.json` → `batch_05_provisional.json`
- Agent 6: `seeds_0151_0160.json` → `batch_06_provisional.json`
- Agent 7: `seeds_0161_0170.json` → `batch_07_provisional.json`
- Agent 8: `seeds_0171_0180.json` → `batch_08_provisional.json`
- Agent 9: `seeds_0181_0190.json` → `batch_09_provisional.json`
- Agent 10: `seeds_0191_0200.json` → `batch_10_provisional.json`

### Step 2: Merge (After All Agents Complete)

Run: `node scripts/phase3_merge_batches.cjs`

This assigns final IDs and outputs: `phase3_test_s0101_s0200/lego_pairs_s0101_s0200.json`

### Step 3: Validate

Run: `node scripts/validate_lego_pairs.cjs phase3_test_s0101_s0200/lego_pairs_s0101_s0200.json`

Should report: ✅ PASS with ~250-300 new LEGOs

---

## Reference: Quality from S0001-S0100

- 278 cumulative LEGOs (avg 2.78 per seed)
- 37% Atomic, 63% Molecular
- Complete tiling working perfectly
- All seeds reconstructible
- FD compliance maintained

Match this quality for S0101-S0200.

---

## Quick Examples

**S0101**: "Estoy disfrutando descubrir más sobre este lenguaje"

Extract:
1. "estoy disfrutando" (M) - present continuous pattern
2. "descubrir" (A) - infinitive verb
3. "más" (A) - **EXISTS in registry (S0023L02)** → mark as reference
4. "sobre" (A) - preposition
5. "este" (A) - demonstrative
6. "lenguaje" (A) - noun

**S0102**: "Estamos intentando decir que no es así"

Extract:
1. "estamos intentando" (M) - "we're trying" pattern (like "estoy intentando")
2. "decir" (A) - infinitive verb
3. "que" (M with context) - check if "que no es así" or "decir que" is FD unit
4. Handle "no es así" - probably "no" (A) + "es" (A) + "así" (A)

Use bidirectional sweep and FD principles to decide boundaries.

---

## Execute

Launch all 10 agents in parallel now. After they complete, run merge and validation scripts.

Target: Complete in ~25 minutes total (20 min agents + 5 min merge/validate).
