/**
 * Azure TTS Service
 *
 * Wraps Azure Speech Services for text-to-speech generation.
 * Used primarily for target1 and target2 roles (short phrases, consistent pronunciation).
 */

const fs = require('fs-extra');
const path = require('path');
const langService = require('./language-code-service.cjs');
const { ellipsisToSSMLBreaks } = require('./shared/ellipsis-ssml.cjs');

// Configuration from environment
const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY;
const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION || 'westeurope';


// Synthesis is NOT done here any more. Every Azure render goes through the one
// TTS door (tts-service.speak), which asks every course's clips before paying
// for a new one (Tom, 2026-09-26). This module keeps the Azure-specific text
// helpers (SSML, short-word hint, regeneration variation), voice listing, and
// thin door-routed wrappers under its old function names.
function tts() { return require('./tts-service.cjs'); } // lazy: tts-service requires this module

function azureConfig(voiceName, speed, extra = {}) {
  if (!AZURE_SPEECH_KEY || !AZURE_SPEECH_REGION) {
    throw new Error('Azure Speech credentials not found. Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION in .env');
  }
  return { subscriptionKey: AZURE_SPEECH_KEY, region: AZURE_SPEECH_REGION, voiceName, speed, ...extra };
}

/** Kept for callers that still call them; there is no pool behind the door. */
function prewarmPool() {}
function closePool() {}

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

  // Extract locale from voice name (e.g. "de-DE-ConradNeural" → "de-DE")
  const localeMatch = voiceName.match(/^([a-z]{2}-[A-Z]{2})/);
  const xmlLang = localeMatch ? localeMatch[1] : 'en-US';

  return `<speak version='1.0' xml:lang='${xmlLang}' xmlns='http://www.w3.org/2001/10/synthesis'>
    <voice name='${voiceName}'>
        <prosody rate='${speedStr}'>${ellipsisToSSMLBreaks(text)}</prosody>
    </voice>
</speak>`;
}

/**
 * REGENERATION VARIATIONS
 *
 * Azure TTS is deterministic - same text = same audio.
 * For regeneration of flagged items, we apply subtle punctuation
 * variations to force different output without changing meaning.
 *
 * These variations are applied ONLY to the TTS input, NOT stored in database.
 */
const REGENERATION_VARIATIONS = [
  // Attempt 0: Original text (no variation)
  (text) => text,
  // Attempt 1: Add period if missing
  (text) => text.endsWith('.') ? text : text + '.',
  // Attempt 2: Add ellipsis
  (text) => text.replace(/[.!?]?$/, '...'),
  // Attempt 3: Add comma before last word
  (text) => {
    const words = text.split(' ');
    if (words.length > 1) {
      words.splice(-1, 0, ',');
      return words.join(' ').replace(' ,', ',');
    }
    return text + ',';
  },
  // Attempt 4: Use SSML break tag (subtle pause at end)
  (text) => text + ' ', // Trailing space
  // Attempt 5: Add soft hyphen (invisible but changes input)
  (text) => text + '\u00AD',
  // Attempt 6: Add zero-width space
  (text) => text + '\u200B',
  // Attempt 7: Exclamation variation
  (text) => text.replace(/[.!?]?$/, '!'),
  // Attempt 8: Question variation (if appropriate)
  (text) => text.replace(/[.!?]?$/, '?'),
  // Attempt 9+: Combine variations
  (text) => text + '...',
];

/**
 * Apply regeneration variation to text for TTS
 *
 * This is used when regenerating flagged audio to force Azure
 * to generate different output (since it's deterministic).
 *
 * @param {string} text - Original text
 * @param {number} attemptNumber - Regeneration attempt (0 = original)
 * @returns {string} Text with variation applied
 */
/**
 * Detect script family of text. Used to pick the right "TTS hint" punctuation
 * for the short-word coaxing helper below.
 *
 * @param {string} text
 * @returns {'cjk'|'rtl'|'latin'} Script family
 */
function detectScript(text) {
  if (!text) return 'latin';
  // CJK Unified Ideographs, Hiragana, Katakana, Hangul
  if (/[\u3040-\u30FF\u3400-\u4DBF\u4E00-\u9FFF\uAC00-\uD7AF]/.test(text)) return 'cjk';
  // Arabic, Hebrew, Syriac, Thaana
  if (/[\u0590-\u06FF\u0700-\u074F\u0780-\u07BF]/.test(text)) return 'rtl';
  return 'latin';
}

/**
 * Apply a language-aware "short word" hint for Azure TTS.
 *
 * Azure's neural voices read very short words (single CJK chars, 1-2 letter
 * Latin words like Spanish "y" or Italian "a") as letter names or
 * abbreviations rather than as words. Appending a comma forces the engine
 * to treat the input as a sentence fragment and pronounce it naturally.
 *
 * Rules:
 *   - Latin/Cyrillic/Greek words ≤ 2 chars  → append `,`
 *   - Single CJK character                 → append `、` (CJK ideographic comma)
 *   - RTL scripts (Arabic/Hebrew/etc.)      → SKIP — needs testing first
 *
 * The hint is applied to the TTS input text only — it is NEVER stored.
 *
 * @param {string} text - Original text
 * @returns {string} Text with hint applied (or unchanged)
 */
