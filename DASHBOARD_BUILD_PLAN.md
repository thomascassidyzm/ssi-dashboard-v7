# DASHBOARD BUILD PLAN
**4 Parallel Development Tracks**

---

## OVERVIEW

This build plan organizes the remaining dashboard work into 4 parallel tracks that can be developed simultaneously by different developers or AI agents. Each track has minimal dependencies on the others, enabling fast parallel execution.

**Total Estimated Effort:** 18-24 hours
**Target Completion:** 1-2 weeks
**Parallelization Factor:** 4x (can be done simultaneously)

---

## TRACK 1: Course Generation UI
**Owner:** Developer A / Agent 1
**Effort:** 4-6 hours
**Priority:** High
**Dependencies:** None (already has working components)

### Components to Build/Fix
1. ✅ CourseGeneration.vue (COMPLETE - no changes needed)
2. 🔧 ProcessOverview.vue (ENHANCE - add live data)
3. 🔧 TrainingPhase.vue (FIX - integrate live prompts)

---

### Task 1.1: Enhance ProcessOverview.vue
**Complexity:** Simple
**Effort:** 1 hour
**Can Build in Parallel:** Yes

**Current State:**
- Static documentation page
- Shows 8 phases
- No live data

**Required Changes:**
```javascript
// Add to ProcessOverview.vue
import { ref, onMounted } from 'vue'
import api from '../services/api'

// Fetch active courses
const activeCourses = ref([])
const loading = ref(false)

onMounted(async () => {
  loading.value = true
  try {
    const response = await api.course.list()
    activeCourses.value = response.courses.filter(c => c.status === 'in_progress')
  } catch (error) {
    console.error('Failed to load active courses:', error)
  } finally {
    loading.value = false
  }
})

// Add section showing active generation jobs
```

**UI Enhancements:**
- Show "Active Generations" section at top
- Display current phase for each active course
- Link to CourseGeneration status for each
- Add "View Phase Details" links to TrainingPhase.vue

**Files to Modify:**
- `/src/views/ProcessOverview.vue`

---

### Task 1.2: Fix TrainingPhase.vue Live Prompt Integration
**Complexity:** Medium
**Effort:** 3 hours
**Can Build in Parallel:** Yes

**Current State:**
- Has `usePromptManager` composable
- Has `fetchPrompt()` and `savePrompt()` methods
- **BUT** Still displays hardcoded `phaseContent` object

**Required Changes:**

#### Step 1: Remove/Minimize Hardcoded Content
```javascript
// In TrainingPhase.vue

// REMOVE or make fallback-only
const phaseContent = {
  // Keep minimal fallback for offline/error states
}

// UPDATE computed to prioritize live data
const phaseData = computed(() => {
  if (promptMeta.value && promptMeta.value.name) {
    // Use live data from API
    return {
      name: promptMeta.value.name,
      description: promptMeta.value.description || 'Live from APML Registry',
      overview: 'Fetched from automation server',
      objectives: [],
      steps: [],
      notes: [],
      output: ''
    }
  }
  // Fallback to hardcoded only if API fails
  return phaseContent[props.id] || defaultPhaseData
})
```

#### Step 2: Add Version History Display
```javascript
// Add to TrainingPhase.vue
const versionHistory = ref([])
const loadingHistory = ref(false)

const fetchVersionHistory = async () => {
  loadingHistory.value = true
  try {
    const response = await fetch(`${API_BASE_URL}/api/prompts/${props.id}/history`)
    const data = await response.json()
    versionHistory.value = data.history || []
  } catch (error) {
    console.error('Failed to load version history:', error)
  } finally {
    loadingHistory.value = false
  }
}

onMounted(() => {
  fetchPrompt()
  fetchVersionHistory()
})
```

#### Step 3: Add Visual Indicators
```html
<!-- Add to template -->
<div v-if="promptMeta" class="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-4 mb-4">
  <div class="flex items-center gap-2">
    <svg class="w-5 h-5 text-emerald-400 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
      <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"/>
    </svg>
    <span class="text-emerald-300 font-medium">🟢 Live from APML Registry</span>
  </div>
  <div class="mt-2 text-sm text-slate-400">
    <div>Version: {{ promptMeta.version }}</div>
    <div>Last Modified: {{ new Date(promptMeta.lastModified).toLocaleString() }}</div>
  </div>
</div>
```

#### Step 4: Add Version History Section
```html
<section class="mb-8">
  <h2 class="text-2xl font-semibold text-emerald-400 mb-4">Version History</h2>
  <div v-if="loadingHistory" class="text-slate-400">Loading history...</div>
  <div v-else-if="versionHistory.length === 0" class="text-slate-500">No version history available</div>
  <div v-else class="space-y-2">
    <div v-for="version in versionHistory" :key="version.hash"
         class="bg-slate-900/80 border border-slate-400/20 rounded p-3">
      <div class="flex items-center justify-between">
        <div class="text-slate-300">{{ version.message }}</div>
        <div class="text-xs text-slate-500">{{ new Date(version.date).toLocaleDateString() }}</div>
      </div>
      <div class="text-xs text-slate-500 mt-1">
        by {{ version.author }} • {{ version.hash.substring(0, 7) }}
      </div>
    </div>
  </div>
</section>
```

