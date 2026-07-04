/**
 * TTS Service Integration
 *
 * Supports multiple TTS providers:
 * - ElevenLabs (multilingual, high quality)
 * - Azure Speech Services (Microsoft TTS)
 * - xAI TTS (cheap, 5 voices, 20+ languages, expressive markup)
 *
 * Usage:
 *   const tts = require('./services/tts-service.cjs');
 *   const audioBuffer = await tts.generate('Ciao', 'elevenlabs', config);
 */

const fetch = require('node-fetch');
const https = require('https');
const sdk = require('microsoft-cognitiveservices-speech-sdk');
const { applyRegenerationVariation, applyShortWordHint } = require('./azure-tts-service.cjs');

// Shared keep-alive agent for REST TTS providers (xAI, ElevenLabs). Without it
// every clip opens a fresh TLS connection — a 14k-clip run churns 14k+
// handshakes through the router's NAT table, which is what produced the
// evening-long ECONNRESET/socket-hang-up windows of 2026-06-07 (provider-
// agnostic; Azure REST hit the same). A handful of pooled sockets carries the
// whole run instead.
const ttsKeepAliveAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 32,
  maxFreeSockets: 8,
});

/**
 * Generate speech using ElevenLabs API
 * @param {string} text - Text to synthesize
 * @param {object} config - ElevenLabs configuration
 * @param {string} config.apiKey - ElevenLabs API key
 * @param {string} config.voiceId - Voice ID to use
 * @param {number} config.stability - Voice stability (0-1)
 * @param {number} config.similarityBoost - Similarity boost (0-1)
 * @param {number} config.speed - Speech speed multiplier (0.25-4.0)
 * @returns {Promise<{audioBuffer: Buffer, wordBoundaries: Array|null}>} Audio data + word boundary timing
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
    agent: ttsKeepAliveAgent,
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
  return { audioBuffer: Buffer.from(arrayBuffer), wordBoundaries: null };
}

/**
 * Generate speech using Azure Speech Services
 * @param {string} text - Text to synthesize
 * @param {object} config - Azure configuration
 * @param {string} config.subscriptionKey - Azure Speech subscription key
 * @param {string} config.region - Azure region (e.g., 'eastus')
 * @param {string} config.voiceName - Voice name (e.g., 'it-IT-IsabellaNeural')
 * @param {number} config.speed - Speech speed multiplier (0.5-2.0)
 * @param {number} config.regenerationAttempt - For flagged regeneration (0 = original)
 * @returns {Promise<{audioBuffer: Buffer, wordBoundaries: Array|null}>} Audio data + word boundary timing
 */
