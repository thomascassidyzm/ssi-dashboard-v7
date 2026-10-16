#!/usr/bin/env node
'use strict';
// tools/course-optimization/deu-verb-position-2026-10-16.cjs — deu_for_eng job #246: German verb position in practice
// phrases (Kai, 16 Oct 2026). A glued LEGO ('warten auf', 'Zeit verbringen', 'hast du gehört von') was dropped into
// phrases where German splits it, so the infinitive stood before its objects. Kai's ruling: keep the LEGO, fix the
// phrases. Verdicts, row by row, are in ./deu-verb-position-2026-10-16.data.cjs; the detector below is the rule as code
// (it only FINDS candidates — every row in the data was read in full before it went in).
//
// Writes go ONLY through Popty (edit-batch door, previewed first; the one audio route). Same make-before-break shape as
// deu-could-rule-2026-10-14.cjs, whose plan / zutGate / clipAsks / editOps this reuses.
//
//   node …/deu-verb-position-2026-10-16.cjs <dump.json>                 # plan + ZUT gate + defect count + route dry run
//   CHECK=1 node … <dump.json>                                          # only the defect count (before/after evidence)
//   RENDER=1 MAX_CHARS=10000 node … <dump.json>                         # + the real renders (stops above MAX_CHARS)
//   RENDER=1 APPLY=1 [APPLY_CONFIRM=1] node … <dump.json>               # + edit-batch preview / apply
const fs = require('fs');
const path = require('path');
const base = require('./deu-could-rule-2026-10-14.cjs');
const DATA = require('./deu-verb-position-2026-10-16.data.cjs');

const COURSE = 'deu_for_eng';
const AGENT = 'deu-verb-position (job #246)';
const PURPOSE = 'job #246 deu_for_eng verb position in phrases (Kai 16 Oct)';
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
const sid = (p) => String(p.id).split(':')[1];

// ── THE RULE AS CODE ──────────────────────────────────────────────────────────────────────────────────────────────
// Candidate finders for the families read in job #246. Each returns the family name when the German is mis-ordered.
const MODAL = '(?:werde|wirst|wird|werden|sollte|sollst|soll|muss|musst|müssen|will|willst|wollen|kann|kannst|können|möchte|möchten|könnte|könnten)';
const FAMILIES = [
  // an infinitive that takes an object stands LAST in the main clause: "Ich werde auf dich warten", never "werde warten auf dich"
  ['modal + warten auf + object', new RegExp(`\\b${MODAL}\\b[^,.?]*\\bwarten auf\\b\\s+\\S`, 'i')],
  // the participle closes the clause: "Hast du von ihm gehört", never "Hast du gehört von ihm"
  ['gehört von + object', /\bgehört von\b/i],
  // 'warum bitten' is not German: bitten needs its um-object (um Hilfe bitten) and an es/zu frame
  ['warum bitten', /\bwarum bitten\b/i],
  // the zu-infinitive / infinitive of 'Zeit verbringen' stands after its adverbials
  ['Zeit verbringen + adverbial', /\bZeit verbringen (?:zu können )?(?:hier|zusammen|mit)\b(?!\s*dir\W*$)|\bZeit verbringen zusammen\b/i],
  // beantworten is transitive: 'wie man beantworten sollte' has no object
  ['beantworten without object', /\bwie man beantworten sollte\b/i],
  // a modal governs the plain infinitive, never the zu-infinitive of 'leichter anzufühlen'
  ['modal + leichter anzufühlen', new RegExp(`\\b${MODAL}\\b[^,.?]*\\bleichter anzufühlen\\b`, 'i')],
];
/** The families a German phrase text breaks (empty = none found). Pure. */
function verbPositionFamilies(german) { return FAMILIES.filter(([, re]) => re.test(german || '')).map(([n]) => n); }
/** Every played-role phrase breaking a family. Pure. */
function ruleDefects(db) {
  return db.phrases.filter((p) => p.phrase_role !== 'component' && verbPositionFamilies(p.target_text).length).map(sid);
}

const plan = (db, tranches = [1]) => base.plan(db, DATA.ROWS, tranches);

async function post(url, body) {
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body), signal: AbortSignal.timeout(180000) });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  } catch (e) { return { status: 0, body: { ok: false, error: String((e.cause && e.cause.code) || e.name) } }; }
}

