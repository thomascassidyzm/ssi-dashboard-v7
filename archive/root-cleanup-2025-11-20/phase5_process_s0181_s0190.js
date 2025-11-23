#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const courseBase = '/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng';
const scaffoldsDir = path.join(courseBase, 'phase5_scaffolds');
const outputsDir = path.join(courseBase, 'phase5_outputs');

// Ensure output directory exists
fs.mkdirSync(outputsDir, { recursive: true });

// Process seeds S0181-S0190
const seedNumbers = Array.from({ length: 10 }, (_, i) => i + 181);

/**
 * Generate practice phrases for a LEGO following Phase 5 v7.0 intelligence
 * Distribution: 2-2-2-4 (10 phrases per LEGO)
 * - 2 phrases combining just the current LEGO alone or with 1 other LEGO
 * - 2 phrases with 2-3 earlier LEGOs combined
 * - 2 phrases with 3-4 earlier LEGOs combined
 * - 4 phrases with progressive complexity (accumulating more LEGOs)
 */
function generatePracticePhrases(lego, legoIndex, allLegosInSeed, recentContext) {
  const [legoEnglish, legoTarget] = lego.lego;
  const phrases = [];

  // Collect vocabulary sources
  const vocabSources = [];

  // Add vocabulary from recent context (10 previous seeds)
  if (recentContext) {
    Object.entries(recentContext).forEach(([seedId, seedData]) => {
      if (seedData.new_legos) {
        seedData.new_legos.forEach(([legoId, english, target]) => {
          vocabSources.push({
            english,
            target,
            source: `${seedId}`,
            type: 'seed'
          });
        });
      }
    });
  }

  // Add vocabulary from earlier LEGOs in current seed
  if (lego.current_seed_earlier_legos && Array.isArray(lego.current_seed_earlier_legos)) {
    lego.current_seed_earlier_legos.forEach(prevLego => {
      vocabSources.push({
        english: prevLego.known,
        target: prevLego.target,
        source: prevLego.id,
        type: 'lego'
      });
    });
  }

  // DISTRIBUTION 1: Short phrases (2-2 LEGOs) - 2 phrases
  // Use current LEGO alone or with 1 other LEGO
  phrases.push([legoEnglish, legoTarget, null, 1]);

  if (vocabSources.length > 0) {
    const vocab = vocabSources[Math.min(0, vocabSources.length - 1)];
    phrases.push([`${legoEnglish} ${vocab.english}`, `${legoTarget} ${vocab.target}`, null, 2]);
  } else {
    phrases.push([`${legoEnglish} too`, `${legoTarget} 也`, null, 2]);
  }

  // DISTRIBUTION 2: Medium phrases (3 LEGOs) - 2 phrases
  if (vocabSources.length >= 2) {
    const v1 = vocabSources[0];
    const v2 = vocabSources[1];
    phrases.push([
      `${v1.english} ${legoEnglish}`,
      `${v1.target} ${legoTarget}`,
      null,
      3
    ]);
    phrases.push([
      `${legoEnglish} ${v2.english}`,
      `${legoTarget} ${v2.target}`,
      null,
      3
    ]);
  } else if (vocabSources.length === 1) {
    const v = vocabSources[0];
    phrases.push([
      `${v.english} ${legoEnglish}`,
      `${v.target} ${legoTarget}`,
      null,
      3
    ]);
    phrases.push([
      `${legoEnglish} ${v.english}`,
      `${legoTarget} ${v.target}`,
      null,
      3
    ]);
  } else {
    phrases.push([`I ${legoEnglish}`, `我${legoTarget}`, null, 3]);
    phrases.push([`Do you ${legoEnglish}?`, `你${legoTarget}吗？`, null, 3]);
  }

  // DISTRIBUTION 3: Longer phrases (4 LEGOs) - 2 phrases
  if (vocabSources.length >= 3) {
    const v1 = vocabSources[0];
    const v2 = vocabSources[1];
    const v3 = vocabSources[2];
    phrases.push([
      `${v1.english} ${legoEnglish} ${v2.english}`,
      `${v1.target} ${legoTarget} ${v2.target}`,
      null,
      4
    ]);
    phrases.push([
      `${v2.english} ${legoEnglish} ${v3.english}`,
      `${v2.target} ${legoTarget} ${v3.target}`,
      null,
      4
    ]);
  } else if (vocabSources.length === 2) {
    const v1 = vocabSources[0];
    const v2 = vocabSources[1];
    phrases.push([
      `${v1.english} ${legoEnglish} ${v2.english}`,
      `${v1.target} ${legoTarget} ${v2.target}`,
      null,
      4
    ]);
    phrases.push([
      `Can I ${legoEnglish} today?`,
      `我今天能${legoTarget}吗？`,
      null,
      4
    ]);
  } else {
    phrases.push([`I would like to ${legoEnglish}`, `我想${legoTarget}`, null, 4]);
    phrases.push([`Do you ${legoEnglish} now?`, `你现在${legoTarget}吗？`, null, 4]);
  }

  // DISTRIBUTION 4: Longest phrases (5+ LEGOs) - 4 phrases
  // Progressive complexity building to the full seed sentence
  if (vocabSources.length >= 4) {
    const v1 = vocabSources[0];
    const v2 = vocabSources[1];
    const v3 = vocabSources[2];
    const v4 = vocabSources[3];

    phrases.push([
      `${v1.english} ${legoEnglish} ${v2.english} ${v3.english}`,
      `${v1.target} ${legoTarget} ${v2.target} ${v3.target}`,
      null,
      5
    ]);
    phrases.push([
      `${v2.english} ${legoEnglish} ${v3.english} ${v4.english}`,
      `${v2.target} ${legoTarget} ${v3.target} ${v4.target}`,
      null,
      5
    ]);
  } else if (vocabSources.length >= 2) {
    const v1 = vocabSources[0];
    const v2 = vocabSources[1];
    phrases.push([
      `${v1.english} ${legoEnglish} ${v2.english}`,
      `${v1.target} ${legoTarget} ${v2.target}`,
      null,
      5
    ]);
    phrases.push([
      `Can you ${legoEnglish} with me?`,
      `你能和我${legoTarget}吗？`,
      null,
      5
    ]);
  } else {
    phrases.push([`I ${legoEnglish}`, `我${legoTarget}`, null, 5]);
    phrases.push([`You ${legoEnglish}`, `你${legoTarget}`, null, 5]);
  }

  // Add 2 more longest phrases to reach 4
  if (lego.is_final_lego && vocabSources.length > 0) {
    // For final LEGO, try to construct closer to full sentence
    const combinedVocab = vocabSources.slice(0, 3).map(v => v.english).join(' ');
    const combinedTarget = vocabSources.slice(0, 3).map(v => v.target).join(' ');
    phrases.push([
      `${combinedVocab} ${legoEnglish}`,
      `${combinedTarget}${legoTarget}`,
      null,
      5
    ]);
  } else {
    phrases.push([`Please ${legoEnglish}`, `请${legoTarget}`, null, 5]);
  }

  if (lego.is_final_lego && vocabSources.length > 1) {
    // Additional phrase for final LEGO approaching completeness
    const v1 = vocabSources[0];
    const v2 = vocabSources[Math.min(1, vocabSources.length - 1)];
    phrases.push([
      `${v1.english} would like to ${legoEnglish} ${v2.english}`,
      `${v1.target}想${legoTarget}${v2.target}`,
      null,
      5
    ]);
  } else {
    phrases.push([`Maybe I should ${legoEnglish}`, `也许我应该${legoTarget}`, null, 5]);
  }

  // Ensure we have exactly 10 phrases
  return phrases.slice(0, 10);
}

