#!/usr/bin/env node
'use strict';
// tools/course-optimization/spa-kai-rulings-2026-10-30.cjs — spa_for_eng: Kai's rulings of 30 Oct on the items held from
// Deborah's answers (job #223). The rows, LEGO re-cuts and the reasons are in ./spa-kai-rulings-2026-10-30.data.cjs.
//
// Every change is checked on the course AS IT WILL BE (all changes applied), and the run stops before writing anything if:
//   drift        a row's live text is not what the data was written against (id missing, or already changed)
//   holds        a BUILD/USE row (or a seed) no longer contains its LEGO on both sides
//   untaught     the new Spanish brings in a word not taught by that point (the fixed enclitic gate: -lo counts only
//                once an infinitive+lo has been taught)
//   zut          the new pair makes a NEW "same English → two Spanish" clash anywhere in the course
//   copy         the new pair is an exact copy of another row in its basket
// and it REPORTS (does not stop) every row elsewhere in the course whose taught-word check gets worse because a LEGO moved.
//
//   node …cjs check  <seeds.json>                  # plan + gates (pure; seeds.json = GET /api/production/spa_for_eng/seeds)
//   APPLY_CONFIRM=1 node …cjs apply <seeds.json>   # edit-batch dry run then apply, 25 ops a batch; new LEGO + its basket
//   node …cjs audio  <fresh.json> [render]         # every played slot of a touched row that is EMPTY: the audio route
//                                                  # (library first) — a dry run unless `render`; then links what it got
//   node …cjs verify <fresh.json>                  # the live course holds every change; 0 empty played slots
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const D = require('./spa-kai-rulings-2026-10-30.data.cjs');
const { holdsInOrder, fromApi } = require('./spa-close-read-153-200-2026-10-27.cjs');
const { untaughtNew, makeTaught, zutIndex, nk, ntStrict } = require('./spa-deborah-129-2026-10-29.cjs');

const { COURSE, APPROVAL } = D;
const AGENT = 'spa-kai-rulings (job #223)';
const PURPOSE = 'job #223 spa_for_eng Kai rulings 30 Oct on Deborah held items';
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
const BATCH = 25;
const sid = (id) => String(id).split(':').pop();
const legoOf = (id) => id.slice(0, 8);
const seedOf = (id) => Number(String(id).slice(1, 5));

/** makeTaught answers correctly only when asked in course order; this one starts again whenever it is asked for an earlier LEGO. */
function taughtInOrder(state, tw) {
  let f = makeTaught(state, tw), last = '';
  const cache = new Map();
  return (legoId) => {
    if (cache.has(legoId)) return cache.get(legoId);
    if (legoId < last) f = makeTaught(state, tw);
    last = legoId;
    const k = f(legoId); cache.set(legoId, k); return k;
  };
}

/** Every phrase change as {id, item, known, target} with nulls filled from the live row. */
function phraseChanges(db) {
  const byId = new Map(db.phrases.map((p) => [sid(p.id), p]));
  const out = [], drift = [];
  for (const [item, rows] of Object.entries(D.PHRASES)) {
    for (const [id, k, t] of rows) {
      const p = byId.get(id);
      if (!p) { drift.push(`${id}: no such row`); continue; }
      const known = k == null ? p.known_text : k, target = t == null ? p.target_text : t;
      if (known === p.known_text && target === p.target_text) { drift.push(`${id}: already reads the new text`); continue; }
      out.push({ id, item, before: p, known, target });
    }
  }
  return { out, drift };
}

/** The course as it will read once every change is in. */
function afterState(db, changes) {
  const lset = new Map(D.LEGOS.map((l) => [l.lego_id, l.set]));
  const sset = new Map(D.SEEDS.map(([n, , k, t]) => [n, { k, t }]));
  const pset = new Map(changes.map((c) => [c.id, c]));
  const legos = db.legos.map((l) => (lset.has(l.lego_id) ? { ...l, ...lset.get(l.lego_id) } : l));
  const nl = D.NEW_LEGO.row;
  legos.push({ ...nl, lego_id: `S${String(nl.seed_number).padStart(4, '0')}L${String(nl.lego_index).padStart(2, '0')}` });
  const seeds = db.seeds.map((s) => (sset.has(s.seed_number) ? { ...s, known_text: sset.get(s.seed_number).k ?? s.known_text, target_text: sset.get(s.seed_number).t } : s));
  const phrases = db.phrases.map((p) => (pset.has(sid(p.id)) ? { ...p, known_text: pset.get(sid(p.id)).known, target_text: pset.get(sid(p.id)).target } : p));
  const newId = legos[legos.length - 1].lego_id;
  for (const role of ['build', 'use']) D.NEW_BASKET[role].forEach(([k, t], i) => phrases.push({ id: `${COURSE}:${newId}${role === 'build' ? 'B' : 'U'}${String(i + 1).padStart(2, '0')}`, phrase_role: role, known_text: k, target_text: t, seed_number: nl.seed_number, _new: true }));
  return { seeds, legos, phrases };
}

