<template>
  <div class="htw-wrap">
    <header class="htw-head">
      <h1>{{ title }}</h1>
      <p class="note">
        {{ blurb }}
        Edit anything below — your changes save automatically and Tom sees them.
        Nothing to send anywhere.
      </p>
      <router-link v-if="docId !== 'htw'" class="back" to="/copy">‹ All copy surfaces</router-link>
    </header>

    <div class="htw-bar">
      <span class="status" :class="{ err: statusIsError }">{{ status }}</span>
      <button type="button" class="btn" @click="showChanges = !showChanges">
        {{ showChanges ? 'Back to editing' : 'What has changed' }}
      </button>
      <button type="button" class="btn primary" :disabled="saving" @click="saveNow">Save</button>
    </div>

    <div v-if="loadError" class="load-error">{{ loadError }}</div>

    <textarea
      v-show="!showChanges && !loadError"
      v-model="text"
      class="htw-doc"
      spellcheck="false"
      autocapitalize="off"
      autocorrect="off"
      @input="onInput"
    ></textarea>

    <div v-if="showChanges" class="htw-diff">
      <p v-if="!diffLines.length" class="note">No changes yet — this is the original copy, unedited.</p>
      <pre v-else><span
        v-for="(l, i) in diffLines"
        :key="i"
        :class="l.kind"
      >{{ l.text }}
</span></pre>
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
const showChanges = ref(false)

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
    say(data.savedAt ? `Last saved ${clock(data.savedAt)}` : 'Loaded.')
  } catch (e) {
    loadError.value = `Could not load the copy — ${e.message}. Reload the page; nothing has been lost.`
    say('Not loaded', true)
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
    say(`Saved ${clock()}`)
  } catch (e) {
    say(`NOT SAVED — ${e.message}. Your text is still here; check your connection and press Save.`, true)
  } finally {
    saving.value = false
    if (pending) { pending = false; save() }
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

// Line-level diff (LCS) — original vs what is in the box right now.
const diffLines = computed(() => {
  const a = original.value.split('\n')
  const b = text.value.split('\n')
  if (original.value === text.value) return []
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
  if (status.value.startsWith('Unsaved') || saving.value) { e.preventDefault(); e.returnValue = '' }
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
.btn:disabled { opacity: 0.5; cursor: default; }
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
