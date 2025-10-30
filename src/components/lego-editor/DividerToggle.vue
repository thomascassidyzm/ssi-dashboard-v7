<template>
  <div
    class="divider-toggle"
    :class="[
      active ? 'active' : 'inactive',
      { 'hover-state': hovering }
    ]"
    @click="handleClick"
    @mouseenter="hovering = true"
    @mouseleave="hovering = false"
    :title="active ? 'Click to merge LEGOs' : 'Click to split LEGO here'"
  >
    <div class="divider-line" :class="dividerClasses"></div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { DIVIDER_STYLES } from '../../utils/ColorMapper'

const props = defineProps({
  active: {
    type: Boolean,
    default: false
  },
  wordIndex: {
    type: Number,
    required: true
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['toggle'])

const hovering = ref(false)

const dividerClasses = computed(() => {
  if (props.disabled) return 'opacity-30 cursor-not-allowed'
  return props.active ? DIVIDER_STYLES.active : DIVIDER_STYLES.inactive
})

function handleClick() {
  if (props.disabled) return
  emit('toggle', props.wordIndex)
}
</script>

<style scoped>
.divider-toggle {
  @apply flex items-center justify-center px-1 relative;
  min-width: 12px;
  height: 100%;
}

.divider-line {
  @apply rounded-full;
  transition: all 0.2s ease;
}

.divider-toggle.active .divider-line {
  @apply bg-purple-500 shadow-lg;
  box-shadow: 0 0 8px rgba(168, 85, 247, 0.4);
}

.divider-toggle.inactive .divider-line {
  @apply bg-transparent;
}

.divider-toggle.inactive:hover .divider-line {
  @apply bg-purple-400/50;
}

.divider-toggle.hover-state.inactive .divider-line {
  @apply scale-110;
}

.divider-toggle.hover-state.active .divider-line {
  @apply scale-105;
}

/* Animation on toggle */
@keyframes pulse-divider {
  0%, 100% {
    opacity: 1;
    transform: scaleY(1);
  }
  50% {
    opacity: 0.7;
    transform: scaleY(1.2);
  }
}

.divider-toggle.active .divider-line {
  animation: pulse-divider 0.3s ease-out;
}
</style>
