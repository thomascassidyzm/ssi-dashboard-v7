/**
 * Google Cloud TTS Service (Chirp 3 HD)
 *
 * Drop-in replacement for Azure TTS Service.
 * Uses Chirp 3 HD voices for high-quality multilingual speech synthesis.
 *
 * Features:
 * - 30 HD voices with emotional resonance
 * - 50+ languages supported
 * - Pace control (0.25x - 2x) for cadence handling
 * - No per-process limits (unlike Azure SDK)
 * - 1M free characters/month
 *
 * Setup:
 * 1. Enable Text-to-Speech API in Google Cloud Console
 * 2. Create service account with Text-to-Speech User role
 * 3. Download JSON key and set GOOGLE_APPLICATION_CREDENTIALS env var
 *    OR set GOOGLE_TTS_API_KEY for API key authentication
 */

const fs = require('fs-extra');
const path = require('path');

// Configuration from environment
const GOOGLE_TTS_API_KEY = process.env.GOOGLE_TTS_API_KEY;
const GOOGLE_PROJECT_ID = process.env.GOOGLE_PROJECT_ID;

// API endpoint
const TTS_API_URL = 'https://texttospeech.googleapis.com/v1';

// Rate limiting (Google allows 1000 req/min = ~16.6 req/s, use 80%)
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 75; // 75ms between requests = ~13 req/s

// Chirp 3 HD Voice mappings
// Format: {language_code}-Chirp3-HD-{voice_name}
const CHIRP3_VOICES = {
  // Voice characteristics (from Google docs)
  'Achernar': { gender: 'female', style: 'warm' },
  'Achird': { gender: 'male', style: 'calm' },
  'Alasia': { gender: 'female', style: 'bright' },
  'Algieba': { gender: 'male', style: 'deep' },
  'Almach': { gender: 'female', style: 'gentle' },
  'Aoede': { gender: 'female', style: 'expressive' },
  'Autonoe': { gender: 'female', style: 'clear' },
  'Callirrhoe': { gender: 'female', style: 'melodic' },
  'Charon': { gender: 'male', style: 'authoritative' },
  'Despina': { gender: 'female', style: 'friendly' },
  'Enceladus': { gender: 'male', style: 'energetic' },
  'Erinome': { gender: 'female', style: 'soothing' },
  'Fenrir': { gender: 'male', style: 'bold' },
  'Gacrux': { gender: 'male', style: 'mature' },
  'Isonoe': { gender: 'female', style: 'youthful' },
  'Kore': { gender: 'female', style: 'natural' },
  'Leda': { gender: 'female', style: 'elegant' },
  'Orus': { gender: 'male', style: 'warm' },
  'Puck': { gender: 'male', style: 'playful' },
  'Pulcherrima': { gender: 'female', style: 'refined' },
  'Rasalgethi': { gender: 'male', style: 'steady' },
  'Sadachbia': { gender: 'male', style: 'clear' },
  'Sadaltager': { gender: 'male', style: 'resonant' },
  'Schedar': { gender: 'female', style: 'confident' },
  'Sulafat': { gender: 'male', style: 'smooth' },
  'Umbriel': { gender: 'male', style: 'thoughtful' },
  'Vindemiatrix': { gender: 'female', style: 'articulate' },
  'Zephyr': { gender: 'male', style: 'light' },
  'Zubenelgenubi': { gender: 'male', style: 'grounded' }
};

// Language code mappings (SSi 3-letter to Google BCP-47)
const LANGUAGE_MAP = {
  'eng': 'en-US',
  'ita': 'it-IT',
  'spa': 'es-ES',
  'fra': 'fr-FR',
  'deu': 'de-DE',
  'por': 'pt-PT',
  'cmn': 'cmn-CN',
  'jpn': 'ja-JP',
  'kor': 'ko-KR',
  'ara': 'ar-XA',
  'rus': 'ru-RU',
  'nld': 'nl-NL',
  'swe': 'sv-SE',
  'fin': 'fi-FI',
  'gle': 'ga-IE',  // Irish
  'cym': 'cy-GB',  // Welsh
  'hin': 'hi-IN',
  'ben': 'bn-IN',
  'tur': 'tr-TR',
  'pol': 'pl-PL',
  'ukr': 'uk-UA',
  'vie': 'vi-VN',
  'tha': 'th-TH',
  'ind': 'id-ID',
  'msa': 'ms-MY',
  'fil': 'fil-PH',
  'heb': 'he-IL',
  'ell': 'el-GR',
  'ces': 'cs-CZ',
  'ron': 'ro-RO',
  'hun': 'hu-HU',
  'dan': 'da-DK',
  'nor': 'nb-NO',
  'cat': 'ca-ES'
};

