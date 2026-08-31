<template>
  <div class="min-h-screen bg-canvas text-ink p-8">
    <div class="max-w-6xl mx-auto">
      <!-- Breadcrumb — same pattern as PodDetailView -->
      <div class="flex items-center gap-3 mb-6 text-sm">
        <router-link to="/" class="link-emerald">Home</router-link>
        <span class="text-faint">/</span>
        <router-link to="/canonical/pods" class="link-emerald">Pods</router-link>
        <span class="text-faint">/</span>
        <router-link v-if="courseCode" to="/pods/scripts" class="link-emerald">Scripts</router-link>
        <span v-else class="text-muted">Scripts</span>
        <template v-if="courseCode">
          <span class="text-faint">/</span>
          <span class="text-muted">{{ courseCode }}</span>
        </template>
      </div>

      <div class="mb-6">
        <h1 class="text-3xl font-bold text-accent-2 mb-2">Pod scripts</h1>
        <p class="text-muted text-sm">
          Every Pod 1 script, scene by scene, read live from the pod data — character, voice,
          target and English — with casting-rule violations marked. Read-only: nothing here edits,
          renders or generates anything.
        </p>
      </div>

      <!-- ================= COURSE PICKER ================= -->
      <div class="bg-surface border border-line rounded-lg p-4 mb-6">
        <div class="flex items-center gap-3 flex-wrap">
          <label class="text-xs text-muted uppercase tracking-wide">Course</label>
          <select
            v-model="selected"
            @change="onPick"
            class="bg-canvas border border-line rounded px-3 py-2 text-sm text-ink min-w-[16rem]"
          >
            <option value="">— pick a course —</option>
            <option v-for="c in fleet" :key="c.course_code" :value="c.course_code">
              {{ c.course_code }} · {{ c.summary.lines }} lines
              <template v-if="c.summary.fails"> · {{ c.summary.fails }} fail</template>
              <template v-if="c.summary.warns"> · {{ c.summary.warns }} warn</template>
            </option>
          </select>

          <label class="text-xs text-muted uppercase tracking-wide ml-2">Track</label>
          <select v-model="track" @change="reload" class="bg-canvas border border-line rounded px-3 py-2 text-sm text-ink">
            <option value="target">Target</option>
            <option value="known">English</option>
          </select>

          <span v-if="fleetLoading" class="text-xs text-faint">Loading courses…</span>
          <span v-else class="text-xs text-faint">{{ fleet.length }} Pod 1 courses</span>

          <router-link
            v-if="courseCode"
            :to="`/production/${courseCode}/pods/${slug}`"
            class="text-xs px-3 py-2 rounded border border-line text-ink hover:border-accent-2 ml-auto"
          >Open editable pod detail</router-link>
        </div>
        <div v-if="fleetErrors.length" class="err-box rounded p-3 mt-3 text-xs">
          <div class="font-semibold mb-1">{{ fleetErrors.length }} course(s) could not be read:</div>
          <div v-for="e in fleetErrors" :key="e.pod_id">{{ e.course_code }} — {{ e.error }}</div>
        </div>
      </div>

      <!-- ================= FLEET TABLE (no course picked) ================= -->
      <div v-if="!courseCode">
        <div v-if="fleetLoading" class="text-faint text-center py-12">Loading the fleet…</div>
        <div v-else-if="fleetError" class="err-box rounded-lg p-4">{{ fleetError }}</div>
        <div v-else class="bg-surface border border-line rounded-lg overflow-hidden">
          <table class="w-full text-sm">
            <thead class="bg-canvas/50 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th class="text-left px-4 py-3">Course</th>
                <th class="text-right px-3 py-3">Scenes</th>
                <th class="text-right px-3 py-3">Lines</th>
                <th class="text-left px-3 py-3">Cast</th>
                <th class="text-right px-3 py-3">Fails</th>
                <th class="text-right px-3 py-3">Warnings</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="c in sortedFleet"
                :key="c.course_code"
                class="border-t border-line hover:bg-canvas/40 cursor-pointer"
                @click="go(c.course_code)"
              >
                <td class="px-4 py-3">
                  <span class="text-accent-2 font-medium">{{ c.course_code }}</span>
                </td>
                <td class="px-3 py-3 text-right text-muted">{{ c.summary.scenes }}</td>
                <td class="px-3 py-3 text-right text-muted">{{ c.summary.lines }}</td>
                <td class="px-3 py-3">
                  <span
                    v-for="v in c.summary.cast"
                    :key="v.voice_id || 'none'"
                    class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border mr-1"
                    :class="chipClass(v.gender)"
                  >{{ v.name || v.voice_id || 'uncast' }} · {{ v.label }}</span>
                </td>
                <td class="px-3 py-3 text-right">
                  <span :class="c.summary.fails ? 'text-danger font-semibold' : 'text-faint'">{{ c.summary.fails }}</span>
                </td>
                <td class="px-3 py-3 text-right">
                  <span :class="c.summary.warns ? 'text-amber-300/90' : 'text-faint'">{{ c.summary.warns }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ================= ONE COURSE'S SCRIPT ================= -->
      <div v-else>
        <div v-if="loading" class="text-faint text-center py-12">Loading script…</div>
        <div v-else-if="error" class="err-box rounded-lg p-4">{{ error }}</div>

        <template v-else-if="script">
          <!-- Summary card -->
          <div class="bg-surface border border-line rounded-lg p-5 mb-6">
            <div class="flex items-start justify-between gap-4 flex-wrap mb-3">
              <div>
                <h2 class="text-xl font-bold text-ink">{{ script.title || script.pod_id }}</h2>
                <div class="text-xs text-muted mt-1">
                  <code class="text-accent-2">{{ script.pod_id }}</code>
                  · {{ script.summary.scenes }} scenes · {{ script.summary.lines }} lines
                  · {{ track === 'target' ? 'target' : 'English' }} track
                </div>
              </div>
              <div
                class="text-xs px-3 py-1.5 rounded-full border"
                :class="script.summary.gate_ok
                  ? 'border-emerald-700 text-emerald-300'
                  : 'border-red-700 text-danger'"
              >Cast gate: {{ script.summary.gate_ok ? 'passes' : 'FAILS' }}</div>
            </div>

            <!-- Cast chips — same idiom as PodCastPanel -->
            <div class="flex items-center gap-2 flex-wrap mb-3">
              <span class="text-xs text-muted uppercase tracking-wide mr-1">Cast</span>
              <span
                v-for="v in script.summary.cast"
                :key="v.voice_id || 'none'"
                class="text-xs px-2 py-1 rounded-full border"
                :class="chipClass(v.gender)"
                :title="`${v.characters.length} character(s): ${v.characters.join(', ')} · gender from ${v.genderSource}`"
              >
                {{ v.name || v.voice_id || 'uncast' }} · {{ v.label }} · {{ v.lines }} lines
              </span>
            </div>

            <!-- What of this pod can actually be heard. -->
            <div v-if="script.summary.audio" class="text-xs text-muted mb-3">
              <span class="text-ink">{{ script.summary.audio.with_target }}</span> of
              {{ script.summary.audio.lines }} lines have a whole-turn clip
              <template v-if="script.summary.audio.without_target">
                (<span class="text-danger">{{ script.summary.audio.without_target }} silent</span>)
              </template>
              · <span class="text-ink">{{ script.summary.audio.with_splits }}</span> have split clips
              ({{ script.summary.audio.split_clips }} in all),
              {{ script.summary.audio.without_splits }} have none
              <template v-if="script.summary.audio.dangling">
                · <span class="text-danger">{{ script.summary.audio.dangling }} references point at no clip at all</span>
              </template>
              · every button plays the learner's own bytes, through the learning-app proxy.
            </div>

            <div v-if="script.summary.unknown_gender_voices.length" class="text-xs text-amber-300/90 mb-3">
              Gender could not be resolved for:
              <code>{{ script.summary.unknown_gender_voices.join(', ') }}</code> —
              those exchanges are reported as “cannot check”, never as passing.
            </div>

            <!-- Violation counts -->
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-xs text-muted uppercase tracking-wide mr-1">Violations</span>
              <span v-if="!script.summary.violations_total" class="text-xs text-emerald-300">none</span>
              <button
                v-for="(n, type) in script.summary.violation_counts"
                :key="type"
                @click="filter = filter === type ? null : type"
                class="text-xs px-2 py-1 rounded-full border transition"
                :class="[
                  severityOf(type) === 'fail' ? 'border-red-700 text-danger' : 'border-amber-700 text-amber-300/90',
                  filter === type ? 'ring-1 ring-accent-2' : 'hover:border-accent-2'
                ]"
              >{{ label(type) }} · {{ n }}</button>
              <button
                v-if="filter"
                @click="filter = null"
                class="text-xs px-2 py-1 rounded-full border border-line text-muted hover:border-accent-2"
              >clear filter</button>
            </div>

            <div v-if="script.retired" class="mt-3 text-xs text-amber-300/90">
              This is a RETIRED pod. It is not what a learner is served.
            </div>
          </div>

          <!-- ================= LISTEN BAR =================
               Sticky, because on a phone Stop has to be reachable without
               scrolling back — and because the now-playing line below it is
               what Tom is actually judging: which voice, saying what, how loud.
               Still read-only: this plays the learner's bytes and writes
               nothing. -->
          <div class="ps-listen bg-surface border border-line rounded-lg mb-5">
            <div class="px-3 py-2 flex items-center gap-2 flex-wrap">
              <button
                @click="toggleRun"
                :disabled="!runnable"
                class="ps-run-btn"
                :class="running ? 'ps-run-on' : ''"
                :title="running ? 'Stop — the highlight stays where it stops' : 'Play every clip on screen, scene into scene, to the end'"
              >{{ running ? '■ Stop' : '▶▶ Play all' }}</button>

              <span class="text-xs text-faint">{{ liveQueue.length }} clips queued</span>

              <span class="w-2"></span>

              <!-- What the run includes. Small set, on purpose. -->
              <span class="text-xs text-muted uppercase tracking-wide">Play</span>
              <button
                v-for="o in RUN_TOGGLES"
                :key="o.key"
                @click="setOpt(o.key, !runOpts[o.key])"
                class="ps-toggle"
                :class="runOpts[o.key] ? 'ps-toggle-on' : ''"
                :title="o.title"
              >{{ o.label }}</button>
            </div>

            <!-- One line tall: scene, speaker, voice, which clip, its text. -->
            <div v-if="nowEntry" class="ps-now px-3 py-1.5 border-t border-line flex items-center gap-2 text-xs">
              <span class="ps-now-dot">●</span>
              <span class="text-muted">Sc {{ nowEntry.sceneNumber ?? '—' }}</span>
              <span class="text-ink font-medium">{{ nowEntry.speaker }}</span>
              <span v-if="nowEntry.voiceName" class="ps-now-voice">{{ nowEntry.voiceName }}</span>
              <span class="text-faint">{{ nowEntry.label }}</span>
              <span class="text-ink truncate">{{ nowEntry.text }}</span>
              <span class="text-faint ml-auto shrink-0">{{ runIndex + 1 }}/{{ runQueue.length }}</span>
            </div>
          </div>

          <!-- Scenes -->
          <div
            v-for="scene in visibleScenes"
            :key="scene.scene_number ?? 'none'"
            class="bg-surface border border-line rounded-lg mb-5 overflow-hidden"
          >
            <div class="px-4 py-3 border-b border-line flex items-center gap-3 flex-wrap">
              <h3 class="text-sm font-semibold text-accent-2">
                Scene {{ scene.scene_number ?? '—' }}
              </h3>
              <span v-if="scene.beat_label" class="text-xs text-muted">{{ scene.beat_label }}</span>
              <span class="text-xs text-faint">{{ scene.line_count }} lines</span>
              <span
                v-for="(v, i) in scene.violations"
                :key="i"
                class="text-xs px-2 py-0.5 rounded-full border"
                :class="v.severity === 'fail' ? 'border-red-700 text-danger' : 'border-amber-700 text-amber-300/90'"
              >{{ v.message }}</span>
            </div>

            <!-- One line = its text and its clips, together. Tom, 2026-08-24:
                 "I need the clips right there, that the DB is expecting the app
                 to play." Divs rather than a table so it reads on a phone. -->
            <div
              v-for="line in scene.lines"
              :key="line.id"
              :id="`ps-line-${cssId(line.id)}`"
              class="border-t border-line px-3 py-3"
              :class="[rowClass(line), isNowLine(line) && 'ps-row-now']"
            >
              <div class="flex items-baseline gap-2 flex-wrap mb-1">
                <span class="text-faint text-xs w-6 text-right">{{ line.sentence_number }}</span>
                <span class="text-ink text-xs font-medium">{{ line.speaker }}</span>
                <span class="text-xs" :class="genderTextClass(line.voice && line.voice.gender)">
                  {{ line.voice ? (line.voice.name || line.voice.voice_id) : 'no voice' }}
                  <span class="text-faint">· {{ line.voice ? line.voice.label : 'uncast' }}</span>
                </span>
                <span
                  v-if="line.worst"
                  :title="line.flags.map(f => f.message).join(' · ')"
                  :class="line.worst === 'fail' ? 'text-danger' : 'text-amber-300/90'"
                >●</span>
              </div>

              <div class="pl-8">
                <div class="text-ink">{{ line.target_text }}</div>
                <div class="text-muted text-sm mt-0.5">{{ line.known_text }}</div>

                <!-- THE CLIPS. Every button below plays the exact bytes the
                     learner is served: the learning-app proxy, with the same
                     per-clip revision ref the learner app builds. -->
                <div class="flex items-center gap-1.5 flex-wrap mt-2">
                  <!-- Play from here: the run starts on this line and carries
                       on to the end of the pod. Sits first so it is the same
                       thumb position on every row. -->
                  <button
                    @click="playFrom(line)"
                    class="clip-btn ps-from"
                    :class="isNowLine(line) && running && 'ps-from-on'"
                    title="Play from here — this line, then on to the end of the pod"
                  >▶▶</button>

                  <button
                    v-if="line.audio.target"
                    @click="play(line.audio.target, line)"
                    :class="['clip-btn', 'clip-primary', isPlaying(line.audio.target, line) && 'clip-on', line.audio.target.found === false && 'clip-dead']"
                    :title="clipTitle(line.audio.target)"
                  >{{ isPlaying(line.audio.target, line) ? '■' : '▶' }} Whole turn{{ dur(line.audio.target) }}</button>
                  <span v-else class="clip-none">no target clip</span>

                  <template v-if="line.audio.target_splits.length">
                    <span class="text-faint text-xs ml-1">splits</span>
                    <button
                      v-for="(c, i) in line.audio.target_splits"
                      :key="c.id + i"
                      @click="play(c, line)"
                      :class="['clip-btn', isPlaying(c, line) && 'clip-on', c.found === false && 'clip-dead']"
                      :title="clipTitle(c)"
                    >{{ isPlaying(c, line) ? '■' : '▶' }} {{ i + 1 }}</button>
                  </template>
                  <span v-else class="clip-none">no split clips</span>

                  <span class="w-2"></span>

                  <button
                    v-if="line.audio.known"
                    @click="play(line.audio.known, line)"
                    :class="['clip-btn', isPlaying(line.audio.known, line) && 'clip-on', line.audio.known.found === false && 'clip-dead']"
                    :title="clipTitle(line.audio.known)"
                  >{{ isPlaying(line.audio.known, line) ? '■' : '▶' }} English</button>
                  <span v-else class="clip-none">no English clip</span>

                  <button
                    v-for="(c, i) in line.audio.known_splits"
                    :key="'k' + c.id + i"
                    @click="play(c, line)"
                    :class="['clip-btn', isPlaying(c, line) && 'clip-on', c.found === false && 'clip-dead']"
                    :title="clipTitle(c)"
                  >{{ isPlaying(c, line) ? '■' : '▶' }} EN {{ i + 1 }}</button>

                  <!-- No explainer button. Tom, 2026-08-24: "Explainers do not
                       exist anymore. We don't do them. Learners never hear them
                       in app. Let's deprecate them completely." The payload may
                       still carry line.audio.explainer for historical rows; this
                       page never renders it, so nothing here can be auditioned
                       that no learner hears. -->
                </div>

                <div v-if="playError && playErrorId === lastTried" class="text-danger text-xs mt-1">{{ playError }}</div>
              </div>
            </div>
          </div>

          <div v-if="!visibleScenes.length" class="text-faint text-center py-12">
            No scenes match that filter.
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * PodScriptsView — the read-only pod script viewer (Tom, 2026-08-24):
 * "Can I not see the scripts anywhere in Popty to have a quick butcher's at
 * them? … I think I need to be able to see them all."
 *
 * Reads /api/pod-scripts (fleet) and /api/pod-scripts/:courseCode (one script),
 * both of which build their verdict from tools/pods/pod-cast-gate.cjs — the
 * estate's one definition of "cast correctly". This component renders; it does
 * not judge, and it never writes.
 */
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiUrl } from '@/services/api.js'
import { useAuth } from '@/composables/useAuth.js'
import { buildPlayQueue, nextPlayable, indexOfLine, isPlayable } from '@/lib/podPlayQueue.js'

