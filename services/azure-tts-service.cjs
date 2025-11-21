/**
 * Azure TTS Service
 *
 * Wraps Azure Speech Services for text-to-speech generation.
 * Used primarily for target1 and target2 roles (short phrases, consistent pronunciation).
 */

const fs = require('fs-extra');
const path = require('path');
const sdk = require('microsoft-cognitiveservices-speech-sdk');

// Configuration from environment
const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY;
const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION || 'westeurope';

// Rate limiting
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 5; // 5ms between requests = 200 req/s (Azure's 200 TPS limit, sequential processing)

// Synthesizer Connection Pool (reuse connections to avoid exhaustion)
// Microsoft recommends reusing synthesizers to avoid connection overhead
const synthesizerPool = {
  available: [],
  inUse: 0,
  MIN_POOL_SIZE: 2,   // Pre-warm minimum connections
  MAX_POOL_SIZE: 8,   // Maximum concurrent connections
  created: 0
};

/**
 * Create a new synthesizer instance
 * @returns {object} Azure SpeechSynthesizer instance
 */
function createSynthesizer() {
  const speechConfig = initSpeechConfig();
  const synthesizer = new sdk.SpeechSynthesizer(speechConfig, null);
  synthesizerPool.created++;
  return synthesizer;
}

/**
 * Get a synthesizer from the pool (or create new if pool empty)
 * @returns {object} Azure SpeechSynthesizer instance
 */
function borrowSynthesizer() {
  if (synthesizerPool.available.length > 0) {
    const synthesizer = synthesizerPool.available.pop();
    synthesizerPool.inUse++;
    return synthesizer;
  }

  // Create new if under max pool size
  if (synthesizerPool.created < synthesizerPool.MAX_POOL_SIZE) {
    synthesizerPool.inUse++;
    return createSynthesizer();
  }

  // Pool exhausted - return null (caller should retry)
  return null;
}

/**
 * Return a synthesizer to the pool for reuse
 * @param {object} synthesizer - Azure SpeechSynthesizer instance
 */
function returnSynthesizer(synthesizer) {
  synthesizerPool.inUse--;

  if (synthesizerPool.available.length < synthesizerPool.MAX_POOL_SIZE) {
    // Return to pool for reuse
    synthesizerPool.available.push(synthesizer);
  } else {
    // Pool full - close this instance
    synthesizer.close();
    synthesizerPool.created--;
  }
}

/**
 * Pre-warm the connection pool
 */
function prewarmPool() {
  if (synthesizerPool.available.length === 0 && synthesizerPool.created === 0) {
    console.log(`[Azure TTS] Pre-warming connection pool (${synthesizerPool.MIN_POOL_SIZE} connections)...`);
    for (let i = 0; i < synthesizerPool.MIN_POOL_SIZE; i++) {
      synthesizerPool.available.push(createSynthesizer());
    }
  }
}

/**
 * Clean up all pooled connections (call on shutdown)
 */
function closePool() {
  console.log(`[Azure TTS] Closing connection pool (${synthesizerPool.created} total connections)...`);
  for (const synthesizer of synthesizerPool.available) {
    synthesizer.close();
  }
  synthesizerPool.available = [];
  synthesizerPool.created = 0;
  synthesizerPool.inUse = 0;
}

// Pre-warm pool on module load
prewarmPool();

// Clean up pool on process exit
process.on('exit', closePool);
process.on('SIGINT', () => {
  closePool();
  process.exit(0);
});
process.on('SIGTERM', () => {
  closePool();
  process.exit(0);
});

/**
 * Initialize Azure Speech SDK config
 */
function initSpeechConfig() {
  if (!AZURE_SPEECH_KEY || !AZURE_SPEECH_REGION) {
    throw new Error('Azure Speech credentials not found. Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION in .env');
  }

  const speechConfig = sdk.SpeechConfig.fromSubscription(AZURE_SPEECH_KEY, AZURE_SPEECH_REGION);
  speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio24Khz96KBitRateMonoMp3;

  return speechConfig;
}

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
 * Build SSML with speed control
 *
 * @param {string} text - Text to speak
 * @param {string} voiceName - Azure voice name (e.g., 'ga-IE-OrlaNeural')
 * @param {number} speed - Speed multiplier (1.0 = normal, 0.8 = slower, 1.2 = faster)
 * @returns {string} SSML string
 */
