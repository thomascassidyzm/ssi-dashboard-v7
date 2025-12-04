<template>
  <div class="course-selector">
    <h1 class="title">Course Production Suite</h1>
    <p class="subtitle">Select a course to begin production workflow</p>

    <div v-if="loading" class="loading">Loading courses...</div>
    <div v-else-if="error" class="error">{{ error }}</div>

    <div v-else class="course-grid">
      <div
        v-for="course in courses"
        :key="course.code"
        class="course-card"
        @click="selectCourse(course.code)"
      >
        <div class="course-code">{{ course.code }}</div>
        <div class="course-name">{{ course.name }}</div>
        <div class="course-stats">
          <span>{{ course.sampleCount || 0 }} samples</span>
          <span v-if="course.progress">{{ course.progress }}% complete</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const courses = ref([])
const loading = ref(true)
const error = ref(null)

onMounted(async () => {
  try {
    // Try to fetch available courses from API
    const response = await fetch('/api/courses')
    if (response.ok) {
      courses.value = await response.json()
    } else {
      // Fallback to default courses if API not available
      courses.value = [
        { code: 'spa_for_eng', name: 'Spanish for English Speakers', sampleCount: 0 },
        { code: 'wel_for_eng', name: 'Welsh for English Speakers', sampleCount: 0 },
        { code: 'cmn_for_eng', name: 'Mandarin for English Speakers', sampleCount: 0 }
      ]
    }
  } catch (err) {
    // Fallback to default courses on error
    courses.value = [
      { code: 'spa_for_eng', name: 'Spanish for English Speakers', sampleCount: 0 },
      { code: 'wel_for_eng', name: 'Welsh for English Speakers', sampleCount: 0 },
      { code: 'cmn_for_eng', name: 'Mandarin for English Speakers', sampleCount: 0 }
    ]
  } finally {
    loading.value = false
  }
})

function selectCourse(courseCode) {
  router.push(`/production/${courseCode}`)
}
</script>

<style scoped>
.course-selector {
  padding: 2rem;
  background: var(--color-void, #0a0b0f);
  min-height: 100vh;
}

.title {
  font-family: var(--font-display, 'Crimson Pro', serif);
  font-size: 2.5rem;
  color: var(--color-paper, #f7f7f2);
  margin-bottom: 0.5rem;
}

.subtitle {
  font-family: var(--font-ui, 'Josefin Sans', sans-serif);
  color: var(--color-paper-dim, #c1c1bb);
  margin-bottom: 2rem;
}

.course-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

.course-card {
  background: var(--color-shadow, #16181f);
  border: 1px solid var(--color-graphite, #34384a);
  border-radius: 8px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.course-card:hover {
  border-color: var(--color-tungsten, #ffa630);
  transform: translateY(-2px);
}

.course-code {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 1.25rem;
  color: var(--color-tungsten, #ffa630);
  margin-bottom: 0.5rem;
}

.course-name {
  font-family: var(--font-ui, 'Josefin Sans', sans-serif);
  color: var(--color-paper, #f7f7f2);
  margin-bottom: 1rem;
}

.course-stats {
  font-size: 0.875rem;
  color: var(--color-paper-dim, #c1c1bb);
  display: flex;
  gap: 1rem;
}

.loading, .error {
  text-align: center;
  padding: 2rem;
  color: var(--color-paper-dim, #c1c1bb);
}

.error {
  color: var(--color-film-red, #e63946);
}
</style>
