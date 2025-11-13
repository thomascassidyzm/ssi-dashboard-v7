#!/usr/bin/env node
/**
 * Phase 3 v7.0 Segment Merger
 * Merges all agent_XX_output.json files from segments into final lego_pairs.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { glob } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Find all agent output files across all segments
const pattern = 'public/vfs/courses/spa_for_eng_s*/segments/segment_*/agent_*_output.json';
const agentFiles = await glob(pattern, { cwd: __dirname });

console.log(`\n🔍 Found ${agentFiles.length} agent output files\n`);

// Collect all LEGOs from all agents
const allLegos = [];
let totalSeeds = 0;
const seenLegoIds = new Set();
const duplicateLegoIds = [];

// Process each agent output file
agentFiles.forEach((file, index) => {
  const filePath = path.join(__dirname, file);
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const agentData = JSON.parse(content);

    if (!agentData.seeds || !Array.isArray(agentData.seeds)) {
      console.warn(`⚠️  No seeds array in ${file}`);
      return;
    }

    console.log(`📦 Processing ${path.basename(file)}: ${agentData.seeds.length} seeds, range ${agentData.seed_range}`);

    totalSeeds += agentData.seeds.length;

    // Extract LEGOs from each seed
    agentData.seeds.forEach(seed => {
      if (!seed.legos || !Array.isArray(seed.legos)) {
        console.warn(`⚠️  No legos array in seed ${seed.seed_id}`);
        return;
      }

      seed.legos.forEach(lego => {
        // Check for duplicate LEGO IDs
        if (seenLegoIds.has(lego.id)) {
          duplicateLegoIds.push(lego.id);
        } else {
          seenLegoIds.add(lego.id);
        }

        // Add source metadata
        allLegos.push({
          ...lego,
          source_seed: seed.seed_id,
          extracted_by: agentData.agent_id,
          methodology: agentData.methodology || 'Phase 3 v7.0 - Two Heuristics Edition'
        });
      });
    });

  } catch (error) {
    console.error(`❌ Error processing ${file}: ${error.message}`);
  }
});

console.log(`\n📊 Extraction Summary:`);
console.log(`   Seeds processed: ${totalSeeds}`);
console.log(`   Total LEGOs: ${allLegos.length}`);
console.log(`   Unique LEGO IDs: ${seenLegoIds.size}`);
if (duplicateLegoIds.length > 0) {
  console.log(`   ⚠️  Duplicate IDs found: ${duplicateLegoIds.length} (${duplicateLegoIds.slice(0, 5).join(', ')}...)`);
}

// Create final output structure
const output = {
  version: "8.1.1",
  phase: "3",
  methodology: "Phase 3 v7.0 - Two Heuristics Edition",
  generated_at: new Date().toISOString(),
  course: "spa_for_eng",
  total_seeds: totalSeeds,
  total_legos: allLegos.length,
  legos: allLegos
};

// Write to main course directory alongside seed_pairs.json
const outputPath = path.join(__dirname, 'public/vfs/courses/spa_for_eng/lego_pairs.json');

// Create directory if it doesn't exist
const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');

console.log(`\n✅ Success!`);
console.log(`   Written to: ${outputPath}`);
console.log(`   File size: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`);
console.log(`   Location: public/vfs/courses/spa_for_eng/lego_pairs.json (alongside seed_pairs.json)\n`);
