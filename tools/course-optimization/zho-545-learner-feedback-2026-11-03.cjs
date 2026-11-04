#!/usr/bin/env node
'use strict';
// tools/course-optimization/zho-545-learner-feedback-2026-11-03.cjs — zho_for_eng: the fixes for a Hong Kong learner's
// 3 Nov 2026 report (job #545, Kai approved): (A) broken English on the known side, (B) time expressions placed after
// the verb in the Chinese, (C) context-bound verbs (坐 'ride/sit', 弹 'pluck/strike an instrument') used for any 'take' /
// 'play'. Every row was READ by a person-reader (jobs #547–#550·AC); their decisions are ops/zho-545/decisions-*.json,
// and ops/zho-545/overrides.json is the parent's review of them (demote to hold, or replace the proposed text).
// The engine is the ita #36 / deu #435 pass, re-pointed at a script with no spaces:
//   drift (the row still reads what the reader read) / P17 (still holds its LEGO: English by word multiset, Chinese by
//   phrase-decomposer anchoring, which is char-level for Han) / P1 (no NEW untileable Chinese: the new text must tile from
//   whole taught chunks — LEGO + component targets up to its own LEGO, earlier seed sentences — K29: no-space scripts are
//   never read word by word) / ZUT (no new one-English→two-Chinese clash) / duplicate in the basket / USE floor.
// Touched seeds are unapproved (O5). LEGO edits unlink the old intro; render then re-voices it in the course template.
//   node …cjs check|dry <seeds.json>  ·  APPLY_CONFIRM=1 node …cjs apply <seeds.json>  ·  node …cjs verify <seeds.json>
//   MAX_CHARS=<n> [RENDER_CONFIRM=1] node …cjs render <fresh seeds.json>
// <seeds.json> = GET http://localhost:3470/api/production/zho_for_eng/seeds saved to a file.
const fs = require('fs');
const path = require('path');
const { holdsInOrder, fromApi } = require('./spa-close-read-153-200-2026-10-27.cjs');

const COURSE = 'zho_for_eng';
// DATA_DIR=ops/<pass> points the same engine at another pass's decisions (job #233 reuses it for the #195 wave-1
// mismatch rows: ops/zho-mismatch-233). JOB names that pass in the agent id, purpose and log names.
const JOB = process.env.JOB || '#545';
const AGENT = process.env.JOB ? `zho-mismatch-195-fix (job ${JOB})` : 'zho-learner-feedback-fixes (job #545)';
const PURPOSE = process.env.JOB ? `job ${JOB} zho_for_eng #195 wave-1 mismatch fixes (Kai approved 4 Nov) — refill of the slots these edits emptied`
  : 'job #545 zho_for_eng learner-feedback fixes (Kai approved 3 Nov) — refill of the slots these edits emptied';
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, '..', '..', 'ops', 'zho-545');
const TAG = `zho-${JOB.replace(/\W/g, '')}`;
const USE_FLOOR = 3;
const BATCH = Number(process.env.BATCH) || 25;

