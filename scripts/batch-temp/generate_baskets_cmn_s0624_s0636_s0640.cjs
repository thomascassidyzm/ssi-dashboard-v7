/**
 * Phase 3 Basket Generation for cmn_for_eng
 * Seeds: S0624, S0636, S0640
 * APML v9.0 Pipeline
 */

const axios = require('axios');

// LEGO data extracted from lego_pairs.json
const SEED_DATA = {
  S0624: {
    legos: [
      {
        id: "S0624L01",
        lego: { known: "yes", target: "是的" },
        is_final: false
      },
      {
        id: "S0624L02",
        lego: { known: "that would be great", target: "那太好了" },
        is_final: false
      },
      {
        id: "S0624L03",
        lego: { known: "would be great", target: "太好了" },
        is_final: false
      },
      {
        id: "S0624L04",
        lego: { known: "thank you", target: "谢谢" },
        is_final: true
      }
    ]
  },
  S0636: {
    legos: [
      {
        id: "S0636L01",
        lego: { known: "think", target: "认为" },
        is_final: false
      },
      {
        id: "S0636L02",
        lego: { known: "I think", target: "我认为" },
        is_final: false
      },
      {
        id: "S0636L03",
        lego: { known: "think that is", target: "认为那是" },
        is_final: false
      },
      {
        id: "S0636L04",
        lego: { known: "I think that that is Jane's bag", target: "我认为那是简的包" },
        is_final: true
      }
    ]
  },
  S0640: {
    legos: [
      {
        id: "S0640L01",
        lego: { known: "red", target: "红色" },
        is_final: false
      },
      {
        id: "S0640L02",
        lego: { known: "red (adjective)", target: "红色的" },
        is_final: false
      },
      {
        id: "S0640L03",
        lego: { known: "that one", target: "那个" },
        is_final: false
      },
      {
        id: "S0640L04",
        lego: { known: "the one", target: "的那个" },
        is_final: false
      },
      {
        id: "S0640L05",
        lego: { known: "the red one", target: "红色的那个" },
        is_final: false
      },
      {
        id: "S0640L06",
        lego: { known: "it's the red one", target: "是红色的那个" },
        is_final: true
      }
    ]
  }
};

