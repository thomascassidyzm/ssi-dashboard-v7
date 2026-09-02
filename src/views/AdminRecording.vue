<template>
  <div class="admin-recording">
    <h1>Human recording</h1>
    <p class="lede">Which languages we record with people instead of TTS, how far each one has got, and the link to send the recordist.</p>

    <div v-if="loading" class="ar-spinner"></div>
    <p v-else-if="error" class="ar-error">{{ error }}</p>

    <ul v-else class="lang-list">
      <li v-for="row in rows" :key="row.language" class="lang">
        <div class="lang-head">
          <div class="lang-name">
            <span class="lang-title">{{ row.languageName || row.language }}</span>
            <span class="lang-code">{{ row.language }}</span>
          </div>
          <label class="human-toggle" :class="{ saving: saving === row.language }">
            <input
              type="checkbox"
              :checked="row.humanOnly"
              :disabled="saving === row.language"
              @change="toggle(row, $event.target.checked)"
            />
            <span>Record with people</span>
          </label>
        </div>

        <!-- Coverage: the whole language, split by the two voices that carry it -->
        <div class="bar" :title="`${taken(row)} of ${row.total} recorded`">
          <div
            v-for="(v, i) in row.voices || []"
            :key="v.voiceId"
            class="bar-seg"
            :class="`seg-${i % 2}`"
            :style="{ width: pct(taken(v), row.total) }"
          ></div>
        </div>
        <p class="bar-caption">
          <!-- RECORDED MEANS A TAKE EXISTS, and it has to match what the
               recordist is told to the line. `row.recorded` is the narrower
               "not asked for again", which said 64 here while Aran and Catrin
               between them had read 109. Both truths, same words as their own
               screens. -->
          {{ taken(row) }} of {{ row.total }} recorded<span v-if="again(row)">, {{ again(row) }} of those to read again</span><span v-if="row.total"> — {{ Math.round(taken(row) / row.total * 100) }}%</span>
          <span v-if="row.uncast" class="uncast"> · {{ row.uncast }} not cast to a voice</span>
          <!-- Cast to a gender, but in a dialect this language has no voice for.
               Counted separately from `uncast` because the remedy is different:
               these lines need a voice tagged with their dialect, not a cast. -->
          <span v-if="row.unrouted" class="uncast"> · {{ row.unrouted }} in a dialect with no voice cast</span>
        </p>

        <ul class="voices">
          <li v-for="(v, i) in row.voices || []" :key="v.voiceId" class="voice">
            <span class="swatch" :class="`seg-${i % 2}`"></span>
            <span class="voice-name">{{ v.name || v.voiceId }}</span>
            <span class="voice-gender">{{ v.gender }}<template v-if="v.dialect && v.dialect !== 'standard'"> · {{ v.dialect }}</template></span>
            <span class="voice-count">{{ taken(v) }} of {{ v.total }}</span>
            <button class="copy-btn" @click="copyLink(v.voiceId)">
              {{ copied === v.voiceId ? 'Copied' : 'Copy link' }}
            </button>
            <!-- THE THREE JOBS INSIDE ONE TOTAL, named as the booth names them
                 (Tom, 2026-09-02: POD-1 / new sentences / re-recording in this
                 course). Without it "441 lines" is a number with no shape, and
                 this page and the recordist's page cannot be read against each
                 other except in aggregate. -->
            <span v-if="kindParts(v).length" class="voice-kinds">
              <span v-for="k in kindParts(v)" :key="k.key" class="kind">{{ k.label }} {{ k.withTake }}/{{ k.total }}</span>
            </span>
          </li>
        </ul>
      </li>
    </ul>
  </div>
</template>

<script setup>
// Tom's whole side of human recording, and deliberately nothing else: the
// per-LANGUAGE flag, the per-language coverage bar split by its two voices, and
// the link to send each recordist. No per-course toggles, no per-pod gating, no
// per-clip approval — every one of those was a decision nobody was making, on a
// screen someone still had to read.
import { ref, onMounted } from 'vue'
import { recordingApiBase as apiBase } from '@/services/recordingApi'
import { useAuth } from '@/composables/useAuth'

const { getAccessToken } = useAuth()

const rows = ref([])
const loading = ref(true)
const error = ref(null)
const saving = ref(null)
const copied = ref(null)


// The estate authorises /api/* off a Supabase bearer token, not a cookie —
// every other production-api caller in this app does the same. (credentials:
// 'include' is not just unnecessary here, it is fatal: a server answering
// Access-Control-Allow-Origin:* fails the credentialed CORS check outright.)
async function authHeaders() {
  const token = await getAccessToken()
  return {
    'ngrok-skip-browser-warning': 'true',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }
}

function pct(n, total) {
  if (!total) return '0%'
  return `${Math.max(0, Math.min(100, (n / total) * 100))}%`
}

// ONE DEFINITION OF "RECORDED", SHARED WITH THE RECORDIST'S OWN SCREEN: a take
// exists, whether or not we have asked for it to be read again. The API's
// `recorded` is the narrower "not asked for again" and stays on the wire for
// the run itself; `withTake` is what a person has actually read. The ?? keeps
// this page honest against an older API build that has not shipped the field.
function taken(row) { return row.withTake ?? row.recorded ?? 0 }
function again(row) { return row.again ?? 0 }

// The booth's own headings, so the two screens use one vocabulary. Kinds absent
// from a voice's queue are not drawn — an empty heading is a question with no
// answer (the same rule the recordist roster follows).
const KIND_LABELS = { pod: 'POD-1', seed: 'New sentences', quarry: 'Minimal set', rerecord: 'Re-recording' }
function kindParts(voice) {
  const kinds = voice.kinds || {}
  return Object.keys(KIND_LABELS)
    .filter((k) => kinds[k] && kinds[k].total)
    .map((k) => ({ key: k, label: KIND_LABELS[k], total: kinds[k].total, withTake: kinds[k].withTake ?? 0 }))
}

