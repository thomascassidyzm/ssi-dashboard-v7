#!/usr/bin/env node
/**
 * Phase 3 v7.0 Segment Merger
 * Merges all agent_XX_output.json files from segments into compact lego_pairs.json
 * Matches agent output format with compact component arrays
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
          return; // Skip duplicates
        }
        seenLegoIds.add(lego.id);

        // Add LEGO in compact format (just the essential fields)
        allLegos.push({
          id: lego.id,
          type: lego.type,
          target: lego.target,
          known: lego.known,
          new: lego.new,
          ...(lego.components && { components: lego.components })
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
  console.log(`   ⚠️  Duplicates skipped: ${duplicateLegoIds.length}`);
}

// Create final compact output structure
const output = {
  version: "8.1.1",
  phase: "3",
  methodology: "Phase 3 v7.0 - Two Heuristics Edition",
  generated_at: new Date().toISOString(),
  course: "spa_for_eng",
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

// Use manual formatting to match agent output exactly
let jsonOutput = '{\n';
jsonOutput += '  "version": "8.1.1",\n';
jsonOutput += '  "phase": "3",\n';
jsonOutput += '  "methodology": "Phase 3 v7.0 - Two Heuristics Edition",\n';
jsonOutput += `  "generated_at": "${output.generated_at}",\n`;
jsonOutput += '  "course": "spa_for_eng",\n';
jsonOutput += `  "total_legos": ${output.total_legos},\n`;
jsonOutput += '  "legos": [\n';

allLegos.forEach((lego, index) => {
  jsonOutput += '    {\n';
  jsonOutput += `      "id": "${lego.id}",\n`;
  jsonOutput += `      "type": "${lego.type}",\n`;
  jsonOutput += `      "target": "${lego.target}",\n`;
  jsonOutput += `      "known": "${lego.known}",\n`;
  jsonOutput += `      "new": ${lego.new}`;

  if (lego.components) {
    jsonOutput += ',\n      "components": [\n';
    lego.components.forEach((comp, compIndex) => {
      jsonOutput += `        ${JSON.stringify(comp)}`;
      if (compIndex < lego.components.length - 1) jsonOutput += ',';
      jsonOutput += '\n';
    });
    jsonOutput += '      ]\n';
  } else {
    jsonOutput += '\n';
  }

  jsonOutput += '    }';
  if (index < allLegos.length - 1) jsonOutput += ',';
  jsonOutput += '\n';
});

jsonOutput += '  ]\n';
jsonOutput += '}\n';

fs.writeFileSync(outputPath, jsonOutput, 'utf8');

console.log(`\n✅ Success!`);
console.log(`   Written to: ${outputPath}`);
console.log(`   File size: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`);
console.log(`   Format: Compact components (matches agent output format)`);
console.log(`   Location: public/vfs/courses/spa_for_eng/lego_pairs.json (alongside seed_pairs.json)\n`);