// Practice phrases for each LEGO
const PRACTICE_PHRASES = {
  // S0624 - Yes, that would be great, please.
  S0624L01: [
    { known: "Yes, I understand", target: "是的，我明白" },
    { known: "Yes, that's correct", target: "是的，那是对的" },
    { known: "Yes, I know", target: "是的，我知道" },
    { known: "Yes, I agree", target: "是的，我同意" },
    { known: "Yes, of course", target: "是的，当然" },
    { known: "Yes, thank you", target: "是的，谢谢" },
    { known: "Yes, please", target: "是的，请" },
    { known: "Yes, that's right", target: "是的，对" },
    { known: "Yes, I see", target: "是的，我看到了" },
    { known: "Yes, exactly", target: "是的，完全正确" }
  ],
  S0624L02: [
    { known: "That would be great, thank you", target: "那太好了，谢谢" },
    { known: "That would be great for me", target: "那对我来说太好了" },
    { known: "Yes, that would be great", target: "是的，那太好了" },
    { known: "That would be great, I appreciate it", target: "那太好了，我很感激" },
    { known: "That would be great, please", target: "那太好了，请" },
    { known: "I think that would be great", target: "我认为那太好了" },
    { known: "That would be great news", target: "那将是个好消息" },
    { known: "That would be great indeed", target: "那确实太好了" },
    { known: "That would be great for us", target: "那对我们来说太好了" },
    { known: "That would be great, thanks", target: "那太好了，谢谢" }
  ],
  S0624L03: [
    { known: "That would be great", target: "太好了" },
    { known: "This is great", target: "这太好了" },
    { known: "It would be great", target: "太好了" },
    { known: "That's great", target: "太好了" },
    { known: "How great", target: "太好了" },
    { known: "Really great", target: "真是太好了" },
    { known: "So great", target: "太好了" },
    { known: "Very great", target: "太好了" },
    { known: "Extremely great", target: "太好了" },
    { known: "Wonderful, great", target: "太好了" }
  ],
  S0624L04: [
    { known: "Thank you very much", target: "非常谢谢" },
    { known: "Thank you for helping", target: "谢谢你的帮助" },
    { known: "Thank you, goodbye", target: "谢谢，再见" },
    { known: "Thank you so much", target: "非常谢谢" },
    { known: "Thank you for coming", target: "谢谢你来" },
    { known: "Thank you for everything", target: "谢谢你所做的一切" },
    { known: "Thank you, that's great", target: "谢谢，太好了" },
    { known: "Thank you, I appreciate it", target: "谢谢，我很感激" },
    { known: "Thank you for your help", target: "谢谢你的帮助" },
    { known: "Thank you, friend", target: "谢谢，朋友" }
  ],

  // S0636 - I think that that is Jane's bag.
  S0636L01: [
    { known: "I think so", target: "我这样认为" },
    { known: "Do you think so?", target: "你这样认为吗？" },
    { known: "I don't think so", target: "我不这样认为" },
    { known: "What do you think?", target: "你怎么认为？" },
    { known: "I think it's good", target: "我认为很好" },
    { known: "Many people think", target: "很多人认为" },
    { known: "I think yes", target: "我认为是的" },
    { known: "I think no", target: "我认为不是" },
    { known: "Some think", target: "有些人认为" },
    { known: "We think", target: "我们认为" }
  ],
  S0636L02: [
    { known: "I think it's red", target: "我认为是红色的" },
    { known: "I think you're right", target: "我认为你是对的" },
    { known: "I think so too", target: "我也这样认为" },
    { known: "I think that's good", target: "我认为那很好" },
    { known: "I think it's correct", target: "我认为是正确的" },
    { known: "I think it's here", target: "我认为在这里" },
    { known: "I think it's possible", target: "我认为可能" },
    { known: "I think yes", target: "我认为是" },
    { known: "I think no", target: "我认为不是" },
    { known: "I think I understand", target: "我认为我明白了" }
  ],
  S0636L03: [
    { known: "I think that is good", target: "我认为那是好的" },
    { known: "I think that is correct", target: "我认为那是正确的" },
    { known: "I think that is wrong", target: "我认为那是错的" },
    { known: "Do you think that is right?", target: "你认为那是对的吗？" },
    { known: "I think that is possible", target: "我认为那是可能的" },
    { known: "I think that is the answer", target: "我认为那是答案" },
    { known: "I think that is better", target: "我认为那是更好的" },
    { known: "I think that is enough", target: "我认为那是足够的" },
    { known: "I think that is it", target: "我认为那就是" },
    { known: "I think that is true", target: "我认为那是真的" }
  ],
  S0636L04: [
    { known: "I think that's Jane's bag", target: "我认为那是简的包" },
    { known: "I think that's my bag", target: "我认为那是我的包" },
    { known: "I think that's his book", target: "我认为那是他的书" },
    { known: "I think that's her phone", target: "我认为那是她的手机" },
    { known: "I think that's the right one", target: "我认为那是正确的那个" },
    { known: "I think that's good news", target: "我认为那是好消息" },
    { known: "I think that's the answer", target: "我认为那是答案" },
    { known: "I think that's correct", target: "我认为那是正确的" },
    { known: "I think that's enough", target: "我认为那就够了" },
    { known: "I think that's everything", target: "我认为那就是全部" }
  ],

  // S0640 - It's the red one.
  S0640L01: [
    { known: "I like red", target: "我喜欢红色" },
    { known: "This is red", target: "这是红色" },
    { known: "The red color", target: "红色" },
    { known: "Red is beautiful", target: "红色很美" },
    { known: "Red apple", target: "红色苹果" },
    { known: "Red flower", target: "红色花" },
    { known: "Red car", target: "红色汽车" },
    { known: "Red dress", target: "红色连衣裙" },
    { known: "Red book", target: "红色书" },
    { known: "Bright red", target: "鲜红色" }
  ],
  S0640L02: [
    { known: "The red book", target: "红色的书" },
    { known: "The red car", target: "红色的汽车" },
    { known: "The red apple", target: "红色的苹果" },
    { known: "The red flower", target: "红色的花" },
    { known: "The red bag", target: "红色的包" },
    { known: "The red dress", target: "红色的连衣裙" },
    { known: "The red phone", target: "红色的手机" },
    { known: "The red chair", target: "红色的椅子" },
    { known: "The red pen", target: "红色的笔" },
    { known: "The red hat", target: "红色的帽子" }
  ],
  S0640L03: [
    { known: "I want that one", target: "我想要那个" },
    { known: "Give me that one", target: "给我那个" },
    { known: "That one is good", target: "那个很好" },
    { known: "That one is mine", target: "那个是我的" },
    { known: "That one is better", target: "那个更好" },
    { known: "That one is correct", target: "那个是正确的" },
    { known: "That one is beautiful", target: "那个很漂亮" },
    { known: "That one is expensive", target: "那个很贵" },
    { known: "That one is new", target: "那个是新的" },
    { known: "That one is big", target: "那个很大" }
  ],
  S0640L04: [
    { known: "I want the one over there", target: "我想要的那个" },
    { known: "The one I like", target: "我喜欢的那个" },
    { known: "The one on the table", target: "桌上的那个" },
    { known: "The one you showed me", target: "你给我看的那个" },
    { known: "The one I need", target: "我需要的那个" },
    { known: "The one we discussed", target: "我们讨论的那个" },
    { known: "The one that works", target: "有用的那个" },
    { known: "The one here", target: "这里的那个" },
    { known: "The one there", target: "那里的那个" },
    { known: "The one you mentioned", target: "你提到的那个" }
  ],
  S0640L05: [
    { known: "Give me the red one", target: "给我红色的那个" },
    { known: "I want the red one", target: "我想要红色的那个" },
    { known: "I like the red one", target: "我喜欢红色的那个" },
    { known: "The red one is beautiful", target: "红色的那个很漂亮" },
    { known: "The red one is mine", target: "红色的那个是我的" },
    { known: "The red one is better", target: "红色的那个更好" },
    { known: "The red one is new", target: "红色的那个是新的" },
    { known: "The red one is expensive", target: "红色的那个很贵" },
    { known: "Do you see the red one?", target: "你看到红色的那个了吗？" },
    { known: "Where is the red one?", target: "红色的那个在哪里？" }
  ],
  S0640L06: [
    { known: "It's the red one here", target: "是红色的那个在这里" },
    { known: "It's the red one you want", target: "是红色的那个你想要" },
    { known: "It's the red one I like", target: "是红色的那个我喜欢" },
    { known: "It's the red one on the table", target: "是桌上红色的那个" },
    { known: "Yes, it's the red one", target: "是的，是红色的那个" },
    { known: "It's the red one, right?", target: "是红色的那个，对吗？" },
    { known: "It's the red one we need", target: "是红色的那个我们需要" },
    { known: "It's the red one there", target: "是那里红色的那个" },
    { known: "It's the red one you showed me", target: "是你给我看的红色的那个" },
    { known: "It's the red one I mentioned", target: "是我提到的红色的那个" }
  ]
};

