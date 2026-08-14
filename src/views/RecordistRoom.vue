<template>
  <!-- data-surface: a marker a human can grep for in the served bundle to prove this shipped -->
  <div class="recordist" data-surface="one-recordist-surface-2026-08-14">
    <!-- Loading -->
    <section v-if="phase === 'loading'" class="rc-card center">
      <div class="rc-spinner"></div>
      <p>Getting your lines…</p>
    </section>

    <!-- The link doesn't name a voice we know -->
    <section v-else-if="phase === 'unknown'" class="rc-card center">
      <h2>This link doesn't work any more</h2>
      <p>Ask for a new recording link and this page will pick up where you left off.</p>
    </section>

    <section v-else-if="phase === 'error'" class="rc-card center">
      <h2>Couldn't load your lines</h2>
      <p>{{ loadError }}</p>
      <button class="btn-ghost" @click="load">Try again</button>
    </section>

    <!-- ── Ready ─────────────────────────────────────────────────────────── -->
    <section v-else-if="phase === 'ready'" class="rc-card">
      <h1 class="rc-hello">Hello {{ voice.displayName }}</h1>
      <p class="rc-progress-line">{{ progressWords }}</p>

      <ol class="how-to">
        <li>Tap <strong>Start</strong> and read the highlighted line aloud.</li>
        <li>Finish the line, take a breath, then tap <strong>Next</strong> (or press <kbd>Space</kbd>).</li>
        <li>Keep going — tap <strong>Again</strong> to re-read a line.</li>
        <li>Tap <strong>Done</strong> at the end. It saves itself.</li>
      </ol>

      <div v-if="recorder.devices.value.length > 1" class="mic-pick">
        <label class="mic-label">Microphone</label>
        <select v-model="selectedDeviceId" class="mic-select">
          <option v-for="(d, i) in recorder.devices.value" :key="d.deviceId" :value="d.deviceId">{{ d.label || `Microphone ${i + 1}` }}</option>
        </select>
      </div>

      <label class="toggle-row">
        <input type="checkbox" v-model="includeRecorded" />
        <span><strong>Re-read lines I've already recorded</strong>
          <small>Off = only read the lines that still need a recording. New takes replace old ones; nothing is deleted.</small></span>
      </label>

      <!-- Aran arrives with takes already made. Let him hear them before
           deciding to re-read: the contract already hands us their clips. -->
      <div v-if="includeRecorded && alreadyRecorded.length" class="listen-back">
        <h3>What you've already recorded</h3>
        <p class="listen-note">These play the clip stored on the server.</p>
        <ul>
          <li v-for="l in alreadyRecorded" :key="l.id" :class="{ playing: playingId === l.id }">
            <span class="listen-text">{{ l.text }}</span>
            <StoredTakeButton
              :stored-url="storedUrlFor(l.id)"
              :allow-local="false"
              :is-playing="playingId === l.id"
              @toggle="togglePlay(l.id)"
            />
          </li>
        </ul>
        <p v-if="playbackError" class="note error">{{ playbackError }}</p>
      </div>

      <button class="btn-begin" :disabled="startIndex === -1" @click="begin">Start</button>
      <p v-if="startIndex === -1" class="note done">Everything is recorded. Turn on "re-read" above to do another pass.</p>
      <p v-if="micError" class="note error">{{ micError }}</p>
    </section>

    <!-- ── Recording: ONE line, big ───────────────────────────────────────── -->
    <section v-else-if="phase === 'recording'" class="stage">
      <div class="stage-top">
        <div class="meter" :class="{ clip: recorder.clipping.value }">
          <div class="meter-fill" :style="{ width: `${Math.min(100, recorder.level.value * 100)}%` }"></div>
        </div>
        <span class="meter-tag" :class="{ clip: recorder.clipping.value }">
          {{ recorder.clipping.value ? 'Too loud — back off the mic' : 'Mic live' }}
        </span>
      </div>
      <p class="stage-progress">{{ progressWords }}</p>

      <div class="line-well">
        <!-- Narration lines carry <src>/<tgt> markup. Parsed into segments in
             JS and rendered as spans — never v-html, because this is database
             text and never as a raw string, because then the recordist reads
             the angle brackets aloud. -->
        <p class="line-target">
          <span
            v-for="(seg, i) in currentSegments"
            :key="i"
            :class="['seg', 'seg-' + seg.kind]"
          >{{ seg.text }}</span>
        </p>
        <p v-if="current?.knownText" class="line-known">{{ current.knownText }}</p>
        <p v-if="current?.rerecordReason" class="line-why">{{ current.rerecordReason }}</p>
      </div>

      <!-- Hear the STORED clip of the line just read: the served bytes, never
           the local blob. If it will not play, that failure is what shows —
           a green tick over an unplayable clip is the whole bug. -->
      <div v-if="lastLine" class="hear-bar">
        <span class="hear-label">You just read
          <span class="hear-text">{{ lastLine.text }}</span>
        </span>
        <StoredTakeButton
          :stored-url="storedUrlFor(lastLine.id)"
          :pending="isPending(lastLine.id)"
          :failed="hasFailed(lastLine.id)"
          :allow-local="false"
          :is-playing="playingId === lastLine.id"
          @toggle="togglePlay(lastLine.id)"
        />
      </div>
      <p v-if="failedNote" class="note error">{{ failedNote }}</p>
      <p v-if="playbackError" class="note error">{{ playbackError }}</p>

      <div class="controls">
        <button class="ctl-again" :disabled="busy" @click="onAgain">Again</button>
        <button class="ctl-next" :disabled="busy" @click="onNext">{{ hasNext ? 'Next' : 'Done' }}</button>
      </div>
      <button class="btn-finish" :disabled="busy" @click="onFinish">Stop here</button>
      <p class="kbd-hint"><kbd>Space</kbd> next · <kbd>R</kbd> again</p>
    </section>

    <!-- ── Done ───────────────────────────────────────────────────────────── -->
    <section v-else-if="phase === 'done'" class="rc-card">
      <h2>{{ queue.pendingCount.value > 0 ? 'Saving…' : 'All saved' }}</h2>
      <p class="rc-progress-line">You read {{ readThisSession }} {{ readThisSession === 1 ? 'line' : 'lines' }}.</p>
      <p v-if="queue.pendingCount.value > 0" class="note">Keep this page open until everything has saved.</p>

      <div v-if="sessionLines.length" class="listen-back">
        <h3>Listen back</h3>
        <p class="listen-note">These play the clip stored on the server, not your local recording.</p>
        <ul>
          <li v-for="l in sessionLines" :key="l.id" :class="{ playing: playingId === l.id }">
            <span class="listen-text">{{ l.text }}</span>
            <StoredTakeButton
              :stored-url="storedUrlFor(l.id)"
              :pending="isPending(l.id)"
              :failed="hasFailed(l.id)"
              :allow-local="false"
              :is-playing="playingId === l.id"
              @toggle="togglePlay(l.id)"
            />
          </li>
        </ul>
        <p v-if="playbackError" class="note error">{{ playbackError }}</p>
      </div>

      <div v-if="failedList.length" class="redo-list">
        <h3>{{ failedList.length }} {{ failedList.length === 1 ? 'line' : 'lines' }} did not save</h3>
        <ul>
          <li v-for="l in failedList" :key="l.id">
            <span class="redo-text">{{ l.text }}</span>
            <span class="redo-why">{{ queue.failed.get(l.id) }}</span>
            <button class="redo-btn" @click="recordOne(l.id)">Record it again</button>
          </li>
        </ul>
      </div>

      <button class="btn-ghost" @click="backToStart">Back to my lines</button>
    </section>
  </div>
