#!/usr/bin/env node

/**
 * Phase 3 Basket Generation for cmn_for_eng
 * Seeds: S0601, S0603, S0607
 *
 * Generates baskets with Chinese characters (汉字) for practice phrases
 */

import axios from 'axios';

// LEGO data extracted from lego_pairs.json
const SEED_DATA = {
  S0601: {
    legos: [
      {
        id: "S0601L01",
        lego: { known: "we were talking about", target: "我们在谈论" }
      },
      {
        id: "S0601L02",
        lego: { known: "how it all started", target: "这一切是如何开始的" }
      },
      {
        id: "S0601L03",
        lego: { known: "how it started", target: "是如何开始的" }
      }
    ]
  },
  S0603: {
    legos: [
      {
        id: "S0603L01",
        lego: { known: "we didn't have", target: "我们没有" }
      },
      {
        id: "S0603L02",
        lego: { known: "didn't have anywhere to live", target: "没有地方住" }
      },
      {
        id: "S0603L03",
        lego: { known: "anywhere to live", target: "地方住" }
      },
      {
        id: "S0603L04",
        lego: { known: "at the time", target: "那时" }
      }
    ]
  },
  S0607: {
    legos: [
      {
        id: "S0607L01",
        lego: { known: "I'd known", target: "我知道" }
      },
      {
        id: "S0607L02",
        lego: { known: "I'd have done", target: "我会做" }
      },
      {
        id: "S0607L03",
        lego: { known: "done things differently", target: "做不同的事" }
      },
      {
        id: "S0607L04",
        lego: { known: "different things", target: "不同的事" }
      }
    ]
  }
};

