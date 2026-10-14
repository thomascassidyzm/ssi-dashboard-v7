/**
 * RESOLVE VOICE — the ONE answer to "which voice speaks this slot?".
 *
 * Tom, 2026-10-12 16:17Z (r-2026-10-12-voice-assignment-is-systematised-in-popty):
 *   "what's the value of standing rules that we can overrule. The better thing is
 *    to systematise it in Popty. And then we use Popty as a deterministic procedure."
 *
 * The specimen that produced it: on 2026-10-12 agents (Watson included) each read
 * the English voice rulings their own way and wrote tens of thousands of live
 * audio pointers in the wrong voice (jobs #24, #34, #51; #52 reverted them). The
 * rulings were right; the procedure was every agent's own. So the policy lives
 * HERE, as code, and every tool asks this function instead of deciding.
 *
 *   resolveVoice({ course, role, language, gender }, cast)
 *     → { status:'voice',     voiceId, rule, ruling }   this is the voice, full stop
 *     → { status:'refuse',    reason,  rule, ruling, message }   nothing may speak it (uncast language)
 *     → { status:'no-ruling', message }                  outside the coded policy: no answer, never a guess
 *
 * Inputs: the course row (course_code, known_lang, target_lang, dialect,
 * voice_pool_key, known_dialect), the slot role (known | target1 | target2 |
 * presentation), the clip's language (defaults to the role's side), the slot's
 * gender (defaults by role: target1 female, target2 male), and the Voice Lab cast
 * (voice_language_roles + voices rows, see loadCast).
 *
 * THE POLICY, one entry per line in POLICY below, each with the ruling it encodes.
 * Change a line only on a new ruling from Tom, and change its test with it
 * (services/shared/resolve-voice.test.cjs has one `it` per line).
 *
 * WHAT THIS IS NOT. It does not delete, render or repoint anything. A voice that
 * differs from the answer is a DRIFT the audit reports (tools/audio/voice-audit.cjs);
 * moving it is the audit's --apply, never a side effect of asking.
 */
const { tryCanonicalVoiceId, tryCanonicalLanguage } = require('./clip-identity.cjs')
const { castKeyForCourse } = require('./cast-language-key.cjs')
const { isTomCastRow, rowIsForKey } = require('./voice-cast-gate.cjs')
const voicingConfig = require('./voicing-policy.config.json')
const { isTomCloneVoice, isWelshCourse, WELSH_TOM_MESSAGE } = require('./welsh-no-tom-clone.cjs')
const { assertNotReplacingHuman } = require('./human-take-guard.cjs')

const TOM_006 = 'cartesia_d293d509-eb96-4df4-8cfd-80a693aa49a9'
const CHARLOTTE = 'cartesia_71a7ad14-091c-4e8e-a314-022ece01c121'

/** The slot roles this function governs. Pods, guide lines (instruction/encouragement) and welcome audio are not slots here. */
const SLOT_ROLES = Object.freeze(['known', 'target1', 'target2', 'presentation'])

/** A target slot's gender is the slot's, not the clip's: target1 is the female voice, target2 the male (every non-test course, checked 2026-10-12). */
const SLOT_GENDER = Object.freeze({ target1: 'f', target2: 'm' })

/**
 * The courses whose presentation intros Tom moved to Tom-006 (job #794, then French and Italian on his later go).
 * Read from voicing-policy.config.json's wholeIntroVoices so the door and this function share one list.
 */
const TOM006_INTRO_COURSES = Object.freeze([...((voicingConfig.wholeIntroVoices || {})[TOM_006] || [])])

/** What the English cast is expected to say. The nightly audit warns when the Voice Lab drifts from it; it does not override the cast. */
const EXPECTED_ENGLISH_TARGET = Object.freeze({ f: CHARLOTTE, m: TOM_006 })

