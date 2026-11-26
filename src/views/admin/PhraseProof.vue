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
        <button class="pill" :class="{ on: showEnglish }" :aria-pressed="showEnglish" @click="setShowEnglish(!showEnglish)">Show English</button>
        <span class="count"><b>{{ flaggedCount }}</b> flagged · {{ total }}</span>
        <button class="pill" @click="exportFlags">Export</button>
      </div>
      <!-- Whole-course search (Welsh and English, case and accents ignored): the list is windowed, so the browser's own
           find only sees the rows near the screen. Enter = next, Shift+Enter = previous, Esc clears. -->
      <div class="bar find" role="search">
        <input class="findinp" type="search" :value="query" placeholder="Search the whole course" aria-label="Search the whole course"
               enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false"
               @input="onQuery($event.target.value)" @keydown.enter.prevent="step($event.shiftKey ? -1 : 1)" @keydown.esc="onQuery('')" />
        <span v-if="qTrim" class="hits" aria-live="polite">{{ hits.length ? `${cur + 1} / ${hits.length}` : 'no match' }}</span>
        <button class="pill nav" :disabled="!hits.length" aria-label="Previous match" @click="step(-1)">‹</button>
        <button class="pill nav" :disabled="!hits.length" aria-label="Next match" @click="step(1)">›</button>
      </div>
      <p v-if="hiddenHits" class="back">{{ hiddenHits }} more {{ hiddenHits === 1 ? 'match is' : 'matches are' }} hidden by Flagged only ·
        <a href="#" @click.prevent="setFlaggedOnly(false)">show all</a></p>
      <p v-if="msg" class="msg" :class="{ bad: msgBad }">{{ msg }}</p>
      <!-- Shown when a load put the reader back at a remembered row: the row it went to, and the way out to the top. -->
      <p v-if="cameBack" class="back">
        Back to where you were: <a href="#" @click.prevent="goBack">#{{ cameBack.n }}</a>
        · <a href="#" @click.prevent="goTop">Go to top</a>
        <button class="x" aria-label="Hide this line" @click="cameBack = null">×</button>
      </p>
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
      <div v-for="r in rendered" :key="r.p.id" class="row" :class="{ flagged: flagOf(r.p).flagged, hit: r.hit, current: r.current }" :data-k="r.k" :data-id="r.p.id">
        <span class="stripe" :class="{ white: r.belt === 0 }" :style="{ background: BELTS[r.belt].color }"></span>
        <div v-if="r.marker" class="mk">{{ legos[r.p.l]?.cy }}</div>
        <div class="line">
          <span class="num">{{ r.p.n }}</span>
          <div class="text">
            <!-- The last word and the flag never part, so the flag cannot wrap onto a line of its own. -->
            <span class="cy" @click="toggle(r.p.id)"><template v-for="(s, j) in r.head" :key="'h' + j"><mark v-if="s.hit">{{ s.t }}</mark><template v-else>{{ s.t }}</template></template><span class="tail"><template v-for="(s, j) in r.tail" :key="'t' + j"><mark v-if="s.hit">{{ s.t }}</mark><template v-else>{{ s.t }}</template></template><button class="flag" :class="{ on: flagOf(r.p).flagged }"
              :aria-pressed="flagOf(r.p).flagged" :aria-label="(flagOf(r.p).flagged ? 'Unflag ' : 'Flag ') + r.p.id" @click.stop="flip(r.p)">{{ flagOf(r.p).flagged ? '⚑' : '⚐' }}</button></span></span>
            <div v-if="showEnglish || open[r.p.id] || r.enHit" class="en" @click="toggle(r.p.id)"><template v-if="r.p.en"><template v-for="(s, j) in r.en" :key="'e' + j"><mark v-if="s.hit">{{ s.t }}</mark><template v-else>{{ s.t }}</template></template></template><template v-else>— no English —</template></div>
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
import { fold, findHits, markParts, splitParts, firstHitFrom } from './proofSearch.js'

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
// "Show English" pill: the English under every row at once, for a proofreader who wants both lines throughout.
// Off by default; one remembered choice shared with the LEGO proof page.
const SHOW_EN_KEY = 'proof:showEnglish'
const showEnglish = ref(readShowEnglish())
function readShowEnglish() { try { return localStorage.getItem(SHOW_EN_KEY) === '1' } catch { return false } }
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

