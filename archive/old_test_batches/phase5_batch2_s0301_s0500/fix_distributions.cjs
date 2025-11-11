#!/usr/bin/env node

const fs = require('fs');

console.log('Fixing distribution metadata for Agents 01, 06, and 07...\n');

function countLegoWords(legoArray) {
  if (!Array.isArray(legoArray)) return 0;
  return legoArray.join(' ').split(/\s+/).length;
}

function recalculateDistribution(lego) {
  const distribution = {
    really_short_1_2: 0,
    quite_short_3: 0,
    longer_4_5: 0,
    long_6_plus: 0
  };

  if (!lego.practice_phrases) {
    return distribution;
  }

  for (const phrase of lego.practice_phrases) {
    const legoCount = phrase[3]; // 4th element is LEGO count

    if (legoCount >= 1 && legoCount <= 2) {
      distribution.really_short_1_2++;
    } else if (legoCount === 3) {
      distribution.quite_short_3++;
    } else if (legoCount >= 4 && legoCount <= 5) {
      distribution.longer_4_5++;
    } else if (legoCount >= 6) {
      distribution.long_6_plus++;
    }
  }

  return distribution;
}

function fixAgentDistributions(agentNum) {
  const filename = `batch_output/agent_${String(agentNum).padStart(2, '0')}_baskets.json`;
  console.log(`Processing Agent ${String(agentNum).padStart(2, '0')}...`);

  const data = JSON.parse(fs.readFileSync(filename, 'utf8'));
  const seeds = data.seeds || data;

  let fixed = 0;
  let errors = 0;

  for (const seedId in seeds) {
    if (!seedId.match(/^S\d{4}$/)) continue;
    const seed = seeds[seedId];
    const legos = seed.legos || seed;

    for (const legoId in legos) {
      if (!legoId.match(/^S\d{4}L\d{2}$/)) continue;
      const lego = legos[legoId];

      if (!lego.practice_phrases) continue;

      // Recalculate distribution
      const newDist = recalculateDistribution(lego);

      // Check if it differs from current
      const oldDist = lego.phrase_distribution;
      if (!oldDist ||
          oldDist.really_short_1_2 !== newDist.really_short_1_2 ||
          oldDist.quite_short_3 !== newDist.quite_short_3 ||
          oldDist.longer_4_5 !== newDist.longer_4_5 ||
          oldDist.long_6_plus !== newDist.long_6_plus) {

        // Update distribution
        lego.phrase_distribution = newDist;
        fixed++;

        // Check if it's still wrong (not 2-2-2-4)
        if (newDist.really_short_1_2 !== 2 || newDist.quite_short_3 !== 2 ||
            newDist.longer_4_5 !== 2 || newDist.long_6_plus !== 4) {
          if (errors < 5) {
            console.log(`  ⚠️  ${legoId}: ${newDist.really_short_1_2}-${newDist.quite_short_3}-${newDist.longer_4_5}-${newDist.long_6_plus} (not 2-2-2-4)`);
          }
          errors++;
        }
      }
    }
  }

  console.log(`  Fixed ${fixed} distribution metadata entries`);
  if (errors > 0) {
    console.log(`  ⚠️  ${errors} LEGOs still don't match 2-2-2-4 pattern`);
    if (errors > 5) {
      console.log(`     (showing first 5 only)`);
    }
  }

  fs.writeFileSync(filename, JSON.stringify(data, null, 2));
  console.log(`  ✅ Saved ${filename}\n`);
}

// Fix Agents 01, 06, and 07
fixAgentDistributions(1);
fixAgentDistributions(6);
fixAgentDistributions(7);

console.log('✅ All distribution metadata fixed');
