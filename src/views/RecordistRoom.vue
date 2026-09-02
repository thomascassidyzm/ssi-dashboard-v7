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

      <!-- WHAT IS THE MACHINE DOING, IN WORDS. Never left to be inferred from a
           moving bar or a highlighted button: on a phone at arm's length "is
           this listening to me or playing something back at me?" has to be
           answered by reading, not by guessing. -->
      <p class="state-pill" :class="activityState.cls">{{ activityState.words }}</p>

      <RecordistRoster
        :rows="rosterRows"
        :playing-id="playingId"
        :editing-id="editingId"
        :saving="editSaving"
        :error="editError"
        @play="togglePlay"
        @record="recordOne"
        @edit="beginEdit"
        @cancel-edit="cancelEdit"
        @save="saveEdit($event.id, $event.text)"
      />

      <!-- Start is the FIRST thing on the card and the only thing needed. One
           tap puts the mic live on the first line that still needs reading —
           there is no line to pick, nothing to navigate to, and no second tap
           before recording is running. (The tap itself is not removable: a
           browser will not open a microphone without a user gesture.) -->
      <button class="btn-begin" :disabled="startIndex === -1" @click="begin">
        {{ startIndex === -1 ? 'Nothing left to read' : `Start recording — ${firstLinePreview}` }}
      </button>
      <p v-if="startIndex === -1" class="note done">Everything is recorded. Turn on "re-read" below to do another pass.</p>
      <p v-if="micError" class="note error">{{ micError }}</p>

      <ol class="how-to">
        <li>Tap <strong>Start</strong> and read the line aloud. It is already recording.</li>
        <!-- THIS STEP MUST MATCH THE SWITCH BELOW IT. It said "it moves on by
             itself" unconditionally, which is a lie whenever auto-advance is
             off — and then the reader finishes a line, waits for a page that is
             never going to move, and concludes the thing is broken. It is off
             by default on a script pack, and Aran can turn it off on his own
             page any time, so both readings have to be true. -->
        <li v-if="autoAdvance">Stop talking and it moves on by itself — you do not have to tap anything.</li>
        <li v-else>When you've finished the line, tap <strong>Next</strong>. Nothing cuts you off mid-sentence.</li>
        <li>Tap <strong>Again</strong> to re-read a line<span v-if="autoAdvance">, <strong>Next</strong> to push on early</span>.</li>
        <li>Tap <strong>Stop here</strong> when you've had enough. It saves itself.</li>
      </ol>

      <label class="toggle-row">
        <input type="checkbox" v-model="autoAdvance" />
        <span><strong>Move on by itself when I stop speaking</strong>
          <small>On = just read, and keep reading. Turn it off in a noisy room and use Next instead.</small></span>
      </label>

      <div v-if="recorder.devices.value.length > 1" class="mic-pick">
        <label class="mic-label">Microphone</label>
        <select v-model="selectedDeviceId" class="mic-select">
          <option v-for="(d, i) in recorder.devices.value" :key="d.deviceId" :value="d.deviceId">{{ d.label || `Microphone ${i + 1}` }}</option>
        </select>
      </div>

      <label class="toggle-row">
        <input type="checkbox" :checked="captureProfile === 'dry'"
               @change="captureProfile = $event.target.checked ? 'dry' : 'voice'" />
        <span><strong>Record the raw microphone</strong>
          <small>Off = the phone cleans up the sound as it records, the way a voice note does. Turn it on only to
            capture the room exactly as it is — it will sound quieter and rougher. It goes back off by itself
            next time you open this room.</small></span>
      </label>
      <p v-if="captureProfile === 'dry'" class="dry-warning">
        Raw microphone is on. Takes will record much quieter than normal — turn it off unless you are
        deliberately measuring the room.
      </p>

      <label class="toggle-row">
        <input type="checkbox" v-model="includeRecorded" />
        <span><strong>Re-read lines I've already recorded</strong>
          <small>Off = only read the lines that still need a recording. New takes replace old ones; nothing is deleted.</small></span>
      </label>

      <!-- Aran arrives with takes already made. Let him hear them before
           deciding to re-read: the contract already hands us their clips. -->
      <div v-if="includeRecorded && alreadyRecorded.length" class="listen-back">
        <h3>What you've already recorded</h3>
        <p class="listen-note">These play the clip stored on the server. Tap <strong>Compare</strong> to hear your original
          take next to the processed one learners hear.</p>
        <p v-if="wantedAgainCount" class="listen-note">
          {{ wantedAgainCount === alreadyRecorded.length ? 'All of these are' : `${wantedAgainCount} of these are` }}
          queued for a fresh take. Nothing has been deleted — the old take stays until the new one lands.
        </p>
        <ul>
          <li v-for="l in alreadyRecorded" :key="l.id" :class="['stacked', { playing: playingId === l.id }]">
            <div class="listen-row">
              <span class="listen-text">{{ plainText(l.text) }}</span>
              <div class="listen-actions">
                <StoredTakeButton
                  :stored-url="storedUrlFor(l.id)"
                  :allow-local="false"
                  :is-playing="playingId === l.id"
                  @toggle="togglePlay(l.id)"
                />
                <button class="cmp-btn" :class="{ open: comparingId === l.id }" type="button" @click="toggleCompare(l.id)">
                  {{ comparingId === l.id ? 'Hide' : 'Compare' }}
                </button>
              </div>
            </div>
            <!-- Mounted only on demand: the raw side costs an S3 HEAD per line,
                 and Catrin's queue is 276 lines long. -->
            <RawVsProcessed v-if="comparingId === l.id" :voice-id="voiceId" :line-id="l.id" />
          </li>
        </ul>
        <p v-if="playbackError" class="note error">{{ playbackError }}</p>
      </div>

    </section>

    <!-- ── Recording: ONE line, big ───────────────────────────────────────── -->
    <section v-else-if="phase === 'recording'" class="stage">
      <div class="stage-top">
        <div class="meter" :class="{ clip: recorder.clipping.value && !micHeld, held: micHeld }">
          <!-- Flat while the mic is held. A bar still twitching to the playback
               coming out of the speaker is the screen telling the recordist it
               is recording them when it is not. -->
          <div class="meter-fill" :style="{ width: micHeld ? '0%' : `${Math.min(100, recorder.level.value * 100)}%` }"></div>
        </div>
        <!-- "Mic live" was printed whether or not the meter was reading a
             thing, so an empty bar next to it looked like a quiet room rather
             than a broken meter. Say which it is. -->
        <span class="meter-tag" :class="{ clip: recorder.clipping.value && !micHeld, held: micHeld }">
          {{ micHeld
            ? 'Mic paused while you listen'
            : (recorder.clipping.value
              ? 'Too loud — back off the mic'
              : (recorder.meterTrusted.value ? `Mic live · ${micDb}` : 'Level meter not reading — every take will be saved')) }}
        </span>
      </div>
      <!-- The one line that says which of the two things is happening. It is the
           only place the words "Recording" and "Playing back" appear on this
           screen, and they can never both be true: starting a playback holds the
           microphone, and the dot only lives while the mic does. -->
      <p class="stage-progress" :class="activityState.cls">
        <span class="live-dot" :class="{ hot: recorder.lineHasSpeech.value && !micHeld, off: micHeld }"></span>
        {{ activityState.words }} · {{ progressWords }}
      </p>

      <!-- Rewriting the line being read. Test courses only: `canEditText` is the
           server's word, per line, and the write is checked again there. -->
      <div v-if="editingId && editingId === current?.id" class="line-well editing">
        <label class="edit-label">Rewrite this line</label>
        <textarea
          v-model="editText"
          class="edit-box"
          rows="3"
          :disabled="editSaving"
          @keydown.esc="cancelEdit"
        ></textarea>
        <p class="edit-note">Saving gives you a line nobody has read yet — the take it had is kept, it just stops belonging to this line.</p>
        <p v-if="editError" class="note error">{{ editError }}</p>
        <div class="edit-actions">
          <button class="edit-cancel" type="button" :disabled="editSaving" @click="cancelEdit">Cancel</button>
          <button class="edit-save" type="button" :disabled="editSaving" @click="saveEdit(editingId, editText)">
            {{ editSaving ? 'Saving…' : 'Save and read it' }}
          </button>
        </div>
      </div>

      <div v-else class="line-well">
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
        <p v-if="current?.knownText" class="line-known">{{ plainText(current.knownText) }}</p>
        <p v-if="current?.rerecordReason" class="line-why">{{ current.rerecordReason }}</p>
      </div>

      <button
        v-if="current?.canEditText && editingId !== current?.id"
        class="edit-open"
        type="button"
        @click="beginEdit(current.id)"
      >Edit the text</button>

      <!-- WHAT IS COMING. A recordist reading blind, one line at a time, has to
           re-orient at every single line. Seeing the next few makes the whole
           run readable as a run: you know whether the next one is short, whether
           three in a row belong together, and whether it is worth carrying on.
           Dimmed and small on purpose — the line being read stays the biggest
           thing on the screen. -->
      <div v-if="upcoming.length" class="upnext">
        <p class="upnext-head">Coming up · {{ remainingToRead }} still to read</p>
        <ol class="upnext-list">
          <li v-for="l in upcoming" :key="l.id">{{ plainText(l.text) }}</li>
        </ol>
      </div>

      <!-- Hear the STORED clip of the line just read: the served bytes, never
           the local blob. If it will not play, that failure is what shows —
           a green tick over an unplayable clip is the whole bug. -->
      <div v-if="lastLine" class="hear-bar">
        <span class="hear-label">You just read
          <span class="hear-text">{{ plainText(lastLine.text) }}</span>
        </span>
        <div class="hear-actions">
          <StoredTakeButton
            :stored-url="storedUrlFor(lastLine.id)"
            :pending="isPending(lastLine.id)"
            :failed="hasFailed(lastLine.id)"
            :allow-local="false"
            :is-playing="playingId === lastLine.id"
            @toggle="togglePlay(lastLine.id)"
          />
          <!-- RAW FIRST, PROCESSED SECOND. Once the take has landed, the
               untouched bytes the microphone gave us are playable in the same
               place as the mastered clip — so "was that clipped?" is a question
               the recordist can answer in the room, on the take they have just
               this second read, instead of a suspicion carried to the end of a
               session. Only offered once the upload is stored: there is no raw
               original on the server until there is. -->
          <button
            v-if="queue.saved.has(lastLine.id)"
            class="cmp-btn"
            :class="{ open: comparingId === lastLine.id }"
            type="button"
            @click="toggleCompare(lastLine.id)"
          >{{ comparingId === lastLine.id ? 'Hide' : 'Raw vs processed' }}</button>
        </div>
      </div>
      <RawVsProcessed v-if="lastLine && comparingId === lastLine.id" :voice-id="voiceId" :line-id="lastLine.id" />
      <p v-if="failedNote" class="note error">{{ failedNote }}</p>
      <p v-if="playbackError" class="note error">{{ playbackError }}</p>

      <!-- The transport is dead while the editor is open, and it has to be: the
           microphone is held, so Next would close a take of nothing and file it
           under the line being rewritten, and Back would walk away from an
           unsaved edit with the mic still held. The editor has its own two
           buttons and they are the only way out of it. -->
      <div class="controls">
        <button v-if="canGoBack" class="ctl-back" :disabled="busy || !!editingId" @click="onBack">Back</button>
        <button class="ctl-again" :disabled="busy || !!editingId" @click="onAgain">Again</button>
        <button class="ctl-next" :disabled="busy || !!editingId" @click="onNext()">{{ hasNext ? 'Next' : 'Done' }}</button>
      </div>
      <button class="btn-finish" :disabled="busy || !!editingId" @click="onFinish">Stop here</button>
      <p class="kbd-hint">
        <kbd>Space</kbd> next · <kbd>R</kbd> again<template v-if="canGoBack"> · <kbd>B</kbd> back</template>
      </p>
    </section>

    <!-- ── Done ───────────────────────────────────────────────────────────── -->
    <section v-else-if="phase === 'done'" class="rc-card">
      <h2>{{ queue.pendingCount.value > 0 ? 'Saving…' : 'All saved' }}</h2>
      <p class="rc-progress-line">You read {{ readThisSession }} {{ readThisSession === 1 ? 'line' : 'lines' }}.</p>
      <p v-if="queue.pendingCount.value > 0" class="note">Keep this page open until everything has saved.</p>

      <p class="state-pill" :class="activityState.cls">{{ activityState.words }}</p>

      <RecordistRoster
        :rows="rosterRows"
        :playing-id="playingId"
        :editing-id="editingId"
        :saving="editSaving"
        :error="editError"
        @play="togglePlay"
        @record="recordOne"
        @edit="beginEdit"
        @cancel-edit="cancelEdit"
        @save="saveEdit($event.id, $event.text)"
      />

      <div v-if="sessionLines.length" class="listen-back">
        <h3>Listen back</h3>
        <p class="listen-note">These play the clip stored on the server, not your local recording.
          Tap <strong>Raw vs processed</strong> on any of them to hear the untouched original first
          and the mastered version second.</p>
        <ul>
          <li v-for="l in sessionLines" :key="l.id" :class="['stacked', { playing: playingId === l.id }]">
            <div class="listen-row">
              <span class="listen-text">{{ plainText(l.text) }}</span>
              <div class="listen-actions">
                <StoredTakeButton
                  :stored-url="storedUrlFor(l.id)"
                  :pending="isPending(l.id)"
                  :failed="hasFailed(l.id)"
                  :allow-local="false"
                  :is-playing="playingId === l.id"
                  @toggle="togglePlay(l.id)"
                />
                <button
                  v-if="queue.saved.has(l.id)"
                  class="cmp-btn"
                  :class="{ open: comparingId === l.id }"
                  type="button"
                  @click="toggleCompare(l.id)"
                >{{ comparingId === l.id ? 'Hide' : 'Raw vs processed' }}</button>
              </div>
            </div>
            <RawVsProcessed v-if="comparingId === l.id" :voice-id="voiceId" :line-id="l.id" />
          </li>
        </ul>
        <p v-if="playbackError" class="note error">{{ playbackError }}</p>
      </div>

      <div v-if="failedList.length" class="redo-list">
        <h3>{{ failedList.length }} {{ failedList.length === 1 ? 'line' : 'lines' }} did not save</h3>
        <ul>
          <li v-for="l in failedList" :key="l.id">
            <span class="redo-text">{{ plainText(l.text) }}</span>
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
import { useTapRecorder, DEFAULT_CAPTURE_PROFILE } from '@/composables/useTapRecorder'
import { useRecordistQueue } from '@/composables/useRecordistQueue'
import StoredTakeButton from '@/components/production/autocue/StoredTakeButton.vue'
import RawVsProcessed from '@/components/production/autocue/RawVsProcessed.vue'
import RecordistRoster from './recordist/RecordistRoster.vue'
import { recordistClipUrl, diagnoseRecordistClip } from '@/composables/useStoredClip'
import { createAdvanceLock } from './recordist/advance-lock'
import { stripBreakdownMarkers } from '@/utils/breakdownMarkers'

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
// Which mic profile to ask for. Voice-processed by default — on a phone that
// is what makes a take sound like a voice note rather than like a raw tap held
// at arm's length.
//
// NOT remembered, deliberately, and this is the whole of tonight's fix. It used
// to persist in localStorage under 'recordist.captureProfile', which meant one
// tick of a diagnostic toggle pinned that browser to the raw tap for every
// session afterwards, silently, with nothing on screen at the start of the next
// session saying so. Measured on Tom's 2026-09-02 session: the desktop, on the
// remembered dry profile, arrived at -18.9 dBFS raw peak needing +19.5 dB of
// lift and mastering out with a -34.9 dBFS noise floor; the phone, a browser
// with no stored key and therefore on the default, arrived at -2.5 dBFS and
// mastered to a -62.7 dBFS floor. Same person, same room, four minutes apart.
// He read it as a desktop-versus-phone difference. It was a stored preference.
//
// So the raw tap is now what it always was in intent: a per-session diagnostic,
// one tick away whenever it is wanted, and gone the next time the room opens.
// The stale key is cleared on sight so no browser is still carrying one.
const captureProfile = ref(DEFAULT_CAPTURE_PROFILE)
try { localStorage.removeItem('recordist.captureProfile') } catch { /* private mode */ }
// The mic this take was read into, and how it was asked for — the take's
// provenance row. The profile belongs in it: two takes of the same line under
// the two profiles are different recordings, and nothing else on the clip says
// which one you are listening to.
function micLabel() {
  const list = recorder.devices.value || []
  const chosen = selectedDeviceId.value
    ? list.find(d => d.deviceId === selectedDeviceId.value)
    : list[0]
  const mic = (chosen && chosen.label) || null
  return [mic, `capture:${captureProfile.value}`].filter(Boolean).join(' · ')
}
const index = ref(0)
// THE PATH HE ACTUALLY WALKED, not index arithmetic. nextIndexFrom() skips
// lines that are already recorded, and the re-read toggle can change which those
// are mid-session, so `index - 1` would hand him lines he has never seen. Back
// pops this instead: whatever he was last looking at is what he goes back to.
const visited = ref([])
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

