/**
 * recordist-seed-queue.test.cjs — SEED SENTENCES as the queue's third source.
 *
 * The rules that decide whether a recordist is handed the right seed line, and
 * whether the known (English) side can ever reach a live course:
 *
 *   - a seed is CAST from voice_config.voices, never guessed from a speaker it
 *     does not have;
 *   - an uncast slot is counted once, not 668 times, and reaches nobody;
 *   - the known side enters a queue on a zzz_ TEST FIXTURE and nowhere else;
 *   - "recorded" is the seed's own SLOT filled by THIS voice — not "a clip of
 *     this text exists", which cannot tell target1 from target2 and can never
 *     see a known-side take at all (it is filed under 'eng');
 *   - a sentence appearing in two courses is ONE reading;
 *   - a seed line does NOT collapse into a pod line that reads the same, because
 *     the two are different rows to fill.
 */

'use strict'

const test = require('node:test')
const assert = require('node:assert')
const { buildQueue, resolveRecordist, parseSeedLineId, seedLineId } = require('./recordist-queue.cjs')

function stubDb(tables) {
  return {
    from(table) {
      let rows = (tables[table] || []).slice()
      const q = {
        select() { return q },
        eq(col, val) { rows = rows.filter((r) => r[col] === val); return q },
        in(col, vals) { rows = rows.filter((r) => vals.includes(r[col])); return q },
        ilike(col, val) {
          const want = String(val).toLowerCase()
          rows = rows.filter((r) => String(r[col] || '').toLowerCase() === want)
          return q
        },
        not(col, op, val) {
          if (op === 'is' && val === null) rows = rows.filter((r) => r[col] != null)
          return q
        },
        order() { return q },
        range(from, to) { return Promise.resolve({ data: rows.slice(from, to + 1), error: null }) },
        maybeSingle() { return Promise.resolve({ data: rows[0] || null, error: null }) },
        then(resolve, reject) { return Promise.resolve({ data: rows, error: null }).then(resolve, reject) },
      }
      return q
    },
  }
}

const POLICY = [{
  language: 'zzz',
  human_only: true,
  voices: {
    m: { name: 'Tom', email: 't@x.com', voiceId: 'human_tom_zzz' },
    f: { name: 'Test F', email: 'f@x.com', voiceId: 'human_test_f_zzz' },
  },
}]

const CAST_BOTH = {
  podCast: { Customer: { gender: 'm', voiceId: 'human_tom_zzz' } },
  voices: {
    target1: { provider: 'human', voiceId: 'human_tom_zzz' },
    target2: { provider: 'human', voiceId: 'human_test_f_zzz' },
    known: { provider: 'human', voiceId: 'human_tom_zzz' },
  },
}

function fixture({ courses, seeds, audio = [], sentences = [], pods = [] } = {}) {
  return {
    language_recording_policy: POLICY,
    courses,
    listening_pods: pods,
    listening_pod_sentences: sentences,
    course_seeds: seeds,
    course_audio: audio,
  }
}

const FIXTURE_COURSE = { course_code: 'zzz_test2_for_eng', target_lang: 'zzz', known_lang: 'eng', voice_config: CAST_BOTH }
const LIVE_COURSE = { course_code: 'live_x_for_eng', target_lang: 'zzz', known_lang: 'eng', voice_config: CAST_BOTH }

function seed(id, n, target, known, extra = {}) {
  return {
    id, course_code: 'zzz_test2_for_eng', seed_number: n,
    target_text: target, known_text: known,
    known_audio_id: null, target1_audio_id: null, target2_audio_id: null,
    ...extra,
  }
}

test('a seed line id round-trips, and nothing else parses as one', () => {
  assert.deepEqual(parseSeedLineId(seedLineId('abc', 'target1')), { seedId: 'abc', role: 'target1' })
  assert.deepEqual(parseSeedLineId('seed:9f0e-11:known'), { seedId: '9f0e-11', role: 'known' })
  assert.equal(parseSeedLineId('9f0e-11'), null, 'a bare uuid is a pod line, not a seed line')
  assert.equal(parseSeedLineId('seed:abc:presentation'), null, 'only the three seed slots exist')
  assert.equal(parseSeedLineId('seed::target1'), null)
  assert.equal(parseSeedLineId(null), null)
})

