#!/usr/bin/env node
/**
 * THE NATURALNESS LOOP over a course's v3 candidates — judge, regenerate what
 * the judge flagged, judge again — so that what gets SCORED is the set after a
 * native-ear pass, not before it (Tom, 2026-09-27).
 *
 *   round 1  every candidate basket → naturalness-judge (Codex, serial)
 *            → <ev>/nat-r1.jsonl
 *   revise   every basket with a flagged phrase or an over-used collocation →
 *            the v3 door again, `revise` = its own set + the judge's words, so
 *            the rewrite keeps what was fine and must clear every gate again.
 *            The original goes to <ev>/candidates-orig/ (NEVER beside the
 *            candidates: qa-report and stem-reuse read every .json in a seed
 *            dir). A revision the gate BLOCKS is discarded and the original
 *            stays — a gate-passing clunky line beats a blocked set.
 *   round 2  every revised basket → the judge again → <ev>/nat-r2.jsonl
 * A gloss complaint (the LEGO's own wording) is recorded but never revised:
 * every phrase must contain the LEGO, so no rewrite can fix it. Those are
 * listed for whoever owns the LEGO.
 *
 * --follow keeps looping while generation is still writing baskets, until the
 * file <ev>/GEN-DONE exists and nothing is pending — so judging runs alongside
 * generation instead of after it.
 *
 * Revisions run as child processes on the pool routing puts first (same
 * ladder as run-course-v3-routed.cjs). WRITES NOTHING TO THE DATABASE.
 *
 *   CS_CONV_TOKEN=… node tools/phrase-lab/naturalness-pass.cjs ita_for_eng --ev <dir-with-candidates> [--follow] [--batch 20]
 */
require('dotenv').config({ quiet: true });
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { judgeBaskets, loadCandidates } = require('./naturalness-judge.cjs');

const arg = (n, d = null) => { const i = process.argv.indexOf(n); return i === -1 ? d : process.argv[i + 1]; };
const readJsonl = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The judge's verdict as rewrite instructions, quoted rather than paraphrased. */
function reasonsFor(v) {
  const r = v.flags.map((f) => {
    const side = [f.en_ok === false ? 'the English' : null, f.tl_ok === false ? 'the target language' : null].filter(Boolean).join(' and ');
    return `NATURALNESS — a native reader rejected ${side} of "${f.known}" → "${f.target}": ${f.why}.${f.fix ? ` Something a native would say instead: ${f.fix}.` : ''} Replace this phrase.`;
  });
  for (const o of v.overused || []) r.push(`NATURALNESS — the collocation "${o}" is stamped across this basket. Use it at most twice and vary the rest.`);
  return r;
}
const needsRevision = (v) => v.flagged > 0 || (v.overused || []).length > 0;

async function topPool() {
  const res = await fetch(`${process.env.CS_SURFACE || 'http://localhost:4317'}/api/accounts/routing`, { headers: { 'x-cs-conv': process.env.CS_CONV_TOKEN || '' } });
  const j = await res.json();
  return (j.urgencyOrder?.all || []).find((a) => a.open && !a.heldForHuman)?.name || 'account-3';
}

