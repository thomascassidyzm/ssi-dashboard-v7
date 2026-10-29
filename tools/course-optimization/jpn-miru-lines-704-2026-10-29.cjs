#!/usr/bin/env node
'use strict';
// jpn_for_eng (Kai, 29 Oct 2026, job #704; follow-up to #564): seed 220 now teaches 見た, so 見る is not taught between 220 and 300.
// Four phrases that used 見る are rewritten with 見た (same slot id, meaning kept as near as the tense allows). S0287L01U10 is NOT
// rewritten here: it is the exact seed sentence of seed 287 (canon S15/P26), and the seed itself says 見る — that is Kai's call.
// A row whose text changes is DELETED and re-INSERTED under the same id (display_tiling can't be nulled by edit-batch; a stale tiling is worse than none).
// Writes only through Popty edit-batch (dry run unless the body says apply). Nothing here deletes a LEGO or a clip.
//   node …cjs emit <seeds.json> <outdir>             # seeds.json = GET /api/production/jpn_for_eng/seeds
//   node …cjs resolve <seeds.json> <outdir> <renders.jsonl>   # {k:"role\0text", body:{audioId}} per line -> body-dry.json / body-apply.json
const fs = require('fs');
const COURSE = 'jpn_for_eng';
const P = (ja, ro) => [ja, ro];
const Q = P('？', '?'), STOP = P('。', '.');
const TV = P('テレビ', 'terebi'), MITA = P('見た', 'mita');

/** id (short), seed, old target (refuses to run on anything else), new known, segments */
const ROWS = [
  ['S0284L01U06', 284, '妹の友だちテレビ見るの好き', 'my sister\'s friend watched television', [P('妹の', 'imooto no'), P('友だち', 'tomodachi'), TV, MITA]],
  ['S0286L01U01', 286, 'テレビ見る人が友だち', 'people who watched television are my friends', [TV, MITA, P('人', 'hito'), P('が', 'ga'), P('友だち', 'tomodachi')]],
  ['S0286L01U07', 286, 'テレビ見るの好きな人今始められる', 'people who watched television can start now', [TV, MITA, P('人', 'hito'), P('今', 'ima'), P('始められる', 'hajimerareru')]],
  ['S0288L01U02', 288, 'ほとんどの人がテレビ見るの好き', 'most people watched television', [P('ほとんど', 'hotondo'), P('の', 'no'), P('人', 'hito'), P('が', 'ga'), TV, MITA]],
];
const jaOf = (s) => s.map((x) => x[0]).join('');
const roOf = (s) => s.map((x) => x[1]).join(' ');
const STRIP = ['known_audio_id', 'target1_audio_id', 'target2_audio_id', 'presentation_audio_id', 'target1_duration_ms', 'target2_duration_ms',
  'last_edit_event_id', 'created_at', 'updated_at', 'version', 'qa_checked', 'decomposition', 'decomposition_course_version', 'display_tiling', 'display_tiling_version'];

