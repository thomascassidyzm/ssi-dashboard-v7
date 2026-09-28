#!/usr/bin/env node
'use strict';
// ita_for_eng — course-wide gloss pass after ita-stranded-subjunctive-legos-2026-09-28.cjs (job #520).
//
// Kai's sharpening, 2026-09-28: when a LEGO is expanded, EVERY build and use phrase anywhere in
// the course that carries it — the English wording or the Italian it maps to — is made to match
// the new gloss on both sides; and if the expanded LEGO now duplicates an existing LEGO on both
// sides, it is introduced once and the other occurrences are marked not-new.
//
// The census (every non-component phrase in the course, 2026-09-28): for each of the 17 expanded
// LEGOs, phrases whose Italian contains the LEGO but whose English lacks its gloss. Hand-check:
//   - English is aligned to the gloss where the Italian already carries the whole LEGO ("penso che
//     tu le abbia lasciate" → "I think THAT you left them"; "mi sento come se fossi pronto" → "I feel
//     as if I WERE ready"; "sembra …" → "it seems …"). 58 phrases, in the touched seeds and in
//     seeds 118, 508 and 598.
//   - Seed 204: three phrases whose governing verb was speravo/pensavo are re-governed by volevo so
//     the chunk reads "her to help you" on both sides.
//   - Seed 185 U05 duplicated U04's Italian byte for byte; it becomes "… a casa ieri".
//   - LEFT ALONE, listed: seeds 600/606 say "if I'd known" for "se avessi saputo" — the same words
//     contracted, and two Englishes to one Italian is not a defect (Kai's standing rule); seeds 72,
//     129 and 139 carry "tu stia andando" under their own trigger LEGO and already read "that
//     you're doing"; S0603L02U02 "nessuno che ci aiutasse" and S0347L01U02 "qualcuno che sapesse"
//     are different constructions that merely share a verb form.
//   - "penso che" = "I think that" now exists at S0072L01 (not-new), S0261L01 (new) and S0636L01
//     (not-new) after seed 47 shrank to "penso": the first occurrence, S0072L01, becomes the one
//     introduction and S0261L01 is marked not-new. Likewise "spero" = "I hope" already lives at
//     S0291L01, so seed 668's shrunk S0668L02 is marked not-new.
//
// Seeds 116, 376, 403, 410, 478, 618, 642, 343, 519 and 208 belong to job #519·I and are not
// touched; no candidate fell in them.
//
// Dry run by default; --apply writes. Identity: serviceIdentity + recordContentEdit.
//   node tools/course-optimization/ita-stranded-subjunctive-gloss-pass-2026-09-28.cjs [--apply]

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
const { createClient } = require('@supabase/supabase-js');
const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
const { snapshotSeeds } = require('../../services/course-builder/lib/redo-snapshot.cjs');
const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
const { checkPhraseZUT } = require('../../services/course-builder/lib/validation.cjs');
const { normalizeForContainment, normalizeForStorage } = require('../../services/course-builder/lib/text-normalization.cjs');
const { decoratePhrasesWithDecomposition } = require('../../services/phrase-decomposition-writer.cjs');
const { evidencePath } = require('../lib/evidence-path.cjs');

const COURSE = 'ita_for_eng';
const SWEEP = 'ita-stranded-subjunctive-gloss-pass-2026-09-28';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const RULING = 'Kai, 2026-09-28 (job #520): every phrase in the course carrying an expanded LEGO matches its new gloss on both sides; a LEGO duplicated on both sides is introduced once';
const RESERVED = new Set([116, 376, 403, 410, 478, 618, 642, 343, 519, 208]);

