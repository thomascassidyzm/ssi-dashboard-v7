#!/usr/bin/env node
/**
 * FUTURE-LEGO SCAN — how many phrases use a LEGO the learner has not met yet,
 * in the LIVE course and in a v3 candidate set, by one rule.
 *
 * Tom, 2026-09-27: a phrase may NEVER use a LEGO not yet introduced at that
 * point in the course — strictly earlier in course order, including the later
 * LEGOs of the same seed. The gate now refuses it (gate-check.cjs futureLego);
 * this is the census, for both arms, so the doc can say how often live does it.
 *
 * Same vocabulary construction as the gate (gate-check.cjs loadTranslationVocab
 * + earlier siblings + the LEGO itself, extractVocab / checkVocabViolations
 * from the builder's own libraries), built incrementally in one walk of the
 * course instead of two queries per basket. A phrase is counted when
 *   - its target does not tile from STRICTLY-EARLIER vocabulary, or
 *   - its tiles / decomposition name a LEGO after the current one.
 * Each hit is classed, because they are different defects:
 *   SAME-SEED   tiles from the seed-wide vocabulary — a later sibling borrowed
 *               (the hole the old gate let through);
 *   LATER-SEED  tiles only once LEGOs from later seeds are admitted — a true
 *               future LEGO;
 *   TILE-ONLY   the text tiles, but the phrase's own tiles name a later LEGO;
 *   UNTAUGHT    does not tile even from the WHOLE course's LEGOs — a chunk
 *               re-split or re-conjugated into a form never taught as such
 *               (the vocab gate's own rule; not a future LEGO, reported apart).
 *
 * READ-ONLY.
 *
 *   node tools/phrase-lab/future-lego-scan.cjs ita_for_eng [--cands <dir>] [--json out.json]
 */
require('dotenv').config({ quiet: true });
const fs = require('fs');
const path = require('path');
const { isChinese } = require('../../services/course-builder/lib/language-config.cjs');
const { extractVocab } = require('../../services/course-builder/lib/text-normalization.cjs');
const { checkVocabViolations } = require('../../services/course-builder/lib/validation.cjs');
const { isAfter } = require('../phrase-gate/gate-check.cjs');

const arg = (n, d = null) => { const i = process.argv.indexOf(n); return i === -1 ? d : process.argv[i + 1]; };

async function fetchAll(sb, table, select, course) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(table).select(select).eq('course_code', course)
      .order('seed_number').order('id').range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...data);
    if (data.length < 1000) return out;
  }
}

function legoVocab(l, chinese) {
  const v = extractVocab(l.target_text, chinese);
  if (l.type === 'M' && l.components) for (const c of l.components) v.push(...extractVocab(c.target, chinese));
  return v;
}

