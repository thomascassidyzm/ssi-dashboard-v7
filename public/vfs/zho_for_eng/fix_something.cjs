#!/usr/bin/env node

/**
 * Fix "something" FD violation by adding context
 */

const fs = require('fs');
const extraction = JSON.parse(fs.readFileSync('lego_extraction.json', 'utf8'));

console.log('🔧 Fixing "something" FD violation with context...\n');

// S0004: "怎么用中文说什么" = "how to say something in Chinese"
// Chunk as: 说什么 = "say something"
const s0004 = extraction.seeds.find(s => s.seed_id === 'S0004');
if (s0004) {
  // Merge last two LEGOs
  console.log('✓ S0004: Merge 说 + 什么 → 说什么 = "say something"');
  s0004.legos = [
    s0004.legos[0], // 怎么
    s0004.legos[1], // 用
    s0004.legos[2], // 中文
    {
      id: 'S0004L01',
      type: 'M',
      target: '说什么',
      known: 'say something',
      new: true,
      components: [['说', 'say'], ['什么', 'something']]
    }
  ];
}

// S0030: "我昨天想问你一些事" = "I wanted to ask you something yesterday"
// Chunk as: 问你一些事 = "ask you something"
const s0030 = extraction.seeds.find(s => s.seed_id === 'S0030');
if (s0030) {
  console.log('✓ S0030: Merge 问 + 你 + 一些事 → 问你一些事 = "ask you something"');
  s0030.legos = [
    s0030.legos[0], // 我
    s0030.legos[1], // 昨天
    s0030.legos[2], // 想
    {
      id: 'S0030L01',
      type: 'M',
      target: '问你一些事',
      known: 'ask you something',
      new: true,
      components: [['问', 'ask'], ['你', 'you'], ['一些事', 'something']]
    }
  ];
}

// S0032: "你想给我看什么东西吗？" = "Did you want to show me something?"
// Chunk as: 看什么东西 = "show me something" OR just componentize 什么东西
const s0032 = extraction.seeds.find(s => s.seed_id === 'S0032');
if (s0032) {
  console.log('✓ S0032: Keep structure, just ensure 什么东西 has components');
  // Already has components from earlier fix, just verify
  const somethingLego = s0032.legos.find(l => l.target === '什么东西');
  if (somethingLego && !somethingLego.components) {
    somethingLego.type = 'M';
    somethingLego.components = [['什么', 'what'], ['东西', 'thing']];
  }
}

// Recalculate cumulative counts
console.log('\n🔢 Recalculating cumulative counts...');

const registry = new Map();
let recalced = 0;

extraction.seeds.forEach(seed => {
  seed.legos.forEach(lego => {
    if (lego.new) {
      registry.set(lego.id, true);
    }
  });

  const expected = registry.size;
  if (seed.cumulative_legos !== expected) {
    seed.cumulative_legos = expected;
    recalced++;
  }
});

// Save
fs.writeFileSync('lego_extraction.json', JSON.stringify(extraction, null, 2), 'utf8');

console.log(`✓ Recalculated ${recalced} cumulative counts`);
console.log('\n✅ Saved to: lego_extraction.json');
console.log('💡 Run: node test_extraction.cjs to verify');
