// What the raw-vs-processed comparison is actually FOR (Tom, 2026-08-22).
//
// It is a diagnostic, not a fidelity argument: "raw" means before OUR
// processing, not before the phone's. What the recordist needs to see in it is
// whether the take captured enough room either side of the phrase — because a
// take that begins on the first word has nothing to lose at the front except
// the word.
//
// So the number that matters is the MARGIN: how much longer the original is
// than the clip made from it. The old copy read that number backwards. It
// announced "processed is N ms SHORTER" and turned orange past 100ms — on a
// surface where the recorder deliberately captures seconds of pre-roll and
// tail around every line and the trim deliberately removes them.
//
// Measured on Tom's own takes (2026-08-22): 5.67s of raw came out as a 2.02s
// clip, 12.01s as 1.59s. So that alarm has been firing on EVERY take, by three
// to ten seconds, since the day it shipped. A warning that fires every time is
// a warning nobody reads.
//
// The alarm therefore fires on NO margin, not on lots of it.

// Under this, the processing had essentially nothing outside the words to take,
// so the take began and ended on the phrase. The trim retains 0.35s at each end
// by design (TRIM_MARGIN_SEC in services/audio-processor.cjs), so a healthy
// take with real pre-roll and tail clears this comfortably.
export const MIN_MARGIN_MS = 250

/**
 * Read the margin out of the two durations, in seconds.
 *
 * Returns null while either side is still unknown — the row says "…" rather
 * than asserting anything about a take it has not measured.
 */
export function marginVerdict(rawSec, processedSec) {
  if (typeof rawSec !== 'number' || typeof processedSec !== 'number') return null
  const marginMs = Math.round((rawSec - processedSec) * 1000)

  if (marginMs < 0) {
    // The clip is LONGER than the thing it was made from. Nothing in the chain
    // can do that; it means the two files are not the same take.
    return {
      marginMs,
      state: 'impossible',
      text: `The processed clip is ${-marginMs} ms LONGER than the original. These are not the same take.`,
    }
  }
  if (marginMs < MIN_MARGIN_MS) {
    return {
      marginMs,
      state: 'tight',
      text: `Only ${marginMs} ms of room around the phrase. This take started or ended close to the words — leave a beat before you read and after you finish.`,
    }
  }
  return {
    marginMs,
    state: 'ok',
    text: `${(marginMs / 1000).toFixed(2)}s of room around the phrase, trimmed off. The words are in the middle, where they should be.`,
  }
}
