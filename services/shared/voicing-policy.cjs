/**
 * THE VOICING POLICY — the one place Tom's voicing rulings live, so no brief and no human has to remember them
 * (Tom 2026-10-11 22:42Z, r-2026-10-11-voicing-rules-live-in-popty-course: "can we build this into Popty … not something
 * I have to hold in my flipping head"). Every number and name is in voicing-policy.config.json; this file is the logic.
 *
 * Called from: the TTS door (services/tts-service.cjs speak → assertRenderAllowed, so the render route, phase8 /generate,
 * charlotte-backfill and every tool that renders pass it), tools/audio/charlotte-backfill.cjs and tools/revoice-clips.cjs
 * (assertRevoiceAllowed), and the course builder (introSplicePlan). A violation throws a VoicingRefusal (403, code
 * VOICING_POLICY, .reason) — loudly, never a quiet fallback.
 *
 *  1. PRESENTATION INTROS in an English-known course are SPLICED: one Charlotte "The <Language> for" clip per BASE language
 *     (a regional variety reuses the base — spa_mx says "The Spanish for", never "The Mexican Spanish for") plus the reused
 *     English remainder. A render of a whole "The X for …" intro is refused (reason 'intro-not-spliced'), as is a fragment
 *     naming the wrong language or in any voice but Charlotte.
 *  2. ENGLISH KNOWN SIDE = CHARLOTTE everywhere (a known-side English render in any other voice is refused); the target side
 *     is the variety's Tom-cast Cartesia voice (the cast gate, voice-cast-gate.cjs, owns that); xAI is banned on every path,
 *     auditions included.
 *  3. RE-VOICE only a course whose target variety Tom cast in Cartesia on/after the config cutoff (read from the
 *     voice_language_roles rows' updated_at); default scope seeds 1..defaultMaxSeed; a variety in config.revoice.done is refused.
 *  4. NEVER DELETE a clip: nothing here deletes, and voicing-policy.test.cjs fails if a re-voice tool grows a course_audio delete.
 *     The rerecord gate (rerecord-gate.cjs) is untouched and still runs after this.
 */
const config = require('./voicing-policy.config.json')
const { castKeyForCourse, baseLanguageOfCastKey } = require('./cast-language-key.cjs')
const gate = require('./voice-cast-gate.cjs')

class VoicingRefusal extends Error {
  constructor(message, reason) { super(message); this.name = 'VoicingRefusal'; this.code = 'VOICING_POLICY'; this.status = 403; this.reason = reason }
}
const refuse = (reason, message) => ({ allowed: false, reason, message: `Voicing policy (403, ${reason}): ${message}` })
const OK = { allowed: true, reason: null, message: null }

const lc = v => String(v || '').trim().toLowerCase()
const bare = v => String(v || '').replace(/^cartesia_/, '')
const isCharlotte = v => bare(v) === bare(config.englishVoice)
const isXai = v => /^(xai_|grok)/i.test(String(v || ''))

/** The course is taught FROM English (English is its known side, not its target). */
function isEnglishKnown(course) {
  const known = lc(course && course.known_lang)
  return known === 'eng' || known === 'en'
}

/** The BASE language a spliced intro names: target_lang, never the variety (regional varieties reuse the base). */
function introLanguageName(course) {
  const name = config.introLanguageNames[lc(course && course.target_lang)]
  if (!name) throw new VoicingRefusal(`Voicing policy (403, no-intro-language): no intro language name is configured for target ${course && course.target_lang} — add it to voicing-policy.config.json`, 'no-intro-language')
  return name
}

/** The fixed fragment recorded once per base language: 'The Spanish for'. */
const introFragmentText = name => `The ${name} for`

/**
 * What the course builder needs to build an intro by splicing: the Charlotte fragment to record once per base language,
 * and the rule for the remainder. Null for a course not taught from English (no splice rule exists for it).
 */
function introSplicePlan(course) {
  if (!isEnglishKnown(course)) return null
  return { fragmentText: introFragmentText(introLanguageName(course)), voiceId: config.englishVoice, language: 'eng', role: 'presentation',
    remainder: 'reuse the existing English Charlotte remainder where LEGO and context are identical and the context names no language; record fresh only the exceptions' }
}

