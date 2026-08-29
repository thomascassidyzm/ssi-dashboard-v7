/**
 * LANGUAGE VOICE CAST — who speaks a role, decided at the LANGUAGE, not the course.
 *
 * Tom's ruling, 2026-08-29: voice casting moves to the language. A course
 * inherits its voices from the language it teaches; a per-course voice block is
 * a copy of that decision made 94 times, and the estate has been maintaining
 * all 94 copies by hand.
 *
 * The casting SCREEN already existed (services/voicelab/*, table
 * voice_language_roles, landed 2026-08-28). What did not exist was any READER
 * on the render path — the cast was a decision nothing consulted. This module
 * is that reader, and the only one: it answers exactly one question,
 *
 *     for this course, this role, which voice and which provider?
 *
 * and it is deliberately small enough to reason about without opening phase8.
 *
 * ── PRECEDENCE, AND WHY IT HAS THREE LEGS RATHER THAN TWO ───────────────────
 *
 *   1. EXPLICIT COURSE OVERRIDE  — a human has said "not this language's cast,
 *                                  THIS voice, for this course".
 *   2. LANGUAGE CAST             — voice_language_roles, rank 0 (primary),
 *                                  falling to rank 1 (backup) only when the
 *                                  primary's voice row is missing or inactive.
 *   3. THE COURSE'S STORED voice_config — exactly as today.
 *
 * Leg 3 is what keeps this change safe. voice_language_roles held ZERO rows
 * when this was written and 94 courses carry a real stored voice block; a
 * strict two-tier "language cast wins, else nothing" rule would have changed
 * what every render in the estate decides, overnight, in nobody's favour. So
 * the invariant is stated plainly and tested:
 *
 *     WITH NO CAST ROWS FOR A ROLE'S LANGUAGE, RESOLUTION IS THE STORED
 *     CONFIG, UNCHANGED, BYTE FOR BYTE.
 *
 * ── WHAT AN "EXPLICIT OVERRIDE" IS ──────────────────────────────────────────
 * A deliberate marker a human sets, NEVER the mere presence of a legacy config
 * — every course has one of those, so treating it as an override would make
 * leg 2 unreachable forever. Two spellings, both meaning "leave this alone":
 *   voice_config.overrideLanguageCast === true            (whole course)
 *   voice_config.voices.<role>.overrideLanguageCast === true  (one role)
 * Absent by default. Nothing in the estate sets it today; it exists so that a
 * course which genuinely wants its own voice can say so out loud.
 *
 * ── WHAT THIS MODULE DOES NOT DECIDE ────────────────────────────────────────
 * The PROVIDER ladder is still services/shared/tts-provider-policy.cjs
 * (human > Cartesia > Azure, never xAI) and voice-id canonicalisation is still
 * services/shared/clip-identity.cjs. The cast decides WHO speaks; the ladder
 * still decides on WHICH provider, downstream in buildTTSConfig. There is no
 * second canonicaliser here and no bypass of the ladder.
 */

const { tryCanonicalVoiceId } = require('./clip-identity.cjs');
const { voiceSpellings } = require('./clip-identity-lookup.cjs');

/**
 * The roles the language cast speaks for.
 *
 * `presentation` is DELIBERATELY EXCLUDED. It is the intro / clone voice — the
 * course's own presenter, not a specimen of the target language — and
 * services/audio-reuse-planner.cjs already treats intros as never-borrowed.
 * Casting it per language would swap Tom's clone for a stock voice on every
 * course that teaches English. Its per-course config is left untouched.
 *
 * This is a DEFAULT chosen on 2026-08-29, not a ruling from Tom: one word from
 * him moves `presentation` into this list.
 */
const CAST_ROLES = Object.freeze(['known', 'target1', 'target2', 'instruction', 'encouragement']);

/**
 * ── THE GUIDE ROLES ─────────────────────────────────────────────────────────
 *
 * Tom, 2026-08-29:
 *   "the instructions and the encouragements - are currently mostly done in
 *    Aran's Eleven Labs voice … these are not linked to a course per se - they
 *    are linked to every course with the same known language, because these are
 *    messages to the learner, encouragements and so on"
 *
 * So these two are a THIRD kind of audio. Not the material being taught, not
 * the same phrases in the other role — the app talking to the learner. They
 * resolve against the KNOWN language (phase8-audio-v13 already maps them there)
 * and against the GUIDE slot of the cast, which is ONE voice per language
 * rather than a male/female pair: Aran speaks to every English-known learner
 * across every course.
 *
 * Because a guide is one voice, gender plays no part in resolving it. The
 * `gender` on a guide row records the voice's own gender as a fact and is
 * ignored here; the lowest-rank ACTIVE guide row for the language wins.
 *
 * THE PROVIDER, WHICH IS THE TRAP. Every guide voice in the estate today is
 * ElevenLabs, and tts-provider-policy.cjs never reaches ElevenLabs
 * automatically because it is expensive. That is correct and untouched. A CAST
 * guide voice is not automatic — it is a human clicking a name on a screen —
 * and it arrives at the ladder as `configuredProvider`, which selectProvider
 * already honours at rung 4 with the reason "stored config is a deliberate
 * choice, not an automatic fallback". So Aran stays Aran. Nothing here weakens
 * the ladder; it does not have to, because the distinction already exists.
 */
