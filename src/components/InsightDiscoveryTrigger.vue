<template>
  <div class="insight-discovery-trigger">
    <div class="idt-row">
      <button class="idt-btn" :disabled="running" @click="run(false)">
        {{ running ? 'Running deep-run…' : 'Run insights discovery' }}
      </button>
      <button class="idt-btn idt-btn--ghost" :disabled="running" @click="run(true)" title="Synthetic populated run for presentations">
        Demo run
      </button>
    </div>
    <p v-if="status" class="idt-status" :class="{ 'idt-status--err': !!error }">{{ status }}</p>
    <p class="idt-hint">Runs on the SSi Machine via the subscription. Findings appear in the learning app at
      <code>/admin/insights</code> in ~1–2 min.</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useInsightDiscovery } from '@/composables/useInsightDiscovery'

const { running, error, trigger } = useInsightDiscovery()
const status = ref('')

async function run(demo) {
  status.value = ''
  try {
    const data = await trigger(demo)
    status.value = data?.note || `Started (${demo ? 'demo' : 'real'}).`
  } catch (e) {
    status.value = `Failed: ${e.message}`
  }
}
</script>

<style scoped>
.insight-discovery-trigger { display: flex; flex-direction: column; gap: 0.5rem; }
.idt-row { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.idt-btn {
  padding: 0.5rem 1rem; border-radius: 0.5rem; border: 1px solid transparent;
  background: #4f46e5; color: #fff; font-weight: 600; cursor: pointer;
}
.idt-btn:disabled { opacity: 0.6; cursor: default; }
.idt-btn--ghost { background: transparent; color: #4f46e5; border-color: #4f46e5; }
.idt-status { font-size: 0.875rem; color: #374151; margin: 0; }
.idt-status--err { color: #b91c1c; }
.idt-hint { font-size: 0.75rem; color: #6b7280; margin: 0; }
.idt-hint code { background: #f3f4f6; padding: 0.05rem 0.3rem; border-radius: 0.25rem; }
</style>
