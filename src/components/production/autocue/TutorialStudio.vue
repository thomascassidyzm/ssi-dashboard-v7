<template>
  <div class="autocue-studio">
    <!-- Film grain overlay -->
    <div class="film-grain"></div>

    <!-- Header — the real studio header, with the practice session's own numbers -->
    <header class="studio-header">
      <div class="studio-branding">
        <div class="studio-badge">🎙️</div>
        <div class="studio-meta">
          <h1>Autocue Studio</h1>
          <p class="session-info">{{ sessionInfo }}</p>
        </div>
      </div>

      <div class="session-stats" v-if="phase !== 'intro'">
        <div class="stat-item">
          <span class="stat-value">{{ recordedCount }}</span>
          <span class="stat-label">Recorded</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ totalItems }}</span>
          <span class="stat-label">Total</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ completionPercent }}%</span>
          <span class="stat-label">Complete</span>
        </div>
      </div>

      <span class="back-link practice-badge">Practice — nothing is saved</span>
    </header>

    <!-- Recording Status (Fixed) — the real component -->
    <RecordingStatus :is-recording="isRecording" />

    <div v-if="error" class="mode-error">{{ error }}</div>

    <!-- ── Phase: intro. The real "Recording Script Ready" card. ─────────── -->
    <div v-if="phase === 'intro'" class="script-loaded-phase">
      <div class="script-summary">
        <h2>Practice Session Ready</h2>
        <p class="script-cap-note">
          Four items. Nothing you record here is saved or uploaded.
        </p>

        <label class="pack-label" for="pack">Language you'll be reading</label>
        <select id="pack" v-model="packId" class="pack-select">
          <option v-for="p in PHRASE_PACKS" :key="p.id" :value="p.id">{{ p.label }}</option>
        </select>

        <div class="script-stats">
          <div class="script-stat">
            <span class="script-stat-value">2</span>
            <span class="script-stat-label">Natural</span>
          </div>
          <div class="script-stat">
            <span class="script-stat-value">2</span>
            <span class="script-stat-label">Slow</span>
          </div>
          <div class="script-stat">
            <span class="script-stat-value">6</span>
            <span class="script-stat-label">Pieces</span>
          </div>
          <div class="script-stat">
            <span class="script-stat-value">~4</span>
            <span class="script-stat-label">Minutes</span>
          </div>
        </div>

        <p class="script-instructions">
          Each phrase appears twice in a real session: <strong>white text</strong> for natural
          speed, then <strong class="amber-text">amber text</strong> for slow reading.
          You'll do two of each here, and then hear what actually happens to the slow ones.
        </p>
        <p class="script-instructions">Headphones help. A quiet room helps more.</p>

        <div class="script-actions">
          <button class="btn-begin" @click="beginSession">Begin Recording</button>
        </div>
      </div>
    </div>

    <!-- ── Phase: recording. The real recording screen, unchanged. ───────── -->
    <div v-else-if="phase === 'recording'" class="recording-phase">
      <div class="pass-indicator">
        <div class="pass-info">
          <span class="pass-label">Current Pass</span>
          <span class="pass-title">
            Pass {{ currentPass }}: {{ currentPass === 1 ? 'Natural Speed' : 'Slow with Gaps' }}
          </span>
        </div>
        <span class="pass-progress">
          Item {{ currentIndex + 1 }} / {{ passPhrases.length }}
        </span>
      </div>

      <!-- Room calibration + level meter: the real studio's own markup -->
      <div v-if="isCalibrating" class="vad-calibrating">
        <div class="vad-bar" :style="{ width: `${vadMeterPercent}%` }"></div>
        <span class="vad-status">Listening to the room — stay quiet for a moment...</span>
      </div>

      <div
        v-else-if="calibrationWarning"
        class="vad-noise-warning"
        :class="`quality-${calibration.quality}`"
      >
        <strong>{{ calibration.quality === 'too-loud' ? 'Too noisy to record' : 'Background noise' }}</strong>
        <span>{{ calibration.message }}</span>
      </div>

      <div v-if="isRecording && !isCalibrating" class="vad-indicator">
        <div class="vad-bar" :style="{ width: `${vadMeterPercent}%` }"></div>
        <span class="vad-status">{{ isSpeaking ? 'Speaking...' : 'Listening...' }}</span>
      </div>

      <!-- The real teleprompter. Pass 2 draws the beat markers between chunks. -->
      <TeleprompterDisplay
        :phrases="passPhrases"
        :current-index="currentIndex"
        :current-pass="currentPass"
        :is-recording="isRecording"
        :scroll-speed="scrollSpeed"
        :script-mode="false"
        :uploaded-indices="doneIndices"
      />

      <!-- Coaching for the pass, above the controls where the real studio puts
           its upload bars. Two sentences; the teaching is in what you hear. -->
      <div class="coach-note" :class="{ slow: currentPass === 2 }">
        <template v-if="currentPass === 1">
          Say it the way you'd say it to someone. We're not after a performance — if it
          sounds like you're reading, it will sound like reading to the learner too.
        </template>
        <template v-else>
          Leave a clear beat — about a second — at each marker. Say each piece
          <strong>flat and even</strong>: we are going to cut these apart and use the pieces
          inside other sentences.
        </template>
      </div>

      <!-- The real controls -->
      <RecordingControls
        :is-recording="isRecording"
        :is-paused="false"
        @toggle-recording="onToggleRecording"
        @pause="() => {}"
        @previous="navigate(-1)"
        @next="navigate(1)"
        @slower="adjustSpeed(-1)"
        @faster="adjustSpeed(1)"
      />

      <!-- Listen back to the natural takes, immediately, while still on this screen. -->
      <div v-if="currentPass === 1 && naturalTakes.length" class="listen-panel">
        <h3>That's you</h3>
        <div v-for="(t, k) in naturalTakes" :key="k" class="listen-row">
          <span class="listen-text">{{ pack.natural[k] }}</span>
          <audio controls preload="none" :src="t.url"></audio>
        </div>
        <div class="panel-actions" v-if="naturalTakes.length >= pack.natural.length">
          <button class="btn-begin" @click="goToPass2">Next — the slow ones</button>
        </div>
      </div>

      <!-- The slow take, cut apart, on this screen, before moving on. -->
      <div v-if="currentPass === 2 && currentSlowTake" class="listen-panel">
        <h3>Here's where we cut it</h3>
        <TakeWaveform
          :samples="currentSlowTake.samples"
          :sample-rate="currentSlowTake.sampleRate"
          :regions="currentSlowRegions"
        />
        <template v-if="currentSlowTake.align.ok">
          <p class="cut-ok">Found all {{ currentSlowTake.align.chunks.length }} pieces.</p>
          <p class="cut-hint">
            Tap each one. The green block is exactly what a learner would hear if that
            piece turned up on its own.
          </p>
          <div class="panel-actions">
            <button
              v-if="currentIndex + 1 < passPhrases.length"
              class="btn-begin"
              @click="navigate(1)"
            >Next slow one</button>
            <button v-else class="btn-begin" @click="goToReview">
              Next — hear them put together
            </button>
          </div>
        </template>
        <template v-else>
          <p class="cut-bad">
            We were listening for {{ currentSlowTake.align.expectedCount }} pieces and heard
            {{ currentSlowTake.align.detectedCount }}.
          </p>
          <div class="cut-diagnosis">
            <template v-if="currentSlowTake.align.detectedCount < currentSlowTake.align.expectedCount">
              Two pieces ran together — the gap between them was under
              {{ SPLICE_CONFIG.SILENCE_MIN_MS }} milliseconds, so we could not tell where one
              ended. Leave a longer, more definite pause.
            </template>
            <template v-else>
              We found more pieces than there are — usually a breath, a lip noise, or a word
              split in the middle by a pause. Read each piece straight through, then pause.
            </template>
            <template v-if="currentSlowTake.align.detection?.noisy">
              <br><br><strong>Also: the room is noisy.</strong> The background is loud enough
              that we are having to guess where silence is. Somewhere quieter will fix more
              than technique will.
            </template>
          </div>
          <p class="cut-hint">This is not a test you can fail — this is the feedback. Record it again.</p>
        </template>
      </div>
    </div>

    <!-- ── Phase: review. The real review grid, with real audio behind it. ── -->
    <div v-else-if="phase === 'review'" class="review-phase">
      <div class="review-interface">
        <div class="review-header">
          <h2 class="review-title">Session Review</h2>
          <p class="review-subtitle">
            These are your six pieces, cut out of the two slow reads. Tap Play on any of them.
          </p>
        </div>

        <div v-for="(take, ri) in slowTakes" :key="ri" class="take-block">
          <h3 class="take-heading">Slow read {{ ri + 1 }}</h3>
          <TakeWaveform
            v-if="take"
            :samples="take.samples"
            :sample-rate="take.sampleRate"
            :regions="take.align.ok ? take.align.chunks : (take.align.regions || [])"
          />
          <div class="segments-grid">
            <SegmentCard
              v-for="seg in segmentsFor(ri)"
              :key="seg.id"
              :segment="seg"
              @play="playPiece(seg.readIndex, seg.chunkIndex)"
              @redo="redoSlow(seg.readIndex)"
              @approve="playPiece(seg.readIndex, seg.chunkIndex)"
            />
          </div>
        </div>

        <div class="mix-card">
          <h2>You never said any of these</h2>
          <p class="mix-note">
            Every one is your own voice, cut up and stuck back together. If they sound like
            one person saying one sentence, your slow read was neutral enough. If a word jumps
            out, or the pitch steps up and down between pieces, that's the thing to fix — and
            it's the only feedback that's ever really worked.
          </p>
          <div v-for="(mix, k) in mixes" :key="k" class="mix-row">
            <div class="mix-label">{{ mix.label }}</div>
            <audio v-if="mix.url" controls preload="none" :src="mix.url"></audio>
            <p v-else class="cut-hint">
              Couldn't build this one — one of the slow reads didn't split cleanly. Redo it above.
            </p>
          </div>
        </div>

        <div class="final-actions">
          <button class="control-btn" @click="trySlowAgain">
            <span class="btn-icon">↻</span> Try the slow ones again
          </button>
          <button class="control-btn" @click="restart">
            <span class="btn-icon">⬅️</span> Start over
          </button>
        </div>

        <p class="closing-note">
          Happy with how those sound? Then you're ready. Close this and open your real
          recording set — none of what you just did was kept.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * Recordist tutorial — a MODE of the real Autocue Studio, not a lookalike.
 *
 * WHY IT IS A SEPARATE COMPONENT rather than a flag on AutocueStudio.vue:
 * AutocueStudio's whole script-mode body is course-bound — it calls
 * loadCourse(), drives useAutocueState's module-level singleton, and hands
 * every captured segment to useUploadQueue. A `tutorial` flag would have to
 * branch around all three, and the branch that must NEVER be wrong is the
 * upload one. Keeping the practice mode in its own component means there is no
 * upload call site to disable: there is simply no import of useAudioUpload or
 * useAutocueState here, so a practice take has nowhere to go.
 *
 * WHAT IS REUSED VERBATIM (same components, same layout, same gestures):
 *   RecordingStatus, TeleprompterDisplay (+ PhraseCard), RecordingControls,
 *   SegmentCard — imported from the real studio, unmodified.
 *   The shell markup and CSS below are lifted from AutocueStudio.vue, which
 *   scopes its styles, so the same rules have to be present to render the same
 *   screen. Do not let them drift.
 *
 * WHAT DIFFERS, deliberately:
 *   - content: fixed practice phrases (src/utils/tutorialPhrases.js), never the
 *     recording queue;
 *   - nothing is saved: no fetch/XHR/sendBeacon anywhere in this component, no
 *     localStorage/sessionStorage/IndexedDB, no upload queue. Takes exist as
 *     in-memory Float32Arrays and blob: URLs and die with the tab.
 *   - the recordist presses Start/Stop per take, as in the studio's pass-based
 *     (non-script) mode. The continuous VAD auto-advance is NOT used, because
 *     its 800 ms silence-end would end the take at the first beat of a slow
 *     read and there would be nothing left to split. The VAD is still here for
 *     the level meter and the room-calibration warning, so the screen is the
 *     screen the recordist will see.
 *   - one addition the real review screen lacks: TakeWaveform, which draws the
 *     actual audio and the actual cut lines (SegmentCard's own eight bars are
 *     decorative, seeded from the segment id).
 *
 * The tutorial only ever segments the SLOW reads. Natural-speed takes are
 * played straight back and never cut — so the 2026-08-19 natural-speed boundary
 * defect cannot touch anything here. Keep it that way.
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'

