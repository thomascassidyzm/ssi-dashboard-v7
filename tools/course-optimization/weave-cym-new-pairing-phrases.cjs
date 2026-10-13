#!/usr/bin/env node
/**
 * NEW PAIRINGS OF TAUGHT WELSH in the two Welsh sandboxes (job #459, Aran 2026-10-13).
 * The rule is services/course-builder/lib/new-pairing.cjs: a LEGO whose Welsh was taught earlier
 * under OTHER English is ALREADY TAUGHT (no intro, is_new false) but gets 2-3 USE phrases that
 * say the new pairing, filed under a NEW sibling of its seed so the player plays them (P25).
 *
 * Two steps, both scoped HARD to cym_nv2_for_eng / cym_sv2_for_eng and to the LEGOs named:
 *   generate  node tools/course-optimization/weave-cym-new-pairing-phrases.cjs generate --course C --legos 1092:3,...
 *             → one JSON per LEGO in ~/ssi-evidence/ssi-dashboard-v7/job-459/<course>/ (Opus via
 *               phrase-generation.cjs generatePairingPhrases; gated; read-only on the DB)
 *   sql       node tools/course-optimization/weave-cym-new-pairing-phrases.cjs sql --course C --legos ... --out F.sql
 *             → an apply script (dry run unless psql -v finish=COMMIT): flips each taught LEGO to
 *               not-new, inserts the passed sets under their hosts, backup table, edit event,
 *               fingerprint check that nothing outside the two sandboxes moved. Undo: the same
 *               command writes F-undo.sql beside it.
 * A LEGO that is held (no host) or blocked (gates refused it) is LEFT ALONE — not flipped, no rows.
 *
 * --already-taught (job #468): the LEGOs were flipped to not-new by another script (job #460's
 * taught rulings), so this run only ADDS the rows — the apply asserts each LEGO is ALREADY not new
 * instead of flipping it, and the undo leaves is_new alone. --job N names the evidence dir, the
 * backup table and the edit event (default 459).
 */
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const os = require('os');
const { createClient } = require('@supabase/supabase-js');
const { generatePairingPhrases } = require('../../services/course-builder/lib/phrase-generation.cjs');
const { makePhraseId, computeLegoPosition } = require('../../services/course-builder/lib/phrase-structure.cjs');

const SANDBOXES = ['cym_nv2_for_eng', 'cym_sv2_for_eng'];
const arg = (k) => { const i = process.argv.indexOf(k); return i === -1 ? null : process.argv[i + 1]; };
const MODE = process.argv[2];
const COURSE = arg('--course');
if (!SANDBOXES.includes(COURSE)) throw new Error(`refusing ${COURSE}: this tool writes only to ${SANDBOXES.join(' / ')}`);
const LEGOS = String(arg('--legos') || '').split(',').filter(Boolean).map((s) => s.split(':').map(Number));
if (!LEGOS.length) throw new Error('say --legos SEED:IDX,...');
const JOB = Number(arg('--job') || 459);
const ALREADY_TAUGHT = process.argv.includes('--already-taught');
const OUT = path.join(os.homedir(), `ssi-evidence/ssi-dashboard-v7/job-${JOB}`, COURSE);
const fileFor = (s, l) => path.join(OUT, `S${String(s).padStart(4, '0')}L${String(l).padStart(2, '0')}.json`);
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

async function pageAll(q) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await q().range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...data);
    if (data.length < 1000) return out;
  }
}

async function generate() {
  fs.mkdirSync(OUT, { recursive: true });
  const order = await pageAll(() => sb.from('course_running_order').select('seed_number,position').eq('course_code', COURSE).order('position'));
  const pos = new Map(order.map((r) => [r.seed_number, r.position]));
  const all = await pageAll(() => sb.from('course_legos').select('seed_number,lego_index,lego_id,known_text,target_text,is_new,components')
    .eq('course_code', COURSE).order('seed_number').order('lego_index'));
  const taughtKeys = new Set(LEGOS.map(([s, l]) => `${s}:${l}`));
  await Promise.all(LEGOS.map(async ([s, l]) => {
    const p = pos.get(s);
    if (p === undefined) throw new Error(`seed ${s} is not in the running order`);
    const earlier = all.filter((e) => pos.has(e.seed_number) && (pos.get(e.seed_number) < p || (e.seed_number === s && e.lego_index < l)));
    // The seed as it WILL be: every LEGO this run marks already-taught counts as not new.
    const seedLegos = all.filter((e) => e.seed_number === s).map((e) => (taughtKeys.has(`${e.seed_number}:${e.lego_index}`) ? { ...e, is_new: false } : e));
    const hostIdx = seedLegos.filter((e) => e.is_new).map((e) => e.lego_index).pop();
    const existing = hostIdx === undefined ? [] : (await sb.from('course_practice_phrases').select('known_text,target_text')
      .eq('course_code', COURSE).eq('seed_number', s).eq('lego_index', hostIdx)).data || [];
    let r;
    try { r = await generatePairingPhrases(sb, COURSE, s, l, { earlier, seedLegos, existing }); }
    catch (e) { r = { seedNumber: s, legoIndex: l, error: e.message }; }
    fs.writeFileSync(fileFor(s, l), JSON.stringify(r, null, 2));
    console.log(`S${s}L${l} ${r.held ? `HELD ${r.held}` : r.error ? `ERROR ${r.error}` : r.blocked ? 'BLOCKED' : `${r.use.length} phrases → host L${r.hostIndex}`}`);
    for (const u of r.use || []) console.log(`   ${u.known} = ${u.target}`);
  }));
}

