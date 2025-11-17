# Agent Brief: Automated Test Suite Generation
**Date**: 2025-11-17
**Priority**: HIGH
**Purpose**: Create comprehensive test coverage for SSi Course Production system

---

## 🎯 Mission

Spawn a team of specialized test-writing agents to create a complete automated test suite that validates every critical process in the 8-phase pipeline.

---

## 📊 Current State

**Test Coverage**: ~5% (minimal)
- Phase 7 has JSON Schema validation
- Some validators exist (course-validator.cjs, phase-deep-validator.cjs)
- **No automated unit/integration tests**

**Risk Level**: 🔴 HIGH
- 8 phases with complex interdependencies
- Multiple file format versions
- 92 API endpoints (many untested)
- Phase 5 has 6 generator variations (no test to show which works)

---

## 🎭 Agent Team Structure

### Master Test Orchestrator
**Role**: Coordinate test agent team, compile results, generate test runner

**Responsibilities**:
1. Spawn 8 specialized test agents (one per phase)
2. Spawn 1 API test agent
3. Spawn 1 integration test agent
4. Compile all tests into unified suite
5. Create test runner script
6. Generate test coverage report

---

## 👥 Specialized Test Agents

### Agent 1: Phase 1 Test Suite
**Target**: Phase 1 (Pedagogical Translation)
**Spec**: `public/docs/phase_intelligence/phase_1_seed_pairs.md`

**Tests to Create**:
1. **Input validation**:
   - Canonical seeds file exists
   - Seeds have required fields
   - Seed IDs are sequential

2. **TWO ABSOLUTE RULES validation**:
   - Test: Canonical meaning never changed
   - Test: Cognates preferred for seeds 1-100

3. **Output format validation**:
   - Test: Array format [known, target]
   - Test: NOT [target, known] (old format)
   - Test: All 668 seeds translated

4. **Zero variation validation**:
   - Test: Same English word → same target translation (seeds 1-100)
   - Test: No variation in early seeds

5. **Synonym flexibility validation**:
   - Test: Cognate transparency works
   - Test: Known language can use synonyms

**Output**: `tests/phase1/phase1.test.cjs`

---

### Agent 2: Phase 3 Test Suite
**Target**: Phase 3 (LEGO Extraction)
**Spec**: `public/docs/phase_intelligence/phase_3_lego_pairs_v7.md`

**Tests to Create**:
1. **Input validation**:
   - seed_pairs.json exists and valid
   - Required fields present

2. **TILING validation**:
   - Test: Every seed decomposes perfectly
   - Test: LEGOs reconstruct seed exactly

3. **Functional Determinism validation**:
   - Test: Known → Target mapping is 1:1 (no uncertainty)
   - Test: Learner can generate target unambiguously

4. **LEGO type validation**:
   - Test: Type A (Atomic) or M (Molecular) only
   - Test: Molecular LEGOs have components array

5. **new: true/false validation**:
   - Test: First occurrence marked new: true
   - Test: Subsequent occurrences marked new: false
   - Test: Same target+known → same new status

6. **Output format validation**:
   - Test: v8.1.1 format compliance
   - Test: All required metadata present

**Output**: `tests/phase3/phase3.test.cjs`

---

### Agent 3: Phase 5 Test Suite
**Target**: Phase 5 (Practice Basket Generation)
**Spec**: `public/docs/phase_intelligence/phase_5_lego_baskets.md`

**Tests to Create**:
1. **Input validation**:
   - lego_pairs.json exists
   - Scaffolds directory exists

2. **GATE compliance validation** (CRITICAL):
   - Test: Every target word available from sources
   - Test: No "magical" vocabulary appearing
   - Test: Vocabulary only from: recent context + earlier LEGOs + current LEGO

3. **2-2-2-4 distribution validation**:
   - Test: Exactly 10 phrases per LEGO (except early seeds)
   - Test: 2 short + 2 medium + 2 longer + 4 longest

4. **Early seed flexibility validation**:
   - Test: S0001-S0010 can have <10 phrases
   - Test: Grammar over quantity for early seeds

5. **Final LEGO validation**:
   - Test: is_final_lego: true → highest phrase = complete seed sentence

6. **Grammar validation**:
   - Test: Both languages grammatically correct
   - Test: No word salad or nonsensical combinations

7. **Output format validation**:
   - Test: practice_phrases array format
   - Test: [known, target, null, lego_count] structure

**Output**: `tests/phase5/phase5.test.cjs`

**Critical Note**: This is the most complex phase - extensive testing needed!

---

### Agent 4: Phase 6 Test Suite
**Target**: Phase 6 (Introduction Generation)
**Spec**: `public/docs/phase_intelligence/phase_6_introductions.md`

**Tests to Create**:
1. **Script execution test**:
   - Test: Script runs without errors
   - Command: `node tools/generators/phase6-generate-introductions.cjs <course_code>`

2. **Output validation**:
   - Test: introductions.json created
   - Test: All LEGOs have presentations

3. **Format validation**:
   - Test: BASE presentations exist
   - Test: COMPOSITE presentations have component breakdown
   - Test: "means" wording used (not "is")

