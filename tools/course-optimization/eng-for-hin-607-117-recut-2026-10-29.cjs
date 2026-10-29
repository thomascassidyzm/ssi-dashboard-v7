#!/usr/bin/env node
'use strict';
// eng_for_hin S0607 + S0117 LEGO re-cuts (Kai approved, re-confirmed 29 Oct 2026; job #508). Census + rulings: https://watson-1.tail4968cb.ts.net/d/04b765c9
//
// S0607 "If I had known I'd have done things differently." — ONE LEGO split at the comma:
//   L01 अगर मुझे पता होता | if I had known     = S0152L02 exactly, both sides → is_new=false (the English contraction "if I'd known" is
//                                                 expanded in the seed and its rows so the pair matches; S0152 is untouched, 100s of learners stand on it)
//   L02 तो मैंने चीज़ें अलग ढंग से की होतीं | I'd have done things differently   (new; the 7 old rows move here, English harmonised, + the seed sentence, P26)
// S0117 — L02 "उससे जब हमने पिछली बार बात की थी | than I was last time we talked to each other" becomes THREE small LEGOs, no frame
//   (Kai: a LEGO only for what the learner could not assemble). Peeled noun phrase first (K47 build-up order):
//   L02 पिछली बार | last time     L03 उससे | than I was     L04 हमने बात की थी | we talked to each other
//   The 8 old rows (they carry all three pieces, so they can only be played once all three are taught) move whole to L04 with their
//   clips; L02/L03 get fresh baskets, L04 gets plain rows where "हमने बात की थी" is contiguous (K49: the old rows split it with पिछली बार).
// Writes only through Popty edit-batch (dry run unless APPLY_CONFIRM=1). Never deletes a LEGO. Clips are re-linked, never deleted.
//   node tools/course-optimization/eng-for-hin-607-117-recut-2026-10-29.cjs <dump.json> <api-seeds.json>   # offline checks + edit-batch dry run
//   APPLY_CONFIRM=1 node … <dump.json> <api-seeds.json>                                                   # then applies
const fs = require('fs');
const COURSE = 'eng_for_hin';
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
const AGENT = 'eng-for-hin-607-117-recut';
const TOM_GO = 'Kai approved both re-cuts and re-confirmed them on 29 Oct 2026 (job #508 brief; Tom 2026-10-15: Kai\'s go satisfies the structural gate) — not Tom\'s own words';
const SEED_607 = { known: 'अगर मुझे पता होता, तो मैंने चीज़ें अलग ढंग से की होतीं।', targetOld: "If I'd known I'd have done things differently.", target: "If I had known I'd have done things differently." };
const SEED_117 = { known: 'हमने पिछली बार जब बात की थी, उससे मैं निश्चित रूप से बेहतर कर रहा हूँ।', target: "I'm definitely doing better than I was last time we talked to each other." };

// ── S0117 new baskets ([known, target, gender]); gendered Hindi takes ONE form per row, balanced f/m ─────────────────────────────
const L02_BUILD = [
  ['मैं पिछली बार से बेहतर कर रही हूँ', "I'm doing better than last time", 'f'],
  ['पिछली बार मैं थकी हुई थी', 'last time I was tired', 'f'],
  ['पिछली बार मैं निश्चित रूप से बेहतर कर रहा था', 'last time I was definitely doing better', 'm'],
];
const L02_USE = [
  ['मुझे लगता है कि मैं पिछली बार से निश्चित रूप से बेहतर कर रही हूँ।', "I think that I'm definitely doing better than last time", 'f'],
  ['मुझे यक़ीन है कि पिछली बार मैं बहुत थकी हुई थी।', "I'm sure that last time I was very tired", 'f'],
  ['क्या आपको लगता है कि मैं पिछली बार से बेहतर कर रहा हूँ?', 'do you think that I\'m doing better than last time?', 'm'],
  ['मुझे याद है कि पिछली बार आप ख़ुश थे।', 'I remember that last time you were happy', null],
];
const L03_BUILD = [
  ['मैं उससे बेहतर कर रहा हूँ जो मैं कल था', "I'm doing better than I was yesterday", 'm'],
  ['मैं निश्चित रूप से उससे बेहतर कर रही हूँ जो मैं पिछले हफ़्ते थी', "I'm definitely doing better than I was last week", 'f'],
  ['मैं आज उससे बेहतर कर रहा हूँ जो मैं कल रात था', "I'm doing better today than I was last night", 'm'],
];
const L03_USE = [
  ['मुझे लगता है कि मैं उससे बेहतर कर रही हूँ जो मैं पिछले हफ़्ते थी।', "I think that I'm doing better than I was last week", 'f'],
  ['मुझे यक़ीन है कि मैं निश्चित रूप से उससे बेहतर कर रहा हूँ जो मैं कल था।', "I'm sure I'm definitely doing better than I was yesterday", 'm'],
  ['मुझे लग रहा है कि मैं उससे बुरा कर रही हूँ जो मैं कल थी।', "I feel as if I'm doing worse than I was yesterday", 'f'],
  ['क्या आपको लगता है कि मैं उससे बेहतर कर रहा हूँ जो मैं पिछले हफ़्ते था?', 'do you think that I\'m doing better than I was last week?', 'm'],
];
// L04 plain rows ("हमने बात की थी" contiguous) + the seed sentence (P26: the learner SAYS the seed sentence, under the seed's last new LEGO)
const L04_PLAIN_USE = [
  ['हमने कल बात की थी।', 'we talked to each other yesterday', null],
  ['मुझे यक़ीन है कि हमने कल रात बात की थी।', "I'm sure we talked to each other last night", null],
  ['मुझे लगता है कि हमने पिछले हफ़्ते बात की थी।', 'I think we talked to each other last week', null],
  [SEED_117.known, SEED_117.target.replace(/\.$/, ''), 'm'],
];
const OLD_L02_TEXT = { known: 'उससे जब हमने पिछली बार बात की थी', target: 'than I was last time we talked to each other' };

