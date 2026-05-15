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
          <div class="modal-header flex items-center justify-between px-6 py-4 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
            <h3 class="text-lg font-semibold text-white">Export & Publish Workflow</h3>
            <div class="flex items-center gap-2">
              <!-- Reset button -->
              <button
                @click="handleReset"
                class="text-slate-400 hover:text-white transition-colors p-1"
                title="Reset workflow"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <!-- Close button -->
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
          </div>

          <!-- Body -->
          <div class="modal-body px-6 py-6 space-y-6">
            <!-- Loading state -->
            <div v-if="isLoadingState" class="flex items-center justify-center py-8">
              <div class="spinner w-8 h-8 border-4 border-slate-600 border-t-emerald-500 rounded-full animate-spin"></div>
            </div>

            <template v-else>
              <!-- Step Indicator -->
              <ExportStepIndicator
                :current-step="workflow.currentStep.value"
                :completed-steps="workflow.completedSteps.value"
              />

              <!-- Error message -->
              <div v-if="workflow.error.value" class="error-box p-4 bg-red-900/30 border border-red-700 rounded-lg">
                <p class="text-red-400 text-sm">{{ workflow.error.value }}</p>
              </div>

              <!-- Step 1: Generate Manifest -->
              <div v-show="activeStep === 1" class="step-panel">
                <Step1Generate
                  :state="workflow.state.value"
                  :stats="workflow.stats.value"
                  :validation="workflow.validation.value"
                  :warnings="workflow.warnings.value"
                  :is-loading="workflow.isLoading.value"
                  :audio-progress="workflow.audioGenerationProgress.value"
                  :format-date="workflow.formatDate"
                  @generate="handleGenerate"
                  @redownload="handleRedownload"
                  @regenerate="handleRegenerate"
                />
              </div>

              <!-- Step 2: Verify S3 -->
              <div v-show="activeStep === 2" class="step-panel">
                <Step2Verify
                  :state="workflow.state.value"
                  :verification="workflow.state.value.s3Verification"
                  :is-loading="workflow.isLoading.value"
                  :is-verifying="isVerifying"
                  :progress="workflow.s3VerifyProgress.value"
                  :audio-progress="workflow.audioGenerationProgress.value"
                  :format-date="workflow.formatDate"
                  @verify="handleVerify"
                  @stop="handleStopVerify"
                />

                <!-- Override: skip verification and proceed to Step 3 -->
                <div v-if="workflow.state.value.s3Verification && !s3VerificationPassing && !isVerifying" class="mt-4 p-3 border rounded-lg" :class="s3VerifyOverride ? 'bg-amber-900/20 border-amber-700' : 'border-slate-700'">
                  <label class="flex items-center gap-2 cursor-pointer group">
                    <input
                      v-model="s3VerifyOverride"
                      type="checkbox"
                      class="w-4 h-4 rounded"
                    />
                    <span class="text-xs group-hover:text-slate-300 transition-colors" :class="s3VerifyOverride ? 'text-amber-400' : 'text-slate-500'">
                      Skip verification — proceed to publish anyway
                    </span>
                  </label>
                  <p v-if="s3VerifyOverride" class="text-xs text-amber-500/70 mt-1.5 ml-6">
                    Duration metadata in the manifest may not match S3 audio files.
                  </p>
                </div>
              </div>

              <!-- Step 3: Publish Manifest -->
              <div v-show="activeStep === 3" class="step-panel space-y-4">
                <Step3Publish
                  :state="workflow.state.value"
                  :version-info="workflow.versionInfo.value"
                  :manifest-diff="workflow.manifestDiff.value"
                  :is-loading="workflow.isLoading.value"
                  :is-pushing="isPushing"
                  :push-result="pushResult"
                  :verification="workflow.state.value.s3Verification"
                  :format-date="workflow.formatDate"
                  @publish="handlePublish"
                  @load-version-info="handleLoadVersionInfo"
                  @download-manifest="handleDownloadManifest"
                  @push-to-remote="handlePushToRemote"
                />
                <!-- Apidev stage deploy — appears once the manifest is committed
                     to course-configs (push to remote is the user's responsibility
                     before this; apidev will git pull on its own). -->
                <StageDeployPanel
                  v-if="workflow.state.value.manifestPublished"
                  :workflow="workflow"
                />
              </div>

              <!-- Step 4: Deploy Audio -->
              <div v-show="activeStep === 4" class="step-panel">
                <Step4Deploy
                  :state="workflow.state.value"
                  :deploy-plan="workflow.state.value.deployPlan"
                  :is-loading="workflow.isLoading.value"
                  :is-deploying="workflow.isDeploying.value"
                  :is-verifying="isVerifyingProduction"
                  :progress="workflow.deployProgress.value"
                  :plan-progress="workflow.deployPlanProgress.value"
                  :format-date="workflow.formatDate"
                  @check-plan="handleCheckPlan"
                  @deploy="handleDeploy"
                  @deploy-new-only="handleDeployNewOnly"
                  @deploy-new-and-mismatched="handleDeployNewAndMismatched"
                />
              </div>
            </template>
          </div>

          <!-- Unpushed commits warning -->
          <div v-if="showPushWarning" class="px-6 py-3 bg-amber-900/40 border-t border-amber-700">
            <div class="flex items-start gap-3">
              <svg class="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div class="flex-1">
                <p class="text-amber-400 text-sm font-medium">course-configs has unpushed commits</p>
                <p class="text-slate-400 text-xs mt-1">Push to remote before deploying so the app picks up the new manifest.</p>
                <div class="flex gap-2 mt-2">
                  <button
                    @click="handlePushAndProceed"
                    :disabled="isPushing"
                    class="px-3 py-1.5 text-xs font-medium bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    <span v-if="isPushing" class="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></span>
                    <span>{{ isPushing ? 'Pushing...' : 'Push & Continue' }}</span>
                  </button>
                  <button
                    @click="showPushWarning = false; activeStep++"
                    class="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
                  >
                    Skip anyway
                  </button>
                  <button
                    @click="showPushWarning = false"
                    class="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="modal-footer flex items-center justify-between px-6 py-4 border-t border-slate-700 sticky bottom-0 bg-slate-800">
            <!-- Navigation buttons -->
            <div class="flex items-center gap-2">
              <button
                v-if="activeStep > 1"
                @click="previousStep"
                class="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Previous
              </button>
            </div>

            <div class="flex items-center gap-2">
              <button
                v-if="activeStep < 4 && canProceedToNextStep"
                @click="nextStep"
                class="px-4 py-2 text-sm font-medium bg-slate-600 text-white rounded-lg hover:bg-slate-500 transition-colors"
              >
                Next Step
              </button>
              <button
                @click="close"
                class="px-4 py-2 text-sm font-medium bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useExportWorkflow } from '@/composables/useExportWorkflow'
