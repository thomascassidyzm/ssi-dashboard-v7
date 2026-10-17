// The one coverage count (design v2.1 §5, job #258): pure fixtures, no database.
const { test } = require('node:test')
const assert = require('node:assert/strict')
test('the one count: seed bands, offerable at 100% of seeds 1-100 and 80% of the rest, human vs TTS, language rollup', () => {
  const { summariseSide, summariseLanguages, neededLines, OFFERABLE } = require('../../services/shared/voice-coverage.cjs')
  assert.deepEqual(OFFERABLE, { firstSeeds: 100, firstShare: 1, restShare: 0.8 })
  const { seedOf } = require('../../services/shared/voice-coverage.cjs')
  assert.deepEqual([seedOf({ seedId: 'S0042' }), seedOf({ legoId: 'S0101L02' }), seedOf({})], [42, 101, null])
  // seeds 1-100 need a, b; the rest need a (again — stays in the first band) and c..g
  const rounds = [
    { number: 1, seed: 1, texts: ['a', 'b'] },
    { number: 2, seed: 100, texts: ['b'] },
    { number: 3, seed: 101, texts: ['a', 'c', 'd'] },
    { number: 4, seed: 300, texts: ['e', 'f', 'g'] },
  ]
  const h = 'human', t = 'tts'
  const index = new Map(Object.entries({
    a: { full: h, most: t, early: t }, b: { full: t, most: t, early: t },
    c: { full: t, most: t }, d: { full: t, most: t }, e: { full: t, most: t }, f: { full: t }, g: { full: t, most: t },
  }).map(([k, v]) => [`eng\u001f${k}`, new Map(Object.entries(v))]))
  const side = summariseSide({ language: 'eng', rounds, voices: ['full', 'most', 'early'], cast: [], index })
  assert.equal(side.neededPairs, 7)
  assert.equal(side.seeds1to100Pairs, 2)
  assert.equal(side.restPairs, 5)
  const v = id => side.voices.find(r => r.voiceId === id)
  assert.deepEqual([v('full').humanPairs, v('full').ttsPairs], [1, 6])
  assert.deepEqual(v('most').rest, { held: 4, percent: 80 })  // exactly 80% of the rest
  assert.equal(v('most').offerable, true)
  assert.deepEqual(v('early').seeds1to100, { held: 2, percent: 100 })
  assert.equal(v('early').offerable, false)                   // 0% of the rest
  assert.deepEqual(side.offerable, ['full', 'most'])
  // a voice missing one seeds 1-100 line is never offerable, however full the rest
  index.get('eng\u001fb').delete('most')
  assert.equal(summariseSide({ language: 'eng', rounds, voices: ['most'], cast: [], index }).voices[0].offerable, false)

  // by language: lines from every course on either side, counted once
  const needs = new Map([['eng', { lines: new Set([...neededLines(rounds).all, 'z']), courses: new Set(['fra_for_eng', 'eng_for_spa']) }]])
  const [eng] = summariseLanguages({ needs, voices: new Map([['eng', new Set(['full', 'most', 'early', 'idle'])]]), index,
    flagged: new Map([['eng\u001fidle', 3]]) })
  assert.equal(eng.neededLines, 8)
  assert.deepEqual(eng.courses, ['eng_for_spa', 'fra_for_eng'])
  assert.deepEqual(eng.voices.find(r => r.voiceId === 'full'), { voiceId: 'full', heldLines: 7, humanLines: 1, ttsLines: 6, percent: 87.5, flaggedClips: 0 })
  assert.deepEqual(eng.voices.find(r => r.voiceId === 'idle'), { voiceId: 'idle', heldLines: 0, humanLines: 0, ttsLines: 0, percent: 0, flaggedClips: 3 })
})

test('the route serves slices of the saved summary and never the database', async () => {
  const { slice } = require('../../services/api/voice-coverage.cjs')
  const data = { schemaVersion: 2, generatedAt: 'x', offerableRule: {}, failingSpeechCheck: 4, voiceNames: {},
    languageCoverage: [{ language: 'eng' }], courses: [{ courseCode: 'spa_for_eng' }, { courseCode: 'fra_for_eng' }] }
  assert.deepEqual(slice(data, { view: 'languages' }).languageCoverage, [{ language: 'eng' }])
  assert.equal(slice(data, { view: 'languages' }).courses, undefined)
  assert.equal(slice(data, { course: 'fra_for_eng' }).course.courseCode, 'fra_for_eng')
  assert.equal(slice(data, { course: 'nope' }), null)
  assert.equal(slice(data, {}), data)
})

test('a bare Set index (origin unknown) keeps the #29 round and pair figures', () => {
  const { summariseSide } = require('../../services/shared/voice-coverage.cjs')
  const index = new Map([
    ['spa_mx\u001fa', new Set(['cast', 'alternative'])],
    ['spa_mx\u001fb', new Set(['alternative'])],
    ['spa\u001fc', new Set(['cast'])],
  ])
  const side = summariseSide({ language: 'spa_mx', rounds: [
    { number: 1, texts: ['a', 'a'] }, { number: 2, texts: ['a', 'b'] }, { number: 3, texts: ['c'] },
  ], cast: ['cast', 'unindexed'], voices: ['cast', 'alternative'], index })
  const cast = side.voices.find(v => v.voiceId === 'cast')
  assert.deepEqual([side.neededPairs, cast.heldPairs, cast.humanPairs, cast.completeRounds, cast.firstBreak], [3, 1, 0, 1, 2])
  assert.equal(side.voices.find(v => v.voiceId === 'alternative').completeRounds, 2)
  assert.equal(side.voices.find(v => v.voiceId === 'unindexed').firstBreak, 1)
  assert.equal(side.bestAlternative, 'alternative')
  assert.equal(cast.offerable, false)  // no seed numbers: no seeds 1-100 band, nothing offerable
})
