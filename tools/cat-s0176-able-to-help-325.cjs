#!/usr/bin/env node
/**
 * Kai's approval of 2026-10-14 (job #325), cat_for_eng seed 176: the English gloss of LEGO S0176L01
 * 'podrà ajudar' is 'will be able to help', not 'will manage to help'. Applied everywhere the gloss is
 * written: the LEGO's known_text, the phrase S0176L01B01's known_text, and every decomposition tile
 * whose legoId is S0176L01 (the tile must say its LEGO's words). The seed sentence already read
 * "he'll be able to help" and is untouched.
 *
 * Audio is NOT rendered here: the new known + presentation clips were made through POST /api/audio/render
 * first (make-before-break), and --apply links them in the same UPDATE as the text, so the text-change
 * trigger leaves the links alone. The old clips (which truthfully speak 'manage to') are kept.
 *
 *   node tools/cat-s0176-able-to-help-325.cjs                # dry run
 *   node tools/cat-s0176-able-to-help-325.cjs --apply --known-audio <uuid>
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const COURSE = 'cat_for_eng';
const SURFACE = 'tools/cat-s0176-able-to-help-325.cjs';
const LEGO_ID = 'S0176L01';
const FROM = 'will manage to help';
const TO = 'will be able to help';

/** Pure: a decomposition with S0176L01 tiles re-glossed. Returns null if nothing changes. */
function regloss(decomposition) {
  let changed = false;
  const out = (decomposition || []).map((t) => {
    if (t.legoId === LEGO_ID && t.known === FROM) { changed = true; return { ...t, known: TO }; }
    return t;
  });
  return changed ? out : null;
}

function dbUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const m = /^DATABASE_URL=(.*)$/m.exec(fs.readFileSync(path.join(__dirname, '..', '.env.psql'), 'utf8'));
  return m[1].replace(/^["']|["']$/g, '');
}
function psql(sql) {
  const r = spawnSync('psql', [dbUrl(), '-v', 'ON_ERROR_STOP=1', '-At', '-1', '-f', '-'], { input: sql, encoding: 'utf8', maxBuffer: 64 << 20 });
  if (r.status !== 0) throw new Error(`psql failed: ${r.stderr}`);
  return r.stdout.trim();
}
const q = (v) => `'${String(v).replace(/'/g, "''")}'`;
const rows = (sql) => JSON.parse(psql(`select coalesce(json_agg(t),'[]') from (${sql}) t`));

async function record(detail) {
  const { createClient } = require('@supabase/supabase-js');
  const { serviceIdentity } = require('../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../services/shared/content-edit-log.cjs');
  for (const line of fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8').split('\n')) {
    const m = /^(SUPABASE_URL|SUPABASE_SERVICE_KEY)=(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  return recordContentEdit(sb, { identity: serviceIdentity('cat-s0176-able-to-help-325', { role: 'content-fix' }), courseCode: COURSE, surface: SURFACE, operation: 'update', scope: { seed_numbers: [176], lego_ids: [LEGO_ID] }, detail });
}

async function main() {
  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');
  const ai = argv.indexOf('--known-audio');
  const knownAudio = ai >= 0 ? argv[ai + 1] : null;
  const [lego] = rows(`select id,known_text from course_legos where course_code=${q(COURSE)} and lego_id=${q(LEGO_ID)}`);
  const phrases = rows(`select id,known_text,decomposition from course_practice_phrases where course_code=${q(COURSE)} and (known_text=${q(FROM)} or decomposition::text like '%${FROM}%')`);
  const edits = [];
  if (lego.known_text === FROM) edits.push(`update course_legos set known_text=${q(TO)}${knownAudio ? `, known_audio_id=${q(knownAudio)}` : ''} where id=${q(lego.id)};`);
  for (const p of phrases) {
    const d = regloss(p.decomposition);
    const sets = [];
    if (p.known_text === FROM) { sets.push(`known_text=${q(TO)}`); if (knownAudio) sets.push(`known_audio_id=${q(knownAudio)}`); }
    if (d) sets.push(`decomposition=${q(JSON.stringify(d))}::jsonb`);
    if (sets.length) edits.push(`update course_practice_phrases set ${sets.join(', ')} where id=${q(p.id)};`);
  }
  console.log(`${apply ? 'APPLY' : 'DRY RUN'}: ${edits.length} updates`);
  if (!apply) return;
  if (!knownAudio) throw new Error('--apply needs --known-audio <uuid> (the rendered clip of "will be able to help")');
  const eventId = await record({ ruling: 'Kai 2026-10-14: will manage to help -> will be able to help', rows: edits.length });
  const stamped = edits.map((e) => e.replace(/ where id=/, `, last_edit_event_id=${q(eventId)} where id=`));
  const prefix = `backup_c325_${Date.now()}`;
  psql(`create table ${prefix}_legos as select * from course_legos where id=${q(lego.id)};
create table ${prefix}_phrases as select * from course_practice_phrases where id in (${phrases.map((p) => q(p.id)).join(',')});
${stamped.join('\n')}`);
  console.log(`written; backups ${prefix}_legos/_phrases`);
}

module.exports = { regloss };
if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
