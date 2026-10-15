#!/usr/bin/env node
'use strict';
// tools/course-optimization/fra-222-mismatch-pass-2026-10-14.cjs — fra_for_eng job #452 (Kai's OK, 14 Oct 2026):
// apply the hand-read verdicts on the 222 medium meaning findings #329 left open. The verdicts, one per row with the
// canon rule each fix follows, are in ./fra-222-mismatch-pass-2026-10-14.data.cjs. This file only carries them out.
//
// Writes go ONLY through Popty (Tom's protocols, 14 Oct): the course edit door (POST /api/production/:course/edit-batch,
// previewed first, the undo kept) and the one audio route (POST /api/audio/render). Nothing here touches the database.
// The before-state is a read-only dump from course-dump-readonly-2026-10-14.cjs; every op carries `expect` built from it,
// so a row that moved since the dump aborts the whole batch instead of being overwritten.
//
// Order, per canon A4/A6 (make before break): every clip the new text needs is asked of the route FIRST (dry run, then
// ONE real call each); a row whose clip is refused is held, never written. Only then is the text switched, and the
// text-change trigger re-points each slot to the clip that now speaks it. A LEGO's intro is rendered with its LEGO
// named, which binds it (O13). A change that would open a NEW strict ZUT group course-wide is held (K2).
//
//   node …/fra-222-mismatch-pass-2026-10-14.cjs <dump.json>                 # plan + ZUT gate + route dry runs
//   RENDER=1 MAX_CHARS=6000 node … <dump.json>                              # + the real renders (stops above MAX_CHARS)
//   RENDER=1 APPLY=1 node … <dump.json>                                     # + edit-batch preview (rolled back)
//   RENDER=1 APPLY=1 APPLY_CONFIRM=1 node … <dump.json>                     # + apply; the undo is kept by Popty and in the log
const fs = require('fs');
const path = require('path');

const COURSE = 'fra_for_eng';
const AGENT = 'fra-222-mismatch-pass (job #452)';
const PURPOSE = 'job #452 fra_for_eng second meaning-mismatch pass (Kai 14 Oct)';
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
const VERDICTS = require('./fra-222-mismatch-pass-2026-10-14.data.cjs');

const sid = (p) => String(p.id).split(':')[1];
/** The intro line for a re-glossed LEGO: the old intro with the quoted LEGO swapped, trailing SSML dropped (#329's shape). */
function introFor(oldIntro, oldKnown, newKnown) {
  const base = String(oldIntro || '').replace(/\s*<break[^>]*\/>/g, '').trim();
  const quoted = `'${oldKnown}'`;
  return base.includes(quoted) ? base.replace(quoted, `'${newKnown}'`) : `The French for: '${newKnown}', is:`;
}

/** Verdicts × the dump → the changes this pass makes. Pure. */
function plan(db, verdicts = VERDICTS) {
  const P = Object.fromEntries(db.phrases.map((p) => [sid(p), p]));
  const L = Object.fromEntries(db.legos.map((l) => [l.lego_id, l]));
  const I = Object.fromEntries((db.intros || []).map((i) => [i.lego_id, i]));
  const out = { phrases: [], legos: [], deletes: [], held: [], skipped: [] };
  for (const [id, verdict, action, to, rule, why] of verdicts) {
    if (action === 'held') { out.held.push({ id, rule, why }); continue; }
    if (action !== 'fix' && action !== 'delete') { out.skipped.push({ id, verdict, why }); continue; }
    if (/^S0018/.test(id)) { out.skipped.push({ id, verdict, why: 'seed 18 belongs to job #449' }); continue; }
    if (P[id]) {
      const p = P[id];
      if (p.phrase_role === 'component') throw new Error(`${id}: components are not in this pass`);
      if (action === 'delete') { out.deletes.push({ id, before: [p.known_text, p.target_text], rule, why }); continue; }
      const after = [to[0] ?? p.known_text, to[1] ?? p.target_text];
      if (after[0] === p.known_text && after[1] === p.target_text) { out.skipped.push({ id, verdict, why: 'already reads this way (an earlier run applied it)' }); continue; }
      out.phrases.push({ id, before: [p.known_text, p.target_text], after, rule, why });
    } else if (L[id]) {
      if (action === 'delete') throw new Error(`${id}: a LEGO is never deleted`);
      const l = L[id];
      const after = [to[0] ?? l.known_text, to[1] ?? l.target_text];
      if (after[0] === l.known_text && after[1] === l.target_text) { out.skipped.push({ id, verdict, why: 'already reads this way (an earlier run applied it)' }); continue; }
      const intro = l.is_new && after[0] !== l.known_text ? introFor(I[id] && I[id].text, l.known_text, after[0]) : null;
      out.legos.push({ id, before: [l.known_text, l.target_text], after, intro, rule, why });
    } else if (action === 'delete') out.skipped.push({ id, verdict, why: 'already deleted (an earlier run)' });
    else throw new Error(`${id}: not in the dump (verdict says ${action})`);
  }
  return out;
}

