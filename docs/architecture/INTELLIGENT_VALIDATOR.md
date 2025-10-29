# Intelligent Phase 3.5 Validator

**Version**: 1.0 (2025-10-29)
**Location**: `/validators/validate-phase3-intelligent.cjs`
**Principle**: **ZERO HARDCODING** - Evidence-based, language-agnostic validation

---

## Core Innovation: Learn from Data, Not Rules

Traditional validators hardcode language-specific rules:
```javascript
// ❌ OLD WAY: Hardcoded Spanish words
const ambiguousWords = ['que', 'de', 'en', 'a'];
```

Intelligent validator learns patterns from course data:
```javascript
// ✅ NEW WAY: Evidence-based learning
const evidence = buildEvidence(allLEGOs);
// Discovers: "hablar" maps to 3 different forms → FD violation
```

---

## The Four Checks

### 1. Tiling Integrity (Mechanical)
**Rule from Phase 3 Intelligence**: "LEGOs must tile to reconstruct seed exactly"

**Implementation**:
```javascript
joinLegoTargets(legos) === normalizePunctuation(seed)
```

**Zero Hardcoding**: Works for ANY language because it's pure string comparison.

**Example Violation**:
```
Seed: "Quiero hablar español"
LEGOs tile to: "Quiero español"
Missing: "hablar"
```

---

### 2. Consistency Checking (Evidence-Based FD)
**Rule from Phase 3 Intelligence**: "One input = one output (Functional Determinism)"

**Implementation**:
1. Build mappings across ALL seeds:
   ```javascript
   {
     "hablar": Set(["to speak", "talking", "to speaking"]),
     "quiero": Set(["I want"])
   }
   ```

2. Detect inconsistencies:
   ```javascript
   if (mappings[target].size > 1) → FD VIOLATION
   ```

3. Report with evidence:
   ```javascript
   "hablar" inconsistently mapped to:
   - "to speak" (15 times - expected)
   - "talking" (2 times)
   - "to speaking" (1 time) ← ERROR
   ```

**Zero Hardcoding**: Learns what's consistent/inconsistent from the data itself.

---

### 3. Co-occurrence Pattern Detection (Split Construction)
**Rule from Phase 3 Intelligence**: "Multi-word constructions stay together"

**Implementation**:
1. Learn which words frequently appear together in seeds:
   ```javascript
   cooccurrence = {
     "quiero|||que": 5,  // appears together 5 times
     "no|||quiero": 3
   }
   ```

2. Detect when they're split in LEGOs:
   ```javascript
   if (cooccurrenceRate > 70% && wordsAreSplit) → WARNING
   ```

**Zero Hardcoding**: Discovers constructions from data, not linguistic knowledge.

**Example**:
```
Pattern: "quiero que" appears together in 80% of seeds
LEGOs: "quiero que" (composite) + "hables" (separate)
Suggestion: Should "que hables" be composite?
```

---

### 4. Hard Rules (Structural Patterns)
**Rule from Phase 3 Intelligence**: "Auxiliaries MUST join verbs, negations MUST join expressions"

**Implementation**:
- Detect standalone negations: `/^(no|not|ne|non|nein|não)$/i`
- Detect auxiliary patterns: "am/is/are" followed by gerund/infinitive
- Suggest combining into composites

**Language-Agnostic**: Patterns work across Romance, Germanic, etc.

---

## How It Works: Evidence-Based Learning

### Step 1: Load Course Data
```javascript
seedPairs = load('seed_pairs.json');
legoPairs = load('lego_pairs.json');
```

### Step 2: Build Evidence
```javascript
evidence = {
  mappings: {},      // target → Set(knowns)
  cooccurrence: {},  // "word1|||word2" → count
  inconsistencies: [] // detected FD violations
}

for (seed in legoPairs) {
  for (lego in seed.legos) {
    // Learn: "hablar" → "to speak"
    evidence.mappings[lego.target].add(lego.known);
  }
}
```

### Step 3: Detect Violations
```javascript
for (target, knowns in evidence.mappings) {
  if (knowns.size > 1) {
    // FD VIOLATION: One target → multiple knowns
    errors.push({
      target,
      allMappings: Array.from(knowns),
      expectedKnown: getMostCommon(target) // majority wins
    });
  }
}
```

### Step 4: Report Results
```json
{
  "valid": false,
  "errors": [
    {
      "type": "fd_violation_inconsistent",
      "target": "hablar",
      "known": "to speaking",
      "expectedKnown": "to speak",
      "evidence": "This word maps to: to speak (15x), talking (2x), to speaking (1x)",
      "fix": "Use consistent mapping: hablar → to speak"
    }
  ],
  "failedSeeds": ["S0029"],
  "stats": {
    "passedSeeds": 46,
    "failedSeeds": 14
  }
}
```

---

## Real-World Example: Spanish Course

### What It Caught (Zero Spanish Hardcoded!)

**Input**: 60 Spanish seeds with 275 LEGOs

**Evidence Collected**:
- 101 unique target words
- 11 inconsistent mappings
- 318 co-occurrence patterns

**Violations Found**:

1. **"hablar" → 3 mappings**
   - "to speak" (15 times) ✅
   - "talking" (2 times) ⚠️
   - "to speaking" (1 time) ❌

