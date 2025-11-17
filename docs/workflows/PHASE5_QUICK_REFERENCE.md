# Phase 5: Quick Reference

**30 steps from detection to deployment**

---

## 🚀 Quick Launch

```bash
# 1. Detect missing
node scripts/detect_missing_baskets_new_only.cjs cmn_for_eng

# 2. Divide patches
node scripts/universal_12master_orchestration/divide_into_patches.cjs cmn_for_eng phase5

# 3. Generate prompts
node scripts/universal_12master_orchestration/generate_master_prompts.cjs cmn_for_eng phase5

# 4. Launch masters
./scripts/phase5_launch_12_masters.sh
```

---

## 📊 The 30 Steps

### PRE-LAUNCH (Manual - 4 steps)
1. **Detect missing baskets** → `phase5_missing_baskets_new_only.json`
2. **Divide into patches** → `phase5_patch_manifest.json`
3. **Generate prompts** → 12 master prompts
4. **Launch masters** → 12 browser tabs

### MASTER WORKFLOW (Auto - 4 steps × 12)
5. **Read LEGO list** → Parse from prompt
6. **Create scaffolds** → `phase5_scaffolds/` (1,497 files)
7. **Batch LEGOs** → ~20 batches per master
8. **Spawn sub-agents** → 20 agents per master

### SUB-AGENT WORKFLOW (Auto - 9 steps × 240)
9. **Read assignment** → 10 LEGOs
10. **Read scaffolds** → Load 10 scaffolds
11. **Generate baskets** → 10 phrases per LEGO (LOOP)
12. **Grammar self-check** → 7-point validation
13. **Save basket** → In-memory collection
14. **Group by seed** → Organize by parent seed
15. **Write files** → `phase5_outputs/seed_SXXXX_baskets.json`
16. **Git commit** → Local commit (no push)
17. **Report to master** → Success/failure

### MASTER MONITORING (Auto - 4 steps × 12)
18. **Monitor sub-agents** → Track 20 agents
19. **Handle failures** → Respawn if needed
20. **Batch git push** → Push all commits
21. **Final report** → Summary in browser

### POST-COMPLETION (Manual - 9 steps)
22. **Wait for masters** → All 12 tabs complete
23. **Run GATE validator** → Check untaught vocab
24. **Run LUT validator** → Check learner uncertainty
25. **Run grammar validator** → Sample review
26. **Fix violations** → Delete bad phrases
27. **Merge baskets** → Into `lego_baskets.json`
28. **Final commit** → Push merged file
29. **Cleanup outputs** → Archive/delete temp files
30. **Sync to S3** → Production deployment

---

## 🔄 Loops

**Master Loop**: 20 iterations → spawn 20 sub-agents
**Sub-agent Loop**: 10 iterations → process 10 LEGOs → generate 100 phrases

---

## 📁 Key Files

| File | Purpose | Created By |
|------|---------|------------|
| `phase5_missing_baskets_new_only.json` | Missing LEGO list | Step 1 |
| `phase5_patch_manifest.json` | 12-patch division | Step 2 |
| `scripts/phase5_master_prompts/*.md` | Master prompts | Step 3 |
| `phase5_scaffolds/scaffold_*.json` | Scaffolds | Step 6 (×1,497) |
| `phase5_outputs/seed_*.json` | Generated baskets | Step 15 (×340) |
| `lego_baskets.json` | Final merged output | Step 27 |

---

## ⚡ Parallelization

- **12 masters** work simultaneously
- **20 sub-agents** per master = **240 concurrent workers**
- **Total throughput**: ~15,000 phrases in ~5 hours

---

## ✅ Validation

**Sub-agent self-check** (Step 12):
1. Word order ✓
2. Verb choice ✓
3. Particle placement ✓
4. Completeness ✓
5. Formality ✓
6. GATE compliance ✓
7. Naturalness ✓

**Post-generation** (Steps 23-25):
- GATE validator → `phase5_gate_violations.json`
- LUT validator → `phase5_lut_uncertainties.json`
- Grammar validator → `phase5_grammar_review.json`

---

## 🔧 Tools

| Tool | Purpose |
|------|---------|
| `detect_missing_baskets_new_only.cjs` | Find missing LEGOs |
| `divide_into_patches.cjs` | Create 12 patches |
| `generate_master_prompts.cjs` | Generate 12 prompts |
| `launch_12_masters.sh` | Open browser tabs |
| `phase5_gate_validator_v2.cjs` | GATE validation |
| `phase5_lut_validator.cjs` | LUT validation |
| `phase5_grammar_review_v2.cjs` | Grammar review |
| `phase5_delete_bad_phrases.cjs` | Fix violations |
| `phase5_merge_batches.cjs` | Merge outputs |
| `sync-course-to-s3.cjs` | Deploy to S3 |

---

## 🎯 Success Criteria

✅ All 12 masters complete
✅ ~15,000 phrases generated
✅ GATE compliance >99%
✅ LUT certainty >99%
✅ Grammar review passes
✅ Merged into `lego_baskets.json`
✅ Deployed to S3

---

## 📈 Metrics

**Input**: 1,497 missing LEGOs
**Output**: ~14,970 practice phrases (10 per LEGO)
**Files**: 340 seed basket files
**Workers**: 12 masters + 240 sub-agents
**Time**: ~5 hours (parallel execution)
**Quality**: 99%+ compliance (GATE + LUT + Grammar)

---

**Full details**: `docs/workflows/PHASE5_COMPLETE_WORKFLOW.md`
