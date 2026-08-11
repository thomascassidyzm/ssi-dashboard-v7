<script setup>
/**
 * Pod Lab — /admin/configs/pods
 *
 * A tuning + audition surface for the Layer-2 pod acquisition ladder, sibling to
 * the Pause Lab (/admin/configs/speaking). Two modes on the same real line:
 * THE LADDER — the unified climb (Tom 2026-07-03): fusion rungs from finest
 * units to the whole turn, then the speed cascade to pure 2× — and STAGE ARC,
 * today's live engine output, for comparison.
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
import { composeSentenceArc, loadStage0ClipMaps, DEFAULT_STAGE0, resolveAtoms } from '../../lib/podEngine'
// Sample generation goes to Popty's backend (phase-8 proxy), not the Vercel
// /api routes the rest of this page uses — same helper pair as PodDetailView.
import { getApiUrl } from '@/services/api.js'
import { useAuth } from '@/composables/useAuth.js'

const { getAccessToken } = useAuth()

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

    // Casting FIRST, because it is what tells us which pod holds the course's
    // current pod-0 content. Hard-coding `<course>:pod-0` is what put a
    // 142-line snapshot under Tom's ear while the live pod held 232, and it
    // shows nothing at all for Welsh, whose pod-0 was emptied when the pod was
    // gated (services/pod-voice-approvals.cjs#resolveCurrentPod0).
    //
    // It is awaited, not fired-and-forgotten: the sentence query depends on it.
    await loadCasting(courseCode)
    const podId = casting.value?.current_pod_id || `${courseCode}:pod-0`
    currentPodId.value = podId

    const { data: rows, error: podErr } = await sb
      .from('listening_pod_sentences')
      .select(
        'id, global_order, speaker, target_text, known_text, target_audio_id, known_audio_id, explainer_audio_id, glue_to_next, atom_map, atom_map_fine, window_known_map, takeg_audio_ids, sentence_audio_ids, sentence_known_audio_ids',
      )
      .eq('pod_id', podId)
      .order('global_order', { ascending: true })
    if (podErr) throw podErr
    sentences.value = rows || []

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

async function decideCasting(decision) {
  if (!casting.value) return
  castingSaving.value = decision
  castingMsg.value = ''
  try {
    const sb = await import('../../services/supabase').then((m) => m.supabase)
    const { data: { session } } = await sb.auth.getSession()
    if (!session) throw new Error('no session — sign in')
    const res = await fetch('/api/pod-voice-approval', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({
        course_code: casting.value.course_code,
        decision,
        // The digest of the cast actually rendered on this page — the route
        // refuses (409) if a recast landed since it loaded.
        cast_fingerprint: casting.value.cast_fingerprint,
        note: castNote.value,
      }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`)
    casting.value = { ...casting.value, record: body.record, gate: body.gate }
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
    // legacy top-level shape — target only, provider defaults to xai
    return { name: entry.name || null, voice_id: entry.voice_id, provider: entry.provider || 'xai', locale: entry.locale || null, gender: entry.gender || 'n' }
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
  const family = (casting.value?.pods || []).filter((q) => (q.slug || q.id.split(':')[1] || '').startsWith('pod-0'))
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
const clipVoiceKey = (item) => `${item.kind}|${voiceKey(item.voice)}`

function sampleQueue() {
  const speakers = castSpeakers.value
  const queue = []
  for (const s of sentences.value) {
    if (s.target_audio_id) {
      queue.push({ kind: 'target', id: s.target_audio_id, speaker: s.speaker, text: s.target_text,
        other: s.known_text, order: s.global_order, voice: resolveSpeakerVoice(speakers, s.speaker, 'target') })
    }
    if (s.known_audio_id) {
      queue.push({ kind: 'known', id: s.known_audio_id, speaker: s.speaker, text: s.known_text,
        other: s.target_text, order: s.global_order, voice: resolveSpeakerVoice(speakers, s.speaker, 'known') })
    }
  }
  return queue
}

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

const sampleExchange = computed(() => {
  const queue = sampleQueue()
  const distinct = new Set(queue.map(clipVoiceKey)).size
  return pickExchange(queue, Math.min(EXCHANGE_MAX, SAMPLE_LIMIT - Math.max(0, distinct - 2)))
})

const sampleClips = computed(() => {
  const queue = sampleQueue()
  const exchange = sampleExchange.value
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
  return [...picked, ...rest].slice(0, SAMPLE_LIMIT).map((item) => ({
    ...item,
    inExchange: taken.has(item),
  }))
})

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

async function generateSample() {
  const podId = currentPod.value?.id
  const course = selectedCourseCode.value
  if (!podId || !course || genBusy.value) return
  const unvoiced = targetCast.value.filter((r) => !r.voice).length
  const human = targetCast.value.some((r) => r.voice && r.voice.provider === 'human')
  if (human) {
    genMsg.value = 'This pod is cast on HUMAN voices — TTS cannot render it. It needs its recordings.'
    return
  }
  if (!window.confirm(
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
        <strong>The ladder</strong> auditions the unified climb (2026-07-03): one t·k·t·t pattern
        from finest units, fusing rung by rung into the whole turn, then the speed cascade to
        pure&nbsp;2× — where immersion emerges. <strong>Stage arc</strong> plays the same line
        through today's <strong>real</strong> <code>@ssi/core/pods</code> engine for comparison.
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
              <span class="row-text">
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
          <div v-if="editorTokens.length" class="seam-line">
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
              <span class="unit-surface">{{ u.surface }}</span>
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

            <p v-if="otherPodIds.length" class="note">
              This course has other pods in the same approval —
              <code v-for="id in otherPodIds" :key="id">{{ id }}</code> — their lines aren't listed
              on this page, but their casting is inside the fingerprint you're approving.
            </p>

            <div class="transport">
              <button class="play-all" :disabled="!sampleClips.length" @click="playSampleAll">
                ▶ Play the sample ({{ sampleClips.length }} clips)
              </button>
              <button class="gen-sample" :disabled="genBusy || !currentPod" @click="generateSample">
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
            <p v-else-if="sampleGap.withTarget < sampleGap.total || sampleGap.withKnown < sampleGap.total" class="note">
              Audio present on {{ sampleGap.withTarget }}/{{ sampleGap.total }} target and
              {{ sampleGap.withKnown }}/{{ sampleGap.total }} known lines — the sample can only draw
              on what exists.
            </p>

            <div class="samples">
              <div v-for="c in sampleClips" :key="c.kind + ':' + c.id" class="sample-row" :class="{ on: playingSample === c.kind + ':' + c.id, exch: c.inExchange }">
                <button class="s-play" @click="playSample(c)">▶</button>
                <span class="s-exch" :title="c.inExchange ? 'part of the exchange — consecutive lines, two voices' : 'voice coverage'">{{ c.inExchange ? '⇄' : '·' }}</span>
                <span class="s-kind" :class="c.kind === 'target' ? 'r-target' : 'r-known'">{{ c.kind === 'target' ? 'T' : 'K' }}</span>
                <span class="s-speaker">{{ c.speaker }}</span>
                <span class="s-voice mono">{{ c.voice ? (c.voice.name || c.voice.voice_id) : 'no voice' }}</span>
                <span class="s-text">
                  <span class="s-main">{{ c.text }}</span>
                  <span class="s-other">{{ c.other }}</span>
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
                {{ st.text }}<span v-if="st.rate === 2" class="x2">2×</span>
              </button>
            </div>
          </div>
        </template>
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
  color: #f87171;
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
  color: #f87171;
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
  color: #f87171;
}
.cast-decide button:disabled {
  opacity: 0.5;
  cursor: default;
}
</style>
