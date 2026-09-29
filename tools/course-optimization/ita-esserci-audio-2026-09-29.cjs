#!/usr/bin/env node
'use strict';
// job #863·I — audio for the 9 esserci USE rows, through the ONE route (POST /api/audio/render), one ROLE per run
// (ROLE=target1 | target2), one call per distinct text, no retries. A refusal is the answer: recorded, never routed
// around. A 'rendered' answer with charsSpent 0 is refused (the known route defect: the door hands back the other
// role's clip). Each new clip is decoded and its median F0 measured: Elsa ~230 Hz, Benigno ~130-170 Hz; a clip in
// the wrong range is NOT linked. English known slots are never rendered here (that route is broken on ita_for_eng).
const path = require('path');
const { execFileSync } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
const { ROWS } = require('./ita-esserci-use-2026-09-29.cjs');
const COURSE = 'ita_for_eng';
const VOICES = { target1: 'it-IT-ElsaNeural', target2: 'it-IT-BenignoNeural' };
const F0_RANGE = { target1: [190, 300], target2: [100, 185] };
const ROLE = process.env.ROLE;

async function render(body) {
  const base = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
  const res = await fetch(`${base}/api/audio/render`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': 'ita-esserci-audio-2026-09-29 (job #863·I)' }, body: JSON.stringify(body) });
  return { status: res.status, ...(await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }))) };
}
async function medianF0(s3Key) {
  const { presign } = require('../voices/s3-presign.cjs');
  const url = presign({ bucket: process.env.S3_AUDIO_BUCKET || process.env.S3_BUCKET, key: s3Key, accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, expires: 600 });
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  const pcm = execFileSync('ffmpeg', ['-v', 'error', '-i', 'pipe:0', '-f', 'f32le', '-ac', '1', '-ar', '16000', 'pipe:1'], { input: buf, maxBuffer: 1 << 28 });
  const py = `import sys,numpy as np
x=np.frombuffer(sys.stdin.buffer.read(),dtype='<f4');sr=16000;f=[];n=int(0.04*sr);h=int(0.01*sr)
for i in range(0,len(x)-n,h):
    w=x[i:i+n]
    if np.sqrt((w**2).mean())<0.02: continue
    w=w-w.mean();a=np.correlate(w,w,'full')[n-1:];lo=int(sr/400);hi=int(sr/70)
    if a[0]<=0: continue
    k=lo+int(np.argmax(a[lo:hi]))
    if a[k]/a[0]>0.5: f.append(sr/k)
print(float(np.median(f)) if len(f)>5 else -1)`;
  return Number(execFileSync('python3', ['-c', py], { input: pcm }).toString());
}
async function main() {
  if (!VOICES[ROLE]) throw new Error('set ROLE=target1 or ROLE=target2');
  const { Client } = require('pg');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const out = [];
  try {
    const { rows } = await pg.query(`SELECT id, target_text, ${ROLE}_audio_id AS aid FROM course_practice_phrases WHERE course_code=$1 AND metadata->>'source'='ita-esserci-use-2026-09-29' ORDER BY seed_number`, [COURSE]);
    for (const r of rows) {
      const e = { id: r.id.replace(/^.*:/, ''), text: r.target_text };
      out.push(e);
      if (r.aid) { e.result = 'slot already filled — skipped'; continue; }
      const body = { courseCode: COURSE, role: ROLE, text: r.target_text, voiceId: VOICES[ROLE], purpose: `Kai 2026-09-29 esserci USE phrases (${e.id})` };
      const dry = await render({ ...body, dryRun: true });
      e.dry = { source: dry.source, code: dry.code, wouldSpendChars: dry.wouldSpendChars };
      if (!dry.ok) { e.result = `REFUSED on dry run: ${dry.code || dry.status} ${dry.error || ''}`; console.log(e.id, e.result); if (/402|DAILY|REPEAT|NOT_IN_CHAIN|STOP/.test(String(dry.code || dry.status))) break; continue; }
      const real = await render(body);
      e.real = { status: real.status, source: real.source, audioId: real.audioId, charsSpent: real.charsSpent, code: real.code };
      if (!real.ok || !real.audioId) { e.result = `REFUSED: ${real.code || real.status} ${real.error || ''}`; console.log(e.id, e.result); break; }
      if (real.source === 'rendered' && !real.charsSpent) { e.result = "NOT LINKED — 'rendered' with 0 chars spent"; console.log(e.id, e.result); continue; }
      const { rows: [c] } = await pg.query('SELECT id, voice_id, text, duration_ms, s3_key FROM course_audio WHERE id=$1', [real.audioId]);
      e.clip = { id: c.id, voice: c.voice_id, ms: c.duration_ms };
      if (String(c.voice_id).replace(/^azure_/, '') !== VOICES[ROLE]) { e.result = `NOT LINKED — voice ${c.voice_id}`; console.log(e.id, e.result); continue; }
      if (c.text.trim().toLowerCase() !== r.target_text.trim().toLowerCase()) { e.result = `NOT LINKED — clip text "${c.text}"`; console.log(e.id, e.result); continue; }
      e.f0 = await medianF0(c.s3_key);
      const [lo, hi] = F0_RANGE[ROLE];
      if (!(e.f0 >= lo && e.f0 <= hi)) { e.result = `NOT LINKED — F0 ${e.f0.toFixed(0)} Hz outside ${lo}-${hi} for ${ROLE}`; console.log(e.id, e.result); continue; }
      const up = await pg.query(`UPDATE course_practice_phrases SET ${ROLE}_audio_id=$1 WHERE course_code=$2 AND id=$3 AND ${ROLE}_audio_id IS NULL`, [c.id, COURSE, r.id]);
      e.result = `${real.source}, linked (${up.rowCount}), F0 ${e.f0.toFixed(0)} Hz, ${real.charsSpent} chars`;
      console.log(e.id, e.result);
    }
  } finally { await pg.end(); }
  require('fs').writeFileSync(path.join(process.env.CS_SCRATCH || '/tmp', `esserci-audio-${ROLE}.json`), JSON.stringify(out, null, 2));
}
main().catch((e) => { console.error(e); process.exit(1); });
