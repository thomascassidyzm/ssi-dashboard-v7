<template>
  <div class="production-layout">
    <header class="production-header">
      <router-link to="/production/courses" class="back-link">
        &larr; Courses
      </router-link>
      <h1 class="course-title">{{ courseCode }}</h1>
    </header>

    <ProductionNav :course-code="courseCode" />

    <main class="production-content">
      <slot />
    </main>
  </div>
</template>

<script setup>
import ProductionNav from './ProductionNav.vue'

defineProps({
  courseCode: {
    type: String,
    required: true
  }
})
</script>

<style scoped>
.production-layout {
  min-height: 100vh;
  background: var(--color-void, #0f172a);
}

.production-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 2rem;
  background: var(--color-shadow, #1e293b);
  border-bottom: 1px solid var(--color-graphite, #475569);
}

.back-link {
  font-family: var(--font-ui, 'Josefin Sans', sans-serif);
  color: var(--color-paper-dim, #c1c1bb);
  text-decoration: none;
}

.back-link:hover {
  color: var(--color-paper, #f7f7f2);
}

.course-title {
  font-family: var(--font-display, 'Crimson Pro', serif);
  font-size: 1.5rem;
  color: var(--color-paper, #f7f7f2);
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
  color: var(--color-void, #0f172a);
}

.production-content {
  padding: 2rem;
}
</style>
