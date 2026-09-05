/**
 * podArcCompose.js — vendored, dependency-free port of the learner's pod
 * composition (ssi-learning-app: stage0Sequence.ts + podStageComposition.ts),
 * so the admin "full-arc" preview composes EXACTLY what a learner hears:
 * Stage-0 breakdown ladder (all tiers) → Stages 1-N escalation, for one
 * sentence, flattened into one ordered play-list.
 *
 * Parity contract: keep tierSequence / buildMainStage byte-faithful to the
 * learner source. If the learner composer changes, update this copy. (The
 * canonical source is podStageComposition.ts + stage0Sequence.ts.)
 */

export const ROLE_SPEED = { ps08x: 0.8, ps: 1.0, ps15x: 1.5, ps2x: 2.0, trans: 1.0, explainer: 1.0 }

// ── stage-0 atom resolution (port of resolveAtoms / clipsFromRow) ────────────
// Case-insensitive, accent-preserving surface key for "[atom] <surface>" lookup
// (a sentence-initial "Come" resolves the same slice as "come"; "È"≠"e"). MUST
// match the key normalisation where targetClipMap is built (ListeningConfig).
export const normSurface = (s) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim()
export function resolveAtoms(atomMap, glossMap, targetClipMap) {
  return (atomMap || [])
    .filter((e) => e.kind === 'atom' || e.kind === 'passthrough')
    .map((e) => ({
      targetSurface: e.target_surface,
      gloss: e.gloss,
      targetClipId: targetClipMap.get(normSurface(e.target_surface)) ?? null,
      meansGlossClipId: glossMap.get(e.lego_key) ?? null,
    }))
}
function clipsFromRow(row) {
  return { wholeTakeId: row.target_audio_id, translationId: row.known_audio_id, targetText: row.target_text, knownText: row.known_text }
}

// ── stage-0 tier sequencer (port of stage0Sequence.tierSequence) ─────────────
function tierSequence(tier, atoms, clips, cfg) {
  const g = cfg.gaps
  const speed = cfg.playbackSpeed || 1
  const seq = []
  const clip = (audioId, role, label) => seq.push({ type: 'clip', audioId, role, label, speed })
  const gap = (ms) => { if (ms > 0) seq.push({ type: 'gap', ms }) }
  const trimTrailingGap = () => { while (seq.length && seq[seq.length - 1].type === 'gap') seq.pop() }
  const withTarget = atoms.filter((a) => a.targetClipId)

  if (tier.key === 'explainer' || (tier.granularity === 'atoms' && tier.key === 'explainer')) {
    // 4-MOVEMENT breakdown (Tom 2026-06-27): whole target → whole known →
    // per-MEANINGFUL-chunk (target → "means X") → whole target. Each chunk is
    // heard ONCE. A chunk with no gloss (a name) is NEVER drilled on its own —
    // it's heard only inside the whole takes, in context.
    const meaningful = atoms.filter((a) => a.targetClipId && a.meansGlossClipId)
    // 1 · whole target
    if (clips.wholeTakeId) clip(clips.wholeTakeId, 'wholeTake', clips.targetText)
    // 2 · whole known (the meaning)
    if (clips.translationId) { if (seq.length) gap(g.targetMeaning); clip(clips.translationId, 'translation', clips.knownText) }
    // 3 · per meaningful chunk: target → "means X"
    if (meaningful.length) {
      gap(g.betweenChunks)
      meaningful.forEach((a, j) => {
        clip(a.targetClipId, 'target', a.targetSurface)
        gap(g.beforeMeans); clip(a.meansGlossClipId, 'meansGloss', `means ${a.gloss}`)
        if (j < meaningful.length - 1) gap(g.betweenChunks)
      })
    }
    // 4 · whole target (wrap, now understood)
    if (clips.wholeTakeId) { gap(g.betweenChunks); clip(clips.wholeTakeId, 'wholeTake', clips.targetText) }
    trimTrailingGap()
    return seq
  }

  if (tier.granularity === 'atoms') {
    withTarget.forEach((a, i) => { clip(a.targetClipId, 'target', a.targetSurface); if (i < withTarget.length - 1) gap(g.betweenChunks) })
    if (clips.translationId && seq.length) { gap(g.targetMeaning); clip(clips.translationId, 'translation', clips.knownText) }
    trimTrailingGap()
    return seq
  }

  if (tier.granularity === 'pairs') {
    const fuse = tier.fusionGap ?? g.fusionPairs
    const pushFusedTarget = () => withTarget.forEach((a, i) => { clip(a.targetClipId, 'target', a.targetSurface); if (i < withTarget.length - 1) gap(fuse) })
    pushFusedTarget()
    if (clips.translationId && seq.length) {
      gap(g.targetMeaning); clip(clips.translationId, 'translation', clips.knownText)
      for (let r = 0; r < (tier.targetRepeats || 0); r++) { gap(g.targetMeaning); pushFusedTarget() }
    }
    trimTrailingGap()
    return seq
  }

  if (tier.granularity === 'intention') {
    if (clips.wholeTakeId) clip(clips.wholeTakeId, 'wholeTake', clips.targetText)
    if (clips.translationId) {
      if (seq.length) gap(g.targetMeaning)
      clip(clips.translationId, 'translation', clips.knownText)
      if (clips.wholeTakeId) for (let r = 0; r < (tier.targetRepeats || 0); r++) { gap(g.targetMeaning); clip(clips.wholeTakeId, 'wholeTake', clips.targetText) }
    }
    trimTrailingGap()
    return seq
  }
  return seq
}

