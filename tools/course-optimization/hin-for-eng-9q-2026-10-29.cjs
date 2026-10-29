#!/usr/bin/env node
'use strict';
// tools/course-optimization/hin-for-eng-9q-2026-10-29.cjs — job #515·AA, hin_for_eng, Kai 29 Oct 2026.
//
// Applies Kai's YES to the nine questions of report d/6c3c6f34 (job #356·Q, 14 Oct), decided from Shuchita's rulings
// (the rulebook: eng-for-hin-shuchita-rulebook.cjs) where she has one, else from the report's own recommendation.
// This tool talks to Popty over HTTP ONLY — it reads GET /api/production/hin_for_eng/seeds and writes through
// POST /edit-batch (dry run unless APPLY=1). It never touches the database and never renders audio.
//
//   node tools/course-optimization/hin-for-eng-9q-2026-10-29.cjs plan            # per-question census of what is still open
//   node tools/course-optimization/hin-for-eng-9q-2026-10-29.cjs check           # exit 1 while any question's edit is still open (the proof)
//   [APPLY=1] node …/hin-for-eng-9q-2026-10-29.cjs run q3|q5|q6|q1 [--from-file seeds.json]
//   [APPLY=1] node …/hin-for-eng-9q-2026-10-29.cjs genders [--expansions live-expansions.json]   # keep course_gender_expansions in step
//
// THE DECISIONS (each rests on a rule or is marked "no Shuchita precedent"):
//   Q1 nukta        YES — H-NUKTA (her seed-99 "whole grid", seeds 11-21; #900 applied it to 459 rows). Her NUKTA_PAIRS plus
//                   माफ, गलत, ख़ुद (seed 99's own after-text has ख़ुद; माफ/गलत are the report's own list).
//   Q3 177/645      YES — her Hindi is written in the masculine speaker's form throughout (H-SUBJECT-PRONOUN: seeds 2 and 9,
//                   कर रहा हूँ / बोलता हूँ); the female reading lives in course_gender_expansions.
//   Q5 not-sure     यक़ीन — H-NOT-SURE (seeds 11-21, 62): "I'm not sure" is मुझे यक़ीन नहीं है, never पक्का. Overrides P28's
//                   "earlier taught" for this one cluster, as the report itself says it would.
//   Q5 the rest     P28 (earlier-taught form) outside the later LEGO's own basket; no Shuchita precedent, except practise:
//                   J-REGISTER prefers the everyday प्रैक्टिस, which is also the earlier one.
//   Q6 seed 207     YES — no Shuchita precedent; report's example LEGO "what you needed to do | जो करना था".
//   Q2, Q7, Q8, Q9  no edit (leave / leave / hand to #349·Q / raise with Tom); Q4 deferred (its own pass, structural).
const fs = require('fs');
const path = require('path');

const COURSE = 'hin_for_eng';
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '');
const AGENT = 'hin-for-eng-9q-2026-10-29 (job #515)';
const NUKTA = '़';
const APPLY = process.env.APPLY === '1';

// ── Q1: the nukta ───────────────────────────────────────────────────────────────────────────────────────────────
const { NUKTA_PAIRS } = require('./eng-for-hin-shuchita-rulebook.cjs');
const EXTRA_PAIRS = [['माफ', 'माफ़'], ['गलत', 'ग़लत'], ['खुद', 'ख़ुद']];
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Her whole-grid spelling. Idempotent: an already-dotted word is never touched twice. */
function dot(text) {
  if (typeof text !== 'string') return text;
  let t = text;
  for (const [plain, dotted] of [...NUKTA_PAIRS, ...EXTRA_PAIRS]) {
    t = t.replace(new RegExp(esc(plain), 'g'), (m, off, str) => (str.startsWith(dotted, off) || str[off + plain.length] === NUKTA ? m : dotted));
  }
  return t;
}

