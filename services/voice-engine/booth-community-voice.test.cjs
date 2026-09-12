// A COMMUNITY VOICE NEEDS NO POLICY ROW (closing job #311's honest gap,
// 2026-09-12). A brand-new community language has no language_recording_policy
// row; its editor casts at least two artists on the course (voice_config.podCast)
// and sends each a link. The ONE resolver both doors call must admit such a
// voice to THAT course only: the link lands in the booth on the course, the
// email login reaches the same booth, each artist sees their own lines and
// nobody else's, no other course is reachable, and the usage ledger counts the
// reach on the same email/course keys either way.
'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
process.env.CASTING_ACCESS_LEDGER = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'community-voice-')), 'casting-access.jsonl')

const test = require('node:test')
const assert = require('node:assert')
const { buildQueue, resolveRecordist, voicesForEmail } = require('./recordist-queue.cjs')
const { castingForEmail, castingIdentity, courseAccessVerdict, boothArrival, accessLedger } = require('./casting-rights.cjs')

function stubDb(tables) {
  return {
    from(table) {
      let rows = (tables[table] || []).slice()
      const q = {
        select() { return q },
        eq(col, val) { rows = rows.filter((r) => r[col] === val); return q },
        in(col, vals) { rows = rows.filter((r) => vals.includes(r[col])); return q },
        ilike(col, val) { const w = String(val).toLowerCase(); rows = rows.filter((r) => String(r[col] || '').toLowerCase() === w); return q },
        not(col, op, val) { if (op === 'is' && val === null) rows = rows.filter((r) => r[col] != null); return q },
        order() { return q },
        range(from, to) { return Promise.resolve({ data: rows.slice(from, to + 1), error: null }) },
        maybeSingle() { return Promise.resolve({ data: rows[0] || null, error: null }) },
        then(resolve, reject) { return Promise.resolve({ data: rows, error: null }).then(resolve, reject) },
      }
      return q
    },
  }
}

const BEA = 'bea@example.com', BEA_VOICE = 'human_bea_swa'
const KOFI = 'kofi@example.com', KOFI_VOICE = 'human_kofi_swa'
// Swahili: a real language code, NO policy row. Two Swahili courses so the
// per-course scope is proved against a sibling course of the SAME language.
function fixture() {
  return {
    language_recording_policy: [],
    dashboard_users: [],
    courses: [
      { course_code: 'swa_for_eng', target_lang: 'swa', known_lang: 'eng', voice_config: { podCast: {
        Bea: { name: 'Bea', gender: 'f', voiceId: BEA_VOICE, email: BEA },
        Kofi: { name: 'Kofi', gender: 'm', voiceId: KOFI_VOICE, email: KOFI },
      } } },
      { course_code: 'swa_for_fra', target_lang: 'swa', known_lang: 'fra', voice_config: { podCast: {
        Zawadi: { name: 'Zawadi', gender: 'f', voiceId: 'human_zawadi_swa', email: 'zawadi@example.com' },
      } } },
      { course_code: 'cym_n_for_eng', target_lang: 'cym', known_lang: 'eng', voice_config: { podCast: {
        Aran: { voiceId: 'human_aran_cym_n', gender: 'm', email: 'aran@example.com' },
      } } },
    ],
    listening_pods: [
      { id: 'p1', course_code: 'swa_for_eng', slug: 'pod-1', title: 'Pod 1' },
      { id: 'p2', course_code: 'swa_for_fra', slug: 'pod-1', title: 'Pod 1' },
    ],
    listening_pod_sentences: [
      { id: 's1', pod_id: 'p1', global_order: 1, speaker: 'Bea', target_text: 'Habari.', known_text: 'Hello.' },
      { id: 's2', pod_id: 'p1', global_order: 2, speaker: 'Kofi', target_text: 'Nzuri.', known_text: 'Fine.' },
      { id: 's3', pod_id: 'p1', global_order: 3, speaker: 'Bea', target_text: 'Asante.', known_text: 'Thanks.' },
      { id: 's4', pod_id: 'p2', global_order: 1, speaker: 'Zawadi', target_text: 'Karibu.', known_text: 'Welcome.' },
    ],
    // Bea has read one of her two lines.
    course_audio: [{ language: 'swa', voice_id: BEA_VOICE, text_normalized: 'habari' }],
  }
}

const quiet = { info() {}, warn() {} }

