<template>
  <div class="step-content space-y-4">
    <h4 class="text-lg font-semibold text-white">Step 3: Publish Manifest</h4>

    <!-- Download manifest button (always visible) -->
    <button
      @click="handleDownloadManifest"
      class="w-full px-4 py-2 text-sm font-medium border border-slate-500 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      Download Manifest (Review Before Publishing)
    </button>

    <!-- Not yet published -->
    <div v-if="!state.manifestPublished" class="space-y-4">
      <p class="text-slate-300 text-sm">
        Publish the manifest to course-configs repo and apidev server.
      </p>

      <!-- BLOCKER: Duration verification required -->
      <div v-if="!durationsVerified" class="blocker-box p-4 bg-red-900/30 border-2 border-red-700 rounded-lg">
        <div class="flex items-center gap-2 text-red-400 font-medium mb-2">
          <svg v-if="verification?.durationsFixed && verification?.verifyFixed?.mismatched !== 0" class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span v-if="verification?.durationsFixed && verification?.verifyFixed?.mismatched !== 0">
            Auto-fix in progress...
          </span>
          <span v-else>
            Publishing Blocked: Duration verification required
          </span>
        </div>
        <p v-if="verification?.durationsFixed && verification?.verifyFixed?.mismatched !== 0" class="text-sm text-slate-300">
          Step 2 is currently auto-fixing {{ verification.durationsFixed }} duration mismatches. Please wait for it to complete and verify.
        </p>
        <p v-else class="text-sm text-slate-300">
          Go back to Step 2 and verify that all audio durations match the manifest before publishing.
        </p>
        <p class="text-xs text-slate-400 mt-2">
          This ensures the learning app receives accurate duration metadata.
        </p>
      </div>

      <!-- Version and Status picker (always visible) -->
      <div class="version-info p-4 bg-slate-700 rounded-lg border border-slate-600 space-y-4">
        <!-- Course ID -->
        <div class="flex justify-between items-center">
          <span class="text-slate-400 text-sm">Course ID</span>
          <span v-if="versionInfo" class="text-white font-mono">{{ versionInfo.courseConfigsId }}</span>
          <span v-else class="text-amber-400 font-mono text-sm">New Course</span>
        </div>

        <!-- Version section -->
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-slate-400 text-sm">Version</span>
            <span class="text-slate-500 text-xs">
              current: {{ versionInfo?.existingVersion || '(none)' }}
            </span>
          </div>

          <!-- Version bump buttons -->
          <div v-if="!showCustomVersion" class="flex gap-2">
            <button
              @click="version = nextVersions.patch"
              :class="version === nextVersions.patch ? 'bg-emerald-600 border-emerald-500' : 'bg-slate-800 border-slate-600 hover:border-slate-500'"
              class="flex-1 px-3 py-2 text-sm border rounded transition-colors"
            >
              <div class="text-slate-400 text-xs">Patch</div>
              <div class="text-white font-mono">{{ nextVersions.patch }}</div>
            </button>
            <button
              @click="version = nextVersions.minor"
              :class="version === nextVersions.minor ? 'bg-emerald-600 border-emerald-500' : 'bg-slate-800 border-slate-600 hover:border-slate-500'"
              class="flex-1 px-3 py-2 text-sm border rounded transition-colors"
            >
              <div class="text-slate-400 text-xs">Minor</div>
              <div class="text-white font-mono">{{ nextVersions.minor }}</div>
            </button>
            <button
              @click="version = nextVersions.major"
              :class="version === nextVersions.major ? 'bg-emerald-600 border-emerald-500' : 'bg-slate-800 border-slate-600 hover:border-slate-500'"
              class="flex-1 px-3 py-2 text-sm border rounded transition-colors"
            >
              <div class="text-slate-400 text-xs">Major</div>
              <div class="text-white font-mono">{{ nextVersions.major }}</div>
            </button>
          </div>

          <!-- Custom version input (hidden by default) -->
          <div v-if="showCustomVersion" class="flex items-center gap-2">
            <input
              v-model="version"
              type="text"
              placeholder="e.g., 3.0.1"
              class="flex-1 px-3 py-1.5 text-sm bg-slate-800 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <button @click="showCustomVersion = false" class="text-slate-400 hover:text-white text-xs">
              cancel
            </button>
          </div>

          <!-- Toggle custom input -->
          <div v-if="!showCustomVersion" class="text-center">
            <button @click="showCustomVersion = true" class="text-slate-500 hover:text-slate-300 text-xs">
              or enter custom version
            </button>
          </div>
        </div>

        <!-- Status section with buttons -->
        <div class="space-y-2">
          <span class="text-slate-400 text-sm">Status</span>
          <div class="flex gap-2">
            <button
              @click="status = 'alpha'"
              :class="status === 'alpha' ? 'bg-amber-600 border-amber-500' : 'bg-slate-800 border-slate-600 hover:border-slate-500'"
              class="flex-1 px-3 py-2 text-sm border rounded transition-colors text-white"
            >
              alpha
            </button>
            <button
              @click="status = 'beta'"
              :class="status === 'beta' ? 'bg-blue-600 border-blue-500' : 'bg-slate-800 border-slate-600 hover:border-slate-500'"
              class="flex-1 px-3 py-2 text-sm border rounded transition-colors text-white"
            >
              beta
            </button>
            <button
              @click="status = 'release'"
              :class="status === 'release' ? 'bg-emerald-600 border-emerald-500' : 'bg-slate-800 border-slate-600 hover:border-slate-500'"
              class="flex-1 px-3 py-2 text-sm border rounded transition-colors text-white"
            >
              published
            </button>
          </div>
        </div>
      </div>

      <!-- Repo check warning -->
      <div v-if="versionInfo && !versionInfo.repoAvailable" class="repo-warning p-3 bg-amber-900/30 border border-amber-700 rounded-lg">
        <p class="text-amber-400 text-sm">
          {{ versionInfo.repoError }}
        </p>
      </div>

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
        :disabled="isPublishing || !version || !durationsVerified"
        class="w-full px-4 py-3 text-sm font-medium bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <span v-if="isPublishing" class="spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
        <span v-if="!durationsVerified">Blocked: Verify Durations First</span>
        <span v-else>{{ isPublishing ? 'Publishing...' : 'Publish Manifest' }}</span>
      </button>
    </div>

    <!-- Published state -->
    <div v-else class="space-y-4">
      <!-- Success box -->
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

      <!-- Push to Remote button -->
      <div v-if="state.publishCourseConfigsPath" class="push-remote-box p-4 bg-slate-700 rounded-lg border border-slate-600 space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-white text-sm font-medium">Push to Remote</p>
            <p class="text-slate-400 text-xs">Push course-configs commits to GitHub</p>
          </div>
          <button
            @click="handlePushToRemote"
            :disabled="props.isPushing"
            class="px-4 py-2 text-sm font-medium bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span v-if="props.isPushing" class="spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
            <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span>{{ props.isPushing ? 'Pushing...' : 'Push' }}</span>
          </button>
        </div>
        <div v-if="props.pushResult" class="text-sm" :class="props.pushResult.success ? 'text-emerald-400' : 'text-red-400'">
          {{ props.pushResult.message || props.pushResult.error }}
        </div>
      </div>

      <!-- Re-publish workflow (COLLAPSED by default) -->
      <div v-if="!showRepublish">
        <button
          @click="showRepublish = true"
          class="w-full px-4 py-2 text-sm font-medium border border-slate-500 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
        >
          Publish New Version
        </button>
      </div>

      <!-- Re-publish workflow (EXPANDED when showRepublish = true) -->
      <div v-else class="space-y-4">
        <!-- Version info -->
        <div v-if="versionInfo" class="version-info p-4 bg-slate-700 rounded-lg border border-slate-600 space-y-3">
          <div class="flex justify-between items-center">
            <span class="text-slate-400 text-sm">Course ID</span>
            <span class="text-white font-mono">{{ versionInfo.courseConfigsId }}</span>
          </div>

          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-slate-400 text-sm">New Version</span>
              <span class="text-slate-500 text-xs">current: {{ versionInfo.existingVersion }}</span>
            </div>

            <!-- Version bump buttons -->
            <div v-if="!showCustomRepublishVersion" class="flex gap-2">
              <button
                @click="republishVersion = nextVersions.patch"
                :class="republishVersion === nextVersions.patch ? 'bg-emerald-600 border-emerald-500' : 'bg-slate-800 border-slate-600 hover:border-slate-500'"
                class="flex-1 px-3 py-2 text-sm border rounded transition-colors"
              >
                <div class="text-slate-400 text-xs">Patch</div>
                <div class="text-white font-mono">{{ nextVersions.patch }}</div>
              </button>
              <button
                @click="republishVersion = nextVersions.minor"
                :class="republishVersion === nextVersions.minor ? 'bg-emerald-600 border-emerald-500' : 'bg-slate-800 border-slate-600 hover:border-slate-500'"
                class="flex-1 px-3 py-2 text-sm border rounded transition-colors"
              >
                <div class="text-slate-400 text-xs">Minor</div>
                <div class="text-white font-mono">{{ nextVersions.minor }}</div>
              </button>
              <button
                @click="republishVersion = nextVersions.major"
                :class="republishVersion === nextVersions.major ? 'bg-emerald-600 border-emerald-500' : 'bg-slate-800 border-slate-600 hover:border-slate-500'"
                class="flex-1 px-3 py-2 text-sm border rounded transition-colors"
              >
                <div class="text-slate-400 text-xs">Major</div>
                <div class="text-white font-mono">{{ nextVersions.major }}</div>
              </button>
            </div>

            <!-- Custom version input (hidden by default) -->
            <div v-if="showCustomRepublishVersion" class="flex items-center gap-2">
              <input
                v-model="republishVersion"
                type="text"
                placeholder="e.g., 3.0.2"
                class="flex-1 px-3 py-1.5 text-sm bg-slate-800 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <button @click="showCustomRepublishVersion = false" class="text-slate-400 hover:text-white text-xs">
                cancel
              </button>
            </div>

            <!-- Toggle custom input -->
            <div v-if="!showCustomRepublishVersion" class="text-center">
              <button @click="showCustomRepublishVersion = true" class="text-slate-500 hover:text-slate-300 text-xs">
                or enter custom version
              </button>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <span class="text-slate-400 text-sm flex-shrink-0">Status</span>
            <select
              v-model="republishStatus"
              class="flex-1 px-3 py-1.5 text-sm bg-slate-800 border border-slate-600 rounded text-white focus:outline-none focus:border-blue-500"
            >
              <option value="alpha">alpha</option>
              <option value="beta">beta</option>
              <option value="release">release</option>
            </select>
          </div>
        </div>

        <!-- Duration verification requirement -->
        <div v-if="!durationsVerified" class="blocker-box p-4 bg-red-900/30 border-2 border-red-700 rounded-lg">
          <div class="flex items-center gap-2 text-red-400 font-medium mb-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Publishing Blocked: Re-verify durations first</span>
          </div>
          <p class="text-sm text-slate-300">
            Go back to Step 2 and re-verify S3 to ensure durations match before publishing.
          </p>
        </div>

        <!-- Publish options -->
        <div class="options space-y-2">
          <label class="flex items-center gap-3 p-3 bg-slate-700 rounded-lg cursor-pointer border border-slate-600">
            <input
              v-model="republishToCourseConfigs"
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
              v-model="republishToApidev"
              type="checkbox"
              class="w-4 h-4 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-800 rounded"
            />
            <div>
              <span class="text-white text-sm">Upload to apidev via SCP</span>
              <span class="text-slate-400 text-xs ml-2">(requires VPN)</span>
            </div>
          </label>
        </div>

        <!-- Action buttons -->
        <div class="flex gap-2">
          <button
            @click="showRepublish = false"
            class="flex-1 px-4 py-2 text-sm font-medium border border-slate-500 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            @click="handleRepublish"
            :disabled="isPublishing || !republishVersion || !durationsVerified"
            class="flex-1 px-4 py-3 text-sm font-medium bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span v-if="isPublishing" class="spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
            <span v-if="!durationsVerified">Blocked: Verify Durations First</span>
            <span v-else>{{ isPublishing ? 'Publishing...' : 'Publish New Version' }}</span>
          </button>
        </div>
      </div>
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
  isPushing?: boolean
  pushResult?: { success: boolean; message?: string; error?: string } | null
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
  // 4. If durations were auto-fixed, re-verification must have passed
  const basicVerification = verification.missing === 0 &&
         (verification.durationChecked || 0) > 0 &&
         !verification.durationCheckFailed

  // If durations were fixed, must also pass re-verification (verifyFixed.mismatched === 0)
  if (verification.durationsFixed && verification.durationsFixed > 0) {
    return basicVerification && verification.verifyFixed?.mismatched === 0
  }

  return basicVerification
})