const pid = (id) => (String(id).includes(':') ? String(id) : `${COURSE}:${id}`);
const sid = (id) => String(id).split(':').pop();
const nk = (s) => (s || '').toLowerCase().trim().replace(/[.?!,]+$/, '');
const PUNCT = /[\s，。？！、；：,.?!;:“”"'‘’《》（）()…—-]/g;
const han = (s) => String(s || '').replace(PUNCT, '');
const ntStrict = han;

/** Min number of characters of `text` that no taught chunk covers (DP over chunk matches). Returns the uncovered chars. */
function uncoveredChars(text, chunks) {
  const t = han(text); const n = t.length;
  const best = new Array(n + 1).fill(Infinity); const back = new Array(n + 1).fill(null); best[0] = 0;
  for (let i = 0; i < n; i++) {
    if (best[i] === Infinity) continue;
    if (best[i] + 1 < best[i + 1]) { best[i + 1] = best[i] + 1; back[i + 1] = { from: i, miss: true }; }
    for (const c of chunks.byFirst.get(t[i]) || []) {
      if (t.startsWith(c, i) && best[i] < best[i + c.length]) { best[i + c.length] = best[i]; back[i + c.length] = { from: i, miss: false }; }
    }
  }
  const out = []; let j = n;
  while (j > 0) { const b = back[j]; if (b.miss) out.push(t[b.from]); j = b.from; }
  return out.reverse();
}
function chunkSet(texts) {
  const byFirst = new Map();
  for (const raw of texts) { const c = han(raw); if (!c) continue; if (!byFirst.has(c[0])) byFirst.set(c[0], new Set()); byFirst.get(c[0]).add(c); }
  for (const [k, v] of byFirst) byFirst.set(k, [...v].sort((a, b) => b.length - a.length));
  return { byFirst };
}
/** Taught chunks for a phrase under LEGO S####L##: earlier seed sentences, LEGOs + components up to and including it. */
function makeTaught(db) {
  const legos = [...db.legos].sort((a, b) => a.seed_number - b.seed_number || a.lego_index - b.lego_index);
  const cache = new Map();
  return function chunksFor(legoId) {
    if (cache.has(legoId)) return cache.get(legoId);
    const seedN = Number(legoId.slice(1, 5)), idx = Number(legoId.slice(6, 8));
    const texts = db.seeds.filter((s) => s.seed_number < seedN).map((s) => s.target_text);
    for (const l of legos) {
      if (l.seed_number > seedN || (l.seed_number === seedN && l.lego_index > idx)) break;
      texts.push(l.target_text); for (const c of l.components || []) if (c && c.target) texts.push(c.target);
    }
    const cs = chunkSet(texts); cache.set(legoId, cs); return cs;
  };
}
/** Chars uncovered in `after` that were not already uncovered in `before` (multiset). */
function newlyUntaught(chunks, before, after) {
  const was = new Map(); for (const c of before == null ? [] : uncoveredChars(before, chunks)) was.set(c, (was.get(c) || 0) + 1);
  const out = []; for (const c of uncoveredChars(after, chunks)) { if (was.get(c)) was.set(c, was.get(c) - 1); else out.push(c); }
  return out;
}

/** P17 for the target: the phrase anchors its LEGO (exact span, or the LEGO's legs in order with words inside — K49). */
function holdsZh(dz, text, lego) {
  if (han(text).includes(han(lego.target_text))) return true;
  try { return dz.decomposeAnchored(text, [], { lego_id: lego.lego_id, target_text: lego.target_text, known_text: lego.known_text }, COURSE).kind !== 'error'; } catch (e) { return false; }
}

function zutIndex(rows) {
  const byK = new Map();
  for (const r of rows) {
    if (r.phrase_role === 'component') continue;
    const k = nk(r.known_text), t = ntStrict(r.target_text);
    if (!byK.has(k)) byK.set(k, new Map()); byK.get(k).set(r.key, t);
  }
  return { clashes(row) { const out = new Set(); for (const [key, tt] of byK.get(nk(row.known_text)) || []) if (key !== row.key && tt !== ntStrict(row.target_text)) out.add(key); return out; } };
}

/** Readers' decisions + the parent's overrides → { FIXES, SEED_FIXES, LEGO_FIXES, HELD }. Each fix: [id, point, [known,target] now, [known,target,roman]|null, why]. */
function loadData(dir = DATA_DIR) {
  const ov = fs.existsSync(path.join(dir, 'overrides.json')) ? JSON.parse(fs.readFileSync(path.join(dir, 'overrides.json'), 'utf8')) : {};
  const demote = new Map(Object.entries(ov.demote || {})), replace = ov.replace || {};
  const out = { FIXES: [], SEED_FIXES: [], LEGO_FIXES: [], HELD: [] };
  const all = [];
  for (const f of fs.readdirSync(dir).filter((x) => /^decisions-.*\.json$/.test(x)).sort()) all.push(...JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).decisions);
  for (const d of [...all, ...(ov.add || [])]) {
    const key = d.id;
    if (d.action === 'hold' || demote.has(key)) { out.HELD.push({ ...d, why: demote.has(key) ? `${d.why} — HELD by the parent review: ${demote.get(key)}` : d.why }); continue; }
    const after = replace[key] || d.after;
    const fix = d.action === 'delete' ? null : [after.known ?? null, after.target ?? null, after.roman ?? null];
    const now = [d.before.known, d.before.target];
    const why = `${d.point}: ${d.why}`;
    if (d.table === 'seed') out.SEED_FIXES.push([Number(String(key).replace(/^seed:/, '')), d.point, now, fix, why]);
    else if (d.table === 'lego') out.LEGO_FIXES.push([key, d.point, now, fix, why, d.components ? { components: d.components } : {}]);
    else out.FIXES.push([sid(key), d.point, now, fix, why]);
  }
  return out;
}

