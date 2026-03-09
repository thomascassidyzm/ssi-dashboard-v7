<template>
  <div class="production-overview">
    <!-- Header: Status + Stats in one row -->
    <header class="overview-header">
      <div class="status-pills">
        <button
          v-for="status in statuses"
          :key="status.value"
          @click="setStatus(status.value)"
          class="status-pill"
          :class="{ active: currentStatus === status.value, [status.value]: true }"
          :disabled="isUpdating || store.isLoadingInfo"
        >
          <span v-if="store.isLoadingInfo && status.value === 'testing'" class="loading-dot"></span>
          {{ status.label }}
        </button>
      </div>

      <div class="header-stats">
        <div class="mini-stat primary">
          <template v-if="isLoadingStats">
            <span class="mini-value loading-placeholder">--</span>
            <span class="mini-total">/--</span>
          </template>
          <template v-else>
            <span class="mini-value">{{ stats.completeSeeds }}</span>
            <span class="mini-total">/{{ stats.totalSeeds }}</span>
          </template>
          <span class="mini-label">seeds</span>
        </div>
        <div class="mini-stat">
          <span class="mini-value" :class="{ 'loading-placeholder': isLoadingStats }">
            {{ isLoadingStats ? '--' : stats.legos.toLocaleString() }}
          </span>
          <span class="mini-label">LEGOs</span>
        </div>
        <div class="mini-stat">
          <span class="mini-value" :class="{ 'loading-placeholder': isLoadingStats }">
            {{ isLoadingStats ? '--' : stats.phrases.toLocaleString() }}
          </span>
          <span class="mini-label">phrases</span>
        </div>
        <div class="mini-stat" :class="ratioClass">
          <span class="mini-value" :class="{ 'loading-placeholder': isLoadingStats }">
            {{ isLoadingStats ? '--' : stats.ratio }}
          </span>
          <span class="mini-label">ratio</span>
        </div>
        <div class="mini-stat accent">
          <template v-if="audioStats.total === 0 && !audioStatsLoaded">
            <span class="mini-spinner"></span>
          </template>
          <template v-else>
            <span class="mini-value">{{ audioStats.existing.toLocaleString() }}</span>
            <span class="mini-total">/{{ audioStats.total.toLocaleString() }}</span>
          </template>
          <span class="mini-label">audio</span>
        </div>
      </div>
    </header>

    <!-- Language-Pair Learnings (collapsible) -->
    <section v-if="learnings.length > 0" class="learnings-section">
      <button class="learnings-header" @click="showLearnings = !showLearnings">
        <span class="learnings-icon">L</span>
        <span class="learnings-title">{{ learnings.length }} Language-Pair Learning{{ learnings.length > 1 ? 's' : '' }}</span>
        <span class="learnings-toggle">{{ showLearnings ? '−' : '+' }}</span>
      </button>
      <div v-if="showLearnings" class="learnings-content">
        <div v-for="(items, category) in learningsByCategory" :key="category" class="learning-category">
          <span class="category-label">{{ category }}</span>
          <ul class="learning-list">
            <li v-for="(item, idx) in items" :key="idx" class="learning-item">{{ item.learning }}</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Blockers (if any) -->
    <section v-if="store.blockers.length > 0" class="blockers-section">
      <div v-for="blocker in store.blockers" :key="blocker.id" class="blocker-card">
        <span class="blocker-icon">!</span>
        <span class="blocker-text">{{ blocker.message || blocker.title }}</span>
        <button @click="handleBlocker(blocker)" class="btn-resolve">Fix</button>
      </div>
    </section>

    <!-- Main Workflow Cards -->
    <section class="workflow-grid">
      <!-- Seed Editor -->
      <router-link :to="`/production/${courseCode}/seeds`" class="workflow-card">
        <div class="card-icon seeds">Se</div>
        <div class="card-content">
          <h3>Seed Editor</h3>
          <p>Review and approve translations</p>
        </div>
        <span class="card-arrow">&rarr;</span>
      </router-link>

      <!-- Text Generation -->
      <router-link :to="`/production/${courseCode}/text`" class="workflow-card">
        <div class="card-icon text">T</div>
        <div class="card-content">
          <h3>Text Generation</h3>
          <p>Build seeds, LEGOs, and phrases</p>
        </div>
        <span class="card-arrow">&rarr;</span>
      </router-link>

      <!-- Script View (rounds-based phrase review) -->
      <router-link
        :to="{ name: 'ScriptViewer', params: { courseCode }, query: { view: 'journey' } }"
        class="workflow-card"
      >
        <div class="card-icon script">S</div>
        <div class="card-content">
          <h3>Script View</h3>
          <p>Review phrases in learning order</p>
        </div>
        <span class="card-arrow">&rarr;</span>
      </router-link>

      <!-- Audio Pipeline -->
      <router-link :to="`/production/${courseCode}/pipeline`" class="workflow-card">
        <div class="card-icon audio">A</div>
        <div class="card-content">
          <h3>Audio Generation</h3>
          <p>TTS synthesis and processing</p>
        </div>
        <span class="card-arrow">&rarr;</span>
      </router-link>

      <!-- Recording (combined) -->
      <router-link :to="`/production/${courseCode}/recording`" class="workflow-card">
        <div class="card-icon record">H</div>
        <div class="card-content">
          <h3>Human Recording</h3>
          <p>Record and optimize takes</p>
        </div>
        <span class="card-arrow">&rarr;</span>
      </router-link>

      <!-- Launch Learning App -->
      <button @click="launchLearningApp" class="workflow-card action">
        <div class="card-icon launch">L</div>
        <div class="card-content">
          <h3>Open Learning App</h3>
          <p>Preview course in app</p>
        </div>
        <span class="card-arrow">&nearr;</span>
      </button>
    </section>

    <!-- Secondary Tools -->
    <section class="secondary-tools">
      <router-link :to="`/production/${courseCode}/recording-optimizer`" class="tool-link">
        Recording Optimizer
      </router-link>
      <button @click="runAudit" :disabled="auditing" class="tool-link">
        {{ auditing ? 'Starting Audit...' : 'Run QA Audit' }}
      </button>
      <button @click="showExportDialog = true" class="tool-link">
        Export Legacy
      </button>
    </section>

    <!-- Export Dialog -->
    <LegacyExportDialog
      :visible="showExportDialog"
      :course-code="courseCode"
      @close="showExportDialog = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getApiUrl } from '@/services/api'