function plan(db, { tw = require('../../services/course-builder/lib/taught-words.cjs') } = {}) {
  const { out: changes, drift } = phraseChanges(db);
  const legoNow = new Map(db.legos.map((l) => [l.lego_id, l]));
  for (const l of D.LEGOS) if (!legoNow.has(l.lego_id)) drift.push(`${l.lego_id}: no such LEGO`);
  if (legoNow.has('S0098L05')) drift.push('S0098L05 already exists');
  const seedNow = new Map(db.seeds.map((s) => [s.seed_number, s]));
  const seedChanges = D.SEEDS.map(([n, item, k, t]) => ({ n, item, before: seedNow.get(n), known: k ?? seedNow.get(n).known_text, target: t }));
  for (const s of seedChanges) if (s.before.target_text === s.target && s.before.known_text === s.known) drift.push(`seed ${s.n}: already reads the new text`);

  const after = afterState(db, changes);
  const legoAfter = new Map(after.legos.map((l) => [l.lego_id, l]));
  const gates = { holds: [], untaught: [], zut: [], copy: [] };

  // holds: every changed or new row, and the whole basket of a re-cut LEGO, must contain its LEGO on both sides (an English
  // LEGO's leading "to" may drop: "I should play something" holds "to play something"). A row that did not hold its
  // LEGO before this pass and is not ours is not this pass's business.
  const recut = new Set([...D.LEGOS.map((l) => l.lego_id), 'S0098L05']);
  const changedIds = new Set(changes.map((c) => c.id));
  const holdsK = (text, lego) => holdsInOrder(text, lego) || holdsInOrder(text, lego.replace(/^to /i, ''));
  for (const p of after.phrases) {
    const id = sid(p.id), l = legoAfter.get(legoOf(id));
    if (!l || p.phrase_role === 'component' || !(recut.has(l.lego_id) || changedIds.has(id) || p._new)) continue;
    if (!recut.has(l.lego_id)) { const b = db.phrases.find((q) => q.id === p.id); if (!(holdsInOrder(b.target_text, l.target_text) && holdsK(b.known_text, l.known_text))) continue; }
    if (!holdsInOrder(p.target_text, l.target_text)) gates.holds.push(`${id} Spanish lacks "${l.target_text}": ${p.target_text}`);
    if (!holdsK(p.known_text, l.known_text) && !D.CONTAINMENT_OK[l.lego_id]) gates.holds.push(`${id} English lacks "${l.known_text}": ${p.known_text}`);
  }
  for (const s of seedChanges) for (const l of after.legos.filter((x) => x.seed_number === s.n && x.is_new)) {
    if (D.CONTAINMENT_OK[`seed ${s.n}`] && !recut.has(l.lego_id)) continue;
    const before = legoNow.get(l.lego_id);
    if (!recut.has(l.lego_id) && !(holdsInOrder(s.before.target_text, before.target_text) && holdsK(s.before.known_text, before.known_text))) continue;
    const ok = holdsInOrder(s.target, l.target_text) && (holdsK(s.known, l.known_text) || D.CONTAINMENT_OK[`seed ${s.n}`]);
    if (!ok) gates.holds.push(`seed ${s.n} lacks ${l.lego_id} "${l.known_text} | ${l.target_text}"`);
  }

  // untaught (post-state vocabulary), ZUT and basket copies
  const keysAfter = taughtInOrder(after, tw);
  const rows = (st) => [
    ...st.seeds.map((s) => ({ key: `seed ${s.seed_number}`, known_text: s.known_text, target_text: s.target_text, phrase_role: 'seed' })),
    ...st.legos.map((l) => ({ key: l.lego_id, known_text: l.known_text, target_text: l.target_text, phrase_role: 'lego' })),
    ...st.phrases.map((p) => ({ key: sid(p.id), known_text: p.known_text, target_text: p.target_text, phrase_role: p.phrase_role })),
  ];
  const zb = zutIndex(rows(db)), za = zutIndex(rows(after));
  const checkRow = (key, legoId, b, a) => {
    const un = untaughtNew(tw, keysAfter(legoId), b ? b.target_text : '', a.target_text);
    if (un.length) gates.untaught.push(`${key}: ${un.join(', ')} — ${a.target_text}`);
    const was = b ? zb.clashes({ key, known_text: b.known_text, target_text: b.target_text }) : new Set();
    const hard = [...za.clashes({ key, known_text: a.known_text, target_text: a.target_text })].filter((c) => !was.has(c) && c.startsWith('EN→2ES'));
    if (hard.length) gates.zut.push(`${key} "${a.known_text}" → ${a.target_text}: ${hard.slice(0, 4).join(' ; ')}`);
  };
  for (const c of changes) {
    checkRow(c.id, legoOf(c.id), c.before, { known_text: c.known, target_text: c.target });
    if (c.before.phrase_role === 'component') continue;
    const twin = after.phrases.find((q) => sid(q.id) !== c.id && sid(q.id).startsWith(legoOf(c.id)) && q.phrase_role !== 'component' && nk(q.known_text) === nk(c.known) && ntStrict(q.target_text) === ntStrict(c.target));
    const twinBefore = twin && db.phrases.find((q) => q.id === twin.id);
    const wasTwin = twinBefore && nk(twinBefore.known_text) === nk(c.before.known_text) && ntStrict(twinBefore.target_text) === ntStrict(c.before.target_text);
    if (twin && !wasTwin) gates.copy.push(`${c.id} = ${sid(twin.id)}: ${c.known} | ${c.target}`);
  }
  for (const p of after.phrases.filter((x) => x._new)) checkRow(sid(p.id), legoOf(sid(p.id)), null, p);
  for (const s of seedChanges) {
    const last = after.legos.filter((l) => l.seed_number === s.n).sort((a, b) => b.lego_index - a.lego_index)[0];
    checkRow(`seed ${s.n}`, last.lego_id, s.before, { known_text: s.known, target_text: s.target });
  }
  for (const l of D.LEGOS) checkRow(l.lego_id, l.lego_id, legoNow.get(l.lego_id), legoAfter.get(l.lego_id));

  // knock-on: every row in the course whose taught-word check gets worse because a LEGO or seed moved
  const keysBefore = taughtInOrder(db, tw), keysAfter2 = taughtInOrder(after, tw);
  const changed = new Set(changes.map((c) => c.id));
  const knockOn = [];
  for (const p of [...after.phrases].sort((a, b) => (sid(a.id) < sid(b.id) ? -1 : 1))) {
    const id = sid(p.id);
    if (changed.has(id) || p._new || p.phrase_role === 'component' || seedOf(id) < 55) continue;
    const b = tw.untaughtWords(p.target_text, keysBefore(legoOf(id)), COURSE), a = tw.untaughtWords(p.target_text, keysAfter2(legoOf(id)), COURSE);
    const worse = a.filter((w) => !b.includes(w));
    if (worse.length) knockOn.push(`${id}: ${worse.join(', ')} — ${p.known_text} | ${p.target_text}`);
  }

  const touchedSeeds = new Set([...changes.map((c) => seedOf(c.id)), ...seedChanges.map((s) => s.n), ...D.LEGOS.map((l) => seedOf(l.lego_id)), 98]);
  const unapprove = db.seeds.filter((s) => touchedSeeds.has(s.seed_number) && s.approved_at).map((s) => s.seed_number);
  return { changes, seedChanges, drift, gates, knockOn, unapprove, touchedSeeds: [...touchedSeeds].sort((a, b) => a - b), after };
}

