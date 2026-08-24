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

      <!-- Unproofread machine-written target text in THIS queue. Said before
           the session starts, not only line by line inside it, so nobody
           discovers it a hundred lines in. -->
      <p v-if="draftCount > 0" class="draft-warning">
        <span class="draft-warning-badge">DRAFT</span>
        {{ draftCount }} of your {{ totals.total }} lines are marked as machine-written drafts
        nobody has proofread yet. They are marked line by line below — don't record one until it
        has been read.
      </p>

      <!-- The absence of a badge is NOT a clearance. The marker column was added on
           2026-08-06 defaulting to false, so every line older than that reads as
           "proofread" whether or not a human ever saw it — which is how machine-written
           June Welsh reached Aran's queue wearing no badge at all. Until approval is
           recorded per line, the only honest thing this screen can say is that a missing
           badge means nobody marked it. -->
      <p class="draft-caveat">
        No badge does not mean checked. Lines are only marked from 6 August 2026 onward, so an
        unbadged line means nobody recorded a verdict either way — not that someone approved it.
      </p>

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

      <!-- Silent/near-silent take: immediate, dismissible, re-recordable right here -->
      <div v-if="dropNotice" class="drop-toast" role="status">
        <span class="drop-toast-text">That take was silent — recorded again?</span>
        <button class="drop-toast-action" @click="redoDrop(dropNotice.index)">Redo now</button>
        <button class="drop-toast-dismiss" @click="dropNotice = null" aria-label="Dismiss">✕</button>
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
              done: isDone(it) && i !== currentIndex && !droppedIndices.has(i),
              future: i > currentIndex && !isDone(it),
              dropped: droppedIndices.has(i) && i !== currentIndex,
              draft: it.draft
            }"
          >
            <span v-if="it.speaker && it.kind === 'target'" class="cue-speaker" :style="{ color: speakerColor(it.speaker) }">{{ it.speaker }}</span>
            <!-- These words are a machine draft nobody has proofread yet. Say so
                 loudly: a recorder must never read one believing it is final. -->
            <span v-if="it.draft" class="cue-draft-badge">DRAFT — AWAITING PROOFREAD</span>
            <span class="cue-text">{{ it.lineText }}</span>
            <span v-if="it.lineGloss" class="cue-gloss">{{ it.lineGloss }}</span>
            <button
              v-if="droppedIndices.has(i) && i !== currentIndex"
              class="cue-drop-marker"
              :disabled="advancing"
              @click="redoDrop(i)"
            >⚠ silent — redo</button>
            <span v-else-if="isDone(it) && i !== currentIndex" class="cue-tick" aria-hidden="true">✓</span>
            <!-- Play back THIS line's stored clip. Only offered for lines read
                 in this session, because only those have an upload whose uuid
                 we hold. -->
            <StoredTakeButton
              v-if="committedIndices.has(i)"
              class="cue-play"
              :uuid="storedUuid(i)"
              :pending="uploadQueue.pendingCount.value > 0 && !storedUuid(i) && !uploadQueue.failedIndices.has(i)"
              :failed="uploadQueue.failedIndices.has(i)"
              :allow-local="false"
              :is-playing="playingIndex === i"
              @toggle="togglePlay(i)"
            />
          </div>
        </template>
      </div>

      <!-- The last take, always to hand: the first few lines of a session are
           meant to check the trim chain by ear, and hunting up the autocue for
           the line you just read is how that check gets skipped. -->
      <div v-if="lastCommittedIndex !== -1" class="last-take-bar">
        <span class="last-take-label">Last take —
          <span class="last-take-text">{{ items[lastCommittedIndex]?.lineText }}</span>
        </span>
        <StoredTakeButton
          :uuid="storedUuid(lastCommittedIndex)"
          :pending="uploadQueue.pendingCount.value > 0 && !storedUuid(lastCommittedIndex) && !uploadQueue.failedIndices.has(lastCommittedIndex)"
          :failed="uploadQueue.failedIndices.has(lastCommittedIndex)"
          :allow-local="false"
          :is-playing="playingIndex === lastCommittedIndex"
          @toggle="togglePlay(lastCommittedIndex)"
        />
      </div>
      <p v-if="playbackError" class="playback-error" role="status">{{ playbackError }}</p>
      <p class="stored-note">Playback plays the processed clip stored on the server — the same bytes the learner will hear — never your raw local recording.</p>

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
      <p v-if="micError" class="mic-error">{{ micError }}</p>

      <!-- Check the session by ear before leaving: every line read, played
           back from the stored clip. -->
      <div v-if="sortedCommittedIndices.length > 0" class="takes-list">
        <h3 class="takes-list-title">Listen back to what you recorded</h3>
        <p class="takes-list-note">These play the processed clip stored on the server, not your raw local take.</p>
        <ul>
          <li v-for="idx in sortedCommittedIndices" :key="idx" class="take-item" :class="{ playing: playingIndex === idx }">
            <span class="take-text">{{ items[idx]?.lineText }}</span>
            <StoredTakeButton
              :uuid="storedUuid(idx)"
              :pending="uploadQueue.pendingCount.value > 0 && !storedUuid(idx) && !uploadQueue.failedIndices.has(idx)"
              :failed="uploadQueue.failedIndices.has(idx)"
              :allow-local="false"
              :is-playing="playingIndex === idx"
              @toggle="togglePlay(idx)"
            />
          </li>
        </ul>
        <p v-if="playbackError" class="playback-error" role="status">{{ playbackError }}</p>
      </div>

      <!-- Specific lines that came out silent — named, not just counted, with a way back in -->
      <div v-if="droppedIndices.size > 0" class="dropped-list">
        <h3 class="dropped-list-title">{{ droppedIndices.size }} line{{ droppedIndices.size === 1 ? '' : 's' }} came out silent — need a re-take</h3>
        <ul>
          <li v-for="idx in sortedDroppedIndices" :key="idx" class="dropped-item">
            <span class="dropped-text">{{ items[idx]?.lineText }}</span>
            <button class="dropped-redo-btn" @click="recordMissingLine(idx)">Record this line</button>
          </li>
        </ul>
      </div>

      <div class="summary-actions">
        <button class="btn-ghost" @click="reloadAfterSession">Back to my lines</button>
        <!-- Finishing a session must never mean signing out of Popty. -->
        <button
          v-if="hasMainOptions"
          class="btn-main-options"
          :disabled="uploadQueue.pendingCount.value > 0"
          @click="goToMainOptions"
        >Done — back to main menu</button>
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
import { useMainOptions } from '@/composables/useMainOptions'
import StoredTakeButton from './StoredTakeButton.vue'
import { storedClipUrl, diagnoseStoredClip } from '@/composables/useStoredClip'

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
const { hasMainOptions, goToMainOptions } = useMainOptions()

