<script setup>
/**
 * Pod Lab — /admin/configs/pods
 *
 * A tuning + audition surface for the Layer-2 pod acquisition ladder, sibling to
 * the Pause Lab (/admin/configs/speaking). Pick a course + a pod line, and hear
 * its WHOLE acquisition arc — the Stage-0 breakdown tiers followed by every
 * whole-sentence stage — assembled by the REAL engine.
 *
 * No drift by construction: the arc is composed by `composeSentenceArc` imported
 * straight from `@ssi/core/pods` — the exact function the learner's main flow
 * runs. This is the surface that lets us retire the hand-ported copy in
 * src/lib/podArcCompose.js.
 *
 * SAFETY: preview/export only. `algorithm_config` writes are immediately global
 * to every learner (~5-min cache TTL, no draft/env split), so this Lab never
 * writes config — it reads the LIVE config as a starting point, lets you tune
 * in-session, and exports the tuned JSON for a human to apply deliberately.
 */
import { ref, computed, reactive, watch } from 'vue'
import CoursePicker from '../../components/CoursePicker.vue'
// Vendored VERBATIM from @ssi/core/pods (the engine the learner's main flow
// runs) — see src/lib/podEngine + tools/sync-pod-engine.sh. Vendored, not
// cross-repo-imported, because Popty's Vercel build is single-repo.
import { composeSentenceArc, loadStage0ClipMaps, DEFAULT_STAGE0 } from '../../lib/podEngine'

// ── audio (the deployed learning-app proxy; popty.app doesn't serve /api/audio) ──
const AUDIO_BASE = 'https://saysomethingin.app/api/audio'
const DEFAULT_GAP_MS = 350

// ── config fallbacks ────────────────────────────────────────────────────────
// Used only when the course has no saved `pods`/`stage0` config row.
const FALLBACK_STAGE_PLAYLIST = {
  1: ['ps', 'explainer', 'ps'],
  2: ['ps', 'trans', 'ps'],
  3: ['ps', 'trans', 'ps', 'ps2x'],
  4: ['ps', 'trans', 'ps2x', 'ps2x'],
  5: ['ps', 'trans', 'ps2x'],
  6: ['ps2x', 'trans', 'ps2x'],
  7: ['ps', 'ps2x'],
  8: ['ps2x', 'ps2x'],
  9: ['ps2x'],
}

// The ladder specified with Tom on 2026-07-01: Stage-0 breakdown run twice, the
// separate whole-sentence explainer stage removed (the explainer lives ONLY in
// Stage 0), and a t·k·t·t opener before 2× enters.
const PROPOSED_STAGE_PLAYLIST = {
  1: ['ps', 'trans', 'ps', 'ps'], //     t · k · t · t
  2: ['ps', 'trans', 'ps', 'ps2x'], //   t · k · t · t@2×
  3: ['ps', 'trans', 'ps2x', 'ps2x'], // t · k · t@2× · t@2×
  4: ['ps', 'trans', 'ps2x'], //         t · k · t@2×
  5: ['ps2x', 'trans', 'ps2x'], //       t@2× · k · t@2×
  6: ['ps', 'ps2x'], //                  t · t@2×
  7: ['ps2x', 'ps2x'], //                t@2× · t@2×
  8: ['ps2x'], //                        t@2×  (eternal)
}

// ── role display ────────────────────────────────────────────────────────────
const ROLE_META = {
  ps: { short: 'T', cls: 'r-target', title: 'target · 1×' },
  ps08x: { short: 'T', cls: 'r-target', title: 'target · 0.8×' },
  ps15x: { short: 'T', cls: 'r-target', title: 'target · 1.5×' },
  ps2x: { short: 'T', cls: 'r-target', title: 'target · 2×' },
  trans: { short: 'K', cls: 'r-known', title: 'known (meaning)' },
  explainer: { short: 'Ex', cls: 'r-explainer', title: 'chunk-by-chunk explainer' },
}
const roleMeta = (r) => ROLE_META[r] || { short: r, cls: 'r-other', title: r }