// THE WHOLE RUN, FLATTENED FOR THE ROSTER. One row per line in queue order,
// carrying only what a reader needs: what it says, whether it is done, and the
// bytes to play if there are any. The three judgements stay HERE — markup
// parsing, done-ness including this session's takes, and clip precedence — so
// the roster cannot invent a fourth definition of any of them.
const rosterRows = computed(() => lines.value.map(l => ({
  id: l.id,
  text: plainText(l.text),
  done: isRecorded(l),
  url: storedUrlFor(l.id),
  canEdit: !!l.canEditText,
})))

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
 *
 * Same reasoning takes the learner-facing breakdown ellipses out here: they are
 * markup for the learner's ear, not for the reader's mouth, and a recordist who
 * sees them reads them as "hesitate". Every display of a line goes through this
 * function, so stripping once at the top is the whole change — and it is
 * DISPLAY ONLY. `line.text` keeps its markers everywhere else, because they are
 * part of the clip's identity when the take is posted back.
 */
function segmentsFor(text) {
  const raw = stripBreakdownMarkers(text)
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

// The same text with the markup taken out, for the places that show a line as
// one plain string (the coming-up list, the listen-back rows). Without this the
// recordist reads `<tgt>` in the queue preview.
function plainText(text) { return segmentsFor(text).map(s => s.text).join('') }

const startIndex = computed(() => {
  if (!lines.value.length) return -1
  if (includeRecorded.value) return 0
  const i = lines.value.findIndex(l => !isRecorded(l))
  return i
})

// WHERE THE RUN GOES NEXT — and it may go BACKWARDS, which is the whole of
// tonight's fix.
//
// Tom, 2026-09-02: "going back and forth threw it out of whack a bit". This
// scan only ever looked forward, and the outstanding set is no longer something
// that only shrinks in front of you: rewriting a line puts it back to
// outstanding wherever it sits, a take that came out silent leaves its line
// outstanding behind you, and the roster's one-tap "Record" drops the cursor
// into the middle of the queue with outstanding lines above it. In every one of
// those cases a forward-only scan reached the end of the list, said "Done", and
// left work owed that the run could never offer again — while the roster went
// on truthfully saying "1 still to read". Two counts, both computed from the
// same lines, disagreeing on the screen. That is the out-of-whack.
//
// So when the run is reading OUTSTANDING lines only, it wraps: forward to the
// end, then round from the top, and it stops only when there is genuinely
// nothing left anywhere. The line we are standing on is excluded — we have just
// read it, and a take that failed on it must not put the queue in a loop with
// itself. Her failure note and the roster's one-tap re-record are the way back
// to that one.
//
// With re-read turned ON the run is a single deliberate pass over everything,
// so it does not wrap: there would be no end to it.
function nextIndexFrom(i) {
  for (let k = i + 1; k < lines.value.length; k++) {
    if (includeRecorded.value || !isRecorded(lines.value[k])) return k
  }
  if (includeRecorded.value) return -1
  for (let k = 0; k < i && k < lines.value.length; k++) {
    if (!isRecorded(lines.value[k])) return k
  }
  return -1
}
const hasNext = computed(() => nextIndexFrom(index.value) !== -1)

// What the recordist is about to be asked for. Six is what fits under the line
// on a phone without pushing the controls off the bottom of the screen.
const UPCOMING_SHOWN = 6
const upcoming = computed(() => {
  const out = []
  // The scan wraps now, so a queue with fewer outstanding lines than this list
  // is long would otherwise show the same line twice and read as more work than
  // is owed.
  const seen = new Set([index.value])
  let k = index.value
  while (out.length < UPCOMING_SHOWN) {
    k = nextIndexFrom(k)
    if (k === -1 || seen.has(k)) break
    seen.add(k)
    out.push(lines.value[k])
  }
  return out
})
// STILL TO READ — the same set the roster counts, and it has to be, because
// both numbers are on the screen at once. Counting forward from the cursor made
// them disagree the moment anything became outstanding behind it: the roster
// said one line was owed and the stage said none were.
const remainingToRead = computed(() => {
  if (includeRecorded.value) return Math.max(0, lines.value.length - index.value)
  return lines.value.reduce((n, l) => n + (isRecorded(l) ? 0 : 1), 0)
})
const firstLinePreview = computed(() => {
  const l = startIndex.value === -1 ? null : lines.value[startIndex.value]
  if (!l) return 'first line'
  const t = plainText(l.text)
  return t.length > 34 ? `${t.slice(0, 34)}…` : t
})

// ── Hearing the stored clip ─────────────────────────────────────────────────
const playingId = ref(null)
const playbackError = ref(null)
let audioEl = null

// The microphone is HELD — not stopped — while a stored take plays. Two reasons,
// and the second is the one that matters: a bar twitching to the speaker looks
// like the machine is recording you when it is playing at you, and the capture
// that was running would otherwise file that playback as your take of the line
// on screen. Holding discards the open capture and re-opens the line when the
// playback ends, so the two states are mutually exclusive in fact, not just in
// the wording.
const micHeld = ref(false)

// What is happening, in words a person reads without thinking. Playback and
// editing both hold the mic, so whichever of the three is true is the only one
// that can be true: if this ever said two things, one of them would be a lie.
const activityState = computed(() => {
  // "mic paused" is only true where the mic was ever live. On the ready and done
  // cards nothing was listening in the first place, and saying it was paused
  // there is the same species of lie as saying it is live.
  if (editingId.value) {
    return { cls: 'is-editing', words: phase.value === 'recording' ? 'Editing the line — mic paused' : 'Editing the line' }
  }
  if (playingId.value) return { cls: 'is-playing', words: 'Playing back your take' }
  if (phase.value === 'recording') return { cls: 'is-recording', words: 'Recording — read the line aloud' }
  return { cls: 'is-idle', words: 'Not recording' }
})

// ── Rewriting a line, on a TEST COURSE only ─────────────────────────────────
// Tom, 2026-09-02: "it is a TEST course so it can have any rules we like", so
// the booth may rewrite a zzz_ line's text in place and he can walk the real
// journey — edit, read it, come back, edit again, read it again.
//
// `canEditText` comes off the SERVER, per line, and the server checks it again
// on the write. A live pod line never gets an edit control here and could not
// be written even if one appeared: changing live pod text in place breaks the
// content-change migration protocol silently.
//
// WHAT HAPPENS TO THE TAKE THE LINE ALREADY HAD. Nothing is deleted. A clip is
// identified by its text, so new text simply has no take — the line goes back to
// outstanding, here and on the server, and the old clip stays exactly where it
// was until a new one lands.
const editingId = ref(null)
const editText = ref('')
const editSaving = ref(false)
const editError = ref(null)

function beginEdit(lineId) {
  const l = lines.value.find(x => x.id === lineId)
  if (!l || !l.canEditText) return
  stopPlayback()
  // Same hold as a playback, for the same reason: a live microphone under an
  // open keyboard is recording the room and calling it his take.
  if (phase.value === 'recording') {
    micHeld.value = true
    try { recorder.discardLine() } catch { micHeld.value = false }
  }
  editError.value = null
  editText.value = plainText(l.text)
  editingId.value = lineId
}

function cancelEdit() {
  editingId.value = null
  editError.value = null
  releaseMic()
}

async function saveEdit(lineId, text) {
  const l = lines.value.find(x => x.id === lineId)
  const next = String(text || '').trim()
  if (!l) return
  if (!next || next === plainText(l.text)) { cancelEdit(); return }
  editSaving.value = true
  editError.value = null
  try {
    const res = await fetch(
      `${apiBase()}/api/recording/voice/${encodeURIComponent(props.voiceId)}/line/${encodeURIComponent(lineId)}/text`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ text: next }),
      }
    )
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || `Could not save that (${res.status})`)
    // The line is now a line nobody has read: new text, no take, outstanding.
    // Every count and every control on this page reads off these fields, so
    // saying it once here is what makes the roster, the progress line and the
    // Start button all agree without a reload.
    l.text = data.text
    if (data.knownText !== undefined) l.knownText = data.knownText
    l.recorded = false
    l.clipUrl = null
    l.rerecordWanted = false
    doneIds.value.delete(lineId)
    doneIds.value = new Set(doneIds.value)
    if (queue.saved.delete) queue.saved.delete(lineId)
    if (queue.failed.delete) queue.failed.delete(lineId)
    sessionIds.value = sessionIds.value.filter(id => id !== lineId)
    if (lastLine.value && lastLine.value.id === lineId) lastLine.value = null
    lines.value = [...lines.value]
    editingId.value = null
    // The mic comes back only where the editor has actually closed. Released in
    // a `finally`, a failed save left the microphone live underneath an open
    // rewrite box while the screen still said "mic paused" — recording her
    // typing, and lying about it in the one place that is meant to be certain.
    releaseMic()
  } catch (err) {
    editError.value = (err && err.message) || 'Could not save that.'
  } finally {
    editSaving.value = false
  }
}

