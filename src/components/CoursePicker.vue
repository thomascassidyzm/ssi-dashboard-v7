<template>
  <!-- Reusable searchable course picker (v-model). Lifts the search UX from
       CourseSwitcherDropdown but EMITS the chosen code instead of navigating,
       so any view can use it as a plain form control.

       Tom, 2026-08-29, of the Voice Lab's native <select> of 149 courses:
       "this is a nightmare to parse - and it is not even alphabetical by
       either target or known language". Three things answer that here, and
       every view already using this picker gets them: the list is ordered by
       TARGET language name then KNOWN, a type-to-filter search sits at the top,
       and the same KNOWN / TARGET dropdowns the Course Library uses narrow it.
       The filter chrome wears the shared `.ui-*` tokens (src/assets/ui-tokens.css)
       so the picker matches the page it opens on instead of approximating it. -->
  <div class="course-picker" ref="dropdownRef">
    <button type="button" class="course-button" @click="toggleDropdown">
      <span class="course-code">{{ modelValue || 'Select' }}</span>
      <span class="course-name">{{ buttonName }}</span>
      <svg class="dropdown-arrow" :class="{ open: dropdownOpen }" width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M3 5L6 8L9 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>

    <div v-if="dropdownOpen" class="dropdown-menu">
      <div class="picker-head">
        <input
          ref="searchInput"
          v-model="searchQuery"
          type="text"
          :placeholder="placeholder"
          class="ui-search picker-search"
          @keydown.escape="closeDropdown"
        />
        <!-- KNOWN / TARGET, exactly as the Course Library offers them. Hidden
             when there is only one of either — a dropdown with one entry is
             furniture, not a filter. -->
        <div v-if="targetLangs.length > 1 || knownLangs.length > 1" class="ui-filter-row picker-filters">
          <!-- The label lives INSIDE the closed select ("Any target"), because a
               separate TARGET / KNOWN caption wraps to a second line at phone
               width and a two-line filter row costs more than it says. -->
          <select v-if="targetLangs.length > 1" v-model="targetFilter" class="ui-select" aria-label="Target language">
            <option value="">Any target</option>
            <option v-for="l in targetLangs" :key="l" :value="l">{{ languageName(l) }}</option>
          </select>
          <select v-if="knownLangs.length > 1" v-model="knownFilter" class="ui-select" aria-label="Known language">
            <option value="">Any known</option>
            <option v-for="l in knownLangs" :key="l" :value="l">{{ languageName(l) }}</option>
          </select>
          <span class="ui-count">{{ filteredCourses.length }}</span>
        </div>
      </div>
      <div class="course-list">
        <button
          v-for="course in filteredCourses"
          :key="course.code"
          type="button"
          class="course-option"
          :class="{ current: course.code === modelValue }"
          @click="selectCourse(course.code)"
        >
          <span class="option-name">{{ course.name || course.code }}</span>
          <span class="option-code">{{ course.code }}<template v-if="optionMeta"> · {{ optionMeta(course) }}</template></span>
        </button>
        <div v-if="filteredCourses.length === 0 && !loading" class="no-results">No courses found</div>
        <div v-if="loading" class="no-results">Loading…</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useCourses } from '../composables/useCourses'
import { searchCourses } from '../utils/courseSearch'
import { sortCourses, courseLangs, languageName } from '../utils/languageNames'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: 'Search courses by code or name…' },
  /**
   * An explicit list of `{ code, name? }` to choose from. Given, it wins and
   * nothing is fetched — the Voice Lab picks from the courses its own backend
   * says have text, which is a smaller list than the estate's.
   */
  courses: { type: Array, default: null },
  /** Optional second line beside the code, e.g. "1,204 seeds". */
  optionMeta: { type: Function, default: null },
})
const emit = defineEmits(['update:modelValue'])

const { courses: allCourses, loading: loadingAll, loadCourses, getCourseName } = useCourses()

const dropdownOpen = ref(false)
const dropdownRef = ref(null)
const searchInput = ref(null)
const searchQuery = ref('')
const knownFilter = ref('')
const targetFilter = ref('')

const supplied = computed(() => Array.isArray(props.courses))
const loading = computed(() => (supplied.value ? false : loadingAll.value))

const buttonName = computed(() => (props.modelValue ? getCourseName(props.modelValue) : 'Choose course…'))

/**
 * THE DEFAULT ORDER. Alphabetical by target language name, then by known — so
 * every "X for English Speakers" groups together and the eye can find a
 * language. It sorts on the DISPLAY names, never the codes: the codes put
 * `zho` beside `zul` while the words put "Chinese" beside "Cornish", and it is
 * the words that are on the screen.
 */
