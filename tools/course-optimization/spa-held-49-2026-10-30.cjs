#!/usr/bin/env node
'use strict';
// tools/course-optimization/spa-held-49-2026-10-30.cjs — spa_for_eng: the items held from Deborah's 129 answers (job #425,
// doc d/8287a39d), settled by Kai's ruling of 30 Oct 2026 (job #164): where the clash is an untaught form (or the phrase
// cannot be built from what the learner has), APPLY the doc's proposal if it is valid for the phrase's LEGO, OTHERWISE DELETE
// the phrase. Valid = the phrase still contains its LEGO on both sides, uses only forms taught by that seed, makes no new
// ZUT clash, and is not an exact copy of another row in its basket. A delete that would break the basket floor is
// REPORTED, never done. Nothing that re-cuts a LEGO or changes a seed's own sentence is in DECISIONS (see HELD below).
//
//   node …cjs check <seeds.json>                 # the plan and the gate verdict for every decision (pure)
//   APPLY_CONFIRM=1 node …cjs apply <seeds.json>  # edit-batch dry run, then apply (one batch, then the unapprove batch)
//   node …cjs audio <seeds.json> [render]        # the audio route's dry run for every changed slot; `render` spends
const fs = require('fs');
const path = require('path');
const { holdsInOrder, fromApi } = require('./spa-close-read-153-200-2026-10-27.cjs');
const { untaughtNew, makeTaught, zutIndex, nk, ntStrict } = require('./spa-deborah-129-2026-10-29.cjs');

const COURSE = 'spa_for_eng';
const AGENT = 'spa-held-49 (job #164)';
const APPROVAL = 'kai:2026-10-30:Kai ruled reword-if-valid-else-delete for Deborah held items';
const PURPOSE = 'job #164 spa_for_eng Deborah held items, Kai ruling 30 Oct: reword-if-valid-else-delete';
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
const USE_FLOOR = 4;
const sid = (id) => String(id).split(':').pop();