const P = (id, fromK, fromT, toK, toT = fromT) => ({ id: `${COURSE}:${id}`, from: { known: fromK, target: fromT }, to: { known: toK, target: toT } });
const PHRASES = [
  // seed 114 — "come se stessi andando" = "as if I were doing"
  P('S0114L01U01', "I feel as if I'm doing it better now", 'mi sento come se stessi andando meglio adesso', 'I feel as if I were doing better now'),
  P('S0114L01U03', "I feel as if I'm doing well", 'mi sento come se stessi andando bene', 'I feel as if I were doing well'),
  P('S0114L01U04', 'I feel like I am doing better than before', 'mi sento come se stessi andando meglio di prima', 'I feel as if I were doing better than before'),
  P('S0114L01U05', 'it is as if I am doing much better now', 'è come se stessi andando molto meglio adesso', "it's as if I were doing much better now"),
  // seed 115 — "come se fossi pronto" = "as if I were ready"
  P('S0115L01B03', "I feel as if I'm ready", 'mi sento come se fossi pronto', 'I feel as if I were ready'),
  P('S0115L01U02', "I feel as if I'm ready to do it", 'mi sento come se fossi pronto a farlo', 'I feel as if I were ready to do it'),
  P('S0115L01U07', "I feel as if I'm ready to learn more", 'mi sento come se fossi pronto a imparare più', 'I feel as if I were ready to learn more'),
  P('S0115L01U09', 'I feel like I am ready to speak Italian better', 'mi sento come se fossi pronto a parlare italiano meglio', 'I feel as if I were ready to speak Italian better'),
  P('S0115L02U07', "I feel as if I'm ready to have a conversation now", 'mi sento come se fossi pronto a fare una conversazione adesso', 'I feel as if I were ready to have a conversation now'),
  P('S0115L02U08', "I don't feel as if I'm ready to have a conversation yet", 'non mi sento come se fossi pronto a fare una conversazione', "I don't feel as if I were ready to have a conversation"),
  P('S0118L02U02', 'I felt as if I was ready', 'mi sentivo come se fossi pronto', 'I felt as if I were ready'),
  // seed 119 / 281 — "prima che tu vada via" = "before you leave"
  P('S0281L04U02', 'I will see you before you go away', 'ti vedo prima che tu vada via', "I'll see you before you leave"),
  // seed 185 — "che tu le abbia lasciate" = "that you left them"
  P('S0185L01B03', 'I think you left them', 'penso che tu le abbia lasciate', 'I think that you left them'),
  P('S0185L01B04', 'I think you left them here', 'penso che tu le abbia lasciate qui', 'I think that you left them here'),
  P('S0185L01U01', 'I think you left them yesterday', 'penso che tu le abbia lasciate ieri', 'I think that you left them yesterday'),
  P('S0185L01U02', 'I think you left them at home', 'penso che tu le abbia lasciate a casa', 'I think that you left them at home'),
  P('S0185L01U03', "I don't think you left them here", 'non penso che tu le abbia lasciate qui', "I don't think that you left them here"),
  P('S0185L01U04', 'I think you left them at work', 'penso che tu le abbia lasciate al lavoro', 'I think that you left them at work'),
  P('S0185L01U05', 'I think you probably left them at work', 'penso che tu le abbia lasciate al lavoro', 'I think that you left them at home yesterday', 'penso che tu le abbia lasciate a casa ieri'),
  P('S0185L01U06', 'I think you left them in the office', 'penso che tu le abbia lasciate in ufficio', 'I think that you left them in the office'),
  P('S0185L01U07', 'I think you left them this morning', 'penso che tu le abbia lasciate stamattina', 'I think that you left them this morning'),
  P('S0185L01U08', 'do you think you left them somewhere?', 'pensi che tu le abbia lasciate da qualche parte?', 'do you think that you left them somewhere?'),
  // seed 204 — "che lei ti aiutasse" = "her to help you"
  P('S0204L02U02', 'I was hoping she would help you', 'speravo che lei ti aiutasse', 'I wanted her to help you yesterday', 'volevo che lei ti aiutasse ieri'),
  P('S0204L02U04', 'I thought she would help you learn', 'pensavo che lei ti aiutasse a imparare', 'I wanted her to help you to learn', 'volevo che lei ti aiutasse a imparare'),
  P('S0204L02U06', 'I was hoping she would help you to finish', 'speravo che lei ti aiutasse a finire', 'I wanted her to help you to finish', 'volevo che lei ti aiutasse a finire'),
  // seed 497 — "che tu abbia bisogno di" = "that you need to"; "sembra" = "it seems"
  P('S0497L02U02', 'I think you need to sleep right now', 'penso che tu abbia bisogno di dormire adesso', 'I think that you need to sleep now'),
  P('S0497L02U04', 'they think you need to learn more', 'pensano che tu abbia bisogno di imparare di più', 'they think that you need to learn more'),
  P('S0497L02U05', 'it seems you need to talk', 'sembra che tu abbia bisogno di parlare', 'it seems that you need to talk'),
  P('S0497L02U06', 'I think you need to sleep a bit', "penso che tu abbia bisogno di dormire un po'", 'I think that you need to sleep a bit'),
  P('S0497L02U07', 'they think you need to sleep now', 'pensano che tu abbia bisogno di dormire adesso', 'they think that you need to sleep now'),
  P('S0497L03B03', 'that sounds as though you need to sleep', 'sembra che tu abbia bisogno di dormire', 'it seems that you need to sleep'),
  P('S0497L03U01', 'that sounds as though you need to get some sleep', "sembra che tu abbia bisogno di dormire un po'", 'it seems that you need to sleep a bit'),
  P('S0497L03U02', "that sounds as though you're tired", 'sembra che tu sia stanco', "it seems that you're tired"),
  P('S0497L03U03', 'that sounds as though it could be important', 'sembra che possa essere importante', 'it seems that it could be important'),
  P('S0497L03U04', 'that sounds as though it was a problem', 'sembra che fosse un problema', 'it seems that it was a problem'),
  P('S0497L03U05', 'that sounds as though she wanted to leave', 'sembra che volesse andare via', 'it seems that she wanted to leave'),
  // seed 508 — "prima che tu" = "before you"
  P('S0508L01B02', "before you'll pay", 'prima che tu paghi', 'before you pay'),
  // seed 526 — "che tu non riesca a" = "that you can't manage to"
  P('S0526L03B02', "I'm finding it hard to believe you can't manage to guess", 'trovo difficile credere che tu non riesca a indovinare', "I'm finding it hard to believe that you can't manage to guess"),
  P('S0526L03B03', "I'm afraid you can't manage to finish", 'temo che tu non riesca a finire', "I'm afraid that you can't manage to finish"),
  P('S0526L03U04', "I'm finding it hard to believe you can't manage to check", 'trovo difficile credere che tu non riesca a controllare', "I'm finding it hard to believe that you can't manage to check"),
  P('S0526L03U05', "it's not possible for you to manage to do it", 'non è possibile che tu non riesca a farlo', "it's not possible that you can't manage to do it"),
  // seed 597 / 598 — "che ne abbia sentite" = "that he has heard them"
  P('S0597L03B02', 'I suspect he has heard them', 'sospetto che ne abbia sentite', 'I suspect that he has heard them'),
  P('S0597L03B03', 'I suspect he has heard many', 'sospetto che ne abbia sentite molte', 'I suspect that he has heard many of them'),
  P('S0597L03U01', 'do you think he has heard them?', 'pensi che ne abbia sentite?', 'do you think that he has heard them?'),
  P('S0597L03U02', 'I think she has heard enough', 'penso che ne abbia sentite abbastanza', 'I think that he has heard enough of them'),
  P('S0597L03U03', 'I suspect she has heard many stories', 'sospetto che ne abbia sentite molte storie', 'I suspect that he has heard many stories about it'),
  P('S0597L03U04', 'I suspect he has heard stories about this', 'sospetto che ne abbia sentite molte su questo', 'I suspect that he has heard many about this'),
  P('S0597L03U05', 'it seems she has heard many', 'sembra che ne abbia sentite molte', 'it seems that he has heard many of them'),
  P('S0597L04B02', 'I suspect he has heard a hundred', 'sospetto che ne abbia sentite cento', 'I suspect that he has heard a hundred of them'),
  P('S0597L04U01', 'I suspect he has heard a hundred stories', 'sospetto che ne abbia sentite cento storie', 'I suspect that he has heard a hundred stories about it'),
  P('S0598L01U01', "I suspect he's heard a thousand stories", 'sospetto che ne abbia sentite mille storie', 'I suspect that he has heard a thousand stories about it'),
  P('S0598L03U05', 'I think he has heard enough', 'penso che ne abbia sentite abbastanza', 'I think that he has heard enough of them'),
  // seed 655 — "che stia andando" = "that you're doing"
  // 655 is the formal register: the two phrases with no sir/madam collided with seed 72's informal "penso che tu stia andando bene", so they take the marker (formality is carried by words — Kai)
  P('S0655L01B03', "I think you're doing well", 'penso che stia andando bene', "I think that you're doing well, madam", 'penso che stia andando bene, signora'),
  P('S0655L01U01', "I think you're doing very well madam", 'penso che stia andando molto bene, signora', "I think that you're doing very well, madam"),
  P('S0655L01U02', "I think you're doing well sir", 'penso che stia andando bene, signore', "I think that you're doing well, sir"),
  P('S0655L01U03', "I think you're doing very well", 'penso che stia andando molto bene', "I think that you're doing very well, sir", 'penso che stia andando molto bene, signore'),
  P('S0655L01U05', "I think you're doing well today madam", 'penso che stia andando bene oggi, signora', "I think that you're doing well today, madam"),
  // seed 668 — "che possiate andare tutti" = "that you'll all be able to go"
  P('S0668L01B03', "yes, I think you'll all be able to go", 'sì, penso che possiate andare tutti', "yes, I think that you'll all be able to go"),
  P('S0668L01U01', "I believe you'll all be able to go soon", 'credo che possiate andare tutti presto', "I believe that you'll all be able to go soon"),
  P('S0668L01U04', "I think you'll all be able to go", 'penso che possiate andare tutti', "I think that you'll all be able to go"),
  P('S0668L01B04', 'I believe you can all go', 'credo che possiate andare tutti', "I believe that you'll all be able to go"),
  P('S0668L01U06', 'I think you can all go now', 'penso che possiate andare tutti adesso', "I think that you'll all be able to go now"),
  P('S0668L01U07', 'I believe you can all go today', 'credo che possiate andare tutti oggi', "I believe that you'll all be able to go today"),
  P('S0668L01U08', 'I think you can all go later on', 'penso che possiate andare tutti più tardi', "I think that you'll all be able to go later on"),
];
/** "penso che" = "I think that" is introduced once, at its first occurrence. */
const IS_NEW = [
  { legoId: 'S0072L01', from: false, to: true, known: 'I think that', target: 'penso che' },
  { legoId: 'S0261L01', from: true, to: false, known: 'I think that', target: 'penso che' },
  // "spero" = "I hope" already exists at S0291L01: seed 668's shrunk LEGO is the second occurrence
  { legoId: 'S0668L02', from: true, to: false, known: 'I hope', target: 'spero' },
];
/** Seen, deliberately left alone. */
const LEFT_ALONE = [
  'S0600L01U01, S0600L02U02, S0606L01B01–U05, S0606L02B02, S0606L03U01: "if I\'d known" for "se avessi saputo" — contraction of the same gloss; two Englishes → one Italian is not a defect',
  'S0072L02*, S0129L01*: "tu stia andando" under its own trigger LEGO, English already reads "that you\'re doing"',
  'S0139L01U03, S0139L01U07: "stia andando via" = leaving, a different verb',
  'S0603L02U02 "nessuno che ci aiutasse", S0347L01U02 "qualcuno che sapesse": different constructions sharing a verb form',
  'S0598L01U01 also does not contain its own LEGO S0598L03 "ne ha sentite" (indicative) — pre-existing, reported',
];

