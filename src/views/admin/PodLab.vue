<script setup>
/**
 * Pod Lab — /admin/labs/pods
 *
 * A tuning + audition surface for the Layer-2 pod acquisition ladder, sibling to
 * the Pause Lab (/admin/labs/speaking). Two modes on the same real line:
 * THE LADDER — the unified climb (Tom 2026-07-03): fusion rungs from finest
 * units to the whole turn, then the speed cascade to pure 2× — and STAGE ARC,
 * today's live engine output, for comparison.
 *
 * No drift by construction: the arc is composed by `composeSentenceArc` imported
 * straight from `@ssi/core/pods` — the exact function the learner's main flow
 * runs. This is the surface that lets us retire the hand-ported copy in
 * src/lib/podArcCompose.js.
 *
 * CONFIG: preview/export only. `algorithm_config` writes are immediately global
 * to every learner (~5-min cache TTL, no draft/env split), so this Lab never
 * writes config — it reads the LIVE config as a starting point, lets you tune
 * in-session, and exports the tuned JSON for a human to apply deliberately.
 *
 * THAT IS NOT THE SAME AS "SAFETY: preview/export only", which is what this
 * header said until 2026-09-01. The Lab has four other writes, and one of them
 * lands on a learner today: PATCH /api/pod-fine-map sets atom_map_fine, which
 * the learner's Drill reads live off listening_pod_sentences on every fetch
 * (useListeningPods.ts:179 → buildFusionGroups). The other three — casting,
 * voice approval, and the sample-clip fill — are deferred to the next render.
 * The blast-radius banner on the page states the highest of the four, which is
 * the only honest thing a single label can state. See
 * src/components/admin/blastRadius.js.
 */
import { ref, computed, reactive, watch } from 'vue'
import BlastRadiusBanner from '@/components/admin/BlastRadiusBanner.vue'
import LabCrumbs from '@/components/LabCrumbs.vue'
import CoursePicker from '../../components/CoursePicker.vue'
import ConsentStep from './voicelab/ConsentStep.vue'
// Vendored VERBATIM from @ssi/core/pods (the engine the learner's main flow
// runs) — see src/lib/podEngine + tools/sync-pod-engine.sh. Vendored, not
// cross-repo-imported, because Popty's Vercel build is single-repo.
import { composeSentenceArc, loadStage0ClipMaps, DEFAULT_STAGE0, resolveAtoms } from '../../lib/podEngine'
// Sample generation goes to Popty's backend (phase-8 proxy), not the Vercel
// /api routes the rest of this page uses — same helper pair as PodDetailView.
import { getApiUrl } from '@/services/api.js'
import { useAuth } from '@/composables/useAuth.js'
import { dirFor } from '@/utils/textDirection.js'

const { getAccessToken } = useAuth()

// ── audio (the deployed learning-app proxy; popty.app doesn't serve /api/audio) ──
const AUDIO_BASE = 'https://saysomethingin.app/api/audio'
const DEFAULT_GAP_MS = 350

// ── the gaps ────────────────────────────────────────────────────────────────
// The four pauses the LEARNER actually hears between pod clips, live in
// `algorithm_config` row key='pods'. Until 2026-08-24 this Lab auditioned every
// stage at a flat hardcoded 350 ms, so it could not hear the pacing it was
// meant to be tuning — the live row has carried 0 on all four since Aran wrote
// it on 2026-06-30, and the fade schedule launched on that hard cut (Tom,
// 2026-08-24). These are the shipped fallbacks, kept in step with DEFAULT_PODS
// in ssi-learning-app packages/player-vue/src/composables/useAlgorithmConfig.ts;
// they apply only when the live row omits a field.
const FALLBACK_GAPS = {
  gapSuperTightMs: 100, // known→target, target→target
  gapTightMs: 200, //     target→known
  gapGluedMs: 300, //     chunk → glued chunk
  gapBetweenMs: 1000, //  sentence → next sentence, and stage → next stage
}
const GAP_FIELDS = [
  { key: 'gapSuperTightMs', label: 'known → target, target → target' },
  { key: 'gapTightMs', label: 'target → known' },
  { key: 'gapGluedMs', label: 'chunk → glued chunk' },
  { key: 'gapBetweenMs', label: 'sentence → sentence, stage → stage' },
]

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
const fineKnownMap = ref(new Map()) // text_normalized → pod_fine_known clip id

// mirror of services/shared/text-normalize.cjs normalizeForAudio — every
// lookup against course_audio.text_normalized must use exactly this
const normForAudio = (t) =>
  (t || '').toLowerCase().trim().replace(/\s+/g, ' ').replace(/[.!。！]+$/, '')

// tunable config (starts from live, editable in-session, never written back)
const labStage0 = ref(clone(DEFAULT_STAGE0))
const labStagePlaylist = ref(clone(FALLBACK_STAGE_PLAYLIST))
const liveStage0 = ref(clone(DEFAULT_STAGE0))
const liveStagePlaylist = ref(clone(FALLBACK_STAGE_PLAYLIST))
const labGaps = ref(clone(FALLBACK_GAPS))
const liveGaps = ref(clone(FALLBACK_GAPS))
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
const playingSample = ref('') // casting mode: the sample clip currently sounding
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
      if (byKey.pods) {
        // `??`, never `||` — every live gap is 0 and 0 is falsy; `||` would
        // silently audition the fade at the shipped 100/200/300/1000 ms and
        // the hard cut Tom launched on would never be heard in this Lab.
        const g = {}
        for (const { key } of GAP_FIELDS) g[key] = byKey.pods[key] ?? FALLBACK_GAPS[key]
        liveGaps.value = g
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
  candidates.value = [] // candidates are per-course page state
  stop()
  try {
    const sb = await import('../../services/supabase').then((m) => m.supabase)
    if (!sb) throw new Error('Supabase not configured')

    // Casting FIRST, because it is what tells us which pod holds the course's
    // current pod-0 content. Hard-coding `<course>:pod-0` is what put a
    // 142-line snapshot under Tom's ear while the live pod held 232, and it
    // shows nothing at all for Welsh, whose pod-0 was emptied when the pod was
    // gated (services/pod-voice-approvals.cjs#resolveCurrentPod0).
    //
    // It is awaited, not fired-and-forgotten: the sentence query depends on it.
    await loadCasting(courseCode)
    // The server resolves this (services/pod-voice-approvals.cjs
    // #resolveCurrentPod0, which prefers a working copy, then pod-1, then
    // pod-0). The local fallback only fires if that call failed outright.
    const podId = casting.value?.current_pod_id
      || (casting.value?.pods || []).map((p) => p.id).find(Boolean)
      || `${courseCode}:pod-0`
    currentPodId.value = podId

    // The voice picker's inventory. Not awaited: the dropdowns fill in when it
    // lands, and nothing else on the page depends on it.
    loadVoicePicker(courseCode)

    const { data: rows, error: podErr } = await sb
      .from('listening_pod_sentences')
      .select(
        'id, global_order, speaker, target_text, known_text, target_audio_id, known_audio_id, explainer_audio_id, glue_to_next, atom_map, atom_map_fine, window_known_map, takeg_audio_ids, sentence_audio_ids, sentence_known_audio_ids',
      )
      .eq('pod_id', podId)
      .order('global_order', { ascending: true })
    if (podErr) throw podErr
    sentences.value = rows || []

    // WHICH VOICE ACTUALLY RENDERED EACH CLIP. Not the cast's answer — the
    // clip's own row. A pod's audio accumulates over months while the casting
    // moves under it, so the two disagree constantly: on
    // spa_for_eng:pod-0-unrecorded only 16 of 119 target clips were rendered on
    // the current two-voice cast; the other 103 are five older voices from
    // June. Labelling a June clip with the current cast's voice name, and then
    // asking Tom to approve that casting on the strength of it, is a lie in
    // exactly the place a judgement is being made.
    await loadClipVoices(sb, sentences.value)

    // Course-wide Stage-0 lookup maps — the SAME ones the learner's composer
    // uses, resolved by the SAME core function.
    const maps = await loadStage0ClipMaps(sb, courseCode)
    glossMap.value = maps.glossMap
    targetClipMap.value = maps.targetClipMap

    // Fine-known clips: plain English per unit gloss / window translation,
    // text-keyed (same normalisation as course_audio.text_normalized).
    const { data: fineRows } = await sb
      .from('course_audio')
      .select('id, text_normalized')
      .eq('course_code', courseCode)
      .eq('role', 'pod_fine_known')
    fineKnownMap.value = new Map((fineRows || []).map((r) => [r.text_normalized, r.id]))

    if (!sentences.value.length) error.value = `No pod sentences found for ${podId}.`
  } catch (e) {
    error.value = e?.message || String(e)
  } finally {
    loading.value = false
  }
}

// audio_id → { voice_id, created_at } straight off course_audio.
const clipVoices = ref(new Map())

async function loadClipVoices(sb, rows) {
  clipVoices.value = new Map()
  const ids = [...new Set(rows.flatMap((s) => [s.target_audio_id, s.known_audio_id]).filter(Boolean))]
  if (!ids.length) return
  const map = new Map()
  // Chunked: a few hundred uuids in one .in() makes a URL long enough to be
  // refused by the gateway.
  for (let i = 0; i < ids.length; i += 100) {
    const { data } = await sb.from('course_audio').select('id, voice_id, created_at').in('id', ids.slice(i, i + 100))
    for (const r of data || []) map.set(r.id, { voice_id: r.voice_id, created_at: r.created_at })
  }
  clipVoices.value = map
}

// `eve` and `xai_eve` are ONE voice — the provider prefix is a spelling, not
// an identity, and raw string equality silently misses ~14% of a layer.
const bareVoiceId = (v) => String(v || '').toLowerCase().replace(/^(xai_|azure_|elevenlabs_|openai_)/, '')

