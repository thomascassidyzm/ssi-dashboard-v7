/**
 * ARTIST RIGHTS DERIVE FROM CASTING, NOT FROM THE USERS PAGE.
 *
 * Tom's ruling, 2026-09-12 (Watson room, via the BSC + NRD heuristics): "You
 * edit and record the lines you're cast on. The editor shapes the course."
 *
 * A voice artist may open, edit (both sides) and record the lines they are CAST
 * on, on the course(s) where the casting lives. That right comes from the
 * casting alone - no dashboard_users row, no role, no grant. A course EDITOR
 * (granted on popty.app/users as before) additionally shapes the course: adds
 * and removes lines, changes the cast, marks ready. Nothing else changes and
 * no new role or level exists: this module READS the casting that is already
 * written and turns it into an access answer.
 *
 * WHERE THE CASTING LIVES (all read live, no new table):
 *   1. language_recording_policy.voices[slot] - {voiceId, email, dialect,
 *      gender}: the language's record of who reads it. A voice cast there is
 *      cast on every course of that language in its dialect - exactly the
 *      courses whose lines the booth (/r/:voiceId) serves, by the queue's own
 *      rule (recordist-queue buildLanguageLines: bucket = course dialect).
 *   2. courses.voice_config.podCast[speaker] - {voiceId, email}: a per-course
 *      pod cast. An entry naming this email, or one of this person's POLICY
 *      voices, is a casting on THAT course - and on that course only. An
 *      editor's cast entry never reaches past its own course (see
 *      castingForEmail: the cross-course leak of 2026-09-12).
 *   3. courses.voice_config.voices[role] - a voice id per role; if it is one of
 *      this person's policy voices, that is a casting on that course too.
 *
 * ORDER OF THE CHECK: casting first, then grants. Every existing grant row is
 * kept and still honoured; a cast artist who also holds an editor grant is
 * simply an editor who is also cast.
 */
const fs = require('fs')
const { voicesForEmail, resolveRecordist, coursesForLanguage } = require('./recordist-queue.cjs')
const { courseDialect, canonicalDialect } = require('../shared/dialect.cjs')
const { evidencePath } = require('../../tools/lib/evidence-path.cjs')

// THE USAGE SIGNAL, NOT ONLY THE BREAK SIGNAL (Tom, 2026-09-12). Every cast
// artist who reaches a course page by the casting rule is written here once
// per day per course, and every refusal of a cast artist is written every time
// and logged loudly. The nightly check tools/casting-access-report.cjs reads
// this file beside booth-artists-day: a day with zero reaches or any refusal
// is red, never silent. JSONL, one event per line, out of the repo tree.
const ACCESS_LEDGER_REL = 'ops/casting-access.jsonl'
let accessLedgerPath = null
function accessLedger() {
  if (!accessLedgerPath) accessLedgerPath = process.env.CASTING_ACCESS_LEDGER || evidencePath(ACCESS_LEDGER_REL)
  return accessLedgerPath
}
const reachedToday = new Set()
function dayOf(ts) { return new Date(ts).toISOString().slice(0, 10) }

/**
 * Record a cast artist reaching a course page (`reach`, deduped per day per
 * email per course) or being refused (`refused`, every time, logged loudly).
 * Never throws: a ledger that cannot be written must not break a request.
 */
function recordAccess({ kind, email, voices = [], courseCode, method, path, sentence, logger = console, now = Date.now() }) {
  const event = { ts: new Date(now).toISOString(), kind, email: String(email || '').toLowerCase(), voices, courseCode, method, path, sentence }
  if (kind === 'reach') {
    const key = `${dayOf(now)} ${event.email} ${courseCode}`
    if (reachedToday.has(key)) return null
    reachedToday.add(key)
    if (reachedToday.size > 5000) reachedToday.clear()
    logger.info(`[CastingAccess] REACH ${event.email} as ${voices.join('+') || '?'} → ${courseCode} (${method} ${path})`)
  } else {
    logger.warn(`[CastingAccess] REFUSED cast artist ${event.email} (${voices.join('+') || 'voice unknown'}) on ${courseCode} (${method} ${path}): ${sentence}`)
  }
  try { fs.appendFileSync(accessLedger(), JSON.stringify(event) + '\n') } catch (err) { logger.warn(`[CastingAccess] ledger write failed: ${err.message}`) }
  return event
}