**Files to Modify:**
- `/src/views/TrainingPhase.vue`
- `/src/composables/usePromptManager.js` (if needed)

**Testing Checklist:**
- [ ] Prompt loads from `/api/prompts/:phase` on mount
- [ ] No hardcoded content shown when API succeeds
- [ ] Version history displays correctly
- [ ] Save button commits to Git
- [ ] Live indicator shows green when connected

---

## TRACK 2: Quality Review UI
**Owner:** Developer B / Agent 2
**Effort:** 5-7 hours
**Priority:** CRITICAL
**Dependencies:** None (components exist, need integration)

### Components to Build/Fix
1. 🔧 Router integration (ADD ROUTES)
2. 🔧 API service fixes (FIX URL MISMATCHES)
3. 🔧 Dashboard.vue navigation (ADD LINKS)
4. ✅ QualityDashboard.vue (COMPLETE - just needs routing)
5. ✅ SeedQualityReview.vue (COMPLETE - just needs routing)
6. ✅ PromptEvolutionView.vue (COMPLETE - just needs routing)

---

### Task 2.1: Fix API Service URL Mismatches
**Complexity:** Simple
**Effort:** 1 hour
**Can Build in Parallel:** Yes
**BLOCKER:** Must complete before quality components work

**Current Problem:**
```javascript
// api.js currently has:
GET /api/quality/:courseCode/overview ❌
GET /api/quality/:courseCode/seeds/:seedId ❌

// automation_server.cjs actually implements:
GET /api/courses/:code/quality ✅
GET /api/courses/:code/seeds/:seedId/review ✅
```

**Required Changes:**
```javascript
// Update src/services/api.js

quality: {
  // FIX: Change from /api/quality/* to /api/courses/*
  async getOverview(courseCode) {
    const response = await api.get(`/api/courses/${courseCode}/quality`) // FIXED
    return response.data
  },

  async getSeeds(courseCode, filters = {}) {
    // This endpoint doesn't exist yet - need to add to automation_server or remove
    // For now, return data from overview
    const overview = await this.getOverview(courseCode)
    return { seeds: overview.flagged_seeds || [] }
  },

  async getSeedDetail(courseCode, seedId) {
    const response = await api.get(`/api/courses/${courseCode}/seeds/${seedId}/review`) // FIXED
    return response.data
  },

  async getSeedAttempts(courseCode, seedId) {
    // This is part of getSeedDetail
    const detail = await this.getSeedDetail(courseCode, seedId)
    return { attempts: detail.attempts || [] }
  },

  async acceptAttempt(courseCode, seedId, attemptId) {
    const response = await api.post(`/api/courses/${courseCode}/seeds/${seedId}/accept`) // FIXED
    return response.data
  },

  async rerunSeed(courseCode, seedId) {
    const response = await api.post(`/api/courses/${courseCode}/seeds/regenerate`, {
      seed_ids: [seedId]
    }) // FIXED
    return response.data
  },

  async bulkRerun(courseCode, seedIds) {
    const response = await api.post(`/api/courses/${courseCode}/seeds/regenerate`, {
      seed_ids: seedIds
    }) // FIXED
    return response.data
  },

  async removeSeed(courseCode, seedId) {
    const response = await api.delete(`/api/courses/${courseCode}/seeds/${seedId}`) // OK
    return response.data
  },

  async getPromptEvolution(courseCode) {
    const response = await api.get(`/api/courses/${courseCode}/prompt-evolution`) // FIXED
    return response.data
  },

  // Keep other methods but update URLs similarly
}
```

**Files to Modify:**
- `/src/services/api.js`

**Testing Checklist:**
- [ ] Quality endpoints return data (not 404)
- [ ] Seed review loads correctly
- [ ] Regeneration triggers successfully
- [ ] Prompt evolution data displays

---

### Task 2.2: Add Quality Routes to Router
**Complexity:** Simple
**Effort:** 30 minutes
**Can Build in Parallel:** Yes

**Required Changes:**
```javascript
// src/router/index.js

// Import quality components
import QualityDashboard from '../components/quality/QualityDashboard.vue'
import SeedQualityReview from '../components/quality/SeedQualityReview.vue'
import PromptEvolutionView from '../components/quality/PromptEvolutionView.vue'
import CourseHealthReport from '../components/quality/CourseHealthReport.vue'

// Add routes
const routes = [
  // ... existing routes ...

  // Quality Review Routes
  {
    path: '/quality/:courseCode',
    name: 'QualityDashboard',
    component: QualityDashboard,
    props: true
  },
  {
    path: '/quality/:courseCode/seeds/:seedId',
    name: 'SeedQualityReview',
    component: SeedQualityReview,
    props: true
  },
  {
    path: '/quality/:courseCode/evolution',
    name: 'PromptEvolutionView',
    component: PromptEvolutionView,
    props: true
  },
  {
    path: '/quality/:courseCode/health',
    name: 'CourseHealthReport',
    component: CourseHealthReport,
    props: true
  }
]
```

**Files to Modify:**
- `/src/router/index.js`

---

### Task 2.3: Add Quality Navigation to Dashboard
**Complexity:** Simple
**Effort:** 30 minutes
**Can Build in Parallel:** Yes