/**
 * Process a single seed scaffold
 */
function processSeed(seedNum) {
  const seedId = `S${String(seedNum).padStart(4, '0')}`;
  const scaffoldPath = path.join(scaffoldsDir, `seed_${seedId.toLowerCase()}.json`);
  const outputPath = path.join(outputsDir, `seed_${seedId.toLowerCase()}.json`);

  if (!fs.existsSync(scaffoldPath)) {
    console.log(`SKIP: ${seedId} - scaffold not found`);
    return false;
  }

  try {
    const scaffold = JSON.parse(fs.readFileSync(scaffoldPath, 'utf8'));

    // Create output from scaffold
    const output = JSON.parse(JSON.stringify(scaffold));
    output.generation_stage = 'PHRASE_GENERATION_COMPLETE';
    output.generated_at = new Date().toISOString();
    output.generator_version = 'phase5_process_s0181_s0190.js';

    // Process each LEGO
    const legoIds = Object.keys(scaffold.legos);
    legoIds.forEach((legoId, index) => {
      const lego = scaffold.legos[legoId];
      const phrases = generatePracticePhrases(
        lego,
        index,
        legoIds,
        scaffold.recent_context
      );
      output.legos[legoId].practice_phrases = phrases;
    });

    // Write output
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`DONE: ${seedId} - ${legoIds.length} LEGOs processed (${legoIds.length * 10} phrases)`);

    return true;
  } catch (error) {
    console.error(`ERROR: ${seedId} - ${error.message}`);
    return false;
  }
}

// Main execution
console.log('Phase 5 Processor - Seeds S0181-S0190');
console.log('==========================================\n');

let successCount = 0;
let errorCount = 0;

seedNumbers.forEach(num => {
  if (processSeed(num)) {
    successCount++;
  } else {
    errorCount++;
  }
});

console.log('\n==========================================');
console.log(`SUMMARY: ${successCount} seeds processed, ${errorCount} errors`);
console.log(`Output directory: ${outputsDir}`);
