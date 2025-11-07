# Ultra-Parallelization Analysis: 668 Seeds Full Course

**Goal**: Extract LEGOs + Generate Baskets for 668 seeds using parallel agents
**Constraint**: Claude Code on the Web with 30 agents
**Target**: Complete in ~3 hours vs ~55 hours sequential (18x+ speedup)

---

## Critical Insight: The Two-Phase Pipeline

### Phase 3: LEGO Extraction (AI Work)
**Time per seed**: 1-2 minutes (bidirectional sweep, FD checking, componentization)
**Sequential total**: 668 × 1.5 min = ~17 hours

### Phase 5: Basket Generation (AI Work)
**Time per seed**: 2-4 minutes (3-5 LEGOs × 10 phrases each + validation)
**Sequential total**: 668 × 3 min = ~33 hours

**Total Sequential**: ~50 hours of AI work

---

## The Merge Question: Do We NEED It?

### What Basket Generation Requires

For generating baskets for seed S0042:
1. **Which LEGOs to generate baskets for?** → NEW LEGOs in S0042 only
2. **GATE whitelist?** → ALL LEGOs from S0001-S0042
3. **Pattern information?** → Patterns available through S0042

**Key observation**: Basket gen needs COMPLETE lego_pairs.json through current seed, not beyond.

### Can We Skip the Merge?

#### Option A: No Merge (Agents Keep Provisional IDs)

```javascript
// Agent 1 output (S0001-S0025)
{
  "S0001": {
    "legos": [
      {"id": "PROV_001", "target": "quiero", "known": "I want", "new": true},
      ...
    ]
  },
  ...
}

// Agent 2 output (S0026-S0050)
{
  "S0026": {
    "legos": [
      {"id": "PROV_251", "target": "quiero", "known": "I want", "new": true},  // ❌ DUPLICATE!
      ...
    ]
  }
}
```

**Problem**: Agent 2 doesn't know "quiero" already exists → marks as "new" → WRONG!

For basket generation:
- S0026L01 basket would be generated for "quiero" (WRONG - already has basket from S0001)
- GATE whitelist would be incomplete (missing S0001-S0025 LEGOs)

**Verdict**: ❌ Cannot skip merge entirely

#### Option B: Incremental Merge (Staged)

```
Stage 1: Agent 1 extracts S0001-S0025
         → Merge immediately → lego_pairs_001_025.json
         → Master registry = {"quiero": "S0001L01", "hablar": "S0001L02", ...}

Stage 2: Agents 2-3 extract S0026-S0075
         → READ lego_pairs_001_025.json (for reference checking)
         → Mark "quiero" as {"id": "S0001L01", "ref": "S0001"} ✓
         → Merge → lego_pairs_001_075.json
```

**Benefit**: Agents can correctly mark references if they see previous output
**Cost**: Sequential dependency (Agent 2 waits for Agent 1)

**Verdict**: ⚠️ Reduces parallelism (only 3-4x speedup vs 20x)

#### Option C: Hybrid (True Parallel + Fast Merge) ✅

```
30 Agents extract S0001-S0668 in parallel (no coordination)
  → Each marks ALL LEGOs as "new" (duplicates OK at this stage)
  → 30 provisional batches output

Single coordinator merges sequentially (FAST)
  → Process batch_01, build master registry
  → Process batch_02, check against master, mark refs
  → ...
  → Process batch_30, final output
  → Total: ~15 minutes for 3000 LEGOs

30 Agents generate baskets in parallel
  → Read final lego_pairs.json (shared, read-only)
  → Generate baskets for their 25 seeds
```

**Verdict**: ✅ OPTIMAL - small sequential bottleneck (15 min) worth 20x speedup

---

## Why The Merge Is Actually FAST

### Merge Complexity

