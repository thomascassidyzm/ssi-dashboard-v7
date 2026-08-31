/**
 * HUMAN-RECORDED ROLES — which slots a language cast must not speak over.
 *
 * Tom's ruling, 2026-08-31: the Voice Lab must SAY, on screen and before the
 * tap, that a language has human-recorded courses, and a language-level
 * Cartesia cast must never silently override the per-course voice config those
 * recordings depend on. "A visible refusal beats a quiet one."
 *
 * ── WHY A LANGUAGE CAST CAN REACH A HUMAN RECORDING AT ALL ─────────────────
 *
 * Casting writes `voice_language_roles`, keyed by LANGUAGE. The reader
 * (services/shared/language-voice-cast.cjs) then overlays that decision onto
 * every course that teaches — or is taught from — that language, per role. But
 * the recording pipeline does not read the overlay: `resolveTakeVoiceId` in
 * services/recording-upload-helpers.cjs reads `courses.voice_config` straight
 * off the course row (production-api.cjs:5431), and stamps a human take with
 * the slot's voice only when that slot's provider is 'human'. So the cast and
 * the splicer resolve the same slot from two different places, and a cast is
 * the half nobody sees.
 *
 * ── THE THREE SIGNALS, AND WHY NO ONE OF THEM IS ENOUGH ────────────────────
 *
 * 1. POLICY — services/shared/human-voice-courses.cjs. Tom's standing rulings:
 *    cym_*, pdc_*, bre_for_fra are human-voiced, full stop. This is the only
 *    signal that covers WELSH, whose 40,704 human clips are stamped
 *    `legacy_import` / `human_aran_cym_n` and whose voice_config carries no
 *    'human' provider anywhere.
 *
 * 2. THE STORED CONFIG — `voice_config.voices.<role>.provider === 'human'`.
 *    This is the splicer's OWN test, so honouring it is what keeps cast and
 *    splicer agreeing. It covers deu_at_for_eng target2 (Sasha Wanasky) and
 *    fin_for_eng target1 (Kai) — two courses on no human-voice list at all.
 *
 * 3. THE MEASURED CLIPS — the `course_human_recorded_roles` view. The backstop
 *    for a slot that was recorded before anyone marked it: it counts
 *    course_audio rows with origin='human' per (course, role).
 *
 * ── WHY SIGNAL 3 IS PHRASE-ROLES-ONLY ──────────────────────────────────────
 *
 * The GUIDE roles (instruction, encouragement) are deliberately excluded from
 * the measured signal. Sixteen courses hold ~48 stock English instruction clips
 * each under the shared id `human_recording`; that is one stock set for the
 * known language, not a per-course recording project, and Tom's 2026-08-29
 * ruling is explicitly that the guide is cast once per known language. Letting
 * those stock clips protect the guide slot would make the guide cast reach
 * nothing at all — a guard that deletes the feature it guards. Their human
 * usage is already on screen (registry.guideVoicesInUse reports
 * `human_recording` by name and clip count, for exactly this reason), and
 * signals 1 and 2 still protect the guide slot of a genuinely human course:
 * cym_n_for_eng's instruction slot is protected because the whole COURSE is.
 *
 * Nothing here renders, writes or deletes. It answers one question — "is this
 * (course, role) a human recording?" — and the answer is additive: with no
 * human signal for a role, resolution is exactly what it was.
 */

const { isHumanVoiceCourse, isHumanVoiceLang } = require('./human-voice-courses.cjs');
const { castKeyForCourse, targetCastKey, baseLanguageOfCastKey } = require('./cast-language-key.cjs');

/**
 * The roles the recording splicer files per-course takes into, and therefore
 * the roles the MEASURED clip signal is allowed to protect. See the header for
 * why the guide roles are not in this set.
 */
const PHRASE_ROLES = Object.freeze(['known', 'target1', 'target2']);

/** The roles a human-voiced LANGUAGE (as opposed to course) speaks. */
const TARGET_ROLES = Object.freeze(['target1', 'target2']);

