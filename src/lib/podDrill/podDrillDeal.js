/**
 * podDrillDeal — deal one pod scene the way the learning app deals it (job #860).
 *
 * Every DECISION here is the app's own code, vendored verbatim into src/lib/podEngine by
 * tools/sync-pod-engine.sh: splitRowUnits, baseSlate, buildFusionGroups, timedLineCut,
 * verifiedCutGroups, composeDrillCard, dropChunksWithoutKnown, knownClipsForText,
 * resolveKnownWithFallback, buildMainStage, buildModalQueue. What this file adds is only the GLUE
 * the app keeps inside Vue components, and each piece names the file it mirrors — those mirrors
 * are the drift risk, so keep them thin and re-read the source when the app changes:
 *
 *   sceneSentences   ← player-vue useListeningPods.ts buildPodScenes (the per-unit loop)
 *   drillQueue       ← player-vue ListeningOverlay.vue buildPlayQueue (listenMode 'drill')
 *   makeKnownLookup  ← player-vue ListeningOverlay.vue lookupFineKnown / crossFetchKnowns
 *   podStageFor      ← player-vue usePodLapScheduler.ts podStageFor (verbatim body)
 *   regularLap       ← player-vue usePodLapScheduler.ts nextLap (one cohort, stage-playlist path)
 *   stampRef         ← player-vue providers/revisedAudioRefs.ts buildAudioRef
 *
 * Learner state the app reads (exposures, the taught-in-Drill set, the lap ratchet) is NOT here:
 * the viewer picks the visit/lap by hand, and the taught set is empty (a first-time learner).
 *
 * Every step carries `gap` when the app would play nothing in that slot, so the page can SHOUT it
 * rather than skip it as the app does.
 */
import {
  buildFusionGroups, timedLineCut, verifiedCutGroups, composeDrillCard, dropChunksWithoutKnown,
  knownClipsForText, resolveKnownWithFallback, normalizeForLookup, lookupKeyVariants, voiceFamily,
  POD_KNOWN_VOICE_FAMILY, groupDepth,
} from '../podEngine/fusionDrill'
import { buildMainStage } from '../podEngine/podStageComposition'
import { splitRowUnits } from '../podEngine/player/podSentenceSplit'
import { baseSlate } from '../podEngine/player/podSlate'
import { buildModalQueue } from '../podEngine/player/podModalQueue'

export const FUSION_MODE = 'pairwise' // ListeningOverlay FUSION_MODE

export const bareId = (ref) => String(ref || '').replace(/\.v\d+$/, '')
/** buildAudioRef: `<uuid>.v<N>`, revision 1 (or absent) stays bare. */
export const stampRef = (id, revision) => (revision && revision > 1 ? `${id}.v${revision}` : id)

/** stampRowAudioRefs: every clip column of a row carries the clip's current revision, exactly as
 *  the app stamps it — the cut file's `clip` is compared against that stamped id. */
function stampRow (row, clips) {
  const s = (v) => (typeof v === 'string' && v ? stampRef(bareId(v), clips[bareId(v)]?.revision) : v)
  const out = { ...row }
  for (const c of ['target_audio_id', 'known_audio_id']) out[c] = s(row[c])
  for (const c of ['sentence_audio_ids', 'sentence_known_audio_ids', 'takeg_audio_ids']) if (Array.isArray(row[c])) out[c] = row[c].map(s)
  return out
}

/**
 * The scene's sentences as the overlay builds them (buildPodScenes): one per unit of each walk
 * row, each with the drill groups the app would give it and where those came from.
 */