const POLICY = Object.freeze([
  { rule: 'welsh-no-tom-clone', when: 'ANY slot of a Welsh course (cym in the code or either language) whose answer would be a Tom clone', voice: 'REFUSE — never a Tom clone, never a guess',
    ruling: 'r-2026-10-13-hard-rule-tom-s-voice-clone ("my clone should never have been used for anything in the WELSH courses")' },
  { rule: 'english-known', when: 'English is the KNOWN language, any course, any gender', voice: 'Tom-006',
    ruling: 'r-2026-10-12-in-the-premium-x-for-eng (+ Tom 2026-10-12 16:17Z brief: "English as KNOWN language in ANY course: Tom-006, always")' },
  { rule: 'english-target', when: 'English is the TARGET (eng_for_X), target1/target2', voice: 'English cast at the slot gender: Charlotte (f) / Tom-006 (m)',
    ruling: 'r-2026-10-12-in-the-premium-x-for-eng ("Gender variance for English … applies to the eng_for_X courses")' },
  { rule: 'target-cast', when: 'any other TARGET language (its variety is its own language)', voice: "Tom's Voice Lab cast for the variety at the slot gender, rank 0, else rank 1",
    ruling: 'r-2026-10-10-voice-casting-is-done-by-language; r-2026-10-10-tom-s-cartesia-cast-is-per (varieties)' },
  { rule: 'target-uncast', when: 'TARGET language with no cast Tom chose (none, or only the 2026-09-04 draft)', voice: 'REFUSE — never guess',
    ruling: 'Tom 2026-10-12 16:17Z brief; r-2026-10-10-new-phrase-audio-may-render-only (draft cast is not a cast)' },
  { rule: 'intro-tom006', when: `presentation, English known, course in the Tom-006 intro list (${TOM006_INTRO_COURSES.length} courses)`, voice: 'Tom-006',
    ruling: 'r-2026-10-12-ssi-intro-tts-in-cartesia-end; r-2026-10-12-tom-006-is-the-male-english (intros); job #794 list' },
  { rule: 'intro-charlotte', when: 'presentation, English known, any other course', voice: 'Charlotte (spliced)',
    ruling: 'r-2026-10-11-for-new-voicings-presentation-introduction-clips; r-2026-10-11-intros-are-assembled-by-dice-and' },
  { rule: 'no-ruling', when: 'known or presentation side in a language other than English; a line in a language its role does not speak', voice: 'no answer (existing gates apply)',
    ruling: 'none coded — no ruling exists for these yet' },
])

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
/** One spelling per voice: bare Cartesia uuids gain their prefix, everything else goes through clip-identity. */
function canonVoice(v) {
  if (!v) return null
  const s = String(v).trim()
  if (UUID.test(s)) return `cartesia_${s.toLowerCase()}`
  return tryCanonicalVoiceId(s) || s
}
const sameVoice = (a, b) => !!a && !!b && canonVoice(a) === canonVoice(b)
const canonLang = (l) => (l ? (tryCanonicalLanguage(String(l)) || String(l).toLowerCase()) : null)
const isXai = (v) => /^(xai_|grok)/i.test(String(v || ''))

const voice = (voiceId, rule) => ({ status: 'voice', voiceId, rule, ruling: POLICY.find((p) => p.rule === rule).ruling })
const noRuling = (message) => ({ status: 'no-ruling', rule: 'no-ruling', message })

/**
 * Tom's cast for (cast key, gender), phrase slot: rank 0, falling to rank 1 only when the rank-0 voice row is
 * missing or inactive. Draft rows (the 2026-09-04 mechanical fill) and rows no Tom ruling authored are not a cast.
 */
function pickCast(cast, key, gender) {
  const rows = (cast && cast.roles) || []
  const voices = new Map(((cast && cast.voices) || []).map((v) => [canonVoice(v.voice_id), v]))
  const mine = rows.filter((r) => (r.slot || 'phrase') === 'phrase' && rowIsForKey(r, key) && r.gender === gender)
  const tom = mine.filter(isTomCastRow).sort((a, b) => Number(a.rank || 0) - Number(b.rank || 0))
  for (const r of tom) {
    const id = canonVoice(r.voice_id)
    if (isXai(id)) continue
    const v = voices.get(id)
    if (cast.voices && (!v || v.is_active === false)) continue   // voices supplied: the row must be live; else trust the cast row
    return { voiceId: id, rank: Number(r.rank || 0) }
  }
  return { voiceId: null, draft: mine.length > 0 }
}

