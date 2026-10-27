#!/usr/bin/env node
'use strict';
// tools/course-optimization/spa-close-read-153-200-2026-10-27.cjs — spa_for_eng seeds 153-200, the CLEAR fixes from the
// three close-reading reports (job #99; Kai approved the plan 2026-10-27: clear defects in batches by class, canon,
// knock-on checks, audio only for changed rows). The fixes are data: ./spa-close-read-153-200-2026-10-27.data.cjs.
//
// Each fix is re-checked on the LIVE course before it is sent, and is SKIPPED (never forced) when:
//   drift       the row no longer reads as the report read it (or is gone)
//   P17/K49     a row that held its LEGO no longer does, either side (split/reordered counts: decomposeAnchored + in-order words)
//   P1/P2       the new Spanish brings in a word not taught by that seed (seeds and LEGOs before it, earlier siblings)
//   ZUT         the new pair makes a clash that was not there: one English → two Spanish, or one Spanish → two English,
//               against every seed, LEGO and phrase in the course
//   duplicate   the new pair is already another row in the same basket
//   floor       a delete would leave the basket under 4 USE or with no BUILD
// No LEGO, seed sentence or intro is touched. An edit unapproves its seed (O5) when the seed was approved.
//
// Writes go ONLY through Popty: the audio route (POST /api/audio/render: dry run first, library first, one real call per
// clip, no retries) and edit-batch (dry run, then apply). The new text and its clips go in ONE transaction, so a row is
// never left speaking its old words (make-before-break: the clips exist before the text switches).
//
//   node …cjs check  <seeds.json> [--class C]   # gates only (pure, no network); seeds.json = GET /api/production/spa_for_eng/seeds
//   node …cjs dry    <seeds.json> [--class C]   # + the audio route dry run
//   RENDER=1 node …cjs run <seeds.json> --class C            # + real renders, then the edit-batch dry run
//   RENDER=1 APPLY_CONFIRM=1 node …cjs run <seeds.json> --class C   # + apply (the response carries event_id + undo_file)
//   node …cjs verify <seeds.json>               # on a fresh dump: every applied fix reads right and its clips speak it
const fs = require('fs');
const path = require('path');
const { COURSE, FIXES } = require('./spa-close-read-153-200-2026-10-27.data.cjs');

const AGENT = 'spa-close-read-153-200 (job #99)';
const PURPOSE = 'job #99 spa_for_eng seeds 153-200 clear phrase fixes (close reading, Kai approved 27 Oct)';
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
const USE_FLOOR = 4;

const pid = (id) => `${COURSE}:${id}`;
const sid = (id) => String(id).split(':').pop();
const legoOf = (id) => id.slice(0, 8);

