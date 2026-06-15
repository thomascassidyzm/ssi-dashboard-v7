<template>
  <div class="longtake-studio">
    <!-- Loading -->
    <section v-if="phase === 'loading'" class="lt-card center">
      <div class="lt-spinner"></div>
      <p>Loading your lines…</p>
    </section>

    <!-- Casting not set up -->
    <section v-else-if="phase === 'no-plan'" class="lt-card center">
      <h2>No lines to record yet</h2>
      <p>Your course leader hasn't cast you into the conversations yet. As soon as your lines are assigned they'll appear here.</p>
      <button class="btn-ghost" @click="loadPlan">Check again</button>
    </section>

    <!-- Error -->
    <section v-else-if="phase === 'error'" class="lt-card center">
      <h2>Couldn't load your lines</h2>
      <p>{{ loadError }}</p>
      <button class="btn-ghost" @click="loadPlan">Try again</button>
    </section>

    <!-- Ready: summary + mic + start -->
    <section v-else-if="phase === 'ready'" class="lt-card summary">
      <h2>Ready when you are</h2>
      <p v-if="planSpeakers" class="speakers-line">You're reading as <strong>{{ planSpeakers }}</strong></p>

      <div class="summary-stats">
        <div class="sum-stat"><span class="sum-value">{{ totals.total }}</span><span class="sum-label">Lines</span></div>
        <div class="sum-stat"><span class="sum-value">{{ combinedRecordedCount }}</span><span class="sum-label">Recorded</span></div>
        <div class="sum-stat"><span class="sum-value">{{ toRecordCount }}</span><span class="sum-label">To read</span></div>
      </div>

      <ol class="how-to">
        <li>Tap <strong>Start</strong> and read the highlighted line aloud.</li>
        <li>Finish the line, take a breath, then tap <strong>Next</strong> (or press <kbd>Space</kbd>).</li>
        <li>Keep going — tap <strong>Again</strong> to re-read a line.</li>
        <li>Tap <strong>Done</strong> at the end. It saves itself.</li>
      </ol>

      <!-- Mic picker (only if more than one input) -->
      <div v-if="recorder.devices.value.length > 1" class="mic-pick">
        <label class="mic-label">Microphone</label>
        <select v-model="selectedDeviceId" class="mic-select">
          <option v-for="d in recorder.devices.value" :key="d.deviceId" :value="d.deviceId">{{ d.label }}</option>
        </select>
      </div>

      <label class="toggle-row">
        <input type="checkbox" v-model="includeRecorded" />
        <span><strong>Re-read lines I've already recorded</strong>
          <small>Off = only read the lines that still need a recording. New takes replace old ones; nothing is deleted.</small></span>
      </label>

      <div class="summary-actions">
        <button class="btn-begin" :disabled="startIndex === -1" @click="beginSession">Start</button>
      </div>
      <p v-if="startIndex === -1" class="resume-note all-done">Every line is already recorded. Turn on "re-read" above to do another pass.</p>
      <p v-if="micError" class="mic-error">{{ micError }}</p>
    </section>

    <!-- Recording: autocue + tap-to-advance -->
    <section v-else-if="phase === 'recording'" class="recording-stage">
      <!-- meter + clip + progress -->
      <div class="lt-topbar">
        <div class="meter" :class="{ clip: recorder.clipping.value }">
          <div class="meter-fill" :style="{ width: `${Math.min(100, recorder.level.value * 100)}%` }"></div>
        </div>
        <span class="meter-tag" :class="{ clip: recorder.clipping.value }">
          {{ recorder.clipping.value ? 'Too loud — back off the mic' : 'Mic live' }}
        </span>
        <span class="lt-count">{{ readThisSession }} / {{ toRecordCount }}</span>
      </div>

      <!-- the script as a calm scrolling autocue -->
      <div class="autocue" ref="autocueEl">
        <template v-for="(it, i) in items" :key="it.sentenceId || i">
          <div v-if="showScene(i)" class="scene-head">{{ it.sceneTitle || it.podTitle }}</div>
          <div
            class="cue-line"
            :data-idx="i"
            :class="{
              current: i === currentIndex,
              done: isDone(it) && i !== currentIndex,
              future: i > currentIndex && !isDone(it)
            }"
          >
            <span v-if="it.speaker && it.kind === 'target'" class="cue-speaker" :style="{ color: speakerColor(it.speaker) }">{{ it.speaker }}</span>
            <span class="cue-text">{{ it.lineText }}</span>
            <span v-if="it.lineGloss" class="cue-gloss">{{ it.lineGloss }}</span>
            <span v-if="isDone(it) && i !== currentIndex" class="cue-tick" aria-hidden="true">✓</span>
          </div>
        </template>
      </div>

      <!-- controls: thumb-reachable -->
      <div class="lt-controls">
        <button class="ctl-again" :disabled="advancing" @click="onAgain">Again</button>
        <button class="ctl-next" :disabled="advancing" @click="onNext">{{ hasNext ? 'Next ▶' : 'Done ✓' }}</button>
      </div>
      <button class="btn-finish" :disabled="advancing" @click="onFinish">Finish &amp; save</button>
      <p class="kbd-hint"><kbd>Space</kbd> next · <kbd>R</kbd> again</p>
    </section>

    <!-- Saving / done -->
    <section v-else-if="phase === 'done'" class="lt-card center">
      <h2>{{ uploadQueue.pendingCount.value > 0 ? 'Saving your recording…' : 'Saved ✓' }}</h2>
      <div class="summary-stats">
        <div class="sum-stat"><span class="sum-value">{{ committedCount }}</span><span class="sum-label">Lines read</span></div>
        <div class="sum-stat"><span class="sum-value">{{ uploadQueue.uploadedCount.value }}</span><span class="sum-label">Saved</span></div>
        <div class="sum-stat" v-if="uploadQueue.pendingCount.value > 0"><span class="sum-value pending">{{ uploadQueue.pendingCount.value }}</span><span class="sum-label">Saving…</span></div>
        <div class="sum-stat" v-if="uploadQueue.failedIndices.size > 0"><span class="sum-value failed">{{ uploadQueue.failedIndices.size }}</span><span class="sum-label">Failed</span></div>
      </div>
      <p v-if="uploadQueue.pendingCount.value > 0" class="resume-note">Keep this page open until everything has saved.</p>
      <p v-if="skippedEmpty > 0" class="resume-note">{{ skippedEmpty }} empty/very-short take(s) were skipped (nothing captured).</p>
      <div class="summary-actions">
        <button class="btn-ghost" @click="reloadAfterSession">Back to my lines</button>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount, onUnmounted } from 'vue'
