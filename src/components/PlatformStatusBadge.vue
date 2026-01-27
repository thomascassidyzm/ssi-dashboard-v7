<template>
  <div class="platform-status-badge" :class="statusClass">
    <span class="status-dot"></span>
    <span class="status-text">{{ displayText }}</span>
    <div v-if="editable" class="dropdown-wrapper" ref="dropdownWrapper">
      <button class="dropdown-trigger" @click="toggleDropdown">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M3 5L6 8L9 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <div v-if="dropdownOpen" class="dropdown-menu">
        <button
          v-for="option in statusOptions"
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
    default: 'not_available',
    validator: v => ['not_available', 'draft', 'testing', 'beta', 'released', 'deprecated'].includes(v)
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
    default: ''
  }
})

const emit = defineEmits(['update'])

const dropdownOpen = ref(false)
const dropdownWrapper = ref(null)

const statusOptions = [
  { value: 'not_available', label: 'N/A' },
  { value: 'draft', label: 'Draft' },
  { value: 'testing', label: 'Testing' },
  { value: 'beta', label: 'Beta' },
  { value: 'released', label: 'Released' },
  { value: 'deprecated', label: 'Deprecated' }
]

const statusLabels = {
  not_available: 'N/A',
  draft: 'Draft',
  testing: 'Testing',
  beta: 'Beta',
  released: 'Released',
  deprecated: 'Deprecated'
}

const statusClass = computed(() => `status-${props.status}`)

const displayText = computed(() => {
  let label = statusLabels[props.status] || props.status
  if (props.status === 'beta' && props.betaDays !== null) {
    label += ` (${props.betaDays}d)`
  }
  return label
})

function toggleDropdown() {
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

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

/* Status colors */
.status-not_available {
  background: rgba(100, 116, 139, 0.15);
  color: #64748b;
}
.status-not_available .status-dot { background: #64748b; }

.status-draft {
  background: rgba(71, 85, 105, 0.15);
  color: #94a3b8;
}
.status-draft .status-dot { background: #94a3b8; }

.status-testing {
  background: rgba(234, 179, 8, 0.15);
  color: #eab308;
}
.status-testing .status-dot { background: #eab308; }

.status-beta {
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
}
.status-beta .status-dot {
  background: #3b82f6;
  animation: pulse 2s ease-in-out infinite;
}

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
  background: #1e293b;
  border: 1px solid #334155;
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
  color: #94a3b8;
  font-size: 0.75rem;
  text-align: left;
  transition: background 0.15s;
}

.dropdown-option:hover {
  background: #334155;
}

.dropdown-option.active {
  background: rgba(59, 130, 246, 0.2);
  color: #f1f5f9;
}

.option-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.option-dot.status-not_available { background: #64748b; }
.option-dot.status-draft { background: #94a3b8; }
.option-dot.status-testing { background: #eab308; }
.option-dot.status-beta { background: #3b82f6; }
.option-dot.status-released { background: #10b981; }
.option-dot.status-deprecated { background: #ef4444; }
</style>
