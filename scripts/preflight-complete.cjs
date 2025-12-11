/**
 * Complete Preflight Verification
 * Checks ALL requirements before audio generation
 */

require('dotenv').config();
const fs = require('fs-extra');
const path = require('path');
const { findBaskets, findVoiceAssignments } = require('../services/data-finders.cjs');
const uuidService = require('../services/uuid-v11.cjs');
const supabaseClient = require('../services/supabase-client.cjs');
const genderExpansion = require('../services/gender-expansion-service.cjs');
const azureTTS = require('../services/azure-tts-service.cjs');
const s3Service = require('../services/s3-service.cjs');

async function preflight() {
  const courseCode = process.argv[2] || 'spa_for_eng_v2';
  const VFS_ROOT = path.join(__dirname, '../public/vfs/courses');

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║            COMPLETE PREFLIGHT VERIFICATION                 ║');
  console.log('║                  ' + courseCode.padEnd(38) + ' ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  let passed = 0;
  let failed = 0;

  // 1. Check lego_baskets.json exists
  console.log('1. CHECKING LEGO BASKETS FILE...');
  const basketsPath = path.join(VFS_ROOT, courseCode, 'lego_baskets.json');
  let baskets;
  if (await fs.pathExists(basketsPath)) {
    const data = await fs.readJson(basketsPath);
    baskets = findBaskets(data);
    const basketCount = Object.keys(baskets || {}).length;
    console.log('   ✓ Found lego_baskets.json with', basketCount, 'baskets');
    passed++;
  } else {
    console.log('   ✗ MISSING: lego_baskets.json');
    failed++;
    return { passed, failed };
  }
  console.log('');

  // 2. Check voices.json and assignments
  console.log('2. CHECKING VOICE ASSIGNMENTS...');
  const voicesPath = path.join(__dirname, '../public/vfs/canonical/voices.json');
  const registry = await fs.readJson(voicesPath);
  const voiceAssignments = findVoiceAssignments(registry, courseCode);
  if (voiceAssignments) {
    console.log('   ✓ Voice assignments found:');
    for (const [role, voiceId] of Object.entries(voiceAssignments)) {
      console.log('      -', role, '→', voiceId);
    }
    passed++;
  } else {
    console.log('   ✗ MISSING: No voice assignments for', courseCode);
    failed++;
  }
  console.log('');

  // 3. Check all assigned voices exist in Supabase
  console.log('3. CHECKING VOICES IN SUPABASE...');
  const voiceIds = Object.values(voiceAssignments);
  for (const voiceId of voiceIds) {
    const { data, error } = await supabaseClient.supabase
      .from('voices')
      .select('voice_id')
      .eq('voice_id', voiceId)
      .single();

    if (data) {
      console.log('   ✓', voiceId, '- exists in Supabase');
      passed++;
    } else {
      console.log('   ✗', voiceId, '- MISSING from Supabase');
      failed++;
    }
  }
  console.log('');

  // 4. Check Azure TTS credentials
  console.log('4. CHECKING AZURE TTS CREDENTIALS...');
  try {
    const testBuffer = await azureTTS.generateSpeech('Hola', 'es-ES-TrianaNeural', 'spa', { rate: 1.0 });
    if (testBuffer && testBuffer.length > 0) {
      console.log('   ✓ Azure TTS working (test generated', testBuffer.length, 'bytes)');
      passed++;
    }
  } catch (err) {
    console.log('   ✗ Azure TTS FAILED:', err.message);
    failed++;
  }
  console.log('');

  // 5. Check S3 credentials
  console.log('5. CHECKING S3 CREDENTIALS...');
  try {
    const exists = await s3Service.audioExists('test-preflight-check');
    console.log('   ✓ S3 connection working');
    passed++;
  } catch (err) {
    console.log('   ✗ S3 connection FAILED:', err.message);
    failed++;
  }
  console.log('');

  // 6. Check Supabase connection
  console.log('6. CHECKING SUPABASE CONNECTION...');
  try {
    const { count, error } = await supabaseClient.supabase
      .from('audio_samples')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log('   ✗ Supabase query failed:', error.message);
      failed++;
    } else {
      console.log('   ✓ Supabase connection working (audio_samples table has', count || 0, 'records)');
      passed++;
    }
  } catch (err) {
    console.log('   ✗ Supabase FAILED:', err.message);
    failed++;
  }
  console.log('');

  // 7. Generate plan (sample count, cost estimate)
  console.log('7. GENERATION PLAN...');
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

  // Generate specs
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
      specs.push({ uuid, text: sample.text, ttsText, role, voiceId });
    }
  }

  // Dedupe
  const uniqueSpecs = new Map();
  for (const spec of specs) {
    if (!uniqueSpecs.has(spec.uuid)) uniqueSpecs.set(spec.uuid, spec);
  }
  const finalSpecs = Array.from(uniqueSpecs.values());

  const totalChars = finalSpecs.reduce((sum, s) => sum + s.ttsText.length, 0);
  const estimatedCost = (totalChars / 1000) * 0.015;

  console.log('   Unique text samples:', samples.size);
  console.log('   Total audio specs:', finalSpecs.length);
  console.log('   - source:', finalSpecs.filter(s => s.role === 'source').length);
  console.log('   - target1:', finalSpecs.filter(s => s.role === 'target1').length);
  console.log('   - target2:', finalSpecs.filter(s => s.role === 'target2').length);
  console.log('   Total characters:', totalChars.toLocaleString());
  console.log('   Estimated cost: $' + estimatedCost.toFixed(2), 'USD');
  console.log('');

  // Summary
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║                    PREFLIGHT SUMMARY                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('   Passed:', passed);
  console.log('   Failed:', failed);
  console.log('');

  if (failed === 0) {
    console.log('   ✓ ALL PREFLIGHT CHECKS PASSED - READY TO GENERATE');
  } else {
    console.log('   ✗ PREFLIGHT FAILED - Fix issues before generating');
  }

  return { passed, failed };
}

function addSample(samples, text, lang, role) {
  if (!text) return;
  const normalized = uuidService.normalizeText(text);
  const key = lang + ':' + normalized;
  if (!samples.has(key)) {
    samples.set(key, { text, normalizedText: normalized, lang, roles: new Set() });
  }
  samples.get(key).roles.add(role);
}

preflight().catch(err => {
  console.error('PREFLIGHT ERROR:', err);
  process.exit(1);
});
