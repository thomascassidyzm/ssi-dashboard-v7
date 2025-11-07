# Execute: Parallel LEGO Extraction for S0101-S0200

Launch 10 parallel agents to extract LEGOs from Spanish seeds S0101-S0200.

---

## Core Extraction Principles

**FD (Functionally Deterministic)**: IF IN DOUBT → CHUNK UP
- ✅ "quiero" = "I want" (1:1, unambiguous)
- ✅ "estoy intentando" = "I'm trying" (pattern, keep together)
- ✅ "después de que" = "after" (subjunctive trigger, keep together)
- ❌ "que" alone, "de" alone (ambiguous without context)

**Complete Tiling**: All LEGOs (new + referenced) must reconstruct the seed
- Check existing LEGOs in: `phase3_test_s0101_s0200/templates/lego_registry_s0001_s0100.json`
- If LEGO exists → mark as reference: `{"id": "S0023L02", "ref": "S0023", "new": false}`
- If new → use provisional ID: `{"provisional_id": "PROV_S0101_01", "new": true}`

**Componentization**: ALL WORDS in M-type LEGOs
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

**Types**:
- Atomic (A): Single word, unambiguous, reusable
- Molecular (M): Multi-word OR pattern OR would be ambiguous if split

---

## Agent Tasks (Launch All 10 in Parallel)

### Agent 1: S0101-S0110
**Input**: `phase3_test_s0101_s0200/batch_input/seeds_0101_0110.json`
**Registry**: `phase3_test_s0101_s0200/templates/lego_registry_s0001_s0100.json`
**Output**: `phase3_test_s0101_s0200/batch_output/batch_01_provisional.json`

Extract LEGOs using bidirectional sweep, FD principles, complete tiling. Output format:
```json
{
  "batch_id": "S0101_S0110",
  "batch_number": 1,
  "extractor": "Agent 1",
  "extracted_at": "ISO timestamp",
  "seeds": [
    {
      "seed_id": "S0101",
      "seed_pair": {"target": "...", "known": "..."},
      "legos": [
        {
          "provisional_id": "PROV_S0101_01" or "id": "S0023L02",
          "type": "A" or "M",
          "target": "Spanish text",
          "known": "English text",
          "new": true or false,
          "ref": "S0023" (if reference),
          "components": [[...]] (if M-type)
        }
      ]
    }
  ]
}
```

### Agent 2: S0111-S0120
**Input**: `phase3_test_s0101_s0200/batch_input/seeds_0111_0120.json`
**Output**: `phase3_test_s0101_s0200/batch_output/batch_02_provisional.json`
(Same format as Agent 1)

### Agent 3: S0121-S0130
**Input**: `phase3_test_s0101_s0200/batch_input/seeds_0121_0130.json`
**Output**: `phase3_test_s0101_s0200/batch_output/batch_03_provisional.json`

### Agent 4: S0131-S0140
**Input**: `phase3_test_s0101_s0200/batch_input/seeds_0131_0140.json`
**Output**: `phase3_test_s0101_s0200/batch_output/batch_04_provisional.json`

### Agent 5: S0141-S0150
**Input**: `phase3_test_s0101_s0200/batch_input/seeds_0141_0150.json`
**Output**: `phase3_test_s0101_s0200/batch_output/batch_05_provisional.json`

### Agent 6: S0151-S0160
**Input**: `phase3_test_s0101_s0200/batch_input/seeds_0151_0160.json`
**Output**: `phase3_test_s0101_s0200/batch_output/batch_06_provisional.json`

### Agent 7: S0161-S0170
**Input**: `phase3_test_s0101_s0200/batch_input/seeds_0161_0170.json`
**Output**: `phase3_test_s0101_s0200/batch_output/batch_07_provisional.json`

### Agent 8: S0171-S0180
**Input**: `phase3_test_s0101_s0200/batch_input/seeds_0171_0180.json`
**Output**: `phase3_test_s0101_s0200/batch_output/batch_08_provisional.json`

### Agent 9: S0181-S0190
**Input**: `phase3_test_s0101_s0200/batch_input/seeds_0181_0190.json`
**Output**: `phase3_test_s0101_s0200/batch_output/batch_09_provisional.json`

### Agent 10: S0191-S0200
**Input**: `phase3_test_s0101_s0200/batch_input/seeds_0191_0200.json`
**Output**: `phase3_test_s0101_s0200/batch_output/batch_10_provisional.json`

---

## After All Agents Complete

Run merge coordinator:
```bash
node scripts/phase3_merge_batches.cjs
```

Validate output:
```bash
node scripts/validate_lego_pairs.cjs phase3_test_s0101_s0200/lego_pairs_s0101_s0200.json
```

Expected: ~250-300 new LEGOs, cumulative ~528 LEGOs through S0200

---

## Example Extraction (S0101)

**Seed**: "Estoy disfrutando descubrir más sobre este lenguaje"
**Known**: "I'm enjoying finding out more about this language."

**Bidirectional sweep**:
- Forward: estoy disfrutando | descubrir | más | sobre | este | lenguaje
- Backward: I'm enjoying | finding out | more | about | this | language

**LEGOs**:
1. "estoy disfrutando" = "I'm enjoying" (M) - NEW (present continuous pattern)
   - Components: [["estoy", "I am"], ["disfrutando", "enjoying"]]
2. "descubrir" = "to find out" (A) - NEW
3. "más" = "more" (A) - **REFERENCE to S0023L02** (check registry!)
4. "sobre" = "about" (A) - NEW
5. "este" = "this" (A) - NEW
6. "lenguaje" = "language" (A) - NEW

**Validation**: estoy disfrutando + descubrir + más + sobre + este + lenguaje = seed ✅

---

## Quality Baseline (S0001-S0100)

- 278 LEGOs total
- 37% Atomic, 63% Molecular
- Complete tiling: 100% reconstruction rate
- FD compliance: no ambiguous chunks
- Match this quality!

---

**EXECUTE**: Launch all 10 agents now in parallel. Target completion: ~25 minutes.
