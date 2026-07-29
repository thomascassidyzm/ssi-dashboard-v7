#!/usr/bin/env node
/**
 * check-encouragements.cjs — per legacy course, is its encouragement set CURRENT?
 * Truth = Supabase shared_audio table (instruction+encouragement) by S3 sample-UUID, per KNOWN language.
 * Rule (Kai 07-29): only a full match = current; anything less = outdated. (see memory encouragements-currency-check)
 * Read-only. Outputs TSV: legacyId  known  match/total  state
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');
const svc = require('../../services/language-code-service.cjs');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const L2 = svc.LEGACY_TO_STANDARD || {}; const INV = {}; for (const [k, v] of Object.entries(L2)) INV[v] = k; // 2->3
const s3uuid = (k) => { const m = (k || '').match(/([0-9a-fA-F-]{36})\.mp3$/); return m ? m[1].toUpperCase() : null; };

async function currentSets() {
  const cur = {};
  for (let f = 0; ; f += 1000) {
    const { data } = await sb.from('shared_audio').select('language,s3_key').in('audio_type', ['instruction', 'encouragement']).range(f, f + 999);
    if (!data || !data.length) break;
    for (const r of data) { const u = s3uuid(r.s3_key); if (u) (cur[r.language] = cur[r.language] || new Set()).add(u); }
    if (data.length < 1000) break;
  }
  return cur;
}
function deployedUuids() {
  // (filename, encouragement uuid) for every legacy config, via one remote jq
  const jq = '([.slices[]?.pooledEncouragements[]?.id] + [.slices[]?.orderedEncouragements[]?.id])[] | [input_filename, (.|ascii_upcase)] | @tsv';
  const tmp = path.join(os.tmpdir(), 'enc.jq'); fs.writeFileSync(tmp, jq + '\n');
  execFileSync('scp', ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=15', tmp, 'ssi@apidev:/tmp/enc.jq'], { stdio: 'ignore' });
  const out = execFileSync('ssh', ['-o', 'BatchMode=yes', '-o', 'ConnectTimeout=15', 'ssi@apidev',
    'bash -lc "cd ~/course-materials/course-configs/Courses && jq -rf /tmp/enc.jq *.json 2>/dev/null"'],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 180000 });
  const per = {};
  for (const line of out.split('\n')) { if (!line) continue; const [fn, uuid] = line.split('\t'); const id = fn.replace(/\.json$/, ''); (per[id] = per[id] || []).push(uuid); }
  return per;
}

(async () => {
  const [cur, dep] = [await currentSets(), deployedUuids()];
  const rows = [];
  for (const [id, uuids] of Object.entries(dep)) {
    const known = INV[id.split('-')[0]] || id.split('-')[0];
    const set = cur[known];
    if (!set || !set.size) { rows.push([id, known, `?/?`, 'no-current-set']); continue; }
    const match = uuids.filter(u => set.has(u)).length;
    const state = match >= set.size ? 'current' : 'outdated';   // strict: full match only
    rows.push([id, known, `${match}/${set.size}`, state]);
  }
  rows.sort((a, b) => a[3].localeCompare(b[3]) || a[0].localeCompare(b[0]));
  console.log('legacyId\tknown\tmatch\tstate');
  for (const r of rows) console.log(r.join('\t'));
  console.error(`\n${rows.filter(r => r[3] === 'current').length} current | ${rows.filter(r => r[3] === 'outdated').length} outdated | ${rows.filter(r => r[3] === 'no-current-set').length} no-set`);
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
