#!/usr/bin/env node
'use strict';
// Job #919·I, Kai 2026-09-30, seed 311: known "the three most important facts" must have the article on the target side: "i tre fatti più importanti".
// The article i is taught before 311 (S0195 "the money | i soldi"; and inside ai, S0311L03 itself), so it is available (P1). Three S0311L02 rows carried
// known "the three…" with a bare "tre fatti": U01 (Kai's), B02 and U06 (same defect). Known text unchanged; new target1/target2 clips through the ONE route
// (dry run first, one real call, no retries); any refusal → nothing written. Seed 311 stays unapproved.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
const COURSE = 'ita_for_eng', SWEEP = 'ita-919-311-i-tre-fatti-2026-09-30';
const EDITS = [
  ['S0311L02U01', 'I want to remember the three most important facts', 'voglio ricordare tre fatti più importanti', 'voglio ricordare i tre fatti più importanti'],
  ['S0311L02B02', "he couldn't explain the three most important facts", 'non poteva spiegare tre fatti più importanti', 'non poteva spiegare i tre fatti più importanti'],
  ['S0311L02U06', 'she said it was hard to understand the three most important facts', 'ha detto che era difficile capire tre fatti più importanti', 'ha detto che era difficile capire i tre fatti più importanti'],
];
const VOICES = { target1: 'it-IT-ElsaNeural', target2: 'it-IT-BenignoNeural' };
const norm = (s) => String(s || '').toLowerCase().replace(/[.,!?;:"]/g, ' ').replace(/\s+/g, ' ').trim();
async function render(body) {
  const res = await fetch('http://localhost:3470/api/audio/render', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': `${SWEEP} (job 919-I)` }, body: JSON.stringify(body) });
  return { status: res.status, ...(await res.json().catch(() => ({ ok: false }))) };
}
(async () => {
  const { Client } = require('pg'); const { createClient } = require('@supabase/supabase-js');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  for (const [id, k, before] of EDITS) { const r = (await pg.query('SELECT known_text, target_text FROM course_practice_phrases WHERE course_code=$1 AND id=$2', [COURSE, `${COURSE}:${id}`])).rows[0]; if (!r || r.known_text !== k || r.target_text !== before) throw new Error(`${id} live differs: ${JSON.stringify(r)}`); }
  const APPLY = process.env.APPLY === '1', clips = {};
  for (const [id, , , after] of EDITS) for (const slot of ['target1', 'target2']) {
    const body = { courseCode: COURSE, role: slot, text: after, voiceId: VOICES[slot], voiceBound: true, purpose: `Kai 2026-09-30 seed 311 i tre fatti (${id})` };
    const dry = await render({ ...body, dryRun: true }); console.log(id, slot, 'dry', dry.status, dry.source, dry.wouldSpendChars, dry.code || '');
    if (!dry.ok) { console.log('REFUSED — nothing written'); process.exit(2); }
    if (!APPLY) continue;
    const real = await render(body); console.log(id, slot, 'real', real.status, real.source, real.charsSpent, real.code || '');
    if (!real.ok || !real.audioId) { console.log('REFUSED — nothing written'); process.exit(2); }
    const c = (await pg.query('SELECT voice_id, text, duration_ms FROM course_audio WHERE id=$1', [real.audioId])).rows[0];
    if (!c || String(c.voice_id).replace(/^azure_/, '') !== VOICES[slot] || norm(c.text) !== norm(after) || !(c.duration_ms > 200)) { console.log('clip not usable', c); process.exit(2); }
    clips[`${id}.${slot}`] = real.audioId;
  }
  if (!APPLY) { await pg.end(); return; }
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const ev = await recordContentEdit(sb, { identity: serviceIdentity(SWEEP, { role: 'content-sweep' }), courseCode: COURSE, surface: `tools/course-optimization/${SWEEP}.cjs`, operation: 'phrase-edit',
    scope: { seed_numbers: [311], phrase_ids: EDITS.map((e) => `${COURSE}:${e[0]}`), rows: EDITS.length }, detail: { job: '#919·I', changes: EDITS.map(([id, k, b, a]) => ({ id, known: k, from: b, to: a })) } });
  await pg.query('BEGIN');
  try {
    for (const [id, , before, after] of EDITS) {
      const r = await pg.query(`UPDATE course_practice_phrases SET target_text=$1, word_count=$2, lego_count=$3, qa_checked=NULL, decomposition=NULL, decomposition_course_version=NULL, display_tiling=NULL, display_tiling_version=NULL, last_edit_event_id=$4, updated_at=now() WHERE course_code=$5 AND id=$6 AND target_text=$7`, [after, after.length, after.split(/\s+/).length, ev, COURSE, `${COURSE}:${id}`, before]);
      if (r.rowCount !== 1) throw new Error(id);
      for (const slot of ['target1', 'target2']) await pg.query(`UPDATE course_practice_phrases SET ${slot}_audio_id=$1 WHERE course_code=$2 AND id=$3`, [clips[`${id}.${slot}`], COURSE, `${COURSE}:${id}`]);
    }
    await pg.query('UPDATE course_seeds SET approved_at=NULL WHERE course_code=$1 AND seed_number=311', [COURSE]);
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  await pg.end(); console.log('applied');
})().catch((e) => { console.error(e); process.exit(1); });