import { useProductionStore } from '@/stores/production'
import LegacyExportDialog from '@/components/production/LegacyExportDialog.vue'

const props = defineProps({
  courseCode: { type: String, required: true }
})

const router = useRouter()
const store = useProductionStore()
const showExportDialog = ref(false)
const isUpdating = ref(false)
const auditing = ref(false)
const showLearnings = ref(false)

// Learnings from course info
const learnings = computed(() => store.courseInfo?.learnings || [])
const learningsByCategory = computed(() => {
  const grouped = {}
  learnings.value.forEach(l => {
    const cat = l.category || 'general'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(l)
  })
  return grouped
})

const statuses = [
  { value: 'testing', label: 'Testing' },
  { value: 'beta', label: 'Beta' },
  { value: 'live', label: 'Live' }
]

const localStats = ref({ completeSeeds: 0, totalSeeds: 668, legos: 0, phrases: 0 })
const qaStats = ref({ flags: 0, checked: 0 })
const isLoadingStats = ref(true)  // Start true, set false when loaded
const audioStatsLoaded = ref(false)  // Track if audio stats have been fetched

const stats = computed(() => {
  const legos = localStats.value.legos || 0
  const phrases = localStats.value.phrases || 0
  return {
    completeSeeds: localStats.value.completeSeeds || 0,
    totalSeeds: localStats.value.totalSeeds || 668,
    legos,
    phrases,
    ratio: legos > 0 ? (phrases / legos).toFixed(1) : '0'
  }
})

const audioStats = computed(() => store.audioCourseStats || { existing: 0, total: 0 })

// Mark audio stats as loaded once we get real data
watch(() => store.audioCourseStats?.total, (total) => {
  if (total > 0) audioStatsLoaded.value = true
}, { immediate: true })

const ratioClass = computed(() => {
  const r = parseFloat(stats.value.ratio)
  if (r >= 10) return 'good'
  if (r >= 7) return 'ok'
  return 'low'
})

const currentStatus = computed(() => {
  const s = store.courseInfo?.status || 'testing'
  if (s === 'draft') return 'testing'
  if (s === 'released') return 'live'
  return s
})

