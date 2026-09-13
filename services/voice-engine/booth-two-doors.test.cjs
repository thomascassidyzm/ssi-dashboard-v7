// ONE IDENTITY, TWO DOORS (Tom, 2026-09-12). The community course editor's
// "Copy link" (/r/:voiceId?course=) and the artist's email login must be the
// SAME person: same voice, same booth, same recorded/unrecorded state - and
// the usage ledger must count a link arrival exactly as it counts a login, so
// the nightly report cannot tell the doors apart. Never lose a recording:
// what is recorded through one door is recorded through the other.
'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
process.env.CASTING_ACCESS_LEDGER = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'two-doors-')), 'casting-access.jsonl')

const test = require('node:test')
const assert = require('node:assert')
const { buildQueue, resolveRecordist, voicesForEmail } = require('./recordist-queue.cjs')
const { castingForEmail, castingIdentity, courseAccessVerdict, boothArrival, accessLedger } = require('./casting-rights.cjs')

/** Minimal PostgREST-shaped stub: only the calls these modules make. */
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

const ANA = 'ana@example.com'
const VOICE = 'human_ana_spa'
// The editor cast Ana (by email) on her community course; the language policy
// names the same voice with the same email. She has read one of her two lines.
function fixture() {
  return {
    language_recording_policy: [{
      language: 'spa', human_only: true,
      voices: { f: { name: 'Ana', email: ANA, voiceId: VOICE, gender: 'f' } },
    }],
    courses: [
      { course_code: 'spa_for_eng', target_lang: 'spa', known_lang: 'eng', voice_config: { podCast: { Ana: { name: 'Ana', gender: 'f', voiceId: VOICE, email: ANA } } } },
      { course_code: 'cym_n_for_eng', target_lang: 'cym', known_lang: 'eng', voice_config: { podCast: { Aran: { voiceId: 'human_aran_cym_n', gender: 'm', email: 'aran@example.com' } } } },
    ],
    listening_pods: [{ id: 'p1', course_code: 'spa_for_eng', slug: 'pod-1', title: 'Pod 1' }],
    listening_pod_sentences: [
      { id: 's1', pod_id: 'p1', global_order: 1, speaker: 'Ana', target_text: 'Hola.', known_text: 'Hello.' },
      { id: 's2', pod_id: 'p1', global_order: 2, speaker: 'Ana', target_text: 'Buenas noches.', known_text: 'Good night.' },
    ],
    course_audio: [{ language: 'spa', voice_id: VOICE, text_normalized: 'hola' }],
    // NO users-page row on purpose: rights derive from casting, not from the users page.
    dashboard_users: [],
  }
}

test('the link and the email login resolve to the same voice and the same booth, recorded state included', async () => {
  const db = stubDb(fixture())
  // The link door: /r/human_ana_spa
  const viaLink = await resolveRecordist(db, VOICE)
  // The email door: sign in as ana@example.com, with no dashboard_users row at all
  const viaEmail = await voicesForEmail(db, ANA)
  assert.strictEqual(viaEmail.length, 1, 'the cast email finds exactly her voice')
  // The email door also says WHERE the voice came from (castVia, the 2026-09-12
  // leak fix); the voice itself is the link door's voice, field for field.
  const { castVia, ...sameVoice } = viaEmail[0]
  assert.deepStrictEqual(sameVoice, viaLink, 'same person, same voice, same dialect and gender')
  assert.deepStrictEqual(castVia, { login: false, policy: true, podCast: ['spa_for_eng'] })

  const qLink = await buildQueue(db, viaLink, { includeRecorded: true })
  const qEmail = await buildQueue(db, viaEmail[0], { includeRecorded: true })
  assert.deepStrictEqual(qEmail, qLink, 'the same booth through either door')
  assert.strictEqual(qLink.recorded, 1, 'her recording is a recording through both doors')
  assert.deepStrictEqual(qLink.lines.map((l) => [l.text, l.recorded]), [['Hola.', true], ['Buenas noches.', false]])

  // And the course gate answers the same for both: the link arrival is the
  // email identity, verbatim.
  const emailIdentity = castingIdentity(ANA, await castingForEmail(db, ANA))
  const arrival = await boothArrival({ db, recordist: viaLink, courseCodes: ['spa_for_eng'], path: '/api/recording/voice/human_ana_spa?course=spa_for_eng', logger: { info() {}, warn() {} } })
  assert.deepStrictEqual(arrival.identity, emailIdentity)
  assert.deepStrictEqual(courseAccessVerdict(arrival.identity, 'spa_for_eng'), courseAccessVerdict(emailIdentity, 'spa_for_eng'))
})

test('a link arrival is a reach with the same email/course keys as a login, and a wrong-course link is refused loudly', async () => {
  const db = stubDb(fixture())
  const ana = await resolveRecordist(db, VOICE)
  const quiet = { info() {}, warn() {} }
  // A different day from the test above: a reach is deduped per day per
  // email per course, and that first test already reached spa_for_eng today.
  const now = Date.parse('2030-01-01T10:00:00Z')
  fs.writeFileSync(accessLedger(), '')

  const ok = await boothArrival({ db, recordist: ana, courseCodes: ['spa_for_eng'], path: '/r', logger: quiet, now })
  assert.deepStrictEqual(ok.reached, ['spa_for_eng'])
  assert.deepStrictEqual(ok.refused, [])

  const warned = []
  const bad = await boothArrival({ db, recordist: ana, courseCodes: ['cym_n_for_eng'], path: '/r', logger: { info() {}, warn: (m) => warned.push(m) }, now })
  assert.deepStrictEqual(bad.reached, [])
  assert.strictEqual(bad.refused.length, 1)
  assert.ok(bad.refused[0].sentence.includes('not cast on cym_n_for_eng'), bad.refused[0].sentence)
  assert.ok(warned.some((m) => m.includes('[CastingAccess] REFUSED')), 'refusal is logged loudly')

  const events = fs.readFileSync(accessLedger(), 'utf8').trim().split('\n').map((l) => JSON.parse(l))
  assert.deepStrictEqual(events.map((e) => [e.kind, e.email, e.courseCode]), [
    ['reach', ANA, 'spa_for_eng'],
    ['refused', ANA, 'cym_n_for_eng'],
  ])
  // the reach is keyed on the EMAIL the login would carry, so the nightly
  // report (tools/casting-access-report.cjs) reads the two doors as one artist
  assert.strictEqual(events[0].email, ANA)
})

