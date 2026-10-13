<template>
  <div class="pp">
    <header class="top" ref="topEl">
      <div class="bar">
        <h1>Phrase proof</h1>
        <div class="seg" role="tablist">
          <button v-for="c in COURSES" :key="c.code" :class="{ on: course === c.code }" @click="pick(c.code)">{{ c.label }}</button>
        </div>
      </div>
      <div class="bar">
        <button class="pill" :class="{ on: flaggedOnly }" @click="setFlaggedOnly(!flaggedOnly)">⚑ Flagged only</button>
        <span class="count"><b>{{ flaggedCount }}</b> flagged · {{ total }}</span>
        <button class="pill" @click="exportFlags">Export</button>
      </div>
      <p v-if="msg" class="msg" :class="{ bad: msgBad }">{{ msg }}</p>
    </header>

    <!-- Fixed overlay, as on the LEGO page (#551): always on screen whatever the scroll position. -->
    <div v-if="exportText !== null" class="export-overlay" role="dialog" aria-label="Flag list" @click.self="exportText = null">
      <div class="export">
        <textarea ref="exportBox" readonly :value="exportText" @focus="$event.target.select()"></textarea>
        <p v-if="msg" class="msg" :class="{ bad: msgBad }">{{ msg }}</p>
        <div class="bar"><button class="pill" @click="copyExport">Copy</button><button class="pill" @click="downloadExport">Download .txt</button><button class="pill" @click="exportText = null">Close</button></div>
      </div>
    </div>

    <p v-if="loading" class="note">Loading {{ course }}…</p>
    <p v-else-if="loadError" class="msg bad">{{ loadError }}</p>
    <p v-else-if="!shown.length" class="note">{{ flaggedOnly ? 'Nothing flagged yet.' : 'No phrases.' }}</p>

    <!-- Windowed: only the rows near the viewport are in the DOM; the two spacers stand in for the rest. -->
    <div class="list" ref="listEl">
      <div :style="{ height: padTop + 'px' }"></div>
      <div v-for="r in rendered" :key="r.p.id" class="row" :class="{ flagged: flagOf(r.p).flagged }" :data-k="r.k">
        <span class="stripe" :class="{ white: r.belt === 0 }" :style="{ background: BELTS[r.belt].color }"></span>
        <div v-if="r.marker" class="mk">{{ legos[r.p.l]?.cy }}</div>
        <div class="line">
          <span class="num">{{ r.p.n }}</span>
          <div class="text">
            <!-- The last word and the flag never part, so the flag cannot wrap onto a line of its own. -->
            <span class="cy" @click="toggle(r.p.id)">{{ r.head }}<span class="tail">{{ r.tail }}<button class="flag" :class="{ on: flagOf(r.p).flagged }"
              :aria-pressed="flagOf(r.p).flagged" :aria-label="(flagOf(r.p).flagged ? 'Unflag ' : 'Flag ') + r.p.id" @click.stop="flip(r.p)">{{ flagOf(r.p).flagged ? '⚑' : '⚐' }}</button></span></span>
            <div v-if="open[r.p.id]" class="en" @click="toggle(r.p.id)">{{ r.p.en || '— no English —' }}</div>
            <div v-if="flagOf(r.p).flagged || flagOf(r.p).note" class="notewrap">
              <input class="noteinp" type="text" :value="flagOf(r.p).note" maxlength="1000" placeholder="Note (optional)"
                     enterkeyhint="done" @input="onNote(r.p, $event.target.value)" @blur="saveNow(r.p)" @keyup.enter="$event.target.blur()" />
              <small class="state">{{ state[r.p.id] || '' }}</small>
            </div>
          </div>
        </div>
      </div>
      <div :style="{ height: padBottom + 'px' }"></div>
    </div>
  </div>
</template>

<script setup>
// Phrase proof (job #562). Aran's ask, 2026-10-13: every practice phrase the learner plays (build + use under new LEGOs),
// in the order he meets them, read like lines in a book — Welsh only, a running number, a flag straight after the text,
// tap the Welsh for the English, and a thin belt-coloured stripe down the left saying how far down the course a row is.
// Saves exactly as the LEGO page does (keyed by course + id, the course captured at the change). 10-20k rows per course,
// so the list is windowed: a height per row (measured once rendered, estimated before), prefix sums, and only the rows
// near the viewport in the DOM. Server side: services/phrase-proof/phrase-proof-router.cjs.
import { ref, reactive, computed, shallowRef, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiBaseUrl } from '../../services/api'
import { BELTS, beltIndex, prefixTops, rowAt, windowRange } from './phraseProofWindow.js'

const COURSES = [
  { code: 'cym_nv2_for_eng', label: 'North' },
  { code: 'cym_sv2_for_eng', label: 'South' },
]
const route = useRoute()
const router = useRouter()
const course = ref(COURSES.some((c) => c.code === route.query.course) ? route.query.course : COURSES[0].code)
const phrases = shallowRef([])     // plain rows from the server; per-row state lives in `flags` / `open`
const legos = shallowRef([])
const total = ref(0)
const loading = ref(false)
const loadError = ref('')
const flaggedOnly = ref(false)
const flags = reactive({})         // id -> { flagged, note }, only for rows that have ever had one
const open = reactive({})
const state = reactive({})
const msg = ref('')
const msgBad = ref(false)
const exportText = ref(null)
const exportBox = ref(null)
const listEl = ref(null)
const topEl = ref(null)

const NOFLAG = Object.freeze({ flagged: false, note: '' })
const flagOf = (p) => flags[p.id] || NOFLAG
const base = (code) => `${getApiBaseUrl()}/api/production/${code}/phrase-proof`
const shown = computed(() => flaggedOnly.value ? phrases.value.filter((p) => flags[p.id]?.flagged) : phrases.value)
const flaggedCount = computed(() => Object.values(flags).filter((f) => f.flagged).length)

function say(text, bad = false) { msg.value = text; msgBad.value = bad }

// ---- windowing ----------------------------------------------------------------------------------------------------
// A row's height is its MEASURED height once it has been rendered at this width, else an estimate from its text length.
// The measurement is keyed by id + whether the row carries a LEGO marker (a filter can change that).
const measured = new Map()
const measureTick = ref(0)
const width = ref(360)
const viewTop = ref(0)
const viewH = ref(800)
const OVERSCAN = 700
const markerAt = (list, i) => i === 0 || list[i - 1].l !== list[i].l
const keyOf2 = (p, marker) => `${p.id}|${marker ? 1 : 0}`
function estimate(p, marker, f) {
  const textW = Math.max(120, width.value - 52)       // stripe + number column + flag
  const lines = Math.max(1, Math.ceil((p.cy.length * 8.6 + 26) / textW))
  return 2 + lines * 22 + (marker ? 16 : 0) + (f && (f.flagged || f.note) ? 36 : 0)
}
const tops = computed(() => {
  void measureTick.value
  const list = shown.value
  const h = new Float64Array(list.length)
  for (let i = 0; i < list.length; i++) {
    const marker = markerAt(list, i)
    h[i] = measured.get(keyOf2(list[i], marker)) ?? estimate(list[i], marker, flags[list[i].id])
  }
  return prefixTops(h)
})
const range = computed(() => windowRange(tops.value, viewTop.value, viewTop.value + viewH.value, OVERSCAN))
const padTop = computed(() => tops.value[range.value[0]] || 0)
const padBottom = computed(() => tops.value[tops.value.length - 1] - (tops.value[range.value[1]] || 0))
const rendered = computed(() => {
  const list = shown.value
  const [a, b] = range.value
  const out = []
  for (let i = a; i < b; i++) {
    const marker = markerAt(list, i)
    const cut = list[i].cy.lastIndexOf(' ') + 1
    out.push({ p: list[i], marker, k: keyOf2(list[i], marker), belt: beltIndex(list[i].n, total.value), head: list[i].cy.slice(0, cut), tail: list[i].cy.slice(cut) })
  }
  return out
})

const listTop = () => (listEl.value ? listEl.value.getBoundingClientRect().top + window.scrollY : 0)
function readView() {
  viewTop.value = window.scrollY - listTop()
  viewH.value = window.innerHeight
}

// Rows above the viewport that turn out taller or shorter than estimated would shove the page; the scroll is moved by
// the same amount so the row being read stays put (overflow-anchor is off on the list so the browser doesn't also do it).
let ro = null
let pendingMeasure = false
function onResized(entries) {
  let changed = false
  const anchorBefore = rowAt(tops.value, viewTop.value)
  const oldTop = tops.value[anchorBefore]
  for (const e of entries) {
    const k = e.target.dataset.k
    if (!k) continue
    const box = e.borderBoxSize && e.borderBoxSize[0]
    const h = Math.round((box ? box.blockSize : e.target.getBoundingClientRect().height) * 10) / 10
    if (h > 0 && measured.get(k) !== h) { measured.set(k, h); changed = true }
  }
  if (!changed || pendingMeasure) { if (changed) measureTick.value++; return }
  pendingMeasure = true
  measureTick.value++
  nextTick(() => {
    pendingMeasure = false
    const delta = tops.value[anchorBefore] - oldTop
    if (delta && viewTop.value > 0) window.scrollBy(0, delta)
    readView()
  })
}
// Re-observe just the rows in the DOM, so rows windowed out are not held on to.
function observeRows() {
  if (!ro || !listEl.value) return
  ro.disconnect()
  for (const el of listEl.value.querySelectorAll('.row')) ro.observe(el)
}
watch(rendered, () => nextTick(observeRows))

let raf = 0
function onScroll() {
  if (raf) return
  raf = requestAnimationFrame(() => { raf = 0; readView(); rememberPlace() })
}
function onWindowResize() {
  const w = listEl.value ? listEl.value.clientWidth : 360
  if (Math.abs(w - width.value) > 1) { width.value = w; measured.clear(); measureTick.value++ }
  readView()
}

// Keep his place: the id of the top row, per course, so a reload lands on the same phrase.
const placeKey = (code) => `phraseProof:place:${code}`
let placeTimer = 0
function rememberPlace() {
  if (flaggedOnly.value || loading.value || !shown.value.length) return
  clearTimeout(placeTimer)
  const code = course.value
  placeTimer = setTimeout(() => {
    const p = shown.value[rowAt(tops.value, viewTop.value + (topEl.value?.offsetHeight || 0))]
    try { if (p && course.value === code) localStorage.setItem(placeKey(code), p.id) } catch { /* private mode */ }
  }, 400)
}
async function restorePlace() {
  let id = null
  try { id = localStorage.getItem(placeKey(course.value)) } catch { /* ignore */ }
  const i = id ? shown.value.findIndex((p) => p.id === id) : -1
  await nextTick()
  if (i > 0) window.scrollTo(0, listTop() + tops.value[i] - (topEl.value?.offsetHeight || 0))
  else window.scrollTo(0, 0)
  readView()
}

// ---- loading ------------------------------------------------------------------------------------------------------
// Each load gets a generation number; a response for an older one (a slow North list landing after South) is dropped.
let loadGen = 0
async function load() {
  const gen = ++loadGen
  const code = course.value
  loading.value = true; loadError.value = ''; phrases.value = []; legos.value = []; total.value = 0
  for (const k of Object.keys(flags)) delete flags[k]
  measured.clear()
  try {
    const r = await fetch(base(code) + '/')
    const body = await r.json().catch(() => ({}))
    if (gen !== loadGen) return
    if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`)
    for (const p of body.phrases) if (p.flagged || p.note) flags[p.id] = { flagged: !!p.flagged, note: p.note || '' }
    legos.value = Object.freeze(body.legos)
    total.value = body.total
    phrases.value = Object.freeze(body.phrases.map((p) => Object.freeze({ id: p.id, n: p.n, l: p.l, cy: p.cy, en: p.en })))
  } catch (e) {
    if (gen === loadGen) loadError.value = `Could not load ${code}: ${e.message}`
  } finally { if (gen === loadGen) loading.value = false }
  if (gen === loadGen && !loadError.value) { onWindowResize(); await restorePlace() }
}

function pick(code) {
  if (code === course.value) return
  course.value = code
  router.replace({ query: { ...route.query, course: code } })
  for (const k of Object.keys(open)) delete open[k]
  for (const k of Object.keys(state)) delete state[k]
  load()
}
function setFlaggedOnly(v) {
  flaggedOnly.value = v
  nextTick(() => { if (v) window.scrollTo(0, 0); else restorePlace() })
}

function toggle(id) { open[id] = !open[id] }

// ---- saving (as the LEGO page: one save per row at a time, keyed by course + id, course captured at the change) -----
const inflight = {}
const timers = {}
const saveKey = (code, p) => `${code}:${p.id}`
async function save(code, p, f) {
  const k = saveKey(code, p)
  if (inflight[k]) { inflight[k].again = f; return }
  inflight[k] = { again: null }
  const mine = () => course.value === code
  if (mine()) state[p.id] = 'saving…'
  try {
    const r = await fetch(base(code) + '/flag', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phraseId: p.id, flagged: f.flagged, note: f.note }),
    })
    const body = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`)
    if (mine()) state[p.id] = 'saved ✓'
    if (msgBad.value) say('')
  } catch (e) {
    if (mine()) state[p.id] = 'NOT saved'
    say(`${code} ${p.id} not saved: ${e.message} — tap the flag again to retry.`, true)
  } finally {
    const again = inflight[k].again
    delete inflight[k]
    if (again) save(code, p, again)
  }
}
// `flags` is cleared on a course switch, so a save carries its own snapshot of the flag rather than reading it back.
function current(p) { return flags[p.id] || (flags[p.id] = { flagged: false, note: '' }) }
function flip(p) {
  const code = course.value
  const f = current(p)
  f.flagged = !f.flagged
  clearTimeout(timers[saveKey(code, p)]); delete timers[saveKey(code, p)]
  save(code, p, { ...f })
}
function onNote(p, v) {
  const code = course.value
  const k = saveKey(code, p)
  const f = current(p)
  f.note = v
  clearTimeout(timers[k])
  state[p.id] = '…'
  timers[k] = setTimeout(() => { delete timers[k]; save(code, p, { ...f }) }, 700)
}
function saveNow(p) {
  const code = course.value
  const k = saveKey(code, p)
  if (!timers[k]) return
  clearTimeout(timers[k]); delete timers[k]
  save(code, p, { ...current(p) })
}