// Both routes are read-only, but the per-course one carries a :courseCode param
// and so passes through the API's course-scope gate — which 401s anything that
// is not a loopback request without a bearer token. Same pattern, and the same
// reason, as PodDetailView's authedFetch: a page opened on popty.app talks to
// watson-1 over the funnel, which is very much not loopback.
const { getAccessToken } = useAuth()
async function authedFetch (path) {
  const token = await getAccessToken()
  const headers = { 'ngrok-skip-browser-warning': 'true' }
  if (token) headers.Authorization = `Bearer ${token}`
  return fetch(`${getApiUrl()}${path}`, { headers })
}

const route = useRoute()
const router = useRouter()

const fleet = ref([])
const fleetErrors = ref([])
const fleetLoading = ref(true)
const fleetError = ref(null)

const script = ref(null)
const loading = ref(false)
const error = ref(null)
const filter = ref(null)
const track = ref('target')
const selected = ref('')

const courseCode = computed(() => route.params.courseCode || '')
const slug = computed(() => (script.value && script.value.slug) || 'pod-1')

const sortedFleet = computed(() =>
  [...fleet.value].sort((a, b) =>
    (b.summary.fails - a.summary.fails) ||
    (b.summary.warns - a.summary.warns) ||
    a.course_code.localeCompare(b.course_code))
)