// ── state ───────────────────────────────────────────────────────────────────
const selectedCourseCode = ref('')
const loading = ref(false)
const error = ref('')
const sentences = ref([]) // listening_pod_sentences rows
const selectedIdx = ref(0)
const glossMap = ref(new Map())
const targetClipMap = ref(new Map())

// tunable config (starts from live, editable in-session, never written back)
const labStage0 = ref(clone(DEFAULT_STAGE0))
const labStagePlaylist = ref(clone(FALLBACK_STAGE_PLAYLIST))
const liveStage0 = ref(clone(DEFAULT_STAGE0))
const liveStagePlaylist = ref(clone(FALLBACK_STAGE_PLAYLIST))
const activePreset = ref('live')

// JSON editors (mirrors of the reactive config, parsed on edit)
const stagePlaylistJson = ref('')
const stage0Json = ref('')
const jsonError = reactive({ playlist: '', stage0: '' })

// playback
const currentAudio = ref(null)
let stopToken = 0
const isPlaying = ref(false)
const playingIdx = ref(-1)
const copied = ref(false)

function clone(o) {
  return JSON.parse(JSON.stringify(o))
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

const selectedSentence = computed(() => sentences.value[selectedIdx.value] || null)

// The whole acquisition arc for the selected line — composed by the REAL engine.
const arc = computed(() => {
  const s = selectedSentence.value
  if (!s) return []
  let plays = []
  try {
    plays = composeSentenceArc(s, s.global_order, {
      stage0: labStage0.value,
      glossMap: glossMap.value,
      targetClipMap: targetClipMap.value,
      stagePlaylist: labStagePlaylist.value,
    })
  } catch (e) {
    console.warn('[pod-lab] compose failed:', e)
    return []
  }
  plays.forEach((p, i) => {
    p._idx = i
  })
  return plays
})

// Group the flat arc into stages (Stage 0 sub-grouped by tier) for display.
const groups = computed(() => {
  const out = []
  let cur = null
  for (const p of arc.value) {
    const key = p.stage === 0 ? `0:${p.tier}` : `s${p.stage}`
    if (!cur || cur.key !== key) {
      cur = {
        key,
        label: p.stage === 0 ? `Stage 0 · ${p.tier || 'breakdown'}` : `Stage ${p.stage}`,
        isStage0: p.stage === 0,
        plays: [],
      }
      out.push(cur)
    }
    cur.plays.push(p)
  }
  return out
})

const atomCount = computed(() => {
  const m = selectedSentence.value?.atom_map
  return Array.isArray(m) ? m.filter((a) => a && a.kind === 'atom').length : 0
})

// ── loading ─────────────────────────────────────────────────────────────────
async function loadLiveConfig() {
  try {
    const res = await fetch('/api/algorithm-config')
    if (res.ok) {
      const { rows } = await res.json()
      const byKey = Object.fromEntries((rows || []).map((r) => [r.key, r.config]))
      if (byKey.stage0 && Array.isArray(byKey.stage0.tiers)) {
        liveStage0.value = clone(byKey.stage0)
      }
      if (byKey.pods && byKey.pods.stagePlaylist) {
        liveStagePlaylist.value = clone(byKey.pods.stagePlaylist)
      }
    }
  } catch (e) {
    console.warn('[pod-lab] live config load failed (using fallbacks):', e)
  }
  // ALWAYS seed the editors — even when the live-config fetch fails, the
  // fallback ladder must land in the JSON editors or they render empty.
  applyPreset('live')
}

async function onCoursePick(code) {
  selectedCourseCode.value = code
  if (code) await loadCourse(code)
}

async function loadCourse(courseCode) {
  loading.value = true
  error.value = ''
  sentences.value = []
  selectedIdx.value = 0
  stop()
  try {
    const sb = await import('../../services/supabase').then((m) => m.supabase)
    if (!sb) throw new Error('Supabase not configured')

    const { data: rows, error: podErr } = await sb
      .from('listening_pod_sentences')
      .select(
        'id, global_order, speaker, target_text, known_text, target_audio_id, known_audio_id, explainer_audio_id, glue_to_next, atom_map',
      )
      .eq('pod_id', `${courseCode}:pod-0`)
      .order('global_order', { ascending: true })
    if (podErr) throw podErr
    sentences.value = rows || []

    // Course-wide Stage-0 lookup maps — the SAME ones the learner's composer
    // uses, resolved by the SAME core function.
    const maps = await loadStage0ClipMaps(sb, courseCode)
    glossMap.value = maps.glossMap
    targetClipMap.value = maps.targetClipMap

    if (!sentences.value.length) error.value = `No pod sentences found for ${courseCode}:pod-0.`
  } catch (e) {
    error.value = e?.message || String(e)
  } finally {
    loading.value = false
  }
}

// ── presets + JSON editors ──────────────────────────────────────────────────
function applyPreset(which) {
  activePreset.value = which
  if (which === 'live') {
    labStage0.value = clone(liveStage0.value)
    labStagePlaylist.value = clone(liveStagePlaylist.value)
  } else if (which === 'proposed') {
    const s0 = clone(liveStage0.value)
    // Stage 0 run twice (the breakdown lives here; explainer removed from Stages 1–8).
    ;(s0.tiers || []).forEach((t) => {
      t.visits = 2
    })
    labStage0.value = s0
    labStagePlaylist.value = clone(PROPOSED_STAGE_PLAYLIST)
  }
  syncJsonFromConfig()
}

function syncJsonFromConfig() {
  stagePlaylistJson.value = JSON.stringify(labStagePlaylist.value, null, 2)
  stage0Json.value = JSON.stringify(labStage0.value, null, 2)
  jsonError.playlist = ''
  jsonError.stage0 = ''
}

function onPlaylistJsonInput() {
  try {
    const parsed = JSON.parse(stagePlaylistJson.value)
    labStagePlaylist.value = parsed
    jsonError.playlist = ''
    activePreset.value = 'custom'
  } catch (e) {
    jsonError.playlist = e.message
  }
}
function onStage0JsonInput() {
  try {
    const parsed = JSON.parse(stage0Json.value)
    labStage0.value = parsed
    jsonError.stage0 = ''
    activePreset.value = 'custom'
  } catch (e) {
    jsonError.stage0 = e.message
  }
}

function exportJson() {
  const payload = {
    stage0: labStage0.value,
    pods: { stagePlaylist: labStagePlaylist.value },
  }
  navigator.clipboard.writeText(JSON.stringify(payload, null, 2)).then(() => {
    copied.value = true
    setTimeout(() => (copied.value = false), 1600)
  })
}

// ── playback ────────────────────────────────────────────────────────────────
function audioUrl(id) {
  return `${AUDIO_BASE}/${id}?courseId=${encodeURIComponent(selectedCourseCode.value)}`
}
function playClip(id, speed) {
  return new Promise((resolve) => {
    if (!id) return resolve()
    const a = new Audio(audioUrl(id))
    a.playbackRate = speed || 1
    currentAudio.value = a
    a.onended = resolve
    a.onerror = resolve
    a.play().catch(resolve)
  })
}
async function playPlays(plays) {
  stop()
  const myToken = ++stopToken
  isPlaying.value = true
  for (const p of plays) {
    if (myToken !== stopToken) break
    playingIdx.value = p._idx
    await playClip(p.audioId, p.playbackSpeed)
    if (myToken !== stopToken) break
    await sleep(p.gapAfterMs != null ? p.gapAfterMs : DEFAULT_GAP_MS)
  }
  if (myToken === stopToken) {
    isPlaying.value = false
    playingIdx.value = -1
  }
}
const playWholeArc = () => playPlays(arc.value)
const playGroup = (g) => playPlays(g.plays)
const playOne = (p) => playPlays([p])
function stop() {
  stopToken++
  if (currentAudio.value) {
    currentAudio.value.pause()
    currentAudio.value = null
  }
  isPlaying.value = false
  playingIdx.value = -1
}

// stop audio if the line changes out from under a running playback
watch(selectedIdx, stop)

loadLiveConfig()
</script>

<template>
  <div class="podlab">
    <nav class="admin-crumbs">
      <router-link to="/admin/configs">Configs</router-link>
      <span class="sep">/</span>
      <span class="cur">Pod Lab</span>
    </nav>

    <header class="lab-head">
      <h1>Pod Lab</h1>
      <p class="sub">
        Hear one pod line's whole acquisition arc — Stage-0 breakdown then every whole-sentence
        stage — assembled by the <strong>real</strong> <code>@ssi/core/pods</code> engine the
        learner runs. Tune the ladder, hear the effect, export the config.
      </p>
      <p class="safety">
        Preview &amp; export only — this Lab never writes <code>algorithm_config</code> (those writes
        hit every learner within ~5&nbsp;min). Export the tuned JSON and apply it deliberately.
      </p>
    </header>

    <div class="pickers">
      <CoursePicker
        :modelValue="selectedCourseCode"
        @update:modelValue="onCoursePick"
        placeholder="Search courses…"
      />
      <span v-if="loading" class="chip">loading…</span>
      <span v-else-if="sentences.length" class="chip ok">{{ sentences.length }} lines · pod-0</span>
      <span v-if="error" class="chip err">{{ error }}</span>
    </div>

    <div v-if="sentences.length" class="cols">
      <!-- LEFT: line + config -->
      <section class="panel">
        <label class="field">
          <span class="lbl">Line</span>
          <select v-model.number="selectedIdx" class="select">
            <option v-for="(s, i) in sentences" :key="s.id || i" :value="i">
              {{ s.global_order }}. {{ s.target_text }}
            </option>
          </select>
        </label>

        <div v-if="selectedSentence" class="line-card">
          <div class="tgt">{{ selectedSentence.target_text }}</div>
          <div class="knw">{{ selectedSentence.known_text }}</div>
          <div class="meta">
            {{ atomCount }} atom{{ atomCount === 1 ? '' : 's' }}
            <span v-if="!selectedSentence.explainer_audio_id" class="muted"> · no explainer clip</span>
            <span v-if="selectedSentence.glue_to_next" class="muted"> · glues on</span>
          </div>
        </div>

        <div class="config">
          <div class="cfg-head">
            <span class="lbl">Ladder config</span>
            <div class="presets">
              <button :class="{ on: activePreset === 'live' }" @click="applyPreset('live')">Live</button>
              <button :class="{ on: activePreset === 'proposed' }" @click="applyPreset('proposed')">
                Proposed (07-01)
              </button>
              <span v-if="activePreset === 'custom'" class="chip">custom</span>
            </div>
          </div>

          <label class="field">
            <span class="lbl small">Stages 1–N · stagePlaylist</span>
            <textarea
              v-model="stagePlaylistJson"
              class="json"
              rows="12"
              spellcheck="false"
              @input="onPlaylistJsonInput"
            ></textarea>
            <span v-if="jsonError.playlist" class="chip err">{{ jsonError.playlist }}</span>
          </label>

          <details class="adv">
            <summary>Stage 0 config (advanced)</summary>
            <p class="note">
              <code>visits</code> / stage <code>durations</code> govern main-flow pacing (how long a
              line rests at each stage across laps); the arc below plays each stage <em>once</em> —
              the whole vertical. Editing <code>gaps</code> changes the audible breakdown pacing.
            </p>
            <textarea
              v-model="stage0Json"
              class="json"
              rows="10"
              spellcheck="false"
              @input="onStage0JsonInput"
            ></textarea>
            <span v-if="jsonError.stage0" class="chip err">{{ jsonError.stage0 }}</span>
          </details>

          <button class="export" @click="exportJson">
            {{ copied ? 'Copied ✓' : 'Copy tuned config JSON' }}
          </button>
        </div>
      </section>

      <!-- RIGHT: the assembly -->
      <section class="panel">
        <div class="transport">
          <button class="play-all" :disabled="!arc.length" @click="playWholeArc">▶ Play whole arc</button>
          <button class="stop" :disabled="!isPlaying" @click="stop">■ Stop</button>
          <span class="legend">
            <span class="chip-role r-target">T target</span>
            <span class="chip-role r-known">K known</span>
            <span class="chip-role r-explainer">Ex explainer</span>
          </span>
        </div>

        <div v-if="!arc.length" class="empty">
          No arc — the line has no target audio, or the config produced no plays.
        </div>

        <div v-for="g in groups" :key="g.key" class="stage-row" :class="{ s0: g.isStage0 }">
          <div class="stage-head">
            <button class="mini" @click="playGroup(g)">▶</button>
            <span class="stage-label">{{ g.label }}</span>
          </div>
          <div class="plays">
            <button
              v-for="p in g.plays"
              :key="p._idx"
              class="playchip"
              :class="[roleMeta(p.playRole).cls, { now: playingIdx === p._idx }]"
              :title="`${roleMeta(p.playRole).title} — ${p.text || ''}`"
              @click="playOne(p)"
            >
              <span class="rl">{{ roleMeta(p.playRole).short }}</span>
              <span class="spd">{{ p.playbackSpeed }}×</span>
            </button>
          </div>
        </div>
      </section>
    </div>

    <p v-else-if="!loading && selectedCourseCode" class="empty pad">
      No pod-0 for this course yet.
    </p>
    <p v-else-if="!selectedCourseCode" class="empty pad">Pick a course to load its pod.</p>
  </div>
</template>

<style scoped>
.podlab {
  max-width: 1180px;
  margin: 0 auto;
  padding: 20px 22px 60px;
  color: var(--color-paper, var(--ink));
}
.admin-crumbs {
  font-size: 0.8125rem;
  margin-bottom: 10px;
}
.admin-crumbs a {
  color: var(--accent-2);
  text-decoration: none;
}
.admin-crumbs a:hover {
  color: #6ee7b7;
}
.admin-crumbs .sep {
  margin: 0 6px;
  color: var(--surface-3);
}
.admin-crumbs .cur {
  color: var(--muted);
}
.lab-head h1 {
  margin: 0 0 6px;
  font-size: 1.25rem;
  letter-spacing: -0.01em;
}
.lab-head .sub {
  margin: 0 0 8px;
  max-width: 780px;
  color: var(--muted);
  font-size: 0.875rem;
  line-height: 1.5;
}
.lab-head .safety {
  margin: 0 0 18px;
  font-size: 0.8125rem;
  color: #fbbf24;
  background: rgba(251, 146, 60, 0.12);
  border: 1px solid rgba(251, 146, 60, 0.3);
  border-radius: 8px;
  padding: 8px 12px;
  max-width: 780px;
}
[data-theme='light'] .lab-head .safety {
  color: #92400e;
}
code {
  background: var(--surface-2);
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 0.9em;
  font-family: var(--font-mono, ui-monospace, Menlo, monospace);
}
.pickers {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
}
.chip {
  font-size: 12px;
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--surface-2);
  color: var(--muted);
}
.chip.ok {
  background: rgba(52, 211, 153, 0.14);
  color: var(--accent-2);
}
.chip.err {
  background: rgba(248, 113, 113, 0.12);
  color: var(--danger);
}
.cols {
  display: grid;
  grid-template-columns: minmax(360px, 1fr) minmax(360px, 1.15fr);
  gap: 20px;
  align-items: start;
}
.panel {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 16px 18px;
}
.field {
  display: block;
  margin-bottom: 14px;
}
.lbl {
  display: block;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 6px;
}
.lbl.small {
  font-weight: 500;
  color: var(--muted);
}
.select {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: 8px;
  font-size: 14px;
  background: var(--surface-2);
  color: var(--ink);
}
.line-card {
  background: var(--surface-2);
  border-radius: 10px;
  padding: 12px 14px;
  margin-bottom: 16px;
}
.line-card .tgt {
  font-size: 18px;
  font-weight: 600;
}
.line-card .knw {
  color: var(--muted);
  margin-top: 2px;
}
.line-card .meta {
  font-size: 12px;
  color: var(--muted);
  margin-top: 8px;
}
.muted {
  color: var(--faint);
}
.cfg-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.presets {
  display: flex;
  gap: 6px;
  align-items: center;
}
.presets button {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: transparent;
  color: var(--muted);
  cursor: pointer;
}
.presets button:hover {
  color: var(--ink);
  border-color: var(--muted);
}
.presets button.on {
  background: rgba(52, 211, 153, 0.15);
  color: var(--accent-2);
  border-color: var(--accent-2);
}
.json {
  width: 100%;
  font-family: var(--font-mono, ui-monospace, Menlo, monospace);
  font-size: 12px;
  line-height: 1.5;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 10px;
  background: var(--canvas);
  color: var(--ink);
  resize: vertical;
}
.adv {
  margin: 8px 0 14px;
}
.adv summary {
  cursor: pointer;
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 8px;
}
.note {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.5;
  margin: 0 0 8px;
}
.export {
  width: 100%;
  padding: 9px;
  border-radius: 8px;
  border: 1px solid var(--accent-2);
  color: var(--accent-2);
  background: transparent;
  font-weight: 600;
  cursor: pointer;
}
.export:hover {
  background: rgba(52, 211, 153, 0.12);
}
.transport {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.play-all {
  padding: 8px 14px;
  border-radius: 8px;
  border: none;
  background: var(--accent-2);
  color: var(--canvas);
  font-weight: 600;
  cursor: pointer;
}
.play-all:disabled {
  opacity: 0.5;
  cursor: default;
}
.stop {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: transparent;
  color: var(--ink);
  cursor: pointer;
}
.stop:disabled {
  opacity: 0.5;
  cursor: default;
}
.legend {
  display: flex;
  gap: 6px;
  margin-left: auto;
}
.chip-role {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
}
.stage-row {
  border-top: 1px solid var(--line);
  padding: 10px 0;
}
.stage-row.s0 {
  background: rgba(139, 92, 246, 0.08);
  border-radius: 8px;
  padding: 10px 8px;
  border-top: none;
  margin-bottom: 2px;
}
.stage-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.mini {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  border: 1px solid var(--line);
  background: var(--surface-2);
  color: var(--ink);
  cursor: pointer;
  font-size: 11px;
}
.stage-label {
  font-size: 13px;
  font-weight: 600;
}
.plays {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.playchip {
  display: inline-flex;
  align-items: baseline;
  gap: 4px;
  padding: 5px 9px;
  border-radius: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  font-size: 13px;
}
.playchip .spd {
  font-size: 10px;
  opacity: 0.7;
}
.playchip.now {
  outline: 2px solid var(--accent-2);
  outline-offset: 1px;
}
.r-target {
  background: rgba(59, 130, 246, 0.16);
  color: #93c5fd;
}
.r-known {
  background: rgba(251, 191, 36, 0.14);
  color: #fbbf24;
}
.r-explainer {
  background: rgba(167, 139, 250, 0.16);
  color: #c4b5fd;
}
.r-other {
  background: var(--surface-2);
  color: var(--muted);
}
[data-theme='light'] .r-target {
  color: #1d4ed8;
}
[data-theme='light'] .r-known {
  color: #92400e;
}
[data-theme='light'] .r-explainer {
  color: #6d28d9;
}
.empty {
  color: var(--muted);
  font-size: 14px;
}
.empty.pad {
  padding: 30px 4px;
}
</style>