// ── helpers over the live content ───────────────────────────────────────────────────────────────────────────────
async function loadLive(fromFile) {
  const body = fromFile ? JSON.parse(fs.readFileSync(fromFile, 'utf8')) : await (await fetch(`${POPTY}/api/production/${COURSE}/seeds`, { signal: AbortSignal.timeout(120000) })).json();
  const seeds = body.seeds; const legos = []; const phrases = [];
  for (const s of seeds) for (const l of s.legos || []) { legos.push(l); for (const p of l.basket_phrases || []) phrases.push({ ...p, seed_number: s.seed_number, lego_id: l.lego_id }); }
  return { seeds, legos, phrases, seedBy: new Map(seeds.map((s) => [s.seed_number, s])), legoBy: new Map(legos.map((l) => [l.lego_id, l])) };
}
const iso = (v) => (v ? new Date(v).toISOString() : null);

/** Collects row edits; turns them into ops with a before-state assertion, and unapproves every seed it touches. */
class Plan {
  constructor(live, label) { this.live = live; this.label = label; this.ops = []; this.rows = []; this.touchedSeeds = new Set(); this.seen = new Set(); }
  seed(n, set, why) {
    const s = this.live.seedBy.get(n); const key = `seed:${n}`;
    const changed = Object.fromEntries(Object.entries(set).filter(([k, v]) => JSON.stringify(s[k]) !== JSON.stringify(v)));
    if (!Object.keys(changed).length) return;
    this.ops.push({ op: 'seed.update', seed_number: n, set: changed, expect: Object.fromEntries(Object.keys(changed).map((k) => [k, s[k]])) });
    this.rows.push({ kind: 'seed', id: `S${String(n).padStart(4, '0')}`, seed: n, why, before: s.target_text, after: changed.target_text ?? s.target_text, beforeKnown: s.known_text, afterKnown: changed.known_text ?? s.known_text });
    this.touchedSeeds.add(n); this.seen.add(key);
  }
  lego(l, set, why) {
    const changed = Object.fromEntries(Object.entries(set).filter(([k, v]) => JSON.stringify(l[k]) !== JSON.stringify(v)));
    if (!Object.keys(changed).length) return;
    this.ops.push({ op: 'lego.update', lego_id: l.lego_id, set: changed, expect: Object.fromEntries(Object.keys(changed).map((k) => [k, l[k]])) });
    this.rows.push({ kind: 'lego', id: l.lego_id, seed: l.seed_number, why, before: l.target_text, after: changed.target_text ?? l.target_text, beforeKnown: l.known_text, afterKnown: changed.known_text ?? l.known_text, wasPresentation: l.presentation_audio_id });
    this.touchedSeeds.add(l.seed_number);
  }
  phrase(p, set, why) {
    const changed = Object.fromEntries(Object.entries(set).filter(([k, v]) => JSON.stringify(p[k]) !== JSON.stringify(v)));
    if (!Object.keys(changed).length) return;
    this.ops.push({ op: 'phrase.update', phrase_id: p.id, set: changed, expect: Object.fromEntries(Object.keys(changed).map((k) => [k, p[k]])) });
    this.rows.push({ kind: p.phrase_role, id: p.id.split(':')[1], seed: p.seed_number, why, before: p.target_text, after: changed.target_text ?? p.target_text, beforeKnown: p.known_text, afterKnown: changed.known_text ?? p.known_text });
    this.touchedSeeds.add(p.seed_number);
  }
  /** Seeds that lost their approval: every touched seed, once, unless it was already unapproved. */
  finish() {
    for (const n of [...this.touchedSeeds].sort((a, b) => a - b)) {
      const s = this.live.seedBy.get(n);
      if (s.approved_at) { this.ops.push({ op: 'seed.update', seed_number: n, set: { approved_at: null }, expect: { approved_at: iso(s.approved_at) } }); }
    }
    return this;
  }
}

/** A text edit's knock-ons inside the same row: the components / decomposition tiles carry the Hindi too. */
function mapTiles(tiles, fn, key) {
  if (!Array.isArray(tiles)) return tiles;
  return tiles.map((t) => (t && typeof t[key] === 'string' ? { ...t, [key]: fn(t[key]) } : t));
}
const tilingOk = (tiles, text) => !Array.isArray(tiles) || !tiles.length || tiles.map((t) => t.target).join('') === text;

