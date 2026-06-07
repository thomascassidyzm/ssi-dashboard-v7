/**
 * Pod voice colouring — assign a distinct voice to each speaker so that any two
 * characters who ever share a scene get different voices (Tom's 4-colour-map-
 * theorem model: don't need many voices, need ~4-5 GOOD ones such that
 * conversants never collide). Distinctness is the hard constraint; gender is a
 * soft preference. Character-stable: one voice per speaker across the whole pod.
 *
 * Proven read-only on real pods: 137 collisions → 0 across fra/zho/jpn/spa,
 * ≤4 colours ever needed (~/Desktop/SSi-pod-voice-colouring-proof.md).
 *
 * Independent colouring per track (target + known): the English known track has
 * its own small British pool, coloured on the same conversation graph.
 */

// Build co-occurrence adjacency: two speakers are adjacent (must differ) if they
// appear in the SAME scene. Union across all scenes → one stable graph.
//   scenes: Array<Array<canonicalSpeaker>>  (speaker list per scene, dupes ok)
function buildAdjacency(scenes) {
  const adj = new Map()  // speaker → Set(neighbours)
  const ensure = (s) => { if (!adj.has(s)) adj.set(s, new Set()); return adj.get(s) }
  for (const scene of scenes) {
    const uniq = [...new Set(scene)]
    for (const a of uniq) ensure(a)
    for (let i = 0; i < uniq.length; i++) {
      for (let j = i + 1; j < uniq.length; j++) {
        adj.get(uniq[i]).add(uniq[j])
        adj.get(uniq[j]).add(uniq[i])
      }
    }
  }
  return adj
}

// Greedy distinct-voice assignment on one track.
//   speakers: canonical names (all nodes)
//   adj: Map speaker → Set(neighbours)
//   pool: { f:[voice], m:[voice] }   (voice = {provider,voice_id,name,gender,locale})
//   genderOf: (speaker) → 'f'|'m'|'n'
// Returns { assign: Map speaker→voice, forced: [ {speaker, with} ] }.
function colourTrack(speakers, adj, pool, genderOf) {
  const full = [...(pool.f || []), ...(pool.m || [])]
  if (full.length === 0) return { assign: new Map(), forced: [], empty: true }

  // Most-constrained-first ordering improves colouring; deterministic tie-break.
  const order = [...speakers].sort((a, b) => {
    const da = adj.get(a)?.size || 0, db = adj.get(b)?.size || 0
    return db - da || (a < b ? -1 : a > b ? 1 : 0)
  })

  const assign = new Map()
  const forced = []
  // round-robin counter for forced reuse, so collisions spread across the pool
  let rr = 0

  for (const sp of order) {
    const used = new Set()
    for (const nb of (adj.get(sp) || [])) {
      const v = assign.get(nb)
      if (v) used.add(v.voice_id)
    }
    const g = genderOf(sp)
    const pref = g === 'f' ? (pool.f || []) : g === 'm' ? (pool.m || []) : full

    let pick = pref.find(v => !used.has(v.voice_id))          // 1. gender-matched & free
            || full.find(v => !used.has(v.voice_id))          // 2. any free (distinctness > gender)
    if (!pick) {
      // 3. forced reuse — pool too small for this scene's headcount. Spread via RR.
      pick = full[rr % full.length]; rr++
      forced.push({ speaker: sp, with: pick.name })
    }
    assign.set(sp, pick)
  }
  return { assign, forced }
}

/**
 * Full assignment for a pod.
 *   scenes:     Array<Array<canonicalSpeaker>>
 *   speakers:   canonical speaker list (nodes; pass all distinct speakers)
 *   targetPool, knownPool: { f:[], m:[] }
 *   genderOf:   (canonicalSpeaker) → 'f'|'m'|'n'
 *   meta:       (canonicalSpeaker) → { variants } (optional, carried through)
 * Returns {
 *   assignments: { [canon]: { gender, variants, target:{...}, known:{...} } },
 *   report: { targetForced, knownForced, targetColours, knownColours }
 * }
 */
function assignVoicesColoured({ scenes, speakers, targetPool, knownPool, genderOf, meta }) {
  const adj = buildAdjacency(scenes)
  // include any speaker with no scene membership (defensive)
  const nodes = [...new Set([...speakers, ...adj.keys()])]
  for (const n of nodes) if (!adj.has(n)) adj.set(n, new Set())

  const t = colourTrack(nodes, adj, targetPool, genderOf)
  const k = colourTrack(nodes, adj, knownPool, genderOf)

  const assignments = {}
  for (const sp of nodes) {
    const tv = t.assign.get(sp)
    const kv = k.assign.get(sp)
    assignments[sp] = {
      gender: genderOf(sp),
      ...(meta ? meta(sp) : {}),
      target: tv ? { provider: tv.provider, voice_id: tv.voice_id, name: tv.name, locale: tv.locale } : null,
      known:  kv ? { provider: kv.provider, voice_id: kv.voice_id, name: kv.name, locale: kv.locale } : null,
    }
  }
  return {
    assignments,
    report: {
      targetForced: t.forced,
      knownForced: k.forced,
      targetColours: new Set([...t.assign.values()].map(v => v.voice_id)).size,
      knownColours: new Set([...k.assign.values()].map(v => v.voice_id)).size,
      targetEmpty: !!t.empty,
      knownEmpty: !!k.empty,
    },
  }
}

module.exports = { buildAdjacency, colourTrack, assignVoicesColoured }
