#!/usr/bin/env node
/**
 * Generate Phase 5 practice baskets for Chinese (cmn_for_eng) - Batch 4
 * LEGOs: S0623L07, S0624L02, S0624L03, S0625L02, S0625L04, S0625L05,
 *        S0626L02, S0626L03, S0626L04, S0627L02
 */

const fs = require('fs');
const path = require('path');

const COURSE_DIR = '/home/user/ssi-dashboard-v7/public/vfs/courses/cmn_for_eng';
const SCAFFOLDS_DIR = path.join(COURSE_DIR, 'phase5_scaffolds');
const OUTPUTS_DIR = path.join(COURSE_DIR, 'phase5_outputs');

// Generate practice phrases for each LEGO
const baskets = {
  S0623: {
    legos: {
      S0623L07: {
        practice_phrases: [
          ["tea", "茶", null, 1],
          ["I want tea", "我想要茶", null, 2],
          ["a cup of tea", "一杯茶", null, 2],
          ["I like tea", "我喜欢茶", null, 3],
          ["tea or coffee", "茶还是咖啡", null, 2],
          ["I want to drink tea", "我想喝茶", null, 4],
          ["Do you want tea or coffee?", "你想要茶还是咖啡？", null, 4],
          ["I'd like a cup of tea, please", "我想要一杯茶，谢谢", null, 5],
          ["I prefer tea instead of coffee", "我喜欢茶而不是咖啡", null, 5],
          ["I knew you would want a cup of tea", "我知道你会想要一杯茶", null, 6]
        ]
      }
    }
  },
  S0624: {
    legos: {
      S0624L02: {
        practice_phrases: [
          ["that would be great", "那太好了", null, 1],
          ["Yes, that would be great", "是的，那太好了", null, 2],
          ["that would be great for me", "那对我太好了", null, 3],
          ["I think that would be great", "我认为那太好了", null, 4],
          ["that would be great, thank you", "那太好了，谢谢", null, 3],
          ["that would be great if you can", "如果你能的话那太好了", null, 5],
          ["I knew that would be great for us", "我知道那对我们太好了", null, 6],
          ["that would be great, I'd like coffee", "那太好了，我想要咖啡", null, 5],
          ["I think that would be great for everyone", "我认为那对每个人都太好了", null, 6],
          ["that would be great, I was very thirsty", "那太好了，我很渴", null, 6]
        ]
      },
      S0624L03: {
        practice_phrases: [
          ["would be great", "太好了", null, 1],
          ["that would be great", "那太好了", null, 2],
          ["it would be great", "那太好了", null, 2],
          ["this would be great", "这太好了", null, 2],
          ["would be great for me", "对我太好了", null, 3],
          ["it would be great if you came", "你来的话太好了", null, 5],
          ["coffee would be great, thank you", "咖啡太好了，谢谢", null, 4],
          ["I think tea would be great right now", "我认为现在茶太好了", null, 6],
          ["it would be great to see you again", "再见到你太好了", null, 6],
          ["a cup of tea would be great, please", "一杯茶太好了，谢谢", null, 5]
        ]
      }
    }
  },
  S0625: {
    legos: {
      S0625L02: {
        practice_phrases: [
          ["want to drink", "想喝", null, 1],
          ["I want to drink", "我想喝", null, 2],
          ["do you want to drink?", "你想喝吗？", null, 2],
          ["want to drink tea", "想喝茶", null, 2],
          ["I want to drink coffee", "我想喝咖啡", null, 3],
          ["do you want to drink something?", "你想喝点什么吗？", null, 4],
          ["I want to drink a cup of tea", "我想喝一杯茶", null, 4],
          ["I don't want to drink coffee now", "我现在不想喝咖啡", null, 5],
          ["do you want to drink tea or coffee?", "你想喝茶还是咖啡？", null, 5],
          ["I knew you would want to drink something", "我知道你会想喝点什么", null, 6]
        ]
      },
      S0625L04: {
        practice_phrases: [
          ["something to drink", "喝点什么", null, 1],
          ["want something to drink", "想喝点什么", null, 2],
          ["I want something to drink", "我想喝点什么", null, 3],
          ["do you want something to drink?", "你想喝点什么吗？", null, 3],
          ["something to drink now", "现在喝点什么", null, 2],
          ["I'd like something to drink, please", "我想喝点什么，谢谢", null, 4],
          ["do you have something to drink?", "你有喝的东西吗？", null, 4],
          ["I'm thirsty, I want something to drink", "我渴了，我想喝点什么", null, 5],
          ["would you like something to drink right now?", "你现在想喝点什么吗？", null, 5],
          ["I knew the children would want something to drink", "我知道孩子们会想喝点什么", null, 7]
        ]
      },
      S0625L05: {
        practice_phrases: [
          ["something", "点什么", null, 1],
          ["want something", "想点什么", null, 2],
          ["do you want something?", "你想要点什么吗？", null, 2],
          ["I want something", "我想要点什么", null, 3],
          ["something to drink", "喝点什么", null, 2],
          ["I'd like to tell you something", "我想告诉你点什么", null, 5],
          ["do you want to say something?", "你想说点什么吗？", null, 4],
          ["I think I broke something yesterday", "我认为我昨天弄坏了点什么", null, 6],
          ["I'm not sure if I want something now", "我不确定我现在想不想要点什么", null, 7],
          ["would you like something to drink or eat?", "你想喝点什么还是吃点什么？", null, 6]
        ]
      }
    }
  },
  S0626: {
    legos: {
      S0626L02: {
        practice_phrases: [
          ["I'm not thirsty", "我不渴", null, 1],
          ["I'm not thirsty now", "我现在不渴", null, 2],
          ["I'm not thirsty today", "我今天不渴", null, 2],
          ["I'm not thirsty, thank you", "我不渴，谢谢", null, 2],
          ["I'm not thirsty right now", "我现在不渴", null, 3],
          ["I'm not thirsty but I'm hungry", "我不渴但我饿了", null, 4],
          ["I'm not thirsty so I don't want tea", "我不渴所以我不想要茶", null, 6],
          ["I'm not thirsty, I just had coffee", "我不渴，我刚喝了咖啡", null, 5],
          ["I knew I wouldn't be thirsty after drinking", "我知道喝完后我不会渴", null, 7],
          ["I'm not thirsty but I'd like something to eat", "我不渴但我想吃点什么", null, 7]
        ]
      },
      S0626L03: {
        practice_phrases: [
          ["not thirsty", "不渴", null, 1],
          ["I'm not thirsty", "我不渴", null, 2],
          ["not thirsty now", "现在不渴", null, 2],
          ["you're not thirsty", "你不渴", null, 2],
          ["not thirsty today", "今天不渴", null, 2],
          ["I'm not thirsty, thank you", "我不渴，谢谢", null, 3],
          ["the children are not thirsty", "孩子们不渴", null, 3],
          ["I'm not thirsty but I want coffee", "我不渴但我想要咖啡", null, 5],
          ["I thought you were not thirsty", "我认为你不渴", null, 4],
          ["if you're not thirsty, you don't need tea", "如果你不渴，你不需要茶", null, 7]
        ]
      },
      S0626L04: {
        practice_phrases: [
          ["thirsty", "渴", null, 1],
          ["I'm thirsty", "我渴", null, 1],
          ["are you thirsty?", "你渴吗？", null, 2],
          ["very thirsty", "很渴", null, 1],
          ["I'm very thirsty", "我很渴", null, 2],
          ["I was thirsty yesterday", "我昨天很渴", null, 3],
          ["are you thirsty right now?", "你现在渴吗？", null, 3],
          ["I'm thirsty, I want something to drink", "我渴了，我想喝点什么", null, 5],
          ["I knew you would be thirsty after that", "我知道那之后你会渴", null, 6],
          ["if you're thirsty, would you like tea or coffee?", "如果你渴，你想要茶还是咖啡？", null, 7]
        ]
      }
    }
  },
  S0627: {
    legos: {
      S0627L02: {
        practice_phrases: [
          ["your coffee", "你的咖啡", null, 1],
          ["I have your coffee", "我有你的咖啡", null, 2],
          ["your coffee is ready", "你的咖啡好了", null, 2],
          ["I like your coffee", "我喜欢你的咖啡", null, 3],
          ["where is your coffee?", "你的咖啡在哪里？", null, 3],
          ["I knew your coffee was broken", "我知道你的咖啡坏了", null, 4],
          ["your coffee is ready right now", "你的咖啡现在好了", null, 4],
          ["I thought your coffee would be great", "我认为你的咖啡会很好", null, 5],
          ["I'd like to have a cup like your coffee", "我想要一杯像你的咖啡", null, 6],
          ["I was very thirsty so I drank your coffee", "我很渴所以我喝了你的咖啡", null, 7]
        ]
      }
    }
  }
};

