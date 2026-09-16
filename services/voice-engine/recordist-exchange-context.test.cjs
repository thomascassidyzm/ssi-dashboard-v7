/**
 * recordist-exchange-context.test.cjs — THE EXCHANGE AROUND THE LINE.
 *
 * Aran (North Welsh), 2026-09-16, agreed by Tom: he was proofreading all 438
 * lines of the cym_n health pod on the POD PAGE before recording, because to
 * judge a line he has to see it IN CONTEXT — both speakers — and in the booth
 * he only ever sees his own lines. So the queue carries the lines either side
 * of each pod line, and these lock which kinds get them and which do not.
 *
 * It costs no extra database read: every sentence of the language's pods is
 * already in memory when the queue is built.
 */

'use strict'

const test = require('node:test')
const assert = require('node:assert')
const { buildQueue, resolveRecordist } = require('./recordist-queue.cjs')

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
  course_code: 'zzz_for_eng',
  target_lang: 'zzz',
  known_lang: 'eng',
  voice_config: {
    podCast: { Wil: { gender: 'm', voiceId: ARAN, name: 'Wil' }, Sian: { gender: 'f', voiceId: CATRIN, name: 'Siân' } },
    voices: { target1: { provider: 'human', voiceId: ARAN } },
  },
}

const DIALOGUE_POD = { id: 'zzz_for_eng:health', course_code: 'zzz_for_eng', slug: 'health', title: 'Health', metadata: {} }
const SOLO_POD = {
  id: 'zzz_for_eng:seeds', course_code: 'zzz_for_eng', slug: 'seeds', title: 'Seed set',
  metadata: { solo_readers: [ARAN, CATRIN] },
}

function sentence(podId, id, order, speaker, target, known, scene = 1) {
  return {
    id, pod_id: podId, scene_number: scene, global_order: order, speaker,
    target_text: target, known_text: known,
    target_audio_id: null, rerecord_wanted: null, atom_map_fine: null, takeg_audio_ids: null,
  }
}

// One scene of four lines, alternating speakers: Siân, Wil, Siân, Wil.
const EXCHANGE = [
  sentence(DIALOGUE_POD.id, 'd1', 1, 'Sian', 'sut wyt ti', 'how are you'),
  sentence(DIALOGUE_POD.id, 'd2', 2, 'Wil', 'dw i wedi blino', "I'm tired"),
  sentence(DIALOGUE_POD.id, 'd3', 3, 'Sian', 'ers pryd', 'since when'),
  sentence(DIALOGUE_POD.id, 'd4', 4, 'Wil', 'ers dydd Llun', 'since Monday'),
  // A different situation entirely — scene 2 is never context for scene 1.
  sentence(DIALOGUE_POD.id, 'd5', 5, 'Sian', 'bore da', 'good morning', 2),
]

function fixture(pods, sentences) {
  return stubDb({
    language_recording_policy: POLICY,
    courses: [COURSE],
    listening_pods: pods,
    listening_pod_sentences: sentences,
    course_seeds: [],
    course_audio: [],
  })
}

const linesFor = async (db, voiceId) =>
  (await buildQueue(db, await resolveRecordist(db, voiceId), { includeRecorded: true })).lines

test("a pod line carries the exchange around it — the OTHER speaker's lines, named", async () => {
  const lines = await linesFor(fixture([DIALOGUE_POD], EXCHANGE), ARAN)
  const d2 = lines.find((l) => l.id === 'd2')
  assert.ok(d2, "Wil's line is in Aran's queue")
  assert.ok(d2.context, 'and it carries its context')
  assert.deepEqual(d2.context.before.map((c) => [c.speaker, c.text]), [['Sian', 'sut wyt ti']],
    'the line before it is hers, and it says whose it is')
  assert.deepEqual(d2.context.after.map((c) => [c.speaker, c.text]),
    [['Sian', 'ers pryd'], ['Wil', 'ers dydd Llun']],
    'and the two lines after it, in order')
  assert.equal(d2.context.before[0].knownText, 'how are you', 'both sides of the cue line are on the wire')
})

test('the exchange stops at a scene boundary, and never runs past the ends', async () => {
  const lines = await linesFor(fixture([DIALOGUE_POD], EXCHANGE), ARAN)
  const d4 = lines.find((l) => l.id === 'd4')
  assert.deepEqual(d4.context.after, [], 'scene 2 is a different situation, not context for scene 1')
  assert.deepEqual(d4.context.before.map((c) => c.text), ['dw i wedi blino', 'ers pryd'],
    'two each side, nearest last')
})

test("a SOLO-READER pod's line gets no context — its neighbours are unrelated seeds", async () => {
  const seeds = [
    sentence(SOLO_POD.id, 's1', 1, '', 'un a dau', 'one and two'),
    sentence(SOLO_POD.id, 's2', 2, '', 'tri a phedwar', 'three and four'),
    sentence(SOLO_POD.id, 's3', 3, '', 'pump a chwech', 'five and six'),
  ]
  const lines = await linesFor(fixture([SOLO_POD], seeds), ARAN)
  const s2 = lines.find((l) => l.id === 's2')
  assert.ok(s2, 'the seed is in his queue')
  assert.equal(s2.context, null, 'a seed set is not a conversation')
})

test('a Take G companion carries no context of its own', async () => {
  const withMap = EXCHANGE.map((s) => (s.id === 'd2'
    ? { ...s, atom_map_fine: [{ kind: 'atom', gloss: 'I have', target_surface: 'dw i wedi' }, { kind: 'atom', gloss: 'tired', target_surface: 'blino' }] }
    : s))
  const lines = await linesFor(fixture([DIALOGUE_POD], withMap), ARAN)
  const takeg = lines.find((l) => l.kind === 'takeg')
  assert.ok(takeg, 'the gapped companion exists')
  assert.equal(takeg.context, null, 'the gapped read is a slicing job, not a scene')
})
