/**
 * Voice Discovery Service
 *
 * Discovers and evaluates available voices for new languages.
 * Integrates with Azure Speech API to get voice lists.
 * Auto-selects best voices based on quality criteria.
 */

const fetch = require('node-fetch');
const fs = require('fs-extra');
const path = require('path');
const azureTTS = require('./azure-tts-service.cjs');

/**
 * Language code mappings (ISO 639-1 to Azure locale prefixes)
 */
const LANGUAGE_CODES = {
  'deu': 'de',  // German
  'fra': 'fr',  // French
  'ita': 'it',  // Italian
  'spa': 'es',  // Spanish
  'cmn': 'zh',  // Mandarin Chinese
  'eng': 'en',  // English
  'por': 'pt',  // Portuguese
  'rus': 'ru',  // Russian
  'jpn': 'ja',  // Japanese
  'kor': 'ko',  // Korean
  'ara': 'ar',  // Arabic
  'hin': 'hi',  // Hindi
  'nld': 'nl',  // Dutch
  'pol': 'pl',  // Polish
  'tur': 'tr',  // Turkish
  'swe': 'sv',  // Swedish
  'dan': 'da',  // Danish
  'nor': 'no',  // Norwegian
  'fin': 'fi',  // Finnish
  'ell': 'el',  // Greek
  'tha': 'th',  // Thai
  'vie': 'vi',  // Vietnamese
  'ind': 'id',  // Indonesian
  'msa': 'ms',  // Malay
  'ces': 'cs',  // Czech
  'ron': 'ro',  // Romanian
  'hun': 'hu',  // Hungarian
  'ukr': 'uk',  // Ukrainian
  'heb': 'he',  // Hebrew
  'cat': 'ca'   // Catalan
};

/**
 * Sample sentences for voice testing
 */
const SAMPLE_SENTENCES = {
  'de': [
    'Guten Tag, wie geht es Ihnen?',
    'Ich möchte Deutsch lernen.',
    'Das ist sehr interessant.',
    'Können Sie das wiederholen?',
    'Vielen Dank für Ihre Hilfe.'
  ],
  'fr': [
    'Bonjour, comment allez-vous?',
    'Je veux apprendre le français.',
    'C\'est très intéressant.',
    'Pouvez-vous répéter?',
    'Merci beaucoup pour votre aide.'
  ],
  'es': [
    'Hola, ¿cómo estás?',
    'Quiero aprender español.',
    'Esto es muy interesante.',
    '¿Puedes repetir eso?',
    'Muchas gracias por tu ayuda.'
  ],
  'it': [
    'Ciao, come stai?',
    'Voglio imparare l\'italiano.',
    'Questo è molto interessante.',
    'Puoi ripetere?',
    'Grazie mille per il tuo aiuto.'
  ],
  'pt': [
    'Olá, como você está?',
    'Eu quero aprender português.',
    'Isso é muito interessante.',
    'Você pode repetir?',
    'Muito obrigado pela sua ajuda.'
  ],
  'zh': [
    '你好，你好吗？',
    '我想学习中文。',
    '这很有趣。',
    '你能重复一遍吗？',
    '非常感谢你的帮助。'
  ],
  'ja': [
    'こんにちは、お元気ですか？',
    '日本語を学びたいです。',
    'これはとても面白いです。',
    'もう一度言ってください。',
    'ご協力ありがとうございます。'
  ],
  'en': [
    'Hello, how are you?',
    'I want to learn English.',
    'This is very interesting.',
    'Can you repeat that?',
    'Thank you very much for your help.'
  ]
};

/**
 * Discover available Azure voices for a language
 *
 * @param {string} languageCode - ISO 639-3 language code (e.g., 'deu', 'fra')
 * @returns {Promise<Array>} Array of voice objects
 */