const phase = ref('loading') // loading | no-plan | error | ready | recording | done
const loadError = ref(null)
const micError = ref(null)
const plan = ref(null)

// An actor records their own CHARACTER (target) lines. A voice that is also cast as
// the bilingual guide gets every known/English line too — but the English narration
// is recorded separately (here it already exists), so we show the actor's target
// lines when they have any, and fall back to the rest only for a pure-guide voice.
// Explainer narration is deprecated (Tom, 2026-08-24) — never queue it for a human,
// even if an older recording-plan payload still serves those items.
const items = computed(() => {
  const all = (plan.value?.items || []).filter(it => it.kind !== 'explainer')
  const target = all.filter(it => it.kind === 'target')
  return target.length ? target : all
})
const totals = computed(() => planTotals(items.value))
// Lines in this queue whose target text is still an unproofread machine draft.
const draftCount = computed(() => items.value.reduce((n, it) => n + (it.draft ? 1 : 0), 0))
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
const advancing = ref(false)        // guards the async tap handlers
let sessionId = null

// Silent/near-silent takes: which item indices are currently missing a real
// take, and the most recent one to surface as an immediate toast.
const droppedIndices = ref(new Set())
const dropNotice = ref(null) // { index } | null
let dropNoticeTimer = null
const sortedDroppedIndices = computed(() => Array.from(droppedIndices.value).sort((a, b) => a - b))