import ExportStepIndicator from './export/ExportStepIndicator.vue'
import Step1Generate from './export/Step1Generate.vue'
import Step2Verify from './export/Step2Verify.vue'
import Step3Publish from './export/Step3Publish.vue'
import Step4Deploy from './export/Step4Deploy.vue'
import StageDeployPanel from './export/StageDeployPanel.vue'

// Props
const props = defineProps<{
  visible: boolean
  courseCode: string
}>()

// Emits
const emit = defineEmits<{
  close: []
}>()

// Workflow composable
const workflow = useExportWorkflow(props.courseCode)

// Local state
const isLoadingState = ref(true)
const isVerifying = ref(false)
const isVerifyingProduction = ref(false)
const isPushing = ref(false)
const pushResult = ref<{ success: boolean; message?: string; error?: string } | null>(null)
const activeStep = ref(1)
const showPushWarning = ref(false)
const s3VerifyOverride = ref(false)

// Is S3 verification actually passing (without override)?
const s3VerificationPassing = computed(() => {
  const state = workflow.state.value
  if (!state.s3Verified) return false
  const verification = state.s3Verification
  if (!verification) return false
  if (verification.durationsFixed && verification.durationsFixed > 0) {
    return verification.verifyFixed?.mismatched === 0
  }
  return true
})

// Computed
const canProceedToNextStep = computed(() => {
  const state = workflow.state.value
  switch (activeStep.value) {
    case 1:
      return state.manifestGenerated
    case 2:
      // Allow proceeding if verification passes OR override is active
      return s3VerificationPassing.value || s3VerifyOverride.value
    case 3:
      return state.manifestPublished
    default:
      return false
  }
})

// Methods
function close() {
  emit('close')
}

async function loadInitialState() {
  isLoadingState.value = true
  try {
    await workflow.loadState()
    // Set active step based on current progress
    const state = workflow.state.value
    if (state.audioDeployed) {
      activeStep.value = 4
    } else if (state.manifestPublished) {
      activeStep.value = 4
    } else if (state.s3Verified) {
      activeStep.value = 3
    } else if (state.manifestGenerated) {
      activeStep.value = 2
    } else {
      activeStep.value = 1
    }
  } finally {
    isLoadingState.value = false
  }
}

async function nextStep() {
  if (activeStep.value < 4) {
    // Warn if moving from Step 3 → Step 4 with unpushed course-configs commits
    if (activeStep.value === 3) {
      try {
        const apiBase = localStorage.getItem('api_base_url') || ''
        const res = await fetch(`${apiBase}/api/production/course-configs/status`)
        const status = await res.json()
        if (status.success && status.commitsAhead > 0) {
          showPushWarning.value = true
          return
        }
      } catch (err) {
        // If check fails, let them proceed
        console.warn('Failed to check course-configs push status:', err)
      }
    }
    activeStep.value++
  }
}

function previousStep() {
  if (activeStep.value > 1) {
    activeStep.value--
  }
}

