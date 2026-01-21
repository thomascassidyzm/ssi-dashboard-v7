<template>
  <div class="production-overview">
    <!-- Course Status Control -->
    <section class="status-control">
      <div class="status-row">
        <div class="status-label">Course Status</div>
        <div class="status-selector">
          <button
            v-for="status in availableStatuses"
            :key="status.value"
            @click="handleStatusChange(status.value)"
            class="status-btn"
            :class="{
              'active': currentStatus === status.value,
              [status.colorClass]: true
            }"
            :disabled="isUpdatingStatus"
          >
            <span class="status-icon">{{ status.icon }}</span>
            <span class="status-text">{{ status.label }}</span>
          </button>
        </div>
        <div v-if="isUpdatingStatus" class="status-updating">
          Updating...
        </div>
      </div>
    </section>

    <!-- Headline Stats -->
    <section class="headline-stats">
      <div class="stat-card seeds">
        <div class="stat-value">
          {{ courseStats.completeSeeds.toLocaleString() }}
          <span class="stat-total">/ {{ seedTarget.toLocaleString() }}</span>
        </div>
        <div class="stat-label">Seeds</div>
        <div class="stat-progress">
          <div class="progress-bar" :style="{ width: `${seedProgressPercent}%` }"></div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ courseStats.legos.toLocaleString() }}</div>
        <div class="stat-label">LEGOs</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ courseStats.phrases.toLocaleString() }}</div>
        <div class="stat-label">Phrases</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" :class="ratioClass">{{ courseStats.ratio }}</div>
        <div class="stat-label">Ratio</div>
      </div>
      <div class="stat-card audio">
        <div class="stat-value">
          {{ store.audioCourseStats.existing.toLocaleString() }}
          <span class="stat-total">/ {{ store.audioCourseStats.total.toLocaleString() }}</span>
        </div>
        <div class="stat-label">Audio</div>
        <div class="stat-progress">
          <div class="progress-bar" :style="{ width: `${audioProgressPercent}%` }"></div>
        </div>
      </div>
    </section>

    <!-- Blockers -->
    <BlockerList
      :blockers="store.blockers"
      @resolve="handleResolveBlocker"
    />

    <!-- Pipeline Stages -->
    <section class="pipeline-stages">
      <h2 class="section-title">Pipeline Status</h2>
      <div class="stage-grid">
        <StageCard
          v-for="stage in store.pipelineStagesComputed"
          :key="stage.id"
          :stage="stage"
          :blocker-count="getBlockerCountForStage(stage.id)"
          @navigate="handleNavigate"
        />
      </div>
    </section>

    <!-- Quick Actions -->
    <QuickActions
      :actions="quickActions"
      @execute="handleQuickAction"
    />

    <!-- Import Course Modal -->
    <ImportCourseModal
      :visible="showImportModal"
      @close="showImportModal = false"
      @imported="handleCourseImported"
    />

    <!-- Legacy Export Dialog -->
    <LegacyExportDialog
      :visible="showLegacyExportDialog"
      :course-code="courseCode"
      @close="showLegacyExportDialog = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useProductionStore } from '@/stores/production'
import StageCard from './components/StageCard.vue'
import BlockerList from './components/BlockerList.vue'
import QuickActions from './components/QuickActions.vue'
import ImportCourseModal from '@/components/ImportCourseModal.vue'
import LegacyExportDialog from '@/components/production/LegacyExportDialog.vue'

const props = defineProps({
  courseCode: {
    type: String,
    required: true
  }
})

const router = useRouter()
const store = useProductionStore()
const showImportModal = ref(false)
const showLegacyExportDialog = ref(false)
const isUpdatingStatus = ref(false)

// Local stats from direct Supabase query
const localStats = ref({
  seeds: 0,
  completeSeeds: 0,
  legos: 0,
  phrases: 0,
  total_seeds: 668
})

