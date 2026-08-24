<template>
  <div class="audio-repair bg-surface border border-line rounded-lg overflow-hidden">
    <!-- Header -->
    <button
      @click="expanded = !expanded"
      class="w-full px-6 py-4 flex items-center justify-between hover:bg-surface-2/30 transition-colors"
    >
      <div class="flex items-center gap-3">
        <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"></path>
        </svg>
        <span class="text-lg font-semibold text-ink">Audio Repair</span>
        <span v-if="queue.length > 0" class="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded">
          {{ queue.length }} flagged
        </span>
        <span v-else-if="loadedOnce && !loading" class="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded">
          Nothing flagged
        </span>
      </div>
      <svg
        class="w-5 h-5 text-muted transition-transform"
        :class="{ 'rotate-180': expanded }"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
      </svg>
    </button>

    <!-- Content -->
    <div v-show="expanded" class="border-t border-line p-6">
      <!-- The governing rule, stated where the human acts on it. -->
      <div class="flex items-start gap-2 bg-blue-900/20 border border-blue-500/30 rounded-lg px-4 py-3 mb-5">
        <svg class="w-4 h-4 mt-0.5 shrink-0 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <div class="text-sm text-blue-300">
          Machines may flag audio — only humans may pass it.
          <span class="text-faint">Nothing below changes the course until you listen and press Accept.</span>
        </div>
      </div>

      <!--
        The machine step that fills a reviewer's ears queue: a per-course tail
        scan. It lives here rather than in a panel of its own because its output
        IS this panel's input — "Open in repair" drops a flagged clip straight
        into the preview/accept workspace below, which is the only place audio
        may be passed.
      -->
      <div class="mb-5">
        <AudioTailScanSection :course-code="courseCode" @select-clip="selectFromScan" />
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"></div>
        <p class="mt-3 text-muted">Loading repair queue...</p>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="text-red-400 text-center py-4">
        {{ error }}
      </div>

      <div v-else class="space-y-5">
        <!-- Detector provenance — precision always visible next to the opinion. -->
        <div v-if="detector" class="flex items-center justify-between bg-surface-2 border border-line rounded-lg px-4 py-2">
          <span class="text-sm text-muted">
            Detector <span class="text-ink font-medium">{{ detector.name }}</span>
            <span class="text-faint"> — flags candidates, decides nothing</span>
          </span>
          <span class="text-sm" :class="precisionClass(detector.precision)">
            precision {{ formatPrecision(detector.precision) }}
          </span>
        </div>

        <!-- Empty -->
        <div v-if="queue.length === 0" class="py-8 text-center text-faint">
          No clips flagged for repair in {{ getCourseName(courseCode) }}.
        </div>

        <!-- Queue -->
        <div v-else class="max-h-96 overflow-y-auto border border-line rounded-lg">
          <table class="w-full text-sm">
            <thead class="sticky top-0 bg-surface">
              <tr class="text-left text-muted border-b border-line">
                <th class="py-2 px-3">Location</th>
                <th class="py-2 px-3">Text</th>
                <th class="py-2 px-3">Role</th>
                <th class="py-2 px-3">Voice</th>
                <th class="py-2 px-3 text-right">Duration</th>
                <th class="py-2 px-3">Detector says</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in queue"
                :key="item.audioId"
                @click="selectClip(item)"
                class="border-b border-line/50 hover:bg-surface-2/30 cursor-pointer"
                :class="{ 'bg-surface-2/50': selectedId === item.audioId }"
              >
                <td class="py-2 px-3 text-faint font-mono text-xs">{{ item.legoId || item.seedNumber || '-' }}</td>
                <td class="py-2 px-3 text-ink">{{ item.text }}</td>
                <td class="py-2 px-3 text-muted text-xs">{{ item.role }}</td>
                <td class="py-2 px-3 text-faint text-xs font-mono">{{ item.voiceId }}</td>
                <td class="py-2 px-3 text-muted text-xs text-right tabular-nums">{{ formatMs(item.durationMs) }}</td>
                <td class="py-2 px-3 text-xs">
                  <span :class="item.detector?.flagged ? 'text-amber-400' : 'text-faint'">
                    {{ item.detector?.reason || '—' }}
                  </span>
                  <span v-if="item.detector?.score != null" class="text-faint"> ({{ formatScore(item.detector.score) }})</span>
                  <span class="text-faint"> · {{ formatPrecision(detector?.precision) }} precise</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- ================= Preview / repair workspace ================= -->
        <div v-if="selectedId" class="border border-line rounded-lg p-4 space-y-4">
          <div v-if="previewLoading" class="text-center py-6">
            <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500 mx-auto"></div>
            <p class="mt-2 text-sm text-muted">Loading clip...</p>
          </div>
          <div v-else-if="previewError" class="text-red-400 text-sm py-2">{{ previewError }}</div>

          <template v-else-if="preview">
            <!-- Clip identity -->
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-ink font-medium">"{{ preview.current?.text }}"</p>
                <p class="text-xs text-faint mt-1">
                  {{ preview.current?.role }} · voice {{ preview.current?.voiceId }} · revision {{ preview.current?.revision }}
                </p>
              </div>
              <button @click="clearSelection" class="text-xs text-muted hover:text-ink transition-colors">Close</button>
            </div>

            <!-- Detector verdict for this clip, with precision -->
            <div v-if="preview.detector" class="text-xs bg-surface-2 border border-line rounded px-3 py-2">
              <span :class="preview.detector.flagged ? 'text-amber-400' : 'text-faint'">
                {{ preview.detector.name }}: {{ preview.detector.reason || (preview.detector.flagged ? 'flagged' : 'not flagged') }}
              </span>
              <span class="text-faint"> — this detector is right {{ formatPrecision(preview.detector.precision) }} of the time. Trust your ears, not it.</span>
            </div>

            <!-- CURRENT vs CANDIDATE -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <!-- Current -->
              <div class="bg-surface-2 border border-line rounded-lg p-4 space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-medium text-muted uppercase tracking-wide">Current</span>
                  <span class="text-xs text-faint tabular-nums">{{ formatMs(preview.current?.durationMs) }}</span>
                </div>
                <button
                  @click="togglePlay('current', preview.current?.url)"
                  :disabled="!preview.current?.url"
                  class="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors text-sm"
                >
                  <svg v-if="playingKey !== 'current'" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  <svg v-else class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                  {{ playingKey === 'current' ? 'Pause' : 'Play current' }}
                </button>
                <p class="text-xs text-faint">This is what learners hear right now.</p>
              </div>

              <!-- Candidate -->
              <div
                class="border rounded-lg p-4 space-y-2"
                :class="activeCandidate ? 'bg-surface-2 border-blue-500/30' : 'bg-surface-2 border-line'"
              >
                <div class="flex items-center justify-between">
                  <span class="text-xs font-medium text-blue-400 uppercase tracking-wide">Candidate</span>
                  <span v-if="activeCandidate" class="text-xs text-faint tabular-nums">
                    {{ formatMs(activeCandidate.durationMs) }}
                    <span :class="deltaClass">({{ formatDelta }})</span>
                  </span>
                </div>

                <template v-if="activeCandidate">
                  <button
                    @click="togglePlay('candidate', activeCandidate.url)"
                    :disabled="!activeCandidate.url"
                    class="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors text-sm"
                  >
                    <svg v-if="playingKey !== 'candidate'" class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    <svg v-else class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    {{ playingKey === 'candidate' ? 'Pause' : 'Play candidate' }}
                  </button>

                  <!-- Veracity -->
                  <div class="text-xs">
                    <span :class="activeCandidate.veracity?.pass ? 'text-emerald-400' : 'text-red-400'">
                      Veracity: {{ activeCandidate.veracity?.pass ? 'pass' : 'fail' }}
                    </span>
                    <span v-if="activeCandidate.veracity?.reason" class="text-faint"> — {{ activeCandidate.veracity.reason }}</span>
                    <span v-if="activeCandidate.veracity?.cer != null" class="text-faint"> · CER {{ formatScore(activeCandidate.veracity.cer) }}</span>
                  </div>
                  <div v-if="finalWordRetention != null" class="text-xs text-muted">
                    Final-word retention: <span class="tabular-nums">{{ formatPrecision(finalWordRetention) }}</span>
                  </div>
                  <p class="text-xs text-faint">Source: {{ activeCandidate.source || 'unknown' }}</p>
                </template>
                <p v-else class="text-xs text-faint py-2">
                  No candidate yet. Re-render or upload one below, then listen to both.
                </p>
              </div>
            </div>

            <!-- ---- Propose a candidate ---- -->
            <div class="bg-surface-2 border border-line rounded-lg p-4 space-y-3">
              <p class="text-sm text-muted">Propose a replacement</p>

              <!-- Re-render (COSTS MONEY) - two-step, never a hair trigger -->
              <div v-if="!confirmingRerender" class="flex flex-wrap items-center gap-3">
                <button
                  @click="confirmingRerender = true"
                  :disabled="proposing"
                  class="px-3 py-1.5 text-xs font-medium rounded bg-amber-600 text-white hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Re-render with TTS...
                </button>
                <label class="px-3 py-1.5 text-xs font-medium rounded bg-surface border border-line text-muted hover:text-ink transition-colors cursor-pointer">
                  Upload a file
                  <input type="file" accept="audio/*" class="hidden" @change="onUpload" :disabled="proposing" />
                </label>
                <span v-if="proposing" class="text-xs text-muted">Rendering and verifying...</span>
              </div>

              <!-- Re-render confirmation -->
              <div v-else class="bg-amber-900/20 border border-amber-500/30 rounded-lg px-4 py-3 space-y-2">
                <p class="text-sm text-amber-300">
                  Re-rendering calls TTS and <strong>costs money</strong>.
                </p>
                <p class="text-xs text-faint">
                  One clip, voice {{ preview.current?.voiceId }}, text "{{ preview.current?.text }}". Nothing is replaced —
                  it produces a candidate you must still listen to and accept.
                </p>
                <div class="flex items-center gap-3 pt-1">
                  <button
                    @click="proposeRerender"
                    :disabled="proposing"
                    class="px-3 py-1.5 text-xs font-medium rounded bg-amber-600 text-white hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {{ proposing ? 'Rendering...' : 'Yes — spend money, re-render' }}
                  </button>
                  <button
                    @click="confirmingRerender = false"
                    :disabled="proposing"
                    class="text-xs text-muted hover:text-ink transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              <p v-if="proposeError" class="text-xs text-red-400">
                {{ proposeError }} <span class="text-faint">— nothing was changed.</span>
              </p>
            </div>

            <!-- ---- Accept / Reject ---- -->
            <div v-if="activeCandidate && activeCandidate.status !== 'accepted'" class="flex flex-wrap items-center gap-3">
              <template v-if="!confirmingAccept">
                <button
                  @click="confirmingAccept = true"
                  :disabled="deciding"
                  class="px-4 py-2 text-sm font-medium rounded bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Accept candidate...
                </button>
                <button
                  @click="reject"
                  :disabled="deciding"
                  class="px-4 py-2 text-sm font-medium rounded bg-surface border border-line text-muted hover:text-ink disabled:opacity-50 transition-colors"
                >
                  Reject
                </button>
              </template>
              <div v-else class="w-full bg-emerald-900/20 border border-emerald-500/30 rounded-lg px-4 py-3 space-y-2">
                <p class="text-sm text-emerald-300">
                  Have you listened to both? Accepting replaces what learners hear.
                </p>
                <p class="text-xs text-faint">
                  The old clip is superseded, not lost — the audio id stays the same and its revision bumps.
                </p>
                <input
                  v-model="decisionReason"
                  placeholder="Why you passed it (optional)"
                  class="w-full bg-surface border border-line rounded px-3 py-1.5 text-xs text-ink placeholder:text-faint"
                />
                <div class="flex items-center gap-3 pt-1">
                  <button
                    @click="accept"
                    :disabled="deciding"
                    class="px-3 py-1.5 text-xs font-medium rounded bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {{ deciding ? 'Accepting...' : 'Yes — I have listened, accept it' }}
                  </button>
                  <button
                    @click="confirmingAccept = false"
                    :disabled="deciding"
                    class="text-xs text-muted hover:text-ink transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>

            <p v-if="decisionError" class="text-xs text-red-400">{{ decisionError }}</p>
            <p v-if="acceptResult" class="text-sm text-emerald-400">
              Accepted — {{ acceptResult.audioId }} is now revision {{ acceptResult.revision }}.
              <span class="text-faint">Previous clip kept as {{ acceptResult.supersededS3Key }}.</span>
            </p>

            <!-- Candidate history -->
            <div v-if="otherCandidates.length" class="text-xs text-faint space-y-1">
              <p class="text-muted">Earlier candidates</p>
              <div v-for="c in otherCandidates" :key="c.candidateId" class="flex items-center gap-2">
                <span :class="statusClass(c.status)">{{ c.status }}</span>
                <span>{{ c.source }}</span>
                <span class="tabular-nums">{{ formatMs(c.durationMs) }}</span>
                <button @click="activeCandidateId = c.candidateId" class="text-muted hover:text-ink transition-colors">view</button>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Single player element; keyed on id+revision so an accept can never replay stale bytes. -->
    <audio
      ref="audioEl"
      :key="playerKey"
      :src="playingUrl || undefined"
      @ended="playingKey = null"
      class="hidden"
    ></audio>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { getApiUrl } from '@/services/api'
