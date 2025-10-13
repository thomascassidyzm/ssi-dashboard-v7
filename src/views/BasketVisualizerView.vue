<template>
  <div class="min-h-screen bg-slate-900 p-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <router-link
          to="/courses"
          class="text-emerald-400 hover:text-emerald-300 mb-4 inline-block"
        >
          ← Back to Course Library
        </router-link>
        <div class="flex items-start justify-between">
          <div>
            <h1 class="text-4xl font-bold text-emerald-400 mb-2">
              Basket Visualizer
            </h1>
            <p class="text-slate-400">
              Explore and edit teaching baskets for {{ courseCode }}
            </p>
          </div>
        </div>
      </div>

      <!-- Activity Log -->
      <div v-if="activityLog.length > 0" class="mb-6">
        <details class="bg-slate-800 border border-slate-700 rounded-lg">
          <summary class="px-4 py-3 cursor-pointer text-emerald-400 hover:text-emerald-300">
            Activity Log ({{ activityLog.length }} events)
          </summary>
          <div class="px-4 py-3 border-t border-slate-700 space-y-2 max-h-48 overflow-y-auto">
            <div
              v-for="(log, index) in activityLog"
              :key="index"
              class="text-sm text-slate-400 font-mono"
            >
              <span class="text-emerald-400">{{ log.timestamp }}</span> -
              <span class="text-slate-300">{{ log.message }}</span>
            </div>
          </div>
        </details>
      </div>

      <!-- PhraseVisualizer Component -->
      <PhraseVisualizer
        :course-code="courseCode"
        :basket-id="basketId"
        :editable="true"
        @basket-modified="handleBasketModified"
        @phrase-edited="handlePhraseEdited"
      />

      <!-- Stats Panel -->
      <div class="mt-8 bg-slate-800 border border-slate-700 rounded-lg p-6">
        <h3 class="text-lg font-semibold text-emerald-400 mb-4">Session Stats</h3>
        <div class="grid grid-cols-3 gap-4 text-center">
          <div>
            <div class="text-3xl font-bold text-emerald-400">{{ stats.edits }}</div>
            <div class="text-sm text-slate-400">Phrase Edits</div>
          </div>
          <div>
            <div class="text-3xl font-bold text-emerald-400">{{ stats.reorders }}</div>
            <div class="text-sm text-slate-400">Reorders</div>
          </div>
          <div>
            <div class="text-3xl font-bold text-emerald-400">{{ stats.additions }}</div>
            <div class="text-sm text-slate-400">Additions</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import PhraseVisualizer from '../components/PhraseVisualizer.vue'

const route = useRoute()
const courseCode = computed(() => route.params.courseCode || 'mkd_for_eng_574seeds')
const basketId = computed(() => route.params.basketId ? parseInt(route.params.basketId) : null)

// Activity tracking
const activityLog = ref([])
const stats = ref({
  edits: 0,
  reorders: 0,
  additions: 0
})

function handleBasketModified(event) {
  const timestamp = new Date().toLocaleTimeString()
  let message = ''

  switch (event.action) {
    case 'reorder':
      message = `Reordered items in Basket ${event.basketId}: ${event.fromIndex + 1} → ${event.toIndex + 1}`
      stats.value.reorders++
      break
    case 'add':
      message = `Added new LEGO to Basket ${event.basketId}: "${event.lego.text}"`
      stats.value.additions++
      break
    case 'save':
      message = `Saved changes to Basket ${event.basketId} (${event.basket.lego_count} LEGOs)`
      break
  }

  activityLog.value.unshift({ timestamp, message })

  // Keep only last 20 events
  if (activityLog.value.length > 20) {
    activityLog.value = activityLog.value.slice(0, 20)
  }

  console.log('Basket modified:', event)
}

function handlePhraseEdited(event) {
  const timestamp = new Date().toLocaleTimeString()
  const message = `Edited phrase #${event.legoIndex + 1} in Basket ${event.basketId}: "${event.oldText}" → "${event.newText}"`

  activityLog.value.unshift({ timestamp, message })
  stats.value.edits++

  // Keep only last 20 events
  if (activityLog.value.length > 20) {
    activityLog.value = activityLog.value.slice(0, 20)
  }

  console.log('Phrase edited:', event)

  // Here you would typically save to backend:
  // await api.updateLego(event.legoUuid, { text: event.newText })
}
</script>
