# Basket Display & Editing Architecture Proposal

**Date**: 2025-11-06
**Context**: After curating S0011 to 10 excellent phrases, we need systematic architecture for displaying and editing baskets across ALL future courses

---

## Current State Analysis

### What We Have ✅

**1. Excellent Basket Viewer Component** (`LegoBasketViewer.vue`)
- Beautiful UI with quality metrics
- Supports hand-crafted vs AI-generated toggle
- Conversational quality scoring (5+ LEGOs, conjunctions)
- Pattern and LEGO count visualization
- **Issue**: Hardcoded to load from `/baskets/` and `/generated_baskets/`
- **Issue**: Hardcoded seed selection [11, 21, 31] or [1-50]
- **Issue**: No course awareness - just loads files from public directory

**2. Quality & Regeneration API** (`qualityApi.js`)
- `regenerateSeeds()` - Trigger SEED-level regeneration
- `excludeSeed()` - Flag seed for removal
- `acceptSeed()` - Mark seed as reviewed
- `pollRegenerationJob()` - Track regeneration progress
- **Issue**: This is for SEED regeneration (Phase 3 LEGOs), not BASKET regeneration (Phase 5)
- **Issue**: No basket-specific endpoints

**3. Course Generation UI** (`CourseGeneration.vue`)
- Nice language pair selection (dropdowns with native names)
- Smart recommendations based on existing progress
- Supports test (30 seeds) or full (668 seeds)
- **Issue**: No integration with basket viewing
- **Issue**: No way to browse to baskets after course generation

**4. VFS/S3 Integration** (`api.js`, `automation_server.cjs`)
- Local development: `/vfs/courses/{courseCode}/`
- Published courses: S3 → `/public/vfs/courses/{courseCode}/`
- Dashboard has fallback: API first, then static files
- **Issue**: No mechanism for "incomplete but displayable" courses
- **Issue**: Baskets aren't part of VFS structure

### What's Missing ❌

1. **No systematic basket browsing**
   - Can't browse baskets across all courses
   - No course library → basket viewer integration
   - No language pair filtering

2. **No basket editing/management**
   - Can't edit baskets in UI
   - Can't flag individual phrases for removal
   - Can't trigger basket regeneration
   - qualityApi only handles SEEDs, not BASKETs

3. **No VFS integration for baskets**
   - Baskets live in `/public/baskets/` (static)
   - Not part of course VFS structure
   - Can't sync incomplete courses to S3 for review

4. **No systematic file organization**
   - Baskets scattered between `/baskets/` and `/generated_baskets/`
   - No consistent naming (sometimes `_conversational`, sometimes `_curated`)
   - No version control in file structure

---

## Proposed Architecture

### 1. **Basket Storage Structure**

#### Move baskets into VFS structure:

```
vfs/courses/{courseCode}/
├── seed_pairs.json           # Phase 1
├── lego_pairs.json           # Phase 3
├── lego_baskets.json         # Phase 5 ← NEW
├── lego_baskets_metadata.json # Phase 5 metadata ← NEW
└── compiled/                 # Phase 7
    └── ...
```

**`lego_baskets.json` structure:**
```json
{
  "version": "curated_v6",
  "course_code": "spa_for_eng_30seeds",
  "baskets": {
    "S0001": {
      "seed_pair": {"known": "...", "target": "..."},
      "patterns_introduced": "P01",
      "cumulative_patterns": ["P01"],
      "cumulative_legos": 1,
      "lessons": {
        "S0001L01": {
          "lego": ["I want", "Quiero"],
          "type": "C",
          "practice_phrases": [
            ["I want", "Quiero", "P01", 1],
            ...
          ]
        }
      }
    },
    "S0011": { ... },
    ...
  }
}
```

