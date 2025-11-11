# SSI Dashboard v8.0.0 Cleanup Inventory

**Date**: 2025-11-09
**Previous Version**: v7.8.4
**Target Version**: v8.0.0

---

## Category A: Safe to Delete Immediately

### Components
1. **src/components/HelloWorld.vue** - Default Vue template component, not used anywhere
2. **src/views/CourseStorage.vue** - Route already removed, component unused

### Documentation
None identified (most docs are current)

---

## Category B: Keep (Still Used)

### Components
1. **src/components/LegoBasketViewer.vue** - Still used in CourseEditor.vue
2. All other components in src/components/ and src/views/ are actively used

### Documentation
- Most files in docs/ are current and reference current architecture
- Files with "DEPRECATED" comments are documenting deprecated features (e.g., Phase 4) but are still valuable documentation
- Keep all phase_intelligence files - they are the current SSoT

---

## Category C: Version References to Update

### Files with v7.6 references:
1. **src/router/index.js:173** - Dashboard title "v7.6"
2. **src/views/CourseGeneration.vue:23** - Dashboard v7.6 reference
3. **src/views/TrainingPhase.vue:636** - APML v7.6 reference
4. **src/views/TrainingPhase.vue:805, 857** - "NEW in APML v7.6" comments
5. **src/views/Dashboard.vue:239, 243, 271** - Multiple v7.6 references
6. **Multiple tool migration files** - Reference v7.6 format (keep as-is, they're migration tools)

### Files with v7.7 references:
- Primarily in format-related code (legoFormatAdapter.js, api.js)
- These are format version identifiers, not app version - KEEP AS IS
- They refer to the data format version (v7.7.0), not the dashboard version

### Files to update to v8.0.0:
1. package.json - version field
2. src/router/index.js - dashboard title
3. src/views/Dashboard.vue - dashboard version display
4. src/views/CourseGeneration.vue - dashboard version in header
5. src/views/APMLSpec.vue - Update APML version reference to v8.0.0
6. automation_server.cjs - Version references in phase briefs

---

## Category D: Code Quality Issues Found

### automation_server.cjs (8403 lines)
- Contains DEPRECATED markers but these are documentation comments, not dead code
- No immediate cleanup needed besides version bumps

### TODO/FIXME Comments Found:
1. **src/components/quality/SeedQualityReview.vue:498** - "TODO: API call to remove"
   - This is a comment about future functionality, not deprecated code - KEEP

---

## VFS Status

### Current State:
- public/vfs/courses/spa_for_eng/ - Active test course ✅
- public/vfs/courses/zho_for_eng/ - Active test course ✅
- No temporary or outdated test files found ✅

**Action**: No VFS cleanup needed

---

## Archive Directory

Not needed - no files require archiving. All deprecated code has already been removed in previous cleanup.

---

## Summary

### Files to Delete: 2
- src/components/HelloWorld.vue
- src/views/CourseStorage.vue

### Files to Update (version 7.8.4 → 8.0.0): 6
- package.json
- src/router/index.js
- src/views/Dashboard.vue
- src/views/CourseGeneration.vue
- src/views/APMLSpec.vue
- automation_server.cjs (phase brief generators)

### Files to Keep: All others
- No documentation cleanup needed
- No VFS cleanup needed
- Format version references (v7.7.0) are correct and should NOT be changed

---

## Breaking Changes for v8.0.0

1. ✅ Course Storage Management page removed (already done)
2. ✅ LEGO Practice Baskets viewer route removed (already done)
3. Default execution mode changed to 'web' (already implemented)
4. Git push to main from session branches (already implemented)

---

## Next Steps

1. Delete unused components (Category A)
2. Update version references to v8.0.0 (Category C)
3. Run linting
4. Generate CHANGELOG_v8.0.0.md
5. Generate CLEANUP_REPORT.md
6. Commit changes in logical groups
