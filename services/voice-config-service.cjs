/**
 * Voice Configuration Service
 *
 * Manages parameterized voice settings per course.
 * All settings are stored in S3 so they can be tweaked from the dashboard.
 *
 * Key principle: Speed is per-voice (not per-role) because TTS voices vary in natural pace.
 *
 * Storage: s3://popty-bach-lfs/courses/{courseCode}/voice_config.json
 */

const s3Service = require('./s3-service.cjs');
const path = require('path');

// Default voice configuration template
const DEFAULT_VOICE_CONFIG = {
  version: '1.0',
  courseCode: null,

  // Voice settings per role
  voices: {
    target1: {
      voiceId: '',
      provider: 'elevenlabs',  // 'elevenlabs' | 'azure' | 'google'
      name: '',
      language: '',
      settings: {
        speed: 1.0,           // Voice-specific speed (TTS voices vary)
        stability: 0.5,       // ElevenLabs: 0-1
        similarityBoost: 0.75 // ElevenLabs: 0-1
      }
    },
    target2: {
      voiceId: '',
      provider: 'elevenlabs',
      name: '',
      language: '',
      settings: {
        speed: 1.0,
        stability: 0.5,
        similarityBoost: 0.75
      }
    },
    source: {
      voiceId: '',
      provider: 'elevenlabs',
      name: '',
      language: '',
      settings: {
        speed: 1.0,
        stability: 0.5,
        similarityBoost: 0.75
      }
    },
    presentation: {
      voiceId: '',
      provider: 'elevenlabs',
      name: '',
      language: '',
      settings: {
        speed: 1.0,
        stability: 0.5,
        similarityBoost: 0.75
      }
    }
  },

  // Cadence profiles (applied on top of voice-specific speed)
  cadenceProfiles: {
    natural: {
      speedMultiplier: 1.0,
      pauseMs: 0,
      description: 'Normal speaking pace'
    },
    slow: {
      speedMultiplier: 0.75,
      pauseMs: 500,
      description: 'Slower pace for learning'
    },
    fast: {
      speedMultiplier: 1.2,
      pauseMs: 0,
      description: 'Slightly faster pace'
    }
  },

  // Provider API keys (loaded from env, stored here for reference only - not the actual keys)
  providers: {
    elevenlabs: {
      enabled: true,
      apiKeyEnvVar: 'ELEVENLABS_API_KEY'
    },
    azure: {
      enabled: true,
      apiKeyEnvVar: 'AZURE_SPEECH_KEY',
      regionEnvVar: 'AZURE_SPEECH_REGION'
    }
  },

  // Metadata
  createdAt: null,
  updatedAt: null
};

/**
 * Get the S3 key for a course's voice config
 * @param {string} courseCode
 * @returns {string}
 */
function getConfigKey(courseCode) {
  return `courses/${courseCode}/voice_config.json`;
}

/**
 * Load voice configuration for a course
 * Returns default config if none exists
 *
 * @param {string} courseCode
 * @returns {Promise<object>} Voice configuration
 */
async function loadVoiceConfig(courseCode) {
  const key = getConfigKey(courseCode);

  try {
    const exists = await s3Service.existsInLFS(key);

    if (!exists) {
      console.log(`[VoiceConfig] No config found for ${courseCode}, returning defaults`);
      return {
        ...DEFAULT_VOICE_CONFIG,
        courseCode,
        createdAt: new Date().toISOString()
      };
    }

    const data = await s3Service.downloadFromLFS(key);
    const config = JSON.parse(data.toString());

    console.log(`[VoiceConfig] Loaded config for ${courseCode}`);
    return config;

  } catch (error) {
    console.error(`[VoiceConfig] Error loading config for ${courseCode}:`, error.message);
    // Return defaults on error
    return {
      ...DEFAULT_VOICE_CONFIG,
      courseCode,
      createdAt: new Date().toISOString()
    };
  }
}