const visibleScenes = computed(() => {
  if (!script.value) return []
  if (!filter.value) return script.value.scenes
  return script.value.scenes
    .map(s => ({ ...s, lines: s.lines.filter(l => l.flags.some(f => f.type === filter.value)) }))
    .filter(s => s.lines.length)
})

const LABELS = {
  'same-voice-exchange': 'One voice talking to itself',
  'same-gender-exchange': 'Not male–female',
  'gender-uncheckable': 'Cannot check gender',
  'cast-size': 'Cast is not two voices',
  'uncast-character': 'Character with no voice',
  'same-voice-run': 'Same voice, run of lines',
  'single-voice-scene': 'Whole scene, one voice',
}
// What a continuous listen can include. Three, kept short enough to sit on one
// phone line. The default — target whole turn only — is the conversation as the
// learner hears it, which is what Tom was doing by hand. There is no explainer
// toggle: explainers are deprecated (Tom, 2026-08-24) and a learner never hears
// one, so auditioning one would be auditioning something that is not the course.
const RUN_TOGGLES = [
  { key: 'target', label: 'Target', title: 'The target whole-turn clip of every line' },
  { key: 'splits', label: 'Splits', title: 'Play the split clips INSTEAD of the whole turn' },
  { key: 'known', label: 'English', title: 'Add the English clip after each line' },
]

