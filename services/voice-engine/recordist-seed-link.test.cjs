/**
 * recordist-seed-link.test.cjs — LINKING A SEED TAKE TO ITS SLOT.
 *
 * The queue and the linker have to agree about whose slot a seed sentence is,
 * because they are two halves of one promise: the queue asks an artist to read
 * a line, and the linker files what they read. On 2026-09-03 they disagreed and
 * six of Aran's Welsh seed takes paid for it. Every one of those six seeds had
 * its target2_audio_id pointing at a `legacy_import` clip, so:
 *
 *   - the QUEUE listed the line, because the slot is not filled by Aran;
 *   - the LINKER then refused to move that same slot, because it is not
 *     filled by Aran.
 *
 * He recorded them, they saved, and the booth asked for them again — and would
 * have gone on asking forever.
 *
 * The second rule here is the other half of the same disagreement, in the
 * opposite direction: the linker used to write into EVERY course of the
 * language holding the same sentence, including courses the queue would never
 * have offered the line for. Eight cym_s_for_eng seed slots hold a Northern
 * take because of it.
 */

'use strict'

const test = require('node:test')
const assert = require('node:assert')
const { linkSeedTake, resolveRecordist } = require('./recordist-queue.cjs')

/** A stub supabase that also WRITES, so a link can be asserted rather than inferred. */
function stubDb(tables) {
  const db = {
    tables,
    from(table) {
      const all = tables[table] || (tables[table] = [])
      let rows = all.slice()
      const q = {
        select() { return q },
        update(patch) { q._patch = patch; return q },
        eq(col, val) {
          rows = rows.filter((r) => r[col] === val)
          if (q._patch) {
            for (const r of rows) Object.assign(r, q._patch)
            return Promise.resolve({ data: rows, error: null })
          }
          return q
        },
        in(col, vals) { rows = rows.filter((r) => vals.includes(r[col])); return q },
        order() { return q },
        range(from, to) { return Promise.resolve({ data: rows.slice(from, to + 1), error: null }) },
        maybeSingle() { return Promise.resolve({ data: rows[0] || null, error: null }) },
        then(res, rej) { return Promise.resolve({ data: rows, error: null }).then(res, rej) },
      }
      return q
    },
  }
  return db
}

const POLICY = [{
  language: 'zzz',
  human_only: true,
  voices: {
    m: { name: 'Tom', email: 't@x.com', voiceId: 'human_tom_zzz', gender: 'm' },
    f: { name: 'Test F', email: 'f@x.com', voiceId: 'human_test_f_zzz', gender: 'f' },
  },
}]

const CAST = {
  voices: {
    target1: { provider: 'human', voiceId: 'human_tom_zzz' },
    target2: { provider: 'human', voiceId: 'human_test_f_zzz' },
  },
}
const MINE = { course_code: 'live_a_for_eng', target_lang: 'zzz', known_lang: 'eng', voice_config: CAST, dialect: 'standard' }
/** Same language, same sentence, cast to nobody — never in anyone's queue. */
const UNCAST = { course_code: 'live_b_for_eng', target_lang: 'zzz', known_lang: 'eng', voice_config: null, dialect: 'standard' }

const QUIET = { warn() {}, error() {}, log() {} }

function fixture(seeds, audio) {
  return stubDb({
    language_recording_policy: POLICY,
    courses: [MINE, UNCAST],
    course_seeds: seeds,
    course_audio: audio,
  })
}

test('a slot held by an IMPORTED clip is the very thing the artist was asked to replace', async () => {
  const db = fixture(
    [{ id: 's1', course_code: 'live_a_for_eng', seed_number: 1, target_text: 'Zzz un', known_text: 'One', target1_audio_id: 'old', target2_audio_id: null, known_audio_id: null }],
    [{ id: 'old', voice_id: 'legacy_import' }, { id: 'new', voice_id: 'human_tom_zzz' }],
  )
  const tom = await resolveRecordist(db, 'human_tom_zzz')
  const out = await linkSeedTake({ db, recordist: tom, seedId: 's1', role: 'target1', audioId: 'new', logger: QUIET })
  assert.deepEqual(out.linked.map((l) => l.seedId), ['s1'])
  assert.equal(db.tables.course_seeds[0].target1_audio_id, 'new', 'the slot now holds the take that was just read')
})

