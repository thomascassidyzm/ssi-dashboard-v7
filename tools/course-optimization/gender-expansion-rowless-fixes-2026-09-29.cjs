#!/usr/bin/env node
'use strict';
// tools/course-optimization/gender-expansion-rowless-fixes-2026-09-29.cjs
//
// Job #843 (follow-up to #837's list of 57 live texts with no female row). Kai's rule (K35, 2026-09-29): a bare
// adjective/fragment with no speaker in it is the dictionary form and needs no female row; a female form is needed
// only where the phrase is about the speaker. Two things are written here, and only these:
//   ITALIAN  the six speaker-referring rowless texts (ita_for_jpn / ita_for_zho) get a row from the standing
//            generator (gender-haiku-service.ensureExpansionForText) — never a copy of the old deleted row.
//   ROMANIAN "gata" is invariable, so every row that renders it "gată" (or the male side "gat") is wrong; both sides
//            are set to the real word. Edit event filed; before-state asserted; archived to evidence.
// Hebrew, Croatian, Marathi etc. are deliberately NOT written (Kai's brief: list them).
//   node …            DRY RUN     APPLY=1 node …   writes
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
const { evidencePath } = require('../lib/evidence-path.cjs');

const SWEEP = 'gender-expansion-rowless-fixes-2026-09-29';
const APPLY = process.env.APPLY === '1';
const ITALIAN = [
  ['ita_for_jpn', 'sono pronto a imparare'], ['ita_for_jpn', 'sono grato per il tuo aiuto'],
  ['ita_for_jpn', 'dovrei essere pronto in pochi minuti'], ['ita_for_jpn', 'sono molto sorpreso di quanto ho già imparato'],
  ['ita_for_zho', "è molto gentile da parte tua e ti sono grato per l'aiuto"], ['ita_for_zho', 'Ma sono un po’ stanco stamattina.'],
];
/** Romanian "gata" does not inflect: "gată" is not a word and "gat" is not its masculine. */
const fixGata = (s) => s == null ? s : s.replace(/(?<![\p{L}])gată(?![\p{L}])/gu, 'gata').replace(/(?<![\p{L}])gat(?![\p{L}])/gu, 'gata');

async function main() {
  const { Client } = require('pg');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const { createClient } = require('@supabase/supabase-js');
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const log = { sweep: SWEEP, at: new Date().toISOString(), apply: APPLY, italian: [], romanian: [] };
  const wrongRon = `SELECT id, original_text, expanded_f, expanded_m FROM course_gender_expansions
      WHERE course_code='ron_for_eng' AND text_side='target' AND (expanded_f ~ 'gată' OR expanded_m ~ '\\mgat\\M')`;
  try {
    const ron = (await pg.query(wrongRon)).rows;
    for (const r of ron) console.log(`ron  ${r.original_text}\n     f: ${r.expanded_f} → ${fixGata(r.expanded_f)}\n     m: ${r.expanded_m} → ${fixGata(r.expanded_m)}`);
    for (const [c, t] of ITALIAN) console.log(`ita  ${c}  ${t}`);
    if (!APPLY) return console.log('DRY RUN — nothing written');

    const { ensureExpansionForText } = require('../../services/gender-haiku-service.cjs');
    for (const [c, t] of ITALIAN) { const s = await ensureExpansionForText(c, t, sb); log.italian.push({ c, t, status: s.status, row: s.row || null }); console.log('ita', s.status, JSON.stringify(s.row || '')); }

    const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
    const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
    const ev = !ron.length ? null : await recordContentEdit(sb, { identity: serviceIdentity(SWEEP, { role: 'content-sweep' }), courseCode: 'ron_for_eng', surface: `tools/course-optimization/${SWEEP}.cjs`,
      operation: 'gender-expansion-edit', scope: { rows: ron.length }, detail: { job: '#843', rule: 'gata is invariable in Romanian; gată/gat are not forms', ids: ron.map(r => r.id) } });
    for (const r of ron) {
      const { data } = await sb.from('course_gender_expansions').select('expanded_f, expanded_m').eq('id', r.id).maybeSingle();
      if (!data || data.expanded_f !== r.expanded_f || data.expanded_m !== r.expanded_m) throw new Error(`before-state drift on ${r.id}`);
      const { error } = await sb.from('course_gender_expansions').update({ expanded_f: fixGata(r.expanded_f), expanded_m: fixGata(r.expanded_m) }).eq('id', r.id);
      if (error) throw new Error(error.message);
      log.romanian.push({ before: r, event: ev });
    }
    const left = await pg.query(wrongRon);
    console.log('read-back ron rows still wrong =', left.rowCount, '(expect 0)');
    for (const [c, t] of ITALIAN) { const x = await pg.query(`SELECT expanded_f, expanded_m FROM course_gender_expansions WHERE course_code=$1 AND text_side='target' AND original_text=$2`, [c, t]); console.log('read-back', c, t, '→', JSON.stringify(x.rows[0] || null)); }
  } finally {
    if (APPLY) fs.writeFileSync(evidencePath(`tools/course-optimization/${SWEEP}-applied-${Date.now()}.json`), JSON.stringify(log, null, 1));
    await pg.end();
  }
}
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
module.exports = { fixGata };
