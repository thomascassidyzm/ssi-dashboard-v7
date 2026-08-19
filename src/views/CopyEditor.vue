<template>
  <div class="htw-wrap">
    <header class="htw-head">
      <h1>{{ title }}</h1>
      <p class="note">
        {{ blurb }}
        Edit anything below — your changes save automatically as a draft.
        When the words are right, press Publish and learners see them.
      </p>
      <router-link v-if="docId !== 'htw'" class="back" to="/copy">‹ All copy surfaces</router-link>
    </header>

    <!--
      The live line. A non-technical editor reads this cold and knows three
      things: what learners are reading right now, who put it there, and
      whether what is in the box has reached them.
    -->
    <p class="live-line" :class="liveTone">{{ liveLine }}</p>

    <div class="htw-bar">
      <span class="status" :class="{ err: statusIsError }">{{ status }}</span>
      <button type="button" class="btn" @click="toggleView('changes')">
        {{ view === 'changes' ? 'Back to editing' : 'What has changed' }}
      </button>
      <button type="button" class="btn" @click="toggleView('history')">
        {{ view === 'history' ? 'Back to editing' : 'Earlier versions' }}
      </button>
      <button type="button" class="btn primary" :disabled="saving" @click="saveNow">Save</button>
      <button
        type="button"
        class="btn publish"
        :disabled="publishing || saving || !canPublish"
        @click="publishLatest"
      >Publish</button>
    </div>

    <div v-if="loadError" class="load-error">{{ loadError }}</div>

    <textarea
      v-show="view === 'edit' && !loadError"
      v-model="text"
      class="htw-doc"
      spellcheck="false"
      autocapitalize="off"
      autocorrect="off"
      @input="onInput"
    ></textarea>

    <div v-if="view === 'changes'" class="htw-diff">
      <div class="diff-switch">
        <button type="button" class="btn small" :class="{ on: diffAgainst === 'original' }" @click="diffAgainst = 'original'">
          Against the original
        </button>
        <button type="button" class="btn small" :class="{ on: diffAgainst === 'published' }" :disabled="!published" @click="diffAgainst = 'published'">
          Against what learners see
        </button>
      </div>
      <p v-if="!diffLines.length" class="note">{{ noDiffNote }}</p>
      <pre v-else><span
        v-for="(l, i) in diffLines"
        :key="i"
        :class="l.kind"
      >{{ l.text }}
</span></pre>
    </div>

    <!--
      Every version, newest first, with the frozen original at the bottom.
      Publishing an older one IS the rollback — nothing is deleted, the older
      row simply becomes the newest published.
    -->
    <div v-if="view === 'history'" class="history">
      <p class="note">
        Every version ever saved, newest first. Publishing an older one puts those
        words back in front of learners — nothing is ever deleted, so you can
        always come forward again.
      </p>
      <ul>
        <li v-for="v in versionList" :key="v.versionId" :class="{ live: v.isLive }">
          <span class="v-when">
            <strong v-if="v.kind === 'original'">The original copy</strong>
            <strong v-else>{{ stamp(v.savedAt) }}</strong>
            <template v-if="v.savedBy && v.kind !== 'original'"> · {{ v.savedBy }}</template>
          </span>
          <span class="v-state">
            <template v-if="v.isLive">Learners are reading this now</template>
            <template v-else-if="v.everPublished">Was live until {{ stamp(v.publishedAt) }}</template>
            <template v-else>Never published</template>
          </span>
          <button
            type="button"
            class="btn small"
            :disabled="v.isLive || publishing"
            @click="publishVersion(v)"
          >{{ v.isLive ? 'Live' : 'Publish this version' }}</button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '../composables/useAuth'

// The doc id comes from the route: /copy/<doc-id>. The legacy /htw-copy route
// pins it to 'htw' via props, so that link keeps working exactly as before.
const props = defineProps({ doc: { type: String, default: '' } })
const route = useRoute()
const docId = props.doc || route.params.docId || 'htw'

const { getAccessToken } = useAuth()

const text = ref('')
const original = ref('')
const title = ref('Copy')
const blurb = ref('')
const status = ref('Loading…')
const statusIsError = ref(false)
const loadError = ref('')
const saving = ref(false)
const publishing = ref(false)

// 'edit' | 'changes' | 'history'
const view = ref('edit')
const diffAgainst = ref('original')

// Publication state, straight from the API.
const published = ref(null)          // { versionId, publishedAt, publishedBy, ... } or null
const publishedContent = ref(null)
const versionList = ref([])
const lastSavedVersionId = ref(null)

let timer = null
let pending = false

const endpoint = `/api/copy?doc=${encodeURIComponent(docId)}`

function say(msg, isErr = false) {
  status.value = msg
  statusIsError.value = isErr
}

