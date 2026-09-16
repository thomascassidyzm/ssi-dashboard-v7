/**
 * recordist-takeg-queue.test.cjs — TAKE G as a human-recordable line.
 *
 * Take G is the estate's own idea: tools/render-take-g.cjs has rendered "the
 * sentence spoken by its turn's cast voice with a pause forced at every chunk
 * seam" for TTS courses since 2026-07-09, and tools/slice-take-g.cjs turns that
 * one take into per-unit ms spans in atom_map_fine. A human-only language could
 * never have one, because render-take-g needs TTS. These lock the rules that let
 * a person read it in the booth instead:
 *
 *   - a sentence gets a Take G line exactly when it DECLARES its seams
 *     (atom_map_fine with two or more atoms), and no other sentence is touched;
 *   - the line is read GAPPED, and says so, or the booth auto-advances through
 *     the pauses that are the whole point of it;
 *   - it is scored by its OWN slot (takeg_audio_ids) and NEVER by text — the
 *     natural take of the same words must not mark it recorded;
 *   - a COLLAPSED DUPLICATE still gets its own Take G, because a Take G is
 *     sliced against its own sentence's map;
 *   - it sorts immediately after its own natural line, never in a section of
 *     its own.
 */

'use strict'

const test = require('node:test')
const assert = require('node:assert')
const {
  buildQueue, resolveRecordist, parseTakeGLineId, takeGLineId, takeGChunks,
  takeGChunksDetail, takeGBare,
} = require('./recordist-queue.cjs')

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
  voices: { m: { name: 'Tom', email: 't@x.com', voiceId: 'human_tom_zzz' } },
}]

const COURSE = {
  course_code: 'zzz_test2_for_eng',
  target_lang: 'zzz',
  known_lang: 'eng',
  voice_config: {
    podCast: { Customer: { gender: 'm', voiceId: 'human_tom_zzz' } },
    voices: { target1: { provider: 'human', voiceId: 'human_tom_zzz' } },
  },
}
const POD = { id: 'zzz_test2_for_eng:p1', course_code: 'zzz_test2_for_eng', slug: 'p1', title: 'Pod one' }

const MAP = [
  { kind: 'atom', gloss: 'one', target_surface: 'zzz un', target_start_ms: null, target_end_ms: null },
  { kind: 'atom', gloss: 'and two', target_surface: 'a dau', target_start_ms: null, target_end_ms: null },
]