**Required Changes:**
```javascript
// src/views/Dashboard.vue

// Add to template - new "Quality Review" section
<section class="mb-12">
  <h2 class="text-2xl font-semibold text-emerald-400 mb-6">Quality Review & Self-Healing</h2>
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

    <!-- Quality Dashboard Card -->
    <router-link to="/quality/cym_for_eng_574seeds"
                 class="bg-slate-800/50 border border-slate-400/20 rounded-lg p-6 hover:border-emerald-500/50 transition group">
      <div class="flex items-center gap-3 mb-3">
        <svg class="w-8 h-8 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
          <path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm9.707 5.707a1 1 0 00-1.414-1.414L9 12.586l-1.293-1.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
        </svg>
        <h3 class="text-xl font-semibold text-slate-100">Quality Dashboard</h3>
      </div>
      <p class="text-slate-400 mb-4">
        Review extraction quality, flag problematic seeds, trigger regeneration
      </p>
      <div class="text-emerald-400 group-hover:translate-x-1 transition">
        View Quality Report →
      </div>
    </router-link>

    <!-- Prompt Evolution Card -->
    <router-link to="/quality/cym_for_eng_574seeds/evolution"
                 class="bg-slate-800/50 border border-slate-400/20 rounded-lg p-6 hover:border-emerald-500/50 transition group">
      <div class="flex items-center gap-3 mb-3">
        <svg class="w-8 h-8 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"/>
        </svg>
        <h3 class="text-xl font-semibold text-slate-100">Prompt Evolution</h3>
      </div>
      <p class="text-slate-400 mb-4">
        Track prompt versions, learned rules, A/B testing, self-improvement history
      </p>
      <div class="text-emerald-400 group-hover:translate-x-1 transition">
        View Evolution Log →
      </div>
    </router-link>

  </div>
</section>
```

**Files to Modify:**
- `/src/views/Dashboard.vue`

---

### Task 2.4: Test Quality Workflow End-to-End
**Complexity:** Medium
**Effort:** 2 hours
**Can Build in Parallel:** No (requires Tasks 2.1-2.3 complete)

**Test Scenarios:**
1. **Load Quality Dashboard**
   - Navigate to `/quality/:courseCode`
   - Verify stats cards load (avg quality, flagged count, etc.)
   - Verify quality distribution chart renders
   - Verify seed list displays

2. **Review Individual Seed**
   - Click on flagged seed
   - Navigate to `/quality/:courseCode/seeds/:seedId`
   - Verify translation + LEGOs display
   - Verify attempt history shows
   - Verify quality issues listed

3. **Trigger Regeneration**
   - Click "Regenerate" button
   - Verify confirmation dialog
   - Verify POST to `/api/courses/:code/seeds/regenerate`
   - Verify job status updates

4. **Accept/Reject Seeds**
   - Click "Accept" button
   - Verify seed marked as accepted
   - Verify status updates in dashboard

5. **Prompt Evolution**
   - Navigate to `/quality/:courseCode/evolution`
   - Verify version history displays
   - Verify learned rules shown
   - Verify experimental rules interface works

---

### Task 2.5: Add Quality Indicators to Course Browser
**Complexity:** Simple
**Effort:** 1 hour
**Can Build in Parallel:** Yes

**Required Changes:**
```javascript
// src/views/CourseBrowser.vue

// When listing courses, fetch quality data for each
const loadCourseQuality = async (courseCode) => {
  try {
    const quality = await api.quality.getOverview(courseCode)
    return {
      avgQuality: quality.avg_quality || 0,
      flaggedCount: quality.flagged_seeds?.length || 0,
      totalSeeds: quality.total_seeds || 0
    }
  } catch (error) {
    return null
  }
}

// Display quality badge on each course card
```

```html
<!-- Add to course card in template -->
<div v-if="course.quality" class="flex items-center gap-2 mt-2">
  <span class="text-xs px-2 py-1 rounded"
        :class="course.quality.avgQuality >= 8 ? 'bg-green-500/20 text-green-400' :
                course.quality.avgQuality >= 6 ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'">
    Quality: {{ course.quality.avgQuality.toFixed(1) }}/10
  </span>
  <span v-if="course.quality.flaggedCount > 0"
        class="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-400">
    {{ course.quality.flaggedCount }} flagged
  </span>
</div>

<!-- Add "Review Quality" button -->
<router-link :to="`/quality/${course.course_code}`"
             class="text-sm text-emerald-400 hover:text-emerald-300">
  Review Quality →
</router-link>
```

**Files to Modify:**
- `/src/views/CourseBrowser.vue`

---

## TRACK 3: Visualization UI
**Owner:** Developer C / Agent 3
**Effort:** 4-5 hours
**Priority:** Medium
**Dependencies:** None (components complete, need routing + integration)

### Components to Build/Fix
1. ✅ LegoVisualizer.vue (COMPLETE - needs integration)
2. ✅ SeedVisualizer.vue (COMPLETE - needs integration)
3. ✅ PhraseVisualizer.vue (COMPLETE - needs integration)
4. 🔧 BasketVisualizerView.vue (EXISTS - needs testing)
5. 🔧 Add visualizer routes

---

### Task 3.1: Add Visualizer Routes
**Complexity:** Simple
**Effort:** 30 minutes
**Can Build in Parallel:** Yes

