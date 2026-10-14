#!/usr/bin/env node
/**
 * South bod-clause English glosses on the LEGO rows themselves (job #218, Aran's rulings 2026-10-14).
 * tools/apply-phrase-review-answers.cjs only knows course_practice_phrases; this does the course_legos half.
 *
 *   node tools/apply-south-bod-legos-218.cjs <answers.json> <items.json>              # dry run
 *   node tools/apply-south-bod-legos-218.cjs <answers.json> <items.json> --apply      # backup + write
 *   node tools/apply-south-bod-legos-218.cjs --undo <backup_table> [--apply]          # restore
 *
 * Sets course_legos.known_text and keeps components[].known consistent (English only, no Welsh). Then lists every
 * phrase / seed / other LEGO that still quotes the old English (listed, never rewritten here).
 * Re-record rule (Aran): English wording is spoken, so a changed row's known_audio_id is unlinked on write
 * (backed up first) so the line falls into /r/human_aran_eng. Sandbox course only.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');
const { serviceIdentity } = require('../services/shared/editor-identity.cjs');
const { recordContentEdit } = require('../services/shared/content-edit-log.cjs');
const { planAnswers } = require('./apply-phrase-review-answers.cjs');

const COURSE = 'cym_sv2_for_eng';
const SURFACE = 'tools/apply-south-bod-legos-218.cjs';
const LEGO_ID = /^S\d{4}L\d{2}$/;
// Multi-part LEGO: component-by-component gloss that adds up to the new known_text.
const COMPONENT_OVERRIDES = { S1536L03: [['being', 'that being'], ['bad', 'is bad']] };

const norm = (s) => String(s || '').toLowerCase().replace(/[’']/g, "'");
function psql(sql) {
  const url = /^DATABASE_URL=(.*)$/m.exec(fs.readFileSync(path.join(__dirname, '..', '.env.psql'), 'utf8'))[1].replace(/^["']|["']$/g, '');
  const r = spawnSync('psql', [url, '-v', 'ON_ERROR_STOP=1', '-At', '-c', sql], { encoding: 'utf8', maxBuffer: 1 << 28 });
  if (r.status !== 0) throw new Error(`psql failed: ${r.stderr}`);
  return r.stdout.trim();
}
function supa() {
  for (const line of fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8').split('\n')) {
    const m = /^(SUPABASE_URL|SUPABASE_SERVICE_KEY)=(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

function newComponents(lego, to) {
  const comps = lego.components || [];
  const ov = COMPONENT_OVERRIDES[lego.lego_id];
  if (ov) return comps.map((c) => { const hit = ov.find(([from]) => from === c.known); return hit ? { ...c, known: hit[1] } : c; });
  if (comps.length === 1 && comps[0].known === lego.known_text) return [{ ...comps[0], known: to }];
  return comps;
}

async function main() {
  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');
  const sb = supa();
  const identity = serviceIdentity('apply-south-bod-legos-218', { role: 'content-fix' });
  const ui = argv.indexOf('--undo');
  if (ui >= 0) {
    const backup = argv[ui + 1];
    if (!/^backup_[a-z0-9_]+$/.test(backup)) throw new Error('bad backup name');
    const n = psql(`select count(*) from ${backup}`);
    console.log(`${apply ? 'UNDO' : 'UNDO DRY RUN'} from ${backup}: ${n} LEGO rows`);
    if (!apply) return;
    const ids = JSON.parse(psql(`select json_agg(id) from ${backup}`));
    await recordContentEdit(sb, { identity, courseCode: COURSE, surface: SURFACE, operation: 'update', scope: { lego_row_ids: ids }, detail: { undo_of: backup } });
    psql(`update course_legos t set known_text=b.known_text, components=b.components, known_audio_id=b.known_audio_id, last_edit_event_id=b.last_edit_event_id, updated_at=b.updated_at from ${backup} b where t.id=b.id`);
    console.log('restored.');
    return;
  }
  const pos = argv.filter((a) => !a.startsWith('--'));
  const answers = JSON.parse(fs.readFileSync(pos[0], 'utf8'));
  const items = JSON.parse(fs.readFileSync(pos[1], 'utf8')).items;
  const plan = planAnswers(answers.filter((a) => LEGO_ID.test(a.id)), items).filter((p) => p.action === 'set' && p.field === 'known_text');
  if (plan.some((p) => !LEGO_ID.test(p.rowShort))) throw new Error('non-LEGO in plan');

  const { data: legos, error } = await sb.from('course_legos').select('*').eq('course_code', COURSE).in('lego_id', plan.map((p) => p.rowShort));
  if (error) throw error;
  const byId = new Map(legos.map((l) => [l.lego_id, l]));
  const edits = [];
  for (const p of plan) {
    const l = byId.get(p.rowShort);
    if (!l) { console.log(`MISSING ${p.rowShort}`); continue; }
    edits.push({ l, to: p.to, comps: newComponents(l, p.to) });
  }
  console.log(`${apply ? 'APPLY' : 'DRY RUN'} ${COURSE}: ${edits.length} LEGO rows`);
  for (const { l, to, comps } of edits) {
    console.log(`\n${l.lego_id}\n  known_text : "${l.known_text}" -> "${to}"\n  components : ${JSON.stringify(l.components)}\n            -> ${JSON.stringify(comps)}\n  known audio: ${l.known_audio_id ? `LINKED ${l.known_audio_id} -> will be unlinked` : 'none linked'}`);
  }

  // Everything that still quotes the old English
  const { data: phrases } = await sb.from('course_practice_phrases').select('id,seed_number,lego_index,known_text,decomposition').eq('course_code', COURSE).limit(20000);
  const { data: seeds } = await sb.from('course_seeds').select('seed_number,known_text').eq('course_code', COURSE).limit(20000);
  const { data: allLegos } = await sb.from('course_legos').select('lego_id,known_text,components').eq('course_code', COURSE).limit(20000);
  console.log('\n[still quoting the old English — listed, NOT changed here]');
  for (const { l } of edits) {
    const old = norm(l.known_text);
    const hits = [];
    for (const p of phrases) {
      const inText = norm(p.known_text).includes(old);
      const inDec = (p.decomposition || []).some((s) => norm(s.known) === old || (s.legoId === l.lego_id && norm(s.known).includes(old)));
      if (inText || inDec) hits.push(`phrase ${p.id.split(':')[1]} "${p.known_text}"${inText ? '' : ' (decomposition gloss only)'}`);
    }
    for (const s of seeds) if (norm(s.known_text).includes(old)) hits.push(`seed S${String(s.seed_number).padStart(4, '0')} "${s.known_text}"`);
    for (const o of allLegos) if (o.lego_id !== l.lego_id && (norm(o.known_text).includes(old) || (o.components || []).some((c) => norm(c.known) === old))) hits.push(`lego ${o.lego_id} "${o.known_text}"`);
    console.log(`  ${l.lego_id} "${l.known_text}": ${hits.length ? '\n    ' + hits.join('\n    ') : 'nothing else quotes it'}`);
  }
  if (!apply) return console.log('\n(dry run: nothing written; add --apply)');

  const tag = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
  const backup = `backup_${COURSE}_bodlegos_${tag}`;
  const idList = edits.map((e) => `'${e.l.id}'`).join(',');
  psql(`create table ${backup} as select * from course_legos where id in (${idList})`);
  if (Number(psql(`select count(*) from ${backup}`)) !== edits.length) throw new Error('backup row count mismatch');
  console.log(`\nbackup table ${backup}. Undo: node ${SURFACE} --undo ${backup} --apply`);
  const eventId = await recordContentEdit(sb, { identity, courseCode: COURSE, surface: SURFACE, operation: 'update', scope: { lego_ids: edits.map((e) => e.l.lego_id) }, detail: { backup, english_only: true } });
  for (const { l, to, comps } of edits) {
    const { error: ue } = await sb.from('course_legos').update({ known_text: to, components: comps, known_audio_id: null, last_edit_event_id: eventId }).eq('id', l.id).eq('course_code', COURSE);
    if (ue) throw new Error(`update ${l.lego_id}: ${ue.message}`);
  }
  console.log('written.');
}
if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
