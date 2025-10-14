# Orchestrator Brief: Generate 3 Complete Courses (668 Seeds Each)

**Mission**: Generate 3 production-ready courses from scratch, validate quality, iteratively improve prompts

**Courses to Generate**:
1. **Chinese (Mandarin) for English speakers** - `cmn_for_eng_668seeds`
2. **Irish (Gaeilge) for English speakers** - `gle_for_eng_668seeds`
3. **Italian for French speakers** - `ita_for_fra_668seeds`

**Total Scope**: 2,004 seeds × 7 phases = 14,028 phase operations

---

## Strategy: Sequential with Validation Loops

**Why Sequential**:
- Learn from each course
- Improve prompts between courses
- Validate quality before moving to next
- Build confidence in process

**Order**: Chinese → Irish → Italian (easiest → hardest)

---

## Course 1: Chinese for English Speakers

### Why Start Here
- Canonical seeds ARE English (known language)
- Phase 1 Step 2 can reuse canonical (no back-translation needed)
- Tests Phase 1 with complex target language (character-based)
- Good stress test of FD_LOOP (Chinese ↔ English)

### Execution Plan

#### Phase 0: Corpus Pre-Analysis
**Input**: `/Users/tomcassidy/SSi/SSi_Course_Production/vfs/seeds/canonical_seeds.json` (668 seeds)
**Output**: `vfs/courses/cmn_for_eng_668seeds/phase_outputs/phase_0_intelligence.json`

**Prompt Source**: APML lines 292-341
**What to do**:
1. Read canonical seeds
2. Analyze for Chinese translation complexity
3. Identify cognates (minimal for Chinese)
4. Map grammatical dependencies
5. Generate intelligence report

**Validation**: Check intelligence covers:
- Word frequency analysis
- Complexity scores
- Translation guidance
- Recommendations for Phase 1

---

#### Phase 1: Pedagogical Translation (7 batches × 100 seeds)
**Input**: Canonical seeds + Phase 0 intelligence
**Output**: `vfs/courses/cmn_for_eng_668seeds/amino_acids/translations/{uuid}.json` (668 files)

**Prompt Source**: APML lines 411-481
**Batch Processing**: 100 seeds per batch, 7 batches total

**Critical**: Two-step translation (APML lines 378-409):
- Step 1: English → Chinese (Mandarin) - Apply 6 heuristics
- Step 2: Chinese → English - REUSE canonical (since known=English)

**What to do**:
1. For each seed, apply 6 heuristics to create Chinese translation
2. Verify English matches canonical (or adjust for Chinese structure)
3. Create translation amino acid with UUID
4. Store in VFS

**Validation After Batch 1** (100 seeds):
- Check 10 random translations for naturalness
- Verify 6 heuristics applied
- Test FD_LOOP on 5 translations (Chinese → English → Chinese)
- **If issues found**: Update Phase 1 prompt, regenerate batch

**Quality Threshold**: 85/100 before proceeding to all batches

---

#### Phase 2: Corpus Intelligence
**Input**: All 668 translation amino acids
**Output**: `vfs/courses/cmn_for_eng_668seeds/phase_outputs/phase_2_corpus_intelligence.json`

**Prompt Source**: APML lines 509-556
**What to do**:
1. Calculate FCFS order for all translations
2. Assign utility scores (Frequency × Versatility × Simplicity)
3. Map dependencies
4. Generate teaching sequence recommendations

**Validation**:
- FCFS order makes pedagogical sense (simple → complex)
- Utility scores reflect actual teaching value
- No circular dependencies

---

#### Phase 3: LEGO Decomposition (34 batches × 20 seeds)
**Input**: Translations + Phase 2 intelligence
**Output**: `vfs/courses/cmn_for_eng_668seeds/amino_acids/legos/{uuid}.json`

**Prompt Source**: APML lines 835-285 (Phase 3 prompt)
**Batch Processing**: 20 seeds per batch, 34 batches total

**Critical for Chinese**:
- FD_LOOP test (Chinese characters ↔ English)
- TILING test (do characters concatenate cleanly?)
- COMPOSITE LEGOs (Chinese grammar particles as glue)
- FCFS claiming (measure-words, particles, etc.)

