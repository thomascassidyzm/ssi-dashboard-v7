# LEGO Tiling Coverage - Visual Summary

**Analysis Date:** 2026-02-02

---

## Overall Success Rate

```
███████████████████████████████████████████████████████████████████████████████████████████████████ 97.9%
                                                                                                    ██ 2.1%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                                      1,330 Fully Tiled        29 With Gaps
```

---

## Per-Course Tiling Success

### French (fra_for_eng)
```
████████████████████████████████████████████████████████████████████████████████████ 100.0% ✅ PERFECT
275/275 seeds fully tileable
```

### Japanese (jpn_for_eng)
```
███████████████████████████████████████████████████████████████████████████████████  99.2% ✅ MINOR
258/260 seeds fully tileable | 2 gaps (particles only)
```

### Spanish (spa_for_eng)
```
███████████████████████████████████████████████████████████████████████████████████  99.3% ⚠️ SEVERE
302/304 seeds fully tileable | 2 gaps (accent marks)
```

### German (deu_for_eng)
```
██████████████████████████████████████████████████████████████████████████████████   97.3% ⚠️ SEVERE
253/260 seeds fully tileable | 7 gaps (umlauts + vocabulary)
```

### Chinese (zho_for_eng)
```
████████████████████████████████████████████████████████████████████████████████     93.1% ✅ MINOR
242/260 seeds fully tileable | 18 gaps (mostly punctuation)
```

---

## Gap Analysis by Type

```
┌─────────────────────────────────────────────────────────────────┐
│                    GAP TYPES (29 Total)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  MINOR ISSUES (65.5% of gaps)                                   │
│  ─────────────────────────────                                  │
│  ████████████████████ 17  Punctuation only (Chinese commas)     │
│  ██ 2                 Particles only (Japanese grammar)         │
│                                                                  │
│  SEVERE ISSUES (34.5% of gaps)                                  │
│  ──────────────────────────────                                 │
│  ████████ 9           Content words (vocabulary missing)        │
│  █ 1                  Mixed particles + content                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Issue Breakdown by Course

### 🟢 NO ISSUES
- **French:** 0 gaps (perfect!)

### 🟡 MINOR ISSUES (punctuation/particles)
- **Chinese:** 17 punctuation gaps (commas)
- **Japanese:** 2 particle gaps (で, が)

### 🔴 SEVERE ISSUES (vocabulary/encoding)
- **German:** 6 umlaut encoding issues + 1 vocabulary mismatch
- **Spanish:** 2 accent mark encoding issues
- **Chinese:** 1 critical data issue (seed 38 missing LEGOs)

---

## Priority Actions

### 🚨 CRITICAL (Affects Learning)
```
┌──────────────────────────────────────────────────────────────────┐
│ ISSUE:    Chinese Seed 38 - Missing LEGOs                        │
│ IMPACT:   Seed cannot be constructed at all                      │
│ AFFECTED: 1 seed                                                 │
│ ACTION:   Add missing LEGOs for "I've been learning for about"  │
└──────────────────────────────────────────────────────────────────┘
```

### ⚠️ HIGH (Character Encoding)
```
┌──────────────────────────────────────────────────────────────────┐
│ ISSUE:    German umlauts stripped from LEGOs                     │
│ IMPACT:   Words appear as missing (nützlich → nutzlich)          │
│ AFFECTED: 6 seeds (28, 29, 39, 40, and 2 others)                │
│ ACTION:   Restore ü, ö, ä characters in German LEGO data        │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ ISSUE:    Spanish accents stripped from LEGOs                    │
│ IMPACT:   Words appear as missing (sí → si, qué → que)          │
│ AFFECTED: 2 seeds (268, 269)                                     │
│ ACTION:   Restore í, é, á characters in Spanish LEGO data       │
└──────────────────────────────────────────────────────────────────┘
```

### 📋 MEDIUM (Vocabulary)
```
┌──────────────────────────────────────────────────────────────────┐
│ ISSUE:    German Seed 7 - LEGO doesn't match requirement         │
│ IMPACT:   LEGO has "gut" but seed needs "hart" + "wie"          │
│ AFFECTED: 1 seed                                                 │
│ ACTION:   Review LEGO decomposition for seed 7                  │
└──────────────────────────────────────────────────────────────────┘
```

### 🔵 LOW (Cosmetic)
```
┌──────────────────────────────────────────────────────────────────┐
│ ISSUE:    Chinese punctuation not in LEGOs                       │
│ IMPACT:   Commas (，) appear as gaps                             │
│ AFFECTED: 17 seeds                                                │
│ ACTION:   Optional - decide punctuation policy                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Quality Assessment

### ✅ STRENGTHS
- **Excellent overall coverage:** 97.9% success rate
- **French course is perfect:** 100% tiling success
- **CJK courses are strong:** 93-99% success (gaps are mostly minor)
- **Most gaps are cosmetic:** 65.5% are punctuation/particles

### ⚠️ AREAS FOR IMPROVEMENT
- **Character encoding:** German and Spanish need accent/umlaut fixes
- **Data completeness:** One seed missing LEGOs (Chinese seed 38)
- **Vocabulary matching:** One German seed has LEGO mismatch

### 🎯 OVERALL GRADE: **A-** (Excellent with minor fixes needed)

---

## Technical Notes

### Character-Level vs Word-Level Tiling

**CJK (Chinese, Japanese):**
- Tiling works at **character level**
- Seed: 我想说中文
- LEGOs: 我想 + 说 + 中文
- Each character must appear in at least one LEGO

**European (German, French, Spanish):**
- Tiling works at **word level**
- Seed: Ich will heute versuchen
- LEGOs: ich will + heute + versuchen
- Each word must appear in at least one LEGO
- Case-insensitive matching

### Normalization Applied
- Punctuation removed before comparison
- Extra spaces stripped
- Case-insensitive for European languages
- Character-by-character for CJK

---

## Conclusion

The SSi LEGO tiling system is **working well** with a 97.9% success rate. Most issues are **minor** (punctuation, particles) or **fixable** (character encoding). With the recommended fixes, the system could reach **>99% coverage**.

**Key Takeaway:** The tiling validation rule is **effective** - seeds can be reconstructed from LEGOs in the vast majority of cases. The few exceptions are identifiable and addressable.

---

**Report Generated By:** Claude Sonnet 4.5 (Linguistic Quality Analyst)
**Analysis Tool:** `/scripts/analyze-tiling-coverage.py`
**Data Source:** Supabase (tables: `course_seeds`, `course_legos`)
