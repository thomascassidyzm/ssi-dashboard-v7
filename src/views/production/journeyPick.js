// THE THREE DOORS ON THE COURSE JOURNEY, and the builder's remembered pick.
//
// Tom and Aran, 2026-09-25: every community builder starts on the course
// journey, and the top of it is three cards in Tom's own words — "I want to
// record some stuff / I want to proofread some stuff / I want to build some
// stuff" — "a kind of simplification and a permission to be just doing that
// thing". Once someone picks, the pick is remembered and changed with one tap.
//
// WHERE THE PICK LIVES: this browser's localStorage, keyed by the login's
// email. dashboard_users has no preferences column, and a column for one UI
// choice would be a schema change on the one live database for something a
// second device can simply ask again. If a builder moving between phone and
// laptop turns out to matter, the pick moves server-side then.

export const JOURNEY_CARDS = [
  { key: 'record', title: 'I want to record some stuff', short: 'recording', gerund: 'recording' },
  { key: 'proofread', title: 'I want to proofread some stuff', short: 'proofreading', gerund: 'proofreading' },
  { key: 'build', title: 'I want to build some stuff', short: 'building', gerund: 'building the course' },
]

// Which of the journey's numbered steps belong to each kind of work. The whole
// journey is always one tap away ("Show the whole journey").
const STEPS_FOR_PICK = {
  record: ['record', 'synthesize', 'qa'],
  proofread: ['verify', 'qa'],
  build: ['translate', 'decompose', 'verify', 'publish'],
}

export function stepsForPick(pick) {
  return STEPS_FOR_PICK[pick] || []
}

const KEY_PREFIX = 'popty_journey_pick:'

export function readPick(email) {
  if (!email) return null
  try {
    const v = localStorage.getItem(KEY_PREFIX + email.toLowerCase())
    return JOURNEY_CARDS.some((c) => c.key === v) ? v : null
  } catch { return null }
}

export function writePick(email, pick) {
  if (!email) return
  try { localStorage.setItem(KEY_PREFIX + email.toLowerCase(), pick) } catch { /* private mode: asked again next time */ }
}