**What to do**:
1. Break each translation into FD-compliant LEGOs
2. Apply TILING test
3. Create BASE vs COMPOSITE LEGOs
4. Store FEEDERs for COMPOSITE LEGOs
5. Add componentization explanations

**Validation After Batch 1** (20 seeds):
- Check 10 random LEGOs pass FD_LOOP
- Verify IRON RULE compliance (no standalone prepositions)
- Check COMPOSITE LEGOs have proper FEEDERs
- Test TILING logic (are BASE LEGOs correctly separated?)
- **If issues**: Update Phase 3 prompt, regenerate batch

**Quality Threshold**: 90/100 FD_LOOP pass rate before continuing

---

#### Phase 3.5: Graph Construction
**Input**: All LEGO amino acids
**Output**: `vfs/courses/cmn_for_eng_668seeds/phase_outputs/phase_3.5_lego_graph.json`

**Prompt Source**: APML lines 318-375
**What to do**:
1. Detect adjacency patterns (which LEGOs appear together)
2. Build directed graph (LEGO_A → LEGO_B)
3. Calculate edge weights (frequency × pedagogical value)
4. Validate graph (connected, no invalid cycles)

**Validation**:
- Graph has all LEGOs as nodes
- Edges represent actual corpus patterns
- Edge weights make sense (common patterns = higher weight)

---

#### Phase 4: Deduplication
**Input**: LEGO amino acids
**Output**: `vfs/courses/cmn_for_eng_668seeds/amino_acids/legos_deduplicated/{uuid}.json`

**Prompt Source**: APML lines 409-465
**What to do**:
1. Find duplicate LEGOs (same text, different provenance)
2. Merge provenance (S1L1, S4L2, S12L3 → combined)
3. Generate new deterministic UUIDs
4. Create deduplicated set

**Validation**:
- All provenance preserved (no data loss)
- Duplicates correctly identified and merged
- Deduplicated count < original count

---

#### Phase 5: Basket Generation (Progressive Batches)
**Input**: Deduplicated LEGOs + Graph + FCFS intelligence
**Output**: `vfs/courses/cmn_for_eng_668seeds/phase_outputs/phase_5_baskets.json`

**Prompt Source**: APML lines 544-791
**Batch Processing**: 20 LEGOs per batch, process sequentially

**CRITICAL PHASE** - Use Extended Thinking

**What to do**:
1. **Stage 1**: Select LEGOs using graph intelligence (maximize edge coverage)
2. **Stage 2**: For EACH LEGO, generate:
   - 3-5 e-phrases (7-10 words, perfect grammar, natural)
   - 8 d-phrases (expanding windows: 2/3/4/5-LEGO)
3. **Progressive Vocabulary**: LEGO #N can ONLY use vocabulary from LEGOs #1 to #(N-1)
4. **Culminating LEGO Rule**: Last LEGO in seed has complete seed as e-phrase #1

**Chinese-Specific Challenges**:
- Character-based length counting (not words)
- Natural Chinese phrasing (not transliterated English)
- Grammar particles ("了", "吗", "呢", etc.)
- Measure words (个, 本, 张, etc.)

**Validation After LEGO 50**:
- Check e-phrases are 7-10 words (or 10-15 characters for Chinese?)
- Verify ZERO grammar errors in Chinese
- Confirm vocabulary constraint respected
- Test naturalness (would native speaker say this?)
- **If issues**: Update Phase 5 prompt, regenerate from LEGO 1

**Quality Threshold**: 90/100 before continuing to LEGO 100

**Extended Thinking Trigger**: Use for LEGOs 100-200 (complex vocabulary building)

---

#### Phase 6: Introductions
**Input**: Baskets + Deduplicated LEGOs
**Output**: `vfs/courses/cmn_for_eng_668seeds/amino_acids/introductions/{uuid}.json`