test('a cast seed sentence reaches its voice, target side and known side', async () => {
  const db = stubDb(fixture({
    courses: [FIXTURE_COURSE],
    seeds: [seed('u1', 1, 'Zzz un', 'One in English')],
  }))
  const tom = await resolveRecordist(db, 'human_tom_zzz')
  const q = await buildQueue(db, tom)
  const kinds = q.lines.filter((l) => l.kind === 'seed').map((l) => `${l.role}:${l.text}`)
  assert.deepEqual(kinds.sort(), ['known:One in English', 'target1:Zzz un'])
  // The female voice reads target2 — the other slot the course casts to her.
  const f = await resolveRecordist(db, 'human_test_f_zzz')
  const hers = (await buildQueue(db, f)).lines.filter((l) => l.kind === 'seed')
  assert.deepEqual(hers.map((l) => l.role), ['target2'])
})

test('the KNOWN side never enters a queue on a course that is not a test fixture', async () => {
  const db = stubDb(fixture({
    courses: [{ ...LIVE_COURSE }],
    seeds: [{ ...seed('u1', 1, 'Zzz un', 'One in English'), course_code: 'live_x_for_eng' }],
  }))
  const tom = await resolveRecordist(db, 'human_tom_zzz')
  const q = await buildQueue(db, tom)
  const roles = q.lines.filter((l) => l.kind === 'seed').map((l) => l.role)
  assert.deepEqual(roles, ['target1'], 'the target side is queued; the English side is not')
})

test('an uncast slot reaches nobody, and is counted ONCE — not once per sentence', async () => {
  const uncastCourse = { course_code: 'zzz_bare_for_eng', target_lang: 'zzz', known_lang: 'eng', voice_config: { voices: { target1: { voiceId: '' }, target2: { voiceId: '' } } } }
  const db = stubDb(fixture({
    courses: [uncastCourse],
    seeds: [1, 2, 3, 4, 5].map((n) => ({ ...seed(`u${n}`, n, `Zzz ${n}`, `E ${n}`), course_code: 'zzz_bare_for_eng' })),
  }))
  const tom = await resolveRecordist(db, 'human_tom_zzz')
  const q = await buildQueue(db, tom)
  assert.equal(q.lines.filter((l) => l.kind === 'seed').length, 0, 'nobody is cast, so nobody is asked')
  // Three slots on a fixture course (target1, target2, known) — the uncast thing
  // is the SLOT, not each of five sentences.
  assert.equal(q.uncast, 3)
})

test('a filled slot is done; the SAME words in the other slot are still owed', async () => {
  const db = stubDb(fixture({
    courses: [FIXTURE_COURSE],
    seeds: [seed('u1', 1, 'Zzz un', 'One in English', { target1_audio_id: 'a1' })],
    audio: [{ id: 'a1', voice_id: 'human_tom_zzz', text_normalized: 'zzz un', language: 'zzz' }],
  }))
  const tom = await resolveRecordist(db, 'human_tom_zzz')
  const all = await buildQueue(db, tom, { includeRecorded: true })
  const t1 = all.lines.find((l) => l.role === 'target1' && l.kind === 'seed')
  assert.equal(t1.recorded, true, 'the slot this voice filled is done')
  const f = await resolveRecordist(db, 'human_test_f_zzz')
  const t2 = (await buildQueue(db, f, { includeRecorded: true })).lines.find((l) => l.role === 'target2')
  assert.equal(t2.recorded, false, 'target2 holds the same words and is a different slot')
})

test('a slot filled by SOMEBODY ELSE is not this voice’s take', async () => {
  const db = stubDb(fixture({
    courses: [FIXTURE_COURSE],
    seeds: [seed('u1', 1, 'Zzz un', 'One in English', { target1_audio_id: 'a1' })],
    audio: [{ id: 'a1', voice_id: 'someone_else', text_normalized: 'zzz un', language: 'zzz' }],
  }))
  const tom = await resolveRecordist(db, 'human_tom_zzz')
  const t1 = (await buildQueue(db, tom, { includeRecorded: true })).lines.find((l) => l.role === 'target1' && l.kind === 'seed')
  assert.equal(t1.recorded, false)
})