/**
 * Save voice configuration for a course
 *
 * @param {string} courseCode
 * @param {object} config - Voice configuration object
 * @returns {Promise<object>} Saved configuration
 */
async function saveVoiceConfig(courseCode, config) {
  const key = getConfigKey(courseCode);

  // Merge with defaults to ensure all fields exist
  const fullConfig = {
    ...DEFAULT_VOICE_CONFIG,
    ...config,
    courseCode,
    updatedAt: new Date().toISOString()
  };

  // Ensure createdAt is set
  if (!fullConfig.createdAt) {
    fullConfig.createdAt = fullConfig.updatedAt;
  }

  await s3Service.uploadToLFS(
    key,
    JSON.stringify(fullConfig, null, 2),
    'application/json'
  );

  console.log(`[VoiceConfig] Saved config for ${courseCode}`);
  return fullConfig;
}

/**
 * Update a specific voice role configuration
 *
 * @param {string} courseCode
 * @param {string} role - 'target1' | 'target2' | 'source' | 'presentation'
 * @param {object} voiceSettings - Voice settings to update
 * @returns {Promise<object>} Updated configuration
 */
async function updateVoiceRole(courseCode, role, voiceSettings) {
  const config = await loadVoiceConfig(courseCode);

  if (!config.voices[role]) {
    throw new Error(`Invalid role: ${role}`);
  }

  // Deep merge the voice settings
  config.voices[role] = {
    ...config.voices[role],
    ...voiceSettings,
    settings: {
      ...config.voices[role].settings,
      ...(voiceSettings.settings || {})
    }
  };

  return await saveVoiceConfig(courseCode, config);
}

/**
 * Get effective speed for a voice considering cadence
 *
 * @param {object} voiceConfig - Voice configuration for a role
 * @param {string} cadence - 'natural' | 'slow' | 'fast'
 * @param {object} cadenceProfiles - Cadence profile definitions
 * @returns {number} Effective speed multiplier
 */
function getEffectiveSpeed(voiceConfig, cadence, cadenceProfiles) {
  const baseSpeed = voiceConfig.settings?.speed || 1.0;
  const cadenceMultiplier = cadenceProfiles[cadence]?.speedMultiplier || 1.0;

  return baseSpeed * cadenceMultiplier;
}

/**
 * Build TTS config for a specific role and cadence
 * Combines voice settings with provider credentials from environment
 *
 * @param {object} voiceConfig - Voice configuration for a role
 * @param {string} cadence - 'natural' | 'slow' | 'fast'
 * @param {object} cadenceProfiles - Cadence profile definitions
 * @returns {object} TTS provider config ready for generation
 */
function buildTTSConfig(voiceConfig, cadence, cadenceProfiles) {
  const provider = voiceConfig.provider || 'elevenlabs';
  const effectiveSpeed = getEffectiveSpeed(voiceConfig, cadence, cadenceProfiles);

  if (provider === 'elevenlabs') {
    return {
      provider: 'elevenlabs',
      apiKey: process.env.ELEVENLABS_API_KEY,
      voiceId: voiceConfig.voiceId,
      stability: voiceConfig.settings?.stability || 0.5,
      similarityBoost: voiceConfig.settings?.similarityBoost || 0.75,
      speed: effectiveSpeed
    };
  }

  if (provider === 'azure') {
    return {
      provider: 'azure',
      subscriptionKey: process.env.AZURE_SPEECH_KEY,
      region: process.env.AZURE_SPEECH_REGION || 'westeurope',
      voiceName: voiceConfig.voiceId,
      speed: effectiveSpeed
    };
  }

  throw new Error(`Unknown provider: ${provider}`);
}

/**
 * Get sample phrases for preview generation
 * Returns a mix of short, medium, and long phrases
 *
 * @param {string} courseCode
 * @param {number} count - Number of samples to return
 * @returns {Promise<Array>} Array of sample phrases
 */
