<template>
  <div class="ce">
    <header class="top" ref="topEl">
      <div class="bar">
        <h1>Course editor</h1>
        <select class="pick" :value="course || ''" aria-label="Course" @change="pick($event.target.value)">
          <option value="" disabled>Choose a course…</option>
          <option v-for="c in COURSES" :key="c.code" :value="c.code">{{ c.label }}</option>
        </select>
      </div>
      <div v-if="course" class="bar">
        <button class="pill" :class="{ on: only === 'changes' }" @click="setOnly('changes')">✎ Changes <b>{{ pendingCount }}</b></button>
        <button class="pill" :class="{ on: only === 'flags' }" @click="setOnly('flags')">⚑ Flagged <b>{{ flaggedCount }}</b></button>
        <button v-if="pendingCount" class="pill apply" :disabled="busyAll" @click="applyAll">{{ busyAll ? 'Applying…' : `Apply all (${pendingCount})` }}</button>
        <span class="count">{{ total }} lines</span>
      </div>
      <p v-if="msg" class="msg" :class="{ bad: msgBad }">{{ msg }}</p>
    </header>

    <!-- The course picker: the editor opens on a course chosen here (Korean only for now — the server refuses the rest). -->
    <div v-if="!course" class="picker">
      <p class="note">Pick a course. Changes you make are <b>proposed</b> first; nothing touches the course until an admin taps <b>Apply</b>.</p>
      <button v-for="c in COURSES" :key="c.code" class="pickbtn" @click="pick(c.code)">{{ c.label }} <small>{{ c.code }}</small></button>
    </div>

    <template v-else>
      <p v-if="loading" class="note">Loading {{ course }}…</p>
      <p v-else-if="loadError" class="msg bad">{{ loadError }}</p>
      <p v-else-if="!shown.length" class="note">{{ only === 'changes' ? 'No changes proposed or applied.' : only === 'flags' ? 'Nothing flagged.' : 'No lines.' }}</p>

      <!-- Windowed: only the rows near the viewport are in the DOM; the spacers stand in for the rest. -->
      <div class="list" ref="listEl">
        <div :style="{ height: padTop + 'px' }"></div>
        <div v-for="r in rendered" :key="r.k" class="row" :class="rowClass(r.it)" :data-k="r.k">
          <span class="stripe" :class="{ white: r.belt === 0 }" :style="{ background: BELTS[r.belt].color }"></span>
          <div class="line">
            <span class="num">{{ r.it.t === 'l' ? 'LEGO' : r.it.ghost ? '–' : r.it.n }}</span>
            <div class="text">
              <div class="tx" @click="openRow(r.it)">{{ cur(r.it).tx }}<button v-if="!r.it.ghost" class="flag" :class="{ on: flagOf(r.it).flagged }"
                :aria-label="(flagOf(r.it).flagged ? 'Unflag ' : 'Flag ') + r.it.id" @click.stop="flip(r.it)">{{ flagOf(r.it).flagged ? '⚑' : '⚐' }}</button></div>
              <div class="kn" @click="openRow(r.it)">{{ cur(r.it).kn || '— no English —' }}</div>
              <div v-if="needsAudio(r.it) && !r.it.ghost" class="audio-need">🔇 needs new audio<span v-if="missingOf(r.it).length"> ({{ missingOf(r.it).join(', ') }})</span>
                <button v-if="audioMode === 'tts'" class="mini" @click="renderAsk(r.it)">Make new audio</button>
                <span v-else> — on the booth's Re-record card</span>
              </div>
              <div v-if="renderState[keyOf(r.it)]" class="render">
                <span>{{ renderState[keyOf(r.it)].text }}</span>
                <button v-if="renderState[keyOf(r.it)].canConfirm" class="mini go" @click="renderConfirm(r.it)">{{ renderState[keyOf(r.it)].lib ? 'Link it' : 'Confirm render' }}</button>
              </div>

              <!-- Editing: propose, never write. -->
              <div v-if="editing[keyOf(r.it)]" class="edit">
                <label>{{ targetLabel }}<textarea v-model="editing[keyOf(r.it)].tx" rows="2" lang="ko"></textarea></label>
                <label>English<textarea v-model="editing[keyOf(r.it)].kn" rows="2"></textarea></label>
                <div class="btns">
                  <button class="mini go" :disabled="busy[keyOf(r.it)]" @click="propose(r.it, 'edit')">Propose change</button>
                  <button class="mini warn" :disabled="busy[keyOf(r.it)]" @click="propose(r.it, 'remove')">Propose removal</button>
                  <button class="mini" @click="closeRow(r.it)">Cancel</button>
                </div>
                <input class="noteinp" type="text" :value="flagOf(r.it).note" maxlength="1000" placeholder="Flag note (optional)"
                       @input="onNote(r.it, $event.target.value)" @blur="saveNow(r.it)" />
              </div>
              <div v-else-if="flagOf(r.it).note" class="flagnote">⚑ {{ flagOf(r.it).note }}</div>

              <!-- A proposal: before → after, and the explicit admin step that makes it real. -->
              <div v-if="propOf(r.it)" class="prop" :class="propOf(r.it).status">
                <div class="ph">
                  <b>{{ statusLabel(propOf(r.it)) }}</b>
                  <small>{{ propOf(r.it).status === 'applied' ? `by ${propOf(r.it).appliedBy}` : `by ${propOf(r.it).proposedBy}` }}</small>
                </div>
                <template v-if="propOf(r.it).action === 'remove'"><div class="diff"><s>{{ propOf(r.it).before.target }}</s> — remove this line</div></template>
                <template v-else>
                  <div v-if="propOf(r.it).after.target !== propOf(r.it).before.target" class="diff"><s>{{ propOf(r.it).before.target }}</s> → <ins>{{ propOf(r.it).after.target }}</ins></div>
                  <div v-if="propOf(r.it).after.known !== propOf(r.it).before.known" class="diff en"><s>{{ propOf(r.it).before.known }}</s> → <ins>{{ propOf(r.it).after.known }}</ins></div>
                  <div class="hint">{{ audioHint(propOf(r.it)) }}</div>
                </template>
                <p v-if="propOf(r.it).error" class="msg bad">{{ propOf(r.it).error }}</p>
                <div class="btns">
                  <template v-if="propOf(r.it).status === 'pending'">
                    <button class="mini go" :disabled="busy[keyOf(r.it)]" @click="apply(r.it)">Apply</button>
                    <button class="mini" :disabled="busy[keyOf(r.it)]" @click="discard(r.it)">Discard</button>
                  </template>
                  <template v-else-if="propOf(r.it).status === 'applied'">
                    <button class="mini warn" :disabled="busy[keyOf(r.it)]" @click="undo(r.it)">↶ Undo</button>
                  </template>
                  <template v-else>
                    <button class="mini" :disabled="busy[keyOf(r.it)]" @click="discard(r.it)">Discard</button>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div :style="{ height: padBottom + 'px' }"></div>
      </div>
    </template>
  </div>
