<template>
  <div class="autocue-studio">
    <!-- Breadcrumbs. Present on EVERY phase, and once the recordist is inside a
         mode the "Recording" crumb is the way back to the mode-choice page —
         the same gesture as everywhere else in Popty. It replaces the bespoke
         "← Back to Dashboard" link; the Home crumb goes to the same place
         that did.

         Rendered ONLY on the course route. This same component is also mounted
         inside RecordRoom, whose /record/ and /r/ routes are public: the navbar
         is deliberately hidden there so a volunteer "sees the line and nothing
         else", and RecordRoom draws its own chrome with its own way out. A
         volunteer on a phone must not be handed a route into the admin
         dashboard. -->
    <nav v-if="showCrumbs" class="admin-crumbs">
      <router-link to="/" class="crumb-link">Home</router-link>
      <span class="crumb-sep">/</span>
      <template v-if="courseCode">
        <router-link :to="`/production/${courseCode}`" class="crumb-link">{{ courseCrumb }}</router-link>
        <span class="crumb-sep">/</span>
      </template>
      <template v-if="phaseCrumb">
        <button type="button" class="crumb-link crumb-back" @click="resetSession">Recording</button>
        <span class="crumb-sep">/</span>
        <span class="crumb-here">{{ phaseCrumb }}</span>
      </template>
      <span v-else class="crumb-here">Recording</span>
    </nav>

    <!-- Header -->
    <header class="studio-header">
      <div class="studio-branding">
        <span class="icon-frame" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="2" width="6" height="11" rx="3" />
            <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
            <path d="M12 18v4" />
            <path d="M8 22h8" />
          </svg>
        </span>
        <div class="studio-meta">
          <h1>Autocue Studio</h1>
          <p class="session-info">{{ sessionInfo }}</p>
          <!-- Which voice this session is credited to. Silence here is what
               let takes be filed under voice 1 without anyone seeing it. -->
          <p class="recording-as" v-if="recordingAs">
            Recording as <strong>{{ recordingAs.voiceName }}</strong>
            <span class="recording-as-slot">· {{ recordingAs.label }}</span>
          </p>
          <p class="recording-as recording-as-none" v-else-if="voiceConfigLoaded">
            No voice slot assigned to you on this course — takes are saved
            unattributed until a leader assigns you one.
          </p>
        </div>
      </div>

      <div class="session-stats" v-if="state.currentPhase !== 'mode-select'">
        <div class="stat-item">
          <span class="stat-value">{{ recordedCount }}</span>
          <span class="stat-label">Recorded</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ totalPhrases }}</span>
          <span class="stat-label">Total</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ completionPercent }}%</span>
          <span class="stat-label">Complete</span>
        </div>
        <div class="stat-item" v-if="state.scriptMode">
          <span class="stat-value">{{ uploadedCount }}</span>
          <span class="stat-label">Uploaded</span>
        </div>
      </div>
    </header>

    <!-- Recording Status (Fixed) -->
    <RecordingStatus :is-recording="state.isRecording" />

    <!-- Phase: Mode Selection -->
    <div v-if="state.currentPhase === 'mode-select'">
      <!-- Script loading failures used to reset the phase silently, so the
           mode buttons just looked dead. Say what went wrong. -->
      <div v-if="state.error" class="mode-error">{{ state.error }}</div>
      <ModeSelector @select="onModeSelect" />
    </div>

    <!-- Phase: Loading -->
    <div v-else-if="state.currentPhase === 'loading' || state.isLoading" class="loading-phase">
      <div class="loading-spinner"></div>
      <p class="loading-text">
        Building recording script<span v-if="state.maxSeed"> for a quick sample of the course</span>…
      </p>
    </div>

    <!-- Phase: Script Loaded Confirmation (new-course mode) -->
    <div v-else-if="state.currentPhase === 'script-loaded'" class="script-loaded-phase">
      <div class="script-summary">
        <h2>Recording Script Ready</h2>
        <!-- Deliberately vague about WHICH seeds: the optimizer picks by LEGO
             coverage under the cap, so naming a range would be a lie. -->
        <p v-if="state.scriptInfo?.maxSeed" class="script-cap-note">
          Limited to a quick sample from the early part of the course.
        </p>
        <!-- Only shown when someone asked for it with ?order=course. Coverage
             order is the default and says nothing, exactly as before. -->
        <p v-if="state.scriptInfo?.order === 'course'" class="script-cap-note">
          The course itself, in order — start to finish. Stop wherever you like;
          the rest is still there next time.
        </p>
        <!-- The other mode used to say nothing at all, which is what let a
             session open somewhere in the middle of a course with no
             explanation of why. -->
        <p v-else class="script-cap-note">
          A shorter set of lines that between them cover the whole course. They
          jump around rather than starting at the beginning, and are cut up and
          reassembled afterwards to voice everything else.
        </p>
        <div class="script-stats">
          <!-- Course order has no phrase/direct split: every line is a course
               item, so it shows the size of the course instead. -->
          <template v-if="state.scriptInfo?.order === 'course'">
            <div class="script-stat">
              <span class="script-stat-value">{{ state.scriptInfo?.totalInCourse || 0 }}</span>
              <span class="script-stat-label">Items in course</span>
            </div>
          </template>
          <template v-else>
            <div class="script-stat">
              <span class="script-stat-value">{{ state.scriptInfo?.totalPhrases || 0 }}</span>
              <span class="script-stat-label">Phrases</span>
            </div>
            <div class="script-stat">
              <span class="script-stat-value">{{ state.scriptInfo?.totalDirect || 0 }}</span>
              <span class="script-stat-label">Direct Items</span>
            </div>
          </template>
          <!-- EVERY reading mode, always. This stat used to be course-order
               only, so a coverage session opened on a screen that said nothing
               about the 225 lines already in the can and read as a fresh start
               (2026-08-23). A dash means "we could not check", never zero. -->
          <div class="script-stat">
            <span class="script-stat-value">{{ alreadyRecordedDisplay }}</span>
            <span class="script-stat-label">Already recorded</span>
          </div>
          <div class="script-stat">
            <span class="script-stat-value">{{ state.scriptInfo?.totalItems || 0 }}</span>
            <span class="script-stat-label">Total Items</span>
          </div>
          <div class="script-stat">
            <span class="script-stat-value">~{{ state.scriptInfo?.estimatedMinutes || 0 }}</span>
            <span class="script-stat-label">Minutes</span>
          </div>
        </div>
        <!-- Say the same thing in a sentence, in both modes: a stat tile is
             easy to miss on a phone, and "you have recorded nothing" is the
             one impression this screen must never leave. -->
        <p v-if="state.scriptInfo?.alreadyRecorded === null" class="script-cap-note">
          We couldn't check how many lines you've already recorded for this course
          just now. Anything you recorded before is still saved — this doesn't mean
          none exist.
        </p>
        <p v-else-if="state.scriptInfo?.alreadyRecorded > 0" class="script-cap-note">
          {{ state.scriptInfo.alreadyRecorded }} lines are already recorded in your
          voice for this course. They're skipped — what's below is what's left.
        </p>
        <!-- Course order is a natural-only run: each line is read once and the
             slow pass never appears, so promising amber text here would be a
             lie the recordist notices on line one. -->
        <p v-if="state.scriptInfo?.naturalOnly" class="script-instructions">
          Each line appears once: read it at <strong>natural speed</strong>, then
          straight on to the next. No slow reading in this session.
          VAD will auto-detect pauses and advance automatically.
        </p>
        <p v-else class="script-instructions">
          Each phrase appears twice: <strong>white text</strong> for natural speed,
          then <strong class="amber-text">amber text</strong> for slow reading.
          VAD will auto-detect pauses and advance automatically.
        </p>
        <div class="script-actions">
          <button class="btn-begin" @click="onBeginContinuous">Begin Recording</button>
          <button class="btn-cancel" @click="resetSession">Cancel</button>
        </div>
      </div>
    </div>

    <!-- Phase: Nothing left to record. The optimizer prunes already-recorded
         items, so a second press of the test-batch button after that sample is
         done returns a valid script with zero items. Without its own phase that
         landed in script-loaded showing "0 / 0" behind a live Begin Recording
         button. -->
    <div v-else-if="state.currentPhase === 'script-empty'" class="script-loaded-phase">
      <div class="script-summary">
        <h2>Nothing left to record</h2>
        <p class="script-instructions">
          <template v-if="state.scriptInfo?.maxSeed">
            Every item in this quick sample has already been recorded for this
            voice. Start the full run to carry on with the rest of the course.
          </template>
          <template v-else>
            Every item in this course has already been recorded for this voice.
          </template>
        </p>
        <div class="script-actions">
          <button class="btn-cancel" @click="resetSession">Back</button>
        </div>
      </div>
    </div>

    <!-- Phase: Role Selection (regeneration mode only) -->
    <RoleSelector
      v-else-if="state.currentPhase === 'role-select'"
      :assigned-slot="effectiveSlot"
      :slot-options="slotOptions"
      :course-name="state.courseName"
      :known-language="state.knownLanguage"
      :target-language="state.targetLanguage"
      :phrase-count="totalPhrases || 12"
      @begin="onBeginSession"
      @back="resetSession"
    />

    <!-- Phase: Recording -->
    <div v-else-if="state.currentPhase === 'recording'" class="recording-phase">
      <!-- Pass Indicator -->
      <div class="pass-indicator">
        <div class="pass-info" v-if="!state.scriptMode">
          <span class="pass-label">Current Pass</span>
          <span class="pass-title">
            Pass {{ state.currentPass }}: {{ state.currentPass === 1 ? 'Natural Speed' : 'Slow with Gaps' }}
          </span>
        </div>
        <div class="pass-info" v-else>
          <span class="pass-label">Continuous Recording</span>
          <span class="pass-title">
            {{ currentPhrase?.cadence === 'slow' ? 'Slow Pass' : 'Natural Speed' }}
            — {{ itemTypeLabel }}
          </span>
        </div>
        <span class="pass-progress">
          Item {{ state.currentPhraseIndex + 1 }} / {{ totalPhrases }}
        </span>
      </div>

      <!-- ON AIR. One panel for the WHOLE session, deliberately outside every
           per-take condition: the stream is live from startFlow and the lamp
           says so continuously, including while the room is being measured and
           in the gaps between takes. The recordist could previously see nothing
           that told them the mic was hot, which is how Sascha read 34 takes
           into a recorder they had no confirmation was hearing them. -->
      <OnAirMeter
        v-if="state.scriptMode && state.isRecording"
        :level="vadLevel"
        :live="state.isRecording"
        :calibrating="isCalibrating"
        :speaking="isSpeaking"
      />

      <div
        v-if="state.scriptMode && calibrationWarning"
        class="vad-noise-warning"
        :class="`quality-${calibration.quality}`"
      >
        <strong>{{ calibration.quality === 'too-loud' ? 'Too noisy to record' : 'Background noise' }}</strong>
        <span>{{ calibration.message }}</span>
      </div>

      <!-- The old thin level bar and its "Speaking.../Listening..." caption
           lived here. Both are now inside OnAirMeter above, which runs for the
           whole session instead of only between calibration and the end. Two
           meters saying the same thing in different places would have made the
           on-air signal weaker, not stronger. -->

      <!-- A re-record pass looks exactly like a first pass on screen, except
           the script is three items long and out of order. Say which pass this
           is, or the recordist reads the jump as the teleprompter losing its
           place. -->
      <div v-if="retakeProgress" class="retake-banner">
        <svg class="retake-flag" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V4s-1 1-4 1-5-2-8-2-4 1-4 1z" /><path d="M4 22v-7" /></svg>
        Re-recording flagged takes — {{ retakeProgress.current }} of {{ retakeProgress.total }}
      </div>

      <!-- A slow read whose pauses did not come out right. Sits ABOVE the
           teleprompter deliberately: it must be the thing the eye lands on. -->
      <SlowReadRetry
        v-if="slowReadRetry"
        :expected="slowReadRetry.expected"
        :detected="slowReadRetry.detected"
        :short-pauses="slowReadRetry.shortPauses"
        :threshold-ms="slowReadRetry.thresholdMs"
        :attempts="slowReadRetry.attempts"
        @again="dismissSlowReadRetry"
        @keep="keepRefusedTake"
        @skip="skipRefusedTake"
      />

      <!-- A take the TOOL ended, rather than one the recordist finished.
           Silence about this is what made Sascha rush on 2026-08-19: the
           autocue moved on identically either way, so the only thing they could
           infer from being cut off was that they were reading too slowly. -->
      <div v-if="cutOffNotice" class="cut-off-notice" role="status">
        <strong>We stopped that take early — that one is on us, not you.</strong>
        <p>
          The recorder thought you had finished and cut in while you were still
          reading. <strong>We have stayed on this line</strong> — read it again
          from the start, at your natural pace. There is no need to hurry.
        </p>
        <div class="cut-off-actions">
          <button type="button" class="cut-off-primary" @click="cutOffNotice = null">
            Read it again
          </button>
          <button type="button" class="cut-off-secondary" @click="acceptHeldTake">
            That take was fine — move on
          </button>
        </div>
      </div>

      <!-- Live chunk progression, while the phrase is being read. -->
      <ChunkProgress
        v-if="state.scriptMode && state.isRecording && !isCalibrating && expectedChunks > 1 && !slowReadRetry"
        :expected="expectedChunks"
        :done="chunksSeen"
        :silence-ms="silenceMs"
        :threshold-ms="chunkPauseMs"
      />

      <!-- Teleprompter -->
      <TeleprompterDisplay
        :phrases="state.phrases"
        :current-index="state.currentPhraseIndex"
        :current-pass="state.currentPass"
        :is-recording="state.isRecording"
        :script-mode="state.scriptMode"
        :uploaded-indices="uploadQueue.uploadedIndices"
      />

      <!-- What Back just did. Said out loud because the two meanings of one
           button are otherwise indistinguishable from the outside: a restart
           leaves the screen looking exactly as it did a moment ago. ABOVE the
           controls, not below them: on Kai's 390px phone the row of buttons is
           a full screen tall, and a line under it is a line nobody reads. -->
      <p v-if="backNote" class="back-note" role="status">{{ backNote }}</p>

      <!-- Controls -->
      <RecordingControls
        :is-recording="state.isRecording"
        :is-paused="state.isPaused"
        @toggle-recording="onToggleRecording"
        @pause="togglePause"
        :back-restarts-take="true"
        @previous="backTap.tap()"
        @next="navigatePhrase(1)"
        @slower="adjustSpeed(-1)"
        @faster="adjustSpeed(1)"
      />


      <!-- Upload progress bar (script mode) -->
      <!-- (styles for .retake-banner live with the other in-session bars) -->
      <div v-if="state.scriptMode && uploadQueue.pendingCount.value > 0" class="upload-progress-bar">
        <span class="upload-label">Uploading: {{ uploadQueue.uploadedCount.value }} done, {{ uploadQueue.pendingCount.value }} pending</span>
      </div>

      <!-- Failed takes, DURING the session. Waiting for the summary screen means a
           recordist can talk through a whole script with a dead mic and only find
           out at the end — the takes were never saved and there is nothing to retry. -->
      <div v-if="state.scriptMode && uploadQueue.failedIndices.size > 0" class="upload-failed-bar">
        <span class="failed-count">{{ uploadQueue.failedIndices.size }} NOT saved</span>
        <span class="failed-reason">{{ latestFailureReason }}</span>
      </div>

      <!-- Saved but NOT FILED as a clip. A separate bar from the one above
           because it is a separate thing: the recording is safe, but nothing
           exists that can play it to a learner. This is the failure that lost
           2026-08-19 in total silence — it must never be silent again. -->
      <div v-if="state.scriptMode && unfiledItems.length" class="upload-unfiled-bar">
        <span class="failed-count">{{ unfiledItems.length }} saved but NOT filed as a clip</span>
        <span class="failed-reason">{{ unfiledItems[unfiledItems.length - 1].reason }}</span>
      </div>
    </div>

    <!-- Phase: Session Summary (script mode) -->
    <div v-else-if="state.currentPhase === 'summary'" class="summary-phase">
      <div class="summary-card">
        <h2>Session Complete</h2>
        <div class="summary-stats">
          <div class="summary-stat">
            <span class="summary-value">{{ recordedCount }}</span>
            <span class="summary-label">Items Recorded</span>
          </div>
          <div class="summary-stat">
            <span class="summary-value">{{ totalPhrases }}</span>
            <span class="summary-label">Total Items</span>
          </div>
          <div class="summary-stat">
            <span class="summary-value">{{ uploadQueue.uploadedCount.value }}</span>
            <span class="summary-label">Uploaded</span>
          </div>
          <div class="summary-stat" v-if="uploadQueue.pendingCount.value > 0">
            <span class="summary-value pending">{{ uploadQueue.pendingCount.value }}</span>
            <span class="summary-label">Uploading...</span>
          </div>
          <div class="summary-stat" v-if="uploadQueue.failedIndices.size > 0">
            <span class="summary-value failed">{{ uploadQueue.failedIndices.size }}</span>
            <span class="summary-label">Failed</span>
          </div>
        </div>
        <!-- A bare red "1 Failed" reads as a system fault on a session the
             recordist knows went fine. The server already says WHY each take
             was refused ("no audible speech…"); say it here, per item, so the
             recordist knows whether anything needs recording again. -->
        <div v-if="failedItems.length" class="summary-failures">
          <p class="summary-failures-title">
            {{ failedItems.length }} take{{ failedItems.length === 1 ? '' : 's' }} not saved:
          </p>
          <ul>
            <li v-for="f in failedItems" :key="f.index">
              <strong>Item {{ f.index + 1 }}</strong>
              <span v-if="f.text"> — “{{ f.text }}”</span>
              <span class="failed-why">{{ f.reason }}</span>
            </li>
          </ul>
        </div>

        <!-- Saved, but not filed. Named separately from "not saved" because the
             remedy is different: the recording exists and does not need doing
             again — someone has to fix why it could not be filed. -->
        <div v-if="unfiledItems.length" class="summary-failures summary-unfiled">
          <p class="summary-failures-title">
            {{ unfiledItems.length }} take{{ unfiledItems.length === 1 ? '' : 's' }} saved but NOT filed as a clip:
          </p>
          <ul>
            <li v-for="u in unfiledItems" :key="u.index">
              <strong>Item {{ u.index + 1 }}</strong>
              <span v-if="u.text"> — “{{ u.text }}”</span>
              <span class="failed-why">{{ u.reason }}</span>
            </li>
          </ul>
        </div>

        <div class="summary-time">
          <span>Session time: {{ formattedTime }}</span>
        </div>
        <div class="summary-actions">
          <button class="btn-review" @click="goToReview">Review Recordings</button>
          <button class="btn-done" @click="resetSession">Done</button>
        </div>
      </div>
    </div>

    <!-- Phase: Review -->
    <div v-else-if="state.currentPhase === 'review'" class="review-phase">
      <SessionReview
        :playback-sources="playbackSources"
        :segments="state.recordedSegments"
        :playing-segment-id="state.playingSegmentId"
        :playing-chunk-key="state.playingChunkKey"
        :approved-ids="[...state.approvedSegments]"
        :rejected-ids="[...state.rejectedSegments]"
        :active-filter="state.reviewFilter"
        :script-mode="state.scriptMode"
        @re-record-flagged="onReRecordFlagged"
        @play="playSegment"
        @play-chunk="playChunk"
        @play-all="playAllSegments"
        @approve="approveSegment"
        @reject="rejectSegment"
        @approve-all="approveAllUnflagged"
        @queue-redo="queueRedoFlagged"
        @filter="setReviewFilter"
        @clear-filter="clearReviewFilter"
        @finalize="finalizeSession"
        @back="backToRecording"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAutocueState } from '@/composables/useAutocueState'
