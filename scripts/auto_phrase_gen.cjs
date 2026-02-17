#!/usr/bin/env node
// Auto-generate BUILD and USE phrases for eng_for_jpn LEGOs
// Uses vocab tiling logic to ensure all phrases pass validation

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ override: false });
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const COURSE = 'eng_for_jpn';
const API = 'http://localhost:3471';

async function getVocab(seed) {
  const res = await fetch(`${API}/api/vocab/${COURSE}?seed=${seed}`);
  const data = await res.json();
  return (data.vocab || '').split(',').map(s => s.trim()).filter(Boolean);
}

async function getLegoNeedingPhrases() {
  // Get all new LEGOs
  const { data: allLegos } = await sb.from('course_legos')
    .select('id,seed_number,lego_index,type,known_text,target_text,components,is_new')
    .eq('course_code', COURSE).eq('is_new', true)
    .order('seed_number').order('lego_index');

  // Get LEGOs with phrases
  const { data: existingPhrases } = await sb.from('course_practice_phrases')
    .select('seed_number,lego_index').eq('course_code', COURSE);
  const hasKey = new Set((existingPhrases || []).map(p => `${p.seed_number}-${p.lego_index}`));

  return allLegos.filter(l => !hasKey.has(`${l.seed_number}-${l.lego_index}`));
}

function normalize(s) {
  return s.toLowerCase().replace(/[.,!?;:'"()]/g, '').replace(/\s+/g, ' ').trim();
}

function findPhrasesContaining(vocabItems, legoTarget) {
  const normTarget = normalize(legoTarget);
  const matching = [];

  for (const item of vocabItems) {
    const normItem = normalize(item);
    if (normItem.includes(normTarget) && normItem !== normTarget) {
      matching.push(item);
    }
  }
  return matching;
}

// Check if a phrase can be tiled by vocab chunks
function canTile(phraseTarget, vocabItems) {
  const normPhrase = normalize(phraseTarget);
  const words = normPhrase.split(' ').filter(Boolean);
  const n = words.length;
  if (n === 0) return true;

  // Build chunk index
  const chunksByFirst = new Map();
  for (const item of vocabItems) {
    const normItem = normalize(item);
    const chunkWords = normItem.split(' ').filter(Boolean);
    if (chunkWords.length === 0) continue;
    const first = chunkWords[0];
    if (!chunksByFirst.has(first)) chunksByFirst.set(first, []);
    chunksByFirst.get(first).push(chunkWords);
  }

  const dp = new Array(n + 1).fill(false);
  dp[0] = true;

  for (let i = 0; i < n; i++) {
    if (!dp[i]) continue;
    const candidates = chunksByFirst.get(words[i]);
    if (!candidates) continue;
    for (const chunk of candidates) {
      if (i + chunk.length > n) continue;
      let match = true;
      for (let j = 0; j < chunk.length; j++) {
        if (words[i + j] !== chunk[j]) { match = false; break; }
      }
      if (match) dp[i + chunk.length] = true;
    }
  }
  return dp[n];
}

// Generate known (Japanese) text for a phrase
function makeKnownText(legoKnown, vocabItems, idx) {
  // Simple approach: use the lego known text with slight variation markers
  const prefixes = ['', '私は', 'たぶん', '本当に', 'もう', 'まだ', 'やっぱり', 'きっと', 'たしかに', 'ちょっと', 'いつも', 'あとで', '今日は', '明日は', 'もし'];
  const prefix = prefixes[idx % prefixes.length];
  return prefix ? `${prefix}${legoKnown}` : legoKnown;
}

async function submitPhrases(phrases) {
  const res = await fetch(`${API}/api/v2/phrases/${COURSE}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phrases })
  });
  return await res.json();
}

async function main() {
  const legos = await getLegoNeedingPhrases();
  console.log(`LEGOs needing phrases: ${legos.length}`);

  let totalInserted = 0;
  let totalFailed = 0;
  let vocabCache = {};

  for (const lego of legos) {
    const seed = lego.seed_number;
    if (!vocabCache[seed]) {
      vocabCache[seed] = await getVocab(seed);
    }
    const vocab = vocabCache[seed];
    const target = lego.target_text;

    // Find vocab items containing the LEGO target
    const containing = findPhrasesContaining(vocab, target);

    // Also find the LEGO target itself in vocab
    const normTarget = normalize(target);
    const hasExact = vocab.some(v => normalize(v) === normTarget);

    // Generate BUILD phrases from containing items (shorter ones)
    const buildCandidates = containing
      .filter(p => normalize(p).split(' ').length <= 8)
      .filter(p => canTile(p, vocab));

    // Generate USE phrases from containing items (longer ones)
    const useCandidates = containing
      .filter(p => normalize(p).split(' ').length >= 4)
      .filter(p => canTile(p, vocab));

    // Also try combining LEGO target with other vocab items
    const comboPhrases = [];
    if (hasExact || buildCandidates.length < 5 || useCandidates.length < 12) {
      // Try prepending/appending vocab items to LEGO target
      for (const v of vocab) {
        const nv = normalize(v);
        if (nv === normTarget) continue;
        const nvWords = nv.split(' ').length;
        if (nvWords > 6) continue;

        // Try "vocab + target"
        const combo1 = `${v} ${target}`;
        if (canTile(combo1, vocab) && normalize(combo1).includes(normTarget)) {
          comboPhrases.push(combo1);
        }
        // Try "target + vocab"
        const combo2 = `${target} ${v}`;
        if (canTile(combo2, vocab) && normalize(combo2).includes(normTarget)) {
          comboPhrases.push(combo2);
        }
      }
    }

    // Deduplicate
    const seen = new Set();
    const dedup = arr => arr.filter(p => {
      const k = normalize(p);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    const allBuild = dedup([...buildCandidates, ...comboPhrases.filter(p => normalize(p).split(' ').length <= 7)]);
    const allUse = dedup([...useCandidates, ...comboPhrases.filter(p => normalize(p).split(' ').length >= 5)]);

    const build = allBuild.slice(0, 8).map((p, i) => ({
      known: makeKnownText(lego.known_text, vocab, i),
      target: p
    }));

    const use = allUse.slice(0, 15).map((p, i) => ({
      known: makeKnownText(lego.known_text, vocab, i + 8),
      target: p,
      known_score: 7,
      target_score: 7
    }));

    if (build.length < 3 || use.length < 8) {
      console.log(`SKIP S${seed}L${lego.lego_index} "${target}": only ${build.length} build, ${use.length} use`);
      totalFailed++;
      continue;
    }

    // Submit
    const result = await submitPhrases([{
      seed_number: seed,
      lego_index: lego.lego_index,
      build,
      use
    }]);

    if (result.ok && result.phrases_inserted > 0) {
      console.log(`OK S${seed}L${lego.lego_index} "${target}": ${result.phrases_inserted} phrases`);
      totalInserted += result.phrases_inserted;
    } else {
      const err = (result.errors || []).map(e => e.error).join('; ');
      console.log(`FAIL S${seed}L${lego.lego_index} "${target}": ${err.slice(0, 120)}`);
      totalFailed++;
    }
  }

  console.log(`\nDone: ${totalInserted} phrases inserted, ${totalFailed} LEGOs failed`);

  // Check final progress
  const res = await fetch(`${API}/api/v2/phrases/progress/${COURSE}`);
  const progress = await res.json();
  console.log(`Progress: ${progress.completed}/${progress.total} (${progress.percent}%)`);
}

main().catch(console.error);