/** The course as it would read after the plan — for the ZUT gate. */
function simulate(db, p) {
  const del = new Set(p.deletes.map((d) => d.id));
  const ph = Object.fromEntries(p.phrases.map((c) => [c.id, c]));
  const le = Object.fromEntries(p.legos.map((c) => [c.id, c]));
  return {
    seeds: db.seeds,
    legos: db.legos.map((l) => (le[l.lego_id] ? { ...l, id: l.lego_id, known_text: le[l.lego_id].after[0], target_text: le[l.lego_id].after[1] } : { ...l, id: l.lego_id })),
    phrases: db.phrases.filter((x) => !del.has(sid(x))).map((x) => (ph[sid(x)] ? { ...x, known_text: ph[sid(x)].after[0], target_text: ph[sid(x)].after[1] } : x)),
  };
}

/** Hold every change whose English would open a NEW strict ZUT group course-wide (K2). Mutates p. */
function zutGate(db, p, audit = require('./audit-phrase-zut.cjs')) {
  const groups = (rows) => new Map(audit.auditRows(rows).bidirectional.violationsStrict.map((v) => [v.known_norm, v]));
  const before = groups(simulate(db, { phrases: [], legos: [], deletes: [] }));
  for (let round = 0; round < 5; round++) {
    const after = groups(simulate(db, p));
    const fresh = new Set([...after.keys()].filter((k) => !before.has(k)));
    if (!fresh.size) return { before: before.size, after: after.size };
    const hit = (c) => fresh.has(audit.nk(c.after[0]));
    for (const c of [...p.phrases, ...p.legos].filter(hit)) {
      const forms = after.get(audit.nk(c.after[0])).distinct_targets.map((t) => t.example.target).join(' / ');
      p.held.push({ id: c.id, rule: 'K2', why: `ZUT: "${c.after[0]}" would stand over ${forms} — proposed ${c.after.join(' | ')}` });
    }
    p.phrases = p.phrases.filter((c) => !hit(c));
    p.legos = p.legos.filter((c) => !hit(c));
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
  for (const c of [...p.phrases, ...p.legos]) {
    if (c.after[0] !== c.before[0]) add('known', c.after[0], c.id);
    if (c.after[1] !== c.before[1]) { add('target1', c.after[1], c.id); add('target2', c.after[1], c.id); }
    if (c.intro) add('presentation', c.intro, c.id, c.id);
  }
  return [...m.values()];
}

/** The edit-batch ops; `expect` pins each row to the dump. `clips` (role\u0000text → audioId) adds an audio.link for every
 *  slot whose words changed, in the SAME transaction after the text: the text-change trigger does not re-point a slot to a
 *  clip in another voice, so without these the row would go silent (the #452 preview showed 34 such rows). */
function editOps(p, clips = null) {
  const links = [];
  const link = (target, key, slot, role, text) => {
    if (!clips) return;
    const audio_id = clips.get(`${role}\u0000${text}`);
    if (!audio_id) throw new Error(`${key[target === 'lego' ? 'lego_id' : 'phrase_id']}: no clip for ${role} "${text}"`);
    links.push({ op: 'audio.link', target, ...key, slot, audio_id });
  };
  for (const c of p.legos) {
    const key = { lego_id: c.id };
    if (c.after[0] !== c.before[0]) link('lego', key, 'known', 'known', c.after[0]);
    if (c.after[1] !== c.before[1]) { link('lego', key, 'target1', 'target1', c.after[1]); link('lego', key, 'target2', 'target2', c.after[1]); }
    if (c.intro) link('lego', key, 'presentation', 'presentation', c.intro);
  }
  for (const c of p.phrases) {
    const key = { phrase_id: `${COURSE}:${c.id}` };
    if (c.after[0] !== c.before[0]) link('phrase', key, 'known', 'known', c.after[0]);
    if (c.after[1] !== c.before[1]) { link('phrase', key, 'target1', 'target1', c.after[1]); link('phrase', key, 'target2', 'target2', c.after[1]); }
  }
  return [
    ...p.legos.map((c) => ({ op: 'lego.update', lego_id: c.id, set: { known_text: c.after[0], target_text: c.after[1] }, expect: { known_text: c.before[0], target_text: c.before[1] } })),
    ...p.phrases.map((c) => ({ op: 'phrase.update', phrase_id: `${COURSE}:${c.id}`, set: { known_text: c.after[0], target_text: c.after[1] }, expect: { known_text: c.before[0], target_text: c.before[1] } })),
    ...links,
    ...p.deletes.map((c) => ({ op: 'phrase.delete', phrase_id: `${COURSE}:${c.id}`, expect: { known_text: c.before[0], target_text: c.before[1] } })),
  ];
}

// A budget stop may leave later asks without clips. Keep the paid-render evidence
// and stop before previewing any edits when the clip map is incomplete.
function loggedEditOps(p, clips, log, save) {
  try { return editOps(p, clips); }
  catch (e) {
    log.applyError = e.message;
    console.error('apply stopped:', e.message, 'render log:', save('render-refused'));
    return null;
  }
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
  const RENDER = process.env.RENDER === '1', APPLY = process.env.APPLY === '1', MAX = +(process.env.MAX_CHARS || 6000);
  const db = JSON.parse(fs.readFileSync(dumpPath, 'utf8'));
  const p = plan(db);
  const zut = zutGate(db, p);
  const log = { job: '#452', started: new Date().toISOString(), zut, plan: p };
  const { evidencePath } = require('../lib/evidence-path.cjs');
  const save = (n) => { const f = evidencePath(`tools/course-optimization/fra-222-mismatch-pass-2026-10-14/${n}-${log.started.replace(/[:.]/g, '-')}.json`); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(log, null, 2)); return f; };
  console.log(`plan: ${p.phrases.length} phrase fixes, ${p.legos.length} LEGO fixes, ${p.deletes.length} deletes, ${p.held.length} held, ${p.skipped.length} no-op; ZUT strict ${zut.before} → ${zut.after}`);

  // 1. the route, dry
  const asks = clipAsks(p);
  log.asks = [];
  let chars = 0;
  for (const a of asks) {
    const d = await post(`${POPTY}/api/audio/render`, { courseCode: COURSE, role: a.role, text: a.text, purpose: PURPOSE, ...(a.legoId ? { legoId: a.legoId } : {}), dryRun: true });
    const ok = d.status === 200 && d.body.ok;
    const w = ok && d.body.source !== 'library' ? (d.body.wouldSpendChars || a.text.length) : 0;
    chars += w;
    log.asks.push({ ...a, dry: { status: d.status, source: d.body.source, chars: w, error: ok ? undefined : d.body } });
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
    // a library hit is asked for real too (0 chars) — that is how its clip id comes back for the audio.link below
    const r = await post(`${POPTY}/api/audio/render`, { courseCode: COURSE, role: a.role, text: a.text, purpose: PURPOSE, ...(a.legoId ? { legoId: a.legoId } : {}) });
    a.real = { status: r.status, source: r.body.source, audioId: r.body.audioId, charsSpent: r.body.charsSpent, error: r.status === 200 && r.body.ok ? undefined : r.body };
    if (a.real.error) { a.ids.forEach((i) => refused.add(i)); console.log('  REFUSED', a.role, JSON.stringify(a.text), r.status, JSON.stringify(r.body).slice(0, 200)); if (r.status === 402) break; }
  }
  // A 402 stops the loop: every ask it never reached has no clip either, so its rows are held too —
  // the rows that did render still go on to preview and the evidence save (lanes reviews of 5a2f8af, 7f8438c).
  for (const a of log.asks) if (!(a.real && a.real.audioId)) a.ids.forEach((i) => refused.add(i));
  log.charsSpent = log.asks.reduce((s, a) => s + ((a.real && a.real.charsSpent) || 0), 0);
  for (const id of refused) p.held.push({ id, rule: 'A4', why: 'its new clip was refused by the audio route, so the text was not switched' });
  p.phrases = p.phrases.filter((c) => !refused.has(c.id));
  p.legos = p.legos.filter((c) => !refused.has(c.id));
  console.log(`rendered: ${log.charsSpent} chars spent; ${refused.size} rows held for a refused clip`);
  if (!APPLY) return console.log('render log:', save('rendered'));

  // 3. the edit door: preview, then apply; keep the undo
  const clips = new Map(log.asks.filter((a) => a.real && a.real.audioId).map((a) => [`${a.role}\u0000${a.text}`, a.real.audioId]));
  const ops = loggedEditOps(p, clips, log, save);
  if (!ops) return;
  const prev = await post(`${POPTY}/api/production/${COURSE}/edit-batch`, { ops });
  const silent = (r) => (r.results || []).filter((x) => x.after && ['known_audio_id', 'target1_audio_id', 'target2_audio_id'].some((c) => c in x.after && !x.after[c])).map((x) => x.key);
  log.preview = { status: prev.status, results: prev.body.results, silentAfter: silent(prev.body), error: prev.status === 200 ? undefined : prev.body };
  console.log(`edit-batch preview: HTTP ${prev.status}; ${(prev.body.results || []).length} results; ${log.preview.silentAfter.length} rows would have a silent slot ${JSON.stringify(prev.body.error || '').slice(0, 300)}`);
  if (prev.status !== 200 || prev.body.ok === false) return console.log('preview refused:', save('preview-refused'));
  if (process.env.APPLY_CONFIRM !== '1') return console.log('preview only (APPLY_CONFIRM=1 to commit):', save('preview'));
  const res = await post(`${POPTY}/api/production/${COURSE}/edit-batch`, { ops, apply: true });
  log.applied = { status: res.status, eventId: res.body.event_id || null, undoFile: res.body.undo_file || null, undo: res.body.undo_ops || null, silentAfter: silent(res.body), results: res.body.results, error: res.status === 200 ? undefined : res.body };
  console.log(`edit-batch APPLY: HTTP ${res.status}; event ${log.applied.eventId}; undo_file ${log.applied.undoFile}; ${log.applied.silentAfter.length} rows with a silent slot ${JSON.stringify(res.body.error || '').slice(0, 300)}`);
  console.log('log (undo inside):', save('applied'));
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { loggedEditOps, plan, simulate, zutGate, clipAsks, editOps, introFor };
