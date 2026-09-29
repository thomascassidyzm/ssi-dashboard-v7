#!/usr/bin/env node
'use strict';
// job #863·I — POST /api/audio/render answered target2 for the esserci rows as 'rendered' with charsSpent 0 and stored
// Elsa's bytes (measured F0 209-246 Hz; Benigno ~136 Hz, same duration as the target1 clip) as new Benigno rows,
// which audio_autolink linked into the target2 slots. Same fence as ita-sicuro-di-wh-2026-09-29.cjs: unlink from every
// slot, relabel to the voice the bytes are, drop the false Benigno clip_index entry, raise a 'bad' flag. Nothing deleted
// from storage. The slots stay EMPTY until the route can render a real Benigno clip (a gap, reported).
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
const COURSE = 'ita_for_eng', ELSA = 'azure_it-IT-ElsaNeural';
(async () => {
  const { Client } = require('pg'); const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  try {
    const { rows } = await pg.query(`SELECT DISTINCT a.id FROM course_practice_phrases p JOIN course_audio a ON a.id=p.target2_audio_id WHERE p.course_code=$1 AND p.metadata->>'source'='ita-esserci-use-2026-09-29' AND a.voice_id LIKE '%Benigno%' AND a.duration_ms = (SELECT duration_ms FROM course_audio WHERE id=p.target1_audio_id)`, [COURSE]);
    const ids = rows.map((r) => r.id);
    await pg.query('BEGIN');
    const un = await pg.query(`UPDATE course_practice_phrases SET target2_audio_id=NULL WHERE course_code=$1 AND target2_audio_id = ANY($2::uuid[]) RETURNING id`, [COURSE, ids]);
    const rl = await pg.query(`UPDATE course_audio SET voice_id=$1 WHERE id = ANY($2::uuid[]) AND voice_id LIKE '%Benigno%'`, [ELSA, ids]);
    const ci = await pg.query(`DELETE FROM clip_index WHERE audio_id = ANY($1::uuid[]) AND voice_id LIKE '%Benigno%'`, [ids]);
    for (const id of ids) await pg.query(`INSERT INTO audio_clip_flags (audio_id, course_code, source, detector, severity, reason, metrics, raised_by) VALUES ($1,$2,'detector','f0-median','bad',$3,$4,$5)`,
      [id, COURSE, 'written by POST /api/audio/render as it-IT-BenignoNeural target2 with 0 chars spent: the bytes are the Elsa clip for the same text (female F0). Relabelled to Elsa, Benigno clip_index entry removed, unlinked from every slot (job #863·I).', JSON.stringify({ f0_range_hz: [209, 246], benigno_reference_hz: 136 }), 'ita-esserci-fence-target2-2026-09-29']);
    await pg.query('COMMIT');
    console.log(JSON.stringify({ clips: ids.length, slotsUnlinked: un.rowCount, relabelled: rl.rowCount, clipIndexRemoved: ci.rowCount }));
  } catch (e) { await pg.query('ROLLBACK'); throw e; } finally { await pg.end(); }
})().catch((e) => { console.error(e); process.exit(1); });
