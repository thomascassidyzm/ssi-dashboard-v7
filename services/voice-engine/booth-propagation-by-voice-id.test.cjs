// ONE PROPAGATION KEY: (language, voice id, text). Tom, 2026-09-12 12:08Z:
// "human recorded languages are ok to propagate across because IF the text is
// the same then the voice selected will be the same won't it? E.g. Macedonian
// for either target or known, for main course content or for pods, will always
// be the same line for the male voice and the female voice. I guess we
// probably should be a little more definite about this."
//
// So: a take by voice V of text T fills every line of the language whose text
// is T and whose cast voice is V -- and two voices of the SAME gender reading
// the SAME words never share a take. Gender is a property of the voice, not a
// key. Before this change a policy voice collapsed by language+gender+dialect+
// text (so a second female voice arriving later would have inherited the
// first's lines) and a cast-only voice by cast voice id; this is the one rule.
//
// The cast: Macedonian WITH a policy row naming Goran (m) and Elena (f).
// mkd_for_eng, mkd_for_fra and mkd_for_deu all cast Ana to Elena -- mkd_for_deu
// by GENDER ONLY, the policy naming who carries it. mkd_for_fra also casts
// Vesna to Mira, a second female voice the policy does not name, and Vesna
// reads exactly the words Ana reads.
'use strict'

const test = require('node:test')
const assert = require('node:assert')
const {
  buildQueue, resolveRecordist, propagateTakeToDuplicates, clearRerecordWants,
  lineVoiceId, voiceRegister,
} = require('./recordist-queue.cjs')

const ELENA = 'human_elena_mkd', GORAN = 'human_goran_mkd', MIRA = 'human_mira_mkd'
const TEXT = 'Добро утро.'

function fixture() {
  return {
    language_recording_policy: [{ language: 'mkd', human_only: true, voices: {
      m: { name: 'Goran', voiceId: GORAN, aliases: ['human_goran_mkd_old'] },
      f: { name: 'Elena', voiceId: ELENA },
    } }],
    dashboard_users: [],
    courses: [
      { course_code: 'mkd_for_eng', target_lang: 'mkd', known_lang: 'eng', voice_config: { podCast: {
        Ana: { name: 'Elena', gender: 'f', voiceId: ELENA },
        Petar: { name: 'Goran', gender: 'm', voiceId: 'human_goran_mkd_old' },
      } } },
      { course_code: 'mkd_for_fra', target_lang: 'mkd', known_lang: 'fra', voice_config: { podCast: {
        Ana: { name: 'Elena', gender: 'f', voiceId: ELENA },
        Vesna: { name: 'Mira', gender: 'f', voiceId: MIRA, email: 'mira@example.com' },
      } } },
      { course_code: 'mkd_for_deu', target_lang: 'mkd', known_lang: 'deu', voice_config: { podCast: {
        Ana: { name: 'Elena', gender: 'f' },
      } } },
    ],
    listening_pods: [
      { id: 'p_eng', course_code: 'mkd_for_eng', slug: 'pod-1', title: 'Pod 1' },
      { id: 'p_fra', course_code: 'mkd_for_fra', slug: 'pod-1', title: 'Pod 1' },
      { id: 'p_deu', course_code: 'mkd_for_deu', slug: 'pod-1', title: 'Pod 1' },
    ],
    listening_pod_sentences: [
      { id: 's_eng', pod_id: 'p_eng', global_order: 1, speaker: 'Ana', target_text: TEXT, known_text: 'Good morning.' },
      { id: 's_eng2', pod_id: 'p_eng', global_order: 2, speaker: 'Petar', target_text: 'Здраво.', known_text: 'Hi.' },
      { id: 's_fra', pod_id: 'p_fra', global_order: 1, speaker: 'Ana', target_text: TEXT, known_text: 'Bonjour.', rerecord_wanted: { target: { reason: 'clipped' } } },
      { id: 's_mira', pod_id: 'p_fra', global_order: 2, speaker: 'Vesna', target_text: TEXT, known_text: 'Bonjour.', rerecord_wanted: { target: { reason: 'clipped' } } },
      { id: 's_deu', pod_id: 'p_deu', global_order: 1, speaker: 'Ana', target_text: TEXT, known_text: 'Guten Morgen.' },
    ],
    course_audio: [],
  }
}