/**
 * Which language a role actually SPEAKS — as a CAST ENTITY.
 *
 * A deliberate twin of languageForRole() in language-voice-cast.cjs, which
 * cannot be imported here because that module imports this one. Both now defer
 * to cast-language-key.cjs, which imports neither, so the twin is one line and
 * the two CANNOT disagree — a test still asserts it on every role, because the
 * guard protecting the wrong slot is the failure that matters.
 *
 * This is what closes the hole the live probe found on 2026-08-31: nine courses
 * are taught FROM Welsh (eng_for_cym and friends), so their KNOWN side is
 * spoken in Welsh even though their target_lang is not. Protecting only the
 * target roles would have let a Cartesia cast on 'cym' put a synthetic Welsh
 * voice on every one of them — the exact thing Tom's 2026-08-13 ruling
 * ("Welsh is permanently excluded from every TTS render queue") forbids, and a
 * thing no course-code check could see.
 *
 * Dialects are their own languages here (Tom, 2026-08-31), so a Northern Welsh
 * course speaks 'cym_north'. The human-voice POLICY is a fact about the
 * language rather than about the region — Welsh is human-recorded whichever
 * Welsh it is — so the policy check below reads the base of whatever this
 * returns. Getting that the other way round would drop the guard off every
 * Welsh dialect course at once.
 */
const KNOWN_SIDE_ROLES = Object.freeze(['known', 'instruction', 'encouragement']);
function languageSpokenBy(role, course) {
  return castKeyForCourse(course, KNOWN_SIDE_ROLES.includes(role) ? 'known' : 'target');
}

/**
 * Which roles of one course are human-recorded, and why.
 *
 * PURE: no database. The caller supplies the course row, its stored config and
 * the view rows, which is what makes the guard a unit test rather than a hope.
 *
 * @param {object}   args
 * @param {object}   args.course       { course_code, target_lang, known_lang }
 * @param {object}   [args.voiceConfig] the course's STORED config
 * @param {object[]} [args.humanRows]   course_human_recorded_roles rows for any course
 * @param {string[]} [args.roles]       the roles to consider (the caller's cast roles)
 * @returns {Map<string, {source: string, reason: string, clips: number|null, voiceId: string|null}>}
 *          empty when nothing about this course is human-recorded
 */
function humanRolesForCourse({ course, voiceConfig = null, humanRows = [], roles = null }) {
  const out = new Map();
  if (!course || !course.course_code) return out;
  const code = course.course_code;
  const consider = roles || [...PHRASE_ROLES];

  const note = (role, entry) => { if (consider.includes(role) && !out.has(role)) out.set(role, entry); };

  // 1. POLICY — a human-voiced COURSE is human in every role it has.
  if (isHumanVoiceCourse(code)) {
    for (const role of consider) {
      note(role, {
        source: 'policy-course',
        reason: `${code} is human-recorded only (services/shared/human-voice-courses.cjs — Tom's standing ruling). No synthetic voice may be cast over any of its roles.`,
        clips: null, voiceId: null,
      });
    }
  } else {
    // A human-voiced LANGUAGE protects every role that SPEAKS it — which is
    // not the same set as "the target roles". See languageSpokenBy above.
    for (const role of consider) {
      const spoken = languageSpokenBy(role, course);
      // Human-voiced is a property of the LANGUAGE, not of the dialect.
      if (!isHumanVoiceLang(baseLanguageOfCastKey(spoken))) continue;
      note(role, {
        source: 'policy-language',
        reason: `${role} is spoken in ${spoken}, a human-recorded language (services/shared/human-voice-courses.cjs). No synthetic voice may be cast into it.`,
        clips: null, voiceId: null,
      });
    }
  }

  // 2. THE STORED CONFIG — the splicer's own test, honoured verbatim.
  const stored = (voiceConfig && voiceConfig.voices) || {};
  for (const [role, slot] of Object.entries(stored)) {
    if (!slot || slot.provider !== 'human' || !slot.voiceId) continue;
    note(role, {
      source: 'stored-human-slot',
      reason: `${code} stores ${role} as a human voice (${slot.voiceId}). The recording splicer resolves this slot from the stored config, so a language cast over it would make the cast and the splicer disagree.`,
      clips: null, voiceId: slot.voiceId,
    });
  }

  // 3. THE MEASURED CLIPS — phrase roles only.
  for (const row of humanRows) {
    if (row.course_code !== code) continue;
    if (!PHRASE_ROLES.includes(row.role)) continue;
    const clips = Number(row.clips) || 0;
    if (clips <= 0) continue;
    note(row.role, {
      source: 'recorded-clips',
      reason: `${code} already has ${clips.toLocaleString('en-GB')} human ${row.role} recording${clips === 1 ? '' : 's'}${row.a_voice_id ? ` (${row.a_voice_id})` : ''}.`,
      clips, voiceId: row.a_voice_id || null,
    });
  }

  return out;
}

