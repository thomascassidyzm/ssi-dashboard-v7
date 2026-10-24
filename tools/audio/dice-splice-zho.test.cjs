// Job #340: a "spliced" row must never be the whole recording, nor built from a clip of its own text.
// Pre-fix the builder had neither guard (these exports did not exist) and its manifest recorded no source span.
const test = require('node:test'), assert = require('node:assert')
const S = require('./dice-splice-zho.cjs')
const pcm = (f) => Float32Array.from({ length: 16000 }, (_, i) => Math.sin(i * f))

test('a piece sourced from a clip whose text is the target is refused', () => {
  assert.throws(() => S.assertPiecesFromOtherTexts('你好', [{ text: '你好', baseId: '你好', baseRef: 'a' }], 'r'), /IS the target/)
  assert.throws(() => S.assertPiecesFromOtherTexts('你好', [{ text: '你', baseId: '你好吗', baseRef: 'r.v2' }], 'r'), /own reference clip/)
  assert.doesNotThrow(() => S.assertPiecesFromOtherTexts('你好', [{ text: '你好', baseId: '你好吗', baseRef: 'x' }], 'r'))
})
test('an output identical or near-identical to the whole fails the hash check; a different one passes', () => {
  const a = pcm(0.05), b = pcm(0.31), bytes = (x) => Buffer.from(x.buffer)
  const same = S.hashVerdict({ splicedBytes: bytes(a), referenceBytes: bytes(a), splicedPcm: a, referencePcm: a })
  assert.equal(same.ok, false)
  const near = S.hashVerdict({ splicedBytes: Buffer.from('x'), referenceBytes: Buffer.from('y'), splicedPcm: Float32Array.from(a, (v) => v * 0.9), referencePcm: a })
  assert.equal(near.ok, false)
  assert.equal(S.hashVerdict({ splicedBytes: Buffer.from('x'), referenceBytes: Buffer.from('y'), splicedPcm: b, referencePcm: a }).ok, true)
})
test('the manifest piece records source clip, source text, character span and seconds', () => {
  const r = S.pieceRecord({ text: '你', baseId: '你好吗', baseRef: 'abc', baseSlot: 's', charStart: 0, charEnd: 1, startSample: 8000, endSample: 16000 }, 16000)
  assert.deepEqual([r.sourceText, r.charStart, r.charEnd, r.srcStartSec, r.srcEndSec, r.fromRef], ['你好吗', 0, 1, 0.5, 1, 'abc'])
})
