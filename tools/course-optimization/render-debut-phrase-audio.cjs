#!/usr/bin/env node
'use strict';
// tools/course-optimization/render-debut-phrase-audio.cjs — job #906
//
// Audio for the practice phrases of named debut LEGOs, through the ONE route (POST /api/audio/render,
// Tom 2026-09-29): one call per (role, distinct text) whose slot is empty, dry run first, then the real
// call, no retries. The route is library-first; a new course_audio row is linked into every empty slot
// with that text by the DB's audio_autolink trigger, which refuses a clip in the wrong voice. A refusal
// (402 / DAILY_TOTAL_CAP / REPEAT / NOT_IN_CHAIN / TOM_STOP) is the answer: it stops the run and is
// reported, never routed around. Afterwards every slot is re-read and reported filled or empty.
//
//   node tools/course-optimization/render-debut-phrase-audio.cjs ita_for_eng S0001L04,S0190L01          # dry run: what it would spend
//   APPLY=1 node tools/course-optimization/render-debut-phrase-audio.cjs ita_for_eng S0001L04,S0190L01
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });

const ROLES = { target1: 'target_text', target2: 'target_text', known: 'known_text' };
const STOP = /402|DAILY|REPEAT|NOT_IN_CHAIN|STOP|CAP/;

async function render(body) {
  const base = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
  const res = await fetch(`${base}/api/audio/render`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': 'render-debut-phrase-audio (job #906)' }, body: JSON.stringify(body) });
  return { status: res.status, ...(await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }))) };
}

async function slots(pg, course, legos) {
  // lego_id is NULL on older rows: select by the id prefix, which every phrase carries.
  const { rows } = await pg.query(`SELECT id, phrase_role, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id
    FROM course_practice_phrases WHERE course_code=$1 AND phrase_role IN ('build','use') AND substring(id from '(S\\d{4}L\\d{2})[BU]\\d{2}$') = ANY($2) ORDER BY id`, [course, legos]);
  return rows;
}

async function main() {
  const [course, legoArg] = process.argv.slice(2);
  if (!course || !legoArg) { console.error('usage: render-debut-phrase-audio.cjs <course> S0001L04,S0190L01'); process.exit(64); }
  const legos = legoArg.split(',');
  const APPLY = process.env.APPLY === '1';
  const { Client } = require('pg');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const log = { course, legos, calls: [], spent: 0, wouldSpend: 0, stoppedBy: null };
  try {
    const before = await slots(pg, course, legos);
    const want = new Map(); // role|text -> ids
    for (const r of before) for (const [role, col] of Object.entries(ROLES)) {
      if (r[`${role}_audio_id`]) continue;
      const k = `${role}\u0000${r[col]}`; if (!want.has(k)) want.set(k, []); want.get(k).push(r.id);
    }
    const configured = {};
    for (const role of Object.keys(ROLES)) configured[role] = (await pg.query('SELECT audio_configured_voice($1,$2) v', [course, role])).rows[0].v;
    for (const [k, ids] of want) {
      const [role, text] = k.split('\u0000');
      // voiceBound + the configured voice, always: without it the route answered a target2 request with
      // the target1 clip of the same words, stored as the target2 voice (job #863, again in #906).
      const body = { courseCode: course, role, text, voiceId: configured[role], voiceBound: true, purpose: `debut practice phrases ${legos.join(',')} (job #906, Tom 2026-09-30)` };
      const dry = await render({ ...body, dryRun: true });
      const c = { role, text, slots: ids.length, dry: dry.source || dry.code || dry.status, wouldSpend: dry.wouldSpendChars || 0 };
      log.calls.push(c); log.wouldSpend += c.wouldSpend;
      if (!dry.ok) { c.result = `REFUSED on dry run: ${dry.code || dry.status} ${dry.error || ''}`; if (STOP.test(String(dry.code || dry.status))) { log.stoppedBy = c.result; break; } continue; }
      if (!APPLY) continue;
      const real = await render(body);
      c.real = { status: real.status, source: real.source, audioId: real.audioId, charsSpent: real.charsSpent || 0, code: real.code };
      log.spent += c.real.charsSpent;
      if (!real.ok) { c.result = `REFUSED: ${real.code || real.status} ${real.error || ''}`; if (STOP.test(String(real.code || real.status))) { log.stoppedBy = c.result; break; } continue; }
      const col = `${role}_audio_id`;
      // 'rendered' with nothing spent is the route handing back some other clip: never keep it linked.
      if (real.source === 'rendered' && !c.real.charsSpent) {
        const un = await pg.query(`UPDATE course_practice_phrases SET ${col}=NULL WHERE course_code=$1 AND id = ANY($2) AND ${col}=$3`, [course, ids, real.audioId]);
        c.result = `NOT KEPT — 'rendered' with 0 chars (unlinked ${un.rowCount})`; continue;
      }
      // A library answer that is already one of this course's rows inserts nothing, so the autolink
      // trigger never fires: link it here, only if the clip is in the configured voice and says these words.
      const { rows: [clip] } = await pg.query('SELECT voice_id, text FROM course_audio WHERE id=$1', [real.audioId]);
      const bare = (v) => String(v || '').replace(/^(azure|cartesia|elevenlabs|xai)_/, '');
      if (clip && bare(clip.voice_id) === bare(configured[role]) && clip.text.trim().toLowerCase() === text.trim().toLowerCase()) {
        const up = await pg.query(`UPDATE course_practice_phrases SET ${col}=$1 WHERE course_code=$2 AND id = ANY($3) AND ${col} IS NULL`, [real.audioId, course, ids]);
        if (up.rowCount) c.result = `linked ${up.rowCount} by hand`;
      } else if (clip) c.result = `not linked: clip voice ${clip.voice_id} / text "${clip.text}"`;
    }
    const after = await slots(pg, course, legos);
    log.slots = after.map((r) => ({ id: r.id, known: !!r.known_audio_id, target1: !!r.target1_audio_id, target2: !!r.target2_audio_id }));
    log.empty = log.slots.flatMap((s) => Object.keys(ROLES).filter((role) => !s[role]).map((role) => `${s.id}:${role}`));
  } finally { await pg.end(); }
  for (const c of log.calls) console.log(`${c.role.padEnd(8)} ${String(c.slots).padStart(2)} slot(s)  ${String(c.dry).padEnd(12)} ${c.real ? `→ ${c.real.source} ${c.real.charsSpent} chars` : ''} ${c.result || ''}  "${c.text}"`);
  console.log(`\n${APPLY ? `spent ${log.spent}` : `would spend ${log.wouldSpend}`} chars; ${log.empty.length} slot(s) still empty${log.empty.length ? ': ' + log.empty.join(', ') : ''}${log.stoppedBy ? `\nSTOPPED: ${log.stoppedBy}` : ''}`);
  require('fs').writeFileSync(path.join(process.env.CS_SCRATCH || require('os').tmpdir(), `render-debut-phrase-audio-${course}.json`), JSON.stringify(log, null, 2));
}
main().catch((e) => { console.error(e); process.exit(1); });
