# Root Directory Cleanup Plan

**Current State**: 104 loose files in root directory
**Target**: Keep only essential project files

---

## Files to KEEP in Root (Essential)

### Core Project Files (8)
1. **package.json** - NPM dependencies
2. **package-lock.json** - Dependency lock
3. **vite.config.js** - Vite build config
4. **tailwind.config.js** - Tailwind CSS config
5. **postcss.config.js** - PostCSS config
6. **vercel.json** - Vercel deployment config
7. **ecosystem.config.cjs** - PM2 process manager config
8. **README.md** - Main project README

### Current System Files (4)
9. **SYSTEM.md** - System overview (current)
10. **automation_server.cjs** - Active automation server
11. **orchestrator-prompt-helpers.cjs** - Active helper functions
12. **generate-course-manifest.js** - Active manifest generator

### Recent Cleanup Docs (4)
13. **CLEANUP_BRIEF.md** - Cleanup instructions (just created)
14. **CLEANUP_INVENTORY.md** - Cleanup audit (just created)
15. **CLEANUP_REPORT.md** - Cleanup report (just created)
16. **CHANGELOG_v8.0.0.md** - Version changelog (just created)

### Current Architecture Docs (3)
17. **COURSE_FILE_PROTOCOLS.md** - Current protocols
18. **LEGO_PAIRS_DATA_FLOW_ANALYSIS.md** - Current analysis
19. **orchestrator-workflow.cjs** - Current workflow

**TOTAL TO KEEP: 20 files**

---

## Files to ARCHIVE (84 files)

### Category: Agent Status Reports (10 files)
- AGENT_04_STATUS.md
- AGENT_06_COMPLETION_REPORT.md
- AGENT_14_COMPLETION_REPORT.md
- AGENT_PERFORMANCE_REVIEW.md
- AI_OS_MORNING_BRIEF.md
- BATCH2_MONITORING.md
- BATCH2_STATUS_REPORT.md
- BRANCH_STATUS_BATCH2.md
- MERGE_COMPLETE.md
- PROJECT_PROGRESS_OVERVIEW.md

### Category: Basket Generation Scripts (18 files)
- agent_07_phase5_generator.cjs
- extend_all_baskets.cjs
- extend_baskets.js
- final_extend_baskets.cjs
- gen_agent_02_baskets.cjs
- gen_agent_06_baskets.cjs
- gen_agent_07_baskets.cjs
- gen_agent_08_baskets.cjs
- gen_agent_09_baskets.cjs
- generate_agent_10_baskets.cjs
- generate_agent_14_baskets_corrected.cjs
- generate_agent_14_baskets.js
- generate_complete_agent_14_baskets.cjs
- orchestrate_basket_generation.cjs
- spawn_claude_web_agent.cjs
- extract_fd_violations.cjs
- apply_s0011_fixes.cjs
- build_vocabulary_whitelist.cjs

### Category: Basket Generation Reports (13 files)
- BASKET_CURATION_LEARNINGS.md
- BASKET_DISPLAY_ARCHITECTURE.md
- BASKET_GENERATION_QUALITY_ISSUES.md
- BASKET_GENERATION_REPORT_S0041_S0045.md
- BASKET_GENERATION_STATUS.md
- BATCH2_PHRASE_QUALITY_REVIEW.md
- BATCH2_QUALITY_ASSESSMENT.md
- BATCH2_SCRIPTING_ANALYSIS.md
- GENERATE_ALL_BASKETS.md
- PHASE5_BASKET_GENERATION_LAUNCH.md
- PHASE5_BATCH1_ERROR_ANALYSIS.md
- PHASE5_BATCH1_FINAL_STATUS.md
- PHASE5_TASK_DECOMPOSITION.md

### Category: Phase 5 Demo Files (5 files)
- phase5_v2_demo_output_s0011l01.md
- phase5_v2_demo_prompt_s0011l01.md
- phase5_v2_demo_s0011l04_violations.md
- PHASE5_V2_DEMONSTRATION_SUMMARY.md
- PHASE5_WEB_AGENTS_USAGE.md

### Category: S0011 Specific Files (5 files)
- s0011_basket_fixes.md
- s0011_baskets_v2_corrected.json
- S0011_COMPLETION_REPORT.md
- s0011_validation_results.json
- vocabulary_whitelist_s0011.json

### Category: Deprecated Architecture Docs (11 files)
- AUTOMATION_SETUP.md
- AUTOMATION_UPDATE_V7.6.md
- BROWSER_AUTOMATION_INTEGRATION.md
- CLAUDE_CODE_FINAL_SOLUTION.md
- CLAUDE_CODE_WEB_GITHUB_INTEGRATION.md
- EXECUTION_MODES_IMPLEMENTATION.md
- SIMPLE_GITHUB_TRIGGER_STRATEGY.md
- REMOTE_CLAUDE_CODE_TRIGGER.md
- STAGED_PIPELINE_IMPLEMENTATION.md
- WORKFLOW_INSTRUCTIONS.md
- DASHBOARD_ARCHITECTURE_ANALYSIS.md

### Category: Deprecated Setup/Strategy Docs (9 files)
- CLEANUP_PLAN.md (superseded by CLEANUP_BRIEF.md)
- FIXED_TONIGHT.md
- KAI_SETUP.md
- MASTER_PROMPT_IMPROVEMENT_PLAN.md
- MERGE_STRATEGY.md
- NEXT_SESSION_SETUP.md
- PM2_SETUP.md
- QUICK_START.md
- README_ORCHESTRATION.md

### Category: Phase Documentation (Old) (5 files)
- PHASE1_ORCHESTRATION_INTEGRATION.md
- PHASE1_QUICK_START.md
- PHASE3_VS_PHASE5_COMPARISON.md
- OVERBOOK_WORKFLOW.md
- RECURSIVE_UPREGULATION_STATUS.md

### Category: Utility Scripts (5 files)
- compact-json-formatter.cjs
- configure-s3-cors.cjs
- migrate_feeder_parent_ids.cjs
- validate_extraction.js
- test_v5_1_api.js

### Category: Misc/Examples (3 files)
- automation_server_UPDATED.cjs (old version)
- example_overbook_s0010l05.json
- STORAGE_STRATEGY.md
- SKILLS_TRANSFORMATION.md

---

## Archive Structure

```
archive/
└── pre-v8.0.0/
    ├── agent-reports/          (10 files)
    ├── basket-generation/      (18 scripts + 13 reports)
    ├── phase5-demos/           (5 files)
    ├── s0011-specific/         (5 files)
    ├── deprecated-docs/        (11 files)
    ├── old-setup-docs/         (9 files)
    ├── phase-docs/             (5 files)
    ├── utility-scripts/        (5 files)
    └── misc/                   (4 files)
```

**TOTAL TO ARCHIVE: 84 files**

---

## Execution Plan

1. Create archive directory structure
2. Move files to appropriate archive folders
3. Verify only 20 essential files remain in root
4. Git commit archive changes
5. Update .gitignore if needed

---

## Benefits

- ✅ Clean root directory (20 vs 104 files)
- ✅ Historical files preserved in archive
- ✅ Easy to find current vs old documentation
- ✅ Professional repository structure
- ✅ Ready for APML SSoT creation
