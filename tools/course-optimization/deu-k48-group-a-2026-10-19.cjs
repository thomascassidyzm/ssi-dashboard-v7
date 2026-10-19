#!/usr/bin/env node
'use strict';
// tools/course-optimization/deu-k48-group-a-2026-10-19.cjs — deu_for_eng, canon K48 "Group A" (job #252, Kai 19 Oct 2026).
//
// K48 (Kai, 2026-10-19, seed 118): a German LEGO cut in verb-final form carries its subordinator (als, wie, dass, weil,
// wenn, ob, bevor, was, warum, während …), and every phrase under it contains the whole of it, so no phrase can slip
// into main-clause order. Census d/c9a74a40 (job #243·T) found 31 LEGOs that are subject + verb with the trigger left
// out ("Group A"). Kai: "I don't speak German. I'm happy for you to decide on the clear cases … ones that don't break
// any rules, that are consistent with both the course and other fixes we've done in the past."
//
// The per-LEGO plans (the grown LEGO, its components, its intro's demonstration sentence and its whole basket) are in
// deu-k48-group-a-2026-10-19.plan.cjs; the HELD ones are listed there too, each with the rule it would break. This file
// is the engine: it reads Popty's own seeds listing, checks every plan against the canon, and writes ONLY through Popty
// — the edit door (POST /api/production/:course/edit-batch, dry run unless apply) and the one audio route (POST
// /api/audio/render, dry run first, one real call per clip, no retries). No database code here.
//
// What a plan must satisfy (problems() — every one is a canon rule):
//   K48  the new German starts with the subordinator the seed uses
//   L3   the new German is at most 8 syllables
//   L26  every word of the new LEGO is a word its own seed says (both sides; known side contraction-tolerant, K6)
//   S3   the new German sits contiguous in the seed's German (it was "gapped" in 11 census cases)
//   L4   the components tile the LEGO on both sides
//   K47  no word of the grown LEGO is first taught by a LATER LEGO of the same seed (overlap with EARLIER ones is fine)
//   P17  every BUILD/USE row under it contains the whole LEGO, contiguous, both sides (known side contraction-tolerant)
//   K48  no row puts the LEGO's verb in main-clause order (per-plan `slip` pattern)
//   P1   every target word of every row was taught before the LEGO (earlier seeds, earlier LEGOs of the seed, the LEGO)
//   K1   known-side words not taught are LISTED for a hand read (the free class is allowed), never silently passed
//   O13  the intro is the template "as in" line quoting the LEGO byte for byte, its demo containing the LEGO
//   K2   no NEW strict ZUT group anywhere in the course (audit-phrase-zut.cjs)
//   P26  the seed sentence is still a row of the basket
//   every existing BUILD/USE row of the LEGO is accounted for (kept or rewritten — nothing dropped by omission)
//
//   node …/deu-k48-group-a-2026-10-19.cjs check  <seeds.json> [--only S0049L01,…]   # the gates (pure, no network)
//   node …/deu-k48-group-a-2026-10-19.cjs knock  <seeds.json> [--only …]            # O12 course-wide sweep (read only)
//   node …/deu-k48-group-a-2026-10-19.cjs dry    <seeds.json> [--only …]            # + the audio route dry run (chars)
//   RENDER=1 [APPLY_CONFIRM=1] MAX_CHARS=n …  run <seeds.json> --only …             # render, preview, (apply)
//   node …/deu-k48-group-a-2026-10-19.cjs verify <seeds.json> [--only …]            # the rule on a fresh dump
const fs = require('fs');
const path = require('path');
const PLAN = require('./deu-k48-group-a-2026-10-19.plan.cjs');

const COURSE = 'deu_for_eng';
const AGENT = 'deu-k48-group-a (job #252)';
const PURPOSE = 'job #252 deu_for_eng K48 Group A: verb-final LEGOs grow to carry their subordinator (Kai 19 Oct)';
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
const TRIGGERS = ['als', 'wie', 'dass', 'weil', 'wenn', 'ob', 'bevor', 'nachdem', 'bis', 'während', 'was', 'warum', 'wen', 'wann', 'wo', 'die', 'der', 'das'];

