<template>
  <div class="autocue-studio">
    <div class="film-grain"></div>

    <!-- Header — the real studio header, with the practice session's numbers -->
    <header class="studio-header">
      <div class="studio-branding">
        <div class="studio-badge">🎙️</div>
        <div class="studio-meta">
          <h1>Autocue Studio</h1>
          <p class="session-info">{{ sessionInfo }}</p>
        </div>
      </div>

      <div class="session-stats" v-if="step !== 'welcome'">
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

      <span class="back-link practice-badge">{{ HINTS.nothingSaved }}</span>
    </header>

    <RecordingStatus :is-recording="isRecording" />

    <!-- Tutorial-only progress spine. Gated with the same inject as the copy. -->
    <TutorialProgress v-if="step !== 'welcome'" :steps="SPINE" :current="spineIndex" />

    <div v-if="error" class="mode-error">{{ error }}</div>

    <!-- ── welcome ─────────────────────────────────────────────────────── -->
    <div v-if="step === 'welcome'" class="script-loaded-phase">
      <div class="script-summary">
        <h2>Practice Session</h2>
        <p class="script-cap-note">Nothing you record here is saved or uploaded.</p>
        <p class="which-tool">{{ HINTS.whichTool }}</p>

        <TutorialCoach step="welcome" />

        <label class="pack-label" for="pack">Language you'll be reading</label>
        <select id="pack" v-model="packId" class="pack-select">
          <option v-for="p in PHRASE_PACKS" :key="p.id" :value="p.id">{{ p.label }}</option>
        </select>

        <div class="script-actions">
          <button class="btn-begin" @click="go('pickQueueMode')">Start</button>
        </div>
      </div>
    </div>

    <!-- ── mode select — the REAL ModeSelector.
         This screen IS the first thing a course recordist meets (AutocueStudio
         mounts, resetSession()s, and lands on 'mode-select'), so the tutorial
         shows it rather than skipping past it. Its third card — Mode 3:
         Listening Pods — is absent because ModeSelector v-if's it on a
         courseCode this standalone build has none of. That is the right
         outcome and not an accident: pods are the OTHER job, with their own
         tutorial and the opposite instruction. -->
    <div v-else-if="step === 'pickQueueMode' || step === 'switchMode'">
      <TutorialCoach :step="step" :nudged="nudged" />
      <ModeSelector @select="onModeSelect" />
    </div>

    <!-- ── role select — the REAL RoleSelector ──────────────────────────── -->
    <div v-else-if="step === 'role'">
      <TutorialCoach step="role" />
      <RoleSelector
        :course-name="`Practice — ${pack.label}`"
        known-language="English"
        :target-language="pack.label"
        :phrase-count="totalItems"
        @begin="go('queueNatural')"
        @back="go('pickQueueMode')"
      />
    </div>

    <!-- ── QUEUE MODE recording (manual advance) ────────────────────────── -->
    <div v-else-if="step === 'queueNatural' || step === 'queueSlow'" class="recording-phase">
      <div class="pass-indicator">
        <div class="pass-info">
          <span class="pass-label">Current Pass</span>
          <span class="pass-title">
            Pass {{ currentPass }}: {{ currentPass === 1 ? 'Natural Speed' : 'Slow with Gaps' }}
          </span>
        </div>
        <span class="pass-progress">Item {{ queueIndex + 1 }} / {{ passPhrases.length }}</span>
      </div>

      <VadStrip
        :calibrating="isCalibrating"
        :calibration="calibration"
        :recording="isRecording"
        :speaking="isSpeaking"
        :percent="vadMeterPercent"
      />

      <TeleprompterDisplay
        :phrases="passPhrases"
        :current-index="queueIndex"
        :current-pass="currentPass"
        :is-recording="isRecording"
        :scroll-speed="scrollSpeed"
        :script-mode="false"
        :uploaded-indices="queueDoneIndices"
      />

      <TutorialCoach :step="coachStepForQueue" />

      <RecordingControls
        :is-recording="isRecording"
        :is-paused="false"
        @toggle-recording="onQueueToggleRecording"
        @pause="() => {}"
        @previous="queueNavigate(-1)"
        @next="queueNavigate(1)"
        @slower="adjustSpeed(-1)"
        @faster="adjustSpeed(1)"
      />

      <TutorialHint :text="HINTS.manualAdvance" />

      <!-- Natural pass: hear yourself immediately, on this screen -->
      <div v-if="step === 'queueNatural' && naturalTakes.length" class="listen-panel">
        <h3>That's you</h3>
        <div v-for="(t, k) in naturalTakes" :key="k" class="listen-row">
          <template v-if="t">
            <span class="listen-text">{{ pack.natural[k] }}</span>
            <audio controls preload="none" :src="t.url"></audio>
          </template>
        </div>
        <div class="panel-actions" v-if="allNaturalDone">
          <button class="btn-begin" @click="goToSlow">Next — the slow ones</button>
        </div>
      </div>

      <!-- Slow pass: the cuts, on this screen, before moving on -->
      <div v-if="step === 'queueSlow' && currentSlowTake" class="listen-panel">
        <h3>Here's where we cut it</h3>
        <TakeWaveform
          :samples="currentSlowTake.samples"
          :sample-rate="currentSlowTake.sampleRate"
          :regions="currentSlowRegions"
        />
        <template v-if="currentSlowTake.align.ok">
          <p class="cut-ok">Found all {{ currentSlowTake.align.chunks.length }} pieces.</p>
          <div class="piece-row" v-for="(c, k) in currentSlowTake.align.chunks" :key="k">
            <span class="piece-n">{{ k + 1 }}</span>
            <span class="piece-t">{{ c.text }}</span>
            <span class="piece-d">{{ (c.durationMs / 1000).toFixed(2) }}s</span>
            <button class="piece-play" @click="playPiece(lastSlowIdx, k)">▶ Play</button>
          </div>
          <div class="panel-actions">
            <button
              v-if="!allSlowDone"
              class="btn-begin"
              @click="queueNavigate(1)"
            >Next slow one</button>
            <button v-else class="btn-begin" @click="goToQueueReview">
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
              {{ BEAT_WINDOW.minMs }} milliseconds, so we could not tell where one ended.
              Leave a longer, more definite pause.
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
        </template>
      </div>
    </div>

    <!-- ── QUEUE MODE review ────────────────────────────────────────────── -->
    <div v-else-if="step === 'queueReview'" class="review-phase">
      <div class="review-interface">
        <div class="review-header">
          <h2 class="review-title">Session Review</h2>
          <p class="review-subtitle">
            Your six pieces, cut out of the two slow reads. Tap Play on any of them.
          </p>
        </div>

        <TutorialCoach step="queueReview" />

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
          <div v-for="(mix, k) in mixes" :key="k" class="mix-row">
            <div class="mix-label">{{ mix.label }}</div>
            <audio v-if="mix.url" controls preload="none" :src="mix.url"></audio>
            <p v-else class="cut-hint">
              Couldn't build this one — a slow read didn't split cleanly. Redo it above.
            </p>
          </div>
        </div>

        <div class="final-actions">
          <button class="control-btn" @click="trySlowAgain">
            <span class="btn-icon">↻</span> Try the slow ones again
          </button>
          <button class="control-btn go" @click="go('switchMode')">
            <span class="btn-icon">➡️</span> Next — the other mode
          </button>
        </div>
      </div>
    </div>

    <!-- ── SCRIPT MODE — continuous, VAD auto-advance ───────────────────── -->
    <div v-else-if="step === 'scriptRun'" class="recording-phase">
      <div class="pass-indicator">
        <div class="pass-info">
          <span class="pass-label">Continuous Recording</span>
          <span class="pass-title">
            {{ scriptPhrases[scriptIndex]?.cadence === 'slow' ? 'Slow Pass' : 'Natural Speed' }}
            — Phrase
          </span>
        </div>
        <span class="pass-progress">Item {{ scriptIndex + 1 }} / {{ scriptPhrases.length }}</span>
      </div>

      <VadStrip
        :calibrating="isCalibrating"
        :calibration="calibration"
        :recording="isRecording"
        :speaking="isSpeaking"
        :percent="vadMeterPercent"
      />

      <TeleprompterDisplay
        :phrases="scriptPhrases"
        :current-index="scriptIndex"
        :current-pass="1"
        :is-recording="isRecording"
        :scroll-speed="scrollSpeed"
        :script-mode="true"
        :uploaded-indices="scriptDoneIndices"
      />

      <TutorialCoach step="scriptRun" />

      <RecordingControls
        :is-recording="isRecording"
        :is-paused="false"
        @toggle-recording="onScriptToggleRecording"
        @pause="() => {}"
        @previous="scriptNavigate(-1)"
        @next="scriptNavigate(1)"
        @slower="adjustSpeed(-1)"
        @faster="adjustSpeed(1)"
      />

      <TutorialHint :text="isCalibrating ? HINTS.calibrating : HINTS.autoAdvance" />

      <div v-if="landings.length" class="listen-panel">
        <h3>Takes kept so far: {{ landings.length }}</h3>
        <p class="cut-hint">
          You have been given {{ scriptPhrases.length }} lines. Every time this number goes up,
          the autocue has moved on.
        </p>
        <div class="panel-actions">
          <button class="btn-begin" @click="finishScriptRun">Stop and see what happened</button>
        </div>
      </div>
    </div>

    <!-- ── SCRIPT MODE consequence ──────────────────────────────────────── -->
    <div v-else-if="step === 'scriptConsequence'" class="review-phase">
      <div class="review-interface">
        <div class="review-header">
          <h2 class="review-title">What the tool kept</h2>
          <p class="review-subtitle">
            {{ scriptPhrases.length }} lines on the autocue · {{ landings.length }} takes kept
          </p>
        </div>

        <TutorialCoach step="scriptConsequence" />

        <div
          class="landing-verdict"
          :class="landings.length > scriptPhrases.length ? 'ran-ahead' : 'clean'"
        >
          <template v-if="landings.length > scriptPhrases.length">
            It ran ahead of you. {{ landings.length }} takes for {{ scriptPhrases.length }} lines
            means {{ landings.length - scriptPhrases.length }}
            {{ landings.length - scriptPhrases.length === 1 ? 'line was' : 'lines were' }}
            split in the middle — everything after that landed in the wrong slot.
          </template>
          <template v-else-if="landings.length < scriptPhrases.length">
            Some lines never got a take. Either you stopped early, or two lines ran together
            without a long enough gap between them for the tool to notice a boundary.
          </template>
          <template v-else>
            Clean run — one take per line. That is what it looks like when your pauses land
            inside the window.
          </template>
        </div>

        <div class="landing-list">
          <div v-for="(p, i) in scriptPhrases" :key="p.id" class="landing-row">
            <span class="landing-n">{{ i + 1 }}</span>
            <span class="landing-text" :class="{ slow: p.cadence === 'slow' }">{{ p.text }}</span>
            <span class="landing-takes" :class="takeClass(i)">
              {{ takesFor(i).length }} {{ takesFor(i).length === 1 ? 'take' : 'takes' }}
            </span>
            <span class="landing-audio">
              <audio
                v-for="(t, k) in takesFor(i)"
                :key="k"
                controls
                preload="none"
                :src="t.url"
              ></audio>
            </span>
          </div>
        </div>

        <div class="final-actions">
          <button class="control-btn" @click="retryScriptRun">
            <span class="btn-icon">↻</span> Try that again
          </button>
          <button class="control-btn go" @click="go('beatWindow')">
            <span class="btn-icon">➡️</span> Why it happened
          </button>
        </div>
      </div>
    </div>

    <!-- ── the beat window ──────────────────────────────────────────────── -->
    <div v-else-if="step === 'beatWindow'" class="script-loaded-phase">
      <div class="script-summary">
        <h2>The beat window</h2>
        <TutorialCoach step="beatWindow" />
        <BeatWindowDiagram />
        <div class="script-actions">
          <button class="control-btn" @click="retryScriptRun">
            <span class="btn-icon">↻</span> Try continuous again
          </button>
          <button class="btn-begin" @click="go('done')">I've got it</button>
        </div>
      </div>
    </div>

    <!-- ── done ─────────────────────────────────────────────────────────── -->
    <div v-else-if="step === 'done'" class="summary-phase">
      <div class="summary-card">
        <h2>Session Complete</h2>
        <div class="summary-stats">
          <div class="summary-stat">
            <span class="summary-value">2</span>
            <span class="summary-label">Modes Used</span>
          </div>
          <div class="summary-stat">
            <span class="summary-value">{{ recordedCount }}</span>
            <span class="summary-label">Takes</span>
          </div>
          <div class="summary-stat">
            <span class="summary-value">{{ mixes.filter(m => m.url).length }}</span>
            <span class="summary-label">Rebuilt</span>
          </div>
        </div>
        <TutorialCoach step="done" />
        <div class="summary-actions">
          <button class="control-btn" @click="restart">
            <span class="btn-icon">⬅️</span> Start over
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * Recordist tutorial — a guided pass over the REAL Autocue Studio.
 *
 * ── WHICH SURFACE THIS TEACHES ──────────────────────────────────────────────
 * THE COURSE-PHRASE RECORDER: AutocueStudio, reached via the Record Room at
 * /record/:courseCode. NOT /r/:voiceId (RecordistRoom.vue), which is the
 * per-person by-language queue — public, link-is-identity, whole lines via
 * useTapRecorder, and with no concept of slow reads, chunks or cadence anywhere
 * in it. The two surfaces are deliberately separate (Kai, 2026-08-19) because
 * pod audio wants performance and course phrases want neutrality, which are
 * opposite instructions to a human. The pod tutorial is a different build and
 * must NOT teach neutrality. See tutorialScript.js's header for the full ruling.
 *
 * NOTE ON REACH: the surface this teaches is login-gated (RecordRoom's route
 * carries requiresAuth). This practice build is not, because it needs no API at
 * all — which is right for a tutorial, but means it is a link you send someone,
 * not something they discover inside the tool.
 *
 * ── WHY IT IS A SEPARATE COMPONENT rather than a flag on AutocueStudio.vue ───
 * AutocueStudio's body is course-bound end to end: loadCourse(), the
 * useAutocueState module singleton, and useUploadQueue on every captured
 * segment. A `tutorial` flag would have to branch around all three, and the
 * branch that must never be wrong is the upload one. This component imports
 * neither useAudioUpload nor useAutocueState, so a practice take has nowhere to
 * go — the guarantee is structural, not a conditional someone can invert.
 *
 * ── WHAT IS REUSED VERBATIM from the live recorder ──────────────────────────
 *   ModeSelector, RoleSelector, RecordingStatus, TeleprompterDisplay (+
 *   PhraseCard), RecordingControls, SegmentCard — imported unmodified. The
 *   recordist presses the SAME mode cards, in the same place, to switch modes.
 *   The shell markup/CSS below is lifted from AutocueStudio.vue (which scopes
 *   its styles, so the rules must be present here to render the same screen).
 *   Do not let them drift.
 *
 * ── WHERE THE TEACHING COPY LIVES, AND HOW IT IS GATED ──────────────────────
 *   Every instructional word is in tutorial/tutorialScript.js and reaches the
 *   screen ONLY through <TutorialCoach>, <TutorialHint> and <TutorialProgress>,
 *   all three of which render nothing unless TUTORIAL_MODE was provided.
 *   provideTutorialMode() is called once, below, and nowhere else in the repo.
 *   So a real recordist cannot see any of it, and a future edit cannot leak it
 *   into the live surface by forgetting a v-if — there is no v-if to forget.
 *
 * ── THE TWO MODES, and the order they are taught in ─────────────────────────
 *   Queue mode (regeneration): phrase-by-phrase, MANUAL advance — the recordist
 *   holds the boundary. Taught first, because neutrality and auto-advance
 *   failing at the same time gives a failure two possible causes.
 *   Script mode (new-course): continuous, VAD AUTO-advance — the tool decides
 *   when you finished. Taught second, with the consequence made visible: the
 *   take-landing table shows when it ran ahead of the recordist.
 *   Both are real: see useAutocueState.js's own header.
 *
 * Nothing is saved: no fetch/XHR/sendBeacon, no localStorage/sessionStorage/
 * IndexedDB, no upload queue, no TTS. Takes are in-memory Float32Arrays and
 * blob: URLs revoked on unmount. Splicing goes through src/utils/takeSplice.js
 * — no third implementation. Only SLOW reads are ever segmented; natural-speed
 * takes are played straight back and never cut, so the 2026-08-19 natural-speed
 * boundary defect cannot reach this.
 */
