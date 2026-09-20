#!/usr/bin/env node
/**
 * RUN THE v3 PHRASE GENERATOR ACROSS A RANGE OF A LIVE COURSE — and write the
 * candidates to disk, never to the database.
 *
 * This is the door's own implementation (`services/course-builder/lib/
 * phrase-generation.cjs` → `generateLegoPhrases`) driven in-process instead of
 * over HTTP, for one reason: the HTTP door runs inside the shared course-builder
 * service, whose `claude` CLI is pinned to the account-3 config dir. Driving it
 * here lets the caller point `SSI_CLAUDE_CONFIG_DIR` at whichever pool is meant
 * to pay, without re-enving or restarting a live service other work depends on.
 * Same prompt, same gates, same scorer, same model.
 *
 * IT WRITES NOTHING TO SUPABASE. It reads the course (the generator needs the
 * inventory and the declaration) and writes JSON to the output directory. The
 * candidates are evidence; whether any of them ever replaces live content is a
 * separate, human decision.
 *
 *   SSI_CLAUDE_CONFIG_DIR=~/.cs-accounts/account-5 \
 *   node tools/phrase-lab/run-course-v3.cjs ita_for_eng --from 1 --to 40 \
 *     --out ~/ssi-evidence/ssi-dashboard-v7/tools/phrase-lab/ita-v3/candidates
 *
 * LAYOUT: one file per basket, one directory per seed —
 *   <out>/seed-0250/S0250L01.json   (the door's own response shape)
 * which is what `tools/frame-layer/qa-report.cjs --candidates <dir>` reads. The
 * per-seed directory matters: the QA tool filters candidate rows by lego_index
 * but not by seed, so pointing it at a flat directory of a whole course would
 * score seed 7's L01 against seed 250's declaration.
 *
 * RESUMABLE by construction: a basket whose file already exists is skipped, so
 * a run cut short by a rate limit or a window resumes with the same command.
 *
 * CONCURRENCY is deliberately small (default 3). The work is token-bound — each
 * basket is a spawned `claude --print` waiting on the API — so more workers do
 * not go faster on a rate-limited account and make a partial run harder to
 * reconcile.
 */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');
const { generateLegoPhrases } = require('../../services/course-builder/lib/phrase-generation.cjs');

/**
 * A POOL THAT HAS STOPPED SERVING IS NOT A PER-BASKET FAILURE — it is the end
 * of the run. The 2026-09-20 German run proved why this matters: the account
 * hit its rolling five-hour session limit at seed 64 and the loop cheerfully
 * spawned and failed the remaining 56 baskets in seconds, "completing" a range
 * it had generated nothing for. Nothing was lost (a failed basket writes no
 * file, so the range resumes), but the run reported COMPLETE and the log filled
 * with 56 identical errors where one line and a stop belonged.
 */
function isPoolExhausted (message) {
  return /session limit|usage limit|rate limit|quota|429|credit balance/i.test(String(message || ''));
}
/** Exit code that means "the pool stopped serving", so a wrapper can stop too. */
const POOL_EXHAUSTED_EXIT = 3;

const arg = (n, d = null) => { const i = process.argv.indexOf(n); return i === -1 ? d : process.argv[i + 1]; };

async function main() {
  const course = process.argv[2];
  if (!course || course.startsWith('--')) {
    console.error('usage: run-course-v3.cjs <course> --from N --to M --out <dir> [--concurrency 3]');
    process.exit(2);
  }
  const from = +arg('--from', 1), to = +arg('--to', from);
  const out = arg('--out');
  if (!out) { console.error('--out is required'); process.exit(2); }
  const conc = +arg('--concurrency', 3);

  const sb = createClient(process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);

  const { data: legos, error } = await sb.from('course_legos')
    .select('seed_number,lego_index,lego_id,known_text,target_text')
    .eq('course_code', course).gte('seed_number', from).lte('seed_number', to)
    .order('seed_number').order('lego_index');
  if (error) throw new Error(error.message);

  const pending = legos.filter(l => !fs.existsSync(path.join(out, `seed-${String(l.seed_number).padStart(4, '0')}`, `${l.lego_id}.json`)));
  console.log(`${course} seeds ${from}-${to}: ${legos.length} baskets, ${legos.length - pending.length} already on disk, ${pending.length} to generate, concurrency ${conc}`);
  console.log(`claude config dir: ${process.env.SSI_CLAUDE_CONFIG_DIR || '(default account-3)'}`);

  const logPath = path.join(out, 'run-log.jsonl');
  fs.mkdirSync(out, { recursive: true });
  let done = 0, blocked = 0, errored = 0, exhausted = null;
  const queue = pending.slice();

  async function worker() {
    for (;;) {
      const l = queue.shift();
      if (!l) return;
      const dir = path.join(out, `seed-${String(l.seed_number).padStart(4, '0')}`);
      fs.mkdirSync(dir, { recursive: true });
      const started = Date.now();
      try {
        const res = await generateLegoPhrases(sb, course, l.seed_number, l.lego_index, { timeout: 900000 });
        fs.writeFileSync(path.join(dir, `${l.lego_id}.json`), JSON.stringify(res, null, 2));
        if (res.blocked) blocked += 1;
        done += 1;
        fs.appendFileSync(logPath, JSON.stringify({
          ts: new Date().toISOString(), lego_id: l.lego_id, seed: l.seed_number, lego_index: l.lego_index,
          lego: `${l.known_text} / ${l.target_text}`, ok: true, blocked: res.blocked,
          failingGates: res.gate?.failingGates || null,
          declarationFloors: res.declarationCheck?.floor_failures || null,
          build: res.build.length, use: res.use.length, attempts: res.attempts?.length,
          elapsedMs: res.elapsedMs,
        }) + '\n');
        console.log(`[${done + errored}/${pending.length}] ${l.lego_id} ${res.blocked ? 'BLOCKED' : 'ok'} ${res.build.length}B/${res.use.length}U ${Math.round((Date.now() - started) / 1000)}s`);
      } catch (e) {
        errored += 1;
        fs.appendFileSync(logPath, JSON.stringify({
          ts: new Date().toISOString(), lego_id: l.lego_id, seed: l.seed_number,
          lego_index: l.lego_index, ok: false, error: e.message,
        }) + '\n');
        console.log(`[${done + errored}/${pending.length}] ${l.lego_id} ERROR ${e.message}`);
        if (isPoolExhausted(e.message)) {
          exhausted = e.message;
          queue.length = 0;   // drain: every remaining basket would fail the same way
          return;
        }
      }
    }
  }

  await Promise.all(Array.from({ length: conc }, worker));
  console.log(`\ngenerated ${done} (${blocked} blocked by the gate), ${errored} errored. log: ${logPath}`);
  if (exhausted) {
    console.log(`POOL EXHAUSTED — stopping with ${queue.length ? queue.length : 'the rest of'} the range ungenerated: ${exhausted}`);
    process.exitCode = POOL_EXHAUSTED_EXIT;
  }
}

if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });

module.exports = { isPoolExhausted, POOL_EXHAUSTED_EXIT };
