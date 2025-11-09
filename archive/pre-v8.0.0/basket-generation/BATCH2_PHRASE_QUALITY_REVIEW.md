# Batch 2 Phrase Quality Review - Agent 05

**Date**: 2025-11-07
**Scope**: Manual review of Agent 05 output (S0381-S0400, 92 LEGOs, 920 phrases)
**Purpose**: Assess "speakability" and naturalness that automated checks can't validate

---

## 📋 Review Methodology

### Sampling Strategy:

**10% Representative Sample** = ~10 LEGOs from Agent 05's 92 LEGOs

**Selection Criteria**:
- 3 LEGOs from early seeds (S0381-S0385)
- 4 LEGOs from middle seeds (S0386-S0393)
- 3 LEGOs from late seeds (S0394-S0400)
- Mix of Atomic (A) and Molecular (M) types
- Mix of short and long LEGOs

---

## 🎯 Evaluation Criteria

### For Each LEGO's 10 Phrases:

#### 1. ENGLISH Quality (1-5 scale per phrase)
**5 - Perfect**: Natural, fluent, something people actually say
**4 - Good**: Minor awkwardness but acceptable
**3 - Acceptable**: Grammatically correct but slightly forced
**2 - Awkward**: Correct but unnatural construction
**1 - Poor**: Grammatical errors or very unnatural

**Key Checks**:
- ✅ Gerund usage (enjoy speaking NOT enjoy to speak)
- ✅ Completeness (phrases 3-10 must be complete thoughts)
- ✅ Natural word order
- ✅ Conversational value (would you say this?)

#### 2. SPANISH Quality (1-5 scale per phrase)
**5 - Perfect**: Natural Spanish a native would say
**4 - Good**: Acceptable with minor stiffness
**3 - Acceptable**: Correct but slightly textbook-ish
**2 - Awkward**: Correct grammar but unnatural phrasing
**1 - Poor**: Sounds translated, not natural Spanish

**Key Checks**:
- ✅ Natural word order for Spanish
- ✅ Idiomatic where appropriate
- ✅ Not overly literal translation
- ✅ Flows naturally when spoken aloud

#### 3. PAIRING Quality (per phrase)
**Match**: Do English and Spanish convey same meaning?
**Natural**: Do both sound natural in their respective languages?
**Useful**: Is this a valuable phrase for learners?

---

## 📊 Scoring Template

For each sampled LEGO:

```markdown
### LEGO: [ID] - "[target]" / "[known]"
**Type**: [A/M] | **Available LEGOs**: [count]

#### Phrase Distribution:
- Really short (1-2): [count]
- Quite short (3): [count]
- Longer (4-5): [count]
- Long (6+): [count]

#### Quality Scores:

| # | English | Spanish | English Score | Spanish Score | Issues |
|---|---------|---------|---------------|---------------|--------|
| 1 | [text] | [text] | 5/4/3/2/1 | 5/4/3/2/1 | [notes] |
| 2 | [text] | [text] | 5/4/3/2/1 | 5/4/3/2/1 | [notes] |
| ... | ... | ... | ... | ... | ... |
| 10 | [text] | [text] | 5/4/3/2/1 | 5/4/3/2/1 | [notes] |

**LEGO Overall**:
- English Avg: X.X/5
- Spanish Avg: X.X/5
- Issues: [summary]
- Recommendation: [PASS / NEEDS MINOR FIXES / NEEDS REWORK]
```

---

## 🔍 Specific Issues to Flag

### English Grammar Issues:
- [ ] Incorrect gerund usage (e.g., "enjoy to do" instead of "enjoy doing")
- [ ] Incomplete phrases in positions 3-10 (e.g., "to be able to" without completion)
- [ ] Unnatural word order
- [ ] Missing articles where needed
- [ ] Wrong preposition usage

### Spanish Issues:
- [ ] Overly literal translation (word-for-word from English)
- [ ] Unnatural word order for Spanish
- [ ] Missing/wrong use of subjunctive mood
- [ ] Awkward article usage
- [ ] Unnatural vocabulary choice

### Pairing Issues:
- [ ] Meaning mismatch between English and Spanish
- [ ] Different register (one formal, one informal)
- [ ] Spanish more/less natural than English equivalent

