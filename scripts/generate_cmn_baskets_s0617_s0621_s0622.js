#!/usr/bin/env node

/**
 * Phase 3 Basket Generation for cmn_for_eng
 * Seeds: S0617, S0621, S0622
 * APML v9.0 Pipeline
 */

import axios from 'axios';

// LEGO data extracted from lego_pairs.json
const seedData = {
  S0617: {
    seed_pair: { known: "You thought that it was a mistake.", target: "你认为那是个错误。" },
    legos: [
      {
        id: "S0617L01",
        type: "M",
        new: true,
        lego: { known: "you thought", target: "你认为" },
        components: [
          { known: "you", target: "你" },
          { known: "thought", target: "认为" }
        ]
      },
      {
        id: "S0617L02",
        type: "M",
        new: true,
        lego: { known: "that was a mistake", target: "那是个错误" },
        components: [
          { known: "that", target: "那" },
          { known: "was", target: "是" },
          { known: "(classifier)", target: "个" },
          { known: "mistake", target: "错误" }
        ]
      },
      {
        id: "S0617L03",
        type: "M",
        new: true,
        lego: { known: "was a mistake", target: "是个错误" },
        components: [
          { known: "was", target: "是" },
          { known: "(classifier)", target: "个" },
          { known: "mistake", target: "错误" }
        ]
      }
    ]
  },
  S0621: {
    seed_pair: { known: "I wouldn't have dared to tell her that it was broken.", target: "我不敢告诉她它坏了。" },
    legos: [
      {
        id: "S0621L01",
        type: "M",
        new: true,
        lego: { known: "I wouldn't have dared", target: "我不敢" },
        components: [
          { known: "I", target: "我" },
          { known: "not/wouldn't", target: "不" },
          { known: "dare", target: "敢" }
        ]
      },
      {
        id: "S0621L02",
        type: "M",
        new: true,
        lego: { known: "I wouldn't have dared to tell her", target: "我不敢告诉她" },
        components: [
          { known: "I", target: "我" },
          { known: "not", target: "不" },
          { known: "dare", target: "敢" },
          { known: "tell", target: "告诉" },
          { known: "her", target: "她" }
        ]
      },
      {
        id: "S0621L03",
        type: "M",
        new: true,
        lego: { known: "tell her", target: "告诉她" },
        components: [
          { known: "tell", target: "告诉" },
          { known: "her", target: "她" }
        ]
      },
      {
        id: "S0621L04",
        type: "M",
        new: true,
        lego: { known: "tell her it was broken", target: "告诉她它坏了" },
        components: [
          { known: "tell", target: "告诉" },
          { known: "her", target: "她" },
          { known: "it", target: "它" },
          { known: "was broken", target: "坏了" }
        ]
      },
      {
        id: "S0621L05",
        type: "M",
        new: true,
        lego: { known: "it was broken", target: "它坏了" },
        components: [
          { known: "it", target: "它" },
          { known: "was broken", target: "坏了" }
        ]
      },
      {
        id: "S0621L06",
        type: "M",
        new: true,
        lego: { known: "was broken", target: "坏了" },
        components: [
          { known: "broken/bad", target: "坏" },
          { known: "aspect marker", target: "了" }
        ]
      }
    ]
  },
  S0622: {
    seed_pair: { known: "I knew that the children had broken it.", target: "我知道孩子们弄坏了它。" },
    legos: [
      {
        id: "S0622L01",
        type: "M",
        new: true,
        lego: { known: "I knew", target: "我知道" },
        components: [
          { known: "I", target: "我" },
          { known: "knew/know", target: "知道" }
        ]
      },
      {
        id: "S0622L02",
        type: "M",
        new: false,
        lego: { known: "the children", target: "孩子们" },
        components: [
          { known: "child/children", target: "孩子" },
          { known: "plural marker", target: "们" }
        ]
      },
      {
        id: "S0622L03",
        type: "M",
        new: true,
        lego: { known: "the children had broken it", target: "孩子们弄坏了它" },
        components: [
          { known: "the children", target: "孩子们" },
          { known: "had broken", target: "弄坏了" },
          { known: "it", target: "它" }
        ]
      },
      {
        id: "S0622L04",
        type: "M",
        new: true,
        lego: { known: "had broken", target: "弄坏了" },
        components: [
          { known: "make/do", target: "弄" },
          { known: "broken/bad", target: "坏" },
          { known: "aspect marker", target: "了" }
        ]
      },
      {
        id: "S0622L05",
        type: "M",
        new: true,
        lego: { known: "had broken it", target: "弄坏了它" },
        components: [
          { known: "had broken", target: "弄坏了" },
          { known: "it", target: "它" }
        ]
      }
    ]
  }
};

