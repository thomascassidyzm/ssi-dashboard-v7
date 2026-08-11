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

// Turn-adjacency weights: how many times two speakers take CONSECUTIVE turns
// in a scene. That pair is what the ear hears as question-and-answer — when a
// pool is too small for a proper colouring (Irish/Croatian = 2 Azure voices),
// a shared voice between a high-weight pair sounds like someone answering
// himself, while a shared voice between a zero-weight pair passes unnoticed.
//   scenes: Array<Array<canonicalSpeaker>> — IN TURN ORDER, dupes meaningful.
// Returns Map "a|b" (sorted pair key) → count.
function buildTurnWeights(scenes) {
  const w = new Map()
  for (const scene of scenes) {
    for (let i = 1; i < scene.length; i++) {
      const a = scene[i - 1], b = scene[i]
      if (!a || !b || a === b) continue
      const key = a < b ? `${a}|${b}` : `${b}|${a}`
      w.set(key, (w.get(key) || 0) + 1)
    }
  }
  return w
}

// Total adjacent-turn weight between `speaker` and already-assigned speakers
// holding `voiceId`. Drives the forced-reuse choice and the collision report.
function adjacentWeightTo(speaker, voiceId, assign, weights) {
  let sum = 0
  for (const [key, count] of weights) {
    const [a, b] = key.split('|')
    const other = a === speaker ? b : b === speaker ? a : null
    if (!other) continue
    const v = assign.get(other)
    if (v && v.voice_id === voiceId) sum += count
  }
  return sum
}

// EXACT 2-voice assignment (Irish/Croatian-class pools). With exactly two
// voices, minimising adjacent-turn collisions is max-cut on the turn-weight
// graph — NP-hard in general but pods have ~22 speakers, so brute force is
// instant and OPTIMAL where greedy provably isn't. Secondary objective:
// fewer co-occurrence collisions; cosmetic tie-break: the side with more
// female-marked speakers gets the female voice.
// Returns { assign, forced } like colourTrack, or null when not applicable.
function exactColourTwoVoices(nodes, adj, pool, genderOf, weights) {
  const full = [...(pool.f || []), ...(pool.m || [])]
  if (full.length !== 2 || !weights || nodes.length < 2 || nodes.length > 24) return null

  const idx = new Map(nodes.map((n, i) => [n, i]))
  // Pre-index weighted pairs and co-occurrence pairs as bit positions.
  const wPairs = []
  for (const [key, count] of weights) {
    const [a, b] = key.split('|')
    if (idx.has(a) && idx.has(b)) wPairs.push([idx.get(a), idx.get(b), count])
  }
  const coPairs = []
  for (const [a, nbrs] of adj) {
    for (const b of nbrs) {
      if (a < b && idx.has(a) && idx.has(b)) coPairs.push([idx.get(a), idx.get(b)])
    }
  }

  // Gender realism is the THIRD objective, never the first two: among cuts that
  // are already optimal on the ear metrics, prefer the one that puts female
  // characters on the female voice. Tom's ruling makes conversational
  // distinctness the hard restriction and accepts that a two-voice cast will
  // sometimes voice a character against their gender ("one voice can work well
  // enough for all the different characters"), so this only ever picks between
  // ties — it can never cost a single adjacent turn.
  const fSide = nodes.map(sp => genderOf(sp) === 'f')
  const mSide = nodes.map(sp => genderOf(sp) === 'm')
  const genderCost = (mask, femaleSide) => {
    let bad = 0
    for (let i = 0; i < nodes.length; i++) {
      const side = (mask >> i) & 1
      if (fSide[i] && side !== femaleSide) bad++
      if (mSide[i] && side === femaleSide) bad++
    }
    return bad
  }

  const n = nodes.length
  let bestMask = 0, bestTurns = Infinity, bestCo = Infinity, bestGender = Infinity
  // Fix node 0 to side 0 (symmetry halves the space): iterate masks over nodes 1..n-1.
  const limit = 1 << (n - 1)
  for (let m = 0; m < limit; m++) {
    const mask = m << 1 // node 0 bit stays 0
    let turns = 0
    for (const [i, j, c] of wPairs) {
      if (((mask >> i) & 1) === ((mask >> j) & 1)) turns += c
    }
    if (turns > bestTurns) continue
    let co = 0
    for (const [i, j] of coPairs) {
      if (((mask >> i) & 1) === ((mask >> j) & 1)) co++
    }
    if (turns === bestTurns && co > bestCo) continue
    // The female voice goes to whichever side carries more female speakers, so
    // score this cut's gender cost under its own best orientation.
    let f0 = 0, f1 = 0
    for (let i = 0; i < n; i++) if (fSide[i]) (((mask >> i) & 1) === 0 ? f0++ : f1++)
    const gender = genderCost(mask, f0 >= f1 ? 0 : 1)
    if (turns < bestTurns || co < bestCo || gender < bestGender) {
      bestMask = mask; bestTurns = turns; bestCo = co; bestGender = gender
    }
  }

  // Side → voice: put the female voice on the side with more 'f' speakers.
  const sideOf = (i) => (bestMask >> i) & 1
  let f0 = 0, f1 = 0
  nodes.forEach((sp, i) => { if (genderOf(sp) === 'f') (sideOf(i) === 0 ? f0++ : f1++) })
  const fVoice = (pool.f || [])[0], mVoice = (pool.m || [])[0]
  let v0, v1
  if (fVoice && mVoice) { [v0, v1] = f0 >= f1 ? [fVoice, mVoice] : [mVoice, fVoice] }
  else { [v0, v1] = full }

  const assign = new Map(nodes.map((sp, i) => [sp, sideOf(i) === 0 ? v0 : v1]))
  // Report remaining same-voice conversing pairs as the forced list.
  const forced = []
  for (const [key, count] of weights) {
    const [a, b] = key.split('|')
    const va = assign.get(a), vb = assign.get(b)
    if (va && vb && va.voice_id === vb.voice_id) forced.push({ speaker: `${a}↔${b}`, with: va.name, adjacentTurns: count })
  }
  return { assign, forced }
}

