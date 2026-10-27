#!/usr/bin/env node
'use strict';
// tools/course-optimization/spa-105-152-clear-fixes-2026-10-27.cjs — spa_for_eng job #98 (Kai's plan, 27 Oct 2026):
// apply the CLEAR phrase-level fixes the close readings found in seeds 105-152 (d/54974ba3 appendices A-C, d/f85f2c5b).
// The verdicts, one per row, are in ./spa-105-152-clear-fixes-2026-10-27.data.cjs; everything Kai must rule on is held
// in the published held-items document, not here. A fix here changes NO LEGO, NO seed sentence and NO intro.
//
// Writes go ONLY through Popty: the course edit door (POST /api/production/:course/edit-batch, previewed first, the undo
// kept) and the one audio route (POST /api/audio/render). Nothing here touches the database. The before-state is a
// read-only dump from course-dump-readonly-2026-10-14.cjs; the seed approvals come from GET /api/production/:course/seeds.
//
// Every verdict passes five gates or is HELD (never written):
//   drift     the row still reads exactly as it did when the verdict was written (`was`)
//   taught    every Spanish word the fix ADDS is in a LEGO or tile at or before the row's own LEGO (P1/P2; no later sibling)
//   contain   a row that contained its LEGO (words, any order — K49) still does, on each side
//   ZUT       no English gains a second Spanish, and no Spanish gains a second English, anywhere in the course (K2, P16)
//   audio     every new clip came back from the route; a refused clip holds the row (make before break, A4)
// Seeds whose rows change are unapproved in the same transaction (O5); deletions do not need audio.
//
//   node …/spa-105-152-clear-fixes-2026-10-27.cjs <dump.json> <seeds.json>          # plan + gates + route dry runs
//   RENDER=1 MAX_CHARS=30000 node … <dump.json> <seeds.json>                        # + the real renders
//   RENDER=1 APPLY=1 node … <dump.json> <seeds.json>                                # + edit-batch preview
//   RENDER=1 APPLY=1 APPLY_CONFIRM=1 node … <dump.json> <seeds.json>                # + apply; the undo is kept by Popty
// ONLY=S0105,S0106 narrows a run to rows whose id starts with one of those prefixes; CLASS=GRAMMAR,MEANING to one or
// more verdict classes (Kai's plan: batches by class). Take a fresh dump before each batch.
const fs = require('fs');
const path = require('path');

const COURSE = 'spa_for_eng';
const AGENT = 'spa-105-152-clear-fixes (job #98)';
const PURPOSE = 'job #98 spa_for_eng seeds 105-152 clear phrase fixes (Kai plan 27 Oct)';
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
const VERDICTS = require('./spa-105-152-clear-fixes-2026-10-27.data.cjs');