test('a voice the editor cast BY EMAIL, with no email on the policy row and no users-page row, is one person through both doors', async () => {
  // The community case: the editor names the person on the cast; the language
  // policy names the voice but not the address. The email door must still find
  // the voice (voicesForEmail reads the cast), and the link door must still be
  // keyed on the cast's email - or the nightly would count two people.
  const tables = fixture()
  tables.language_recording_policy[0].voices.f.email = null
  const db = stubDb(tables)
  const viaLink = await resolveRecordist(db, VOICE)
  assert.strictEqual(viaLink.email, null, 'the policy row carries no address')
  const viaEmail = await voicesForEmail(db, ANA)
  assert.strictEqual(viaEmail.length, 1, 'the email door finds her voice from the cast alone')
  const { castVia, ...sameVoice } = viaEmail[0]
  assert.deepStrictEqual(sameVoice, viaLink, 'the email door finds her voice from the cast alone')
  assert.deepStrictEqual(castVia, { login: false, policy: false, podCast: ['spa_for_eng'] }, 'and knows it came from the cast, not the policy')

  const now = Date.parse('2031-01-01T10:00:00Z')
  fs.writeFileSync(accessLedger(), '')
  const arrival = await boothArrival({ db, recordist: viaLink, courseCodes: ['spa_for_eng'], path: '/r', logger: { info() {}, warn() {} }, now })
  assert.strictEqual(arrival.email, ANA, 'the link arrival is keyed on the email the cast names')
  const events = fs.readFileSync(accessLedger(), 'utf8').trim().split('\n').map((l) => JSON.parse(l))
  assert.deepStrictEqual(events.map((e) => [e.kind, e.email, e.courseCode]), [['reach', ANA, 'spa_for_eng']])
})

test('the language-wide link of a policy voice arrives on the courses of ITS DIALECT only — never refused on a sibling dialect it does not read', async () => {
  // The 2026-09-13 nightly red: Aran (north policy voice) opened his language-wide
  // link and the arrival was checked against EVERY Welsh course, so the south and
  // standard-dialect courses his queue never serves were logged as refusals of a
  // cast artist. The queue hands a policy voice lines in its own dialect only
  // (lineVoiceId), so the courses the queue serves — and the arrival is counted
  // on — are the courses of that dialect, and no other.
  const ARAN = 'aran@example.com'
  const db = stubDb({
    language_recording_policy: [{
      language: 'cym', human_only: true,
      voices: { m: { name: 'Aran', email: ARAN, voiceId: 'human_aran_cym_n', gender: 'm', dialect: 'north' } },
    }],
    courses: [
      { course_code: 'cym_n_for_eng', target_lang: 'cym', known_lang: 'eng', dialect: 'north', voice_config: {} },
      { course_code: 'cym_s_for_eng', target_lang: 'cym', known_lang: 'eng', dialect: 'south', voice_config: {} },
      { course_code: 'cym_for_yor', target_lang: 'cym', known_lang: 'yor', dialect: 'standard', voice_config: {} },
    ],
    listening_pods: [
      { id: 'pn', course_code: 'cym_n_for_eng', slug: 'pod-1', title: 'North' },
      { id: 'ps', course_code: 'cym_s_for_eng', slug: 'pod-1', title: 'South' },
    ],
    listening_pod_sentences: [
      { id: 'n1', pod_id: 'pn', global_order: 1, speaker: 'Aran', target_text: 'Bore da.', known_text: 'Good morning.' },
      { id: 's1', pod_id: 'ps', global_order: 1, speaker: 'Aran', target_text: 'Bore da.', known_text: 'Good morning.' },
    ],
    course_audio: [],
    dashboard_users: [],
  })
  const aran = await resolveRecordist(db, 'human_aran_cym_n')
  assert.strictEqual(aran.dialect, 'north')
  const queue = await buildQueue(db, aran, { includeRecorded: true })
  assert.deepStrictEqual(queue.courses, ['cym_n_for_eng'], 'the queue serves the courses of his dialect and no other')

  const now = Date.parse('2032-01-01T10:00:00Z')
  fs.writeFileSync(accessLedger(), '')
  const warned = []
  // Exactly what the language-wide link door does: recordist-router GET /voice/:voiceId, no ?course=
  const arrival = await boothArrival({ db, recordist: aran, courseCodes: queue.courses, path: '/api/recording/voice/human_aran_cym_n?includeRecorded=1', logger: { info() {}, warn: (m) => warned.push(m) }, now })
  assert.deepStrictEqual(arrival.refused, [], 'a cast artist opening his own link is never refused')
  assert.deepStrictEqual(arrival.reached, ['cym_n_for_eng'])
  assert.deepStrictEqual(warned, [])
  const events = fs.readFileSync(accessLedger(), 'utf8').trim().split('\n').map((l) => JSON.parse(l))
  assert.deepStrictEqual(events.map((e) => [e.kind, e.courseCode]), [['reach', 'cym_n_for_eng']])
})