const ordered = computed(() => {
  const list = supplied.value ? props.courses : allCourses.value
  return sortCourses(list).map((c) => {
    // POPTY NAMES COURSES IN ENGLISH. A supplied list may carry the DB's
    // `display_name`, which is the learner app's LOCALIZED label — the Voice
    // Lab's own list hands over "现代标准阿拉伯语" for ara_for_zho, and a list
    // sorted on English names but printed in six scripts reads as unsorted.
    // Localization belongs to ssi-learning-app; here the code is resolved
    // through languageNames and the supplied name is only a fallback.
    const english = getCourseName(c.code)
    return english && english !== c.code ? { ...c, name: english } : c
  })
})

const knownLangs = computed(() =>
  [...new Set(ordered.value.map((c) => courseLangs(c.code).known).filter(Boolean))]
    .sort((a, b) => languageName(a).localeCompare(languageName(b), 'en'))
)
const targetLangs = computed(() =>
  [...new Set(ordered.value.map((c) => courseLangs(c.code).target).filter(Boolean))]
    .sort((a, b) => languageName(a).localeCompare(languageName(b), 'en'))
)

const narrowed = computed(() =>
  ordered.value.filter((c) => {
    const { target, known } = courseLangs(c.code)
    if (targetFilter.value && target !== targetFilter.value) return false
    if (knownFilter.value && known !== knownFilter.value) return false
    return true
  })
)

// An empty query returns the list untouched, which is why the ORDER above is
// the thing that matters; a typed query is ranked by relevance instead.
const filteredCourses = computed(() =>
  searchCourses(searchQuery.value, narrowed.value, { getName: getCourseName })
)

// A filter that leaves nothing is a dead end you cannot see the cause of, so
// drop it rather than show an empty list.
watch(targetLangs, (langs) => { if (targetFilter.value && !langs.includes(targetFilter.value)) targetFilter.value = '' })
watch(knownLangs, (langs) => { if (knownFilter.value && !langs.includes(knownFilter.value)) knownFilter.value = '' })

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
  // Nothing to fetch when the caller brought its own list.
  if (!supplied.value) loadCourses()
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
  max-width: 100%;
}
.course-button:hover { border-color: var(--color-tungsten, var(--accent)); }
.course-code { font-family: var(--font-mono, 'JetBrains Mono', monospace); font-size: 0.8125rem; color: var(--color-tungsten, var(--accent)); }
.course-name { font-size: 0.8125rem; color: var(--color-paper-dim, var(--muted)); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dropdown-arrow { color: var(--color-paper-dim, var(--muted)); transition: transform 0.2s; flex: none; }
.dropdown-arrow.open { transform: rotate(180deg); }
.dropdown-menu {
  position: absolute; top: calc(100% + 4px); left: 0;
  /* A fixed 320px menu hangs off the side of a phone. Take the width you can
     have, never more than the viewport. */
  width: 340px; max-width: calc(100vw - 2rem);
  background: var(--color-slate, var(--surface-2));
  border: 1px solid var(--color-graphite, var(--surface-3));
  border-radius: 8px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4); z-index: 9999; overflow: hidden;
}
.picker-head {
  padding: 0.6rem; display: flex; flex-direction: column; gap: 0.5rem;
  border-bottom: 1px solid var(--color-graphite, var(--surface-3));
  background: var(--color-shadow, var(--surface));
}
.picker-search { font-size: 0.875rem; padding: 0.55rem 0.75rem; }
.picker-filters { gap: 0.4rem; }
.picker-filters .ui-select { max-width: 45%; }
.course-list { max-height: 320px; overflow-y: auto; -webkit-overflow-scrolling: touch; }
.course-option {
  width: 100%; display: flex; flex-direction: column; align-items: flex-start; gap: 0.1rem;
  /* Thumb-sized: this list is scrolled on a phone as often as clicked on a Mac. */
  min-height: 44px; justify-content: center;
  padding: 0.5rem 1rem; background: transparent; border: none; cursor: pointer;
  transition: background 0.15s; text-align: left; color: inherit;
}
.course-option:hover, .course-option.current { background: var(--color-shadow, var(--surface)); }
.course-option.current { box-shadow: inset 2px 0 0 var(--accent-2, var(--accent)); }
.option-code { font-family: var(--font-mono, 'JetBrains Mono', monospace); font-size: 0.72rem; color: var(--color-paper-muted, var(--faint)); }
.option-name { font-size: 0.85rem; color: var(--color-paper, var(--ink)); }
.no-results { padding: 1rem; text-align: center; color: var(--color-paper-muted, var(--faint)); font-size: 0.875rem; }

@media (max-width: 640px) {
  .dropdown-menu { width: min(340px, calc(100vw - 2rem)); }
  .course-list { max-height: 46vh; }
}

:root[data-theme="light"] .course-button { background: var(--surface); border-color: var(--line); }
:root[data-theme="light"] .dropdown-menu { background: var(--surface); border-color: var(--line); box-shadow: 0 8px 24px rgba(15, 23, 42, 0.16); }
:root[data-theme="light"] .picker-head { background: var(--surface-2); border-bottom-color: var(--line); }
:root[data-theme="light"] .course-option:hover, :root[data-theme="light"] .course-option.current { background: var(--surface-2); }
</style>