import { getApiUrl } from '@/services/api'
import {
  normalizeRecordingPlan,
  planTotals,
  firstUnrecordedIndex,
  nextRecordableIndex,
  buildPodUploadMetadata,
  speakerColor
} from '@/utils/podRecordingPlan'
import { useUploadQueue } from '@/composables/useAudioUpload'
import { useTapRecorder } from '@/composables/useTapRecorder'

// Long-take pod recorder: continuous autocue, tap-to-advance. Each line is its own
// MediaRecorder take (reliable) — on tap we close the current line's take, upload it
// to the proven per-line route (server transcodes + masters -16 LUFS, origin=human),
// and open the next line's take. An empty/too-short blob is never uploaded.
const props = defineProps({
  courseCode: { type: String, required: true },
  voiceId: { type: String, required: true }
})
const emit = defineEmits(['progress'])

const recorder = useTapRecorder()
const uploadQueue = useUploadQueue()

const phase = ref('loading') // loading | no-plan | error | ready | recording | done
const loadError = ref(null)
const micError = ref(null)
const plan = ref(null)

// An actor records their own CHARACTER (target) lines. A voice that is also cast as
// the explainer gets every known/English line too — but the English narration is
// recorded separately (here it already exists), so we show the actor's target lines
// when they have any, and fall back to the full queue only for a pure-explainer voice.
const items = computed(() => {
  const all = plan.value?.items || []
  const target = all.filter(it => it.kind === 'target')
  return target.length ? target : all
})
const totals = computed(() => planTotals(items.value))
const planSpeakers = computed(() => {
  const s = plan.value?.speakers
  return Array.isArray(s) && s.length > 0 ? s.filter(x => x !== '__explainer__').join(', ') : null
})