4. **Seed context validation**:
   - Test: "as in..." seed reference present

**Output**: `tests/phase6/phase6.test.cjs`

---

### Agent 5: Phase 7 Test Suite
**Target**: Phase 7 (Course Manifest Compilation)
**Spec**: `public/docs/phase_intelligence/phase_7_compilation.md`

**Tests to Create**:
1. **Script execution test**:
   - Test: Script runs without errors
   - Command: `node scripts/phase7_compile_manifest.cjs public/vfs/courses/<course_code>`

2. **JSON Schema validation** (already exists):
   - Test: Validate against schemas/course-manifest-schema.json

3. **UUID determinism test**:
   - Test: Same text+role+language → same UUID
   - Test: UUID format matches SSi legacy format

4. **Samples object validation**:
   - Test: All text has required variants (target1, target2, source)
   - Test: UUIDs unique across all samples

**Output**: `tests/phase7/phase7.test.cjs`

---

### Agent 6: Phase 8 Test Suite
**Target**: Phase 8 (Audio Generation)
**Spec**: `public/docs/phase_intelligence/phase_8_audio_generation.md`

**Tests to Create**:
1. **Prerequisites test**:
   - Test: ElevenLabs API key exists in .env
   - Test: AWS credentials exist in .env

2. **Dry run test**:
   - Test: Script runs with --dry-run flag
   - Command: `node tools/generators/phase8-generate-audio.cjs <course_code> --dry-run`

3. **Manifest reading test**:
   - Test: Reads from course_manifest.json (NOT individual phase files)
   - Test: Extracts samples object correctly

4. **UUID filename test**:
   - Test: Audio files named exactly as UUIDs from manifest
   - Test: Format: {UUID}.mp3

5. **Voice mapping test**:
   - Test: target1/target2 use target language voice
   - Test: source uses known language voice

6. **S3 path test**:
   - Test: Upload path is courses/{course_code}/audio/{UUID}.mp3

**Output**: `tests/phase8/phase8.test.cjs`

**Critical Note**: ⚠️ Phase 8 NEVER TESTED - these tests are validation that it works!

---

### Agent 7: API Endpoint Test Suite
**Target**: automation_server.cjs (92 endpoints)
**Spec**: `docs/AUDIT_API_SERVERS.md`

**Tests to Create**:
1. **Server startup test**:
   - Test: Server starts on port 3456
   - Test: Health check endpoint responds

2. **Course management tests** (15 endpoints):
   - Test: GET /api/courses (list all courses)
   - Test: GET /api/courses/:code (get course data)
   - Test: POST /api/courses/generate (generate new course)
   - Test: GET /api/courses/:code/analyze (smart resume)

3. **Phase intelligence tests** (6 endpoints):
   - Test: GET /api/prompts/1 (Phase 1 spec)
   - Test: GET /api/prompts/3 (Phase 3 spec)
   - Test: GET /api/prompts/5 (Phase 5 spec)

4. **Validation tests** (8 endpoints):
   - Test: GET /api/validate/:code (validate course)
   - Test: POST /api/validate/phase/:phase (validate phase output)

5. **S3 sync tests** (10 endpoints):
   - Test: POST /api/sync/upload/:code (upload to S3)
   - Test: POST /api/sync/download/:code (download from S3)

**Output**: `tests/api/api.test.cjs`

---

### Agent 8: Integration Test Suite
**Target**: End-to-end pipeline
**Spec**: Complete workflow Phase 1 → 8

**Tests to Create**:
1. **Small course test** (ita_for_fra - 10 seeds):
   - Test: Phase 1 generates valid seed_pairs.json
   - Test: Phase 3 generates valid lego_pairs.json
   - Test: Phase 5 generates valid lego_baskets.json
   - Test: Phase 6 generates valid introductions.json
   - Test: Phase 7 generates valid course_manifest.json
   - Test: Phase 8 generates audio files (if API key available)

2. **Data flow test**:
   - Test: Phase N output = valid Phase N+1 input
   - Test: No broken references between phases

3. **Format compatibility test**:
   - Test: Old v1.0.0 baskets still readable
   - Test: v8.1.1 format compatible with validators

4. **Regression test**:
   - Test: spa_for_eng (668 seeds) still validates
   - Test: cmn_for_eng (668 seeds) still validates

**Output**: `tests/integration/integration.test.cjs`

---

## 📦 Test Framework

**Recommended**: Vitest (already in package.json)
- Fast
- ESM/CJS support
- Built-in mocking
- Compatible with existing setup

**Alternative**: Jest (if Vitest issues)

---

## 📋 Deliverables

### Master Test Orchestrator Outputs:

1. **Test Suite Structure**:
```
tests/
├── phase1/
│   └── phase1.test.cjs
├── phase3/
│   └── phase3.test.cjs
├── phase5/
│   └── phase5.test.cjs
├── phase6/
│   └── phase6.test.cjs
├── phase7/
│   └── phase7.test.cjs
├── phase8/
│   └── phase8.test.cjs
├── api/
│   └── api.test.cjs
├── integration/
│   └── integration.test.cjs
├── fixtures/
│   └── test-data/
│       ├── sample_seed_pairs.json
│       ├── sample_lego_pairs.json
│       └── sample_course_manifest.json
└── test-runner.cjs
```