import { useContinuousRecorder } from '@/composables/useContinuousRecorder'
import { useUploadQueue } from '@/composables/useAudioUpload'
import { useAuth } from '@/composables/useAuth'
import { getApiUrl } from '@/services/api'
import { legoChunkCount, resolvePhraseChunks } from '@/utils/phraseChunks'
import { buildTakeChunks } from '@/utils/takeChunks'
import {
  resolveAssignedSlot,
  humanVoiceIdForSlot,
  slotVoiceName,
  slotLabel,
  recordableSlotOptions
} from '@/utils/voiceSlots'

import ModeSelector from './ModeSelector.vue'
import OnAirMeter from './OnAirMeter.vue'
import RoleSelector from './RoleSelector.vue'
import TeleprompterDisplay from './teleprompter/TeleprompterDisplay.vue'
import RecordingControls from './recording/RecordingControls.vue'
import RecordingStatus from './recording/RecordingStatus.vue'
import ChunkProgress from './recording/ChunkProgress.vue'
import SlowReadRetry from './recording/SlowReadRetry.vue'
import { createAdvanceGate, HELD_CUT_OFF } from './advanceGate'
import { createBackTap } from './backTap'
import SessionReview from './review/SessionReview.vue'

// Recording identity, threaded in by the Record Room shell. Absent when
// mounted from the production console (/production/:courseCode/recording) —
// there the studio resolves it ITSELF from the course's cast plus the signed-in
// user (see loadVoiceIdentity). It used to fall back to a bare target1 default,
// so a recordist cast as voice 2 recorded, invisibly, as voice 1.
const props = defineProps({
  recordSlot: { type: String, default: null }, // 'known' | 'target1' | 'target2' | 'presentation'
  voiceId: { type: String, default: null }     // human voice id from courses.voice_config
})