// ── Q1 ──────────────────────────────────────────────────────────────────────────────────────────────────────────
function planQ1(live) {
  const P = new Plan(live, 'q1 nukta');
  for (const s of live.seeds) { const t = dot(s.target_text); if (t !== s.target_text) P.seed(s.seed_number, { target_text: t }, 'H-NUKTA'); }
  for (const l of live.legos) {
    const t = dot(l.target_text); const comps = mapTiles(l.components, dot, 'target');
    const set = {}; if (t !== l.target_text) set.target_text = t; if (JSON.stringify(comps) !== JSON.stringify(l.components)) set.components = comps;
    if (Object.keys(set).length) P.lego(l, set, 'H-NUKTA');
  }
  for (const p of live.phrases) {
    const t = dot(p.target_text); const dec = mapTiles(p.decomposition, dot, 'target');
    const set = {}; if (t !== p.target_text) set.target_text = t;
    if (JSON.stringify(dec) !== JSON.stringify(p.decomposition) && tilingOk(dec, t)) set.decomposition = dec;
    if (Object.keys(set).length) P.phrase(p, set, 'H-NUKTA');
  }
  return P.finish();
}

// ── Q3: seeds 177 and 645 written in the female speaker's form ──────────────────────────────────────────────────
const FEM_TO_MASC = [[/पूछूँगी/g, 'पूछूँगा'], [/सकती हूँ/g, 'सकता हूँ']];
const unfem = (t) => FEM_TO_MASC.reduce((x, [re, to]) => x.replace(re, to), t);
// H-SIR-MADAM-AGREEMENT: she put a comma before every vocative सर/मैडम; seed 645 is the one row here that has one.
const commaBeforeVocative = (t) => t.replace(/(?<!,) (मैडम|सर)/g, ', $1');
const unfemRoman = (r) => (r ? r.replace(/poochhoong(i|ee)/g, 'poochhoonga').replace(/sakti hoon/g, 'sakta hoon') : r);
function planQ3(live) {
  const P = new Plan(live, 'q3 seeds 177/645');
  for (const n of [177, 645]) { const s = live.seedBy.get(n); const t = commaBeforeVocative(unfem(s.target_text)); if (t !== s.target_text) P.seed(n, { target_text: t, target_text_roman: unfemRoman(s.target_text_roman) && unfemRoman(s.target_text_roman).replace(/ madam/g, ', madam') }, 'H-SUBJECT-PRONOUN: masculine speaker'); }
  for (const l of live.legos.filter((x) => [177, 645].includes(x.seed_number))) {
    const t = unfem(l.target_text); if (t !== l.target_text) P.lego(l, { target_text: t, target_text_roman: unfemRoman(l.target_text_roman) }, 'H-SUBJECT-PRONOUN: masculine speaker');
  }
  for (const p of live.phrases.filter((x) => [177, 645].includes(x.seed_number))) {
    const t = unfem(p.target_text); if (t === p.target_text) continue;
    const dec = mapTiles(p.decomposition, unfem, 'target');
    P.phrase(p, { target_text: t, target_text_roman: unfemRoman(p.target_text_roman), ...(tilingOk(dec, t) ? { decomposition: dec } : {}) }, 'H-SUBJECT-PRONOUN: masculine speaker');
  }
  return P.finish();
}

// ── Q5 ──────────────────────────────────────────────────────────────────────────────────────────────────────────
// (a) "I'm not sure": यक़ीन, her rule H-NOT-SURE. Selected by the ENGLISH ("not sure" / "not certain"), so "are you sure"
//     (seed 63) and "nobody was sure" (202), which are पक्का in the correct sense, stay.
const NOT_SURE_EN = /\bnot (sure|certain)\b/i;
const NOT_SURE_HI = /पक्का( नहीं है)?/g;
const toYaqeen = (t) => t.replace(/पक्का नहीं है/g, 'यक़ीन नहीं है').replace(/^पक्का$/, 'यक़ीन');
const NOT_SURE_ROMAN = (r) => (r ? r.replace(/pakka naheen hai/g, 'yakeen nahin hai').replace(/^pakka$/, 'yakeen') : r);
// S0043L04U02 says "I don't know how I should answer" over मुझे पक्का नहीं है कि…: the English is made to say it (A: the side
// that is wrong is fixed, K2/P16) — "sure" is taught at seed 10.
const NOT_SURE_LEGOS = new Set(['S0010L01', 'S0062L04']);
const ENGLISH_FIXES = { 'hin_for_eng:S0043L04U02': { from: "I don't know how I should answer", to: "I'm not sure how I should answer" } };