function normEmail(email) { return String(email || '').trim().toLowerCase() }

/**
 * Every (course, voice) this email is cast on.
 * @returns {Promise<Array<{courseCode, voiceId, displayName, language, via}>>}
 */
async function castingForEmail(db, email) {
  const norm = normEmail(email)
  if (!norm) return []
  const out = []
  const seen = new Set()
  const add = (courseCode, voiceId, displayName, language, via) => {
    const key = `${courseCode} ${voiceId}`
    if (seen.has(key)) return
    seen.add(key)
    out.push({ courseCode, voiceId, displayName: displayName || voiceId, language: language || null, via })
  }

  // WHO SAID SO DECIDES HOW FAR IT REACHES (foreign-eyes finding, 2026-09-12:
  // a policy voice cast into course A's podCast under a second email handed
  // that email every course of the language). voicesForEmail tags each voice
  // with its source (castVia); only a language_recording_policy slot naming
  // THIS email is the language's own record and so a language-wide claim.
  // A podCast entry speaks for the one course it is written on, and the
  // users-page voice_id is what the cast save provisions from that entry, so
  // neither may widen the reach: they admit nothing beyond the course whose
  // cast names the email.
  const voices = await voicesForEmail(db, norm)
  const policyVoices = voices.filter((v) => v.castVia && v.castVia.policy)
  const policyVoiceIds = new Set(policyVoices.map((v) => v.voiceId))

  // 1. the language policy: each voice the POLICY names for this email, on
  //    every course of that language in the voice's dialect - the booth's own
  //    course list.
  for (const v of policyVoices) {
    for (const c of await coursesForLanguage(db, v.language)) {
      if (courseDialect(c) === canonicalDialect(v.dialect)) add(c.course_code, v.voiceId, v.displayName, v.language, 'policy')
    }
  }

  // 2 + 3. per-course casts: a podCast entry naming this EMAIL is a casting on
  //    that course and no other; a podCast entry or voice_config.voices role
  //    naming one of this person's POLICY voices is a casting on that course.
  const { data: courses, error } = await db.from('courses').select('course_code, target_lang, voice_config')
  if (error) throw new Error(`course list failed: ${error.message}`)
  for (const c of courses || []) {
    const vc = c.voice_config || {}
    for (const entry of Object.values(vc.podCast || {})) {
      if (!entry || typeof entry !== 'object') continue
      if (normEmail(entry.email) === norm || (entry.voiceId && policyVoiceIds.has(entry.voiceId))) {
        add(c.course_code, entry.voiceId || null, entry.name, c.target_lang, 'podCast')
      }
    }
    for (const voiceId of Object.values(vc.voices || {})) {
      if (typeof voiceId === 'string' && policyVoiceIds.has(voiceId)) {
        const v = voices.find((x) => x.voiceId === voiceId)
        add(c.course_code, voiceId, v && v.displayName, c.target_lang, 'voices')
      }
    }
  }
  return out
}

/** The casting entries on ONE course, from a resolved list. */
function castingOn(casting, courseCode) {
  return (Array.isArray(casting) ? casting : []).filter((c) => c.courseCode === courseCode)
}

/**
 * The identity a cast artist carries when they have NO dashboard_users row.
 * Same shape as every other Popty identity so nothing downstream learns a new
 * one. `role: 'recorder'` is the EXISTING confinement role (booth-side pages
 * only, own course only) - not a new role; `authority: 'casting'` says where
 * the right came from. `courses` is the list of courses the casting names.
 */
function castingIdentity(email, casting) {
  if (!casting || !casting.length) return null
  const courses = [...new Set(casting.map((c) => c.courseCode))]
  return {
    name: casting[0].displayName || email,
    email,
    role: 'recorder',
    courses,
    voice_id: casting[0].voiceId || null,
    casting,
    authority: 'casting',
  }
}

/** Attach the live casting to an identity that already exists (editor, admin, recorder). */
function withCasting(user, casting) {
  if (!user) return user
  return { ...user, casting: Array.isArray(casting) ? casting : [] }
}