test('a slot held by ANOTHER RECORDIST is still not ours to move', async () => {
  const db = fixture(
    [{ id: 's1', course_code: 'live_a_for_eng', seed_number: 1, target_text: 'Zzz un', known_text: 'One', target1_audio_id: 'hers', target2_audio_id: null, known_audio_id: null }],
    [{ id: 'hers', voice_id: 'human_test_f_zzz' }, { id: 'new', voice_id: 'human_tom_zzz' }],
  )
  const tom = await resolveRecordist(db, 'human_tom_zzz')
  const out = await linkSeedTake({ db, recordist: tom, seedId: 's1', role: 'target1', audioId: 'new', logger: QUIET })
  assert.deepEqual(out.linked, [])
  assert.equal(db.tables.course_seeds[0].target1_audio_id, 'hers')
})

test('an empty slot still takes the take — the ordinary case is unchanged', async () => {
  const db = fixture(
    [{ id: 's1', course_code: 'live_a_for_eng', seed_number: 1, target_text: 'Zzz un', known_text: 'One', target1_audio_id: null, target2_audio_id: null, known_audio_id: null }],
    [{ id: 'new', voice_id: 'human_tom_zzz' }],
  )
  const tom = await resolveRecordist(db, 'human_tom_zzz')
  const out = await linkSeedTake({ db, recordist: tom, seedId: 's1', role: 'target1', audioId: 'new', logger: QUIET })
  assert.deepEqual(out.linked.map((l) => l.seedId), ['s1'])
  assert.equal(db.tables.course_seeds[0].target1_audio_id, 'new')
})

test('a take never reaches a course whose seeds are in nobody\'s queue', async () => {
  const db = fixture(
    [
      { id: 's1', course_code: 'live_a_for_eng', seed_number: 1, target_text: 'Zzz un', known_text: 'One', target1_audio_id: null, target2_audio_id: null, known_audio_id: null },
      { id: 's2', course_code: 'live_b_for_eng', seed_number: 1, target_text: 'Zzz un', known_text: 'One', target1_audio_id: null, target2_audio_id: null, known_audio_id: null },
    ],
    [{ id: 'new', voice_id: 'human_tom_zzz' }],
  )
  const tom = await resolveRecordist(db, 'human_tom_zzz')
  const out = await linkSeedTake({ db, recordist: tom, seedId: 's1', role: 'target1', audioId: 'new', logger: QUIET })
  assert.deepEqual(out.linked.map((l) => l.seedId), ['s1'], 'only the course that cast him')
  assert.equal(db.tables.course_seeds[1].target1_audio_id, null, 'the uncast course keeps its empty slot')
})

test('the collapse promise holds: every copy in HIS OWN courses moves together', async () => {
  const OTHER_MINE = { course_code: 'live_c_for_eng', target_lang: 'zzz', known_lang: 'eng', voice_config: CAST, dialect: 'standard' }
  const db = stubDb({
    language_recording_policy: POLICY,
    courses: [MINE, OTHER_MINE],
    course_seeds: [
      { id: 's1', course_code: 'live_a_for_eng', seed_number: 1, target_text: 'Zzz un', known_text: 'One', target1_audio_id: null, target2_audio_id: null, known_audio_id: null },
      { id: 's2', course_code: 'live_c_for_eng', seed_number: 4, target_text: 'Zzz un.', known_text: 'One', target1_audio_id: null, target2_audio_id: null, known_audio_id: null },
    ],
    course_audio: [{ id: 'new', voice_id: 'human_tom_zzz' }],
  })
  const tom = await resolveRecordist(db, 'human_tom_zzz')
  const out = await linkSeedTake({ db, recordist: tom, seedId: 's1', role: 'target1', audioId: 'new', logger: QUIET })
  assert.deepEqual(out.linked.map((l) => l.seedId).sort(), ['s1', 's2'])
})
