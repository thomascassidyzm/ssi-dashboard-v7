#!/usr/bin/env node
/**
 * VERIFY THE CORPUS CLAIM — "the metagraph is now the complete corpus of
 * frames, seeds plus pods" — against the LIVE database, in memory, writing
 * nothing.
 *
 * Three questions, answered with counts rather than trust:
 *   1. Does the committed seed inventory still describe the seed corpus?
 *      (re-run the 31 P* matchers over the course's live seeds)
 *   2. Does the committed dialogue inventory still describe the pod canon?
 *      (re-run the extraction with the ARTEFACT'S OWN pod list, then with the
 *      LIVE canon's learner-facing slugs, and print both against the artefact)
 *   3. What pods actually exist right now, row by row?
 *
 * Built for the 2026-09-04 frame-generator commission, where it found the canon
 * had moved under the artefact: pod-0 and pod-0.5 no longer exist as slugs,
 * five sector pods were ingested as canon rows (so the health markdown source
 * must NOT be added on top — 437/438 of its texts are already canon), and the
 * live learner-facing corpus is 2,068 dialogue rows against the artefact's 916.
 *
 * READ-ONLY. Usage: node tools/frame-layer/verify-corpus-claim.cjs [course]
 */
require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const { loadPodCanon, pageAll } = require('./corpus.cjs');
const { inventory, loadSectorSource, SECTOR_SOURCES, stalenessOf } = require('./extract-dialogue-patterns.cjs');
const PATTERNS = require('./patterns.cjs');

const ROOT = path.join(__dirname, '..', '..');
/** The Method Pod is Tom and Aran talking ABOUT the method — never mined. */
const META_PODS = /^(learning-flagship|method-pod)/;

async function main() {
  const course = process.argv[2] || 'spa_for_eng';
  const sb = createClient(process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);

  // 3 first: what exists, so the rest reads against it
  const slugRows = await pageAll(sb, 'canonical_pod_scenarios', 'pod_slug,updated_at', q => q);
  const bySlug = {}; let maxUpd = '';
  for (const r of slugRows) { bySlug[r.pod_slug] = (bySlug[r.pod_slug] || 0) + 1; if (r.updated_at > maxUpd) maxUpd = r.updated_at; }
  console.log('LIVE CANON, by slug:', JSON.stringify(bySlug));
  console.log(`total ${slugRows.length} rows, newest updated_at ${maxUpd}\n`);

  // 1: the seed side
  const seeds = await pageAll(sb, 'course_seeds', 'seed_number,known_text',
    q => q.eq('course_code', course).order('seed_number'));
  const unmatched = seeds.filter(s => !PATTERNS.some(p => p.test(s.known_text))).length;
  const ep = require(path.join(ROOT, 'docs/frame-layer/english-pattern-inventory.json'));
  console.log(`SEEDS (${course}): live ${seeds.length} seeds, ${unmatched} unmatched by any P* frame`);
  console.log(`  artefact says: ${ep.total_seeds} seeds, ${Array.isArray(ep.unmatched_seeds) ? ep.unmatched_seeds.length : ep.unmatched_seeds} unmatched, ${ep.patterns.length} patterns — ${seeds.length === ep.total_seeds && unmatched === (Array.isArray(ep.unmatched_seeds) ? ep.unmatched_seeds.length : ep.unmatched_seeds) ? 'MATCHES' : 'DIVERGES'}\n`);

  // 2a: the artefact, and the artefact's own pod list replayed live
  const inv0 = require(path.join(ROOT, 'docs/frame-layer/dialogue-frame-inventory.json'));
  console.log('DIALOGUE ARTEFACT:', JSON.stringify({ mined: inv0.generated, pods: inv0.source.pods, ...inv0.counts, dialogue_rows: inv0.source.dialogue_rows }));
  console.log('staleness:', JSON.stringify(stalenessOf(inv0, maxUpd)));
  const missing = inv0.source.pods.filter(p => !bySlug[p]);
  if (missing.length) console.log(`ARTEFACT POD LIST IS DEAD IN PART: ${missing.join(', ')} no longer exist as slugs — a replay silently loses their rows.`);

  // 2b: the live learner-facing corpus. Sector content now lives IN the canon,
  // so the markdown sources are only added where their slug is absent.
  const livePods = Object.keys(bySlug).filter(s => !META_PODS.test(s) && !s.includes(':'));
  const canon = await loadPodCanon(sb, { pods: livePods });
  const inCanon = new Set(canon.map(r => r.english_text));
  let extraSector = [];
  for (const s of SECTOR_SOURCES) {
    const r = loadSectorSource(s);
    if (r.missing) continue;
    const dup = r.rows.filter(x => inCanon.has(x.english_text)).length;
    if (dup / Math.max(1, r.rows.length) > 0.5) {
      console.log(`sector source ${s}: ${dup}/${r.rows.length} rows already in canon — NOT added (double-count guard)`);
    } else extraSector.push(...r.rows);
  }
  const liveInv = inventory([...canon, ...extraSector], {
    pods: livePods, sector_sources: [], sector_unparsed: 0, canon_max_updated_at: maxUpd,
  });
  console.log(`\nLIVE RE-MINE (${livePods.sort().join(', ')}):`);
  console.log('  counts:', JSON.stringify(liveInv.counts), 'dialogue_rows:', liveInv.source.dialogue_rows);
  const d = Object.fromEntries(liveInv.sentence_frames.map(f => [f.id, f.count]));
  const d0 = Object.fromEntries(inv0.sentence_frames.map(f => [f.id, f.count]));
  console.log('  D* live vs artefact:', Object.keys(d).map(k => `${k} ${d[k]}/${d0[k] ?? '—'}`).join('  '));
  const x = Object.fromEntries(liveInv.exchange_frames.map(f => [f.id, f.count]));
  const x0 = Object.fromEntries(inv0.exchange_frames.map(f => [f.id, f.count]));
  console.log('  X* live vs artefact:', Object.keys(x).map(k => `${k} ${x[k]}/${x0[k] ?? '—'}`).join('  '));
  const dead = [...liveInv.sentence_frames, ...liveInv.exchange_frames].filter(f => !f.count).map(f => f.id);
  console.log(dead.length ? `  frames with ZERO live attestation: ${dead.join(', ')}` : '  every frame in both grains is still attested live');
}

if (require.main === module) main().catch(e => { console.error(e.stack || e.message); process.exit(1); });
