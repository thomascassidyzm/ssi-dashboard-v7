/**
 * Human-voice-only courses — TTS is NEVER generated for these.
 *
 * OWNER RULING (Tom 2026-07-25): the Welsh courses cym_n_for_eng and
 * cym_s_for_eng are HUMAN-VOICED ONLY. No TTS may ever be minted for them —
 * their voices are real recordings, and a synthesised Welsh clip reaching a
 * learner is a quality defect the same way a child voice is. Their pending
 * audio_pass_requests were dismissed on the same day.
 *
 * The ruling is enforced two ways, the same defence pattern as the child-voice
 * blocklist (services/tts-service.cjs):
 *   1. CHOKEPOINT — tts-service.generate() refuses any call whose config
 *      carries a human-voice course code (fails non-retriably, "(403)").
 *   2. ENTRY GUARDS — pipeline entry points (phase8 /generate, the approved-
 *      audio-pass runner, the rescue/regen sweeps) skip these courses up front
 *      with a logged notice, so no work is even attempted downstream.
 *
 * All `cym_*` courses are treated as human-voiced: every Welsh course we ship
 * is human-recorded, so the prefix rule is the safe default and new Welsh
 * courses are covered without a code change. The explicit set documents the two
 * courses the ruling named.
 *
 * OWNER RULING (Tom 2026-07-27): bre_for_fra (Breton) is also HUMAN-VOICED
 * ONLY — Azure has no Breton voice, same policy as the cym_* courses. Its
 * pending audio_pass_request was dismissed the same day.
 *
 * OWNER RULING (Tom 2026-08-13), stated as a hard rule, not a one-off: Welsh is
 * PERMANENTLY EXCLUDED FROM EVERY TTS RENDER QUEUE. Aran's and Catrin's
 * recordings are never overwritten by synthesis. The trigger was the
 * premium-language recount of 2026-08-13 (docs/audio/noneng-per-language-recount-2026-08-13.md,
 * commit 66ebedd6) proposing ~23,442 Welsh renders even though 91% of Welsh
 * distinct texts already had human recordings and 23,960 content slots already
 * pointed at origin='human' clips. That recount was LANGUAGE-keyed, so the
 * course-code guard above could not see it — hence isHumanVoiceLang() and the
 * assertions below, which every queue builder must call.
 *
 * There is deliberately NO runtime bypass — no env var, no --force flag.
 * Including Welsh in a render queue requires an explicit code change to this
 * file, signed off by Tom. That is the "explicit new override" and nothing
 * cheaper counts as one.
 *
 * Welsh gaps are a RECORDING worklist for Aran and Catrin, never a render
 * backlog. Anything that reads a Welsh coverage gap as work-to-synthesise has
 * misread the estate.
 *
 * OWNER RULING (Tom 2026-08-14): pdc (Pennsylvania Dutch) is HUMAN-VOICED ONLY,
 * on the same terms as Welsh and Breton. It has no synthetic voice anywhere and
 * its speakers are a community Doug and Erik are recording; a German voice
 * reading a Pennsylvania Dutch line is the defect this prevents. The ruling was
 * taken together with admitting pdc to clip identity — the reference CSV gained
 * a database_code for pdc and thirteen other languages the same day
 * (docs/audio-language-guard-scoping-2026-08-14.md) — so this filter is what
 * makes that admission safe: pdc can now be WRITTEN as a clip language, and can
 * never be SYNTHESISED. pdc gaps are a recording worklist, never a render one.
 *
 * The same no-runtime-bypass rule applies: reinstating pdc as TTS-renderable is
 * a code change to this file with Tom's sign-off, nothing cheaper.
 */

const HUMAN_VOICE_COURSES = new Set([
  'cym_n_for_eng',
  'cym_s_for_eng',
  'bre_for_fra',
  'pdc_for_eng',
]);

/**
 * Target languages that are human-voiced only. The course-code rule above keys
 * on `<target>_for_<known>`; this one keys on the target language alone, which
 * is the unit per-language render counting works in.
 */
const HUMAN_VOICE_TARGET_LANGS = new Set([
  'cym',
  'cym_n',
  'cym_s',
  'bre',
  'pdc',
]);

/**
 * @param {string} courseCode
 * @returns {boolean} true if the course is human-voiced only (no TTS ever)
 */
function isHumanVoiceCourse(courseCode) {
  const code = String(courseCode || '');
  return HUMAN_VOICE_COURSES.has(code) || /^cym_/.test(code) || /^pdc_/.test(code);
}

/**
 * @param {string} lang - a target language code as stored in courses.target_lang
 * @returns {boolean} true if that language is human-voiced only (no TTS ever)
 */
function isHumanVoiceLang(lang) {
  const code = String(lang || '');
  return HUMAN_VOICE_TARGET_LANGS.has(code) || /^cym(_|$)/.test(code) || /^pdc(_|$)/.test(code);
}

/**
 * SQL fragment excluding human-voice target languages, for queue-building
 * queries that count or select render work per language. Parameterless so it
 * can be interpolated straight into a query string.
 *
 * @param {string} col - the qualified target_lang column, e.g. 'c.target_lang'
 * @returns {string} a boolean SQL expression that is TRUE for renderable rows
 */
function renderableLangSql(col) {
  const list = [...HUMAN_VOICE_TARGET_LANGS].map(l => `'${l}'`).join(', ');
  return `(${col} NOT IN (${list}) AND ${col} !~ '^cym(_|$)' AND ${col} !~ '^pdc(_|$)')`;
}

/**
 * Hard gate for anything that builds or proposes a TTS render queue.
 *
 * Call it on the finished queue, not just on the inputs: the point is that a
 * language or course that slipped through an upstream filter fails loudly here
 * rather than quietly appearing in a cost table. Throws — a contaminated queue
 * is never partially usable, because the whole number it reports is wrong.
 *
 * @param {Array} items - the queue rows
 * @param {object} opts
 * @param {string} opts.context - what is being built, named in the error
 * @param {(item:any)=>string} [opts.lang] - read a target language off a row
 * @param {(item:any)=>string} [opts.course] - read a course code off a row
 */
function assertNoHumanVoiceInQueue(items, { context, lang, course } = {}) {
  const offenders = [];
  for (const item of items || []) {
    const l = lang ? lang(item) : undefined;
    const c = course ? course(item) : undefined;
    if ((l && isHumanVoiceLang(l)) || (c && isHumanVoiceCourse(c))) offenders.push(c || l);
  }
  if (offenders.length) {
    const shown = [...new Set(offenders)].slice(0, 10).join(', ');
    throw new Error(
      `Human-voice content in a TTS render queue (${context}): ${shown}` +
      ` — ${offenders.length} row(s). Welsh, Breton and Pennsylvania Dutch are human-voiced only` +
      ` and are permanently excluded from every render queue (Tom 2026-08-14; 2026-08-13;` +
      ` 2026-07-25; 2026-07-27). Their coverage` +
      ` gaps are a recording worklist for their recordists, not renders. Filter them out at the` +
      ` query, or, to genuinely change the policy, edit services/shared/human-voice-courses.cjs` +
      ` with Tom's sign-off — there is no runtime override on purpose.`
    );
  }
}

module.exports = {
  HUMAN_VOICE_COURSES,
  HUMAN_VOICE_TARGET_LANGS,
  isHumanVoiceCourse,
  isHumanVoiceLang,
  renderableLangSql,
  assertNoHumanVoiceInQueue,
};
