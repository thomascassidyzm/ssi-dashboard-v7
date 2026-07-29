#!/usr/bin/env node
/**
 * update-checkpoints.cjs — patch observable checkpoint states into docs/course-tracker.yml.
 * welcomes:    populated (course_audio role=welcome, non-pending) -> current; none -> not_done;
 *              base course that has a variant sibling -> outdated (welcome must name the base variant,
 *              e.g. por_br added -> Portuguese welcome must say "European"). Kai 2026-07-29.
 * scan_course: not_done for all — running scan-course only ASSESSES condition; a course stays
 *              not_done until actually remediated (Kai 2026-07-29). Left as the honest default.
 * Only touches the welcomes: and scan_course: lines.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

(async () => {
  const { data: wel } = await sb.from('course_audio').select('course_code,s3_key').eq('role', 'welcome');
  const populated = new Set((wel || []).filter(r => r.s3_key && !r.s3_key.startsWith('pending/')).map(r => r.course_code));

  const { data: courses } = await sb.from('courses').select('course_code');
  const codes = new Set(courses.map(c => c.course_code));
  const baseHasVariant = new Set();
  for (const c of codes) { const [t, k] = c.split('_for_'); if (!k) continue; const toks = t.split('_'); if (toks.length > 1) { const base = toks[0] + '_for_' + k; if (codes.has(base)) baseHasVariant.add(base); } }

  const welcomeState = (code) => baseHasVariant.has(code) ? 'outdated' : (populated.has(code) ? 'current' : 'not_done');

  const file = path.join(__dirname, '..', '..', 'docs', 'course-tracker.yml');
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  let cur = null, w = 0, s = 0;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^([a-z][a-z0-9_]*):\s*$/); if (m) { cur = m[1]; continue; }
    if (!cur || !codes.has(cur)) continue;
    if (/^    welcomes:\s/.test(lines[i])) { lines[i] = `    welcomes:       { state: ${welcomeState(cur)}, date: null }`; w++; }
    if (/^    scan_course:\s/.test(lines[i])) { lines[i] = `    scan_course:    { state: not_done, date: null }`; s++; }
  }
  fs.writeFileSync(file, lines.join('\n'));
  console.log(`welcomes patched: ${w} | scan_course patched: ${s}`);
  console.log(`welcome states: current ${[...codes].filter(c => welcomeState(c) === 'current').length} | outdated(base-w-variant) ${baseHasVariant.size} | not_done ${[...codes].filter(c => welcomeState(c) === 'not_done').length}`);
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
