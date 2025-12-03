#!/usr/bin/env node

/**
 * Phase 3 Basket Generation for seeds S0588, S0590, S0600
 * Course: cmn_for_eng (Chinese for English speakers)
 *
 * Generates practice baskets with Chinese characters (汉字) for each LEGO.
 */

import fs from 'fs';
import path from 'path';

// Read lego_pairs data
const legoPairsPath = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/cmn_for_eng/lego_pairs.json';
const legoPairs = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));

// Extract seed data
const seedData = {
  S0588: {
    seed_pair: { known: "So I wanted to grow up and leave home.", target: "所以我想长大离开家。" },
    legos: [
      { id: "S0588L01", type: "A", new: false, lego: { known: "so", target: "所以" } },
      { id: "S0588L02", type: "M", new: false, lego: { known: "I wanted", target: "我想" } },
      { id: "S0588L03", type: "A", new: false, lego: { known: "grow up", target: "长大" } },
      { id: "S0588L04", type: "M", new: true, lego: { known: "grow up and leave home", target: "长大离开家" } },
      { id: "S0588L05", type: "M", new: true, lego: { known: "leave home", target: "离开家" } },
      { id: "S0588L06", type: "A", new: false, lego: { known: "leave", target: "离开" } },
      { id: "S0588L07", type: "A", new: true, lego: { known: "home", target: "家" } }
    ]
  },
  S0590: {
    seed_pair: { known: "I saw the last bus leaving the station.", target: "我看到最后一班公交车离开车站。" },
    legos: [
      { id: "S0590L01", type: "M", new: false, lego: { known: "I saw", target: "我看到" } },
      { id: "S0590L02", type: "A", new: false, lego: { known: "see", target: "看到" } },
      { id: "S0590L03", type: "M", new: false, lego: { known: "the last bus", target: "最后一班公交车" } },
      { id: "S0590L04", type: "M", new: true, lego: { known: "leaving the station", target: "离开车站" } },
      { id: "S0590L05", type: "A", new: true, lego: { known: "station", target: "车站" } },
      { id: "S0590L06", type: "A", new: false, lego: { known: "leave", target: "离开" } }
    ]
  },
  S0600: {
    seed_pair: { known: "I'd have driven if you'd told me how tired you were.", target: "如果你告诉我你有多累，我会开车。" },
    legos: [
      { id: "S0600L01", type: "M", new: true, lego: { known: "if you'd told me how tired you were", target: "如果你告诉我你有多累" } },
      { id: "S0600L02", type: "M", new: true, lego: { known: "how tired you were", target: "你有多累" } },
      { id: "S0600L03", type: "A", new: true, lego: { known: "tired", target: "累" } },
      { id: "S0600L04", type: "M", new: true, lego: { known: "I'd have driven", target: "我会开车" } },
      { id: "S0600L05", type: "M", new: true, lego: { known: "told me how tired you were", target: "告诉我你有多累" } }
    ]
  }
};

