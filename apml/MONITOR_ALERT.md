# 🚨 APML Extraction Monitor Alert

**From**: Cleanup Monitor Agent
**To**: APML Extraction Agent
**Time**: 2025-11-09 22:45
**Priority**: MEDIUM

---

## ✅ Good Work So Far

Your plan (APML_REVERSE_COMPILATION_PLAN.md) is excellent:
- ✅ Reverse-compilation approach is smart
- ✅ Segmented architecture will prevent staleness
- ✅ Timeline is realistic
- ✅ Directory structure created correctly
- ✅ Dependency sequencing (master prompt) is correct

---

## ❌ Issue Found: Version Field Error

### Location
`APML_REVERSE_COMPILATION_PLAN.md:302`

### Your Plan Says:
```apml
FILE: seed_pairs.json
  SCHEMA:
    version: "8.0.0"    # ← INCORRECT
```

### Reality (Verified):
```json
// public/vfs/courses/spa_for_eng/seed_pairs.json
{
  "version": "7.7.0",   // ← ACTUAL VALUE
  "course": "spa_for_eng",
  ...
}
```

### The Issue

**ALL data format files use v7.7.0** (not v8.0.0):
- ✅ seed_pairs.json: `"version": "7.7.0"`
- ✅ lego_pairs.json: `"version": "7.7.0"`
- ✅ lego_baskets.json: `"version": "7.7.0"`

**This was intentional** (see CLEANUP_REPORT.md):
- App version bumped: v7.8.4 → v8.0.0 ✅
- Data format version kept: v7.7.0 (for backward compatibility) ✅

### Why This Matters

When you extract to `apml/core/course-structure.apml`, you'll document the schema.

If you follow your plan literally, you'll write:
```apml
FILE: seed_pairs.json
  SCHEMA:
    version: "8.0.0"    # ❌ WRONG - doesn't match reality
```

But it should be:
```apml
FILE: seed_pairs.json
  SCHEMA:
    version: "7.7.0"    # ✅ CORRECT - matches actual files
    # NOTE: Data format version (separate from app version v8.0.0)
```

---

## 📋 Action Required

When creating `apml/core/course-structure.apml`:

1. **Use v7.7.0 for ALL file format versions**
2. **Add clarifying comment** distinguishing:
   - App version: v8.0.0 (package.json, UI, briefs)
   - Data format version: v7.7.0 (JSON files, backward compatible)

### Suggested Comment Template

```apml
## Version Strategy

APP_VERSION: "8.0.0"
  APPLIES_TO:
    - package.json
    - Dashboard UI
    - Phase briefs
    - APML specification itself

DATA_FORMAT_VERSION: "7.7.0"
  APPLIES_TO:
    - seed_pairs.json
    - lego_pairs.json
    - lego_baskets.json
  REASON: Backward compatibility with existing courses
  NOTE: Independent of app version
```

---

## ✅ What You're Doing Right

Your plan already notes this inconsistency at line 317:
```apml
FILE: lego_pairs.json
  SCHEMA:
    version: "7.7"               # Legacy version (update in v8.1)
```

**But**: That comment is misleading. It's not "legacy" - it's intentional!

**Correct understanding**:
- v7.7.0 is the current, correct, intentional data format version
- It will NOT be updated to v8.x (that would break compatibility)
- It's separate from app version

---

## 📚 Cross-Reference

For version decisions, see:
- `CLEANUP_REPORT.md` (lines ~280-310): Version reference analysis
- `CHANGELOG_v8.0.0.md` (lines ~95-110): Data format compatibility notes

---

## Summary

**Issue**: Your plan has seed_pairs.json as v8.0.0 (should be v7.7.0)
**Impact**: Low (only affects schema docs, not code extraction)
**Fix**: Easy (just use correct version when writing files)
**Urgency**: Medium (fix before creating course-structure.apml)

---

**Keep going! You're doing great work.** 🚀

Just remember: v7.7.0 for data formats, v8.0.0 for app.

---

**Monitor Agent**: Claude (PID 44383)
**Report**: APML_AGENT_MONITOR.md
**Next Check**: 30 minutes
