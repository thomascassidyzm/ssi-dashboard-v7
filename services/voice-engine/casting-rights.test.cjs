// ARTIST RIGHTS DERIVE FROM CASTING, NOT FROM THE USERS PAGE (Tom, 2026-09-12).
// A cast email opens its course; an uncast email is refused with a sentence
// naming the course and voice; an editor grant still shapes the course.
'use strict'

const test = require('node:test')
const assert = require('node:assert')
const {
  castingForEmail, castingIdentity, withCasting, courseAccessVerdict, podWriteVerdict, isOwnPodLine,
  castingForVoice, hintEmail,
} = require('./casting-rights.cjs')

function stubDb(tables) {
  return {
    from(table) {
      let rows = (tables[table] || []).slice()
      const q = {
        select() { return q },
        eq(col, val) { rows = rows.filter((r) => r[col] === val); return q },
        in(col, vals) { rows = rows.filter((r) => vals.includes(r[col])); return q },
        ilike(col, val) { const w = String(val).toLowerCase(); rows = rows.filter((r) => String(r[col] || '').toLowerCase() === w); return q },
        order() { return q },
        maybeSingle() { return Promise.resolve({ data: rows[0] || null, error: null }) },
        then(resolve, reject) { return Promise.resolve({ data: rows, error: null }).then(resolve, reject) },
      }
      return q
    },
  }
}

const TOM = 'thomas.cassidy+ssi@gmail.com'
const db = stubDb({
  language_recording_policy: [{
    language: 'zzz', human_only: true,
    voices: { m: { voiceId: 'human_tom_zzz', name: 'Tom', email: TOM, gender: 'm', dialect: 'standard' } },
  }],
  courses: [
    { course_code: 'zzz_test2_for_eng', target_lang: 'zzz', known_lang: 'eng', dialect: null, voice_config: { voices: { target1: 'human_tom_zzz' } } },
    { course_code: 'cym_n_for_eng', target_lang: 'cym', known_lang: 'eng', dialect: 'north', voice_config: { podCast: { Aran: { voiceId: 'human_aran_cym_n', email: 'aran@example.com', gender: 'm' } } } },
  ],
  dashboard_users: [],
})

test('a cast email resolves as cast on its course, with no users-page row at all', async () => {
  const casting = await castingForEmail(db, TOM.toUpperCase())
  assert.deepStrictEqual(casting.map((c) => c.courseCode), ['zzz_test2_for_eng'])
  assert.strictEqual(casting[0].voiceId, 'human_tom_zzz')
  const me = castingIdentity(TOM, casting)
  assert.deepStrictEqual(me.courses, ['zzz_test2_for_eng'])
  assert.strictEqual(me.authority, 'casting')
  assert.deepStrictEqual(courseAccessVerdict(me, 'zzz_test2_for_eng'), { ok: true, by: 'casting', voices: ['human_tom_zzz'] })
  // a per-course podCast entry by email is a casting on that course too
  const aran = await castingForEmail(db, 'Aran@Example.com')
  assert.deepStrictEqual(aran.map((c) => c.courseCode), ['cym_n_for_eng'])
  const aranMe = castingIdentity('aran@example.com', aran)
  assert.strictEqual(isOwnPodLine({ user: aranMe, courseCode: 'cym_n_for_eng', castEntry: { voiceId: 'human_aran_cym_n' } }), true)
  assert.strictEqual(isOwnPodLine({ user: aranMe, courseCode: 'cym_n_for_eng', castEntry: { voiceId: 'human_catrin' } }), false)
  assert.strictEqual(isOwnPodLine({ user: aranMe, courseCode: 'cym_n_for_eng', castEntry: null }), false)
})

test('an uncast email is refused with a sentence naming the course and the voice', async () => {
  const me = castingIdentity(TOM, await castingForEmail(db, TOM))
  const v = courseAccessVerdict(me, 'cym_n_for_eng')
  assert.strictEqual(v.ok, false)
  assert.ok(v.sentence.includes('not cast on cym_n_for_eng'), v.sentence)
  assert.ok(v.sentence.includes('human_tom_zzz on zzz_test2_for_eng'), v.sentence)
  assert.strictEqual(castingIdentity('nobody@example.com', await castingForEmail(db, 'nobody@example.com')), null)
  const stranger = withCasting({ email: 'nobody@example.com', role: 'editor', courses: ['spa_for_eng'] }, [])
  assert.strictEqual(courseAccessVerdict(stranger, 'zzz_test2_for_eng').sentence,
    'nobody@example.com is not cast on zzz_test2_for_eng. No casting on zzz_test2_for_eng names nobody@example.com, and no editor grant does either.')
})