function planQ5NotSure(live, P) {
  const hit = (known, hindi) => NOT_SURE_EN.test(known) && NOT_SURE_HI.test(hindi) && (NOT_SURE_HI.lastIndex = 0, true);
  for (const s of live.seeds) if (hit(s.known_text, s.target_text)) P.seed(s.seed_number, { target_text: toYaqeen(s.target_text), target_text_roman: NOT_SURE_ROMAN(s.target_text_roman) }, 'H-NOT-SURE');
  for (const l of live.legos) {
    if (!hit(l.known_text, l.target_text)) continue;
    const comps = (l.components || []).map((c) => (c.target === 'पक्का' ? { ...c, target: 'यक़ीन' } : c.target === 'पक्का नहीं है' ? { ...c, target: 'यक़ीन नहीं है' } : c));
    P.lego(l, { target_text: toYaqeen(l.target_text), target_text_roman: NOT_SURE_ROMAN(l.target_text_roman), components: comps, presentation_audio_id: null }, 'H-NOT-SURE (the intro clip says पक्का: unlinked, to re-render)');
  }
  for (const p of live.phrases) {
    const fix = ENGLISH_FIXES[p.id];
    const known = p.known_text; const isNs = NOT_SURE_EN.test(known) || (fix && known === fix.from) || (p.phrase_role === 'component' && NOT_SURE_LEGOS.has(p.lego_id));
    if (!isNs || !/पक्का/.test(p.target_text)) continue;
    const t = p.phrase_role === 'component' ? p.target_text.replace(/पक्का/g, 'यक़ीन') : toYaqeen(p.target_text);
    const dec = mapTiles(p.decomposition, (x) => x.replace(/पक्का/g, 'यक़ीन'), 'target');
    P.phrase(p, { target_text: t, target_text_roman: NOT_SURE_ROMAN(p.target_text_roman), ...(fix ? { known_text: fix.to } : {}), ...(tilingOk(dec, t) ? { decomposition: dec } : {}) }, fix ? 'H-NOT-SURE + English made to say what the Hindi says' : 'H-NOT-SURE');
  }
}

