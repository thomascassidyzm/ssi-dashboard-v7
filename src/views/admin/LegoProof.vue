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
          <div class="cyline">
            <span class="cy">{{ l.cy }}</span>
            <button class="flag" :class="{ on: l.flagged }" :aria-pressed="l.flagged" :aria-label="(l.flagged ? 'Unflag ' : 'Flag ') + l.id" @click.stop="flip(l)">
              {{ l.flagged ? '⚑' : '⚐' }}
            </button>
          </div>
          <div v-if="open[l.id]" class="en">{{ l.en || '— no English —' }}</div>
          <div v-if="l.flagged || l.note" class="notewrap" @click.stop>
            <input class="noteinp" type="text" :value="l.note" maxlength="1000" placeholder="Note (optional)"
                   enterkeyhint="done" @input="onNote(l, $event.target.value)" @blur="saveNow(l)" @keyup.enter="$event.target.blur()" />
            <small class="state">{{ state[l.id] || '' }}</small>
          </div>
        </div>
      </li>
    </ol>
  </div>
</template>

<script setup>
// LEGO proof (job #496). Aran's ask, 2026-10-13: only the Welsh LEGO text, its number on the left, a flag to
// tick when there is an issue; tap the Welsh to see the English. Every tick and note saves at once (no Submit, so nothing
// is lost on a phone). Server side: services/lego-proof/lego-proof-router.cjs.
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiBaseUrl } from '../../services/api'

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

const base = (code) => `${getApiBaseUrl()}/api/production/${code}/lego-proof`
const shown = computed(() => legos.value.filter((l) => (showTaught.value || l.isNew || l.flagged) && (!flaggedOnly.value || l.flagged)))
const flaggedCount = computed(() => legos.value.filter((l) => l.flagged).length)
const newCount = computed(() => legos.value.filter((l) => l.isNew).length)

function say(text, bad = false) { msg.value = text; msgBad.value = bad }

// Each load gets a generation number; a response for an older one (a slow North list landing after South) is dropped.
let loadGen = 0
async function load() {
  const gen = ++loadGen
  const code = course.value
  loading.value = true; loadError.value = ''; legos.value = []
  try {
    const r = await fetch(base(code) + '/')
    const body = await r.json().catch(() => ({}))
    if (gen !== loadGen) return
    if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`)
    legos.value = body.legos
  } catch (e) {
    if (gen === loadGen) loadError.value = `Could not load ${code}: ${e.message}`
  } finally { if (gen === loadGen) loading.value = false }
}

function pick(code) {
  if (code === course.value) return
  course.value = code
  router.replace({ query: { ...route.query, course: code } })
  for (const k of Object.keys(open)) delete open[k]
  for (const k of Object.keys(state)) delete state[k]
  load()
}

function toggle(id) { open[id] = !open[id] }

// One save per LEGO at a time; a newer change waits for the one in flight and then sends the latest state.
// Everything is keyed by COURSE + LEGO id and the course is captured when the change is made: North and South share ids
// (S1003L03 is in both), so a save still queued when the course is switched must go to the course it was made on.
const inflight = {}
const timers = {}
const keyOf = (code, l) => `${code}:${l.id}`
async function save(code, l) {
  const k = keyOf(code, l)
  if (inflight[k]) { inflight[k].again = true; return }
  inflight[k] = { again: false }
  const mine = () => course.value === code
  if (mine()) state[l.id] = 'saving…'
  try {
    const r = await fetch(base(code) + '/flag', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ legoId: l.id, flagged: l.flagged, note: l.note }),
    })
    const body = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`)
    if (mine()) state[l.id] = 'saved ✓'
    if (msgBad.value) say('')
  } catch (e) {
    if (mine()) state[l.id] = 'NOT saved'
    say(`${code} ${l.id} not saved: ${e.message} — tap the flag again to retry.`, true)
  } finally {
    const again = inflight[k].again
    delete inflight[k]
    if (again) save(code, l)
  }
}

