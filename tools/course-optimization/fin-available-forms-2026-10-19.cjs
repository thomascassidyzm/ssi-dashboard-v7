#!/usr/bin/env node
'use strict';
/**
 * fin_for_eng — AVAILABLE FORMS BY SEED POSITION, and a checker for proposed rewrites.
 * READ-ONLY: it reads a dump of GET /api/production/fin_for_eng/seeds (Popty, :3470)
 * and writes nothing anywhere.
 *
 *   curl -s http://localhost:3470/api/production/fin_for_eng/seeds > live.json
 *   node tools/course-optimization/fin-available-forms-2026-10-19.cjs index live.json <form> [<form>...]
 *   node tools/course-optimization/fin-available-forms-2026-10-19.cjs check live.json proposals.json
 *
 * KAI'S RULING (19 Oct 2026), the reason this exists: the #164·T proofread found real
 * case/form errors in fin_for_eng, but the fixes it proposed were wrong because the
 * correct form had usually not been TAUGHT yet. A Finnish fix must REWORD the row using
 * only word forms already available at that point — the exact inflected surface form
 * (K21: no stemming, no lemma, "totuutta" is not "totuuden"), never correct to an
 * untaught form, and never introduce new variations for now.
 *
 * WHAT COUNTS AS TAUGHT. A teaching event is a LEGO's target text (at its own
 * seed/lego_index) or a seed sentence's target text (after every LEGO of its seed).
 * A row drilled under LEGO k of seed n may use forms taught by any earlier seed, and by
 * LEGOs 1..k of seed n. Two weaker tiers are reported but NOT accepted:
 *   'heard'  — the form occurs in an earlier practice phrase but no LEGO/seed taught it;
 *   'tile'   — the form is only in a LEGO's components JSON (tiles), never spoken as a LEGO.
 * The seed sentence itself is judged at the END of its seed (it may introduce what it
 * must — Kai's "seed defines what is taught" — but that is flagged, not hidden).
 *
 * A REWRITE PASSES only if: every Finnish token is taught at the row's position; the
 * row's own LEGO is still whole on both sides (contiguous tokens); neither side
 * duplicates any other row in the course (course-wide, either side); and its English
 * does not already map to a different Finnish anywhere (ZUT). The machine verifies;
 * Kai judges the Finnish.
 */
const fs = require('fs');

const SEED_EVENT_INDEX = 999;

