/**
 * Voice Configuration Service
 *
 * Manages parameterized voice settings per course.
 * All settings are stored in Supabase (database-first architecture).
 *
 * Key principle: Speed is per-voice (not per-role) because TTS voices vary in natural pace.
 *
 * Storage: Supabase courses table - voice_config JSONB column
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

let supabase = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}

// Default voice configuration template
const DEFAULT_VOICE_CONFIG = {
  version: '1.0',
  courseCode: null,

  // Voice settings per role
  voices: {
    target1: {
      voiceId: '',
      provider: 'azure',  // 'elevenlabs' | 'azure' | 'google'
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
      provider: 'azure',
      name: '',
      language: '',
      settings: {
        speed: 1.0,
        stability: 0.5,
        similarityBoost: 0.75
      }
    },
    // NOTE: We use "known" (not "source") for the known language voice
    // Legacy manifest compatibility: use convertRoleForLegacyManifest() when needed
    known: {
      voiceId: '',
      provider: 'azure',
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
 * Load voice configuration for a course from Supabase
 * Returns default config if none exists
 *
 * @param {string} courseCode
 * @returns {Promise<object>} Voice configuration
 */
async function loadVoiceConfig(courseCode) {
  if (!supabase) {
    console.warn('[VoiceConfig] Supabase not initialized, returning defaults');
    return {
      ...DEFAULT_VOICE_CONFIG,
      courseCode,
      createdAt: new Date().toISOString()
    };
  }

  try {
    const { data, error } = await supabase
      .from('courses')
      .select('voice_config')
      .eq('course_code', courseCode)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      throw error;
    }

    if (!data || !data.voice_config) {
      console.log(`[VoiceConfig] No config found for ${courseCode}, returning defaults`);
      return {
        ...DEFAULT_VOICE_CONFIG,
        courseCode,
        createdAt: new Date().toISOString()
      };
    }

    console.log(`[VoiceConfig] Loaded config for ${courseCode} from Supabase`);
    return {
      ...DEFAULT_VOICE_CONFIG,
      ...data.voice_config,
      courseCode
    };

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
 * Save voice configuration for a course to Supabase
 *
 * @param {string} courseCode
 * @param {object} config - Voice configuration object
 * @returns {Promise<object>} Saved configuration
 */
async function saveVoiceConfig(courseCode, config) {
  if (!supabase) {
    throw new Error('Supabase not initialized - cannot save voice config');
  }

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

  try {
    // Parse course code to get languages (e.g., zho_for_eng -> target=zho, known=eng)
    const parts = courseCode.split('_for_');
    const targetLang = parts[0] || 'unknown';
    const knownLang = parts[1] || 'unknown';

    // Upsert to courses table with voice_config JSONB
    const { data, error } = await supabase
      .from('courses')
      .upsert({
        course_code: courseCode,
        known_lang: knownLang,
        target_lang: targetLang,
        voice_config: fullConfig,
        // Also update the individual voice columns for backwards compatibility
        known_voice: fullConfig.voices?.known?.voiceId || null,
        target_voice_1: fullConfig.voices?.target1?.voiceId || null,
        target_voice_2: fullConfig.voices?.target2?.voiceId || null,
        presentation_voice: fullConfig.voices?.presentation?.voiceId || null
      }, {
        onConflict: 'course_code'
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`[VoiceConfig] Saved config for ${courseCode} to Supabase`);
    return fullConfig;

  } catch (error) {
    console.error(`[VoiceConfig] Error saving config for ${courseCode}:`, error.message);
    throw error;
  }
}

/**
 * Update a specific voice role configuration
 *
 * @param {string} courseCode
 * @param {string} role - 'target1' | 'target2' | 'known' | 'presentation'
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
  const provider = voiceConfig.provider || 'azure';
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
  // Return generic samples - course-specific phrases would require additional DB queries
  return [
    { text: 'Hello', known: 'Hello', source: 'default' },
    { text: 'Good morning', known: 'Good morning', source: 'default' },
    { text: 'How are you?', known: 'How are you?', source: 'default' },
    { text: 'Thank you very much', known: 'Thank you very much', source: 'default' },
    { text: 'See you later', known: 'See you later', source: 'default' }
  ].slice(0, count);
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

  // Check voice configurations (known = known language, target = target language)
  const roles = ['target1', 'target2', 'known'];
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

/**
 * Convert role name for legacy manifest compatibility
 * The legacy manifest uses "source" but we use "known" everywhere else.
 *
 * @param {string} role - Modern role name ('known', 'target1', 'target2', 'presentation')
 * @returns {string} Role name for legacy manifest format
 */
function convertRoleForLegacyManifest(role) {
  if (role === 'known') {
    return 'source';
  }
  return role;
}

/**
 * Convert role name from legacy manifest to modern terminology
 *
 * @param {string} legacyRole - Legacy role name ('source', 'target1', 'target2', 'presentation')
 * @returns {string} Modern role name
 */
function convertRoleFromLegacyManifest(legacyRole) {
  if (legacyRole === 'source') {
    return 'known';
  }
  return legacyRole;
}

/**
 * Convert an entire voice config object for legacy manifest compatibility
 * Converts 'known' key to 'source' in voices object
 *
 * @param {object} config - Voice configuration using modern 'known' terminology
 * @returns {object} Voice configuration with 'source' for legacy manifest
 */
function convertConfigForLegacyManifest(config) {
  if (!config || !config.voices) {
    return config;
  }

  const legacyVoices = { ...config.voices };

  // Convert 'known' to 'source' if present
  if (legacyVoices.known) {
    legacyVoices.source = legacyVoices.known;
    delete legacyVoices.known;
  }

  return {
    ...config,
    voices: legacyVoices
  };
}

/**
 * Convert legacy config (with 'source') to modern config (with 'known')
 *
 * @param {object} legacyConfig - Voice configuration using legacy 'source' terminology
 * @returns {object} Voice configuration with 'known' for modern usage
 */
function convertConfigFromLegacyManifest(legacyConfig) {
  if (!legacyConfig || !legacyConfig.voices) {
    return legacyConfig;
  }

  const modernVoices = { ...legacyConfig.voices };

  // Convert 'source' to 'known' if present
  if (modernVoices.source) {
    modernVoices.known = modernVoices.source;
    delete modernVoices.source;
  }

  return {
    ...legacyConfig,
    voices: modernVoices
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
  // Backwards compatibility functions
  convertRoleForLegacyManifest,
  convertRoleFromLegacyManifest,
  convertConfigForLegacyManifest,
  convertConfigFromLegacyManifest,
  DEFAULT_VOICE_CONFIG
};