</template>

<script setup>
// Course editor (job #116·AK). Aran, 2026-11-21: "In the Popty, I want to be able to go into a course (Korean, for
// example) and make changes to the introduction items and to the practice phrases." His two proof pages (LegoProof.vue,
// PhraseProof.vue) made into one editor: the course in running order, each new LEGO followed by its practice phrases,
// belt stripe, windowed rows, light mode, phone first. A tap opens a line; a change is PROPOSED (stored, nothing in the
// course moves) and becomes real only on an admin's Apply, which goes through Popty's course-edit door with an undo.
// Server: services/course-editor/course-editor-router.cjs.
import { ref, reactive, computed, shallowRef, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiBaseUrl } from '../../services/api'
import { BELTS, beltIndex, prefixTops, rowAt, windowRange } from './phraseProofWindow.js'

// The courses the server allows (EDITOR_COURSES in the router). Korean only for now (Aran, 2026-11-21).
const COURSES = [{ code: 'kor_for_eng', label: 'Korean', target: 'Korean' }]
const route = useRoute()
const router = useRouter()
const course = ref(COURSES.some((c) => c.code === route.params.courseCode) ? route.params.courseCode : null)
const targetLabel = computed(() => COURSES.find((c) => c.code === course.value)?.target || 'Target')
const items = shallowRef([])
const total = ref(0)
const audioMode = ref('tts')
const usesT2 = ref(false)
const loading = ref(false)
const loadError = ref('')
const only = ref('')
const flags = reactive({})       // key -> { flagged, note }
const proposals = reactive({})       // key -> latest proposal for that line
const rows = reactive({})        // key -> { tx, kn, m } once a line changed under us (apply / undo)
const editing = reactive({})
const busy = reactive({})
const renderState = reactive({})
const busyAll = ref(false)
const msg = ref('')
const msgBad = ref(false)
const listEl = ref(null)
const topEl = ref(null)