```javascript
// Pseudo-code for merge
const masterLEGOs = new Map(); // targetText.toLowerCase() → {id, seed_id}
let cumulativeCount = 0;

for (const batch of batches) {  // 30 batches
  for (const seed of batch.seeds) {  // ~25 seeds per batch
    for (const lego of seed.legos) {  // ~3-5 LEGOs per seed
      const key = lego.target.toLowerCase();

      if (masterLEGOs.has(key)) {
        // O(1) lookup - mark as reference
        lego.id = masterLEGOs.get(key).id;
        lego.ref = masterLEGOs.get(key).seed_id;
        delete lego.new;
      } else {
        // First occurrence - assign ID
        lego.id = generateId(seed.seed_id, ++cumulativeCount);
        lego.new = true;
        masterLEGOs.set(key, {id: lego.id, seed_id: seed.seed_id});
      }
    }
  }
}
```

**Total operations**:
- 668 seeds × 4 LEGOs/seed = ~2672 LEGOs
- Each LEGO: 1 Map lookup/insert (O(1))
- Total: ~2672 operations

**Estimated time**:
- ~0.3 seconds per LEGO (JSON parsing, Map ops, ID generation)
- 2672 × 0.3s = ~800 seconds = **~13 minutes**

**Compared to AI extraction**: 668 seeds × 1.5 min = **1002 minutes**

**Merge is 77x faster than extraction!**

---

## Full Pipeline Timing (668 Seeds, 30 Agents)

### Phase 3: LEGO Extraction

**Parallel (30 agents, 25 seeds each)**:
- Time per agent: 25 seeds × 1.5 min/seed = **37.5 minutes**
- All agents run in parallel
- **Wall-clock: ~40 minutes**

**Sequential coordinator merge**:
- Process 30 batches × 25 seeds × 4 LEGOs
- **Wall-clock: ~13 minutes**

**Phase 3 total: ~53 minutes**

### Phase 5: Basket Generation

**Parallel (30 agents, 25 seeds each)**:
- Time per agent: 25 seeds × 3 min/seed = **75 minutes**
- All agents run in parallel
- Agents read shared lego_pairs.json (read-only, no blocking)
- **Wall-clock: ~80 minutes**

**Phase 5 total: ~80 minutes**

### Phase 6: Introduction Generation (Script)
- Read lego_pairs.json
- Generate 2672 introductions (A/M types)
- **Wall-clock: ~2 minutes**

### Phase 7: Compilation (Script)
- Read lego_pairs.json, baskets, introductions
- Generate course_manifest.json
- **Wall-clock: ~5 minutes**

### **TOTAL PIPELINE: ~140 minutes (~2.3 hours)**

**vs Sequential: ~50 hours**

**Speedup: 21x**

---

## Practical Constraints: Can Claude Code Handle 30 Agents?

### Unknowns

1. **Rate limits**: Does Claude Code throttle parallel agent spawning?
2. **Quality degradation**: Do agents interfere with each other?
3. **Memory limits**: Can 30 agents run simultaneously?
4. **Coordination overhead**: Does spawning 30 agents take significant time?

### Risk Mitigation: Staged Approach

#### Stage 1: Foundation (S0001-S0100) - 4 Agents
```
Agent 1: S0001-S0025 (40 min)
Agent 2: S0026-S0050 (40 min)  } Parallel
Agent 3: S0051-S0075 (40 min)  }
Agent 4: S0076-S0100 (40 min)

Merge: 5 min
Basket generation (4 agents): 80 min

Total: ~125 min for 100 seeds
```

**Validate**:
- Quality matches manual work?
- GATE compliance 100%?
- Distribution targets met?
- No agent interference?

**If successful** → Proceed to Stage 2

#### Stage 2: Scale (S0101-S0668) - 22 Agents
```
Agents 5-26: S0101-S0668 (568 seeds, 26 agents, ~22 seeds each)

Extract: 40 min
Merge: 10 min
Baskets: 70 min

Total: ~120 min for 568 seeds
```

**Combined total**: ~245 min (~4 hours) with validation pauses

---

## Alternative: Can We Parallelize The Merge?

### Idea: Split Merge Across Multiple Workers

```
Worker 1: Merge batches 1-10  → partial_merge_01.json
Worker 2: Merge batches 11-20 → partial_merge_02.json
Worker 3: Merge batches 21-30 → partial_merge_03.json

Final coordinator: Merge the 3 partial merges → lego_pairs.json
```

**Problem**: The final merge STILL needs to be sequential (to resolve cross-worker duplicates)

**Benefit**: Minimal (15 min → 10 min, not worth the complexity)