function plan(db, { data = loadData(), dz = require('../../services/phrase-decomposer.cjs') } = {}) {
  const skipped = [], notes = [];
  const livePh = new Map(db.phrases.map((p) => [sid(p.id), p]));
  const drift = (cur, now) => cur.known_text !== now[0] || cur.target_text !== now[1];
  const legoBefore = new Map(db.legos.map((l) => [l.lego_id, l]));

  const legoNext = new Map();
  for (const [id, cls, now, fix, why, extra = {}] of data.LEGO_FIXES) {
    const l = legoBefore.get(id);
    if (!l) { skipped.push({ id, cls, why: 'drift: the LEGO is gone' }); continue; }
    if (drift(l, now)) { skipped.push({ id, cls, why: `drift: now reads "${l.known_text} | ${l.target_text}"` }); continue; }
    if (!fix) { skipped.push({ id, cls, why: 'never delete a LEGO' }); continue; }
    const set = {};
    if (fix[0] !== null && fix[0] !== l.known_text) set.known_text = fix[0];
    if (fix[1] !== null && fix[1] !== l.target_text) { set.target_text = fix[1]; if (fix[2]) set.target_text_roman = fix[2]; }
    if (extra.components) set.components = extra.components;
    legoNext.set(id, { before: l, set, cls, why });
  }
  const legosAfter = db.legos.map((l) => (legoNext.has(l.lego_id) ? { ...l, ...legoNext.get(l.lego_id).set } : l));
  const legoById = new Map(legosAfter.map((l) => [l.lego_id, l]));

  const seedNext = new Map(); const fixRows = [...data.FIXES];
  for (const [n, cls, now, fix, why] of data.SEED_FIXES) {
    const s = db.seeds.find((x) => x.seed_number === n);
    if (!s) { skipped.push({ id: `seed ${n}`, cls, why: 'drift: the seed is gone' }); continue; }
    if (drift(s, now)) { skipped.push({ id: `seed ${n}`, cls, why: `drift: now reads "${s.known_text} | ${s.target_text}"` }); continue; }
    const known = fix[0] ?? s.known_text, target = fix[1] ?? s.target_text;
    seedNext.set(n, { before: s, known, target, roman: fix[2], cls, why });
    // P26 copies: phrases carrying the seed's exact old pair follow it
    for (const p of db.phrases) {
      if (p.phrase_role === 'component' || nk(p.known_text) !== nk(s.known_text) || ntStrict(p.target_text) !== ntStrict(s.target_text)) continue;
      if (fixRows.some((f) => f[0] === sid(p.id))) continue;
      fixRows.push([sid(p.id), cls, [p.known_text, p.target_text], [fix[0] === null ? null : known, fix[1] === null ? null : target, fix[2]], `P26 copy of seed ${n}`]);
    }
  }
  const seedsAfter = db.seeds.map((s) => (seedNext.has(s.seed_number) ? { ...s, known_text: seedNext.get(s.seed_number).known, target_text: seedNext.get(s.seed_number).target } : s));

  const deleting = new Set(); const proposed = new Map();
  for (const [id, cls, now, fix, why] of fixRows) {
    const p = livePh.get(id);
    if (!p) { skipped.push({ id, cls, why: 'drift: the row is gone' }); continue; }
    if (drift(p, now)) { skipped.push({ id, cls, why: `drift: now reads "${p.known_text} | ${p.target_text}"` }); continue; }
    if (fix === null) { deleting.add(id); continue; }
    proposed.set(id, { p, known: fix[0] ?? p.known_text, target: fix[1] ?? p.target_text, roman: fix[2], cls, why });
  }

  const tag = (key, r, role) => ({ key, known_text: r.known_text, target_text: r.target_text, phrase_role: role });
  const beforeRows = [...db.seeds.map((s) => tag(`seed ${s.seed_number}`, s, 'seed')), ...db.legos.map((l) => tag(l.lego_id, l, 'lego')), ...db.phrases.map((p) => tag(sid(p.id), p, p.phrase_role))];
  const afterRows = [
    ...seedsAfter.map((s) => tag(`seed ${s.seed_number}`, s, 'seed')),
    ...legosAfter.map((l) => tag(l.lego_id, l, 'lego')),
    ...db.phrases.filter((p) => !deleting.has(sid(p.id))).map((p) => { const n = proposed.get(sid(p.id)); return tag(sid(p.id), n ? { known_text: n.known, target_text: n.target } : p, p.phrase_role); }),
  ];
  const zb = zutIndex(beforeRows), za = zutIndex(afterRows);
  const zutNew = (key, b4, af) => { const was = zb.clashes({ key, ...b4 }); return [...za.clashes({ key, ...af })].filter((c) => !was.has(c)); };
  const chunksFor = makeTaught({ seeds: seedsAfter, legos: legosAfter });

  const go = [];
  for (const [id, { p, known, target, roman, cls, why }] of [...proposed].sort((a, b) => a[0].localeCompare(b[0]))) {
    const legoId = id.slice(0, 8), lb = legoBefore.get(legoId), la = legoById.get(legoId);
    if (!la) { skipped.push({ id, cls, why: 'its LEGO is not in the course' }); continue; }
    const problems = [];
    if (p.phrase_role !== 'component') {
      if (holdsInOrder(p.known_text, lb.known_text) && !holdsInOrder(known, la.known_text)) problems.push(`P17 English no longer holds "${la.known_text}"`);
      if (holdsZh(dz, p.target_text, lb) && !holdsZh(dz, target, la)) problems.push(`P17 Chinese no longer holds "${la.target_text}"`);
    }
    if (target !== p.target_text) {
      const un = newlyUntaught(chunksFor(legoId), p.target_text, target);
      if (un.length) problems.push(`P1 untaught: ${un.join('')}`);
      // roman-sync (#252): a row that carries pinyin must get hand-read pinyin for its new text; a row with none stays
      // with none (most of 301-668, and some earlier rows), so the learner sees the same kind of line as its neighbours.
      if (!roman && p.target_text_roman) problems.push('no pinyin given for the new Chinese');
    }
    if (p.phrase_role !== 'component') {
      const z = zutNew(id, { known_text: p.known_text, target_text: p.target_text }, { known_text: known, target_text: target });
      if (z.length) problems.push(`ZUT new clash with ${z.slice(0, 4).join(', ')}`);
      const twin = afterRows.find((r) => r.key !== id && r.key !== legoId && r.key.startsWith(legoId) && r.phrase_role !== 'component' && nk(r.known_text) === nk(known) && ntStrict(r.target_text) === ntStrict(target));
      if (twin) problems.push(`duplicate of ${twin.key}`);
    }
    if (problems.length) { skipped.push({ id, cls, from: [p.known_text, p.target_text], to: [known, target], why: problems.join(' | ') }); continue; }
    const set = {};
    if (known !== p.known_text) set.known_text = known;
    if (target !== p.target_text) { set.target_text = target; if (roman || p.target_text_roman) set.target_text_roman = roman; set.word_count = han(target).length; }
    go.push({ id, kind: 'update', cls, why, before: p, set, sides: { known: 'known_text' in set, target: 'target_text' in set } });
  }
  for (const id of deleting) {
    const p = livePh.get(id), f = fixRows.find((x) => x[0] === id), legoId = id.slice(0, 8);
    const left = db.phrases.filter((q) => sid(q.id).startsWith(legoId) && q.phrase_role !== 'component' && !deleting.has(sid(q.id)));
    const use = left.filter((q) => q.phrase_role === 'use').length, build = left.filter((q) => q.phrase_role === 'build').length;
    if (p.phrase_role === 'use' && use < USE_FLOOR && legoById.get(legoId)?.is_new) { skipped.push({ id, cls: f[1], why: `floor: would leave ${use} USE under ${legoId}` }); continue; }
    if (p.phrase_role === 'build' && build < 1 && legoById.get(legoId)?.is_new) { skipped.push({ id, cls: f[1], why: `floor: would leave no BUILD under ${legoId}` }); continue; }
    go.push({ id, kind: 'delete', cls: f[1], why: f[4], before: p });
  }

  const seedGo = [], legoGo = [];
  for (const [n, s] of seedNext) {
    if (s.target !== s.before.target_text) {
      const own = legosAfter.filter((l) => l.seed_number === n).sort((a, b) => b.lego_index - a.lego_index)[0];
      const un = own ? newlyUntaught(chunksFor(own.lego_id), s.before.target_text, s.target) : [];
      if (un.length) { skipped.push({ id: `seed ${n}`, cls: s.cls, why: `P1/S3 untaught: ${un.join('')}` }); continue; }
      if (!s.roman) { skipped.push({ id: `seed ${n}`, cls: s.cls, why: 'no pinyin given for the new Chinese' }); continue; }
    }
    const z = zutNew(`seed ${n}`, s.before, { known_text: s.known, target_text: s.target });
    if (z.length) { skipped.push({ id: `seed ${n}`, cls: s.cls, why: `ZUT new clash with ${z.join(', ')}` }); continue; }
    seedGo.push(s);
  }
  for (const [id, l] of legoNext) {
    const la = legoById.get(id);
    const z = zutNew(id, l.before, la);
    if (z.length) { skipped.push({ id, cls: l.cls, why: `ZUT new clash with ${z.join(', ')}` }); continue; }
    const lost = [];
    for (const p of db.phrases) {
      const ps = sid(p.id); if (!ps.startsWith(id) || p.phrase_role === 'component' || deleting.has(ps)) continue;
      const g = go.find((x) => x.id === ps && x.kind === 'update');
      const k = g && g.set.known_text ? g.set.known_text : p.known_text, t = g && g.set.target_text ? g.set.target_text : p.target_text;
      const held = holdsInOrder(p.known_text, l.before.known_text) && holdsZh(dz, p.target_text, l.before);
      if (held && (!holdsInOrder(k, la.known_text) || !holdsZh(dz, t, la))) lost.push(`${ps}: ${k} | ${t}`);
    }
    if (lost.length) { skipped.push({ id, cls: l.cls, why: `knock-on: ${lost.length} basket row(s) would not hold the new LEGO: ${lost.slice(0, 3).join(' ; ')}` }); continue; }
    legoGo.push({ id, ...l });
  }
  // a phrase edit that was only valid because a LEGO edit landed must not go alone
  const legoSkipped = new Set(skipped.filter((s) => /^S\d{4}L\d{2}$/.test(s.id)).map((s) => s.id));
  for (let i = go.length - 1; i >= 0; i--) if (legoSkipped.has(go[i].id.slice(0, 8)) && go[i].kind === 'update') { skipped.push({ id: go[i].id, cls: go[i].cls, why: `its LEGO edit ${go[i].id.slice(0, 8)} was skipped` }); go.splice(i, 1); }

  const touched = new Set([...go.map((g) => g.before.seed_number), ...seedGo.map((s) => s.before.seed_number), ...legoGo.map((l) => l.before.seed_number)]);
  const unapprove = db.seeds.filter((s) => touched.has(s.seed_number) && s.approved_at).map((s) => s.seed_number);
  return { go, skipped, notes, seedGo, legoGo, unapprove, held: data.HELD };
}

