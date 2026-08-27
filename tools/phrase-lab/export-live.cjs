#!/usr/bin/env node
/**
 * Dump the LIVE database phrase sets for the measured LEGOs, in the same shape
 * generate.cjs writes, so the live arm can go through judge-use.cjs alongside the
 * generated arms.
 *
 * The live arm costs nothing to read and is the Sonnet 4.5 baseline. It is not
 * generated, so there is no arm file for it — which previously meant the blind
 * "is this USE phrase worth having" judgement had no way to see it, and the one
 * axis the scorer cannot compute was measured on two arms out of three.
 *
 * READ-ONLY.
 *
 * Usage: node tools/phrase-lab/export-live.cjs --course ita_for_eng --targets targets.json --out out/live.json
 */

require('dotenv').config({ quiet: true });
const fs = require('fs');
const { fetchLivePhrases } = require('./score.cjs');

async function main() {
  const argv = process.argv.slice(2);
  const arg = (k) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : null);
  const courseCode = arg('--course');
  const targets = JSON.parse(fs.readFileSync(arg('--targets'), 'utf8'));
  const outFile = arg('--out');
  if (!courseCode || !outFile) { console.error('usage: --course <c> --targets <json> --out <json>'); process.exit(1); }

  const { supabase } = require('../../services/supabase-client.cjs');
  const out = [];
  for (const t of targets) {
    const phrases = await fetchLivePhrases(supabase, courseCode, t.seed, t.lego);
    out.push({
      courseCode, seedNumber: t.seed, legoIndex: t.lego, arm: 'live',
      legoId: t.legoId, legoKnown: t.known, legoTarget: t.target, phrases
    });
  }
  fs.writeFileSync(outFile, JSON.stringify(out, null, 2));
  console.error(`wrote ${outFile} — ${out.length} live sets, ${out.reduce((a, r) => a + r.phrases.length, 0)} phrases`);
}

main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