function applyShortWordHint(text) {
  if (!text) return text;
  const trimmed = text.trim();
  if (!trimmed) return text;

  // Already has trailing punctuation? Leave it alone.
  if (/[.,;:!?。、？！…]$/.test(trimmed)) return text;

  const script = detectScript(trimmed);
  if (script === 'rtl') return text; // Skip RTL until tested

  if (script === 'cjk') {
    // Only single-character CJK words need the hint; 2+ char compounds are fine
    if ([...trimmed].length === 1) return text + '、';
    return text;
  }

  // Latin / Cyrillic / Greek / etc.: apply for words of 1-2 characters
  if (trimmed.length <= 2) return text + ',';
  return text;
}

/**
 * Elision-space hint — Azure swallows an elided Italian word when it is
 * written closed up.
 *
 * Kai listened (2026-09-28, ita_for_eng S0360L01 "ha detto qualcos'altro?"):
 * every Azure clip of it, June and September alike, on it-IT-ElsaNeural AND
 * it-IT-BenignoNeural, says "ha detto altro?" — the engine drops "qualcos'"
 * entirely. The 2026-09-10 question-mark pass had already measured the same
 * and found the remedy: a single space after the apostrophe ("qualcos' altro")
 * makes both voices say the word; whisper then hears "qualcos'altro" and the
 * veracity gate passes at CER ~0. Re-probed on both voices 2026-09-28 (job
 * #668·I) with the same result. Kai's first guess, "qualcosaltro", could not
 * be probed that day (the spend guard's repeat key ignores apostrophes, so it
 * counted as the already-capped canonical line) and "qualcosa altro" is a
 * different, wrong word, so the space is the fix.
 *
 * This is a TTS-INPUT-ONLY transform, exactly like applyShortWordHint above:
 * the learner-facing target_text and course_audio.text keep the correct
 * Italian spelling "qualcos'altro", and only the string sent to Azure gains
 * the space. It is NEVER stored. It is a table, not a rule, because the
 * other elided forms in the same course — d'accordo, l'uomo, l'anno,
 * all'aperto, com'è — were checked on 2026-09-10 and render correctly, so
 * only the word that was proved defective is touched. Add a row only with a
 * whisper-checked probe on every voice the word is rendered on.
 *
 * @param {string} text - Original text
 * @returns {string} Text with the space inserted (or unchanged)
 */
const AZURE_ELISION_SPACE_HINTS = Object.freeze([
  // qualcos'altro → qualcos' altro (it-IT Elsa + Benigno, probed 2026-09-10 and 2026-09-28)
  { pattern: /\bqualcos'(?=[aeiouàèéìòù])/gi, replace: "qualcos' " },
]);

function applyElisionSpaceHint(text) {
  if (!text) return text;
  let out = String(text);
  for (const { pattern, replace } of AZURE_ELISION_SPACE_HINTS) out = out.replace(pattern, replace);
  return out;
}

function applyRegenerationVariation(text, attemptNumber = 0) {
  if (attemptNumber === 0) {
    return text; // First attempt uses original
  }

  // Cycle through variations
  const variationIndex = attemptNumber % REGENERATION_VARIATIONS.length;
  const variation = REGENERATION_VARIATIONS[variationIndex];

  const variedText = variation(text);

  console.log(`[Azure TTS] Regen attempt ${attemptNumber}: "${text}" → "${variedText}"`);

  return variedText;
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
  // Through the door: consent, then every course's clips, then (only on a miss) Azure.
  const { audioBuffer } = await tts().speak(text, 'azure', azureConfig(voiceName, speed), 1);
  await fs.writeFile(outputPath, audioBuffer);
  return true;
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
 * @param {number} options.regenerationAttempt - For flagged regeneration (0 = original, 1+ = varied)
 * @returns {Promise<Buffer>} Audio buffer
 */
async function generateSpeech(text, voiceName, language, options = {}) {
  // Through the door. `language` is now used: it names the clip if the voice
  // name cannot. The regeneration variation is applied by the Azure renderer
  // behind the door, never persisted.
  const { audioBuffer } = await tts().speak(text, 'azure', azureConfig(voiceName, options.rate || 1.0, {
    regenerationAttempt: options.regenerationAttempt || 0,
    door: language ? { language } : undefined,
  }), 1);
  return audioBuffer;
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
  if (!AZURE_SPEECH_KEY || !AZURE_SPEECH_REGION) {
    throw new Error('Azure Speech credentials not found. Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION in .env');
  }
  const res = await fetch(`https://${AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/voices/list`, {
    headers: { 'Ocp-Apim-Subscription-Key': AZURE_SPEECH_KEY },
  });
  if (!res.ok) throw new Error(`Failed to retrieve voices: HTTP ${res.status}`);
  let voices = await res.json();
  if (languageCode) {
    const localeFilter = getAzureLocale(languageCode);
    voices = voices.filter(v => String(v.Locale).toLowerCase().startsWith(localeFilter.toLowerCase()));
  }
  return voices.map(v => ({ name: v.ShortName, displayName: v.LocalName, locale: v.Locale, gender: v.Gender }));
}

/**
 * Get Azure locale code for a language
 * Delegates to centralized language-code-service
 *
 * @param {string} langCode - Language code (2-letter, 3-letter, or legacy)
 * @returns {string} Azure locale (e.g., 'it-IT', 'ga-IE')
 */
function getAzureLocale(langCode) {
  try {
    return langService.getAzureLocale(langCode);
  } catch (error) {
    // Fallback for unconfigured languages - return code as-is for voice filtering
    console.warn(`[Azure TTS] ${error.message}`);
    return langCode;
  }
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
  return { available: 0, inUse: 0, total: 0, maxSize: 0 };
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
  prewarmPool,
  applyRegenerationVariation,
  applyShortWordHint,
  applyElisionSpaceHint,
  AZURE_ELISION_SPACE_HINTS,
  REGENERATION_VARIATIONS
};