const q = (s) => (s === null || s === undefined ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`);

async function sql() {
  const out = arg('--out');
  if (!out) throw new Error('say --out F.sql');
  const flips = [];
  const rows = [];
  const skipped = [];
  for (const [s, l] of LEGOS) {
    const r = JSON.parse(fs.readFileSync(fileFor(s, l), 'utf8'));
    if (r.held || r.error || r.blocked || !r.use?.length) { skipped.push(`S${s}L${l}: ${r.held || r.error || 'blocked by the gates'}`); continue; }
    flips.push({ s, l, target: r.legoTarget });
    const { data: basket } = await sb.from('course_practice_phrases').select('id,position,phrase_role')
      .eq('course_code', COURSE).eq('seed_number', s).eq('lego_index', r.hostIndex);
    let pos = Math.max(0, ...basket.map((b) => b.position));
    let u = Math.max(0, ...basket.filter((b) => b.phrase_role === 'use').map((b) => Number((b.id.match(/U(\d+)$/) || [])[1] || 0)));
    const taughtId = `S${String(s).padStart(4, '0')}L${String(l).padStart(2, '0')}`;
    for (const p0 of r.use) {
      // The English pronoun is "I": the model sometimes writes "i" (job #468: S1563, S1584).
      const p = { ...p0, known: p0.known.replace(/(^|[\s"(])i(?=[\s’'])/g, '$1I') };
      rows.push({
        id: makePhraseId(COURSE, s, r.hostIndex, 'use', ++u), seed: s, lego: r.hostIndex, position: ++pos,
        known: p.known, target: p.target, word_count: p.target.length, lego_count: (p.known.match(/\s+/g) || []).length + 1,
        lego_position: computeLegoPosition(p.target, r.hostTarget), connected: taughtId,
        metadata: { format: 'build_use', pipeline: 'new-pairing', no_debut: true,
          new_pairing: { lego_id: taughtId, known: r.legoKnown, target: r.legoTarget, taught_as: { known: r.taughtAs.known_text, target: r.taughtAs.target_text, seed: r.taughtAs.seed_number } },
          ruling: 'Aran 2026-10-13: same Welsh taught under other English — no intro, 2-3 phrases', job: JOB },
      });
    }
  }
  const tag = COURSE === 'cym_nv2_for_eng' ? 'nv2' : 'sv2';
  const backup = `backup_cym_${tag}_newpairing_${JOB}`;
  const ruling = 'Aran 2026-10-13: a LEGO whose Welsh (identical or soft-mutated) was taught earlier under other English is already taught (no intro) but gets 2-3 practice phrases using the new pairing, under a new sibling LEGO (P25). Rule: services/course-builder/lib/new-pairing.cjs.';
  const apply = `-- GENERATED by tools/course-optimization/weave-cym-new-pairing-phrases.cjs sql (job #${JOB}). ${COURSE} ONLY.
-- ${ruling}
-- ${ALREADY_TAUGHT ? `Asserts ${flips.length} LEGO(s) are ALREADY not-new (flipped elsewhere; not written)` : `Flips ${flips.length} LEGO(s) to not-new`} and adds ${rows.length} USE row(s) under their new siblings.
${skipped.map((x) => `-- LEFT ALONE: ${x}`).join('\n')}
-- Dry run unless  psql -v finish=COMMIT . Undo: ${path.basename(out, '.sql')}-undo.sql
\\set ON_ERROR_STOP on
\\if :{?finish}
\\else
  \\set finish ROLLBACK
\\endif
BEGIN ISOLATION LEVEL REPEATABLE READ;
SET LOCAL statement_timeout = '20min';
CREATE FUNCTION pg_temp.others_fp() RETURNS TABLE(t text, n bigint, h text) LANGUAGE sql AS $$
  SELECT 'courses', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.course_code)) FROM courses x WHERE x.course_code <> '${COURSE}'
  UNION ALL SELECT 'course_seeds', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_seeds x WHERE x.course_code IN ('cym_n_for_eng','cym_s_for_eng','cym_nv2_for_eng','cym_sv2_for_eng') AND x.course_code <> '${COURSE}'
  UNION ALL SELECT 'course_legos', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_legos x WHERE x.course_code IN ('cym_n_for_eng','cym_s_for_eng','cym_nv2_for_eng','cym_sv2_for_eng') AND x.course_code <> '${COURSE}'
  UNION ALL SELECT 'course_practice_phrases', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM course_practice_phrases x WHERE x.course_code IN ('cym_n_for_eng','cym_s_for_eng','cym_nv2_for_eng','cym_sv2_for_eng') AND x.course_code <> '${COURSE}'
  UNION ALL SELECT 'lego_introductions', count(*), md5(string_agg(md5(x::text), '' ORDER BY x.id)) FROM lego_introductions x WHERE x.course_code IN ('cym_n_for_eng','cym_s_for_eng','cym_nv2_for_eng','cym_sv2_for_eng')
  UNION ALL SELECT 'canonical_seeds (master)', count(*), md5(string_agg(md5(x::text), '' ORDER BY x::text)) FROM canonical_seeds x
  UNION ALL SELECT 'canonical_list_seeds', count(*), md5(string_agg(md5(x::text), '' ORDER BY x::text)) FROM canonical_list_seeds x