import { ref, computed, onMounted, onUnmounted } from 'vue'

import ModeSelector from './ModeSelector.vue'
import RoleSelector from './RoleSelector.vue'
import TeleprompterDisplay from './teleprompter/TeleprompterDisplay.vue'
import RecordingControls from './recording/RecordingControls.vue'
import RecordingStatus from './recording/RecordingStatus.vue'
import SegmentCard from './review/SegmentCard.vue'

import TakeWaveform from './tutorial/TakeWaveform.vue'
import TutorialCoach from './tutorial/TutorialCoach.vue'
import TutorialHint from './tutorial/TutorialHint.vue'
import TutorialProgress from './tutorial/TutorialProgress.vue'
import BeatWindowDiagram from './tutorial/BeatWindowDiagram.vue'
import VadStrip from './tutorial/VadStrip.vue'
import { provideTutorialMode } from './tutorial/tutorialMode'
import { HINTS, BEAT_WINDOW } from './tutorial/tutorialScript'

import { useVAD } from '@/composables/useVAD'
import { useContinuousRecorder } from '@/composables/useContinuousRecorder'
import { PHRASE_PACKS, packById } from '@/utils/tutorialPhrases'
import {
  decodeMono, alignSlowGap, sliceChunk, concatChunks, encodeWavMono,
} from '@/utils/takeSplice'