async function loadStats() {
  isLoadingStats.value = true
  try {
    const apiBase = getApiUrl()
    const res = await fetch(`${apiBase}/api/stats/${props.courseCode}`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    if (res.ok) {
      const data = await res.json()
      localStats.value = {
        completeSeeds: data.seeds_with_legos || data.completed_seeds || 0,
        totalSeeds: data.total_seeds || 668,
        legos: data.legos || 0,
        phrases: data.phrases || 0
      }
    }
  } catch (err) {
    console.warn('Could not load stats:', err.message)
  } finally {
    isLoadingStats.value = false
  }
}

async function loadQAStats() {
  try {
    const apiBase = getApiUrl()
    const res = await fetch(`${apiBase}/api/qa/summary/${props.courseCode}`)
    if (res.ok) {
      const data = await res.json()
      qaStats.value = {
        flags: data.flags?.total || 0,
        checked: data.phrases?.checked || 0
      }
    }
  } catch (err) {
    // QA stats optional
  }
}

async function setStatus(status) {
  if (status === currentStatus.value || isUpdating.value) return
  isUpdating.value = true
  try {
    await store.updateCourseStatus(status)
  } finally {
    isUpdating.value = false
  }
}

function handleBlocker(blocker) {
  const routes = {
    createRecordingQueue: { name: 'RecordingStudioProduction', query: { autoCreateQueue: 'true' } },
    sendToAudioPipeline: { name: 'AudioPipelineProduction', query: { autoQueue: 'flagged' } },
    reviewSamples: { name: 'ScriptViewer', query: { filter: 'flagged' } },
    reviewFlaggedAudio: { name: 'ScriptViewer', query: { filter: 'flagged' } }
  }
  const route = routes[blocker.action]
  if (route) router.push({ ...route, params: { courseCode: props.courseCode } })
}

function launchLearningApp() {
  const url = import.meta.env.VITE_LEARNING_APP_URL || 'https://saysomethingin.app'
  window.open(`${url}/?course=${props.courseCode}`, '_blank')
}

async function runAudit() {
  auditing.value = true
  try {
    const apiBase = getApiUrl()
    await fetch(`${apiBase}/api/qa/spawn-audit/${props.courseCode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sample_size: 100 })
    })
  } catch (err) {
    console.error('Failed to spawn auditor:', err)
  } finally {
    auditing.value = false
  }
}

onMounted(() => {
  store.loadCourseInfo(props.courseCode)
  loadStats()
  loadQAStats()
})

watch(() => props.courseCode, () => {
  audioStatsLoaded.value = false  // Reset for new course
  store.loadCourseInfo(props.courseCode)
  loadStats()
  loadQAStats()
})
</script>

<style scoped>
.production-overview {
  padding: 1.5rem;
  max-width: 1000px;
}

/* Header */
.overview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.status-pills {
  display: flex;
  gap: 0.5rem;
}

.status-pill {
  padding: 0.4rem 0.875rem;
  border-radius: 16px;
  border: 1px solid var(--color-graphite, #475569);
  background: transparent;
  color: var(--color-paper-dim, #94a3b8);
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
}
.status-pill:hover:not(:disabled) { border-color: var(--color-paper-dim, #94a3b8); }
.status-pill:disabled { opacity: 0.5; cursor: not-allowed; }
.status-pill.active.testing { background: rgba(148,163,184,0.2); border-color: #94a3b8; color: #94a3b8; }
.status-pill.active.beta { background: rgba(251,191,36,0.15); border-color: #fbbf24; color: #fbbf24; }
.status-pill.active.live { background: rgba(52,211,153,0.15); border-color: #34d399; color: #34d399; }

/* Header Stats */
.header-stats {
  display: flex;
  gap: 1.25rem;
}

.mini-stat {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
  font-family: var(--font-mono, monospace);
}

.mini-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-paper, #f7f7f2);
}
.mini-total {
  font-size: 0.8rem;
  color: var(--color-paper-dim, #64748b);
}
.mini-label {
  font-size: 0.65rem;
  color: var(--color-paper-dim, #64748b);
  text-transform: uppercase;
  margin-left: 0.125rem;
}

.mini-stat.primary .mini-value { color: #34d399; }
.mini-stat.accent .mini-value { color: var(--color-tungsten, #ffa630); }
.mini-stat.good .mini-value { color: #34d399; }
.mini-stat.ok .mini-value { color: #fbbf24; }
.mini-stat.low .mini-value { color: #f87171; }

/* Language-Pair Learnings */
.learnings-section {
  margin-bottom: 1rem;
  background: var(--color-slate, #334155);
  border: 1px solid var(--color-graphite, #475569);
  border-radius: 8px;
  overflow: hidden;
}

.learnings-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem 1rem;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
}
.learnings-header:hover {
  background: rgba(255, 255, 255, 0.03);
}

.learnings-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #8b5cf6;
  color: white;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  flex-shrink: 0;
}

.learnings-title {
  flex: 1;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-paper, #f7f7f2);
}

.learnings-toggle {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-paper-dim, #94a3b8);
  font-size: 1.1rem;
  font-weight: 300;
}

.learnings-content {
  padding: 0 1rem 1rem;
  border-top: 1px solid var(--color-graphite, #475569);
}

.learning-category {
  margin-top: 0.75rem;
}

.category-label {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  background: rgba(139, 92, 246, 0.15);
  color: #a78bfa;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-radius: 4px;
  margin-bottom: 0.375rem;
}

.learning-list {
  margin: 0;
  padding-left: 1rem;
  list-style: none;
}

.learning-item {
  position: relative;
  padding: 0.25rem 0;
  font-size: 0.8rem;
  color: var(--color-paper-dim, #94a3b8);
  line-height: 1.4;
}
.learning-item::before {
  content: "•";
  position: absolute;
  left: -0.75rem;
  color: var(--color-graphite, #475569);
}

/* Blockers */
.blockers-section {
  margin-bottom: 1rem;
}

.blocker-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: rgba(248,113,113,0.1);
  border: 1px solid rgba(248,113,113,0.3);
  border-radius: 6px;
  margin-bottom: 0.5rem;
}

.blocker-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f87171;
  color: white;
  border-radius: 50%;
  font-size: 0.7rem;
  font-weight: 700;
}

.blocker-text {
  flex: 1;
  font-size: 0.875rem;
  color: var(--color-paper, #f7f7f2);
}

.btn-resolve {
  padding: 0.25rem 0.5rem;
  background: #f87171;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
}

/* Workflow Grid */
.workflow-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.workflow-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--color-slate, #334155);
  border: 1px solid var(--color-graphite, #475569);
  border-radius: 8px;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.15s;
}
.workflow-card:hover {
  background: var(--color-graphite, #475569);
  border-color: var(--color-paper-dim, #64748b);
}

.workflow-card.action {
  background: transparent;
  border-style: dashed;
}

.card-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-weight: 700;
  font-size: 1rem;
  flex-shrink: 0;
}

.card-icon.seeds { background: #06b6d4; color: white; }
.card-icon.text { background: #3b82f6; color: white; }
.card-icon.script { background: #f59e0b; color: white; }
.card-icon.audio { background: #8b5cf6; color: white; }
.card-icon.review { background: #ec4899; color: white; }
.card-icon.record { background: #10b981; color: white; }
.card-icon.launch { background: var(--color-graphite, #475569); color: var(--color-tungsten, #ffa630); }

.card-content {
  flex: 1;
  min-width: 0;
}

.card-content h3 {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-paper, #f7f7f2);
  margin: 0 0 0.125rem;
}

.card-content p {
  font-size: 0.75rem;
  color: var(--color-paper-dim, #64748b);
  margin: 0;
}

.card-badge {
  padding: 0.125rem 0.4rem;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: 600;
}
.card-badge.error {
  background: #f87171;
  color: white;
}

.card-arrow {
  color: var(--color-paper-dim, #64748b);
  font-size: 1rem;
}

/* Secondary Tools */
.secondary-tools {
  display: flex;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-graphite, #334155);
}

.tool-link {
  font-size: 0.8rem;
  color: var(--color-paper-dim, #64748b);
  text-decoration: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}
.tool-link:hover {
  color: var(--color-paper, #f7f7f2);
  text-decoration: underline;
}

@media (max-width: 800px) {
  .workflow-grid { grid-template-columns: repeat(2, 1fr); }
  .overview-header { flex-direction: column; align-items: flex-start; }
}

@media (max-width: 500px) {
  .workflow-grid { grid-template-columns: 1fr; }
  .header-stats { flex-wrap: wrap; }
}

/* Loading states */
.loading-placeholder {
  opacity: 0.4;
  animation: pulse 1.5s ease-in-out infinite;
}

.loading-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  background: currentColor;
  border-radius: 50%;
  margin-right: 4px;
  animation: pulse 1s ease-in-out infinite;
}

.mini-spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 166, 48, 0.3);
  border-top-color: var(--color-tungsten, #ffa630);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
