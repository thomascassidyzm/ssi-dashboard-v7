/**
 * THE LANGUAGE STEER A RENDER SENDS — for the side of the course it is on.
 *
 * Cartesia's `locale` (and xAI's `language`) is a BCP-47 tag, and until now
 * every course-audio call site computed it as `toBcp47(course.target_lang)`.
 * `courses.target_lang` carries the BASE tag for every regional course on the
 * estate — deu_at_for_eng is 'deu', spa_mx_for_eng is 'spa' — so an Austrian
 * German course asked Cartesia for plain German and got plain German phonology
 * behind a row that looked entirely correct. The steer is the ONLY Austrian
 * thing such a request can carry: Cartesia's German catalogue holds 33 voices
 * and not one of them is Austrian (audition, 2026-09-10).
 *
 * Dialects are their own languages in this product — Tom's ruling, 2026-08-31,
 * stated as a definition in services/shared/cast-language-key.cjs — and that
 * module already answers "which language entity is this course's target?" from
 * the two columns that STATE it (`voice_pool_key`, `dialect`), never from the
 * course code. This is that same answer, spelled for a TTS vendor.
 *
 * KNOWN-SIDE ROLES ARE DELIBERATELY UNTOUCHED. `known`, `presentation`,
 * `instruction` and `encouragement` keep `toBcp47(language)` byte for byte:
 * their language already arrives as the course's own known_lang, and the two
 * known-side dialect statements in the estate ('cym_north' and friends) have
 * no BCP-47 region to spell, so widening this to them would change nothing but
 * the number of things that could go wrong.
 */

'use strict';

const { toBcp47 } = require('../voice-discovery-service.cjs');
const { targetCastKey } = require('./cast-language-key.cjs');

/** The roles that speak the language the course TEACHES. */
const TARGET_ROLES = Object.freeze(new Set(['target1', 'target2']));

/**
 * @param {object} course a courses row (needs target_lang, voice_pool_key, dialect)
 * @param {string} role   'target1' | 'target2' | 'known' | 'presentation' | …
 * @param {string} language the language the call site already resolved for the role
 * @returns {string} a BCP-47 tag, e.g. 'de-AT' for deu_at_for_eng/target1
 */
function ttsLocaleForRole(course, role, language) {
  if (!TARGET_ROLES.has(role)) return toBcp47(language);
  return toBcp47(targetCastKey(course) || language);
}

module.exports = { ttsLocaleForRole, TARGET_ROLES };
