# ✅ READY TO RUN - 100 Seed Overnight Pipeline

## 🎉 All Intelligence Docs Fixed!

The orchestrator intelligence docs now correctly reference the actual phase intelligence:

### Phase 1 Orchestrator → Phase 1 Worker Intelligence
- **Orchestrator reads**: `docs/phase_intelligence/phase_1_orchestrator.md` ✅
- **Workers read**: `docs/phase_intelligence/phase_1_seed_pairs.md` v2.6 ✅
- **Includes**: TWO ABSOLUTE RULES, cognate preference, zero variation, extended thinking, [known, target] format

### Phase 3 Orchestrator → Phase 3 Worker Intelligence
- **Orchestrator reads**: `docs/phase_intelligence/phase_3_orchestrator.md` ✅
- **Workers read**: `docs/phase_intelligence/phase_3_lego_pairs.md` ✅
- **Includes**: TILING FIRST, components [target, known], all other arrays [known, target]

### Phase 5 Orchestrator → Phase 5 Worker Intelligence
- **Orchestrator reads**: `docs/phase_intelligence/phase_5_orchestrator.md` ✅
- **Workers read**: `docs/phase_intelligence/phase_5_lego_baskets.md` v6.1 ✅
- **Includes**: Sliding window, 70% coverage (excluding new vocab), meaningful utterances, [known, target] format

---

## 🚀 Start Your Overnight Run

```bash
cd /Users/tomcassidy/SSi/ssi-dashboard-v7-clean

# Step 1: Prepare Phase 1 batches (automated)
bash scripts/OVERNIGHT_AUTO_100.sh
```

This will:
1. Create `spa_for_eng_s0001-0100` course directory
2. Create `cmn_for_eng_s0001-0100` course directory
3. Prepare 3 orchestrator batches for each (seeds 1-100)

---

## 📋 What Happens Next

### Manual Steps (Orchestrators)

You'll need to manually run orchestrators at 3 points:

1. **Phase 1** (Translation) - 6 orchestrators total
   - 3 for Spanish (each handles ~33 seeds)
   - 3 for Chinese (each handles ~33 seeds)

2. **Phase 3** (LEGO Extraction) - 6 orchestrators total
   - 3 for Spanish
   - 3 for Chinese

3. **Phase 5** (Practice Baskets) - Can be batched
   - 100 scaffolds for Spanish
   - 100 scaffolds for Chinese

### Automated Steps (Post-Processing)

Between orchestrator runs:
- `bash scripts/prepare_phase3_batches.sh` (after Phase 1)
- `bash scripts/phase3_postprocess.sh` (after Phase 3)
- `bash scripts/prepare_phase5_scaffolds.sh` (after Phase 3 postprocess)
- `bash scripts/phase5_postprocess.sh` (after Phase 5)

---

## 🎯 Intelligence Flow Confirmed

**For Spanish Course:**

```
Master Orchestrator
  ↓ reads phase_1_orchestrator.md
Phase 1 Orchestrator #1 (seeds 1-33)
  ↓ spawns 10 sub-agents
Sub-Agent 1-10 (each reads phase_1_seed_pairs.md v2.6)
  ↓ applies cognate-first for Spanish
  ↓ uses extended thinking
  ↓ outputs [known, target] format
Translations: cognate-optimized Spanish
```

**For Chinese Course:**

```
Master Orchestrator
  ↓ reads phase_1_orchestrator.md
Phase 1 Orchestrator #1 (seeds 1-33)
  ↓ spawns 10 sub-agents
Sub-Agent 1-10 (each reads phase_1_seed_pairs.md v2.6)
  ↓ applies simplicity-first for Chinese
  ↓ uses extended thinking
  ↓ outputs [known, target] format
Translations: simplicity-optimized Chinese
```

---

## ✅ All Learnings Incorporated

### Phase 1 (Translation)
- ✅ Cognate-first for Romance languages (Spanish)
- ✅ Simplicity-first for logographic languages (Chinese)
- ✅ Zero variation principle (first word wins)
- ✅ Extended thinking for every seed
- ✅ Array format: [known, target]
- ✅ Grammar validation
- ✅ Semantic preservation

### Phase 3 (LEGO Extraction)
- ✅ TILING FIRST principle
- ✅ Components: [target, known] (for teaching)
- ✅ All other arrays: [known, target]
- ✅ Functional determinism
- ✅ A-before-M ordering

### Phase 5 (Practice Baskets)
- ✅ Sliding window (recent 10 seeds)
- ✅ Window coverage ≥70% (excluding new LEGO vocab)
- ✅ Meaningful utterances (not mechanical patterns)
- ✅ 12-15 phrases per LEGO
- ✅ Progressive complexity
- ✅ Grammar review
- ✅ Compact format
- ✅ Array format: [known, target]

---

## 📊 Expected Outputs

After ~6-8 hours, you'll have:

### Spanish Course (spa_for_eng_s0001-0100)
```
public/vfs/courses/spa_for_eng_s0001-0100/
├── seed_pairs.json (100 cognate-optimized translations)
├── phase3_outputs/
│   └── lego_pairs_deduplicated_final.json (~300-500 LEGOs)
└── phase5_outputs/
    ├── seed_s0001.json (12-15 practice phrases)
    ├── seed_s0002.json
    └── ... (100 basket files total)
```

### Chinese Course (cmn_for_eng_s0001-0100)
```
public/vfs/courses/cmn_for_eng_s0001-0100/
├── seed_pairs.json (100 simplicity-optimized translations)
├── phase3_outputs/
│   └── lego_pairs_deduplicated_final.json (~300-500 LEGOs)
└── phase5_outputs/
    ├── seed_s0001.json (12-15 practice phrases)
    ├── seed_s0002.json
    └── ... (100 basket files total)
```

---

## 🎉 You're Ready!

All intelligence docs are fixed and properly linked. The pipeline will:

1. ✅ Use the correct Phase 1 v2.6 methodology
2. ✅ Apply cognate preference for Spanish
3. ✅ Apply simplicity for Chinese
4. ✅ Enforce [known, target] format everywhere
5. ✅ Use sliding window with proper exclusions
6. ✅ Validate window coverage correctly
7. ✅ Generate natural, meaningful practice phrases

**Start with:**
```bash
bash scripts/OVERNIGHT_AUTO_100.sh
```

Then follow the prompts and helper scripts!

**Good luck! 🚀**
