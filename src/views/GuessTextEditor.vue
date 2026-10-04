<template>
  <div class="gt-wrap">
    <header>
      <h1>The /guess game: its text</h1>
      <p class="note">
        First the <b>Game text</b>: the game's own words, such as the mode names and blurbs, the buttons, the feedback and score lines,
        the share text and the mini-lesson lines. Then the language explanations: the reveal line under each answer, the Read more
        "Easily mistaken for" lines and the place notes. Words in curly brackets, like {language} or {n}, are filled in by the game: keep them.
        Edit a box and press Save: the new text is live straight away, stamped with your name and the time.
        The wording it replaces is kept as history. Known language: <b>{{ known }}</b>.
      </p>
    </header>

    <div class="gt-bar">
      <span class="grp">Game text</span>
      <button v-for="k in kinds.filter(x => x.group === 'game')" :key="k.id" type="button" class="tab" :class="{ on: kind === k.id }" @click="kind = k.id">
        {{ k.label }} <span class="count">{{ countFor(k.id) }}</span>
      </button>
    </div>
    <div class="gt-bar">
      <span class="grp">Language explanations</span>
      <button v-for="k in kinds.filter(x => x.group === 'lang')" :key="k.id" type="button" class="tab" :class="{ on: kind === k.id }" @click="kind = k.id">
        {{ k.label }} <span class="count">{{ countFor(k.id) }}</span>
      </button>
    </div>
    <div class="gt-bar">
      <input v-model="search" class="search" placeholder="Find…" autocapitalize="off" autocorrect="off" spellcheck="false" />
    </div>
    <p v-if="status" class="status" :class="{ err: statusIsError }">{{ status }}</p>
    <p v-if="loading" class="note">Loading…</p>

    <ul class="items">
      <li v-for="it in shown" :key="it.kind + it.id" class="item">
        <div class="id">{{ it.id }}</div>
        <div class="row">
          <div class="col">
            <div class="lbl">Live (what players read)</div>
            <div class="live">{{ it.live ? it.live.content : 'nothing live; players read the text built into the app' }}</div>
          </div>
          <div class="col">
            <div class="lbl">Edit (Save goes live)</div>
            <textarea v-model="edits[key(it)]" rows="3" spellcheck="false" :placeholder="it.live ? it.live.content : ''" @focus="seedEdit(it)"></textarea>
            <div v-if="hasParens(edits[key(it)])" class="warn">This text has parentheses. The course has none, ever.</div>
            <div v-if="lostHoles(it).length" class="warn">The game fills in {{ lostHoles(it).join(' ') }}: this text no longer has it.</div>
            <div class="acts">
              <button type="button" class="btn primary" :disabled="busy || !changed(it)" @click="save(it)">Save</button>
            </div>
          </div>
        </div>
        <div v-if="it.live && (it.live.approvedBy || it.live.editedBy)" class="meta">Live since {{ stamp(it.live.approvedAt || it.live.at) }}, by {{ it.live.approvedBy || it.live.editedBy }}</div>
      </li>
    </ul>
    <p v-if="!loading && !shown.length" class="note">Nothing here.</p>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { bufferKey, baselineOf, reconcileBuffers, anyDirty } from '../lib/guessTextBuffers'
import { useAuth } from '../composables/useAuth'

const { getAccessToken } = useAuth()
const known = 'eng'
const kinds = [
  { id: 'game', label: 'Game text', group: 'game' },
  { id: 'tell', label: 'Reveal lines', group: 'lang' },
  { id: 'pair', label: 'Read more', group: 'lang' },
  { id: 'place_note', label: 'Place notes', group: 'lang' },
  { id: 'place_where', label: 'Place names', group: 'lang' },
]
const kind = ref('game')
const items = ref([])
const edits = reactive({})
const search = ref('')
const loading = ref(true)
const busy = ref(false)
const status = ref('')
const statusIsError = ref(false)

const key = bufferKey
const hasParens = (s) => /[()]/.test(s || '')
/** The {placeholders} the live text has and the box has lost: the game would print a gap or the bare word. */
const holesOf = (s) => [...new Set(String(s || '').match(/\{\w+\}/g) || [])]
const lostHoles = (it) => (edits[key(it)] === undefined ? [] : holesOf(baseline(it)).filter(h => !String(edits[key(it)]).includes(h)))
const countFor = (k) => items.value.filter(i => i.kind === k).length
const shown = computed(() => {
  const q = search.value.trim().toLowerCase()
  return items.value.filter(i => i.kind === kind.value
    && (!q || i.id.toLowerCase().includes(q) || (i.live?.content || '').toLowerCase().includes(q)))
})
// The box starts as the live text, so Save always means "this exact text".
const baseline = baselineOf
const stamp = (t) => (t ? new Date(t).toLocaleString() : '')
const seedEdit = (it) => { if (edits[key(it)] === undefined) edits[key(it)] = baseline(it) }
const changed = (it) => edits[key(it)] !== undefined && edits[key(it)].trim() !== baseline(it).trim() && edits[key(it)].trim() !== ''

