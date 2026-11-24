<template>
  <div class="ft">
    <header class="top">
      <div class="bar">
        <h1>Fine-tuning</h1>
        <span class="who" :class="{ view: !canEdit }">{{ canEdit ? '🔒 Aran only' : '👁 View only' }}</span>
        <select class="pick" :value="course || ''" aria-label="Course" @change="pick($event.target.value)">
          <option value="" disabled>Course…</option>
          <option v-for="c in COURSES" :key="c.code" :value="c.code">{{ c.label }}</option>
        </select>
      </div>
      <div v-if="course && !loading && !loadError" class="bar">
        <button class="pill" :class="{ on: onlyHand }" @click="toggleHand">✎ Hand-edited <b>{{ handCount }}</b></button>
        <span class="count">{{ rounds.length }} intro items</span>
      </div>
      <p v-if="course && !loading && !lockReady" class="lockwarn">
        The hand-edit lock is not set up yet (its database change is waiting for Tom's go). Text edits still apply, but are
        not yet protected from regeneration; drag order, copy, add and the intro wording open once it is.
      </p>
      <p v-if="msg" class="msg" :class="{ bad: msgBad }">{{ msg }}</p>
    </header>

    <div v-if="!course" class="picker">
      <button v-for="c in COURSES" :key="c.code" class="pickbtn" @click="pick(c.code)">{{ c.label }} <small>{{ c.code }}</small></button>
    </div>
    <p v-else-if="loading" class="note">Loading {{ course }}…</p>
    <p v-else-if="loadError" class="msg bad">{{ loadError }}</p>

    <!-- ============================== THE LIST: intro items, 20 to a page ============================== -->
    <section v-else-if="!open">
      <div class="pager">
        <span class="pg">{{ pageFrom }}–{{ pageTo }} of {{ listed.length }}</span>
        <button class="mini" :disabled="page === 0" @click="setPage(page - 1)">‹ Prev</button>
        <button class="mini" :disabled="pageTo >= listed.length" @click="setPage(page + 1)">Next ›</button>
        <form class="jump" @submit.prevent="jump"><input v-model="jumpTo" inputmode="numeric" placeholder="Round #" aria-label="Go to round" /><button class="mini">Go</button></form>
      </div>
      <p v-if="!listed.length" class="note">{{ onlyHand ? 'Nothing hand-edited yet.' : 'No intro items.' }}</p>
      <button v-for="r in pageRounds" :key="r.n" class="item" :class="{ hand: roundHasHand(r) }" @click="openRound(r.n)">
        <span class="n">{{ r.n }}</span>
        <span class="body">
          <span class="words big">
            <span class="ko" lang="ko">{{ L(r).tx }}</span><span v-if="L(r).ro" class="ro">{{ L(r).ro }}</span><span class="en">{{ L(r).kn }}</span>
          </span>
          <span class="sub">{{ r.p.length }} practice · {{ r.r.length }} revisit<span v-if="roundHasHand(r)" class="tag hand">✎ Hand-edited</span><span v-if="L(r).m" class="tag mute">🔇 audio</span></span>
        </span>
        <span class="chev">›</span>
      </button>
      <div v-if="listed.length > PAGE" class="pager">
        <button class="mini" :disabled="page === 0" @click="setPage(page - 1)">‹ Prev</button>
        <button class="mini" :disabled="pageTo >= listed.length" @click="setPage(page + 1)">Next ›</button>
      </div>
    </section>

    <!-- ============================== ONE ROUND ============================== -->
    <section v-else class="round">
      <div class="crumb">
        <button class="back" @click="closeRound">‹ Intro items</button>
        <span>·</span><b>Round {{ open.n }}</b><small>{{ open.l }}</small>
        <span class="step">
          <button class="mini" :disabled="open.n <= 1" @click="openRound(open.n - 1)">‹</button>
          <button class="mini" :disabled="!roundByN.get(open.n + 1)" @click="openRound(open.n + 1)">›</button>
        </span>
      </div>

      <!-- INTRO ITEM -->
      <h2>Intro item</h2>
      <div class="row lego" :class="{ hand: !!lego.lock }">
        <div class="main">
          <div class="words big"><span class="lab">LEGO</span><span class="ko" lang="ko">{{ lego.tx }}</span><span v-if="lego.ro" class="ro">{{ lego.ro }}</span><span class="en">{{ lego.kn }}</span></div>
          <div class="intro">
            <div class="introlab">Full introduction</div>
            <div v-if="introText" class="introtext">{{ introText }}</div>
            <div v-else class="introtext none">{{ lego.clip === null ? 'No spoken introduction is linked to this item.' : 'The introduction clip carries no text.' }}</div>
            <div v-if="lego.intro != null && lego.clip != null && lego.intro !== lego.clip" class="introold">
              The intro audio still says: “{{ readable(lego.clip) }}”
              <button v-if="canEdit && audioMode === 'tts'" class="mini" @click="renderAsk('lego', open.l, 'presentation')">Make new intro audio</button>
            </div>
            <div v-if="renderState[`lego:${open.l}:presentation`]" class="render">
              <span>{{ renderState[`lego:${open.l}:presentation`].text }}</span>
              <button v-if="renderState[`lego:${open.l}:presentation`].canConfirm" class="mini go" @click="renderConfirm('lego', open.l, 'presentation')">{{ renderState[`lego:${open.l}:presentation`].lib ? 'Link it' : 'Confirm render' }}</button>
            </div>
          </div>
          <LineTags :line="lego" />
          <AudioNeed v-if="lego.m" kind="lego" :id="open.l" :line="lego" />
          <EditForm v-if="editing[`lego:${open.l}`]" :k="`lego:${open.l}`" kind="lego" :id="open.l" />
          <PropBox :p="propFor('lego', open.l)" />
        </div>
        <button v-if="canEdit" class="ic" aria-label="Edit intro item" @click="startEdit('lego', open.l, lego)">✎</button>
      </div>

      <h2>Debut <small>the intro item on its own, played once</small></h2>
      <div class="row quiet"><div class="main"><div class="words"><span class="dash">–</span><span class="ko" lang="ko">{{ lego.tx }}</span><span v-if="lego.ro" class="ro">{{ lego.ro }}</span><span class="en">{{ lego.kn }}</span></div></div></div>

      <!-- PRACTICE -->
      <h2>Practice phrases <span class="cnt">{{ practice.length }}</span><small v-if="canEdit && lockReady">drag ⠿ to reorder</small></h2>
      <div v-if="lego.order" class="ordertag">✎ Order hand-set · overrides seed rules</div>
      <PropBox v-if="propOrder" :p="propOrder" />
      <div class="dlist" ref="dlist">
        <div v-for="(id, i) in practice" :key="id" class="row" :data-id="id"
             :class="{ hand: !!P(id).lock, dragging: drag && drag.id === id }">
          <button v-if="canEdit && lockReady" class="handle" aria-label="Drag to reorder" @pointerdown="dragStart($event, id)">⠿</button>
          <span class="num">{{ i + 1 }}</span>
          <div class="main">
            <div class="words"><span class="ko" lang="ko">{{ P(id).tx }}</span><span v-if="P(id).ro" class="ro">{{ P(id).ro }}</span><span class="en">{{ P(id).kn }}</span></div>
            <LineTags :line="P(id)" :prop="newLineProp(id)" />
            <AudioNeed v-if="P(id).m" kind="phrase" :id="id" :line="P(id)" />
            <EditForm v-if="editing[`phrase:${id}`]" :k="`phrase:${id}`" kind="phrase" :id="id" />
            <PropBox :p="propFor('phrase', id) || newLineProp(id)" />
          </div>
          <span v-if="canEdit" class="acts">
            <button v-if="lockReady" class="ic" aria-label="Copy" title="Copy" @click="copy(id)">⧉</button>
            <button class="ic" aria-label="Edit" @click="startEdit('phrase', id, P(id))">✎</button>
          </span>
        </div>
      </div>
      <PropBox v-for="p in pendingNew" :key="p.id" :p="p" />
      <div v-if="canEdit && lockReady">
        <div v-if="adding" class="addform">
          <div class="addlab">New practice phrase</div>
          <label>Korean<input v-model="adding.target" lang="ko" placeholder="Korean…" /></label>
          <label>Romanisation<input v-model="adding.roman" placeholder="romanisation (optional)" /></label>
          <label>English<input v-model="adding.known" placeholder="English…" /></label>
          <div class="btns">
            <button class="mini go" :disabled="busy.add" @click="proposeAdd">Propose</button>
            <button class="mini" @click="adding = null">Cancel</button>
          </div>
          <p class="hint">Added at the end of the practice phrases; drag to place it. Hand-edited from the start. Needs new audio.</p>
        </div>
        <button v-else class="addbtn" @click="adding = { target: '', roman: '', known: '' }">＋ Add practice phrase</button>
      </div>

      <!-- REVISITS (read-only here: a revisit is the same line as in its own round) -->
      <h2>Revisits <span class="cnt">{{ open.r.length + open.s.length }}</span></h2>
      <p v-if="!open.r.length && !open.s.length" class="note sm">None in this round.</p>
      <div v-for="([id, from], i) in open.r" :key="'r' + i" class="row revisit">
        <span class="num">{{ i + 1 }}</span>
        <div class="main">
          <div class="words"><span class="ko" lang="ko">{{ P(id).tx }}</span><span v-if="P(id).ro" class="ro">{{ P(id).ro }}</span><span class="en">{{ P(id).kn }}</span></div>
          <div class="revtag"><span class="tag amber">↺ Revisit · from round {{ from }}</span><button class="link" @click="openRound(from)">edit it in round {{ from }} ›</button></div>
        </div>
      </div>
      <div v-for="([seed, from], i) in open.s" :key="'s' + i" class="row revisit">
        <span class="num">{{ open.r.length + i + 1 }}</span>
        <div class="main"><div class="words"><span class="en">The whole sentence of seed {{ seed }}</span></div>
          <div class="revtag"><span class="tag amber">↺ Seed revisit · from round {{ from }}</span></div></div>
      </div>

      <!-- ROUND-OFF -->
      <h2 class="grey">Round-off <small>played at the end of the round</small></h2>
      <div v-for="(id, i) in open.o" :key="'o' + i" class="row roundoff" :class="{ hand: !!P(id).lock }">
        <span class="num">{{ i + 1 }}</span>
        <div class="main">
          <div class="words"><span class="ko" lang="ko">{{ P(id).tx }}</span><span v-if="P(id).ro" class="ro">{{ P(id).ro }}</span><span class="en">{{ P(id).kn }}</span></div>
          <LineTags :line="P(id)" />
          <AudioNeed v-if="P(id).m" kind="phrase" :id="id" :line="P(id)" />
          <EditForm v-if="editing[`phrase:${id}`]" :k="`phrase:${id}`" kind="phrase" :id="id" />
          <PropBox :p="propFor('phrase', id)" />
        </div>
        <span v-if="canEdit" class="acts"><button class="ic" aria-label="Edit" @click="startEdit('phrase', id, P(id))">✎</button></span>
      </div>

      <!-- NOT HEARD: this round's lines past the 7 practice places -->
      <template v-if="open.u.length">
        <h2 class="grey">Not heard in this round <span class="cnt">{{ open.u.length }}</span><small>past the 7 practice places</small></h2>
        <div v-for="id in open.u" :key="'u' + id" class="row roundoff" :class="{ hand: !!P(id).lock }">
          <span class="num">–</span>
          <div class="main">
            <div class="words"><span class="ko" lang="ko">{{ P(id).tx }}</span><span v-if="P(id).ro" class="ro">{{ P(id).ro }}</span><span class="en">{{ P(id).kn }}</span></div>
            <LineTags :line="P(id)" :prop="newLineProp(id)" />
            <EditForm v-if="editing[`phrase:${id}`]" :k="`phrase:${id}`" kind="phrase" :id="id" />
            <PropBox :p="propFor('phrase', id) || newLineProp(id)" />
          </div>
          <span v-if="canEdit" class="acts"><button class="ic" aria-label="Edit" @click="startEdit('phrase', id, P(id))">✎</button></span>
        </div>
      </template>
    </section>
  </div>
</template>

<script setup>
// FINE-TUNING (job #128·AL, from the approved mockup #106·AL; extends the course editor of job #116·AK).
// Aran, 2026-11-24: his hand edits ALWAYS take priority over seed-derived generation. This page shows the course as the
// learner hears it — intro items in round order, 20 to a page; a round opens to its intro item (with the words of its
// spoken introduction), the debut, the practice phrases (drag to reorder, copy, add), the revisits from earlier rounds
// (read-only, "edit it in round N") and the round-off. Every change is PROPOSED first and becomes real only on Apply,
// with Undo — the editor's own semantics. Only Aran may change anything (the server says so too); light mode always.
// Desktop: Hangul · romanisation · English on one line (Aran: "could all be on one line"); a phone stacks them.
// Server: services/course-editor/course-editor-router.cjs (+ round-view.cjs, which mirrors the player's round shape).
import { ref, reactive, computed, shallowRef, h, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiBaseUrl } from '../../services/api'

const COURSES = [{ code: 'kor_for_eng', label: 'Korean' }]
const PAGE = 20
const route = useRoute()
const router = useRouter()
const course = ref(COURSES.some((c) => c.code === route.params.courseCode) ? route.params.courseCode : null)
const rounds = shallowRef([])
const legos = shallowRef({})
const phrases = shallowRef({})
const proposals = shallowRef([])
const audioMode = ref('tts')
const lockReady = ref(false)
const canEdit = ref(false)
const loading = ref(false)
const loadError = ref('')
const onlyHand = ref(false)
const page = ref(0)
const jumpTo = ref('')
const editing = reactive({})
const busy = reactive({})
const renderState = reactive({})
const adding = ref(null)
const msg = ref('')
const msgBad = ref(false)
const dlist = ref(null)
const localOrder = ref(null)   // the practice order while a drag is in progress / just dropped
const drag = ref(null)

const base = (code) => `${getApiBaseUrl()}/api/production/${code}/course-editor`
const say = (t, bad = false) => { msg.value = t; msgBad.value = bad }
const NONE = Object.freeze({ tx: '', kn: '', ro: '' })
const L = (r) => legos.value[r.l] || NONE
const P = (id) => phrases.value[id] || NONE
const roundByN = computed(() => new Map(rounds.value.map((r) => [r.n, r])))
const roundHasHand = (r) => { const l = L(r); return !!(l.lock || l.order || [...r.p, ...r.o, ...r.u].some((id) => P(id).lock)) }
const handCount = computed(() => Object.values(legos.value).filter((l) => l.lock || l.order).length + Object.values(phrases.value).filter((p) => p.lock).length)
const listed = computed(() => (onlyHand.value ? rounds.value.filter(roundHasHand) : rounds.value))
const pageRounds = computed(() => listed.value.slice(page.value * PAGE, page.value * PAGE + PAGE))
const pageFrom = computed(() => (listed.value.length ? page.value * PAGE + 1 : 0))
const pageTo = computed(() => Math.min(listed.value.length, page.value * PAGE + PAGE))
const open = computed(() => { const n = Number(route.query.round); return n ? roundByN.value.get(n) || null : null })
const lego = computed(() => (open.value ? L(open.value) : NONE))
// The intro clip's text is the TTS script, SSML and all ("…, is: <break time="300ms"/>"): shown readable, pauses marked.
const readable = (s) => String(s || '').replace(/<break[^>]*\/?>/g, ' ‹pause› ').replace(/<[^>]+>/g, '').replace(/(\s*‹pause›\s*)+/g, ' ‹pause› ').replace(/\s+/g, ' ').trim()
const introText = computed(() => lego.value.intro ?? readable(lego.value.clip))
const practice = computed(() => localOrder.value || (open.value ? open.value.p : []))

// ---- proposals: which one belongs to which line ---------------------------------------------------------------------
const live = (p) => p.status !== 'undone'
const lineOf = (p) => p.line || p.key
function propFor(kind, id) {
  let out = null
  for (const p of proposals.value) if (live(p) && p.kind === kind && (p.action === 'edit' || p.action === 'remove') && lineOf(p) === id) out = p
  return out
}
const propOrder = computed(() => open.value && proposals.value.filter((p) => live(p) && p.action === 'order' && lineOf(p) === open.value.l).pop())
// An applied add/copy shows its Undo on the line it made; a pending one is listed under the practice phrases.
const newLineProp = (id) => proposals.value.find((p) => live(p) && p.status === 'applied' && p.newId === id) || null
const pendingNew = computed(() => (open.value ? proposals.value.filter((p) => live(p) && p.status !== 'applied' && (p.action === 'add' || p.action === 'copy') && p.lego === open.value.l) : []))

// ---- the small pieces of a row (render functions: one file, no new components) -------------------------------------
const fmtWhen = (t) => { try { return new Date(t).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) } catch { return '' } }
const LineTags = (props) => {
  const l = props.line, kids = []
  if (l.lock) kids.push(h('span', { class: 'tag hand' }, props.prop && props.prop.action === 'copy' ? '⧉ Copy · hand-edited · overrides seed rules' : '✎ Hand-edited · overrides seed rules'))
  if (l.f && l.f.flagged) kids.push(h('span', { class: 'tag flag' }, '⚑ flagged' + (l.f.note ? ` — ${l.f.note}` : '')))
  if (l.held) kids.push(h('div', { class: 'held' }, `On ${fmtWhen(l.held.at)} a regeneration tried to change this line; your version was kept.`))
  return kids.length ? h('div', { class: 'tags' }, kids) : null
}
LineTags.props = ['line', 'prop']
const AudioNeed = (props) => h('div', { class: 'audio-need' }, [
  `🔇 needs new audio (${props.line.m.join(', ')})`,
  audioMode.value === 'tts' && canEdit.value ? h('button', { class: 'mini', onClick: () => renderAsk(props.kind, props.id, props.line.m.find((s) => s !== 'known') || props.line.m[0]) }, 'Make new audio') : (audioMode.value === 'tts' ? null : ' — on the booth\'s Re-record card'),
  ...['known', 'target1', 'target2'].map((role) => {
    const st = renderState[`${props.kind}:${props.id}:${role}`]
    return st ? h('span', { class: 'render' }, [st.text, st.canConfirm ? h('button', { class: 'mini go', onClick: () => renderConfirm(props.kind, props.id, role) }, st.lib ? 'Link it' : 'Confirm render') : null]) : null
  }),
])
AudioNeed.props = ['kind', 'id', 'line']
const EditForm = (props) => {
  const e = editing[props.k]
  if (!e) return null
  const field = (label, keyName, attrs = {}) => h('label', null, [label, h(attrs.area ? 'textarea' : 'input', { value: e[keyName], rows: attrs.area ? 3 : undefined, lang: attrs.lang, onInput: (ev) => { e[keyName] = ev.target.value } })])
  const romanStale = e.tx.trim() !== e.orig.tx && e.ro === e.orig.ro && e.orig.ro
  return h('div', { class: 'edit' }, [
    field('Korean', 'tx', { lang: 'ko' }),
    field('Romanisation', 'ro'),
    romanStale ? h('div', { class: 'hint warn' }, 'The Korean changed but the romanisation did not: unless you change it, it will be cleared.') : null,
    field('English', 'kn'),
    props.kind === 'lego' ? (lockReady.value ? field('Full introduction (what the spoken intro says)', 'intro', { area: true }) : h('div', { class: 'hint' }, 'The intro wording can be edited once the hand-edit lock is set up.')) : null,
    h('div', { class: 'btns' }, [
      h('button', { class: 'mini go', disabled: !!busy[props.k], onClick: () => proposeEdit(props.kind, props.id) }, 'Propose change'),
      props.kind === 'phrase' ? h('button', { class: 'mini warn', disabled: !!busy[props.k], onClick: () => proposeRemove(props.id) }, 'Propose removal') : null,
      h('button', { class: 'mini', onClick: () => { delete editing[props.k] } }, 'Cancel'),
    ]),
  ])
}
EditForm.props = ['k', 'kind', 'id']
function statusLabel(p) {
  const what = { order: 'New order', add: 'New phrase', copy: 'Copy', remove: 'Remove this line' }[p.action]
  if (p.status === 'pending') return `${what || 'Proposed'} — not applied yet`
  if (p.status === 'applied') return 'Applied'
  if (p.status === 'stale') return 'Stale — the live line changed'
  return p.status
}
const PropBox = (props) => {
  const p = props.p
  if (!p) return null
  const diffs = []
  if (p.action === 'edit' && p.after) {
    for (const [k, cls] of [['target', ''], ['roman', 'ro'], ['known', 'en'], ['intro', 'intro']]) {
      if (p.after[k] === undefined || (p.after[k] ?? '') === (p.before[k] ?? '')) continue
      diffs.push(h('div', { class: `diff ${cls}` }, [h('s', null, p.before[k] || '—'), ' → ', h('ins', null, p.after[k] || '(cleared)')]))
    }
  } else if (p.action === 'add' || p.action === 'copy') {
    diffs.push(h('div', { class: 'diff' }, [h('ins', null, p.after.target), p.after.roman ? ` · ${p.after.roman}` : '', ' · ', h('span', { class: 'en' }, p.after.known)]))
  } else if (p.action === 'order') {
    diffs.push(h('div', { class: 'hint' }, `Practice order: ${p.after.order.length} phrases in the order you set.`))
  }
  const hint = p.status === 'applied'
    ? (p.needsAudio ? (audioMode.value === 'tts' ? (p.audioQueued ? 'New audio queued for the next audio pass.' : 'Needs new audio.') : 'On the booth\'s Re-record card.') : (p.action === 'edit' ? 'Same spoken words: the recording was kept.' : ''))
    : (p.action === 'edit' ? (sameWords(p) ? 'Capitals/punctuation only: the recording is kept.' : 'Spoken words change: this line will need new audio.') : '')
  const k = `prop:${p.id}`
  return h('div', { class: ['prop', p.status] }, [
    h('div', { class: 'ph' }, [h('b', null, statusLabel(p)), h('small', null, p.status === 'applied' ? `by ${p.appliedBy} · ${fmtWhen(p.appliedAt)}` : `by ${p.proposedBy}`)]),
    ...diffs,
    hint ? h('div', { class: 'hint' }, hint) : null,
    p.status === 'applied' && p.locked === false ? h('div', { class: 'hint warn' }, 'Applied before the hand-edit lock was set up: not protected from regeneration.') : null,
    p.error ? h('p', { class: 'msg bad' }, p.error) : null,
    canEdit.value ? h('div', { class: 'btns' }, p.status === 'pending'
      ? [h('button', { class: 'mini go', disabled: !!busy[k], onClick: () => act(p, 'apply') }, 'Apply'), h('button', { class: 'mini', disabled: !!busy[k], onClick: () => act(p, 'discard') }, 'Discard')]
      : p.status === 'applied'
        ? [h('button', { class: 'mini warn', disabled: !!busy[k], onClick: () => act(p, 'undo') }, '↶ Undo')]
        : [h('button', { class: 'mini', disabled: !!busy[k], onClick: () => act(p, 'discard') }, 'Discard')]) : null,
  ])
}
PropBox.props = ['p']
// The server's spokenForm (course-editor-ops.cjs), mirrored for the hint only — Apply decides on the server.
const spoken = (s) => String(s || '').toLowerCase().replace(/(?<=[\p{L}\p{N}])['‘’ʼ\-‐‑]+(?=[\p{L}\p{N}])/gu, '').replace(/[\p{P}\p{S}]+/gu, ' ').replace(/\s+/g, ' ').trim()
const sameWords = (p) => spoken(p.before.target) === spoken(p.after.target) && spoken(p.before.known) === spoken(p.after.known) && (p.after.intro === undefined || (p.after.intro ?? '') === (p.before.intro ?? ''))

// ---- loading & navigation -----------------------------------------------------------------------------------------
let loadGen = 0
async function load() {
  const gen = ++loadGen
  const code = course.value
  loading.value = !rounds.value.length; loadError.value = ''
  try {
    const r = await fetch(base(code) + '/')
    const body = await r.json().catch(() => ({}))
    if (gen !== loadGen) return
    if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`)
    rounds.value = Object.freeze(body.rounds || [])
    legos.value = Object.freeze(body.legos || {})
    phrases.value = Object.freeze(body.phrases || {})
    proposals.value = body.proposals || []
    audioMode.value = body.audioMode || 'tts'
    lockReady.value = !!body.lockReady
    canEdit.value = !!body.canEdit
    localOrder.value = null
  } catch (e) {
    if (gen === loadGen) loadError.value = `Could not load ${code}: ${e.message}`
  } finally { if (gen === loadGen) loading.value = false }
}
function pick(code) {
  if (!code || code === course.value) return
  course.value = code
  rounds.value = []
  router.replace({ name: 'LiveCourseEditor', params: { courseCode: code } })
  load()
}
function setPage(n) { page.value = Math.max(0, n); window.scrollTo(0, 0) }
function toggleHand() { onlyHand.value = !onlyHand.value; page.value = 0 }
function openRound(n) {
  if (!roundByN.value.get(n)) return say(`There is no round ${n}.`, true)
  for (const k of Object.keys(editing)) delete editing[k]
  adding.value = null; localOrder.value = null
  router.push({ query: { ...route.query, round: String(n) } })
  window.scrollTo(0, 0)
}
function closeRound() {
  const n = open.value ? open.value.n : 1
  const q = { ...route.query }; delete q.round
  router.push({ query: q })
  const i = listed.value.findIndex((r) => r.n === n)
  page.value = Math.max(0, Math.floor((i < 0 ? 0 : i) / PAGE))
}
function jump() { const n = Number(jumpTo.value); if (n) openRound(n); jumpTo.value = '' }
watch(() => route.query.round, () => { msg.value = '' })

// ---- proposing ----------------------------------------------------------------------------------------------------
async function call(method, path, body) {
  const r = await fetch(base(course.value) + path, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  return { ok: r.ok, status: r.status, body: await r.json().catch(() => ({})) }
}
function startEdit(kind, id, line) {
  const k = `${kind}:${id}`
  if (editing[k]) return
  const orig = { tx: line.tx, kn: line.kn || '', ro: line.ro || '', intro: kind === 'lego' ? (line.intro ?? readable(line.clip)) : '' }
  editing[k] = { ...orig, orig }
}
async function propose(k, body, okText) {
  busy[k] = true
  try {
    const r = await call('POST', '/proposals', body)
    if (!r.ok) throw new Error(r.body.error || `HTTP ${r.status}`)
    proposals.value = [...proposals.value.filter((p) => p.id !== r.body.proposal.id && !(p.status === 'pending' && p.kind === r.body.proposal.kind && p.key === r.body.proposal.key)), r.body.proposal]
    say(okText || 'Proposed — nothing in the course has changed yet. Tap Apply to make it real.')
    return true
  } catch (e) { say(`Not proposed — ${e.message}`, true); return false } finally { delete busy[k] }
}
async function proposeEdit(kind, id) {
  const k = `${kind}:${id}`
  const e = editing[k]
  const body = { kind, id, action: 'edit' }
  const tx = e.tx.trim(), kn = e.kn.trim(), ro = e.ro.trim()
  if (tx !== e.orig.tx) body.target = tx
  if (kn !== e.orig.kn) body.known = kn
  if (ro !== e.orig.ro) body.roman = ro
  else if (body.target != null && e.orig.ro) body.roman = ''   // the old romanisation would spell the old words
  if (kind === 'lego' && lockReady.value && e.intro.trim() !== e.orig.intro.trim()) body.intro = e.intro.trim()
  if (body.target == null && body.known == null && body.roman == null && body.intro == null) return say('Nothing changed.', true)
  if (await propose(k, body)) delete editing[k]
}
async function proposeRemove(id) { if (await propose(`phrase:${id}`, { kind: 'phrase', id, action: 'remove' })) delete editing[`phrase:${id}`] }
function copy(id) { propose(`copy:${id}`, { kind: 'phrase', id, action: 'copy' }, 'Copy proposed — Apply adds it as a new line (an exact copy plays once per round until you edit it).') }
async function proposeAdd() {
  const a = adding.value
  if (!a.target.trim() || !a.known.trim()) return say('A new phrase needs Korean and English.', true)
  if (await propose('add', { kind: 'round', id: open.value.l, action: 'add', target: a.target, known: a.known, roman: a.roman })) adding.value = null
}
async function act(p, what) {
  const k = `prop:${p.id}`
  if (what === 'apply' && !confirm('Apply this change to the live course?')) return
  busy[k] = true
  try {
    const r = what === 'discard' ? await call('DELETE', `/proposals/${p.id}`) : await call('POST', `/proposals/${p.id}/${what}`)
    if (!r.ok) {
      if (r.body.proposal) proposals.value = proposals.value.map((x) => (x.id === p.id ? r.body.proposal : x))
      throw new Error(r.body.error || `HTTP ${r.status}`)
    }
    say(what === 'apply' ? 'Applied. ↶ Undo is on the line.' : what === 'undo' ? 'Undone — back as it was.' : 'Discarded.')
    if (what === 'discard') proposals.value = proposals.value.filter((x) => x.id !== p.id)
    else await load()   // the round itself may have changed shape: read it again as the player would play it
  } catch (e) { say(`${what} failed — ${e.message}`, true) } finally { delete busy[k] }
}

// ---- drag to reorder (pointer events: works with a finger and a mouse) ----------------------------------------------
function dragStart(ev, id) {
  ev.preventDefault()
  localOrder.value = [...practice.value]
  drag.value = { id, pointer: ev.pointerId }
  window.addEventListener('pointermove', dragMove)
  window.addEventListener('pointerup', dragEnd, { once: true })
  window.addEventListener('pointercancel', dragEnd, { once: true })
}
function dragMove(ev) {
  if (!drag.value || !dlist.value) return
  const rows = [...dlist.value.querySelectorAll('.row[data-id]')]
  const order = localOrder.value
  const from = order.indexOf(drag.value.id)
  let to = rows.findIndex((el) => { const b = el.getBoundingClientRect(); return ev.clientY < b.top + b.height / 2 })
  if (to < 0) to = rows.length - 1
  else if (to > from) to -= 1
  if (to !== from && to >= 0) { const next = order.slice(); next.splice(from, 1); next.splice(to, 0, drag.value.id); localOrder.value = next }
  if (ev.clientY < 60) window.scrollBy(0, -12); else if (ev.clientY > window.innerHeight - 60) window.scrollBy(0, 12)
}
async function dragEnd() {
  window.removeEventListener('pointermove', dragMove)
  const moved = localOrder.value && open.value && localOrder.value.join() !== open.value.p.join()
  drag.value = null
  if (!moved) { localOrder.value = null; return }
  const ok = await propose(`order:${open.value.l}`, { kind: 'round', id: open.value.l, action: 'order', order: localOrder.value },
    'New order proposed — Apply makes the player use it for this round (practice phrases only).')
  if (!ok) localOrder.value = null
}
onBeforeUnmount(() => window.removeEventListener('pointermove', dragMove))

// ---- make new audio: a dry run first (library + cost), a second tap renders ----------------------------------------
async function renderAsk(kind, id, role) {
  const k = `${kind}:${id}:${role}`
  renderState[k] = { text: `Checking ${role}…` }
  const r = await call('POST', '/render', { kind, id, role })
  const b = r.body
  if (!r.ok || b.ok === false) { renderState[k] = { text: `Refused: ${b.code || r.status} — ${b.error || ''}` }; return }
  const lib = b.source === 'library'
  const n = b.wouldSpendChars ?? b.chars
  renderState[k] = { lib, canConfirm: true, text: lib ? `${role}: found in the library (no cost).` : `${role}: would render ${n == null ? 'an unknown number of' : Number(n).toLocaleString()} characters.` }
}
async function renderConfirm(kind, id, role) {
  const k = `${kind}:${id}:${role}`
  const lib = renderState[k]?.lib
  if (!confirm(lib ? `Link the library ${role} clip to ${id}? No cost.` : `Render new ${role} audio for ${id}? This spends TTS characters.`)) return
  renderState[k] = { text: lib ? 'Linking…' : 'Rendering…' }
  const r = await call('POST', '/render', { kind, id, role, confirm: true })
  const b = r.body
  if (!r.ok || b.ok === false) { renderState[k] = { text: `Refused: ${b.code || r.status} — ${b.error || ''}` }; return }
  const linked = b.slotLinked === true || b.slotLinked === 'already'
  renderState[k] = { text: linked ? `Done: ${b.source}, linked.` : `${b.source} ${b.audioId || ''} — not linked: ${b.slotNote || 'no clip id came back'}` }
  if (linked) load()
}

if (course.value) load()
</script>

<style scoped>
/* Light always (Aran uses light mode): dark ink on white whatever Popty's theme. */
.ft {
  --ink: #0b1220; --muted: #475569; --line: #cbd5e1; --en: #1e40af; --violet: #6d28d9; --amber: #b45309; --good: #047857; --bad: #b91c1c;
  max-width: 980px; min-height: 100vh; margin: 0 auto; padding: 0 0.5rem 5rem; background: #fff; color: var(--ink); color-scheme: light;
}
.top { background: #fff; padding: 0.5rem 0.25rem 0.35rem; border-bottom: 1px solid var(--line); }
.bar { display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap; margin: 0.2rem 0; }
h1 { font-size: 1.35rem; margin: 0; flex: 1; }
button { font: inherit; color: inherit; cursor: pointer; }
.who { font-size: 0.82rem; font-weight: 700; color: #7c2d12; background: #ffedd5; border: 1px solid #fdba74; border-radius: 999px; padding: 0.2rem 0.65rem; }
.who.view { color: var(--muted); background: #f1f5f9; border-color: var(--line); }
.pick { font: inherit; font-size: 16px; padding: 0.3rem 0.5rem; min-height: 38px; border: 1px solid var(--line); border-radius: 10px; background: #fff; color: var(--ink); }
.pill { background: #f1f5f9; border: 1px solid var(--line); border-radius: 999px; padding: 0.3rem 0.8rem; min-height: 36px; font-size: 0.85rem; color: var(--ink); }
.pill.on { background: #f59e0b; border-color: transparent; color: #111; }
.count { font-size: 0.85rem; color: var(--muted); margin-left: auto; }
.lockwarn { font-size: 0.8rem; color: #7c2d12; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 0.35rem 0.55rem; margin: 0.3rem 0 0; }
.note { color: var(--muted); padding: 1rem 0.25rem; }
.note.sm { padding: 0.2rem 0.5rem; font-size: 0.85rem; }
.picker { padding: 0.75rem 0.25rem; }
.pickbtn { width: 100%; text-align: left; font-size: 1.1rem; padding: 0.9rem 1rem; border: 1px solid var(--line); border-radius: 12px; background: #f8fafc; color: var(--ink); }
.pickbtn small { color: var(--muted); margin-left: 0.4rem; font-size: 0.8rem; }

.pager { display: flex; gap: 0.4rem; align-items: center; justify-content: flex-end; padding: 0.6rem 0.2rem; flex-wrap: wrap; }
.pg { color: var(--muted); font-size: 0.9rem; margin-right: auto; }
.jump { display: flex; gap: 0.3rem; }
.jump input { width: 5.5rem; font: inherit; font-size: 16px; padding: 0.2rem 0.4rem; border: 1px solid var(--line); border-radius: 8px; color: var(--ink); background: #fff; }

/* The words of a line: stacked on a phone, ONE line on a desktop (Hangul · romanisation · English). */
.words { display: flex; flex-direction: column; min-width: 0; }
.words .ko { font-size: 19px; line-height: 1.3; overflow-wrap: anywhere; }
.words .ro { font-size: 0.9rem; color: var(--muted); overflow-wrap: anywhere; }
.words .en { font-size: 0.98rem; color: var(--en); overflow-wrap: anywhere; }
.words.big .ko { font-size: 22px; }
.words .lab { font-size: 0.72rem; font-weight: 800; letter-spacing: 0.05em; color: #334155; }
.words .dash { display: none; }
@media (min-width: 760px) {
  .words { flex-direction: row; align-items: baseline; flex-wrap: wrap; column-gap: 0.55rem; }
  .words .ro::before, .words .en::before { content: '·'; color: #94a3b8; margin-right: 0.55rem; }
  .words .lab + .ko::before { content: none; }
}

.item { display: flex; align-items: center; gap: 0.6rem; width: 100%; text-align: left; padding: 0.55rem 0.5rem 0.55rem 0.4rem; border: 0; border-left: 4px solid #cbd5e1; border-bottom: 1px solid #e2e8f0; background: #f8fafc; color: var(--ink); }
.item:hover { background: #f1f5f9; }
.item.hand { border-left-color: #7c3aed; background: #faf5ff; }
.item .n { flex: none; width: 2.6rem; text-align: right; font-weight: 700; color: #334155; font-variant-numeric: tabular-nums; }
.item .body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.item .sub { font-size: 0.85rem; color: var(--muted); display: flex; gap: 0.4rem; flex-wrap: wrap; align-items: center; }
.item .chev { color: #94a3b8; font-size: 1.4rem; }

.crumb { display: flex; gap: 0.45rem; align-items: baseline; padding: 0.6rem 0.2rem 0.2rem; flex-wrap: wrap; }
.crumb b { font-size: 1.2rem; }
.crumb small { color: var(--muted); }
.back, .link { border: 0; background: none; color: #1d4ed8; padding: 0; font-size: 1rem; }
.link { font-size: 0.85rem; }
.step { margin-left: auto; display: flex; gap: 0.3rem; }
h2 { font-size: 0.82rem; letter-spacing: 0.08em; text-transform: uppercase; margin: 1.1rem 0.2rem 0.35rem; display: flex; gap: 0.5rem; align-items: baseline; flex-wrap: wrap; }
h2 small { text-transform: none; letter-spacing: 0; font-weight: 400; color: var(--muted); font-size: 0.85rem; }
h2 .cnt { font-weight: 400; color: var(--muted); }
h2.grey { color: #64748b; }

.row { position: relative; display: flex; gap: 0.5rem; align-items: flex-start; padding: 0.5rem 0.45rem; border-left: 4px solid #cbd5e1; border-bottom: 1px solid #eef2f6; background: #fff; }
.row.lego { background: #f1f5f9; }
.row.hand { border-left-color: #7c3aed; background: #faf5ff; }
.row.quiet { border-left-color: #e2e8f0; }
.row.revisit { border-left-color: #f59e0b; background: #fffbeb; }
.row.roundoff { background: #f8fafc; opacity: 0.85; }
.row.roundoff.hand { opacity: 1; }
.row.dragging { box-shadow: 0 6px 18px rgba(15, 23, 42, 0.18); z-index: 2; background: #eef2ff; }
.main { flex: 1; min-width: 0; }
.num { flex: none; width: 1.4rem; text-align: right; font-size: 0.8rem; color: var(--muted); padding-top: 4px; font-variant-numeric: tabular-nums; }
.handle { flex: none; border: 0; background: none; font-size: 1.35rem; line-height: 1; color: #94a3b8; padding: 2px 2px; cursor: grab; touch-action: none; }
.acts { display: flex; gap: 0.35rem; flex: none; }
.ic { flex: none; width: 40px; height: 40px; border: 1px solid var(--line); border-radius: 10px; background: #f8fafc; font-size: 1.05rem; color: #1e3a8a; }

.intro { margin-top: 0.45rem; border: 1px solid var(--line); border-radius: 10px; padding: 0.45rem 0.6rem; background: #fff; }
.introlab { font-size: 0.72rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: #334155; }
.introtext { white-space: pre-wrap; overflow-wrap: anywhere; margin-top: 2px; }
.introtext.none { color: var(--muted); font-style: italic; }
.introold { font-size: 0.82rem; color: var(--amber); margin-top: 0.3rem; display: flex; gap: 0.4rem; flex-wrap: wrap; align-items: center; }

.ordertag { display: inline-block; margin: 0 0.2rem 0.35rem; font-size: 0.78rem; font-weight: 800; letter-spacing: 0.04em; color: var(--violet); background: #f3e8ff; border: 1px solid #c4b5fd; border-radius: 999px; padding: 0.12rem 0.65rem; text-transform: uppercase; }
.revtag { display: flex; gap: 0.6rem; align-items: center; flex-wrap: wrap; margin-top: 0.25rem; }

.addform { margin: 0.45rem 0; display: flex; flex-direction: column; gap: 0.35rem; }
.addform { border: 1px solid #c4b5fd; background: #faf5ff; border-radius: 12px; padding: 0.6rem 0.7rem; margin: 0.5rem 0; }
.addlab { font-size: 0.8rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; }
.addform label { font-size: 0.78rem; color: var(--muted); display: flex; flex-direction: column; gap: 2px; }
.addform input { font: inherit; font-size: 16px; line-height: 1.35; color: var(--ink); background: #fff; border: 1px solid #64748b; border-radius: 8px; padding: 0.35rem 0.5rem; }
.addbtn { width: 100%; margin: 0.5rem 0; padding: 0.7rem; border: 1.5px dashed #94a3b8; border-radius: 12px; background: #fff; font-size: 1rem; color: var(--ink); }
</style>

<style>
/* Rows' small parts are drawn by render functions in <script setup>, whose inner elements carry no scope id: their
   rules live here, unscoped but fenced under .ft. */
.ft .msg { font-size: 0.85rem; color: var(--good); margin: 0.3rem 0 0; }
.ft .msg.bad { color: var(--bad); }
.ft .tags { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.3rem; }
.ft .tag { display: inline-block; font-size: 0.76rem; font-weight: 700; border-radius: 999px; padding: 0.08rem 0.55rem; }
.ft .tag.hand { color: var(--violet); background: #f3e8ff; border: 1px solid #c4b5fd; }
.ft .tag.amber { color: #92400e; background: #fde68a; }
.ft .tag.flag { color: var(--amber); background: #fff7ed; border: 1px solid #fed7aa; }
.ft .tag.mute { color: var(--bad); font-weight: 600; }
.ft .held { font-size: 0.78rem; color: #6d28d9; }
.ft .audio-need { font-size: 0.8rem; color: var(--bad); margin-top: 3px; display: flex; flex-wrap: wrap; gap: 0.35rem; align-items: center; }
.ft .render { font-size: 0.8rem; color: var(--muted); display: inline-flex; gap: 0.35rem; align-items: center; flex-wrap: wrap; }
.ft .edit { margin: 0.45rem 0; display: flex; flex-direction: column; gap: 0.35rem; }
.ft .edit label { font-size: 0.78rem; color: var(--muted); display: flex; flex-direction: column; gap: 2px; }
.ft .edit input, .ft .edit textarea { font: inherit; font-size: 16px; line-height: 1.35; color: var(--ink); background: #fff; border: 1px solid #64748b; border-radius: 8px; padding: 0.35rem 0.5rem; }
.ft .btns { display: flex; gap: 0.4rem; flex-wrap: wrap; margin-top: 4px; }
.ft .mini { font-size: 0.85rem; padding: 0.3rem 0.75rem; min-height: 34px; border-radius: 8px; border: 1px solid var(--line); background: #f8fafc; color: var(--ink); }
.ft .mini.go { background: #1d4ed8; color: #fff; border-color: transparent; }
.ft .mini.warn { background: #fff; color: var(--bad); border-color: #fca5a5; }
.ft .mini:disabled { opacity: 0.55; }
.ft .hint { font-size: 0.78rem; color: var(--muted); }
.ft .hint.warn { color: var(--amber); }
.ft .prop { margin: 0.4rem 0 0.2rem; padding: 0.45rem 0.6rem; border-radius: 10px; border: 1px solid #93c5fd; background: #eff6ff; font-size: 0.88rem; }
.ft .prop.applied { border-color: #86efac; background: #f0fdf4; }
.ft .prop.stale, .ft .prop.failed { border-color: #fca5a5; background: #fef2f2; }
.ft .ph { display: flex; gap: 0.45rem; align-items: baseline; flex-wrap: wrap; }
.ft .ph small { color: var(--muted); }
.ft .diff { overflow-wrap: anywhere; margin-top: 2px; }
.ft .diff.en, .ft .diff .en { color: var(--en); }
.ft .diff.ro { color: var(--muted); }
.ft .diff.intro { font-size: 0.84rem; }
.ft .diff s { color: #b91c1c; }
.ft .diff ins { color: #047857; text-decoration: none; font-weight: 600; }
</style>
