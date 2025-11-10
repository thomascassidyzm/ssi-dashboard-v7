#!/usr/bin/env node

/**
 * Phase 3 LEGO Merge - Assign IDs and Validate Tiling
 *
 * This script does ALL the mechanical post-extraction work:
 * 1. Reads 34 agent provisional outputs
 * 2. Assigns final LEGO IDs (S0001L01, S0001L02, etc.)
 * 3. Validates complete tiling mechanically
 * 4. Merges into final lego_pairs.json
 *
 * Usage: node scripts/phase3_merge_legos.cjs <courseDir>
 *
 * Reads: <courseDir>/phase3_outputs/agent_XX_provisional.json (34 files)
 * Writes: <courseDir>/lego_pairs.json (final merged output)
 */

const fs = require('fs-extra');
const path = require('path');

/**
 * Normalize text for tiling comparison
 * - Collapse whitespace
 * - Convert to lowercase
 * - Remove punctuation (but keep Spanish accents/ñ)
 */
function normalizeForTiling(str) {
  return str
    .toLowerCase()
    .replace(/[.,;:!?¿¡"'()—]/g, '') // Remove common punctuation
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalize whitespace for display (collapse multiple spaces, trim)
 */
function normalizeWhitespace(str) {
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Validate that seed reconstructs perfectly from LEGOs
 *
 * Since atomic and molecular LEGOs can overlap, we need to find
 * SOME COMBINATION that tiles, not just concatenate ALL LEGOs.
 *
 * Strategy: Greedy left-to-right tiling using longest-match-first
 */
function validateTiling(seedId, targetSentence, legos) {
  const normalizedTarget = normalizeForTiling(targetSentence);

  // Extract just the target texts for tiling (normalized for comparison)
  const legoTexts = legos.map(l => normalizeForTiling(l.target));

  // Try to reconstruct using greedy longest-match-first
  const tokens = normalizedTarget.split(' ');
  let position = 0;
  const usedLegos = [];

  while (position < tokens.length) {
    // Find longest matching LEGO starting at current position
    let bestMatch = null;
    let bestLength = 0;

    for (let i = 0; i < legoTexts.length; i++) {
      const legoTokens = legoTexts[i].split(' ');

      // Check if this LEGO matches at current position
      let matches = true;
      if (position + legoTokens.length > tokens.length) {
        continue; // LEGO too long
      }

      for (let j = 0; j < legoTokens.length; j++) {
        if (tokens[position + j] !== legoTokens[j]) {
          matches = false;
          break;
        }
      }

      // If matches and is longer than previous best, use it
      if (matches && legoTokens.length > bestLength) {
        bestMatch = i;
        bestLength = legoTokens.length;
      }
    }

    if (bestMatch === null) {
      // No LEGO matches at current position - tiling failed
      const reconstructed = usedLegos.map(idx => legoTexts[idx]).join(' ');
      const remaining = tokens.slice(position).join(' ');

      return {
        valid: false,
        error: `Tiling mismatch for ${seedId}`,
        expected: normalizedTarget,
        got: reconstructed,
        details: `No LEGO found for: "${remaining}"`
      };
    }

    usedLegos.push(bestMatch);
    position += bestLength;
  }

  return { valid: true };
}

/**
 * Assign final LEGO IDs sequentially
 */
function assignLegoIds(seeds) {
  const idMap = new Map(); // provisional_id -> final_id
  const seenLegos = new Map(); // target+known -> first final_id (for deduplication)

  for (const seedId of Object.keys(seeds).sort()) {
    const seed = seeds[seedId];
    let legoIndex = 1;

    for (const lego of seed.legos) {
      // Skip if this is a reference (already has id)
      if (lego.id && lego.ref) {
        continue;
      }

      // Skip if already assigned
      if (lego.id && !lego.provisional_id) {
        continue;
      }

      // Generate final ID
      const finalId = `${seedId}L${String(legoIndex).padStart(2, '0')}`;

      // Track mapping
      if (lego.provisional_id) {
        idMap.set(lego.provisional_id, finalId);
      }

      // Assign ID
      lego.id = finalId;
      delete lego.provisional_id;

      // Track seen LEGOs for deduplication check
      const key = `${lego.target}|${lego.known}`;
      if (!seenLegos.has(key)) {
        seenLegos.set(key, finalId);
      }

      legoIndex++;
    }
  }

  return { idMap, seenLegos };
}

/**
 * Merge all agent provisional outputs into final lego_pairs.json
 */
async function mergePhase3Legos(courseDir) {
  console.log(`[Phase 3 Merge] Starting merge for: ${courseDir}`);

  const outputsDir = path.join(courseDir, 'phase3_outputs');

  // Check if outputs directory exists
  if (!await fs.pathExists(outputsDir)) {
    throw new Error(`Phase 3 outputs directory not found: ${outputsDir}`);
  }

  // Read all agent provisional files
  const files = await fs.readdir(outputsDir);
  const agentFiles = files
    .filter(f => f.match(/^agent_\d+_provisional\.json$/))
    .sort();

  if (agentFiles.length === 0) {
    throw new Error(`No agent provisional files found in ${outputsDir}`);
  }

  console.log(`[Phase 3 Merge] Found ${agentFiles.length} agent outputs`);

  // Load all agent outputs
  const agentData = await Promise.all(
    agentFiles.map(async (file) => {
      const filePath = path.join(outputsDir, file);
      const data = await fs.readJson(filePath);
      console.log(`[Phase 3 Merge] Loaded agent ${data.agent_id}: ${Object.keys(data.seeds).length} seeds`);
      return data;
    })
  );

  // Merge all seeds
  const allSeeds = {};
  let totalSeeds = 0;
  let totalLegos = 0;

  for (const agent of agentData) {
    Object.assign(allSeeds, agent.seeds);
    totalSeeds += Object.keys(agent.seeds).length;
  }

  console.log(`[Phase 3 Merge] Total seeds collected: ${totalSeeds}`);

  // Validate tiling for all seeds
  console.log(`[Phase 3 Merge] Validating complete tiling...`);
  const tilingErrors = [];

  for (const seedId of Object.keys(allSeeds).sort()) {
    const seed = allSeeds[seedId];
    const validation = validateTiling(
      seedId,
      seed.seed_pair.target,
      seed.legos
    );

    if (!validation.valid) {
      tilingErrors.push(validation);
      console.error(`  ❌ ${validation.error}`);
      console.error(`     Expected: "${validation.expected}"`);
      console.error(`     Got:      "${validation.got}"`);
    } else {
      totalLegos += seed.legos.length;
    }
  }

  if (tilingErrors.length > 0) {
    throw new Error(`Tiling validation failed for ${tilingErrors.length} seeds. Fix agent outputs and retry.`);
  }

  console.log(`[Phase 3 Merge] ✅ All seeds tile correctly`);

  // Assign final LEGO IDs
  console.log(`[Phase 3 Merge] Assigning final LEGO IDs...`);
  const { idMap, seenLegos } = assignLegoIds(allSeeds);

  console.log(`[Phase 3 Merge] ✅ Assigned ${idMap.size} final IDs`);
  console.log(`[Phase 3 Merge] Total unique LEGOs: ${seenLegos.size}`);
  console.log(`[Phase 3 Merge] Total LEGO instances: ${totalLegos}`);

  // Load seed_pairs.json for metadata
  const seedPairsPath = path.join(courseDir, 'seed_pairs.json');
  const seedPairs = await fs.readJson(seedPairsPath);

  // Build final lego_pairs.json
  const legoPairs = {
    version: '7.7.0',
    course: seedPairs.course,
    target_language: seedPairs.target_language,
    known_language: seedPairs.known_language,
    seed_range: seedPairs.seed_range,
    generated: new Date().toISOString(),
    total_seeds: totalSeeds,
    total_legos: totalLegos,
    unique_legos: seenLegos.size,
    seeds: allSeeds,
    _metadata: {
      extraction_agents: agentFiles.length,
      tiling_validated: true,
      phase: 'Phase 3 - LEGO Extraction',
      intelligence_version: '5.0 Ultimate'
    }
  };

  // Write final output
  const outputPath = path.join(courseDir, 'lego_pairs.json');
  await fs.writeJson(outputPath, legoPairs, { spaces: 2 });

  console.log(`[Phase 3 Merge] ✅ Merge complete!`);
  console.log(`[Phase 3 Merge] Total seeds: ${totalSeeds}`);
  console.log(`[Phase 3 Merge] Total LEGOs: ${totalLegos}`);
  console.log(`[Phase 3 Merge] Unique LEGOs: ${seenLegos.size}`);
  console.log(`[Phase 3 Merge] Reuse rate: ${((1 - seenLegos.size / totalLegos) * 100).toFixed(1)}%`);
  console.log(`[Phase 3 Merge] Output: ${outputPath}`);

  // Optionally run compact formatter
  const formatterPath = path.join(__dirname, '..', 'compact-json-formatter.cjs');
  if (await fs.pathExists(formatterPath)) {
    console.log(`[Phase 3 Merge] Running compact formatter...`);
    const { spawn } = require('child_process');

    await new Promise((resolve, reject) => {
      const formatter = spawn('node', [formatterPath, outputPath], {
        stdio: 'inherit'
      });

      formatter.on('close', (code) => {
        if (code === 0) {
          console.log(`[Phase 3 Merge] ✅ Formatted output`);
          resolve();
        } else {
          console.warn(`[Phase 3 Merge] ⚠️  Formatter exited with code ${code}`);
          resolve(); // Don't fail merge if formatter fails
        }
      });
    });
  }

  return {
    success: true,
    totalSeeds,
    totalLegos,
    uniqueLegos: seenLegos.size,
    reuseRate: ((1 - seenLegos.size / totalLegos) * 100).toFixed(1),
    outputPath
  };
}

// CLI usage
if (require.main === module) {
  const courseDir = process.argv[2];

  if (!courseDir) {
    console.error('Usage: node scripts/phase3_merge_legos.cjs <courseDir>');
    console.error('Example: node scripts/phase3_merge_legos.cjs public/vfs/courses/spa_for_eng');
    process.exit(1);
  }

  mergePhase3Legos(courseDir)
    .then(result => {
      console.log(`\n✅ Phase 3 merge complete!`);
      console.log(`   Total seeds: ${result.totalSeeds}`);
      console.log(`   Total LEGOs: ${result.totalLegos}`);
      console.log(`   Unique LEGOs: ${result.uniqueLegos}`);
      console.log(`   Reuse rate: ${result.reuseRate}%`);
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Merge failed:', error.message);
      process.exit(1);
    });
}

module.exports = { mergePhase3Legos };
