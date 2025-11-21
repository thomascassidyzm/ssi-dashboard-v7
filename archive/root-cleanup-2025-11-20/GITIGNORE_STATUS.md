# .gitignore Status Report - 2025-11-20

## Root Directory

### Tracked (in git)
- `package.json`, `package-lock.json` ✅
- `vite.config.js`, `postcss.config.js`, `tailwind.config.js` ✅
- `vercel.json` ✅
- `ecosystem.config.cjs` ✅
- `automation.config.json` ✅
- `start-automation.cjs` ✅
- `index.html` ✅
- `README.md`, `SYSTEM.md`, `CLAUDE.md` ✅
- `THINKING_ENGINE.md`, `COMMIT_SUMMARY.md` ✅
- `SSI_MASTER_SPECIFICATION.apml`, `ssi-course-production.apml` ✅

### Gitignored (not tracked)
- `.env*` files (credentials) ✅
- `.DS_Store` (macOS) ✅
- `node_modules/`, `dist/` ✅
- `logs/`, `*.log` ✅
- `.vercel/` ✅
- All files moved to `archive/root-cleanup-2025-11-20/` ✅

## spa_for_eng Directory

### Tracked (Essential Pipeline Files)
- `seed_pairs.json` (Phase 1) ✅
- `lego_pairs.json` (Phase 3) ✅
- `lego_baskets.json` (Phase 5) ✅
- `introductions.json` (Phase 6) ✅
- Old archive manifests in `archive/` subdirectory ✅

### NOT Tracked (Will Add)
- `spa_for_eng_668seedsV4.json` (Phase 7 manifest - LATEST) ⚠️ Should track this
- `public/vfs/canonical/` (canonical encouragements) ⚠️ Should track this
- New files in `archive/` subdirectory ⚠️ Should track these

### Gitignored (Working Files)
- `phase5_outputs/` (intermediate files) ✅
- `phase5_scaffolds/` (derivable) ✅
- `backups/` ✅
- `grammar_check_batches/` ✅
- `*_report.json`, `*_errors.json` files ✅

## Canonical Content (NEW)

### Location: `public/vfs/canonical/`

Files that SHOULD be tracked:
- `canonical_seeds.json` (668 seeds) ⚠️ Need to track
- `eng_encouragements.json` (26 pooled encouragements) ⚠️ Need to track
- Future: `spa_encouragements.json`, `fra_encouragements.json`, etc.

These are the **source of truth** for all courses and should be in git.

## Recommendations

### Files to Add to Git
```bash
git add docs/COURSE_GENERATION_ARCHITECTURE.md
git add docs/workflows/*.md
git add public/vfs/canonical/
git add public/vfs/courses/spa_for_eng/spa_for_eng_668seedsV4.json
git add public/vfs/courses/spa_for_eng/archive/*.{json,md,cjs}
```

### Files Already Properly Gitignored
- Experimental scripts (moved to archive)
- Working files in phase5_outputs/, backups/, etc.
- Environment files (.env*)
- Logs and reports

## Summary

✅ **Root directory:** Clean and properly tracked  
✅ **spa_for_eng:** Clean with only essential files  
⚠️ **Action needed:** Track new canonical content and latest manifest  
✅ **.gitignore:** Working correctly for temporary/working files
