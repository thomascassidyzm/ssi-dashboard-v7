<template>
  <div class="flag-menu-container" ref="menuContainer">
    <button
      class="flag-trigger"
      @click="toggleMenu"
      :class="{ 'has-flag': currentStatus !== 'pending' }"
    >
      <span class="flag-icon">{{ flagIcon }}</span>
      <span class="flag-label">{{ currentStatus === 'pending' ? 'Flag' : 'Flagged' }}</span>
    </button>

    <Transition name="menu-fade">
      <div v-if="isOpen" class="flag-dropdown">
        <div class="flag-dropdown-header">Flag Sample</div>

        <button
          v-for="option in flagOptions"
          :key="option.status"
          class="flag-option"
          :class="{ active: currentStatus === option.status }"
          @click="selectFlag(option)"
        >
          <span class="option-icon">{{ option.icon }}</span>
          <div class="option-content">
            <span class="option-label">{{ option.label }}</span>
            <span class="option-desc">{{ option.description }}</span>
          </div>
        </button>

        <div class="flag-divider"></div>

        <div class="flag-notes">
          <label class="notes-label">Notes (optional)</label>
          <textarea
            v-model="notes"
            class="notes-input"
            placeholder="Add context for this flag..."
            rows="2"
          ></textarea>
        </div>

        <div class="flag-actions">
          <button class="action-btn cancel" @click="closeMenu">Cancel</button>
          <button
            class="action-btn clear"
            v-if="currentStatus !== 'pending'"
            @click="clearFlag"
          >
            Clear Flag
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useProductionStore } from '@/stores/production'

const props = defineProps({
  uuid: { type: String, required: true },
  currentStatus: { type: String, default: 'pending' }
})

const emit = defineEmits(['flagged', 'cleared'])

const store = useProductionStore()
const isOpen = ref(false)
const notes = ref('')
const menuContainer = ref(null)

const flagOptions = [
  {
    status: 'flagged_regen_tts',
    icon: '🔄',
    label: 'Regenerate TTS',
    description: 'Send to audio pipeline for new TTS generation'
  },
  {
    status: 'flagged_human_needed',
    icon: '🎙️',
    label: 'Human Recording Needed',
    description: 'TTS inadequate, requires voice talent'
  },
  {
    status: 'rejected',
    icon: '❌',
    label: 'Reject',
    description: 'Mark as rejected, needs review'
  },
  {
    status: 'approved',
    icon: '✓',
    label: 'Approve',
    description: 'Mark as approved and complete'
  }
]

const flagIcon = computed(() => {
  if (props.currentStatus === 'pending') return '🏳️'
  const option = flagOptions.find(o => o.status === props.currentStatus)
  return option?.icon || '🚩'
})

function toggleMenu() {
  isOpen.value = !isOpen.value
}

function closeMenu() {
  isOpen.value = false
  notes.value = ''
}

async function selectFlag(option) {
  const success = await store.updateSampleFlag(props.uuid, {
    status: option.status,
    reason: option.label,
    notes: notes.value || undefined,
    flaggedBy: 'qa-reviewer' // TODO: Get from auth
  })

  if (success) {
    emit('flagged', { uuid: props.uuid, status: option.status })
    closeMenu()
  }
}

async function clearFlag() {
  const success = await store.updateSampleFlag(props.uuid, {
    status: 'pending',
    reason: null,
    notes: null
  })

  if (success) {
    emit('cleared', { uuid: props.uuid })
    closeMenu()
  }
}

// Close on outside click
function handleClickOutside(event) {
  if (menuContainer.value && !menuContainer.value.contains(event.target)) {
    closeMenu()
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
.flag-menu-container {
  position: relative;
  display: inline-block;
}

.flag-trigger {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: var(--color-slate, #334155);
  border: 1px solid var(--color-graphite, #475569);
  border-radius: 8px;
  color: var(--color-paper-dim, #c1c1bb);
  font-family: 'Josefin Sans', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.flag-trigger:hover {
  background: var(--color-graphite, #475569);
  border-color: var(--color-tungsten, #ffa630);
}

.flag-trigger.has-flag {
  background: rgba(255, 166, 48, 0.15);
  border-color: var(--color-tungsten, #ffa630);
  color: var(--color-tungsten, #ffa630);
}

.flag-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 280px;
  background: var(--color-shadow, #1e293b);
  border: 1px solid var(--color-graphite, #475569);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  z-index: 100;
  overflow: hidden;
}

.flag-dropdown-header {
  padding: 0.75rem 1rem;
  background: var(--color-slate, #334155);
  font-family: 'Josefin Sans', sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-paper-dim, #c1c1bb);
}

.flag-option {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem 1rem;
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s ease;
}

.flag-option:hover {
  background: var(--color-slate, #334155);
}

.flag-option.active {
  background: rgba(255, 166, 48, 0.1);
}

.option-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.option-content {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.option-label {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-paper, #f7f7f2);
}

.option-desc {
  font-size: 0.75rem;
  color: var(--color-paper-dim, #c1c1bb);
}

.flag-divider {
  height: 1px;
  background: var(--color-graphite, #475569);
  margin: 0.5rem 0;
}

.flag-notes {
  padding: 0.75rem 1rem;
}

.notes-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-paper-dim, #c1c1bb);
  margin-bottom: 0.5rem;
}

.notes-input {
  width: 100%;
  padding: 0.5rem;
  background: var(--color-void, #0f172a);
  border: 1px solid var(--color-graphite, #475569);
  border-radius: 6px;
  color: var(--color-paper, #f7f7f2);
  font-family: inherit;
  font-size: 0.85rem;
  resize: none;
}

.notes-input:focus {
  outline: none;
  border-color: var(--color-tungsten, #ffa630);
}

.flag-actions {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--color-slate, #334155);
}

.action-btn {
  flex: 1;
  padding: 0.5rem;
  border-radius: 6px;
  font-family: 'Josefin Sans', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn.cancel {
  background: transparent;
  border: 1px solid var(--color-graphite, #475569);
  color: var(--color-paper-dim, #c1c1bb);
}

.action-btn.cancel:hover {
  background: var(--color-graphite, #475569);
}

.action-btn.clear {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid #ef4444;
  color: #ef4444;
}

.action-btn.clear:hover {
  background: rgba(239, 68, 68, 0.25);
}

/* Transition */
.menu-fade-enter-active,
.menu-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.menu-fade-enter-from,
.menu-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
