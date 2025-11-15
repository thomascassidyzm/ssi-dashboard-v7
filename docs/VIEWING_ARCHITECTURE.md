# Dashboard Viewing Architecture - GitHub Data Fetching

## Overview

The SSi Dashboard is a **production tooling UI** for Tom and Kai to browse, view, and manage course data during development. As of the latest update, it fetches all course data from GitHub instead of bundling it locally.

## Key Principle: GitHub as Single Source of Truth (SSoT)

**Everyone sees the same data** - whoever has the latest commit from GitHub.

### Architecture Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     GitHub Repository                        │
│  thomascassidyzm/ssi-dashboard-v7/public/vfs/courses/       │
│                                                              │
│  ├── courses-manifest.json (3.3KB - course index)          │
│  ├── spa_for_eng/                                           │
│  │   ├── seed_pairs.json                                    │
│  │   ├── lego_pairs.json                                    │
│  │   ├── lego_baskets.json                                  │
│  │   └── introductions.json                                 │
│  ├── cmn_for_eng/                                           │
│  └── ...other courses                                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
                  (GitHub Raw Content API)
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              SSi Dashboard (Vercel Deployment)              │
│                     (~5MB, lightweight)                      │
│                                                              │
│  FETCHES on-demand via:                                     │
│  https://raw.githubusercontent.com/                         │
│    thomascassidyzm/ssi-dashboard-v7/main/                  │
│    public/vfs/courses/{course}/{file}.json                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    (Browser renders)
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Dashboard Views                           │
│                                                              │
│  - CourseBrowser: List all courses                          │
│  - CourseEditor: View/edit individual course                │
│  - CanonicalSeeds: Browse canonical translations            │
└─────────────────────────────────────────────────────────────┘
```

## Data Layers

### 1. Manifest Layer (courses-manifest.json)

**Purpose:** Lightweight index of all available courses

**Location:**
- GitHub: `public/vfs/courses-manifest.json`
- Fetched via: `GITHUB_CONFIG.manifestUrl`

**Used by:**
- `CourseBrowser.vue` - List all courses
- `api.course.list()` - Get course metadata

**Format:**
```json
{
  "generated_at": "2025-11-15T12:45:45.893Z",
  "courses": [
    {
      "course_code": "spa_for_eng",
      "source_language": "ENG",
      "target_language": "SPA",
      "total_seeds": 668,
      "actual_seed_count": 668,
      "lego_count": 2487,
      "basket_count": 2716,
      "introductions_count": 2949,
      "format": "8.1.1",
      "phases_completed": ["1", "3", "4"]
    }
  ]
}
```

**Benefits:**
- Only 3.3KB (fast to load)
- Single HTTP request to see all courses
- Shows what's available without loading full course data

### 2. Course File Layer (individual JSON files)

**Purpose:** Full course data loaded on-demand

**Location:**
- GitHub: `public/vfs/courses/{courseCode}/{filename}.json`
- Fetched via: `GITHUB_CONFIG.getCourseFileUrl(courseCode, filename)`

**Files per course:**

| File | Phase | Size | Contains | Used By |
|------|-------|------|----------|---------|
| `seed_pairs.json` | 1 | ~50KB | 668 translations | CourseEditor, api.course.get() |
| `lego_pairs.json` | 3 | ~200KB | 2487 LEGOs with breakdowns | CourseEditor, api.course.get() |
| `lego_baskets.json` | 5 | ~5MB | 2716 baskets (metadata stripped) | CourseEditor.loadCourse() |
| `introductions.json` | 6 | ~3MB | 2949 introduction presentations | CourseEditor.loadCourse() |

**Fetching strategy:**
```javascript
// In CourseEditor.vue
const url = `${GITHUB_CONFIG.getCourseFileUrl(courseCode, 'lego_baskets.json')}?_t=${timestamp}`
const response = await fetch(url)
```

**Cache-busting:**
- Adds `?_t={timestamp}` to force fresh data from GitHub
- Bypasses browser cache to ensure latest data

## Viewing Components

### 1. CourseBrowser.vue

**What it shows:** Grid of all available courses

**Data flow:**
```
1. Mount → calls api.course.list()
2. api.course.list() → fetches GITHUB_CONFIG.manifestUrl
3. Parses manifest → filters courses with data
4. Renders course cards with stats
```

**Data displayed:**
- Course code (e.g., "SPA for ENG")
- Total seeds
- Counts: seed_pairs, lego_pairs, lego_baskets, introductions
- Phases completed
- Status badge

**When does it see new data?**
- When manifest is regenerated and pushed to GitHub
- When user refreshes browser (cache-busting timestamp)

### 2. CourseEditor.vue

**What it shows:** Full course viewer/editor with all phases

**Data flow:**
```
1. Route: /courses/:courseCode
2. Mount → calls loadCourse()
3. loadCourse() performs PARALLEL fetches:
   a. api.course.get(courseCode)
      - Fetches seed_pairs.json
      - Fetches lego_pairs.json
      - Returns translations + LEGOs

   b. Direct fetch: lego_baskets.json
      - Fetches from GITHUB_CONFIG.getCourseFileUrl()
      - Loads 2716 baskets

   c. Direct fetch: introductions.json
      - Fetches from GITHUB_CONFIG.getCourseFileUrl()
      - Loads 2949 introductions

   d. Direct fetch: lego_pairs.json (again, for display)
      - Parses nested structure
      - Builds legoBreakdowns for UI
