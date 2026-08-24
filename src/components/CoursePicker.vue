<template>
  <!-- Reusable searchable course picker (v-model). Lifts the search UX from
       CourseSwitcherDropdown but EMITS the chosen code instead of navigating,
       so any view can use it as a plain form control. -->
  <div class="course-picker" ref="dropdownRef">
    <button type="button" class="course-button" @click="toggleDropdown">
      <span class="course-code">{{ modelValue || 'Select' }}</span>
      <span class="course-name">{{ buttonName }}</span>
      <svg class="dropdown-arrow" :class="{ open: dropdownOpen }" width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M3 5L6 8L9 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>

    <div v-if="dropdownOpen" class="dropdown-menu">
      <input
        ref="searchInput"
        v-model="searchQuery"
        type="text"
        :placeholder="placeholder"
        class="search-input"
        @keydown.escape="closeDropdown"
      />
      <div class="course-list">
        <button
          v-for="course in filteredCourses"
          :key="course.code"
          type="button"
          class="course-option"
          :class="{ current: course.code === modelValue }"
          @click="selectCourse(course.code)"
        >
          <span class="option-code">{{ course.code }}</span>
          <span class="option-name">{{ course.name || getCourseName(course.code) }}</span>
        </button>
        <div v-if="filteredCourses.length === 0 && !loading" class="no-results">No courses found</div>
        <div v-if="loading" class="no-results">Loading…</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useCourses } from '../composables/useCourses'
import { searchCourses } from '../utils/courseSearch'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'Search courses by code or name…' },
})
const emit = defineEmits(['update:modelValue'])

const { courses, loading, loadCourses, getCourseName } = useCourses()

const dropdownOpen = ref(false)
const dropdownRef = ref(null)
const searchInput = ref(null)
const searchQuery = ref('')

const buttonName = computed(() => (props.modelValue ? getCourseName(props.modelValue) : 'Choose course…'))

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
  emit('update:modelValue', code)
  closeDropdown()
}
function handleClickOutside(event) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) closeDropdown()
}

onMounted(() => {
  loadCourses()
  document.addEventListener('click', handleClickOutside)
})
onUnmounted(() => document.removeEventListener('click', handleClickOutside))
</script>

<style scoped>
.course-picker { position: relative; }
.course-button {
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  background: var(--color-slate, var(--surface-2));
  border: 1px solid var(--color-graphite, var(--surface-3));
  border-radius: 6px; cursor: pointer; transition: all 0.2s;
}
.course-button:hover { border-color: var(--color-tungsten, var(--accent)); }
.course-code { font-family: var(--font-mono, 'JetBrains Mono', monospace); font-size: 0.8125rem; color: var(--color-tungsten, var(--accent)); }
.course-name { font-size: 0.8125rem; color: var(--color-paper-dim, var(--muted)); }
.dropdown-arrow { color: var(--color-paper-dim, var(--muted)); transition: transform 0.2s; }
.dropdown-arrow.open { transform: rotate(180deg); }
.dropdown-menu {
  position: absolute; top: calc(100% + 4px); left: 0; width: 320px;
  background: var(--color-slate, var(--surface-2));
  border: 1px solid var(--color-graphite, var(--surface-3));
  border-radius: 8px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4); z-index: 9999; overflow: hidden;
}
.search-input {
  width: 100%; padding: 0.75rem 1rem;
  background: var(--color-shadow, var(--surface)); border: none;
  border-bottom: 1px solid var(--color-graphite, var(--surface-3));
  color: var(--color-paper, var(--ink)); font-size: 0.875rem; outline: none;
}
.search-input::placeholder { color: var(--color-paper-muted, var(--faint)); }
.course-list { max-height: 320px; overflow-y: auto; }
.course-option {
  width: 100%; display: flex; flex-direction: column; align-items: flex-start; gap: 0.125rem;
  padding: 0.625rem 1rem; background: transparent; border: none; cursor: pointer;
  transition: background 0.15s; text-align: left; color: inherit;
}
.course-option:hover, .course-option.current { background: var(--color-shadow, var(--surface)); }
.option-code { font-family: var(--font-mono, 'JetBrains Mono', monospace); font-size: 0.8125rem; color: var(--color-tungsten, var(--accent)); }
.option-name { font-size: 0.75rem; color: var(--color-paper-dim, var(--muted)); }
.no-results { padding: 1rem; text-align: center; color: var(--color-paper-muted, var(--faint)); font-size: 0.875rem; }

:root[data-theme="light"] .course-button { background: var(--surface); border-color: var(--line); }
:root[data-theme="light"] .dropdown-menu { background: var(--surface); border-color: var(--line); box-shadow: 0 8px 24px rgba(15, 23, 42, 0.16); }
:root[data-theme="light"] .search-input { background: var(--surface); border-bottom-color: var(--line); }
:root[data-theme="light"] .course-option:hover, :root[data-theme="light"] .course-option.current { background: var(--surface-2); }
</style>
