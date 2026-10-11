'use strict';
/**
 * The curated synthesiser stage directions: silent markers the voice acts on
 * rather than speaks ("Ja, [pause] natuurlijk."). ONE list, read by both the TTS
 * door (tts-service assertSpeakableExample must not refuse them as labels) and
 * audio-veracity (strips them before comparing words). Any other [ ] { } is a
 * label and stays refused. Add a cue here deliberately, never as a bracket rule.
 */
const SYNTHESIS_CUES = [
  /\[pause\]/gi,
  /\[break\]/gi,
  /<break\b[^>\[\]{}]*\/?>/gi,
];

function stripSynthesisCues(text) {
  let out = String(text == null ? '' : text);
  for (const re of SYNTHESIS_CUES) out = out.replace(re, ' ');
  return out.replace(/\s+/g, ' ').trim();
}

module.exports = { SYNTHESIS_CUES, stripSynthesisCues };
