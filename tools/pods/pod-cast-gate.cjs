/**
 * pod-cast-gate.cjs — is this pod CAST CORRECTLY? (2026-08-23)
 *
 * Tom's ruling of 2026-08-23, verbatim: "there's always male talking to female,
 * so that two voices can actually do the whole thing, rather than per character,
 * which was the problem previously." Casting is PER CONVERSATION, and the estate's
 * acceptance criterion is two numbers:
 *
 *     ZERO same-voice exchange pairs, and EXACTLY TWO voices in the cast.
 *
 * All 21 staged Group 2 pods measure zero today. This module is the ONE place
 * that measures it, so the flip path and the recast path cannot drift apart on
 * what "cast" means.
 *
 * IT IS A MEASUREMENT, NOT A SOLVER. The solver is
 * tools/pods/pod1-percall-recast.cjs; this file re-uses its exchange-edge
 * definition (buildExchangeWeights, which drops the enumerated NON_EXCHANGE
 * pairs where two customers order in turn at a shared hub rather than talk to
 * each other) so a pod judged cast-correct here is cast-correct by exactly the
 * rule the recast solved to.
 *
 * The known track is deliberately NOT gated: the eng_for_* shape is one narrator
 * reading every character's known line, which is a single voice by design and
 * would fail a two-voice rule that has no business being applied to it. The
 * learner hears the CONVERSATION on the target track.
 *
 * Pure: no DB, no env, no I/O. Callers hand it rows + the pod's stored cast.
 */

'use strict'

const { canonicalSpeakerName } = require('../pod-voice-colour-n.cjs')
const { buildExchangeWeights, norm } = require('./pod1-percall-recast.cjs')

/**
 * @param {object} o
 * @param {Array<{speaker:string, scene_number:number, sentence_number:number}>} o.rows
 *        the pod's sentence rows, in turn order (global_order).
 * @param {object|null} o.speakers  listening_pods.speakers — the stored cast.
 * @param {'target'|'known'} [o.track]
 * @returns {{ok:boolean, failures:string[], ...evidence}}
 */
function checkPodCast ({ rows, speakers, track = 'target' }) {
  const cast = speakers || {}
  const nameOf = (r) => canonicalSpeakerName(r.speaker)
  const voiceOf = (name) => {
    const e = cast[name] || cast._default
    const t = e && (track === 'target' ? e.target : e.known)
    return t && t.voice_id ? norm(t.voice_id) : null
  }

  const cRows = rows || []
  const speakersInScript = [...new Set(cRows.map(nameOf).filter(Boolean))].sort()
  const uncast = speakersInScript.filter(n => !voiceOf(n))
  const voicesInUse = [...new Set(speakersInScript.map(voiceOf).filter(Boolean))].sort()

  const { weights } = buildExchangeWeights(cRows, nameOf)
  const sameVoicePairs = []
  for (const [key, turns] of weights) {
    const [a, b] = key.split('|')
    const va = voiceOf(a), vb = voiceOf(b)
    if (va && vb && va === vb) sameVoicePairs.push({ a, b, voice: va, turns })
  }

  const failures = []
  if (!cRows.length) failures.push('pod has no sentence rows — nothing to cast')
  if (uncast.length) {
    failures.push(`${uncast.length} speaking character(s) have no ${track} voice in the pod cast: ${uncast.join(', ')}`)
  }
  if (voicesInUse.length !== 2) {
    failures.push(`cast uses ${voicesInUse.length} ${track} voice(s), not 2: [${voicesInUse.join(', ')}] ` +
      '— casting is per conversation (one male, one female), not per character')
  }
  if (sameVoicePairs.length) {
    failures.push(`${sameVoicePairs.length} same-voice exchange pair(s) — a character answering themselves: ` +
      sameVoicePairs.map(p => `${p.a}↔${p.b} on ${p.voice} (${p.turns} turn${p.turns === 1 ? '' : 's'})`).join('; '))
  }

  return {
    ok: failures.length === 0,
    failures,
    track,
    speakers: speakersInScript,
    voicesInUse,
    uncast,
    sameVoicePairs,
    exchangePairs: weights.size,
    castKeys: Object.keys(cast).sort(),
  }
}

/** Load the rows + cast a check needs, for callers that have a pg client. */
async function loadPodForCastCheck (db, podId) {
  const pod = (await db.query('select id, speakers from listening_pods where id = $1', [podId])).rows[0]
  if (!pod) return null
  const rows = (await db.query(
    `select scene_number, sentence_number, global_order, speaker, known_text
       from listening_pod_sentences where pod_id = $1
      order by global_order, scene_number, sentence_number`, [podId])).rows
  return { rows, speakers: pod.speakers }
}

module.exports = { checkPodCast, loadPodForCastCheck }