import TeleprompterDisplay from './teleprompter/TeleprompterDisplay.vue'
import RecordingControls from './recording/RecordingControls.vue'
import RecordingStatus from './recording/RecordingStatus.vue'
import SegmentCard from './review/SegmentCard.vue'
import TakeWaveform from './tutorial/TakeWaveform.vue'

import { useVAD } from '@/composables/useVAD'
import { PHRASE_PACKS, packById } from '@/utils/tutorialPhrases'
import {
  decodeMono, alignSlowGap, sliceChunk, concatChunks, encodeWavMono, SPLICE_CONFIG,
} from '@/utils/takeSplice'

// ── session state ───────────────────────────────────────────────────────────
const phase = ref('intro')          // intro | recording | review
const currentPass = ref(1)          // 1 = natural, 2 = slow
const currentIndex = ref(0)
const scrollSpeed = ref(3)
const isRecording = ref(false)
const error = ref('')
const packId = ref(PHRASE_PACKS[0].id)

const naturalTakes = ref([])        // [{ url }]
const slowTakes = ref([])           // [{ samples, sampleRate, align }]
const mixes = ref([])               // [{ label, url }]

const pack = computed(() => packById(packId.value))

// Blob URLs are the only artefact this component creates, and they are revoked
// on unmount. Nothing is written to disk, storage, or the network.
const objectUrls = []
function urlFor(blob) {
  const u = URL.createObjectURL(blob)
  objectUrls.push(u)
  return u
}
function wavUrl(samples, sampleRate) {
  return urlFor(encodeWavMono(samples, sampleRate))
}