// Practice phrases for each LEGO with proper Chinese characters
const PRACTICE_PHRASES = {
  // S0601 phrases
  S0601L01: [
    { known: "We were talking about the weather.", target: "我们在谈论天气。" },
    { known: "We were talking about our plans.", target: "我们在谈论我们的计划。" },
    { known: "We were talking about the movie.", target: "我们在谈论那部电影。" },
    { known: "We were talking about food.", target: "我们在谈论食物。" },
    { known: "We were talking about work.", target: "我们在谈论工作。" },
    { known: "We were talking about the news.", target: "我们在谈论新闻。" },
    { known: "We were talking about our trip.", target: "我们在谈论我们的旅行。" },
    { known: "We were talking about the book.", target: "我们在谈论那本书。" },
    { known: "We were talking about sports.", target: "我们在谈论体育。" },
    { known: "We were talking about music.", target: "我们在谈论音乐。" }
  ],
  S0601L02: [
    { known: "I remember how it all started.", target: "我记得这一切是如何开始的。" },
    { known: "Do you know how it all started?", target: "你知道这一切是如何开始的吗？" },
    { known: "She explained how it all started.", target: "她解释了这一切是如何开始的。" },
    { known: "They told us how it all started.", target: "他们告诉我们这一切是如何开始的。" },
    { known: "Nobody knows how it all started.", target: "没人知道这一切是如何开始的。" },
    { known: "I wonder how it all started.", target: "我想知道这一切是如何开始的。" },
    { known: "He forgot how it all started.", target: "他忘了这一切是如何开始的。" },
    { known: "Can you tell me how it all started?", target: "你能告诉我这一切是如何开始的吗？" },
    { known: "We discovered how it all started.", target: "我们发现了这一切是如何开始的。" },
    { known: "I'll explain how it all started.", target: "我会解释这一切是如何开始的。" }
  ],
  S0601L03: [
    { known: "Do you remember how it started?", target: "你记得是如何开始的吗？" },
    { known: "I can explain how it started.", target: "我能解释是如何开始的。" },
    { known: "Tell me how it started.", target: "告诉我是如何开始的。" },
    { known: "She knows how it started.", target: "她知道是如何开始的。" },
    { known: "They forgot how it started.", target: "他们忘了是如何开始的。" },
    { known: "Nobody remembers how it started.", target: "没人记得是如何开始的。" },
    { known: "I wonder how it started.", target: "我想知道是如何开始的。" },
    { known: "He told us how it started.", target: "他告诉我们是如何开始的。" },
    { known: "Can you show me how it started?", target: "你能告诉我是如何开始的吗？" },
    { known: "We learned how it started.", target: "我们了解了是如何开始的。" }
  ],

  // S0603 phrases
  S0603L01: [
    { known: "We didn't have time.", target: "我们没有时间。" },
    { known: "We didn't have money.", target: "我们没有钱。" },
    { known: "We didn't have a choice.", target: "我们没有选择。" },
    { known: "We didn't have food.", target: "我们没有食物。" },
    { known: "We didn't have water.", target: "我们没有水。" },
    { known: "We didn't have a car.", target: "我们没有车。" },
    { known: "We didn't have help.", target: "我们没有帮助。" },
    { known: "We didn't have information.", target: "我们没有信息。" },
    { known: "We didn't have a plan.", target: "我们没有计划。" },
    { known: "We didn't have luck.", target: "我们没有运气。" }
  ],
  S0603L02: [
    { known: "They didn't have anywhere to live.", target: "他们没有地方住。" },
    { known: "She didn't have anywhere to live.", target: "她没有地方住。" },
    { known: "I didn't have anywhere to live.", target: "我没有地方住。" },
    { known: "He didn't have anywhere to live.", target: "他没有地方住。" },
    { known: "The family didn't have anywhere to live.", target: "这家人没有地方住。" },
    { known: "My friend didn't have anywhere to live.", target: "我的朋友没有地方住。" },
    { known: "The students didn't have anywhere to live.", target: "学生们没有地方住。" },
    { known: "The refugees didn't have anywhere to live.", target: "难民们没有地方住。" },
    { known: "Many people didn't have anywhere to live.", target: "很多人没有地方住。" },
    { known: "Some families didn't have anywhere to live.", target: "一些家庭没有地方住。" }
  ],
  S0603L03: [
    { known: "I need anywhere to live.", target: "我需要地方住。" },
    { known: "They're looking for anywhere to live.", target: "他们在找地方住。" },
    { known: "She wants anywhere to live.", target: "她想要地方住。" },
    { known: "We found anywhere to live.", target: "我们找到了地方住。" },
    { known: "He has anywhere to live now.", target: "他现在有地方住。" },
    { known: "Do you have anywhere to live?", target: "你有地方住吗？" },
    { known: "They need anywhere to live urgently.", target: "他们急需地方住。" },
    { known: "I can offer anywhere to live.", target: "我可以提供地方住。" },
    { known: "She's searching for anywhere to live.", target: "她在寻找地方住。" },
    { known: "Everyone needs anywhere to live.", target: "每个人都需要地方住。" }
  ],
  S0603L04: [
    { known: "I was busy at the time.", target: "我那时很忙。" },
    { known: "She was young at the time.", target: "她那时很年轻。" },
    { known: "We were happy at the time.", target: "我们那时很开心。" },
    { known: "He was sick at the time.", target: "他那时病了。" },
    { known: "They were away at the time.", target: "他们那时不在。" },
    { known: "I was working at the time.", target: "我那时在工作。" },
    { known: "She was studying at the time.", target: "她那时在学习。" },
    { known: "We were traveling at the time.", target: "我们那时在旅行。" },
    { known: "He was sleeping at the time.", target: "他那时在睡觉。" },
    { known: "They were eating at the time.", target: "他们那时在吃饭。" }
  ],

  // S0607 phrases
  S0607L01: [
    { known: "If I'd known the truth.", target: "如果我知道真相。" },
    { known: "If I'd known your name.", target: "如果我知道你的名字。" },
    { known: "If I'd known the answer.", target: "如果我知道答案。" },
    { known: "If I'd known the time.", target: "如果我知道时间。" },
    { known: "If I'd known the way.", target: "如果我知道路。" },
    { known: "If I'd known the price.", target: "如果我知道价格。" },
    { known: "If I'd known the reason.", target: "如果我知道原因。" },
    { known: "If I'd known the place.", target: "如果我知道地点。" },
    { known: "If I'd known the facts.", target: "如果我知道事实。" },
    { known: "If I'd known the situation.", target: "如果我知道情况。" }
  ],
  S0607L02: [
    { known: "I'd have done it better.", target: "我会做得更好。" },
    { known: "I'd have done it faster.", target: "我会做得更快。" },
    { known: "I'd have done it carefully.", target: "我会做得很仔细。" },
    { known: "I'd have done it yesterday.", target: "我会昨天做。" },
    { known: "I'd have done it properly.", target: "我会做得很好。" },
    { known: "I'd have done it immediately.", target: "我会立即做。" },
    { known: "I'd have done it gladly.", target: "我会很乐意做。" },
    { known: "I'd have done it myself.", target: "我会自己做。" },
    { known: "I'd have done it differently.", target: "我会做得不同。" },
    { known: "I'd have done it right.", target: "我会做对。" }
  ],
  S0607L03: [
    { known: "She would have done things differently.", target: "她会做不同的事。" },
    { known: "They might have done things differently.", target: "他们可能会做不同的事。" },
    { known: "He should have done things differently.", target: "他应该做不同的事。" },
    { known: "We could have done things differently.", target: "我们可以做不同的事。" },
    { known: "You would have done things differently.", target: "你会做不同的事。" },
    { known: "I must have done things differently.", target: "我必须做不同的事。" },
    { known: "People often do things differently.", target: "人们经常做不同的事。" },
    { known: "Everyone can do things differently.", target: "每个人都可以做不同的事。" },
    { known: "Let's try to do things differently.", target: "让我们试着做不同的事。" },
    { known: "She decided to do things differently.", target: "她决定做不同的事。" }
  ],
  S0607L04: [
    { known: "I like different things.", target: "我喜欢不同的事。" },
    { known: "We tried different things.", target: "我们尝试了不同的事。" },
    { known: "She wants different things.", target: "她想要不同的事。" },
    { known: "They prefer different things.", target: "他们更喜欢不同的事。" },
    { known: "He needs different things.", target: "他需要不同的事。" },
    { known: "People enjoy different things.", target: "人们喜欢不同的事。" },
    { known: "We learned different things.", target: "我们学到了不同的事。" },
    { known: "Everyone has different things.", target: "每个人都有不同的事。" },
    { known: "I discovered different things.", target: "我发现了不同的事。" },
    { known: "They discussed different things.", target: "他们讨论了不同的事。" }
  ]
};

