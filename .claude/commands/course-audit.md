# Course Audit Agent - "Destroyer of Worlds"

A ruthless quality auditor for SSi language courses. Finds every confusing, unclear, or wrong phrase pair.

## Mission

Analyze a course deeply and produce a comprehensive audit report identifying:
- **Critical Issues**: Phrases that will confuse learners or teach incorrect language
- **Methodology Violations**: Content that breaks SSi principles
- **Quality Concerns**: Areas that could be improved for better learning outcomes

## Audit Dimensions

### 1. VOCABULARY VIOLATIONS (Critical)

**Rule**: Phrases can ONLY use vocabulary introduced in previous seeds/LEGOs.

Check each practice phrase:
- Does it use any LEGO not yet introduced at this point in the course?
- Does it use vocabulary from future seeds?

```sql
-- Find phrases using future vocabulary
SELECT p.*, l.seed_number as lego_seed
FROM course_practice_phrases p
JOIN course_legos l ON l.course_code = p.course_code
  AND l.target_text LIKE '%' || [word] || '%'
WHERE l.seed_number > p.seed_number
```

**Severity**: CRITICAL - breaks the learning progression

### 2. TILING FAILURES (Critical)

**Rule**: Every seed must be FULLY TILEABLE from its LEGOs.

For each seed:
1. Get all LEGOs for that seed
2. Verify the target_text can be reconstructed from LEGO targets
3. Flag any untiled portions

**Severity**: CRITICAL - indicates missing LEGOs or structural issues

### 3. COMPONENT SINS (Critical)

**Rule**: M-LEGO components must be REAL WORDS, not grammatical explanations.

Check for bullshit components:
- "completed action marker"
- "past participle prefix"
- "first person conjugation"
- Any component where known_text explains grammar rather than translates

**Red flags in known_text**:
- Contains "marker", "particle", "tense", "conjugation", "suffix", "prefix"
- Is longer than 3 words (explanations tend to be verbose)
- Doesn't translate to a single word/phrase

**Severity**: CRITICAL - violates core "grammar is inferred" principle

### 4. PHRASE TIER FAILURES (High)

**Rule**: Seeds 21+ need: 2+ SHORT (3-5 syl), 2+ MEDIUM (6-9 syl), 3+ LONG (10+ syl)

For each LEGO basket:
1. Count phrases by syllable tier
2. Flag baskets not meeting minimums

```
Seed Range | SHORT | MEDIUM | LONG
1-5        | -     | -      | -
6-20       | 1+    | 1+     | 2+
21+        | 2+    | 2+     | 3+
```

**Severity**: HIGH - affects learning progression

### 5. BUILD-UP GAPS (Medium)

**Rule**: Phrases must progress smoothly from SHORT → LONG.

Check for:
- No phrases in the 5-10 syllable middle range
- Jumps of >5 syllables between consecutive phrases
- All phrases clustered at same length

**Severity**: MEDIUM - cognitive load issues

### 6. SEMANTIC ISSUES (Critical)

**These require LLM judgment. Flag phrases where:**

**Wrong translations**:
- Target doesn't mean what known says
- Translation is technically correct but misleading
- Important nuance lost (e.g., formal/informal register mismatch)

**Unnatural language**:
- Known or target sounds awkward to native speakers
- Word order that no native would use
- Literal translations that don't work

**Confusing pairs**:
- Known text is ambiguous (multiple interpretations)
- Target could be misunderstood
- Phrase would embarrass learner if used

**Check both directions**:
- Is the known text clear and unambiguous?
- Is the target text natural and correct?
- Would a learner understand the pairing?

**Severity**: CRITICAL for wrong, HIGH for unnatural, MEDIUM for confusing

### 7. PEDAGOGICAL ORDER (Medium)

**Rule**: LEGOs should be ordered pedagogically, not mechanically.

Check for:
- Temporal markers (now, tomorrow, yesterday) introduced too early
- Grammar particles as standalone LEGOs (should be embedded in M-LEGOs)
- Sentence-order decomposition instead of concept-order

**Severity**: MEDIUM - affects learning efficiency

### 8. PRODUCTION UNCERTAINTY (High)

**Rule**: Minimize target language variants for same concept.

Check for:
- Multiple target forms that cover similar English meanings
- Synonym overload (3+ ways to say similar things in first 50 LEGOs)
- Verb form explosion (many conjugations of same verb early)

