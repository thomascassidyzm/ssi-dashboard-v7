#!/usr/bin/env node
'use strict';
// tools/course-optimization/deu-118-than-i-felt-2026-10-19.cjs — deu_for_eng seed 118 (job #168, Kai 19 Oct 2026).
//
// KAI'S RULING: S0118L01 "I felt | ich mich gefühlt habe" was cut in its verb-final form WITHOUT the word that makes it
// verb-final, so its phrases drilled the main-clause order (Ich habe mich … gefühlt) and broke P17. The LEGO EXPANDS to
// carry the subordinator the seed itself uses — the seed is "Ich fühle mich besser ALS ich mich gefühlt habe, als wir in
// der Kneipe waren" / "I feel better THAN I felt when we were in the pub" — so it becomes
//        "than I felt | als ich mich gefühlt habe"        (7 syllables, under the L3 cap of 8)
// components than|als + I|ich mich + felt|gefühlt habe (they tile both sides, L4), and every phrase under it contains the
// whole LEGO on both sides (P17), wrapped in a different outer sentence each time, short to long. Canon: K48 (German
// verb-final LEGOs carry their subordinator), with K40, K47, L29, O12, O13, PR3.
//
// Writes go ONLY through Popty: the edit door (POST /api/production/:course/edit-batch — dry run unless apply) and the one
// audio route (POST /api/audio/render, dry run first, ONE real call per clip). Nothing here touches the database; the
// before-state is Popty's own GET /api/production/:course/seeds, saved to a file.
//
//   node …/deu-118-than-i-felt-2026-10-19.cjs check  <seeds.json>      # vocab + containment + ZUT gate (pure, no network)
//   node …/deu-118-than-i-felt-2026-10-19.cjs dry    <seeds.json>      # + the audio route dry run
//   RENDER=1 …  run <seeds.json>                                       # + real renders, then the edit-batch preview
//   RENDER=1 APPLY_CONFIRM=1 …  run <seeds.json>                       # + apply (the undo is kept in the log)
//   node …/deu-118-than-i-felt-2026-10-19.cjs verify <seeds.json>      # the rule on a fresh dump (after applying)
const fs = require('fs');
const path = require('path');

const COURSE = 'deu_for_eng';
const SEED = 118;
const LEGO = 'S0118L01';
const AGENT = 'deu-118-than-i-felt (job #168)';
const PURPOSE = 'job #168 deu_for_eng S0118L01 than I felt | als ich mich gefühlt habe (Kai 19 Oct)';
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');

const NEW_LEGO = { known: 'than I felt', target: 'als ich mich gefühlt habe' };
const OLD_LEGO = { known: 'I felt', target: 'ich mich gefühlt habe' };
const NEW_COMPONENTS = [
  { known: 'than', target: 'als' },
  { known: 'I', target: 'ich mich' },
  { known: 'felt', target: 'gefühlt habe' },
];
// The intro frame: the template's "as in" line, the demonstration sentence is the basket's own U01 (PR3 shape, no grammar).
const DEMO = 'I feel better than I felt before we talked';
const INTRO = `The German for: '${NEW_LEGO.known}', as in — '${DEMO}', is:`;