function editOps(p, db) {
  const legoNow = new Map(db.legos.map((l) => [l.lego_id, l]));
  const ops = [];
  for (const l of D.LEGOS) {
    const b = legoNow.get(l.lego_id);
    ops.push({ op: 'lego.update', lego_id: l.lego_id, set: l.set, expect: { known_text: b.known_text, target_text: b.target_text } });
  }
  for (const s of p.seedChanges) {
    const set = { target_text: s.target }; if (s.known !== s.before.known_text) set.known_text = s.known;
    ops.push({ op: 'seed.update', seed_number: s.n, set, expect: { known_text: s.before.known_text, target_text: s.before.target_text } });
  }
  for (const c of p.changes) {
    const set = {};
    if (c.known !== c.before.known_text) set.known_text = c.known;
    if (c.target !== c.before.target_text) { set.target_text = c.target; set.word_count = c.target.length; }
    ops.push({ op: 'phrase.update', phrase_id: `${COURSE}:${c.id}`, set, expect: { known_text: c.before.known_text, target_text: c.before.target_text } });
  }
  return ops;
}

async function post(url, body, agent = AGENT) {
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': agent }, body: JSON.stringify(body), signal: AbortSignal.timeout(300000) });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  } catch (e) { return { status: 0, body: { ok: false, error: String((e.cause && e.cause.code) || e.name) } }; }
}
/** A structural op (lego.insert) on a released course needs the Kai-only key (kai_go, Tom 2026-10-15). */
function kaiCall(method, urlPath, body) {
  const f = path.join(process.env.TMPDIR || '/tmp', `kai-call-${process.pid}.json`);
  fs.writeFileSync(f, JSON.stringify(body));
  try {
    const out = execFileSync('node', [path.join(__dirname, '..', 'agent-admin', 'call.cjs'), '--key', 'kai', '--agent', 'kai-223-spa-rulings', method, urlPath, '--body-file', f], { encoding: 'utf8' });
    return JSON.parse(out.slice(out.indexOf('{')));
  } catch (e) { return { error: String(e.stdout || e.message).slice(0, 800) }; } finally { fs.unlinkSync(f); }
}

