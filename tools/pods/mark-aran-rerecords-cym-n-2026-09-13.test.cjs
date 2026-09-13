'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { mergeSentenceWant, clipWant, LINES } = require('./mark-aran-rerecords-cym-n-2026-09-13.cjs')

test('a want is merged, never overwritten: other keys survive and a repeat is a no-op', () => {
  const v = 'human_aran_cym_n'
  // fresh row
  assert.deepEqual(mergeSentenceWant(null, v, 'why'), { next: { target: v, reason: 'why' }, changed: true })
  // a known-track want on the row stays, and an older reason is not clobbered
  assert.deepEqual(mergeSentenceWant({ known: 'x', reason: 'old' }, v, 'why'),
    { next: { known: 'x', reason: 'old', target: v }, changed: true })
  // SC12-S008 already names Aran on target (job #568) — idempotent
  assert.deepEqual(mergeSentenceWant({ target: v }, v, 'why'), { next: { target: v }, changed: false })
})

test('an existing clip want (job #533 on a70756ca) is kept as a fact, not rewritten', () => {
  const prior = { reason: 'burst then silence', marked_by: 'job #533·F', voice_gender: 'm' }
  assert.deepEqual(clipWant(prior, 'new reason', 't'), { next: prior, changed: false })
  const fresh = clipWant(null, 'r', 't0')
  assert.equal(fresh.changed, true)
  assert.equal(fresh.next.voice_gender, 'm')
  assert.equal(fresh.next.reason, 'r')
})

test('the nine lines are exactly the ones Tom named (two pod-1, two Prynhawn da, six Senedd)', () => {
  assert.equal(LINES.length, 10)
  assert.equal(new Set(LINES.map((l) => l.clip)).size, 9)
  assert.equal(LINES.filter((l) => l.id.includes(':pod-1:')).length, 2)
})
