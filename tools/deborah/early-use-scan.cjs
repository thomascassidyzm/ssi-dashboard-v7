#!/usr/bin/env node
/**
 * List EVERY phrase that uses a given expression before the round that introduces it.
 * Deborah names one round; this shows whether the same defect survives elsewhere.
 *
 * Pass the introduction round explicitly (measured with intro-round.cjs) rather than
 * inferring it, because a composed form ("I'm going to try" = "vou" + "tentar") has no
 * single introducing LEGO and a contains-match would report a spurious later one.
 *
 * Unicode-aware edges: \p{L}\p{M} under /u, since \b/\w are ASCII-only and Portuguese
 * carries ã ç õ and feminine/masculine endings (cansado/cansada).
 *
 * usage: node tools/deborah/early-use-scan.cjs <course> <known|target> <introRound> <regex>
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env.psql'), quiet: true });
const { Client } = require('pg');

async function main() {
  const [course, side, introRound, pattern] = process.argv.slice(2);
  if (!course || !['known', 'target'].includes(side) || !introRound || !pattern) {
    console.error('usage: early-use-scan.cjs <course> <known|target> <introRound> <regex>');
    process.exit(1);
  }
  const col = side === 'known' ? 'known_text' : 'target_text';
  const re = new RegExp(`(?<![\\p{L}\\p{M}])(?:${pattern})(?![\\p{L}\\p{M}])`, 'iu');
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  const { rows } = await c.query(
    `select r.round_index, l.lego_id, p.seed_number, p.lego_index, p.position,
            p.phrase_role, p.known_text, p.target_text,
            p.known_audio_id, p.target1_audio_id, p.target2_audio_id
       from course_practice_phrases p
       join course_legos l
         on l.course_code = p.course_code
        and l.seed_number = p.seed_number
        and l.lego_index = p.lego_index
       join course_round_index r
         on r.course_code = l.course_code and r.lego_id = l.lego_id
      where p.course_code = $1 and r.round_index < $2
      order by r.round_index, p.position`,
    [course, introRound]
  );
  const hits = rows.filter((x) => x[col] && re.test(x[col]));
  console.log(`\n/${pattern}/ on ${side} side, introduced at R${introRound}`);
  console.log(`scanned ${rows.length} phrases in rounds < ${introRound}; ${hits.length} early use(s)\n`);
  for (const h of hits) {
    const nulls = [h.known_audio_id, h.target1_audio_id, h.target2_audio_id].filter((x) => !x).length;
    console.log(
      `  R${h.round_index} ${h.lego_id} seed${h.seed_number}/L${h.lego_index} pos${h.position} ${h.phrase_role}` +
      `${nulls ? ` [${nulls} NULL audio]` : ''}\n` +
      `      known:  ${JSON.stringify(h.known_text)}\n` +
      `      target: ${JSON.stringify(h.target_text)}`
    );
  }
  await c.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