// ── teleprompter feed ───────────────────────────────────────────────────────
// Pass 1 shows the natural phrases, pass 2 the slow ones — exactly the real
// studio's pass model, which is what makes PhraseCard draw the beat markers.
const passPhrases = computed(() => {
  if (currentPass.value === 1) {
    return pack.value.natural.map((text, i) => ({ id: `nat-${i}`, text, cadence: 'natural' }))
  }
  return pack.value.slow.map((r, i) => ({
    id: `slow-${i}`,
    text: r.chunks.join(' '),
    chunks: r.chunks,
    cadence: 'slow',
  }))
})

const doneIndices = computed(() => {
  const takes = currentPass.value === 1 ? naturalTakes.value : slowTakes.value
  const s = new Set()
  takes.forEach((t, i) => { if (t) s.add(i) })
  return s
})

const totalItems = computed(() => pack.value.natural.length + pack.value.slow.length)
const recordedCount = computed(
  () => naturalTakes.value.filter(Boolean).length + slowTakes.value.filter(Boolean).length
)
const completionPercent = computed(
  () => Math.round((recordedCount.value / totalItems.value) * 100)
)
const sessionInfo = computed(() => `Practice session · ${pack.value.label} · nothing saved`)

// ── microphone + VAD ────────────────────────────────────────────────────────
// The SAME constraints useContinuousRecorder asks for. Matching them matters:
// AGC and denoise reshape the energy envelope, which is precisely what the
// splitter reads, so a tutorial recorded with them off would predict a
// different split from the one the real tool gets.
const MIC = { echoCancellation: true, noiseSuppression: true, autoGainControl: true }

