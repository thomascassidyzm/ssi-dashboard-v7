# Storage Strategy: VFS, Git, Local, and AWS S3

**Date**: 2025-11-06
**Context**: Need clear data flow between local development, git, and AWS S3 for course files

---

## Current State Analysis

### 1. **Local VFS** (`vfs/courses/`)

**What it is:**
- Local working directory for course generation
- Gitignored content (`.gitignore` line 38: `vfs/courses/*/`)
- Directory structure tracked, content ignored

**What's in it:**
```
vfs/courses/
├── spa_for_eng/
│   ├── seed_pairs.json      (82KB) Phase 1 output
│   └── lego_pairs.json      (521KB) Phase 3 output
├── ita_for_eng_668seeds/
│   ├── seed_pairs.json
│   └── lego_pairs.json
└── gle_for_eng_30seeds/     (older format)
    ├── baskets.json
    └── translations.json
```

**Current status:**
- ✅ seed_pairs.json (Phase 1)
- ✅ lego_pairs.json (Phase 3)
- ❌ lego_baskets.json (Phase 5 - NOT YET INTEGRATED)

**Gitignore rule:**
```gitignore
# Line 38
vfs/courses/*/
```
This means:
- ✅ `vfs/courses/` directory is tracked
- ✅ `vfs/courses/📍_COURSE_INDEX.md` is tracked
- ❌ `vfs/courses/spa_for_eng/*` is ignored
- ❌ All course content files are ignored

---

### 2. **Public VFS** (`public/vfs/courses/`)

**What it is:**
- Static fallback files committed to git
- Used when API server unavailable
- Dashboard reads from here as fallback

**What's in it:**
```
public/vfs/courses/
├── spa_for_eng_30seeds/
│   ├── translations.json
│   ├── baskets_deduplicated.json
│   └── LEGO_BREAKDOWNS_COMPLETE.json
├── cmn_for_eng/
├── ita_for_eng_10seeds/
└── ... (13 courses)
```

**Current status:**
- Older format (Phase 5.5 deduplication format)
- Committed to git (in `public/`)
- Serves as static fallback when API down

---

### 3. **Baskets** (Current scattered locations)

**What it is:**
- Practice phrase baskets (Phase 5 output)
- Currently NOT in VFS structure

**Where they are:**
```
public/baskets/              ← Curated/hand-crafted
├── lego_baskets_s0001.json
├── lego_baskets_s0011.json  (v6 curated)
├── lego_baskets_s0011_v3_backup.json
└── ... (S0001-S0050)

public/generated_baskets/    ← AI-generated
├── lego_baskets_s0011_conversational.json
├── lego_baskets_s0021_conversational.json
└── lego_baskets_s0031_conversational.json
```

**Current issues:**
- ❌ Not part of VFS structure
- ❌ No course association
- ❌ Can't sync with course files
- ❌ Committed to git (large binary-ish JSON)

---

### 4. **AWS S3** (Production storage)

**What it is:**
- Cloud storage for published courses
- Dashboard loads from here in production

**What's supposed to be there:**
- Complete courses (all phases)
- Publicly accessible course files

**Current status:**
- 7 courses uploaded (per api.js:81-90)
- No basket integration yet
- Dashboard has S3 fallback logic

---

## The Problem

**Current data flow is unclear:**
```
Local Development → ??? → Git → ??? → S3 → Dashboard
     (vfs/)              (public/)      (cloud)  (browser)

Where do baskets fit? ❌
```

**Specific issues:**

1. **Baskets are orphaned**
   - Live in `public/baskets/` and `public/generated_baskets/`
   - Not associated with courses
   - Committed to git (shouldn't be - they're large generated files)

2. **VFS is incomplete**
   - Has Phase 1 (seed_pairs.json) ✅
   - Has Phase 3 (lego_pairs.json) ✅
   - Missing Phase 5 (lego_baskets.json) ❌

3. **Git stores generated content**
   - `public/baskets/*.json` committed
   - `public/vfs/courses/*` committed
   - These are 100KB+ generated files

4. **S3 sync unclear**
   - When to upload?
   - What to upload?
   - How to handle incomplete courses?

