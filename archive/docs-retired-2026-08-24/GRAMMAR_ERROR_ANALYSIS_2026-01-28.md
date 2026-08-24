# Grammar Error Analysis: eng_for_por Course

**Date:** 2026-01-28
**Course:** eng_for_por (English for Portuguese speakers)
**Checkpoint:** 2 (Seed 50)
**Auditor:** QA Agent (Claude Opus 4.5)

---

## Executive Summary

**56 grammar errors found in 915 USE phrases (6.1% error rate)**

This is unacceptable for a language learning course. English learners will memorize incorrect grammar if we ship these phrases. The errors must be fixed and prevention systems must be implemented.

---

## Root Cause Analysis

### Why This Happened

1. **No Automated English Grammar Validation**
   - Course-builder API validates: phrase count, syllable complexity, vocabulary gate, score range
   - Course-builder API does NOT validate: English grammar correctness
   - System trusts LLM to produce correct English and self-score honestly

2. **Portuguese→English Literal Translation**
   - Portuguese allows constructions that English forbids
   - Agent translated literally without applying English grammar rules
   - Example: Portuguese "assim que eu puder" (whenever I can - subjunctive) → English "as soon as I can" is valid with present tense main verb, but NOT with past tense

3. **Systematic Over-Scoring**
   - Agent scored phrases 7-8 that should be 0 (grammar error)
   - Agent's self-assessment was not calibrated for grammar checking
   - QA checkpoint revealed 46% of phrases were over-scored

4. **Tense/Aspect Mismatches Undetected**
   - English has strict rules about tense consistency that Portuguese doesn't
   - Present perfect continuous cannot take specific past time markers
   - Past tense verbs require past modals in dependent clauses

---

## Error Categories

### Category 1: PAST_TENSE_WITH_PRESENT_MODAL (13 instances)

**The Rule:** When the main verb is past tense, dependent modals should also be past.

| Wrong | Correct |
|-------|---------|
| "I wanted to go as soon as I **can**" | "I wanted to go as soon as I **could**" |
| "I started to learn as soon as I **can**" | "I started to learn as soon as I **could**" |

**Seeds affected:** 30, 31, 34, 35, 36, 37

**Why it happened:** Portuguese "assim que eu puder" uses subjunctive which doesn't change with tense. English modal must agree with main clause tense.

---

### Category 2: PAST_CONTINUOUS_WITH_PRESENT (5 instances)

**The Rule:** Past continuous cannot be mixed with present tense markers.

| Wrong | Correct |
|-------|---------|
| "I was starting to feel better **at the moment**" | "I'm starting to feel better at the moment" |
| "I was learning **when I'm speaking**" | "I was learning when I was speaking" |

**Seeds affected:** 42

---

### Category 3: GARBLED_CONSTRUCTION (4 instances)

**The Rule:** Sentences must be semantically complete and coherent.

| Wrong | Notes |
|-------|-------|
| "I want to find out what is all day with everyone else" | Incomplete - missing object |
| "He wants to find out what is and what you mean" | Garbled - "what is" incomplete |

**Seeds affected:** 17

**Why it happened:** Portuguese source had "qual é" (what is) which needs an object in English.

---

### Category 4: STARTING_WITH_DURATION (4 instances)

**The Rule:** "Starting" is an inchoative verb that cannot take duration.

| Wrong | Correct |
|-------|---------|
| "I'm starting to learn **for about a week**" | "I've been learning for about a week" |

**Seeds affected:** 41, 42

---

### Category 5: PRESENT_CONTINUOUS_WITH_DURATION (2 instances)

**The Rule:** Duration + "for" requires present perfect continuous in English.

| Wrong | Correct |
|-------|---------|
| "I'm learning English **for about a week**" | "I've been learning English for about a week" |

**Seeds affected:** 39

**Why it happened:** Portuguese uses present continuous with duration markers.

---

### Category 6: PRONOUN_MISMATCH (3 instances)

**The Rule:** Pronouns must agree across clauses.

| Wrong | Correct |
|-------|---------|
| "**He** doesn't want to learn as soon as **I** can" | "He doesn't want to learn as soon as he can" |

**Seeds affected:** 34, 35, 36

---

### Category 7: PRESENT_PERFECT_WITH_PAST_TIME (1 instance)

**The Rule:** Present perfect cannot take specific past time markers.

| Wrong | Correct |
|-------|---------|
| "I've been learning carefully **last month**" | "I was learning carefully last month" |

**Seeds affected:** 38

---

### Category 8: SEMANTIC_ODDITIES (Various)

| Wrong | Issue |
|-------|-------|
| "I don't like taking you to speak English" | Semantically odd - you don't "take someone to speak" |
| "But I'm a little tired easily" | "Tired easily" doesn't make sense |
| "I feel okay better than last night" | Grammar error - "okay" and "better" clash |
| "It's like this easily, if you know what I mean" | Adverb placement error |

---

## Full Error Inventory

