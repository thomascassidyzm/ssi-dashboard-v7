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
        'id, global_order, speaker, target_text, known_text, target_audio_id, known_audio_id, explainer_audio_id, glue_to_next, atom_map, atom_map_fine, sentence_audio_ids',
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
  playingStepKey.value = ''
}

// ── VISIT SHAPES — Stage-0 exploration (2026-07-02) ─────────────────────────
// Candidate compositions for what ONE Stage-0 visit sounds like, side by side
// on the same line, so the design is chosen by ear rather than argument. This
// is deliberately audition-only UI — no candidate is wired into the learner
// engine; the composer in @ssi/core/pods is rebuilt only once a shape wins.
//
// AUDIO HONESTY: the model's fused chunks want Take G — a slower whole take
// with TTS-punctuation gaps at unit boundaries, sliced per rung. Take G isn't
// rendered yet, so fused chunks here butt the constituent atom clips together:
// real structure and rhythm, not final prosody. Whole plays are the real take.

const mode = ref('shapes') // 'shapes' | 'arc'
// 'means' retired from the ladder (Tom 2026-07-02): Aran's ladder always plays
// plain unit translations at V1 and nothing after; this dial now only affects
// the other (parked) shapes, and defaults off.
const glossMode = ref('none') // 'all' | 'long' | 'none'
const unitsSource = ref('live') // 'live' (atom_map) | 'fine' (draft atom_map_fine)
const playingStepKey = ref('')

const SHAPE_DEFS = [
  {
    key: 'rungs',
    name: "Aran's ladder",
    desc: 'Per SENTENCE: units + meaning → chained overlapping windows → whole; short sentences repeat their whole while long ones climb. The turn closes once as the immersion flow.',
  },
  { key: 'parts', name: 'Pure parts', desc: 'Finest chunks only — no whole, no framing.' },
  { key: 'parts-whole', name: 'Parts → whole', desc: 'Build up, then the natural take lands.' },
  { key: 'wpw', name: 'Whole–parts–whole', desc: 'The mystery, the breakdown, the resolution.' },
  { key: 'climb', name: 'Compressed climb', desc: 'The full fusion ladder in one sitting: atoms → pairs → … → whole.' },
  { key: 'tree', name: 'Tree walk', desc: 'Each prosodic group opened up in turn, then the whole.' },
]

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
  return resolveAtoms(map, glossMap.value, targetClipMap.value)
})

// One playable step: a chunk / gloss / whole chip. `clips` may hold several
// ids (a fused chunk approximated by consecutive atom clips → approx: true).
function stepChunk(atoms) {
  return {
    kind: 'chunk',
    text: atoms.map((a) => a.targetSurface).join(' '),
    clips: atoms.map((a) => a.targetClipId),
    approx: atoms.length > 1,
  }
}
function stepGloss(atoms) {
  return {
    kind: 'gloss',
    text: atoms.map((a) => a.gloss).join(' · '),
    clips: atoms.map((a) => a.meansGlossClipId),
    approx: atoms.length > 1,
  }
}
function stepWhole(s) {
  return { kind: 'whole', text: s.target_text, clips: [s.target_audio_id], approx: false }
}
function stepGroupTake(atoms, takeId) {
  const takeClips = takeId ? (Array.isArray(takeId) ? takeId : [takeId]) : null
  return {
    kind: 'group',
    text: atoms.map((a) => a.targetSurface).join(' '),
    clips: takeClips || atoms.map((a) => a.targetClipId),
    approx: !takeClips,
  }
}

function stepMarker(text) {
  return { kind: 'marker', text, clips: [], approx: false }
}

function wantGloss(atoms) {
  if (glossMode.value === 'none') return false
  if (glossMode.value === 'long') {
    const t = atoms.map((a) => a.targetSurface).join(' ')
    // "long" = multi-word — or, for space-free scripts (CJK), 5+ CJK characters
    return (
      t.includes(' ') ||
      t.replace(/[^぀-ヿ㐀-䶿一-鿿가-힯]/g, '').length >= 5
    )
  }
  return true
}

