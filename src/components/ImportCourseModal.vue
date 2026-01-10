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
              :disabled="isImporting"
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
              class="drop-zone border-2 border-dashed rounded-xl p-8 text-center transition-all"
              :class="{
                'border-emerald-500 bg-emerald-500 bg-opacity-10': isDragging,
                'border-slate-600 hover:border-slate-500': !isDragging && !selectedFile,
                'border-emerald-600 bg-emerald-900 bg-opacity-30': selectedFile
              }"
              @dragenter.prevent="isDragging = true"
              @dragover.prevent="isDragging = true"
              @dragleave.prevent="isDragging = false"
              @drop.prevent="handleDrop"
            >
              <div v-if="!selectedFile" class="upload-prompt">
                <div class="upload-icon text-5xl mb-4">
                  {{ isDragging ? '...' : '...' }}
                </div>
                <p class="text-lg font-medium text-slate-200 mb-2">
                  {{ isDragging ? 'Drop your manifest here' : 'Drag & drop course manifest' }}
                </p>
                <p class="text-sm text-slate-400 mb-4">or click to browse</p>
                <input
                  ref="fileInput"
                  type="file"
                  accept=".json"
                  class="hidden"
                  @change="handleFileSelect"
                />
                <button
                  @click="($refs.fileInput as HTMLInputElement)?.click()"
                  class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
                >
                  Browse Files
                </button>
              </div>

              <div v-else class="file-selected">
                <div class="file-icon text-5xl mb-4">...</div>
                <p class="text-lg font-medium text-emerald-400 mb-1">{{ selectedFile.name }}</p>
                <p class="text-sm text-slate-400 mb-4">{{ formatFileSize(selectedFile.size) }}</p>
                <button
                  @click="clearFile"
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

          <!-- Step 2: Preview -->
          <div v-if="currentStep === 2" class="modal-body px-6 py-6">
            <div v-if="manifestPreview" class="preview-content space-y-4">
              <!-- Course Info -->
              <div class="course-info bg-slate-700 rounded-lg p-4">
                <h4 class="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">Course Details</h4>
                <div class="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span class="text-slate-400">Legacy ID:</span>
                    <span class="text-white ml-2">{{ manifestPreview.legacyId }}</span>
                  </div>
                  <div>
                    <span class="text-slate-400">Course Code:</span>
                    <span class="text-emerald-400 ml-2 font-mono">{{ manifestPreview.courseCode }}</span>
                  </div>
                  <div>
                    <span class="text-slate-400">Known Language:</span>
                    <span class="text-white ml-2">{{ manifestPreview.knownLang }}</span>
                  </div>
                  <div>
                    <span class="text-slate-400">Target Language:</span>
                    <span class="text-white ml-2">{{ manifestPreview.targetLang }}</span>
                  </div>
                </div>
              </div>

              <!-- Import Statistics -->
              <div class="import-stats bg-slate-700 rounded-lg p-4">
                <h4 class="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">What Will Be Imported</h4>
                <div class="stats-grid grid grid-cols-2 gap-3">
                  <div class="stat-item flex justify-between p-2 bg-slate-800 rounded">
                    <span class="text-slate-400">Courses</span>
                    <span class="text-white font-medium">1</span>
                  </div>
                  <div class="stat-item flex justify-between p-2 bg-slate-800 rounded">
                    <span class="text-slate-400">Audio Samples</span>
                    <span class="text-white font-medium">{{ manifestPreview.sampleCount?.toLocaleString() }}</span>
                  </div>
                  <div class="stat-item flex justify-between p-2 bg-slate-800 rounded">
                    <span class="text-slate-400">Seeds</span>
                    <span class="text-white font-medium">{{ manifestPreview.seedCount?.toLocaleString() }}</span>
                  </div>
                  <div class="stat-item flex justify-between p-2 bg-slate-800 rounded">
                    <span class="text-slate-400">LEGOs</span>
                    <span class="text-white font-medium">{{ manifestPreview.legoCount?.toLocaleString() }}</span>
                  </div>
                  <div class="stat-item flex justify-between p-2 bg-slate-800 rounded">
                    <span class="text-slate-400">Practice Phrases</span>
                    <span class="text-white font-medium">{{ manifestPreview.phraseCount?.toLocaleString() }}</span>
                  </div>
                  <div class="stat-item flex justify-between p-2 bg-slate-800 rounded">
                    <span class="text-slate-400">LEGO Introductions</span>
                    <span class="text-white font-medium">{{ manifestPreview.legoCount?.toLocaleString() }}</span>
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
                    <div class="text-sm text-slate-400">Delete all existing data for this course before importing. Use for re-imports.</div>
                  </div>
                </label>
              </div>

              <!-- Warning if course exists -->
              <div v-if="manifestPreview.courseExists" class="warning-box p-4 bg-amber-900 bg-opacity-30 border border-amber-700 rounded-lg">
                <div class="flex gap-3">
                  <span class="text-amber-400 text-xl">...</span>
                  <div>
                    <p class="text-amber-400 font-medium">Course already exists</p>
                    <p class="text-amber-300 text-sm">This course code is already in the database. The import will upsert records (update existing, insert new).</p>
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
                <p class="text-sm text-slate-400 mt-1">{{ importStatus.message }}</p>
              </div>

              <div class="progress-bar-container bg-slate-700 rounded-full h-2 overflow-hidden">
                <div
                  class="progress-bar bg-emerald-500 h-full transition-all duration-300"
                  :style="{ width: `${(importStatus.step / 8) * 100}%` }"
                ></div>
              </div>

              <p class="text-center text-sm text-slate-500">Step {{ importStatus.step }} of 8</p>
            </div>

            <!-- Results -->
            <div v-else-if="importResult" class="import-results space-y-4">
              <!-- Success -->
              <div v-if="importResult.success" class="result-header text-center">
                <div class="success-icon text-5xl mb-4">...</div>
                <p class="text-xl font-semibold text-emerald-400">Import Complete!</p>
                <p class="text-sm text-slate-400 mt-1">{{ importResult.courseCode }} - {{ importResult.displayName }}</p>
              </div>

              <!-- Error -->
              <div v-else class="result-header text-center">
                <div class="error-icon text-5xl mb-4">...</div>
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
              v-if="currentStep > 1 && !isImporting && !importResult?.success"
              @click="prevStep"
              class="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Back
            </button>
            <div v-else></div>

            <div class="flex gap-3">
              <button
                v-if="!isImporting && !importResult?.success"
                @click="close"
                class="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Cancel
              </button>

              <!-- Step 1: Continue -->
              <button
                v-if="currentStep === 1 && selectedFile"
                @click="parseAndPreview"
                :disabled="isParsingFile"
                class="px-4 py-2 text-sm font-medium bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ isParsingFile ? 'Parsing...' : 'Continue' }}
              </button>

              <!-- Step 2: Start Import -->
              <button
                v-if="currentStep === 2"
                @click="startImport"
                class="px-4 py-2 text-sm font-medium bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
              >
                Start Import
              </button>

              <!-- Step 3: Done -->
              <button
                v-if="currentStep === 3 && importResult"
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
const stepLabels = ['Upload', 'Preview', 'Import'];

