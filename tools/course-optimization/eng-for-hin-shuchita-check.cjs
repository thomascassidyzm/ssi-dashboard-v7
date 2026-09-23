#!/usr/bin/env node
// eng_for_hin — the substitute for Shuchita's eye (job #891·H, Kai, 2026-09-23).
//
// Runs every rule in eng-for-hin-shuchita-rulebook.cjs over Hindi/English rows and reports hits
// with the rule, her precedent and a proposed fix. Deterministic rules run always; judged rules run
// with --judge (a Claude CLI call per seed, never the SDK — CLAUDE.md). Nothing here writes to the
// database; applying a fix is a separate, identified sweep.
//
// MODES
//   --calibrate                 run the deterministic rules over her own before/after pairs
//                               (eng-for-hin-shuchita-calibration.json): every rule must flag at
//                               least one "before" it has a precedent for and pass the "after".
//                               Prints per-rule coverage. This is the test of the checker itself.
//   --seeds 15,20,21            read the live seed, LEGOs and phrases for those seeds
//   --since 2026-09-22T10:20Z   every row created/updated since that instant (rows, not seeds)
//   --unapproved                every row of every seed with approved_at IS NULL
//   --input rows.json           a batch not yet in the DB: [{seed, id, role, known, target}] —
//                               the shape of the 92-cut LEGO batch (d/04b765c9) and the gendered
//                               phrase design (#883); a top-level {rows:[…]} or {legos:[…],phrases:[…]}
//                               is accepted too.
//   --judge                     add the judged rules (claude --print, one call per seed)
//   --out hits.json             write the hits (default: stdout summary only)
//   --md hits.md                write a mobile-friendly markdown report
//
// Exit code: 0 clean, 1 hits, 2 error. A seed is "clean" only with zero deterministic hits AND
// (if --judge) zero judged hits — the re-approval bar in the brief.
//
// THE JUDGED PASS (fixed 2026-09-23, job #900·H, after Astra's cold verify of #891):
//   - a judge reply that is not {"hits":[…]} — empty {}, no JSON, bad JSON, hits missing or not
//     an array — is a J-ERROR hit on that seed, never a clean seed. Silence is not approval.
//   - each judge call carries CROSS-SEED CONTEXT: every other row in the course whose Hindi
//     matches a row of this seed (same prompt, different English elsewhere → a ZUT / fidelity
//     clash, e.g. seed 348 "क्या होने वाला है → what was going to happen" against seed 201 "… →
//     what is going to happen") and every row whose English matches (same answer, different
//     Hindi elsewhere — allowed, but the judge should see it). Built from the whole course when
//     the DB is reachable; from the batch alone under --input without a DB.

'use strict';
const path = require('path');
const fs = require('fs');
const { RULES, runDeterministic, judgedRules } = require('./eng-for-hin-shuchita-rulebook.cjs');

const COURSE = 'eng_for_hin';
const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const has = (name) => args.includes(name);

// ---------------------------------------------------------------------------------------------
// Row sources
// ---------------------------------------------------------------------------------------------
function normaliseInput(json) {
  let rows = Array.isArray(json) ? json : (json.rows || []);
  if (!rows.length && (json.legos || json.phrases)) {
    rows = [
      ...(json.legos || []).map(l => ({ seed: l.seed || l.seed_number, id: l.lego_id || l.id, role: 'lego', known: l.known ?? l.known_text, target: l.target ?? l.target_text })),
      ...(json.phrases || []).map(p => ({ seed: p.seed || p.seed_number, id: p.id, role: p.role || p.phrase_role || 'phrase', known: p.known ?? p.known_text, target: p.target ?? p.target_text })),
    ];
  }
  return rows.map(r => ({ seed: r.seed ?? r.seed_number, id: r.id || r.lego_id || r.phrase_id, role: r.role || r.phrase_role || 'phrase', known: r.known ?? r.known_text, target: r.target ?? r.target_text }));
}

async function supabaseClient() {
  require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
  const { createClient } = require('@supabase/supabase-js');
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY missing (.env)');
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
}

async function pageAll(q, pageSize = 1000) {
  const out = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await q.range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    out.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return out;
}

