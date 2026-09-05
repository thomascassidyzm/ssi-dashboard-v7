#!/usr/bin/env node
// Census: seeds where course_seeds.decomposed_at IS NOT NULL (the field
// build-manager.cjs:getBuildProgress actually trusts as "done") but the
// underlying course_legos/course_practice_phrases content is incomplete.
// Read-only. No writes. See job brief: P1b follow-on to the seed/complete
// write-order fix (cs/585-p1-seed-released-before-content).
require('dotenv').config({ path: process.env.ENV_PSQL_PATH || '.env.psql' });
const { Client } = require('pg');
const fs = require('fs');

async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();

  // Category 1 (true P1 signature): decomposed_at IS NOT NULL, zero course_legos rows.
  const cat1 = (await c.query(`
    select s.course_code, s.seed_number, s.decomposed_at
    from course_seeds s
    left join course_legos l on l.course_code = s.course_code and l.seed_number = s.seed_number
    where s.decomposed_at is not null and l.id is null
    order by s.course_code, s.seed_number
  `)).rows;

  // Category 1b (separate, broader pattern): status='released' but decomposed_at NULL
  // and zero legos. NOT the getBuildProgress signal, but worth reporting distinctly —
  // looks like a bulk metadata import, not the seed/complete write-order bug.
  const cat1b = (await c.query(`
    select s.course_code, s.seed_number
    from course_seeds s
    left join course_legos l on l.course_code = s.course_code and l.seed_number = s.seed_number
    where s.decomposed_at is null and s.status = 'released' and l.id is null
    order by s.course_code, s.seed_number
  `)).rows;

  // Category 2 (true P1 signature): decomposed_at IS NOT NULL, has legos, but at least
  // one NEW lego (is_new=true) has zero course_practice_phrases rows. Repeats
  // (is_new=false) legitimately have zero phrases estate-wide (5882/6625 = 89% of all
  // is_new=false legos have none) so they are excluded — that is not a defect.
  const cat2 = (await c.query(`
    select s.course_code, s.seed_number, l.lego_index, l.lego_id, s.decomposed_at, l.created_at as lego_created_at
    from course_seeds s
    join course_legos l on l.course_code = s.course_code and l.seed_number = s.seed_number
    left join course_practice_phrases p
      on p.course_code = l.course_code and p.seed_number = l.seed_number and p.lego_index = l.lego_index
    where s.decomposed_at is not null
      and l.is_new = true
      and p.id is null
    order by s.course_code, s.seed_number, l.lego_index
  `)).rows;

  await c.end();

  const summarize = (rows, keyFn) => {
    const byCourse = {};
    for (const r of rows) {
      const course = r.course_code;
      byCourse[course] = byCourse[course] || { count: 0, seeds: new Set() };
      byCourse[course].count++;
      byCourse[course].seeds.add(keyFn(r));
    }
    return byCourse;
  };

  const printByCourse = (title, rows, byCourse) => {
    console.log(`=== ${title} ===`);
    console.log('total affected rows:', rows.length);
    for (const [course, info] of Object.entries(byCourse).sort()) {
      const seeds = [...info.seeds].sort((a, b) => a - b);
      console.log(`  ${course}: ${info.count} rows / ${seeds.length} seeds (first 25: ${seeds.slice(0, 25).join(',')})`);
    }
    console.log('');
  };

  printByCourse('CATEGORY 1 (true P1 signature): decomposed_at set, ZERO course_legos rows', cat1, summarize(cat1, r => r.seed_number));
  printByCourse('CATEGORY 1b (separate pattern): status=released, decomposed_at NULL, ZERO course_legos rows', cat1b, summarize(cat1b, r => r.seed_number));
  printByCourse('CATEGORY 2 (true P1 signature): decomposed_at set, has legos, but a NEW lego has ZERO phrases', cat2, summarize(cat2, r => r.seed_number));

  const clusterByHour = (rows, field) => {
    const buckets = {};
    for (const r of rows) {
      if (!r[field]) continue;
      const hour = new Date(r[field]).toISOString().slice(0, 13);
      buckets[hour] = (buckets[hour] || 0) + 1;
    }
    return buckets;
  };

  console.log('=== TIME CLUSTERING: category 1 (decomposed_at, by hour) ===');
  console.log(JSON.stringify(clusterByHour(cat1, 'decomposed_at'), null, 2));
  console.log('');
  console.log('=== TIME CLUSTERING: category 2 (decomposed_at, by hour) ===');
  console.log(JSON.stringify(clusterByHour(cat2, 'decomposed_at'), null, 2));

  const evidenceDir = `${process.env.HOME}/ssi-evidence/ssi-dashboard-v7/tools/census-stamped-incomplete-seeds`;
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.writeFileSync(`${evidenceDir}/category1-decomposed-zero-legos.json`, JSON.stringify(cat1, null, 2));
  fs.writeFileSync(`${evidenceDir}/category1b-released-only-zero-legos.json`, JSON.stringify(cat1b, null, 2));
  fs.writeFileSync(`${evidenceDir}/category2-decomposed-new-lego-zero-phrases.json`, JSON.stringify(cat2, null, 2));
  console.log('');
  console.log('Raw evidence written to', evidenceDir);
}

main().catch(e => { console.error('ERR', e); process.exit(1); });