const vad = useVAD({ silenceThreshold: 0.02, silenceDuration: 800, minSpeechDuration: 300 })
const isSpeaking = vad.isSpeaking
const isCalibrating = vad.isCalibrating
const calibration = vad.calibration
// Same x300 scaling the real studio applies — the raw RMS would only ever paint
// a third of the bar.
const vadMeterPercent = computed(() => Math.min(100, Math.round(vad.currentLevel.value * 300)))
const calibrationWarning = computed(
  () => calibration.value?.quality === 'loud' || calibration.value?.quality === 'too-loud'
)

let stream = null
let recorder = null
let calibratedOnce = false

function pickMimeType() {
  for (const c of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(c)) return c
  }
  return undefined
}

function releaseMic() {
  vad.stopListening()
  stream?.getTracks().forEach((t) => t.stop())
  stream = null
  recorder = null
}

async function startTake(onDone) {
  error.value = ''
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: MIC })
  } catch (e) {
    error.value = 'The browser would not give us the microphone: ' + e.message +
      '. On iPhone, tap the "aA" in the address bar → Website Settings → Microphone → Allow.'
    return
  }

  await vad.startListening(stream)
  // Measure the room once per session, as the real studio does before its
  // first phrase, so a room that cannot be split is called out now.
  if (!calibratedOnce) {
    calibratedOnce = true
    await vad.calibrate(1500)
  }

  const mimeType = pickMimeType()
  recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
  const parts = []
  recorder.ondataavailable = (e) => { if (e.data.size) parts.push(e.data) }
  recorder.onstop = async () => {
    const blob = new Blob(parts, { type: recorder?.mimeType || mimeType || 'audio/webm' })
    releaseMic()
    isRecording.value = false
    await onDone(blob)
  }
  recorder.start()
  isRecording.value = true
}

function stopTake() {
  if (recorder?.state === 'recording') recorder.stop()
}

async function onToggleRecording() {
  if (isRecording.value) return stopTake()

  if (currentPass.value === 1) {
    const i = currentIndex.value
    await startTake(async (blob) => {
      naturalTakes.value[i] = { url: urlFor(blob) }
      naturalTakes.value = [...naturalTakes.value]
      if (i + 1 < passPhrases.value.length) currentIndex.value = i + 1
    })
  } else {
    const i = currentIndex.value
    await startTake(async (blob) => {
      try {
        const { samples, sampleRate } = await decodeMono(await blob.arrayBuffer())
        const chunks = pack.value.slow[i].chunks
        slowTakes.value[i] = { samples, sampleRate, align: alignSlowGap(samples, sampleRate, chunks) }
        slowTakes.value = [...slowTakes.value]
      } catch (e) {
        error.value = 'That take would not decode: ' + e.message
      }
    })
  }
}

