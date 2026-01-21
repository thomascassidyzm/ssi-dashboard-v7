<template>
  <div class="course-selector" ref="dropdownRef">
    <button class="course-button" @click="toggleDropdown">
      <span class="course-code">{{ currentCourseCode || 'Select' }}</span>
      <span class="course-name">{{ currentCourseName || 'Choose a course...' }}</span>
      <svg class="dropdown-arrow" :class="{ open: dropdownOpen }" width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M3 5L6 8L9 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>

    <div v-if="dropdownOpen" class="dropdown-menu">
      <input
        ref="searchInput"
        v-model="searchQuery"
        type="text"
        placeholder="Search courses..."
        class="search-input"
        @keydown.escape="closeDropdown"
      />
      <div class="course-list">
        <button
          v-for="course in filteredCourses"
          :key="course.code"
          class="course-option"
          :class="{ current: course.code === currentCourseCode }"
          @click="selectCourse(course.code)"
        >
          <span class="option-code">{{ course.code }}</span>
          <span class="option-name">{{ course.name }}</span>
        </button>
        <div v-if="filteredCourses.length === 0 && !isLoading" class="no-results">
          No courses found
        </div>
        <div v-if="isLoading" class="no-results">
          Loading courses...
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getApiUrl } from '@/services/api'

const route = useRoute()
const router = useRouter()

const dropdownOpen = ref(false)
const dropdownRef = ref(null)
const searchInput = ref(null)
const searchQuery = ref('')
const courses = ref([])
const isLoading = ref(false)

// Language name mapping
const languageNames = {
  'eng': 'English',
  'spa': 'Spanish',
  'fra': 'French',
  'deu': 'German',
  'ita': 'Italian',
  'por': 'Portuguese',
  'zho': 'Chinese',
  'jpn': 'Japanese',
  'kor': 'Korean',
  'ara': 'Arabic',
  'cym': 'Welsh',
  'gle': 'Irish'
}

// Get current course from route
const currentCourseCode = computed(() => {
  return route.params.courseCode || null
})

const currentCourseName = computed(() => {
  if (!currentCourseCode.value) return null
  return getCourseName(currentCourseCode.value)
})

// Compute course name from code
function getCourseName(code) {
  if (!code || !code.includes('_for_')) return code
  const [target, , known] = code.split('_')
  const targetName = languageNames[target] || target
  const knownName = languageNames[known] || known
  return `${targetName} for ${knownName}`
}

// Filtered courses based on search
const filteredCourses = computed(() => {
  if (!searchQuery.value) return courses.value
  const q = searchQuery.value.toLowerCase()
  return courses.value.filter(c =>
    c.code.toLowerCase().includes(q) ||
    c.name.toLowerCase().includes(q)
  )
})

function toggleDropdown() {
  dropdownOpen.value = !dropdownOpen.value
  if (dropdownOpen.value) {
    searchQuery.value = ''
    nextTick(() => searchInput.value?.focus())
  }
}

function closeDropdown() {
  dropdownOpen.value = false
  searchQuery.value = ''
}

function selectCourse(code) {
  closeDropdown()
  // Navigate to production suite for the selected course
  router.push(`/production/${code}`)
}

// Close dropdown when clicking outside
function handleClickOutside(event) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    closeDropdown()
  }
}

// Load available courses
async function loadCourses() {
  isLoading.value = true
  try {
    const hostname = window.location.hostname
    let apiBase = ''

    // Check localStorage first (EnvironmentSwitcher)
    const storedUrl = localStorage.getItem('api_base_url')
    if (storedUrl) {
      apiBase = storedUrl
    } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
      apiBase = 'http://localhost:3456'
    } else if (hostname.includes('ngrok')) {
      apiBase = '' // Relative URL
    }
    // For Vercel/other, apiBase stays empty (will fail without EnvironmentSwitcher)

    const response = await fetch(`${apiBase}/api/courses`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    if (response.ok) {
      const data = await response.json()
      const courseList = Array.isArray(data) ? data : data.courses || []
      courses.value = courseList.map(c => ({
        code: c.code || c.course_code || c.id,
        name: getCourseName(c.code || c.course_code || c.id)
      }))
    }
  } catch (err) {
    console.error('Failed to load courses:', err)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  loadCourses()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// Reload courses when environment changes (detected via localStorage)
watch(() => localStorage.getItem('api_base_url'), () => {
  loadCourses()
})
</script>

<style scoped>
.course-selector {
  position: relative;
}

.course-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  background: var(--color-slate, #334155);
  border: 1px solid var(--color-graphite, #475569);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  color: inherit;
}

.course-button:hover {
  border-color: var(--color-tungsten, #ffa630);
}

.course-code {
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  font-size: 0.8125rem;
  color: var(--color-tungsten, #ffa630);
}

.course-name {
  font-size: 0.8125rem;
  color: var(--color-paper-dim, #c1c1bb);
}

.dropdown-arrow {
  color: var(--color-paper-dim, #c1c1bb);
  transition: transform 0.2s;
}

.dropdown-arrow.open {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  width: 300px;
  background: var(--color-slate, #334155);
  border: 1px solid var(--color-graphite, #475569);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  overflow: hidden;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem;
  background: var(--color-shadow, #1e293b);
  border: none;
  border-bottom: 1px solid var(--color-graphite, #475569);
  color: var(--color-paper, #f7f7f2);
  font-size: 0.875rem;
  outline: none;
}

.search-input::placeholder {
  color: var(--color-paper-dim, #c1c1bb);
}

.course-list {
  max-height: 280px;
  overflow-y: auto;
}

.course-option {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.125rem;
  padding: 0.625rem 1rem;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 0.15s;
  text-align: left;
  color: inherit;
}

.course-option:hover {
  background: var(--color-shadow, #1e293b);
}

.course-option.current {
  background: var(--color-shadow, #1e293b);
}

.option-code {
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  font-size: 0.8125rem;
  color: var(--color-tungsten, #ffa630);
}

.option-name {
  font-size: 0.75rem;
  color: var(--color-paper-dim, #c1c1bb);
}

.no-results {
  padding: 1rem;
  text-align: center;
  color: var(--color-paper-dim, #c1c1bb);
  font-size: 0.875rem;
}

@media (max-width: 600px) {
  .course-name {
    display: none;
  }

  .dropdown-menu {
    width: 250px;
  }
}
</style>
