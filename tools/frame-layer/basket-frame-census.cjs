#!/usr/bin/env node
/**
 * DISTINCT FRAMES PER LEGO BASKET — the baseline census for Tom's objective
 * function (2026-09-06): "how can I get better phrase quality for learners,
 * measured by the number of different frames the learner is exposed to per
 * LEGO BASKET."
 *
 * MEASURES, NEVER RE-IMPLEMENTS. A "distinct frame" here is a distinct
 * `frameSig(matrixClause(known_text), MERGED)` — the exact function and the
 * exact merged matcher list (31 P-frames + 12 D-frames) that
 * pattern-diversity.cjs scores with and the production door's declaration is
 * checked with. The basket is (course, seed_number, lego_index) over
 * non-component practice phrases — the same grouping scoreBaskets uses, for
 * the reason recorded there (lego_id is null on nearly every phrase row).
 *
 * The POOL per basket is computed the way computeDeclaration computes it:
 *   seed side — attestedFrames over this course's own seeds at or before this
 *               one (P* pass the OWNED gate trivially, by construction);
 *   pod side  — instantiableFrameSet's OWNED gate over the vocabulary this
 *               basket owns: everything admitted before it, plus its own LEGO
 *               and its own components (the 36/36-rejection window).
 * The seed side is derived from one attestedFrames() call over the whole seed
 * list (first-seen map filtered to <= seed N — same verdict, one pass); the
 * pod side calls instantiableFrameSet per basket with an empty seed history so
 * only the OWNED gate runs. Verdicts are identical to the declaration's;
 * only the loop shape differs.
 *
 * READ-ONLY. Writes nothing to any database. Evidence JSON goes to the
 * evidence store (tools/lib/evidence-path.cjs), never the tracked tree.
 *
 * usage:
 *   node tools/frame-layer/basket-frame-census.cjs --census
 *       one line per course in the catalogue: is the known side English (can
 *       the frame layer see it at all), and its seed/lego/phrase volumes.
 *   node tools/frame-layer/basket-frame-census.cjs <course>
 *       the full per-basket baseline for one course, with the distribution.
 */
require('dotenv').config({ quiet: true });
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const { pageAll, pairOf, knownSideIsEnglish } = require('./corpus.cjs');
const { attestedFrames, instantiableFrameSet, loadDialogueFrames, norm } = require('./availability.cjs');
const { frameSig, matrixClause, MERGED } = require('./pattern-diversity.cjs');
const { evidencePath } = require('../lib/evidence-path.cjs');