const FAILS = new Set(['same-voice-exchange', 'same-gender-exchange', 'cast-size', 'uncast-character'])
const label = (t) => LABELS[t] || t
const severityOf = (t) => (FAILS.has(t) ? 'fail' : 'warn')

// Gender colouring. Dark mode keeps the pale accents the rest of the app uses;
// the scoped [data-theme="light"] block at the bottom pulls each to an
// AA-passing tone on near-white, exactly as PodCastPanel does.
const chipClass = (g) =>
  g === 'f' ? 'ps-f border-rose-700/70 text-rose-300'
    : g === 'm' ? 'ps-m border-sky-700/70 text-sky-300'
      : 'ps-unknown border-amber-700 text-amber-300/90'

const genderTextClass = (g) =>
  g === 'f' ? 'ps-f text-rose-300' : g === 'm' ? 'ps-m text-sky-300' : 'ps-unknown text-amber-300/90'

const rowClass = (line) =>
  line.worst === 'fail' ? 'ps-row-fail bg-red-950/25'
    : line.worst === 'warn' ? 'ps-row-warn bg-amber-950/20'
      : ''

// ── PLAYBACK ────────────────────────────────────────────────────────────────
// Tom, 2026-08-24: "this is pointless unless I can actually hear it — I don't
// need all this details, I need the clips right there, that the DB is expecting
// the app to play."
//
// So the URL is the LEARNER's URL, built server-side in
// tools/pods/pod-script-view.cjs: the deployed learning-app proxy, with the
// per-clip revision ref (`<uuid>.vN` for a revised clip) the learner app itself
// builds. Popty never presigns S3 here — a presigned link is a different set of
// bytes from a different path, and the whole point of this page is that what
// Tom hears is what the learner hears.
//
// ONE <audio> element for the whole page, and it is the same element for every
// clip of a continuous run. That is not tidiness, it is the only thing that
// makes hands-free listening work on Tom's phone: mobile Safari allows
// playback only inside a user gesture, and REUSING the element the opening tap
// unlocked keeps that permission alive for every clip after it. A `new Audio()`
// per clip would play the first one and then go silent from clip two onward.
// It is also what makes tapping a second clip stop the first, which is what you
// want when you are comparing two voices.
const audioEl = ref(null)
const playingRef = ref(null)
const playError = ref(null)
const playErrorId = ref(null)
const lastTried = ref(null)