**Verdict**: ❌ Not worth it - bottleneck is already tiny

---

## The Real Bottleneck: Basket Generation

### Why Baskets Take Longer

Phase 3 (LEGO extraction):
- Bidirectional sweep: algorithmic
- FD checking: yes/no decisions
- Componentization: pattern matching
- **Relatively deterministic**

Phase 5 (basket generation):
- Build GATE whitelist: algorithmic (fast)
- Generate 10 phrases per LEGO: **creative AI work**
- Validate each phrase: grammar, naturalness, completeness
- Select best 10: judgment calls
- **Highly creative, slower**

For seed S0050 (mid-course):
- 3-5 NEW LEGOs
- 10 phrases per LEGO
- = **30-50 phrases to generate and validate**
- = **3-5 minutes AI work**

### Can We Speed Up Basket Generation?

#### Option 1: Generate Fewer Phrases (Lower Quality)
- Target 8 phrases instead of 10
- **Time saved**: ~20%
- **Quality cost**: Less practice, less coverage
- **Verdict**: ❌ Not acceptable

#### Option 2: Batch Phrase Generation
Instead of:
```
Generate phrase 1 → Validate → Generate phrase 2 → Validate...
```

Do:
```
Generate 12 candidate phrases → Validate all → Select best 10
```

**Benefit**: May be slightly faster (batched AI calls)
**Verdict**: ⚠️ Worth testing, may save 10-20%

#### Option 3: Parallel Baskets Per Seed
For a seed with 5 LEGOs, launch 5 micro-agents in parallel (one per LEGO)

**Benefit**: 5x speedup per seed
**Cost**: 5x more agents (668 seeds × 4 LEGOs = **2672 agents!**)
**Verdict**: ❌ Impractical (too many agents)

#### Conclusion: Basket generation IS the bottleneck
- 80 minutes (57% of total time)
- Hard to optimize further without quality loss
- **Accept as necessary cost**

---

## Optimized Strategy: The Waterfall Approach

### Insight: Overlap Phases Where Possible

```
Timeline:
├─ 0-40 min:  Phase 3 Extract (30 agents, S0001-S0668)
├─ 40-53 min: Phase 3 Merge (coordinator, sequential)
├─ 53-133 min: Phase 5 Baskets (30 agents, S0001-S0668)
│              Phase 6 Intros (script, start at 55 min)
│              Phase 7 Compile (script, start at 60 min)
└─ 133 min: COMPLETE
```

**Key**: Phase 6 and 7 can START as soon as first baskets are ready

**Refined Timeline**:
```
├─ 0-40 min:  Phase 3 Extract (all agents)
├─ 40-53 min: Phase 3 Merge
├─ 53 min:    Phase 3 COMPLETE → lego_pairs.json ready
│
├─ 53-133 min: Phase 5 Baskets (all agents)
│  ├─ 55 min:   Phase 6 Intros (script, 2 min) → Ready for incremental compile
│  ├─ 58 min:   First 100 baskets done → Partial compile
│  ├─ 78 min:   First 300 baskets done → Partial compile
│  └─ 133 min:  All baskets done
│
└─ 133-138 min: Phase 7 Final Compile
    138 min: COMPLETE
```

**Total: ~2.3 hours** (vs 50 hours sequential = **22x speedup**)

---

## DO We Need The Merge? FINAL ANSWER

### YES, We Need It Because:

1. **LEGO IDs Must Be Deterministic**
   - S0001L01 = first NEW LEGO introduced in S0001
   - If Agent 2 extracts "quiero" again, it can't assign S0026L01 (already S0001L01)
   - Only merge knows global LEGO registry

2. **Basket Generation Requires Correct IDs**
   - Basket filename: `lego_baskets_s0026.json`
   - Basket keys: `"S0026L01"`, `"S0026L02"` (only NEW LEGOs from S0026)
   - Without merge, can't know which are NEW vs references

3. **Complete Tiling Requires References**
   - Seed must show ALL LEGOs (new + ref) to reconstruct
   - `{"id": "S0001L01", "ref": "S0001"}` only possible after merge
   - Validators check seed reconstruction

