#!/usr/bin/env node
'use strict';
// tools/course-optimization/deu-could-rule-2026-10-14.cjs — deu_for_eng job #489: Kai's could rule for German
// (14 Oct 2026, canon K45 after K35/K40). könnte vs konnte is MEANING, not gender. The verdicts, one per row, are in
// ./deu-could-rule-2026-10-14.data.cjs; this file carries them out and holds the rule as code (konnteWithoutMarker).
//
// Writes go ONLY through Popty (Tom's protocols, 14 Oct): the edit door (POST /api/production/:course/edit-batch,
// previewed first, the undo kept) and the one audio route (POST /api/audio/render). Nothing here touches the database.
// The before-state is a read-only dump from course-dump-readonly-2026-10-14.cjs; every op carries `expect` from it.
//
// Make before break (A4/A6): every clip the new text needs is asked of the route first (dry run, then ONE real call
// each); a row whose clip is refused is held. Only then the text switches, and each changed slot is linked to its new
// clip in the SAME transaction (audio.link — the #452 lesson). A change that opens a NEW strict ZUT group is held (K2).
//
//   node …/deu-could-rule-2026-10-14.cjs <dump.json>                      # plan + ZUT gate + rule count + route dry run
//   CHECK=1 node … <dump.json>                                             # only the rule count (before/after evidence)
//   TRANCHE=1,2 …                                                          # which tranches (default 1)
//   RENDER=1 MAX_CHARS=5000 node … <dump.json>                             # + the real renders (stops above MAX_CHARS)
//   RENDER=1 APPLY=1 node … <dump.json>                                    # + edit-batch preview
//   RENDER=1 APPLY=1 APPLY_CONFIRM=1 node … <dump.json>                    # + apply; undo kept by Popty and in the log
const fs = require('fs');
const path = require('path');

const COURSE = 'deu_for_eng';
const AGENT = 'deu-could-rule (job #489)';
const PURPOSE = 'job #489 deu_for_eng could rule könnte/konnte (Kai 14 Oct)';
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
const DATA = require('./deu-could-rule-2026-10-14.data.cjs');

const sid = (p) => String(p.id).split(':')[1];

