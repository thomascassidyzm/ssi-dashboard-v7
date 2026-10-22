#!/usr/bin/env node
'use strict';
// tools/course-optimization/zho-dup-lego-notnew-2026-10-22.cjs — zho_for_eng duplicate LEGOs still marked NEW (job #514,
// Kai approved 22 Oct 2026 19:50Z; census #420 D6a "new but duplicate"; the spa #509 / fra #508 passes are the precedent).
//
// THE RULE (Kai, 2026-09-23 / 22 Oct): a LEGO is a duplicate — and so not-new — only if BOTH its known text and its target
// text exactly match an EARLIER LEGO. Either side differing (gender, form, wording, even case) = not a duplicate: held.
//   - flip only when an earlier twin is itself NEW (an earlier twin that is only not-new is "inverted": flipping would leave
//     the item never taught; the fix there swaps flags, which is Case B and Kai's call) → held.
//   - never leave a seed with no new LEGO → that seed's flips are held.
//   - a not-new LEGO's basket is never played (P25). If the seed sentence was played ONLY under LEGOs this pass flips, a copy
//     goes in as a USE row under a remaining new LEGO of the seed that it contains, wired to the SEED's own three clips (0 TTS).
//   - phrases under a flipped LEGO are neither moved nor deleted (Kai: fine to go unplayed). Never delete a LEGO.
//   - every affected seed is unapproved (an edit unapproves a seed).
//
//   node …/zho-dup-lego-notnew-2026-10-22.cjs check <seeds.json> [census.tsv]   # the plan on a Popty seeds dump (pure)
//   APPLY_CONFIRM=1 node …  run <seeds.json>                                    # edit-batch dry run, then apply
//   node …/zho-dup-lego-notnew-2026-10-22.cjs verify <seeds.json>               # re-read after apply
// <seeds.json> = GET /api/production/zho_for_eng/seeds?status=all
const fs = require('fs');
const path = require('path');