**`lego_baskets_metadata.json` structure:**
```json
{
  "version": "curated_v6",
  "course_code": "spa_for_eng_30seeds",
  "total_baskets": 30,
  "generation_date": "2025-11-06T00:00:00Z",
  "basket_metadata": {
    "S0001": {
      "status": "accepted",
      "quality_score": 95,
      "conversational_rate": 60,
      "gate_compliance": true,
      "last_regenerated": null,
      "flagged_for_review": false
    },
    "S0011": {
      "status": "curated",
      "quality_score": 100,
      "conversational_rate": 60,
      "gate_compliance": true,
      "last_regenerated": "2025-11-06T00:00:00Z",
      "flagged_for_review": false,
      "notes": "Molecular LEGO fix: L03+L04 merged"
    }
  }
}
```

#### Benefits:
- ✅ Baskets are part of course structure
- ✅ Can upload incomplete courses to S3 for review
- ✅ Single source of truth per course
- ✅ Version control built in
- ✅ Metadata tracks quality and status

---

### 2. **Course Library with Basket Browsing**

#### New View: `CourseLibrary.vue`

```vue
<template>
  <div class="course-library">
    <!-- Header with Search/Filter -->
    <div class="header">
      <h1>Course Library</h1>

      <!-- Language Pair Filter -->
      <div class="filters">
        <select v-model="filterKnownLang">
          <option value="">All Known Languages</option>
          <option value="eng">English</option>
          <option value="spa">Spanish</option>
          ...
        </select>

        <select v-model="filterTargetLang">
          <option value="">All Target Languages</option>
          <option value="spa">Spanish</option>
          <option value="ita">Italian</option>
          ...
        </select>

        <input
          v-model="searchQuery"
          placeholder="Search courses..."
        />
      </div>
    </div>

    <!-- Course Grid -->
    <div class="course-grid">
      <div
        v-for="course in filteredCourses"
        :key="course.course_code"
        class="course-card"
        @click="viewCourse(course)"
      >
        <div class="course-header">
          <h3>{{ course.target_language }} for {{ course.source_language }}</h3>
          <span class="seed-count">{{ course.total_seeds }} seeds</span>
        </div>

        <div class="course-stats">
          <div>
            <span class="label">Phase 1:</span>
            <span :class="course.seed_pairs > 0 ? 'complete' : 'incomplete'">
              {{ course.seed_pairs }} seeds
            </span>
          </div>
          <div>
            <span class="label">Phase 3:</span>
            <span :class="course.lego_pairs > 0 ? 'complete' : 'incomplete'">
              {{ course.lego_pairs }} LEGOs
            </span>
          </div>
          <div>
            <span class="label">Phase 5:</span>
            <span :class="course.lego_baskets > 0 ? 'complete' : 'incomplete'">
              {{ course.lego_baskets }} baskets
            </span>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="quick-actions">
          <button @click.stop="viewBaskets(course)">
            📊 View Baskets
          </button>
          <button @click.stop="viewQuality(course)">
            🔍 Quality Report
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
```

#### Features:
- **Language pair filtering** (like CourseGeneration.vue)
- **Search** by course code
- **Status indicators** for each phase
- **Quick actions**: View baskets, view quality report
- **Click course card** → Navigate to course detail view

---

### 3. **Course Detail View with Basket Management**

#### New View: `CourseDetail.vue`

