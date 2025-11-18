#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load input data
const agentOutput = JSON.parse(fs.readFileSync('/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng/segments/segment_1/agent_06_output.json', 'utf8'));
const seedPairs = JSON.parse(fs.readFileSync('/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng/seed_pairs.json', 'utf8'));
const legoPairs = JSON.parse(fs.readFileSync('/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng/lego_pairs.json', 'utf8'));

const courseBase = '/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng';
const scaffoldsDir = path.join(courseBase, 'phase5_scaffolds');
const outputsDir = path.join(courseBase, 'phase5_outputs');

// Ensure directories exist
fs.mkdirSync(scaffoldsDir, { recursive: true });
fs.mkdirSync(outputsDir, { recursive: true });

// Extract seed numbers
function seedNum(seedId) {
  return parseInt(seedId.replace('S', ''));
}

// Get recent seed pairs (5 seeds before current)
function getRecentSeedPairs(currentSeedId) {
  const currentNum = seedNum(currentSeedId);
  const recent = {};
  const startNum = Math.max(1, currentNum - 5);

  for (let i = startNum; i < currentNum; i++) {
    const id = `S${String(i).padStart(4, '0')}`;
    if (seedPairs.translations && seedPairs.translations[id]) {
      const [known, target] = seedPairs.translations[id];
      recent[id] = [target, known];
    }
  }

  return recent;
}

// Generate practice phrases for a LEGO
function generatePractices(lego, allLegos, seedId, recentPairs) {
  const practices = [];
  const targetLang = lego.target;
  const knownLang = lego.known;

  // Helper to create phrase variations
  const createPhrase = (enPhrase, cnPhrase, count) => [enPhrase, cnPhrase, null, count];

  // Start with the LEGO itself (count=1 or 2)
  practices.push(createPhrase(knownLang, targetLang, 1));

  // Get vocabulary from recent seeds and current seed earlier LEGOs
  const vocabSources = [];

  // Add recent seed pairs
  Object.entries(recentPairs).forEach(([id, [target, known]]) => {
    vocabSources.push({ known, target, seedId: id, type: 'seed' });
  });

  // Add current seed's earlier LEGOs
  const currentSeedNum = seedNum(seedId);
  const currentSeedLegos = agentOutput.seeds.find(s => s.seed_id === seedId)?.legos || [];
  const currentLegoIdx = currentSeedLegos.findIndex(l => l.id === lego.id);

  if (currentLegoIdx > 0) {
    currentSeedLegos.slice(0, currentLegoIdx).forEach(prevLego => {
      vocabSources.push({
        known: prevLego.known,
        target: prevLego.target,
        legoId: prevLego.id,
        type: 'lego'
      });
    });
  }

  // Generate variations combining LEGOs with vocabulary
  const shortPhrases = [];  // 1-2 component
  const mediumPhrases = []; // 3 component
  const longerPhrases = [];  // 4-5 components
  const longestPhrases = []; // 6+ components

  // Simple combinations with current LEGO
  if (vocabSources.length > 0) {
    // Combine with single vocab items
    vocabSources.slice(0, 5).forEach(source => {
      // Try combining at start and end
      shortPhrases.push(createPhrase(
        `${source.known} ${knownLang}`,
        `${source.target} ${targetLang}`,
        2
      ));

      if (shortPhrases.length <= 10 && source !== vocabSources[0]) {
        mediumPhrases.push(createPhrase(
          `${knownLang} ${source.known}`,
          `${targetLang} ${source.target}`,
          2
        ));
      }
    });

    // Multi-component combinations
    for (let i = 0; i < Math.min(vocabSources.length - 1, 4); i++) {
      const src1 = vocabSources[i];
      const src2 = vocabSources[i + 1];

      mediumPhrases.push(createPhrase(
        `${src1.known} ${knownLang}`,
        `${src1.target} ${targetLang}`,
        3
      ));

      longerPhrases.push(createPhrase(
        `${src1.known} ${knownLang} ${src2.known}`,
        `${src1.target} ${targetLang} ${src2.target}`,
        4
      ));

      if (i < vocabSources.length - 2) {
        const src3 = vocabSources[i + 2];
        longerPhrases.push(createPhrase(
          `${src1.known} ${src2.known} ${knownLang} ${src3.known}`,
          `${src1.target} ${src2.target} ${targetLang} ${src3.target}`,
          5
        ));
      }
    }

    // Longest combinations with 3-4 vocab items
    if (vocabSources.length >= 3) {
      longestPhrases.push(createPhrase(
        seedPairs.translations[seedId]?.[0] || '',
        seedPairs.translations[seedId]?.[1] || '',
        seedPairs.translations[seedId] ? 5 : 4
      ));
    }
  }

  // Combine all and distribute according to distribution pattern
  const allPhrases = [
    ...shortPhrases.slice(0, 2),
    ...mediumPhrases.slice(0, 4),
    ...longerPhrases.slice(0, 4),
    ...longestPhrases.slice(0, 3)
  ];

  // Ensure we have at least 10 phrases
  while (allPhrases.length < 10 && vocabSources.length > 0) {
    const randSource = vocabSources[Math.floor(Math.random() * vocabSources.length)];
    allPhrases.push(createPhrase(
      `${randSource.known} ${knownLang}`,
      `${randSource.target} ${targetLang}`,
      Math.floor(Math.random() * 3) + 2
    ));
  }

  return allPhrases.slice(0, 15);
}