async function main() {
  const course = process.argv[2];
  const cands = arg('--cands');
  const chinese = isChinese(course);
  const { supabase } = require('../../services/supabase-client.cjs');
  const [seeds, legos, live] = await Promise.all([
    fetchAll(supabase, 'course_seeds', 'id,seed_number,target_text', course),
    fetchAll(supabase, 'course_legos', 'id,seed_number,lego_index,lego_id,type,target_text,components', course),
    fetchAll(supabase, 'course_practice_phrases', 'id,seed_number,lego_index,phrase_role,known_text,target_text,decomposition', course),
  ]);
  const seedText = new Map(seeds.map((s) => [s.seed_number, s.target_text]));
  const legosBySeed = new Map();
  for (const l of legos) (legosBySeed.get(l.seed_number) || legosBySeed.set(l.seed_number, []).get(l.seed_number)).push(l);
  for (const ls of legosBySeed.values()) ls.sort((a, b) => a.lego_index - b.lego_index);

  const liveBy = new Map();
  for (const p of live) {
    if (p.phrase_role !== 'build' && p.phrase_role !== 'use') continue;
    const k = `${p.seed_number}:${p.lego_index}`;
    (liveBy.get(k) || liveBy.set(k, []).get(k)).push({
      known: p.known_text, target: p.target_text,
      tiles: (p.decomposition || []).map((d) => ({ legoId: d.legoId })),
    });
  }
  const candBy = new Map();
  if (cands) {
    for (const sd of fs.readdirSync(cands).filter((d) => /^seed-\d+$/.test(d))) {
      for (const f of fs.readdirSync(path.join(cands, sd)).filter((x) => x.endsWith('.json'))) {
        let r; try { r = JSON.parse(fs.readFileSync(path.join(cands, sd, f), 'utf8')); } catch { continue; }
        candBy.set(`${r.seedNumber}:${r.legoIndex}`, [...(r.build || []), ...(r.use || [])]);
      }
    }
  }

  const tally = () => ({ phrases: 0, baskets: 0, hits: 0, sameSeed: 0, laterSeed: 0, tileOnly: 0, untaught: 0, basketsHit: 0, examples: [] });
  const whole = new Set();
  for (const l of legos) legoVocab(l, chinese).forEach((w) => whole.add(w));
  for (const sd of seeds) if (sd.target_text) extractVocab(sd.target_text, chinese).forEach((w) => whole.add(w));
  const res = { live: { all: tally(), from11: tally() }, v3: { all: tally(), from11: tally() } };
  const prior = new Set(); // vocabulary of every seed before the current one

  const maxSeed = Math.max(...legos.map((l) => l.seed_number));
  for (let s = 1; s <= maxSeed; s += 1) {
    const sibs = legosBySeed.get(s) || [];
    const seedWide = new Set(prior);
    for (const l of sibs) legoVocab(l, chinese).forEach((w) => seedWide.add(w));
    const strict = new Set(prior);
    for (const l of sibs) {
      const withLego = new Set(strict);
      legoVocab(l, chinese).forEach((w) => withLego.add(w));
      const extra = seedText.get(s) ? [seedText.get(s)] : [];
      for (const [arm, by] of [['live', liveBy], ['v3', candBy]]) {
        const phrases = (by.get(`${s}:${l.lego_index}`) || []).filter((p) => p.target);
        if (!phrases.length) continue;
        const strictFail = new Set(checkVocabViolations(phrases, withLego, course, { seedNumber: s, extraTexts: extra }).map((v) => v.phrase));
        const wideFail = new Set(checkVocabViolations(phrases, seedWide, course, { seedNumber: s, extraTexts: extra }).map((v) => v.phrase));
        const wholeFail = new Set(checkVocabViolations(phrases, whole, course, { seedNumber: s, extraTexts: extra }).map((v) => v.phrase));
        let basketHit = false;
        for (const p of phrases) {
          const tileLater = (p.tiles || []).some((t) => isAfter(t.legoId, s, l.lego_index));
          let kind = null;
          if (strictFail.has(p.target)) kind = !wideFail.has(p.target) ? 'sameSeed' : !wholeFail.has(p.target) ? 'laterSeed' : 'untaught';
          else if (tileLater) kind = 'tileOnly';
          const future = kind && kind !== 'untaught';
          for (const t of (s >= 11 ? [res[arm].all, res[arm].from11] : [res[arm].all])) {
            t.phrases += 1;
            if (kind) {
              t[kind] += 1;
              if (future) t.hits += 1;
              if (t.examples.length < 40) t.examples.push({ kind, lego: `S${String(s).padStart(4, '0')}L${String(l.lego_index).padStart(2, '0')}`, known: p.known, target: p.target });
            }
          }
          basketHit = basketHit || future;
        }
        for (const t of (s >= 11 ? [res[arm].all, res[arm].from11] : [res[arm].all])) { t.baskets += 1; if (basketHit) t.basketsHit += 1; }
      }
      legoVocab(l, chinese).forEach((w) => strict.add(w));
    }
    // After the seed: its LEGOs and its sentence become prior vocabulary.
    for (const l of sibs) legoVocab(l, chinese).forEach((w) => prior.add(w));
    if (seedText.get(s)) extractVocab(seedText.get(s), chinese).forEach((w) => prior.add(w));
  }
  const out = { course, generatedAt: new Date().toISOString(), candidates: cands || null, ...res };
  const line = (a, t) => `${a}: FUTURE-LEGO ${t.hits}/${t.phrases} phrases (${t.phrases ? (100 * t.hits / t.phrases).toFixed(2) : '—'}%) in ${t.basketsHit}/${t.baskets} baskets [same-seed ${t.sameSeed}, later-seed ${t.laterSeed}, tile-only ${t.tileOnly}] · untaught-form ${t.untaught}`;
  console.log(`${course}\n  LIVE all    ${line('', res.live.all)}\n  LIVE 11+    ${line('', res.live.from11)}\n  v3 all      ${line('', res.v3.all)}\n  v3 11+      ${line('', res.v3.from11)}`);
  if (arg('--json')) fs.writeFileSync(arg('--json'), JSON.stringify(out, null, 2));
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1); });
