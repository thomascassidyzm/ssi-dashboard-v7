#!/usr/bin/env node
'use strict';
// tools/course-optimization/fra-italian-rules-apply-2026-10-02.cjs
//
// fra_for_eng — APPLY what Kai already ruled for Italian, where the French fix is the same and obvious
// (job #355, 2 Oct 2026; input = the read-only scan d/472e78e6). Everything else is HELD and listed.
//
//   A  P26  every seed sentence sits in a played basket — the Italian #635·I planner, unchanged, plus two holds:
//           the seed's own new LEGO gloss does not appear in the seed wording (contractions, "to" and French
//           elision forgiven), or the sentence carries a French token no LEGO/phrase has used by then.
//   B  K41  bare English verb over a French infinitive in a BUILD fragment gets "to" — ONLY under a LEGO that is
//           already right. A LEGO edit nulls its clips and its intro, and the player cannot debut a LEGO with no
//           intro/known clip (generateLearningScript.ts introIsPlayable/debutIsPlayable) on a RELEASED course;
//           with renders not approved, every bare-infinitive LEGO (and its tiles/BUILDs) is HELD for spend.
//   C  P27  a bound form (l'ai, l'a, m'a, il y a, l'as, m'as, en a, l'était, t'es) used before the seed that
//           teaches it: the phrase is deleted (never a LEGO), or rewritten where the rewrite is the seed's own words.
//   D  K32  a formal phrase whose English ends sir/madam gets monsieur/madame at the end of the French.
//   F  one-off grammar, correct form already taught: "pas X encore" → "pas encore X" (seed 60's own order),
//           "oui se battent" → "oui ils se battent".
//
// THE RULES OF THE PASS: guard every row on its live BEFORE text; ZUT strict must not rise (simulated with the
// audit's own auditRows before anything is written — an edit that would raise it is dropped and HELD); edited
// seeds are unapproved with an event; P26 inserts do not unapprove (not a word change, canon P26). Audio: the DB
// trigger re-links a same-voice clip of the new text; any slot still empty is asked of POST /api/audio/render
// dryRun:true — a library answer is then linked (free), a would-render is COUNTED, never rendered.
//
//   node tools/course-optimization/fra-italian-rules-apply-2026-10-02.cjs           # dry run: plan + ZUT simulation
//   APPLY=1 node …                                                                   # write
//   AUDIO=1 node …                                                                   # audio pass only (idempotent)

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env.psql'), quiet: true });
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env'), quiet: true });
const P26 = require('./ita-seed-sentences-in-played-baskets-2026-09-28.cjs');
const { auditRows } = require('./audit-phrase-zut.cjs');

const COURSE = 'fra_for_eng';
const SWEEP = 'fra-italian-rules-apply-2026-10-02';
const SURFACE = `tools/course-optimization/${SWEEP}.cjs`;
const JOB = '#355';
const RULING = 'Kai, 2 Oct 2026 (job #355): apply to fra_for_eng what he ruled for Italian (P26, K41, P27, K32, clear one-off grammar) where the fix is obvious and breaks no other canon rule; everything else held and listed';
const full = (id) => `${COURSE}:${id}`;
const words = (s) => P26.norm(s).split(' ').filter(Boolean);
const short = (id) => String(id).replace(/^.*:/, '');
const legoOf = (id) => short(id).slice(0, 8);

