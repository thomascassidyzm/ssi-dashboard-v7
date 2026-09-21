#!/usr/bin/env node
/**
 * DRY RUN of Kai's deu_for_eng separable-verb ruling (2026-09-21) over the
 * live course. READ-ONLY: SELECTs seeds, LEGOs and phrases; writes a markdown
 * report to the evidence tree; calls no model, no TTS, changes no row.
 *
 * Two parts, both judged by the OLD gate and the NEW gate side by side:
 *   A. Every LIVE BUILD/USE phrase under a LEGO that carries a separable verb
 *      (plus every LEGO of the taught seed): which verdicts flip.
 *   B. A FIXTURE of hand-written candidate phrases, German with English, at the
 *      seed positions the ruling names — what a builder could now write that the
 *      old gate discarded, and what stays refused. Vocabulary is judged against
 *      the live vocab set at that seed, so a "vocab" refusal here is real.
 *
 *   node tools/phrase-gate/separable-dry-run.cjs [courseCode] [--out <path.md>]
 */
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const { supabase } = require('../../services/supabase-client.cjs');
const { checkWordContainment, extractVocab } = require('../../services/course-builder/lib/text-normalization.cjs');
const { checkVocabViolations } = require('../../services/course-builder/lib/validation.cjs');
const SV = require('../../services/course-builder/lib/separable-verbs.cjs');
const { loadTranslationVocab, loadSameSeedSiblingVocab } = require('./gate-check.cjs');

const argv = process.argv.slice(2);
const courseCode = argv.find(a => !a.startsWith('--')) || 'deu_for_eng';
const outIdx = argv.indexOf('--out');
let outPath = outIdx >= 0 ? argv[outIdx + 1] : null;
if (!outPath) {
  const { evidencePath } = require('../lib/evidence-path.cjs');
  outPath = evidencePath(`tools/phrase-gate/separable-dry-run-${courseCode}-${new Date().toISOString().slice(0, 10)}.md`);
}

