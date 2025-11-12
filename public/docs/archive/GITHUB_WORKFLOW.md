# GitHub-First Course Development Workflow

**Updated:** 2025-01-06
**Status:** ✅ Active Protocol

---

## 🎯 Core Principle

**GitHub is the single source of truth for all WIP courses (Phase 1-6)**

All team members work directly in `public/vfs/courses/`, commit to GitHub, and Vercel auto-deploys. No manual syncing needed.

---

## 📂 Directory Structure

### ✅ Deployed Courses (Tracked in Git)
```
public/vfs/courses/
  ├── spa_for_eng_30seeds/          ← Work here! Commit to GitHub
  │   ├── seed_pairs.json           (Phase 1: Translations)
  │   ├── lego_pairs.json           (Phase 3: LEGO extraction)
  │   └── baskets_deduplicated.json (Phase 4: Practice baskets)
  │
  ├── cmn_for_eng_30seeds/
  ├── ita_for_eng_30seeds/
  └── [any_new_course]/             ← Just create folder & commit!
```

**Status:** Tracked in git, auto-deploys to production, auto-generates manifest

### 🚫 Local Development (Not Tracked)
```
vfs/courses/                        ← Backend server workspace
  └── (gitignored - use for local testing only)
```

**Status:** Gitignored, not deployed, backend server only

---

## 🔄 Workflow for Team Members

### 1️⃣ Creating a New Course

```bash
# Create course directory
mkdir -p public/vfs/courses/fra_for_eng_30seeds

# Add your files
echo '{}' > public/vfs/courses/fra_for_eng_30seeds/seed_pairs.json

# Commit and push
git add public/vfs/courses/fra_for_eng_30seeds/
git commit -m "Add French for English 30 seeds course (Phase 1)"
git push

# ✨ Done! Course appears in dashboard automatically
```

### 2️⃣ Working on Existing Course

```bash
# Pull latest changes
git pull

# Edit files
vim public/vfs/courses/spa_for_eng_30seeds/lego_pairs.json

# Commit and push
git add public/vfs/courses/spa_for_eng_30seeds/lego_pairs.json
git commit -m "Update spa_for_eng_30seeds: Add S0051-S0100 LEGOs"
git push

# ✨ Done! Changes deploy automatically
```

### 3️⃣ Using Claude Code (This Session)

When Claude Code works on courses:
- ✅ Creates/edits files in `public/vfs/courses/`
- ✅ Commits directly to branch (e.g., `claude/development-*`)
- ✅ Pushes to GitHub
- ✅ You review and merge to main when ready

---

## 🤖 Automatic Systems

### Build-Time Manifest Generation
Every build automatically:
1. Scans `public/vfs/courses/`
2. Detects all course folders (even empty ones)
3. Determines completion phase (empty/phase_1/phase_3/phase_4)
4. Generates `public/vfs/courses-manifest.json`
5. Deploys to production

**Result:** No hardcoded course lists. Just add folders!

### Vercel Deployment
```
Push to GitHub
     ↓
Vercel detects change
     ↓
npm run build
     ↓
  generate-course-manifest.js runs
     ↓
  Scans public/vfs/courses/
     ↓
  Creates manifest.json
     ↓
  vite build
     ↓
Deploy to production
     ↓
Dashboard shows all courses ✨
```

---

## 📊 Phase Tracking

Courses automatically show their completion phase:

| Phase | Files | Badge | Description |
|-------|-------|-------|-------------|
| **Empty** | None | 📂 | Folder created, no data yet |
| **Phase 1** | seed_pairs.json | 🌱 | Translations complete |
| **Phase 3** | + lego_pairs.json | 🧱 | LEGO extraction complete |
| **Phase 4** | + baskets_deduplicated.json | ✅ | Practice baskets generated |
| **Phase 7+** | course.json manifest | 🚀 | Final published course |

---

## ☁️ S3 Usage (Future)

**Don't Use S3 for Phases 1-6** (GitHub handles this)

**Do Use S3 for:**

### Phase 7: Final Course Manifests (Optional)
```
course.json (complete course in one file)
  ↓
Upload to S3 (backup/archival)
  ↓
Optionally serve from CDN
```

