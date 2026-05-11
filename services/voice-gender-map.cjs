/**
 * Voice → gender lookup for the TTS voices we use.
 *
 * Used by gender-prep code to decide whether a course actually needs the
 * gender-prep pipeline. The pipeline only matters when at least one TARGET
 * voice is female AND the target language genders 1st-person predicates.
 * A course with two male target voices in a gendered language doesn't need
 * feminine variants — the masculine canonical text is all that ever speaks.
 *
 * Returns 'F' / 'M' for known voices, null for unknown. Callers must treat
 * null conservatively (i.e. don't skip prep on unknown voices).
 */

// Azure Neural voice → gender. Add new voices here as we onboard them.
// Names follow Azure's convention; map covers what's actually used in our
// course configs as of May 2026 plus likely-soon additions for the gender-
// prep language expansion.
const AZURE_VOICE_GENDER = {
  // English
  'en-GB-SoniaNeural': 'F', 'en-GB-LibbyNeural': 'F', 'en-GB-MaisieNeural': 'F',
  'en-GB-RyanNeural': 'M', 'en-GB-OliverNeural': 'M', 'en-GB-ThomasNeural': 'M',
  'en-US-JennyNeural': 'F', 'en-US-AriaNeural': 'F',
  'en-US-GuyNeural': 'M', 'en-US-DavisNeural': 'M',
  'en-AU-NatashaNeural': 'F', 'en-AU-WilliamNeural': 'M',
  'en-IE-EmilyNeural': 'F', 'en-IE-ConnorNeural': 'M',

  // Spanish
  'es-ES-ElviraNeural': 'F', 'es-ES-XimenaNeural': 'F',
  'es-ES-AlvaroNeural': 'M', 'es-ES-ArnauNeural': 'M',
  'es-MX-DaliaNeural': 'F', 'es-MX-JorgeNeural': 'M',
  'es-AR-ElenaNeural': 'F', 'es-AR-TomasNeural': 'M',
  'es-CO-SalomeNeural': 'F', 'es-CO-GonzaloNeural': 'M',

  // French
  'fr-FR-DeniseNeural': 'F', 'fr-FR-CelesteNeural': 'F', 'fr-FR-EloiseNeural': 'F',
  'fr-FR-VivienneMultilingualNeural': 'F', 'fr-FR-BrigitteNeural': 'F',
  'fr-FR-HenriNeural': 'M', 'fr-FR-AlainNeural': 'M', 'fr-FR-JeromeNeural': 'M',
  'fr-CA-SylvieNeural': 'F', 'fr-CA-AntoineNeural': 'M', 'fr-CA-JeanNeural': 'M',
  'fr-CA-ThierryNeural': 'M',
  'fr-BE-CharlineNeural': 'F', 'fr-BE-GerardNeural': 'M',

  // Portuguese
  'pt-PT-RaquelNeural': 'F', 'pt-PT-DuarteNeural': 'M',
  'pt-BR-FranciscaNeural': 'F', 'pt-BR-ThalitaNeural': 'F',
  'pt-BR-AntonioNeural': 'M', 'pt-BR-DonatoNeural': 'M',

  // Italian
  'it-IT-ElsaNeural': 'F', 'it-IT-IsabellaNeural': 'F', 'it-IT-PalmiraNeural': 'F',
  'it-IT-DiegoNeural': 'M', 'it-IT-BenignoNeural': 'M', 'it-IT-GianniNeural': 'M',

  // German
  'de-DE-KatjaNeural': 'F', 'de-DE-AmalaNeural': 'F',
  'de-DE-ConradNeural': 'M', 'de-DE-KillianNeural': 'M', 'de-DE-FlorianNeural': 'M',
  'de-AT-IngridNeural': 'F', 'de-AT-JonasNeural': 'M',
  'de-CH-LeniNeural': 'F', 'de-CH-JanNeural': 'M',

  // Polish (gendered past + adjectives)
  'pl-PL-AgnieszkaNeural': 'F', 'pl-PL-ZofiaNeural': 'F',
  'pl-PL-MarekNeural': 'M',

  // Czech / Slovak
  'cs-CZ-VlastaNeural': 'F', 'cs-CZ-AntoninNeural': 'M',
  'sk-SK-ViktoriaNeural': 'F', 'sk-SK-LukasNeural': 'M',

  // Russian / Ukrainian / Bulgarian / Macedonian
  'ru-RU-SvetlanaNeural': 'F', 'ru-RU-DariyaNeural': 'F', 'ru-RU-DmitryNeural': 'M',
  'uk-UA-PolinaNeural': 'F', 'uk-UA-OstapNeural': 'M',
  'bg-BG-KalinaNeural': 'F', 'bg-BG-BorislavNeural': 'M',
  'mk-MK-MarijaNeural': 'F', 'mk-MK-AleksandarNeural': 'M',

  // Croatian / Slovenian / Serbian (Latin)
  'hr-HR-GabrijelaNeural': 'F', 'hr-HR-SreckoNeural': 'M',
  'sl-SI-PetraNeural': 'F', 'sl-SI-RokNeural': 'M',
  'sr-Latn-RS-SophieNeural': 'F', 'sr-Latn-RS-NicholasNeural': 'M',
  'sr-RS-SophieNeural': 'F', 'sr-RS-NicholasNeural': 'M',

  // Greek
  'el-GR-AthinaNeural': 'F', 'el-GR-NestorasNeural': 'M',

  // Baltic
  'lv-LV-EveritaNeural': 'F', 'lv-LV-NilsNeural': 'M',
  'lt-LT-OnaNeural': 'F', 'lt-LT-LeonasNeural': 'M',
  'et-EE-AnuNeural': 'F', 'et-EE-KertNeural': 'M',

  // Icelandic
  'is-IS-GudrunNeural': 'F', 'is-IS-GunnarNeural': 'M',

  // Arabic
  'ar-EG-SalmaNeural': 'F', 'ar-EG-ShakirNeural': 'M',
  'ar-SY-AmanyNeural': 'F', 'ar-SY-LaithNeural': 'M',
  'ar-LB-LaylaNeural': 'F', 'ar-LB-RamiNeural': 'M',
  'ar-SA-ZariyahNeural': 'F', 'ar-SA-HamedNeural': 'M',
  'ar-JO-SanaNeural': 'F', 'ar-JO-TaimNeural': 'M',
  'ar-AE-FatimaNeural': 'F', 'ar-AE-HamdanNeural': 'M',

  // Hebrew
  'he-IL-HilaNeural': 'F', 'he-IL-AvriNeural': 'M',

  // Indo-Aryan
  'hi-IN-SwaraNeural': 'F', 'hi-IN-AnanyaNeural': 'F', 'hi-IN-MadhurNeural': 'M',
  'bn-BD-NabanitaNeural': 'F', 'bn-BD-PradeepNeural': 'M',
  'bn-IN-TanishaaNeural': 'F', 'bn-IN-BashkarNeural': 'M',
  'gu-IN-DhwaniNeural': 'F', 'gu-IN-NiranjanNeural': 'M',
  'mr-IN-AarohiNeural': 'F', 'mr-IN-ManoharNeural': 'M',
  'ne-NP-HemkalaNeural': 'F', 'ne-NP-SagarNeural': 'M',
  'ur-PK-UzmaNeural': 'F', 'ur-PK-AsadNeural': 'M',
  'ur-IN-GulNeural': 'F', 'ur-IN-SalmanNeural': 'M',
  'pa-IN-OjasNeural': 'M',  // Azure only ships a single Punjabi voice today

  // Dravidian (not 1st-person speaker-gendered but included for course coverage)
  'ta-IN-PallaviNeural': 'F', 'ta-IN-ValluvarNeural': 'M',
  'te-IN-ShrutiNeural': 'F', 'te-IN-MohanNeural': 'M',

  // East Asian (mostly non-speaker-gendered but listed for completeness)
  'ja-JP-NanamiNeural': 'F', 'ja-JP-AoiNeural': 'F', 'ja-JP-KeitaNeural': 'M',
  'ko-KR-SunHiNeural': 'F', 'ko-KR-JiMinNeural': 'F', 'ko-KR-InJoonNeural': 'M',
  'zh-CN-XiaoxiaoNeural': 'F', 'zh-CN-XiaoyiNeural': 'F',
  'zh-CN-YunxiNeural': 'M', 'zh-CN-YunjianNeural': 'M', 'zh-CN-YunyangNeural': 'M',
  'zh-TW-HsiaoChenNeural': 'F', 'zh-TW-YunJheNeural': 'M',

  // SE Asia
  'id-ID-GadisNeural': 'F', 'id-ID-ArdiNeural': 'M',
  'ms-MY-YasminNeural': 'F', 'ms-MY-OsmanNeural': 'M',
  'fil-PH-BlessicaNeural': 'F', 'fil-PH-AngeloNeural': 'M',
  'vi-VN-HoaiMyNeural': 'F', 'vi-VN-NamMinhNeural': 'M',
  'th-TH-PremwadeeNeural': 'F', 'th-TH-NiwatNeural': 'M',

  // Nordic / Dutch / Welsh / Catalan / Basque / Galician
  'sv-SE-SofieNeural': 'F', 'sv-SE-MattiasNeural': 'M',
  'da-DK-ChristelNeural': 'F', 'da-DK-JeppeNeural': 'M',
  'nb-NO-PernilleNeural': 'F', 'nb-NO-FinnNeural': 'M',
  'fi-FI-NooraNeural': 'F', 'fi-FI-HarriNeural': 'M',
  'nl-NL-ColetteNeural': 'F', 'nl-NL-FennaNeural': 'F', 'nl-NL-MaartenNeural': 'M',
  'cy-GB-NiaNeural': 'F', 'cy-GB-AledNeural': 'M',
  'ca-ES-JoanaNeural': 'F', 'ca-ES-EnricNeural': 'M',
  'eu-ES-AinhoaNeural': 'F', 'eu-ES-AnderNeural': 'M',
  'gl-ES-SabelaNeural': 'F', 'gl-ES-RoiNeural': 'M',

  // Sinhala (Azure)
  'si-LK-ThiliniNeural': 'F', 'si-LK-SameeraNeural': 'M',

  // Romanian / Hungarian / Turkish / Persian
  'ro-RO-AlinaNeural': 'F', 'ro-RO-EmilNeural': 'M',
  'hu-HU-NoemiNeural': 'F', 'hu-HU-TamasNeural': 'M',
  'tr-TR-EmelNeural': 'F', 'tr-TR-AhmetNeural': 'M',
  'fa-IR-DilaraNeural': 'F', 'fa-IR-FaridNeural': 'M',
}