4. **Cumulative Counts Must Be Accurate**
   - `"cumulative_legos": 145` after S0050
   - Only merge has global count
   - Used for validation and debugging

### BUT The Merge Is FAST

- 13 minutes for 668 seeds (2672 LEGOs)
- 77x faster than AI extraction
- 370x faster than AI basket generation
- **9% of total pipeline time**

### Therefore: Keep The Merge

**The small sequential bottleneck (13 min) is worth**:
- Simplicity (agents don't coordinate)
- Correctness (guaranteed unique IDs)
- Speed (agents don't wait during extraction)
- **21x overall speedup**

---

## Recommended Execution Plan

### Test Phase (S0001-S0100)

**Week 1: Validation**
```bash
# 4 agents, 25 seeds each
# Estimated: 2 hours total

1. Launch 4 extraction agents (parallel)
2. Merge coordinator
3. Launch 4 basket agents (parallel)
4. Manual quality review (5 seeds spot-check)
5. Automated validation (GATE, distribution)
```

**Success Criteria**:
- [ ] Zero GATE violations
- [ ] Distribution targets met (2-2-2-4)
- [ ] Quality matches manual baseline
- [ ] No agent interference
- [ ] Total time < 2.5 hours

**If successful** → Proceed to Production

### Production Phase (S0001-S0668)

**Week 2-3: Full Extraction**
```bash
# 30 agents total
# Estimated: 2.5 hours

1. Launch 30 extraction agents (parallel)
   - Monitor for failures
   - Restart any failed agents

2. Run merge coordinator
   - Validate output
   - Check cumulative counts

3. Launch 30 basket agents (parallel)
   - Monitor progress
   - Quality spot-checks (every 100 seeds)

4. Run introduction script (Phase 6)

5. Run compilation script (Phase 7)

6. Final validation:
   - Seed reconstruction tests
   - GATE compliance (sample)
   - Distribution compliance (sample)
   - Manual quality review (10 seeds)
```

**Deliverable**: Complete 668-seed course in ~3 hours vs ~2 weeks manual

---

## Risk Analysis

### High Risk
- **Agent limits**: Claude Code may not support 30 parallel agents
  - **Mitigation**: Test with 4, then 10, then 30
  - **Fallback**: Run in batches (10 agents × 3 runs = 6 hours)

### Medium Risk
- **Quality degradation** at scale
  - **Mitigation**: Automated validation + spot-checks
  - **Fallback**: Re-run failed seeds individually

### Low Risk
- **Merge errors** (ID collisions, duplicate tracking)
  - **Mitigation**: Comprehensive unit tests
  - **Fallback**: Manual merge debug (merge is deterministic)

---

## Success Metrics

**Phase 3 (LEGO Extraction)**:
- [ ] 100% seed reconstruction (all 668 seeds)
- [ ] Zero ambiguous LEGOs (FD compliance)
- [ ] Correct A/M classification
- [ ] Accurate componentization
- [ ] Time: < 1 hour total

**Phase 5 (Basket Generation)**:
- [ ] 100% GATE compliance (zero violations)
- [ ] 90%+ distribution compliance (2-2-2-4)
- [ ] Natural Spanish (spot-check quality)
- [ ] Time: < 2 hours total

**Overall Pipeline**:
- [ ] Complete in < 3 hours
- [ ] Quality matches or exceeds manual baseline
- [ ] Ready for Phase 8 (audio generation)

---

## Conclusion

**The Merge IS Necessary But Not a Bottleneck**

For 668 seeds with 30 agents:
- ✅ True parallel extraction (40 min)
- ✅ Fast sequential merge (13 min) ← **9% of total time**
- ✅ True parallel basket generation (80 min)
- ✅ **Total: ~2.3 hours vs 50 hours (22x speedup)**

**The bottleneck is NOT the merge** (13 min)
**The bottleneck IS basket generation** (80 min)

But basket generation CANNOT be parallelized further without:
- Quality loss (fewer phrases)
- Impractical agent count (2672 agents)
- Complex coordination (diminishing returns)

**Therefore**: The current strategy is **near-optimal** given constraints.

**Next step**: Test with S0001-S0100 (4 agents) to validate approach before scaling.