// ---- whole-course search -----------------------------------------------------------------------------------------
// Every phrase's Welsh and English, folded once per load; a query is matched against all of them, not the DOM.
const folded = computed(() => phrases.value.map((p) => [fold(p.cy), fold(p.en)]))
const foldedById = computed(() => new Map(phrases.value.map((p, i) => [p.id, folded.value[i]])))
const query = ref('')
const qTrim = ref('')              // the query actually searched (debounced)
const cur = ref(-1)                // index into `hits` of the match on screen
const hits = computed(() => findHits(shown.value, qTrim.value, (p) => foldedById.value.get(p.id) || []))
const hitSet = computed(() => new Set(hits.value))
const hiddenHits = computed(() => flaggedOnly.value && qTrim.value ? findHits(phrases.value, qTrim.value, (p) => foldedById.value.get(p.id) || []).length - hits.value.length : 0)
let qTimer = 0
function onQuery(v) {
  query.value = v
  clearTimeout(qTimer)
  qTimer = setTimeout(() => { qTrim.value = v.trim(); startSearch() }, v.trim() ? 200 : 0)
}
// A new query starts at the first match at or after the row being read, as a browser's find does.
function startSearch(go = true) {
  const at = shown.value.length ? rowAt(tops.value, viewTop.value + coveredTop()) : 0
  cur.value = firstHitFrom(hits.value, at)
  if (go && cur.value >= 0) nextTick(() => scrollToRow(hits.value[cur.value]))
}
function step(d) {
  const n = hits.value.length
  if (!n) return
  cur.value = cur.value < 0 ? (d > 0 ? 0 : n - 1) : (cur.value + d + n) % n
  scrollToRow(hits.value[cur.value])
}
// Flagged only changes the list under the matches: start again from where the reader is. (A load does the same after
// it has put the reader back at their place, without moving them: see load().)
watch(flaggedOnly, () => { if (qTrim.value) nextTick(() => startSearch()) })

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
  const enLines = showEnglish.value ? Math.max(1, Math.ceil(((p.en || '').length * 7.4) / textW)) : 0
  return 2 + lines * 22 + enLines * 20 + (marker ? 16 : 0) + (f && (f.flagged || f.note) ? 36 : 0)
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
    const p = list[i]
    const cut = p.cy.lastIndexOf(' ') + 1
    const hit = hitSet.value.has(i)
    const [head, tail] = splitParts(hit ? markParts(p.cy, qTrim.value) : [{ t: p.cy, hit: false }], cut)
    const en = hit ? markParts(p.en || '', qTrim.value) : [{ t: p.en || '', hit: false }]
    out.push({ p, marker, k: keyOf2(p, marker), belt: beltIndex(p.n, total.value), head, tail, en,
      hit, current: hit && hits.value[cur.value] === i, enHit: en.some((s) => s.hit) })
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

// Keep the reader's place (cs #864, for Deborah's Welsh proofread): the id of the top row, per course, in localStorage,
// so a reload lands on the same phrase. It lives in this browser only — there is no server-side per-user place yet.
// The top of the list is never saved as a place, so "Go to top" does not wipe the place the reader came back to.
const placeKey = (code) => `phraseProof:place:${code}`
const cameBack = ref(null)         // { id, n } of the row a load scrolled back to; null = nothing to announce
// How much of the viewport's top the two sticky bars (Popty's navbar + this page's header) cover once scrolled.
const navbarH = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--app-navbar-height')) || 0
const coveredTop = () => navbarH() + (topEl.value?.offsetHeight || 0)
let placeTimer = 0
function savePlace(code) {
  if (course.value !== code || flaggedOnly.value || loading.value || !shown.value.length) return
  const i = rowAt(tops.value, viewTop.value + coveredTop())
  if (i <= 0) return
  try { localStorage.setItem(placeKey(code), shown.value[i].id) } catch { /* private mode */ }
}
function rememberPlace() {
  clearTimeout(placeTimer)
  const code = course.value
  placeTimer = setTimeout(() => savePlace(code), 400)
}
// Closing the tab or switching app inside the 400 ms must not lose the last scroll.
function flushPlace() { clearTimeout(placeTimer); readView(); savePlace(course.value) }
// Rows far from the screen hold estimated heights, so a long jump can land a little off once the rows around it are
// measured; a few more frames put the row right under the header.
let settle = 0
function scrollToRow(i) {
  cancelAnimationFrame(settle)
  const at = () => window.scrollTo(0, i > 0 ? listTop() + tops.value[i] - coveredTop() : 0)
  at(); readView()
  if (i <= 0) return
  let tries = 4
  const again = () => { at(); readView(); if (--tries > 0) settle = requestAnimationFrame(again) }
  settle = requestAnimationFrame(again)
}
// `announce` (a fresh load) shows the "Back to where you were" line; leaving Flagged only restores quietly.
async function restorePlace(announce = false) {
  let id = null
  try { id = localStorage.getItem(placeKey(course.value)) } catch { /* ignore */ }
  const i = id ? shown.value.findIndex((p) => p.id === id) : -1
  if (announce) cameBack.value = i > 0 ? { id, n: shown.value[i].n } : null
  await nextTick()             // the line above changes the sticky header's height; scroll after it is laid out
  scrollToRow(i)
}
async function goBack() {
  const id = cameBack.value?.id
  if (!id) return
  if (flaggedOnly.value) { flaggedOnly.value = false; await nextTick() }
  scrollToRow(shown.value.findIndex((p) => p.id === id))
}
function goTop() { window.scrollTo(0, 0); readView() }