**Required Changes:**
```javascript
// src/router/index.js

import LegoVisualizerExample from '../components/LegoVisualizerExample.vue'
import SeedVisualizerDemo from '../views/SeedVisualizerDemo.vue'
import BasketVisualizerView from '../views/BasketVisualizerView.vue'

const routes = [
  // ... existing routes ...

  // Visualization Routes
  {
    path: '/visualize/lego',
    name: 'LegoVisualizer',
    component: LegoVisualizerExample
  },
  {
    path: '/visualize/seed',
    name: 'SeedVisualizer',
    component: SeedVisualizerDemo
  },
  {
    path: '/visualize/basket',
    name: 'BasketVisualizer',
    component: BasketVisualizerView
  },
  {
    path: '/visualize/phrase',
    name: 'PhraseVisualizer',
    component: () => import('../components/PhraseVisualizer.vue')
  }
]
```

**Files to Modify:**
- `/src/router/index.js`

---

### Task 3.2: Add Visualization Section to Dashboard
**Complexity:** Simple
**Effort:** 30 minutes
**Can Build in Parallel:** Yes

**Required Changes:**
```javascript
// src/views/Dashboard.vue

// Add new "Visualization Tools" section
<section class="mb-12">
  <h2 class="text-2xl font-semibold text-emerald-400 mb-6">Visualization Tools</h2>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">

    <router-link to="/visualize/lego"
                 class="bg-slate-800/50 border border-slate-400/20 rounded-lg p-6 hover:border-emerald-500/50 transition group">
      <h3 class="text-xl font-semibold text-slate-100 mb-3">LEGO Visualizer</h3>
      <p class="text-slate-400 mb-4">Visual breakdown of LEGO extraction with provenance</p>
      <div class="text-emerald-400 group-hover:translate-x-1 transition">View Demo →</div>
    </router-link>

    <router-link to="/visualize/seed"
                 class="bg-slate-800/50 border border-slate-400/20 rounded-lg p-6 hover:border-emerald-500/50 transition group">
      <h3 class="text-xl font-semibold text-slate-100 mb-3">Seed Visualizer</h3>
      <p class="text-slate-400 mb-4">Visualize seed pairs and extracted LEGOs</p>
      <div class="text-emerald-400 group-hover:translate-x-1 transition">View Demo →</div>
    </router-link>

    <router-link to="/visualize/basket"
                 class="bg-slate-800/50 border border-slate-400/20 rounded-lg p-6 hover:border-emerald-500/50 transition group">
      <h3 class="text-xl font-semibold text-slate-100 mb-3">Basket Visualizer</h3>
      <p class="text-slate-400 mb-4">View pattern-aware basket construction</p>
      <div class="text-emerald-400 group-hover:translate-x-1 transition">View Demo →</div>
    </router-link>

  </div>
</section>
```

**Files to Modify:**
- `/src/views/Dashboard.vue`

---

### Task 3.3: Integrate Visualizers into CourseEditor
**Complexity:** Medium
**Effort:** 2 hours
**Can Build in Parallel:** Yes

**Required Changes:**
```javascript
// src/views/CourseEditor.vue

// Import visualizer components
import LegoVisualizer from '../components/LegoVisualizer.vue'
import SeedVisualizer from '../components/SeedVisualizer.vue'

// Add to template - show visualizers when viewing translation
<div v-if="selectedTranslation" class="mt-6">
  <h3 class="text-xl font-semibold text-emerald-400 mb-4">LEGO Breakdown</h3>
  <LegoVisualizer :translation="selectedTranslation" :legos="translationLegos" />
</div>

// Add to template - show seed context
<div v-if="selectedTranslation" class="mt-6">
  <h3 class="text-xl font-semibold text-emerald-400 mb-4">Seed Context</h3>
  <SeedVisualizer :seed="selectedSeed" :translation="selectedTranslation" />
</div>
```

**Files to Modify:**
- `/src/views/CourseEditor.vue`

---

### Task 3.4: Add Graph Visualization for Phase 3.5
**Complexity:** Complex
**Effort:** 3 hours
**Can Build in Parallel:** Yes

**New Component:** `GraphVisualizer.vue`

**Purpose:** Visualize LEGO adjacency graph from Phase 3.5

**Requirements:**
- Display nodes (LEGOs)
- Display directed edges (adjacency relationships)
- Show edge weights
- Interactive: click node to highlight connections
- Use D3.js or Vue Flow for graph rendering

