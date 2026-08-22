/**
 * READ-SIDE companion to clip-identity.cjs — which spellings a lookup must
 * reach while the estate is mid-conversion.
 *
 * clip-identity.cjs answers "what is the one correct spelling of this clip's
 * identity?" and the writers now use it, so everything written from here on is
 * canonical. But the 2.53M rows already in course_audio are NOT, and neither is
 * the `voices` registry (six voices sit there under both spellings). A read
 * that asks only for the canonical form during the transition finds nothing and
 * concludes the clip does not exist — which costs a paid re-render, or, on the
 * human-recording path, loses the prior take's s3_key and with it the
 * reversibility leg of make-before-break (CLAUDE.md §approval gates).
 *
 * So reads widen and writes narrow. `.in('voice_id', voiceSpellings(v))` finds
 * the clip under either spelling; the write that follows still stores exactly
 * one. This file exists so that "either spelling" is stated once rather than
 * reinvented per call site — the same mistake that produced the drift.
 *
 * WHY THERE IS NO languageSpellings(). The voice case is enumerable: a caller
 * holds one voice id and it has at most two plausible spellings, its own and
 * its canonical one. Language is not — 'eng' could be stored as 'en', 'en-GB',
 * 'en-US', 'eng' or 'auto', and guessing the set would either miss rows or
 * invent them. Language-side reads are still single-spelling and that is a
 * KNOWN REMAINING GAP, not an oversight; it needs the data-side reconciliation
 * (proposed, not executed, in
 * docs/architecture/audio-clip-identity-canonicalisation-2026-08-06.md).
 */

const { tryCanonicalVoiceId } = require('./clip-identity.cjs');

/**
 * Every spelling of `voiceId` a stored row might legitimately carry:
 *
 *   1. the canonical form      'azure_en-GB-SoniaNeural'
 *   2. the caller's own form   whatever they were handed
 *   3. the BARE provider form  'en-GB-SoniaNeural'
 *
 * deduped, canonical first so a caller taking `[0]` gets the clean one.
 *
 * (3) is not optional. The split is symmetric — 414,061 rows sit between
 * 'azure_en-GB-SoniaNeural' and 'en-GB-SoniaNeural' — so a caller who already
 * holds the canonical spelling needs the bare form for exactly the same reason
 * a caller holding the bare form needs the canonical one. Omitting it would
 * fix the lookup in one direction and leave the larger half unreachable.
 *
 * A composite is NOT stripped: 'comp:xai_leo' is a splice of two takes and its
 * payload is not an alternative spelling of it, so offering 'xai_leo' as a
 * synonym would match a plain single-voice render of the same text.
 *
 * Returns the raw value alone when it cannot be canonicalised — that is not a
 * silent fallback to a guess, it is the honest statement that the only spelling
 * we can name is the one we were handed.
 *
 * @param {string} voiceId
 * @param {object} [opts] passed to tryCanonicalVoiceId, e.g. { provider }
 * @returns {string[]} 1–3 spellings, empty only when voiceId is empty
 */
function voiceSpellings(voiceId, opts) {
  const raw = voiceId == null ? '' : String(voiceId).trim();
  const canonical = tryCanonicalVoiceId(voiceId, opts);

  let bare = null;
  if (canonical && !canonical.startsWith('comp:')) {
    const underscore = canonical.indexOf('_');
    if (underscore > 0) bare = canonical.slice(underscore + 1);
  }

  return [...new Set([canonical, raw, bare].filter(Boolean))];
}

module.exports = { voiceSpellings };