async function discoverAzureVoices(languageCode) {
  const azureRegion = process.env.AZURE_SPEECH_REGION || 'westeurope';
  const azureKey = process.env.AZURE_SPEECH_KEY;

  if (!azureKey) {
    throw new Error('AZURE_SPEECH_KEY environment variable not set');
  }

  // Convert to Azure locale prefix
  const localePrefix = LANGUAGE_CODES[languageCode] || languageCode.substring(0, 2);

  console.log(`Fetching Azure voices for ${languageCode} (${localePrefix})...`);

  try {
    const response = await fetch(
      `https://${azureRegion}.tts.speech.microsoft.com/cognitiveservices/voices/list`,
      {
        headers: {
          'Ocp-Apim-Subscription-Key': azureKey
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Azure API error: ${response.status} ${response.statusText}`);
    }

    const allVoices = await response.json();

    // Filter by language
    const languageVoices = allVoices.filter(v =>
      v.Locale && v.Locale.toLowerCase().startsWith(localePrefix.toLowerCase())
    );

    console.log(`Found ${languageVoices.length} voices for ${localePrefix}`);

    // Transform to our format
    return languageVoices.map(v => ({
      id: v.ShortName,
      name: v.LocalName || v.DisplayName,
      displayName: v.DisplayName,
      gender: v.Gender,
      locale: v.Locale,
      localeName: v.LocaleName,
      voiceType: v.VoiceType,
      styles: v.StyleList || [],
      secondaryLocales: v.SecondaryLocaleList || [],
      provider: 'azure',
      quality: calculateVoiceQuality(v)
    }));
  } catch (error) {
    console.error(`Failed to discover Azure voices: ${error.message}`);
    throw error;
  }
}

/**
 * Calculate voice priority score for sorting/filtering
 *
 * This is NOT a quality score - we can't judge if a voice sounds natural.
 * It's simply a ranking to help prioritize voice options:
 * - Neural voices first (objectively higher quality technology)
 * - Then by feature count (styles, multilingual support)
 *
 * Users should ALWAYS listen to sample clips to judge actual quality.
 *
 * @param {Object} azureVoice - Azure voice API response object
 * @returns {number} Priority score for sorting (not quality)
 */
function calculateVoiceQuality(azureVoice) {
  let score = 0;

  // Neural voices use better technology (objective)
  if (azureVoice.VoiceType === 'Neural') {
    score += 100;
  }

  // Additional features (may be useful)
  const styleCount = azureVoice.StyleList?.length || 0;
  score += styleCount; // 1 point per style

  const secondaryLocales = azureVoice.SecondaryLocaleList?.length || 0;
  score += secondaryLocales; // 1 point per secondary locale

  return score;
}

/**
 * Select recommended voices based on objective criteria
 *
 * Selection algorithm:
 * 1. Filter to Neural voices only (objectively better technology)
 * 2. Try to get gender diversity (1 male, 1 female)
 * 3. Sort by priority score (Neural first, then features)
 * 4. Return top N voices
 *
 * NOTE: This does NOT judge voice quality/naturalness - users should
 * ALWAYS generate sample clips and listen before committing.
 *
 * @param {Array} voices - Array of voice objects
 * @param {number} count - Number of voices to select (default: 2)
 * @returns {Array} Selected voices
 */
function selectBestVoices(voices, count = 2) {
  if (voices.length === 0) {
    throw new Error('No voices available for selection');
  }

  // Filter to Neural voices (objectively better technology)
  const neural = voices.filter(v => v.voiceType === 'Neural');

  if (neural.length === 0) {
    console.warn('No Neural voices found, using all voices');
    return voices.slice(0, count);
  }

  // Sort by priority score
  const sorted = neural.sort((a, b) => b.quality - a.quality);

  const selected = [];

  // Try to get one of each gender for variety
  const female = sorted.find(v => v.gender === 'Female');
  const male = sorted.find(v => v.gender === 'Male');

  if (female) selected.push(female);
  if (male && selected.length < count) selected.push(male);

  // Fill remaining slots with highest priority
  for (const voice of sorted) {
    if (selected.length >= count) break;
    if (!selected.includes(voice)) {
      selected.push(voice);
    }
  }

  return selected.slice(0, count);
}

/**
 * Get recommendation reason for display
 *
 * @param {Object} voice - Voice object
 * @param {number} index - Index in selection (0 = first choice)
 * @returns {string} Reason string
 */
function getRecommendationReason(voice, index) {
  const reasons = [];

  if (voice.voiceType === 'Neural') {
    reasons.push('Neural voice (better technology)');
  }

  if (voice.gender === 'Female') {
    reasons.push('Female voice');
  }

  if (voice.gender === 'Male') {
    reasons.push('Male voice');
  }

  if (index === 0) {
    reasons.push('gender diversity');
  }

  if (voice.styles?.length > 0) {
    reasons.push(`${voice.styles.length} style options`);
  }

  if (voice.secondaryLocales?.length > 0) {
    reasons.push('multilingual support');
  }

  return reasons.join(', ');
}

/**
 * Get sample sentences for a language
 *
 * @param {string} languageCode - ISO 639-3 code or Azure locale prefix
 * @param {number} count - Number of samples to return
 * @returns {Array} Sample sentences
 */
function getSampleSentences(languageCode, count = 5) {
  const localePrefix = LANGUAGE_CODES[languageCode] || languageCode.substring(0, 2);
  const samples = SAMPLE_SENTENCES[localePrefix] || SAMPLE_SENTENCES['en'];
  return samples.slice(0, count);
}

/**
 * Generate sample audio clips for voice evaluation
 *
 * @param {string} voiceId - Azure voice ID (e.g., 'de-DE-KatjaNeural')
 * @param {string} language - Language code
 * @param {Array} sampleTexts - Array of text to generate
 * @returns {Promise<Array>} Array of {text, path, url} objects
 */
async function generateVoiceSamples(voiceId, language, sampleTexts) {
  const SAMPLE_DIR = path.join(__dirname, '../temp/voice_samples');
  await fs.ensureDir(SAMPLE_DIR);

  console.log(`Generating ${sampleTexts.length} sample clips for ${voiceId}...`);

  const samples = [];

  for (let i = 0; i < sampleTexts.length; i++) {
    const sanitizedVoiceId = voiceId.replace(/[^a-zA-Z0-9-]/g, '_');
    const outputPath = path.join(SAMPLE_DIR, `${sanitizedVoiceId}_sample${i + 1}.mp3`);

    try {
      await azureTTS.generateAudioWithRetry(
        sampleTexts[i],
        voiceId,
        outputPath,
        1.0 // Natural speed
      );

      samples.push({
        text: sampleTexts[i],
        path: outputPath,
        url: `file://${outputPath}`
      });

      console.log(`  ✓ Sample ${i + 1}/${sampleTexts.length}`);
    } catch (error) {
      console.error(`  ✗ Failed to generate sample ${i + 1}: ${error.message}`);
    }
  }

  return samples;
}