// ── navigation, wired to the real controls ──────────────────────────────────
function navigate(delta) {
  const next = currentIndex.value + delta
  if (next >= 0 && next < passPhrases.value.length) currentIndex.value = next
}
function adjustSpeed(delta) {
  scrollSpeed.value = Math.min(10, Math.max(1, scrollSpeed.value - delta))
}

function beginSession() {
  phase.value = 'recording'
  currentPass.value = 1
  currentIndex.value = 0
}
function goToPass2() {
  currentPass.value = 2
  currentIndex.value = 0
}

// ── the slow take on screen ─────────────────────────────────────────────────
const currentSlowTake = computed(() =>
  currentPass.value === 2 ? slowTakes.value[currentIndex.value] || null : null
)
const currentSlowRegions = computed(() => {
  const t = currentSlowTake.value
  if (!t) return []
  return t.align.ok ? t.align.chunks : (t.align.regions || [])
})

// ── pieces ──────────────────────────────────────────────────────────────────
function pieceOf(readIndex, chunkIndex) {
  const t = slowTakes.value[readIndex]
  if (!t?.align?.ok) return null
  const c = t.align.chunks[chunkIndex]
  if (!c) return null
  return sliceChunk(t.samples, t.sampleRate, c.startMs, c.endMs)
}

function playPiece(readIndex, chunkIndex) {
  const piece = pieceOf(readIndex, chunkIndex)
  if (!piece?.length) return
  new Audio(wavUrl(piece, slowTakes.value[readIndex].sampleRate)).play()
}

/**
 * Map a cut piece onto the real SegmentCard's shape.
 *
 * `confidence` is not decoration: it is how much silence the splitter had to
 * work with in the BEAT beside this piece, against the 150 ms it needs at
 * minimum. A piece cut out of a barely-there gap is the one that will come
 * apart in a real session, and that is the thing this whole screen is teaching.
 *
 * Only gaps BETWEEN pieces count. The silence before the first piece and after
 * the last is head/tail room — the recordist controls it by when they tap Stop,
 * it says nothing about their delivery, and grading on it marked every clean
 * outer piece "medium" for no reason.
 */
function segmentsFor(readIndex) {
  const t = slowTakes.value[readIndex]
  if (!t?.align?.ok) return []
  const chunks = t.align.chunks
  return chunks.map((c, i) => {
    const before = i === 0 ? Infinity : c.startMs - chunks[i - 1].endMs
    const after = i === chunks.length - 1 ? Infinity : chunks[i + 1].startMs - c.endMs
    const gap = Math.min(before, after)
    // A single-chunk read has no beat to measure; treat it as clean rather
    // than dividing by an infinity.
    const margin = Number.isFinite(gap) ? Math.round(gap) : 700
    const confidence = Math.max(5, Math.min(99, Math.round((margin / 700) * 100)))
    const level = margin >= 450 ? 'high' : margin >= 250 ? 'medium' : 'low'
    return {
      id: `piece-${readIndex}-${i}`,
      readIndex,
      chunkIndex: i,
      label: `Piece ${readIndex + 1}.${i + 1}`,
      text: c.text,
      duration: (c.durationMs / 1000).toFixed(2),
      confidence,
      confidenceLevel: level,
      quality: Number.isFinite(gap) ? `${margin} ms beat beside it` : 'no beat to measure',
      issues: level === 'high'
        ? []
        : [`only a ${margin} ms beat beside this piece (needs ${SPLICE_CONFIG.SILENCE_MIN_MS} ms)`],
    }
  })
}

// ── recombination ───────────────────────────────────────────────────────────
function goToReview() {
  mixes.value = pack.value.recombine.map((r) => {
    const pieces = r.pieces.map(([ri, ci]) => pieceOf(ri, ci))
    if (pieces.some((x) => !x?.length)) return { label: r.label, url: null }
    const sr = slowTakes.value[r.pieces[0][0]].sampleRate
    return { label: r.label, url: wavUrl(concatChunks(pieces, sr, { gapMs: 0 }), sr) }
  })
  phase.value = 'review'
}

function redoSlow(readIndex) {
  phase.value = 'recording'
  currentPass.value = 2
  currentIndex.value = readIndex
}
function trySlowAgain() {
  slowTakes.value = []
  mixes.value = []
  redoSlow(0)
}
function restart() {
  naturalTakes.value = []
  slowTakes.value = []
  mixes.value = []
  error.value = ''
  currentPass.value = 1
  currentIndex.value = 0
  phase.value = 'intro'
}

/**
 * Testing hook (tools/recordist-tutorial/verify-recordist-tutorial.mjs).
 *
 * Chromium's fake microphone loops its file on wall-clock, so a live capture
 * lands on 2, 3 or 4 bursts depending on when the click happened — the
 * exact-count path can only be proven against a known take. This drops one into
 * both slow slots and re-exposes the splitter so the harness runs the SAME
 * module the page runs, in the same engine.
 *
 * It writes only to this component's in-memory refs. There is nothing it could
 * save, because this component has no code that saves anything.
 */