```vue
<template>
  <div class="course-detail">
    <!-- Course Header -->
    <div class="course-header">
      <router-link to="/library">← Back to Library</router-link>
      <h1>{{ course.target_language }} for {{ course.source_language }}</h1>
      <p>{{ course.total_seeds }} seeds | v{{ course.version }}</p>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button
        @click="activeTab = 'overview'"
        :class="{ active: activeTab === 'overview' }"
      >
        Overview
      </button>
      <button
        @click="activeTab = 'seeds'"
        :class="{ active: activeTab === 'seeds' }"
      >
        Seeds (Phase 1)
      </button>
      <button
        @click="activeTab = 'legos'"
        :class="{ active: activeTab === 'legos' }"
      >
        LEGOs (Phase 3)
      </button>
      <button
        @click="activeTab = 'baskets'"
        :class="{ active: activeTab === 'baskets' }"
      >
        Baskets (Phase 5) ← PRIMARY TAB
      </button>
      <button
        @click="activeTab = 'quality'"
        :class="{ active: activeTab === 'quality' }"
      >
        Quality Report
      </button>
    </div>

    <!-- Baskets Tab -->
    <div v-if="activeTab === 'baskets'" class="baskets-view">
      <!-- Basket List Sidebar -->
      <div class="basket-list">
        <div class="basket-filters">
          <input v-model="basketSearch" placeholder="Search baskets..." />
          <select v-model="basketFilter">
            <option value="all">All Baskets</option>
            <option value="flagged">Flagged for Review</option>
            <option value="accepted">Accepted</option>
            <option value="curated">Curated</option>
          </select>
        </div>

        <div
          v-for="basket in filteredBaskets"
          :key="basket.id"
          :class="['basket-item', {
            active: currentBasket === basket.id,
            flagged: basket.metadata.flagged_for_review
          }]"
          @click="selectBasket(basket.id)"
        >
          <div class="basket-header">
            <span class="basket-id">{{ basket.id }}</span>
            <span
              v-if="basket.metadata.flagged_for_review"
              class="flag-icon"
              title="Flagged for review"
            >
              🚩
            </span>
          </div>
          <div class="basket-summary">
            <span class="lego-count">{{ basket.total_legos }} LEGOs</span>
            <span class="quality-score">{{ basket.metadata.quality_score }}%</span>
          </div>
        </div>
      </div>

      <!-- Basket Detail (uses existing LegoBasketViewer component) -->
      <div class="basket-detail">
        <!-- Action Bar -->
        <div class="action-bar">
          <button @click="editBasket" class="btn-primary">
            ✏️ Edit Basket
          </button>
          <button @click="regenerateBasket" class="btn-secondary">
            🔄 Regenerate
          </button>
          <button @click="flagBasket" class="btn-warning">
            🚩 Flag for Review
          </button>
          <button @click="exportBasket" class="btn-secondary">
            💾 Export JSON
          </button>
        </div>

        <!-- Basket Viewer (reuse existing component) -->
        <lego-basket-viewer-embedded
          :course-code="courseCode"
          :seed-id="currentBasket"
          :editable="true"
          @phrase-flagged="handlePhraseFlag"
        />
      </div>
    </div>
  </div>
</template>
```

#### Features:
- **Basket list sidebar** with search/filter
- **Flagged basket indicators** (🚩)
- **Quality scores** at a glance
- **Action bar** for editing, regenerating, flagging
- **Embedded basket viewer** (reuses existing component)
- **Phrase-level flagging** (click to flag individual phrases)

---

### 4. **Basket Editing Modal**

#### New Component: `BasketEditor.vue`

```vue
<template>
  <div class="basket-editor-modal">
    <div class="modal-header">
      <h2>Edit {{ basketId }}</h2>
      <button @click="close">✕</button>
    </div>

    <div class="modal-body">
      <!-- Lesson Tabs -->
      <div class="lesson-tabs">
        <button
          v-for="(lesson, idx) in basket.lessons"
          :key="lesson.id"
          @click="currentLesson = idx"
          :class="{ active: currentLesson === idx }"
        >
          {{ lesson.id }} - {{ lesson.lego[0] }}
        </button>
      </div>

      <!-- Phrase Editor -->
      <div class="phrase-editor">
        <h3>{{ basket.lessons[currentLesson].id }} Practice Phrases</h3>

        <!-- Editable Table -->
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Known (English)</th>
              <th>Target (Spanish)</th>
              <th>Pattern</th>
              <th>LEGOs</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(phrase, idx) in basket.lessons[currentLesson].practice_phrases"
              :key="idx"
            >
              <td>{{ idx + 1 }}</td>
              <td>
                <input
                  v-model="phrase[0]"
                  class="editable-cell"
                  @change="markDirty"
                />
              </td>
              <td>
                <input
                  v-model="phrase[1]"
                  class="editable-cell"
                  @change="markDirty"
                />
              </td>
              <td>
                <select
                  v-model="phrase[2]"
                  @change="markDirty"
                >
                  <option :value="null">-</option>
                  <option v-for="pattern in availablePatterns" :value="pattern">
                    {{ pattern }}
                  </option>
                </select>
              </td>
              <td>
                <input
                  v-model.number="phrase[3]"
                  type="number"
                  class="editable-cell-small"
                  @change="markDirty"
                />
              </td>
              <td>
                <button
                  @click="removePhrase(idx)"
                  class="btn-danger-small"
                  title="Remove phrase"
                >
                  🗑️
                </button>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Add Phrase -->
        <button @click="addPhrase" class="btn-secondary">
          ➕ Add Phrase
        </button>
      </div>
    </div>

    <div class="modal-footer">
      <button @click="validateAndSave" class="btn-primary" :disabled="!isDirty">
        💾 Save Changes
      </button>
      <button @click="cancel" class="btn-secondary">
        Cancel
      </button>

      <!-- Validation Warnings -->
      <div v-if="validationWarnings.length > 0" class="warnings">
        <p v-for="warning in validationWarnings" :key="warning">
          ⚠️ {{ warning }}
        </p>
      </div>
    </div>
  </div>
</template>
```