const base = (code) => `${getApiBaseUrl()}/api/production/${code}/course-editor`
const keyOf = (it) => `${it.t}:${it.id}`
const kindOf = (it) => (it.t === 'l' ? 'lego' : 'phrase')
const NOFLAG = Object.freeze({ flagged: false, note: '' })
const flagOf = (it) => flags[keyOf(it)] || NOFLAG
const propOf = (it) => proposals[keyOf(it)]
const cur = (it) => rows[keyOf(it)] || it
const missingOf = (it) => cur(it).m || []
const needsAudio = (it) => missingOf(it).length > 0 || (propOf(it)?.status === 'applied' && propOf(it)?.needsAudio)
const pendingCount = computed(() => Object.values(proposals).filter((p) => p.status === 'pending').length)
const flaggedCount = computed(() => Object.values(flags).filter((f) => f.flagged).length)
const shown = computed(() => {
  if (only.value === 'changes') return items.value.filter((it) => proposals[keyOf(it)])
  if (only.value === 'flags') return items.value.filter((it) => flags[keyOf(it)]?.flagged)
  return items.value
})
function rowClass(it) {
  const p = propOf(it)
  return { ghost: !!it.ghost, lego: it.t === 'l', flagged: flagOf(it).flagged, pending: p?.status === 'pending', applied: p?.status === 'applied', removed: p?.status === 'applied' && p.action === 'remove' }
}
// The server's spokenForm (services/course-editor/course-editor-ops.cjs), mirrored for the hint only — Apply decides on
// the server. Apostrophes/hyphens INSIDE a word join it ("don't" = "dont"); every other mark separates words.
const spoken = (s) => String(s || '').toLowerCase().replace(/(?<=[\p{L}\p{N}])['‘’ʼ\-‐‑]+(?=[\p{L}\p{N}])/gu, '')
  .replace(/[\p{P}\p{S}]+/gu, ' ').replace(/\s+/g, ' ').trim()
const same = (a, b) => spoken(a) === spoken(b)

/**
 * GHOST ROWS (Astra #120·AK, fix #121·AK). An applied removal has no live row any more, so after a reload its Undo had
 * nowhere to show and the removal became unreversible from the page. Each applied removal whose line is gone is put back
 * into the list as a struck-through ghost at its old place: a phrase under its LEGO, among that LEGO's phrases by id; a
 * LEGO among its seed's LEGOs by id (its phrases went with it and come back with its Undo). A line whose LEGO or seed is
 * gone too goes at the end — never dropped.
 */
function withGhosts(list, props) {
  const out = list.slice()
  const have = new Set(out.map(keyOf))
  for (const p of props) {
    if (p.status !== 'applied' || p.action !== 'remove') continue
    const t = p.kind === 'lego' ? 'l' : 'p'
    if (have.has(`${t}:${p.key}`)) continue
    const ghost = Object.freeze({ t, id: p.key, n: 0, tx: p.before.target, kn: p.before.known || '', m: null, ghost: true })
    let at = -1
    if (t === 'p') {
      const legoId = p.key.match(/^S\d+L\d+/)?.[0]
      const li = out.findIndex((it) => it.t === 'l' && it.id === legoId)
      if (li >= 0) {
        at = li + 1
        while (at < out.length && out[at].t === 'p' && out[at].id < p.key) at++
      }
    } else {
      const seed = p.key.match(/^S\d+/)[0]
      let last = -1
      for (let i = 0; i < out.length; i++) {
        if (out[i].t !== 'l' || !out[i].id.startsWith(seed + 'L')) continue
        if (out[i].id > p.key) { at = i; break }
        last = i
      }
      if (at < 0 && last >= 0) { at = last + 1; while (at < out.length && out[at].t === 'p') at++ }
    }
    if (at < 0) at = out.length
    out.splice(at, 0, Object.freeze({ ...ghost, n: at > 0 ? out[at - 1].n : 1 }))
    have.add(`${t}:${p.key}`)
  }
  return out
}
function say(text, bad = false) { msg.value = text; msgBad.value = bad }
function statusLabel(p) {
  return { pending: 'Proposed — not applied', applied: p.action === 'remove' ? 'Removed (applied)' : 'Applied ✓', stale: 'Stale — the live line changed', failed: 'Failed' }[p.status] || p.status
}
function audioHint(p) {
  if (p.status === 'applied') {
    if (!p.needsAudio) return 'Same spoken words: the recording was kept.'
    return audioMode.value === 'tts' ? (p.audioQueued ? 'Words changed: new audio queued for the next audio pass.' : 'Words changed: needs new audio.') : 'Words changed: on the booth\'s Re-record card.'
  }
  return same(p.before.target, p.after.target) && same(p.before.known, p.after.known)
    ? 'Capitals/punctuation only: on Apply the recording is kept.'
    : 'Spoken words change: on Apply this line will need new audio.'
}

// ---- windowing (as PhraseProof.vue) --------------------------------------------------------------------------------
const measured = new Map()
const measureTick = ref(0)
const width = ref(360)
const viewTop = ref(0)
const viewH = ref(800)
const OVERSCAN = 700
function estimate(it) {
  const textW = Math.max(120, width.value - 60)
  const lines = (s, px) => Math.max(1, Math.ceil(((s || '').length * px + 26) / textW))
  return 6 + lines(it.tx, 15) * 23 + lines(it.kn, 8) * 19 + (it.m ? 24 : 0)
}
const tops = computed(() => {
  void measureTick.value
  const list = shown.value
  const h = new Float64Array(list.length)
  for (let i = 0; i < list.length; i++) h[i] = measured.get(keyOf(list[i])) ?? estimate(list[i])
  return prefixTops(h)
})
const range = computed(() => windowRange(tops.value, viewTop.value, viewTop.value + viewH.value, OVERSCAN))
const padTop = computed(() => tops.value[range.value[0]] || 0)
const padBottom = computed(() => tops.value[tops.value.length - 1] - (tops.value[range.value[1]] || 0))
const rendered = computed(() => {
  const list = shown.value
  const [a, b] = range.value
  const out = []
  for (let i = a; i < b; i++) out.push({ it: list[i], k: keyOf(list[i]), belt: beltIndex(list[i].n, total.value) })
  return out
})
const listTop = () => (listEl.value ? listEl.value.getBoundingClientRect().top + window.scrollY : 0)
function readView() { viewTop.value = window.scrollY - listTop(); viewH.value = window.innerHeight }
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
function observeRows() {
  if (!ro || !listEl.value) return
  ro.disconnect()
  for (const el of listEl.value.querySelectorAll('.row')) ro.observe(el)
}
watch(rendered, () => nextTick(observeRows))
let raf = 0
function onScroll() { if (!raf) raf = requestAnimationFrame(() => { raf = 0; readView(); rememberPlace() }) }
function onWindowResize() {
  const w = listEl.value ? listEl.value.clientWidth : 360
  if (Math.abs(w - width.value) > 1) { width.value = w; measured.clear(); measureTick.value++ }
  readView()
}
const placeKey = (code) => `courseEditor:place:${code}`
const navbarH = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--app-navbar-height')) || 0
const coveredTop = () => navbarH() + (topEl.value?.offsetHeight || 0)
let placeTimer = 0
function rememberPlace() {
  if (only.value || loading.value || !shown.value.length) return
  clearTimeout(placeTimer)
  const code = course.value
  placeTimer = setTimeout(() => {
    const it = shown.value[rowAt(tops.value, viewTop.value + coveredTop())]
    try { if (it && course.value === code) localStorage.setItem(placeKey(code), keyOf(it)) } catch { /* private mode */ }
  }, 400)
}
async function restorePlace() {
  let k = null
  try { k = localStorage.getItem(placeKey(course.value)) } catch { /* ignore */ }
  const i = k ? shown.value.findIndex((it) => keyOf(it) === k) : -1
  await nextTick()
  window.scrollTo(0, i > 0 ? listTop() + tops.value[i] - coveredTop() : 0)
  readView()
}

// ---- loading -------------------------------------------------------------------------------------------------------
let loadGen = 0
const clear = (o) => { for (const k of Object.keys(o)) delete o[k] }
async function load() {
  const gen = ++loadGen
  const code = course.value
  loading.value = true; loadError.value = ''; items.value = []; total.value = 0
  for (const o of [flags, proposals, rows, editing, busy, renderState]) clear(o)
  measured.clear()
  try {
    const r = await fetch(base(code) + '/')
    const body = await r.json().catch(() => ({}))
    if (gen !== loadGen) return
    if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`)
    for (const it of body.items) if (it.f) flags[keyOf(it)] = { ...it.f }
    for (const p of body.proposals || []) proposals[`${p.kind === 'lego' ? 'l' : 'p'}:${p.key}`] = p
    audioMode.value = body.audioMode || 'tts'
    usesT2.value = !!body.usesTarget2
    total.value = body.total
    items.value = Object.freeze(withGhosts(body.items.map((it) => Object.freeze({ t: it.t, id: it.id, n: it.n, tx: it.tx, kn: it.kn, m: it.m || null })), body.proposals || []))
  } catch (e) {
    if (gen === loadGen) loadError.value = `Could not load ${code}: ${e.message}`
  } finally { if (gen === loadGen) loading.value = false }
  if (gen === loadGen && !loadError.value) { onWindowResize(); await restorePlace() }
}
function pick(code) {
  if (!code || code === course.value) return
  course.value = code
  router.replace({ name: 'LiveCourseEditor', params: { courseCode: code } })
  only.value = ''
  load()
}
function setOnly(v) {
  only.value = only.value === v ? '' : v
  nextTick(() => { if (only.value) window.scrollTo(0, 0); else restorePlace() })
}

// ---- editing → proposals -------------------------------------------------------------------------------------------
async function call(method, path, body) {
  const r = await fetch(base(course.value) + path, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  const out = await r.json().catch(() => ({}))
  return { ok: r.ok, status: r.status, body: out }
}
function openRow(it) {
  if (it.ghost) return // a removed line: nothing to edit until its Undo brings it back
  const k = keyOf(it)
  if (editing[k]) return
  editing[k] = { tx: cur(it).tx, kn: cur(it).kn }
}
function closeRow(it) { delete editing[keyOf(it)] }
async function propose(it, action) {
  const k = keyOf(it)
  const e = editing[k]
  const body = { kind: kindOf(it), id: it.id, action }
  if (action === 'edit') {
    if (e.tx.trim() !== cur(it).tx) body.target = e.tx
    if (e.kn.trim() !== cur(it).kn) body.known = e.kn
    if (body.target == null && body.known == null) return say('Nothing changed on that line.', true)
  }
  busy[k] = true
  try {
    const r = await call('POST', '/proposals', body)
    if (!r.ok) throw new Error(r.body.error || `HTTP ${r.status}`)
    proposals[k] = r.body.proposal
    delete editing[k]
    say(`${it.id}: proposed — nothing in the course has changed yet. Tap Apply to make it real.`)
  } catch (err) { say(`${it.id}: not proposed — ${err.message}`, true) } finally { delete busy[k] }
}
async function discard(it) {
  const k = keyOf(it)
  busy[k] = true
  try {
    const r = await call('DELETE', `/proposals/${proposals[k].id}`)
    if (!r.ok) throw new Error(r.body.error || `HTTP ${r.status}`)
    delete proposals[k]
    say(`${it.id}: discarded.`)
  } catch (err) { say(`${it.id}: ${err.message}`, true) } finally { delete busy[k] }
}
function takeRow(it, row) {
  if (!row) return
  const missing = ['known', 'target1', ...(usesT2.value ? ['target2'] : [])].filter((s) => !row.audio[s])
  rows[keyOf(it)] = { tx: row.tx, kn: row.kn, m: missing.length ? missing : null }
}
async function apply(it) {
  const k = keyOf(it)
  busy[k] = true
  try {
    const r = await call('POST', `/proposals/${proposals[k].id}/apply`)
    if (r.body.proposal) proposals[k] = r.body.proposal
    if (!r.ok) throw new Error(r.body.error || `HTTP ${r.status}`)
    takeRow(it, r.body.row)
    say(`${it.id}: applied. ↶ Undo is on the line.`)
    return true
  } catch (err) { say(`${it.id}: not applied — ${err.message}`, true); return false } finally { delete busy[k] }
}
async function applyAll() {
  const list = items.value.filter((it) => proposals[keyOf(it)]?.status === 'pending')
  if (!list.length || !confirm(`Apply ${list.length} change(s) to the live course?`)) return
  busyAll.value = true
  let done = 0
  for (const it of list) if (await apply(it)) done++
  busyAll.value = false
  say(`Applied ${done} of ${list.length}.${done < list.length ? ' The rest are marked on their lines.' : ''}`, done < list.length)
}
async function undo(it) {
  const k = keyOf(it)
  busy[k] = true
  try {
    const r = await call('POST', `/proposals/${proposals[k].id}/undo`)
    if (!r.ok) throw new Error(r.body.error || `HTTP ${r.status}`)
    delete proposals[k]
    if (r.body.row) takeRow(it, r.body.row)
    say(`${it.id}: undone — the line is back as it was.`)
    if (it.ghost) load() // the line is live again: re-read it in its real place
  } catch (err) { say(`${it.id}: not undone — ${err.message}`, true) } finally { delete busy[k] }
}

// ---- make new audio: a dry run first (library + cost), a second tap renders ----------------------------------------
const roleFor = (it) => missingOf(it).find((s) => s !== 'known') || missingOf(it)[0] || 'target1'
async function renderAsk(it) {
  const k = keyOf(it)
  const role = roleFor(it)
  renderState[k] = { text: `Checking ${role}…` }
  const r = await call('POST', '/render', { kind: kindOf(it), id: it.id, role })
  const b = r.body
  if (!r.ok || b.ok === false) { renderState[k] = { text: `Refused: ${b.code || r.status} — ${b.error || ''}` }; return }
  // A dry run answers wouldSpendChars (charsSpent is always 0 on a dry run — shared/audio-render-entry.cjs). A library hit
  // costs nothing but is not linked yet: its confirm tap links it into this line's slot.
  const lib = b.source === 'library'
  const n = b.wouldSpendChars ?? b.chars
  renderState[k] = { role, lib, canConfirm: true,
    text: lib ? `${role}: found in the library (no cost) — tap to link it to this line.` : `${role}: would render ${n == null ? 'an unknown number of' : Number(n).toLocaleString()} characters.` }
}
async function renderConfirm(it) {
  const k = keyOf(it)
  const role = renderState[k]?.role || roleFor(it)
  const lib = renderState[k]?.lib
  if (!confirm(lib ? `Link the library ${role} clip to ${it.id}? No cost.` : `Render new ${role} audio for ${it.id}? This spends TTS characters.`)) return
  renderState[k] = { text: lib ? 'Linking…' : 'Rendering…' }
  const r = await call('POST', '/render', { kind: kindOf(it), id: it.id, role, confirm: true })
  const b = r.body
  if (!r.ok || b.ok === false) { renderState[k] = { text: `Refused: ${b.code || r.status} — ${b.error || ''}` }; return }
  const linked = b.slotLinked === true || b.slotLinked === 'already'
  renderState[k] = { text: linked ? `Done: ${b.source}, linked to this line's ${role}.` : `${b.source} ${b.audioId || ''} — NOT linked: ${b.slotNote || 'no clip id came back'}` }
  if (linked) { const m = missingOf(it).filter((s) => s !== role); rows[k] = { ...cur(it), m: m.length ? m : null } }
}

// ---- flags (the proof pages' tables, unchanged) ---------------------------------------------------------------------
const timers = {}
async function saveFlag(code, it, f) {
  const r = await fetch(base(code) + '/flag', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: kindOf(it), id: it.id, flagged: f.flagged, note: f.note }) })
  if (!r.ok) { const b = await r.json().catch(() => ({})); say(`${it.id}: flag not saved — ${b.error || r.status}`, true) }
}
const current = (it) => flags[keyOf(it)] || (flags[keyOf(it)] = { flagged: false, note: '' })
function flip(it) { const f = current(it); f.flagged = !f.flagged; saveFlag(course.value, it, { ...f }) }
function onNote(it, v) {
  const f = current(it); f.note = v
  const k = keyOf(it), code = course.value
  clearTimeout(timers[k])
  timers[k] = setTimeout(() => { delete timers[k]; saveFlag(code, it, { ...f }) }, 700)
}
function saveNow(it) { const k = keyOf(it); if (!timers[k]) return; clearTimeout(timers[k]); delete timers[k]; saveFlag(course.value, it, { ...current(it) }) }