const sid = (p) => String(p.id).split(':')[1];
const legoIdOf = (id) => /^(S\d{4}L\d\d)/.exec(id)[1];
/** Words, lower-cased, Spanish punctuation off, accents KEPT (é is not e). */
const words = (s) => String(s || '').toLowerCase().replace(/[’‘]/g, "'").replace(/[¿¡.,!?;:"«»“”—–()]+/g, ' ').split(/\s+/).filter(Boolean);
/** Every word of `needle` is in `hay`, as a multiset, any order (K49: a LEGO may be split or reordered). */
function containsWords(hay, needle) {
  const h = words(hay);
  for (const w of words(needle)) { const i = h.indexOf(w); if (i < 0) return false; h.splice(i, 1); }
  return true;
}

/** Spanish vocabulary available at a LEGO: every LEGO and tile target up to and including it, in seed/index order. */
function vocabulary(db) {
  const tiles = new Map();
  for (const p of db.phrases) if (p.phrase_role === 'component') { const k = legoIdOf(sid(p)); if (!tiles.has(k)) tiles.set(k, []); tiles.get(k).push(p.target_text); }
  const legos = [...db.legos].sort((a, b) => a.seed_number - b.seed_number || a.lego_index - b.lego_index);
  const at = new Map(); const seen = new Set();
  for (const l of legos) {
    for (const t of [l.target_text, ...(l.components || []).map((c) => c && c.target), ...(tiles.get(l.lego_id) || [])]) for (const w of words(t)) seen.add(w);
    at.set(l.lego_id, new Set(seen));
  }
  return at;
}

/** Verdicts × the dump → what this pass changes. Pure. */
function plan(db, verdicts = VERDICTS, only = null) {
  const P = Object.fromEntries(db.phrases.map((p) => [sid(p), p]));
  const L = Object.fromEntries(db.legos.map((l) => [l.lego_id, l]));
  const vocab = vocabulary(db);
  const out = { phrases: [], deletes: [], held: [], skipped: [] };
  for (const v of verdicts) {
    if (only && !only.some((o) => v.id.startsWith(o))) continue;
    const p = P[v.id];
    if (!p) { out.skipped.push({ id: v.id, why: v.act === 'delete' ? 'already deleted (an earlier run)' : 'row not found' }); continue; }
    if (p.phrase_role === 'component') throw new Error(`${v.id}: components are not in this pass`);
    const before = [p.known_text, p.target_text];
    if (v.act === 'delete') {
      if (before[0] !== v.was[0] || before[1] !== v.was[1]) { out.skipped.push({ id: v.id, why: `changed since it was read: now ${before.join(' | ')}` }); continue; }
      out.deletes.push({ id: v.id, before, cls: v.cls, why: v.why });
      continue;
    }
    const after = [v.to[0] ?? before[0], v.to[1] ?? before[1]];
    if (after[0] === before[0] && after[1] === before[1]) { out.skipped.push({ id: v.id, why: 'already reads this way (an earlier run applied it)' }); continue; }
    if (before[0] !== v.was[0] || before[1] !== v.was[1]) { out.skipped.push({ id: v.id, why: `changed since it was read: now ${before.join(' | ')}` }); continue; }
    const lego = L[legoIdOf(v.id)];
    const hold = (rule, why) => out.held.push({ id: v.id, rule, why, before, after, cls: v.cls });
    const known = vocab.get(lego.lego_id);
    const oldW = words(before[1]);
    const added = words(after[1]).filter((w) => { const i = oldW.indexOf(w); if (i >= 0) { oldW.splice(i, 1); return false; } return true; });
    const untaught = [...new Set(added.filter((w) => !known.has(w)))];
    if (untaught.length) { hold('P1', `untaught at ${lego.lego_id}: ${untaught.join(', ')}`); continue; }
    if (containsWords(before[1], lego.target_text) && !containsWords(after[1], lego.target_text)) { hold('P17', `Spanish would no longer contain the LEGO "${lego.target_text}"`); continue; }
    if (containsWords(before[0], lego.known_text) && !containsWords(after[0], lego.known_text)) { hold('P17', `English would no longer contain the LEGO "${lego.known_text}"`); continue; }
    out.phrases.push({ id: v.id, before, after, cls: v.cls, why: v.why });
  }
  return out;
}

/** The course as it would read after the plan. */
function simulate(db, p) {
  const del = new Set(p.deletes.map((d) => d.id));
  const ph = Object.fromEntries(p.phrases.map((c) => [c.id, c]));
  return {
    seeds: db.seeds,
    legos: db.legos.map((l) => ({ ...l, id: l.lego_id })),
    phrases: db.phrases.filter((x) => !del.has(sid(x))).map((x) => (ph[sid(x)] ? { ...x, known_text: ph[sid(x)].after[0], target_text: ph[sid(x)].after[1] } : x)),
  };
}

/** One English → how many Spanish (and the reverse), over every non-component phrase and LEGO. */
function groups(rows, audit) {
  const fwd = new Map(), rev = new Map();
  const add = (m, k, v) => { if (!m.has(k)) m.set(k, new Set()); m.get(k).add(v); };
  for (const r of rows) {
    if (!r.known_text || !r.target_text || r.phrase_role === 'component') continue;
    const k = audit.nk(r.known_text), t = audit.ntStrict(r.target_text);
    add(fwd, k, t); add(rev, t, k);
  }
  return { fwd, rev };
}

/** Hold every change whose English gains a Spanish, or whose Spanish gains an English, it did not already have. Mutates p. */
function zutGate(db, p, audit = require('./audit-phrase-zut.cjs')) {
  const all = (s) => [...s.legos, ...s.phrases];
  const B = groups(all(simulate(db, { phrases: [], deletes: [] })), audit);
  for (let round = 0; round < 5; round++) {
    const A = groups(all(simulate(db, p)), audit);
    const bad = p.phrases.filter((c) => {
      const k = audit.nk(c.after[0]), t = audit.ntStrict(c.after[1]);
      const grew = (m0, m1, key) => (m1.get(key) || new Set()).size > Math.max(1, (m0.get(key) || new Set()).size);
      return grew(B.fwd, A.fwd, k) || grew(B.rev, A.rev, t);
    });
    if (!bad.length) {
      const strict = (s) => audit.auditRows(s).bidirectional.violationsStrict.length;
      return { before: strict(simulate(db, { phrases: [], deletes: [] })), after: strict(simulate(db, p)) };
    }
    for (const c of bad) {
      const k = audit.nk(c.after[0]), t = audit.ntStrict(c.after[1]);
      const others = [...(A.fwd.get(k) || [])].filter((x) => x !== t);
      const otherK = [...(A.rev.get(t) || [])].filter((x) => x !== k);
      p.held.push({ id: c.id, rule: 'K2', before: c.before, after: c.after, cls: c.cls, why: `ZUT: ${others.length ? `"${c.after[0]}" also stands over ${others.join(' / ')}` : ''}${otherK.length ? ` "${c.after[1]}" also answers ${otherK.join(' / ')}` : ''}`.trim() });
    }
    const ids = new Set(bad.map((c) => c.id));
    p.phrases = p.phrases.filter((c) => !ids.has(c.id));
  }
  throw new Error('ZUT gate did not converge');
}

/** Every distinct clip the new text needs: [{role, text, ids}]. */
function clipAsks(p) {
  const m = new Map();
  const add = (role, text, id) => { const k = `${role}\u0000${text}`; if (!m.has(k)) m.set(k, { role, text, ids: [] }); m.get(k).ids.push(id); };
  for (const c of p.phrases) {
    if (c.after[0] !== c.before[0]) add('known', c.after[0], c.id);
    if (c.after[1] !== c.before[1]) { add('target1', c.after[1], c.id); add('target2', c.after[1], c.id); }
  }
  return [...m.values()];
}

/** The edit-batch ops: text first, then the clip links for every slot whose words changed, then deletes, then unapprovals.
 *  `expect` pins each row to the dump, so a row that moved aborts the whole batch. */
function editOps(p, clips, approvedSeeds = new Set()) {
  const links = [];
  for (const c of p.phrases) {
    const key = { phrase_id: `${COURSE}:${c.id}` };
    const link = (slot, role, text) => {
      const audio_id = clips.get(`${role}\u0000${text}`);
      if (!audio_id) throw new Error(`${c.id}: no clip for ${role} "${text}"`);
      links.push({ op: 'audio.link', target: 'phrase', ...key, slot, audio_id });
    };
    if (c.after[0] !== c.before[0]) link('known', 'known', c.after[0]);
    if (c.after[1] !== c.before[1]) { link('target1', 'target1', c.after[1]); link('target2', 'target2', c.after[1]); }
  }
  const seeds = [...new Set([...p.phrases, ...p.deletes].map((c) => +c.id.slice(1, 5)))].filter((n) => approvedSeeds.has(n)).sort((a, b) => a - b);
  return [
    ...p.phrases.map((c) => ({ op: 'phrase.update', phrase_id: `${COURSE}:${c.id}`, set: { known_text: c.after[0], target_text: c.after[1] }, expect: { known_text: c.before[0], target_text: c.before[1] } })),
    ...links,
    ...p.deletes.map((c) => ({ op: 'phrase.delete', phrase_id: `${COURSE}:${c.id}`, expect: { known_text: c.before[0], target_text: c.before[1] } })),
    ...seeds.map((n) => ({ op: 'seed.update', seed_number: n, set: { approved_at: null } })),
  ];
}

/** spa_for_eng's cast per slot (the voices the course's rows already speak in). */
const CAST = { known: ['xai_eve', 'eve'], target1: ['azure_es-ES-ElviraNeural', 'es-ES-ElviraNeural'], target2: ['azure_es-ES-AlvaroNeural', 'es-ES-AlvaroNeural'] };
/** A RERECORD_NOT_PERMITTED refusal names the working clip for these words: its id, if it is in the slot's cast voice. */
function existingClip(body, role) {
  if (!body || body.code !== 'RERECORD_NOT_PERMITTED') return null;
  const m = /already has a working clip \(([0-9a-f-]{36}) in ([^)]+)\)/.exec(String(body.error || ''));
  return m && (CAST[role] || []).includes(m[2].trim()) ? m[1] : null;
}

async function post(url, body) {
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body), signal: AbortSignal.timeout(180000) });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  } catch (e) { return { status: 0, body: { ok: false, error: String((e.cause && e.cause.code) || e.name) } }; }
}

