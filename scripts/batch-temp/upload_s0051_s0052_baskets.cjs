#!/usr/bin/env node

/**
 * Generate and upload practice baskets for S0051L07 and S0052L02
 *
 * LEGOs:
 * - S0051L07: "with my friends" / "和朋友一起" (M-type, new)
 *   - Component: "my friends" / "朋友"
 * - S0052L02: "wanted to" / "想" (A-type, new)
 */

const fs = require('fs');
const path = require('path');

// Read LEGO pairs and vocabulary
const legoPairsPath = '/Users/tomcassidy/SSi/ssi-dashboard-v7-clean/public/vfs/courses/zho_for_eng/lego_pairs.json';
const vocabPath = '/tmp/vocab_s0052.txt';

const legoPairs = JSON.parse(fs.readFileSync(legoPairsPath, 'utf8'));
const vocabLines = fs.readFileSync(vocabPath, 'utf8').split('\n').filter(l => l.trim());

// Parse vocabulary
const vocab = new Map();
vocabLines.forEach(line => {
  const [id, known, target] = line.split('\t');
  if (id && known && target) {
    vocab.set(id, { known, target });
  }
});

console.log(`Loaded ${vocab.size} vocabulary items from S0001-S0052`);

// Extract target LEGOs
const s0051 = legoPairs.seeds.find(s => s.seed_id === 'S0051');
const s0052 = legoPairs.seeds.find(s => s.seed_id === 'S0052');

const s0051L07 = s0051.legos.find(l => l.id === 'S0051L07');
const s0052L02 = s0052.legos.find(l => l.id === 'S0052L02');

console.log('\nS0051L07:', s0051L07);
console.log('S0052L02:', s0052L02);

// Practice phrases for S0051L07: "with my friends" / "和朋友一起"
// This is M-type with component "my friends" / "朋友"
const s0051L07_phrases = [
  // Progressive variations focusing on "with my friends" in different contexts
  { known: "I want to go with my friends", target: "我想和朋友一起去" },
  { known: "I'm learning with my friends", target: "我在和朋友一起学" },
  { known: "I like to speak Chinese with my friends", target: "我喜欢和朋友一起说中文" },
  { known: "I'm trying to study with my friends", target: "我在尝试和朋友一起学习" },
  { known: "I want to watch a movie with my friends", target: "我想和朋友一起看电影" },
  { known: "I went to Beijing with my friends", target: "我和朋友一起去了北京" },
  { known: "I'm eating dinner with my friends now", target: "我现在在和朋友一起吃晚饭" },
  { known: "I like to travel with my friends", target: "我喜欢和朋友一起旅行" },
  { known: "I went to the restaurant with my friends yesterday", target: "我昨天和朋友一起去了餐厅" },
  { known: "I want to practice speaking Chinese with my friends as often as possible", target: "我想尽可能常和朋友一起练习说中文" }
];

// Practice phrases for S0052L02: "wanted to" / "想"
// This is A-type, past tense marker for "want"
const s0052L02_phrases = [
  // Progressive variations focusing on "wanted to" in different contexts
  { known: "I wanted to go", target: "我想去" },
  { known: "I wanted to learn Chinese", target: "我想学中文" },
  { known: "I wanted to speak with you", target: "我想跟你说" },
  { known: "I wanted to try", target: "我想尝试" },
  { known: "I wanted to eat dinner", target: "我想吃晚饭" },
  { known: "I wanted to watch a movie", target: "我想看电影" },
  { known: "I wanted to go to Beijing yesterday", target: "我昨天想去北京" },
  { known: "I wanted to study with my friends", target: "我想和朋友一起学习" },
  { known: "I wanted to practice speaking Chinese last week", target: "我上周想练习说中文" },
  { known: "I wanted to travel to China as soon as possible", target: "我想尽快去中国旅行" }
];

// Create basket payloads
const s0051_basket = {
  course: "zho_for_eng",
  seed: "S0051",
  baskets: {
    "S0051L07": {
      lego_id: "S0051L07",
      practice_phrases: s0051L07_phrases
    }
  }
};

const s0052_basket = {
  course: "zho_for_eng",
  seed: "S0052",
  baskets: {
    "S0052L02": {
      lego_id: "S0052L02",
      practice_phrases: s0052L02_phrases
    }
  }
};

// Upload function with retry
async function uploadBasket(basket, legoId, maxRetries = 3) {
  const endpoint = 'https://mirthlessly-nonanesthetized-marilyn.ngrok-free.dev/upload-basket';

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`\n[${legoId}] Attempt ${attempt}/${maxRetries}...`);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          'User-Agent': 'nodejs-fetch'
        },
        body: JSON.stringify(basket)
      });

      const result = await response.json();

      if (response.ok) {
        console.log(`[${legoId}] ✓ Upload successful:`, result);
        return { success: true, result };
      } else {
        console.error(`[${legoId}] ✗ Upload failed (HTTP ${response.status}):`, result);
        if (attempt === maxRetries) {
          return { success: false, error: result };
        }
      }
    } catch (error) {
      console.error(`[${legoId}] ✗ Request error:`, error.message);
      if (attempt === maxRetries) {
        return { success: false, error: error.message };
      }
    }

    // Wait before retry (exponential backoff)
    if (attempt < maxRetries) {
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`[${legoId}] Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Main execution
async function main() {
  console.log('\n=== Uploading Practice Baskets ===\n');

  const results = [];

  // Upload S0051L07
  results.push(await uploadBasket(s0051_basket, 'S0051L07'));

  // Wait between uploads
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Upload S0052L02
  results.push(await uploadBasket(s0052_basket, 'S0052L02'));

  // Summary
  console.log('\n=== Upload Summary ===');
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`\n✓ Successful: ${successful}/2`);
  console.log(`✗ Failed: ${failed}/2`);

  if (failed > 0) {
    console.log('\nFailed uploads:');
    results.forEach((r, i) => {
      if (!r.success) {
        const legoId = i === 0 ? 'S0051L07' : 'S0052L02';
        console.log(`  - ${legoId}: ${JSON.stringify(r.error)}`);
      }
    });
    process.exit(1);
  } else {
    console.log('\n✓ All baskets uploaded successfully!');
  }
}

main().catch(error => {
  console.error('\n✗ Fatal error:', error);
  process.exit(1);
});