**Prompt Source**: APML lines 831-890
**What to do**:
1. For each basket, identify known LEGOs (from previous baskets)
2. Generate introduction phrases using ONLY known vocabulary
3. For COMPOSITE LEGOs, explain: "You know X and Y, we're adding Z glue"
4. Validate zero unknowns

**Validation**:
- All introduction phrases use only known LEGOs
- COMPOSITE introductions explain FEEDERs clearly
- Zero-unknowns rule verified

---

### Post-Course Validation

**Run Quality Agent** (like 30-seed Italian validation):
1. Translation quality (Phase 1)
2. LEGO FD compliance (Phase 3)
3. Basket phrase quality (Phase 5)
4. End-to-end coherence

**Quality Target**: 85/100 overall

**If < 85/100**:
- Identify top 3 issues
- Update relevant prompts in APML
- Regenerate affected phases
- Re-validate

**If ≥ 85/100**:
- Document lessons learned
- Update APML with improvements
- Git commit: "Chinese course complete - quality validated"
- Proceed to Course 2

---

## Course 2: Irish for English Speakers

### Why Second
- Tests Celtic language structure (VSO word order)
- Canonical seeds ARE English (known language)
- Intermediate difficulty (complex grammar, familiar script)
- SSi specialty (real-world validation possible)

### Execution Plan

**Use improved prompts from Chinese course**

#### Phase 0-6: Same process as Chinese

**Irish-Specific Challenges**:
- Initial mutations (séimhiú, urú)
- Verb-initial word order (VSO)
- Prepositional pronouns (agam, agat, aige)
- Eclipsis and lenition rules

**Validation Points**: Same as Chinese course

**Quality Target**: 87/100 (higher than Chinese - prompts should be better)

---

## Course 3: Italian for French Speakers

### Why Last
- Tests Phase 1 Step 2 (back-translation: Italian → French)
- Known language ≠ English (most complex)
- Romance languages (high similarity = FD_LOOP challenges)
- Final proof of generalization

### Execution Plan

**Use prompts refined from Chinese + Irish**

#### Phase 0: Modified for French speakers

**Canonical seeds in English, but analyze for**:
- Italian translation complexity
- French back-translation complexity
- Cognates between Italian/French (many!)
- False friends (attualmente ≠ actuellement)

#### Phase 1: Two-step translation (CRITICAL TEST)

**Step 1**: English → Italian (optimize for teaching)
**Step 2**: Italian → French (back-translate to match Italian structure)

**Example**:
```
Canonical: "I want to speak Italian with you now"
Step 1: English → Italian: "Voglio parlare italiano con te adesso"
Step 2: Italian → French: "Je veux parler italien avec toi maintenant"
         (NOT: "Je veux parler l'italien avec vous maintenant")
         (French MATCHES Italian structure)
```

**Validation**: French mirrors Italian phrasing (not English canonical)

#### Phase 3: FCFS conflicts expected

**Italian/French similarity creates FCFS challenges**:
- "parlare" vs "parler" (both claim "to speak"?)
- "italiano" vs "italien" (both claim "Italian"?)
- Need careful FCFS adjudication

**Validation**: FCFS correctly resolves Romance cognate conflicts

#### Phase 5: Bilingual validation crucial

**E-phrases must be natural in BOTH Italian AND French**:
- Not: Italian natural + French awkward
- Not: French natural + Italian awkward
- BOTH must be natural

**Quality Target**: 90/100 (highest - proves system maturity)

---

## Orchestrator Strategy

### Parallel Sub-Agents

For each course, spawn agents:

**Agent 1: Phase Executor**
- Executes phases 0-6 sequentially
- Follows APML prompts precisely
- Stores output in VFS

**Agent 2: Quality Validator** (runs after each phase)
- Validates output quality
- Checks against APML specs
- Flags issues

**Agent 3: Prompt Improver** (runs when issues found)
- Identifies prompt weaknesses
- Drafts improvements
- Updates APML

**Coordination**:
- Execute Phase → Validate → If issues, Improve Prompt → Re-execute
- Loop until quality threshold met
- Document lessons learned

---

## Deliverables

### For Each Course

