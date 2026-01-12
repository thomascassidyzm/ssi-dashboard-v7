#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load lego_pairs.json
const coursePath = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/zho_for_eng';
const legoPairsPath = path.join(coursePath, 'lego_pairs.json');
const legoPairs = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));

// My assignments
const myLegos = ['S0143L03', 'S0143L04', 'S0143L05', 'S0143L06', 'S0144L01'];

// Find the seeds
const s0143 = legoPairs.seeds.find(s => s.seed_id === 'S0143');
const s0144 = legoPairs.seeds.find(s => s.seed_id === 'S0144');

// Build available vocabulary (all LEGOs from earlier seeds + earlier LEGOs in current seed)
function buildAvailableVocab(seedId, legoId) {
  const availableVocab = {
    known: new Set(),
    target: new Set()
  };

  const seedIndex = legoPairs.seeds.findIndex(s => s.seed_id === seedId);

  // Add all LEGOs from previous seeds
  for (let i = 0; i < seedIndex; i++) {
    const seed = legoPairs.seeds[i];
    seed.legos.forEach(lego => {
      if (lego.new) {
        // Add the LEGO phrase
        availableVocab.known.add(lego.known);
        availableVocab.target.add(lego.target);

        // Split into words
        lego.known.toLowerCase().split(/\s+/).forEach(w => {
          if (w.trim()) availableVocab.known.add(w.trim());
        });

        // For Chinese, add individual characters and the whole phrase
        if (lego.target) {
          lego.target.split('').forEach(char => {
            if (char.trim()) availableVocab.target.add(char);
          });
        }
      }
    });
  }

  // Add earlier LEGOs from current seed
  const currentSeed = legoPairs.seeds[seedIndex];
  const legoIndex = currentSeed.legos.findIndex(l => l.id === legoId);

  for (let i = 0; i < legoIndex; i++) {
    const lego = currentSeed.legos[i];
    if (lego.new) {
      availableVocab.known.add(lego.known);
      availableVocab.target.add(lego.target);

      lego.known.toLowerCase().split(/\s+/).forEach(w => {
        if (w.trim()) availableVocab.known.add(w.trim());
      });

      if (lego.target) {
        lego.target.split('').forEach(char => {
          if (char.trim()) availableVocab.target.add(char);
        });
      }
    }
  }

  return {
    known: Array.from(availableVocab.known).sort(),
    target: Array.from(availableVocab.target).sort()
  };
}

// Get recent LEGOs (last 30 new LEGOs)
function getRecentLegos(beforeSeedId) {
  const recentLegos = [];
  const seedIndex = legoPairs.seeds.findIndex(s => s.seed_id === beforeSeedId);

  // Traverse backwards to find last 30 new LEGOs
  for (let i = seedIndex - 1; i >= 0 && recentLegos.length < 30; i--) {
    const seed = legoPairs.seeds[i];
    for (let j = seed.legos.length - 1; j >= 0 && recentLegos.length < 30; j--) {
      const lego = seed.legos[j];
      if (lego.new) {
        recentLegos.unshift({
          id: lego.id,
          known: lego.known,
          target: lego.target
        });
      }
    }
  }

  return recentLegos.slice(-30); // Last 30
}

// Build scaffolds for my LEGOs
const scaffolds = {};

myLegos.forEach(legoId => {
  const seedId = legoId.substring(0, 5); // S0143 or S0144
  const seed = legoPairs.seeds.find(s => s.seed_id === seedId);
  const lego = seed.legos.find(l => l.id === legoId);

  const availableVocab = buildAvailableVocab(seedId, legoId);
  const recentLegos = getRecentLegos(seedId);

  scaffolds[legoId] = {
    legoId: legoId,
    lego: {
      known: lego.known,
      target: lego.target,
      type: lego.type
    },
    seed: {
      id: seedId,
      known: seed.seed_pair.known,
      target: seed.seed_pair.target
    },
    availableVocab: availableVocab,
    recentLegos: recentLegos,
    practice_phrases: []
  };
});

// Output scaffolds
console.log(JSON.stringify({ scaffolds }, null, 2));

// Also save to file
fs.writeFileSync(
  '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/worker7_scaffolds.json',
  JSON.stringify({ scaffolds }, null, 2)
);

console.error('\n✅ Scaffolds generated and saved to worker7_scaffolds.json');
