#!/usr/bin/env node
/**
 * Phase 3 v7.0 Segment Merger
 * Merges all agent_XX_output.json files into hierarchical lego_pairs.json
 * Preserves seed_pair → legos structure for standalone completeness
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

// Collect all seeds with their LEGOs
const allSeeds = new Map(); // seed_id -> {seed_pair, legos}
let totalLegoCount = 0;
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

    // Process each seed
    agentData.seeds.forEach(seed => {
      if (!seed.legos || !Array.isArray(seed.legos)) {
        console.warn(`⚠️  No legos array in seed ${seed.seed_id}`);
        return;
      }

      // Skip if we already have this seed (from quick test duplicates)
      if (allSeeds.has(seed.seed_id)) {
        console.log(`   ⚠️  Skipping duplicate seed ${seed.seed_id}`);
        return;
      }

      // Filter out duplicate LEGOs within this seed
      const uniqueLegos = [];
      seed.legos.forEach(lego => {
        if (seenLegoIds.has(lego.id)) {
          duplicateLegoIds.push(lego.id);
        } else {
          seenLegoIds.add(lego.id);
          uniqueLegos.push({
            id: lego.id,
            type: lego.type,
            target: lego.target,
            known: lego.known,
            new: lego.new,
            ...(lego.components && { components: lego.components })
          });
          totalLegoCount++;
        }
      });

      // Store seed with its LEGOs
      allSeeds.set(seed.seed_id, {
        seed_id: seed.seed_id,
        seed_pair: seed.seed_pair,
        legos: uniqueLegos
      });
    });

  } catch (error) {
    console.error(`❌ Error processing ${file}: ${error.message}`);
  }
});

// Sort seeds by ID
const sortedSeeds = Array.from(allSeeds.values()).sort((a, b) => {
  const aNum = parseInt(a.seed_id.replace('S', ''));
  const bNum = parseInt(b.seed_id.replace('S', ''));
  return aNum - bNum;
});

console.log(`\n📊 Extraction Summary:`);
console.log(`   Seeds processed: ${sortedSeeds.length}`);
console.log(`   Total LEGOs: ${totalLegoCount}`);
console.log(`   Unique LEGO IDs: ${seenLegoIds.size}`);
if (duplicateLegoIds.length > 0) {
  console.log(`   ⚠️  Duplicates skipped: ${duplicateLegoIds.length}`);
}

// Create final output structure
const output = {
  version: "8.1.1",
  phase: "3",
  methodology: "Phase 3 v7.0 - Two Heuristics Edition",
  generated_at: new Date().toISOString(),
  course: "spa_for_eng",
  total_seeds: sortedSeeds.length,
  total_legos: totalLegoCount,
  seeds: sortedSeeds
};

// Write to main course directory alongside seed_pairs.json
const outputPath = path.join(__dirname, 'public/vfs/courses/spa_for_eng/lego_pairs.json');

// Create directory if it doesn't exist
const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Use manual formatting to match agent output exactly
let jsonOutput = '{\n';
jsonOutput += '  "version": "8.1.1",\n';
jsonOutput += '  "phase": "3",\n';
jsonOutput += '  "methodology": "Phase 3 v7.0 - Two Heuristics Edition",\n';
jsonOutput += `  "generated_at": "${output.generated_at}",\n`;
jsonOutput += '  "course": "spa_for_eng",\n';
jsonOutput += `  "total_seeds": ${output.total_seeds},\n`;
jsonOutput += `  "total_legos": ${output.total_legos},\n`;
jsonOutput += '  "seeds": [\n';

sortedSeeds.forEach((seed, seedIndex) => {
  jsonOutput += '    {\n';
  jsonOutput += `      "seed_id": "${seed.seed_id}",\n`;
  jsonOutput += `      "seed_pair": ${JSON.stringify(seed.seed_pair)},\n`;
  jsonOutput += '      "legos": [\n';

  seed.legos.forEach((lego, legoIndex) => {
    jsonOutput += '        {\n';
    jsonOutput += `          "id": "${lego.id}",\n`;
    jsonOutput += `          "type": "${lego.type}",\n`;
    jsonOutput += `          "target": "${lego.target}",\n`;
    jsonOutput += `          "known": "${lego.known}",\n`;
    jsonOutput += `          "new": ${lego.new}`;

    if (lego.components) {
      jsonOutput += ',\n          "components": [\n';
      lego.components.forEach((comp, compIndex) => {
        jsonOutput += `            ${JSON.stringify(comp)}`;
        if (compIndex < lego.components.length - 1) jsonOutput += ',';
        jsonOutput += '\n';
      });
      jsonOutput += '          ]\n';
    } else {
      jsonOutput += '\n';
    }

    jsonOutput += '        }';
    if (legoIndex < seed.legos.length - 1) jsonOutput += ',';
    jsonOutput += '\n';
  });

  jsonOutput += '      ]\n';
  jsonOutput += '    }';
  if (seedIndex < sortedSeeds.length - 1) jsonOutput += ',';
  jsonOutput += '\n';
});

jsonOutput += '  ]\n';
jsonOutput += '}\n';

fs.writeFileSync(outputPath, jsonOutput, 'utf8');

console.log(`\n✅ Success!`);
console.log(`   Written to: ${outputPath}`);
console.log(`   File size: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`);
console.log(`   Format: Hierarchical (seed_pair → legos) with compact components`);
console.log(`   Structure: Complete standalone document`);
console.log(`   Location: public/vfs/courses/spa_for_eng/lego_pairs.json (alongside seed_pairs.json)\n`);
