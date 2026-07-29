#!/usr/bin/env node
/**
 * update-goals.cjs — patch the `goal:` line of every course in docs/course-tracker.yml.
 * goal.legacy: live | asap | high | eventual | no   (from live-on-legacy + course-code sets)
 * goal.new_app: urgent | normal                     (current new-app focus set)
 * Decisions per Kai 2026-07-29. Re-runnable (recomputes from live status). Only touches the goal line.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const fs = require('fs');
const { execFileSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');
const svc = require('../../services/language-code-service.cjs');
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const L2 = svc.LEGACY_TO_STANDARD || {};
const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');

function toLegacyId(code) {
  const [t, k] = code.split('_for_'); if (!k) return null;
  const p = (s) => { const x = s.split('_'); return { base: x[0], variant: x.slice(1).join('-') || null }; };
  const tgt = p(t), knw = p(k); const k2 = L2[knw.base], t2 = L2[tgt.base]; if (!k2 || !t2) return null;
  return `${knw.variant ? k2 + '-' + knw.variant : k2}-${tgt.variant ? t2 + '-' + tgt.variant : t2}`;
}
function livePublished() {
  let out; try {
    out = execFileSync('ssh', ['-o', 'ConnectTimeout=15', '-o', 'BatchMode=yes', 'ssi@apidev',
      'bash -lc "cd ~/course-tool && ./compare-courses.rb"'], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 180000 });
  } catch { return new Set(); }
  const live = new Set();
  for (const raw of out.split('\n')) { const l = stripAnsi(raw); if (!l.startsWith('|') || /repo_ver/.test(l)) continue; const c = l.split('|').map(s => s.trim()); if (c.length >= 12 && /published/i.test(c[10] || '')) live.add(c[1]); }
  return live;
}

const URGENT = new Set(['eng_for_hin', 'eng_for_urd', 'eng_for_pan', 'eng_for_guj', 'eng_for_ben', 'eng_for_mar', 'eng_for_tel', 'eng_for_kan', 'eng_for_sin', 'eng_for_tam', 'kor_for_hin', 'kor_for_tam', 'zho_for_hin', 'zho_for_tam']);
const NO_LEGACY = new Set(['course_code', 'eng_template', 'zzz_test_for_eng']);

function legacyGoal(code, liveIds) {
  if (NO_LEGACY.has(code)) return 'no';
  const legId = toLegacyId(code);
  if (legId && liveIds.has(legId)) return 'live';
  if (/^eng_for_/.test(code)) return 'asap';
  const [t, k] = code.split('_for_');
  const baseVariant = t && t.split('_').length > 1;
  if (baseVariant) { const base = t.split('_')[0] + '_for_' + k; const bLeg = toLegacyId(base); if (bLeg && liveIds.has(bLeg)) return 'high'; }
  return 'eventual';
}

(async () => {
  const liveIds = livePublished();
  const { data: courses } = await sb.from('courses').select('course_code');
  const goal = {}; for (const c of courses) goal[c.course_code] = { legacy: legacyGoal(c.course_code, liveIds), new_app: URGENT.has(c.course_code) ? 'urgent' : 'normal' };

  const file = path.join(__dirname, '..', '..', 'docs', 'course-tracker.yml');
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  let cur = null, patched = 0;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^([a-z][a-z0-9_]*):\s*$/); if (m) { cur = m[1]; continue; }
    if (cur && /^  goal:\s/.test(lines[i]) && goal[cur]) { lines[i] = `  goal:        { legacy: ${goal[cur].legacy}, new_app: ${goal[cur].new_app} }`; patched++; }
  }
  fs.writeFileSync(file, lines.join('\n'));
  const tally = {}; for (const g of Object.values(goal)) tally[g.legacy] = (tally[g.legacy] || 0) + 1;
  console.log(`patched goal on ${patched} courses | live-published legacy ids: ${liveIds.size}`);
  console.log('legacy goals:', JSON.stringify(tally), '| new_app urgent:', Object.values(goal).filter(g => g.new_app === 'urgent').length);
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
