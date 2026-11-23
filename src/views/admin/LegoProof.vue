<template>
  <div class="lp">
    <header class="top" ref="topEl">
      <div class="bar">
        <h1>LEGO proof</h1>
        <div class="seg" role="tablist">
          <button v-for="c in COURSES" :key="c.code" :class="{ on: course === c.code }" @click="pick(c.code)">{{ c.label }}</button>
        </div>
      </div>
      <div class="bar">
        <div class="seg part" role="tablist" aria-label="Which part of the course">
          <button v-for="p in PARTS" :key="p.key" :class="{ on: part === p.key }" @click="part = p.key">{{ p.label }}</button>
        </div>
        <button class="pill" :class="{ on: flaggedOnly }" @click="flaggedOnly = !flaggedOnly">⚑ Flagged only</button>
        <button class="pill" :class="{ on: showEnglish }" :aria-pressed="showEnglish" @click="setShowEnglish(!showEnglish)">Show English</button>
        <button class="pill" :class="{ on: showTaught }" @click="showTaught = !showTaught">Show taught</button>
        <span class="count"><b>{{ flaggedCount }}</b> flagged · {{ newCount }} new</span>
        <button class="pill" @click="exportFlags">Export flags</button>
      </div>
      <p v-if="msg" class="msg" :class="{ bad: msgBad }">{{ msg }}</p>
      <!-- Shown when a load put the reader back at a remembered row: the row it went to, and the way out to the top. -->
      <p v-if="cameBack" class="back">
        Back to where you were: <a href="#" @click.prevent="goBack">{{ cameBack }}</a>
        · <a href="#" @click.prevent="goTop">Go to top</a>
        <button class="x" aria-label="Hide this line" @click="cameBack = null">×</button>
      </p>
    </header>

    <!-- A fixed overlay, not an inline block: inline it opened above a long list and, with the page scrolled, was off screen
         so "nothing happened" (job #551). Always on screen, whatever the scroll position or the clipboard permission. -->
    <div v-if="exportText !== null" class="export-overlay" role="dialog" aria-label="Flag list" @click.self="exportText = null">
      <div class="export">
        <textarea ref="exportBox" readonly :value="exportText" @focus="$event.target.select()"></textarea>
        <p v-if="msg" class="msg" :class="{ bad: msgBad }">{{ msg }}</p>
        <div class="bar"><button class="pill" @click="copyExport">Copy</button><button class="pill" @click="downloadExport">Download .txt</button><button class="pill" @click="exportText = null">Close</button></div>
      </div>
    </div>

    <p v-if="loading" class="note">Loading {{ course }}…</p>
    <p v-else-if="loadError" class="msg bad">{{ loadError }}</p>
    <p v-else-if="!shown.length" class="note">{{ flaggedOnly ? 'Nothing flagged yet.' : 'No LEGOs.' }}</p>

    <ol class="list" ref="listEl">
      <li v-for="l in shown" :key="l.id" class="row" :data-id="l.id" :class="{ taught: !l.isNew, flagged: l.flagged }">
        <div class="num">
          <span class="id">{{ l.id }}</span>
          <small v-if="l.n">#{{ l.n }}</small>
          <small v-else>taught</small>
          <span v-if="l.hc" class="hc" title="Hadau Creiddiol block">HC</span>
        </div>
        <div class="text" @click="toggle(l.id)">
          <div class="cyline">
            <span class="cy">{{ l.cy }}</span>
            <button class="flag" :class="{ on: l.flagged }" :aria-pressed="l.flagged" :aria-label="(l.flagged ? 'Unflag ' : 'Flag ') + l.id" @click.stop="flip(l)">
              {{ l.flagged ? '⚑' : '⚐' }}
            </button>
          </div>
          <div v-if="showEnglish || open[l.id]" class="en">{{ l.en || '— no English —' }}</div>
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
// tick when there is an issue; tap the Welsh to see the English. Job #522: the default list is the WHOLE course in the
// order a learner meets it (row #1 = seed 1's first LEGO), HC-block rows badged, with an All / HC only / Old only filter. Every tick and note saves at once (no Submit, so nothing
// is lost on a phone). Server side: services/lego-proof/lego-proof-router.cjs.
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiBaseUrl } from '../../services/api'