// Which bytes a line's play button points at, in strict precedence — the order
// IS the honesty. A failed or in-flight NEW take must never fall back to the
// clip it is replacing: playing the previous take under the word "stored" is
// the same lie as playing the local blob.
function storedUrlFor(lineId) {
  if (queue.failed.has(lineId)) return null                       // nothing to play
  if (queue.saved.has(lineId)) return recordistClipUrl(props.voiceId, lineId)
  if (sessionIds.value.includes(lineId)) return null              // this session's take is still in flight
  const line = lines.value.find(l => l.id === lineId)
  // clipUrl, not `recorded`: a line queued for a re-record still HAS a take,
  // and hearing it is the whole reason it is being re-recorded.
  return line?.clipUrl ? recordistClipUrl(props.voiceId, lineId) : null  // a take from a previous session
}
function isPending(lineId) {
  return !queue.saved.has(lineId) && !queue.failed.has(lineId) && sessionIds.value.includes(lineId)
}
function hasFailed(lineId) { return queue.failed.has(lineId) }

// ── Compare: raw original vs processed ──────────────────────────────────────
// One open at a time. The panel owns its own audio element, so opening a second
// one while the first still played would put two takes of two lines on top of
// each other — and the whole point is hearing one thing clearly.
const comparingId = ref(null)
function toggleCompare(lineId) {
  stopPlayback()
  comparingId.value = comparingId.value === lineId ? null : lineId
}