/**
 * THE function. Pure: everything it reads is an argument.
 * @param {{course:object, role:string, language?:string, gender?:'f'|'m'}} slot
 * @param {{roles:object[], voices?:object[]}|null} cast  voice_language_roles (+ voices) rows; null = cast not loaded
 */
function resolveVoice(slot = {}, cast = null) {
  const res = resolveVoiceUnguarded(slot, cast)
  // Tom 2026-10-13: a Welsh course never speaks in a Tom clone, whatever the rules below would say.
  if (res.status === 'voice' && isWelshCourse(slot.course) && isTomCloneVoice(res.voiceId)) {
    return { status: 'refuse', reason: 'tom-clone-welsh', rule: 'welsh-no-tom-clone', ruling: POLICY.find((p) => p.rule === 'welsh-no-tom-clone').ruling,
      message: WELSH_TOM_MESSAGE(slot.course.course_code, res.voiceId) }
  }
  return res
}

function resolveVoiceUnguarded({ course, role, language = null, gender = null } = {}, cast = null) {
  if (!course) return noRuling('no course')
  if (!SLOT_ROLES.includes(role)) return noRuling(`role ${role} is not a course slot this policy governs`)
  const knownSide = role === 'known' || role === 'presentation'
  const sideLang = canonLang(knownSide ? course.known_lang : course.target_lang)
  const lang = canonLang(language) || sideLang
  if (lang !== sideLang) return noRuling(`a ${lang} line in a ${role} slot (which speaks ${sideLang}) — no ruling covers it`)

  if (role === 'presentation') {
    if (lang !== 'eng') return noRuling(`presentation in ${lang} — no ruling covers a non-English intro voice`)
    return TOM006_INTRO_COURSES.includes(course.course_code) ? voice(TOM_006, 'intro-tom006') : voice(CHARLOTTE, 'intro-charlotte')
  }
  if (role === 'known') {
    if (lang === 'eng') return voice(TOM_006, 'english-known')
    return noRuling(`known side in ${lang} — no ruling covers a non-English known voice`)
  }

  // target1 / target2
  const g = gender === 'f' || gender === 'm' ? gender : SLOT_GENDER[role]
  if (!cast || !cast.roles) return noRuling('cast not loaded — a target voice is the Voice Lab cast, so it cannot be answered without it')
  const key = lang === 'eng' ? 'eng' : castKeyForCourse(course, 'target') || lang
  const pick = pickCast(cast, key, g)
  if (pick.voiceId) return { ...voice(pick.voiceId, lang === 'eng' ? 'english-target' : 'target-cast'), castKey: key, gender: g, rank: pick.rank }
  const reason = pick.draft ? 'draft-cast' : 'uncast'
  return {
    status: 'refuse', reason, rule: 'target-uncast', castKey: key, gender: g,
    ruling: POLICY.find((p) => p.rule === 'target-uncast').ruling,
    message: `${key} (${g}) has ${pick.draft ? 'only the 2026-09-04 draft casting' : 'no cast'} — Tom has not chosen a voice, so nothing is rendered or pointed (cast it in the Voice Lab)`,
  }
}

/**
 * May this slot point at this clip? The pointer form of resolveVoice, used by every tool that writes a *_audio_id.
 * ok:true when the clip's voice is the resolved voice, or the slot is outside the coded policy (no-ruling).
 * @param {{course:object, role:string, clip:{voice_id:string, language?:string}, gender?:string}} p
 */
function checkPointer({ course, role, clip, gender = null }, cast) {
  if (!clip) return { ok: false, reason: 'no-clip', message: 'no clip to point at' }
  // Tom 2026-10-13: a Tom clone never fills a Welsh slot — checked before anything else, whatever the policy answer.
  if (isWelshCourse(course) && isTomCloneVoice(clip.voice_id)) {
    return { ok: false, reason: 'tom-clone-welsh', resolution: null, message: WELSH_TOM_MESSAGE(course.course_code, clip.voice_id) }
  }
  // A HUMAN RECORDING is never outranked by a TTS policy (Tom 2026-08-31, language-voice-cast.cjs human-voice guard).
  if (clip.origin === 'human') return { ok: true, human: true, resolution: null }
  const res = resolveVoice({ course, role, language: clip.language, gender }, cast)
  if (res.status === 'no-ruling') return { ok: true, resolution: res }
  if (res.status === 'refuse') return { ok: false, reason: res.reason, resolution: res, message: `${course.course_code} ${role}: ${res.message}` }
  if (sameVoice(clip.voice_id, res.voiceId)) return { ok: true, resolution: res }
  return { ok: false, reason: 'disagrees', resolution: res,
    message: `${course.course_code} ${role}: clip voice ${clip.voice_id} is not the resolved voice ${res.voiceId} (${res.rule}) — use tools/audio/voice-audit.cjs` }
}