// THE GATE, turned on in exactly one place.
provideTutorialMode()

// ── the tutorial's spine ────────────────────────────────────────────────────
const SPINE = [
  { key: 'pickQueueMode', label: 'Modes' },
  { key: 'role', label: 'Voice' },
  { key: 'queueNatural', label: 'Natural' },
  { key: 'queueSlow', label: 'Slow' },
  { key: 'queueReview', label: 'Pieces' },
  { key: 'switchMode', label: 'Switch' },
  { key: 'scriptRun', label: 'Continuous' },
  { key: 'scriptConsequence', label: 'Result' },
  { key: 'beatWindow', label: 'The beat' },
  { key: 'done', label: 'Done' },
]

const step = ref('welcome')
const nudged = ref(false)
const spineIndex = computed(() => SPINE.findIndex((s) => s.key === step.value))

function go(next) {
  nudged.value = false
  step.value = next
}

// ── session state ───────────────────────────────────────────────────────────
const packId = ref(PHRASE_PACKS[0].id)
const pack = computed(() => packById(packId.value))

const scrollSpeed = ref(3)
const isRecording = ref(false)
const error = ref('')

// queue mode
const currentPass = ref(1)
const queueIndex = ref(0)
const naturalTakes = ref([])
const slowTakes = ref([])
const lastSlowIdx = ref(null)   // which slow read the cut panel is showing
const mixes = ref([])

