# Orchestrator Brief: SSi 30-Seed Quality Validation

**Mission**: Validate quality of APML-driven pipeline output using 30 Italian test seeds

**Orchestrator Role**:
- Coordinate parallel validation agents
- Aggregate findings into single quality report
- DO NOT block main conversation thread
- Report back when complete

---

## Context

**System**: SSi Course Production (APML-driven, 6-phase pipeline)
**Test Data**: 30 Italian seeds (ita_for_eng_574seeds)
**Data Location**: `/Users/tomcassidy/SSi/SSi_Course_Production/vfs/courses/ita_for_eng_574seeds/`

**Available Phase Outputs**:
- Phase 1: `phase_1_TRANSLATED_30seeds.json` (30 translations)
- Phase 3: `phase_3_LEGOS_30seeds.json` (LEGO breakdowns)
- Phase 4: `phase_4_LEGOS_30seeds_deduplicated.json` (deduplicated)
- Phase 5: `phase_5a_BASKETS_30seeds_v8.json` (baskets with e/d-phrases)

**APML Spec**: `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/ssi-course-production.apml`

---

## Validation Tasks (Run in Parallel)

### Task 1: Phase 1 Translation Quality
**Agent Focus**: Pedagogical translation validation
**Validate**:
- Natural phrasing in Italian (not transliterated)
- Frequency heuristic applied (high-frequency vocabulary)
- Clarity and brevity
- 6 heuristics documented in APML lines 227-233

**Output**:
- Translation quality scores (0-100 per seed)
- Flagged issues with specific seeds
- Examples of excellent vs poor translations

---

### Task 2: Phase 3 LEGO FD_LOOP Compliance
**Agent Focus**: Forward-deterministic validation
**Validate**:
- Every LEGO passes FD_LOOP: `target → known → target` = IDENTICAL
- IRON RULE: No LEGOs start/end with prepositions
- FCFS rule applied (corpus frequency claiming)
- Rules documented in APML lines 389-419

**Output**:
- FD_LOOP pass rate (% of LEGOs passing)
- IRON RULE violations (list specific LEGOs)
- FCFS conflicts detected

---

### Task 3: Phase 5 Basket Phrase Quality
**Agent Focus**: E-phrases and D-phrases naturalness
**Validate**:
- E-phrases are natural in BOTH Italian AND English
- D-phrases syntactically correct as fragments in BOTH languages
- Vocabulary constraints respected (progressive learning)
- Bilingual validation documented in APML lines 1054-1099

**Output**:
- Phrase quality scores per LEGO basket
- Unnatural phrases flagged with explanations
- Vocabulary constraint violations

---

### Task 4: End-to-End Coherence Check
**Agent Focus**: Cross-phase consistency
**Validate**:
- LEGOs accurately decompose translations (no information loss)
- Baskets use LEGOs from their own seed correctly
- Culminating LEGOs include complete seed as E1
- Progressive difficulty curve makes sense

**Output**:
- Coherence score (does pipeline maintain integrity?)
- Provenance tracking working correctly?
- Any phase-to-phase inconsistencies

---

## Orchestrator Instructions

### 1. Launch Parallel Agents
Spawn 4 agents simultaneously using the Task tool:
```
- Agent 1: "Validate Phase 1 translations"
- Agent 2: "Validate Phase 3 LEGO FD compliance"
- Agent 3: "Validate Phase 5 basket phrases"
- Agent 4: "Validate end-to-end coherence"
```

### 2. Each Agent Should:
- Read relevant phase output files
- Read APML spec for validation rules (lines specified above)
- Apply validation criteria
- Generate structured findings
- Provide 3-5 concrete examples (good and bad)
- Calculate quantitative scores where possible

### 3. Aggregate Report
Once all 4 agents complete:
- Combine findings into single quality report
- Calculate overall quality score (composite)
- Identify top 5 issues requiring attention
- Provide recommendations for APML prompt improvements

### 4. Report Format
```markdown
# SSi 30-Seed Quality Validation Report

## Executive Summary
- Overall Quality Score: XX/100
- Seeds Flagged: X/30
- Critical Issues: X
- Recommendations: X

## Phase 1: Translation Quality
[Agent 1 findings]

## Phase 3: LEGO FD Compliance
[Agent 2 findings]

## Phase 5: Basket Phrase Quality
[Agent 3 findings]

## End-to-End Coherence
[Agent 4 findings]

## Top 5 Issues
1. [Issue with specific examples]
2. ...

## Recommendations
1. [Actionable APML prompt improvements]
2. ...
```

---

## Success Criteria

✅ All 4 validation agents complete successfully
✅ Quality scores calculated for each phase
✅ Concrete examples provided (not just abstractions)
✅ Actionable recommendations for prompt improvement
✅ Report delivered as `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/QUALITY_REPORT.md`
✅ Main conversation thread stays clean and non-blocking

---

## Notes for Orchestrator

- **Be autonomous**: Don't ask for clarification - make reasonable interpretations
- **Be specific**: Use actual seed IDs (S0001, S0002) and actual text from files
- **Be data-driven**: Provide percentages, counts, examples
- **Be actionable**: Every finding should suggest a fix
- **Keep main conversation clean**: Work in background, report when done

---

## Deliverable

Save final report to:
`/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/QUALITY_REPORT.md`

Then notify user in main thread:
"✅ Quality validation complete. Report available at QUALITY_REPORT.md"