async function rowsForSeeds(sb, seeds) {
  const seedsRows = await pageAll(sb.from('course_seeds').select('seed_number, known_text, target_text, approved_at').eq('course_code', COURSE).in('seed_number', seeds).order('seed_number'));
  const legos = await pageAll(sb.from('course_legos').select('lego_id, seed_number, lego_index, type, known_text, target_text').eq('course_code', COURSE).in('seed_number', seeds).order('seed_number').order('lego_index'));
  const phrases = await pageAll(sb.from('course_practice_phrases').select('id, seed_number, lego_index, position, phrase_role, known_text, target_text').eq('course_code', COURSE).in('seed_number', seeds).order('seed_number').order('lego_index').order('position'));
  return [
    ...seedsRows.map(s => ({ seed: s.seed_number, id: `S${String(s.seed_number).padStart(4, '0')}`, role: 'seed', known: s.known_text, target: s.target_text, approved_at: s.approved_at })),
    ...legos.map(l => ({ seed: l.seed_number, id: l.lego_id, role: 'lego', known: l.known_text, target: l.target_text })),
    ...phrases.map(p => ({ seed: p.seed_number, id: p.id, role: p.phrase_role === 'component' ? 'component' : p.phrase_role, known: p.known_text, target: p.target_text })),
  ];
}

async function rowsSince(sb, since) {
  const legos = await pageAll(sb.from('course_legos').select('lego_id, seed_number, known_text, target_text, updated_at').eq('course_code', COURSE).gt('updated_at', since).order('seed_number'));
  const phrases = await pageAll(sb.from('course_practice_phrases').select('id, seed_number, phrase_role, known_text, target_text, updated_at').eq('course_code', COURSE).gt('updated_at', since).order('seed_number'));
  const seeds = await pageAll(sb.from('course_seeds').select('seed_number, known_text, target_text, updated_at').eq('course_code', COURSE).gt('updated_at', since).order('seed_number'));
  return [
    ...seeds.map(s => ({ seed: s.seed_number, id: `S${String(s.seed_number).padStart(4, '0')}`, role: 'seed', known: s.known_text, target: s.target_text })),
    ...legos.map(l => ({ seed: l.seed_number, id: l.lego_id, role: 'lego', known: l.known_text, target: l.target_text })),
    ...phrases.map(p => ({ seed: p.seed_number, id: p.id, role: p.phrase_role === 'component' ? 'component' : p.phrase_role, known: p.known_text, target: p.target_text })),
  ];
}

async function unapprovedSeeds(sb) {
  const seeds = await pageAll(sb.from('course_seeds').select('seed_number').eq('course_code', COURSE).is('approved_at', null).order('seed_number'));
  return seeds.map(s => s.seed_number);
}

// ---------------------------------------------------------------------------------------------
// Calibration
// ---------------------------------------------------------------------------------------------
function calibrate() {
  const fx = JSON.parse(fs.readFileSync(path.join(__dirname, 'eng-for-hin-shuchita-calibration.json'), 'utf8'));
  // Four pairs are her note text mis-aligned as an "after" line ("and CPM सकता हूँ", "later CMP में →
  // on should be one phrase …"): her shorthand for a component row, not a line she wrote. They are
  // kept in the fixture, marked note_fragment, and excluded here so a false "after" hit is a real one.
  const pairs = fx.pairs.filter(p => !p.note_fragment);
  const excluded = fx.pairs.length - pairs.length;
  const per = {};
  for (const r of RULES.filter(r => r.kind === 'deterministic')) per[r.id] = { rule: r.id, precedentSeeds: [...new Set(r.precedent.map(p => p.seed))], beforeFlagged: 0, afterFlagged: 0, beforeOnPrecedentSeed: 0, afterFalse: [] };
  let anyBefore = 0;
  for (const p of pairs) {
    const b = runDeterministic({ known: p.before.known, target: p.before.target, role: p.kind === 'lego' ? 'lego' : 'phrase', seed: p.seed });
    const a = runDeterministic({ known: p.after.known, target: p.after.target, role: p.kind === 'lego' ? 'lego' : 'phrase', seed: p.seed });
    if (b.length) anyBefore++;
    for (const h of b) { per[h.rule].beforeFlagged++; if (per[h.rule].precedentSeeds.includes(p.seed)) per[h.rule].beforeOnPrecedentSeed++; }
    for (const h of a) { per[h.rule].afterFlagged++; if (per[h.rule].afterFalse.length < 5) per[h.rule].afterFalse.push({ seed: p.seed, known: p.after.known, target: p.after.target, message: h.message }); }
  }
  const report = { pairs: pairs.length, excludedNoteFragments: excluded, beforeLinesFlaggedByAnyRule: anyBefore, beforeCoveragePct: Math.round(1000 * anyBefore / pairs.length) / 10, rules: Object.values(per) };
  return report;
}