export function sceneSentences (payload) {
  const clips = payload.clips || {}
  const rows = baseSlate((payload.rows || []).map((r) => stampRow(r, clips)))
  const textById = new Map()
  const timingsById = new Map()
  for (const r of rows) {
    for (const id of [...(r.sentence_audio_ids || []), ...(r.sentence_known_audio_ids || [])]) {
      const c = id && clips[bareId(id)]
      if (c) textById.set(id, c.text || '')
    }
    for (const id of [r.target_audio_id, r.known_audio_id, ...(r.sentence_audio_ids || []), ...(r.sentence_known_audio_ids || []), ...(r.takeg_audio_ids || [])]) {
      const c = id && clips[bareId(id)]
      if (c?.timings && !(Array.isArray(c.timings) && !c.timings.length)) timingsById.set(id, c.timings)
    }
  }
  const out = []
  for (const row of rows) {
    const units = splitRowUnits(row, textById)
    const fusionGroups = Array.isArray(row.atom_map_fine) && row.atom_map_fine.length
      ? buildFusionGroups({
          turnTargetText: row.target_text || '',
          fineMap: row.atom_map_fine,
          windowKnownMap: row.window_known_map || null,
          takegAudioIds: row.takeg_audio_ids || null,
          turnTargetAudioId: row.target_audio_id || null,
          turnKnownAudioId: row.known_audio_id || null,
          rows: units.map((u) => ({ targetAudioId: u.targetAudioId, knownAudioId: u.knownAudioId, targetText: u.targetText, knownText: u.knownText })),
        })
      : null
    const groupsByAnchor = new Map()
    for (const g of fusionGroups || []) {
      const a = groupsByAnchor.get(g.rowFirst)
      if (a) a.push(g); else groupsByAnchor.set(g.rowFirst, [g])
    }
    let continuationEnd = -1
    for (const u of units) {
      let anchored = groupsByAnchor.get(u.index) || null
      const continuation = continuationEnd >= u.index
      for (const g of anchored || []) continuationEnd = Math.max(continuationEnd, g.rowLast)
      const sentenceId = u.isSplit ? `${row.id}:s${u.index}` : row.id
      const fileCut = payload.cuts?.[sentenceId] || null
      const timedCut = !fileCut && !u.isSplit
        ? timedLineCut(u, u.targetAudioId ? timingsById.get(u.targetAudioId) : null, u.knownAudioId ? timingsById.get(u.knownAudioId) : null)
        : null
      const cut = fileCut || timedCut
      const ownGroupOnly = () => !anchored || anchored.every((g) => g.rowFirst === u.index && g.rowLast === u.index)
      const cutGroups = cut && !continuation && ownGroupOnly() ? verifiedCutGroups(u, u.index, cut) : null
      let groupsFrom = anchored && anchored.length ? 'fine map' : null
      if (cutGroups) { anchored = cutGroups; groupsFrom = fileCut ? 'cut file' : 'clip timings' }
      // Why a cut that exists was not used — the most likely silent failure (a re-render changes
      // the versioned clip id and the cut no longer applies).
      let cutNote = null
      if (fileCut && !cutGroups) {
        cutNote = fileCut.clip !== u.targetAudioId
          ? `cut entry made from clip ${fileCut.clip}, but the line now plays ${u.targetAudioId || 'nothing'} — the app ignores the cut and plays the line whole`
          : 'cut entry present but the app does not use it here (glued/continuation or out-of-order spans)'
      } else if (!cut && !u.isSplit && /[.!?。！？؟]\s*\S/u.test(row.target_text || '')) {
        cutNote = 'several sentences, no cut entry, and the clip timings do not split both sides the same — the app drills this turn whole'
      }
      out.push({
        id: sentenceId,
        rowId: row.id,
        speaker: row.speaker || '',
        targetText: u.targetText,
        knownText: u.knownText,
        targetAudioId: u.targetAudioId,
        knownAudioId: u.knownAudioId,
        isSplit: u.isSplit,
        fusionGroups: anchored && anchored.length ? anchored : null,
        fusionContinuation: continuation,
        groupsFrom,
        cutNote,
        // main-flow row shape (flattenPodRows) for buildMainStage
        main: { sentence_id: sentenceId, global_order: row.global_order, target_text: u.targetText, known_text: u.knownText, target_audio_id: u.targetAudioId, known_audio_id: u.knownAudioId, glue_to_next: false, speaker: row.speaker },
      })
    }
  }
  return out
}

/** The deepest Drill ladder in the scene (how many visits change anything). */
export function sceneDrillDepth (sentences) {
  let d = 1
  for (const s of sentences) for (const g of s.fusionGroups || []) d = Math.max(d, groupDepth(g, FUSION_MODE))
  return d
}

