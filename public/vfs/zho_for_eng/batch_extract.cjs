#!/usr/bin/env node

/**
 * Batch Chinese LEGO Extraction
 * Extracts multiple seeds in sequence
 */

const fs = require('fs');

// Load data
const seedPairs = JSON.parse(fs.readFileSync('seed_pairs.json', 'utf8'));
const extraction = JSON.parse(fs.readFileSync('lego_extraction.json', 'utf8'));

// Build registry
const registry = new Map();
extraction.seeds.forEach(seed => {
  seed.legos.forEach(lego => {
    if (lego.new) {
      registry.set(lego.target, {
        id: lego.id,
        type: lego.type,
        known: lego.known,
        seed: seed.seed_id,
        components: lego.components || null
      });
    }
  });
});

let cumulative = extraction.seeds.length > 0
  ? extraction.seeds[extraction.seeds.length - 1].cumulative_legos
  : 0;

// Helper to add seed
const addSeed = (seedObj) => {
  const rec = seedObj.legos.map(l => l.target).join('');
  const match = rec === seedObj.seed_pair[0];
  console.log(`${seedObj.seed_id}: ${match ? '✓' : '✗ TILING FAILURE'}`);

  if (!match) {
    console.log('  Expected:', seedObj.seed_pair[0]);
    console.log('  Got:', rec);
  }

  let newCount = 0;
  seedObj.legos.forEach(l => {
    if (l.new) {
      registry.set(l.target, {
        id: l.id,
        type: l.type,
        known: l.known,
        seed: seedObj.seed_id,
        components: l.components || null
      });
      cumulative++;
      newCount++;
    }
  });

  seedObj.cumulative_legos = cumulative;
  extraction.seeds.push(seedObj);
  fs.writeFileSync('lego_extraction.json', JSON.stringify(extraction, null, 2), 'utf8');
};

// Get start seed from command line or continue from last
const startSeed = process.argv[2] ? parseInt(process.argv[2]) : extraction.seeds.length + 1;
const endSeed = process.argv[3] ? parseInt(process.argv[3]) : startSeed + 9;

console.log(`\nExtracting S${String(startSeed).padStart(4, '0')}-S${String(endSeed).padStart(4, '0')}...\n`);

// MANUAL SEED EXTRACTION DATA
// Add seeds S0016-S0050 here

const seedData = {
  16: {
    legos: [
      { id: 'S0016L01', type: 'A', target: '他', known: 'he', new: true },
      { id: 'S0001L03', type: 'A', target: '想', known: 'wants', ref: 'S0001' },
      { id: 'S0016L02', type: 'A', target: '晚一点', known: 'later on', new: true },
      { id: 'S0016L03', type: 'M', target: '和其他人', known: 'with everyone else', new: true,
        components: [['和', 'with'], ['其他人', 'everyone else']] },
      { id: 'S0016L04', type: 'A', target: '一起', known: 'together', new: true },
      { id: 'S0016L05', type: 'A', target: '回来', known: 'come back', new: true }
    ],
    patterns: ['P12_yiqi']
  },
  17: {
    legos: [
      { id: 'S0017L01', type: 'A', target: '她', known: 'she', new: true },
      { id: 'S0001L03', type: 'A', target: '想', known: 'wants', ref: 'S0001' },
      { id: 'S0017L02', type: 'A', target: '找出', known: 'find out', new: true },
      { id: 'S0017L03', type: 'M', target: '答案是什么', known: 'what the answer is', new: true,
        components: [['答案', 'answer'], ['是', 'is'], ['什么', 'what']] }
    ],
    patterns: ['P01_want_to_verb']
  },
  18: {
    legos: [
      { id: 'S0018L01', type: 'A', target: '我们', known: 'we', new: true },
      { id: 'S0001L03', type: 'A', target: '想', known: 'want', ref: 'S0001' },
      { id: 'S0018L02', type: 'A', target: '今天晚上', known: 'this evening', new: true },
      { id: 'S0018L03', type: 'A', target: '六点', known: 'six o\'clock', new: true },
      { id: 'S0018L04', type: 'A', target: '见面', known: 'meet', new: true }
    ],
    patterns: ['P01_want_to_verb']
  },
  19: {
    legos: [
      { id: 'S0019L01', type: 'A', target: '但', known: 'but', new: true },
      { id: 'S0001L01', type: 'A', target: '我', known: 'I', ref: 'S0001' },
      { id: 'S0012L01', type: 'M', target: '不想', known: "I don't want", ref: 'S0012',
        components: [['不', 'not'], ['想', 'want']] },
      { id: 'S0019L02', type: 'A', target: '停止', known: 'stop', new: true },
      { id: 'S0019L03', type: 'A', target: '说话', known: 'talking', new: true }
    ],
    patterns: ['P13_but']
  },
  20: {
    legos: [
      { id: 'S0013L01', type: 'A', target: '你', known: 'you', ref: 'S0013' },
      { id: 'S0001L03', type: 'A', target: '想', known: 'want', ref: 'S0001' },
      { id: 'S0020L01', type: 'A', target: '快点', known: 'quickly', new: true },
      { id: 'S0002L02', type: 'A', target: '学习', known: 'learn', ref: 'S0002' },
      { id: 'S0020L02', type: 'M', target: '他的名字', known: 'his name', new: true,
        components: [['他的', 'his'], ['名字', 'name']] }
    ],
    patterns: ['P01_want_to_verb']
  }
};

// Extract seeds
for (let i = startSeed; i <= endSeed && i <= 20; i++) {
  const seedId = `S${String(i).padStart(4, '0')}`;
  const data = seedData[i];

  if (!data) {
    console.log(`⚠️  ${seedId}: No extraction data available`);
    continue;
  }

  addSeed({
    seed_id: seedId,
    seed_pair: seedPairs.translations[seedId],
    legos: data.legos,
    patterns: data.patterns
  });
}

console.log(`\n✅ Extraction complete`);
console.log(`📊 Total seeds: ${extraction.seeds.length}/668`);
console.log(`📊 Total LEGOs: ${cumulative}`);