5. **Local → S3 workflow undefined**
   - Work locally in `vfs/`
   - Want to share incomplete course for review
   - No mechanism to sync partial work

---

## Proposed Storage Strategy

### **Principle: 3-Layer Architecture**

```
┌─────────────────────────────────────────────────────────┐
│ LAYER 1: Local Development (vfs/)                      │
│ - Gitignored content                                    │
│ - All phases (1, 3, 5, 7, 8)                           │
│ - Working files, iterations, experiments                │
│ - Source of truth during development                    │
└─────────────────────────────────────────────────────────┘
                          ↓
                    (Sync command)
                          ↓
┌─────────────────────────────────────────────────────────┐
│ LAYER 2: AWS S3 (Cloud storage)                        │
│ - Published courses (complete OR in-progress)          │
│ - Versioned backups                                     │
│ - Team-accessible for review                            │
│ - Source of truth for production                        │
└─────────────────────────────────────────────────────────┘
                          ↓
                  (Dashboard fetch)
                          ↓
┌─────────────────────────────────────────────────────────┐
│ LAYER 3: Browser Cache (localStorage/IndexedDB)        │
│ - Cached course files                                   │
│ - Fast access after first load                          │
│ - Cleared on version mismatch                           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ GIT: Source Code Only                                   │
│ - Vue components, scripts, docs                         │
│ - NOT course content files                              │
│ - NOT generated baskets                                 │
│ - Static examples only (< 10KB samples)                 │
└─────────────────────────────────────────────────────────┘
```

---

## Detailed Layer Specifications

### **LAYER 1: Local Development (`vfs/courses/{courseCode}/`)**

**Purpose:**
- Working directory for course generation
- All intermediate files
- Experimentation and iteration

**Structure:**
```
vfs/courses/{courseCode}/
├── seed_pairs.json           # Phase 1 output
├── lego_pairs.json           # Phase 3 output
├── lego_baskets.json         # Phase 5 output (NEW!)
├── lego_baskets_metadata.json # Phase 5 metadata (NEW!)
├── compiled/                 # Phase 7 output
│   ├── course.xml
│   └── ...
├── audio/                    # Phase 8 output
│   └── ...
├── working/                  # Intermediate files
│   ├── phase3_attempts/
│   ├── basket_drafts/
│   └── ...
└── .course_metadata.json     # Version, status, sync info
```

**Gitignore:**
```gitignore
# All course content (keep pattern as-is)
vfs/courses/*/
```

**Sync metadata** (`.course_metadata.json`):
```json
{
  "course_code": "spa_for_eng_30seeds",
  "version": "1.0.0",
  "last_sync": "2025-11-06T12:34:56Z",
  "sync_status": "synced",
  "phases_complete": [1, 3, 5],
  "s3_url": "s3://ssi-courses/spa_for_eng_30seeds/",
  "local_modifications": false
}
```

**When to use:**
- ✅ All development work
- ✅ Phase execution (1, 3, 5, 7, 8)
- ✅ Basket curation
- ✅ Quality validation
- ✅ Experimentation

**When NOT to use:**
- ❌ Production serving (use S3)
- ❌ Team collaboration (sync to S3 first)

---

### **LAYER 2: AWS S3 (`s3://ssi-courses/{courseCode}/`)**

**Purpose:**
- Published courses (complete or in-progress)
- Team-accessible storage
- Source of truth for dashboard
- Versioned backups

**Structure:**
```
s3://ssi-courses/
├── spa_for_eng_30seeds/
│   ├── v1.0.0/                    # Versioned backup
│   │   ├── seed_pairs.json
│   │   ├── lego_pairs.json
│   │   └── lego_baskets.json
│   ├── seed_pairs.json            # Latest version
│   ├── lego_pairs.json
│   ├── lego_baskets.json
│   ├── lego_baskets_metadata.json
│   ├── course_metadata.json       # Public metadata
│   └── compiled/
│       └── course.xml
└── ita_for_eng_668seeds/
    └── ... (same structure)
```