### Phase 8: Audio Files
```
Generate audio for all phrases
  ↓
Upload .mp3 files to S3 (too large for GitHub)
  ↓
course.json references S3 URLs
```

---

## 🔐 Future: Access Control

**Planned (not implemented yet):**
- 6-digit access code on dashboard load
- Sent to approved team member emails
- Allows editing/uploading courses

**Current:** Public dashboard (development mode)

---

## ✅ Benefits of This Approach

1. **No Manual Syncing**
   - ❌ Before: Backend API → S3 sync → download → upload
   - ✅ Now: GitHub commit → auto-deploy → everyone sees it

2. **Version Control**
   - Full git history for all courses
   - See who changed what, when
   - Rollback to any previous version

3. **Multi-User Collaboration**
   - Work from any computer
   - Work from web (Claude Code)
   - No conflicts about "latest version"

4. **Auto-Discovery**
   - Just create folder → it appears
   - No hardcoded lists to maintain
   - Manifest auto-generates

5. **Simpler Architecture**
   - GitHub = source of truth
   - No backend dependency for course listing
   - S3 only for large files

---

## 🚨 Important Rules

### ✅ DO:
- Commit course files to `public/vfs/courses/`
- Push to GitHub after every change
- Pull before starting work
- Use clear commit messages

### 🚫 DON'T:
- Don't work in `vfs/courses/` (gitignored, won't deploy)
- Don't use `/storage` page for syncing (deprecated)
- Don't manually edit manifest (auto-generated)
- Don't commit temp/test files (now gitignored)

---

## 📝 File Formats

### Phase 1: seed_pairs.json (v7.7 format)
```json
{
  "version": "7.7",
  "translations": {
    "S0001": ["Target phrase", "Known phrase"],
    "S0002": ["Target phrase 2", "Known phrase 2"]
  }
}
```

### Phase 3: lego_pairs.json (v5.0.1 format)
```json
{
  "version": "5.0.1",
  "methodology": "Phase 3 LEGO + Pattern Extraction v5.0.1 - COMPLETE TILING",
  "seeds": [
    {
      "seed_id": "S0001",
      "seed_pair": ["Target", "Known"],
      "legos": [
        {
          "id": "S0001L01",
          "type": "A",
          "target": "word",
          "known": "translation",
          "new": true
        }
      ],
      "patterns": ["P01"],
      "cumulative_legos": 1
    }
  ]
}
```

### Phase 4: baskets_deduplicated.json
```json
{
  "seed_id": "S0001",
  "seed_pair": {
    "target": "Target phrase",
    "known": "Known phrase"
  },
  "S0001L01": {
    "lego": ["word", "translation"],
    "practice_phrases": [
      ["Known practice", "Target practice", "P01", 3]
    ]
  }
}
```

---

## 🎓 Example: Full Course Development

```bash
# Day 1: Create course, add translations
mkdir -p public/vfs/courses/deu_for_eng_30seeds
vim public/vfs/courses/deu_for_eng_30seeds/seed_pairs.json
git add public/vfs/courses/deu_for_eng_30seeds/
git commit -m "Create German for English course (Phase 1)"
git push
# ✨ Course appears in dashboard with 🌱 badge

# Day 2: Extract LEGOs with Claude Code
# (Claude edits lego_pairs.json, commits, pushes)
# ✨ Course badge changes to 🧱

# Day 3: Generate baskets
# (Script or Claude generates baskets_deduplicated.json)
git add public/vfs/courses/deu_for_eng_30seeds/baskets_deduplicated.json
git commit -m "Add practice baskets (Phase 4)"
git push
# ✨ Course badge changes to ✅

# Day 4: Review and publish
# Merge to main branch
# Course now in production!
```

---

## 📞 Questions?

- **"Where do I work on courses?"** → `public/vfs/courses/`
- **"Do I need to sync to S3?"** → No! Just commit to GitHub
- **"How do others see my changes?"** → They pull from GitHub
- **"What if I'm on a different computer?"** → Clone repo, work in `public/vfs/courses/`, push
- **"Can Claude Code help?"** → Yes! It works in the same directories

---

**Remember:** GitHub first, S3 later (Phase 7+). Simple! 🎉