/** CHILD: revise the named baskets on the pool in SSI_CLAUDE_CONFIG_DIR. */
async function reviseWorker(course, ev, keys, conc) {
  const { generateLegoPhrases } = require('../../services/course-builder/lib/phrase-generation.cjs');
  const { supabase } = require('../../services/supabase-client.cjs');
  const r1 = new Map(readJsonl(path.join(ev, 'nat-r1.jsonl')).map((v) => [v.key, v]));
  const logPath = path.join(ev, 'nat-revise-log.jsonl');
  const queue = keys.slice();
  async function lane() {
    for (;;) {
      const key = queue.shift();
      if (!key) return;
      const v = r1.get(key);
      const seedDir = path.dirname(v.file);
      const orig = JSON.parse(fs.readFileSync(v.file, 'utf8'));
      const reasons = reasonsFor(v);
      let res;
      try {
        // Same course-so-far stem view as the runner (audit #423 (b)+(d)), so a
        // naturalness rewrite cannot reintroduce a house frame.
        const { windowedStemShares, loadCandidateStemBaskets } = require('../phrase-gate/stem-diversity.cjs');
        const stemShares = windowedStemShares(loadCandidateStemBaskets(path.join(ev, 'candidates')), orig.seedNumber);
        res = await generateLegoPhrases(supabase, course, orig.seedNumber, orig.legoIndex, {
          timeout: 900000, stemShares, revise: { phrases: { build: orig.build, use: orig.use }, reasons } });
      } catch (e) {
        fs.appendFileSync(logPath, JSON.stringify({ key, ok: false, error: String(e.message).slice(0, 300) }) + '\n');
        continue;
      }
      if (res.blocked) {
        fs.appendFileSync(logPath, JSON.stringify({ key, ok: false, blocked: true, failingGates: res.gate?.failingGates }) + '\n');
        continue; // keep the original: a gate-passing set beats a blocked one
      }
      const origDir = path.join(ev, 'candidates-orig', path.basename(seedDir));
      fs.mkdirSync(origDir, { recursive: true });
      fs.writeFileSync(path.join(origDir, path.basename(v.file)), JSON.stringify(orig, null, 2));
      fs.writeFileSync(v.file, JSON.stringify({ ...res, naturalnessRevision: { round1: { flagged: v.flagged, overused: v.overused }, reasons } }, null, 2));
      fs.appendFileSync(logPath, JSON.stringify({ key, ok: true, attempts: res.attempts?.length, elapsedMs: res.elapsedMs }) + '\n');
      console.error(`[nat-revise] ${key} revised (${v.flagged} flagged, ${v.overused.length} overused)`);
    }
  }
  await Promise.all(Array.from({ length: conc }, lane));
}

async function main() {
  if (process.argv[2] === 'revise-worker') {
    return reviseWorker(process.argv[3], arg('--ev'), arg('--keys').split(','), +arg('--conc', 3));
  }
  const course = process.argv[2];
  const ev = arg('--ev');
  const cands = path.join(ev, 'candidates');
  const follow = process.argv.includes('--follow');
  const batch = +arg('--batch', 20);
  const reviseConc = +arg('--revise-conc', 3);
  const r1f = path.join(ev, 'nat-r1.jsonl');
  const r2f = path.join(ev, 'nat-r2.jsonl');

  for (;;) {
    const genDone = fs.existsSync(path.join(ev, 'GEN-DONE'));
    // round 1: judge everything not yet judged
    const r1keys = new Set(readJsonl(r1f).map((v) => v.key));
    const fresh = loadCandidates(cands).filter((b) => !r1keys.has(b.key));
    let failed = 0;
    if (fresh.length) failed += (await judgeBaskets(course, fresh.slice(0, batch * 5), r1f, { batch })).failed;

    // revise everything flagged in round 1 and not yet attempted
    const attempted = new Set(readJsonl(path.join(ev, 'nat-revise-log.jsonl')).map((x) => x.key));
    const toRevise = readJsonl(r1f).filter((v) => needsRevision(v) && v.file && !attempted.has(v.key)).map((v) => v.key);
    if (toRevise.length) {
      const pool = await topPool();
      console.error(`[nat] revising ${toRevise.length} baskets on ${pool}`);
      await new Promise((resolve) => {
        const child = spawn(process.execPath, [__filename, 'revise-worker', course, '--ev', ev, '--keys', toRevise.join(','), '--conc', String(reviseConc)],
          { env: { ...process.env, SSI_CLAUDE_CONFIG_DIR: path.join(os.homedir(), '.cs-accounts', pool) }, stdio: ['ignore', 'inherit', 'inherit'] });
        child.on('exit', resolve);
      });
    }

    // round 2: judge every revised basket once more
    const revised = readJsonl(path.join(ev, 'nat-revise-log.jsonl')).filter((x) => x.ok).map((x) => x.key);
    const r2keys = new Set(readJsonl(r2f).map((v) => v.key));
    const pending2 = revised.filter((k) => !r2keys.has(k));
    if (pending2.length) failed += (await judgeBaskets(course, loadCandidates(cands, new Set(pending2)), r2f, { batch })).failed;
    // A judge that is failing (Codex limit, auth) is waited out, never hammered.
    if (failed) { console.error(`[nat] ${failed} baskets unjudged this pass — waiting 5 min`); await sleep(300000); }

    const idle = !fresh.length && !toRevise.length && !pending2.length;
    if (idle && (!follow || genDone)) break;
    if (idle) await sleep(60000);
  }
  console.error('[nat] PASS COMPLETE');
}

module.exports = { reasonsFor, needsRevision };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
