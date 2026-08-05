<template>
  <div class="audio-preview">
    <!-- Header. The right-hand slot is where a future batch control
         ("approve these 20") lands without disturbing anything else. -->
    <div class="flex items-start justify-between gap-4 mb-4 flex-wrap">
      <div class="flex items-center gap-3 flex-wrap">
        <h2 class="text-lg font-semibold text-ink">Audio Preview</h2>
        <select
          v-if="courses.length"
          v-model="activeCourse"
          data-walk="audio-preview-course-picker"
          class="px-2.5 py-1 bg-surface-2 border border-line rounded text-sm font-mono text-accent-2"
        >
          <option v-for="c in courses" :key="c.code" :value="c.code">{{ c.code }}</option>
        </select>
        <span v-else class="px-2.5 py-1 bg-surface-2 border border-line rounded text-sm font-mono text-accent-2">
          {{ activeCourse }}
        </span>
      </div>
      <div class="batch-actions flex items-center gap-2">
        <!-- Batch-level actions slot: read-only today. -->
      </div>
    </div>

    <!-- Filter + sample controls -->
    <div class="flex items-center gap-3 mb-3 flex-wrap">
      <div data-walk="audio-preview-filter" class="flex gap-1.5">
        <button
          v-for="tab in filterTabs"
          :key="tab.key"
          @click="setFilter(tab.key)"
          class="px-3 py-1.5 rounded text-xs font-medium transition-all"
          :class="filter === tab.key
            ? 'bg-surface-3 border border-line text-ink'
            : 'bg-surface border border-line text-muted hover:text-ink'"
        >{{ tab.label }}</button>
      </div>

      <div class="flex items-center gap-1.5 ml-auto">
        <button
          v-if="!sampleMode"
          data-walk="audio-preview-random-sample"
          @click="playRandomSample"
          :disabled="loadingSample"
          class="px-3 py-1.5 rounded text-xs font-medium bg-surface-3 border border-line text-ink hover:text-accent-2 disabled:opacity-50"
        >{{ loadingSample ? 'Picking…' : `Play random sample of ${sampleSize}` }}</button>
        <select
          v-if="!sampleMode"
          v-model.number="sampleSize"
          class="px-2 py-1.5 bg-surface-2 border border-line rounded text-xs text-muted"
        >
          <option :value="10">10</option>
          <option :value="20">20</option>
          <option :value="50">50</option>
        </select>

        <template v-else>
          <button
            @click="stopSample"
            class="px-3 py-1.5 rounded text-xs font-medium bg-surface border border-danger text-danger"
          >Stop</button>
          <button
            @click="exitSample"
            class="px-3 py-1.5 rounded text-xs font-medium bg-surface border border-line text-muted hover:text-ink"
          >Back to list</button>
        </template>
      </div>
    </div>

    <!-- What the data can and cannot prove. Said once, plainly, where it is
         being relied on — not buried in a tooltip. -->
    <p v-if="gate" class="text-xs text-faint mb-4 leading-relaxed">
      <template v-if="filter === 'gated'">
        Clips rendered from {{ gateLiveFromLabel }}, when the pre-publish veracity gate went live.
      </template>
      No per-clip verdict is stored, so this is <em>rendered under the gate</em> — checked-and-passed
      or unchecked — never <em>proven passed</em>. Clips the gate failed were withheld and never
      published, so they cannot appear below.
    </p>

    <!-- Gate failures, which by construction are absent from the list above. -->
    <div
      v-if="quarantine.length"
      class="mb-4 border border-danger/40 rounded-lg bg-surface px-4 py-2.5"
    >
      <button
        @click="showQuarantine = !showQuarantine"
        class="w-full flex items-center justify-between text-left text-xs"
      >
        <span class="text-danger font-medium">
          {{ quarantine.length }} clip{{ quarantine.length === 1 ? '' : 's' }} quarantined by the gate — never published
        </span>
        <span class="text-faint">{{ showQuarantine ? 'hide' : 'show' }}</span>
      </button>
      <ul v-if="showQuarantine" class="mt-2 space-y-1">
        <li v-for="(q, i) in quarantine" :key="i" class="text-xs text-muted flex gap-3 flex-wrap">
          <span class="text-ink">{{ q.text }}</span>
          <span v-if="q.decode != null" class="font-mono text-faint">heard: “{{ q.decode }}”</span>
          <span v-if="q.cer != null" class="font-mono text-faint">CER {{ q.cer }}</span>
          <span v-if="q.reason" class="font-mono text-faint">{{ q.reason }}</span>
        </li>
      </ul>
    </div>

    <!-- States -->
    <div v-if="loading" class="text-center py-12 text-faint">Loading clips…</div>
    <div v-else-if="error" class="text-center py-12 text-danger text-sm">{{ error }}</div>
    <div v-else-if="!clips.length" class="text-center py-12">
      <div class="text-muted mb-1">No clips</div>
      <div class="text-sm text-faint">Nothing in {{ activeCourse }} matches this filter.</div>
    </div>

    <div v-else class="space-y-2">
      <p v-if="sampleMode" class="text-xs text-faint">
        Random sample of {{ clips.length }} from {{ filterLabel }} — playing back to back.
      </p>
      <p v-else-if="total != null" class="text-xs text-faint">
        {{ clips.length }} of {{ total }} — newest first
      </p>

      <AudioPreviewClip
        v-for="(clip, i) in clips"
        :key="clip.id"
        :ref="el => registerClip(el, i)"
        :clip="clip"
        :resolve-url="resolveUrl"
        :now-playing="playingId === clip.id"
        :data-walk="i === 0 ? 'audio-preview-play-first' : null"
        @play="onClipPlay(clip, i)"
        @ended="onClipEnded(i)"
      />

      <div v-if="!sampleMode && hasMore" class="pt-2 text-center">
        <button
          @click="loadMore"
          :disabled="loadingMore"
          class="px-4 py-2 rounded text-xs font-medium bg-surface border border-line text-muted hover:text-ink disabled:opacity-50"
        >{{ loadingMore ? 'Loading…' : 'Load more' }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * The human end of the pre-publish veracity gate: open, tap, listen.
 *
 * Read-only by decision — no deletes, no re-renders, no regeneration, no TTS.
 * The shape is built for the manual-approval gate that comes later: clips are
 * a normalised client-side model, each clip owns a per-clip actions slot, and
 * the header carries a batch-actions area. Adding approve/reject should not
 * require moving anything here.
 *
 * Honesty note that governs every label on this page: no per-clip veracity
 * verdict is persisted anywhere (verified against the live schema
 * 2026-08-05). The "rendered under the gate" filter is a render-time window,
 * never a verdict lookup, and nothing on the page claims a clip "passed".
 */
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiUrl } from '@/services/api'
import AudioPreviewClip from './components/AudioPreviewClip.vue'