// Practice phrase templates for Chinese baskets
const practicePhrases = {
  'you thought': [
    { known: "You thought it was easy.", target: "你认为那很容易。" },
    { known: "You thought about her.", target: "你想念她。" },
    { known: "You thought it was good.", target: "你认为那很好。" },
    { known: "You thought that was right.", target: "你认为那是对的。" },
    { known: "You thought I was wrong.", target: "你认为我错了。" },
    { known: "You thought they were coming.", target: "你认为他们会来。" },
    { known: "You thought this was important.", target: "你认为这很重要。" },
    { known: "You thought we could do it.", target: "你认为我们能做到。" },
    { known: "You thought that was strange.", target: "你认为那很奇怪。" },
    { known: "You thought it was possible.", target: "你认为那是可能的。" }
  ],
  'that was a mistake': [
    { known: "That was a mistake.", target: "那是个错误。" },
    { known: "That was a big mistake.", target: "那是个大错误。" },
    { known: "That was a good idea.", target: "那是个好主意。" },
    { known: "That was a problem.", target: "那是个问题。" },
    { known: "That was a difficult choice.", target: "那是个困难的选择。" },
    { known: "That was a bad decision.", target: "那是个坏决定。" },
    { known: "That was a surprise.", target: "那是个惊喜。" },
    { known: "That was a challenge.", target: "那是个挑战。" },
    { known: "That was a opportunity.", target: "那是个机会。" },
    { known: "That was a mistake we made.", target: "那是我们犯的错误。" }
  ],
  'was a mistake': [
    { known: "It was a mistake.", target: "那是个错误。" },
    { known: "This was a mistake.", target: "这是个错误。" },
    { known: "It was a good choice.", target: "那是个好选择。" },
    { known: "It was a bad idea.", target: "那是个坏主意。" },
    { known: "It was a serious problem.", target: "那是个严重的问题。" },
    { known: "It was a simple matter.", target: "那是个简单的事情。" },
    { known: "It was a difficult task.", target: "那是个困难的任务。" },
    { known: "It was a small mistake.", target: "那是个小错误。" },
    { known: "It was a happy moment.", target: "那是个快乐的时刻。" },
    { known: "It was a clear answer.", target: "那是个明确的答案。" }
  ],
  'I wouldn\'t have dared': [
    { known: "I wouldn't have dared.", target: "我不敢。" },
    { known: "I wouldn't have dared to go.", target: "我不敢去。" },
    { known: "I wouldn't have dared to ask.", target: "我不敢问。" },
    { known: "I wouldn't have dared to say.", target: "我不敢说。" },
    { known: "I wouldn't have dared to try.", target: "我不敢尝试。" },
    { known: "I wouldn't have dared to leave.", target: "我不敢离开。" },
    { known: "I wouldn't have dared to refuse.", target: "我不敢拒绝。" },
    { known: "I wouldn't have dared to believe.", target: "我不敢相信。" },
    { known: "I wouldn't have dared to touch it.", target: "我不敢碰它。" },
    { known: "I wouldn't have dared to challenge him.", target: "我不敢挑战他。" }
  ],
  'I wouldn\'t have dared to tell her': [
    { known: "I wouldn't have dared to tell her.", target: "我不敢告诉她。" },
    { known: "I wouldn't have dared to tell her the truth.", target: "我不敢告诉她真相。" },
    { known: "I wouldn't have dared to tell her that.", target: "我不敢告诉她那个。" },
    { known: "I wouldn't have dared to tell her everything.", target: "我不敢告诉她一切。" },
    { known: "I wouldn't have dared to tell her about it.", target: "我不敢告诉她关于那件事。" },
    { known: "I wouldn't have dared to tell her my secret.", target: "我不敢告诉她我的秘密。" },
    { known: "I wouldn't have dared to tell her what happened.", target: "我不敢告诉她发生了什么。" },
    { known: "I wouldn't have dared to tell her the news.", target: "我不敢告诉她这个消息。" },
    { known: "I wouldn't have dared to tell her my feelings.", target: "我不敢告诉她我的感受。" },
    { known: "I wouldn't have dared to tell her I was wrong.", target: "我不敢告诉她我错了。" }
  ],
  'tell her': [
    { known: "Tell her.", target: "告诉她。" },
    { known: "Tell her the truth.", target: "告诉她真相。" },
    { known: "Tell her I'm here.", target: "告诉她我在这里。" },
    { known: "Tell her I'm sorry.", target: "告诉她我很抱歉。" },
    { known: "Tell her it's ready.", target: "告诉她准备好了。" },
    { known: "Tell her to wait.", target: "告诉她等待。" },
    { known: "Tell her about it.", target: "告诉她关于那件事。" },
    { known: "Tell her what you know.", target: "告诉她你知道的。" },
    { known: "Tell her we're coming.", target: "告诉她我们要来了。" },
    { known: "Tell her I understand.", target: "告诉她我理解。" }
  ],
  'tell her it was broken': [
    { known: "Tell her it was broken.", target: "告诉她它坏了。" },
    { known: "Tell her it was broken yesterday.", target: "告诉她它昨天坏了。" },
    { known: "Tell her it was broken before.", target: "告诉她它以前就坏了。" },
    { known: "Tell her it was broken already.", target: "告诉她它已经坏了。" },
    { known: "Don't tell her it was broken.", target: "别告诉她它坏了。" },
    { known: "I should tell her it was broken.", target: "我应该告诉她它坏了。" },
    { known: "Can you tell her it was broken?", target: "你能告诉她它坏了吗？" },
    { known: "Please tell her it was broken.", target: "请告诉她它坏了。" },
    { known: "I need to tell her it was broken.", target: "我需要告诉她它坏了。" },
    { known: "He will tell her it was broken.", target: "他会告诉她它坏了。" }
  ],
  'it was broken': [
    { known: "It was broken.", target: "它坏了。" },
    { known: "It was broken yesterday.", target: "它昨天坏了。" },
    { known: "It was broken before.", target: "它以前坏了。" },
    { known: "It was broken by them.", target: "它被他们弄坏了。" },
    { known: "I knew it was broken.", target: "我知道它坏了。" },
    { known: "She said it was broken.", target: "她说它坏了。" },
    { known: "When it was broken, I cried.", target: "当它坏了的时候，我哭了。" },
    { known: "It was broken already.", target: "它已经坏了。" },
    { known: "It was broken long ago.", target: "它很久以前就坏了。" },
    { known: "It was broken and fixed.", target: "它坏了又修好了。" }
  ],
  'was broken': [
    { known: "It was broken.", target: "坏了。" },
    { known: "The phone was broken.", target: "手机坏了。" },
    { known: "Everything was broken.", target: "一切都坏了。" },
    { known: "Nothing was broken.", target: "什么都没坏。" },
    { known: "The window was broken.", target: "窗户坏了。" },
    { known: "The door was broken.", target: "门坏了。" },
    { known: "The car was broken.", target: "车坏了。" },
    { known: "The toy was broken.", target: "玩具坏了。" },
    { known: "The chair was broken.", target: "椅子坏了。" },
    { known: "The computer was broken.", target: "电脑坏了。" }
  ],
  'I knew': [
    { known: "I knew.", target: "我知道。" },
    { known: "I knew that.", target: "我知道那个。" },
    { known: "I knew it.", target: "我知道。" },
    { known: "I knew you were here.", target: "我知道你在这里。" },
    { known: "I knew she would come.", target: "我知道她会来。" },
    { known: "I knew it was true.", target: "我知道那是真的。" },
    { known: "I knew this would happen.", target: "我知道这会发生。" },
    { known: "I knew you could do it.", target: "我知道你能做到。" },
    { known: "I knew the answer.", target: "我知道答案。" },
    { known: "I knew from the start.", target: "我从一开始就知道。" }
  ],
  'the children': [
    { known: "The children are here.", target: "孩子们在这里。" },
    { known: "The children are playing.", target: "孩子们在玩。" },
    { known: "The children are happy.", target: "孩子们很高兴。" },
    { known: "The children are sleeping.", target: "孩子们在睡觉。" },
    { known: "The children are eating.", target: "孩子们在吃饭。" },
    { known: "The children are studying.", target: "孩子们在学习。" },
    { known: "The children went home.", target: "孩子们回家了。" },
    { known: "The children love this.", target: "孩子们喜欢这个。" },
    { known: "The children know everything.", target: "孩子们知道一切。" },
    { known: "The children are coming.", target: "孩子们要来了。" }
  ],
  'the children had broken it': [
    { known: "The children had broken it.", target: "孩子们弄坏了它。" },
    { known: "The children had broken it yesterday.", target: "孩子们昨天弄坏了它。" },
    { known: "The children had broken it already.", target: "孩子们已经弄坏了它。" },
    { known: "The children had broken it accidentally.", target: "孩子们不小心弄坏了它。" },
    { known: "I knew the children had broken it.", target: "我知道孩子们弄坏了它。" },
    { known: "She said the children had broken it.", target: "她说孩子们弄坏了它。" },
    { known: "The children had broken it before.", target: "孩子们以前弄坏了它。" },
    { known: "The children had broken it completely.", target: "孩子们完全弄坏了它。" },
    { known: "The children had broken it last week.", target: "孩子们上周弄坏了它。" },
    { known: "When the children had broken it, I was angry.", target: "当孩子们弄坏了它时，我很生气。" }
  ],
  'had broken': [
    { known: "They had broken it.", target: "他们弄坏了它。" },
    { known: "Someone had broken it.", target: "有人弄坏了它。" },
    { known: "Who had broken it?", target: "谁弄坏了它？" },
    { known: "He had broken the window.", target: "他弄坏了窗户。" },
    { known: "We had broken the rule.", target: "我们打破了规则。" },
    { known: "I had broken my promise.", target: "我违背了诺言。" },
    { known: "She had broken the glass.", target: "她打破了玻璃。" },
    { known: "They had broken the door.", target: "他们弄坏了门。" },
    { known: "Nobody had broken anything.", target: "没人弄坏任何东西。" },
    { known: "You had broken my heart.", target: "你伤了我的心。" }
  ],
  'had broken it': [
    { known: "They had broken it.", target: "他们弄坏了它。" },
    { known: "Someone had broken it.", target: "有人弄坏了它。" },
    { known: "Who had broken it?", target: "谁弄坏了它？" },
    { known: "Nobody had broken it.", target: "没人弄坏它。" },
    { known: "I had broken it.", target: "我弄坏了它。" },
    { known: "He had broken it first.", target: "他先弄坏了它。" },
    { known: "She had broken it too.", target: "她也弄坏了它。" },
    { known: "We had broken it together.", target: "我们一起弄坏了它。" },
    { known: "You had broken it before.", target: "你以前弄坏了它。" },
    { known: "They had broken it by accident.", target: "他们不小心弄坏了它。" }
  ]
};

