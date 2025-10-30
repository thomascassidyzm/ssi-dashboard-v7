const fs = require('fs');
const path = require('path');

// Read lego_pairs.json
const legoPairsPath = path.join(__dirname, 'vfs/courses/spa_for_eng/lego_pairs.json');
const legoPairs = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));

// LEGO IDs to find
const targetLegoIds = [
  "S0585L04", "S0585L05", "S0586L02", "S0586L03", "S0587L01",
  "S0587L02", "S0587L03", "S0587L04", "S0587L05", "S0588L05",
  "S0588L06", "S0589L02", "S0589L03", "S0589L05", "S0589L06",
  "S0590L04", "S0590L05", "S0590L06", "S0591L02", "S0591L03"
];

// Create a map of all LEGOs for quick lookup
const legoMap = new Map();

// Process all seeds and their LEGOs
legoPairs.seeds.forEach(seed => {
  const [seedId, seedPair, legos] = seed;
  legos.forEach(lego => {
    const [legoId, type, targetText, knownText, dependencies] = lego;
    legoMap.set(legoId, {
      id: legoId,
      type,
      targetText,
      knownText,
      dependencies
    });
  });
});

// Generate baskets
const baskets = [];

targetLegoIds.forEach(legoId => {
  const lego = legoMap.get(legoId);
  if (!lego) {
    console.error(`LEGO ${legoId} not found!`);
    return;
  }

  // Create basket with lego_a (target) and lego_b (known)
  baskets.push({
    lego_a: lego.targetText,
    lego_b: lego.knownText
  });
});

console.log(`Generated ${baskets.length} baskets out of ${targetLegoIds.length} requested`);

// Write output
const outputPath = path.join(__dirname, 'vfs/courses/spa_for_eng/phase5_segments/segment_03/orch_03/agent_03_baskets.json');
const outputDir = path.dirname(outputPath);

// Ensure directory exists
fs.mkdirSync(outputDir, { recursive: true });

// Write the baskets
fs.writeFileSync(outputPath, JSON.stringify(baskets, null, 2), 'utf8');

console.log(`Baskets written to: ${outputPath}`);
