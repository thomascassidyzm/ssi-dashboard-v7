<template>
  <div class="lp">
    <header class="top">
      <div class="bar">
        <h1>LEGO proof</h1>
        <div class="seg" role="tablist">
          <button v-for="c in COURSES" :key="c.code" :class="{ on: course === c.code }" @click="pick(c.code)">{{ c.label }}</button>
        </div>
      </div>
      <div class="bar">
        <button class="pill" :class="{ on: flaggedOnly }" @click="flaggedOnly = !flaggedOnly">⚑ Flagged only</button>
        <button class="pill" :class="{ on: showTaught }" @click="showTaught = !showTaught">Show taught</button>
        <span class="count"><b>{{ flaggedCount }}</b> flagged · {{ newCount }} new</span>
        <button class="pill" @click="exportFlags">Export flags</button>
      </div>
      <p v-if="msg" class="msg" :class="{ bad: msgBad }">{{ msg }}</p>
    </header>

    <div v-if="exportText !== null" class="export">
      <textarea ref="exportBox" readonly :value="exportText" rows="10"></textarea>
      <div class="bar"><button class="pill" @click="copyExport">Copy</button><button class="pill" @click="exportText = null">Close</button></div>
    </div>

    <p v-if="loading" class="note">Loading {{ course }}…</p>
    <p v-else-if="loadError" class="msg bad">{{ loadError }}</p>
    <p v-else-if="!shown.length" class="note">{{ flaggedOnly ? 'Nothing flagged yet.' : 'No LEGOs.' }}</p>

    <ol class="list">
      <li v-for="l in shown" :key="l.id" class="row" :class="{ taught: !l.isNew, flagged: l.flagged }">
        <div class="num">
          <span class="id">{{ l.id }}</span>
          <small v-if="l.n">#{{ l.n }}</small>
          <small v-else>taught</small>
        </div>
        <div class="text" @click="toggle(l.id)">
          <div class="cy">{{ l.cy }}</div>
          <div v-if="open[l.id]" class="en">{{ l.en || '— no English —' }}</div>
          <div v-if="l.flagged || l.note" class="notewrap" @click.stop>
            <input class="noteinp" type="text" :value="l.note" maxlength="1000" placeholder="Note (optional)"
                   enterkeyhint="done" @input="onNote(l, $event.target.value)" @blur="saveNow(l)" @keyup.enter="$event.target.blur()" />
            <small class="state">{{ state[saveKey(l.course, l.id)] || '' }}</small>
          </div>
        </div>
        <button class="flag" :class="{ on: l.flagged }" :aria-pressed="l.flagged" :aria-label="(l.flagged ? 'Unflag ' : 'Flag ') + l.id" @click="flip(l)">
          {{ l.flagged ? '⚑' : '⚐' }}
        </button>
      </li>
    </ol>
  </div>
</template>

<script setup>
// LEGO proof (job #496). Aran's ask, 2026-10-13: only the Welsh LEGO text, its number on the left, a flag on the right to
// tick when there is an issue; tap the Welsh to see the English. Every tick and note saves at once (no Submit, so nothing
// is lost on a phone). Server side: services/lego-proof/lego-proof-router.cjs.
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiBaseUrl } from '../../services/api'
import { saveKey, createLoadGate, createSaveQueue } from './legoProofSaves'

const COURSES = [
  { code: 'cym_nv2_for_eng', label: 'North' },
  { code: 'cym_sv2_for_eng', label: 'South' },
]
const route = useRoute()
const router = useRouter()
const course = ref(COURSES.some((c) => c.code === route.query.course) ? route.query.course : COURSES[0].code)
const legos = ref([])
const loading = ref(false)
const loadError = ref('')
const showTaught = ref(false)
const flaggedOnly = ref(false)
const open = reactive({})
const state = reactive({})
const msg = ref('')
const msgBad = ref(false)
const exportText = ref(null)
const exportBox = ref(null)

const baseFor = (code) => `${getApiBaseUrl()}/api/production/${code}/lego-proof`
const shown = computed(() => legos.value.filter((l) => (showTaught.value || l.isNew || l.flagged) && (!flaggedOnly.value || l.flagged)))
const flaggedCount = computed(() => legos.value.filter((l) => l.flagged).length)
const newCount = computed(() => legos.value.filter((l) => l.isNew).length)

function say(text, bad = false) { msg.value = text; msgBad.value = bad }

// A slow load for a course the user has since left must not overwrite the list (job #505): only the latest load counts.
const loadGate = createLoadGate()
async function load() {
  const token = loadGate.begin()
  const code = course.value
  loading.value = true; loadError.value = ''; legos.value = []
  try {
    const r = await fetch(baseFor(code) + '/')
    const body = await r.json().catch(() => ({}))
    if (!loadGate.isCurrent(token)) return
    if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`)
    legos.value = body.legos.map((l) => ({ ...l, course: code }))
  } catch (e) {
    if (loadGate.isCurrent(token)) loadError.value = `Could not load ${code}: ${e.message}`
  } finally { if (loadGate.isCurrent(token)) loading.value = false }
}

function pick(code) {
  if (code === course.value) return
  course.value = code
  router.replace({ query: { ...route.query, course: code } })
  for (const k of Object.keys(open)) delete open[k]
  load()
}

function toggle(id) { open[id] = !open[id] }

// Saves are keyed and addressed by the course the LEGO was loaded for (job #505), so a tab switch mid-save cannot
// redirect a North flag onto South.
const timers = {}
const sendFlag = async (code, payload) => {
  const r = await fetch(baseFor(code) + '/flag', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  })
  const body = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`)
}
const queue = createSaveQueue({
  send: sendFlag,
  onState: (key, text) => { state[key] = text },
  onOk: () => { if (msgBad.value) say('') },
  onError: (key, l, e) => say(`${l.id} not saved: ${e.message} — tap the flag again to retry.`, true),
})
const save = (l) => queue.save(l)

