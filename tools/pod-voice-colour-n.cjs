/**
 * Pod human-cast solver — N-voice casting proposal for HUMAN pod recording.
 *
 * ADDITIVE companion to tools/pod-voice-colour.cjs (Aran's live TTS colouring
 * path — never modified, only required). Where pod-voice-colour assigns TTS
 * voices per pod and writes listening_pods.speakers, THIS module proposes a
 * COURSE-WIDE cast of N human voices for courses.voice_config.podCast
 * (keystone: docs/voice-engine/design/pods-recording-model.md §1).
 *
 * Constraints honoured, in priority order:
 *   1. Turn-alternation (hard while the pool allows): two characters who ever
 *      share a scene get different voices — strictly stronger than "adjacent
 *      dialogue lines never share a voice". When N is smaller than a scene's
 *      headcount, forced reuse lands on the pair that converses LEAST
 *      (minimum adjacent-turn weight) and is reported, never silent.
 *   2. Per-speaker consistency: ONE voice per canonical character across ALL
 *      pods of the course (single assignment map keyed by canonical name;
 *      scenes are keyed per (pod, scene) so adjacency never bleeds across pods
 *      but the character does keep their voice).
 *   3. Gender constraint (soft, per the 4-colour doctrine): when the
 *      character's gender is known, prefer a voice of that gender; a mismatch
 *      forced by distinctness is reported in report.genderMismatches for the
 *      leader to override in the casting UI.
 *   4. Balanced line counts: among equally-valid voices, the one with the
 *      lightest recording load so far wins, so 4-5 humans get comparable
 *      autocue sittings.
 *
 * Pure module — no DB, no env, no I/O. Reuses the proven graph machinery
 * (buildAdjacency / buildTurnWeights / countAdjacentCollisions) from
 * pod-voice-colour.cjs per the recon (§3).
 *
 * The solver is a FALLBACK for courses without generation-side colouring
 * (keystone addendum 2026-06-11): when listening_pods.speakers already
 * carries slot colouring, consume it verbatim — don't re-solve over it.
 *
 * Vocabulary: known / target / seed.
 */

'use strict'

const {
  buildAdjacency,
  buildTurnWeights,
  countAdjacentCollisions,
} = require('./pod-voice-colour.cjs')

// ---------------------------------------------------------------------------
// Speaker normalisation — local mirrors of tools/pod-sync.cjs helpers.
// (pod-sync.cjs creates a Supabase client at require time, so importing it
// here would drag env/network into a pure module and into vitest. These two
// rules are tiny and stable; behaviour matches pod-sync exactly.)
// ---------------------------------------------------------------------------