**Implementation:**
```vue
<!-- src/components/GraphVisualizer.vue -->
<template>
  <div class="graph-visualizer">
    <div ref="graphContainer" class="w-full h-96 bg-slate-900 rounded-lg border border-slate-400/20"></div>
    <div class="mt-4 flex gap-4">
      <div class="text-sm text-slate-400">
        <strong>Nodes:</strong> {{ nodeCount }}
      </div>
      <div class="text-sm text-slate-400">
        <strong>Edges:</strong> {{ edgeCount }}
      </div>
      <div class="text-sm text-slate-400">
        <strong>Density:</strong> {{ density.toFixed(3) }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import * as d3 from 'd3' // npm install d3

const props = defineProps({
  graph: {
    type: Object,
    required: true
  }
})

const graphContainer = ref(null)
const nodeCount = computed(() => props.graph?.nodes?.length || 0)
const edgeCount = computed(() => props.graph?.edges?.length || 0)
const density = computed(() => {
  if (nodeCount.value === 0) return 0
  return edgeCount.value / (nodeCount.value * (nodeCount.value - 1))
})

const renderGraph = () => {
  if (!graphContainer.value || !props.graph) return

  const width = graphContainer.value.clientWidth
  const height = graphContainer.value.clientHeight

  // D3 force-directed graph
  const svg = d3.select(graphContainer.value)
    .append('svg')
    .attr('width', width)
    .attr('height', height)

  const simulation = d3.forceSimulation(props.graph.nodes)
    .force('link', d3.forceLink(props.graph.edges).id(d => d.uuid))
    .force('charge', d3.forceManyBody().strength(-100))
    .force('center', d3.forceCenter(width / 2, height / 2))

  // Render links
  const link = svg.append('g')
    .selectAll('line')
    .data(props.graph.edges)
    .enter().append('line')
    .attr('stroke', '#64748b')
    .attr('stroke-width', d => Math.sqrt(d.weight) / 2)

  // Render nodes
  const node = svg.append('g')
    .selectAll('circle')
    .data(props.graph.nodes)
    .enter().append('circle')
    .attr('r', 5)
    .attr('fill', '#10b981')
    .call(d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended))

  // Update positions on tick
  simulation.on('tick', () => {
    link
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y)

    node
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
  })
}

onMounted(() => {
  renderGraph()
})

watch(() => props.graph, () => {
  renderGraph()
})
</script>
```

**Files to Create:**
- `/src/components/GraphVisualizer.vue`

**Files to Modify:**
- `/src/views/CourseEditor.vue` (add graph view)
- Add route: `/visualize/graph/:courseCode`

---

## TRACK 4: System UI (Router, Services, Dashboard)
**Owner:** Developer D / Agent 4
**Effort:** 5-6 hours
**Priority:** CRITICAL (enables other tracks)
**Dependencies:** Some tasks are blockers for other tracks

### Components to Build/Fix
1. 🔧 router/index.js (ADD MISSING ROUTES) **BLOCKER**
2. 🔧 services/api.js (FIX URL MISMATCHES) **BLOCKER**
3. 🔧 Dashboard.vue (ADD NAVIGATION LINKS)
4. ✅ APMLSpec.vue (COMPLETE)
5. 🔧 CourseEditor.vue (ADD REGENERATION WORKFLOW) **CRITICAL**

---

### Task 4.1: Complete Router Configuration
**Complexity:** Simple
**Effort:** 1 hour
**Can Build in Parallel:** Yes
**BLOCKER for Track 2**

**This is a consolidation of routing tasks from other tracks**

**Required Changes:**
```javascript
// src/router/index.js - COMPLETE ROUTER CONFIGURATION

import { createRouter, createWebHistory } from 'vue-router'

// Core Views
import Dashboard from '../views/Dashboard.vue'
import TrainingPhase from '../views/TrainingPhase.vue'
import ProcessOverview from '../views/ProcessOverview.vue'
import CanonicalSeeds from '../views/CanonicalSeeds.vue'
import APMLSpec from '../views/APMLSpec.vue'
import CourseGeneration from '../views/CourseGeneration.vue'
import CourseBrowser from '../views/CourseBrowser.vue'
import CourseEditor from '../views/CourseEditor.vue'

// Quality Components
import QualityDashboard from '../components/quality/QualityDashboard.vue'
import SeedQualityReview from '../components/quality/SeedQualityReview.vue'
import PromptEvolutionView from '../components/quality/PromptEvolutionView.vue'
import CourseHealthReport from '../components/quality/CourseHealthReport.vue'

// Visualization Components
import LegoVisualizerExample from '../components/LegoVisualizerExample.vue'
import SeedVisualizerDemo from '../views/SeedVisualizerDemo.vue'
import BasketVisualizerView from '../views/BasketVisualizerView.vue'

const routes = [
  // ========== CORE ROUTES ==========
  {
    path: '/',
    name: 'Dashboard',
    component: Dashboard
  },
  {
    path: '/generate',
    name: 'CourseGeneration',
    component: CourseGeneration
  },
  {
    path: '/courses',
    name: 'CourseBrowser',
    component: CourseBrowser
  },
  {
    path: '/courses/:courseCode',
    name: 'CourseEditor',
    component: CourseEditor,
    props: true
  },
  {
    path: '/phase/:id',
    name: 'TrainingPhase',
    component: TrainingPhase,
    props: true
  },

  // ========== REFERENCE ROUTES ==========
  {
    path: '/reference/overview',
    name: 'ProcessOverview',
    component: ProcessOverview
  },
  {
    path: '/reference/seeds',
    name: 'CanonicalSeeds',
    component: CanonicalSeeds
  },
  {
    path: '/reference/apml',
    name: 'APMLSpec',
    component: APMLSpec
  },

  // ========== QUALITY REVIEW ROUTES (NEW) ==========
  {
    path: '/quality/:courseCode',
    name: 'QualityDashboard',
    component: QualityDashboard,
    props: true,
    meta: { title: 'Quality Review Dashboard' }
  },
  {
    path: '/quality/:courseCode/seeds/:seedId',
    name: 'SeedQualityReview',
    component: SeedQualityReview,
    props: true,
    meta: { title: 'Seed Quality Review' }
  },
  {
    path: '/quality/:courseCode/evolution',
    name: 'PromptEvolutionView',
    component: PromptEvolutionView,
    props: true,
    meta: { title: 'Prompt Evolution' }
  },
  {
    path: '/quality/:courseCode/health',
    name: 'CourseHealthReport',
    component: CourseHealthReport,
    props: true,
    meta: { title: 'Course Health Report' }
  },

  // ========== VISUALIZATION ROUTES (NEW) ==========
  {
    path: '/visualize/lego',
    name: 'LegoVisualizer',
    component: LegoVisualizerExample,
    meta: { title: 'LEGO Visualizer' }
  },
  {
    path: '/visualize/seed',
    name: 'SeedVisualizer',
    component: SeedVisualizerDemo,
    meta: { title: 'Seed Visualizer' }
  },
  {
    path: '/visualize/basket',
    name: 'BasketVisualizer',
    component: BasketVisualizerView,
    meta: { title: 'Basket Visualizer' }
  },
  {
    path: '/visualize/phrase',
    name: 'PhraseVisualizer',
    component: () => import('../components/PhraseVisualizer.vue'),
    meta: { title: 'Phrase Visualizer' }
  },

  // ========== CATCH-ALL ROUTE ==========
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// Set page title based on route meta
router.beforeEach((to, from, next) => {
  document.title = to.meta.title
    ? `${to.meta.title} - SSi Dashboard`
    : 'SSi Course Production Dashboard v7.0'
  next()
})

export default router
```