const P = (id) => `${COURSE}:${id}`;
const sid = (id) => String(id).split(':').pop();
const seedOf = (legoId) => Number(legoId.slice(1, 5));
const indexOf = (legoId) => Number(legoId.slice(6, 8));

// ── the rule as code ─────────────────────────────────────────────────────────────────────────────────────────────
const fold = (s) => String(s || '').normalize('NFC').toLowerCase().replace(/[’‘`´]/g, "'").replace(/[^\p{L}\p{M}\p{N}' ]/gu, ' ').replace(/\s+/g, ' ').trim();
/** Known side, K6: a contraction is the same words as its long form ("you're" = "you are", "don't" = "do not"). */
const foldKnown = (s) => fold(s)
  .replace(/\bcan't\b/g, 'can not').replace(/\bcannot\b/g, 'can not').replace(/\bwon't\b/g, 'will not').replace(/n't\b/g, ' not')
  .replace(/\b(i|you|we|they|he|she|it|that|what|there|who)'(re|s|ll|m|ve)\b/g, (m, a, b) => `${a} ${{ re: 'are', s: 'is', ll: 'will', m: 'am', ve: 'have' }[b]}`)
  .replace(/\s+/g, ' ').trim();
const hasRun = (text, chunk) => ` ${text} `.includes(` ${chunk} `);
/** P17: the whole LEGO sits in the row on BOTH sides, contiguous. */
const containsLego = (row, lego) => hasRun(foldKnown(row.known_text), foldKnown(lego.known)) && hasRun(fold(row.target_text), fold(lego.target));
/** K48: the German starts with the word that triggers verb-final order. */
const carriesSubordinator = (lego) => TRIGGERS.includes(fold(lego.target).split(' ')[0]);
/** German syllables, as language-config counts them (vowel groups; ie/ei/au/eu/äu one nucleus). */
const syllables = (s) => fold(s).split(' ').filter(Boolean).reduce((n, w) => n + Math.max(1, (w.match(/(ie|ei|ai|au|eu|äu|aa|ee|oo|[aeiouyäöü])/g) || []).length), 0);
/** L26: every word of the chunk is a word of the seed (multiset), on that side. */
const wordsWithin = (chunk, seedText, f) => { const pool = f(seedText).split(' '); return f(chunk).split(' ').every((w) => { const i = pool.indexOf(w); if (i < 0) return false; pool.splice(i, 1); return true; }); };
const introLine = (known, demo) => `The German for: '${known}', as in — '${demo}', is:`;

// ── the before-state: Popty's seeds listing → the dump shape the audits read ────────────────────────────────────────
function fromApi(api) {
  const seeds = [], legos = [], phrases = [];
  for (const s of api.seeds) {
    const { legos: ls, ...seed } = s; seeds.push(seed);
    for (const l of ls) { const { basket_phrases, ...lego } = l; legos.push(lego); for (const p of basket_phrases) phrases.push(p); }
  }
  return { course: api.courseCode || COURSE, seeds, legos, phrases };
}

/** Words the learner has before LEGO `legoId`: earlier seeds (text, LEGOs, components) + earlier LEGOs of its seed + `extra`. */
function vocab(db, legoId, extra = []) {
  const tw = require('../../services/course-builder/lib/taught-words.cjs');
  const seed = seedOf(legoId), idx = indexOf(legoId);
  const t = [], k = [];
  for (const s of db.seeds) if (s.seed_number < seed) { t.push(s.target_text); k.push(s.known_text); }
  for (const l of db.legos) {
    if (l.seed_number < seed || (l.seed_number === seed && l.lego_index < idx)) {
      t.push(l.target_text); k.push(l.known_text);
      for (const c of l.components || []) { t.push(c.target); k.push(c.known); }
    }
  }
  for (const e of extra) { t.push(e.target); k.push(e.known); }
  return { tw, tKeys: tw.taughtWordKeys(t, COURSE), kKeys: tw.taughtWordKeys(k, 'eng_for_deu') };
}

const selected = (only) => PLAN.APPLY.filter((p) => !only || only.includes(p.lego));

/** The plan (pure): per LEGO, the LEGO edit, neighbour re-cuts, row updates and inserts. Idempotent. */
function plan(db, only) {
  const NEVER = ['course_code', 'known_audio_id', 'target1_audio_id', 'target2_audio_id', 'target1_duration_ms', 'target2_duration_ms', 'presentation_audio_id',
    'last_edit_event_id', 'created_at', 'updated_at', 'version', 'qa_checked', 'decomposition', 'decomposition_course_version', 'display_tiling', 'display_tiling_version', 'target_syllable_count'];
  const out = { legoEdits: [], phraseUpdates: [], inserts: [], seedUnapprove: [], compUnlinks: [], skipped: [] };
  const seedsTouched = new Set();
  const legoEdit = (spec, isNeighbour) => {
    const lego = db.legos.find((l) => l.lego_id === spec.lego);
    if (!lego) throw new Error(`${spec.lego} not in the dump`);
    if (lego.known_text === spec.new.known && lego.target_text === spec.new.target) { out.skipped.push({ id: spec.lego, why: 'LEGO already reads this way' }); return; }
    if (lego.known_text !== spec.old.known || lego.target_text !== spec.old.target) throw new Error(`${spec.lego} is neither old nor new: ${lego.known_text} | ${lego.target_text}`);
    out.legoEdits.push({ id: spec.lego, neighbour: !!isNeighbour, before: { known: lego.known_text, target: lego.target_text, components: lego.components, presentation_audio_id: lego.presentation_audio_id },
      after: { known: spec.new.known, target: spec.new.target, components: spec.components }, intro: introLine(spec.new.known, spec.demo), knownChanged: lego.known_text !== spec.new.known });
    seedsTouched.add(seedOf(spec.lego));
  };
  for (const spec of selected(only)) {
    legoEdit(spec, false);
    for (const nb of spec.neighbours || []) legoEdit(nb, true);
    // O13: components are never introduced; a grown LEGO leaves its components' historic intro links lying — unlink them.
    for (const c of db.phrases.filter((p) => sid(p.id).startsWith(spec.lego) && p.phrase_role === 'component' && p.presentation_audio_id)) out.compUnlinks.push({ id: sid(c.id), was: c.presentation_audio_id });
    const live = new Map(db.phrases.filter((p) => sid(p.id).startsWith(spec.lego) && p.phrase_role !== 'component').map((p) => [sid(p.id).slice(spec.lego.length), p]));
    const proto = [...live.values()].find((p) => p.phrase_role === 'use') || [...live.values()][0];
    const named = new Set(spec.basket.map((b) => b[0]));
    for (const k of live.keys()) if (!named.has(k)) throw new Error(`${spec.lego}${k} exists but the plan does not account for it`);
    let nextPos = Math.max(0, ...db.phrases.filter((p) => sid(p.id).startsWith(spec.lego)).map((p) => p.position || 0)) + 1;
    for (const [suffix, role, known, target] of spec.basket) {
      const cur = live.get(suffix);
      const meta = (m) => ({ ...(m || {}), authored_by: `job #252 (K48, Kai 19 Oct): ${spec.new.known} | ${spec.new.target}` });
      if (cur) {
        if (cur.known_text === known && cur.target_text === target && cur.phrase_role === role) { out.skipped.push({ id: `${spec.lego}${suffix}`, why: 'row already reads this way' }); continue; }
        const set = {};
        if (cur.known_text !== known) set.known_text = known;
        if (cur.target_text !== target) Object.assign(set, { target_text: target, word_count: target.length, lego_count: target.replace(/[,.?!]/g, '').split(/\s+/).length,
          lego_position: fold(target).endsWith(fold(spec.new.target)) ? 'end' : 'middle', decomposition: null, decomposition_course_version: null });
        if (cur.phrase_role !== role) set.phrase_role = role;
        set.metadata = meta(cur.metadata);
        out.phraseUpdates.push({ id: `${spec.lego}${suffix}`, lego: spec.lego, before: cur, set });
      } else {
        const row = { ...proto, id: P(`${spec.lego}${suffix}`), known_text: known, target_text: target, phrase_role: role, position: nextPos++,
          word_count: target.length, lego_count: target.replace(/[,.?!]/g, '').split(/\s+/).length,
          lego_position: fold(target).endsWith(fold(spec.new.target)) ? 'end' : 'middle', metadata: meta({ format: 'build_use', pipeline: 'v2' }) };
        for (const c of NEVER) delete row[c];
        out.inserts.push({ id: `${spec.lego}${suffix}`, lego: spec.lego, row });
      }
      seedsTouched.add(spec.seed);
    }
  }
  // O5: an edit unapproves the seed it touches
  for (const n of [...seedsTouched].sort((a, b) => a - b)) {
    const s = db.seeds.find((x) => x.seed_number === n);
    if (s && s.approved_at) out.seedUnapprove.push({ seed_number: n, approved_at: s.approved_at });
  }
  return out;
}

