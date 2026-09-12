/**
 * pod-jump-in-rule.cjs — THE rule for `listening_pod_sentences.jump_in`, stated once.
 *
 * Tom, 2026-09-12, listening to the Italian method pod on staging: "The changeovers
 * between speakers need to be different depending on whether the speakers are
 * jumping in — in which there should be no gap, in fact it should be overlap if
 * possible … Whereas genuine turn taking — asking or answering questions etc. —
 * should be as they are now, with whatever gap they currently have. So it's more
 * like a proper conversation."
 *
 * Three readers of this file, and they must agree:
 *   - the pod dialogue generator's prompt (services/pod-generation-prompt.cjs)
 *     emits the marker as it writes new dialogue;
 *   - the back-catalogue annotator (tools/pods/annotate-jump-in.cjs) sets it on
 *     lines that were written before the marker existed;
 *   - the player (ssi-learning-app, job #470) reads `jumpIn` and drops the gap.
 *
 * The marker is about DELIVERY, never about the words: nothing here may change what
 * a line says.
 */

/** One paragraph, pasted verbatim into every prompt that decides the marker. */
const JUMP_IN_RULE = `JUMP-IN MARKER ("jump_in", true or false, on every line). A line JUMPS IN when the speaker cuts into the previous speaker's flow rather than waiting for their turn: the two lines should play with no gap (overlapping if the player can). Mark jump_in TRUE when the line reacts mid-flow or overlaps — a backchannel or agreement fired while the other is still talking ("sì sì", "mm, right, right"); a surprised or emphatic interjection cutting in ("davvero?", "no!", "exactly!"); or the speaker finishing, completing or capping the other's unfinished sentence (the previous line trails off with "…" or "—" and this line supplies the rest). Mark jump_in FALSE for genuine turn-taking — the previous speaker has finished and this speaker takes the floor: an answer to a question ("Where are you from?" → "I'm from Manchester."); a reply to a completed statement ("I think we should leave now." → "Okay, let me get my coat."); or a new question or topic after the other has come to a full stop ("That was lovely, thank you." → "So, what are you doing tomorrow?"). The first line of a scene is always FALSE. Judge from the WORDS and their punctuation only — trailing "…" or "—" on the previous line, a leading "…" or "—" on this one, a bare reaction word — never from a hunch; when a line could be either, it is FALSE. The marker changes only how the audio is scheduled, never the text: do not alter, shorten or rephrase any line to fit it.`

/** The DB column's three states: true, false, or NULL (never annotated). Anything
 *  a model or a request body sends that is not literally true/false collapses to
 *  null, so a stray "yes" can never become a jump-in. */
function normaliseJumpIn(value) {
  if (value === true || value === false) return value
  if (value === 'true') return true
  if (value === 'false') return false
  return null
}

/** What the player reads. Only a literal true is a jump-in; NULL and false both
 *  play as a genuine turn, exactly as every line did before the marker existed. */
function jumpInForPayload(row) {
  return row && row.jump_in === true
}

/** The contract the player is built against (job #470): every pod line object
 *  carries `jumpIn: boolean`. The raw column rides along for the pod page's toggle. */
function withJumpIn(row) {
  return { ...row, jumpIn: jumpInForPayload(row) }
}

module.exports = { JUMP_IN_RULE, normaliseJumpIn, jumpInForPayload, withJumpIn }