function generateBasket(legoData, isLastLego) {
  const legoKey = legoData.lego.known;
  const phrases = practicePhrases[legoKey] || [];

  if (phrases.length === 0) {
    console.warn(`⚠️  No practice phrases found for LEGO: ${legoKey}`);
  }

  return {
    lego_id: legoData.id,
    lego: legoData.lego,
    is_final_lego: isLastLego,
    practice_phrases: phrases,
    phrase_count: phrases.length
  };
}

async function submitSeed(seedId, seedInfo) {
  const baskets = {};
  const legoCount = seedInfo.legos.length;

  seedInfo.legos.forEach((lego, index) => {
    const isLastLego = (index === legoCount - 1);
    baskets[lego.id] = generateBasket(lego, isLastLego);
  });

  const payload = {
    course: "cmn_for_eng",
    seed: seedId,
    baskets: baskets
  };

  try {
    console.log(`\n📦 Submitting ${seedId} with ${legoCount} baskets...`);
    const response = await axios.post('http://localhost:3459/upload-basket', payload);
    console.log(`✅ ${seedId} submitted successfully!`);
    console.log(`   Response: ${response.data.message || 'OK'}`);
    return { seedId, success: true, legoCount };
  } catch (error) {
    console.error(`❌ Failed to submit ${seedId}:`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Error: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.error(`   Error: ${error.message}`);
    }
    return { seedId, success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 Phase 3 Basket Generation - APML v9.0');
  console.log('Course: cmn_for_eng');
  console.log('Seeds: S0617, S0621, S0622\n');

  const results = [];

  // Process each seed
  for (const [seedId, seedInfo] of Object.entries(seedData)) {
    const result = await submitSeed(seedId, seedInfo);
    results.push(result);

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary report
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUBMISSION SUMMARY');
  console.log('='.repeat(60));

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`\n✅ Successfully submitted: ${successful.length}/${results.length} seeds`);
  successful.forEach(r => {
    console.log(`   - ${r.seedId}: ${r.legoCount} baskets`);
  });

  if (failed.length > 0) {
    console.log(`\n❌ Failed submissions: ${failed.length}`);
    failed.forEach(r => {
      console.log(`   - ${r.seedId}: ${r.error}`);
    });
  }

  console.log('\n✨ Basket generation complete!\n');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
