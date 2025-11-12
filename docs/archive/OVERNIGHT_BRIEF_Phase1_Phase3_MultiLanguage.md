# OVERNIGHT BRIEF - Phase 1 & Phase 3 Multi-Language Course Generation

**Date:** 15 October 2025
**Duration:** Overnight autonomous work
**Agent Type:** general-purpose
**Priority:** HIGH - Foundation work for entire system

---

## MISSION

Create **FROM SCRATCH** 4 complete 30-seed courses (Phase 1 + Phase 3):
1. **Italian for English speakers**
2. **Spanish for English speakers**
3. **French for English speakers**
4. **Mandarin Chinese for English speakers** (characters only, no pinyin)

Use the LATEST APML intelligence to generate high-quality SEED_PAIRS and LEGO decompositions.

**CRITICAL:** Learn patterns across languages, document edge cases, refine APML.

---

## INPUT FILES

**Primary APML Specification:**
- File: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/ssi-course-production.apml`
- Version: 7.5.0 (language-agnostic, includes all 10 Phase 3 refinements + CHUNK UP principle)

**Reference Documentation:**
- `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/docs/APML_Phase3_Updates_2025.md`
- `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/docs/APML_v7.5_Language_Agnostic_Update_Summary.md`

**Existing Test Course (for reference only):**
- `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/ita_for_eng_30seeds/LEGO_BREAKDOWNS_COMPLETE.json`

---

## PHASE 1 - SEED_PAIR GENERATION (All 4 Languages)

### Task
Generate 30 high-quality SEED_PAIRS for each language following APML Phase 1 specifications.

### Key Requirements

**1. Read APML Phase 1 Section** (lines ~350-800)
- Apply ALL 6 Pedagogical Heuristics
- Use FCFS (First Come First Served) principle
- Natural, conversational sentences
- High-frequency vocabulary
- Progressive difficulty

**2. Language-Specific Considerations**

**Italian:**
- Use tu (informal) consistently
- Natural conversational Italian
- Common verbs: volere, parlare, imparare, cercare, etc.

**Spanish:**
- Use tú (informal) consistently
- Natural conversational Spanish
- Common verbs: querer, hablar, aprender, intentar, etc.
- Watch ser/estar distinction (will matter for Phase 3 FD!)

**French:**
- Use tu (informal) consistently
- Natural conversational French
- Common verbs: vouloir, parler, apprendre, essayer, etc.
- Watch for contractions (je veux vs j'ai)

**Mandarin Chinese:**
- **Characters ONLY** (no pinyin in output)
- Use 你 (nǐ - informal you) consistently
- Natural conversational Mandarin
- Common verbs: 想 (xiǎng), 说 (shuō), 学 (xué), 试 (shì), etc.
- Include aspect markers appropriately (了, 在, 过)

**3. Progressive Difficulty Across 30 Seeds**
- Seeds 1-10: Present tense, simple constructions, "I want", "I'm trying"
- Seeds 11-20: Add modals, future, questions, negation
- Seeds 21-30: Complex constructions, conditionals, relative clauses

**4. Output Format**

Create for each language:
```
/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/{lang_code}_for_eng_30seeds/translations.json
```

Where `{lang_code}` = `ita`, `spa`, `fra`, `cmn`

Format:
```json
{
  "S0001": ["Target language sentence.", "English translation."],
  "S0002": ["Target language sentence.", "English translation."],
  ...
  "S0030": ["Target language sentence.", "English translation."]
}
```

---

## PHASE 3 - LEGO DECOMPOSITION (All 4 Languages)

### Task
Decompose all 30 seeds in each language into FD-compliant LEGO_PAIRS following updated APML Phase 3.

### Key Requirements

**1. Read APML Phase 3 Section** (lines ~800-1300)
- Apply ALL FD rules (FD_LOOP test, IRON RULE, TILING test)
- Use CHUNK UP principle when context needed
- Break into SMALLEST helpful FD chunks
- Create hierarchical LEGOs when building up
- Selective FEEDERS (FD + pedagogically helpful only)

**2. CRITICAL PRINCIPLES TO APPLY**

**A. FD_LOOP Test - Gender & Context Neutrality**
```
❌ "Vuole" / "He wants" (FD FAIL - "He wants" could be "Lui vuole" or "Vuole")
✅ "Vuole" / "Wants" (FD PASS - gender neutral)

