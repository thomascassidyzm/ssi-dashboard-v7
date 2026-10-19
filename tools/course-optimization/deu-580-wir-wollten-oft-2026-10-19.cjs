#!/usr/bin/env node
'use strict';
// tools/course-optimization/deu-580-wir-wollten-oft-2026-10-19.cjs — deu_for_eng seed 580 (job #242, Kai 19 Oct 2026).
//
// THE ERROR (found by #144·T, doc d/ce741166, approved by Kai): the seed German "wir haben oft gewollt, die Kinder irgendwo ein bisschen
// wärmer hinzubringen" is not German — a modal never takes zu, and in the perfect it takes the plain infinitive, not gewollt. Kai approved
// the past tense: "wir wollten oft die Kinder irgendwo ein bisschen wärmer hinbringen" (the English is unchanged). All four LEGO slots are
// kept (never delete a LEGO): L03 → hinbringen, L04 → wir wollten oft; L01/L02 only lose their broken rows.
// Canon: S15 (the seed is ungrammatical — sense 1), K16 (target must be natural), K48 (verb-final carries its subordinator: n/a — a main
// clause with the infinitive last), P17 (every phrase contains the whole LEGO), P1 (only taught words), P28 (one form per meaning),
// O1/O2/O12/O13 (seed edit → sweep, LEGO edit → phrases + intro mirror), O5 (the edit unapproves the seed), K2 (ZUT).
//
// DEVIATIONS FROM THE DOC, each because the brief says a row that would break the canon is held, not applied:
//  * L03 U03/U04/U05/U07 said "somewhere" in English over "irgendwo … hinbringen": the LEGO is "to take there", so the English side did not
//    contain it (P17). They are re-made as "there" rows (negation, question, other persons) from words taught by seed 580.
//  * S0582L01B03: the doc's "it is nice to grow up here | es ist schön, hier aufzuwachsen" repeats U02's German word for word; replaced by
//    the question "what is it like to grow up there | wie ist es, dort aufzuwachsen".
//  * S0580L01B01: capitalising "kinder" would make it S0455L03B01's pair word for word (L01 duplicates that LEGO — doc decision A, left as is),
//    so B01 becomes "I have children | ich habe Kinder".
// B01 stays the bare LEGO in L03/L04, as in 932 of 1,376 B01 rows in this course.
//
// Writes go ONLY through Popty: edit-batch (dry run unless apply) and the one audio route (POST /api/audio/render, dry run first, one real
// call per clip, no retries). The intros quote the ENGLISH LEGO text, which does not change, so every intro still mirrors (O13) and the
// same clip is re-linked after the LEGO text edit (a LEGO text edit NULLs presentation_audio_id — seen live in job #188).
//
//   node …/deu-580-wir-wollten-oft-2026-10-19.cjs check  <seeds.json>   # taught words + containment + ZUT gate (pure, no network)
//   node …/deu-580-wir-wollten-oft-2026-10-19.cjs dry    <seeds.json>   # + the audio route dry run
//   RENDER=1 …  run <seeds.json>                                       # + real renders, then the edit-batch preview
//   RENDER=1 APPLY_CONFIRM=1 …  run <seeds.json>                       # + apply (the undo is kept in the log)
//   node …/deu-580-wir-wollten-oft-2026-10-19.cjs verify <seeds.json>   # the rule on a fresh dump (after applying)
const fs = require('fs');
const path = require('path');

const COURSE = 'deu_for_eng';
const SEED = 580;
const AGENT = 'deu-580-wir-wollten-oft (job #242)';
const PURPOSE = 'job #242 deu_for_eng seed 580 gewollt…zu error: wir wollten oft … hinbringen (Kai 19 Oct)';
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');

const OLD_SEED_TARGET = 'wir haben oft gewollt, die Kinder irgendwo ein bisschen wärmer hinzubringen';
const NEW_SEED_TARGET = 'wir wollten oft die Kinder irgendwo ein bisschen wärmer hinbringen';

const L = (id, oldTarget, newTarget, known, components) => ({ id, known, oldTarget, newTarget, components });
const LEGOS = [
  L('S0580L03', 'hinzubringen', 'hinbringen', 'to take there', []),
  L('S0580L04', 'wir haben oft gewollt', 'wir wollten oft', "we've often wanted", [{ known: "we've often wanted", target: 'wir wollten oft' }]),
  // L02: German unchanged; the component list gains "little | bisschen" so it tiles the LEGO (it only had "a | ein").
  { id: 'S0580L02', known: 'a little', oldTarget: 'ein bisschen', newTarget: 'ein bisschen', components: [{ known: 'a', target: 'ein' }, { known: 'little', target: 'bisschen' }], oldComponents: [{ known: 'a', target: 'ein' }] },
];

