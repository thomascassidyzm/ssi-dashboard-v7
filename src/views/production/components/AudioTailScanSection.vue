<template>
  <div class="tail-scan border border-line rounded-lg overflow-hidden">
    <div class="px-4 py-3 bg-surface-2 border-b border-line flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <span class="text-sm font-semibold text-ink">Tail-truncation scan</span>
        <span v-if="job?.status === 'running'" class="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded">
          scanning…
        </span>
        <span v-else-if="totals" class="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded">
          {{ totals.flaggedByTail }} trimmed · {{ totals.flaggedByDuration }} short
        </span>
      </div>
      <span class="text-xs text-faint font-mono">{{ detector?.name || 'edge-shape' }} {{ detector?.version || '' }}</span>
    </div>

    <div class="p-4 space-y-4">
      <!--
        The sentence that has to travel with every flag count, in the place a
        reviewer cannot page past. A flag is a TRIM, not a verdict.
      -->
      <div class="bg-amber-900/20 border border-amber-500/30 rounded-lg px-4 py-3 text-sm space-y-1">
        <p class="text-amber-300 font-medium">A flag means the clip was TRIMMED. It does not mean the clip is unusable.</p>
        <p class="text-xs text-faint">
          On the 20 clips a human has listened to, 16 were audibly damaged and 4 were trimmed harmlessly —
          read a flag as “this was cut, and 4 times in 5 that was audible”. The scan never passes, repairs or
          deletes audio: it reads bytes, measures, and puts clips in front of your ears.
        </p>
        <p class="text-xs text-faint">
          Calibrated on deu_for_eng seeds 1–5, three voices, one provider. Read the per-voice flag rate below
          before trusting a number for a voice nobody has measured — a voice that lights up wholesale is a
          calibration finding, not a course full of damage.
        </p>
      </div>

      <!-- ── Controls ────────────────────────────────────────────────────── -->
      <div class="bg-surface-2 border border-line rounded-lg p-4 space-y-3">
        <div class="flex flex-wrap items-end gap-3">
          <label class="text-xs text-muted">
            Seeds 1 to
            <input
              v-model="maxSeed"
              type="number"
              min="1"
              placeholder="whole course"
              class="ml-2 w-32 bg-surface border border-line rounded px-2 py-1 text-xs text-ink placeholder:text-faint"
            />
          </label>
          <label class="text-xs text-muted">
            Role
            <select v-model="role" class="ml-2 bg-surface border border-line rounded px-2 py-1 text-xs text-ink">
              <option :value="null">all</option>
              <option v-for="r in ROLES" :key="r" :value="r">{{ r }}</option>
            </select>
          </label>
          <label class="text-xs text-muted">
            Concurrency
            <input
              v-model.number="concurrency"
              type="number"
              min="1"
              max="16"
              class="ml-2 w-20 bg-surface border border-line rounded px-2 py-1 text-xs text-ink"
            />
          </label>

          <button
            v-if="!confirmingFullCourse"
            @click="startScan()"
            :disabled="running"
            class="px-3 py-1.5 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {{ running ? 'Scanning…' : 'Run scan' }}
          </button>
        </div>

        <!-- A whole-course scan is hours of decoding. Say so before it starts. -->
        <div v-if="confirmingFullCourse" class="bg-blue-900/20 border border-blue-500/30 rounded-lg px-4 py-3 space-y-2">
          <p class="text-sm text-blue-300">Scan the WHOLE course?</p>
          <p class="text-xs text-faint">
            That is one download and one decode per clip — tens of thousands of clips, minutes to hours.
            It spends no money and writes nothing, but it works this box hard. Set a seed limit to scope it.
          </p>
          <div class="flex items-center gap-3 pt-1">
            <button
              @click="startScan(true)"
              :disabled="running"
              class="px-3 py-1.5 text-xs font-medium rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
            >
              Yes — scan the whole course
            </button>
            <button @click="confirmingFullCourse = false" class="text-xs text-muted hover:text-ink transition-colors">
              Cancel
            </button>
          </div>
        </div>

        <p class="text-xs text-faint">
          A scan is a read: it costs bandwidth and CPU, no TTS and no writes. Its progress lives in the API
          process — if the API restarts mid-scan the job is lost, nothing is half-written, and you re-run it.
        </p>
        <p v-if="error" class="text-xs text-red-400">{{ error }}</p>
      </div>

      <!-- ── Progress ────────────────────────────────────────────────────── -->
      <div v-if="job && job.status === 'running'" class="bg-surface-2 border border-line rounded-lg p-4 space-y-2">
        <div class="flex items-center gap-3">
          <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          <span class="text-sm text-muted">
            {{ job.progress?.phase === 'reading' ? 'Reading the clip list…' : 'Measuring clips…' }}
            <span v-if="job.progress?.total" class="tabular-nums">
              {{ job.progress.done }} / {{ job.progress.total }}
            </span>
          </span>
        </div>
        <div v-if="job.progress?.total" class="h-1.5 bg-surface rounded overflow-hidden">
          <div class="h-full bg-blue-500 transition-all" :style="{ width: progressPct + '%' }"></div>
        </div>
        <p class="text-xs text-faint">
          Progress is reported every 250 clips, so a small scan can finish before the bar moves at all.
        </p>
      </div>

      <div v-if="job && job.status === 'failed'" class="text-sm text-red-400">
        Scan failed: {{ job.error }} <span class="text-faint">— nothing was written.</span>
      </div>

      <!-- ── Results ─────────────────────────────────────────────────────── -->
      <template v-if="totals && job?.status === 'done'">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <!-- The two detectors are never merged into one number. -->
          <div class="bg-surface-2 border border-amber-500/30 rounded-lg px-3 py-2">
            <p class="text-lg font-semibold text-amber-400 tabular-nums">{{ totals.flaggedByTail }}</p>
            <p class="text-xs text-muted">trimmed (edge shape)</p>
          </div>
          <div class="bg-surface-2 border border-violet-500/30 rounded-lg px-3 py-2">
            <p class="text-lg font-semibold text-violet-400 tabular-nums">{{ totals.flaggedByDuration }}</p>
            <p class="text-xs text-muted">short for its text (duration)</p>
          </div>
          <div class="bg-surface-2 border border-line rounded-lg px-3 py-2">
            <p class="text-lg font-semibold text-ink tabular-nums">{{ totals.measured }}</p>
            <p class="text-xs text-muted">clips measured</p>
          </div>
          <div class="bg-surface-2 border border-line rounded-lg px-3 py-2">
            <p class="text-lg font-semibold text-ink tabular-nums">{{ totals.measureFailures }}</p>
            <p class="text-xs text-muted">could not be measured</p>
          </div>
        </div>

        <p class="text-xs text-faint">
          Two different questions, never added together: the edge-shape detector says a clip was CUT, the
          duration detector says a clip is SHORTER than its text implies.
          <span v-if="totals.excludedUnrendered">
            {{ totals.excludedUnrendered }} slot(s) have no audio at all and are the missing-audio backlog, not damage.
          </span>
          <span v-if="totals.truncated" class="text-amber-400">
            The report holds {{ totals.reported }} of {{ totals.flagged }} flagged clips — {{ totals.truncated }} more
            were flagged and are not listed. Narrow the scope to see them.
          </span>
        </p>

        <!-- Per-voice flag rate: the calibration read-out, first-class. -->
        <div v-if="voiceRows.length" class="border border-line rounded-lg overflow-hidden">
          <div class="px-3 py-2 bg-surface-2 border-b border-line">
            <p class="text-sm text-ink font-medium">Flag rate per voice — read this first</p>
            <p class="text-xs text-faint">
              A voice whose renders naturally fall steeply lights up wholesale. That is a calibration finding
              about a voice nobody measured, not thousands of damaged clips.
            </p>
          </div>
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-muted border-b border-line">
                <th class="py-2 px-3">Voice</th>
                <th class="py-2 px-3 text-right">Measured</th>
                <th class="py-2 px-3 text-right">Flagged</th>
                <th class="py-2 px-3 text-right">Failed</th>
                <th class="py-2 px-3 text-right">Flag rate</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="v in voiceRows" :key="v.voiceId" class="border-b border-line/50">
                <td class="py-2 px-3 font-mono text-xs text-ink">{{ v.voiceId }}</td>
                <td class="py-2 px-3 text-right tabular-nums text-muted">{{ v.measured }}</td>
                <td class="py-2 px-3 text-right tabular-nums text-muted">{{ v.flagged }}</td>
                <td class="py-2 px-3 text-right tabular-nums text-faint">{{ v.failed }}</td>
                <td class="py-2 px-3 text-right tabular-nums" :class="rateClass(v.flagRate)">
                  {{ v.flagRate == null ? '—' : (v.flagRate * 100).toFixed(1) + '%' }}
                  <span v-if="v.flagRate > OUTLIER_RATE" class="text-xs"> · verify by ear before trusting</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- ── Per-clip report ───────────────────────────────────────────── -->
        <div class="flex flex-wrap items-center gap-2">
          <button
            v-for="c in CATEGORIES"
            :key="c.value"
            @click="setCategory(c.value)"
            class="px-3 py-1 text-xs rounded border transition-colors"
            :class="category === c.value
              ? 'bg-surface-2 border-blue-500/50 text-ink'
              : 'bg-surface border-line text-muted hover:text-ink'"
          >
            {{ c.label }}
          </button>
          <select
            v-model="voiceFilter"
            @change="fetchReport()"
            class="bg-surface border border-line rounded px-2 py-1 text-xs text-ink"
          >
            <option :value="null">all voices</option>
            <option v-for="v in voiceRows" :key="v.voiceId" :value="v.voiceId">{{ v.voiceId }}</option>
          </select>
          <span class="text-xs text-faint">{{ matched }} clip(s)</span>
        </div>

        <!--
          The durable exit. A scan's findings otherwise die with the API process, and a
          finding that evaporates cannot be the machine proof-of-quality step feeding the
          approval gate. Raising is an ANNOTATION: it puts clips in a reviewer's field of
          view and changes no audio — which is why the button says what it does, in full,
          rather than reading as an action on the course.
        -->
        <div class="flex flex-wrap items-center gap-3 p-3 rounded border border-line bg-surface">
          <button
            @click="raiseFlags()"
            :disabled="raising || !totals?.flaggedByTail"
            class="px-3 py-1.5 text-xs rounded border border-amber-500/50 bg-surface-2 text-ink
                   hover:border-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {{ raising ? 'Raising…' : `Raise ${totals?.flaggedByTail || 0} trimmed clip(s) into the approval gate` }}
          </button>
          <span class="text-xs text-faint">
            Records them for a reviewer, attributed to the detector and to you. No audio changes;
            only a human clears a flag. Re-running a scan will not raise the same clip twice.
          </span>
        </div>
        <p v-if="raiseResult" class="text-xs text-emerald-400">{{ raiseResult }}</p>
        <p v-if="raiseError" class="text-xs text-red-400">{{ raiseError }}</p>

        <div v-if="reportError" class="text-sm text-red-400">{{ reportError }}</div>

        <div v-else class="space-y-2 max-h-[32rem] overflow-y-auto">
          <div
            v-for="item in items"
            :key="item.audioId"
            class="border border-line rounded-lg p-3 space-y-2 hover:bg-surface-2/30"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm text-ink">“{{ item.text }}”</p>
                <p class="text-xs text-faint mt-0.5">
                  {{ item.role }} · voice <span class="font-mono">{{ item.voiceId }}</span>
                  · {{ formatMs(item.durationMs) }} · revision {{ item.revision }}
                </p>
              </div>
              <div class="flex flex-col items-end gap-1 shrink-0">
                <span v-if="item.categories?.includes('tail-truncation')" class="px-2 py-0.5 text-xs rounded bg-amber-500/20 text-amber-400">
                  trimmed
                </span>
                <span v-if="item.categories?.includes('duration')" class="px-2 py-0.5 text-xs rounded bg-violet-500/20 text-violet-400">
                  short for its text
                </span>
              </div>
            </div>

            <!-- The detector's own words, and its numbers. -->
            <p v-if="item.tail?.flagged" class="text-xs text-amber-400">
              {{ item.tail.reason }}
              <span class="text-faint">
                — fall {{ item.tail.shape?.fallRate }} dB/ms over {{ item.tail.shape?.fallMs }} ms,
                trailing silence {{ item.tail.shape?.zeroPadPct }}% digital zero
              </span>
            </p>
            <p v-if="item.detector?.flagged" class="text-xs text-violet-400">
              {{ item.detector.reason }}
              <span class="text-faint">— duration ratio {{ item.detector.score }}</span>
            </p>

            <div class="flex flex-wrap items-center gap-3">
              <audio :src="audioUrl(item)" controls preload="none" class="h-8 max-w-full"></audio>
              <button
                @click="$emit('select-clip', item)"
                class="text-xs text-muted hover:text-ink transition-colors underline"
              >
                Open in repair
              </button>
            </div>
          </div>

          <p v-if="!items.length" class="text-sm text-faint py-4 text-center">
            Nothing in this filter.
          </p>
        </div>
      </template>

      <!-- Earlier jobs this API process still holds. -->
      <div v-if="jobs.length > 1" class="text-xs text-faint space-y-1">
        <p class="text-muted">Earlier scans in this API process</p>
        <div v-for="j in jobs" :key="j.jobId" class="flex items-center gap-2">
          <span :class="j.status === 'done' ? 'text-emerald-400' : j.status === 'failed' ? 'text-red-400' : 'text-blue-400'">
            {{ j.status }}
          </span>
          <span>{{ j.scope?.maxSeedNumber ? `seeds 1-${j.scope.maxSeedNumber}` : 'whole course' }}</span>
          <span>{{ j.startedAt }}</span>
          <button @click="openJob(j.jobId)" class="text-muted hover:text-ink transition-colors">view</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted, watch } from 'vue'
