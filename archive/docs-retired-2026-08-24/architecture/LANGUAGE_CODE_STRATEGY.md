# Language Code Strategy

## Overview

This document defines the canonical language code format for the SSi project and documents the conversion strategy at service boundaries.

## Canonical Format: ISO 639-3 (3-letter codes)

**The project standard is ISO 639-3 (3-letter codes) wherever possible.**

### Why ISO 639-3?

1. **Consistency**: 3-letter codes are used throughout:
   - Supabase database schema
   - Course directory names (`spa_for_eng`, `cmn_for_eng`)
   - Course configuration files
   - Internal data structures

2. **Coverage**: ISO 639-3 includes ALL languages (7,000+), including those without 2-letter codes:
   - `cmn` (Mandarin Chinese) - no ISO 639-1 equivalent
   - `cym` (Welsh) - has ISO 639-1 `cy` but we use 3-letter for consistency
   - Regional variants: `cy-north`, `cy-south`

3. **Disambiguation**: Avoids ambiguity (e.g., Chinese has multiple varieties: `cmn`, `yue`, `nan`)

## Centralized Conversion Service

**Location**: `/services/language-code-service.cjs`

**Source of Truth**: `/tools/sync/reference/language_codes.csv`

### CSV Schema

```csv
language_code,language_name,azure_locale,elevenlabs_code,legacy_code,google_locale
en,English,en-GB,en,eng,en-GB
es,Spanish,es-ES,es,spa,es-ES
cmn,Chinese,zh-CN,zh,cmn,cmn-CN
cy,Welsh,cy-GB,cy,cym,cy-GB
```

**Key columns:**
- `language_code`: ISO 639-1 (2-letter) or ISO 639-3 (3-letter) - the canonical code
- `legacy_code`: The 3-letter code used in directory names and internal structures
- `azure_locale`: Azure BCP-47 locale string (e.g., `es-ES`)
- `elevenlabs_code`: ElevenLabs language code
- `google_locale`: Google BCP-47 locale string

### Service API

```javascript
const langService = require('./services/language-code-service.cjs');

// Convert legacy (3-letter) to standard (2-letter or 3-letter)
langService.legacyToStandard('spa')  // → 'es'
langService.legacyToStandard('eng')  // → 'en'
langService.legacyToStandard('cmn')  // → 'cmn' (no 2-letter equivalent)

// Convert standard to legacy (for directory names)
langService.standardToLegacy('es')   // → 'spa'
langService.standardToLegacy('en')   // → 'eng'
langService.standardToLegacy('cmn')  // → 'cmn'

// Get TTS provider locale strings
langService.getAzureLocale('es')        // → 'es-ES'
langService.getAzureLocale('spa')       // → 'es-ES' (auto-converts)
langService.getElevenLabsCode('spa')    // → 'es'
langService.getGoogleLocale('cmn')      // → 'cmn-CN'

// Get language name
langService.getName('spa')              // → 'Spanish'
langService.getName('es')               // → 'Spanish'

// Parse course codes
langService.parseCourseCode('spa_for_eng')
// → { target: 'es', known: 'en', targetLegacy: 'spa', knownLegacy: 'eng', ... }
```

## Conversion Boundaries

### Where 3-letter (legacy) codes are used:

1. **Course directory names**: `public/vfs/courses/spa_for_eng/`
2. **Course identifiers**: `spa_for_eng`, `cmn_for_eng`
3. **Supabase `lang` column**: `eng`, `spa`, `cmn`
4. **Internal JSON files**: `lego_pairs.json`, `lego_baskets.json`
5. **S3 paths** (legacy): `mastered/{uuid}.mp3` (metadata uses 3-letter)

### Where 2-letter codes are used:

1. **Azure TTS API**: Requires `es-ES` locales (derived from 2-letter)
2. **ElevenLabs TTS API**: Uses 2-letter codes (`es`, `en`)
3. **Google TTS API**: Uses BCP-47 locales with 2-letter base
4. **Manifest `known_language` field**: Uses 2-letter for major languages
5. **Voice registry lookups**: Keyed by 2-letter codes

### Conversion Points

**All conversions MUST use `language-code-service.cjs`**

#### 1. TTS Service Boundaries

```javascript
// services/azure-tts-service.cjs
const locale = langService.getAzureLocale(languageCode); // Handles conversion

// services/google-tts-service.cjs
const locale = langService.getGoogleLocale(languageCode); // Handles conversion
```

#### 2. Voice Discovery

```javascript
// services/voice-discovery-service.cjs
function getLocalePrefix(languageCode) {
  const code = languageCode.toLowerCase();
  if (code === 'cmn') return 'zh'; // Special case
  return langService.legacyToStandard(code);
}
```

#### 3. Audio Generation Planning

```javascript
// services/audio-generation-planner.cjs
// Converts 3-letter course codes to 2-letter for voice lookups
function normalizeLanguageCode(code) {
  return langService.legacyToStandard(code);
}
```

#### 4. UUID Generation

```javascript
// services/uuid-service.cjs
// Normalizes 2-letter to 3-letter for legacy UUID compatibility
function toLegacyLangCode(langCode) {
  return langService.standardToLegacy(langCode);
}
```

#### 5. Manifest Compilation

