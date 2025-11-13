# SSI Pipeline Automation Roadmap

## Current State (After Latest Updates)

### ✅ Already Automated
1. **Phase 1-3-5 Web Orchestration** - Full agent spawning and coordination
2. **Git Branch Auto-Merge** - All phase outputs merge to main automatically
3. **Phase 3 Post-Processing** - Merge → Deduplicate → Reorder → Build registry
4. **Phase 5 Output Extraction** - Provisional files → individual seeds (NEW)
5. **Phase 5 GATE Validation** - Runs automatically after extraction (NEW)
6. **Resume Detection** - Skips completed phases intelligently
7. **Phase 6 & 7 Generation** - Auto-triggered after Phase 5

### ⚠️ Critical Gaps

#### **Priority 1: Phase 5 Quality Control**
The GATE validator catches vocabulary violations, but we're not:
- ❌ Running format validation (phrase_distribution compliance)
- ❌ Running window coverage validation (70% from recent seeds)
- ❌ Running LEGO recombination checks
- ❌ Removing violations automatically (scripts exist but unused)
- ❌ Checking quality thresholds before proceeding

**Impact:** Bad practice phrases make it into final course

**Fix Required:**
```javascript
// After GATE validation in automation_server.cjs (line ~2240)
await runAllPhase5Validators(baseCourseDir, seedFiles);
if (gateCompliance < 85) {
  await removeGateViolations(baseCourseDir, seedFiles);
}
```

#### **Priority 2: Checkpoint Gating System**
The `CHECKPOINT_MODE` is defined but only 'manual' works:
- ❌ 'gated' mode not implemented (should auto-run with validation gates)
- ❌ Validation thresholds never checked
- ❌ No automatic stopping when quality drops

**Impact:** Can't run pipeline unattended with quality assurance

**Fix Required:**
```javascript
// Phase 3 checkpoint (line 2466)
if (CONFIG.CHECKPOINT_MODE === 'gated') {
  const validation = await validatePhase3Quality(courseDir);
  if (validation.error_rate > CONFIG.VALIDATION_THRESHOLDS.phase3_error_rate) {
    job.status = 'paused';
    return; // Stop pipeline
  }
}
```

#### **Priority 3: Phase 5 Additional Validators**
Currently only GATE runs. Should also run:
- `phase5_validate_baskets.cjs` - Format/distribution compliance
- `phase5_validate_window_coverage.cjs` - Spaced repetition check
- `phase5_validate_lego_coverage.cjs` - LEGO usage patterns
- `phase5_validate_lego_recombination.cjs` - Creativity check

**Impact:** Can catch format issues, bad distributions, poor recombination

#### **Priority 4: Phase 8 Audio & Deployment**
Currently stubbed out with TODOs:
- ❌ Audio generation not implemented (line 9549)
- ❌ S3 deployment not implemented (line 9619)

**Impact:** Manual steps required to publish course

---

## Implementation Priority

### Sprint 1: Quality Gates (Highest ROI)
1. Add all Phase 5 validators to automation server
2. Implement 'gated' checkpoint mode with thresholds
3. Add Phase 3 validation (detect malformed LEGOs)
4. Auto-removal of violations when compliance < threshold

**Outcome:** Pipeline can run unattended with quality assurance

### Sprint 2: Phase 8 Completion
1. Integrate audio generation API calls
2. Integrate S3 upload logic
3. Add deployment verification

**Outcome:** Fully automated end-to-end pipeline

### Sprint 3: Robustness
1. Agent failure detection & retry logic
2. Notification system (Slack/email on validation failures)
3. Rollback capability if quality drops
4. Progress dashboards with quality metrics

**Outcome:** Production-grade reliability

---

## Detailed Gap Analysis

### Phase 1: Translation ✅ Mostly Complete
- ✅ Agent orchestration
- ✅ Resume detection
- ⚠️ No translation quality validation
- **Recommendation:** Add spot-check validation (sample 10 seeds, check for completeness)

### Phase 3: LEGO Extraction ✅ Mostly Complete
- ✅ Agent orchestration
- ✅ Branch merge + post-processing
- ⚠️ Validation TODO'd out (line 2466)
- **Recommendation:** Implement Phase 3 validator to check:
  - All seeds have LEGOs
  - LEGO format valid (type, components, etc)
  - No duplicate LEGO IDs after merge

