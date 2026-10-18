/**
 * The voice lab shows the pace the player will use: a human-voiced language (Welsh) is 1.0 flat,
 * everything else the flat 0.8 / 0.9 (Tom, 2026-10-18).
 *
 * Run: node services/voicelab/registry.pace-welsh.test.cjs
 */
const test = require('node:test')
const assert = require('node:assert/strict')
const { paceOf } = require('./registry.cjs')

const voice = { voice_id: 'v1', natural_pace_ratio: 1.1 }

test('a Welsh row shows 1.0 for easy and fast', () => {
  for (const lang of ['cym', 'cym_north', 'cym_south', 'cym_n']) {
    const p = paceOf(voice, lang)
    assert.equal(p.easy, 1.0, lang)
    assert.equal(p.fast, 1.0, lang)
  }
})

test('any other language, and a call with no language, keeps 0.8 / 0.9', () => {
  assert.equal(paceOf(voice, 'fra').easy, 0.8)
  assert.equal(paceOf(voice, 'fra').fast, 0.9)
  assert.equal(paceOf(voice).easy, 0.8)
})
