/**
 * Sync voices.json to Supabase
 *
 * Reads the local voices.json file and upserts all voices to Supabase.
 * This ensures the Supabase voices table has all approved voices for
 * foreign key validation in audio_samples.
 *
 * Usage: node tools/sync/sync-voices-to-supabase.cjs
 */

require('dotenv').config();
const fs = require('fs-extra');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const VOICES_PATH = path.join(__dirname, '../../public/vfs/canonical/voices.json');

async function syncVoices() {
  console.log('=== SYNC VOICES TO SUPABASE ===\n');

  // Initialize Supabase
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY required in .env');
    process.exit(1);
  }

  // Load voices.json
  if (!await fs.pathExists(VOICES_PATH)) {
    console.error('ERROR: voices.json not found at:', VOICES_PATH);
    process.exit(1);
  }

  const voicesData = await fs.readJson(VOICES_PATH);
  const voices = voicesData.voices || {};

  console.log(`Found ${Object.keys(voices).length} voices in voices.json\n`);

  // Transform to Supabase format (matching existing schema)
  // Supabase voices table has: voice_id, type, tts_engine, tts_voice_name, tts_locale,
  //   human_name, human_email, languages[], sample_count, last_used_at, is_active,
  //   created_at, updated_at, display_name, provider_id, typical_roles[], model, notes
  const voiceRecords = Object.entries(voices).map(([voiceId, config]) => {
    // Extract locale from provider_id (e.g., "es-ES-TrianaNeural" → "es-ES")
    const providerIdMatch = (config.provider_id || '').match(/^([a-z]{2}-[A-Z]{2})/);
    const locale = providerIdMatch ? providerIdMatch[1] : null;

    // Extract voice name from provider_id (e.g., "es-ES-TrianaNeural" → "TrianaNeural")
    const voiceNameMatch = (config.provider_id || '').match(/^[a-z]{2}-[A-Z]{2}-(.+)$/);
    const voiceName = voiceNameMatch ? voiceNameMatch[1] : config.provider_id;

    return {
      voice_id: voiceId,
      type: 'tts',  // All voices in voices.json are TTS
      tts_engine: config.provider || 'unknown',
      tts_voice_name: voiceName,
      tts_locale: locale,
      languages: config.language ? [config.language] : [],
      display_name: config.display_name || voiceId,
      typical_roles: config.typical_roles || [],
      model: config.model || null,
      notes: config.notes || null,
      is_active: true
    };
  });

  // Upsert to Supabase
  let success = 0;
  let failed = 0;

  for (const voice of voiceRecords) {
    const { error } = await supabase
      .from('voices')
      .upsert(voice, { onConflict: 'voice_id' });

    if (error) {
      console.log(`  FAILED: ${voice.voice_id} - ${error.message}`);
      failed++;
    } else {
      console.log(`  OK: ${voice.voice_id}`);
      success++;
    }
  }

  console.log(`\n=== SYNC COMPLETE ===`);
  console.log(`  Success: ${success}`);
  console.log(`  Failed: ${failed}`);

  // Verify count
  const { count } = await supabase
    .from('voices')
    .select('*', { count: 'exact', head: true });

  console.log(`  Total in Supabase: ${count}`);
}

syncVoices().catch(err => {
  console.error('Sync failed:', err);
  process.exit(1);
});
