<template>
  <div class="production-layout">
    <header class="production-header">
      <router-link to="/production/courses" class="back-link">
        &larr; Courses
      </router-link>
      <h1 class="course-title">{{ getCourseName(courseCode) }}</h1>
    </header>

    <ProductionNav :course-code="courseCode" />

    <main class="production-content">
      <slot />
    </main>
  </div>
</template>

<script setup>
import ProductionNav from './ProductionNav.vue'
import { useCourses } from '@/composables/useCourses'

defineProps({
  courseCode: {
    type: String,
    required: true
  }
})

const { getCourseName } = useCourses()
</script>

<style scoped>
.production-layout {
  min-height: 100vh;
  background: var(--color-void, var(--canvas));
}

.production-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 2rem;
  background: var(--color-shadow, var(--surface));
  border-bottom: 1px solid var(--line);
}

.back-link {
  font-family: var(--font-ui, 'Josefin Sans', sans-serif);
  color: var(--color-paper-dim, var(--muted));
  text-decoration: none;
}

.back-link:hover {
  color: var(--color-paper, var(--ink));
}

.course-title {
  font-family: var(--font-display, 'Crimson Pro', serif);
  font-size: 1.5rem;
  color: var(--color-paper, var(--ink));
  flex: 1;
  margin: 0;
}

.connection-status {
  font-family: var(--font-mono, 'IBM Plex Mono', monospace);
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  background: var(--color-film-red, #e63946);
  color: white;
}

.connection-status.connected {
  background: var(--color-emerald, #06ffa5);
  color: var(--color-void, var(--canvas));
}

.production-content {
  padding: 2rem;
}
</style>
