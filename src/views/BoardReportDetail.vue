<template>
  <div class="board-report-view">
    <div class="page-header">
      <router-link to="/admin/board" class="back-link">&larr; Board reports</router-link>
    </div>

    <main class="content-area">
      <p v-if="!report" class="not-found">No board report found for "{{ slug }}".</p>
      <iframe
        v-else
        class="report-frame"
        :srcdoc="html"
        sandbox="allow-popups allow-top-navigation-by-user-activation"
        title="Board report"
      ></iframe>
    </main>
  </div>
</template>

<script setup>
import { ref, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { boardReports } from '../content/board-reports'

const route = useRoute()
const slug = route.params.slug
const report = boardReports.find(r => r.slug === slug)
const html = ref('')

watchEffect(async () => {
  if (!report) return
  const mod = await report.loader()
  html.value = mod.default
})
</script>

<style scoped>
.board-report-view {
  padding: 1.5rem 1.5rem 0;
  min-height: 100vh;
  background: var(--canvas);
}

.page-header {
  margin-bottom: 1rem;
}

.back-link {
  display: inline-block;
  color: var(--accent-2);
  text-decoration: none;
  font-size: 0.875rem;
  font-weight: 500;
}

.back-link:hover {
  text-decoration: underline;
}

.not-found {
  color: var(--muted);
  padding: 2rem;
}

.report-frame {
  width: 100%;
  height: calc(100vh - 3.5rem);
  border: none;
  display: block;
}
</style>
