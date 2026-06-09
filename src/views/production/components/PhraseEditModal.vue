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
            <h3 class="text-lg font-semibold text-white">{{ mode === 'lego' ? 'Edit LEGO' : 'Edit Phrase' }}</h3>
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

            <!-- Audio Regeneration Section -->
            <div class="regeneration-section space-y-3">
              <div class="section-header flex items-center justify-between">
                <label class="block text-sm font-medium text-slate-300">
                  Which roles to regenerate
                </label>
                <button
                  @click="toggleAllFlags"
                  class="text-xs text-slate-400 hover:text-white transition-colors"
                >
                  {{ allFlagsSelected ? 'Deselect All' : 'Select All' }}
                </button>
              </div>

              <!-- Known Audio Checkbox -->
              <label
                v-if="phrase?.known_audio_uuid"
                class="audio-flag-row flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer"
                :class="regenFlags.known
                  ? 'border-slate-500 bg-slate-500 bg-opacity-10'
                  : 'border-slate-600 hover:border-slate-500'"
              >
                <input
                  v-model="regenFlags.known"
                  type="checkbox"
                  class="w-4 h-4 text-slate-400 bg-slate-700 border-slate-600 rounded focus:ring-slate-500 focus:ring-offset-slate-800"
                />
                <div class="flex-1 flex items-center gap-2">
                  <span class="text-sm font-medium text-slate-300">Known</span>
                  <span class="text-xs text-slate-500 truncate">{{ localKnownText }}</span>
                </div>
              </label>

              <!-- Target 1 Audio Checkbox (Female) -->
              <label
                v-if="phrase?.target1_audio_uuid"
                class="audio-flag-row flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer"
                :class="regenFlags.target1
                  ? 'border-pink-500 bg-pink-500 bg-opacity-10'
                  : 'border-slate-600 hover:border-slate-500'"
              >
                <input
                  v-model="regenFlags.target1"
                  type="checkbox"
                  class="w-4 h-4 text-pink-500 bg-slate-700 border-slate-600 rounded focus:ring-pink-500 focus:ring-offset-slate-800"
                />
                <div class="flex-1 flex items-center gap-2">
                  <span class="text-sm font-medium text-pink-400">Target 1</span>
                  <span class="voice-badge text-xs text-pink-400 px-1.5 py-0.5 bg-pink-500 bg-opacity-20 rounded">F</span>
                  <span class="text-xs text-slate-500 truncate">{{ localTargetText }}</span>
                </div>
              </label>

              <!-- Target 2 Audio Checkbox (Male) -->
              <label
                v-if="phrase?.target2_audio_uuid"
                class="audio-flag-row flex items-center gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer"
                :class="regenFlags.target2
                  ? 'border-blue-500 bg-blue-500 bg-opacity-10'
                  : 'border-slate-600 hover:border-slate-500'"
              >
                <input
                  v-model="regenFlags.target2"
                  type="checkbox"
                  class="w-4 h-4 text-blue-500 bg-slate-700 border-slate-600 rounded focus:ring-blue-500 focus:ring-offset-slate-800"
                />
                <div class="flex-1 flex items-center gap-2">
                  <span class="text-sm font-medium text-blue-400">Target 2</span>
                  <span class="voice-badge text-xs text-blue-400 px-1.5 py-0.5 bg-blue-500 bg-opacity-20 rounded">M</span>
                  <span class="text-xs text-slate-500 truncate">{{ localTargetText }}</span>
                </div>
              </label>

              <!-- No audio warning -->
              <div
                v-if="!phrase?.known_audio_uuid && !phrase?.target1_audio_uuid && !phrase?.target2_audio_uuid"
                class="text-sm text-slate-500 italic p-3 bg-slate-700 bg-opacity-50 rounded-lg"
              >
                No audio files available for this phrase yet.
              </div>

              <!-- Hint text -->
              <p class="text-xs text-slate-500">
                Defaults to the role(s) whose text you changed. Saving regenerates the
                checked role(s) directly to new audio (auto-approved) — audition below.
              </p>
            </div>

            <!-- Inline Audition Area (auto-approve preview) -->
            <div
              v-if="auditionActive"
              class="audition-section space-y-2 pt-2 border-t border-slate-700"
            >
              <label class="block text-sm font-medium text-slate-300">Fresh audio</label>
              <div
                v-for="role in auditionRoles"
                :key="role.key"
                class="audition-row flex items-center gap-3 p-2 rounded-lg bg-slate-700 bg-opacity-40"
              >
                <span
                  class="text-xs font-medium px-1.5 py-0.5 rounded"
                  :class="role.badgeClass"
                >{{ role.label }}</span>

                <!-- Regenerating -->
                <span
                  v-if="role.state === 'regenerating'"
                  class="flex items-center gap-2 text-xs text-slate-400"
                >
                  <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Regenerating…
                </span>

                <!-- Ready: preview -->
                <template v-else-if="role.state === 'ready' && role.url">
                  <span class="text-emerald-400 text-xs flex items-center gap-1">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <button
                    @click="playAudition(role.key)"
                    class="flex items-center gap-1.5 px-2 py-1 text-xs font-medium bg-slate-600 text-white rounded hover:bg-slate-500 transition-colors"
                    title="Play preview"
                  >
                    <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    preview
                  </button>
                  <span v-if="role.durationMs" class="text-xs text-slate-500">{{ (role.durationMs / 1000).toFixed(1) }}s</span>
                </template>

                <!-- Ready but no preview URL (regen ok, signed-URL fetch failed) -->
                <span v-else-if="role.state === 'ready'" class="flex items-center gap-1 text-xs text-emerald-400">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Regenerated (preview unavailable)
                </span>

                <!-- Failed -->
                <span v-else-if="role.state === 'error'" class="text-xs text-red-400">
                  {{ role.error || 'Regeneration failed' }}
                </span>
              </div>
              <audio ref="auditionAudioEl" class="hidden" />
            </div>
          </div>

          <!-- Footer -->
          <div class="modal-footer px-6 py-4 border-t border-slate-700">
            <!-- Success state -->
            <div v-if="saveSuccess" class="flex items-center justify-between">
              <div class="flex items-center gap-2 text-emerald-400">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span class="text-sm font-medium">Saved &amp; regenerated</span>
              </div>
              <div class="flex items-center gap-3">
                <button
                  @click="() => { window.location.reload(); }"
                  class="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                >
                  Refresh page
                </button>
                <button
                  @click="close"
                  class="px-4 py-2 text-sm font-medium bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>

            <!-- Error state -->
            <div v-else-if="saveError" class="flex items-center justify-between">
              <div class="flex items-center gap-2 text-red-400">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span class="text-sm font-medium">{{ saveError }}</span>
              </div>
              <button
                @click="saveError = null"
                class="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Try again
              </button>
            </div>

            <!-- Default state -->
            <div v-else class="flex items-center justify-between">
              <div class="regen-summary text-xs text-slate-400">
                <span v-if="selectedRegenCount > 0">
                  {{ selectedRegenCount }} role{{ selectedRegenCount !== 1 ? 's' : '' }} will be regenerated
                </span>
                <span v-else>
                  No roles selected for regeneration
                </span>
              </div>
              <div class="flex items-center gap-3">
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
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed, onMounted, onUnmounted } from 'vue';

