#!/usr/bin/env node
/**
 * STAGE 1 RUNNER — pull every BUILD phrase in the estate straight from the live database and
 * push it through the conservative pre-filter, on BOTH sides.
 *
 * READ-ONLY. Writes nothing to the database.
 *
 * Emits the funnel — rows in, cleared, undecided — per course per side, and writes the
 * undecided ones out as the candidate list stage 2 reads.
 *
 * Usage:
 *   node tools/teaches-word/funnel.cjs                       whole estate
 *   node tools/teaches-word/funnel.cjs spa_for_eng fra_for_eng
 *   OUT=/path/candidates.json node tools/teaches-word/funnel.cjs
 */

const path = require('path');
const fs = require('fs');
const { Client } = require('pg');
const { prefilter, VERDICT } = require('./prefilter.cjs');

const DOTENV_PSQL = path.resolve(__dirname, '../../.env.psql');

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  for (const p of [DOTENV_PSQL, path.resolve(process.cwd(), '.env.psql')]) {
    if (!fs.existsSync(p)) continue;
    const m = fs.readFileSync(p, 'utf8').match(/DATABASE_URL\s*=\s*["']?([^"'\n]+)/);
    if (m) return m[1];
  }
  throw new Error('no DATABASE_URL — .env.psql not found');
}

const SQL = `
  select l.course_code,
         l.lego_id,
         l.seed_number,
         l.lego_index,
         l.is_new,
         l.known_text  as lego_known,
         l.target_text as lego_target,
         p.id          as phrase_id,
         p.known_text  as phrase_known,
         p.target_text as phrase_target
    from course_practice_phrases p
    join course_legos l
      on l.course_code = p.course_code
     and l.seed_number = p.seed_number
     and l.lego_index  = p.lego_index
   where p.phrase_role = 'build'
     and l.course_code not like 'zzz_test%'
     $FILTER
   order by l.course_code, l.seed_number, l.lego_index, p.position
`;

async function main() {
  const courses = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const client = new Client({ connectionString: databaseUrl() });
  await client.connect();
  const sql = SQL.replace('$FILTER', courses.length ? 'and l.course_code = any($1)' : '');
  const { rows } = await client.query(sql, courses.length ? [courses] : []);
  await client.end();

  const byCourse = new Map();
  const candidates = [];
  for (const r of rows) {
    if (!byCourse.has(r.course_code)) {
      byCourse.set(r.course_code, { course: r.course_code, rows: 0,
        known: { clear: 0, read: 0, skip: 0 }, target: { clear: 0, read: 0, skip: 0 } });
    }
    const t = byCourse.get(r.course_code);
    t.rows++;
    for (const side of ['known', 'target']) {
      const taught = side === 'known' ? r.lego_known : r.lego_target;
      const sentence = side === 'known' ? r.phrase_known : r.phrase_target;
      const v = prefilter(taught, sentence);
      t[side][v.verdict]++;
      if (v.verdict === VERDICT.READ) {
        candidates.push({
          course: r.course_code, side, lego_id: r.lego_id, phrase_id: r.phrase_id,
          seed: r.seed_number, lego_index: r.lego_index, is_new: r.is_new,
          taught, sentence,
          pair_known: r.lego_known, pair_target: r.lego_target,
        });
      }
    }
  }

  const tallies = [...byCourse.values()].sort((a, b) => b.rows - a.rows);
  const out = process.env.OUT;
  if (out) fs.writeFileSync(out, JSON.stringify({ tallies, candidates }, null, 1));

  const pct = (n, d) => (d ? `${((n / d) * 100).toFixed(1)}%` : '—');
  console.log('course'.padEnd(20) + 'rows'.padStart(8) + '  |  known: clear / READ / skip  |  target: clear / READ / skip');
  for (const t of tallies) {
    console.log(t.course.padEnd(20) + String(t.rows).padStart(8) +
      `  |  ${String(t.known.clear).padStart(6)} ${String(t.known.read).padStart(6)} ${String(t.known.skip).padStart(5)} (${pct(t.known.read, t.rows)})` +
      `  |  ${String(t.target.clear).padStart(6)} ${String(t.target.read).padStart(6)} ${String(t.target.skip).padStart(5)} (${pct(t.target.read, t.rows)})`);
  }
  const sum = (side, k) => tallies.reduce((a, t) => a + t[side][k], 0);
  console.log(`\nTOTAL ${rows.length} build rows across ${tallies.length} courses`);
  console.log(`  known side : ${sum('known', 'clear')} cleared, ${sum('known', 'read')} to read (${pct(sum('known', 'read'), rows.length)}), ${sum('known', 'skip')} not applicable`);
  console.log(`  target side: ${sum('target', 'clear')} cleared, ${sum('target', 'read')} to read (${pct(sum('target', 'read'), rows.length)}), ${sum('target', 'skip')} not applicable`);
  if (out) console.log(`\n${candidates.length} candidates -> ${out}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