const GUIDE_ROLES = Object.freeze(new Set(['instruction', 'encouragement']));

/** Is this role spoken by the guide, rather than by a phrase voice? */
function isGuideRole(role) { return GUIDE_ROLES.has(role); }

/**
 * Which casting slot a role reads from. A row with no `slot` is a PHRASE row:
 * the column landed on 2026-08-29 with a 'phrase' default, and reading a
 * missing value as anything else would let an old row silently become a guide.
 */
function slotForRole(role) { return isGuideRole(role) ? 'guide' : 'phrase'; }
function slotOfRow(r) { return r.slot || 'phrase'; }

/**
 * Which language a role speaks. `known` speaks the course's known_lang;
 * target1/target2 speak its target_lang. Nothing else is inferred.
 */
function languageForRole(role, course) {
  if (!course) return null;
  // `known`, and both guide roles, speak the course's KNOWN language.
  // Instructions and encouragements are messages TO the learner, so they are
  // spoken in the language the learner already has — which is exactly the
  // mapping phase8-audio-v13 already makes for those two roles.
  const knownSide = role === 'known' || isGuideRole(role);
  const v = knownSide ? course.known_lang : course.target_lang;
  return v ? String(v).trim() : null;
}

/**
 * Gender fallback when the course has no configured voice to read one from.
 *
 * DEFAULT chosen 2026-08-29, flagged for Tom rather than ruled by him. Only
 * reached for a role with no usable stored voice — which is the minority case,
 * because the point of the rule below is that an existing course KEEPS THE
 * GENDER IT ALREADY HAS.
 */
const DEFAULT_GENDER = Object.freeze({ target1: 'f', target2: 'm', known: 'f' });

/**
 * The gender the cast should be read at, for one role.
 *
 * Prefer the truth already in the data: look the course's currently-configured
 * voice up in `voices` and use ITS gender. A course whose target1 is a male
 * voice today gets the language's male primary, not a silent gender flip on the
 * next re-render. Only where there is no configured voice, or its row carries no
 * gender, does DEFAULT_GENDER apply.
 */
function genderForRole(role, roleConfig, voiceGenderById) {
  const id = roleConfig && (roleConfig.voiceId || roleConfig.voice_id);
  if (id && voiceGenderById) {
    for (const spelling of voiceSpellings(id, { provider: roleConfig.provider })) {
      const g = voiceGenderById.get(spelling);
      if (g === 'm' || g === 'f') return g;
    }
  }
  return DEFAULT_GENDER[role] || 'f';
}

/** Has a human said "this course keeps its own voice for this role"? */
function isOverridden(voiceConfig, role) {
  if (!voiceConfig) return false;
  if (voiceConfig.overrideLanguageCast === true) return true;
  const r = voiceConfig.voices && voiceConfig.voices[role];
  return Boolean(r && r.overrideLanguageCast === true);
}

/**
 * Pick the voice for one (language, gender) out of the cast.
 *
 * Rank 0 is the primary and wins. Rank 1 (the backup) is consulted ONLY when
 * the primary is unusable — its `voices` row has gone, or is_active is false.
 * That is the whole reason Tom asked for backups: "in case for whatever reason
 * there's a problem". A backup is never preferred over a working primary.
 */
function pickCastVoice(roles, voiceById, language, gender, slot = 'phrase') {
  const slots = roles
    .filter((r) => slotOfRow(r) === slot)
    .filter((r) => r.language === language)
    // A GUIDE is one voice per language, so gender is not part of the key and
    // is deliberately not matched on. A PHRASE slot is a male/female pair, so
    // it is.
    .filter((r) => slot === 'guide' || r.gender === gender)
    .sort((a, b) => a.rank - b.rank);
  for (const slot of slots) {
    const voice = voiceById.get(slot.voice_id);
    if (!voice) continue;                    // voice row gone — try the backup
    if (voice.is_active === false) continue; // deactivated — try the backup
    return { voice, rank: slot.rank };
  }
  return null;
}

