# SSI Dashboard v8.0.0 Repo Cleanup Brief

**Created**: 2025-11-09
**Current Version**: v7.8.4
**Target Version**: v8.0.0 (breaking changes milestone)
**Priority**: High - Do before APML SSoT creation

---

## Mission

Clean up deprecated code, consolidate versions, and prepare repo for v8.0.0 milestone. Remove all outdated iterations and establish single source of truth for current architecture.

---

## Context

The repo has accumulated multiple iterations as we've evolved:
- Old phase orchestrator approaches
- Deprecated execution modes
- Outdated documentation
- Test files from previous versions
- Inconsistent version numbering (7.6, 7.7, 7.8.4)

We're about to create an APML specification as the living SSoT, but first we need a clean foundation.

---

## Phase 1: Audit and Identify

### 1.1 Find All Deprecated Files

**Search for**:
- Old orchestrator files (previous iterations before current 3-phase approach)
- Unused Vue components (check if imported anywhere)
- Deprecated API endpoints in automation_server.cjs
- Old documentation that references deprecated features
- Test courses in VFS that are outdated

**Commands to help**:
```bash
# Find files not modified in last 60 days
find . -type f -name "*.js" -o -name "*.vue" -mtime +60

# Search for old version references
grep -r "v7.6" .
grep -r "v7.7" .
grep -r "version.*7\." .

# Find TODO/DEPRECATED comments
grep -r "DEPRECATED" .
grep -r "TODO.*remove" .
grep -r "FIXME" .
```

### 1.2 Component Usage Audit

**Check each Vue component**:
```bash
# List all components
ls -la src/components/
ls -la src/views/

# For each component, check if it's imported
grep -r "import.*ComponentName" src/
```

**Known deprecated candidates**:
- Course Storage components (we removed the route)
- LEGO Basket Viewer components (we removed the route)
- Any "v1", "v2", "old" prefixed files

### 1.3 Documentation Audit

**Check**:
- `docs/` directory for outdated files
- README files that reference old features
- MASTER_PROMPT_IMPROVEMENT_PLAN.md (already deleted - good!)
- Any markdown files with old architecture diagrams

---

## Phase 2: Categorize for Removal

Create `CLEANUP_INVENTORY.md` with three categories:

### Category A: Safe to Delete Immediately
- Confirmed unused components
- Old test files
- Deprecated documentation
- Commented-out code blocks

### Category B: Archive Before Deleting
- Old orchestrators (might have useful patterns)
- Previous phase prompts (for comparison)
- Legacy validators (might have logic to preserve)

**Create archive**:
```bash
mkdir -p archive/pre-v8.0.0/
# Move files here before deletion
```

### Category C: Needs Investigation
- Files that might still be used
- Unclear if deprecated or just not frequently accessed

---

## Phase 3: Execute Cleanup

### 3.1 Remove Deprecated Routes and Components

**Already done**:
- ✅ Course Storage route removed
- ✅ LEGO Basket Viewer route removed

**Check for more**:
- Any other unused routes in `src/router/index.js`
- Orphaned components in `src/components/`

### 3.2 Clean Up automation_server.cjs

**Look for**:
- Commented-out code blocks (remove or uncomment)
- Old API endpoints that return 404 or deprecated messages
- Duplicate function definitions
- Unused imports

**Current line count**: Check file size
```bash
wc -l automation_server.cjs
# If >5000 lines, consider breaking into modules
```

### 3.3 VFS Cleanup

**Check**:
```bash
ls -la public/vfs/courses/
```

**Remove**:
- Test courses that are outdated (keep spa_for_eng_s0001-0030 if current)
- Incomplete/failed generation attempts
- .tmp files that weren't cleaned up

**Keep**:
- Current working test courses
- Example courses needed for demos

### 3.4 Consolidate Documentation

**Keep**:
- COURSE_FILE_PROTOCOLS.md ✅ (current and important)
- Phase intelligence markdown files (if current)
- API documentation (if current)

**Remove/Update**:
- Any docs referencing old architecture
- Outdated setup instructions
- Deprecated feature documentation

---

## Phase 4: Version Consolidation

### 4.1 Update All Version References to v8.0.0

**Files to update**:

1. **package.json**:
```json
{
  "version": "8.0.0"
}
```

2. **automation_server.cjs**:
```javascript
// Update version references in:
// - Phase brief generators (version: "8.0.0")
// - API responses
// - Console log headers
```

