<template>
  <!-- data-surface: greppable in the served bundle, so "did it ship?" is answerable without a login -->
  <div class="mine" data-surface="my-recording-list-2026-09-02">

    <section v-if="phase === 'loading'" class="card center">
      <div class="spinner"></div>
      <p>Finding your lines…</p>
    </section>

    <!-- Signed in, but nobody has cast this login as a voice. Say exactly that,
         and say which email it looked under — a recordist who signed in with a
         second address needs to see the address, not a shrug. -->
    <section v-else-if="phase === 'no-voice'" class="card center">
      <h2>No recording voice for this login</h2>
      <p>
        You're signed in as <strong>{{ me.email }}</strong>, and no language names that address as
        one of its voices. Ask for your address to be added and this page fills itself in.
      </p>
    </section>

    <section v-else-if="phase === 'error'" class="card center">
      <h2>Couldn't load your lines</h2>
      <p>{{ loadError }}</p>
      <button class="btn-ghost" @click="load">Try again</button>
    </section>

    <!-- More than one voice on this login: pick which one you're reading today.
         One tap, nothing else on the screen. -->
    <section v-else-if="phase === 'pick-voice'" class="card">
      <h1 class="hello">Hello {{ me.name || firstName }}</h1>
      <p>Which voice are you recording as?</p>
      <button v-for="v in me.voices" :key="v.voiceId" class="voice-pick" @click="chooseVoice(v.voiceId)">
        {{ v.displayName }} — {{ v.languageName }}<span v-if="v.dialect"> · {{ v.dialect }}</span>
      </button>
    </section>

    <!-- ── The list ────────────────────────────────────────────────────────── -->
    <section v-else-if="phase === 'ready'" class="list-wrap">
      <header class="head">
        <h1 class="hello">{{ voice.displayName }} · {{ voice.languageName }}</h1>
        <p class="count">
          <strong>{{ outstandingCount }}</strong>
          {{ outstandingCount === 1 ? 'line' : 'lines' }} still to record<span
            v-if="voice.total"> — {{ voice.recorded + doneThisSession.size }} of {{ voice.total }} done</span>
        </p>
        <p v-if="me.voices.length > 1" class="switch">
          <button class="link-tap" @click="phase = 'pick-voice'">Record as a different voice</button>
        </p>
      </header>

      <p v-if="micError" class="note error">{{ micError }}</p>

      <p class="how">Tap a line to record it. Tap it again when you've finished reading.</p>

      <ol class="rows">
        <li
          v-for="line in visibleLines"
          :key="line.id"
          class="row"
          :class="rowClass(line)"
        >
          <button
            class="row-tap"
            :disabled="busy || (activeId !== null && activeId !== line.id)"
            @click="onRowTap(line)"
          >
            <span class="row-target">{{ line.text }}</span>
            <span v-if="line.knownText" class="row-known">{{ line.knownText }}</span>
            <span class="row-foot">
              <span class="row-state">{{ stateWord(line) }}</span>
              <span v-if="line.speaker" class="row-meta">{{ line.speaker }}</span>
              <span v-if="line.alsoFills" class="row-meta">also fills {{ line.alsoFills }} more</span>
              <span v-if="line.rerecordWanted" class="row-meta">asked for again</span>
            </span>
          </button>

          <!-- Live meter, drawn only on the line being read. Nothing else on the
               page moves while it is up. -->
          <div v-if="activeId === line.id" class="meter" :class="{ clip: recorder.clipping.value }">
            <div class="meter-fill" :style="{ width: meterWidth }"></div>
          </div>

          <p v-if="failures.get(line.id)" class="note error">{{ failures.get(line.id) }}</p>

          <div class="row-tools">
            <!-- Upload is a label around a hidden input: a tap opens the file
                 picker. No drag target, deliberately. -->
            <label class="tool" :class="{ off: activeId !== null }">
              <input type="file" accept="audio/*" class="hidden-file"
                     :disabled="activeId !== null" @change="onFile(line, $event)" />
              Upload a file
            </label>
            <button v-if="clipUrlFor(line)" class="tool" @click="play(line)">
              {{ playingId === line.id ? 'Stop' : 'Listen back' }}
            </button>
          </div>
        </li>
      </ol>

      <p v-if="!visibleLines.length" class="note done">
        Nothing left to record. Turn on “show what I've recorded” to go over any of it again.
      </p>

      <label class="toggle-row">
        <input type="checkbox" v-model="showRecorded" />
        <span><strong>Show the lines I've already recorded</strong>
          <small>Off = only what's still outstanding. A new take replaces the old one; nothing is deleted.</small></span>
      </label>

      <div v-if="recorder.devices.value.length > 1" class="mic-pick">
        <label class="mic-label">Microphone</label>
        <select v-model="selectedDeviceId" class="mic-select">
          <option v-for="(d, i) in recorder.devices.value" :key="d.deviceId" :value="d.deviceId">
            {{ d.label || `Microphone ${i + 1}` }}
          </option>
        </select>
      </div>
    </section>
  </div>
