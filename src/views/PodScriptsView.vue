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
              class="border-t border-line px-3 py-3"
              :class="rowClass(line)"
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
                  <button
                    v-if="line.audio.target"
                    @click="play(line.audio.target)"
                    :class="['clip-btn', 'clip-primary', isPlaying(line.audio.target) && 'clip-on', line.audio.target.found === false && 'clip-dead']"
                    :title="clipTitle(line.audio.target)"
                  >{{ isPlaying(line.audio.target) ? '■' : '▶' }} Whole turn{{ dur(line.audio.target) }}</button>
                  <span v-else class="clip-none">no target clip</span>

                  <template v-if="line.audio.target_splits.length">
                    <span class="text-faint text-xs ml-1">splits</span>
                    <button
                      v-for="(c, i) in line.audio.target_splits"
                      :key="c.id + i"
                      @click="play(c)"
                      :class="['clip-btn', isPlaying(c) && 'clip-on', c.found === false && 'clip-dead']"
                      :title="clipTitle(c)"
                    >{{ isPlaying(c) ? '■' : '▶' }} {{ i + 1 }}</button>
                  </template>
                  <span v-else class="clip-none">no split clips</span>

                  <span class="w-2"></span>

                  <button
                    v-if="line.audio.known"
                    @click="play(line.audio.known)"
                    :class="['clip-btn', isPlaying(line.audio.known) && 'clip-on', line.audio.known.found === false && 'clip-dead']"
                    :title="clipTitle(line.audio.known)"
                  >{{ isPlaying(line.audio.known) ? '■' : '▶' }} English</button>
                  <span v-else class="clip-none">no English clip</span>

                  <button
                    v-for="(c, i) in line.audio.known_splits"
                    :key="'k' + c.id + i"
                    @click="play(c)"
                    :class="['clip-btn', isPlaying(c) && 'clip-on', c.found === false && 'clip-dead']"
                    :title="clipTitle(c)"
                  >{{ isPlaying(c) ? '■' : '▶' }} EN {{ i + 1 }}</button>

                  <button
                    v-if="line.audio.explainer"
                    @click="play(line.audio.explainer)"
                    :class="['clip-btn', isPlaying(line.audio.explainer) && 'clip-on', line.audio.explainer.found === false && 'clip-dead']"
                    :title="clipTitle(line.audio.explainer)"
                  >{{ isPlaying(line.audio.explainer) ? '■' : '▶' }} Explainer</button>
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
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiUrl } from '@/services/api.js'

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
// One <audio> element for the whole page: tapping a second clip stops the
// first, which is what you want when you are comparing two voices.
const audioEl = ref(null)
const playingRef = ref(null)
const playError = ref(null)
const playErrorId = ref(null)
const lastTried = ref(null)

const isPlaying = (c) => Boolean(c && playingRef.value === c.ref)

function play (clip) {
  if (!clip || !clip.url) return
  if (!audioEl.value) {
    audioEl.value = new Audio()
    audioEl.value.addEventListener('ended', () => { playingRef.value = null })
    audioEl.value.addEventListener('error', () => {
      playError.value = 'That clip would not play from the learner proxy.'
      playErrorId.value = lastTried.value
      playingRef.value = null
    })
  }
  const el = audioEl.value
  if (playingRef.value === clip.ref) { el.pause(); playingRef.value = null; return }
  playError.value = null
  lastTried.value = clip.ref
  el.src = clip.url
  el.currentTime = 0
  playingRef.value = clip.ref
  el.play().catch((e) => {
    playError.value = `Could not play: ${e && e.message ? e.message : e}`
    playErrorId.value = clip.ref
    playingRef.value = null
  })
}

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

onBeforeUnmount(() => { if (audioEl.value) { audioEl.value.pause(); audioEl.value.src = '' } })

async function loadFleet () {
  fleetLoading.value = true
  fleetError.value = null
  try {
    const r = await fetch(`${getApiUrl()}/api/pod-scripts?track=${track.value}`)
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
  if (audioEl.value) { audioEl.value.pause(); playingRef.value = null }
  try {
    const q = new URLSearchParams({ track: track.value })
    if (route.query.slug) q.set('slug', String(route.query.slug))
    const r = await fetch(`${getApiUrl()}/api/pod-scripts/${courseCode.value}?${q}`)
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
.clip-btn:hover { border-color: #34d399; opacity: 1; }
.clip-primary { padding-inline: 0.8rem; font-weight: 600; }
.clip-on { background-color: #059669; border-color: #059669; color: #fff; }
/* A dangling reference is shown, never hidden and never made to look playable. */
.clip-dead { border-color: #b91c1c; color: #f87171; text-decoration: line-through; }
.clip-none { font-size: 0.7rem; opacity: 0.6; font-style: italic; }

:global([data-theme="light"]) .ps-f { color: #be123c; border-color: #fda4af; }
:global([data-theme="light"]) .ps-m { color: #0369a1; border-color: #7dd3fc; }
:global([data-theme="light"]) .ps-unknown { color: #78350f; border-color: #d97706; }
:global([data-theme="light"]) .ps-row-fail { background-color: #fee2e2; }
:global([data-theme="light"]) .ps-row-warn { background-color: #fef3c7; }
</style>
