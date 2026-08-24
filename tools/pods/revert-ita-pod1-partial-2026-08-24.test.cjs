#!/usr/bin/env node
/**
 * Tests for the partial-rollback selection. The DB work is guarded at runtime by
 * before-state assertions; the thing that cannot be caught at runtime is picking the WRONG
 * SEVEN, so that is what is asserted here, against the re-render's real applied log.
 */
'use strict'

const assert = require('assert')
const path = require('path')
const fs = require('fs')
const { planRevert, KEEP_ON_SECOND_VOICE } = require('./revert-ita-pod1-partial-2026-08-24.cjs')

const REPO = path.resolve(__dirname, '../..')
const log = JSON.parse(fs.readFileSync(path.join(REPO,
  'docs/pods/ita_for_eng-pod-1-off-role-rerender-2026-08-24-applied-log.json'), 'utf8'))

let pass = 0
const t = (name, fn) => { fn(); console.log(`  ok  ${name}`); pass++ }
const lines = (rows) => [...new Set(rows.map((r) => `${r.scene}.${r.sentence}`))].sort()

t('the re-render moved 11 turns x 2 tracks', () => {
  assert.strictEqual(log.scope.length, 22)
  assert.strictEqual(lines(log.scope).length, 11)
  assert.ok(log.scope.every((s) => s.swapped === true))
})

t('Tom keeps exactly four lines on the second voice', () => {
  const { kept } = planRevert(log.scope)
  assert.deepStrictEqual(lines(kept), ['16.9', '17.2', '17.9', '21.8'])
  assert.strictEqual(kept.length, 8, 'four lines, both tracks each')
})

t('exactly seven lines revert, and they are the contradictory variant drills', () => {
  const { revert } = planRevert(log.scope)
  assert.deepStrictEqual(lines(revert), ['17.4', '17.5', '21.11', '21.12', '21.13', '21.5', '21.6'])
  assert.strictEqual(revert.length, 14, 'seven lines, both tracks each')
})

t('keep and revert partition the scope with no overlap and nothing dropped', () => {
  const { revert, kept } = planRevert(log.scope)
  assert.strictEqual(revert.length + kept.length, log.scope.length)
  const k = new Set(kept.map((r) => r.row_id + r.track))
  assert.ok(revert.every((r) => !k.has(r.row_id + r.track)))
})

t('every revert target names the learner voice, never the second voice', () => {
  const { revert } = planRevert(log.scope)
  const second = new Set(['x7avnu1k', 'gfzdpspr5fdp'])
  assert.ok(revert.every((r) => !second.has(r.old_voice)), 'reverting onto the new voice would be a no-op')
  assert.ok(revert.every((r) => ['ara', 'bedd6226'].includes(r.old_voice)))
  assert.ok(revert.every((r) => second.has(r.want_voice)))
})

t('both tracks of every reverted line move together', () => {
  const { revert } = planRevert(log.scope)
  const byLine = {}
  for (const r of revert) (byLine[`${r.scene}.${r.sentence}`] ||= []).push(r.track)
  for (const [line, tracks] of Object.entries(byLine)) {
    assert.deepStrictEqual(tracks.sort(), ['known', 'target'], `${line} must revert on both tracks`)
  }
})

t('scenes 18 and 19 are out of scope entirely', () => {
  const { revert, kept } = planRevert(log.scope)
  assert.ok([...revert, ...kept].every((r) => ![18, 19].includes(r.scene)))
})

t('scene 16 is never written: its only reassigned line, 16.9, is a keeper', () => {
  const { revert, kept } = planRevert(log.scope)
  assert.deepStrictEqual([...new Set(revert.map((r) => r.scene))].sort(), [17, 21])
  assert.deepStrictEqual(lines(kept.filter((r) => r.scene === 16)), ['16.9'])
})

t('only the two whole-turn link columns are ever named', () => {
  const { revert } = planRevert(log.scope)
  assert.ok(revert.every((r) => ['target_audio_id', 'known_audio_id'].includes(r.link)),
    'split arrays must never be written — a split segment has to be re-cut')
})

t('a keeper is never selected for revert even if the keep list is passed explicitly', () => {
  const { revert } = planRevert(log.scope, KEEP_ON_SECOND_VOICE)
  assert.ok(revert.every((r) => !r.row_id.endsWith('SC21-S008')))
  assert.ok(revert.every((r) => !r.row_id.endsWith('SC16-S009')))
})

t('an unswapped scope row is never reverted', () => {
  const doctored = log.scope.map((s, i) => (i === 4 ? { ...s, swapped: false } : s))
  const { revert } = planRevert(doctored)
  assert.strictEqual(revert.length, 13)
})

console.log(`\n${pass}/${pass} green`)