import { getApiUrl } from '@/services/api'

const props = defineProps({
  courseCode: { type: String, required: true },
})
defineEmits(['select-clip'])

const ROLES = ['known', 'target1', 'target2', 'presentation']
const CATEGORIES = [
  { value: 'tail-truncation', label: 'Trimmed' },
  { value: 'duration', label: 'Short for its text' },
  { value: 'all', label: 'Everything flagged' },
]
/** Above this, a voice is an outlier worth hand-verifying before believing its count. */
const OUTLIER_RATE = 0.15
const POLL_MS = 2000

const HEADERS = { 'ngrok-skip-browser-warning': 'true' }
const api = () => getApiUrl()

const maxSeed = ref('')
const role = ref(null)
const concurrency = ref(4)
const confirmingFullCourse = ref(false)

const job = ref(null)
const jobs = ref([])
const detector = ref(null)
const error = ref(null)

const category = ref('tail-truncation')
const voiceFilter = ref(null)
const items = ref([])
const matched = ref(0)
const reportError = ref(null)
const raising = ref(false)
const raiseResult = ref(null)
const raiseError = ref(null)

let poll = null

const running = computed(() => job.value?.status === 'running')
const totals = computed(() => job.value?.totals || null)
const progressPct = computed(() => {
  const p = job.value?.progress
  if (!p?.total) return 0
  return Math.min(100, Math.round((p.done / p.total) * 100))
})
const voiceRows = computed(() =>
  Object.entries(job.value?.tailByVoice || {})
    .map(([voiceId, b]) => ({ voiceId, ...b }))
    .sort((a, b) => (b.flagRate ?? 0) - (a.flagRate ?? 0))
)

