# Repository Cleanup Plan

**Date:** 2025-01-06
**Goal:** Clean up development artifacts, establish GitHub-first workflow for courses

---

## 📋 Files to Remove from Git (50+ files)

### Temporary Agent Scripts (18 files)
```
temp_agent_03_extract.cjs
temp_agent_05_data.json
temp_agent_05_extract.cjs
temp_agent_05_generate.cjs
temp_agent_06_basket_gen.cjs
temp_agent_06_data.json
temp_agent_06_extract.cjs
temp_agent_06_generate.cjs
temp_agent_07_data.json
temp_agent_07_extract.cjs
temp_agent_09_gen.cjs
temp_agent_10_basket_gen.cjs
temp_agent_2_baskets.cjs
temp_basket_gen.cjs
temp_gen_agent_06_baskets.cjs
temp_gen_s0027_baskets.cjs
temp_generate_agent_10_baskets.cjs
temp_generate_batch3_baskets.cjs
```

### Test Scripts (7 files)
```
test-s3-connection.cjs
test-vfs-api.cjs
test_s0011_fixes.cjs
test_v5_1_api.js
test-data/ (entire directory)
```

### Validation Scripts (7+ files)
```
validate_basket_phrases.cjs
validate_baskets_batch.cjs
validate_conversational_quality.cjs
validate_s0011_baskets.cjs
```
**Keep:** `validate_extraction.js` (Phase 3 v5.0.1 validator - actively used)

### One-off Scripts
```
upload-courses-to-s3.cjs
vocabulary_whitelist_s0010.json
```

### Directories to Clean
```
tools/ (check if needed)
validators/ (check if needed)
workflows/ (check if needed)
```

---

## ✅ Files to Keep

### Core Infrastructure
- `automation_server.cjs` - Backend server
- `generate-course-manifest.js` - Build-time manifest generator ⭐
- `validate_extraction.js` - Phase 3 v5.0.1 validator ⭐
- All `src/` files
- All `public/` files
- All config files (vite.config.js, package.json, etc.)

### Course Data (Source of Truth)
- `public/vfs/courses/*` - All courses in development ⭐
- `public/vfs/courses-manifest.json` - Auto-generated manifest

---

## 🚫 Updated .gitignore

Add these patterns to prevent re-adding temporary files:

```gitignore
# Temporary development files
temp_*
test_*
validate_*.cjs
*_whitelist.json
test-data/

# Local VFS directory (not deployed)
vfs/

# Keep these exceptions (useful scripts)
!validate_extraction.js
!test_v5_1_api.js
```

---

## 📝 New Architecture

### GitHub = Source of Truth for WIP Courses
```
public/vfs/courses/
  ├── spa_for_eng_30seeds/      ← Phase 1-6 work here
  │   ├── seed_pairs.json
  │   ├── lego_pairs.json
  │   └── baskets_deduplicated.json
  └── [any_course]/
      └── (commit to GitHub, auto-deploys)
```

### Local Development Directory (gitignored)
```
vfs/courses/  ← Work locally, don't commit
  └── (backend server reads from here)
```

### S3 Usage (Future)
- Phase 7: Final course.json manifests (optional backup)
- Phase 8: Audio files (too large for GitHub)

---

## 🔨 Cleanup Commands

```bash
# Remove temp files
git rm temp_*.cjs temp_*.json

# Remove test files
git rm test_*.cjs test_*.js
git rm -r test-data/

# Remove old validation scripts
git rm validate_basket_phrases.cjs
git rm validate_baskets_batch.cjs
git rm validate_conversational_quality.cjs
git rm validate_s0011_fixes.cjs
git rm validate_s0011_baskets.cjs

# Remove one-offs
git rm upload-courses-to-s3.cjs
git rm vocabulary_whitelist_s0010.json

# Update .gitignore
# (add patterns listed above)

# Commit
git commit -m "Clean up repository: remove development artifacts"
git push
```

---

## ✨ Result

**Before:**
- 1813 tracked files
- Lots of temporary/test files cluttering repo
- Unclear what's important
- Mixed sources of truth (backend vs static)

**After:**
- ~50 fewer files
- Clean, focused repo
- `public/vfs/courses/` is THE source
- GitHub-first workflow established
- Ready for multi-user collaboration
