#!/usr/bin/env node
/**
 * PREMIUM COURSE QA PASS — the measures, one arithmetic for both arms.
 *
 * Tom, 2026-09-27: improve "the phrase quality ... in terms of usefulness,
 * frame diversity, comprehensive coverage across the whole 668 SEEDS". Every
 * measure below is computed IDENTICALLY for the live course and for a v3
 * candidate set, so a difference is a difference in the phrases and not in the
 * ruler. Usefulness is the one thing arithmetic cannot see; it is judged by a
 * model elsewhere (judge-use.cjs, and a blind cross-family pairwise judge).
 *
 * THE MEASURES
 *
 *  COVERAGE — is every seed and every LEGO practised?
 *    seeds with target text / seeds with LEGOs, out of the 668 canon;
 *    LEGOs meeting the floor (>=4 BUILD and >=5 USE, Tom 2026-06-16), LEGOs with
 *    ZERO USE; and REAPPEARANCE — how many later baskets' phrases carry this
 *    LEGO's target. A LEGO never heard again after its own round is taught once
 *    and left to rot; only USE enters spaced repetition.
 *
 *  FRAME DIVERSITY — the "good stem + new LEGO" laziness v3 exists to stop
 *  (Tom, 2026-09-20). A phrase's STEM is its known text with the LEGO's own
 *  known text slotted out (◇); its OPENER is the stem's first three tokens.
 *    distinct-opener ratio = distinct openers / phrases, per third;
 *    EARLY-STEM REUSE = share of phrases whose opener already occurs in a
 *    DIFFERENT seed among seeds 1-30 — "I want to ◇", "I'm going to ◇" carried
 *    forward five hundred seeds.
 *
 *  PARTNER RECENCY — the same laziness seen from the target side. Every other
 *  course LEGO (introduced by then) found in the phrase's target is a PARTNER;
 *  EARLY-PARTNER SHARE = partners from seeds 1-30 / all partners. A late basket
 *  built only from the ancient safe core scores near 1.
 *
 *  WHAT v3 ALREADY SCORES — score.cjs (ZUT gate, edge combos, recency mass,
 *  floors) and the frame-layer declaration composite, run on both arms.
 *
 * Matching is substring on normalised text at word boundaries. Welsh mutates
 * initial consonants (Cymraeg/Gymraeg), so a mutated partner is not seen — that
 * under-counts partners equally in both arms and is stated, not hidden.
 *
 * READ-ONLY. Writes nothing to any database.
 *
 * Usage:
 *   node tools/phrase-lab/qa-pass-measure.cjs course cym_s_for_eng --json out.json
 *   node tools/phrase-lab/qa-pass-measure.cjs sample cym_s_for_eng --v3 v3.json --json cmp.json
 *   node tools/phrase-lab/qa-pass-measure.cjs estate --json estate.json   # coverage + diversity, every premium course
 */

require('dotenv').config({ quiet: true });
const fs = require('fs');
const { thirdsOf, FIRST_REGENERATED_SEED } = require('./qa-pass-generate.cjs');

const EARLY_STEM_MAX_SEED = 30;
const BUILD_FLOOR = 4;
const USE_FLOOR = 5;

