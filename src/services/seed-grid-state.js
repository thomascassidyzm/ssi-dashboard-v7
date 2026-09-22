/**
 * Seed Grid state — ONE computation, shared by the browser service
 * (getSeedGrid in supabase.js) and the build-monitor composable.
 *
 * A FAILED READ MEANS "COULD NOT LOOK", NEVER "FOUND NOTHING".
 *
 * The grid flags a seed "need phrases" (status 'under-threshold') when any new
 * LEGO from seed 4 onward has fewer than USE_PHRASE_THRESHOLD phrase rows with
 * role 'use'. That rule is computed live from three reads, and before job #693
 * the phrases read was treated as "data or empty list": when it failed or was
 * cancelled (the authenticated role carries an 8 s statement timeout and the
 * phrases query peaks just under it) the grid concluded there were no use
 * phrases anywhere and painted ~650 seeds orange, silently, in front of a
 * native-speaker reviewer (job #686's diagnosis).
 *
 * So: if ANY of the three reads errored or came back without data, this
 * returns null and reports the failure through `onReadFailure`. Callers keep
 * the previous grid — the user sees no change, not a flicker of alarm.
 */

export const USE_PHRASE_THRESHOLD = 4
export const FIRST_SEED_WITH_THRESHOLD = 4 // seeds 1-3 are excluded from backfill

/**
 * Names the first read that cannot be trusted, or null if all three are good.
 * A read is untrustworthy when it carries an error OR has no data array —
 * supabase-js returns { data: null, error } on failure, and a cancelled
 * statement surfaces exactly that way.
 */
export function failedSeedGridRead({ seedsRes, legosRes, phrasesRes }) {
  const reads = [['seeds', seedsRes], ['legos', legosRes], ['phrases', phrasesRes]]
  for (const [name, res] of reads) {
    if (!res || res.error || !Array.isArray(res.data)) {
      return { read: name, error: res?.error || new Error(`${name} read returned no data`) }
    }
  }
  return null
}

/**
 * @param {object} reads  { seedsRes, legosRes, phrasesRes } — raw supabase results
 * @param {object} [opts] { onReadFailure(read, error) } — called instead of
 *                         returning a grid when a read failed
 * @returns {Array|null} grid cells, or null when it could not look
 */
export function computeSeedGridState({ seedsRes, legosRes, phrasesRes }, opts = {}) {
  const failure = failedSeedGridRead({ seedsRes, legosRes, phrasesRes })
  if (failure) {
    if (typeof opts.onReadFailure === 'function') opts.onReadFailure(failure.read, failure.error)
    return null
  }

  const legosBySeed = {}
  for (const l of legosRes.data) legosBySeed[l.seed_number] = (legosBySeed[l.seed_number] || 0) + 1
  const phrasesBySeed = {}
  for (const p of phrasesRes.data) phrasesBySeed[p.seed_number] = (phrasesBySeed[p.seed_number] || 0) + 1

  const newLegos = new Set()
  for (const l of legosRes.data) {
    if (l.is_new) newLegos.add(l.seed_number + ':' + l.lego_index)
  }
  const useCounts = {}
  for (const p of phrasesRes.data) {
    if (p.phrase_role === 'use') {
      const key = p.seed_number + ':' + p.lego_index
      if (newLegos.has(key)) useCounts[key] = (useCounts[key] || 0) + 1
    }
  }
  const underThreshold = new Set()
  for (const key of newLegos) {
    const seedNum = parseInt(key.split(':')[0])
    if (seedNum >= FIRST_SEED_WITH_THRESHOLD && (useCounts[key] || 0) < USE_PHRASE_THRESHOLD) underThreshold.add(seedNum)
  }

  return seedsRes.data.map(s => {
    const legos = legosBySeed[s.seed_number] || 0
    const phrases = phrasesBySeed[s.seed_number] || 0
    let status
    if (s.flagged_at) status = 'flagged'
    else if (s.decomposed_at && underThreshold.has(s.seed_number)) status = 'under-threshold'
    else if (s.approved_at) status = 'complete'
    else if (s.decomposed_at) status = 'drafted'
    else if (legos > 0) status = 'building'
    else status = 'empty'
    return { seed: s.seed_number, status, legos, phrases }
  })
}