// ── Session state ────────────────────────────────────────────────────────────
const includeRecorded = ref(false)
const selectedDeviceId = ref(null)
const currentIndex = ref(0)
const sessionRecorded = ref(new Set())
const committedCount = ref(0)
const readThisSession = ref(0)
const skippedEmpty = ref(0)
const advancing = ref(false)        // guards the async tap handlers
let sessionId = null

const autocueEl = ref(null)

function isDone(it) {
  return it.recorded || sessionRecorded.value.has(it.sentenceId)
}
const combinedRecordedCount = computed(() =>
  items.value.reduce((n, it) => n + (isDone(it) ? 1 : 0), 0)
)
const toRecordCount = computed(() =>
  includeRecorded.value ? totals.value.total : (totals.value.total - combinedRecordedCount.value)
)

const startIndex = computed(() =>
  includeRecorded.value
    ? (items.value.length > 0 ? 0 : -1)
    : firstUnrecordedIndex(items.value, sessionRecorded.value)
)

const hasNext = computed(() =>
  nextRecordableIndex(items.value, currentIndex.value, {
    extraRecorded: sessionRecorded.value,
    includeRecorded: includeRecorded.value
  }) !== -1
)

function showScene(i) {
  const it = items.value[i]
  if (!it) return false
  if (i === 0) return Boolean(it.sceneTitle || it.podTitle)
  const prev = items.value[i - 1]
  return (it.podId && it.podId !== prev.podId) || (it.sceneNumber && it.sceneNumber !== prev.sceneNumber)
}

watch([combinedRecordedCount, totals], () => {
  emit('progress', { recorded: combinedRecordedCount.value, total: totals.value.total })
}, { immediate: true })

// ── Start ────────────────────────────────────────────────────────────────────
async function beginSession() {
  if (startIndex.value === -1) return
  micError.value = null
  try {
    await recorder.start(selectedDeviceId.value || null)
  } catch (err) {
    micError.value = friendlyMicError(err)
    return
  }
  recorder.listDevices()
  sessionId = `pod_longtake_${Date.now()}`
  committedCount.value = 0; readThisSession.value = 0; skippedEmpty.value = 0
  currentIndex.value = startIndex.value
  phase.value = 'recording'
  scrollToCurrent()
  recorder.beginLine()
}

function friendlyMicError(err) {
  const n = err && err.name
  if (n === 'NotAllowedError') return 'Microphone blocked. Allow microphone access for this site, then tap Start again.'
  if (n === 'NotFoundError') return 'No microphone found. Plug in a mic (or open this on a device with one) and try again.'
  if (n === 'NotReadableError') return 'Your microphone is in use by another app. Close it and try again.'
  return (err && err.message) || 'Microphone unavailable.'
}

// ── Tap to advance ───────────────────────────────────────────────────────────
let lastTapAt = 0
function debounced() {
  const now = Date.now()
  if (now - lastTapAt < 250) return false
  lastTapAt = now
  return true
}

// Upload the current line's take (guarding against empty/too-short blobs).
function commitLine(index, blob) {
  const item = items.value[index]
  if (!item) return
  if (!blob || blob.size < 1200) { skippedEmpty.value++; return } // empty/near-empty: never save silence
  uploadQueue.queueUpload({
    blob,
    courseCode: props.courseCode,
    uuid: null,
    metadata: buildPodUploadMetadata(item, { voiceId: props.voiceId, sessionId }),
    provenance: {
      recorded_by: 'pod-long-take',
      recorded_at: new Date().toISOString(),
      session_id: sessionId,
      mode: 'long-take'
    },
    itemIndex: index
  })
  sessionRecorded.value.add(item.sentenceId)
  sessionRecorded.value = new Set(sessionRecorded.value)
  committedCount.value++
  readThisSession.value++
}