/**
 * Rate limit requests
 */
async function rateLimitRequest() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const delay = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  lastRequestTime = Date.now();
}

/**
 * Get Google BCP-47 language code from SSi language code
 * @param {string} ssiLangCode - SSi 3-letter code (e.g., 'ita')
 * @returns {string} Google BCP-47 code (e.g., 'it-IT')
 */
function getGoogleLanguageCode(ssiLangCode) {
  return LANGUAGE_MAP[ssiLangCode?.toLowerCase()] || ssiLangCode;
}

/**
 * Build full Chirp 3 HD voice name
 * @param {string} languageCode - Google BCP-47 language code
 * @param {string} voiceName - Voice name (e.g., 'Kore', 'Charon')
 * @returns {string} Full voice name (e.g., 'en-US-Chirp3-HD-Kore')
 */
function buildVoiceName(languageCode, voiceName) {
  return `${languageCode}-Chirp3-HD-${voiceName}`;
}

/**
 * Parse voice ID from SSi format
 * Expected format: google_<language>_<voicename> (e.g., google_it-IT_Kore)
 * @param {string} voiceId - SSi voice ID
 * @returns {Object} { languageCode, voiceName, fullName }
 */
function parseVoiceId(voiceId) {
  const parts = voiceId.split('_');

  if (parts.length < 3 || parts[0] !== 'google') {
    throw new Error(`Invalid Google voice ID format: ${voiceId}. Expected: google_<lang>_<voice>`);
  }

  const languageCode = parts[1];
  const voiceName = parts.slice(2).join('_'); // Handle voice names with underscores

  return {
    languageCode,
    voiceName,
    fullName: buildVoiceName(languageCode, voiceName)
  };
}

/**
 * Get authentication headers
 * Supports both API key and service account authentication
 */
async function getAuthHeaders() {
  if (GOOGLE_TTS_API_KEY) {
    return {}; // API key is passed as query param
  }

  // Use Application Default Credentials (service account)
  try {
    const { GoogleAuth } = require('google-auth-library');
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    return {
      'Authorization': `Bearer ${accessToken.token}`
    };
  } catch (error) {
    throw new Error(
      `Google Cloud authentication failed: ${error.message}\n` +
      `Set GOOGLE_TTS_API_KEY or GOOGLE_APPLICATION_CREDENTIALS environment variable.`
    );
  }
}

/**
 * Build API URL with optional API key
 */
function buildApiUrl(endpoint) {
  let url = `${TTS_API_URL}${endpoint}`;

  if (GOOGLE_TTS_API_KEY) {
    url += `?key=${GOOGLE_TTS_API_KEY}`;
  }

  return url;
}

/**
 * Convert speed multiplier to Google pace format
 * Google uses speaking rate where 1.0 = normal, 0.5 = half speed, 2.0 = double
 * @param {number} speed - Speed multiplier (0.25 - 2.0)
 * @returns {number} Google speaking rate
 */
function convertSpeedToRate(speed = 1.0) {
  // Clamp to valid range
  return Math.max(0.25, Math.min(2.0, speed));
}

/**
 * Generate speech using Google Cloud TTS (Chirp 3 HD)
 * Returns audio buffer (compatible with Azure service interface)
 *
 * @param {string} text - Text to synthesize
 * @param {string} voiceName - Voice name (e.g., 'Kore') or full SSi ID (e.g., 'google_it-IT_Kore')
 * @param {string} language - Language code (SSi 3-letter or Google BCP-47)
 * @param {object} options - Generation options
 * @param {number} options.rate - Speaking rate/speed (0.25 - 2.0, default: 1.0)
 * @param {string} options.audioEncoding - Output format (MP3, LINEAR16, OGG_OPUS)
 * @returns {Promise<Buffer>} Audio buffer
 */