3. **Vue components**:
```javascript
// Update in headers/footers:
"SSi Course Production Dashboard v8.0.0"
```

4. **Router titles**:
```javascript
// src/router/index.js
document.title = to.meta.title
  ? `${to.meta.title} - SSi Dashboard`
  : 'SSi Course Production Dashboard v8.0.0'
```

### 4.2 Document Breaking Changes

Create `CHANGELOG_v8.0.0.md`:
```markdown
# v8.0.0 Breaking Changes

## Removed Features
- Course Storage Management page (deprecated)
- LEGO Practice Baskets viewer (deprecated)
- [Add others discovered during cleanup]

## Changed Defaults
- Execution mode now defaults to 'web' instead of 'local'
- [Add others]

## New Features
- Web Mode fully automated browser execution
- Git push to main from session branches
- [Add others from recent work]

## Migration Guide
- If using Local Mode, explicitly select it (no longer default)
- [Add other migration steps]
```

---

## Phase 5: Code Quality Improvements

### 5.1 ESLint/Prettier Check
```bash
npm run lint
# Fix any issues found
```

### 5.2 Remove Unused Dependencies
```bash
npm install -g depcheck
depcheck
# Remove any unused packages from package.json
```

### 5.3 Consolidate Utility Functions

**Check for**:
- Duplicate helper functions across files
- Utilities that should be in shared modules

---

## Phase 6: Generate Cleanup Report

Create `CLEANUP_REPORT.md`:

```markdown
# SSI Dashboard v8.0.0 Cleanup Report

**Date**: 2025-11-09
**Previous Version**: v7.8.4
**New Version**: v8.0.0

## Files Removed
- [List all deleted files with reason]

## Files Archived
- [List files moved to archive/ with reason]

## Breaking Changes
- [List breaking changes for v8.0.0]

## Code Metrics
- Lines of code before: [count]
- Lines of code after: [count]
- Files removed: [count]
- Unused dependencies removed: [list]

## Still Needs Attention
- [List any items from Category C]
- [List any todos discovered]

## Next Steps
1. ✅ Repo cleaned
2. ⏳ Wait for master prompt completion
3. ⏳ Create APML SSoT specification
4. ⏳ PSS migration
```

---

## Phase 7: Git Commit Strategy

**Don't commit everything at once!** Break into logical commits:

1. **Remove deprecated components**:
```bash
git add [deleted component files]
git commit -m "Remove deprecated Course Storage and LEGO Basket components"
```

2. **Clean up automation_server.cjs**:
```bash
git add automation_server.cjs
git commit -m "Remove commented code and unused functions from automation server"
```

3. **VFS cleanup**:
```bash
git add public/vfs/
git commit -m "Clean up test courses and temporary files from VFS"
```

4. **Documentation consolidation**:
```bash
git add docs/
git commit -m "Remove outdated documentation, keep current references"
```

5. **Version bump to v8.0.0**:
```bash
git add package.json src/ automation_server.cjs
git commit -m "Bump version to v8.0.0 - breaking changes milestone"
```

6. **Final cleanup report**:
```bash
git add CLEANUP_REPORT.md CHANGELOG_v8.0.0.md
git commit -m "Add v8.0.0 cleanup report and changelog"
```

---

## Success Criteria

✅ All deprecated files removed or archived
✅ No unused components in src/
✅ All version references updated to v8.0.0
✅ Documentation current and accurate
✅ VFS cleaned of test/temp files
✅ CLEANUP_REPORT.md generated
✅ CHANGELOG_v8.0.0.md created
✅ Breaking changes documented
✅ All changes committed with clear messages
✅ Code passes linting
✅ Repo ready for APML SSoT creation

---

## Estimated Time

- Phase 1 (Audit): 30-45 minutes
- Phase 2 (Categorize): 15-20 minutes
- Phase 3 (Execute): 45-60 minutes
- Phase 4 (Version): 15-20 minutes
- Phase 5 (Quality): 20-30 minutes
- Phase 6 (Report): 15-20 minutes
- Phase 7 (Commit): 15-20 minutes

**Total**: ~2.5-3.5 hours

---

## Notes

- **Be conservative**: When in doubt, archive rather than delete
- **Test after cleanup**: Make sure dashboard still runs
- **Document everything**: Future you will thank you
- **Commit frequently**: Easier to revert if needed

---

**Ready to execute?** Spin this up in a new Claude window and let it rip! 🧹✨