const failedNote = computed(() => {
  if (!lastLine.value) return null
  return queue.failed.get(lastLine.value.id) || null
})
// Every line this voice has a STORED take for — which is not the same set as
// the lines counted done. When a whole set is commissioned again (T-20 ALL:
// Aran's 170 Welsh lines, 71 of them with an existing take), every line reads
// as outstanding, and keying this off `recorded` emptied the section and took
// Compare with it — exactly when he most needs to hear what he already gave us.
const alreadyRecorded = computed(() => lines.value.filter(l => l.clipUrl))
const wantedAgainCount = computed(() => alreadyRecorded.value.reduce((n, l) => n + (l.rerecordWanted ? 1 : 0), 0))
const sessionLines = computed(() =>
  sessionIds.value.map(id => lines.value.find(l => l.id === id)).filter(Boolean)
)
const failedList = computed(() => sessionLines.value.filter(l => queue.failed.has(l.id)))

function stopPlayback() {
  if (audioEl) { audioEl.onended = null; audioEl.onerror = null; audioEl.pause() }
  playingId.value = null
  releaseMic()
}

// Give the line back to the microphone after a playback. discardLine() first,
// always: the recorder kept running through the playback, and that capture is
// the speaker, not the reader. beginLine() then re-opens the same line clean.
// Both calls do their work synchronously — the promise discardLine returns is
// only the discarded blob, which nobody wants.
function releaseMic() {
  if (!micHeld.value) return
  micHeld.value = false
  if (phase.value !== 'recording') return
  try {
    recorder.discardLine()
    recorder.beginLine()
  } catch { /* the stream is gone; the phase change will have said so */ }
}