2. **Test Runner Script** (`tests/test-runner.cjs`):
```javascript
// Run all tests with coverage
// Command: node tests/test-runner.cjs
// Or: npm test
```

3. **Coverage Report** (`tests/COVERAGE_REPORT.md`):
- Test coverage percentage per phase
- Critical paths covered
- Known gaps
- Risk assessment

4. **CI/CD Integration** (`.github/workflows/test.yml`):
- Auto-run tests on commit
- Block merge if tests fail
- Coverage reporting

---

## 🎯 Success Criteria

### Minimum Viable Test Suite:
- [ ] All 8 phases have basic validation tests
- [ ] Integration test runs complete pipeline on 10-seed course
- [ ] API endpoints have health check tests
- [ ] Test runner executes all tests
- [ ] Coverage report generated

### Ideal Complete Test Suite:
- [ ] >80% code coverage
- [ ] All critical paths tested
- [ ] GATE compliance fully validated (Phase 5)
- [ ] Functional Determinism validated (Phase 3)
- [ ] Format compatibility regression tests
- [ ] CI/CD integration active

---

## ⚠️ Critical Testing Priorities

**MUST TEST** (Before Training Tomorrow):
1. **Phase 5 GATE compliance** - Most common failure point
2. **Phase 3 Functional Determinism** - Core methodology
3. **Integration test on ita_for_fra** - Proves pipeline works
4. **API /api/courses endpoint** - Trainee will use this

**SHOULD TEST** (This Week):
5. **Phase 8 audio generation** - Never tested
6. **All 92 API endpoints** - Many probably unused
7. **Format migration** - v1.0.0 → v8.1.1 compatibility

**NICE TO HAVE** (Ongoing):
8. **Performance tests** - How long does 668 seeds take?
9. **Concurrency tests** - Can multiple agents run simultaneously?
10. **Error recovery tests** - What happens when Phase N fails?

---

## 🚀 Execution Plan

### Phase 1: Spawn Test Agent Team (1 hour)
```javascript
// Spawn 8 agents in parallel
// Each agent creates test suite for their phase
```

### Phase 2: Compile & Verify (30 minutes)
- Master orchestrator collects all test files
- Verifies test syntax
- Creates unified test runner

### Phase 3: Execute Test Suite (30 minutes)
- Run all tests
- Generate coverage report
- Identify failures

### Phase 4: Fix Critical Failures (variable time)
- Address any blocking issues found
- Re-run tests
- Verify fixes

### Total Time Estimate: 2-4 hours

---

## 📊 Expected Outcomes

### Likely Findings:
- ⚠️ **Phase 5 GATE violations** in existing baskets (historical data)
- ⚠️ **Format inconsistencies** (v1.0.0 vs v8.1.1)
- ⚠️ **Unused API endpoints** (probably 30% of 92)
- ⚠️ **Phase 8 issues** (never tested - expect bugs)
- ✅ **Core pipeline probably works** (spa_for_eng exists as proof)

### Value Added:
1. **Confidence** - Know what works vs broken
2. **Regression prevention** - Don't break what works
3. **Documentation validation** - Specs match reality?
4. **Training safety** - Won't surprise trainee with broken pieces

---

## 🎓 Context for Test Agents

**Provide each agent**:
1. This brief (relevant sections)
2. Relevant phase spec from `public/docs/phase_intelligence/`
3. Audit reports from `docs/AUDIT_*.md`
4. Example data from `public/vfs/courses/spa_for_eng/`
5. Master spec `SSI_MASTER_SPECIFICATION.apml`

**Agent autonomy level**: HIGH
- Agents choose test cases based on spec
- Agents determine assertion logic
- Agents write runnable test code
- Master orchestrator coordinates only

---

## ✅ Master Orchestrator Checklist

Before spawning team:
- [ ] Vitest installed and configured
- [ ] Test fixtures directory created
- [ ] Sample test data prepared (small course subset)
- [ ] All phase specs accessible
- [ ] Audit reports available

After team completes:
- [ ] All 8 test suites generated
- [ ] Test runner created
- [ ] Initial test run executed
- [ ] Coverage report generated
- [ ] Critical failures documented
- [ ] Fix recommendations provided

---

## 🎯 Final Output

**Primary**: Working test suite that validates system is operational

**Secondary**: Discover hidden bugs before training tomorrow

**Tertiary**: Foundation for ongoing CI/CD and quality assurance

---

**Ready to Execute?** Spawn the Master Test Orchestrator agent with this brief.

**Time Commitment**: 2-4 hours (worth it for peace of mind before training)

**Risk**: LOW (tests don't modify data, only validate)

**Reward**: HIGH (know what works, catch bugs early, professional QA)

---

*Brief created: 2025-11-17*
*Target execution: Tonight or early morning before training*
