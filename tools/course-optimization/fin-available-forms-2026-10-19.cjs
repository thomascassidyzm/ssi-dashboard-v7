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

module.exports = { normalise, tokens, buildIndex, formStatus, positionOf, checkRewrite, containsRun, key, untaughtRows, cascade, context, findForms, usages };

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
  } else if (cmd === 'check') {
    const props = JSON.parse(fs.readFileSync(rest[0], 'utf8'));
    const res = props.map(p => ({ ...checkRewrite(ix, p, props), id: p.id }));
    console.log(JSON.stringify(res, null, 1));
    console.error(`${res.filter(r => r.ok).length}/${res.length} pass`);
  }
}
