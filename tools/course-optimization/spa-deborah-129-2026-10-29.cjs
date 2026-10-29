#!/usr/bin/env node
'use strict';
// tools/course-optimization/spa-deborah-129-2026-10-29.cjs — spa_for_eng: Deborah's answers to the 129 naturalness
// questions, applied as language guidance (job #425, Kai 2026-10-29). Data and the reasoning per item:
// ./spa-deborah-129-2026-10-29.data.cjs.
//
// What it changes: phrase text (course-wide rules + single-sentence fixes + deletes), the target text and components of
// the LEGOs those rules move (pienso que → creo que, definitivamente → sin duda, frecuentemente → a menudo, que lo que →
// de lo que, no siento como si estuviera listo → no me siento listo, a entender → entender), the seed sentences that carry
// them, and the decomposition of every phrase that names a moved LEGO. Known-side LEGO text never changes, so no LEGO
// introduction (an English-only clip) goes out of step.
//
// What it does NOT do: render audio. Kai approves the spend. A text edit lets the database's text-change triggers keep a
// clip that still speaks the new words, re-point to one we already own in the same voice, or leave the slot empty (every
// move recorded in content_audio_link_drops); `audio` mode then asks the single audio route for a DRY RUN of every
// changed slot and reports renders, characters and voices.
//
// Each change is re-checked on the course it is given, and is SKIPPED (never forced) when:
//   P17/K49     a phrase that held its LEGO (as that LEGO reads after this pass) no longer does, either side
//   P1          the new Spanish brings in a word not taught by that point (an infinitive + an attached object pronoun
//               counts as taught when both parts are — see ENCLITICS in the data file)
//   ZUT         the new pair makes a clash that was not there, against every seed, LEGO and phrase after this pass
//   duplicate   the new pair is another row in the same basket that it was not already a copy of
//   floor       a delete would leave the basket under 4 USE or with no BUILD
// Every touched seed that was approved is unapproved (O5).
//
//   node …cjs check  <seeds.json>                 # plan + gates (pure; seeds.json = GET /api/production/spa_for_eng/seeds)
//   node …cjs dry    <seeds.json>                 # + edit-batch dry runs, one per class
//   APPLY_CONFIRM=1 node …cjs apply <seeds.json>  # + apply, class by class (each answer carries event_id + undo_file)
//   node …cjs audio  <seeds.json>                 # the audio route's DRY RUN for every changed slot (no render)
const fs = require('fs');
const path = require('path');
const D = require('./spa-deborah-129-2026-10-29.data.cjs');
const { holdsInOrder, fromApi } = require('./spa-close-read-153-200-2026-10-27.cjs');

const { COURSE } = D;
const AGENT = 'spa-deborah-129 (job #425)';
const PURPOSE = 'job #425 spa_for_eng Deborah 129 naturalness answers (Kai 29 Oct) — dry run for Kai\'s spend decision';
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
const USE_FLOOR = 4;
const BATCH = 250;

