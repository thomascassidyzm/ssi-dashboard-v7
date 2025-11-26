/**
 * Phase 3 Basket Generation for cmn_for_eng
 * Seeds: S0641, S0646, S0648
 */

import axios from 'axios';

const COURSE = 'cmn_for_eng';
const API_URL = 'http://localhost:3459/upload-basket';

// LEGO data extracted from lego_pairs.json
const LEGO_DATA = {
  S0641: {
    seed_pair: {
      known: "I think that it's the red one on that chair.",
      target: "我认为是那把椅子上的红色的那个。"
    },
    legos: [
      {
        id: "S0641L01",
        lego: { known: "I think that it's", target: "我认为是" },
        is_last: false
      },
      {
        id: "S0641L02",
        lego: { known: "on that chair", target: "那把椅子上的" },
        is_last: false
      },
      {
        id: "S0641L03",
        lego: { known: "the red one", target: "红色的那个" },
        is_last: false
      },
      {
        id: "S0641L04",
        lego: { known: "that chair", target: "那把椅子" },
        is_last: true
      }
    ]
  },
  S0646: {
    seed_pair: {
      known: "You're doing something sir.",
      target: "您在做什么事先生。"
    },
    legos: [
      {
        id: "S0646L01",
        lego: { known: "You're doing something", target: "您在做什么事" },
        is_last: false
      },
      {
        id: "S0646L02",
        lego: { known: "doing something", target: "在做什么事" },
        is_last: false
      },
      {
        id: "S0646L03",
        lego: { known: "do something", target: "做什么事" },
        is_last: false
      },
      {
        id: "S0646L04",
        lego: { known: "something/what thing", target: "什么事" },
        is_last: true
      }
    ]
  },
  S0648: {
    seed_pair: {
      known: "what you said madam",
      target: "您说的话女士"
    },
    legos: [
      {
        id: "S0648L01",
        lego: { known: "what you said", target: "您说的话" },
        is_last: false
      },
      {
        id: "S0648L02",
        lego: { known: "what (someone) said", target: "说的话" },
        is_last: true
      }
    ]
  }
};

// Practice phrase templates using Chinese components
const PHRASE_TEMPLATES = {
  S0641: {
    S0641L01: [
      { known: "I think that it's good", target: "我认为是好的" },
      { known: "I think that it's here", target: "我认为是这里" },
      { known: "I think that it's yours", target: "我认为是你的" },
      { known: "I think that it's expensive", target: "我认为是贵的" },
      { known: "I think that it's new", target: "我认为是新的" },
      { known: "I think that it's big", target: "我认为是大的" },
      { known: "I think that it's correct", target: "我认为是对的" },
      { known: "I think that it's mine", target: "我认为是我的" },
      { known: "I think that it's important", target: "我认为是重要的" },
      { known: "I think that it's beautiful", target: "我认为是美丽的" }
    ],
    S0641L02: [
      { known: "the book on that chair", target: "那把椅子上的书" },
      { known: "the bag on that chair", target: "那把椅子上的包" },
      { known: "the phone on that chair", target: "那把椅子上的手机" },
      { known: "the pen on that chair", target: "那把椅子上的笔" },
      { known: "the paper on that chair", target: "那把椅子上的纸" },
      { known: "the cup on that chair", target: "那把椅子上的杯子" },
      { known: "the key on that chair", target: "那把椅子上的钥匙" },
      { known: "the jacket on that chair", target: "那把椅子上的外套" },
      { known: "the hat on that chair", target: "那把椅子上的帽子" },
      { known: "the wallet on that chair", target: "那把椅子上的钱包" }
    ],
    S0641L03: [
      { known: "the red one is mine", target: "红色的那个是我的" },
      { known: "the red one is expensive", target: "红色的那个很贵" },
      { known: "the red one is big", target: "红色的那个很大" },
      { known: "the red one is new", target: "红色的那个是新的" },
      { known: "the red one is beautiful", target: "红色的那个很漂亮" },
      { known: "the red one is good", target: "红色的那个很好" },
      { known: "I want the red one", target: "我要红色的那个" },
      { known: "I like the red one", target: "我喜欢红色的那个" },
      { known: "give me the red one", target: "给我红色的那个" },
      { known: "the red one is here", target: "红色的那个在这里" }
    ],
    S0641L04: [
      { known: "that chair is comfortable", target: "那把椅子很舒服" },
      { known: "that chair is new", target: "那把椅子是新的" },
      { known: "that chair is expensive", target: "那把椅子很贵" },
      { known: "that chair is mine", target: "那把椅子是我的" },
      { known: "I want that chair", target: "我要那把椅子" },
      { known: "I like that chair", target: "我喜欢那把椅子" },
      { known: "sit on that chair", target: "坐在那把椅子上" },
      { known: "that chair is big", target: "那把椅子很大" },
      { known: "that chair is good", target: "那把椅子很好" },
      { known: "that chair is broken", target: "那把椅子坏了" }
    ]
  },
  S0646: {
    S0646L01: [
      { known: "You're doing something important", target: "您在做什么重要的事" },
      { known: "You're doing something good", target: "您在做什么好事" },
      { known: "You're doing something difficult", target: "您在做什么难事" },
      { known: "You're doing something interesting", target: "您在做什么有趣的事" },
      { known: "You're doing something today", target: "您今天在做什么事" },
      { known: "You're doing something now", target: "您现在在做什么事" },
      { known: "You're doing something here", target: "您在这里做什么事" },
      { known: "You're doing something there", target: "您在那里做什么事" },
      { known: "You're doing something at home", target: "您在家里做什么事" },
      { known: "You're doing something tomorrow", target: "您明天在做什么事" }
    ],
    S0646L02: [
      { known: "I'm doing something", target: "我在做什么事" },
      { known: "He's doing something", target: "他在做什么事" },
      { known: "She's doing something", target: "她在做什么事" },
      { known: "We're doing something", target: "我们在做什么事" },
      { known: "They're doing something", target: "他们在做什么事" },
      { known: "doing something important", target: "在做什么重要的事" },
      { known: "doing something good", target: "在做什么好事" },
      { known: "doing something new", target: "在做什么新事" },
      { known: "not doing something", target: "不在做什么事" },
      { known: "always doing something", target: "总是在做什么事" }
    ],
    S0646L03: [
      { known: "do something good", target: "做什么好事" },
      { known: "do something important", target: "做什么重要的事" },
      { known: "do something interesting", target: "做什么有趣的事" },
      { known: "want to do something", target: "想做什么事" },
      { known: "need to do something", target: "需要做什么事" },
      { known: "can do something", target: "能做什么事" },
      { known: "should do something", target: "应该做什么事" },
      { known: "don't do something", target: "不做什么事" },
      { known: "do something tomorrow", target: "明天做什么事" },
      { known: "do something today", target: "今天做什么事" }
    ],
    S0646L04: [
      { known: "something important", target: "什么重要的事" },
      { known: "something good", target: "什么好事" },
      { known: "something bad", target: "什么坏事" },
      { known: "something new", target: "什么新事" },
      { known: "something interesting", target: "什么有趣的事" },
      { known: "something difficult", target: "什么难事" },
      { known: "I have something", target: "我有什么事" },
      { known: "no something", target: "没什么事" },
      { known: "any something", target: "任何什么事" },
      { known: "this something", target: "这什么事" }
    ]
  },
  S0648: {
    S0648L01: [
      { known: "what you said is correct", target: "您说的话是对的" },
      { known: "what you said is important", target: "您说的话很重要" },
      { known: "what you said is good", target: "您说的话很好" },
      { known: "what you said is true", target: "您说的话是真的" },
      { known: "I understand what you said", target: "我明白您说的话" },
      { known: "I heard what you said", target: "我听到您说的话" },
      { known: "I remember what you said", target: "我记得您说的话" },
      { known: "I agree with what you said", target: "我同意您说的话" },
      { known: "what you said is interesting", target: "您说的话很有趣" },
      { known: "what you said makes sense", target: "您说的话有道理" }
    ],
    S0648L02: [
      { known: "what he said", target: "他说的话" },
      { known: "what she said", target: "她说的话" },
      { known: "what they said", target: "他们说的话" },
      { known: "what I said", target: "我说的话" },
      { known: "what we said", target: "我们说的话" },
      { known: "what teacher said", target: "老师说的话" },
      { known: "what mother said", target: "妈妈说的话" },
      { known: "what father said", target: "爸爸说的话" },
      { known: "what friend said", target: "朋友说的话" },
      { known: "what boss said", target: "老板说的话" }
    ]
  }
};