test('the cast artist edits a line; only the editor changes the cast or adds/removes', async () => {
  const me = castingIdentity(TOM, await castingForEmail(db, TOM))
  assert.deepStrictEqual(podWriteVerdict(me, 'zzz_test2_for_eng', 'PATCH', '/sentence/abc'), { ok: true, by: 'casting', ownLineOnly: true })
  const cast = podWriteVerdict(me, 'zzz_test2_for_eng', 'PUT', '/cast')
  assert.strictEqual(cast.ok, false)
  assert.ok(cast.sentence.includes('belong to the course editor'), cast.sentence)
  assert.strictEqual(podWriteVerdict(me, 'zzz_test2_for_eng', 'POST', '/sentence/abc/proofread').ok, false)
  // grants are kept: an editor still does everything they did
  const editor = withCasting({ email: 'ed@example.com', role: 'editor', courses: ['zzz_test2_for_eng'] }, [])
  assert.deepStrictEqual(courseAccessVerdict(editor, 'zzz_test2_for_eng'), { ok: true, by: 'grant', voices: [] })
  assert.deepStrictEqual(podWriteVerdict(editor, 'zzz_test2_for_eng', 'PUT', '/cast'), { ok: true, by: 'grant' })
  assert.deepStrictEqual(podWriteVerdict(editor, 'zzz_test2_for_eng', 'DELETE', '/sentence/abc'), { ok: true, by: 'grant' })
})

test('a booth link answers where its voice is cast and hints the email to sign in with', async () => {
  assert.deepStrictEqual(await castingForVoice(db, 'human_tom_zzz'), {
    voiceId: 'human_tom_zzz', displayName: 'Tom', languageName: 'Test Language',
    courses: ['zzz_test2_for_eng'], emailHint: 't...i@gmail.com',
  })
  assert.strictEqual(await castingForVoice(db, 'human_nobody'), null)
  assert.strictEqual(hintEmail('a@b.c'), 'a...@b.c')
})

// THE USAGE SIGNAL (Tom, 2026-09-12): reaches counted per day, refusals loud,
// and the nightly verdict red on zero-or-refusal.
test('reaches are written once per day per course, refusals every time, and the nightly reads them', async () => {
  const os = require('os'); const path = require('path'); const fs = require('fs')
  const ledger = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'casting-')), 'access.jsonl')
  process.env.CASTING_ACCESS_LEDGER = ledger
  const { recordAccess } = require('./casting-rights.cjs')
  const { readEvents, summarise, verdict } = require('../../tools/casting-access-report.cjs')
  const quiet = { info() {}, warn() {} }
  const now = Date.parse('2026-09-12T10:00:00Z')
  recordAccess({ kind: 'reach', email: TOM, voices: ['human_tom_zzz'], courseCode: 'zzz_test2_for_eng', method: 'GET', path: '/x', logger: quiet, now })
  assert.strictEqual(recordAccess({ kind: 'reach', email: TOM, voices: ['human_tom_zzz'], courseCode: 'zzz_test2_for_eng', method: 'GET', path: '/y', logger: quiet, now: now + 1000 }), null)
  const events = readEvents(ledger)
  assert.strictEqual(events.length, 1)
  let s = summarise(events, { now: now + 3600000 })
  assert.deepStrictEqual(s.days.map((d) => [d.day, d.artists, d.reaches, d.refusals.length]), [['2026-09-12', 1, 1, 0]])
  assert.deepStrictEqual(verdict(s), { ok: true, reasons: [] })
  // a refusal turns the nightly red and names voice + course
  recordAccess({ kind: 'refused', email: TOM, voices: ['human_tom_zzz'], courseCode: 'cym_n_for_eng', method: 'GET', path: '/z', sentence: 'not cast here', logger: quiet, now: now + 2000 })
  s = summarise(readEvents(ledger), { now: now + 3600000 })
  const v = verdict(s)
  assert.strictEqual(v.ok, false)
  assert.ok(v.reasons[0].includes('human_tom_zzz') && v.reasons[0].includes('cym_n_for_eng'), v.reasons[0])
  // a day with nothing at all is red too, never silent
  assert.strictEqual(verdict(summarise(readEvents(ledger), { now: now + 3 * 86400000 })).last24h, undefined)
  assert.strictEqual(verdict(summarise(readEvents(ledger), { now: now + 3 * 86400000 })).ok, false)
})
