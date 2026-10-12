// Which Claude account ramp 967 may spend (Tom 2026-10-12, via #967): drain iCloud (account-5) first;
// claude@ (account-3) only while iCloud is shut, under 90% of its week AND under 70% of its five-hour window
// (Aran/Kai headroom).
// Never gmail (account-2), mac.com (account-1), hey.com (account-4) or kai-gmail. Nothing open → null,
// and the caller waits; there is no fallback. Pure: routing = GET /api/routing, usage = GET /api/usage.
'use strict'
const ALLOW = ['account-5', 'account-3']
const WEEKLY_CAP = { 'account-3': 90 }
const FIVE_HOUR_CAP = { 'account-3': 70 }   // Tom 2026-10-12: Aran and Kai keep a five-hour window

function chooseAccount(routing, usage, benched = new Map(), now = Date.now()) {
  const byDir = new Map(Object.values((usage && usage.accounts) || {}).map((u) => [u.dir, u]))
  for (const name of ALLOW) {
    const r = ((routing && routing.accounts) || []).find((a) => a.name === name)
    if (!r || r.blocked || r.benched || benched.get(name) > now) continue
    const u = byDir.get(name)
    if (u && (u.at_limit || u.five_hour_pct >= 100 || u.weekly_all_pct_used >= 100)) continue
    if (WEEKLY_CAP[name] != null && !(u && Number.isFinite(u.weekly_all_pct_used) && u.weekly_all_pct_used < WEEKLY_CAP[name])) continue
    if (FIVE_HOUR_CAP[name] != null && !(u && Number.isFinite(u.five_hour_pct) && u.five_hour_pct < FIVE_HOUR_CAP[name])) continue
    return name
  }
  return null
}
module.exports = { chooseAccount, ALLOW, WEEKLY_CAP, FIVE_HOUR_CAP }