// [id, item, known, target]  → reword to this pair if valid, else delete.   [id, item] → delete (the doc's own proposal).
const DECISIONS = [
  ['S0044L01U05', 4], // "ni" untaught; her fallback drops the LEGO "o"
  ['S0044L03U01', 5, 'I need to get better at Spanish', 'Necesito mejorar en español'], // fallback drops "to improve"
  ['S0061L02U10', 10, 'I need to practise how to say that in Spanish', 'Necesito practicar cómo decir eso en español'],
  ['S0066L02U02', 15], ['S0066L02U15', 15], ['S0137L03U11', 15], ['S0172L04U07', 15], // subjunctive hablen/puedas
  ['S0079L01B03', 30, 'When do you want to speak?', '¿Cuándo quieres hablar?'],
  ['S0083L03B05', 33, 'I was talking a lot about your friend', 'Estaba hablando mucho sobre tu amigo'],
  ['S0083L03U04', 33, 'I was talking a lot about your friend yesterday', 'Estaba hablando mucho sobre tu amigo ayer'],
  ['S0083L03U08', 33, "I don't know what to say about your friend", 'No sé qué decir sobre tu amigo'],
  ['S0083L03B04', 33, 'I want to talk about your friend', 'Quiero hablar sobre tu amigo'],
  ['S0087L01U03', 38], // conocí untaught until 234
  ['S0104L01U14', 44], // her form would copy S0104L01U02
  ['S0104L01U15', 50], // mientras untaught until 440
  ['S0104L02U04', 50, 'I want to change my way of speaking with another person', 'Quiero cambiar mi manera de hablar con otra persona'],
  ['S0104L02U09', 50, 'I would like to change my way of speaking with people who speak Spanish', 'Me gustaría cambiar mi manera de hablar con personas que hablan español'],
  ['S0116L03U09', 55], // her form drops the LEGO "podría hacer"
  ['S0117L04B06', 57], ['S0117L04U06', 57], // "definitivamente" no longer matches the LEGO's "sin duda"
  ['S0118L03B09', 58], // estuvimos never taught
  ['S0120L03B05', 59, 'I like that you like it', 'Me gusta que te guste'],
  ['S0120L03U02', 59, 'I like that you like learning Spanish', 'Me gusta que te guste aprender español'],
  ['S0128L02B03', 66], ['S0128L02U05', 66], ['S0128L02U06', 66], ['S0128L02U08', 66], // "como esto" → así (untaught)
  ['S0128L04U05', 67], ['S0128L04U06', 67], ['S0128L04U08', 67], // conocía → sabía (untaught)
  ['S0128L01U08', 68, 'I know you are very good at speaking Spanish', 'Sé que eres muy bueno hablando español'],
  ['S0151L02U05', 78, 'It was not possible to do that before I started learning', 'No era posible hacer eso antes de empezar a aprender'],
  ['S0153L03U10', 81], // igual never taught
  ['S0153L01U13', 82, 'I have said it slowly because it is the only way', 'Lo he dicho despacio porque es la única manera'],
  ['S0167L02U12', 83], ['S0167L03U12', 83], ['S0155L02U05', 83], // vaya / tuviera untaught
  ['S0156L01U11', 86, "If you want to go with me, I'd really like that", 'Si quieres ir conmigo, me gustaría mucho'],
  ['S0164L01U01', 97, "I think it's useful to read an interesting book", 'Creo que es útil leer un libro interesante'],
  ['S0164L01U07', 97, 'It is useful to read an interesting book about this language', 'Es útil leer un libro interesante sobre este idioma'],
  ['S0167L01U06', 100], // digas / vaya untaught
  ['S0172L03U05', 107], ['S0172L03U06', 107], // pudieras / intentaras never taught
  ['S0173L01U14', 73], // ayuda untaught until 212
  ['S0181L04U13', 114], // llevará never taught
  ['S0186L02U11', 118], // traer untaught until 316
  ['S0190L01B04', 121], ['S0190L01U02', 121], // cometo never taught
  ['S0192L02U03', 124, 'Where do you want to meet on Saturday night to practise?', '¿Dónde quieres reunirte el sábado por la noche para practicar?'],
  ['S0197L02U03', 125, 'I think my son is doing well at work', 'Creo que a mi hijo le va muy bien en el trabajo'],
  ['S0197L02U07', 125, 'I think your son is doing very well at work', 'Creo que a tu hijo le va muy bien en el trabajo'],
];

// Not applied (Kai decides): see the published doc. Listed here so the test can assert none of them is in DECISIONS.
const HELD = {
  '44a': ['S0005L04U04', 'S0005L04U05', 'S0005L04U06', 'S0010L01U03', 'S0013L02U08'], // changes seed 5's own sentence
  '9': ['S0055L02U04', 'S0055L02U15', 'S0192L02U10'], '45': ['S0098L04U10'], '16': ['S0007L01B01', 'S0007L01B02'],
  '77': ['S0148L02U06', 'S0148L02U14'], '127': ['S0200L04U10'], // English "I need us to finish" does not read as the LEGO's "we finish"
  // seed-sentence / LEGO re-cuts: 49, 54, 61, 71, 76; no partner: 44b
};