// (b) P28 — once a form is taught for a meaning, a phrase outside the later LEGO's own basket uses it. Explicit row lists,
//     each read in full on 29 Oct (the later LEGO's own basket must keep its LEGO — K50).
const P28 = [
  { id: 'S0129L01U01', from: 'मुझे बहुत खुशी है कि आप इतना अच्छा कर रहे हैं।', to: 'मैं बहुत खुश हूँ कि आप इतना अच्छा कर रहे हैं।', roman: 'main bahut khush hoon ki aap itna achha kar rahe hain.', why: "I'm happy: मैं खुश हूँ is taught first (S0076L01B03); this row is the seed-129 sentence itself" },
  { id: 'S0051L01U02', from: 'कल रात', to: 'पिछली रात', rom: ['kal raat', 'pichhlee raat'], why: 'last night: पिछली रात is taught first (S0042L02B02)' },
  { id: 'S0234L03U03', from: 'कल रात', to: 'पिछली रात', rom: ['kal raat', 'pichhlee raat'], why: 'last night: पिछली रात first (S0042L02B02)' },
  { id: 'S0234L04U02', from: 'कल रात', to: 'पिछली रात', rom: ['kal raat', 'pichhlee raat'], why: 'last night: पिछली रात first (S0042L02B02)' },
  { id: 'S0267L01U04', from: 'पिता', to: 'पिताजी', rom: ['pitaa', 'pitaji'], why: 'father: पिताजी is taught first (S0240L01B01 "father")' },
  { id: 'S0275L02U03', from: 'पिता', to: 'पिताजी', rom: ['pitaa', 'pitaji'], why: 'father: पिताजी first (S0240L01B01)' },
  { id: 'S0275L02U06', from: 'पिता', to: 'पिताजी', rom: ['pitaa', 'pitaji'], why: 'father: पिताजी first (S0240L01B01)' },
  { id: 'S0209L04U05', from: 'अभ्यास', to: 'प्रैक्टिस', rom: ['abhyaas', 'practice'], why: 'practise: प्रैक्टिस first (S0005L02) and her J-REGISTER prefers the everyday word' },
];
function planQ5Forms(live, P) {
  for (const r of P28) {
    const p = live.phrases.find((x) => x.id === `${COURSE}:${r.id}`);
    if (!p) throw new Error(`P28 row ${r.id} not found`);
    const fromRe = new RegExp(esc(r.from) + (r.from === 'पिता' ? '(?!जी)' : ''));
    if (!fromRe.test(p.target_text)) { if (dot(p.target_text).includes(dot(r.to))) continue; throw new Error(`P28 row ${r.id}: neither "${r.from}" nor "${r.to}" in "${p.target_text}"`); }
    const t = p.target_text.replace(fromRe, r.to);
    const dec = mapTiles(p.decomposition, (x) => x.replace(fromRe, r.to), 'target');
    P.phrase(p, { target_text: t, ...(r.roman ? { target_text_roman: r.roman } : r.rom && p.target_text_roman ? { target_text_roman: p.target_text_roman.replace(r.rom[0], r.rom[1]) } : {}), ...(tilingOk(dec, t) ? { decomposition: dec } : {}) }, `P28 — ${r.why}`);
  }
}
function planQ5(live) { const P = new Plan(live, 'q5'); planQ5NotSure(live, P); planQ5Forms(live, P); return P.finish(); }

// ── Q6: seed 207 gets a new LEGO ────────────────────────────────────────────────────────────────────────────────
// "did | कर" (not new) → "what you needed to do | जो करना था" (new), the report's own example. L27: the LEGO grows over the
// span of the seed no LEGO covered. Every row of its basket contains the LEGO on both sides (L30/P25) and uses words
// taught by seed 207 (checked in the test). One LEGO, one id: nothing is inserted or deleted, so no tom_go is needed.
const Q6_LEGO = { known_text: 'what you needed to do', target_text: 'जो करना था', target_text_roman: 'jo karnaa thaa', type: 'M', is_new: true,
  components: [{ known: 'what', target: 'जो' }, { known: 'you needed to do', target: 'करना था' }] };
const Q6_ROWS = {
  S0207L01B01: ['what you needed to do', 'जो करना था', 'jo karnaa thaa'],
  S0207L01B02: ['what you needed to do here', 'यहाँ जो करना था', 'yahaan jo karnaa thaa'],
  S0207L01B03: ['done what you needed to do', 'जो करना था वो कर दिया।', 'jo karnaa thaa vo kar diyaa.'],
  S0207L01U01: null, // the seed sentence itself — already says it
  S0207L01U02: ["so you've done what you needed to do", 'तो आपने जो करना था वो कर दिया।', 'to aapne jo karnaa thaa vo kar diyaa.'],
  S0207L01U03: ["have you done what you needed to do?", 'क्या आपने जो करना था वो कर दिया?', 'kyaa aapne jo karnaa thaa vo kar diyaa?'],
  S0207L01U04: ["or you've done what you needed to do here", 'या आपने यहाँ जो करना था वो कर दिया।', 'yaa aapne yahaan jo karnaa thaa vo kar diyaa.'],
  S0207L01U05: ["I know you've done what you needed to do", 'मुझे पता है कि आपने जो करना था वो कर दिया।', 'mujhe pataa hai ki aapne jo karnaa thaa vo kar diyaa.'],
};
function planQ6(live) {
  const P = new Plan(live, 'q6 seed 207');
  const l = live.legoBy.get('S0207L01');
  P.lego(l, { ...Q6_LEGO, presentation_audio_id: null }, 'Q6: new LEGO over the uncovered span (L27); its old intro said "did"');
  for (const [short, row] of Object.entries(Q6_ROWS)) {
    if (!row) continue;
    const p = live.phrases.find((x) => x.id === `${COURSE}:${short}`);
    P.phrase(p, { known_text: row[0], target_text: row[1], target_text_roman: row[2] }, 'Q6: basket re-made to contain the new LEGO on both sides');
  }
  return P.finish();
}

