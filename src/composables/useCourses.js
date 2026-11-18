import { ref, computed } from 'vue'
import api from '../services/api'
import { getApiUrl } from '../services/api'
import { isConfigured as isSupabaseConfigured, getAllCourses } from '../services/supabase'
import { useAuth } from './useAuth'


// Language and course display names live in ONE place: src/utils/languageNames.
// This composable used to keep its own map, which is how the Pennsylvania Dutch
// course reached the volunteers checking it as `PDC for English Speakers` — the
// map had never heard of the language. Every name Popty shows now comes from
// that util, and the two helpers below are the composable's window onto it.
//
// Popty (this dashboard) always renders course names in English. The database
// `display_name` is the localized native-language label used by the
// learner-facing app — never use it here. Localization belongs to
// ssi-learning-app, where the player picks names by interface language.
import { courseName, languageName, loadLanguageNames, nameVersion } from '../utils/languageNames'

// `pdc_for_eng` → "Pennsylvania Dutch for English Speakers".
function getCourseName(code) {
  // Touch the reactive dep so computeds re-evaluate when the API names land.
  void nameVersion.value
  return courseName(code)
}

// One language's own English name, dialect code first then base code, so
// cym_n → "Welsh (North)" and a plain cym → "Welsh". Views that print a
// language into a sentence use this rather than keeping their own table —
// the drafts strip said "machine-written cym" while a private table went
// unmaintained.
export function getLanguageName(code, fallback = '') {
  void nameVersion.value
  if (!code) return fallback
  const name = languageName(code)
  // An unknown code comes back unchanged; the caller's fallback wins there.
  return name === code ? (fallback || code) : name
}


// A course row's code, whichever field the source spelled it in
// (Supabase rows: course_code; the API proxy: code).
const codeOf = (c) => c.code || c.course_code || c.id
const EMPTY_STATS = { seeds: 0, completedSeeds: 0, legos: 0, phrases: 0, audio: 0 }

// Module-level singleton state — shared across all consumers
const courses = ref([])
const loading = ref(false)
let loaded = false
// One in-flight load, shared. AppNavbar and the CourseSwitcherDropdown it
// renders both call loadCourses() on mount, so the `loaded` flag alone never
// caught the second caller — it fires before the first fetch resolves, and
// every page paid for `courses?select=*` (~827 KB) twice.
let inflight = null

function loadCourses(force = false) {
  if (loaded && !force) return Promise.resolve()
  if (inflight && !force) return inflight
  inflight = runLoad().finally(() => { inflight = null })
  return inflight
}

async function runLoad() {
  loading.value = true
  try {
    // Ensure language names are loaded before mapping course names
    await loadLanguageNames()

    let courseList

    if (isSupabaseConfigured()) {
      // Direct Supabase — no ngrok round-trip. Rows carry `course_code`,
      // which the shaping below reads.
      courseList = await getAllCourses()
    } else {
      // Fallback: API proxy
      const baseUrl = getApiUrl()
      const res = await fetch(`${baseUrl}/api/courses`, {
        headers: {}
      })
      if (!res.ok) throw new Error(`Failed to load courses: ${res.status}`)
      const data = await res.json()
      courseList = data.courses || []
    }

    nameVersion.value++
    courses.value = courseList.map(c => ({
      code: codeOf(c),
      name: getCourseName(codeOf(c)),
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
      stats: c.stats || { ...EMPTY_STATS }
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
    getLanguageName
  }
}