function plan(db, { decomposer: dz = require('../../services/phrase-decomposer.cjs'), tw = require('../../services/course-builder/lib/taught-words.cjs') } = {}) {
  const decomposer = { decomposeAnchored: (...a) => { try { return dz.decomposeAnchored(...a); } catch (e) { return { kind: 'error', error: e.message }; } } };
  const byId = new Map(db.phrases.map((p) => [sid(p.id), p]));
  const legoById = new Map(db.legos.map((l) => [l.lego_id, l]));
  const delIds = new Set(DECISIONS.filter((d) => d.length === 2).map((d) => d[0]));
  const keysFor = makeTaught({ seeds: db.seeds, legos: db.legos }, tw);
  const rows = (skip) => [
    ...db.seeds.map((s) => ({ key: `seed ${s.seed_number}`, known_text: s.known_text, target_text: s.target_text, phrase_role: 'seed' })),
    ...db.legos.map((l) => ({ key: l.lego_id, known_text: l.known_text, target_text: l.target_text, phrase_role: 'lego' })),
    ...db.phrases.filter((p) => !skip.has(sid(p.id))).map((p) => ({ key: sid(p.id), known_text: p.known_text, target_text: p.target_text, phrase_role: p.phrase_role })),
  ];
  const zb = zutIndex(rows(new Set()));
  const vocab = (n) => db.legos.filter((l) => l.seed_number <= n).map((l) => ({ lego_id: l.lego_id, target_text: l.target_text, known_text: l.known_text, seed_number: l.seed_number }));
  const out = { reworded: [], deleted: [], deleteBlocked: [], missing: [] };
  const wantDelete = []; // [id, item, why]

  for (const d of DECISIONS) {
    const [id, item, known, target] = d;
    const p = byId.get(id);
    if (!p) { out.missing.push({ id, item }); continue; }
    if (d.length === 2) { wantDelete.push([id, item, 'the doc proposes deleting it']); continue; }
    const legoId = id.slice(0, 8), la = legoById.get(legoId), problems = [];
    const parent = { lego_id: la.lego_id, target_text: la.target_text, known_text: la.known_text };
    const dec = decomposer.decomposeAnchored(target, vocab(la.seed_number), parent, COURSE);
    if (holdsInOrder(p.known_text, la.known_text) && !holdsInOrder(known, la.known_text)) problems.push(`English no longer holds "${la.known_text}"`);
    if (holdsInOrder(p.target_text, la.target_text) || decomposer.decomposeAnchored(p.target_text, vocab(la.seed_number), parent, COURSE).kind !== 'error') {
      if (dec.kind === 'error' && !holdsInOrder(target, la.target_text)) problems.push(`Spanish no longer holds "${la.target_text}"`);
    }
    if (target !== p.target_text) { const un = untaughtNew(tw, keysFor(legoId), p.target_text, target); if (un.length) problems.push(`untaught: ${un.join(', ')}`); }
    const b4 = zb.clashes({ key: id, known_text: p.known_text, target_text: p.target_text });
    const hard = [...zutIndex(rows(delIds)).clashes({ key: id, known_text: known, target_text: target })].filter((c) => !b4.has(c) && c.startsWith('EN→2ES'));
    if (hard.length) problems.push(`ZUT clash ${hard.slice(0, 3).join(' ; ')}`);
    const twin = db.phrases.find((q) => sid(q.id) !== id && sid(q.id).startsWith(legoId) && q.phrase_role !== 'component' && !delIds.has(sid(q.id)) && nk(q.known_text) === nk(known) && ntStrict(q.target_text) === ntStrict(target));
    if (twin) problems.push(`exact copy of ${sid(twin.id)}`);
    if (problems.length) { wantDelete.push([id, item, `proposal not valid: ${problems.join(' | ')}`]); continue; }
    const set = {};
    if (known !== p.known_text) set.known_text = known;
    if (target !== p.target_text) { set.target_text = target; set.word_count = target.length; if (dec.kind !== 'error') set.decomposition = dec.blocks; }
    out.reworded.push({ id, item, before: p, set, known, target });
  }
  // the floor, counted over the whole batch of deletes
  const gone = new Set(wantDelete.map((w) => w[0]));
  for (const [id, item, why] of wantDelete) {
    const p = byId.get(id), legoId = id.slice(0, 8);
    const left = db.phrases.filter((q) => sid(q.id).startsWith(legoId) && q.phrase_role !== 'component' && !gone.has(sid(q.id)));
    const use = left.filter((q) => q.phrase_role === 'use').length, build = left.filter((q) => q.phrase_role === 'build').length;
    if ((p.phrase_role === 'use' && use < USE_FLOOR) || (p.phrase_role === 'build' && build < 1)) { out.deleteBlocked.push({ id, item, why: `floor: would leave ${use} USE / ${build} BUILD`, p }); gone.delete(id); continue; }
    out.deleted.push({ id, item, why, before: p, left: { use, build } });
  }
  const touchedSeeds = new Set([...out.reworded, ...out.deleted].map((x) => Number(x.id.slice(1, 5))));
  out.unapprove = db.seeds.filter((s) => touchedSeeds.has(s.seed_number) && s.approved_at).map((s) => s.seed_number);
  return out;
}

