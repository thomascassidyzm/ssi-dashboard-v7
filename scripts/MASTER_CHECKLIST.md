# 100-Seed Generation Master Checklist

Use this checklist to track your overnight run progress.

---

## ✅ Pre-Flight Checks

- [ ] Canonical seeds API is accessible
- [ ] Phase intelligence docs are up to date (v6.1)
- [ ] Array order convention documented everywhere
- [ ] Window coverage validator excludes new vocabulary
- [ ] Compact format script ready
- [ ] All helper scripts are executable

---

## 📋 Execution Checklist

### Phase 1: Translation Setup
- [ ] Run `bash scripts/OVERNIGHT_AUTO_100.sh`
- [ ] Verify Spanish batches created (3 files)
- [ ] Verify Chinese batches created (3 files)

### Phase 1: Orchestrator Execution ⏰ MANUAL (~1-2 hours)
- [ ] Run Spanish orchestrator 1 (seeds 1-33)
- [ ] Run Spanish orchestrator 2 (seeds 34-66)
- [ ] Run Spanish orchestrator 3 (seeds 67-100)
- [ ] Run Chinese orchestrator 1 (seeds 1-33)
- [ ] Run Chinese orchestrator 2 (seeds 34-66)
- [ ] Run Chinese orchestrator 3 (seeds 67-100)

### Phase 1: Validation
- [ ] Spanish seed_pairs.json exists (100 seeds)
- [ ] Chinese seed_pairs.json exists (100 seeds)
- [ ] Spot-check S0001-S0010 in both languages
- [ ] Verify array format: `[known, target]`
- [ ] Spanish uses cognates (frecuentemente, intentar)
- [ ] Chinese uses simple characters

---

### Phase 3: LEGO Setup
- [ ] Run `bash scripts/prepare_phase3_batches.sh`
- [ ] Verify Spanish Phase 3 batches created
- [ ] Verify Chinese Phase 3 batches created

### Phase 3: Orchestrator Execution ⏰ MANUAL (~2-3 hours)
- [ ] Run Spanish Phase 3 orchestrators
- [ ] Run Chinese Phase 3 orchestrators

### Phase 3: Post-Processing
- [ ] Run `bash scripts/phase3_postprocess.sh`
- [ ] Verify lego_pairs_deduplicated_final.json (Spanish)
- [ ] Verify lego_pairs_deduplicated_final.json (Chinese)
- [ ] Check LEGO count (~300-500 per language)
- [ ] Verify components use `[target, known]` format
- [ ] Verify all other arrays use `[known, target]` format

---

### Phase 5: Scaffold Setup
- [ ] Run `bash scripts/prepare_phase5_scaffolds.sh`
- [ ] Verify 100 scaffold files created (Spanish)
- [ ] Verify 100 scaffold files created (Chinese)
- [ ] Spot-check sliding window is correct (10 recent seeds)

### Phase 5: Orchestrator Execution ⏰ MANUAL (~2-3 hours)
- [ ] Run Spanish basket generation (100 seeds, batch in groups of 10-20)
- [ ] Run Chinese basket generation (100 seeds, batch in groups of 10-20)

### Phase 5: Post-Processing & Validation
- [ ] Run `bash scripts/phase5_postprocess.sh`
- [ ] Review window coverage report (Spanish)
- [ ] Review window coverage report (Chinese)
- [ ] Review gate validation report (Spanish)
- [ ] Review gate validation report (Chinese)
- [ ] Check compact format applied (one line per phrase)
- [ ] Verify array order convention enforced

---

## 🎯 Quality Validation

### Spanish Course (spa_for_eng_s0001-0100)
- [ ] Window coverage: ≥70% for 90%+ of seeds
- [ ] Cognate preference visible in early seeds
- [ ] Practice phrases are natural and meaningful
- [ ] Progressive complexity evident
- [ ] No unavailable vocabulary violations

### Chinese Course (cmn_for_eng_s0001-0100)
- [ ] Window coverage: ≥70% for 90%+ of seeds
- [ ] Simple characters in early seeds
- [ ] High-frequency patterns used
- [ ] Practice phrases make sense
- [ ] Progressive complexity evident

### Cross-Language Comparison
- [ ] Spanish uses cognates, Chinese uses simplicity
- [ ] Both follow zero-variation principle
- [ ] Sliding window vocabulary reuse works in both
- [ ] Array format consistent across both
- [ ] Pedagogical principles applied consistently

---

## 📊 Final Deliverables

### Spanish (spa_for_eng_s0001-0100)
- [ ] seed_pairs.json (100 translations)
- [ ] lego_pairs_deduplicated_final.json (~300-500 LEGOs)
- [ ] 100 basket files (seed_s0001.json - seed_s0100.json)
- [ ] All validation reports passing

### Chinese (cmn_for_eng_s0001-0100)
- [ ] seed_pairs.json (100 translations)
- [ ] lego_pairs_deduplicated_final.json (~300-500 LEGOs)
- [ ] 100 basket files (seed_s0001.json - seed_s0100.json)
- [ ] All validation reports passing

### Documentation
- [ ] All logs saved and organized
- [ ] Window coverage reports reviewed
- [ ] Gate validation reports reviewed
- [ ] Quality spot-checks completed
- [ ] Issues documented (if any)

---

## 🐛 Known Issues Tracker

**Use this section to note any problems during the run:**

### Phase 1 Issues
```
(none yet)
```

### Phase 3 Issues
```
(none yet)
```

### Phase 5 Issues
```
(none yet)
```

---

## ⏱️ Time Tracking

| Phase | Start Time | End Time | Duration | Status |
|-------|------------|----------|----------|--------|
| Phase 1 Setup | | | | ⬜ |
| Phase 1 Orchestrators | | | | ⬜ |
| Phase 3 Setup | | | | ⬜ |
| Phase 3 Orchestrators | | | | ⬜ |
| Phase 3 Post-Processing | | | | ⬜ |
| Phase 5 Setup | | | | ⬜ |
| Phase 5 Orchestrators | | | | ⬜ |
| Phase 5 Post-Processing | | | | ⬜ |
| **TOTAL** | | | | ⬜ |

---

## 🎉 Completion Sign-Off

When everything is ✅:

**Date completed**: _______________

**Total seeds generated**: 200 (100 Spanish + 100 Chinese)

**Total time**: _______________

**Notes**:
```
(Add any observations, learnings, or improvements for next time)
```

---

**You're ready to go! Start with:**
```bash
cd /Users/tomcassidy/SSi/ssi-dashboard-v7-clean
bash scripts/OVERNIGHT_AUTO_100.sh
```