function flip(l) {
  l.flagged = !l.flagged
  clearTimeout(timers[saveKey(l.course, l.id)])
  save(l)
}
function onNote(l, v) {
  l.note = v
  const k = saveKey(l.course, l.id)
  clearTimeout(timers[k])
  state[k] = '…'
  timers[k] = setTimeout(() => save(l), 700)
}
function saveNow(l) {
  const k = saveKey(l.course, l.id)
  if (!timers[k]) return
  clearTimeout(timers[k]); delete timers[k]
  save(l)
}

function exportFlags() {
  const label = COURSES.find((c) => c.code === course.value).label
  const rows = legos.value.filter((l) => l.flagged)
  exportText.value = [`LEGO proof flags — ${course.value} (${label}) — ${rows.length} flagged`, '']
    .concat(rows.map((l) => `${l.id}${l.n ? ` (#${l.n})` : ' (taught)'}  ${l.cy}  =  ${l.en || '—'}${l.note ? `  — ${l.note}` : ''}`))
    .join('\n')
}
async function copyExport() {
  try { await navigator.clipboard.writeText(exportText.value); say('Copied.') } catch { exportBox.value?.select(); say('Select-all is on — copy it from there.') }
}

onMounted(load)
</script>

<style scoped>
.lp { max-width: 760px; margin: 0 auto; padding: 0 0.5rem 5rem; color: var(--text, #e8eaed); }
.top { position: sticky; top: 0; z-index: 5; background: var(--bg, #0f1115); padding: 0.6rem 0.25rem 0.4rem; border-bottom: 1px solid rgba(255,255,255,0.08); }
.bar { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; margin: 0.25rem 0; }
h1 { font-size: 1.2rem; margin: 0; flex: 1; }
button { font: inherit; color: inherit; cursor: pointer; }
.seg { display: flex; border: 1px solid rgba(255,255,255,0.2); border-radius: 10px; overflow: hidden; }
.seg button { background: transparent; border: 0; padding: 0.55rem 1rem; min-height: 44px; }
.seg button.on { background: var(--accent-2, #3b82f6); color: #fff; }
.pill { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.18); border-radius: 999px; padding: 0.45rem 0.8rem; min-height: 40px; font-size: 0.85rem; }
.pill.on { background: #e0a458; border-color: transparent; color: #111; }
.count { font-size: 0.85rem; color: var(--muted, #8b9199); margin-left: auto; }
.count b { color: #e0a458; font-size: 1rem; }
.msg { font-size: 0.85rem; color: #5fd08a; margin: 0.25rem 0 0; }
.msg.bad { color: #ff7a7a; }
.note { color: var(--muted, #8b9199); padding: 1rem 0.25rem; }
.export textarea { width: 100%; font: 0.8rem ui-monospace, monospace; background: rgba(255,255,255,0.04); color: inherit; border: 1px dashed rgba(255,255,255,0.25); border-radius: 8px; padding: 0.5rem; margin-top: 0.5rem; }
.list { list-style: none; margin: 0; padding: 0; }
.row { display: flex; align-items: stretch; gap: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.07); content-visibility: auto; contain-intrinsic-size: auto 60px; }
.row.taught { opacity: 0.45; }
.row.flagged { background: rgba(224,164,88,0.09); }
.num { width: 5.4rem; flex: none; display: flex; flex-direction: column; justify-content: center; padding: 0.5rem 0 0.5rem 0.25rem; font-variant-numeric: tabular-nums; }
.num .id { font: 600 0.8rem ui-monospace, monospace; }
.num small { font-size: 0.7rem; color: var(--muted, #8b9199); }
.text { flex: 1; min-width: 0; padding: 0.65rem 0; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.cy { font-size: 1.15rem; line-height: 1.35; overflow-wrap: anywhere; }
.en { font-size: 0.95rem; color: #9ec5ff; margin-top: 0.2rem; }
.notewrap { display: flex; gap: 0.4rem; align-items: center; margin-top: 0.35rem; }
.noteinp { flex: 1; min-width: 0; font: inherit; font-size: 16px; color: inherit; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; padding: 0.4rem 0.55rem; }
.state { font-size: 0.7rem; color: var(--muted, #8b9199); white-space: nowrap; }
.flag { flex: none; width: 56px; min-height: 56px; background: transparent; border: 0; font-size: 1.6rem; color: rgba(255,255,255,0.35); }
.flag.on { color: #e0a458; }
</style>
