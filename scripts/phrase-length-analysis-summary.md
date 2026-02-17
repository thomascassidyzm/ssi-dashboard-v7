# Phrase Length Analysis - All Courses (260+ Seeds)

**Analysis Date:** 2026-02-02
**Total Courses Analyzed:** 21

## Summary by Course Type

### European Languages (Romance, Germanic, Celtic)

| Course | Build Avg | Use Avg | Ratio | Medium % | Status |
|--------|-----------|---------|-------|----------|--------|
| **OLD GENERATION (USE only)** |
| spa_for_eng | - | 49.8 | - | **1.8%** | ⚠️ CRITICAL |
| fra_for_eng | - | 60.3 | - | **0.7%** | ⚠️ CRITICAL |
| por_for_eng | - | 53.0 | - | **2.0%** | ⚠️ CRITICAL |
| ita_for_eng | - | 45.0 | - | **5.6%** | ⚠️ LOW |
| cym_s_for_eng | - | 39.7 | - | **14.4%** | ⚠️ LOW |
| cym_n_for_eng | - | 39.4 | - | **14.3%** | ⚠️ LOW |
| **NEW GENERATION (BUILD + USE)** |
| nld_for_eng | 10.5 | 49.7 | 4.7x | **16.3%** | ⚠️ LOW |
| eng_for_spa | 13.1 | 43.9 | 3.4x | **24.1%** | 🟡 FAIR |
| bre_for_fra | 17.0 | 49.2 | 2.9x | **18.3%** | ⚠️ LOW |
| gle_for_eng | 16.0 | 51.9 | 3.2x | **25.2%** | 🟡 FAIR |
| eng_for_fra | 14.8 | 45.7 | 3.1x | **25.5%** | 🟡 FAIR |
| eng_for_por | 15.7 | 53.6 | 3.4x | **16.3%** | ⚠️ LOW |
| deu_for_eng | 15.6 | 45.3 | 2.9x | **21.6%** | 🟡 FAIR |
| eng_for_deu | 13.4 | 48.2 | 3.6x | **23.6%** | 🟡 FAIR |

### Asian Languages (CJK, Korean, Japanese, Arabic)

| Course | Build Avg | Use Avg | Ratio | Medium % | Status |
|--------|-----------|---------|-------|----------|--------|
| **zho_for_eng** | 2.6 | 14.6 | 5.6x | **58.0%** | ✅ EXCELLENT |
| **jpn_for_eng** | 7.1 | 14.0 | 2.0x | **52.6%** | ✅ EXCELLENT |
| **kor_for_eng** | 5.6 | 21.9 | 3.9x | **47.1%** | ✅ GOOD |
| eng_for_ara | 15.9 | 49.0 | 3.1x | **24.4%** | 🟡 FAIR |
| eng_for_zho | 15.6 | 48.5 | 3.1x | **24.3%** | 🟡 FAIR |
| eng_for_jpn | 14.1 | 49.4 | 3.5x | **23.4%** | 🟡 FAIR |
| ara_for_eng | 11.3 | 46.5 | 4.1x | **18.4%** | ⚠️ LOW |

## Key Findings

### 🎯 The "Missing Middle" Problem

**CONFIRMED ACROSS ALL EUROPEAN LANGUAGE COURSES**

European language courses show a dramatic gap between BUILD and USE phrase lengths:
- BUILD phrases: 10-17 characters average
- USE phrases: 40-60 characters average
- Medium-length phrases (11-25 chars): Only 16-25% of total

**Old generation courses (USE only) are WORSE:**
- fra_for_eng: Only **0.7%** medium phrases! (87.7% very long)
- spa_for_eng: Only **1.8%** medium phrases! (75.2% very long)
- por_for_eng: Only **2.0%** medium phrases! (78% very long)

### ✅ Asian Languages Are Different!

**Asian language courses have MUCH better medium-phrase coverage:**

1. **zho_for_eng (Chinese)**: 58% medium phrases
   - BUILD avg: 2.6 chars | USE avg: 14.6 chars
   - Almost entirely medium-length USE phrases (96.6%)

2. **jpn_for_eng (Japanese)**: 52.6% medium phrases
   - BUILD avg: 7.1 chars | USE avg: 14 chars
   - 71.9% of USE phrases are medium-length

3. **kor_for_eng (Korean)**: 47.1% medium phrases
   - BUILD avg: 5.6 chars | USE avg: 21.9 chars
   - 72.3% of USE phrases are medium-length

**Why the difference?**
- Character density: CJK languages pack more meaning into fewer characters
- Each character ≈ syllable ≈ meaningful unit
- A 15-character Chinese phrase ≈ 6-8 word English phrase in complexity
- Grammatical structure: More compact constructions

### 📊 The Ratio Problem

**European language USE phrases are 3-5x longer than BUILD phrases:**
- This creates a steep difficulty cliff
- Learners practice short 15-char phrases, then jump to 50-char sentences
- No smooth progression

**Best ratios (gentlest progression):**
- jpn_for_eng: 2.0x (7.1 → 14 chars)
- bre_for_fra: 2.9x (17 → 49.2 chars)
- deu_for_eng: 2.9x (15.6 → 45.3 chars)

**Steepest cliffs:**
- zho_for_eng: 5.6x (but stays in medium range!)
- nld_for_eng: 4.7x (10.5 → 49.7 chars)
- ara_for_eng: 4.1x (11.3 → 46.5 chars)

## Recommendations

### ⚠️ URGENT: Fix Old Generation Courses
**Priority 1:** fra_for_eng, spa_for_eng, por_for_eng
- These have critically low medium-phrase coverage (0.7%-2%)
- Need 500-1000 medium-length USE phrases added
- Target: 25-30% medium phrases minimum

### 🎯 European Language Pattern
**Target for European courses:**
- Increase medium-length USE phrases (25-40 chars)
- Aim for 30-40% medium phrase coverage
- Bridge the 15→50 char gap with 25-35 char phrases

**Examples of medium-length phrases needed:**
- "I want to speak with you" (28 chars in Spanish: "quiero hablar contigo")
- "Where do you want to go?" (24 chars in French: "où veux-tu aller?")
- "I'm trying to learn Italian" (30 chars)

### ✅ Asian Languages: Already Good!
- zho_for_eng, jpn_for_eng, kor_for_eng have excellent coverage
- Character density naturally creates medium-length phrases
- No urgent action needed

### 🔧 Course Builder Fix
**Add medium-phrase generation strategy:**
1. Detect when USE phrases are too long (>45 chars)
2. Generate 2-3 medium variants (20-35 chars)
3. Use simpler LEGO combinations
4. Target 30-40% medium coverage overall

## Character Length Buckets

**Defined as:**
- Short: 1-10 chars
- Medium: 11-25 chars
- Long: 26-40 chars
- Very Long: 41+ chars

**Note:** For Asian languages, these ranges capture more linguistic content per character than European languages.
