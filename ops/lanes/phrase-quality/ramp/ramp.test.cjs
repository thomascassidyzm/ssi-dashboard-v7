// node ops/lanes/phrase-quality/ramp/ramp.test.cjs — no DB, no model calls.
'use strict'
const assert = require('assert')
const { chooseAccount } = require('./accounts.cjs')

// Tom 2026-10-12 (ramp 967): iCloud (account-5) first, claude@ (account-3) only while iCloud is shut and
// claude@ is under 90% of its week; never gmail, mac.com, hey.com or kai-gmail; nothing open → wait (null).
const R = (over = {}) => ({ winner: { all: { name: 'account-1' } }, accounts: ['account-1', 'account-2', 'account-3', 'account-4', 'account-5', 'kai-gmail'].map((name) => ({ name, blocked: false, benched: false, resetsAt: { 'account-1': 1, 'account-2': 5, 'account-3': 4, 'account-4': 2, 'account-5': 9, 'kai-gmail': 3 }[name], ...(over[name] || {}) })) })
const U = (over = {}) => ({ accounts: Object.fromEntries(['account-1', 'account-2', 'account-3', 'account-4', 'account-5', 'kai-gmail'].map((dir) => [`${dir}@x`, { dir, at_limit: false, five_hour_pct: 10, weekly_all_pct_used: 50, ...(over[dir] || {}) }])) })
const none = new Map()
assert.equal(chooseAccount(R(), U(), none), 'account-5', 'the router winner mac.com is ignored: iCloud first')
assert.equal(chooseAccount(R({ 'account-5': { blocked: true } }), U(), none), 'account-3', 'iCloud blocked → claude@')
assert.equal(chooseAccount(R(), U({ 'account-5': { five_hour_pct: 100 } }), none), 'account-3', 'iCloud five-hour limited → claude@')
assert.equal(chooseAccount(R(), U({ 'account-5': { at_limit: true } }), none), 'account-3', 'iCloud at limit → claude@')
assert.equal(chooseAccount(R(), U(), new Map([['account-5', Date.now() + 60e3]])), 'account-3', 'iCloud benched by a refused call → claude@')
assert.equal(chooseAccount(R({ 'account-5': { blocked: true } }), U({ 'account-3': { weekly_all_pct_used: 90 } }), none), null, 'claude@ at 90% → wait, never mac.com (soonest reset)')
assert.equal(chooseAccount(R({ 'account-5': { blocked: true } }), { accounts: {} }, none), null, 'claude@ with no weekly reading → wait')
assert.equal(chooseAccount(R({ 'account-5': { blocked: true }, 'account-3': { blocked: true } }), U(), none), null, 'both shut → wait (null), no fallback')
// Tom 2026-10-12 (via #967): claude@ only while its five-hour window is under 70%, so Aran and Kai keep one
assert.equal(chooseAccount(R({ 'account-5': { blocked: true } }), U({ 'account-3': { five_hour_pct: 70 } }), none), null, 'claude@ at 70% of five hours → wait')
assert.equal(chooseAccount(R({ 'account-5': { blocked: true } }), U({ 'account-3': { five_hour_pct: 69 } }), none), 'account-3', 'claude@ at 69% of five hours → used')
assert.equal(chooseAccount(R({ 'account-5': { blocked: true } }), U({ 'account-3': { five_hour_pct: null } }), none), null, 'claude@ with no five-hour reading → wait')
console.log('ramp.test: all green')

// The run's pushes are merged with the lane's (and any release job's) appends to the same ledgers, never
// refused: append-only lane files merge as a union (2026-10-12: 1,445 push attempts failed on a rebase
// conflict in undo/*.jsonl while another job appended to the same courses).
{
  const { execFileSync } = require('child_process')
  for (const f of ['undo/eng_for_ben.jsonl', 'staged/eng_for_ben.jsonl', 'ramp/log.jsonl']) {
    const out = execFileSync('git', ['check-attr', 'merge', `ops/lanes/phrase-quality/${f}`], { cwd: require('path').join(__dirname, '../../../..') }).toString()
    assert.ok(/merge: union/.test(out), `${f} merges as a union`)
  }
  const src = require('fs').readFileSync(require('path').join(__dirname, 'run-ramp.cjs'), 'utf8')
  assert.ok(src.includes("'pull', '-q', '--no-rebase', '--no-edit'") && !src.includes("'--rebase', 'origin'"), 'push() merges, never rebases')
  console.log('ramp.test: union merge ok')
}
