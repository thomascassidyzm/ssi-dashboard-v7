#!/usr/bin/env node

const fs = require('fs');

console.log('Fixing Agent 02: Removing "plan" violation...\n');

const data = JSON.parse(fs.readFileSync('batch_output/agent_02_baskets.json', 'utf8'));

let fixed = 0;

// Navigate to S0321 -> S0282L04 phrase 6
if (data.seeds && data.seeds.S0321 && data.seeds.S0321.legos && data.seeds.S0321.legos.S0282L04) {
  const lego = data.seeds.S0321.legos.S0282L04;

  // Phrase 6 is index 5 (0-indexed)
  if (lego.practice_phrases && lego.practice_phrases[5]) {
    const phrase = lego.practice_phrases[5];
    console.log('Original phrase:');
    console.log(`  English: ${phrase[0]}`);
    console.log(`  Spanish: ${phrase[1]}`);

    // Replace "un plan" with something valid
    // Current: "creo que necesita un plan" (I think that needs a plan)
    // Options without "plan":
    //   - "creo que necesita tiempo" (I think that needs time)
    //   - "creo que eso necesita trabajo" (I think that needs work)
    // But we need to check if "tiempo" or "trabajo" are in whitelist

    // Simpler approach: replace entire phrase with something we know works
    // Let's make it: "I think that needs more" -> "creo que eso necesita más"
    phrase[0] = "I think that needs more";
    phrase[1] = "creo que eso necesita más";

    console.log('\nReplaced with:');
    console.log(`  English: ${phrase[0]}`);
    console.log(`  Spanish: ${phrase[1]}`);

    fixed++;
  }
}

if (fixed > 0) {
  fs.writeFileSync('batch_output/agent_02_baskets.json', JSON.stringify(data, null, 2));
  console.log('\n✅ Agent 02 fixed and saved');
} else {
  console.log('\n❌ Could not find the violation to fix');
}