function rateClass(rate) {
  if (rate == null) return 'text-faint'
  if (rate > OUTLIER_RATE) return 'text-amber-400'
  return 'text-muted'
}
function formatMs(ms) {
  return ms == null ? '—' : `${(ms / 1000).toFixed(2)}s`
}
function audioUrl(item) {
  return `${api()}${item.url}`
}

async function call(path, options = {}) {
  const response = await fetch(`${api()}${path}`, {
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...HEADERS },
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    const err = new Error(body.error || `HTTP ${response.status}`)
    err.code = body.code
    throw err
  }
  return body
}

async function startScan(confirmed = false) {
  const scoped = String(maxSeed.value || '').trim() !== ''
  if (!scoped && !confirmed) {
    confirmingFullCourse.value = true
    return
  }
  confirmingFullCourse.value = false
  error.value = null
  try {
    job.value = await call(`/api/audio/tail-scan/${props.courseCode}`, {
      method: 'POST',
      body: JSON.stringify({
        maxSeedNumber: scoped ? Number(maxSeed.value) : null,
        role: role.value,
        concurrency: concurrency.value,
      }),
    })
    detector.value = job.value.detector
    items.value = []
    startPolling()
  } catch (err) {
    error.value = err.message
  }
}

function startPolling() {
  stopPolling()
  poll = setInterval(refreshJob, POLL_MS)
}
function stopPolling() {
  if (poll) clearInterval(poll)
  poll = null
}

