<template>
  <div class="rounded-lg border border-line/50 bg-canvas/40 p-4 mb-4">
    <!-- Header -->
    <div class="flex items-start justify-between gap-3 mb-3">
      <div>
        <h4 class="text-sm font-semibold text-ink">Voice coverage</h4>
        <p class="text-xs text-muted mt-0.5">
          For each candidate voice, how much of what rounds 1–{{ rounds }} need already exists somewhere in the estate.
          The voice with the best coverage is the cheapest to finish.
        </p>
      </div>
      <span class="px-2 py-0.5 text-xs bg-sky-500/10 text-sky-400 rounded border border-sky-500/20 whitespace-nowrap">
        EVIDENCE
      </span>
    </div>

    <!-- How wide the lookup is — the whole point, so it is said out loud -->
    <p class="text-xs text-muted mb-3">
      The lookup key is <strong class="text-ink">voice × text × language</strong> and nothing else — across every course
      and every role. An English sentence a voice already spoke as target2 inside another course counts as coverage for
      the English known side here.
    </p>

    <!-- Measure control: read-only and obviously free -->
    <div class="rounded-lg border border-emerald-500/25 bg-emerald-900/10 p-3 mb-3">
      <div class="flex flex-wrap items-center gap-3">
        <button
          @click="loadCoverage"
          :disabled="measuring"
          class="px-4 py-2 bg-emerald-600/20 border border-emerald-500/50 text-emerald-300 hover:border-emerald-400/70 hover:text-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium rounded-lg transition-all flex items-center gap-2"
        >
          <svg v-if="measuring" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ measuring ? 'Measuring...' : 'Measure voice coverage' }}
        </button>
        <span class="text-xs text-emerald-300">Read-only — counts what already exists, generates nothing, costs nothing</span>
        <span v-if="coverage" class="text-xs text-faint">Measured {{ formatTime(coverage.generatedAt) }}</span>
      </div>
    </div>

    <!-- Error / endpoint missing -->
    <div v-if="error" class="rounded-lg border border-amber-500/30 bg-amber-900/10 p-4">
      <div class="text-sm font-medium text-amber-300 mb-1">{{ errorTitle }}</div>
      <div class="text-sm text-muted">{{ error }}</div>
    </div>

    <div v-if="coverage" class="space-y-4">
      <!-- Shape -->
      <div class="text-sm text-muted">
        <span class="text-ink font-medium">{{ n(coverage.shape?.cycles) }}</span> cycles ·
        <span class="text-ink font-medium">{{ n(coverage.shape?.clipPlays) }}</span> clip plays ·
        <span class="text-ink font-medium">{{ n(coverage.shape?.distinctClips) }}</span> distinct clips
        across rounds 1–{{ coverage.rounds }}
      </div>

      <!-- What each layer needs -->
      <div v-if="layerKeys.length" class="text-xs text-muted flex flex-wrap gap-x-4 gap-y-1">
        <span v-for="k in layerKeys" :key="k">
          {{ layerLabel(k) }}:
          <span class="text-ink">{{ n(coverage.layers[k]?.needed) }}</span> clips
          <code class="text-teal-400 bg-surface px-1.5 py-0.5 rounded ml-1">{{ getLanguageName(coverage.layers[k]?.language) }}</code>
        </span>
      </div>

      <!-- The decision card — Tom's call, not the tool's -->
      <div v-if="coverage.recommendation" class="rounded-lg border border-sky-500/30 bg-sky-900/10 p-4">
        <div class="flex items-center gap-2 mb-2">
          <svg class="w-4 h-4 text-sky-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span class="text-sm font-medium text-sky-300">Your call: which voice does {{ getCourseName(courseCode) }} get?</span>
        </div>
        <p class="text-sm text-ink mb-2">
          Best existing coverage:
          <strong class="text-sky-300">{{ coverage.recommendation.voiceFamily }}</strong>.
        </p>
        <p v-if="coverage.recommendation.reason" class="text-sm text-muted mb-2">
          {{ coverage.recommendation.reason }}
        </p>
        <p class="text-sm text-muted">
          Choosing it would leave
          <strong class="text-amber-400">{{ n(coverage.recommendation.spendIfChosen?.renderClips) }}</strong> clips to render
          — about
          <strong class="text-amber-400">{{ n(coverage.recommendation.spendIfChosen?.characters) }}</strong> characters of TTS.
        </p>
        <p class="text-xs text-faint mt-2">
          This table is evidence, not a decision. Nothing is chosen or rendered until you say so.
        </p>
      </div>

      <!-- Language-name filter: a clean result is a result -->
      <div class="rounded-lg border border-line/40 bg-surface/30 p-3">
        <div class="text-xs font-medium text-ink mb-1">Language-name filter</div>
        <template v-if="!coverage.languageFilter">
          <div class="text-xs text-muted">The service reported no filter result for this measurement.</div>
        </template>
        <template v-else-if="!coverage.languageFilter.applied">
          <div class="text-xs text-muted">Not applied to this measurement.</div>
        </template>
        <template v-else-if="!excludedCount">
          <div class="text-xs text-muted">
            <strong class="text-emerald-400">Zero</strong> candidate texts were excluded for naming a language.
          </div>
        </template>
        <template v-else>
          <div class="text-xs text-muted">
            <strong class="text-amber-400">{{ n(excludedCount) }}</strong> candidate texts were excluded because they name a language.
          </div>
          <ul v-if="excludedExamples.length" class="mt-2 space-y-1">
            <li v-for="(ex, i) in excludedExamples" :key="i" class="text-xs text-faint">
              <span class="text-ink">{{ ex.text }}</span>
              <span v-if="ex.namedLanguage"> — names {{ ex.namedLanguage }}</span>
              <span v-if="ex.sourceCourse"> · {{ ex.sourceCourse }}</span>
            </li>
          </ul>
        </template>
        <div v-if="coverage.languageFilter?.note" class="text-xs text-faint mt-2">{{ coverage.languageFilter.note }}</div>
      </div>

      <!-- The coverage table -->
      <div class="border border-line/50 rounded-lg overflow-x-auto">
        <table class="w-full text-xs">
          <thead class="bg-surface/95 text-faint uppercase tracking-wide">
            <tr>
              <th class="text-left px-3 py-2 font-medium">Voice family</th>
              <th class="text-left px-3 py-2 font-medium">Provider</th>
              <th v-for="k in layerKeys" :key="k" class="text-left px-3 py-2 font-medium whitespace-nowrap">
                {{ layerLabel(k) }}
              </th>
              <th class="text-left px-3 py-2 font-medium">Overall</th>
              <th class="text-left px-3 py-2 font-medium">Borrowable</th>
              <th class="text-left px-3 py-2 font-medium">Via a target role</th>
              <th class="text-left px-3 py-2 font-medium">Top source courses</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in rows"
              :key="row.voiceFamily"
              class="border-t border-line/20 align-top"
              :class="row.isCurrent ? 'bg-teal-500/5' : ''"
            >
              <td class="px-3 py-2 whitespace-nowrap">
                <span class="text-ink font-medium">{{ row.voiceFamily }}</span>
                <span
                  v-if="row.isCurrent"
                  class="ml-2 px-1.5 py-0.5 text-[10px] bg-teal-500/10 text-teal-300 rounded border border-teal-500/30"
                >CURRENT</span>
                <div v-if="row.voiceIds?.length" class="text-faint mt-0.5">{{ row.voiceIds.join(', ') }}</div>
              </td>
              <td class="px-3 py-2 text-muted whitespace-nowrap">{{ row.provider || '—' }}</td>
              <td v-for="k in layerKeys" :key="k" class="px-3 py-2 whitespace-nowrap min-w-[7rem]">
                <template v-if="row.byLayer?.[k]">
                  <div class="text-ink">
                    {{ n(row.byLayer[k].covered) }} / {{ n(row.byLayer[k].needed) }}
                    <span class="text-faint">({{ pct(row.byLayer[k]) }}%)</span>
                  </div>
                  <div class="mt-1 h-1.5 w-full bg-surface rounded-full overflow-hidden">
                    <div class="h-full rounded-full" :class="barClass(pct(row.byLayer[k]))" :style="{ width: pct(row.byLayer[k]) + '%' }"></div>
                  </div>
                </template>
                <template v-else><span class="text-faint">—</span></template>
              </td>
              <td class="px-3 py-2 whitespace-nowrap min-w-[7rem]">
                <div class="font-semibold" :class="textClass(pct(row.overall))">{{ pct(row.overall) }}%</div>
                <div class="text-faint">{{ n(row.overall?.covered) }} / {{ n(row.overall?.needed) }}</div>
                <div class="mt-1 h-1.5 w-full bg-surface rounded-full overflow-hidden">
                  <div class="h-full rounded-full" :class="barClass(pct(row.overall))" :style="{ width: pct(row.overall) + '%' }"></div>
                </div>
              </td>
              <td class="px-3 py-2 text-muted whitespace-nowrap">
                <span class="text-blue-400">{{ n(row.borrowable) }}</span>
                <div class="text-faint">from other courses</div>
              </td>
              <td class="px-3 py-2 text-muted whitespace-nowrap">
                <span class="text-teal-400">{{ n(row.viaTargetRoles) }}</span>
                <div class="text-faint">role-agnostic</div>
              </td>
              <td class="px-3 py-2 text-muted">
                <template v-if="row.topSourceCourses?.length">
                  <div v-for="s in row.topSourceCourses" :key="s.courseCode" class="whitespace-nowrap">
                    {{ getCourseName(s.courseCode) }} <span class="text-faint">{{ n(s.clips) }}</span>
                  </div>
                </template>
                <template v-else><span class="text-faint">—</span></template>
              </td>
            </tr>
            <tr v-if="!rows.length">
              <td :colspan="layerKeys.length + 6" class="px-3 py-4 text-center text-faint">
                No candidate voices were measured for this course.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- What the course is configured for today -->
      <div v-if="coverage.currentVoices" class="text-xs text-muted flex flex-wrap gap-x-4 gap-y-1">
        <span class="text-faint uppercase tracking-wide">Configured today</span>
        <span v-for="(v, role) in coverage.currentVoices" :key="role">
          {{ role }}: <code class="text-teal-400 bg-surface px-1.5 py-0.5 rounded">{{ v || '—' }}</code>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { getApiUrl } from '@/services/api'