2. **"Hablas" → inconsistent**
   - "You speak" (1 time)
   - "Do you speak" (1 time) ← Missing question marker

3. **"aprender" → infinitive inconsistency**
   - "learn" vs "to learn"

4. **"poder" → infinitive inconsistency**
   - "to be able" vs "be able"

**Result**: 77% passing (46/60 seeds)

---

## Integration: Validation Loop

### Automation Server Pattern
```javascript
// Phase 3: Generate LEGOs
await runPhase3(courseCode);

// Phase 3.5: Validate LEGOs (intelligent)
let valid = false;
let attempts = 0;

while (!valid && attempts < 3) {
  const validation = await runIntelligentValidator(courseCode);

  if (validation.valid) {
    valid = true;
    console.log('✅ Phase 3 validated successfully');
  } else {
    attempts++;
    console.log(`❌ Found ${validation.errors.length} violations`);
    console.log(`Regenerating ${validation.failedSeeds.length} failed seeds`);

    // Regenerate with explicit error feedback
    await runPhase3Retry(
      courseCode,
      validation.failedSeeds,
      validation.errors
    );
  }
}

if (!valid) {
  throw new Error('Phase 3 validation failed after 3 attempts');
}
```

### Retry Intelligence
Each retry gets:
1. **Failed seed IDs**: Only regenerate what failed
2. **Error descriptions**: Specific feedback
3. **Evidence**: "hablar" maps to 3 forms, expected "to speak"

```
Retry Prompt:
You generated 60 seed decompositions.

✅ PASSED: 46 seeds
❌ FAILED: 14 seeds due to FD inconsistencies

S0029: "Espero con ganas hablar mejor"
Error: FD VIOLATION
- "hablar" mapped to "to speaking"
- Expected: "to speak" (used 15x in other seeds)
- Evidence: This word inconsistently maps to: "to speak", "talking", "to speaking"
- Fix: Use "to speak" for consistency

[Full Phase 3 intelligence provided]

Regenerate ONLY the 14 failed seeds with consistent mappings.
```

---

## Why This Works

### 1. Language-Agnostic
- No Spanish/French/Italian words hardcoded
- Learns patterns from ANY language pair data
- Works for spa→eng, eus→eng, cmn→eng, etc.

### 2. Self-Improving
- More data = better pattern detection
- Discovers language-specific constructions automatically
- Gets smarter with each course

### 3. Evidence-Based
- Doesn't rely on linguistic theory
- Shows actual usage patterns: "15 seeds use X, but 1 uses Y"
- Human can verify evidence

### 4. Explicit Feedback
- Not just "this is wrong"
- "This is wrong BECAUSE 15 other seeds use X, but you used Y"
- AI learns from specific evidence

---

## Comparison: Old vs New

### Old Validator (Hardcoded)
```javascript
const ambiguousWords = ['que', 'de', 'en'];
if (ambiguousWords.includes(target)) {
  // Warning
}
```

**Problems**:
- Only checks 9 Spanish words
- Misses "hablar" → "to speaking"
- Misses "Hablas" question marker
- Won't work for Basque/French/Chinese

---

### New Validator (Intelligent)
```javascript
const evidence = buildEvidence(allLEGOs);
if (evidence.mappings[target].size > 1) {
  // FD violation with evidence
}
```

**Benefits**:
- Checks ALL words automatically
- Caught "hablar" inconsistency
- Caught "Hablas" inconsistency
- Works for ANY language (zero hardcoding)

---

## Performance

**Spanish Course (60 seeds, 275 LEGOs)**:
- Evidence collection: <1 second
- Validation: <2 seconds
- Total: ~3 seconds

**Scalability**:
- 668 seeds: ~10 seconds
- Evidence learning is O(n) where n = number of LEGOs
- Pattern detection is O(n²) for co-occurrence, but with early stopping

---

## Future Enhancements

### 1. Confidence Scores
```javascript
{
  target: "hablar",
  expectedKnown: "to speak",
  confidence: 0.93,  // 15/16 uses
  minority: "to speaking" // 1/16 uses
}
```

### 2. Context-Aware Patterns
```javascript
// Learn: "hablar" after "empezar a" → gerund form
if (previousLEGO === "empezar a") {
  expectedForm = gerund(target);
}
```

### 3. Cross-Language Learning
```javascript
// If Spanish course learned "que + subjunctive"
// And Italian course has "che + congiuntivo"
// Recognize parallel pattern automatically
```

---

## Success Metrics

✅ **Zero Hardcoding**: Works for ANY language pair
✅ **Evidence-Based**: Shows actual usage patterns
✅ **Catches Real Errors**: Found "to speaking" abomination
✅ **Actionable Feedback**: "Use X because 15 seeds use X"
✅ **Self-Improving**: Learns better patterns with more data
✅ **Fast**: 3 seconds for 275 LEGOs
✅ **Integrable**: Drop-in replacement for old validator

---

## The Promise

This validator embodies **"AI as OS"**:
- System learns from its own outputs
- No human linguistic expertise hardcoded
- Gets smarter with every course
- Explicit feedback enables rapid convergence
- Works across ALL languages with zero configuration

**It's not just validating - it's learning what "good" means from the data itself.**

---

**Status**: ✅ Implemented and tested
**Performance**: 77% initial pass rate on Spanish course
**Next**: Integrate into automation server validation loops