const stripFragment = t => String(t || '').trim().replace(/[\s:,.;!?'"’”]+$/, '').trim()
const FULL_INTRO = /^\s*the\s+[\p{L}][\p{L}' -]*?\s+for\b/iu

/**
 * Pure. May this NEW render happen under the voicing rules? `course` is the courses row (COURSE_CAST_FIELDS) or null (no course).
 * @param {{text:string, language:string, voiceId:string, course?:object|null, intro?:boolean, role?:string|null, audition?:boolean}} r
 */
function checkRender({ text, language, voiceId, course = null, intro = false, role = null, audition = false, now }) {
  if (isXai(voiceId)) return refuse('xai-banned', `${voiceId} is an xAI voice — xAI is banned on every path (Tom 2026-10-10).`)
  const lang = lc(language)
  if (audition || !course || (lang !== 'eng' && lang !== 'en') || !isEnglishKnown(course)) return OK
  const presentation = !!intro || role === 'presentation'
  const knownSide = presentation || role === 'known' || role == null
  if (!knownSide) return OK
  // Tom 2026-10-12 (job #794): a named voice may record WHOLE presentation intros for named courses (config.wholeIntroVoices).
  if (presentation && (config.wholeIntroVoices[bare(voiceId)] || config.wholeIntroVoices[voiceId] || []).includes(course.course_code)) return OK
  // English as the known side is Charlotte, for every course taught from English (Tom 2026-09-23, 2026-10-11).
  if (!isCharlotte(voiceId)) return refuse('english-not-charlotte', `the English known side of ${course.course_code || 'this course'} renders in Charlotte only; ${voiceId} refused.`)
  if (!presentation) return OK
  const name = introLanguageName(course)
  const fragment = introFragmentText(name)
  const t = String(text || '')
  if (stripFragment(t).toLowerCase() === fragment.toLowerCase()) return OK
  if (FULL_INTRO.test(t)) {
    const named = /^\s*the\s+([\p{L}][\p{L}' -]*?)\s+for\b/iu.exec(t)[1]
    if (named.toLowerCase() !== name.toLowerCase() && stripFragment(t).toLowerCase() === `the ${named} for`.toLowerCase()) {
      return refuse('intro-wrong-language-name', `an intro names the BASE language only — "${fragment}", not "The ${named} for" (Tom 2026-10-11).`)
    }
    return refuse('intro-not-spliced', `presentation intros are spliced, never rendered whole: record "${fragment}" once in Charlotte and reuse the English remainder (Tom 2026-10-11); "${t.slice(0, 60)}" refused.`)
  }
  return OK   // a remainder: English text with no "The X for" head, in Charlotte
}

let injectedCourse = null
/** Tests inject the course row: fn(courseCode) → row; null restores the live read. */
const useCourseRow = fn => { injectedCourse = fn }

/** Throws a VoicingRefusal; async because the course row is read from the DB (cached a minute by the cast gate). */
async function assertRenderAllowed({ text, language, voiceId, courseCode = null, intro = false, role = null, audition = false }) {
  const needsCourse = !audition && courseCode && (lc(language) === 'eng' || lc(language) === 'en')
  const course = needsCourse ? await (injectedCourse ? injectedCourse(courseCode) : gate.courseCastRow(courseCode)) : null
  const v = checkRender({ text, language, voiceId: gate.canonVoice ? gate.canonVoice(voiceId) : voiceId, course, intro, role, audition })
  if (!v.allowed) throw new VoicingRefusal(v.message, v.reason)
}

// ── re-voice ────────────────────────────────────────────────────────────────

/**
 * Pure. May a re-voice of this course go ahead, and over which seeds?
 * `rows` = voice_language_roles rows ({language, slot, rank, voice_id, assigned_by, notes, updated_at}).
 * @returns {{allowed:boolean, maxSeed:number|null, reason:string|null, message:string|null, castKey:string}}
 */
function checkRevoice({ course, rows, maxSeed, cutoff = config.revoice.castCutoff }) {
  const key = castKeyForCourse(course, 'target')
  const no = (reason, message) => ({ ...refuse(reason, message), maxSeed: null, castKey: key })
  const mine = (rows || []).filter(r => (r.slot == null || r.slot === 'phrase') && Number(r.rank || 0) === 0 && /^cartesia_/.test(String(r.voice_id || '')) && gate.rowIsForKey(r, key))
  const tom = mine.filter(gate.isTomCastRow)
  if (!tom.length) return no('revoice-uncast', `${key} has no Cartesia cast Tom chose, so ${course.course_code} is not re-voiced.`)
  const late = tom.filter(r => String(r.updated_at || '').slice(0, 10) < cutoff)
  if (late.length) return no('revoice-pre-cutoff', `${key} was cast before ${cutoff} (${late.map(r => `${r.gender || '?'} ${String(r.updated_at).slice(0, 10)}`).join(', ')}); only languages Tom expressly cast in Cartesia on/after ${cutoff} are re-voiced (Tom 2026-10-11).`)
  const done = config.revoice.done[key]
  const ceiling = config.revoice.maxSeedOverride[key] || config.revoice.defaultMaxSeed
  if (done === 'all') return no('revoice-done', `${key} is marked DONE — never re-ask a settled re-voice (Tom 2026-10-11).`)
  const want = maxSeed == null ? ceiling : maxSeed
  if (want > ceiling) return no('revoice-out-of-scope', `seeds 1-${want} is beyond the re-voice scope of 1-${ceiling} for ${key} (the October strategy).`)
  if (typeof done === 'number' && want <= done) return no('revoice-done', `${key} is done to seed ${done}; seeds 1-${want} are not re-voiced again.`)
  return { ...OK, maxSeed: want, castKey: key }
}

let injectedRows = null
const useCastRowsWithDates = fn => { injectedRows = fn }
async function castRowsWithDates() {
  if (injectedRows) return injectedRows()
  const { createClient } = require('@supabase/supabase-js')
  const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
  const { data, error } = await db.from('voice_language_roles').select('language, gender, slot, rank, voice_id, notes, assigned_by, updated_at')
  if (error) throw new VoicingRefusal(`Voicing policy: cannot read the cast (${error.message}) — not knowing is not permission`, 'cast-unreadable')
  return data || []
}

/**
 * The gate every re-voice tool calls before it plans or renders. Returns the seed ceiling to use (default 1-100 when the
 * caller gave none); throws VoicingRefusal otherwise. `getCourse(code)` returns the courses row (COURSE_CAST_FIELDS).
 */
async function assertRevoiceAllowed({ courseCode, maxSeed, getCourse }) {
  const course = await (getCourse ? getCourse(courseCode) : gate.courseCastRow(courseCode))
  if (!course) throw new VoicingRefusal(`Voicing policy: no course row for ${courseCode}`, 'revoice-no-course')
  const v = checkRevoice({ course: { course_code: courseCode, ...course }, rows: await castRowsWithDates(), maxSeed })
  if (!v.allowed) throw new VoicingRefusal(v.message, v.reason)
  return v.maxSeed
}

module.exports = { config, VoicingRefusal, checkRender, assertRenderAllowed, checkRevoice, assertRevoiceAllowed, introSplicePlan, useCourseRow, introFragmentText, introLanguageName, isEnglishKnown, useCastRowsWithDates }
