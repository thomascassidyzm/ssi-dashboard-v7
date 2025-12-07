/**
 * GET /api/voices/list
 * Get list of available Azure TTS voices
 *
 * Query params:
 *   - locale: Filter by locale (e.g., 'es-ES', 'zh-CN')
 *   - language: Filter by language code (e.g., 'es', 'zh') - matches any locale starting with this
 */

const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION || 'westeurope';
const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY;

// Cache voices for 1 hour (they don't change often)
let voiceCache = null;
let voiceCacheTime = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  // Check credentials
  if (!AZURE_SPEECH_KEY) {
    return res.status(500).json({
      error: 'Azure Speech not configured',
      message: 'AZURE_SPEECH_KEY environment variable is not set'
    });
  }

  try {
    const { locale, language } = req.query;

    // Check cache
    const now = Date.now();
    if (!voiceCache || (now - voiceCacheTime) > CACHE_TTL) {
      console.log('[Voices] Fetching voice list from Azure...');

      const response = await fetch(
        `https://${AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/voices/list`,
        {
          headers: {
            'Ocp-Apim-Subscription-Key': AZURE_SPEECH_KEY
          }
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Voices] Azure API error:', response.status, errorText);
        return res.status(response.status).json({
          error: 'Azure API error',
          status: response.status,
          message: errorText
        });
      }

      voiceCache = await response.json();
      voiceCacheTime = now;
      console.log('[Voices] Cached', voiceCache.length, 'voices');
    }

    // Filter voices
    let voices = voiceCache;

    // Filter by exact locale (e.g., 'es-ES')
    if (locale) {
      voices = voices.filter(v => v.Locale.toLowerCase() === locale.toLowerCase());
    }

    // Filter by language prefix (e.g., 'es' matches 'es-ES', 'es-MX', etc.)
    if (language) {
      const langLower = language.toLowerCase();
      voices = voices.filter(v => v.Locale.toLowerCase().startsWith(langLower + '-'));
    }

    // Only return Neural voices (filter out legacy standard voices)
    voices = voices.filter(v => v.VoiceType === 'Neural');

    // Transform to cleaner format
    const result = voices.map(v => ({
      id: v.ShortName,                    // e.g., 'es-ES-ElviraNeural'
      name: v.DisplayName,                 // e.g., 'Elvira'
      localName: v.LocalName,              // e.g., 'Elvira' (in local language)
      locale: v.Locale,                    // e.g., 'es-ES'
      localeName: v.LocaleName,            // e.g., 'Spanish (Spain)'
      gender: v.Gender,                    // 'Female' or 'Male'
      styles: v.StyleList || [],           // Available speaking styles
      roles: v.RolePlayList || [],         // Available role-play options
      wordsPerMinute: parseInt(v.WordsPerMinute) || null,
      sampleRate: v.SampleRateHertz,
      status: v.Status,                    // 'GA' or 'Preview'
      secondaryLocales: v.SecondaryLocaleList || []  // For multilingual voices
    }));

    // Sort by locale, then by name
    result.sort((a, b) => {
      if (a.locale !== b.locale) return a.locale.localeCompare(b.locale);
      return a.name.localeCompare(b.name);
    });

    res.json({
      count: result.length,
      region: AZURE_SPEECH_REGION,
      voices: result
    });

  } catch (err) {
    console.error('[Voices] Error:', err.message);
    res.status(500).json({
      error: 'Failed to fetch voices',
      message: err.message
    });
  }
}
