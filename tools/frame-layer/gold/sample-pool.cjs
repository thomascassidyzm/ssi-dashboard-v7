#!/usr/bin/env node
/**
 * GOLD POOL: a deterministic random draw of known-side texts across many
 * courses, the raw material the gold set is chosen from. READ-ONLY.
 *
 * Course spread is the point (Tom 2026-10-07: the codex is for EVERY course):
 * English known sides across Romance, Germanic, Celtic, Semitic, Sinitic,
 * Japonic, Korean and Turkic targets, and non-English known sides — Hindi,
 * Tamil, Japanese, Yoruba, Spanish, Chinese, French, Welsh, Arabic.
 * Rows are BUILD/USE phrases plus some seed sentences and LEGOs, because
 * availability is decided on seeds and LEGOs too.
 *
 * The draw is md5(text || salt) order, so it is reproducible and unrelated to
 * any classifier. Usage: node sample-pool.cjs [perCourseMultiplier] > pool.json
 */
const path = require('path');
const { query, lit } = require('../v4/db.cjs');

const PLAN = {
  fra_for_eng: 30, spa_for_eng: 20, deu_for_eng: 15, zho_for_eng: 15, ara_for_eng: 15, jpn_for_eng: 15,
  cym_n_for_eng: 15, gle_for_eng: 10, hak_for_eng: 10, kor_for_eng: 10, por_br_for_eng: 10, tur_for_eng: 10, rus_for_eng: 10,
  eng_for_hin: 15, kor_for_hin: 10, zho_for_tam: 10, eng_for_jpn: 10, spa_for_jpn: 10, cym_for_yor: 10,
  cat_for_spa: 10, deu_for_zho: 10, bre_for_fra: 10, ita_for_cym: 10, eng_for_ara: 10,
};

function draw(course, n, mult) {
  const k = Math.max(1, Math.round(n * mult));
  const phrases = query(`select distinct on (known_text) 'phrase' as kind, phrase_role as role, seed_number, known_text, target_text
    from course_practice_phrases where course_code=${lit(course)} and phrase_role in ('build','use') and known_text is not null`)
    .map(r => ({ ...r, h: require('crypto').createHash('md5').update(course + '|' + r.known_text + '|37').digest('hex') }))
    .sort((a, b) => a.h.localeCompare(b.h)).slice(0, Math.round(k * 0.85));
  const seeds = query(`select 'seed' as kind, 'seed' as role, seed_number, known_text, target_text from course_seeds
    where course_code=${lit(course)} order by md5(course_code || known_text || '|37') limit ${Math.max(1, Math.round(k * 0.1))}`);
  const legos = query(`select 'lego' as kind, type as role, seed_number, known_text, target_text from course_legos
    where course_code=${lit(course)} order by md5(course_code || known_text || '|37') limit ${Math.max(1, Math.round(k * 0.05))}`);
  return [...phrases, ...seeds, ...legos].map(({ h, ...r }) => ({ course, ...r }));
}

if (require.main === module) {
  const mult = +process.argv[2] || 1;
  const out = [];
  for (const [c, n] of Object.entries(PLAN)) out.push(...draw(c, n, mult));
  process.stdout.write(JSON.stringify(out, null, 1));
}
module.exports = { PLAN, draw };