```

**Why both api.course.get() AND direct fetches?**

Looking at the code:
```javascript
// Line 883: Get basic course data via API
const response = await api.course.get(courseCode)

// Line 894: Don't use API data for legos - we'll load directly
legos.value = []
legoBreakdowns.value = []

// Line 904: Fetch lego_baskets.json directly from GitHub
const url = `${GITHUB_CONFIG.getCourseFileUrl(courseCode, 'lego_baskets.json')}?_t=${timestamp}`
```

**Reason:** The API provides transformed data, but the viewer wants raw file data to ensure it's showing exactly what's in the files.

**Components used:**
- `WordDividerEditor.vue` - Show LEGO breakdowns with word boundaries
- `LegoBasketViewer.vue` - Show baskets and intro presentations

### 3. CanonicalSeeds.vue

**What it shows:** Browse canonical seed translations

**Data flow:**
```
1. Mount → fetches /vfs/seeds/canonical_seeds.json
2. Currently fetches from local /vfs/seeds/ (NOT from GitHub)
3. Displays searchable list of canonical translations
```

**⚠️ ISSUE:** This still fetches from local `/vfs/seeds/` instead of GitHub!

**Location:** Line 206 of CanonicalSeeds.vue
```javascript
const response = await fetch('/vfs/seeds/canonical_seeds.json')
```

**Should be updated to:**
```javascript
const response = await fetch(`${GITHUB_CONFIG.rawBaseUrl}/public/vfs/seeds/canonical_seeds.json`)
```

## How GitHub Fetching Works

### Configuration (src/config/github.js)

```javascript
export const GITHUB_CONFIG = {
  owner: 'thomascassidyzm',
  repo: 'ssi-dashboard-v7',
  branch: 'main',

  // Computed properties
  get rawBaseUrl() {
    return `https://raw.githubusercontent.com/${this.owner}/${this.repo}/${this.branch}`
  },

  get coursesPath() {
    return `${this.rawBaseUrl}/public/vfs/courses`
  },

  // Helper method
  getCourseFileUrl(courseCode, filename) {
    return `${this.coursesPath}/${courseCode}/${filename}`
  },

  get manifestUrl() {
    return `${this.rawBaseUrl}/public/vfs/courses-manifest.json`
  }
}
```

### Local Development Override

```javascript
// In github.js
if (import.meta.env.DEV && import.meta.env.VITE_USE_LOCAL_VFS) {
  GITHUB_CONFIG.rawBaseUrl = 'http://localhost:5173'
  GITHUB_CONFIG.coursesPath = '/vfs/courses'
}
```

**To use local VFS in development:**
```bash
# In .env.local
VITE_USE_LOCAL_VFS=true
```

**When NOT set:** Fetches from GitHub even in local dev (useful for testing production behavior)

### Build Process (vite.config.js)

**Problem:** Vite copies everything from `public/` to `dist/`

**Solution:** Custom Vite plugin removes course data after build

```javascript
{
  name: 'exclude-vfs-courses',
  closeBundle() {
    const vfsPath = 'dist/vfs/courses'
    // Remove all course directories
    // Keep only courses-manifest.json
  }
}
```

**Result:**
- Build copies all files from `public/` (435MB)
- Plugin removes course directories (keeping manifest)
- Final dist: 4.8MB
- Deployed to Vercel: 4.8MB

## What Gets Deployed vs What Gets Fetched

### Deployed to Vercel (4.8MB)

```
dist/
├── index.html
├── assets/
│   ├── index-*.js (636KB - app bundle)
│   └── index-*.css (48KB - styles)
└── vfs/
    └── courses-manifest.json (3.3KB)