// Read scaffolds and populate full basket structure
function generateBasket(seedId, legoId) {
  const scaffoldPath = path.join(SCAFFOLDS_DIR, `seed_${seedId.toLowerCase()}.json`);
  const scaffold = JSON.parse(fs.readFileSync(scaffoldPath, 'utf8'));

  const legoData = scaffold.legos[legoId];
  if (!legoData) {
    throw new Error(`LEGO ${legoId} not found in scaffold ${seedId}`);
  }

  // Get practice phrases from our baskets object
  const practicePhrasesData = baskets[seedId]?.legos?.[legoId]?.practice_phrases;
  if (!practicePhrasesData) {
    throw new Error(`Practice phrases not found for ${legoId}`);
  }

  // Populate the practice_phrases array
  legoData.practice_phrases = practicePhrasesData;

  return legoData;
}

// Process each seed
const seedGroups = {
  S0623: ['S0623L07'],
  S0624: ['S0624L02', 'S0624L03'],
  S0625: ['S0625L02', 'S0625L04', 'S0625L05'],
  S0626: ['S0626L02', 'S0626L03', 'S0626L04'],
  S0627: ['S0627L02']
};

console.log('🚀 Generating Phase 5 baskets for Chinese (cmn_for_eng) - Batch 4\n');

let totalLegos = 0;
let totalPhrases = 0;

