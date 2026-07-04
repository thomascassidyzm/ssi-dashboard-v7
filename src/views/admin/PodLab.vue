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
        'id, global_order, speaker, target_text, known_text, target_audio_id, known_audio_id, explainer_audio_id, glue_to_next, atom_map, atom_map_fine, window_known_map, takeg_audio_ids, sentence_audio_ids, sentence_known_audio_ids',
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

    // Fine-known clips: plain English per unit gloss / window translation,
    // text-keyed (same normalisation as course_audio.text_normalized).
    const { data: fineRows } = await sb
      .from('course_audio')
      .select('id, text_normalized')
      .eq('course_code', courseCode)
      .eq('role', 'pod_fine_known')
    fineKnownMap.value = new Map((fineRows || []).map((r) => [r.text_normalized, r.id]))

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

// Every fusion level for an n-unit stretch: units → … → the whole.
function spanLadder(n, fusion) {
  let spans = Array.from({ length: n }, (_, i) => ({ start: i, end: i }))
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
// (walked off target_text between consecutive atom surfaces) — sound-wave
// grouping, no grammar.
const SENTENCE_PUNCT = /[.!?…。！？]/

function atomGroups(s, atoms) {
  const text = s.target_text || ''
  const lower = text.toLowerCase()
  const groups = [[]]
  let cursor = 0
  for (let i = 0; i < atoms.length; i++) {
    const idx = lower.indexOf(atoms[i].targetSurface.toLowerCase(), cursor)
    if (i > 0 && idx !== -1 && SENTENCE_PUNCT.test(text.slice(cursor, idx))) groups.push([])
    groups[groups.length - 1].push(atoms[i])
    if (idx !== -1) cursor = idx + atoms[i].targetSurface.length
  }
  return groups.filter((g) => g.length)
}

// Per-sentence takes when the re-split produced them (else null per group).
function groupTakes(s, groups) {
  return Array.isArray(s.sentence_audio_ids) && s.sentence_audio_ids.length === groups.length
    ? s.sentence_audio_ids
    : groups.map(() => null)
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
  const rawGroups = atomGroups(s, atoms)
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

  // sub-sentence chunk: a contiguous ms SLICE of the group's Take G render
  // (gaps preserved); butted unit clips only where Take G is missing
  const chunkStep = (g, span, gi) => {
    const us = g.slice(span.start, span.end + 1)
    const takeg = takegIds[gi]
    const sliced = takeg && us.every((a) => a.target_start_ms != null && a.target_end_ms != null)
    return {
      kind: 'chunk',
      text: us.map((a) => a.targetSurface).join(' '),
      clips: sliced
        ? [{ id: takeg, startMs: us[0].target_start_ms, endMs: us[us.length - 1].target_end_ms }]
        : us.map((a) => a.targetClipId),
      approx: !sliced && us.length > 1,
      rate: 1,
    }
  }
  // chunk's known: the REAL fine-known clip for the unit gloss / authored
  // window translation; legacy "means X" butt only where it's missing
  const knownStep = (g, span, gi) => {
    const us = g.slice(span.start, span.end + 1)
    const text =
      us.length === 1
        ? us[0].gloss || ''
        : winKnown.get(`${offsets[gi] + span.start}-${offsets[gi] + span.end}`) ||
          us.map((a) => a.gloss).filter(Boolean).join(' ')
    const real = fineKnownMap.value.get(normForAudio(text))
    return {
      kind: 'gloss',
      text,
      clips: real ? [real] : us.map((a) => a.meansGlossClipId),
      approx: !real,
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
    const clips = take ? clipList(take) : takegIds[gi] ? [takegIds[gi]] : g.map((a) => a.targetClipId)
    return {
      kind: 'group',
      text: g.map((a) => a.targetSurface).join(' '),
      clips,
      approx: !take && !takegIds[gi],
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
    return {
      kind: 'group',
      text: gs.map((g) => g.map((a) => a.targetSurface).join(' ')).join(' '),
      clips: perGroup.flat(),
      approx: true, // butted takes until a conjoined render exists — by design
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
    return {
      kind: 'gloss',
      text: gs.map((g, i) => knownTexts[span.start + i] || g.map((a) => a.gloss).filter(Boolean).join(' ')).join(' '),
      clips: perGroup.flat(),
      approx: true,
      rate: 1,
    }
  }
  const wholeTurnChunk = (rate = 1) => ({
    kind: 'whole',
    text: s.target_text,
    clips: [s.target_audio_id],
    approx: false,
    rate,
  })
  const wholeTurnKnown = () => ({
    kind: 'gloss',
    text: s.known_text || '',
    clips: [s.known_audio_id],
    approx: !s.known_audio_id,
    rate: 1,
  })

  const fusion = fusionMode.value
  const ladders = groups.map((g) => spanLadder(g.length, fusion))
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
            ? 'Stage 0 · finest units'
            : last
              ? `Stage ${r} · whole sentences`
              : `Stage ${r} · fusion`,
      note:
        last && single
          ? 't·k·t·t at 1× — ≡ engine Stage 1'
          : r === 0
            ? 'every unit t·k·t·t · 1×'
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
    for (const lvl of spanLadder(groups.length, fusion).slice(1)) {
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

// ── SEAM EDITOR — drag the cuts of a draft fine map ─────────────────────────
// Every token boundary is a clickable handle: click to cut, click to merge.
// Punctuation seams are locked (mandatory — Take G always breathes there).
// Saves ONLY atom_map_fine via /api/pod-fine-map (auth'd, tiling-verified).
const editorTokens = ref([])
const editorSeams = ref(new Set())
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
// latin word-run is one token. punctAfter marks a locked seam after the token.
function tokenizeTarget(text) {
  const out = []
  let i = 0
  const isWord = (c) => /[\p{L}\p{N}\p{M}'’-]/u.test(c)
  while (i < text.length) {
    const c = text[i]
    if (CJK_RE.test(c)) {
      out.push({ text: c, punctAfter: false })
      i++
    } else if (isWord(c)) {
      let j = i + 1
      while (j < text.length && isWord(text[j]) && !CJK_RE.test(text[j])) j++
      out.push({ text: text.slice(i, j), punctAfter: false })
      i = j
    } else {
      if (out.length && HARD_PUNCT.test(c)) out[out.length - 1].punctAfter = true
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

function initSeamEditor() {
  seamMsg.value = ''
  seamDirty.value = false
  editorTokens.value = []
  editorSeams.value = new Set()
  editorUnits.value = []
  const s = selectedSentence.value
  if (!s || !usingFine.value) return
  const tokens = tokenizeTarget(s.target_text || '')
  const units = []
  const seams = new Set()
  let ti = 0
  for (const u of s.atom_map_fine) {
    const target = alnumLocal(u.target_surface)
    if (!target) continue
    const start = ti
    let acc = ''
    while (ti < tokens.length && acc.length < target.length) {
      acc += alnumLocal(tokens[ti].text)
      ti++
    }
    if (acc !== target) {
      seamMsg.value = 'seam editor unavailable — stored units do not walk this text'
      return
    }
    units.push({ start, end: ti - 1, surface: u.target_surface, gloss: u.gloss || '', kind: u.kind || 'atom' })
    if (ti < tokens.length) seams.add(ti - 1)
  }
  if (ti !== tokens.length) {
    seamMsg.value = 'seam editor unavailable — stored units do not cover this text'
    return
  }
  editorTokens.value = tokens
  editorSeams.value = seams
  editorUnits.value = units
}

function deriveUnits(prevUnits) {
  const tokens = editorTokens.value
  const ranges = []
  let start = 0
  for (let i = 0; i < tokens.length; i++) {
    if (i === tokens.length - 1 || tokens[i].punctAfter || editorSeams.value.has(i)) {
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

function toggleSeam(i) {
  if (editorTokens.value[i]?.punctAfter) return
  const seams = new Set(editorSeams.value)
  if (seams.has(i)) seams.delete(i)
  else seams.add(i)
  const prev = editorUnits.value
  editorSeams.value = seams
  editorUnits.value = deriveUnits(prev)
  seamDirty.value = true
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
    seamMsg.value = `Saved ✓ ${map.length} units`
  } catch (e) {
    seamMsg.value = `Save failed: ${e.message}`
  } finally {
    seamSaving.value = false
  }
}

watch([selectedIdx, unitsSource, sentences], initSeamEditor)

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
            <span v-if="Array.isArray(selectedSentence.atom_map_fine)" class="muted">
              · {{ selectedSentence.atom_map_fine.length }} draft fine units</span
            >
            <span v-if="!selectedSentence.explainer_audio_id" class="muted"> · no explainer clip</span>
            <span v-if="selectedSentence.glue_to_next" class="muted"> · glues on</span>
          </div>
        </div>

        <!-- SEAM EDITOR — reshape the draft cuts by hand -->
        <div v-if="mode === 'shapes' && usingFine" class="seam-editor">
          <div class="cfg-head">
            <span class="lbl">Seam editor</span>
            <button class="save-seams" :disabled="!seamDirty || seamSaving" @click="saveFineMap">
              {{ seamSaving ? 'Saving…' : 'Save cuts' }}
            </button>
          </div>
          <p class="note">
            Click a gap to cut or merge — <strong>·</strong> open, <strong>|</strong> seam,
            <strong>‖</strong> punctuation (always a seam). Merges join their glosses; a split
            starts blank — type the gloss. Saves the DRAFT map only.
          </p>
          <div v-if="editorTokens.length" class="seam-line">
            <template v-for="(t, i) in editorTokens" :key="i">
              <span class="tok">{{ t.text }}</span>
              <button
                v-if="i < editorTokens.length - 1"
                class="seam"
                :class="{ on: editorSeams.has(i) && !t.punctAfter, locked: t.punctAfter }"
                :title="t.punctAfter ? 'punctuation — always a seam' : editorSeams.has(i) ? 'merge (remove seam)' : 'cut here'"
                @click="toggleSeam(i)"
              >
                {{ t.punctAfter ? '‖' : editorSeams.has(i) ? '|' : '·' }}
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
          <span v-if="seamMsg" class="chip" :class="{ err: seamMsg.startsWith('Save failed') || seamMsg.startsWith('seam editor unavailable') }">{{ seamMsg }}</span>
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

        <!-- THE UNIFIED LADDER — fusion rungs then the speed ramp, one row per stage -->
        <template v-else>
          <p class="shape-note">
            One rung = one stage = one visit. Fusion climbs to the whole turn (≡ engine Stage 1),
            then the locked speed cascade tops out at pure&nbsp;t@2× — immersion.
            <template v-if="usingFine">
              DRAFT fine units — judge the CUTS. Sub-sentence chunk audio arrives with Take&nbsp;G,
              cut at exactly these seams; wholes already play the real takes.
            </template>
            <template v-else>
              This course has no fine-unit draft yet — showing the LIVE atom_map (coarser,
              intention-level cuts). Run <code>tools/breakdown-fine.cjs</code> to author fine units.
            </template>
          </p>

          <div class="gloss-dial">
            <template v-if="hasFine">
              <span class="lbl small">Units:</span>
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
                    approx: st.approx,
                    missing: !usingFine && !st.clips.some(Boolean),
                  },
                ]"
                :title="
                  st.kind +
                  (st.rate === 2 ? ' · 2×' : '') +
                  (st.approx ? ' (approximated: concatenated clips)' : '') +
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
</style>