$$;
CREATE TEMP TABLE rt_pre AS SELECT * FROM pg_temp.others_fp();

CREATE TEMP TABLE flip (seed_number int, lego_index int, target_text text, PRIMARY KEY (seed_number, lego_index));
${flips.length ? `INSERT INTO flip VALUES\n${flips.map((f) => `  (${f.s}, ${f.l}, ${q(f.target)})`).join(',\n')};` : ''}
CREATE TEMP TABLE add_rows (id text PRIMARY KEY, seed_number int, lego_index int, position int, known_text text, target_text text,
  word_count int, lego_count int, lego_position text, connected text, metadata jsonb);
${rows.length ? `INSERT INTO add_rows VALUES\n${rows.map((r) => `  (${q(r.id)}, ${r.seed}, ${r.lego}, ${r.position}, ${q(r.known)}, ${q(r.target)}, ${r.word_count}, ${r.lego_count}, ${q(r.lego_position)}, ${q(r.connected)}, ${q(JSON.stringify(r.metadata))}::jsonb)`).join(',\n')};` : ''}

DO $$ BEGIN
  IF to_regclass('${backup}') IS NOT NULL THEN RAISE EXCEPTION 'already applied (${backup} exists)'; END IF;
  IF (SELECT count(*) FROM flip f JOIN course_legos l ON l.course_code='${COURSE}' AND l.seed_number=f.seed_number
        AND l.lego_index=f.lego_index AND l.target_text=f.target_text AND ${ALREADY_TAUGHT ? 'NOT ' : ''}l.is_new) <> (SELECT count(*) FROM flip) THEN
    RAISE EXCEPTION 'a listed LEGO is missing, has other text, or is ${ALREADY_TAUGHT ? 'still new' : 'already not new'}'; END IF;
  IF EXISTS (SELECT 1 FROM add_rows a JOIN course_practice_phrases p ON p.id=a.id OR (p.course_code='${COURSE}'
        AND p.seed_number=a.seed_number AND p.lego_index=a.lego_index AND p.position=a.position)) THEN
    RAISE EXCEPTION 'a phrase id or position is already taken: regenerate the SQL'; END IF;
  IF (SELECT count(*) FROM add_rows a JOIN course_legos l ON l.course_code='${COURSE}' AND l.seed_number=a.seed_number
        AND l.lego_index=a.lego_index AND l.is_new) <> (SELECT count(*) FROM add_rows) THEN
    RAISE EXCEPTION 'a host LEGO is not new: its phrases would never play (P25)'; END IF;
END $$;

CREATE TABLE ${backup} AS
  SELECT l.id, l.course_code, l.seed_number, l.lego_index, l.is_new, l.last_edit_event_id
  FROM course_legos l JOIN flip f ON l.course_code='${COURSE}' AND l.seed_number=f.seed_number AND l.lego_index=f.lego_index;
REVOKE ALL ON ${backup} FROM anon, authenticated;

INSERT INTO content_edit_events (course_code, surface, operation, actor_kind, actor_id, actor_label, actor_verified, actor_role, scope, detail)
VALUES ('${COURSE}', 'sql:job-${JOB} weave-cym-new-pairing-phrases', 'weave-new-pairing', 'agent', 'claude-job-${JOB}-new-pairing',
        'agent (claude-job-${JOB}-new-pairing)', false, 'creator',
        jsonb_build_object('${ALREADY_TAUGHT ? 'already_taught' : 'flipped'}', (SELECT jsonb_agg(seed_number||':'||lego_index) FROM flip), 'phrase_ids', (SELECT jsonb_agg(id) FROM add_rows)),
        jsonb_build_object('ruling', ${q(ruling)}, 'backup', '${backup}'))