function flip(l) {
  const code = course.value
  l.flagged = !l.flagged
  clearTimeout(timers[keyOf(code, l)]); delete timers[keyOf(code, l)]
  save(code, l)
}
function onNote(l, v) {
  const code = course.value
  const k = keyOf(code, l)
  l.note = v
  clearTimeout(timers[k])
  state[l.id] = '…'
  timers[k] = setTimeout(() => { delete timers[k]; save(code, l) }, 700)
}
function saveNow(l) {
  const code = course.value
  const k = keyOf(code, l)
  if (!timers[k]) return
  clearTimeout(timers[k]); delete timers[k]
  save(code, l)
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
/* The page carries its OWN light palette (job #509, Aran 2026-10-13): it used to inherit a light text colour while the
   shell painted a light canvas, so the Welsh read light-on-light. Fixed colours here, independent of Popty's theme, and
   scoped to this page only. Ratios are against #fff: ink 18.9:1, id 14.6:1, muted 7.6:1, English 8.7:1. */
.lp {
  --lp-bg: #ffffff; --lp-ink: #0b1220; --lp-id: #1e293b; --lp-muted: #475569; --lp-line: #cbd5e1;
  --lp-en: #1e40af; --lp-amber: #b45309; --lp-flagbg: #fff7e6; --lp-good: #047857; --lp-bad: #b91c1c;
  max-width: 760px; min-height: 100vh; margin: 0 auto; padding: 0 0.5rem 5rem;
  background: var(--lp-bg); color: var(--lp-ink); color-scheme: light;
}
.top { position: sticky; top: 0; z-index: 5; background: var(--lp-bg); padding: 0.6rem 0.25rem 0.4rem; border-bottom: 1px solid var(--lp-line); }
.bar { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; margin: 0.25rem 0; }
h1 { font-size: 1.2rem; margin: 0; flex: 1; color: var(--lp-ink); }
button { font: inherit; color: inherit; cursor: pointer; }
.seg { display: flex; border: 1px solid var(--lp-line); border-radius: 10px; overflow: hidden; }
.seg button { background: transparent; border: 0; padding: 0.55rem 1rem; min-height: 44px; color: var(--lp-ink); }
.seg button.on { background: #1d4ed8; color: #fff; }
.pill { background: #f1f5f9; border: 1px solid var(--lp-line); border-radius: 999px; padding: 0.45rem 0.8rem; min-height: 40px; font-size: 0.85rem; color: var(--lp-ink); }
.pill.on { background: #f59e0b; border-color: transparent; color: #111; }
.count { font-size: 0.85rem; color: var(--lp-muted); margin-left: auto; }
.count b { color: var(--lp-amber); font-size: 1rem; }
.msg { font-size: 0.85rem; color: var(--lp-good); margin: 0.25rem 0 0; }
.msg.bad { color: var(--lp-bad); }
.note { color: var(--lp-muted); padding: 1rem 0.25rem; }
.export textarea { width: 100%; font: 0.8rem ui-monospace, monospace; background: #f8fafc; color: var(--lp-ink); border: 1px dashed #94a3b8; border-radius: 8px; padding: 0.5rem; margin-top: 0.5rem; }
.list { list-style: none; margin: 0; padding: 0; }
.row { display: flex; align-items: stretch; gap: 0.5rem; border-bottom: 1px solid #e2e8f0; content-visibility: auto; contain-intrinsic-size: auto 60px; }
/* Taught rows are told apart by a grey wash and muted text, not opacity — opacity would drag them below AA. */
.row.taught { background: #f1f5f9; }
.row.taught .cy { color: var(--lp-muted); }
.row.flagged { background: var(--lp-flagbg); }
.num { width: 5.4rem; flex: none; display: flex; flex-direction: column; justify-content: center; padding: 0.5rem 0 0.5rem 0.25rem; font-variant-numeric: tabular-nums; }
.num .id { font: 600 0.8rem ui-monospace, monospace; color: var(--lp-id); }
.num small { font-size: 0.7rem; color: var(--lp-muted); }
.text { flex: 1; min-width: 0; padding: 0.65rem 0; cursor: pointer; -webkit-tap-highlight-color: transparent; }
/* The flag sits straight after the Welsh words (Aran, 2026-10-13: quick to tap), not at the row's far edge. */
.cyline { display: flex; align-items: center; gap: 0.15rem; }
.cy { flex: 0 1 auto; min-width: 0; font-size: 1.15rem; line-height: 1.35; font-weight: 500; color: var(--lp-ink); overflow-wrap: anywhere; }
.en { font-size: 0.95rem; color: var(--lp-en); margin-top: 0.2rem; }
.notewrap { display: flex; gap: 0.4rem; align-items: center; margin-top: 0.35rem; }
.noteinp { flex: 1; min-width: 0; font: inherit; font-size: 16px; color: var(--lp-ink); background: #fff; border: 1px solid #94a3b8; border-radius: 8px; padding: 0.4rem 0.55rem; }
.noteinp::placeholder { color: #64748b; }
.state { font-size: 0.7rem; color: var(--lp-muted); white-space: nowrap; }
.flag { flex: none; width: 48px; height: 48px; margin: -0.6rem 0; padding: 0; border: 0; border-radius: 10px; background: transparent; font-size: 1.6rem; line-height: 1; color: #64748b; }
.flag:hover { background: rgba(15, 23, 42, 0.06); }
.flag.on { color: var(--lp-amber); }
</style>