function togglePlay(lineId) {
  playbackError.value = null
  if (playingId.value === lineId) { stopPlayback(); return }
  const url = storedUrlFor(lineId)
  if (!url) return
  stopPlayback()
  // Hold the mic BEFORE a byte plays. Doing it after would leave the first
  // moment of the playback on the take.
  if (phase.value === 'recording') {
    micHeld.value = true
    try { recorder.discardLine() } catch { micHeld.value = false }
  }
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
    await recorder.start(selectedDeviceId.value || null, captureProfile.value)
  } catch (err) {
    micError.value = friendlyMicError(err)
    return
  }
  recorder.listDevices()
  readThisSession.value = 0
  sessionIds.value = []
  lastLine.value = null
  visited.value = []
  advanceLock.reset()
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

// One line, one step forward — see src/views/recordist/advance-lock.js for the
// race it closes and why a debounce could not.
const advanceLock = createAdvanceLock()
// What the lock knows a line by. The id the server gave it, which is also what
// the take is filed under; the index is only a fallback for a line that somehow
// arrived without one, and a line with neither is never advanced from.
function lineKeyAt(i) {
  const l = lines.value[i]
  if (!l) return null
  return l.id ?? `#${i}`
}

const canGoBack = computed(() => phase.value === 'recording' && visited.value.length > 0)

