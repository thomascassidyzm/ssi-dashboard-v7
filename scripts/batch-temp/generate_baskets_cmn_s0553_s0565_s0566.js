#!/usr/bin/env node

/**
 * Phase 3 Basket Generation for cmn_for_eng
 * Seeds: S0553, S0565, S0566
 *
 * Generates baskets with Chinese practice phrases for each LEGO
 */

import axios from 'axios';

// LEGO data extracted from lego_pairs.json
const SEED_DATA = {
  S0553: {
    seed_pair: { known: "I think the small church is very ugly.", target: "我觉得小教堂非常丑。" },
    legos: [
      { id: "S0553L01", type: "A", new: false, lego: { known: "I think", target: "我觉得" } },
      { id: "S0553L02", type: "A", new: true, lego: { known: "the small church", target: "小教堂" } },
      { id: "S0553L03", type: "A", new: true, lego: { known: "very ugly", target: "非常丑" } },
      {
        id: "S0553L04",
        type: "M",
        new: true,
        lego: { known: "I think the small church is very ugly", target: "我觉得小教堂非常丑" }
      }
    ]
  },
  S0565: {
    seed_pair: { known: "I'd have thought about it more carefully.", target: "我会更仔细地思考它。" },
    legos: [
      { id: "S0565L01", type: "M", new: true, lego: { known: "I would", target: "我会" } },
      { id: "S0565L02", type: "M", new: true, lego: { known: "think about it more carefully", target: "更仔细地思考它" } },
      { id: "S0565L03", type: "M", new: true, lego: { known: "more carefully", target: "更仔细地" } },
      { id: "S0565L04", type: "M", new: true, lego: { known: "think about it", target: "思考它" } }
    ]
  },
  S0566: {
    seed_pair: { known: "I'd have thought more if it had been my choice.", target: "如果是我的选择，我会想得更多。" },
    legos: [
      { id: "S0566L01", type: "M", new: true, lego: { known: "if it had been my choice", target: "如果是我的选择" } },
      { id: "S0566L02", type: "M", new: true, lego: { known: "was my choice", target: "是我的选择" } },
      { id: "S0566L03", type: "M", new: true, lego: { known: "my choice", target: "我的选择" } },
      { id: "S0566L04", type: "A", new: true, lego: { known: "choice", target: "选择" } },
      { id: "S0566L05", type: "M", new: true, lego: { known: "I'd have thought more", target: "我会想得更多" } },
      { id: "S0566L06", type: "M", new: false, lego: { known: "I would", target: "我会" } },
      { id: "S0566L07", type: "M", new: true, lego: { known: "thought more", target: "想得更多" } }
    ]
  }
};