function editBatches(p) {
  const groups = new Map(); const add = (c, op) => { if (!groups.has(c)) groups.set(c, []); groups.get(c).push(op); };
  for (const l of p.legoGo) {
    add('lego', { op: 'lego.update', lego_id: l.id, set: l.set, expect: { known_text: l.before.known_text, target_text: l.before.target_text } });
    if (l.set.known_text) add('lego', { op: 'audio.link', target: 'lego', lego_id: l.id, slot: 'presentation', audio_id: null });
  }
  for (const s of p.seedGo) {
    const set = {}; if (s.known !== s.before.known_text) set.known_text = s.known;
    if (s.target !== s.before.target_text) { set.target_text = s.target; set.target_text_roman = s.roman; }
    add('seed', { op: 'seed.update', seed_number: s.before.seed_number, set, expect: { known_text: s.before.known_text, target_text: s.before.target_text } });
  }
  for (const g of p.go) {
    const expect = { known_text: g.before.known_text, target_text: g.before.target_text };
    if (g.kind === 'delete') add('delete', { op: 'phrase.delete', phrase_id: pid(g.id), expect });
    else add(g.cls, { op: 'phrase.update', phrase_id: pid(g.id), set: g.set, expect });
  }
  const out = [];
  for (const [cls, ops] of groups) for (let i = 0; i < ops.length; i += BATCH) out.push({ cls, part: i / BATCH + 1, ops: ops.slice(i, i + BATCH) });
  for (let i = 0; i < p.unapprove.length; i += BATCH) out.push({ cls: 'unapprove', part: i / BATCH + 1, ops: p.unapprove.slice(i, i + BATCH).map((n) => ({ op: 'seed.update', seed_number: n, set: { approved_at: null } })) });
  return out.filter((b) => b.ops.length);
}