</template>

<script setup>
/**
 * MyRecordingList — a signed-in recordist's own outstanding lines, as a list.
 *
 * WHY THIS EXISTS. The one recordist surface (/r/:voiceId) is link-is-identity
 * and it is an autocue: one tap and it runs the whole queue at you. That is the
 * right shape for a session in a booth and the wrong shape for the question
 * "what do I still owe?". Aran and Catrin sign in to Popty; nothing there
 * answered that question, so it was answered by asking someone.
 *
 * WHAT IS NEW AND WHAT IS REUSED. New: this list, and GET /api/recording/mine,
 * which turns a login into its voice. Reused unchanged: the queue itself
 * (GET /api/recording/voice/:voiceId), the take upload (useRecordistQueue →
 * POST .../take, which is the same archive-before-process seam the autocue
 * uses), the recorder (useTapRecorder), and stored-clip playback. There is one
 * definition of "what is left to record" and this page is not it.
 *
 * HOW STATE IS DRAWN. Recorded rows are solid and filled; outstanding rows are
 * a dashed outline, dimmed — an empty slot looks empty. No status badge, no red
 * and green: colour here means level (the meter clipping), and nothing else.
 *
 * TAP IS THE ONLY AFFORDANCE. Tap a row to start reading it, tap it again to
 * finish. While a row is live every other row is inert — one degree of freedom.
 */
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useTapRecorder } from '@/composables/useTapRecorder'
import { useRecordistQueue } from '@/composables/useRecordistQueue'
import { recordingApiBase as apiBase } from '@/services/recordingApi'
import { recordistClipUrl } from '@/composables/useStoredClip'

const { getAccessToken } = useAuth()
const recorder = useTapRecorder()
const queue = useRecordistQueue()

const phase = ref('loading')
const loadError = ref(null)
const micError = ref(null)
const me = reactive({ email: '', name: '', voices: [] })
const voice = ref({})
const lines = ref([])
const activeId = ref(null)      // the row whose mic is open
const busy = ref(false)
const showRecorded = ref(false)
const selectedDeviceId = ref('')
const playingId = ref(null)
// Lines recorded in THIS sitting. They stay on screen rather than vanishing
// under the thumb — the row redraws as done and the count drops, which is the
// same information without the list jumping.
const doneThisSession = reactive(new Set())
const failures = queue.failed
let audio = null
let streamOpen = false

const firstName = computed(() => (me.email || '').split('@')[0])
const meterWidth = computed(() => `${Math.min(100, Math.round((recorder.level.value || 0) * 140))}%`)

function isDone(line) {
  return line.recorded || doneThisSession.has(line.id)
}
const visibleLines = computed(() =>
  showRecorded.value ? lines.value : lines.value.filter(l => !l.recorded || doneThisSession.has(l.id))
)
const outstandingCount = computed(() => lines.value.filter(l => !isDone(l)).length)

function rowClass(line) {
  if (activeId.value === line.id) return 'is-live'
  if (queue.saved.has(line.id) || isDone(line)) return 'is-done'
  if (failures.has(line.id)) return 'is-failed'
  return 'is-todo'
}

