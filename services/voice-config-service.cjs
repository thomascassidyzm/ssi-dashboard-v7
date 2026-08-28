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
const { bumpCourseVersion } = require('./shared/course-version.cjs');
const { voiceSpellings } = require('./shared/clip-identity-lookup.cjs');
const { selectProvider } = require('./shared/tts-provider-policy.cjs');

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
    },
    xai: {
      enabled: true,
      apiKeyEnvVar: 'XAI_API_KEY'
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
    // courses.course_code is the primary key
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
 * Auto-register an Azure voice in the voices table if it doesn't exist
 * This ensures any voice selected from Azure discovery is available for audio generation
 *
 * @param {object} voiceSettings - Voice settings from config
 * @returns {Promise<void>}
 */
async function ensureVoiceRegistered(voiceSettings) {
  if (!supabase || !voiceSettings?.voiceId) return;

  const voiceId = voiceSettings.voiceId;
  const provider = voiceSettings.provider || 'azure';

  // xAI voices — incl. custom cloned voice ids (e.g. 'gfzdpspr5fdp') that don't
  // follow Azure's "xx-YY-Name" locale convention. Register so they're
  // discoverable in voice pickers; language is taken from the config, not parsed
  // from the id. Own insert path, then return (skips the Azure locale parsing).
  if (provider === 'xai') {
    try {
      // Match EITHER spelling. An exact match on the caller's spelling alone is
      // how the registry ended up holding six voices twice over: the voice was
      // already there under its other spelling, this check missed it, and a
      // second row went in. The insert below still writes the caller's
      // spelling — this only stops a duplicate being created.
      const { data: existing } = await supabase
        .from('voices')
        .select('voice_id')
        .in('voice_id', voiceSpellings(voiceId, { provider }))
        .limit(1);
      if (existing && existing.length) return;

      const lang = voiceSettings.language || '';
      const xaiLocaleToLang = {
        'en-GB': 'eng', 'en-US': 'eng', 'en': 'eng',
        'es-ES': 'spa', 'es': 'spa',
        'it-IT': 'ita', 'it': 'ita',
        'fr-FR': 'fra', 'fr': 'fra',
        'de-DE': 'deu', 'de': 'deu',
        'pt-BR': 'por', 'pt': 'por',
        'ar-EG': 'ara', 'ar': 'ara',
        'ja-JP': 'jpn', 'ja': 'jpn',
        'ko-KR': 'kor', 'ko': 'kor',
        'zh-CN': 'zho', 'zh': 'zho'
      };
      const langCode = xaiLocaleToLang[lang] || lang.split('-')[0] || 'unknown';

      const { error } = await supabase
        .from('voices')
        .insert({
          voice_id: voiceId,
          type: 'tts',
          tts_engine: 'xai',
          tts_voice_name: voiceSettings.name || voiceId,
          tts_locale: lang || null,
          languages: [langCode],
          display_name: voiceSettings.name || voiceId,
          is_active: true
        });

      if (error && error.code !== '23505') { // Ignore duplicate key errors
        console.warn(`[VoiceConfig] Could not auto-register xAI voice ${voiceId}:`, error.message);
      } else {
        console.log(`[VoiceConfig] Auto-registered xAI voice: ${voiceId}`);
      }
    } catch (err) {
      console.warn(`[VoiceConfig] xAI voice registration skipped for ${voiceId}:`, err.message);
    }
    return;
  }

  // Only auto-register Azure voices (ElevenLabs should be manually added)
  if (provider !== 'azure') return;

  try {
    // Check if voice already exists — either spelling (see the xAI branch).
    const { data: existing } = await supabase
      .from('voices')
      .select('voice_id')
      .in('voice_id', voiceSpellings(voiceId, { provider }))
      .limit(1);

    if (existing && existing.length) {
      // Voice already registered
      return;
    }

    // Parse Azure voice name to extract locale (e.g., "zh-CN-XiaoxiaoMultilingualNeural" -> "zh-CN")
    const localeParts = voiceId.match(/^([a-z]{2}-[A-Z]{2})/);
    const locale = localeParts ? localeParts[1] : null;

    // Extract voice name (e.g., "XiaoxiaoMultilingualNeural")
    const voiceName = voiceId.replace(/^[a-z]{2}-[A-Z]{2}-/, '');

    // Map locale to ISO 639-3 language code
    const localeToLang = {
      'zh-CN': 'zho', 'zh-TW': 'zho', 'zh-HK': 'zho',
      'en-GB': 'eng', 'en-US': 'eng', 'en-AU': 'eng', 'en-IE': 'eng',
      'es-ES': 'spa', 'es-MX': 'spa', 'es-AR': 'spa',
      'it-IT': 'ita',
      'de-DE': 'deu',
      'fr-FR': 'fra',
      'ja-JP': 'jpn',
      'ko-KR': 'kor',
      'cy-GB': 'cym',
      'ga-IE': 'gle'
    };
    const langCode = localeToLang[locale] || locale?.split('-')[0] || 'unknown';

    // Insert new voice
    const { error } = await supabase
      .from('voices')
      .insert({
        voice_id: voiceId,
        type: 'tts',
        tts_engine: 'azure',
        tts_voice_name: voiceName,
        tts_locale: locale,
        languages: [langCode],
        display_name: voiceSettings.name || voiceName,
        is_active: true
      });

    if (error && error.code !== '23505') { // Ignore duplicate key errors
      console.warn(`[VoiceConfig] Could not auto-register voice ${voiceId}:`, error.message);
    } else {
      console.log(`[VoiceConfig] Auto-registered Azure voice: ${voiceId}`);
    }
  } catch (err) {
    console.warn(`[VoiceConfig] Error checking/registering voice ${voiceId}:`, err.message);
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

  // Normalize: push top-level provider into per-voice configs if missing
  if (fullConfig.provider && fullConfig.voices) {
    for (const role of ['target1', 'target2', 'known', 'presentation']) {
      if (fullConfig.voices[role]?.voiceId && !fullConfig.voices[role].provider) {
        fullConfig.voices[role].provider = fullConfig.provider;
      }
    }
  }

  // Ensure createdAt is set
  if (!fullConfig.createdAt) {
    fullConfig.createdAt = fullConfig.updatedAt;
  }

  try {
    // Auto-register any Azure voices that don't exist in the voices table
    // This ensures Phase 8 can look up the voice when generating audio
    const voiceRoles = ['target1', 'target2', 'known', 'presentation'];
    for (const role of voiceRoles) {
      if (fullConfig.voices?.[role]?.voiceId) {
        await ensureVoiceRegistered(fullConfig.voices[role]);
      }
    }

    // Parse course code to get languages (e.g., zho_for_eng -> target=zho, known=eng)
    const parts = courseCode.split('_for_');
    const targetLang = parts[0] || 'unknown';
    const knownLang = parts[1] || 'unknown';

    // Update voice_config in courses table (course must already exist)
    // Use UPDATE instead of UPSERT to avoid NOT NULL constraint issues
    const { data, error } = await supabase
      .from('courses')
      .update({
        voice_config: fullConfig
      })
      .eq('course_code', courseCode)
      .select()
      .single();

    if (error) throw error;

    console.log(`[VoiceConfig] Saved config for ${courseCode} to Supabase`);

    await bumpCourseVersion(supabase, courseCode, 'patch');

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
 * THE PROVIDER IS NOT THIS FUNCTION'S DECISION ANY MORE. It used to be
 * `voiceConfig.provider || 'azure'` — a per-call default, repeated in five
 * other places, each free to drift. It now asks the ladder in
 * services/shared/tts-provider-policy.cjs, which orders human > Cartesia >
 * Azure > ElevenLabs-only-when-named, and never xAI. The stored voice_config
 * is an INPUT to that decision, not the decision itself (Tom's wording:
 * selection is "driven by real Cartesia coverage rather than per-call config").
 *
 * The policy may hand back a different voiceId than the config carried — that
 * happens when it moves a render onto Cartesia, whose ids are bare UUIDs and
 * share no shape with an Azure voice name. Using its answer for BOTH fields is
 * what stops a provider swap shipping with the wrong provider's voice id.
 *
 * @param {object} voiceConfig - Voice configuration for a role
 * @param {string} cadence - 'natural' | 'slow' | 'fast'
 * @param {object} cadenceProfiles - Cadence profile definitions
 * @param {object} [opts]
 * @param {string} [opts.courseCode] - lets the ladder's human-voice stop fire here too
 * @param {string} [opts.language] - the line's language, if the caller knows it better
 *   than voiceConfig does; this is what Cartesia coverage is decided on
 * @param {string} [opts.explicitProvider] - a caller DELIBERATELY naming a provider.
 *   The only door to ElevenLabs, which the automatic ladder never reaches.
 * @returns {object} TTS provider config ready for generation
 */
function buildTTSConfig(voiceConfig, cadence, cadenceProfiles, opts = {}) {
  const decision = selectProvider({
    courseCode: opts.courseCode,
    language: opts.language || voiceConfig.locale || voiceConfig.language,
    voiceId: voiceConfig.voiceId,
    configuredProvider: voiceConfig.provider,
    explicitProvider: opts.explicitProvider,
  });
  const provider = decision.provider;
  // The ladder moved the render off the configured provider and had no
  // replacement voice to offer. Two ways to get here, and both want the same
  // answer: the course is still cast on retired xAI, or the configured voice is
  // barred from this language (Tom's clone handed a target-language line).
  //
  // FAIL, LOUDLY. The tempting alternative is to carry the old provider's voice
  // id onto the new provider, and an xAI preset name or a bare Cartesia UUID is
  // not an Azure voice — that renders a course in a voice nobody chose, or hard
  // fails deep in the vendor call where the reason is unreadable. Re-casting is
  // a real decision with a human's name on it, not something to guess at render
  // time, so this surfaces the gap instead of papering over it.
  if (voiceConfig.voiceId && !decision.voiceId) {
    throw new Error(
      `No voice for this render: the configured voice "${voiceConfig.voiceId}" ` +
      `(provider "${voiceConfig.provider}") cannot be carried onto ${provider}. ` +
      `Re-cast this role's voice in voice_config. Reason: ${decision.reason}`
    );
  }
  // The ladder's answer wins for the voice too — see the note above.
  voiceConfig = decision.voiceId === voiceConfig.voiceId
    ? voiceConfig
    : { ...voiceConfig, voiceId: decision.voiceId };
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

  if (provider === 'xai') {
    // UNREACHABLE FROM THE LADDER since the 2026-08-28 retirement — selectProvider
    // above never answers 'xai', and tts-service.generate() refuses it outright.
    // Kept rather than deleted because deleting it would make this file stop
    // describing a provider the estate still HAS: 118 xAI voices are registered
    // and hundreds of thousands of clips play on them. This is what the config
    // for one of those clips looked like when it was made.
    //
    // voiceId may be a preset ('eve'|'ara'|'leo'|'rex'|'sal') OR a custom
    // cloned voice id (e.g. 'gfzdpspr5fdp') — generateXai passes it through
    // verbatim. xAI has no speed param on /v1/tts; speed is applied downstream
    // in masterAudio, so it's advisory here (kept for symmetry with other roles).
    return {
      provider: 'xai',
      apiKey: process.env.XAI_API_KEY,
      voiceId: voiceConfig.voiceId,
      language: voiceConfig.language || 'auto',
      speed: effectiveSpeed
    };
  }

  if (provider === 'cartesia') {
    // voiceId is a bare UUID — Cartesia has no preset names, so there is no
    // shape here to tell a Cartesia voice from anything else's; the provider
    // field is the only thing that says so.
    //
    // `locale`, not `language`: Cartesia's own guidance is to prefer it, and a
    // base ISO code is a weak steer on an English-dominant multilingual voice.
    //
    // NO `|| 'auto'` FALLBACK. It was here until 2026-08-27 and it quietly
    // defeated the gate one layer down: generateCartesia treats a MISSING steer
    // as a hard fail and an EXPLICIT 'auto' as a warned, deliberate choice, so
    // manufacturing an 'auto' out of a config that simply never said turned the
    // hard fail into a console line nobody reads. That mattered less while the
    // steer might have been ignored anyway on sonic-3; on sonic-3.6 `locale` is
    // a supported parameter that shapes the phonology, so an unsteered render is
    // a defect worth stopping. A caller that really wants unsteered passes
    // 'auto' itself. This path serves voice PREVIEWS, not course audio.
    //
    // Speed is NOT advisory here, unlike xAI. Cartesia honours
    // generation_config.speed, and sending it explicitly is what halves the
    // take-to-take duration wander on short text (104% → 38%, determinism run
    // 2026-08-27) — so the cadence-derived speed goes to the provider rather
    // than only to masterAudio downstream.
    return {
      provider: 'cartesia',
      apiKey: process.env.CARTESIA_API_KEY,
      voiceId: voiceConfig.voiceId,
      locale: voiceConfig.locale || voiceConfig.language,
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
const DEFAULT_SAMPLE_PHRASES = [
  { text: 'Hello', known: 'Hello', source: 'default' },
  { text: 'Good morning', known: 'Good morning', source: 'default' },
  { text: 'How are you?', known: 'How are you?', source: 'default' },
  { text: 'Thank you very much', known: 'Thank you very much', source: 'default' },
  { text: 'See you later', known: 'See you later', source: 'default' }
];

/**
 * Pick `count` rows spread across the full array (not just the first N),
 * so a preview covers early, mid, and late course content.
 */
function pickSpread(rows, count) {
  if (rows.length <= count) return rows;
  const picks = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor((i * (rows.length - 1)) / (count - 1 || 1));
    picks.push(rows[idx]);
  }
  return picks;
}

async function getSamplePhrases(courseCode, count = 5) {
  if (!supabase) return DEFAULT_SAMPLE_PHRASES.slice(0, count);

  try {
    const { data: seeds } = await supabase
      .from('course_seeds')
      .select('seed_number, known_text, target_text')
      .eq('course_code', courseCode)
      .eq('status', 'released')
      .order('seed_number', { ascending: true });

    let rows = (seeds || []).map(r => ({ ...r, source: 'course_seeds' }));

    if (!rows.length) {
      const { data: legos } = await supabase
        .from('course_legos')
        .select('seed_number, lego_index, known_text, target_text')
        .eq('course_code', courseCode)
        .order('seed_number', { ascending: true })
        .order('lego_index', { ascending: true });

      rows = (legos || []).map(r => ({ ...r, source: 'course_legos' }));
    }

    rows = rows.filter(r => r.target_text && r.known_text);

    if (!rows.length) return DEFAULT_SAMPLE_PHRASES.slice(0, count);

    return pickSpread(rows, count).map(r => ({
      text: r.target_text,
      known: r.known_text,
      source: r.source
    }));
  } catch (err) {
    return DEFAULT_SAMPLE_PHRASES.slice(0, count);
  }
}

/**
 * Validate voice configuration
 * Only validates roles that have been configured (allows partial saves)
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

  // Check voice configurations - only validate roles that are being set
  // (allows saving individual voices without requiring ALL voices)
  const roles = ['target1', 'target2', 'known', 'presentation'];
  for (const role of roles) {
    const voice = config.voices?.[role];

    // Skip roles that aren't configured yet (allows partial saves)
    if (!voice || !voice.voiceId) {
      continue;
    }

    // If voiceId is set, provider should be set (per-voice or top-level fallback)
    if (!voice.provider && !config.provider) {
      errors.push(`Provider for ${role} is required when voice ID is set`);
    }

    // Validate speed range if specified
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