async function refreshJob() {
  if (!job.value?.jobId) return
  try {
    job.value = await call(`/api/audio/tail-scan/jobs/${job.value.jobId}`)
    detector.value = job.value.detector
    if (job.value.status !== 'running') {
      stopPolling()
      await Promise.all([fetchReport(), fetchJobs()])
    }
  } catch (err) {
    stopPolling()
    // A restart loses in-process job state. That is a different thing from a
    // failed scan and the reviewer is told which one happened.
    error.value = err.code === 'unknown_job'
      ? 'This scan is no longer held by the API — it restarted while the scan was running. ' +
        'Nothing was written and nothing is half-done; run it again.'
      : err.message
    job.value = null
  }
}

async function fetchReport() {
  if (!job.value?.jobId || job.value.status !== 'done') return
  reportError.value = null
  try {
    const out = await call(
      `/api/audio/tail-scan/jobs/${job.value.jobId}/report` +
      `?category=${encodeURIComponent(category.value)}` +
      (voiceFilter.value ? `&voiceId=${encodeURIComponent(voiceFilter.value)}` : '') +
      '&limit=200'
    )
    items.value = out.items || []
    matched.value = out.matched ?? items.value.length
  } catch (err) {
    reportError.value = err.message
  }
}

// Raise the detector's findings into audio_clip_flags, via the approval gate.
// The three counts come back separately on purpose and are shown separately: a re-run
// that reported "0 raised" without saying "N already open" would read as a failure.
async function raiseFlags() {
  if (!job.value?.jobId) return
  raising.value = true
  raiseResult.value = null
  raiseError.value = null
  try {
    const out = await call(`/api/audio/tail-scan/jobs/${job.value.jobId}/raise-flags`, { method: 'POST' })
    const parts = [`${out.raised} flag(s) raised for review`]
    if (out.alreadyOpen) parts.push(`${out.alreadyOpen} were already open`)
    if (out.clearedAlready) parts.push(`${out.clearedAlready} had already been cleared by a human and were not reopened`)
    raiseResult.value = parts.join('; ') + '.'
  } catch (err) {
    raiseError.value = err.message
  } finally {
    raising.value = false
  }
}

