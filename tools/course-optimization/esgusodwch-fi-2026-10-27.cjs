#!/usr/bin/env node
'use strict';
// tools/course-optimization/esgusodwch-fi-2026-10-27.cjs — 'esgusodwch fi' replaces sir/madam in cym_nv2_for_eng and
// cym_sv2_for_eng (seeds 1639-1655 and four later South lines). Job #139 applies Aran's ruling of 2026-10-27 on the
// job #114 drafts: the drafts are ops/esgusodwch-fi-139/drafts-{n,s}.tsv, the ruling is ./esgusodwch-fi-2026-10-27.data.cjs.
//
// Every row is checked against the LIVE course before an op is written, and is HELD (never forced, listed for Aran) when:
//   drift      the live row is not the one the draft was written against (gone, or no longer says sir/madam)
//   containment  a phrase's new Welsh no longer contains its LEGO's new Welsh (his own-worded seed 1647 moved the LEGO
//              to "siarad Cymraeg"; accepted drafts that still say "siarad hi" cannot sit under it)
//   leftover   a LEGO delete whose LEGO would still hold a phrase he left unchanged
//   sir/madam  the new text still says sir, madam or syr
//   duplicate  the new Welsh is already another row of the same basket
// Structure the drafts imply, done here as well (all through edit-batch ops):
//   - North seed 1639: LEGO S1639L01 'sir' becomes 'excuse me' in place (the slot sir had).
//   - South seed 1639: South had no 'sir' LEGO, and lego_index cannot go below 1, so 'excuse me' cannot be inserted IN
//     FRONT of S1639L01. It takes S1639L01's slot instead (its 11 phrases rewritten with the drafted 'excuse me'
//     phrases), and the drafted 'excuse me, can I sit with you?' LEGO is inserted as S1639L02 with its accepted phrases
//     — the same shape as North. The learner meets 'excuse me' first, as the placement item said.
//   - North seed 1642: its draft note puts 'excuse me' in the seed as a reference LEGO; it is inserted (S1642L04).
//   - Component rows (North only — the South course has none here) follow each LEGO's new parts: a part with no row
//     gets one, a row whose part has gone is re-pointed to the new part.
// No intro is written: Popty has no route that stores a hand-written intro line without rendering it
// (/regenerate-presentation renders TTS; /prepare-presentations-scoped writes only the template). Both courses are
// human-voice, so no audio is rendered either — new and changed lines go to the booths.
//
//   node …cjs check  <course> <seeds.json>   # pure: the plan, the holds, the ops (no network)
//   node …cjs dry    <course> <seeds.json>   # + the edit-batch dry run (transaction rolled back)
//   APPLY_CONFIRM=1 node …cjs apply <course> <seeds.json>   # + apply (response carries event_id + undo_file)
//   node …cjs verify <course> <seeds.json>   # on a fresh dump: what the ruling says is what the course says
// seeds.json = GET /api/production/<course>/seeds?status=all
const fs = require('fs');
const path = require('path');
const { RULING, COMPONENTS } = require('./esgusodwch-fi-2026-10-27.data.cjs');

const AGENT = 'aran-watson-139 (esgusodwch fi, job #139)';
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
const DRAFTS = { cym_nv2_for_eng: 'drafts-n.tsv', cym_sv2_for_eng: 'drafts-s.tsv' };
const DRAFT_DIR = path.join(__dirname, '..', '..', 'ops', 'esgusodwch-fi-139');
const SIR = /\b(sir|madam|syr)\b/i;