// ---- export -------------------------------------------------------------------------------------------------------
function exportFlags() {
  const label = COURSES.find((c) => c.code === course.value).label
  const rows = phrases.value.filter((p) => flags[p.id]?.flagged)
  msg.value = ''
  exportText.value = [`Phrase proof flags — ${course.value} (${label}) — ${rows.length} flagged`, '']
    .concat(rows.length ? rows.map((p) => `${p.id} (#${p.n})\n  Welsh: ${p.cy}\n  English: ${p.en || '—'}\n  LEGO: ${legos.value[p.l]?.cy || '—'} (${legos.value[p.l]?.id || '?'})\n  Note: ${flags[p.id].note || '—'}\n`) : ['(no flags on this course)'])
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
    a.href = url; a.download = `phrase-proof-flags-${course.value}.txt`
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    say('Download started.')
  } catch (e) { say(`Download failed: ${e.message} — copy the text instead.`, true) }
}

onMounted(() => {
  if (typeof ResizeObserver !== 'undefined') ro = new ResizeObserver(onResized)
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onWindowResize)
  load()
})
onBeforeUnmount(() => {
  ro?.disconnect()
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onWindowResize)
})
</script>

<style scoped>
/* Own light palette, as the LEGO page (#509): dark ink on white whatever Popty's theme. Ink #0b1220 is 18.9:1 on #fff,
   the running number #475569 7.6:1, the LEGO marker #64748b 4.8:1, English #1e40af 8.7:1. */