/**
 * Every human-recorded (course, role) a cast on ONE language would touch, so
 * the Voice Lab can name them before the tap and after it.
 *
 * A cast on language L reaches:
 *   phrase slot — target1/target2 of every course whose target_lang is L,
 *                 and `known` of every course whose known_lang is L;
 *   guide slot  — instruction/encouragement of every course whose known_lang is L.
 *
 * @param {object}   args
 * @param {string}   args.language
 * @param {string}   [args.slot]     'phrase' (default) or 'guide'
 * @param {object[]} args.courses    course rows { course_code, target_lang, known_lang, voice_config }
 * @param {object[]} [args.humanRows] course_human_recorded_roles rows
 * @returns {{courses: Array, roles: string[], total: number}}
 */
function humanRecordedForLanguage({ language, slot = 'phrase', courses = [], humanRows = [] }) {
  const lang = String(language || '').trim();
  const wanted = slot === 'guide' ? ['instruction', 'encouragement'] : [...PHRASE_ROLES];
  const affected = [];
  for (const c of courses) {
    // Which of the wanted roles this cast would actually reach on this course.
    // Matched on the CAST KEY, because that is what the slot is written
    // against: a cast on 'deu' does not reach deu_at_for_eng, so the guard must
    // not warn about it either — a guard that names courses a cast cannot touch
    // teaches the operator to ignore it.
    const targetKey = targetCastKey(c);
    const reach = wanted.filter((role) => (
      role === 'known' || role === 'instruction' || role === 'encouragement'
        ? c.known_lang === lang
        : targetKey === lang
    ));
    if (!reach.length) continue;
    const human = humanRolesForCourse({
      course: c, voiceConfig: c.voice_config, humanRows, roles: reach,
    });
    if (!human.size) continue;
    affected.push({
      course: c.course_code,
      roles: [...human.keys()].sort(),
      reasons: [...human.values()].map((v) => v.reason),
      sources: [...new Set([...human.values()].map((v) => v.source))],
      clips: [...human.values()].reduce((n, v) => n + (v.clips || 0), 0) || null,
    });
  }
  affected.sort((a, b) => (b.clips || 0) - (a.clips || 0) || a.course.localeCompare(b.course));
  return {
    courses: affected,
    roles: [...new Set(affected.flatMap((a) => a.roles))].sort(),
    total: affected.length,
  };
}

/**
 * Read the measured view. SOFT: a missing view degrades the guard to the policy
 * and stored-config signals rather than breaking casting — the same posture
 * registry.cjs takes with voice_guide_in_use.
 *
 * @param {object} db - a supabase client
 * @returns {Promise<object[]>}
 */
async function loadHumanRecordedRoles(db) {
  try {
    const { data, error } = await db
      .from('course_human_recorded_roles')
      .select('course_code, role, target_lang, known_lang, clips, voices, a_voice_id');
    if (error) return [];
    return data || [];
  } catch (e) {
    return [];
  }
}

module.exports = {
  humanRolesForCourse,
  humanRecordedForLanguage,
  loadHumanRecordedRoles,
  PHRASE_ROLES,
  TARGET_ROLES,
};