const COURSE = 'zho_for_eng';
const AGENT = 'zho-dup-lego-notnew (job #514)';
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
const sid = (id) => String(id).split(':').pop();
const P = (id) => `${COURSE}:${id}`;
const legoOfPhrase = (id) => sid(id).slice(0, 8);
// sentence identity (seed-sentence check) and Chinese containment: case, spaces and punctuation (Latin and CJK) ignored
const loose = (s) => String(s || '').normalize('NFC').toLowerCase().replace(/[’‘`´]/g, "'").replace(/[^\p{L}\p{M}\p{N}']/gu, '');
const exact = (s) => String(s || '').normalize('NFC').trim();
const order = (a, b) => a.seed_number - b.seed_number || a.lego_index - b.lego_index;

function fromApi(api) {
  const seeds = [], legos = [], phrases = [];
  for (const s of api.seeds) {
    const { legos: ls, ...seed } = s; seeds.push(seed);
    for (const l of ls) { const { basket_phrases, ...lego } = l; legos.push(lego); for (const p of basket_phrases) phrases.push(p); }
  }
  legos.sort(order);
  return { seeds, legos, phrases };
}

function plan(db, censusIds = []) {
  const flips = [], inverted = [], caseOnly = [];
  for (let i = 0; i < db.legos.length; i++) {
    const l = db.legos[i];
    if (l.is_new !== true) continue;
    const earlier = db.legos.slice(0, i);
    const twins = earlier.filter((e) => exact(e.known_text) === exact(l.known_text) && exact(e.target_text) === exact(l.target_text));
    if (!twins.length) {
      const near = earlier.find((e) => exact(e.known_text).toLowerCase() === exact(l.known_text).toLowerCase() && exact(e.target_text) === exact(l.target_text));
      if (near) caseOnly.push({ lego: l, twin: near });
      continue;
    }
    const newTwin = twins.find((e) => e.is_new === true);
    if (newTwin) flips.push({ lego: l, twin: newTwin, firstTwin: twins[0] });
    else inverted.push({ lego: l, twin: twins[0] });
  }
  // census rows that no longer match on both sides (or were never exact)
  const covered = new Set([...flips, ...inverted].map((f) => f.lego.lego_id));
  const differ = censusIds.filter((c) => !covered.has(c.lego)).map((c) => ({
    census: c, lego: db.legos.find((l) => l.lego_id === c.lego), twin: db.legos.find((l) => l.lego_id === c.earlier),
  }));

  // seeds left with no new LEGO → hold all their flips
  const flipSet = new Set(flips.map((f) => f.lego.lego_id));
  const seedHeld = [];
  for (const sn of [...new Set(flips.map((f) => f.lego.seed_number))]) {
    const remaining = db.legos.filter((l) => l.seed_number === sn && l.is_new === true && !flipSet.has(l.lego_id));
    if (!remaining.length) seedHeld.push(sn);
  }
  const held = new Set(seedHeld);
  const apply = flips.filter((f) => !held.has(f.lego.seed_number));
  const applySet = new Set(apply.map((f) => f.lego.lego_id));
  const newAfter = (id) => { const l = db.legos.find((x) => x.lego_id === id); return !!l && l.is_new === true && !applySet.has(id); };

  // seed-sentence check per affected seed
  const rehome = [], seedNotes = [];
  const seeds = [...new Set(apply.map((f) => f.lego.seed_number))].sort((a, b) => a - b);
  for (const sn of seeds) {
    const seed = db.seeds.find((s) => s.seed_number === sn);
    const rows = db.phrases.filter((p) => p.seed_number === sn && p.phrase_role !== 'component' && loose(p.known_text) === loose(seed.known_text) && loose(p.target_text) === loose(seed.target_text));
    const playedBefore = rows.filter((r) => { const l = db.legos.find((x) => x.lego_id === legoOfPhrase(r.id)); return l && l.is_new === true; });
    const playedAfter = rows.filter((r) => newAfter(legoOfPhrase(r.id)));
    if (playedAfter.length) { seedNotes.push({ sn, state: 'still played', where: playedAfter.map((r) => sid(r.id)) }); continue; }
    if (!playedBefore.length) { seedNotes.push({ sn, state: 'not played before this pass either', where: rows.map((r) => sid(r.id)) }); continue; }
    // played only under LEGOs this pass flips → USE copy under a remaining new LEGO the sentence contains
    // target-side containment, as the live gate tests it for Chinese (validation.cjs phraseContainsLego baseline): a seed's
    // own LEGOs tile its sentence, so the known side ("several days ago" in "a few days ago") is judged in seed context
    const homes = db.legos.filter((l) => l.seed_number === sn && newAfter(l.lego_id) && loose(seed.target_text).includes(loose(l.target_text)));
    const home = homes[homes.length - 1];
    if (!home) { seedNotes.push({ sn, state: 'NO HOME: no remaining new LEGO contained in the seed sentence', where: playedBefore.map((r) => sid(r.id)) }); continue; }
    const homeRows = db.phrases.filter((p) => legoOfPhrase(p.id) === home.lego_id);
    const nextU = Math.max(0, ...homeRows.filter((p) => /U\d+$/.test(sid(p.id))).map((p) => +sid(p.id).match(/U(\d+)$/)[1])) + 1;
    const tmpl = playedBefore[0];
    const row = { ...tmpl, id: P(`${home.lego_id}U${String(nextU).padStart(2, '0')}`), lego_index: home.lego_index, seed_number: sn,
      phrase_role: 'use', status: 'draft', position: Math.max(0, ...homeRows.map((p) => p.position || 0)) + 1,
      known_text: seed.known_text.replace(/[.。]$/, ''), target_text: seed.target_text.replace(/[。]$/, ''),
      target_text_roman: seed.target_text_roman || tmpl.target_text_roman || null,
      metadata: { ...(tmpl.metadata || {}), seed_sentence_rehomed_from: sid(tmpl.id), rehomed_by: 'job #514 (P25: duplicate LEGO set not-new)' } };
    for (const c of ['known_audio_id', 'target1_audio_id', 'target2_audio_id', 'presentation_audio_id', 'last_edit_event_id', 'created_at', 'updated_at', 'version', 'qa_checked', 'target1_duration_ms', 'target2_duration_ms']) delete row[c];
    // the seed's own clips; where a seed slot differs from the clip the sentence's live row already plays (S0426: the seed's
    // target clips still say 但 after the text became 但是), the row's clip is the one that speaks the current words —
    // Popty's audio.link text check is the guard either way
    const clips = {}, clipNotes = [];
    for (const slot of ['known', 'target1', 'target2']) {
      const k = `${slot}_audio_id`;
      clips[slot] = tmpl[k] && tmpl[k] !== seed[k] ? tmpl[k] : seed[k];
      if (tmpl[k] && tmpl[k] !== seed[k]) clipNotes.push(`${slot}: seed clip ${seed[k]} differs, used row clip ${tmpl[k]}`);
    }
    rehome.push({ sn, home: home.lego_id, row, from: sid(tmpl.id), clips, clipNotes });
  }
  const unapprove = seeds.filter((sn) => db.seeds.find((s) => s.seed_number === sn).approved_at);
  return { apply, inverted, caseOnly, differ, seedHeld, heldFlips: flips.filter((f) => held.has(f.lego.seed_number)), rehome, seedNotes, seeds, unapprove };
}

function editOps(p, db) {
  const ops = [];
  for (const f of p.apply) ops.push({ op: 'lego.update', lego_id: f.lego.lego_id, set: { is_new: false }, expect: { is_new: true, known_text: f.lego.known_text, target_text: f.lego.target_text } });
  for (const r of p.rehome) {
    ops.push({ op: 'phrase.insert', row: r.row });
    for (const slot of ['known', 'target1', 'target2']) if (r.clips[slot]) ops.push({ op: 'audio.link', target: 'phrase', phrase_id: r.row.id, slot, audio_id: r.clips[slot] });
  }
  // no approved_at expect: the API dump and the edit route render the timestamp differently (+00:00 vs Z), and nulling it is
  // the goal whatever its value
  for (const sn of p.unapprove) ops.push({ op: 'seed.update', seed_number: sn, set: { approved_at: null } });
  return ops;
}

function zut(db, p) {
  const audit = require('./audit-phrase-zut.cjs');
  const legos = db.legos.map((l) => ({ ...l, id: l.lego_id }));
  const before = audit.auditRows({ legos, phrases: db.phrases, seeds: db.seeds }).bidirectional;
  const after = audit.auditRows({ legos, phrases: db.phrases.concat(p.rehome.map((r) => r.row)), seeds: db.seeds }).bidirectional;
  return { strict: [before.violationsStrict.length, after.violationsStrict.length], exact: [before.violations.length, after.violations.length], ci: [before.violationsCI.length, after.violationsCI.length] };
}

const line = (l) => `${l.lego_id} ${l.is_new ? 'new' : 'not-new'} "${l.known_text}" | ${l.target_text}`;
function print(db, p) {
  const z = zut(db, p);
  console.log(`plan: ${p.apply.length} flips across ${p.seeds.length} seeds, ${p.rehome.length} seed-sentence USE rows, ${p.unapprove.length} seeds unapproved; held: ${p.inverted.length} inverted, ${p.heldFlips.length} flips in ${p.seedHeld.length} seeds left with no new LEGO, ${p.differ.length} census rows not exact, ${p.caseOnly.length} case-only`);
  console.log(`ZUT strict ${z.strict[0]} → ${z.strict[1]}; exact ${z.exact[0]} → ${z.exact[1]}; ci ${z.ci[0]} → ${z.ci[1]}`);
  for (const f of p.apply) console.log(`  FLIP ${line(f.lego)}  ← twin ${f.twin.lego_id}${f.firstTwin !== f.twin ? ` (first twin ${f.firstTwin.lego_id} not-new)` : ''}`);
  for (const f of p.inverted) console.log(`  INVERTED ${line(f.lego)}  ← only not-new twin ${f.twin.lego_id}`);
  for (const f of p.heldFlips) console.log(`  SEED-HELD ${line(f.lego)}  ← twin ${f.twin.lego_id}`);
  for (const d of p.differ) console.log(`  DIFFER ${d.lego ? line(d.lego) : d.census.lego + ' (gone)'}  vs ${d.twin ? line(d.twin) : d.census.earlier + ' (gone)'}`);
  for (const c of p.caseOnly) console.log(`  CASE-ONLY ${line(c.lego)}  vs ${line(c.twin)}`);
  for (const r of p.rehome) console.log(`  REHOME S${String(r.sn).padStart(4, '0')} ${r.from} → ${sid(r.row.id)}: ${r.row.known_text} | ${r.row.target_text}  clips ${JSON.stringify(r.clips)}${r.clipNotes.length ? ' NOTE ' + r.clipNotes.join('; ') : ''}`);
  for (const n of p.seedNotes) if (n.state !== 'still played') console.log(`  SEED ${n.sn}: ${n.state} ${n.where.join(',')}`);
  return z;
}

async function post(url, body) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify(body), signal: AbortSignal.timeout(180000) });
  return { status: r.status, body: await r.json().catch(() => ({})) };
}

function readCensus(file) {
  if (!file) return [];
  return fs.readFileSync(file, 'utf8').trim().split('\n').slice(1).map((r) => r.split('\t')).map(([seed, lego, earlier]) => ({ seed, lego, earlier }));
}

async function main() {
  const [mode, file, census] = process.argv.slice(2);
  const db = fromApi(JSON.parse(fs.readFileSync(file, 'utf8')));
  if (mode === 'verify') {
    const log = JSON.parse(fs.readFileSync(process.env.APPLIED_LOG, 'utf8')), bad = [];
    for (const id of log.flipped) { const l = db.legos.find((x) => x.lego_id === id); if (!l || l.is_new !== false) bad.push(`${id} not not-new`); }
    for (const r of log.rehomed) { const ph = db.phrases.find((x) => x.id === r.id); if (!ph) bad.push(`${r.id} missing`); else for (const s of ['known', 'target1', 'target2']) if (ph[`${s}_audio_id`] !== r.clips[s]) bad.push(`${r.id} ${s} clip ${ph[`${s}_audio_id`]} ≠ ${r.clips[s]}`); }
    for (const sn of log.seeds) { const s = db.seeds.find((x) => x.seed_number === sn); if (s.approved_at) bad.push(`seed ${sn} still approved`); if (!db.legos.some((l) => l.seed_number === sn && l.is_new)) bad.push(`seed ${sn} has no new LEGO`); }
    console.log(`verify: ${bad.length} breaches`); for (const b of bad) console.log('  ', b); process.exitCode = bad.length ? 1 : 0; return;
  }
  const p = plan(db, readCensus(census));
  const z = print(db, p);
  if (mode === 'check') return;
  const ops = editOps(p, db);
  const prev = await post(`${POPTY}/api/production/${COURSE}/edit-batch`, { ops });
  console.log(`dry run HTTP ${prev.status} ${JSON.stringify(prev.body.error || prev.body.summary || '').slice(0, 400)}`);
  if (prev.status !== 200 || process.env.APPLY_CONFIRM !== '1') return;
  const res = await post(`${POPTY}/api/production/${COURSE}/edit-batch`, { ops, apply: true });
  const at = new Date().toISOString();
  const log = { job: '#514', at, zut: z, ops, flipped: p.apply.map((f) => f.lego.lego_id), seeds: p.seeds,
    rehomed: p.rehome.map((r) => ({ id: r.row.id, clips: r.clips })), applied: { status: res.status, event: res.body.event_id, undo_file: res.body.undo_file, error: res.status === 200 ? undefined : res.body } };
  const f = path.join(process.env.LOG_DIR || process.cwd(), `zho-dup-lego-notnew-applied-${at.replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(f, JSON.stringify(log, null, 2));
  console.log(`APPLY HTTP ${res.status}; event ${log.applied.event}; log ${f}`);
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
module.exports = { fromApi, plan, editOps, zut };