// script mode
const scriptIndex = ref(0)
const landings = ref([])   // [{ index, url, durationMs }]

// Blob URLs are the only artefact this component makes, revoked on unmount.
const objectUrls = []
function urlFor(blob) {
  const u = URL.createObjectURL(blob)
  objectUrls.push(u)
  return u
}
function wavUrl(samples, sampleRate) {
  return urlFor(encodeWavMono(samples, sampleRate))
}

// ── phrase feeds ────────────────────────────────────────────────────────────
const passPhrases = computed(() => {
  if (currentPass.value === 1) {
    return pack.value.natural.map((text, i) => ({ id: `nat-${i}`, text, cadence: 'natural' }))
  }
  return pack.value.slow.map((r, i) => ({
    id: `slow-${i}`, text: r.chunks.join(' '), chunks: r.chunks, cadence: 'slow',
  }))
})

// Script mode gets ONE continuous list mixing cadences, which is the shape of a
// real optimizer script.
const scriptPhrases = computed(() => [
  ...pack.value.natural.map((text, i) => ({ id: `sn-${i}`, text, cadence: 'natural' })),
  ...pack.value.slow.map((r, i) => ({
    id: `ss-${i}`, text: r.chunks.join(' '), chunks: r.chunks, cadence: 'slow',
  })),
])

const queueDoneIndices = computed(() => {
  const takes = currentPass.value === 1 ? naturalTakes.value : slowTakes.value
  const s = new Set()
  takes.forEach((t, i) => { if (t) s.add(i) })
  return s
})
const scriptDoneIndices = computed(() => new Set(landings.value.map((l) => l.index)))

const allNaturalDone = computed(
  () => pack.value.natural.every((_, i) => !!naturalTakes.value[i])
)
const allSlowDone = computed(
  () => pack.value.slow.every((_, i) => !!slowTakes.value[i])
)

const totalItems = computed(() => pack.value.natural.length + pack.value.slow.length)