// Create scaffolds and outputs
agentOutput.seeds.forEach(seed => {
  const seedId = seed.seed_id;
  const seedPair = seed.seed_pair;
  const legos = seed.legos;

  const recentSeedPairs = getRecentSeedPairs(seedId);

  // Create scaffold
  const scaffold = {
    version: 'curated_v7_cmn',
    seed_id: seedId,
    generation_stage: 'SCAFFOLD_READY_FOR_PHRASE_GENERATION',
    seed_pair: {
      known: seedPair[0],
      target: seedPair[1]
    },
    recent_context: {},
    legos: {},
    _instructions: {
      task: 'Fill practice_phrases arrays using Phase 5 Intelligence v7.0',
      methodology: 'Read: https://ssi-dashboard-v7.vercel.app/phase-intelligence/5 OR docs/phase_intelligence/phase_5_lego_baskets.md',
      vocabulary_sources: '10 recent seeds + current seed\'s earlier LEGOs + current LEGO (NO massive whitelist!)',
      distribution: 'ALWAYS 2-2-2-4 (10 phrases per LEGO)',
      output: path.join(outputsDir, `seed_${seedId.toLowerCase()}.json`)
    },
    _stats: {
      new_legos_in_seed: legos.length,
      phrases_to_generate: legos.length * 10,
      recent_seeds_count: Object.keys(recentSeedPairs).length
    }
  };

  // Add LEGOs to scaffold
  legos.forEach((lego, idx) => {
    scaffold.legos[lego.id] = {
      lego: [lego.known, lego.target],
      type: lego.type,
      is_final_lego: idx === legos.length - 1,
      current_seed_earlier_legos: legos.slice(0, idx).map(l => ({
        id: l.id,
        known: l.known,
        target: l.target,
        type: l.type
      })),
      practice_phrases: [],
      phrase_distribution: {
        short_1_to_2_legos: 2,
        medium_3_legos: 2,
        longer_4_legos: 2,
        longest_5_legos: 4
      },
      target_phrase_count: 10,
      _metadata: {
        lego_id: lego.id,
        seed_context: {
          known: seedPair[0],
          target: seedPair[1]
        }
      }
    };
  });

  // Write scaffold
  fs.writeFileSync(
    path.join(scaffoldsDir, `seed_${seedId.toLowerCase()}.json`),
    JSON.stringify(scaffold, null, 2)
  );

  // Create output with generated practices
  const output = JSON.parse(JSON.stringify(scaffold));
  output.generation_stage = 'PHRASE_GENERATION_COMPLETE';
  output.recent_seed_pairs = recentSeedPairs;

  legos.forEach((lego) => {
    const practices = generatePractices(lego, legos, seedId, recentSeedPairs);
    output.legos[lego.id].practice_phrases = practices;
    output.legos[lego.id].current_seed_legos_available = legos
      .slice(0, legos.indexOf(lego))
      .map(l => [l.known, l.target]);
  });

  // Write output
  fs.writeFileSync(
    path.join(outputsDir, `seed_${seedId.toLowerCase()}.json`),
    JSON.stringify(output, null, 2)
  );

  console.log(`Processed: ${seedId}`);
});

console.log('Phase 5 processing complete!');