let lastTapAt = 0
function debounced() {
  const now = Date.now()
  if (now - lastTapAt < 250) return false
  lastTapAt = now
  return true
}
// Back keeps its OWN window. The one above is shared between Next and Again to
// swallow a bouncy tap on the same control; Back is not that — "Next, no, back"
// is one of the fastest and most deliberate things a recordist does, and on the
// shared window it simply did not happen. Verified in the browser: a Back tap
// inside 250ms of a Next tap was silently dropped.
let lastBackTapAt = 0
function backDebounced() {
  const now = Date.now()
  if (now - lastBackTapAt < 250) return false
  lastBackTapAt = now
  return true
}

function commit(i, blob, hadSpeech) {
  const line = lines.value[i]
  if (!line) return
  // Never save silence: a take with nothing said on it didn't happen.
  //
  // This used to be a blob-size test, and that test is now meaningless: every
  // clip carries pre-roll and tail by design, so even a line nobody read comes
  // back as several kilobytes of room. What the recorder KNOWS is whether it
  // ever heard the voice while this line was open, and that is what decides it.
  // The size floor stays underneath as a backstop for a capture that failed
  // outright.
  //
  // `hadSpeech` is TRUE, FALSE or NULL, and null means the recorder does not
  // know — its meter never delivered a sample, so it heard nothing about
  // anything. Only FALSE refuses a take. Not knowing is not the same as knowing
  // there was silence, and on 2026-08-22 the difference was a whole session:
  // every line read, every clip captured, every take refused, because the level
  // meter was reading zero and the meter is the only witness this test has.
  if (!blob || blob.size < 1200 || hadSpeech === false) {
    queue.markFailed(line.id, 'That take came out silent — read it again.')
    if (!sessionIds.value.includes(line.id)) sessionIds.value = [...sessionIds.value, line.id]
    lastLine.value = line
    return
  }
  // A line he came BACK to and read again is one line read, not two. The queue
  // already supersedes the earlier take of the same lineId and sessionIds
  // already refuses to list it twice; this is the last of the three counts that
  // was still double-counting a re-read.
  const firstTakeOfThisLine = !sessionIds.value.includes(line.id)
  queue.queueTake({ voiceId: props.voiceId, lineId: line.id, text: line.text, blob, micLabel: micLabel() })
  doneIds.value.add(line.id)
  doneIds.value = new Set(doneIds.value)
  if (firstTakeOfThisLine) sessionIds.value = [...sessionIds.value, line.id]
  if (playingId.value === line.id) stopPlayback()
  lastLine.value = line
  if (firstTakeOfThisLine) readThisSession.value++
}

// The bar as a number. "Barely moving" and "not moving" look the same on a
// phone at arm's length and mean opposite things; this is what told us which
// one Tom was looking at on 2026-08-22, and it costs a label.
function db(v) {
  if (!(v > 0)) return '−∞'
  return `${(20 * Math.log10(v)).toFixed(0)} dB`
}
const micDb = computed(() => `${db(recorder.inputPeak.value)} · room ${db(recorder.roomTone.value)}`)

// What the recorder can honestly say about whether this line was read: true,
// false, or null for "no idea". Null is what a meter that is not delivering
// samples is entitled to say, and it is the only answer that never destroys a
// performance.
function speechVerdict() {
  if (!recorder.meterTrusted.value) return null
  return recorder.lineHasSpeech.value
}

async function onNext(source = 'tap') {
  if (phase.value !== 'recording' || busy.value || !debounced()) return
  // Tapping a control while a take is playing means "enough listening". Stop it
  // and give the line back to the mic before anything is filed, so the playback
  // never lands inside the take this call is about to close.
  if (playingId.value) stopPlayback()
  // Exactly one step away from any one line. `busy` cannot do this job: on the
  // normal path there is no await inside the try, so it is true for a
  // synchronous instant and a watcher flushing on the next tick sails past it.
  if (!advanceLock.claim(lineKeyAt(index.value), source)) return
  busy.value = true
  try {
    const i = index.value
    // Snapshot BEFORE the next line opens: beginLine() resets it, and the blob
    // does not land for up to a tail-length afterwards.
    const hadSpeech = speechVerdict()
    // The blob is not awaited before advancing. endLine() keeps the outgoing
    // recorder running for its tail — that is the whole point of it — so
    // waiting here would put a visible pause on every line for audio that is
    // already guaranteed. The screen moves now; the take files itself when the
    // tail is done.
    const pending = recorder.endLine()
    const n = nextIndexFrom(i)
    if (n !== -1) {
      visited.value = [...visited.value, i]
      index.value = n
      // The scan wrapped: we are landing on a line the run stepped away from
      // earlier, and its one step forward has already been spent. Without this
      // the queue arrives on the rewritten line and then refuses to leave it.
      if (n <= i) advanceLock.reopen(lineKeyAt(n))
      recorder.beginLine()
    }
    pending.then(blob => commit(i, blob, hadSpeech))
    if (n === -1) { await pending; await finish() }
  } finally { busy.value = false }
}