```

### Fetched from GitHub (on-demand)

```
public/vfs/courses/
├── spa_for_eng/
│   ├── seed_pairs.json (~50KB)
│   ├── lego_pairs.json (~200KB)
│   ├── lego_baskets.json (~5MB)
│   └── introductions.json (~3MB)
├── cmn_for_eng/
│   └── ... (similar)
└── ... (other courses)
```

**Total course data on GitHub:** ~365MB (6 courses × ~60MB average)

**Total fetched by user viewing spa_for_eng:**
- Manifest: 3.3KB (already in bundle)
- seed_pairs.json: 50KB
- lego_pairs.json: 200KB
- lego_baskets.json: 5MB
- introductions.json: 3MB
- **Total: ~8.3MB for one course**

**Why this is better:**
- User only downloads data for courses they view
- Dashboard deployment stays lightweight
- No 365MB upload to Vercel
- Everyone sees same data (GitHub SSoT)

## Workflow: Adding New Course Data

### 1. Local Development (Tom's machine)

```bash
# Tom generates Phase 5 baskets
cd ~/SSi/SSi_Course_Production
npm run automation
curl -X POST http://localhost:3459/start -d '{"courseCode":"spa_for_eng","strategy":"balanced"}'

# Result: lego_baskets.json created in public/vfs/courses/spa_for_eng/
```

### 2. Commit to GitHub

```bash
cd ~/SSi/ssi-dashboard-v7-clean

# Regenerate manifest to include new basket count
node scripts/generate-course-manifest.js

# Commit both files
git add public/vfs/courses/spa_for_eng/lego_baskets.json
git add public/vfs/courses-manifest.json
git commit -m "Add Phase 5 baskets for spa_for_eng (2716 baskets)"
git push origin main
```

### 3. Vercel Deployment (automatic)

```
GitHub push → Vercel webhook → Rebuild
- Build excludes course data (uses vite plugin)
- Deploys only 4.8MB bundle
- Includes updated manifest with basket_count: 2716
```

### 4. Dashboard Updates (automatic)

```
User visits https://ssi-dashboard-v7.vercel.app/courses
1. Fetches manifest from GitHub (via Vercel CDN)
2. Shows spa_for_eng with "2716 baskets"
3. User clicks course
4. Fetches lego_baskets.json from GitHub raw content
5. Displays all 2716 baskets
```

**Cache-busting ensures fresh data:**
```javascript
const timestamp = Date.now()
const url = `${GITHUB_CONFIG.getCourseFileUrl(courseCode, 'lego_baskets.json')}?_t=${timestamp}`
```

## Kai's Machine vs Tom's Machine

### Before (bundled approach)

```
Tom's machine:
  - Generates course data locally
  - Pushes to GitHub
  - Vercel deploys with all data bundled

Kai's machine:
  - Visits dashboard → sees Tom's data (from Vercel bundle)
  - Generates different course locally
  - Conflict: Kai's local files ≠ Vercel bundle
  - Confusion: "Which data am I seeing?"
```

### After (GitHub fetching)

```
Tom's machine:
  - Generates course data locally
  - Pushes to GitHub
  - Vercel deploys WITHOUT course data

Kai's machine:
  - Visits dashboard → fetches from GitHub
  - Sees Tom's latest data (GitHub SSoT)
  - Generates different course locally
  - Pushes to GitHub
  - Dashboard immediately shows Kai's data