function normalise(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[^a-z0-9äöåšžéü'\- ]+/g, ' ')
    .replace(/(^|\s)['\-]+|['\-]+(\s|$)/g, '$1$2')
    .replace(/\s+/g, ' ')
    .trim();
}
const tokens = s => { const n = normalise(s); return n ? n.split(' ') : []; };
const key = (seed, idx) => seed * 1000 + idx;

function containsRun(hay, needle) {
  if (!needle.length) return true;
  outer: for (let i = 0; i + needle.length <= hay.length; i++) {
    for (let j = 0; j < needle.length; j++) if (hay[i + j] !== needle[j]) continue outer;
    return true;
  }
  return false;
}

/** Build the index from the Popty seeds payload ({seeds:[{legos:[{basket_phrases}]}]}). */
function buildIndex(payload) {
  const seeds = [...payload.seeds].sort((a, b) => a.seed_number - b.seed_number);
  const taught = new Map();   // form -> {at, by}  (first LEGO/seed teaching event)
  const heard = new Map();    // form -> {at, by}  (first practice phrase)
  const tile = new Map();     // form -> {at, by}
  const rows = new Map();     // id -> row
  const legos = new Map();    // lego_id -> lego
  const first = (m, form, at, by) => { const e = m.get(form); if (!e || at < e.at) m.set(form, { at, by }); };
  for (const s of seeds) {
    const lg = [...s.legos].sort((a, b) => a.lego_index - b.lego_index);
    for (const l of lg) {
      const at = key(s.seed_number, l.lego_index);
      legos.set(l.lego_id, { ...l, at, basket_phrases: undefined });
      for (const t of tokens(l.target_text)) first(taught, t, at, l.lego_id);
      let comps = l.components;
      if (typeof comps === 'string') { try { comps = JSON.parse(comps); } catch { comps = null; } }
      if (Array.isArray(comps)) for (const c of comps) for (const t of tokens(c && c.target)) first(tile, t, at, l.lego_id + ' tile');
      for (const p of l.basket_phrases || []) {
        const id = String(p.id).split(':').pop();
        rows.set(id, { id, seed: s.seed_number, lego: l.lego_id, at, role: p.phrase_role, en: p.known_text, fi: p.target_text });
        for (const t of tokens(p.target_text)) first(heard, t, at, id);
      }
    }
    const at = key(s.seed_number, SEED_EVENT_INDEX);
    const sid = `S${String(s.seed_number).padStart(4, '0')}`;
    rows.set(sid, { id: sid, seed: s.seed_number, lego: null, at, role: 'seed', en: s.known_text, fi: s.target_text });
    for (const t of tokens(s.target_text)) first(taught, t, at, sid);
  }
  // Course-wide sides for duplicate + ZUT checks (every row, every LEGO pair, every seed).
  const byFi = new Map(), byEn = new Map();
  const add = (m, k, id) => { if (!k) return; (m.get(k) || m.set(k, []).get(k)).push(id); };
  for (const r of rows.values()) { add(byFi, normalise(r.fi), r.id); add(byEn, normalise(r.en), r.id); }
  for (const l of legos.values()) { add(byFi, normalise(l.target_text), l.lego_id); add(byEn, normalise(l.known_text), l.lego_id); }
  return { taught, heard, tile, rows, legos, byFi, byEn };
}

/** Where a form stands at position `at`: 'taught' | 'later' | 'heard' | 'tile' | 'absent'. */
function formStatus(ix, form, at) {
  const t = ix.taught.get(form);
  if (t && t.at <= at) return { status: 'taught', ...t };
  const h = ix.heard.get(form);
  if (h && h.at <= at) return { status: 'heard', ...h, taughtLater: t || null };
  const ti = ix.tile.get(form);
  if (ti && ti.at <= at) return { status: 'tile', ...ti, taughtLater: t || null };
  if (t) return { status: 'later', ...t };
  return { status: 'absent' };
}

/** The position a row's Finnish is judged at. A seed or LEGO row is judged at its own event. */
function positionOf(ix, rowId) {
  if (ix.rows.has(rowId)) return ix.rows.get(rowId).at;
  if (ix.legos.has(rowId)) return ix.legos.get(rowId).at;
  return null;
}

/**
 * Check one proposal {row, en, fi, also?:[{row,en,fi}]}. `pending` is the set of other
 * proposals' {row, en, fi} so rewrites cannot collide with each other either.
 */
function checkRewrite(ix, prop, pending = []) {
  const out = { row: prop.row, problems: [], notes: [] };
  // A REHOME names the LEGO the row would move under (prop.lego): it is then judged at
  // that LEGO's position and must hold that LEGO whole instead of its current one.
  const r0 = ix.rows.get(prop.row) || null;
  const home = prop.lego ? ix.legos.get(prop.lego) : null;
  if (prop.lego && !home) { out.problems.push('rehome LEGO not found: ' + prop.lego); return out; }
  const at = home ? home.at : positionOf(ix, prop.row);
  if (at == null) { out.problems.push('row id not found in live data'); return out; }
  const r = home ? { ...(r0 || { role: 'use', en: '', fi: '' }), lego: prop.lego, role: r0 && r0.role === 'component' ? 'use' : (r0 ? r0.role : 'use') } : r0;
  const legoId = r ? r.lego : prop.row;
  const lego = legoId ? ix.legos.get(legoId) : null;
  // 1. forms
  for (const t of new Set(tokens(prop.fi))) {
    const st = formStatus(ix, t, at);
    if (st.status !== 'taught') out.problems.push(`form "${t}" ${st.status}${st.by ? ' (' + st.by + ')' : ''}`);
  }
  // 2. LEGO whole on both sides (phrases only; a component row is a piece of its LEGO).
  if (r && lego && r.role !== 'component' && r.role !== 'seed') {
    // English inflects round the LEGO ("I'd like you to tell me" holds "you tell me"),
    // so a side is only held to containment if the CURRENT row already satisfied it.
    const sides = [['Finnish', 'fi', 'target_text'], ['English', 'en', 'known_text']];
    for (const [name, k, lk] of sides) {
      const need = tokens(lego[lk]);
      if (containsRun(tokens(prop[k]), need)) continue;
      if (containsRun(tokens(r[k]), need)) out.problems.push(`drops LEGO ${name} "${lego[lk]}"`);
      else out.notes.push(`current row already lacks a literal LEGO ${name} run "${lego[lk]}" — read by eye`);
    }
  }
  // 3. duplicates course-wide, both sides, excluding the row itself
  const self = new Set([prop.row]);
  const nf = normalise(prop.fi), ne = normalise(prop.en);
  const dFi = (ix.byFi.get(nf) || []).filter(i => !self.has(i));
  const dEn = (ix.byEn.get(ne) || []).filter(i => !self.has(i));
  for (const p of pending) if (p.row !== prop.row) { if (normalise(p.fi) === nf) dFi.push('proposal:' + p.row); if (normalise(p.en) === ne) dEn.push('proposal:' + p.row); }
  if (dFi.length) out.problems.push('Finnish duplicates ' + dFi.slice(0, 5).join(','));
  // 4. ZUT: same English somewhere else with a different Finnish
  const zut = dEn.filter(i => { const o = ix.rows.get(i) || null; const l = ix.legos.get(i); const ofi = o ? o.fi : l ? l.target_text : (pending.find(p => 'proposal:' + p.row === i) || {}).fi; return normalise(ofi) !== nf; });
  if (zut.length) out.problems.push('ZUT: English already maps to other Finnish at ' + zut.slice(0, 5).join(','));
  else if (dEn.length) out.problems.push('English duplicates ' + dEn.slice(0, 5).join(','));
  out.ok = out.problems.length === 0;
  return out;
}

/** Every row whose Finnish uses a form not taught at its position: Map id -> [forms]. */
function untaughtRows(ix) {
  const out = new Map();
  for (const r of ix.rows.values()) {
    const bad = tokens(r.fi).filter(t => formStatus(ix, t, r.at).status !== 'taught');
    if (bad.length) out.set(r.id, bad);
  }
  return out;
}

/**
 * CASCADE of changing a seed sentence (id "S0200") or a LEGO's Finnish (id "S0203L02"):
 * rebuild the index with the new text and report (a) rows that newly use an untaught
 * form because this event stopped teaching it, (b) for a LEGO, its own rows that no
 * longer contain the LEGO whole, (c) forms the change newly introduces.
 */
function cascade(payload, id, newFi, newEn) {
  const before = buildIndex(payload);
  const clone = JSON.parse(JSON.stringify(payload));
  let hit = null;
  for (const s of clone.seeds) {
    const sid = `S${String(s.seed_number).padStart(4, '0')}`;
    if (sid === id) { hit = s; s.target_text = newFi; if (newEn) s.known_text = newEn; }
    for (const l of s.legos) if (l.lego_id === id) { hit = l; l.target_text = newFi; if (newEn) l.known_text = newEn; }
  }
  if (!hit) return { error: 'id not found: ' + id };
  const after = buildIndex(clone);
  const ub = untaughtRows(before), ua = untaughtRows(after);
  const newlyBroken = [];
  for (const [rid, f] of ua) { const was = new Set(ub.get(rid) || []); const nf = f.filter(x => !was.has(x)); if (nf.length) newlyBroken.push({ row: rid, forms: nf, fi: after.rows.get(rid).fi }); }
  const at = positionOf(after, id) ?? after.rows.get(id)?.at;
  const introduces = tokens(newFi).filter(t => { const st = formStatus(before, t, at); return st.status !== 'taught'; });
  const legoRowsBroken = [];
  if (after.legos.has(id)) {
    const l = after.legos.get(id);
    for (const r of after.rows.values()) if (r.lego === id && r.role !== 'component' && !containsRun(tokens(r.fi), tokens(l.target_text))) legoRowsBroken.push({ row: r.id, fi: r.fi });
  }
  return { id, introduces: [...new Set(introduces)], newlyBroken, legoRowsBroken };
}

/** Context for one row: seed, its LEGOs (taught so far), and the sibling rows of its LEGO. */
function context(ix, rowId) {
  const r = ix.rows.get(rowId) || null;
  const legoId = r ? r.lego : (ix.legos.has(rowId) ? rowId : null);
  const seedNo = r ? r.seed : legoId ? ix.legos.get(legoId).seed_number : null;
  const sid = `S${String(seedNo).padStart(4, '0')}`;
  const seed = ix.rows.get(sid);
  const lines = [`${sid}: ${seed.en} | ${seed.fi}`];
  for (const l of [...ix.legos.values()].filter(l => l.seed_number === seedNo).sort((a, b) => a.lego_index - b.lego_index)) lines.push(`  ${l.lego_id} ${l.is_new ? 'NEW' : 'notnew'}: ${l.known_text} | ${l.target_text}`);
  if (legoId) for (const x of ix.rows.values()) if (x.lego === legoId) lines.push(`    ${x.id === rowId ? '>>' : '  '}${x.id}: ${x.en} | ${x.fi}`);
  return lines.join('\n');
}

/** Taught forms (at the row's position) containing any of the given substrings. */
function findForms(ix, rowId, subs) {
  const at = positionOf(ix, rowId) ?? key(9999, 0);
  const out = [];
  for (const [f, e] of ix.taught) if (subs.some(s => f.includes(normalise(s)))) out.push({ form: f, by: e.by, available: e.at <= at });
  return out.sort((a, b) => (b.available - a.available) || a.form.localeCompare(b.form));
}

/** Rows (course-wide) whose Finnish contains the given token run — to see how a form is used. */
function usages(ix, fi, limit = 12, side = 'fi') {
  const need = tokens(fi); const out = [];
  for (const r of ix.rows.values()) if (containsRun(tokens(r[side]), need)) { out.push(`${r.id}: ${r.en} | ${r.fi}`); if (out.length >= limit) break; }
  return out;
}

/**
 * THE WHOLE-SET CHECK. Applying a seed or LEGO change and the rows that move with it
 * one at a time cannot be judged against today's course (the row clashes with the
 * seed it is about to mirror; a new LEGO form is "absent" until the LEGO changes).
 * So: apply EVERY edit to a copy of the payload, rebuild the index, and judge each
 * edited item in that world. Nothing here writes anywhere — the copy is in memory.
 *
 * edits: [{ row, en, fi, delete?, lego? (rehome target), from? (proposal id) }]
 *   row = a seed id "S0127", a LEGO id "S0127L01" or a phrase id "S0127L01U01".
 */
function applyEdits(payload, edits) {
  const world = JSON.parse(JSON.stringify(payload));
  const seedOf = {}, legoOf = {}, phraseOf = {};
  for (const s of world.seeds) {
    seedOf[`S${String(s.seed_number).padStart(4, '0')}`] = s;
    for (const l of s.legos) { legoOf[l.lego_id] = l; for (const p of l.basket_phrases || []) phraseOf[String(p.id).split(':').pop()] = { p, l }; }
  }
  const unknown = [];
  for (const e of edits) {
    if (seedOf[e.row]) { const s = seedOf[e.row]; if (e.fi) s.target_text = e.fi; if (e.en) s.known_text = e.en; continue; }
    if (legoOf[e.row]) { const l = legoOf[e.row]; if (e.fi) l.target_text = e.fi; if (e.en) l.known_text = e.en; continue; }
    const hit = phraseOf[e.row];
    if (!hit) { unknown.push(e.row); continue; }
    if (e.delete) { hit.l.basket_phrases = hit.l.basket_phrases.filter(x => x !== hit.p); continue; }
    if (e.fi) hit.p.target_text = e.fi; if (e.en) hit.p.known_text = e.en;
    if (e.lego && legoOf[e.lego] && legoOf[e.lego] !== hit.l) {
      hit.l.basket_phrases = hit.l.basket_phrases.filter(x => x !== hit.p);
      legoOf[e.lego].basket_phrases.push(hit.p); hit.l = legoOf[e.lego];
    }
  }
  return { world, unknown };
}

/** ZUT census: English sides that map to more than one Finnish, course-wide. */
function zutSet(ix) {
  const out = new Set();
  for (const [en, ids] of ix.byEn) {
    const f = new Set(ids.map(i => { const r = ix.rows.get(i), l = ix.legos.get(i); return normalise(r ? r.fi : l.target_text); }));
    if (f.size > 1) out.add(en);
  }
  return out;
}

function checkWorld(payload, edits) {
  const before = buildIndex(payload);
  const { world, unknown } = applyEdits(payload, edits);
  const after = buildIndex(world);
  const results = [];
  // A row may mirror its own LEGO (B01) or its own seed (the seed-copy row): those
  // duplicates are the course's design, not a defect. A seed is likewise mirrored by
  // rows of its own seed.
  const own = id => {
    const r = after.rows.get(id); const ids = new Set([id]);
    if (r && r.lego) ids.add(r.lego);
    if (r) ids.add(`S${String(r.seed).padStart(4, '0')}`);
    if (r && r.role === 'seed') for (const x of after.rows.values()) if (x.seed === r.seed) ids.add(x.id);
    return ids;
  };
  for (const e of edits) {
    const problems = [];
    if (e.delete) { results.push({ row: e.row, from: e.from, ok: true, problems, deleted: true }); continue; }
    if (after.legos.has(e.row)) {
      const l = after.legos.get(e.row);
      const intro = tokens(l.target_text).filter(t => formStatus(before, t, l.at).status !== 'taught');
      // a LEGO teaches its own forms; what matters is that its rows still hold it
      for (const r of after.rows.values()) if (r.lego === e.row && r.role !== 'component' && !containsRun(tokens(r.fi), tokens(l.target_text))) problems.push(`LEGO row ${r.id} no longer holds "${l.target_text}"`);
      results.push({ row: e.row, from: e.from, ok: !problems.length, problems, introduces: [...new Set(intro)] });
      continue;
    }
    const r = after.rows.get(e.row);
    if (!r) { results.push({ row: e.row, from: e.from, ok: false, problems: ['not found after apply'] }); continue; }
    if (r.role === 'seed') {
      // a seed's forms must be taught by its own LEGOs or earlier (tiling); the seed
      // event is never evidence for itself
      const miss = tokens(r.fi).filter(t => { const x = after.taught.get(t); return !(x && x.at < r.at && x.by !== r.id); });
      if (miss.length) problems.push(`seed form(s) in no LEGO of this seed or earlier: ${[...new Set(miss)].join(', ')}`);
    } else {
      for (const t of new Set(tokens(r.fi))) { const st = formStatus(after, t, r.at); if (st.status !== 'taught') problems.push(`form "${t}" ${st.status}`); }
      const l = after.legos.get(r.lego);
      if (l && r.role !== 'component') {
        const orig = before.rows.get(e.row);
        const origLego = orig && before.legos.get(orig.lego);
        // as in checkRewrite: a row that never held its LEGO literally is read by eye
        if (!containsRun(tokens(r.fi), tokens(l.target_text)) && (!orig || containsRun(tokens(orig.fi), tokens(origLego?.target_text || '')))) problems.push(`drops LEGO Finnish "${l.target_text}"`);
        if (!containsRun(tokens(r.en), tokens(l.known_text)) && (!orig || containsRun(tokens(orig.en), tokens(before.legos.get(orig.lego)?.known_text || '')))) problems.push(`drops LEGO English "${l.known_text}"`);
      }
    }
    const mine = own(e.row);
    const dFi = (after.byFi.get(normalise(r.fi)) || []).filter(i => !mine.has(i));
    if (dFi.length) problems.push('Finnish duplicates ' + dFi.slice(0, 4).join(','));
    const sameEn = (after.byEn.get(normalise(r.en)) || []).filter(i => i !== e.row);
    const zut = sameEn.filter(i => { const o = after.rows.get(i), l = after.legos.get(i); return normalise(o ? o.fi : l.target_text) !== normalise(r.fi); });
    if (zut.length) problems.push('ZUT with ' + zut.slice(0, 4).join(','));
    else if (sameEn.filter(i => !mine.has(i)).length) problems.push('English duplicates ' + sameEn.filter(i => !mine.has(i)).slice(0, 4).join(','));
    results.push({ row: e.row, from: e.from, ok: !problems.length, problems });
  }
  // knock-on: rows NOT edited that are newly broken in the new world
  const edited = new Set(edits.map(e => e.row));
  const ub = untaughtRows(before), ua = untaughtRows(after);
  const knockOn = [];
  for (const [id, f] of ua) { if (edited.has(id)) continue; const was = new Set(ub.get(id) || []); const nf = f.filter(x => !was.has(x)); if (nf.length) knockOn.push({ row: id, forms: nf, fi: after.rows.get(id).fi }); }
  for (const l of after.legos.values()) if (edited.has(l.lego_id)) for (const r of after.rows.values()) if (r.lego === l.lego_id && !edited.has(r.id) && r.role !== 'component' && !containsRun(tokens(r.fi), tokens(l.target_text))) knockOn.push({ row: r.id, forms: [`no longer holds LEGO "${l.target_text}"`], fi: r.fi });
  const zb = zutSet(before), za = zutSet(after);
  return { results, unknown, knockOn, zutBefore: zb.size, zutAfter: za.size, zutNew: [...za].filter(x => !zb.has(x)), zutGone: [...zb].filter(x => !za.has(x)).length };
}

module.exports = { applyEdits, checkWorld, zutSet, normalise, tokens, buildIndex, formStatus, positionOf, checkRewrite, containsRun, key, untaughtRows, cascade, context, findForms, usages };

if (require.main === module) {
  const [cmd, file, ...rest] = process.argv.slice(2);
  if (!cmd || !file) {
    console.error(`usage (live.json = GET /api/production/fin_for_eng/seeds):
  ctx     <live.json> <rowId>                 seed, its LEGOs, the row's LEGO siblings
  at      <live.json> <rowId> <form...>       is each exact form taught at that row?
  find    <live.json> <rowId> <substr...>     taught forms containing a substring (OK = available there)
  uses    <live.json> "<run>" [n] [--en]      rows containing a Finnish (or, with --en, English) token run
  try     <live.json> <rowId> "<en>" "<fi>" [--lego S0xxxLyy]   full check of one rewrite (forms,
          LEGO whole, dupes, ZUT); --lego judges it as REHOMED under that LEGO instead
  cascade <live.json> <S0200|S0203L02> "<fi>" ["<en>"]   what a seed/LEGO change breaks downstream
  check   <live.json> <proposals.json>        check a list [{row,en,fi}] incl. collisions among them
  world   <live.json> <edits.json>            apply ALL edits [{row,en,fi,delete?,lego?}] to an in-memory copy and
          judge each in that world, plus knock-on rows and the ZUT census before/after
  index   <live.json> <form...>               where each form is first taught/heard/tiled`);
    process.exit(2);
  }
  const ix = buildIndex(JSON.parse(fs.readFileSync(file, 'utf8')));
  if (cmd === 'index') {
    for (const f of rest) {
      const t = ix.taught.get(normalise(f)), h = ix.heard.get(normalise(f)), ti = ix.tile.get(normalise(f));
      console.log(`${f}\ttaught:${t ? t.by : '-'}\theard:${h ? h.by : '-'}\ttile:${ti ? ti.by : '-'}`);
    }
  } else if (cmd === 'at') {
    const [row, ...forms] = rest; const at = positionOf(ix, row);
    for (const f of forms) { const s = formStatus(ix, normalise(f), at); console.log(`${f}\t${s.status}\t${s.by || ''}`); }
  } else if (cmd === 'ctx') {
    console.log(context(ix, rest[0]));
  } else if (cmd === 'find') {
    const [row, ...subs] = rest;
    for (const f of findForms(ix, row, subs)) console.log(`${f.available ? 'OK ' : 'later'}\t${f.form}\t${f.by}`);
  } else if (cmd === 'uses') {
    const en = rest.includes('--en'); const a = rest.filter(x => x !== '--en');
    console.log(usages(ix, a[0], Number(a[1]) || 12, en ? 'en' : 'fi').join('\n'));
  } else if (cmd === 'try') {
    const li = rest.indexOf('--lego'); const lego = li >= 0 ? rest[li + 1] : undefined;
    const [row, en, fi] = li >= 0 ? rest.slice(0, li).concat(rest.slice(li + 2)) : rest;
    const r = checkRewrite(ix, { row, en, fi, lego });
    console.log((r.ok ? 'PASS' : 'FAIL: ' + r.problems.join('; ')) + (r.notes.length ? '  [note: ' + r.notes.join('; ') + ']' : ''));
  } else if (cmd === 'cascade') {
    const [id, fi, en] = rest;
    console.log(JSON.stringify(cascade(JSON.parse(fs.readFileSync(file, 'utf8')), id, fi, en), null, 1));
  } else if (cmd === 'world') {
    const edits = JSON.parse(fs.readFileSync(rest[0], 'utf8'));
    const w = checkWorld(JSON.parse(fs.readFileSync(file, 'utf8')), edits);
    console.log(JSON.stringify(w, null, 1));
    console.error(`${w.results.filter(r => r.ok).length}/${w.results.length} pass; knock-on ${w.knockOn.length}; ZUT ${w.zutBefore}->${w.zutAfter} (+${w.zutNew.length} new)`);
  } else if (cmd === 'check') {
    const props = JSON.parse(fs.readFileSync(rest[0], 'utf8'));
    const res = props.map(p => ({ ...checkRewrite(ix, p, props), id: p.id }));
    console.log(JSON.stringify(res, null, 1));
    console.error(`${res.filter(r => r.ok).length}/${res.length} pass`);
  }
}