const sid = (id) => String(id).split(':').pop();
const STRIP = ['known_audio_id', 'target1_audio_id', 'target2_audio_id', 'presentation_audio_id', 'target1_duration_ms', 'target2_duration_ms',
  'last_edit_event_id', 'created_at', 'updated_at', 'version', 'qa_checked', 'decomposition', 'decomposition_course_version', 'display_tiling', 'display_tiling_version'];
function phraseRow(template, { seed, legoIndex, id, role, position, known, target, gender }) {
  const row = { ...template };
  for (const c of STRIP) delete row[c];
  const md = { pipeline: 'v2', format: 'build_use', source: `${AGENT} (Kai 29 Oct)` };
  if (gender) md.known_gender = gender;
  return { ...row, id: `${COURSE}:${id}`, seed_number: seed, lego_index: legoIndex, phrase_role: role, position, known_text: known, target_text: target,
    lego_position: 'end', connected_lego_ids: [], metadata: md, status: 'draft', word_count: target.length, lego_count: 2, introduce: true };
}
const legoRow = (template, seed, idx, known, target) => {
  const r = { ...template };
  for (const c of ['id', 'lego_id', 'version', 'updated_at', 'created_at', 'last_edit_event_id', 'round_index', 'known_audio_id', 'target1_audio_id', 'target2_audio_id', 'presentation_audio_id', 'target1_duration_ms', 'target2_duration_ms']) delete r[c];
  return { ...r, seed_number: seed, lego_index: idx, known_text: known, target_text: target, type: 'A', is_new: true, components: null, status: 'draft', known_gloss_segments: null, target_text_roman: null };
};
const iso = (d) => new Date(d).toISOString();

