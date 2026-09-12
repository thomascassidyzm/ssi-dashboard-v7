<template>
  <div class="production-layout">
    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading course data...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <div class="error-icon">!</div>
      <h2>Error Loading Course</h2>
      <p>{{ error }}</p>
      <button @click="retryLoad" class="retry-btn">Retry</button>
    </div>

    <!-- Content Area - nested routes render here -->
    <main v-else class="production-content">
      <!-- THE WAY BACK TO THE BOOTH. Drawn only in a tab that came from one:
           the booth's nav points at these course pages (Overview, Pods, a
           pod's lines) and a recordist who is here to fix a line needs one
           tap back to reading. See recordist/booth-pointer.js. -->
      <router-link v-if="boothVoice" :to="`/r/${boothVoice}`" class="booth-return">← Back to the booth</router-link>
      <router-view :course-code="courseCode" />
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useProductionStore } from '@/stores/production'
import { rememberedBooth } from '@/views/recordist/booth-pointer.js'

const props = defineProps({
  courseCode: {
    type: String,
    required: true
  }
})

const store = useProductionStore()

const loading = ref(false)
const error = ref(null)
const boothVoice = rememberedBooth()

const isCreateMode = computed(() => props.courseCode === 'new')

async function loadCourseData() {
  if (!props.courseCode || isCreateMode.value) return

  loading.value = true
  error.value = null

  try {
    await store.loadCourse(props.courseCode)
  } catch (err) {
    console.error('Failed to load course:', err)
    error.value = err.message || 'Failed to load course data'
  } finally {
    loading.value = false
  }
}

function retryLoad() {
  loadCourseData()
}

onMounted(() => {
  loadCourseData()
})

watch(() => props.courseCode, (newCode, oldCode) => {
  if (newCode !== oldCode) {
    loadCourseData()
  }
})
</script>

<style scoped>
.booth-return {
  display: inline-block;
  margin: 0.75rem 1rem 0;
  padding: 0.55rem 0.9rem;
  border-radius: 8px;
  background: rgba(6, 255, 165, 0.12);
  color: var(--color-emerald, #06ffa5);
  font-weight: 600;
  text-decoration: none;
}
.booth-return:hover, .booth-return:focus-visible { background: rgba(6, 255, 165, 0.22); }
.production-layout {
  min-height: 100vh;
  background: var(--color-shadow, var(--surface));
  color: var(--color-paper, var(--ink));
}

.production-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1.5rem;
}

.loading-state,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.spinner {
  width: 3rem;
  height: 3rem;
  border: 3px solid var(--color-graphite, var(--surface-3));
  border-top-color: var(--color-tungsten, var(--accent));
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-state p,
.error-state p {
  margin-top: 1rem;
  color: var(--color-paper-dim, var(--muted));
}

.error-icon {
  width: 3rem;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-film-red, var(--danger));
  border: 2px solid var(--color-film-red, var(--danger));
  border-radius: 50%;
  margin-bottom: 1rem;
}

.error-state h2 {
  color: var(--color-paper, var(--ink));
  margin: 0 0 0.5rem;
}

.retry-btn {
  margin-top: 1.5rem;
  padding: 0.625rem 1.5rem;
  background: var(--color-tungsten, var(--accent));
  color: var(--color-shadow, var(--surface));
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.retry-btn:hover {
  background: var(--color-paper, var(--ink));
}
</style>
