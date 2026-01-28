<template>
  <div class="step-content space-y-4">
    <h4 class="text-lg font-semibold text-white">Step 3: Publish Manifest</h4>

    <!-- Not yet published -->
    <div v-if="!state.manifestPublished" class="space-y-4">
      <p class="text-slate-300 text-sm">
        Publish the manifest to course-configs repo and apidev server.
      </p>

      <!-- BLOCKER: Duration verification required -->
      <div v-if="!durationsVerified" class="blocker-box p-4 bg-red-900/30 border-2 border-red-700 rounded-lg">
        <div class="flex items-center gap-2 text-red-400 font-medium mb-2">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>Publishing Blocked: Duration verification required</span>
        </div>
        <p class="text-sm text-slate-300">
          Go back to Step 2 and verify that all audio durations match the manifest before publishing.
        </p>
        <p class="text-xs text-slate-400 mt-2">
          This ensures the learning app receives accurate duration metadata.
        </p>
      </div>

      <!-- Version info -->
      <div v-if="versionInfo" class="version-info p-4 bg-slate-700 rounded-lg border border-slate-600 space-y-3">
        <div class="flex justify-between items-center">
          <span class="text-slate-400 text-sm">Course ID</span>
          <span class="text-white font-mono">{{ versionInfo.courseConfigsId }}</span>
        </div>

        <div class="flex items-center gap-3">
          <span class="text-slate-400 text-sm flex-shrink-0">Version</span>
          <input
            v-model="version"
            type="text"
            placeholder="e.g., 3.0.1"
            class="flex-1 px-3 py-1.5 text-sm bg-slate-800 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <span class="text-slate-500 text-xs">(suggested: {{ versionInfo.suggestedVersion }})</span>
        </div>

        <div class="flex items-center gap-3">
          <span class="text-slate-400 text-sm flex-shrink-0">Status</span>
          <select
            v-model="status"
            class="flex-1 px-3 py-1.5 text-sm bg-slate-800 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
          >
            <option value="alpha">alpha</option>
            <option value="beta">beta</option>
            <option value="release">release</option>
          </select>
        </div>
      </div>

      <!-- Repo check warning -->
      <div v-if="versionInfo && !versionInfo.repoAvailable" class="repo-warning p-3 bg-amber-900/30 border border-amber-700 rounded-lg">
        <p class="text-amber-400 text-sm">
          {{ versionInfo.repoError }}
        </p>
      </div>

      <!-- Download manifest button -->
      <button
        @click="handleDownloadManifest"
        class="w-full px-4 py-2 text-sm font-medium border border-slate-500 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Download Manifest (Review Before Publishing)
      </button>

      <!-- Publish options -->
      <div class="options space-y-2">
        <label class="flex items-center gap-3 p-3 bg-slate-700 rounded-lg cursor-pointer border border-slate-600">
          <input
            v-model="commitToCourseConfigs"
            type="checkbox"
            class="w-4 h-4 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-800 rounded"
          />
          <div>
            <span class="text-white text-sm">Commit to course-configs</span>
            <span class="text-slate-400 text-xs ml-2">(author branch)</span>
          </div>
        </label>

        <label class="flex items-center gap-3 p-3 bg-slate-700 rounded-lg cursor-pointer border border-slate-600">
          <input
            v-model="scpToApidev"
            type="checkbox"
            class="w-4 h-4 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-800 rounded"
          />
          <div>
            <span class="text-white text-sm">Upload to apidev via SCP</span>
            <span class="text-slate-400 text-xs ml-2">(requires VPN)</span>
          </div>
        </label>
      </div>

      <!-- Publish button -->
      <button
        @click="handlePublish"
        :disabled="isLoading || !version || !durationsVerified"
        class="w-full px-4 py-3 text-sm font-medium bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <span v-if="isLoading" class="spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
        <span v-if="!durationsVerified">Blocked: Verify Durations First</span>
        <span v-else>{{ isLoading ? 'Publishing...' : 'Publish Manifest' }}</span>
      </button>
    </div>

    <!-- Published state -->
    <div v-else class="space-y-4">
      <div class="success-box p-4 bg-emerald-900/30 border border-emerald-700 rounded-lg space-y-2">
        <div class="flex items-center gap-2 text-emerald-400 font-medium">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span>Published v{{ state.manifestVersion }} ({{ state.manifestStatus }})</span>
        </div>

        <div v-if="state.publishCourseConfigsPath" class="text-sm text-slate-400">
          Course-configs: <span class="text-slate-300 font-mono text-xs">{{ state.publishCourseConfigsPath }}</span>
        </div>

        <div v-if="state.publishApidevFilename" class="text-sm text-slate-400">
          Apidev: <span class="text-slate-300 font-mono text-xs">{{ state.publishApidevFilename }}</span>
        </div>

        <p class="text-xs text-slate-500">
          Published: {{ formatDate(state.manifestPublishedAt) }}
        </p>
      </div>

      <!-- Re-publish button -->
      <button
        @click="showRepublish = true"
        class="w-full px-4 py-2 text-sm font-medium border border-slate-500 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
      >
        Publish New Version
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import type { ExportState, VersionInfo, S3VerificationResult } from '@/composables/useExportWorkflow'

const props = defineProps<{
  state: ExportState
  versionInfo: VersionInfo | null
  isLoading: boolean
  verification: S3VerificationResult | null
  formatDate: (date: string | null) => string
}>()

// CRITICAL: Check that durations were actually verified
// Publishing without duration verification can cause sync issues in the learning app
const durationsVerified = computed(() => {
  const verification = props.state.s3Verification || props.verification
  if (!verification) return false

  // Must have:
  // 1. No missing files
  // 2. Duration check ran successfully (durationChecked > 0)
  // 3. Duration check didn't fail (durationCheckFailed !== true)
  return verification.missing === 0 &&
         (verification.durationChecked || 0) > 0 &&
         !verification.durationCheckFailed
})

const emit = defineEmits<{
  publish: [options: { version: string; status: string; commitToCourseConfigs: boolean; scpToApidev: boolean }]
  loadVersionInfo: []
  downloadManifest: []
}>()

const version = ref('')
const status = ref('beta')
const commitToCourseConfigs = ref(true)
const scpToApidev = ref(true)
const showRepublish = ref(false)

// Load version info when component mounts
onMounted(() => {
  emit('loadVersionInfo')
})

// Update version when version info is loaded
watch(() => props.versionInfo, (info) => {
  if (info && !version.value) {
    version.value = info.suggestedVersion
  }
})

function handlePublish() {
  emit('publish', {
    version: version.value,
    status: status.value,
    commitToCourseConfigs: commitToCourseConfigs.value,
    scpToApidev: scpToApidev.value
  })
}

function handleDownloadManifest() {
  emit('downloadManifest')
}
</script>

<style scoped>
.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

input[type="checkbox"] {
  accent-color: #10b981;
}

select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 0.5rem center;
  background-repeat: no-repeat;
  background-size: 1.5em 1.5em;
  padding-right: 2.5rem;
}
</style>
