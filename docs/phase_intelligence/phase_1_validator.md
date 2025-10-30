# Phase 1 Validator Intelligence

**Version**: 1.1 (2025-10-30)
**Role**: Ensure vocabulary consistency across all 668 seeds
**Input**: 3 chunk files from orchestrators
**Output**: `seed_pairs.json` (final, validated)

---

## 🎯 YOUR TASK

You are the Phase 1 validator. All 3 orchestrators have completed their chunks (~223 seeds each). Your job is to:

1. Read all 3 chunk files (668 total seeds)
2. Detect vocabulary conflicts across chunks
3. Auto-fix conflicts using Phase 1 rules
4. Flag subjective conflicts (if any)
5. Output final validated seed_pairs.json

**You are the final quality gate before Phase 3.**

---

## 📋 WORKFLOW

### STEP 1: Read All 3 Chunks

Read from: `vfs/courses/{course_code}/orchestrator_batches/phase1/`

```
chunk_01.json (seeds S0001-S0223)
chunk_02.json (seeds S0224-S0446)
chunk_03.json (seeds S0447-S0668)
```

Each contains:
```json
{
  "translations": {
    "S0001": ["Quiero hablar español contigo ahora.", "I want to speak Spanish with you now."],
    ...
  }
}
```

### STEP 2: Build Vocabulary Consistency Map

Create a map of all English words → Spanish translations:

```javascript
vocabularyMap = {
  "often": {
    translations: ["frecuentemente", "a menudo", "seguido"],
    occurrences: [
      {seed: "S0003", chunk: 1, translation: "frecuentemente"},
      {seed: "S0150", chunk: 2, translation: "a menudo"},
      {seed: "S0300", chunk: 3, translation: "frecuentemente"}
    ]
  },
  "I want": {
    translations: ["quiero"],
    occurrences: [
      {seed: "S0001", chunk: 1, translation: "quiero"},
      {seed: "S0050", chunk: 1, translation: "quiero"}
    ]
  }
}
```

### STEP 3: Detect Conflicts

A conflict exists when:
- Same English word/phrase has **multiple Spanish translations**
- Example: "often" → ["frecuentemente", "a menudo"]

**Mark conflicts by seed range:**
- Seeds 1-100: **ZERO VARIATION** - conflicts are CRITICAL
- Seeds 101-300: Minimal variation acceptable
- Seeds 301-668: Some variation acceptable

### STEP 4: Auto-Fix Conflicts Using Rules

Apply Phase 1 rules **mechanically** to resolve conflicts:

#### Rule 1: First Word Wins
```
If "often" appears in seeds 3, 150, 300:
→ Use translation from seed 3 (earliest occurrence)
→ Fix seeds 150, 300 to match seed 3
```

#### Rule 2: Prefer Cognate
```
If conflict exists and one option is a cognate:
→ Choose cognate version
→ Fix all other occurrences

Example:
"often" → ["frecuentemente" (cognate), "a menudo" (no cognate)]
→ Auto-fix to "frecuentemente" everywhere
```

#### Rule 3: Zero Variation (Seeds 1-100)
```
If seeds 1-100 show ANY variation:
→ Enforce first translation
→ Fix all subsequent occurrences

Example:
Seed 10: "I want" → "quiero"
Seed 50: "I want" → "deseo" (variant)
→ Auto-fix seed 50 to "quiero"
```

### STEP 5: Apply Fixes

For each conflict resolution:
1. Document the fix in a log
2. Update the affected seeds
3. Track statistics

```json
{
  "fixes_applied": [
    {
      "english": "often",
      "conflict": ["frecuentemente", "a menudo"],
      "resolution": "frecuentemente",
      "reason": "Cognate preference + First Word Wins",
      "seeds_fixed": ["S0150", "S0300"],
      "auto_fixed": true
    }
  ]
}
```

### STEP 6: Flag Subjective Conflicts

Some conflicts can't be auto-fixed (requires human judgment):

**Flag if:**
- Multiple valid cognates exist
- Both translations are equally natural
- Context-dependent meaning (not clear which is correct)