/**
 * Generate baskets for a seed
 */
function generateBaskets(seedId) {
  const seedData = SEED_DATA[seedId];
  const baskets = {};

  seedData.legos.forEach((legoData, index) => {
    const isLastLego = index === seedData.legos.length - 1;
    const phrases = PRACTICE_PHRASES[legoData.id];

    baskets[legoData.id] = {
      lego: legoData.lego,
      is_final_lego: isLastLego,
      practice_phrases: phrases,
      phrase_count: phrases.length
    };
  });

  return baskets;
}

/**
 * Submit basket to API
 */
async function submitBasket(seedId, baskets) {
  const url = 'http://localhost:3459/upload-basket';
  const payload = {
    course: 'cmn_for_eng',
    seed: seedId,
    baskets: baskets
  };

  try {
    console.log(`\n📤 Submitting ${seedId}...`);
    console.log(`   LEGOs: ${Object.keys(baskets).length}`);
    console.log(`   Payload size: ${JSON.stringify(payload).length} bytes`);

    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log(`✅ ${seedId} submitted successfully`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${JSON.stringify(response.data)}`);
    return true;
  } catch (error) {
    console.error(`❌ ${seedId} submission failed`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Error: ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      console.error(`   No response received from server`);
      console.error(`   Make sure the server is running on port 3459`);
    } else {
      console.error(`   Error: ${error.message}`);
    }
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Phase 3 Basket Generation - cmn_for_eng');
  console.log('Seeds: S0601, S0603, S0607');
  console.log('='.repeat(60));

  const seeds = ['S0601', 'S0603', 'S0607'];
  const results = {
    successful: [],
    failed: []
  };

  for (const seedId of seeds) {
    console.log(`\n📦 Generating baskets for ${seedId}...`);
    const baskets = generateBaskets(seedId);

    // Show basket summary
    Object.keys(baskets).forEach(legoId => {
      const basket = baskets[legoId];
      console.log(`   ${legoId}: ${basket.phrase_count} phrases, is_final: ${basket.is_final_lego}`);
      console.log(`      LEGO: "${basket.lego.known}" → "${basket.lego.target}"`);
    });

    // Submit to API
    const success = await submitBasket(seedId, baskets);

    if (success) {
      results.successful.push(seedId);
    } else {
      results.failed.push(seedId);
    }

    // Brief pause between submissions
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Final report
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUBMISSION REPORT');
  console.log('='.repeat(60));
  console.log(`✅ Successful: ${results.successful.length} seeds`);
  results.successful.forEach(seed => console.log(`   - ${seed}`));

  if (results.failed.length > 0) {
    console.log(`\n❌ Failed: ${results.failed.length} seeds`);
    results.failed.forEach(seed => console.log(`   - ${seed}`));
  }

  console.log('\n✨ Process complete!');

  // Exit with appropriate code
  process.exit(results.failed.length > 0 ? 1 : 0);
}

// Run main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
