# APML v8.0 - Phase 3 Critical Learnings

**Date:** November 11, 2025
**Status:** Production Knowledge - CRITICAL
**Context:** Lessons from debugging Phase 3 LEGO extraction failures

---

## 🚨 CRITICAL RULE #1: NEVER REWRITE WORKING PROMPTS FROM SCRATCH

### What Happened

During Phase 3 debugging (spa_for_eng_s0001-0030), we made a catastrophic mistake:
- Had working Phase 3 v5.0 intelligence doc with proven production results
- Thought we "understood it well enough" to rewrite from scratch as v6.0
- Lost critical working knowledge about registry tracking and reference format
- Spent hours debugging failures that were entirely self-inflicted

### The Lesson

**NEVER rewrite a working prompt specification from scratch, no matter how well you think you understand it.**

Instead:
1. ✅ Read the ENTIRE working document first
2. ✅ Identify SPECIFIC sections that need improvement
3. ✅ Make TARGETED edits/additions to those sections
4. ✅ Preserve ALL working content, examples, and format specifications
5. ✅ Test incrementally

### Why This Matters

Working prompts contain:
- **Implicit knowledge** - Details you don't consciously notice but are critical
- **Production-tested examples** - Real scenarios that work in practice
- **Edge cases** - Subtle issues discovered through actual use
- **Format specifications** - Exact structures agents need to follow

**You cannot reconstruct this from memory or understanding alone.**

---

## 🎯 CRITICAL RULE #2: Phase 3 Registry Tracking

### The Problem We Solved

Agents were skipping words during extraction, leading to incomplete tiling. Root cause: Missing registry tracking instructions.

### The Solution

**STEP 1.6: MAINTAIN YOUR REGISTRY** must explicitly state:

1. **Build registry dynamically as you process seeds**
   ```
   Internal registry (build as you go):
   S0001: "español" = "Spanish" (S0001L03)
   S0001: "ahora" = "now" (S0001L05)
   S0001: "hablar" = "to speak" (S0001L02)
   ```

2. **Check registry before marking any LEGO as NEW**

3. **Include references in legos array for collisions**
   ```json
   {
     "id": "S0001L03",
     "type": "A",
     "target": "español",
     "known": "Spanish",
     "ref": "S0001",
     "new": false
   }
   ```

4. **Collision detection requires BOTH target AND known to match**
   - "hablar" = "to speak" + "hablar" = "speaking" → NOT a collision (different known) → NEW LEGO
   - "español" = "Spanish" + "español" = "Spanish" → IS a collision (both match) → REFERENCE

### Why This Is Critical

**Without references in the legos array, tiling validation fails.**

Every word in the target sentence MUST appear in at least one LEGO (new OR reference). If you skip words because "they already exist", the seed cannot reconstruct.

---

## 🔄 CRITICAL RULE #3: Bidirectional Sweep Algorithm

### The Algorithm

Phase 3 extraction uses THREE phases:

#### **STEP 1: Forward Sweep (KNOWN order)**

Process word-by-word, left to right:
```
Position 0 → end of KNOWN:
1. Test word[pos] for FD compliance
2. If FD FAILS: Extend (word[pos..pos+1], etc.) until FD PASSES
3. When FD PASSES: LOCK (minimum granularity), classify A/M, move to next position
4. Repeat until all KNOWN words processed
```

#### **STEP 1.5: Backward Sweep (TARGET order)**

Process word-by-word, right to left:
```
Position END → 0 of TARGET:
1. Test word[pos] for FD compliance (if not already covered)
2. If FD FAILS: Extend leftward (word[pos-1..pos], etc.) until FD PASSES
3. When FD PASSES: LOCK, classify A/M, move to previous position
4. Repeat until start of sentence
```

**Why bidirectional?**
- Forward sweep: Respects learner's native language chunking
- Backward sweep: Catches target language particles (Chinese 得/着, Spanish que/de, etc.)
- Together: Complete coverage, no missed words

#### **STEP 1.6: Maintain Registry**

Track all extracted LEGOs and check for collisions (see Rule #2 above).

### Working Example

```
Seed: "Hablo un poco de español ahora" = "I speak a little Spanish now"

Forward sweep:
- "I speak" → "hablo" ✓
- "a little" → "un poco de" ✓ (extended because "a" alone fails FD)

Backward sweep:
- "ahora" → "now" ✓
- "español" → "Spanish" ✓

Registry check:
- "español" = "Spanish" exists in S0001 → REFERENCE it (include in legos array)
- "ahora" = "now" exists in S0001 → REFERENCE it (include in legos array)

Final legos array for S0009:
1. "hablo" = "I speak" (NEW)
2. "un poco" = "a little" (NEW)
3. "un poco de" = "a little" (NEW - molecular variant)
4. "español" = "Spanish" (REFERENCE to S0001L03)
5. "ahora" = "now" (REFERENCE to S0001L05)

Tiling: hablo + un poco de + español + ahora = "Hablo un poco de español ahora" ✅
```

---

## 📊 Success Metrics

After applying these learnings:
- ✅ All 30 seeds tile correctly (100% success rate)
- ✅ 113 unique LEGOs extracted
- ✅ 138 total LEGO instances
- ✅ 18.1% reuse rate (21 references properly included)

---

## 🎓 Meta-Learning: Use Extended Thinking

**The process that led to failure:**
- Rushed through edits without planning
- Made vague changes like "add backward sweep" without specifics
- Didn't think through implications before acting

**The process that led to success:**
- Used extended thinking to analyze the problem
- Read complete documents before making changes
- Made targeted, specific edits with clear rationale
- Tested incrementally

**Rule:** When working on complex prompt engineering, ALWAYS use extended thinking to plan changes before executing them. Rushing leads to mistakes that take 10x longer to fix.

---

## 🔗 Related Documents

- Phase 3 Intelligence: `/docs/phase_intelligence/phase_3_lego_pairs.md` (v5.0 Ultimate + bidirectional sweep)
- APML v7.0: `/docs/APML_v7.0_CURRENT_FORMAT.md`
- Production Example: `/public/vfs/courses/spa_for_eng_s0001-0030/lego_pairs.json`

---

## 📝 Version History

- **v8.0** (2025-11-11): Initial capture of Phase 3 critical learnings
  - Rule #1: Never rewrite working prompts from scratch
  - Rule #2: Registry tracking with collision detection
  - Rule #3: Bidirectional sweep algorithm
  - Meta-learning about extended thinking

---

**Status:** ✅ Production Knowledge - Apply to ALL future Phase 3 work