// ── CONTINUOUS PLAY ─────────────────────────────────────────────────────────
// Tom, 2026-08-24: "Can we have the Popty pod script view tool play
// continuously? And also make it a bit easier to see the clips we're playing."
//
// He is auditioning Italian Pod 1 by ear — judging which voice is on which line
// and hearing that Enzo sits quieter than Ara — so the run plays the TARGET
// WHOLE-TURN clip of each line, scene into scene, to the end of the pod. The
// toggles below let him add English, or hear the splits instead of the whole
// turn. Explainers were deprecated on 2026-08-24 and never became a toggle.
const runOpts = ref({ target: true, splits: false, known: false })
const runQueue = ref([])   // the run as it was when it started — a snapshot
const runIndex = ref(-1)   // where we are in it
const running = ref(false)
const nowLineId = ref(null) // the line that is SOUNDING, run or single tap
let advanceTimer = null

// The queue is built from visibleScenes, so the violation filter narrows the
// listen exactly as it narrows the page: continuous play plays what is on
// screen, never what is hidden.
const liveQueue = computed(() => buildPlayQueue(visibleScenes.value, runOpts.value))
const runnable = computed(() => nextPlayable(liveQueue.value, 0) !== -1)
const nowEntry = computed(() =>
  (running.value && runIndex.value >= 0 && runQueue.value[runIndex.value]) || null)

