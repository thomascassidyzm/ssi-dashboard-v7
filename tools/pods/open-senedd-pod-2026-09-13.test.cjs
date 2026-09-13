'use strict'
const { test } = require('node:test')
const assert = require('node:assert/strict')
const { assertBefore, checkRowCount, POD_ID, UPDATE_SQL } = require('./open-senedd-pod-2026-09-13.cjs')

test('the before-state gate accepts exactly the row the ruling was made about', () => {
  assert.equal(assertBefore({ id: POD_ID, visibility: 'live', required_role: 'previewer_001' }).ok, true)
  assert.equal(assertBefore(null).ok, false)
  assert.equal(assertBefore({ id: POD_ID, visibility: 'held', required_role: 'previewer_001' }).ok, false)
  // already open: a re-run refuses rather than pretending to do it again
  assert.equal(assertBefore({ id: POD_ID, visibility: 'live', required_role: null }).ok, false)
  assert.equal(assertBefore({ id: POD_ID, visibility: 'live', required_role: 'previewer_002' }).ok, false)
})

test('the statement is the one the brief names, and anything but one row is refused', () => {
  assert.equal(UPDATE_SQL,
    "UPDATE listening_pods SET required_role = NULL WHERE id = 'cym_n_for_eng:senedd-s4c-steve' AND required_role = 'previewer_001'")
  assert.equal(checkRowCount(1).ok, true)
  assert.equal(checkRowCount(0).ok, false)
  assert.equal(checkRowCount(2).ok, false)
})
