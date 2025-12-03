/**
 * Phase 3 Basket Generation - Seeds S0663, S0664, S0665
 * Course: cmn_for_eng (Chinese for English speakers)
 *
 * Generates baskets with practice phrases for each LEGO in the specified seeds.
 */

const axios = require('axios');

// LEGO data extracted from lego_pairs.json
const seedData = {
  S0663: {
    seed_pair: { known: "what you all said", target: "你们大家说的话" },
    legos: [
      {
        id: "S0663L01",
        type: "M",
        new: false,
        lego: { known: "you all", target: "你们大家" }
      },
      {
        id: "S0663L02",
        type: "M",
        new: false,
        lego: { known: "what (someone) said", target: "说的话" }
      },
      {
        id: "S0663L03",
        type: "M",
        new: true,
        lego: { known: "what you all said", target: "你们大家说的话" }
      }
    ]
  },
  S0664: {
    seed_pair: { known: "Are you all ready?", target: "你们大家都准备好了吗？" },
    legos: [
      {
        id: "S0664L01",
        type: "M",
        new: false,
        lego: { known: "you all", target: "你们大家都" }
      },
      {
        id: "S0664L02",
        type: "M",
        new: true,
        lego: { known: "ready / prepared (completed)", target: "准备好了" }
      },
      {
        id: "S0664L03",
        type: "M",
        new: true,
        lego: { known: "ready? / Are (you) ready?", target: "准备好了吗" }
      }
    ]
  },
  S0665: {
    seed_pair: { known: "Do you all want to go?", target: "你们大家都想去吗？" },
    legos: [
      {
        id: "S0665L01",
        type: "M",
        new: false,
        lego: { known: "you all", target: "你们大家都" }
      },
      {
        id: "S0665L02",
        type: "M",
        new: false,
        lego: { known: "want to go", target: "想去" }
      },
      {
        id: "S0665L03",
        type: "M",
        new: true,
        lego: { known: "want to go? / Do (you) want to go?", target: "想去吗" }
      }
    ]
  }
};

// Practice phrases generator
function generatePracticePhrases(legoId, lego) {
  const phrases = {
    // S0663L01: you all
    "S0663L01": [
      { known: "you all understand", target: "你们大家明白" },
      { known: "you all know", target: "你们大家知道" },
      { known: "you all like", target: "你们大家喜欢" },
      { known: "you all want", target: "你们大家想要" },
      { known: "you all see", target: "你们大家看到" },
      { known: "you all hear", target: "你们大家听到" },
      { known: "you all come", target: "你们大家来" },
      { known: "you all go", target: "你们大家去" },
      { known: "you all eat", target: "你们大家吃" },
      { known: "you all drink", target: "你们大家喝" }
    ],

    // S0663L02: what (someone) said
    "S0663L02": [
      { known: "what I said", target: "我说的话" },
      { known: "what he said", target: "他说的话" },
      { known: "what she said", target: "她说的话" },
      { known: "what they said", target: "他们说的话" },
      { known: "what we said", target: "我们说的话" },
      { known: "what the teacher said", target: "老师说的话" },
      { known: "what the friend said", target: "朋友说的话" },
      { known: "what the child said", target: "孩子说的话" },
      { known: "what the student said", target: "学生说的话" },
      { known: "what the person said", target: "那个人说的话" }
    ],

    // S0663L03: what you all said
    "S0663L03": [
      { known: "what you all said yesterday", target: "你们大家昨天说的话" },
      { known: "what you all said today", target: "你们大家今天说的话" },
      { known: "what you all said is correct", target: "你们大家说的话是对的" },
      { known: "what you all said is important", target: "你们大家说的话很重要" },
      { known: "I heard what you all said", target: "我听到你们大家说的话" },
      { known: "I understand what you all said", target: "我明白你们大家说的话" },
      { known: "I remember what you all said", target: "我记得你们大家说的话" },
      { known: "I forgot what you all said", target: "我忘了你们大家说的话" },
      { known: "what you all said earlier", target: "你们大家之前说的话" },
      { known: "what you all said just now", target: "你们大家刚才说的话" }
    ],

    // S0664L01: you all
    "S0664L01": [
      { known: "you all understand", target: "你们大家都明白" },
      { known: "you all know", target: "你们大家都知道" },
      { known: "you all like", target: "你们大家都喜欢" },
      { known: "you all want", target: "你们大家都想要" },
      { known: "you all can", target: "你们大家都可以" },
      { known: "you all need", target: "你们大家都需要" },
      { known: "you all have", target: "你们大家都有" },
      { known: "you all are", target: "你们大家都是" },
      { known: "you all should", target: "你们大家都应该" },
      { known: "you all must", target: "你们大家都必须" }
    ],

    // S0664L02: ready / prepared (completed)
    "S0664L02": [
      { known: "I'm ready", target: "我准备好了" },
      { known: "he's ready", target: "他准备好了" },
      { known: "she's ready", target: "她准备好了" },
      { known: "they're ready", target: "他们准备好了" },
      { known: "we're ready", target: "我们准备好了" },
      { known: "everything is ready", target: "一切都准备好了" },
      { known: "the food is ready", target: "饭菜准备好了" },
      { known: "the room is ready", target: "房间准备好了" },
      { known: "the materials are ready", target: "材料准备好了" },
      { known: "not ready yet", target: "还没准备好了" }
    ],

    // S0664L03: ready? / Are (you) ready?
    "S0664L03": [
      { known: "Are you ready?", target: "你准备好了吗" },
      { known: "Is he ready?", target: "他准备好了吗" },
      { known: "Is she ready?", target: "她准备好了吗" },
      { known: "Are they ready?", target: "他们准备好了吗" },
      { known: "Are we ready?", target: "我们准备好了吗" },
      { known: "Is everything ready?", target: "一切都准备好了吗" },
      { known: "Is the food ready?", target: "饭菜准备好了吗" },
      { known: "Is the room ready?", target: "房间准备好了吗" },
      { known: "Are the materials ready?", target: "材料准备好了吗" },
      { known: "Is it ready?", target: "准备好了吗" }
    ],

    // S0665L01: you all
    "S0665L01": [
      { known: "you all understand", target: "你们大家都明白" },
      { known: "you all agree", target: "你们大家都同意" },
      { known: "you all believe", target: "你们大家都相信" },
      { known: "you all think", target: "你们大家都认为" },
      { known: "you all feel", target: "你们大家都觉得" },
      { known: "you all remember", target: "你们大家都记得" },
      { known: "you all forgot", target: "你们大家都忘了" },
      { known: "you all learned", target: "你们大家都学会了" },
      { known: "you all finished", target: "你们大家都完成了" },
      { known: "you all arrived", target: "你们大家都到了" }
    ],

    // S0665L02: want to go
    "S0665L02": [
      { known: "I want to go", target: "我想去" },
      { known: "he wants to go", target: "他想去" },
      { known: "she wants to go", target: "她想去" },
      { known: "they want to go", target: "他们想去" },
      { known: "we want to go", target: "我们想去" },
      { known: "don't want to go", target: "不想去" },
      { known: "really want to go", target: "很想去" },
      { known: "also want to go", target: "也想去" },
      { known: "want to go together", target: "想一起去" },
      { known: "want to go now", target: "现在想去" }
    ],

    // S0665L03: want to go? / Do (you) want to go?
    "S0665L03": [
      { known: "Do you want to go?", target: "你想去吗" },
      { known: "Does he want to go?", target: "他想去吗" },
      { known: "Does she want to go?", target: "她想去吗" },
      { known: "Do they want to go?", target: "他们想去吗" },
      { known: "Do we want to go?", target: "我们想去吗" },
      { known: "Do you also want to go?", target: "你也想去吗" },
      { known: "Do you really want to go?", target: "你真的想去吗" },
      { known: "Do you want to go together?", target: "你想一起去吗" },
      { known: "Do you want to go now?", target: "你现在想去吗" },
      { known: "Do you want to go tomorrow?", target: "你明天想去吗" }
    ]
  };

  return phrases[legoId] || [];
}

