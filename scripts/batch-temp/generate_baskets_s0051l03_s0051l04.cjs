#!/usr/bin/env node

/**
 * Generate practice baskets for S0051L03 (doing/做) and S0051L04 (interesting/有趣的)
 *
 * Rules:
 * - 10 practice phrases per LEGO
 * - Each phrase must include the complete LEGO
 * - Progressive complexity: 2-2-2-4 (2 short, 2 medium, 2 medium-long, 4 longer)
 * - Only use vocabulary from S0001-S0051
 * - Natural, varied contexts
 */

const fs = require('fs');
const path = require('path');

// Read lego_pairs.json
const legoPairsPath = path.join(__dirname, '../../public/vfs/courses/zho_for_eng/lego_pairs.json');
const legoPairs = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));

// Extract all LEGOs from S0001-S0051 for vocabulary reference
const availableVocab = {};
legoPairs.seeds.forEach(seed => {
  const seedNum = parseInt(seed.seed_id.replace('S', ''));
  if (seedNum >= 1 && seedNum <= 51) {
    seed.legos.forEach(lego => {
      availableVocab[lego.id] = {
        known: lego.known,
        target: lego.target,
        type: lego.type
      };
    });
  }
});

console.log(`Available vocabulary: ${Object.keys(availableVocab).length} LEGOs from S0001-S0051\n`);

// Practice phrases for S0051L03 (doing/做)
const s0051l03_phrases = [
  // Short (2)
  {
    known: "I'm doing this.",
    target: "我在做这个。"
  },
  {
    known: "What are you doing?",
    target: "你在做什么？"
  },
  // Medium (2)
  {
    known: "I'm doing this now.",
    target: "我现在在做这个。"
  },
  {
    known: "She's doing something good.",
    target: "她在做好事。"
  },
  // Medium-long (2)
  {
    known: "I want to start doing this tomorrow.",
    target: "我想明天开始做这个。"
  },
  {
    known: "He's doing something very important.",
    target: "他在做很重要的事。"
  },
  // Longer (4)
  {
    known: "I enjoy doing different things every day.",
    target: "我喜欢每天做不同的事。"
  },
  {
    known: "We need to finish doing this as quickly as possible.",
    target: "我们需要尽快完成做这个。"
  },
  {
    known: "I want to know what you're doing right now.",
    target: "我想知道你现在在做什么。"
  },
  {
    known: "She said she's doing something important at home.",
    target: "她说她在家做重要的事。"
  }
];

// Practice phrases for S0051L04 (interesting/有趣的)
const s0051l04_phrases = [
  // Short (2)
  {
    known: "This is interesting.",
    target: "这个很有趣。"
  },
  {
    known: "That's very interesting.",
    target: "那很有趣。"
  },
  // Medium (2)
  {
    known: "I want something interesting.",
    target: "我想要有趣的东西。"
  },
  {
    known: "This is really interesting.",
    target: "这真的很有趣。"
  },
  // Medium-long (2)
  {
    known: "I enjoy doing interesting things.",
    target: "我喜欢做有趣的事。"
  },
  {
    known: "That's a very interesting idea.",
    target: "那是个很有趣的想法。"
  },
  // Longer (4)
  {
    known: "I enjoy doing interesting things with my friends.",
    target: "我喜欢和朋友一起做有趣的事。"
  },
  {
    known: "She wants to try something new and interesting tomorrow.",
    target: "她想明天尝试新的有趣的事。"
  },
  {
    known: "We always do interesting things on the weekend.",
    target: "我们周末总是做有趣的事。"
  },
  {
    known: "I think this is the most interesting thing here.",
    target: "我觉得这是这里最有趣的事。"
  }
];

// Create basket structures
const basket_s0051l03 = {
  course: "zho_for_eng",
  seed: "S0051",
  baskets: {
    "S0051L03": {
      lego_id: "S0051L03",
      practice_phrases: s0051l03_phrases
    }
  }
};

const basket_s0051l04 = {
  course: "zho_for_eng",
  seed: "S0051",
  baskets: {
    "S0051L04": {
      lego_id: "S0051L04",
      practice_phrases: s0051l04_phrases
    }
  }
};

// Save to files
const outputDir = path.join(__dirname);
fs.writeFileSync(
  path.join(outputDir, 'basket_s0051l03.json'),
  JSON.stringify(basket_s0051l03, null, 2)
);
fs.writeFileSync(
  path.join(outputDir, 'basket_s0051l04.json'),
  JSON.stringify(basket_s0051l04, null, 2)
);

console.log('✓ Generated basket_s0051l03.json');
console.log('✓ Generated basket_s0051l04.json');
console.log('\nS0051L03 (doing/做) - 10 practice phrases:');
s0051l03_phrases.forEach((p, i) => {
  console.log(`  ${i+1}. ${p.known} → ${p.target}`);
});
console.log('\nS0051L04 (interesting/有趣的) - 10 practice phrases:');
s0051l04_phrases.forEach((p, i) => {
  console.log(`  ${i+1}. ${p.known} → ${p.target}`);
});
