#!/usr/bin/env node
'use strict';
// Job #919·I follow-on: the intro-mirror check wants an "as in" context that CONTAINS the LEGO's words. S0655L01 is
// "that you're doing very well, madam", and the context first written ("…now, madam") did not, so the intro is re-authored with the
// seed sentence as context. One clip through the ONE route (dry run first, one real call, no retries); the old clip is un-keyed, never deleted.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
const COURSE = 'ita_for_eng', SWEEP = 'ita-919-655-intro-context-2026-09-30', LEGO = 'S0655L01';
const TEXT = "The Italian for: 'that you're doing very well, madam', as in — 'I think that you're doing very well, madam', is:";
const OLD = '5c0034fa-f115-4433-ad7c-08ea61bf432c';
async function render(body) {
  const res = await fetch('http://localhost:3470/api/audio/render', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': `${SWEEP} (job 919-I)` }, body: JSON.stringify(body) });
  return { status: res.status, ...(await res.json().catch(() => ({ ok: false }))) };
}
(async () => {
  const { Client } = require('pg'); const { createClient } = require('@supabase/supabase-js');
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const body = { courseCode: COURSE, role: 'presentation', text: TEXT, voiceId: 'en-GB-SoniaNeural', voiceBound: true, legoId: LEGO, purpose: 'Kai 2026-09-30 S0655L01 intro context (#919·I)' };
  const dry = await render({ ...body, dryRun: true }); console.log('dry', dry.status, dry.source, dry.wouldSpendChars, dry.code || '');
  if (!dry.ok) { console.log('REFUSED — nothing written'); process.exit(2); }
  if (process.env.APPLY !== '1') return;
  const real = await render(body); console.log('real', real.status, real.source, real.charsSpent, real.audioId, real.code || '');
  if (!real.ok || !real.audioId) { console.log('REFUSED — nothing written'); process.exit(2); }
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const { rows: [c] } = await pg.query('SELECT voice_id, text, duration_ms FROM course_audio WHERE id=$1', [real.audioId]);
  if (!c || !/SoniaNeural/.test(c.voice_id) || c.text !== TEXT || !(c.duration_ms > 200)) { console.log('clip not usable', c); process.exit(2); }
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const ev = await recordContentEdit(sb, { identity: serviceIdentity(SWEEP, { role: 'content-sweep' }), courseCode: COURSE, surface: `tools/course-optimization/${SWEEP}.cjs`, operation: 'intro-relink', scope: { seed_numbers: [655], lego_ids: [LEGO], rows: 1 }, detail: { job: '#919·I', from: OLD, to: real.audioId, text: TEXT } });
  await pg.query('BEGIN');
  await pg.query('UPDATE course_legos SET presentation_audio_id=$1, last_edit_event_id=$3 WHERE course_code=$2 AND lego_id=$4', [real.audioId, COURSE, ev, LEGO]);
  await pg.query('UPDATE lego_introductions SET audio_uuid=$1, presentation_audio_id=$1 WHERE course_code=$2 AND lego_id=$3', [real.audioId, COURSE, LEGO]);
  await pg.query('UPDATE course_audio SET lego_id=$1 WHERE id=$2', [LEGO, real.audioId]);
  await pg.query('UPDATE course_audio SET lego_id=NULL WHERE id=$1', [OLD]);
  await pg.query('COMMIT'); await pg.end(); console.log('relinked');
})().catch((e) => { console.error(e); process.exit(1); });