#### Features:
- **Inline editing** of all phrase fields
- **Add/remove phrases**
- **Validation** before saving (GATE compliance, completeness)
- **Dirty state tracking** (only save if changed)
- **Warnings** for quality issues

---

### 5. **Basket API Endpoints** (NEW)

#### Extend `automation_server.cjs` with basket endpoints:

```javascript
// GET /api/courses/:courseCode/baskets
// Returns all baskets for a course
app.get('/api/courses/:courseCode/baskets', async (req, res) => {
  const { courseCode } = req.params

  try {
    const basketsPath = path.join(VFS_BASE, 'courses', courseCode, 'lego_baskets.json')
    const metadataPath = path.join(VFS_BASE, 'courses', courseCode, 'lego_baskets_metadata.json')

    const baskets = JSON.parse(fs.readFileSync(basketsPath, 'utf8'))
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'))

    res.json({
      baskets: baskets.baskets,
      metadata: metadata.basket_metadata
    })
  } catch (err) {
    res.status(404).json({ error: 'Baskets not found' })
  }
})

// GET /api/courses/:courseCode/baskets/:seedId
// Returns specific basket
app.get('/api/courses/:courseCode/baskets/:seedId', async (req, res) => {
  const { courseCode, seedId } = req.params

  try {
    const basketsPath = path.join(VFS_BASE, 'courses', courseCode, 'lego_baskets.json')
    const baskets = JSON.parse(fs.readFileSync(basketsPath, 'utf8'))

    if (!baskets.baskets[seedId]) {
      return res.status(404).json({ error: 'Basket not found' })
    }

    res.json(baskets.baskets[seedId])
  } catch (err) {
    res.status(404).json({ error: 'Basket not found' })
  }
})

// PUT /api/courses/:courseCode/baskets/:seedId
// Update specific basket
app.put('/api/courses/:courseCode/baskets/:seedId', async (req, res) => {
  const { courseCode, seedId } = req.params
  const { basket } = req.body

  try {
    const basketsPath = path.join(VFS_BASE, 'courses', courseCode, 'lego_baskets.json')
    const baskets = JSON.parse(fs.readFileSync(basketsPath, 'utf8'))

    // Validate basket
    const validation = validateBasket(basket)
    if (!validation.valid) {
      return res.status(400).json({
        error: 'Basket validation failed',
        warnings: validation.warnings
      })
    }

    // Update basket
    baskets.baskets[seedId] = basket

    // Save
    fs.writeFileSync(basketsPath, JSON.stringify(baskets, null, 2))

    // Update metadata
    updateBasketMetadata(courseCode, seedId, {
      last_modified: new Date().toISOString(),
      status: 'edited'
    })

    res.json({ success: true, basket })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/courses/:courseCode/baskets/:seedId/flag
// Flag basket for review
app.post('/api/courses/:courseCode/baskets/:seedId/flag', async (req, res) => {
  const { courseCode, seedId } = req.params
  const { reason } = req.body

  try {
    updateBasketMetadata(courseCode, seedId, {
      flagged_for_review: true,
      flag_reason: reason,
      flagged_at: new Date().toISOString()
    })

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/courses/:courseCode/baskets/:seedId/regenerate
// Trigger basket regeneration
app.post('/api/courses/:courseCode/baskets/:seedId/regenerate', async (req, res) => {
  const { courseCode, seedId } = req.params
  const { reason } = req.body

  try {
    // Create regeneration job
    const jobId = `regen-${seedId}-${Date.now()}`

    STATE.regenerationJobs.set(jobId, {
      status: 'pending',
      courseCode,
      seedIds: [seedId],
      reason,
      startTime: Date.now(),
      results: {}
    })

    // Spawn agent to regenerate basket
    spawnBasketRegenerationAgent(courseCode, seedId, jobId)

    res.json({
      success: true,
      jobId,
      message: `Basket ${seedId} regeneration started`
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/courses/:courseCode/baskets/validate
// Validate basket without saving
app.post('/api/courses/:courseCode/baskets/validate', async (req, res) => {
  const { basket } = req.body

  const validation = validateBasket(basket)

  res.json({
    valid: validation.valid,
    warnings: validation.warnings,
    gate_violations: validation.gate_violations,
    completeness_issues: validation.completeness_issues
  })
})

// Helper: Validate basket
function validateBasket(basket) {
  const warnings = []
  const gate_violations = []
  const completeness_issues = []

  // Check each lesson
  for (const lessonKey in basket.lessons) {
    const lesson = basket.lessons[lessonKey]

    // Check phrase count (should be 10)
    if (lesson.practice_phrases.length !== 10) {
      warnings.push(`${lessonKey}: Has ${lesson.practice_phrases.length} phrases (expected 10)`)
    }

    // Check GATE compliance (word-by-word)
    for (const [idx, phrase] of lesson.practice_phrases.entries()) {
      const [known, target, pattern, legoCount] = phrase

      // Tokenize Spanish phrase
      const words = target.toLowerCase().split(/\s+/)

      // Check against whitelist (TODO: load from extraction map)
      for (const word of words) {
        if (!isInVocabularyWhitelist(word, lessonKey)) {
          gate_violations.push(`${lessonKey} phrase ${idx + 1}: "${word}" not taught`)
        }
      }

      // Check completeness
      if (!known.trim() || !target.trim()) {
        completeness_issues.push(`${lessonKey} phrase ${idx + 1}: Empty English or Spanish`)
      }
    }
  }

  return {
    valid: gate_violations.length === 0 && completeness_issues.length === 0,
    warnings,
    gate_violations,
    completeness_issues
  }
}
```

