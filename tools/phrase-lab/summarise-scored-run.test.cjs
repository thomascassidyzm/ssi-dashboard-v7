#!/usr/bin/env node
/**
 * Proof that the run summariser does NOT report a pool window as a generator
 * finding. An account hitting its five-hour window makes the CLI exit non-zero
 * with "You've hit your session limit"; counting those beside unparseable-output
 * errors reports the ACCOUNT's state as though it were the PROMPT's quality,
 * which is exactly the confusion this whole comparison exists to avoid. On the
 * fra_for_eng run of 2026-09-20 that was 60 baskets against 7 real errors.
 *
 * Single process, no vitest, no DB.  node tools/phrase-lab/summarise-scored-run.test.cjs
 */
const assert = require('assert');
const { splitErrors } = require('./summarise-scored-run.cjs');

const errored = [
  { lego_id: 'S0039L02', error: "claude --print --model opus failed (code=1) | stdout-head: You've hit your session limit · resets 2am (UTC)" },
  { lego_id: 'S0040L01', error: 'rate limited, retry after 60s' },
  { lego_id: 'S0041L01', error: 'HTTP 429 Too Many Requests' },
  { lego_id: 'S0001L01', error: 'no JSON object in model output (first 200 chars: js l.seed_number …)' },
  { lego_id: 'S0002L03', error: '(intermediate value) is not iterable' },
];

const { exhausted, realErrors } = splitErrors(errored);
assert.deepStrictEqual(exhausted.map((e) => e.lego_id), ['S0039L02', 'S0040L01', 'S0041L01'],
  'session-limit, rate-limit and 429 failures are pool-window casualties, not generator errors');
assert.deepStrictEqual(realErrors.map((e) => e.lego_id), ['S0001L01', 'S0002L03'],
  'unparseable model output and thrown calls are the real errors and stay counted');
assert.strictEqual(exhausted.length + realErrors.length, errored.length, 'no failure is lost or double-counted');

// The silent direction: a run that never hit a window reports zero casualties,
// so the split cannot quietly swallow real errors.
assert.strictEqual(splitErrors([{ lego_id: 'X', error: 'boom' }]).exhausted.length, 0);

console.log('summarise-scored-run: 4/4 assertions pass — pool windows are not counted as generator errors');

// An ERROR STUB is not a basket. qa-report writes {seed, error} with no lego_id
// when its own database read fails; a transient Supabase schema-cache outage on
// 2026-09-21 stubbed 25 previously-good seed files that way, and the summariser
// crashed on them. Counting a stub as a row would be worse than crashing: a
// SCORING outage would read as content that scored badly.
const { isMeasurement } = require('./summarise-scored-run.cjs');
assert.strictEqual(isMeasurement({ seed: 47, error: 'Could not query the database for the schema cache. Retrying.' }), false);
assert.strictEqual(isMeasurement({ seed: 47, lego_id: 'fra_for_eng:S0047L01', composite: 0.8 }), true);
assert.strictEqual(isMeasurement(undefined), false);
console.log('summarise-scored-run: error stubs are excluded from measurements');
