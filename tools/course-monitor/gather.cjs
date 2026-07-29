#!/usr/bin/env node
/**
 * course-monitor/gather.cjs — four-way course-status reconciliation (v1, read-only).
 *
 * Joins, per course:
 *   - NEW-APP INTENT   Supabase `courses` (status, new_app_status, legacy_app_status, seed_count, export_ready, version)
 *   - LEGACY REALITY   ssh ssi@apidev … compare-courses.rb  (repo/stage/prod version + published? + in-sync?)
 *   - HUMAN TRACKING   Basecamp "Creu Cyrsiau" card -> pipeline column
 * Emits a markdown table + an ANOMALIES list. No writes anywhere.
 *
 * Legacy id built the same way as production-api.cjs buildCourseConfigsId():
 *   `${knownLegacy2}-${targetLegacy2}[-${variant}]`
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const { execFileSync } = require('child_process');
const { createClient } = require('@supabase/supabase-js');
const svc = require('../../services/language-code-service.cjs');

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const L2 = svc.LEGACY_TO_STANDARD || {};             // {spa:'es', eng:'en', ...} 3-letter -> 2-letter legacy

// course_code `{target[_variant]}_for_{known[_variant]}` -> legacy id `known2-target2[-variant]`
function toLegacyId(code) {
  const [targetSide, knownSide] = code.split('_for_');
  if (!knownSide) return null;
  const parse = (side) => { const t = side.split('_'); return { base: t[0], variant: t.slice(1).join('-') || null }; };
  const tgt = parse(targetSide), knw = parse(knownSide);
  const k2 = L2[knw.base], t2 = L2[tgt.base];
  if (!k2 || !t2) return null;
  const knownPart = knw.variant ? `${k2}-${knw.variant}` : k2;
  const targetPart = tgt.variant ? `${t2}-${tgt.variant}` : t2;
  return `${knownPart}-${targetPart}`;
}

const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');

async function getCourses() {
  const rows = [];
  for (let f = 0; ; f += 1000) {
    const { data, error } = await sb.from('courses')
      .select('course_code,display_name,learner_display_name,known_lang,target_lang,variant_label,status,new_app_status,legacy_app_status,seed_count,export_ready,version,content_version,released_at')
      .range(f, f + 999);
    if (error) throw error;
    rows.push(...data); if (data.length < 1000) break;
  }
  return rows;
}

function getLegacy() {
  // login shell so rvm ruby is on PATH; parse the ascii table into {id: {...}}
  let out;
  try {
    out = execFileSync('ssh', ['-o', 'ConnectTimeout=15', '-o', 'BatchMode=yes', 'ssi@apidev',
      'bash -lc "cd ~/course-materials/course-configs/Courses && git pull --quiet; cd ~/course-tool && ./compare-courses.rb"'],
      { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 180000 });
  } catch (e) { return { ok: false, error: e.message.split('\n')[0], byId: {} }; }
  const byId = {};
  for (const raw of out.split('\n')) {
    const line = stripAnsi(raw);
    if (!line.startsWith('|') || /^\|\s*id\s*\|/.test(line) || /repo_ver/.test(line)) continue;
    const c = line.split('|').map(s => s.trim());
    if (c.length < 12 || !c[1]) continue;
    byId[c[1]] = { repo_ver: c[2], repo_stat: c[3], stage_ver: c[5], stage_stat: c[6], stage_ok: c[8], prod_ver: c[9], prod_stat: c[10], prod_ok: c[12] };
  }
  return { ok: true, byId };
}

function getBasecamp() {
  // Creu Cyrsiau card table columns -> {course_code: columnName} via the alias table.
  const COLS = { '7038571697': 'Triage', '7038571698': 'Not now', '7038571700': 'Content-check', '7038571702': 'Ready-stage', '9557920015': 'On-stage', '9568174940': 'Ready-live', '9557930593': 'Live' };
  const alias = require('./basecamp-aliases.json');
  const byCourse = {}; const unmapped = [];
  for (const [id, name] of Object.entries(COLS)) {
    let out;
    try { out = execFileSync('basecamp', ['cards', 'list', '--column', id, '-p', '26277678', '--json'], { encoding: 'utf8', env: { ...process.env, PATH: `${process.env.HOME}/.local/bin:${process.env.PATH}` }, maxBuffer: 8 * 1024 * 1024 }); }
    catch { continue; }
    let j; try { j = JSON.parse(out); } catch { continue; }
    for (const card of (j.data || j.cards || [])) {
      const title = (card.title || '').toLowerCase().trim();
      if (title in alias) { if (alias[title]) byCourse[alias[title]] = name; }
      else unmapped.push(card.title);
    }
  }
  return { byCourse, unmapped };
}

(async () => {
  const [courses, legacy, bc] = [await getCourses(), getLegacy(), getBasecamp()];
  const bcByCourse = bc.byCourse;
  console.log(`# Course status snapshot — ${courses.length} courses | legacy ssh: ${legacy.ok ? 'OK' : 'SKIPPED (' + legacy.error + ')'} | basecamp matched: ${Object.keys(bcByCourse).length}${bc.unmapped.length ? ' | UNMAPPED cards: ' + bc.unmapped.join(', ') : ''}\n`);

  const rows = [], anomalies = [], unmatchedLegacy = new Set(Object.keys(legacy.byId));
  let staleLegacyDb = 0;
  for (const c of courses) {
    const legId = toLegacyId(c.course_code);
    const lg = legId ? legacy.byId[legId] : null;
    if (lg) unmatchedLegacy.delete(legId);
    const bcCol = bcByCourse[c.course_code] || null;
    rows.push({ code: c.course_code, legId: legId || '?', new_app: c.new_app_status || '', legacy_intent: c.legacy_app_status || '', seeds: c.seed_count ?? '', exp: c.export_ready ? 'Y' : '', prod: lg ? (lg.prod_stat || (lg.prod_ver ? 'v' + lg.prod_ver : '—')) : (legId ? '—' : '?'), stage: lg ? (lg.stage_ver || '—') : '', sync: lg ? (lg.prod_ok === 'Yes' && lg.stage_ok === 'Yes' ? 'ok' : 'DRIFT') : '', bc: bcCol || '' });

    // anomalies — keyed on RELIABLE signals (board column + legacy prod reality; DB legacy_app_status is stale)
    const prodLive = lg && /published/i.test(lg.prod_stat || '');
    const inProgressCols = ['Triage', 'Content-check', 'Ready-stage', 'Not now'];
    if (bcCol === 'Live' && lg && !prodLive)
      anomalies.push(`${c.course_code}: board=Live but legacy prod is not published (prod=${lg.prod_stat || 'none'}, stage=${lg.stage_ver || '—'}) — board ahead of reality`);
    if (prodLive && bcCol && inProgressCols.includes(bcCol))
      anomalies.push(`${c.course_code}: LIVE on legacy (prod v${lg.prod_ver}) but board still "${bcCol}" — board behind reality`);
    if (lg && (lg.stage_ver || lg.prod_ver) && (lg.prod_ok !== 'Yes' || lg.stage_ok !== 'Yes'))
      anomalies.push(`${c.course_code}: legacy version drift — repo ${lg.repo_ver || '—'} / stage ${lg.stage_ver || '—'} / prod ${lg.prod_ver || '—'}`);
    if (prodLive && /^(not_available|)$/.test(c.legacy_app_status || '')) staleLegacyDb++;
  }

  rows.sort((a, b) => a.code.localeCompare(b.code));
  console.log('| course_code | legacyId | new_app | legacy(DB) | seeds | exp | prod | stage | sync | basecamp |');
  console.log('|---|---|---|---|---|---|---|---|---|---|');
  for (const r of rows) console.log(`| ${r.code} | ${r.legId} | ${r.new_app} | ${r.legacy_intent} | ${r.seeds} | ${r.exp} | ${r.prod} | ${r.stage} | ${r.sync} | ${r.bc} |`);

  console.log(`\n## Anomalies (${anomalies.length})`);
  for (const a of anomalies) console.log('- ' + a);
  if (staleLegacyDb) console.log(`\n> systemic: ${staleLegacyDb} courses are live on legacy prod but their DB \`legacy_app_status\` is not_available/empty — the DB field is not maintained (use compare-courses + our tracker as truth).`);
  if (unmatchedLegacy.size) console.log(`\n## Legacy ids with no new-app course (${unmatchedLegacy.size}): ${[...unmatchedLegacy].sort().join(', ')}`);
  const noBc = rows.filter(r => !r.bc && /live|published|stage/i.test(r.legacy_intent + r.prod)).length;
  console.log(`\n_debug: ${rows.filter(r => r.legId === '?').length} courses with unresolved legacy id; ${rows.filter(r => r.bc).length} matched to a Basecamp card_`);
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