onMounted(() => {
  window.__tutorial = {
    splice: { decodeMono, alignSlowGap, sliceChunk, concatChunks, encodeWavMono, SPLICE_CONFIG },
    forceSlow(samples, sampleRate) {
      slowTakes.value = pack.value.slow.map((r) => ({
        samples, sampleRate, align: alignSlowGap(samples, sampleRate, r.chunks),
      }))
      phase.value = 'recording'
      currentPass.value = 2
      currentIndex.value = pack.value.slow.length - 1
    },
  }
})

onUnmounted(() => {
  stopTake()
  releaseMic()
  objectUrls.forEach(URL.revokeObjectURL)
  delete window.__tutorial
})
</script>

<style scoped>
/* ─────────────────────────────────────────────────────────────────────────
 * Lifted verbatim from AutocueStudio.vue. Its styles are scoped, so the same
 * rules must exist here for the same screen to render. If you change a shell
 * rule there, change it here — a drift is a tutorial that teaches a screen the
 * recordist will not meet.
 * ───────────────────────────────────────────────────────────────────────── */
.autocue-studio {
  min-height: 100vh;
  background: var(--color-void, var(--canvas));
  padding: 2rem;
  position: relative;

  --color-void: var(--canvas);
  --color-shadow: var(--surface);
  --color-slate: var(--surface-2);
  --color-graphite: var(--surface-3);
  --color-film-red: #e63946;
  --color-tungsten: var(--accent);
  --color-emerald: #06ffa5;
  --color-paper: var(--ink);
  --color-paper-dim: var(--muted);
}

:root[data-theme="light"] .autocue-studio {
  --color-emerald: var(--accent-2);
  --color-film-red: var(--danger);
  --color-graphite: var(--line);
}

.film-grain {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 600 600' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.08'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 9999;
  mix-blend-mode: overlay;
  animation: grainShift 8s steps(10) infinite;
}

@keyframes grainShift {
  0%, 100% { transform: translate(0, 0); }
  10% { transform: translate(-5%, -5%); }
  20% { transform: translate(-10%, 5%); }
  30% { transform: translate(5%, -10%); }
  40% { transform: translate(-5%, 10%); }
  50% { transform: translate(10%, 5%); }
  60% { transform: translate(5%, -5%); }
  70% { transform: translate(-10%, -10%); }
  80% { transform: translate(10%, 10%); }
  90% { transform: translate(-5%, 0); }
}

.studio-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--color-graphite);
  position: relative;
  z-index: 1;
}

.studio-branding {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.studio-badge {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, var(--color-film-red), #c4313d);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  box-shadow: 0 0 40px rgba(230, 57, 70, 0.4);
  position: relative;
  flex-shrink: 0;
}

.studio-badge::after {
  content: '';
  position: absolute;
  width: 80px;
  height: 80px;
  border: 2px solid var(--color-film-red);
  border-radius: 50%;
  opacity: 0.3;
  animation: badgePulse 3s ease-in-out infinite;
}

@keyframes badgePulse {
  0%, 100% { transform: scale(1); opacity: 0.3; }
  50% { transform: scale(1.15); opacity: 0; }
}

.studio-meta h1 {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-paper);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.session-info {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.9rem;
  color: var(--color-paper-dim);
  margin: 0;
}

.session-stats {
  display: flex;
  gap: 1.5rem;
}

.stat-item {
  text-align: center;
  padding: 0.75rem 1.25rem;
  background: var(--color-shadow);
  border-radius: 8px;
  border: 1px solid var(--color-graphite);
}

.stat-value {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 2rem;
  font-weight: 500;
  color: var(--color-emerald);
  display: block;
  line-height: 1;
  text-shadow: 0 0 20px rgba(6, 255, 165, 0.5);
}

.stat-label {
  font-size: 0.7rem;
  color: var(--color-paper-dim);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-top: 0.5rem;
  display: block;
}

/* Where the real studio puts "← Back to Dashboard". There is nowhere to go
   back to from a practice session, so the slot carries the guarantee instead. */
.back-link {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 0.9rem;
  color: var(--color-emerald);
  text-decoration: none;
}

.mode-error {
  max-width: 600px;
  margin: 0 auto 1.5rem;
  padding: 0.875rem 1.25rem;
  border: 1px solid var(--color-film-red);
  border-radius: 8px;
  background: var(--color-shadow);
  color: var(--color-film-red);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.875rem;
  text-align: center;
  position: relative;
  z-index: 1;
}

.script-cap-note {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.875rem;
  color: var(--color-paper-dim);
  margin: -1.25rem 0 1.75rem 0;
}

.script-loaded-phase {
  display: flex;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.script-summary {
  max-width: 600px;
  background: var(--color-shadow);
  border: 1px solid var(--color-graphite);
  border-radius: 16px;
  padding: 2.5rem;
  text-align: center;
}

.script-summary h2 {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1.75rem;
  color: var(--color-paper);
  margin: 0 0 2rem 0;
}

.script-stats {
  display: flex;
  gap: 1.5rem;
  justify-content: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.script-stat {
  text-align: center;
  padding: 1rem;
  background: var(--color-void);
  border-radius: 8px;
  border: 1px solid var(--color-graphite);
  min-width: 80px;
}

.script-stat-value {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--color-emerald);
  display: block;
}

.script-stat-label {
  font-size: 0.7rem;
  color: var(--color-paper-dim);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-top: 0.25rem;
  display: block;
}

.script-instructions {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.85rem;
  color: var(--color-paper-dim);
  line-height: 1.6;
  margin-bottom: 1.25rem;
}

.amber-text {
  color: var(--color-tungsten);
}

.script-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 1.5rem;
}

.btn-begin {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-void);
  background: var(--color-emerald);
  border: none;
  border-radius: 8px;
  padding: 0.85rem 2rem;
  min-height: 52px;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.pass-indicator {
  background: var(--color-shadow);
  border: 1px solid var(--color-graphite);
  border-radius: 12px;
  padding: 1rem 1.5rem;
  margin-bottom: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.pass-label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.8rem;
  color: var(--color-paper-dim);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  display: block;
}

.pass-title {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-tungsten);
}

