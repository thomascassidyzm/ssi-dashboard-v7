#!/usr/bin/env node
'use strict';
// tools/course-optimization/cym-for-kor-rebuild-251.cjs — cs #251·AL. Rebuilds the practice baskets of the hidden draft
// course cym_for_kor (Welsh for Korean speakers) to OPTION D of #248's re-cost (d/88008158), Kai 24 Nov 17:55Z:
// "Of the originals are in the v2 course, they're on route to get recorded anyway, so no need to count those. We're
// minimizing the extras ... Comparable to v2 is ideal. Happy with that - go for it, carefully."
//
// Why: the 15,238 phrases were all door-generated; ~146 match an original Welsh phrase, so almost no existing Welsh audio
// could be reused. Option D reuses every fitting original (and its LEGO split) from cym_nv2_for_eng and keeps
// door-generated rows only as top-ups to the canon P30 floor (phraseFloor).
//
// The assignment (which original goes in which basket, how many top-ups each needs) is ops/cym-for-kor/rebuild-251/
// assign.py — pure, offline. This tool does the rest:
//   korean <from-to> [conc]   per SEED, one Opus call through services/shared/claude-cli.cjs (the Claude CLI, never the
//                             SDK): writes the Korean prompt of every original placed in the seed's new LEGOs, judges
//                             each MOVED original as Welsh in its new basket (#248 open check b), and picks which
//                             door rows stay as top-ups (best first, a bad one is refused: a thin basket beats a bad
//                             phrase, Kai 19 Nov). Files only → ops/cym-for-kor/rebuild-251/ko/S####.json. NOT
//                             regenerable for free (Claude capacity).
//   check                     offline: Korean ZUT over the whole post-swap course (P16: same Korean → two Welsh is
//                             refused), Kai's register rulings (no 해요/저 in 반말 lines …), every original's Welsh
//                             re-checked for P17 containment → ops/…/check.json
//   plan <from-to> <liveSeeds> [copy]  per LEGO: final basket = accepted originals (+ already-present door rows equal to
//                             one) + kept top-ups + protected door rows; inserts / Korean fixes / deletes. LIVE PRE-CHECK
//                             (Kai 19 Nov): the LEGO, its seed and every door row must read the same live as in the snapshot
//                             or the whole LEGO is HELD and listed. Course-wide Korean ZUT (P16, K2): a new Korean prompt that
//                             already maps to a different Welsh anywhere is refused. → ops/…/plan-<from-to>.json
//   insert-cs <from-to>       plan → <from-to>.insert.changeset.jsonl (phrase.insert + phrase.update of Korean fixes)
//   delete-cs <from-to>       insert ledger → <from-to>.delete.changeset.jsonl: a LEGO's door rows go only when every insert
//                             of that LEGO landed (make-before-break, as #247); expect{} on every delete
//   verify <from-to> <liveSeeds>  every planned insert live, every planned delete gone, floor shortfalls listed
// This tool writes NOTHING to any database; live writes go only through tools/changeset/apply-changeset.cjs.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const DIR = path.join(ROOT, 'ops', 'cym-for-kor', 'rebuild-251');
const EV = path.join(process.env.HOME, 'ssi-evidence', 'ssi-dashboard-v7', 'ops', 'cym-for-kor', 'rebuild-251');
const COURSE = 'cym_for_kor';
const loadJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const range = (s) => { const [a, b] = String(s).split('-').map(Number); if (!a || !b) throw new Error('range like 1-100'); return [a, b]; };
const sid = (s) => `S${String(s).padStart(4, '0')}`;