// ── Moving on by itself ─────────────────────────────────────────────────────
// The recordist reads; when they stop, the studio goes to the next line. No
// tap. This is only safe because the capture no longer ends where the line
// ends: the outgoing recorder runs on for its tail and the incoming one has
// been running since before this decision was made, so advancing a beat too
// early costs nothing but a slightly longer clip. Under the old per-line
// recorder the same feature would have cut every take.
const AUTO_ADVANCE_QUIET_MS = 1200
const autoAdvance = ref(true)
watch(() => recorder.quietMs.value, (ms) => {
  if (!autoAdvance.value || phase.value !== 'recording' || busy.value) return
  // A held mic is not listening to anybody. Without this, the recordist's own
  // take coming out of the phone speaker would advance the queue for them.
  if (micHeld.value || playingId.value) return
  if (!recorder.lineHasSpeech.value) return
  // No cooldown on a freshly-opened line, deliberately: beginLine() sets
  // lineHasSpeech back to false and quietMs to 0, and the guard above means the
  // watcher cannot fire again until the recordist has actually said something on
  // the NEW line. A timer here would be doing nothing that the recorder is not
  // already doing, so there isn't one.
  if (ms >= AUTO_ADVANCE_QUIET_MS) onNext('auto')
})

async function onAgain() {
  if (phase.value !== 'recording' || busy.value || !debounced()) return
  if (playingId.value) stopPlayback()
  busy.value = true
  try {
    await recorder.discardLine()
    recorder.beginLine()
  } finally { busy.value = false }
}

// ── Back ────────────────────────────────────────────────────────────────────
// Aran, mid-session on 2026-08-23: there was no way back. A line read badly, or
// a line skipped by the double-advance, was simply gone until the whole queue
// came round again.
//
// The take on the line he is leaving is DISCARDED, not filed. He presses Back
// because the line behind him is the one that needs fixing — the line he is
// standing on is one he has not read yet, so there is nothing here worth
// keeping, and filing a half-second of room tone under it would put a red
// "that take came out silent" on a line he never attempted. Same call Again
// makes, for the same reason.
//
// The line he lands on may already have a take from this session. That is fine
// and is the point: queueTake supersedes any earlier take of the same lineId,
// drops its stored clip until the new one lands, and commit() no longer counts
// the re-read as a second line.
async function onBack() {
  if (phase.value !== 'recording' || busy.value || !visited.value.length || !backDebounced()) return
  busy.value = true
  try {
    await recorder.discardLine()
    const prev = visited.value[visited.value.length - 1]
    visited.value = visited.value.slice(0, -1)
    index.value = prev
    // He has come back here on purpose, so this line gets its step forward back.
    advanceLock.release(lineKeyAt(prev))
    // And so does the Next/Again bounce guard. That window exists to swallow a
    // second tap on the SAME control; a Back in between is a deliberate change
    // of mind, so the Next that follows it is a fresh intention and must land.
    lastTapAt = 0
    stopPlayback()
    recorder.beginLine()
  } finally { busy.value = false }
}