const route = useRoute()
const { learner } = useAuth()

// Breadcrumb labels. Presentation only — `phaseCrumb` is null on the
// mode-choice page itself, which is what makes the "Recording" crumb turn into
// a link back to it from every other phase.
const courseCode = computed(() => route.params.courseCode || null)
// Only the /production/:courseCode/recording route gets the trail — see the
// note beside the <nav>. RecordRoom mounts this same component behind a public
// link and supplies its own exit.
const showCrumbs = computed(() => route.name === 'AutocueStudioCourse')
const courseCrumb = computed(() => state.courseName || courseCode.value || 'Course')
const PHASE_CRUMBS = {
  loading: 'Preparing',
  'script-loaded': 'Recording script',
  'script-empty': 'Nothing left to record',
  'role-select': 'Your voice',
  recording: 'Reading',
  summary: 'Session summary',
  review: 'Review takes'
}
const phaseCrumb = computed(() => PHASE_CRUMBS[state.currentPhase] || null)

// Use shared autocue state
const {
  state,
  // Was missing from this list, so the script-mode header's
  // `currentPhrase?.cadence` read undefined and the pass title said
  // "Natural Speed" right through the slow passes too.
  currentPhrase,
  totalPhrases,
  recordedCount,
  completionPercent,
  sessionInfo,
  formattedTime,
  setRecordingIdentity,
  setMaxSeed,
  setScriptOrder,
  selectMode,
  beginSession,
  beginContinuousSession,
  toggleRecording,
  startRecording,
  stopRecording,
  togglePause,
  navigatePhrase,
  restartCurrentTake,
  adjustSpeed,
  onSegmentCaptured,
  advanceToNext,
  approveSegment,
  rejectSegment,
  playSegment,
  segmentPlayback,
  setStoredClip,
  playChunk,
  playAllSegments,
  stopPlayback,
  approveAllUnflagged,
  queueRedoFlagged,
  setReviewFilter,
  clearReviewFilter,
  backToRecording,
  startRetakePass,
  retakeProgress,
  finalizeSession,
  resetSession,
  loadCourse,
  cleanup
} = useAutocueState()

