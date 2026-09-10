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
const { humanRolesForCourse } = require('./human-recorded-roles.cjs');
const { castKeyForCourse } = require('./cast-language-key.cjs');

/**
 * The roles the language cast speaks for.
 *
 * `presentation` JOINED THIS LIST ON 2026-09-10, on Tom's word. It was excluded
 * as a DEFAULT on 2026-08-29 with the note "one word from him moves it into
 * CAST_ROLES", and the word was said: asked "want me to put the clone into the
 * casting table as the English presentation voice? Then the principle stands
 * and nothing touches your voice", he answered "yes".
 *
 * The exclusion was protecting the right thing for the wrong reason. The danger
 * — swapping Tom's clone for a stock voice on every English-teaching course —
 * came from the TABLE not holding his clone, not from the rule. His clone is a
 * person, not a language slot, so Voice Lab's "two standard voices per
 * language" shape never had a place to put it. It has one now: the
 * PRESENTATION slot below, cast against the KNOWN language, one voice per
 * language, holding cartesia_8fef4d59-… for 'eng'. Obeying the table and
 * keeping Tom's voice stopped being opposites when the row was written.
 */
const CAST_ROLES = Object.freeze(['known', 'target1', 'target2', 'instruction', 'encouragement', 'presentation']);

/**
 * The roles the language cast deliberately does NOT speak for, each with the
 * reason out loud.
 *
 * EMPTY since 2026-09-10, when `presentation` — its only ever entry — moved
 * into CAST_ROLES. Empty is not the same as gone: the pairing is what carries
 * the meaning. CAST_ROLES and this object must TOGETHER cover every role a
 * course's voice_config can carry, and must not overlap, so a role added to
 * the config with no entry on either side fails
 * services/shared/voice-resolution-surfaces.test.cjs. That is the only way a
 * future role gets a decision made about it rather than a default — which is
 * exactly how `presentation` was excluded by ACCIDENT (by absence from an
 * array) until 2026-09-07.
 */
const EXCLUDED_ROLES = Object.freeze({});

/** Is this role deliberately outside the language cast? @returns {string|null} the reason */
function exclusionReason(role) {
  return Object.prototype.hasOwnProperty.call(EXCLUDED_ROLES, role) ? EXCLUDED_ROLES[role] : null;
}

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
 * ── THE PRESENTATION SLOT (Tom, 2026-09-10) ─────────────────────────────────
 *
 * The intro voice — the one that says "French for 'I want' is:" — is KNOWN
 * language audio, not target-language audio, so it takes the GUIDE's shape and
 * not the phrase pair's:
 *
 *   • cast against the course's KNOWN language, because the narrator speaks to
 *     the learner in the language the learner already has. Casting it against
 *     the TARGET would be a category error and would put a stock French voice
 *     on fra_for_eng's English intros;
 *   • ONE voice per language, not a male/female pair — Tom's clone narrates
 *     every English-known course, so there is nothing for a gender axis to
 *     choose between;
 *   • and, like the guide, it NEVER counts toward a language's completeness
 *     (services/voicelab/registry.cjs): only about twelve of the estate's
 *     sixty-eight languages are ever a known language, so counting it would
 *     turn every other row amber and stop the screen saying anything.
 *
 * It is its own slot rather than a second guide role because a guide is the
 * app talking to the learner and a presentation is the course's narrator: two
 * decisions Kai must be able to make separately, on one screen, per language.
 */
const PRESENTATION_ROLES = Object.freeze(new Set(['presentation']));

/** Is this role spoken by the course's narrator? */
function isPresentationRole(role) { return PRESENTATION_ROLES.has(role); }

/**
 * Which casting slot a role reads from. A row with no `slot` is a PHRASE row:
 * the column landed on 2026-08-29 with a 'phrase' default, and reading a
 * missing value as anything else would let an old row silently become a guide.
 */
function slotForRole(role) {
  if (isGuideRole(role)) return 'guide';
  if (isPresentationRole(role)) return 'presentation';
  return 'phrase';
}
function slotOfRow(r) { return r.slot || 'phrase'; }

/**
 * Slots that hold ONE voice per language rather than a male/female pair, and
 * therefore have no gender axis to resolve on. Asked in one place so the
 * registry, the router and this resolver cannot disagree about which slots are
 * single.
 */
const SINGLE_VOICE_SLOTS = Object.freeze(new Set(['guide', 'presentation']));
function isSingleVoiceSlot(slot) { return SINGLE_VOICE_SLOTS.has(slot); }

/**
 * Which language a role speaks — as a CAST ENTITY, not as a base tag.
 *
 * `known`, and both guide roles, speak the course's KNOWN language.
 * Instructions and encouragements are messages TO the learner, so they are
 * spoken in the language the learner already has — which is exactly the
 * mapping phase8-audio-v13 already makes for those two roles.
 *
 * ── DIALECTS ARE LANGUAGES (Tom, 2026-08-31) ────────────────────────────────
 * This used to read `course.target_lang` directly, and target_lang carries the
 * BASE tag for every regional course — deu_at_for_eng is 'deu', spa_mx_for_eng
 * is 'spa'. One cast on 'deu' therefore reached the Austrian and Swiss courses
 * too, which Tom has ruled a defect rather than a deferred feature. The key now
 * comes from services/shared/cast-language-key.cjs, which reads the two columns
 * that STATE a course's regional identity and never guesses from a course code.
 *
 * A course that states nothing regional still keys on its base language, so
 * nothing about a non-dialect course changes — and a course whose dialect is
 * stated in neither column keys on its base too, which is the pre-existing
 * behaviour and is reported as a data gap rather than papered over here.
 */