import { useCourses } from '@/composables/useCourses'
import AudioTailScanSection from './AudioTailScanSection.vue'

function getApiBaseUrl() {
  return getApiUrl()
}

const props = defineProps({
  courseCode: {
    type: String,
    required: true
  },
  refreshTrigger: {
    type: Number,
    default: 0
  }
})

const { getCourseName } = useCourses()

const emit = defineEmits(['accepted'])

const expanded = ref(false)
const loading = ref(false)
const loadedOnce = ref(false)
const error = ref(null)

const detector = ref(null)
const queue = ref([])

const selectedId = ref(null)
const preview = ref(null)
const previewLoading = ref(false)
const previewError = ref(null)

const activeCandidateId = ref(null)
const proposing = ref(false)
const proposeError = ref(null)
const confirmingRerender = ref(false)

const deciding = ref(false)
const decisionError = ref(null)
const decisionReason = ref('')
const confirmingAccept = ref(false)
const acceptResult = ref(null)

const audioEl = ref(null)
const playingKey = ref(null)
const playingUrl = ref(null)

const HEADERS = { 'ngrok-skip-browser-warning': 'true' }

// Cache key for the player: id + revision, so accepting a candidate forces a
// fresh element rather than replaying the superseded bytes from the HTTP cache.
const playerKey = computed(
  () => `${selectedId.value || 'none'}:${preview.value?.current?.revision ?? 0}:${playingKey.value || 'idle'}`
)

