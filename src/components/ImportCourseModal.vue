<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="visible"
        class="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
        @click.self="close"
      >
        <div class="modal-content bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <!-- Header -->
          <div class="modal-header flex items-center justify-between px-6 py-4 border-b border-slate-700">
            <h3 class="text-lg font-semibold text-white">Import Legacy Course</h3>
            <button
              @click="close"
              class="text-slate-400 hover:text-white transition-colors"
              title="Close (Esc)"
              :disabled="isImporting || isValidating"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Step Indicators -->
          <div class="step-indicators flex justify-center gap-2 px-6 py-3 bg-slate-900">
            <div
              v-for="(label, idx) in stepLabels"
              :key="idx"
              class="step-indicator flex items-center gap-2"
            >
              <div
                class="step-dot w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors"
                :class="{
                  'bg-emerald-500 text-white': idx + 1 === currentStep,
                  'bg-emerald-600 text-white': idx + 1 < currentStep,
                  'bg-slate-700 text-slate-400': idx + 1 > currentStep
                }"
              >
                <svg v-if="idx + 1 < currentStep" class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                <span v-else>{{ idx + 1 }}</span>
              </div>
              <span
                class="text-sm hidden sm:inline"
                :class="{
                  'text-emerald-400': idx + 1 <= currentStep,
                  'text-slate-500': idx + 1 > currentStep
                }"
              >{{ label }}</span>
              <svg v-if="idx < stepLabels.length - 1" class="w-4 h-4 text-slate-600 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>

          <!-- Step 1: File Upload -->
          <div v-if="currentStep === 1" class="modal-body px-6 py-6">
            <div
              class="drop-zone border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer"
              :class="{
                'border-emerald-500 bg-emerald-500 bg-opacity-10': isDragging,
                'border-slate-600 hover:border-slate-500': !isDragging && !selectedFile,
                'border-emerald-600 bg-emerald-900 bg-opacity-30': selectedFile
              }"
              @dragenter.prevent="isDragging = true"
              @dragover.prevent="isDragging = true"
              @dragleave.prevent="isDragging = false"
              @drop.prevent="handleDrop"
              @click="triggerFileInput"
            >
              <div v-if="!selectedFile" class="upload-prompt">
                <div class="upload-icon text-5xl mb-4">📁</div>
                <p class="text-lg font-medium text-slate-200 mb-2">
                  {{ isDragging ? 'Drop your manifest here' : 'Drag & drop course manifest' }}
                </p>
                <p class="text-sm text-slate-400 mb-4">or click to browse (JSON file, up to 50MB)</p>
                <input
                  ref="fileInput"
                  type="file"
                  accept=".json"
                  class="hidden"
                  @change="handleFileSelect"
                />
              </div>

              <div v-else class="file-selected" @click.stop>
                <div class="file-icon text-5xl mb-4">📄</div>
                <p class="text-lg font-medium text-emerald-400 mb-1">{{ selectedFile.name }}</p>
                <p class="text-sm text-slate-400 mb-4">{{ formatFileSize(selectedFile.size) }}</p>
                <button
                  @click.stop="clearFile"
                  class="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
                >
                  Choose different file
                </button>
              </div>
            </div>

            <!-- Parse Error -->
            <div v-if="parseError" class="mt-4 p-4 bg-red-900 bg-opacity-30 border border-red-700 rounded-lg">
              <p class="text-red-400 text-sm">{{ parseError }}</p>
            </div>
          </div>

          <!-- Step 2: Validate (Dry Run) -->
          <div v-if="currentStep === 2" class="modal-body px-6 py-6">
            <!-- Validating State -->
            <div v-if="isValidating" class="validating-state text-center py-8">
              <div class="spinner w-12 h-12 mx-auto mb-4 border-4 border-slate-600 border-t-emerald-500 rounded-full animate-spin"></div>
              <p class="text-lg font-medium text-white">Validating Manifest...</p>
              <p class="text-sm text-slate-400 mt-1">Checking structure and analyzing content</p>
            </div>

            <!-- Validation Error -->
            <div v-else-if="validationError" class="validation-error space-y-4">
              <div class="error-header text-center">
                <div class="error-icon text-5xl mb-4">❌</div>
                <p class="text-xl font-semibold text-red-400">Validation Failed</p>
                <p class="text-sm text-slate-400 mt-1">{{ validationError }}</p>
              </div>
              <div class="p-4 bg-red-900 bg-opacity-30 border border-red-700 rounded-lg">
                <p class="text-red-300 text-sm">The manifest could not be validated. Please check the file format and try again.</p>
              </div>
            </div>

            <!-- Validation Success - Show Preview -->
            <div v-else-if="validationResult" class="preview-content space-y-4">
              <!-- Validation Status -->
              <div class="validation-status p-4 bg-emerald-900 bg-opacity-30 border border-emerald-700 rounded-lg">
                <div class="flex items-center gap-3">
                  <div class="status-icon text-2xl">✅</div>
                  <div>
                    <p class="text-emerald-400 font-medium">Manifest Validated Successfully</p>
                    <p class="text-emerald-300 text-sm">Ready to import - no changes have been made yet</p>
                  </div>
                </div>
              </div>

              <!-- Course Info -->
              <div class="course-info bg-slate-700 rounded-lg p-4">
                <h4 class="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">Course Details</h4>
                <div class="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span class="text-slate-400">Legacy ID:</span>
                    <span class="text-white ml-2">{{ validationResult.legacyId }}</span>
                  </div>
                  <div>
                    <span class="text-slate-400">Course Code:</span>
                    <span class="text-emerald-400 ml-2 font-mono">{{ validationResult.courseCode }}</span>
                  </div>
                  <div>
                    <span class="text-slate-400">Known Language:</span>
                    <span class="text-white ml-2">{{ validationResult.knownLang }}</span>
                  </div>
                  <div>
                    <span class="text-slate-400">Target Language:</span>
                    <span class="text-white ml-2">{{ validationResult.targetLang }}</span>
                  </div>
                  <div class="col-span-2">
                    <span class="text-slate-400">Display Name:</span>
                    <span class="text-white ml-2">{{ validationResult.displayName }}</span>
                  </div>
                </div>
              </div>

              <!-- Import Plan -->
              <div class="import-plan bg-slate-700 rounded-lg p-4">
                <h4 class="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">Import Plan</h4>
                <p class="text-slate-300 text-sm mb-3">The following records will be created or updated:</p>
                <div class="stats-grid grid grid-cols-2 gap-3">
                  <div class="stat-item flex justify-between p-2 bg-slate-800 rounded">
                    <span class="text-slate-400">Course Record</span>
                    <span class="text-emerald-400 font-medium">1</span>
                  </div>
                  <div class="stat-item flex justify-between p-2 bg-slate-800 rounded">
                    <span class="text-slate-400">Audio Samples</span>
                    <span class="text-emerald-400 font-medium">{{ validationResult.sampleCount?.toLocaleString() }}</span>
                  </div>
                  <div class="stat-item flex justify-between p-2 bg-slate-800 rounded">
                    <span class="text-slate-400">Seeds</span>
                    <span class="text-emerald-400 font-medium">{{ validationResult.seedCount?.toLocaleString() }}</span>
                  </div>
                  <div class="stat-item flex justify-between p-2 bg-slate-800 rounded">
                    <span class="text-slate-400">LEGOs</span>
                    <span class="text-emerald-400 font-medium">{{ validationResult.legoCount?.toLocaleString() }}</span>
                  </div>
                  <div class="stat-item flex justify-between p-2 bg-slate-800 rounded">
                    <span class="text-slate-400">Practice Phrases</span>
                    <span class="text-emerald-400 font-medium">{{ validationResult.phraseCount?.toLocaleString() }}</span>
                  </div>
                  <div class="stat-item flex justify-between p-2 bg-slate-800 rounded">
                    <span class="text-slate-400">Shared Audio</span>
                    <span class="text-emerald-400 font-medium">{{ (validationResult.orderedEncouragements || 0) + (validationResult.pooledEncouragements || 0) }}</span>
                  </div>
                </div>
              </div>

              <!-- Options -->
              <div class="import-options bg-slate-700 rounded-lg p-4">
                <h4 class="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">Import Options</h4>
                <label class="flex items-start gap-3 cursor-pointer">
                  <input
                    v-model="clearFirst"
                    type="checkbox"
                    class="mt-1 w-4 h-4 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-800 rounded"
                  />
                  <div>
                    <div class="text-white font-medium">Clear existing data first</div>
                    <div class="text-sm text-slate-400">Delete all existing data for this course before importing. Recommended for re-imports.</div>
                  </div>
                </label>
              </div>

              <!-- Course Exists Warning -->
              <div v-if="validationResult.courseExists" class="warning-box p-4 bg-amber-900 bg-opacity-30 border border-amber-700 rounded-lg">
                <div class="flex gap-3">
                  <span class="text-amber-400 text-xl">⚠️</span>
                  <div>
                    <p class="text-amber-400 font-medium">Course already exists in database</p>
                    <p class="text-amber-300 text-sm">Records will be upserted (updated if exists, inserted if new). Consider enabling "Clear existing data first" for a clean re-import.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 3: Import Progress & Results -->
          <div v-if="currentStep === 3" class="modal-body px-6 py-6">
            <!-- Progress -->
            <div v-if="isImporting" class="import-progress space-y-4">
              <div class="progress-header text-center">
                <div class="spinner w-12 h-12 mx-auto mb-4 border-4 border-slate-600 border-t-emerald-500 rounded-full animate-spin"></div>
                <p class="text-lg font-medium text-white">Importing Course...</p>
                <p class="text-sm text-slate-400 mt-1">{{ importStatus.message || 'Starting import...' }}</p>
              </div>

              <div class="progress-bar-container bg-slate-700 rounded-full h-2 overflow-hidden">
                <div
                  class="progress-bar bg-emerald-500 h-full transition-all duration-300"
                  :style="{ width: `${(importStatus.step / 8) * 100}%` }"
                ></div>
              </div>

              <p class="text-center text-sm text-slate-500">Step {{ importStatus.step || 1 }} of 8</p>
            </div>

            <!-- Results -->
            <div v-else-if="importResult" class="import-results space-y-4">
              <!-- Success -->
              <div v-if="importResult.success" class="result-header text-center">
                <div class="success-icon text-5xl mb-4">🎉</div>
                <p class="text-xl font-semibold text-emerald-400">Import Complete!</p>
                <p class="text-sm text-slate-400 mt-1">{{ importResult.courseCode }} - {{ importResult.displayName }}</p>
              </div>

              <!-- Error -->
              <div v-else class="result-header text-center">
                <div class="error-icon text-5xl mb-4">❌</div>
                <p class="text-xl font-semibold text-red-400">Import Failed</p>
                <p class="text-sm text-slate-400 mt-1">{{ importResult.error }}</p>
              </div>

              <!-- Import Stats -->
              <div v-if="importResult.success && importResult.statistics" class="result-stats bg-slate-700 rounded-lg p-4">
                <h4 class="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">Imported Records</h4>
                <div class="stats-list space-y-2 text-sm">
                  <div class="flex justify-between">
                    <span class="text-slate-400">Courses</span>
                    <span class="text-emerald-400">{{ importResult.statistics.courses }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-slate-400">Audio Samples</span>
                    <span class="text-emerald-400">{{ importResult.statistics.course_audio?.toLocaleString() }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-slate-400">Seeds</span>
                    <span class="text-emerald-400">{{ importResult.statistics.course_seeds?.toLocaleString() }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-slate-400">LEGOs</span>
                    <span class="text-emerald-400">{{ importResult.statistics.course_legos?.toLocaleString() }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-slate-400">Practice Phrases</span>
                    <span class="text-emerald-400">{{ importResult.statistics.course_practice_phrases?.toLocaleString() }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-slate-400">LEGO Introductions</span>
                    <span class="text-emerald-400">{{ importResult.statistics.lego_introductions?.toLocaleString() }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="modal-footer flex items-center justify-between px-6 py-4 border-t border-slate-700">
            <button
              v-if="currentStep > 1 && !isImporting && !isValidating && !importResult?.success"
              @click="prevStep"
              class="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Back
            </button>
            <div v-else></div>

            <div class="flex gap-3">
              <button
                v-if="!isImporting && !isValidating && !importResult?.success"
                @click="close"
                class="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Cancel
              </button>

              <!-- Step 1: Validate -->
              <button
                v-if="currentStep === 1 && selectedFile"
                @click="runValidation"
                :disabled="isValidating"
                class="px-4 py-2 text-sm font-medium bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span>Validate Manifest</span>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <!-- Step 2: Re-validate or Start Import -->
              <template v-if="currentStep === 2 && !isValidating">
                <button
                  v-if="validationError"
                  @click="runValidation"
                  class="px-4 py-2 text-sm font-medium bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors"
                >
                  Retry Validation
                </button>
                <button
                  v-if="validationResult"
                  @click="startImport"
                  class="px-4 py-2 text-sm font-medium bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-2"
                >
                  <span>Start Import</span>
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </button>
              </template>

              <!-- Step 3: Done -->
              <button
                v-if="currentStep === 3 && importResult && !isImporting"
                @click="handleDone"
                class="px-4 py-2 text-sm font-medium bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
              >
                {{ importResult.success ? 'Done' : 'Close' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

// Props
const props = defineProps<{
  visible: boolean;
}>();

// Emits
const emit = defineEmits<{
  close: [];
  imported: [courseCode: string];
}>();

// Get API base URL
function getApiBaseUrl(): string {
  const storedUrl = localStorage.getItem('api_base_url');
  if (storedUrl) return storedUrl;

  const isVercel = typeof window !== 'undefined' && (
    window.location.hostname.includes('vercel.app') ||
    window.location.hostname === 'popty.app' ||
    window.location.hostname.endsWith('.popty.app')
  );
  if (isVercel) return '';

  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456';
}

// State
const currentStep = ref(1);
const stepLabels = ['Upload', 'Validate', 'Import'];

// Step 1 state
const selectedFile = ref<File | null>(null);
const isDragging = ref(false);
const parseError = ref('');
const parsedManifest = ref<any>(null);
const fileInput = ref<HTMLInputElement | null>(null);

// Step 2 state
const isValidating = ref(false);
const validationError = ref('');
const validationResult = ref<{
  legacyId: string;
  courseCode: string;
  knownLang: string;
  targetLang: string;
  displayName: string;
  sampleCount: number;
  seedCount: number;
  legoCount: number;
  phraseCount: number;
  orderedEncouragements: number;
  pooledEncouragements: number;
  courseExists: boolean;
} | null>(null);

const clearFirst = ref(false);

// Step 3 state
const isImporting = ref(false);
const importStatus = ref({ step: 0, message: '' });
const importResult = ref<{
  success: boolean;
  courseCode?: string;
  displayName?: string;
  error?: string;
  statistics?: {
    courses: number;
    course_audio: number;
    course_seeds: number;
    course_legos: number;
    course_practice_phrases: number;
    lego_introductions: number;
  };
} | null>(null);

// Methods
function close() {
  if (!isImporting.value && !isValidating.value) {
    emit('close');
    // Reset state after close
    setTimeout(() => {
      currentStep.value = 1;
      selectedFile.value = null;
      parseError.value = '';
      parsedManifest.value = null;
      validationError.value = '';
      validationResult.value = null;
      clearFirst.value = false;
      importResult.value = null;
    }, 200);
  }
}

function handleDone() {
  if (importResult.value?.success && importResult.value.courseCode) {
    emit('imported', importResult.value.courseCode);
  }
  close();
}

function prevStep() {
  if (currentStep.value > 1) {
    currentStep.value--;
    if (currentStep.value === 1) {
      validationError.value = '';
      validationResult.value = null;
    }
  }
}

function triggerFileInput() {
  if (!selectedFile.value) {
    fileInput.value?.click();
  }
}

function handleDrop(event: DragEvent) {
  isDragging.value = false;
  const files = event.dataTransfer?.files;
  if (files && files.length > 0) {
    const file = files[0];
    if (file.type === 'application/json' || file.name.endsWith('.json')) {
      selectedFile.value = file;
      parseError.value = '';
      parseFileLocally();
    } else {
      parseError.value = 'Please select a JSON file';
    }
  }
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    selectedFile.value = input.files[0];
    parseError.value = '';
    parseFileLocally();
  }
}

function clearFile() {
  selectedFile.value = null;
  parseError.value = '';
  parsedManifest.value = null;
  validationResult.value = null;
  validationError.value = '';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Parse file locally (quick check before sending to server)
async function parseFileLocally() {
  if (!selectedFile.value) return;

  try {
    const text = await selectedFile.value.text();
    const manifest = JSON.parse(text);

    // Basic validation
    if (!manifest.id || !manifest.slices || !Array.isArray(manifest.slices)) {
      throw new Error('Invalid manifest structure: missing id or slices');
    }

    parsedManifest.value = manifest;
    parseError.value = '';
  } catch (err) {
    parseError.value = err instanceof Error ? err.message : 'Failed to parse JSON file';
    parsedManifest.value = null;
  }
}

// Run validation (dry run) via API
async function runValidation() {
  if (!parsedManifest.value) {
    await parseFileLocally();
    if (!parsedManifest.value) return;
  }

  currentStep.value = 2;
  isValidating.value = true;
  validationError.value = '';
  validationResult.value = null;

  try {
    const apiBase = getApiBaseUrl();

    const response = await fetch(`${apiBase}/api/import-course`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        manifest: parsedManifest.value,
        dryRun: true
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Validation failed');
    }

    if (result.dryRun && result.analysis) {
      validationResult.value = {
        ...result.analysis,
        courseExists: result.courseExists || false
      };
    } else {
      throw new Error('Unexpected response format');
    }

  } catch (err) {
    validationError.value = err instanceof Error ? err.message : 'Validation failed';
  } finally {
    isValidating.value = false;
  }
}

// Start actual import
async function startImport() {
  if (!parsedManifest.value || !validationResult.value) return;

  currentStep.value = 3;
  isImporting.value = true;
  importStatus.value = { step: 1, message: 'Starting import...' };
  importResult.value = null;

  try {
    const apiBase = getApiBaseUrl();

    const response = await fetch(`${apiBase}/api/import-course`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        manifest: parsedManifest.value,
        clearFirst: clearFirst.value,
        dryRun: false
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Import failed');
    }

    importResult.value = {
      success: true,
      courseCode: result.courseCode,
      displayName: result.displayName || validationResult.value.displayName,
      statistics: result.statistics
    };
  } catch (err) {
    importResult.value = {
      success: false,
      error: err instanceof Error ? err.message : 'Import failed'
    };
  } finally {
    isImporting.value = false;
  }
}

// Keyboard shortcuts
function handleKeydown(event: KeyboardEvent) {
  if (!props.visible) return;

  if (event.key === 'Escape' && !isImporting.value && !isValidating.value) {
    event.preventDefault();
    close();
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

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

/* Spinner */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

/* Drop zone */
.drop-zone {
  min-height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
</style>