async function onNext() {
  if (phase.value !== 'recording' || advancing.value) return
  if (!debounced()) return
  advancing.value = true
  try {
    const blob = await recorder.endLine()
    commitLine(currentIndex.value, blob)
    const next = nextRecordableIndex(items.value, currentIndex.value, {
      extraRecorded: sessionRecorded.value,
      includeRecorded: includeRecorded.value
    })
    if (next === -1) { await finishAfterLine(); return }
    currentIndex.value = next
    scrollToCurrent()
    recorder.beginLine()
  } finally {
    advancing.value = false
  }
}

async function onAgain() {
  if (phase.value !== 'recording' || advancing.value) return
  if (!debounced()) return
  advancing.value = true
  try {
    await recorder.discardLine()
    recorder.beginLine()
  } finally {
    advancing.value = false
  }
}

async function onFinish() {
  if (phase.value !== 'recording' || advancing.value) return
  advancing.value = true
  try {
    const blob = await recorder.endLine()
    commitLine(currentIndex.value, blob)
    await finishAfterLine()
  } finally {
    advancing.value = false
  }
}

async function finishAfterLine() {
  await recorder.stop()
  phase.value = 'done'
}

// ── Autocue scroll ───────────────────────────────────────────────────────────
function scrollToCurrent() {
  nextTick(() => {
    const root = autocueEl.value
    if (!root) return
    const el = root.querySelector(`[data-idx="${currentIndex.value}"]`)
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  })
}

// ── Keyboard ─────────────────────────────────────────────────────────────────
function onKey(e) {
  if (phase.value !== 'recording') return
  if (e.repeat) return
  if (e.code === 'Space') { e.preventDefault(); onNext() }
  else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); onAgain() }
}

function beforeUnloadGuard(e) {
  if (phase.value === 'recording') { e.preventDefault(); e.returnValue = '' }
}

// ── Plan loading ─────────────────────────────────────────────────────────────
function apiBase() { return localStorage.getItem('api_base_url') || getApiUrl() }

async function loadPlan() {
  phase.value = 'loading'
  loadError.value = null
  try {
    const url = `${apiBase()}/api/production/${props.courseCode}/pods/recording-plan?voiceId=${encodeURIComponent(props.voiceId)}`
    const res = await fetch(url, { headers: { 'ngrok-skip-browser-warning': 'true' } })
    if (res.status === 404) { phase.value = 'no-plan'; return }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || `Could not load your lines (${res.status})`)
    }
    plan.value = normalizeRecordingPlan(await res.json())
    if (plan.value.items.length === 0) { phase.value = 'no-plan'; return }
    phase.value = 'ready'
  } catch (err) {
    loadError.value = (err && err.message) || 'Network error'
    phase.value = 'error'
  }
}

async function reloadAfterSession() {
  sessionRecorded.value = new Set()
  await loadPlan()
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  window.addEventListener('beforeunload', beforeUnloadGuard)
  recorder.listDevices()
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('beforeunload', beforeUnloadGuard)
})

watch(() => [props.courseCode, props.voiceId], () => {
  sessionRecorded.value = new Set()
  loadPlan()
}, { immediate: true })

onUnmounted(() => {
  if (recorder.isRecording.value) recorder.stop()
  if (uploadQueue.pendingCount.value === 0) uploadQueue.resetQueue()
})
</script>