// Practice phrase templates for Chinese
const practicePhrases = {
  S0588: {
    S0588L01: [
      { known: "So I came here", target: "所以我来这里" },
      { known: "So she left", target: "所以她离开了" },
      { known: "So we started", target: "所以我们开始了" },
      { known: "So he stopped", target: "所以他停下了" },
      { known: "So they arrived", target: "所以他们到了" },
      { known: "So I decided", target: "所以我决定了" },
      { known: "So you went", target: "所以你去了" },
      { known: "So it happened", target: "所以发生了" },
      { known: "So we agreed", target: "所以我们同意了" },
      { known: "So she understood", target: "所以她明白了" }
    ],
    S0588L02: [
      { known: "I wanted to go", target: "我想去" },
      { known: "I wanted to stay", target: "我想留下" },
      { known: "I wanted to leave", target: "我想离开" },
      { known: "I wanted to learn", target: "我想学习" },
      { known: "I wanted to help", target: "我想帮忙" },
      { known: "I wanted to see", target: "我想看" },
      { known: "I wanted to know", target: "我想知道" },
      { known: "I wanted to try", target: "我想试试" },
      { known: "I wanted to come", target: "我想来" },
      { known: "I wanted to start", target: "我想开始" }
    ],
    S0588L03: [
      { known: "I want to grow up", target: "我想长大" },
      { known: "She will grow up", target: "她会长大" },
      { known: "Children grow up quickly", target: "孩子们长大得很快" },
      { known: "We all grow up", target: "我们都长大了" },
      { known: "They grow up fast", target: "他们长大得很快" },
      { known: "You will grow up", target: "你会长大" },
      { known: "He needs to grow up", target: "他需要长大" },
      { known: "I grew up here", target: "我在这里长大" },
      { known: "She grew up there", target: "她在那里长大" },
      { known: "We grew up together", target: "我们一起长大" }
    ],
    S0588L04: [
      { known: "I wanted to grow up and leave home", target: "我想长大离开家" },
      { known: "She wanted to grow up and leave home", target: "她想长大离开家" },
      { known: "We all wanted to grow up and leave home", target: "我们都想长大离开家" },
      { known: "They planned to grow up and leave home", target: "他们计划长大离开家" },
      { known: "He needed to grow up and leave home", target: "他需要长大离开家" },
      { known: "You should grow up and leave home", target: "你应该长大离开家" },
      { known: "I decided to grow up and leave home", target: "我决定长大离开家" },
      { known: "Children want to grow up and leave home", target: "孩子们想长大离开家" },
      { known: "She planned to grow up and leave home", target: "她计划长大离开家" },
      { known: "We wanted to grow up and leave home", target: "我们想长大离开家" }
    ],
    S0588L05: [
      { known: "I want to leave home", target: "我想离开家" },
      { known: "She decided to leave home", target: "她决定离开家" },
      { known: "We need to leave home", target: "我们需要离开家" },
      { known: "They left home yesterday", target: "他们昨天离开家" },
      { known: "He will leave home soon", target: "他很快会离开家" },
      { known: "You should leave home", target: "你应该离开家" },
      { known: "I left home early", target: "我早早离开家" },
      { known: "She wants to leave home", target: "她想离开家" },
      { known: "We must leave home", target: "我们必须离开家" },
      { known: "They can leave home now", target: "他们现在可以离开家" }
    ],
    S0588L06: [
      { known: "I need to leave", target: "我需要离开" },
      { known: "She will leave soon", target: "她很快会离开" },
      { known: "We should leave now", target: "我们应该现在离开" },
      { known: "They left yesterday", target: "他们昨天离开了" },
      { known: "He wants to leave", target: "他想离开" },
      { known: "You can leave", target: "你可以离开" },
      { known: "I must leave", target: "我必须离开" },
      { known: "She decided to leave", target: "她决定离开" },
      { known: "We will leave together", target: "我们会一起离开" },
      { known: "They left early", target: "他们早早离开了" }
    ],
    S0588L07: [
      { known: "I am at home", target: "我在家" },
      { known: "She is going home", target: "她要回家" },
      { known: "We came home", target: "我们回家了" },
      { known: "They arrived home", target: "他们到家了" },
      { known: "He left home", target: "他离开家" },
      { known: "You are home", target: "你在家" },
      { known: "I miss home", target: "我想家" },
      { known: "She called home", target: "她给家里打电话" },
      { known: "We love home", target: "我们爱家" },
      { known: "They returned home", target: "他们回家了" }
    ]
  },
  S0590: {
    S0590L01: [
      { known: "I saw the bus", target: "我看到公交车" },
      { known: "I saw the car", target: "我看到汽车" },
      { known: "I saw the train", target: "我看到火车" },
      { known: "I saw the station", target: "我看到车站" },
      { known: "I saw her leaving", target: "我看到她离开" },
      { known: "I saw him arrive", target: "我看到他到达" },
      { known: "I saw them waiting", target: "我看到他们在等" },
      { known: "I saw it happen", target: "我看到它发生" },
      { known: "I saw you yesterday", target: "我昨天看到你" },
      { known: "I saw everything", target: "我看到一切" }
    ],
    S0590L02: [
      { known: "I want to see", target: "我想看到" },
      { known: "Can you see", target: "你能看到吗" },
      { known: "She will see", target: "她会看到" },
      { known: "We need to see", target: "我们需要看到" },
      { known: "They can see", target: "他们能看到" },
      { known: "He wants to see", target: "他想看到" },
      { known: "You should see", target: "你应该看到" },
      { known: "I see it now", target: "我现在看到它" },
      { known: "She saw everything", target: "她看到一切" },
      { known: "We will see", target: "我们会看到" }
    ],
    S0590L03: [
      { known: "I missed the last bus", target: "我错过了最后一班公交车" },
      { known: "She caught the last bus", target: "她赶上了最后一班公交车" },
      { known: "We took the last bus", target: "我们坐了最后一班公交车" },
      { known: "The last bus left", target: "最后一班公交车离开了" },
      { known: "They waited for the last bus", target: "他们等最后一班公交车" },
      { known: "He saw the last bus", target: "他看到最后一班公交车" },
      { known: "The last bus arrived", target: "最后一班公交车到了" },
      { known: "I need the last bus", target: "我需要最后一班公交车" },
      { known: "You missed the last bus", target: "你错过了最后一班公交车" },
      { known: "The last bus is coming", target: "最后一班公交车来了" }
    ],
    S0590L04: [
      { known: "I saw it leaving the station", target: "我看到它离开车站" },
      { known: "The bus is leaving the station", target: "公交车正在离开车站" },
      { known: "The train is leaving the station", target: "火车正在离开车站" },
      { known: "She saw them leaving the station", target: "她看到他们离开车站" },
      { known: "We watched it leaving the station", target: "我们看着它离开车站" },
      { known: "They are leaving the station now", target: "他们现在正在离开车站" },
      { known: "He saw the bus leaving the station", target: "他看到公交车离开车站" },
      { known: "The car is leaving the station", target: "汽车正在离开车站" },
      { known: "I watched her leaving the station", target: "我看着她离开车站" },
      { known: "You saw it leaving the station", target: "你看到它离开车站" }
    ],
    S0590L05: [
      { known: "I arrived at the station", target: "我到车站了" },
      { known: "She is at the station", target: "她在车站" },
      { known: "We went to the station", target: "我们去了车站" },
      { known: "They left the station", target: "他们离开车站" },
      { known: "The station is busy", target: "车站很忙" },
      { known: "He works at the station", target: "他在车站工作" },
      { known: "The station is closed", target: "车站关闭了" },
      { known: "I waited at the station", target: "我在车站等" },
      { known: "You found the station", target: "你找到车站了" },
      { known: "The station is near", target: "车站很近" }
    ],
    S0590L06: [
      { known: "I need to leave", target: "我需要离开" },
      { known: "She will leave tomorrow", target: "她明天会离开" },
      { known: "We should leave now", target: "我们应该现在离开" },
      { known: "They left yesterday", target: "他们昨天离开了" },
      { known: "He wants to leave", target: "他想离开" },
      { known: "You can leave", target: "你可以离开" },
      { known: "I must leave early", target: "我必须早离开" },
      { known: "She decided to leave", target: "她决定离开" },
      { known: "We will leave together", target: "我们会一起离开" },
      { known: "They left quietly", target: "他们悄悄离开了" }
    ]
  },
  S0600: {
    S0600L01: [
      { known: "If you'd told me how tired you were, I would have helped", target: "如果你告诉我你有多累，我会帮忙" },
      { known: "If you'd told me how tired you were, I would have understood", target: "如果你告诉我你有多累，我会理解" },
      { known: "If you'd told me how tired you were, I would have stopped", target: "如果你告诉我你有多累，我会停下" },
      { known: "If you'd told me how tired you were, I would have waited", target: "如果你告诉我你有多累，我会等" },
      { known: "If you'd told me how tired you were, I would have listened", target: "如果你告诉我你有多累，我会听" },
      { known: "If you'd told me how tired you were, I would have cared", target: "如果你告诉我你有多累，我会在意" },
      { known: "If you'd told me how tired you were, I would have changed plans", target: "如果你告诉我你有多累，我会改变计划" },
      { known: "If you'd told me how tired you were, I would have come earlier", target: "如果你告诉我你有多累，我会早点来" },
      { known: "If you'd told me how tired you were, I would have left sooner", target: "如果你告诉我你有多累，我会早点离开" },
      { known: "If you'd told me how tired you were, I would have known", target: "如果你告诉我你有多累，我会知道" }
    ],
    S0600L02: [
      { known: "I know how tired you were", target: "我知道你有多累" },
      { known: "She understands how tired you were", target: "她理解你有多累" },
      { known: "We saw how tired you were", target: "我们看到你有多累" },
      { known: "They didn't know how tired you were", target: "他们不知道你有多累" },
      { known: "He realized how tired you were", target: "他意识到你有多累" },
      { known: "You told me how tired you were", target: "你告诉我你有多累" },
      { known: "I noticed how tired you were", target: "我注意到你有多累" },
      { known: "She asked how tired you were", target: "她问你有多累" },
      { known: "We understood how tired you were", target: "我们理解你有多累" },
      { known: "They could see how tired you were", target: "他们能看到你有多累" }
    ],
    S0600L03: [
      { known: "I am tired", target: "我累" },
      { known: "She is very tired", target: "她很累" },
      { known: "We are all tired", target: "我们都累" },
      { known: "They were tired", target: "他们累了" },
      { known: "He feels tired", target: "他觉得累" },
      { known: "You look tired", target: "你看起来累" },
      { known: "I feel so tired", target: "我感觉很累" },
      { known: "She was extremely tired", target: "她非常累" },
      { known: "We got tired", target: "我们累了" },
      { known: "They are tired too", target: "他们也累" }
    ],
    S0600L04: [
      { known: "I'd have driven you home", target: "我会开车送你回家" },
      { known: "I'd have driven there myself", target: "我会自己开车去那里" },
      { known: "I'd have driven more carefully", target: "我会开车更小心" },
      { known: "I'd have driven faster", target: "我会开车更快" },
      { known: "I'd have driven slowly", target: "我会开车慢点" },
      { known: "I'd have driven at night", target: "我会晚上开车" },
      { known: "I'd have driven with you", target: "我会和你一起开车" },
      { known: "I'd have driven all day", target: "我会开车一整天" },
      { known: "I'd have driven yesterday", target: "我昨天会开车" },
      { known: "I'd have driven instead", target: "我会开车代替" }
    ],
    S0600L05: [
      { known: "You told me how tired you were", target: "你告诉我你有多累" },
      { known: "She told me how tired you were", target: "她告诉我你有多累" },
      { known: "He told me how tired you were", target: "他告诉我你有多累" },
      { known: "They told me how tired you were", target: "他们告诉我你有多累" },
      { known: "Someone told me how tired you were", target: "有人告诉我你有多累" },
      { known: "Nobody told me how tired you were", target: "没人告诉我你有多累" },
      { known: "Everyone told me how tired you were", target: "大家都告诉我你有多累" },
      { known: "She finally told me how tired you were", target: "她终于告诉我你有多累" },
      { known: "He never told me how tired you were", target: "他从未告诉我你有多累" },
      { known: "You should have told me how tired you were", target: "你应该告诉我你有多累" }
    ]
  }
};

