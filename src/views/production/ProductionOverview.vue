<template>
  <div class="production-overview">
    <!-- Headline Stats -->
    <section class="headline-stats">
      <div class="stat-card">
        <div class="stat-value">{{ courseStats.seeds }}</div>
        <div class="stat-label">Seeds</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ courseStats.legos.toLocaleString() }}</div>
        <div class="stat-label">LEGOs</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ courseStats.phrases.toLocaleString() }}</div>
        <div class="stat-label">Phrases</div>
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

const props = defineProps({
  courseCode: {
    type: String,
    required: true
  }
})

const router = useRouter()
const store = useProductionStore()
const showImportModal = ref(false)

// Course stats from Course Builder API
const courseStats = ref({
  seeds: 0,
  legos: 0,
  phrases: 0
})

// Fetch course stats from Course Builder API
async function fetchCourseStats() {
  try {
    const builderApiUrl = import.meta.env.VITE_COURSE_BUILDER_API_URL || 'http://localhost:3471'
    const response = await fetch(`${builderApiUrl}/api/stats/${props.courseCode}`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    if (response.ok) {
      const data = await response.json()
      courseStats.value = {
        seeds: data.seeds || 0,
        legos: data.legos || 0,
        phrases: data.phrases || 0
      }
    }
  } catch (err) {
    console.error('Failed to fetch course stats:', err)
  }
}

onMounted(() => {
  fetchCourseStats()
})

watch(() => props.courseCode, () => {
  fetchCourseStats()
})

// Computed
const audioProgressPercent = computed(() => {
  const audio = store.audioCourseStats
  if (!audio || audio.total === 0) return 0
  return Math.round((audio.existing / audio.total) * 100)
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
    },
    {
      id: 'agent_monitor',
      icon: '📡',
      label: 'Agent Monitor',
      description: 'View real-time pipeline agent activity',
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
      router.push({
        name: 'SamplesBrowser',
        params: { courseCode: props.courseCode },
        query: { filter: 'needs_review' }
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
        name: 'SamplesBrowser',
        params: { courseCode: props.courseCode },
        query: { filter: 'needs_review' }
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
    case 'agent_monitor':
      router.push({
        path: `/monitor/${props.courseCode}`
      })
      break
    case 'export_legacy':
      exportLegacyManifest()
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
  const qaToken = btoa(JSON.stringify({
    course: props.courseCode,
    role: 'qa_reviewer',
    issued: Date.now(),
    expires: Date.now() + (24 * 60 * 60 * 1000)
  }))
  const learningAppUrl = import.meta.env.VITE_LEARNING_APP_URL || 'http://localhost:5174'
  window.open(`${learningAppUrl}/?course=${props.courseCode}&qa_token=${qaToken}`, '_blank')
}

function exportLegacyManifest() {
  const apiBase = localStorage.getItem('api_base_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'
  window.open(`${apiBase}/api/manifest/${props.courseCode}?format=legacy&download=true`, '_blank')
}
</script>

<style scoped>
.production-overview {
  padding: 1.5rem;
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
