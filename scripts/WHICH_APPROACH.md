# Which Overnight Approach Should You Choose?

## 🎯 TL;DR Recommendation

**Go with Option A: 668 Seeds Through Phase 3 Only**

This is the safest, most reliable overnight run. You'll wake up to validated course foundations, not "a bag of shite."

---

## Option Comparison

### Option A: 668 Seeds → Phase 3 Complete ⭐ RECOMMENDED

**Command:**
```bash
bash scripts/OVERNIGHT_668_TO_PHASE3.sh
```

**What Runs Overnight:**
- Phase 1: Translation (deterministic, rule-based)
- Phase 3: LEGO Extraction (mechanical TILING)
- Post-processing (scripts only)

**What You Wake Up To:**
```
✅ spa_for_eng: 668 cognate-optimized translations
✅ cmn_for_eng: 668 simplicity-optimized translations
✅ spa_for_eng: ~2800 LEGOs (deduplicated)
✅ cmn_for_eng: ~2800 LEGOs (deduplicated)
✅ All validated, array-order-correct
✅ Complete course foundation ready for Phase 5
```

**Risk Level:** 🟢 LOW
- All mechanical/deterministic processes
- Clear success/failure criteria
- Easy to validate
- Easy to re-run specific chunks if needed

**Time:** ~4-6 hours

**Then What?**
Run Phase 5 (practice baskets) tomorrow in supervised 20-seed batches.

---

### Option B: 100 Seeds → Complete Pipeline

**Command:**
```bash
bash scripts/OVERNIGHT_AUTO_100.sh
# Then run Phase 5 orchestrators
```

**What Runs Overnight:**
- Phase 1: Translation
- Phase 3: LEGO Extraction
- Phase 5: Practice Basket Generation ⚠️

**What You Wake Up To:**
```
✅ 100 translations (both languages)
✅ ~850 LEGOs (both languages)
⚠️  2000-3000 practice phrases (quality uncertain)
```

**Risk Level:** 🟡 MEDIUM-HIGH
- Phase 5 is creative/interpretive
- Agents might paraphrase prompts
- "Meaningful utterances" = subjective
- Window constraints = complex
- **Your exact concern**: Could wake up to garbage

**Time:** ~6-8 hours

**Likely Outcome:**
- 70% chance: Mixed quality, some good, some needs redoing
- 20% chance: All good (lucky!)
- 10% chance: Agents drifted badly, "bag of shite"

---

### Option C: Chunked 100s → Phase 3 Each

**Command:**
```bash
# Do 1-100 to Phase 3
# Then 101-200 to Phase 3
# etc.
```

**What Runs Overnight:**
Multiple chunks, each through Phase 3

**Risk Level:** 🟢 LOW-MEDIUM
- Same low risk as Option A
- But more complex orchestration
- More points of failure

**Why Not This?**
If you're doing Phase 3 only, might as well do all 668 at once. Simpler.

---

## 🧠 Why Phase 5 is Risky Overnight

### The Problem

Phase 5 asks agents to:
1. Read a scaffold with sliding window context
2. "Generate meaningful, natural utterances"
3. "Think → Express → Validate"
4. Use 60% of recent vocabulary
5. Build from simple to complex

This requires **interpretation and judgment**.

### What Can Go Wrong

**Agent paraphrases prompt:**
```
Prompt: "Think of meaningful things learners would want to say"
Agent reads: "Generate practice phrases"
Result: Mechanical pattern-filling instead of meaningful utterances
```

**Agent ignores constraints:**
```
Window coverage drops to 30% (should be ≥70%)
Uses unavailable vocabulary
Produces word salad
```

**Agent drifts from methodology:**
```
Forgets to exclude new LEGO vocabulary from window calculation
Generates phrases that don't make sense
Violates array order convention
```

### The Risk

You wake up to 2000 practice phrases that **look** okay at first glance, but:
- Don't actually use recent vocabulary properly
- Aren't natural or meaningful
- Have subtle quality issues
- Would take days to manually review and fix

---

## ✅ Recommended Workflow

### Night 1: Foundation (668 → Phase 3)

```bash
cd /Users/tomcassidy/SSi/ssi-dashboard-v7-clean
bash scripts/OVERNIGHT_668_TO_PHASE3.sh
```

**Sleep soundly knowing:**
- Deterministic processes only
- Clear validation criteria
- Easy to spot failures
- Complete foundation if successful

### Morning: Validate Foundation

```bash
# Check translations
head -50 public/vfs/courses/spa_for_eng_s0001-0668/seed_pairs.json

# Check LEGOs
head -50 public/vfs/courses/spa_for_eng_s0001-0668/phase3_outputs/lego_pairs_deduplicated_final.json

# Spot-check: Do Spanish seeds use cognates?
# Spot-check: Do Chinese seeds use simple characters?
# Spot-check: Is array format [known, target]?
```

### Day 2+: Phase 5 in Supervised Batches

```bash
# Prepare all scaffolds first
bash scripts/prepare_phase5_scaffolds_668.sh

# Then run in small supervised batches
# Spanish seeds 1-20 (supervise, validate)
# Spanish seeds 21-40 (supervise, validate)
# etc.
```

**Benefits:**
- Catch quality issues immediately
- Course-correct if agents drift
- Build confidence incrementally
- Much less risk than overnight

---

## 📊 Success Probability

### Option A (668 → Phase 3)
- **95%** chance of complete success
- **4%** chance of minor issues (easy fixes)
- **1%** chance of major failure (re-run chunks)

### Option B (100 → Full Pipeline)
- **20%** chance of complete success
- **50%** chance of mixed quality (significant rework)
- **20%** chance of poor quality (major rework)
- **10%** chance of total failure (start over)

---

## 🎯 Final Answer

**Do Option A: 668 Seeds Through Phase 3**

You get:
- ✅ Complete validated foundation
- ✅ Both languages fully translated
- ✅ All LEGOs extracted and deduplicated
- ✅ Safe, deterministic processes
- ✅ Wake up confident, not anxious

Then supervise Phase 5 in batches while you're awake.

**You'll sleep better. Trust me on this one. 😊**

---

**Start Command:**
```bash
bash scripts/OVERNIGHT_668_TO_PHASE3.sh
```