**Files to Modify:**
- `/src/router/index.js`

---

### Task 4.2: Complete API Service Fixes
**Complexity:** Simple
**Effort:** 1 hour
**Can Build in Parallel:** Yes
**BLOCKER for Track 2**

**See Task 2.1 for complete API service fixes**

**Files to Modify:**
- `/src/services/api.js`

---

### Task 4.3: Implement Edit Regeneration Workflow
**Complexity:** Complex
**Effort:** 3 hours
**Can Build in Parallel:** No (requires understanding of provenance system)
**CRITICAL FEATURE**

**APML Requirement (Lines 1345-1354):**
> "User edits translation in UI → Triggers regeneration of affected phases"

**Current State:**
- CourseEditor can edit translations
- Calls `PUT /api/courses/:courseCode/translations/:uuid`
- **Does NOT** show provenance
- **Does NOT** trigger regeneration
- **Does NOT** poll for results

**Required Implementation:**

#### Step 1: Add Provenance Display Before Edit
```javascript
// src/views/CourseEditor.vue

const showProvenanceModal = ref(false)
const provenanceData = ref(null)
const loadingProvenance = ref(false)

const checkProvenance = async (seedId) => {
  loadingProvenance.value = true
  try {
    const data = await api.course.traceProvenance(courseCode.value, seedId)
    provenanceData.value = data
    showProvenanceModal.value = true
  } catch (error) {
    console.error('Failed to load provenance:', error)
    alert('Failed to check edit impact')
  } finally {
    loadingProvenance.value = false
  }
}

// Call before allowing edit
const initiateEdit = (translation) => {
  checkProvenance(translation.seed_id)
}
```

#### Step 2: Add Provenance Modal
```html
<div v-if="showProvenanceModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
  <div class="bg-slate-800 rounded-lg p-8 max-w-2xl w-full mx-4 border border-slate-400/20">
    <h2 class="text-2xl font-semibold text-emerald-400 mb-4">Edit Impact Analysis</h2>

    <div v-if="loadingProvenance" class="text-slate-400">Analyzing impact...</div>

    <div v-else-if="provenanceData">
      <div class="mb-4">
        <div class="text-slate-300 mb-2">This edit will affect:</div>
        <ul class="space-y-2 text-slate-400">
          <li>🔄 <strong>{{ provenanceData.legos }}</strong> LEGOs will be regenerated</li>
          <li>🔄 <strong>{{ provenanceData.deduplicated }}</strong> deduplicated LEGOs will be updated</li>
          <li>🔄 <strong>{{ provenanceData.baskets }}</strong> baskets will be recompiled</li>
        </ul>
      </div>

      <div class="bg-yellow-900/20 border border-yellow-500/30 rounded p-4 mb-6">
        <div class="flex items-start gap-2">
          <svg class="w-5 h-5 text-yellow-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
          </svg>
          <div class="text-yellow-300 text-sm">
            <strong>Regeneration will be triggered:</strong> Phase 3 onwards will re-run with your updated translation.
            This may take several minutes.
          </div>
        </div>
      </div>

      <div class="flex gap-3">
        <button @click="proceedWithEdit"
                class="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded transition">
          Proceed with Edit & Regenerate
        </button>
        <button @click="showProvenanceModal = false"
                class="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded transition">
          Cancel
        </button>
      </div>
    </div>
  </div>
</div>
```