// The header stats describe the LEG the recordist is in, not the whole tutorial
// — that is what the real studio's Recorded/Total/Complete mean, and summing
// two modes' takes against one mode's line count read as "10 of 4".
//
// In the continuous leg `recordedCount` can legitimately EXCEED the line count:
// six takes for four lines is not a display bug, it is the entire lesson of
// that screen. So the percentage is clamped rather than the count.
const inScriptLeg = computed(
  () => ['scriptRun', 'scriptConsequence', 'beatWindow'].includes(step.value)
)
const recordedCount = computed(() => inScriptLeg.value
  ? landings.value.length
  : naturalTakes.value.filter(Boolean).length + slowTakes.value.filter(Boolean).length)
const completionPercent = computed(() =>
  Math.min(100, Math.round((recordedCount.value / totalItems.value) * 100))
)
const sessionInfo = computed(() => `Practice · ${pack.value.label} · ${modeLabel.value}`)
const modeLabel = computed(() => {
  if (inScriptLeg.value) return 'continuous'
  if (['queueNatural', 'queueSlow', 'queueReview'].includes(step.value)) return 'phrase-by-phrase'
  return 'nothing saved'
})

const coachStepForQueue = computed(() => {
  if (step.value === 'queueSlow') return currentSlowTake.value ? 'queueCuts' : 'queueSlow'
  // The mic is open, so the live question is no longer "how do I record" but
  // "how do I end this take" — which is the lesson of the NEXT button.
  if (isRecording.value) return 'queueAdvance'
  return 'queueNatural'
})

// ── microphone + VAD ────────────────────────────────────────────────────────
// The SAME constraints useContinuousRecorder asks for. Matching them matters:
// AGC and denoise reshape the energy envelope, which is what the splitter reads.
const MIC = { echoCancellation: true, noiseSuppression: true, autoGainControl: true }

const vad = useVAD({ silenceThreshold: 0.02, silenceDuration: BEAT_WINDOW.maxMs, minSpeechDuration: 300 })
const continuous = useContinuousRecorder({
  silenceThreshold: 0.02,
  silenceDuration: BEAT_WINDOW.maxMs,
  minSpeechDuration: 300,
  autoUpload: false,   // there is no upload queue wired to this component at all
  autoAdvance: true,
})

// Which source drives the meter depends on which mode is on screen.
const inScript = computed(() => step.value === 'scriptRun')  // meter source only
const isSpeaking = computed(() => (inScript.value ? continuous.isSpeaking.value : vad.isSpeaking.value))
const isCalibrating = computed(() => (inScript.value ? continuous.isCalibrating.value : vad.isCalibrating.value))
const calibration = computed(() => (inScript.value ? continuous.calibration.value : vad.calibration.value))
// Same x300 scaling the real studio applies — raw RMS would paint a third of the bar.
const vadMeterPercent = computed(() => {
  const lvl = inScript.value ? continuous.currentLevel.value : vad.currentLevel.value
  return Math.min(100, Math.round(lvl * 300))
})

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

// ── QUEUE MODE capture ──────────────────────────────────────────────────────
//
// Mirrors the real tool exactly (useAutocueState.startPhraseRecording /
// navigatePhrase): ONE microphone stream is held open for the whole session,
// and a FRESH MediaRecorder is created per phrase. The recordist presses START
// RECORDING once; NEXT closes the current phrase's take and opens the next;
// STOP RECORDING ends the session.
//
// That is what "manual advance" actually means here — not "press record for
// each line", but "the boundary between takes is your finger". It is the exact
// thing script mode takes away from you, which is why the tutorial teaches this
// one first and makes the recordist feel the NEXT button do the work.
let phraseRecorder = null

function startPhraseRecording() {
  if (!stream) return
  const i = queueIndex.value
  const pass = currentPass.value
  const mimeType = pickMimeType()
  phraseRecorder = mimeType
    ? new MediaRecorder(stream, { mimeType })
    : new MediaRecorder(stream)
  const parts = []
  phraseRecorder.ondataavailable = (e) => { if (e.data.size) parts.push(e.data) }
  phraseRecorder.onstop = async () => {
    const blob = new Blob(parts, { type: phraseRecorder?.mimeType || mimeType || 'audio/webm' })
    if (!blob.size) return
    if (pass === 1) {
      naturalTakes.value[i] = { url: urlFor(blob) }
      naturalTakes.value = [...naturalTakes.value]
    } else {
      try {
        const { samples, sampleRate } = await decodeMono(await blob.arrayBuffer())
        const chunks = pack.value.slow[i].chunks
        slowTakes.value[i] = { samples, sampleRate, align: alignSlowGap(samples, sampleRate, chunks) }
        slowTakes.value = [...slowTakes.value]
        lastSlowIdx.value = i
      } catch (e) {
        error.value = 'That take would not decode: ' + e.message
      }
    }
  }
  phraseRecorder.start()
}

function stopPhraseRecording() {
  if (phraseRecorder?.state === 'recording') phraseRecorder.stop()
  phraseRecorder = null
}

async function onQueueToggleRecording() {
  if (isRecording.value) {
    // STOP ends the whole pass, as it does in the real studio.
    stopPhraseRecording()
    releaseMic()
    isRecording.value = false
    return
  }

  error.value = ''
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: MIC })
  } catch (e) {
    error.value = 'The browser would not give us the microphone: ' + e.message +
      '. On iPhone, tap the "aA" in the address bar → Website Settings → Microphone → Allow.'
    return
  }
  await vad.startListening(stream)
  if (!calibratedOnce) {
    calibratedOnce = true
    await vad.calibrate(1500)
  }
  isRecording.value = true
  startPhraseRecording()
}

