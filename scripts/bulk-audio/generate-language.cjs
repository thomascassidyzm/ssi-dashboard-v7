#!/usr/bin/env node

/**
 * Generate All Encouragements for a Single Language
 *
 * Usage: node generate-language.cjs <lang_code>
 * Example: node generate-language.cjs fin
 *
 * Generates all encouragements for every voice configured for that language.
 * Output: generated/encouragements/{lang}/{voice_index}_{voice_name}/{uuid}.mp3
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const DATA_DIR = path.join(__dirname, 'data');
const OUT_BASE = path.join(__dirname, 'generated/encouragements');

const LANG_CODE_MAP = {
  afr: 'af', ara: 'ar', asm: 'as', aze: 'az', bel: 'be', ben: 'bn',
  bos: 'bs', bul: 'bg', cat: 'ca', ceb: 'ceb', ces: 'cs', cmn: 'zh',
  cym: 'cy', dan: 'da', deu: 'de', ell: 'el', est: 'et',
  fas: 'fa', fil: 'fil', fin: 'fi', fra: 'fr', gle: 'ga', glg: 'gl',
  guj: 'gu', hau: 'ha', heb: 'he', hin: 'hi', hrv: 'hr', hun: 'hu',
  hye: 'hy', ind: 'id', isl: 'is', ita: 'it', jav: 'jv', jpn: 'ja',
  kan: 'kn', kat: 'ka', kaz: 'kk', kir: 'ky', kor: 'ko', lav: 'lv',
  lin: 'ln', lit: 'lt', ltz: 'lb', mal: 'ml', mar: 'mr', mkd: 'mk',
  msa: 'ms', nep: 'ne', nld: 'nl', nor: 'nb', nya: 'ny', pan: 'pa',
  pol: 'pl', por: 'pt', pus: 'ps', ron: 'ro', rus: 'ru', slk: 'sk',
  slv: 'sl', snd: 'sd', som: 'so', spa: 'es', srp: 'sr', swa: 'sw',
  swe: 'sv', tam: 'ta', tel: 'te', tha: 'th', tur: 'tr', ukr: 'uk',
  urd: 'ur', vie: 'vi'
};

async function generateSample(voiceId, text, langCode) {
  const fetch = (await import('node-fetch')).default;

  const body = {
    text,
    model_id: 'eleven_v3',
    voice_settings: {
      voice_stability: 0.4
    }
  };

  if (langCode) {
    body.language_code = langCode;
  }

  // Retry transient network errors (ETIMEDOUT/ENOTFOUND/ECONNRESET) + 429/5xx with backoff.
  // Without this a single network blip kills the whole run (no manifest written).
  const MAX = 5;
  let lastErr = '';
  for (let attempt = 1; attempt <= MAX; attempt++) {
    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY
        },
        body: JSON.stringify(body)
      });
      if (response.ok) return { success: true, buffer: await response.buffer() };
      const errorText = await response.text();
      // Retry rate-limits / server errors; give up on 4xx client errors (bad voice etc.)
      if (response.status === 429 || response.status >= 500) { lastErr = `${response.status}: ${errorText.slice(0,80)}`; }
      else return { success: false, error: errorText, status: response.status };
    } catch (e) {
      lastErr = e.message; // network throw (ETIMEDOUT / ENOTFOUND / ECONNRESET)
    }
    if (attempt < MAX) await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt - 1))); // 1,2,4,8s
  }
  return { success: false, error: `retries exhausted: ${lastErr}`, status: 0 };
}

async function main() {
  const lang = process.argv[2];
  if (!lang) {
    console.error('Usage: node generate-language.cjs <lang_code>');
    console.error('Example: node generate-language.cjs fin');
    process.exit(1);
  }

  if (!ELEVENLABS_API_KEY) {
    console.error('Missing ELEVENLABS_API_KEY in .env');
    process.exit(1);
  }

  const voices = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'voices.json'), 'utf8'));
  let config = voices.voices[lang];
  if (!config) {
    console.error(`Language not found in voices.json: ${lang}`);
    process.exit(1);
  }
  // Generate ONLY the selected voice (voice-selections.json) — saves ElevenLabs credits
  // and ensures the voice that lands in shared_audio (upsert on text/lang/type) is the
  // chosen one, not an arbitrary last-processed voice.
  try {
    const selections = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'voice-selections.json'), 'utf8'));
    const sel = selections[lang];
    if (sel && typeof sel.index === 'number' && config.voices[sel.index]) {
      config = { ...config, voices: [config.voices[sel.index]] };
      console.log(`Voice-selection: generating only "${config.voices[0].name}" (index ${sel.index})`);
    }
  } catch (e) { /* no selections file — fall back to all voices */ }

  const transPath = path.join(DATA_DIR, 'translations/encouragements', `${lang}.json`);
  if (!fs.existsSync(transPath)) {
    console.error(`No translation file found: ${transPath}`);
    process.exit(1);
  }

  const translations = JSON.parse(fs.readFileSync(transPath, 'utf8'));
  const allEncouragements = [
    ...(translations.pooledEncouragements || []).map(e => ({ ...e, type: 'pooled' })),
    ...(translations.orderedEncouragements || []).map(e => ({ ...e, type: 'ordered' }))
  ];

  const elCode = LANG_CODE_MAP[lang] || null;
  const totalSamples = allEncouragements.length * config.voices.length;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Generate Encouragements: ${config.display_name} (${lang})`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Voices: ${config.voices.map(v => v.name).join(', ')}`);
  console.log(`Encouragements: ${allEncouragements.length} (${(translations.pooledEncouragements||[]).length} pooled + ${(translations.orderedEncouragements||[]).length} ordered)`);
  console.log(`Total samples: ${totalSamples}`);
  console.log(`Language code: ${elCode || 'none'}`);
  console.log(`Stability: 0.4 | Model: eleven_v3\n`);

  let completed = 0;
  let success = 0;
  const failures = [];
  const manifest = { language: lang, voices: {} };

  for (let vi = 0; vi < config.voices.length; vi++) {
    const voice = config.voices[vi];
    const safeName = voice.name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 25);
    const voiceDir = path.join(OUT_BASE, lang, `v${vi + 1}_${safeName}`);
    fs.mkdirSync(voiceDir, { recursive: true });

    const voiceManifest = { voice_id: voice.voice_id, name: voice.name, gender: voice.gender, samples: [] };

    console.log(`\n--- Voice ${vi + 1}: ${voice.name} (${voice.gender}) ---\n`);

    for (const enc of allEncouragements) {
      completed++;
      const uuid = uuidv4();
      const prefix = `[${completed}/${totalSamples}]`;
      const shortText = enc.text.substring(0, 50);

      process.stdout.write(`${prefix} ${shortText}... `);

      const result = await generateSample(voice.voice_id, enc.text, elCode);

      if (result.success) {
        const filename = `${uuid}.mp3`;
        fs.writeFileSync(path.join(voiceDir, filename), result.buffer);

        const kb = (result.buffer.length / 1024).toFixed(1);
        console.log(`OK (${kb}kb)`);
        success++;

        voiceManifest.samples.push({
          uuid,
          canonical_id: enc.id,
          type: enc.type,
          position: enc.position || null,
          text: enc.text,
          file: filename,
          size_kb: parseFloat(kb)
        });
      } else {
        const errShort = (result.error || '').substring(0, 60);
        console.log(`FAILED (${result.status}): ${errShort}`);
        failures.push({ voice: voice.name, text: shortText, error: result.error });
      }

      // Rate limit
      await new Promise(r => setTimeout(r, 500));
    }

    manifest.voices[`v${vi + 1}`] = voiceManifest;
  }

  // Save manifest
  const manifestPath = path.join(OUT_BASE, lang, '_manifest.json');
  manifest.generated_at = new Date().toISOString();
  manifest.total_samples = success;
  manifest.failures = failures.length;
  manifest.settings = { voice_stability: 0.4, model: 'eleven_v3', language_code: elCode };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Results: ${config.display_name} (${lang})`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Total:   ${totalSamples}`);
  console.log(`Success: ${success}`);
  console.log(`Failed:  ${failures.length}`);
  console.log(`Output:  ${path.join(OUT_BASE, lang)}`);
  console.log(`Manifest: ${manifestPath}`);

  if (failures.length > 0) {
    console.log(`\nFailures:`);
    for (const f of failures) {
      console.log(`  - ${f.voice}: "${f.text}..." — ${(f.error || '').substring(0, 80)}`);
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