import { useCourses } from '@/composables/useCourses'

const props = defineProps<{
  courseCode: string
  rounds: number
}>()

const { getCourseName, getLanguageName } = useCourses()
const apiBaseUrl = getApiUrl()
const HEADERS = { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }

const measuring = ref(false)
const coverage = ref<any>(null)
const error = ref<string | null>(null)
const errorTitle = ref('Measurement failed')

const n = (v: any) => Number(v || 0).toLocaleString()

const formatTime = (iso: string) => {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

// Trust the reported percentage, but derive it when the service omits it so a
// missing field never reads as zero coverage.
const pct = (cell: any) => {
  if (!cell) return 0
  if (typeof cell.pct === 'number') return Math.round(cell.pct)
  const needed = Number(cell.needed || 0)
  if (!needed) return 0
  return Math.round((Number(cell.covered || 0) / needed) * 100)
}

const LAYER_ORDER = ['known', 'presentation', 'target1', 'target2']

const LAYER_LABELS: Record<string, string> = {
  known: 'Known side',
  presentation: 'Presentation',
  target1: 'Target 1',
  target2: 'Target 2'
}

const layerLabel = (k: string) => LAYER_LABELS[k] || k

// Layers come from the service; keep the familiar order and append anything new
// it starts reporting rather than dropping it.
const layerKeys = computed<string[]>(() => {
  const keys = Object.keys(coverage.value?.layers || {})
  const known = LAYER_ORDER.filter(k => keys.includes(k))
  return [...known, ...keys.filter(k => !LAYER_ORDER.includes(k))]
})

const rows = computed<any[]>(() => coverage.value?.coverage || [])

const excludedCount = computed(() => Number(coverage.value?.languageFilter?.excludedTexts || 0))
const excludedExamples = computed<any[]>(() => coverage.value?.languageFilter?.excludedExamples || [])

const barClass = (p: number) =>
  p >= 90 ? 'bg-emerald-500' : p >= 50 ? 'bg-teal-500' : p > 0 ? 'bg-amber-500' : 'bg-line'

const textClass = (p: number) =>
  p >= 90 ? 'text-emerald-400' : p >= 50 ? 'text-teal-400' : p > 0 ? 'text-amber-400' : 'text-faint'

const loadCoverage = async () => {
  measuring.value = true
  error.value = null
  try {
    const response = await fetch(
      `${apiBaseUrl}/api/audio/reuse-coverage/${props.courseCode}?rounds=${props.rounds}`,
      { headers: HEADERS }
    )
    const data = await response.json().catch(() => null)
    if (response.status === 404) {
      errorTitle.value = 'Voice coverage is not available yet'
      error.value = 'The audio service on this machine does not expose a coverage measurement. Nothing was changed and nothing was measured. Try again once the phase-8 service has been updated and restarted.'
      return
    }
    if (!response.ok || !data?.ok) {
      errorTitle.value = 'Measurement failed'
      error.value = data?.error || `Request failed with status ${response.status}`
      return
    }
    coverage.value = data
  } catch (err: any) {
    errorTitle.value = 'Could not reach the audio service'
    error.value = err?.message || 'Unknown error'
  } finally {
    measuring.value = false
  }
}
</script>