const norm = (s) => String(s || '').toLowerCase()
  .replace(/[’‘`´]/g, "'")
  .replace(/[.,!?¿¡;:"“”()«»…—–-]+/g, ' ')
  .replace(/\s+/g, ' ').trim();
const pad = (s) => ` ${s} `;

/**
 * WELSH INITIAL MUTATION. A LEGO taught as "problem" is heard as "broblem"
 * after "y"; a plain substring test calls that phrase lego-absent and calls
 * the partner missing. So for cym courses every key is tried in each mutated
 * and de-mutated form of its FIRST word (soft, nasal, aspirate, h-prefix).
 * Without this, half the Welsh course reads as not practising its own LEGO.
 */
const MUT = [
  ['p', ['b', 'mh', 'ph']], ['t', ['d', 'nh', 'th']], ['c', ['g', 'ngh', 'ch']],
  ['b', ['f', 'm']], ['d', ['dd', 'n']], ['g', ['', 'ng']], ['m', ['f']],
  ['ll', ['l']], ['rh', ['r']],
];
function initialForms(word) {
  const out = new Set([word]);
  const radicals = new Set([word]);
  // De-mutate first (the LEGO itself may be stored mutated), then mutate.
  for (const [rad, muts] of MUT) for (const m of muts) {
    if (m && word.startsWith(m)) radicals.add(rad + word.slice(m.length));
  }
  if (/^[aeiouwyâêîôûŵŷ]/.test(word)) for (const [rad] of [['g']]) radicals.add(rad + word);
  if (/^h[aeiouwy]/.test(word)) radicals.add(word.slice(1));
  for (const r of radicals) {
    out.add(r);
    for (const [rad, muts] of MUT) if (r.startsWith(rad) && !(rad === 'l' || rad === 'r')) for (const m of muts) out.add(m + r.slice(rad.length));
    if (/^[aeiouwy]/.test(r)) out.add(`h${r}`);
  }
  return [...out].filter(Boolean);
}
function keyForms(key, lang) {
  if (lang !== 'cym' || !key) return [key];
  const [first, ...rest] = key.split(' ');
  return initialForms(first).map((f) => [f, ...rest].join(' '));
}
/** Replace the first occurrence of any form of `key` in padded `t`; returns [found, t']. */
function takeKey(t, key, lang) {
  for (const f of keyForms(key, lang)) {
    const k = pad(f);
    if (t.includes(k)) return [true, t.replace(k, ' ▮ ')];
  }
  return [false, t];
}

/** Stem: known text with the LEGO's own known text slotted out. */
function stemOf(known, legoKnown) {
  const k = pad(norm(known));
  const l = norm(legoKnown);
  if (!l) return k.trim();
  const i = k.indexOf(pad(l));
  return i === -1 ? k.trim() : `${k.slice(0, i)} ◇ ${k.slice(i + l.length + 2)}`.replace(/\s+/g, ' ').trim();
}
const openerOf = (stem) => stem.split(' ').slice(0, 3).join(' ');

async function fetchAll(supabase, table, select, courseCode) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select(select).eq('course_code', courseCode)
      .order('seed_number').order('id').range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...data);
    if (data.length < 1000) return out;
  }
}

async function loadCourse(supabase, courseCode) {
  const [seeds, legos, phrases] = await Promise.all([
    fetchAll(supabase, 'course_seeds', 'id,seed_number,known_text,target_text', courseCode),
    fetchAll(supabase, 'course_legos', 'id,seed_number,lego_index,lego_id,type,known_text,target_text', courseCode),
    fetchAll(supabase, 'course_practice_phrases', 'id,seed_number,lego_index,phrase_role,known_text,target_text', courseCode),
  ]);
  return { courseCode, seeds, legos, phrases: phrases.filter((p) => p.phrase_role === 'build' || p.phrase_role === 'use') };
}

/** The course-wide context both arms are measured against. */
function courseContext(c) {
  const legoOf = new Map(c.legos.map((l) => [`${l.seed_number}:${l.lego_index}`, l]));
  // Early stems: opener -> seeds (1-30) it occurs in.
  const earlyStems = new Map();
  for (const p of c.phrases) {
    if (p.seed_number > EARLY_STEM_MAX_SEED) continue;
    const l = legoOf.get(`${p.seed_number}:${p.lego_index}`);
    const o = openerOf(stemOf(p.known_text, l?.known_text));
    if (!earlyStems.has(o)) earlyStems.set(o, new Set());
    earlyStems.get(o).add(p.seed_number);
  }
  // Partner dictionary: LEGO targets, longest first, one-syllable function
  // words dropped (a two-letter target matches everywhere and says nothing).
  const partners = c.legos
    .map((l) => ({ key: norm(l.target_text), seed: l.seed_number, idx: l.lego_index }))
    .filter((p) => p.key.length >= 3)
    .sort((a, b) => b.key.length - a.key.length);
  const lang = String(c.courseCode).split('_for_')[0].split('_')[0];
  return { legoOf, earlyStems, partners, lang };
}

/** Per-phrase measures, arm-independent. */
function measurePhrase(ctx, seed, legoIndex, legoKnown, legoTarget, p) {
  const stem = stemOf(p.known, legoKnown);
  const opener = openerOf(stem);
  const es = ctx.earlyStems.get(opener);
  const earlyStem = !!es && [...es].some((s) => s !== seed);
  let t = pad(norm(p.target));
  const own = norm(legoTarget);
  let present = null;
  if (own) [present, t] = takeKey(t, own, ctx.lang);
  const found = [];
  for (const q of ctx.partners) {
    if (q.seed > seed || (q.seed === seed && q.idx >= legoIndex)) continue;
    let hit;
    [hit, t] = takeKey(t, q.key, ctx.lang);
    if (hit) found.push(q.seed);
  }
  return { stem, opener, earlyStem, partnerSeeds: found, lego_present: present };
}

function summarise(rows) {
  const n = rows.length;
  const openers = new Set(rows.map((r) => r.opener));
  const partners = rows.flatMap((r) => r.partnerSeeds);
  const r2 = (x) => (Number.isFinite(x) ? Number(x.toFixed(3)) : null);
  return {
    phrases: n,
    distinctOpenerRatio: n ? r2(openers.size / n) : null,
    earlyStemReuse: n ? r2(rows.filter((r) => r.earlyStem).length / n) : null,
    earlyPartnerShare: partners.length ? r2(partners.filter((s) => s <= EARLY_STEM_MAX_SEED).length / partners.length) : null,
    partnersPerPhrase: n ? r2(partners.length / n) : null,
    // A practice phrase that does not contain its own LEGO is not practising it.
    legoAbsentShare: n ? r2(rows.filter((r) => r.lego_present === false).length / n) : null,
  };
}

/** COURSE mode: every live phrase, by third, plus coverage. */
function measureCourse(c) {
  const ctx = courseContext(c);
  const withLegos = [...new Set(c.legos.map((l) => l.seed_number))];
  const maxSeed = withLegos.length ? Math.max(...withLegos) : 0;
  const thirds = maxSeed > FIRST_REGENERATED_SEED ? thirdsOf(maxSeed) : [];
  const bands = [{ name: 'seeds 1-10 (hand-tweaked)', from: 1, to: 10 }, ...thirds];
  const bandOf = (s) => bands.find((b) => s >= b.from && s <= b.to)?.name;

  const rowsBy = {};
  for (const p of c.phrases) {
    const l = ctx.legoOf.get(`${p.seed_number}:${p.lego_index}`);
    const m = measurePhrase(ctx, p.seed_number, p.lego_index, l?.known_text, l?.target_text, { known: p.known_text, target: p.target_text });
    const key = `${bandOf(p.seed_number)}|${p.phrase_role}`;
    (rowsBy[key] ||= []).push({ ...m, seed: p.seed_number, known: p.known_text });
  }

  // Coverage per LEGO.
  const counts = new Map();
  for (const p of c.phrases) {
    const k = `${p.seed_number}:${p.lego_index}`;
    const e = counts.get(k) || { build: 0, use: 0 };
    e[p.phrase_role] += 1;
    counts.set(k, e);
  }
  // Reappearance: later baskets' phrases carrying this LEGO's target.
  const laterText = c.phrases.map((p) => ({ seed: p.seed_number, key: `${p.seed_number}:${p.lego_index}`, t: pad(norm(p.target_text)), role: p.phrase_role }));
  const legoRows = c.legos.map((l) => {
    const k = `${l.seed_number}:${l.lego_index}`;
    const e = counts.get(k) || { build: 0, use: 0 };
    const forms = keyForms(norm(l.target_text), ctx.lang).map(pad);
    const reUse = norm(l.target_text).length >= 3
      ? laterText.filter((x) => x.seed > l.seed_number && x.role === 'use' && forms.some((f) => x.t.includes(f))).length : null;
    return { seed: l.seed_number, idx: l.lego_index, known: l.known_text, target: l.target_text, ...e, laterUse: reUse };
  });

  const seedsWithTarget = c.seeds.filter((s) => norm(s.target_text)).length;
  const out = { courseCode: c.courseCode, maxLegoSeed: maxSeed, seeds: c.seeds.length, seedsWithTarget, seedsWithLegos: withLegos.length, bands: [] };
  for (const b of bands) {
    const ls = legoRows.filter((l) => l.seed >= b.from && l.seed <= b.to);
    const measurable = ls.filter((l) => l.laterUse !== null);
    const sorted = measurable.map((l) => l.laterUse).sort((x, y) => x - y);
    out.bands.push({
      band: b.name, from: b.from, to: b.to,
      coverage: {
        legos: ls.length,
        meetsFloor: ls.filter((l) => l.build >= BUILD_FLOOR && l.use >= USE_FLOOR).length,
        zeroUse: ls.filter((l) => l.use === 0).length,
        zeroBuild: ls.filter((l) => l.build === 0).length,
        meanBuild: ls.length ? Number((ls.reduce((a, l) => a + l.build, 0) / ls.length).toFixed(2)) : null,
        meanUse: ls.length ? Number((ls.reduce((a, l) => a + l.use, 0) / ls.length).toFixed(2)) : null,
        neverInALaterUse: measurable.filter((l) => l.laterUse === 0).length,
        medianLaterUse: sorted.length ? sorted[Math.floor(sorted.length / 2)] : null,
      },
      use: summarise(rowsBy[`${b.name}|use`] || []),
      build: summarise(rowsBy[`${b.name}|build`] || []),
      topLateOpeners: topOpeners(rowsBy[`${b.name}|use`] || []),
    });
  }
  return out;
}

function topOpeners(rows, n = 8) {
  const m = new Map();
  for (const r of rows) m.set(r.opener, (m.get(r.opener) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([o, k]) => `${o} (${k})`);
}

/** SAMPLE mode: the same measures on the sampled LEGOs, live vs v3. */
async function measureSample(supabase, c, v3Sets) {
  const ctx = courseContext(c);
  const { buildInventory } = require('./inventory.cjs');
  const { scoreSet } = require('./score.cjs');
  const { computeDeclaration, checkDeclaration } = require('../frame-layer/declaration.cjs');

  const per = [];
  for (const s of v3Sets) {
    if (s.error) { per.push({ seed: s.seedNumber, lego: s.legoIndex, third: s.third, error: s.error }); continue; }
    const L = ctx.legoOf.get(`${s.seedNumber}:${s.legoIndex}`);
    const live = c.phrases.filter((p) => p.seed_number === s.seedNumber && p.lego_index === s.legoIndex)
      .map((p) => ({ role: p.phrase_role, known: p.known_text, target: p.target_text }));
    const v3 = [...s.build.map((p) => ({ ...p, role: 'build' })), ...s.use.map((p) => ({ ...p, role: 'use' }))];
    const inv = await buildInventory(supabase, c.courseCode, s.seedNumber, s.legoIndex);
    let decl = null;
    try { decl = await computeDeclaration(supabase, c.courseCode, s.seedNumber, s.legoIndex); } catch { /* reported as null */ }
    const arm = (phrases) => {
      const rows = phrases.map((p) => ({ role: p.role, ...measurePhrase(ctx, s.seedNumber, s.legoIndex, L.known_text, L.target_text, p) }));
      const sc = phrases.length ? scoreSet(inv, phrases) : null;
      const dc = decl ? checkDeclaration(decl, phrases.map((p) => ({ phrase_role: p.role, known_text: p.known, target_text: p.target }))) : null;
      const b = phrases.filter((p) => p.role === 'build').length;
      const u = phrases.filter((p) => p.role === 'use').length;
      return {
        build: b, use: u, meetsFloor: b >= BUILD_FLOOR && u >= USE_FLOOR,
        useM: summarise(rows.filter((r) => r.role === 'use')),
        buildM: summarise(rows.filter((r) => r.role === 'build')),
        gateFailures: sc ? sc.headline.gateFailures : null,
        edgeCombos: sc ? sc.headline.edgeCombos : null,
        recencyMassUse: sc ? sc.use.recencyMass : null,
        scorerPass: sc ? sc.verdict.build.pass && sc.verdict.use.pass : false,
        declComposite: dc && dc.checked ? dc.composite : null,
        declPass: dc && dc.checked ? dc.pass : null,
      };
    };
    per.push({
      seed: s.seedNumber, lego: s.legoIndex, third: s.third, legoKnown: L.known_text, legoTarget: L.target_text,
      v3Blocked: s.blocked, v3Attempts: s.attempts?.length, v3ElapsedMs: s.elapsedMs,
      live: arm(live), v3: arm(v3),
    });
  }
  return { courseCode: c.courseCode, per, byThird: rollup(per) };
}

function rollup(per) {
  const out = {};
  for (const third of ['early', 'mid', 'late', 'all']) {
    const ps = per.filter((p) => !p.error && (third === 'all' || p.third === third));
    const agg = (arm) => {
      const mean = (f) => { const v = ps.map((p) => f(p[arm])).filter((x) => x !== null && x !== undefined); return v.length ? Number((v.reduce((a, b) => a + b, 0) / v.length).toFixed(3)) : null; };
      return {
        sets: ps.length,
        meanBuild: mean((a) => a.build), meanUse: mean((a) => a.use),
        meetsFloor: ps.filter((p) => p[arm].meetsFloor).length,
        zeroUse: ps.filter((p) => p[arm].use === 0).length,
        useDistinctOpenerRatio: mean((a) => a.useM.distinctOpenerRatio),
        useEarlyStemReuse: mean((a) => a.useM.earlyStemReuse),
        useEarlyPartnerShare: mean((a) => a.useM.earlyPartnerShare),
        useLegoAbsentShare: mean((a) => a.useM.legoAbsentShare),
        buildEarlyStemReuse: mean((a) => a.buildM.earlyStemReuse),
        gateFailingSets: ps.filter((p) => p[arm].gateFailures > 0).length,
        edgeCombos: mean((a) => a.edgeCombos),
        recencyMassUse: mean((a) => a.recencyMassUse),
        scorerPass: ps.filter((p) => p[arm].scorerPass).length,
        declComposite: mean((a) => a.declComposite),
      };
    };
    out[third] = { live: agg('live'), v3: agg('v3'), v3Blocked: ps.filter((p) => p.v3Blocked).length, holes: per.filter((p) => p.error && (third === 'all' || p.third === third)).length };
  }
  return out;
}

async function main() {
  const [cmd, courseCode, ...rest] = process.argv.slice(2);
  const all = process.argv.slice(2);
  const arg = (k) => (all.includes(k) ? all[all.indexOf(k) + 1] : null);
  const { supabase } = require('../../services/supabase-client.cjs');
  let result;
  if (cmd === 'course') {
    result = measureCourse(await loadCourse(supabase, courseCode));
  } else if (cmd === 'sample') {
    const v3 = JSON.parse(fs.readFileSync(arg('--v3'), 'utf8'));
    result = await measureSample(supabase, await loadCourse(supabase, courseCode), v3);
  } else if (cmd === 'estate') {
    const courses = (arg('--courses') || courseCode || '').split(',').filter(Boolean);
    result = [];
    for (const cc of courses) {
      process.stderr.write(`${cc} `);
      result.push(measureCourse(await loadCourse(supabase, cc)));
    }
  } else {
    console.error('usage: course <c> | sample <c> --v3 <file> | estate --courses a,b,c  [--json out]');
    process.exit(1);
  }
  const s = JSON.stringify(result, null, 2);
  if (arg('--json')) fs.writeFileSync(arg('--json'), s); else console.log(s);
  void rest;
}

module.exports = { initialForms, keyForms, stemOf, openerOf, measurePhrase, courseContext, measureCourse, summarise, EARLY_STEM_MAX_SEED };

if (require.main === module) main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
