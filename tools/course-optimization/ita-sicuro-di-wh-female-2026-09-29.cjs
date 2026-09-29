#!/usr/bin/env node
'use strict';
// tools/course-optimization/ita-sicuro-di-wh-female-2026-09-29.cjs
//
// ita_for_eng — the FEMALE half of Kai's 2026-09-29 sicuro-di ruling (job #733·I, his follow-up: "this affects the
// FEMALE versions of phrases too (sicura …)"). On this course target1 (Elsa) speaks the row's FEMALE READING —
// course_gender_expansions.expanded_f keyed by the row's exact target text (services/gender-haiku-service.cjs
// loadGenderMap: expanded_f → target1, expanded_m → target2) — so "non sono sicuro" is heard as "non sono sicura".
// POST /api/audio/render speaks its text VERBATIM, so a female reading must be asked for in its own words.
//
// Scope: every row whose target says sicuro + di + question word (the ruling's class), plus every row job #733·I
// edited or added that says sicuro. For each: the female reading it should have (speaker-gendered forms only —
// "non sono sicuro" → "sicura", "sarò pronto" → "pronta"; "nessuno era sicuro" / "non era sicuro" name somebody
// else and stay), whether course_gender_expansions holds it, and what the live Elsa clip actually SAYS (decoded by
// the veracity decoder).
//
//   node tools/course-optimization/ita-sicuro-di-wh-female-2026-09-29.cjs          # read-only census (decodes clips)
//   APPLY=1 node …                                                                  # expansions + Elsa renders, make-before-break
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
const base = require('./ita-sicuro-di-wh-2026-09-29.cjs');

const COURSE = 'ita_for_eng';
const JOB = '#733·I';
const SWEEP = 'ita-sicuro-di-wh-female-2026-09-29';
const ELSA = 'it-IT-ElsaNeural';
const norm = (s) => String(s || '').toLowerCase().replace(/’/g, "'").replace(/[.,!?;:"«»“”]+/g, ' ').replace(/\s+/g, ' ').trim();
const short = (id) => String(id).replace(/^ita_for_eng:/, '');

/** The speaker's female reading (pure, tested) — the rule lives beside the ruling's other rules in the base tool. */
const { femaleReading } = base;

async function census(pg) {
  const edited = new Set([...base.EDITS, ...base.ADDS, ...base.COMPONENTS, ...base.COMPONENT_ADDS].map((r) => `${COURSE}:${r.id}`));
  const { rows } = await pg.query(`
    SELECT 'phrase' AS t, id, seed_number AS sn, phrase_role AS role, target_text, target1_audio_id AS t1 FROM course_practice_phrases WHERE course_code=$1 AND target_text ~* 'sicur[oaie]'
    UNION ALL SELECT 'lego', lego_id, seed_number, 'lego', target_text, target1_audio_id FROM course_legos WHERE course_code=$1 AND target_text ~* 'sicur[oaie]'
    UNION ALL SELECT 'seed', seed_id, seed_number, 'seed', target_text, target1_audio_id FROM course_seeds WHERE course_code=$1 AND target_text ~* 'sicur[oaie]'
    ORDER BY 3, 2`, [COURSE]);
  const scoped = rows.filter((r) => base.sicuroDiWh(r.target_text) || edited.has(r.id) || r.id === 'S0080L01');
  const { rows: exp } = await pg.query(`SELECT id, original_text, expanded_f, expanded_m FROM course_gender_expansions WHERE course_code=$1 AND text_side='target'`, [COURSE]);
  const byText = new Map(exp.map((e) => [e.original_text, e]));
  const out = [];
  for (const r of scoped) {
    const { rows: [clip] } = await pg.query('SELECT id, voice_id, text, s3_key FROM course_audio WHERE id=$1', [r.t1]);
    const e = byText.get(r.target_text) || null;
    out.push({ ...r, id: short(r.id), want: femaleReading(r.target_text), expansion: e && { id: e.id, f: e.expanded_f, m: e.expanded_m }, clip: clip || null });
  }
  return out;
}

async function decodeAll(rows) {
  const veracity = require('../../services/audio-veracity.cjs');
  const dir = path.join(process.env.CS_SCRATCH || require('os').tmpdir(), SWEEP); fs.mkdirSync(dir, { recursive: true });
  for (const r of rows) {
    if (!r.clip?.s3_key) { r.heard = null; continue; }
    const f = path.join(dir, `${r.clip.id}.mp3`);
    if (!fs.existsSync(f)) { const res = await fetch(`https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${r.clip.s3_key}`); fs.writeFileSync(f, Buffer.from(await res.arrayBuffer())); }
    const v = await veracity.checkAudioVeracity(f, r.want, 'ita');
    r.heard = v.decode;
    // the speaker words the ruling is about: does the clip say sicura/sicuro (and pronta/pronto) as the reading wants?
    const saysF = (w) => new RegExp(`\\b${w}\\b`).test(norm(v.decode));
    r.speaksWant = ['sicura', 'sicuro', 'pronta', 'pronto'].every((w) => saysF(w) === new RegExp(`\\b${w}\\b`).test(norm(r.want)));
  }
}

async function render(body) {
  const res = await fetch(`${(process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '')}/api/audio/render`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': `${SWEEP} (job ${JOB})` }, body: JSON.stringify(body) });
  return { status: res.status, ...(await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }))) };
}