function generateBasket(seedId, legoId, legoData, isLast) {
  const phrases = PHRASE_TEMPLATES[seedId][legoId];

  return {
    lego_id: legoId,
    lego: legoData.lego,
    is_final_lego: isLast,
    practice_phrases: phrases,
    phrase_count: phrases.length
  };
}

function generateBasketsForSeed(seedId) {
  const seedData = LEGO_DATA[seedId];
  const baskets = {};

  seedData.legos.forEach((legoData) => {
    baskets[legoData.id] = generateBasket(
      seedId,
      legoData.id,
      legoData,
      legoData.is_last
    );
  });

  return baskets;
}

async function submitBasket(seedId, baskets) {
  try {
    const payload = {
      course: COURSE,
      seed: seedId,
      baskets: baskets
    };

    console.log(`\nSubmitting ${seedId}...`);
    console.log(`Payload contains ${Object.keys(baskets).length} baskets`);

    const response = await axios.post(API_URL, payload);

    if (response.status === 200) {
      console.log(`✓ ${seedId} submitted successfully`);
      return { success: true, seed: seedId };
    } else {
      console.log(`✗ ${seedId} failed with status ${response.status}`);
      return { success: false, seed: seedId, error: `Status ${response.status}` };
    }
  } catch (error) {
    console.log(`✗ ${seedId} failed: ${error.message}`);
    return { success: false, seed: seedId, error: error.message };
  }
}

async function main() {
  console.log('=== Phase 3 Basket Generation ===');
  console.log(`Course: ${COURSE}`);
  console.log(`Seeds: S0641, S0646, S0648`);
  console.log(`API: ${API_URL}`);

  const results = [];

  // Process each seed
  for (const seedId of ['S0641', 'S0646', 'S0648']) {
    console.log(`\n--- Processing ${seedId} ---`);
    const baskets = generateBasketsForSeed(seedId);

    // Show summary
    console.log(`Generated ${Object.keys(baskets).length} baskets:`);
    Object.keys(baskets).forEach(legoId => {
      const basket = baskets[legoId];
      console.log(`  ${legoId}: ${basket.phrase_count} phrases, final=${basket.is_final_lego}`);
      console.log(`    LEGO: "${basket.lego.known}" → "${basket.lego.target}"`);
    });

    // Submit to API
    const result = await submitBasket(seedId, baskets);
    results.push(result);
  }

  // Final summary
  console.log('\n=== Summary ===');
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`\n✓ Successfully submitted: ${successful.length}/3`);
  successful.forEach(r => console.log(`  - ${r.seed}`));

  if (failed.length > 0) {
    console.log(`\n✗ Failed: ${failed.length}/3`);
    failed.forEach(r => console.log(`  - ${r.seed}: ${r.error}`));
  }

  process.exit(failed.length > 0 ? 1 : 0);
}

// Run
main();
