# S0011 Basket Validation Report & Fixes

**Generated**: 2025-11-05
**Validator**: v2.0 validation rules
**Course**: spa_for_eng_20seeds

---

## Executive Summary

**Results**:
- ✅ **S0011L01**: PASSES (0 errors, 3 warnings)
- ❌ **S0011L02**: FAILS (2 errors, 2 warnings)
- ❌ **S0011L03**: FAILS (5 errors, 1 warning)
- ❌ **S0011L04**: FAILS (1 error, 0 warnings)

**Total**: 8 errors, 6 warnings

---

## S0011L01: "Me gustaría" / "I'd like" ✅

### Status
**PASSES v2.0 validation** - Only has warnings about phrase length

### Available Vocabulary
44 LEGOs (S0001L01 through S0010L05)

### Issues
**Warnings (3)**:
- All 3 e-phrases are shorter than ideal (4-5 words vs 7-10 words)
  - "Me gustaría hablar español" (4 words)
  - "Me gustaría aprender algo ahora" (5 words)
  - "Me gustaría practicar contigo hoy" (5 words)

### Recommendation
✅ **No critical fixes needed** - Baskets can remain as-is since errors = 0.
💡 **Optional**: Could add longer e-phrases if more natural combinations exist.

---

## S0011L02: "poder" / "to be able" ❌

### Status
**FAILS v2.0 validation**

### Available Vocabulary
45 LEGOs (S0001L01 through S0011L01)

### Critical Errors (2)

#### Error 1: D-phrase missing basket LEGO
**Location**: d-phrase window 2, phrase 1
**Current**: `["Me gustaría", "I'd like"]`
**Problem**: Does not contain "poder"

**Fix**: Remove this phrase or replace with one containing "poder":
```json
"2": [
  ["poder hablar", "to be able to speak"]
]
```

#### Error 2: E-phrase poor tiling
**Location**: e-phrase 3
**Current**: `["Voy a poder explicar lo que quiero decir", "I'm going to be able to explain what I mean"]`
**Problem**: "quiero" doesn't tile properly (appears twice but only S0001L01 "Quiero" is available)

**Fix**: Replace with a phrase that tiles correctly:
```json
["Voy a poder hablar español contigo ahora", "I'm going to be able to speak Spanish with you now"]
```
Tiles: S0005L01 + S0011L02 + S0001L02 + S0001L03 + S0001L04 + S0001L05

### Warnings (2)
- 2 e-phrases are shorter than ideal (5 words vs 7-10 words)

---

## S0011L03: "después de que" / "after" ❌

### Status
**FAILS v2.0 validation**

### Available Vocabulary
47 LEGOs (S0001L01 through S0011L02)

### Critical Errors (5)

**Root Cause**: All errors involve **future vocabulary violation** - using verb conjugations that haven't been taught yet:
- "termines" (from S0011L04 - not yet taught)
- "hables" (not in vocabulary)
- "expliques" (not in vocabulary)

#### Error 1: E-phrase 1
**Current**: `["Me gustaría poder hablar después de que termines", ...]`
**Problem**: Uses "termines" which is S0011L04 (future LEGO)

**Fix**: Use only available vocabulary. Since "después de que" requires a verb that follows, and no subjunctive verbs are available yet, we need to rethink these phrases.

**Suggested replacement**:
```json
["Me gustaría poder hablar después de que Quiero aprender algo", "I'd like to be able to speak after I want to learn something"]
```
**Note**: This is awkward because S0011L03 "después de que" naturally requires subjunctive mood which isn't available yet.

**Better approach**: Use "después de que" in contexts that tile with available vocabulary:
```json
[
  "Quiero hablar español después de que Estoy intentando aprender",
  "I want to speak Spanish after I'm trying to learn"
]
```

#### Alternative Solution: Minimal Phrases
Since subjunctive forms aren't available, consider **minimal valid phrases**:
```json
"e": [
  ["Quiero aprender después de que Hablo español", "I want to learn after I speak Spanish"],
  ["Voy a poder hablar después de que Estoy intentando aprender", "I'm going to be able to speak after I'm trying to learn"],
  ["Me gustaría poder decir algo después de que Quiero hablar", "I'd like to be able to say something after I want to speak"]
]
```

#### Errors 2-5: Same issue
All other errors stem from the same future vocabulary problem.

### Recommendation
🔧 **Complete rewrite needed** - Cannot use subjunctive verb forms until they're taught.

---

## S0011L04: "termines" / "you finish" ❌

### Status
**FAILS v2.0 validation**

### Available Vocabulary
48 LEGOs (S0001L01 through S0011L03)

### Critical Errors (1)

#### Error 1: D-phrase poor tiling
**Location**: d-phrase window 2, phrase 1
**Current**: `["que termines", "you finish"]`
**Problem**: "que" doesn't tile as a standalone LEGO

**Fix**: Remove this phrase since "termines" alone isn't meaningful in Spanish, and "que termines" doesn't tile properly. Replace with:
```json
"2": [
  ["después de que termines", "after you finish"]
]
```
**Note**: This is actually a window-3 phrase, but it's the minimal meaningful unit containing "termines".

**Alternative**: Move to window 3 and remove from window 2:
```json
"2": [],  // Empty - minimal meaningful phrase requires 3 LEGOs
"3": [
  ["después de que termines", "after you finish"]
]
```

### Recommendation
✅ **Minor fix needed** - Just adjust the d-phrase windowing.

---

## Recommended Action Plan

### Phase 1: Quick Fixes (Low-hanging fruit)
1. **S0011L02**: Fix 2 errors
2. **S0011L04**: Fix 1 error

### Phase 2: Major Rewrite
3. **S0011L03**: Complete rewrite to avoid future vocabulary

### Phase 3: Enhancement (Optional)
4. **S0011L01**: Add longer e-phrases for better practice

---

## Next Steps

Run the validator again after implementing fixes:
```bash
node validate_s0011_baskets.cjs
```

Expected outcome after fixes: **All 4 baskets PASS v2.0 validation** ✅
