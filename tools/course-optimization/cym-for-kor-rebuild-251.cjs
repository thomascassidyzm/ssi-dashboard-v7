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
// Later modes (plan with live pre-check, changesets, verify) are added as the bands reach them.
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
          const miss = legos.filter((g) => g.originals.length && (!parsed.legos?.[g.lego] || (parsed.legos[g.lego].originals || []).filter((x) => x.ko).length < g.originals.length));
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

module.exports = { seedPrompt, containedGlosses, SYSTEM };

if (require.main === module) {
  const [mode, ...args] = process.argv.slice(2);
  (async () => {
    if (mode === 'korean') await korean(args[0], Number(args[1]) || 3, args[2] || path.join(EV, 'assign.json'), args[3] || path.join(EV, 'cym_for_kor.json'));
    else if (mode === 'prompt') { // print one seed's prompt (for reading / sizing; no model call)
      const A = loadJson(path.join(EV, 'assign.json'));
      const taught = taughtIndex(loadJson(path.join(EV, 'cym_for_kor.json')));
      console.log(seedPrompt(+args[0], A.legos.filter((g) => g.seed === +args[0]), taught, contiguous));
    } else { console.error('mode: korean <from-to> [conc] | prompt <seed>'); process.exit(64); }
  })().catch((e) => { console.error(e); process.exit(1); });
}
