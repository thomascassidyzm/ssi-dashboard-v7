<template>
  <div class="platform-status-badge" :class="[statusClass, { locked: isLocked }]">
    <span class="status-dot"></span>
    <span class="status-text">{{ displayText }}</span>
    <!-- Lock icon for disabled Legacy badge -->
    <svg v-if="isLocked" class="lock-icon" width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
    </svg>
    <div v-if="editable && !isLocked" class="dropdown-wrapper" ref="dropdownWrapper">
      <button class="dropdown-trigger" @click.stop="toggleDropdown">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M3 5L6 8L9 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <div v-if="dropdownOpen" class="dropdown-menu">
        <button
          v-for="option in currentStatusOptions"
          :key="option.value"
          class="dropdown-option"
          :class="{ active: option.value === status }"
          @click="selectStatus(option.value)"
        >
          <span class="option-dot" :class="`status-${option.value}`"></span>
          <span class="option-label">{{ option.label }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  status: {
    type: String,
    default: 'not_available'
  },
  betaDays: {
    type: Number,
    default: null
  },
  editable: {
    type: Boolean,
    default: false
  },
  platform: {
    type: String,
    default: 'new_app',
    validator: v => ['new_app', 'legacy_app'].includes(v)
  },
  // For Legacy App: control locking based on New App status
  newAppStatus: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['update'])

const dropdownOpen = ref(false)
const dropdownWrapper = ref(null)

// Platform-specific status options
const newAppStatusOptions = [
  { value: 'not_available', label: 'N/A' },
  { value: 'draft', label: 'Draft' },
  { value: 'beta', label: 'Beta' },
  { value: 'live', label: 'Live' }
]

const legacyAppStatusOptions = [
  { value: 'not_available', label: 'N/A' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'testing', label: 'Testing' },
  { value: 'live', label: 'Live' }
]

// Select options based on platform
const currentStatusOptions = computed(() => {
  return props.platform === 'legacy_app' ? legacyAppStatusOptions : newAppStatusOptions
})

// Status labels for display (combined for backwards compatibility)
const statusLabels = {
  not_available: 'N/A',
  draft: 'Draft',
  submitted: 'Submitted',
  testing: 'Testing',
  beta: 'Beta',
  live: 'Live',
  // Legacy values for backwards compatibility
  released: 'Live',
  deprecated: 'Deprecated'
}

// Check if Legacy App should be locked
// Legacy is locked when New App is not yet at Beta or Live
const isLocked = computed(() => {
  if (props.platform !== 'legacy_app') return false
  if (!props.newAppStatus) return false
  // Legacy unlocks when New App is beta or live
  return !['beta', 'live'].includes(props.newAppStatus)
})

const statusClass = computed(() => {
  // Map legacy values
  let normalizedStatus = props.status
  if (normalizedStatus === 'released') normalizedStatus = 'live'
  return `status-${normalizedStatus}`
})

const displayText = computed(() => {
  let label = statusLabels[props.status] || props.status
  if (props.status === 'beta' && props.betaDays !== null) {
    label += ` (${props.betaDays}d)`
  }
  return label
})

function toggleDropdown() {
  if (isLocked.value) return
  dropdownOpen.value = !dropdownOpen.value
}

function selectStatus(value) {
  dropdownOpen.value = false
  if (value !== props.status) {
    emit('update', { platform: props.platform, status: value })
  }
}

function handleClickOutside(event) {
  if (dropdownWrapper.value && !dropdownWrapper.value.contains(event.target)) {
    dropdownOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.platform-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  position: relative;
}

.platform-status-badge.locked {
  opacity: 0.5;
  cursor: not-allowed;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.lock-icon {
  margin-left: 2px;
  opacity: 0.7;
}

/* Status colors */
.status-not_available {
  background: rgba(100, 116, 139, 0.15);
  color: var(--faint);
}
.status-not_available .status-dot { background: var(--faint); }

.status-draft {
  background: rgba(148, 163, 184, 0.15);
  color: var(--muted);
}
.status-draft .status-dot { background: var(--muted); }

.status-submitted {
  background: rgba(234, 179, 8, 0.15);
  color: #eab308;
}
.status-submitted .status-dot { background: #eab308; }

.status-testing {
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
}
.status-testing .status-dot { background: #3b82f6; }

.status-beta {
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
}
.status-beta .status-dot {
  background: #3b82f6;
  animation: pulse 2s ease-in-out infinite;
}

.status-live {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}
.status-live .status-dot { background: #10b981; }

/* Legacy value support */
.status-released {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}
.status-released .status-dot { background: #10b981; }

.status-deprecated {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}
.status-deprecated .status-dot { background: #ef4444; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Dropdown */
.dropdown-wrapper {
  position: relative;
}

.dropdown-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: inherit;
  opacity: 0.6;
  transition: opacity 0.15s;
  padding: 0;
}

.dropdown-trigger:hover {
  opacity: 1;
}

.dropdown-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  min-width: 120px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 100;
  overflow: hidden;
}

.dropdown-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--muted);
  font-size: 0.75rem;
  text-align: left;
  transition: background 0.15s;
}

.dropdown-option:hover {
  background: var(--surface-2);
}

.dropdown-option.active {
  background: rgba(59, 130, 246, 0.2);
  color: var(--ink);
}

.option-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.option-dot.status-not_available { background: var(--faint); }
.option-dot.status-draft { background: var(--muted); }
.option-dot.status-submitted { background: #eab308; }
.option-dot.status-testing { background: #3b82f6; }
.option-dot.status-beta { background: #3b82f6; }
.option-dot.status-live { background: #10b981; }
.option-dot.status-released { background: #10b981; }
.option-dot.status-deprecated { background: #ef4444; }

/* Light mode: the dark-tuned status hues fail WCAG AA as pill text on the
   pale 15% tint over white. Darken the text/dot hues (same hue family) so
   they pass; dark mode keeps the original brighter hues untouched. */
:root[data-theme="light"] .status-submitted { color: #8a6300; }
:root[data-theme="light"] .status-submitted .status-dot { background: #8a6300; }

:root[data-theme="light"] .status-testing { color: #1d4ed8; }
:root[data-theme="light"] .status-testing .status-dot { background: #1d4ed8; }

:root[data-theme="light"] .status-beta { color: #1d4ed8; }
:root[data-theme="light"] .status-beta .status-dot { background: #1d4ed8; }

:root[data-theme="light"] .status-live,
:root[data-theme="light"] .status-released { color: #047857; }
:root[data-theme="light"] .status-live .status-dot,
:root[data-theme="light"] .status-released .status-dot { background: #047857; }

:root[data-theme="light"] .status-deprecated { color: #b91c1c; }
:root[data-theme="light"] .status-deprecated .status-dot { background: #b91c1c; }

:root[data-theme="light"] .option-dot.status-submitted { background: #8a6300; }
:root[data-theme="light"] .option-dot.status-testing { background: #1d4ed8; }
:root[data-theme="light"] .option-dot.status-beta { background: #1d4ed8; }
:root[data-theme="light"] .option-dot.status-live,
:root[data-theme="light"] .option-dot.status-released { background: #047857; }
:root[data-theme="light"] .option-dot.status-deprecated { background: #b91c1c; }
</style>