function languageForRole(role, course) {
  if (!course) return null;
  const knownSide = role === 'known' || isGuideRole(role) || isPresentationRole(role);
  return castKeyForCourse(course, knownSide ? 'known' : 'target');
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
    // A GUIDE or a PRESENTATION is one voice per language, so gender is not
    // part of the key and is deliberately not matched on. A PHRASE slot is a
    // male/female pair, so it is.
    .filter((r) => isSingleVoiceSlot(slot) || r.gender === gender)
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
function applyLanguageCast({ voiceConfig, course, roles = [], voices = [], humanRows = [] }) {
  const decisions = [];
  if (!course) return { config: voiceConfig, decisions };

  // A course with NO stored voices block is not a course with no voices — it is
  // a course the cast has never been able to reach. 56 of the estate's 150
  // courses were in exactly that state on 2026-08-31, and the old early return
  // meant a language cast silently skipped every one of them. Reading a missing
  // block as an EMPTY one costs nothing when nothing is cast (the caller
  // returns before it gets here) and lets the cast seed the roles it names.
  const stored = (voiceConfig && voiceConfig.voices) ? voiceConfig : { ...(voiceConfig || {}), voices: {} };

  // ── THE HUMAN-VOICE GUARD (Tom's ruling, 2026-08-31) ─────────────────────
  // A slot that holds a real recording is not a casting slot. This is computed
  // from the STORED config, never from `stored`-with-cast-applied, because the
  // recording splicer reads the stored config too — that is the whole point of
  // keeping the two in agreement. It is a STOP, taken before the override check
  // and before anything else: a human recording is not a preference to be
  // outranked, and there is no runtime bypass, exactly as
  // human-voice-courses.cjs has none.
  const humanRoles = humanRolesForCourse({
    course, voiceConfig: stored, humanRows, roles: CAST_ROLES,
  });

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
    // An ABSENT role is a candidate for the cast, not a reason to skip it.
    // NOTHING in the estate carries an `instruction` or `encouragement` block
    // (0 of 150 courses, checked 2026-08-31), so treating absence as "leave
    // alone" made every GUIDE cast a write that no render could ever read —
    // the exact slot Tom named as empty. An absent role with nothing cast for
    // it still reports 'absent' and still changes nothing.
    const roleConfig = stored.voices[role] || null;

    const human = humanRoles.get(role);
    if (human) {
      decisions.push({
        role,
        source: 'human-recorded',
        humanSource: human.source,
        reason: human.reason,
        clips: human.clips,
        voiceId: (roleConfig && roleConfig.voiceId) || human.voiceId || null,
      });
      continue;
    }

    if (isOverridden(stored, role)) {
      decisions.push({ role, source: 'course-override', voiceId: (roleConfig && roleConfig.voiceId) || null });
      continue;
    }

    const language = languageForRole(role, course);
    if (!language) { decisions.push({ role, source: 'stored', reason: 'no language on course' }); continue; }

    const slot = slotForRole(role);
    // A single-voice slot has no gender axis; reading one would be inventing a key.
    const gender = isSingleVoiceSlot(slot) ? null : genderForRole(role, roleConfig, voiceGenderById);
    const cast = pickCastVoice(roles, voiceById, language, gender, slot);
    if (!cast) {
      decisions.push({
        role, slot, language, gender,
        source: roleConfig ? 'stored' : 'absent',
        reason: 'nothing cast',
      });
      continue;
    }

    // The cast names the same voice the course already stores — say so, and
    // leave the stored object alone so its per-voice settings survive intact.
    if (roleConfig && voiceSpellings(roleConfig.voiceId, { provider: roleConfig.provider }).includes(cast.voice.voice_id)) {
      decisions.push({ role, source: 'cast-same', slot, language, gender, rank: cast.rank, voiceId: roleConfig.voiceId });
      continue;
    }

    if (!next) next = { ...stored, voices: { ...stored.voices } };
    next.voices[role] = {
      ...(roleConfig || {}),
      voiceId: cast.voice.voice_id,
      provider: providerOfVoice(cast.voice) || (roleConfig && roleConfig.provider) || null,
      name: cast.voice.display_name || cast.voice.human_name || cast.voice.voice_id,
      // The stored `settings.speed` is a correction for the pace of the voice
      // being REPLACED, so it does not travel with the slot. A new voice starts
      // at its own natural pace; a correction for it is a per-voice fact to be
      // set again, not inherited from a stranger.
      settings: { ...((roleConfig && roleConfig.settings) || {}), speed: 1.0 },
      castFrom: { slot, language, gender, rank: cast.rank },
    };
    decisions.push({
      role, source: 'language-cast', slot, language, gender, rank: cast.rank,
      voiceId: cast.voice.voice_id, replaced: (roleConfig && roleConfig.voiceId) || null,
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
  isPresentationRole,
  isSingleVoiceSlot,
  slotForRole,
  CAST_ROLES,
  EXCLUDED_ROLES,
  exclusionReason,
  GUIDE_ROLES,
  PRESENTATION_ROLES,
  SINGLE_VOICE_SLOTS,
  DEFAULT_GENDER,
};