const COURSES = [
  { code: 'cym_nv2_for_eng', label: 'North' },
  { code: 'cym_sv2_for_eng', label: 'South' },
]
// The filter only hides rows; numbers come from the server over the whole course, so they never shift.
const PARTS = [
  { key: 'all', label: 'All' },
  { key: 'hc', label: 'HC only' },
  { key: 'old', label: 'Old only' },
]
const route = useRoute()
const router = useRouter()
const course = ref(COURSES.some((c) => c.code === route.query.course) ? route.query.course : COURSES[0].code)
const legos = ref([])
const loading = ref(false)
const loadError = ref('')
const showTaught = ref(false)
const part = ref('all')
const flaggedOnly = ref(false)
// "Show English" pill: the English under every row at once. Off by default; one remembered choice shared with the
// phrase proof page.
const SHOW_EN_KEY = 'proof:showEnglish'
const showEnglish = ref(readShowEnglish())
function readShowEnglish() { try { return localStorage.getItem(SHOW_EN_KEY) === '1' } catch { return false } }
function setShowEnglish(v) {
  showEnglish.value = v
  try { localStorage.setItem(SHOW_EN_KEY, v ? '1' : '0') } catch { /* private mode */ }
}
const open = reactive({})
const state = reactive({})
const msg = ref('')
const msgBad = ref(false)
const exportText = ref(null)
const exportBox = ref(null)

const base = (code) => `${getApiBaseUrl()}/api/production/${code}/lego-proof`
const inPart = computed(() => legos.value.filter((l) => part.value === 'all' || (part.value === 'hc') === !!l.hc))
const shown = computed(() => inPart.value.filter((l) => (showTaught.value || l.isNew || l.flagged) && (!flaggedOnly.value || l.flagged)))
const flaggedCount = computed(() => inPart.value.filter((l) => l.flagged).length)
const newCount = computed(() => inPart.value.filter((l) => l.isNew).length)

function say(text, bad = false) { msg.value = text; msgBad.value = bad }

