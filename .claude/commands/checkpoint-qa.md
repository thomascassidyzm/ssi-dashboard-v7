# Checkpoint QA - Quality Verification for Course Builds

Use this skill when a course build has reached its checkpoint (default: seed 10) and needs QA verification before continuing.

## Purpose

The checkpoint system pauses builds early to verify quality before committing to all 260+ seeds. Your job as QA agent is to:
1. **Check absolute quality** - QA average score must be >= 7.0
2. **Verify USE > BUILD** - USE phrases must outscore BUILD phrases
3. **Recheck vocabulary gate** - No forbidden vocab (words not yet introduced)
4. Independently re-score a sample of phrases
5. Report quality metrics and any violations
6. Approve or flag for human review

## Multi-Checkpoint System

Courses have **three QA checkpoints** at seeds 10, 50, and 150:

| Checkpoint | After Seed | Focus |
|------------|------------|-------|
| **1** | 10 | Methodology correct? Early catch. |
| **2** | 50 | Calibration holding? First drift check. |
| **3** | 150 | Quality sustained? Past halfway. |

At each checkpoint, you'll receive:
- The current checkpoint number
- Previous checkpoint results (if any)
- Drift trend across checkpoints

### Drift Trend Tracking

Track how drift changes across checkpoints:

```
Checkpoint 10:  drift: 0.3 ✓
Checkpoint 50:  drift: 0.6 ⚠️ (doubled from CP1)
Checkpoint 150: drift: 1.4 🛑 STOP (trend: increasing)
```

If drift is **increasing** across consecutive checkpoints, the build agent is getting lazier. This triggers a HALT even if absolute quality is still acceptable.

## Quality Gates (in priority order)

### Gate 1: Absolute Quality (HARD FAIL)
```
QA average score < 7.0 → REJECT (rebuild required)
```
Drift doesn't matter if the course is bad. A well-calibrated agent producing 3.5-average phrases is still producing a bad course.

### Gate 2: USE > BUILD Scores (HARD FAIL)
```
USE avg <= BUILD avg → REJECT (phrase quality inverted)
```
BUILD phrases are fragments to lock in patterns. USE phrases are the standalone-sayable phrases that go into eternal rotation (full sentences preferred, not required — Kai, 2026-08-17) - they MUST be higher quality. If BUILD phrases outscore USE phrases, the build agent misunderstands the methodology.

### Gate 3: Vocabulary Violations (HARD FAIL)
```
Any phrase uses words not yet introduced → REJECT (learner can't produce unknown words)
```
A learner cannot be asked to say a word they haven't been introduced to. The course-builder API already gates this, but QA must verify - this is a critical pedagogical constraint.

### Gate 4: Drift (SOFT FLAG)
```
Drift >= 20% → FLAG for calibration review (but may still approve if quality is good)
```
High drift means the build agent's self-assessment is unreliable. The course may still be good, but the agent needs recalibration.

## FIRST: Fetch the Checkpoint Summary

```
GET http://localhost:3471/api/checkpoint/summary/{course_code}
```

This returns:
- `summary`: Seeds complete, LEGO count, phrase count, average score, score distribution
- `sample_for_qa.phrases`: ~50 USE phrases with the build agent's scores
- `checkpoint.approved`: Whether already approved

## SECOND: Re-Score Each Phrase

For each phrase in `sample_for_qa.phrases`, evaluate independently:

### Scoring Scale (1-9)

| Score | Meaning |
|-------|---------|
| **9** | Grammatically perfect, semantically excellent, high value in both languages |
| **7-8** | Strong phrase, minor stylistic preferences possible |
| **5-6** | Solid, functional, no issues but not remarkable |
| **3-4** | Grammatically OK, but awkward/textbook-ish |
| **1-2** | Grammatically OK, semantically questionable, low value |

### What Makes a High Score?

**9 (Excellent):**
- Native speakers would actually say this in both languages
- Teaches something transferable and useful
- Flows naturally when spoken aloud

**5-6 (Functional):**
- Grammatically correct in both languages
- Makes sense but might sound slightly formal/textbook
- Gets the job done

**1-2 (Marginal):**
- Technically correct but no one would say this
- Awkward in one or both languages
- Low pedagogical value

## THIRD: Calculate Drift Metrics

For each phrase, calculate: `|your_score - agent_score|`

Aggregate metrics:
- **Perfect alignment**: drift = 0
- **Minor drift**: drift <= 1
- **Moderate drift**: drift = 2
- **Significant drift**: drift >= 3

### Drift Thresholds

- **< 10% significant drift**: Auto-approve is safe
- **10-20% significant drift**: Borderline - human should review flagged phrases
- **> 20% significant drift**: Recommend manual review - patterns may be off

## FOURTH: Check Vocabulary Gate

For each phrase in the sample, verify that ALL words have been introduced:
- Words from LEGOs (A-type targets)
- Words from M-LEGO components
- Only vocabulary from seeds 1 through current seed

**How to check:**
1. Build a vocabulary list from all LEGOs and components up to seed 10
2. For each phrase, tokenize the target text
3. Flag any word not in the vocabulary list

Common vocabulary violations:
- Time words used before introduced (tomorrow, yesterday, later)
- Pronouns not yet covered (he, she, they)
- Verbs in forms not yet taught

## FIFTH: Generate QA Report

Create a structured report:

