#!/usr/bin/env node
/**
 * deu-dump.cjs — dump EVERY known-side finding for eng_for_deu with full context,
 * plus the debut seed of every taught gloss stem, so the adjudicator can reason about
 * morphology and ordering without re-querying.
 *
 * Reads only. Mirrors known-side-sweep.cjs's context construction exactly.
 */
require('dotenv').config({ quiet: true });
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const V = require(path.join(__dirname, '../services/course-builder/lib/validation.cjs'));
const { loadPairContract, checkKnownSide, compileKnownContract, stemKnownGloss, tokenizeKnown } = V;

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const CODE = 'eng_for_deu';

async function pageAll(table, select, filters) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    let q = supabase.from(table).select(select).range(from, from + 999).order('id', { ascending: true });
    for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

function buildCtx(legos, contract) {
  const stemFirstPos = new Map();
  const stemSources = new Map();
  const addStem = (s, seed, src) => {
    const k = stemKnownGloss(s);
    if (!k) return;
    if (!stemFirstPos.has(k) || stemFirstPos.get(k) > seed) stemFirstPos.set(k, seed);
    if (!stemSources.has(k)) stemSources.set(k, []);
    stemSources.get(k).push({ seed, src, raw: s });
  };
  for (const l of legos) {
    for (const t of tokenizeKnown(l.known_text)) addStem(t, l.seed_number, `lego:${l.lego_id}:known=${l.known_text}`);
    for (const c of l.components || []) for (const t of tokenizeKnown(c.known)) addStem(t, l.seed_number, `comp:${l.lego_id}:${c.known}`);
  }
  const carrierSeed = (carrier) => {
    let min = Infinity;
    for (const l of legos) {
      const hit = l.target_text === carrier || (l.components || []).some(c => c.target === carrier);
      if (hit && l.seed_number < min) min = l.seed_number;
    }
    return min;
  };
  for (const [carrier, syns] of Object.entries(contract.glossSynonyms || {})) {
    const seed = carrierSeed(carrier);
    if (seed < Infinity) for (const syn of syns) addStem(syn, seed, `syn:${carrier}`);
  }
  const consPos = {};
  for (const con of contract.constructions || []) {
    consPos[con.id] = con.cluster
      ? (contract.clusterSeeds?.[con.cluster] ?? contract.clusterRounds?.[con.cluster] ?? Infinity)
      : carrierSeed(con.carrier);
  }
  const unitPos = (contract.glossUnits || []).map(u => ({ phrase: u.phrase, pos: carrierSeed(u.carrier) }));
  return { ctx: { ...compileKnownContract(contract), stemFirstPos, consPos, unitPos }, stemSources };
}

(async () => {
  const { data: courses } = await supabase.from('courses')
    .select('course_code,known_lang,target_lang,status,seed_count').eq('course_code', CODE);
  const course = courses[0];
  const contract = loadPairContract(CODE, course.known_lang);
  const legos = await pageAll('course_legos', 'lego_id,target_text,known_text,components,seed_number,is_new', { course_code: CODE });
  const allPhrases = await pageAll('course_practice_phrases',
    'id,lego_id,seed_number,position,known_text,target_text,phrase_role', { course_code: CODE });
  const phrases = allPhrases.filter(p => ['build', 'use', 'practice'].includes(p.phrase_role));

  const { ctx, stemSources } = buildCtx(legos, contract);

  const findings = [];
  let checked = 0;
  for (const p of phrases) {
    if (!p.known_text || p.seed_number == null) continue;
    checked++;
    const probs = checkKnownSide(p.known_text, p.seed_number, ctx);
    for (const pr of probs) {
      const ug = /^unknown gloss "(.+)"$/.exec(pr);
      const ord = /^gloss "(.+)" not introduced until (\d+)/.exec(pr);
      findings.push({
        phrase_id: p.id, lego_id: p.lego_id, seed: p.seed_number, position: p.position,
        role: p.phrase_role, known: p.known_text, target: p.target_text,
        problem: pr,
        kind: ug ? 'unknown_gloss' : ord ? 'ordering' : 'other',
        token: ug ? ug[1] : ord ? ord[1] : null,
        debut_seed: ord ? +ord[2] : null,
      });
    }
  }

  // taught inventory, as stems -> debut seed
  const inventory = [...ctx.stemFirstPos.entries()].sort((a, b) => a[1] - b[1])
    .map(([stem, seed]) => ({ stem, debut: seed, sources: stemSources.get(stem).slice(0, 3) }));

  const out = {
    course, phrases_total: allPhrases.length, phrases_checked: checked,
    lego_count: legos.length,
    findings_total: findings.length,
    by_kind: findings.reduce((a, f) => { a[f.kind] = (a[f.kind] || 0) + 1; return a; }, {}),
    findings,
    inventory,
  };
  fs.writeFileSync(process.argv[2] || 'scripts/deu-findings.json', JSON.stringify(out, null, 2));
  console.log(`phrases=${checked} findings=${findings.length}`, out.by_kind, `inventory=${inventory.length} stems`);
})();