</template>

<script setup>
// THE ONE RECORDIST SURFACE. The link IS the identity: whoever holds
// /r/:voiceId is that voice. No login, no role, no course picker, no pod slug,
// no mode picker, no gate, and never a "no voice slot assigned to you" warning
// — a recordist cannot fix any of those, so putting them on their screen only
// costs them a session. The queue is BY LANGUAGE: one Welsh recordist gets one
// Welsh queue, however many courses those lines happen to serve, which is why
// no course code appears anywhere on this page.
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { recordingApiBase as apiBase } from '@/services/recordingApi'
import { useTapRecorder } from '@/composables/useTapRecorder'
import { useRecordistQueue } from '@/composables/useRecordistQueue'
import StoredTakeButton from '@/components/production/autocue/StoredTakeButton.vue'
import { recordistClipUrl, diagnoseRecordistClip } from '@/composables/useStoredClip'

const props = defineProps({ voiceId: { type: String, required: true } })

const recorder = useTapRecorder()
const queue = useRecordistQueue()

const phase = ref('loading') // loading | unknown | error | ready | recording | done
const loadError = ref(null)
const micError = ref(null)
const voice = ref({ displayName: '', languageName: '', total: 0, recorded: 0, remaining: 0 })
const lines = ref([])

const includeRecorded = ref(false)
const selectedDeviceId = ref(null)
const index = ref(0)
const busy = ref(false)
const readThisSession = ref(0)
// Lines read in THIS session, in order — the only ones we can honestly offer a
// stored clip for, because only those have an upload we watched land.
const sessionIds = ref([])
const lastLine = ref(null)

