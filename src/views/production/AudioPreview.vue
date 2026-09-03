<template>
  <div class="audio-preview">
    <!-- Header. The right-hand slot is where a future batch control
         ("approve these 20") lands without disturbing anything else. -->
    <div class="flex items-start justify-between gap-4 mb-4 flex-wrap">
      <div class="flex items-center gap-3 flex-wrap">
        <h2 class="text-lg font-semibold text-ink">Audio Preview</h2>
        <FilterSelect
          v-if="courses.length"
          v-model="activeCourse"
          data-walk="audio-preview-course-picker"
          :options="courseOptions"
          placeholder="Course"
          filter-placeholder="Type a course…"
          button-class="px-2.5 py-1 bg-surface-2 border border-line rounded text-sm font-mono text-accent-2"
        />
        <span v-else class="px-2.5 py-1 bg-surface-2 border border-line rounded text-sm text-accent-2">
          {{ courseName(activeCourse) }}
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

      <!-- Which side of the phrase you are listening to. A recording session is
           judging one role at a time, and the clip list is otherwise all four
           interleaved. -->
      <div data-walk="audio-preview-role" class="flex gap-1.5">
        <button
          v-for="tab in roleTabs"
          :key="tab.key"
          @click="setRole(tab.key)"
          class="px-3 py-1.5 rounded text-xs font-medium transition-all"
          :class="role === tab.key
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

    <!-- What this page is for, in the three states a listener is judging
         between. Said before the controls, because it is what the controls are
         for. -->
    <p class="text-xs text-faint mb-2 leading-relaxed">
      Three outcomes to listen for: it <strong class="text-ink">plays</strong> as written,
      it plays but is <strong class="text-ink">truncated</strong>, or the slot is
      <strong class="text-danger">missing</strong> — it points at audio that no longer
      exists and cannot play at all. Truncation is still an ear judgement: nothing in the
      database records it per clip, so this page cannot flag it for you yet.
    </p>

    <!-- The verdict split of the WHOLE filter, not just the rows on screen.
         This page used to compare created_at against the date the gate shipped
         and label the result "rendered under the gate"; the 2026-08-05 audit
         measured that inference as false for every one of the 1,413 clips it
         selected. Each clip now carries a verdict its renderer recorded, and
         this line is the honest headline over the set. -->
    <p
      v-if="verdictTotals"
      data-walk="audio-preview-verdict-summary"
      class="mb-4 border border-line rounded-lg bg-surface px-4 py-2.5 text-xs text-muted leading-relaxed"
    >
      <template v-if="verdictTotals.passed">
        <strong class="text-ink">{{ verdictTotals.passed.toLocaleString() }} of the
        {{ filterTotal.toLocaleString() }} clips in this filter were checked and
        passed</strong> — a machine transcribed each one and the words matched the script.
      </template>
      <template v-else>
        <strong class="text-ink">Nothing in this filter carries a passing verdict.</strong>
      </template>
      <template v-if="verdictTotals.unchecked">
        {{ verdictTotals.unchecked.toLocaleString() }} {{ verdictTotals.passed ? 'are' : 'of them are' }}
        <strong class="text-ink">unchecked</strong> — no quality check ever ran on them, or the
        checker ran and could not examine them. Unchecked is not a pass.
      </template>
      <strong v-if="verdictTotals.failed" class="text-danger">
        {{ verdictTotals.failed.toLocaleString() }} were checked and FAILED yet are published —
        that should be impossible; investigate.
      </strong>
      <template v-if="filter === 'recent' && gate">
        “Recently rendered” means the last {{ gate.recentWindowDays }} days, which is a recency
        window and not a quality one.
      </template>
      A random sample is drawn uniformly across the whole filter, so it plays the mix above.
      Every clip below carries its own badge.
    </p>

    <!-- What a pass does and does not cover. Said once, plainly, where it is
         being relied on — not buried in a tooltip. -->
    <p class="text-xs text-faint mb-4 leading-relaxed">
      A pass means an unprimed transcription of the clip contained the words that were asked for.
      It is validated on <strong class="text-ink">silence and truncation only</strong> and says
      nothing about pronunciation, so your ears remain the check for how it sounds.
    </p>

    <!-- The third state. Slots pointing at audio that no longer exists cannot
         appear in the clip list below — there is nothing to list — so this is
         the only place a person can ever see them. Sits with the quarantine
         block because both answer the same question: what is wrong that the
         list structurally cannot show me? -->
    <!-- Every missing clip in the COURSE, in one place. Sits directly above the
         pod-slot scan because both answer "what is wrong that the clip list
         structurally cannot show me?" — this one for the learner journey, that
         one for the pods. Script Viewer can only ever filter the 20 LEGOs it
         has loaded, so this is the only surface that can state a course-wide
         total. -->
    <AudioPreviewCourseGaps
      :gaps="courseGaps"
      :loading="courseGapsLoading"
      :error="courseGapsError"
    />

    <p
      v-if="missingError"
      data-walk="audio-preview-missing-error"
      class="mb-4 border border-danger/40 rounded-lg bg-surface px-4 py-2.5 text-xs text-danger"
    >{{ missingError }}</p>
    <AudioPreviewMissing v-else :missing="missing" />

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
    <!-- An empty "checked and passed" is a real answer, not a broken page: it
         means nothing in this course has been through the gate yet. Say that,
         and hand over a tap to the audio that exists anyway — an empty list
         with no explanation reads as a fault and gets the page distrusted. -->
    <div v-else-if="!clips.length" class="text-center py-12">
      <div class="text-muted mb-1">No clips</div>
      <div v-if="filter === 'checked'" class="text-sm text-faint max-w-md mx-auto leading-relaxed">
        No clip in {{ activeCourse }} carries a passing verdict yet. Verdicts are recorded from the
        render that produces them, so this fills up as audio is generated — it does not backfill.
        <button
          @click="setFilter('unchecked')"
          class="mt-3 block mx-auto px-3 py-1.5 rounded text-xs font-medium bg-surface border border-line text-muted hover:text-ink"
        >Listen to what is here anyway</button>
      </div>
      <div v-else class="text-sm text-faint">Nothing in {{ activeCourse }} matches this filter.</div>
    </div>

    <div v-else class="space-y-2">
      <p v-if="sampleMode" class="text-xs text-faint">
        Random sample of {{ clips.length }} from {{ filterLabel }} — playing back to back.
        <span v-if="sampledUnchecked" class="text-ink">{{ sampledUnchecked }} of them carry no passing verdict.</span>
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
 * Honesty note that governs every label on this page: a clip is described by
 * the verdict its renderer STORED on it, never by when it was rendered. The
 * page used to infer "rendered under the gate" from created_at, and
 * docs/gate-bypass-audit-2026-08-05.md measured that inference as false for
 * 100% of the rows it selected. "unchecked" is a first-class state here and is
 * never folded into "passed" — a clip nothing looked at and a clip that passed
 * must never look alike.
 */
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiUrl } from '@/services/api'
import { courseName, sortCourses } from '@/utils/languageNames'
import AudioPreviewClip from './components/AudioPreviewClip.vue'
import AudioPreviewMissing from './components/AudioPreviewMissing.vue'
import AudioPreviewCourseGaps from './components/AudioPreviewCourseGaps.vue'
import FilterSelect from '@/components/ui/FilterSelect.vue'

