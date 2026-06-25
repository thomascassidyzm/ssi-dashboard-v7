<template>
  <div class="mission-control">
    <!-- Action bar above pipeline board -->
    <div class="mc-actions">
      <button @click="showImportModal = true" class="chip chip-secondary">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17,8 12,3 7,8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <span>Import Course</span>
      </button>
    </div>

    <!-- Main Content — Pipeline Board -->
    <main class="mc-main">
      <CoursePipelineBoard
        :courses="coursesWithStatus"
        :loading="loading"
        @action="handlePipelineAction"
        @updateLegacyStatus="handleLegacyStatusUpdate"
        @updateNewAppStatus="handleNewAppStatusUpdate"
        @deployToProduction="handleDeployToProduction"
      />
    </main>

    <!-- Import Course Modal -->
    <ImportCourseModal
      v-if="showImportModal"
      :visible="showImportModal"
      @close="showImportModal = false"
      @imported="handleImportComplete"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../services/api'
import { useCourses } from '../composables/useCourses'
import ImportCourseModal from '../components/ImportCourseModal.vue'
import CoursePipelineBoard from '../components/CoursePipelineBoard.vue'

const { courses, loading, loadCourses } = useCourses()

const showImportModal = ref(false)

// Courses with full status info for CoursePipelineBoard
const coursesWithStatus = computed(() => {
  return courses.value.map(c => {
    const normalize = (s) => {
      if (!s || s === 'not_available') return 'not_available'
      if (s === 'draft') return 'testing'
      if (s === 'released') return 'live'
      return s
    }

    return {
      code: c.code,
      name: c.name,
      newAppStatus: normalize(c.new_app_status),
      legacyAppStatus: normalize(c.legacy_app_status),
      newAppBetaDays: c.new_app_beta_days || null,
      legacyAppBetaDays: c.legacy_app_beta_days || null,
      contentStatus: c.content_status || null,
      pricingTier: c.pricing_tier || 'premium',
      exportReady: c.export_ready || false,
      createdAt: c.created_at || null,
      updatedAt: c.updated_at || null,
      targetSeeds: c.stats?.seed_count || 300,
      stats: c.stats || {}
    }
  })
})

function handleImportComplete() {
  showImportModal.value = false
  loadCourses(true)
}

function handlePipelineAction({ course, action }) {
  // Actions are handled by the board component via router navigation
}

async function handleLegacyStatusUpdate({ courseCode, status }) {
  try {
    await api.course.updatePlatformStatus(courseCode, 'legacy_app', status)
    await loadCourses(true)
  } catch (err) {
    console.error('Failed to update legacy app status:', err)
    await loadCourses(true)
  }
}

async function handleNewAppStatusUpdate({ courseCode, status }) {
  try {
    await api.course.updatePlatformStatus(courseCode, 'new_app', status)
    await loadCourses(true)
  } catch (err) {
    console.error('Failed to update new app status:', err)
    await loadCourses(true)
  }
}

async function handleDeployToProduction({ courseCode, platform, status }) {
  try {
    await api.course.updatePlatformStatus(courseCode, platform, status)
    await loadCourses(true)
  } catch (err) {
    console.error('Failed to deploy to production:', err)
    await loadCourses(true)
  }
}

onMounted(() => {
  loadCourses()
})
</script>

<style scoped>
.mission-control {
  min-height: 100vh;
  background: var(--canvas);
  color: var(--ink);
  font-family: var(--font-ui, 'Josefin Sans', sans-serif);
}

.mc-actions {
  display: flex;
  justify-content: flex-end;
  padding: 0.75rem 1.5rem 0;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 500;
  border: 1px solid transparent;
  background: transparent;
  color: var(--faint);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
  font-family: inherit;
}

.chip:hover {
  border-color: var(--surface-2);
  color: var(--muted);
  background: var(--surface-2);
}

.mc-main {
  padding: 0.5rem 1.5rem 2rem;
}

@media (max-width: 640px) {
  .mc-actions {
    padding: 0.75rem 1rem 0;
  }

  .mc-main {
    padding: 0.5rem 1rem 2rem;
  }
}
</style>