/** Rows the course would hold after the plan. */
function simulate(db, p) {
  const upd = new Map(p.phraseUpdates.map((u) => [u.id, u.set]));
  const le = new Map(p.legoEdits.map((e) => [e.id, e.after]));
  const un = new Set(p.seedUnapprove.map((s) => s.seed_number));
  return {
    seeds: db.seeds.map((s) => (un.has(s.seed_number) ? { ...s, approved_at: null } : s)),
    legos: db.legos.map((l) => ({ ...l, id: l.lego_id, ...(le.has(l.lego_id) ? { known_text: le.get(l.lego_id).known, target_text: le.get(l.lego_id).target, components: le.get(l.lego_id).components } : {}) })),
    phrases: db.phrases.map((r) => (upd.has(sid(r.id)) ? { ...r, ...upd.get(sid(r.id)) } : r)).concat(p.inserts.map((i) => i.row)),
  };
}

// ── gates ────────────────────────────────────────────────────────────────────────────────────────────────────────
function problems(db, p, only, audit = require('./audit-phrase-zut.cjs')) {
  const bad = [], notes = [];
  const post = simulate(db, p);
  const specs = selected(only).flatMap((s) => [{ ...s, main: true }, ...(s.neighbours || []).map((n) => ({ ...n, seed: s.seed, slip: null, neighbourOf: s.lego }))]);
  for (const spec of specs) {
    const seed = db.seeds.find((s) => s.seed_number === seedOf(spec.lego));
    const L = spec.new;
    if (spec.main && !carriesSubordinator(L)) bad.push(`K48 ${spec.lego}: "${L.target}" does not start with its subordinator`);
    if (syllables(L.target) > 8) bad.push(`L3 ${spec.lego}: "${L.target}" is ${syllables(L.target)} syllables`);
    const est = require('../../services/course-builder/lib/language-config.cjs').estimateSyllables(L.target, COURSE);
    if (est > 8) notes.push(`L3 ${spec.lego}: ${syllables(L.target)} syllables counted, ${est} by language-config's chars-per-syllable estimate (the canon's K48 example counts syllables)`);
    if (!wordsWithin(L.target, seed.target_text, fold)) bad.push(`L26 ${spec.lego}: German "${L.target}" has a word the seed does not say`);
    if (!wordsWithin(L.known, seed.known_text, foldKnown)) bad.push(`L26 ${spec.lego}: English "${L.known}" has a word the seed does not say`);
    if (!hasRun(fold(seed.target_text), fold(L.target))) bad.push(`S3 ${spec.lego}: "${L.target}" is not contiguous in the seed's German`);
    if (!hasRun(foldKnown(seed.known_text), foldKnown(L.known))) notes.push(`${spec.lego}: English "${L.known}" is not contiguous in the seed's English (judge by hand)`);
    if (fold(spec.components.map((c) => c.target).join(' ')) !== fold(L.target) || foldKnown(spec.components.map((c) => c.known).join(' ')) !== foldKnown(L.known)) bad.push(`L4 ${spec.lego}: components do not tile the LEGO`);
    // K47: no word of the LEGO first taught by a LATER LEGO of the same seed
    const pre = vocab(db, spec.lego);
    const fresh = new Set(pre.tw.untaughtWords(L.target, pre.tKeys, COURSE));
    for (const l of db.legos.filter((x) => x.seed_number === seedOf(spec.lego) && x.lego_index > indexOf(spec.lego) && x.is_new !== false)) {
      const fromLater = fold(l.target_text).split(' ').filter((w) => fresh.has(w));
      if (fromLater.length) bad.push(`K47 ${spec.lego}: "${fromLater.join(' ')}" is first taught by the LATER ${l.lego_id} "${l.target_text}"`);
    }
    // O13: intro line
    const intro = introLine(L.known, spec.demo);
    if (!hasRun(foldKnown(spec.demo), foldKnown(L.known))) bad.push(`O13 ${spec.lego}: the intro's demo "${spec.demo}" does not contain "${L.known}"`);
    if (!intro.includes(`'${L.known}'`)) bad.push(`O13 ${spec.lego}: intro does not quote the LEGO`);
    // duplicate LEGO (both sides) earlier in the course
    const dup = db.legos.find((l) => l.lego_id !== spec.lego && fold(l.target_text) === fold(L.target) && foldKnown(l.known_text) === foldKnown(L.known) && (l.seed_number < seedOf(spec.lego) || (l.seed_number === seedOf(spec.lego) && l.lego_index < indexOf(spec.lego))));
    if (dup) bad.push(`L31 ${spec.lego}: duplicates the earlier ${dup.lego_id} on both sides`);
    if (!spec.main) {
      // a re-cut neighbour keeps its basket: every row must still contain it
      for (const r of post.phrases.filter((x) => sid(x.id).startsWith(spec.lego) && x.phrase_role !== 'component')) if (!containsLego(r, L)) bad.push(`P17 ${sid(r.id)} (re-cut ${spec.lego}): ${r.known_text} | ${r.target_text}`);
      continue;
    }
    // the basket
    const { tw, tKeys, kKeys } = vocab(db, spec.lego, [L, ...spec.components]);
    const rows = post.phrases.filter((r) => sid(r.id).startsWith(spec.lego) && r.phrase_role !== 'component');
    const seenK = new Map(), seenT = new Map();
    let builds = 0, uses = 0;
    for (const r of rows) {
      const id = sid(r.id);
      if (r.phrase_role === 'build') builds++; else if (r.phrase_role === 'use') uses++;
      if (!containsLego(r, L)) bad.push(`P17 ${id}: does not contain "${L.known} | ${L.target}" — ${r.known_text} | ${r.target_text}`);
      if (spec.slip && spec.slip.test(r.target_text)) bad.push(`K48 ${id}: main-clause order — ${r.target_text}`);
      const ut = tw.untaughtWords(r.target_text, tKeys, COURSE);
      if (ut.length) bad.push(`P1 ${id}: untaught German ${ut.join(', ')} — ${r.target_text}`);
      const uk = tw.untaughtWords(r.known_text, kKeys, 'eng_for_deu');
      if (uk.length) notes.push(`K1 ${id}: English not taught (hand-read; free class allowed): ${uk.join(', ')} — ${r.known_text}`);
      if (seenK.has(foldKnown(r.known_text))) bad.push(`${id}: same English as ${seenK.get(foldKnown(r.known_text))} in the basket`);
      if (seenT.has(fold(r.target_text))) bad.push(`${id}: same German as ${seenT.get(fold(r.target_text))} in the basket`);
      seenK.set(foldKnown(r.known_text), id); seenT.set(fold(r.target_text), id);
    }
    if (builds < 3) bad.push(`P5 ${spec.lego}: ${builds} BUILD rows (floor 3)`);
    if (uses < 2) bad.push(`P10 ${spec.lego}: ${uses} USE rows`);
    if (!rows.some((r) => fold(r.target_text) === fold(seed.target_text) && foldKnown(r.known_text) === foldKnown(seed.known_text))) bad.push(`P26 ${spec.lego}: the seed sentence is not in the basket`);
  }
  // K2: no NEW strict ZUT group course-wide
  const groups = (d) => new Map(audit.auditRows(d).bidirectional.violationsStrict.map((v) => [v.known_norm, v]));
  const b4 = groups(simulate(db, { legoEdits: [], phraseUpdates: [], inserts: [], seedUnapprove: [], compUnlinks: [] })), af = groups(post);
  for (const [k, v] of af) if (!b4.has(k)) bad.push(`K2 ZUT: new strict group "${k}" ${JSON.stringify(v).slice(0, 300)}`);
  return { list: bad, notes, zut: [b4.size, af.size] };
}