// The Korean known-side rulings (Kai 23 Nov, d/93524570, steps 2-3) and the canon rails the prompt must obey.
const SYSTEM = `You write the KOREAN known-side prompts for a SaySomethingin course that teaches North Welsh to Korean speakers (course cym_for_kor). The learner hears your Korean and must say the Welsh. You are a native-level Korean writer and an expert in Welsh grammar.

THE RULES (hard):
1. ZERO UNCERTAINTY: from your Korean, with the LEGOs the learner holds, exactly ONE Welsh answer is possible. Mirror the Welsh closely: person, number, tense, negation, question vs statement, every content word. If the Welsh is an open-ended fragment (it ends where more would follow, e.g. "dw i isio ..."), the Korean mirrors the open end with ~ (e.g. "나는 ~하고 싶어") — that is legitimate for BUILD rows.
2. CONTROLLED KNOWN LANGUAGE: build the Korean from the Korean glosses of the LEGOs the Welsh contains (given to you per phrase). Use the gloss wording; inflect it naturally (endings, particles, conjugation are free), but do not swap in a different Korean word for a meaning a gloss already fixes.
3. REGISTER (Kai's rulings): Welsh "ti" and every line with no addressee = 반말 (너/네가/네 for you; 나/내가/내 for I; keep the pronoun explicit, as Welsh marks person). Formal "chi" (esgusodwch fi …) = 해요 with 실례지만 and -시-/드리다 on the listener's verb. Plural "chi"/"chi gyd" = 여러분 in 해요 (no 모두). "Let's" = -자. Never 당신. Never 합니다. Never 해요 or 저/제가 in a 반말 line. No brackets, no slashes, no notes.
4. The Korean must be natural, grammatical Korean a native speaker would accept.

EVERY ORIGINAL'S WELSH HAS ALREADY PASSED POPTY'S OWN VOCABULARY VALIDATOR AT THIS SEED (a word met inside any earlier chunk counts as taught; soft mutation counts as the same word). Never refuse an original for "untaught words": the glosses list is only a hint and is often incomplete; where a word has no gloss, take its meaning from the source English prompt.

You also JUDGE:
(a) each original marked MOVED (it comes from a different seed or a different LEGO in the source course): read the Welsh in its new basket and seed — is it still natural, idiomatic North Welsh that makes sense here, and does it use the LEGO in the sense this course taught it? ok=false only for a real problem (wrong sense, unnatural, ungrammatical); "unlikely to come up" is NOT a problem.
(b) door-generated candidate rows: pick the ones to KEEP as top-ups, best first, up to the number needed per role. Refuse a candidate (keep=false) if its Welsh is ungrammatical or unnatural (check mutations, word order, gender agreement), its Korean prompt has two possible Welsh answers, or it breaks the register rules. Never keep a weak one to reach the count; fewer is fine.
You may fix a candidate's KOREAN (field ko) if only the Korean is wrong; never change any Welsh.

Answer with ONE JSON object and nothing else.`;

function taughtIndex(kor) {
  // every LEGO in course order with its position, for "glosses of taught LEGOs this Welsh contains"
  const list = [];
  for (const s of kor.seeds.slice().sort((a, b) => a.seed_number - b.seed_number)) {
    for (const l of (s.legos || []).slice().sort((a, b) => a.lego_index - b.lego_index)) list.push({ s: s.seed_number, i: +l.lego_index, cy: l.target_text, ko: l.known_text });
  }
  return list;
}
function containedGlosses(text, seed, idx, taught, contains) {
  const hits = taught.filter((t) => (t.s < seed || (t.s === seed && t.i <= idx)) && contains(t.cy, text));
  // keep the maximal ones: drop a LEGO whose Welsh is inside another hit's Welsh
  const lower = (x) => x.toLowerCase();
  const max = hits.filter((h) => !hits.some((o) => o !== h && o.cy.length > h.cy.length && lower(o.cy).includes(lower(h.cy))));
  const seen = new Set();
  return max.filter((h) => { const k = `${h.cy}|${h.ko}`; if (seen.has(k)) return false; seen.add(k); return true; }).map((h) => `${h.ko} = ${h.cy}`);
}