/**
 * lookupFineKnown, mirrored. `answers` maps `${voice}|${normalizeForLookup(text)}` → clip ref or
 * null (asked, none). A key not in `answers` is recorded in `asked` and answers undefined, exactly
 * the app's "answer still on its way" state; the page fetches them and composes again.
 */
export function makeKnownLookup ({ clips, answers, asked, fallbackVoice }) {
  return (text, lineClipId) => {
    const k = normalizeForLookup(text)
    if (!k) return null
    const line = lineClipId ? clips[bareId(lineClipId)] : null
    const voice = (line?.voice && voiceFamily(line.voice)) || fallbackVoice || POD_KNOWN_VOICE_FAMILY
    return resolveKnownWithFallback(voice, (v) => {
      const key = `${v}|${k}`
      if (answers.has(key)) return answers.get(key)
      asked.set(key, { voice: v, text })
      return undefined
    })
  }
}

/** Turn the server's candidate rows into answers for the asked keys: this course's pod_fine_known
 *  clip in the voice first (the app's own map), else this course's row of either role, else any
 *  course's (crossFetchKnowns). */
export function answerAsked (asked, rows, courseCode, clips) {
  const answers = new Map()
  const by = new Map()
  for (const r of rows) {
    const key = `${voiceFamily(r.voice)}|${normalizeForLookup(r.text_normalized ?? r.textNormalized ?? r.text)}`
    const key2 = `${voiceFamily(r.voice)}|${normalizeForLookup(r.text)}`
    for (const kk of new Set([key, key2])) { if (!by.has(kk)) by.set(kk, []); by.get(kk).push(r) }
  }
  const rank = (r) => (r.course === courseCode && r.role === 'pod_fine_known' ? 0 : r.course === courseCode ? 1 : 2)
  for (const key of asked.keys()) {
    const c = (by.get(key) || []).slice().sort((a, b) => rank(a) - rank(b))[0]
    if (c) clips[c.id] = clips[c.id] || { text: c.text, voice: c.voice, revision: c.revision, hasS3: c.hasS3, role: c.role, course: c.course }
    answers.set(key, c ? stampRef(c.id, c.revision) : null)
  }
  return answers
}
export const lookupVariantsFor = (asked) => [...new Set([...asked.values()].flatMap((a) => lookupKeyVariants(a.text)))]
export const lookupVoicesFor = (asked) => [...new Set([...asked.values()].map((a) => a.voice))]

/** A clip ref's problem, or null when the page can try to play it. */
export function clipGap (clip, clips, side) {
  if (!clip) return `no ${side} clip — the app plays nothing here`
  const c = clips[bareId(clip.id)]
  if (!c) return `${side} clip ${bareId(clip.id)} has no course_audio row`
  if (!c.hasS3) return `${side} clip ${bareId(clip.id)} has no audio file (empty s3_key)`
  return null
}

/**
 * LISTENING (Drill) — what the app queues for one sentence at a visit (rung = visit − 1). With
 * drill groups: composeDrillCard → dropChunksWithoutKnown (taught set empty, so no known is
 * dropped as already-taught). Without: the plain t·k·t·t modal queue, its English from the
 * last-resort lookup when the line has no clip of its own.
 */
