/**
 * podArcCompose.js — vendored, dependency-free port of the learner's pod
 * composition (ssi-learning-app: podStageComposition.ts), so the admin
 * "full-arc" preview composes EXACTLY what a learner hears: Stages 1-N for one
 * sentence, flattened into one ordered play-list.
 *
 * Stage 0 is retired (Tom, 2026-09-19: "we retired Stage 0 on the pods / We
 * should just have Stages from 1 onwards"), so the ported tier sequencer and
 * its atom resolution went with it — the arc starts at Stage 1.
 *
 * Parity contract: keep buildMainStage byte-faithful to the learner source. If
 * the learner composer changes, update this copy. (The canonical source is
 * podStageComposition.ts.)
 */

export const ROLE_SPEED = { ps08x: 0.8, ps: 1.0, ps15x: 1.5, ps2x: 2.0, trans: 1.0, explainer: 1.0 }

// ── stages 1-N (port of podStageComposition.buildMainStage) ──────────────────
function buildMainStage(sentence, stage, playlist) {
  const plays = []
  for (let j = 0; j < playlist.length; j++) {
    let role = playlist[j]
    if (role === 'explainer' && !sentence.explainer_audio_id) {
      if (playlist.includes('trans')) continue
      role = 'trans'
    }
    if (role === 'trans' && !sentence.known_audio_id) continue
    const isTrans = role === 'trans', isExp = role === 'explainer'
    const audioId = isExp ? sentence.explainer_audio_id : isTrans ? sentence.known_audio_id : sentence.target_audio_id
    if (!audioId) continue
    plays.push({ playRole: role, audioId, text: isTrans ? sentence.known_text : sentence.target_text, playbackSpeed: ROLE_SPEED[role] ?? 1 })
  }
  if (!plays.length) return []
  // end-on-target invariant — never strand the learner on the known language
  const last = plays[plays.length - 1]
  if (last.playRole === 'trans' || last.playRole === 'explainer') {
    if (sentence.target_audio_id) {
      const lastT = [...plays].reverse().find((p) => p.playRole !== 'trans' && p.playRole !== 'explainer')
      const closeRole = lastT?.playRole ?? 'ps'
      plays.push({ playRole: closeRole, audioId: sentence.target_audio_id, text: sentence.target_text, playbackSpeed: ROLE_SPEED[closeRole] ?? 1 })
    }
  }
  return plays
}

// ── per-SENTENCE split (port of podSentenceSplit.ts) ─────────────────────────
// The UNIT the learner hears is the SENTENCE, not the turn (Tom 2026-06-16):
// a multi-sentence turn carries sentence_audio_ids / sentence_known_audio_ids.
// Verified 2026-06-28 that sentence == intention for this content, so we reuse
// the runtime split rather than a parallel structure. Keep byte-faithful to
// podSentenceSplit.ts.
const POD_SENTENCE_BOUNDARY = /(?<=[.!?…])\s+/
const splitText = (t) => (t || '').split(POD_SENTENCE_BOUNDARY).map((s) => s.trim()).filter(Boolean)

function splitRowUnits(row) {
  const clips = (Array.isArray(row.sentence_audio_ids) ? row.sentence_audio_ids : []).filter(Boolean)
  const knownClips = (Array.isArray(row.sentence_known_audio_ids) ? row.sentence_known_audio_ids : []).filter(Boolean)
  if (clips.length < 2) {
    return [{ targetText: row.target_text || '', knownText: row.known_text || '', targetAudioId: row.target_audio_id || null, knownAudioId: row.known_audio_id || null }]
  }
  const tSents = splitText(row.target_text)
  const kSents = splitText(row.known_text)
  const knownMatches = knownClips.length === clips.length
  return clips.map((clip, i) => ({
    targetText: tSents[i] || tSents[tSents.length - 1] || row.target_text || '',
    knownText: knownMatches ? (kSents[i] || '') : '',
    targetAudioId: clip,
    knownAudioId: knownMatches ? knownClips[i] : null,
  }))
}

/**
 * Compose ONE sentence's whole arc: Stages 1..N. Returns a flat ordered
 * play-list: { audioId, speed, role, label, stageLabel, gapAfterMs }
 */
export function composeArc(sentence, podsStagePlaylist) {
  const out = []
  const units = splitRowUnits(sentence)
  const stages = Object.keys(podsStagePlaylist || {}).map(Number).filter((n) => !Number.isNaN(n)).sort((a, b) => a - b)

  units.forEach((u, ui) => {
    const prefix = units.length > 1 ? `S${ui + 1}·` : ''
    const sentLike = { target_audio_id: u.targetAudioId, known_audio_id: u.knownAudioId, explainer_audio_id: null, target_text: u.targetText, known_text: u.knownText }

    // STAGES 1..N — ascending, per sentence
    for (const stage of stages) {
      const playlist = podsStagePlaylist[stage] || podsStagePlaylist[String(stage)]
      if (!playlist) continue
      for (const p of buildMainStage(sentLike, stage, playlist)) {
        out.push({ audioId: p.audioId, speed: p.playbackSpeed || 1, role: p.playRole, label: p.text, stageLabel: `${prefix}${stage}`, gapAfterMs: 0 })
      }
    }
  })
  return out
}