// A line lights up when it is the one sounding. The button keeps its own light
// too, so whole turn stays tellable from split 2 from English — but only on
// the sounding line, because one clip ref can legitimately appear on two rows.
const isPlaying = (c, line) => Boolean(
  c && playingRef.value === c.ref && (!line || !nowLineId.value || nowLineId.value === line.id)
)
const isNowLine = (line) => Boolean(nowLineId.value && nowLineId.value === line.id)

function ensureAudio () {
  if (audioEl.value) return audioEl.value
  const el = new Audio()
  el.addEventListener('ended', () => {
    playingRef.value = null
    if (running.value) advance(runIndex.value + 1)
    else nowLineId.value = null
  })
  el.addEventListener('error', () => {
    playError.value = 'That clip would not play from the learner proxy.'
    playErrorId.value = lastTried.value
    playingRef.value = null
    // A clip that will not load must never end the run — surface it on its own
    // row and carry on after a beat, or one bad reference ends the listen.
    if (running.value) advanceSoon(runIndex.value + 1)
  })
  audioEl.value = el
  return el
}

/** Send one clip to the shared element. Returns false if it could not start. */
function sound (clip, lineId, { scroll = false } = {}) {
  if (!isPlayable(clip)) return false
  const el = ensureAudio()
  playError.value = null
  lastTried.value = clip.ref
  el.src = clip.url
  try { el.currentTime = 0 } catch { /* not seekable before metadata; harmless */ }
  playingRef.value = clip.ref
  nowLineId.value = lineId || null
  el.play().catch((e) => {
    playError.value = `Could not play: ${e && e.message ? e.message : e}`
    playErrorId.value = clip.ref
    playingRef.value = null
    if (running.value) advanceSoon(runIndex.value + 1)
  })
  if (scroll) scrollToLine(lineId)
  return true
}

// A single tap behaves exactly as it always has: play that one clip, stop at
// the end. That is the two-clips-side-by-side comparison Tom already relies on,
// so tapping a clip mid-run stops the run rather than fighting it.
function play (clip, line) {
  if (!clip || !clip.url) return
  if (running.value) stopRun()
  const el = ensureAudio()
  if (playingRef.value === clip.ref) {
    el.pause(); playingRef.value = null; nowLineId.value = null; return
  }
  sound(clip, line && line.id)
}

/** Step to queue position `i`, skipping anything dead, and stop at the end. */
function advance (i) {
  clearTimeout(advanceTimer)
  const q = runQueue.value
  const at = nextPlayable(q, i)
  if (at === -1) { finishRun(); return }
  runIndex.value = at
  const entry = q[at]
  if (!sound(entry.clip, entry.lineId, { scroll: true })) advanceSoon(at + 1)
}

/** The same step, after a beat — used when a clip errored, so it is audible. */
function advanceSoon (i) {
  clearTimeout(advanceTimer)
  advanceTimer = setTimeout(() => { if (running.value) advance(i) }, 700)
}

function startRun (fromIndex = 0) {
  const q = liveQueue.value
  if (!q.length) return
  runQueue.value = q
  running.value = true
  advance(fromIndex)
}

/** ▶▶ on a row: start the whole run at this line and keep going to the end. */
function playFrom (line) {
  const q = liveQueue.value
  const at = indexOfLine(q, line.id)
  runQueue.value = q
  running.value = true
  advance(at === -1 ? 0 : at)
}

/** Stop leaves the highlight exactly where it stopped — that is the point. */
function stopRun () {
  clearTimeout(advanceTimer)
  running.value = false
  if (audioEl.value) audioEl.value.pause()
  playingRef.value = null
}

function finishRun () {
  clearTimeout(advanceTimer)
  running.value = false
  playingRef.value = null
}

function toggleRun () { running.value ? stopRun() : startRun(0) }