const props = defineProps({
  courseCode: { type: String, default: '' },
})

const route = useRoute()
const router = useRouter()
const apiUrl = getApiUrl()
const LAST_COURSE_KEY = 'audioPreview.lastCourse'
const PAGE_SIZE = 50

const filterTabs = [
  { key: 'recent', label: 'Recently rendered' },
  { key: 'gated', label: 'Rendered under the gate' },
  { key: 'all', label: 'All' },
]

const courses = ref([])
const activeCourse = ref(props.courseCode || localStorage.getItem(LAST_COURSE_KEY) || '')
const filter = ref('recent')
const clips = ref([])
const total = ref(null)
const hasMore = ref(false)
const gate = ref(null)
const quarantine = ref([])
const showQuarantine = ref(false)

const loading = ref(false)
const loadingMore = ref(false)
const loadingSample = ref(false)
const error = ref('')
const sampleMode = ref(false)
const sampleSize = ref(20)
const playingId = ref(null)

const clipRefs = ref([])
const urlCache = new Map()

const filterLabel = computed(() =>
  filterTabs.find(t => t.key === filter.value)?.label.toLowerCase() || filter.value)

const gateLiveFromLabel = computed(() => {
  if (!gate.value?.liveFrom) return ''
  return new Date(gate.value.liveFrom).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
})

function apiHeaders () {
  return { 'ngrok-skip-browser-warning': 'true' }
}

function registerClip (el, i) {
  if (el) clipRefs.value[i] = el
}

/**
 * One signed-URL cache for the page. URLs are valid for an hour; fetching 250
 * of them up front to show a list nobody has tapped yet would be waste.
 */
async function resolveUrl (clip) {
  if (urlCache.has(clip.id)) return urlCache.get(clip.id)
  const resp = await fetch(`${apiUrl}${clip.audioUrlPath}`, { headers: apiHeaders() })
  if (!resp.ok) throw new Error(`signed URL ${resp.status}`)
  const { url } = await resp.json()
  urlCache.set(clip.id, url)
  return url
}

async function fetchCourses () {
  try {
    const resp = await fetch(`${apiUrl}/api/courses`, { headers: apiHeaders() })
    if (!resp.ok) return
    const data = await resp.json()
    const list = Array.isArray(data) ? data : (data.courses || [])
    courses.value = list
      .map(c => ({ code: c.code || c.course_code }))
      .filter(c => c.code)
      .sort((a, b) => a.code.localeCompare(b.code))
    if (!activeCourse.value && courses.value.length) activeCourse.value = courses.value[0].code
  } catch (err) {
    console.error('[AudioPreview] course list failed', err)
  }
}