**Public metadata** (`course_metadata.json`):
```json
{
  "course_code": "spa_for_eng_30seeds",
  "version": "1.0.0",
  "source_language": "eng",
  "target_language": "spa",
  "total_seeds": 30,
  "phases_complete": [1, 3, 5],
  "published_at": "2025-11-06T12:34:56Z",
  "status": "in_progress",
  "basket_count": 30,
  "quality_score": 95,
  "download_urls": {
    "seed_pairs": "https://...",
    "lego_pairs": "https://...",
    "lego_baskets": "https://..."
  }
}
```

**Sync policy:**
- ✅ Sync on demand (manual trigger)
- ✅ Sync incomplete courses for review
- ✅ Version on each sync (backup to `v{X.Y.Z}/`)
- ✅ Update `course_metadata.json`

**When to use:**
- ✅ Publishing complete courses
- ✅ Sharing incomplete work for review
- ✅ Team collaboration
- ✅ Dashboard data source

**When NOT to use:**
- ❌ Active development (use local VFS)
- ❌ Rapid iteration (sync is slow)

---

### **LAYER 3: Browser Cache (localStorage/IndexedDB)**

**Purpose:**
- Fast access to recently viewed courses
- Reduce S3 fetch calls
- Offline capability

**Storage:**
```javascript
// localStorage
localStorage.setItem('course_spa_for_eng_30seeds_version', '1.0.0')

// IndexedDB
db.courses.put({
  courseCode: 'spa_for_eng_30seeds',
  version: '1.0.0',
  seedPairs: { ... },   // Full JSON
  legoPairs: { ... },
  legoBaskets: { ... },
  cachedAt: Date.now(),
  expiresAt: Date.now() + 86400000  // 24h
})
```

**Cache policy:**
- ✅ Cache after first fetch
- ✅ Check version before using cache
- ✅ Expire after 24 hours
- ✅ Clear on version mismatch

**When to use:**
- ✅ Dashboard loads
- ✅ Repeated basket viewing
- ✅ Offline browsing

**When NOT to use:**
- ❌ Development (always use local VFS)
- ❌ Editing (always fetch latest)

---

### **GIT: Source Code Only**

**What goes in git:**
```
✅ Source code (*.vue, *.js, *.cjs)
✅ Documentation (*.md)
✅ Configuration (*.json configs, NOT data)
✅ Small examples (< 10KB samples)
✅ VFS directory structure (vfs/courses/)
✅ VFS index (vfs/courses/📍_COURSE_INDEX.md)
```

**What does NOT go in git:**
```
❌ Course content (vfs/courses/*/)
❌ Generated baskets (public/baskets/*.json)
❌ Large data files (> 10KB)
❌ S3 uploads
❌ Compiled outputs
❌ Audio files
```

**Current exceptions to remove:**
```
❌ public/vfs/courses/*  (move to S3 only)
❌ public/baskets/*      (move to VFS → S3)
❌ public/generated_baskets/*  (move to VFS → S3)
```

---

## Data Flow Workflows

### **Workflow 1: New Course Generation**

```
1. Developer runs: `npm run generate-course spa_for_eng_30seeds`

2. Automation server:
   ├─ Phase 1 → vfs/courses/spa_for_eng_30seeds/seed_pairs.json
   ├─ Phase 3 → vfs/courses/spa_for_eng_30seeds/lego_pairs.json
   ├─ Phase 5 → vfs/courses/spa_for_eng_30seeds/lego_baskets.json
   └─ Creates .course_metadata.json

3. Developer reviews locally:
   ├─ Opens basket viewer: loads from vfs/
   ├─ Curates baskets
   └─ Validates quality

4. Developer syncs to S3:
   $ node scripts/sync-course-to-s3.cjs spa_for_eng_30seeds

5. S3 sync script:
   ├─ Uploads all course files to S3
   ├─ Creates versioned backup (v1.0.0/)
   ├─ Updates course_metadata.json
   └─ Updates local .course_metadata.json (last_sync)

6. Team opens dashboard:
   ├─ Dashboard fetches from S3
   ├─ Caches in browser
   └─ Can review baskets

7. Team provides feedback:
   └─ Flags baskets for review

8. Developer syncs back (bi-directional):
   $ node scripts/sync-course-from-s3.cjs spa_for_eng_30seeds

9. Developer updates locally:
   ├─ Regenerates flagged baskets
   └─ Re-syncs to S3
```