// [id, oldKnown, oldTarget, newKnown, newTarget]   (oldKnown === newKnown where the English stays)
const R = (id, ok, ot, nk, nt) => ({ id, oldKnown: ok, oldTarget: ot, newKnown: nk, newTarget: nt });
const same = (id, k, ot, nt) => R(id, k, ot, k, nt);
const PHRASES = [
  // L01 children | Kinder — only the broken rows
  // the bare "children | Kinder" is S0455L03's pair word for word, so B01 is a real phrase instead (no duplicate pair, P3)
  R('S0580L01B01', 'children', 'kinder', 'I have children', 'ich habe Kinder'),
  R('S0580L01U02', 'she wants to go with the children', 'sie will mit die Kinder gehen', 'she wants to see the children', 'sie will die Kinder sehen'),
  // L02 a little | ein bisschen — only the broken rows
  R('S0580L02U06', 'she wants to go somewhere a little warmer', 'sie will irgendwo ein bisschen wärmer gehen', 'she wants to be somewhere a little warmer', 'sie will irgendwo ein bisschen wärmer sein'),
  R('S0580L02U07', 'it is a little more special', 'es ist ein bisschen besonders', 'it is a little warmer here', 'es ist hier ein bisschen wärmer'),
  // L03 to take there | hinbringen — German only on the six rows that already said "there"
  same('S0580L03B01', 'to take there', 'hinzubringen', 'hinbringen'),
  same('S0580L03B02', 'she needs to take them there', 'sie muss sie hinzubringen', 'sie muss sie hinbringen'),
  same('S0580L03B03', 'he must take the children there', 'er muss die Kinder hinzubringen', 'er muss die Kinder hinbringen'),
  same('S0580L03U01', 'she wants to take them there', 'sie will sie hinzubringen', 'sie will sie hinbringen'),
  same('S0580L03U02', 'she can take the children there', 'sie kann die Kinder hinzubringen', 'sie kann die Kinder hinbringen'),
  same('S0580L03U06', 'she needs to take the children there', 'sie muss die Kinder hinzubringen', 'sie muss die Kinder hinbringen'),
  // …and four rows re-made so the English says "there" (P17)
  R('S0580L03U03', 'she must take the children somewhere', 'sie muss die Kinder irgendwo hinzubringen', 'she does not want to take the children there', 'sie will die Kinder nicht hinbringen'),
  R('S0580L03U04', 'she wants to take the children somewhere', 'sie will die Kinder irgendwo hinzubringen', 'can she take the children there?', 'kann sie die Kinder hinbringen?'),
  R('S0580L03U05', 'she can take the children somewhere', 'sie kann die Kinder irgendwo hinzubringen', 'I can take the children there today', 'ich kann die Kinder heute hinbringen'),
  R('S0580L03U07', 'she wants to take them somewhere warmer', 'sie will sie irgendwo wärmer hinzubringen', 'he wants to take them there too', 'er will sie auch hinbringen'),
  // L04 we've often wanted | wir wollten oft — all ten re-made so each holds the whole LEGO on both sides
  R('S0580L04B01', 'wanted', 'gewollt', "we've often wanted", 'wir wollten oft'),
  R('S0580L04B02', 'he has wanted', 'er hat gewollt', "we've often wanted to go", 'wir wollten oft gehen'),
  R('S0580L04B03', 'he has often wanted', 'er hat oft gewollt', "we've often wanted to see the children", 'wir wollten oft die Kinder sehen'),
  R('S0580L04U01', "we've often wanted to take the children somewhere a little warmer", 'wir haben oft gewollt, die Kinder irgendwo ein bisschen wärmer hinzubringen', "we've often wanted to take the children somewhere a little warmer", 'wir wollten oft die Kinder irgendwo ein bisschen wärmer hinbringen'),
  R('S0580L04U02', 'she has wanted', 'sie hat gewollt', "we've often wanted to stay at home", 'wir wollten oft zu Hause bleiben'),
  R('S0580L04U03', 'she has often wanted', 'sie hat oft gewollt', "we've often wanted to help the children", 'wir wollten oft den Kindern helfen'),
  R('S0580L04U04', 'she has often wanted to try', 'sie hat oft gewollt zu versuchen', "we've often wanted to try to speak German", 'wir wollten oft versuchen, Deutsch zu sprechen'),
  R('S0580L04U05', 'she has always wanted that', 'sie hat das immer gewollt', "we've often wanted to ask for help", 'wir wollten oft um Hilfe bitten'),
  R('S0580L04U06', 'has she wanted?', 'hat sie gewollt?', "we've often wanted to wait here", 'wir wollten oft hier warten'),
  R('S0580L04U07', 'she has also wanted that', 'sie hat das auch gewollt', "we've often wanted to take the children there", 'wir wollten oft die Kinder hinbringen'),
  // knock-ons outside seed 580
  same('S0589L02U03', 'she would have wanted', 'sie hätte gewollt', 'sie hätte gefragt'),
  same('S0599L04U05', 'you would have wanted', 'du hättest gewollt', 'du hättest gefragt'),
  R('S0582L01B03', 'she wants to grow up here', 'sie möchte hier aufzuwachsen', 'what is it like to grow up there?', 'wie ist es, dort aufzuwachsen?'),
  R('S0578L02B01', 'she wants to go somewhere warmer', 'sie will irgendwo wärmer gehen', 'it can be warmer somewhere', 'es kann irgendwo wärmer sein'),
];
// the English the two knock-on rows say changes too (they say "wanted"): see R() above for S0589/S0599 — English follows the German
PHRASES.find((r) => r.id === 'S0589L02U03').newKnown = 'she would have asked';
PHRASES.find((r) => r.id === 'S0599L04U05').newKnown = 'you would have asked';

