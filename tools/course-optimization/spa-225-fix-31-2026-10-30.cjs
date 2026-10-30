#!/usr/bin/env node
'use strict';
// tools/course-optimization/spa-225-fix-31-2026-10-30.cjs — spa_for_eng (job #261): the rows audit #225·AB (d/7528fbc9)
// found where an applied fix caused or kept a canon problem, fixed under Kai's reword-if-valid-else-delete rule. The rows
// and the reason for each are in ./spa-225-fix-31-2026-10-30.data.cjs. Machinery follows spa-kai-rulings-2026-10-30.cjs.
//
// Every change is checked on the course AS IT WILL BE, and nothing is written if any gate fails:
//   drift     a row's live text is not what the data was written against (missing, or already changed)
//   holds     a changed row (or the seed) no longer contains its LEGO on both sides
//   untaught  the new Spanish brings in a word not taught by that point
//   zut       the new pair makes a NEW "same English → two Spanish" clash anywhere in the course
//   copy      the new pair is an exact copy of another row in its basket
//   floor     a delete would leave its basket under 4 USE / 1 BUILD
// Every write goes through the signed Kai door (/api/admin/course-edit/…): the /api/production/… door does not verify
// the kai signature (job #237).
//
//   node …cjs check  <seeds.json>                  # plan + gates (pure; seeds.json = GET /api/production/spa_for_eng/seeds)
//   APPLY_CONFIRM=1 node …cjs apply <seeds.json>   # signed dry run then apply, 25 ops a batch, then the unapprove batch
//   BEFORE_SEEDS=<before.json> node …cjs audio  <fresh.json> [render]   # empty played slots of touched rows: the one audio
//                                                  # route (library first), a dry run unless `render`; links what it got
//   BEFORE_SEEDS=<before.json> node …cjs verify <fresh.json>            # the live course holds every change; 0 empty slots
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const D = require('./spa-225-fix-31-2026-10-30.data.cjs');
const { holdsInOrder, fromApi } = require('./spa-close-read-153-200-2026-10-27.cjs');
const { untaughtNew, makeTaught, zutIndex, nk, ntStrict } = require('./spa-deborah-129-2026-10-29.cjs');

const { COURSE, APPROVAL } = D;
const AGENT = 'kai-261-spa-225-fix';
const PURPOSE = 'job #261 spa_for_eng audit #225 fixes (Kai reword-if-valid-else-delete, 30 Oct)';
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
const BATCH = 25;
const USE_FLOOR = 4;
const sid = (id) => String(id).split(':').pop();
const legoOf = (id) => id.slice(0, 8);
const seedOf = (id) => Number(String(id).slice(1, 5));

/** makeTaught answers correctly only when asked in course order; this one starts again for an earlier LEGO. */
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

/** {changes:[{id,item,before,known,target}], deletes:[{id,item,before}], drift:[]} from the data against the live rows. */
function phraseChanges(db) {
  const byId = new Map(db.phrases.map((p) => [sid(p.id), p]));
  const changes = [], deletes = [], drift = [];
  for (const [item, rows] of Object.entries(D.PHRASES)) {
    for (const [id, k, t] of rows) {
      const p = byId.get(id);
      if (!p) { drift.push(`${id}: no such row`); continue; }
      if (k === undefined) { deletes.push({ id, item, before: p }); continue; }
      const known = k === 'replace-as-if' ? D.replaceAsIf(p.known_text) : k == null ? p.known_text : k;
      const target = t == null ? p.target_text : t;
      if (known === p.known_text && target === p.target_text) { drift.push(`${id}: already reads the new text`); continue; }
      changes.push({ id, item, before: p, known, target });
    }
  }
  return { changes, deletes, drift };
}

function afterState(db, changes, deletes) {
  const lset = new Map(D.LEGOS.map((l) => [l.lego_id, l.set]));
  const sset = new Map(D.SEEDS.map(([n, , k, t]) => [n, { k, t }]));
  const pset = new Map(changes.map((c) => [c.id, c]));
  const gone = new Set(deletes.map((d) => d.id));
  return {
    seeds: db.seeds.map((s) => (sset.has(s.seed_number) ? { ...s, known_text: sset.get(s.seed_number).k ?? s.known_text, target_text: sset.get(s.seed_number).t ?? s.target_text } : s)),
    legos: db.legos.map((l) => (lset.has(l.lego_id) ? { ...l, ...lset.get(l.lego_id) } : l)),
    phrases: db.phrases.filter((p) => !gone.has(sid(p.id))).map((p) => (pset.has(sid(p.id)) ? { ...p, known_text: pset.get(sid(p.id)).known, target_text: pset.get(sid(p.id)).target } : p)),
  };
}

