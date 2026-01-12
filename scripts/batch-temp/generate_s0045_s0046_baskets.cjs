#!/usr/bin/env node

/**
 * Generate practice baskets for S0045L04 and S0046L02
 * Following progressive complexity: 2-2-2-4 pattern
 */

const fs = require('fs');

// Load vocabulary from S0001-S0046
const vocabFile = '/tmp/vocab_s0001_s0046.txt';
const vocabLines = fs.readFileSync(vocabFile, 'utf8').trim().split('\n');
const vocabulary = vocabLines.map(line => {
  const [known, target] = line.split('|');
  return { known, target };
});

console.log(`Loaded ${vocabulary.length} vocabulary items from S0001-S0046`);

// Helper function to get random vocabulary items
function getRandomVocab(count, excludeKnown = []) {
  const available = vocabulary.filter(v => !excludeKnown.includes(v.known));
  const selected = [];
  for (let i = 0; i < count && available.length > 0; i++) {
    const idx = Math.floor(Math.random() * available.length);
    selected.push(available.splice(idx, 1)[0]);
  }
  return selected;
}

// S0045L04: "everything" / "一切"
const s0045l04_phrases = [
  // Simple (2 phrases - 2-3 words each)
  {
    known: "I want everything.",
    target: "我想要一切。"
  },
  {
    known: "You know everything.",
    target: "你知道一切。"
  },
  // Medium (2 phrases - 4-5 words each)
  {
    known: "I don't understand everything.",
    target: "我不明白一切。"
  },
  {
    known: "You don't need everything.",
    target: "你不需要一切。"
  },
  // Medium-complex (2 phrases - 6-7 words each)
  {
    known: "I want to know everything about you.",
    target: "我想知道关于你的一切。"
  },
  {
    known: "You don't have to explain everything.",
    target: "你不必解释一切。"
  },
  // Complex (4 phrases - 8-12 words each)
  {
    known: "I don't need to understand everything to start speaking.",
    target: "我不需要理解一切就能开始说话。"
  },
  {
    known: "You can't remember everything, but you can try.",
    target: "你不能记住一切，但你可以试试。"
  },
  {
    known: "I want to learn everything, but I know it takes time.",
    target: "我想学习一切，但我知道这需要时间。"
  },
  {
    known: "Everything is difficult at first, but it gets easier.",
    target: "一切在开始时都很难，但会变得容易。"
  }
];

// S0046L02: "don't worry about" / "不担心"
const s0046l02_phrases = [
  // Simple (2 phrases - 2-3 words each)
  {
    known: "Don't worry about me.",
    target: "别担心我。"
  },
  {
    known: "I don't worry about it.",
    target: "我不担心。"
  },
  // Medium (2 phrases - 4-5 words each)
  {
    known: "Don't worry about making mistakes.",
    target: "别担心犯错。"
  },
  {
    known: "I don't worry about the time.",
    target: "我不担心时间。"
  },
  // Medium-complex (2 phrases - 6-7 words each)
  {
    known: "You don't need to worry about anything.",
    target: "你不需要担心任何事情。"
  },
  {
    known: "Don't worry about it, I can help you.",
    target: "别担心，我可以帮你。"
  },
  // Complex (4 phrases - 8-12 words each)
  {
    known: "I don't worry about speaking slowly because I'm learning.",
    target: "我不担心说得慢，因为我在学习。"
  },
  {
    known: "Don't worry about understanding everything at the beginning.",
    target: "别担心一开始就理解一切。"
  },
  {
    known: "You don't need to worry about mistakes when you practice.",
    target: "你练习的时候不需要担心错误。"
  },
  {
    known: "I don't worry about it because I know I'll improve.",
    target: "我不担心，因为我知道我会进步。"
  }
];

// Create basket payloads
const s0045_basket = {
  course: "zho_for_eng",
  seed: "S0045",
  baskets: {
    "S0045L04": {
      lego_id: "S0045L04",
      practice_phrases: s0045l04_phrases
    }
  }
};

const s0046_basket = {
  course: "zho_for_eng",
  seed: "S0046",
  baskets: {
    "S0046L02": {
      lego_id: "S0046L02",
      practice_phrases: s0046l02_phrases
    }
  }
};

// Save to files
fs.writeFileSync('/tmp/s0045_basket.json', JSON.stringify(s0045_basket, null, 2));
fs.writeFileSync('/tmp/s0046_basket.json', JSON.stringify(s0046_basket, null, 2));

console.log('\n✅ Generated baskets:');
console.log('  - S0045L04 (everything): 10 practice phrases');
console.log('  - S0046L02 (don\'t worry about): 10 practice phrases');
console.log('\nFiles saved:');
console.log('  - /tmp/s0045_basket.json');
console.log('  - /tmp/s0046_basket.json');