// Generate baskets for a seed
function generateBaskets(seedId) {
  const seedData = SEED_DATA[seedId];
  if (!seedData) {
    throw new Error(`No data found for seed ${seedId}`);
  }

  const baskets = {};

  seedData.legos.forEach((legoData, index) => {
    const practicePhrasesForLego = PRACTICE_PHRASES[legoData.id];

    if (!practicePhrasesForLego || practicePhrasesForLego.length !== 10) {
      throw new Error(`Missing or invalid practice phrases for ${legoData.id}`);
    }

    baskets[legoData.id] = {
      lego: legoData.lego,
      is_final_lego: legoData.is_final,
      practice_phrases: practicePhrasesForLego,
      phrase_count: practicePhrasesForLego.length
    };
  });

  return baskets;
}

// Submit baskets to API
async function submitBaskets(course, seed, baskets) {
  const url = 'http://localhost:3459/upload-basket';
  const payload = {
    course: course,
    seed: seed,
    baskets: baskets
  };

  try {
    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' }
    });
    return { success: true, seed, response: response.data };
  } catch (error) {
    return {
      success: false,
      seed,
      error: error.response ? error.response.data : error.message
    };
  }
}

// Main execution
async function main() {
  const course = 'cmn_for_eng';
  const seeds = ['S0624', 'S0636', 'S0640'];
  const results = [];

  console.log('Phase 3 Basket Generation - APML v9.0');
  console.log('=====================================\n');
  console.log(`Course: ${course}`);
  console.log(`Seeds: ${seeds.join(', ')}\n`);

  for (const seed of seeds) {
    console.log(`\nProcessing ${seed}...`);

    try {
      const baskets = generateBaskets(seed);
      const legoCount = Object.keys(baskets).length;
      console.log(`  Generated ${legoCount} baskets`);

      // Validate Chinese characters in target fields
      let hasChineseChars = true;
      for (const [legoId, basket] of Object.entries(baskets)) {
        // Check LEGO target
        if (!/[\u4e00-\u9fff]/.test(basket.lego.target)) {
          console.log(`  ❌ WARNING: ${legoId} lego.target missing Chinese characters`);
          hasChineseChars = false;
        }

        // Check practice phrases
        basket.practice_phrases.forEach((phrase, idx) => {
          if (!/[\u4e00-\u9fff]/.test(phrase.target)) {
            console.log(`  ❌ WARNING: ${legoId} phrase ${idx + 1} missing Chinese characters`);
            hasChineseChars = false;
          }
        });
      }

      if (hasChineseChars) {
        console.log(`  ✓ All targets contain Chinese characters (汉字)`);
      }

      // Submit to API
      console.log(`  Submitting to API...`);
      const result = await submitBaskets(course, seed, baskets);
      results.push(result);

      if (result.success) {
        console.log(`  ✓ ${seed} submitted successfully`);
      } else {
        console.log(`  ✗ ${seed} submission failed: ${JSON.stringify(result.error)}`);
      }

    } catch (error) {
      console.log(`  ✗ Error processing ${seed}: ${error.message}`);
      results.push({ success: false, seed, error: error.message });
    }
  }

  // Summary
  console.log('\n\n=====================================');
  console.log('SUMMARY');
  console.log('=====================================\n');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`Total seeds: ${seeds.length}`);
  console.log(`Successful: ${successful.length}`);
  console.log(`Failed: ${failed.length}\n`);

  if (successful.length > 0) {
    console.log('Successfully submitted seeds:');
    successful.forEach(r => console.log(`  ✓ ${r.seed}`));
  }

  if (failed.length > 0) {
    console.log('\nFailed seeds:');
    failed.forEach(r => console.log(`  ✗ ${r.seed}: ${JSON.stringify(r.error)}`));
  }

  return results;
}

// Run
main()
  .then(() => {
    console.log('\nBasket generation complete.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
