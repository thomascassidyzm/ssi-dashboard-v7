const { test } = require('node:test')
const assert = require('node:assert/strict')
const { summariseSide, snapshotReader } = require('../../services/shared/voice-coverage.cjs')

test('counts whole rounds, distinct pairs, exact varieties and first break, including reviews and absent cast', async () => {
  const snapshot = snapshotReader({ fixture: Array.from({ length: 2100 }, (_, n) => ({ n, course: n < 2050 ? 'a' : 'b' })) })
  const page = await snapshot.from('fixture').select('*').eq('course', 'a').gte('n', 1000).order('n').range(0, 999)
  assert.equal(page.data.length, 1000)
  assert.equal(page.data[999].n, 1999)
  assert.equal((await snapshot.from('fixture').select('*')).data.length, 2100)
  const { generateLearningScript } = require('../../services/learning-script-generator.cjs')
  const code = 'deu_for_eng'
  const legos = Array.from({ length: 150 }, (_, i) => ({ course_code: code, lego_id: `S${String(i + 1).padStart(4, '0')}L01`,
    seed_number: i + 1, lego_index: 1, type: 'A', is_new: true, known_text: `word ${i}`, target_text: `wort ${i}` }))
  const generated = await generateLearningScript(snapshotReader({
    courses: [{ course_code: code, known_lang: 'eng' }],
    algorithm_config: [{ key: 'script_shape', config: {} }],
    course_legos: legos, course_practice_phrases: [], lego_introductions: [],
    course_seeds: legos.map(l => ({ ...l, known_text: `whole sentence ${l.seed_number}`, target_text: `ganzer satz ${l.seed_number}` })),
  }), code, Number.MAX_SAFE_INTEGER, 0, { learnerView: false })
  assert.equal(generated.rounds.length, 150)
  assert.equal(generated.stats.scriptShapeSource, 'algorithm_config')
  assert.ok(generated.rounds.flatMap(r => r.items).some(i => i.reviewItemKind === 'seed'), 'whole-seed returns must reach coverage')
  const index = new Map([
    ['spa_mx\u001fa', new Set(['cast', 'alternative'])],
    ['spa_mx\u001fb', new Set(['alternative'])],
    ['spa\u001fc', new Set(['cast'])],
  ])
  const side = summariseSide({ language: 'spa_mx', rounds: [
    { number: 1, texts: ['a', 'a'] },
    { number: 2, texts: ['a', 'b'] },
    { number: 3, texts: ['c'] },
  ], cast: ['cast', 'unindexed'], voices: ['cast', 'alternative'], index })
  assert.equal(side.neededPairs, 3)
  assert.equal(side.rounds, 3)
  const cast = side.voices.find(v => v.voiceId === 'cast')
  assert.equal(cast.heldPairs, 1)
  assert.equal(cast.completeRounds, 1)
  assert.equal(cast.firstBreak, 2)
  assert.equal(side.voices.find(v => v.voiceId === 'alternative').completeRounds, 2)
  assert.equal(side.voices.find(v => v.voiceId === 'unindexed').firstBreak, 1)
  assert.equal(side.bestAlternative, 'alternative')
  assert.equal(summariseSide({ language: 'eng', rounds: [], voices: ['v'], cast: [], index }).voices[0].roundPercent, null)
})