const PLANS = { q1: planQ1, q3: planQ3, q5: planQ5, q6: planQ6 };

// ── Popty ───────────────────────────────────────────────────────────────────────────────────────────────────────
async function postBatch(ops, apply) {
  const out = [];
  for (let i = 0; i < ops.length; i += 400) {
    const slice = ops.slice(i, i + 400);
    const res = await fetch(`${POPTY}/api/production/${COURSE}/edit-batch`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': AGENT }, body: JSON.stringify({ ops: slice, apply }), signal: AbortSignal.timeout(280000) });
    const j = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    if (!res.ok || j.error) throw new Error(`edit-batch ${i}-${i + slice.length}: ${res.status} ${j.error || ''} ${j.code || ''} (op ${j.index})`);
    out.push({ n: slice.length, applied: j.applied, event: j.event_id, undo_file: j.undo_file });
  }
  return out;
}

const summarise = (P) => ({ ops: P.ops.length, rows: P.rows.length, seedsUnapproved: P.ops.filter((o) => o.op === 'seed.update' && 'approved_at' in o.set).length });

async function main() {
  const [cmd, which] = process.argv.slice(2);
  const ff = process.argv.includes('--from-file') ? process.argv[process.argv.indexOf('--from-file') + 1] : null;
  const live = await loadLive(ff);
  if (cmd === 'plan' || cmd === 'check') {
    let open = 0;
    for (const [q, fn] of Object.entries(PLANS)) { const P = fn(live); const s = summarise(P); open += P.rows.length; console.log(`${q}: ${P.rows.length} row edits open (${s.ops} ops, ${s.seedsUnapproved} seeds to unapprove)`); }
    if (cmd === 'check') { console.log(open ? `CHECK: ${open} row edits still open` : 'CHECK: all four edit questions are applied'); process.exitCode = open ? 1 : 0; }
    return;
  }
  if (cmd === 'rows') {
    // The changed rows in the shape the Shuchita checker reads (--input): her rulebook is written for eng_for_hin, where the
    // Hindi is the KNOWN side, so Hindi goes in "known" and the English in "target".
    const qs = (which || 'q1,q3,q5,q6').split(',');
    const rows = [];
    for (const q of qs) for (const r of PLANS[q](live).rows) rows.push({ seed: r.seed, id: r.id, role: r.kind === 'build' || r.kind === 'use' ? 'phrase' : r.kind, known: r.after, target: r.afterKnown, question: q });
    console.log(JSON.stringify({ rows }, null, 1));
    return;
  }
  if (cmd === 'run') {
    const fn = PLANS[which]; if (!fn) throw new Error(`unknown question ${which}`);
    const P = fn(live);
    const evid = process.env.EVIDENCE_DIR || path.join(process.env.HOME, 'ssi-evidence/ssi-dashboard-v7/tools/course-optimization/hin-for-eng-9q-2026-10-29');
    fs.mkdirSync(evid, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.writeFileSync(path.join(evid, `${which}-${APPLY ? 'applied' : 'dryrun'}-${stamp}.json`), JSON.stringify({ rows: P.rows, ops: P.ops }, null, 1));
    console.log(`${which}: ${JSON.stringify(summarise(P))}${APPLY ? '' : ' (dry run)'}`);
    if (!P.ops.length) return;
    const r = await postBatch(P.ops, APPLY);
    console.log(JSON.stringify(r));
    return;
  }
  throw new Error('usage: plan | check | run q1|q3|q5|q6');
}

module.exports = { dot, unfem, toYaqeen, planQ1, planQ3, planQ5, planQ6, PLANS, Q6_ROWS, Q6_LEGO, P28, loadLive };
if (require.main === module) main().catch((e) => { console.error(e.message || e); process.exit(2); });
