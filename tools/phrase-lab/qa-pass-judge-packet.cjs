#!/usr/bin/env node
/**
 * PREMIUM COURSE QA PASS — the blind packet, and the arm files for judge-use.
 *
 * Two judgements the arithmetic cannot make, set up so neither judge can know
 * which arm it is reading:
 *
 *   1. judge-use.cjs "worth having" on every USE phrase of both arms — writes
 *      live-arm.json and v3-arm.json in the shape generate.cjs writes.
 *   2. A PAIRWISE blind packet for a CROSS-FAMILY judge (the generator is
 *      Opus, so the independent judge is not Claude): per LEGO, the live USE set
 *      and the v3 USE set as "Set A"/"Set B", the side chosen by a hash of the
 *      LEGO id so it is fixed, unguessable and roughly half each way. The key
 *      goes to a separate file the judge never sees.
 *
 * Only LEGOs where BOTH arms have at least MIN_USE USE phrases enter the
 * pairwise packet — a set against an empty set is a coverage fact, counted in
 * the measures, not a judgement.
 *
 * READ-ONLY.
 *
 * Usage:
 *   node tools/phrase-lab/qa-pass-judge-packet.cjs cym_s_for_eng --v3 v3.json --dir <outdir>
 */

require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MIN_USE = 3;

async function main() {
  const argv = process.argv.slice(2);
  const courseCode = argv[0];
  const arg = (k) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : null);
  const v3 = JSON.parse(fs.readFileSync(arg('--v3'), 'utf8')).filter((s) => !s.error);
  const dir = arg('--dir');
  const { supabase } = require('../../services/supabase-client.cjs');
  const { fetchLivePhrases } = require('./score.cjs');

  const liveArm = [];
  const v3Arm = [];
  const pairs = [];
  for (const s of v3.sort((a, b) => a.seedNumber - b.seedNumber)) {
    const live = (await fetchLivePhrases(supabase, courseCode, s.seedNumber, s.legoIndex)).map((p) => ({ role: p.role, known: p.known, target: p.target }));
    const gen = [...s.build.map((p) => ({ role: 'build', known: p.known, target: p.target })), ...s.use.map((p) => ({ role: 'use', known: p.known, target: p.target }))];
    const base = { courseCode, seedNumber: s.seedNumber, legoIndex: s.legoIndex, third: s.third, legoKnown: s.legoKnown, legoTarget: s.legoTarget };
    liveArm.push({ ...base, arm: 'live', phrases: live });
    v3Arm.push({ ...base, arm: 'v3', phrases: gen });
    const lu = live.filter((p) => p.role === 'use');
    const vu = gen.filter((p) => p.role === 'use');
    if (lu.length >= MIN_USE && vu.length >= MIN_USE) {
      const liveIsA = crypto.createHash('sha1').update(`${courseCode}:${s.seedNumber}:${s.legoIndex}`).digest()[0] % 2 === 0;
      pairs.push({ ...base, A: liveIsA ? lu : vu, B: liveIsA ? vu : lu, liveIs: liveIsA ? 'A' : 'B' });
    }
  }

  fs.writeFileSync(path.join(dir, 'live-arm.json'), JSON.stringify(liveArm, null, 2));
  fs.writeFileSync(path.join(dir, 'v3-arm.json'), JSON.stringify(v3Arm, null, 2));
  fs.writeFileSync(path.join(dir, 'pairwise-key.json'), JSON.stringify(pairs.map((p) => ({ id: `P${pairs.indexOf(p) + 1}`, seed: p.seedNumber, lego: p.legoIndex, third: p.third, liveIs: p.liveIs })), null, 2));

  const md = [];
  pairs.forEach((p, i) => {
    md.push(`### P${i + 1} — the new chunk being practised: "${p.legoKnown}" = "${p.legoTarget}"`);
    md.push('');
    md.push('Set A:');
    for (const x of p.A) md.push(`- ${x.known}  ‖  ${x.target}`);
    md.push('');
    md.push('Set B:');
    for (const x of p.B) md.push(`- ${x.known}  ‖  ${x.target}`);
    md.push('');
  });
  fs.writeFileSync(path.join(dir, 'pairwise-packet.md'), md.join('\n'));
  console.error(`wrote live-arm.json, v3-arm.json (${v3Arm.length} LEGOs) and a blind packet of ${pairs.length} pairs (${pairs.filter((p) => p.liveIs === 'A').length} with live as A)`);
}

main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