function queueNavigate(delta) {
  const next = queueIndex.value + delta
  if (next < 0 || next >= passPhrases.value.length) return
  if (isRecording.value) {
    // Close this phrase's take, move, open the next — the real navigatePhrase(),
    // including its 100 ms breather so the previous blob finalises first.
    stopPhraseRecording()
    queueIndex.value = next
    setTimeout(() => { if (isRecording.value) startPhraseRecording() }, 100)
  } else {
    queueIndex.value = next
  }
}
function adjustSpeed(delta) {
  scrollSpeed.value = Math.min(10, Math.max(1, scrollSpeed.value - delta))
}

function goToSlow() {
  currentPass.value = 2
  queueIndex.value = 0
  go('queueSlow')
}

// ── SCRIPT MODE capture: the real continuous recorder, auto-advancing ───────
continuous.onSegmentCaptured((segment) => {
  // Record WHICH LINE was on the autocue when this take ended. When the tool
  // runs ahead of the recordist, this is the evidence.
  landings.value = [...landings.value, {
    index: scriptIndex.value,
    url: urlFor(segment.blob),
    durationMs: segment.durationMs,
  }]
  if (scriptIndex.value < scriptPhrases.value.length - 1) {
    scriptIndex.value++
  } else {
    finishScriptRun()
  }
})

async function onScriptToggleRecording() {
  if (isRecording.value) return finishScriptRun()
  error.value = ''
  try {
    await continuous.startFlow()
    isRecording.value = true
  } catch (e) {
    error.value = 'Could not start continuous recording: ' + (e?.message || e) +
      '. On iPhone, tap the "aA" in the address bar → Website Settings → Microphone → Allow.'
  }
}

function finishScriptRun() {
  if (continuous.isFlowMode.value) continuous.stopFlow()
  isRecording.value = false
  if (landings.value.length) go('scriptConsequence')
}

function retryScriptRun() {
  landings.value = []
  scriptIndex.value = 0
  go('scriptRun')
}

function scriptNavigate(delta) {
  const next = scriptIndex.value + delta
  if (next >= 0 && next < scriptPhrases.value.length) scriptIndex.value = next
}

function takesFor(i) {
  return landings.value.filter((l) => l.index === i)
}
function takeClass(i) {
  const n = takesFor(i).length
  return n === 1 ? 'ok' : n === 0 ? 'none' : 'many'
}

// ── mode switching, through the REAL ModeSelector ───────────────────────────
function onModeSelect(mode) {
  if (step.value === 'pickQueueMode') {
    // 'regeneration' is queue mode in useAutocueState.selectMode().
    if (mode === 'regeneration') return go('role')
    nudged.value = true
    return
  }
  if (step.value === 'switchMode') {
    // 'new-course' is script mode — continuous, VAD auto-advance.
    if (mode === 'new-course') {
      landings.value = []
      scriptIndex.value = 0
      return go('scriptRun')
    }
    nudged.value = true
  }
}

// ── the slow take on screen ─────────────────────────────────────────────────
// The cut panel shows the take that was just COMPLETED, not whatever the
// cursor has since moved to — pressing NEXT closes a take and advances in the
// same gesture, so keying this off queueIndex would blank the panel at the
// exact moment the recordist wants to look at it.
const currentSlowTake = computed(() =>
  step.value === 'queueSlow' && lastSlowIdx.value !== null
    ? slowTakes.value[lastSlowIdx.value] || null
    : null
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
 * `confidence` is not decoration: it is how much silence the splitter had in
 * the BEAT beside this piece, against the minimum it needs. Only gaps BETWEEN
 * pieces count — the silence before the first and after the last is head/tail
 * room, controlled by when the recordist tapped Stop, and says nothing about
 * their delivery.
 */
function segmentsFor(readIndex) {
  const t = slowTakes.value[readIndex]
  if (!t?.align?.ok) return []
  const chunks = t.align.chunks
  return chunks.map((c, i) => {
    const before = i === 0 ? Infinity : c.startMs - chunks[i - 1].endMs
    const after = i === chunks.length - 1 ? Infinity : chunks[i + 1].startMs - c.endMs
    const gap = Math.min(before, after)
    const margin = Number.isFinite(gap) ? Math.round(gap) : BEAT_WINDOW.aimMs
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
        : [`only a ${margin} ms beat beside this piece (needs ${BEAT_WINDOW.minMs} ms)`],
    }
  })
}

// ── recombination ───────────────────────────────────────────────────────────
function goToQueueReview() {
  mixes.value = pack.value.recombine.map((r) => {
    const pieces = r.pieces.map(([ri, ci]) => pieceOf(ri, ci))
    if (pieces.some((x) => !x?.length)) return { label: r.label, url: null }
    const sr = slowTakes.value[r.pieces[0][0]].sampleRate
    return { label: r.label, url: wavUrl(concatChunks(pieces, sr, { gapMs: 0 }), sr) }
  })
  go('queueReview')
}