function editBatch(p) {
  const ops = [];
  for (const r of p.reworded) ops.push({ op: 'phrase.update', phrase_id: `${COURSE}:${r.id}`, set: r.set, expect: { known_text: r.before.known_text, target_text: r.before.target_text } });
  for (const d of p.deleted) ops.push({ op: 'phrase.delete', phrase_id: `${COURSE}:${d.id}`, expect: { known_text: d.before.known_text, target_text: d.before.target_text } });
  return ops;
}
const unapproveBatch = (p) => p.unapprove.map((n) => ({ op: 'seed.update', seed_number: n, set: { approved_at: null } }));

function clipAsks(p) {
  const m = new Map();
  const add = (role, text, where) => { const k = `${role}\u0000${text}`; if (!m.has(k)) m.set(k, { role, text, where: [] }); m.get(k).where.push(where); };
  for (const r of p.reworded) {
    if (r.set.known_text) add('known', r.known, r.id);
    if (r.set.target_text) { add('target1', r.target, r.id); add('target2', r.target, r.id); }
  }
  return [...m.values()];
}

async function post(url, body) {
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body), signal: AbortSignal.timeout(300000) });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  } catch (e) { return { status: 0, body: { ok: false, error: String((e.cause && e.cause.code) || e.name) } }; }
}