const candidates = computed(() => preview.value?.candidates || [])
const activeCandidate = computed(() => {
  if (!candidates.value.length) return null
  return candidates.value.find(c => c.candidateId === activeCandidateId.value) || null
})
const otherCandidates = computed(() =>
  candidates.value.filter(c => c.candidateId !== activeCandidateId.value)
)

// The service may report retention either at the top of veracity or beside it;
// read both rather than inventing a field.
const finalWordRetention = computed(() => {
  const c = activeCandidate.value
  if (!c) return null
  return c.finalWordRetention ?? c.veracity?.finalWordRetention ?? null
})

const durationDelta = computed(() => {
  const cur = preview.value?.current?.durationMs
  const cand = activeCandidate.value?.durationMs
  if (cur == null || cand == null) return null
  return cand - cur
})
const formatDelta = computed(() => {
  const d = durationDelta.value
  if (d == null) return ''
  return `${d >= 0 ? '+' : ''}${(d / 1000).toFixed(2)}s`
})
const deltaClass = computed(() => {
  const d = durationDelta.value
  if (d == null) return 'text-faint'
  return d < 0 ? 'text-amber-400' : 'text-emerald-400'
})

function formatMs(ms) {
  if (ms == null) return '—'
  return `${(ms / 1000).toFixed(2)}s`
}
function formatScore(n) {
  if (n == null) return '—'
  return Number(n).toFixed(2)
}
// Precision arrives as a 0-1 fraction or an explicit percentage; show a percentage
// either way, and say plainly when the detector has never been measured.
function formatPrecision(p) {
  if (p == null) return 'precision unknown'
  const pct = p <= 1 ? p * 100 : p
  return `${pct.toFixed(0)}%`
}
function precisionClass(p) {
  if (p == null) return 'text-faint'
  const pct = p <= 1 ? p * 100 : p
  if (pct < 50) return 'text-red-400'
  if (pct < 80) return 'text-amber-400'
  return 'text-emerald-400'
}
function statusClass(status) {
  if (status === 'accepted') return 'text-emerald-400'
  if (status === 'rejected') return 'text-red-400'
  return 'text-amber-400'
}

