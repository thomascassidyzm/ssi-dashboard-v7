#!/usr/bin/env node
/**
 * Dump a course round exactly as a learner meets it: the LEGO, then its phrases
 * in position order. Rounds resolve via the course_round_index matview; phrases
 * join to legos on (seed_number, lego_index), never a lego FK.
 *
 * usage: node tools/deborah/round-dump.cjs <course> <round> [<round> ...]
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env.psql'), quiet: true });
const { Client } = require('pg');

async function main() {
  const [course, ...rounds] = process.argv.slice(2);
  if (!course || !rounds.length) {
    console.error('usage: round-dump.cjs <course> <round> [<round> ...]');
    process.exit(1);
  }
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  for (const r of rounds) {
    const { rows: lg } = await c.query(
      `select r.round_index, l.lego_id, l.seed_number, l.lego_index, l.type,
              l.known_text, l.target_text,
              l.known_audio_id, l.target1_audio_id, l.target2_audio_id
         from course_round_index r
         join course_legos l
           on l.course_code = r.course_code and l.lego_id = r.lego_id
        where r.course_code = $1 and r.round_index = $2
        order by l.lego_id`,
      [course, r]
    );
    if (!lg.length) { console.log(`\n=== R${r}: no lego ===`); continue; }
    for (const L of lg) {
      console.log(`\n=== R${L.round_index}  ${L.lego_id}  (seed ${L.seed_number}, lego_index ${L.lego_index}, type ${L.type})`);
      console.log(`    LEGO  known: ${JSON.stringify(L.known_text)}`);
      console.log(`          target: ${JSON.stringify(L.target_text)}`);
      console.log(`          audio  known=${L.known_audio_id || 'NULL'} t1=${L.target1_audio_id || 'NULL'} t2=${L.target2_audio_id || 'NULL'}`);
      const { rows: ph } = await c.query(
        `select position, phrase_role, known_text, target_text,
                known_audio_id, target1_audio_id, target2_audio_id
           from course_practice_phrases
          where course_code = $1 and seed_number = $2 and lego_index = $3
          order by position`,
        [course, L.seed_number, L.lego_index]
      );
      let n = {};
      for (const p of ph) {
        n[p.phrase_role] = (n[p.phrase_role] || 0) + 1;
        const links = [p.known_audio_id, p.target1_audio_id, p.target2_audio_id];
        const nulls = links.filter((x) => !x).length;
        console.log(
          `    pos${String(p.position).padStart(2)} ${p.phrase_role}${n[p.phrase_role]}` +
          `${nulls ? ` [${nulls} NULL audio]` : ''}\n` +
          `        known:  ${JSON.stringify(p.known_text)}\n` +
          `        target: ${JSON.stringify(p.target_text)}`
        );
      }
    }
  }
  await c.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