function buildSSML(text, voiceName, speed = 1.0) {
  // Convert speed to percentage change
  const speedPercent = Math.round((speed - 1.0) * 100);
  const speedStr = speedPercent === 0 ? '0%' : `${speedPercent > 0 ? '+' : ''}${speedPercent}%`;

  return `<speak version='1.0' xml:lang='en-US' xmlns='http://www.w3.org/2001/10/synthesis'>
    <voice name='${voiceName}'>
        <prosody rate='${speedStr}'>${escapeXML(text)}</prosody>
    </voice>
</speak>`;
}

/**
 * Escape XML special characters
 */
function escapeXML(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate audio using Azure Speech Services (writes to file)
 *
 * Note: This function does NOT use the connection pool because Azure SDK
 * requires a dedicated AudioConfig for file output. For bulk generation,
 * use generateSpeech() which uses the pool and returns buffers.
 *
 * @param {string} text - Text to synthesize
 * @param {string} voiceName - Azure voice name (e.g., 'it-IT-ElsaNeural')
 * @param {string} outputPath - Path to save MP3 file
 * @param {number} speed - Speed multiplier (default: 1.0)
 * @returns {Promise<boolean>} True if successful
 */
async function generateAudio(text, voiceName, outputPath, speed = 1.0) {
  await rateLimitRequest();

  return new Promise((resolve, reject) => {
    try {
      const speechConfig = initSpeechConfig();
      const audioConfig = sdk.AudioConfig.fromAudioFileOutput(outputPath);
      const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

      const ssml = buildSSML(text, voiceName, speed);

      synthesizer.speakSsmlAsync(
        ssml,
        result => {
          synthesizer.close();

          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            resolve(true);
          } else if (result.reason === sdk.ResultReason.Canceled) {
            const cancellation = sdk.CancellationDetails.fromResult(result);
            reject(new Error(`Azure TTS canceled: ${cancellation.reason} - ${cancellation.errorDetails}`));
          } else {
            reject(new Error(`Azure TTS failed with reason: ${result.reason}`));
          }
        },
        error => {
          synthesizer.close();
          reject(new Error(`Azure TTS error: ${error}`));
        }
      );
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate speech and return audio buffer (no file writing)
 * Used by parallel workers
 *
 * Uses connection pool to reuse synthesizer instances and avoid exhausting
 * Azure's concurrent connection limits.
 *
 * @param {string} text - Text to synthesize
 * @param {string} voiceName - Azure voice name
 * @param {string} language - Language code (unused, for API compatibility)
 * @param {object} options - Generation options
 * @param {number} options.rate - Speed multiplier (default: 1.0)
 * @returns {Promise<Buffer>} Audio buffer
 */
async function generateSpeech(text, voiceName, language, options = {}) {
  const speed = options.rate || 1.0;

  await rateLimitRequest();

  // Retry logic for pool exhaustion
  const MAX_POOL_RETRIES = 10;
  const POOL_RETRY_DELAY = 100; // ms

  for (let attempt = 0; attempt < MAX_POOL_RETRIES; attempt++) {
    const synthesizer = borrowSynthesizer();

    if (!synthesizer) {
      // Pool exhausted - wait and retry
      if (attempt < MAX_POOL_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, POOL_RETRY_DELAY));
        continue;
      } else {
        throw new Error('Azure TTS connection pool exhausted after retries');
      }
    }

    // Got a synthesizer from pool
    try {
      const ssml = buildSSML(text, voiceName, speed);

      const audioBuffer = await new Promise((resolve, reject) => {
        synthesizer.speakSsmlAsync(
          ssml,
          result => {
            if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
              // Return the audio data as a buffer
              resolve(Buffer.from(result.audioData));
            } else if (result.reason === sdk.ResultReason.Canceled) {
              const cancellation = sdk.CancellationDetails.fromResult(result);
              reject(new Error(`Azure TTS canceled: ${cancellation.reason} - ${cancellation.errorDetails}`));
            } else {
              reject(new Error(`Azure TTS failed with reason: ${result.reason}`));
            }
          },
          error => {
            reject(new Error(`Azure TTS error: ${error}`));
          }
        );
      });

      // Success - return synthesizer to pool and return audio
      returnSynthesizer(synthesizer);
      return audioBuffer;

    } catch (error) {
      // Error - return synthesizer to pool and rethrow
      returnSynthesizer(synthesizer);
      throw error;
    }
  }
}

/**
 * Generate audio with retry logic
 *
 * @param {string} text - Text to synthesize
 * @param {string} voiceName - Azure voice name
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
      console.error(`[Azure TTS] Attempt ${attempt}/${maxRetries} failed for "${text.substring(0, 50)}...": ${error.message}`);

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
 * List available voices for a language
 *
 * @param {string} languageCode - Language code (e.g., 'it', 'ga')
 * @returns {Promise<Array>} Array of voice objects
 */
async function listVoices(languageCode = null) {
  const speechConfig = initSpeechConfig();
  const synthesizer = new sdk.SpeechSynthesizer(speechConfig);

  return new Promise((resolve, reject) => {
    synthesizer.getVoicesAsync(
      result => {
        synthesizer.close();

        if (result.reason === sdk.ResultReason.VoicesListRetrieved) {
          let voices = result.voices;

          // Filter by language if specified
          if (languageCode) {
            const localeFilter = getAzureLocale(languageCode);
            voices = voices.filter(v => v.locale.toLowerCase().startsWith(localeFilter.toLowerCase()));
          }

          resolve(voices.map(v => ({
            name: v.shortName,
            displayName: v.localName,
            locale: v.locale,
            gender: v.gender
          })));
        } else {
          reject(new Error(`Failed to retrieve voices: ${result.reason}`));
        }
      },
      error => {
        synthesizer.close();
        reject(new Error(`Error listing voices: ${error}`));
      }
    );
  });
}

/**
 * Get Azure locale code for a language
 *
 * @param {string} langCode - 2-letter language code
 * @returns {string} Azure locale (e.g., 'it-IT', 'ga-IE')
 */
function getAzureLocale(langCode) {
  const localeMap = {
    'en': 'en-US',
    'it': 'it-IT',
    'es': 'es-ES',
    'fr': 'fr-FR',
    'de': 'de-DE',
    'pt': 'pt-PT',
    'ja': 'ja-JP',
    'ko': 'ko-KR',
    'zh': 'zh-CN',
    'cmn': 'zh-CN',
    'ar': 'ar-EG',
    'sv': 'sv-SE',
    'fi': 'fi-FI',
    'ga': 'ga-IE',
    'cy': 'cy-GB',
    'nl': 'nl-NL',
    'ru': 'ru-RU'
  };

  return localeMap[langCode.toLowerCase()] || langCode;
}

/**
 * Test a voice with sample text
 *
 * @param {string} voiceName - Azure voice name
 * @param {string} text - Test text (default: "Hello, this is a test")
 * @param {number} speed - Speed multiplier
 * @returns {Promise<string>} Path to generated test file
 */
async function testVoice(voiceName, text = "Hello, this is a test.", speed = 1.0) {
  const tempDir = await fs.mkdtemp(path.join(require('os').tmpdir(), 'azure-voice-test-'));
  const tempFile = path.join(tempDir, 'test.mp3');

  await generateAudioWithRetry(text, voiceName, tempFile, speed);

  return tempFile;
}

/**
 * Get connection pool statistics
 * @returns {object} Pool stats
 */
function getPoolStats() {
  return {
    available: synthesizerPool.available.length,
    inUse: synthesizerPool.inUse,
    total: synthesizerPool.created,
    maxSize: synthesizerPool.MAX_POOL_SIZE
  };
}

module.exports = {
  generateAudio,
  generateAudioWithRetry,
  generateSpeech,
  listVoices,
  getAzureLocale,
  testVoice,
  buildSSML,
  getPoolStats,
  closePool,
  prewarmPool
};