function stopPlayback() {
  if (audioEl.value) audioEl.value.pause()
  playingKey.value = null
  playingUrl.value = null
}

function togglePlay(key, url) {
  if (!url) return
  if (playingKey.value === key) {
    audioEl.value?.pause()
    playingKey.value = null
    return
  }
  audioEl.value?.pause()
  playingUrl.value = url
  playingKey.value = key
  // Wait for the src binding to land before playing.
  requestAnimationFrame(() => {
    audioEl.value?.play().catch(err => {
      console.warn('Playback failed:', err)
      playingKey.value = null
    })
  })
}

async function fetchQueue() {
  if (!props.courseCode) return
  loading.value = true
  error.value = null
  try {
    const baseUrl = getApiBaseUrl()
    const response = await fetch(
      `${baseUrl}/api/audio/repair/${props.courseCode}/queue?limit=50`,
      { headers: HEADERS }
    )
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const result = await response.json()
    detector.value = result.detector || null
    queue.value = result.items || []
    loadedOnce.value = true
  } catch (err) {
    console.error('Failed to fetch repair queue:', err)
    error.value = `Failed to load repair queue: ${err.message}`
  } finally {
    loading.value = false
  }
}

async function fetchPreview() {
  if (!selectedId.value) return
  previewLoading.value = true
  previewError.value = null
  try {
    const baseUrl = getApiBaseUrl()
    const response = await fetch(
      `${baseUrl}/api/audio/repair/${props.courseCode}/${selectedId.value}/preview`,
      { headers: HEADERS }
    )
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    preview.value = await response.json()
    // Default to the newest pending candidate, else the newest of any status.
    const list = preview.value?.candidates || []
    const pending = list.filter(c => c.status === 'pending')
    activeCandidateId.value = (pending[pending.length - 1] || list[list.length - 1])?.candidateId || null
  } catch (err) {
    console.error('Failed to fetch preview:', err)
    previewError.value = `Failed to load clip: ${err.message}`
  } finally {
    previewLoading.value = false
  }
}