// Greedy distinct-voice assignment on one track.
//   speakers: canonical names (all nodes)
//   adj: Map speaker → Set(neighbours)
//   pool: { f:[voice], m:[voice] }   (voice = {provider,voice_id,name,gender,locale})
//   genderOf: (speaker) → 'f'|'m'|'n'
//   weights: optional turn-adjacency Map from buildTurnWeights — when forced
//            reuse is unavoidable, pick the voice with the LEAST adjacent-turn
//            weight to its same-voice neighbours, so the back-and-forth feel
//            survives a 2-voice pool. Omitted → legacy round-robin spread.
// Returns { assign: Map speaker→voice, forced: [ {speaker, with, adjacentTurns} ] }.
function colourTrack(speakers, adj, pool, genderOf, weights) {
  const full = [...(pool.f || []), ...(pool.m || [])]
  if (full.length === 0) return { assign: new Map(), forced: [], empty: true }

  // Most-constrained-first ordering improves colouring; deterministic tie-break.
  // (Hubs — staff roles carrying most conversations — land first, so the
  // spokes colour AROUND them. Unchanged from the proven big-pool behaviour.)
  const order = [...speakers].sort((a, b) => {
    const da = adj.get(a)?.size || 0, db = adj.get(b)?.size || 0
    return db - da || (a < b ? -1 : a > b ? 1 : 0)
  })

  const assign = new Map()
  const forced = []
  // round-robin counter for forced reuse without weights (legacy spread)
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
      // 3. forced reuse — pool too small for this scene's headcount.
      if (weights && weights.size) {
        // Minimise adjacent-turn collisions: the shared voice should land on
        // the pair that converses LEAST. Gender is not even a tie-break here —
        // distinctness-in-conversation beats gender (Tom's 4-colour doctrine).
        let best = null, bestW = Infinity
        for (const v of full) {
          const w = adjacentWeightTo(sp, v.voice_id, assign, weights)
          if (w < bestW) { best = v; bestW = w }
        }
        pick = best
        forced.push({ speaker: sp, with: pick.name, adjacentTurns: bestW })
      } else {
        pick = full[rr % full.length]; rr++
        forced.push({ speaker: sp, with: pick.name })
      }
    }
    assign.set(sp, pick)
  }
  return { assign, forced }
}

/**
 * Trim a voice pool to the first N voices per gender, preserving pool order.
 *
 * THE POD-0 CASTING RULE (Tom, 2026-08-08: "of course cast by speaker").
 * Pod 0 runs on exactly TWO voices — one male, one female — and casting is BY
 * SPEAKER, never by line position: each character is assigned a voice and keeps
 * it for every line they speak, including consecutive ones. A third or later
 * character in a scene recycles a voice that is already in play. Strict
 * line-by-line alternation is explicitly rejected, because it splits a single
 * speaker across two voices the moment they have two lines in a row.
 *
 * `voicesPerGender = 1` IS that rule (1 F + 1 M = the two-voice cast). Pool
 * depth is parked, not deleted: raise N for pod 1/2, where more voices are
 * wanted. Mirrors POD_VOICES_PER_GENDER in tools/pod-sync.cjs and
 * DEFAULT_POD_VOICES in services/voice-engine/pods-cast.cjs — same rule, three
 * entry points, one meaning.
 *
 * The voice PAIR is a parameter, never hardcoded: whatever the caller's pool
 * resolves to for its language is what the two voices are. Nothing here is
 * course-specific.
 *
 *   pool: { f:[voice], m:[voice], ...rest }  → same shape, trimmed
 */
function trimPoolPerGender(pool, voicesPerGender) {
  const n = Math.max(1, parseInt(voicesPerGender, 10) || 1)
  return {
    ...pool,
    f: (pool.f || []).slice(0, n),
    m: (pool.m || []).slice(0, n),
  }
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
  // scenes arrive in turn order (dupes = consecutive turns) → adjacency weights
  const weights = buildTurnWeights(scenes)
  // include any speaker with no scene membership (defensive)
  const nodes = [...new Set([...speakers, ...adj.keys()])]
  for (const n of nodes) if (!adj.has(n)) adj.set(n, new Set())

  // Two-voice pools get the exact optimum; everything else greedy (identical
  // to the proven big-pool behaviour — zero churn on already-clean courses).
  const t = exactColourTwoVoices(nodes, adj, targetPool, genderOf, weights)
        || colourTrack(nodes, adj, targetPool, genderOf, weights)
  const k = exactColourTwoVoices(nodes, adj, knownPool, genderOf, weights)
        || colourTrack(nodes, adj, knownPool, genderOf, weights)

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

// Weighted adjacent-turn collision count for an assignment — the metric the
// ear actually cares about. Returns { pairs, turns }: number of same-voice
// conversing pairs, and the total adjacent turns they share.
function countAdjacentCollisions(weights, voiceOf) {
  let pairs = 0, turns = 0
  for (const [key, count] of weights) {
    const [a, b] = key.split('|')
    const va = voiceOf(a), vb = voiceOf(b)
    if (va && vb && va === vb) { pairs++; turns += count }
  }
  return { pairs, turns }
}

module.exports = {
  buildAdjacency, buildTurnWeights, countAdjacentCollisions, colourTrack,
  assignVoicesColoured, trimPoolPerGender,
}
