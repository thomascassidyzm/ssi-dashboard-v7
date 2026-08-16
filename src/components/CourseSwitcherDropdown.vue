<template>
  <div class="course-switcher" ref="dropdownRef">
    <button class="course-button" @click="toggleDropdown">
      <span class="course-code" :class="{ 'create-mode': isCreateMode }">{{ buttonCode }}</span>
      <span class="course-name" :class="{ 'create-mode': isCreateMode }">{{ buttonName }}</span>
      <svg class="dropdown-arrow" :class="{ open: dropdownOpen }" width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M3 5L6 8L9 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>

    <div v-if="dropdownOpen" class="dropdown-menu">
      <input
        ref="searchInput"
        v-model="searchQuery"
        type="text"
        placeholder="Search courses by code or name…"
        class="search-input"
        @keydown.escape="closeDropdown"
      />
      <div class="course-list">
        <button class="course-option new-course-option" @click="createNewCourse">
          <span class="option-code create-mode">+ New</span>
          <span class="option-name create-mode">Create Course</span>
        </button>
        <div class="course-list-divider"></div>
        <button
          v-for="course in filteredCourses"
          :key="course.code"
          class="course-option"
          :class="{ current: course.code === currentCode }"
          @click="selectCourse(course.code)"
        >
          <span class="option-code">{{ course.code }}</span>
          <span class="option-name">{{ course.name }}</span>
        </button>
        <div v-if="filteredCourses.length === 0 && !loading" class="no-results">
          No courses found
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useCourses } from '../composables/useCourses'
import { searchCourses } from '../utils/courseSearch'

const route = useRoute()
const router = useRouter()
const { courses, loading, loadCourses, getCourseName } = useCourses()

const dropdownOpen = ref(false)
const dropdownRef = ref(null)
const searchInput = ref(null)
const searchQuery = ref('')

const currentCode = computed(() => route.params.courseCode || null)
const isCreateMode = computed(() => currentCode.value === 'new')

const buttonCode = computed(() => {
  if (isCreateMode.value) return '+ New'
  return currentCode.value || 'Select'
})

const buttonName = computed(() => {
  if (isCreateMode.value) return 'Create Course'
  if (currentCode.value) return getCourseName(currentCode.value)
  return 'Choose course...'
})

const filteredCourses = computed(() =>
  searchCourses(searchQuery.value, courses.value, { getName: getCourseName })
)

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
  router.push(`/production/${code}`)
}

function createNewCourse() {
  closeDropdown()
  router.push('/production/new/text')
}

function handleClickOutside(event) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    closeDropdown()
  }
}

onMounted(() => {
  loadCourses()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.course-switcher {
  position: relative;
}

.course-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  background: var(--color-slate, var(--surface-2));
  border: 1px solid var(--color-graphite, var(--surface-3));
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.course-button:hover {
  border-color: var(--color-tungsten, var(--accent));
}

.course-code {
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  font-size: 0.8125rem;
  color: var(--color-tungsten, var(--accent));
}

.course-name {
  font-size: 0.8125rem;
  color: var(--color-paper-dim, var(--muted));
}

.create-mode {
  color: #10b981;
}

:root[data-theme="light"] .create-mode {
  color: var(--accent-2);
}

.dropdown-arrow {
  color: var(--color-paper-dim, var(--muted));
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
  background: var(--color-slate, var(--surface-2));
  border: 1px solid var(--color-graphite, var(--surface-3));
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  z-index: 9999;
  overflow: hidden;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem;
  background: var(--color-shadow, var(--surface));
  border: none;
  border-bottom: 1px solid var(--color-graphite, var(--surface-3));
  color: var(--color-paper, var(--ink));
  font-size: 0.875rem;
  outline: none;
}

.search-input::placeholder {
  color: var(--color-paper-muted, var(--faint));
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
  background: var(--color-shadow, var(--surface));
}

.course-option.current {
  background: var(--color-shadow, var(--surface));
}

.option-code {
  font-family: var(--font-mono, 'JetBrains Mono', monospace);
  font-size: 0.8125rem;
  color: var(--color-tungsten, var(--accent));
}

.option-name {
  font-size: 0.75rem;
  color: var(--color-paper-dim, var(--muted));
}

.no-results {
  padding: 1rem;
  text-align: center;
  color: var(--color-paper-muted, var(--faint));
  font-size: 0.875rem;
}

.course-list-divider {
  height: 1px;
  background: var(--color-shadow, var(--surface));
  margin: 0.25rem 0;
}

.new-course-option:hover {
  background: rgba(16, 185, 129, 0.1);
}

@media (max-width: 900px) {
  .course-name {
    display: none;
  }
}

/* Light-mode separation: dark mode untouched.
   Tokens (light): surface #fff, line #cbd5e1, surface-2 #f1f5f9, surface-3 #e2e8f0. */
:root[data-theme="light"] .course-button {
  background: var(--surface);
  border-color: var(--line);
}

:root[data-theme="light"] .dropdown-menu {
  background: var(--surface);
  border-color: var(--line);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.16);
}

:root[data-theme="light"] .search-input {
  background: var(--surface);
  border-bottom-color: var(--line);
}

/* Hover/current must be DARKER than the white menu in light mode. */
:root[data-theme="light"] .course-option:hover,
:root[data-theme="light"] .course-option.current {
  background: var(--surface-2);
}

:root[data-theme="light"] .course-list-divider {
  background: var(--line);
}
</style>