function build(dump, apiSeeds) {
  const legos = Object.fromEntries(dump.legos.map((l) => [l.lego_id, l]));
  const phr = Object.fromEntries(dump.phrases.map((p) => [sid(p.id), p]));
  const seedRow = (n) => apiSeeds.seeds.find((s) => s.seed_number === n);
  const ops = [], log = [];
  // ── guards: refuse to run on anything but the cut this was written against ──
  const s607 = dump.seeds.find((s) => s.seed_number === 607), s117 = dump.seeds.find((s) => s.seed_number === 117);
  if (s607.target_text !== SEED_607.targetOld || s607.known_text !== SEED_607.known) throw new Error('seed 607 is not the text this tool was written against');
  if (s117.target_text !== SEED_117.target || s117.known_text !== SEED_117.known) throw new Error('seed 117 is not the text this tool was written against');
  const l607 = legos.S0607L01, l152 = legos.S0152L02;
  if (dump.legos.filter((l) => l.seed_number === 607).length !== 1) throw new Error('S0607 is not a single-LEGO seed');
  if (!l152 || l152.known_text !== 'अगर मुझे पता होता' || l152.target_text !== 'if I had known' || !l152.is_new) throw new Error('S0152L02 is not the new LEGO "अगर मुझे पता होता | if I had known"');
  const l117 = legos.S0117L02;
  if (l117.known_text !== OLD_L02_TEXT.known || l117.target_text !== OLD_L02_TEXT.target || dump.legos.filter((l) => l.seed_number === 117).length !== 2) throw new Error('S0117 is not the 2-LEGO cut this tool was written against');
  for (const id of ['S0117L03', 'S0117L04', 'S0607L02']) if (legos[id]) throw new Error(`${id} already exists`);

  // ═══ S0607 ═══
  ops.push({ op: 'seed.update', seed_number: 607, set: { target_text: SEED_607.target, target1_audio_id: null, target2_audio_id: null, approved_at: null },
    expect: { target_text: SEED_607.targetOld, approved_at: iso(seedRow(607).approved_at) } });
  const unlink = (set, l) => { for (const [col, slot] of [['known_audio_id', 'known'], ['target1_audio_id', 'target1'], ['target2_audio_id', 'target2'], ['presentation_audio_id', 'presentation']]) if (l[col]) set[col] = null; return set; };
  // L01 becomes the not-new twin of S0152L02: its own clips (the old whole clause) are unlinked and S0152L02's clips are linked in.
  ops.push({ op: 'lego.update', lego_id: 'S0607L01', set: unlink({ known_text: l152.known_text, target_text: l152.target_text, is_new: false }, l607),
    expect: { known_text: l607.known_text, target_text: l607.target_text, is_new: true } });
  for (const [col, slot] of [['known_audio_id', 'known'], ['target1_audio_id', 'target1'], ['target2_audio_id', 'target2']])
    ops.push({ op: 'audio.link', target: 'lego', lego_id: 'S0607L01', slot, audio_id: l152[col] });
  ops.push({ op: 'lego.insert', row: legoRow(l607, 607, 2, 'तो मैंने चीज़ें अलग ढंग से की होतीं', "I'd have done things differently") });
  const old607 = Object.keys(phr).filter((k) => k.startsWith('S0607L01')).sort();
  for (const k of old607) {
    const p = phr[k];
    const target = p.target_text.replace("if I'd known", 'if I had known');
    if (target === p.target_text) throw new Error(`${k} has no "if I'd known" to harmonise`);
    const nid = k.replace('S0607L01', 'S0607L02');
    const row = phraseRow(p, { seed: 607, legoIndex: 2, id: nid, role: p.phrase_role, position: p.position, known: p.known_text, target, gender: p.metadata?.known_gender });
    row.metadata = { ...(p.metadata || {}), moved_from: k, moved_by: AGENT };
    ops.push({ op: 'phrase.insert', row });
    if (p.known_audio_id) ops.push({ op: 'audio.link', target: 'phrase', phrase_id: row.id, slot: 'known', audio_id: p.known_audio_id });
    ops.push({ op: 'phrase.delete', phrase_id: p.id });
    log.push(`607 ${k} -> ${nid}: ${p.known_text} | ${target}`);
  }
  ops.push({ op: 'phrase.insert', row: phraseRow(phr.S0607L01B01, { seed: 607, legoIndex: 2, id: 'S0607L02U04', role: 'use', position: 7, known: SEED_607.known, target: SEED_607.target.replace(/\.$/, '').replace(/^I/, 'i'), gender: null }) });
  ops.push({ op: 'audio.link', target: 'phrase', phrase_id: `${COURSE}:S0607L02U04`, slot: 'known', audio_id: s607.known_audio_id });
  log.push('607 new S0607L02U04 = the seed sentence (P26)');

  // ═══ S0117 ═══
  ops.push({ op: 'seed.update', seed_number: 117, set: { approved_at: null }, expect: { approved_at: iso(seedRow(117).approved_at) } });
  ops.push({ op: 'lego.update', lego_id: 'S0117L02', set: unlink({ known_text: 'पिछली बार', target_text: 'last time' }, l117), expect: { known_text: l117.known_text, target_text: l117.target_text } });
  ops.push({ op: 'lego.insert', row: legoRow(l117, 117, 3, 'उससे', 'than I was') });
  ops.push({ op: 'lego.insert', row: legoRow(l117, 117, 4, 'हमने बात की थी', 'we talked to each other') });
  const old117 = Object.keys(phr).filter((k) => k.startsWith('S0117L02')).sort();
  if (old117.length !== 8) throw new Error(`expected 8 old S0117L02 rows, found ${old117.length}`);
  for (const k of old117) {
    const p = phr[k], nid = k.replace('S0117L02', 'S0117L04');
    const row = { ...phraseRow(p, { seed: 117, legoIndex: 4, id: nid, role: p.phrase_role, position: p.position, known: p.known_text, target: p.target_text, gender: null }), metadata: { ...(p.metadata || {}), moved_from: k, moved_by: AGENT } };
    row.word_count = p.word_count; row.lego_count = p.lego_count;
    ops.push({ op: 'phrase.insert', row });
    for (const [col, slot] of [['known_audio_id', 'known'], ['target1_audio_id', 'target1'], ['target2_audio_id', 'target2']]) if (p[col]) ops.push({ op: 'audio.link', target: 'phrase', phrase_id: row.id, slot, audio_id: p[col] });
    ops.push({ op: 'phrase.delete', phrase_id: p.id });
    log.push(`117 ${k} -> ${nid}: ${p.known_text} | ${p.target_text}`);
  }
  const tmpl = phr.S0117L01B01;
  const add = (legoIdx, role, n0, list) => list.forEach(([known, target, gender], i) => {
    const n = n0 + i, id = `S0117L0${legoIdx}${role === 'build' ? 'B' : 'U'}${String(role === 'build' ? i + 1 : n - 3).padStart(2, '0')}`;
    ops.push({ op: 'phrase.insert', row: phraseRow(tmpl, { seed: 117, legoIndex: legoIdx, id, role, position: n, known, target, gender }) });
    log.push(`117 new ${id}: ${known} | ${target}`);
  });
  add(2, 'build', 1, L02_BUILD); add(2, 'use', 4, L02_USE);
  add(3, 'build', 1, L03_BUILD); add(3, 'use', 4, L03_USE);
  add(4, 'use', 9, L04_PLAIN_USE);
  return { ops, log };
}

