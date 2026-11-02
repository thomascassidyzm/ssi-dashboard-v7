// services/shared/legacy-manifest-id.cjs
//
// The legacy export's courseConfigsId — the manifest `id` and file name the
// stage/publish path uses for a course (e.g. "en-es-mx" for spa_mx_for_eng).
//
// Dialect-aware on EITHER side of `_for_`:
//   spa_for_eng        → "en-es"        (no suffix)
//   spa_mx_for_eng     → "en-es-mx"     (target suffix)
//   fra_ca_for_eng     → "en-fr-ca"
//   eng_for_fra_ca     → "fr-ca-en"     (known suffix — hypothetical, no such course today)
//   cym_anthem_for_jpn → "ja-cy-anthem"
//
// services/phases/generate-legacy-manifest.cjs builds the manifest's own `id`
// with the same regex and the same join, so production-api's publish/UI path
// and the manifest agree. Per Ivan (2026-04-30) the dialect suffix lives ONLY
// in `id`; the manifest's `known`/`target` stay base language codes because
// stage parses them and crashes on "es-mx".

/** Split "fra_ca_for_eng" into its dialect suffixes given the course's base langs. */
function parseCourseCodeSuffixes(courseCode, knownDbLang, targetDbLang) {
  const re = new RegExp(`^${targetDbLang}(?:_(.+?))?_for_${knownDbLang}(?:_(.+))?$`)
  const m = courseCode.match(re)
  return { targetSuffix: m?.[1] || '', knownSuffix: m?.[2] || '' }
}

/**
 * @param {string} courseCode       e.g. "fra_ca_for_eng"
 * @param {string} knownDbLang      e.g. "eng" (course.known_lang)
 * @param {string} targetDbLang     e.g. "fra" (course.target_lang)
 * @param {string} knownLegacyCode  e.g. "en"  (after languageCodeService conversion)
 * @param {string} targetLegacyCode e.g. "fr"
 */
function buildCourseConfigsId(courseCode, knownDbLang, targetDbLang, knownLegacyCode, targetLegacyCode) {
  const { targetSuffix, knownSuffix } = parseCourseCodeSuffixes(courseCode, knownDbLang, targetDbLang)
  const knownPart = knownSuffix ? `${knownLegacyCode}-${knownSuffix}` : knownLegacyCode
  const targetPart = targetSuffix ? `${targetLegacyCode}-${targetSuffix}` : targetLegacyCode
  return `${knownPart}-${targetPart}`
}

module.exports = { parseCourseCodeSuffixes, buildCourseConfigsId }
