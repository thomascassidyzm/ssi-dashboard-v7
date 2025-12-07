<template>
  <nav class="production-nav">
    <router-link
      :to="`/production/${courseCode}`"
      class="nav-item"
      :class="{ active: isActive('ProductionDashboard') }"
    >
      Dashboard
    </router-link>
    <router-link
      :to="`/production/${courseCode}/qa`"
      class="nav-item"
      :class="{ active: isActive('ProductionQA') || isActive('SamplesBrowser') }"
    >
      QA Browser
    </router-link>
    <router-link
      :to="`/production/${courseCode}/pipeline`"
      class="nav-item"
      :class="{ active: isActive('AudioPipelineProduction') }"
    >
      Audio Pipeline
    </router-link>
    <router-link
      :to="`/production/${courseCode}/recording`"
      class="nav-item"
      :class="{ active: isActive('AutocueStudioCourse') }"
    >
      Autocue Studio
    </router-link>
  </nav>
</template>

<script setup>
import { useRoute } from 'vue-router'

defineProps({
  courseCode: {
    type: String,
    required: true
  }
})

const route = useRoute()

function isActive(routeName) {
  return route.name === routeName
}
</script>

<style scoped>
.production-nav {
  display: flex;
  gap: 0.5rem;
  padding: 1rem;
  background: var(--color-shadow, #1e293b);
  border-bottom: 1px solid var(--color-graphite, #475569);
}

.nav-item {
  font-family: var(--font-ui, 'Josefin Sans', sans-serif);
  padding: 0.5rem 1rem;
  color: var(--color-paper-dim, #c1c1bb);
  text-decoration: none;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.nav-item:hover {
  color: var(--color-paper, #f7f7f2);
  background: var(--color-slate, #334155);
}

.nav-item.active {
  color: var(--color-tungsten, #ffa630);
  background: var(--color-slate, #334155);
}
</style>