function stubDb(tables, writes = []) {
  return {
    from(table) {
      let rows = (tables[table] || []).slice()
      let op = 'read', patch = null
      const q = {
        select() { return q },
        eq(col, val) { rows = rows.filter((r) => r[col] === val); return q },
        in(col, vals) { rows = rows.filter((r) => vals.includes(r[col])); return q },
        ilike(col, val) { const w = String(val).toLowerCase(); rows = rows.filter((r) => String(r[col] || '').toLowerCase() === w); return q },
        not(col, op2, val) { if (op2 === 'is' && val === null) rows = rows.filter((r) => r[col] != null); return q },
        order() { return q },
        limit(n) { return Promise.resolve({ data: rows.slice(0, n), error: null }) },
        range(from, to) { return Promise.resolve({ data: rows.slice(from, to + 1), error: null }) },
        maybeSingle() { return Promise.resolve({ data: rows[0] || null, error: null }) },
        single() { return Promise.resolve({ data: op === 'upsert' ? { id: `new-${writes.length}`, ...patch } : rows[0] || null, error: null }) },
        update(p) { op = 'update'; patch = p; return q },
        upsert(p) { op = 'upsert'; patch = p; writes.push({ table, op, row: p }); return q },
        then(resolve, reject) {
          if (op === 'update') writes.push({ table, op, patch, ids: rows.map((r) => r.id) })
          return Promise.resolve({ data: rows, error: null }).then(resolve, reject)
        },
      }
      return q
    },
  }
}

const quiet = { log() {}, info() {}, warn() {}, error() {} }

test('the key resolves the cast to a voice id: canonical for a policy spelling, itself for a community voice, the policy for a gender-only cast', async () => {
  const register = await voiceRegister(stubDb(fixture()), 'mkd')
  assert.equal(lineVoiceId({ voiceId: 'human_goran_mkd_old' }, register, 'standard'), GORAN, 'an old spelling is the policy voice')
  assert.equal(lineVoiceId({ voiceId: MIRA, gender: 'f' }, register, 'standard'), MIRA, 'a community voice is its own key')
  assert.equal(lineVoiceId({ gender: 'f' }, register, 'standard'), ELENA, 'the policy NAMES who carries a gender')
  assert.equal(lineVoiceId({ gender: 'f' }, { ...register, policyByBucket: new Map() }, 'standard'), null, 'nobody named: nobody')
})

test('one voice cast on three courses with identical text reads it ONCE, and one take fills all three', async () => {
  const writes = []
  const db = stubDb(fixture(), writes)
  const elena = await resolveRecordist(db, ELENA)
  const q = await buildQueue(db, elena, { includeRecorded: true })
  // The representative is the first copy met (courses in code order), and the
  // other two are what its one take also fills.
  assert.deepStrictEqual(q.lines.map((l) => [l.id, l.alsoFills]), [['s_deu', 2]], `Elena's queue: ${JSON.stringify(q.lines.map((l) => l.id))}`)
  const out = await propagateTakeToDuplicates({ db, recordist: elena, sentenceId: 's_deu', text: TEXT, s3Key: 'mastered/e.mp3', logger: quiet })
  assert.deepStrictEqual(out.linked.map((l) => l.sentenceId).sort(), ['s_eng', 's_fra'], 'her copies on mkd_for_eng and mkd_for_fra (cast by id); mkd_for_deu is cast by gender and the policy names her')
})

test('two voices of the same gender in one language with identical text do NOT share a take', async () => {
  const writes = []
  const db = stubDb(fixture(), writes)
  const mira = await resolveRecordist(db, MIRA, { course: 'mkd_for_fra' })
  assert.equal(mira.gender, 'f', 'Mira is female, exactly as Elena is')
  const q = await buildQueue(db, mira, { includeRecorded: true })
  assert.deepStrictEqual(q.lines.map((l) => [l.id, l.alsoFills]), [['s_mira', 0]], `Mira's queue: ${JSON.stringify(q.lines.map((l) => l.id))}`)

  // Elena's take reaches none of Mira's lines; Mira's reaches none of Elena's.
  const elena = await resolveRecordist(db, ELENA)
  const fromElena = await propagateTakeToDuplicates({ db, recordist: elena, sentenceId: 's_eng', text: TEXT, s3Key: 'mastered/e.mp3', logger: quiet })
  assert.ok(!fromElena.linked.some((l) => l.sentenceId === 's_mira'), `Elena's take landed on Mira's line: ${JSON.stringify(fromElena.linked)}`)
  const fromMira = await propagateTakeToDuplicates({ db, recordist: mira, sentenceId: 's_mira', text: TEXT, s3Key: 'mastered/m.mp3', logger: quiet })
  assert.deepStrictEqual(fromMira.linked, [], `Mira's take landed on ${JSON.stringify(fromMira.linked)}`)
})

test('a take retires the wants on ITS voice\'s copies of the text, never on the other voice\'s', async () => {
  const writes = []
  const db = stubDb(fixture(), writes)
  const elena = await resolveRecordist(db, ELENA)
  const cleared = await clearRerecordWants({ db, recordist: elena, text: TEXT, sentenceId: 's_eng', logger: quiet })
  assert.equal(cleared.sentences, 1)
  const lineWrites = writes.filter((w) => w.table === 'listening_pod_sentences')
  assert.deepStrictEqual(lineWrites.map((w) => w.ids).flat(), ['s_fra'], `wants retired on ${JSON.stringify(lineWrites)}`)
})