/**
 * Overlay resolveVoice onto a course's voice config, so everything that reads the config to RENDER or LINK (phase8 /generate,
 * its linkers, the relink voice guard) asks for the resolved voice. Pure. Roles a human recorded (`humanRoles`) are left alone —
 * a recording is never outranked. Returns the same object when nothing changes, plus one decision per role that moved.
 */
function applyResolvedVoices({ voiceConfig, course, cast, humanRoles = new Set() }) {
  const decisions = []
  if (!course) return { config: voiceConfig, decisions }
  let next = null
  for (const role of SLOT_ROLES) {
    if (humanRoles.has(role)) continue
    const res = resolveVoice({ course, role }, cast)
    if (res.status !== 'voice') continue
    const cur = voiceConfig && voiceConfig.voices && voiceConfig.voices[role]
    if (cur && sameVoice(cur.voiceId || cur.voice_id, res.voiceId)) continue
    if (!next) next = { ...(voiceConfig || {}), voices: { ...((voiceConfig && voiceConfig.voices) || {}) } }
    next.voices[role] = {
      ...(cur || {}),
      voiceId: res.voiceId,
      provider: String(res.voiceId).split('_')[0],
      // the stored speed corrected the REPLACED voice's pace; it does not travel (as applyLanguageCast)
      settings: { ...((cur && cur.settings) || {}), speed: 1.0 },
      resolvedBy: res.rule,
    }
    decisions.push({ role, rule: res.rule, voiceId: res.voiceId, replaced: (cur && (cur.voiceId || cur.voice_id)) || null })
  }
  return { config: next || voiceConfig, decisions }
}

class VoicePointerRefusal extends Error {
  constructor(message, reason) { super(message); this.name = 'VoicePointerRefusal'; this.code = 'VOICE_POLICY'; this.status = 403; this.reason = reason }
}

/** The slot role a pointer column fills. */
const roleOfColumn = (col) => { const m = /^(known|target1|target2|presentation)_audio_id$/.exec(String(col || '')); return m ? m[1] : null }

// ── the live cast ────────────────────────────────────────────────────────────
const TTL_MS = 60_000
let injected = null, cache = null
/** Tests inject {roles, voices}; null restores the live read. */
function useCast(c) { injected = c; cache = null }

/** voice_language_roles + the voices rows they name, cached a minute. Under vitest with nothing injected: null (no cast in play). */
async function loadCast(db = null) {
  if (injected) return injected
  if (process.env.VITEST && !db) return null
  if (cache && Date.now() - cache.at < TTL_MS) return cache.cast
  if (!db) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) throw new VoicePointerRefusal('resolveVoice: cannot read the cast (SUPABASE_URL / SUPABASE_SERVICE_KEY not set) — not knowing is not permission', 'cast-unreadable')
    db = require('@supabase/supabase-js').createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
  }
  const { data: roles, error } = await db.from('voice_language_roles').select('language, gender, slot, rank, voice_id, notes, assigned_by')
  if (error) throw new VoicePointerRefusal(`resolveVoice: cannot read the cast (${error.message}) — not knowing is not permission`, 'cast-unreadable')
  const ids = [...new Set((roles || []).map((r) => r.voice_id))]
  const { data: voices, error: e2 } = await db.from('voices').select('voice_id, is_active, gender').in('voice_id', ids.length ? ids : ['-'])
  if (e2) throw new VoicePointerRefusal(`resolveVoice: cannot read voices (${e2.message})`, 'cast-unreadable')
  const cast = { roles: roles || [], voices: voices || [] }
  cache = { at: Date.now(), cast }
  return cast
}

