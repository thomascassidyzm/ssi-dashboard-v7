/**
 * Helper: keep course_gender_expansions in sync when phrase target_text changes.
 *
 * gender-prep-coordinator runs Haiku across an entire course once and stores
 * results in course_gender_expansions. When a single phrase is later edited,
 * the cached expansion (keyed by old text) is orphaned. This helper runs a
 * single Haiku batch for the new text and upserts the result so the next
 * regen — bulk or single — picks up the fresh expansion.
 *
 * Two entry points:
 *   - refreshGenderExpansionForText(courseCode, text, language)
 *       Fire after a phrase edit. Async — meant to be backgrounded.
 *   - refreshGenderExpansionsForTexts(courseCode, texts, language)
 *       Bulk variant for backfill scripts. One Haiku batch call, one upsert.
 */
const supabaseClient = require('./supabase-client.cjs')
const genderHaikuService = require('./gender-haiku-service.cjs')

async function refreshGenderExpansionsForTexts(courseCode, texts, language) {
  if (!texts?.length) return { processed: 0, modified: 0 }
  if (!genderHaikuService.GENDERED_LANGUAGES.includes(language)) {
    return { processed: 0, modified: 0, skipped: 'not-gendered' }
  }

  // Build the two-roles-per-text item list
  const uniqueTexts = [...new Set(texts.filter(Boolean))]
  const items = []
  for (const text of uniqueTexts) {
    items.push({ text, language, role: 'target1' })
    items.push({ text, language, role: 'target2' })
  }

  // Run Haiku
  const resultMap = await genderHaikuService.batchGenderExpand(items)

  // Build upsert rows — match the schema gender-haiku-service.processAndStore uses
  const rows = []
  for (const text of uniqueTexts) {
    const f = resultMap.get(`${text}|${language}|target1`)
    const m = resultMap.get(`${text}|${language}|target2`)
    const expandedF = f?.wasModified ? f.expandedText : null
    const expandedM = m?.wasModified ? m.expandedText : null
    rows.push({
      course_code: courseCode,
      original_text: text,
      language,
      expanded_f: expandedF,
      expanded_m: expandedM
    })
  }

  const supabase = supabaseClient.getClient()
  // Two-step (delete + insert) to avoid relying on a specific unique constraint
  // — keeps this helper portable across schema revisions of the table.
  for (const row of rows) {
    await supabase
      .from('course_gender_expansions')
      .delete()
      .eq('course_code', courseCode)
      .eq('original_text', row.original_text)
      .eq('language', language)
  }
  const writable = rows.filter(r => r.expanded_f || r.expanded_m)
  if (writable.length > 0) {
    const { error } = await supabase.from('course_gender_expansions').insert(writable)
    if (error) throw error
  }

  return { processed: uniqueTexts.length, modified: writable.length }
}

async function refreshGenderExpansionForText(courseCode, text, language) {
  return refreshGenderExpansionsForTexts(courseCode, [text], language)
}

module.exports = {
  refreshGenderExpansionForText,
  refreshGenderExpansionsForTexts
}
