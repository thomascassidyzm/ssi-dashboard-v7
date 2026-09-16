/**
 * recordist-solo-readers.test.cjs — TWO RECORDISTS ON ONE LINE.
 *
 * Aran, 2026-09-16, on the health-seed ladder pilot: "in the drafts requiring
 * proofreading for the health seeds, they seem to be doubled up — two versions
 * of each translation, one for Nurse Sian and one for Wil Hughes." The set had
 * been staged as a pod with a character per voice, so five seeds were ten rows.
 *
 * Tom's ruling: these are seeds, read SOLO by both voices — ONE line per seed,
 * no character, two takes. These lock what that means in the queue:
 *
 *   - a pod naming metadata.solo_readers gives EACH reader its own queue line
 *     for the SAME sentence, and never reads the sentence's speaker;
 *   - each reader gets the Take G companion too, so the ladder can be sliced in
 *     both voices;
 *   - the Take G pointer is PER READER: the second reader's take never unlinks
 *     the first's and re-offers a line they have already read;
 *   - a staging that attaches a character, or writes one seed twice, is refused
 *     before it can reach the database.
 */

'use strict'

const test = require('node:test')
const assert = require('node:assert')
const { buildQueue, resolveRecordist, takeGLineId } = require('./recordist-queue.cjs')
const { assertNoCharacters, soloReaderTakeGIds } = require('../shared/pod-solo-readers.cjs')

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

const ARAN = 'human_aran_zzz'
const CATRIN = 'human_catrin_zzz'

const POLICY = [{
  language: 'zzz',
  human_only: true,
  voices: {
    m: { name: 'Aran', email: 'a@x.com', voiceId: ARAN, gender: 'm' },
    f: { name: 'Catrin', email: 'c@x.com', voiceId: CATRIN, gender: 'f' },
  },
}]

const COURSE = {
  course_code: 'zzz_solo_for_eng',
  target_lang: 'zzz',
  known_lang: 'eng',
  voice_config: { podCast: {}, voices: { target1: { provider: 'human', voiceId: ARAN } } },
}

const POD = {
  id: 'zzz_solo_for_eng:seeds',
  course_code: 'zzz_solo_for_eng',
  slug: 'seeds',
  title: 'Seed set',
  metadata: { solo_readers: [ARAN, CATRIN] },
}

const MAP = [
  { kind: 'atom', gloss: 'one', target_surface: 'zzz un' },
  { kind: 'atom', gloss: 'and two', target_surface: 'a dau' },
]

function seedLine(id, order, extra = {}) {
  return {
    id, pod_id: POD.id, global_order: order,
    // NO CHARACTER — the shape under test.
    speaker: '',
    target_text: 'zzz un a dau', known_text: 'one and two',
    target_audio_id: null, rerecord_wanted: null,
    atom_map_fine: MAP, takeg_audio_ids: null,
    ...extra,
  }
}

function fixture(sentences, audio = []) {
  return stubDb({
    language_recording_policy: POLICY,
    courses: [COURSE],
    listening_pods: [POD],
    listening_pod_sentences: sentences,
    course_seeds: [],
    course_audio: audio,
  })
}

const linesFor = async (db, voiceId) =>
  (await buildQueue(db, await resolveRecordist(db, voiceId), { includeRecorded: true })).lines

test('one seed, no character: BOTH readers get it, once each, natural + gapped', async () => {
  const db = fixture([seedLine('s1', 1)])
  for (const voice of [ARAN, CATRIN]) {
    const lines = await linesFor(db, voice)
    const mine = lines.filter((l) => l.podId === POD.id)
    assert.equal(mine.filter((l) => l.kind === 'pod').length, 1, `${voice} sees the seed once`)
    assert.equal(mine.filter((l) => l.kind === 'takeg').length, 1, `${voice} gets its gapped companion`)
    assert.equal(mine.length, 2, `${voice} gets exactly two lines from one seed`)
    assert.equal(mine.find((l) => l.kind === 'pod').speaker, null,
      'no character is named on a seed line — the doubling was one character per voice')
    assert.equal(mine.find((l) => l.kind === 'takeg').id, takeGLineId('s1'))
  }
})

test('five seeds are five lines per reader, not ten — the doubling Aran reported', async () => {
  const db = fixture([1, 2, 3, 4, 5].map((i) => seedLine(`s${i}`, i, {
    target_text: `brawddeg ${i} un a dau`,
    atom_map_fine: [
      { kind: 'atom', gloss: 'one', target_surface: `brawddeg ${i} un` },
      { kind: 'atom', gloss: 'and two', target_surface: 'a dau' },
    ],
  })))
  for (const voice of [ARAN, CATRIN]) {
    const mine = (await linesFor(db, voice)).filter((l) => l.podId === POD.id)
    assert.equal(mine.filter((l) => l.kind === 'pod').length, 5, `${voice}: five seeds, read once each`)
    assert.equal(mine.filter((l) => l.kind === 'takeg').length, 5)
    assert.equal(mine.length, 10, `${voice}: ten takes — five natural, five gapped`)
  }
})

test("a reader's Take G is scored by their OWN pointer, never by the other reader's", async () => {
  // Aran has recorded the gapped read; Catrin has not. The pointer array is
  // positional per READER on a solo pod: [Aran, Catrin].
  const db = fixture(
    [seedLine('s1', 1, { takeg_audio_ids: ['clip-aran'] })],
    [{ id: 'clip-aran', voice_id: ARAN, language: 'zzz', text_normalized: 'zzz un … a dau', role: 'pod_take_g' }],
  )
  const aran = (await linesFor(db, ARAN)).find((l) => l.kind === 'takeg')
  const catrin = (await linesFor(db, CATRIN)).find((l) => l.kind === 'takeg')
  assert.equal(aran.recorded, true, "Aran's own slot holds his gapped take")
  assert.equal(catrin.recorded, false, "his take is not hers — she has still to read it")
})

test('filing a second reader\'s Take G leaves the first reader\'s pointer alone', () => {
  const first = soloReaderTakeGIds(POD, null, [ARAN], 'clip-aran')
  assert.deepEqual(first, ['clip-aran', null])
  const second = soloReaderTakeGIds(POD, first, [CATRIN], 'clip-catrin')
  assert.deepEqual(second, ['clip-aran', 'clip-catrin'],
    'a shared single-entry array would have unlinked his take and re-offered a line he had read')
  assert.equal(soloReaderTakeGIds(POD, second, ['human_stranger_zzz'], 'x'), null, 'a stranger writes nothing')
})

test('the guard refuses a seed-set staging that attaches characters or doubles a seed', () => {
  assert.throws(() => assertNoCharacters(
    { ...POD, speakers: { 'Nurse Siân': {}, 'Wil Hughes': {} } },
    [seedLine('s1', 1)],
  ), /may not attach characters/)
  assert.throws(() => assertNoCharacters(POD, [
    seedLine('s1:catrin', 1, { speaker: 'Nurse Siân' }),
  ]), /may not name a character/)
  assert.throws(() => assertNoCharacters(POD, [
    seedLine('s1', 1), seedLine('s1', 2, { target_text: 'a different translation entirely' }),
  ]), /ONE line per seed/)
  // A pod with no declared solo_readers is not a valid seed-set staging at all.
  assert.throws(() => assertNoCharacters(
    { id: 'p', speakers: {}, metadata: {} },
    [seedLine('s1', 1)],
  ), /must declare metadata\.solo_readers/)
})
