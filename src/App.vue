<template>
  <AppNavbar />
  <!-- Hidden (sandbox) course: never mistakable for the live one, on any course page. -->
  <div v-if="sandboxCode" class="sandbox-banner" role="status">
    <strong>Hidden / Sandbox</strong> — {{ courseName(sandboxCode) }} ({{ sandboxCode }}) is hidden from learners. It is not the live course.
  </div>
  <router-view />

  <!-- Theme toggle now lives in the account menu (AppNavbar) — see ThemeToggle item there. -->
  <!-- The build sha is for us, not for a recordist. On a public surface it is
       one more piece of internal bookkeeping on a human's screen, which is the
       whole thing Tom asked us to take off it. -->
  <div v-if="!route.meta.public" class="build-label">
    {{ gitCommit }}
  </div>
</template>

<script setup>
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppNavbar from './components/AppNavbar.vue'
import { courseName, isSandboxCourse } from './utils/languageNames'
import { getServerCourseRow } from './services/supabase'

const route = useRoute()

// Any route naming a course. Ask the server once per code, so a direct visit to
// a sandbox course page learns it is hidden (and its display_name) without
// having passed through the Course Library.
const routeCourse = computed(() => route.params.courseCode || route.params.code || null)
const asked = new Set()
watch(routeCourse, (code) => {
  if (code && !asked.has(code)) {
    asked.add(code)
    getServerCourseRow(code)
  }
}, { immediate: true })
const sandboxCode = computed(() => (isSandboxCourse(routeCourse.value) ? routeCourse.value : null))
const gitCommit = __GIT_COMMIT__
</script>

<style scoped>
.sandbox-banner {
  padding: 8px 16px;
  font-size: 13px;
  text-align: center;
  color: #78350f;
  background: #fbbf24;
  border-bottom: 2px solid #b45309;
}
.build-label {
  position: fixed;
  bottom: 12px;
  right: 12px;
  padding: 4px 10px;
  font-size: 11px;
  font-weight: 600;
  font-family: monospace;
  /* Neon green here was the loudest colour on every screen and it measured
     nothing — it is a build sha. Ink and grey (Tom, 2026-09-02). */
  color: var(--muted);
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 4px;
  z-index: 9999;
  pointer-events: none;
  text-shadow: none;
  box-shadow: none;
}

/* Light mode carries the same grey treatment as dark, minus the dark canvas.
   (This used to re-tone a neon green that was itself the problem: a build sha
   was the loudest thing on every screen and it measured nothing.) */
:root[data-theme="light"] .build-label {
  color: var(--muted);
  background: var(--surface);
  border-color: var(--line);
  text-shadow: none;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.12);
}
</style>