// ── Who am I recording as? ───────────────────────────────────────────────────
// The course's cast (courses.voice_config.voices) is the canonical record of
// which person holds which voice slot. The Record Room resolves it and hands
// it down; the production-console mount resolves it here from the same data,
// so both agree instead of one of them guessing voice 1.
const courseVoiceConfig = ref(null)
const voiceConfigLoaded = ref(false)

const resolvedSlot = computed(() => resolveAssignedSlot(courseVoiceConfig.value, {
  email: learner.value?.email || null,
  voiceId: learner.value?.voice_id || null
}))

// The prop wins (the Record Room already resolved it against the same config);
// otherwise this mount's own resolution.
const effectiveSlot = computed(() => props.recordSlot || resolvedSlot.value || null)

// Only ever a HUMAN voice id — a slot still holding its TTS voice lends
// nothing, or the take would claim a synthetic voice sang it.
const effectiveVoiceId = computed(() =>
  props.voiceId || humanVoiceIdForSlot(courseVoiceConfig.value, effectiveSlot.value)
)

const recordingAs = computed(() => {
  const slot = effectiveSlot.value
  if (!slot) return null
  const languages = { targetLanguage: state.targetLanguage, knownLanguage: state.knownLanguage }
  const voiceName = slotVoiceName(courseVoiceConfig.value, slot)
    || props.voiceId
    || learner.value?.name
    || learner.value?.email
  return { label: slotLabel(slot, languages), voiceName }
})

// How many lines this voice already has in the can for this course. null means
// the server could not compute it — shown as a dash, never as 0, because "0"
// here is the exact false statement this stat exists to prevent.
const alreadyRecordedDisplay = computed(() => {
  const n = state.scriptInfo?.alreadyRecorded
  return (typeof n === 'number' && Number.isFinite(n)) ? n : '—'
})

const slotOptions = computed(() => recordableSlotOptions(courseVoiceConfig.value, {
  targetLanguage: state.targetLanguage,
  knownLanguage: state.knownLanguage
}))

