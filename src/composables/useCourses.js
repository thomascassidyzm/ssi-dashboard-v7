import { ref, computed } from 'vue'
import api from '../services/api'
import { getApiUrl } from '../services/api'

// Hardcoded fallback for immediate use before API responds
const fallbackNames = {
  'eng': 'English', 'spa': 'Spanish', 'fra': 'French', 'deu': 'German',
  'ita': 'Italian', 'por': 'Portuguese', 'nld': 'Dutch', 'pol': 'Polish',
  'rus': 'Russian', 'cym': 'Welsh', 'gle': 'Irish', 'gla': 'Scottish Gaelic',
  'zho': 'Chinese', 'cmn': 'Mandarin', 'jpn': 'Japanese', 'kor': 'Korean',
  'ara': 'Arabic', 'hin': 'Hindi', 'tur': 'Turkish', 'swa': 'Swahili'
}

// Live language name map — starts with fallback, enriched from API
const languageNames = { ...fallbackNames }
let languagesLoaded = false

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
  } catch {
    // Fallback map is already populated — no-op
  }
}

// Fire immediately (non-blocking)
loadLanguageNames()

function getCourseName(code) {
  if (!code || !code.includes('_for_')) return code
  const [targetPart, knownPart] = code.split('_for_')
  const target = targetPart.split('_')[0] // strip dialect: spa_mx → spa
  const targetName = languageNames[target] || target.toUpperCase()
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
    const response = await api.course.list()
    const courseList = response.courses || []
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
    languageNames
  }
}