RETURNING id AS ev \\gset

${ALREADY_TAUGHT ? '-- --already-taught: no LEGO is written.' : `UPDATE course_legos l SET is_new = false, last_edit_event_id = :'ev'
FROM flip f WHERE l.course_code='${COURSE}' AND l.seed_number=f.seed_number AND l.lego_index=f.lego_index;`}

INSERT INTO course_practice_phrases (id, course_code, seed_number, lego_index, position, known_text, target_text, word_count, lego_count,
  phrase_role, introduce, connected_lego_ids, lego_position, metadata, status, version, last_edit_event_id)
SELECT id, '${COURSE}', seed_number, lego_index, position, known_text, target_text, word_count, lego_count,
  'use', true, ARRAY[connected], lego_position, metadata, 'draft', 1, :'ev'
FROM add_rows;

CREATE TEMP TABLE rt_post AS SELECT * FROM pg_temp.others_fp();
DO $$ BEGIN
  IF EXISTS (SELECT * FROM rt_pre EXCEPT SELECT * FROM rt_post) OR EXISTS (SELECT * FROM rt_post EXCEPT SELECT * FROM rt_pre) THEN
    RAISE EXCEPTION 'CHECK FAILED: something outside ${COURSE} changed'; END IF;
  RAISE NOTICE 'ALL CHECKS PASSED';
END $$;
SELECT a.seed_number, a.lego_index host, a.id, a.known_text, a.target_text FROM add_rows a ORDER BY a.id;
SELECT 'finishing with' k, :'finish' v;
:finish;
SELECT :'finish' = 'COMMIT' AS do_refresh \\gset
\\if :do_refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index;
\\endif
`;
  const undo = `-- Undo of ${path.basename(out)} (job #${JOB}). ${COURSE} ONLY. Dry run unless psql -v finish=COMMIT.
-- Deletes exactly the rows it added (refusing if any was edited since), restores is_new from ${backup}.
\\set ON_ERROR_STOP on
\\if :{?finish}
\\else
  \\set finish ROLLBACK
\\endif
BEGIN;
CREATE TEMP TABLE added (id text PRIMARY KEY);
${rows.length ? `INSERT INTO added VALUES ${rows.map((r) => `(${q(r.id)})`).join(', ')};` : ''}
SELECT id AS ev FROM content_edit_events WHERE course_code = '${COURSE}' AND detail->>'backup' = '${backup}'
  ORDER BY occurred_at DESC LIMIT 1 \\gset
DO $$ BEGIN
  IF to_regclass('${backup}') IS NULL THEN RAISE EXCEPTION 'not applied (no ${backup})'; END IF;
END $$;
CREATE TEMP TABLE ev AS SELECT :'ev'::uuid AS id;
DO $$ BEGIN
  IF (SELECT count(*) FROM course_practice_phrases p JOIN added a USING (id) WHERE p.last_edit_event_id = (SELECT id FROM ev)) <> (SELECT count(*) FROM added) THEN
    RAISE EXCEPTION 'an added phrase is missing or was edited since: undo by hand'; END IF;
${ALREADY_TAUGHT ? '' : `  IF EXISTS (SELECT 1 FROM course_legos l JOIN ${backup} b USING (id) WHERE l.is_new OR l.last_edit_event_id IS DISTINCT FROM (SELECT id FROM ev)) THEN
    RAISE EXCEPTION 'a flipped LEGO was edited since: undo by hand'; END IF;
`}END $$;
DELETE FROM course_practice_phrases WHERE id IN (SELECT id FROM added) AND course_code = '${COURSE}';
${ALREADY_TAUGHT ? `-- --already-taught: is_new was not written here, so it is not restored here (${backup} records it for reference).` : `UPDATE course_legos l SET is_new = b.is_new, last_edit_event_id = b.last_edit_event_id FROM ${backup} b WHERE l.id = b.id;`}
DROP TABLE ${backup};
SELECT 'finishing with' k, :'finish' v;
:finish;
SELECT :'finish' = 'COMMIT' AS do_refresh \\gset
\\if :do_refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY course_round_index;
\\endif
`;
  fs.writeFileSync(out, apply);
  fs.writeFileSync(out.replace(/\.sql$/, '-undo.sql'), undo);
  console.log(`${out}: ${flips.length} flips, ${rows.length} rows; left alone: ${skipped.length}`);
  skipped.forEach((x) => console.log('  ' + x));
}

(MODE === 'generate' ? generate() : MODE === 'sql' ? sql() : Promise.reject(new Error('mode: generate | sql')))
  .catch((e) => { console.error(e); process.exit(1); });