// Practice phrase generators for each LEGO
const PRACTICE_PHRASES = {
  // S0553 phrases
  "S0553L01": [
    { known: "I think you're right.", target: "我觉得你是对的。" },
    { known: "I think this is good.", target: "我觉得这个很好。" },
    { known: "I think we should go.", target: "我觉得我们应该去。" },
    { known: "I think it's beautiful.", target: "我觉得它很漂亮。" },
    { known: "I think she's smart.", target: "我觉得她很聪明。" },
    { known: "I think he's kind.", target: "我觉得他很善良。" },
    { known: "I think this is easy.", target: "我觉得这个很容易。" },
    { known: "I think they're happy.", target: "我觉得他们很开心。" },
    { known: "I think it's cold today.", target: "我觉得今天很冷。" },
    { known: "I think the food is delicious.", target: "我觉得食物很好吃。" }
  ],
  "S0553L02": [
    { known: "The small church is old.", target: "小教堂很旧。" },
    { known: "I see the small church.", target: "我看到小教堂。" },
    { known: "The small church is beautiful.", target: "小教堂很漂亮。" },
    { known: "We visit the small church.", target: "我们参观小教堂。" },
    { known: "The small church is near here.", target: "小教堂在这附近。" },
    { known: "The small church has a bell.", target: "小教堂有一个钟。" },
    { known: "The small church is quiet.", target: "小教堂很安静。" },
    { known: "The small church is on the hill.", target: "小教堂在山上。" },
    { known: "The small church is closed.", target: "小教堂关门了。" },
    { known: "The small church is charming.", target: "小教堂很有魅力。" }
  ],
  "S0553L03": [
    { known: "This building is very ugly.", target: "这座建筑非常丑。" },
    { known: "The color is very ugly.", target: "这个颜色非常丑。" },
    { known: "That design is very ugly.", target: "那个设计非常丑。" },
    { known: "The car is very ugly.", target: "这辆车非常丑。" },
    { known: "The painting is very ugly.", target: "这幅画非常丑。" },
    { known: "The furniture is very ugly.", target: "这个家具非常丑。" },
    { known: "The dress is very ugly.", target: "这件连衣裙非常丑。" },
    { known: "The wallpaper is very ugly.", target: "这个壁纸非常丑。" },
    { known: "The statue is very ugly.", target: "这座雕像非常丑。" },
    { known: "The jacket is very ugly.", target: "这件夹克非常丑。" }
  ],
  "S0553L04": [
    { known: "I think the small church is very ugly.", target: "我觉得小教堂非常丑。" },
    { known: "She thinks the small church is very ugly.", target: "她觉得小教堂非常丑。" },
    { known: "He thinks the small church is very ugly.", target: "他觉得小教堂非常丑。" },
    { known: "They think the small church is very ugly.", target: "他们觉得小教堂非常丑。" },
    { known: "We think the small church is very ugly.", target: "我们觉得小教堂非常丑。" },
    { known: "You think the small church is very ugly.", target: "你觉得小教堂非常丑。" },
    { known: "Everyone thinks the small church is very ugly.", target: "每个人都觉得小教堂非常丑。" },
    { known: "Many people think the small church is very ugly.", target: "许多人觉得小教堂非常丑。" },
    { known: "Do you think the small church is very ugly?", target: "你觉得小教堂非常丑吗？" },
    { known: "I don't think the small church is very ugly.", target: "我不觉得小教堂非常丑。" }
  ],

  // S0565 phrases
  "S0565L01": [
    { known: "I would go with you.", target: "我会和你一起去。" },
    { known: "I would help you.", target: "我会帮助你。" },
    { known: "I would like this.", target: "我会喜欢这个。" },
    { known: "I would do it.", target: "我会做这件事。" },
    { known: "I would try harder.", target: "我会更努力尝试。" },
    { known: "I would tell you.", target: "我会告诉你。" },
    { known: "I would wait for you.", target: "我会等你。" },
    { known: "I would come early.", target: "我会早点来。" },
    { known: "I would agree with that.", target: "我会同意那个。" },
    { known: "I would choose differently.", target: "我会选择不同的。" }
  ],
  "S0565L02": [
    { known: "I need to think about it more carefully.", target: "我需要更仔细地思考它。" },
    { known: "We should think about it more carefully.", target: "我们应该更仔细地思考它。" },
    { known: "You must think about it more carefully.", target: "你必须更仔细地思考它。" },
    { known: "He wants to think about it more carefully.", target: "他想要更仔细地思考它。" },
    { known: "She will think about it more carefully.", target: "她将要更仔细地思考它。" },
    { known: "They began to think about it more carefully.", target: "他们开始更仔细地思考它。" },
    { known: "Let's think about it more carefully.", target: "让我们更仔细地思考它。" },
    { known: "Please think about it more carefully.", target: "请更仔细地思考它。" },
    { known: "I'm trying to think about it more carefully.", target: "我正在尝试更仔细地思考它。" },
    { known: "Can you think about it more carefully?", target: "你能更仔细地思考它吗？" }
  ],
  "S0565L03": [
    { known: "Listen more carefully.", target: "更仔细地听。" },
    { known: "Read more carefully.", target: "更仔细地读。" },
    { known: "Look more carefully.", target: "更仔细地看。" },
    { known: "Check more carefully.", target: "更仔细地检查。" },
    { known: "Study more carefully.", target: "更仔细地学习。" },
    { known: "Plan more carefully.", target: "更仔细地计划。" },
    { known: "Drive more carefully.", target: "更仔细地开车。" },
    { known: "Work more carefully.", target: "更仔细地工作。" },
    { known: "Explain more carefully.", target: "更仔细地解释。" },
    { known: "Consider more carefully.", target: "更仔细地考虑。" }
  ],
  "S0565L04": [
    { known: "I need to think about it.", target: "我需要思考它。" },
    { known: "Let me think about it.", target: "让我思考它。" },
    { known: "We should think about it.", target: "我们应该思考它。" },
    { known: "He will think about it.", target: "他会思考它。" },
    { known: "She wants to think about it.", target: "她想要思考它。" },
    { known: "They're going to think about it.", target: "他们将要思考它。" },
    { known: "Can you think about it?", target: "你能思考它吗？" },
    { known: "Please think about it.", target: "请思考它。" },
    { known: "I'm trying to think about it.", target: "我正在尝试思考它。" },
    { known: "Don't think about it.", target: "不要思考它。" }
  ],

  // S0566 phrases
  "S0566L01": [
    { known: "If it had been my choice, I'd stay.", target: "如果是我的选择，我会留下。" },
    { known: "If it had been my choice, I'd go.", target: "如果是我的选择，我会去。" },
    { known: "If it had been my choice, I'd refuse.", target: "如果是我的选择，我会拒绝。" },
    { known: "If it had been my choice, I'd accept.", target: "如果是我的选择，我会接受。" },
    { known: "If it had been my choice, I'd wait.", target: "如果是我的选择，我会等待。" },
    { known: "If it had been my choice, I'd act now.", target: "如果是我的选择，我会现在行动。" },
    { known: "If it had been my choice, I'd disagree.", target: "如果是我的选择，我会不同意。" },
    { known: "If it had been my choice, I'd change it.", target: "如果是我的选择，我会改变它。" },
    { known: "If it had been my choice, I'd do differently.", target: "如果是我的选择，我会做得不同。" },
    { known: "If it had been my choice, I'd say yes.", target: "如果是我的选择，我会说是。" }
  ],
  "S0566L02": [
    { known: "This was my choice.", target: "这是我的选择。" },
    { known: "That was my choice.", target: "那是我的选择。" },
    { known: "It was my choice to leave.", target: "离开是我的选择。" },
    { known: "It was my choice to stay.", target: "留下是我的选择。" },
    { known: "It was my choice alone.", target: "这只是我的选择。" },
    { known: "It wasn't my choice.", target: "这不是我的选择。" },
    { known: "Was it my choice?", target: "这是我的选择吗？" },
    { known: "It was my choice to try.", target: "尝试是我的选择。" },
    { known: "It was my choice to wait.", target: "等待是我的选择。" },
    { known: "It was my choice to help.", target: "帮助是我的选择。" }
  ],
  "S0566L03": [
    { known: "This is my choice.", target: "这是我的选择。" },
    { known: "That's my choice.", target: "那是我的选择。" },
    { known: "My choice is final.", target: "我的选择是最终的。" },
    { known: "My choice was difficult.", target: "我的选择很困难。" },
    { known: "My choice surprised everyone.", target: "我的选择让每个人都惊讶。" },
    { known: "My choice matters.", target: "我的选择很重要。" },
    { known: "Respect my choice.", target: "尊重我的选择。" },
    { known: "My choice is clear.", target: "我的选择很明确。" },
    { known: "My choice was wrong.", target: "我的选择是错的。" },
    { known: "My choice was right.", target: "我的选择是对的。" }
  ],
  "S0566L04": [
    { known: "What's your choice?", target: "你的选择是什么？" },
    { known: "The choice is yours.", target: "选择是你的。" },
    { known: "I have no choice.", target: "我没有选择。" },
    { known: "Make a choice.", target: "做一个选择。" },
    { known: "Good choice!", target: "好选择！" },
    { known: "Bad choice.", target: "坏选择。" },
    { known: "The choice is clear.", target: "选择很明确。" },
    { known: "Every choice matters.", target: "每个选择都很重要。" },
    { known: "Your choice affects everyone.", target: "你的选择影响每个人。" },
    { known: "This choice is difficult.", target: "这个选择很困难。" }
  ],
  "S0566L05": [
    { known: "I'd have thought more about you.", target: "我会想得更多关于你。" },
    { known: "I'd have thought more carefully.", target: "我会想得更仔细。" },
    { known: "I'd have thought more deeply.", target: "我会想得更深入。" },
    { known: "She'd have thought more.", target: "她会想得更多。" },
    { known: "He'd have thought more.", target: "他会想得更多。" },
    { known: "They'd have thought more.", target: "他们会想得更多。" },
    { known: "We'd have thought more.", target: "我们会想得更多。" },
    { known: "You'd have thought more.", target: "你会想得更多。" },
    { known: "I'd have thought more before deciding.", target: "我会在决定前想得更多。" },
    { known: "I'd have thought more if I could.", target: "如果可以的话，我会想得更多。" }
  ],
  "S0566L06": [
    { known: "I would agree.", target: "我会同意。" },
    { known: "I would understand.", target: "我会理解。" },
    { known: "I would support you.", target: "我会支持你。" },
    { known: "I would believe you.", target: "我会相信你。" },
    { known: "I would remember.", target: "我会记住。" },
    { known: "I would never forget.", target: "我永远不会忘记。" },
    { known: "I would appreciate it.", target: "我会感激的。" },
    { known: "I would be happy.", target: "我会很高兴。" },
    { known: "I would be there.", target: "我会在那里。" },
    { known: "I would call you.", target: "我会打电话给你。" }
  ],
  "S0566L07": [
    { known: "I thought more about the problem.", target: "我想得更多关于这个问题。" },
    { known: "She thought more than before.", target: "她比以前想得更多。" },
    { known: "He thought more carefully.", target: "他想得更仔细。" },
    { known: "They thought more deeply.", target: "他们想得更深入。" },
    { known: "We thought more about it.", target: "我们想得更多关于它。" },
    { known: "You thought more than me.", target: "你比我想得更多。" },
    { known: "I should have thought more.", target: "我应该想得更多。" },
    { known: "He could have thought more.", target: "他本可以想得更多。" },
    { known: "Everyone thought more.", target: "每个人都想得更多。" },
    { known: "Nobody thought more than her.", target: "没有人比她想得更多。" }
  ]
};

