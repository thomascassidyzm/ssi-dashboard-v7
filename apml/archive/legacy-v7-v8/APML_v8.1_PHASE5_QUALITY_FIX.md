# APML v8.1 - Phase 5 Quality Crisis Resolution

**Date**: 2025-11-14
**Version**: 8.1
**Author**: Tom Cassidy + Claude (Sonnet 4.5)
**Status**: Production Ready

---

## 🚨 CRITICAL PROBLEM IDENTIFIED

**Context**: Phase 5 basket generation for S0001-S0100 produced TERRIBLE quality:
- Repeated identical phrases
- Nonsensical grammar
- Missing the actual LEGO being taught
- Example: "voy a", "voy a", "voy a" (phrases 6-10) or "I want with someone else with you"

**Root Cause**: Agents wrote Python scripts instead of doing linguistic work

**Evidence**: Git commit 85afc738 shows agents created files like `generate_agent_01_phrases.py` with mechanical pattern matching code

---

## 📊 QUALITY COMPARISON

### ✅ GOOD Quality (S0362-S0371 - Manually Supervised)
```json
"practice_phrases": [
  ["No", "No", null, 1],
  ["No, thank you", "No gracias", null, 2],
  ["No, I can't", "No no puedo", null, 3],
  ["No, he wanted to", "No él quería", null, 3],
  ["No, he was quiet", "No él estaba callado", null, 4],
  ["No, your friend said something", "No tu amigo dijo algo", null, 5],
  // ... natural progression, variety, meaningful phrases
]
```

### ❌ TERRIBLE Quality (S0001-S0100 - Automated Scripts)
```json
"practice_phrases": [
  ["I want", "quiero", null, 1],
  ["I want", "quiero", null, 1],
  ["I want", "quiero", null, 1],
  ["voy a", "voy a", null, 1],
  ["voy a", "voy a", null, 1],
  ["I want with someone else with you", "quiero con alguien más contigo", null, 4],
  // ... repeated, nonsensical, automated garbage
]
```

---

## 🔍 ROOT CAUSE ANALYSIS

### Problem 1: Massive Whitelist (Cognitive Overload)
**Issue**: Scaffold contained 1000s of word pairs in `_metadata.whitelist_pairs`
- Caused cognitive overload
- Agents defaulted to writing automation scripts
- Lost sight of linguistic task

### Problem 2: Overlap Detection Complexity
**Issue**: Three-tier system (10/7/5 phrases based on overlap_level)
- Added unnecessary cognitive burden
- Complicated agent task
- Marginal pedagogical benefit

### Problem 3: Technical Framing
**Issue**: Agent task template looked like programming spec
- JSON schema examples
- Technical distribution numbers (1-2-1-3, etc.)
- No linguistic framing

### Problem 4: Broken Intelligence Doc URL
**Issue**: Master prompt referenced https://ssi-dashboard-v7.vercel.app/intelligence (404)
- Should be: /phase-intelligence/5
- Agents couldn't access detailed methodology

### Problem 5: No Comprehension Verification
**Issue**: Nothing forced agents to read intelligence doc
- Agents skipped methodology
- Went straight to mechanical solutions

---

## 🎯 REDESIGN SOLUTION (v7.0)

### Change 1: Remove Massive Whitelist ✅
**Before**: 1000s of word pairs in `_metadata.whitelist_pairs`

**After**: Focused vocabulary context
```json
"recent_context": {
  "S0357": {
    "sentence": [
      "no | ella solo quería | ...",
      "No | she just wanted | ..."
    ],
    "new_legos": [
      ["S0357L01", "she", "ella"],
      ["S0357L02", "just wanted", "solo quería"]
    ]
  }
  // ... 9 more recent seeds
}
```

**Rationale**: 10 recent seeds provide sufficient vocabulary without overload

### Change 2: Drop Overlap Detection ✅
**Before**: Adaptive counts (10/7/5 based on overlap_level)

**After**: ALWAYS 2-2-2-4 distribution (10 phrases every LEGO)

**Rationale**:
- Simpler cognitive load
- Consistent expectations
- Post-process filtering can handle quality control

### Change 3: Linguistic Framing ✅
**Before**:
```markdown
## Your Process
1. Read Phase 5 Ultimate Intelligence v6.2
2. Check overlap_level and target_phrase_count:
   - "none": Generate 10 phrases (distribution: 2-2-2-4)
   - "partial": Generate 7 phrases (distribution: 1-2-1-3)
```