const pid = (id) => `${COURSE}:${id}`;
const sid = (id) => String(id).split(':').pop();
const nk = (s) => (s || '').toLowerCase().trim().replace(/[.?!,，。？！、]+$/, '');
const ntStrict = (s) => (s || '').replace(/[\s。，？！、.?!,]/g, '').toLowerCase().replace(/[¿¡«»"'’]/g, '');

// ── the course-wide rules (each returns the new text, or the same text) ─────────────────────────────────────────────
const keepCase = (m, rep) => (m[0] !== m[0].toLowerCase() ? rep[0].toUpperCase() + rep.slice(1) : rep);
const swap = (s, re, rep) => s.replace(re, (m) => keepCase(m, rep));
const RULES = {
  // 1: everyday "I think" = creo que; "…, pienso" at the end = "…, creo". Only where the English says "I think".
  G1: { item: 1, known: null, target: (t, k) => (/\bthink\b/i.test(k || '') ? swap(t, /\bpienso que\b/gi, 'creo que').replace(/, pienso([.?!]*)$/i, ', creo$1') : t) },
  // 57: definitivamente is too formal in Spain.
  G57: { item: 57, known: null, target: (t) => swap(t, /\bdefinitivamente\b/gi, 'sin duda') },
  // 43: lo más a menudo posible (and "frequently" with it, K47).
  G43: { item: 43, known: null, target: (t) => swap(t, /\bfrecuentemente\b/gi, 'a menudo') },
  // 69: comparisons take "de lo que".
  G69: { item: 69, known: null, target: (t) => t.replace(/\b(más|menos|mejor|peor|Mejor|Más|Menos)\b([^,.;]*?)\bque lo que\b/g, (m, a, b) => `${a}${b}de lo que`) },
  // 53: "no siento como si estuviera listo" → "no me siento listo".
  G53: { item: 53, known: null, target: (t) => swap(t, /\bno siento como si estuviera listo\b/gi, 'no me siento listo') },
  // 16: "intentar" with nothing after it → "intentarlo".
  G16: { item: 16, known: null, target: (t) => t.replace(/\bintentar\b(?=\s*(?:[.?!]*$|,|\s+(?:otra vez|de nuevo|la semana|mañana|hoy|pero|y)\b))/gi, (m) => (m[0] === 'I' ? 'Intentarlo' : 'intentarlo')) },
  // 44 (a–c): practising WITH someone = "practicar el español hablando con…", and the English says "Spanish".
  // Practising with nobody named is held for Kai (it needs a new pattern, not a swap).
  G44: { item: 44,
    target: (t) => t.replace(/\b(practicar) hablando (?:español )?(con\b(?! cuidado)|contigo\b|conmigo\b)/gi, (m, p, c) => `${p} el español hablando ${c}`),
    known: (k) => k.replace(/\b(practi[sc]e|practi[sc]ing|practicing) (?:speaking|talking)(?: Spanish)? with\b/i, '$1 speaking Spanish with') },
  // 7: "this evening" = esta tarde (until it is dark it is still "tarde").
  G7: { item: 7, known: null, target: (t, k) => (/this evening/i.test(k || '') ? swap(t, /\besta noche\b/gi, 'esta tarde') : t) },
  // 13: "not sure if I can" matches "no estoy seguro de si puedo".
  G13: { item: 13, known: (k, t) => (/de si puedo/i.test(t || '') ? k.replace(/not sure I can/i, 'not sure if I can') : k), target: null },
  // 3: "hablar bien español".
  G3: { item: 3, known: null, target: (t) => t.replace(/\bhablar español bien\b/g, 'hablar bien español') },
};
const RULE_ORDER = ['G1', 'G57', 'G43', 'G69', 'G53', 'G16', 'G44', 'G7', 'G13', 'G3'];
const LEGO_RULES = { G1: D.G1_LEGOS, G57: D.G57_LEGOS, G43: D.G43_LEGOS, G69: D.G69_LEGOS };

/** Apply the rules to one row's text. Returns { known, target, by: [rule ids that changed it] }. */
function applyRules(id, known, target, { only = null } = {}) {
  let k = known, t = target; const by = [];
  for (const g of RULE_ORDER) {
    if (only && !only.includes(g)) continue;
    if ((D.EXCLUDE[g] || []).includes(id) || (D.EXCLUDE.ALL || []).includes(id)) continue;
    const r = RULES[g];
    const t2 = r.target ? r.target(t, k) : t;
    const k2 = r.known ? r.known(k, t) : k;
    if (g === 'G44' && t2 !== t && k2 === k && !/speaking Spanish with/i.test(k)) { by.push('G44?'); continue; } // English did not follow: leave
    if (t2 !== t || k2 !== k) { by.push(g); t = t2; k = k2; }
  }
  return { known: k, target: t, by };
}

// ── taught words (P1), with infinitive + enclitic pronoun counted as its two taught parts ─────────────────────────
function makeTaught(after, tw) {
  const legos = [...after.legos].sort((a, b) => a.seed_number - b.seed_number || a.lego_index - b.lego_index);
  const seedTexts = new Map(after.seeds.map((s) => [s.seed_number, s.target_text]));
  const cache = new Map();
  let keys = new Set(); let lastSeed = 0; let i = 0;
  const addText = (t) => { for (const k of tw.taughtWordKeys([t], COURSE)) keys.add(k); };
  return function keysFor(legoId) {
    if (cache.has(legoId)) return cache.get(legoId);
    const seedN = Number(legoId.slice(1, 5)), idx = Number(legoId.slice(6, 8));
    // walk forward (callers come in course order often enough; restart if asked for an earlier point)
    if (seedN < lastSeed) { keys = new Set(); lastSeed = 0; i = 0; }
    while (lastSeed + 1 < seedN) { lastSeed++; if (seedTexts.has(lastSeed)) addText(seedTexts.get(lastSeed)); }
    while (i < legos.length && (legos[i].seed_number < seedN || (legos[i].seed_number === seedN && legos[i].lego_index <= idx))) {
      const l = legos[i++]; addText(l.target_text); for (const c of l.components || []) if (c && c.target) addText(c.target);
    }
    const snap = new Set(keys); cache.set(legoId, snap); return snap;
  };
}
function untaughtNew(tw, keys, before, after) {
  const was = new Set(tw.untaughtWords(before, keys, COURSE).map((w) => w.toLowerCase()));
  return tw.untaughtWords(after, keys, COURSE).filter((w) => {
    const lw = w.toLowerCase(); if (was.has(lw)) return false;
    const pr = D.ENCLITICS.find((p) => lw.endsWith(p) && /(ar|er|ir)$/.test(lw.slice(0, -p.length)));
    return !(pr && keys.has(lw.slice(0, -pr.length)) && keys.has(pr));
  });
}

// ── ZUT: an index of the course, known → targets and target → knowns ──────────────────────────────────────────────
function zutIndex(rows) {
  const byK = new Map(), byT = new Map();
  for (const r of rows) {
    if (r.phrase_role === 'component') continue;
    const k = nk(r.known_text), t = ntStrict(r.target_text);
    if (!byK.has(k)) byK.set(k, new Map()); byK.get(k).set(r.key, t);
    if (!byT.has(t)) byT.set(t, new Map()); byT.get(t).set(r.key, k);
  }
  return {
    clashes(row) {
      const k = nk(row.known_text), t = ntStrict(row.target_text), out = new Set();
      for (const [key, tt] of byK.get(k) || []) if (key !== row.key && tt !== t) out.add(`EN→2ES ${key}`);
      for (const [key, kk] of byT.get(t) || []) if (key !== row.key && kk !== k) out.add(`ES→2EN ${key}`);
      return out;
    },
  };
}

/** The plan (pure): every seed/LEGO/phrase change, the deletes, what was skipped and why. */
function plan(db, { decomposer: dz = require('../../services/phrase-decomposer.cjs'), tw = require('../../services/course-builder/lib/taught-words.cjs') } = {}) {
  // the decomposer throws on text it cannot consume; that is an answer ("not held"), not a crash
  const decomposer = { decomposeAnchored: (...a) => { try { return dz.decomposeAnchored(...a); } catch (e) { return { kind: 'error', error: e.message }; } } };
  const fixes = new Map(D.FIXES.map((f) => [f[0], f]));
  const deleting = new Set(D.FIXES.filter((f) => f.length === 3 && f[2] === null).map((f) => f[0]));

  // 1. LEGOs after this pass
  const legoNext = new Map();
  for (const l of db.legos) {
    const man = D.LEGO_MANUAL[l.lego_id];
    let target = l.target_text, components = l.components, type = l.type, by = [];
    for (const [g, ids] of Object.entries(LEGO_RULES)) {
      if (!ids.includes(l.lego_id)) continue;
      const f = RULES[g].target;
      const t2 = f(target, 'I think'); if (t2 !== target) { target = t2; by.push(g); }
      // a component may carry the verb alone ("I think" | "pienso"): it moves with its LEGO
      const fc = g === 'G1' ? (t) => swap(f(t, 'I think'), /^pienso$/i, 'creo') : (t) => f(t, 'I think');
      if (Array.isArray(components)) components = components.map((c) => (c && c.target ? { ...c, target: fc(c.target) } : c));
    }
    if (man) { target = man.target_text; if ('components' in man) components = man.components; if (man.type) type = man.type; by.push(`item ${man.item}`); }
    if (target !== l.target_text || JSON.stringify(components) !== JSON.stringify(l.components) || type !== l.type) {
      legoNext.set(l.lego_id, { before: l, set: { target_text: target, ...(JSON.stringify(components) !== JSON.stringify(l.components) ? { components } : {}), ...(type !== l.type ? { type } : {}) }, by });
    }
  }
  const legosAfter = db.legos.map((l) => (legoNext.has(l.lego_id) ? { ...l, ...legoNext.get(l.lego_id).set } : l));
  const legoById = new Map(legosAfter.map((l) => [l.lego_id, l]));
  const legoBefore = new Map(db.legos.map((l) => [l.lego_id, l]));

  // 2. seeds after this pass
  const seedNext = new Map();
  for (const s of db.seeds) {
    const r = applyRules(`S${String(s.seed_number).padStart(4, '0')}`, s.known_text, s.target_text);
    let known = r.known, target = r.target; const by = [...r.by.filter((b) => !b.endsWith('?'))];
    const man = D.SEED_MANUAL[s.seed_number];
    if (man) { if (man.known_text) known = man.known_text; if (man.target_text) target = man.target_text; by.push(`item ${man.item}`); }
    if (known !== s.known_text || target !== s.target_text) seedNext.set(s.seed_number, { before: s, known, target, by });
  }
  const seedSkipped = [];
  for (let pass = 0; pass < 3; pass++) {
    const cur = db.seeds.map((s) => (seedNext.has(s.seed_number) ? { ...s, target_text: seedNext.get(s.seed_number).target } : s));
    const kf = makeTaught({ seeds: cur, legos: legosAfter }, tw);
    let dropped = 0;
    for (const [n, s] of [...seedNext].sort((a, b) => a[0] - b[0])) {
      if (s.target === s.before.target_text) continue;
      const own = legosAfter.filter((l) => l.seed_number === n).map((l) => l.lego_index);
      const keys = kf(`S${String(n).padStart(4, '0')}L${String(own.length ? Math.max(...own) : 0).padStart(2, '0')}`);
      const un = untaughtNew(tw, keys, s.before.target_text, s.target);
      if (un.length) { seedSkipped.push({ id: `seed ${n}`, by: s.by, why: `P1 untaught: ${un.join(', ')}` }); seedNext.delete(n); dropped++; }
    }
    if (!dropped) break;
  }
  const seedsAfter = db.seeds.map((s) => (seedNext.has(s.seed_number) ? { ...s, known_text: seedNext.get(s.seed_number).known, target_text: seedNext.get(s.seed_number).target } : s));

  // 3. phrases: rules, then the single-sentence fixes (final text) on top
  const proposed = new Map(); const notes = [];
  for (const p of db.phrases) {
    const id = sid(p.id);
    if (p.phrase_role === 'component') continue;
    if (deleting.has(id)) continue;
    const r = applyRules(id, p.known_text, p.target_text);
    let known = r.known, target = r.target; const by = r.by.filter((b) => !b.endsWith('?'));
    if (r.by.includes('G44?')) notes.push({ id, why: 'G44: Spanish has a partner but the English did not read "practise speaking … with" — left for Kai' });
    const f = fixes.get(id);
    if (f && f.length === 4) { if (f[2] !== null) known = f[2]; if (f[3] !== null) target = f[3]; by.push(`item ${f[1]}`); }
    if (known !== p.known_text || target !== p.target_text) proposed.set(id, { p, known, target, by });
  }
  for (const [id] of fixes) if (!db.phrases.some((p) => sid(p.id) === id)) notes.push({ id, why: 'fix names a row that is not in the course' });

  // 4. the course after the pass, for ZUT and duplicates
  const tag = (key, r, role) => ({ key, known_text: r.known_text, target_text: r.target_text, phrase_role: role });
  const beforeRows = [
    ...db.seeds.map((s) => tag(`seed ${s.seed_number}`, s, 'seed')),
    ...db.legos.map((l) => tag(l.lego_id, l, 'lego')),
    ...db.phrases.map((p) => tag(sid(p.id), p, p.phrase_role)),
  ];
  const afterRows = [
    ...seedsAfter.map((s) => tag(`seed ${s.seed_number}`, s, 'seed')),
    ...legosAfter.map((l) => tag(l.lego_id, l, 'lego')),
    ...db.phrases.filter((p) => !deleting.has(sid(p.id))).map((p) => { const n = proposed.get(sid(p.id)); return tag(sid(p.id), n ? { known_text: n.known, target_text: n.target } : p, p.phrase_role); }),
  ];
  const zb = zutIndex(beforeRows), za = zutIndex(afterRows);
  const keysFor = makeTaught({ seeds: seedsAfter, legos: legosAfter }, tw);
  const vocabFor = (seedN) => legosAfter.filter((l) => l.seed_number <= seedN).map((l) => ({ lego_id: l.lego_id, target_text: l.target_text, known_text: l.known_text, seed_number: l.seed_number }));
  const vocabCache = new Map(); const vocab = (n) => { if (!vocabCache.has(n)) vocabCache.set(n, vocabFor(n)); return vocabCache.get(n); };

  const go = [], skipped = [...seedSkipped];
  const ordered = [...proposed.values()].sort((a, b) => sid(a.p.id).localeCompare(sid(b.p.id)));
  for (const { p, known, target, by } of ordered) {
    const id = sid(p.id), legoId = id.slice(0, 8);
    const lb = legoBefore.get(legoId), la = legoById.get(legoId);
    if (!la) { skipped.push({ id, by, why: 'its LEGO is not in the course' }); continue; }
    const problems = [];
    const parent = { lego_id: la.lego_id, target_text: la.target_text, known_text: la.known_text };
    const heldEn = holdsInOrder(p.known_text, lb.known_text);
    const heldEs = decomposer.decomposeAnchored(p.target_text, vocab(la.seed_number), { ...parent, target_text: lb.target_text }, COURSE).kind !== 'error' || holdsInOrder(p.target_text, lb.target_text);
    const dec = decomposer.decomposeAnchored(target, vocab(la.seed_number), parent, COURSE);
    if (heldEn && !holdsInOrder(known, la.known_text)) problems.push(`P17 English no longer holds "${la.known_text}"`);
    if (heldEs && dec.kind === 'error' && !holdsInOrder(target, la.target_text)) problems.push(`P17 Spanish no longer holds "${la.target_text}"`);
    if (target !== p.target_text) {
      const un = untaughtNew(tw, keysFor(legoId), p.target_text, target);
      if (un.length) problems.push(`P1 untaught: ${un.join(', ')}`);
    }
    const b4 = zb.clashes({ key: id, known_text: p.known_text, target_text: p.target_text });
    const af = [...za.clashes({ key: id, known_text: known, target_text: target })].filter((c) => !b4.has(c));
    // ZUT is one English → one Spanish. Two Englishes over one Spanish is not a defect (Kai): noted, not refused.
    const hard = af.filter((c) => c.startsWith('EN→2ES')), soft = af.filter((c) => c.startsWith('ES→2EN'));
    if (hard.length) problems.push(`ZUT new clash: ${hard.slice(0, 4).join(' ; ')}${hard.length > 4 ? ` (+${hard.length - 4})` : ''}`);
    if (soft.length) notes.push({ id, why: `same Spanish, other English (allowed): ${soft.slice(0, 3).join(' ; ')} — now "${known}"` });
    const twin = db.phrases.find((q) => sid(q.id) !== id && sid(q.id).startsWith(legoId) && q.phrase_role !== 'component' && !deleting.has(sid(q.id))
      && (() => { const n = proposed.get(sid(q.id)); const qk = n ? n.known : q.known_text, qt = n ? n.target : q.target_text; return nk(qk) === nk(known) && ntStrict(qt) === ntStrict(target) && !(nk(q.known_text) === nk(p.known_text) && ntStrict(q.target_text) === ntStrict(p.target_text)); })());
    if (twin) problems.push(`duplicate of ${sid(twin.id)}`);
    if (problems.length) { skipped.push({ id, by, from: [p.known_text, p.target_text], to: [known, target], why: problems.join(' | ') }); continue; }
    const set = {};
    if (known !== p.known_text) set.known_text = known;
    if (target !== p.target_text) { set.target_text = target; set.word_count = target.length; if (dec.kind !== 'error') set.decomposition = dec.blocks; }
    go.push({ id, kind: 'update', by, before: p, set, sides: { known: 'known_text' in set, target: 'target_text' in set } });
  }

  // 5. deletes, with the basket floor
  for (const id of deleting) {
    const p = db.phrases.find((q) => sid(q.id) === id);
    const f = fixes.get(id);
    if (!p) { skipped.push({ id, by: [`item ${f[1]}`], why: 'delete: the row is gone' }); continue; }
    const legoId = id.slice(0, 8);
    const left = db.phrases.filter((q) => sid(q.id).startsWith(legoId) && q.phrase_role !== 'component' && !deleting.has(sid(q.id)));
    const use = left.filter((q) => q.phrase_role === 'use').length, build = left.filter((q) => q.phrase_role === 'build').length;
    if (p.phrase_role === 'use' && use < USE_FLOOR) { skipped.push({ id, by: [`item ${f[1]}`], why: `floor: would leave ${use} USE under ${legoId}` }); continue; }
    if (p.phrase_role === 'build' && build < 1) { skipped.push({ id, by: [`item ${f[1]}`], why: `floor: would leave no BUILD under ${legoId}` }); continue; }
    go.push({ id, kind: 'delete', by: [`item ${f[1]}`], before: p, left: { build, use } });
  }

  // 6. phrases whose text stays but whose decomposition names a moved LEGO: refresh the decomposition only
  const moved = new Set(legoNext.keys());
  const touched = new Set(go.map((g) => g.id));
  for (const p of db.phrases) {
    const id = sid(p.id);
    if (touched.has(id) || deleting.has(id) || p.phrase_role === 'component' || !Array.isArray(p.decomposition)) continue;
    if (!p.decomposition.some((b) => b && moved.has(b.legoId))) continue;
    const la = legoById.get(id.slice(0, 8)); if (!la) continue;
    const dec = decomposer.decomposeAnchored(p.target_text, vocab(la.seed_number), { lego_id: la.lego_id, target_text: la.target_text, known_text: la.known_text }, COURSE);
    if (dec.kind !== 'error') go.push({ id, kind: 'update', by: ['decomposition'], before: p, set: { decomposition: dec.blocks }, sides: { known: false, target: false } });
  }

  // 7. seeds and LEGOs: ZUT on their own rows, then they go
  const seedGo = [], legoGo = [];
  for (const [n, s] of seedNext) {
    const key = `seed ${n}`;
    const b4 = zb.clashes({ key, known_text: s.before.known_text, target_text: s.before.target_text });
    const af = [...za.clashes({ key, known_text: s.known, target_text: s.target })].filter((c) => !b4.has(c) && c.startsWith('EN→2ES'));
    if (af.length) { skipped.push({ id: key, by: s.by, why: `ZUT new clash: ${af.join(' ; ')}` }); continue; }
    seedGo.push(s);
  }
  for (const [id, l] of legoNext) {
    const b4 = zb.clashes({ key: id, known_text: l.before.known_text, target_text: l.before.target_text });
    const af = [...za.clashes({ key: id, known_text: l.before.known_text, target_text: l.set.target_text })].filter((c) => !b4.has(c));
    if (af.length) notes.push({ id, why: `LEGO ZUT note: ${af.join(' ; ')}` });
    legoGo.push({ id, ...l });
  }
  // a moved LEGO must still be held by the phrases under it (after this pass): list the ones that are not
  for (const { id } of legoGo) {
    const la = legoById.get(id);
    for (const p of db.phrases) {
      const pidS = sid(p.id); if (!pidS.startsWith(id) || p.phrase_role === 'component' || deleting.has(pidS)) continue;
      const n = go.find((g) => g.id === pidS && g.kind === 'update'); const t = n && n.set.target_text ? n.set.target_text : p.target_text;
      if (!holdsInOrder(t, la.target_text)) notes.push({ id: pidS, why: `under moved LEGO ${id} "${la.target_text}" but reads "${t}"` });
    }
  }

  // 8. O5: an edit unapproves its seed
  const seedsTouched = new Set([...go.map((g) => g.before.seed_number), ...seedGo.map((s) => s.before.seed_number), ...legoGo.map((l) => l.before.seed_number)]);
  for (const g of go) if (g.by.length === 1 && g.by[0] === 'decomposition') { /* a decomposition refresh is not an edit of the words */ }
  const textTouched = new Set([...go.filter((g) => g.by[0] !== 'decomposition').map((g) => g.before.seed_number), ...seedGo.map((s) => s.before.seed_number), ...legoGo.map((l) => l.before.seed_number)]);
  const unapprove = db.seeds.filter((s) => textTouched.has(s.seed_number) && s.approved_at).map((s) => s.seed_number);
  return { go, skipped, notes, seedGo, legoGo, unapprove, seedsTouched: [...seedsTouched].sort((a, b) => a - b) };
}

/** Batches: one class per batch (the first rule or item that moved the row), LEGOs and seeds with their class. */
function classOf(by) {
  const first = by.find((b) => !b.startsWith('item')) || by[0];
  return first && first.startsWith('item') ? 'items' : (first || 'items');
}
function editBatches(p) {
  const groups = new Map(); const add = (c, op) => { if (!groups.has(c)) groups.set(c, []); groups.get(c).push(op); };
  for (const l of p.legoGo) add(classOf(l.by), { op: 'lego.update', lego_id: l.id, set: l.set, expect: { target_text: l.before.target_text } });
  for (const s of p.seedGo) {
    const set = {}; if (s.known !== s.before.known_text) set.known_text = s.known; if (s.target !== s.before.target_text) set.target_text = s.target;
    add(classOf(s.by), { op: 'seed.update', seed_number: s.before.seed_number, set, expect: { known_text: s.before.known_text, target_text: s.before.target_text } });
  }
  for (const g of p.go) {
    const expect = { known_text: g.before.known_text, target_text: g.before.target_text };
    if (g.kind === 'delete') add('delete', { op: 'phrase.delete', phrase_id: pid(g.id), expect });
    else add(g.by[0] === 'decomposition' ? 'decomposition' : classOf(g.by), { op: 'phrase.update', phrase_id: pid(g.id), set: g.set, expect });
  }
  // No before-state on approved_at: the API and the engine spell the same timestamp differently; clearing is idempotent.
  const out = [];
  for (const [cls, ops] of groups) for (let i = 0; i < ops.length; i += BATCH) out.push({ cls, part: i / BATCH + 1, ops: ops.slice(i, i + BATCH) });
  if (p.unapprove.length) out.push({ cls: 'unapprove', part: 1, ops: p.unapprove.map((n) => ({ op: 'seed.update', seed_number: n, set: { approved_at: null } })) });
  return out.filter((b) => b.ops.length);
}

/** Every slot whose words changed: (role, text) asks for the audio route's dry run, de-duplicated. */
function clipAsks(p) {
  const m = new Map();
  const add = (role, text, where) => { const k = `${role}\u0000${text}`; if (!m.has(k)) m.set(k, { role, text, where: [] }); m.get(k).where.push(where); };
  for (const g of p.go) if (g.kind === 'update') {
    if (g.sides.known) add('known', g.set.known_text, g.id);
    if (g.sides.target) { add('target1', g.set.target_text, g.id); add('target2', g.set.target_text, g.id); }
  }
  for (const s of p.seedGo) {
    if (s.known !== s.before.known_text) add('known', s.known, `seed ${s.before.seed_number}`);
    if (s.target !== s.before.target_text) { add('target1', s.target, `seed ${s.before.seed_number}`); add('target2', s.target, `seed ${s.before.seed_number}`); }
  }
  for (const l of p.legoGo) if (l.set.target_text !== l.before.target_text) { add('target1', l.set.target_text, l.id); add('target2', l.set.target_text, l.id); }
  return [...m.values()];
}

async function post(url, body) {
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body), signal: AbortSignal.timeout(300000) });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  } catch (e) { return { status: 0, body: { ok: false, error: String((e.cause && e.cause.code) || e.name) } }; }
}