function redoSlow(readIndex) {
  currentPass.value = 2
  queueIndex.value = readIndex
  lastSlowIdx.value = null
  go('queueSlow')
}
function trySlowAgain() {
  slowTakes.value = []
  lastSlowIdx.value = null
  mixes.value = []
  redoSlow(0)
}
function restart() {
  naturalTakes.value = []
  slowTakes.value = []
  lastSlowIdx.value = null
  mixes.value = []
  landings.value = []
  scriptIndex.value = 0
  queueIndex.value = 0
  currentPass.value = 1
  error.value = ''
  go('welcome')
}

/**
 * Testing hook (tools/recordist-tutorial/verify-recordist-tutorial.mjs).
 *
 * Chromium's fake microphone loops on wall-clock, so a live capture lands on
 * 2, 3 or 4 bursts depending on when the click happened — the exact-count path
 * can only be proven against a known take. This drops one into both slow slots
 * and re-exposes the splitter so the harness runs the SAME module the page runs.
 *
 * It writes only to this component's in-memory refs. There is nothing it could
 * save, because this component has no code that saves anything.
 */
onMounted(() => {
  window.__tutorial = {
    splice: { decodeMono, alignSlowGap, sliceChunk, concatChunks, encodeWavMono, BEAT_WINDOW },
    goto: (s) => go(s),
    forceSlow(samples, sampleRate) {
      slowTakes.value = pack.value.slow.map((r) => ({
        samples, sampleRate, align: alignSlowGap(samples, sampleRate, r.chunks),
      }))
      currentPass.value = 2
      queueIndex.value = pack.value.slow.length - 1
      lastSlowIdx.value = pack.value.slow.length - 1
      go('queueSlow')
    },
    forceLandings(n) {
      // Mirror finishScriptRun()'s teardown, not just its navigation — otherwise
      // the studio's REC pill stays lit over the consequence screen.
      if (continuous.isFlowMode.value) continuous.stopFlow()
      isRecording.value = false
      landings.value = Array.from({ length: n }, (_, k) => ({
        index: Math.min(k, scriptPhrases.value.length - 1), url: null, durationMs: 1000,
      }))
      go('scriptConsequence')
    },
  }
})