async function generateSpeech(text, voiceName, language, options = {}) {
  const { rate = 1.0, audioEncoding = 'MP3' } = options;

  await rateLimitRequest();

  // Determine language code
  let languageCode = getGoogleLanguageCode(language);
  let voice = voiceName;

  // Check if voiceName is a full SSi voice ID
  if (voiceName.startsWith('google_')) {
    const parsed = parseVoiceId(voiceName);
    languageCode = parsed.languageCode;
    voice = parsed.voiceName;
  }

  // Build full voice name for Chirp 3 HD
  const fullVoiceName = buildVoiceName(languageCode, voice);

  const requestBody = {
    input: { text },
    voice: {
      languageCode,
      name: fullVoiceName
    },
    audioConfig: {
      audioEncoding,
      speakingRate: convertSpeedToRate(rate),
      // Chirp 3 HD specific settings
      effectsProfileId: ['headphone-class-device'] // Optimize for headphones
    }
  };

  try {
    const authHeaders = await getAuthHeaders();
    const fetch = require('node-fetch');

    const response = await fetch(buildApiUrl('/text:synthesize'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Google TTS API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();

    if (!data.audioContent) {
      throw new Error('No audio content in Google TTS response');
    }

    // audioContent is base64 encoded
    return Buffer.from(data.audioContent, 'base64');

  } catch (error) {
    if (error.message.includes('API error')) {
      throw error;
    }
    throw new Error(`Google TTS request failed: ${error.message}`);
  }
}

/**
 * Generate audio and save to file
 * (Compatible with Azure service interface)
 *
 * @param {string} text - Text to synthesize
 * @param {string} voiceName - Voice name or full SSi ID
 * @param {string} outputPath - Path to save MP3 file
 * @param {number} speed - Speed multiplier (default: 1.0)
 * @returns {Promise<boolean>} True if successful
 */
async function generateAudio(text, voiceName, outputPath, speed = 1.0) {
  // Extract language from voice ID or use default
  let language = 'en-US';

  if (voiceName.startsWith('google_')) {
    const parsed = parseVoiceId(voiceName);
    language = parsed.languageCode;
  }

  const audioBuffer = await generateSpeech(text, voiceName, language, { rate: speed });
  await fs.writeFile(outputPath, audioBuffer);

  return true;
}

/**
 * Generate audio with retry logic
 * (Compatible with Azure service interface)
 *
 * @param {string} text - Text to synthesize
 * @param {string} voiceName - Voice name or full SSi ID
 * @param {string} outputPath - Path to save MP3 file
 * @param {number} speed - Speed multiplier
 * @param {number} maxRetries - Maximum retry attempts (default: 3)
 * @returns {Promise<boolean>} True if successful
 */
async function generateAudioWithRetry(text, voiceName, outputPath, speed = 1.0, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await generateAudio(text, voiceName, outputPath, speed);
      return true;
    } catch (error) {
      console.error(`[Google TTS] Attempt ${attempt}/${maxRetries} failed for "${text.substring(0, 50)}...": ${error.message}`);

      if (attempt === maxRetries) {
        throw error;
      }

      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * List available Chirp 3 HD voices for a language
 *
 * @param {string} languageCode - Language code (SSi 3-letter or Google BCP-47)
 * @returns {Promise<Array>} Array of voice objects
 */
async function listVoices(languageCode = null) {
  await rateLimitRequest();

  try {
    const authHeaders = await getAuthHeaders();
    const fetch = require('node-fetch');

    let url = buildApiUrl('/voices');
    if (languageCode) {
      const googleLang = getGoogleLanguageCode(languageCode);
      url += (url.includes('?') ? '&' : '?') + `languageCode=${googleLang}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: authHeaders
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Google TTS API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();
    const voices = data.voices || [];

    // Filter for Chirp 3 HD voices only
    const chirp3Voices = voices.filter(v => v.name && v.name.includes('Chirp3-HD'));

    return chirp3Voices.map(v => {
      // Extract voice name from full name (e.g., "en-US-Chirp3-HD-Kore" -> "Kore")
      const nameParts = v.name.split('-');
      const shortName = nameParts[nameParts.length - 1];
      const voiceInfo = CHIRP3_VOICES[shortName] || { gender: 'unknown', style: 'neutral' };

      return {
        name: v.name,
        shortName,
        displayName: `${shortName} (${voiceInfo.style})`,
        locale: v.languageCodes?.[0] || 'unknown',
        gender: voiceInfo.gender,
        style: voiceInfo.style,
        // SSi voice ID format
        ssiVoiceId: `google_${v.languageCodes?.[0]}_${shortName}`
      };
    });

  } catch (error) {
    throw new Error(`Failed to list Google TTS voices: ${error.message}`);
  }
}

/**
 * Test a voice with sample text
 *
 * @param {string} voiceName - Voice name or full SSi ID
 * @param {string} text - Test text (default: "Hello, this is a test")
 * @param {number} speed - Speed multiplier
 * @returns {Promise<string>} Path to generated test file
 */
async function testVoice(voiceName, text = "Hello, this is a test.", speed = 1.0) {
  const tempDir = await fs.mkdtemp(path.join(require('os').tmpdir(), 'google-voice-test-'));
  const tempFile = path.join(tempDir, 'test.mp3');

  await generateAudioWithRetry(text, voiceName, tempFile, speed);

  return tempFile;
}

/**
 * Get recommended voices for a language
 * Returns voices sorted by quality/suitability for language learning
 *
 * @param {string} languageCode - Language code
 * @param {number} count - Number of recommendations (default: 4)
 * @returns {Promise<Array>} Recommended voices
 */
async function getRecommendedVoices(languageCode, count = 4) {
  const voices = await listVoices(languageCode);

  if (voices.length === 0) {
    console.warn(`No Chirp 3 HD voices found for ${languageCode}`);
    return [];
  }

  // Prioritize voices with clear, natural styles for language learning
  const priorityStyles = ['natural', 'clear', 'warm', 'friendly', 'gentle'];

  const scored = voices.map(v => {
    let score = 0;
    const styleIndex = priorityStyles.indexOf(v.style);
    if (styleIndex !== -1) {
      score = priorityStyles.length - styleIndex;
    }
    return { ...v, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Get mix of genders
  const males = scored.filter(v => v.gender === 'male');
  const females = scored.filter(v => v.gender === 'female');

  const recommendations = [];
  const halfCount = Math.floor(count / 2);

  // Alternate genders
  for (let i = 0; i < halfCount && i < females.length; i++) {
    recommendations.push(females[i]);
  }
  for (let i = 0; i < halfCount && i < males.length; i++) {
    recommendations.push(males[i]);
  }

  // Fill remaining slots
  while (recommendations.length < count && recommendations.length < voices.length) {
    const next = scored.find(v => !recommendations.includes(v));
    if (next) recommendations.push(next);
    else break;
  }

  return recommendations;
}

/**
 * Discover and display available voices for a language
 * Helper for Claude Code voice selection workflow
 *
 * @param {string} languageCode - Language code
 */
async function discoverVoices(languageCode) {
  console.log(`\nDiscovering Google Chirp 3 HD voices for ${languageCode}...\n`);

  const googleLang = getGoogleLanguageCode(languageCode);
  const voices = await listVoices(languageCode);

  if (voices.length === 0) {
    console.log(`No Chirp 3 HD voices found for ${googleLang}`);
    console.log('Note: Chirp 3 HD supports 50+ languages. Check language code format.\n');
    return [];
  }

  console.log(`Found ${voices.length} Chirp 3 HD voices:\n`);
  console.log('-'.repeat(60));

  // Group by gender
  const males = voices.filter(v => v.gender === 'male');
  const females = voices.filter(v => v.gender === 'female');

  console.log('FEMALE VOICES:');
  females.forEach((v, i) => {
    console.log(`  ${i + 1}. ${v.shortName} - ${v.style} style`);
    console.log(`     SSi ID: ${v.ssiVoiceId}`);
  });

  console.log('\nMALE VOICES:');
  males.forEach((v, i) => {
    console.log(`  ${i + 1}. ${v.shortName} - ${v.style} style`);
    console.log(`     SSi ID: ${v.ssiVoiceId}`);
  });

  console.log('\n' + '-'.repeat(60));
  console.log('\nRECOMMENDED for language learning:');

  const recommended = await getRecommendedVoices(languageCode, 4);
  recommended.forEach((v, i) => {
    console.log(`  ${i + 1}. ${v.shortName} (${v.gender}, ${v.style})`);
  });

  console.log('\nTo test a voice:');
  console.log(`  const testFile = await googleTTS.testVoice('${recommended[0]?.ssiVoiceId}', 'Ciao, come stai?');`);
  console.log(`  // Play: afplay <testFile>\n`);

  return voices;
}

module.exports = {
  generateSpeech,
  generateAudio,
  generateAudioWithRetry,
  listVoices,
  testVoice,
  getRecommendedVoices,
  discoverVoices,
  getGoogleLanguageCode,
  parseVoiceId,
  buildVoiceName,
  CHIRP3_VOICES,
  LANGUAGE_MAP
};
