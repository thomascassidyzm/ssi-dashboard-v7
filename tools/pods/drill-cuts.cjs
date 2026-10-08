'use strict'
/**
 * drill-cuts.cjs — where to cut a pod turn's ONE recorded take into its Drill units.
 *
 * Tom's rulings: a pod turn is recorded ONCE and its Drill clips are cut from that
 * same take, never rendered separately (r-2026-09-30-pods-record-one-take-per-turn);
 * German Drill cuts made this way from the Nico + Viktoria takes were approved by ear
 * (r-2026-10-08-german-pods-drill-cuts-from-nico, the #181 recut).
 *
 * THE #181 RULE. Cut points are anchored on the provider's own WORD TIMINGS
 * (Cartesia returns them with every render; they are stored on
 * course_audio.word_timings). For each unit boundary — the gap between the last word
 * of one unit and the first word of the next — the cut goes in the detected silence
 * that overlaps that word gap most, at the silence's midpoint. The splicer's older
 * "N-1 longest silences" guess is NOT trusted: on the German takes (#173) it put cuts
 * at comma pauses longer than the sentence pause and refused 10 of 15 multi-sentence
 * turns. A boundary with no detected silence falls back to the midpoint of the word
 * gap itself and is flagged, so the seam gate downstream can judge it.
 *
 * WHAT A UNIT IS HERE: one SENTENCE, split by the player's own boundary regex
 * (POD_SENTENCE_BOUNDARY in podSentenceSplit.ts). #181 also cut sentences over 3.2 s
 * at commas and joined one-word sentences to a neighbour; neither is done here,
 * because the app pairs each Drill unit with an English sentence BY INDEX and files
 * learner progress under the per-row unit count (switch-pod-clip-pointers.cjs), so a
 * German unit with no English counterpart would hand the learner a card with the
 * wrong or no translation. See docs/DECISIONS.md, 2026-10-08.
 *
 * Piece windows reproduce tools/pods/splice.py exactly (the splicer the approved clips
 * were made with): cut at the chosen point, keep PAD of pause either side, FADE in/out.
 */

/** The player's sentence boundary (podSentenceSplit.ts POD_SENTENCE_BOUNDARY). */
const BOUNDARY = /(?<=[.!?])\s+/
// splice.py's constants — keep in step with it.
const EDGE = 0.15      // ignore silence this close to the clip's own ends
const MERGE_S = 0.07   // gaps closer than this are one gap split by a blip
const PAD = 0.05       // pause kept either side of a cut
const FADE = 0.015     // fade in/out on every piece
// How far either side of the word gap a silence may sit and still count as overlapping it.
const SLACK_S = 0.05

const sentencesOf = (text) => String(text || '').split(BOUNDARY).map((s) => s.trim()).filter(Boolean)
const tokens = (s) => String(s || '').split(/\s+/).filter(Boolean)

/** Pure: splice.py's interior-gap list from its healed silence runs (time order). */
function interiorGaps (healed, dur) {
  const merged = []
  for (const [a, b] of healed) {
    if (!(a > EDGE && b < dur - EDGE)) continue
    if (merged.length && a - merged[merged.length - 1][1] < MERGE_S) merged[merged.length - 1][1] = b
    else merged.push([a, b])
  }
  return merged
}

/**
 * Pure: which detected silence a cut after word k belongs in — the one overlapping the
 * gap between word k's end and word k+1's start most. -1 when none overlaps.
 */
function gapForBoundary (timings, k, gaps) {
  const a = timings.ends[k] - SLACK_S
  const b = timings.starts[k + 1] + SLACK_S
  let best = -1, bestOv = 0
  gaps.forEach(([s, e], i) => {
    const ov = Math.min(e, b) - Math.max(s, a)
    if (ov > bestOv) { bestOv = ov; best = i }
  })
  return best
}

/**
 * Pure: the per-sentence word spans of a turn, read against the take's word timings.
 * The words Cartesia timed must be the turn's own whitespace tokens, one for one;
 * anything else means the timings describe different words and a cut would be a guess.
 */
