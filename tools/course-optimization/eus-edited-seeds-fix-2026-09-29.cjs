#!/usr/bin/env node
'use strict';
// tools/course-optimization/eus-edited-seeds-fix-2026-09-29.cjs
//
// eus_for_eng — the fallout of Deborah's August seed edits (Kai approved, 2026-09-29, job #751·E, from the
// diagnosis of job #744·I). A seed edit does not touch LEGOs, intros or phrases, so a handful stayed behind.
//
//   1. S0228  seed now "Gizon horri hitz egiten praktikatzen hasi berria da." (was "…praktikatu besterik ez du egin.")
//             L01 "to practise | praktikatu"          → "practising | praktikatzen"          (re-textured IN PLACE)
//             L02 "has only just done | besterik ez du egin" → "has just started | hasi berria da" (re-textured IN PLACE)
//             NEVER delete a LEGO: both slots keep their place. Only phrases are rewritten; C04 (done | egin) goes because
//             L02's third component is the last. "hitz egiten" is S0003L02, "hasi berria da" is S0224L01 (same Basque,
//             a different English gloss → a new LEGO under Kai's both-sides rule, so it plays and gets its own intro).
//   2. S0029L02  stored components (gogoz + nago) → the ones its own C rows already carry (gogoa + dut). Gloss untouched.
//   3. S0234L03  component "reki" → "rekin" (zure anaia + rekin tile "zure anaiarekin"; the seed's spelling now matches).
//   4. S0006L02  component "gogoratu" → "gogoratzen" (the seed edit made the LEGO's target "gogoratzen saiatzen ari naiz"
//                the truth; the component still said the dictionary form and no longer tiled it).
//
// Each touched seed loses its approval (an edit unapproves). Audio is NOT rendered here — it goes last, through
// POST /api/audio/render (tools/audio/render.cjs), dryRun first; this tool only detaches links whose words changed
// and keeps every old asset (make-before-break: nothing in course_audio is deleted).
//
//   node tools/course-optimization/eus-edited-seeds-fix-2026-09-29.cjs           # dry run: guards + plan
//   APPLY=1 node tools/course-optimization/eus-edited-seeds-fix-2026-09-29.cjs   # write

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'eus_for_eng';
const SWEEP = 'eus-edited-seeds-fix-2026-09-29';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const JOB = '#751·E';
const RULING = "Kai, 2026-09-29 (job #751·E, from #744·I's diagnosis): re-cut S0228 by hand to the edited seed, fix S0029L02 / S0234L03 / S0006L02 stale components; never delete a LEGO";

const SEED_228 = { known: 'That man has just started to practise speaking.', target: 'Gizon horri hitz egiten praktikatzen hasi berria da.' };