async function loadVoiceIdentity(courseCode) {
  if (!courseCode) { voiceConfigLoaded.value = true; return }
  try {
    const base = localStorage.getItem('api_base_url') || getApiUrl()
    const res = await fetch(`${base}/api/courses/${courseCode}/voice-config`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    if (res.ok) {
      const data = await res.json()
      courseVoiceConfig.value = data.config || null
    }
  } catch {
    // Non-fatal: the banner just says nothing, and the session records
    // unattributed rather than under someone else's voice.
  }
  voiceConfigLoaded.value = true
  setRecordingIdentity({ role: effectiveSlot.value, voiceId: effectiveVoiceId.value })
}

// Continuous recorder for script mode
const continuousRecorder = useContinuousRecorder({
  silenceThreshold: 0.02,
  silenceDuration: 800,
  minSpeechDuration: 300,
  autoUpload: true,
  autoAdvance: true
})

const isSpeaking = continuousRecorder.isSpeaking
const vadLevel = continuousRecorder.currentLevel

// vadLevel is a time-domain RMS, so speech measures ~0.2-0.4. The x300 scaling
// that turns it into something visible now lives in OnAirMeter, next to the
// segments it drives. The DECISION still uses the raw value against
// silenceThreshold — see useVAD.ts.

// Live pause signals. useVAD has counted chunksSeen since the slow-cadence fix
// landed; nothing ever showed it to the person doing the reading.
const chunksSeen = continuousRecorder.chunksSeen
const silenceMs = continuousRecorder.silenceMs
const chunkPauseMs = continuousRecorder.chunkPauseMs()

const isCalibrating = continuousRecorder.isCalibrating
const calibration = continuousRecorder.calibration
// Only surface the room measurement when it is bad news. "Nice and quiet" is
// one more thing to read on a screen the recordist is trying to read a script off.
const calibrationWarning = computed(() =>
  calibration.value?.quality === 'loud' || calibration.value?.quality === 'too-loud'
)

// How many LEGO chunks the phrase on the autocue right now is read in.
//
// Only a SLOW phrase gets a chunk count above 1, because only the slow pass
// draws the gap markers (see TeleprompterDisplay's :show-gaps). A natural-speed
// phrase is read straight through, so it stays at 1 and keeps the snappy 800ms
// cut-off exactly as before — the longer tolerance is scoped to the phrases
// that actually ask the recordist to pause.
const expectedChunks = computed(() => {
  const phrase = currentPhrase.value
  if (!phrase || phrase.cadence !== 'slow') return 1
  return legoChunkCount(phrase)
})

// Push it to the recorder as the autocue advances. The recorder is long-lived
// across the whole session — a single startFlow() spans every phrase — so this
// has to be re-sent per phrase rather than set once at start.
watch(
  expectedChunks,
  (count) => continuousRecorder.setExpectedChunks(count),
  { immediate: true }
)

// The session can end without anyone pressing Stop: capturing the last item
// auto-advances off the end of the script, which calls stopRecording() and
// lands on the summary screen — where there is no Stop button left to press.
// The continuous recorder was left live through all of that, mic open and VAD
// listening, so any noise in the room started another capture against the LAST
// item: a duplicate take of it if long enough, a 422-refused phantom if not.
// Whatever ends the session ends the recorder with it.
watch(
  () => state.isRecording,
  (recording) => {
    if (!recording && continuousRecorder.isFlowMode.value) {
      continuousRecorder.stopFlow()
    }
  }
)

// Background upload queue
const uploadQueue = useUploadQueue()
const uploadedCount = uploadQueue.uploadedCount

// The server's own words for the most recent take it refused (e.g. "no audible
// speech"), so the in-session failure bar says WHY, not just how many.
// Every refused take, with the item it belonged to and the server's reason —
// read by the summary screen.
const failedItems = computed(() =>
  [...uploadQueue.failedIndices]
    .sort((a, b) => a - b)
    .map(index => ({
      index,
      text: state.phrases[index]?.text || '',
      reason: uploadQueue.failedReasons.get(index) || 'Upload failed'
    }))
)

// Takes that UPLOADED but were not filed as a clip — a 200 that is not a
// success. Same shape as failedItems so both bars and both summary lists read
// alike, but kept separate because the remedy differs: a failed take must be
// recorded again, an unfiled one already exists and needs someone to fix the
// filing.
const unfiledItems = computed(() =>
  [...uploadQueue.filingWarnings.keys()]
    .sort((a, b) => a - b)
    .map(index => ({
      index,
      text: state.phrases[index]?.text || '',
      reason: uploadQueue.filingWarnings.get(index) || 'This take was saved but not filed as a clip.'
    }))
)

// What the recordist is looking at. The course-order script reads real course
// items, so it can say which kind; the coverage script only ever had phrases
// and single-LEGO direct items, and still says exactly what it always did.
const ITEM_TYPE_LABELS = {
  seed: 'Seed sentence',
  lego: 'LEGO',
  phrase: 'Phrase',
  direct: 'Direct Item'
}
const itemTypeLabel = computed(() => ITEM_TYPE_LABELS[currentPhrase.value?.type] || 'Phrase')

const latestFailureReason = computed(() => {
  let latest = null
  for (const idx of uploadQueue.failedIndices) {
    if (latest === null || idx > latest) latest = idx
  }
  return latest === null ? '' : (uploadQueue.failedReasons.get(latest) || 'Upload failed')
})

// The stored clip's identity, back from the upload queue. Until this landed,
// the review screen could only ever play the RAW LOCAL blob — a preview that
// sounds perfect no matter what the server's trim chain did to the bytes that
// were actually kept. Now an uploaded take plays from the server.
uploadQueue.onUploaded((itemIndex, result) => {
  const phrase = state.phrases[itemIndex]
  if (phrase && result?.uuid) setStoredClip(phrase.id, result.uuid)
})

// segmentId -> 'stored' | 'local', so each card can say which bytes its play
// button fetches rather than leaving the recordist to guess.
const playbackSources = computed(() => {
  const map = {}
  for (const seg of state.recordedSegments) {
    map[seg.id] = segmentPlayback(seg).source
  }
  return map
})

// ── Did the slow read come out with the right pauses? ───────────────────────
//
// A slow pass exists to be CUT into its LEGO pieces, and the cut is made on the
// pauses. If they are not there, the take cannot be cut — services/voice-engine
// /align.cjs refuses it outright ("chunk-count mismatch"), by design, rather
// than guessing a chunk map. Until now the studio filed such a take anyway,
// ticked the line green and advanced, so the refusal happened hours later on a
// server the recordist will never see. Kai, recording on 2026-08-19: "it would
// be better to prompt the recorder for the slow phrase again if it does not get
// the gaps right, rather than carrying on - do not just mark it green."
//
// The maths is buildTakeChunks — the SAME function the review screen's ⚠ badge
// uses, so the in-session verdict and the after-the-fact one can never disagree.
function judgeSlowTake(segment, phrase) {
  if (!phrase || phrase.cadence !== 'slow') return { ok: true }
  const expected = legoChunkCount(phrase)
  // One piece is not a slow read with pauses in it — nothing to get wrong.
  if (expected < 2) return { ok: true }

  const built = buildTakeChunks({
    gaps: segment.chunkGaps || [],
    durationMs: segment.durationMs ?? 0,
    chunkTexts: resolvePhraseChunks(phrase).chunks.map(c => c.text)
  })

  return {
    ok: built.matchesScript,
    expected: built.expected,
    detected: built.detected,
    shortPauses: segment.pauses?.shortPauses ?? 0,
    thresholdMs: chunkPauseMs
  }
}

// A take that was ended while the recordist was still audibly speaking, or one
// they carried on talking through. The take is still filed: it may be perfectly
// usable, and throwing away a recordist's work on a heuristic is worse than
// keeping it. What changes is that the autocue does NOT move on, and they are
// TOLD, so a truncation reads as a tool fault rather than as a hint to speed up.
const cutOffNotice = ref(null)

// Closing a take and moving the script on are two decisions, not one. The gate
// owns the second: it never advances immediately, and it refuses outright on a
// take the VAD admits it cut short. The whole argument is in advanceGate.js.
const advanceGate = createAdvanceGate({
  advance: (itemIndex) => {
    // Only move if the line the take belonged to is still the current one — a
    // manual navigation while the advance was armed wins over a stale timer.
    if (state.currentPhraseIndex === itemIndex) advanceToNext()
  },
  onHold: (held) => { cutOffNotice.value = held }
})

// "That take was fine — move on." The only path that advances a held line
// without a re-read, and it is the recordist's own decision, not ours.
function acceptHeldTake() {
  cutOffNotice.value = null
  advanceGate.releaseHold()
}

// The take now being refused, and the panel driven by it. Null when there is
// nothing to answer for.
const slowReadRetry = ref(null)
// Refusals per item index, so the escape hatches (keep-anyway / skip) appear
// only after the recordist has genuinely tried again rather than on the first
// stumble. Kai: "Do not block them for ever" — but the DEFAULT is re-record.
// Plain Map, not a ref: it is only ever read at capture time and the count it
// feeds is copied into slowReadRetry, which IS reactive.
const slowReadAttempts = new Map()

// A refused take is held here, not filed. It is not stored in recordedSegments
// and not queued for upload, so the line does not tick green and nothing
// unusable reaches the server unless the recordist explicitly keeps it.
let refusedSegment = null

function fileTake(segment, itemIndex) {
  const phrase = state.phrases[itemIndex]
  if (!phrase) return
  onSegmentCaptured(segment, itemIndex)
  queueTakeUpload(segment, phrase, itemIndex)
  // ARM the advance; do not perform it. See advanceGate.js — this is the line
  // that used to be advanceToNext(), and making it unconditional is what turned
  // every VAD misjudgement into a mislabelled clip and a rattled recordist.
  advanceGate.takeEnded(itemIndex, segment.pauses)
}

function clearSlowReadRetry() {
  slowReadRetry.value = null
  refusedSegment = null
}

// "Record it again" — just clear the panel. The recorder never stopped
// listening and the autocue never moved, so reading the line again is the whole
// interaction.
function dismissSlowReadRetry() {
  clearSlowReadRetry()
}

// ── Back: one tap restarts, two taps go back ─────────────────────────────────
// Back used to skip to the previous take on the very first press. The argument
// for the media-player convention, and the tap window, are in backTap.js.
const backNote = ref(null)
let backNoteTimer = null

function sayBack(text) {
  backNote.value = text
  if (backNoteTimer) clearTimeout(backNoteTimer)
  backNoteTimer = text ? setTimeout(() => { backNote.value = null }, 4000) : null
}

const backTap = createBackTap({
  onRestart: () => {
    // Both of these panels are about the read now being abandoned. Left up,
    // they would ask the recordist to answer for a take that no longer exists.
    cutOffNotice.value = null
    clearSlowReadRetry()
    sayBack(restartCurrentTake()
      // Queue mode: the open capture really was binned.
      ? 'Take it from the top — that take is discarded. Tap Back again for the previous line.'
      // Script mode: nothing was thrown away, the line simply stayed put and
      // the next read supersedes. Saying "discarded" there would be a lie.
      : 'Staying on this line — read it again from the start. Tap Back again for the previous line.')
  },
  onPrevious: () => {
    navigatePhrase(-1)
    sayBack(null)
  }
})

function keepRefusedTake() {
  const held = refusedSegment
  const itemIndex = slowReadRetry.value?.itemIndex
  clearSlowReadRetry()
  if (held && Number.isInteger(itemIndex)) fileTake(held, itemIndex)
}

function skipRefusedTake() {
  clearSlowReadRetry()
  advanceToNext()
}

// The moment they start reading again, get the panel out of the way — it has
// said what it had to say and the script underneath it is what they need now.
watch(
  () => continuousRecorder.isCapturing.value,
  (capturing) => {
    if (!capturing) return
    if (slowReadRetry.value) clearSlowReadRetry()

    // Speech, while an advance was armed. They never finished — the take we
    // just closed was cut out from under them, and what they are saying now
    // belongs to the line still on screen. The gate cancels the advance and
    // raises its own notice, which must NOT be wiped by the line below.
    if (advanceGate.speechStarted() === 'cancelled') return

    // Otherwise: reading again is the answer to "we cut you off".
    cutOffNotice.value = null
  }
)

// Leaving the line, or leaving the session, takes the refusal with it — it is
// about ONE take of ONE line and must never outlive either.
watch(() => state.currentPhraseIndex, () => {
  if (slowReadRetry.value) clearSlowReadRetry()
  // The line moved (by the gate, or by hand). A hold is about ONE take of ONE
  // line and must never outlive it, and an armed advance for a line we have
  // already left must never fire.
  advanceGate.clearHold()
  cutOffNotice.value = null
})
watch(() => state.currentPhase, () => {
  if (slowReadRetry.value) clearSlowReadRetry()
  slowReadAttempts.clear()
  advanceGate.reset()
  cutOffNotice.value = null
})

// Wire continuous recorder: on segment captured, store + queue upload + advance
continuousRecorder.onSegmentCaptured((segment) => {
  const itemIndex = state.currentPhraseIndex
  const phrase = state.phrases[itemIndex]
  if (!phrase) return

  // Say it out loud when we cut them off. Checked before anything else so the
  // notice shows whether the take goes on to be filed or refused — a take
  // refused for its pauses never reaches the gate, so this is its only chance.
  cutOffNotice.value = segment.pauses?.endedWhileLoud
    ? { itemIndex, reason: HELD_CUT_OFF, dropDb: segment.pauses.dropAtCutDb }
    : null

  const verdict = judgeSlowTake(segment, phrase)
  if (!verdict.ok) {
    const attempts = (slowReadAttempts.get(itemIndex) || 0) + 1
    slowReadAttempts.set(itemIndex, attempts)
    refusedSegment = segment
    slowReadRetry.value = { ...verdict, itemIndex, attempts }
    console.warn(
      `[Autocue] Slow read refused for item ${itemIndex}: heard ${verdict.detected} pieces, script has ${verdict.expected}`
    )
    // No store, no upload, no advance. The line stays current and ungreen.
    return
  }

  fileTake(segment, itemIndex)
})

// Queue background upload — script-mode takes carry the script's identity
// (seedNumber/legoId/text); the server mints the audio uuid per take.
//
// Lifted out of the capture callback unchanged so that a take REFUSED for its
// pauses can be filed later, byte for byte, if the recordist keeps it anyway.
// Nothing about what gets uploaded changed — only when.
function queueTakeUpload(segment, phrase, itemIndex) {
  uploadQueue.queueUpload({
    blob: segment.blob,
    courseCode: state.courseCode,
    uuid: null,
    metadata: {
      mode: 'script',
      role: state.selectedRole || 'target1',
      voiceId: state.voiceId || null,
      cadence: phrase.cadence,
      text: phrase.text,
      type: phrase.type,
      // The course row this line IS, when the script is the course itself.
      // The server attaches the filed clip to this exact item.
      itemKind: phrase.itemKind || null,
      itemId: phrase.itemId || null,
      phraseIndex: phrase.phraseIndex,
      seedNumber: phrase.seedNumber ?? null,
      legoId: phrase.legoId || null,
      coversLegos: phrase.coversLegos,
      // Pipe-delimited pause map — the aligner's required input; persisted
      // server-side with the take so slow passes stay alignable.
      chunksString: phrase.chunksString || null,
      // WHERE the recordist actually paused in this take, in ms from its start.
      // The browser hears these boundaries live and, until now, threw them away
      // the moment the take was cut — leaving the server-side aligner to
      // rediscover them with ffmpeg silencedetect (services/voice-engine/
      // align.cjs). They cost nothing to keep and they are the speaker's own
      // account of the cut, so they travel with the take.
      chunkBoundariesMs: segment.chunkGaps?.length ? segment.chunkGaps : null,
      scriptSessionId: state.scriptSessionId
    },
    provenance: {
      recorded_by: 'autocue-studio',
      recorded_at: new Date().toISOString(),
      session_id: state.scriptSessionId,
      mode: 'continuous',
      // The mic and browser this session captured on. The server already maps
      // and stores this field for the recordist surface; the script surface was
      // simply never sending it, which is why 154 archived takes could not say
      // what recorded them.
      recording_device: continuousRecorder.deviceLabel.value || null
    },
    itemIndex
  })
}

// Event handlers
function onModeSelect(mode, opts = {}) {
  // Re-establish the cap on every choice rather than relying on the value set
  // at mount: resetSession() clears it (singleton hygiene), so a recorder who
  // backs out of a session and picks again would otherwise silently lose the
  // link's ?maxSeed and start an uncapped run. Where both an explicit
  // opts.maxSeed (the test-batch button) and a link cap exist, the NARROWER one
  // wins — a recorder handed ?maxSeed=3 who presses "test batch" must not be
  // silently widened to 5.
  const caps = [opts.maxSeed, route.query.maxSeed]
    .map(v => parseInt(v, 10))
    .filter(n => Number.isInteger(n) && n > 0)
  setMaxSeed(caps.length ? Math.min(...caps) : null)
  // Same reason as the cap: resetSession() clears the reading order, so it has
  // to be re-read on every mode choice or a recorder who backs out and picks
  // again silently drops back to coverage order. The chooser's own value wins
  // over the link — it writes the link too, but router.replace lands a tick
  // later and the mode choice must not race it.
  setScriptOrder(opts.order ?? route.query.order)
  selectMode(mode)
}

function onBeginSession({ role, language }) {
  beginSession(role, language)
}

async function onBeginContinuous() {
  beginContinuousSession()
}

async function onToggleRecording() {
  if (state.isRecording) {
    // Stop. Pressing stop settles the question of where the script is — an
    // advance armed a moment ago must not fire into a stopped session and move
    // the line under the recordist after they walked away.
    advanceGate.reset()
    cutOffNotice.value = null
    // A half-finished double-tap must not survive the stop: a tap before it and
    // a tap after it are two separate presses, not a pair.
    backTap.reset()
    sayBack(null)
    if (state.scriptMode) {
      continuousRecorder.stopFlow()
    }
    stopRecording()
  } else {
    // Start
    startRecording()
    if (state.scriptMode) {
      try {
        await continuousRecorder.startFlow()
      } catch (err) {
        console.error('[Autocue] Failed to start continuous recorder:', err)
        state.error = err.message
        stopRecording()
      }
    }
  }
}

// Second pass: drop the recordist back on the teleprompter parked on the first
// flagged item. They press record as normal, and each new take goes down the
// same capture path as the first pass — which already supersedes the earlier
// take both locally (one row per item) and on the server (the queue drops the
// old take and re-POSTs the slot). Nothing new is needed on the receiving end.
function onReRecordFlagged() {
  if (!startRetakePass()) {
    console.warn('[Autocue] Re-record pressed with nothing flagged')
  }
}

function goToReview() {
  // Generate segments for review from script mode recordings
  state.currentPhase = 'review'
}

// Keyboard shortcuts
function handleKeydown(e) {
  if (state.currentPhase !== 'recording') return

  switch (e.key) {
    case ' ':
      e.preventDefault()
      onToggleRecording()
      break
    case 'ArrowLeft':
      e.preventDefault()
      backTap.tap()
      break
    case 'ArrowRight':
      e.preventDefault()
      navigatePhrase(1)
      break
    case 'ArrowUp':
      e.preventDefault()
      adjustSpeed(-1)
      break
    case 'ArrowDown':
      e.preventDefault()
      adjustSpeed(1)
      break
    case 'p':
    case 'P':
      togglePause()
      break
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)

  // Autocue state is a module-level singleton (shared across mounts), so a
  // mode/role picked in a previous visit otherwise leaks into this one and
  // strands the learner on role-select/script-loaded with no way back to
  // the chooser. Every fresh mount re-enters at the chooser.
  resetSession()

  // Bind (or clear) the session's voice-slot identity on every mount so a
  // Record Room session never leaks into a production-console session. The
  // props are provisional: loadVoiceIdentity() re-binds once the course's cast
  // is in, which is what gives a console mount the recordist's real slot.
  setRecordingIdentity({ role: props.recordSlot, voiceId: props.voiceId })

  // ?maxSeed=N on the recorder link caps the script to seeds 1..N — used to
  // hand a tester a short, listenable session instead of the whole course.
  // Set after resetSession() so it survives the mount-time reset.
  setMaxSeed(route.query.maxSeed)

  // ?order=course on the recorder link reads the same script lines in course
  // sequence instead of coverage order — a straight-through weekend session
  // that finishes the START of the course first. Absent = coverage, unchanged.
  setScriptOrder(route.query.order)

  // Load course data if available from route
  const courseCode = route.params.courseCode
  if (courseCode) {
    loadCourse(courseCode)
    loadVoiceIdentity(courseCode)
  } else {
    voiceConfigLoaded.value = true
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  // An armed advance must not fire into a torn-down session.
  advanceGate.reset()
  if (continuousRecorder.isFlowMode.value) {
    continuousRecorder.stopFlow()
  }
  uploadQueue.resetQueue()
  stopPlayback()
  cleanup()
})
</script>

<style scoped>
.autocue-studio {
  min-height: 100vh;
  /* Same blue-grey panel background as the rest of the shell — this page
     introduces no backdrop of its own. */
  background: var(--canvas);
  color: var(--ink);
  padding: 2rem;
}

/* House breadcrumbs — same markup and same colours as ConfigsIndex/BasketLab. */
.admin-crumbs { display: flex; align-items: center; flex-wrap: wrap; gap: 0.5rem; font-size: 0.8125rem; margin-bottom: 0.75rem; }
.admin-crumbs .crumb-link { color: var(--accent-2); text-decoration: none; }
.admin-crumbs .crumb-sep { color: var(--surface-3); }
.admin-crumbs .crumb-here { color: var(--muted); }
/* The one crumb that is a control rather than a route: it drops the session
   back to the mode-choice page. Styled to be indistinguishable from its
   neighbours, because to the recordist it is the same gesture. */
.crumb-back {
  font: inherit;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}

/* House icon frame: 44px raised square, 1px line, 22px stroke-1.5 glyph. */
.icon-frame {
  width: 44px;
  height: 44px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 10px;
  color: var(--accent-2);
}

.icon-frame svg { width: 22px; height: 22px; }

/* Header */
.studio-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--line);
}