const autocueEl = ref(null)

// ── Hearing the stored clip ──────────────────────────────────────────────────
// Lines read in THIS session, by item index — the only ones whose upload we
// hold a uuid for, and so the only ones that can be played back from the
// server. Deliberately no raw-blob fallback: the studio keeps no local copy,
// and offering one would reintroduce exactly the preview that made a butchered
// trim chain sound perfect (docs/audio-forensics-2026-08-14/).
const committedIndices = ref(new Set())
const sortedCommittedIndices = computed(() => Array.from(committedIndices.value).sort((a, b) => a - b))
const lastCommittedIndex = ref(-1)
const playingIndex = ref(-1)
const playbackError = ref(null)
let playbackAudio = null

function storedUuid(index) {
  return uploadQueue.uploadedUuids.get(index) || null
}

function stopPlayback() {
  if (playbackAudio) {
    playbackAudio.onended = null
    playbackAudio.onerror = null
    playbackAudio.pause()
  }
  playingIndex.value = -1
}

function togglePlay(index) {
  playbackError.value = null
  if (playingIndex.value === index) { stopPlayback(); return }
  const uuid = storedUuid(index)
  if (!uuid) return
  stopPlayback()
  if (!playbackAudio) playbackAudio = new Audio()
  // The stream route 302s to a signed S3 url; <audio> follows that itself.
  playbackAudio.src = storedClipUrl(uuid)
  playingIndex.value = index
  playbackAudio.onended = () => { if (playingIndex.value === index) playingIndex.value = -1 }
  playbackAudio.onerror = async () => {
    if (playingIndex.value === index) playingIndex.value = -1
    playbackError.value = await diagnoseStoredClip(uuid)
  }
  const started = playbackAudio.play()
  if (started && typeof started.catch === 'function') {
    started.catch(async () => {
      if (playingIndex.value === index) playingIndex.value = -1
      playbackError.value = await diagnoseStoredClip(uuid)
    })
  }
}

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
  committedCount.value = 0; readThisSession.value = 0
  droppedIndices.value = new Set(); dropNotice.value = null
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
  if (!blob || blob.size < 1200) { // empty/near-empty: never save silence
    droppedIndices.value.add(index)
    droppedIndices.value = new Set(droppedIndices.value)
    dropNotice.value = { index }
    if (dropNoticeTimer) clearTimeout(dropNoticeTimer)
    dropNoticeTimer = setTimeout(() => { dropNotice.value = null }, 6000)
    return
  }
  if (droppedIndices.value.has(index)) {
    droppedIndices.value.delete(index)
    droppedIndices.value = new Set(droppedIndices.value)
  }
  if (dropNotice.value && dropNotice.value.index === index) dropNotice.value = null
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
  committedIndices.value.add(index)
  committedIndices.value = new Set(committedIndices.value)
  lastCommittedIndex.value = index
  // A re-read of a line that is currently playing back is now the wrong bytes.
  if (playingIndex.value === index) stopPlayback()
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

// Jump straight back to a silently-dropped line, mid-session, and re-arm the
// mic for it — discards whatever the current (not-yet-tapped) line has
// captured so far, same as "Again".
async function redoDrop(index) {
  if (phase.value !== 'recording' || advancing.value) return
  dropNotice.value = null
  if (index === currentIndex.value) return
  advancing.value = true
  try {
    await recorder.discardLine()
    currentIndex.value = index
    scrollToCurrent()
    recorder.beginLine()
  } finally {
    advancing.value = false
  }
}

// From the done screen: re-open the mic just to pick up one silently-dropped
// line (the session mic was already released when the session finished).
async function recordMissingLine(index) {
  if (phase.value !== 'done') return
  micError.value = null
  try {
    await recorder.start(selectedDeviceId.value || null)
  } catch (err) {
    micError.value = friendlyMicError(err)
    return
  }
  sessionId = `pod_longtake_${Date.now()}`
  currentIndex.value = index
  phase.value = 'recording'
  scrollToCurrent()
  recorder.beginLine()
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
  stopPlayback()
  sessionRecorded.value = new Set()
  droppedIndices.value = new Set()
  committedIndices.value = new Set()
  lastCommittedIndex.value = -1
  dropNotice.value = null
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
  stopPlayback()
  sessionRecorded.value = new Set()
  droppedIndices.value = new Set()
  committedIndices.value = new Set()
  lastCommittedIndex.value = -1
  dropNotice.value = null
  loadPlan()
}, { immediate: true })