// Step 1 handlers
async function handleGenerate(withAudio: boolean, useAsIs: boolean = false) {
  try {
    await workflow.generateManifest(withAudio, useAsIs)
    // Manifest is saved as pending file - download available at Step 3
  } catch (err) {
    // Error handled by workflow
  }
}

async function handleRedownload() {
  try {
    const data = await workflow.getCachedManifest()
    if (data.manifest) {
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
      const filename = `${data.manifest.id}_legacy_${date}.json`
      downloadManifest(data.manifest, filename)
    }
  } catch (err) {
    // Error handled by workflow
  }
}

async function handleRegenerate() {
  // Reset manifest state and regenerate
  await workflow.resetState()
  activeStep.value = 1
}

function downloadManifest(manifest: any, filename: string) {
  const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// Step 2 handlers
async function handleVerify() {
  isVerifying.value = true
  try {
    await workflow.verifyS3()
  } finally {
    isVerifying.value = false
  }
}

async function handleStopVerify() {
  await workflow.cancelVerifyS3()
  isVerifying.value = false
}

// Step 3 handlers
async function handleLoadVersionInfo() {
  await workflow.getVersionSuggestion()
}

async function handlePublish(options: { version: string; status: string; commitToCourseConfigs: boolean; scpToApidev: boolean }) {
  await workflow.publishManifest(options as any)
}

async function handleDownloadManifest() {
  await workflow.downloadPendingManifest()
}

async function handlePushToRemote() {
  isPushing.value = true
  pushResult.value = null
  try {
    // Get API base URL from localStorage (consistent with useExportWorkflow)
    const apiBase = localStorage.getItem('api_base_url') || ''
    const response = await fetch(`${apiBase}/api/production/course-configs/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    const result = await response.json()
    pushResult.value = result
  } catch (err) {
    pushResult.value = { success: false, error: (err as Error).message }
  } finally {
    isPushing.value = false
  }
}

async function handlePushAndProceed() {
  await handlePushToRemote()
  if (pushResult.value?.success) {
    showPushWarning.value = false
    activeStep.value++
  }
}

// Step 4 handlers
let checkPlanRunning = false
async function handleCheckPlan() {
  if (checkPlanRunning) return
  checkPlanRunning = true
  try {
    await workflow.getDeployPlan()
  } finally {
    checkPlanRunning = false
  }
}

async function handleDeploy(confirmation: string | undefined) {
  await workflow.deployAudio(confirmation)
}

async function handleVerifyProduction() {
  isVerifyingProduction.value = true
  try {
    await workflow.verifyProductionDurations()
  } finally {
    isVerifyingProduction.value = false
  }
}

async function handleDeployMissingOnly() {
  await workflow.deployMissingOnly()
}

async function handleDeployNewOnly() {
  await workflow.deployNewOnly()
}

async function handleDeployNewAndMismatched() {
  await workflow.deployNewAndMismatched()
}

// Reset handler
async function handleReset() {
  if (confirm('Reset the entire export workflow? This will clear all progress.')) {
    await workflow.resetState()
    activeStep.value = 1
  }
}

// Keyboard shortcuts
function handleKeydown(event: KeyboardEvent) {
  if (!props.visible) return

  if (event.key === 'Escape') {
    event.preventDefault()
    close()
  }
}

// Watch for visibility changes
watch(() => props.visible, async (newValue) => {
  if (newValue) {
    await loadInitialState()
  } else {
    workflow.cleanup()
  }
})

// Watch for course code changes
watch(() => props.courseCode, async (newCode, oldCode) => {
  if (newCode !== oldCode && props.visible) {
    await loadInitialState()
  }
})

// Load version info and manifest diff when Step 3 becomes active
watch(activeStep, async (step) => {
  if (step === 3) {
    await Promise.all([
      handleLoadVersionInfo(),
      workflow.getManifestDiff()
    ])
  }
})

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  if (props.visible) {
    loadInitialState()
  }

  // Auto-transition Step 1 → Step 2 after manifest generation completes.
  // The composable owns the socket listener and re-attaches across reconnects;
  // it only invokes this callback for our own audioJobId.
  workflow.onLegacyAudioCompleted(() => {
    if (activeStep.value !== 1) return
    console.log('Manifest generation complete - auto-starting S3 verification')
    setTimeout(() => {
      activeStep.value = 2
      handleVerify()
    }, 1000)
  })
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  workflow.cleanup()
})
</script>

<style scoped>
.modal-overlay {
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(4px);
}

.modal-content {
  background: #1e293b;
  border: 1px solid #334155;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.modal-header {
  background: linear-gradient(180deg, #334155 0%, transparent 100%);
  border-bottom-color: #334155;
}

.modal-footer {
  background: #1e293b;
  border-top-color: #334155;
}

/* Spinner */
.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

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
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.95) translateY(10px);
  opacity: 0;
}

/* Step panel */
.step-panel {
  min-height: 200px;
}
</style>