/** Candidate phrases at named positions. `lego` is the LIVE LEGO target at that seed. */
const FIXTURE = [
  { seed: 16, lego: 'zurückkommen', target: 'er kommt später zurück', known: 'he comes back later' },
  { seed: 16, lego: 'zurückkommen', target: 'er will später zurückkommen', known: 'he wants to come back later' },
  { seed: 42, lego: 'fing an', target: 'ich fing an, mich besser zu fühlen', known: 'I was starting to feel better' },
  { seed: 42, lego: 'fing an', target: 'ich will anfangen, mich besser zu fühlen', known: 'I want to start to feel better' },
  { seed: 67, lego: 'aufhören', target: 'ich höre jetzt auf', known: 'I stop now' },
  { seed: 67, lego: 'aufhören', target: 'ich will jetzt aufhören', known: 'I want to stop now' },
  { seed: 83, lego: 'ich stimme dem zu', target: 'ich stimme dem zu', known: 'I agree with that' },
  { seed: 83, lego: 'ich stimme dem zu', target: 'ich stimme dem nicht zu', known: "I don't agree with that" },
  { seed: 83, lego: 'ich stimme dem zu', target: 'ich stimme dem zu, was du gesagt hast', known: 'I agree with what you said' },
  { seed: 83, lego: 'ich stimme dem zu', target: 'ich will dem zustimmen', known: 'I want to agree with that' },
  { seed: 83, lego: 'ich stimme dem zu', target: 'ich will dem nicht zustimmen, was du gesagt hast', known: "I don't want to agree with what you said" },
  // The ruling's shape for the seed-83 LEGO (clause 3): JOINED. Not in the DB — a proposal, judged with the live vocab plus that one LEGO.
  { seed: 83, lego: 'zustimmen', proposed: true, target: 'ich stimme zu', known: 'I agree' },
  { seed: 83, lego: 'zustimmen', proposed: true, target: 'ich stimme nicht zu', known: "I don't agree" },
  { seed: 83, lego: 'zustimmen', proposed: true, target: 'ich stimme dem zu, was du gesagt hast', known: 'I agree with what you said' },
  { seed: 83, lego: 'zustimmen', proposed: true, target: 'ich will zustimmen', known: 'I want to agree' },
  { seed: 83, lego: 'zustimmen', proposed: true, target: 'ich will nicht zustimmen', known: "I don't want to agree" },
  { seed: 83, lego: 'zustimmen', proposed: true, target: 'ich möchte nicht zustimmen, was du gesagt hast', known: "I don't want to agree with what you said" },
  { seed: 83, lego: 'zustimmen', proposed: true, target: 'stimmst du zu?', known: 'do you agree?' },
  { seed: 84, lego: 'er gesagt hat', target: 'ich will dem nicht zustimmen, was er gesagt hat', known: "I don't want to agree with what he said" },
  { seed: 84, lego: 'er gesagt hat', target: 'ich stimme dem nicht zu, was er gesagt hat', known: "I don't agree with what he said" },
  { seed: 122, lego: 'es fängt an', target: 'es fängt an, sich leichter anzufühlen', known: "it's starting to feel easier" },
  { seed: 122, lego: 'es fängt an', target: 'es will anfangen, sich leichter anzufühlen', known: "it wants to start to feel easier" },
  { seed: 133, lego: 'man lernt kennen', target: 'man lernt jemanden gut kennen', known: 'you get to know someone well' },
  { seed: 133, lego: 'man lernt kennen', target: 'man will jemanden gut kennenlernen', known: 'you want to get to know someone well' },
  { seed: 294, lego: 'dich anzurufen', target: 'ich habe nicht genug Zeit, dich anzurufen', known: "I don't have enough time to call you" },
  { seed: 294, lego: 'dich anzurufen', target: 'wir rufen dich heute Abend an', known: 'we call you tonight' },
  { seed: 316, lego: 'mitbringen', target: 'sie könnte ihren Bruder mitbringen', known: 'she could bring her brother' },
  { seed: 316, lego: 'mitbringen', target: 'sie bringt am Montag ihren Bruder mit', known: 'she brings her brother on Monday' },
  { seed: 384, lego: 'dem zustimmen', target: 'ich stimme dem zu', known: 'I agree with that' },
  { seed: 384, lego: 'dem zustimmen', target: 'kannst du dem zustimmen?', known: 'can you agree with that?' },
  { seed: 395, lego: 'abbiegen', target: 'wir müssen an der nächsten Ecke links abbiegen', known: 'we need to turn left at the next corner' },
  { seed: 395, lego: 'abbiegen', target: 'wir biegen an der nächsten Ecke links ab', known: 'we turn left at the next corner' },
  { seed: 524, lego: 'rufe zurück', target: 'ich rufe dich in ein paar Minuten zurück', known: "I'll call you back in a few minutes" },
  { seed: 524, lego: 'rufe zurück', target: 'ich will dich in ein paar Minuten zurückrufen', known: 'I want to call you back in a few minutes' },
  { seed: 524, lego: 'rufe zurück', target: 'ich rufe dich morgen an', known: "I'll call you tomorrow" },
  { seed: 562, lego: 'ankommen', target: 'ich will nur sicher ankommen', known: 'I just want to get there safely' },
  { seed: 562, lego: 'ankommen', target: 'wir kommen sicher an', known: 'we get there safely' },
  { seed: 595, lego: 'hinlegen', target: 'ich muss mich im Garten hinlegen', known: 'I need to lie down in the garden' },
  { seed: 595, lego: 'hinlegen', target: 'ich lege mich im Garten hin', known: 'I lie down in the garden' },
  { seed: 595, lego: 'hinlegen', target: 'wir legen uns im Garten hin', known: 'we lie down in the garden' },
];

async function pageAll(table, select, filters) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    let q = supabase.from(table).select(select).eq('course_code', courseCode).range(from, from + 999);
    for (const f of filters || []) q = q[f[0]](...f.slice(1));
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) break;
  }
  return rows;
}

const vocabCache = new Map();
async function vocabAt(seedNumber, legoTarget) {
  const key = `${seedNumber}|${legoTarget}`;
  if (vocabCache.has(key)) return vocabCache.get(key);
  let base = vocabCache.get(seedNumber);
  if (!base) {
    base = await loadTranslationVocab(supabase, courseCode, seedNumber);
    (await loadSameSeedSiblingVocab(supabase, courseCode, seedNumber, false)).forEach(w => base.add(w));
    vocabCache.set(seedNumber, base);
  }
  const v = new Set(base);
  extractVocab(legoTarget, false).forEach(w => v.add(w));
  vocabCache.set(key, v);
  return v;
}