/** Grant-side check, exactly as production-api has always done it. */
function grantedOn(user, courseCode) {
  if (!user || !courseCode) return false
  if (user.role === 'admin') return true
  if (user.courses === '*') return true
  return Array.isArray(user.courses) && user.courses.includes(courseCode)
}

/**
 * THE ACCESS VERDICT for a course page or line route. Casting first, then
 * grants. A refusal is a plain sentence naming the course and, where the
 * casting names them elsewhere, the voice and the course it is on - never a
 * blank "no access".
 *
 * @returns {{ok: true, by: 'casting'|'grant', voices: string[]} | {ok: false, sentence: string}}
 */
function courseAccessVerdict(user, courseCode) {
  if (!user) return { ok: false, sentence: `Sign in to open ${courseCode}.` }
  const cast = castingOn(user.casting, courseCode)
  if (cast.length) return { ok: true, by: 'casting', voices: cast.map((c) => c.voiceId).filter(Boolean) }
  if (grantedOn(user, courseCode)) return { ok: true, by: 'grant', voices: [] }
  const who = user.email || 'this login'
  const elsewhere = (user.casting || []).map((c) => `${c.voiceId || c.displayName} on ${c.courseCode}`)
  const tail = elsewhere.length
    ? ` The casting names ${who} as ${[...new Set(elsewhere)].join(', ')}, not here.`
    : ` No casting on ${courseCode} names ${who}, and no editor grant does either.`
  return { ok: false, sentence: `${who} is not cast on ${courseCode}.${tail}` }
}

/**
 * WHAT A CAST-ONLY ARTIST MAY WRITE on a course's pod routes: a line's text,
 * either side. Never the cast, never add/remove, never mark ready - those
 * shape the course and belong to the editor. An editor (grant) keeps every
 * write they had.
 */
function podWriteVerdict(user, courseCode, method, path) {
  if (method === 'GET') return { ok: true }
  const access = courseAccessVerdict(user, courseCode)
  if (!access.ok) return { ok: false, status: 403, sentence: access.sentence }
  if (grantedOn(user, courseCode) && user.role !== 'recorder') return { ok: true, by: 'grant' }
  // Cast (or legacy recorder-role) - the line's own words, and nothing else.
  if (method === 'PATCH' && /^\/sentence\/[^/]+$/.test(path)) return { ok: true, by: 'casting', ownLineOnly: true }
  return {
    ok: false, status: 403,
    sentence: `${user.email || 'A cast voice'} may edit and record the lines they are cast on in ${courseCode}; ` +
      'adding or removing lines, changing the cast and marking ready belong to the course editor.',
  }
}

/**
 * Is this pod sentence one of the artist's OWN lines? The sentence's speaker
 * is cast (voice_config.podCast) to a voice the artist's casting on this
 * course names. A sentence whose speaker is uncast is nobody's line.
 */
function isOwnPodLine({ user, courseCode, castEntry }) {
  const mine = castingOn(user && user.casting, courseCode)
  if (!mine.length) return false
  return !!(castEntry && castEntry.voiceId && mine.some((c) => c.voiceId === castEntry.voiceId))
}

/**
 * The light, public answer for a booth link: which course(s) this voice is
 * cast on and the email the casting names (hinted, never in full). Read by the
 * login page so a booth-link-only artist with no login is told where they are
 * cast and which email to sign in with, instead of a blank login page.
 */
async function castingForVoice(db, voiceId) {
  const recordist = await resolveRecordist(db, voiceId)
  if (!recordist) return null
  const casting = recordist.email ? await castingForEmail(db, recordist.email) : []
  const courses = [...new Set(casting.filter((c) => c.voiceId === recordist.voiceId).map((c) => c.courseCode))]
  return {
    voiceId: recordist.voiceId,
    displayName: recordist.displayName,
    languageName: recordist.languageName,
    courses,
    emailHint: hintEmail(recordist.email),
  }
}