// ── Progress, in plain words ────────────────────────────────────────────────
const doneIds = ref(new Set())
function isRecorded(l) { return l.recorded || doneIds.value.has(l.id) }
const recordedCount = computed(() => lines.value.reduce((n, l) => n + (isRecorded(l) ? 1 : 0), 0))
const progressWords = computed(() => `${recordedCount.value} of ${lines.value.length} recorded`)

const current = computed(() => lines.value[index.value] || null)

/**
 * Split a line into readable segments.
 *
 * Pod dialogue is plain text and comes back as a single segment. LEGO narration
 * — which reaches the queue because the queue is content-type-agnostic — is
 * stored with markup:
 *
 *   The Welsh for <src>are they?</src> is <tgt>ydyn nhw?</tgt> <tgt>Ydyn nhw?</tgt>
 *
 * Rendered raw, the recordist sees and reads the tags. So the tags are parsed
 * out here and each part carries its own class: the known-language part and the
 * target part look different on screen, and the recordist just reads the words.
 * Done with a parser rather than v-html because this is database content and
 * v-html on database content is an injection waiting to happen.
 */
function segmentsFor(text) {
  const raw = String(text || '')
  if (!raw) return []
  const out = []
  const re = /<(src|tgt)>([\s\S]*?)<\/\1>/g
  let at = 0
  let m
  while ((m = re.exec(raw)) !== null) {
    if (m.index > at) out.push({ kind: 'plain', text: raw.slice(at, m.index) })
    out.push({ kind: m[1], text: m[2] })
    at = m.index + m[0].length
  }
  if (at < raw.length) out.push({ kind: 'plain', text: raw.slice(at) })
  // Any stray unmatched tag would still be visible, so strip the shape itself
  // as a last resort rather than showing a half-tag.
  return out.map(s => ({ ...s, text: s.text.replace(/<\/?(?:src|tgt)>/g, '') }))
}

const currentSegments = computed(() => segmentsFor(current.value?.text))

const startIndex = computed(() => {
  if (!lines.value.length) return -1
  if (includeRecorded.value) return 0
  const i = lines.value.findIndex(l => !isRecorded(l))
  return i
})

function nextIndexFrom(i) {
  for (let k = i + 1; k < lines.value.length; k++) {
    if (includeRecorded.value || !isRecorded(lines.value[k])) return k
  }
  return -1
}
const hasNext = computed(() => nextIndexFrom(index.value) !== -1)

// ── Hearing the stored clip ─────────────────────────────────────────────────
const playingId = ref(null)
const playbackError = ref(null)
let audioEl = null

// Which bytes a line's play button points at, in strict precedence — the order
// IS the honesty. A failed or in-flight NEW take must never fall back to the
// clip it is replacing: playing the previous take under the word "stored" is
// the same lie as playing the local blob.
function storedUrlFor(lineId) {
  if (queue.failed.has(lineId)) return null                       // nothing to play
  if (queue.saved.has(lineId)) return recordistClipUrl(props.voiceId, lineId)
  if (sessionIds.value.includes(lineId)) return null              // this session's take is still in flight
  const line = lines.value.find(l => l.id === lineId)
  return line?.recorded ? recordistClipUrl(props.voiceId, lineId) : null  // a take from a previous session
}
function isPending(lineId) {
  return !queue.saved.has(lineId) && !queue.failed.has(lineId) && sessionIds.value.includes(lineId)
}
function hasFailed(lineId) { return queue.failed.has(lineId) }