/**
 * Strip provider prefix from a voice_id string. We store voice ids as
 * `azure_en-GB-SoniaNeural` etc. in voice_config, but some legacy rows omit
 * the prefix.
 */
function stripProviderPrefix(voiceId) {
  if (!voiceId) return null
  return String(voiceId).replace(/^(azure|elevenlabs|xai)_/, '')
}

/**
 * Look up a voice id's gender. Returns 'F' / 'M' / null (unknown).
 * Treat null conservatively: don't use it to skip safety checks.
 */
function inferVoiceGender(voiceId) {
  const id = stripProviderPrefix(voiceId)
  return AZURE_VOICE_GENDER[id] || null
}

/**
 * Extract per-role voice ids from a course's voice_config. Handles both the
 * structured shape `voice_config.voices.<role>.voiceId` and the flat legacy
 * shape `voice_config.<role>`.
 */
function extractVoiceIds(voiceConfig) {
  const out = { known: null, target1: null, target2: null, presentation: null }
  if (!voiceConfig) return out
  const voices = voiceConfig.voices || {}
  for (const role of Object.keys(out)) {
    const v = voices[role]
    if (v && typeof v === 'object' && v.voiceId) {
      const prov = v.provider || 'azure'
      out[role] = `${prov}_${v.voiceId}`
    } else if (typeof voiceConfig[role] === 'string') {
      out[role] = voiceConfig[role]
    }
  }
  return out
}

