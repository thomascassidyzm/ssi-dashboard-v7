#!/usr/bin/env node
// Read-only audit: eng_for_X family — voice1/voice2 duplication + wrong-gender vs convention.
// Convention: target1 = female (bedd6226 Olivia / en-GB-Sonia), target2 = male (gfzdpspr5fdp Tom / en-GB-Ryan|Oliver).
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const FEMALE = new Set(['bedd6226', 'xai_bedd6226', 'en-GB-SoniaNeural', 'azure_en-GB-SoniaNeural']);
const MALE = new Set(['gfzdpspr5fdp', 'xai_gfzdpspr5fdp', 'en-GB-RyanNeural', 'azure_en-GB-RyanNeural', 'en-GB-OliverNeural', 'azure_en-GB-OliverNeural']);
const gender = v => FEMALE.has(v) ? 'F' : MALE.has(v) ? 'M' : '?';

async function allRows(table, sel, filters, cap = 200000) {
  const out = [];
  let from = 0;
  while (out.length < cap) {
    let q = s.from(table).select(sel).range(from, from + 999);
    for (const [k, v] of filters) q = q.eq(k, v);
    const { data, error } = await q;
    if (error) throw new Error(table + ': ' + error.message);
    out.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return out;
}

async function resolveFkSample(cc, col, n) {
  // sample n non-null FKs from phrases+legos, resolve to voice_id gender
  const res = { F: 0, M: 0, '?': 0 };
  for (const table of ['course_practice_phrases', 'course_legos']) {
    const { data, error } = await s.from(table).select(col).eq('course_code', cc).not(col, 'is', null).limit(n);
    if (error) { console.error(cc, table, error.message); continue; }
    const ids = data.map(r => r[col]);
    for (let i = 0; i < ids.length; i += 100) {
      const { data: au } = await s.from('course_audio').select('id,voice_id').in('id', ids.slice(i, i + 100));
      (au || []).forEach(a => res[gender(a.voice_id)]++);
    }
  }
  return res;
}

(async () => {
  const { data: courses } = await s.from('courses').select('course_code,voice_config').like('course_code', 'eng_for_%').order('course_code');
  const report = [];
  for (const c of courses) {
    const cc = c.course_code;
    const v = (c.voice_config && c.voice_config.voices) || {};
    const cfg = r => v[r] ? `${v[r].voiceId}(${gender(v[r].voiceId)})` : '—';
    // role|voice inventory
    const rows = await allRows('course_audio', 'role,voice_id', [['course_code', cc]]);
    const inv = {};
    for (const r of rows) { if (r.role === 'target1' || r.role === 'target2') { const k = r.role + '|' + r.voice_id; inv[k] = (inv[k] || 0) + 1; } }
    // defect signature: target1 rows with a MALE voice, target2 rows with FEMALE
    let t1Male = 0, t2Female = 0;
    for (const [k, n] of Object.entries(inv)) {
      const [role, vid] = k.split('|');
      if (role === 'target1' && gender(vid) === 'M') t1Male += n;
      if (role === 'target2' && gender(vid) === 'F') t2Female += n;
    }
    const t1fk = await resolveFkSample(cc, 'target1_audio_id', 300);
    const t2fk = await resolveFkSample(cc, 'target2_audio_id', 300);
    const verdict =
      (t1fk.M > 0 || t1Male > 0) ? 'DUPLICATED/WRONG-GENDER (male audio in voice-1)' :
      (t2fk.F > 0 || t2Female > 0) ? 'WRONG-GENDER (female audio in voice-2)' : 'OK';
    report.push({ cc, cfgT1: cfg('target1'), cfgT2: cfg('target2'), t1MaleRows: t1Male, t2FemaleRows: t2Female, t1fk, t2fk, verdict, inv });
    console.log(cc.padEnd(13), 'cfg t1:', cfg('target1'), 't2:', cfg('target2'),
      '| t1♂rows:', t1Male, 't2♀rows:', t2Female,
      '| FK t1 F/M/?:', `${t1fk.F}/${t1fk.M}/${t1fk['?']}`,
      'FK t2 F/M/?:', `${t2fk.F}/${t2fk.M}/${t2fk['?']}`,
      '|', verdict);
  }
  require('fs').writeFileSync('tools/course-optimization/voice1-gender-audit-report.json', JSON.stringify(report, null, 1));
  console.log('\nwritten tools/course-optimization/voice1-gender-audit-report.json');
})();
