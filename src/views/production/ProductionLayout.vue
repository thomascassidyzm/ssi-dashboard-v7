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
      <router-view :course-code="courseCode" />
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useProductionStore } from '@/stores/production'

const props = defineProps({
  courseCode: {
    type: String,
    required: true
  }
})

const store = useProductionStore()

const loading = ref(false)
const error = ref(null)

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
.production-layout {
  min-height: 100vh;
  background: var(--color-shadow, #1e293b);
  color: var(--color-paper, #f7f7f2);
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
  width: 3rem;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 700;
  color: #ef4444;
  border: 2px solid #ef4444;
  border-radius: 50%;
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
