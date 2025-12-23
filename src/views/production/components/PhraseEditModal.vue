<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="visible"
        class="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
        @click.self="close"
      >
        <div class="modal-content bg-slate-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
          <!-- Header -->
          <div class="modal-header flex items-center justify-between px-6 py-4 border-b border-slate-700">
            <h3 class="text-lg font-semibold text-white">Edit Phrase</h3>
            <button
              @click="close"
              class="text-slate-400 hover:text-white transition-colors"
              title="Close (Esc)"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Body -->
          <div class="modal-body px-6 py-4 space-y-4">
            <!-- Known Text Field -->
            <div class="known-text-field space-y-2">
              <label for="known-text" class="block text-sm font-medium text-slate-300">
                Known Text
              </label>
              <textarea
                id="known-text"
                v-model="localKnownText"
                rows="2"
                class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                placeholder="Enter known language text..."
              />
            </div>

            <!-- Target Text Field -->
            <div class="target-text-field space-y-2">
              <label for="target-text" class="block text-sm font-medium text-slate-300">
                Target Text
              </label>
              <textarea
                id="target-text"
                v-model="localTargetText"
                rows="2"
                class="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                placeholder="Enter target language text..."
              />
            </div>

            <!-- Regeneration Checkbox -->
            <div class="regeneration-checkbox">
              <label
                class="flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer"
                :class="localFlagForRegeneration
                  ? 'border-amber-500 bg-amber-500 bg-opacity-10'
                  : 'border-slate-600 hover:border-slate-500'"
              >
                <input
                  v-model="localFlagForRegeneration"
                  type="checkbox"
                  class="w-4 h-4 text-amber-500 bg-slate-700 border-slate-600 rounded focus:ring-amber-500 focus:ring-offset-slate-800"
                />
                <div class="flex-1">
                  <div class="font-medium text-white">Flag for audio regeneration</div>
                  <div class="text-sm text-slate-400">
                    Mark this phrase to have its audio regenerated after text changes
                  </div>
                </div>
              </label>
            </div>
          </div>

          <!-- Footer -->
          <div class="modal-footer flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-700">
            <button
              @click="close"
              class="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              @click="save"
              :disabled="!hasChanges || isSaving"
              class="px-4 py-2 text-sm font-medium bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg v-if="isSaving" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{{ isSaving ? 'Saving...' : 'Save' }}</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue';

// Types
interface PhraseData {
  id: string;
  known_text: string;
  target_text: string;
}

// Props
const props = defineProps<{
  visible: boolean;
  phrase: PhraseData | null;
}>();

// Emits
const emit = defineEmits<{
  close: [];
  save: [data: { known_text: string; target_text: string; flag_for_regeneration: boolean }];
}>();

// State
const localKnownText = ref('');
const localTargetText = ref('');
const localFlagForRegeneration = ref(true);
const isSaving = ref(false);

// Computed
const hasChanges = computed(() => {
  if (!props.phrase) return false;
  return (
    localKnownText.value !== props.phrase.known_text ||
    localTargetText.value !== props.phrase.target_text
  );
});

// Methods
const close = () => {
  if (!isSaving.value) {
    emit('close');
  }
};

const save = () => {
  if (!hasChanges.value || isSaving.value) return;

  isSaving.value = true;

  emit('save', {
    known_text: localKnownText.value,
    target_text: localTargetText.value,
    flag_for_regeneration: localFlagForRegeneration.value
  });

  // Reset saving state after a short delay (parent will close the modal)
  setTimeout(() => {
    isSaving.value = false;
  }, 500);
};

// Watch for modal visibility changes
watch(() => props.visible, (newVisible) => {
  if (newVisible && props.phrase) {
    // Reset form when modal opens
    localKnownText.value = props.phrase.known_text || '';
    localTargetText.value = props.phrase.target_text || '';
    localFlagForRegeneration.value = true; // Default to checked
  }
});

// Watch for phrase changes
watch(() => props.phrase, (newPhrase) => {
  if (newPhrase && props.visible) {
    localKnownText.value = newPhrase.known_text || '';
    localTargetText.value = newPhrase.target_text || '';
    localFlagForRegeneration.value = true;
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
    save();
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

/* Custom Checkbox */
input[type="checkbox"] {
  accent-color: currentColor;
}
</style>