const selectedFile = ref<File | null>(null);
const isDragging = ref(false);
const isParsingFile = ref(false);
const parseError = ref('');

const manifestPreview = ref<{
  legacyId: string;
  courseCode: string;
  knownLang: string;
  targetLang: string;
  displayName: string;
  sampleCount: number;
  seedCount: number;
  legoCount: number;
  phraseCount: number;
  courseExists: boolean;
} | null>(null);

const clearFirst = ref(false);

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

const parsedManifest = ref<any>(null);

// Methods
function close() {
  if (!isImporting.value) {
    emit('close');
    // Reset state after close
    setTimeout(() => {
      currentStep.value = 1;
      selectedFile.value = null;
      parseError.value = '';
      manifestPreview.value = null;
      clearFirst.value = false;
      importResult.value = null;
      parsedManifest.value = null;
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
      parseError.value = '';
    }
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
  }
}

function clearFile() {
  selectedFile.value = null;
  parseError.value = '';
  manifestPreview.value = null;
  parsedManifest.value = null;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Course aliases (same as backend)
const COURSE_ALIASES: Record<string, string> = {
  'en-cy-north': 'cym_n_for_eng',
  'en-cy-south': 'cym_s_for_eng',
  'en-es': 'spa_for_eng',
  'en-ga': 'gle_for_eng',
  'cmn_for_eng': 'zho_for_eng',
  'En-Ch': 'zho_for_eng'
};

const DISPLAY_NAMES: Record<string, string> = {
  'cym_n_for_eng': 'Welsh (North) for English Speakers',
  'cym_s_for_eng': 'Welsh (South) for English Speakers',
  'spa_for_eng': 'Spanish for English Speakers',
  'gle_for_eng': 'Irish for English Speakers',
  'zho_for_eng': 'Mandarin for English Speakers'
};

async function parseAndPreview() {
  if (!selectedFile.value) return;

  isParsingFile.value = true;
  parseError.value = '';

  try {
    const text = await selectedFile.value.text();
    const manifest = JSON.parse(text);

    // Validate manifest structure
    if (!manifest.id || !manifest.slices || !Array.isArray(manifest.slices)) {
      throw new Error('Invalid manifest structure: missing id or slices');
    }

    const slice = manifest.slices[0];
    if (!slice) {
      throw new Error('Invalid manifest: no slices found');
    }

    // Extract info
    const legacyId = manifest.id;
    const courseCode = COURSE_ALIASES[legacyId] || legacyId;
    const knownLang = manifest.known || 'unknown';
    const targetLang = manifest.target || 'unknown';

    // Count items
    const seeds = slice.seeds || [];
    let legoCount = 0;
    let phraseCount = 0;

    for (const seed of seeds) {
      const legos = seed.introductionItems || seed.introduction_items || [];
      legoCount += legos.length;
      for (const lego of legos) {
        const phrases = lego.nodes || [];
        phraseCount += phrases.length;
      }
    }

    const sampleCount = manifest.samples ? Object.keys(manifest.samples).reduce((acc, key) => {
      return acc + (manifest.samples[key]?.length || 0);
    }, 0) : 0;

    parsedManifest.value = manifest;
    manifestPreview.value = {
      legacyId,
      courseCode,
      knownLang,
      targetLang,
      displayName: DISPLAY_NAMES[courseCode] || courseCode,
      sampleCount,
      seedCount: seeds.length,
      legoCount,
      phraseCount,
      courseExists: false // Would need API call to check
    };

    currentStep.value = 2;
  } catch (err) {
    parseError.value = err instanceof Error ? err.message : 'Failed to parse manifest';
  } finally {
    isParsingFile.value = false;
  }
}

async function startImport() {
  if (!parsedManifest.value || !manifestPreview.value) return;

  currentStep.value = 3;
  isImporting.value = true;
  importStatus.value = { step: 1, message: 'Starting import...' };
  importResult.value = null;

  try {
    const apiBase = getApiBaseUrl();

    // Send as JSON (orchestrator expects JSON body, not FormData)
    const response = await fetch(`${apiBase}/api/import-course`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        manifest: parsedManifest.value,
        clearFirst: clearFirst.value
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Import failed');
    }

    importResult.value = {
      success: true,
      courseCode: result.courseCode,
      displayName: result.displayName || manifestPreview.value.displayName,
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

  if (event.key === 'Escape' && !isImporting.value) {
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