// ── S0228: the new cut ──────────────────────────────────────────────────────────────────
const OLD_228 = {
  legos: [{ idx: 1, known: 'to practise', target: 'praktikatu' }, { idx: 2, known: 'has only just done', target: 'besterik ez du egin' }],
};
const NEW_228_LEGOS = [
  { idx: 1, id: 'S0228L01', type: 'A', is_new: true, known: 'practising', target: 'praktikatzen', components: [] },
  { idx: 2, id: 'S0228L02', type: 'M', is_new: true, known: 'has just started', target: 'hasi berria da',
    components: [{ known: 'started', target: 'hasi' }, { known: 'newly', target: 'berria' }, { known: 'it is', target: 'da' }] },
];
/** One line per row. `id` is the live id (same id = re-textured in place; `add` = a new row; old ids not listed are removed). */
const PHRASES_228 = [
  // L01 practising | praktikatzen
  { id: 'S0228L01B01', idx: 1, role: 'build', position: 1, known: 'practising', target: 'praktikatzen' },
  { id: 'S0228L01B02', idx: 1, role: 'build', position: 2, known: "I'm practising", target: 'praktikatzen ari naiz' },
  { id: 'S0228L01B03', idx: 1, role: 'build', position: 3, known: "you're practising", target: 'praktikatzen ari zara' },
  { id: 'S0228L01U01', idx: 1, role: 'use', position: 4, known: "I'm practising speaking", target: 'hitz egiten praktikatzen ari naiz' },
  { id: 'S0228L01U02', idx: 1, role: 'use', position: 5, known: "I'm practising more", target: 'gehiago praktikatzen ari naiz' },
  { id: 'S0228L01U03', idx: 1, role: 'use', position: 6, known: "I'm practising with you", target: 'zurekin praktikatzen ari naiz' },
  { id: 'S0228L01U04', idx: 1, role: 'use', position: 7, known: "you're practising here today", target: 'gaur hemen praktikatzen ari zara' },
  { id: 'S0228L01U05', idx: 1, role: 'use', position: 8, known: 'I started practising', target: 'praktikatzen hasi nintzen' },
  // L02 has just started | hasi berria da
  { id: 'S0228L02C01', idx: 2, role: 'component', position: 1, known: 'started', target: 'hasi', component_index: 0 },
  { id: 'S0228L02C02', idx: 2, role: 'component', position: 2, known: 'newly', target: 'berria', component_index: 1 },
  { id: 'S0228L02C03', idx: 2, role: 'component', position: 3, known: 'it is', target: 'da', component_index: 2 },
  { id: 'S0228L02B01', idx: 2, role: 'build', position: 4, known: 'he has just started here', target: 'hemen hasi berria da' },
  { id: 'S0228L02B02', idx: 2, role: 'build', position: 5, known: 'she has just started today', target: 'gaur hasi berria da' },
  { id: 'S0228L02B03', idx: 2, role: 'build', position: 6, known: 'he has just started at work', target: 'lanean hasi berria da' },
  { id: 'S0228L02U02', idx: 2, role: 'use', position: 7, known: 'she has just started to learn', target: 'ikasten hasi berria da' },
  { id: 'S0228L02U03', idx: 2, role: 'use', position: 8, known: 'he has just started to speak', target: 'hitz egiten hasi berria da' },
  { id: 'S0228L02U04', idx: 2, role: 'use', position: 9, known: 'she has just started to practise', target: 'praktikatzen hasi berria da' },
  { id: 'S0228L02U05', idx: 2, role: 'use', position: 10, known: 'he has just started to practise here', target: 'hemen praktikatzen hasi berria da' },
  // P26: the seed sentence, verbatim, under the seed's last new LEGO
  { id: 'S0228L02U06', idx: 2, role: 'use', position: 11, known: 'That man has just started to practise speaking', target: 'Gizon horri hitz egiten praktikatzen hasi berria da', add: true },
];
/** Old rows that no longer have a place (phrases only — never a LEGO). */
const REMOVED_228 = ['S0228L02C04'];

// ── The three component fixes ───────────────────────────────────────────────────────────
const COMPONENT_FIXES = [
  { seed: 29, idx: 2, lego: 'S0029L02', why: 'stored components (gogoz + nago) do not tile "gogoa dut"; its own C rows already say desire|gogoa, I have it|dut',
    fromComponents: [{ known: 'eager', target: 'gogoz', introduce: true }, { known: 'I am', target: 'nago', introduce: false }],
    toComponents: [{ known: 'desire', target: 'gogoa', introduce: true }, { known: 'I have it', target: 'dut', introduce: false }], rows: [] },
  { seed: 234, idx: 3, lego: 'S0234L03', why: '"zure anaia" + "reki" does not tile "zure anaiarekin" (the suffix is -rekin)',
    fromComponents: [{ known: 'your brother', target: 'zure anaia' }, { known: 'with', target: 'reki' }],
    toComponents: [{ known: 'your brother', target: 'zure anaia' }, { known: 'with', target: 'rekin' }],
    rows: [{ id: 'S0234L03C02', from: 'reki', to: 'rekin' }] },
  { seed: 6, idx: 2, lego: 'S0006L02', why: '"gogoratu" does not tile the LEGO "gogoratzen saiatzen ari naiz" the edited seed now uses',
    fromComponents: [{ known: 'to remember', target: 'gogoratu' }, { known: 'I am trying', target: 'saiatzen ari naiz' }],
    toComponents: [{ known: 'to remember', target: 'gogoratzen' }, { known: 'I am trying', target: 'saiatzen ari naiz' }],
    rows: [{ id: 'S0006L02C01', from: 'gogoratu', to: 'gogoratzen' }] },
];