// Changing what the run includes mid-listen restarts it from the line he is on,
// rather than dumping him back at scene 1.
function setOpt (key, value) {
  runOpts.value = { ...runOpts.value, [key]: value }
  if (!running.value) return
  const here = nowLineId.value
  stopRun()
  nextTick(() => {
    const q = liveQueue.value
    const at = here ? indexOfLine(q, here) : 0
    runQueue.value = q
    running.value = true
    advance(at === -1 ? 0 : at)
  })
}

// Auto-scroll follows the RUN only. A single tap never moves the page under
// Tom's thumb — he taps a clip because he is already looking at it.
function scrollToLine (lineId) {
  if (!lineId) return
  nextTick(() => {
    const el = document.getElementById(`ps-line-${cssId(lineId)}`)
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  })
}

// Line ids are `course:pod-1:SC01-S001` — the colons are legal in an id
// attribute but a nuisance everywhere else, so they travel as dashes.
const cssId = (id) => String(id).replace(/[^A-Za-z0-9_-]/g, '-')

const dur = (c) => (c && c.duration_ms ? ` ${(c.duration_ms / 1000).toFixed(1)}s` : '')

// The tooltip carries what the clip actually IS — the text it was rendered
// from, its voice, its revision — because a clip that plays the wrong words is
// the defect this page was built to catch.
const clipTitle = (c) => {
  if (!c) return ''
  if (c.found === false) return `${c.id} — NO course_audio row. This reference is dangling; nothing will play.`
  const bits = [c.text ? `“${c.text}”` : '(no text on the clip)']
  if (c.voice_id) bits.push(`voice ${c.voice_id}`)
  bits.push(c.revision && c.revision > 1 ? `revision ${c.revision}` : 'revision 1')
  bits.push(c.url)
  return bits.join(' · ')
}

onBeforeUnmount(() => {
  clearTimeout(advanceTimer)
  running.value = false
  if (audioEl.value) { audioEl.value.pause(); audioEl.value.src = '' }
})

// Changing the violation filter changes what is on screen, and therefore what
// the run would play. Stop rather than carry on through lines he can no longer
// see; the highlight stays where it was.
watch(filter, () => { if (running.value) stopRun() })

async function loadFleet () {
  fleetLoading.value = true
  fleetError.value = null
  try {
    const r = await authedFetch(`/api/pod-scripts?track=${track.value}`)
    if (!r.ok) throw new Error(`fleet index: HTTP ${r.status}`)
    const d = await r.json()
    fleet.value = d.courses || []
    fleetErrors.value = d.errors || []
  } catch (e) {
    fleetError.value = e.message || String(e)
  } finally {
    fleetLoading.value = false
  }
}

async function loadScript () {
  if (!courseCode.value) { script.value = null; return }
  loading.value = true
  error.value = null
  filter.value = null
  stopRun()
  nowLineId.value = null
  try {
    const q = new URLSearchParams({ track: track.value })
    if (route.query.slug) q.set('slug', String(route.query.slug))
    const r = await authedFetch(`/api/pod-scripts/${courseCode.value}?${q}`)
    if (!r.ok) {
      const body = await r.json().catch(() => ({}))
      throw new Error(body.error || `HTTP ${r.status}`)
    }
    script.value = await r.json()
  } catch (e) {
    error.value = e.message || String(e)
    script.value = null
  } finally {
    loading.value = false
  }
}

function go (code) { router.push(`/pods/scripts/${code}`) }
function onPick () { router.push(selected.value ? `/pods/scripts/${selected.value}` : '/pods/scripts') }
function reload () { loadFleet(); loadScript() }

watch(courseCode, (c) => { selected.value = c; loadScript() })

onMounted(() => {
  selected.value = courseCode.value
  loadFleet()
  loadScript()
})
</script>

<!--
  Light-mode legibility, same approach and same reasoning as PodCastPanel: dark
  mode keeps its pale accents (rose-300 / sky-300 / amber-300 on dark fills);
  every rule here is scoped under [data-theme="light"], where those tones drop
  to ~1.4–1.9:1 on near-white, and pulls them to an AA-passing tone of the same
  hue. The flagged-row tints go the same way — a dark 25%-alpha wash is
  invisible on a white canvas.

  These were written as `:global([data-theme="light"]) .ps-x` and did nothing —
  worse than nothing. Vue's scoped-style compiler turns that into a bare
  `[data-theme="light"] { … }`: it DROPS the descendant selector and hangs the
  declarations on <html> itself. Measured in the browser on 2026-08-24 — a
  flagged row in light mode was still carrying the dark wash, rgba(69,26,3,.2)
  on near-white, which is the exact illegibility this block exists to prevent.
  `:root[data-theme="light"] .ps-x` is what every other component in the app
  uses, and it compiles to a real scoped rule.
