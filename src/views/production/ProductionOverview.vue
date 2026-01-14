<template>
  <div class="production-overview">
    <!-- Overall Progress -->
    <section class="overall-progress">
      <div class="progress-header">
        <h2>Overall Progress</h2>
        <div class="progress-stats">
          <!-- Audio stats (primary for pre-audio courses) -->
          <div class="stat" v-if="store.audioCourseStats.total > 0">
            <span class="stat-value audio">{{ store.audioCourseStats.total }}</span>
            <span class="stat-label">NEEDED</span>
          </div>
          <div class="stat" v-if="store.audioCourseStats.total > 0">
            <span class="stat-value generated">{{ store.audioCourseStats.existing }}</span>
            <span class="stat-label">GENERATED</span>
          </div>
          <div class="stat" v-if="store.audioCourseStats.total > 0">
            <span class="stat-value pending">{{ store.audioCourseStats.missing }}</span>
            <span class="stat-label">PENDING</span>
          </div>
          <div class="stat" v-if="store.progressStats.flagged > 0">
            <span class="stat-value flagged">{{ store.progressStats.flagged }}</span>
            <span class="stat-label">FLAGGED</span>
          </div>
          <!-- QA stats (fallback when no audio stats) -->
          <template v-else>
            <div class="stat">
              <span class="stat-value">{{ store.progressStats.approved }}</span>
              <span class="stat-label">Approved</span>
            </div>
            <div class="stat">
              <span class="stat-value">{{ store.progressStats.total }}</span>
              <span class="stat-label">Total</span>
            </div>
            <div class="stat">
              <span class="stat-value">{{ estimatedDays }}</span>
              <span class="stat-label">Days Left</span>
            </div>
          </template>
        </div>
      </div>
      <div class="progress-visual">
        <ProgressRing
          :value="audioProgressPercent"
          label="Audio"
          :size="240"
          :stroke-width="16"
        />
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
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useProductionStore } from '@/stores/production'
import ProgressRing from './components/ProgressRing.vue'
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

// Computed
const estimatedDays = computed(() => {
  const { total, approved } = store.progressStats
  const remaining = total - approved
  if (remaining === 0) return 0
  return Math.ceil(remaining / 100)
})

const audioProgressPercent = computed(() => {
  const audio = store.audioCourseStats
  if (!audio || audio.total === 0) return store.progressStats.percentComplete
  return Math.round((audio.existing / audio.total) * 100)
})

const quickActions = computed(() => {
  return [
    {
      id: 'import_course',
      icon: '📥',
      label: 'Import Legacy Course',
      description: 'Upload a legacy course manifest JSON',
      badge: null,
      disabled: false
    },
    {
      id: 'generate_audio',
      icon: '🔊',
      label: 'Generate Audio',
      description: 'Start TTS generation for flagged samples',
      badge: store.samplesByStatus.flagged_regen_tts?.length || 0,
      disabled: (store.samplesByStatus.flagged_regen_tts?.length || 0) === 0
    },
    {
      id: 'review_samples',
      icon: '👀',
      label: 'Review Samples',
      description: 'Review audio samples awaiting approval',
      badge: store.samplesByStatus.needs_review?.length || 0,
      disabled: (store.samplesByStatus.needs_review?.length || 0) === 0
    },
    {
      id: 'record_human',
      icon: '🎤',
      label: 'Record Human',
      description: 'Create recording queue for human voice',
      badge: store.samplesByStatus.flagged_human_needed?.length || 0,
      disabled: (store.samplesByStatus.flagged_human_needed?.length || 0) === 0
    },
    {
      id: 'recording_optimizer',
      icon: '🧬',
      label: 'Recording Optimizer',
      description: 'LEGO splice engine for non-TTS languages',
      badge: null,
      disabled: false
    },
    {
      id: 'compile_manifest',
      icon: '📦',
      label: 'Compile Manifest',
      description: 'Generate final course manifest',
      disabled: store.progressStats.percentComplete < 100
    },
    {
      id: 'user_feedback',
      icon: '💬',
      label: 'User Feedback',
      description: 'View and resolve user-reported issues',
      badge: null,
      disabled: false
    },
    {
      id: 'launch_learning_app',
      icon: '🚀',
      label: 'Launch Learning App',
      description: 'Open course in learning app with QA access',
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

.overall-progress {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 2rem;
  align-items: center;
  background: var(--color-slate, #334155);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.progress-header h2 {
  font-family: var(--font-ui, 'Josefin Sans', sans-serif);
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-paper, #f7f7f2);
  margin: 0 0 1rem;
}

.progress-stats {
  display: flex;
  gap: 2rem;
}

.stat {
  text-align: center;
}

.stat-value {
  display: block;
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-paper, #f7f7f2);
}

.stat-value.audio { color: var(--color-tungsten, #ffa630); }
.stat-value.generated { color: #10b981; }
.stat-value.pending { color: var(--color-paper-dim, #c1c1bb); }
.stat-value.flagged { color: #f59e0b; }

.stat-label {
  display: block;
  font-size: 0.75rem;
  color: var(--color-paper-dim, #c1c1bb);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 0.25rem;
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
  .overall-progress {
    grid-template-columns: 1fr;
  }

  .progress-visual {
    display: flex;
    justify-content: center;
  }

  .progress-stats {
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style>