// ── The rules, as code (exported so the test can run them on the OLD picture and the NEW one) ──
const norm = (s) => String(s || '').toLowerCase().replace(/’/g, "'").replace(/[.,!?;:"«»¿¡()]+/g, ' ').replace(/\s+/g, ' ').trim();
const squash = (s) => norm(s).replace(/\s+/g, '');
const has = (hay, needle) => ` ${norm(hay)} `.includes(` ${norm(needle)} `);

/** A LEGO's target is a contiguous slice of its seed's target — the rule the ZUT audit's [2] applies to component rows. */
const legoInSeed = (lego, seed) => has(seed.target, lego.target);
/** Components tile the LEGO's target exactly (the K29 component rule). */
const componentsTile = (l) => (l.components || []).length === 0 || squash(l.components.map(c => c.target).join(' ')) === squash(l.target);
/** Both sides of a phrase carry both sides of its LEGO. */
const phraseContainsLego = (lego, p) => has(p.target, lego.target) && has(p.known, lego.known);

function problems228(legos, phrases) {
  const out = [];
  for (const l of legos) {
    if (!legoInSeed(l, SEED_228)) out.push(`L0${l.idx} "${l.target}" is not in the seed`);
    if (!componentsTile(l)) out.push(`L0${l.idx} components do not tile it`);
  }
  for (const p of phrases) {
    const l = legos.find(x => x.idx === p.idx);
    if (!l) { out.push(`${p.id}: no LEGO ${p.idx}`); continue; }
    if (p.role !== 'component' && !phraseContainsLego(l, p)) out.push(`${p.id} "${p.known}" | "${p.target}" does not contain LEGO ${l.idx}`);
  }
  const seen = new Map();
  for (const p of phrases.filter(p => p.role !== 'component')) { const k = `${norm(p.known)}|${norm(p.target)}`; if (seen.has(k)) out.push(`${p.id} duplicates ${seen.get(k)}`); else seen.set(k, p.id); }
  if (!phrases.some(p => p.role === 'use' && norm(p.known) === norm(SEED_228.known) && norm(p.target) === norm(SEED_228.target) && legos.find(l => l.idx === p.idx)?.is_new)) out.push('seed sentence is not a USE row under a new LEGO (P26)');
  return out;
}
const checkPlan = () => problems228(NEW_228_LEGOS, PHRASES_228);

module.exports = { SEED_228, OLD_228, NEW_228_LEGOS, PHRASES_228, REMOVED_228, COMPONENT_FIXES, problems228, checkPlan, legoInSeed, componentsTile, norm, has };

// ── Live ────────────────────────────────────────────────────────────────────────────────
async function main() {
  const { Client } = require('pg');
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  const APPLY = process.env.APPLY === '1';
  try {
    const offline = checkPlan();
    console.log(`offline plan check: ${offline.length ? 'PROBLEMS\n  ' + offline.join('\n  ') : 'clean'}`);
    if (offline.length) process.exit(1);

    // Guards: the live picture is the one this tool was written against.
    const { rows: [seed] } = await pg.query('SELECT known_text, target_text, approved_at FROM course_seeds WHERE course_code=$1 AND seed_number=228', [COURSE]);
    if (!seed || seed.target_text !== SEED_228.target || seed.known_text !== SEED_228.known) throw new Error('S0228 seed text is not what this tool was written against');
    const { rows: l228 } = await pg.query('SELECT lego_index, known_text, target_text, presentation_audio_id FROM course_legos WHERE course_code=$1 AND seed_number=228 ORDER BY 1', [COURSE]);
    for (const o of OLD_228.legos) { const l = l228.find(x => x.lego_index === o.idx); if (!l || l.known_text !== o.known || l.target_text !== o.target) throw new Error(`S0228L0${o.idx} is not "${o.known}" | "${o.target}" (already applied?)`); }
    const { rows: p228 } = await pg.query(`SELECT id, split_part(id,':',2) sid, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=$1 AND seed_number=228`, [COURSE]);
    const liveP = Object.fromEntries(p228.map(r => [r.sid, r]));
    for (const p of PHRASES_228) if (!p.add && !liveP[p.id]) throw new Error(`${p.id} is not a live row`);
    if (PHRASES_228.some(p => p.add && liveP[p.id])) throw new Error('an "add" row already exists');
    for (const r of REMOVED_228) if (!liveP[r]) throw new Error(`${r} is not a live row`);
    const liveIds = new Set(Object.keys(liveP));
    const listed = new Set([...PHRASES_228.map(p => p.id), ...REMOVED_228]);
    const stray = [...liveIds].filter(i => !listed.has(i));
    if (stray.length) throw new Error(`live S0228 rows this tool does not account for: ${stray.join(', ')}`);
    const fixLive = [];
    for (const f of COMPONENT_FIXES) {
      const { rows: [l] } = await pg.query('SELECT components, target_text FROM course_legos WHERE course_code=$1 AND seed_number=$2 AND lego_index=$3', [COURSE, f.seed, f.idx]);
      if (!l || JSON.stringify(l.components) !== JSON.stringify(f.fromComponents)) throw new Error(`${f.lego} components are not what this tool was written against (already applied?)`);
      fixLive.push(l);
    }

    console.log(`S0228 seed approved_at: ${seed.approved_at || 'NULL'}`);
    console.log(`S0228: ${PHRASES_228.filter(p => !p.add).length} rows re-textured, ${PHRASES_228.filter(p => p.add).length} added, ${REMOVED_228.length} removed`);
    for (const f of COMPONENT_FIXES) console.log(`${f.lego}: ${JSON.stringify(f.fromComponents.map(c => c.target))} → ${JSON.stringify(f.toComponents.map(c => c.target))}`);
    if (!APPLY) { console.log('DRY RUN — nothing written. APPLY=1 to write.'); return; }

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
    const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
    const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
    const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
    const ev = (operation, scope, detail) => recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation, scope, detail: { ruling: RULING, job: JOB, ...detail } });

    const retextured = PHRASES_228.filter(p => !p.add);
    const legoEvent = await ev('lego-recut', { seed_numbers: [228], lego_ids: NEW_228_LEGOS.map(l => l.id), rows: 2 }, { from: OLD_228.legos, to: NEW_228_LEGOS });
    const phraseEvent = await ev('phrase-edit', { seed_numbers: [228], phrase_ids: retextured.map(p => `${COURSE}:${p.id}`), rows: retextured.length },
      { changes: retextured.map(p => ({ id: `${COURSE}:${p.id}`, known_from: liveP[p.id].known_text, target_from: liveP[p.id].target_text, known_to: p.known, target_to: p.target })) });
    const addEvent = await ev('phrase-add', { seed_numbers: [228], phrase_ids: PHRASES_228.filter(p => p.add).map(p => `${COURSE}:${p.id}`), rows: 1 }, {});
    const delEvent = await ev('phrase-delete', { seed_numbers: [228], phrase_ids: REMOVED_228.map(i => `${COURSE}:${i}`), rows: REMOVED_228.length },
      { rows: REMOVED_228.map(i => ({ id: `${COURSE}:${i}`, known: liveP[i].known_text, target: liveP[i].target_text })) });
    const compEvent = await ev('lego-recut', { seed_numbers: COMPONENT_FIXES.map(f => f.seed), lego_ids: COMPONENT_FIXES.map(f => f.lego), rows: COMPONENT_FIXES.length },
      { components: COMPONENT_FIXES.map(f => ({ lego: f.lego, why: f.why, from: f.fromComponents, to: f.toComponents })) });
    const seedNumbers = [228, ...COMPONENT_FIXES.map(f => f.seed)];
    const seedEvent = await ev('unapprove', { seed_numbers: seedNumbers, rows: seedNumbers.length }, { why: 'edited by this job; needs a read', approved_at_before_228: seed.approved_at });

    await pg.query('BEGIN');
    try {
      // 1. S0228 LEGOs re-textured in place; every audio link on them detached (the words changed), old assets kept.
      for (const l of NEW_228_LEGOS) {
        const old = l228.find(x => x.lego_index === l.idx);
        const r = await pg.query(`UPDATE course_legos SET type=$1, is_new=$2, known_text=$3, target_text=$4, components=$5, known_audio_id=NULL, target1_audio_id=NULL, target2_audio_id=NULL, presentation_audio_id=NULL, target1_duration_ms=NULL, target2_duration_ms=NULL, last_edit_event_id=$6, updated_at=now()
          WHERE course_code=$7 AND seed_number=228 AND lego_index=$8 AND target_text=$9`, [l.type, l.is_new, l.known, l.target, JSON.stringify(l.components), legoEvent, COURSE, l.idx, old.target_text]);
        if (r.rowCount !== 1) throw new Error(`${l.id}: ${r.rowCount} rows`);
        if (old.presentation_audio_id) {
          await pg.query('UPDATE course_audio SET lego_id=NULL WHERE id::text=$1 AND lego_id=$2', [old.presentation_audio_id, l.id]);
          await pg.query(`INSERT INTO content_audio_link_drops (table_name, row_id, course_code, seed_number, column_name, role, old_audio_id, old_text, old_voice_id, new_text, reason)
            SELECT 'course_legos',$1,$2,228,'presentation_audio_id','presentation',a.id,a.text,a.voice_id,NULL,$4 FROM course_audio a WHERE a.id::text=$3`, [l.id, COURSE, old.presentation_audio_id, `${SWEEP}: LEGO re-cut (job ${JOB}, event ${legoEvent}); clip detached, asset kept`]);
        }
        await pg.query('UPDATE lego_introductions SET presentation_audio_id=NULL, audio_uuid=NULL, updated_at=now() WHERE course_code=$1 AND lego_id=$2', [COURSE, l.id]);
      }
      // 2. The removed row goes first (its position is reused), then rows re-textured in place, in position order.
      for (const i of REMOVED_228) {
        const r = await pg.query('DELETE FROM course_practice_phrases WHERE course_code=$1 AND id=$2 AND known_text=$3 AND target_text=$4', [COURSE, `${COURSE}:${i}`, liveP[i].known_text, liveP[i].target_text]);
        if (r.rowCount !== 1) throw new Error(`${i}: delete`);
      }
      // (re-textured in place:) (a side whose words did not change keeps its clip).
      for (const p of retextured) {
        const src = liveP[p.id];
        const kc = norm(src.known_text) !== norm(p.known), tc = norm(src.target_text) !== norm(p.target);
        const meta = p.role === 'component' ? { buildup: 'component', component_index: p.component_index, source: SWEEP, job: JOB } : { format: 'build_use', source: SWEEP, job: JOB };
        const r = await pg.query(`UPDATE course_practice_phrases SET lego_index=$1, position=$2, known_text=$3, target_text=$4, known_audio_id=$5, target1_audio_id=$6, target2_audio_id=$7, word_count=$8, lego_count=$9, lego_position=$10, connected_lego_ids='{}', metadata=$11,
            qa_checked=NULL, decomposition=NULL, decomposition_course_version=NULL, display_tiling=NULL, display_tiling_version=NULL, last_edit_event_id=$12, updated_at=now()
          WHERE course_code=$13 AND id=$14 AND known_text=$15 AND target_text=$16`,
          [p.idx, p.position, p.known, p.target, kc ? null : src.known_audio_id, tc ? null : src.target1_audio_id, tc ? null : src.target2_audio_id, p.target.length, p.target.split(/\s+/).length,
            p.role === 'use' ? 'end' : 'middle', JSON.stringify(meta), phraseEvent, COURSE, `${COURSE}:${p.id}`, src.known_text, src.target_text]);
        if (r.rowCount !== 1) throw new Error(`${p.id}: ${r.rowCount} rows`);
      }
      for (const p of PHRASES_228.filter(p => p.add)) {
        const r = await pg.query(`INSERT INTO course_practice_phrases (id, course_code, seed_number, lego_index, position, known_text, target_text, word_count, lego_count, metadata, status, phrase_role, connected_lego_ids, lego_position, lego_id, introduce, last_edit_event_id)
          VALUES ($1,$2,228,$3,$4,$5,$6,$7,$8,$9,'draft',$10,'{}',$11,$12,true,$13)`,
          [`${COURSE}:${p.id}`, COURSE, p.idx, p.position, p.known, p.target, p.target.length, p.target.split(/\s+/).length, JSON.stringify({ format: 'build_use', source: SWEEP, job: JOB, note: 'seed sentence under a new LEGO (P26)' }), p.role, 'end', `S0228L0${p.idx}`, addEvent]);
        if (r.rowCount !== 1) throw new Error(`${p.id}: insert`);
      }
      // 3. The component fixes (gloss / target of the LEGO itself untouched; component rows have no audio).
      for (const f of COMPONENT_FIXES) {
        const r = await pg.query('UPDATE course_legos SET components=$1, last_edit_event_id=$2, updated_at=now() WHERE course_code=$3 AND seed_number=$4 AND lego_index=$5 AND components=$6::jsonb',
          [JSON.stringify(f.toComponents), compEvent, COURSE, f.seed, f.idx, JSON.stringify(f.fromComponents)]);
        if (r.rowCount !== 1) throw new Error(`${f.lego}: components ${r.rowCount}`);
        for (const row of f.rows) {
          const q = await pg.query('UPDATE course_practice_phrases SET target_text=$1, qa_checked=NULL, last_edit_event_id=$2, updated_at=now() WHERE course_code=$3 AND id=$4 AND target_text=$5', [row.to, compEvent, COURSE, `${COURSE}:${row.id}`, row.from]);
          if (q.rowCount !== 1) throw new Error(`${row.id}: ${q.rowCount}`);
        }
      }
      // 4. Every touched seed loses its approval.
      for (const n of seedNumbers) await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number=$3', [seedEvent, COURSE, n]);
      await pg.query('COMMIT');
    } catch (e) { await pg.query('ROLLBACK'); throw e; }
    const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
    await refreshNow();
    console.log('APPLIED', { legoEvent, phraseEvent, addEvent, delEvent, compEvent, seedEvent });
  } finally { await pg.end(); }
}

