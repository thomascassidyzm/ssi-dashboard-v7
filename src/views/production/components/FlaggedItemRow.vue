<template>
  <div
    class="flagged-item-row bg-surface rounded-lg border border-line p-4 hover:border-amber-500 transition-colors"
  >
    <!-- Context Header -->
    <div class="item-context flex items-center gap-3 mb-3 text-xs text-faint">
      <span class="font-mono">{{ item.seedId }}</span>
      <span class="text-faint">→</span>
      <span class="font-mono">{{ item.legoId }}</span>
      <span class="text-faint">→</span>
      <span class="text-muted">{{ item.phraseId }}</span>
    </div>

    <!-- Main Content -->
    <div class="item-content flex items-center gap-4">
      <!-- Track Type Badge -->
      <div
        class="track-badge flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium min-w-[100px]"
        :class="trackBadgeClass"
      >
        <span>{{ trackLabel }}</span>
        <span v-if="item.track === 'target1'" class="voice-badge text-xs px-1 py-0.5 bg-pink-500 bg-opacity-30 rounded">F</span>
        <span v-if="item.track === 'target2'" class="voice-badge text-xs px-1 py-0.5 bg-blue-500 bg-opacity-30 rounded">M</span>
      </div>

      <!-- Text -->
      <div class="item-text flex-1 text-ink font-medium">
        {{ item.text }}
      </div>

      <!-- Flag Status Badge -->
      <div class="flag-status px-2 py-1 bg-amber-500 bg-opacity-20 text-amber-400 rounded text-xs font-medium">
        {{ formatStatus(item.status) }}
      </div>

      <!-- Actions -->
      <div class="item-actions flex items-center gap-2">
        <!-- Play Button -->
        <button
          @click="$emit('play', item)"
          class="p-2 rounded-lg bg-surface-2 hover:bg-surface-3 text-ink hover:text-ink transition-colors"
          title="Play audio"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>

        <!-- Edit Button -->
        <button
          @click="$emit('edit', item)"
          class="p-2 rounded-lg bg-surface-2 hover:bg-surface-3 text-ink hover:text-ink transition-colors"
          title="Edit phrase"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>

        <!-- Clear Flag Button -->
        <button
          @click="$emit('unflag', item)"
          class="p-2 rounded-lg bg-emerald-500 bg-opacity-20 hover:bg-opacity-40 text-emerald-400 hover:text-emerald-300 transition-colors"
          title="Clear flag (mark as approved)"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Notes (if any) -->
    <div v-if="item.notes" class="item-notes mt-2 text-xs text-faint italic">
      {{ item.notes }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

// Types
interface FlaggedItem {
  uuid: string;
  seedId: string;
  legoId: string;
  phraseId: string;
  track: 'known' | 'target1' | 'target2';
  text: string;
  status: string;
  notes?: string;
  flaggedAt?: string;
  flaggedBy?: string;
}

// Props
const props = defineProps<{
  item: FlaggedItem;
}>();

// Emits
defineEmits<{
  play: [item: FlaggedItem];
  edit: [item: FlaggedItem];
  unflag: [item: FlaggedItem];
}>();

// Computed
const trackLabel = computed(() => {
  switch (props.item.track) {
    case 'known': return 'Known';
    case 'target1': return 'Target 1';
    case 'target2': return 'Target 2';
    default: return props.item.track;
  }
});

const trackBadgeClass = computed(() => {
  switch (props.item.track) {
    case 'known': return 'bg-surface-3 text-ink';
    case 'target1': return 'bg-pink-500 bg-opacity-20 text-pink-400';
    case 'target2': return 'bg-blue-500 bg-opacity-20 text-blue-400';
    default: return 'bg-surface-3 text-ink';
  }
});

// Methods
const formatStatus = (status: string): string => {
  // Convert status like 'flagged_regen_tts' to 'Regen TTS'
  return status
    .replace('flagged_', '')
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
</script>

<style scoped>
.flagged-item-row:hover {
  box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.3);
}
</style>
