#!/usr/bin/env node
/**
 * seed-tracker.cjs — generate docs/course-tracker.yml scaffold.
 * Seeds OBSERVABLE fields (build size, legacy live version, basecamp column) from the
 * same three sources as gather.cjs; leaves DECISION fields as `tbd` for us to fill together.
 * Idempotent-ish: writes a fresh scaffold. Do NOT run over a populated tracker without a diff.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const fs = require('fs');
const { execFileSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');
const svc = require('../../services/language-code-service.cjs');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const L2 = svc.LEGACY_TO_STANDARD || {};
const TODAY = new Date().toISOString().slice(0, 10);
const alias = require('./basecamp-aliases.json');
const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');

function toLegacyId(code) {
  const [t, k] = code.split('_for_'); if (!k) return null;
  const p = (s) => { const x = s.split('_'); return { base: x[0], variant: x.slice(1).join('-') || null }; };
  const tgt = p(t), knw = p(k); const k2 = L2[knw.base], t2 = L2[tgt.base]; if (!k2 || !t2) return null;
  return `${knw.variant ? k2 + '-' + knw.variant : k2}-${tgt.variant ? t2 + '-' + tgt.variant : t2}`;
}

async function getCourses() {
  const rows = [];
  for (let f = 0; ; f += 1000) {
    const { data, error } = await sb.from('courses').select('course_code,seed_count,new_app_status,version,content_version').range(f, f + 999);
    if (error) throw error; rows.push(...data); if (data.length < 1000) break;
  }
  return rows.sort((a, b) => a.course_code.localeCompare(b.course_code));
}
function getLegacy() {
  let out; try {
    out = execFileSync('ssh', ['-o', 'ConnectTimeout=15', '-o', 'BatchMode=yes', 'ssi@apidev',
      'bash -lc "cd ~/course-materials/course-configs/Courses && git pull --quiet; cd ~/course-tool && ./compare-courses.rb"'],
      { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 180000 });
  } catch (e) { return {}; }
  const byId = {};
  for (const raw of out.split('\n')) {
    const line = stripAnsi(raw);
    if (!line.startsWith('|') || /repo_ver/.test(line)) continue;
    const c = line.split('|').map(s => s.trim()); if (c.length < 12 || !c[1]) continue;
    byId[c[1]] = { prod_ver: c[9], prod_stat: c[10] };
  }
  return byId;
}
function getBasecamp() {
  const COLS = { '7038571697': 'Triage', '7038571698': 'Not now', '7038571700': 'Content-check', '7038571702': 'Ready-stage', '9557920015': 'On-stage', '9568174940': 'Ready-live', '9557930593': 'Live' };
  const byCourse = {};
  for (const [id, name] of Object.entries(COLS)) {
    let out; try { out = execFileSync('basecamp', ['cards', 'list', '--column', id, '-p', '26277678', '--json'], { encoding: 'utf8', env: { ...process.env, PATH: `${process.env.HOME}/.local/bin:${process.env.PATH}` }, maxBuffer: 8 * 1024 * 1024 }); } catch { continue; }
    let j; try { j = JSON.parse(out); } catch { continue; }
    for (const card of (j.data || [])) { const t = (card.title || '').toLowerCase().trim(); if (alias[t]) byCourse[alias[t]] = name; }
  }
  return byCourse;
}

// minimal YAML emitter for our fixed shape
function emit(course, o) {
  const cp = o.checkpoints;
  return [
    `${course}:`,
    `  goal:        { legacy: tbd, new_app: tbd }`,
    `  built:       { to: ${o.built_to ?? 'null'}, date: tbd }`,
    `  legacy_live: { version: ${o.legacy_ver ? '"' + o.legacy_ver + '"' : 'null'}, as_of: ${o.legacy_ver ? TODAY : 'null'} }`,
    `  basecamp:    ${o.basecamp || 'null'}`,
    `  checkpoints:`,
    `    encouragements: { state: tbd, date: null }`,
    `    welcomes:       { state: tbd, date: null }`,
    `    audio:          { state: tbd, date: null }`,
    `    scan_course:    { state: tbd, date: null }`,
    `    deborah_check:  { needed: tbd, state: tbd, date: null }`,
    `  version_intent: null`,
    `  notes: []`,
  ].join('\n');
}

(async () => {
  const [courses, legacy, bc] = [await getCourses(), getLegacy(), getBasecamp()];
  const header = [
    `# Course tracker — our authoritative, dated record of each course's goal + state.`,
    `# Observable fields (built/legacy_live/basecamp) seeded ${TODAY}; DECISION fields = tbd (fill together).`,
    `# state values: not_done | current | outdated  (outdated = was done, now stale e.g. new encouragements shipped)`,
    `# goal.legacy: yes | no | when-ready   goal.new_app: urgent | normal`,
    `# Git history is the decision log; add dated one-liners under notes.`, ``,
  ].join('\n');
  const blocks = courses.map(c => {
    const legId = toLegacyId(c.course_code);
    const lg = legId ? legacy[legId] : null;
    return emit(c.course_code, {
      built_to: c.seed_count || null,
      legacy_ver: lg && /published/i.test(lg.prod_stat || '') ? lg.prod_ver : null,
      basecamp: bc[c.course_code] || null,
    });
  });
  const outPath = path.join(__dirname, '..', '..', 'docs', 'course-tracker.yml');
  fs.writeFileSync(outPath, header + blocks.join('\n\n') + '\n');
  console.log(`wrote ${courses.length} courses to docs/course-tracker.yml`);
  console.log(`  legacy-live seeded: ${blocks.filter(b => /version: "/.test(b)).length} | basecamp seeded: ${Object.keys(bc).length}`);
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
