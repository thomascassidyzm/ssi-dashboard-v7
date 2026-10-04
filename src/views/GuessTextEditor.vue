<template>
  <div class="gt-wrap">
    <header>
      <h1>The /guess game: its text</h1>
      <p class="note">
        The reveal line under each answer, the Read more "Easily mistaken for" lines and the place notes.
        Players read only the LIVE text. Edit a box and press Save: that writes a DRAFT, and nothing a player
        sees changes. Press Approve to make a draft live. Known language: <b>{{ known }}</b>.
      </p>
    </header>

    <div class="gt-bar">
      <button v-for="k in kinds" :key="k.id" type="button" class="tab" :class="{ on: kind === k.id }" @click="kind = k.id">
        {{ k.label }} <span class="count">{{ countFor(k.id) }}</span>
      </button>
    </div>
    <div class="gt-bar">
      <input v-model="search" class="search" placeholder="Find…" autocapitalize="off" autocorrect="off" spellcheck="false" />
      <label class="chk"><input type="checkbox" v-model="onlyDrafts" /> only items with a draft</label>
      <button type="button" class="btn primary" :disabled="!draftCount || busy" @click="approveAll">
        Approve all {{ draftCount }} draft{{ draftCount === 1 ? '' : 's' }} in {{ kindLabel }}
      </button>
    </div>
    <p v-if="status" class="status" :class="{ err: statusIsError }">{{ status }}</p>
    <p v-if="loading" class="note">Loading…</p>

    <ul class="items">
      <li v-for="it in shown" :key="it.kind + it.id" class="item">
        <div class="id">{{ it.id }}<span v-if="it.draft" class="badge draft">DRAFT</span></div>
        <div class="row">
          <div class="col">
            <div class="lbl">Live (what players read)</div>
            <div class="live">{{ it.live ? it.live.content : 'nothing live; players read the text built into the app' }}</div>
          </div>
          <div class="col">
            <div class="lbl">{{ it.draft ? draftLabel(it.draft) : 'Edit (saves as a draft)' }}</div>
            <textarea v-model="edits[key(it)]" rows="3" spellcheck="false" :placeholder="it.live ? it.live.content : ''" @focus="seedEdit(it)"></textarea>
            <div v-if="hasParens(edits[key(it)])" class="warn">This text has parentheses. The course has none, ever.</div>
            <div class="acts">
              <button type="button" class="btn" :disabled="busy || !changed(it)" @click="save(it)">Save draft</button>
              <button type="button" class="btn primary" :disabled="busy || !it.draft || changed(it)" @click="approve(it)">Approve</button>
              <button type="button" class="btn" :disabled="busy || !it.draft" @click="discard(it)">Discard draft</button>
            </div>
          </div>
        </div>
        <div v-if="it.live && it.live.approvedBy" class="meta">Live: approved by {{ it.live.approvedBy }}</div>
      </li>
    </ul>
    <p v-if="!loading && !shown.length" class="note">Nothing here.</p>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useAuth } from '../composables/useAuth'

const { getAccessToken } = useAuth()
const known = 'eng'
const kinds = [
  { id: 'tell', label: 'Reveal lines' },
  { id: 'pair', label: 'Read more' },
  { id: 'place_note', label: 'Place notes' },
  { id: 'place_where', label: 'Place names' },
]
const kind = ref('tell')
const items = ref([])
const edits = reactive({})
const search = ref('')
const onlyDrafts = ref(false)
const loading = ref(true)
const busy = ref(false)
const status = ref('')
const statusIsError = ref(false)

const key = (it) => `${it.kind}|${it.id}`
const kindLabel = computed(() => kinds.find(k => k.id === kind.value).label)
const hasParens = (s) => /[()]/.test(s || '')
const countFor = (k) => items.value.filter(i => i.kind === k).length
const draftCount = computed(() => items.value.filter(i => i.kind === kind.value && i.draft).length)
const shown = computed(() => {
  const q = search.value.trim().toLowerCase()
  return items.value.filter(i => i.kind === kind.value
    && (!onlyDrafts.value || i.draft)
    && (!q || i.id.toLowerCase().includes(q) || (i.live?.content || '').toLowerCase().includes(q) || (i.draft?.content || '').toLowerCase().includes(q)))
})
// The box starts as the draft if there is one, else the live text, so Save always means "this exact text".
const baseline = (it) => (it.draft ? it.draft.content : it.live ? it.live.content : '')
const seedEdit = (it) => { if (edits[key(it)] === undefined) edits[key(it)] = baseline(it) }
const changed = (it) => edits[key(it)] !== undefined && edits[key(it)].trim() !== baseline(it).trim() && edits[key(it)].trim() !== ''
const draftLabel = (d) => `DRAFT${d.source === 'seed-draft' ? ' (humanised, not yet approved)' : d.editedBy ? ' by ' + d.editedBy : ''}`