function plan(db, { tw = require('../../services/course-builder/lib/taught-words.cjs') } = {}) {
  const { changes, deletes, drift } = phraseChanges(db);
  const legoNow = new Map(db.legos.map((l) => [l.lego_id, l]));
  for (const l of D.LEGOS) {
    const b = legoNow.get(l.lego_id);
    if (!b) drift.push(`${l.lego_id}: no such LEGO`);
    else if (Object.entries(l.set).every(([k, v]) => b[k] === v)) drift.push(`${l.lego_id}: already reads the new text`);
  }
  const seedNow = new Map(db.seeds.map((s) => [s.seed_number, s]));
  const seedChanges = D.SEEDS.map(([n, item, k, t]) => ({ n, item, before: seedNow.get(n), known: k ?? seedNow.get(n).known_text, target: t ?? seedNow.get(n).target_text }));
  for (const s of seedChanges) if (s.before.target_text === s.target && s.before.known_text === s.known) drift.push(`seed ${s.n}: already reads the new text`);

  const after = afterState(db, changes, deletes);
  const legoAfter = new Map(after.legos.map((l) => [l.lego_id, l]));
  const gates = { holds: [], untaught: [], zut: [], copy: [], floor: [] };
  const holdsK = (text, lego) => holdsInOrder(text, lego) || holdsInOrder(text, lego.replace(/^to /i, ''));

  for (const c of changes) {
    if (c.before.phrase_role === 'component') continue;
    const l = legoAfter.get(legoOf(c.id));
    // a row that did not hold its LEGO before is an older break (audit #11), not this pass's: e.g. S0182L01U11 drills
    // "my things" under "my keys", S0128L04U02 "She used to know" under "I used to know"
    if (!(holdsInOrder(c.before.target_text, l.target_text) && holdsK(c.before.known_text, l.known_text)) && !D.LEGOS.some((x) => x.lego_id === l.lego_id)) continue;
    if (!holdsInOrder(c.target, l.target_text)) gates.holds.push(`${c.id} Spanish lacks "${l.target_text}": ${c.target}`);
    if (!holdsK(c.known, l.known_text)) gates.holds.push(`${c.id} English lacks "${l.known_text}": ${c.known}`);
  }
  for (const s of seedChanges) for (const l of after.legos.filter((x) => x.seed_number === s.n && x.is_new)) {
    if (!(holdsInOrder(s.target, l.target_text) && holdsK(s.known, l.known_text))) gates.holds.push(`seed ${s.n} lacks ${l.lego_id} "${l.known_text} | ${l.target_text}"`);
  }
  // every BUILD/USE row of a LEGO whose text moved must still hold it
  for (const l of D.LEGOS) for (const p of after.phrases.filter((q) => legoOf(sid(q.id)) === l.lego_id && q.phrase_role !== 'component')) {
    const L = legoAfter.get(l.lego_id);
    if (!(holdsInOrder(p.target_text, L.target_text) && holdsK(p.known_text, L.known_text))) gates.holds.push(`${sid(p.id)} lacks re-worded LEGO ${l.lego_id}: ${p.known_text}`);
  }

  const keysAfter = taughtInOrder(after, tw);
  const rows = (st) => [
    ...st.seeds.map((s) => ({ key: `seed ${s.seed_number}`, known_text: s.known_text, target_text: s.target_text, phrase_role: 'seed' })),
    ...st.legos.map((l) => ({ key: l.lego_id, known_text: l.known_text, target_text: l.target_text, phrase_role: 'lego' })),
    ...st.phrases.filter((p) => p.phrase_role !== 'component').map((p) => ({ key: sid(p.id), known_text: p.known_text, target_text: p.target_text, phrase_role: p.phrase_role })),
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
    const twin = after.phrases.find((q) => sid(q.id) !== c.id && legoOf(sid(q.id)) === legoOf(c.id) && q.phrase_role !== 'component' && nk(q.known_text) === nk(c.known) && ntStrict(q.target_text) === ntStrict(c.target));
    if (twin) gates.copy.push(`${c.id} = ${sid(twin.id)}: ${c.known} | ${c.target}`);
  }
  for (const s of seedChanges) {
    const last = after.legos.filter((l) => l.seed_number === s.n).sort((a, b) => b.lego_index - a.lego_index)[0];
    checkRow(`seed ${s.n}`, last.lego_id, s.before, { known_text: s.known, target_text: s.target });
  }
  for (const l of D.LEGOS) checkRow(l.lego_id, l.lego_id, legoNow.get(l.lego_id), legoAfter.get(l.lego_id));
  for (const d of deletes) {
    const left = after.phrases.filter((q) => legoOf(sid(q.id)) === legoOf(d.id));
    const use = left.filter((q) => q.phrase_role === 'use').length, build = left.filter((q) => q.phrase_role === 'build').length;
    d.left = { use, build };
    if ((d.before.phrase_role === 'use' && use < USE_FLOOR) || (d.before.phrase_role === 'build' && build < 1)) gates.floor.push(`${d.id}: would leave ${use} USE / ${build} BUILD`);
  }

  const touchedSeeds = new Set([...changes.map((c) => seedOf(c.id)), ...deletes.map((d) => seedOf(d.id)), ...seedChanges.map((s) => s.n), ...D.LEGOS.map((l) => seedOf(l.lego_id))]);
  const unapprove = db.seeds.filter((s) => touchedSeeds.has(s.seed_number) && s.approved_at).map((s) => s.seed_number);
  return { changes, deletes, seedChanges, drift, gates, unapprove, touchedSeeds: [...touchedSeeds].sort((a, b) => a - b) };
}