function setCategory(value) {
  category.value = value
  fetchReport()
}

async function fetchJobs() {
  try {
    const out = await call(`/api/audio/tail-scan/${props.courseCode}/jobs`)
    jobs.value = out.jobs || []
    detector.value = detector.value || out.detector
  } catch {
    jobs.value = []
  }
}

async function openJob(jobId) {
  job.value = { jobId, status: 'running' }
  await refreshJob()
}

// A panel opened after a scan finished elsewhere should show it rather than an
// empty page — the jobs list is the only place that knowledge lives.
async function adopt() {
  await fetchJobs()
  const newest = jobs.value[0]
  if (!newest) return
  job.value = newest
  detector.value = newest.detector || detector.value
  if (newest.status === 'running') startPolling()
  else await fetchReport()
}

watch(() => props.courseCode, () => {
  stopPolling()
  job.value = null
  jobs.value = []
  items.value = []
  error.value = null
  adopt()
}, { immediate: true })

onUnmounted(stopPolling)
</script>

<style scoped>
/*
 * LIGHT-MODE colour fixes ONLY — same approach as AudioRepairPanel.vue. The
 * template uses dark-tuned Tailwind literals; everything below is scoped under
 * [data-theme="light"] so DARK MODE IS UNTOUCHED.
 */
:root[data-theme="light"] .tail-scan :deep(.text-amber-400) { color: #b45309; }
:root[data-theme="light"] .tail-scan :deep(.text-amber-300) { color: #92400e; }
:root[data-theme="light"] .tail-scan :deep(.text-blue-400) { color: #1d4ed8; }
:root[data-theme="light"] .tail-scan :deep(.text-blue-300) { color: #1e40af; }
:root[data-theme="light"] .tail-scan :deep(.text-violet-400) { color: #6d28d9; }
:root[data-theme="light"] .tail-scan :deep(.text-emerald-400) { color: #047857; }
:root[data-theme="light"] .tail-scan :deep(.text-red-400) { color: #b91c1c; }

:root[data-theme="light"] .tail-scan :deep(.bg-amber-500\/20) { background-color: #fef3c7; }
:root[data-theme="light"] .tail-scan :deep(.bg-blue-500\/20) { background-color: #dbeafe; }
:root[data-theme="light"] .tail-scan :deep(.bg-violet-500\/20) { background-color: #ede9fe; }
:root[data-theme="light"] .tail-scan :deep(.bg-amber-900\/20) { background-color: #fef3c7; }
:root[data-theme="light"] .tail-scan :deep(.border-amber-500\/30) { border-color: #fbbf24; }
:root[data-theme="light"] .tail-scan :deep(.bg-blue-900\/20) { background-color: #dbeafe; }
:root[data-theme="light"] .tail-scan :deep(.border-blue-500\/30) { border-color: #60a5fa; }
:root[data-theme="light"] .tail-scan :deep(.border-violet-500\/30) { border-color: #a78bfa; }
</style>