function stateWord(line) {
  if (activeId.value === line.id) return 'Reading — tap to finish'
  if (failures.has(line.id)) return 'Not saved'
  if (doneThisSession.has(line.id)) return 'Recorded just now'
  if (line.rerecordWanted) return 'Recorded — a new take was asked for'
  if (line.recorded) return 'Recorded'
  return 'To record'
}

function clipUrlFor(line) {
  if (line.clipUrl || doneThisSession.has(line.id)) {
    return recordistClipUrl(voice.value.voiceId, line.id)
  }
  return null
}

// ── Recording ───────────────────────────────────────────────────────────────
async function ensureStream() {
  if (streamOpen) return
  await recorder.start(selectedDeviceId.value || null, 'voice')
  streamOpen = true
}

async function onRowTap(line) {
  if (busy.value) return
  if (activeId.value === line.id) return stopRow(line)
  if (activeId.value !== null) return   // one degree of freedom
  busy.value = true
  micError.value = null
  try {
    stopPlayback()
    await ensureStream()
    failures.delete(line.id)
    recorder.beginLine()
    activeId.value = line.id
  } catch (err) {
    micError.value = friendlyMicError(err)
  } finally { busy.value = false }
}

async function stopRow(line) {
  busy.value = true
  try {
    // Snapshot the verdict BEFORE the blob lands: endLine keeps the recorder
    // running for its tail, and beginLine on the next row would reset it.
    const hadSpeech = recorder.meterTrusted.value ? recorder.lineHasSpeech.value : null
    activeId.value = null
    const blob = await recorder.endLine()
    commit(line, blob, hadSpeech)
  } finally { busy.value = false }
}

// Never save silence. Same test, same words, as the autocue surface: FALSE
// refuses a take, NULL (the meter never reported) does not — not knowing is not
// the same as knowing nobody spoke.
function commit(line, blob, hadSpeech) {
  if (!blob || blob.size < 1200 || hadSpeech === false) {
    queue.markFailed(line.id, 'That take came out silent — read it again.')
    return
  }
  send(line, blob)
}

function send(line, blob) {
  const mic = recorder.devices.value.find(d => d.deviceId === selectedDeviceId.value)
  queue.queueTake({
    voiceId: voice.value.voiceId,
    lineId: line.id,
    text: line.text,
    blob,
    micLabel: mic && mic.label,
  })
  // Optimistic, then corrected: the queue records a per-line failure and the row
  // redraws as "Not saved" with the server's own words if the take is refused.
  doneThisSession.add(line.id)
}

function onFile(line, event) {
  const file = event.target.files && event.target.files[0]
  event.target.value = ''
  if (!file) return
  failures.delete(line.id)
  if (file.size < 1200) {
    queue.markFailed(line.id, 'That file is empty.')
    return
  }
  send(line, file)
}

function friendlyMicError(err) {
  const name = (err && err.name) || ''
  if (name === 'NotAllowedError') return 'The browser blocked the microphone. Allow it for this site and tap again.'
  if (name === 'NotFoundError') return 'No microphone found.'
  return (err && err.message) || 'Could not open the microphone.'
}

// ── Playback of the STORED clip (never the local blob) ───────────────────────
function play(line) {
  if (playingId.value === line.id) return stopPlayback()
  stopPlayback()
  const url = clipUrlFor(line)
  if (!url) return
  audio = new Audio(url)
  audio.onended = () => { playingId.value = null }
  audio.play().then(() => { playingId.value = line.id }).catch(() => { playingId.value = null })
}
function stopPlayback() {
  if (audio) { audio.pause(); audio = null }
  playingId.value = null
}

