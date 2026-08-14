/**
 * Shared by the A-108 isl/ell/est render and its independent verifier: did a
 * clip say the CORRECTED word rather than the superseded one?
 */
/** Words present in `a` but not in `b` — the forms this edit actually changes. */
function tokenDiff (a, b) {
  const words = s => String(s).toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean)
  const other = new Set(words(b))
  return [...new Set(words(a).filter(w => !other.has(w)))]
}

function lev (a, b) {
  const m = a.length, n = b.length
  if (!m) return n
  if (!n) return m
  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return prev[n]
}

/**
 * Did the clip say the CORRECTED form rather than the superseded one?
 *
 * Exact word matching is the wrong instrument on these three languages:
 * whisper transliterates freely (`võite` -> "võitte", `leiate` -> "leijate",
 * `svöng` -> "svung"), so a correct clip fails an equality test for reasons
 * that have nothing to do with the words spoken. What IS reliable is the
 * comparison — for each changed word, find the decode word that best matches
 * either candidate, and require it to sit closer to the new form than to the
 * old one. Transliteration noise hits both candidates equally, so it cancels.
 */
function speaksCorrectedForm (decodeNorm, newTokens, oldTokens, norm, unchangedTokens) {
  const unchanged = (unchangedTokens || []).map(norm)
  const distToUnchanged = w => unchanged.reduce((m, u) => Math.min(m, lev(w, u)), Infinity)
  // A decode word the sentence already contained elsewhere is not evidence
  // about the slot that changed. Estonian scene 8 is the case that forces
  // this: the line legitimately contains `või` ("or"), which sits one edit
  // from the superseded `võid` and would otherwise out-compete the actual
  // corrected word `võite` heard later in the same sentence.
  const words = decodeNorm.split(/\s+/).filter(Boolean)
  const pairs = newTokens.map(t => {
    const nt = norm(t)
    let ot = null, bd = Infinity
    for (const o of oldTokens) { const d = lev(nt, norm(o)); if (d < bd) { bd = d; ot = norm(o) } }
    return { newTok: nt, oldTok: ot }
  })
  const results = pairs.map(p => {
    let best = null, bestScore = Infinity
    for (const w of words) {
      const score = p.oldTok === null ? lev(w, p.newTok) : Math.min(lev(w, p.newTok), lev(w, p.oldTok))
      if (distToUnchanged(w) < score) continue    // belongs to the unchanged text
      if (score < bestScore) { bestScore = score; best = w }
    }
    const dNew = best === null ? Infinity : lev(best, p.newTok)
    const dOld = best === null || p.oldTok === null ? Infinity : lev(best, p.oldTok)
    // Comparative when there is a superseded form to beat; absolute (a third of
    // the word may be mangled) when the edit only inserts a word.
    const ok = p.oldTok === null
      ? dNew <= Math.max(1, Math.ceil(p.newTok.length / 3))
      : dNew < dOld
    return { ...p, heard: best, distance_to_new: dNew, distance_to_superseded: dOld, ok }
  })
  return { ok: results.length > 0 && results.every(r => r.ok), results }
}

module.exports = { tokenDiff, lev, speaksCorrectedForm }
