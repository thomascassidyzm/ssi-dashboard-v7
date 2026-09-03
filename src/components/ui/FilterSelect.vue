<template>
  <!--
    FilterSelect — the estate's ONE dropdown.

    Tom's standing ruling, 2026-09-03: "all dropdowns in popty, or in general in
    ANY of my work should have search/filter at the very top. we do NOT want
    people having to scan down a whole long list of choices."

    So: a drop-in replacement for a native <select> whose open panel puts a
    filter field at the TOP, autofocused, matching on the visible label AND on
    the value (course codes like `fra_for_eng` are what Tom types). Empty filter
    shows everything, exactly as a native select does.

    The filter appears automatically once the list is longer than
    `filterThreshold` (default 8) — that is what makes the rule hold for the
    NEXT dropdown someone adds rather than rotting into a per-call-site habit.
    A two- or three-way toggle renders as a plain tappable list, no filter.

    Interaction is TAP AND TYPE only: no drag, no swipe, no long-press.
  -->
  <div class="fs-root" ref="rootRef">
    <button
      type="button"
      class="fs-button"
      :class="buttonClass"
      :disabled="disabled"
      :aria-expanded="open ? 'true' : 'false'"
      aria-haspopup="listbox"
      @click="toggle"
    >
      <span class="fs-button-label" :class="{ 'fs-placeholder': !selectedOption }">{{ buttonText }}</span>
      <svg class="fs-arrow" :class="{ open }" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>

    <!-- Teleported to <body> so an overflow:hidden card or a scroll container
         can never clip the panel the way it would a plain absolute element. -->
    <Teleport to="body">
      <div
        v-if="open"
        ref="panelRef"
        class="fs-panel"
        :style="panelStyle"
        role="listbox"
        @keydown.escape.stop.prevent="close"
      >
        <div v-if="showFilter" class="fs-filter-wrap">
          <input
            ref="filterRef"
            v-model="query"
            type="text"
            class="fs-filter"
            :placeholder="filterPlaceholder"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="none"
            spellcheck="false"
            @keydown.escape.stop.prevent="close"
            @keydown.enter.prevent="chooseFirst"
          />
        </div>

        <div class="fs-list">
          <template v-for="row in visibleRows" :key="row.key">
            <div v-if="row.type === 'group'" class="fs-group">{{ row.label }}</div>
            <button
              v-else
              type="button"
              class="fs-option"
              :class="{ selected: isSelected(row.option), disabled: row.option.disabled }"
              role="option"
              :aria-selected="isSelected(row.option) ? 'true' : 'false'"
              :disabled="row.option.disabled"
              @click="choose(row.option)"
            >
              <span class="fs-option-label">{{ row.option.label }}</span>
              <span v-if="row.option.hint" class="fs-option-hint">{{ row.option.hint }}</span>
            </button>
          </template>
          <div v-if="!visibleRows.length" class="fs-empty">No matches</div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { filterOptions, normaliseOptions } from '../../utils/optionFilter'

const props = defineProps({
  modelValue: { type: [String, Number, Boolean, null], default: '' },
  /**
   * Either flat options — strings, or `{ value, label, hint?, disabled? }` —
   * or groups: `{ label, options: [...] }` (the optgroup shape).
   */
  options: { type: Array, default: () => [] },
  /** Button text when nothing is selected. */
  placeholder: { type: String, default: 'Select…' },
  /** Filter-field placeholder. */
  filterPlaceholder: { type: String, default: 'Type to filter…' },
  /** Show the filter field once there are more than this many options. */
  filterThreshold: { type: Number, default: 8 },
  disabled: { type: Boolean, default: false },
  /** Extra classes for the closed button, so call sites keep their own look. */
  buttonClass: { type: [String, Array, Object], default: '' },
  /** Panel width in px; defaults to the button's width, floored at 220. */
  panelWidth: { type: Number, default: 0 },
})

const emit = defineEmits(['update:modelValue', 'change'])

const open = ref(false)
const query = ref('')
const rootRef = ref(null)
const panelRef = ref(null)
const filterRef = ref(null)
const rect = ref({ top: 0, left: 0, width: 0, bottom: 0 })

const groups = computed(() => normaliseOptions(props.options))
const flatOptions = computed(() => groups.value.flatMap((g) => g.options))

const selectedOption = computed(() =>
  flatOptions.value.find((o) => sameValue(o.value, props.modelValue)) || null
)
const buttonText = computed(() => selectedOption.value?.label || props.placeholder)

const showFilter = computed(() => flatOptions.value.length > props.filterThreshold)

/** Rows to render: group headings interleaved with their surviving options. */
const visibleRows = computed(() => {
  const rows = []
  groups.value.forEach((group, gi) => {
    const matches = filterOptions(query.value, group.options)
    if (!matches.length) return
    if (group.label) rows.push({ type: 'group', label: group.label, key: `g${gi}` })
    matches.forEach((option, oi) => {
      rows.push({ type: 'option', option, key: `g${gi}o${oi}:${String(option.value)}` })
    })
  })
  return rows
})

const firstEnabled = computed(() =>
  visibleRows.value.find((r) => r.type === 'option' && !r.option.disabled)?.option || null
)

