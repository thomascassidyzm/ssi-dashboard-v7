<template>
  <div class="production-layout">
    <!-- Shared Header -->
    <header class="production-header">
      <div class="header-content">
        <router-link to="/courses" class="back-link">← Course Library</router-link>
        <h1 class="page-title">Production Suite</h1>
        <div class="course-info">
          <span class="course-code">{{ courseCode }}</span>
          <span v-if="courseName" class="course-name">{{ courseName }}</span>
        </div>
      </div>
    </header>

    <!-- Navigation Tabs -->
    <ProductionNav :course-code="courseCode" />

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading course data...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <div class="error-icon">⚠️</div>
      <h2>Error Loading Course</h2>
      <p>{{ error }}</p>
      <button @click="retryLoad" class="retry-btn">Retry</button>
    </div>

    <!-- Content Area - nested routes render here -->
    <main v-else class="production-content">
      <router-view :course-code="courseCode" />
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useProductionStore } from '@/stores/production'
import ProductionNav from '@/components/production/ProductionNav.vue'

const props = defineProps({
  courseCode: {
    type: String,
    required: true
  }
})

const route = useRoute()
const router = useRouter()
const store = useProductionStore()

const loading = ref(false)
const error = ref(null)
const courseName = ref('')

// Language name mapping
const languageNames = {
  'eng': 'English',
  'spa': 'Spanish',
  'fra': 'French',
  'deu': 'German',
  'ita': 'Italian',
  'por': 'Portuguese',
  'zho': 'Chinese',
  'jpn': 'Japanese',
  'kor': 'Korean',
  'ara': 'Arabic',
  'cym': 'Welsh',
  'gle': 'Irish'
}

// Compute course name from code
function getCourseName(code) {
  if (!code || !code.includes('_for_')) return ''
  const [target, , known] = code.split('_')
  const targetName = languageNames[target] || target
  const knownName = languageNames[known] || known
  return `${targetName} for ${knownName} speakers`
}

// Load course data
async function loadCourseData() {
  if (!props.courseCode) return

  loading.value = true
  error.value = null
  courseName.value = getCourseName(props.courseCode)

  try {
    // Load data via the production store
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

// Load on mount
onMounted(() => {
  loadCourseData()
})

// Reload when course changes
watch(() => props.courseCode, (newCode, oldCode) => {
  if (newCode !== oldCode) {
    loadCourseData()
  }
})
</script>

<style scoped>
.production-layout {
  min-height: 100vh;
  background: var(--color-shadow, #1e293b);
  color: var(--color-paper, #f7f7f2);
}

.production-header {
  background: var(--color-shadow, #1e293b);
  border-bottom: 1px solid var(--color-graphite, #475569);
  padding: 1rem 1.5rem;
}

.header-content {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.back-link {
  color: var(--color-tungsten, #ffa630);
  text-decoration: none;
  font-size: 0.875rem;
  transition: color 0.2s;
}

.back-link:hover {
  color: var(--color-paper, #f7f7f2);
}

.page-title {
  font-family: var(--font-ui, 'Josefin Sans', sans-serif);
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-paper, #f7f7f2);
  margin: 0;
}

.course-info {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.course-code {
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  font-size: 0.875rem;
  padding: 0.375rem 0.75rem;
  background: var(--color-slate, #334155);
  border-radius: 4px;
  color: var(--color-tungsten, #ffa630);
}

.course-name {
  font-size: 0.875rem;
  color: var(--color-paper-dim, #c1c1bb);
}

.production-content {
  max-width: 1400px;
  margin: 0 auto;
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
  border: 3px solid var(--color-graphite, #475569);
  border-top-color: var(--color-tungsten, #ffa630);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-state p,
.error-state p {
  margin-top: 1rem;
  color: var(--color-paper-dim, #c1c1bb);
}

.error-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.error-state h2 {
  color: var(--color-paper, #f7f7f2);
  margin: 0 0 0.5rem;
}

.retry-btn {
  margin-top: 1.5rem;
  padding: 0.625rem 1.5rem;
  background: var(--color-tungsten, #ffa630);
  color: var(--color-shadow, #1e293b);
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.retry-btn:hover {
  background: var(--color-paper, #f7f7f2);
}
</style>