const curly = (s) => s.replace(/'/g, '’');
const straight = (s) => s.replace(/[’‘]/g, "'");
const norm = (s) => String(s || '').normalize('NFC').toLowerCase().replace(/[’‘`´]/g, "'").replace(/[?,.!]/g, ' ').replace(/\s+/g, ' ').trim();
const sid = (id) => String(id).split(':').pop();
const legoOf = (id) => id.slice(0, 8);
const isComp = (id) => /C\d\d$/.test(id);
const knownWords = (k) => ((k || '').match(/\s+/g) || []).length + 1;

function parseDrafts(text) {
  const m = new Map();
  for (const line of text.split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const [id, k, t, note] = line.split('\t');
    m.set(id, { k, t, note: note || '' });
  }
  return m;
}

/** Drafts with the ruling laid over them: unchanged → dropped, own → his words, remove/deleteLego → DEL. */
function ruled(drafts, rule) {
  const out = new Map(drafts);
  for (const id of rule.unchanged) out.delete(id);
  for (const [id, [k, t]] of Object.entries(rule.own)) out.set(id, { k: curly(k), t: curly(t), note: 'own wording (Aran)' , own: true });
  for (const id of rule.remove) out.set(id, { k: 'DEL', t: '', note: 'removed (Aran)' });
  for (const l of rule.deleteLego) out.set(`lego:${l}`, { k: 'DEL', t: '', note: 'LEGO deleted (Aran)' });
  return out;
}

function fromApi(api) {
  const seeds = [], legos = [], phrases = [];
  for (const s of api.seeds) {
    const { legos: ls, ...seed } = s; seeds.push(seed);
    for (const l of ls || []) { const { basket_phrases, ...lego } = l; legos.push(lego); for (const p of basket_phrases || []) phrases.push(p); }
  }
  return { seeds, legos, phrases };
}

const legoText = (k) => k.replace(/\s*\(reference\)\s*$/, '');

/** The plan (pure). */
function plan(course, db, draftsText, { decomposer = require('../../services/phrase-decomposer.cjs'), position = require('../../services/course-builder/lib/phrase-structure.cjs') } = {}) {
  const rule = RULING[course];
  if (!rule) throw new Error(`no ruling for ${course}`);
  const D = ruled(parseDrafts(draftsText), rule);
  const pid = (id) => `${course}:${id}`;
  const seeds = new Map(db.seeds.map((s) => [s.seed_number, s]));
  const legos = new Map(db.legos.map((l) => [l.lego_id, l]));
  const phrases = new Map(db.phrases.map((p) => [sid(p.id), p]));
  const north = course === 'cym_nv2_for_eng';
  const held = [], listed = [], notes = [];
  const hold = (id, why, d) => held.push({ id, why, draft: d ? [d.k, d.t] : null });

  // ── 1. the LEGOs as they will read ───────────────────────────────────────────────────────────────────────────────
  const after = new Map(db.legos.map((l) => [l.lego_id, { ...l }]));
  const legoOps = [];
  const inserts = [];
  // phrase drafts that move to another LEGO id (South 1639 swap) and live rows that take other drafts
  const phraseTarget = new Map(); // draftId → live/new phrase id it lands on
  if (!north) {
    // South: 'excuse me' takes S1639L01's slot; the sit-with-you LEGO is inserted as S1639L02.
    const nl = D.get('newlego:S1639Lnew'), sit = D.get('lego:S1639L01');
    after.set('S1639L01', { ...after.get('S1639L01'), known_text: nl.k, target_text: nl.t });
    after.set('S1639L02', { lego_id: 'S1639L02', seed_number: 1639, lego_index: 2, known_text: sit.k, target_text: sit.t, type: 'M', is_new: true, components: [{ known: sit.k, target: sit.t }] });
    if (legos.has('S1639L02')) throw new Error('South S1639L02 already exists — the swap assumes it is free');
    inserts.push({ op: 'lego.insert', row: { seed_number: 1639, lego_index: 2, known_text: sit.k, target_text: sit.t, type: 'M', is_new: true, status: 'draft', components: [{ known: sit.k, target: sit.t }] } });
    legoOps.push({ id: 'S1639L01', set: { known_text: nl.k, target_text: nl.t, type: 'M', components: COMPONENTS[course].S1639L01 } });
    // the sit-with-you drafts (keyed S1639L01xx) land on new S1639L02xx rows; the 'excuse me' drafts on the old rows
    const oldRows = db.phrases.filter((p) => sid(p.id).startsWith('S1639L01')).map((p) => sid(p.id)).sort();
    const newDrafts = [...D.keys()].filter((k) => k.startsWith('new:S1639LnewP')).sort((a, b) => Number(a.split('P').pop()) - Number(b.split('P').pop()));
    const byRole = { B: oldRows.filter((r) => /B\d\d$/.test(r)), U: oldRows.filter((r) => /U\d\d$/.test(r)) };
    // P1-P4 are the short (build) lines, P5-P10 the longer (use) lines, exactly as North's S1639L01 rows are.
    newDrafts.forEach((d, i) => { const slot = i < 4 ? byRole.B[i] : byRole.U[i - 4]; if (slot) phraseTarget.set(d, slot); else hold(d, 'no live row left to carry it', D.get(d)); });
    for (const r of oldRows) if (![...phraseTarget.values()].includes(r)) D.set(`__free:${r}`, { k: 'DEL', t: '', note: 'old S1639L01 row with no drafted line left (sit-with-you moved to S1639L02)' });
    for (const k of [...D.keys()]) if (/^S1639L01[BU]\d\d$/.test(k)) phraseTarget.set(k, `S1639L02${k.slice(8)}`);
  }
  for (const [id, d] of D) {
    const m = /^lego:(S\d{4}L\d\d)$/.exec(id);
    if (!m || (!north && m[1] === 'S1639L01')) continue;
    const L = m[1];
    const live = legos.get(L);
    if (!live) { hold(id, 'drift: LEGO not in the course', d); continue; }
    if (d.k === 'DEL') continue; // handled in step 3
    if (!d.own && !SIR.test(`${live.known_text} ${live.target_text}`)) { hold(id, `drift: live LEGO reads "${live.known_text} | ${live.target_text}"`, d); continue; }
    const k = legoText(d.k), t = d.t;
    const set = { known_text: k, target_text: t };
    if (live.type === 'M' || (COMPONENTS[course] || {})[L]) {
      set.type = 'M';
      set.components = (COMPONENTS[course] || {})[L] || [{ known: k, target: t }];
    }
    after.set(L, { ...after.get(L), ...set });
    legoOps.push({ id: L, set });
  }
  if (north) {
    // seed 1642: 'excuse me' as a reference LEGO (draft note on seed:1642)
    const idx = Math.max(...db.legos.filter((l) => l.seed_number === 1642).map((l) => l.lego_index)) + 1;
    const L = `S1642L${String(idx).padStart(2, '0')}`;
    inserts.push({ op: 'lego.insert', row: { seed_number: 1642, lego_index: idx, known_text: 'excuse me', target_text: 'esgusodwch fi', type: 'A', is_new: false, status: 'draft' } });
    after.set(L, { lego_id: L, seed_number: 1642, lego_index: idx, known_text: 'excuse me', target_text: 'esgusodwch fi', type: 'A', is_new: false });
    notes.push(`${L}: 'excuse me' reference added to seed 1642 (after the LEGOs already there — lego order cannot be moved through the edit door)`);
  }

  // ── 2. the phrases ────────────────────────────────────────────────────────────────────────────────────────────────
  const deletingLego = new Set([...D].filter(([id, d]) => id.startsWith('lego:') && d.k === 'DEL').map(([id]) => id.slice(5)));
  const vocabFor = (seedN) => [...after.values()].filter((l) => l.seed_number <= seedN && !deletingLego.has(l.lego_id))
    .map((l) => ({ lego_id: l.lego_id, target_text: l.target_text, known_text: l.known_text, seed_number: l.seed_number }));
  const basketNew = new Map(); // lego → Map(norm target → id), for the duplicate check
  const phraseOps = [];
  const deleting = new Set();
  for (const [id, d] of D) {
    if (/^(lego|newlego|seed):/.test(id)) continue;
    const free = id.startsWith('__free:');
    const src = free ? id.slice(7) : id;
    const target = phraseTarget.get(id) || (src.startsWith('new:') ? null : src);
    if (!target) continue;
    const live = phrases.get(target);
    const L = legoOf(target);
    if (d.k === 'DEL') {
      if (phraseTarget.has(id) && !live) continue; // a removed sit-with-you draft that is simply never inserted
      if (!live) { hold(id, 'drift: phrase already gone', d); continue; }
      if (deletingLego.has(L)) continue; // goes with its LEGO
      deleting.add(target);
      phraseOps.push({ op: 'phrase.delete', phrase_id: pid(target), expect: { known_text: live.known_text, target_text: live.target_text } });
      continue;
    }
    if (!live && !phraseTarget.has(id)) { hold(id, 'drift: phrase not in the course', d); continue; }
    if (deletingLego.has(L)) { listed.push({ id, why: `its LEGO ${L} is deleted (Aran): accepted draft not placed`, draft: [d.k, d.t] }); continue; }
    const lego = after.get(L);
    if (!lego) { hold(id, `its LEGO ${L} is not in the course`, d); continue; }
    if (live && !d.own && !phraseTarget.has(id) && !SIR.test(`${live.known_text} ${live.target_text}`)) { hold(id, `drift: live row reads "${live.known_text} | ${live.target_text}"`, d); continue; }
    if (SIR.test(`${d.k} ${d.t}`)) { hold(id, 'new text still says sir/madam', d); continue; }
    if (!isComp(target) && !norm(d.t).includes(norm(lego.target_text))) {
      // A regression test, not a purity test: a row that never held its (unchanged) LEGO word for word — a mutation,
      // "mai’r un coch" under "yr un coch" — is not made worse by losing its 'syr'. A LEGO the ruling changed must be held.
      const liveLego = legos.get(L);
      const legoChanged = !liveLego || norm(liveLego.target_text) !== norm(lego.target_text);
      const heldBefore = live && liveLego && norm(live.target_text).includes(norm(liveLego.target_text));
      if (legoChanged || heldBefore) { hold(id, `containment: "${d.t}" does not contain its LEGO ${L} "${lego.target_text}"`, d); continue; }
      notes.push(`${target}: does not contain "${lego.target_text}" word for word, and did not before either (applied)`);
    }
    if (!isComp(target)) {
      const seen = basketNew.get(L) || new Map(); basketNew.set(L, seen);
      if (seen.has(norm(d.t))) { hold(id, `duplicate of ${seen.get(norm(d.t))} in ${L}`, d); continue; }
      seen.set(norm(d.t), target);
    }
    const dec = decomposer.decomposeAnchored(d.t, vocabFor(lego.seed_number), isComp(target) ? null : lego, course);
    const set = { known_text: d.k, target_text: d.t, word_count: d.t.length, lego_count: knownWords(d.k), decomposition: dec.blocks };
    if (!isComp(target)) set.lego_position = position.computeLegoPosition(d.t, lego.target_text);
    if (live) {
      phraseOps.push({ op: 'phrase.update', phrase_id: pid(target), set, expect: { known_text: live.known_text, target_text: live.target_text } });
    } else {
      // an inserted row (South S1639L02): shaped as Popty's builder shapes one
      const role = /B\d\d$/.test(target) ? 'build' : 'use';
      phraseOps.push({ op: 'phrase.insert', row: { id: pid(target), course_code: course, seed_number: lego.seed_number, lego_index: lego.lego_index,
        phrase_role: role, position: 0, introduce: true, status: 'draft', metadata: { format: 'build_use', pipeline: 'v2' }, connected_lego_ids: [], ...set } });
    }
  }
  // positions for inserted rows: in id order, builds first
  const ins = phraseOps.filter((o) => o.op === 'phrase.insert').sort((a, b) => a.row.id.localeCompare(b.row.id));
  ins.forEach((o, i) => { o.row.position = i + 1; });

  // component rows follow the new parts (only where the LEGO already has component rows)
  const compOps = [];
  for (const { id: L, set } of legoOps) {
    if (!set.components) continue;
    const rows = db.phrases.filter((p) => sid(p.id).startsWith(L) && p.phrase_role === 'component');
    if (!rows.length) continue;
    const reads = (r) => { const op = phraseOps.find((o) => o.op === 'phrase.update' && o.phrase_id === r.id); return op ? { known: op.set.known_text, target: op.set.target_text } : { known: r.known_text, target: r.target_text }; };
    const key = (c) => `${norm(c.known)}|${norm(c.target)}`;
    const have = new Set(rows.map((r) => key(reads(r))));
    const want = new Set(set.components.map(key));
    const stale = rows.filter((r) => !want.has(key(reads(r))));
    const missing = set.components.filter((c) => !have.has(key(c)));
    let next = Math.max(...rows.map((r) => Number(sid(r.id).slice(-2)))) + 1;
    let pos = Math.max(...rows.map((r) => r.position || 0)) + 1;
    for (const c of missing) {
      const dec = decomposer.decomposeAnchored(c.target, vocabFor(Number(L.slice(1, 5))), null, course).blocks;
      const s = stale.shift();
      if (s) {
        compOps.push({ op: 'phrase.update', phrase_id: s.id, set: { known_text: c.known, target_text: c.target, word_count: c.target.length, lego_count: 1, decomposition: dec }, expect: { known_text: s.known_text, target_text: s.target_text } });
        notes.push(`${sid(s.id)}: component "${s.known_text} | ${s.target_text}" re-pointed to the new part "${c.known} | ${c.target}"`);
      } else {
        const tmpl = rows[0];
        const nid = `${L}C${String(next++).padStart(2, '0')}`;
        compOps.push({ op: 'phrase.insert', row: { id: pid(nid), course_code: course, seed_number: tmpl.seed_number, lego_index: tmpl.lego_index, phrase_role: 'component',
          position: pos++, introduce: tmpl.introduce, status: tmpl.status || 'draft', metadata: tmpl.metadata, connected_lego_ids: [], known_text: c.known, target_text: c.target,
          word_count: c.target.length, lego_count: 1, lego_position: tmpl.lego_position, decomposition: dec } });
        notes.push(`${nid}: component row added for the new part "${c.known} | ${c.target}"`);
      }
    }
    for (const s of stale) notes.push(`${sid(s.id)}: component row "${reads(s).known} | ${reads(s).target}" no longer matches a part of ${L} (left as it is)`);
  }

  // ── 3. LEGO deletes ───────────────────────────────────────────────────────────────────────────────────────────────
  const deleteOps = [];
  for (const L of deletingLego) {
    const live = legos.get(L);
    if (!live) { hold(`lego:${L}`, 'drift: LEGO already gone'); continue; }
    const remaining = db.phrases.filter((p) => sid(p.id).startsWith(L) && !deleting.has(sid(p.id)) && !(D.get(sid(p.id)) && D.get(sid(p.id)).k === 'DEL'));
    const left = remaining.filter((p) => !RULING[course].deleteLego.includes(L));
    if (left.length) {
      hold(`lego:${L}`, `leftover: ${left.map((p) => sid(p.id)).join(', ')} stays (left unchanged by Aran), so the LEGO cannot go`);
      // its DEL phrases still go, one by one
      for (const p of db.phrases.filter((q) => sid(q.id).startsWith(L) && D.get(sid(q.id)) && D.get(sid(q.id)).k === 'DEL')) {
        phraseOps.push({ op: 'phrase.delete', phrase_id: p.id, expect: { known_text: p.known_text, target_text: p.target_text } });
      }
      continue;
    }
    deleteOps.push({ op: 'lego.delete', lego_id: L, cascade_phrases: true, expect: { known_text: live.known_text, target_text: live.target_text } });
  }

  // ── 4. seeds ──────────────────────────────────────────────────────────────────────────────────────────────────────
  const seedOps = [];
  for (const [id, d] of D) {
    const m = /^seed:(\d+)$/.exec(id); if (!m) continue;
    const s = seeds.get(Number(m[1]));
    if (!s) { hold(id, 'drift: seed not in the course', d); continue; }
    if (!d.own && !SIR.test(`${s.known_text} ${s.target_text}`)) { hold(id, `drift: live seed reads "${s.known_text} | ${s.target_text}"`, d); continue; }
    seedOps.push({ op: 'seed.update', seed_number: s.seed_number, set: { known_text: straight(d.k), target_text: d.t }, expect: { known_text: s.known_text, target_text: s.target_text } });
  }

  const ops = [
    ...seedOps,
    ...legoOps.map((l) => ({ op: 'lego.update', lego_id: l.id, set: l.set, expect: { known_text: legos.get(l.id).known_text, target_text: legos.get(l.id).target_text } })),
    ...inserts,
    ...phraseOps.filter((o) => o.op !== 'phrase.insert'),
    ...phraseOps.filter((o) => o.op === 'phrase.insert'),
    ...compOps,
    ...deleteOps,
  ];
  // what will still say sir/madam (held rows, and rows nothing touched)
  const touched = new Set(ops.map((o) => o.phrase_id && sid(o.phrase_id)).filter(Boolean));
  const leftSir = [];
  for (const p of db.phrases) {
    const s = sid(p.id);
    if (touched.has(s) || deletingLego.has(legoOf(s)) && deleteOps.length) continue;
    if (SIR.test(`${p.known_text} ${p.target_text}`)) leftSir.push(`${s}: ${p.known_text} | ${p.target_text}`);
  }
  for (const l of db.legos) if (!legoOps.find((o) => o.id === l.lego_id) && !deleteOps.find((o) => o.lego_id === l.lego_id) && SIR.test(`${l.known_text} ${l.target_text}`)) leftSir.push(`LEGO ${l.lego_id}: ${l.known_text} | ${l.target_text}`);
  for (const s of db.seeds) if (!seedOps.find((o) => o.seed_number === s.seed_number) && SIR.test(`${s.known_text} ${s.target_text}`)) leftSir.push(`seed ${s.seed_number}: ${s.known_text} | ${s.target_text}`);
  return { course, ops, held, listed, notes, leftSir, ruled: D };
}

/** After applying: every ruled row reads as ruled. */
function verify(course, db, draftsText) {
  const rule = RULING[course];
  const D = ruled(parseDrafts(draftsText), rule);
  const phrases = new Map(db.phrases.map((p) => [sid(p.id), p]));
  const legos = new Map(db.legos.map((l) => [l.lego_id, l]));
  const seeds = new Map(db.seeds.map((s) => [s.seed_number, s]));
  const bad = [];
  const eq = (row, k, t, what) => { if (!row) bad.push(`${what}: missing`); else if (row.known_text !== k || row.target_text !== t) bad.push(`${what}: reads "${row.known_text} | ${row.target_text}", ruled "${k} | ${t}"`); };
  for (const [id, [k, t]] of Object.entries(rule.own)) {
    if (id.startsWith('seed:')) eq(seeds.get(Number(id.slice(5))), straight(curly(k)), curly(t), id);
    else if (id.startsWith('lego:')) eq(legos.get(id.slice(5)), curly(k), curly(t), id);
    else eq(phrases.get(course === 'cym_sv2_for_eng' && id.startsWith('S1639L01') ? `S1639L02${id.slice(8)}` : id), curly(k), curly(t), id);
  }
  for (const id of rule.remove) {
    const at = course === 'cym_sv2_for_eng' && id.startsWith('S1639L01') ? `S1639L02${id.slice(8)}` : id;
    const p = phrases.get(at);
    if (p && at !== id) bad.push(`${at}: should not exist (removed sit-with-you draft)`);
    if (p && at === id) bad.push(`${id}: should be removed, still present "${p.known_text} | ${p.target_text}"`);
  }
  for (const L of rule.deleteLego) if (legos.has(L)) bad.push(`LEGO ${L}: should be deleted`);
  for (const id of rule.unchanged) if (!phrases.has(id)) bad.push(`${id}: left unchanged by Aran but gone`);
  const l1 = legos.get('S1639L01');
  if (!l1 || l1.target_text !== 'esgusodwch fi' || !l1.is_new) bad.push(`S1639L01 is not the new 'esgusodwch fi' LEGO (${l1 && l1.target_text})`);
  const sir = [];
  for (const s of db.seeds) if (SIR.test(`${s.known_text} ${s.target_text}`)) sir.push(`seed ${s.seed_number}: ${s.known_text} | ${s.target_text}`);
  for (const l of db.legos) if (SIR.test(`${l.known_text} ${l.target_text} ${JSON.stringify(l.components || '')}`)) sir.push(`LEGO ${l.lego_id}: ${l.known_text} | ${l.target_text}`);
  for (const p of db.phrases) if (SIR.test(`${p.known_text} ${p.target_text}`)) sir.push(`${sid(p.id)}: ${p.known_text} | ${p.target_text}`);
  return { bad, sir };
}

async function post(url, body) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body), signal: AbortSignal.timeout(300000) });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

async function main() {
  const [mode, course, file] = process.argv.slice(2);
  if (!mode || !RULING[course] || !file) throw new Error('usage: check|dry|apply|verify <cym_nv2_for_eng|cym_sv2_for_eng> <seeds.json>');
  const db = fromApi(JSON.parse(fs.readFileSync(file, 'utf8')));
  const draftsText = fs.readFileSync(path.join(DRAFT_DIR, DRAFTS[course]), 'utf8');
  const out = process.env.LOG_DIR || process.cwd();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const save = (n, log) => { const f = path.join(out, `esgusodwch-${course}-${n}-${stamp}.json`); fs.writeFileSync(f, JSON.stringify(log, null, 2)); return f; };
  if (mode === 'verify') {
    const r = verify(course, db, draftsText);
    console.log(`verify ${course}: ${r.bad.length} mismatches, ${r.sir.length} rows still saying sir/madam/syr`);
    for (const b of r.bad) console.log('  BAD', b);
    for (const s of r.sir) console.log('  SIR', s);
    console.log(save('verify', r));
    if (r.bad.length) process.exitCode = 1;
    return;
  }
  const p = plan(course, db, draftsText);
  const count = {}; for (const o of p.ops) count[o.op] = (count[o.op] || 0) + 1;
  console.log(`plan ${course}: ${p.ops.length} ops ${JSON.stringify(count)}, ${p.held.length} held, ${p.listed.length} listed`);
  for (const h of p.held) console.log('  HELD', h.id, '—', h.why);
  for (const l of p.listed) console.log('  LISTED', l.id, '—', l.why);
  for (const n of p.notes) console.log('  NOTE', n);
  for (const s of p.leftSir) console.log('  STILL SIR', s);
  const log = { job: '#139', course, stamp, plan: { ops: p.ops, held: p.held, listed: p.listed, notes: p.notes, leftSir: p.leftSir } };
  if (mode === 'check') return console.log(save('check', log));
  const dry = await post(`${POPTY}/api/production/${course}/edit-batch`, { ops: p.ops });
  log.dry = { status: dry.status, error: dry.body.error, code: dry.body.code, index: dry.body.index, results: dry.body.results };
  console.log(`edit-batch dry run: ${dry.status} ${dry.body.error || ''} ${dry.body.index !== undefined ? 'op ' + dry.body.index : ''} (${(dry.body.results || []).length} results)`);
  if (dry.status !== 200 || mode !== 'apply' || process.env.APPLY_CONFIRM !== '1') return console.log(save(dry.status === 200 ? 'previewed' : 'dry-refused', log));
  const ap = await post(`${POPTY}/api/production/${course}/edit-batch`, { ops: p.ops, apply: true, ...(process.env.KAI_GO ? { kai_go: process.env.KAI_GO } : {}) });
  log.apply = { status: ap.status, event_id: ap.body.event_id, undo_file: ap.body.undo_file, error: ap.body.error, code: ap.body.code, results: ap.body.results, undo_ops: ap.body.undo_ops };
  console.log(`edit-batch APPLY: ${ap.status} event ${ap.body.event_id} undo ${ap.body.undo_file} ${ap.body.error || ''}`);
  console.log(save(ap.status === 200 ? 'applied' : 'apply-refused', log));
}

module.exports = { plan, verify, ruled, parseDrafts, fromApi };
if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