test('one sentence in two courses is ONE reading, and it says how many it fills', async () => {
  const other = { course_code: 'zzz_test2b_for_eng', target_lang: 'zzz', known_lang: 'eng', voice_config: CAST_BOTH }
  const db = stubDb(fixture({
    courses: [FIXTURE_COURSE, other],
    seeds: [
      seed('u1', 1, 'Zzz un', 'One in English'),
      { ...seed('u2', 1, 'Zzz un', 'One in English'), course_code: 'zzz_test2b_for_eng' },
    ],
  }))
  const tom = await resolveRecordist(db, 'human_tom_zzz')
  const q = await buildQueue(db, tom)
  const t1 = q.lines.filter((l) => l.kind === 'seed' && l.role === 'target1')
  assert.equal(t1.length, 1, 'read once')
  assert.equal(t1[0].alsoFills, 1, 'and it fills the other course too')
})

test('a rep whose duplicate is still empty is NOT done', async () => {
  const other = { course_code: 'zzz_test2b_for_eng', target_lang: 'zzz', known_lang: 'eng', voice_config: CAST_BOTH }
  const db = stubDb(fixture({
    courses: [FIXTURE_COURSE, other],
    seeds: [
      seed('u1', 1, 'Zzz un', 'One in English', { target1_audio_id: 'a1' }),
      { ...seed('u2', 1, 'Zzz un', 'One in English'), course_code: 'zzz_test2b_for_eng' },
    ],
    audio: [{ id: 'a1', voice_id: 'human_tom_zzz', text_normalized: 'zzz un', language: 'zzz' }],
  }))
  const tom = await resolveRecordist(db, 'human_tom_zzz')
  const t1 = (await buildQueue(db, tom, { includeRecorded: true })).lines.find((l) => l.kind === 'seed' && l.role === 'target1')
  assert.equal(t1.recorded, false, 'one copy linked, the other empty — the line is still owed')
})

test('a seed line does NOT collapse into a pod line that reads the same', async () => {
  const db = stubDb(fixture({
    courses: [FIXTURE_COURSE],
    pods: [{ id: 'p1', course_code: 'zzz_test2_for_eng', slug: 'pod-0' }],
    sentences: [{ id: 'sp1', pod_id: 'p1', global_order: 1, speaker: 'Customer', target_text: 'Zzz un', known_text: 'One in English' }],
    seeds: [seed('u1', 1, 'Zzz un', 'One in English')],
  }))
  const tom = await resolveRecordist(db, 'human_tom_zzz')
  const q = await buildQueue(db, tom)
  assert.equal(q.lines.filter((l) => l.kind === 'pod').length, 1)
  assert.equal(q.lines.filter((l) => l.kind === 'seed' && l.role === 'target1').length, 1,
    'a pod take links a pod FK and leaves the seed slot empty — they are different rows to fill')
})

test('seed lines come after pod lines, in seed order, stably', async () => {
  const db = stubDb(fixture({
    courses: [FIXTURE_COURSE],
    pods: [{ id: 'p1', course_code: 'zzz_test2_for_eng', slug: 'pod-0' }],
    sentences: [{ id: 'sp1', pod_id: 'p1', global_order: 1, speaker: 'Customer', target_text: 'Pod line', known_text: 'Pod line' }],
    seeds: [seed('u3', 3, 'Zzz tri', 'Three'), seed('u1', 1, 'Zzz un', 'One'), seed('u2', 2, 'Zzz dau', 'Two')],
  }))
  const tom = await resolveRecordist(db, 'human_tom_zzz')
  const first = (await buildQueue(db, tom)).lines
  const again = (await buildQueue(db, tom)).lines
  assert.deepEqual(first.map((l) => l.id), again.map((l) => l.id), 'the same order on both loads')
  assert.equal(first[0].kind, 'pod')
  const seedNums = first.filter((l) => l.kind === 'seed').map((l) => l.seedNumber)
  assert.deepEqual(seedNums, [1, 1, 2, 2, 3, 3], 'seed order, both slots of each')
})

test('a seed line is never editable from the booth', async () => {
  const db = stubDb(fixture({
    courses: [FIXTURE_COURSE],
    seeds: [seed('u1', 1, 'Zzz un', 'One in English')],
  }))
  const tom = await resolveRecordist(db, 'human_tom_zzz')
  const q = await buildQueue(db, tom)
  for (const l of q.lines.filter((x) => x.kind === 'seed')) {
    assert.equal(l.canEditText, false,
      'a seed sentence is course content — the booth must not draw an Edit button that can only 403')
  }
})