/** O12, course-wide, read only: rows OUTSIDE the edited baskets whose English carries a grown LEGO's English but whose German
 *  lacks its German, or the reverse — each to be read by hand (a different correct wording is fine; a split is not). */
function knockOn(db, only) {
  const hits = [];
  for (const spec of selected(only)) {
    const L = spec.new;
    for (const r of db.phrases) {
      if (r.phrase_role === 'component' || sid(r.id).startsWith(spec.lego)) continue;
      const k = hasRun(foldKnown(r.known_text), foldKnown(L.known)), t = hasRun(fold(r.target_text), fold(L.target));
      if (k !== t) hits.push({ lego: spec.lego, id: sid(r.id), side: k ? 'english only' : 'german only', known: r.known_text, target: r.target_text });
    }
  }
  return hits;
}

// ── audio asks and edit ops ──────────────────────────────────────────────────────────────────────────────────────
const slotKey = (role, text, legoId) => `${role}\u0000${text}\u0000${legoId || ''}`;
function clipAsks(p) {
  const m = new Map();
  const add = (role, text, id, legoId) => { const k = slotKey(role, text, legoId); if (!m.has(k)) m.set(k, { role, text, ...(legoId ? { legoId } : {}), ids: [] }); m.get(k).ids.push(id); };
  for (const e of p.legoEdits) {
    if (e.knownChanged) add('known', e.after.known, e.id);
    if (e.before.target !== e.after.target) { add('target1', e.after.target, e.id); add('target2', e.after.target, e.id); }
    add('presentation', e.intro, e.id, e.id);
  }
  for (const u of p.phraseUpdates) {
    if (u.set.known_text !== undefined) add('known', u.set.known_text, u.id);
    if (u.set.target_text !== undefined) { add('target1', u.set.target_text, u.id); add('target2', u.set.target_text, u.id); }
  }
  for (const i of p.inserts) { add('known', i.row.known_text, i.id); add('target1', i.row.target_text, i.id); add('target2', i.row.target_text, i.id); }
  return [...m.values()];
}