/**
 * The provider a cast voice renders on, read from the voice row itself and
 * then handed to the ladder downstream as `configuredProvider` — exactly the
 * shape a stored voice_config role carries, so nothing further along can tell
 * a cast voice from a configured one.
 */
function providerOfVoice(voice) {
  const engine = String(voice.tts_engine || '').trim().toLowerCase();
  if (engine) return engine;
  const canon = tryCanonicalVoiceId(voice.voice_id);
  return canon ? canon.split('_')[0] : null;
}

/**
 * Overlay the language cast onto a course's stored voice config.
 *
 * PURE: no database, no I/O. The caller supplies the cast rows and the voices
 * registry, which is what makes this testable without a Supabase connection —
 * and what makes the "zero cast rows changes nothing" invariant a unit test
 * rather than a hope.
 *
 * @param {object}   args
 * @param {object}   args.voiceConfig  the course's stored config (as loaded)
 * @param {object}   args.course       { course_code, known_lang, target_lang }
 * @param {object[]} args.roles        voice_language_roles rows
 * @param {object[]} args.voices       voices rows (voice_id, gender, tts_engine, is_active, display_name, languages)
 * @returns {{ config: object, decisions: object[] }}
 *   `config` is the same object when nothing was cast — reference equality is
 *   the cheapest possible proof of "no behaviour change", and callers may rely
 *   on it. `decisions` explains every role, including the ones left alone, so a
 *   render log can say WHY it chose what it chose.
 */
function applyLanguageCast({ voiceConfig, course, roles = [], voices = [] }) {
  const decisions = [];
  if (!voiceConfig || !voiceConfig.voices || !course) {
    return { config: voiceConfig, decisions };
  }

  const voiceById = new Map();
  const voiceGenderById = new Map();
  for (const v of voices) {
    voiceById.set(v.voice_id, v);
    for (const spelling of voiceSpellings(v.voice_id)) {
      if (v.gender && !voiceGenderById.has(spelling)) voiceGenderById.set(spelling, v.gender);
    }
  }

  let next = null;
  for (const role of CAST_ROLES) {
    const roleConfig = voiceConfig.voices[role];
    if (!roleConfig) { decisions.push({ role, source: 'absent' }); continue; }

    if (isOverridden(voiceConfig, role)) {
      decisions.push({ role, source: 'course-override', voiceId: roleConfig.voiceId });
      continue;
    }

    const language = languageForRole(role, course);
    if (!language) { decisions.push({ role, source: 'stored', reason: 'no language on course' }); continue; }

    const slot = slotForRole(role);
    // A guide has no gender axis; reading one would be inventing a key.
    const gender = slot === 'guide' ? null : genderForRole(role, roleConfig, voiceGenderById);
    const cast = pickCastVoice(roles, voiceById, language, gender, slot);
    if (!cast) {
      decisions.push({ role, source: 'stored', slot, language, gender, reason: 'nothing cast' });
      continue;
    }

    // The cast names the same voice the course already stores — say so, and
    // leave the stored object alone so its per-voice settings survive intact.
    if (voiceSpellings(roleConfig.voiceId, { provider: roleConfig.provider }).includes(cast.voice.voice_id)) {
      decisions.push({ role, source: 'cast-same', slot, language, gender, rank: cast.rank, voiceId: roleConfig.voiceId });
      continue;
    }

    if (!next) next = { ...voiceConfig, voices: { ...voiceConfig.voices } };
    next.voices[role] = {
      ...roleConfig,
      voiceId: cast.voice.voice_id,
      provider: providerOfVoice(cast.voice) || roleConfig.provider,
      name: cast.voice.display_name || cast.voice.human_name || cast.voice.voice_id,
      // The stored `settings.speed` is a correction for the pace of the voice
      // being REPLACED, so it does not travel with the slot. A new voice starts
      // at its own natural pace; a correction for it is a per-voice fact to be
      // set again, not inherited from a stranger.
      settings: { ...(roleConfig.settings || {}), speed: 1.0 },
      castFrom: { slot, language, gender, rank: cast.rank },
    };
    decisions.push({
      role, source: 'language-cast', slot, language, gender, rank: cast.rank,
      voiceId: cast.voice.voice_id, replaced: roleConfig.voiceId || null,
    });
  }

  return { config: next || voiceConfig, decisions };
}

module.exports = {
  applyLanguageCast,
  languageForRole,
  genderForRole,
  isOverridden,
  pickCastVoice,
  providerOfVoice,
  isGuideRole,
  slotForRole,
  CAST_ROLES,
  GUIDE_ROLES,
  DEFAULT_GENDER,
};
