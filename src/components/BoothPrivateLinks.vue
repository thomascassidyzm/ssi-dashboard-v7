<template>
  <!-- PRIVATE BOOTH LINKS (Aran, 2026-10-14, job #380). God admins only: the server
       answers 403 to anyone else, and then this panel draws nothing at all. -->
  <section v-if="!hidden" class="links">
    <div class="links-head">
      <h2>Private booth links</h2>
      <span v-if="graceOn !== null" class="grace" :class="{ off: !graceOn }">
        {{ graceOn ? 'Grace mode ON — old links still open booths, and are logged' : 'Grace mode OFF — old links are refused' }}
      </span>
    </div>
    <p class="lede">Each artist's link carries a private key, so nobody can open another artist's booth by editing the name in theirs. Making a new link stops the old one working.</p>
    <p v-if="loading" class="note">Loading…</p>
    <p v-else-if="error" class="pl-error">{{ error }}</p>
    <ul v-else class="rows">
      <li v-for="v in rows" :key="v.voiceId" class="row">
        <div class="who">
          <span class="name">{{ v.name }}</span>
          <span class="meta">{{ v.voiceId }}</span>
          <span v-if="graceFor(v.voiceId)" class="old-use" :title="`last ${graceFor(v.voiceId).lastAt}`">
            opened {{ graceFor(v.voiceId).count }}× without the key since the server last started
          </span>
        </div>
        <div class="acts">
          <template v-if="v.key">
            <code v-if="shown === v.voiceId" class="link">{{ linkFor(v) }}</code>
            <button class="btn" @click="shown = shown === v.voiceId ? null : v.voiceId">{{ shown === v.voiceId ? 'Hide' : 'Show' }}</button>
            <button class="btn" @click="copy(v)">{{ copied === v.voiceId ? 'Copied' : 'Copy' }}</button>
            <button class="btn quiet" :disabled="busy === v.voiceId" @click="make(v, true)">New link</button>
          </template>
          <template v-else>
            <span v-if="v.hasRow" class="meta">made on another server — make a new one to show it</span>
            <button class="btn" :disabled="busy === v.voiceId" @click="make(v, v.hasRow)">Make link</button>
          </template>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { recordingApiBase as apiBase, privateBoothLink } from '@/services/recordingApi'

// voices: [{ voiceId, name }] — the artists Human recording already lists.
const props = defineProps({ voices: { type: Array, default: () => [] } })
const emit = defineEmits(['links'])
const { getAccessToken } = useAuth()

const hidden = ref(false)
const loading = ref(true)
const error = ref(null)
const graceOn = ref(null)
const links = ref({})   // voiceId → { key, createdAt, createdBy }
const grace = ref({})   // voiceId → { count, lastAt, lastReason }
const shown = ref(null)
const copied = ref(null)
const busy = ref(null)

const rows = computed(() => {
  const seen = new Set()
  const out = []
  for (const v of props.voices) {
    if (seen.has(v.voiceId)) continue
    seen.add(v.voiceId)
    out.push(row(v.voiceId, v.name))
  }
  // A key made for a voice this page no longer lists (e.g. a pack) still shows.
  for (const id of Object.keys(links.value)) if (!seen.has(id)) { seen.add(id); out.push(row(id, id)) }
  return out
})
function row(voiceId, name) {
  const l = links.value[voiceId]
  return { voiceId, name: name || voiceId, key: l ? l.key : null, hasRow: !!l }
}
const graceFor = (id) => grace.value[id] || null
const linkFor = (v) => privateBoothLink(window.location.origin, v.voiceId, v.key)

async function headers() {
  const token = await getAccessToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await fetch(`${apiBase()}/api/recording/admin/booth-links`, { headers: await headers() })
    if (res.status === 401 || res.status === 403) { hidden.value = true; return }
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || `Could not load links (${res.status})`)
    graceOn.value = data.graceOn
    links.value = Object.fromEntries((data.links || []).map((l) => [l.voiceId, l]))
    grace.value = data.grace || {}
    publish()
  } catch (err) {
    error.value = (err && err.message) || 'Network error'
  } finally {
    loading.value = false
  }
}
// Human recording's own Copy link / Open buttons use the private link once it is known.
function publish() {
  emit('links', Object.fromEntries(Object.entries(links.value).filter(([, l]) => l.key).map(([id, l]) => [id, l.key])))
}

async function make(v, replacing) {
  if (replacing && !window.confirm(`Make a new link for ${v.name}?\n\nTheir current link stops working, so they will need the new one.`)) return
  busy.value = v.voiceId
  error.value = null
  try {
    const res = await fetch(`${apiBase()}/api/recording/admin/booth-links/${encodeURIComponent(v.voiceId)}`, { method: 'POST', headers: await headers() })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || `Could not make the link (${res.status})`)
    links.value = { ...links.value, [data.voiceId]: data }
    shown.value = data.voiceId
    publish()
  } catch (err) {
    error.value = (err && err.message) || 'Network error'
  } finally {
    busy.value = null
  }
}

async function copy(v) {
  const link = linkFor(v)
  try { await navigator.clipboard.writeText(link) } catch { window.prompt('Copy this link:', link) }
  copied.value = v.voiceId
  setTimeout(() => { if (copied.value === v.voiceId) copied.value = null }, 2000)
}

load()
</script>

<style scoped>
.links { margin: 0 0 2rem; }
.links-head { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
h2 { font-family: 'Josefin Sans', sans-serif; font-size: 1.2rem; margin: 0; }
.grace { font-size: 0.75rem; color: var(--color-tungsten, #ffa630); }
.grace.off { color: var(--color-emerald, #06ffa5); }
.lede { color: var(--color-paper-dim, #c1c1bb); font-size: 0.85rem; margin: 0.2rem 0 0.9rem; }
.note, .meta { color: var(--color-paper-dim, #c1c1bb); font-size: 0.75rem; }
.pl-error { color: #ff9d9d; }
.rows { list-style: none; margin: 0; padding: 0; background: var(--color-shadow, #1e293b); border: 1px solid var(--color-graphite, #475569); border-radius: 12px; }
.row { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem 1rem; padding: 0.6rem 1rem; border-bottom: 1px solid var(--color-graphite, #475569); }
.row:last-child { border-bottom: none; }
.who { display: flex; flex-direction: column; min-width: 10rem; flex: 1; }
.name { font-weight: 600; font-size: 0.9rem; }
.meta { font-family: 'IBM Plex Mono', monospace; }
.old-use { font-size: 0.72rem; color: var(--color-tungsten, #ffa630); }
.acts { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem; }
.link { font-family: 'IBM Plex Mono', monospace; font-size: 0.7rem; word-break: break-all; max-width: 100%; }
.btn {
  min-height: 36px; padding: 0 0.8rem; border-radius: 8px; cursor: pointer; font-size: 0.8rem;
  background: transparent; color: inherit; border: 1px solid var(--color-graphite, #475569);
}
.btn:hover { border-color: var(--color-emerald, #06ffa5); }
.btn.quiet { color: var(--color-paper-dim, #c1c1bb); }
.btn:disabled { opacity: 0.5; cursor: default; }
:root[data-theme="light"] .rows,
:root[data-theme="light"] .row,
:root[data-theme="light"] .btn { border-color: var(--line); }
:root[data-theme="light"] .rows { box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06); }
:root[data-theme="light"] .pl-error { color: var(--danger); }
:root[data-theme="light"] .grace { color: var(--danger); }
</style>