/** (1) every scoped row whose female reading differs gets its expanded_f / expanded_m pair; stale bare-form rows this job orphaned go. */
async function applyExpansions(pg, supabase, rows, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const need = [...new Map(rows.filter((r) => r.want !== r.target_text && r.expansion?.f !== r.want).map((r) => [r.target_text, r])).values()];
  const orphanTexts = [...base.EDITS.map((e) => e.before.target), ...base.DELETES.map((d) => d.target)];
  const { rows: stale } = await pg.query(`SELECT e.id, e.original_text, e.expanded_f FROM course_gender_expansions e WHERE e.course_code=$1 AND e.text_side='target' AND e.original_text = ANY($2)
    AND NOT EXISTS (SELECT 1 FROM course_practice_phrases p WHERE p.course_code=$1 AND p.target_text=e.original_text) AND NOT EXISTS (SELECT 1 FROM course_legos l WHERE l.course_code=$1 AND l.target_text=e.original_text)`, [COURSE, orphanTexts]);
  const ev = await recordContentEdit(supabase, { identity: serviceIdentity(SWEEP, { role: 'content-sweep' }), courseCode: COURSE, surface: `tools/course-optimization/${SWEEP}.cjs`, operation: 'gender-expansion-edit',
    scope: { seed_numbers: [...new Set(need.map((r) => r.sn))], rows: need.length + stale.length },
    detail: { job: JOB, ruling: "Kai 2026-09-29: the female versions follow the sicuro-di ruling", upserts: need.map((r) => ({ original: r.target_text, from_f: r.expansion?.f || null, to_f: r.want })), deleted_orphans: stale } });
  await pg.query('BEGIN');
  try {
    for (const r of need) await pg.query(`INSERT INTO course_gender_expansions (course_code, original_text, language, expanded_f, expanded_m, text_side) VALUES ($1,$2,'ita',$3,$2,'target')
      ON CONFLICT (course_code, original_text, text_side) DO UPDATE SET expanded_f=EXCLUDED.expanded_f, expanded_m=EXCLUDED.expanded_m, processed_at=now()`, [COURSE, r.target_text, r.want]);
    if (stale.length) await pg.query('DELETE FROM course_gender_expansions WHERE id = ANY($1::uuid[])', [stale.map((s) => s.id)]);
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  log.expansions = { event: ev, upserted: need.map((r) => ({ original: r.target_text, from: r.expansion?.f || null, to: r.want })), deletedOrphans: stale };
}

/** (2) make-before-break: a new Elsa clip that SAYS the female reading, verified by decode, then swapped in; the old clip is kept. */
async function applyElsa(pg, rows, log) {
  const veracity = require('../../services/audio-veracity.cjs');
  const dir = path.join(process.env.CS_SCRATCH || require('os').tmpdir(), SWEEP);
  const todo = rows.filter((r) => r.want !== r.target_text && r.speaksWant === false && r.role !== 'component');
  const byWant = new Map();
  log.elsa = [];
  for (const r of todo) {
    let got = byWant.get(r.want);
    if (!got) {
      const body = { courseCode: COURSE, role: 'target1', text: r.want, voiceId: ELSA, purpose: `Kai 2026-09-29 sicuro di: female reading (${r.id})` };
      const dry = await render({ ...body, dryRun: true });
      got = { want: r.want, dry: { status: dry.status, source: dry.source, code: dry.code } };
      if (!dry.ok) got.result = `REFUSED on dry run: ${dry.code || dry.status} ${dry.error || ''}`;
      else {
        const real = await render(body);
        got.real = { status: real.status, source: real.source, code: real.code, audioId: real.audioId, charsSpent: real.charsSpent, error: real.error };
        if (!real.ok || !real.audioId) got.result = `REFUSED: ${real.code || real.status} ${real.error || ''}`;
        else {
          const { rows: [clip] } = await pg.query('SELECT id, voice_id, text, duration_ms, s3_key FROM course_audio WHERE id=$1', [real.audioId]);
          got.clip = clip;
          if (String(clip.voice_id).replace(/^azure_/, '') !== ELSA) got.result = `NOT LINKED — returned a ${clip.voice_id} clip`;
          else {
            const f = path.join(dir, `new-${clip.id}.mp3`);
            const res = await fetch(`https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${clip.s3_key}`); fs.writeFileSync(f, Buffer.from(await res.arrayBuffer()));
            const v = await veracity.checkAudioVeracity(f, r.want, 'ita');
            got.heard = v.decode;
            const says = (w) => new RegExp(`\\b${w}\\b`).test(norm(v.decode));
            const ok = ['sicura', 'sicuro', 'pronta', 'pronto'].every((w) => says(w) === new RegExp(`\\b${w}\\b`).test(norm(r.want)));
            got.result = ok ? real.source : `NOT LINKED — the new clip decodes as "${v.decode}"`;
          }
        }
      }
      byWant.set(r.want, got); log.elsa.push(got);
    }
    if (!got.clip || !['rendered', 'library'].includes(got.result)) continue;
    const table = r.t === 'lego' ? 'course_legos' : r.t === 'seed' ? 'course_seeds' : 'course_practice_phrases';
    const key = r.t === 'lego' ? 'lego_id' : r.t === 'seed' ? 'seed_id' : 'id';
    const rowId = r.t === 'phrase' ? `${COURSE}:${r.id}` : r.id;
    const up = await pg.query(`UPDATE ${table} SET target1_audio_id=$1 WHERE course_code=$2 AND ${key}=$3 AND target1_audio_id=$4`, [got.clip.id, COURSE, rowId, r.clip.id]);
    if (up.rowCount === 1) await pg.query(`INSERT INTO content_audio_link_drops (table_name, row_id, course_code, seed_number, column_name, role, old_audio_id, new_audio_id, old_text, new_text, old_voice_id, reason) VALUES ($1,$2,$3,$4,'target1_audio_id','target1',$5,$6,$7,$8,$9,$10)`,
      [table, rowId, COURSE, r.sn, r.clip.id, got.clip.id, r.clip.text, got.clip.text, r.clip.voice_id, `${SWEEP}: Elsa said "sicuro" where the female reading is "${r.want}" (decoded "${r.heard}"); replaced after the new clip decoded right (job ${JOB}); old clip kept`]);
    got.swapped = [...(got.swapped || []), `${r.id}${up.rowCount === 1 ? '' : ' (slot moved — not swapped)'}`];
  }
}

async function main() {
  const { Client } = require('pg');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  try {
    const rows = await census(pg);
    await decodeAll(rows);
    for (const r of rows) {
      const expOk = r.want === r.target_text ? (!r.expansion || r.expansion.f === r.want) : r.expansion?.f === r.want;
      console.log(`${r.id.padEnd(12)} ${r.role.padEnd(9)} want "${r.want}"\n${' '.repeat(23)}expansion ${r.expansion ? `"${r.expansion.f}"` : '—'} ${expOk ? 'ok' : 'FIX'} · Elsa ${r.clip ? `"${r.heard}"` : 'NONE'} ${r.speaksWant ? 'ok' : 'FIX'}`);
    }
    const log = { sweep: SWEEP, job: JOB, census: rows };
    if (process.env.APPLY === '1') {
      const { createClient } = require('@supabase/supabase-js');
      await applyExpansions(pg, createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } }), rows, log);
      console.log(`EXPANSIONS: ${log.expansions.upserted.length} upserted, ${log.expansions.deletedOrphans.length} orphaned bare-form rows removed`);
      await applyElsa(pg, rows, log);
      for (const g of log.elsa) console.log(`  "${g.want}": dry ${g.dry.source || g.dry.code} → ${g.result}${g.heard ? ` (decodes "${g.heard}")` : ''}${g.swapped ? ` → ${g.swapped.join(', ')}` : ''}`);
    }
    const { evidencePath } = require('../lib/evidence-path.cjs');
    const f = evidencePath(`tools/course-optimization/${SWEEP}/${process.env.APPLY === '1' ? 'applied' : 'census'}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(f, JSON.stringify(log, null, 2)); console.log(`Wrote ${f}`);
  } finally { await pg.end(); }
}
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { femaleReading };
