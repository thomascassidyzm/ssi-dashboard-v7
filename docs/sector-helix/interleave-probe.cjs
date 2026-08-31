#!/usr/bin/env node
/**
 * PROBE, not a component. Prints the seed-boundary interleave of two threads
 * over REAL spa_for_eng round counts (rounds = is_new legos per seed), with
 * pod laps at activation 6 / interval 5 on the TOTAL rounds counter.
 * Sector thread is a labelled stand-in (seeds 41-60's real lengths) because
 * no sector seeds exist yet. Read-only. See sector-helix-2026-08-31.md §3.
 *
 * Run from the Popty repo root (needs .env.psql):
 *   node docs/sector-helix/interleave-probe.cjs
 */
// Resolve deps from the repo the probe is RUN in (a docs worktree has no
// node_modules), so `node docs/sector-helix/interleave-probe.cjs` works from
// any checkout that holds .env.psql.
const { createRequire } = require('module');
const path = require('path');
const req = createRequire(path.join(process.cwd(), 'noop.js'));
req('dotenv').config({ path: '.env.psql' });
const pg = req('pg');

(async () => {
  const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const q = (lo, hi) => c.query(
    `select seed_number, count(*) filter (where is_new)::int n
       from course_legos where course_code='spa_for_eng'
        and seed_number between $1 and $2 group by 1 order by 1`, [lo, hi]);
  const core = (await q(1, 30)).rows.map(x => ({ seed: 'C' + x.seed_number, rounds: x.n }));
  const sector = (await q(41, 60)).rows.map(x => ({ seed: 'S' + x.seed_number, rounds: x.n }));
  await c.end();

  console.log('CORE 1-30 rounds/seed:  ', core.map(s => s.rounds).join(','));
  console.log('SECTOR stand-in 41-60:  ', sector.map(s => s.rounds).join(','));

  let total = 0, lap = 0, turn = 'C', ci = 0, si = 0;
  const podLap = t => t >= 6 && (t - 6) % 5 === 0;
  while (total < 52 && (ci < core.length || si < sector.length)) {
    const src = (turn === 'C' && ci < core.length) ? core[ci++]
              : (si < sector.length ? sector[si++] : core[ci++]);
    for (let k = 1; k <= src.rounds; k++) {
      total++;
      console.log(String(total).padStart(3), src.seed, `r${k}/${src.rounds}`,
        podLap(total) ? 'L' + (++lap) : '');
    }
    turn = turn === 'C' ? 'S' : 'C';
  }
})().catch(e => { console.error(e.message); process.exit(1); });
