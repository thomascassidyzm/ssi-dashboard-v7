#!/usr/bin/env node
/**
 * READ-ONLY morpheme-level census of the JAPANESE target side, for jpn_for_eng.
 * Ad-hoc, one-shot analysis tool for job #94 (which level is jpn_for_eng failing at).
 * Not wired into any pipeline. Regex-based; false-positive rates must be hand-verified
 * per axis before quoting a number (see the job brief).
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
const { Client } = require('pg');

const COUNTERS = /(\d|[一二三四五六七八九十百千万])(人|匹|本|枚|個|冊|台|杯|回|つ)/;

function stripHaHomes(s) {
  // remove では、には、でも、または、ばかり (particle-cluster homes of は that are NOT the topic は)
  return s.replace(/では|には|でも|または|ばかり/g, '');
}
function stripGaHomes(s) {
  // remove ですが (concessive が, not subject が), and the idiomatic ことがある /
  // ほうがいい constructions, whose が is a fixed-phrase particle, not a subject marker.
  // Found by hand-verifying a 40-row random sample (job #94): both idioms inflated the
  // raw が count with non-subject hits.
  return s.replace(/ですが|ことがある|ほうがいい/g, '');
}
function stripPastFalsePositives(s) {
  // たい (desiderative "want to") and ため(に) ("in order to") both contain the bare
  // た character but carry no past-tense meaning; the raw past regex hand-verified on a
  // 40-row sample flagged 座りたい, やめたくない, 閉じたい, and 生徒のために... as
  // past purely from this substring collision. Strip both before testing for past.
  return s.replace(/たい|ため/g, '');
}

function classify(target) {
  const t = target || '';
  const stripped = stripGaHomes(stripHaHomes(t));
  const hasHa = /は/.test(stripped);
  const hasGa = /が/.test(stripped);

  const politeFinal = /(です|ます|ました|ません|でした|ましょう)/.test(t);
  const teForm = /て(ください|る|た|も|は)?$/.test(t) || /て$/.test(t);
  const plainFinal = !politeFinal; // coarse: anything not carrying a polite final morpheme

  const negative = /(ない|ません|なかった|ず)/.test(t);
  const past = /(た|ました|でした)(?!ら)/.test(stripPastFalsePositives(t)); // rough past marker (excludes conditional たら)
  const progressive = /て(い|る|ます)/.test(t) || /てる/.test(t);
  const nonPast = !past && !progressive;

  const counter = COUNTERS.test(t);
  const finalParticle = /(か|ね|よ|の)[？?」]*$/.test(t);
  const question = /[？?]/.test(t);
  const request = /て(ください|くれ)/.test(t);
  const conditional = /(たら|れば|なら)/.test(t);

  return {
    hasHa, hasGa, politeFinal, teForm, negative, past, progressive, nonPast,
    counter, finalParticle, question, request, conditional,
  };
}

async function main() {
  const course = process.argv[2] || 'jpn_for_eng';
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const { rows } = await c.query(
    `select seed_number, lego_index, phrase_role, target_text
     from course_practice_phrases
     where course_code=$1 and phrase_role in ('build','use')`, [course]);
  await c.end();

  const agg = {};
  const byBasket = {};
  for (const r of rows) {
    const cl = classify(r.target_text);
    for (const k of Object.keys(cl)) {
      agg[k] = agg[k] || { true: 0, total: 0 };
      agg[k].total++;
      if (cl[k]) agg[k].true++;
    }
    const key = `${r.seed_number}:${r.lego_index}`;
    byBasket[key] = byBasket[key] || [];
    byBasket[key].push({ role: r.phrase_role, target: r.target_text, cl });
  }

  console.log(`${course}: ${rows.length} build+use phrases (excl. components)`);
  for (const [k, v] of Object.entries(agg)) {
    console.log(`  ${k.padEnd(14)} ${v.true}/${v.total} (${(100 * v.true / v.total).toFixed(1)}%)`);
  }

  if (process.argv.includes('--baskets')) {
    const wantIdx = process.argv.indexOf('--baskets');
    const list = process.argv[wantIdx + 1].split(',');
    console.log('\n--- per-basket breakdown ---');
    for (const key of list) {
      const items = byBasket[key];
      if (!items) { console.log(`${key}: NO DATA`); continue; }
      const n = items.length;
      const distinctRegisters = new Set(items.map(i => i.cl.politeFinal ? 'polite' : (i.cl.teForm ? 'te-form' : 'plain')));
      const haCount = items.filter(i => i.cl.hasHa).length;
      const gaCount = items.filter(i => i.cl.hasGa).length;
      const negCount = items.filter(i => i.cl.negative).length;
      const pastCount = items.filter(i => i.cl.past).length;
      const progCount = items.filter(i => i.cl.progressive).length;
      const counterCount = items.filter(i => i.cl.counter).length;
      const finalPCount = items.filter(i => i.cl.finalParticle).length;
      const qCount = items.filter(i => i.cl.question).length;
      const reqCount = items.filter(i => i.cl.request).length;
      const condCount = items.filter(i => i.cl.conditional).length;
      console.log(`${key}  n=${n}  registers={${[...distinctRegisters].join(',')}}  ha=${haCount} ga=${gaCount} neg=${negCount} past=${pastCount} prog=${progCount} counter=${counterCount} finalP=${finalPCount} q=${qCount} req=${reqCount} cond=${condCount}`);
    }
  }
}
main().catch(e => { console.error(e); process.exit(1); });
