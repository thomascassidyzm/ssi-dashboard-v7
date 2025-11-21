# Root Directory Cleanup - 2025-11-20

## Files Moved to Archive

### Deprecated Orchestration Files
- `automation_server.cjs` - Deprecated monolithic automation (replaced by microservices)
- `orchestrator-workflow.cjs` - Old orchestrator
- `orchestrator-prompt-helpers.cjs` - Old orchestrator helpers
- `spawn_claude_web_agent.cjs` - Experimental agent spawner

### Duplicate/Old Configuration Files  
- `automation.config.simple.json` - Test config
- `automation.config.tom.json` - Personal config
- `ecosystem.config.cjs.MODULAR_BACKUP` - Backup
- `ecosystem.config.js` - Old version (keeping ecosystem.config.cjs)
- `ecosystem.config.kai.cjs` - Personal config

### Deprecated Tools (should have been in tools/)
- `course-analyzer.cjs` 
- `course-validator.cjs`
- `phase-deep-validator.cjs`
- `generate-course-manifest.js`

### Merge Scripts (deprecated)
- `merge_all_basket_branches.cjs`
- `merge_phase3_chunk01.js`
- `merge_phase3_v7_segments.js`

### Phase 5 Experimental Scripts (30+ files)
All `phase5_*.cjs` and `phase5_*.js` files - experimental generators and processors

### Process Scripts (deprecated)
All `process_phase5*.cjs` and `process-phase5*.cjs` files

### Reports and Analysis Files
- `missing_seeds.json`
- `pragmatic_fd_violations.json`
- `quality_violations.json`
- `PHASE5_ORCHESTRATOR_S0541_S0550_REPORT.json`
- `PHASE5_STAGING_COMPLETE_SUMMARY.md`

### Test/Utility Scripts
- `test-osascript.sh`
- `restructure_phase5_outputs.sh`
- `refine_phase5*.cjs`

## Files Kept in Root

### Essential Config
- `package.json`, `package-lock.json`
- `vite.config.js`, `postcss.config.js`, `tailwind.config.js`
- `vercel.json`
- `ecosystem.config.cjs` (main PM2 config)
- `automation.config.json` (main automation config)

### Startup/Entry Points
- `index.html`
- `start-automation.cjs`

### Documentation
- `README.md`
- `SYSTEM.md`
- `CLAUDE.md` (agent onboarding)
- `THINKING_ENGINE.md`
- `COMMIT_SUMMARY.md`

### Specifications
- `SSI_MASTER_SPECIFICATION.apml`
- `ssi-course-production.apml`

## spa_for_eng Directory Cleanup

### Moved to archive/
- `Italian_for_English_speakers_COURSE_20250827_144821.json` (reference file)
- `lego_baskets_backup_1763562289315.json` (backup)
- `spa_for_eng_668seeds.json` (old manifest v1)
- `spa_for_eng_668seeds_complete.json` (old manifest v2)
- `spa_for_eng_668seeds_final.json` (old manifest v3)
- `phase5_lego_distribution_manifest.json` (report)
- `phase5_missing_baskets_new_only.json` (report)
- `phase5_orchestrator_manifest.json` (report)
- All markdown documentation files
- All .cjs script files

### Kept (Essential Pipeline Files)
- `seed_pairs.json` (Phase 1 output)
- `lego_pairs.json` (Phase 3 output)
- `lego_baskets.json` (Phase 5 output)
- `introductions.json` (Phase 6 output)
- `spa_for_eng_668seedsV4.json` (Phase 7 manifest - LATEST)

## Result

**Root directory:** Clean - only essential configs, docs, and entry points  
**spa_for_eng:** Clean - only pipeline state files

All experimental/deprecated files preserved in archive for reference.
