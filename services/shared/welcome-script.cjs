/**
 * THE WORDS OF A COURSE WELCOME — the one place a course's welcome script is built.
 *
 * The welcome is the long known-language introduction a learner hears once, on first load (the player reads
 * course_audio role='welcome' for the course). Its words are a per-KNOWN-language template with three
 * target-language slots: welcome-templates/<known>.json { template, in_known, targets: { <target>: {...} } }.
 * Those templates are Kai's bulk-audio translations (scripts/bulk-audio/data/translations/welcomes at 7d0da74e3,
 * gitignored and absent from production Popty, which is why the welcome renderer there returned null); they are
 * tracked here so the render route (role 'welcome', services/shared/audio-render-entry.cjs) and the dashboard's
 * shared-audio status read the same words.
 *
 * A dialect course looks up its variety first and falls back to the base language (ara_lb_for_eng →
 * targets.ara_lb, else targets.ara), as the bulk tool did. zho courses use the cmn files and keys.
 * No template, or no slot for the target → null: there is no welcome to say, and nothing is invented.
 */
const fs = require('fs')
const path = require('path')

const TEMPLATE_DIR = path.join(__dirname, 'welcome-templates')
/** Course language codes that differ from the template naming (both sides, as apply-welcomes-to-courses.cjs did). */
const LANG_ALIAS = { zho: 'cmn' }
const alias = (l) => LANG_ALIAS[l] || l

/** "ara_lb_for_eng" with target ara, known eng → "lb"; "" when the course is the plain pair. */
function targetSuffix(courseCode, knownLang, targetLang) {
  const m = new RegExp(`^${targetLang}(?:_(.+?))?_for_${knownLang}(?:_(.+))?$`).exec(String(courseCode || ''))
  return (m && m[1]) || ''
}

const cache = new Map()
function loadTemplate(knownLang, dir = TEMPLATE_DIR) {
  const key = `${dir}\u001f${alias(knownLang)}`
  if (!cache.has(key)) {
    const p = path.join(dir, `${alias(knownLang)}.json`)
    cache.set(key, fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null)
  }
  return cache.get(key)
}

/** Pure. Fill a template's slots; null when the target has none. */
function fillWelcome(data, targetLang, suffix = '') {
  if (!data || !data.template || !data.targets) return null
  const t = alias(targetLang)
  const slots = (suffix && data.targets[`${t}_${suffix}`]) || data.targets[t]
  if (!slots) return null
  return data.template
    .replace(/\{a_target_speaker\}/g, slots.a_target_speaker || '')
    .replace(/\{in_target\}/g, slots.in_target || '')
    .replace(/\{target_speakers\}/g, slots.target_speakers || '')
    .replace(/\{in_known\}/g, data.in_known || '')
}

/** The welcome script for a course row { course_code, known_lang, target_lang }, or null. */
function welcomeScriptFor(course, { dir } = {}) {
  if (!course || !course.known_lang || !course.target_lang) return null
  return fillWelcome(loadTemplate(course.known_lang, dir), course.target_lang, targetSuffix(course.course_code, course.known_lang, course.target_lang))
}

module.exports = { welcomeScriptFor, fillWelcome, targetSuffix, TEMPLATE_DIR }