// ── audio ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
const SLOT = { known: 'known_audio_id', target1: 'target1_audio_id', target2: 'target2_audio_id' };
const introLine = (known) => `The Spanish for: '${known}', is:`;
/** Every played slot of a touched row that is empty now: seeds, is_new LEGOs (+ intro), BUILD/USE rows of is_new LEGOs. */
function emptySlots(fresh, p) {
  const legos = new Map(fresh.legos.map((l) => [l.lego_id, l]));
  const ids = new Set([...p.changes.map((c) => c.id), ...fresh.phrases.filter((x) => sid(x.id).startsWith('S0098L05')).map((x) => sid(x.id))]);
  const out = [];
  for (const s of fresh.seeds.filter((x) => p.seedChanges.some((c) => c.n === x.seed_number)))
    for (const [role, col] of Object.entries(SLOT)) if (!s[col]) out.push({ kind: 'seed', key: s.seed_number, role, text: role === 'known' ? s.known_text : s.target_text });
  for (const id of [...D.LEGOS.map((l) => l.lego_id), 'S0098L05']) {
    const l = legos.get(id); if (!l) continue;
    for (const [role, col] of Object.entries(SLOT)) if (!l[col]) out.push({ kind: 'lego', key: id, role, text: role === 'known' ? l.known_text : l.target_text });
    if (!l.presentation_audio_id) out.push({ kind: 'lego', key: id, role: 'presentation', text: introLine(l.known_text) });
  }
  for (const x of fresh.phrases) {
    const id = sid(x.id); if (!ids.has(id) || x.phrase_role === 'component') continue;
    const l = legos.get(legoOf(id)); if (!l || !l.is_new) continue; // a not-new LEGO's basket is never played
    for (const [role, col] of Object.entries(SLOT)) if (!x[col]) out.push({ kind: 'phrase', key: x.id, role, text: role === 'known' ? x.known_text : x.target_text });
  }
  return out;
}

function verify(fresh, p) {
  const bad = [];
  const ph = new Map(fresh.phrases.map((x) => [sid(x.id), x]));
  for (const c of p.changes) { const x = ph.get(c.id); if (!x || x.known_text !== c.known || x.target_text !== c.target) bad.push(`${c.id} does not read the new text`); }
  const sd = new Map(fresh.seeds.map((s) => [s.seed_number, s]));
  for (const s of p.seedChanges) { const x = sd.get(s.n); if (x.target_text !== s.target || x.known_text !== s.known) bad.push(`seed ${s.n} does not read the new text`); }
  const lg = new Map(fresh.legos.map((l) => [l.lego_id, l]));
  for (const l of D.LEGOS) for (const [k, v] of Object.entries(l.set)) if (JSON.stringify(lg.get(l.lego_id)[k]) !== JSON.stringify(v)) bad.push(`${l.lego_id}.${k} is ${JSON.stringify(lg.get(l.lego_id)[k])}`);
  if (!lg.has('S0098L05')) bad.push('S0098L05 missing');
  return bad;
}

