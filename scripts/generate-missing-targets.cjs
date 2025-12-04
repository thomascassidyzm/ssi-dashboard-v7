#!/usr/bin/env node
/**
 * Generate 4 missing Chinese target audio files
 */

require('dotenv').config();

const path = require('path');
const fs = require('fs-extra');
const { generateLegacyUUID } = require('../services/uuid-service.cjs');
const azureTTS = require('../services/azure-tts-service.cjs');

const TARGETS_DIR = path.join(__dirname, '../temp/audio/targets');

// Missing targets - Chinese phrases that need target1 and target2 audio
const MISSING = [
  { text: '喜欢说中文的人', expectedUuid: '52A320DA-8048-5853-9FD6-53A571DDA525' },
  { text: '他们能减少', expectedUuid: '174AEA54-F40F-5252-B7DF-9AD442C8936C' },
  { text: '减少', expectedUuid: '531F543D-A136-5A5B-BF37-5A0E5439F0FC' },
  { text: '他们招的学生数量', expectedUuid: '6ACB0ADF-D7C1-5417-B5F2-2FAD1D352315' },
];

// Voice config for cmn_for_eng course
const VOICES = {
  target1: 'zh-CN-XiaoxiaoNeural',  // Female
  target2: 'zh-CN-YunxiNeural',     // Male
};

async function main() {
  console.log('=== Generating Missing Chinese Targets ===\n');

  await fs.ensureDir(TARGETS_DIR);

  for (const { text, expectedUuid } of MISSING) {
    console.log(`\nProcessing: "${text}"`);
    console.log(`  Expected UUID: ${expectedUuid}`);

    // Generate target1 (female)
    try {
      console.log(`  Generating target1 with ${VOICES.target1}...`);
      const path1 = path.join(TARGETS_DIR, `${expectedUuid}.mp3`);
      await azureTTS.generateAudioWithRetry(text, VOICES.target1, path1, 0.8); // 0.8 = slow
      const stats1 = await fs.stat(path1);
      console.log(`  ✓ Saved target1: ${path1} (${stats1.size} bytes)`);
    } catch (err) {
      console.error(`  ✗ Failed target1: ${err.message}`);
    }

    // Generate target2 (male) - use legacy UUID (no voiceId) to match presentation-service lookup
    try {
      console.log(`  Generating target2 with ${VOICES.target2}...`);
      const uuid2 = generateLegacyUUID(text, 'cmn', 'target2', 'slow');
      const path2 = path.join(TARGETS_DIR, `${uuid2}.mp3`);
      await azureTTS.generateAudioWithRetry(text, VOICES.target2, path2, 0.8);
      const stats2 = await fs.stat(path2);
      console.log(`  ✓ Saved target2: ${path2} (${stats2.size} bytes)`);
    } catch (err) {
      console.error(`  ✗ Failed target2: ${err.message}`);
    }
  }

  console.log('\n=== Done ===');

  // Close Azure connection pool
  await azureTTS.closePool();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
