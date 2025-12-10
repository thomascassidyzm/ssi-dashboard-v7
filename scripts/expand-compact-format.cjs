#!/usr/bin/env node
/**
 * Expand compact v7 format to full format
 * Usage: node expand-compact-format.cjs <input.json> [output.json]
 */

const fs = require('fs');
const path = require('path');

const inputPath = process.argv[2];
const outputPath = process.argv[3] || inputPath;

if (!inputPath) {
  console.error('Usage: node expand-compact-format.cjs <input.json> [output.json]');
  process.exit(1);
}

function expandCompactFormat(compactData) {
  return compactData.map(seed => {
    // Check if already in full format
    if (seed.seed_id) return seed;

    // v7 Hybrid format: array-based
    if (Array.isArray(seed)) {
      const [seedId, seedPair, legos] = seed;
      return {
        seed_id: seedId,
        seed_pair: {
          known: seedPair.k,
          target: seedPair.t
        },
        legos: (legos || []).map((lego, idx) => {
          const [type, isNew, legoPair, components] = lego;
          const expanded = {
            id: `${seedId}L${String(idx + 1).padStart(2, '0')}`,
            type: type,
            new: isNew === 1 || isNew === true,
            lego: {
              known: legoPair.k,
              target: legoPair.t
            }
          };
          if (components && components.length > 0) {
            expanded.components = components.map(c => ({
              known: c.k,
              target: c.t
            }));
          }
          return expanded;
        })
      };
    }

    return seed;
  });
}

console.log(`Reading: ${inputPath}`);
const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

const expanded = expandCompactFormat(data);

const output = {
  version: "11.0",
  format: "expanded",
  seeds: expanded
};

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
console.log(`Wrote expanded format to: ${outputPath}`);
console.log(`Seeds: ${expanded.length}`);
