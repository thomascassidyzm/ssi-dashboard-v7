/**
 * ElevenLabs TTS Service
 *
 * Wraps ElevenLabs API for text-to-speech generation.
 * Used primarily for source and presentation roles (Aran clone, longer text).
 */

const fetch = require('node-fetch');
const fs = require('fs-extra');

// Configuration from environment
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Rate limiting (adjustable by tier)
let lastRequestTime = 0;
let requestDelay = 500; // Default: 500ms (2 requests/sec for Starter tier)

// Available models
const MODELS = {
  FLASH_V2_5: 'eleven_flash_v2_5',
  MULTILINGUAL_V2: 'eleven_multilingual_v2',
  TURBO_V2_5: 'eleven_turbo_v2_5',
  V3: 'eleven_v3'
};

/**
 * Set rate limit based on ElevenLabs tier
 *
 * @param {string} tier - Tier name: 'free', 'starter', 'creator', 'pro', 'scale', 'business'
 */
function setTier(tier) {
  const tierLimits = {
    'free': 1000,      // 1 req/sec
    'starter': 500,    // 2 req/sec
    'creator': 500,    // 2 req/sec
    'pro': 200,        // 5 req/sec
    'scale': 100,      // 10 req/sec
    'business': 67     // 15 req/sec
  };

  requestDelay = tierLimits[tier.toLowerCase()] || 500;
  console.log(`[ElevenLabs] Rate limit set to ${1000 / requestDelay} requests/sec (${tier} tier)`);
}

/**
 * Rate limit requests
 */
async function rateLimitRequest() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < requestDelay) {
    const delay = requestDelay - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  lastRequestTime = Date.now();
}

/**
 * Build language priming text (optional, for single words or ambiguous text)
 *
 * @param {string} text - Text to prime
 * @param {string} language - Language code (e.g., 'it', 'en')
 * @returns {string} Primed text or original text
 */
function buildPriming(text, language) {
  // Only prime single words or very short phrases
  const wordCount = text.trim().split(/\s+/).length;
  if (wordCount > 3) {
    return text; // Don't prime longer phrases
  }

  const primingMap = {
    'it': 'In italiano, si dice',
    'es': 'En español, se dice',
    'fr': 'En français, on dit',
    'de': 'Auf Deutsch sagt man',
    'pt': 'Em português, diz-se',
    'ga': 'As Gaeilge, deir muid',
    'cy': 'Yn Gymraeg, rydyn ni\'n dweud',
    'ja': '日本語では、こう言います',
    'ko': '한국어로 말하면',
    'zh': '用中文，我们说',
    'cmn': '用中文，我们说'
  };

  const priming = primingMap[language.toLowerCase()];
  if (!priming) {
    return text; // No priming for this language
  }

  return `${priming}: ${text}`;
}

/**
 * Generate audio using ElevenLabs API
 *
 * @param {string} text - Text to synthesize
 * @param {string} voiceId - ElevenLabs voice ID
 * @param {string} outputPath - Path to save MP3 file
 * @param {object} options - Generation options
 * @param {string} options.model - Model ID (default: FLASH_V2_5)
 * @param {number} options.stability - Stability (0-1, default: 0.5)
 * @param {number} options.similarityBoost - Similarity boost (0-1, default: 0.75)
 * @param {number} options.style - Style exaggeration (0-1, default: 0)
 * @param {boolean} options.useSpeakerBoost - Use speaker boost (default: true)
 * @param {string} options.language - Language code for optional priming
 * @param {boolean} options.enablePriming - Enable language priming (default: false)
 * @returns {Promise<boolean>} True if successful
 */
async function generateAudio(text, voiceId, outputPath, options = {}) {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ElevenLabs API key not found. Set ELEVENLABS_API_KEY in .env');
  }

  const {
    model = MODELS.FLASH_V2_5,
    stability = 0.5,
    similarityBoost = 0.75,
    style = 0,
    useSpeakerBoost = true,
    language = null,
    enablePriming = false
  } = options;

  await rateLimitRequest();

  // Apply priming if enabled and language provided
  const finalText = (enablePriming && language) ? buildPriming(text, language) : text;

  const url = `${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`;

  const body = {
    text: finalText,
    model_id: model,
    voice_settings: {
      stability,
      similarity_boost: similarityBoost,
      style,
      use_speaker_boost: useSpeakerBoost
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error (${response.status}): ${errorText}`);
    }

    // Get audio buffer
    const audioBuffer = await response.buffer();

    // Save to file
    await fs.ensureDir(require('path').dirname(outputPath));
    await fs.writeFile(outputPath, audioBuffer);

    return true;
  } catch (error) {
    throw new Error(`Failed to generate audio: ${error.message}`);
  }
}

/**
 * Generate audio with retry logic
 *
 * @param {string} text - Text to synthesize
 * @param {string} voiceId - ElevenLabs voice ID
 * @param {string} outputPath - Path to save MP3 file
 * @param {object} options - Generation options
 * @param {number} maxRetries - Maximum retry attempts (default: 3)
 * @returns {Promise<boolean>} True if successful
 */
async function generateAudioWithRetry(text, voiceId, outputPath, options = {}, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await generateAudio(text, voiceId, outputPath, options);
      return true;
    } catch (error) {
      console.error(`[ElevenLabs] Attempt ${attempt}/${maxRetries} failed for "${text.substring(0, 50)}...": ${error.message}`);

      if (attempt === maxRetries) {
        throw error;
      }

      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * Get available voices from ElevenLabs
 *
 * @returns {Promise<Array>} Array of voice objects
 */
async function listVoices() {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ElevenLabs API key not found');
  }

  const url = `${ELEVENLABS_API_URL}/voices`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch voices: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  return data.voices.map(v => ({
    voiceId: v.voice_id,
    name: v.name,
    category: v.category,
    labels: v.labels
  }));
}

/**
 * Get voice details
 *
 * @param {string} voiceId - ElevenLabs voice ID
 * @returns {Promise<object>} Voice details
 */
async function getVoiceDetails(voiceId) {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ElevenLabs API key not found');
  }

  const url = `${ELEVENLABS_API_URL}/voices/${voiceId}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch voice details: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Test a voice with sample text
 *
 * @param {string} voiceId - ElevenLabs voice ID
 * @param {string} text - Test text (default: "Hello, this is a test")
 * @param {object} options - Generation options
 * @returns {Promise<string>} Path to generated test file
 */
async function testVoice(voiceId, text = "Hello, this is a test.", options = {}) {
  const path = require('path');
  const os = require('os');

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'elevenlabs-voice-test-'));
  const tempFile = path.join(tempDir, 'test.mp3');

  await generateAudioWithRetry(text, voiceId, tempFile, options);

  return tempFile;
}

/**
 * Get user info (quota, character usage)
 *
 * @returns {Promise<object>} User info
 */
async function getUserInfo() {
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ElevenLabs API key not found');
  }

  const url = `${ELEVENLABS_API_URL}/user`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch user info: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  return {
    tier: data.subscription?.tier || 'free',
    characterCount: data.subscription?.character_count || 0,
    characterLimit: data.subscription?.character_limit || 0,
    canExtendCharacterLimit: data.subscription?.can_extend_character_limit || false
  };
}

module.exports = {
  generateAudio,
  generateAudioWithRetry,
  listVoices,
  getVoiceDetails,
  testVoice,
  getUserInfo,
  setTier,
  buildPriming,
  MODELS
};