async function main() {
  const [mode, file, flag] = process.argv.slice(2);
  if (!mode || !file) throw new Error('usage: check|apply|audio|verify <seeds.json> [render]');
  const db = fromApi(JSON.parse(fs.readFileSync(file, 'utf8')));
  const out = process.env.LOG_DIR || process.cwd();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const save = (n, log) => { const f = path.join(out, `spa-kai-rulings-${n}-${stamp}.json`); fs.writeFileSync(f, JSON.stringify(log, null, 2)); return f; };

  if (mode === 'verify' || mode === 'audio') {
    // the plan is computed against the BEFORE read the apply used (BEFORE_SEEDS), so drift there is expected
    const p = plan(fromApi(JSON.parse(fs.readFileSync(process.env.BEFORE_SEEDS, 'utf8'))));
    const empty = emptySlots(db, p);
    if (mode === 'verify') {
      const bad = verify(db, p);
      console.log(`verify: ${bad.length} text problems, ${empty.length} empty played slots on touched rows`);
      for (const b of bad) console.log('  ', b);
      for (const e of empty) console.log('   EMPTY', e.kind, e.key, e.role, e.text);
      return console.log(save('verify', { bad, empty }));
    }
    const render = flag === 'render';
    const log = { job: '#223', mode: render ? 'render' : 'dry', asks: [] };
    const seen = new Map();
    for (const e of empty) {
      const k = `${e.role}\u0000${e.text}\u0000${e.role === 'presentation' ? e.key : ''}`;
      let r = seen.get(k);
      if (!r) {
        r = await post(`${POPTY}/api/audio/render`, { courseCode: COURSE, role: e.role, text: e.text, purpose: PURPOSE, approval: APPROVAL, dryRun: !render, ...(e.role === 'presentation' ? { legoId: e.key } : {}) });
        seen.set(k, r);
        if (r.status !== 200) console.log('  REFUSED', r.status, e.role, e.text, JSON.stringify(r.body).slice(0, 300));
      }
      log.asks.push({ ...e, status: r.status, source: r.body.source, audioId: r.body.audioId, voiceId: r.body.voiceId, chars: r.body.charsSpent || r.body.wouldSpendChars || 0, error: r.body.error || r.body.code });
    }
    const uniq = [...seen.values()];
    const chars = uniq.reduce((n, r) => n + (r.body.charsSpent || r.body.wouldSpendChars || 0), 0);
    const by = (s) => uniq.filter((r) => r.body.source === s).length;
    console.log(`audio ${render ? 'RENDER' : 'dry run'}: ${empty.length} empty slots, ${uniq.length} distinct asks — library ${by('library')}, ${render ? 'rendered ' + by('rendered') : 'would render ' + by('would-render')}, refused ${uniq.filter((r) => r.status !== 200).length}; ${chars} chars`);
    if (render) {
      // fill-only: put each clip into its empty slot (presentations bind themselves when the render names the LEGO)
      const links = log.asks.filter((a) => a.audioId && a.role !== 'presentation').map((a) => ({ [a.kind === 'seed' ? 'seedNumber' : a.kind === 'lego' ? 'legoId' : 'phraseId']: a.key, role: a.role, audioId: a.audioId }));
      for (let i = 0; i < links.length; i += 100) {
        const d = await post(`${POPTY}/api/production/${COURSE}/link-clip`, { links: links.slice(i, i + 100), approval: APPROVAL, dryRun: false });
        console.log(`link-clip ${links.slice(i, i + 100).length} → ${d.status} ${JSON.stringify(d.body).slice(0, 300)}`);
        (log.links = log.links || []).push({ status: d.status, body: d.body });
      }
      const pres = log.asks.filter((a) => a.audioId && a.role === 'presentation');
      for (const a of pres) {
        const d = await post(`${POPTY}/api/production/${COURSE}/link-clip`, { links: [{ legoId: a.key, role: 'presentation', audioId: a.audioId }], approval: APPROVAL, dryRun: false });
        if (d.status !== 200) console.log(`presentation link ${a.key} → ${d.status} ${JSON.stringify(d.body).slice(0, 200)}`);
      }
    }
    return console.log(save('audio', log));
  }

  const p = plan(db);
  const g = p.gates;
  console.log(`plan: ${D.LEGOS.length} LEGO re-cuts + 1 new LEGO (${D.NEW_BASKET.build.length}B/${D.NEW_BASKET.use.length}U), ${p.seedChanges.length} seeds, ${p.changes.length} phrase rows; unapprove ${p.unapprove.length}; touched seeds ${p.touchedSeeds.join(',')}`);
  console.log(`gates: drift ${p.drift.length}, holds ${g.holds.length}, untaught ${g.untaught.length}, zut ${g.zut.length}, copy ${g.copy.length}; knock-on (reported) ${p.knockOn.length}`);
  for (const [n, list] of [['DRIFT', p.drift], ['HOLDS', g.holds], ['UNTAUGHT', g.untaught], ['ZUT', g.zut], ['COPY', g.copy], ['KNOCK-ON', p.knockOn]]) for (const x of list) console.log(`  ${n} ${x}`);
  const blocked = p.drift.length + g.holds.length + g.untaught.length + g.zut.length + g.copy.length;
  if (mode === 'check') { const { after, ...rest } = p; return console.log(save('check', rest)); }
  if (blocked) { console.log('BLOCKED: fix the gates first'); process.exitCode = 1; return; }

  const log = { job: '#223', mode, batches: [] };
  const live = mode === 'apply' && process.env.APPLY_CONFIRM === '1';
  // 1. the new LEGO (structural: Kai key)
  const ins = kaiCall('POST', `/api/production/${COURSE}/edit-batch`, { ops: [{ op: 'lego.insert', row: D.NEW_LEGO.row }], approval: APPROVAL, ...(live ? { apply: true } : {}) });
  console.log(`[lego.insert S0098L05] ${live ? 'APPLY' : 'dry'} → ${JSON.stringify(ins).slice(0, 300)}`);
  log.insert = ins;
  if (ins.error || ins.ok === false) { process.exitCode = 1; return console.log(save(mode, log)); }
  // 2. LEGO / seed / phrase text
  const all = editOps(p, db);
  const chunks = [];
  for (let i = 0; i < all.length; i += BATCH) chunks.push([`text ${i / BATCH + 1}`, all.slice(i, i + BATCH)]);
  chunks.push(['unapprove', p.unapprove.map((n) => ({ op: 'seed.update', seed_number: n, set: { approved_at: null } }))]);
  for (const [cls, ops] of chunks) {
    if (!ops.length) continue;
    const dry = await post(`${POPTY}/api/production/${COURSE}/edit-batch`, { ops, approval: APPROVAL });
    console.log(`[${cls}] ${ops.length} ops — dry ${dry.status} ${dry.body.error || ''}`);
    log.batches.push({ cls, ops: ops.length, dry: dry.status, error: dry.body.error });
    if (dry.status !== 200) { console.log(JSON.stringify(dry.body).slice(0, 800)); process.exitCode = 1; break; }
    if (!live) continue;
    const ap = await post(`${POPTY}/api/production/${COURSE}/edit-batch`, { ops, approval: APPROVAL, apply: true });
    log.batches[log.batches.length - 1].apply = { status: ap.status, event_id: ap.body.event_id, undo_file: ap.body.undo_file, error: ap.body.error };
    console.log(`  APPLIED ${ap.status} event ${ap.body.event_id} ${ap.body.error || ''}`);
    if (ap.status !== 200) { process.exitCode = 1; break; }
  }
  // 3. the new LEGO's basket through the validating v2 door (course-builder)
  if (live && !process.exitCode) {
    const body = { phrases: [{ seed_number: 98, lego_index: 5, build: D.NEW_BASKET.build.map(([k, t]) => ({ known: k, target: t })), use: D.NEW_BASKET.use.map(([k, t]) => ({ known: k, target: t })) }] };
    const r = await post(`${process.env.BUILDER_URL || 'http://localhost:3471'}/api/v2/phrases/${COURSE}`, body);
    console.log(`[v2 phrases S0098L05] ${r.status} ${JSON.stringify(r.body).slice(0, 500)}`);
    log.basket = r;
    if (r.status !== 200 || (r.body.errors && r.body.errors.length)) process.exitCode = 1;
  }
  console.log(save(mode, log));
}

if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
module.exports = { plan, editOps, afterState, phraseChanges, emptySlots, verify, introLine };