function client() {
  if (!process.env.SUPABASE_URL) {
    // worktrees don't carry .env — fall back to the shared checkout's
    require('dotenv').config({ path: '/home/tomcassidy/ssi-dashboard-v7-clean/.env', quiet: true });
  }
  return createClient(process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** ── catalogue applicability census ────────────────────────────────────── */
async function census(sb) {
  const courses = await pageAll(sb, 'courses', 'course_code', q => q.order('course_code'));
  const rows = [];
  for (const { course_code } of courses) {
    const count = async (table) => {
      const { count: c, error } = await sb.from(table)
        .select('*', { count: 'exact', head: true }).eq('course_code', course_code);
      if (error) throw new Error(`${table}/${course_code}: ${error.message}`);
      return c || 0;
    };
    const [seeds, legos, phrases] = await Promise.all([
      count('course_seeds'), count('course_legos'), count('course_practice_phrases')]);
    rows.push({ course: course_code, known: pairOf(course_code).known,
                english_known: knownSideIsEnglish(course_code), seeds, legos, phrases });
  }
  return rows;
}

/** ── per-course baseline ───────────────────────────────────────────────── */
async function courseBaseline(sb, course) {
  if (!knownSideIsEnglish(course)) {
    return { course, applicable: false,
             reason: `known side of ${course} is not English; the frame layer cannot see it` };
  }
  const [seeds, legos, phrases] = await Promise.all([
    pageAll(sb, 'course_seeds', 'seed_number,known_text,target_text',
      q => q.eq('course_code', course).order('seed_number')),
    pageAll(sb, 'course_legos', 'seed_number,lego_index,type,known_text,target_text',
      q => q.eq('course_code', course).order('seed_number').order('lego_index')),
    pageAll(sb, 'course_practice_phrases', 'seed_number,lego_index,phrase_role,known_text',
      q => q.eq('course_code', course).order('seed_number').order('lego_index')),
  ]);

  // seed-side pool: first-seen map over the whole course, filtered per seed
  const firstSeen = attestedFrames(seeds);           // Map<P id, first seed>
  const firstsAsc = [...firstSeen.values()].sort((a, b) => a - b);
  const seedPoolAt = (n) => { let c = 0; for (const f of firstsAsc) { if (f <= n) c++; else break; } return c; };

  // phrases by basket; components by (seed, lego_index) for the vocab window
  const byBasket = new Map(), compsBy = new Map();
  for (const p of phrases) {
    const k = `${p.seed_number}|${p.lego_index}`;
    if (p.phrase_role === 'component') { (compsBy.get(k) || compsBy.set(k, []).get(k)).push(p); }
    else { (byBasket.get(k) || byBasket.set(k, []).get(k)).push(p); }
  }

  const dialogueFrames = loadDialogueFrames();
  const legosBySeed = new Map();
  for (const l of legos) (legosBySeed.get(l.seed_number) || legosBySeed.set(l.seed_number, []).get(l.seed_number)).push(l);

  const baskets = [];
  const podFirstOwned = new Map();                   // pod frame id -> {seed, lego_index}
  const vocabRows = [];                              // admitted so far, in admission order
  for (const s of seeds) {
    const own = (legosBySeed.get(s.seed_number) || []).sort((a, b) => +a.lego_index - +b.lego_index);
    for (const l of own) {
      const k = `${s.seed_number}|${l.lego_index}`;
      const ownComps = compsBy.get(k) || [];
      const basketVocab = vocabRows.concat([l], ownComps);
      const podPool = instantiableFrameSet({ vocab: basketVocab, priorSeeds: [], seedRow: null, dialogueFrames });
      for (const p of podPool) if (!podFirstOwned.has(p.id))
        podFirstOwned.set(p.id, { seed: s.seed_number, lego_index: +l.lego_index });
      const practice = byBasket.get(k) || [];
      const sigs = new Set(practice.map(p => frameSig(matrixClause(p.known_text), MERGED)));
      const podIds = new Set(podPool.map(p => p.id));
      const firedPod = new Set();
      for (const sig of sigs) for (const id of (sig === '∅' ? [] : sig.split('+'))) if (podIds.has(id)) firedPod.add(id);
      const pool = seedPoolAt(s.seed_number) + podPool.length;
      const n = practice.length;
      baskets.push({
        seed: s.seed_number, lego_index: +l.lego_index, lego: l.known_text,
        n, distinct: sigs.size, sigs: [...sigs],
        pool_seed: seedPoolAt(s.seed_number), pool_pod: podPool.length, pod_ids: [...podIds],
        pod_fired: [...firedPod],
        ceiling: Math.max(1, Math.min(n, pool)),
        ratio: n ? +(Math.min(1, sigs.size / Math.max(1, Math.min(n, pool)))).toFixed(3) : null,
      });
      vocabRows.push(l, ...ownComps);
    }
  }

  // which pod frames never clear OWNED, and what blocks them (against the
  // course's FINAL vocabulary — if it is blocked there it is blocked everywhere)
  const finalKnown = new Set(vocabRows.map(v => norm(v.known_text)).filter(Boolean));
  const blocked = dialogueFrames.filter(f => !podFirstOwned.has(f.id)).map(f => {
    const alts = (f.fixed_material || []).map(alt => ({
      alt, missing: alt.filter(c => !finalKnown.has(norm(c))) }));
    alts.sort((a, b) => a.missing.length - b.missing.length);
    return { id: f.id, name: f.name, grain: f.grain,
             nearest_alternate: alts[0] ? alts[0].alt : [], missing: alts[0] ? alts[0].missing : [] };
  });

  return { course, applicable: true, seeds: seeds.length, legos: legos.length,
           practice_phrases: phrases.filter(p => p.phrase_role !== 'component').length,
           merged_matchers: MERGED.length, baskets,
           pod_first_owned: Object.fromEntries([...podFirstOwned]), pod_blocked: blocked };
}

/** ── distribution summary for the console ──────────────────────────────── */
function summarise(r) {
  const scored = r.baskets.filter(b => b.n > 0);
  const empty = r.baskets.length - scored.length;
  const hist = {};
  for (const b of scored) hist[b.distinct] = (hist[b.distinct] || 0) + 1;
  const mean = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
  const bands = [[1, 20], [21, 100], [101, 300], [301, Infinity]];
  const bandRows = bands.map(([lo, hi]) => {
    const in_ = scored.filter(b => b.seed >= lo && b.seed <= hi);
    return in_.length ? {
      band: hi === Infinity ? `${lo}+` : `${lo}-${hi}`, baskets: in_.length,
      mean_raw: +mean(in_.map(b => b.distinct)).toFixed(2),
      mean_ratio: +mean(in_.map(b => b.ratio)).toFixed(3),
      pct_one: +(100 * in_.filter(b => b.distinct <= 1).length / in_.length).toFixed(1),
      mean_pool: +mean(in_.map(b => b.pool_seed + b.pool_pod)).toFixed(1),
      mean_pod_pool: +mean(in_.map(b => b.pool_pod)).toFixed(1),
      pct_pod_fired: +(100 * in_.filter(b => b.pod_fired.length > 0).length / in_.length).toFixed(1),
    } : null;
  }).filter(Boolean);
  return {
    baskets: r.baskets.length, scored: scored.length, empty_baskets: empty,
    mean_distinct: +mean(scored.map(b => b.distinct)).toFixed(2),
    mean_ratio: +mean(scored.map(b => b.ratio)).toFixed(3),
    pct_exactly_one: +(100 * scored.filter(b => b.distinct === 1).length / scored.length).toFixed(1),
    histogram: hist, bands: bandRows,
    pod_pool_nonempty_pct: +(100 * scored.filter(b => b.pool_pod > 0).length / scored.length).toFixed(1),
    pod_fired_pct: +(100 * scored.filter(b => b.pod_fired.length > 0).length / scored.length).toFixed(1),
  };
}

module.exports = { census, courseBaseline, summarise };

if (require.main === module) {
  (async () => {
    const sb = client();
    const arg = process.argv[2];
    if (!arg || arg === '--census') {
      const rows = await census(sb);
      const eng = rows.filter(r => r.english_known);
      const out = evidencePath('tools/frame-layer/census-catalogue.json');
      fs.writeFileSync(out, JSON.stringify(rows, null, 2));
      for (const r of rows) console.log(
        `${r.course.padEnd(24)} known=${String(r.known).padEnd(4)} ${r.english_known ? 'ENG ' : '    '} seeds=${String(r.seeds).padStart(5)} legos=${String(r.legos).padStart(6)} phrases=${String(r.phrases).padStart(7)}`);
      console.log(`\n${rows.length} courses; ${eng.length} with an English known side ` +
        `(${(100 * eng.length / rows.length).toFixed(0)}%); phrase rows in-scope ` +
        `${eng.reduce((a, r) => a + r.phrases, 0)} of ${rows.reduce((a, r) => a + r.phrases, 0)}`);
      console.log(`evidence: ${out}`);
      return;
    }
    const t0 = Date.now();
    const r = await courseBaseline(sb, arg);
    if (!r.applicable) { console.log(`${arg}: NOT APPLICABLE — ${r.reason}`); return; }
    const s = summarise(r);
    const out = evidencePath(`tools/frame-layer/census-${arg}.json`);
    fs.writeFileSync(out, JSON.stringify({ ...r, summary: s }, null, 2));
    console.log(`${arg}: ${r.seeds} seeds, ${r.legos} legos, ${r.practice_phrases} practice phrases, ${s.baskets} baskets (${s.empty_baskets} empty)`);
    console.log(`distinct frames per basket: mean ${s.mean_distinct} raw, ${s.mean_ratio} of ceiling; ${s.pct_exactly_one}% of baskets fire exactly ONE signature`);
    console.log(`histogram: ${Object.entries(s.histogram).sort((a, b) => +a[0] - +b[0]).map(([k, v]) => `${k}:${v}`).join(' ')}`);
    for (const b of s.bands) console.log(
      `  seeds ${b.band.padEnd(8)} baskets=${String(b.baskets).padStart(5)} raw=${b.mean_raw} ratio=${b.mean_ratio} one-sig=${b.pct_one}% pool=${b.mean_pool} (pod ${b.mean_pod_pool}) pod-fired=${b.pct_pod_fired}%`);
    console.log(`pod pool non-empty: ${s.pod_pool_nonempty_pct}% of baskets; a pod frame actually fired in ${s.pod_fired_pct}%`);
    if (r.pod_blocked.length) console.log(`pod frames NEVER owned: ${r.pod_blocked.map(b => `${b.id} (missing: ${b.missing.join(' / ') || '—'})`).join(', ')}`);
    console.log(`pod frames first owned: ${Object.entries(r.pod_first_owned).map(([id, at]) => `${id}@S${at.seed}`).join(' ') || 'none'}`);
    console.log(`evidence: ${out}  (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  })().catch(e => { console.error(e.message); process.exit(1); });
}
