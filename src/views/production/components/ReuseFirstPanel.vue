<template>
  <div class="bg-gradient-to-br from-surface/60 to-surface/30 border border-line/50 rounded-xl p-6">
    <!-- Header -->
    <div class="flex items-start justify-between mb-4">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
          <svg class="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
        </div>
        <div>
          <h3 class="font-semibold text-ink">Reuse-First Regeneration</h3>
          <p class="text-sm text-muted">Find every clip that already exists before rendering anything new</p>
        </div>
      </div>
      <span class="px-2 py-0.5 text-xs bg-teal-500/10 text-teal-400 rounded border border-teal-500/20">
        REUSE FIRST
      </span>
    </div>

    <p class="text-sm text-muted mb-4">
      Sets aside every clip the first <strong class="text-ink">{{ rounds }}</strong> rounds of this course need, asks
      whether that voice, text and language combination already exists — here or in another course — relinks what does,
      and renders only what is genuinely missing. Planning is read-only and always safe.
    </p>

    <!-- Coverage first: which voice is cheapest to finish is decided before anything is planned -->
    <VoiceCoverageTable :course-code="courseCode" :rounds="rounds" />

    <!-- Plan controls: the safe half -->
    <div class="rounded-lg border border-emerald-500/25 bg-emerald-900/10 p-4 mb-4">
      <div class="flex items-center gap-2 mb-3">
        <svg class="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span class="text-sm font-medium text-emerald-300">Safe — generates nothing, writes nothing, costs nothing</span>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <label class="text-sm text-muted">Rounds</label>
        <input
          type="number"
          v-model.number="rounds"
          min="1"
          max="500"
          class="w-20 px-2 py-1.5 bg-canvas/50 text-ink text-center rounded border border-line/50 text-sm"
        />
        <button
          @click="loadPlan"
          :disabled="planning"
          class="px-4 py-2 bg-emerald-600/20 border border-emerald-500/50 text-emerald-300 hover:border-emerald-400/70 hover:text-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium rounded-lg transition-all flex items-center gap-2"
        >
          <svg v-if="planning" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ planning ? 'Planning...' : 'Plan (dry run)' }}
        </button>
        <span v-if="plan" class="text-xs text-faint">Planned {{ formatTime(plan.generatedAt) }}</span>
      </div>
    </div>

    <!-- Plan error / endpoint missing -->
    <div v-if="planError" class="rounded-lg border border-amber-500/30 bg-amber-900/10 p-4 mb-4">
      <div class="text-sm font-medium text-amber-300 mb-1">{{ planErrorTitle }}</div>
      <div class="text-sm text-muted">{{ planError }}</div>
    </div>

    <!-- The plan -->
    <div v-if="plan" class="space-y-4">
      <!-- Shape line -->
      <div class="text-sm text-muted">
        <span class="text-ink font-medium">{{ n(plan.shape?.cycles) }}</span> cycles ·
        <span class="text-ink font-medium">{{ n(plan.shape?.clipPlays) }}</span> clip plays ·
        <span class="text-ink font-medium">{{ n(plan.shape?.distinctClips) }}</span> distinct clips
        across rounds 1–{{ plan.rounds }}
        <span v-if="byTypeLine" class="text-faint"> — {{ byTypeLine }}</span>
      </div>

      <!-- Five buckets -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
        <button
          v-for="b in buckets"
          :key="b.key"
          @click="setFilter(b.key)"
          class="bg-canvas/50 rounded-lg p-3 text-center border transition-colors"
          :class="filter === b.key ? b.activeClass : 'border-line/30 hover:border-line/60'"
        >
          <div class="text-xl font-bold" :class="b.textClass">{{ n(summary[b.key]) }}</div>
          <div class="text-xs text-faint leading-tight mt-0.5">{{ b.label }}</div>
        </button>
      </div>

      <!-- Voices -->
      <div v-if="plan.voices" class="text-xs text-muted flex flex-wrap gap-x-4 gap-y-1">
        <span v-for="(v, role) in plan.voices" :key="role">
          {{ role }}: <code class="text-teal-400 bg-surface px-1.5 py-0.5 rounded">{{ v }}</code>
        </span>
      </div>

      <!-- Cost, stated before any spending button -->
      <div class="rounded-lg border border-amber-500/25 bg-amber-900/10 p-4">
        <div class="text-sm text-ink">
          Render cost if you proceed:
          <strong class="text-amber-400">{{ n(plan.estimate?.renderClips) }}</strong> clips,
          <strong class="text-amber-400">{{ n(plan.estimate?.characters) }}</strong> characters of TTS.
        </div>
        <div v-if="plan.estimate?.note" class="text-xs text-muted mt-1">{{ plan.estimate.note }}</div>
        <div class="text-xs text-muted mt-1">
          Everything else is either already correct or relinked from an existing recording — no charge.
        </div>
      </div>

      <!-- Per-clip table -->
      <div class="border border-line/50 rounded-lg overflow-hidden">
        <button
          @click="showClips = !showClips"
          class="w-full px-4 py-3 flex items-center justify-between hover:bg-surface-2/20 transition-colors"
        >
          <span class="text-sm font-medium text-ink">
            Per-clip detail — {{ n(clips.length) }} clips
            <span v-if="filter !== 'all'" class="text-faint">({{ n(filteredClips.length) }} shown)</span>
          </span>
          <svg class="w-5 h-5 text-muted transition-transform duration-200" :class="{ 'rotate-180': showClips }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>

        <div v-show="showClips" class="border-t border-line/50">
          <!-- Filter chips -->
          <div class="px-4 py-3 flex flex-wrap gap-2 border-b border-line/30">
            <button
              v-for="f in filterOptions"
              :key="f.key"
              @click="filter = f.key"
              class="px-2.5 py-1 text-xs rounded-full border transition-colors"
              :class="filter === f.key
                ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                : 'bg-surface/50 text-muted border-line/40 hover:text-ink'"
            >
              {{ f.label }} ({{ n(f.count) }})
            </button>
          </div>

          <div class="max-h-96 overflow-y-auto">
            <table class="w-full text-xs">
              <thead class="sticky top-0 bg-surface/95 text-faint uppercase tracking-wide">
                <tr>
                  <th class="text-left px-3 py-2 font-medium">Role</th>
                  <th class="text-left px-3 py-2 font-medium">Voice</th>
                  <th class="text-left px-3 py-2 font-medium">Text</th>
                  <th class="text-left px-3 py-2 font-medium">Decision</th>
                  <th class="text-left px-3 py-2 font-medium">Reason</th>
                  <th class="text-left px-3 py-2 font-medium">Source</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="c in visibleClips" :key="c.clipKey" class="border-t border-line/20 align-top">
                  <td class="px-3 py-2 text-muted whitespace-nowrap">{{ c.role }}</td>
                  <td class="px-3 py-2 text-muted whitespace-nowrap">
                    <code class="bg-surface px-1 py-0.5 rounded">{{ c.voiceId }}</code>
                    <div class="text-faint mt-0.5">{{ getLanguageName(c.language) }}</div>
                  </td>
                  <td class="px-3 py-2 text-ink max-w-xs">
                    {{ c.text }}
                    <div v-if="c.plays" class="text-faint mt-0.5">
                      {{ c.plays }} play{{ c.plays === 1 ? '' : 's' }}<template v-if="c.roundsUsedIn?.length"> · rounds {{ c.roundsUsedIn.join(', ') }}</template>
                    </div>
                  </td>
                  <td class="px-3 py-2 whitespace-nowrap">
                    <span class="px-2 py-0.5 rounded-full border text-[11px]" :class="decisionClass(c.decision)">
                      {{ decisionLabel(c.decision) }}
                    </span>
                  </td>
                  <td class="px-3 py-2 text-muted max-w-xs">{{ c.reason }}</td>
                  <td class="px-3 py-2 text-muted whitespace-nowrap">
                    <template v-if="c.decision === 'REUSE_CROSS' && c.reuseSource">
                      <span class="text-blue-400">{{ getCourseName(c.reuseSource.courseCode) }}</span>
                    </template>
                    <template v-else-if="c.decision === 'REUSE_OWN'">
                      <span class="text-faint">this course</span>
                    </template>
                    <template v-else>—</template>
                  </td>
                </tr>
                <tr v-if="!visibleClips.length">
                  <td colspan="6" class="px-3 py-4 text-center text-faint">No clips in this bucket.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="filteredClips.length > visibleLimit" class="px-4 py-3 border-t border-line/30 text-center">
            <button @click="visibleLimit += 100" class="text-xs text-teal-400 hover:text-teal-300 transition-colors">
              Show 100 more — {{ n(filteredClips.length - visibleLimit) }} still hidden
            </button>
          </div>
        </div>
      </div>

      <!-- The money-spending half -->
      <div v-if="(summary.render || 0) > 0" class="rounded-lg border border-red-500/30 bg-red-900/10 p-4">
        <div class="flex items-center gap-2 mb-2">
          <svg class="w-4 h-4 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
          <span class="text-sm font-medium text-red-300">This one spends money</span>
        </div>
        <p class="text-sm text-muted mb-3">
          Relinks the {{ n((summary.reuseOwn || 0) + (summary.reuseCross || 0)) }} reusable clips first — nothing is
          deleted — then renders the {{ n(summary.render) }} clips that genuinely do not exist yet.
          Type <code class="text-ink bg-surface px-1.5 py-0.5 rounded">{{ courseCode }}</code> to confirm.
        </p>
        <div class="flex flex-wrap items-center gap-3">
          <input
            type="text"
            v-model="confirmText"
            :placeholder="courseCode"
            spellcheck="false"
            class="px-3 py-2 bg-canvas/50 text-ink rounded border border-line/50 focus:border-red-500/50 focus:outline-none text-sm font-mono"
          />
          <button
            @click="runGeneration"
            :disabled="!canGenerate"
            class="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-surface disabled:text-faint text-white rounded-lg transition-colors text-sm font-medium"
          >
            {{ applying ? 'Starting...' : `Generate ${n(summary.render)} missing clips` }}
          </button>
          <span v-if="runActive" class="text-sm text-amber-400 animate-pulse">Run in progress — see the progress panel above</span>
        </div>
      </div>
      <div v-else class="rounded-lg border border-emerald-500/25 bg-emerald-900/10 p-4 text-sm text-emerald-300">
        Nothing needs rendering for rounds 1–{{ plan.rounds }} — every clip is either already correct or reusable.
      </div>
    </div>

    <!-- Apply error -->
    <div v-if="applyError" class="mt-4 rounded-lg border border-red-500/30 bg-red-900/10 p-4">
      <div class="text-sm font-medium text-red-400 mb-1">Could not start the run</div>
      <div class="text-sm text-muted">{{ applyError }}</div>
    </div>

    <!-- Outcome -->
    <div v-if="runResult" class="mt-4 rounded-lg border border-line/50 bg-canvas/50 p-4">
      <div class="flex items-center gap-2 mb-2">
        <div class="w-2 h-2 rounded-full" :class="(runResult.failed || 0) > 0 ? 'bg-amber-500' : 'bg-emerald-500'"></div>
        <span class="text-sm font-medium text-ink">Run finished</span>
        <span v-if="runResult.dryRun" class="px-2 py-0.5 text-xs bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20">DRY RUN</span>
      </div>
      <div class="grid grid-cols-3 gap-4 mb-2">
        <div>
          <div class="text-xl font-bold text-teal-400">{{ n(runResult.reused) }}</div>
          <div class="text-xs text-faint uppercase tracking-wide">Reused</div>
        </div>
        <div>
          <div class="text-xl font-bold text-emerald-400">{{ n(runResult.rendered) }}</div>
          <div class="text-xs text-faint uppercase tracking-wide">Rendered</div>
        </div>
        <div>
          <div class="text-xl font-bold" :class="(runResult.failed || 0) > 0 ? 'text-red-400' : 'text-faint'">{{ n(runResult.failed) }}</div>
          <div class="text-xs text-faint uppercase tracking-wide">Failed</div>
        </div>
      </div>
      <div v-if="runErrors.length" class="mt-3 space-y-1.5">
        <div class="text-xs text-faint uppercase tracking-wide">Errors</div>
        <div v-for="(e, i) in runErrors" :key="i" class="text-xs text-red-400 bg-surface/50 p-2 rounded font-mono whitespace-pre-wrap break-words">{{ e }}</div>
      </div>
      <div v-if="runResult.artifactPath" class="mt-3 text-xs text-faint break-all">
        Artifact: <code class="bg-surface px-1.5 py-0.5 rounded">{{ runResult.artifactPath }}</code>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { getApiUrl } from '@/services/api'