const panelStyle = computed(() => {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 0
  const vh = typeof window !== 'undefined' ? window.innerHeight : 0
  const width = props.panelWidth || Math.max(rect.value.width, 220)
  const maxLeft = Math.max(4, vw - width - 4)
  const style = {
    left: `${Math.min(Math.max(4, rect.value.left), maxLeft)}px`,
    width: `${width}px`,
  }
  // Flip above the button when there is no room below — a dropdown near the
  // bottom of a phone screen is otherwise a panel you cannot reach.
  const below = vh - rect.value.bottom
  if (below < 220 && rect.value.top > below) {
    style.bottom = `${Math.max(4, vh - rect.value.top + 4)}px`
    style.maxHeight = `${Math.max(160, rect.value.top - 12)}px`
  } else {
    style.top = `${rect.value.bottom + 4}px`
    style.maxHeight = `${Math.max(160, below - 12)}px`
  }
  return style
})

function sameValue(a, b) {
  if (a === b) return true
  if (a === null || a === undefined || b === null || b === undefined) return false
  return String(a) === String(b)
}

function isSelected(option) {
  return sameValue(option.value, props.modelValue)
}

function measure() {
  const el = rootRef.value
  if (!el) return
  const r = el.getBoundingClientRect()
  rect.value = { top: r.top, left: r.left, width: r.width, bottom: r.bottom }
}

function toggle() {
  if (props.disabled) return
  open.value ? close() : openPanel()
}

function openPanel() {
  query.value = ''
  measure()
  open.value = true
  nextTick(() => {
    filterRef.value?.focus()
    measure()
  })
  document.addEventListener('click', onDocClick, true)
  window.addEventListener('resize', onReflow)
  window.addEventListener('scroll', onReflow, true)
}

function close() {
  open.value = false
  query.value = ''
  document.removeEventListener('click', onDocClick, true)
  window.removeEventListener('resize', onReflow)
  window.removeEventListener('scroll', onReflow, true)
}

function choose(option) {
  if (option.disabled) return
  emit('update:modelValue', option.value)
  emit('change', option.value)
  close()
}

function chooseFirst() {
  if (firstEnabled.value) choose(firstEnabled.value)
}

function onDocClick(event) {
  const inRoot = rootRef.value?.contains(event.target)
  const inPanel = panelRef.value?.contains(event.target)
  if (!inRoot && !inPanel) close()
}

function onReflow() {
  measure()
}

watch(
  () => props.disabled,
  (isDisabled) => {
    if (isDisabled && open.value) close()
  }
)

onBeforeUnmount(close)

defineExpose({ open, query })
</script>

<style scoped>
.fs-root {
  position: relative;
  display: inline-block;
}
</style>


<style>
/* Button chrome sits at ZERO specificity (`:where`) on purpose: a call site
   that passes its own `button-class` — the pill `.ui-select` on the courses
   page, say — must be able to override this without an !important arms race. */
:where(.fs-button) {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
  min-height: 2rem;
  padding: 0.3rem 0.6rem;
  background: var(--surface, #1e293b);
  border: 1px solid var(--line, #334155);
  border-radius: 6px;
  color: var(--ink, #e2e8f0);
  font: inherit;
  font-size: 0.8125rem;
  text-align: left;
  cursor: pointer;
}

:where(.fs-button:disabled) {
  opacity: 0.5;
  cursor: not-allowed;
}

:where(.fs-button):focus-visible {
  outline: 2px solid var(--accent-2, var(--accent, #10b981));
  outline-offset: 1px;
}

:where(.fs-button-label) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:where(.fs-button-label.fs-placeholder) {
  color: var(--muted, #94a3b8);
}

:where(.fs-arrow) {
  flex: none;
  color: currentColor;
  opacity: 0.6;
  transition: transform 0.15s;
}

:where(.fs-arrow.open) {
  transform: rotate(180deg);
}

/* Unscoped: the panel is teleported to <body>, so scoped styles would not
   reach it. Class names are prefixed `fs-` to keep them out of everyone's way. */
.fs-panel {
  position: fixed;
  z-index: 10000;
  max-width: calc(100vw - 8px);
  background: var(--surface, #1e293b);
  border: 1px solid var(--line, #334155);
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
  overflow: hidden;
}

.fs-panel .fs-filter-wrap {
  padding: 0.5rem;
  border-bottom: 1px solid var(--line, #334155);
  background: var(--surface-2, #0f172a);
}

.fs-panel .fs-filter {
  width: 100%;
  padding: 0.45rem 0.6rem;
  background: var(--surface, #1e293b);
  border: 1px solid var(--line, #334155);
  border-radius: 6px;
  color: var(--ink, #e2e8f0);
  font-size: 0.875rem;
  outline: none;
}

.fs-panel .fs-filter:focus {
  border-color: var(--accent-2, var(--accent, #10b981));
}

.fs-panel {
  display: flex;
  flex-direction: column;
}

.fs-panel .fs-list {
  flex: 1 1 auto;
  max-height: min(60vh, 320px);
  overflow-y: auto;
}

.fs-panel .fs-group {
  padding: 0.4rem 0.75rem 0.2rem;
  font-size: 0.6875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--faint, #64748b);
}

.fs-panel .fs-option {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  width: 100%;
  padding: 0.55rem 0.75rem;
  background: transparent;
  border: none;
  color: var(--ink, #e2e8f0);
  font: inherit;
  font-size: 0.8125rem;
  text-align: left;
  cursor: pointer;
}

.fs-panel .fs-option:hover:not(.disabled),
.fs-panel .fs-option.selected {
  background: var(--surface-2, #0f172a);
}

.fs-panel .fs-option.disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.fs-panel .fs-option-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fs-panel .fs-option-hint {
  flex: none;
  font-size: 0.6875rem;
  color: var(--muted, #94a3b8);
}

.fs-panel .fs-empty {
  padding: 0.9rem 0.75rem;
  text-align: center;
  font-size: 0.8125rem;
  color: var(--muted, #94a3b8);
}
</style>