const COURSE_FIELDS = 'course_code, known_lang, target_lang, dialect, voice_pool_key, known_dialect'
const courseCache = new Map()
async function loadCourse(db, courseCode) {
  const hit = courseCache.get(courseCode)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.row
  const { data, error } = await db.from('courses').select(COURSE_FIELDS).eq('course_code', courseCode).maybeSingle()
  if (error) throw new VoicePointerRefusal(`resolveVoice: cannot read course ${courseCode} (${error.message})`, 'course-unreadable')
  if (!data) throw new VoicePointerRefusal(`resolveVoice: no course row for ${courseCode}`, 'no-course')
  courseCache.set(courseCode, { at: Date.now(), row: data })
  return data
}

/**
 * Throws VoicePointerRefusal unless `to` (a course_audio id) may fill `col` on a row of `courseCode`.
 * Reads the clip, the course and the cast; a failed read refuses.
 */
async function assertPointer(db, { courseCode, col, to, tbl, key, from, tomApproval, restore = false }) {
  const role = roleOfColumn(col)
  if (!role || !to) return
  // FIRST, whatever the voice policy says: a HUMAN take is never replaced by a synthetic clip (Tom's HARD RULE 2026-10-13, human-take-guard.cjs).
  await assertNotReplacingHuman(db, { tbl, key, col, from, to, tomApproval, restore })
  const { data: clip, error } = await db.from('course_audio').select('id, voice_id, language, origin').eq('id', to).maybeSingle()
  if (error) throw new VoicePointerRefusal(`resolveVoice: cannot read clip ${to} (${error.message})`, 'clip-unreadable')
  const v = checkPointer({ course: await loadCourse(db, courseCode), role, clip }, await loadCast(db))
  if (!v.ok) throw new VoicePointerRefusal(v.message, v.reason)
}

/**
 * For tools with their own pointer writer: true when the write may go ahead, false (with one printed line) when resolveVoice refuses
 * it. A RESTORE of a ledgered before-state (an undo) passes — putting back what was there is not choosing a voice — and so does a null.
 */
async function mayPoint(db, { courseCode, col, to, tbl, key, from, tomApproval, restore = false, log = console.log }) {
  if (restore || to == null) return true
  try { await assertPointer(db, { courseCode, col, to, tbl, key, from, tomApproval }); return true } catch (e) {
    if (e.code !== 'VOICE_POLICY' && e.code !== 'HUMAN_TAKE') throw e
    log(`REFUSED by resolveVoice (${e.reason}): ${e.message}`); return false
  }
}

/**
 * THE guarded pointer write: check, then `update … set col=to where id=key and col=from` (before-state asserted).
 * Returns true when exactly one row moved. Tools that repoint audio call this instead of writing the column themselves.
 */
async function setSlotPointer(db, { tbl, key, col, from, to, courseCode, editEventId = null, tomApproval }) {
  if (!['course_seeds', 'course_legos', 'course_practice_phrases'].includes(tbl)) throw new Error(`setSlotPointer: not a slot table: ${tbl}`)
  await assertPointer(db, { courseCode, col, to, tbl, key, from: from === undefined ? null : from, tomApproval })
  const patch = { [col]: to, ...(editEventId ? { last_edit_event_id: editEventId } : {}) }
  let q = db.from(tbl).update(patch).eq('id', key)
  q = from == null ? q.is(col, null) : q.eq(col, from)
  const { data, error } = await q.select('id')
  if (error) throw new Error(error.message)
  return !!data && data.length === 1
}

module.exports = {
  resolveVoice, applyResolvedVoices, checkPointer, assertPointer, mayPoint, setSlotPointer, loadCast, loadCourse, useCast, pickCast,
  canonVoice, sameVoice, roleOfColumn, VoicePointerRefusal,
  POLICY, SLOT_ROLES, SLOT_GENDER, TOM_006, CHARLOTTE, TOM006_INTRO_COURSES, EXPECTED_ENGLISH_TARGET, COURSE_FIELDS,
}