import { useCourses } from '@/composables/useCourses'
import VoiceCoverageTable from './VoiceCoverageTable.vue'

const props = defineProps<{
  courseCode: string
  audioProgress: any
}>()

const emit = defineEmits<{ (e: 'started'): void }>()

const { getCourseName, getLanguageName } = useCourses()
const apiBaseUrl = getApiUrl()
const HEADERS = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }

const rounds = ref(10)
const planning = ref(false)
const plan = ref<any>(null)
const planError = ref<string | null>(null)
const planErrorTitle = ref('Plan failed')

const showClips = ref(false)
const filter = ref<string>('RENDER')
const visibleLimit = ref(100)

const confirmText = ref('')
const applying = ref(false)
const applyError = ref<string | null>(null)
const activeRunId = ref<string | null>(null)
const runResult = ref<any>(null)

const n = (v: any) => Number(v || 0).toLocaleString()

const formatTime = (iso: string) => {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

const summary = computed(() => plan.value?.summary || {})
const clips = computed<any[]>(() => plan.value?.clips || [])

const byTypeLine = computed(() => {
  const bt = plan.value?.shape?.byType
  if (!bt) return ''
  return Object.entries(bt).map(([k, v]) => `${k} ${v}`).join(', ')
})

const buckets = [
  { key: 'satisfied', decision: 'SATISFIED', label: 'already correct', textClass: 'text-emerald-400', activeClass: 'border-emerald-500/50' },
  { key: 'reuseOwn', decision: 'REUSE_OWN', label: 'reuse from this course', textClass: 'text-teal-400', activeClass: 'border-teal-500/50' },
  { key: 'reuseCross', decision: 'REUSE_CROSS', label: 'reuse from another course', textClass: 'text-blue-400', activeClass: 'border-blue-500/50' },
  { key: 'render', decision: 'RENDER', label: 'must be rendered', textClass: 'text-amber-400', activeClass: 'border-amber-500/50' },
  { key: 'blocked', decision: 'BLOCKED', label: 'blocked', textClass: 'text-red-400', activeClass: 'border-red-500/50' }
]

const countOf = (decision: string) => clips.value.filter(c => c.decision === decision).length

// RENDER first — it is the bucket that decides whether to spend anything.
const filterOptions = computed(() => [
  { key: 'RENDER', label: 'Must be rendered', count: countOf('RENDER') },
  { key: 'BLOCKED', label: 'Blocked', count: countOf('BLOCKED') },
  { key: 'REUSE_CROSS', label: 'Reuse from another course', count: countOf('REUSE_CROSS') },
  { key: 'REUSE_OWN', label: 'Reuse from this course', count: countOf('REUSE_OWN') },
  { key: 'SATISFIED', label: 'Already correct', count: countOf('SATISFIED') },
  { key: 'all', label: 'All', count: clips.value.length }
])

const DECISION_ORDER: Record<string, number> = { RENDER: 0, BLOCKED: 1, REUSE_CROSS: 2, REUSE_OWN: 3, SATISFIED: 4 }

const filteredClips = computed(() => {
  const list = filter.value === 'all' ? clips.value.slice() : clips.value.filter(c => c.decision === filter.value)
  return list.sort((a, b) => (DECISION_ORDER[a.decision] ?? 9) - (DECISION_ORDER[b.decision] ?? 9))
})

const visibleClips = computed(() => filteredClips.value.slice(0, visibleLimit.value))

watch(filter, () => { visibleLimit.value = 100 })

const setFilter = (bucketKey: string) => {
  const b = buckets.find(x => x.key === bucketKey)
  if (!b) return
  filter.value = b.decision
  showClips.value = true
}

const decisionLabel = (d: string) => ({
  SATISFIED: 'already correct',
  REUSE_OWN: 'reuse — this course',
  REUSE_CROSS: 'reuse — another course',
  RENDER: 'must be rendered',
  BLOCKED: 'blocked'
} as Record<string, string>)[d] || d

const decisionClass = (d: string) => ({
  SATISFIED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  REUSE_OWN: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  REUSE_CROSS: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  RENDER: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  BLOCKED: 'bg-red-500/10 text-red-400 border-red-500/20'
} as Record<string, string>)[d] || 'bg-surface/50 text-muted border-line/40'

// A run belongs to us when Phase 8 reports operation 'reuse-first' for this course.
const runActive = computed(() => {
  const p = props.audioProgress || {}
  return p.active === true && p.operation === 'reuse-first' &&
    (!p.courseCode || p.courseCode === props.courseCode)
})

const otherJobActive = computed(() => {
  const p = props.audioProgress || {}
  return p.active === true && !runActive.value
})

const canGenerate = computed(() =>
  !applying.value &&
  !runActive.value &&
  !otherJobActive.value &&
  confirmText.value.trim() === props.courseCode &&
  (summary.value.render || 0) > 0
)

const runErrors = computed<string[]>(() => {
  const e = runResult.value?.errors
  if (!e) return []
  return (Array.isArray(e) ? e : [e]).map((x: any) => typeof x === 'string' ? x : JSON.stringify(x))
})

const loadPlan = async () => {
  planning.value = true
  planError.value = null
  runResult.value = null
  try {
    const response = await fetch(
      `${apiBaseUrl}/api/audio/reuse-plan/${props.courseCode}?rounds=${rounds.value}`,
      { headers: HEADERS }
    )
    const data = await response.json().catch(() => null)
    if (response.status === 404) {
      planErrorTitle.value = 'Reuse-first planning is not available yet'
      planError.value = 'The audio service on this machine does not expose a reuse plan. Nothing was changed. Try again once the phase-8 service has been updated and restarted.'
      return
    }
    if (!response.ok || !data?.ok) {
      planErrorTitle.value = 'Plan failed'
      planError.value = data?.error || `Request failed with status ${response.status}`
      return
    }
    plan.value = data
    filter.value = 'RENDER'
    visibleLimit.value = 100
    confirmText.value = ''
  } catch (err: any) {
    planErrorTitle.value = 'Could not reach the audio service'
    planError.value = err?.message || 'Unknown error'
  } finally {
    planning.value = false
  }
}

const runGeneration = async () => {
  if (!canGenerate.value) return
  const confirmed = confirm(
    `This will render ${summary.value.render} new clips for ${getCourseName(props.courseCode)} ` +
    `(rounds 1-${plan.value?.rounds}), about ${plan.value?.estimate?.characters || 0} characters of TTS.\n\n` +
    `${(summary.value.reuseOwn || 0) + (summary.value.reuseCross || 0)} clips will be relinked from existing recordings first. Nothing is deleted.\n\n` +
    `This costs money. Continue?`
  )
  if (!confirmed) return

  applying.value = true
  applyError.value = null
  runResult.value = null
  try {
    const response = await fetch(`${apiBaseUrl}/api/audio/reuse-apply/${props.courseCode}`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ rounds: rounds.value, dryRun: false, confirm: props.courseCode })
    })
    const data = await response.json().catch(() => null)
    if (!response.ok && response.status !== 202) {
      applyError.value = data?.error || `Request failed with status ${response.status}`
      return
    }
    activeRunId.value = data?.runId || null
    emit('started')
  } catch (err: any) {
    applyError.value = err?.message || 'Unknown error'
  } finally {
    applying.value = false
  }
}

const fetchRunResult = async () => {
  if (!activeRunId.value) return
  try {
    const response = await fetch(`${apiBaseUrl}/api/audio/reuse-run/${activeRunId.value}`, { headers: HEADERS })
    const data = await response.json().catch(() => null)
    if (response.ok && data?.ok) {
      runResult.value = data
      activeRunId.value = null
    }
  } catch {
    // The progress panel above already reports service trouble; nothing to add here.
  }
}

// The parent already polls Phase 8's /status. When our run stops being active,
// pull the outcome once rather than standing up a second poller.
watch(runActive, (isActive, wasActive) => {
  if (wasActive && !isActive) fetchRunResult()
})
</script>