// ── A · P26 holds beyond the planner's own ───────────────────────────────────────────────────────────
const P26_HOLD = {
  116: 'seed French "le meilleur choix que je pouvais faire" is doubtful (scan: que je puisse faire) — fix the seed first',
  152: 'seed drops "it" (j\'aurais fait vs "would have done it"); the scan proposes a seed change, Kai\'s step',
};
const EN = { "it's": 'it is', "i'm": 'i am', "you're": 'you are', "he's": 'he is', "she's": 'she is', "we're": 'we are', "they're": 'they are', "what's": 'what is', "that's": 'that is', "can't": 'can not', cannot: 'can not', "don't": 'do not', "doesn't": 'does not', "didn't": 'did not', "isn't": 'is not', "wasn't": 'was not', "won't": 'will not', "i'd": 'i would', "you'd": 'you would', "i'll": 'i will', "you'll": 'you will', "they'll": 'they will', "i've": 'i have', "couldn't": 'could not', "wouldn't": 'would not', "aren't": 'are not', "there's": 'there is' };
const ELIDED = { qu: 'que', d: 'de', l: 'le', n: 'ne', j: 'je', m: 'me', t: 'te', s: 'se', c: 'ce' };
const enWords = (s) => P26.norm(s).split(' ').flatMap((w) => (EN[w] || w).split(' ')).filter(Boolean);
const frWords = (s) => P26.norm(s).replace(/\b(qu|d|l|n|j|m|t|s|c)'/g, (m, a) => `${ELIDED[a]} `).replace(/\bd\b/g, 'de').replace(/\bqu\b/g, 'que').split(' ').filter(Boolean);
function bagContains(hay, needle, ignore = []) { const h = {}; for (const w of hay) h[w] = (h[w] || 0) + 1; for (const w of needle) { if (ignore.includes(w)) continue; if (!h[w]) return false; h[w]--; } return true; }
/** The seed's LEGO gloss appears in the seed wording, contractions / a K41 "to" / French elision forgiven. */
const glossInSeed = (seed, lego) => bagContains(enWords(seed.known_text), enWords(lego.known_text), ['to']) && bagContains(frWords(seed.target_text), frWords(lego.target_text), ['le', 'de', 'que']);

// ── B · K41 BUILD fragments under an already-correct LEGO (hand-reviewed from the 208 candidates) ─────────
const K41_BUILDS = `S0052L03B03 S0053L02B02 S0053L02B03 S0053L03B01 S0053L03B02 S0053L03B03 S0065L02B03 S0070L01B03 S0070L02B04
 S0071L05B02 S0071L05B03 S0071L05B04 S0090L01B02 S0104L03B03 S0105L03B04 S0107L03B03 S0107L03B04 S0108L03B03 S0134L02B03
 S0134L03B03 S0155L03B03 S0156L01B04 S0156L02B02 S0157L02B02 S0157L03B03 S0158L02B04 S0171L02B01 S0208L02B04 S0209L01B03
 S0209L03B04 S0214L02B04 S0215L02B03 S0215L02B04 S0241L01B03 S0295L01B03 S0299L02B03 S0357L04B03 S0358L02B02 S0358L02B03
 S0359L02B03 S0368L01B03 S0371L01B02 S0371L01B03 S0371L02B02 S0379L02B03 S0383L01B03 S0395L06B02 S0399L02B02 S0407L06B03
 S0416L02B04 S0420L03B02 S0461L02B02 S0462L03B02 S0499L04B02 S0499L04B03 S0501L02B02 S0501L02B03 S0503L02B02 S0504L03B02
 S0504L03B03 S0506L01B02 S0507L01B02 S0507L01B03 S0508L02B02 S0509L01B02 S0509L01B03 S0510L01B02 S0510L04B04 S0511L02B02
 S0511L02B03 S0511L05B02 S0511L05B03 S0512L01B02 S0512L01B03 S0513L01B02 S0514L01B03 S0514L03B02 S0519L02B02 S0519L02B03
 S0523L01B02 S0526L01B02 S0528L04B03 S0530L01B03 S0534L01B02 S0534L01B03 S0541L02B02 S0541L02B03 S0545L04B03 S0547L01B03
 S0549L01B02 S0559L03B03 S0594L03B02 S0604L01B02 S0611L01B02 S0621L02B02`.split(/\s+/).filter(Boolean);

// ── C · P27 bound forms before their teaching seed ───────────────────────────────────────────────────
// first teaching LEGO: l'ai 309, l'a 367, m'a 147, il y a 131; l'as / m'as / en a / l'était / t'es — no LEGO at all.
const P27_DELETE = {
  S0102L03U02: "l'a before 367", S0103L03U04: 'il y a before 131', S0109L02U02: 'il y a before 131', S0132L03U04: "m'a before 147",
  S0141L02U09: "l'était — no LEGO teaches it", S0144L02U09: "t'es — no LEGO teaches it (and the clause wants the subjunctive)",
  S0150L01U08: "l'as — no LEGO teaches it", S0184L02B04: "l'ai before 309 (U03 already drills 'I saw them a while ago')",
  S0194L01U01: "l'ai before 309", S0195L01U08: "en a — no LEGO teaches it (and 'en … de plus' doubles en)",
  S0195L02U03: "l'as — no LEGO teaches it", S0195L03U07: "l'ai before 309", S0205L02U06: "l'ai before 309",
  S0208L01U01: "l'ai before 309", S0225L01U02: "l'a before 367", S0247L01U07: "l'ai before 309",
  S0257L01U07: "m'as — no LEGO teaches it", S0268L02U03: "l'a before 367", S0268L02U07: "l'ai before 309",
  S0292L02U02: "l'ai before 309", S0292L02U08: "l'ai before 309", S0339L01U01: "l'a before 367 (and 'assez gravement' for 'quite badly')",
  S0341L02B02: "l'a before 367", S0574L01U04: 'en a — no LEGO teaches it', S0600L03U04: 'en a — no LEGO teaches it',
};
const P27_REWRITE = {
  // the seed's own words: j'ai laissé + l'argent + sur la table (seed 195)
  S0195L03B03: { before: ['I left it on the table', "je l'ai laissé sur la table"], after: ['I left the money on the table', "j'ai laissé l'argent sur la table"], why: "l'ai before 309" },
};

// ── D · K32 — monsieur/madame added at the end of the French ──────────────────────────────────────────
const K32_HOLD = {
  S0642L02U03: 'French inversion inside an indirect question (comment vous sentez-vous) — needs a frame the taught form fits; Kai/native',
  S0642L02U04: 'same indirect-question inversion as U03',
  S0651L01B02: "qu'en pensez-vous de cela doubles en — broken French, native pass",
  S0651L01U04: "qu'en pensez-vous de cette idée doubles en — broken French, native pass",
  S0654L02B02: 'English "not sure to be able to help you" is not natural English',
  S0650L01U05: '"voulez-vous partir déjà" — word order wants a native ear (déjà partir)',
  S0653L02U03: '"ça vous dérange du tout" — du tout wants a negative; native pass',
};
const honorificOf = (known) => (/\bmadam\b/i.test(known) ? 'madame' : /\bsir\b/i.test(known) ? 'monsieur' : null);
function addHonorific(target, word) { const m = /^(.*?)(\s*\?)\s*$/.exec(target); return m ? `${m[1]} ${word} ?` : `${target.replace(/\s+$/, '')} ${word}`; }

// ── F · one-off grammar, the correct form already taught ─────────────────────────────────────────────
const F_EDITS = {
  // seed 60 teaches "ne … pas encore" (je ne sais pas encore); its basket put encore last, and 60 U03 clashed with 88/96
  S0060L01B02: ['pas fini encore', 'pas encore fini'], S0060L01B03: ['pas prêt encore', 'pas encore prêt'],
  S0060L01U02: ["je n'ai pas fini encore", "je n'ai pas encore fini"], S0060L01U03: ['je ne suis pas prêt encore', 'je ne suis pas encore prêt'],
  S0060L01U04: ['je ne peux pas parler français très bien encore', 'je ne peux pas encore très bien parler français'],
  S0060L01U05: ['tu ne comprends pas assez de mots encore', 'tu ne comprends pas encore assez de mots'],
  S0060L01U06: ['je voulais finir mais je ne suis pas prêt encore', 'je voulais finir mais je ne suis pas encore prêt'],
  S0526L02B03: ['tu ne peux pas deviner encore', 'tu ne peux pas encore deviner'],
  S0554L01U03: ['pas sèche encore', 'pas encore sèche'], S0554L04U02: ["n'est pas sèche encore", "n'est pas encore sèche"],
  S0410L02B03: ['oui se battent', 'oui ils se battent'],
};

// ── PLAN (pure over a snapshot) ────────────────────────────────────────────────────────────────────
function wordTaughtFrom({ seeds, legos, phrases }, { excludeSeedSentences = false } = {}) {
  const first = { known: new Map(), target: new Map() };
  const seedKey = new Set(seeds.map((s) => P26.pairKey(s.known_text, s.target_text)));
  const feed = (side, n, t) => { for (const w of new Set(words(t))) { const m = first[side]; if (!m.has(w) || m.get(w) > n) m.set(w, n); } };
  if (!excludeSeedSentences) for (const s of seeds) { feed('known', s.seed_number, s.known_text); feed('target', s.seed_number, s.target_text); }
  for (const l of legos) { feed('known', l.seed_number, l.known_text); feed('target', l.seed_number, l.target_text); }
  for (const p of phrases) { if (excludeSeedSentences && seedKey.has(P26.pairKey(p.known_text, p.target_text))) continue; feed('known', p.seed_number, p.known_text); feed('target', p.seed_number, p.target_text); }
  return (w, side) => (first[side].has(w) ? first[side].get(w) : Infinity);
}

function plan(db) {
  const { seeds, legos, phrases } = db;
  const L = Object.fromEntries(legos.map((l) => [l.lego_id, l]));
  const P = Object.fromEntries(phrases.map((p) => [short(p.id), p]));
  const held = []; const edits = []; const deletes = []; const inserts = [];
  const hold = (cls, id, why, extra = {}) => held.push({ cls, id, why, ...extra });

  // A
  const joined = phrases.map((p) => ({ ...p, lego_id: legoOf(p.id), is_new: L[legoOf(p.id)].is_new }));
  const a = P26.plan({ seeds, legos, phrases: joined, wordTaught: wordTaughtFrom(db) }, { skip: Object.keys(P26_HOLD).map(Number) });
  for (const s of a.skipped) hold('A', `seed ${s.seed}`, P26_HOLD[s.seed], { known: s.known, target: s.target });
  for (const l of a.listed) hold('A', `seed ${l.seed}`, l.why, { known: l.known, target: l.target });
  const strictTaught = wordTaughtFrom(db, { excludeSeedSentences: true });
  for (const r of a.rows) {
    const at = Math.max(r.seed, r.lego_seed); const why = [];
    const untaught = words(r.target).filter((w) => strictTaught(w, 'target') > at);
    if (untaught.length) why.push(`French ${untaught.join(', ')} in no LEGO or other phrase by seed ${at}`);
    const s = seeds.find((x) => x.seed_number === r.seed);
    const mism = legos.filter((l) => l.seed_number === r.seed && l.is_new && !glossInSeed(s, l));
    if (mism.length) why.push(`the seed's LEGO gloss is not its wording: ${mism.map((l) => `${l.lego_id} "${l.known_text} | ${l.target_text}"`).join('; ')}`);
    if (why.length) hold('A', `seed ${r.seed}`, why.join(' · '), { known: r.known, target: r.target });
    else inserts.push({ cls: 'A', ...r });
  }

  // B
  for (const id of K41_BUILDS) {
    const p = P[id]; if (!p) { hold('B', id, 'row not found live'); continue; }
    if (p.phrase_role !== 'build') { hold('B', id, `role ${p.phrase_role}`); continue; }
    if (/^to\b/i.test(p.known_text)) continue; // already done
    edits.push({ cls: 'B', id, before: [p.known_text, p.target_text], after: [`to ${p.known_text}`, p.target_text], why: 'K41: French infinitive glossed with "to"' });
  }

  // C
  for (const [id, why] of Object.entries(P27_DELETE)) {
    const p = P[id]; if (!p) { hold('C', id, 'row not found live'); continue; }
    deletes.push({ cls: 'C', id, before: [p.known_text, p.target_text], role: p.phrase_role, why: `P27: ${why}` });
  }
  for (const [id, e] of Object.entries(P27_REWRITE)) {
    const p = P[id]; if (!p) { hold('C', id, 'row not found live'); continue; }
    if (p.known_text === e.after[0] && p.target_text === e.after[1]) continue; // already done
    edits.push({ cls: 'C', id, before: [p.known_text, p.target_text], after: e.after, why: `P27: ${e.why}`, expect: e.before });
  }

  // D
  for (const l of legos.filter((x) => /\b(sir|madam)\b/i.test(x.known_text))) {
    for (const p of phrases.filter((x) => legoOf(x.id) === l.lego_id && x.phrase_role !== 'component')) {
      const id = short(p.id); const word = honorificOf(p.known_text);
      if (!word || /\b(monsieur|madame)\b/i.test(p.target_text)) continue;
      if (!l.is_new) { hold('D', id, `under not-new ${l.lego_id} — never played (P25); left with the 644 L02 rehoming question`, { known: p.known_text, target: p.target_text }); continue; }
      if (K32_HOLD[id]) { hold('D', id, K32_HOLD[id], { known: p.known_text, target: p.target_text }); continue; }
      edits.push({ cls: 'D', id, before: [p.known_text, p.target_text], after: [p.known_text, addHonorific(p.target_text, word)], why: `K32: formal phrase ends ${word} on both sides` });
    }
  }

  // F
  for (const [id, [from, to]] of Object.entries(F_EDITS)) {
    const p = P[id]; if (!p) { hold('F', id, 'row not found live'); continue; }
    if (p.target_text === to) continue; // already done
    edits.push({ cls: 'F', id, before: [p.known_text, p.target_text], after: [p.known_text, to], why: 'one-off grammar, taught form', expect: [p.known_text, from] });
  }
  for (const e of edits) if (e.expect && (e.expect[0] !== e.before[0] || e.expect[1] !== e.before[1])) throw new Error(`${e.id}: live text "${e.before.join(' | ')}" is not the reviewed "${e.expect.join(' | ')}"`);
  return { inserts, edits, deletes, held, census: a.census };
}

/** The course after the plan, as auditRows wants it. */
function simulate(db, { inserts, edits, deletes }) {
  const del = new Set(deletes.map((d) => d.id)); const ed = Object.fromEntries(edits.map((e) => [e.id, e]));
  const phrases = db.phrases.filter((p) => !del.has(short(p.id))).map((p) => (ed[short(p.id)] ? { ...p, known_text: ed[short(p.id)].after[0], target_text: ed[short(p.id)].after[1] } : p));
  for (const r of inserts) phrases.push({ id: full(r.id), seed_number: r.lego_seed, lego_index: r.lego_index, phrase_role: 'use', known_text: r.known, target_text: r.target });
  return { legos: db.legos.map((l) => ({ ...l, id: l.lego_id })), phrases, seeds: db.seeds };
}
const strictGroups = (rows) => new Map(auditRows(rows).bidirectional.violationsStrict.map((v) => [v.known_norm, v]));

/** Drop (and HOLD) every planned change whose known text lands in a strict ZUT group that did not exist before. */
function zutGate(db, p) {
  const before = strictGroups(simulate(db, { inserts: [], edits: [], deletes: [] }));
  for (let round = 0; round < 5; round++) {
    const after = strictGroups(simulate(db, p));
    const fresh = [...after.keys()].filter((k) => !before.has(k));
    if (!fresh.length) return { before: before.size, after: after.size };
    const { nk } = require('./audit-phrase-zut.cjs');
    const hit = (k) => fresh.includes(nk(k));
    for (const e of p.edits.filter((x) => hit(x.after[0]))) p.held.push({ cls: e.cls, id: e.id, why: `ZUT: "${e.after[0]}" would stand over two French forms (${after.get(nk(e.after[0])).distinct_targets.map((t) => t.example.target).join(' / ')})`, known: e.after[0], target: e.after[1] });
    for (const r of p.inserts.filter((x) => hit(x.known))) p.held.push({ cls: 'A', id: `seed ${r.seed}`, why: `ZUT: "${r.known}" would stand over two French forms`, known: r.known, target: r.target });
    p.edits = p.edits.filter((x) => !hit(x.after[0])); p.inserts = p.inserts.filter((x) => !hit(x.known));
  }
  throw new Error('ZUT gate did not converge');
}

// ── LIVE ──────────────────────────────────────────────────────────────────────────────────────────
async function load(pg) {
  const q = async (s, a) => (await pg.query(s, a)).rows;
  return {
    seeds: await q('SELECT seed_number, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id, approved_at FROM course_seeds WHERE course_code=$1 ORDER BY seed_number', [COURSE]),
    legos: await q('SELECT lego_id, seed_number, lego_index, is_new, known_text, target_text FROM course_legos WHERE course_code=$1 ORDER BY seed_number, lego_index', [COURSE]),
    phrases: await q('SELECT id, seed_number, lego_index, position, phrase_role, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=$1 ORDER BY seed_number, lego_index, position', [COURSE]),
  };
}

async function apply(pg, supabase, p, log) {
  const { serviceIdentity } = require('../../services/shared/editor-identity.cjs');
  const { recordContentEdit } = require('../../services/shared/content-edit-log.cjs');
  const identity = serviceIdentity(SWEEP, { role: 'content-sweep' });
  const ev = (operation, scope, detail) => recordContentEdit(supabase, { identity, courseCode: COURSE, surface: SURFACE, operation, scope, detail: { ruling: RULING, job: JOB, ...detail } });
  const seedsOf = (ids) => [...new Set(ids.map((id) => Number(short(id).slice(1, 5))))].sort((x, y) => x - y);
  const E = {};
  if (p.inserts.length) E.insert = await ev('phrase-add', { seed_numbers: seedsOf(p.inserts.map((r) => r.id)), phrase_ids: p.inserts.map((r) => full(r.id)), rows: p.inserts.length }, { rule: 'P26', rows: p.inserts.map((r) => ({ id: full(r.id), from_seed: r.seed, lego: r.lego_id, why: r.why, known: r.known, target: r.target })) });
  if (p.edits.length) E.edit = await ev('phrase-edit', { seed_numbers: seedsOf(p.edits.map((e) => e.id)), phrase_ids: p.edits.map((e) => full(e.id)), rows: p.edits.length }, { changes: p.edits.map((e) => ({ id: full(e.id), rule: e.cls, why: e.why, known_from: e.before[0], target_from: e.before[1], known_to: e.after[0], target_to: e.after[1] })) });
  if (p.deletes.length) E.delete = await ev('phrase-delete', { seed_numbers: seedsOf(p.deletes.map((d) => d.id)), phrase_ids: p.deletes.map((d) => full(d.id)), rows: p.deletes.length }, { deleted: p.deletes.map((d) => ({ id: full(d.id), rule: d.cls, why: d.why, role: d.role, known: d.before[0], target: d.before[1] })) });
  const touched = seedsOf([...p.edits.map((e) => e.id), ...p.deletes.map((d) => d.id)]);
  const { rows: appr } = await pg.query('SELECT seed_number, approved_at FROM course_seeds WHERE course_code=$1 AND seed_number = ANY($2) AND approved_at IS NOT NULL', [COURSE, touched]);
  if (appr.length) E.unapprove = await ev('unapprove', { seed_numbers: appr.map((x) => x.seed_number), rows: appr.length }, { why: 'phrases edited or deleted in the Italian-rules pass — Kai should read them', approved_at_before: appr });
  log.events = E; log.unapproved = appr.map((x) => x.seed_number);

  await pg.query('BEGIN');
  try {
    for (const r of p.inserts) {
      const { rows: clash } = await pg.query('SELECT 1 FROM course_practice_phrases WHERE course_code=$1 AND id=$2', [COURSE, full(r.id)]);
      if (clash.length) throw new Error(`${r.id} already exists — re-run the plan`);
      await pg.query(`INSERT INTO course_practice_phrases (id, course_code, seed_number, lego_index, position, known_text, target_text, word_count, lego_count, metadata, status, phrase_role, connected_lego_ids, lego_position, lego_id, introduce, known_audio_id, target1_audio_id, target2_audio_id, last_edit_event_id)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'draft','use','{}',$11,$12,true,$13,$14,$15,$16)`,
      [full(r.id), COURSE, r.lego_seed, r.lego_index, r.position, r.known, r.target, r.target.length, r.target.split(/\s+/).length, JSON.stringify({ format: 'build_use', source: SWEEP, job: JOB, seed_sentence_of: r.seed, why: r.why }), P26.legoPosition(r.known, r.lego_known), r.lego_id, r.audio.known, r.audio.target1, r.audio.target2, E.insert]);
    }
    for (const e of p.edits) {
      const u = await pg.query('UPDATE course_practice_phrases SET known_text=$1, target_text=$2, word_count=$3, last_edit_event_id=$4, updated_at=now() WHERE course_code=$5 AND id=$6 AND known_text=$7 AND target_text=$8',
        [e.after[0], e.after[1], e.after[1].length, E.edit, COURSE, full(e.id), e.before[0], e.before[1]]);
      if (u.rowCount !== 1) throw new Error(`${e.id}: live text moved (update ${u.rowCount})`);
    }
    for (const d of p.deletes) {
      const r = await pg.query('DELETE FROM course_practice_phrases WHERE course_code=$1 AND id=$2 AND known_text=$3 AND target_text=$4', [COURSE, full(d.id), d.before[0], d.before[1]]);
      if (r.rowCount !== 1) throw new Error(`${d.id}: live text moved (delete ${r.rowCount})`);
    }
    if (appr.length) await pg.query('UPDATE course_seeds SET approved_at=NULL, last_edit_event_id=$3 WHERE course_code=$1 AND seed_number = ANY($2)', [COURSE, appr.map((x) => x.seed_number), E.unapprove]);
    await pg.query('COMMIT');
  } catch (e) { await pg.query('ROLLBACK'); throw e; }
  const { refreshNow } = require('../../services/shared/round-index-refresh.cjs');
  await refreshNow();
}

// Audio: every empty slot on a row this job wrote → route dryRun; library → link (free); else counted.
async function audioPass(pg, ids, log) {
  const ROLE = { known_audio_id: 'known', target1_audio_id: 'target1', target2_audio_id: 'target2' };
  const { rows } = await pg.query('SELECT id, known_text, target_text, known_audio_id, target1_audio_id, target2_audio_id FROM course_practice_phrases WHERE course_code=$1 AND id = ANY($2) ORDER BY id', [COURSE, ids.map(full)]);
  const out = { slots: 0, library: 0, wouldRender: [], refused: [] };
  const call = async (body) => { const r = await fetch('http://localhost:3470/api/audio/render', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': `${SWEEP} (job ${JOB})` }, body: JSON.stringify(body) }); return { status: r.status, body: await r.json().catch(() => ({})) }; };
  for (const r of rows) for (const [col, role] of Object.entries(ROLE)) {
    if (r[col]) continue;
    out.slots++;
    const text = role === 'known' ? r.known_text : r.target_text;
    const body = { courseCode: COURSE, role, text, purpose: `job ${JOB} Italian-rules pass: ${short(r.id)}`, dryRun: true };
    const dry = await call(body);
    if (dry.status !== 200 || !dry.body.ok) { out.refused.push({ id: short(r.id), role, text, status: dry.status, answer: dry.body }); continue; }
    if (dry.body.source !== 'library') { out.wouldRender.push({ id: short(r.id), role, text, chars: dry.body.wouldSpendChars || text.length }); continue; }
    const real = await call({ ...body, dryRun: false });
    if (real.status !== 200 || real.body.source !== 'library' || !real.body.audioId) { out.refused.push({ id: short(r.id), role, text, status: real.status, answer: real.body }); continue; }
    await pg.query(`UPDATE course_practice_phrases SET ${col}=$1 WHERE course_code=$2 AND id=$3 AND ${col} IS NULL`, [real.body.audioId, COURSE, r.id]);
    out.library++;
  }
  log.audio = out; return out;
}

async function main() {
  const APPLY = process.env.APPLY === '1', AUDIO = process.env.AUDIO === '1';
  const { Client } = require('pg'); const { createClient } = require('@supabase/supabase-js'); const { evidencePath } = require('../lib/evidence-path.cjs');
  const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect();
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
  const log = { sweep: SWEEP, job: JOB, ruling: RULING, mode: APPLY ? 'apply' : AUDIO ? 'audio' : 'dry', started: new Date().toISOString() };
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const evidence = (n) => { const f = evidencePath(`tools/course-optimization/${SWEEP}/${n}-${stamp}.json`); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(log, null, 2)); return f; };
  if (AUDIO) {
    const prev = JSON.parse(fs.readFileSync(process.env.FROM, 'utf8'));
    const ids = [...prev.plan.edits.map((e) => e.id), ...prev.plan.inserts.map((r) => r.id)];
    const a = await audioPass(pg, ids, log);
    console.log(`AUDIO: ${a.slots} empty slots; ${a.library} linked from the library; ${a.wouldRender.length} would render (${a.wouldRender.reduce((s, x) => s + x.chars, 0)} chars); ${a.refused.length} refused`);
    console.log(`Wrote ${evidence('audio')}`); await pg.end(); return;
  }
  const db = await load(pg);
  const p = plan(db);
  log.zut = zutGate(db, p);
  log.plan = p;
  const by = (xs) => xs.reduce((m, x) => ((m[x.cls] = (m[x.cls] || 0) + 1), m), {});
  console.log(`PLAN: inserts ${p.inserts.length}, edits ${JSON.stringify(by(p.edits))}, deletes ${p.deletes.length}, held ${JSON.stringify(by(p.held))}; ZUT strict simulated ${log.zut.before} → ${log.zut.after}`);
  if (APPLY) { await apply(pg, supabase, p, log); console.log(`APPLIED. events ${JSON.stringify(log.events)}; unapproved ${log.unapproved.length}: ${log.unapproved.join(',')}`); }
  console.log(`Wrote ${evidence(APPLY ? 'applied' : 'dryrun')}`);
  await pg.end();
}
module.exports = { plan, simulate, zutGate, glossInSeed, addHonorific, honorificOf, enWords, frWords, K41_BUILDS, P27_DELETE, F_EDITS };
if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