function editOps(p, clips) {
  const get = (role, text, legoId) => { const a = clips.get(slotKey(role, text, legoId)); if (!a) throw new Error(`no clip for ${role} "${text}"`); return a; };
  const ops = [], links = [];
  for (const c of p.compUnlinks || []) links.push({ op: 'audio.link', target: 'phrase', phrase_id: P(c.id), slot: 'presentation', audio_id: null });
  for (const s of p.seedUnapprove) ops.push({ op: 'seed.update', seed_number: s.seed_number, set: { approved_at: null }, expect: { approved_at: s.approved_at } });
  for (const e of p.legoEdits) {
    ops.push({ op: 'lego.update', lego_id: e.id, set: { known_text: e.after.known, target_text: e.after.target, components: e.after.components }, expect: { known_text: e.before.known, target_text: e.before.target } });
    if (e.knownChanged) links.push({ op: 'audio.link', target: 'lego', lego_id: e.id, slot: 'known', audio_id: get('known', e.after.known) });
    if (e.before.target !== e.after.target) for (const slot of ['target1', 'target2']) links.push({ op: 'audio.link', target: 'lego', lego_id: e.id, slot, audio_id: get(slot, e.after.target) });
    links.push({ op: 'audio.link', target: 'lego', lego_id: e.id, slot: 'presentation', audio_id: get('presentation', e.intro, e.id) });
  }
  for (const u of p.phraseUpdates) {
    ops.push({ op: 'phrase.update', phrase_id: P(u.id), set: { ...u.set }, expect: { known_text: u.before.known_text, target_text: u.before.target_text } });
    if (u.set.known_text !== undefined) links.push({ op: 'audio.link', target: 'phrase', phrase_id: P(u.id), slot: 'known', audio_id: get('known', u.set.known_text) });
    if (u.set.target_text !== undefined) for (const slot of ['target1', 'target2']) links.push({ op: 'audio.link', target: 'phrase', phrase_id: P(u.id), slot, audio_id: get(slot, u.set.target_text) });
  }
  for (const i of p.inserts) {
    ops.push({ op: 'phrase.insert', row: i.row });
    for (const slot of ['known', 'target1', 'target2']) links.push({ op: 'audio.link', target: 'phrase', phrase_id: P(i.id), slot, audio_id: get(slot, slot === 'known' ? i.row.known_text : i.row.target_text) });
  }
  return ops.concat(links);
}