function say(msg, err = false) { status.value = msg; statusIsError.value = err }
async function headers() { const t = await getAccessToken(); return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) } }

async function load() {
  loading.value = true
  try {
    const res = await fetch(`/api/guess-text?known=${known}`, { headers: await headers() })
    if (!res.ok) throw new Error(`${res.status} ${(await res.json().catch(() => ({}))).error || ''}`)
    items.value = (await res.json()).items
    for (const it of items.value) edits[key(it)] = baseline(it)
  } catch (e) {
    say(`Could not load: ${e.message}. Reload the page; nothing has been lost.`, true)
  } finally { loading.value = false }
}

async function act(body, done) {
  busy.value = true
  try {
    const res = await fetch('/api/guess-text', { method: 'POST', headers: await headers(), body: JSON.stringify({ known, ...body }) })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || res.status)
    say(done(data))
    await load()
  } catch (e) {
    say(`NOT DONE: ${e.message}. Your text is still in the box.`, true)
  } finally { busy.value = false }
}

const save = (it) => act({ action: 'save', kind: it.kind, id: it.id, content: edits[key(it)] }, () => `Saved a draft for ${it.id}. Players still read the live text.`)
const approve = (it) => act({ action: 'approve', kind: it.kind, id: it.id }, () => `${it.id} is now live.`)
const discard = (it) => act({ action: 'discard', kind: it.kind, id: it.id }, () => `Draft for ${it.id} discarded.`)
function approveAll() {
  if (!confirm(`Make all ${draftCount.value} drafts in ${kindLabel.value} live for players?`)) return
  act({ action: 'approve-all', kind: kind.value }, (d) => `${d.approved} drafts are now live.`)
}

onMounted(load)
</script>

<style scoped>
.gt-wrap { max-width: 980px; margin: 0 auto; padding: 16px 12px; }
h1 { font-size: 18px; margin: 0 0 6px; font-weight: 600; }
.note { margin: 0 0 10px; font-size: 14px; opacity: 0.75; line-height: 1.5; }
.gt-bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 10px 0; }
.tab, .btn { font: inherit; font-size: 14px; padding: 8px 12px; border: 1px solid rgba(128,128,128,.45); border-radius: 8px; background: transparent; color: inherit; cursor: pointer; }
.tab.on, .btn.primary { background: #1e8449; border-color: #1e8449; color: #fff; }
.btn:disabled { opacity: .4; cursor: default; }
.count { opacity: .7; font-size: 12px; }
.search { flex: 1; min-width: 140px; font: inherit; font-size: 14px; padding: 8px; border: 1px solid rgba(128,128,128,.45); border-radius: 8px; background: transparent; color: inherit; }
.chk { font-size: 13px; }
.status { font-size: 14px; color: #1e8449; } .status.err { color: #c0392b; }
.items { list-style: none; padding: 0; margin: 12px 0; display: flex; flex-direction: column; gap: 12px; }
.item { border: 1px solid rgba(128,128,128,.35); border-radius: 10px; padding: 12px; }
.id { font-weight: 600; font-size: 14px; margin-bottom: 8px; word-break: break-all; }
.badge { margin-left: 8px; font-size: 11px; padding: 2px 6px; border-radius: 6px; }
.badge.draft { background: #a97400; color: #fff; }
.row { display: flex; gap: 12px; flex-wrap: wrap; }
.col { flex: 1 1 280px; min-width: 0; }
.lbl { font-size: 12px; opacity: .65; margin-bottom: 4px; }
.live { font-size: 14px; line-height: 1.5; white-space: pre-wrap; }
textarea { width: 100%; box-sizing: border-box; font: inherit; font-size: 14px; line-height: 1.5; padding: 8px; border: 1px solid rgba(128,128,128,.45); border-radius: 8px; background: transparent; color: inherit; resize: vertical; }
.warn { color: #c0392b; font-size: 13px; margin-top: 4px; }
.acts { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
.meta { font-size: 12px; opacity: .55; margin-top: 8px; }
</style>