const failedNote = computed(() => {
  if (!lastLine.value) return null
  return queue.failed.get(lastLine.value.id) || null
})
const alreadyRecorded = computed(() => lines.value.filter(l => l.recorded))
const sessionLines = computed(() =>
  sessionIds.value.map(id => lines.value.find(l => l.id === id)).filter(Boolean)
)
const failedList = computed(() => sessionLines.value.filter(l => queue.failed.has(l.id)))

function stopPlayback() {
  if (audioEl) { audioEl.onended = null; audioEl.onerror = null; audioEl.pause() }
  playingId.value = null
}

function togglePlay(lineId) {
  playbackError.value = null
  if (playingId.value === lineId) { stopPlayback(); return }
  const url = storedUrlFor(lineId)
  if (!url) return
  stopPlayback()
  if (!audioEl) audioEl = new Audio()
  audioEl.src = url
  playingId.value = lineId
  audioEl.onended = () => { if (playingId.value === lineId) playingId.value = null }
  const fail = async () => {
    if (playingId.value === lineId) playingId.value = null
    playbackError.value = await diagnoseRecordistClip(props.voiceId, lineId)
  }
  audioEl.onerror = fail
  const p = audioEl.play()
  if (p && typeof p.catch === 'function') p.catch(fail)
}

// ── Session ─────────────────────────────────────────────────────────────────
async function begin() {
  if (startIndex.value === -1) return
  micError.value = null
  try {
    await recorder.start(selectedDeviceId.value || null)
  } catch (err) {
    micError.value = friendlyMicError(err)
    return
  }
  recorder.listDevices()
  readThisSession.value = 0
  sessionIds.value = []
  lastLine.value = null
  index.value = startIndex.value
  phase.value = 'recording'
  recorder.beginLine()
}

function friendlyMicError(err) {
  const n = err && err.name
  if (n === 'NotAllowedError') return 'Microphone blocked. Allow microphone access for this site, then tap Start again.'
  if (n === 'NotFoundError') return 'No microphone found. Use a device with one and try again.'
  if (n === 'NotReadableError') return 'Your microphone is in use by another app. Close it and try again.'
  return (err && err.message) || 'Microphone unavailable.'
}

let lastTapAt = 0
function debounced() {
  const now = Date.now()
  if (now - lastTapAt < 250) return false
  lastTapAt = now
  return true
}

function commit(i, blob) {
  const line = lines.value[i]
  if (!line) return
  // Never save silence: a near-empty blob is a take that didn't happen.
  if (!blob || blob.size < 1200) {
    queue.markFailed(line.id, 'That take came out silent — read it again.')
    if (!sessionIds.value.includes(line.id)) sessionIds.value = [...sessionIds.value, line.id]
    lastLine.value = line
    return
  }
  queue.queueTake({ voiceId: props.voiceId, lineId: line.id, text: line.text, blob })
  doneIds.value.add(line.id)
  doneIds.value = new Set(doneIds.value)
  if (!sessionIds.value.includes(line.id)) sessionIds.value = [...sessionIds.value, line.id]
  if (playingId.value === line.id) stopPlayback()
  lastLine.value = line
  readThisSession.value++
}

async function onNext() {
  if (phase.value !== 'recording' || busy.value || !debounced()) return
  busy.value = true
  try {
    commit(index.value, await recorder.endLine())
    const n = nextIndexFrom(index.value)
    if (n === -1) { await finish(); return }
    index.value = n
    recorder.beginLine()
  } finally { busy.value = false }
}

async function onAgain() {
  if (phase.value !== 'recording' || busy.value || !debounced()) return
  busy.value = true
  try {
    await recorder.discardLine()
    recorder.beginLine()
  } finally { busy.value = false }
}