// Load stats via API (uses ngrok tunnel to production-api)
async function loadStats(courseCode) {
  try {
    // Use localStorage api_base_url (set by EnvironmentSwitcher) to route to correct machine
    const apiBase = localStorage.getItem('api_base_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'

    console.log(`[ProductionOverview] Loading stats for ${courseCode} from ${apiBase}`)

    const response = await fetch(`${apiBase}/api/stats/${courseCode}`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    console.log(`[ProductionOverview] Loaded course info: status=${data.status}`)

    localStats.value = {
      seeds: data.totalSeeds || data.seeds || 0,
      completeSeeds: data.completedSeeds || data.completeSeeds || 0,
      legos: data.newLegos || data.legos || 0,
      phrases: data.phrases || 0,
      total_seeds: data.seedCount || data.totalSeeds || 668
    }
  } catch (err) {
    console.warn('[ProductionOverview] Could not load stats from API:', err.message)
  }
}

// Available status options
const availableStatuses = [
  { value: 'draft', label: 'Draft', icon: '📝', colorClass: 'status-draft' },
  { value: 'beta', label: 'Beta', icon: '🧪', colorClass: 'status-beta' },
  { value: 'released', label: 'Released', icon: '🚀', colorClass: 'status-released' }
]

// Current course status from store
const currentStatus = computed(() => {
  return store.courseInfo?.status || 'draft'
})

// Handle status change
async function handleStatusChange(newStatus) {
  if (newStatus === currentStatus.value || isUpdatingStatus.value) return

  isUpdatingStatus.value = true
  try {
    await store.updateCourseStatus(newStatus)
  } catch (err) {
    console.error('Failed to update status:', err)
  } finally {
    isUpdatingStatus.value = false
  }
}

// Course stats - computed from localStats (direct Supabase query)
const courseStats = computed(() => {
  const legos = localStats.value.legos || 0
  const phrases = localStats.value.phrases || 0
  return {
    seeds: localStats.value.seeds || 0,
    completeSeeds: localStats.value.completeSeeds || 0,
    legos: legos,
    phrases: phrases,
    ratio: legos > 0 ? (phrases / legos).toFixed(1) : '0.0'
  }
})

// Ratio color class based on quality threshold
const ratioClass = computed(() => {
  const r = parseFloat(courseStats.value.ratio)
  if (r >= 10) return 'text-emerald-400'
  if (r >= 7) return 'text-yellow-400'
  return 'text-red-400'
})

onMounted(() => {
  store.loadCourseInfo(props.courseCode)
  loadStats(props.courseCode)
})

watch(() => props.courseCode, () => {
  store.loadCourseInfo(props.courseCode)
  loadStats(props.courseCode)
})

// Computed
const audioProgressPercent = computed(() => {
  const audio = store.audioCourseStats
  if (!audio || audio.total === 0) return 0
  return Math.round((audio.existing / audio.total) * 100)
})

// Seed target from localStats or default to 668
const seedTarget = computed(() => {
  return localStats.value.total_seeds || 668
})

const seedProgressPercent = computed(() => {
  const complete = courseStats.value.completeSeeds
  const total = seedTarget.value
  return Math.round((complete / total) * 100)
})

// Trimmed quick actions - only essentials
const quickActions = computed(() => {
  return [
    {
      id: 'launch_learning_app',
      icon: '🚀',
      label: 'Launch Learning App',
      description: 'Open course in learning app with QA access',
      badge: null,
      disabled: false
    },
    {
      id: 'recording_optimizer',
      icon: '🎙️',
      label: 'Recording Optimizer',
      description: 'Plan human recordings with minimum phrases',
      badge: null,
      disabled: false
    },
    {
      id: 'import_course',
      icon: '📥',
      label: 'Import Legacy Course',
      description: 'Upload a legacy course manifest JSON',
      badge: null,
      disabled: false
    },
    {
      id: 'export_legacy',
      icon: '📜',
      label: 'Export Legacy',
      description: 'Download manifest for old learning app',
      badge: null,
      disabled: false
    }
  ]
})

// Methods
function getBlockerCountForStage(stageId) {
  return store.blockers.filter(b => b.stage === stageId).length
}

function handleNavigate(route) {
  router.push({
    name: route,
    params: { courseCode: props.courseCode }
  })
}

function handleResolveBlocker(blocker) {
  switch (blocker.action) {
    case 'createRecordingQueue':
      router.push({
        name: 'RecordingStudioProduction',
        params: { courseCode: props.courseCode },
        query: { autoCreateQueue: 'true' }
      })
      break
    case 'sendToAudioPipeline':
      router.push({
        name: 'AudioPipelineProduction',
        params: { courseCode: props.courseCode },
        query: { autoQueue: 'flagged' }
      })
      break
    case 'reviewSamples':
    case 'reviewFlaggedAudio':
      router.push({
        name: 'ScriptViewer',
        params: { courseCode: props.courseCode },
        query: { filter: 'flagged' }
      })
      break
  }
}

function handleQuickAction(actionId) {
  switch (actionId) {
    case 'import_course':
      showImportModal.value = true
      break
    case 'generate_audio':
      router.push({
        name: 'AudioPipelineProduction',
        params: { courseCode: props.courseCode }
      })
      break
    case 'review_samples':
      router.push({
        name: 'ScriptViewer',
        params: { courseCode: props.courseCode },
        query: { filter: 'flagged' }
      })
      break
    case 'record_human':
      router.push({
        name: 'RecordingStudioProduction',
        params: { courseCode: props.courseCode }
      })
      break
    case 'recording_optimizer':
      router.push({
        name: 'RecordingOptimizer',
        params: { courseCode: props.courseCode }
      })
      break
    case 'compile_manifest':
      router.push({
        name: 'CourseCompilation',
        params: { courseCode: props.courseCode }
      })
      break
    case 'user_feedback':
      router.push({
        name: 'UserFeedback',
        params: { courseCode: props.courseCode }
      })
      break
    case 'launch_learning_app':
      launchLearningApp()
      break
    case 'export_legacy':
      showLegacyExportDialog.value = true
      break
  }
}

function handleCourseImported(courseCode) {
  showImportModal.value = false
  router.push({
    name: 'ProductionDashboard',
    params: { courseCode }
  })
}

function launchLearningApp() {
  const learningAppUrl = import.meta.env.VITE_LEARNING_APP_URL || 'https://saysomethingin.app'
  window.open(`${learningAppUrl}/?course=${props.courseCode}`, '_blank')
}
</script>

<style scoped>
.production-overview {
  padding: 1.5rem;
}

/* Status Control */
.status-control {
  margin-bottom: 1.5rem;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.status-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-paper-dim, #c1c1bb);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-selector {
  display: flex;
  gap: 0.5rem;
}

.status-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: 2px solid transparent;
  background: var(--color-slate, #334155);
  color: var(--color-paper-dim, #c1c1bb);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.status-btn:hover:not(:disabled) {
  background: var(--color-graphite, #475569);
}

.status-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.status-btn.active {
  border-color: currentColor;
}

.status-btn.status-draft {
  color: var(--color-paper-dim, #c1c1bb);
}

.status-btn.status-draft.active {
  background: rgba(148, 163, 184, 0.2);
  border-color: #94a3b8;
}

.status-btn.status-beta {
  color: #fbbf24;
}

.status-btn.status-beta.active {
  background: rgba(251, 191, 36, 0.15);
  border-color: #fbbf24;
}

.status-btn.status-released {
  color: #34d399;
}

.status-btn.status-released.active {
  background: rgba(52, 211, 153, 0.15);
  border-color: #34d399;
}

.status-icon {
  font-size: 1rem;
}

.status-updating {
  font-size: 0.75rem;
  color: var(--color-paper-dim, #c1c1bb);
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Headline Stats Grid */
.headline-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-card {
  background: var(--color-slate, #334155);
  border-radius: 12px;
  padding: 1.25rem;
  text-align: center;
}

.stat-card .stat-value {
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-paper, #f7f7f2);
  line-height: 1.2;
}

.stat-card .stat-total {
  font-size: 1rem;
  font-weight: 400;
  color: var(--color-paper-dim, #c1c1bb);
}

.stat-card .stat-label {
  font-size: 0.75rem;
  color: var(--color-paper-dim, #c1c1bb);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 0.25rem;
}

.stat-card.audio .stat-value {
  color: var(--color-tungsten, #ffa630);
}

.stat-card.seeds .stat-value {
  color: #34d399;
}

.stat-card.seeds .progress-bar {
  background: #34d399;
}

.stat-progress {
  margin-top: 0.75rem;
  height: 4px;
  background: var(--color-graphite, #475569);
  border-radius: 2px;
  overflow: hidden;
}

.stat-progress .progress-bar {
  height: 100%;
  background: var(--color-tungsten, #ffa630);
  border-radius: 2px;
  transition: width 0.3s ease;
}

.pipeline-stages {
  margin-bottom: 1.5rem;
}

.section-title {
  font-family: var(--font-ui, 'Josefin Sans', sans-serif);
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-paper-dim, #c1c1bb);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 1rem;
}

.stage-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

@media (max-width: 768px) {
  .headline-stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .stat-card .stat-value {
    font-size: 1.5rem;
  }
}
</style>