### Distribution Issues:
- [ ] Wrong phrase lengths in wrong categories
- [ ] Too many very similar phrases (lack of variety)
- [ ] Phrases don't progress logically in complexity

---

## 📈 Aggregate Scoring

After reviewing 10 sampled LEGOs:

### Overall Quality:
```
Total Phrases Reviewed: 100 (10 LEGOs × 10 phrases)

English Quality:
- Perfect (5): X phrases (X%)
- Good (4): X phrases (X%)
- Acceptable (3): X phrases (X%)
- Awkward (2): X phrases (X%)
- Poor (1): X phrases (X%)
- Average: X.X/5

Spanish Quality:
- Perfect (5): X phrases (X%)
- Good (4): X phrases (X%)
- Acceptable (3): X phrases (X%)
- Awkward (2): X phrases (X%)
- Poor (1): X phrases (X%)
- Average: X.X/5
```

### Quality Thresholds:

**EXCELLENT (≥4.5 avg)**: Production-ready, minimal fixes needed
**GOOD (4.0-4.49 avg)**: Usable with minor refinements
**ACCEPTABLE (3.5-3.99 avg)**: Needs systematic improvements but salvageable
**NEEDS WORK (<3.5 avg)**: Requires significant rework

---

## 🎯 Decision Framework

### If Overall Quality ≥4.0:
**Decision**: ✅ **PROCEED with v4.0 for all remaining work**

**Action**:
- Use v4.0 for Batch 1 missing agents (S0121-S0180)
- Accept Batch 2 outputs with light manual QA pass
- Note common issues for future prompt improvements

### If Overall Quality 3.5-3.99:
**Decision**: ⚠️ **PROCEED with CAUTION**

**Action**:
- Complete Batch 2 with v4.0
- Plan systematic fixes for identified patterns
- Create v4.1 with naturalness improvements
- Manual QA pass required before production

### If Overall Quality <3.5:
**Decision**: ❌ **ITERATE to v4.1 before proceeding**

**Action**:
- Identify systematic issues in v4.0 prompt
- Create v4.1 with specific naturalness guidance
- Re-run Agent 05 as test with v4.1
- Don't proceed with full Batch 2 until validated

---

## 📝 Request for Agent 05 File

**To perform this review, we need**:

```
File: phase5_batch2_s0301_s0500/batch_output/agent_05_baskets.json
Size: ~82KB
Seeds: S0381-S0400
LEGOs: 92
```

**When file available, we'll**:
1. Select 10 representative LEGOs (random sampling)
2. Review all 100 phrases across those LEGOs
3. Score each phrase for English + Spanish quality
4. Calculate aggregate quality metrics
5. Make go/no-go decision for v4.0 prompt

---

## 🤔 Hypothesis

**Agent's Note**: "Some phrases may need manual refinement for naturalness"

**Possible Interpretations**:

### Optimistic (Most Likely):
- Agent is being conservative/self-critical
- Quality is actually 4.0+ but agent isn't confident
- Minor polish needed, not systematic issues
- **Expected**: Most phrases 4-5/5, few 3/5, rare 2/5

### Realistic:
- Some phrases are functional but stiff
- Grammatically correct but not flowing naturally
- Pattern: Later phrases better than early phrases
- **Expected**: Mix of 3-5/5, average ~3.8/5

### Pessimistic (Unlikely):
- Significant naturalness issues throughout
- Many phrases sound translated/forced
- v4.0 prompt needs naturalness improvements
- **Expected**: Many 2-3/5, average <3.5/5

---

## 🚦 Next Steps

1. **Get agent_05_baskets.json file**
   - Download from Claude Code Web session
   - Copy to local for review

2. **Run sampling script**
   - Random select 10 LEGOs
   - Extract all phrases for review

3. **Manual quality review** (30-45 minutes)
   - Score each phrase
   - Document issues
   - Calculate averages

4. **Make decision**
   - Quality threshold met?
   - Proceed or iterate?
   - Document findings

5. **Update recommendations**
   - Go/no-go for v4.0
   - Batch 1 completion strategy
   - v4.1 improvements if needed

---

**Status**: 🟡 Awaiting agent_05_baskets.json file for manual review