#### Step 3: Implement Regeneration Trigger
```javascript
const regenerationJobId = ref(null)
const regenerationStatus = ref(null)
const pollingInterval = ref(null)

const proceedWithEdit = async () => {
  try {
    // 1. Save the edited translation
    await api.course.updateTranslation(
      courseCode.value,
      editingTranslation.value.uuid,
      {
        source: editedSource.value,
        target: editedTarget.value
      }
    )

    // 2. Trigger regeneration
    const regenerationResponse = await api.quality.bulkRerun(
      courseCode.value,
      [editingTranslation.value.seed_id]
    )

    regenerationJobId.value = regenerationResponse.job.jobId
    showProvenanceModal.value = false

    // 3. Start polling for regeneration status
    startRegenerationPolling()

    // 4. Show regeneration status UI
    showRegenerationStatus.value = true

  } catch (error) {
    console.error('Failed to trigger regeneration:', error)
    alert('Failed to save edit and trigger regeneration')
  }
}

const startRegenerationPolling = () => {
  pollingInterval.value = setInterval(async () => {
    try {
      const status = await api.course.getRegenerationStatus(
        courseCode.value,
        regenerationJobId.value
      )
      regenerationStatus.value = status

      if (status.status === 'completed' || status.status === 'failed') {
        stopRegenerationPolling()
        // Reload course data
        await loadCourse()
      }
    } catch (error) {
      console.error('Failed to poll regeneration status:', error)
    }
  }, 2000)
}

const stopRegenerationPolling = () => {
  if (pollingInterval.value) {
    clearInterval(pollingInterval.value)
    pollingInterval.value = null
  }
}

onUnmounted(() => {
  stopRegenerationPolling()
})
```

#### Step 4: Add Regeneration Status UI
```html
<div v-if="showRegenerationStatus"
     class="fixed bottom-4 right-4 bg-slate-800 border border-emerald-500/30 rounded-lg p-6 w-96 shadow-2xl">
  <div class="flex items-center justify-between mb-4">
    <h3 class="text-lg font-semibold text-emerald-400">Regeneration in Progress</h3>
    <button @click="showRegenerationStatus = false"
            class="text-slate-400 hover:text-slate-300">
      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
      </svg>
    </button>
  </div>

  <div v-if="regenerationStatus">
    <div class="text-sm text-slate-400 mb-2">
      Job ID: {{ regenerationJobId }}
    </div>
    <div class="text-sm text-slate-300 mb-4">
      Status: <span class="text-yellow-400">{{ regenerationStatus.status }}</span>
    </div>

    <div v-if="regenerationStatus.status === 'in_progress'"
         class="flex items-center gap-2 text-slate-400">
      <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span>Regenerating affected phases...</span>
    </div>

    <div v-else-if="regenerationStatus.status === 'completed'"
         class="flex items-center gap-2 text-green-400">
      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
      </svg>
      <span>Regeneration complete!</span>
    </div>

    <div v-else-if="regenerationStatus.status === 'failed'"
         class="flex items-center gap-2 text-red-400">
      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
      </svg>
      <span>Regeneration failed</span>
    </div>
  </div>
</div>
```

**Files to Modify:**
- `/src/views/CourseEditor.vue`

**Additional API Methods Needed:**
```javascript
// Add to src/services/api.js if missing
async getRegenerationStatus(courseCode, jobId) {
  const response = await api.get(`/api/courses/${courseCode}/regeneration/${jobId}`)
  return response.data
}
```

---

### Task 4.4: Update Dashboard.vue with All Navigation
**Complexity:** Simple
**Effort:** 1 hour
**Can Build in Parallel:** Yes

**This consolidates all navigation updates from other tracks**

**Required Changes:**
```javascript
// src/views/Dashboard.vue

// UPDATE TEMPLATE with complete navigation structure

<template>
  <div class="min-h-screen bg-slate-900">
    <header><!-- existing header --></header>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      <!-- ========== COURSE GENERATION ========== -->
      <section class="mb-12">
        <h2 class="text-2xl font-semibold text-emerald-400 mb-6">Course Generation</h2>
        <!-- existing generation cards -->
      </section>

      <!-- ========== QUALITY REVIEW (NEW) ========== -->
      <section class="mb-12">
        <h2 class="text-2xl font-semibold text-emerald-400 mb-6">Quality Review & Self-Healing</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Quality Dashboard Card -->
          <!-- Prompt Evolution Card -->
          <!-- (see Task 2.3 for complete implementation) -->
        </div>
      </section>

      <!-- ========== VISUALIZATION TOOLS (NEW) ========== -->
      <section class="mb-12">
        <h2 class="text-2xl font-semibold text-emerald-400 mb-6">Visualization Tools</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- LEGO Visualizer Card -->
          <!-- Seed Visualizer Card -->
          <!-- Basket Visualizer Card -->
          <!-- (see Task 3.2 for complete implementation) -->
        </div>
      </section>

      <!-- ========== REFERENCE & DOCS ========== -->
      <section class="mb-12">
        <h2 class="text-2xl font-semibold text-emerald-400 mb-6">Reference & Documentation</h2>
        <!-- existing reference cards -->
      </section>

    </main>
  </div>
</template>
```

**Files to Modify:**
- `/src/views/Dashboard.vue`

---

## DEPENDENCIES & SEQUENCING

### Critical Path (Must Complete First)
1. **Task 4.1:** Router configuration (blocks all route-dependent features)
2. **Task 4.2:** API service fixes (blocks quality components)

### Can Start Immediately (No Dependencies)
- **Track 1, Task 1.2:** TrainingPhase live prompts
- **Track 3, Task 3.4:** Graph visualizer (new component)
- **Task 4.4:** Dashboard navigation updates

### After Critical Path Complete
- **Track 2:** All quality review tasks
- **Track 3:** Visualizer integration tasks
- **Task 4.3:** Edit regeneration workflow

---

## TESTING STRATEGY