function say(msg, err = false) { status.value = msg; statusIsError.value = err }
async function headers() { const t = await getAccessToken(); return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) } }

async function load(submitted = {}) {
  loading.value = true
  try {
    const res = await fetch(`/api/guess-text?known=${known}`, { headers: await headers() })
    if (!res.ok) throw new Error(`${res.status} ${(await res.json().catch(() => ({}))).error || ''}`)
    const oldBase = Object.fromEntries(items.value.map(it => [key(it), baseline(it)]))
    const fresh = (await res.json()).items
    reconcileBuffers(edits, oldBase, fresh, submitted)
    items.value = fresh
  } catch (e) {
    say(`Could not load: ${e.message}. Reload the page; nothing has been lost.`, true)
  } finally { loading.value = false }
}

async function act(body, done, submitted) {
  busy.value = true
  try {
    const res = await fetch('/api/guess-text', { method: 'POST', headers: await headers(), body: JSON.stringify({ known, ...body }) })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || res.status)
    say(done(data))
    await load(submitted)
  } catch (e) {
    say(`NOT DONE: ${e.message}. Your text is still in the box.`, true)
  } finally { busy.value = false }
}

const save = (it) => {
  const content = edits[key(it)]
  return act({ action: 'save', kind: it.kind, id: it.id, content }, () => `${it.id} is saved and live.`, { [key(it)]: content })
}

const LEAVE_MSG = 'You have edits that are not saved. Leave anyway?'
const beforeUnload = (e) => { if (anyDirty(edits, items.value)) { e.preventDefault(); e.returnValue = '' } }
onBeforeRouteLeave(() => (anyDirty(edits, items.value) ? window.confirm(LEAVE_MSG) : true))

onMounted(() => { load(); window.addEventListener('beforeunload', beforeUnload) })
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload))
</script>

<style scoped>
.gt-wrap { max-width: 980px; margin: 0 auto; padding: 16px 12px; }
h1 { font-size: 18px; margin: 0 0 6px; font-weight: 600; }
.note { margin: 0 0 10px; font-size: 14px; opacity: 0.75; line-height: 1.5; }
.gt-bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 10px 0; }
.tab, .btn { font: inherit; font-size: 14px; padding: 8px 12px; border: 1px solid rgba(128,128,128,.45); border-radius: 8px; background: transparent; color: inherit; cursor: pointer; }
.tab.on, .btn.primary { background: #1e8449; border-color: #1e8449; color: #fff; }
.btn:disabled { opacity: .4; cursor: default; }
.grp { font-size: 13px; font-weight: 600; opacity: .7; min-width: 150px; }
.count { opacity: .7; font-size: 12px; }
.search { flex: 1; min-width: 140px; font: inherit; font-size: 14px; padding: 8px; border: 1px solid rgba(128,128,128,.45); border-radius: 8px; background: transparent; color: inherit; }
.chk { font-size: 13px; }
.status { font-size: 14px; color: #1e8449; } .status.err { color: #c0392b; }
.items { list-style: none; padding: 0; margin: 12px 0; display: flex; flex-direction: column; gap: 12px; }
.item { border: 1px solid rgba(128,128,128,.35); border-radius: 10px; padding: 12px; }
.id { font-weight: 600; font-size: 14px; margin-bottom: 8px; word-break: break-all; }
.row { display: flex; gap: 12px; flex-wrap: wrap; }
.col { flex: 1 1 280px; min-width: 0; }
.lbl { font-size: 12px; opacity: .65; margin-bottom: 4px; }
.live { font-size: 14px; line-height: 1.5; white-space: pre-wrap; }
textarea { width: 100%; box-sizing: border-box; font: inherit; font-size: 14px; line-height: 1.5; padding: 8px; border: 1px solid rgba(128,128,128,.45); border-radius: 8px; background: transparent; color: inherit; resize: vertical; }
.warn { color: #c0392b; font-size: 13px; margin-top: 4px; }
.acts { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
.meta { font-size: 12px; opacity: .55; margin-top: 8px; }
</style>