❌ "parlare" / "speaking" (FD FAIL - context-dependent conjugation)
✅ "sta parlando" / "is speaking" (FD PASS - CHUNK UP to include context)
```

**B. IRON RULE - Prepositional Phrases**
```
✅ ALLOWED: "con te" / "with you" (complete phrase)
✅ ALLOWED: "en español" / "in Spanish" (complete phrase)
❌ FORBIDDEN: "con" / "with" (standalone preposition)
```

**C. Glue Words INSIDE Composites**
```
✅ "Sto cercando di ricordare" / "I'm trying to remember" (di inside)
❌ "Sto cercando di" / "I'm trying to" + "ricordare" / "remember" (di at edge)
```

**D. CHUNK UP Principle**
When FD fails due to missing context → don't just "apply context", CHUNK UP to create a larger FD unit.

**3. Language-Specific Edge Cases to Watch**

**Spanish:**
- ser vs estar (both "to be" but different contexts) → might need CHUNK UP
- "por" vs "para" (both "for" but different) → context matters
- Subjunctive mood → likely needs CHUNK UP

**French:**
- tu vs vous (both "you" but different formality) → we're using tu consistently
- Contractions (l', d', j') → keep as part of word
- Reflexive verbs (se laver) → se should stay with verb

**Mandarin:**
- Aspect markers (了, 在, 过) → should these be separate LEGOs or chunked?
- Measure words (个, 本, 张) → likely CHUNK UP with noun
- Topic-comment structure → different from SVO, watch FD carefully
- No verb conjugation → simpler in some ways, but context markers critical

**4. Output Format**

Create for each language:
```
/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/{lang_code}_for_eng_30seeds/LEGO_BREAKDOWNS_COMPLETE.json
```

Format: (see APML lines 1069-1099 for exact structure)

```json
{
  "phase": "LEGO_BREAKDOWNS",
  "target_language": "Spanish",
  "known_language": "English",
  "lego_breakdowns": [
    {
      "seed_id": "S0001",
      "original_target": "...",
      "original_known": "...",
      "lego_pairs": [
        {
          "lego_id": "S0001L01",
          "target_chunk": "...",
          "known_chunk": "...",
          "fd_validated": true
        }
      ],
      "feeder_pairs": [
        {
          "feeder_id": "S0001F01",
          "target_chunk": "...",
          "known_chunk": "..."
        }
      ],
      "componentization": [
        {
          "lego_id": "S0001L02",
          "explanation": "known = target, where component1 = component1 and component2 = component2"
        }
      ]
    }
  ]
}
```

---

## CROSS-LANGUAGE PATTERN DISCOVERY

### Critical Task
**Document patterns and edge cases discovered across all 4 languages.**

### What to Look For

**1. Universal Patterns**
- Which FD principles work identically across all languages?
- Are there universal composite structures? (modal + infinitive, progressive constructions, etc.)

**2. Language-Family Patterns**
- Romance languages (Italian, Spanish, French): shared patterns?
- How does Mandarin differ fundamentally?

**3. Edge Cases & Violations**
- When does FD break? Why?
- When is CHUNK UP needed? Create pattern library.
- When are FEEDERS helpful vs cluttering?

**4. APML Gaps**
- What rules are missing from current APML?
- What examples should be added?
- Any contradictions found?

### Output Document
```
/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/docs/Phase3_Cross_Language_Patterns.md
```

Include:
- Universal FD patterns (work for all languages)
- Language-family patterns (Romance vs Sino-Tibetan)
- Edge cases requiring CHUNK UP (with examples from each language)
- Recommendations for APML updates
- Pattern library for common structures

---

## APML UPDATE RECOMMENDATIONS

### Task
Based on cross-language work, recommend SPECIFIC updates to APML Phase 3 section.

### Output Document
```
/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/docs/APML_Phase3_Recommended_Updates.md
```

Include:
- New examples to add (from Spanish, French, Mandarin)
- Clarifications needed
- Missing edge case handling
- Better language-agnostic formulations

**Format each recommendation as:**
```
### Recommendation #N: [Title]