// ── THE RULE AS CODE ──────────────────────────────────────────────────────────────────────────────────────────────
// Kai, 14 Oct: konnte only for "could" reporting the past, and then ALWAYS with an explicit past-tense marker in the
// same sentence. A konnte row whose English has no past marker is a defect: the learner hears bare "could" and is
// taught konnte for it. Components are tiles, not sentences, and are not judged.
const PAST_MARKER = /\b(said|told|thought|knew|wanted|tried|started|heard|was|were|had|did|didn't|asked|yesterday|ago|last|when|surprised|able)\b/i;
const KONNTE = /\bkonnte(st|n|t)?\b/i;
function konnteWithoutMarker(row) {
  return row.phrase_role !== 'component' && KONNTE.test(row.target_text || '') && !PAST_MARKER.test(row.known_text || '');
}
/** Every seed, LEGO and played-role phrase breaking the rule. Pure. */
function ruleDefects(db) {
  const out = [];
  for (const s of db.seeds) if (konnteWithoutMarker({ known_text: s.known_text, target_text: s.target_text })) out.push(`seed:${s.seed_number}`);
  for (const l of db.legos) if (l.is_new && konnteWithoutMarker(l)) out.push(l.lego_id);
  for (const p of db.phrases) if (konnteWithoutMarker(p)) out.push(sid(p));
  return out;
}

/** The intro line for a LEGO given in the data, else the template with the new words. */
const introLine = (known) => `The German for: '${known}', is:`;

/** Verdicts × the dump → the changes this pass makes. Pure. */
function plan(db, rows = DATA.ROWS, tranches = [1]) {
  const P = Object.fromEntries(db.phrases.map((p) => [sid(p), p]));
  const L = Object.fromEntries(db.legos.map((l) => [l.lego_id, l]));
  const S = Object.fromEntries(db.seeds.map((s) => [`seed:${s.seed_number}`, s]));
  const out = { seeds: [], phrases: [], legos: [], deletes: [], skipped: [], held: [] };
  for (const [id, tranche, action, to, rule, why, extra] of rows) {
    if (!tranches.includes(tranche)) { out.skipped.push({ id, why: `tranche ${tranche} not selected` }); continue; }
    const row = S[id] || P[id] || L[id];
    if (!row) { if (action === 'delete') { out.skipped.push({ id, why: 'already deleted (an earlier run)' }); continue; } throw new Error(`${id}: not in the dump`); }
    if (action === 'delete') {
      if (!P[id]) throw new Error(`${id}: only a practice phrase may be deleted — a LEGO or seed never is`);
      out.deletes.push({ id, before: [row.known_text, row.target_text], rule, why }); continue;
    }
    if (action !== 'fix') throw new Error(`${id}: unknown action ${action}`);
    const after = [to[0] ?? row.known_text, to[1] ?? row.target_text];
    const c = { id, before: [row.known_text, row.target_text], after, rule, why };
    if (L[id]) {
      c.components = extra && extra.components;
      c.intro = row.is_new && (after[0] !== row.known_text || (extra && extra.intro)) ? ((extra && extra.intro) || introLine(after[0])) : null;
      const same = after[0] === row.known_text && after[1] === row.target_text && JSON.stringify(c.components || row.components) === JSON.stringify(row.components);
      if (same) { out.skipped.push({ id, why: 'already reads this way (an earlier run applied it)' }); continue; }
      out.legos.push(c); continue;
    }
    if (after[0] === row.known_text && after[1] === row.target_text) { out.skipped.push({ id, why: 'already reads this way (an earlier run applied it)' }); continue; }
    if (S[id]) { c.seed = row.seed_number; out.seeds.push(c); continue; }
    out.phrases.push(c);
  }
  // Component tiles get NO intro: Popty refuses to bind presentation audio to a component row ("Components are never
  // introduced", Tom 2026-08-06) — the edit door said so on #489's first preview.
  return out;
}

/** The course as it would read after the plan — for the ZUT gate and the rule count. */
function simulate(db, p) {
  const del = new Set(p.deletes.map((d) => d.id));
  const ph = Object.fromEntries(p.phrases.map((c) => [c.id, c]));
  const le = Object.fromEntries(p.legos.map((c) => [c.id, c]));
  const se = Object.fromEntries(p.seeds.map((c) => [c.seed, c]));
  return {
    seeds: db.seeds.map((s) => (se[s.seed_number] ? { ...s, known_text: se[s.seed_number].after[0], target_text: se[s.seed_number].after[1] } : s)),
    legos: db.legos.map((l) => (le[l.lego_id] ? { ...l, id: l.lego_id, known_text: le[l.lego_id].after[0], target_text: le[l.lego_id].after[1] } : { ...l, id: l.lego_id })),
    phrases: db.phrases.filter((x) => !del.has(sid(x))).map((x) => (ph[sid(x)] ? { ...x, known_text: ph[sid(x)].after[0], target_text: ph[sid(x)].after[1] } : x)),
  };
}

/** Hold every change whose English would open a NEW strict ZUT group course-wide (K2). Mutates p. */
function zutGate(db, p, audit = require('./audit-phrase-zut.cjs')) {
  const groups = (d) => new Map(audit.auditRows(d).bidirectional.violationsStrict.map((v) => [v.known_norm, v]));
  const before = groups(simulate(db, { seeds: [], phrases: [], legos: [], deletes: [] }));
  for (let round = 0; round < 5; round++) {
    const after = groups(simulate(db, p));
    const fresh = new Set([...after.keys()].filter((k) => !before.has(k)));
    if (!fresh.size) return { before: before.size, after: after.size };
    const hit = (c) => fresh.has(audit.nk(c.after[0]));
    for (const c of [...p.phrases, ...p.legos, ...p.seeds].filter(hit)) {
      const forms = after.get(audit.nk(c.after[0])).distinct_targets.map((t) => t.example.target).join(' / ');
      p.held.push({ id: c.id, rule: 'K2', why: `ZUT: "${c.after[0]}" would stand over ${forms} — proposed ${c.after.join(' | ')}` });
    }
    p.phrases = p.phrases.filter((c) => !hit(c));
    p.legos = p.legos.filter((c) => !hit(c));
    p.seeds = p.seeds.filter((c) => !hit(c));
  }
  throw new Error('ZUT gate did not converge');
}

/** Every distinct clip the new text needs: [{role, text, legoId?, ids}]. */
function clipAsks(p) {
  const m = new Map();
  const add = (role, text, id, legoId) => {
    const k = `${role}\u0000${text}\u0000${legoId || ''}`;
    if (!m.has(k)) m.set(k, { role, text, ...(legoId ? { legoId } : {}), ids: [] });
    m.get(k).ids.push(id);
  };
  for (const c of [...p.seeds, ...p.phrases, ...p.legos]) {
    if (c.after[0] !== c.before[0]) add('known', c.after[0], c.id);
    if (c.after[1] !== c.before[1]) { add('target1', c.after[1], c.id); add('target2', c.after[1], c.id); }
    if (c.intro) add('presentation', c.intro, c.id, c.id.length === 8 ? c.id : null);
  }
  return [...m.values()];
}

/** The edit-batch ops; `expect` pins each row to the dump. `clips` (role\u0000text → audioId; presentation keyed with
 *  its LEGO) adds an audio.link for every slot whose words changed, in the SAME transaction after the text. */
function editOps(p, clips = null) {
  const links = [];
  const link = (target, key, slot, text, legoId) => {
    if (!clips) return;
    const audio_id = clips.get(`${slot}\u0000${text}${slot === 'presentation' ? `\u0000${legoId || ''}` : ''}`);
    if (!audio_id) throw new Error(`${JSON.stringify(key)}: no clip for ${slot} "${text}"`);
    links.push({ op: 'audio.link', target, ...key, slot, audio_id });
  };
  const slots = (target, key, c) => {
    if (c.after[0] !== c.before[0]) link(target, key, 'known', c.after[0]);
    if (c.after[1] !== c.before[1]) { link(target, key, 'target1', c.after[1]); link(target, key, 'target2', c.after[1]); }
    if (c.intro) link(target, key, 'presentation', c.intro, c.id.length === 8 ? c.id : null);
  };
  for (const c of p.seeds) slots('seed', { seed_number: c.seed }, c);
  for (const c of p.legos) slots('lego', { lego_id: c.id }, c);
  for (const c of p.phrases) slots('phrase', { phrase_id: `${COURSE}:${c.id}` }, c);
  return [
    ...p.seeds.map((c) => ({ op: 'seed.update', seed_number: c.seed, set: { known_text: c.after[0], target_text: c.after[1] }, expect: { known_text: c.before[0], target_text: c.before[1] } })),
    ...p.legos.map((c) => ({ op: 'lego.update', lego_id: c.id, set: { known_text: c.after[0], target_text: c.after[1], ...(c.components ? { components: c.components } : {}) }, expect: { known_text: c.before[0], target_text: c.before[1] } })),
    ...p.phrases.map((c) => ({ op: 'phrase.update', phrase_id: `${COURSE}:${c.id}`, set: { known_text: c.after[0], target_text: c.after[1] }, expect: { known_text: c.before[0], target_text: c.before[1] } })),
    ...links,
    ...p.deletes.map((c) => ({ op: 'phrase.delete', phrase_id: `${COURSE}:${c.id}`, expect: { known_text: c.before[0], target_text: c.before[1] } })),
  ];
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
  const RENDER = process.env.RENDER === '1', APPLY = process.env.APPLY === '1', MAX = +(process.env.MAX_CHARS || 5000);
  const tranches = String(process.env.TRANCHE || '1').split(',').map(Number);
  const db = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));
  const defects = ruleDefects(db);
  console.log(`rule (konnte with no past marker in the English): ${defects.length} rows — ${defects.join(' ')}`);
  if (process.env.CHECK === '1') return;
  const p = plan(db, DATA.ROWS, tranches);
  const zut = zutGate(db, p);
  const afterDefects = ruleDefects(simulate(db, p));
  const log = { job: '#489', started: new Date().toISOString(), tranches, zut, ruleBefore: defects, ruleAfter: afterDefects, plan: p };
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const save = (n) => { const f = evidencePath(`tools/course-optimization/deu-could-rule-2026-10-14/${n}-${log.started.replace(/[:.]/g, '-')}.json`); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(log, null, 2)); return f; };
  console.log(`plan (tranche ${tranches}): ${p.seeds.length} seeds, ${p.legos.length} LEGOs, ${p.phrases.length} phrases, ${p.deletes.length} deletes, ${p.held.length} held by gates; ZUT strict ${zut.before} → ${zut.after}; rule ${defects.length} → ${afterDefects.length}`);
  for (const h of p.held) console.log('  HELD', h.id, h.rule, h.why);

  // 1. the route, dry
  const asks = clipAsks(p);
  log.asks = [];
  let chars = 0;
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

  // 2. the route, real — ONCE per clip; a refusal holds every row that needed it
  const refused = new Set();
  for (const a of log.asks) {
    if (a.dry.status !== 200 || a.dry.error) { a.ids.forEach((i) => refused.add(i)); continue; }
    const r = await post(`${POPTY}/api/audio/render`, { courseCode: COURSE, role: a.role, text: a.text, purpose: PURPOSE, ...(a.legoId ? { legoId: a.legoId } : {}) });
    a.real = { status: r.status, source: r.body.source, audioId: r.body.audioId, charsSpent: r.body.charsSpent, error: r.status === 200 && r.body.ok ? undefined : r.body };
    if (a.real.error) { a.ids.forEach((i) => refused.add(i)); console.log('  REFUSED', a.role, JSON.stringify(a.text), r.status, JSON.stringify(r.body).slice(0, 200)); if (r.status === 402) break; }
  }
  log.charsSpent = log.asks.reduce((s, a) => s + ((a.real && a.real.charsSpent) || 0), 0);
  // a refused clip holds its row — and a refused seed/LEGO holds its whole seed, so a seed never half-changes
  const seedOf = (id) => (id.startsWith('seed:') ? +id.slice(5) : +id.slice(1, 5));
  const heldSeeds = new Set([...refused].filter((i) => i.startsWith('seed:') || i.length === 8).map(seedOf));
  const out = (c) => refused.has(c.id) || heldSeeds.has(seedOf(c.id));
  for (const c of [...p.seeds, ...p.legos, ...p.phrases, ...p.deletes].filter(out)) p.held.push({ id: c.id, rule: 'A4', why: 'a clip it needs was refused by the audio route, so the text was not switched' });
  p.seeds = p.seeds.filter((c) => !out(c)); p.legos = p.legos.filter((c) => !out(c)); p.phrases = p.phrases.filter((c) => !out(c)); p.deletes = p.deletes.filter((c) => !out(c));
  console.log(`rendered: ${log.charsSpent} chars spent; ${refused.size} rows refused a clip; seeds held whole: ${[...heldSeeds].join(',') || 'none'}`);
  if (!APPLY) return console.log('render log:', save('rendered'));

  // 3. the edit door: preview, then apply; keep the undo
  const clips = new Map(log.asks.filter((a) => a.real && a.real.audioId).map((a) => [`${a.role}\u0000${a.text}${a.role === 'presentation' ? `\u0000${a.legoId || ''}` : ''}`, a.real.audioId]));
  const ops = editOps(p, clips);
  const prev = await post(`${POPTY}/api/production/${COURSE}/edit-batch`, { ops });
  // a row is silent if its LAST result (after its audio.link ops) leaves a known/target slot empty; a phrase has no intro
  const silent = (r) => [...new Map((r.results || []).map((x) => [JSON.stringify(x.key), x])).values()]
    .filter((x) => x.after && ['known_audio_id', 'target1_audio_id', 'target2_audio_id'].some((c) => c in x.after && !x.after[c])).map((x) => x.key);
  log.preview = { status: prev.status, results: prev.body.results, silentAfter: silent(prev.body), error: prev.status === 200 ? undefined : prev.body };
  console.log(`edit-batch preview: HTTP ${prev.status}; ${(prev.body.results || []).length} results; ${log.preview.silentAfter.length} rows would have a silent slot ${JSON.stringify(prev.body.error || '').slice(0, 300)}`);
  if (prev.status !== 200 || prev.body.ok === false) return console.log('preview refused:', save('preview-refused'));
  if (process.env.APPLY_CONFIRM !== '1') return console.log('preview only (APPLY_CONFIRM=1 to commit):', save('preview'));
  const res = await post(`${POPTY}/api/production/${COURSE}/edit-batch`, { ops, apply: true });
  log.applied = { status: res.status, eventId: res.body.event_id || null, undoFile: res.body.undo_file || null, undo: res.body.undo_ops || null, silentAfter: silent(res.body), results: res.body.results, error: res.status === 200 ? undefined : res.body };
  log.touchedSeeds = [...new Set([...p.seeds, ...p.legos, ...p.phrases, ...p.deletes].map((c) => seedOf(c.id)))].sort((a, b) => a - b);
  log.touchedPhraseIds = p.phrases.map((c) => `${COURSE}:${c.id}`);
  console.log(`edit-batch APPLY: HTTP ${res.status}; event ${log.applied.eventId}; undo_file ${log.applied.undoFile}; ${log.applied.silentAfter.length} rows with a silent slot ${JSON.stringify(res.body.error || '').slice(0, 300)}`);
  console.log(`touched seeds (unapprove + recompute-decompositions next): ${log.touchedSeeds.join(',')}`);
  console.log('log (undo inside):', save('applied'));
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { plan, simulate, zutGate, clipAsks, editOps, ruleDefects, konnteWithoutMarker, PAST_MARKER };