/** The working clip a RERECORD_NOT_PERMITTED refusal names ("already has a working clip (<uuid> in <voice>)"), else null. */
function existingClip(body) {
  if (!body || body.code !== 'RERECORD_NOT_PERMITTED') return null;
  const m = String(body.error || '').match(/already has a working clip \(([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/i);
  return m ? m[1] : null;
}

async function post(url, body) {
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body), signal: AbortSignal.timeout(180000) });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  } catch (e) { return { status: 0, body: { ok: false, error: String((e.cause && e.cause.code) || e.name) } }; }
}

async function main() {
  const args = process.argv.slice(2);
  const [mode, file] = args;
  const oi = args.indexOf('--only');
  const only = oi > 0 ? args[oi + 1].split(',') : null;
  if (!mode || !file) throw new Error('usage: check|knock|dry|run|verify <seeds.json from GET /api/production/deu_for_eng/seeds> [--only S0049L01,…]');
  const db = fromApi(JSON.parse(fs.readFileSync(file, 'utf8')));
  if (mode === 'verify') return verify(db, only);
  if (mode === 'knock') { const h = knockOn(db, only); for (const x of h) console.log(`${x.lego}\t${x.id}\t${x.side}\t${x.known} | ${x.target}`); return console.log(`${h.length} rows to read by hand`); }
  const p = plan(db, only);
  const g = problems(db, p, only);
  console.log(`plan: ${p.legoEdits.length} LEGO edits, ${p.compUnlinks.length} component intro unlinks, ${p.phraseUpdates.length} rows updated, ${p.inserts.length} inserted, ${p.seedUnapprove.length} seeds unapproved, ${p.skipped.length} skipped; ZUT strict ${g.zut[0]} → ${g.zut[1]}`);
  for (const n of g.notes) console.log('  note', n);
  for (const b of g.list) console.log('  PROBLEM', b);
  if (g.list.length) process.exitCode = 1;
  if (mode === 'check') return;
  if (g.list.length) throw new Error('gates failed — nothing sent');
  const RENDER = process.env.RENDER === '1', MAX = +(process.env.MAX_CHARS || 0);
  const asks = clipAsks(p);
  const log = { job: '#252', only, started: new Date().toISOString(), plan: p, asks: [] };
  let chars = 0;
  for (const a of asks) {
    const d = await post(`${POPTY}/api/audio/render`, { courseCode: COURSE, role: a.role, text: a.text, purpose: PURPOSE, ...(a.legoId ? { legoId: a.legoId } : {}), dryRun: true });
    const ok = d.status === 200 && d.body.ok;
    // The re-record gate refuses to re-voice words this slot role already holds in a working clip, and names that clip.
    // We do not re-record (that is Tom's to permit): we link the clip it names — the library answer, 0 chars.
    const existing = !ok && existingClip(d.body);
    const w = ok && d.body.source !== 'library' ? (d.body.wouldSpendChars || a.text.length) : 0;
    chars += w;
    log.asks.push({ ...a, dry: existing ? { status: d.status, source: 'existing-clip', audioId: existing, chars: 0, refusal: d.body.code }
      : { status: d.status, source: d.body.source, audioId: d.body.audioId, voiceId: d.body.voiceId, chars: w, error: ok ? undefined : d.body } });
  }
  log.chars = chars;
  const refusedDry = log.asks.filter((a) => a.dry.error);
  const byRole = {}; for (const a of log.asks) byRole[a.role] = (byRole[a.role] || 0) + a.dry.chars;
  console.log(`route dry run: ${asks.length} asks, ${log.asks.filter((a) => a.dry.source === 'library').length} from library, ${chars} chars to render ${JSON.stringify(byRole)}, ${refusedDry.length} refused`);
  for (const a of refusedDry) console.log('  REFUSED (dry)', a.role, JSON.stringify(a.text), a.dry.status, JSON.stringify(a.dry.error).slice(0, 300));
  const out = process.env.LOG_DIR || process.cwd();
  const save = (n) => { const f = path.join(out, `deu-k48-${n}-${log.started.replace(/[:.]/g, '-')}.json`); fs.writeFileSync(f, JSON.stringify(log, null, 2)); return f; };
  if (mode === 'dry' || !RENDER) return console.log('dry log:', save('dry'));
  if (refusedDry.length) { console.log('STOP: the route refused a clip in the dry run; nothing rendered'); return console.log(save('stopped')); }
  if (!(chars <= MAX)) { console.log(`STOP: ${chars} chars > MAX_CHARS ${MAX}; nothing rendered`); return console.log(save('stopped')); }
  for (const a of log.asks) {
    if (a.dry.source === 'existing-clip') { a.real = { status: 200, source: 'existing-clip', audioId: a.dry.audioId, charsSpent: 0 }; continue; }
    const r = await post(`${POPTY}/api/audio/render`, { courseCode: COURSE, role: a.role, text: a.text, purpose: PURPOSE, ...(a.legoId ? { legoId: a.legoId } : {}) });
    a.real = { status: r.status, source: r.body.source, audioId: r.body.audioId, charsSpent: r.body.charsSpent, error: r.status === 200 && r.body.ok ? undefined : r.body };
    if (a.real.error) { console.log('  REFUSED', a.role, JSON.stringify(a.text), r.status, JSON.stringify(r.body).slice(0, 300)); console.log(save('render-refused')); return console.log('a clip was refused — no retry; the text is NOT switched (A4); nothing applied'); }
  }
  log.charsSpent = log.asks.reduce((s, a) => s + ((a.real && a.real.charsSpent) || 0), 0);
  console.log(`rendered: ${log.charsSpent} chars spent`);
  const clips = new Map(log.asks.map((a) => [slotKey(a.role, a.text, a.legoId), a.real.audioId]));
  const ops = editOps(p, clips);
  const prev = await post(`${POPTY}/api/production/${COURSE}/edit-batch`, { ops });
  log.preview = { status: prev.status, error: prev.status === 200 ? undefined : prev.body, results: (prev.body.results || []).length };
  console.log(`edit-batch preview: HTTP ${prev.status}; ${log.preview.results} results ${JSON.stringify(prev.body.error || '').slice(0, 400)}`);
  if (prev.status !== 200 || prev.body.ok === false) return console.log('preview refused:', save('preview-refused'));
  if (process.env.APPLY_CONFIRM !== '1') return console.log('preview only (APPLY_CONFIRM=1 to commit):', save('preview'));
  const res = await post(`${POPTY}/api/production/${COURSE}/edit-batch`, { ops, apply: true });
  log.applied = { status: res.status, eventId: res.body.event_id || null, undoFile: res.body.undo_file || null, undo: res.body.undo_ops || res.body.undo || null, error: res.status === 200 ? undefined : res.body };
  console.log(`edit-batch APPLY: HTTP ${res.status}; event ${log.applied.eventId}; undo_file ${log.applied.undoFile}`);
  console.log('log (undo inside):', save('applied'));
}