**Current APML:** [quote or describe current state]

**Issue:** [what's missing or unclear]

**Proposed Update:** [exact text to add/change]

**Evidence:** [examples from Italian/Spanish/French/Mandarin showing why needed]
```

---

## SUCCESS CRITERIA

### Phase 1 (Seed Generation)
- ✅ 30 seeds per language (120 total)
- ✅ All seeds natural and conversational
- ✅ Progressive difficulty
- ✅ High-frequency vocabulary
- ✅ All 6 pedagogical heuristics applied

### Phase 3 (LEGO Decomposition)
- ✅ All LEGOs FD-validated (FD_LOOP passes)
- ✅ IRON RULE compliant (prepositional phrase clarification)
- ✅ Glue words contained INSIDE composites
- ✅ CHUNK UP applied where context needed
- ✅ Selective FEEDERS (helpful only)
- ✅ Proper componentization with "means" vs "represents"

### Cross-Language Analysis
- ✅ Pattern document created with 10+ universal patterns
- ✅ Edge cases documented with examples from all 4 languages
- ✅ CHUNK UP pattern library (when to apply, examples per language)

### APML Updates
- ✅ Minimum 5 concrete update recommendations
- ✅ Each with examples from multiple languages
- ✅ Ready to apply directly to APML

---

## EXECUTION STRATEGY

**Recommended Order:**

1. **Phase 1 - All 4 languages** (Generate all seeds first)
   - Italian 30 seeds
   - Spanish 30 seeds
   - French 30 seeds
   - Mandarin 30 seeds

2. **Phase 3 - Language by language** (Deep work, learn as you go)
   - Italian decomposition → document patterns
   - Spanish decomposition → compare to Italian, document new patterns
   - French decomposition → compare to Italian/Spanish, document Romance patterns
   - Mandarin decomposition → document how Sino-Tibetan differs, major insights

3. **Analysis & Documentation**
   - Cross-language pattern document
   - APML update recommendations

---

## QUALITY CHECKPOINTS

After each language's Phase 3:
1. Verify: Can you reconstruct every seed by concatenating LEGOs? (tiling test)
2. Verify: Every LEGO passes FD_LOOP independently
3. Verify: No standalone prepositions
4. Verify: All glue words inside composites
5. Count: How many times did you use CHUNK UP? Why?

---

## OUTPUT FILE STRUCTURE

```
/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/vfs/courses/
├── ita_for_eng_30seeds/
│   ├── translations.json
│   └── LEGO_BREAKDOWNS_COMPLETE.json
├── spa_for_eng_30seeds/
│   ├── translations.json
│   └── LEGO_BREAKDOWNS_COMPLETE.json
├── fra_for_eng_30seeds/
│   ├── translations.json
│   └── LEGO_BREAKDOWNS_COMPLETE.json
└── cmn_for_eng_30seeds/
    ├── translations.json
    └── LEGO_BREAKDOWNS_COMPLETE.json

/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/docs/
├── Phase3_Cross_Language_Patterns.md
└── APML_Phase3_Recommended_Updates.md
```

---

## IMPORTANT NOTES

1. **Work autonomously** - make intelligent decisions following APML principles
2. **Document uncertainties** - if you're unsure about an edge case, document it in the pattern file
3. **Be consistent** - apply the same principles across all languages
4. **Learn progressively** - Italian is reference, Spanish/French refine Romance patterns, Mandarin tests universality
5. **Quality over speed** - better to have 4 excellent courses than 4 rushed ones

---

## FINAL DELIVERABLES

**By morning:**
1. ✅ 4 complete translation files (120 seeds total)
2. ✅ 4 complete LEGO breakdown files (~400-500 total LEGOs)
3. ✅ Cross-language pattern document
4. ✅ APML update recommendations document

**Expected completion time:** 6-8 hours of focused work

Good luck! This work will transform the entire SSi system. 🚀