const P = (id) => `${COURSE}:${id}`;
const sid = (id) => String(id).split(':')[1];
const legoOf = (id) => id.slice(0, 8);
const seedOf = (legoId) => Number(legoId.slice(1, 5));
const idxOf = (legoId) => Number(legoId.slice(6, 8));

// ── the rule as code ──────────────────────────────────────────────────────────────────────────────
const fold = (s) => String(s || '').normalize('NFC').toLowerCase().replace(/[’‘`´]/g, "'").replace(/[^\p{L}\p{M}\p{N}' ]/gu, ' ').replace(/\s+/g, ' ').trim();
/** Tokens of `needle` appear in `hay` in order, insertions allowed (K8's split clause); a leading "to" of a known infinitive is not required (a modal drops it). */
function inOrder(hay, needle, dropTo) {
  const h = fold(hay).split(' '); let n = fold(needle).split(' ');
  if (dropTo && n[0] === 'to' && n.length > 1) n = n.slice(1);
  let i = 0;
  for (const t of h) if (t === n[i]) i++;
  return i === n.length;
}
/** P17: the whole LEGO sits in the phrase on BOTH sides. */
const containsLego = (known, target, lego) => inOrder(known, lego.known, true) && inOrder(target, lego.newTarget || lego.target, false);
/** The defect: a modal (or wollen) with gewollt/zu-infinitive; hinzubringen after a modal. */
const GEWOLLT = /\b(gewollt|gekonnt|gemusst|gedurft|gesollt|gemocht)\b/i;
const MODAL_ZU = /\b(will|wollen|wollte|wollten|kann|kannst|können|konnte|muss|musst|müssen|musste|darf|dürfen|soll|sollen|möchte|möchten|möchtest)\b[^,.?!]*\b(\w+zu\w+en|\w+zubringen|aufzuwachsen)\b/i;
const defect = (text) => GEWOLLT.test(text) || /\bhinzubringen\b/i.test(text) || /\bmöchte\s+\w+\s+aufzuwachsen\b/i.test(text);

// ── the before-state: Popty's seeds listing → the dump shape the audits read ────────────────────────────────────
function fromApi(api) {
  const seeds = [], legos = [], phrases = [];
  for (const s of api.seeds) {
    const { legos: ls, ...seed } = s; seeds.push(seed);
    for (const l of ls) { const { basket_phrases, ...lego } = l; legos.push(lego); for (const p of basket_phrases) phrases.push(p); }
  }
  return { course: api.courseCode || COURSE, seeds, legos, phrases };
}

/** The plan (pure, idempotent): what changes against the live dump; throws on a row that is neither the old nor the new text. */
function plan(db) {
  const seed = db.seeds.find((s) => s.seed_number === SEED);
  if (!seed) throw new Error('seed 580 not in the dump');
  const out = { seed: null, legos: [], phraseUpdates: [], skipped: [] };
  if (seed.target_text === NEW_SEED_TARGET) out.skipped.push({ id: 'seed', why: 'already reads this way' });
  else if (seed.target_text !== OLD_SEED_TARGET) throw new Error(`seed 580 German is neither the old nor the new text: ${seed.target_text}`);
  else out.seed = { before: { known: seed.known_text, target: seed.target_text, approved_at: seed.approved_at }, after: NEW_SEED_TARGET };
  for (const t of LEGOS) {
    const lego = db.legos.find((l) => l.lego_id === t.id);
    if (!lego) throw new Error(`${t.id} not in the dump`);
    const compsNow = JSON.stringify(lego.components || []);
    const done = lego.target_text === t.newTarget && compsNow === JSON.stringify(t.components);
    if (done) { out.skipped.push({ id: t.id, why: 'already reads this way' }); continue; }
    if (lego.known_text !== t.known || lego.target_text !== t.oldTarget && lego.target_text !== t.newTarget) throw new Error(`${t.id} is not as read on 19 Oct: ${lego.known_text} | ${lego.target_text}`);
    out.legos.push({ ...t, presentationAudioId: lego.presentation_audio_id || null, beforeComponents: lego.components });
  }
  const live = new Map(db.phrases.map((p) => [sid(p.id), p]));
  for (const r of PHRASES) {
    const cur = live.get(r.id);
    if (!cur) throw new Error(`${r.id} is not in the dump`);
    if (cur.target_text === r.newTarget && cur.known_text === r.newKnown) { out.skipped.push({ id: r.id, why: 'already reads this way' }); continue; }
    if (cur.target_text !== r.oldTarget || cur.known_text !== r.oldKnown) throw new Error(`${r.id} is not as read on 19 Oct: ${cur.known_text} | ${cur.target_text}`);
    const set = { target_text: r.newTarget, word_count: r.newTarget.length, lego_count: r.newTarget.replace(/[,.?]/g, '').split(/\s+/).length };
    if (r.newKnown !== r.oldKnown) set.known_text = r.newKnown;
    out.phraseUpdates.push({ id: r.id, before: cur, set, knownChanged: r.newKnown !== r.oldKnown });
  }
  return out;
}

/** Rows the course would hold after the plan (for the ZUT audit and the checks). */
function simulate(db, p) {
  const upd = new Map(p.phraseUpdates.map((u) => [u.id, u.set]));
  const lg = new Map(p.legos.map((t) => [t.id, t]));
  return {
    seeds: db.seeds.map((s) => (p.seed && s.seed_number === SEED ? { ...s, target_text: NEW_SEED_TARGET } : s)),
    legos: db.legos.map((l) => ({ ...l, id: l.lego_id, ...(lg.has(l.lego_id) ? { target_text: lg.get(l.lego_id).newTarget, components: lg.get(l.lego_id).components } : {}) })),
    phrases: db.phrases.map((r) => (upd.has(sid(r.id)) ? { ...r, ...upd.get(sid(r.id)) } : r)),
  };
}

/** Words taught BEFORE the row's own LEGO: earlier seeds, plus the same seed's earlier LEGOs (K29), on post-edit text. */
function vocabFor(post, legoId, lang = COURSE) {
  const tw = require('../../services/course-builder/lib/taught-words.cjs');
  const s = seedOf(legoId), i = idxOf(legoId);
  const t = [], k = [];
  for (const sd of post.seeds) if (sd.seed_number < s) { t.push(sd.target_text); k.push(sd.known_text); }
  for (const l of post.legos) {
    const ls = seedOf(l.lego_id);
    if (ls < s || (ls === s && idxOf(l.lego_id) <= i)) { t.push(l.target_text); k.push(l.known_text); for (const c of l.components || []) { t.push(c.target); k.push(c.known); } }
  }
  return { tw, tKeys: tw.taughtWordKeys(t, lang), kKeys: tw.taughtWordKeys(k, 'eng_for_deu') };
}

// ── gates ─────────────────────────────────────────────────────────────────────────────────────────
/** Everything the plan must satisfy, on the course as it WOULD read. [] = clean. */
function problems(db, p, audit = require('./audit-phrase-zut.cjs')) {
  const bad = [];
  const post = simulate(db, p);
  const legoRow = new Map(post.legos.map((l) => [l.lego_id, l]));
  // the defect is gone course-wide (seed, LEGO, component, phrase)
  for (const s of post.seeds) if (defect(s.target_text)) bad.push(`seed ${s.seed_number} still has the defect: ${s.target_text}`);
  for (const l of post.legos) { if (defect(l.target_text)) bad.push(`${l.lego_id} still has the defect`); for (const c of l.components || []) if (defect(c.target)) bad.push(`${l.lego_id} component has it`); }
  for (const r of post.phrases) if (defect(r.target_text) && r.phrase_role !== 'component') bad.push(`${sid(r.id)} still has the defect: ${r.known_text} | ${r.target_text}`);
  for (const r of post.phrases) if (r.phrase_role !== 'component' && MODAL_ZU.test(r.target_text) && /\b(will|kann|muss|möchte)\b[^,]*\bzu\b/i.test(r.target_text) && !/versuchen|um |zu Hause/i.test(r.target_text)) bad.push(`${sid(r.id)}: modal + zu? ${r.target_text}`);
  // seed contains its LEGO; tiling of the new L04+L03 against the seed
  const seedT = ` ${fold(NEW_SEED_TARGET)} `;
  for (const t of LEGOS) if (!seedT.includes(` ${fold(t.newTarget)} `)) bad.push(`seed 580 German does not contain ${t.id} "${t.newTarget}"`);
  // L02 components tile the LEGO
  for (const t of LEGOS) if (t.components.length && fold(t.components.map((c) => c.target).join(' ')) !== fold(t.newTarget) && t.id !== 'S0580L02') bad.push(`${t.id}: components do not tile the LEGO`);
  if (fold(LEGOS[2].components.map((c) => c.target).join(' ')) !== 'ein bisschen') bad.push('S0580L02: components do not tile "ein bisschen"');
  // P17 on every non-component row under the four LEGOs; P1 on every changed row at its own position
  const touchedLegos = new Set(['S0580L01', 'S0580L02', 'S0580L03', 'S0580L04']);
  const rows = post.phrases.filter((r) => touchedLegos.has(legoOf(sid(r.id))) && r.phrase_role !== 'component');
  for (const r of rows) {
    const l = legoRow.get(legoOf(sid(r.id)));
    if (!containsLego(r.known_text, r.target_text, { known: l.known_text, target: l.target_text })) bad.push(`P17 ${sid(r.id)}: does not contain "${l.known_text} | ${l.target_text}" — ${r.known_text} | ${r.target_text}`);
  }
  for (const u of p.phraseUpdates) {
    const r = post.phrases.find((x) => sid(x.id) === u.id);
    const { tw, tKeys, kKeys } = vocabFor(post, legoOf(u.id));
    const un = tw.untaughtWords(r.target_text, tKeys, COURSE);
    if (un.length) bad.push(`P1 ${u.id}: untaught target words ${un.join(', ')} — ${r.target_text}`);
    const unk = tw.untaughtWords(r.known_text, kKeys, 'eng_for_deu');
    if (unk.length) bad.push(`K1 ${u.id}: known words not taught/free: ${unk.join(', ')} — ${r.known_text}`);
  }
  // no duplicate phrase pair, and no duplicate German inside one basket
  const key = (r) => `${fold(r.known_text)}\u0000${fold(r.target_text)}`;
  const seen = new Map();
  const changed = new Set(p.phraseUpdates.map((u) => u.id));
  for (const r of post.phrases) if (r.phrase_role !== 'component') { const k = key(r); if (seen.has(k) && sid(seen.get(k).id) !== sid(r.id) && (changed.has(sid(r.id)) || changed.has(sid(seen.get(k).id)))) bad.push(`duplicate phrase pair: ${sid(r.id)} and ${sid(seen.get(k).id)}`); seen.set(k, r); }
  const byBasket = new Map();
  for (const r of rows) { const b = legoOf(sid(r.id)); const m = byBasket.get(b) || new Map(); const g = fold(r.target_text); if (m.has(g)) bad.push(`same German twice in ${b}: ${sid(r.id)} and ${m.get(g)}`); m.set(g, sid(r.id)); byBasket.set(b, m); }
  // ZUT: no NEW strict group course-wide
  const groups = (d) => new Map(audit.auditRows(d).bidirectional.violationsStrict.map((v) => [v.known_norm, v]));
  const b4 = groups(simulate(db, { seed: null, legos: [], phraseUpdates: [] })), af = groups(post);
  for (const k of af.keys()) if (!b4.has(k)) bad.push(`K2 ZUT: new strict group "${k}"`);
  return { list: bad, zut: [b4.size, af.size] };
}

// ── audio asks and edit ops ───────────────────────────────────────────────────────────────────────
const askKey = (role, text, legoId) => `${role}\u0000${text}\u0000${legoId || ''}`;
/** Every distinct clip the new text needs: German target1+target2 per changed German, English `known` per changed English (L04/knock-on rows). */
function clipAsks(p) {
  const m = new Map();
  const add = (role, text, id, legoId) => {
    const k = askKey(role, text, legoId);
    if (!m.has(k)) m.set(k, { role, text, ...(legoId ? { legoId } : {}), ids: [] });
    m.get(k).ids.push(id);
  };
  if (p.seed) { add('target1', NEW_SEED_TARGET, 'seed'); add('target2', NEW_SEED_TARGET, 'seed'); }
  for (const t of p.legos) if (t.newTarget !== t.oldTarget) { add('target1', t.newTarget, t.id, t.id); add('target2', t.newTarget, t.id, t.id); }
  for (const u of p.phraseUpdates) { add('target1', u.set.target_text, u.id); add('target2', u.set.target_text, u.id); if (u.knownChanged) add('known', u.set.known_text, u.id); }
  return [...m.values()];
}

/** The edit-batch ops; `clips` (askKey → audioId) adds an audio.link per changed slot AFTER the text, same transaction. */
function editOps(p, clips) {
  const get = (role, text, legoId) => clips.get(askKey(role, text, legoId)) || null;
  const ops = [], links = [];
  if (p.seed) {
    ops.push({ op: 'seed.update', seed_number: SEED, set: { target_text: NEW_SEED_TARGET, approved_at: null }, expect: { known_text: p.seed.before.known, target_text: p.seed.before.target } });
    for (const slot of ['target1', 'target2']) if (get(slot, NEW_SEED_TARGET)) links.push({ op: 'audio.link', target: 'seed', seed_number: SEED, slot, audio_id: get(slot, NEW_SEED_TARGET) });
  }
  for (const t of p.legos) {
    ops.push({ op: 'lego.update', lego_id: t.id, set: { target_text: t.newTarget, components: t.components }, expect: { known_text: t.known, target_text: t.oldTarget } });
    if (t.newTarget !== t.oldTarget) for (const slot of ['target1', 'target2']) if (get(slot, t.newTarget, t.id)) links.push({ op: 'audio.link', target: 'lego', lego_id: t.id, slot, audio_id: get(slot, t.newTarget, t.id) });
    // a LEGO text edit NULLs presentation_audio_id; the intro quotes the ENGLISH, which is unchanged (O13 holds), so put the same clip back
    if (t.presentationAudioId) links.push({ op: 'audio.link', target: 'lego', lego_id: t.id, slot: 'presentation', audio_id: t.presentationAudioId });
  }
  for (const u of p.phraseUpdates) {
    ops.push({ op: 'phrase.update', phrase_id: P(u.id), set: { ...u.set }, expect: { known_text: u.before.known_text, target_text: u.before.target_text } });
    for (const slot of ['target1', 'target2']) if (get(slot, u.set.target_text)) links.push({ op: 'audio.link', target: 'phrase', phrase_id: P(u.id), slot, audio_id: get(slot, u.set.target_text) });
    if (u.knownChanged && get('known', u.set.known_text)) links.push({ op: 'audio.link', target: 'phrase', phrase_id: P(u.id), slot: 'known', audio_id: get('known', u.set.known_text) });
  }
  return ops.concat(links);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** Popty restarts whenever main is merged (every few minutes today). ECONNREFUSED means the request never reached it — nothing was spent — so
 *  wait for it to come back and send the SAME request once more; any other failure (reset mid-render, 500, 402…) is returned as the answer. */
async function post(url, body) {
  for (let i = 0; i < 12; i++) {
    const r = await post1(url, body);
    if (!(r.status === 0 && r.body.error === 'ECONNREFUSED')) return r;
    for (let j = 0; j < 30; j++) { await sleep(3000); try { if ((await fetch(`${POPTY}/api/estate-map`, { signal: AbortSignal.timeout(4000) })).ok) break; } catch (e) { /* still down */ } }
  }
  return { status: 0, body: { ok: false, error: 'ECONNREFUSED' } };
}
async function post1(url, body) {
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body), signal: AbortSignal.timeout(900000) });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  } catch (e) { return { status: 0, body: { ok: false, error: String((e.cause && e.cause.code) || e.name) } }; }
}

async function main() {
  const [mode, file] = process.argv.slice(2);
  if (!mode || !file) throw new Error('usage: check|dry|run|verify <seeds.json from GET /api/production/deu_for_eng/seeds>');
  const db = fromApi(JSON.parse(fs.readFileSync(file, 'utf8')));
  if (mode === 'verify') return verify(db);
  const p = plan(db);
  const g = problems(db, p);
  console.log(`plan: seed ${p.seed ? 'changes' : 'done'}, ${p.legos.length} LEGOs change, ${p.phraseUpdates.length} phrases updated (${p.phraseUpdates.filter((u) => u.knownChanged).length} with new English), ${p.skipped.length} skipped; ZUT strict ${g.zut[0]} → ${g.zut[1]}`);
  for (const b of g.list) console.log('  PROBLEM', b);
  if (g.list.length) process.exitCode = 1;
  if (mode === 'check') return;
  if (g.list.length) throw new Error('gates failed — nothing sent');
  const RENDER = process.env.RENDER === '1', MAX = +(process.env.MAX_CHARS || 6000);
  const asks = clipAsks(p);
  const log = { job: '#242', started: new Date().toISOString(), plan: p, asks: [] };
  let chars = 0;
  for (const a of asks) {
    const d = await post(`${POPTY}/api/audio/render`, { courseCode: COURSE, role: a.role, text: a.text, purpose: PURPOSE, ...(a.legoId ? { legoId: a.legoId } : {}), dryRun: true });
    const ok = d.status === 200 && d.body.ok;
    const w = ok && d.body.source !== 'library' ? (d.body.wouldSpendChars || a.text.length) : 0;
    chars += w;
    log.asks.push({ ...a, dry: { status: d.status, source: d.body.source, voiceId: d.body.voiceId, chars: w, error: ok ? undefined : d.body } });
  }
  const refusedDry = log.asks.filter((a) => a.dry.error);
  console.log(`route dry run: ${asks.length} asks, ${log.asks.filter((a) => a.dry.source === 'library').length} from library, ${chars} chars to render, ${refusedDry.length} refused`);
  for (const a of refusedDry) console.log('  REFUSED (dry)', a.role, JSON.stringify(a.text), a.dry.status, JSON.stringify(a.dry.error).slice(0, 300));
  const out = process.env.LOG_DIR || process.cwd();
  const save = (n) => { const f = path.join(out, `deu-580-${n}-${log.started.replace(/[:.]/g, '-')}.json`); fs.writeFileSync(f, JSON.stringify(log, null, 2)); return f; };
  if (mode === 'dry' || !RENDER) return console.log('dry log:', save('dry'));
  if (refusedDry.length) { console.log('STOP: the route refused a clip in the dry run; nothing rendered'); return console.log(save('stopped')); }
  if (chars > MAX) { console.log(`STOP: ${chars} chars > MAX_CHARS ${MAX}; nothing rendered`); return console.log(save('stopped')); }
  // The route can take minutes per clip under load (the first run of this job timed out client-side with the clip rendered server-side), so a
  // run stops after RUN_MS and is simply re-run: a clip already in the library comes back free, nothing is rendered twice.
  const t0 = Date.now(), RUN_MS = +(process.env.RUN_MS || 480000);
  const SKIP = new Set((process.env.SKIP_ASKS || '').split(';;').filter(Boolean)); // "role::text" refused earlier in this job: never asked again
  for (const a of log.asks) {
    if (SKIP.has(`${a.role}::${a.text}`)) { a.real = { status: 0, error: { skipped: 'refused earlier, never retried' } }; continue; }
    if (Date.now() - t0 > RUN_MS) { console.log(`PARTIAL: ${log.asks.filter((x) => x.real).length}/${log.asks.length} rendered this run; re-run the same command to continue (library clips are free)`); return console.log(save('partial')); }
    const r = await post(`${POPTY}/api/audio/render`, { courseCode: COURSE, role: a.role, text: a.text, purpose: PURPOSE, ...(a.legoId ? { legoId: a.legoId } : {}) });
    a.real = { status: r.status, source: r.body.source, audioId: r.body.audioId, charsSpent: r.body.charsSpent, error: r.status === 200 && r.body.ok ? undefined : r.body };
    // A refusal is the answer: it is recorded and NEVER retried; the other clips carry on. A row whose clip was refused still gets its text
    // (the old German is wrong) but no link for that slot — the slot goes quiet and the audio pass is queued (A19, second branch).
    if (a.real.error) console.log('  REFUSED', a.role, JSON.stringify(a.text), r.status, JSON.stringify(r.body).slice(0, 300));
  }
  const refused = log.asks.filter((a) => a.real && a.real.error);
  if (refused.length && process.env.ALLOW_QUIET !== '1') { console.log(`${refused.length} clip(s) refused; set ALLOW_QUIET=1 to apply the text anyway (those slots go quiet)`); return console.log(save('render-refused')); }
  log.charsSpent = log.asks.reduce((s, a) => s + ((a.real && a.real.charsSpent) || 0), 0);
  console.log(`rendered: ${log.charsSpent} chars spent`);
  const clips = new Map(log.asks.filter((a) => !(a.real && a.real.error)).map((a) => [askKey(a.role, a.text, a.legoId), a.real.audioId]));
  const ops = editOps(p, clips);
  const prev = await post(`${POPTY}/api/production/${COURSE}/edit-batch`, { ops });
  log.preview = { status: prev.status, error: prev.status === 200 ? undefined : prev.body, results: (prev.body.results || []).length };
  console.log(`edit-batch preview: HTTP ${prev.status}; ${log.preview.results} results ${JSON.stringify(prev.body.error || '').slice(0, 400)}`);
  if (prev.status !== 200 || prev.body.ok === false) return console.log('preview refused:', save('preview-refused'));
  if (process.env.APPLY_CONFIRM !== '1') return console.log('preview only (APPLY_CONFIRM=1 to commit):', save('preview'));
  const res = await post(`${POPTY}/api/production/${COURSE}/edit-batch`, { ops, apply: true });
  log.applied = { status: res.status, eventId: res.body.event_id || null, undoFile: res.body.undo_file || null, undo: res.body.undo_ops || null, error: res.status === 200 ? undefined : res.body };
  console.log(`edit-batch APPLY: HTTP ${res.status}; event ${log.applied.eventId}; undo_file ${log.applied.undoFile}`);
  console.log('log (undo inside):', save('applied'));
}

/** After applying: the rule on a fresh dump. Exit 1 on any breach. */
function verify(db) {
  const breaches = [];
  const seed = db.seeds.find((s) => s.seed_number === SEED);
  if (seed.target_text !== NEW_SEED_TARGET) breaches.push(`seed reads "${seed.target_text}"`);
  if (seed.approved_at) breaches.push(`seed still approved (${seed.approved_at})`);
  for (const t of LEGOS) { const l = db.legos.find((x) => x.lego_id === t.id); if (l.target_text !== t.newTarget) breaches.push(`${t.id} reads "${l.target_text}"`); if (JSON.stringify(l.components || []) !== JSON.stringify(t.components)) breaches.push(`${t.id} components ${JSON.stringify(l.components)}`); if (!l.presentation_audio_id) breaches.push(`${t.id} lost its intro link`); }
  for (const s of db.seeds) if (defect(s.target_text)) breaches.push(`seed ${s.seed_number} has the defect`);
  for (const r of db.phrases) if (r.phrase_role !== 'component' && defect(r.target_text)) breaches.push(`${sid(r.id)} has the defect: ${r.target_text}`);
  const lego = new Map(db.legos.map((l) => [l.lego_id, l]));
  const rows = db.phrases.filter((r) => /^S0580L0[1-4]/.test(sid(r.id)) && r.phrase_role !== 'component');
  for (const r of rows) { const l = lego.get(legoOf(sid(r.id))); if (!containsLego(r.known_text, r.target_text, { known: l.known_text, target: l.target_text })) breaches.push(`P17 ${sid(r.id)}: ${r.known_text} | ${r.target_text}`); if (!r.target1_audio_id || !r.target2_audio_id) breaches.push(`${sid(r.id)} missing a German clip`); }
  console.log(`verify seed 580: ${rows.length} rows, ${breaches.length} breaches`);
  for (const b of breaches) console.log('  ', b);
  process.exitCode = breaches.length ? 1 : 0;
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { plan, problems, simulate, fromApi, vocabFor, clipAsks, editOps, containsLego, inOrder, defect, PHRASES, LEGOS, NEW_SEED_TARGET, OLD_SEED_TARGET, SEED };