/**
 * Get per-role inferred genders. Same keys as extractVoiceIds, values are
 * 'F' / 'M' / null.
 */
function getCourseVoiceGenders(voiceConfig) {
  const ids = extractVoiceIds(voiceConfig)
  return {
    known: inferVoiceGender(ids.known),
    target1: inferVoiceGender(ids.target1),
    target2: inferVoiceGender(ids.target2),
    presentation: inferVoiceGender(ids.presentation),
    voiceIds: ids,
  }
}

/**
 * Does this course have any female target voice? Used to gate gender prep —
 * a course with two male target voices in a gendered language can still
 * speak only the masculine canonical text. Returns:
 *   true  → at least one target voice is female (prep is worth doing)
 *   false → all target voices are confirmed male (prep is unnecessary)
 *   null  → can't tell from the configured voices (e.g. unknown voice id);
 *           callers should fall back to "run prep" to stay safe.
 */
function anyTargetVoiceFemale(voiceConfig) {
  const g = getCourseVoiceGenders(voiceConfig)
  const targets = [g.target1, g.target2].filter(Boolean)
  if (targets.length === 0) return null  // no voices, no signal
  if (targets.includes('F')) return true
  // All target voices known and none female
  if (g.target1 && g.target2 && g.target1 !== 'F' && g.target2 !== 'F') return false
  // Partially known — conservatively unknown
  return null
}

module.exports = {
  AZURE_VOICE_GENDER,
  stripProviderPrefix,
  inferVoiceGender,
  extractVoiceIds,
  getCourseVoiceGenders,
  anyTargetVoiceFemale,
}