test('a cast-only voice on a language with no policy row resolves through both doors, to its course alone', async () => {
  const db = stubDb(fixture())
  for (const [email, voiceId, own, theirs] of [[BEA, BEA_VOICE, ['Habari.', 'Asante.'], 'Nzuri.'], [KOFI, KOFI_VOICE, ['Nzuri.'], 'Habari.']]) {
    // The link door, as the editor's Copy link spells it: /r/<voiceId>?course=swa_for_eng
    const viaLink = await resolveRecordist(db, voiceId, { course: 'swa_for_eng' })
    assert.ok(viaLink, `${voiceId} is a live recording voice with no policy row`)
    assert.deepStrictEqual(viaLink.castCourses, ['swa_for_eng'], 'scoped to the course the cast names, not the language')
    assert.strictEqual(viaLink.language, 'swa')
    // The email door: no users-page row, no policy email - the cast alone.
    const viaEmail = await voicesForEmail(db, email)
    assert.strictEqual(viaEmail.length, 1)
    const { castVia, ...sameVoice } = viaEmail[0]
    assert.deepStrictEqual(sameVoice, viaLink, 'the email login finds exactly the same voice')
    assert.deepStrictEqual(castVia, { login: false, policy: false, podCast: ['swa_for_eng'] })

    const qLink = await buildQueue(db, viaLink, { includeRecorded: true })
    const qEmail = await buildQueue(db, viaEmail[0], { includeRecorded: true })
    assert.deepStrictEqual(qEmail, qLink, 'the same booth through either door')
    assert.deepStrictEqual(qLink.lines.map((l) => l.text), own, `${email} sees their own lines and only those`)
    assert.ok(!qLink.lines.some((l) => l.text === theirs), 'never the other artist\'s line')
    assert.ok(!qLink.lines.some((l) => l.courseCode !== 'swa_for_eng'), 'never another course, even of the same language')
    assert.deepStrictEqual(qLink.courses, ['swa_for_eng'])

    // The course gate answers the same for both doors, and the casting never
    // spills onto the sibling Swahili course.
    const casting = await castingForEmail(db, email)
    assert.deepStrictEqual([...new Set(casting.map((c) => c.courseCode))], ['swa_for_eng'])
    const emailIdentity = castingIdentity(email, casting)
    const arrival = await boothArrival({ db, recordist: viaLink, courseCodes: ['swa_for_eng'], path: `/r/${voiceId}?course=swa_for_eng`, logger: quiet })
    assert.deepStrictEqual(arrival.identity, emailIdentity)
    assert.deepStrictEqual(arrival.reached, ['swa_for_eng'])
    assert.strictEqual(courseAccessVerdict(emailIdentity, 'swa_for_fra').ok, false, 'not the sibling course')
    assert.strictEqual(courseAccessVerdict(emailIdentity, 'cym_n_for_eng').ok, false, 'not another language')
  }
  // Recorded state is identical through both doors and per artist.
  const bea = await buildQueue(db, await resolveRecordist(db, BEA_VOICE, { course: 'swa_for_eng' }), { includeRecorded: true })
  assert.deepStrictEqual(bea.lines.map((l) => [l.text, l.recorded]), [['Habari.', true], ['Asante.', false]])
  assert.strictEqual(bea.recorded, 1)
})

test('a cast-only voice\'s link to a course it is not cast on is refused loudly, and reaches are keyed on the cast email', async () => {
  const db = stubDb(fixture())
  const bea = await resolveRecordist(db, BEA_VOICE)
  assert.ok(bea, 'the unscoped link still resolves - to the cast courses')
  assert.deepStrictEqual(bea.castCourses, ['swa_for_eng'])
  const now = Date.parse('2032-01-01T10:00:00Z')
  fs.writeFileSync(accessLedger(), '')

  const ok = await boothArrival({ db, recordist: bea, courseCodes: ['swa_for_eng'], path: '/r', logger: quiet, now })
  assert.deepStrictEqual([ok.reached, ok.refused], [['swa_for_eng'], []])
  const warned = []
  const bad = await boothArrival({ db, recordist: bea, courseCodes: ['swa_for_fra'], path: '/r', logger: { info() {}, warn: (m) => warned.push(m) }, now })
  assert.deepStrictEqual(bad.reached, [])
  assert.ok(bad.refused[0].sentence.includes('not cast on swa_for_fra'), bad.refused[0].sentence)
  assert.ok(warned.some((m) => m.includes('[CastingAccess] REFUSED')))

  const events = fs.readFileSync(accessLedger(), 'utf8').trim().split('\n').map((l) => JSON.parse(l))
  assert.deepStrictEqual(events.map((e) => [e.kind, e.email, e.courseCode]), [
    ['reach', BEA, 'swa_for_eng'],
    ['refused', BEA, 'swa_for_fra'],
  ])
})

test('a cast entry with no email and no policy row still resolves, and its arrival is scoped to its cast course', async () => {
  const tables = fixture()
  delete tables.courses[0].voice_config.podCast.Kofi.email
  const db = stubDb(tables)
  const kofi = await resolveRecordist(db, KOFI_VOICE, { course: 'swa_for_eng' })
  assert.ok(kofi)
  assert.strictEqual(kofi.email, null)
  const now = Date.parse('2033-01-01T10:00:00Z')
  const ok = await boothArrival({ db, recordist: kofi, courseCodes: ['swa_for_eng'], path: '/r', logger: quiet, now })
  assert.deepStrictEqual(ok.reached, ['swa_for_eng'])
  const bad = await boothArrival({ db, recordist: kofi, courseCodes: ['swa_for_fra'], path: '/r', logger: quiet, now })
  assert.deepStrictEqual(bad.reached, [], 'no email is not a licence to reach any course the link names')
})