async function fetchClips ({ append = false } = {}) {
  if (!activeCourse.value) return
  if (append) loadingMore.value = true
  else { loading.value = true; error.value = '' }
  try {
    const offset = append ? clips.value.length : 0
    const url = `${apiUrl}/api/production/${activeCourse.value}/audio-preview/clips`
      + `?filter=${filter.value}&limit=${PAGE_SIZE}&offset=${offset}`
    const resp = await fetch(url, { headers: apiHeaders() })
    if (!resp.ok) throw new Error(`clips ${resp.status}`)
    const data = await resp.json()
    clips.value = append ? [...clips.value, ...data.clips] : data.clips
    total.value = data.total
    hasMore.value = data.hasMore
    gate.value = data.gate
    if (!append) primeVisible()
  } catch (err) {
    error.value = `Could not load clips: ${err.message}`
    console.error('[AudioPreview]', err)
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

async function fetchQuarantine () {
  quarantine.value = []
  if (!activeCourse.value) return
  try {
    const resp = await fetch(
      `${apiUrl}/api/production/${activeCourse.value}/audio-preview/quarantine`,
      { headers: apiHeaders() })
    if (!resp.ok) return
    const data = await resp.json()
    quarantine.value = data.entries || []
  } catch (err) {
    console.error('[AudioPreview] quarantine fetch failed', err)
  }
}

/**
 * Prime the first screenful so the first tap plays instantly rather than
 * pausing to fetch. Deliberately small — the play handler covers the rest.
 */
async function primeVisible () {
  await nextTick()
  clipRefs.value.slice(0, 8).forEach(c => c?.arm?.())
}

function setFilter (key) {
  if (filter.value === key) return
  filter.value = key
  exitSample()
  fetchClips()
}

function loadMore () {
  fetchClips({ append: true })
}

// ── Playback: one clip audible at a time ────────────────────────────────────
function onClipPlay (clip, index) {
  playingId.value = clip.id
  clipRefs.value.forEach((c, i) => {
    if (c && i !== index) c.stop?.()
  })
}

function onClipEnded (index) {
  playingId.value = null
  if (!sampleMode.value) return
  const next = clipRefs.value[index + 1]
  if (next) next.playFromStart()
}

async function playRandomSample () {
  if (!activeCourse.value) return
  loadingSample.value = true
  try {
    const resp = await fetch(
      `${apiUrl}/api/production/${activeCourse.value}/audio-preview/sample`
      + `?filter=${filter.value}&n=${sampleSize.value}`,
      { headers: apiHeaders() })
    if (!resp.ok) throw new Error(`sample ${resp.status}`)
    const data = await resp.json()
    if (!data.clips.length) return
    clipRefs.value = []
    clips.value = data.clips
    gate.value = data.gate
    sampleMode.value = true
    await nextTick()
    clipRefs.value.forEach(c => c?.arm?.())
    clipRefs.value[0]?.playFromStart()
  } catch (err) {
    error.value = `Could not draw a sample: ${err.message}`
    console.error('[AudioPreview]', err)
  } finally {
    loadingSample.value = false
  }
}

function stopSample () {
  clipRefs.value.forEach(c => c?.stop?.())
  playingId.value = null
}

function exitSample () {
  if (!sampleMode.value) return
  stopSample()
  sampleMode.value = false
  clipRefs.value = []
  fetchClips()
}

// ── Course switching ────────────────────────────────────────────────────────
watch(activeCourse, (code) => {
  if (!code) return
  localStorage.setItem(LAST_COURSE_KEY, code)
  clipRefs.value = []
  sampleMode.value = false
  urlCache.clear()
  // Courseless entry (/audio-preview) routes on into the course's own page so
  // the URL is shareable and the course-scope auth gate applies as usual.
  if (!props.courseCode) {
    router.replace(`/production/${code}/audio-preview`)
    return
  }
  if (code !== props.courseCode) {
    router.push(`/production/${code}/audio-preview`)
    return
  }
  fetchClips()
  fetchQuarantine()
})

watch(() => props.courseCode, (code) => {
  if (code && code !== activeCourse.value) activeCourse.value = code
})

onMounted(async () => {
  if (route.query.filter && filterTabs.some(t => t.key === route.query.filter)) {
    filter.value = route.query.filter
  }
  // Courseless entry: a remembered course means the second visit is one tap
  // fewer — go straight in rather than making him pick again.
  if (!props.courseCode && activeCourse.value) {
    router.replace({
      path: `/production/${activeCourse.value}/audio-preview`,
      query: route.query,
    })
    return
  }
  await fetchCourses()
  if (activeCourse.value && props.courseCode) {
    fetchClips()
    fetchQuarantine()
  }
})
</script>

<style scoped>
.audio-preview {
  max-width: 900px;
}

@media (max-width: 640px) {
  .audio-preview {
    max-width: none;
  }
}
</style>