onMounted(() => {
  if (typeof ResizeObserver !== 'undefined') ro = new ResizeObserver(onResized)
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onWindowResize)
  if (course.value) load()
})
onBeforeUnmount(() => {
  ro?.disconnect()
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onWindowResize)
})
</script>

<style scoped>
/* Own light palette, as the proof pages: dark ink on white whatever Popty's theme (Aran uses light mode). */
.ce {
  --ink: #0b1220; --muted: #475569; --line: #cbd5e1; --en: #1e40af; --amber: #b45309; --good: #047857; --bad: #b91c1c;
  max-width: 760px; min-height: 100vh; margin: 0 auto; padding: 0 0.5rem 5rem; background: #fff; color: var(--ink); color-scheme: light;
}
/* Under Popty's sticky navbar (job #562): top 0 would slide this header beneath it. */
.top { position: sticky; top: var(--app-navbar-height, 0px); z-index: 5; background: #fff; padding: 0.5rem 0.25rem 0.35rem; border-bottom: 1px solid var(--line); }
.bar { display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap; margin: 0.2rem 0; }
h1 { font-size: 1.15rem; margin: 0; flex: 1; }
button { font: inherit; color: inherit; cursor: pointer; }
.pick { font: inherit; font-size: 16px; padding: 0.3rem 0.5rem; min-height: 38px; border: 1px solid var(--line); border-radius: 10px; background: #fff; color: var(--ink); }
.pill { background: #f1f5f9; border: 1px solid var(--line); border-radius: 999px; padding: 0.3rem 0.7rem; min-height: 36px; font-size: 0.82rem; white-space: nowrap; color: var(--ink); }
.pill.on { background: #f59e0b; border-color: transparent; color: #111; }
.pill.apply { background: #047857; color: #fff; border-color: transparent; }
.pill:disabled { opacity: 0.6; }
.count { font-size: 0.8rem; color: var(--muted); margin-left: auto; white-space: nowrap; }
.msg { font-size: 0.85rem; color: var(--good); margin: 0.25rem 0 0; }
.msg.bad { color: var(--bad); }
.note { color: var(--muted); padding: 1rem 0.25rem; }
.picker { padding: 0.5rem 0.25rem; display: flex; flex-direction: column; gap: 0.6rem; }
.pickbtn { text-align: left; font-size: 1.1rem; padding: 0.9rem 1rem; border: 1px solid var(--line); border-radius: 12px; background: #f8fafc; color: var(--ink); }
.pickbtn small { color: var(--muted); margin-left: 0.4rem; font-size: 0.8rem; }

.list { overflow-anchor: none; }
.row { position: relative; padding: 4px 0 4px 11px; border-top: 1px solid #eef2f6; }
.row.lego { background: #f1f5f9; border-top: 1px solid #94a3b8; }
.row.flagged { background: #fff7e6; }
.row.pending { box-shadow: inset 3px 0 0 #1d4ed8; }
.row.removed .tx, .row.removed .kn { text-decoration: line-through; color: #94a3b8; }
.stripe { position: absolute; left: 0; top: 0; bottom: 0; width: 5px; }
.stripe.white { box-shadow: inset 1px 0 #94a3b8, inset -1px 0 #94a3b8; }
.line { display: flex; align-items: baseline; gap: 0.35rem; }
.num { flex: none; width: 2.4rem; text-align: right; font-size: 0.66rem; color: var(--muted); font-variant-numeric: tabular-nums; }
.row.lego .num { font-weight: 700; color: #334155; }
.text { flex: 1; min-width: 0; }
.tx { font-size: 17px; line-height: 23px; overflow-wrap: anywhere; cursor: pointer; }
.row.lego .tx { font-weight: 600; }
.kn { font-size: 0.88rem; line-height: 19px; color: var(--en); cursor: pointer; overflow-wrap: anywhere; }
.flag { position: relative; display: inline-block; margin-left: 0.3rem; padding: 0 0.15rem; border: 0; background: transparent; font-size: 15px; line-height: 22px; vertical-align: top; color: #94a3b8; }
.flag::after { content: ''; position: absolute; inset: -9px -14px; }
.flag.on { color: var(--amber); }
.audio-need { font-size: 0.78rem; color: var(--bad); margin-top: 2px; display: flex; flex-wrap: wrap; gap: 0.3rem; align-items: center; }
.render { font-size: 0.78rem; color: var(--muted); display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap; }
.edit { margin: 6px 0; display: flex; flex-direction: column; gap: 0.35rem; }
.edit label { font-size: 0.72rem; color: var(--muted); display: flex; flex-direction: column; gap: 2px; }
.edit textarea { font: inherit; font-size: 16px; line-height: 1.3; color: var(--ink); background: #fff; border: 1px solid #64748b; border-radius: 8px; padding: 0.35rem 0.5rem; resize: vertical; }
.btns { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-top: 4px; }
.mini { font-size: 0.82rem; padding: 0.3rem 0.75rem; min-height: 34px; border-radius: 8px; border: 1px solid var(--line); background: #f8fafc; color: var(--ink); }
.mini.go { background: #1d4ed8; color: #fff; border-color: transparent; }
.mini.warn { background: #fff; color: var(--bad); border-color: #fca5a5; }
.mini:disabled { opacity: 0.55; }
.noteinp { font: inherit; font-size: 16px; color: var(--ink); background: #fff; border: 1px solid #94a3b8; border-radius: 6px; padding: 0.25rem 0.45rem; }
.flagnote { font-size: 0.78rem; color: var(--amber); }
.prop { margin: 6px 0 4px; padding: 0.4rem 0.5rem; border-radius: 8px; border: 1px solid #93c5fd; background: #eff6ff; font-size: 0.86rem; }
.prop.applied { border-color: #86efac; background: #f0fdf4; }
.prop.stale, .prop.failed { border-color: #fca5a5; background: #fef2f2; }
.ph { display: flex; gap: 0.4rem; align-items: baseline; flex-wrap: wrap; }
.ph small { color: var(--muted); }
.diff { overflow-wrap: anywhere; margin-top: 2px; }
.diff.en { color: var(--en); }
.diff s { color: #b91c1c; }
.diff ins { color: #047857; text-decoration: none; font-weight: 600; }
.hint { font-size: 0.75rem; color: var(--muted); margin-top: 2px; }
</style>
