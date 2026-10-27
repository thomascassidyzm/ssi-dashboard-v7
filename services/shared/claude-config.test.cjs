// #334: the course builder spreads across the SSi accounts by the surface's gauge + panel steer.
// Run: node services/shared/claude-config.test.cjs
const assert = require('assert')
const { pickAccount } = require('./claude-config.cjs')

const C = { email: 'claude@saysomethingin.com', file: 'c' }
const K = { email: 'kai.saraceno@saysomethingin.com', file: 'k' }
const u = (c5, k5) => ({
  [C.email]: { five_hour_pct: c5, headroom: (100 - c5) / 100 },
  [K.email]: { five_hour_pct: k5, headroom: (100 - k5) / 100 },
})

// The 27 Oct shape: claude@ at 93% five-hour, kai-gmail at 3% → kai-gmail pays.
assert.strictEqual(pickAccount([C, K], { usage: u(93, 3) }).email, K.email)
// Past the 60% gate claude@ is out even when headroom ties are close.
assert.strictEqual(pickAccount([C, K], { usage: u(61, 55) }).email, K.email)
// Both past the gate: least-filled still runs (a build is never refused here).
assert.strictEqual(pickAccount([C, K], { usage: u(80, 70) }).email, K.email)
// Panel avoid on both (27 Oct): avoid empties the set, so it binds nothing; gauge decides.
assert.strictEqual(pickAccount([C, K], { usage: u(93, 3), steer: { [C.email]: 'avoid', [K.email]: 'avoid' } }).email, K.email)
// Avoid on one binds.
assert.strictEqual(pickAccount([C, K], { usage: u(5, 30), steer: { [C.email]: 'avoid' } }).email, K.email)
// Hammer leads among accounts under the gate.
assert.strictEqual(pickAccount([C, K], { usage: u(40, 3), steer: { [C.email]: 'hammer' } }).email, C.email)
// Unknown gauge → the default token, as before.
assert.strictEqual(pickAccount([K, C], { usage: {} }).email, C.email)
// No alternatives configured → null (caller falls back to .cs-oauth-token).
assert.strictEqual(pickAccount([], { usage: u(93, 3) }), null)
// #337 (Tom 2026-10-27): hammer = fill it until its 5h window runs out — past the 60% gate, over a much emptier normal.
assert.strictEqual(pickAccount([C, K], { usage: u(75, 3), steer: { [C.email]: 'hammer' } }).email, C.email)
// Its window full, the spawn goes to the normal.
assert.strictEqual(pickAccount([C, K], { usage: u(93, 3), steer: { [C.email]: 'hammer' } }).email, K.email)
// Two hammers fill equally: the less-filled one takes the next spawn, whatever the headroom figure says.
assert.strictEqual(pickAccount([C, K], { usage: { [C.email]: { five_hour_pct: 50, headroom: 0.9 }, [K.email]: { five_hour_pct: 20, headroom: 0.1 } }, steer: { [C.email]: 'hammer', [K.email]: 'hammer' } }).email, K.email)
console.log('claude-config pickAccount: 11/11 ok')
