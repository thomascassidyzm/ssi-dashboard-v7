// #334 / #412·AD: the course builder spreads across the SSi accounts by the WEEKLY gauge + panel steer, and bulk
// doors pace themselves across the week (Tom 2026-11-04). Run: node services/shared/claude-config.test.cjs
const assert = require('assert')
const { pickAccount, pacedNow, WEEKLY_FULL_PCT } = require('./claude-config.cjs')

const C = { email: 'claude@saysomethingin.com', file: 'c' }
const K = { email: 'kai.claude@saysomethingin.com', file: 'k' }
const NOW = Date.parse('2026-11-04T23:00:00Z')
// Real resets on 4 Nov: claude@ Sat 7 Nov 15:00Z (64h left → 62% of its week elapsed), kai-gmail Sun 8 Nov 10:00Z (83h → 51%).
const g = (pct, reset) => ({ weekly_all_pct_used: pct, weekly_all_known: true, weekly_all_resets_at: reset })
const u = (c, k) => ({ [C.email]: g(c, '2026-11-07T15:00:00Z'), [K.email]: g(k, '2026-11-08T10:00:00Z') })
const pick = (usage, steer) => pickAccount([C, K], { usage, steer, now: NOW }).email

// THE 4 NOV SHAPE: the gauge has no five_hour_pct at all; claude@ 100, kai-gmail 68 → kai-gmail pays.
assert.strictEqual(pick({ [C.email]: { seven_day_pct: 100, weekly_all_pct_used: 100, weekly_all_known: true }, [K.email]: { seven_day_pct: 68, weekly_all_pct_used: 68, weekly_all_known: true } }), K.email)
// Over pace loses to under pace even with more headroom: claude@ 40% (share 62) vs kai 70% (share 51+10) → claude@.
assert.strictEqual(pick(u(40, 70)), C.email)
// Both under pace → most headroom.
assert.strictEqual(pick(u(50, 20)), K.email)
// Avoid on one binds; avoid on both binds nothing.
assert.strictEqual(pick(u(10, 30), { [C.email]: 'avoid' }), K.email)
assert.strictEqual(pick(u(10, 30), { [C.email]: 'avoid', [K.email]: 'avoid' }), C.email)
// Hammer fills until the week is full, then the normal takes it.
assert.strictEqual(pick(u(90, 3), { [C.email]: 'hammer' }), C.email)
assert.strictEqual(pick(u(WEEKLY_FULL_PCT, 3), { [C.email]: 'hammer' }), K.email)
// Unknown weekly gauge (known:false) ranks behind a known one; no gauge at all → the default token.
assert.strictEqual(pick({ [C.email]: { weekly_all_known: false, weekly_all_pct_used: null }, [K.email]: g(90, '2026-11-08T10:00:00Z') }), K.email)
assert.strictEqual(pickAccount([K, C], { usage: {}, now: NOW }).email, C.email)
assert.strictEqual(pickAccount([], { usage: u(1, 1) }), null)

// THE PACE: go while either account is under its share + 10; hold when both are past it, resuming when the sooner catches up.
assert.strictEqual(pacedNow([C, K], { usage: u(60, 55), now: NOW }), null)
const held = pacedNow([C, K], { usage: u(100, 68), now: NOW })
assert.ok(held && /ahead of its weekly pace/.test(held.why), 'both past pace → held')
// kai at 68 with slack 10 is back under pace when 58% of its week has elapsed: 8 Nov 10:00 − 70.56h ≈ 5 Nov 11:26Z.
assert.ok(Math.abs(Date.parse(held.resumeAt) - Date.parse('2026-11-05T11:26:00Z')) < 5 * 60e3, held.resumeAt)
// An unreadable gauge never holds a run.
assert.strictEqual(pacedNow([C, K], { usage: { [C.email]: g(100, '2026-11-07T15:00:00Z') }, now: NOW }), null)
console.log('claude-config pickAccount + pace: ok')

// #482: every spawned CLI waits for its background builder instead of reaping it at 10 min
// (CLI default ceiling 600000 ms; fry_for_eng stopped at 4/300 on 28 Oct that way).
{
  const { claudeConfigExport } = require('./claude-config.cjs')
  assert.match(claudeConfigExport(), /export CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=0(\s|$)/)
}
