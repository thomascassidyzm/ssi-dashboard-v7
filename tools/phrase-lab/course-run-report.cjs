#!/usr/bin/env node
/**
 * PER-COURSE RUN ACCOUNT — baskets done, blocked, errored, re-swept, missing
 * (job #443, 2026-09-27: after a pool cap the German run held ~670 errored
 * baskets and nothing said so). Read from the candidates tree, its -blocked
 * sibling and the runner's run-log; the course's LEGO list (seeds 11+) is the
 * denominator. READ-ONLY.
 *
 *   node tools/phrase-lab/course-run-report.cjs deu_for_eng <candidates-dir> [--since ISO] [--json out.json]
 *
 * DONE       a gate-passing candidate is on disk
 * BLOCKED    the gate refused it and no candidate is on disk
 * RE-SWEPT   it errored (or its pool was capped) at least once in this run,
 *            and a candidate is on disk now
 * ERRORED    it errored in this run and nothing is on disk
 * MISSING    no candidate, not blocked, no error in this run
 * Pool-capped bounces are counted separately from real errors.
 */
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');

const arg = (n, d = null) => { const i = process.argv.indexOf(n); return i === -1 ? d : process.argv[i + 1]; };

async function main() {
  const course = process.argv[2];
  const cands = process.argv[3];
  const since = arg('--since', '2026-09-27T01:57:00Z');
  const { supabase } = require('../../services/supabase-client.cjs');
  const legos = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('course_legos').select('seed_number,lego_index,lego_id')
      .eq('course_code', course).gte('seed_number', 11).order('seed_number').order('lego_index').range(from, from + 999);
    if (error) throw new Error(error.message);
    legos.push(...data);
    if (data.length < 1000) break;
  }
  const dirOf = (root, s) => path.join(root, `seed-${String(s).padStart(4, '0')}`);
  const blockedRoot = `${cands.replace(/\/$/, '')}-blocked`;
  const log = fs.existsSync(path.join(cands, 'run-log.jsonl'))
    ? fs.readFileSync(path.join(cands, 'run-log.jsonl'), 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((r) => r.ts >= since)
    : [];
  const errs = new Map();
  let poolBounces = 0; let realErrors = 0;
  for (const r of log.filter((x) => !x.ok)) {
    const capped = r.poolExhausted || /weekly limit|session limit|hit your (\w+ )?limit/i.test(r.error || '');
    if (capped) poolBounces += 1; else realErrors += 1;
    errs.set(r.lego_id, capped ? 'capped' : 'error');
  }
  const t = { course, legos: legos.length, done: 0, blocked: 0, reswept: 0, errored: 0, missing: 0, poolBounces, realErrors };
  for (const l of legos) {
    const file = `${l.lego_id}.json`;
    const has = fs.existsSync(path.join(dirOf(cands, l.seed_number), file));
    if (has) { t.done += 1; if (errs.has(l.lego_id)) t.reswept += 1; continue; }
    if (fs.existsSync(path.join(dirOf(blockedRoot, l.seed_number), file))) { t.blocked += 1; continue; }
    if (errs.has(l.lego_id)) t.errored += 1; else t.missing += 1;
  }
  console.log(`${course}: ${t.legos} baskets (seeds 11+) · done ${t.done} (re-swept after an error/cap ${t.reswept}) · blocked ${t.blocked} · errored ${t.errored} · missing ${t.missing} · run-log since ${since}: pool-capped bounces ${poolBounces}, real errors ${realErrors}`);
  if (arg('--json')) fs.writeFileSync(arg('--json'), JSON.stringify(t, null, 2));
}

main().catch((e) => { console.error(e); process.exit(1); });