// Gloss hints only (never a gate): the LEGO's words appear CONTIGUOUSLY in the phrase (normalised, apostrophes folded).
const toks = (t) => String(t || '').replace(/[’‘`´]/g, "'").toLowerCase().replace(/[.,!?;:]+/g, ' ').split(/\s+/).filter(Boolean);
function contiguous(lt, pt) {
  const a = toks(lt), b = toks(pt);
  if (!a.length) return false;
  for (let i = 0; i + a.length <= b.length; i++) if (a.every((w, j) => b[i + j] === w)) return true;
  return false;
}

function seedPrompt(seed, legos, taught, contains) {
  const L = [];
  L.push(`SEED ${seed}: Korean "${legos[0].seed_known}" = Welsh "${legos[0].seed_target}"`);
  for (const g of legos) {
    L.push(`\n## LEGO ${g.lego}: ${g.known} = ${g.target}   (floor ${g.floor.build} BUILD + ${g.floor.use} USE)`);
    L.push('ORIGINALS (write ko for each; judge ok for every one marked MOVED, others ok=true unless clearly broken):');
    g.originals.forEach((o, n) => {
      const gl = containedGlosses(o.target, g.seed, g.idx, taught, contains);
      L.push(`  o${n + 1} [${o.role.toUpperCase()}]${o.moved ? ` MOVED from source seed ${o.src_pool === 'hc' ? o.src_seed : 'old-' + o.src_seed} LEGO "${o.src_lego_text}"` : ''} Welsh: ${o.target}   | source English prompt: ${o.known_en}   | glosses: ${gl.join('; ')}`);
    });
    const need = g.short;
    const cands = g.door.filter((d) => !d.protected.length);
    if (need.build || need.use) {
      L.push(`TOP-UPS NEEDED: ${need.build} BUILD, ${need.use} USE. Door candidates (keep at most that many per role, best first):`);
      for (const d of cands) if (need[d.role]) L.push(`  ${d.id} [${d.role.toUpperCase()}] ${d.known} = ${d.target}`);
    }
  }
  L.push(`\nReturn JSON: {"legos":{"<LEGO id>":{"originals":[{"n":1,"ko":"...","ok":true,"why":""}, ...],"topups":[{"id":"<candidate id>","keep":true,"ko":"<only if you fixed the Korean>","why":"<one line if refused>"}]}}} — every original of every LEGO listed, in order; topups only for LEGOs that need them.`);
  return L.join('\n');
}

async function korean(rng, conc, assignPath, korPath) {
  const [a, b] = range(rng);
  const { claudeChat } = require('../../services/shared/claude-cli.cjs');
  const { phraseContainsLego } = require('../../services/course-builder/lib/separable-verbs.cjs');
  const { checkWordContainment } = require('../../services/course-builder/lib/text-normalization.cjs');
  void phraseContainsLego; void checkWordContainment;
  const A = loadJson(assignPath);
  const taught = taughtIndex(loadJson(korPath));
  const bySeed = new Map();
  for (const g of A.legos) if (g.seed >= a && g.seed <= b) { if (!bySeed.has(g.seed)) bySeed.set(g.seed, []); bySeed.get(g.seed).push(g); }
  const dir = path.join(DIR, 'ko'); fs.mkdirSync(dir, { recursive: true });
  const todo = [...bySeed.keys()].sort((x, y) => x - y).filter((s) => !fs.existsSync(path.join(dir, `${sid(s)}.json`)));
  console.log(`${rng}: ${todo.length} seeds to write (conc ${conc})`);
  let i = 0;
  const worker = async () => {
    while (i < todo.length) {
      const s = todo[i++];
      const legos = bySeed.get(s);
      const prompt = seedPrompt(s, legos, taught, contiguous);
      let out = null, err = null;
      for (let t = 0; t < 2 && !out; t++) {
        try {
          const raw = await claudeChat(prompt, { model: 'opus', system: SYSTEM, timeout: 900000, thinkingTokens: 8000 });
          const j = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
          const parsed = JSON.parse(j);
          // completeness: every original of every LEGO answered with Korean
          const miss = legos.filter((g) => g.originals.length && (!parsed.legos?.[g.lego] || (parsed.legos[g.lego].originals || []).filter((x) => x.ko || x.ok === false).length < g.originals.length));
          if (miss.length) throw new Error(`incomplete: ${miss.map((g) => g.lego).join(',')}`);
          out = parsed;
        } catch (e) { err = e.message; if (/spent|weekly limit/i.test(err)) { console.log(`STOP: account spent — ${err.slice(0, 200)}`); process.exit(4); } }
      }
      if (!out) { console.log(`${sid(s)} FAILED: ${String(err).slice(0, 300)}`); continue; }
      fs.writeFileSync(path.join(dir, `${sid(s)}.json`), JSON.stringify({ seed: s, at: new Date().toISOString(), job: '#251·AL', model: 'opus', ...out }, null, 1));
      const n = legos.reduce((x, g) => x + g.originals.length, 0);
      const rej = Object.values(out.legos || {}).reduce((x, v) => x + (v.originals || []).filter((o) => o.ok === false).length, 0);
      console.log(`${sid(s)} ok: ${legos.length} LEGOs, ${n} originals (${rej} refused)`);
    }
  };
  await Promise.all(Array.from({ length: conc }, worker));
}