/** FOLLOWUP=1 — the first apply re-textured S0228's component rows but their OWN presentation clips still said the old words
 *  ("only", "not", "he has"); detach them (assets kept, drop logged). Idempotent: it only touches a row whose clip text differs. */
async function followup() {
  const { Client } = require('pg');
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  try {
    const { rows } = await pg.query(`SELECT p.id, p.presentation_audio_id, a.text, a.voice_id FROM course_practice_phrases p JOIN course_audio a ON a.id = p.presentation_audio_id
      WHERE p.course_code=$1 AND p.seed_number=228 AND p.phrase_role='component' AND a.text NOT ILIKE '%''' || p.known_text || '''%'`, [COURSE]);
    console.log(`stale component intros: ${rows.length}`);
    if (process.env.APPLY !== '1') return;
    await pg.query('BEGIN');
    for (const r of rows) {
      await pg.query(`INSERT INTO content_audio_link_drops (table_name, row_id, course_code, seed_number, column_name, role, old_audio_id, old_text, old_voice_id, new_text, reason)
        VALUES ('course_practice_phrases',$1,$2,228,'presentation_audio_id','presentation',$3,$4,$5,NULL,$6)`, [r.id, COURSE, r.presentation_audio_id, r.text, r.voice_id, `${SWEEP}: component re-textured (job ${JOB}); clip detached, asset kept`]);
      await pg.query('UPDATE course_practice_phrases SET presentation_audio_id=NULL, updated_at=now() WHERE course_code=$1 AND id=$2', [COURSE, r.id]);
    }
    await pg.query('COMMIT');
    console.log('detached', rows.length);
  } catch (e) { await pg.query('ROLLBACK'); throw e; } finally { await pg.end(); }
}

if (require.main === module) (process.env.FOLLOWUP === '1' ? followup() : main()).catch(e => { console.error(e); process.exit(1); });