async function main() {
  const dumpPath = process.argv[2];
  if (!dumpPath) throw new Error('usage: <dump.json from course-dump-readonly-2026-10-14.cjs>');
  const RENDER = process.env.RENDER === '1', APPLY = process.env.APPLY === '1', MAX = +(process.env.MAX_CHARS || 10000);
  const db = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));
  const defects = ruleDefects(db);
  console.log(`families found in played phrases: ${defects.length} rows`);
  if (process.env.CHECK === '1') return;
  const p = plan(db);
  const zut = base.zutGate(db, p);
  const log = { job: '#246', started: new Date().toISOString(), zut, defectsBefore: defects.length, plan: p };
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const save = (n) => { const f = evidencePath(`tools/course-optimization/deu-verb-position-2026-10-16/${n}-${log.started.replace(/[:.]/g, '-')}.json`); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(log, null, 2)); return f; };
  console.log(`plan: ${p.phrases.length} phrases, ${p.held.length} held by gates; ZUT strict ${zut.before} → ${zut.after}`);
  for (const h of p.held) console.log('  HELD', h.id, h.rule, h.why);

  const asks = base.clipAsks(p);
  log.asks = []; let chars = 0;
  for (const a of asks) {
    const d = await post(`${POPTY}/api/audio/render`, { courseCode: COURSE, role: a.role, text: a.text, purpose: PURPOSE, ...(a.legoId ? { legoId: a.legoId } : {}), dryRun: true });
    const ok = d.status === 200 && d.body.ok;
    const w = ok && d.body.source !== 'library' ? (d.body.wouldSpendChars || a.text.length) : 0;
    chars += w;
    log.asks.push({ ...a, dry: { status: d.status, source: d.body.source, voiceId: d.body.voiceId, chars: w, error: ok ? undefined : d.body } });
  }
  const refusedDry = log.asks.filter((a) => a.dry.status !== 200 || a.dry.error);
  console.log(`route dry run: ${asks.length} asks, ${log.asks.filter((a) => a.dry.source === 'library').length} from library, ${chars} chars to render, ${refusedDry.length} refused`);
  for (const a of refusedDry) console.log('  REFUSED (dry)', a.role, JSON.stringify(a.text), a.dry.status, JSON.stringify(a.dry.error).slice(0, 200));
  if (!RENDER) return console.log('dry log:', save('dry'));
  if (chars > MAX) { console.log(`STOP: ${chars} chars > MAX_CHARS ${MAX}; nothing rendered`); return console.log(save('stopped')); }

  const refused = new Set();
  for (const a of log.asks) {
    if (a.dry.status !== 200 || a.dry.error) { a.ids.forEach((i) => refused.add(i)); continue; }
    const r = await post(`${POPTY}/api/audio/render`, { courseCode: COURSE, role: a.role, text: a.text, purpose: PURPOSE, ...(a.legoId ? { legoId: a.legoId } : {}) });
    a.real = { status: r.status, source: r.body.source, audioId: r.body.audioId, charsSpent: r.body.charsSpent, error: r.status === 200 && r.body.ok ? undefined : r.body };
    if (a.real.error) { a.ids.forEach((i) => refused.add(i)); console.log('  REFUSED', a.role, JSON.stringify(a.text), r.status, JSON.stringify(r.body).slice(0, 200)); if (r.status === 402) break; }
  }
  log.charsSpent = log.asks.reduce((s, a) => s + ((a.real && a.real.charsSpent) || 0), 0);
  for (const c of p.phrases.filter((c) => refused.has(c.id))) p.held.push({ id: c.id, rule: 'A4', why: 'a clip it needs was refused by the audio route, so the text was not switched' });
  p.phrases = p.phrases.filter((c) => !refused.has(c.id));
  console.log(`rendered: ${log.charsSpent} chars spent; ${refused.size} rows refused a clip`);
  if (!APPLY) return console.log('render log:', save('rendered'));

  const clips = new Map(log.asks.filter((a) => a.real && a.real.audioId).map((a) => [`${a.role}\u0000${a.text}`, a.real.audioId]));
  const ops = base.editOps(p, clips);
  const prev = await post(`${POPTY}/api/production/${COURSE}/edit-batch`, { ops });
  log.preview = { status: prev.status, results: prev.body.results, error: prev.status === 200 ? undefined : prev.body };
  console.log(`edit-batch preview: HTTP ${prev.status}; ${(prev.body.results || []).length} results ${JSON.stringify(prev.body.error || '').slice(0, 300)}`);
  if (prev.status !== 200 || prev.body.ok === false) return console.log('preview refused:', save('preview-refused'));
  if (process.env.APPLY_CONFIRM !== '1') return console.log('preview only (APPLY_CONFIRM=1 to commit):', save('preview'));
  const res = await post(`${POPTY}/api/production/${COURSE}/edit-batch`, { ops, apply: true });
  log.applied = { status: res.status, eventId: res.body.event_id || null, undoFile: res.body.undo_file || null, undo: res.body.undo_ops || null, results: res.body.results, error: res.status === 200 ? undefined : res.body };
  log.touchedSeeds = [...new Set(p.phrases.map((c) => +c.id.slice(1, 5)))].sort((a, b) => a - b);
  console.log(`edit-batch APPLY: HTTP ${res.status}; event ${log.applied.eventId}; undo_file ${log.applied.undoFile} ${JSON.stringify(res.body.error || '').slice(0, 300)}`);
  console.log(`touched seeds: ${log.touchedSeeds.join(',')}`);
  console.log('log (undo inside):', save('applied'));
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { FAMILIES, verbPositionFamilies, ruleDefects, plan };
