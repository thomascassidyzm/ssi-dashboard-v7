// WHERE A REVIEWER LEFT OFF IN THE SCRIPT VIEWER (job #804, Kai 15 Oct).
//
// Round numbers are not a place: they are the learner order, recomputed from the course as it
// stands, so an edit upstream — or the nightly rebuild of the round index — moves "Round 312" to
// a different LEGO. Deborah, proofreading deu_for_eng, kept losing her place that way. A LEGO id
// (S0567L02) never moves, so that is what is remembered: the last LEGO this reviewer opened,
// played or edited in this course, and the page offers "Continue where you left off — seed 567"
// and finds the round that LEGO is in TODAY.
//
// Kept in this browser's localStorage per login email and course, like the journey pick
// (journeyPick.js) and for the same reason: no schema change on the one live database for a
// reading position. Another device simply has no place to offer.
const KEY_PREFIX = 'popty_review_place:'
const LEGO_ID = /^S(\d{4})L(\d{2})$/

const keyFor = (email, courseCode) => `${KEY_PREFIX}${(email || 'anon').toLowerCase()}:${courseCode}`

export function seedOfLego(legoId) {
  const m = LEGO_ID.exec(String(legoId || ''))
  return m ? parseInt(m[1], 10) : null
}

export function readPlace(email, courseCode) {
  if (!courseCode) return null
  try {
    const v = JSON.parse(localStorage.getItem(keyFor(email, courseCode)) || 'null')
    return v && seedOfLego(v.legoId) ? { legoId: v.legoId, at: v.at || null } : null
  } catch { return null }
}

export function savePlace(email, courseCode, legoId, now = Date.now()) {
  if (!courseCode || !seedOfLego(legoId)) return null
  const place = { legoId, at: new Date(now).toISOString() }
  try { localStorage.setItem(keyFor(email, courseCode), JSON.stringify(place)) } catch { /* private mode: no memory */ }
  return place
}

export function clearPlace(email, courseCode) {
  try { localStorage.removeItem(keyFor(email, courseCode)) } catch { /* nothing to clear */ }
}

// The round a LEGO is in now, from a list of rounds ({ roundNumber, legoId }); null if absent.
export function roundOfLego(rounds, legoId) {
  const r = (rounds || []).find(x => x && x.legoId === legoId)
  return r ? r.roundNumber : null
}
