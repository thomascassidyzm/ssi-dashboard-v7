#!/usr/bin/env node
'use strict';
// tools/course-optimization/deu-pp-order-2026-10-19.cjs — deu_for_eng job #158: Kai approved the STANDARD German order in
// seven USE phrases (a prepositional phrase BEFORE the clause-final verb, not after it: "mit der Arbeit fertig werden",
// never "fertig werden mit der Arbeit"). Each row is a rewrite of BOTH sides, checked against the canon rails: the phrase
// contains its LEGO on both sides (P17), every German word is already taught at that seed (P1/K29/K21), and no German or
// English phrase text is repeated in the course (K2). Seed 251 is NOT here: its "bis nachdem" LEGO is under separate
// investigation. Writes go ONLY through Popty: the one audio route (POST /api/audio/render) and the edit door
// (POST /api/production/:course/edit-batch, previewed first, undo kept). Nothing here touches the database; the
// before-state is a read-only dump from course-dump-readonly-2026-10-14.cjs and every op carries `expect` from it.
//
//   node …/deu-pp-order-2026-10-19.cjs <dump.json>                       # gates + route dry run
//   RENDER=1 node … <dump.json>                                          # + the real renders
//   RENDER=1 APPLY=1 node … <dump.json>                                  # + edit-batch preview
//   RENDER=1 APPLY=1 APPLY_CONFIRM=1 node … <dump.json>                  # + apply (audio.link in the same transaction)
const fs = require('fs');
const path = require('path');

const COURSE = 'deu_for_eng';
const AGENT = 'kai-deu-pp-order-158';
const PURPOSE = 'job #158 deu_for_eng standard order: PP before the clause-final verb (Kai 19 Oct)';
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');

// `pp` and `verb` name the prepositional phrase and the clause-final verb in the AFTER text; `fronted` rows put the
// phrase in front of the main clause because the LEGO ends the subordinate clause (an inserted phrase would split it).
const ROWS = [
  { id: 'S0295L02U01', before: ['I want to be finished with all this work before I go home tonight', 'Ich will fertig werden mit dieser Arbeit, bevor ich heute Abend nach Hause gehen will'],
    // "gehe" is taught nowhere before seed 295 (gehen/gehst/geht are), and "bevor ich gehen muss" is S0025L05
    after: ['I want to be finished with this work before I have to go home tonight', 'Ich will mit dieser Arbeit fertig werden, bevor ich heute Abend nach Hause gehen muss'], pp: 'mit dieser Arbeit', verb: 'fertig werden' },
  { id: 'S0195L02U04', before: ['I saw that the table is in the office with many things on it', 'Ich habe gesehen dass der Tisch im Büro ist mit vielen Sachen darauf'],
    after: ['I saw that the table with many things on it is in the office', 'Ich habe gesehen, dass der Tisch mit vielen Sachen darauf im Büro ist'], pp: 'mit vielen Sachen darauf', verb: 'ist' },
  { id: 'S0237L01U12', before: ['He wanted me to know why he was so nervous about everything that happened at the restaurant last week', 'Er wollte, dass ich weiß, warum er so nervös war über alles'],
    after: ['He wanted me to know why he was so nervous at work', 'Er wollte, dass ich weiß, warum er auf der Arbeit so nervös war'], pp: 'auf der Arbeit', verb: 'war' },
  { id: 'S0238L01U09', before: ['He wanted you to know that he is very grateful for the help', 'Er wollte, dass du weißt, dass er sehr dankbar ist für die Hilfe'],
    after: ['He wanted you to know that he is very grateful for the help', 'Er wollte, dass du weißt, dass er für die Hilfe sehr dankbar ist'], pp: 'für die Hilfe', verb: 'ist' },
  { id: 'S0246L01U10', before: ['I wanted her to help you but she was too busy making sure that everything was ready', 'Ich wollte, dass sie dir hilft, aber sie war zu beschäftigt damit, dass alles bereit war für den Test'],
    after: ['I wanted her to help you but she was too busy making sure that everything was ready for the test', 'Ich wollte, dass sie dir hilft, aber sie war zu beschäftigt damit, dass alles für den Test bereit war'], pp: 'für den Test', verb: 'bereit war' },
  { id: 'S0129L02U04', before: ['I wanted to say that you are doing so well at the pub', 'Ich wollte sagen, dass du es so gut machst in der Kneipe'],
    after: ['At the pub I wanted to say that you are doing so well', 'In der Kneipe wollte ich sagen, dass du es so gut machst'], pp: 'In der Kneipe', verb: 'machst', fronted: true },
  // the PP was already before the verb here; the defect is the missing commas round the wenn/dass clauses and "das" for "it"
  { id: 'S0250L02U17', before: ['We need something else here if we want it to work better for us now', 'Wir brauchen etwas anderes hier wenn wir wollen dass das jetzt besser für uns funktioniert'],
    after: ['We need something else here if we want it to work better for us now', 'Wir brauchen hier etwas anderes, wenn wir wollen, dass es jetzt besser für uns funktioniert'], pp: 'für uns', verb: 'funktioniert', commas: [', wenn', ', dass'] },
];

