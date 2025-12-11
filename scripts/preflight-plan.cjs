/**
 * Preflight Plan Script
 * Simulates what Phase 8 would generate
 */

require('dotenv').config();
const fs = require('fs-extra');
const path = require('path');
const { findBaskets, findVoiceAssignments } = require('../services/data-finders.cjs');
const uuidService = require('../services/uuid-v11.cjs');
const genderExpansion = require('../services/gender-expansion-service.cjs');

async function simulatePlan() {
  const courseCode = process.argv[2] || 'spa_for_eng_v2';
  const VFS_ROOT = path.join(__dirname, '../public/vfs/courses');

  console.log('=== AUDIO GENERATION PLAN ===');
  console.log('Course:', courseCode);
  console.log('');

  // Load baskets
  const basketsPath = path.join(VFS_ROOT, courseCode, 'lego_baskets.json');
  const data = await fs.readJson(basketsPath);
  const baskets = findBaskets(data);

  console.log('Baskets found:', Object.keys(baskets).length);

  // Load voice assignments
  const voicesPath = path.join(__dirname, '../public/vfs/canonical/voices.json');
  const registry = await fs.readJson(voicesPath);
  const voiceAssignments = findVoiceAssignments(registry, courseCode);

  console.log('Voice assignments:', JSON.stringify(voiceAssignments, null, 2));
  console.log('');

  // Extract unique samples (same logic as Phase 8)
  const [targetLang, knownLang] = courseCode.split('_for_');
  const samples = new Map();

  for (const [basketId, basket] of Object.entries(baskets)) {
    if (basket.lego) {
      addSample(samples, basket.lego.known, knownLang.substring(0, 3), 'source');
      addSample(samples, basket.lego.target, targetLang.substring(0, 3), 'target1');
      addSample(samples, basket.lego.target, targetLang.substring(0, 3), 'target2');
    }
    if (basket.practice_phrases) {
      for (const phrase of basket.practice_phrases) {
        addSample(samples, phrase.known, knownLang.substring(0, 3), 'source');
        addSample(samples, phrase.target, targetLang.substring(0, 3), 'target1');
        addSample(samples, phrase.target, targetLang.substring(0, 3), 'target2');
      }
    }
  }

  console.log('Unique text samples:', samples.size);

  // Generate specs with UUIDs
  const specs = [];
  for (const [key, sample] of samples) {
    for (const role of sample.roles) {
      const voiceId = voiceAssignments[role];
      if (!voiceId) continue;

      const cadence = (role === 'source') ? 'natural' : 'slow';

      let ttsText = sample.text;
      if (role === 'target1' || role === 'target2') {
        ttsText = genderExpansion.expandForVoice(sample.text, voiceId, role);
      }

      const uuid = uuidService.generateSampleId(voiceId, ttsText, sample.lang, role, cadence);

      specs.push({ uuid, text: sample.text, ttsText, lang: sample.lang, role, voiceId, cadence });
    }
  }

  // Dedupe by UUID
  const uniqueSpecs = new Map();
  for (const spec of specs) {
    if (!uniqueSpecs.has(spec.uuid)) {
      uniqueSpecs.set(spec.uuid, spec);
    }
  }

  const finalSpecs = Array.from(uniqueSpecs.values());

  console.log('Total sample specs:', specs.length);
  console.log('Unique samples (after dedup):', finalSpecs.length);
  console.log('');

  // Breakdown by role
  const sourceCount = finalSpecs.filter(s => s.role === 'source').length;
  const target1Count = finalSpecs.filter(s => s.role === 'target1').length;
  const target2Count = finalSpecs.filter(s => s.role === 'target2').length;

  console.log('Sample breakdown:');
  console.log('  source:', sourceCount);
  console.log('  target1:', target1Count);
  console.log('  target2:', target2Count);
  console.log('');

  // Estimate characters and cost
  const totalChars = finalSpecs.reduce((sum, s) => sum + s.ttsText.length, 0);
  const estimatedCost = (totalChars / 1000) * 0.015;  // rough Azure estimate

  console.log('Total characters:', totalChars);
  console.log('Estimated cost (USD):', estimatedCost.toFixed(2));
  console.log('');

  // Show a few sample specs
  console.log('Sample specs (first 5):');
  finalSpecs.slice(0, 5).forEach((spec, i) => {
    console.log(`  ${i+1}. ${spec.uuid}`);
    console.log(`     text: "${spec.text}"`);
    console.log(`     role: ${spec.role}, voice: ${spec.voiceId}`);
  });
}

function addSample(samples, text, lang, role) {
  if (!text) return;
  const normalized = uuidService.normalizeText(text);
  const key = `${lang}:${normalized}`;
  if (!samples.has(key)) {
    samples.set(key, { text, normalizedText: normalized, lang, roles: new Set() });
  }
  samples.get(key).roles.add(role);
}

simulatePlan().catch(console.error);