---

### 6. **Local → S3 Sync for Incomplete Courses**

#### New Sync Mechanism:

```javascript
// POST /api/courses/:courseCode/sync
// Upload course VFS to S3 (even if incomplete)
app.post('/api/courses/:courseCode/sync', async (req, res) => {
  const { courseCode } = req.params
  const { force } = req.body

  try {
    const courseDir = path.join(VFS_BASE, 'courses', courseCode)

    // Collect all files
    const filesToSync = []

    if (fs.existsSync(path.join(courseDir, 'seed_pairs.json'))) {
      filesToSync.push('seed_pairs.json')
    }

    if (fs.existsSync(path.join(courseDir, 'lego_pairs.json'))) {
      filesToSync.push('lego_pairs.json')
    }

    if (fs.existsSync(path.join(courseDir, 'lego_baskets.json'))) {
      filesToSync.push('lego_baskets.json')
      filesToSync.push('lego_baskets_metadata.json')
    }

    // Upload to S3
    for (const file of filesToSync) {
      const localPath = path.join(courseDir, file)
      const s3Key = `courses/${courseCode}/${file}`

      await uploadToS3(localPath, s3Key)
    }

    res.json({
      success: true,
      files_synced: filesToSync.length,
      message: `Uploaded ${filesToSync.length} files to S3`
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})
```