// Generate basket for a single LEGO
function generateBasket(legoId, lego, isLastLego) {
  const phrases = PRACTICE_PHRASES[legoId] || [];

  return {
    lego: lego,
    is_final_lego: isLastLego,
    practice_phrases: phrases,
    phrase_count: phrases.length
  };
}

// Generate all baskets for a seed
function generateBasketsForSeed(seedId) {
  const seedData = SEED_DATA[seedId];
  const baskets = {};
  const totalLegos = seedData.legos.length;

  seedData.legos.forEach((legoData, index) => {
    const isLastLego = (index === totalLegos - 1);
    baskets[legoData.id] = generateBasket(legoData.id, legoData.lego, isLastLego);
  });

  return baskets;
}

// Submit basket to API
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
  const course = 'cmn_for_eng';
  const seeds = ['S0553', 'S0565', 'S0566'];
  const results = [];

  console.log('Phase 3 Basket Generation - cmn_for_eng');
  console.log('=========================================\n');

  for (const seedId of seeds) {
    console.log(`Processing ${seedId}...`);
    const baskets = generateBasketsForSeed(seedId);
    const legoCount = Object.keys(baskets).length;
    console.log(`  Generated ${legoCount} baskets`);

    console.log(`  Submitting to API...`);
    const result = await submitBasket(course, seedId, baskets);
    results.push(result);

    if (result.success) {
      console.log(`  ✓ ${seedId} submitted successfully\n`);
    } else {
      console.log(`  ✗ ${seedId} failed: ${result.error}\n`);
    }
  }

  // Summary
  console.log('\nSummary');
  console.log('=======');
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`Successfully submitted: ${successful.length}/${results.length}`);
  if (successful.length > 0) {
    console.log('  Success:', successful.map(r => r.seedId).join(', '));
  }
  if (failed.length > 0) {
    console.log('  Failed:', failed.map(r => r.seedId).join(', '));
    console.log('\nError details:');
    failed.forEach(r => {
      console.log(`  ${r.seedId}: ${JSON.stringify(r.error, null, 2)}`);
    });
  }
}

// Run
main().catch(console.error);
