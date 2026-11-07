<template>
  <!--
    THE POD BROWSER (job #628). Tom, r-2026-11-07-ssi-pods-exactly-one-way-of: "exactly ONE way
    of playing pods in the app … Popty then surfaces exactly that method (embedded app view) and
    nothing else". So this page plays NOTHING itself. It searches every pod, scene and language
    (services/pod-search-router.cjs) and frames the learning app's own Listening display
    (/listening/preview, ssi-learning-app) beside the results; a hit moves that frame to the line.
    What you hear in the frame is what a learner hears, by the same code. On a phone the frame
    stacks under the list, and "Open in app" opens the same address full-screen.
  -->
  <div class="pb">
    <div class="pb-bar">
      <CoursePicker v-if="!fixedCourse" :modelValue="course" @update:modelValue="pickCourse" placeholder="Course…" />
      <span v-else class="pb-chip">{{ course }}</span>
      <select v-if="pods.length > 1" v-model="pod" class="pb-select" @change="loadScenes">
        <option v-for="p in pods" :key="p.slug" :value="p.slug">{{ p.slug }}{{ p.retired ? ' (retired)' : '' }}</option>
      </select>
      <input
        v-model="q"
        type="search"
        class="pb-search"
        placeholder="Search every pod — English, any language, speaker…"
        @input="onType"
      />
    </div>
    <p v-if="note" class="pb-note">{{ note }}</p>

    <div class="pb-cols">
      <div class="pb-list">
        <!-- SEARCH HITS -->
        <template v-if="q.trim()">
          <p class="pb-meta">{{ searching ? 'Searching…' : `${hits.length} line${hits.length === 1 ? '' : 's'}` }}</p>
          <button
            v-for="h in hits"
            :key="`${h.slug}#${h.order}`"
            type="button"
            class="pb-line"
            :class="{ on: h.here && h.here.id === lineId }"
            @click="openHit(h)"
          >
            <span class="pb-where">{{ h.slug }} · scene {{ h.scene }} · {{ h.sentence }}</span>
            <span v-if="h.here" class="pb-target" :dir="dirFor(h.here.target)">{{ h.here.speaker }}: {{ h.here.target }}</span>
            <span class="pb-english">{{ h.english || h.here?.known }}</span>
            <span v-if="h.here" class="pb-badges"><Badges :row="h.here" /></span>
            <span v-if="!h.here && h.elsewhere.length" class="pb-else">
              In {{ h.elsewhere.map((r) => r.course).join(', ') }}<span v-if="h.elsewhereCount > h.elsewhere.length"> +{{ h.elsewhereCount - h.elsewhere.length }}</span> — tap to open {{ h.elsewhere[0].course }}
            </span>
            <span v-else-if="h.elsewhereCount" class="pb-else">also matches in {{ h.elsewhereCount }} other course{{ h.elsewhereCount === 1 ? '' : 's' }}</span>
          </button>
        </template>

        <!-- SCENE LIST -->
        <template v-else>
          <p v-if="loadingScenes" class="pb-meta">Loading scenes…</p>
          <p v-else-if="!course" class="pb-meta">Pick a course, or search across all of them.</p>
          <details v-for="s in scenes" :key="s.scene" class="pb-scene" :open="s.scene === sceneNo">
            <summary @click="openScene(s)">
              Scene {{ s.scene }}<span v-if="s.name"> — {{ s.name }}</span>
              <span class="pb-meta"> · {{ s.lines.length }} lines</span>
            </summary>
            <button
              v-for="l in s.lines"
              :key="l.id"
              type="button"
              class="pb-line"
              :class="{ on: l.id === lineId }"
              @click="goto(l.scene, l.id)"
            >
              <span class="pb-target" :dir="dirFor(l.target)">{{ l.speaker }}: {{ l.target }}</span>
              <span class="pb-english">{{ l.known }}<template v-if="l.english && l.english !== l.known"> · {{ l.english }}</template></span>
              <span class="pb-badges"><Badges :row="l" /></span>
            </button>
          </details>
        </template>
      </div>

      <div class="pb-frame-col">
        <div class="pb-frame-head">
          <span class="pb-meta">The app, as a learner hears it — first visit, nothing recorded</span>
          <a v-if="frameUrl" :href="frameUrl" target="_blank" rel="noopener" class="pb-open">Open in app ↗</a>
        </div>
        <iframe
          v-if="frameUrl"
          ref="frame"
          :src="frameUrl"
          class="pb-frame"
          allow="autoplay"
          title="The learning app's pod player"
        />
        <div v-else class="pb-frame pb-frame-empty">{{ passError || 'Pick a line to hear it in the app.' }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CoursePicker from '@/components/CoursePicker.vue'
import { getApiUrl } from '@/services/api.js'
import { useAuth } from '@/composables/useAuth.js'
import { dirFor } from '@/utils/textDirection.js'

const props = defineProps({
  /** Set on a course page: the browser stays on that course. */
  fixedCourse: { type: String, default: null },
})

const route = useRoute()
const router = useRouter()
const { getAccessToken } = useAuth()

const course = ref(props.fixedCourse || (typeof route.query.course === 'string' ? route.query.course : ''))
const pod = ref(typeof route.query.pod === 'string' ? route.query.pod : '')
const q = ref(typeof route.query.q === 'string' ? route.query.q : '')
const pods = ref([])
const scenes = ref([])
const hits = ref([])
const searching = ref(false)
const loadingScenes = ref(false)
const note = ref('')
const sceneNo = ref(Number(route.query.scene) || 1)
const lineId = ref(typeof route.query.line === 'string' ? route.query.line : null)

// The frame. One pass per course+pod; inside it, a move is a postMessage, not a reload.
const frame = ref(null)
const frameUrl = ref('')
const passError = ref('')
let pass = null // { course, pod, exp, origin }


const Badges = (p) => {
  const r = p.row
  const out = []
  out.push(h('span', { class: r.clips ? 'b ok' : 'b no', title: r.clips ? 'has target audio' : 'no target audio' }, r.clips ? 'clips' : 'no clips'))
  if (r.pieces === true) out.push(h('span', { class: 'b ok', title: 'drill pieces in the app' }, 'pieces'))
  else if (r.pieces === null) out.push(h('span', { class: 'b unk', title: 'the app\'s drill pieces could not be read on this server' }, 'pieces ?'))
  if (r.cuts) out.push(h('span', { class: 'b ok', title: 'verified cuts' }, 'cuts'))
  return out
}
Badges.props = ['row']

async function api (path) {
  const token = await getAccessToken()
  const res = await fetch(`${getApiUrl()}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(body?.error || `HTTP ${res.status}`), { body, status: res.status })
  return body
}

function syncQuery () {
  if (props.fixedCourse) return
  const query = {}
  if (course.value) query.course = course.value
  if (pod.value) query.pod = pod.value
  if (q.value.trim()) query.q = q.value.trim()
  if (lineId.value) { query.scene = String(sceneNo.value); query.line = lineId.value }
  router.replace({ query })
}

async function loadScenes () {
  if (!course.value) { scenes.value = []; return }
  loadingScenes.value = true
  note.value = ''
  try {
    const body = await api(`/api/pod-search/scenes?course=${encodeURIComponent(course.value)}&pod=${encodeURIComponent(pod.value || 'pod-1')}`)
    pods.value = body.pods || []
    scenes.value = body.scenes || []
    if (!pod.value) pod.value = body.pod
  } catch (e) {
    pods.value = e.body?.pods || []
    scenes.value = []
    // No pod-1 on this course: fall back to its first live pod, else say so.
    const other = pods.value.find((p) => !p.retired) || pods.value[0]
    if (e.status === 404 && other && other.slug !== (pod.value || 'pod-1')) { pod.value = other.slug; return loadScenes() }
    note.value = e.message
  } finally {
    loadingScenes.value = false
  }
  if (!lineId.value && scenes.value[0]) await goto(scenes.value[0].scene, null)
  else if (lineId.value) await goto(sceneNo.value, lineId.value)
}

let typing = null
function onType () {
  clearTimeout(typing)
  typing = setTimeout(search, 250)
}
async function search () {
  const term = q.value.trim()
  syncQuery()
  if (!term) { hits.value = []; return }
  searching.value = true
  try {
    const params = new URLSearchParams({ q: term })
    if (course.value) params.set('course', course.value)
    const body = await api(`/api/pod-search?${params}`)
    if (q.value.trim() === term) hits.value = body.hits || []
  } catch (e) {
    note.value = e.message
  } finally {
    searching.value = false
  }
}

async function openHit (hit) {
  const row = hit.here || hit.elsewhere[0]
  if (!row) return
  if (row.course !== course.value && !props.fixedCourse) {
    course.value = row.course
    pod.value = row.pod
    lineId.value = row.id
    sceneNo.value = row.scene
    await loadScenes()
    return
  }
  if (row.pod !== pod.value) { pod.value = row.pod; lineId.value = row.id; sceneNo.value = row.scene; await loadScenes(); return }
  await goto(row.scene, row.id)
}

function openScene (s) {
  void goto(s.scene, null)
}

/** Move the app frame to scene/line: postMessage on the live pass, else a fresh pass. */
async function goto (scene, line) {
  sceneNo.value = scene
  lineId.value = line
  syncQuery()
  if (!course.value || !pod.value) return
  const live = pass && pass.course === course.value && pass.pod === pod.value && pass.exp - Date.now() > 60_000
  if (live && frame.value?.contentWindow) {
    frame.value.contentWindow.postMessage({ type: 'ssi-pod-preview:goto', scene, line }, pass.origin)
    return
  }
  passError.value = ''
  try {
    const params = new URLSearchParams({ scene: String(scene) })
    if (line) params.set('line', line)
    const body = await api(`/api/production/${encodeURIComponent(course.value)}/pod-preview/${encodeURIComponent(pod.value)}?${params}`)
    pass = { course: course.value, pod: pod.value, exp: body.exp, origin: body.origin }
    frameUrl.value = body.url
  } catch (e) {
    pass = null
    frameUrl.value = ''
    passError.value = e.body?.missing
      ? `The app preview is not switched on yet: ${e.body.missing} is not set.`
      : e.message
  }
}

function onMessage (e) {
  if (!pass || e.origin !== pass.origin) return
  if (e.data?.type === 'ssi-pod-preview:at' && e.data.found === false) note.value = `The app has no scene ${e.data.scene} in ${pass.pod} for ${pass.course}.`
}

function pickCourse (code) {
  course.value = code
  pod.value = ''
  lineId.value = null
  pass = null
  frameUrl.value = ''
  loadScenes()
  if (q.value.trim()) search()
}

watch(() => props.fixedCourse, (c) => { if (c && c !== course.value) pickCourse(c) })

onMounted(() => {
  window.addEventListener('message', onMessage)
  if (course.value) loadScenes()
  if (q.value.trim()) search()
})
onUnmounted(() => window.removeEventListener('message', onMessage))
</script>

<style scoped>
.pb-bar { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; margin-bottom: 0.75rem; }
.pb-search { flex: 1 1 18rem; min-width: 0; padding: 0.5rem 0.75rem; border: 1px solid var(--line); border-radius: 0.5rem; background: var(--surface); color: var(--ink); }
.pb-select { padding: 0.45rem; border: 1px solid var(--line); border-radius: 0.5rem; background: var(--surface); color: var(--ink); }
.pb-chip { font-family: ui-monospace, monospace; font-size: 0.85rem; padding: 0.3rem 0.6rem; border: 1px solid var(--line); border-radius: 999px; }
.pb-note { font-size: 0.8rem; color: var(--danger, #b91c1c); margin-bottom: 0.5rem; }
.pb-cols { display: grid; grid-template-columns: minmax(0, 1fr) 420px; gap: 1rem; align-items: start; }
@media (max-width: 900px) { .pb-cols { grid-template-columns: 1fr; } }
.pb-list { min-width: 0; max-height: 82vh; overflow-y: auto; }
@media (max-width: 900px) { .pb-list { max-height: 50vh; } }
.pb-meta { font-size: 0.75rem; color: var(--muted); }
.pb-scene { border: 1px solid var(--line); border-radius: 0.5rem; margin-bottom: 0.5rem; background: var(--surface); }
.pb-scene > summary { cursor: pointer; padding: 0.5rem 0.75rem; font-weight: 600; }
.pb-line { display: grid; gap: 0.15rem; width: 100%; text-align: start; padding: 0.45rem 0.75rem; border-top: 1px solid var(--line); background: transparent; color: var(--ink); cursor: pointer; }
.pb-list > .pb-line { border: 1px solid var(--line); border-radius: 0.5rem; margin-bottom: 0.4rem; background: var(--surface); }
.pb-line:hover, .pb-line.on { background: var(--canvas); outline: 2px solid var(--accent-2); outline-offset: -2px; }
.pb-where { font-size: 0.7rem; color: var(--faint); font-family: ui-monospace, monospace; }
.pb-target { font-size: 0.95rem; }
.pb-english { font-size: 0.8rem; color: var(--muted); }
.pb-else { font-size: 0.75rem; color: var(--accent-2); }
.pb-badges { display: flex; gap: 0.3rem; flex-wrap: wrap; }
.pb-badges :deep(.b) { font-size: 0.65rem; padding: 0 0.4rem; border-radius: 999px; border: 1px solid var(--line); }
.pb-badges :deep(.b.ok) { color: var(--accent-2); }
.pb-badges :deep(.b.no) { color: var(--danger, #b91c1c); }
.pb-badges :deep(.b.unk) { color: var(--faint); }
.pb-frame-col { position: sticky; top: 0.5rem; }
.pb-frame-head { display: flex; justify-content: space-between; align-items: baseline; gap: 0.5rem; margin-bottom: 0.3rem; }
.pb-open { font-size: 0.8rem; color: var(--accent-2); white-space: nowrap; }
.pb-frame { width: 100%; height: 78vh; border: 1px solid var(--line); border-radius: 0.75rem; background: #faf8f5; }
@media (max-width: 900px) { .pb-frame { height: 70vh; } }
.pb-frame-empty { display: grid; place-items: center; padding: 1rem; text-align: center; color: var(--muted); font-size: 0.9rem; }
</style>