// ── presets + JSON editors ──────────────────────────────────────────────────
function applyPreset(which) {
  activePreset.value = which
  if (which === 'live') {
    labStage0.value = clone(liveStage0.value)
    labStagePlaylist.value = clone(liveStagePlaylist.value)
    labGaps.value = clone(liveGaps.value)
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

/** The 2026-08-24 launch pacing: no pause anywhere. The starting point for
 *  tuning by ear — every other value is reached from here. */
function applyHardCut() {
  labGaps.value = { gapSuperTightMs: 0, gapTightMs: 0, gapGluedMs: 0, gapBetweenMs: 0 }
  activePreset.value = 'custom'
}

/**
 * The gap after `curr`, in ms — a faithful mirror of the LEARNER'S rule
 * (podGapMs, ssi-learning-app packages/player-vue/src/components/
 * LearningPlayer.vue). Keep the two in step: an audition that paces
 * differently from the main flow is worse than no audition, because it sounds
 * authoritative. The one Lab-only clause is the stage boundary — the main flow
 * meets it as a lap boundary a whole session apart, whereas the Lab plays the
 * rungs back to back, so it borrows the between-sentences gap.
 */
function gapAfter(curr, next) {
  if (!next) return 0
  // Stage-0 plays carry their own config-driven gap; honour it verbatim.
  if (curr.gapAfterMs != null) return curr.gapAfterMs
  const g = labGaps.value
  if (curr.stage !== next.stage) return g.gapBetweenMs
  const cIsTarget = curr.playRole !== 'trans' && curr.playRole !== 'explainer'
  const nIsKnown = next.playRole === 'trans' || next.playRole === 'explainer'
  if (cIsTarget && nIsKnown) return g.gapTightMs // target → known
  return g.gapSuperTightMs //                      known → target, target → target
}

function exportJson() {
  const payload = {
    stage0: labStage0.value,
    pods: { stagePlaylist: labStagePlaylist.value, ...labGaps.value },
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
// clip = a course_audio id, or { id, startMs, endMs } — a timed slice of one
// (how every Take G chunk plays: one gapped take, ms spans, no per-chunk files)
function playClip(clip, speed) {
  return new Promise((resolve) => {
    if (!clip) return resolve()
    const slice = typeof clip === 'object'
    const a = new Audio(audioUrl(slice ? clip.id : clip))
    a.playbackRate = speed || 1
    currentAudio.value = a
    let done = false
    const finish = () => { if (!done) { done = true; resolve() } }
    a.onended = finish
    a.onerror = finish
    if (slice) {
      a.currentTime = clip.startMs / 1000
      const endS = clip.endMs / 1000
      // timeupdate only fires ~4×/s — it overshoots into the next word. Poll
      // at frame rate and back-stop with a rate-scaled wall timer.
      const tick = () => {
        if (done) return
        if (a.currentTime >= endS) { a.pause(); finish(); return }
        requestAnimationFrame(tick)
      }
      a.onplaying = () => requestAnimationFrame(tick)
      setTimeout(() => {
        if (!done) { a.pause(); finish() }
      }, (clip.endMs - clip.startMs) / (speed || 1) + 700)
    }
    a.play().catch(finish)
  })
}
async function playPlays(plays) {
  stop()
  const myToken = ++stopToken
  isPlaying.value = true
  for (let i = 0; i < plays.length; i++) {
    const p = plays[i]
    if (myToken !== stopToken) break
    playingIdx.value = p._idx
    await playClip(p.audioId, p.playbackSpeed)
    if (myToken !== stopToken) break
    // The learner's own gap rule, from the editable gap config — NOT a flat
    // 350 ms. This is what makes the Lab an audition of the real pacing.
    await sleep(gapAfter(p, plays[i + 1] || null))
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
  playingStepKey.value = ''
  playingSample.value = ''
}

// ── THE UNIFIED LADDER — Stage 0 → pure-2× turn (Tom 2026-07-03) ────────────
// One ladder, one pattern. The stage number IS the fusion level until the
// chunk is the whole turn, then it becomes the speed ramp:
//   Stage 0      finest units, t·k·t·t each, 1×
//   Stage 1..    successive fusions — within sentence first, then sentences
//                conjoin — every chunk t·k·t·t, still 1×
//   Stage k      the chunk IS the whole turn: t·k·t·t at 1× ≡ engine Stage 1
//   Stage k+1..  the locked speed cascade (engine Stages 2–8) on the turn,
//                topping out at pure t@2× — no known left: immersion emerges,
//                mature turns segue turn → turn.
// The TURN never stops being the traversal unit (sentences don't travel
// independently — that's what keeps dialogue flow coherent), so the whole pod
// can ride one stage counter; short sentences repeat their whole t·k·t·t while
// longer siblings climb. No explainer stage, no 'means' formula anywhere.
// This supersedes v3's per-sentence Stage-1-8 cascade (62317b5d).
//
// AUDIO HONESTY: where the course has been through the Take G run
// (render-take-g → slice-take-g → render-fine-knowns → author-window-knowns),
// every sub-sentence chunk is a real ms SLICE of its sentence's gapped Take G
// render, and every known is the real fine-known clip (plain unit gloss /
// authored window translation, coach voice). Chips fall back to the old
// dashed approximations (butted unit clips / legacy "means X") only where a
// course hasn't had the run. Conjoined-sentence rungs butt real takes by
// design; sentence wholes and the turn play their real takes.

const mode = ref('shapes') // 'shapes' = the unified ladder | 'arc' = live engine arc
const unitsSource = ref('fine') // 'fine' (draft atom_map_fine, default) | 'live' (atom_map)
const fusionMode = ref('pairwise') // 'pairwise' (Aran: disjoint pairs L→R) | 'chained' (Tom: adjacent windows share an edge chunk)
const playingStepKey = ref('')

const GAP_BETWEEN_STEPS = 700
const GAP_AFTER_GLOSS = 500
const GAP_INTRA_FUSE = 120

// Does ANY line of this pod carry a draft fine map? (gates the units toggle)
const hasFine = computed(() => sentences.value.some((s) => Array.isArray(s.atom_map_fine) && s.atom_map_fine.length))
const usingFine = computed(() => unitsSource.value === 'fine' && Array.isArray(selectedSentence.value?.atom_map_fine))

const shapeAtoms = computed(() => {
  const s = selectedSentence.value
  if (!s) return []
  const map = usingFine.value ? s.atom_map_fine : s.atom_map
  const resolved = resolveAtoms(map, glossMap.value, targetClipMap.value)
  // carry the Take G ms spans through (resolveAtoms keeps atom+passthrough in
  // order, so a positional zip against the same filter is exact)
  const src = (map || []).filter((e) => e.kind === 'atom' || e.kind === 'passthrough')
  return resolved.map((a, i) => ({
    ...a,
    target_start_ms: src[i]?.target_start_ms ?? null,
    target_end_ms: src[i]?.target_end_ms ?? null,
  }))
})

// One fusion step over spans of unit indices.
//   pairwise: disjoint pairs L→R, an odd tail stands alone until the next rung
//   chained:  adjacent windows share an edge chunk ("ma non posso" /
//             "non posso parlare") — gentler climb, one more rung per size
function fuseSpans(spans, fusion) {
  if (spans.length <= 1) return spans
  const out = []
  if (fusion === 'chained') {
    for (let i = 0; i < spans.length - 1; i++) out.push({ start: spans[i].start, end: spans[i + 1].end })
  } else {
    for (let i = 0; i < spans.length; i += 2)
      out.push({ start: spans[i].start, end: spans[Math.min(i + 1, spans.length - 1)].end })
  }
  return out
}

// Every fusion level over a starting span list: initialSpans → … → the whole.
// initialSpans is the FINEST the ladder ever gets — for sentence fusion this
// is S-LEGO spans (never sub-S-LEGO atom cuts); for the turn-conjoin ladder
// it's one span per sentence group.
function spanLadder(initialSpans, fusion) {
  let spans = initialSpans
  const levels = [spans]
  while (spans.length > 1) {
    spans = fuseSpans(spans, fusion)
    levels.push(spans)
  }
  return levels
}

const clipList = (take) => (Array.isArray(take) ? take : [take])

// t·k·t·t for one chunk — the ONE pattern every rung of the ladder plays.
// The known slot is dropped only when there is nothing to say in it.
function tktt(chunk, known) {
  return known && (known.clips.some(Boolean) || known.text)
    ? [chunk, known, { ...chunk }, { ...chunk }]
    : [chunk, { ...chunk }]
}

// Split the atom list into prosodic groups at sentence-terminal punctuation
// ONLY — '…' is NOT a sentence break, it's the canon S-LEGO seam mark (§9a/9b,
// docs/pods/pod-ladder-proposal.md; founder ruling 2026-07-17: S-LEGO seams —
// as marked by the ellipses in the canonical content — are THE definitive
// break places, nothing finer). Boundaries walked once off target_text
// between consecutive atom surfaces, classified 'sentence' | 'sLego' | null,
// and reused both for sentence grouping and for the fusion ladder's rung-0
// spans below — one seam source of truth, no separate hand-drafted map.
const SENTENCE_PUNCT = /[.!?。！？]/
const ELLIPSIS_RE = /…/

function atomBoundaries(s, atoms) {
  const text = s.target_text || ''
  const lower = text.toLowerCase()
  const bounds = new Array(Math.max(atoms.length - 1, 0)).fill(null)
  let cursor = 0
  for (let i = 0; i < atoms.length; i++) {
    const idx = lower.indexOf(atoms[i].targetSurface.toLowerCase(), cursor)
    if (idx !== -1) cursor = idx + atoms[i].targetSurface.length
    if (i < atoms.length - 1) {
      const nextIdx = lower.indexOf(atoms[i + 1].targetSurface.toLowerCase(), cursor)
      const between = nextIdx !== -1 ? text.slice(cursor, nextIdx) : text.slice(cursor)
      if (SENTENCE_PUNCT.test(between)) bounds[i] = 'sentence'
      else if (ELLIPSIS_RE.test(between)) bounds[i] = 'sLego'
    }
  }
  return bounds
}

function atomGroups(atoms, bounds) {
  const groups = [[]]
  atoms.forEach((a, i) => {
    groups[groups.length - 1].push(a)
    if (bounds[i] === 'sentence') groups.push([])
  })
  return groups.filter((g) => g.length)
}

// The S-LEGO spans (local atom-index ranges) inside one post-glue sentence
// group, split ONLY at 'sLego' boundaries. A group with none of its own —
// about 40 of 77 pod-0.5 sentences are single S-LEGOs — comes back as a
// single span covering the whole group, so it never gets a fusion rung of
// its own (rule 4: per-sentence rung depth follows seam count).
function sLegoSpansFromBounds(bounds, gStart, gEnd) {
  const ranges = []
  let start = gStart
  for (let i = gStart; i <= gEnd; i++) {
    if (i === gEnd || bounds[i] === 'sLego') {
      ranges.push({ start: start - gStart, end: i - gStart })
      start = i + 1
    }
  }
  return ranges
}

// Per-sentence takes when the re-split produced them (else null per group).
function groupTakes(s, groups) {
  return Array.isArray(s.sentence_audio_ids) && s.sentence_audio_ids.length === groups.length
    ? s.sentence_audio_ids
    : groups.map(() => null)
}

// ── AT-A-GLANCE PREVIEW — the line list shows canon seams + rung depth ─────
// directly, before a line is ever selected, so the picture is visible while
// scanning rather than only after opening the editor.

// target_text split at every canon '…' — the seam marks themselves, ready to
// render inline (no atoms/audio needed, cheap enough for every row in the list).
function seamPreviewParts(text) {
  const raw = String(text || '').split('…')
  return raw.map((t, i) => ({ text: t, seam: i < raw.length - 1 }))
}

// Cheap rung-count estimate for a row's badge: same boundary + fusion math as
// ladderRungs, over word-surfaces only (no gloss/audio resolution) — a sentence
// with no '…' collapses to 1 fusion level, exactly like the real ladder.
function lightAtomsFor(s) {
  const map = Array.isArray(s.atom_map_fine) && s.atom_map_fine.length ? s.atom_map_fine : s.atom_map
  if (!Array.isArray(map)) return []
  return map
    .filter((e) => e && (e.kind === 'atom' || e.kind === 'passthrough') && e.target_surface)
    .map((e) => ({ targetSurface: e.target_surface }))
}
function sentenceRungDepth(s) {
  const atoms = lightAtomsFor(s)
  if (!atoms.length) return null
  const bounds = atomBoundaries(s, atoms)
  const groups = atomGroups(atoms, bounds)
  if (!groups.length) return null
  const offsets = []
  let off = 0
  for (const g of groups) { offsets.push(off); off += g.length }
  const ladders = groups.map((g, gi) => spanLadder(sLegoSpansFromBounds(bounds, offsets[gi], offsets[gi] + g.length - 1), 'pairwise'))
  let stageN = Math.max(...ladders.map((l) => l.length))
  if (groups.length > 1) {
    const groupSpans = groups.map((_, gi) => ({ start: gi, end: gi }))
    stageN += spanLadder(groupSpans, 'pairwise').length - 1
  }
  return stageN + 7 // the locked speed cascade, engine Stages 2–8
}

// The whole unified climb for the selected turn, one entry per rung (= one
// stage = one visit): fusion rungs from finest units to the whole turn, then
// the locked speed cascade. Rung count varies with the turn's fusion depth —
// the speed rungs are the same ladder entered later on long turns.
const ladderRungs = computed(() => {
  const s = selectedSentence.value
  const atoms = shapeAtoms.value
  if (!s || !atoms.length) return []

  // Sentences, with a leading one-unit exclamation ("Ciao!") glued onto the
  // sentence that follows — the drill never strands a bare interjection.
  const bounds = atomBoundaries(s, atoms)
  const rawGroups = atomGroups(atoms, bounds)
  const rawTakes = groupTakes(s, rawGroups)
  const rawKnown =
    Array.isArray(s.sentence_known_audio_ids) && s.sentence_known_audio_ids.length === rawGroups.length
      ? s.sentence_known_audio_ids
      : rawGroups.map(() => null)
  // Per-sentence KNOWN texts from the turn translation (same boundary as the
  // engine's podSentenceSplit). When they align with the sentence groups,
  // these are the authoritative whole-sentence knowns — text-keyed fresh
  // renders are preferred over the June silence-split take slices, several of
  // which cut wrong (a 312ms "sentence" = the tail of its neighbour).
  const rawKnownTexts = (s.known_text || '').split(/(?<=[.!?…])\s+/).filter(Boolean)
  const knownTextsAligned = rawKnownTexts.length === rawGroups.length
  const groups = []
  const takes = []
  const knownTakes = []
  const knownTexts = []
  let carry = []
  let carryKnown = []
  rawGroups.forEach((g, i) => {
    // Only TURN-INITIAL one-unit groups (leading "Ciao!" interjections) glue
    // forward — a mid-turn one-unit group is a real sentence ("Impresioniran
    // sam.") with its own takes; gluing it swallowed its known audio.
    if (groups.length === 0 && g.length === 1 && i < rawGroups.length - 1) {
      carry.push(...g)
      if (knownTextsAligned) carryKnown.push(rawKnownTexts[i])
      return
    }
    groups.push([...carry, ...g])
    takes.push(carry.length ? null : rawTakes[i])
    knownTakes.push(carry.length ? null : rawKnown[i])
    knownTexts.push(knownTextsAligned ? [...carryKnown, rawKnownTexts[i]].join(' ') : null)
    carry = []
    carryKnown = []
  })
  if (carry.length) {
    groups.push(carry)
    takes.push(null)
    knownTakes.push(null)
    knownTexts.push(knownTextsAligned ? carryKnown.join(' ') : null)
  }

  const single = groups.length === 1

  // Take G takes (uuid[] aligned to these glued groups) + flat unit offsets,
  // for slicing chunks out of the gapped take and finding window knowns.
  const takegIds =
    Array.isArray(s.takeg_audio_ids) && s.takeg_audio_ids.length === groups.length
      ? s.takeg_audio_ids
      : groups.map(() => null)
  const offsets = []
  {
    let off = 0
    for (const g of groups) { offsets.push(off); off += g.length }
  }
  const winKnown = new Map()
  for (const w of s.window_known_map || []) winKnown.set(`${w.start}-${w.end}`, w.known)

  // ── graceful audio fallback (founder ruling 2026-07-17) ──────────────────
  // A missing render at one seam granularity must never leave a dead play
  // control anywhere in the ladder. Resolution order per chunk, most-exact
  // first: (a) an exact seam-span SLICE of the group's whole-sentence take,
  // when the take exists and every atom in the span carries ms timings;
  // (b) butted per-atom clips, when at least one exists; (c) the group's
  // whole-sentence take/Take-G played in full — audibly coarser than the
  // requested span, but never silently nothing. A step with NOTHING
  // playable at any tier gets hasAudio:false so the UI disables its control
  // instead of rendering a button that does nothing.
  const resolveChunkClips = (us, takeg, wholeClip) => {
    const sliced = takeg && us.every((a) => a.target_start_ms != null && a.target_end_ms != null)
    if (sliced) {
      return {
        clips: [{ id: takeg, startMs: us[0].target_start_ms, endMs: us[us.length - 1].target_end_ms }],
        approx: false,
      }
    }
    const atomClips = us.map((a) => a.targetClipId)
    if (atomClips.some(Boolean)) return { clips: atomClips, approx: us.length > 1 }
    if (wholeClip) return { clips: [wholeClip], approx: true }
    return { clips: [], approx: false }
  }
  // sub-sentence chunk: a contiguous ms SLICE of the group's Take G render
  // (gaps preserved); butted unit clips, then the whole sentence, when finer
  // audio doesn't exist yet at this seam
  const chunkStep = (g, span, gi) => {
    const us = g.slice(span.start, span.end + 1)
    const takeg = takegIds[gi]
    const wholeClip = takeg || takes[gi] || (single ? s.target_audio_id : null)
    const { clips, approx } = resolveChunkClips(us, takeg, wholeClip)
    return {
      kind: 'chunk',
      text: us.map((a) => a.targetSurface).join(' '),
      clips,
      approx,
      hasAudio: clips.some(Boolean),
      rate: 1,
    }
  }
  // chunk's known: the REAL fine-known clip for the unit gloss / authored
  // window translation; legacy "means X" butt, then the whole sentence known,
  // when neither is missing
  const knownStep = (g, span, gi) => {
    const us = g.slice(span.start, span.end + 1)
    const text =
      us.length === 1
        ? us[0].gloss || ''
        : winKnown.get(`${offsets[gi] + span.start}-${offsets[gi] + span.end}`) ||
          us.map((a) => a.gloss).filter(Boolean).join(' ')
    const real = fineKnownMap.value.get(normForAudio(text))
    const wholeKnown = knownTakes[gi] || (single ? s.known_audio_id : null)
    const atomClips = us.map((a) => a.meansGlossClipId)
    const clips = real ? [real] : atomClips.some(Boolean) ? atomClips : wholeKnown ? [wholeKnown] : []
    return {
      kind: 'gloss',
      text,
      clips,
      approx: !real,
      hasAudio: clips.some(Boolean),
      rate: 1,
    }
  }
  // a sentence at its whole — REAL takes; for a single-sentence turn the
  // sentence whole IS the turn whole, so fall through to the turn takes
  const wholeSentenceChunk = (gi) => {
    const g = groups[gi]
    const take = takes[gi] || (single ? s.target_audio_id : null)
    // no natural take (the glue-merged turns): the group's full Take G is the
    // real, correctly-voiced render of exactly this sentence — gaps and all
    const atomClips = g.map((a) => a.targetClipId)
    const clips = take ? clipList(take) : takegIds[gi] ? [takegIds[gi]] : atomClips
    return {
      kind: 'group',
      text: g.map((a) => a.targetSurface).join(' '),
      clips,
      approx: !take && !takegIds[gi],
      hasAudio: clips.some(Boolean),
      rate: 1,
    }
  }
  const wholeSentenceKnown = (gi) => {
    const g = groups[gi]
    const take = knownTakes[gi] || (single ? s.known_audio_id : null)
    const sentText = single && s.known_text ? s.known_text : knownTexts[gi]
    const joinText = g.map((a) => a.gloss).filter(Boolean).join(' ')
    // fresh render of the REAL sentence translation first — audio provably
    // matches text; the June split slices come second (several cut wrong)
    const sentReal = sentText ? fineKnownMap.value.get(normForAudio(sentText)) : null
    const joinReal = fineKnownMap.value.get(normForAudio(joinText))
    const clips = sentReal ? [sentReal] : take ? clipList(take) : joinReal ? [joinReal] : g.map((a) => a.meansGlossClipId)
    return {
      kind: 'gloss',
      text: sentText || joinText,
      clips,
      approx: !sentReal && !take && !joinReal,
      hasAudio: clips.some(Boolean),
      rate: 1,
    }
  }
  // conjoined sentences below the whole turn: butted sentence takes until Take G
  const conjoinChunk = (span) => {
    const gs = groups.slice(span.start, span.end + 1)
    const tks = takes.slice(span.start, span.end + 1)
    // per sentence: natural take, else its Take G, else butted unit clips
    const perGroup = gs.map((g, i) => {
      const t = tks[i] || takegIds[span.start + i]
      return t ? clipList(t) : g.map((a) => a.targetClipId)
    })
    const clips = perGroup.flat()
    return {
      kind: 'group',
      text: gs.map((g) => g.map((a) => a.targetSurface).join(' ')).join(' '),
      clips,
      approx: true, // butted takes until a conjoined render exists — by design
      hasAudio: clips.some(Boolean),
      rate: 1,
    }
  }
  const conjoinKnown = (span) => {
    const gs = groups.slice(span.start, span.end + 1)
    const kts = knownTakes.slice(span.start, span.end + 1)
    const perGroup = gs.map((g, i) => {
      const gi = span.start + i
      const sentReal = knownTexts[gi] ? fineKnownMap.value.get(normForAudio(knownTexts[gi])) : null
      if (sentReal) return [sentReal]
      if (kts[i]) return clipList(kts[i])
      const real = fineKnownMap.value.get(normForAudio(g.map((a) => a.gloss).filter(Boolean).join(' ')))
      return real ? [real] : g.map((a) => a.meansGlossClipId)
    })
    const clips = perGroup.flat()
    return {
      kind: 'gloss',
      text: gs.map((g, i) => knownTexts[span.start + i] || g.map((a) => a.gloss).filter(Boolean).join(' ')).join(' '),
      clips,
      approx: true,
      hasAudio: clips.some(Boolean),
      rate: 1,
    }
  }
  const wholeTurnChunk = (rate = 1) => ({
    kind: 'whole',
    text: s.target_text,
    clips: [s.target_audio_id],
    approx: false,
    hasAudio: !!s.target_audio_id,
    rate,
  })
  const wholeTurnKnown = () => ({
    kind: 'gloss',
    text: s.known_text || '',
    clips: [s.known_audio_id],
    approx: !s.known_audio_id,
    hasAudio: !!s.known_audio_id,
    rate: 1,
  })

  const fusion = fusionMode.value
  // Rung-0 spans are S-LEGO spans (canon '…' seams), never raw per-atom cuts
  // — a sentence with no internal seam comes back as a single span and rides
  // straight to its whole with no fusion rung of its own (rule 4).
  const sLegoSpans = groups.map((g, gi) => sLegoSpansFromBounds(bounds, offsets[gi], offsets[gi] + g.length - 1))
  const ladders = groups.map((g, gi) => spanLadder(sLegoSpans[gi], fusion))
  const maxDepth = Math.max(...ladders.map((l) => l.length))
  const rungs = []

  // fusion rungs: every sentence rides every rung; a sentence already at its
  // whole repeats its whole t·k·t·t while longer siblings climb
  for (let r = 0; r < maxDepth; r++) {
    const steps = []
    groups.forEach((g, gi) => {
      const l = ladders[gi]
      const lvl = l[Math.min(r, l.length - 1)]
      if (lvl.length === 1) steps.push(...tktt(wholeSentenceChunk(gi), wholeSentenceKnown(gi)))
      else lvl.forEach((span) => steps.push(...tktt(chunkStep(g, span, gi), knownStep(g, span, gi))))
    })
    const last = r === maxDepth - 1
    rungs.push({
      label:
        last && single
          ? `Stage ${r} · the whole turn`
          : r === 0
            ? 'Stage 0 · S-LEGO seams'
            : last
              ? `Stage ${r} · whole sentences`
              : `Stage ${r} · fusion`,
      note:
        last && single
          ? 't·k·t·t at 1× — ≡ engine Stage 1'
          : r === 0
            ? 'every S-LEGO t·k·t·t · 1×'
            : last
              ? 'real sentence takes + real translation takes'
              : fusion === 'chained'
                ? 'windows share an edge chunk'
                : 'pairwise fusion',
      steps,
    })
  }

  // conjoining rungs: the sentences fuse on into the turn (the all-wholes
  // level IS the previous rung, so it is skipped)
  let stageN = maxDepth
  if (!single) {
    const groupSpans = groups.map((_, gi) => ({ start: gi, end: gi }))
    for (const lvl of spanLadder(groupSpans, fusion).slice(1)) {
      const isTurn = lvl.length === 1
      const steps = isTurn
        ? tktt(wholeTurnChunk(), wholeTurnKnown())
        : lvl.flatMap((span) => tktt(conjoinChunk(span), conjoinKnown(span)))
      rungs.push({
        label: isTurn ? `Stage ${stageN} · the whole turn` : `Stage ${stageN} · sentences conjoin`,
        note: isTurn ? 't·k·t·t at 1× — ≡ engine Stage 1' : 'sentence takes butted until Take G',
        steps,
      })
      stageN++
    }
  }

  // the speed ramp: the locked engine cascade (Stages 2–8) on the whole turn
  const GLYPH = { ps: 't', trans: 'k', ps2x: 't@2×' }
  for (let es = 2; es <= 8; es++) {
    const pat = PROPOSED_STAGE_PLAYLIST[es] || []
    rungs.push({
      label: `Stage ${stageN} · turn — engine Stage ${es}`,
      note:
        pat.map((role) => GLYPH[role] || role).join(' · ') +
        (es === 8 ? ' — no known left: immersion emerges, turn segues into turn' : ''),
      steps: pat.map((role) => (role === 'trans' ? wholeTurnKnown() : wholeTurnChunk(role === 'ps2x' ? 2 : 1))),
    })
    stageN++
  }

  rungs.forEach((rung, ri) => {
    rung.key = `r${ri}`
    rung.steps.forEach((st, i) => {
      st.key = `r${ri}:${i}`
    })
  })
  return rungs
})

const playWholeClimb = () => playShapeSteps(ladderRungs.value.flatMap((r) => r.steps))

const STEP_CLS = { chunk: 'r-target', gloss: 'r-known', whole: 'r-whole', group: 'r-explainer' }

// ── SEAM EDITOR — review the canon S-LEGO seams, don't draft from scratch ───
// One seam source of truth (founder ruling 2026-07-17): seams come from the
// '…' marks already baked into target_text (§9a/9b of pod-ladder-proposal.md
// — S-LEGO seams are the definitive break places, nothing finer). The editor
// presents each canon seam for human ear review — accept (default) / remove
// / move to another gap — it never drafts a blank fine map. atom_map_fine is
// now an OVERRIDE layer at most: it records which gaps a human actually
// confirmed, read back and reconciled against the current canon set on load.
// Saves via /api/pod-fine-map (auth'd, tiling-verified) — same endpoint,
// same column, same shape; only the authoring model above it has changed.
const editorTokens = ref([])
const canonSeams = ref(new Set()) // gap indices where target_text carries a canon '…'
const removedCanon = ref(new Set()) // canon seams a human rejected on review
const addedOverride = ref(new Set()) // non-canon gaps a human moved a rejected seam to
const editorUnits = ref([])
const seamDirty = ref(false)
const seamSaving = ref(false)
const seamMsg = ref('')

const CJK_RE = /[぀-ヿ㐀-䶿一-鿿가-힯]/
const HARD_PUNCT = /[.!?。！？…，,;；、:：]/
const alnumLocal = (t) => (t || '').toLowerCase().replace(/[^\p{L}\p{N}\p{M}]/gu, '')
const slugify = (t) =>
  alnumLocal(t) ? (t || '').toLowerCase().replace(/[.,!?;:¿¡"'’，。？！、]/g, '').trim().replace(/\s+/g, '-').replace(/[^\p{L}\p{N}-]/gu, '').slice(0, 64) : ''

// Tokenize target_text into glossable tokens: each CJK char is one token, a
// latin word-run is one token. punctAfter carries the actual punctuation
// character after the token (or '') — '…' is the reviewable canon S-LEGO
// seam; every other hard-punct mark (sentence ends, commas, …) is a locked,
// non-negotiable structural seam, same as before.
function tokenizeTarget(text) {
  const out = []
  let i = 0
  const isWord = (c) => /[\p{L}\p{N}\p{M}'’-]/u.test(c)
  while (i < text.length) {
    const c = text[i]
    if (CJK_RE.test(c)) {
      out.push({ text: c, punctAfter: '' })
      i++
    } else if (isWord(c)) {
      let j = i + 1
      while (j < text.length && isWord(text[j]) && !CJK_RE.test(text[j])) j++
      out.push({ text: text.slice(i, j), punctAfter: '' })
      i = j
    } else {
      if (out.length && HARD_PUNCT.test(c)) out[out.length - 1].punctAfter = c
      i++
    }
  }
  return out
}

function joinTokens(tokens, start, end) {
  let out = ''
  for (let i = start; i <= end; i++) {
    if (i > start) {
      const prev = tokens[i - 1].text
      const cur = tokens[i].text
      if (!CJK_RE.test(prev[prev.length - 1]) && !CJK_RE.test(cur[0])) out += ' '
    }
    out += tokens[i].text
  }
  return out
}

function isLockedTok(tokens, i) {
  const p = tokens[i]?.punctAfter
  return !!p && p !== '…'
}

// Read a saved override (atom_map_fine) back as the set of gap indices it
// left "on" — walks its units' target_surface against the current tokens,
// same tiling check as before. Returns null if it no longer walks/covers the
// text (stale draft from a different content edit) — caller falls back to
// pure canon.
function seamsFromUnits(tokens, units) {
  const seams = new Set()
  let ti = 0
  for (const u of units) {
    const target = alnumLocal(u.target_surface)
    if (!target) continue
    let acc = ''
    while (ti < tokens.length && acc.length < target.length) {
      acc += alnumLocal(tokens[ti].text)
      ti++
    }
    if (acc !== target) return null
    if (ti < tokens.length) seams.add(ti - 1)
  }
  if (ti !== tokens.length) return null
  return seams
}

function initSeamEditor() {
  seamMsg.value = ''
  seamDirty.value = false
  editorTokens.value = []
  canonSeams.value = new Set()
  removedCanon.value = new Set()
  addedOverride.value = new Set()
  editorUnits.value = []
  const s = selectedSentence.value
  if (!s) return
  const tokens = tokenizeTarget(s.target_text || '')
  editorTokens.value = tokens
  const canon = new Set()
  tokens.forEach((t, i) => { if (t.punctAfter === '…') canon.add(i) })
  canonSeams.value = canon

  if (Array.isArray(s.atom_map_fine) && s.atom_map_fine.length) {
    const savedOn = seamsFromUnits(tokens, s.atom_map_fine)
    if (savedOn) {
      removedCanon.value = new Set([...canon].filter((i) => !savedOn.has(i)))
      addedOverride.value = new Set([...savedOn].filter((i) => !canon.has(i) && !isLockedTok(tokens, i)))
    } else {
      seamMsg.value = 'saved seam review no longer matches this text — showing canon seams'
    }
  }
  editorUnits.value = deriveUnits(null)
}

function effectiveOn(i) {
  if (isLockedTok(editorTokens.value, i)) return true
  if (canonSeams.value.has(i)) return !removedCanon.value.has(i)
  return addedOverride.value.has(i)
}

function deriveUnits(prevUnits) {
  const tokens = editorTokens.value
  const ranges = []
  let start = 0
  for (let i = 0; i < tokens.length; i++) {
    if (i === tokens.length - 1 || effectiveOn(i)) {
      ranges.push({ start, end: i })
      start = i + 1
    }
  }
  return ranges.map((r) => {
    const surface = joinTokens(tokens, r.start, r.end)
    const exact = (prevUnits || []).find((u) => u.start === r.start && u.end === r.end)
    if (exact) return { ...r, surface, gloss: exact.gloss, kind: exact.kind }
    // a merge inherits its parts' glosses joined; a split starts blank
    const contained = (prevUnits || []).filter((u) => u.start >= r.start && u.end <= r.end)
    const gloss = contained.length > 1 ? contained.map((u) => u.gloss).filter(Boolean).join(' ') : ''
    return { ...r, surface, gloss, kind: 'atom' }
  })
}

// Canon seam: click removes it (frees one "move" slot); click again restores
// it. Non-canon gap: click relocates a removed seam there — capped at the
// number of currently-removed canon seams, so the total seam count can never
// exceed canon (no sub-S-LEGO cuts, rule 3).
function toggleSeam(i) {
  if (isLockedTok(editorTokens.value, i)) return
  const prev = editorUnits.value
  if (canonSeams.value.has(i)) {
    const removed = new Set(removedCanon.value)
    if (removed.has(i)) removed.delete(i)
    else removed.add(i)
    removedCanon.value = removed
  } else {
    const added = new Set(addedOverride.value)
    if (added.has(i)) {
      added.delete(i)
    } else if (added.size < removedCanon.value.size) {
      added.add(i)
    } else {
      seamMsg.value = 'move budget used — remove a canon seam first to relocate it here'
      return
    }
    addedOverride.value = added
  }
  seamMsg.value = ''
  editorUnits.value = deriveUnits(prev)
  seamDirty.value = true
}

function seamState(i) {
  if (isLockedTok(editorTokens.value, i)) return 'locked'
  if (canonSeams.value.has(i)) return removedCanon.value.has(i) ? 'removed' : 'on'
  return addedOverride.value.has(i) ? 'moved' : 'open'
}
function seamGlyph(i) {
  const st = seamState(i)
  if (st === 'locked') return '‖'
  if (st === 'on' || st === 'moved') return '|'
  return '·'
}
function seamTitle(i) {
  const st = seamState(i)
  if (st === 'locked') return 'punctuation — always a seam'
  if (st === 'on') return 'canon S-LEGO seam — click to remove'
  if (st === 'removed') return 'removed canon seam — click to restore'
  if (st === 'moved') return 'moved seam (override) — click to remove'
  return 'not a canon seam — click to relocate a removed seam here'
}

async function saveFineMap() {
  const s = selectedSentence.value
  if (!s) return
  seamSaving.value = true
  seamMsg.value = ''
  try {
    const sb = await import('../../services/supabase').then((m) => m.supabase)
    const { data: { session } } = await sb.auth.getSession()
    if (!session) throw new Error('no session — sign in')
    const map = editorUnits.value.map((u) => {
      const gloss = (u.gloss || '').trim()
      return {
        kind: gloss ? 'atom' : 'passthrough',
        gloss: gloss || null,
        lego_key: gloss ? `s${s.global_order}-${slugify(u.surface)}` : null,
        target_surface: u.surface,
        target_start_ms: null,
        target_end_ms: null,
      }
    })
    const res = await fetch('/api/pod-fine-map', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ id: s.id, atom_map_fine: map }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
    s.atom_map_fine = map
    seamDirty.value = false
    seamMsg.value = `Saved ✓ ${map.length} units (${removedCanon.value.size} removed, ${addedOverride.value.size} moved)`
  } catch (e) {
    seamMsg.value = `Save failed: ${e.message}`
  } finally {
    seamSaving.value = false
  }
}

watch([selectedIdx, sentences], initSeamEditor)

async function playShapeSteps(steps) {
  stop()
  const myToken = ++stopToken
  isPlaying.value = true
  for (const st of steps) {
    if (myToken !== stopToken) break
    playingStepKey.value = st.key
    const clips = st.clips.filter(Boolean)
    for (let i = 0; i < clips.length; i++) {
      await playClip(clips[i], st.rate || 1)
      if (myToken !== stopToken) break
      if (i < clips.length - 1) await sleep(GAP_INTRA_FUSE)
    }
    if (myToken !== stopToken) break
    await sleep(st.kind === 'gloss' ? GAP_AFTER_GLOSS : GAP_BETWEEN_STEPS)
  }
  if (myToken === stopToken) {
    isPlaying.value = false
    playingStepKey.value = ''
  }
}

// stop audio if the line changes out from under a running playback
watch(selectedIdx, stop)

// ── CASTING — the sample-first approval surface (Tom, 2026-08-07) ───────────
// "The samples belong in PodLab: a per-course pod preview where he can play the
// ~10 sample phrases for each course awaiting approval."
//
// What is shown is THE CAST AS STORED in listening_pods.speakers — never
// re-resolved from app_config.pod_voice_pools — because that stored snapshot is
// exactly what phase-8's resolvePodSpeakerVoice() reads at generation time.
// Approve what will render, not what a pool says ought to render.
const casting = ref(null) // GET /api/pod-voice-approval payload
const currentPodId = ref('') // the pod whose lines are loaded and sampled
const castingLoading = ref(false)
const castingError = ref('')
const castNote = ref('')
const castingSaving = ref('')
const castingMsg = ref('')

async function loadCasting(courseCode) {
  casting.value = null
  castingError.value = ''
  castingMsg.value = ''
  castNote.value = ''
  if (!courseCode) return
  castingLoading.value = true
  try {
    const sb = await import('../../services/supabase').then((m) => m.supabase)
    const { data: { session } } = await sb.auth.getSession()
    if (!session) throw new Error('no session — sign in')
    const res = await fetch(`/api/pod-voice-approval?course=${encodeURIComponent(courseCode)}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
    casting.value = body
    castNote.value = (body.record && body.record.note) || ''
  } catch (e) {
    castingError.value = e.message
  } finally {
    castingLoading.value = false
  }
}

// The one write path for a decision. `fingerprint` is the digest the decision
// is recorded against — normally the one this page rendered (the route 409s if
// a recast landed since), and after an approve-a-candidate recast, the digest
// that write returned.
async function postDecision(decision, fingerprint) {
  const sb = await import('../../services/supabase').then((m) => m.supabase)
  const { data: { session } } = await sb.auth.getSession()
  if (!session) throw new Error('no session — sign in')
  const res = await fetch('/api/pod-voice-approval', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({
      course_code: casting.value.course_code,
      decision,
      cast_fingerprint: fingerprint,
      note: castNote.value,
    }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
  casting.value = { ...casting.value, record: body.record, gate: body.gate }
  return body
}

async function decideCasting(decision) {
  if (!casting.value) return
  castingSaving.value = decision
  castingMsg.value = ''
  try {
    const body = await postDecision(decision, casting.value.cast_fingerprint)
    castingMsg.value = decision === 'approve'
      ? `Approved ✓ — generation is unlocked for casting ${body.cast_fingerprint}`
      : 'Rejected — recorded, and generation stays refused'
  } catch (e) {
    castingMsg.value = `Failed: ${e.message}`
  } finally {
    castingSaving.value = ''
  }
}

// Mirror of canonicalSpeakerName / resolvePodSpeakerVoice in
// services/phases/phase8-audio-v13.cjs (~:6238). A 10-line mirror rather than an
// import: that file is a 7k-line CJS service that opens a live Supabase client
// and TTS providers at module load, so it cannot enter the browser bundle. The
// FINGERPRINT — the thing that must never drift — is not mirrored: it is
// computed server-side by the gate's own module (api/pod-voice-approval.js).
function canonSpeakerName(speaker) {
  return (speaker || '').replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim()
}
function resolveSpeakerVoice(podSpeakers, speaker, track) {
  const mapping = podSpeakers || {}
  const entry = mapping[canonSpeakerName(speaker)] || mapping[speaker] || mapping._default
  if (!entry) return null
  if (entry[track] && entry[track].voice_id) {
    return {
      name: entry[track].name || null,
      voice_id: entry[track].voice_id,
      provider: entry[track].provider || 'azure',
      locale: entry[track].locale || null,
      gender: entry.gender || 'n',
    }
  }
  if (track === 'target' && entry.voice_id) {
    // Legacy top-level shape. The unset default was 'xai' — true when this
    // shape was written, a trapdoor once xAI was retired from selection
    // (Tom, 2026-08-27). 'azure' matches the modern shape above and the
    // server-side ladder's own fallback, so an entry that never named a
    // provider now reads as what would actually render it. Mirrors the same
    // change in services/phases/phase8-audio-v13.cjs.
    return { name: entry.name || null, voice_id: entry.voice_id, provider: entry.provider || 'azure', locale: entry.locale || null, gender: entry.gender || 'n' }
  }
  return null
}
const voiceKey = (v) => (v ? `${v.provider}|${v.voice_id}|${v.locale || ''}` : 'none')

// The pod whose lines are loaded on this page — resolved server-side by
// resolveCurrentPod0(), never assumed to be `<course>:pod-0`.
const currentPod = computed(() => {
  const pods = casting.value?.pods || []
  return pods.find((p) => p.id === currentPodId.value) || pods[0] || null
})
// The slug of the pod on screen, stated rather than assumed: pod-0 on most
// courses, pod-1 on the 1-based ones (Tom, 2026-08-22).
const currentPodSlug = computed(() => String(currentPodId.value || '').split(':')[1] || '—')
const castSpeakers = computed(() => currentPod.value?.speakers || {})
// Pods beyond the current one are in the fingerprint but their lines are not
// on this page.
const otherPodIds = computed(() =>
  (casting.value?.pods || []).map((p) => p.id).filter((id) => id !== currentPod.value?.id),
)
// Named out loud, because "which pod am I listening to?" is exactly what went
// wrong: a stale `pod-0` sampled while the current content sat in the working
// copy. The page states its source rather than leaving it to be inferred.
const podSource = computed(() => {
  const p = currentPod.value
  if (!p) return null
  // Serving-slug family, so a 1-based course lists its siblings too.
  const family = (casting.value?.pods || []).filter((q) => /^pod-[01](-|$)/.test(q.slug || q.id.split(':')[1] || ''))
  const others = family.filter((q) => q.id !== p.id)
  return {
    id: p.id,
    lines: sentences.value.length,
    claimed: p.sentence_count,
    title: p.title || '',
    siblings: others.map((q) => `${q.id} (${q.sentence_count ?? '?'} lines)`),
  }
})

// ISO-639-3 (courses.target_lang) → the ISO-639-1 subtag a voice locale should
// open with. Unlisted languages report "can't check" — never a false alarm.
const ISO3_TO_ISO1 = {
  ara: 'ar', ben: 'bn', bul: 'bg', cat: 'ca', cym: 'cy', dan: 'da', deu: 'de', ell: 'el',
  eng: 'en', est: 'et', eus: 'eu', fas: 'fa', fin: 'fi', fra: 'fr', gle: 'ga', guj: 'gu',
  heb: 'he', hin: 'hi', hrv: 'hr', hye: 'hy', isl: 'is', ita: 'it', jpn: 'ja', kor: 'ko',
  lav: 'lv', lit: 'lt', nep: 'ne', nld: 'nl', nor: 'no', pan: 'pa', pol: 'pl', por: 'pt',
  ron: 'ro', sin: 'si', spa: 'es', swa: 'sw', swe: 'sv', tam: 'ta', tha: 'th', tur: 'tr',
  ukr: 'uk', urd: 'ur', zho: 'zh',
}
// Voices legitimately steered at a near-neighbour subtag.
const LOCALE_ALIASES = { no: ['nb', 'nn'], he: ['iw'], zh: ['cmn', 'yue'] }
function localeMatchesTarget(locale, iso3) {
  const want = ISO3_TO_ISO1[iso3]
  if (!want || !locale) return null // unknown → don't claim anything
  const got = String(locale).toLowerCase().split(/[-_]/)[0]
  return got === want || (LOCALE_ALIASES[want] || []).includes(got)
}

// Line counts per speaker on this pod — the share an ear can't tally.
const linesBySpeaker = computed(() => {
  const m = new Map()
  for (const s of sentences.value) m.set(s.speaker, (m.get(s.speaker) || 0) + 1)
  return m
})

// One row per DISTINCT voice on a track, with the labels and line share it covers.
function castRows(track) {
  const speakers = castSpeakers.value
  const rows = new Map()
  const labels = new Set([...Object.keys(speakers), ...linesBySpeaker.value.keys()])
  for (const label of labels) {
    const v = resolveSpeakerVoice(speakers, label, track)
    const k = voiceKey(v)
    if (!rows.has(k)) rows.set(k, { key: k, voice: v, labels: [], lines: 0 })
    const row = rows.get(k)
    if (!row.labels.includes(label)) row.labels.push(label)
    row.lines += linesBySpeaker.value.get(label) || 0
  }
  const total = [...rows.values()].reduce((a, r) => a + r.lines, 0) || 1
  return [...rows.values()]
    .map((r) => ({ ...r, share: Math.round((r.lines / total) * 100) }))
    .sort((a, b) => b.lines - a.lines)
}
const targetCast = computed(() => castRows('target'))
const knownCast = computed(() => castRows('known'))

// The two things an ear cannot catch quickly, stated in words.
const castFlags = computed(() => {
  const flags = []
  if (!casting.value) return flags
  const iso3 = casting.value.course?.target_lang || ''
  const voiced = targetCast.value.filter((r) => r.voice)
  const unvoiced = targetCast.value.filter((r) => !r.voice)

  if (unvoiced.length) {
    flags.push({
      level: 'bad',
      text: `${unvoiced.length} speaker label${unvoiced.length === 1 ? '' : 's'} resolve to NO target voice `
        + `(${unvoiced[0].labels.slice(0, 4).join(', ')}${unvoiced[0].labels.length > 4 ? '…' : ''}) — those lines cannot render.`,
    })
  }
  if (voiced.length !== 2) {
    flags.push({
      level: 'bad',
      text: `${voiced.length} distinct target voice${voiced.length === 1 ? '' : 's'} — Aran's rule is a two-hander, one male and one female.`,
    })
  } else {
    const genders = voiced.map((r) => r.voice.gender)
    if (!(genders.includes('f') && genders.includes('m'))) {
      flags.push({ level: 'bad', text: `Two target voices, but genders are ${genders.join(' + ')} — not one male, one female.` })
    }
  }
  const bad = voiced.filter((r) => localeMatchesTarget(r.voice.locale, iso3) === false)
  if (bad.length) {
    flags.push({
      level: 'bad',
      text: `${bad.length} target voice${bad.length === 1 ? '' : 's'} steered at a locale that is not the course's target language `
        + `(${bad.map((r) => `${r.voice.name || r.voice.voice_id} → ${r.voice.locale}`).join(', ')}; target is ${iso3}). `
        + 'It will render the target text in the wrong language’s phonology.',
    })
  }
  const unknown = voiced.filter((r) => localeMatchesTarget(r.voice.locale, iso3) === null)
  if (unknown.length) {
    flags.push({
      level: 'warn',
      text: `Locale can't be checked for ${unknown.length} target voice${unknown.length === 1 ? '' : 's'} `
        + `(${unknown.map((r) => r.voice.locale || 'no locale').join(', ')}; target ${iso3 || 'unknown'}) — judge by ear.`,
    })
  }
  // Same check on the known track. It fires on exactly the 6 eng_for_* courses
  // whose known voices are English rather than the learner's own language —
  // nowhere else in the estate (scripts probe, 2026-08-07), so it isn't noise.
  const kIso3 = casting.value.course?.known_lang || ''
  const badKnown = knownCast.value.filter((r) => r.voice && localeMatchesTarget(r.voice.locale, kIso3) === false)
  if (badKnown.length) {
    flags.push({
      level: 'warn',
      text: `${badKnown.length} KNOWN voice${badKnown.length === 1 ? '' : 's'} at a locale that is not the course's known language `
        + `(${badKnown.map((r) => `${r.voice.name || r.voice.voice_id} → ${r.voice.locale}`).join(', ')}; known is ${kIso3}) — `
        + 'the learner would hear the translations in the wrong language.',
    })
  }
  // Line share: two voices at 85/15 is technically a two-hander and audibly not one.
  const byGender = { f: 0, m: 0, n: 0 }
  for (const r of voiced) byGender[r.voice.gender === 'f' ? 'f' : r.voice.gender === 'm' ? 'm' : 'n'] += r.lines
  const tot = byGender.f + byGender.m + byGender.n
  if (tot) {
    const pct = (n) => Math.round((n / tot) * 100)
    const skewed = voiced.length === 2 && Math.max(pct(byGender.f), pct(byGender.m)) >= 70
    flags.push({
      level: skewed ? 'bad' : 'ok',
      text: `Line share — female ${pct(byGender.f)}%, male ${pct(byGender.m)}%`
        + (byGender.n ? `, ungendered ${pct(byGender.n)}%` : '')
        + ` of ${tot} lines${skewed ? ' — lopsided; one voice carries the pod.' : '.'}`,
    })
  }
  return flags
})

// ── MANUAL VOICE CHOICE — two dropdowns, one male slot, one female slot ─────
// Tom, 2026-08-11, having rejected the Spanish pod-0 cast ("Spanish needs
// Iberian Spanish, not Mexican pronounciation, that's a different course"):
//
//   "should the casting process, in the PODLAB allow voice choice? I think it
//    should - I built a VOICELAB actually which allows more control but that may
//    be overkill but it's worth choosing the voices manually if there's only 2
//    of them"
//
// So: a LIGHTWEIGHT picker. Two selects, a ▶ per slot, an Apply. VoiceLab's
// inventory and preview endpoints are reused wholesale; none of its controls
// (per-role lanes, provider switching, prosody knobs) come with them.
//
// It governs the TARGET track only — that is where the miscast was, and where
// the ear judges. The known track is English for nearly the whole estate and
// has its own settled pool; re-pointing it is a different decision from a
// different page. The endpoint accepts a known override already, so wiring a
// second pair of selects later is a template change, not a rebuild.
const POOL_KEY_MARK = 'pool'
const voicePools = ref(null) // GET /api/pod-cast-voices
const discovered = ref([]) // GET /api/voices/discover/:lang?provider=xai
const pick = ref({ m: '', f: '' }) // voiceKey() of the chosen voice per slot
const pickerBusy = ref('')
const pickerMsg = ref('')
const pickerError = ref('')

// The BCP-47 tag this course's target language should be steered at. For an
// xAI voice this tag IS the accent decision — the same voice reads es-ES or
// es-MX depending on it — so it travels with the pick rather than being
// re-derived at render time.
const targetBcp47 = computed(() => {
  const lang = String(casting.value?.course?.target_lang || '')
  const iso1 = ISO3_TO_ISO1[lang.split('_')[0]] || null
  if (!iso1) return null
  const region = lang.includes('_') ? lang.split('_')[1] : ''
  return region ? `${iso1}-${region.toUpperCase()}` : iso1
})

// The voice each gender slot is cast on TODAY — the default both dropdowns
// open at, so opening the panel and changing nothing changes nothing.
const currentPair = computed(() => {
  const out = { m: null, f: null }
  for (const r of targetCast.value) {
    if (!r.voice) continue
    const g = r.voice.gender === 'f' ? 'f' : 'm'
    // Most lines wins, so an odd speaker can't misreport the slot.
    if (!out[g] || r.lines > out[g].lines) out[g] = { ...r.voice, lines: r.lines }
  }
  return out
})

// Options for one gender: the curated pool for this course's language FIRST and
// marked as such, then the wider discovered xAI inventory. Anything already
// cast but in neither list is kept at the top so the dropdown can always show
// where the pod actually stands.
function voiceOptions(gender) {
  const seen = new Set()
  const out = []
  const push = (v, source) => {
    const key = voiceKey(v)
    if (!v || !v.voice_id || seen.has(key)) return
    seen.add(key)
    out.push({ ...v, key, source })
  }
  const cur = currentPair.value[gender]
  if (cur) push({ provider: cur.provider, voice_id: cur.voice_id, name: cur.name, locale: cur.locale }, 'cast')
  const pool = voicePools.value?.target?.pool?.[gender] || []
  for (const v of pool) {
    push({ provider: v.provider, voice_id: v.voice_id, name: v.name, locale: azureLocaleOf(v.voice_id) || targetBcp47.value }, POOL_KEY_MARK)
  }
  // The xAI arm of this picker is gone (Tom, 2026-08-27 — retired from
  // selection). `discovered` is now always empty; the loop that pushed its
  // voices into the dropdown went with it, so a human can no longer cast a pod
  // onto a provider no render may use. The curated Azure pool plus whatever is
  // cast today is a working picker — this file already said so.
  return out
}
const optionsM = computed(() => voiceOptions('m'))
const optionsF = computed(() => voiceOptions('f'))

// Azure voice ids carry their own locale; nothing else does.
function azureLocaleOf(voiceId) {
  const m = String(voiceId || '').match(/^([a-z]{2,3}(?:-[A-Za-z]{4})?-[A-Z]{2})-/)
  return m ? m[1] : null
}
// The label a human reads to tell es-ES from es-MX at a glance.
function voiceLabel(v) {
  const iso3 = casting.value?.course?.target_lang || ''
  const ok = localeMatchesTarget(v.locale, iso3)
  // The voice_id is on the row because it is the only unique thing here — two
  // providers ship a "Sonia", and the cast table names ids for the same reason.
  const bits = [v.name || v.voice_id, v.provider, v.voice_id, v.locale || 'no locale']
  if (v.source === POOL_KEY_MARK) bits.push(`pool ${voicePools.value?.target?.pool_key || ''}`.trim())
  else if (v.source === 'cast') bits.push('cast now')
  if (ok === false) bits.push('⚠ WRONG LANGUAGE')
  return bits.join(' · ')
}
function chosen(gender) {
  return (gender === 'm' ? optionsM.value : optionsF.value).find((o) => o.key === pick.value[gender]) || null
}
// Has the human actually moved either dropdown off what is cast today?
const pickChanged = computed(() =>
  ['m', 'f'].some((g) => {
    const cur = currentPair.value[g]
    return pick.value[g] && pick.value[g] !== (cur ? voiceKey(cur) : '')
  }),
)

async function loadVoicePicker(courseCode) {
  voicePools.value = null
  discovered.value = []
  pickerError.value = ''
  pickerMsg.value = ''
  if (!courseCode) return
  try {
    const token = await getAccessToken()
    const res = await fetch(`/api/pod-cast-voices?course=${encodeURIComponent(courseCode)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
    // Shape-checked, not trusted: the picker degrades to the discovered
    // inventory rather than rendering half a payload.
    voicePools.value = body && body.target && body.target.pool ? body : null
  } catch (e) {
    pickerError.value = `pool unavailable: ${e.message}`
  }
  // The wider inventory used to be fetched here — `/api/voices/discover/:lang
  // ?provider=xai`, the only caller of that provider arm. xAI is retired from
  // selection (Tom, 2026-08-27), so casting a pod onto it is no longer a thing
  // a human should be offered, and a list you cannot choose from is worse than
  // no list. The call is gone rather than filtered client-side: not fetching is
  // cheaper than fetching and discarding, and it leaves no half-live path for
  // someone to re-enable by deleting a filter.
  //
  // `discovered` stays declared and stays empty. The picker falls back to the
  // curated pool plus the current cast, which this function's own comment
  // already called a working picker.
}

// Both selects default to what is cast today. Re-runs whenever the cast moves
// under the page (a load, an apply), never while the human is mid-choice on an
// unchanged cast.
watch(currentPair, (pair) => {
  for (const g of ['m', 'f']) {
    const key = pair[g] ? voiceKey(pair[g]) : ''
    if (key && pick.value[g] !== key) pick.value[g] = key
  }
}, { immediate: true, deep: true })

// A short line to hear the voice on. A REAL sentence from this pod where one
// exists for that gender's speaker — hearing the actual content is the point —
// otherwise a fixed neutral phrase.
const PREVIEW_FALLBACK = 'Buenos días. ¿Cómo estás hoy?'
function previewText(gender) {
  const speakers = castSpeakers.value
  for (const s of sentences.value) {
    const v = resolveSpeakerVoice(speakers, s.speaker, 'target')
    const g = v && v.gender === 'f' ? 'f' : 'm'
    const text = (s.target_text || '').trim()
    if (g === gender && text.length >= 8 && text.length <= 160) return text
  }
  const any = sentences.value.map((s) => (s.target_text || '').trim()).find((t) => t.length >= 8 && t.length <= 160)
  return any || PREVIEW_FALLBACK
}

// The one place this feature spends money: a few seconds of TTS, per click.
async function previewVoice(gender) {
  const v = chosen(gender)
  if (!v || pickerBusy.value) return
  stop() // supersede any sample or earlier preview — never two at once
  pickerBusy.value = `preview:${gender}`
  pickerMsg.value = ''
  try {
    const token = await getAccessToken()
    const res = await fetch(`${getApiUrl()}/api/voices/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        voiceId: v.voice_id,
        text: previewText(gender),
        provider: v.provider,
        language: v.locale || targetBcp47.value || undefined,
      }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok || !body.audio) throw Object.assign(new Error(body.error || `HTTP ${res.status}`), { status: res.status, data: body })
    await playDataUri(body.audio)
  } catch (e) {
    // Auditioning a voice renders it, so it takes the same lock as casting it —
    // and therefore deserves the same key rather than a dead end one step
    // earlier than the one the picker already handles.
    const refusal = consentRefusal(e)
    if (refusal) {
      consentNeeded.value = { ...refusal, retry: () => previewVoice(gender) }
      pickerMsg.value = ''
    } else {
      pickerMsg.value = `Preview failed: ${e.message}`
    }
  } finally {
    pickerBusy.value = ''
  }
}

// Preview playback goes through the SAME currentAudio handle as every clip on
// this page, so stop() and the next ▶ supersede it — no overlapping playback.
function playDataUri(uri) {
  return new Promise((resolve) => {
    const myToken = ++stopToken
    const a = new Audio(uri)
    currentAudio.value = a
    let done = false
    const finish = () => { if (!done) { done = true; resolve() } }
    a.onended = finish
    a.onerror = finish
    a.play().catch(finish)
    // If something else claimed playback while the bytes were loading, drop it.
    setTimeout(() => { if (myToken !== stopToken) { a.pause(); finish() } }, 0)
  })
}

// APPLY — writes casting and nothing else. No audio is generated, no clip link
// is nulled; the approval goes stale by design and the page says so.
// The single cast-write call. Returns the route's own body; throws unless the
// route confirmed a write, because an unrouted /api/* on Vercel falls through
// to the SPA and answers 200 with HTML, which parses to {}.
async function writeCast(m, f) {
  const token = await getAccessToken()
  const voice = (v) => (v ? { provider: v.provider, voice_id: v.voice_id, name: v.name, locale: v.locale || undefined } : undefined)
  const res = await fetch('/api/pod-cast-voices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({
      course_code: casting.value?.course_code,
      pod_id: currentPod.value?.id,
      target: { m: voice(m), f: voice(f) },
      cast_fingerprint: casting.value?.cast_fingerprint || null,
    }),
  })
  const body = await res.json().catch(() => ({}))
  // The route rides its branch flags (`code`, `voiceId`, `where`) alongside the
  // sentence, and the consent refusal is the one this page has to BRANCH on
  // rather than merely print — so the body travels with the error instead of
  // being flattened to a string a caller would have to pattern-match.
  if (!res.ok) throw Object.assign(new Error(body.error || `HTTP ${res.status}`), { status: res.status, data: body })
  if (!body.ok) throw new Error('the endpoint did not confirm a write — is this build deployed?')
  return body
}

// ── THE CONSENT STEP — the key to the lock that refuses an unconsented cast ──
//
// Tom, 2026-08-31: "we are never going to use a voice without consent." The
// block is real and it refuses here, correctly. What it had no answer for was
// this screen: consent could only be captured when a voice was BORN — in the
// Voice Lab's clone flows or in recordist onboarding — and this page casts
// voices it did not create. So casting a new pod speaker whose consent nobody
// had recorded was impossible for anybody, with the refusal shown as a flat
// "Failed:" line and nothing to do about it.
//
// It is the SAME mechanism, not a second one: ConsentStep is the Voice Lab's
// declaration — the line read aloud and checked by whisper on the box, or the
// named written statement — talking to the same declaration.cjs and writing the
// same consent_* columns. This page only decides WHEN to show it.
//
// And it finishes the job it interrupted: recording the consent re-runs the
// cast that was refused, so the human goes from blocked to cast in one pass
// rather than being sent to another screen and back.
const consentNeeded = ref(null) // { voiceId, reason, retry }

/** A refusal this page can do something about, or null. */
function consentRefusal(e) {
  const d = (e && e.data) || {}
  if (d.code !== 'NO_RECORDED_CONSENT' && d.code !== 'CONSENT_UNREADABLE') return null
  return { voiceId: d.voiceId || '', reason: e.message, where: d.where || null }
}

async function onConsentRecorded() {
  const retry = consentNeeded.value?.retry
  consentNeeded.value = null
  pickerMsg.value = 'Consent recorded. Re-running what it blocked…'
  if (retry) await retry()
}

async function applyVoices() {
  const course = casting.value?.course_code
  const podId = currentPod.value?.id
  const m = chosen('m')
  const f = chosen('f')
  if (!course || !podId || (!m && !f) || pickerBusy.value) return
  if (!window.confirm(
    `Re-cast ${podId} on these two voices?\n\n`
    + `male:   ${m ? `${m.name} (${m.provider}, ${m.locale || 'no locale'})` : 'unchanged'}\n`
    + `female: ${f ? `${f.name} (${f.provider}, ${f.locale || 'no locale'})` : 'unchanged'}\n\n`
    + 'Casting only — no audio is generated and no existing clip is deleted. '
    + 'The current approval goes stale, so generation re-locks until you approve the new cast.',
  )) return

  pickerBusy.value = 'apply'
  pickerMsg.value = ''
  try {
    const body = await writeCast(m, f)
    const podLabel = (body.pods || []).map((p) => `${p.pod_id} (${p.speakers} speakers)`).join(', ')
    pickerMsg.value = `Applied to ${podLabel || podId}. New casting ${body.cast_fingerprint} — `
      + (body.gate?.ok ? 'still approved.' : 'the previous approval no longer applies, so generation is locked until you approve this cast.')
    // Re-read the cast from the server: the table, the flags and both dropdowns
    // all re-derive from it, so nothing on screen is a local guess.
    await loadCasting(course)
    currentPodId.value = podId
  } catch (e) {
    const refusal = consentRefusal(e)
    if (refusal) {
      consentNeeded.value = { ...refusal, retry: applyVoices }
      pickerMsg.value = ''
    } else {
      pickerMsg.value = `Failed: ${e.message}`
    }
  } finally {
    pickerBusy.value = ''
  }
}

// ── the ~10 sample clips ───────────────────────────────────────────────────
// Semantics deliberately match selectSample()/selectExchange() in
// services/pod-voice-approvals.cjs — the gate's own sampler, and the thing that
// picks which clips a SAMPLE-mode render actually generates. A mirror rather
// than an import: that module require()s node crypto at load, so it cannot
// enter the browser bundle. The property both sides must agree on is tested on
// each side (PodLab.casting.test.js here, pod-voice-approvals.test.cjs there).
//
// Two things the sample has to answer, in this order:
//   1. DO THE TWO VOICES WORK TOGETHER? Lead with a real EXCHANGE — consecutive
//      lines of this pod on one track where the cast puts two different voices
//      against each other. Tom's T-14 rejection, 2026-08-11: "Pods are dialogue
//      - they need distinct speakers", and ten clips off ten scenes never let
//      an ear judge a two-hander.
//   2. IS EVERY VOICE COVERED? Slots are held back for each distinct voice the
//      exchange doesn't reach, so a conversation between two characters can
//      never crowd out the rest of the cast.
const SAMPLE_LIMIT = 10
const EXCHANGE_MAX = 6
// Clips are partitioned by the voice that ACTUALLY rendered them, never by the
// voice the cast would like to claim. That is what lets the same routine build
// a sample for a CANDIDATE cast the pod isn't on: a candidate's evidence is
// simply the clips whose real voice is one of its two.
const clipVoiceKey = (item) => `${item.kind}|${bareVoiceId(item.actualVoiceId) || 'unknown'}`

// Every clip on the pod, each carrying BOTH the voice the cast says should
// speak that line and the voice that actually rendered it.
const allClips = computed(() => {
  const speakers = castSpeakers.value
  const voices = clipVoices.value
  const out = []
  const push = (kind, id, s, text, other) => {
    const cast = resolveSpeakerVoice(speakers, s.speaker, kind)
    const actualId = voices.get(id)?.voice_id || null
    out.push({
      kind, id, speaker: s.speaker, text, other, order: s.global_order,
      voice: cast,
      actualVoiceId: actualId,
      renderedAt: voices.get(id)?.created_at || null,
      // Unknown actual voice (the clip row didn't come back) is NOT treated as
      // a match — the sample must never claim a clip it cannot vouch for.
      onCast: !!(cast && actualId) && bareVoiceId(actualId) === bareVoiceId(cast.voice_id),
    })
  }
  for (const s of sentences.value) {
    if (s.target_audio_id) push('target', s.target_audio_id, s, s.target_text, s.known_text)
    if (s.known_audio_id) push('known', s.known_audio_id, s, s.known_text, s.target_text)
  }
  return out
})

// THE SAMPLE IS OF THE CASTING UNDER APPROVAL, AND NOTHING ELSE. Clips
// rendered on a voice that is no longer cast are still on the pod, still
// playable, and still listed further down — but they cannot be evidence for
// or against the cast Tom is being asked to approve.
function sampleQueue() {
  return allClips.value.filter((c) => c.onCast)
}
const offCastClips = computed(() => allClips.value.filter((c) => !c.onCast))

// "Consecutive" means consecutive WITHIN a track: the queue interleaves each
// line's target and known clip, so raw neighbours are the two halves of one
// line, not two turns of a conversation. The run is anchored at the voice
// change so a window cut off the front of a monologue isn't one voice again.
function pickExchange(queue, budget) {
  if (budget < 2) return []
  const byTrack = new Map()
  for (const item of queue) {
    if (!byTrack.has(item.kind)) byTrack.set(item.kind, [])
    byTrack.get(item.kind).push(item)
  }
  for (const stream of byTrack.values()) {
    for (let i = 0; i + 1 < stream.length; i++) {
      const a = clipVoiceKey(stream[i])
      const b = clipVoiceKey(stream[i + 1])
      if (a === b) continue
      const pair = new Set([a, b])
      let start = i
      while (start > 0 && pair.has(clipVoiceKey(stream[start - 1]))) start--
      const window = stream.slice(start, i + 2)
      return window.slice(Math.max(0, window.length - budget))
    }
  }
  return []
}

// Exchange-first, then coverage — for ANY queue of clips, so each candidate
// column is sampled on exactly the same terms as the cast's own.
function buildSample(queue) {
  const distinct = new Set(queue.map(clipVoiceKey)).size
  const exchange = pickExchange(queue, Math.min(EXCHANGE_MAX, SAMPLE_LIMIT - Math.max(0, distinct - 2)))
  const taken = new Set(exchange)
  const seen = new Set(exchange.map(clipVoiceKey))
  const picked = [...exchange]
  const rest = []
  for (const item of queue) {
    if (taken.has(item)) continue
    const k = clipVoiceKey(item)
    if (seen.has(k)) rest.push(item)
    else { seen.add(k); picked.push(item) }
  }
  const clips = [...picked, ...rest].slice(0, SAMPLE_LIMIT).map((item) => ({
    ...item,
    inExchange: taken.has(item),
  }))
  return { exchange, clips }
}

const castSample = computed(() => buildSample(sampleQueue()))
const sampleExchange = computed(() => castSample.value.exchange)
const sampleClips = computed(() => castSample.value.clips)

// How many distinct voices the sample actually puts in front of the ear, and
// whether they are heard against each other. Stated in words, because "10
// clips" says nothing about whether the two-hander was auditioned.
const sampleShape = computed(() => {
  const clips = sampleClips.value
  const exchange = sampleExchange.value
  const targetVoices = new Set(clips.filter((c) => c.kind === 'target' && c.voice).map((c) => voiceKey(c.voice)))
  const exchangeVoices = [...new Set(exchange.map((c) => c.voice && (c.voice.name || c.voice.voice_id)).filter(Boolean))]
  return {
    clips: clips.length,
    targetVoices: targetVoices.size,
    exchangeLines: exchange.length,
    exchangeVoices,
    exchangeTrack: exchange.length ? exchange[0].kind : null,
  }
})
// Honest emptiness: several courses have no pod audio at all yet.
const sampleGap = computed(() => {
  const total = sentences.value.length
  const withTarget = sentences.value.filter((s) => s.target_audio_id).length
  const withKnown = sentences.value.filter((s) => s.known_audio_id).length
  return { total, withTarget, withKnown, none: !withTarget && !withKnown }
})

// How much of the pod's audio is actually evidence about THIS casting, and
// what the rest was rendered on. Named voices, because "103 older clips" is
// a shrug and "five voices from June" is a fact.
const castCoverage = computed(() => {
  const all = allClips.value
  const off = offCastClips.value
  const otherVoices = [...new Set(off.map((c) => bareVoiceId(c.actualVoiceId)).filter(Boolean))]
  const unknown = off.filter((c) => !c.actualVoiceId).length
  return {
    total: all.length,
    onCast: all.length - off.length,
    off: off.length,
    otherVoices,
    unknown,
    dates: [...new Set(off.map((c) => (c.renderedAt || '').slice(0, 10)).filter(Boolean))].sort(),
  }
})

// ── generating a fresh sample ───────────────────────────────────────────────
// SAMPLE MODE ONLY, AND IT MUST STAY THAT WAY. `sample_limit` is what makes
// phase-8 truncate the queue (and skip the approval check, because without it
// the gate would be unopenable); omit it and the same endpoint is a BULK run.
// The server clamps to POD_SAMPLE_LIMIT_MAX = 10 whatever we send, phase-8
// only ever fills clips whose audio_id is null, and it deletes nothing — so
// the worst case here is ten new clips on lines that had no audio.
//
// Tom's constraint, 2026-08-11: "Do NOT bulk-render anything - the whole point
// of this gate is sample-first, cap the spend, Tom approves before any full
// run." This button is the sample half of that, and it is scoped to the ONE
// pod on screen.
const SAMPLE_GEN_LIMIT = 10
const genBusy = ref(false)
const genMsg = ref('')

async function generateSample(opts = {}) {
  const podId = currentPod.value?.id
  const course = selectedCourseCode.value
  if (!podId || !course || genBusy.value) return
  const unvoiced = targetCast.value.filter((r) => !r.voice).length
  const human = targetCast.value.some((r) => r.voice && r.voice.provider === 'human')
  if (human) {
    genMsg.value = 'This pod is cast on HUMAN voices — TTS cannot render it. It needs its recordings.'
    return
  }
  if (!opts.confirmed && !window.confirm(
    `Generate up to ${SAMPLE_GEN_LIMIT} sample clips for ${podId}?\n\n`
    + 'Sample mode only — the server truncates the queue to 10 and fills only lines '
    + 'that have no audio. Nothing is deleted and no bulk run starts.'
    + (unvoiced ? `\n\n${unvoiced} speaker label(s) have no target voice; their lines can't render.` : ''),
  )) return

  genBusy.value = true
  genMsg.value = 'Generating…'
  try {
    const token = await getAccessToken()
    const res = await fetch(`${getApiUrl()}/api/admin/pods/${encodeURIComponent(course)}/generate-audio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ pod_ids: [podId], sample_limit: SAMPLE_GEN_LIMIT }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.message || body.error || `HTTP ${res.status}`)
    genMsg.value = `${body.mode === 'sample' ? 'SAMPLE' : body.mode} — ${body.generated || 0} generated, `
      + `${body.reused || 0} reused, ${body.failed || 0} failed `
      + `(queue was ${body.queued_before_sample ?? '?'} clips, truncated to ${body.total ?? '?'})`
    await loadCourse(course) // re-bind the new clips so they are playable here
  } catch (e) {
    genMsg.value = `Failed: ${e.message}`
  } finally {
    genBusy.value = false
  }
}

async function playSample(item) {
  stop()
  const myToken = ++stopToken
  isPlaying.value = true
  playingSample.value = `${item.kind}:${item.id}`
  await playClip(item.id, 1)
  if (myToken === stopToken) {
    isPlaying.value = false
    playingSample.value = ''
  }
}
async function playSampleAll() {
  stop()
  const myToken = ++stopToken
  isPlaying.value = true
  for (const item of sampleClips.value) {
    if (myToken !== stopToken) break
    playingSample.value = `${item.kind}:${item.id}`
    await playClip(item.id, 1)
    if (myToken !== stopToken) break
    await sleep(DEFAULT_GAP_MS)
  }
  if (myToken === stopToken) {
    isPlaying.value = false
    playingSample.value = ''
  }
}

// ── CANDIDATE CASTS — the two pairs, side by side, each with its own clips ──
// Tom, 2026-08-11: "I need it to be where I can see it - you need to do
// whatever you need to do to make this an actual tool that's usable" — said
// after looking for the Azure-vs-xAI Spanish samples on this page and finding
// nothing, because they had been published as external doc pages.
//
// So the comparison lives here. A candidate is just a PAIR OF VOICES, and its
// evidence is the clips this pod actually has that were rendered on those two
// voices — read from course_audio, never from listening_pods.speakers. That one
// rule is what makes the whole thing honest: the cast column and a candidate
// column are scored by the same test, and a pair with nothing rendered on it
// says so in plain English instead of borrowing someone else's clips.
//
// Candidates are PAGE STATE. There is deliberately no candidate table: casting
// truth is listening_pods.speakers and adding a second store of "casts we are
// thinking about" would be a second thing to keep in sync. A candidate that has
// clips is re-derivable from those clips anyway (see heardCandidate).
const candidates = ref([])
let candSeq = 0

const pairKeyOf = (m, f) => `${m ? voiceKey(m) : '-'}+${f ? voiceKey(f) : '-'}`

// The pod's cast today — always the first column, always the one the gate's
// fingerprint is about.
const castCandidate = computed(() => ({
  id: 'cast',
  origin: 'cast',
  title: 'Cast now',
  m: currentPair.value.m,
  f: currentPair.value.f,
  pairKey: pairKeyOf(currentPair.value.m, currentPair.value.f),
}))

// A pair inferred from the audio rather than declared: when everything on this
// pod that ISN'T on the cast was rendered by exactly two voices, those two were
// a cast once, and they are what Tom hears today. Named by voice id only —
// nothing on a clip row says which provider or which name.
const heardCandidate = computed(() => {
  const ids = [...new Set(
    offCastClips.value.filter((c) => c.kind === 'target' && c.actualVoiceId).map((c) => bareVoiceId(c.actualVoiceId)),
  )]
  if (ids.length !== 2) return null
  return {
    id: 'heard',
    origin: 'heard',
    title: 'Heard on this pod today',
    voiceIds: ids,
    m: null,
    f: null,
    pairKey: `heard:${ids.join('+')}`,
  }
})

const comparison = computed(() => {
  const out = [castCandidate.value]
  const seen = new Set([castCandidate.value.pairKey])
  for (const c of candidates.value) {
    if (seen.has(c.pairKey)) continue
    seen.add(c.pairKey)
    out.push(c)
  }
  const h = heardCandidate.value
  if (h) out.push(h)
  return out
})

const candVoiceIds = (cand) =>
  cand.voiceIds || [cand.m, cand.f].filter(Boolean).map((v) => bareVoiceId(v.voice_id)).filter(Boolean)

// A candidate's clips: rendered on one of ITS two voices, target track (the
// picker governs the target track only). The cast column keeps the existing
// both-tracks queue so the sample still auditions the known voice too.
function candidateClips(cand) {
  if (cand.origin === 'cast') return sampleQueue()
  const ids = new Set(candVoiceIds(cand))
  return allClips.value.filter(
    (c) => c.kind === 'target' && c.actualVoiceId && ids.has(bareVoiceId(c.actualVoiceId)),
  )
}

const candidateSamples = computed(() => {
  const out = new Map()
  for (const cand of comparison.value) out.set(cand.id, buildSample(candidateClips(cand)))
  return out
})
const candClips = (cand) => (cand.id === 'cast' ? sampleClips.value : candidateSamples.value.get(cand.id)?.clips || [])

// Clips a candidate column is already showing don't also belong in the
// "no longer cast" drawer — they are evidence, not debris.
const claimedByCandidate = computed(() => {
  const ids = new Set()
  for (const cand of comparison.value) {
    if (cand.origin === 'cast') continue
    for (const c of candidateClips(cand)) ids.add(`${c.kind}:${c.id}`)
  }
  return ids
})
const strayClips = computed(() => offCastClips.value.filter((c) => !claimedByCandidate.value.has(`${c.kind}:${c.id}`)))

// The two things an ear can't catch on a pair it hasn't heard yet.
function candFlags(cand) {
  const flags = []
  const iso3 = casting.value?.course?.target_lang || ''
  const voices = [cand.m, cand.f].filter(Boolean)
  if (cand.origin !== 'heard' && voices.length !== 2) {
    flags.push({ level: 'bad', text: `Only ${voices.length} voice — Aran's rule is a two-hander, one male and one female.` })
  }
  const bad = voices.filter((v) => localeMatchesTarget(v.locale, iso3) === false)
  if (bad.length) {
    flags.push({
      level: 'bad',
      text: `${bad.map((v) => `${v.name || v.voice_id} → ${v.locale}`).join(', ')} is steered at a locale that is not ${iso3} — wrong language's phonology.`,
    })
  }
  return flags
}

function candVoiceRows(cand) {
  if (cand.origin === 'heard') {
    return cand.voiceIds.map((id) => ({
      slot: '', name: id, meta: 'rendered these clips · provider not recorded on the clip', voice: null,
    }))
  }
  return [{ slot: 'Female', v: cand.f }, { slot: 'Male', v: cand.m }].map(({ slot, v }) => ({
    slot,
    name: v ? (v.name || v.voice_id) : 'no voice',
    meta: v ? `${v.provider} · ${v.voice_id} · ${v.locale || 'no locale'}` : '—',
    voice: v || null,
  }))
}

// ADD — defines a candidate from the two dropdowns. Writes nothing.
function addCandidate() {
  const m = chosen('m')
  const f = chosen('f')
  if (!m && !f) return
  const key = pairKeyOf(m, f)
  if (comparison.value.some((c) => c.pairKey === key)) {
    pickerMsg.value = 'That pair is already in the comparison below.'
    return
  }
  candidates.value.push({
    id: `cand-${++candSeq}`,
    origin: 'defined',
    title: [f && (f.name || f.voice_id), m && (m.name || m.voice_id)].filter(Boolean).join(' & '),
    m: m ? { ...m } : null,
    f: f ? { ...f } : null,
    pairKey: key,
  })
  pickerMsg.value = 'Added to the comparison — listen to it below, or generate it a sample.'
}
function dropCandidate(cand) {
  candidates.value = candidates.value.filter((c) => c.id !== cand.id)
}

// Hear a voice of a candidate directly — a few seconds of TTS, per click.
async function previewCandidateVoice(cand, row) {
  if (!row.voice || pickerBusy.value) return
  const g = row.slot === 'Male' ? 'm' : 'f'
  const prev = pick.value[g]
  pick.value[g] = voiceKey(row.voice)
  try {
    if (!chosen(g)) { pick.value[g] = prev; pickerMsg.value = 'That voice is not in the dropdown list — pick it there to preview.'; return }
    await previewVoice(g)
  } finally {
    pick.value[g] = prev
  }
}

async function playCandidateAll(cand) {
  stop()
  const myToken = ++stopToken
  isPlaying.value = true
  for (const item of candClips(cand)) {
    if (myToken !== stopToken) break
    playingSample.value = `${item.kind}:${item.id}`
    await playClip(item.id, 1)
    if (myToken !== stopToken) break
    await sleep(DEFAULT_GAP_MS)
  }
  if (myToken === stopToken) {
    isPlaying.value = false
    playingSample.value = ''
  }
}

// GENERATE for a candidate. Phase-8 renders from listening_pods.speakers, so a
// candidate has to BE the cast for a second before it can be sampled: cast it,
// then run the same capped sample path. Casting writes nothing but speakers and
// deletes nothing, and the clips that come back are stamped with the voice that
// rendered them — so they stay this candidate's evidence even if the cast moves
// back afterwards.
async function generateCandidateSample(cand) {
  if (cand.origin === 'heard') return
  if (cand.origin === 'cast') return generateSample()
  if (genBusy.value || pickerBusy.value) return
  if (!window.confirm(
    `Cast ${currentPod.value?.id} on this pair and render up to ${SAMPLE_GEN_LIMIT} sample clips?\n\n`
    + `female: ${cand.f ? `${cand.f.name} (${cand.f.provider}, ${cand.f.locale || 'no locale'})` : 'unchanged'}\n`
    + `male:   ${cand.m ? `${cand.m.name} (${cand.m.provider}, ${cand.m.locale || 'no locale'})` : 'unchanged'}\n\n`
    + 'Sample mode only — the server truncates to 10 clips and fills only lines with no audio. '
    + 'Nothing is deleted. The current approval goes stale, so generation re-locks until you approve a cast.',
  )) return
  genBusy.value = true
  genMsg.value = 'Casting this pair…'
  try {
    const body = await writeCast(cand.m, cand.f)
    await loadCasting(casting.value?.course_code)
    genMsg.value = `Cast ${body.cast_fingerprint} — generating…`
  } catch (e) {
    genMsg.value = `Failed: ${e.message}`
    genBusy.value = false
    return
  }
  genBusy.value = false
  await generateSample({ confirmed: true })
}

// APPROVE a candidate — one action: it becomes the pod's cast, and the approval
// is recorded against the digest that write returns.
async function approveCandidate(cand) {
  if (cand.origin === 'cast') return decideCasting('approve')
  if (cand.origin === 'heard' || castingSaving.value || !casting.value) return
  if (!window.confirm(
    `Approve this pair as the cast for ${currentPod.value?.id}?\n\n`
    + `female: ${cand.f ? `${cand.f.name} (${cand.f.provider}, ${cand.f.locale || 'no locale'})` : 'unchanged'}\n`
    + `male:   ${cand.m ? `${cand.m.name} (${cand.m.provider}, ${cand.m.locale || 'no locale'})` : 'unchanged'}\n\n`
    + 'It becomes the cast and the approval is recorded against it, unlocking generation. '
    + 'No audio is generated and no clip is deleted.',
  )) return
  castingSaving.value = 'approve'
  castingMsg.value = ''
  try {
    const applied = await writeCast(cand.m, cand.f)
    await loadCasting(casting.value?.course_code)
    await postDecision('approve', applied.cast_fingerprint)
    dropCandidate(cand) // it is the cast now; the cast column is where it lives
    castingMsg.value = `Approved ✓ — this pair is now the cast, and generation is unlocked for casting ${applied.cast_fingerprint}`
  } catch (e) {
    castingMsg.value = `Failed: ${e.message}`
  } finally {
    castingSaving.value = ''
  }
}

loadLiveConfig()
</script>

<template>
  <div class="podlab">
    <LabCrumbs :trail="[{ label: 'Labs', to: '/admin/labs' }, { label: 'Pod Lab' }]" />

    <header class="lab-head">
      <h1>Pod Lab</h1>
      <p class="sub">
        <strong>The ladder</strong> auditions the unified climb (2026-07-03): one t·k·t·t pattern
        from finest units, fusing rung by rung into the whole turn, then the speed cascade to
        pure&nbsp;2× — where immersion emerges. <strong>Stage arc</strong> plays the same line
        through today's <strong>real</strong> <code>@ssi/core/pods</code> engine for comparison.
      </p>
      <p class="safety">
        This Lab never writes <code>algorithm_config</code> (those writes hit every learner within
        ~5&nbsp;min). Tune the ladder <em>and the gaps</em> here, hear it, then export the JSON and
        apply it deliberately. Its <em>other</em> writes are a different question — see the banner.
      </p>
    </header>

    <!-- BLAST RADIUS (2026-09-01). This header said "Preview & export only" for
         months, which is true of the CONFIG and false of the page. Saving a seam
         in the fine-map editor writes atom_map_fine, which the learner's Drill
         reads live off listening_pod_sentences on every fetch — no render, no
         approval. Casting, voice approval and the sample fill are deferred. The
         tier states the highest of the four, because a label pitched at the
         average control is a label that lies about the dangerous one. -->
    <BlastRadiusBanner
      tier="live"
      note="That is the fine-map editor specifically: a seam or gloss saved here is read by the next learner to open this pod's Drill. Casting, voice approval and the sample-clip fill are deferred to the next render."
    />

    <!-- Signpost (2026-08-31). Tom looked for the canonical scripts HERE, because
         this is the pod surface. They are not here: this Lab tunes the acquisition
         ladder for ONE course's generated pod. The language-neutral English masters
         live in the Script Lab, course-free. One tap across. -->
    <nav class="elsewhere">
      <router-link to="/canonical/scripts">Canonical scripts — view and edit, no course →</router-link>
      <router-link to="/canonical/metagraph">The shape graph, with the pods over it →</router-link>
    </nav>

    <div class="pickers">
      <CoursePicker
        :modelValue="selectedCourseCode"
        @update:modelValue="onCoursePick"
        placeholder="Search courses…"
      />
      <span v-if="loading" class="chip">loading…</span>
      <span v-else-if="sentences.length" class="chip ok">{{ sentences.length }} lines · {{ currentPodSlug }}</span>
      <span v-if="error" class="chip err">{{ error }}</span>
    </div>

    <div v-if="sentences.length" class="cols">
      <!-- LEFT: line + config -->
      <section class="panel">
        <div class="field">
          <span class="lbl">Lines <span class="lbl small">— seams &amp; rung depth at a glance</span></span>
          <div class="line-list">
            <button
              v-for="(s, i) in sentences"
              :key="s.id || i"
              class="line-row"
              :class="{ on: i === selectedIdx }"
              @click="selectedIdx = i"
            >
              <span class="row-n">{{ s.global_order }}</span>
              <span v-if="sentenceRungDepth(s) != null" class="row-rungs" title="rung depth">{{ sentenceRungDepth(s) }}</span>
              <!-- The line is target text broken into parts with neutral `|`
                   seam marks between them, on a row that also carries the LTR
                   order number and rung count. Direct + isolate the text span
                   so the parts and the seams order by the SENTENCE's direction
                   and the numbers to its left stay put. -->
              <span class="row-text bidi-isolate" :dir="dirFor(s.target_text)">
                <template v-for="(p, pi) in seamPreviewParts(s.target_text)" :key="pi"
                  >{{ p.text }}<span v-if="p.seam" class="seam-mark">|</span></template
                >
              </span>
            </button>
          </div>
        </div>

        <div v-if="selectedSentence" class="line-card">
          <div class="knw">{{ selectedSentence.known_text }}</div>
          <div class="meta">
            {{ atomCount }} atom{{ atomCount === 1 ? '' : 's' }}
            <span v-if="!selectedSentence.explainer_audio_id" class="muted"> · no explainer clip</span>
            <span v-if="selectedSentence.glue_to_next" class="muted"> · glues on</span>
          </div>
        </div>

        <!-- SEAM EDITOR — review the canon S-LEGO seams (the '…' marks baked
             into target_text); accept / remove / relocate, never draft blank -->
        <div v-if="mode === 'shapes' && selectedSentence" class="seam-editor">
          <div class="cfg-head">
            <span class="lbl">Review seams — <span class="on-hint">|</span> canon, click to remove or relocate</span>
            <button class="save-seams" :disabled="!seamDirty || seamSaving" @click="saveFineMap">
              {{ seamSaving ? 'Saving…' : 'Save review' }}
            </button>
          </div>
          <!-- One sentence split across many sibling elements: each token is its
               own box and each seam button sits BETWEEN two of them, so the
               order the boxes are laid out in IS the reading order. Under an
               LTR container an Arabic line therefore renders back-to-front and
               every seam button points at the wrong gap. `dir` on the flex
               container is what mirrors the row; this is the one place the fix
               deliberately changes layout, and only for RTL sentences. -->
          <div v-if="editorTokens.length" class="seam-line" :dir="dirFor(selectedSentence.target_text)">
            <template v-for="(t, i) in editorTokens" :key="i">
              <span class="tok">{{ t.text }}</span>
              <button
                v-if="i < editorTokens.length - 1"
                class="seam"
                :class="seamState(i)"
                :title="seamTitle(i)"
                @click="toggleSeam(i)"
              >
                {{ seamGlyph(i) }}
              </button>
            </template>
          </div>
          <div v-if="editorTokens.length" class="unit-glosses">
            <div v-for="(u, i) in editorUnits" :key="u.start + ':' + u.end" class="unit-row">
              <span class="unit-surface bidi-isolate" :dir="dirFor(u.surface)">{{ u.surface }}</span>
              <input
                v-model="u.gloss"
                class="gloss-input"
                placeholder="gloss…"
                @input="seamDirty = true"
              />
            </div>
          </div>
          <span v-if="seamMsg" class="chip" :class="{ err: seamMsg.startsWith('Save failed') }">{{ seamMsg }}</span>
        </div>

        <div v-if="mode === 'arc'" class="config">
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

          <div class="field gaps">
            <span class="lbl small">
              Gaps · ms
              <button class="mini" @click="applyHardCut">Hard cut (0)</button>
              <button class="mini" @click="labGaps = { ...liveGaps }">Live</button>
            </span>
            <p class="note">
              The pauses the learner hears. Change a number and press play — the arc re-paces
              immediately, using the same rule the main flow runs. Launched on
              <strong>0 everywhere</strong> (2026-08-24): a hard cut, no pause between clips or
              between sentences.
            </p>
            <label v-for="f in GAP_FIELDS" :key="f.key" class="gap-row">
              <input
                type="number"
                min="0"
                step="25"
                :value="labGaps[f.key]"
                @input="labGaps = { ...labGaps, [f.key]: Math.max(0, Number($event.target.value) || 0) }"
              />
              <code>{{ f.key }}</code>
              <span class="gap-what">{{ f.label }}</span>
            </label>
          </div>

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
        <div class="mode-switch">
          <button :class="{ on: mode === 'shapes' }" @click="mode = 'shapes'">The ladder</button>
          <button :class="{ on: mode === 'arc' }" @click="mode = 'arc'">Stage arc (live engine)</button>
          <button :class="{ on: mode === 'casting' }" @click="mode = 'casting'">Casting &amp; approval</button>
          <button class="stop right" :disabled="!isPlaying" @click="stop">■ Stop</button>
        </div>

        <!-- STAGE ARC — the established Stage-0 tiers + Stages 1..N ladder -->
        <template v-if="mode === 'arc'">
          <div class="transport">
            <button class="play-all" :disabled="!arc.length" @click="playWholeArc">▶ Play whole arc</button>
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
        </template>

        <!-- CASTING & APPROVAL — the sample-first gate, per course (2026-08-07).
             Everything here is the cast AS STORED in listening_pods.speakers,
             which is what phase-8 reads at generation time. -->
        <template v-else-if="mode === 'casting'">
          <div v-if="castingLoading" class="empty">Loading casting…</div>
          <div v-else-if="castingError" class="empty err-box">Casting unavailable: {{ castingError }}</div>
          <template v-else-if="casting">
            <div class="cast-head">
              <span class="chip" :class="casting.gate?.ok ? 'ok' : 'err'">
                {{ casting.gate?.ok ? 'APPROVED — generation unlocked' : casting.record ? (casting.record.rejected_at ? 'REJECTED' : 'approval STALE — the cast changed since it was granted') : 'awaiting approval' }}
              </span>
              <span class="chip mono" title="the gate's own cast fingerprint">{{ casting.cast_fingerprint }}</span>
              <span v-if="casting.record" class="muted small">
                {{ casting.record.approved_by || casting.record.rejected_by }} ·
                {{ (casting.record.approved_at || casting.record.rejected_at || '').slice(0, 16).replace('T', ' ') }}
              </span>
            </div>

            <!-- WHICH POD IS UNDER THE EAR. Stated, never inferred: sampling a
                 stale `pod-0` while the current content sat in the working copy
                 is what T-14 was rejected for. -->
            <p v-if="podSource" class="pod-source">
              Sampling <code>{{ podSource.id }}</code> — <strong>{{ podSource.lines }}</strong> live lines.
              <span v-if="podSource.siblings.length" class="muted">
                Not: {{ podSource.siblings.join(', ') }}.
              </span>
            </p>

            <ul class="cast-flags">
              <li v-for="(f, i) in castFlags" :key="i" :class="f.level">{{ f.text }}</li>
            </ul>

            <!-- MANUAL VOICE CHOICE. Two slots, because Aran's rule makes a pod
                 a two-hander: one male voice, one female voice, whole pod.
                 Both open on what is cast today, so changing nothing changes
                 nothing. Casting only — neither button renders audio. -->
            <div class="vpick">
              <div class="lbl small">
                Try a pair — pick the two target voices by hand
                <span v-if="voicePools?.target" class="muted">
                  · pool <code>{{ voicePools.target.pool_key }}</code>
                  <!-- Say out loud whether this key is a stored ruling or a
                       fallback. A regional variant carries the BASE tag in
                       target_lang, so before T-21 this line could read `deu`
                       for an Austrian German course and nothing on screen
                       said the cast belonged to German instead. -->
                  <template v-if="voicePools.voice_pool_key">
                    (pinned for this course, not shared with
                    <code>{{ voicePools.target_lang }}</code>)
                  </template>
                  <template v-if="voicePools.sibling_keys?.length">
                    (also on record: {{ voicePools.sibling_keys.join(', ') }})
                  </template>
                </span>
              </div>
              <div v-if="pickerError" class="chip err">{{ pickerError }}</div>
              <div v-for="slot in [{ g: 'm', t: 'Male' }, { g: 'f', t: 'Female' }]" :key="slot.g" class="vpick-row">
                <span class="vp-slot">{{ slot.t }}</span>
                <select v-model="pick[slot.g]" class="vp-select">
                  <option v-if="!pick[slot.g]" value="">— no voice cast —</option>
                  <option v-for="o in (slot.g === 'm' ? optionsM : optionsF)" :key="o.key" :value="o.key">
                    {{ voiceLabel(o) }}
                  </option>
                </select>
                <button
                  class="vp-play"
                  :disabled="!!pickerBusy || !pick[slot.g]"
                  :title="`Hear this voice on a line of this pod (a few seconds of TTS)`"
                  @click="previewVoice(slot.g)"
                >{{ pickerBusy === `preview:${slot.g}` ? '…' : '▶' }}</button>
              </div>
              <div class="vpick-foot">
                <button class="vp-add" :disabled="!!pickerBusy || !pickChanged" @click="addCandidate">
                  + Add as a candidate
                </button>
                <button class="vp-apply" :disabled="!!pickerBusy || !pickChanged" @click="applyVoices">
                  {{ pickerBusy === 'apply' ? 'Applying…' : 'Apply to this pod' }}
                </button>
                <span class="muted small">
                  Adding puts the pair beside the current cast below, to listen to and approve.
                  Neither button generates audio or deletes a clip; applying re-locks generation
                  until you approve the new cast.
                </span>
                <span v-if="pickerMsg" class="chip" :class="{ err: pickerMsg.startsWith('Failed') || pickerMsg.startsWith('Preview failed') }">{{ pickerMsg }}</span>
              </div>
              <!-- The key to the consent lock, shown WHERE THE REFUSAL HAPPENED
                   and nowhere else. Recording the consent re-runs the cast or
                   the audition it blocked, so this is one pass rather than a
                   trip to another screen. -->
              <ConsentStep
                v-if="consentNeeded"
                :voice-id="consentNeeded.voiceId"
                :reason="consentNeeded.reason"
                :language="casting?.course?.target_lang || ''"
                @recorded="onConsentRecorded"
                @cancel="consentNeeded = null"
              />
            </div>

            <!-- THE COMPARISON. One column per candidate cast, each carrying its
                 own voices, its own clips and its own approve button, so the
                 whole decision is listen-then-press on one screen. A column's
                 clips are the ones this pod actually has that were RENDERED on
                 that pair (course_audio), never the ones the stored cast claims —
                 which is why a pair with nothing rendered on it says so instead
                 of borrowing someone else's audio. -->
            <div class="candidates">
              <section v-for="cand in comparison" :key="cand.id" class="candidate" :class="cand.origin">
                <header class="cand-head">
                  <span class="chip" :class="cand.origin === 'cast' ? (casting.gate?.ok ? 'ok' : '') : ''">
                    {{ cand.origin === 'cast' ? 'CAST NOW' : cand.origin === 'heard' ? 'HEARD TODAY' : 'CANDIDATE' }}
                  </span>
                  <strong class="cand-title">{{ cand.title }}</strong>
                  <button v-if="cand.origin === 'defined'" class="cand-drop" title="remove from the comparison — writes nothing" @click="dropCandidate(cand)">×</button>
                </header>

                <div class="cand-voices">
                  <div v-for="(row, i) in candVoiceRows(cand)" :key="i" class="cand-voice">
                    <span class="cv-slot">{{ row.slot }}</span>
                    <span class="cv-name">{{ row.name }}</span>
                    <span class="cv-meta mono">{{ row.meta }}</span>
                    <button
                      v-if="row.voice"
                      class="cv-play"
                      :disabled="!!pickerBusy"
                      title="hear this voice on a line of this pod (a few seconds of TTS)"
                      @click="previewCandidateVoice(cand, row)"
                    >▶</button>
                  </div>
                </div>

                <ul v-if="cand.origin !== 'cast' && candFlags(cand).length" class="cand-flags">
                  <li v-for="(f, i) in candFlags(cand)" :key="i" :class="f.level">{{ f.text }}</li>
                </ul>

                <p v-if="cand.origin === 'heard'" class="muted small">
                  These two voices rendered the audio this pod has now, but they are not its cast.
                  To cast them, pick them in the dropdowns above — the clip row records only the id.
                </p>

                <!-- CAST COLUMN — the existing sample, coverage prose and gate. -->
                <template v-if="cand.origin === 'cast'">
                  <div class="transport">
                    <button class="play-all" :disabled="!sampleClips.length" @click="playSampleAll">
                      ▶ Play the sample ({{ sampleClips.length }} clips)
                    </button>
                    <button class="gen-sample" :disabled="genBusy || !currentPod" @click="generateSample()">
                      {{ genBusy ? 'Generating…' : `Generate a sample (max ${SAMPLE_GEN_LIMIT} clips)` }}
                    </button>
                    <span v-if="genMsg" class="chip" :class="{ err: genMsg.startsWith('Failed') }">{{ genMsg }}</span>
                  </div>
                  <p class="legend muted small">
                    <template v-if="sampleShape.exchangeLines">
                      Leads with a <strong>{{ sampleShape.exchangeLines }}-line exchange</strong> on the
                      {{ sampleShape.exchangeTrack }} track — {{ sampleShape.exchangeVoices.join(' answering ') }} —
                      so you hear the two voices against each other, then one clip of every voice the
                      exchange didn't reach.
                    </template>
                    <template v-else>
                      No exchange available: no two consecutive lines of this pod are cast on different
                      voices, so this is coverage only — one clip per voice. That is a casting problem,
                      not a sampling one.
                    </template>
                  </p>

                  <div v-if="sampleGap.none" class="empty">
                    No pod audio exists for this course yet — nothing to listen to. Generate a sample first.
                  </div>
                  <!-- WHAT THE SAMPLE IS EVIDENCE FOR. A pod's audio accumulates while
                       the casting moves under it; a clip rendered on a voice that is
                       no longer cast tells you nothing about the cast you're
                       approving, so it is excluded and said out loud. -->
                  <p v-else-if="!castCoverage.onCast" class="note bad-note">
                    <strong>Nothing on this pod was rendered on the casting above.</strong>
                    All {{ castCoverage.total }} clips are on other voices
                    <template v-if="castCoverage.otherVoices.length">({{ castCoverage.otherVoices.join(', ') }})</template>
                    <template v-if="castCoverage.unknown">, {{ castCoverage.unknown }} with no voice on record</template>.
                    There is nothing here to approve this cast on — generate a sample.
                  </p>
                  <p v-else-if="castCoverage.off" class="note">
                    <strong>{{ castCoverage.onCast }} of {{ castCoverage.total }}</strong> clips on this pod
                    were rendered on the casting above; those are the only ones sampled.
                    The other {{ castCoverage.off }} are on
                    {{ castCoverage.otherVoices.length }} older voice{{ castCoverage.otherVoices.length === 1 ? '' : 's' }}
                    ({{ castCoverage.otherVoices.join(', ') }}<template v-if="castCoverage.dates.length">, rendered {{ castCoverage.dates[0] }}<template v-if="castCoverage.dates.length > 1">–{{ castCoverage.dates[castCoverage.dates.length - 1] }}</template></template>)
                    and are listed below the sample — they are not evidence about this cast.
                  </p>

                  <div class="samples primary">
                    <div v-for="c in sampleClips" :key="c.kind + ':' + c.id" class="sample-row" :class="{ on: playingSample === c.kind + ':' + c.id, exch: c.inExchange }">
                      <button class="s-play" @click="playSample(c)">▶</button>
                      <span class="s-exch" :title="c.inExchange ? 'part of the exchange — consecutive lines, two voices' : 'voice coverage'">{{ c.inExchange ? '⇄' : '·' }}</span>
                      <span class="s-kind" :class="c.kind === 'target' ? 'r-target' : 'r-known'">{{ c.kind === 'target' ? 'T' : 'K' }}</span>
                      <span class="s-speaker">{{ c.speaker }}</span>
                      <span class="s-voice mono">{{ c.voice ? (c.voice.name || c.voice.voice_id) : 'no voice' }}</span>
                      <span class="s-text">
                        <span class="s-main bidi-isolate" :dir="dirFor(c.text)">{{ c.text }}</span>
                        <span class="s-other bidi-isolate" :dir="dirFor(c.other)">{{ c.other }}</span>
                      </span>
                    </div>
                  </div>

                  <div class="cast-decide">
                    <input v-model="castNote" class="cast-note" placeholder="note (optional) — what you heard" />
                    <button class="approve" :disabled="!!castingSaving" @click="decideCasting('approve')">
                      {{ castingSaving === 'approve' ? 'Saving…' : 'Approve this casting' }}
                    </button>
                    <button class="reject" :disabled="!!castingSaving" @click="decideCasting('reject')">
                      {{ castingSaving === 'reject' ? 'Saving…' : 'Reject' }}
                    </button>
                    <span v-if="castingMsg" class="chip" :class="{ err: castingMsg.startsWith('Failed') }">{{ castingMsg }}</span>
                  </div>
                </template>

                <!-- CANDIDATE COLUMN — same test, its own clips. -->
                <template v-else>
                  <div class="transport">
                    <button class="play-all" :disabled="!candClips(cand).length" @click="playCandidateAll(cand)">
                      ▶ Play its clips ({{ candClips(cand).length }})
                    </button>
                    <button
                      v-if="cand.origin === 'defined'"
                      class="gen-sample"
                      :disabled="genBusy || !currentPod"
                      @click="generateCandidateSample(cand)"
                    >
                      {{ genBusy ? 'Generating…' : `Cast it and generate a sample (max ${SAMPLE_GEN_LIMIT} clips)` }}
                    </button>
                  </div>

                  <p v-if="!candClips(cand).length" class="note cand-empty">
                    <strong>Nothing on this pod has been rendered on this pair yet</strong> — there is
                    nothing to listen to until you generate one. The button casts the pod on this pair
                    and renders up to {{ SAMPLE_GEN_LIMIT }} clips; nothing is deleted.
                  </p>

                  <div class="samples">
                    <div v-for="c in candClips(cand)" :key="cand.id + ':' + c.kind + ':' + c.id" class="sample-row" :class="{ on: playingSample === c.kind + ':' + c.id, exch: c.inExchange }">
                      <button class="s-play" @click="playSample(c)">▶</button>
                      <span class="s-exch">{{ c.inExchange ? '⇄' : '·' }}</span>
                      <span class="s-kind" :class="c.kind === 'target' ? 'r-target' : 'r-known'">{{ c.kind === 'target' ? 'T' : 'K' }}</span>
                      <span class="s-speaker">{{ c.speaker }}</span>
                      <span class="s-voice mono" title="the voice that actually rendered this clip">{{ bareVoiceId(c.actualVoiceId) || 'unknown voice' }}</span>
                      <span class="s-text">
                        <span class="s-main bidi-isolate" :dir="dirFor(c.text)">{{ c.text }}</span>
                        <span class="s-other">{{ (c.renderedAt || '').slice(0, 10) }}</span>
                      </span>
                    </div>
                  </div>

                  <div v-if="cand.origin === 'defined'" class="cast-decide">
                    <button class="approve cand-approve" :disabled="!!castingSaving" @click="approveCandidate(cand)">
                      {{ castingSaving === 'approve' ? 'Saving…' : 'Approve — cast the pod on this pair' }}
                    </button>
                    <button class="reject" :disabled="!!castingSaving" @click="dropCandidate(cand)">
                      Reject
                    </button>
                    <span class="muted small">Rejecting only drops it from this comparison — the pod's cast is untouched.</span>
                  </div>
                </template>
              </section>
            </div>

            <!-- The whole cast, both tracks, every speaker label. Folded away
                 because the two-hander above is the decision; this is the
                 detail behind it. -->
            <details class="cast-detail">
              <summary>Full cast detail — every speaker label, target and known tracks</summary>
              <div class="cast-tables">
                <div v-for="grp in [{ t: 'Target voices', rows: targetCast }, { t: 'Known voices', rows: knownCast }]" :key="grp.t" class="cast-table">
                  <div class="lbl small">{{ grp.t }}</div>
                  <div v-for="r in grp.rows" :key="r.key" class="cast-row" :class="{ none: !r.voice }">
                    <span class="cv-name">{{ r.voice ? (r.voice.name || r.voice.voice_id) : 'NO VOICE' }}</span>
                    <span class="cv-g">{{ r.voice ? r.voice.gender : '—' }}</span>
                    <span class="cv-meta mono">{{ r.voice ? `${r.voice.provider} · ${r.voice.voice_id} · ${r.voice.locale || 'no locale'}` : '—' }}</span>
                    <span class="cv-cover">{{ r.labels.length }} label{{ r.labels.length === 1 ? '' : 's' }} · {{ r.lines }} line{{ r.lines === 1 ? '' : 's' }} ({{ r.share }}%)</span>
                    <span class="cv-labels" :title="r.labels.join(', ')">{{ r.labels.slice(0, 6).join(', ') }}{{ r.labels.length > 6 ? '…' : '' }}</span>
                  </div>
                </div>
              </div>
            </details>

            <p v-if="otherPodIds.length" class="note">
              This course has other pods in the same approval —
              <code v-for="id in otherPodIds" :key="id">{{ id }}</code> — their lines aren't listed
              on this page, but their casting is inside the fingerprint you're approving.
            </p>

            <!-- Off-cast audio. Kept playable — it is what the pod sounds like
                 today — but held apart from the sample so it cannot be mistaken
                 for evidence about the casting under approval. Clips a candidate
                 column above is already showing are not repeated here. -->
            <details v-if="strayClips.length" class="offcast">
              <summary>
                {{ strayClips.length }} more clip{{ strayClips.length === 1 ? '' : 's' }} on this pod,
                rendered on voices that are no longer cast — playable, but not part of the sample
              </summary>
              <div class="samples">
                <div v-for="c in strayClips.slice(0, 40)" :key="'off:' + c.kind + ':' + c.id" class="sample-row" :class="{ on: playingSample === c.kind + ':' + c.id }">
                  <button class="s-play" @click="playSample(c)">▶</button>
                  <span class="s-exch">·</span>
                  <span class="s-kind" :class="c.kind === 'target' ? 'r-target' : 'r-known'">{{ c.kind === 'target' ? 'T' : 'K' }}</span>
                  <span class="s-speaker">{{ c.speaker }}</span>
                  <span class="s-voice mono" :title="`cast says ${c.voice ? (c.voice.name || c.voice.voice_id) : 'no voice'}`">
                    {{ bareVoiceId(c.actualVoiceId) || 'unknown voice' }}
                  </span>
                  <span class="s-text">
                    <span class="s-main bidi-isolate" :dir="dirFor(c.text)">{{ c.text }}</span>
                    <span class="s-other">{{ (c.renderedAt || '').slice(0, 10) }}</span>
                  </span>
                </div>
              </div>
              <p v-if="strayClips.length > 40" class="muted small">
                …and {{ strayClips.length - 40 }} more, not listed.
              </p>
            </details>
          </template>
        </template>

        <!-- THE UNIFIED LADDER — fusion rungs then the speed ramp, one row per stage -->
        <template v-else>
          <p class="shape-note">
            Rungs fuse canon S-LEGO seams up to the whole turn (≡ engine Stage 1), then the speed
            cascade to pure&nbsp;t@2×. No internal seam → no fusion rung — straight to the whole.
          </p>

          <details class="options">
            <summary>Options</summary>
            <div class="gloss-dial">
              <template v-if="hasFine">
                <span class="lbl small">Content units:</span>
                <button :class="{ on: unitsSource === 'fine' }" @click="unitsSource = 'fine'">
                  draft fine (Aran)
                </button>
                <button :class="{ on: unitsSource === 'live' }" @click="unitsSource = 'live'">live atoms</button>
              </template>
              <span class="lbl small">Fusion:</span>
              <button :class="{ on: fusionMode === 'pairwise' }" @click="fusionMode = 'pairwise'">
                pairwise (Aran)
              </button>
              <button :class="{ on: fusionMode === 'chained' }" @click="fusionMode = 'chained'">
                chained overlap (Tom)
              </button>
            </div>
          </details>

          <div class="transport">
            <button class="play-all" :disabled="!ladderRungs.length" @click="playWholeClimb">
              ▶ Play the whole climb
            </button>
            <span v-if="ladderRungs.length" class="legend">{{ ladderRungs.length }} rungs</span>
          </div>

          <div v-if="!ladderRungs.length" class="empty">
            This line has no atom_map — pick a line with atoms to audition the ladder.
          </div>

          <div v-for="rung in ladderRungs" :key="rung.key" class="shape-row">
            <div class="shape-head">
              <button class="mini" @click="playShapeSteps(rung.steps)">▶</button>
              <span class="shape-name">{{ rung.label }}</span>
              <span class="shape-desc">{{ rung.note }}</span>
            </div>
            <div class="plays">
              <button
                v-for="st in rung.steps"
                :key="st.key"
                class="playchip shapechip"
                :class="[
                  STEP_CLS[st.kind],
                  {
                    now: playingStepKey === st.key,
                    approx: st.approx && st.hasAudio,
                    missing: !st.hasAudio,
                  },
                ]"
                :disabled="!st.hasAudio"
                :title="
                  !st.hasAudio
                    ? 'no audio yet at this granularity — ' + st.text
                    : st.kind +
                      (st.rate === 2 ? ' · 2×' : '') +
                      (st.approx ? ' (fallback: coarser/concatenated clips)' : '') +
                      ' — ' +
                      st.text
                "
                @click="playShapeSteps([st])"
              >
                <!-- Target chunk sharing the button with the LTR "2×" tag. -->
                <span class="bidi-isolate" :dir="dirFor(st.text)">{{ st.text }}</span><span v-if="st.rate === 2" class="x2">2×</span>
              </button>
            </div>
          </div>
        </template>
      </section>
    </div>

    <p v-else-if="!loading && selectedCourseCode" class="empty pad">
      No core pod for this course yet.
    </p>
    <p v-else-if="!selectedCourseCode" class="empty pad">Pick a course to load its pod.</p>
  </div>
</template>

<style scoped>
.podlab > :deep(.blast-banner) { margin-bottom: 1rem; }

.podlab {
  max-width: none;
  margin: 0 auto;
  padding: 20px 22px 60px;
  color: var(--color-paper, var(--ink));
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
.elsewhere { display: flex; flex-wrap: wrap; gap: 10px; margin: 0 0 18px; }
.elsewhere a {
  display: inline-block; padding: 8px 12px; border-radius: 8px;
  border: 1px solid var(--line, #2a3446); background: var(--surface, #172032);
  color: var(--accent-2, #4ade80); font-size: 13px; text-decoration: none;
}
.elsewhere a:hover { border-color: var(--accent-2, #4ade80); }
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
.line-list {
  max-height: 320px;
  overflow-y: auto;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface-2);
}
.line-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  width: 100%;
  padding: 7px 10px;
  border: none;
  border-bottom: 1px solid var(--line);
  background: transparent;
  color: var(--ink);
  text-align: left;
  font-size: 13px;
  cursor: pointer;
}
.line-row:last-child {
  border-bottom: none;
}
.line-row:hover {
  background: var(--surface);
}
.line-row.on {
  background: rgba(52, 211, 153, 0.12);
}
.row-n {
  flex: none;
  width: 22px;
  color: var(--muted);
  font-size: 11px;
}
.row-rungs {
  flex: none;
  min-width: 18px;
  text-align: center;
  font-size: 10px;
  font-weight: 700;
  color: var(--accent-2);
  background: rgba(52, 211, 153, 0.14);
  border-radius: 999px;
  padding: 1px 5px;
}
.row-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  /* Pinned: the span binds `dir` per sentence, and dir="rtl" would otherwise
     flush a short Arabic line to the right of the row. Direction is the fix. */
  text-align: left;
}
.row-text .seam-mark {
  color: var(--accent-2);
  font-weight: 700;
  margin: 0 1px;
}
.on-hint {
  color: var(--accent-2);
  font-weight: 700;
}
.options {
  margin: 0 0 14px;
}
.options summary {
  cursor: pointer;
  font-size: 12px;
  color: var(--muted);
}
.line-card {
  background: var(--surface-2);
  border-radius: 10px;
  padding: 12px 14px;
  margin-bottom: 16px;
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
.gaps {
  margin: 12px 0 4px;
}
.gaps .mini {
  margin-left: 6px;
  padding: 1px 7px;
  font-size: 11px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: transparent;
  color: var(--muted);
  cursor: pointer;
}
.gaps .mini:hover {
  color: var(--ink);
  border-color: var(--accent-2);
}
.gap-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 12px;
}
.gap-row input {
  width: 74px;
  padding: 4px 6px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--canvas);
  color: var(--ink);
  font-family: var(--font-mono, ui-monospace, Menlo, monospace);
  text-align: right;
}
.gap-row code {
  min-width: 128px;
  color: var(--ink);
}
.gap-what {
  color: var(--muted);
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
.mode-switch {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-bottom: 14px;
}
.mode-switch button {
  font-size: 12px;
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: transparent;
  color: var(--muted);
  cursor: pointer;
}
.mode-switch button:hover {
  color: var(--ink);
  border-color: var(--muted);
}
.mode-switch button.on {
  background: rgba(52, 211, 153, 0.15);
  color: var(--accent-2);
  border-color: var(--accent-2);
}
.mode-switch .right {
  margin-left: auto;
}
.shape-note {
  font-size: 12px;
  color: var(--muted);
  line-height: 1.5;
  margin: 0 0 12px;
  padding: 8px 10px;
  background: var(--surface-2);
  border-radius: 8px;
}
.gloss-dial {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.gloss-dial .lbl {
  margin: 0 4px 0 0;
}
.gloss-dial button {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: transparent;
  color: var(--muted);
  cursor: pointer;
}
.gloss-dial button.on {
  background: rgba(52, 211, 153, 0.15);
  color: var(--accent-2);
  border-color: var(--accent-2);
}
.shape-row {
  border-top: 1px solid var(--line);
  padding: 12px 0;
}
.shape-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 8px;
}
.shape-name {
  font-size: 13px;
  font-weight: 600;
}
.shape-desc {
  font-size: 12px;
  color: var(--muted);
}
.shapechip {
  max-width: 340px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: inline-block;
  font-size: 12px;
}
.shapechip.approx {
  border: 1px dashed currentColor;
  opacity: 0.92;
}
.shapechip.missing {
  opacity: 0.35;
  text-decoration: line-through;
  cursor: not-allowed;
}
.shapechip .x2 {
  font-size: 10px;
  font-weight: 700;
  margin-left: 4px;
  opacity: 0.75;
  vertical-align: top;
}
.r-whole {
  background: rgba(52, 211, 153, 0.14);
  color: var(--accent-2);
}
.seam-editor {
  border-top: 1px solid var(--line);
  margin-top: 4px;
  padding-top: 12px;
}
.save-seams {
  font-size: 12px;
  padding: 5px 12px;
  border-radius: 8px;
  border: 1px solid var(--accent-2);
  color: var(--accent-2);
  background: transparent;
  font-weight: 600;
  cursor: pointer;
}
.save-seams:disabled {
  opacity: 0.4;
  cursor: default;
}
.seam-line {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  row-gap: 8px;
  background: var(--surface-2);
  border-radius: 8px;
  padding: 10px 12px;
  margin-bottom: 12px;
  font-size: 16px;
  line-height: 1.7;
}
.seam-line .tok {
  padding: 0 1px;
}
.seam {
  min-width: 16px;
  padding: 0 2px;
  border: none;
  background: transparent;
  color: var(--faint);
  font-size: 15px;
  cursor: pointer;
  line-height: 1;
}
.seam:hover {
  color: var(--accent-2);
}
.seam.on {
  color: var(--accent-2);
  font-weight: 700;
}
.seam.moved {
  color: #f472b6;
  font-weight: 700;
}
.seam.removed {
  color: var(--faint);
  text-decoration: line-through;
}
.seam.open {
  color: var(--faint);
}
.seam.locked {
  color: var(--muted);
  cursor: default;
}
.unit-glosses {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}
.unit-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.unit-surface {
  /* text-align pinned — see .row-text. */
  text-align: left;
  min-width: 40%;
  max-width: 55%;
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.gloss-input {
  flex: 1;
  font-size: 12px;
  padding: 4px 8px;
  border: 1px solid var(--line);
  border-radius: 6px;
  background: var(--canvas);
  color: var(--ink);
}
.gloss-input::placeholder {
  color: var(--faint);
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

/* ── casting & approval ──────────────────────────────────────────────────── */
.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.err-box {
  color: var(--danger);
}
.cast-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin: 10px 0 8px;
}
.cast-flags {
  list-style: none;
  margin: 0 0 12px;
  padding: 0;
  display: grid;
  gap: 4px;
}
.cast-flags li {
  font-size: 13px;
  line-height: 1.45;
  padding: 6px 9px;
  border-radius: 6px;
  border-left: 3px solid var(--border);
  background: var(--surface-2);
  color: var(--muted);
}
.cast-flags li.bad {
  border-left-color: #ef4444;
  color: #fca5a5;
}
.cast-flags li.warn {
  border-left-color: #f59e0b;
  color: #fcd34d;
}
.cast-flags li.ok {
  border-left-color: #22c55e;
}
[data-theme='light'] .cast-flags li.bad {
  color: #b91c1c;
}
[data-theme='light'] .cast-flags li.warn {
  color: #92400e;
}
/* The comparison: one column per candidate cast. Two fit side by side on a
   laptop; anything narrower stacks rather than shrinking to illegibility. */
.candidates {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
  gap: 12px;
  margin: 12px 0;
  align-items: start;
}
.candidate {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 12px;
  background: var(--surface-2);
  min-width: 0;
}
.candidate.cast {
  border-color: #22c55e66;
}
.candidate.heard {
  opacity: 0.9;
}
.cand-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.cand-title {
  font-size: 14px;
}
.cand-drop {
  margin-left: auto;
  background: none;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--muted);
  cursor: pointer;
  padding: 0 7px;
}
.cand-voices {
  display: grid;
  gap: 4px;
  margin-bottom: 8px;
}
.cand-voice {
  display: grid;
  grid-template-columns: 58px 1fr auto 28px;
  gap: 8px;
  align-items: baseline;
  font-size: 12px;
  padding: 3px 0;
  border-bottom: 1px solid var(--border);
}
.cand-voice .cv-slot {
  color: var(--muted);
}
.cand-voice .cv-meta {
  font-size: 11px;
  color: var(--muted);
  overflow-wrap: anywhere;
}
.cv-play {
  background: none;
  border: 1px solid var(--border);
  border-radius: 5px;
  cursor: pointer;
  color: inherit;
}
.cand-flags {
  list-style: none;
  margin: 0 0 8px;
  padding: 0;
  display: grid;
  gap: 4px;
}
.cand-flags li {
  font-size: 12px;
  line-height: 1.45;
  padding: 5px 8px;
  border-radius: 6px;
  border-left: 3px solid var(--border);
  background: var(--surface);
  color: var(--muted);
}
.cand-flags li.bad {
  border-left-color: #ef4444;
  color: #fca5a5;
}
[data-theme='light'] .cand-flags li.bad {
  color: #b91c1c;
}
.cand-empty {
  font-size: 12px;
}
.cast-detail summary {
  cursor: pointer;
  font-size: 12px;
  color: var(--muted);
  margin: 6px 0;
}
.cast-tables {
  display: grid;
  gap: 12px;
  margin-bottom: 10px;
}
.cast-row {
  display: grid;
  grid-template-columns: 110px 22px 1fr 150px 1fr;
  gap: 8px;
  align-items: baseline;
  font-size: 12px;
  padding: 4px 6px;
  border-bottom: 1px solid var(--border);
  color: var(--muted);
}
.cast-row.none {
  color: var(--danger);
}
.cv-name {
  font-weight: 600;
  color: var(--text);
}
.cv-cover {
  white-space: nowrap;
}
.cv-labels,
.cv-meta {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.samples {
  display: grid;
  gap: 2px;
  margin: 8px 0 14px;
}
.sample-row {
  display: grid;
  grid-template-columns: 30px 14px 20px 110px 96px 1fr;
  gap: 8px;
  align-items: baseline;
  padding: 6px;
  border-radius: 6px;
  font-size: 13px;
}
.sample-row.on {
  background: var(--surface-2);
}
/* The exchange reads as one block: these clips are a conversation, the rest
   are one-off coverage of a voice. */
.sample-row.exch {
  border-left: 2px solid var(--accent, #ffd24a);
}
.s-exch {
  color: var(--muted);
  font-size: 12px;
  text-align: center;
}
.bad-note {
  border-left: 2px solid var(--danger, #e5484d);
  padding-left: 8px;
}
.offcast {
  margin: 4px 0 14px;
  font-size: 12.5px;
}
.offcast summary {
  cursor: pointer;
  color: var(--muted);
}
.pod-source {
  margin: 4px 0 10px;
  font-size: 12.5px;
  color: var(--text);
}
.pod-source code {
  font-size: 12px;
}
.gen-sample {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 7px;
  color: var(--text);
  cursor: pointer;
  padding: 6px 12px;
  font-size: 13px;
}
.gen-sample:disabled {
  opacity: 0.5;
  cursor: default;
}
.s-play {
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 5px;
  cursor: pointer;
  color: var(--text);
  padding: 2px 0;
}
.s-kind {
  font-size: 11px;
  font-weight: 700;
  text-align: center;
  border-radius: 4px;
}
.s-speaker,
.s-voice {
  color: var(--muted);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.s-text {
  display: grid;
  gap: 1px;
}
/* Both lines bind `dir` from their own text; alignment stays as it is today. */
.s-main,
.s-other {
  text-align: left;
}
.s-other {
  color: var(--muted);
  font-size: 12px;
}
.cast-decide {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  border-top: 1px solid var(--border);
  padding-top: 12px;
}
.cast-note {
  flex: 1 1 220px;
  min-width: 160px;
  background: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  padding: 7px 9px;
  font-size: 13px;
}
.cast-decide .approve,
.cast-decide .reject {
  border-radius: 6px;
  border: 1px solid var(--border);
  padding: 8px 14px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
}
.cast-decide .approve {
  background: #16a34a;
  border-color: #16a34a;
  color: #fff;
}
.cast-decide .reject {
  background: var(--surface-2);
  color: var(--danger);
}
.cast-decide button:disabled {
  opacity: 0.5;
  cursor: default;
}

/* Manual voice choice — two slots, deliberately plain. */
.vpick {
  display: grid;
  gap: 8px;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 10px 12px;
  background: var(--surface-2);
}
.vpick-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.vp-slot {
  width: 62px;
  flex: none;
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
}
.vp-select {
  flex: 1 1 auto;
  min-width: 0;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  padding: 7px 9px;
  font-size: 13px;
}
.vp-play {
  flex: none;
  width: 34px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  padding: 7px 0;
  cursor: pointer;
}
.vpick-foot {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.vp-apply {
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.vpick button:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
