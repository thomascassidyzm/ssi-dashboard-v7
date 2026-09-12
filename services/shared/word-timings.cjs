/**
 * word-timings — the `course_audio.word_timings` contract (Tom, 2026-09-12).
 *
 * Pod IMMERSION display keeps pace WITHIN a sentence, like a podcast transcript
 * that highlights word by word. Pods are never cut below the sentence, so the
 * timings have to travel with the whole-sentence clip. Cartesia emits them at
 * render time; xAI never did, and human takes have none — those rows carry
 * NULL and a later alignment pass may fill them.
 *
 * THE SHAPE, fixed, because a sibling learning-app job builds the display to it:
 *
 *   { source: 'cartesia', words: ['Ciao','a','tutti'], starts: [0.00, 0.31, …], ends: [0.28, 0.40, …] }
 *
 * Seconds, floats, three arrays of equal length, in playback order. Anything
 * that does not meet that is NULL — a half-shape on the row would be worse
 * than none, because the display would trust it.
 *
 * The learner-facing name is `wordTimings` (same shape or null) on each pod
 * clip object; the player reads `course_audio` directly over Supabase, so the
 * column IS the payload and the app maps the name.
 */

const WORD_TIMINGS_SOURCE_CARTESIA = 'cartesia'

/**
 * Cartesia's `timestamps` SSE events carry `word_timestamps: { words, start, end }`,
 * possibly across several events for one generation. Callers concatenate the
 * events' arrays and hand the merged object here.
 *
 * @param {{ words?: string[], start?: number[], end?: number[] }|null|undefined} wt
 * @returns {{ source: string, words: string[], starts: number[], ends: number[] }|null}
 */
function wordTimingsFromCartesia(wt) {
  if (!wt || !Array.isArray(wt.words) || !Array.isArray(wt.start) || !Array.isArray(wt.end)) return null
  const n = wt.words.length
  if (n === 0 || wt.start.length !== n || wt.end.length !== n) return null
  const words = []
  const starts = []
  const ends = []
  for (let i = 0; i < n; i++) {
    const w = wt.words[i]
    const s = Number(wt.start[i])
    const e = Number(wt.end[i])
    if (typeof w !== 'string' || !Number.isFinite(s) || !Number.isFinite(e) || s < 0 || e < s) return null
    words.push(w)
    starts.push(round3(s))
    ends.push(round3(e))
  }
  return { source: WORD_TIMINGS_SOURCE_CARTESIA, words, starts, ends }
}

/**
 * What goes on the row. Re-validates the contract at the write, so a render
 * path that grew a field or lost one can never store a shape the display
 * would misread — and every non-Cartesia clip stores NULL by construction.
 */
function toWordTimingsColumn(t) {
  if (!t || typeof t !== 'object') return null
  if (t.source !== WORD_TIMINGS_SOURCE_CARTESIA) return null
  return wordTimingsFromCartesia({ words: t.words, start: t.starts, end: t.ends })
}

function round3(x) { return Math.round(x * 1000) / 1000 }

module.exports = { WORD_TIMINGS_SOURCE_CARTESIA, wordTimingsFromCartesia, toWordTimingsColumn }
