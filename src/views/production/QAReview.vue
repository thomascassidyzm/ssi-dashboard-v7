<template>
  <div class="qa-review">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-4">
        <h2 class="text-lg font-semibold text-slate-100">QA Review</h2>
        <span class="px-3 py-1 bg-slate-700/50 border border-slate-600/50 rounded text-sm font-mono text-emerald-400">
          {{ courseCode }}
        </span>
      </div>
      <div class="flex items-center gap-3 text-sm">
        <span class="text-red-400 font-mono">{{ summary.errors }}</span>
        <span class="text-slate-500">errors</span>
        <span class="text-slate-600">|</span>
        <span class="text-amber-400 font-mono">{{ summary.warnings }}</span>
        <span class="text-slate-500">warnings</span>
        <span class="text-slate-600">|</span>
        <span class="text-slate-400 font-mono">{{ flags.length }}</span>
        <span class="text-slate-500">total flags</span>
      </div>
    </div>

    <!-- Phrase check progress -->
    <div class="mb-4">
      <div class="flex items-center justify-between text-xs text-slate-500 mb-1">
        <span>Phrase checks: {{ phraseProgress.checked }}/{{ phraseProgress.total }}</span>
        <span>{{ phraseProgress.percent }}%</span>
      </div>
      <div class="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
        <div class="h-full bg-emerald-500 transition-all duration-500"
          :style="{ width: phraseProgress.percent + '%' }">
        </div>
      </div>
    </div>

    <!-- Filter tabs -->
    <div class="flex gap-1.5 mb-6">
      <button
        v-for="tab in filterTabs"
        :key="tab.key"
        @click="activeFilter = tab.key"
        class="px-3 py-1.5 rounded text-xs font-medium transition-all"
        :class="activeFilter === tab.key
          ? 'bg-slate-600/50 text-slate-200'
          : 'bg-slate-800/30 text-slate-500 hover:text-slate-400'"
      >
        {{ tab.label }}
        <span class="ml-1 font-mono">{{ tab.count }}</span>
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12 text-slate-500">
      Loading QA flags...
    </div>

    <!-- Empty state -->
    <div v-else-if="flags.length === 0" class="text-center py-12">
      <div class="text-emerald-400 text-lg mb-2">No flags found</div>
      <div class="text-sm text-slate-500">All phrases passed QA checks.</div>
    </div>

    <!-- Flags list -->
    <div v-else class="space-y-2">
      <div
        v-for="flag in filteredFlags"
        :key="flag.id"
        class="bg-slate-800/30 border rounded-lg px-5 py-3 flex items-start gap-4"
        :class="dismissed.has(flag.id) ? 'border-slate-700/20 opacity-40' : 'border-slate-700/50'"
      >
        <!-- Severity badge -->
        <div class="pt-0.5">
          <span class="inline-block w-2 h-2 rounded-full"
            :class="flag.severity === 'error' ? 'bg-red-400' : flag.severity === 'warning' ? 'bg-amber-400' : 'bg-slate-400'">
          </span>
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-xs font-mono text-slate-500">S{{ flag.seed_number }}</span>
            <span class="px-1.5 py-0.5 rounded text-xs"
              :class="typeClass(flag.check_type)">
              {{ flag.check_type }}
            </span>
            <span v-if="flag.details?.phrase_role" class="text-xs text-slate-600">
              {{ flag.details.phrase_role.toUpperCase() }}
            </span>
          </div>

          <!-- Phrase pair -->
          <div class="text-sm mb-1">
            <span class="text-slate-400">{{ flag.details?.known || '—' }}</span>
            <span class="text-slate-600 mx-1">&rarr;</span>
            <span class="text-slate-200">{{ flag.details?.target || '—' }}</span>
          </div>

          <!-- Issue -->
          <div class="text-xs text-slate-500">{{ flag.issue }}</div>
        </div>

        <!-- Dismiss button -->
        <button
          v-if="!dismissed.has(flag.id)"
          @click="toggleDismiss(flag.id)"
          class="shrink-0 px-2.5 py-1 text-xs bg-slate-700/30 border border-slate-600/50 text-slate-400 rounded hover:bg-slate-700/50 hover:text-slate-300 transition-colors"
        >
          Dismiss
        </button>
        <button
          v-else
          @click="toggleDismiss(flag.id)"
          class="shrink-0 px-2.5 py-1 text-xs bg-slate-700/30 border border-slate-600/30 text-slate-600 rounded hover:text-slate-400 transition-colors"
        >
          Undo
        </button>
      </div>
    </div>

    <!-- Approve bar -->
    <div v-if="flags.length > 0 && !loading"
      class="sticky bottom-0 mt-6 -mx-6 -mb-6 px-6 py-4 bg-slate-900/95 border-t border-slate-700/50 flex items-center justify-between backdrop-blur">
      <div class="text-sm text-slate-400">
        <span class="text-emerald-400 font-mono">{{ dismissed.size }}</span> dismissed (false positive),
        <span class="text-red-400 font-mono">{{ flags.length - dismissed.size }}</span> to delete
      </div>
      <button
        @click="approveAll"
        :disabled="approving"
        class="px-6 py-2.5 bg-emerald-600/20 border border-emerald-500/50 text-emerald-400 rounded-lg hover:bg-emerald-600/30 transition-colors font-medium text-sm disabled:opacity-50"
      >
        {{ approving ? 'Approving...' : 'Approve & Continue Pipeline' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getApiUrl } from '@/services/api'
import { isConfigured as isSupabaseConfigured, getQAFlags, getQASummary } from '@/services/supabase'

const props = defineProps({
  courseCode: { type: String, required: true }
})

const builderApiUrl = getApiUrl()

const loading = ref(true)
const approving = ref(false)
const flags = ref([])
const dismissed = ref(new Set())
const activeFilter = ref('all')
const phraseProgress = ref({ total: 0, checked: 0, unchecked: 0, percent: 0 })
const summary = ref({ errors: 0, warnings: 0, info: 0 })
let pollInterval = null

const filterTabs = computed(() => {
  const byType = {}
  flags.value.forEach(f => {
    byType[f.check_type] = (byType[f.check_type] || 0) + 1
  })
  const tabs = [{ key: 'all', label: 'All', count: flags.value.length }]
  Object.entries(byType).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
    tabs.push({ key: type, label: type, count })
  })
  return tabs
})

