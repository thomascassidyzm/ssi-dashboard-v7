import { ref, computed } from 'vue'
import api from '../services/api'
import { getApiUrl } from '../services/api'

// Hardcoded fallback for immediate use before API responds
const fallbackNames = {
  'eng': 'English', 'spa': 'Spanish (Spain)', 'fra': 'French', 'deu': 'German',
  'ita': 'Italian', 'por': 'Portuguese', 'nld': 'Dutch', 'pol': 'Polish',
  'rus': 'Russian', 'cym': 'Welsh', 'gle': 'Irish', 'gla': 'Scottish Gaelic',
  'zho': 'Chinese', 'cmn': 'Mandarin', 'jpn': 'Japanese', 'kor': 'Korean',
  'ara': 'Arabic', 'hin': 'Hindi', 'tur': 'Turkish', 'swa': 'Swahili',
  // Dialect variants
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

// Cache of course_code → display_name from the database
// Populated when courses are loaded, used as authoritative source
const courseDisplayNames = {}

function getCourseName(code) {
  // Touch reactive dep so computed properties re-evaluate when names load
  void nameVersion.value
  if (!code || !code.includes('_for_')) return code
  // Prefer display_name from database (handles cym_anthem, cym_n, etc.)
  if (courseDisplayNames[code]) return courseDisplayNames[code]
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

    // Fast path: fetch course metadata only (no stats — those load in background)
    const baseUrl = getApiUrl()
    const res = await fetch(`${baseUrl}/api/courses`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    if (!res.ok) throw new Error(`Failed to load courses: ${res.status}`)
    const data = await res.json()
    const courseList = data.courses || []

    // Populate display name cache for getCourseName() lookups
    for (const c of courseList) {
      const code = c.code || c.course_code || c.id
      if (c.display_name && code) courseDisplayNames[code] = c.display_name
    }
    nameVersion.value++
    courses.value = courseList.map(c => ({
      code: c.code || c.course_code || c.id,
      name: c.display_name || getCourseName(c.code || c.course_code || c.id),
      new_app_status: c.new_app_status,
      legacy_app_status: c.legacy_app_status,
      new_app_beta_days: c.new_app_beta_days,
      legacy_app_beta_days: c.legacy_app_beta_days,
      content_status: c.content_status,
      export_ready: c.export_ready || false,
      seed_count: c.seed_count,
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

const courseCount = computed(() => courses.value.length)

const inProductionCount = computed(() => {
  return courses.value.filter(c => {
    return c.stats?.seeds > 0 || c.stats?.completedSeeds > 0
  }).length
})

export function useCourses() {
  return {
    courses,
    loading,
    loadCourses,
    courseCount,
    inProductionCount,
    getCourseName,
    languageNames,
    courseDisplayNames
  }
}