export function drillSteps (s, rung, lookup) {
  if (s.fusionContinuation) return { steps: [], strips: [], note: 'glued continuation — the app plays it inside the line before it' }
  if (s.fusionGroups) {
    const card = composeDrillCard(s.fusionGroups, rung, FUSION_MODE, (t) => lookup(t, s.knownAudioId))
    const kept = new Set(dropChunksWithoutKnown(card.steps))
    const steps = card.steps.map((st) => ({
      side: st.kind === 'known' ? 'known' : 'target',
      text: st.text,
      clip: st.clip,
      rate: 1,
      strip: st.stripIndex,
      piece: st.piece ?? -1,
      dropped: !kept.has(st) ? 'chunk has no English clip at all — the app leaves this piece out of Drill' : null,
      lineKnown: !!st.lineKnown,
    }))
    return { steps, strips: card.strips }
  }
  const knownAudioIds = !s.knownAudioId && s.knownText ? knownClipsForText(s.knownText, (x) => lookup(x, null)) : []
  const q = buildModalQueue([{ targetText: s.targetText, targetAudioId: s.targetAudioId, knownAudioId: s.knownAudioId, knownAudioIds }], 'drill', 1)
  const steps = q.map((it) => ({ side: it.role, text: it.role === 'known' ? s.knownText : s.targetText, clip: { id: it.id }, rate: 1, strip: 0, piece: -1 }))
  if (s.targetAudioId && !steps.some((x) => x.side === 'known')) {
    steps.splice(1, 0, { side: 'known', text: s.knownText, clip: null, rate: 1, strip: 0, piece: -1 })
  }
  if (!s.targetAudioId) steps.unshift({ side: 'target', text: s.targetText, clip: null, rate: 1, strip: 0, piece: -1 })
  return { steps, strips: [{ target: s.targetText, known: s.knownText }] }
}

// ── REGULAR play: the main-flow lap ladder ──────────────────────────────────

/** usePodLapScheduler podStageFor — body verbatim. */
export function podStageFor (entryPodRound, currentPodRound, stageDuration, totalStages, stageDurations) {
  const alive = currentPodRound - entryPodRound + 1
  if (alive < 1) return null
  let cum = 0
  for (let stage = 1; stage < totalStages; stage++) {
    const d = stageDurations?.[stage] ?? stageDurations?.[String(stage)] ?? stageDuration
    if (alive <= cum + d) return { stage, iter: alive - cum }
    cum += d
  }
  return { stage: totalStages, iter: null }
}

/** The live ladder: the algorithm_config `pods` row (with the app's DEFAULT_PODS fallbacks) and
 *  whether the `listening` row switches the stage playlist on. */
export function ladderConfig (config) {
  const pods = config?.pods || {}
  const listening = config?.listening || {}
  const stagePlaylist = pods.stagePlaylist || null
  const useStagePlaylist = listening.listeningUseStagePlaylist === true
  const pattern = Array.isArray(listening.playPattern) && listening.playPattern.length ? listening.playPattern : ['target', 'known', 'target', 'target2']
  return {
    stagePlaylist,
    useStagePlaylist,
    pattern,
    stageDuration: pods.stageDuration ?? 5,
    stageDurations: pods.stageDurations, // live playlist without durations = uniform (resolveStageConfig)
    totalStages: stagePlaylist ? Object.keys(stagePlaylist).length : 0,
    retireAfterVisits: typeof pods.retireAfterVisits === 'number' ? pods.retireAfterVisits : 10,
  }
}

/** One sentence's plays on lap `lap` (its alive count), as nextLap composes them. */
export function regularSteps (s, lap, cfg) {
  if (!s.targetAudioId) {
    return { stage: null, playlist: [], steps: [{ side: 'target', text: s.targetText, clip: null, rate: 1, strip: 0, piece: -1 }], note: 'no target clip — the app leaves this sentence out of every lap' }
  }
  const info = podStageFor(1, lap, cfg.stageDuration, cfg.totalStages || 1, cfg.stageDurations)
  const playlist = cfg.useStagePlaylist && cfg.stagePlaylist
    ? (cfg.stagePlaylist[info.stage] || cfg.stagePlaylist[String(info.stage)] || [])
    : cfg.pattern.map((slot) => (slot === 'known' ? 'trans' : 'ps')) // podPlaylistFromPattern
  const plays = buildMainStage(s.main, info.stage, 1, playlist)
  const steps = plays.map((p) => ({ side: p.playRole === 'trans' ? 'known' : 'target', text: p.text, clip: { id: p.audioId }, rate: p.playbackSpeed, role: p.playRole, strip: 0, piece: -1 }))
  if (playlist.includes('trans') && !s.knownAudioId) {
    const at = playlist.indexOf('trans')
    steps.splice(at, 0, { side: 'known', text: s.knownText, clip: null, rate: 1, role: 'trans', strip: 0, piece: -1 })
  }
  return { stage: info.stage, playlist, steps }
}