function printCalibration(rep) {
  console.log(`Calibration: ${rep.pairs} before/after pairs from her notes (${rep.excludedNoteFragments} note fragments excluded); deterministic rules flag ${rep.beforeLinesFlaggedByAnyRule} of the "before" lines (${rep.beforeCoveragePct}%). The rest of her corrections are judged rules (word order, calque, fidelity) — see --judge.`);
  console.log('rule'.padEnd(24), 'before✓'.padEnd(9), 'on-own-seed'.padEnd(12), 'after✗ (false positives)');
  for (const r of rep.rules) console.log(r.rule.padEnd(24), String(r.beforeFlagged).padEnd(9), String(r.beforeOnPrecedentSeed).padEnd(12), String(r.afterFlagged), r.afterFalse.length ? '  e.g. seed ' + r.afterFalse[0].seed + ': ' + r.afterFalse[0].message : '');
}

// ---------------------------------------------------------------------------------------------
// Judged rules via the Claude CLI (never the SDK)
// ---------------------------------------------------------------------------------------------
const normText = (t) => String(t || '').toLowerCase().replace(/[।.,!?;:"'\u2018\u2019\u201c\u201d()\-]/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * Cross-seed context for the judge: rows from OTHER seeds that share a Hindi prompt or an English
 * answer with a row of this seed. Same Hindi → different English elsewhere is the fidelity clash
 * the single-seed judge could never see (seed 348 vs seed 201). Pure; tested.
 */
function crossSeedContext(seedRows, courseRows, { maxPerRow = 6 } = {}) {
  const seed = seedRows.length ? seedRows[0].seed : null;
  const byKnown = new Map(), byTarget = new Map();
  for (const r of courseRows) {
    if (r.seed === seed || r.role === 'component') continue;
    const k = normText(r.known), t = normText(r.target);
    if (k) (byKnown.get(k) || byKnown.set(k, []).get(k)).push(r);
    if (t) (byTarget.get(t) || byTarget.set(t, []).get(t)).push(r);
  }
  const out = [];
  const seen = new Set();
  for (const r of seedRows) {
    if (r.role === 'component') continue;
    const k = normText(r.known), t = normText(r.target);
    const sameKnown = (byKnown.get(k) || []).filter(o => normText(o.target) !== t);
    const sameTarget = (byTarget.get(t) || []).filter(o => normText(o.known) !== k);
    for (const [kind, list] of [['same-hindi-different-english', sameKnown], ['same-english-different-hindi', sameTarget]]) {
      for (const o of list.slice(0, maxPerRow)) {
        const key = `${r.id}|${o.id}|${kind}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ forRow: r.id, kind, seed: o.seed, id: o.id, role: o.role, known: o.known, target: o.target });
      }
    }
  }
  return out;
}

function judgePrompt(seed, rows, context) {
  const rules = judgedRules().map(r => `## ${r.id} — ${r.title}\n${r.note || ''}\nHer precedents:\n${r.precedent.map(p => `- seed ${p.seed}: ${p.before ? `BEFORE ${p.before} → ` : ''}AFTER ${p.after}${p.note ? ` (${p.note})` : ''}`).join('\n')}`).join('\n\n');
  const lines = rows.map(r => `${r.id} [${r.role}] ${r.known} → ${r.target}`).join('\n');
  const ctx = context.length
    ? `\n\nELSEWHERE IN THE COURSE (other seeds sharing a Hindi prompt or an English answer with a row above — a SAME Hindi prompt reaching a DIFFERENT English answer is a J-FIDELITY clash; the same English under different Hindi is allowed):\n${context.map(c => `${c.forRow} ↔ seed ${c.seed} ${c.id} [${c.kind}] ${c.known} → ${c.target}`).join('\n')}`
    : '\n\nELSEWHERE IN THE COURSE: no other seed shares a Hindi prompt or an English answer with these rows.';
  return `You are standing in for Shuchita, the native Hindi proofreader of the SaySomethingin course "English for Hindi speakers" (Hindi is the KNOWN prompt, English is the TARGET answer). She is no longer available. Judge the rows of seed ${seed} below ONLY against the rules she actually made, listed with her own precedents. Do not invent rules. Where her intent would be ambiguous, say "ambiguous" rather than ruling.\n\n${rules}\n\nROWS (id [role] Hindi → English):\n${lines}${ctx}\n\nReply with JSON only: {"hits":[{"id":"<row id>","rule":"<rule id>","message":"<one line: what is wrong, in her terms>","proposed":{"known":"<Hindi, or null>","target":"<English, or null>"},"confidence":"high|medium|ambiguous"}]}. An empty hits array means the seed is clean under her judged rules. Always include the "hits" key, even when it is empty.`;
}

/**
 * The only way a judge reply counts as a verdict is {"hits":[…]} with hits an array. {} , prose,
 * truncated JSON, or hits of any other shape is an error — the seed is NOT clean. Pure; tested.
 */
function parseJudgeReply(seed, out) {
  const text = String(out || '');
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return { seed, error: 'no JSON in judge reply', raw: text.slice(0, 2000) };
  let j;
  try { j = JSON.parse(m[0]); } catch (e) { return { seed, error: 'bad JSON in judge reply', raw: text.slice(0, 2000) }; }
  if (!j || typeof j !== 'object' || !Array.isArray(j.hits)) return { seed, error: 'judge reply has no "hits" array (an empty {} is not a verdict)', raw: text.slice(0, 2000) };
  return { seed, hits: j.hits };
}

function judgeSeed(seed, rows, context = []) {
  const { execFileSync } = require('child_process');
  const prompt = judgePrompt(seed, rows, context);
  // The estate's nested-CLI convention: services/shared/claude-config.cjs pins the config dir and
  // the OAuth token (a worker's own $CLAUDE_CONFIG_DIR is not logged in for nested calls).
  const { claudeEnv } = require('../../services/shared/claude-config.cjs');
  const env = claudeEnv();
  const homes = [process.env.HOME, (() => { try { return require('os').userInfo().homedir; } catch (e) { return null; } })()].filter(Boolean);
  const candidates = [process.env.CLAUDE_BIN, ...homes.map(h => path.join(h, '.local', 'bin', 'claude'))].filter(Boolean);
  const bin = candidates.find(c => fs.existsSync(c)) || 'claude';
  let out;
  try {
    out = execFileSync(bin, ['--print', '--output-format', 'text'], { input: prompt, env, maxBuffer: 8 * 1024 * 1024, timeout: 300000 }).toString();
  } catch (e) {
    return { seed, error: 'judge call failed: ' + (e.message || String(e)).split('\n')[0], raw: '' };
  }
  return parseJudgeReply(seed, out);
}

/** Every non-component row of the course, for cross-seed context (one read, ~13k rows). */
async function courseRows(sb) {
  const legos = await pageAll(sb.from('course_legos').select('lego_id, seed_number, known_text, target_text').eq('course_code', COURSE).order('seed_number'));
  const phrases = await pageAll(sb.from('course_practice_phrases').select('id, seed_number, phrase_role, known_text, target_text').eq('course_code', COURSE).neq('phrase_role', 'component').order('seed_number'));
  return [
    ...legos.map(l => ({ seed: l.seed_number, id: l.lego_id, role: 'lego', known: l.known_text, target: l.target_text })),
    ...phrases.map(p => ({ seed: p.seed_number, id: p.id, role: p.phrase_role, known: p.known_text, target: p.target_text })),
  ];
}

// ---------------------------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------------------------
function toMarkdown(result) {
  const L = [];
  L.push(`# eng_for_hin — Shuchita-rulebook check`, '', `Rows checked: ${result.rowsChecked} across ${result.seeds.length} seed(s). Deterministic hits: ${result.hits.filter(h => h.kind === 'deterministic').length}. Judged hits: ${result.hits.filter(h => h.kind === 'judged').length}.`, '');
  const bySeed = {};
  for (const h of result.hits) (bySeed[h.seed] = bySeed[h.seed] || []).push(h);
  for (const seed of result.seeds) {
    const hs = bySeed[seed] || [];
    L.push(`## Seed ${seed} — ${hs.length ? hs.length + ' hit(s)' : 'clean'}`);
    for (const h of hs) {
      L.push(`- **${h.id}** (${h.role}) ${h.known} → ${h.target}`);
      L.push(`  - ${h.kind === 'judged' ? 'JUDGED' : h.severity.toUpperCase()} · ${h.rule}: ${h.message}`);
      if (h.precedent) L.push(`  - her precedent, seed ${h.precedent.seed}: ${h.precedent.before ? h.precedent.before + ' → ' : ''}${h.precedent.after}`);
      if (h.proposed && (h.proposed.known || h.proposed.target)) L.push(`  - proposed: ${h.proposed.known ? h.proposed.known : ''}${h.proposed.known && h.proposed.target ? ' → ' : ''}${h.proposed.target ? h.proposed.target : ''}`);
    }
    L.push('');
  }
  return L.join('\n');
}

async function main() {
  if (has('--calibrate')) {
    const rep = calibrate();
    printCalibration(rep);
    if (opt('--out')) fs.writeFileSync(opt('--out'), JSON.stringify(rep, null, 1));
    const bad = rep.rules.filter(r => r.afterFlagged > 0 && r.beforeFlagged === 0);
    process.exit(bad.length ? 1 : 0);
  }

  let rows = [];
  let sb = null;
  if (opt('--input')) {
    rows = normaliseInput(JSON.parse(fs.readFileSync(opt('--input'), 'utf8')));
    if (has('--judge')) { try { sb = await supabaseClient(); } catch (e) { console.error('note: no DB for cross-seed context (' + e.message + '); judging against the batch alone'); } }
  } else {
    sb = await supabaseClient();
    if (opt('--seeds')) rows = await rowsForSeeds(sb, opt('--seeds').split(',').map(Number));
    else if (opt('--since')) rows = await rowsSince(sb, opt('--since'));
    else if (has('--unapproved')) rows = await rowsForSeeds(sb, await unapprovedSeeds(sb));
    else { console.error('need --calibrate | --seeds | --since | --unapproved | --input'); process.exit(2); }
  }

  const seeds = [...new Set(rows.map(r => r.seed))].sort((a, b) => a - b);
  const hits = [];
  for (const r of rows) for (const h of runDeterministic(r)) hits.push({ kind: 'deterministic', seed: r.seed, id: r.id, role: r.role, known: r.known, target: r.target, ...h });
  if (has('--judge')) {
    // cross-seed context comes from the whole course when we can read it, plus the batch itself
    // (a batch row not yet in the DB still clashes with another batch row)
    const course = sb ? await courseRows(sb) : [];
    const pool = [...course.filter(c => !rows.some(r => r.id === c.id)), ...rows];
    for (const seed of seeds) {
      const seedRows = rows.filter(r => r.seed === seed && r.role !== 'component');
      const j = judgeSeed(seed, seedRows, crossSeedContext(seedRows, pool));
      if (j.error || !Array.isArray(j.hits)) { hits.push({ kind: 'judged', seed, id: '-', role: '-', known: '', target: '', rule: 'J-ERROR', message: j.error + ': ' + (j.raw || '').slice(0, 300), proposed: null }); continue; }
      for (const h of (j.hits || [])) {
        const row = rows.find(r => r.id === h.id) || {};
        const rule = RULES.find(x => x.id === h.rule);
        hits.push({ kind: 'judged', seed, id: h.id, role: row.role || '-', known: row.known || '', target: row.target || '', rule: h.rule, title: rule ? rule.title : h.rule, severity: 'flag', confidence: h.confidence, message: h.message, proposed: h.proposed || null, precedent: rule ? rule.precedent[0] : null });
      }
    }
  }
  const result = { course: COURSE, ranAt: new Date().toISOString(), rowsChecked: rows.length, seeds, hits, cleanSeeds: seeds.filter(s => !hits.some(h => h.seed === s)) };
  if (opt('--out')) fs.writeFileSync(opt('--out'), JSON.stringify(result, null, 1));
  if (opt('--md')) fs.writeFileSync(opt('--md'), toMarkdown(result));
  console.log(`${rows.length} rows, ${seeds.length} seeds, ${hits.length} hit(s); clean seeds: ${result.cleanSeeds.join(' ') || 'none'}`);
  for (const h of hits) console.log(`  seed ${h.seed} ${h.id} [${h.kind}/${h.severity || 'flag'}] ${h.rule}: ${h.message}`);
  process.exit(hits.length ? 1 : 0);
}

if (require.main === module) main().catch(e => { console.error('CHECK FAILED:', e.message); process.exit(2); });
module.exports = { calibrate, normaliseInput, toMarkdown, parseJudgeReply, crossSeedContext, judgePrompt };