const emit = defineEmits<{
  publish: [options: { version: string; status: string; commitToCourseConfigs: boolean; scpToApidev: boolean }]
  loadVersionInfo: []
  downloadManifest: []
  pushToRemote: []
}>()

// Local publishing state - don't rely on global isLoading which may be from other operations
const isPublishing = ref(false)

const version = ref('')
const status = ref('beta')
const commitToCourseConfigs = ref(true)
const scpToApidev = ref(false)  // Off by default - course-configs is the primary method
const showRepublish = ref(false)
const showCustomVersion = ref(false)

// Re-publish form variables
const republishVersion = ref('')
const republishStatus = ref('beta')
const republishToCourseConfigs = ref(true)
const republishToApidev = ref(false)  // Off by default
const showCustomRepublishVersion = ref(false)

// Calculate next versions (patch, minor, major) from existing version
// For new courses (no existing version), default to 1.0.0
const isNewCourse = computed(() => !props.versionInfo?.existingVersion || props.versionInfo.existingVersion === '1.0.0')
const nextVersions = computed(() => {
  // For truly new courses (no version info), start at 1.0.0
  if (!props.versionInfo?.existingVersion) {
    return { patch: '1.0.0', minor: '1.0.0', major: '1.0.0' }
  }
  const existing = props.versionInfo.existingVersion
  const parts = existing.split('.').map(Number)
  const major = parts[0] || 0
  const minor = parts[1] || 0
  const patch = parts[2] || 0

  return {
    patch: `${major}.${minor}.${patch + 1}`,
    minor: `${major}.${minor + 1}.0`,
    major: `${major + 1}.0.0`
  }
})