// ── plan ──
const nk = (t) => String(t || '').replace(/[’‘`´]/g, "'").toLowerCase().replace(/[^\p{L}\p{N}' ]/gu, ' ').replace(/\s+/g, ' ').trim();
const lidOf = (id) => String(id).match(/S\d{4}L\d{2}/)[0];
function liveIndex(live) {
  const seed = new Map(), lego = new Map(), phrase = new Map();
  for (const s of live.seeds) { seed.set(s.seed_number, s); for (const l of s.legos || []) { lego.set(lidOf(`S${String(s.seed_number).padStart(4, '0')}L${String(l.lego_index).padStart(2, '0')}`), l); for (const p of l.basket_phrases || []) phrase.set(p.id, p); } }
  return { seed, lego, phrase };
}
/** [] when snapshot and live agree on this LEGO, its seed and its rows. Pure. */
function precheck(g, C, L) {
  const why = [];
  const cl = C.lego.get(g.lego), ll = L.lego.get(g.lego);
  if (!ll) return ['LEGO not live'];
  if (ll.known_text !== cl.known_text || ll.target_text !== cl.target_text || !!ll.is_new !== !!cl.is_new) why.push('LEGO changed live');
  const cs = C.seed.get(g.seed), ls = L.seed.get(g.seed);
  if (!ls || cs.known_text !== ls.known_text || cs.target_text !== ls.target_text) why.push(`seed ${g.seed} changed live`);
  const cRows = (cl.basket_phrases || []), lRows = (ll.basket_phrases || []);
  for (const p of cRows) { const q = L.phrase.get(p.id); if (!q) why.push(`${p.id} gone live`); else if (q.known_text !== p.known_text || q.target_text !== p.target_text || q.target1_audio_id || q.target2_audio_id || q.known_audio_id || q.hand_edited_at) why.push(`${p.id} changed live`); }
  const extra = lRows.filter((p) => !cRows.some((q) => q.id === p.id));
  if (extra.length) why.push(`${extra.length} row(s) live the snapshot lacks (${extra.slice(0, 3).map((p) => p.id).join(', ')})`);
  return why;
}
function plan(rng, A, copy, live) {
  const [a, b] = range(rng);
  const { planInsert } = require('../../services/shared/phrase-v4-door.cjs');
  const C = liveIndex(copy), L = liveIndex(live);
  const all = A.legos;
  const ko = (s) => { const f = path.join(DIR, 'ko', `${sid(s)}.json`); return fs.existsSync(f) ? loadJson(f) : null; };
  // course-wide Korean→Welsh map of everything that STAYS (outside the band: the snapshot as it is, or its plan if planned
  // already; inside: built below). Seeds first.
  const byK = new Map();
  const claim = (k, t, who) => { if (!k) return; if (!byK.has(k)) byK.set(k, new Map()); byK.get(k).set(t, who); };
  for (const sd of copy.seeds) claim(nk(sd.known_text), nk(sd.target_text), `seed ${sd.seed_number}`);
  const finals = new Map(); // lego → {keepDoor:[{id,known,target}], originals:[...], fixes:[...], deletes:[...]}
  const held = [], refusedOrig = [], refusedTop = [], thin = [];
  for (const g of all) {
    const inBand = g.seed >= a && g.seed <= b;
    const kf = ko(g.seed);
    const ans = kf && kf.legos && kf.legos[g.lego];
    const doorById = new Map(g.door.map((d) => [d.id, d]));
    // outside the band, not written yet, or held: whatever is LIVE stays (earlier bands' applied rows included)
    const claimLive = () => { for (const p of (L.lego.get(g.lego) || {}).basket_phrases || []) if (p.phrase_role !== 'component') claim(nk(p.known_text), nk(p.target_text), p.id); };
    if (!inBand || !ans) { claimLive(); continue; }
    const pre = precheck(g, C, L);
    if (pre.length) { held.push({ lego: g.lego, why: pre.join('; ') }); claimLive(); continue; }
    const keepTop = new Map(); // id → ko fix or null
    for (const t of ans.topups || []) if (t.keep && doorById.has(t.id) && !doorById.get(t.id).protected.length) keepTop.set(t.id, t.ko && t.ko !== doorById.get(t.id).known ? t.ko : null);
    // the model may keep more than needed: trust its order, cap per role at the shortfall
    const capped = new Map(); const used = { build: 0, use: 0 };
    for (const [id, fix] of keepTop) { const r = doorById.get(id).role; if (used[r] < g.short[r]) { used[r]++; capped.set(id, fix); } }
    for (const t of ans.topups || []) if (!t.keep && t.why) refusedTop.push({ lego: g.lego, id: t.id, known: doorById.get(t.id)?.known, target: doorById.get(t.id)?.target, why: t.why });
    const origs = [];
    g.originals.forEach((o, n) => {
      const v = (ans.originals || []).find((x) => +x.n === n + 1) || {};
      if (v.ok === false) { refusedOrig.push({ lego: g.lego, target: o.target, known: v.ko, en: o.known_en, moved: o.moved, from: o.src_pool === 'hc' ? o.src_seed : `old-${o.src_seed}`, why: v.why }); return; }
      origs.push({ ...o, ko: String(v.ko || '').trim() });
    });
    finals.set(g.lego, { g, capped, origs });
  }
  // claim the staying door rows of the band first (protected + kept top-ups + door rows equal to an original), then new rows
  const inserts = [], fixes = [], deletes = [], zut = [];
  for (const [lego, F] of finals) {
    const { g, capped } = F;
    const origK = new Set(F.origs.map((o) => o.k));
    for (const d of g.door) {
      const stays = d.protected.length || capped.has(d.id) || origK.has(d.k);
      if (stays) claim(nk(capped.get(d.id) || d.known), nk(d.target), d.id);
    }
  }
  const staged = [];
  for (const [lego, F] of finals) {
    const { g, capped } = F;
    const origK = new Set(F.origs.map((o) => o.k));
    for (const [id, fix] of capped) if (fix) fixes.push({ id, lego, from: doorById(g, id).known, to: fix, target: doorById(g, id).target });
    for (const o of F.origs) {
      if (o.already_door_row) continue; // the door row with this Welsh stays and carries it
      const k = nk(o.ko), t = nk(o.target);
      if (!k) { zut.push({ lego, target: o.target, why: 'no Korean written' }); continue; }
      const clash = [...(byK.get(k) || new Map()).entries()].find(([tt]) => tt !== t);
      if (clash) { zut.push({ lego, known: o.ko, target: o.target, why: `ZUT: same Korean is "${clash[0]}" at ${clash[1]}` }); continue; }
      claim(k, t, lego);
      staged.push({ seed_number: g.seed, lego_index: g.idx, lego_target: g.target, phrase_role: o.role, known_text: o.ko, target_text: o.target, _o: o });
    }
    for (const d of g.door) {
      const stays = d.protected.length || capped.has(d.id) || origK.has(d.k);
      if (!stays) deletes.push({ id: d.id, seed_number: g.seed, lego_index: g.idx, known_text: d.known, target_text: d.target });
    }
  }
  const existing = [];
  for (const [lego] of finals) { const l = L.lego.get(lego); for (const p of l.basket_phrases || []) existing.push(p); }
  const { rows, skipped } = planInsert(COURSE, staged.map(({ _o, ...x }) => x), existing);
  const srcOf = new Map(staged.map((x) => [`${x.seed_number}:${x.lego_index}|${nk(x.known_text)}|${nk(x.target_text)}`, x._o]));
  for (const r of rows) {
    const o = srcOf.get(`${r.seed_number}:${r.lego_index}|${nk(r.known_text)}|${nk(r.target_text)}`);
    r.metadata = { format: 'build_use', pipeline: 'option-d-reuse', job: '251', source_course: 'cym_nv2_for_eng', source_phrase_id: o.src_id, source_known_en: o.known_en };
    r.target_text_roman = null;
  }
  // floor after the swap
  for (const [lego, F] of finals) {
    const { g, capped } = F;
    const have = { build: 0, use: 0 };
    const origK = new Set(F.origs.map((o) => o.k));
    for (const d of g.door) if (d.protected.length || capped.has(d.id) || origK.has(d.k)) have[d.role]++;
    for (const r of rows) if (r.seed_number === g.seed && r.lego_index === g.idx) have[r.phrase_role]++;
    if (have.build < g.floor.build || have.use < g.floor.use) thin.push({ lego, have, floor: g.floor });
  }
  return { course: COURSE, range: rng, job: '#251·AL', legos_planned: finals.size, inserts: rows, skipped_same_pair: skipped.length, korean_fixes: fixes, deletes,
    held, refused_originals: refusedOrig, refused_topups: refusedTop, zut_refused: zut, thin };
}
const doorById = (g, id) => g.door.find((d) => d.id === id);

function planFile(rng) { return path.join(DIR, `plan-${rng}.json`); }
const insFile = (rng) => path.join(DIR, `${rng}.insert.changeset.jsonl`);
const delFile = (rng) => path.join(DIR, `${rng}.delete.changeset.jsonl`);
const KAI_GO = 'kai:2026-11-24T17:55Z "Happy with that - go for it, carefully" (option D, #248 d/88008158)';
function insertCs(rng) {
  const cs = require('../../services/shared/changeset.cjs');
  const p = loadJson(planFile(rng));
  const ops = [];
  for (const r of p.inserts) ops.push(cs.op('phrase.insert', { row: r }));
  for (const f of p.korean_fixes) ops.push(cs.op('phrase.update', { phrase_id: f.id, set: { known_text: f.to }, expect: { known_text: f.from, target_text: f.target } }));
  cs.write(insFile(rng), { id: `${COURSE}-cs251-${rng}-insert`, course: COURSE, job: '#251·AL', kai_go: KAI_GO,
    why: `option-D baskets ${rng}: original Welsh phrases with Korean prompts, plus Korean fixes on kept top-ups (door rows go in the delete changeset, built from this ledger)`,
    source: `plan-${rng}.json` }, ops);
  console.log(`${rng}: insert changeset ${ops.length} ops (${p.inserts.length} inserts, ${p.korean_fixes.length} Korean fixes)`);
}
function deleteCs(rng) {
  const cs = require('../../services/shared/changeset.cjs');
  const { loadLedger } = require('../changeset/apply-changeset.cjs');
  const p = loadJson(planFile(rng));
  const { ops: insOps } = cs.read(insFile(rng));
  const fate = loadLedger(`${insFile(rng)}.applied.jsonl`);
  const bad = new Set();
  insOps.forEach((o, i) => { if (!['applied', 'already'].includes(fate.get(i))) bad.add(lidOf(o.op === 'phrase.insert' ? o.row.id : o.phrase_id)); });
  const ops = [];
  for (const d of p.deletes) if (!bad.has(lidOf(d.id))) ops.push(cs.op('phrase.delete', { phrase_id: d.id, expect: { seed_number: d.seed_number, lego_index: d.lego_index, known_text: d.known_text, target_text: d.target_text } }));
  cs.write(delFile(rng), { id: `${COURSE}-cs251-${rng}-delete`, course: COURSE, job: '#251·AL', kai_go: KAI_GO,
    why: `option-D baskets ${rng}: door-generated rows replaced by originals (only LEGOs whose inserts all landed; ${bad.size} LEGOs keep their door rows)`,
    source: `${path.basename(insFile(rng))}.applied.jsonl + plan-${rng}.json` }, ops);
  console.log(`${rng}: delete changeset ${ops.length} ops; ${bad.size} LEGOs kept whole (${[...bad].join(' ')})`);
}
function verify(rng, live) {
  const p = loadJson(planFile(rng));
  const L = liveIndex(live);
  const out = { range: rng, planned_inserts: p.inserts.length, inserts_missing: p.inserts.filter((r) => !L.phrase.has(r.id)).length,
    planned_deletes: p.deletes.length, deletes_left: p.deletes.filter((d) => L.phrase.has(d.id)).length,
    fixes_not_live: p.korean_fixes.filter((f) => (L.phrase.get(f.id) || {}).known_text !== f.to).length };
  console.log(JSON.stringify(out));
  return out;
}

module.exports = { seedPrompt, containedGlosses, SYSTEM, plan, precheck, contiguous };

if (require.main === module) {
  const [mode, ...args] = process.argv.slice(2);
  (async () => {
    if (mode === 'korean') await korean(args[0], Number(args[1]) || 3, args[2] || path.join(EV, 'assign.json'), args[3] || path.join(EV, 'cym_for_kor.json'));
    else if (mode === 'prompt') { // print one seed's prompt (for reading / sizing; no model call)
      const A = loadJson(path.join(EV, 'assign.json'));
      const taught = taughtIndex(loadJson(path.join(EV, 'cym_for_kor.json')));
      console.log(seedPrompt(+args[0], A.legos.filter((g) => g.seed === +args[0]), taught, contiguous));
    } else if (mode === 'plan') {
      const [rng, livePath, copyPath] = args;
      const p = plan(rng, loadJson(path.join(EV, 'assign.json')), loadJson(copyPath || path.join(EV, 'cym_for_kor.json')), loadJson(livePath));
      fs.writeFileSync(planFile(rng), JSON.stringify(p, null, 1));
      console.log(`${rng}: ${p.legos_planned} LEGOs; ${p.inserts.length} inserts, ${p.korean_fixes.length} Korean fixes, ${p.deletes.length} deletes; held ${p.held.length}, originals refused ${p.refused_originals.length}, ZUT refused ${p.zut_refused.length}, thin ${p.thin.length}`);
    } else if (mode === 'insert-cs') insertCs(args[0]);
    else if (mode === 'delete-cs') deleteCs(args[0]);
    else if (mode === 'verify') verify(args[0], loadJson(args[1]));
    else { console.error('mode: korean <from-to> [conc] | prompt <seed> | plan <from-to> <liveSeeds> [snapshot] | insert-cs | delete-cs | verify'); process.exit(64); }
  })().catch((e) => { console.error(e); process.exit(1); });
}