/** The course's own intro template, as the live intros read (see the dump's intros): quote the LEGO, show the seed. */
const introLine = (legoKnown, seedKnown) => `The Chinese for: '${legoKnown}', as in — '${seedKnown}', is: <break time="300ms"/> <break time="10ms"/>`;

/** After apply, on a fresh dump: every EMPTY slot in the course (the edits' and any other), as (role, text) → slots. */
function emptySlots(db) {
  const m = new Map();
  const add = (role, text, target, extra = {}) => { const k = `${role}\u0000${text}`; if (!m.has(k)) m.set(k, { role, text, slots: [], ...extra }); m.get(k).slots.push(target); };
  const rowSlots = (row, target) => {
    if (!row.known_audio_id && row.known_text) add('known', row.known_text, target);
    for (const r of ['target1', 'target2']) if (!row[`${r}_audio_id`] && row.target_text) add(r, row.target_text, target);
  };
  for (const s of db.seeds) rowSlots(s, { target: 'seed', seed_number: s.seed_number });
  for (const l of db.legos) {
    rowSlots(l, { target: 'lego', lego_id: l.lego_id });
    if (l.is_new && !l.presentation_audio_id) {
      const seed = db.seeds.find((s) => s.seed_number === l.seed_number);
      add('presentation', introLine(l.known_text, seed ? seed.known_text : l.known_text), { target: 'lego', lego_id: l.lego_id }, { legoId: l.lego_id });
    }
  }
  for (const p of db.phrases) if (p.phrase_role !== 'component') rowSlots(p, { target: 'phrase', phrase_id: p.id });
  return [...m.values()];
}