```json
{
  "course_code": "xxx_for_eng",
  "qa_timestamp": "ISO timestamp",
  "checkpoint_number": 2,
  "checkpoint_seed": 50,
  "sample_size": 50,
  "drift_history": [
    {"checkpoint": 1, "seed": 10, "drift": 0.3},
    {"checkpoint": 2, "seed": 50, "drift": 0.6}
  ],
  "drift_trend": "increasing",
  "quality_gates": {
    "gate_1_absolute_quality": {
      "qa_avg_score": 7.4,
      "threshold": 7.0,
      "status": "PASS"
    },
    "gate_2_use_exceeds_build": {
      "use_avg": 7.6,
      "build_avg": 6.8,
      "status": "PASS"
    },
    "gate_3_vocabulary": {
      "violations_found": 0,
      "forbidden_words": [],
      "status": "PASS"
    },
    "gate_4_drift": {
      "avg_agent_score": 7.8,
      "avg_qa_score": 7.4,
      "drift_rate": "8%",
      "status": "PASS"
    }
  },
  "flagged_phrases": [
    {
      "id": "phrase_id",
      "known": "...",
      "target": "...",
      "role": "use",
      "agent_score": 8,
      "qa_score": 5,
      "drift": 3,
      "issue": "Grammatically correct but sounds textbook-ish in target language"
    }
  ],
  "vocabulary_violations": [
    {
      "phrase_id": "...",
      "phrase": "...",
      "forbidden_word": "내일",
      "reason": "Word not introduced until seed 15"
    }
  ],
  "recommendation": "APPROVE" | "HUMAN_REVIEW" | "REJECT",
  "rejection_reason": null
}
```

## SIXTH: Take Action

### Decision Tree

```
IF gate_1 FAILS (qa_avg < 7.0):
    → REJECT: "Quality too low (avg {score}), rebuild required"

ELIF gate_2 FAILS (use_avg <= build_avg):
    → REJECT: "USE phrases must outscore BUILD phrases"

ELIF gate_3 FAILS (vocabulary violations > 0):
    → REJECT: "Vocabulary violations found - learners cannot produce unknown words"

ELIF drift > 1.5 points:
    → REJECT: "Calibration broken - drift too high ({drift} points)"

ELIF drift_trend == "increasing" for 2+ checkpoints:
    → REJECT: "Agent drifting - quality declining over time"

ELIF gate_4 FLAGS (drift >= 20% but < 1.5 points):
    → HUMAN_REVIEW: "Quality acceptable but agent calibration needs review"

ELSE:
    → APPROVE: "All gates passed"
```

### If APPROVE:

```
POST http://localhost:3471/api/checkpoint/approve/{course_code}
{
  "approved_by": "qa_agent",
  "qa_report": { ... your report ... }
}
```

### If REJECT:

Do NOT approve. Output your report with:
- Which gate failed
- Specific examples of failures
- Recommendation: rebuild with corrected methodology

### If HUMAN_REVIEW:

Output your report and flag for human decision. Include:
- Why drift is high (patterns? specific phrase types?)
- Whether quality is still acceptable despite calibration issues

## Example QA Session

```
1. GET /api/checkpoint/summary/deu_for_eng

   Response shows sample BUILD and USE phrases with agent scores.

2. Score BUILD phrases (sample of 20):
   - "I want to" / "ich möchte" → QA: 7
   - "speak German" / "Deutsch sprechen" → QA: 8
   - BUILD avg: 6.8

3. Score USE phrases (sample of 30):
   - "I want to learn German with you" / "Ich möchte Deutsch mit dir lernen"
     Agent: 8, QA: 8 ✓
   - "Can you help me after you finish?"
     Agent: 8, QA: 6 (sounds formal)
   - USE avg: 7.4

4. Check vocabulary:
   - Build vocab list from seeds 1-10 LEGOs and components
   - Scan all phrases for words not in list
   - Found 0 violations ✓

5. Evaluate gates:
   Gate 1: QA avg 7.4 >= 7.0 ✓ PASS
   Gate 2: USE 7.4 > BUILD 6.8 ✓ PASS
   Gate 3: 0 vocabulary violations ✓ PASS
   Gate 4: Drift 8% < 20% ✓ PASS

6. Recommendation: APPROVE

7. POST /api/checkpoint/approve/deu_for_eng with qa_report
```

### Example: REJECT due to Gate 2 failure

```
BUILD avg: 7.2
USE avg: 6.8  ← LOWER than BUILD!

This indicates the build agent is producing better fragments than
complete sentences. The methodology is inverted - USE phrases
(eternal-eligible) must be higher quality than BUILD phrases.

Recommendation: REJECT
Reason: "USE phrases (6.8) must outscore BUILD phrases (7.2)"
Action: Rebuild with focus on high-quality complete sentences for USE
```

## Scoring Guidelines by Language

### For Romance Languages (Spanish, Portuguese, French, Italian)
- Check verb conjugations match subject
- Check gender agreement (adjectives, articles)
- Check register consistency (tú/usted, tu/vous)

### For Germanic Languages (German, Dutch, Swedish)
- Check word order (V2 rule, verb-final in subclauses)
- Check case marking (German: nom/acc/dat/gen)
- Check separable verbs positioned correctly

### For East Asian Languages (Chinese, Japanese, Korean)
- Check particle usage (Chinese: 了/着/过, Japanese: は/が/を)
- Check honorific consistency (Japanese, Korean)
- Check measure words (Chinese, Japanese)

### For All Languages
- Does it sound natural when spoken aloud?
- Would a native speaker actually say this?
- Does it teach something useful and transferable?

---

## Related Skills

- `/course-resume` - Resume building after checkpoint approval
- `ralph-methodology.md` - Complete course building methodology
