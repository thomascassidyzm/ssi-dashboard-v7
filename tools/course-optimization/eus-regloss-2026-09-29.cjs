#!/usr/bin/env node
'use strict';
// tools/course-optimization/eus-regloss-2026-09-29.cjs
//
// eus_for_eng — RE-GLOSS a LEGO's ENGLISH to match its edited seed (Kai, 2026-09-29, job #751·E):
//   "where a LEGO gloss disagrees with an edited seed, match the seed" — the seed was changed deliberately.
// The BASQUE of the LEGO and of every phrase never changes here (so no Basque clip is touched); only the
// English does. Never deletes a LEGO or a phrase.
//
//   node tools/course-optimization/eus-regloss-2026-09-29.cjs <spec.json>              # dry run: guards + checks + plan
//   APPLY=1 node tools/course-optimization/eus-regloss-2026-09-29.cjs <spec.json>      # write content (no audio)
//   MODE=audio node tools/course-optimization/eus-regloss-2026-09-29.cjs <spec.json>   # dry-run the audio route calls
//   MODE=audio LIVE=1 node …                                                            # render through POST /api/audio/render, link intros
//
// SPEC  { "name": "<short>", "legos": [ {
//     "lego": "S0022L01", "fromKnown": "to know people",        // guard: the live gloss right now
//     "known": "to meet people",                                  // the new gloss — MUST be a whole-word slice of the seed English
//     "exception": "why it cannot be",                            // only if it truly cannot (listed for Kai, never silent)
//     "components": [ {known,target}, … ],                        // optional: replace the stored components (targets must still tile)
//     "phrases": { "S0022L01B01": "new English", … },             // every row whose English changes; omitted rows keep theirs
//     "intro": "The Basque for: '…', is:"                         // optional override of the re-authored intro line
//   } ] }
// Rules enforced (a violation stops the run): new gloss ⊂ seed English; every build/use phrase under the LEGO carries the
// new gloss on the known side after the rewrite; the phrase's Basque is untouched; a rewritten phrase's English is not
// identical to another phrase's English in the same seed unless its Basque is identical too.
// Warned (listed, not blocking): the new English of a row already maps to a DIFFERENT Basque elsewhere in the course (ZUT).

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });

