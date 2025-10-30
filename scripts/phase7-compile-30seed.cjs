#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const courseDir = path.join(__dirname, '..', 'vfs', 'courses', 'spa_for_eng_30');

// Read inputs
const legoPairs = JSON.parse(fs.readFileSync(path.join(courseDir, 'lego_pairs.json'), 'utf8'));
const baskets = JSON.parse(fs.readFileSync(path.join(courseDir, 'lego_baskets.json'), 'utf8'));
const intros = JSON.parse(fs.readFileSync(path.join(courseDir, 'introductions.json'), 'utf8'));

// Create intro lookup
const introLookup = {};
intros.introductions.forEach(intro => {
  introLookup[intro.lego_id] = intro.intro;
});

// Deterministic UUID generation
function generateDeterministicUUID(input, role) {
  const hash = crypto.createHash('sha1').update(input + role).digest('hex');
  const roleSegments = {
    target1: 'ac078f4e',
    target2: 'e1158f4e',
    source: '36cd31d4'
  };
  return `${hash.substring(0, 8)}-6044-${roleSegments[role].substring(0, 4)}-${roleSegments[role].substring(4, 8)}-${hash.substring(8, 20)}`;
}

// Build manifest
const manifest = {
  version: "7.7.0",
  course: "spa_for_eng_30",
  target: "spa",
  known: "eng",
  generated: new Date().toISOString(),
  total_seeds: legoPairs.total_seeds,
  total_legos: legoPairs.total_legos,
  seeds: []
};

const sampleRegistry = new Map();

legoPairs.seeds.forEach((seedData, seedIndex) => {
  const [seedId, [targetSeed, knownSeed], legoList] = seedData;

  const seed = {
    seed_id: seedId,
    seed_index: seedIndex,
    target: targetSeed,
    known: knownSeed,
    legos: []
  };

  legoList.forEach((legoData, legoIndex) => {
    const [legoId, legoType, targetLego, knownLego, components] = legoData;

    const basket = baskets[legoId] || { e: [], d: { "2": [], "3": [], "4": [], "5": [] } };
    const intro = introLookup[legoId] || "";

    // Register samples
    function registerSample(phrase, role) {
      const key = `${phrase}|${role}`;
      if (!sampleRegistry.has(key)) {
        sampleRegistry.set(key, generateDeterministicUUID(phrase, role));
      }
      return sampleRegistry.get(key);
    }

    const lego = {
      lego_id: legoId,
      lego_index: legoIndex,
      type: legoType,
      target: targetLego,
      known: knownLego,
      target1_uuid: registerSample(targetLego, 'target1'),
      target2_uuid: registerSample(targetLego, 'target2'),
      source_uuid: registerSample(knownLego, 'source'),
      components: components || [],
      intro,
      e_phrases: basket.e || [],
      d_phrases: basket.d || { "2": [], "3": [], "4": [], "5": [] }
    };

    // Register e-phrase samples
    if (basket.e) {
      basket.e.forEach(([targetPhrase, knownPhrase]) => {
        registerSample(targetPhrase, 'target1');
        registerSample(targetPhrase, 'target2');
        registerSample(knownPhrase, 'source');
      });
    }

    // Register d-phrase samples
    Object.values(basket.d || {}).forEach(phrases => {
      phrases.forEach(([targetPhrase, knownPhrase]) => {
        registerSample(targetPhrase, 'target1');
        registerSample(targetPhrase, 'target2');
        registerSample(knownPhrase, 'source');
      });
    });

    seed.legos.push(lego);
  });

  manifest.seeds.push(seed);
});

// Add sample registry
manifest.audio_samples = Array.from(sampleRegistry.entries()).map(([key, uuid]) => {
  const [phrase, role] = key.split('|');
  return { uuid, phrase, role };
});

// Write manifest
fs.writeFileSync(
  path.join(courseDir, 'course_manifest.json'),
  JSON.stringify(manifest, null, 2)
);

console.log('✅ Manifest compiled:');
console.log(`   Seeds: ${manifest.total_seeds}`);
console.log(`   LEGOs: ${manifest.total_legos}`);
console.log(`   Audio samples: ${manifest.audio_samples.length}`);
console.log(`   Output: course_manifest.json`);
