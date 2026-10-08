<template>
  <div class="rt">
    <router-link to="/admin/recording" class="rt-back">&larr; Human recording</router-link>
    <h1>{{ voiceId }}</h1>
    <p class="rt-lede">Two tools for this voice artist. Neither deletes a take.</p>
    <p v-if="error" class="rt-error">{{ error }}</p>

    <section class="rt-card">
      <h2>Setup check</h2>
      <p v-if="!check || !check.exists">No setup check yet. Asking for one picks ten of their own lines, and the full script stays closed to them until you approve their sample.</p>
      <button v-if="!check || !check.exists" class="rt-btn" :disabled="busy" @click="createCheck">Ask for a 10-phrase setup check</button>
      <template v-else>
        <p>Status: <strong>{{ check.status }}</strong><span v-if="check.reviewedBy"> — last decision by {{ check.reviewedBy }}</span></p>
        <p v-if="check.autoVerdict" class="rt-verdict">
          <span :class="check.autoVerdict.verdict === 'pass' ? 'rt-badge rt-pass' : 'rt-badge rt-retry'">Auto-verdict: {{ check.autoVerdict.verdict }}</span>
          <span v-for="r in check.autoVerdict.reasons" :key="r"> · {{ r }}</span>
          <span class="rt-device"> ({{ check.autoVerdict.judged }} takes judged; it never approves anything)</span>
          <span v-if="check.verdictThresholds" class="rt-device"><br>Benchmark: accepted takes (Dan, Aran, Catrin, Tom) sit at noise floor -120 to -80 dB (retry above {{ check.verdictThresholds.NOISE_FLOOR_MAX_DB }}), clean by 61 to 107 dB (retry below {{ check.verdictThresholds.CLEAN_SNR_MIN_DB }}), loudest half-second -23 to -6 dB (retry below {{ check.verdictThresholds.SPEECH_MIN_DB }}), clipped samples at most 0.021% (retry above {{ check.verdictThresholds.CLIP_FRAC_MAX_PCT }}%).</span>
        </p>
        <p v-else class="rt-device">No auto-verdict yet: no take has been measured (or too few could be), so listen yourself.</p>
        <p class="rt-link">Artist link: <code>{{ origin }}/r/{{ check.packVoiceId }}</code>
          <button class="rt-mini" @click="copy(`${origin}/r/${check.packVoiceId}`)">{{ copied ? 'Copied' : 'Copy' }}</button></p>
        <ol class="rt-items">
          <li v-for="it in check.items" :key="it.id">
            <div class="rt-text">{{ it.text }}</div>
            <template v-if="it.recorded">
              <audio :src="it.url" controls preload="none"></audio>
              <div v-if="it.measures" class="rt-nums">
                level {{ it.measures.levelDb }} dB · peak {{ it.measures.peakDb }} dB<span v-if="it.measures.peakDb > -1" class="rt-bad"> (clipped)</span>
                · noise {{ it.measures.noiseDb }} dB · clean by {{ it.measures.snrDb }} dB
                · bass {{ it.measures.bassDb }} dB · treble {{ it.measures.trebleDb }} dB
                <template v-if="it.measures.floorDb != null">
                  · floor {{ it.measures.floorDb }} dB · speech {{ it.measures.speechDb }} dB · clean by {{ it.measures.cleanSnrDb }} dB
                  · clipped {{ it.measures.clippedSamples }} samples ({{ Math.round(it.measures.clipFracPct * 100) / 100 }}%)
                  · lead {{ it.measures.leadSec }}s · tail {{ it.measures.trailSec }}s · gated {{ Math.round((it.measures.gatedShare || 0) * 100) }}%
                </template>
                <span v-for="f in flagsFor(it.id)" :key="f" class="rt-bad"> · {{ f }}</span>
              </div>
              <div class="rt-device">{{ it.device || 'device not recorded' }}</div>
            </template>
            <div v-else class="rt-device">not recorded yet</div>
          </li>
        </ol>
        <textarea v-model="note" class="rt-note" placeholder="A note for the artist (shown if you ask for another go)"></textarea>
        <div class="rt-row">
          <button class="rt-btn" :disabled="busy || check.status === 'approved'" @click="decide('approve')">Approve — open the full script</button>
          <button class="rt-btn rt-ghost" :disabled="busy" @click="decide('changes')">Ask for another go</button>
        </div>
      </template>
    </section>

    <section class="rt-card">
      <h2>Re-record all</h2>
      <p v-if="preview">This voice has <strong>{{ preview.clips }}</strong> stored takes<span v-if="slotCount"> in <strong>{{ slotCount }}</strong> slots</span>. Re-record all archives them (kept, recoverable), empties those slots, and gives the artist the empty-slot run from line one. Until each line is re-recorded, learners hear nothing for it.</p>
      <button class="rt-btn rt-danger" :disabled="busy || !preview || !preview.clips" @click="resetAll">Re-record all…</button>
      <ul v-if="preview && preview.history.length" class="rt-history">
        <li v-for="h in preview.history" :key="h.id">
          {{ new Date(h.created_at).toLocaleString() }} — {{ h.clips }} takes archived by {{ h.created_by }}
          <span v-if="h.restored_at"> · restored</span>
          <button v-else class="rt-mini" :disabled="busy" @click="restore(h.id)">Restore these</button>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { recordingApiBase as apiBase } from '@/services/recordingApi'