// The link IS the recordist's identity, so it must be an absolute URL to THIS
// origin — a relative path pasted into a message goes nowhere.
function recordLink(voiceId) {
  return `${window.location.origin}/r/${encodeURIComponent(voiceId)}`
}

async function copyLink(voiceId) {
  const link = recordLink(voiceId)
  try {
    await navigator.clipboard.writeText(link)
  } catch {
    // Clipboard is blocked without a secure context or a user gesture on some
    // browsers; a prompt still lets the link be copied by hand.
    window.prompt('Copy this link:', link)
  }
  copied.value = voiceId
  setTimeout(() => { if (copied.value === voiceId) copied.value = null }, 2000)
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await fetch(`${apiBase()}/api/recording/coverage`, { headers: await authHeaders() })
    if (!res.ok) throw new Error(`Could not load coverage (${res.status})`)
    const data = await res.json()
    rows.value = Array.isArray(data) ? data : (data.languages || [])
  } catch (err) {
    error.value = (err && err.message) || 'Network error'
  } finally {
    loading.value = false
  }
}

async function toggle(row, humanOnly) {
  saving.value = row.language
  try {
    const res = await fetch(`${apiBase()}/api/recording/languages/${encodeURIComponent(row.language)}`, {
      method: 'PUT',
      headers: { ...(await authHeaders()), 'Content-Type': 'application/json' },
      body: JSON.stringify({ humanOnly })
    })
    if (!res.ok) throw new Error(`Could not save (${res.status})`)
    row.humanOnly = humanOnly
  } catch (err) {
    error.value = (err && err.message) || 'Could not save that change'
    // Leave the row showing the truth we last had from the server.
    await load()
  } finally {
    saving.value = null
  }
}

onMounted(load)
</script>

<style scoped>
.admin-recording { max-width: 820px; margin: 0 auto; padding: 1.5rem 1rem 3rem; color: var(--color-paper, #f7f7f2); }
h1 { font-family: 'Josefin Sans', sans-serif; font-size: 1.6rem; margin: 0 0 0.3rem; }
.lede { color: var(--color-paper-dim, #c1c1bb); font-size: 0.92rem; margin: 0 0 1.5rem; }
.ar-error { color: #ff9d9d; }
.ar-spinner {
  width: 32px; height: 32px; margin: 2rem auto;
  border: 3px solid var(--color-graphite, #475569);
  border-top-color: var(--color-tungsten, #ffa630);
  border-radius: 50%; animation: ar-spin 1s linear infinite;
}
@keyframes ar-spin { to { transform: rotate(360deg); } }

.lang-list, .voices { list-style: none; margin: 0; padding: 0; }
.lang {
  background: var(--color-shadow, #1e293b);
  border: 1px solid var(--color-graphite, #475569);
  border-radius: 12px; padding: 1rem 1.1rem; margin-bottom: 0.85rem;
}
.lang-head { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
.lang-title { font-family: 'Josefin Sans', sans-serif; font-size: 1.1rem; font-weight: 600; }
.lang-code { font-family: 'IBM Plex Mono', monospace; font-size: 0.7rem; color: var(--color-paper-dim, #c1c1bb); margin-left: 0.5rem; }
.human-toggle { display: inline-flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; cursor: pointer; min-height: 44px; }
.human-toggle input { width: 20px; height: 20px; accent-color: var(--color-emerald, #06ffa5); }
.human-toggle.saving { opacity: 0.5; }

.bar {
  display: flex; height: 12px; border-radius: 6px; overflow: hidden; margin: 0.75rem 0 0.4rem;
  background: var(--color-void, #0f172a); border: 1px solid var(--color-graphite, #475569);
}
.bar-seg { height: 100%; transition: width 0.3s ease; }
.seg-0 { background: var(--color-emerald, #06ffa5); }
.seg-1 { background: var(--color-tungsten, #ffa630); }
.bar-caption { font-size: 0.78rem; color: var(--color-paper-dim, #c1c1bb); margin: 0 0 0.6rem; }
.uncast { color: var(--color-tungsten, #ffa630); }

.voice { display: flex; align-items: center; gap: 0.6rem; padding: 0.35rem 0; font-size: 0.85rem; flex-wrap: wrap; }
.swatch { width: 10px; height: 10px; border-radius: 3px; flex-shrink: 0; }
.voice-name { font-weight: 600; }
.voice-gender, .voice-count { color: var(--color-paper-dim, #c1c1bb); font-size: 0.78rem; }
.voice-count { margin-left: auto; font-family: 'IBM Plex Mono', monospace; }
/* Its own row under the voice: a phone has no room for three kinds beside a
   name, a count and a button, and wrapping mid-list reads as noise. */
.voice-kinds { flex-basis: 100%; display: flex; flex-wrap: wrap; gap: 0.15rem 0.9rem; padding-left: 1.3rem; }
.kind { color: var(--color-paper-dim, #c1c1bb); font-size: 0.72rem; font-family: 'IBM Plex Mono', monospace; }
.copy-btn {
  font-family: 'Josefin Sans', sans-serif; font-size: 0.78rem; font-weight: 600;
  color: var(--color-void, #0f172a); background: var(--color-emerald, #06ffa5);
  border: none; border-radius: 6px; padding: 0.45rem 0.8rem; cursor: pointer; min-height: 38px;
}

:root[data-theme="light"] .lang, :root[data-theme="light"] .bar { border-color: var(--line); }
</style>
