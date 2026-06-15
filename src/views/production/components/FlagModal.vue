<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="visible"
        class="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
        @click.self="close"
      >
        <div class="modal-content bg-surface rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <!-- Header -->
          <div class="modal-header flex items-center justify-between px-6 py-4 border-b border-line">
            <h3 class="text-lg font-semibold text-ink">Flag Audio Sample</h3>
            <button
              @click="close"
              class="text-muted hover:text-ink transition-colors"
              title="Close (Esc)"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="modal-body px-6 py-4 space-y-4">
            <!-- Sample Info -->
            <div v-if="sample" class="sample-info bg-surface-2 rounded-lg p-4">
              <div class="text-sm text-ink space-y-1">
                <div><span class="font-medium">Text:</span> {{ sample.text }}</div>
                <div><span class="font-medium">UUID:</span> <code class="text-xs">{{ sample.uuid }}</code></div>
                <div><span class="font-medium">Voice:</span> {{ sample.voice_id }}</div>
              </div>
            </div>

            <!-- Flag Type Selection -->
            <div class="flag-type-selection space-y-3">
              <label class="block text-sm font-medium text-ink">What needs to be done?</label>

              <div class="space-y-2">
                <!-- Text Edit -->
                <label
                  class="flag-option flex items-start gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer"
                  :class="selectedFlagType === 'text_edit'
                    ? 'border-amber-500 bg-amber-500 bg-opacity-10'
                    : 'border-line hover:border-line'"
                >
                  <input
                    v-model="selectedFlagType"
                    type="radio"
                    value="text_edit"
                    class="mt-0.5 w-4 h-4 text-amber-500 focus:ring-amber-500 focus:ring-offset-surface"
                  />
                  <div class="flex-1">
                    <div class="font-medium text-ink">Text Edit Needed</div>
                    <div class="text-sm text-muted">The text contains an error or needs correction</div>
                  </div>
                </label>

                <!-- Regenerate TTS -->
                <label
                  class="flag-option flex items-start gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer"
                  :class="selectedFlagType === 'regen_tts'
                    ? 'border-emerald-500 bg-emerald-500 bg-opacity-10'
                    : 'border-line hover:border-line'"
                >
                  <input
                    v-model="selectedFlagType"
                    type="radio"
                    value="regen_tts"
                    class="mt-0.5 w-4 h-4 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-surface"
                  />
                  <div class="flex-1">
                    <div class="font-medium text-ink">Regenerate TTS</div>
                    <div class="text-sm text-muted">Audio quality issues - regenerate with TTS</div>
                  </div>
                </label>

                <!-- Human Recording Needed -->
                <label
                  class="flag-option flex items-start gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer"
                  :class="selectedFlagType === 'human_needed'
                    ? 'border-red-500 bg-red-500 bg-opacity-10'
                    : 'border-line hover:border-line'"
                >
                  <input
                    v-model="selectedFlagType"
                    type="radio"
                    value="human_needed"
                    class="mt-0.5 w-4 h-4 text-red-500 focus:ring-red-500 focus:ring-offset-surface"
                  />
                  <div class="flex-1">
                    <div class="font-medium text-ink">Human Recording Needed</div>
                    <div class="text-sm text-muted">TTS not suitable - needs human voice recording</div>
                  </div>
                </label>
              </div>
            </div>

            <!-- Notes Field -->
            <div class="notes-field space-y-2">
              <label for="flag-notes" class="block text-sm font-medium text-ink">
                Notes <span class="text-faint">(optional but recommended)</span>
              </label>
              <textarea
                id="flag-notes"
                v-model="notes"
                rows="3"
                class="w-full px-3 py-2 bg-surface-2 border border-line rounded-lg text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                placeholder="Describe the issue (e.g., 'Pronunciation of quiero sounds unnatural')"
              />
            </div>
          </div>

          <!-- Footer -->
          <div class="modal-footer flex items-center justify-end gap-3 px-6 py-4 border-t border-line">
            <button
              @click="close"
              class="px-4 py-2 text-sm font-medium text-ink hover:text-ink transition-colors"
            >
              Cancel
            </button>
            <button
              @click="submit"
              :disabled="!selectedFlagType || isSubmitting"
              class="px-4 py-2 text-sm font-medium bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg v-if="isSubmitting" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{{ isSubmitting ? 'Submitting...' : 'Submit Flag' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
import type { AudioSample, FlagType } from '@/types/production';

// Props
const props = defineProps<{
  visible: boolean;
  sample?: AudioSample;
  initialFlagType?: FlagType;
  initialNotes?: string;
}>();

// Emits
const emit = defineEmits<{
  close: [];
  submit: [data: { flagType: FlagType; notes: string }];
}>();

// State
const selectedFlagType = ref<FlagType | ''>('');
const notes = ref('');
const isSubmitting = ref(false);

// Methods
const close = () => {
  if (!isSubmitting.value) {
    emit('close');
  }
};

const submit = () => {
  if (!selectedFlagType.value || isSubmitting.value) return;

  isSubmitting.value = true;

  emit('submit', {
    flagType: selectedFlagType.value as FlagType,
    notes: notes.value
  });

  // Reset after a short delay (parent will close the modal)
  setTimeout(() => {
    isSubmitting.value = false;
  }, 500);
};

// Watch for modal visibility changes
watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    // Reset form when modal opens
    selectedFlagType.value = props.initialFlagType || '';
    notes.value = props.initialNotes || '';
  }
});

// Keyboard shortcuts
const handleKeydown = (event: KeyboardEvent) => {
  if (!props.visible) return;

  if (event.key === 'Escape') {
    event.preventDefault();
    close();
  } else if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault();
    submit();
  }
};

// Add keyboard listener on mount
onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

// Cleanup on unmount
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
/* Modal Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform 0.2s ease;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.95);
}

/* Custom Radio Buttons */
input[type="radio"] {
  accent-color: currentColor;
}
</style>