| Seed | Error Count | Error Types |
|------|-------------|-------------|
| 13 | 2 | WHAT_YOU_SPEAK |
| 17 | 4 | GARBLED_CONSTRUCTION |
| 27 | 3 | SEMANTIC_TAKING |
| 30 | 5 | PAST_TENSE_WITH_PRESENT_MODAL |
| 31 | 6 | PAST_TENSE_WITH_PRESENT_MODAL, SELF_REFERENCE |
| 33 | 1 | LEARN_THE_ANSWER |
| 34 | 2 | PRONOUN_MISMATCH, PAST_TENSE |
| 35 | 2 | PRONOUN_MISMATCH, PAST_TENSE |
| 36 | 3 | PRONOUN_MISMATCH, PAST_TENSE |
| 37 | 4 | PAST_TENSE, DOUBLE_OBJECT, INTERRUPT_CAREFULLY |
| 38 | 3 | PRESENT_PERFECT, STARTED_FOR_DURATION |
| 39 | 4 | PRESENT_CONTINUOUS, TIRED_EASILY |
| 41 | 3 | STARTING_WITH_DURATION, TIRED_EASILY |
| 42 | 10 | PAST_CONTINUOUS, STARTING_WITH_DURATION, FEEL_OKAY |
| 47 | 1 | PRESENT_TENSE_WITH_PAST_TIME |
| 49 | 2 | ADVERB_PLACEMENT |

**Total: 56 errors across 16 seeds (32% of seeds have errors)**

---

## Impact Assessment

### If Shipped As-Is

1. **Learner Confusion:** Portuguese speakers will memorize incorrect English grammar
2. **Credibility Damage:** Course quality questioned by advanced learners
3. **Reinforcement of Errors:** Spaced repetition will cement wrong patterns
4. **Difficult to Fix Later:** Once audio is generated, corrections require re-recording

### Severity Scale

- **Critical (must fix before any production use):** 39 phrases
- **High (fix before audio generation):** 17 phrases

---

## Recommended Solutions

### Immediate: Fix Existing Errors

1. **Database Correction Script** - Update 56 phrases with corrected English
2. **Re-score** - All corrected phrases should be re-scored
3. **Re-run QA** - Verify no new errors introduced

### Short-term: Prevent Future Errors

1. **Grammar Validation Gate in Course Builder API**
   - Add regex-based checks for known error patterns
   - Reject phrases with score 0 and specific error message
   - Block submission until corrected

2. **Build Agent Training Update**
   - Add explicit warning about Portuguese→English tense mismatches
   - Include example error patterns with corrections
   - Emphasize: "English grammar must be PERFECT, not just 'understandable'"

3. **QA Checkpoint Hardening**
   - Grammar errors = automatic REJECT (no approval with known errors)
   - Add automated grammar pre-check before human QA

### Long-term: Systemic Prevention

1. **LLM Grammar Validation Layer**
   - Before storing any phrase, run through grammar checker
   - Use Claude to verify each English phrase is grammatically correct
   - Cost: ~$0.01 per phrase, worthwhile for quality assurance

2. **Language-Specific Translation Rules**
   - Document common L1→English errors for each source language
   - Feed these rules to build agent as explicit constraints

3. **Dual-LLM Verification**
   - Build agent generates phrase
   - Second LLM (or same LLM with different prompt) validates grammar
   - Only store if both agree

---

## Action Items

### Priority 1: Fix eng_for_por (This Session)

- [ ] Generate correction script with all 56 fixed phrases
- [ ] Execute database updates
- [ ] Re-run grammar audit to verify 0 errors
- [ ] Complete QA checkpoint 2 approval

### Priority 2: Update Course Builder (This Week)

- [ ] Add grammar validation regexes to course-builder-api.cjs
- [ ] Update /api/seed/complete to reject known error patterns
- [ ] Add error message: "English grammar error detected: [specific pattern]"

### Priority 3: Update Build Agent Prompts (This Week)

- [ ] Add Portuguese→English error warnings to spawn-course-builder.cjs
- [ ] Add to /api/resume response: list of common tense errors to avoid
- [ ] Update scoring guidance: "Score 0 for ANY grammar error, no exceptions"

### Priority 4: Documentation (This Week)

- [ ] Create "Common L1 Interference Errors" guide for each language pair
- [ ] Add to QA skill: specific grammar checks per target language
- [ ] Update CLAUDE.md with grammar validation requirements

---

## Files Generated

1. `scripts/grammar-audit-eng-for-por.cjs` - Basic audit script
2. `scripts/grammar-audit-expanded.cjs` - Comprehensive audit
3. `docs/GRAMMAR_ERROR_ANALYSIS_2026-01-28.md` - This document

---

## Conclusion

**This checkpoint CANNOT be approved until all 56 grammar errors are corrected.**

The 6.1% error rate is too high for a language learning product. We need both immediate fixes and systemic prevention to ensure this doesn't happen again.

The good news: the errors are systematic and fixable. Most fall into a few categories (tense agreement, duration markers) that can be addressed with targeted corrections and prevention rules.

---

*Report generated by QA Agent*
*Course: eng_for_por | Checkpoint: 2 | Seeds: 1-50*