const props = defineProps({
  courseCode: { type: String, default: '' },
})

const route = useRoute()
const router = useRouter()
const apiUrl = getApiUrl()
const LAST_COURSE_KEY = 'audioPreview.lastCourse'
const PAGE_SIZE = 50

// Verdict-first. The first two tabs are the two halves of the question this
// page exists to answer — what has been checked, and what has not — and each
// is a lookup of a stored verdict rather than a date window. "Not confirmed
// passed" is deliberately defined as everything that is NOT a pass, so a
// checked-and-failed clip cannot hide in a tab nobody opens.
const filterTabs = [
  { key: 'checked', label: 'Checked and passed' },
  { key: 'unchecked', label: 'Not confirmed passed' },
  { key: 'recent', label: 'Recently rendered' },
  { key: 'all', label: 'All' },
]

// Role is orthogonal to the verdict filter and stacks with it: the backend
// applies both predicates in the same applyFilter(), so "checked and passed"
// + target2 is a real intersection rather than one overriding the other.
// 'all' is the ABSENCE of a role param, not a role named "all" — the column
// holds no such value, so sending it would filter everything out.
const roleTabs = [
  { key: 'all', label: 'All roles' },
  { key: 'known', label: 'known' },
  { key: 'target1', label: 'target1' },
  { key: 'target2', label: 'target2' },
  { key: 'presentation', label: 'presentation' },
]

const courses = ref([])

// Same list, same order as `courses` — sortCourses has already ordered it.
const courseOptions = computed(() => courses.value.map((c) => ({ value: c.code, label: courseName(c.code) })))
const activeCourse = ref(props.courseCode || localStorage.getItem(LAST_COURSE_KEY) || '')
const filter = ref('checked')
const role = ref('all')
const clips = ref([])
const total = ref(null)
const verdictTotals = ref(null)
const hasMore = ref(false)
const gate = ref(null)
const quarantine = ref([])
const showQuarantine = ref(false)
const missing = ref(null)
const missingError = ref('')
const courseGaps = ref(null)
const courseGapsLoading = ref(false)
const courseGapsError = ref('')

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

// How much of what is actually LOADED carries no passing verdict. The badges
// say it per clip; this says it for the batch a listener is about to judge —
// which matters most in sample mode, where the rows on screen are the whole
// thing being judged.
const sampledUnchecked = computed(() =>
  clips.value.filter(c => c.verdict?.state !== 'passed').length)