onUnmounted(() => {
  stopPlayback()
  if (dropNoticeTimer) clearTimeout(dropNoticeTimer)
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

.summary-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 1rem; margin-top: 1rem; }
/* The route out of the session that ISN'T sign out. Disabled while the upload
   queue still has audio in it — the "keep this page open" note above says why. */
.btn-main-options {
  font-family: 'Josefin Sans', sans-serif; font-size: 0.95rem; font-weight: 700;
  color: var(--color-void, #0f172a); background: var(--color-emerald, #06ffa5);
  border: none; border-radius: 8px; padding: 0.7rem 1.6rem; cursor: pointer;
  margin-top: 0.75rem; min-height: 44px;
}
.btn-main-options:disabled { opacity: 0.4; cursor: not-allowed; }
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

.dropped-list { text-align: left; margin: 1.25rem 0; }
.dropped-list-title { font-size: 0.85rem; color: var(--color-tungsten, #ffa630); margin: 0 0 0.5rem; }
.dropped-list ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
.dropped-item {
  display: flex; align-items: center; gap: 0.75rem; justify-content: space-between;
  background: var(--color-void, #0f172a); border: 1px solid var(--color-graphite, #475569);
  border-radius: 8px; padding: 0.6rem 0.8rem;
}
.dropped-text { font-size: 0.9rem; color: var(--color-paper, #f7f7f2); }
.dropped-redo-btn {
  flex-shrink: 0; font-family: 'Josefin Sans', sans-serif; font-size: 0.8rem; font-weight: 600;
  color: var(--color-void, #0f172a); background: var(--color-tungsten, #ffa630);
  border: none; border-radius: 6px; padding: 0.45rem 0.8rem; cursor: pointer; min-height: 36px;
}

/* Recording stage */
/* Hearing the stored clip */
.cue-play { margin-top: 0.5rem; }
.last-take-bar {
  display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;
  padding: 0.6rem 0.75rem; border-radius: 8px;
  background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.14);
}
.last-take-label { font-size: 0.72rem; color: var(--color-paper-dim, #c1c1bb); min-width: 0; }
.last-take-text { display: block; color: var(--color-paper, #f7f7f2); font-size: 0.85rem; }
.stored-note { font-size: 0.7rem; color: var(--color-paper-dim, #c1c1bb); line-height: 1.45; margin: 0; }
.playback-error { font-size: 0.75rem; color: #ff9d9d; margin: 0.35rem 0 0; }
.takes-list { margin-top: 1.25rem; text-align: left; }
.takes-list-title { font-size: 0.9rem; margin: 0 0 0.2rem; }
.takes-list-note { font-size: 0.72rem; color: var(--color-paper-dim, #c1c1bb); margin: 0 0 0.6rem; }
.takes-list ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
.take-item {
  display: flex; align-items: center; gap: 0.75rem; justify-content: space-between;
  padding: 0.5rem 0.65rem; border-radius: 6px; background: rgba(255, 255, 255, 0.04);
}
.take-item.playing { background: rgba(6, 255, 165, 0.14); }
.take-text { font-size: 0.85rem; min-width: 0; }

.recording-stage { display: flex; flex-direction: column; gap: 0.85rem; }

/* Silent-take toast: immediate, non-blocking, redo right there */
.drop-toast {
  display: flex; align-items: center; gap: 0.6rem;
  background: var(--color-shadow, #1e293b);
  border: 1px solid var(--color-tungsten, #ffa630);
  border-radius: 10px; padding: 0.7rem 0.9rem;
}
.drop-toast-text { flex: 1; font-size: 0.85rem; color: var(--color-paper, #f7f7f2); }
.drop-toast-action {
  font-family: 'Josefin Sans', sans-serif; font-size: 0.85rem; font-weight: 600;
  color: var(--color-void, #0f172a); background: var(--color-tungsten, #ffa630);
  border: none; border-radius: 6px; padding: 0.5rem 0.9rem; cursor: pointer; min-height: 36px;
}
.drop-toast-dismiss {
  font-size: 0.9rem; color: var(--color-paper-dim, #c1c1bb); background: transparent;
  border: none; cursor: pointer; padding: 0.3rem 0.5rem; min-height: 36px;
}

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
/* DRAFT — unproofread machine-written target text. Deliberately the loudest thing
   on the line: reading a draft as if it were finished course text is the one
   failure this marker exists to prevent. */
.cue-draft-badge {
  display: inline-block;
  margin-bottom: 0.3rem;
  padding: 0.1rem 0.45rem;
  border-radius: 4px;
  background: var(--color-tungsten, #ffa630);
  color: #1a1a17;
  font-size: 0.62rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.07em;
}
.draft-warning {
  margin: 0.75rem 0 0;
  padding: 0.7rem 0.9rem;
  border: 1px solid var(--color-tungsten, #ffa630);
  border-radius: 8px;
  background: rgba(255, 166, 48, 0.08);
  color: var(--color-tungsten, #ffa630);
  font-size: 0.85rem;
  line-height: 1.5;
  text-align: left;
}
/* Quieter than .draft-warning on purpose: it qualifies the badge, it is not itself
   an alarm about any particular line. */
.draft-caveat {
  margin: 0.5rem 0 0;
  font-size: 0.78rem;
  line-height: 1.5;
  text-align: left;
  color: var(--color-paper-dim, #c1c1bb);
}
.draft-warning-badge {
  display: inline-block;
  margin-right: 0.4rem;
  padding: 0.05rem 0.35rem;
  border-radius: 3px;
  background: var(--color-tungsten, #ffa630);
  color: #1a1a17;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.07em;
}
.cue-line.draft { box-shadow: inset 0 0 0 1px var(--color-tungsten, #ffa630); }
.cue-line.draft.current .cue-text { color: var(--color-tungsten, #ffa630); }
.cue-drop-marker {
  display: block; margin-top: 0.3rem; font-family: 'IBM Plex Mono', monospace; font-size: 0.7rem;
  color: var(--color-tungsten, #ffa630); background: transparent;
  border: 1px solid var(--color-tungsten, #ffa630); border-radius: 6px;
  padding: 0.2rem 0.5rem; cursor: pointer;
}

.cue-line.future .cue-text { opacity: 0.55; }
.cue-line.done { opacity: 0.45; }
.cue-line.dropped { opacity: 1; box-shadow: inset 0 0 0 1px var(--color-tungsten, #ffa630); }
.cue-line.dropped .cue-text { opacity: 1; }
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

/* ── Light-mode legibility ──────────────────────────────────────────────────
   Dark mode is the base above and is left untouched. In light mode the shared
   --color-graphite border token (= --surface-3 #e2e8f0) is far too faint
   against the white surface / light canvas (~1.1:1), so cards, insets and
   wells look flat. Promote borders to the dedicated --line token (#cbd5e1)
   and add a subtle shadow to the main cards/wells for clear separation. */
:root[data-theme="light"] .lt-card {
  border-color: var(--line);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.08), 0 1px 1px rgba(15, 23, 42, 0.04);
}
:root[data-theme="light"] .sum-stat,
:root[data-theme="light"] kbd,
:root[data-theme="light"] .mic-select,
:root[data-theme="light"] .meter,
:root[data-theme="light"] .btn-ghost,
:root[data-theme="light"] .btn-finish,
:root[data-theme="light"] .ctl-again,
:root[data-theme="light"] .dropped-item {
  border-color: var(--line);
}
:root[data-theme="light"] .scene-head {
  border-bottom-color: var(--line);
}
/* The autocue is a recessed well sitting inside a white card; give it a clear
   border plus a faint inset so the read zone reads as a distinct surface. */
:root[data-theme="light"] .autocue {
  border-color: var(--line);
  box-shadow: inset 0 1px 3px rgba(15, 23, 42, 0.05);
}
</style>