// Types
interface PhraseData {
  id: string;
  known_text: string;
  target_text: string;
  known_audio_uuid?: string;
  target1_audio_uuid?: string;
  target2_audio_uuid?: string;
}

interface RegenFlags {
  known: boolean;
  target1: boolean;
  target2: boolean;
}

// Props
const props = withDefaults(defineProps<{
  visible: boolean;
  phrase: PhraseData | null;
  mode?: 'phrase' | 'lego';
}>(), {
  mode: 'phrase',
});

// Emits
const emit = defineEmits<{
  close: [];
  save: [data: {
    known_text: string;
    target_text: string;
    regen_flags: RegenFlags;
  }];
}>();

// State
const localKnownText = ref('');
const localTargetText = ref('');
const regenFlags = reactive<RegenFlags>({
  known: false,
  target1: false,
  target2: false,
});
const isSaving = ref(false);
const saveSuccess = ref(false);
const saveError = ref<string | null>(null);

// --- Inline audition state (auto-approve preview) ---
type RoleKey = 'known' | 'target1' | 'target2';
type AuditionState = 'regenerating' | 'ready' | 'error';
interface AuditionRole {
  key: RoleKey;
  label: string;
  badgeClass: string;
  state: AuditionState;
  url: string | null;
  durationMs: number | null;
  error: string | null;
}
const auditionActive = ref(false);
const auditionRoles = ref<AuditionRole[]>([]);
const auditionAudioEl = ref<HTMLAudioElement | null>(null);

const ROLE_LABELS: Record<RoleKey, { label: string; badgeClass: string }> = {
  known: { label: 'Known', badgeClass: 'text-slate-300 bg-slate-500 bg-opacity-20' },
  target1: { label: 'Target 1 · F', badgeClass: 'text-pink-400 bg-pink-500 bg-opacity-20' },
  target2: { label: 'Target 2 · M', badgeClass: 'text-blue-400 bg-blue-500 bg-opacity-20' },
};

// Computed
const textChanged = computed(() => {
  if (!props.phrase) return false;
  return (
    localKnownText.value !== props.phrase.known_text ||
    localTargetText.value !== props.phrase.target_text
  );
});

const hasChanges = computed(() => {
  // Allow save if text changed OR any audio is selected for regeneration
  return textChanged.value || selectedRegenCount.value > 0;
});