// Generate basket for a seed
function generateBasket(seedId, seedInfo) {
  const baskets = {};

  seedInfo.legos.forEach((lego, index) => {
    const isLastLego = (index === seedInfo.legos.length - 1);
    const phrases = practicePhrases[seedId][lego.id] || [];

    baskets[lego.id] = {
      lego: lego.lego,
      is_final_lego: isLastLego,
      practice_phrases: phrases,
      phrase_count: phrases.length
    };
  });

  return {
    course: "cmn_for_eng",
    seed: seedId,
    baskets: baskets
  };
}

// Submit basket to server
async function submitBasket(basketData) {
  const url = 'http://localhost:3459/upload-basket';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(basketData)
    });

    const result = await response.json();

    if (response.ok) {
      console.log(`✓ Successfully submitted ${basketData.seed}`);
      return { success: true, seed: basketData.seed, result };
    } else {
      console.error(`✗ Failed to submit ${basketData.seed}: ${result.error || 'Unknown error'}`);
      return { success: false, seed: basketData.seed, error: result.error };
    }
  } catch (error) {
    console.error(`✗ Error submitting ${basketData.seed}: ${error.message}`);
    return { success: false, seed: basketData.seed, error: error.message };
  }
}

// Main execution
async function main() {
  console.log('Phase 3 Basket Generation - cmn_for_eng');
  console.log('Seeds: S0588, S0590, S0600\n');

  const results = [];

  for (const seedId of ['S0588', 'S0590', 'S0600']) {
    console.log(`\nGenerating basket for ${seedId}...`);
    const basketData = generateBasket(seedId, seedData[seedId]);

    // Save to file for inspection
    const outputPath = `/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/scripts/batch-temp/basket_${seedId}.json`;
    fs.writeFileSync(outputPath, JSON.stringify(basketData, null, 2));
    console.log(`  Saved to: ${outputPath}`);

    // Submit to server
    console.log(`  Submitting to server...`);
    const result = await submitBasket(basketData);
    results.push(result);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`\nSuccessful: ${successful.length}/3`);
  successful.forEach(r => console.log(`  ✓ ${r.seed}`));

  if (failed.length > 0) {
    console.log(`\nFailed: ${failed.length}/3`);
    failed.forEach(r => console.log(`  ✗ ${r.seed}: ${r.error}`));
  }
}

main().catch(console.error);
