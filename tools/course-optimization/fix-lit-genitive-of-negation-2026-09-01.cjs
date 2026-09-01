#!/usr/bin/env node
/**
 * Lithuanian genitive-of-negation sweep — lit_for_eng.
 *
 * Completes the pattern opened by the 2026-09-01 Baltic/Finno-Ugric bound-form repair
 * (docs/course-optimization/bound-form-baltic-uralic-repair-2026-09-01.md), which fixed
 * three phrases under S0012L01 and flagged the rest as systemic.
 *
 * Lithuanian moves the direct object of a negated verb from the accusative to the
 * genitive, and the negation propagates to the object of a dependent infinitive.
 * Each row below welds an accusative-marked object onto a negated governor.
 *
 * Same shape as the already-applied fix: PHRASE target_text only, plus the matching
 * decomposition tile. No LEGO is touched, no seed is touched, no boundary moves,
 * no phrase id is reissued, so no learner-progress migration is needed.
 *
 * Audio: the DB trigger trg_null_phrase_audio_on_text_change nulls target1/target2
 * where no same-voice clip of the new text exists and logs the drop to
 * content_audio_link_drops. THIS SCRIPT RENDERS NOTHING. Known text is unchanged on
 * every row, so known clips keep their links.
 *
 *   DRY_RUN=1 node tools/course-optimization/fix-lit-genitive-of-negation-2026-09-01.cjs
 *   APPLY=1   node tools/course-optimization/fix-lit-genitive-of-negation-2026-09-01.cjs
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const REPO = path.resolve(__dirname, '..', '..');
for (const line of fs.readFileSync(path.join(REPO, '.env.psql'), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const APPLY = process.env.APPLY === '1';

// id -> [expected current target_text, accusative fragment, genitive replacement]
const ROWS = [
  ['lit_for_eng:S0070L01B03', 'ji nenorėjo sakyti ką nors ir',              'ką nors',         'ko nors'],
  ['lit_for_eng:S0208L01U02', 'nenorėjau tau ką nors pasakyti',             'ką nors',         'ko nors'],
  ['lit_for_eng:S0241L01B02', 'nenoriu duoti ką nors',                      'ką nors',         'ko nors'],
  ['lit_for_eng:S0241L01U02', 'nenoriu duoti ką nors naujo dabar',          'ką nors',         'ko nors'],
  ['lit_for_eng:S0241L01U05', 'nenoriu duoti tau ką nors prieš savaitgalį', 'ką nors',         'ko nors'],
  ['lit_for_eng:S0121L03B04', 'savo automobilį ji nenori',                  'savo automobilį', 'savo automobilio'],
  ['lit_for_eng:S0121L03U02', 'ji nenori naudoti savo automobilį',          'savo automobilį', 'savo automobilio'],
  ['lit_for_eng:S0182L02U02', 'negaliu rasti mano raktus',                  'mano raktus',     'mano raktų'],
  ['lit_for_eng:S0195L02U01', 'negaliu rasti pinigus',                      'pinigus',         'pinigų'],
  ['lit_for_eng:S0211L03B04', 'nenori aiškinti problemą',                   'problemą',        'problemos'],
  ['lit_for_eng:S0211L03U04', 'jie mano, kad nenori aiškinti problemą',     'problemą',        'problemos'],
  ['lit_for_eng:S0214L02U04', 'nenorėjome aptarti problemą savaitgalį',     'problemą',        'problemos'],
  ['lit_for_eng:S0241L01B03', 'nenoriu duoti atsakymą',                     'atsakymą',        'atsakymo'],
  ['lit_for_eng:S0241L01U01', 'nenoriu duoti tau filmą šiandien',           'filmą',           'filmo'],
  ['lit_for_eng:S0241L01U03', 'nenoriu duoti tau atsakymą šiandien',        'atsakymą',        'atsakymo'],
  ['lit_for_eng:S0248L03U01', 'nenoriu duoti savo pinigus atgal',           'savo pinigus',    'savo pinigų'],
  ['lit_for_eng:S0260L01B03', 'neturiu atsakymą',                           'atsakymą',        'atsakymo'],
  ['lit_for_eng:S0278L02U01', 'ji nenori viską baigti šiandien',            'viską',           'visko'],
];

const once = (hay, needle) => hay.split(needle).length === 2;

(async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const log = [];
  let changed = 0;

  for (const [id, expected, from, to] of ROWS) {
    const { rows } = await client.query(
      `select id, known_text, target_text, decomposition, known_gloss_segments,
              known_audio_id, target1_audio_id, target2_audio_id, version
         from course_practice_phrases where id = $1`, [id]);
    if (rows.length !== 1) throw new Error(`ABORT ${id}: expected 1 row, got ${rows.length}`);
    const r = rows[0];

    // before-state assertions — abort the whole run on any drift
    if (r.target_text !== expected) throw new Error(`ABORT ${id}: target drifted\n  want: ${expected}\n  got:  ${r.target_text}`);
    if (!once(r.target_text, from)) throw new Error(`ABORT ${id}: "${from}" does not occur exactly once`);

    const newTarget = r.target_text.replace(from, to);

    // decomposition: the tile carrying the accusative fragment moves to the genitive.
    // legoId is left pointing at the same LEGO — the LEGO is correct in its positive
    // contexts and is deliberately not edited (clause 2 of the parent repair).
    let newDecomp = null;
    if (Array.isArray(r.decomposition)) {
      const hits = r.decomposition.filter(t => typeof t.target === 'string' && t.target.includes(from));
      if (hits.length !== 1) throw new Error(`ABORT ${id}: ${hits.length} decomposition tiles carry "${from}", expected 1`);
      newDecomp = r.decomposition.map(t =>
        (typeof t.target === 'string' && t.target.includes(from))
          ? { ...t, target: t.target.replace(from, to) } : t);
      const recomposed = newDecomp.map(t => t.target).join('');
      if (recomposed.trim() !== newTarget.trim())
        throw new Error(`ABORT ${id}: decomposition does not recompose\n  want: ${newTarget}\n  got:  ${recomposed.trim()}`);
    }
    if (r.known_gloss_segments) throw new Error(`ABORT ${id}: known_gloss_segments present, not handled`);

    log.push({
      id, class: from === 'ką nors' ? 'A' : (from === 'viską' ? 'C' : 'B'),
      known: r.known_text,
      target_before: r.target_text, target_after: newTarget,
      decomposition_updated: !!newDecomp,
      audio_before: { known: r.known_audio_id, target1: r.target1_audio_id, target2: r.target2_audio_id },
      version_before: r.version,
    });

    if (APPLY) {
      if (newDecomp) {
        await client.query(
          `update course_practice_phrases set target_text = $2, decomposition = $3 where id = $1`,
          [id, newTarget, JSON.stringify(newDecomp)]);
      } else {
        await client.query(`update course_practice_phrases set target_text = $2 where id = $1`, [id, newTarget]);
      }
      const { rows: after } = await client.query(
        `select target_text, known_audio_id, target1_audio_id, target2_audio_id
           from course_practice_phrases where id = $1`, [id]);
      if (after[0].target_text !== newTarget) throw new Error(`ABORT ${id}: read-back mismatch`);
      const l = log[log.length - 1];
      l.audio_after = { known: after[0].known_audio_id, target1: after[0].target1_audio_id, target2: after[0].target2_audio_id };
      l.known_clip_kept = after[0].known_audio_id === r.known_audio_id;
      changed++;
    }
    console.log(`${APPLY ? 'APPLIED ' : 'DRY-RUN '} ${id}\n   ${r.target_text}\n   ${newTarget}`);
  }

  const out = path.join(REPO, 'docs', 'course-optimization',
    `lit-genitive-of-negation-${APPLY ? 'applied' : 'dryrun'}-log.json`);
  fs.writeFileSync(out, JSON.stringify(log, null, 2) + '\n');
  console.log(`\n${APPLY ? 'applied' : 'would change'}: ${APPLY ? changed : ROWS.length} rows`);
  console.log(`log: ${out}`);
  await client.end();
})().catch(e => { console.error(e.message); process.exit(1); });