#### Benefits:
- ✅ Can work on baskets locally
- ✅ Sync incomplete courses to S3 for team review
- ✅ Dashboard can display S3-hosted incomplete courses
- ✅ Enables distributed curation workflow

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1)

1. **Migrate basket storage structure**
   - Create migration script: `migrate_baskets_to_vfs.cjs`
   - Move `/public/baskets/*.json` → `/vfs/courses/{courseCode}/lego_baskets.json`
   - Generate `lego_baskets_metadata.json` for existing baskets
   - Update basket viewer to load from VFS

2. **Create basket API endpoints**
   - GET `/api/courses/:courseCode/baskets`
   - GET `/api/courses/:courseCode/baskets/:seedId`
   - POST `/api/courses/:courseCode/baskets/validate`
   - PUT `/api/courses/:courseCode/baskets/:seedId`

3. **Test with S0011**
   - Verify curated S0011 loads correctly from VFS
   - Test basket validation endpoint
   - Test basket update endpoint

### Phase 2: Browsing (Week 2)

4. **Build Course Library view**
   - Create `CourseLibrary.vue`
   - Language pair filtering
   - Search functionality
   - Quick actions (view baskets, quality report)

5. **Build Course Detail view**
   - Create `CourseDetail.vue`
   - Tabs: Overview, Seeds, LEGOs, Baskets, Quality
   - Basket list sidebar
   - Integrate existing LegoBasketViewer component

6. **Update routing**
   - `/library` → CourseLibrary
   - `/courses/:courseCode` → CourseDetail
   - `/courses/:courseCode/baskets` → CourseDetail (baskets tab)

### Phase 3: Editing (Week 3)

7. **Build Basket Editor modal**
   - Create `BasketEditor.vue`
   - Inline phrase editing
   - Add/remove phrases
   - Client-side validation
   - Dirty state tracking

8. **Add flag/regenerate actions**
   - POST `/api/courses/:courseCode/baskets/:seedId/flag`
   - POST `/api/courses/:courseCode/baskets/:seedId/regenerate`
   - UI buttons in CourseDetail action bar
   - Regeneration job polling (reuse qualityApi pattern)

9. **Implement GATE validation**
   - Load vocabulary whitelist from extraction map
   - Word-by-word Spanish validation
   - Show violations in editor
   - Prevent save if critical violations

### Phase 4: Sync (Week 4)

10. **S3 sync for incomplete courses**
    - POST `/api/courses/:courseCode/sync`
    - Upload baskets to S3
    - Update course metadata with sync timestamp
    - Dashboard loads from S3 if available

11. **Testing & Polish**
    - Test full workflow: Local edit → Validate → Save → Sync → View in dashboard
    - Add loading states
    - Add error handling
    - Documentation

---

## User Workflows

### Workflow 1: Curate New Basket

```
1. User navigates to Course Library
2. Filters by language pair: "Spanish for English"
3. Clicks course card: "spa_for_eng_30seeds"
4. Switches to "Baskets" tab
5. Sees S0001-S0030 in sidebar, with quality scores
6. Clicks S0011
7. Reviews basket in viewer
8. Clicks "Edit Basket"
9. Basket Editor modal opens
10. User removes redundant phrases (15 → 10)
11. Edits phrase: "I'd like to speak better" → "I'd like to speak a little more"
12. Clicks "Save Changes"
13. Validation runs (GATE compliance, completeness)
14. Validation passes, basket saved
15. Modal closes, viewer refreshes with updated basket
16. Metadata updated: status = "curated", last_modified = now
```

### Workflow 2: Flag Basket for Regeneration

```
1. User reviews S0021 basket
2. Sees multiple GATE violations in quality metrics
3. Clicks "Flag for Review"
4. Modal opens: "Why are you flagging this basket?"
5. User selects: "GATE violations" + adds note
6. Clicks "Flag"
7. Basket metadata updated: flagged_for_review = true
8. Basket now shows 🚩 flag in sidebar
9. Later, developer sees flagged baskets
10. Clicks "Regenerate"
11. Regeneration job starts
12. User polls job status
13. When complete, new basket replaces old one
14. Flag cleared, status = "regenerated"
```