.pass-progress {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 1rem;
  color: var(--color-emerald);
  white-space: nowrap;
}

.vad-indicator,
.vad-calibrating {
  background: var(--color-shadow);
  border: 1px solid var(--color-graphite);
  border-radius: 8px;
  padding: 0.5rem 1rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  overflow: hidden;
  position: relative;
}

.vad-calibrating {
  border-color: var(--color-tungsten, var(--accent));
}

.vad-bar {
  height: 4px;
  background: var(--color-emerald);
  border-radius: 2px;
  transition: width 0.05s linear;
  min-width: 2px;
  box-shadow: 0 0 8px rgba(6, 255, 165, 0.5);
}

.vad-status {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.75rem;
  color: var(--color-paper-dim);
  white-space: nowrap;
}

.vad-noise-warning {
  border-radius: 8px;
  padding: 0.5rem 1rem;
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  font-size: 0.8rem;
  line-height: 1.35;
}

.vad-noise-warning strong {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.75rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.vad-noise-warning.quality-loud {
  background: rgba(255, 186, 92, 0.12);
  border: 1px solid var(--color-tungsten, var(--accent));
  color: var(--color-tungsten, var(--accent));
}

.vad-noise-warning.quality-too-loud {
  background: rgba(255, 92, 92, 0.14);
  border: 1px solid var(--color-crimson, #ff5c5c);
  color: var(--color-crimson, #ff5c5c);
}

.recording-phase {
  max-width: 1000px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

.review-phase {
  position: relative;
  z-index: 1;
}

/* ── tutorial-only surfaces, built from the same tokens ──────────────────── */
.practice-badge {
  border: 1px solid var(--color-emerald);
  border-radius: 999px;
  padding: 0.35rem 0.8rem;
  white-space: nowrap;
}

.pack-label {
  display: block;
  font-size: 0.7rem;
  color: var(--color-paper-dim);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 0.4rem;
}

.pack-select {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1rem;
  width: 100%;
  min-height: 52px;
  padding: 0.7rem;
  margin-bottom: 2rem;
  color: var(--color-paper);
  background: var(--color-void);
  border: 1px solid var(--color-graphite);
  border-radius: 8px;
}

.coach-note {
  background: var(--color-shadow);
  border-left: 3px solid var(--color-emerald);
  border-radius: 8px;
  padding: 0.8rem 1rem;
  margin: 1.25rem 0;
  color: var(--color-paper-dim);
  font-size: 0.95rem;
  line-height: 1.5;
}

.coach-note.slow {
  border-left-color: var(--color-tungsten);
}

.listen-panel {
  background: var(--color-shadow);
  border: 1px solid var(--color-graphite);
  border-radius: 12px;
  padding: 1.25rem;
  margin-top: 1.5rem;
}

.listen-panel h3,
.take-heading {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1.15rem;
  color: var(--color-paper);
  margin: 0 0 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.listen-row {
  margin-bottom: 1rem;
}

.listen-text {
  font-family: 'Crimson Pro', serif;
  font-size: 1.15rem;
  color: var(--color-paper);
  display: block;
  margin-bottom: 0.35rem;
}

audio {
  width: 100%;
  height: 42px;
}

.panel-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-top: 1rem;
}

.cut-ok {
  color: var(--color-emerald);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.9rem;
}

.cut-bad {
  color: var(--color-tungsten);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.9rem;
}

.cut-hint {
  color: var(--color-paper-dim);
  font-size: 0.92rem;
  line-height: 1.5;
}

.cut-diagnosis {
  border-left: 3px solid var(--color-tungsten);
  padding-left: 0.75rem;
  margin: 0.75rem 0;
  color: var(--color-tungsten);
  font-size: 0.93rem;
  line-height: 1.5;
}

.review-interface {
  max-width: 1400px;
  margin: 0 auto;
}

.review-header {
  background: var(--color-shadow);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.review-title {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--color-paper);
  margin: 0 0 0.5rem 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.review-subtitle {
  color: var(--color-paper-dim);
  margin: 0;
}

.take-block {
  margin-bottom: 2rem;
}

.segments-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.mix-card {
  background: var(--color-shadow);
  border: 1px solid var(--color-graphite);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.mix-card h2 {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1.4rem;
  color: var(--color-tungsten);
  margin: 0 0 0.75rem;
}

.mix-note {
  color: var(--color-paper-dim);
  line-height: 1.55;
  margin: 0 0 1.25rem;
}

.mix-row {
  margin-bottom: 1.25rem;
}

.mix-label {
  font-family: 'Crimson Pro', serif;
  font-size: 1.2rem;
  color: var(--color-paper);
  background: var(--color-void);
  border-radius: 8px;
  padding: 0.7rem 0.9rem;
  margin-bottom: 0.4rem;
}

.final-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 1.5rem;
}

.control-btn {
  background: var(--color-slate, var(--surface-2));
  border: 2px solid var(--color-graphite, var(--surface-3));
  color: var(--color-paper, var(--ink));
  padding: 0.75rem 1.5rem;
  min-height: 52px;
  border-radius: 12px;
  font-family: 'Josefin Sans', sans-serif;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: center;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.closing-note {
  color: var(--color-paper-dim);
  text-align: center;
  margin-top: 1.5rem;
  font-size: 0.95rem;
}

/* Responsive — same breakpoints the real studio uses. Kai records standing,
   holding the phone; nothing here may need a sideways scroll to reach. */
@media (max-width: 768px) {
  .studio-header {
    flex-direction: column;
    gap: 1rem;
  }

  .session-stats {
    width: 100%;
    justify-content: space-around;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .script-summary {
    padding: 1.5rem 1.1rem;
  }

  .pass-indicator {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .final-actions,
  .panel-actions {
    flex-direction: column;
  }

  .final-actions .control-btn,
  .panel-actions .btn-begin {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .autocue-studio {
    padding: 1rem 0.75rem;
  }

  .stat-item {
    padding: 0.5rem 0.75rem;
    flex: 1 1 auto;
    min-width: 0;
  }

  .stat-value {
    font-size: 1.35rem;
  }

  .studio-meta h1 {
    font-size: 1.5rem;
  }

  .segments-grid {
    grid-template-columns: 1fr;
  }
}

/*
 * PHONE-WIDTH LEGIBILITY OF THE CHUNK TILES — a fix the real PhraseCard needs
 * too, applied here only.
 *
 * PhraseCard sets the current card to 2rem and gives each chunk tile
 * `white-space: nowrap`. At 390 px a three-word chunk like "Minä haluan" runs
 * past the teleprompter's edge, and the viewport's `overflow: hidden` clips it
 * rather than scrolling — the recordist simply cannot read the piece they are
 * being asked to say. `:deep()` because PhraseCard scopes its own styles.
 *
 * This is NOT a fork: it changes no layout, no control and no gesture, only the
 * type size below 480 px. It is here rather than in PhraseCard.vue because that
 * component is on the live recording path and this brief is preview-only — the
 * defect is reported to Kai separately. WHEN IT IS FIXED IN PhraseCard.vue,
 * DELETE THIS BLOCK, or the two will drift.
 */
@media (max-width: 480px) {
  .autocue-studio :deep(.phrase-card.current .phrase-with-gaps),
  .autocue-studio :deep(.phrase-card.current .phrase-text) {
    font-size: 1.4rem;
  }

  .autocue-studio :deep(.phrase-with-gaps) {
    font-size: 1.15rem;
  }

  .autocue-studio :deep(.chunk-segment) {
    white-space: normal;
  }

  .autocue-studio :deep(.gap-marker) {
    width: 28px;
    margin: 0 0.4rem;
  }

  .autocue-studio :deep(.phrase-card) {
    gap: 0.5rem;
    padding: 0.75rem 0.5rem;
  }

  .autocue-studio :deep(.phrase-marker) {
    min-width: 28px;
  }
}
</style>