async function generateAzure(text, config) {
  const {
    subscriptionKey,
    region,
    voiceName,
    speed = 1.0,
    regenerationAttempt = 0
  } = config;

  // Apply variation for regeneration (Azure is deterministic), then apply
  // the language-aware short-word hint so single chars / very short words
  // get pronounced as words instead of letter names. Both transforms are
  // TTS-input-only and are NEVER persisted.
  let ttsText = applyRegenerationVariation(text, regenerationAttempt);
  ttsText = applyShortWordHint(ttsText);

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

    // Capture word boundary events for component audio splicing
    const wordBoundaries = [];
    synthesizer.wordBoundary = (_, e) => {
      // audioOffset is in 100ns ticks; convert to milliseconds
      wordBoundaries.push({
        text: e.text,
        offset: Math.round(e.audioOffset / 10000),
        duration: Math.round(e.duration / 10000)
      });
    };

    // Build SSML with voice and rate settings
    const speedPercent = Math.round((speed - 1) * 100);
    const rateString = speedPercent >= 0 ? `+${speedPercent}%` : `${speedPercent}%`;

    const ssml = `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
        <voice name="${voiceName}">
          <prosody rate="${rateString}">
            ${escapeXml(ttsText)}
          </prosody>
        </voice>
      </speak>
    `.trim();

    synthesizer.speakSsmlAsync(
      ssml,
      result => {
        synthesizer.close();

        if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
          resolve({ audioBuffer: Buffer.from(result.audioData), wordBoundaries });
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
 * Generate speech using xAI TTS
 * @param {string} text - Text to synthesize (may include expressive markup like [laugh], <whisper>)
 * @param {object} config - xAI configuration
 * @param {string} config.apiKey - xAI API key
 * @param {string} config.voiceId - Preset voice id ('eve' | 'ara' | 'leo' | 'rex' | 'sal', case-insensitive) OR a custom cloned voice_id (e.g. Tom's clones 'gfzdpspr5fdp', 'bedd6226') — xAI accepts both, this is not a fixed enum
 * @param {string} config.language - BCP-47 language code (e.g., 'es', 'en', 'pt-BR', 'ar-EG', 'auto')
 * @param {number} config.speed - Speech speed multiplier (applied client-side via SSML-like wrapping if supported)
 * @param {string} config.codec - Output codec: 'mp3' (default) | 'wav' | 'pcm' | 'mulaw' | 'alaw'
 * @param {number} config.sampleRate - Sample rate in Hz (default: 24000)
 * @param {number} config.bitRate - Bit rate in bps (default: 128000)
 * @returns {Promise<{audioBuffer: Buffer, wordBoundaries: Array|null}>} Audio data. Word boundaries are null — xAI does not provide them.
 */
async function generateXai(text, config) {
  const {
    apiKey,
    voiceId = 'eve',
    language = 'auto',
    codec = 'mp3',
    sampleRate = 24000,
    bitRate = 128000
  } = config;

  if (!apiKey) {
    throw new Error('xAI API key is required');
  }

  if (text.length > 15000) {
    throw new Error(`xAI TTS REST request limited to 15000 characters; got ${text.length}. Use streaming endpoint for longer content.`);
  }

  // Note: xAI currently does not document a speed parameter on the /v1/tts endpoint.
  // Speed control is handled downstream via audio-processing (masterAudio stage).
  // Expressive markup ([laugh], [sigh], <whisper>, <emphasis>) passes through text as-is.

  const body = {
    text,
    voice_id: voiceId,
    language,
    output_format: {
      codec,
      sample_rate: sampleRate,
      bit_rate: bitRate
    }
  };

  const response = await fetch('https://api.x.ai/v1/tts', {
    method: 'POST',
    agent: ttsKeepAliveAgent,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`xAI TTS API error (${response.status}): ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return { audioBuffer: Buffer.from(arrayBuffer), wordBoundaries: null };
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
 * @param {string} provider - TTS provider ('elevenlabs' | 'azure' | 'xai')
 * @param {object} config - Provider-specific configuration
 * @returns {Promise<{audioBuffer: Buffer, wordBoundaries: Array|null}>} Audio data + word boundary timing
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

    case 'xai':
      return await generateXai(text, config);

    default:
      throw new Error(`Unknown TTS provider: ${provider}`);
  }
}

/**
 * Decide whether a TTS error is worth retrying.
 *
 * Retry on transient/load failures: HTTP 5xx, connection resets, socket hang
 * ups, timeouts, fetch/network errors. These are exactly the intermittent
 * failures xAI's /v1/tts throws under the pod generator's fan-out
 * (e.g. `500 {"error":"TTS synthesis failed: Timeout expired"}`, `ECONNRESET`).
 *
 * Do NOT retry on real client errors (HTTP 4xx — bad key, bad voice id,
 * malformed request): retrying just burns time and money on a request that
 * will never succeed.
 *
 * @param {Error} error - The error thrown by generate()
 * @returns {boolean} True if the failure looks transient and retriable
 */
function isRetriableTtsError(error) {
  const msg = (error && error.message) ? error.message : String(error);

  // Provider error strings embed the HTTP status as "(NNN)". A 4xx is a real
  // client error — never retry it. Treat everything else as potentially
  // transient.
  const statusMatch = msg.match(/\((\d{3})\)/);
  if (statusMatch) {
    const status = parseInt(statusMatch[1], 10);
    if (status >= 400 && status < 500) return false; // client error → give up
    if (status >= 500) return true;                   // server error → retry
  }

  // Node fetch / socket level transient failures.
  const code = error && error.code ? String(error.code) : '';
  if (/ECONNRESET|ETIMEDOUT|ECONNREFUSED|EAI_AGAIN|EPIPE|ENETUNREACH/.test(code)) {
    return true;
  }
  if (/ECONNRESET|socket hang up|timeout|timed out|network|fetch failed|aborted|EAI_AGAIN|ETIMEDOUT/i.test(msg)) {
    return true;
  }

  // Unknown shape → retry once rather than fail hard on a possibly-transient
  // blip. The retry budget (maxRetries) bounds the downside.
  return true;
}

/**
 * Generate speech with retry logic and exponential backoff + jitter.
 *
 * Backoff is exponential (base 1s, doubling) with full jitter, so a fan-out of
 * concurrent pod clips that all hit a transient xAI 5xx don't retry in lockstep
 * and re-stampede the API. Non-retriable (4xx) failures bail immediately.
 *
 * @param {string} text - Text to synthesize
 * @param {string} provider - TTS provider
 * @param {object} config - Provider configuration
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise<{audioBuffer: Buffer, wordBoundaries: Array|null}>} Audio data + word boundary timing
 */
async function generateWithRetry(text, provider, config, maxRetries = 3) {
  let lastError = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await generate(text, provider, config);
    } catch (error) {
      lastError = error;
      const retriable = isRetriableTtsError(error);
      console.warn(`[TTS] Attempt ${attempt + 1}/${maxRetries} failed (${retriable ? 'retriable' : 'fatal'}): ${error.message}`);

      // Real client error (4xx etc.) — retrying cannot help, fail fast.
      if (!retriable) {
        throw new Error(`TTS generation failed (non-retriable): ${error.message}`);
      }

      if (attempt < maxRetries - 1) {
        // Exponential backoff with full jitter: pick a random delay in
        // [0, base * 2^attempt]. base=1s → windows of [0,1s], [0,2s], [0,4s].
        // Jitter de-synchronises concurrent retries so they don't re-stampede.
        const ceiling = Math.pow(2, attempt) * 1000;
        const delay = Math.floor(Math.random() * ceiling);
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
  isRetriableTtsError,
  generateElevenLabs,
  generateAzure,
  generateXai,
  getCadenceSpeed,
  getVoiceForRole
};
