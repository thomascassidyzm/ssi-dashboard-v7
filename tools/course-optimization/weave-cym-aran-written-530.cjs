#!/usr/bin/env node
/**
 * THE LAST 3 HELD PRACTICE LINES (job #530, Aran 2026-10-13), appended after the lines #510 filed.
 *
 *   S1526L01 (South, LEGO "cael hi'n")  "cael hi'n ddiddorol be' ddwedest ti"  — "finding what you said interesting"  (suggested in #510's doc)
 *   S1551L02 (South, LEGO "yn salw")    "mae hynny'n salw"                      — "that's ugly"                         (suggested in #510's doc)
 *   N S1496L04 (North, LEGO "yn cyfri'") "dw i'n medru cyfrif"                  — "I can count"                         (Aran's own line, medru for North)
 *
 * The two South lines pass #510's per-line checks (lineChecks, imported unchanged). The North line does NOT contain its
 * LEGO text ("yn cyfri'" = matters; "cyfrif" = to count), so the containment check refuses it. THIS IS AN EXPLICIT, LOGGED
 * OVERRIDE FOR THAT ONE LINE ONLY (OVERRIDES below): Aran, 2026-10-13: it is deliberate surprise theory — it shows the added
 * meaning of the word; rare but fine here. The check itself is not loosened; the reason is also written into the row's
 * metadata.override. Any other failing line still aborts the run.
 *
 * Filed exactly as #510 files its lines (role 'use', ids ...U<n>, position after the existing rows, same metadata shape),
 * ADDED to the existing rows — nothing existing is edited or deleted. Backup + tested undo in the .sql / -undo.sql.
 *
 *   node tools/course-optimization/weave-cym-aran-written-530.cjs sql   → weave-cym-aran-written-530.sql (+ -undo.sql); dry run unless psql -v finish=COMMIT.
 */
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { makePhraseId, computeLegoPosition } = require('../../services/course-builder/lib/phrase-structure.cjs');
const { tidyWelsh } = require('./weave-cym-aran-written-494.cjs');
const { lineChecks } = require('./weave-cym-aran-written-510.cjs');

const JOB = 530;
const N = 'cym_nv2_for_eng';
const S = 'cym_sv2_for_eng';
const SQL = path.join(__dirname, `weave-cym-aran-written-${JOB}.sql`);

const LINES = [
  [S, 1526, 1, "cael hi'n ddiddorol be' ddwedest ti", 'finding what you said interesting'],
  [S, 1551, 2, "mae hynny'n salw", 'that’s ugly'],
  [N, 1496, 4, "dw i'n medru cyfrif", 'I can count'],
];
// Only these lines may fail a check, and only on the named check kind. Key: `${course}|${seed}|${lego}`.
const OVERRIDES = {
  [`${N}|1496|4`]: { kinds: ['containment'], by: 'Aran', on: '2026-10-13',
    reason: 'deliberate surprise theory: shows the added meaning of the word (cyfrif = matter / count); rare but fine here. Line does not contain the LEGO text "yn cyfri\'".' },
};

const q = (s) => (s === null || s === undefined ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`);

async function sql() {
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const rows = [];
  for (const [course, s, l, raw, known] of LINES) {
    const key = `${course}|${s}|${l}`;
    const target = tidyWelsh(raw);
    const { data: lego } = await sb.from('course_legos').select('target_text').eq('course_code', course).eq('seed_number', s).eq('lego_index', l).single();
    const errs = await lineChecks(sb, course, s, l, lego, target);
    const ov = OVERRIDES[key];
    const unexcused = errs.filter((e) => !(ov && ov.kinds.includes(e.kind)));
    console.log(`${unexcused.length ? 'HOLD' : 'OK  '} ${key} ${target}${errs.length ? ' — ' + errs.map((e) => e.kind + (ov && ov.kinds.includes(e.kind) ? ' (OVERRIDDEN: ' + ov.by + ')' : '')).join(', ') : ''}`);
    if (unexcused.length) throw new Error(`line refused: ${key} ${target} ${JSON.stringify(unexcused)}`);
    const { data: cur } = await sb.from('course_practice_phrases').select('position,phrase_role,id').eq('course_code', course).eq('seed_number', s).eq('lego_index', l);
    const nUse = cur.filter((x) => x.phrase_role === 'use').length;
    const maxPos = Math.max(...cur.map((x) => x.position));
    rows.push({ id: makePhraseId(course, s, l, 'use', nUse + 1), course_code: course, seed_number: s, lego_index: l, position: maxPos + 1,
      known_text: known, target_text: target, word_count: target.length, lego_count: (known.match(/\s+/g) || []).length + 1,
      phrase_role: 'use', introduce: true, lego_position: computeLegoPosition(target, lego.target_text),
      metadata: { format: 'build_use', pipeline: 'v2', job: JOB, author: 'aran', ...(ov ? { override: { check: ov.kinds.join(','), by: ov.by, on: ov.on, reason: ov.reason } } : {}) } });
  }
  const legoSql = `INSERT INTO legos VALUES ${LINES.map(([c, s, l]) => `(${q(c)},${s},${l})`).join(',')};`;
  const rowSql = `INSERT INTO add_rows VALUES\n${rows.map((r) => `  (${q(r.id)}, ${q(r.course_code)}, ${r.seed_number}, ${r.lego_index}, ${r.position}, ${q(r.known_text)}, ${q(r.target_text)}, ${r.word_count}, ${r.lego_count}, ${q(r.phrase_role)}, ${r.introduce}, ${q(r.lego_position)}, ${q(JSON.stringify(r.metadata))}::jsonb)`).join(',\n')};`;
  const fill = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8').replace('--@LEGOS@', legoSql).replace('--@ROWS@', rowSql);
  fs.writeFileSync(SQL, fill(`weave-cym-aran-written-${JOB}.sql.in`));
  fs.writeFileSync(SQL.replace(/\.sql$/, '-undo.sql'), fill(`weave-cym-aran-written-${JOB}-undo.sql.in`));
  rows.forEach((r) => console.log(`  ${r.id} pos ${r.position} lego_position=${r.lego_position} ${r.target_text} | ${r.known_text}`));
}

if (require.main === module) {
  (process.argv[2] === 'sql' ? sql() : Promise.reject(new Error('mode: sql'))).catch((e) => { console.error(e.message); process.exit(1); });
}