// ── offline checks (the rails, as code) ────────────────────────────────────────────────────────────────────────────────────────
const words = (s) => String(s).toLowerCase().replace(/[.,!?;:।"]/g, ' ').replace(/’/g, "'").split(/\s+/).filter(Boolean);
function checks(dump, ops) {
  const problems = [];
  const taught = new Set();
  for (const l of dump.legos) if (l.seed_number < 117) for (const w of words(l.target_text)) taught.add(w);
  const taughtHi = new Set();
  for (const l of dump.legos) if (l.seed_number < 117 || l.lego_id === 'S0117L01') for (const w of words(l.known_text)) taughtHi.add(w);
  for (const w of words('I\'m definitely doing better last time than I was we talked to each other')) taught.add(w);
  for (const w of words('पिछली बार उससे हमने बात की थी')) taughtHi.add(w);
  const newRows = ops.filter((o) => o.op === 'phrase.insert').map((o) => o.row).filter((r) => r.seed_number === 117 && !r.metadata.moved_from);
  const lego = { 2: ['पिछली बार', 'last time'], 3: ['उससे', 'than i was'], 4: ['हमने बात की थी', 'we talked to each other'] };
  for (const r of newRows) {
    const [hk, tg] = lego[r.lego_index];
    const tt = ` ${words(r.target_text).join(' ')} `;
    if (!tt.includes(` ${tg} `)) problems.push(`${r.id}: target lacks "${tg}"`);
    if (r.lego_index !== 4) {
      const hkw = ` ${words(r.known_text).join(' ')} `;
      if (!hkw.includes(` ${words(hk).join(' ')} `) && r.lego_index !== 4) problems.push(`${r.id}: known lacks "${hk}"`);
    }
    for (const w of words(r.target_text)) if (!taught.has(w)) problems.push(`${r.id}: English word "${w}" not taught by seed 117`);
    for (const w of words(r.known_text)) if (!taughtHi.has(w)) problems.push(`${r.id}: Hindi word "${w}" not in any LEGO up to S0117`);
  }
  const keys = new Set();
  for (const r of newRows) { const k = r.known_text.trim(); if (keys.has(k)) problems.push(`duplicate known ${k}`); keys.add(k); }
  return problems;
}

async function post(body) {
  const r = await fetch(`${POPTY}/api/production/${COURSE}/edit-batch`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body), signal: AbortSignal.timeout(180000) });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}
async function main() {
  const [dumpPath, seedsPath] = process.argv.slice(2);
  const { ops, log } = build(JSON.parse(fs.readFileSync(dumpPath, 'utf8')), JSON.parse(fs.readFileSync(seedsPath, 'utf8')));
  const problems = checks(JSON.parse(fs.readFileSync(dumpPath, 'utf8')), ops);
  console.log(log.join('\n'), `\n${ops.length} ops`);
  if (problems.length) { console.log('OFFLINE PROBLEMS:\n' + problems.join('\n')); if (!process.env.IGNORE_PROBLEMS) process.exit(1); }
  const prev = await post({ ops });
  console.log('dry run', prev.status, JSON.stringify(prev.body).slice(0, 1500));
  if (prev.status !== 200 || process.env.APPLY_CONFIRM !== '1') return;
  const res = await post({ ops, apply: true, tom_go: TOM_GO });
  console.log('APPLY', res.status, JSON.stringify(res.body).slice(0, 2500));
  fs.writeFileSync(`${process.env.CS_SCRATCH || '.'}/applied.json`, JSON.stringify(res.body));
}
if (require.main === module) main().catch((e) => { console.error(e.message); process.exit(1); });
module.exports = { build, checks };