// Pairwise left-to-right fusion; an odd tail survives unfused (Aran's 3→2).
function fusePairs(chunks) {
  const out = []
  for (let i = 0; i < chunks.length; i += 2) {
    out.push(i + 1 < chunks.length ? chunks[i].concat(chunks[i + 1]) : chunks[i])
  }
  return out
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

function composeShape(key, s, atoms) {
  const steps = []
  const fine = atoms.map((a) => [a])
  const pushChunks = (chunks, { gloss = true } = {}) => {
    for (const c of chunks) {
      steps.push(stepChunk(c))
      if (gloss && wantGloss(c)) steps.push(stepGloss(c))
    }
  }
  if (key === 'parts') {
    pushChunks(fine)
  } else if (key === 'parts-whole') {
    pushChunks(fine)
    steps.push(stepWhole(s))
  } else if (key === 'wpw') {
    steps.push(stepWhole(s))
    pushChunks(fine)
    steps.push(stepWhole(s))
  } else if (key === 'rungs') {
    // ARAN'S DRILL LADDER (Tom 2026-07-02): the DRILL unit is the SENTENCE —
    // a leading one-unit exclamation ("Ciao!") glues onto the sentence that
    // follows. Each sentence climbs:
    //   V1  its units in order, each followed by its plain translation
    //       (the 'means' formula is retired — meaning is just the gloss)
    //   V2  chained OVERLAPPING windows (~half the sentence each, sharing an
    //       edge unit) — no translation; skipped when the sentence is short
    //   V3  the whole sentence (real per-sentence take)
    // Short sentences REPEAT their whole while longer ones are still climbing
    // (all sentences of a turn ride the same visit). Multi-sentence turns
    // close ONCE with the whole-turn take — the immersion flow, not a drill.
    const rawGroups = atomGroups(s, atoms)
    const rawTakes = groupTakes(s, rawGroups)
    const groups = []
    const takes = []
    let carry = []
    rawGroups.forEach((g, i) => {
      if (g.length === 1 && i < rawGroups.length - 1) {
        carry.push(...g)
        return
      }
      groups.push([...carry, ...g])
      takes.push(carry.length ? null : rawTakes[i])
      carry = []
    })
    if (carry.length) {
      if (groups.length) {
        groups[groups.length - 1].push(...carry)
        takes[takes.length - 1] = null
      } else {
        groups.push(carry)
        takes.push(null)
      }
    }

    const ladders = groups.map((g, gi) => {
      const visits = []
      const v1 = []
      g.forEach((u) => {
        v1.push(stepChunk([u]))
        if (u.gloss) v1.push(stepGloss([u]))
      })
      visits.push(v1)
      if (g.length > 3) {
        const width = Math.ceil(g.length / 2)
        const lvl = []
        for (let start = 0; ; start += width - 1) {
          const end = Math.min(start + width - 1, g.length - 1)
          lvl.push(stepChunk(g.slice(start, end + 1)))
          if (end >= g.length - 1) break
        }
        visits.push(lvl)
      }
      visits.push([stepGroupTake(g, takes[gi])])
      return visits
    })
    const maxVisits = Math.max(...ladders.map((l) => l.length))
    for (let v = 0; v < maxVisits; v++) {
      steps.push(stepMarker(`Visit ${v + 1}`))
      ladders.forEach((l) => {
        // a sentence that has topped out repeats its whole on later visits
        steps.push(...l[Math.min(v, l.length - 1)].map((st) => ({ ...st })))
      })
    }
    if (groups.length > 1) {
      steps.push(stepMarker('Immersion flow'))
      steps.push(stepWhole(s))
    }
  } else if (key === 'climb') {
    // Pairwise fusion within sentence walls, compressed into one sitting.
    const groups = atomGroups(s, atoms)
    const takes = groupTakes(s, groups)
    let levels = groups.map((g) => g.map((a) => [a]))
    levels.forEach((lvl) => pushChunks(lvl))
    while (levels.some((l) => l.length > 1)) {
      levels = levels.map((l) => (l.length > 1 ? fusePairs(l) : l))
      levels.forEach((lvl, gi) => {
        if (lvl.length === 1) steps.push(stepGroupTake(groups[gi], takes[gi]))
        else pushChunks(lvl, { gloss: false })
      })
    }
    if (groups.length > 1 || atoms.length === 1) steps.push(stepWhole(s))
  } else if (key === 'tree') {
    const groups = atomGroups(s, atoms)
    if (groups.length <= 1) {
      steps.push(stepWhole(s))
      pushChunks(fine)
      steps.push(stepWhole(s))
    } else {
      const takes = groupTakes(s, groups)
      groups.forEach((g, i) => {
        steps.push(stepGroupTake(g, takes[i]))
        pushChunks(g.map((a) => [a]))
        steps.push(stepGroupTake(g, takes[i]))
      })
      steps.push(stepWhole(s))
    }
  }
  steps.forEach((st, i) => {
    st.key = `${key}:${i}`
  })
  return steps
}

const shapeRows = computed(() => {
  const s = selectedSentence.value
  if (!s || !shapeAtoms.value.length) return []
  return SHAPE_DEFS.map((d) => ({ ...d, steps: composeShape(d.key, s, shapeAtoms.value) }))
})

const STEP_CLS = { chunk: 'r-target', gloss: 'r-known', whole: 'r-whole', group: 'r-explainer', marker: 'r-marker' }

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
    if (st.kind === 'marker') continue
    playingStepKey.value = st.key
    const clips = st.clips.filter(Boolean)
    for (let i = 0; i < clips.length; i++) {
      await playClip(clips[i], 1)
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
          <button :class="{ on: mode === 'shapes' }" @click="mode = 'shapes'">Visit shapes</button>
          <button :class="{ on: mode === 'arc' }" @click="mode = 'arc'">Stage arc</button>
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

        <!-- VISIT SHAPES — candidate Stage-0 visit compositions, same line, by ear -->
        <template v-else>
          <p class="shape-note">
            <template v-if="usingFine">
              DRAFT fine units (Aran granularity) — judge the CUTS. Text preview only: chunk audio
              arrives with Take&nbsp;G, cut at exactly these seams. Wholes still play the real take.
            </template>
            <template v-else>
              Candidate shapes for ONE Stage-0 visit — same line, same clips, different composition.
              Fused chunks are approximated by butting atom clips together until the slow gapped take
              (Take&nbsp;G) exists: real structure and rhythm, not final prosody. Wholes are the real take.
            </template>
          </p>

          <div v-if="hasFine" class="gloss-dial">
            <span class="lbl small">Units:</span>
            <button :class="{ on: unitsSource === 'live' }" @click="unitsSource = 'live'">live atoms</button>
            <button :class="{ on: unitsSource === 'fine' }" @click="unitsSource = 'fine'">
              draft fine (Aran)
            </button>
          </div>

          <div class="gloss-dial">
            <span class="lbl small">Meaning ('means') plays:</span>
            <button :class="{ on: glossMode === 'all' }" @click="glossMode = 'all'">every chunk</button>
            <button :class="{ on: glossMode === 'long' }" @click="glossMode = 'long'">long chunks only</button>
            <button :class="{ on: glossMode === 'none' }" @click="glossMode = 'none'">never</button>
          </div>

          <div v-if="!shapeRows.length" class="empty">
            This line has no atom_map — pick a line with atoms to audition visit shapes.
          </div>

          <div v-for="row in shapeRows" :key="row.key" class="shape-row">
            <div class="shape-head">
              <button class="mini" @click="playShapeSteps(row.steps)">▶</button>
              <span class="shape-name">{{ row.name }}</span>
              <span class="shape-desc">{{ row.desc }}</span>
            </div>
            <div class="plays">
              <button
                v-for="st in row.steps"
                :key="st.key"
                class="playchip shapechip"
                :class="[
                  STEP_CLS[st.kind],
                  {
                    now: playingStepKey === st.key,
                    approx: st.approx,
                    missing: st.kind !== 'marker' && !usingFine && !st.clips.some(Boolean),
                  },
                ]"
                :title="st.kind + (st.approx ? ' (approximated: concatenated clips)' : '') + ' — ' + st.text"
                @click="playShapeSteps([st])"
              >
                {{ st.text }}
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
.r-whole {
  background: rgba(52, 211, 153, 0.14);
  color: var(--accent-2);
}
.r-marker {
  background: transparent;
  color: var(--faint);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 10px;
  cursor: default;
  padding-left: 0;
  flex-basis: 100%;
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