async function onFinish() {
  if (phase.value !== 'recording' || busy.value) return
  busy.value = true
  try {
    commit(index.value, await recorder.endLine())
    await finish()
  } finally { busy.value = false }
}

async function finish() {
  await recorder.stop()
  phase.value = 'done'
}

// From the done screen: re-open the mic for one line that didn't save.
async function recordOne(lineId) {
  const i = lines.value.findIndex(l => l.id === lineId)
  if (i === -1) return
  micError.value = null
  try {
    await recorder.start(selectedDeviceId.value || null)
  } catch (err) { micError.value = friendlyMicError(err); return }
  index.value = i
  phase.value = 'recording'
  recorder.beginLine()
}

async function backToStart() {
  stopPlayback()
  await load()
}

// ── Keyboard ────────────────────────────────────────────────────────────────
function onKey(e) {
  if (phase.value !== 'recording' || e.repeat) return
  if (e.code === 'Space') { e.preventDefault(); onNext() }
  else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); onAgain() }
}
function beforeUnloadGuard(e) {
  if (phase.value === 'recording' || queue.pendingCount.value > 0) { e.preventDefault(); e.returnValue = '' }
}

// ── Load ────────────────────────────────────────────────────────────────────
async function load() {
  phase.value = 'loading'
  loadError.value = null
  try {
    // Always ask for the WHOLE queue, recorded lines included, and filter
    // locally. The re-read checkbox then toggles instantly instead of costing a
    // round trip mid-session, and the progress line can say "8 of 87" — which
    // it cannot do if the server has already dropped the 8.
    const res = await fetch(
      `${apiBase()}/api/recording/voice/${encodeURIComponent(props.voiceId)}?includeRecorded=1`,
      { headers: { 'ngrok-skip-browser-warning': 'true' } }
    )
    if (res.status === 404) { phase.value = 'unknown'; return }
    if (!res.ok) throw new Error(`Could not load your lines (${res.status})`)
    const data = await res.json()
    voice.value = data
    lines.value = Array.isArray(data.lines) ? data.lines : []
    doneIds.value = new Set()
    sessionIds.value = []
    lastLine.value = null
    phase.value = 'ready'
  } catch (err) {
    loadError.value = (err && err.message) || 'Network error'
    phase.value = 'error'
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  window.addEventListener('beforeunload', beforeUnloadGuard)
  recorder.listDevices()
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('beforeunload', beforeUnloadGuard)
  stopPlayback()
  if (recorder.isRecording.value) recorder.stop()
})

watch(() => props.voiceId, load, { immediate: true })
</script>

<style scoped>
/* Phone first: Aran and Catrin record on phones. Everything thumb-reachable,
   the line itself the biggest thing on the screen. */