---

### **Workflow 2: Basket Curation**

```
1. Developer works locally:
   ├─ Edit vfs/courses/spa_for_eng_30seeds/lego_baskets.json
   ├─ Curate S0011 (15 → 10 phrases)
   └─ Validate GATE compliance

2. Developer syncs:
   $ node scripts/sync-course-to-s3.cjs spa_for_eng_30seeds --baskets-only

3. S3 updated:
   ├─ Uploads lego_baskets.json
   ├─ Uploads lego_baskets_metadata.json
   └─ Increments version (v1.0.1)

4. Dashboard refreshes:
   ├─ Detects version change
   ├─ Clears cache
   └─ Fetches new baskets
```

---

### **Workflow 3: Team Collaboration (Incomplete Course)**

```
1. Developer A generates Phase 1-3:
   ├─ vfs/courses/spa_for_eng_30seeds/seed_pairs.json ✅
   ├─ vfs/courses/spa_for_eng_30seeds/lego_pairs.json ✅
   └─ lego_baskets.json not started ❌

2. Developer A syncs partial work:
   $ node scripts/sync-course-to-s3.cjs spa_for_eng_30seeds --force

3. S3 has partial course:
   ├─ seed_pairs.json ✅
   ├─ lego_pairs.json ✅
   ├─ lego_baskets.json ❌
   └─ course_metadata.json (phases_complete: [1, 3])

4. Developer B fetches:
   $ node scripts/sync-course-from-s3.cjs spa_for_eng_30seeds

5. Developer B continues:
   ├─ Generates Phase 5 baskets
   └─ Syncs back to S3

6. Developer A pulls updates:
   $ node scripts/sync-course-from-s3.cjs spa_for_eng_30seeds --pull
```

---

### **Workflow 4: Dashboard Loads Course**

```
1. User opens dashboard:
   └─ Navigates to "Spanish for English"

2. Dashboard checks cache:
   const cachedVersion = localStorage.getItem('course_spa_for_eng_30seeds_version')

3. Dashboard fetches S3 metadata:
   GET s3://ssi-courses/spa_for_eng_30seeds/course_metadata.json

4. Compare versions:
   if (s3Version !== cachedVersion) {
     clearCache()
     fetchFromS3()
   } else {
     loadFromCache()
   }

5. If cache miss, fetch files:
   ├─ GET s3://.../seed_pairs.json
   ├─ GET s3://.../lego_pairs.json
   └─ GET s3://.../lego_baskets.json

6. Cache in browser:
   ├─ IndexedDB: store full course data
   └─ localStorage: store version
```

---

## Migration Plan

### **Phase 1: Consolidate Baskets into VFS** (Week 1)

**Goal**: Move baskets from `public/baskets/` into `vfs/courses/{courseCode}/lego_baskets.json`

**Steps:**

1. **Create migration script**: `scripts/migrate-baskets-to-vfs.cjs`
   ```javascript
   // For each basket in public/baskets/:
   // - Determine course code (hardcoded map for now)
   // - Load basket JSON
   // - Add to course's lego_baskets.json
   // - Update lego_baskets_metadata.json
   ```

2. **Run migration**:
   ```bash
   node scripts/migrate-baskets-to-vfs.cjs
   ```

3. **Verify**:
   ```bash
   ls vfs/courses/*/lego_baskets.json
   # Should see baskets in each course
   ```

4. **Update basket viewer**:
   - Change from `/baskets/lego_baskets_s0011.json`
   - To `/api/courses/{courseCode}/baskets/{seedId}`
   - API serves from `vfs/courses/{courseCode}/lego_baskets.json`

5. **Test locally**:
   - Dashboard loads baskets from VFS via API
   - No more hardcoded basket paths

