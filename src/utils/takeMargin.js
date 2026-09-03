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
 * How negative the margin has to go before "these are not the same take" is a
 * true sentence.
 *
 * ── WHY THIS IS NOT ZERO (Tom's zzz session, 2026-09-03) ────────────────────
 *
 * The panel showed "The processed clip is 44 ms LONGER than the original. These
 * are not the same take." on the line "no voy a poder". It is the same take.
 * Measured on the two S3 objects, decoded to PCM rather than read off either
 * container: raw 5.240 s, processed 5.237 s. The processed clip is 3 ms
 * SHORTER. The 44 ms is entirely an artefact of asking a browser for the
 * duration of two files in two different codecs.
 *
 * The raw side is WebM/Opus written by MediaRecorder into a non-seekable sink,
 * so it carries no duration at all and the number here comes from the
 * seek-past-the-end trick, which resolves to the last frame's timestamp. The
 * processed side is CBR MP3 from LAME, and a browser that does not honour the
 * LAME gapless tag reports the padded frame count: encoder delay plus the
 * padding that fills the final 1152-sample frame, which at 48 kHz is up to
 * about 60 ms of phantom audio. Two codecs, two conventions, tens of
 * milliseconds of disagreement, on every take, for ever.
 *
 * So a small negative margin says NOTHING about whether the bytes match, and
 * saying it does destroys the recordist's trust in every other clip on the
 * page — which is the exact opposite of what this panel is for. A REAL
 * mismatch is not subtle: it is a different line, a different read, seconds
 * out. 1 second is twenty times the largest padding artefact possible here and
 * far under any genuine take-to-take difference.
 */
export const IMPOSSIBLE_MARGIN_MS = -1000

/**
 * Read the margin out of the two durations, in seconds.
 *
 * Returns null while either side is still unknown — the row says "…" rather
 * than asserting anything about a take it has not measured.
 */
export function marginVerdict(rawSec, processedSec) {
  if (typeof rawSec !== 'number' || typeof processedSec !== 'number') return null
  const marginMs = Math.round((rawSec - processedSec) * 1000)

  if (marginMs <= IMPOSSIBLE_MARGIN_MS) {
    // A full second longer than the thing it was made from. No codec padding
    // reaches this; the two files are not the same take.
    return {
      marginMs,
      state: 'impossible',
      text: `The processed clip is ${(-marginMs / 1000).toFixed(2)}s LONGER than the original. These are not the same take.`,
    }
  }
  if (marginMs < 0) {
    // Tens of milliseconds either way is the two codecs disagreeing about their
    // own length, not a difference in the audio. Say what is actually known:
    // the trim took nothing off, so this take had no room to spare.
    return {
      marginMs,
      state: 'tight',
      text: 'The trim took nothing off this take, so it has no room to spare at the ends. Leave a beat before you read and after you finish.',
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
