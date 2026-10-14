#!/usr/bin/env node
/**
 * cym_nv2_for_eng only (Welsh sandbox). Aran accepted the Welsh 'rhai o’r ardaloedd'; the English
 * 'part of the areas' becomes 'some of the areas' in every phrase row whose Welsh contains it, and the
 * decomposition's English segment ('part of the' beside 'rhai o’r') follows. Text only.
 * Spoken-word change → any linked English audio (known_audio_id) is unlinked and left for the booth to
 * fill (fill-empty only); the clip row itself is never deleted. Rows with no audio are simply left empty.
 *   node tools/fix-rhai-ardaloedd-english.cjs            dry run
 *   node tools/fix-rhai-ardaloedd-english.cjs --apply
 *   node tools/fix-rhai-ardaloedd-english.cjs --undo <backup_table> [--apply]
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');
const { serviceIdentity } = require('../services/shared/editor-identity.cjs');
const { recordContentEdit } = require('../services/shared/content-edit-log.cjs');

const COURSE = 'cym_nv2_for_eng'; // sandbox only — never cym_n_/cym_s_/canonical_seeds
const T = 'course_practice_phrases';
const SURFACE = 'tools/fix-rhai-ardaloedd-english.cjs';

function newKnown(s) { return s.replace(/\bpart of the areas\b/g, 'some of the areas'); }
function newDecomp(d, welsh) {
  if (!Array.isArray(d) || !/rhai o’r/.test(welsh)) return d;
  return d.map((s) => (s && s.known === 'part of the' && /rhai o’r/.test(s.target || '') ? { ...s, known: 'some of the' } : s));
}
function psql(sql) {
  for (const l of fs.readFileSync(path.join(__dirname, '..', '.env.psql'), 'utf8').split('\n')) {
    const m = /^DATABASE_URL=(.*)$/.exec(l.trim()); if (m && !process.env.DATABASE_URL) process.env.DATABASE_URL = m[1].replace(/^["']|["']$/g, '');
  }
  const r = spawnSync('psql', [process.env.DATABASE_URL, '-Atc', sql], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr);
  return r.stdout.trim();
}
function supa() {
  for (const l of fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8').split('\n')) {
    const m = /^(SUPABASE_URL|SUPABASE_SERVICE_KEY)=(.*)$/.exec(l.trim()); if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

async function main() {
  const a = process.argv.slice(2); const apply = a.includes('--apply');
  const sb = supa(); const identity = serviceIdentity('fix-rhai-ardaloedd-english', { role: 'content-fix' });
  if (a.includes('--undo')) return undo(sb, identity, a[a.indexOf('--undo') + 1], apply);

  const rows = JSON.parse(psql(`select coalesce(json_agg(r order by id),'[]') from (select id,known_text,target_text,decomposition,known_audio_id from ${T} where course_code='${COURSE}' and target_text like '%rhai o’r ardaloedd%' and known_text like '%part of the areas%') r`));
  console.log(`${apply ? 'APPLY' : 'DRY RUN'} ${COURSE}: ${rows.length} rows`);
  for (const r of rows) console.log(`${r.id}\n   before: ${r.known_text}  |  ${r.target_text}\n   after : ${newKnown(r.known_text)}${r.known_audio_id ? `   [UNLINK known_audio_id ${r.known_audio_id}]` : '   [no audio linked]'}`);
  if (!apply) return;
  const tag = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
  const backup = `backup_${COURSE}_rhai_ardaloedd_${tag}`;
  const ids = rows.map((r) => `'${r.id}'`).join(',');
  psql(`create table ${backup} as select * from ${T} where id in (${ids})`);
  if (Number(psql(`select count(*) from ${backup}`)) !== rows.length) throw new Error('backup count mismatch');
  console.log(`backup ${backup}. Undo: node ${SURFACE} --undo ${backup} --apply`);
  const eventId = await recordContentEdit(sb, { identity, courseCode: COURSE, surface: SURFACE, operation: 'update', scope: { phrase_ids: rows.map((r) => r.id) }, detail: { backup, change: 'part of the areas → some of the areas' } });
  for (const r of rows) {
    const set = { known_text: newKnown(r.known_text), decomposition: newDecomp(r.decomposition, r.target_text), last_edit_event_id: eventId };
    if (r.known_audio_id) set.known_audio_id = null;
    const { error } = await sb.from(T).update(set).eq('id', r.id).eq('course_code', COURSE);
    if (error) throw new Error(`${r.id}: ${error.message}`);
  }
  console.log('written.');
}
async function undo(sb, identity, backup, apply) {
  if (!/^backup_cym_nv2_for_eng_rhai_ardaloedd_\d+$/.test(backup || '')) throw new Error('give the backup table name');
  const n = psql(`select count(*) from ${backup}`);
  console.log(`${apply ? 'UNDO' : 'UNDO DRY RUN'} from ${backup}: ${n} rows`);
  if (!apply) return;
  await recordContentEdit(sb, { identity, courseCode: COURSE, surface: SURFACE, operation: 'update', scope: {}, detail: { undo_of: backup } });
  psql(`update ${T} t set known_text=b.known_text, decomposition=b.decomposition, known_audio_id=b.known_audio_id, last_edit_event_id=b.last_edit_event_id, updated_at=b.updated_at from ${backup} b where t.id=b.id and t.course_code='${COURSE}'`);
  console.log('restored.');
}
main().catch((e) => { console.error(e.message); process.exit(1); });