async function main() {
  const [dumpPath, seedsPath] = process.argv.slice(2);
  if (!dumpPath || !seedsPath) throw new Error('usage: <dump.json> <seeds.json from GET /api/production/spa_for_eng/seeds>');
  const RENDER = process.env.RENDER === '1', APPLY = process.env.APPLY === '1', MAX = +(process.env.MAX_CHARS || 6000);
  const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
  const db = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));
  const seedRows = JSON.parse(fs.readFileSync(seedsPath, 'utf8')).seeds;
  const approved = new Set(seedRows.filter((s) => s.approved_at).map((s) => s.seed_number));
  const classes = process.env.CLASS ? process.env.CLASS.split(',') : null;
  // SKIP=<ids>: rows held by an earlier run (e.g. a paid render whose clip row the route failed to write) — never re-asked
  const skip = new Set(process.env.SKIP ? process.env.SKIP.split(',') : []);
  const p = plan(db, (classes ? VERDICTS.filter((x) => classes.includes(x.cls)) : VERDICTS).filter((x) => !skip.has(x.id)), only);
  const zut = zutGate(db, p);
  const log = { job: '#98', started: new Date().toISOString(), only, classes, zut, plan: p };
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const save = (n) => { const f = evidencePath(`tools/course-optimization/spa-105-152-clear-fixes-2026-10-27/${n}-${log.started.replace(/[:.]/g, '-')}.json`); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(log, null, 2)); return f; };
  console.log(`plan: ${p.phrases.length} phrase fixes, ${p.deletes.length} deletes, ${p.held.length} held, ${p.skipped.length} skipped; ZUT strict groups ${zut.before} → ${zut.after}`);
  for (const h of p.held) console.log('  HELD', h.id, h.rule, h.why);
  for (const s of p.skipped) console.log('  SKIP', s.id, s.why);

  const asks = clipAsks(p);
  log.asks = [];
  let chars = 0;
  for (const a of asks) {
    const d = await post(`${POPTY}/api/audio/render`, { courseCode: COURSE, role: a.role, text: a.text, purpose: PURPOSE, dryRun: true });
    const ok = d.status === 200 && d.body.ok;
    const w = ok && d.body.source !== 'library' ? (d.body.wouldSpendChars || a.text.length) : 0;
    chars += w;
    // The route refuses to re-record words that already have a working clip and names it: that clip IS the answer,
    // linked as it stands (no spend), provided it is in the course's own voice for the slot.
    const ex = !ok && existingClip(d.body, a.role);
    log.asks.push({ ...a, dry: { status: d.status, source: ex ? 'existing' : d.body.source, chars: w, existing: ex || undefined, error: ok || ex ? undefined : d.body } });
  }
  const refusedDry = log.asks.filter((a) => !a.dry.existing && (a.dry.status !== 200 || a.dry.error));
  console.log(`route dry run: ${asks.length} asks, ${log.asks.filter((a) => a.dry.source === 'library').length} from library, ${chars} chars to render, ${refusedDry.length} refused`);
  for (const a of refusedDry) console.log('  REFUSED (dry)', a.role, JSON.stringify(a.text), a.dry.status, JSON.stringify(a.dry.error).slice(0, 300));
  if (!RENDER) return console.log('dry log:', save('dry'));
  if (chars > MAX) { console.log(`STOP: ${chars} chars > MAX_CHARS ${MAX}; nothing rendered`); return console.log(save('stopped')); }

  // the route, real — ONCE per clip, no retries; a refusal holds every row that needed it
  const refused = new Set();
  for (const a of log.asks) {
    if (a.dry.existing) { a.real = { source: 'existing', audioId: a.dry.existing, charsSpent: 0 }; continue; }
    if (a.dry.status !== 200 || a.dry.error) { a.ids.forEach((i) => refused.add(i)); continue; }
    const r = await post(`${POPTY}/api/audio/render`, { courseCode: COURSE, role: a.role, text: a.text, purpose: PURPOSE });
    a.real = { status: r.status, source: r.body.source, audioId: r.body.audioId, charsSpent: r.body.charsSpent, error: r.status === 200 && r.body.ok ? undefined : r.body };
    if (a.real.error) { a.ids.forEach((i) => refused.add(i)); console.log('  REFUSED', a.role, JSON.stringify(a.text), r.status, JSON.stringify(r.body).slice(0, 300)); if (r.status === 402) break; }
  }
  for (const a of log.asks) if (!(a.real && a.real.audioId)) a.ids.forEach((i) => refused.add(i));
  log.charsSpent = log.asks.reduce((s, a) => s + ((a.real && a.real.charsSpent) || 0), 0);
  for (const id of refused) { const c = p.phrases.find((x) => x.id === id); p.held.push({ id, rule: 'A4', why: 'its new clip was refused by the audio route, so the text was not switched', before: c && c.before, after: c && c.after }); }
  p.phrases = p.phrases.filter((c) => !refused.has(c.id));
  console.log(`rendered: ${log.charsSpent} chars spent; ${refused.size} rows held for a refused clip`);
  if (!APPLY) return console.log('render log:', save('rendered'));

  const clips = new Map(log.asks.filter((a) => a.real && a.real.audioId).map((a) => [`${a.role}\u0000${a.text}`, a.real.audioId]));
  const ops = editOps(p, clips, approved);
  const prev = await post(`${POPTY}/api/production/${COURSE}/edit-batch`, { ops });
  // A row's slots are judged on its FINAL state in the batch: the text op nulls a slot and a later audio.link fills it.
  const silent = (r) => {
    const fin = new Map();
    for (const x of r.results || []) { if (!x.after || !x.key) continue; const k = JSON.stringify(x.key); fin.set(k, { ...(fin.get(k) || {}), ...x.after }); }
    return [...fin].filter(([, a]) => ['known_audio_id', 'target1_audio_id', 'target2_audio_id'].some((c) => c in a && !a[c])).map(([k]) => JSON.parse(k));
  };
  log.preview = { status: prev.status, n: (prev.body.results || []).length, silentAfter: silent(prev.body), results: prev.body.results, error: prev.status === 200 ? undefined : prev.body };
  console.log(`edit-batch preview: HTTP ${prev.status}; ${log.preview.n} results; ${log.preview.silentAfter.length} rows would have a silent slot ${JSON.stringify(prev.body.error || '').slice(0, 300)}`);
  if (prev.status !== 200 || prev.body.ok === false) return console.log('preview refused:', save('preview-refused'));
  if (log.preview.silentAfter.length) return console.log('STOP: a row would end the batch with a silent slot:', JSON.stringify(log.preview.silentAfter).slice(0, 400), save('preview-silent'));
  if (process.env.APPLY_CONFIRM !== '1') return console.log('preview only (APPLY_CONFIRM=1 to commit):', save('preview'));
  const res = await post(`${POPTY}/api/production/${COURSE}/edit-batch`, { ops, apply: true });
  log.applied = { status: res.status, eventId: res.body.event_id || null, undoFile: res.body.undo_file || null, undo: res.body.undo_ops || null, silentAfter: silent(res.body), results: res.body.results, error: res.status === 200 ? undefined : res.body };
  console.log(`edit-batch APPLY: HTTP ${res.status}; event ${log.applied.eventId}; undo_file ${log.applied.undoFile}; ${log.applied.silentAfter.length} rows with a silent slot ${JSON.stringify(res.body.error || '').slice(0, 300)}`);
  console.log('log (undo inside):', save('applied'));
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { plan, simulate, zutGate, clipAsks, editOps, containsWords, vocabulary, words, existingClip };