/** "Susjed (08:00) (M)" → "Susjed" — all paren groups stripped, case kept. */
function canonicalSpeakerName(speaker) {
  return String(speaker || '').replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Explicit gender marker: "Konobar (M)" → 'm'. Returns 'f'|'m'|'n'|null. */
function extractGenderMarker(speakerRaw) {
  const m = String(speakerRaw || '').match(/\(\s*([FMN])\s*\)/)
  return m ? m[1].toLowerCase() : null
}

// ---------------------------------------------------------------------------
// Scene + line-count extraction from listening_pod_sentences rows
// ---------------------------------------------------------------------------

/**
 * Build the course-wide conversation structure from sentence rows spanning
 * ANY number of pods.
 *
 * @param {Array<{pod_id:string, scene_number:number|null, global_order:number,
 *                speaker:string, glue_to_next?:boolean}>} sentences
 * @returns {{
 *   scenes: string[][],                       // per (pod, scene), in turn order
 *   speakers: string[],                       // canonical names
 *   variantsByCanon: Map<string, Set<string>>,
 *   lineCountByCanon: Map<string, number>,    // recording ITEMS (glue chain = 1)
 *   podsByCanon: Map<string, Set<string>>,
 * }}
 */
function buildScenesFromSentences(sentences) {
  const rows = [...(sentences || [])].sort((a, b) =>
    a.pod_id < b.pod_id ? -1 : a.pod_id > b.pod_id ? 1 : (a.global_order || 0) - (b.global_order || 0))

  const scenesMap = new Map()        // "podId::scene" → [canon,...] in turn order
  const variantsByCanon = new Map()
  const lineCountByCanon = new Map()
  const podsByCanon = new Map()

  let prev = null
  for (const s of rows) {
    const canon = canonicalSpeakerName(s.speaker)
    if (!canon) { prev = s; continue }
    if (!variantsByCanon.has(canon)) variantsByCanon.set(canon, new Set())
    variantsByCanon.get(canon).add(s.speaker)
    if (!podsByCanon.has(canon)) podsByCanon.set(canon, new Set())
    podsByCanon.get(canon).add(s.pod_id)

    const sceneKey = `${s.pod_id}::${s.scene_number == null ? 0 : s.scene_number}`
    if (!scenesMap.has(sceneKey)) scenesMap.set(sceneKey, [])
    scenesMap.get(sceneKey).push(canon)

    // Line items: a row glued onto the previous row of the SAME pod by the
    // SAME character continues one utterance — one autocue item, not two.
    const continuesGlue = prev && prev.pod_id === s.pod_id && prev.glue_to_next === true &&
      canonicalSpeakerName(prev.speaker) === canon
    if (!continuesGlue) {
      lineCountByCanon.set(canon, (lineCountByCanon.get(canon) || 0) + 1)
    }
    prev = s
  }

  return {
    scenes: [...scenesMap.values()],
    speakers: [...variantsByCanon.keys()],
    variantsByCanon,
    lineCountByCanon,
    podsByCanon,
  }
}

// Total adjacent-turn weight between `speaker` and already-cast speakers
// holding `voiceId` (same maths as pod-voice-colour's internal helper, which
// is not exported — kept local rather than modifying Aran's file).
function adjacentWeightTo(speaker, voiceId, castVoiceIdOf, weights) {
  let sum = 0
  for (const [key, count] of weights) {
    const [a, b] = key.split('|')
    const other = a === speaker ? b : b === speaker ? a : null
    if (!other) continue
    if (castVoiceIdOf(other) === voiceId) sum += count
  }
  return sum
}

// ---------------------------------------------------------------------------
// The solver
// ---------------------------------------------------------------------------

/**
 * Propose speaker → human-voice assignments for a whole course's pods.
 *
 * @param {object} args
 * @param {Array} args.sentences  listening_pod_sentences rows across ALL pods
 *   of the course: { pod_id, scene_number, global_order, speaker, glue_to_next? }
 * @param {Array<{voiceId:string, name?:string, gender?:('f'|'m'|'n'|null), email?:string}>}
 *   args.voices  the N available human voices (4-5 is the design centre,
 *   any N ≥ 1 works; N is RESPECTED — no other voice is ever proposed).
 * @param {Object<string,'f'|'m'|'n'>} [args.genderBySpeaker]  canonical name →
 *   gender, e.g. read from listening_pods.speakers[canon].gender (recon §4).
 *   Falls back to explicit (F)/(M)/(N) markers on raw speaker variants.
 *
 * @returns {{
 *   castBySpeaker: Object<string, {voiceId:string, name:string|null, email:string|null}>,
 *     // shaped for courses.voice_config.podCast — __explainer__ NOT included
 *     // (the explainer voice is the leader's own cast entry, keystone §1)
 *   report: {
 *     speakers:number, scenes:number, voicesUsed:number, voicesAvailable:number,
 *     forced: Array<{speaker:string, with:string, adjacentTurns:number}>,
 *     genderMismatches: Array<{speaker:string, speakerGender:string, voice:string, voiceGender:string}>,
 *     lineCounts: { bySpeaker: Object<string,number>, byVoice: Object<string,number> },
 *     adjacentCollisions: { pairs:number, turns:number },
 *   }
 * }}
 */
function proposeHumanCast({ sentences, voices, genderBySpeaker = null }) {
  const pool = (voices || []).filter(v => v && v.voiceId)
  if (pool.length === 0) throw new Error('proposeHumanCast: at least one voice required')

  const { scenes, speakers, variantsByCanon, lineCountByCanon } =
    buildScenesFromSentences(sentences)
  const adj = buildAdjacency(scenes)
  const weights = buildTurnWeights(scenes)
  // Defensive: every speaker is a node even with no scene membership.
  for (const sp of speakers) if (!adj.has(sp)) adj.set(sp, new Set())

  const genderOf = (canon) => {
    const g = genderBySpeaker && genderBySpeaker[canon]
    if (g === 'f' || g === 'm' || g === 'n') return g
    for (const v of variantsByCanon.get(canon) || []) {
      const marked = extractGenderMarker(v)
      if (marked) return marked
    }
    return 'n'
  }

  // Most-constrained-first: characters carrying the most conversations are
  // cast first so the rest colour around them; heavier line loads break ties
  // (they matter most for balance), then name for determinism.
  const order = [...speakers].sort((a, b) => {
    const da = adj.get(a)?.size || 0, db = adj.get(b)?.size || 0
    if (db !== da) return db - da
    const la = lineCountByCanon.get(a) || 0, lb = lineCountByCanon.get(b) || 0
    if (lb !== la) return lb - la
    return a < b ? -1 : a > b ? 1 : 0
  })

  const cast = new Map()                  // canon → voice object
  const load = new Map(pool.map(v => [v.voiceId, 0]))   // voiceId → line count
  const forced = []
  const genderMismatches = []
  const voiceIdOf = (canon) => (cast.get(canon) ? cast.get(canon).voiceId : null)

  for (const sp of order) {
    const lines = lineCountByCanon.get(sp) || 0
    const used = new Set()
    for (const nb of adj.get(sp) || []) {
      const v = cast.get(nb)
      if (v) used.add(v.voiceId)
    }

    const g = genderOf(sp)
    const free = pool.filter(v => !used.has(v.voiceId))
    // Gender-matched free voices first (soft constraint), else any free voice
    // (distinctness-in-conversation beats gender), else forced reuse.
    const genderMatched = (g === 'f' || g === 'm')
      ? free.filter(v => v.gender === g)
      : free
    const candidates = genderMatched.length ? genderMatched : free

    let pick = null
    if (candidates.length) {
      // Balance: lightest current load wins; stable pool order breaks ties.
      pick = candidates.reduce((best, v) =>
        (load.get(v.voiceId) < load.get(best.voiceId) ? v : best), candidates[0])
    } else {
      // Forced reuse: N < this scene-neighbourhood's headcount. Land the
      // shared voice on the pair that converses least, then lightest load.
      let bestW = Infinity, bestLoad = Infinity
      for (const v of pool) {
        const w = adjacentWeightTo(sp, v.voiceId, voiceIdOf, weights)
        const l = load.get(v.voiceId)
        if (w < bestW || (w === bestW && l < bestLoad)) { pick = v; bestW = w; bestLoad = l }
      }
      forced.push({ speaker: sp, with: pick.name || pick.voiceId, adjacentTurns: bestW })
    }

    if ((g === 'f' || g === 'm') && (pick.gender === 'f' || pick.gender === 'm') && pick.gender !== g) {
      genderMismatches.push({
        speaker: sp, speakerGender: g,
        voice: pick.name || pick.voiceId, voiceGender: pick.gender,
      })
    }

    cast.set(sp, pick)
    load.set(pick.voiceId, load.get(pick.voiceId) + lines)
  }

  const castBySpeaker = {}
  for (const [sp, v] of cast) {
    castBySpeaker[sp] = { voiceId: v.voiceId, name: v.name || null, email: v.email || null }
  }
  const bySpeaker = {}
  for (const sp of speakers) bySpeaker[sp] = lineCountByCanon.get(sp) || 0
  const byVoice = {}
  for (const [vid, n] of load) byVoice[vid] = n

  return {
    castBySpeaker,
    report: {
      speakers: speakers.length,
      scenes: scenes.length,
      voicesUsed: new Set([...cast.values()].map(v => v.voiceId)).size,
      voicesAvailable: pool.length,
      forced,
      genderMismatches,
      lineCounts: { bySpeaker, byVoice },
      adjacentCollisions: countAdjacentCollisions(weights, voiceIdOf),
    },
  }
}

module.exports = {
  proposeHumanCast,
  buildScenesFromSentences,
  canonicalSpeakerName,
  extractGenderMarker,
}