.pp {
  --pp-bg: #ffffff; --pp-ink: #0b1220; --pp-muted: #475569; --pp-line: #cbd5e1;
  --pp-en: #1e40af; --pp-amber: #b45309; --pp-flagbg: #fff7e6; --pp-good: #047857; --pp-bad: #b91c1c;
  max-width: 760px; min-height: 100vh; margin: 0 auto; padding: 0 0.5rem 5rem;
  background: var(--pp-bg); color: var(--pp-ink); color-scheme: light;
}
.top { position: sticky; top: 0; z-index: 5; background: var(--pp-bg); padding: 0.5rem 0.25rem 0.35rem; border-bottom: 1px solid var(--pp-line); }
.bar { display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap; margin: 0.2rem 0; }
h1 { font-size: 1.15rem; margin: 0; flex: 1; color: var(--pp-ink); }
button { font: inherit; color: inherit; cursor: pointer; }
.seg { display: flex; border: 1px solid var(--pp-line); border-radius: 10px; overflow: hidden; }
.seg button { background: transparent; border: 0; padding: 0.35rem 0.9rem; min-height: 38px; color: var(--pp-ink); }
.seg button.on { background: #1d4ed8; color: #fff; }
.pill { background: #f1f5f9; border: 1px solid var(--pp-line); border-radius: 999px; padding: 0.3rem 0.7rem; min-height: 36px; font-size: 0.82rem; white-space: nowrap; color: var(--pp-ink); }
.pill.on { background: #f59e0b; border-color: transparent; color: #111; }
.count { font-size: 0.82rem; color: var(--pp-muted); margin-left: auto; white-space: nowrap; }
.count b { color: var(--pp-amber); font-size: 1rem; }
.msg { font-size: 0.85rem; color: var(--pp-good); margin: 0.25rem 0 0; }
.msg.bad { color: var(--pp-bad); }
.note { color: var(--pp-muted); padding: 1rem 0.25rem; }
.export-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(15,23,42,.55); display: flex; align-items: center; justify-content: center; padding: 0.75rem; }
.export { background: #fff; color: var(--pp-ink); border-radius: 12px; padding: 0.75rem; width: min(900px, 100%); max-height: 100%; display: flex; flex-direction: column; }
.export textarea { flex: 1; min-height: 50vh; resize: none; width: 100%; font: 0.8rem ui-monospace, monospace; background: #f8fafc; color: var(--pp-ink); border: 1px dashed #94a3b8; border-radius: 8px; padding: 0.5rem; margin-top: 0.5rem; }

/* Lines in a book (Aran, 2026-10-13): no borders, no card padding, tight line-height, not bold. */
.list { overflow-anchor: none; }
.row { position: relative; padding: 1px 0 1px 11px; }
.row.flagged { background: var(--pp-flagbg); }
/* The belt stripe: down the left edge, never behind the text. White gets a grey edge so it shows on white. */
.stripe { position: absolute; left: 0; top: 0; bottom: 0; width: 5px; }
.stripe.white { box-shadow: inset 1px 0 #94a3b8, inset -1px 0 #94a3b8; }
.mk { font-size: 0.72rem; line-height: 16px; height: 16px; color: #64748b; font-weight: 400; padding-left: 2.6rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; border-top: 1px solid #eef2f6; }
.line { display: flex; align-items: baseline; gap: 0.35rem; }
.num { flex: none; width: 2.3rem; text-align: right; font-size: 0.68rem; color: var(--pp-muted); font-variant-numeric: tabular-nums; }
.text { flex: 1; min-width: 0; font-size: 17px; line-height: 22px; }
.tail { white-space: nowrap; }
.cy { font-weight: 400; color: var(--pp-ink); overflow-wrap: anywhere; cursor: pointer; -webkit-tap-highlight-color: transparent; }
/* Slim inline flag straight after the text; the invisible ::after widens the tap target without growing the row. */
.flag { position: relative; display: inline-block; margin-left: 0.3rem; padding: 0 0.15rem; border: 0; background: transparent; font-size: 15px; line-height: 22px; vertical-align: top; color: #94a3b8; -webkit-tap-highlight-color: transparent; }
.flag::after { content: ''; position: absolute; inset: -9px -14px; }
.flag.on { color: var(--pp-amber); }
.en { font-size: 0.9rem; line-height: 1.25; color: var(--pp-en); padding-bottom: 2px; cursor: pointer; }
.notewrap { display: flex; gap: 0.4rem; align-items: center; margin: 2px 0 3px; }
.noteinp { flex: 1; min-width: 0; font: inherit; font-size: 16px; line-height: 1.2; color: var(--pp-ink); background: #fff; border: 1px solid #94a3b8; border-radius: 6px; padding: 0.2rem 0.45rem; }
.noteinp::placeholder { color: #64748b; }
.state { font-size: 0.7rem; color: var(--pp-muted); white-space: nowrap; }
</style>