-->
<style scoped>
/* Clip buttons. Big enough to hit with a thumb — Tom reads this on his phone. */
.clip-btn {
  font-size: 0.75rem;
  line-height: 1;
  padding: 0.45rem 0.6rem;
  min-width: 2.1rem;
  border-radius: 0.375rem;
  border: 1px solid rgb(var(--line, 63 63 70) / 1);
  color: inherit;
  opacity: 0.92;
}
.clip-btn:hover { border-color: var(--accent-2); opacity: 1; }
.clip-primary { padding-inline: 0.8rem; font-weight: 600; }
.clip-on { background-color: #059669; border-color: #059669; color: #fff; }
/* A dangling reference is shown, never hidden and never made to look playable. */
.clip-dead { border-color: #b91c1c; color: var(--danger); text-decoration: line-through; }
.clip-none { font-size: 0.7rem; opacity: 0.6; font-style: italic; }

/* ── LISTEN BAR + NOW PLAYING ───────────────────────────────────────────────
   The now-playing treatment is a LEFT BAR and a ring, never a background fill.
   That is deliberate: .ps-row-fail / .ps-row-warn carry their own tint and must
   stay readable underneath, so the highlight has to sit beside the row colour
   rather than paint over it. */
/* The app navbar is itself position:sticky at top:0, z-index 100, and it
   publishes its own live height as --app-navbar-height for exactly this reason
   (it is 56px on a desktop row and taller when sub-tabs wrap). Sticking to
   top:0 puts the listen bar UNDERNEATH it — caught in the browser, where the
   navbar swallowed the clicks on Stop. On a phone that is Stop becoming
   unreachable mid-listen, so the bar sits below the navbar, not behind it. */
.ps-listen {
  position: sticky;
  top: var(--app-navbar-height, 56px);
  z-index: 20;               /* below the navbar's 100, above the scene cards */
}

.ps-run-btn {
  font-size: 0.8rem;
  font-weight: 600;
  line-height: 1;
  padding: 0.55rem 0.9rem;
  border-radius: 0.375rem;
  border: 1px solid #059669;
  color: var(--accent-2);
}
.ps-run-btn:disabled { opacity: 0.4; border-color: rgb(var(--line, 63 63 70) / 1); color: inherit; }
.ps-run-on { background-color: #059669; border-color: #059669; color: #fff; }

.ps-toggle {
  font-size: 0.7rem;
  line-height: 1;
  padding: 0.45rem 0.6rem;      /* thumb-sized, same reason as .clip-btn */
  border-radius: 999px;
  border: 1px solid rgb(var(--line, 63 63 70) / 1);
  opacity: 0.75;
}
.ps-toggle-on { background-color: #065f46; border-color: var(--accent-2); color: #fff; opacity: 1; }

.ps-from { color: var(--accent-2); border-color: #065f46; font-weight: 700; }
.ps-from-on { background-color: #065f46; color: #fff; }

.ps-now-dot { color: var(--accent-2); }
.ps-now-voice { color: var(--accent-2); font-weight: 600; }

/* The row you are hearing. Bar + ring + a lift, all outside the fill. */
.ps-row-now {
  box-shadow: inset 4px 0 0 0 #10b981, 0 0 0 1px #10b981;
  border-radius: 0.25rem;
}

:root[data-theme="light"] .ps-run-btn { color: #047857; }
:root[data-theme="light"] .ps-run-on { color: #fff; }
:root[data-theme="light"] .ps-toggle-on { background-color: #047857; border-color: #047857; color: #fff; }
:root[data-theme="light"] .ps-from { color: #047857; border-color: #6ee7b7; }
:root[data-theme="light"] .ps-from-on { background-color: #047857; color: #fff; }
:root[data-theme="light"] .ps-now-dot,
:root[data-theme="light"] .ps-now-voice { color: #047857; }
/* #10b981 on near-white is ~2.1:1 — fine as a 4px bar, too pale as a hairline
   ring, so light mode takes the darker emerald for both. */
:root[data-theme="light"] .ps-row-now { box-shadow: inset 4px 0 0 0 #047857, 0 0 0 1px #047857; }

:root[data-theme="light"] .ps-f { color: #be123c; border-color: #fda4af; }
:root[data-theme="light"] .ps-m { color: #0369a1; border-color: #7dd3fc; }
:root[data-theme="light"] .ps-unknown { color: #78350f; border-color: #d97706; }
:root[data-theme="light"] .ps-row-fail { background-color: #fee2e2; }
:root[data-theme="light"] .ps-row-warn { background-color: #fef3c7; }
</style>