function editOps(p, db) {
  const legoNow = new Map(db.legos.map((l) => [l.lego_id, l]));
  const ops = [];
  for (const l of D.LEGOS) {
    const b = legoNow.get(l.lego_id);
    ops.push({ op: 'lego.update', lego_id: l.lego_id, set: l.set, expect: { known_text: b.known_text, target_text: b.target_text } });
  }
  for (const s of p.seedChanges) {
    const set = {};
    if (s.known !== s.before.known_text) set.known_text = s.known;
    if (s.target !== s.before.target_text) set.target_text = s.target;
    ops.push({ op: 'seed.update', seed_number: s.n, set, expect: { known_text: s.before.known_text, target_text: s.before.target_text } });
  }
  for (const c of p.changes) {
    const set = {};
    if (c.known !== c.before.known_text) set.known_text = c.known;
    if (c.target !== c.before.target_text) { set.target_text = c.target; set.word_count = c.target.length; }
    ops.push({ op: 'phrase.update', phrase_id: `${COURSE}:${c.id}`, set, expect: { known_text: c.before.known_text, target_text: c.before.target_text } });
  }
  for (const d of p.deletes) ops.push({ op: 'phrase.delete', phrase_id: `${COURSE}:${d.id}`, expect: { known_text: d.before.known_text, target_text: d.before.target_text } });
  return ops;
}

/** The signed Kai door: tools/agent-admin/call.cjs --key kai, under /api/admin so the signature is verified. */
function kaiCall(method, urlPath, body) {
  const f = path.join(process.env.TMPDIR || '/tmp', `kai-call-${process.pid}.json`);
  fs.writeFileSync(f, JSON.stringify(body));
  try {
    const out = execFileSync('node', [path.join(__dirname, '..', 'agent-admin', 'call.cjs'), '--key', 'kai', '--agent', AGENT, method, urlPath, '--body-file', f], { encoding: 'utf8', maxBuffer: 64 << 20 });
    return JSON.parse(out.slice(out.indexOf('{')));
  } catch (e) { return { error: String(e.stdout || e.message).slice(0, 1500) }; } finally { fs.unlinkSync(f); }
}
async function post(url, body) {
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body), signal: AbortSignal.timeout(300000) });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  } catch (e) { return { status: 0, body: { ok: false, error: String((e.cause && e.cause.code) || e.name) } }; }
}