// Each load gets a generation number; a response for an older one (a slow North list landing after South) is dropped.
let loadGen = 0
async function load() {
  const gen = ++loadGen
  const code = course.value
  loading.value = true; loadError.value = ''; legos.value = []; cameBack.value = null
  try {
    const r = await fetch(base(code) + '/')
    const body = await r.json().catch(() => ({}))
    if (gen !== loadGen) return
    if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`)
    legos.value = body.legos
  } catch (e) {
    if (gen === loadGen) loadError.value = `Could not load ${code}: ${e.message}`
  } finally { if (gen === loadGen) loading.value = false }
  if (gen === loadGen && !loadError.value) await restorePlace()
}

// ---- keep the reader's place (cs #864, for Deborah's Welsh proofread) ------------------------------------------------
// The id of the top visible row, per course, in localStorage; a load scrolls back to it and says so, with a way to the
// top instead. It lives in this browser only — there is no server-side per-user place yet. The top of the list is never
// saved as a place, so "Go to top" does not wipe the place the reader came back to. Same shape as the phrase proof page.
const placeKey = (code) => `legoProof:place:${code}`
const topEl = ref(null)
const listEl = ref(null)
const cameBack = ref(null)         // id of the row a load scrolled back to; null = nothing to announce
// How much of the viewport's top the two sticky bars (Popty's navbar + this page's header) cover once scrolled.
const navbarH = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--app-navbar-height')) || 0
const coveredTop = () => navbarH() + (topEl.value?.offsetHeight || 0)
function topRowId() {
  const box = listEl.value?.getBoundingClientRect()
  if (!box) return null
  return document.elementFromPoint(box.left + box.width / 2, coveredTop() + 4)?.closest?.('.row')?.dataset.id || null
}
function savePlace(code) {
  if (course.value !== code || flaggedOnly.value || loading.value || !shown.value.length) return
  const id = topRowId()
  if (!id || id === shown.value[0].id) return
  try { localStorage.setItem(placeKey(code), id) } catch { /* private mode */ }
}
let placeTimer = 0
let raf = 0
function onScroll() {
  if (raf) return
  raf = requestAnimationFrame(() => {
    raf = 0
    clearTimeout(placeTimer)
    const code = course.value
    placeTimer = setTimeout(() => savePlace(code), 400)
  })
}
// Closing the tab or switching app inside the 400 ms must not lose the last scroll.
function flushPlace() { clearTimeout(placeTimer); savePlace(course.value) }
// The saved row if it is on screen under the current filters, else the next row after it that is (a taught row saved
// with "Show taught" on is hidden on the next load, where that pill starts off).
function rowFor(id) {
  const from = legos.value.findIndex((l) => l.id === id)
  if (from < 0) return null
  const at = new Map(legos.value.map((l, i) => [l.id, i]))
  return shown.value.find((l) => at.get(l.id) >= from) || null
}
// Rows off screen hold an estimated height (content-visibility), so the first jump can land a little off once the rows
// around the target are laid out; two more frames put it right.
function scrollToId(id) {
  let tries = 3
  const go = () => {
    const el = listEl.value?.querySelector(`[data-id="${id}"]`)
    if (!el) return
    const d = el.getBoundingClientRect().top - coveredTop()
    if (Math.abs(d) > 1) window.scrollBy(0, d)
    if (--tries > 0) requestAnimationFrame(go)
  }
  go()
}
async function restorePlace() {
  let id = null
  try { id = localStorage.getItem(placeKey(course.value)) } catch { /* ignore */ }
  const row = id ? rowFor(id) : null
  cameBack.value = row && row !== shown.value[0] ? row.id : null
  await nextTick()             // the list, and the line in the sticky header, must be laid out before the scroll
  if (cameBack.value) scrollToId(cameBack.value)
  else window.scrollTo(0, 0)
}
async function goBack() {
  if (!cameBack.value) return
  if (flaggedOnly.value) { flaggedOnly.value = false; await nextTick() }
  const row = rowFor(cameBack.value)
  if (row) scrollToId(row.id)
}
function goTop() { window.scrollTo(0, 0) }

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
  msg.value = ''
  exportText.value = [`LEGO proof flags — ${course.value} (${label}) — ${rows.length} flagged`, '']
    .concat(rows.length ? rows.map((l) => `${l.id}${l.n ? ` (#${l.n})` : ' (taught)'}${l.hc ? ' HC' : ''}\n  Welsh: ${l.cy}\n  English: ${l.en || '—'}\n  Note: ${l.note || '—'}\n`) : ['(no flags on this course)'])
    .join('\n')
}
async function copyExport() {
  const box = exportBox.value
  try {
    if (!navigator.clipboard?.writeText) throw new Error('no clipboard API')
    await navigator.clipboard.writeText(exportText.value)
    say('Copied.')
    return
  } catch { /* insecure context or blocked: fall through to select + execCommand */ }
  try {
    box?.focus(); box?.select(); box?.setSelectionRange?.(0, exportText.value.length)
    if (document.execCommand('copy')) { say('Copied.'); return }
  } catch { /* fall through */ }
  say('Could not copy automatically — the text is selected, press and hold / Ctrl+C to copy it.', true)
}
function downloadExport() {
  try {
    const url = URL.createObjectURL(new Blob([exportText.value], { type: 'text/plain;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url; a.download = `lego-proof-flags-${course.value}.txt`
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    say('Download started.')
  } catch (e) { say(`Download failed: ${e.message} — copy the text instead.`, true) }
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('pagehide', flushPlace)
  load()
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('pagehide', flushPlace)
  flushPlace()
})
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
/* Under Popty's sticky navbar (it publishes --app-navbar-height); at top: 0 the navbar covered this header (#562). */
.top { position: sticky; top: var(--app-navbar-height, 0px); z-index: 5; background: var(--lp-bg); padding: 0.6rem 0.25rem 0.4rem; border-bottom: 1px solid var(--lp-line); }
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
.back { display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap; font-size: 0.8rem; color: var(--lp-muted); margin: 0.2rem 0 0; }
.back a { color: var(--lp-en); text-decoration: underline; padding: 0.35rem 0; font-variant-numeric: tabular-nums; }
.back .x { margin-left: auto; border: 0; background: transparent; color: var(--lp-muted); font-size: 1.1rem; line-height: 1; min-width: 36px; min-height: 32px; }
.note { color: var(--lp-muted); padding: 1rem 0.25rem; }
.export-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(15,23,42,.55); display: flex; align-items: center; justify-content: center; padding: 0.75rem; }
.export { background: #fff; color: var(--lp-ink); border-radius: 12px; padding: 0.75rem; width: min(900px, 100%); max-height: 100%; display: flex; flex-direction: column; }
.export textarea { flex: 1; min-height: 50vh; resize: none; }
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
/* HC badge in the number column, so the flag stays straight after the Welsh (#509). #1e3a8a on #dbeafe is 9.4:1. */
.num .hc { align-self: flex-start; margin-top: 0.15rem; font: 700 0.65rem/1 system-ui, sans-serif; letter-spacing: 0.04em; color: #1e3a8a; background: #dbeafe; border-radius: 4px; padding: 0.2rem 0.3rem; }
.seg.part button { padding: 0.45rem 0.7rem; min-height: 40px; font-size: 0.85rem; }
.flag { flex: none; width: 48px; height: 48px; margin: -0.6rem 0; padding: 0; border: 0; border-radius: 10px; background: transparent; font-size: 1.6rem; line-height: 1; color: #64748b; }
.flag:hover { background: rgba(15, 23, 42, 0.06); }
.flag.on { color: var(--lp-amber); }
</style>