const filteredFlags = computed(() => {
  if (activeFilter.value === 'all') return flags.value
  return flags.value.filter(f => f.check_type === activeFilter.value)
})

function typeClass(type) {
  const map = {
    grammar: 'bg-red-500/20 text-red-400',
    naturalness: 'bg-amber-500/20 text-amber-400',
    variety: 'bg-purple-500/20 text-purple-400',
    build_quality: 'bg-cyan-500/20 text-cyan-400',
    meaning_mismatch: 'bg-orange-500/20 text-orange-400',
  }
  return map[type] || 'bg-slate-500/20 text-slate-400'
}

function toggleDismiss(flagId) {
  const next = new Set(dismissed.value)
  if (next.has(flagId)) next.delete(flagId)
  else next.add(flagId)
  dismissed.value = next
}

async function fetchFlags() {
  try {
    if (isSupabaseConfigured()) {
      const [flagsData, summaryData] = await Promise.all([
        getQAFlags(props.courseCode, 'flagged'),
        getQASummary(props.courseCode)
      ])
      flags.value = flagsData || []
      phraseProgress.value = {
        total: summaryData.total || 0,
        checked: 0,
        unchecked: summaryData.flagged || 0,
        percent: summaryData.total > 0 ? Math.round(((summaryData.total - summaryData.flagged) / summaryData.total) * 100) : 0,
      }
    } else {
      const [flagsResp, summaryResp] = await Promise.all([
        fetch(`${builderApiUrl}/api/qa/flags/${props.courseCode}?status=open`, {
          headers: { 'ngrok-skip-browser-warning': 'true' }
        }),
        fetch(`${builderApiUrl}/api/qa/summary/${props.courseCode}`, {
          headers: { 'ngrok-skip-browser-warning': 'true' }
        })
      ])

      if (flagsResp.ok) {
        const data = await flagsResp.json()
        flags.value = data.flags || []
        summary.value = {
          errors: data.by_severity?.error || 0,
          warnings: data.by_severity?.warning || 0,
          info: data.by_severity?.info || 0,
        }
      }

      if (summaryResp.ok) {
        const data = await summaryResp.json()
        phraseProgress.value = {
          total: data.phrases?.total || 0,
          checked: data.phrases?.checked || 0,
          unchecked: data.phrases?.unchecked || 0,
          percent: data.phrases?.progress_percent || 0,
        }
      }
    }
  } catch (err) {
    console.error('[QAReview] fetch error:', err)
  } finally {
    loading.value = false
  }
}

async function approveAll() {
  approving.value = true
  try {
    const resp = await fetch(`${builderApiUrl}/api/qa/approve/${props.courseCode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      body: JSON.stringify({ dismiss_flag_ids: [...dismissed.value] })
    })
    if (!resp.ok) throw new Error(await resp.text())
    const result = await resp.json()
    console.log('[QAReview] Approved:', result)

    // Refresh
    dismissed.value = new Set()
    await fetchFlags()
  } catch (err) {
    console.error('[QAReview] approve error:', err)
  } finally {
    approving.value = false
  }
}

onMounted(() => {
  fetchFlags()
  pollInterval = setInterval(fetchFlags, 15000)
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
})
</script>

<style scoped>
.qa-review {
  padding: 1.5rem;
}
</style>