/** Fold clip/gap events into clips each carrying their trailing gap. */
function foldEventsToPlays(events) {
  const out = []
  for (let k = 0; k < events.length; k++) {
    const e = events[k]
    if (e.type !== 'clip') continue
    let gapAfter = 0, hasNextClip = false
    for (let m = k + 1; m < events.length; m++) {
      const nx = events[m]
      if (nx.type === 'gap') gapAfter += nx.ms
      else { hasNextClip = true; break }
    }
    out.push({ audioId: e.audioId, role: e.role, label: e.label, speed: e.speed, gapAfterMs: hasNextClip ? gapAfter : 0 })
  }
  return out
}

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

/**
 * Compose ONE sentence's whole arc: Stage-0 tiers (when it resolves to atoms
 * with a clip) followed by Stages 1..N. Returns a flat ordered play-list:
 *   { audioId, speed, role, label, stageLabel, gapAfterMs }
 */
// ── per-SENTENCE split + atom-partition (ports of podSentenceSplit.ts) ────────
// The UNIT the learner hears is the SENTENCE, not the turn (Tom 2026-06-16):
// a multi-sentence turn carries sentence_audio_ids / sentence_known_audio_ids,
// and the flat atom_map is partitioned per sentence. Verified 2026-06-28 that
// sentence == intention for this content, so we reuse the runtime split rather
// than a parallel structure. Keep byte-faithful to podSentenceSplit.ts.
const POD_SENTENCE_BOUNDARY = /(?<=[.!?…])\s+/
const splitText = (t) => (t || '').split(POD_SENTENCE_BOUNDARY).map((s) => s.trim()).filter(Boolean)
const alnumOnly = (s) => (s || '').toLowerCase().replace(/[^\p{L}\p{N}\p{M}]/gu, '')

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

function partitionAtomMap(atomMap, sentenceTexts) {
  if (!Array.isArray(atomMap) || atomMap.length === 0) return null
  if (sentenceTexts.length < 2) return null
  const targets = sentenceTexts.map(alnumOnly)
  if (targets.some((t) => !t)) return null
  const groups = sentenceTexts.map(() => [])
  let si = 0, acc = ''
  for (const entry of atomMap) {
    if (si >= groups.length) return null
    groups[si].push(entry)
    if (entry.kind === 'atom' || entry.kind === 'passthrough') {
      const surf = alnumOnly(entry.target_surface || '')
      if (surf) {
        acc += surf
        if (acc === targets[si]) { si++; acc = '' }
        else if (!targets[si].startsWith(acc)) return null
      }
    }
  }
  if (si !== groups.length || acc !== '') return null
  if (groups.some((g) => g.length === 0)) return null
  return groups
}

export function composeArc(sentence, glossMap, targetClipMap, stage0Cfg, podsStagePlaylist) {
  const out = []
  const units = splitRowUnits(sentence)
  // Partition the flat atom_map across the split sentences (null ⇒ no Stage-0,
  // same as the runtime — never a wrong ladder).
  const atomGroups = units.length > 1 ? partitionAtomMap(sentence.atom_map, units.map((u) => u.targetText)) : null
  const stages = Object.keys(podsStagePlaylist || {}).map(Number).filter((n) => !Number.isNaN(n)).sort((a, b) => a - b)

  units.forEach((u, ui) => {
    const prefix = units.length > 1 ? `S${ui + 1}·` : ''
    const unitAtomMap = units.length > 1 ? (atomGroups ? atomGroups[ui] : []) : (sentence.atom_map || [])
    const atoms = resolveAtoms(unitAtomMap, glossMap, targetClipMap)
    const clips = { wholeTakeId: u.targetAudioId, translationId: u.knownAudioId, targetText: u.targetText, knownText: u.knownText }
    // The explainer clip belongs to the WHOLE ROW: an unsplit row's explainer
    // is that sentence's explainer and must reach the preview, or a playlist
    // carrying an 'explainer' slot would show the phase-0 translation fallback
    // here while the learner hears the explainer clip. A SPLIT row has one
    // explainer for several sentences and no way to attribute it, so split
    // units carry none — same conservative choice the runtime split makes.
    const sentLike = { target_audio_id: u.targetAudioId, known_audio_id: u.knownAudioId, explainer_audio_id: units.length > 1 ? null : (sentence.explainer_audio_id || null), target_text: u.targetText, known_text: u.knownText }

    // STAGE 0 — only where at least one atom resolves to a target clip
    if (stage0Cfg && Array.isArray(stage0Cfg.tiers) && atoms.some((a) => a.targetClipId)) {
      for (const tier of stage0Cfg.tiers) {
        const visits = Math.max(1, tier.visits || 1)
        for (let v = 0; v < visits; v++) {
          const plays = foldEventsToPlays(tierSequence(tier, atoms, clips, stage0Cfg))
          for (const p of plays) out.push({ audioId: p.audioId, speed: p.speed || 1, role: p.role, label: p.label, stageLabel: `${prefix}0·${tier.key}`, gapAfterMs: p.gapAfterMs })
        }
      }
    }

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