// [id, role, known, target] in basket order — short to long, a different outer sentence every row. Every target word was
// taught before seed 118 (or is the LEGO's own); `check` proves it, and the whole LEGO sits in every row, contiguous.
const BASKET = [
  ['B01', 'build', 'I feel better than I felt', 'Ich fühle mich besser, als ich mich gefühlt habe'],
  ['B02', 'build', 'I feel much better than I felt', 'Ich fühle mich viel besser, als ich mich gefühlt habe'],
  ['B03', 'build', 'You feel better than I felt', 'Du fühlst dich besser, als ich mich gefühlt habe'],
  ['B04', 'build', 'I think I feel better than I felt', 'Ich denke, ich fühle mich besser, als ich mich gefühlt habe'],
  ['U01', 'use', 'I feel better than I felt before we talked', 'Ich fühle mich besser, als ich mich gefühlt habe, bevor wir geredet haben'],
  ['U02', 'use', 'I want to feel better than I felt before I started', 'Ich will mich besser fühlen, als ich mich gefühlt habe, bevor ich angefangen habe'],
  ['U03', 'use', "I'm happy that I feel better than I felt before I talked to you", 'Ich bin glücklich, dass ich mich besser fühle, als ich mich gefühlt habe, bevor ich mit dir geredet habe'],
  ['U04', 'use', 'I think I feel better than I felt when we talked to each other', 'Ich denke, ich fühle mich besser, als ich mich gefühlt habe, als wir miteinander geredet haben'],
  ['U05', 'use', "I know that I feel better than I felt, because I've learnt a lot", 'Ich weiß, dass ich mich besser fühle, als ich mich gefühlt habe, weil ich viel gelernt habe'],
  ['U06', 'use', 'You said that you feel better than I felt when we talked yesterday', 'Du hast gesagt, dass du dich besser fühlst, als ich mich gefühlt habe, als wir gestern geredet haben'],
  ['U07', 'use', 'I want to tell you that I feel better than I felt the last time we talked', 'Ich möchte dir sagen, dass ich mich besser fühle, als ich mich gefühlt habe, als wir das letzte Mal geredet haben'],
  ['U08', 'use', "I'm surprised that I feel better than I felt when I was so tired", 'Ich bin überrascht, dass ich mich besser fühle, als ich mich gefühlt habe, als ich so müde war'],
  ['U09', 'use', 'My friend says I feel better than I felt because I slept well', 'Mein Freund sagt, ich fühle mich besser, als ich mich gefühlt habe, weil ich gut geschlafen habe'],
  ['U10', 'use', 'Today I feel better than I felt when we started', 'Heute fühle ich mich besser, als ich mich gefühlt habe, als wir angefangen haben'],
];
const BUILD_FIRST_POSITION = 4; // 1-3 are the three component tiles

const P = (s) => `${COURSE}:${LEGO}${s}`;
const sid = (id) => String(id).split(':')[1];