const norm = (s) => String(s || '').toLowerCase().normalize('NFC').replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim();
const seedOf = (id) => +id.match(/S(\d+)L/)[1];
const legoIndexOf = (id) => +id.match(/L(\d+)/)[1];

/** The rule as code: the prepositional phrase sits BEFORE the clause-final verb (index in the text). A row that
 *  already had it, or that carries its fix as commas, is judged on the commas. */
function standardOrder(row, text) {
  if (row.commas) return row.commas.every((c) => text.includes(c));
  const pp = text.indexOf(row.pp), v = text.lastIndexOf(row.verb);
  return pp >= 0 && v >= 0 && pp < v;
}

/** Gates over the dump. Returns problems ([] = clean). */
function gates(db) {
  const { taughtWordKeys, untaughtWords } = require('../../services/course-builder/lib/taught-words.cjs');
  const problems = [];
  for (const r of ROWS) {
    const sn = seedOf(r.id), li = legoIndexOf(r.id), pid = `${COURSE}:${r.id}`;
    const row = db.phrases.find((p) => p.id === pid);
    if (!row) { problems.push(`${r.id}: no such row`); continue; }
    if (row.known_text !== r.before[0] || row.target_text !== r.before[1]) problems.push(`${r.id}: live row has drifted from the dump this plan was written against`);
    const lego = db.legos.find((l) => l.seed_number === sn && l.lego_index === li);
    if (!norm(r.after[0]).includes(norm(lego.known_text))) problems.push(`${r.id}: known side lost its LEGO "${lego.known_text}"`);
    if (!norm(r.after[1]).includes(norm(lego.target_text))) problems.push(`${r.id}: target side lost its LEGO "${lego.target_text}"`);
    const texts = [];
    for (const s of db.seeds) if (s.seed_number <= sn) texts.push(s.target_text);
    for (const l of db.legos) if (l.seed_number < sn || (l.seed_number === sn && l.lego_index <= li)) { texts.push(l.target_text); for (const c of l.components || []) texts.push(c.target); }
    const un = untaughtWords(r.after[1], taughtWordKeys(texts, COURSE), COURSE);
    if (un.length) problems.push(`${r.id}: untaught at seed ${sn}: ${un.join(', ')}`);
    for (const p of db.phrases) {
      if (p.id === pid) continue;
      if (norm(p.target_text) === norm(r.after[1])) problems.push(`${r.id}: German already ${p.id}`);
      if (norm(p.known_text) === norm(r.after[0]) && norm(p.target_text) !== norm(r.after[1])) problems.push(`${r.id}: ZUT, ${p.id} has this English over "${p.target_text}"`);
    }
    if (!standardOrder(r, r.after[1])) problems.push(`${r.id}: after text is not in standard order`);
  }
  return problems;
}

/** One clip per slot whose words changed: known, target1, target2. */
function clipAsks() {
  const m = new Map();
  for (const r of ROWS) {
    if (r.after[0] !== r.before[0]) { const k = `known\0${r.after[0]}`; m.set(k, m.get(k) || { role: 'known', text: r.after[0] }); }
    for (const role of ['target1', 'target2']) { const k = `${role}\0${r.after[1]}`; m.set(k, m.get(k) || { role, text: r.after[1] }); }
  }
  return [...m.values()];
}

/** The edit-batch ops: text, then audio.link for every changed slot, in the same transaction. */
function editOps(clips) {
  const ops = [], links = [];
  for (const r of ROWS) {
    const key = { phrase_id: `${COURSE}:${r.id}` };
    ops.push({ op: 'phrase.update', ...key, set: { known_text: r.after[0], target_text: r.after[1] }, expect: { known_text: r.before[0], target_text: r.before[1] } });
    const link = (slot, text) => { const audio_id = clips.get(`${slot}\0${text}`); if (!audio_id) throw new Error(`${r.id}: no clip for ${slot}`); links.push({ op: 'audio.link', target: 'phrase', ...key, slot, audio_id }); };
    if (r.after[0] !== r.before[0]) link('known', r.after[0]);
    link('target1', r.after[1]); link('target2', r.after[1]);
  }
  return [...ops, ...links];
}