.studio-branding {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.studio-meta h1 {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--ink);
  margin: 0;
}

.session-info {
  font-size: 0.875rem;
  color: var(--muted);
  margin: 0.125rem 0 0;
}

.recording-as {
  font-size: 0.8125rem;
  color: var(--muted);
  margin: 0.25rem 0 0;
}

.recording-as strong { color: var(--ink); }

.recording-as-slot {
  color: var(--faint);
  margin-left: 0.35rem;
}

.recording-as-none {
  color: var(--accent);
  max-width: 34rem;
}

.session-stats {
  display: flex;
  gap: 0.75rem;
}

/* Raised tile — same recipe as an inner panel anywhere else on the estate. */
.stat-item {
  text-align: center;
  padding: 0.75rem 1.25rem;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 10px;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--ink);
  display: block;
  line-height: 1;
}

/* Micro-label under a number — the one place the house keeps small caps
   (hub.css .section-label). */
.stat-label {
  font-size: 0.7rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-top: 0.5rem;
  display: block;
}

/* Loading Phase */
.loading-phase {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 3px solid var(--line);
  border-top-color: var(--accent-2);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.loading-text {
  color: var(--muted);
  margin-top: 1.5rem;
}

/* Surfaces a script-load failure above the mode buttons, which otherwise
   just look unresponsive. */
.mode-error {
  max-width: 600px;
  margin: 0 auto 1.5rem;
  padding: 0.875rem 1.25rem;
  border: 1px solid var(--danger);
  border-radius: 12px;
  background: color-mix(in srgb, var(--danger) 12%, var(--surface));
  color: var(--danger);
  font-size: 0.875rem;
  text-align: center;
}

.script-cap-note {
  font-size: 0.875rem;
  line-height: 1.6;
  color: var(--muted);
  margin: -1.25rem 0 1.75rem 0;
}

/* Script Loaded Phase */
.script-loaded-phase {
  display: flex;
  justify-content: center;
}

.script-summary {
  max-width: 600px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 2rem;
  text-align: center;
}

.script-summary h2 {
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--ink);
  margin: 0 0 1.5rem 0;
}

