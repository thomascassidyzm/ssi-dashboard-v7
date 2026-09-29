#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-bare-adjective-female-forms-2026-09-29.cjs
//
// ita_for_eng — Kai's 2026-09-29 ruling (job #834·I, following #747·I and the #830 census d/d4d2a36b): a bare adjective or
// fragment with NO SPEAKER IN IT is the dictionary form, and the female voice may say it in the masculine; it needs no
// course_gender_expansions row. A female form is needed only when the phrase is about the speaker (sono stanca; cavarmela
// da sola; me / myself / I / my in the English). Unsure → keep and list.
//
// The candidates are the #830 groups 1 and 2 (bare-adjective tiles + bare fragments). The decision is taken from the
// ENGLISH of every row carrying that target text (speakerReference), so a kept row is kept for a reason on the page.
//
//   node tools/course-optimization/ita-bare-adjective-female-forms-2026-09-29.cjs          # dry run: table only
//   APPLY=1 node …                                                                            # archive, then delete
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
const { evidencePath } = require('../lib/evidence-path.cjs');

const COURSE = 'ita_for_eng';
const JOB = '#834·I';
const SWEEP = 'ita-bare-adjective-female-forms-2026-09-29';

// #830 groups 1 and 2 (the class Kai named). Group 3 (speaker verbs) and group 4 (already feminine) are NOT here.
const CANDIDATES = [
  'pronto ad andare', 'stanco', 'dormito', 'nervoso', 'cavarmela da solo', 'preoccupato', 'da solo', 'arrabbiato', 'bellissimo',
  'troppo vicino', 'troppo vicino al bordo', 'troppo stanco per', 'convinto', 'coraggioso', 'pronto',
  'stanco oggi', 'stanco stamattina', 'pronto a tornare a casa', 'penso di poter cavarmela da solo', 'stavo provando a cavarmela da solo',
  'contento finora', 'pronto tra qualche minuto', 'pronto a partire', "pronto in meno di un'ora", 'lasciarmi da solo', 'piuttosto silenzioso',
  'piuttosto tranquillo', 'dovevamo prendere il treno da soli', 'molto sporco', 'troppo stanco per parlare', 'troppo stanco per prenderne uno nuovo', 'coraggioso a dirlo',
];

/** True when the English names the speaker (I, me, my, myself, we, us, our, ourselves) — the female form is then the sentence the woman says. */
const speakerReference = (english) => /\b(i|i'm|i'll|i'd|i've|me|my|myself|we|we're|us|our|ourselves)\b/i.test(String(english || ''));

async function census(pg) {
  const { rows: exp } = await pg.query(`SELECT * FROM course_gender_expansions WHERE course_code=$1 AND text_side='target' AND original_text = ANY($2)`, [COURSE, CANDIDATES]);
  const out = [];
  for (const cand of CANDIDATES) {
    const e = exp.find((x) => x.original_text === cand);
    const { rows: eng } = await pg.query(`SELECT 'phrase' t, id, known_text FROM course_practice_phrases WHERE course_code=$1 AND target_text=$2
      UNION ALL SELECT 'lego', lego_id, known_text FROM course_legos WHERE course_code=$1 AND target_text=$2`, [COURSE, cand]);
    const glosses = [...new Set(eng.map((r) => r.known_text))];
    const speaker = glosses.filter(speakerReference);
    out.push({ cand, expansion: e || null, glosses, keep: !!speaker.length || glosses.length === 0, reason: speaker.length ? `English names the speaker: "${speaker[0]}"` : glosses.length === 0 ? 'no row carries this text — cannot read its English' : 'no speaker in the English' });
  }
  return out;
}

async function main() {
  const { Client } = require('pg');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  try {
    const rows = await census(pg);
    for (const r of rows) console.log(`${r.keep ? 'KEEP  ' : 'DELETE'} ${r.cand} → ${r.expansion?.expanded_f ?? '(no expansion row)'}   [${r.glosses.join(' / ')}]  ${r.reason}`);
    const del = rows.filter((r) => !r.keep && r.expansion);
    // a female-form CLIP: any course_audio text = expanded_f linked from a row whose own text is the male original
    const linked = [];
    for (const r of del) {
      const { rows: hits } = await pg.query(`SELECT p.id FROM course_practice_phrases p JOIN course_audio a ON a.id IN (p.target1_audio_id, p.target2_audio_id)
        WHERE p.course_code=$1 AND p.target_text=$2 AND lower(a.text)=lower($3)`, [COURSE, r.cand, r.expansion.expanded_f]);
      const { rows: hitsL } = await pg.query(`SELECT l.lego_id id FROM course_legos l JOIN course_audio a ON a.id IN (l.target1_audio_id, l.target2_audio_id)
        WHERE l.course_code=$1 AND l.target_text=$2 AND lower(a.text)=lower($3)`, [COURSE, r.cand, r.expansion.expanded_f]);
      linked.push(...hits.map((h) => h.id), ...hitsL.map((h) => h.id));
    }
    console.log(`\n${del.length} to delete, ${rows.length - del.length} kept; slots holding a female-form clip under a male text: ${linked.length ? linked.join(', ') : 'none'}`);
    if (linked.length) throw new Error('female-form clip is linked — this tool does not unlink; extend it before applying');
    if (process.env.APPLY !== '1') return console.log('DRY RUN — nothing written. APPLY=1 to archive and delete.');
    const archive = evidencePath('834/deleted-bare-adjective-expansions-2026-09-29.jsonl');
    fs.writeFileSync(archive, del.map((r) => JSON.stringify(r.expansion)).join('\n') + '\n');
    console.log('archived →', archive);
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
    const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
    const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
    const ev = await recordContentEdit(supabase, { identity: serviceIdentity(SWEEP, { role: 'content-sweep' }), courseCode: COURSE, surface: `tools/course-optimization/${SWEEP}.cjs`, operation: 'gender-expansion-edit',
      scope: { rows: del.length }, detail: { job: JOB, ruling: 'Kai 2026-09-29: a bare adjective/fragment with no speaker in it needs no female form', deleted: del.map((r) => ({ original: r.cand, expanded_f: r.expansion.expanded_f })) } });
    const res = await pg.query('DELETE FROM course_gender_expansions WHERE id = ANY($1::uuid[]) RETURNING original_text', [del.map((r) => r.expansion.id)]);
    console.log(`deleted ${res.rowCount} expansion rows (edit event ${JSON.stringify(ev)})`);
    const { rows: left } = await pg.query(`SELECT count(*) FROM course_gender_expansions WHERE course_code=$1 AND text_side='target' AND original_text = ANY($2)`, [COURSE, del.map((r) => r.cand)]);
    console.log('read-back: candidates still present =', left[0].count, '(expect 0)');
  } finally { await pg.end(); }
}
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { speakerReference, CANDIDATES };
