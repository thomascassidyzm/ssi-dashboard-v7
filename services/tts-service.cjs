/**
 * TTS Service Integration
 *
 * Supports multiple TTS providers:
 * - ElevenLabs (multilingual, high quality)
 * - Azure Speech Services (Microsoft TTS)
 *
 * Usage:
 *   const tts = require('./services/tts-service.cjs');
 *   const audioBuffer = await tts.generate('Ciao', 'elevenlabs', config);
 */

const fetch = require('node-fetch');
const sdk = require('microsoft-cognitiveservices-speech-sdk');

/**
 * Generate speech using ElevenLabs API
 * @param {string} text - Text to synthesize
 * @param {object} config - ElevenLabs configuration
 * @param {string} config.apiKey - ElevenLabs API key
 * @param {string} config.voiceId - Voice ID to use
 * @param {number} config.stability - Voice stability (0-1)
 * @param {number} config.similarityBoost - Similarity boost (0-1)
 * @param {number} config.speed - Speech speed multiplier (0.25-4.0)
 * @returns {Promise<Buffer>} Audio data as MP3
 */
async function generateElevenLabs(text, config) {
  const {
    apiKey,
    voiceId,
    stability = 0.5,
    similarityBoost = 0.75,
    speed = 1.0
  } = config;

  if (!apiKey) {
    throw new Error('ElevenLabs API key is required');
  }

  if (!voiceId) {
    throw new Error('Voice ID is required');
  }

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey
    },
    body: JSON.stringify({
      text: text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: stability,
        similarity_boost: similarityBoost,
        style: 0,
        use_speaker_boost: true
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs API error (${response.status}): ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Generate speech using Azure Speech Services
 * @param {string} text - Text to synthesize
 * @param {object} config - Azure configuration
 * @param {string} config.subscriptionKey - Azure Speech subscription key
 * @param {string} config.region - Azure region (e.g., 'eastus')
 * @param {string} config.voiceName - Voice name (e.g., 'it-IT-IsabellaNeural')
 * @param {number} config.speed - Speech speed multiplier (0.5-2.0)
 * @returns {Promise<Buffer>} Audio data as MP3
 */
async function generateAzure(text, config) {
  const {
    subscriptionKey,
    region,
    voiceName,
    speed = 1.0
  } = config;

  if (!subscriptionKey) {
    throw new Error('Azure subscription key is required');
  }

  if (!region) {
    throw new Error('Azure region is required');
  }

  if (!voiceName) {
    throw new Error('Azure voice name is required');
  }

  return new Promise((resolve, reject) => {
    const speechConfig = sdk.SpeechConfig.fromSubscription(subscriptionKey, region);
    speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;

    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, null);

    // Build SSML with voice and rate settings
    const speedPercent = Math.round((speed - 1) * 100);
    const rateString = speedPercent >= 0 ? `+${speedPercent}%` : `${speedPercent}%`;

    const ssml = `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
        <voice name="${voiceName}">
          <prosody rate="${rateString}">
            ${escapeXml(text)}
          </prosody>
        </voice>
      </speak>
    `.trim();

    synthesizer.speakSsmlAsync(
      ssml,
      result => {
        synthesizer.close();

        if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
          resolve(Buffer.from(result.audioData));
        } else {
          reject(new Error(`Azure TTS failed: ${result.errorDetails}`));
        }
      },
      error => {
        synthesizer.close();
        reject(new Error(`Azure TTS error: ${error}`));
      }
    );
  });
}

/**
 * Escape XML special characters for SSML
 */
function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate speech using specified TTS provider
 * @param {string} text - Text to synthesize
 * @param {string} provider - TTS provider ('elevenlabs' or 'azure')
 * @param {object} config - Provider-specific configuration
 * @returns {Promise<Buffer>} Audio data as MP3
 */
async function generate(text, provider, config) {
  if (!text || text.trim() === '') {
    throw new Error('Text cannot be empty');
  }

  switch (provider) {
    case 'elevenlabs':
      return await generateElevenLabs(text, config);

    case 'azure':
      return await generateAzure(text, config);

    default:
      throw new Error(`Unknown TTS provider: ${provider}`);
  }
}

/**
 * Generate speech with retry logic
 * @param {string} text - Text to synthesize
 * @param {string} provider - TTS provider
 * @param {object} config - Provider configuration
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise<Buffer>} Audio data
 */
async function generateWithRetry(text, provider, config, maxRetries = 3) {
  let lastError = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await generate(text, provider, config);
    } catch (error) {
      lastError = error;
      console.warn(`[TTS] Attempt ${attempt + 1}/${maxRetries} failed: ${error.message}`);

      if (attempt < maxRetries - 1) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`TTS generation failed after ${maxRetries} attempts: ${lastError.message}`);
}

/**
 * Get cadence speed multiplier
 * @param {string} cadence - Cadence type ('natural', 'fast', 'slow')
 * @returns {number} Speed multiplier
 */
function getCadenceSpeed(cadence) {
  switch (cadence) {
    case 'natural':
      return 1.0;
    case 'fast':
      return 1.3;
    case 'slow':
      return 0.7;
    default:
      return 1.0;
  }
}

/**
 * Get voice ID/name for role from voice mapping
 * @param {string} role - Role ('target1', 'target2', 'source')
 * @param {object} voiceMapping - Voice mapping object
 * @returns {string} Voice ID or name
 */
function getVoiceForRole(role, voiceMapping) {
  const voice = voiceMapping[role];
  if (!voice) {
    throw new Error(`No voice mapping found for role: ${role}`);
  }
  return voice;
}

module.exports = {
  generate,
  generateWithRetry,
  generateElevenLabs,
  generateAzure,
  getCadenceSpeed,
  getVoiceForRole
};