function build(db) {
  const phr = {}; const legos = [];
  for (const s of db.seeds) for (const l of s.legos) { legos.push(l); for (const p of l.basket_phrases) phr[p.id.split(':').pop()] = p; }
  const ops = [], plan = [], gate = [], asks = new Map();
  const ask = (role, text, why) => { const k = `${role}\0${text}`; if (!asks.has(k)) asks.set(k, { role, text, why: [] }); asks.get(k).why.push(why); return k; };
  const seedGroups = {};
  for (const [id, seed, oldTarget, known, segs] of ROWS) {
    const old = phr[id];
    if (!old || old.target_text !== oldTarget) throw new Error(`${id} is not what this tool was written against: ${old && old.target_text}`);
    // tile lookup: earliest LEGO teaching each target string before this seed, plus the components of S0220L02 (見た is taught there)
    const lookup = new Map();
    for (const l of legos) if (l.seed_number < seed && !lookup.has(l.target_text)) lookup.set(l.target_text, { known: l.known_text, legoId: l.lego_id });
    const l220 = legos.find((l) => l.lego_id === 'S0220L02');
    for (const c of l220.components) if (!lookup.has(c.target)) lookup.set(c.target, { known: c.known, legoId: 'S0220L02' });
    const own = legos.find((l) => l.lego_id === id.slice(0, 8));
    lookup.set(own.target_text, { known: own.known_text, legoId: own.lego_id });
    const tiles = [];
    for (const [ja] of segs) {
      const hit = lookup.get(ja);
      if (hit) tiles.push({ known: hit.known, legoId: hit.legoId, target: ja, isGhost: false, ...(ja === own.target_text ? { isSalient: true } : {}) });
      else for (const ch of ja) tiles.push({ known: '', legoId: null, target: ch, isGhost: true });
    }
    const ja = jaOf(segs), pos = ja.indexOf(own.target_text);
    const row = { ...old }; for (const c of STRIP) delete row[c];
    const md = { ...(old.metadata || {}), source: 'kai-704-jpn-miru (Kai 29 Oct, job #704)' }; delete md.scored_at;
    Object.assign(row, { known_text: known, target_text: ja, target_text_roman: roOf(segs), decomposition: tiles, decomposition_course_version: null,
      lego_position: pos === 0 ? 'start' : (pos + own.target_text.length >= ja.length ? 'end' : 'middle'), metadata: md, status: 'draft', word_count: ja.length, lego_count: tiles.filter((t) => !t.isGhost).length || 1 });
    plan.push(`${id}: ${old.known_text} | ${old.target_text}  ->  ${known} | ${ja}  (${row.target_text_roman})`);
    ops.push({ op: 'phrase.delete', phrase_id: old.id, expect: { target_text: old.target_text } });
    ops.push({ op: 'phrase.insert', row });
    ops.push({ op: 'audio.link', target: 'phrase', phrase_id: old.id, slot: 'known', audio_id: { $ask: ask('known', known, id) } });
    for (const slot of ['target1', 'target2']) ops.push({ op: 'audio.link', target: 'phrase', phrase_id: old.id, slot, audio_id: { $ask: ask(slot, ja, id) } });
    (seedGroups[own.lego_id] = seedGroups[own.lego_id] || { own, ids: {} }).ids[id] = { role: old.phrase_role, known, target: ja };
  }
  // seeds: unapprove (a no-op while approved_at is already null; recorded so the intent survives a later approval)
  for (const n of [...new Set(ROWS.map((r) => r[1]))]) {
    const s = db.seeds.find((x) => x.seed_number === n);
    if (s.approved_at) ops.unshift({ op: 'seed.update', seed_number: n, set: { approved_at: null }, expect: { approved_at: new Date(s.approved_at).toISOString() } });
  }
  for (const { own, ids } of Object.values(seedGroups)) {
    const sibs = own.basket_phrases.filter((p) => p.phrase_role !== 'component').map((p) => { const k = p.id.split(':').pop(); return ids[k] || { role: p.phrase_role, known: p.known_text, target: p.target_text }; });
    const seed = db.seeds.find((x) => x.seed_number === own.seed_number);
    gate.push({ courseCode: COURSE, seedNumber: own.seed_number, legoIndex: own.lego_index, legoId: own.lego_id, legoKnown: own.known_text, legoTarget: own.target_text, seedTarget: seed.target_text, phrases: sibs });
  }
  return { ops, plan, gate, asks: [...asks.values()] };
}

function resolve(ops, log) {
  const id = new Map(); for (const l of log) if (l.body && l.body.audioId) id.set(l.k, l.body.audioId);
  const missing = new Set();
  const out = ops.map((o) => { if (o.audio_id && o.audio_id.$ask) { const a = id.get(o.audio_id.$ask); if (!a) { missing.add(o.audio_id.$ask); return o; } return { ...o, audio_id: a }; } return o; });
  return { ops: out, missing: [...missing] };
}

if (require.main === module) {
  const [mode, seedsPath, outDir, extra] = process.argv.slice(2);
  const b = build(JSON.parse(fs.readFileSync(seedsPath, 'utf8')));
  fs.mkdirSync(outDir, { recursive: true });
  if (mode === 'emit') {
    fs.writeFileSync(`${outDir}/gate-input.json`, JSON.stringify(b.gate));
    fs.writeFileSync(`${outDir}/asks.json`, JSON.stringify(b.asks.map((a) => ({ k: `${a.role}\0${a.text}`, ...a }))));
    fs.writeFileSync(`${outDir}/plan.txt`, b.plan.join('\n'));
    console.log(b.plan.join('\n'), `\n${b.ops.length} ops, ${b.asks.length} clip asks`);
  } else if (mode === 'resolve') {
    const r = resolve(b.ops, fs.readFileSync(extra, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)));
    if (r.missing.length) { console.error('asks with no clip yet:', r.missing); process.exit(1); }
    fs.writeFileSync(`${outDir}/body-dry.json`, JSON.stringify({ ops: r.ops }));
    fs.writeFileSync(`${outDir}/body-apply.json`, JSON.stringify({ ops: r.ops, apply: true }));
    console.log('resolved', r.ops.length, 'ops');
  }
}
module.exports = { build, resolve, ROWS };