// Load version info when component mounts
onMounted(() => {
  emit('loadVersionInfo')
  // Set default version for new courses (will be overwritten if versionInfo loads)
  if (!version.value) {
    version.value = '1.0.0'
  }
})

// Update version when version info is loaded - default to patch
watch(() => props.versionInfo, (info) => {
  if (info) {
    // Update to patch version of existing course
    const parts = info.existingVersion.split('.').map(Number)
    version.value = `${parts[0] || 0}.${parts[1] || 0}.${(parts[2] || 0) + 1}`
  }
})

// Watch for showRepublish to load version suggestion
watch(showRepublish, (isShowing) => {
  if (isShowing && props.versionInfo) {
    // Default to patch version (most common case)
    const parts = props.versionInfo.existingVersion.split('.').map(Number)
    republishVersion.value = `${parts[0] || 0}.${parts[1] || 0}.${(parts[2] || 0) + 1}`
    republishStatus.value = props.state.manifestStatus || 'beta'
    showCustomRepublishVersion.value = false
  }
})

function handlePublish() {
  isPublishing.value = true
  emit('publish', {
    version: version.value,
    status: status.value,
    commitToCourseConfigs: commitToCourseConfigs.value,
    scpToApidev: scpToApidev.value
  })
}

function handleRepublish() {
  isPublishing.value = true
  emit('publish', {
    version: republishVersion.value,
    status: republishStatus.value,
    commitToCourseConfigs: republishToCourseConfigs.value,
    scpToApidev: republishToApidev.value
  })

  // Reset form after publish starts
  showRepublish.value = false
}

// Reset publishing state when manifest is published (or on error)
watch(() => props.state.manifestPublished, (published) => {
  if (published) {
    isPublishing.value = false
  }
})

// Also reset on isLoading becoming false (catches error cases)
watch(() => props.isLoading, (loading) => {
  if (!loading && isPublishing.value) {
    isPublishing.value = false
  }
})

function handleDownloadManifest() {
  emit('downloadManifest')
}

function handlePushToRemote() {
  emit('pushToRemote')
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