// ── normalisers (the ZUT audit's own: tools/course-optimization/audit-phrase-zut.cjs) ─────────────────
const nk = (s) => (s || '').toLowerCase().trim().replace(/[.?!,，。？！、]+$/, '');
const ntStrict = (s) => (s || '').replace(/[\s。，？！、.?!,]/g, '').toLowerCase().replace(/[¿¡«»"'’]/g, '');
const words = (s) => String(s || '').normalize('NFC').toLowerCase().replace(/[’‘`´]/g, "'").replace(/[^\p{L}\p{M}\p{N}' ]/gu, ' ').split(/\s+/).filter(Boolean);

/** K49: every LEGO word appears in the phrase — contiguous, split, or reordered ("you have heard" holds "have you heard"). */
function holdsInOrder(text, lego) {
  const t = words(text), l = words(lego);
  const left = new Map(); for (const w of t) left.set(w, (left.get(w) || 0) + 1);
  for (const w of l) { if (!left.get(w)) return false; left.set(w, left.get(w) - 1); }
  return true;
}

/** The dump the gates read, from Popty's seeds listing. */
function fromApi(api) {
  const seeds = [], legos = [], phrases = [];
  for (const s of api.seeds) {
    const { legos: ls, ...seed } = s; seeds.push(seed);
    for (const l of ls || []) { const { basket_phrases, ...lego } = l; legos.push(lego); for (const p of basket_phrases || []) phrases.push(p); }
  }
  return { seeds, legos, phrases };
}

/** Taught target words for a phrase under LEGO `legoId`: seeds before its seed, LEGOs (+ components) before it, earlier siblings and itself. */
function taughtKeys(db, legoId, tw) {
  const seedN = Number(legoId.slice(1, 5)), idx = Number(legoId.slice(6, 8));
  const t = [];
  for (const s of db.seeds) if (s.seed_number < seedN) t.push(s.target_text);
  for (const l of db.legos) {
    if (l.seed_number < seedN || (l.seed_number === seedN && l.lego_index <= idx)) {
      t.push(l.target_text);
      for (const c of l.components || []) if (c && c.target) t.push(c.target);
    }
  }
  return tw.taughtWordKeys(t, COURSE);
}

/** Who a row clashes with: rows sharing its English with different Spanish, and rows sharing its Spanish with different English. */
function clashes(all, row) {
  const k = nk(row.known_text), t = ntStrict(row.target_text);
  const out = new Set();
  for (const r of all) {
    if (r.key === row.key || r.phrase_role === 'component') continue;
    if (nk(r.known_text) === k && ntStrict(r.target_text) !== t) out.add(`EN→2ES ${r.key}: ${r.known_text} | ${r.target_text}`);
    if (ntStrict(r.target_text) === t && nk(r.known_text) !== k) out.add(`ES→2EN ${r.key}: ${r.known_text} | ${r.target_text}`);
  }
  return out;
}

/** The plan (pure): which fixes go, which are skipped and why. */
function plan(db, { only = null, decomposer = require('../../services/phrase-decomposer.cjs'), tw = require('../../services/course-builder/lib/taught-words.cjs') } = {}) {
  const live = new Map(db.phrases.map((p) => [sid(p.id), p]));
  const legoById = new Map(db.legos.map((l) => [l.lego_id, l]));
  const fixes = FIXES.filter(([, cls]) => !only || cls === only);
  const deleting = new Set(fixes.filter((f) => f[3] === null).map((f) => f[0]));
  const updates = new Map();
  const go = [], skipped = [];

  // the course as it would read with every candidate applied (for clashes between the fixes themselves)
  for (const [id, , , fix] of fixes) if (fix) {
    const cur = live.get(id);
    if (cur) updates.set(id, { known_text: fix[0] ?? cur.known_text, target_text: fix[1] ?? cur.target_text });
  }
  const tag = (kind, key, r) => ({ key, known_text: r.known_text, target_text: r.target_text, phrase_role: r.phrase_role || kind });
  const before = [
    ...db.seeds.map((s) => tag('seed', `seed ${s.seed_number}`, s)),
    ...db.legos.map((l) => tag('lego', l.lego_id, l)),
    ...db.phrases.map((p) => tag(null, sid(p.id), p)),
  ];
  const after = before.filter((r) => !deleting.has(r.key)).map((r) => (updates.has(r.key) ? { ...r, ...updates.get(r.key) } : r));

  for (const [id, cls, now, fix] of fixes) {
    const cur = live.get(id);
    const skip = (why) => skipped.push({ id, cls, why });
    if (!cur) { skip('drift: the row is gone'); continue; }
    if (cur.known_text !== now[0] || cur.target_text !== now[1]) { skip(`drift: now reads "${cur.known_text} | ${cur.target_text}"`); continue; }
    const lego = legoById.get(legoOf(id));
    if (!lego) { skip('its LEGO is not in the dump'); continue; }
    const basket = db.phrases.filter((p) => sid(p.id).startsWith(lego.lego_id) && p.phrase_role !== 'component');

    if (fix === null) {
      const left = basket.filter((p) => !deleting.has(sid(p.id)));
      const use = left.filter((p) => p.phrase_role === 'use').length, build = left.filter((p) => p.phrase_role === 'build').length;
      if (cur.phrase_role === 'use' && use < USE_FLOOR) { skip(`floor: would leave ${use} USE under ${lego.lego_id}`); continue; }
      if (cur.phrase_role === 'build' && build < 1) { skip(`floor: would leave no BUILD under ${lego.lego_id}`); continue; }
      go.push({ id, cls, kind: 'delete', before: cur, lego, left: { build, use } });
      continue;
    }

    const next = updates.get(id);
    const problems = [];
    // P17 / K49 on both sides, as a REGRESSION test: a row that held its LEGO must still hold it. A row that never held it
    // (a LEGO gloss the reports list as Kai's question, e.g. "therefore" over "so") is not made worse by a fix, and is noted.
    const vocab = db.legos.filter((l) => l.seed_number <= lego.seed_number).map((l) => ({ lego_id: l.lego_id, target_text: l.target_text, known_text: l.known_text, seed_number: l.seed_number }));
    const parent = { lego_id: lego.lego_id, target_text: lego.target_text, known_text: lego.known_text };
    const dec = decomposer.decomposeAnchored(next.target_text, vocab, parent, COURSE);
    const heldEn = holdsInOrder(cur.known_text, lego.known_text), heldEs = decomposer.decomposeAnchored(cur.target_text, vocab, parent, COURSE).kind !== 'error';
    if (heldEn && !holdsInOrder(next.known_text, lego.known_text)) problems.push(`P17 English no longer holds "${lego.known_text}"`);
    if (heldEs && dec.kind === 'error') problems.push(`P17 Spanish no longer holds "${lego.target_text}"`);
    const notes = [];
    if (!heldEn) notes.push(`English never held "${lego.known_text}"`);
    if (!heldEs) notes.push(`Spanish never held "${lego.target_text}"`);
    // P1 / P2: words the fix brings in must be taught by this point
    if (next.target_text !== cur.target_text) {
      const keys = taughtKeys(db, lego.lego_id, tw);
      const was = new Set(tw.untaughtWords(cur.target_text, keys, COURSE).map((w) => w.toLowerCase()));
      const un = tw.untaughtWords(next.target_text, keys, COURSE).filter((w) => !was.has(w.toLowerCase()));
      if (un.length) problems.push(`P1 untaught: ${un.join(', ')}`);
    }
    // ZUT both ways, against the whole course (new clashes only)
    const b4 = clashes(before, before.find((r) => r.key === id));
    const af = [...clashes(after, after.find((r) => r.key === id))].filter((c) => !b4.has(c));
    if (af.length) problems.push(`ZUT new clash: ${af.join(' ; ')}`);
    // the same pair already in the basket
    const twin = basket.find((p) => sid(p.id) !== id && !deleting.has(sid(p.id)) && nk((updates.get(sid(p.id)) || p).known_text) === nk(next.known_text) && ntStrict((updates.get(sid(p.id)) || p).target_text) === ntStrict(next.target_text));
    if (twin) problems.push(`duplicate of ${sid(twin.id)}`);
    if (problems.length) { skip(problems.join(' | ')); continue; }

    const set = {};
    if (next.known_text !== cur.known_text) set.known_text = next.known_text;
    if (next.target_text !== cur.target_text) {
      set.target_text = next.target_text;
      set.word_count = next.target_text.length; // the column holds the target's character length (read off live rows)
      if (dec.kind !== 'error') set.decomposition = dec.blocks;
    }
    go.push({ id, cls, kind: 'update', before: cur, lego, set, notes, sides: { known: 'known_text' in set, target: 'target_text' in set } });
  }
  // O5: an edit unapproves its seed, when the seed was approved
  const seedsTouched = [...new Set(go.map((g) => g.before.seed_number))];
  const unapprove = db.seeds.filter((s) => seedsTouched.includes(s.seed_number) && s.approved_at).map((s) => ({ seed_number: s.seed_number, approved_at: s.approved_at }));
  return { go, skipped, unapprove };
}

/** Every clip the plan needs: English → known; Spanish → target1 + target2 (the course's two target voices). */
function clipAsks(p) {
  const m = new Map();
  const add = (role, text, id) => { const k = `${role}\u0000${text}`; if (!m.has(k)) m.set(k, { role, text, ids: [] }); m.get(k).ids.push(id); };
  for (const g of p.go) if (g.kind === 'update') {
    if (g.sides.known) add('known', g.set.known_text, g.id);
    if (g.sides.target) { add('target1', g.set.target_text, g.id); add('target2', g.set.target_text, g.id); }
  }
  return [...m.values()];
}

/** The edit-batch ops: text (with its before-state asserted), then the new clips, same transaction; deletes; seed unapprovals. */
function editOps(p, clips) {
  const get = (role, text) => { const a = clips.get(`${role}\u0000${text}`); if (!a) throw new Error(`no clip for ${role} "${text}"`); return a; };
  const ops = [], links = [];
  for (const g of p.go) {
    const expect = { known_text: g.before.known_text, target_text: g.before.target_text };
    if (g.kind === 'delete') { ops.push({ op: 'phrase.delete', phrase_id: pid(g.id), expect }); continue; }
    ops.push({ op: 'phrase.update', phrase_id: pid(g.id), set: g.set, expect });
    if (g.sides.known) links.push({ op: 'audio.link', target: 'phrase', phrase_id: pid(g.id), slot: 'known', audio_id: get('known', g.set.known_text) });
    if (g.sides.target) for (const slot of ['target1', 'target2']) links.push({ op: 'audio.link', target: 'phrase', phrase_id: pid(g.id), slot, audio_id: get(slot, g.set.target_text) });
  }
  // No before-state on approved_at: the API and the engine spell the same timestamp differently, and clearing it is idempotent.
  for (const s of p.unapprove) ops.push({ op: 'seed.update', seed_number: s.seed_number, set: { approved_at: null } });
  return ops.concat(links);
}

/** "…already has a working clip (<uuid> in <voice>)…" → { audioId, voiceId }. */
function existingClipOf(message) {
  const m = /already has a working clip \(([0-9a-f-]{36}) in ([^)\s]+)\)/.exec(String(message || ''));
  return m ? { audioId: m[1], voiceId: m[2] } : null;
}

async function post(url, body) {
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body), signal: AbortSignal.timeout(180000) });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  } catch (e) { return { status: 0, body: { ok: false, error: String((e.cause && e.cause.code) || e.name) } }; }
}

/** After applying: every fix reads its new text (or is gone), and each changed slot holds a clip of exactly that text. */
async function verify(db, clipText) {
  const live = new Map(db.phrases.map((p) => [sid(p.id), p]));
  const bad = [], ok = [];
  for (const [id, cls, , fix] of FIXES) {
    const cur = live.get(id);
    if (fix === null) { (cur ? bad : ok).push({ id, cls, what: cur ? 'still present' : 'deleted' }); continue; }
    if (!cur) { bad.push({ id, cls, what: 'gone' }); continue; }
    const k = fix[0], t = fix[1];
    if ((k && cur.known_text !== k) || (t && cur.target_text !== t)) continue; // not applied (skipped) — reported by the run log
    const slots = [...(k ? [['known_audio_id', k]] : []), ...(t ? [['target1_audio_id', t], ['target2_audio_id', t]] : [])];
    const wrong = [];
    for (const [col, text] of slots) {
      const said = cur[col] ? await clipText(cur[col]) : null;
      if (!said || ntStrict(said) !== ntStrict(text)) wrong.push(`${col}=${cur[col]} says ${JSON.stringify(said)}`);
    }
    (wrong.length ? bad : ok).push({ id, cls, what: wrong.length ? wrong.join('; ') : 'text + clips match' });
  }
  return { ok, bad };
}

async function main() {
  const args = process.argv.slice(2);
  const [mode, file] = args;
  const only = args.includes('--class') ? args[args.indexOf('--class') + 1] : null;
  if (!mode || !file) throw new Error('usage: check|dry|run|verify <seeds.json> [--class C]');
  const db = fromApi(JSON.parse(fs.readFileSync(file, 'utf8')));
  const out = process.env.LOG_DIR || process.cwd();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const save = (n, log) => { const f = path.join(out, `spa-153-200-${n}${only ? '-' + only : ''}-${stamp}.json`); fs.writeFileSync(f, JSON.stringify(log, null, 2)); return f; };

  if (mode === 'verify') {
    const ids = process.env.CLIP_TEXT_FILE ? JSON.parse(fs.readFileSync(process.env.CLIP_TEXT_FILE, 'utf8')) : null;
    if (!ids) throw new Error('verify needs CLIP_TEXT_FILE: {audio_id: text} from tools/audio/clip-voices.cjs');
    const r = await verify(db, async (a) => ids[a] ?? null);
    console.log(`verify: ${r.ok.length} ok, ${r.bad.length} bad`);
    for (const b of r.bad) console.log('  BAD', b.id, b.what);
    console.log(save('verify', r));
    if (r.bad.length) process.exitCode = 1;
    return;
  }

  const p = plan(db, { only });
  const by = {}; for (const g of p.go) by[g.cls] = (by[g.cls] || 0) + 1;
  console.log(`plan${only ? ` (${only})` : ''}: ${p.go.length} go ${JSON.stringify(by)}, ${p.skipped.length} skipped, ${p.unapprove.length} seeds to unapprove`);
  for (const s of p.skipped) console.log('  SKIP', s.id, s.cls, '—', s.why);
  for (const g of p.go) if (g.notes && g.notes.length) console.log('  NOTE', g.id, '—', g.notes.join('; '));
  if (mode === 'check') return console.log(save('check', p));

  const asks = clipAsks(p);
  const log = { job: '#99', started: stamp, class: only, plan: p, asks: [] };
  let chars = 0;
  for (const a of asks) {
    const d = await post(`${POPTY}/api/audio/render`, { courseCode: COURSE, role: a.role, text: a.text, purpose: PURPOSE, dryRun: true });
    const ok = d.status === 200 && d.body.ok;
    const w = ok && d.body.source !== 'library' ? (d.body.wouldSpendChars || a.text.length) : 0;
    chars += w;
    // The door refuses to re-record words that already have a working clip in this course (Tom 2026-10-11). That clip
    // speaks exactly these words, so it is linked as it is — nothing rendered (audio.link still checks the words match).
    const existing = !ok && d.body.code === 'RERECORD_NOT_PERMITTED' ? existingClipOf(d.body.error) : null;
    log.asks.push({ ...a, dry: { status: d.status, source: existing ? 'existing-clip' : d.body.source, voiceId: d.body.voiceId, chars: w, existing, error: ok || existing ? undefined : d.body } });
  }
  const refusedDry = log.asks.filter((a) => a.dry.error);
  console.log(`route dry run: ${asks.length} asks, ${log.asks.filter((a) => a.dry.source === 'library').length} from library, ${chars} chars to render, ${refusedDry.length} refused`);
  for (const a of refusedDry) console.log('  REFUSED (dry)', a.role, JSON.stringify(a.text), a.dry.status, JSON.stringify(a.dry.error).slice(0, 300));
  if (mode === 'dry' || process.env.RENDER !== '1') return console.log('dry log:', save('dry', log));
  if (refusedDry.length) { console.log('STOP: the route refused a clip in the dry run; nothing rendered'); return console.log(save('stopped', log)); }
  const MAX = +(process.env.MAX_CHARS || 8000);
  if (chars > MAX) { console.log(`STOP: ${chars} chars > MAX_CHARS ${MAX}; nothing rendered`); return console.log(save('stopped', log)); }

  for (const a of log.asks) {
    if (a.dry.existing) { a.real = { source: 'existing-clip', audioId: a.dry.existing.audioId, voiceId: a.dry.existing.voiceId, charsSpent: 0 }; continue; }
    const r = await post(`${POPTY}/api/audio/render`, { courseCode: COURSE, role: a.role, text: a.text, purpose: PURPOSE });
    a.real = { status: r.status, source: r.body.source, audioId: r.body.audioId, voiceId: r.body.voiceId, charsSpent: r.body.charsSpent, error: r.status === 200 && r.body.ok ? undefined : r.body };
    if (a.real.error) { console.log('  REFUSED', a.role, JSON.stringify(a.text), r.status, JSON.stringify(r.body).slice(0, 300)); console.log(save('render-refused', log)); return console.log('a clip was refused — no retry; no text switched; nothing applied'); }
  }
  log.charsSpent = log.asks.reduce((s, a) => s + ((a.real && a.real.charsSpent) || 0), 0);
  console.log(`rendered: ${log.charsSpent} chars spent`);
  const clips = new Map(log.asks.map((a) => [`${a.role}\u0000${a.text}`, a.real.audioId]));
  const ops = editOps(p, clips);
  log.ops = ops;
  const dry = await post(`${POPTY}/api/production/${COURSE}/edit-batch`, { ops });
  log.editDry = { status: dry.status, error: dry.body.error, code: dry.body.code, results: (dry.body.results || []).length };
  console.log(`edit-batch dry run: ${dry.status} ${dry.body.error || ''} (${log.editDry.results} results)`);
  if (dry.status !== 200 || process.env.APPLY_CONFIRM !== '1') return console.log(save(dry.status === 200 ? 'previewed' : 'edit-refused', log));
  const ap = await post(`${POPTY}/api/production/${COURSE}/edit-batch`, { ops, apply: true });
  log.apply = { status: ap.status, event_id: ap.body.event_id, undo_file: ap.body.undo_file, error: ap.body.error, code: ap.body.code, undo_ops: ap.body.undo_ops };
  console.log(`edit-batch APPLY: ${ap.status} event ${ap.body.event_id} undo ${ap.body.undo_file} ${ap.body.error || ''}`);
  console.log(save(ap.status === 200 ? 'applied' : 'apply-refused', log));
  if (ap.status !== 200) process.exitCode = 1;
}

if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
module.exports = { plan, clipAsks, editOps, verify, holdsInOrder, clashes, fromApi, existingClipOf };