.recordist {
  max-width: 640px;
  margin: 0 auto;
  padding: 1rem;
  min-height: 100vh;
  color: var(--color-paper, #f7f7f2);
  background: var(--color-void, #0f172a);
}
.rc-card {
  background: var(--color-shadow, #1e293b);
  border: 1px solid var(--color-graphite, #475569);
  border-radius: 16px;
  padding: 1.75rem 1.35rem;
  margin-top: 1.5rem;
}
.rc-card.center { text-align: center; }
.rc-hello { font-family: 'Josefin Sans', sans-serif; font-size: 1.6rem; margin: 0 0 0.35rem; }
.rc-card h2 { font-family: 'Josefin Sans', sans-serif; font-size: 1.3rem; margin: 0 0 0.6rem; }
.rc-card h3 { font-size: 0.95rem; margin: 1.25rem 0 0.35rem; }
.rc-card p { color: var(--color-paper-dim, #c1c1bb); font-size: 0.92rem; line-height: 1.6; }
.rc-progress-line { font-size: 1rem; color: var(--color-emerald, #06ffa5); margin: 0 0 1rem; }
.rc-spinner {
  width: 40px; height: 40px; margin: 0 auto 1rem;
  border: 3px solid var(--color-graphite, #475569);
  border-top-color: var(--color-tungsten, #ffa630);
  border-radius: 50%; animation: rc-spin 1s linear infinite;
}
@keyframes rc-spin { to { transform: rotate(360deg); } }

.how-to { list-style: decimal outside; margin: 0 0 1.25rem; padding-left: 1.4rem; color: var(--color-paper-dim, #c1c1bb); font-size: 0.95rem; line-height: 1.75; }
.how-to strong { color: var(--color-paper, #f7f7f2); }
kbd {
  font-family: 'IBM Plex Mono', monospace; font-size: 0.78em;
  background: var(--color-void, #0f172a); border: 1px solid var(--color-graphite, #475569);
  border-radius: 4px; padding: 0.05em 0.4em;
}

.mic-pick { margin: 1rem 0; }
.mic-label { display: block; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-paper-dim, #c1c1bb); margin-bottom: 0.35rem; }
.mic-select {
  width: 100%; padding: 0.7rem; border-radius: 8px;
  background: var(--color-void, #0f172a); color: var(--color-paper, #f7f7f2);
  border: 1px solid var(--color-graphite, #475569); font-size: 1rem; min-height: 48px;
}
.toggle-row { display: flex; gap: 0.7rem; align-items: flex-start; cursor: pointer; margin: 1rem 0 1.5rem; }
.toggle-row input { margin-top: 0.2rem; width: 20px; height: 20px; accent-color: var(--color-emerald, #06ffa5); flex-shrink: 0; }
.toggle-row strong { display: block; font-size: 0.95rem; }
.toggle-row small { display: block; font-size: 0.8rem; color: var(--color-paper-dim, #c1c1bb); line-height: 1.45; margin-top: 0.15rem; }

.btn-begin {
  display: block; width: 100%;
  font-family: 'Josefin Sans', sans-serif; font-size: 1.15rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.05em;
  color: var(--color-void, #0f172a); background: var(--color-emerald, #06ffa5);
  border: none; border-radius: 12px; padding: 1rem; cursor: pointer; min-height: 56px;
}
.btn-begin:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-ghost {
  font-family: 'Josefin Sans', sans-serif; font-size: 0.95rem; color: var(--color-paper-dim, #c1c1bb);
  background: transparent; border: 1px solid var(--color-graphite, #475569);
  border-radius: 8px; padding: 0.75rem 1.4rem; cursor: pointer; margin-top: 1.25rem; min-height: 48px;
}
.note { font-size: 0.85rem; margin-top: 0.75rem; }
.note.done { color: var(--color-emerald, #06ffa5); }
.note.error { color: #ff9d9d; }

/* Recording stage */
.stage { display: flex; flex-direction: column; gap: 0.85rem; padding-top: 0.75rem; }
.stage-top { display: flex; align-items: center; gap: 0.75rem; }
.meter {
  flex: 1; height: 10px; border-radius: 5px; overflow: hidden;
  background: var(--color-shadow, #1e293b); border: 1px solid var(--color-graphite, #475569);
}
.meter-fill { height: 100%; background: var(--color-emerald, #06ffa5); transition: width 0.06s linear; }
.meter.clip .meter-fill { background: var(--color-film-red, #e63946); }
.meter-tag { font-family: 'IBM Plex Mono', monospace; font-size: 0.68rem; color: var(--color-paper-dim, #c1c1bb); white-space: nowrap; }
.meter-tag.clip { color: var(--color-film-red, #e63946); }
.stage-progress { margin: 0; font-size: 0.9rem; color: var(--color-paper-dim, #c1c1bb); }

/* THE line. Nothing else on the screen competes with it. */
.line-well {
  display: flex; flex-direction: column; justify-content: center;
  min-height: 44vh; padding: 1.5rem 1.1rem; border-radius: 16px;
  background: var(--color-shadow, #1e293b);
  box-shadow: inset 0 0 0 2px var(--color-emerald, #06ffa5);
}
.line-target {
  margin: 0; font-size: 2.1rem; line-height: 1.3; font-weight: 500;
  color: var(--color-paper, #f7f7f2);
}
.line-known {
  margin: 1rem 0 0; font-size: 1rem; line-height: 1.5;
  color: var(--color-paper-dim, #c1c1bb); opacity: 0.75;
}
/* Narration segments. The words the recordist says are all of them — these only
   make the two languages tellable apart at a glance, never add anything to read. */
.seg-src { color: var(--color-paper-dim, #c1c1bb); font-style: italic; }
.seg-tgt { color: var(--color-emerald, #06ffa5); }
.line-why {
  margin: 0.75rem 0 0; font-size: 0.85rem; line-height: 1.4;
  color: var(--color-paper-dim, #c1c1bb); opacity: 0.6;
}

.hear-bar {
  display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;
  padding: 0.6rem 0.75rem; border-radius: 10px;
  background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.14);
}
.hear-label { font-size: 0.7rem; color: var(--color-paper-dim, #c1c1bb); min-width: 0; }
.hear-text { display: block; color: var(--color-paper, #f7f7f2); font-size: 0.85rem; }

.controls { display: flex; gap: 0.75rem; }
.ctl-again {
  flex: 0 0 32%; min-height: 68px;
  font-family: 'Josefin Sans', sans-serif; font-size: 1.05rem; font-weight: 600;
  border-radius: 14px; cursor: pointer;
  background: var(--color-shadow, #1e293b); color: var(--color-paper, #f7f7f2);
  border: 1px solid var(--color-graphite, #475569);
}
.ctl-next {
  flex: 1; min-height: 68px;
  font-family: 'Josefin Sans', sans-serif; font-size: 1.35rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.04em;
  border-radius: 14px; border: none; cursor: pointer;
  background: var(--color-emerald, #06ffa5); color: var(--color-void, #0f172a);
}
.ctl-again:disabled, .ctl-next:disabled, .btn-finish:disabled { opacity: 0.5; cursor: default; }
.btn-finish {
  align-self: center; font-family: 'Josefin Sans', sans-serif; font-size: 0.85rem;
  color: var(--color-paper-dim, #c1c1bb); background: transparent;
  border: 1px solid var(--color-graphite, #475569); border-radius: 8px;
  padding: 0.6rem 1.3rem; cursor: pointer; min-height: 44px;
}
.kbd-hint { text-align: center; font-size: 0.72rem; color: var(--color-paper-dim, #c1c1bb); margin: 0; }

/* Done */
.listen-note { font-size: 0.78rem; margin: 0 0 0.6rem; }
.listen-back ul, .redo-list ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
.listen-back li {
  display: flex; align-items: center; gap: 0.75rem; justify-content: space-between;
  padding: 0.55rem 0.7rem; border-radius: 8px; background: rgba(255, 255, 255, 0.04);
}
.listen-back li.playing { background: rgba(6, 255, 165, 0.14); }
.listen-text { font-size: 0.9rem; min-width: 0; }
.redo-list li {
  display: flex; flex-direction: column; gap: 0.3rem; align-items: flex-start;
  padding: 0.6rem 0.75rem; border-radius: 8px;
  background: var(--color-void, #0f172a); border: 1px solid var(--color-tungsten, #ffa630);
}
.redo-text { font-size: 0.9rem; color: var(--color-paper, #f7f7f2); }
.redo-why { font-size: 0.75rem; color: var(--color-tungsten, #ffa630); }
.redo-btn {
  font-family: 'Josefin Sans', sans-serif; font-size: 0.85rem; font-weight: 600;
  color: var(--color-void, #0f172a); background: var(--color-tungsten, #ffa630);
  border: none; border-radius: 8px; padding: 0.5rem 0.9rem; cursor: pointer; min-height: 40px;
}

@media (max-width: 480px) {
  .recordist { padding: 0.6rem; }
  .line-target { font-size: 1.8rem; }
  .kbd-hint { display: none; }
}

/* Light mode: the shared graphite border token is far too faint on white. */
:root[data-theme="light"] .recordist { background: var(--surface-1, #f8fafc); }
:root[data-theme="light"] .rc-card,
:root[data-theme="light"] .mic-select,
:root[data-theme="light"] .meter,
:root[data-theme="light"] .btn-ghost,
:root[data-theme="light"] .btn-finish,
:root[data-theme="light"] .ctl-again { border-color: var(--line); }
</style>