async function main() {
  const [mode, file, flag] = process.argv.slice(2);
  if (!mode || !file) throw new Error('usage: check|apply|audio|link <seeds.json> [render | render-log.json]');
  const db = fromApi(JSON.parse(fs.readFileSync(file, 'utf8')));
  const out = process.env.LOG_DIR || process.cwd();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const save = (n, log) => { const f = path.join(out, `spa-held-49-${n}-${stamp}.json`); fs.writeFileSync(f, JSON.stringify(log, null, 2)); return f; };
  const p = plan(mode === 'link' ? fromApi(JSON.parse(fs.readFileSync(process.env.BEFORE_SEEDS, 'utf8'))) : db);
  console.log(`plan: ${p.reworded.length} reworded, ${p.deleted.length} deleted, ${p.deleteBlocked.length} delete blocked by the floor, ${p.missing.length} missing, ${p.unapprove.length} seeds to unapprove`);
  for (const r of p.reworded) console.log(`  REWORD ${r.id} (item ${r.item}): ${r.before.known_text} | ${r.before.target_text}\n       → ${r.known} | ${r.target}`);
  for (const d of p.deleted) console.log(`  DELETE ${d.id} (item ${d.item}; ${d.why}; leaves U${d.left.use}/B${d.left.build}): ${d.before.known_text} | ${d.before.target_text}`);
  for (const b of p.deleteBlocked) console.log(`  BLOCKED ${b.id} (item ${b.item}) ${b.why}`);
  for (const m of p.missing) console.log(`  MISSING ${m.id} (item ${m.item})`);
  if (mode === 'check') return console.log(save('check', p));

  if (mode === 'audio') {
    const asks = clipAsks(p); const render = flag === 'render';
    const log = { job: '#164', mode: render ? 'render' : 'dry', asks: [] };
    for (const a of asks) {
      const d = await post(`${POPTY}/api/audio/render`, { courseCode: COURSE, role: a.role, text: a.text, purpose: PURPOSE, approval: APPROVAL, dryRun: !render });
      log.asks.push({ ...a, status: d.status, body: d.body });
      if (d.status !== 200) console.log('  REFUSED', d.status, a.role, a.text, JSON.stringify(d.body));
    }
    const chars = log.asks.reduce((n, a) => n + (a.body.charsSpent || a.body.wouldSpendChars || 0), 0);
    console.log(`audio ${render ? 'render' : 'dry run'}: ${asks.length} asks, ${chars} chars`);
    return console.log(save('audio', log));
  }

  if (mode === 'link') {
    // The render route files the target clips on the phrase row but not the known one: put each rendered clip into the
    // reworded row's EMPTY slot (fill-only), taking clip ids from the render log (argv[4]) and the slots from a fresh read (file).
    const rlog = JSON.parse(fs.readFileSync(flag, 'utf8'));
    const clip = new Map(rlog.asks.filter((a) => a.body && a.body.audioId).map((a) => [`${a.role}\u0000${a.text}`, a.body.audioId]));
    const col = { known: 'known_audio_id', target1: 'target1_audio_id', target2: 'target2_audio_id' };
    const now = new Map(db.phrases.map((q) => [sid(q.id), q]));
    const links = [];
    for (const r of p.reworded) for (const role of Object.keys(col)) {
      const text = role === 'known' ? r.known : r.target, a = clip.get(`${role}\u0000${text}`), q = now.get(r.id);
      if (a && q && !q[col[role]] && (q.known_text === r.known && q.target_text === r.target)) links.push({ phraseId: q.id, role, audioId: a });
    }
    const d = await post(`${POPTY}/api/production/${COURSE}/link-clip`, { links, approval: APPROVAL, dryRun: process.env.APPLY_CONFIRM !== '1' });
    console.log(`link-clip ${process.env.APPLY_CONFIRM === '1' ? 'APPLY' : 'dry'}: ${links.length} links → ${d.status} ${JSON.stringify(d.body).slice(0, 400)}`);
    return console.log(save('link', { links, status: d.status, body: d.body }));
  }

  const log = { job: '#164', mode, batches: [] };
  // at ~0.7 s per op (the text-change audio triggers) 25 ops fit the statement cap; 100 do not (job #425)
  const all = editBatch(p), chunks = [];
  for (let i = 0; i < all.length; i += 25) chunks.push([`phrases ${i / 25 + 1}`, all.slice(i, i + 25)]);
  for (const [cls, ops] of [...chunks, ['unapprove', unapproveBatch(p)]]) {
    if (!ops.length) continue;
    const dry = await post(`${POPTY}/api/production/${COURSE}/edit-batch`, { ops, approval: APPROVAL });
    console.log(`[${cls}] ${ops.length} ops — dry run ${dry.status} ${dry.body.error || ''}`);
    log.batches.push({ cls, ops: ops.length, dry: dry.status, error: dry.body.error });
    if (dry.status !== 200) { console.log(JSON.stringify(dry.body).slice(0, 600)); break; }
    if (mode !== 'apply' || process.env.APPLY_CONFIRM !== '1') continue;
    const ap = await post(`${POPTY}/api/production/${COURSE}/edit-batch`, { ops, approval: APPROVAL, apply: true });
    log.batches[log.batches.length - 1].apply = { status: ap.status, event_id: ap.body.event_id, undo_file: ap.body.undo_file, error: ap.body.error };
    console.log(`  APPLIED ${ap.status} event ${ap.body.event_id} undo ${ap.body.undo_file} ${ap.body.error || ''}`);
    if (ap.status !== 200) { process.exitCode = 1; break; }
  }
  console.log(save(mode, log));
}

if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
module.exports = { plan, editBatch, unapproveBatch, clipAsks, DECISIONS, HELD };