**Example (BAD for Japanese)**:
- 話します (speak - polite)
- 話す (speak - plain)
- 話している (speaking)
- 話したい (want to speak)
- 話せる (can speak)

All in first 20 seeds = production uncertainty

**Severity**: HIGH - leads to learner paralysis

### 9. CONSISTENCY ISSUES (Medium)

Check for:
- Same phrase translated differently in different locations
- Inconsistent romanization/transliteration
- Register mixing within a seed (formal + casual)
- Spelling variations of same word

**Severity**: MEDIUM - confuses learners

## Audit Process

### Phase 1: Data Collection
```sql
-- Get all course content
SELECT * FROM course_seeds WHERE course_code = $1;
SELECT * FROM course_legos WHERE course_code = $1 ORDER BY seed_number, lego_index;
SELECT * FROM course_practice_phrases WHERE course_code = $1 ORDER BY seed_number, lego_index, position;
```

### Phase 2: Automated Checks
Run checks 1-5, 7-9 programmatically:
- Vocabulary timeline validation
- Tiling verification
- Component content analysis
- Phrase tier counting
- Build-up gap detection
- Duplicate/inconsistency detection

### Phase 3: LLM Semantic Review
For check 6 (semantic issues), use LLM to evaluate:
- Translation accuracy
- Naturalness in both languages
- Clarity and unambiguity
- Cultural appropriateness

### Phase 4: Report Generation

## Report Format

```markdown
# Course Audit Report: {course_code}
Generated: {timestamp}
Total Seeds: {count} | Total LEGOs: {count} | Total Phrases: {count}

## Executive Summary
- Critical Issues: {count}
- High Priority: {count}
- Medium Priority: {count}
- Overall Quality Score: {X}/100

## Critical Issues (Fix Immediately)

### Vocabulary Violations
| Seed | LEGO | Phrase | Uses Future Vocab | Introduced At |
|------|------|--------|-------------------|---------------|
| S0045 | L02 | "I want to eat tomorrow" | "tomorrow" | S0089 |

### Component Sins
| Seed | LEGO | Component | Problem |
|------|------|-----------|---------|
| S0023 | L01 | "completed action marker" → 了 | Grammatical explanation, not real word |

### Semantic Errors
| Seed | LEGO | Position | Known | Target | Issue |
|------|------|----------|-------|--------|-------|
| S0034 | L02 | 5 | "I'm boring" | "我很无聊" | Should be "I'm bored" - embarrassing error |

## High Priority Issues

### Phrase Tier Failures
| Seed | LEGO | SHORT | MEDIUM | LONG | Missing |
|------|------|-------|--------|------|---------|
| S0045 | L01 | 1 | 3 | 1 | Need 2+ SHORT, 3+ LONG |

### Production Uncertainty
| Concept | Variants | Seeds |
|---------|----------|-------|
| "speak" | 5 forms | S0003, S0012, S0018, S0023, S0034 |

## Medium Priority Issues

### Build-up Gaps
| Seed | LEGO | Gap Description |
|------|------|-----------------|
| S0056 | L02 | Jumps from 4 syllables to 12 syllables, missing middle |

### Consistency Issues
| Phrase | Location 1 | Location 2 | Difference |
|--------|------------|------------|------------|
| "with you" | S0023:L01:P3 = 和你 | S0045:L02:P7 = 跟你 | Different word for "with" |

## Appendix: Full Issue List
[Detailed listing of all issues with context]
```

## Usage

To audit a course:
```
/course-audit spa_for_eng
```

Options:
- `--severity critical` - Only show critical issues
- `--seed-range 1-50` - Audit specific seed range
- `--check vocabulary,semantic` - Run specific checks only
- `--fix-suggestions` - Include suggested fixes for each issue

## Integration

The audit agent should:
1. Query Supabase directly for course data
2. Run automated checks locally
3. Use Claude for semantic evaluation (batched for efficiency)
4. Generate markdown report
5. Optionally create GitHub issues or Notion tasks for fixes

## Quality Thresholds

| Score | Interpretation |
|-------|---------------|
| 90-100 | Production ready |
| 80-89 | Minor polish needed |
| 70-79 | Significant issues, review before release |
| 60-69 | Major rework needed |
| <60 | Course needs fundamental redesign |

Scoring:
- Each CRITICAL issue: -5 points
- Each HIGH issue: -2 points
- Each MEDIUM issue: -1 point
- Base score: 100
