'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { mergeSentenceWant, clipWant, LINES, VOICE_GENDER } = require('./mark-splice-refusals-cym-n-2026-09-13.cjs')

test('a sentence want is merged, never overwritten; an existing reason survives and the splice reason rides alongside', () => {
  const v = 'human_aran_cym_n'
  assert.deepEqual(mergeSentenceWant(null, v, 'why'), { next: { target: v, reason: 'why' }, changed: true })
  assert.deepEqual(mergeSentenceWant({ known: 'x', reason: 'old' }, v, 'why'),
    { next: { known: 'x', reason: 'old', target: v, splice_refusal: 'why' }, changed: true })
  // a repeat is a no-op
  assert.equal(mergeSentenceWant({ known: 'x', reason: 'old', target: v, splice_refusal: 'why' }, v, 'why').changed, false)
  assert.equal(mergeSentenceWant({ target: v, reason: 'why' }, v, 'why').changed, false)
})

test('an existing clip want is kept as a fact, not rewritten', () => {
  const kept = { reason: 'clipped at the boundary', marked_at: 't', marked_by: 'x', voice_gender: 'm' }
  assert.deepEqual(clipWant(kept, 'why', 'm', 'now'), { next: kept, changed: false })
  assert.deepEqual(clipWant(null, 'why', 'f', 'now').next.voice_gender, 'f')
})

test('36 lines: the 35 gate refusals plus order 4, each marked to the voice that recorded it', () => {
  assert.equal(LINES.length, 36)
  assert.equal(new Set(LINES.map((l) => l.id)).size, 36)
  assert.ok(LINES.some((l) => l.order === 4))
  assert.ok(!LINES.some((l) => [6, 67, 73].includes(l.order)), 'the three healed turns are not marks')
  for (const l of LINES) assert.ok(VOICE_GENDER[l.voice], `${l.id}: ${l.voice}`)
  assert.equal(LINES.filter((l) => l.voice === 'human_aran_cym_n').length, 15)
  assert.equal(LINES.filter((l) => l.voice === 'human_catrinlliar_cym_n').length, 21)
})