Object.entries(seedGroups).forEach(([seedId, legoIds]) => {
  const scaffoldPath = path.join(SCAFFOLDS_DIR, `seed_${seedId.toLowerCase()}.json`);
  const scaffold = JSON.parse(fs.readFileSync(scaffoldPath, 'utf8'));

  // Create output structure
  const output = {
    legos: {}
  };

  legoIds.forEach(legoId => {
    const legoData = generateBasket(seedId, legoId);
    output.legos[legoId] = legoData;
    totalLegos++;
    totalPhrases += legoData.practice_phrases.length;
    console.log(`✅ ${legoId}: ${legoData.practice_phrases.length} phrases generated`);
  });

  // Write to output file
  const outputPath = path.join(OUTPUTS_DIR, `seed_${seedId}_baskets.json`);
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8');
  console.log(`📝 Saved: ${outputPath}\n`);
});

console.log(`\n✨ Complete! Generated ${totalPhrases} practice phrases across ${totalLegos} LEGOs\n`);
console.log('📊 Summary:');
console.log(`   - S0623: 1 LEGO (tea)`);
console.log(`   - S0624: 2 LEGOs (that would be great, would be great)`);
console.log(`   - S0625: 3 LEGOs (want to drink, something to drink, something)`);
console.log(`   - S0626: 3 LEGOs (I'm not thirsty, not thirsty, thirsty)`);
console.log(`   - S0627: 1 LEGO (your coffee)`);