const nk = (s) => (s || '').toLowerCase().trim().replace(/[.,!?;:]+$/, '').replace(/[’‘]/g, "'");
const nt = (s) => normalizeForContainment((s || '').replace(/[’‘]/g, "'"));
const words = (s) => normalizeForStorage((s || '').replace(/[’‘]/g, "'"), false).split(' ').filter(Boolean);
const seedOf = (id) => parseInt(/S(\d{4})L/.exec(id)[1], 10);
function supa() { return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } }); }
const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data; };
async function readAll(sb, table, cols) {
  const PAGE = 1000; let all = [], from = 0;
  for (;;) { const d = must(await sb.from(table).select(cols).eq('course_code', COURSE).range(from, from + PAGE - 1), table); all = all.concat(d); if (d.length < PAGE) break; from += PAGE; }
  return all;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const sb = supa();
  console.log(`\n══════ ${COURSE}: course-wide gloss pass — ${PHRASES.length} phrases, ${IS_NEW.length} is_new flips ══════`);
  const seeds = await readAll(sb, 'course_seeds', 'seed_number, target_text');
  const legos = await readAll(sb, 'course_legos', 'id, lego_id, seed_number, lego_index, is_new, known_text, target_text, components');
  const phrases = await readAll(sb, 'course_practice_phrases', 'id, seed_number, lego_index, phrase_role, known_text, target_text');
  const byId = new Map(phrases.map(p => [p.id, p]));

  const problems = [];
  for (const u of PHRASES) {
    const p = byId.get(u.id);
    if (!p) { problems.push(`${u.id} missing`); continue; }
    if (RESERVED.has(p.seed_number)) problems.push(`${u.id} is in reserved seed ${p.seed_number}`);
    if (nk(p.known_text) !== nk(u.from.known) || nk(p.target_text) !== nk(u.from.target)) problems.push(`${u.id} is "${p.known_text}" / "${p.target_text}", expected "${u.from.known}" / "${u.from.target}"`);
  }
  for (const f of IS_NEW) {
    const l = legos.find(x => x.lego_id === f.legoId);
    if (!l) { problems.push(`${f.legoId} missing`); continue; }
    if (l.is_new !== f.from || nk(l.known_text) !== nk(f.known) || nk(l.target_text) !== nk(f.target)) problems.push(`${f.legoId} is is_new=${l.is_new} "${l.known_text}" / "${l.target_text}", expected is_new=${f.from} "${f.known}" / "${f.target}"`);
  }
  for (const p of problems) console.error(`BLOCKED  ${p}`);
  if (problems.length) { console.error('\nBLOCKED — live state differs. Nothing written.'); process.exit(1); }
  console.log('guard: live state is exactly what this tool was written against');

  // Checks on the changed rows: phrase still contains its LEGO; no untaught word; phrase gate on new pairs.
  const findings = [];
  const taughtBy = (N) => { const s = new Set(); for (const x of seeds) if (x.seed_number <= N) words(x.target_text).forEach(w => s.add(w)); for (const l of legos) if (l.seed_number <= N) { words(l.target_text).forEach(w => s.add(w)); for (const c of (l.components || [])) words(c.target).forEach(w => s.add(w)); } return s; };
  for (const u of PHRASES) {
    const p = byId.get(u.id);
    const lego = legos.find(l => l.seed_number === p.seed_number && l.lego_index === p.lego_index);
    if (lego && !(' ' + nt(u.to.target) + ' ').includes(' ' + nt(lego.target_text) + ' ')) {
      const before = (' ' + nt(p.target_text) + ' ').includes(' ' + nt(lego.target_text) + ' ');
      (before ? findings : []).push(`${u.id} "${u.to.target}" would stop containing its LEGO "${lego.target_text}"`);
      if (!before) console.log(`  pre-existing: ${u.id} does not contain its LEGO "${lego.target_text}" (unchanged by this pass)`);
    }
    if (u.to.target !== u.from.target) { const un = words(u.to.target).filter(w => !taughtBy(p.seed_number).has(w)); if (un.length) findings.push(`${u.id} "${u.to.target}" uses untaught word(s): ${un.join(', ')}`); }
  }
  const replaced = new Set(PHRASES.map(u => nt(u.from.target)));
  const bySeed = new Map();
  for (const u of PHRASES) { const N = seedOf(u.id); if (!bySeed.has(N)) bySeed.set(N, []); bySeed.get(N).push({ known: u.to.known, target: u.to.target }); }
  for (const [N, pairs] of bySeed) {
    const hits = (await checkPhraseZUT(sb, COURSE, pairs, N)).filter(h => !replaced.has(nt(h.existing_target)));
    for (const h of hits) findings.push(`seed ${N} "${h.known}" → "${h.new_target}": phrase gate — seed ${h.existing_seed} already says "${h.existing_target}"`);
  }
  // No same-both-sides duplicate LEGO may remain doubly introduced.
  const introduced = new Map();
  for (const l of legos) { const isNew = IS_NEW.find(f => f.legoId === l.lego_id)?.to ?? l.is_new; if (!isNew) continue; const k = nk(l.known_text) + '|' + nt(l.target_text); if (!introduced.has(k)) introduced.set(k, []); introduced.get(k).push(l.lego_id); }
  for (const [k, ids] of introduced) if (ids.length > 1 && ids.some(id => /^S0(047|261|114|115|119|151|152|185|204|281|292|346|419|497|506|526|597|655|668|072)L/.test(id))) findings.push(`LEGO introduced twice on both sides: ${k} at ${ids.join(', ')}`);
  for (const f of findings) console.error(`  CONTENT  ${f}`);
  if (findings.length) { console.error(`\nBLOCKED — ${findings.length} finding(s). Nothing written.`); process.exit(1); }
  console.log('checks: clean (containment, untaught words, phrase gate, single introduction)\n');

  for (const u of PHRASES) console.log(`  ${u.id}  "${u.from.known}"${u.to.target !== u.from.target ? ` / "${u.from.target}"` : ''}  →  "${u.to.known}"${u.to.target !== u.from.target ? ` / "${u.to.target}"` : ''}`);
  for (const f of IS_NEW) console.log(`  ${f.legoId}  is_new ${f.from} → ${f.to}`);
  const seedNumbers = [...new Set([...PHRASES.map(u => seedOf(u.id)), ...IS_NEW.map(f => seedOf(f.legoId))])].sort((a, b) => a - b);
  console.log(`\nseeds touched: ${seedNumbers.join(', ')}`);
  console.log('left alone:'); for (const s of LEFT_ALONE) console.log(`  - ${s}`);

  const out = { sweep: SWEEP, apply, at: new Date().toISOString(), ruling: RULING, phrases: PHRASES, is_new: IS_NEW, left_alone: LEFT_ALONE, seeds: seedNumbers, events: [] };
  if (!apply) { const ev = evidencePath(`tools/course-optimization/${SWEEP}-dryrun.json`); fs.writeFileSync(ev, JSON.stringify(out, null, 1)); console.log(`\nDRY RUN — nothing written. evidence: ${ev}`); return; }

  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const snap = await snapshotSeeds(sb, COURSE, seedNumbers, { reason: 'gloss-pass', notes: `${RULING}. Sweep ${SWEEP}.` });
  const eventId = await recordContentEdit(sb, { identity, courseCode: COURSE, surface: SURFACE, operation: 'align-phrase-gloss-to-expanded-lego', scope: { seed_numbers: seedNumbers, phrase_ids: PHRASES.map(u => u.id), lego_ids: IS_NEW.map(f => f.legoId), rows: PHRASES.length + IS_NEW.length + seedNumbers.length }, detail: { ruling: RULING, snapshot_batch: snap.batchId, phrases: PHRASES.map(u => ({ id: u.id, from: u.from, to: u.to })), is_new: IS_NEW } });
  out.events.push(eventId); out.snapshot = snap.batchId;
  console.log(`\nedit event ${eventId}; snapshot batch ${snap.batchId}`);
  for (const u of PHRASES) must(await sb.from('course_practice_phrases').update({ known_text: u.to.known, target_text: u.to.target, word_count: u.to.target.length, lego_count: words(u.to.target).length, qa_checked: null, decomposition: null, display_tiling: null, last_edit_event_id: eventId }).eq('course_code', COURSE).eq('id', u.id), u.id);
  for (const f of IS_NEW) must(await sb.from('course_legos').update({ is_new: f.to, last_edit_event_id: eventId }).eq('course_code', COURSE).eq('lego_id', f.legoId), f.legoId);
  must(await sb.from('course_seeds').update({ approved_at: null, last_edit_event_id: eventId }).eq('course_code', COURSE).in('seed_number', seedNumbers), 'seeds');
  // A LEGO that is no longer new needs no introduction: drop its pending (unrendered) intro placeholder, if any.
  for (const f of IS_NEW.filter(f => !f.to)) { const d = must(await sb.from('course_audio').delete().eq('course_code', COURSE).eq('role', 'presentation').eq('lego_id', f.legoId).like('s3_key', 'pending/%').select('id'), `pending intro ${f.legoId}`); if (d.length) console.log(`${f.legoId}: ${d.length} pending intro placeholder(s) dropped (not-new LEGOs are not introduced)`); }
  console.log(`${PHRASES.length} phrases rewritten, ${IS_NEW.length} is_new flags flipped, seeds ${seedNumbers.join(', ')} unapproved`);
  try { const rows = must(await sb.from('course_practice_phrases').select('*').eq('course_code', COURSE).in('id', PHRASES.map(u => u.id)), 'rows'); await decoratePhrasesWithDecomposition(sb, rows); console.log(`decompositions refreshed for ${rows.length} rows`); } catch (e) { console.warn(`decomposition refresh skipped: ${e.message}`); }
  await refreshNow(); console.log('course_round_index refreshed');
  const ev = evidencePath(`tools/course-optimization/${SWEEP}.json`); fs.writeFileSync(ev, JSON.stringify(out, null, 1)); console.log(`evidence: ${ev}`);
}

module.exports = { PHRASES, IS_NEW, LEFT_ALONE };
if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