async function main() {
  const [mode, file] = process.argv.slice(2);
  if (!mode || !file) throw new Error('usage: check|dry|apply|audio <seeds.json>');
  const db = fromApi(JSON.parse(fs.readFileSync(file, 'utf8')));
  const out = process.env.LOG_DIR || process.cwd();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const save = (n, log) => { const f = path.join(out, `spa-deborah-129-${n}-${stamp}.json`); fs.writeFileSync(f, JSON.stringify(log, null, 2)); return f; };

  const p = plan(db);
  const by = {}; for (const g of p.go) for (const b of g.by) by[b] = (by[b] || 0) + 1;
  console.log(`plan: ${p.go.filter((g) => g.kind === 'update' && g.by[0] !== 'decomposition').length} phrase edits, ${p.go.filter((g) => g.kind === 'delete').length} deletes, ${p.go.filter((g) => g.by[0] === 'decomposition').length} decomposition refreshes, ${p.legoGo.length} LEGOs, ${p.seedGo.length} seeds, ${p.unapprove.length} seeds to unapprove, ${p.skipped.length} skipped`);
  console.log('  by rule/item:', JSON.stringify(by));
  for (const s of p.skipped) console.log('  SKIP', s.id, (s.by || []).join('+'), '—', s.why);
  for (const n of p.notes) console.log('  NOTE', n.id, '—', n.why);
  if (mode === 'check') return console.log(save('check', p));

  if (mode === 'audio') {
    const asks = clipAsks(p);
    const log = { job: '#425', mode: 'audio-dry-run', asks: [] };
    let i = 0;
    const worker = async () => { while (i < asks.length) { const a = asks[i++];
      const d = await post(`${POPTY}/api/audio/render`, { courseCode: COURSE, role: a.role, text: a.text, purpose: PURPOSE, dryRun: true });
      log.asks.push({ role: a.role, text: a.text, where: a.where, status: d.status, body: d.body }); } };
    await Promise.all([1, 2, 3, 4].map(worker));
    console.log(`audio dry run: ${asks.length} asks`);
    return console.log(save('audio', log));
  }

  const batches = editBatches(p);
  const log = { job: '#425', started: stamp, mode, batches: [] };
  for (const b of batches) {
    const dry = await post(`${POPTY}/api/production/${COURSE}/edit-batch`, { ops: b.ops });
    const entry = { cls: b.cls, part: b.part, ops: b.ops.length, dry: { status: dry.status, error: dry.body.error, code: dry.body.code, index: dry.body.index } };
    log.batches.push(entry);
    console.log(`[${b.cls} #${b.part}] ${b.ops.length} ops — dry run ${dry.status} ${dry.body.error || ''}`);
    if (dry.status !== 200) { console.log('  STOP: a dry run was refused; nothing further applied'); break; }
    if (mode !== 'apply' || process.env.APPLY_CONFIRM !== '1') continue;
    const ap = await post(`${POPTY}/api/production/${COURSE}/edit-batch`, { ops: b.ops, apply: true });
    entry.apply = { status: ap.status, event_id: ap.body.event_id, undo_file: ap.body.undo_file, error: ap.body.error, code: ap.body.code };
    console.log(`  APPLIED ${ap.status} event ${ap.body.event_id} undo ${ap.body.undo_file} ${ap.body.error || ''}`);
    if (ap.status !== 200) { process.exitCode = 1; break; }
  }
  console.log(save(mode, log));
}

if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
module.exports = { plan, applyRules, editBatches, clipAsks, untaughtNew, RULES };
