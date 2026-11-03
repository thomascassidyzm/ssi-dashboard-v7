import test from 'node:test'
import assert from 'node:assert/strict'
import { cardChunks, syllablesFor } from './podChunkSizes.mjs'

test('core counter receives the exact text and language; its result is trusted', () => {
  const text = '漢字 <script>fixture</script>'
  for (const result of [0, 7, NaN, undefined]) {
    const calls = []
    assert.equal(syllablesFor('zho', text, (...args) => {
      calls.push(args)
      return result
    }), result)
    assert.deepEqual(calls, [[text, 'zho']])
  }
})

test('any synchronous counter error triggers the script fallback for only three languages', () => {
  const failure = new Error('dependency failure, not an unsupported-language verdict')
  for (const lang of ['zho', 'jpn', 'kor']) {
    let calls = 0
    assert.equal(syllablesFor(lang, '漢あカ한 A1!', () => {
      calls++
      throw failure
    }), 4)
    assert.equal(calls, 1)
    assert.equal(syllablesFor(lang, 'Latin only!', () => { throw failure }), 0)
  }
  for (const lang of ['ita', 'pol', 'ZHO', 'zho_for_eng']) {
    assert.throws(() => syllablesFor(lang, '漢', () => { throw failure }),
      (error) => error === failure)
  }
})

test('continuation cards never call the counter; other cards propagate its error unchanged', () => {
  const failure = new Error('counter failed')
  let calls = 0
  const counter = () => { calls++; throw failure }
  assert.equal(cardChunks({ fusionContinuation: true }, counter), null)
  assert.equal(calls, 0)
  for (const sentence of [
    { targetText: 'plain', fusionGroups: [] },
    { fusionGroups: [{ units: [{ target_surface: 'fusion' }] }] },
  ]) {
    assert.throws(() => cardChunks(sentence, counter), (error) => error === failure)
  }
  assert.equal(calls, 2)
})

test('fusion counter calls follow authored unit order without modifying frozen input', () => {
  const unit = (text) => Object.freeze({ target_surface: text })
  const group = (...texts) => Object.freeze({ units: Object.freeze(texts.map(unit)) })
  const sentence = Object.freeze({
    targetText: 'whole sentence is not counted',
    fusionGroups: Object.freeze([group('first', 'second'), group('first')]),
  })
  const calls = []
  const result = cardChunks(sentence, (text) => { calls.push(text); return calls.length })
  assert.deepEqual(calls, ['first', 'second', 'first'])
  assert.deepEqual(result.chunks.map(({ text, syl }) => [text, syl]),
    [['first', 1], ['second', 2], ['first', 3]])
})