async function post(url, body) {
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body), signal: AbortSignal.timeout(180000) });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  } catch (e) { return { status: 0, body: { ok: false, error: String((e.cause && e.cause.code) || e.name) } }; }
}

async function main() {
  const dumpPath = process.argv[2];
  if (!dumpPath) throw new Error('usage: <dump.json from course-dump-readonly-2026-10-14.cjs>');
  const RENDER = process.env.RENDER === '1', APPLY = process.env.APPLY === '1';
  const db = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));
  const problems = gates(db);
  console.log(`gates over ${ROWS.length} rows: ${problems.length} problems`); problems.forEach((p) => console.log('  PROBLEM', p));
  if (problems.length) return;
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const log = { job: '#158', started: new Date().toISOString(), rows: ROWS, asks: [] };
  const save = (n) => { const f = evidencePath(`tools/course-optimization/deu-pp-order-2026-10-19/${n}-${log.started.replace(/[:.]/g, '-')}.json`); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(log, null, 2)); return f; };
  let chars = 0;
  for (const a of clipAsks()) {
    const d = await post(`${POPTY}/api/audio/render`, { courseCode: COURSE, role: a.role, text: a.text, purpose: PURPOSE, dryRun: true });
    const ok = d.status === 200 && d.body.ok; const w = ok && d.body.source !== 'library' ? (d.body.wouldSpendChars || a.text.length) : 0; chars += w;
    log.asks.push({ ...a, dry: { status: d.status, source: d.body.source, voiceId: d.body.voiceId, chars: w, error: ok ? undefined : d.body } });
  }
  const refused = log.asks.filter((a) => a.dry.error);
  console.log(`route dry run: ${log.asks.length} asks, ${log.asks.filter((a) => a.dry.source === 'library').length} from library, ${chars} chars to render, ${refused.length} refused`);
  refused.forEach((a) => console.log('  REFUSED (dry)', a.role, JSON.stringify(a.text), JSON.stringify(a.dry.error).slice(0, 200)));
  if (!RENDER || refused.length) return console.log('log:', save('dry'));
  for (const a of log.asks) {
    const r = await post(`${POPTY}/api/audio/render`, { courseCode: COURSE, role: a.role, text: a.text, purpose: PURPOSE });
    a.real = r.status === 200 && r.body.ok ? { source: r.body.source, audioId: r.body.audioId, charsSpent: r.body.charsSpent || 0 } : { error: r.body, status: r.status };
    console.log(' ', a.role, a.real.error ? 'REFUSED ' + JSON.stringify(a.real.error).slice(0, 160) : `${a.real.source} ${a.real.audioId}`);
    if (a.real.error) { console.log('A refusal is the answer; stopping, nothing edited.'); return console.log('log:', save('refused')); }
  }
  console.log(`rendered: ${log.asks.reduce((n, a) => n + a.real.charsSpent, 0)} chars spent`);
  if (!APPLY) return console.log('log:', save('rendered'));
  const clips = new Map(log.asks.map((a) => [`${a.role}\0${a.text}`, a.real.audioId]));
  const ops = editOps(clips);
  const prev = await post(`${POPTY}/api/production/${COURSE}/edit-batch`, { ops });
  log.preview = { status: prev.status, results: prev.body.results, error: prev.status === 200 ? undefined : prev.body };
  console.log(`edit-batch preview: HTTP ${prev.status}; ${(prev.body.results || []).length} results ${JSON.stringify(prev.body.error || '').slice(0, 300)}`);
  if (prev.status !== 200 || prev.body.ok === false) return console.log('preview refused:', save('preview-refused'));
  if (process.env.APPLY_CONFIRM !== '1') return console.log('preview only (APPLY_CONFIRM=1 to commit):', save('preview'));
  const res = await post(`${POPTY}/api/production/${COURSE}/edit-batch`, { ops, apply: true });
  log.applied = { status: res.status, eventId: res.body.event_id || null, undoFile: res.body.undo_file || null, undo: res.body.undo_ops || null, results: res.body.results, error: res.status === 200 ? undefined : res.body };
  console.log(`edit-batch APPLY: HTTP ${res.status}; event ${log.applied.eventId}; undo_file ${log.applied.undoFile} ${JSON.stringify(res.body.error || '').slice(0, 300)}`);
  console.log(`touched seeds (unapprove + recompute-decompositions next): ${[...new Set(ROWS.map((r) => seedOf(r.id)))].join(',')}`);
  console.log('log (undo inside):', save('applied'));
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { ROWS, standardOrder, gates, clipAsks, editOps };