async function onFinish() {
  if (phase.value !== 'recording' || busy.value) return
  if (playingId.value) stopPlayback()
  busy.value = true
  try {
    const i = index.value
    const hadSpeech = speechVerdict()
    const blob = await recorder.endLine()
    // Stop pressed on a line nobody read is not a failed take — it is the end
    // of the session. Filing it would put a phantom red line on a clean run.
    // But that only holds where the recorder KNOWS nobody read it: if the meter
    // is not reading, a dropped final line is a lost take, and a phantom row on
    // the done screen is the cheaper of the two mistakes.
    if (hadSpeech !== false) commit(i, blob, hadSpeech)
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
    await recorder.start(selectedDeviceId.value || null, captureProfile.value)
  } catch (err) { micError.value = friendlyMicError(err); return }
  // A jump from the done screen is not a step along the path he walked, so it
  // starts its own: Back must never take him from here into a queue position he
  // left ten minutes ago.
  visited.value = []
  advanceLock.release(lineKeyAt(i))
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
  // EDITING IS TYPING. Space, R and B are letters in a rewrite box long before
  // they are controls, and this listener is on the window: with the editor open,
  // every space Tom typed into a line was calling onNext() — advancing the
  // queue, closing the take, and filing whatever the mic had under the line he
  // was in the middle of rewriting. He could not type a space at all. That is
  // the sharpest edge of "going back and forth threw it out of whack".
  if (editingId.value) return
  const t = e.target
  if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT' || t.isContentEditable)) return
  if (e.code === 'Space') { e.preventDefault(); onNext() }
  else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); onAgain() }
  else if (e.key === 'b' || e.key === 'B') { e.preventDefault(); onBack() }
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
    // A QUEUE MAY ASK FOR AUTO-ADVANCE OFF, and one does. Pod and course lines
    // are single sentences, so stopping on a silence is right for them and the
    // default stays on. A recording PACK is paragraphs — the 25-second cloning
    // sample has four sentence pauses in it, and advancing on the first one
    // would file a third of a take and call it done. The reader can still turn
    // it back on with the checkbox; this only decides where it starts.
    if (data.autoAdvance === false) autoAdvance.value = false
    lines.value = Array.isArray(data.lines) ? data.lines : []
    doneIds.value = new Set()
    sessionIds.value = []
    lastLine.value = null
    visited.value = []
    advanceLock.reset()
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
.dry-warning {
  margin: -1rem 0 1.5rem; padding: 0.6rem 0.8rem; border-radius: 6px;
  background: rgba(255, 176, 32, 0.12); border: 1px solid rgba(255, 176, 32, 0.45);
  color: var(--color-paper, #f4f4ef); font-size: 0.85rem; line-height: 1.45;
}

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
/* Recording is the room's own green; playing back is the tungsten amber used
   nowhere else on this screen. Two states, two colours, and the words underneath
   them say the same thing for anyone who does not read colour. */
.stage-progress.is-recording { color: var(--color-emerald, #06ffa5); }
.stage-progress.is-playing { color: var(--color-tungsten, #ffa630); font-weight: 600; }
.meter.held { opacity: 0.45; }
.meter-tag.held { color: var(--color-tungsten, #ffa630); }
.live-dot.off { background: var(--color-graphite, #475569); }

/* The same sentence on the cards, where there is no meter to read it off. */
.state-pill {
  display: inline-block;
  margin: 0 0 0.9rem;
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  font-size: 0.82rem;
  border: 1px solid var(--color-graphite, #475569);
  color: var(--color-paper-dim, #c1c1bb);
}
.state-pill.is-playing {
  color: var(--color-tungsten, #ffa630);
  border-color: var(--color-tungsten, #ffa630);
}
.state-pill.is-editing,
.stage-progress.is-editing { color: var(--color-tungsten, #ffa630); }

/* Editing the line, in the same well the line lives in — so the thing being
   rewritten stays in the place the eye is already on. */
.line-well.editing { box-shadow: inset 0 0 0 2px var(--color-tungsten, #ffa630); min-height: auto; }
.edit-label { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-paper-dim, #c1c1bb); }
.edit-box {
  width: 100%;
  margin-top: 0.5rem;
  padding: 0.8rem;
  font-size: 1.15rem;
  line-height: 1.4;
  border-radius: 10px;
  border: 1px solid var(--color-graphite, #475569);
  background: var(--color-void, #0f172a);
  color: var(--color-paper, #f7f7f2);
}
.edit-note { font-size: 0.8rem; color: var(--color-paper-dim, #c1c1bb); margin: 0.5rem 0 0; }
.edit-actions { display: flex; gap: 0.6rem; margin-top: 0.8rem; }
.edit-cancel, .edit-save {
  flex: 1 1 50%;
  min-height: 52px;
  border-radius: 10px;
  font-size: 1rem;
  cursor: pointer;
  border: 1px solid var(--color-graphite, #475569);
  background: transparent;
  color: inherit;
}
.edit-save {
  background: var(--color-tungsten, #ffa630);
  border-color: var(--color-tungsten, #ffa630);
  color: var(--color-void, #0f172a);
  font-weight: 700;
}
.edit-open {
  align-self: flex-start;
  margin-top: 0.6rem;
  min-height: 44px;
  padding: 0.4rem 0.9rem;
  border-radius: 8px;
  border: 1px solid var(--color-graphite, #475569);
  background: transparent;
  color: var(--color-paper-dim, #c1c1bb);
  cursor: pointer;
}

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
.hear-actions { display: flex; align-items: center; gap: 0.4rem; flex-shrink: 0; }

/* Coming up: legible, but never competing with the line being read. */
.upnext { margin-top: 0.15rem; }
.upnext-head {
  margin: 0 0 0.3rem; font-size: 0.7rem; letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--color-paper-dim, #c1c1bb); opacity: 0.75;
}
.upnext-list {
  margin: 0; padding-left: 1.1rem; display: flex; flex-direction: column; gap: 0.22rem;
}
.upnext-list li {
  font-size: 0.8rem; line-height: 1.35; color: var(--color-paper-dim, #c1c1bb);
  opacity: 0.72; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.upnext-list li:first-child { opacity: 0.95; }

.live-dot {
  display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 0.4rem;
  background: var(--color-graphite, #475569);
}
.live-dot.hot { background: var(--color-emerald, #06ffa5); }

/* Three across on a phone, and Next still the biggest thing in the row. Back and
   Again share the left side by percentage rather than content width, so the row
   never wraps and no button ever falls under a thumb-sized target. */
.controls { display: flex; gap: 0.6rem; }
.ctl-back,
.ctl-again {
  flex: 0 0 26%; min-height: 68px;
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
.ctl-back:disabled, .ctl-again:disabled, .ctl-next:disabled, .btn-finish:disabled { opacity: 0.5; cursor: default; }
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
/* A row that can open a compare panel underneath it stacks instead of sitting
   on one line — on a phone the two play buttons and the text never fit across. */
.listen-back li.stacked { display: block; }
.listen-row { display: flex; align-items: center; gap: 0.75rem; justify-content: space-between; flex-wrap: wrap; }
.listen-actions { display: flex; align-items: center; gap: 0.4rem; flex-shrink: 0; }
.cmp-btn {
  font-family: 'Josefin Sans', sans-serif; font-size: 0.72rem; font-weight: 600;
  color: var(--color-paper, #f7f7f2); background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.18); border-radius: 6px;
  padding: 0.35rem 0.7rem; cursor: pointer; min-height: 36px;
}
.cmp-btn.open { border-color: var(--color-tungsten, #ffa630); color: var(--color-tungsten, #ffa630); }
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
:root[data-theme="light"] .recordist { background: var(--surface); }
:root[data-theme="light"] .rc-card,
:root[data-theme="light"] .mic-select,
:root[data-theme="light"] .meter,
:root[data-theme="light"] .btn-ghost,
:root[data-theme="light"] .btn-finish,
:root[data-theme="light"] .ctl-back,
:root[data-theme="light"] .ctl-again { border-color: var(--line); }
</style>