// ---- loading ------------------------------------------------------------------------------------------------------
// Each load gets a generation number; a response for an older one (a slow North list landing after South) is dropped.
let loadGen = 0
async function load() {
  const gen = ++loadGen
  const code = course.value
  loading.value = true; loadError.value = ''; phrases.value = []; legos.value = []; total.value = 0; cameBack.value = null
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
  if (gen === loadGen && !loadError.value) { onWindowResize(); await restorePlace(true); if (qTrim.value) startSearch(false) }
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
  if (qTrim.value) return              // a search is on: the watch on flaggedOnly takes the reader to a match instead
  nextTick(() => { if (v) window.scrollTo(0, 0); else restorePlace() })
}
// Every row changes height at once, so the old measurements are dropped and the row being read is put back on screen.
function setShowEnglish(v) {
  const i = window.scrollY > 0 && shown.value.length ? rowAt(tops.value, viewTop.value + coveredTop()) : -1
  showEnglish.value = v
  try { localStorage.setItem(SHOW_EN_KEY, v ? '1' : '0') } catch { /* private mode */ }
  measured.clear(); measureTick.value++
  if (i > 0) nextTick(() => { window.scrollTo(0, listTop() + tops.value[i] - coveredTop()); readView() })
}

function toggle(id) { if (!showEnglish.value) open[id] = !open[id] }

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
  window.addEventListener('pagehide', flushPlace)
  load()
})
onBeforeUnmount(() => {
  ro?.disconnect()
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onWindowResize)
  window.removeEventListener('pagehide', flushPlace)
  flushPlace()
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
/* Sticks UNDER Popty's own sticky navbar, which publishes its height as --app-navbar-height; at top: 0 the navbar
   covered this header once scrolled, so Flagged only / Export were out of reach mid-list. */
.top { position: sticky; top: var(--app-navbar-height, 0px); z-index: 5; background: var(--pp-bg); padding: 0.5rem 0.25rem 0.35rem; border-bottom: 1px solid var(--pp-line); }
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
.back { display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap; font-size: 0.8rem; color: var(--pp-muted); margin: 0.2rem 0 0; }
.back a { color: var(--pp-en); text-decoration: underline; padding: 0.35rem 0; font-variant-numeric: tabular-nums; }
.back .x { margin-left: auto; border: 0; background: transparent; color: var(--pp-muted); font-size: 1.1rem; line-height: 1; min-width: 36px; min-height: 32px; }
.note { color: var(--pp-muted); padding: 1rem 0.25rem; }
.find { flex-wrap: nowrap; }
.findinp { flex: 1; min-width: 0; font: inherit; font-size: 16px; color: var(--pp-ink); background: #fff; border: 1px solid #94a3b8; border-radius: 8px; padding: 0.3rem 0.55rem; min-height: 36px; }
.findinp::placeholder { color: #64748b; }
.hits { font-size: 0.82rem; color: var(--pp-muted); white-space: nowrap; font-variant-numeric: tabular-nums; }
.pill.nav { min-width: 40px; font-size: 1.1rem; line-height: 1; padding: 0.3rem 0.6rem; }
.pill:disabled { opacity: 0.45; cursor: default; }
/* Matches: the matched letters marked; the match the arrows are on gets a blue edge. #fde68a under #0b1220 is 15.8:1. */
mark { background: #fde68a; color: inherit; border-radius: 2px; }
.row.current { box-shadow: inset 0 0 0 2px #1d4ed8; }
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
