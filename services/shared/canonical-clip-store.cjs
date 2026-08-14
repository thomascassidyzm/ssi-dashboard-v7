/**
 * The canonical clip store — read side.
 *
 * Tom's ruling, 2026-08-14: every English pod line is THE SAME line and should
 * be rendered once and shared. `audio_clips` is where that is now true. It has
 * NO course_code column, so its identity — (text_key, language, role, voice_id)
 * — cannot express "this clip belongs to one course", which is what made the
 * estate render "Good morning. How are you?" thirty-five separate times.
 *
 * WHAT THIS FILE IS FOR, precisely: asking "does the estate already have this
 * clip?" before paying a TTS provider to make another one. That is the only
 * question it answers, and it answers it with ONE `.eq()`-shaped lookup on a
 * unique key — no course predicate, no candidate list, no JS-side fuzzy match.
 *
 * WHY THAT IS NOW POSSIBLE, when findSiblingCourseClip had to fetch 200 rows
 * and filter them in JS: course_audio holds several spellings of the same
 * identity (`eve` vs `xai_eve`, `en` vs `eng`, text_normalized with and without
 * a trailing '?'), so an exact match on one spelling could not see the others.
 * audio_clips stores the CANONICALISED key, computed by the same functions the
 * database uses, so there is exactly one spelling to ask for. The widening
 * belongs to the write, not to every read.
 *
 * The BACKSTOP is the database, not this file. `trg_course_audio_zz_clip_link`
 * links and byte-shares every INSERT into course_audio whether or not the
 * caller remembered to look here first. So a path that skips this module wastes
 * a render but cannot create a duplicate clip. This module is the money saver;
 * the trigger is the correctness guarantee.
 */

const { tryCanonicalLanguage, tryCanonicalVoiceId } = require('./clip-identity.cjs');

/**
 * The clip's canonical text key.
 *
 * Byte-identical to the SQL `audio_canon_text()`: lowercase, trim, collapse
 * internal whitespace, then strip ALL trailing terminal punctuation. The last
 * step is what folds the two historical conventions in
 * `course_audio.text_normalized` — rows written before ~March 2026 keep a
 * trailing '?', every row since has had it stripped by trg_course_audio_normalize
 * (154,257 stripped vs 5,305 kept, measured 2026-08-06). See
 * services/shared/text-normalize.cjs for the full history.
 *
 * Whitespace collapse is the one thing normalize_text() does NOT do and this
 * does; it is additive, so a key computed here is reachable in SQL and vice
 * versa only because audio_canon_text() applies the same collapse. Change one,
 * change both, or the store silently splits.
 */
function canonicalTextKey(text) {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.?!¿¡。？！]+$/, '');
}

/**
 * The full canonical identity, or null when any component cannot be resolved.
 *
 * Returning null rather than guessing is deliberate: `canonicalVoiceId` throws
 * for placeholders like 'legacy_import' and 'human', and `canonicalLanguage`
 * throws for 'auto'. A placeholder is not a voice and not a language. Guessing
 * one would link a learner-facing slot to audio chosen by a coin flip, so the
 * honest answer to "which canonical clip is this?" is "there isn't one" — the
 * caller then renders, exactly as it does today.
 */
function canonicalClipKey({ text, language, role, voiceId, provider } = {}) {
  const textKey = canonicalTextKey(text);
  const lang = tryCanonicalLanguage(language);
  const voice = tryCanonicalVoiceId(voiceId, provider ? { provider } : undefined);
  if (!textKey || !lang || !voice || !role) return null;
  return { text_key: textKey, language: lang, role, voice_id: voice };
}

/**
 * The estate's clip for this identity, or null.
 *
 * Never returns a `pending/%` row: audio_clips forbids them by CHECK constraint,
 * because canon means "these bytes exist" and a caller that reused a placeholder
 * would link a slot to silence.
 *
 * Throws on a query error rather than returning null. A swallowed error here
 * reads as "no clip exists" and costs a paid render at best; on the
 * human-recording path it can lose a take. Fail closed — the same rule
 * findAudioRowForClip already follows.
 */
async function findCanonicalClip(supabase, identity) {
  const key = canonicalClipKey(identity);
  if (!key) return null;

  const { data, error } = await supabase
    .from('audio_clips')
    .select('id, s3_key, duration_ms, file_size_bytes, word_boundaries, origin, text, audio_revision')
    .eq('text_key', key.text_key)
    .eq('language', key.language)
    .eq('role', key.role)
    .eq('voice_id', key.voice_id)
    .maybeSingle();

  if (error) throw new Error(`canonical clip lookup failed: ${error.message}`);
  return data || null;
}

module.exports = { canonicalTextKey, canonicalClipKey, findCanonicalClip };