const selectedRegenCount = computed(() => {
  let count = 0;
  if (regenFlags.known && props.phrase?.known_audio_uuid) count++;
  if (regenFlags.target1 && props.phrase?.target1_audio_uuid) count++;
  if (regenFlags.target2 && props.phrase?.target2_audio_uuid) count++;
  return count;
});

const allFlagsSelected = computed(() => {
  const availableFlags = [];
  if (props.phrase?.known_audio_uuid) availableFlags.push(regenFlags.known);
  if (props.phrase?.target1_audio_uuid) availableFlags.push(regenFlags.target1);
  if (props.phrase?.target2_audio_uuid) availableFlags.push(regenFlags.target2);
  return availableFlags.length > 0 && availableFlags.every(f => f);
});

// Methods
const close = () => {
  if (!isSaving.value) {
    emit('close');
  }
};

const toggleAllFlags = () => {
  const newValue = !allFlagsSelected.value;
  if (props.phrase?.known_audio_uuid) regenFlags.known = newValue;
  if (props.phrase?.target1_audio_uuid) regenFlags.target1 = newValue;
  if (props.phrase?.target2_audio_uuid) regenFlags.target2 = newValue;
};

const save = () => {
  if (!hasChanges.value || isSaving.value) return;

  isSaving.value = true;
  saveSuccess.value = false;
  saveError.value = null;

  emit('save', {
    known_text: localKnownText.value,
    target_text: localTargetText.value,
    regen_flags: { ...regenFlags }
  });
};

// Called by parent to report save result
const onSaveComplete = (success: boolean, error?: string) => {
  isSaving.value = false;
  if (success) {
    saveSuccess.value = true;
  } else {
    saveError.value = error || 'Save failed';
  }
};

// ── Inline audition: parent drives these as the regen flow progresses ──
// Parent calls beginAudition(roles) right after kicking off regeneration,
// then setAuditionResult(role, {url, durationMs}) / setAuditionError(role, msg)
// per role as the regenerate-phrase response lands.
const beginAudition = (roles: RoleKey[]) => {
  auditionActive.value = roles.length > 0;
  auditionRoles.value = roles.map(key => ({
    key,
    label: ROLE_LABELS[key].label,
    badgeClass: ROLE_LABELS[key].badgeClass,
    state: 'regenerating' as AuditionState,
    url: null,
    durationMs: null,
    error: null,
  }));
};

const setAuditionResult = (key: RoleKey, payload: { url: string | null; durationMs: number | null }) => {
  const role = auditionRoles.value.find(r => r.key === key);
  if (!role) return;
  role.state = 'ready';
  role.url = payload.url;
  role.durationMs = payload.durationMs;
};

const setAuditionError = (key: RoleKey, message: string) => {
  const role = auditionRoles.value.find(r => r.key === key);
  if (!role) return;
  role.state = 'error';
  role.error = message;
};

const playAudition = (key: RoleKey) => {
  const role = auditionRoles.value.find(r => r.key === key);
  if (!role?.url || !auditionAudioEl.value) return;
  auditionAudioEl.value.src = role.url;
  auditionAudioEl.value.play().catch(() => { /* user gesture / autoplay guard */ });
};

defineExpose({ onSaveComplete, beginAudition, setAuditionResult, setAuditionError });

const resetForm = (phrase: PhraseData) => {
  localKnownText.value = phrase.known_text || '';
  localTargetText.value = phrase.target_text || '';
  regenFlags.known = false;
  regenFlags.target1 = false;
  regenFlags.target2 = false;
  saveSuccess.value = false;
  saveError.value = null;
  auditionActive.value = false;
  auditionRoles.value = [];
};

// Watch for modal visibility changes
watch(() => props.visible, (newVisible) => {
  if (newVisible && props.phrase) resetForm(props.phrase);
});

// Watch for phrase changes
watch(() => props.phrase, (newPhrase) => {
  if (newPhrase && props.visible) resetForm(newPhrase);
});

// Auto-default the regen roles to the role(s) whose TEXT changed (D2):
//  - a known-text edit pre-checks `known`
//  - a target-text edit pre-checks `target1` + `target2` (two voices, same text)
// The user can still adjust before saving. We never auto-uncheck (so a manual
// tick the user added survives a subsequent text tweak), only auto-check on change.
watch(localKnownText, (val) => {
  if (!props.phrase) return;
  if (val !== props.phrase.known_text && props.phrase.known_audio_uuid) {
    regenFlags.known = true;
  }
});
watch(localTargetText, (val) => {
  if (!props.phrase) return;
  if (val !== props.phrase.target_text) {
    if (props.phrase.target1_audio_uuid) regenFlags.target1 = true;
    if (props.phrase.target2_audio_uuid) regenFlags.target2 = true;
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