### Workflow 3: Sync Incomplete Course to S3

```
1. Developer working locally on spa_for_eng_30seeds
2. Has completed Phase 1 (seeds) and Phase 3 (LEGOs)
3. Basket generation in progress (S0001-S0015 done)
4. Wants to share progress with team for review
5. Clicks "Sync to S3" button in Course Detail
6. Syncs:
   - seed_pairs.json
   - lego_pairs.json
   - lego_baskets.json (partial, S0001-S0015)
   - lego_baskets_metadata.json
7. Team opens dashboard
8. Dashboard loads from S3
9. Team sees partial course, can review S0001-S0015 baskets
10. Team adds flags/comments
11. Developer pulls updates, continues work
```

---

## Technical Considerations

### 1. **Performance**

**Issue**: Loading all baskets for a 668-seed course could be slow.

**Solution**:
- Lazy-load baskets (only load when selected)
- Pagination in basket sidebar (25 baskets at a time)
- Cache baskets in browser localStorage
- Use virtual scrolling for large lists

### 2. **Concurrency**

**Issue**: Multiple users editing same basket simultaneously.

**Solution**:
- Add optimistic locking (version field in metadata)
- Check version on save, reject if changed
- Show "This basket was updated by someone else" error
- Provide "Reload and retry" option

### 3. **Validation Performance**

**Issue**: Word-by-word GATE validation could be slow for large baskets.

**Solution**:
- Pre-build vocabulary whitelist (cached)
- Use Set for O(1) lookups
- Validate in background (Web Worker)
- Show validation progress bar

### 4. **S3 Sync**

**Issue**: Large courses take time to upload.

**Solution**:
- Background job with progress tracking
- Only sync changed files (MD5 comparison)
- Compression before upload
- Parallel uploads (multiple files at once)

### 5. **Backward Compatibility**

**Issue**: Existing baskets in `/public/baskets/` need migration.

**Solution**:
- Migration script: `migrate_baskets_to_vfs.cjs`
- Keep old files temporarily (mark as deprecated)
- Update basket viewer to try VFS first, fall back to public
- Remove old files after 1 month

---

## Open Questions

1. **Basket versioning**: Should we keep full version history, or just latest + 1 backup?
   - **Recommendation**: Keep last 3 versions in metadata, full history in git

2. **Regeneration scope**: Regenerate entire basket, or individual lessons?
   - **Recommendation**: Start with full basket, add lesson-level later if needed

3. **Approval workflow**: Should edited baskets require review before going live?
   - **Recommendation**: Yes, add `status: "pending_review"` → `status: "approved"`

4. **Multi-language support**: How to handle basket viewer for non-English known languages?
   - **Recommendation**: Make labels dynamic based on course language pair

5. **Export format**: Should we support exporting baskets to CSV/Excel for external review?
   - **Recommendation**: Yes, add "Export to CSV" button in action bar

---

## Success Metrics

**After implementation, we should be able to:**

1. ✅ Browse all courses by language pair
2. ✅ View baskets for any course in systematic way
3. ✅ Edit baskets inline with validation
4. ✅ Flag baskets for review/regeneration
5. ✅ Sync incomplete courses to S3 for team review
6. ✅ Track basket quality across all courses
7. ✅ Systematically curate 50+ courses worth of baskets
8. ✅ Maintain single source of truth per course
9. ✅ Version control all basket changes
10. ✅ Scale to 668-seed courses without performance issues

---

## Conclusion

This architecture provides:
- **Systematic browsing** - Course library with language filtering
- **Centralized storage** - Baskets in VFS structure
- **Full editing** - Inline editing with validation
- **Quality management** - Flagging, regeneration, approval workflow
- **Team collaboration** - S3 sync for incomplete courses
- **Scalability** - Handles 50+ courses with 668 seeds each

**Next step**: Start with Phase 1 (migrate basket storage) and build incrementally.

---

**Status**: Proposal ready for review
**Author**: Claude Code
**Date**: 2025-11-06