// The size of the filtered set. /clips reports it exactly; /sample does not, so
// fall back to the verdict counts, which are counts over the same predicate.
const filterTotal = computed(() => {
  if (total.value != null) return total.value
  const v = verdictTotals.value
  // `unchecked` is a remainder the API can only state when it knows the total,
  // so it is null when it doesn't. Adding null in would print a number that is
  // simply wrong; better to fall back to the verdicts we did count.
  return v ? v.passed + v.failed + (v.unchecked ?? 0) : 0
})

// Omitted entirely for 'all roles', which is exactly how the endpoints behave
// when the param is absent.
const roleParam = computed(() => role.value === 'all' ? '' : `&role=${encodeURIComponent(role.value)}`)

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
    // Ordered by TARGET language name then KNOWN, the same order every other
    // course list in Popty now uses — sorting by code put "Chinese" (zho) at
    // the bottom of a list that shows nobody the codes.
    courses.value = sortCourses(
      list.map(c => ({ code: c.code || c.course_code })).filter(c => c.code)
    )
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
      + `?filter=${filter.value}&limit=${PAGE_SIZE}&offset=${offset}${roleParam.value}`
    const resp = await fetch(url, { headers: apiHeaders() })
    if (!resp.ok) throw new Error(`clips ${resp.status}`)
    const data = await resp.json()
    clips.value = append ? [...clips.value, ...data.clips] : data.clips
    total.value = data.total
    verdictTotals.value = data.verdictTotals ?? null
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

/**
 * The missing-audio scan. Deliberately its own fetch and its own endpoint: the
 * missing set is a different shape from a clip list (it is addressed by pod
 * slot, not by clip id), and folding it into /clips would put rows with no
 * playable audio into the sample logic.
 *
 * A failure here must not blank the flag silently — a page that shows nothing
 * because the scan died looks exactly like a page that found nothing wrong,
 * which is the shape of the bug this block exists to surface. So the failure is
 * shown in the block's own place on the page, and it does not take the clip
 * list down with it.
 */
async function fetchMissing () {
  missing.value = null
  missingError.value = ''
  if (!activeCourse.value) return
  try {
    const resp = await fetch(
      `${apiUrl}/api/production/${activeCourse.value}/audio-preview/missing`,
      { headers: apiHeaders() })
    if (!resp.ok) throw new Error(`missing ${resp.status}`)
    missing.value = await resp.json()
  } catch (err) {
    missingError.value = `Could not check for missing audio: ${err.message} — this page cannot tell you whether any slots are dead.`
    console.error('[AudioPreview] missing scan failed', err)
  }
}

/**
 * The course-wide missing-clip list. Its own fetch for the same reason the pod
 * scan is: it is a different question (which phrases/LEGOs have no audio at
 * all) over a different unit (the learner journey), and it is slow enough
 * — whole-course journey generation, ~7.5s uncached for fra_for_eng — that
 * blocking the clip list on it would make the page feel broken.
 *
 * As with the pod scan, a failure is shown in the block's own place. A page
 * that prints nothing because the scan died looks exactly like a course with no
 * gaps, and "there are no gaps" is precisely the false statement this list
 * exists to stop being made.
 */
async function fetchCourseGaps () {
  courseGaps.value = null
  courseGapsError.value = ''
  if (!activeCourse.value) return
  courseGapsLoading.value = true
  try {
    const resp = await fetch(
      `${apiUrl}/api/production/${activeCourse.value}/audio-preview/missing-clips`,
      { headers: apiHeaders() })
    if (!resp.ok) throw new Error(`missing-clips ${resp.status}`)
    courseGaps.value = await resp.json()
  } catch (err) {
    courseGapsError.value = err.message
    console.error('[AudioPreview] course-wide missing-clip scan failed', err)
  } finally {
    courseGapsLoading.value = false
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

function setRole (key) {
  if (role.value === key) return
  role.value = key
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
      + `?filter=${filter.value}&n=${sampleSize.value}${roleParam.value}`,
      { headers: apiHeaders() })
    if (!resp.ok) throw new Error(`sample ${resp.status}`)
    const data = await resp.json()
    if (!data.clips.length) return
    clipRefs.value = []
    clips.value = data.clips
    verdictTotals.value = data.verdictTotals ?? null
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
  fetchMissing()
  fetchCourseGaps()
})

watch(() => props.courseCode, (code) => {
  if (code && code !== activeCourse.value) activeCourse.value = code
})

onMounted(async () => {
  if (route.query.filter && filterTabs.some(t => t.key === route.query.filter)) {
    filter.value = route.query.filter
  }
  if (route.query.role && roleTabs.some(t => t.key === route.query.role)) {
    role.value = route.query.role
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
    fetchMissing()
    fetchCourseGaps()
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