function selectClip(item) {
  if (selectedId.value === item.audioId) return
  stopPlayback()
  selectedId.value = item.audioId
  preview.value = null
  activeCandidateId.value = null
  resetActionState()
  fetchPreview()
}

/**
 * A clip picked out of the scan report. The scan's row is not in `queue` — the
 * queue is its own read — so the clip is selected directly rather than looked
 * up, which is also what stops a scan result implying it has been triaged.
 */
function selectFromScan(item) {
  selectClip(item)
}

function clearSelection() {
  stopPlayback()
  selectedId.value = null
  preview.value = null
  activeCandidateId.value = null
  resetActionState()
}

function resetActionState() {
  proposeError.value = null
  confirmingRerender.value = false
  confirmingAccept.value = false
  decisionError.value = null
  decisionReason.value = ''
  acceptResult.value = null
}

async function propose(body) {
  if (!selectedId.value || proposing.value) return
  proposing.value = true
  proposeError.value = null
  try {
    const baseUrl = getApiBaseUrl()
    const response = await fetch(
      `${baseUrl}/api/audio/repair/${props.courseCode}/${selectedId.value}/propose`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...HEADERS },
        body: JSON.stringify(body)
      }
    )
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      // A rejected candidate mutates nothing — say so rather than implying damage.
      throw new Error(result.error || `HTTP ${response.status}`)
    }
    confirmingRerender.value = false
    stopPlayback()
    await fetchPreview()
    if (result.candidateId) activeCandidateId.value = result.candidateId
  } catch (err) {
    console.error('Propose failed:', err)
    proposeError.value = `Candidate rejected: ${err.message}`
  } finally {
    proposing.value = false
  }
}

function proposeRerender() {
  propose({
    source: 'tts',
    text: preview.value?.current?.text,
    voiceId: preview.value?.current?.voiceId
  })
}

