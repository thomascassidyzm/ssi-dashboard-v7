# Phase Intelligence Files - Deprecation Plan
**Date**: 2025-11-09
**Status**: Ready for cleanup

## Currently Active (7 files - DO NOT DELETE)

These are loaded by automation_server.cjs (lines 64-72):

1. ✅ **phase_1_orchestrator.md** - Phase 1: Pedagogical Translation
2. ✅ **phase_3_lego_pairs.md** - Phase 3: LEGO Extraction (JUST UPDATED)
3. ✅ **phase_5_lego_baskets.md** - Phase 5: Practice Baskets
4. ✅ **phase_5.5_basket_deduplication.md** - Phase 5.5: Deduplication
5. ✅ **phase_6_introductions.md** - Phase 6: Introductions
6. ✅ **phase_7_compilation.md** - Phase 7: Compilation
7. ✅ **phase_8_audio_generation.md** - Phase 8: Audio Generation

## Deprecated - Safe to Archive (21 files)

### Old Phase 5 Iterations (8 files)
- `AGENT_PROMPT_phase5_v4.1_STAGED_SCAFFOLD.md` - Old version
- `AGENT_PROMPT_phase5_basket_generation_v4_VALIDATED.md` - Old version
- `phase_5_conversational_baskets_v3_ACTIVE.md` - Superseded by phase_5_lego_baskets.md
- `phase_5_conversational_baskets_v2_PROPOSED.md` - Old proposal
- `Phase_5_baskets_process.md` - Process doc (not prompt)
- `phase_5_orchestrator.md` - Superseded by phase_5_lego_baskets.md
- `phase_5_improved_prompt.md` - Old iteration
- `learnings_phase_5.md` - Historical learnings (keep for reference?)

### Old Phase 3 Iterations (3 files)
- `phase_3_orchestrator.md` - Superseded by phase_3_lego_pairs.md
- `phase_3_lego_pattern_extraction.md` - Old version
- `phase_3_v5_migration_guide.md` - Migration doc (archive)
- `phase_3.5_lego_graph.md` - Phase 3.5 (do we use this?)

### Old Phase 1 Iterations (2 files)
- `phase_1_validator.md` - Validator (not orchestrator)
- `phase_1_seed_pairs.md` - Superseded by phase_1_orchestrator.md

### Old Phase 4/6 (3 files)
- `phase_4_batch_preparation.md` - Do we use Phase 4?
- `phase_4b_lego_decomposition_validation.md` - Old validation
- `phase_6_orchestrator.md` - Superseded by phase_6_introductions.md

### Miscellaneous (5 files)
- `phase_2_corpus_intelligence.md` - Phase 2 (do we use this?)
- `dashboard_master_agent.md` - Dashboard agent (what is this?)
- `S0001_S0050_validation_report.md` - Validation report (archive)
- `README.md` - Index file (keep for reference)
- `en-ga-demo (1).json` - Demo file (not markdown)

## Recommended Actions

### Keep (Active + Reference)
- All 7 active phase files ✅
- `README.md` (index/reference)
- `learnings_phase_5.md` (historical context)

### Archive to archive/phase_intelligence/
- All old iterations (v2, v3, v4, etc.)
- Migration guides
- Validation reports
- Old orchestrator files

### Delete
- `en-ga-demo (1).json` (if not needed)

## Archive Command

```bash
cd /Users/tomcassidy/SSi/ssi-dashboard-v7-clean/docs/phase_intelligence
mkdir -p ../../archive/phase_intelligence

# Archive old iterations
mv AGENT_PROMPT_phase5_v4.1_STAGED_SCAFFOLD.md ../../archive/phase_intelligence/
mv AGENT_PROMPT_phase5_basket_generation_v4_VALIDATED.md ../../archive/phase_intelligence/
mv phase_5_conversational_baskets_v3_ACTIVE.md ../../archive/phase_intelligence/
mv phase_5_conversational_baskets_v2_PROPOSED.md ../../archive/phase_intelligence/
mv Phase_5_baskets_process.md ../../archive/phase_intelligence/
mv phase_5_orchestrator.md ../../archive/phase_intelligence/
mv phase_5_improved_prompt.md ../../archive/phase_intelligence/

mv phase_3_orchestrator.md ../../archive/phase_intelligence/
mv phase_3_lego_pattern_extraction.md ../../archive/phase_intelligence/
mv phase_3_v5_migration_guide.md ../../archive/phase_intelligence/
mv phase_3.5_lego_graph.md ../../archive/phase_intelligence/

mv phase_1_validator.md ../../archive/phase_intelligence/
mv phase_1_seed_pairs.md ../../archive/phase_intelligence/

mv phase_4_batch_preparation.md ../../archive/phase_intelligence/
mv phase_4b_lego_decomposition_validation.md ../../archive/phase_intelligence/
mv phase_6_orchestrator.md ../../archive/phase_intelligence/

mv phase_2_corpus_intelligence.md ../../archive/phase_intelligence/
mv dashboard_master_agent.md ../../archive/phase_intelligence/
mv S0001_S0050_validation_report.md ../../archive/phase_intelligence/

# Delete demo file if not needed
rm "en-ga-demo (1).json"
```

## After Archiving

**Remaining files** (should be ~9):
- phase_1_orchestrator.md
- phase_3_lego_pairs.md
- phase_5_lego_baskets.md
- phase_5.5_basket_deduplication.md
- phase_6_introductions.md
- phase_7_compilation.md
- phase_8_audio_generation.md
- README.md
- learnings_phase_5.md (optional)

Clean, current, and maintainable! ✨