1. **Complete VFS structure**:
   ```
   vfs/courses/{course_code}/
   ├── amino_acids/
   │   ├── translations/ (668 files)
   │   ├── legos/ (varies)
   │   ├── legos_deduplicated/ (varies)
   │   ├── baskets/ (varies)
   │   └── introductions/ (varies)
   └── phase_outputs/
       ├── phase_0_intelligence.json
       ├── phase_2_corpus_intelligence.json
       ├── phase_3.5_lego_graph.json
       └── phase_5_baskets.json
   ```

2. **Quality Report**: `{course_code}_QUALITY_REPORT.md`
   - Overall score
   - Phase breakdown
   - Top issues (if any)
   - Lessons learned

3. **Prompt Evolution**: `APML_IMPROVEMENTS_{course_code}.md`
   - What prompts were updated
   - Why (what issues they fixed)
   - Quality improvement (before/after scores)

### Final Deliverable

**`THREE_COURSE_GENERATION_REPORT.md`**:
```markdown
# Three Course Generation Report

## Executive Summary
- Courses generated: 3
- Total seeds: 2,004
- Total LEGOs: ~5,000-8,000 (estimated after deduplication)
- Total baskets: ~5,000-8,000
- Quality scores:
  - Chinese: X/100
  - Irish: Y/100
  - Italian-French: Z/100
- Average: (X+Y+Z)/3
- Prompt improvements: N iterations

## Course 1: Chinese for English Speakers
[Quality report, lessons learned, challenges]

## Course 2: Irish for English Speakers
[Quality report, lessons learned, challenges]

## Course 3: Italian for French Speakers
[Quality report, lessons learned, challenges]

## Prompt Evolution
[Summary of APML improvements across all 3 courses]

## Recommendations
[What to do before scaling to more languages]

## Success Metrics
- X% of courses ≥ 85/100 quality
- FD_LOOP pass rate: Y%
- Grammar error rate: Z%
- Prompt stability: N iterations to convergence
```

---

## Extended Thinking Usage

**When to Trigger**:
- Phase 5 basket generation (complex vocabulary constraints)
- Prompt improvement (need deep analysis of failures)
- Quality validation (nuanced linguistic judgments)

**How to Trigger**:
Use the thinking parameter in Task tool or explicitly request extended thinking in prompt

---

## Success Criteria

### Per Course
✅ All 668 seeds processed through 7 phases
✅ Quality score ≥ 85/100
✅ FD_LOOP pass rate ≥ 90%
✅ Zero critical grammar errors in target language
✅ Baskets have 3-5 quality e-phrases (7-10 words)
✅ Progressive vocabulary constraint verified

### Overall
✅ 3 courses complete
✅ Average quality ≥ 87/100
✅ APML prompts improved and stable
✅ Process generalizes to ANY language pair
✅ Ready for production use

---

## Timeline Estimate

**Per Course** (sequential with validation):
- Phase 0: 30 min
- Phase 1: 3-4 hours (7 batches + validation)
- Phase 2: 30 min
- Phase 3: 8-10 hours (34 batches + validation)
- Phase 3.5: 1 hour
- Phase 4: 1 hour
- Phase 5: 12-16 hours (progressive, with extended thinking)
- Phase 6: 2 hours
- Quality validation: 2 hours
- **Total per course**: ~30-35 hours

**All 3 courses**: 90-105 hours (4-5 days of continuous work)

**BUT**: With parallel agents and optimizations, could be 24-48 hours

---

## Important Notes

1. **VFS Structure**: Create course directories first
2. **APML is SSoT**: All prompts come from APML (current version 7.3.0)
3. **Quality > Speed**: Better to take time and iterate than rush
4. **Document Everything**: Every prompt change, every issue, every lesson
5. **Commit Frequently**: Git commit after each successful phase
6. **Test Incrementally**: Validate early (batch 1) before processing all data

---

## Ready to Execute

Save all outputs to VFS as specified.
Create quality reports in dashboard root.
Update APML with improvements.
Git commit progress regularly.

**When complete**: Wake user with summary of:
- 3 courses generated
- Quality scores achieved
- Prompt improvements made
- System ready for production
