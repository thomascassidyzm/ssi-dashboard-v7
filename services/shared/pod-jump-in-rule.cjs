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

/** THE TEXT DECIDES FIRST (Tom, 2026-09-12 21:59Z: "the dialogue text ALREADY encodes
 *  interruptions — the interrupted line is written to stop abruptly"). A line whose
 *  previous line ends cut off — trailing em-dash or ellipsis, closing quote marks
 *  allowed after it — IS a jump-in, deterministically, before any model is asked.
 *  A line that itself opens with an em-dash is the speaker resuming a sentence they
 *  were cut off from, which is the same no-gap changeover. A LEADING ellipsis is the
 *  opposite: a beat before speaking, a hesitation, never a cue. */
const TRAILING_CUT = /[—…]\s*[»"”'’)]*\s*$/u
const LEADING_RESUME = /^\s*[«"“'‘(]*\s*—/u

function endsInterrupted(text) { return TRAILING_CUT.test(String(text || '')) }
function startsResumed(text) { return LEADING_RESUME.test(String(text || '')) }

/** Deterministic first pass: true when the text marks the changeover; null when the
 *  text is silent and a judgement is needed. Never false — silence is not a verdict. */
function deterministicJumpIn(prevText, text) {
  if (prevText == null) return false
  if (endsInterrupted(prevText) || startsResumed(text)) return true
  return null
}

/** One paragraph, pasted verbatim into every prompt that decides the marker. The
 *  model only ever ADDS jump-ins the text does not mark (backchannels); the text rule
 *  above is applied in code before and after it. */
const JUMP_IN_RULE = `JUMP-IN MARKER ("jump_in", true or false, on every line). A line JUMPS IN when the speaker cuts into the previous speaker's flow rather than waiting for their turn: the two lines should play with no gap (overlapping if the player can). The TEXT decides first: if the previous line ends cut off — a trailing "—" or "…" — this line is jump_in TRUE, always (it completes, caps or reacts to an unfinished sentence: "Oggi abbiamo—" → "Il futuro dell'istruzione?"; "the third thing is that when you actually—" → "—go and use it"; "Dovrebbero proprio trovare un…" → "Dovrebbero proprio."). A line that itself opens with "—" is the speaker resuming their own cut-off sentence and is also TRUE. Beyond that, mark TRUE only for a genuine backchannel the text does not mark: a short agreement or reaction of a few words fired while the other is plainly still mid-flow ("sì sì", "mm, right, right"; "davvero?" cutting into a story; "esatto!" over the end of an explanation). Mark FALSE for genuine turn-taking — the previous speaker has come to a full stop and this speaker takes the floor: an answer to a question ("Where are you from?" → "I'm from Manchester."); a reply to a completed statement ("I think we should leave now." → "Okay, let me get my coat."); a new question or topic after a full stop ("That was lovely, thank you." → "So, what are you doing tomorrow?"). An echo-question that then gets answered ("Non lo so." → "Non lo sai?") is a turn, not a jump-in. A LEADING "…" on this line is a pause before speaking, not a cue — it is FALSE unless the previous line was cut off. The first line of a scene is always FALSE. When a line could be either, it is FALSE. The marker changes only how the audio is scheduled, never the text: do not alter, shorten or rephrase any line to fit it.`

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

module.exports = { JUMP_IN_RULE, normaliseJumpIn, jumpInForPayload, withJumpIn, endsInterrupted, startsResumed, deterministicJumpIn }