/**
 * Create voice registry entry for a discovered voice
 *
 * @param {Object} voice - Voice object from discovery
 * @param {string} languageCode - ISO 639-3 language code
 * @returns {Object} Voice registry entry
 */
function createVoiceEntry(voice, languageCode) {
  return {
    provider: 'azure',
    provider_id: voice.id,
    language: languageCode,
    display_name: voice.displayName || voice.name,
    gender: voice.gender.toLowerCase(),
    locale: voice.locale,
    voice_type: voice.voiceType,
    typical_roles: [], // Will be set during assignment
    sample_count: 0,
    created_at: new Date().toISOString(),
    notes: `Auto-discovered ${voice.voiceType} voice, quality score: ${voice.quality}`,
    processing: {
      cadences: {
        slow: {
          azure_speed: 0.7,
          time_stretch: 1.0,
          normalize: true,
          target_lufs: -16.0
        },
        natural: {
          azure_speed: 1.0,
          time_stretch: 1.0,
          normalize: true,
          target_lufs: -16.0
        }
      }
    }
  };
}

module.exports = {
  discoverAzureVoices,
  selectBestVoices,
  getRecommendationReason,
  getSampleSentences,
  generateVoiceSamples,
  createVoiceEntry,
  calculateVoiceQuality,
  LANGUAGE_CODES
};
