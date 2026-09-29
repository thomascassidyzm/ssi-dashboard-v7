/**
 * The door context for /regenerate-phrase's renders and reuse lookups.
 *
 * A reviewer regenerates ONE role of a two-voice phrase (target1 = female,
 * target2 = male; the words are identical). The door answers any-voice by
 * default, so asking for the male take found the female clip of the same words,
 * and the handler filed that clip under the male voice — a female clip in the
 * male slot, then found by every later male lookup (seed 300 deu, ita S0403L03B01
 * and S0644L01U04, from 26 Sep). A slot is a VOICE: the lookup must be voice-bound.
 */
function phraseRenderDoor({ courseCode, role, replacing = [] }) {
  return { courseCode, intro: role === 'presentation', replacing, voiceBound: true }
}

/** lookupOpts for reuseSiblingIntoCourse on the same path. */
const PHRASE_REUSE_LOOKUP = Object.freeze({ voiceBound: true })

module.exports = { phraseRenderDoor, PHRASE_REUSE_LOOKUP }