async function getSamplePhrases(courseCode, count = 5) {
  try {
    // Try to load lego_baskets.json to get real phrases
    const basketsKey = `courses/${courseCode}/lego_baskets.json`;

    if (await s3Service.existsInLFS(basketsKey)) {
      const data = await s3Service.downloadFromLFS(basketsKey);
      const baskets = JSON.parse(data.toString());

      // Extract unique phrases from baskets
      const phrases = [];
      const seenTexts = new Set();

      for (const [basketId, basket] of Object.entries(baskets.baskets || {})) {
        // Get phrases from basket items
        for (const item of (basket.items || [])) {
          if (item.target && !seenTexts.has(item.target)) {
            phrases.push({
              text: item.target,
              known: item.known || '',
              source: 'basket',
              basketId
            });
            seenTexts.add(item.target);
          }
        }

        // Limit to reasonable number
        if (phrases.length >= 50) break;
      }

      // Return a mix: short, medium, long
      const sorted = phrases.sort((a, b) => a.text.length - b.text.length);
      const selected = [];

      if (sorted.length >= count) {
        // Select evenly distributed samples
        for (let i = 0; i < count; i++) {
          const index = Math.floor((i / count) * sorted.length);
          selected.push(sorted[index]);
        }
      } else {
        selected.push(...sorted.slice(0, count));
      }

      return selected;
    }

    // Fallback: try seed_pairs.json
    const seedsKey = `courses/${courseCode}/seed_pairs.json`;

    if (await s3Service.existsInLFS(seedsKey)) {
      const data = await s3Service.downloadFromLFS(seedsKey);
      const seeds = JSON.parse(data.toString());

      const phrases = [];
      for (const [seedId, translation] of Object.entries(seeds.translations || {})) {
        const target = typeof translation === 'object' ? translation.target : translation[0];
        const known = typeof translation === 'object' ? translation.known : translation[1];

        if (target) {
          phrases.push({
            text: target,
            known: known || '',
            source: 'seed',
            seedId
          });
        }

        if (phrases.length >= 50) break;
      }

      return phrases.slice(0, count);
    }

    // No data found - return generic samples
    return [
      { text: 'Hello', known: 'Hola', source: 'default' },
      { text: 'Good morning', known: 'Buenos días', source: 'default' },
      { text: 'How are you?', known: '¿Cómo estás?', source: 'default' },
      { text: 'Thank you very much', known: 'Muchas gracias', source: 'default' },
      { text: 'See you later', known: 'Hasta luego', source: 'default' }
    ].slice(0, count);

  } catch (error) {
    console.error(`[VoiceConfig] Error getting sample phrases for ${courseCode}:`, error.message);
    return [
      { text: 'Hello', known: 'Hola', source: 'default' },
      { text: 'Good morning', known: 'Buenos días', source: 'default' },
      { text: 'Thank you', known: 'Gracias', source: 'default' }
    ].slice(0, count);
  }
}

/**
 * Validate voice configuration
 *
 * @param {object} config - Voice configuration to validate
 * @returns {object} { valid: boolean, errors: string[] }
 */
function validateVoiceConfig(config) {
  const errors = [];

  // Check required fields
  if (!config.courseCode) {
    errors.push('Course code is required');
  }

  // Check voice configurations
  const roles = ['target1', 'target2', 'source'];
  for (const role of roles) {
    const voice = config.voices?.[role];
    if (!voice) {
      errors.push(`Voice configuration for ${role} is missing`);
      continue;
    }

    if (!voice.voiceId) {
      errors.push(`Voice ID for ${role} is required`);
    }

    if (!voice.provider) {
      errors.push(`Provider for ${role} is required`);
    }

    // Validate speed range
    const speed = voice.settings?.speed;
    if (speed !== undefined && (speed < 0.25 || speed > 4.0)) {
      errors.push(`Speed for ${role} must be between 0.25 and 4.0`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  loadVoiceConfig,
  saveVoiceConfig,
  updateVoiceRole,
  getEffectiveSpeed,
  buildTTSConfig,
  getSamplePhrases,
  validateVoiceConfig,
  DEFAULT_VOICE_CONFIG
};