6. **Keep backup** (don't delete yet):
   ```bash
   mv public/baskets public/baskets_BACKUP_2025-11-06
   mv public/generated_baskets public/generated_baskets_BACKUP_2025-11-06
   ```

---

### **Phase 2: Create S3 Sync Scripts** (Week 2)

**Goal**: Enable syncing VFS → S3 and S3 → VFS

**Scripts to create:**

1. **`scripts/sync-course-to-s3.cjs`**
   ```bash
   # Upload course to S3
   node scripts/sync-course-to-s3.cjs spa_for_eng_30seeds

   # Upload only baskets
   node scripts/sync-course-to-s3.cjs spa_for_eng_30seeds --baskets-only

   # Force sync incomplete course
   node scripts/sync-course-to-s3.cjs spa_for_eng_30seeds --force
   ```

2. **`scripts/sync-course-from-s3.cjs`**
   ```bash
   # Download course from S3
   node scripts/sync-course-from-s3.cjs spa_for_eng_30seeds

   # Pull updates only (don't overwrite local changes)
   node scripts/sync-course-from-s3.cjs spa_for_eng_30seeds --pull
   ```

3. **`scripts/list-s3-courses.cjs`**
   ```bash
   # List all courses in S3
   node scripts/list-s3-courses.cjs
   ```

**Features:**
- Version management (backup to `v{X.Y.Z}/`)
- Conflict detection (warn if local modified)
- Partial sync (only changed files)
- Progress tracking

---

### **Phase 3: Update Dashboard** (Week 3)

**Goal**: Dashboard loads from S3, not `public/vfs/`

**Changes:**

1. **Remove `public/vfs/courses/` from git**:
   ```bash
   git rm -r public/vfs/courses/
   git commit -m "Remove static VFS files (now served from S3)"
   ```

2. **Update API fallback logic** (`src/services/api.js`):
   ```javascript
   // OLD: Fallback to public/vfs/courses/
   const response = await fetch(`/vfs/courses/${courseCode}/seed_pairs.json`)

   // NEW: Fallback to S3
   const response = await fetch(`https://s3.amazonaws.com/ssi-courses/${courseCode}/seed_pairs.json`)
   ```

3. **Add cache layer**:
   ```javascript
   // Check IndexedDB cache first
   const cached = await db.courses.get(courseCode)
   if (cached && cached.version === latestVersion) {
     return cached.data
   }

   // Fetch from S3
   const data = await fetchFromS3(courseCode)

   // Cache in IndexedDB
   await db.courses.put({ courseCode, version, data, cachedAt: Date.now() })
   ```

4. **Version checking**:
   ```javascript
   // Always fetch course_metadata.json first (small, fast)
   const metadata = await fetch(`${S3_BASE}/${courseCode}/course_metadata.json`)

   // Compare with cached version
   if (metadata.version !== cachedVersion) {
     clearCache(courseCode)
     fetchAllFiles(courseCode)
   }
   ```

---

### **Phase 4: Clean Up Public Directory** (Week 4)

**Goal**: Remove generated files from git

**Steps:**

1. **Update `.gitignore`**:
   ```gitignore
   # Add these lines:
   public/baskets/
   public/generated_baskets/
   public/vfs/courses/
   ```

2. **Remove from git history** (optional, reduces repo size):
   ```bash
   # BFG Repo Cleaner or git filter-branch
   # This is destructive, coordinate with team
   ```

3. **Keep only**:
   ```
   public/
   ├── index.html
   ├── favicon.ico
   └── (small static assets only)
   ```

4. **Verify repo size**:
   ```bash
   du -sh .git
   # Should be significantly smaller
   ```

---

## S3 Configuration

### **Bucket Structure**

```
Bucket: ssi-courses
Region: us-east-1
Access: Public read (for dashboard)
Versioning: Enabled (automatic backups)

ssi-courses/
├── spa_for_eng_30seeds/
│   ├── v1.0.0/              # Backup
│   ├── v1.0.1/              # Backup
│   ├── seed_pairs.json      # Latest
│   ├── lego_pairs.json
│   ├── lego_baskets.json
│   └── course_metadata.json
└── ...
```

### **IAM Permissions**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::ssi-courses",
        "arn:aws:s3:::ssi-courses/*"
      ]
    }
  ]
}
```

### **CORS Configuration**

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }
]
```

---

## File Size Considerations

### **Typical Course Sizes**

| Course | Seeds | seed_pairs.json | lego_pairs.json | lego_baskets.json | Total |
|--------|-------|-----------------|-----------------|-------------------|-------|
| Test (30 seeds) | 30 | ~3KB | ~20KB | ~50KB | ~73KB |
| Medium (100 seeds) | 100 | ~10KB | ~70KB | ~170KB | ~250KB |
| Full (668 seeds) | 668 | ~80KB | ~520KB | ~1.2MB | ~1.8MB |

### **Git Impact** (before migration)

```
public/baskets/ (50 files × ~6KB) = ~300KB
public/vfs/courses/ (13 courses × ~200KB) = ~2.6MB
Total generated content in git: ~3MB
```

After migration:
```
Git only has source code: ~500KB (excluding node_modules)
Repo clone time: < 5 seconds (vs ~20 seconds)
```

---

## Security Considerations

### **S3 Public Access**

**Issue**: Course files must be publicly readable for dashboard.

**Mitigation**:
- Only `course_metadata.json` and data files public
- No credentials in files
- No PII in course content
- Versioning enabled (can roll back if issue)

### **API Access**

**Issue**: Local API has no authentication.

**Mitigation**:
- API only runs on localhost (not exposed)
- For production, add API key requirement
- Rate limiting for S3 fetches

---

## Success Metrics

After migration, we should achieve:

1. ✅ **Git repo < 1MB** (source code only)
2. ✅ **No generated files in git**
3. ✅ **All course data in VFS**
4. ✅ **S3 as source of truth for production**
5. ✅ **Sync incomplete courses for review**
6. ✅ **Team collaboration workflow works**
7. ✅ **Dashboard loads from S3 in < 2 seconds**
8. ✅ **Cache hit rate > 80% for repeat visits**
9. ✅ **Version management automatic**
10. ✅ **No manual file copying**

---

## Open Questions

1. **S3 bucket naming**: `ssi-courses` or `ssi-dashboard-courses`?
   - **Recommendation**: `ssi-courses` (shorter, clearer)

2. **Versioning scheme**: Semantic (1.0.0) or timestamp (20251106-123456)?
   - **Recommendation**: Semantic for releases, timestamp for development

3. **Sync triggers**: Manual only, or auto-sync on course completion?
   - **Recommendation**: Manual for now, add auto-sync later

4. **Cache duration**: 24 hours, 7 days, or until version change?
   - **Recommendation**: 24 hours OR version change (whichever first)

5. **Multi-region S3**: Single region or CloudFront?
   - **Recommendation**: Start single region, add CloudFront if latency issue

---

## Next Steps

**Priority order:**

1. **Week 1**: Phase 1 - Migrate baskets to VFS
   - Create migration script
   - Run migration
   - Test locally
   - Keep backups

2. **Week 2**: Phase 2 - Create S3 sync scripts
   - sync-course-to-s3.cjs
   - sync-course-from-s3.cjs
   - Test with spa_for_eng_30seeds

3. **Week 3**: Phase 3 - Update dashboard
   - Remove public/vfs fallback
   - Add S3 fetch logic
   - Add cache layer
   - Test production workflow

4. **Week 4**: Phase 4 - Clean up
   - Remove generated files from git
   - Update .gitignore
   - Document workflows
   - Train team

---

## Conclusion

**Storage strategy summary:**

```
LOCAL VFS (vfs/courses/)
↓ (sync-to-s3)
S3 (s3://ssi-courses/)
↓ (dashboard fetch)
BROWSER CACHE (IndexedDB)

GIT: Source code only (NOT course data)
```

**Key principles:**
1. VFS is source of truth during development
2. S3 is source of truth for production
3. Git is for source code only
4. Browser cache for performance
5. Sync on demand, version on sync

---

**Status**: Proposal ready for implementation
**Author**: Claude Code
**Date**: 2025-11-06
