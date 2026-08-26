#!/usr/bin/env node
/**
 * Estate sweep for the BUILD-phrase self-teaching gate — "does each BUILD phrase contain the
 * known-side word its LEGO teaches?"
 *
 * Reports, per course, THREE outcomes and never two, exactly as sweep.cjs does:
 *   pass      — the prompt uses the taught word, in some form
 *   violation — the prompt uses a DIFFERENT word
 *   unchecked — with the reason code; a refusal, never a soft pass
 *
 * BUILD rows only. USE phrases recombine and are a separate question.
 *
 * READ-ONLY. It writes nothing to the database and touches no course content.
 *
 * Usage:
 *   node tools/known-side/build-teaches-word-sweep.cjs deu_for_jpn fra_for_jpn ...
 *   node tools/known-side/build-teaches-word-sweep.cjs --known=jpn      every jpn-known course
 *   env SWEEP_OUT=path.json                                            itemised findings
 */

require('dotenv').config({ quiet: true });
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const { loadContract, knownLangOf } = require('./inventory.cjs');
const { checkBuildTeachesWord, STATUS } = require('../../services/course-builder/lib/build-teaches-word.cjs');

function supa() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
}

async function coursesWithKnown(sb, lang) {
  const { data, error } = await sb.from('courses').select('course_code').order('course_code');
  if (error) throw new Error(error.message);
  return data.map((c) => c.course_code).filter((c) => knownLangOf(c) === lang && !/^zzz_test/.test(c));
}

/** Every LEGO of one course with its BUILD rows attached. Paged, because courses run to 4k rows. */
async function loadCourse(sb, courseCode) {
  const page = async (table, cols) => {
    const out = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await sb.from(table).select(cols).eq('course_code', courseCode).range(from, from + 999);
      if (error) throw new Error(`${table} ${courseCode}: ${error.message}`);
      out.push(...data);
      if (data.length < 1000) return out;
    }
  };
  const legos = await page('course_legos', 'lego_id,seed_number,lego_index,is_new,known_text,target_text');
  const phrases = await page('course_practice_phrases', 'id,seed_number,lego_index,position,known_text,target_text,phrase_role');
  const builds = new Map();
  for (const p of phrases) {
    if (p.phrase_role !== 'build') continue;
    const k = `${p.seed_number}:${p.lego_index}`;
    if (!builds.has(k)) builds.set(k, []);
    builds.get(k).push(p);
  }
  for (const l of legos) {
    l.build = (builds.get(`${l.seed_number}:${l.lego_index}`) || []).sort((a, b) => a.position - b.position);
  }
  return legos;
}

async function main() {
  const argv = process.argv.slice(2);
  const knownFlag = argv.find((a) => a.startsWith('--known='));
  const sb = supa();
  const courses = knownFlag
    ? await coursesWithKnown(sb, knownFlag.split('=')[1])
    : argv.filter((a) => !a.startsWith('--'));
  if (!courses.length) { console.error('give course codes, or --known=<lang>'); process.exit(1); }

  const findings = [];
  const rows = [];
  for (const code of courses) {
    const knownLang = knownLangOf(code);
    const contract = (loadContract(code) || {}).contract || null;
    const legos = await loadCourse(sb, code);
    const tally = { pass: 0, violation: 0, unchecked: 0, legosFlagged: 0, legosAllFlagged: 0, reasons: {} };
    for (const l of legos) {
      if (!l.build.length) continue;
      let flagged = 0;
      for (const p of l.build) {
        const r = checkBuildTeachesWord(l.known_text, p.known_text, { knownLang, contract, courseCode: code });
        if (r.status === STATUS.VIOLATION) {
          tally.violation++; flagged++;
          findings.push({ course: code, lego_id: l.lego_id, is_new: l.is_new, phrase_id: p.id,
            taught: l.known_text, target: l.target_text, prompt: p.known_text, missing: r.missing, detail: r.detail });
        } else if (r.status === STATUS.UNCHECKED) {
          tally.unchecked++; tally.reasons[r.reason] = (tally.reasons[r.reason] || 0) + 1;
        } else tally.pass++;
      }
      if (flagged) tally.legosFlagged++;
      if (flagged === l.build.length) tally.legosAllFlagged++;
    }
    rows.push({ code, ...tally });
  }

  const pct = (n, d) => (d ? `${((n / d) * 100).toFixed(1)}%` : '—');
  console.log('\ncourse            build rows    pass  VIOLATION  unchecked   LEGOs flagged  (all rows)');
  for (const r of rows) {
    const total = r.pass + r.violation + r.unchecked;
    console.log(`${r.code.padEnd(16)} ${String(total).padStart(9)} ${String(r.pass).padStart(7)} ${String(r.violation).padStart(10)} ${String(r.unchecked).padStart(10)}   ${String(r.legosFlagged).padStart(13)}  ${String(r.legosAllFlagged).padStart(9)}   ${pct(r.violation, total)}`);
  }
  const sum = (k) => rows.reduce((a, r) => a + r[k], 0);
  console.log(`${'TOTAL'.padEnd(16)} ${String(sum('pass') + sum('violation') + sum('unchecked')).padStart(9)} ${String(sum('pass')).padStart(7)} ${String(sum('violation')).padStart(10)} ${String(sum('unchecked')).padStart(10)}   ${String(sum('legosFlagged')).padStart(13)}  ${String(sum('legosAllFlagged')).padStart(9)}`);
  console.log('\nUNCHECKED reasons (a refusal is never a pass):');
  const allReasons = {};
  for (const r of rows) for (const [k, v] of Object.entries(r.reasons)) allReasons[k] = (allReasons[k] || 0) + v;
  for (const [k, v] of Object.entries(allReasons).sort((a, b) => b[1] - a[1])) console.log(`  ${String(v).padStart(6)}  ${k}`);

  if (process.env.SWEEP_OUT) {
    fs.writeFileSync(process.env.SWEEP_OUT, JSON.stringify({ rows, findings }, null, 1));
    console.log(`\n${findings.length} itemised findings → ${process.env.SWEEP_OUT}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