<style scoped>
.longtake-studio {
  max-width: 760px;
  margin: 0 auto;
  padding: 1rem;
  color: var(--color-paper, #f7f7f2);
}

/* Cards */
.lt-card {
  background: var(--color-shadow, #1e293b);
  border: 1px solid var(--color-graphite, #475569);
  border-radius: 16px;
  padding: 2rem 1.5rem;
}
.lt-card.center { text-align: center; max-width: 520px; margin: 2rem auto; }
.lt-card h2 { font-family: 'Josefin Sans', sans-serif; font-size: 1.35rem; margin: 0 0 0.75rem; }
.lt-card p { color: var(--color-paper-dim, #c1c1bb); font-size: 0.9rem; line-height: 1.6; }

.lt-spinner {
  width: 40px; height: 40px; margin: 0 auto 1rem;
  border: 3px solid var(--color-graphite, #475569);
  border-top-color: var(--color-tungsten, #ffa630);
  border-radius: 50%; animation: lt-spin 1s linear infinite;
}
@keyframes lt-spin { to { transform: rotate(360deg); } }

/* Summary */
.speakers-line { margin-top: -0.25rem; }
.summary-stats { display: flex; flex-wrap: wrap; gap: 0.75rem; justify-content: center; margin: 1.25rem 0; }
.sum-stat {
  text-align: center; padding: 0.85rem 1rem;
  background: var(--color-void, #0f172a); border: 1px solid var(--color-graphite, #475569);
  border-radius: 8px; min-width: 86px;
}
.sum-value { display: block; font-family: 'IBM Plex Mono', monospace; font-size: 1.5rem; font-weight: 600; color: var(--color-emerald, #06ffa5); }
.sum-value.pending { color: var(--color-tungsten, #ffa630); }
.sum-value.failed { color: var(--color-film-red, #e63946); }
.sum-label { display: block; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--color-paper-dim, #c1c1bb); margin-top: 0.3rem; }

.how-to { text-align: left; margin: 0.5rem 0 1.25rem; padding-left: 1.2rem; color: var(--color-paper-dim, #c1c1bb); font-size: 0.9rem; line-height: 1.7; }
.how-to strong { color: var(--color-paper, #f7f7f2); }
kbd {
  font-family: 'IBM Plex Mono', monospace; font-size: 0.78em;
  background: var(--color-void, #0f172a); border: 1px solid var(--color-graphite, #475569);
  border-radius: 4px; padding: 0.05em 0.4em;
}

.mic-pick { text-align: left; margin: 1rem 0; }
.mic-label { display: block; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-paper-dim, #c1c1bb); margin-bottom: 0.35rem; }
.mic-select {
  width: 100%; padding: 0.6rem 0.7rem; border-radius: 6px;
  background: var(--color-void, #0f172a); color: var(--color-paper, #f7f7f2);
  border: 1px solid var(--color-graphite, #475569); font-size: 0.9rem; min-height: 44px;
}

.toggle-row { display: flex; gap: 0.7rem; align-items: flex-start; cursor: pointer; text-align: left; margin: 1rem 0; }
.toggle-row input { margin-top: 0.25rem; width: 18px; height: 18px; accent-color: var(--color-emerald, #06ffa5); flex-shrink: 0; }
.toggle-row strong { display: block; font-size: 0.9rem; }
.toggle-row small { display: block; font-size: 0.75rem; color: var(--color-paper-dim, #c1c1bb); line-height: 1.45; margin-top: 0.15rem; }

.summary-actions { display: flex; justify-content: center; gap: 1rem; margin-top: 1rem; }
.btn-begin {
  font-family: 'Josefin Sans', sans-serif; font-size: 1.05rem; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.05em;
  color: var(--color-void, #0f172a); background: var(--color-emerald, #06ffa5);
  border: none; border-radius: 8px; padding: 0.9rem 2.5rem; cursor: pointer; min-height: 48px;
}
.btn-begin:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-ghost {
  font-family: 'Josefin Sans', sans-serif; font-size: 0.9rem; color: var(--color-paper-dim, #c1c1bb);
  background: transparent; border: 1px solid var(--color-graphite, #475569);
  border-radius: 8px; padding: 0.7rem 1.4rem; cursor: pointer; margin-top: 0.75rem; min-height: 44px;
}
.resume-note { font-size: 0.8rem; color: var(--color-tungsten, #ffa630); }
.resume-note.all-done { color: var(--color-emerald, #06ffa5); }
.mic-error { color: var(--color-film-red, #e63946); font-size: 0.85rem; margin-top: 0.75rem; }

/* Recording stage */
.recording-stage { display: flex; flex-direction: column; gap: 0.85rem; }

.lt-topbar { display: flex; align-items: center; gap: 0.75rem; }
.meter {
  flex: 1; height: 10px; border-radius: 5px; overflow: hidden;
  background: var(--color-void, #0f172a); border: 1px solid var(--color-graphite, #475569);
}
.meter-fill { height: 100%; background: var(--color-emerald, #06ffa5); transition: width 0.06s linear; }
.meter.clip .meter-fill { background: var(--color-film-red, #e63946); }
.meter-tag { font-family: 'IBM Plex Mono', monospace; font-size: 0.68rem; color: var(--color-paper-dim, #c1c1bb); white-space: nowrap; }
.meter-tag.clip { color: var(--color-film-red, #e63946); }
.lt-count { font-family: 'IBM Plex Mono', monospace; font-size: 0.9rem; color: var(--color-emerald, #06ffa5); margin-left: auto; }

/* Autocue */
.autocue {
  height: 48vh; min-height: 260px; overflow-y: auto;
  background: var(--color-void, #0f172a);
  border: 1px solid var(--color-graphite, #475569); border-radius: 12px;
  padding: 30vh 1.25rem;
  scroll-behavior: smooth;
}
.scene-head {
  font-family: 'IBM Plex Mono', monospace; font-size: 0.7rem; text-transform: uppercase;
  letter-spacing: 0.1em; color: var(--color-tungsten, #ffa630);
  margin: 1.5rem 0 0.5rem; padding-bottom: 0.3rem; border-bottom: 1px solid var(--color-graphite, #475569);
}
.cue-line { padding: 0.5rem 0.6rem; border-radius: 8px; margin: 0.2rem 0; transition: all 0.2s ease; }
.cue-speaker { display: block; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.15rem; }
.cue-text { font-size: 1.05rem; line-height: 1.5; color: var(--color-paper-dim, #c1c1bb); }
.cue-gloss { display: block; font-size: 0.8rem; color: var(--color-paper-dim, #c1c1bb); opacity: 0.7; margin-top: 0.15rem; font-style: italic; }
.cue-tick { color: var(--color-emerald, #06ffa5); margin-left: 0.4rem; }

.cue-line.future .cue-text { opacity: 0.55; }
.cue-line.done { opacity: 0.45; }
.cue-line.current {
  background: var(--color-shadow, #1e293b);
  box-shadow: inset 0 0 0 2px var(--color-emerald, #06ffa5);
}
.cue-line.current .cue-text { font-size: 1.5rem; color: var(--color-paper, #f7f7f2); font-weight: 500; }

/* Controls */
.lt-controls { display: flex; gap: 0.75rem; align-items: stretch; }
.ctl-again {
  flex: 0 0 30%; min-height: 64px;
  font-family: 'Josefin Sans', sans-serif; font-size: 1rem; font-weight: 600;
  border-radius: 14px; cursor: pointer;
  background: var(--color-shadow, #1e293b); color: var(--color-paper, #f7f7f2);
  border: 1px solid var(--color-graphite, #475569);
}
.ctl-next {
  flex: 1; min-height: 64px;
  font-family: 'Josefin Sans', sans-serif; font-size: 1.3rem; font-weight: 700;
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

@media (max-width: 480px) {
  .longtake-studio { padding: 0.5rem; }
  .autocue { height: 44vh; padding: 28vh 1rem; }
  .kbd-hint { display: none; }
}
</style>
