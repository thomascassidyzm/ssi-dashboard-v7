import { ref, computed } from 'vue'
import api from '../services/api'

// Language name mapping (ISO 639-3 codes) — single source of truth
const languageNames = {
  // Major European languages
  'eng': 'English', 'spa': 'Spanish', 'fra': 'French', 'deu': 'German',
  'ita': 'Italian', 'por': 'Portuguese', 'nld': 'Dutch', 'pol': 'Polish',
  'rus': 'Russian', 'ukr': 'Ukrainian', 'ces': 'Czech', 'slk': 'Slovak',
  'hun': 'Hungarian', 'ron': 'Romanian', 'bul': 'Bulgarian', 'hrv': 'Croatian',
  'srp': 'Serbian', 'slv': 'Slovenian', 'ell': 'Greek', 'tur': 'Turkish',
  'swe': 'Swedish', 'nor': 'Norwegian', 'dan': 'Danish', 'fin': 'Finnish',
  // Celtic languages
  'cym': 'Welsh', 'gle': 'Irish', 'gla': 'Scottish Gaelic', 'glv': 'Manx',
  'cor': 'Cornish', 'bre': 'Breton',
  // Asian languages
  'zho': 'Chinese', 'cmn': 'Mandarin', 'yue': 'Cantonese',
  'jpn': 'Japanese', 'kor': 'Korean', 'vie': 'Vietnamese',
  'tha': 'Thai', 'ind': 'Indonesian', 'msa': 'Malay', 'tgl': 'Tagalog',
  'hin': 'Hindi', 'ben': 'Bengali', 'tam': 'Tamil', 'tel': 'Telugu',
  // Middle Eastern languages
  'ara': 'Arabic', 'heb': 'Hebrew', 'fas': 'Persian', 'urd': 'Urdu',
  // African languages
  'swa': 'Swahili', 'zul': 'Zulu', 'xho': 'Xhosa', 'afr': 'Afrikaans',
  // Other languages
  'cat': 'Catalan', 'eus': 'Basque', 'lat': 'Latin', 'epo': 'Esperanto'
}

function getCourseName(code) {
  if (!code || !code.includes('_for_')) return code
  const [target, , known] = code.split('_')
  const targetName = languageNames[target] || target.toUpperCase()
  const knownName = languageNames[known] || known.toUpperCase()
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
