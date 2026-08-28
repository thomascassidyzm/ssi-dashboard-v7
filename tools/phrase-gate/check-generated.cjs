#!/usr/bin/env node
/**
 * CLI over tools/phrase-gate/gate-check.cjs — replays the real gates over a
 * JSON file of generated phrase sets and writes a report. Read-only.
 *
 * This is the committed successor of scripts/v3-verify/check-gates.cjs (job
 * #988), which lived on a gitignored path. Same output shape, so the cached
 * *-gates.json reports from that job still read against it.
 *
 *   node tools/phrase-gate/check-generated.cjs <generated.json> [report.json]
 *
 * Input: an array of {courseCode, seedNumber, legoIndex, legoId, legoKnown,
 * legoTarget, phrases:[{role,known,target}]} — an entry carrying `error` or no
 * phrases is a GENERATION failure and is reported separately, never silently
 * counted as a pass.
 */
require('dotenv').config({ quiet: true });
const fs = require('fs');
const { supabase } = require('../../services/supabase-client.cjs');
const { GATE_NAMES, makeCourseCtx, checkPhraseSet } = require('./gate-check.cjs');

async function main() {
  const [inFile, outFile] = process.argv.slice(2);
  if (!inFile) {
    console.error('usage: node tools/phrase-gate/check-generated.cjs <generated.json> [report.json]');
    process.exit(1);
  }
  const entries = JSON.parse(fs.readFileSync(inFile, 'utf8'));
  if (!Array.isArray(entries)) throw new Error(`${inFile}: expected a JSON array`);

  const isGenFailure = (e) => e.error || !(e.phrases ? e.phrases.length : (e.build || []).length + (e.use || []).length);
  const generationFailures = entries.filter(isGenFailure);
  const toCheck = entries.filter(e => !isGenFailure(e));

  const ctxCache = new Map();
  const results = [];
  for (const entry of toCheck) {
    if (!ctxCache.has(entry.courseCode)) ctxCache.set(entry.courseCode, makeCourseCtx(supabase, entry.courseCode));
    try {
      results.push(await checkPhraseSet(entry, ctxCache.get(entry.courseCode)));
    } catch (e) {
      results.push({
        legoId: entry.legoId, courseCode: entry.courseCode, seedNumber: entry.seedNumber,
        legoIndex: entry.legoIndex, overallPass: false, failingGates: ['SCRIPT_ERROR'], error: e.message,
      });
    }
  }

  const gateFailCounts = Object.fromEntries(GATE_NAMES.map(g => [g, 0]));
  let clean = 0;
  for (const r of results) {
    if (r.overallPass) clean++;
    for (const g of r.failingGates || []) gateFailCounts[g] = (gateFailCounts[g] || 0) + 1;
  }

  console.log('legoId'.padEnd(20), 'build'.padEnd(6), 'use'.padEnd(5), 'result');
  console.log('-'.repeat(70));
  for (const r of results) {
    const status = r.overallPass ? 'PASS' : (r.failingGates.length ? r.failingGates.join(',') : r.error || 'FAIL');
    console.log(String(r.legoId).padEnd(20), String(r.buildCount ?? '-').padEnd(6), String(r.useCount ?? '-').padEnd(5), status);
  }
  console.log('\n─── summary ───');
  console.log(`LEGOs checked:       ${results.length}`);
  console.log(`Clean (all gates):   ${clean}`);
  console.log(`Generation failures: ${generationFailures.length} (skipped, not counted as gate failures)`);
  console.log('Failures per gate:');
  for (const g of GATE_NAMES) console.log(`  ${g.padEnd(20)} ${gateFailCounts[g]}`);

  if (outFile) {
    fs.writeFileSync(outFile, JSON.stringify({
      summary: { legosChecked: results.length, clean, generationFailures: generationFailures.length, gateFailCounts },
      generationFailures: generationFailures.map(e => ({ legoId: e.legoId, courseCode: e.courseCode, seedNumber: e.seedNumber, legoIndex: e.legoIndex, error: e.error })),
      results,
    }, null, 2));
    console.log(`\nwrote ${outFile}`);
  }
}

main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
