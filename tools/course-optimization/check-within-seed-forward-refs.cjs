#!/usr/bin/env node
/**
 * Report every practice phrase whose TARGET can only be tiled using a LEGO
 * introduced LATER IN ITS OWN SEED.
 *
 * Why this exists as a tool rather than a note: the submission gate cannot see
 * this defect. `runSeedChecks` (services/course-builder/routes/v2.cjs) validates
 * a seed's phrases against "prior seeds PLUS this seed's own legos", so a phrase
 * under L02 that needs L05's material passes. The canon rule it is blind to is
 * P2 — "vocabulary accumulates strictly in seed/index order — never a later
 * sibling, no forward references" — and a learner meeting L02's basket has not
 * been given L05 yet, so the phrase is unanswerable at the round where it lands.
 *
 * The check per phrase is the real gate function, run against a STRICTER vocab
 * set: every LEGO of every earlier seed, plus this seed's LEGOs up to and
 * including the phrase's own lego_index. A phrase that tiles under the loose set
 * and fails under the strict one is a within-seed forward reference.
 *
 *   node tools/course-optimization/check-within-seed-forward-refs.cjs <course_code> [--seed N] [--json]
 *
 * Exits 1 if any forward reference is found, 0 if clean — so it can gate a pass.
 */
require('dotenv').config();
const { Client } = require('pg');
const { checkVocabViolations } = require('../../services/course-builder/lib/validation.cjs');
const { extractVocab } = require('../../services/course-builder/lib/text-normalization.cjs');

async function main() {
  const args = process.argv.slice(2);
  const courseCode = args.find(a => !a.startsWith('--'));
  if (!courseCode) {
    console.error('usage: check-within-seed-forward-refs.cjs <course_code> [--seed N] [--json]');
    process.exit(2);
  }
  const seedArg = args.includes('--seed') ? Number(args[args.indexOf('--seed') + 1]) : null;
  const asJson = args.includes('--json');

  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();

  const { rows: legos } = await pg.query(
    `select seed_number, lego_index, type, target_text, components
       from course_legos where course_code = $1 order by seed_number, lego_index`, [courseCode]);
  const { rows: phrases } = await pg.query(
    `select id, seed_number, lego_index, position, phrase_role, known_text, target_text
       from course_practice_phrases
      where course_code = $1 and phrase_role in ('build','use')
        ${seedArg ? 'and seed_number = $2' : ''}
      order by seed_number, lego_index, position`,
    seedArg ? [courseCode, seedArg] : [courseCode]);
  await pg.end();

  const chunksOf = (lego) => {
    const out = [];
    extractVocab(lego.target_text, false).forEach(v => out.push(v));
    if (lego.type === 'M' && lego.components) {
      for (const c of lego.components) extractVocab(c.target, false).forEach(v => out.push(v));
    }
    return out;
  };

  // Vocab available AT a given (seed, legoIndex): everything strictly earlier,
  // plus this seed's legos up to and including legoIndex. Built once per cursor
  // by walking the ordered lego list — the list is small enough that rebuilding
  // per phrase-group is cheaper than any index.
  const availableAt = (seed, legoIndex) => {
    const set = new Set();
    for (const l of legos) {
      if (l.seed_number > seed) break;
      if (l.seed_number === seed && l.lego_index > legoIndex) break;
      chunksOf(l).forEach(v => set.add(v));
    }
    return set;
  };

  const findings = [];
  const byKey = new Map();
  for (const p of phrases) {
    const key = `${p.seed_number}:${p.lego_index}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(p);
  }
  for (const [key, group] of byKey) {
    const [seed, idx] = key.split(':').map(Number);
    const strict = availableAt(seed, idx);
    const loose = availableAt(seed, Infinity);
    const viol = new Map(
      checkVocabViolations(group.map(p => ({ target: p.target_text })), strict, courseCode)
        .map(v => [v.phrase, v.unknown]));
    for (const p of group) {
      const unknown = viol.get(p.target_text);
      if (!unknown) continue;
      // Partition the failure. The submission gate's own (looser) vocab set is
      // "prior seeds plus the WHOLE of this seed"; a phrase that tiles under
      // that but not under the strict cursor is a within-seed forward reference
      // — the defect this tool is named for. One that fails the loose set too
      // reaches past its own seed entirely, which is a larger, different defect
      // and is reported separately rather than folded into the same number.
      const looseFails = checkVocabViolations([{ target: p.target_text }], loose, courseCode).length > 0;
      findings.push({
        id: p.id, seed_number: p.seed_number, lego_index: p.lego_index,
        phrase_role: p.phrase_role, kind: looseFails ? 'beyond-own-seed' : 'within-seed-forward-ref',
        unknown, known_text: p.known_text, target_text: p.target_text,
      });
    }
  }

  if (asJson) {
    const within = findings.filter(f => f.kind === 'within-seed-forward-ref').length;
    console.log(JSON.stringify({ course_code: courseCode, phrases_checked: phrases.length,
      within_seed_forward_refs: within, beyond_own_seed: findings.length - within, findings }, null, 2));
  } else {
    for (const f of findings) {
      console.log(`${f.id}  seed ${f.seed_number} L${f.lego_index} [${f.phrase_role}] ${f.kind}  untileable from "${f.unknown}"`);
      console.log(`   EN: ${f.known_text}`);
      console.log(`   TG: ${f.target_text}`);
    }
    const within = findings.filter(f => f.kind === 'within-seed-forward-ref').length;
    console.log(`\n${courseCode}: ${phrases.length} phrases checked — `
      + `${within} within-seed forward reference(s), ${findings.length - within} reaching beyond their own seed`);
  }
  // process.exitCode, not process.exit(): exit() can truncate a large
  // --json payload still buffered on a piped stdout.
  process.exitCode = findings.length ? 1 : 0;
}

main().catch(e => { console.error(e.message); process.exit(2); });