function clock(iso) {
  const d = iso ? new Date(iso) : new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** A date a person can read: "today at 15:32", "19 Aug at 15:32". */
function stamp(iso) {
  if (!iso) return 'never'
  const d = new Date(iso)
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  const day = sameDay
    ? 'today'
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return `${day} at ${clock(iso)}`
}

// What learners are reading, in one sentence. This is the line that has to be
// right: an editor who reads nothing else on the page should still know whether
// their words have reached anybody.
const liveLine = computed(() => {
  if (loadError.value) return ''
  if (!published.value) {
    return 'Nothing is live yet — learners are still reading the words built into the app. Press Publish when you are ready.'
  }
  const who = published.value.publishedBy ? ` by ${published.value.publishedBy}` : ''
  const when = `Live since ${stamp(published.value.publishedAt)}${who}.`
  if (draftDiffersNow.value) return `${when} What is in the box below has NOT reached learners yet — press Publish.`
  return `${when} Learners are reading exactly what is in the box below.`
})

const liveTone = computed(() => {
  if (!published.value) return 'never'
  return draftDiffersNow.value ? 'pending' : 'live'
})

// Compared live against the box, not against the last server answer, so the
// line stops saying "not reached learners yet" the moment an editor undoes
// their change back to the published words.
const draftDiffersNow = computed(() => text.value !== (publishedContent.value ?? null))

const canPublish = computed(() => !loadError.value && (draftDiffersNow.value || !published.value))

const noDiffNote = computed(() =>
  diffAgainst.value === 'published'
    ? 'No changes — learners are reading exactly this.'
    : 'No changes yet — this is the original copy, unedited.'
)

function toggleView(which) {
  view.value = view.value === which ? 'edit' : which
}

async function authHeaders() {
  const token = await getAccessToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function load() {
  try {
    const res = await fetch(endpoint, { headers: await authHeaders() })
    if (!res.ok) throw new Error(`${res.status} ${(await res.json().catch(() => ({}))).error || ''}`)
    const data = await res.json()
    text.value = data.current
    original.value = data.original
    title.value = data.title || 'Copy'
    blurb.value = data.blurb || ''
    document.title = title.value
    applyPublicationState(data)
    say(data.savedAt ? `Last saved ${clock(data.savedAt)}` : 'Loaded.')
  } catch (e) {
    loadError.value = `Could not load the copy — ${e.message}. Reload the page; nothing has been lost.`
    say('Not loaded', true)
  }
}

function applyPublicationState(data) {
  published.value = data.published ?? null
  publishedContent.value = data.publishedContent ?? null
  versionList.value = data.versionList ?? []
  const newest = versionList.value.find(v => v.kind === 'save')
  lastSavedVersionId.value = newest?.versionId ?? null
}

/** Re-read the document so the live line and the history reflect the server. */
async function refresh() {
  try {
    const res = await fetch(endpoint, { headers: await authHeaders() })
    if (!res.ok) return
    applyPublicationState(await res.json())
  } catch {
    // A failed refresh only leaves the status line a little stale; the words in
    // the box are untouched, so there is nothing to tell the editor about.
  }
}

async function save() {
  if (saving.value) { pending = true; return }
  saving.value = true
  say('Saving…')
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
      body: JSON.stringify({ content: text.value })
    })
    if (!res.ok) throw new Error(`${res.status} ${(await res.json().catch(() => ({}))).error || ''}`)
    const data = await res.json().catch(() => ({}))
    if (data.versionId) lastSavedVersionId.value = data.versionId
    say(`Saved ${clock()}`)
  } catch (e) {
    say(`NOT SAVED — ${e.message}. Your text is still here; check your connection and press Save.`, true)
  } finally {
    saving.value = false
    if (pending) { pending = false; save() }
  }
}

/**
 * Publish. Outward-facing to learners, so it confirms first — one click, one
 * confirm — and it saves any unsaved words before publishing, because
 * publishing text the editor has not saved would put a version live that is not
 * the one on their screen.
 */
async function publishLatest() {
  const what = published.value
    ? 'Put the words in the box in front of learners, replacing what they are reading now?'
    : 'Put the words in the box in front of learners? This is the first time this copy goes live.'
  if (!window.confirm(what)) return

  clearTimeout(timer)
  if (status.value.startsWith('Unsaved')) await save()
  if (statusIsError.value) return   // the save failed; do not publish a stale version

  await doPublish({}, 'Published')
}

/** Publish a named version — this is the rollback. */
async function publishVersion(v) {
  const when = v.kind === 'original' ? 'the original copy' : `the version from ${stamp(v.savedAt)}`
  if (!window.confirm(`Put ${when} back in front of learners? Nothing is deleted — you can come forward again.`)) return
  await doPublish({ versionId: v.versionId }, 'Rolled back')
}