import { useAuth } from '@/composables/useAuth'

const { getAccessToken } = useAuth()
const route = useRoute()
const voiceId = route.params.voiceId
const origin = window.location.origin
const base = () => `${apiBase()}/api/recording/voice/${encodeURIComponent(voiceId)}`

const check = ref(null)
const FLAG_WORDS = { clipping: 'clipping', noise: 'noisy', far: 'far from mic' }
const flagsFor = (id) => {
  const t = (check.value?.autoVerdict?.perTake || []).find((x) => x.id === id)
  return t ? t.flags.map((f) => FLAG_WORDS[f] || f) : []
}
const preview = ref(null)
const error = ref(null)
const busy = ref(false)
const note = ref('')
const copied = ref(false)

const slotCount = computed(() => preview.value ? Object.values(preview.value.slots).reduce((a, b) => a + b, 0) : 0)

async function headers() {
  const token = await getAccessToken()
  return { 'ngrok-skip-browser-warning': 'true', 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
}

async function call(path, method = 'GET', body) {
  const res = await fetch(`${base()}${path}`, { method, headers: await headers(), body: body ? JSON.stringify(body) : undefined })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

async function refresh() {
  error.value = null
  try {
    check.value = await call('/setup-check')
    preview.value = await call('/rerecord-all')
  } catch (e) { error.value = e.message }
}

async function run(fn) {
  busy.value = true
  error.value = null
  try { await fn() } catch (e) { error.value = e.message } finally { busy.value = false }
  await refresh()
}

const createCheck = () => run(() => call('/setup-check', 'POST', {}))
const decide = (decision) => run(() => call('/setup-check/decision', 'POST', { decision, note: note.value || null }))
const restore = (id) => run(() => call(`/rerecord-all/${id}/restore`, 'POST', {}))

function resetAll() {
  const p = preview.value
  const ok = window.confirm(
    `Re-record all for ${voiceId}?\n\n${p.clips} stored takes will be archived (kept, not deleted) and ${slotCount.value} slots emptied. ` +
    'The artist will see every line as still to record. Learners hear nothing for a line until it is re-recorded.\n\nYou can restore this afterwards.')
  if (ok) run(() => call('/rerecord-all', 'POST', { confirm: true }))
}

async function copy(text) {
  try { await navigator.clipboard.writeText(text) } catch { window.prompt('Copy this link:', text) }
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

onMounted(refresh)
</script>

<style scoped>
.rt { max-width: 760px; margin: 0 auto; padding: 1.5rem 1rem 3rem; color: var(--color-paper, #f7f7f2); }
.rt-back { color: var(--color-paper-dim, #c1c1bb); font-size: 0.85rem; }
h1 { font-family: 'Josefin Sans', sans-serif; font-size: 1.5rem; margin: 0.4rem 0 0.2rem; }
.rt-lede { color: var(--color-paper-dim, #c1c1bb); margin: 0 0 1rem; }
.rt-error { color: #ff9d9d; }
.rt-card { border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 10px; padding: 1rem; margin-bottom: 1.2rem; }
.rt-card h2 { margin: 0 0 0.5rem; font-size: 1.1rem; }
.rt-btn { padding: 0.7rem 1rem; border-radius: 8px; border: 0; background: var(--color-emerald, #06ffa5); color: #07110c; font-weight: 600; font: inherit; cursor: pointer; }
.rt-btn:disabled { opacity: 0.4; cursor: default; }
.rt-ghost { background: transparent; color: inherit; border: 1px solid rgba(255, 255, 255, 0.3); }
.rt-danger { background: #ff9d9d; }
.rt-mini { margin-left: 0.5rem; padding: 0.15rem 0.6rem; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.3); background: transparent; color: inherit; cursor: pointer; }
.rt-row { display: flex; gap: 0.6rem; flex-wrap: wrap; margin-top: 0.6rem; }
.rt-items { padding-left: 1.2rem; }
.rt-items li { margin-bottom: 1rem; }
.rt-text { margin-bottom: 0.3rem; }
.rt-items audio { width: 100%; }
.rt-nums, .rt-device { font-size: 0.82rem; color: var(--color-paper-dim, #c1c1bb); word-break: break-word; }
.rt-bad { color: #ff9d9d; }
.rt-badge { display: inline-block; padding: 0.1rem 0.5rem; border-radius: 999px; font-weight: 600; }
.rt-pass { background: rgba(80, 200, 120, 0.2); color: #8fe0a8; }
.rt-retry { background: rgba(255, 157, 157, 0.2); color: #ff9d9d; }
.rt-note { width: 100%; min-height: 3.5rem; margin-top: 0.6rem; background: transparent; color: inherit; border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 8px; padding: 0.5rem; font: inherit; }
.rt-link code { word-break: break-all; }
.rt-history { margin-top: 0.8rem; font-size: 0.88rem; }
</style>