async function onUpload(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  const audioBase64 = await fileToBase64(file)
  await propose({ source: 'upload', audioBase64, filename: file.name })
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result || '')
      resolve(result.includes(',') ? result.split(',')[1] : result)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function decide(action, body) {
  if (!selectedId.value || !activeCandidateId.value || deciding.value) return null
  deciding.value = true
  decisionError.value = null
  try {
    const baseUrl = getApiBaseUrl()
    const response = await fetch(
      `${baseUrl}/api/audio/repair/${props.courseCode}/${selectedId.value}/${action}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...HEADERS },
        body: JSON.stringify({ candidateId: activeCandidateId.value, ...body })
      }
    )
    const result = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(result.error || `HTTP ${response.status}`)
    return result
  } catch (err) {
    console.error(`${action} failed:`, err)
    decisionError.value = `${action === 'accept' ? 'Accept' : 'Reject'} failed: ${err.message}`
    return null
  } finally {
    deciding.value = false
  }
}

async function accept() {
  const reason = decisionReason.value.trim() || undefined
  const result = await decide('accept', reason ? { reason } : {})
  if (!result) return
  acceptResult.value = result
  confirmingAccept.value = false
  stopPlayback()
  await fetchPreview()
  await fetchQueue()
  emit('accepted', result)
}

async function reject() {
  const reason = decisionReason.value.trim() || undefined
  const result = await decide('reject', reason ? { reason } : {})
  if (!result) return
  stopPlayback()
  await fetchPreview()
}

watch(expanded, (isExpanded) => {
  if (isExpanded && !loadedOnce.value) fetchQueue()
})

watch(() => props.refreshTrigger, () => {
  if (!expanded.value) return
  clearSelection()
  fetchQueue()
})

watch(() => props.courseCode, () => {
  loadedOnce.value = false
  queue.value = []
  clearSelection()
  if (expanded.value) fetchQueue()
})
</script>

<style scoped>
/*
 * LIGHT-MODE colour fixes ONLY — mirrors the block in MissingAudio.vue.
 * The template uses dark-tuned Tailwind literals; everything below is scoped
 * under [data-theme="light"] so DARK MODE IS UNTOUCHED. Same hue families,
 * darkened to meet WCAG AA on the light surfaces.
 */

/* --- Status / accent TEXT --- */
:root[data-theme="light"] .audio-repair :deep(.text-amber-400) { color: #b45309; }   /* amber-700 */
:root[data-theme="light"] .audio-repair :deep(.text-amber-300) { color: #92400e; }   /* amber-800 */
:root[data-theme="light"] .audio-repair :deep(.text-emerald-400) { color: #047857; } /* emerald-700 */
:root[data-theme="light"] .audio-repair :deep(.text-emerald-300) { color: #065f46; } /* emerald-800 */
:root[data-theme="light"] .audio-repair :deep(.text-blue-400) { color: #1d4ed8; }    /* blue-700 */
:root[data-theme="light"] .audio-repair :deep(.text-blue-300) { color: #1e40af; }    /* blue-800 */
:root[data-theme="light"] .audio-repair :deep(.text-red-400) { color: #b91c1c; }     /* red-700 */

/* --- Header pills --- */
:root[data-theme="light"] .audio-repair :deep(.bg-amber-500\/20) { background-color: #fef3c7; }   /* amber-100 */
:root[data-theme="light"] .audio-repair :deep(.bg-emerald-500\/20) { background-color: #d1fae5; } /* emerald-100 */

/* --- Callout / confirmation panels --- */
:root[data-theme="light"] .audio-repair :deep(.bg-blue-900\/20) { background-color: #dbeafe; }    /* blue-100 */
:root[data-theme="light"] .audio-repair :deep(.border-blue-500\/30) { border-color: #60a5fa; }
:root[data-theme="light"] .audio-repair :deep(.bg-amber-900\/20) { background-color: #fef3c7; }   /* amber-100 */
:root[data-theme="light"] .audio-repair :deep(.border-amber-500\/30) { border-color: #fbbf24; }
:root[data-theme="light"] .audio-repair :deep(.bg-emerald-900\/20) { background-color: #d1fae5; } /* emerald-100 */
:root[data-theme="light"] .audio-repair :deep(.border-emerald-500\/30) { border-color: #34d399; }
</style>
