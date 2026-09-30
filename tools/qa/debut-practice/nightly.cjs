#!/usr/bin/env node
/*
 * nightly.cjs — the daily alarm for debut LEGOs with no practice, across every learner-facing course.
 *
 * Why it exists (job #912, Tom 2026-09-30 11:35Z): the release gate only fires on a status change and
 * live courses never change status again. The database now refuses any write that MAKES a debut empty
 * (trigger debut_keeps_practice), but it grandfathers the debuts that were already empty — so this is
 * the eye on that backlog, and the backstop for what the trigger lets through by design (a LEGO born
 * empty: an INSERT is a birth, not a loss).
 *
 * The rule is the database's own: public.debut_practice_gaps() — a debut (is_new) with no BUILD or USE
 * row beyond the bare LEGO, S0001L01 excepted. A live test pins it to services/shared/debut-practice.cjs.
 *
 * WHEN IT SPEAKS, into Watson's room (command-surface ops/watson-notice.js, relay "debut-practice"):
 *   - any debut that is empty today and was not yesterday — named in full, course + LEGO;
 *   - Mondays, the standing backlog while it is non-zero, one line per course;
 *   - a day it cannot run.
 * A day where nothing new went empty is silent: the room takes a turn on every notice it receives, and
 * a daily repeat of the same 400 names costs a turn with nothing new in it.
 *
 *   node tools/qa/debut-practice/nightly.cjs [--no-notice] [--force-notice]
 * Exit: 0 ran, 2 could not run (and said so).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const STATE = process.env.DEBUT_PRACTICE_STATE || '/home/tomcassidy/.local/state/ssi-debut-practice';
const NOTICE = process.env.WATSON_NOTICE || '/home/tomcassidy/command-surface/ops/watson-notice.js';
const LEARNER_FACING = ['beta', 'released', 'live']; // services/shared/debut-practice.cjs LEARNER_FACING
const NAME_CAP = 40;
// Tom, ruling r-2026-09-30-welsh-courses-hand-recorded-: Welsh is hand-recorded — "do not worry about
// Welsh at all". Out of the alarm and its Monday backlog; the database write guard stays on for them.
const isWelsh = (code) => /^cym_/.test(code);

function dbUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const f = [path.join(__dirname, '../../../.env.psql'), '/home/tomcassidy/SSi/ssi-dashboard-v7-clean/.env.psql'].find(fs.existsSync);
  const m = f && fs.readFileSync(f, 'utf8').match(/DATABASE_URL=(.+)/);
  return m ? m[1].trim().replace(/^["']|["']$/g, '') : null;
}

async function readGaps() {
  const { Client } = require('pg');
  const c = new Client({ connectionString: dbUrl() });
  await c.connect();
  try {
    await c.query("SET statement_timeout = '10min'");
    const { rows } = await c.query(
      `SELECT g.course_code, g.lego_id, g.known_text, g.target_text
         FROM debut_practice_gaps(ARRAY(SELECT course_code FROM courses WHERE status::text = ANY ($1))) g`, [LEARNER_FACING]);
    return rows.filter((g) => !isWelsh(g.course_code));
  } finally { await c.end().catch(() => {}); }
}

const key = (g) => `${g.course_code} ${g.lego_id}`;

function byCourse(gaps) {
  const m = new Map();
  for (const g of gaps) m.set(g.course_code, (m.get(g.course_code) || 0) + 1);
  return [...m].sort((a, b) => b[1] - a[1]);
}

/** Pure: what to say today, or null for a silent day. prevKeys null = first run. */
function compose(gaps, prevKeys, { monday = false, force = false } = {}) {
  const fresh = prevKeys ? gaps.filter((g) => !prevKeys.has(key(g))) : [];
  const standing = byCourse(gaps).map(([c, n]) => `  ${c}: ${n}`);
  const L = [];
  if (!prevKeys) {
    L.push(`Debut-practice alarm, first run: ${gaps.length} debut LEGO(s) in learner-facing courses have no practice phrase. This is the baseline — from tomorrow it speaks only when a new one appears, and on Mondays while the backlog is not zero.`);
    L.push(...standing);
  } else if (fresh.length) {
    L.push(`${fresh.length} debut LEGO(s) in a learner-facing course have no practice since yesterday — a learner is presented these and never practises them:`);
    for (const g of fresh.slice(0, NAME_CAP)) L.push(`  ${g.course_code} ${g.lego_id} "${g.known_text}" → "${g.target_text}"`);
    if (fresh.length > NAME_CAP) L.push(`  …and ${fresh.length - NAME_CAP} more`);
    L.push('The database refuses writes that empty a debut, so a new one means a LEGO was born empty or went live empty.');
    L.push(`Standing total ${gaps.length}:`, ...standing);
  } else if ((monday || force) && gaps.length) {
    L.push(`Monday: ${gaps.length} debut LEGO(s) in learner-facing courses still have no practice phrase (nothing new):`, ...standing);
  } else return null;
  L.push('List them: node tools/check-debut-practice.cjs <course>. Refill: tools/course-optimization/regenerate-debut-practice.cjs.');
  return L.join('\n');
}

function log(s) { process.stdout.write(`${new Date().toISOString()} ${s}\n`); }

function say(text, noNotice) {
  if (noNotice) { log(`--no-notice; would have said:\n${text}`); return; }
  try { execFileSync(process.execPath, [NOTICE, text, 'debut-practice'], { stdio: 'inherit', timeout: 60e3 }); log('notice posted to Watson'); }
  catch (e) { log(`notice FAILED (${e.message}):\n${text}`); }
}

async function main(argv) {
  const noNotice = argv.includes('--no-notice');
  let gaps;
  try { gaps = await readGaps(); }
  catch (e) {
    log(`CANNOT-RUN: ${e.message}`);
    say(`The daily debut-practice alarm could not run: ${e.message}. Until it does, a debut emptied since the last run goes unseen.`, noNotice);
    process.exit(2);
  }
  let prevKeys = null;
  try { prevKeys = new Set(JSON.parse(fs.readFileSync(path.join(STATE, 'latest.json'), 'utf8')).gaps.map(key)); } catch { /* first run */ }
  fs.mkdirSync(STATE, { recursive: true });
  const snap = { generated_at: new Date().toISOString(), total: gaps.length, gaps };
  fs.writeFileSync(path.join(STATE, `${snap.generated_at.slice(0, 10)}.json`), JSON.stringify(snap, null, 1));
  fs.writeFileSync(path.join(STATE, 'latest.json'), JSON.stringify(snap, null, 1));
  log(`ran: ${gaps.length} empty debuts in learner-facing courses`);
  const text = compose(gaps, prevKeys, { monday: new Date().getUTCDay() === 1, force: argv.includes('--force-notice') });
  if (text) say(text, noNotice); else log('quiet — nothing new went empty');
}

module.exports = { compose, isWelsh };
if (require.main === module) main(process.argv.slice(2));
