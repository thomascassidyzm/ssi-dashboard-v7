#!/usr/bin/env node

/**
 * Merge Phase 1 agent translation outputs into final seed_pairs.json
 *
 * Usage: node scripts/merge_phase1_translations.cjs <courseDir>
 *
 * Reads: <courseDir>/translations/agent_XX_translations.json (all agents)
 * Writes: <courseDir>/seed_pairs.json (merged final output)
 */

const fs = require('fs-extra');
const path = require('path');

async function mergePhase1Translations(courseDir) {
  console.log(`[Merge Phase 1] Starting merge for: ${courseDir}`);

  const translationsDir = path.join(courseDir, 'translations');

  // Check if translations directory exists
  if (!await fs.pathExists(translationsDir)) {
    throw new Error(`Translations directory not found: ${translationsDir}`);
  }

  // Read all agent translation files
  const files = await fs.readdir(translationsDir);
  const agentFiles = files
    .filter(f => f.match(/^agent_\d+_translations\.json$/))
    .sort();

  if (agentFiles.length === 0) {
    throw new Error(`No agent translation files found in ${translationsDir}`);
  }

  console.log(`[Merge Phase 1] Found ${agentFiles.length} agent outputs`);

  // Load all agent translations
  const agentData = await Promise.all(
    agentFiles.map(async (file) => {
      const filePath = path.join(translationsDir, file);
      const data = await fs.readJson(filePath);
      console.log(`[Merge Phase 1] Loaded agent ${data.agent_id}: ${Object.keys(data.translations).length} translations`);
      return data;
    })
  );

  // Merge all translations
  const mergedTranslations = {};
  let totalSeeds = 0;

  for (const agent of agentData) {
    Object.assign(mergedTranslations, agent.translations);
    totalSeeds += Object.keys(agent.translations).length;
  }

  // Get course code and languages from first agent
  const firstAgent = agentData[0];
  const courseCode = path.basename(courseDir);

  // Extract target and known language codes from course code
  // Format: target_for_known (e.g., "spa_for_eng")
  const [target, , known] = courseCode.split('_');

  // Find seed range
  const seedIds = Object.keys(mergedTranslations).sort();
  const startSeed = parseInt(seedIds[0].substring(1)); // Remove 'S' prefix
  const endSeed = parseInt(seedIds[seedIds.length - 1].substring(1));

  // Build final seed_pairs.json
  const seedPairs = {
    version: '7.7.0',
    course: courseCode,
    target_language: target,
    known_language: known,
    seed_range: {
      start: startSeed,
      end: endSeed
    },
    generated: new Date().toISOString(),
    total_seeds: totalSeeds,
    actual_seeds: totalSeeds,
    translations: mergedTranslations
  };

  // Write final output
  const outputPath = path.join(courseDir, 'seed_pairs.json');
  await fs.writeJson(outputPath, seedPairs, { spaces: 2 });

  console.log(`[Merge Phase 1] ✅ Merge complete!`);
  console.log(`[Merge Phase 1] Total seeds: ${totalSeeds}`);
  console.log(`[Merge Phase 1] Range: S${String(startSeed).padStart(4, '0')}-S${String(endSeed).padStart(4, '0')}`);
  console.log(`[Merge Phase 1] Output: ${outputPath}`);

  // Optionally run compact formatter
  const formatterPath = path.join(__dirname, '..', 'compact-json-formatter.cjs');
  if (await fs.pathExists(formatterPath)) {
    console.log(`[Merge Phase 1] Running compact formatter...`);
    const { spawn } = require('child_process');

    await new Promise((resolve, reject) => {
      const formatter = spawn('node', [formatterPath, outputPath], {
        stdio: 'inherit'
      });

      formatter.on('close', (code) => {
        if (code === 0) {
          console.log(`[Merge Phase 1] ✅ Formatted output`);
          resolve();
        } else {
          console.warn(`[Merge Phase 1] ⚠️  Formatter exited with code ${code}`);
          resolve(); // Don't fail merge if formatter fails
        }
      });
    });
  }

  return { success: true, totalSeeds, outputPath };
}

// CLI usage
if (require.main === module) {
  const courseDir = process.argv[2];

  if (!courseDir) {
    console.error('Usage: node scripts/merge_phase1_translations.cjs <courseDir>');
    console.error('Example: node scripts/merge_phase1_translations.cjs public/vfs/courses/spa_for_eng');
    process.exit(1);
  }

  mergePhase1Translations(courseDir)
    .then(result => {
      console.log(`\n✅ Phase 1 merge complete: ${result.totalSeeds} seeds`);
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Merge failed:', error.message);
      process.exit(1);
    });
}

module.exports = { mergePhase1Translations };