**After**:
```markdown
## 🎭 YOUR ROLE: World-Leading Creator of Practice Phrases

You are a **world-leading creator of practice phrases** in Spanish...

Your phrases must:
- ✅ Sound natural in BOTH languages
- ✅ Use realistic communication scenarios
- ✅ Follow vocabulary constraints
- ✅ Help learners internalize Spanish grammar

## ✓ COMPREHENSION CHECKLIST (Complete BEFORE Generating)

□ I understand vocabulary sources: 10 recent seeds + current seed's earlier LEGOs + current LEGO
□ I understand GATE compliance: Every Spanish word MUST be available
□ I understand distribution: ALWAYS 2-2-2-4 (10 phrases per LEGO)
...

⛔ I will NOT write scripts, templates, or automation code
✅ I will use my natural language intelligence
```

**Rationale**: Frames task as linguistic creation, not technical programming

### Change 4: Fixed Intelligence Doc URL ✅
**Before**: `https://ssi-dashboard-v7.vercel.app/intelligence` (404)

**After**: `https://ssi-dashboard-v7.vercel.app/phase-intelligence/5`

### Change 5: Comprehension Checklist ✅
**Added**: Explicit checklist forcing agent to confirm understanding before generating

---

## 📂 FILES UPDATED

### 1. `/scripts/phase5_prep_scaffolds.cjs`
**Changes**:
- Removed `buildWhitelistUpToLegoCount()` function
- Added `buildRecentContext()` (10 seeds with LEGO tiles)
- Added `buildCurrentSeedEarlierLegos()` (incremental L01, L01+L02, etc.)
- Removed overlap detection logic
- Always use 2-2-2-4 distribution
- Updated `_instructions` to reference v7.0

**Key diff**:
```javascript
// REMOVED
const whitelistPairs = buildWhitelistUpToLegoCount(legoPairsData, availableLegos);
const overlapLevel = checkOverlapLevel(lego.target, newLegosInSeed);

// ADDED
const recentContext = buildRecentContext(legoPairsData, currentSeedIndex, 10);
const currentSeedEarlierLegos = buildCurrentSeedEarlierLegos(seed, i);
```

### 2. `/automation_server.cjs`
**Changes**:
- Rewrote "Phase 5 Intelligence" section with linguistic framing
- Added "YOUR ROLE: World-Leading Creator of Practice Phrases"
- Added comprehension checklist
- Updated scaffold description (removed whitelist references)
- Rewrote agent task template with extended thinking steps
- Updated success criteria to v7.0

**Key sections added**:
```markdown
## 🎭 YOUR ROLE: World-Leading Creator of Practice Phrases
## ✓ COMPREHENSION CHECKLIST (Complete BEFORE Generating)
## 🎨 Your Process (Per LEGO)
  - STEP 1: Extended Thinking
  - STEP 2: Think in English First
  - STEP 3: Express in Spanish
  - STEP 4: Validate EVERY Word
  - STEP 5: Generate 2-2-2-4 Distribution
  - STEP 6: Final LEGO Rule
```

### 3. `/public/docs/phase_intelligence/phase_5_lego_baskets.md`
**Complete rewrite** from v6.2 to v7.0:

**Removed**:
- All overlap detection sections (three-tier system)
- Whitelist references (3-category rule)
- "60% coverage" rule
- Adaptive phrase counts

**Added**:
- "YOUR ROLE" framing as world-leading creator
- Comprehension checklist (forces reading)
- Vocabulary sources section (3 clear sources, no whitelist)
- Extended examples of good vs bad output
- Stronger anti-scripting warnings
- Natural progression guidance

**Structure**:
```markdown
# Phase 5 Basket Generation v7.0

## 🎭 YOUR ROLE
## 🎯 YOUR MISSION
## ✓ COMPREHENSION CHECKLIST
## 📋 INPUT: SCAFFOLD STRUCTURE
## 🔑 KEY PRINCIPLE: MEANINGFUL UTTERANCES FIRST
## 🎨 VOCABULARY SOURCES (NO MASSIVE WHITELIST!)
## ⚠️ GATE COMPLIANCE
## 📐 PHRASE GENERATION PROCESS
## 📤 OUTPUT FORMAT
## 🚨 CRITICAL WARNINGS
## 🎓 QUALITY EXAMPLES
```

### 4. `/public/docs/APML_v8.1_PHASE5_QUALITY_FIX.md` (This file)
**New file** documenting the complete redesign

---

## 📊 EXPECTED OUTCOMES

### Quality Improvements
✅ Agents do linguistic work (not write scripts)
✅ Natural phrases in both languages
✅ No repeated/nonsensical output
✅ Proper GATE compliance maintained
✅ Evidence of extended thinking (variety, progression)