// Generate baskets for a seed
function generateBasketsForSeed(seedId, data) {
  const baskets = {};
  const totalLegos = data.legos.length;

  data.legos.forEach((lego, index) => {
    const isLastLego = (index === totalLegos - 1);
    const practicePhrases = generatePracticePhrases(lego.id, lego.lego);

    baskets[lego.id] = {
      lego: lego.lego,
      is_final_lego: isLastLego,
      practice_phrases: practicePhrases,
      phrase_count: practicePhrases.length
    };
  });

  return baskets;
}

// Submit baskets to API
async function submitBasket(course, seedId, baskets) {
  const url = 'http://localhost:3459/upload-basket';
  const payload = {
    course: course,
    seed: seedId,
    baskets: baskets
  };

  try {
    const response = await axios.post(url, payload);
    return { success: true, seedId, response: response.data };
  } catch (error) {
    return {
      success: false,
      seedId,
      error: error.response ? error.response.data : error.message
    };
  }
}

// Main execution
async function main() {
  const course = "cmn_for_eng";
  const results = [];

  console.log("=== Phase 3 Basket Generation ===");
  console.log(`Course: ${course}`);
  console.log("Seeds: S0663, S0664, S0665\n");

  for (const [seedId, data] of Object.entries(seedData)) {
    console.log(`\n--- Generating baskets for ${seedId} ---`);
    console.log(`Seed: ${data.seed_pair.known} → ${data.seed_pair.target}`);
    console.log(`LEGOs: ${data.legos.length}`);

    const baskets = generateBasketsForSeed(seedId, data);

    // Show basket summary
    for (const [legoId, basket] of Object.entries(baskets)) {
      console.log(`  ${legoId}: "${basket.lego.known}" → "${basket.lego.target}"`);
      console.log(`    - Phrases: ${basket.phrase_count}`);
      console.log(`    - Final LEGO: ${basket.is_final_lego}`);
    }

    // Submit to API
    console.log(`\nSubmitting ${seedId} to API...`);
    const result = await submitBasket(course, seedId, baskets);
    results.push(result);

    if (result.success) {
      console.log(`✓ ${seedId} submitted successfully`);
    } else {
      console.log(`✗ ${seedId} failed: ${result.error}`);
    }
  }

  // Final summary
  console.log("\n=== SUMMARY ===");
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`\nSuccessfully submitted: ${successful.length}/3`);
  successful.forEach(r => console.log(`  ✓ ${r.seedId}`));

  if (failed.length > 0) {
    console.log(`\nFailed: ${failed.length}/3`);
    failed.forEach(r => console.log(`  ✗ ${r.seedId}: ${r.error}`));
  }

  console.log("\n=== COMPLETE ===");
}

// Run the script
main().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});