### Unit Testing
Each component should have tests for:
- Props validation
- Event emission
- Computed properties
- API call mocking

### Integration Testing
Critical workflows to test end-to-end:
1. **Course Generation Flow**
   - Generate → Poll → Complete → View
2. **Quality Review Flow**
   - Load Dashboard → View Seed → Regenerate → Accept
3. **Edit Workflow**
   - Load Course → Check Provenance → Edit → Regenerate → Verify
4. **Prompt Management Flow**
   - View Phase → Edit Prompt → Save → Verify Git Commit

### Manual Testing Checklist
- [ ] All routes accessible via navigation
- [ ] No 404 errors on quality routes
- [ ] API endpoints return valid data
- [ ] Visualizers render correctly
- [ ] Edit triggers regeneration
- [ ] Quality metrics display correctly
- [ ] Prompt versions show history
- [ ] Dashboard shows all sections

---

## DEPLOYMENT CHECKLIST

### Pre-Deployment
- [ ] All 4 tracks completed
- [ ] Router configuration complete
- [ ] API service URLs fixed
- [ ] All components accessible
- [ ] Critical features tested

### Deployment Steps
1. Run build: `npm run build`
2. Test production build locally
3. Deploy to Vercel
4. Verify ngrok tunnel connectivity
5. Test end-to-end workflows
6. Monitor for errors

### Post-Deployment Verification
- [ ] Dashboard loads without errors
- [ ] Quality review accessible
- [ ] Course generation works
- [ ] Edit workflow functional
- [ ] Visualizers render
- [ ] API calls succeed

---

## EFFORT SUMMARY

| Track | Developer | Effort | Priority | Can Start Now |
|-------|-----------|--------|----------|---------------|
| **Track 1: Course Generation UI** | Agent 1 | 4-6 hours | High | ✅ Yes |
| **Track 2: Quality Review UI** | Agent 2 | 5-7 hours | CRITICAL | ⚠️ After routing |
| **Track 3: Visualization UI** | Agent 3 | 4-5 hours | Medium | ✅ Yes |
| **Track 4: System UI** | Agent 4 | 5-6 hours | CRITICAL | ✅ Yes |
| **TOTAL** | | **18-24 hours** | | |

**Target Completion:** 1-2 weeks with 4 parallel developers/agents
**Sequential Completion:** 4-5 weeks with 1 developer

---

## PRIORITY ORDERING

### Sprint 1 (Week 1) - Critical Blockers
1. ⚡ **Task 4.1:** Router configuration (1 hour) - **BLOCKER**
2. ⚡ **Task 4.2:** API service fixes (1 hour) - **BLOCKER**
3. 🔥 **Task 2.2:** Add quality routes (30 min)
4. 🔥 **Task 2.3:** Dashboard quality navigation (30 min)
5. 🔥 **Task 1.2:** TrainingPhase live prompts (3 hours)

**Total:** ~6 hours → Dashboard 75% functional

### Sprint 2 (Week 2) - Critical Features
1. 🔥 **Task 4.3:** Edit regeneration workflow (3 hours) - **CRITICAL FEATURE**
2. 🔥 **Task 2.4:** Test quality workflow (2 hours)
3. 📊 **Task 3.2:** Visualization navigation (30 min)
4. 📊 **Task 3.3:** Integrate visualizers in editor (2 hours)

**Total:** ~7.5 hours → Dashboard 90% functional

### Sprint 3 (Week 3) - Polish
1. **Task 1.1:** Enhance ProcessOverview (1 hour)
2. **Task 2.5:** Quality indicators in browser (1 hour)
3. **Task 3.1:** Visualizer routes (30 min)
4. **Task 3.4:** Graph visualizer (3 hours)

**Total:** ~5.5 hours → Dashboard 100% complete

---

## SUCCESS METRICS

### Phase 1 Complete (Week 1)
- ✅ All quality components accessible
- ✅ API endpoints return valid data
- ✅ TrainingPhase shows live prompts
- ✅ Dashboard has quality navigation
- **Target:** 75% completeness

### Phase 2 Complete (Week 2)
- ✅ Edit workflow triggers regeneration
- ✅ Quality review workflow tested end-to-end
- ✅ Visualizers integrated into editor
- ✅ All critical features functional
- **Target:** 90% completeness

### Phase 3 Complete (Week 3)
- ✅ All enhancements implemented
- ✅ Graph visualizer working
- ✅ All routes accessible
- ✅ Full test coverage
- **Target:** 100% completeness

---

## NOTES FOR PARALLEL DEVELOPMENT

### Communication Protocol
- **Track 1 & Track 3:** No conflicts - can work independently
- **Track 2 & Track 4:** Must coordinate on API service changes
- **All Tracks:** Must wait for Task 4.1 (routing) before testing routes

### Shared Files to Watch
- `/src/router/index.js` - Track 4 owns, others reference
- `/src/services/api.js` - Track 4 owns, Track 2 references
- `/src/views/Dashboard.vue` - All tracks add navigation sections

### Git Strategy
- **Track 1:** Branch `feature/course-generation-ui`
- **Track 2:** Branch `feature/quality-review-ui`
- **Track 3:** Branch `feature/visualization-ui`
- **Track 4:** Branch `feature/system-integration`

Merge order: Track 4 → Track 2 → Track 3 → Track 1