// ── audio ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
const SLOT = { known: 'known_audio_id', target1: 'target1_audio_id', target2: 'target2_audio_id' };
const introLine = (known) => `The Spanish for: '${known}', is:`;
/** Every played slot of a touched row that is empty: the seed, the LEGO (+ intro), BUILD/USE rows of is_new LEGOs. */
function emptySlots(fresh, p) {
  const legos = new Map(fresh.legos.map((l) => [l.lego_id, l]));
  const ids = new Set(p.changes.map((c) => c.id));
  const out = [];
  for (const s of fresh.seeds.filter((x) => p.seedChanges.some((c) => c.n === x.seed_number)))
    for (const [role, col] of Object.entries(SLOT)) if (!s[col]) out.push({ kind: 'seed', key: s.seed_number, role, text: role === 'known' ? s.known_text : s.target_text });
  for (const id of D.LEGOS.map((l) => l.lego_id)) {
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
  for (const d of p.deletes) if (ph.has(d.id)) bad.push(`${d.id} still exists`);
  const sd = new Map(fresh.seeds.map((s) => [s.seed_number, s]));
  for (const s of p.seedChanges) { const x = sd.get(s.n); if (x.target_text !== s.target || x.known_text !== s.known) bad.push(`seed ${s.n} does not read the new text`); }
  for (const n of p.touchedSeeds) if (sd.get(n).approved_at) bad.push(`seed ${n} is still approved`);
  const lg = new Map(fresh.legos.map((l) => [l.lego_id, l]));
  for (const l of D.LEGOS) for (const [k, v] of Object.entries(l.set)) if (lg.get(l.lego_id)[k] !== v) bad.push(`${l.lego_id}.${k} is ${JSON.stringify(lg.get(l.lego_id)[k])}`);
  return bad;
}

async function main() {
  const [mode, file, flag] = process.argv.slice(2);
  if (!mode || !file) throw new Error('usage: check|apply|audio|verify <seeds.json> [render]');
  const db = fromApi(JSON.parse(fs.readFileSync(file, 'utf8')));
  const out = process.env.LOG_DIR || process.cwd();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const save = (n, log) => { const f = path.join(out, `spa-225-fix-31-${n}-${stamp}.json`); fs.writeFileSync(f, JSON.stringify(log, null, 2)); return f; };

  if (mode === 'verify' || mode === 'audio') {
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
    const log = { job: '#261', mode: render ? 'render' : 'dry', asks: [] };
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
      // fill-only: each clip into its empty slot
      const links = log.asks.filter((a) => a.audioId).map((a) => ({ [a.kind === 'seed' ? 'seedNumber' : a.kind === 'lego' ? 'legoId' : 'phraseId']: a.key, role: a.role, audioId: a.audioId }));
      for (let i = 0; i < links.length; i += 100) {
        const d = await post(`${POPTY}/api/production/${COURSE}/link-clip`, { links: links.slice(i, i + 100), approval: APPROVAL, dryRun: false });
        console.log(`link-clip ${links.slice(i, i + 100).length} → ${d.status} ${JSON.stringify(d.body).slice(0, 400)}`);
        (log.links = log.links || []).push({ status: d.status, body: d.body });
      }
    }
    return console.log(save('audio', log));
  }

  const p = plan(db);
  const g = p.gates;
  console.log(`plan: ${D.LEGOS.length} LEGO, ${p.seedChanges.length} seed, ${p.changes.length} phrase rewords, ${p.deletes.length} deletes; unapprove ${p.unapprove.length}; touched seeds ${p.touchedSeeds.join(',')}`);
  console.log(`gates: drift ${p.drift.length}, holds ${g.holds.length}, untaught ${g.untaught.length}, zut ${g.zut.length}, copy ${g.copy.length}, floor ${g.floor.length}`);
  for (const [n, list] of [['DRIFT', p.drift], ['HOLDS', g.holds], ['UNTAUGHT', g.untaught], ['ZUT', g.zut], ['COPY', g.copy], ['FLOOR', g.floor]]) for (const x of list) console.log(`  ${n} ${x}`);
  for (const c of p.changes) console.log(`  REWORD ${c.id} (#${c.item}): ${c.before.known_text} | ${c.before.target_text}\n      → ${c.known} | ${c.target}`);
  for (const d of p.deletes) console.log(`  DELETE ${d.id} (#${d.item}; leaves U${d.left.use}/B${d.left.build}): ${d.before.known_text} | ${d.before.target_text}`);
  const blocked = p.drift.length + Object.values(g).reduce((n, l) => n + l.length, 0);
  if (mode === 'check') return console.log(save('check', p));
  if (blocked) { console.log('BLOCKED: fix the gates first'); process.exitCode = 1; return; }

  const live = mode === 'apply' && process.env.APPLY_CONFIRM === '1';
  const log = { job: '#261', mode, batches: [] };
  const all = editOps(p, db), chunks = [];
  for (let i = 0; i < all.length; i += BATCH) chunks.push([`text ${i / BATCH + 1}`, all.slice(i, i + BATCH)]);
  chunks.push(['unapprove', p.unapprove.map((n) => ({ op: 'seed.update', seed_number: n, set: { approved_at: null } }))]);
  const door = `/api/admin/course-edit/${COURSE}/edit-batch`;
  for (const [cls, ops] of chunks) {
    if (!ops.length) continue;
    const dry = kaiCall('POST', door, { ops, approval: APPROVAL });
    const dryOk = !dry.error && dry.ok !== false;
    console.log(`[${cls}] ${ops.length} ops — signed dry run ${dryOk ? 'ok' : 'REFUSED'} ${dryOk ? '' : JSON.stringify(dry).slice(0, 1200)}`);
    log.batches.push({ cls, ops: ops.length, dry });
    if (!dryOk) { process.exitCode = 1; break; }
    if (!live) continue;
    const ap = kaiCall('POST', door, { ops, approval: APPROVAL, apply: true });
    log.batches[log.batches.length - 1].apply = ap;
    console.log(`  APPLIED event ${ap.event_id} ${ap.error ? 'ERROR ' + JSON.stringify(ap).slice(0, 1200) : ''}`);
    if (ap.error || ap.ok === false) { process.exitCode = 1; break; }
  }
  console.log(save(mode, log));
}

if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
module.exports = { plan, editOps, afterState, phraseChanges, emptySlots, verify };