// ── Load ────────────────────────────────────────────────────────────────────
async function load() {
  phase.value = 'loading'
  loadError.value = null
  try {
    const token = await getAccessToken()
    const res = await fetch(`${apiBase()}/api/recording/mine`, {
      headers: { 'ngrok-skip-browser-warning': 'true', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
    if (!res.ok) throw new Error(`Could not check your recording voice (${res.status})`)
    const data = await res.json()
    me.email = data.email || ''
    me.name = data.name || ''
    me.voices = Array.isArray(data.voices) ? data.voices : []
    if (!me.voices.length) { phase.value = 'no-voice'; return }
    if (me.voices.length > 1) { phase.value = 'pick-voice'; return }
    await chooseVoice(me.voices[0].voiceId)
  } catch (err) {
    loadError.value = (err && err.message) || 'Network error'
    phase.value = 'error'
  }
}

async function chooseVoice(voiceId) {
  phase.value = 'loading'
  try {
    // includeRecorded=1 always: the toggle then costs nothing, and the header
    // can say "12 of 276 done" — which it cannot if the server already dropped
    // the 12.
    const res = await fetch(
      `${apiBase()}/api/recording/voice/${encodeURIComponent(voiceId)}?includeRecorded=1`,
      { headers: { 'ngrok-skip-browser-warning': 'true' } }
    )
    if (!res.ok) throw new Error(`Could not load your lines (${res.status})`)
    const data = await res.json()
    voice.value = data
    lines.value = Array.isArray(data.lines) ? data.lines : []
    doneThisSession.clear()
    queue.reset()
    phase.value = 'ready'
  } catch (err) {
    loadError.value = (err && err.message) || 'Network error'
    phase.value = 'error'
  }
}

function beforeUnloadGuard(e) {
  if (activeId.value !== null || queue.pendingCount.value > 0) { e.preventDefault(); e.returnValue = '' }
}

onMounted(() => {
  window.addEventListener('beforeunload', beforeUnloadGuard)
  recorder.listDevices()
  load()
})
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', beforeUnloadGuard)
  stopPlayback()
  if (recorder.isRecording.value) recorder.stop()
})
</script>

<style scoped>
/* Phone first: Aran and Catrin work on phones. The line is the biggest thing on
   the row; everything tappable clears 48px. */
.mine {
  max-width: 640px;
  margin: 0 auto;
  padding: 1rem 1rem 4rem;
  min-height: 100vh;
  color: var(--color-paper, #f7f7f2);
  background: var(--color-void, #0f172a);
}
.card {
  background: var(--color-shadow, #1e293b);
  border: 1px solid var(--color-graphite, #475569);
  border-radius: 16px;
  padding: 1.75rem 1.35rem;
  margin-top: 1.5rem;
}
.card.center { text-align: center; }
.card p { color: var(--color-paper-dim, #c1c1bb); font-size: 0.95rem; line-height: 1.6; }
.hello { font-family: 'Josefin Sans', sans-serif; font-size: 1.5rem; margin: 0 0 0.35rem; }
.card h2 { font-family: 'Josefin Sans', sans-serif; font-size: 1.3rem; margin: 0 0 0.6rem; }
.spinner {
  width: 40px; height: 40px; margin: 0 auto 1rem;
  border: 3px solid var(--color-graphite, #475569);
  border-top-color: var(--color-tungsten, #ffa630);
  border-radius: 50%; animation: spin 1s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.head { padding: 1.25rem 0 0.5rem; }
.count { margin: 0; font-size: 1rem; color: var(--color-paper-dim, #c1c1bb); }
.count strong { color: var(--color-paper, #f7f7f2); font-size: 1.25rem; }
.switch { margin: 0.5rem 0 0; }
.how { font-size: 0.9rem; color: var(--color-paper-dim, #c1c1bb); margin: 0.75rem 0 1rem; }

.link-tap {
  background: none; border: none; padding: 0.4rem 0; min-height: 44px;
  color: var(--color-paper-dim, #c1c1bb); text-decoration: underline; cursor: pointer; font-size: 0.9rem;
}
.voice-pick {
  display: block; width: 100%; text-align: left; margin-top: 0.75rem;
  min-height: 56px; padding: 1rem; border-radius: 12px; cursor: pointer;
  background: var(--color-void, #0f172a); color: var(--color-paper, #f7f7f2);
  border: 1px solid var(--color-graphite, #475569); font-size: 1rem;
}

.rows { list-style: none; margin: 0; padding: 0; }

/* STATE IS DRAWN. A line with no recording is an empty slot: dashed outline,
   dimmed, no fill. A recorded line is solid and filled. Nothing is badged and
   nothing is coloured by status — the only colour on this page is the meter. */
.row {
  border-radius: 14px;
  margin-bottom: 0.7rem;
  padding: 0.35rem 0.35rem 0.5rem;
  border: 1px solid transparent;
}
.row.is-todo {
  border: 1px dashed var(--color-graphite, #475569);
  background: transparent;
  opacity: 0.72;
}
.row.is-done {
  border: 1px solid var(--color-graphite, #475569);
  background: var(--color-shadow, #1e293b);
}
.row.is-failed {
  border: 1px dashed var(--color-graphite, #475569);
  background: transparent;
}
.row.is-live {
  border: 2px solid var(--color-paper, #f7f7f2);
  background: var(--color-shadow, #1e293b);
}

.row-tap {
  display: block; width: 100%; text-align: left; cursor: pointer;
  background: none; border: none; color: inherit;
  padding: 0.85rem 0.9rem 0.6rem; min-height: 56px;
}
.row-tap:disabled { cursor: default; }
.row-target {
  display: block; font-size: 1.2rem; line-height: 1.4; font-weight: 500;
  color: var(--color-paper, #f7f7f2);
}
.row-known { display: block; margin-top: 0.2rem; font-size: 0.88rem; color: var(--color-paper-dim, #c1c1bb); }
.row-foot { display: flex; flex-wrap: wrap; gap: 0.65rem; margin-top: 0.45rem; }
.row-state, .row-meta {
  font-family: 'IBM Plex Mono', monospace; font-size: 0.68rem;
  text-transform: uppercase; letter-spacing: 0.06em;
  color: var(--color-paper-dim, #c1c1bb);
}
.row-meta { opacity: 0.65; }

.row-tools { display: flex; gap: 0.5rem; padding: 0 0.9rem 0.35rem; }
.tool {
  display: inline-flex; align-items: center; min-height: 44px; padding: 0.4rem 0.85rem;
  border: 1px solid var(--color-graphite, #475569); border-radius: 8px; cursor: pointer;
  background: transparent; color: var(--color-paper-dim, #c1c1bb); font-size: 0.82rem;
}
.tool.off { opacity: 0.35; cursor: default; }
.hidden-file { display: none; }

.meter {
  height: 10px; margin: 0 0.9rem 0.5rem; border-radius: 5px; overflow: hidden;
  background: var(--color-void, #0f172a); border: 1px solid var(--color-graphite, #475569);
}
.meter-fill { height: 100%; background: var(--color-emerald, #06ffa5); transition: width 0.06s linear; }
.meter.clip .meter-fill { background: var(--color-film-red, #e63946); }

.note { font-size: 0.85rem; margin: 0.25rem 0.9rem 0.5rem; }
.note.done { color: var(--color-emerald, #06ffa5); }
.note.error { color: #ff9d9d; }

.toggle-row { display: flex; gap: 0.7rem; align-items: flex-start; cursor: pointer; margin: 1.5rem 0; }
.toggle-row input { margin-top: 0.2rem; width: 20px; height: 20px; accent-color: var(--color-emerald, #06ffa5); flex-shrink: 0; }
.toggle-row strong { display: block; font-size: 0.95rem; }
.toggle-row small { display: block; font-size: 0.8rem; color: var(--color-paper-dim, #c1c1bb); line-height: 1.45; margin-top: 0.15rem; }

.mic-pick { margin: 1rem 0; }
.mic-label { display: block; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-paper-dim, #c1c1bb); margin-bottom: 0.35rem; }
.mic-select {
  width: 100%; padding: 0.7rem; border-radius: 8px;
  background: var(--color-void, #0f172a); color: var(--color-paper, #f7f7f2);
  border: 1px solid var(--color-graphite, #475569); font-size: 1rem; min-height: 48px;
}

.btn-ghost {
  font-family: 'Josefin Sans', sans-serif; font-size: 0.95rem; color: var(--color-paper-dim, #c1c1bb);
  background: transparent; border: 1px solid var(--color-graphite, #475569);
  border-radius: 8px; padding: 0.75rem 1.4rem; cursor: pointer; margin-top: 1.25rem; min-height: 48px;
}

/* Desktop: the same list, wider gutters. Nothing changes shape. */
@media (min-width: 720px) {
  .mine { padding: 1.5rem 1.5rem 5rem; }
  .row-target { font-size: 1.3rem; }
}
</style>