```javascript
// scripts/phase7-compile-manifest-v3.cjs
// Should use language-code-service for mapping
const manifestKnown = langService.legacyToStandard(knownLang);
const manifestTarget = langService.legacyToStandard(targetLang);
```

## Migration Status

### ✅ Migrated to language-code-service

- `services/azure-tts-service.cjs` - Uses `langService.getAzureLocale()`
- `services/google-tts-service.cjs` - Uses `langService.getGoogleLocale()`
- `services/voice-discovery-service.cjs` - Uses `langService.legacyToStandard()`
- `services/preflight-check-service.cjs` - Uses language-code-service
- `tools/orchestrators/automation_server.cjs` - Uses language-code-service
- `tools/sync/publish-to-course-configs.cjs` - Uses language-code-service
- `scripts/phase8-audio-generation.cjs` - Uses language-code-service

### ⚠️ Has inline mappings (should be refactored)

- `services/audio-generation-planner.cjs:587-596` - Has `normalizeLanguageCode()` function
- `services/uuid-service.cjs:16-38` - Has `LANG_CODE_MAP` constant
- `scripts/phase7-compile-manifest-v3.cjs:60-76` - Has inline mapping objects

### 📋 Refactoring Recommendations

1. **audio-generation-planner.cjs**: Replace `normalizeLanguageCode()` with `langService.legacyToStandard()`
2. **uuid-service.cjs**: Replace `LANG_CODE_MAP` with `langService.standardToLegacy()`
3. **phase7-compile-manifest-v3.cjs**: Replace inline `shortCodeMap` and `langNames` with service calls

## Special Cases

### Mandarin Chinese (`cmn`)

- **ISO 639-3**: `cmn` (Mandarin Chinese)
- **No ISO 639-1 equivalent** - Chinese has multiple varieties
- **Azure locale**: `zh-CN` (simplified) or `zh-TW` (traditional)
- **ElevenLabs**: `zh`
- **Conversion**: `cmn` → `zh` for TTS APIs

### Welsh (`cym` / `cy`)

- **ISO 639-3**: `cym`
- **ISO 639-1**: `cy`
- **Regional variants**: `cy-north`, `cy-south` (non-standard, SSi-specific)
- **Azure locale**: `cy-GB`
- **Conversion**: `cym` → `cy` for TTS APIs

### English (`eng` / `en`)

- **ISO 639-3**: `eng`
- **ISO 639-1**: `en`
- **Azure locale**: `en-GB`, `en-US`
- **Default**: Use `en-GB` for British English

## Testing Strategy

### Unit Tests

```javascript
// Test legacy→standard conversion
expect(langService.legacyToStandard('spa')).toBe('es');
expect(langService.legacyToStandard('eng')).toBe('en');
expect(langService.legacyToStandard('cmn')).toBe('cmn');

// Test standard→legacy conversion
expect(langService.standardToLegacy('es')).toBe('spa');
expect(langService.standardToLegacy('en')).toBe('eng');
expect(langService.standardToLegacy('cmn')).toBe('cmn');

// Test TTS provider lookups
expect(langService.getAzureLocale('spa')).toBe('es-ES');
expect(langService.getAzureLocale('cmn')).toBe('zh-CN');
expect(langService.getElevenLabsCode('spa')).toBe('es');
```

### Integration Tests

1. Verify course directory names use 3-letter codes
2. Verify Supabase `lang` column contains 3-letter codes
3. Verify TTS API calls receive correct locale strings
4. Verify manifest uses appropriate codes for each language

## FAQ

### Why not standardize on ISO 639-1 (2-letter)?

**Answer**: ISO 639-1 doesn't cover all languages. Chinese (`cmn`) has no 2-letter equivalent, and we need consistency across 100+ languages.

### Why does the manifest sometimes use 2-letter codes?

**Answer**: Historical reasons. The manifest `known_language` field uses 2-letter codes for major languages (English, Spanish) but 3-letter for languages without 2-letter equivalents (Mandarin). This should be standardized to always use 3-letter.

### Can I add a new language?

**Answer**: Yes. Add it to `/tools/sync/reference/language_codes.csv` with:
- Canonical code (2-letter or 3-letter)
- Language name
- TTS provider locales (if supported)
- Legacy 3-letter code

Then run `langService.reload()` or restart services.

### What if a TTS provider uses a different code?

**Answer**: Map it in the CSV. Example:
```csv
language_code,language_name,azure_locale,elevenlabs_code
cmn,Chinese,zh-CN,zh
```

The service handles the conversion automatically.

## Summary

✅ **DO:**
- Use 3-letter codes (`spa`, `eng`, `cmn`) in course directories, databases, and internal structures
- Use `language-code-service.cjs` for ALL conversions
- Add new languages to `language_codes.csv`
- Convert at TTS service boundaries using service methods

❌ **DON'T:**
- Create inline mapping objects in new code
- Hardcode language code conversions
- Use 2-letter codes in course identifiers or database fields
- Mix 2-letter and 3-letter codes without conversion

---

**Last Updated**: 2025-12-04
**Maintained By**: System architecture team
**Related Files**:
- `/services/language-code-service.cjs`
- `/tools/sync/reference/language_codes.csv`
- `/services/uuid-service.cjs`
- `/services/azure-tts-service.cjs`
- `/services/google-tts-service.cjs`