.script-stats {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  margin-bottom: 1.5rem;
}

.script-stat {
  text-align: center;
  padding: 1rem;
  background: var(--surface-2);
  border-radius: 10px;
  border: 1px solid var(--line);
  min-width: 80px;
}

.script-stat-value {
  font-size: 1.5rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--ink);
  display: block;
}

.script-stat-label {
  font-size: 0.7rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-top: 0.25rem;
  display: block;
}

.script-instructions {
  font-size: 0.875rem;
  color: var(--muted);
  line-height: 1.6;
  margin-bottom: 1.75rem;
}

.script-instructions strong { color: var(--ink); }

/* The teleprompter's own convention, restated: white is natural speed, amber
   is the slow pass. Same amber as the rest of the estate. */
.amber-text { color: var(--accent); }
.script-instructions strong.amber-text { color: var(--accent); }

.script-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  flex-wrap: wrap;
}

.btn-begin,
.btn-review,
.btn-done {
  font: inherit;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--canvas);
  background: var(--accent-2);
  border: 1px solid var(--accent-2);
  border-radius: 8px;
  padding: 0.75rem 1.5rem;
  min-height: 44px;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.btn-begin:hover,
.btn-review:hover,
.btn-done:hover { opacity: 0.88; }

/* Review is the quieter of the two end-of-session actions. */
.btn-review {
  color: var(--accent-2);
  background: transparent;
}

