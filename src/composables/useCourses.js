import { ref, computed } from 'vue'
import api from '../services/api'
import { getApiUrl } from '../services/api'
import { isConfigured as isSupabaseConfigured, getAllCourses } from '../services/supabase'
import { useAuth } from './useAuth'

// Hardcoded fallback for immediate use before API responds
const fallbackNames = {
  // Core
  'eng': 'English', 'spa': 'Spanish', 'fra': 'French', 'deu': 'German',
  'ita': 'Italian', 'por': 'Portuguese', 'nld': 'Dutch', 'pol': 'Polish',
  'rus': 'Russian', 'cym': 'Welsh', 'gle': 'Irish', 'gla': 'Scottish Gaelic',
  'zho': 'Chinese', 'cmn': 'Mandarin', 'jpn': 'Japanese', 'kor': 'Korean',
  'ara': 'Arabic', 'hin': 'Hindi', 'tur': 'Turkish', 'swa': 'Swahili',
  // Romance
  'ron': 'Romanian', 'cat': 'Catalan', 'eus': 'Basque', 'glg': 'Galician',
  // Germanic
  'swe': 'Swedish', 'nor': 'Norwegian', 'dan': 'Danish', 'fin': 'Finnish', 'isl': 'Icelandic',
  'nob': 'Norwegian (Bokmål)', 'nno': 'Norwegian (Nynorsk)',
  // Slavic
  'hrv': 'Croatian', 'srp': 'Serbian', 'bos': 'Bosnian', 'slv': 'Slovenian',
  'ces': 'Czech', 'slk': 'Slovak', 'ukr': 'Ukrainian', 'bul': 'Bulgarian', 'mkd': 'Macedonian',
  // Other European
  'ell': 'Greek', 'hun': 'Hungarian', 'heb': 'Hebrew', 'sqi': 'Albanian',
  'lit': 'Lithuanian', 'lav': 'Latvian', 'est': 'Estonian',
  // Asian
  'tha': 'Thai', 'vie': 'Vietnamese', 'ind': 'Indonesian', 'fil': 'Filipino',
  'ben': 'Bengali', 'urd': 'Urdu', 'tam': 'Tamil', 'tel': 'Telugu', 'msa': 'Malay',
  'yue': 'Cantonese',
  // Other
  'fas': 'Persian', 'kur': 'Kurdish', 'amh': 'Amharic', 'hau': 'Hausa',
  'yor': 'Yoruba', 'zul': 'Zulu', 'kat': 'Georgian', 'hye': 'Armenian',
  'bre': 'Breton', 'cor': 'Cornish',
  // Dialect variants
  'cym_n': 'Welsh (North)', 'cym_s': 'Welsh (South)',
  'por_br': 'Portuguese (Brazil)', 'spa_mx': 'Spanish (Mexico)',
  'ara_eg': 'Arabic (Egypt)', 'ara_sy': 'Arabic (Syria)',
  'deu_at': 'German (Austria)'
}

// Live language name map — starts with fallback, enriched from API
const languageNames = { ...fallbackNames }
let languagesLoaded = false

// Reactive version counter — bumped when language/display names change
// Forces computed properties that call getCourseName() to re-evaluate
const nameVersion = ref(0)

// Fetch full language name map from backend (CSV-backed, all ISO 639 codes)
async function loadLanguageNames() {
  if (languagesLoaded) return
  try {
    const baseUrl = getApiUrl()
    const res = await fetch(`${baseUrl}/api/languages?format=legacy`)
    if (!res.ok) return
    const languages = await res.json()
    for (const lang of languages) {
      if (lang.code && lang.name) {
        languageNames[lang.code] = lang.name
      }
    }
    languagesLoaded = true
    nameVersion.value++
  } catch {
    // Fallback map is already populated — no-op
  }
}

// Fire immediately (non-blocking)
loadLanguageNames()

// Popty (this dashboard) always renders course names in English.
// The database `display_name` is the localized native-language label used by
// the learner-facing app — never use it here. Localization belongs to
// ssi-learning-app, where the player picks names by interface language.
function getCourseName(code) {
  // Touch reactive dep so computed properties re-evaluate when names load
  void nameVersion.value
  if (!code || !code.includes('_for_')) return code
  const [targetPart, knownPart] = code.split('_for_')
  // Try full dialect code first (por_br, spa_mx), then base code (por, spa)
  const targetBase = targetPart.split('_')[0]
  const targetName = languageNames[targetPart] || languageNames[targetBase] || targetPart.toUpperCase()
  const knownName = languageNames[knownPart] || knownPart.toUpperCase()
  return `${targetName} for ${knownName} Speakers`
}

// Module-level singleton state — shared across all consumers
const courses = ref([])
const loading = ref(false)
let loaded = false

async function loadCourses(force = false) {
  if (loaded && !force) return
  loading.value = true
  try {
    // Ensure language names are loaded before mapping course names
    await loadLanguageNames()

    let courseList

    if (isSupabaseConfigured()) {
      // Direct Supabase — no ngrok round-trip
      const coursesData = await getAllCourses()
      courseList = coursesData.map(c => ({
        code: c.course_code,
        course_code: c.course_code,
        display_name: c.display_name,
        new_app_status: c.new_app_status,
        legacy_app_status: c.legacy_app_status,
        new_app_beta_started_at: c.new_app_beta_started_at,
        legacy_app_beta_started_at: c.legacy_app_beta_started_at,
        content_status: c.content_status,
        pricing_tier: c.pricing_tier || 'premium',
        seed_count: c.seed_count,
        created_at: c.created_at,
        updated_at: c.updated_at,
        stats: { seeds: 0, completedSeeds: 0, legos: 0, phrases: 0, audio: 0 }
      }))
    } else {
      // Fallback: API proxy
      const baseUrl = getApiUrl()
      const res = await fetch(`${baseUrl}/api/courses`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      })
      if (!res.ok) throw new Error(`Failed to load courses: ${res.status}`)
      const data = await res.json()
      courseList = data.courses || []
    }

    nameVersion.value++
    courses.value = courseList.map(c => ({
      code: c.code || c.course_code || c.id,
      name: getCourseName(c.code || c.course_code || c.id),
      new_app_status: c.new_app_status,
      legacy_app_status: c.legacy_app_status,
      new_app_beta_days: c.new_app_beta_days,
      legacy_app_beta_days: c.legacy_app_beta_days,
      content_status: c.content_status,
      pricing_tier: c.pricing_tier || 'premium',
      export_ready: c.export_ready || false,
      seed_count: c.seed_count,
      created_at: c.created_at || null,
      updated_at: c.updated_at || null,
      stats: c.stats || { seeds: 0, completedSeeds: 0, legos: 0, phrases: 0, audio: 0 }
    }))
    loaded = true
  } catch (err) {
    console.error('Failed to load courses:', err)
    courses.value = []
  } finally {
    loading.value = false
  }
}

// Filtered courses based on user's dashboard_courses access
const visibleCourses = computed(() => {
  const { canAccessCourse } = useAuth()
  return courses.value.filter(c => canAccessCourse(c.code))
})

const courseCount = computed(() => visibleCourses.value.length)

const inProductionCount = computed(() => {
  return visibleCourses.value.filter(c => {
    return c.stats?.seeds > 0 || c.stats?.completedSeeds > 0
  }).length
})

export function useCourses() {
  return {
    courses: visibleCourses,
    allCourses: courses, // unfiltered, for admin use if needed
    loading,
    loadCourses,
    courseCount,
    inProductionCount,
    getCourseName,
    languageNames
  }
}