```json
{
  "conflicts_flagged": [
    {
      "english": "beautiful",
      "translations": ["hermoso", "bello"],
      "reason": "Both are cognates and equally valid",
      "recommendation": "Choose based on target language frequency",
      "seeds": ["S0200", "S0450"]
    }
  ]
}
```

**For flagged conflicts:**
- Apply best guess (First Word Wins)
- Document in warnings
- Include in validation report

### STEP 7: Output Final seed_pairs.json

Merge all chunks into final format:

```json
{
  "version": "7.7.0",
  "course": "spa_for_eng",
  "target": "spa",
  "known": "eng",
  "generated": "2025-10-29T...",
  "total_seeds": 668,

  "translations": {
    "S0001": ["Quiero hablar español contigo ahora.", "I want to speak Spanish with you now."],
    "S0002": ["Estoy intentando aprender.", "I'm trying to learn."],
    ... all 668 seeds
  },

  "validation": {
    "total_conflicts": 15,
    "auto_fixed": 14,
    "flagged_for_review": 1,
    "fixes_applied": [...],
    "warnings": [...]
  }
}
```

Write to: `vfs/courses/{course_code}/seed_pairs.json`

### STEP 8: Report Validation Results

```
✅ Phase 1 Validation Complete

Total seeds: 668
Conflicts detected: 15
Auto-fixed: 14 (93.3%)
Flagged for review: 1 (6.7%)

Fixes applied:
  - "often" → "frecuentemente" (cognate preference)
  - "I'm learning" → "estoy aprendiendo" (First Word Wins)
  - "with you" → "contigo" (zero variation, seeds 1-100)

Warnings:
  - "beautiful" (S0200, S0450): Multiple valid cognates

Output: seed_pairs.json
Status: READY FOR PHASE 3
```

---

## 🚨 AUTO-FIX DECISION TREE

```
Conflict detected?
├─ YES → Check seed range
│   ├─ Seeds 1-100 (ZERO VARIATION)
│   │   └─ Apply: First Word Wins → AUTO-FIX
│   │
│   ├─ Seeds 101+ (variation acceptable)
│   │   ├─ One option is cognate?
│   │   │   └─ YES → Apply: Prefer Cognate → AUTO-FIX
│   │   │   └─ NO → Check First Word Wins
│   │   │       └─ Apply first translation → AUTO-FIX
│   │
│   └─ Multiple cognates?
│       └─ FLAG for review + apply First Word Wins as default
│
└─ NO → Pass through unchanged
```

---

## 📊 VALIDATION STATISTICS TO TRACK

```json
{
  "total_seeds": 668,
  "chunks_processed": 5,

  "conflicts": {
    "total": 15,
    "by_range": {
      "seeds_1_100": 8,    // CRITICAL (zero variation)
      "seeds_101_300": 5,   // Important
      "seeds_301_668": 2    // Minor
    }
  },

  "resolutions": {
    "first_word_wins": 10,
    "cognate_preference": 4,
    "manual_flag": 1
  },

  "fixes": {
    "auto_fixed": 14,
    "flagged": 1,
    "success_rate": "93.3%"
  }
}
```

---

## ✅ SUCCESS CRITERIA

- ✓ All 668 seeds validated
- ✓ >90% conflicts auto-fixed
- ✓ Zero variation enforced (seeds 1-100)
- ✓ Cognate preference applied
- ✓ Final seed_pairs.json generated
- ✓ Validation report complete

**Phase 1 is complete! Ready for Phase 3.**

---

## 💡 EFFICIENCY TIPS

**Fast conflict detection:**
- Build vocabulary map in one pass
- Group by English word
- Count unique translations per word

**Quick auto-fixes:**
- Apply rules mechanically (no thinking needed for most)
- First Word Wins = always use earliest seed's translation
- Cognate check = simple lookup

**Smart flagging:**
- Only flag if truly subjective
- Most conflicts have clear rule-based resolution
- Aim for >90% auto-fix rate

**Total validator time: ~5 minutes for 668 seeds**

---

## Version History

**v1.0 (2025-10-29)**:
- Initial validator intelligence
- Auto-fix using Phase 1 rules
- Mechanical conflict resolution
- 90%+ auto-fix target