function verdicts(seedNumber, legoTarget, phrase, vocab, seedTarget) {
  const oldContain = checkWordContainment(legoTarget, phrase.target);
  const oldVocab = checkVocabViolations([phrase], vocab, courseCode).length === 0;
  const nc = SV.checkSeparableContainment({ courseCode, seedNumber, legoTarget, phraseTarget: phrase.target });
  const newVocabV = checkVocabViolations([phrase], vocab, courseCode, { seedNumber, extraTexts: seedTarget ? [seedTarget] : [] });
  const newVocab = newVocabV.length === 0;
  const shape = SV.separableVerbsIn(phrase.target).map(v => `${v.lemma}:${v.realisation}`).join(', ') || '—';
  const oldPass = oldContain && oldVocab;
  const newPass = nc.pass && newVocab;
  const why = [];
  if (!nc.pass) why.push(`containment: ${nc.reason || 'LEGO not contained'}`);
  if (!newVocab) why.push(`vocab: "${newVocabV[0].unknown}" not yet heard`);
  return { oldPass, newPass, oldContain, oldVocab, newContain: nc.pass, newVocab, shape, why: why.join('; ') };
}

async function main() {
  const seeds = await pageAll('course_seeds', 'seed_number,target_text,known_text', [['order', 'seed_number']]);
  const seedBy = new Map(seeds.map(s => [s.seed_number, s]));
  const legos = await pageAll('course_legos', 'seed_number,lego_index,lego_id,type,target_text,known_text', [['order', 'seed_number'], ['order', 'lego_index']]);
  const phrases = await pageAll('course_practice_phrases', 'seed_number,lego_index,phrase_role,known_text,target_text', [['in', 'phrase_role', ['build', 'use']], ['order', 'seed_number'], ['order', 'lego_index']]);
  const byLego = new Map();
  for (const p of phrases) { const k = `${p.seed_number}:${p.lego_index}`; if (!byLego.has(k)) byLego.set(k, []); byLego.get(k).push(p); }

  const L = [];
  L.push(`# Dry run: German separable verbs under Kai's ruling — ${courseCode}`);
  L.push('');
  L.push(`Live Supabase, read ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC. ${seeds.length} seeds, ${legos.length} LEGO rows, ${phrases.length} BUILD/USE phrases. Read-only: nothing was generated, written or rendered.`);
  L.push('');
  L.push('Calibration: seed 524 reads SPLIT (rufe … zurück), seed 16 reads JOINED (zurückkommen). Both are asserted in `services/course-builder/lib/separable-verbs.test.cjs`.');
  L.push('');

  // ── Census
  const sepLegos = legos.filter(l => SV.separableVerbsIn(l.target_text).length);
  const splitLegos = sepLegos.filter(l => SV.separableVerbsIn(l.target_text).some(v => v.realisation === 'split'));
  L.push('## Lexicon coverage');
  L.push('');
  L.push(`${SV.VERBS.length} separable verbs in the lexicon. LEGO rows carrying one: ${sepLegos.length} (${sepLegos.length - splitLegos.length} joined, ${splitLegos.length} split). Split LEGOs: ${splitLegos.map(l => `${l.lego_id} "${l.target_text}"`).join('; ')}.`);
  const shapeFindings = legos.map(l => SV.checkSeparableLegoShape(courseCode, l.seed_number, l.target_text)).filter(Boolean);
  L.push('');
  L.push(`Clause 8 (introduce joined) findings on the live LEGOs, reported not gated: ${shapeFindings.length} split-shaped LEGO(s) outside seed 42 — ${shapeFindings.map(f => `seed ${f.seedNumber} "${f.legoTarget}"`).join(', ')}. These pre-date the ruling; changing a LEGO is a content edit with course-wide blast radius and is NOT done here.`);
  L.push('');

  // ── Part A: live phrases
  const taughtLegos = legos.filter(l => l.seed_number === SV.TAUGHT_SEED || l.seed_number === SV.TAUGHT_SEED + 1);
  const scope = [...new Map([...sepLegos, ...taughtLegos].map(l => [l.lego_id, l])).values()].sort((a, b) => a.seed_number - b.seed_number || a.lego_index - b.lego_index);
  let same = 0, nowAdmit = [], nowReject = [], checked = 0;
  const contrast = [];
  for (const l of scope) {
    const ph = byLego.get(`${l.seed_number}:${l.lego_index}`) || [];
    const vocab = await vocabAt(l.seed_number, l.target_text);
    for (const p of ph) {
      checked++;
      const v = verdicts(l.seed_number, l.target_text, { target: p.target_text, known: p.known_text }, vocab, seedBy.get(l.seed_number)?.target_text);
      const row = { lego: l, p, v };
      if (v.oldPass === v.newPass) same++;
      else if (v.newPass) nowAdmit.push(row);
      else nowReject.push(row);
    }
    const c = SV.checkSeparableContrast(courseCode, l.seed_number, l.target_text, ph.map(p => ({ target: p.target_text })));
    if (c.checked) contrast.push({ l, c });
  }
  L.push('## A. Live phrases, old gate vs new gate');
  L.push('');
  L.push(`${checked} live BUILD/USE phrases under ${scope.length} LEGOs (every LEGO carrying a separable verb, plus every LEGO of seeds ${SV.TAUGHT_SEED} and ${SV.TAUGHT_SEED + 1}).`);
  L.push('');
  L.push('| verdict | phrases |');
  L.push('|---|---|');
  L.push(`| unchanged | ${same} |`);
  L.push(`| now ADMITTED, was refused | ${nowAdmit.length} |`);
  L.push(`| now REFUSED, was admitted | ${nowReject.length} |`);
  L.push('');
  const fmtRow = ({ lego, p, v }) => `- seed ${lego.seed_number} L${lego.lego_index} "${lego.target_text}" — ${p.phrase_role.toUpperCase()}: **${p.target_text}** / ${p.known_text} — shape ${v.shape}${v.why ? ` — ${v.why}` : ''}`;
  if (nowAdmit.length) { L.push('Now admitted:'); L.push(''); nowAdmit.slice(0, 40).forEach(r => L.push(fmtRow(r))); L.push(''); }
  if (nowReject.length) { L.push('Now refused:'); L.push(''); nowReject.slice(0, 40).forEach(r => L.push(fmtRow(r))); L.push(''); }
  if (!nowAdmit.length && !nowReject.length) { L.push('No live phrase changes verdict: every live phrase carries its LEGO in the LEGO\'s own shape, which every mode of the rule admits. The split forms the ruling wants do not exist in the live baskets yet — that is the point of the ruling.'); L.push(''); }
  L.push(`Clause 4 contrast floor at seed ${SV.TAUGHT_SEED} on the live basket: ${contrast.map(({ l, c }) => `L${l.lego_index} "${l.target_text}": ${c.split} split / ${c.joined} joined → ${c.pass ? 'PASS' : `FAIL (needs ${c.required} of each)`}`).join('; ') || 'no LEGO at the taught seed carries the verb'}.`);
  L.push('');

  // ── Part B: fixture
  L.push('## B. Candidate phrases at the named positions');
  L.push('');
  L.push('Hand-written candidates, not generated content. Each judged against the live vocabulary at its seed. "was → now" is the whole-gate verdict (containment AND vocabulary).');
  L.push('');
  L.push('A LEGO marked *proposed* is the ruling\'s joined shape for seed 83, which is not in the database today; those rows show what that shape would admit.');
  L.push('');
  L.push('| seed | LEGO | candidate (German) | English | shape | was | now | why (if refused now) |');
  L.push('|---|---|---|---|---|---|---|---|');
  let bAdmit = 0, bReject = 0, bFlipUp = 0, bFlipDown = 0;
  for (const f of FIXTURE) {
    const vocab = await vocabAt(f.seed, f.lego);
    const v = verdicts(f.seed, f.lego, { target: f.target, known: f.known }, vocab, seedBy.get(f.seed)?.target_text);
    if (v.newPass) bAdmit++; else bReject++;
    if (!v.oldPass && v.newPass) bFlipUp++;
    if (v.oldPass && !v.newPass) bFlipDown++;
    L.push(`| ${f.seed} | ${f.lego}${f.proposed ? ' *(proposed)*' : ''} | **${f.target}** | ${f.known} | ${v.shape} | ${v.oldPass ? 'admit' : 'refuse'} | ${v.newPass ? 'admit' : 'refuse'} | ${v.newPass ? '' : v.why} |`);
  }
  L.push('');
  L.push(`${FIXTURE.length} candidates: ${bAdmit} admitted, ${bReject} refused under the new gate; ${bFlipUp} newly admitted, ${bFlipDown} newly refused relative to the old gate.`);
  L.push('');

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, L.join('\n'));
  process.stdout.write(L.join('\n') + '\n');
  console.error(`\nwritten: ${outPath}`);
}

main().catch(e => { console.error(e.stack || e.message); process.exit(1); });