async function post(url, body) {
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body), signal: AbortSignal.timeout(300000) });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  } catch (e) { return { status: 0, body: { ok: false, error: String((e.cause && e.cause.code) || e.name) } }; }
}
async function waitHealthy() {
  for (let i = 0; i < 120; i++) {
    try { const r = await fetch(`${POPTY}/api/production/${COURSE}/edit-ops`, { signal: AbortSignal.timeout(5000) }); if (r.ok) return; } catch (e) { /* down */ }
    await new Promise((res) => setTimeout(res, 5000));
  }
  throw new Error('Popty did not come back within 10 minutes');
}

async function main() {
  const [mode, file] = process.argv.slice(2);
  if (!mode || !file) throw new Error('usage: check|dry|apply|render|verify <seeds.json>');
  const db = fromApi(JSON.parse(fs.readFileSync(file, 'utf8')));
  const out = process.env.LOG_DIR || path.dirname(require('../lib/evidence-path.cjs').evidencePath(`ops/${path.basename(DATA_DIR)}/x`));
  fs.mkdirSync(out, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const save = (n, log) => { const f = path.join(out, `${TAG}-${n}-${stamp}.json`); fs.writeFileSync(f, JSON.stringify(log, null, 2)); return f; };

  if (mode === 'verify') {
    const D = loadData(); const live = new Map(db.phrases.map((p) => [sid(p.id), p]));
    let ok = 0; const bad = [];
    for (const [id, , , fix] of D.FIXES) {
      const cur = live.get(id);
      if (fix === null) { (cur ? bad.push(`${id} still present`) : ok++); continue; }
      if (cur && (fix[0] === null || cur.known_text === fix[0]) && (fix[1] === null || cur.target_text === fix[1])) ok++; else bad.push(`${id} reads "${cur ? `${cur.known_text} | ${cur.target_text}` : 'gone'}"`);
    }
    const empty = emptySlots(db).reduce((s, a) => s + a.slots.length, 0);
    console.log(`verify: ${ok} read as fixed, ${bad.length} not; ${empty} empty audio slots course-wide`); for (const b of bad) console.log('  ', b);
    return;
  }

  if (mode === 'render') {
    // SKIP_LEGOS=S0171L01,… leaves those LEGOs' slots alone (empties another pass made, outside this job's baskets).
    const skipL = new Set(String(process.env.SKIP_LEGOS || '').split(',').filter(Boolean));
    const inSkip = (t) => skipL.has(t.lego_id || sid(t.phrase_id || '').slice(0, 8));
    const asks = emptySlots(db).map((a) => ({ ...a, slots: a.slots.filter((t) => !inSkip(t)) })).filter((a) => a.slots.length);
    const log = { job: JOB, mode: 'render', asks: [] };
    for (const a of asks) {
      const body = { courseCode: COURSE, role: a.role, text: a.text, ...(a.legoId ? { legoId: a.legoId } : {}), purpose: PURPOSE, dryRun: true };
      let d = await post(`${POPTY}/api/audio/render`, body);
      if (d.status === 0) { await waitHealthy(); d = await post(`${POPTY}/api/audio/render`, body); }
      log.asks.push({ ...a, dry: { status: d.status, ok: !!d.body.ok, source: d.body.source, audioId: d.body.audioId, chars: d.body.ok && d.body.source !== 'library' ? (d.body.wouldSpendChars || a.text.length) : 0, error: d.body.ok ? undefined : d.body } });
    }
    const chars = log.asks.reduce((s, a) => s + a.dry.chars, 0), refused = log.asks.filter((a) => a.dry.error);
    const max = Number(process.env.MAX_CHARS);
    console.log(`render dry run: ${asks.length} asks (${asks.reduce((s, a) => s + a.slots.length, 0)} slots), ${log.asks.filter((a) => a.dry.source === 'library').length} in the library, ${chars} chars to render, ${refused.length} refused; MAX_CHARS ${max}`);
    for (const r of refused) console.log('  REFUSED', r.role, JSON.stringify(r.text), JSON.stringify(r.dry.error).slice(0, 200));
    if (!Number.isFinite(max) || chars > max || refused.length) { console.log('STOP: nothing rendered (no MAX_CHARS, over it, or a refusal)'); return console.log(save('render-stopped', log)); }
    if (process.env.RENDER_CONFIRM === '1') for (const a of log.asks) {
      if (a.dry.source === 'library') { a.audioId = a.dry.audioId; continue; }
      let r = await post(`${POPTY}/api/audio/render`, { courseCode: COURSE, role: a.role, text: a.text, ...(a.legoId ? { legoId: a.legoId } : {}), purpose: PURPOSE });
      if (r.status === 0) {
        await waitHealthy();
        const again = await post(`${POPTY}/api/audio/render`, { courseCode: COURSE, role: a.role, text: a.text, ...(a.legoId ? { legoId: a.legoId } : {}), purpose: PURPOSE, dryRun: true });
        r = again.status === 200 && again.body.ok && again.body.source === 'library' ? again : await post(`${POPTY}/api/audio/render`, { courseCode: COURSE, role: a.role, text: a.text, ...(a.legoId ? { legoId: a.legoId } : {}), purpose: PURPOSE });
      }
      a.real = { status: r.status, source: r.body.source, audioId: r.body.audioId, chars: r.body.charsSpent, error: r.body.ok ? undefined : r.body };
      if (a.real.error) { console.log('REFUSED — no retry:', a.role, JSON.stringify(a.text), JSON.stringify(r.body).slice(0, 300)); break; }
      a.audioId = r.body.audioId;
    }
    const ops = [];
    for (const a of log.asks) if (a.audioId) for (const t of a.slots) ops.push({ op: 'audio.link', ...t, slot: a.role, audio_id: a.audioId });
    log.linkOps = ops.length; log.links = [];
    for (let i = 0; i < ops.length && process.env.RENDER_CONFIRM === '1'; i += BATCH) {
      let ap = await post(`${POPTY}/api/production/${COURSE}/edit-batch`, { ops: ops.slice(i, i + BATCH), apply: true });
      if (ap.status === 0) { await waitHealthy(); ap = await post(`${POPTY}/api/production/${COURSE}/edit-batch`, { ops: ops.slice(i, i + BATCH), apply: true }); }
      log.links.push({ status: ap.status, event_id: ap.body.event_id, error: ap.body.error });
      console.log(`link batch ${i / BATCH + 1}: ${ap.status} event ${ap.body.event_id} ${ap.body.error || ''}`);
    }
    log.charsSpent = log.asks.reduce((s, a) => s + ((a.real && a.real.chars) || 0), 0);
    console.log(`rendered: ${log.charsSpent} chars; ${ops.length} slot links`);
    return console.log(save('render', log));
  }

  const p = plan(db);
  const by = {}; for (const g of p.go) by[`${g.cls}/${g.kind}`] = (by[`${g.cls}/${g.kind}`] || 0) + 1;
  console.log(`plan: ${p.go.filter((g) => g.kind === 'update').length} phrase edits, ${p.go.filter((g) => g.kind === 'delete').length} deletes, ${p.seedGo.length} seeds, ${p.legoGo.length} LEGOs, ${p.unapprove.length} seeds to unapprove, ${p.skipped.length} skipped, ${p.held.length} held`);
  console.log('  by point:', JSON.stringify(by));
  for (const s of p.skipped) console.log('  SKIP', s.id, s.cls, '—', s.why, s.to ? `  [${s.to.join(' | ')}]` : '');
  if (mode === 'check') return console.log(save('check', p));

  const batches = editBatches(p);
  const log = { job: JOB, started: stamp, mode, batches: [] };
  for (const b of batches) {
    let dry = await post(`${POPTY}/api/production/${COURSE}/edit-batch`, { ops: b.ops });
    if (dry.status === 0) { await waitHealthy(); dry = await post(`${POPTY}/api/production/${COURSE}/edit-batch`, { ops: b.ops }); }
    const entry = { cls: b.cls, part: b.part, ops: b.ops.length, dry: { status: dry.status, error: dry.body.error, code: dry.body.code, index: dry.body.index } };
    log.batches.push(entry);
    console.log(`[${b.cls} #${b.part}] ${b.ops.length} ops — dry run ${dry.status} ${dry.body.error || ''}`);
    if (dry.status !== 200) { console.log('  STOP: a dry run was refused; nothing further applied'); process.exitCode = 1; break; }
    if (mode !== 'apply' || process.env.APPLY_CONFIRM !== '1') continue;
    const ap = await post(`${POPTY}/api/production/${COURSE}/edit-batch`, { ops: b.ops, apply: true });
    entry.apply = { status: ap.status, event_id: ap.body.event_id, undo_file: ap.body.undo_file, error: ap.body.error, code: ap.body.code };
    console.log(`  APPLIED ${ap.status} event ${ap.body.event_id} undo ${ap.body.undo_file} ${ap.body.error || ''}`);
    if (ap.status !== 200) { process.exitCode = 1; break; }
  }
  console.log(save(mode, log));
}

if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
module.exports = { plan, editBatches, emptySlots, uncoveredChars, chunkSet, newlyUntaught, holdsZh, loadData, introLine };