.btn-cancel {
  font: inherit;
  font-size: 0.9375rem;
  color: var(--muted);
  background: transparent;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 0.75rem 1.25rem;
  min-height: 44px;
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease;
}

.btn-cancel:hover {
  border-color: var(--muted);
  color: var(--ink);
}

/* Pass Indicator */
.pass-indicator {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 1rem 1.25rem;
  margin-bottom: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.pass-label {
  font-size: 0.7rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  display: block;
}

.pass-title {
  font-size: 1.0625rem;
  font-weight: 600;
  color: var(--ink);
}

.pass-progress {
  font-size: 0.9375rem;
  font-variant-numeric: tabular-nums;
  color: var(--muted);
}

/* The level bar, its caption and the calibration shell that matched it were
   replaced by OnAirMeter, which carries its own scoped styles. */

.vad-noise-warning {
  border-radius: 10px;
  padding: 0.625rem 1rem;
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  font-size: 0.8125rem;
  line-height: 1.4;
}

.vad-noise-warning strong { font-size: 0.875rem; font-weight: 600; }

.vad-noise-warning.quality-loud {
  background: color-mix(in srgb, var(--accent) 12%, var(--surface));
  border: 1px solid var(--accent);
  color: var(--accent);
}

.vad-noise-warning.quality-too-loud {
  background: color-mix(in srgb, var(--danger) 14%, var(--surface));
  border: 1px solid var(--danger);
  color: var(--danger);
}

/* In-session bars */
.retake-banner {
  margin-bottom: 1rem;
  padding: 0.625rem 1rem;
  background: color-mix(in srgb, var(--accent) 12%, var(--surface));
  border: 1px solid var(--accent);
  border-radius: 10px;
  text-align: center;
  font-size: 0.875rem;
  color: var(--accent);
}

.retake-flag {
  width: 15px;
  height: 15px;
  vertical-align: -0.2em;
  margin-right: 0.4rem;
}

/* Back's own feedback line. Quiet on purpose — it reports a navigation, not a
   fault, and the teleprompter must stay the loudest thing on screen. */
.back-note {
  margin: 0.6rem 0 0.2rem;
  text-align: center;
  font-size: 0.8125rem;
  color: var(--faint);
}

.upload-progress-bar {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 10px;
  text-align: center;
}

.upload-label {
  font-size: 0.8125rem;
  color: var(--muted);
}

.upload-failed-bar {
  margin-top: 0.5rem;
  padding: 0.625rem 1rem;
  background: color-mix(in srgb, var(--danger) 14%, var(--surface));
  border: 1px solid var(--danger);
  border-radius: 10px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

/* Saved-but-not-filed. Amber, not red: the recording is safe — what is wrong is
   downstream of it — so it must not read as "you lost that take". */
.upload-unfiled-bar {
  margin-top: 0.5rem;
  padding: 0.625rem 1rem;
  background: color-mix(in srgb, var(--accent) 14%, var(--surface));
  border: 1px solid var(--accent);
  border-radius: 10px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.upload-unfiled-bar .failed-count,
.upload-unfiled-bar .failed-reason {
  color: var(--accent);
}

.failed-count {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--danger);
}

.failed-reason {
  font-size: 0.8125rem;
  color: var(--danger);
  line-height: 1.4;
}

/* Recording Phase */
.recording-phase {
  max-width: 1000px;
  margin: 0 auto;
}

/* Summary Phase */
.summary-phase {
  display: flex;
  justify-content: center;
}

.summary-card {
  max-width: 600px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 2rem;
  text-align: center;
}

.summary-card h2 {
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--ink);
  margin: 0 0 1.5rem 0;
}

.summary-stats {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.summary-stat {
  text-align: center;
  padding: 1rem;
  background: var(--surface-2);
  border-radius: 10px;
  border: 1px solid var(--line);
  min-width: 80px;
}

.summary-value {
  font-size: 1.5rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--ink);
  display: block;
}

.summary-value.pending { color: var(--accent); }
.summary-value.failed { color: var(--danger); }

.summary-label {
  font-size: 0.7rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-top: 0.25rem;
  display: block;
}

.summary-failures {
  text-align: left;
  margin-bottom: 1.5rem;
  padding: 0.875rem 1rem;
  background: color-mix(in srgb, var(--danger) 10%, var(--surface));
  border: 1px solid var(--danger);
  border-radius: 12px;
}

.summary-unfiled {
  background: color-mix(in srgb, var(--accent) 10%, var(--surface));
  border-color: var(--accent);
}

.summary-unfiled .summary-failures-title,
.summary-unfiled .failed-why {
  color: var(--accent);
}

.summary-failures-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--danger);
  margin: 0 0 0.5rem 0;
}

.summary-failures ul {
  margin: 0;
  padding-left: 1.1rem;
  list-style: disc;
}

.summary-failures li {
  font-size: 0.8125rem;
  color: var(--muted);
  line-height: 1.5;
  margin-bottom: 0.4rem;
}

.summary-failures li strong { color: var(--ink); }

.summary-failures .failed-why {
  display: block;
  color: var(--faint);
}

.summary-time {
  font-size: 0.875rem;
  color: var(--muted);
  margin-bottom: 1.75rem;
}

.summary-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  flex-wrap: wrap;
}

/* "We stopped that take early" — the tool owning a cut it made. Amber, not red:
   nothing is broken and nothing is lost, but it must be impossible to miss on a
   phone held at arm's length while reading. */
.cut-off-notice {
  background: color-mix(in srgb, var(--accent) 14%, var(--surface));
  border: 1px solid var(--accent);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 0.75rem;
  color: var(--ink);
}
.cut-off-notice strong { display: block; font-size: 1rem; margin-bottom: 0.35rem; }
.cut-off-notice p { margin: 0 0 0.6rem; font-size: 0.9rem; line-height: 1.5; color: var(--muted); }
.cut-off-notice p strong { display: inline; color: var(--ink); }
.cut-off-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.cut-off-notice button {
  font: inherit;
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 0.5rem 1.1rem;
  font-weight: 600;
  min-height: 44px;
  cursor: pointer;
}
.cut-off-primary { background: var(--accent); color: var(--canvas); }
/* Moving on without a re-read is the recordist's call and nobody else's, so it
   is present but never the obvious button. */
.cut-off-secondary {
  background: transparent;
  color: var(--accent);
  border-color: var(--accent);
}

/* Review Phase */
.review-phase { position: relative; }

/* Responsive */
@media (max-width: 768px) {
  .studio-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .session-stats {
    width: 100%;
    justify-content: space-around;
    /* Four stat tiles at 1.25rem side padding and a large number measure more
       than a 390px phone; without wrapping the whole recording screen scrolled
       sideways. */
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .script-stats,
  .summary-stats {
    flex-wrap: wrap;
  }
}

/* Phone. Kai records standing, holding the phone — nothing here may need a
   sideways scroll to reach. */
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

  .script-summary,
  .summary-card {
    padding: 1.25rem;
  }
}
</style>
