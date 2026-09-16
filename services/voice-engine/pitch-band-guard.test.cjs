'use strict'

const test = require('node:test')
const assert = require('node:assert')
const { checkPitchBand } = require('./pitch-band-guard.cjs')

test('within the known band: not flagged', () => {
  const r = checkPitchBand({ measuredHz: 120, knownBand: { minHz: 90, maxHz: 150 } })
  assert.equal(r.flagged, false)
})

test('far outside the known band (Aran-band male take on a female recordist login): flagged', () => {
  const r = checkPitchBand({ measuredHz: 115, knownBand: { minHz: 190, maxHz: 260 } })
  assert.equal(r.flagged, true)
  assert.match(r.reason, /outside/)
  assert.match(r.reason, /not refused/)
})

test('just inside the margin: not flagged', () => {
  // band 190-260, span 70, 15% margin = 10.5 -> effective range 179.5-270.5
  const r = checkPitchBand({ measuredHz: 182, knownBand: { minHz: 190, maxHz: 260 } })
  assert.equal(r.flagged, false)
})

test('just outside the margin: flagged', () => {
  const r = checkPitchBand({ measuredHz: 175, knownBand: { minHz: 190, maxHz: 260 } })
  assert.equal(r.flagged, true)
})

test('no measured pitch: never flagged (never refuses on missing data)', () => {
  assert.equal(checkPitchBand({ measuredHz: null, knownBand: { minHz: 90, maxHz: 150 } }).flagged, false)
  assert.equal(checkPitchBand({ measuredHz: NaN, knownBand: { minHz: 90, maxHz: 150 } }).flagged, false)
})

test('no known band yet for this recordist: never flagged (nothing to compare)', () => {
  assert.equal(checkPitchBand({ measuredHz: 120, knownBand: null }).flagged, false)
})

test('this is a guard, not a matcher: it never returns a reject/accept verdict, only flagged/not', () => {
  const r = checkPitchBand({ measuredHz: 400, knownBand: { minHz: 90, maxHz: 150 } })
  assert.deepEqual(Object.keys(r).sort(), ['flagged', 'reason'])
})