### Phase 5: Practice Baskets ⚠️ Needs Work
- ✅ Scaffolds, orchestration, merge
- ✅ GATE validator (NEW - just added!)
- ❌ Format validator (distribution compliance)
- ❌ Window coverage validator (spaced repetition)
- ❌ LEGO coverage validator
- ❌ Grammar review not automated
- ❌ Compact format not automated
- **Recommendation:** Priority 1 - Add all validators in sequence

### Phase 6: Introductions ⚠️ Works But Unvalidated
- ✅ Auto-generates
- ❌ No validation (should check all LEGOs introduced)
- **Recommendation:** Add validator to check complete LEGO coverage

### Phase 7: Compilation ⚠️ Needs Enhancement
- ✅ Auto-generates
- ⚠️ TODO comment: "Enhance to match spec" (line 9266)
- **Recommendation:** Review Phase 7 spec, ensure full compliance

### Phase 8: Audio & Deployment ❌ Not Implemented
- ❌ Audio generation stubbed (line 9549)
- ❌ Deployment stubbed (line 9619)
- **Recommendation:** Sprint 2 priority

---

## Quality Threshold Recommendations

### Phase 3 Validation
```javascript
{
  phase3_error_rate: 0.05,  // Max 5% seeds with LEGO errors
  phase3_duplicate_rate: 0.02  // Max 2% duplicate LEGOs
}
```

### Phase 5 Validation
```javascript
{
  phase5_gate_compliance: 0.85,  // Min 85% GATE compliance
  phase5_window_coverage: 0.70,  // Min 70% from recent seeds
  phase5_distribution_compliance: 0.95,  // Min 95% correct distribution
  phase5_quality_score: 0.90  // Min 90% combined quality
}
```

---

## Validator Integration Pattern

**Current (Phase 5):**
```javascript
// After extraction
await mergePhase5Outputs(baseCourseDir);

// Run GATE validator
const gateResult = await execCommand(`node scripts/phase5_gate_validator.cjs ...`);
const compliance = extractCompliance(gateResult.stdout);
console.log(`✅ GATE Validation: ${compliance}%`);
```

**Recommended Pattern (All Phases):**
```javascript
async function runPhase5Validation(baseCourseDir, seedFiles) {
  console.log('[Validation] Running all Phase 5 validators...');

  const results = {
    gate: await runGateValidator(baseCourseDir, seedFiles),
    format: await runFormatValidator(baseCourseDir, seedFiles),
    window: await runWindowValidator(baseCourseDir),
    coverage: await runCoverageValidator(baseCourseDir),
    recombination: await runRecombinationValidator(baseCourseDir)
  };

  // Aggregate results
  const overallQuality = calculateQualityScore(results);

  if (overallQuality < CONFIG.VALIDATION_THRESHOLDS.phase5_quality_score) {
    throw new ValidationError(`Quality ${overallQuality} below threshold`);
  }

  return results;
}
```

---

## Success Metrics

### Sprint 1 Complete When:
- [ ] All Phase 5 validators run automatically
- [ ] 'gated' checkpoint mode works
- [ ] Phase 3 validation implemented
- [ ] Pipeline stops when quality < threshold
- [ ] Auto-removal of violations works

### Sprint 2 Complete When:
- [ ] Audio generation runs automatically
- [ ] S3 deployment runs automatically
- [ ] Can generate complete course end-to-end without manual steps

### Sprint 3 Complete When:
- [ ] Agent failures auto-retry
- [ ] Slack notifications on failures
- [ ] Dashboard shows quality metrics in real-time
- [ ] Can rollback to previous version if quality drops

---

## Quick Wins (Can Implement Now)

1. **Add format validator to Phase 5** (~30 min)
   - Just add `phase5_validate_baskets.cjs` call after GATE

2. **Add window coverage validator** (~30 min)
   - Add `phase5_validate_window_coverage.cjs` call

3. **Implement Phase 3 validator** (~1 hour)
   - Check LEGO format validity, no duplicates

4. **Enable auto-removal of GATE violations** (~30 min)
   - Run `phase5_remove_gate_violations.cjs` when compliance < 85%

Total: **~2.5 hours** to close the most critical gaps!

---

## References

- Automation Server: `/automation_server.cjs`
- Phase 5 Validators: `/scripts/phase5_*.cjs`
- Checkpoint Config: `automation_server.cjs` lines 43-70
- TODOs: Lines 2466, 9266, 9549, 9619