function sentence(id, order, text, extra = {}) {
  return {
    id, pod_id: POD.id, global_order: order, speaker: 'Customer',
    target_text: text, known_text: 'one and two',
    target_audio_id: null, rerecord_wanted: null,
    atom_map_fine: null, takeg_audio_ids: null,
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

const linesOf = async (db) => (await buildQueue(db, await resolveRecordist(db, 'human_tom_zzz'), { includeRecorded: true })).lines

test('a Take G line id round-trips, and nothing else parses as one', () => {
  assert.deepEqual(parseTakeGLineId(takeGLineId('abc')), { sentenceId: 'abc' })
  assert.equal(parseTakeGLineId('abc'), null, 'a bare sentence id is the natural line')
  assert.equal(parseTakeGLineId('seed:abc:target1'), null)
  assert.equal(parseTakeGLineId('takeg:'), null)
  assert.equal(parseTakeGLineId(null), null)
})

test('takeGChunks reads the declaration, and refuses anything that declares no seams', () => {
  assert.equal(takeGChunks({ atom_map_fine: null }), null, 'no map, no seams')
  assert.equal(takeGChunks({ atom_map_fine: [MAP[0]] }), null, 'one unit has no joint to pause at')
  assert.equal(takeGChunks({ atom_map_fine: [MAP[0], { kind: 'atom', gloss: 'x', target_surface: '  ' }] }), null,
    'a unit with nothing to read is not a seam')
  assert.deepEqual(takeGChunks({ atom_map_fine: MAP }), [
    { target: 'zzz un', known: 'one' },
    { target: 'a dau', known: 'and two' },
  ])
  // kind:'note' entries are skipped, the same way slice-take-g.cjs skips them.
  assert.equal(takeGChunks({ atom_map_fine: [...MAP, { kind: 'note', gloss: 'aside' }] }).length, 2)
})

test('ONLY a sentence that declares its seams gets a second line', async () => {
  const lines = await linesOf(fixture([
    sentence('s1', 1, 'zzz un a dau', { atom_map_fine: MAP }),
    sentence('s2', 2, 'rhywbeth arall'),
  ]))
  const takeg = lines.filter((l) => l.kind === 'takeg')
  assert.equal(takeg.length, 1, 'the undeclared sentence is untouched')
  assert.equal(takeg[0].id, takeGLineId('s1'))
  assert.equal(lines.filter((l) => l.kind === 'pod').length, 2, 'both natural lines are still there')
})

test('the Take G line is read GAPPED, shows its seams, and carries the chunk list', async () => {
  const [takeg] = (await linesOf(fixture([sentence('s1', 1, 'zzz un a dau', { atom_map_fine: MAP })])))
    .filter((l) => l.kind === 'takeg')
  assert.equal(takeg.readStyle, 'gapped',
    'a natural readStyle would let the booth auto-advance through the pauses')
  assert.equal(takeg.text, 'zzz un … a dau', 'the reader is shown where to pause')
  assert.equal(takeg.knownText, 'one … and two')
  assert.deepEqual(takeg.takeGChunks.map((c) => c.target), ['zzz un', 'a dau'])
  assert.equal(takeg.canEditText, false, 'the sentence is the thing with text; this is a way of reading it')
})

test('a Take G is NOT marked recorded by a natural take of the same words', async () => {
  // The natural line's own take, filed under the same text by the same voice —
  // which is exactly what would fool a text lookup.
  const db = fixture(
    [sentence('s1', 1, 'zzz un a dau', { atom_map_fine: MAP, target_audio_id: 'clip-natural' })],
    [{ id: 'clip-natural', voice_id: 'human_tom_zzz', text_normalized: 'zzz un a dau', language: 'zzz', role: 'target1', course_code: COURSE.course_code }],
  )
  const lines = await linesOf(db)
  const pod = lines.find((l) => l.kind === 'pod')
  const takeg = lines.find((l) => l.kind === 'takeg')
  assert.equal(pod.recorded, true, 'the natural read is done')
  assert.equal(takeg.recorded, false,
    'a take with no gaps in it must never mark the gapped line done — the slicer would find no seams')
})

test('a Take G IS marked recorded by its own slot', async () => {
  const db = fixture(
    [sentence('s1', 1, 'zzz un a dau', { atom_map_fine: MAP, takeg_audio_ids: ['clip-g'] })],
    [{ id: 'clip-g', voice_id: 'human_tom_zzz', text_normalized: 'zzz un … a dau', language: 'zzz', role: 'pod_take_g', course_code: COURSE.course_code }],
  )
  const takeg = (await linesOf(db)).find((l) => l.kind === 'takeg')
  assert.equal(takeg.recorded, true)
})

test('a COLLAPSED DUPLICATE still gets its own Take G', async () => {
  // Two sentences reading the same words: one natural take fills both slots, so
  // the second natural line collapses into the first. The gapped line must not
  // collapse with it — this is the live case that cost Catrin her fifth pilot
  // line, 4 Take G lines where 5 were staged.
  const lines = await linesOf(fixture([
    sentence('s1', 1, 'zzz un a dau'),
    sentence('s2', 2, 'zzz un a dau', { atom_map_fine: MAP }),
  ]))
  assert.equal(lines.filter((l) => l.kind === 'pod').length, 1, 'one recording fills both natural slots')
  const takeg = lines.filter((l) => l.kind === 'takeg')
  assert.equal(takeg.length, 1, 'the duplicate is the sentence that declared the seams; its Take G survives')
  assert.equal(takeg[0].id, takeGLineId('s2'))
})

test('a Take G sorts immediately after its own natural line', async () => {
  const lines = await linesOf(fixture([
    sentence('s1', 1, 'zzz un a dau', { atom_map_fine: MAP }),
    sentence('s2', 2, 'zzz un a dau eto', { atom_map_fine: MAP }),
  ]))
  assert.deepEqual(lines.map((l) => `${l.kind}:${l.id}`), [
    'pod:s1', 'takeg:takeg:s1', 'pod:s2', 'takeg:takeg:s2',
  ], 'read each sentence twice while it is in the mouth, never 57 and then 57 again')
})

/**
 * THE PILOT SENTENCES, WORD FOR WORD.
 *
 * The five cym_n health-ladder pilot lines as they stand in the database on
 * 2026-09-16 — their real target_text and their real atom_map_fine. Two of them
 * carry words that belong to no declared chunk ("ac" in hg01; "rŵan" and "ac" in
 * hg47), which is precisely the defect: joining the chunk surfaces asked the
 * reader for a DIFFERENT SENTENCE, and the full-sentence rung sliced from that
 * take would have been missing a word for ever.
 */
const PILOT = [
  {
    id: 'hg20',
    text: "Fedrwch chi ddeud eich dyddiad geni wrtha i — i mi fod yn siŵr mai chi ydy'r person iawn?",
    surfaces: ['fedrwch chi ddeud eich dyddiad geni wrtha i', "i mi fod yn siŵr mai chi ydy'r person iawn"],
  },
  {
    id: 'hg03',
    text: "Os awn ni'n sownd, mi fedra i alw ar rywun sy'n siarad Cymraeg yn fwy hyderus na fi.",
    surfaces: ["os awn ni'n sownd", 'mi fedra i alw ar rywun', "sy'n siarad Cymraeg yn fwy hyderus na fi"],
  },
  {
    id: 'hg32',
    text: "Mae'r fraich chwith yn iawn. Mi fydd y cwff yn gwasgu am chydig eiliadau rŵan — wedyn mae o'n gollwng.",
    surfaces: ["mae'r fraich chwith yn iawn", 'mi fydd y cwff yn gwasgu', 'am chydig eiliadau rŵan', "wedyn mae o'n gollwng"],
  },
  {
    id: 'hg01',
    text: "Os dw i'n deud rhywbeth sydd ddim yn glir, stopiwch fi, plîs — ac mi ddeuda i o eto.",
    surfaces: ["os dw i'n deud", 'rhywbeth sydd ddim yn glir', 'stopiwch fi, plîs', 'mi ddeuda i o eto'],
  },
  {
    id: 'hg47',
    text: "Yn ara deg rŵan — steddwch ar ochr y gwely gynta, ac mi adawn ni i'ch pen chi ddal i fyny efo chi.",
    surfaces: ['yn ara deg', 'steddwch ar ochr y gwely gynta', "mi adawn ni i'ch pen chi ddal i fyny efo chi"],
  },
]
const mapOf = (surfaces) => surfaces.map((t, i) => ({ kind: 'atom', gloss: `g${i}`, target_surface: t }))

test('every pilot gapped read IS its own sentence — every word, in order', () => {
  for (const p of PILOT) {
    const chunks = takeGChunks({ target_text: p.text, atom_map_fine: mapOf(p.surfaces) })
    assert.ok(chunks, `${p.id}: the map must align to its own sentence`)
    assert.equal(
      takeGBare(chunks.map((c) => c.target).join(' ')), takeGBare(p.text),
      `${p.id}: the gapped read drops words — a Take G of it could never yield the whole-sentence rung`,
    )
  }
})

test('a leftover rides with the neighbour the sentence breathes towards', () => {
  const chunksOf = (p) => takeGChunks({ target_text: p.text, atom_map_fine: mapOf(p.surfaces) }).map((c) => c.target)
  // "…, stopiwch fi, plîs — ac mi ddeuda i o eto." The seam is the dash, so "ac"
  // opens the clause behind it.
  assert.deepEqual(chunksOf(PILOT[3]).slice(2), ['stopiwch fi, plîs', 'ac mi ddeuda i o eto'])
  // "Yn ara deg rŵan — steddwch…, ac mi adawn ni…": the same rule, read both
  // ways round — "rŵan" is in front of its dash and stays with "yn ara deg".
  assert.deepEqual(chunksOf(PILOT[4]), [
    'yn ara deg rŵan',
    'steddwch ar ochr y gwely gynta',
    "ac mi adawn ni i'ch pen chi ddal i fyny efo chi",
  ])
})

test('a map that belongs to some other wording is refused, and says which it is', () => {
  const detail = takeGChunksDetail({
    target_text: 'Experimente paracetamol para a dor.',
    atom_map_fine: mapOf(['Tome paracetamol', 'para a dor']),
  })
  assert.equal(detail.chunks, null, 'no honest gapped read exists for a map of different words')
  assert.equal(detail.reason, 'map_is_not_this_sentence')
  assert.equal(takeGChunksDetail({ atom_map_fine: null }).reason, 'no_map')
  assert.equal(takeGChunksDetail({ target_text: 'x', atom_map_fine: mapOf(['x']) }).reason, 'no_seams')
})

test('a sentence whose map is not its own gets no Take G line, and is counted', async () => {
  const db = fixture([sentence('s1', 1, 'geiriau hollol wahanol', { atom_map_fine: MAP })])
  const queue = await buildQueue(db, await resolveRecordist(db, 'human_tom_zzz'), { includeRecorded: true })
  assert.equal(queue.lines.filter((l) => l.kind === 'takeg').length, 0)
  assert.equal(queue.takeGUnalignable, 1, 'never dropped in silence')
})