function sentenceSpans (text, timings) {
  const sents = sentencesOf(text)
  const words = (timings && timings.words) || []
  const total = sents.reduce((n, s) => n + tokens(s).length, 0)
  if (words.length !== total) return { ok: false, reason: `timings have ${words.length} words, text has ${total}` }
  const spans = []
  let w = 0
  for (const s of sents) {
    const n = tokens(s).length
    spans.push({ text: s, w0: w, w1: w + n - 1 })
    w += n
  }
  return { ok: true, spans }
}

/**
 * Pure: the cut plan for one take. `gaps` = interiorGaps(...) of the take.
 * Returns { ok, units:[{text,w0,w1}], cuts:[{after:k, at, gap|null, source}] } or { ok:false, reason }.
 */
function planCuts (text, timings, gaps) {
  const sp = sentenceSpans(text, timings)
  if (!sp.ok) return sp
  const cuts = []
  for (let i = 0; i < sp.spans.length - 1; i++) {
    const k = sp.spans[i].w1
    const gi = gapForBoundary(timings, k, gaps)
    if (gi >= 0) {
      const [s, e] = gaps[gi]
      cuts.push({ after: k, at: (s + e) / 2, gap: [s, e], source: 'silence' })
    } else {
      cuts.push({ after: k, at: (timings.ends[k] + timings.starts[k + 1]) / 2, gap: null, source: 'word-gap' })
    }
  }
  for (let i = 1; i < cuts.length; i++) {
    if (!(cuts[i].at > cuts[i - 1].at)) return { ok: false, reason: `cuts out of order at boundary ${i}` }
  }
  return { ok: true, units: sp.spans, cuts }
}

/**
 * Pure: for a 'word-gap' cut (no pause long enough for splice.py), the quietest frame in the word gap.
 * `frames` = [{t, db}] RMS levels over the take; looks within SLACK_S of the gap between the two words.
 * Returns the cut with `at` moved there and `db` recorded, or unchanged when no frame falls in the window.
 */
function settleWordGapCut (cut, timings, frames) {
  if (cut.source !== 'word-gap') return cut
  const a = timings.ends[cut.after] - SLACK_S, b = timings.starts[cut.after + 1] + SLACK_S
  let best = null
  for (const f of frames) if (f.t >= a && f.t <= b && (!best || f.db < best.db)) best = f
  return best ? { ...cut, at: best.t, db: best.db } : cut
}

/**
 * Pure: splice.py's piece windows for a list of cut points over a clip of `dur` seconds. `pads[i]` overrides the
 * pause kept either side of cut i — 0 for a word-gap cut, where there is no pause to keep and PAD would reach
 * into the neighbouring word.
 */
function pieceWindows (cutTimes, dur, pads = []) {
  const bounds = [0, ...cutTimes, dur]
  const pad = (j) => (pads[j] ?? PAD)
  const out = []
  for (let i = 0; i < bounds.length - 1; i++) {
    const start = Math.max(0, bounds[i] - (i ? pad(i - 1) : 0))
    const end = Math.min(dur, bounds[i + 1] + (i + 1 < bounds.length - 1 ? pad(i) : 0))
    out.push({ start, end })
  }
  return out
}

/** The ffmpeg arguments splice.py uses to write one piece. */
function ffmpegPieceArgs (src, { start, end }, out) {
  return ['-y', '-v', 'error', '-i', src, '-ss', start.toFixed(3), '-to', end.toFixed(3), '-af',
    `afade=t=in:st=${start.toFixed(3)}:d=${FADE},afade=t=out:st=${(end - FADE).toFixed(3)}:d=${FADE}`,
    '-c:a', 'libmp3lame', '-b:a', '96k', out]
}

/** Pure: the take's word timings re-based onto a piece cut from it (so Drill can light words). */
function pieceTimings (timings, unit, window) {
  const idx = []
  for (let k = unit.w0; k <= unit.w1; k++) idx.push(k)
  const r = (x) => Math.round(Math.max(0, x - window.start) * 1000) / 1000
  return { source: timings.source || 'cartesia', cutFrom: 'take', words: idx.map((k) => timings.words[k]), starts: idx.map((k) => r(timings.starts[k])), ends: idx.map((k) => r(timings.ends[k])) }
}

module.exports = { settleWordGapCut, BOUNDARY, EDGE, MERGE_S, PAD, FADE, sentencesOf, interiorGaps, gapForBoundary, sentenceSpans, planCuts, pieceWindows, ffmpegPieceArgs, pieceTimings }