async function doPublish(body, verb) {
  if (publishing.value) return
  publishing.value = true
  say('Publishing…')
  try {
    const res = await fetch(`${endpoint}&publish=1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
      body: JSON.stringify(body)
    })
    if (!res.ok) throw new Error(`${res.status} ${(await res.json().catch(() => ({}))).error || ''}`)
    const data = await res.json()
    await refresh()
    if (data.alreadyLive) say('That version was already the live one — nothing changed.')
    else say(`${verb} ${clock(data.publishedAt)} — learners see it within a minute.`)
  } catch (e) {
    say(`NOT PUBLISHED — ${e.message}. Learners still see what they saw before; nothing has been lost.`, true)
  } finally {
    publishing.value = false
  }
}

function onInput() {
  say('Unsaved changes…')
  clearTimeout(timer)
  timer = setTimeout(save, 2000)
}

function saveNow() {
  clearTimeout(timer)
  save()
}

// Line-level diff (LCS) — what is in the box right now, against either the
// frozen original or the words learners are actually reading. The second
// comparison is the one that answers "what am I about to change for them?".
const diffLines = computed(() => {
  const base = diffAgainst.value === 'published' && published.value
    ? (publishedContent.value ?? '')
    : original.value
  const a = base.split('\n')
  const b = text.value.split('\n')
  if (base === text.value) return []
  const n = a.length, m = b.length
  const lcs = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1])
    }
  }
  const out = []
  let i = 0, j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) { out.push({ kind: 'same', text: '  ' + a[i] }); i++; j++ }
    else if (lcs[i + 1][j] >= lcs[i][j + 1]) { out.push({ kind: 'del', text: '- ' + a[i] }); i++ }
    else { out.push({ kind: 'add', text: '+ ' + b[j] }); j++ }
  }
  while (i < n) out.push({ kind: 'del', text: '- ' + a[i++] })
  while (j < m) out.push({ kind: 'add', text: '+ ' + b[j++] })
  // Only show changed lines with a little context.
  const keep = new Set()
  out.forEach((l, k) => {
    if (l.kind !== 'same') for (let x = k - 2; x <= k + 2; x++) keep.add(x)
  })
  return out.filter((_, k) => keep.has(k))
})

function beforeUnload(e) {
  if (status.value.startsWith('Unsaved') || saving.value || publishing.value) { e.preventDefault(); e.returnValue = '' }
}

onMounted(() => {
  load()
  window.addEventListener('beforeunload', beforeUnload)
})
onBeforeUnmount(() => {
  clearTimeout(timer)
  window.removeEventListener('beforeunload', beforeUnload)
})
</script>

<style scoped>
.htw-wrap {
  max-width: 900px;
  margin: 0 auto;
  padding: 16px 12px calc(16px + env(safe-area-inset-bottom, 0px));
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.htw-head { padding-bottom: 8px; }
h1 { font-size: 18px; margin: 0 0 6px; font-weight: 600; }
.note { margin: 0; font-size: 14px; opacity: 0.75; line-height: 1.5; }
.back { display: inline-block; margin-top: 8px; font-size: 14px; opacity: 0.75; color: inherit; }
.htw-bar { display: flex; align-items: center; gap: 10px; padding: 10px 0; flex-wrap: wrap; }
.status { flex: 1; font-size: 14px; opacity: 0.8; min-width: 140px; }
.status.err { color: #c0392b; opacity: 1; font-weight: 600; }
.btn {
  font: inherit; font-size: 14px; padding: 8px 14px; border-radius: 8px;
  border: 1px solid rgba(128, 128, 128, 0.4); background: transparent;
  color: inherit; cursor: pointer;
}
.btn.primary { border-color: rgba(128, 128, 128, 0.7); font-weight: 600; }
.btn.publish { border-color: #1e8449; color: #1e8449; font-weight: 600; }
.btn.small { font-size: 13px; padding: 6px 10px; }
.btn.small.on { border-color: rgba(128, 128, 128, 0.8); font-weight: 600; }
.btn:disabled { opacity: 0.5; cursor: default; }

.live-line {
  margin: 0; padding: 10px 12px; border-radius: 10px; font-size: 14px; line-height: 1.5;
  border: 1px solid rgba(128, 128, 128, 0.35);
}
.live-line.live { border-color: rgba(30, 132, 73, 0.6); }
.live-line.pending { border-color: rgba(191, 143, 0, 0.7); }
.live-line.never { opacity: 0.8; }

.diff-switch { display: flex; gap: 8px; padding-bottom: 10px; }

.history ul { list-style: none; padding: 0; margin: 14px 0 0; display: flex; flex-direction: column; gap: 8px; }
.history li {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  padding: 10px 12px; border: 1px solid rgba(128, 128, 128, 0.35); border-radius: 10px;
}
.history li.live { border-color: rgba(30, 132, 73, 0.6); }
.v-when { font-size: 14px; }
.v-state { flex: 1; font-size: 13px; opacity: 0.7; min-width: 160px; }
.htw-doc {
  flex: 1; width: 100%; min-height: 65vh; padding: 14px; border-radius: 10px;
  border: 1px solid rgba(128, 128, 128, 0.35); background: rgba(255, 255, 255, 0.04);
  color: inherit; font-size: 16px; line-height: 1.6;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  resize: vertical; -webkit-appearance: none;
}
.load-error { color: #c0392b; font-size: 14px; padding: 8px 0; }
.htw-diff pre {
  font-size: 13px; line-height: 1.5; white-space: pre-wrap; word-break: break-word;
  border: 1px solid rgba(128, 128, 128, 0.35); border-radius: 10px; padding: 12px;
}
.htw-diff .add { color: #1e8449; }
.htw-diff .del { color: #c0392b; }
.htw-diff .same { opacity: 0.55; }
</style>