// ── the rule as code ───────────────────────────────────────────────────────────────────────────────────────────
const fold = (s) => String(s || '').normalize('NFC').toLowerCase().replace(/[’‘`´]/g, "'").replace(/[^\p{L}\p{M}\p{N}' ]/gu, ' ').replace(/\s+/g, ' ').trim();
/** P17: the whole LEGO sits in the phrase on BOTH sides, contiguous (no word of it moved or split). Pure. */
const containsLego = (row, lego) => (` ${fold(row.known_text)} `).includes(` ${fold(lego.known)} `) && (` ${fold(row.target_text)} `).includes(` ${fold(lego.target)} `);
/** Canon K48: a verb-final LEGO carries its subordinator. For this LEGO: the target starts with the word that triggers the order. */
const carriesSubordinator = (lego) => /^(als|wie|dass|weil|wenn|ob|bevor|nachdem)\b/i.test(lego.target);
/** The main-clause order that broke P17 on this LEGO: "Ich habe mich … gefühlt" — habe before mich, gefühlt later. */
const mainClauseOrder = (target) => /\bhabe mich\b.*\bgefühlt\b/i.test(target);

// ── the before-state: Popty's seeds listing → the dump shape the audits read ────────────────────────────────────
function fromApi(api) {
  const seeds = [], legos = [], phrases = [];
  for (const s of api.seeds) {
    const { legos: ls, ...seed } = s; seeds.push(seed);
    for (const l of ls) {
      const { basket_phrases, ...lego } = l; legos.push(lego);
      for (const p of basket_phrases) phrases.push(p);
    }
  }
  return { course: api.courseCode || COURSE, seeds, legos, phrases };
}

/** Words taught BEFORE seed 118 plus the LEGO's own words (K29: any earlier-taught exact form is available). */
function vocab(db, lang = COURSE) {
  const tw = require('../../services/course-builder/lib/taught-words.cjs');
  const t = [], k = [];
  for (const s of db.seeds) if (s.seed_number < SEED) { t.push(s.target_text); k.push(s.known_text); }
  for (const l of db.legos) if (l.seed_number < SEED) {
    t.push(l.target_text); k.push(l.known_text);
    for (const c of l.components || []) { t.push(c.target); k.push(c.known); }
  }
  t.push(NEW_LEGO.target, ...NEW_COMPONENTS.map((c) => c.target)); k.push(NEW_LEGO.known, ...NEW_COMPONENTS.map((c) => c.known));
  return { tw, tKeys: tw.taughtWordKeys(t, lang), kKeys: tw.taughtWordKeys(k, 'eng_for_deu') };
}

/** Rows the course would hold after the plan (for the ZUT audit and the checks). */
function simulate(db, plan) {
  const upd = new Map(plan.phraseUpdates.map((u) => [u.id, u]));
  const phrases = db.phrases.map((p) => (upd.has(sid(p.id)) ? { ...p, ...upd.get(sid(p.id)).set } : p)).concat(plan.inserts.map((i) => i.row));
  const legos = db.legos.map((l) => (l.lego_id === LEGO ? { ...l, known_text: NEW_LEGO.known, target_text: NEW_LEGO.target, components: NEW_COMPONENTS, id: l.lego_id } : { ...l, id: l.lego_id }));
  return { seeds: db.seeds, legos, phrases };
}

/** The plan (pure): LEGO text + components, the three component tiles, the 14 basket rows. */
function plan(db) {
  const lego = db.legos.find((l) => l.lego_id === LEGO);
  if (!lego) throw new Error(`${LEGO} not in the dump`);
  const live = new Map(db.phrases.filter((p) => sid(p.id).startsWith(LEGO)).map((p) => [sid(p.id), p]));
  const proto = [...live.values()].find((p) => p.phrase_role === 'use');
  if (!proto) throw new Error(`${LEGO} has no USE row to clone`);
  const out = { lego: null, phraseUpdates: [], inserts: [], skipped: [] };
  if (lego.known_text === NEW_LEGO.known && lego.target_text === NEW_LEGO.target) out.skipped.push({ id: LEGO, why: 'already reads this way (an earlier run applied it)' });
  else out.lego = { before: { known: lego.known_text, target: lego.target_text, components: lego.components, is_new: lego.is_new }, after: { ...NEW_LEGO, components: NEW_COMPONENTS } };

  const NEVER = ['course_code', 'known_audio_id', 'target1_audio_id', 'target2_audio_id', 'target1_duration_ms', 'target2_duration_ms', 'presentation_audio_id',
    'last_edit_event_id', 'created_at', 'updated_at', 'version', 'qa_checked', 'decomposition', 'decomposition_course_version', 'display_tiling', 'display_tiling_version', 'target_syllable_count'];
  const place = (suffix, set, extra = {}) => {
    const key = `${LEGO}${suffix}`, cur = live.get(key);
    if (cur) {
      if (Object.entries(set).every(([k, v]) => JSON.stringify(cur[k]) === JSON.stringify(v))) out.skipped.push({ id: key, why: 'already reads this way' });
      else out.phraseUpdates.push({ id: key, before: cur, set });
    } else {
      const row = { ...proto, ...extra, id: P(suffix), ...set };
      for (const c of NEVER) delete row[c];
      out.inserts.push({ id: key, row });
    }
  };
  // components, in the order of the LEGO's components array: than (new tile), I, felt
  const tile = (pos, idx) => ({ position: pos, metadata: { buildup: 'component', component_index: idx } });
  place('C03', { known_text: 'Than', target_text: 'Als', phrase_role: 'component', word_count: 3, lego_count: 1, ...tile(1, 0) }, { lego_id: null, lego_position: 'middle', register: null });
  place('C01', tile(2, 1));
  place('C02', tile(3, 2));
  BASKET.forEach(([id, role, known, target], i) => {
    place(id, {
      known_text: known, target_text: target, phrase_role: role, position: BUILD_FIRST_POSITION + i,
      word_count: target.length, lego_count: target.replace(/[,.]/g, '').split(/\s+/).length,
      lego_position: fold(target).endsWith(fold(NEW_LEGO.target)) ? 'end' : 'middle',
      metadata: { format: 'build_use', pipeline: 'v2', authored_by: 'job #168 (Kai 19 Oct): than I felt | als ich mich gefühlt habe' },
    });
  });
  return out;
}

// ── gates ──────────────────────────────────────────────────────────────────────────────────────────────────────
/** Everything the plan must satisfy, on the course as it WOULD read. Returns problems ([] = clean). Pure but for the ZUT audit. */
function problems(db, p, audit = require('./audit-phrase-zut.cjs')) {
  const bad = [];
  const post = simulate(db, p);
  const { tw, tKeys, kKeys } = vocab(db);
  if (!carriesSubordinator(NEW_LEGO)) bad.push('K48: the LEGO does not start with its subordinator');
  if (NEW_LEGO.target.split(/\s+/).length !== NEW_LEGO.target.split(/\s+/).filter(Boolean).length) bad.push('LEGO target spacing');
  // L4: the components tile the LEGO on both sides
  if (NEW_COMPONENTS.map((c) => c.known).join(' ') !== NEW_LEGO.known || NEW_COMPONENTS.map((c) => c.target).join(' ') !== NEW_LEGO.target) bad.push('L4: components do not tile the LEGO');
  // P17: every non-component row under the LEGO contains the whole LEGO; no main-clause order; every word taught
  const basket = post.phrases.filter((r) => sid(r.id).startsWith(LEGO) && r.phrase_role !== 'component');
  if (basket.length !== BASKET.length) bad.push(`basket has ${basket.length} rows, the plan names ${BASKET.length}`);
  const seenKnown = new Set(), seenTarget = new Set();
  for (const r of basket) {
    if (!containsLego(r, NEW_LEGO)) bad.push(`P17 ${sid(r.id)}: does not contain "${NEW_LEGO.known} | ${NEW_LEGO.target}" — ${r.known_text} | ${r.target_text}`);
    if (mainClauseOrder(r.target_text)) bad.push(`${sid(r.id)}: main-clause order`);
    const un = tw.untaughtWords(r.target_text, tKeys, COURSE);
    if (un.length) bad.push(`P1 ${sid(r.id)}: untaught target words ${un.join(', ')}`);
    const unk = tw.untaughtWords(r.known_text, kKeys, 'eng_for_deu');
    if (unk.length) bad.push(`K1 ${sid(r.id)}: known words not taught/free: ${unk.join(', ')} (judge by hand: the free class is allowed)`);
    if (seenKnown.has(fold(r.known_text)) || seenTarget.has(fold(r.target_text))) bad.push(`${sid(r.id)}: duplicate row in the basket`);
    seenKnown.add(fold(r.known_text)); seenTarget.add(fold(r.target_text));
  }
  // ZUT: no NEW strict group course-wide
  const groups = (d) => new Map(audit.auditRows(d).bidirectional.violationsStrict.map((v) => [v.known_norm, v]));
  const b4 = groups(simulate(db, { phraseUpdates: [], inserts: [] })), af = groups(post);
  for (const k of af.keys()) if (!b4.has(k)) bad.push(`K2 ZUT: new strict group "${k}"`);
  return { list: bad, zut: [b4.size, af.size] };
}

// ── audio asks and edit ops ────────────────────────────────────────────────────────────────────────────────────
/** Every distinct clip the new text needs: [{role, text, legoId?, ids}]. */
function clipAsks(p) {
  const m = new Map();
  const add = (role, text, id, legoId) => {
    const k = `${role}\u0000${text}\u0000${legoId || ''}`;
    if (!m.has(k)) m.set(k, { role, text, ...(legoId ? { legoId } : {}), ids: [] });
    m.get(k).ids.push(id);
  };
  if (p.lego) { add('known', NEW_LEGO.known, LEGO); add('target1', NEW_LEGO.target, LEGO); add('target2', NEW_LEGO.target, LEGO); add('presentation', INTRO, LEGO, LEGO); }
  for (const u of p.phraseUpdates) {
    if (u.set.known_text !== undefined && u.set.known_text !== u.before.known_text) add('known', u.set.known_text, u.id);
    if (u.set.target_text !== undefined && u.set.target_text !== u.before.target_text) { add('target1', u.set.target_text, u.id); add('target2', u.set.target_text, u.id); }
  }
  for (const i of p.inserts) { add('known', i.row.known_text, i.id); add('target1', i.row.target_text, i.id); add('target2', i.row.target_text, i.id); }
  return [...m.values()];
}

/** The edit-batch ops. `clips` (role\0text[\0lego] → audioId) adds an audio.link per changed slot, AFTER the text, same transaction. */
function editOps(p, clips) {
  const slotKey = (role, text, legoId) => `${role}\u0000${text}\u0000${legoId || ''}`;
  const link = (target, key, slot, text, legoId) => {
    const audio_id = clips.get(slotKey(slot, text, legoId));
    if (!audio_id) throw new Error(`no clip for ${slot} "${text}"`);
    return { op: 'audio.link', target, ...key, slot, audio_id };
  };
  const ops = [];
  if (p.lego) {
    ops.push({ op: 'lego.update', lego_id: LEGO, set: { known_text: NEW_LEGO.known, target_text: NEW_LEGO.target, components: NEW_COMPONENTS },
      expect: { known_text: p.lego.before.known, target_text: p.lego.before.target } });
  }
  // (course, seed, lego, position) is unique: park every existing row at a free position first, so no step collides (409 on the first preview)
  p.phraseUpdates.forEach((u, n) => ops.push({ op: 'phrase.update', phrase_id: P(u.id.slice(LEGO.length)), set: { position: 900 + n }, expect: { known_text: u.before.known_text, target_text: u.before.target_text } }));
  for (const i of p.inserts) ops.push({ op: 'phrase.insert', row: i.row });
  for (const u of p.phraseUpdates) {
    const set = { ...u.set };
    ops.push({ op: 'phrase.update', phrase_id: P(u.id.slice(LEGO.length)), set, expect: { known_text: u.before.known_text, target_text: u.before.target_text } });
  }
  const links = [];
  if (p.lego) {
    links.push(link('lego', { lego_id: LEGO }, 'known', NEW_LEGO.known), link('lego', { lego_id: LEGO }, 'target1', NEW_LEGO.target),
      link('lego', { lego_id: LEGO }, 'target2', NEW_LEGO.target), link('lego', { lego_id: LEGO }, 'presentation', INTRO, LEGO));
  }
  const phraseLinks = (id, known, target, changedKnown, changedTarget) => {
    const key = { phrase_id: P(id.slice(LEGO.length)) };
    if (changedKnown) links.push(link('phrase', key, 'known', known));
    if (changedTarget) { links.push(link('phrase', key, 'target1', target)); links.push(link('phrase', key, 'target2', target)); }
  };
  for (const u of p.phraseUpdates) phraseLinks(u.id, u.set.known_text, u.set.target_text, u.set.known_text !== undefined && u.set.known_text !== u.before.known_text, u.set.target_text !== undefined && u.set.target_text !== u.before.target_text);
  for (const i of p.inserts) phraseLinks(i.id, i.row.known_text, i.row.target_text, true, true);
  return ops.concat(links);
}

async function post(url, body) {
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body), signal: AbortSignal.timeout(180000) });
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
  console.log(`plan: LEGO ${p.lego ? 'changes' : 'already done'}, ${p.phraseUpdates.length} rows updated, ${p.inserts.length} inserted, ${p.skipped.length} skipped; ZUT strict ${g.zut[0]} → ${g.zut[1]}`);
  for (const b of g.list) console.log('  PROBLEM', b);
  if (g.list.length) process.exitCode = 1;
  if (mode === 'check') return;
  if (g.list.length) throw new Error('gates failed — nothing sent');
  const RENDER = process.env.RENDER === '1', MAX = +(process.env.MAX_CHARS || 8000);
  const asks = clipAsks(p);
  const log = { job: '#168', started: new Date().toISOString(), plan: p, asks: [] };
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
  for (const a of refusedDry) console.log('  REFUSED (dry)', a.role, JSON.stringify(a.text), a.dry.status, JSON.stringify(a.dry.error).slice(0, 200));
  const out = process.env.LOG_DIR || process.cwd();
  const save = (n) => { const f = path.join(out, `deu-118-${n}-${log.started.replace(/[:.]/g, '-')}.json`); fs.writeFileSync(f, JSON.stringify(log, null, 2)); return f; };
  if (mode === 'dry' || !RENDER) return console.log('dry log:', save('dry'));
  if (refusedDry.length) { console.log('STOP: the route refused a clip in the dry run; nothing rendered'); return console.log(save('stopped')); }
  if (chars > MAX) { console.log(`STOP: ${chars} chars > MAX_CHARS ${MAX}; nothing rendered`); return console.log(save('stopped')); }
  for (const a of log.asks) {
    const r = await post(`${POPTY}/api/audio/render`, { courseCode: COURSE, role: a.role, text: a.text, purpose: PURPOSE, ...(a.legoId ? { legoId: a.legoId } : {}) });
    a.real = { status: r.status, source: r.body.source, audioId: r.body.audioId, charsSpent: r.body.charsSpent, error: r.status === 200 && r.body.ok ? undefined : r.body };
    if (a.real.error) { console.log('  REFUSED', a.role, JSON.stringify(a.text), r.status, JSON.stringify(r.body).slice(0, 200)); console.log(save('render-refused')); return console.log('a clip was refused — the text is NOT switched (A4); nothing applied'); }
  }
  log.charsSpent = log.asks.reduce((s, a) => s + ((a.real && a.real.charsSpent) || 0), 0);
  console.log(`rendered: ${log.charsSpent} chars spent`);
  const clips = new Map(log.asks.map((a) => [`${a.role}\u0000${a.text}\u0000${a.legoId || ''}`, a.real.audioId]));
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
  const lego = db.legos.find((l) => l.lego_id === LEGO);
  const rows = db.phrases.filter((r) => sid(r.id).startsWith(LEGO) && r.phrase_role !== 'component');
  const breaches = [];
  if (lego.known_text !== NEW_LEGO.known || lego.target_text !== NEW_LEGO.target) breaches.push(`LEGO reads "${lego.known_text} | ${lego.target_text}"`);
  for (const r of rows) if (!containsLego(r, { known: lego.known_text, target: lego.target_text })) breaches.push(`P17 ${sid(r.id)}: ${r.known_text} | ${r.target_text}`);
  console.log(`verify ${LEGO}: ${rows.length} rows, ${breaches.length} breaches`);
  for (const b of breaches) console.log('  ', b);
  process.exitCode = breaches.length ? 1 : 0;
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { plan, problems, simulate, fromApi, vocab, clipAsks, editOps, containsLego, carriesSubordinator, mainClauseOrder, BASKET, NEW_LEGO, OLD_LEGO, NEW_COMPONENTS, INTRO, LEGO, SEED };