Both see: Latest data from GitHub (single source of truth)
```

## Error Handling

### File not found

```javascript
try {
  const basketsRes = await fetch(GITHUB_CONFIG.getCourseFileUrl(courseCode, 'lego_baskets.json'))
  if (basketsRes.ok) {
    basketsData.value = await basketsRes.json()
  } else {
    console.log('lego_baskets.json not found (Phase 5 may not be complete)')
    basketsData.value = null
  }
} catch (err) {
  console.log('Could not load lego_baskets.json:', err.message)
  basketsData.value = null
}
```

**Graceful degradation:**
- If Phase 5 not complete → baskets section hidden
- If Phase 6 not complete → introductions section hidden
- Course still viewable with Phase 1 + Phase 3 data

### Network errors

GitHub raw content is highly available, but if it fails:

```javascript
catch (err) {
  error.value = err.message || 'Failed to load courses'
  console.error('Failed to load courses:', err)
}
```

**User sees:**
- Error banner: "Failed to load courses"
- Can retry by refreshing

### CORS issues

GitHub raw content has CORS headers enabled, so browsers can fetch directly.

**If CORS was an issue, we'd need:**
```javascript
// Proxy through Vercel serverless function
const response = await fetch(`/api/proxy?url=${encodeURIComponent(githubUrl)}`)
```

**Currently not needed** - GitHub allows cross-origin requests.

## Performance Considerations

### Pros of GitHub Fetching

✅ **Lightweight deployments** (4.8MB vs 745MB)
✅ **Fast builds** (3.7s vs ~30s)
✅ **No Vercel size limits** (stays under free tier)
✅ **On-demand loading** (only fetch what you view)
✅ **CDN caching** (GitHub + Vercel CDN)

### Cons of GitHub Fetching

⚠️ **Network dependency** (requires internet)
⚠️ **Slower first load** (5-8MB download per course)
⚠️ **GitHub rate limits** (60 requests/hour unauthenticated)

**Mitigation:**
- Manifest is tiny (3.3KB), loads instantly
- Course files are large but only loaded when viewed
- Cache-busting still allows browser HTTP cache for same session
- GitHub CDN is fast globally

### GitHub Raw Content Rate Limits

**Unauthenticated:** 60 requests/hour per IP

**Authenticated:** 5000 requests/hour

**For dashboard:**
- Viewing course list: 1 request (manifest)
- Viewing one course: 4 requests (seed_pairs, lego_pairs, baskets, intros)
- Viewing 10 courses: ~40 requests

**Should be fine for Tom/Kai** (not public-facing app)

**If we hit limits, we could:**
1. Add GitHub personal access token (increases to 5000/hr)
2. Proxy through Vercel API with caching
3. Use GitHub GraphQL API instead

## Known Issues

### 1. CanonicalSeeds.vue still uses local /vfs/seeds/

**Location:** Line 206
```javascript
const response = await fetch('/vfs/seeds/canonical_seeds.json')
```

**Fix needed:**
```javascript
import { GITHUB_CONFIG } from '../config/github'

const response = await fetch(`${GITHUB_CONFIG.rawBaseUrl}/public/vfs/seeds/canonical_seeds.json`)
```

### 2. No loading states for GitHub fetches

**Current:** Fetches happen silently, user doesn't know data is loading

**Improvement:**
```vue
<div v-if="loadingBaskets">Loading baskets from GitHub...</div>
<div v-else-if="basketsData">
  {{ Object.keys(basketsData.baskets).length }} baskets loaded
</div>
```

### 3. No retry mechanism for failed fetches

**Current:** If GitHub fetch fails, user must refresh page

**Improvement:**
```javascript
async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetch(url)
    } catch (err) {
      if (i === retries - 1) throw err
      await sleep(1000 * (i + 1)) // exponential backoff
    }
  }
}
```

## Future Enhancements

### 1. Progressive loading

Load essential data first, then optional data:

```javascript
// Load in stages
await loadManifest()        // 3KB - instant
await loadSeedPairs()       // 50KB - fast
await loadLegoPairs()       // 200KB - medium
await loadBaskets()         // 5MB - slower (background)
```

### 2. Service Worker caching

Cache GitHub responses in browser:

```javascript
// In service-worker.js
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('raw.githubusercontent.com')) {
    event.respondWith(
      caches.open('github-course-data').then((cache) => {
        return cache.match(event.request).then((response) => {
          return response || fetch(event.request).then((response) => {
            cache.put(event.request, response.clone())
            return response
          })
        })
      })
    )
  }
})
```

### 3. Delta updates

Only fetch changed files:

```javascript
// In manifest
{
  "courses": [{
    "course_code": "spa_for_eng",
    "file_hashes": {
      "seed_pairs.json": "abc123",
      "lego_baskets.json": "def456"
    }
  }]
}

// In viewer
if (cachedHash === manifest.file_hashes['lego_baskets.json']) {
  // Use cached data
} else {
  // Fetch fresh data
}
```

## Summary

The dashboard now operates as a **thin client** that fetches course data from GitHub on-demand:

**Benefits:**
- ✅ Everyone sees the same data (GitHub SSoT)
- ✅ Lightweight deployments (98.9% size reduction)
- ✅ Fast builds and deploys
- ✅ No confusion about which data is being shown

**Trade-offs:**
- ⚠️ Requires internet connection
- ⚠️ Slower first load per course (5-8MB download)
- ⚠️ Dependent on GitHub availability

**Overall:** Much better for a production tooling dashboard used by 2-3 developers. Not suitable for public-facing student app (which will be on AWS with pre-loaded data).