/**
 * THE LINK DOOR, RESOLVED AS THE EMAIL DOOR IS. ONE IDENTITY, TWO DOORS
 * (Tom, 2026-09-12): /r/:voiceId is the pre-signed form of the email login.
 * The booth already knows WHO holds the link (resolveRecordist: the policy's
 * voice, with the email the policy names); this turns that into the SAME
 * identity the email login produces - castingIdentity over castingForEmail -
 * and asks the SAME verdict function the :courseCode gate asks, so a link
 * arrival is a `reach` with the same email/course keys the nightly report
 * counts for a login, and a refusal is logged loudly the same way. The report
 * cannot tell the doors apart, which is the point.
 *
 * A policy voice with NO email on record has no email-door twin; its identity
 * is the queue's own answer (the courses its lines serve), keyed on ''.
 *
 * @param {object} opts
 * @param {object} opts.db
 * @param {{voiceId, email, displayName, language}} opts.recordist resolveRecordist's answer
 * @param {string[]} opts.courseCodes the course(s) this arrival is for: the
 *        scoped course of a course link, or every course the queue serves
 * @returns {Promise<{email: string, identity: object, reached: string[], refused: Array<{courseCode, sentence}>}>}
 */
async function boothArrival({ db, recordist, courseCodes, method = 'GET', path = '', logger = console, now = Date.now() }) {
  const email = normEmail(recordist && recordist.email) || await emailForVoice(db, recordist && recordist.voiceId)
  let casting = email ? await castingForEmail(db, email) : []
  // THE LINK IS FOR ONE VOICE. A cast-only voice is admitted to its cast
  // courses only (resolveCastOnlyRecordist), whatever else its email holds:
  // the same person cast as a second voice on another course arrives there
  // by THAT voice's link, not by this one (job #336, 2026-09-12).
  if (Array.isArray(recordist.castCourses)) casting = casting.filter((c) => recordist.castCourses.includes(c.courseCode))
  if (!casting.length) {
    // No email-door twin: the link's own answer stands in, so the arrival is
    // still counted rather than dropped for want of an address. For a cast-only
    // (community) voice that answer is its cast courses, never the asked ones.
    const own = Array.isArray(recordist.castCourses) ? recordist.castCourses : (courseCodes || [])
    casting = own.map((courseCode) => ({
      courseCode, voiceId: recordist.voiceId, displayName: recordist.displayName, language: recordist.language,
      via: Array.isArray(recordist.castCourses) ? 'podCast' : 'policy',
    }))
  }
  const identity = castingIdentity(email, casting) || { email, role: 'recorder', courses: [], voice_id: recordist.voiceId, casting: [], authority: 'casting' }
  const reached = []
  const refused = []
  for (const courseCode of courseCodes || []) {
    const verdict = courseAccessVerdict(identity, courseCode)
    if (verdict.ok) {
      recordAccess({ kind: 'reach', email, voices: verdict.voices.length ? verdict.voices : [recordist.voiceId], courseCode, method, path, logger, now })
      reached.push(courseCode)
    } else {
      recordAccess({ kind: 'refused', email, voices: [recordist.voiceId], courseCode, method, path, sentence: verdict.sentence, logger, now })
      refused.push({ courseCode, sentence: verdict.sentence })
    }
  }
  return { email, identity, reached, refused }
}

/**
 * The email a voice is cast under when the policy row carries none: the
 * first course cast (voice_config.podCast) naming this voice with an email.
 * This is what keeps the two doors on ONE key - the editor wrote the email on
 * the cast, and that is the email the artist signs in with.
 */
async function emailForVoice(db, voiceId) {
  if (!voiceId) return ''
  const { data: courses, error } = await db.from('courses').select('course_code, voice_config')
  if (error) throw new Error(`course list failed: ${error.message}`)
  for (const c of courses || []) {
    for (const entry of Object.values((c.voice_config && c.voice_config.podCast) || {})) {
      if (entry && entry.voiceId === voiceId && normEmail(entry.email)) return normEmail(entry.email)
    }
  }
  return ''
}

function hintEmail(email) {
  const e = normEmail(email)
  if (!e) return null
  const at = e.indexOf('@')
  if (at < 1) return null
  const local = e.slice(0, at)
  return `${local[0]}...${local.length > 1 ? local[local.length - 1] : ''}@${e.slice(at + 1)}`
}

module.exports = {
  recordAccess,
  accessLedger,
  ACCESS_LEDGER_REL,
  castingForEmail,
  castingOn,
  castingIdentity,
  withCasting,
  grantedOn,
  courseAccessVerdict,
  podWriteVerdict,
  isOwnPodLine,
  castingForVoice,
  boothArrival,
  emailForVoice,
  hintEmail,
}