const COURSE = 'eus_for_eng';
const JOB = '#751·E';
const RULING = 'Kai, 2026-09-29 (job #751·E): where a LEGO gloss disagrees with an edited seed, match the seed; intros mirror the new gloss';
const norm = (s) => String(s || '').toLowerCase().replace(/[’‘`´]/g, "'").replace(/[.,!?;:"«»¿¡()]+/g, ' ').replace(/\s+/g, ' ').trim();
const has = (hay, needle) => ` ${norm(hay)} `.includes(` ${norm(needle)} `);
const legoIdParts = (id) => { const m = /^S(\d{4})L(\d{2})$/.exec(id); if (!m) throw new Error(`bad lego id ${id}`); return { seed: Number(m[1]), idx: Number(m[2]) }; };

/** The re-authored intro: the old line with its quoted chunk swapped for the new gloss; the "as in — '…'" clause is
 *  kept only while it still demonstrates the new gloss. Pure — tested. */
function reauthorIntro(oldText, oldGloss, newGloss) {
  if (!oldText) return null;
  const q = (s) => `'${s}'`;
  let t = String(oldText).replace(/[‘’]/g, "'");
  const i = t.indexOf(q(oldGloss.replace(/[‘’]/g, "'")));
  if (i < 0) return `The Basque for: ${q(newGloss)}, is:`;
  t = t.slice(0, i) + q(newGloss) + t.slice(i + oldGloss.length + 2);
  const m = /,\s*as in — '(.*)',\s*is:\s*$/.exec(t);
  if (m && !has(m[1], newGloss)) t = t.slice(0, m.index) + ', is:';
  return t;
}

/** A spec phrase value is a string (new English) or {known, target} (English and Basque, for a LEGO that GREW). */
const phraseAfter = (e, r) => { const v = (e.phrases || {})[r.sid]; return v == null ? { known: r.known_text, target: r.target_text } : typeof v === 'string' ? { known: v, target: r.target_text } : { known: v.known ?? r.known_text, target: v.target ?? r.target_text }; };

/** Plain checks over one spec entry against live rows. Returns { errors, warnings }. */
function checkEntry(e, live) {
  const errors = [], warnings = [];
  // revert: put back the previous gloss and rows exactly (the ZUT rule outranks matching the seed) — slice/containment checks off, listed as an exception.
  // phrasesOnly: the LEGO's gloss already matches the seed; only some phrase rows are rewritten (the gloss must be the live one).
  if (e.phrasesOnly) { e.fromKnown = live.lego.known_text; e.known = live.lego.known_text; }
  if (live.lego.known_text !== e.fromKnown) errors.push(`${e.lego}: live gloss is "${live.lego.known_text}", spec expected "${e.fromKnown}" (already applied?)`);
  if (!e.known || (!e.phrasesOnly && norm(e.known) === norm(e.fromKnown))) errors.push(`${e.lego}: new gloss is empty or unchanged`);
  if (!e.revert && !e.phrasesOnly && !has(live.seed.known_text, e.known) && !e.exception) errors.push(`${e.lego}: new gloss "${e.known}" is not a whole-word slice of the seed English "${live.seed.known_text}" (give an "exception" only if it truly cannot be)`);
  const rows = live.phrases;
  const legoTarget = e.target || live.lego.target_text;
  if (e.target && live.lego.target_text !== e.fromTarget) errors.push(`${e.lego}: live Basque is "${live.lego.target_text}", spec expected fromTarget "${e.fromTarget}"`);
  for (const id of Object.keys(e.phrases || {})) if (!rows.find(r => r.sid === id)) errors.push(`${e.lego}: phrase ${id} is not a live row of this LEGO`);
  for (const r of rows) {
    const after = phraseAfter(e, r).known;
    if (!e.revert && r.phrase_role !== 'component' && !has(after, e.known)) errors.push(`${r.sid}: English "${after}" does not carry the new gloss "${e.known}"`);
    if (r.phrase_role !== 'component' && !has(phraseAfter(e, r).target, legoTarget)) errors.push(`${r.sid}: Basque "${phraseAfter(e, r).target}" does not carry the LEGO Basque "${legoTarget}"`);
  }
  const seen = new Map();
  for (const r of rows.filter(r => r.phrase_role !== 'component')) {
    const after = phraseAfter(e, r).known;
    const k = norm(after);
    if (seen.has(k) && norm(seen.get(k).target_text) !== norm(r.target_text)) errors.push(`${r.sid}: English "${after}" duplicates ${seen.get(k).sid} under a different Basque`);
    seen.set(k, r);
  }
  if (e.components) {
    const tile = e.components.map(c => norm(c.target)).join('').replace(/\s/g, '');
    if (tile !== norm(legoTarget).replace(/\s/g, '')) errors.push(`${e.lego}: new components do not tile "${live.lego.target_text}"`);
  }
  return { errors, warnings };
}

module.exports = { reauthorIntro, checkEntry, norm, has };

async function main() {
  const specPath = process.argv[2];
  if (!specPath) { console.error('usage: eus-regloss-2026-09-29.cjs <spec.json>'); process.exit(2); }
  const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
  const SWEEP = `eus-regloss-2026-09-29-${spec.name}`;
  const SURFACE = 'tools/course-optimization/eus-regloss-2026-09-29.cjs';
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const planFile = evidencePath(`tools/course-optimization/${SWEEP}.plan.json`);
  const { Client } = require('pg');
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  try {
    if (process.env.MODE === 'audio') return await audio(pg, planFile);
    const APPLY = process.env.APPLY === '1';
    const plan = { name: spec.name, entries: [] };
    let bad = 0;
    for (const e of spec.legos) {
      const { seed: sn, idx } = legoIdParts(e.lego);
      const { rows: [seed] } = await pg.query('SELECT known_text, target_text, approved_at FROM course_seeds WHERE course_code=$1 AND seed_number=$2', [COURSE, sn]);
      const { rows: [lego] } = await pg.query('SELECT known_text, target_text, components, is_new, presentation_audio_id FROM course_legos WHERE course_code=$1 AND seed_number=$2 AND lego_index=$3', [COURSE, sn, idx]);
      if (!seed || !lego) throw new Error(`${e.lego}: not a live LEGO`);
      const { rows: phrases } = await pg.query(`SELECT split_part(id,':',2) sid, id, phrase_role, known_text, target_text, known_audio_id FROM course_practice_phrases WHERE course_code=$1 AND seed_number=$2 AND lego_index=$3 ORDER BY position`, [COURSE, sn, idx]);
      const live = { seed, lego, phrases };
      const { errors } = checkEntry(e, live);
      // ZUT warning: the new English of a build/use row already maps to another Basque elsewhere in the course.
      const warn = [];
      for (const sid of Object.keys(e.phrases || {})) {
        const row = phrases.find(r => r.sid === sid); if (!row || row.phrase_role === 'component') continue;
        const k = phraseAfter(e, row).known;
        const { rows } = await pg.query(`SELECT split_part(id,':',2) sid, target_text FROM course_practice_phrases WHERE course_code=$1 AND phrase_role<>'component' AND lower(trim(known_text))=lower(trim($2)) AND id<>$3 AND lower(trim(target_text))<>lower(trim($4)) LIMIT 3`, [COURSE, k, row.id, phraseAfter(e, row).target]);
        if (rows.length) warn.push(`${sid} "${k}" also maps to ${rows.map(r => `${r.sid}="${r.target_text}"`).join('; ')}`);
      }
      let introOld = null;
      if (lego.presentation_audio_id) { const { rows: [a] } = await pg.query('SELECT text FROM course_audio WHERE id::text=$1', [lego.presentation_audio_id]); introOld = a?.text || null; }
      const introNew = e.phrasesOnly ? null : (e.intro || (introOld ? reauthorIntro(introOld, e.fromKnown, e.known) : null));
      console.log(`${e.lego}: "${e.fromKnown}" → "${e.known}"${e.exception ? `  [EXCEPTION: ${e.exception}]` : ''}  (${Object.keys(e.phrases || {}).length}/${phrases.length} rows)${introOld ? `\n    intro: ${introOld}\n        →  ${introNew}` : ''}`);
      warn.forEach(w => console.log(`    ZUT-warn: ${w}`));
      errors.forEach(x => { console.log(`    ERROR: ${x}`); bad++; });
      plan.entries.push({ ...e, seed: sn, idx, introOldId: lego.presentation_audio_id || null, introOld, introNew, approvedBefore: seed.approved_at, oldPhrases: Object.fromEntries(phrases.map(r => [r.sid, r.known_text])), oldTargets: Object.fromEntries(phrases.map(r => [r.sid, r.target_text])), warnings: warn });
    }
    if (bad) { console.log(`${bad} error(s) — nothing written.`); process.exit(1); }
    if (!APPLY) { console.log('DRY RUN — clean. APPLY=1 to write.'); return; }

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
    const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
    const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
    const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
    const ev = (operation, scope, detail) => recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation, scope, detail: { ruling: RULING, job: JOB, ...detail } });
    const seeds = [...new Set(plan.entries.map(x => x.seed))];
    const rowsChanged = plan.entries.reduce((n, x) => n + Object.keys(x.phrases || {}).length, 0);
    const legoEvent = await ev('lego-regloss', { seed_numbers: seeds, lego_ids: plan.entries.map(x => x.lego), rows: plan.entries.length },
      { changes: plan.entries.map(x => ({ lego: x.lego, from: x.fromKnown, to: x.known, exception: x.exception || null, intro_from: x.introOld, intro_to: x.introNew })) });
    const phraseEvent = await ev('phrase-edit', { seed_numbers: seeds, rows: rowsChanged },
      { changes: plan.entries.flatMap(x => Object.entries(x.phrases || {}).map(([sid, k]) => ({ id: `${COURSE}:${sid}`, known_from: x.oldPhrases[sid], target_from: x.oldTargets[sid], to: k }))) });
    const seedEvent = await ev('unapprove', { seed_numbers: seeds, rows: seeds.length }, { why: 'LEGO English re-glossed to match the edited seed; needs a read' });

    await pg.query('BEGIN');
    try {
      for (const x of plan.entries) {
        const sets = ['known_text=$1', 'known_audio_id=NULL', 'presentation_audio_id=NULL', 'known_gloss_segments=NULL', 'last_edit_event_id=$2', 'updated_at=now()'];
        const args = [x.known, legoEvent, COURSE, x.seed, x.idx, x.fromKnown];
        if (x.components) { sets.push('components=$7::jsonb'); args.push(JSON.stringify(x.components)); }
        if (x.target) { sets.push('target_text=$' + (args.length + 1), 'target1_audio_id=NULL', 'target2_audio_id=NULL', 'target1_duration_ms=NULL', 'target2_duration_ms=NULL'); args.push(x.target); }
        const lid = x.lego;
        if (!x.phrasesOnly) {
        const r = await pg.query(`UPDATE course_legos SET ${sets.join(', ')} WHERE course_code=$3 AND seed_number=$4 AND lego_index=$5 AND known_text=$6`, args);
        if (r.rowCount !== 1) throw new Error(`${x.lego}: ${r.rowCount} rows`);
        if (x.introOldId) {
          await pg.query('UPDATE course_audio SET lego_id=NULL WHERE id::text=$1 AND lego_id=$2', [x.introOldId, lid]);
          await pg.query(`INSERT INTO content_audio_link_drops (table_name, row_id, course_code, seed_number, column_name, role, old_audio_id, old_text, old_voice_id, new_text, reason)
            SELECT 'course_legos',$1,$2,$3,'presentation_audio_id','presentation',a.id,a.text,a.voice_id,$5,$6 FROM course_audio a WHERE a.id::text=$4`, [lid, COURSE, x.seed, x.introOldId, x.introNew, `${SWEEP}: LEGO English re-glossed (job ${JOB}, event ${legoEvent}); clip detached, asset kept`]);
        }
        await pg.query('UPDATE lego_introductions SET presentation_audio_id=NULL, audio_uuid=NULL, updated_at=now() WHERE course_code=$1 AND lego_id=$2', [COURSE, lid]);
        }
        for (const [sid, v] of Object.entries(x.phrases || {})) {
          const k = typeof v === 'string' ? v : v.known ?? x.oldPhrases[sid];
          const t = typeof v === 'string' ? x.oldTargets[sid] : v.target ?? x.oldTargets[sid];
          const tChanged = norm(t) !== norm(x.oldTargets[sid]);
          const q = await pg.query(`UPDATE course_practice_phrases SET known_text=$1, target_text=$6, known_audio_id=NULL, ${tChanged ? 'target1_audio_id=NULL, target2_audio_id=NULL, target1_duration_ms=NULL, target2_duration_ms=NULL, word_count=$7, lego_count=$8,' : ''} known_gloss_segments=NULL, qa_checked=NULL, decomposition=NULL, decomposition_course_version=NULL, display_tiling=NULL, display_tiling_version=NULL, last_edit_event_id=$2, updated_at=now()
            WHERE course_code=$3 AND id=$4 AND known_text=$5`, tChanged ? [k, phraseEvent, COURSE, `${COURSE}:${sid}`, x.oldPhrases[sid], t, t.length, t.split(/\s+/).length] : [k, phraseEvent, COURSE, `${COURSE}:${sid}`, x.oldPhrases[sid], t]);
          if (q.rowCount !== 1) throw new Error(`${sid}: ${q.rowCount} rows`);
        }
      }
      for (const n of seeds) await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$1, updated_at=now() WHERE course_code=$2 AND seed_number=$3', [seedEvent, COURSE, n]);
      await pg.query('COMMIT');
    } catch (e) { await pg.query('ROLLBACK'); throw e; }
    fs.writeFileSync(planFile, JSON.stringify(plan, null, 1));
    try { await require('../../services/shared/round-index-refresh.cjs').refreshNow(); } catch (e) { console.log('round-index refresh skipped:', e.message); }
    console.log('APPLIED', { legoEvent, phraseEvent, seedEvent, plan: planFile });
  } finally { await pg.end(); }
}

/** MODE=audio — every changed English line through POST /api/audio/render (dryRun unless LIVE=1), then link the intros. */
async function audio(pg, planFile) {
  const { spawnSync } = require('child_process');
  const plan = JSON.parse(fs.readFileSync(planFile, 'utf8'));
  const LIVE = process.env.LIVE === '1';
  const jobs = new Map();
  const add = (role, text, lego) => { const k = `${role}|${text}`; if (!jobs.has(k)) jobs.set(k, { role, text, lego }); };
  for (const x of plan.entries) {
    if (!x.phrasesOnly) add('known', x.known);
    for (const [sid, v] of Object.entries(x.phrases || {})) {
      add('known', typeof v === 'string' ? v : v.known ?? x.oldPhrases[sid]);
      if (typeof v !== 'string' && v.target && norm(v.target) !== norm(x.oldTargets[sid])) { add('target1', v.target); add('target2', v.target); }
    }
    if (x.target) { add('target1', x.target); add('target2', x.target); }
    if (x.introNew) add('presentation', x.introNew, x.lego);
  }
  const tally = {}, results = [];
  for (const j of jobs.values()) {
    const a = ['tools/audio/render.cjs', '--course', COURSE, '--role', j.role, '--text', j.text, '--purpose', `job ${JOB}: LEGO English re-glossed to the edited seed (Kai 2026-09-29)`];
    if (j.lego) a.push('--lego', j.lego);
    if (!LIVE) a.push('--dry-run');
    const r = spawnSync('node', a, { env: { ...process.env, AGENT_ID: 'job-751-eus-regloss' }, encoding: 'utf8' });
    let o; try { o = JSON.parse(r.stdout); } catch { o = { ok: false, code: 'UNPARSED', error: (r.stdout + r.stderr).slice(0, 200) }; }
    const key = o.source || o.code || 'unknown'; tally[key] = (tally[key] || 0) + 1;
    results.push({ ...j, source: o.source || null, code: o.code || null, error: o.error || null, audioId: o.audioId || null, chars: o.wouldSpendChars ?? o.charsSpent ?? 0 });
    if (!o.ok) console.log(`  ${j.role} "${j.text.slice(0, 60)}" => ${o.code || 'FAILED'} ${o.error || ''}`.slice(0, 260));
  }
  console.log(LIVE ? 'LIVE' : 'DRY RUN', tally, 'chars:', results.reduce((n, r) => n + (r.chars || 0), 0));
  fs.writeFileSync(planFile.replace('.plan.json', LIVE ? '.audio-live.json' : '.audio-dry.json'), JSON.stringify(results, null, 1));
  if (!LIVE) return;
  // Link each intro clip to its LEGO (the route files the clip under lego_id but does not set the LEGO's own links).
  for (const x of plan.entries.filter(x => x.introNew)) {
    const { rows: [clip] } = await pg.query(`SELECT id, duration_ms FROM course_audio WHERE course_code=$1 AND role='presentation' AND text=$2 ORDER BY (lego_id=$3) DESC NULLS LAST, created_at DESC LIMIT 1`, [COURSE, x.introNew, x.lego]);
    if (!clip) { console.log(`  ${x.lego}: intro clip not found — left unlinked`); continue; }
    await pg.query('UPDATE course_legos SET presentation_audio_id=$1, updated_at=now() WHERE course_code=$2 AND lego_id=$3', [clip.id, COURSE, x.lego]);
    await pg.query(`INSERT INTO lego_introductions (course_code, lego_id, presentation_audio_id, audio_uuid, duration_ms, updated_at) VALUES ($1,$2,$3,$3,$4,now())
      ON CONFLICT (course_code, lego_id) DO UPDATE SET presentation_audio_id=EXCLUDED.presentation_audio_id, audio_uuid=EXCLUDED.audio_uuid, duration_ms=EXCLUDED.duration_ms, updated_at=now()`, [COURSE, x.lego, clip.id, clip.duration_ms]);
  }
  const { rows } = await pg.query(`SELECT lego_id FROM course_legos WHERE course_code=$1 AND lego_id = ANY($2) AND known_audio_id IS NULL`, [COURSE, plan.entries.map(x => x.lego)]);
  if (rows.length) console.log('LEGO rows still without a known clip:', rows.map(r => r.lego_id).join(', '));
}

if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