/** After applying: the rule on a fresh dump. Exit 1 on any breach. */
function verify(db, only) {
  const breaches = [];
  for (const spec of selected(only)) {
    for (const s of [spec, ...(spec.neighbours || [])]) {
      const l = db.legos.find((x) => x.lego_id === s.lego);
      if (l.known_text !== s.new.known || l.target_text !== s.new.target) breaches.push(`${s.lego} reads "${l.known_text} | ${l.target_text}"`);
      if (!l.presentation_audio_id) breaches.push(`${s.lego} has no intro clip linked`);
      for (const r of db.phrases.filter((x) => sid(x.id).startsWith(s.lego) && x.phrase_role !== 'component')) {
        if (!containsLego(r, s.new)) breaches.push(`P17 ${sid(r.id)}: ${r.known_text} | ${r.target_text}`);
        for (const c of ['known_audio_id', 'target1_audio_id', 'target2_audio_id']) if (!r[c]) breaches.push(`${sid(r.id)}: ${c} is empty (silent slot)`);
      }
    }
    const seed = db.seeds.find((x) => x.seed_number === spec.seed);
    if (seed.approved_at) breaches.push(`seed ${spec.seed} still approved`);
  }
  console.log(`verify: ${selected(only).length} LEGOs, ${breaches.length} breaches`);
  for (const b of breaches) console.log('  ', b);
  process.exitCode = breaches.length ? 1 : 0;
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { existingClip, plan, problems, simulate, fromApi, vocab, knockOn, clipAsks, editOps, containsLego, carriesSubordinator, syllables, wordsWithin, fold, foldKnown, introLine, PLAN };