onUnmounted(() => {
  stopPhraseRecording()
  releaseMic()
  if (continuous.isFlowMode.value) continuous.stopFlow()
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

.studio-branding { display: flex; align-items: center; gap: 1rem; }

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

.session-stats { display: flex; gap: 1.5rem; }

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

/* Where the real studio puts "← Back to Dashboard". There is nowhere to go back
   to from a practice session, so the slot carries the guarantee instead. */
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

.script-loaded-phase,
.summary-phase {
  display: flex;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.script-summary,
.summary-card {
  max-width: 640px;
  width: 100%;
  background: var(--color-shadow);
  border: 1px solid var(--color-graphite);
  border-radius: 16px;
  padding: 2.5rem;
  text-align: center;
}

.script-summary h2,
.summary-card h2 {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1.75rem;
  color: var(--color-paper);
  margin: 0 0 2rem 0;
}

.summary-card h2 { color: var(--color-emerald); }

.summary-stats {
  display: flex;
  gap: 1.5rem;
  justify-content: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.summary-stat {
  text-align: center;
  padding: 1rem;
  background: var(--color-void);
  border-radius: 8px;
  border: 1px solid var(--color-graphite);
  min-width: 80px;
}

.summary-value {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--color-emerald);
  display: block;
}

.summary-label {
  font-size: 0.7rem;
  color: var(--color-paper-dim);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-top: 0.25rem;
  display: block;
}

.script-actions,
.summary-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 1.5rem;
  flex-wrap: wrap;
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

.recording-phase {
  max-width: 1000px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

.review-phase { position: relative; z-index: 1; }

/* ── tutorial-only surfaces, built from the same tokens ──────────────────── */
.practice-badge {
  border: 1px solid var(--color-emerald);
  border-radius: 999px;
  padding: 0.35rem 0.8rem;
  white-space: nowrap;
}

.which-tool {
  font-size: 0.88rem;
  line-height: 1.5;
  color: var(--color-paper-dim);
  border: 1px dashed var(--color-graphite);
  border-radius: 8px;
  padding: 0.6rem 0.75rem;
  margin: 0 0 1.5rem;
  text-align: left;
}

.pack-label {
  display: block;
  font-size: 0.7rem;
  color: var(--color-paper-dim);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 0.4rem;
  text-align: left;
}

.pack-select {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1rem;
  width: 100%;
  min-height: 52px;
  padding: 0.7rem;
  color: var(--color-paper);
  background: var(--color-void);
  border: 1px solid var(--color-graphite);
  border-radius: 8px;
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

.listen-row { margin-bottom: 1rem; }

.listen-text {
  font-family: 'Crimson Pro', serif;
  font-size: 1.15rem;
  color: var(--color-paper);
  display: block;
  margin-bottom: 0.35rem;
}

audio { width: 100%; height: 42px; }

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

.piece-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background: var(--color-void);
  border-radius: 10px;
  padding: 0.5rem 0.7rem;
  margin-top: 0.5rem;
}

.piece-n { color: var(--color-paper-dim); font-size: 0.8rem; min-width: 1.2rem; }
.piece-t { flex: 1; color: var(--color-paper); min-width: 0; }
.piece-d {
  color: var(--color-paper-dim);
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
}

.piece-play {
  background: var(--color-slate);
  border: 1px solid var(--color-graphite);
  color: var(--color-paper);
  border-radius: 8px;
  min-height: 44px;
  padding: 0 0.9rem;
  font-family: 'Josefin Sans', sans-serif;
  font-weight: 600;
  cursor: pointer;
}

.review-interface { max-width: 1400px; margin: 0 auto; }

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

.review-subtitle { color: var(--color-paper-dim); margin: 0; }

.take-block { margin-bottom: 2rem; }

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

.mix-row { margin-bottom: 1.25rem; }

.mix-label {
  font-family: 'Crimson Pro', serif;
  font-size: 1.2rem;
  color: var(--color-paper);
  background: var(--color-void);
  border-radius: 8px;
  padding: 0.7rem 0.9rem;
  margin-bottom: 0.4rem;
}

/* Script-mode take landings */
.landing-verdict {
  border-radius: 12px;
  padding: 1rem 1.1rem;
  margin-bottom: 1.25rem;
  font-size: 1rem;
  line-height: 1.55;
}

.landing-verdict.clean {
  background: rgba(6, 255, 165, 0.1);
  border: 1px solid var(--color-emerald);
  color: var(--color-emerald);
}

.landing-verdict.ran-ahead {
  background: rgba(255, 166, 48, 0.12);
  border: 1px solid var(--color-tungsten);
  color: var(--color-tungsten);
}

.landing-list {
  background: var(--color-shadow);
  border: 1px solid var(--color-graphite);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1.25rem;
}

.landing-row {
  display: grid;
  grid-template-columns: 1.5rem 1fr auto;
  gap: 0.6rem 0.75rem;
  align-items: center;
  padding: 0.6rem 0;
  border-bottom: 1px solid var(--color-graphite);
}

.landing-row:last-child { border-bottom: none; }

.landing-n { color: var(--color-paper-dim); font-size: 0.8rem; }

.landing-text {
  font-family: 'Crimson Pro', serif;
  font-size: 1.05rem;
  color: var(--color-paper);
  min-width: 0;
}

.landing-text.slow { color: var(--color-tungsten); }

.landing-takes {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  white-space: nowrap;
}

.landing-takes.ok { background: rgba(6, 255, 165, 0.16); color: var(--color-emerald); }
.landing-takes.many { background: rgba(255, 166, 48, 0.18); color: var(--color-tungsten); }
.landing-takes.none { background: rgba(230, 57, 70, 0.16); color: var(--color-film-red); }

.landing-audio { grid-column: 1 / -1; }

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

.control-btn.go {
  background: var(--color-emerald);
  border-color: var(--color-emerald);
  color: var(--color-void);
}

/* Responsive — same breakpoints the real studio uses. Kai records standing,
   holding the phone; nothing here may need a sideways scroll to reach. */
@media (max-width: 768px) {
  .studio-header { flex-direction: column; gap: 1rem; }

  .session-stats {
    width: 100%;
    justify-content: space-around;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .script-summary,
  .summary-card { padding: 1.5rem 1.1rem; }

  .pass-indicator {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .final-actions,
  .panel-actions,
  .script-actions,
  .summary-actions { flex-direction: column; }

  .final-actions .control-btn,
  .script-actions .control-btn,
  .summary-actions .control-btn,
  .panel-actions .btn-begin,
  .script-actions .btn-begin { width: 100%; }
}

@media (max-width: 480px) {
  .autocue-studio { padding: 1rem 0.75rem; }

  .stat-item { padding: 0.5rem 0.75rem; flex: 1 1 auto; min-width: 0; }
  .stat-value { font-size: 1.35rem; }
  .studio-meta h1 { font-size: 1.5rem; }
  .segments-grid { grid-template-columns: 1fr; }

  .piece-row { flex-wrap: wrap; }
  .piece-play { width: 100%; margin-top: 0.4rem; }

  .landing-row { grid-template-columns: 1.5rem 1fr; }
  .landing-takes { grid-column: 2; justify-self: start; }
}

/*
 * PHONE-WIDTH LEGIBILITY OF THE CHUNK TILES — a fix the real PhraseCard needs
 * too, applied here only.
 *
 * PhraseCard sets the current card to 2rem and gives each chunk tile
 * `white-space: nowrap`. At 390 px a three-word chunk runs past the
 * teleprompter's edge, and the viewport's `overflow: hidden` clips it rather
 * than scrolling — the recordist simply cannot read the piece they are being
 * asked to say. `:deep()` because PhraseCard scopes its own styles.
 *
 * This is NOT a fork: it changes no layout, no control and no gesture, only the
 * type size below 480 px. It is here rather than in PhraseCard.vue because that
 * component is on the live recording path and this brief is preview-only — the
 * defect is reported to Kai separately. WHEN IT IS FIXED IN PhraseCard.vue,
 * DELETE THIS BLOCK, or the two will drift.
 */
@media (max-width: 480px) {
  .autocue-studio :deep(.phrase-card.current .phrase-with-gaps),
  .autocue-studio :deep(.phrase-card.current .phrase-text) { font-size: 1.4rem; }
  .autocue-studio :deep(.phrase-with-gaps) { font-size: 1.15rem; }
  .autocue-studio :deep(.chunk-segment) { white-space: normal; }
  .autocue-studio :deep(.gap-marker) { width: 28px; margin: 0 0.4rem; }
  .autocue-studio :deep(.phrase-card) { gap: 0.5rem; padding: 0.75rem 0.5rem; }
  .autocue-studio :deep(.phrase-marker) { min-width: 28px; }
}
</style>
