#!/usr/bin/env node
/**
 * Measure the ACTUAL introduction round of a word/phrase in a course, from the data:
 *   - the first LEGO whose text contains it (that is where it is *introduced*), and
 *   - the first PHRASE that uses it (that is where a learner first *hears* it).
 * Both are reported with their round_index, so an ordering complaint can be checked
 * rather than trusted.
 *
 * Matching is Unicode-aware: JS \b and \w are ASCII-only and would mis-handle
 * Portuguese ã ç õ, so word edges are asserted with \p{L}\p{M} classes under /u.
 *
 * usage: node tools/deborah/intro-round.cjs <course> <side:known|target> <needle> [...]
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env.psql'), quiet: true });
const { Client } = require('pg');

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Unicode-aware "whole phrase" match: not preceded/followed by a letter or combining mark.
const rx = (needle) =>
  new RegExp(`(?<![\\p{L}\\p{M}])${esc(needle)}(?![\\p{L}\\p{M}])`, 'iu');

async function main() {
  const [course, side, ...needles] = process.argv.slice(2);
  if (!course || !['known', 'target'].includes(side) || !needles.length) {
    console.error('usage: intro-round.cjs <course> <known|target> <needle> [...]');
    process.exit(1);
  }
  const col = side === 'known' ? 'known_text' : 'target_text';
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();

  // ORDERED reads throughout: PostgREST/offset paging without ORDER BY returns
  // duplicates while count=exact still matches.
  const { rows: legos } = await c.query(
    `select r.round_index, l.lego_id, l.${col} as txt
       from course_legos l
       join course_round_index r
         on r.course_code = l.course_code and r.lego_id = l.lego_id
      where l.course_code = $1
      order by r.round_index, l.lego_id`,
    [course]
  );
  const { rows: phrases } = await c.query(
    `select r.round_index, l.lego_id, p.position, p.phrase_role, p.${col} as txt
       from course_practice_phrases p
       join course_legos l
         on l.course_code = p.course_code
        and l.seed_number = p.seed_number
        and l.lego_index = p.lego_index
       join course_round_index r
         on r.course_code = l.course_code and r.lego_id = l.lego_id
      where p.course_code = $1
      order by r.round_index, p.position`,
    [course]
  );

  for (const needle of needles) {
    const re = rx(needle);
    const L = legos.find((x) => x.txt && re.test(x.txt));
    const P = phrases.find((x) => x.txt && re.test(x.txt));
    console.log(`\n"${needle}"  (${side} side of ${course})`);
    console.log(
      `  introduced by LEGO: ${L ? `R${L.round_index} ${L.lego_id} ${JSON.stringify(L.txt)}` : 'NEVER — no lego contains it'}`
    );
    console.log(
      `  first used in phrase: ${P ? `R${P.round_index} ${P.lego_id} pos${P.position} ${P.phrase_role} ${JSON.stringify(P.txt)}` : 'NEVER — no phrase contains it'}`
    );
    if (L && P && P.round_index < L.round_index) {
      console.log(`  ⚠ ORDERING DEFECT: used at R${P.round_index}, ${L.round_index - P.round_index} rounds before it is introduced at R${L.round_index}`);
    }
  }
  await c.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