### Quantitative Metrics
- **Phrase count**: ALWAYS 10 per LEGO (was 10/7/5)
- **Distribution**: ALWAYS 2-2-2-4 (was variable)
- **GATE compliance**: 100% (unchanged)
- **Vocabulary sources**: 3 clear sources (was massive whitelist)

### Cognitive Load Reduction
- **Scaffold size**: ~50KB (was ~500KB due to whitelist)
- **Complexity**: Single distribution (was 3 distributions)
- **Task framing**: Linguistic (was technical)

---

## 🚀 ROLLOUT PLAN

### Phase 1: Validation (Immediate)
1. Generate 10 random seeds using "Random 10 SEED Test" button
2. Review quality manually
3. Confirm no Python scripts created
4. Verify natural language output

### Phase 2: Small Batch (If Phase 1 Passes)
1. Run 50-100 seeds
2. Automated GATE validation
3. Sample manual quality checks
4. Measure compliance rates

### Phase 3: Full Production (If Phase 2 Passes)
1. Run remaining seeds (668 total)
2. Continuous quality monitoring
3. Archive v6.2 outputs
4. Update production baskets

---

## 📋 VALIDATION CRITERIA

### Must Pass Before Production Rollout:
□ No Python scripts created by agents
□ All phrases sound natural in English
□ All phrases sound natural in Spanish
□ No repeated identical phrases
□ Progressive complexity (1-2 LEGOs → 5+ LEGOs)
□ 100% GATE compliance (all words available)
□ Final LEGO phrase = complete seed sentence
□ Distribution matches 2-2-2-4

---

## 🔄 COMPARISON: v6.2 vs v7.0

| Aspect | v6.2 (OLD) | v7.0 (NEW) |
|--------|------------|------------|
| Vocabulary Source | Massive whitelist (1000s of pairs) | 10 recent seeds + current seed LEGOs |
| Phrase Count | Adaptive (10/7/5) | Always 10 |
| Distribution | Variable (2-2-2-4, 1-2-1-3, 1-1-1-2) | Always 2-2-2-4 |
| Task Framing | Technical (JSON schemas) | Linguistic (creator role) |
| Comprehension Check | None | Required checklist |
| Intelligence Doc URL | Broken (404) | Fixed (/phase-intelligence/5) |
| Scaffold Size | ~500KB | ~50KB |
| Cognitive Load | HIGH | LOW |
| Quality Result | Scripts/garbage | Natural language (expected) |

---

## 📖 LESSONS LEARNED

### 1. Less Is More
**Lesson**: Giving agents ALL available vocabulary overwhelmed them
**Fix**: Focus on 10 recent seeds only

### 2. Simple Beats Complex
**Lesson**: Adaptive distributions added cognitive burden for marginal benefit
**Fix**: Single 2-2-2-4 distribution always

### 3. Framing Matters
**Lesson**: Technical framing → agents write code
**Fix**: Linguistic framing → agents think linguistically

### 4. Force Comprehension
**Lesson**: Agents skip reading docs if not forced
**Fix**: Checklist requires confirmation before proceeding

### 5. Test Small First
**Lesson**: S0362-S0371 (10 seeds) worked; S0001-S0100 failed
**Fix**: Always validate small batch before scaling

---

## 🎯 SUCCESS CRITERIA

Phase 5 v7.0 is successful when:

✅ Random 10 seed test produces natural phrases (no scripts)
✅ 50-seed batch maintains quality
✅ GATE validation passes 100%
✅ Manual spot checks show variety and natural progression
✅ No template patterns detected
✅ Both languages sound natural to native reviewers

---

## 📝 NOTES

- This redesign prioritizes **quality over completeness**
- Generating 10 phrases always (then filtering if needed) is better than preventing violations upfront
- Linguistic intelligence > mechanical pattern matching
- Comprehension verification > hoping agents read docs
- Focused context > comprehensive whitelist

---

## 🔗 RELATED DOCUMENTS

- Intelligence Doc: `/public/docs/phase_intelligence/phase_5_lego_baskets.md` (v7.0)
- Scaffold Generator: `/scripts/phase5_prep_scaffolds.cjs`
- Automation Server: `/automation_server.cjs` (Phase 5 section)
- Good Quality Example: `/public/vfs/courses/spa_for_eng/phase5_outputs/seed_s0362.json`

---

**Version History**:
- v8.0: Phase 3 critical learnings
- v8.1: Phase 5 quality crisis resolution (this document)
