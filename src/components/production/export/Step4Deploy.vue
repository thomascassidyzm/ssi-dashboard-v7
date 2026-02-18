<template>
  <div class="step-content space-y-4">
    <h4 class="text-lg font-semibold text-white">Step 4: Deploy Audio to Production</h4>

    <p class="text-slate-300 text-sm">
      Copy audio files from stage bucket to production bucket.
    </p>

    <div class="bucket-info p-3 bg-slate-700 rounded-lg border border-slate-600 text-sm">
      <div class="flex items-center gap-2 text-slate-400">
        <span class="font-mono text-slate-300">ssi-audio-stage</span>
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
        <span class="font-mono text-slate-300">ssiborg-assets</span>
      </div>
    </div>

    <!-- Check plan button (initial state) -->
    <div v-if="!deployPlan || deployPlan.total === undefined">
      <button
        @click="handleCheckPlan"
        :disabled="isLoading"
        class="w-full px-4 py-3 text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <span v-if="isLoading" class="spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
        <span>{{ isLoading ? 'Checking...' : 'Check Production Status' }}</span>
      </button>
    </div>

    <!-- Plan checking progress -->
    <div v-if="isLoading && planProgress.phase !== 'idle'" class="progress-section space-y-3">
      <div class="flex justify-between text-sm text-slate-400 mb-2">
        <span>{{ planProgress.phase === 'existence' ? 'Checking files in production...' : 'Verifying overwrite durations...' }}</span>
        <span>{{ planProgress.checked.toLocaleString() }} / {{ planProgress.total.toLocaleString() }}</span>
      </div>
      <div class="progress-bar-container bg-slate-700 rounded-full h-3 overflow-hidden">
        <div
          class="progress-bar h-full transition-all duration-300"
          :class="planProgress.phase === 'existence' ? 'bg-amber-500' : 'bg-purple-500'"
          :style="{ width: `${planProgressPercent}%` }"
        />
      </div>

      <!-- Duration check stats (phase 2) -->
      <div v-if="planProgress.phase === 'duration'" class="grid grid-cols-3 gap-2 text-xs">
        <div class="text-center">
          <div class="text-emerald-400 font-medium">{{ planProgress.matched }}</div>
          <div class="text-slate-500">Matched</div>
        </div>
        <div class="text-center">
          <div class="text-amber-400 font-medium">{{ planProgress.mismatched }}</div>
          <div class="text-slate-500">Different</div>
        </div>
        <div class="text-center">
          <div class="text-red-400 font-medium">{{ planProgress.errors }}</div>
          <div class="text-slate-500">Errors</div>
        </div>
      </div>
    </div>

    <!-- Scenario-based UI (hide after deployment) -->
    <div v-if="deployPlan && deployPlan.total !== undefined && !isLoading && !state.audioDeployed" class="space-y-4">

      <!-- SCENARIO A: All files are new -->
      <div v-if="deployPlan.scenario === 'all_new'" class="scenario-box p-4 bg-emerald-900/30 border border-emerald-700 rounded-lg space-y-4">
        <div class="flex items-center gap-2 text-emerald-400">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span class="font-medium">All {{ deployPlan.total.toLocaleString() }} files are new</span>
        </div>

        <button
          v-if="!state.audioDeployed"
          @click="handleDeploy(undefined)"
          :disabled="isDeploying"
          class="w-full px-4 py-3 text-sm font-bold bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <span v-if="isDeploying" class="spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          <span>{{ isDeploying ? 'Deploying...' : 'Deploy to Production' }}</span>
        </button>
      </div>

      <!-- SCENARIO B: Overwrites exist, all match durations -->
      <div v-else-if="deployPlan.scenario === 'overwrites_identical'" class="scenario-box p-4 bg-emerald-900/30 border border-emerald-700 rounded-lg space-y-4">
        <div class="flex items-center gap-2 text-emerald-400">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span class="font-medium">
            <template v-if="deployPlan.newFiles === 0">
              All {{ deployPlan.total.toLocaleString() }} files are already in production
            </template>
            <template v-else>
              {{ deployPlan.overwrites.toLocaleString() }} files already in production are identical
            </template>
          </span>
        </div>

        <!-- Stats (only show if there are new files) -->
        <div v-if="deployPlan.newFiles > 0" class="stats-grid grid grid-cols-2 gap-3 text-sm">
          <div class="stat-item flex flex-col p-3 bg-slate-800 rounded border border-slate-600">
            <span class="text-slate-400">New Files</span>
            <span class="text-emerald-400 font-semibold text-lg">{{ deployPlan.newFiles.toLocaleString() }}</span>
          </div>
          <div class="stat-item flex flex-col p-3 bg-slate-800 rounded border border-slate-600">
            <span class="text-slate-400">Identical (skip)</span>
            <span class="text-slate-400 font-semibold text-lg">{{ deployPlan.overwrites.toLocaleString() }}</span>
          </div>
        </div>

        <!-- Deploy button only if there are new files -->
        <button
          v-if="!state.audioDeployed && deployPlan.newFiles > 0"
          @click="handleDeployNewOnly"
          :disabled="isDeploying"
          class="w-full px-4 py-3 text-sm font-bold bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <span v-if="isDeploying" class="spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          <span>{{ isDeploying ? 'Deploying...' : `Deploy ${deployPlan.newFiles.toLocaleString()} New Files` }}</span>
        </button>

        <!-- No action needed message when 0 new files -->
        <p v-if="deployPlan.newFiles === 0" class="text-sm text-emerald-300">
          No deployment needed - production is up to date.
        </p>

        <!-- Secondary option -->
        <p v-if="!state.audioDeployed && deployPlan.newFiles > 0" class="text-center text-xs text-slate-500">
          or
          <button @click="handleDeploy('overwrite')" class="text-slate-400 hover:text-white underline">
            deploy all {{ deployPlan.total.toLocaleString() }} files anyway
          </button>
        </p>
      </div>

      <!-- SCENARIO C: Overwrites have different durations -->
      <div v-else-if="deployPlan.scenario === 'overwrites_different'" class="scenario-box space-y-4">
        <!-- Warning box -->
        <div class="p-4 bg-amber-900/30 border border-amber-700 rounded-lg space-y-3">
          <div class="flex items-start gap-3">
            <svg class="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p class="text-amber-400 font-medium text-sm">
                {{ getDifferentCount }} files in production have different durations
              </p>
              <p class="text-slate-400 text-xs mt-1">
                These files may be used by live courses. If they are, overwriting will affect learners immediately.
                Make sure you know it's safe to overwrite these files.
              </p>
            </div>
          </div>
        </div>

        <!-- Stats -->
        <div class="stats-grid grid grid-cols-3 gap-3 text-sm">
          <div class="stat-item flex flex-col p-3 bg-slate-700 rounded border border-slate-600">
            <span class="text-slate-400">New Files</span>
            <span class="text-emerald-400 font-semibold text-lg">{{ deployPlan.newFiles.toLocaleString() }}</span>
          </div>
          <div class="stat-item flex flex-col p-3 bg-slate-700 rounded border border-slate-600">
            <span class="text-slate-400">Identical</span>
            <span class="text-slate-400 font-semibold text-lg">{{ identicalCount.toLocaleString() }}</span>
          </div>
          <div class="stat-item flex flex-col p-3 bg-slate-700 rounded border border-slate-600">
            <span class="text-slate-400">Different</span>
            <span class="text-amber-400 font-semibold text-lg">{{ getDifferentCount.toLocaleString() }}</span>
          </div>
        </div>

        <!-- Mismatch details (collapsible) -->
        <div v-if="deployPlan.overwriteDurations?.mismatchDetails?.length" class="mismatch-details">
          <button
            @click="showMismatchDetails = !showMismatchDetails"
            class="w-full flex items-center justify-between p-3 bg-slate-800 border border-slate-600 rounded-lg text-sm hover:bg-slate-700 transition-colors"
          >
            <span class="text-slate-300">View {{ deployPlan.overwriteDurations.mismatchDetails.length }} mismatched files</span>
            <svg
              class="w-4 h-4 text-slate-400 transition-transform"
              :class="{ 'rotate-180': showMismatchDetails }"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <div v-if="showMismatchDetails" class="mt-2 p-3 bg-slate-800 border border-slate-600 rounded-lg space-y-3">
            <!-- Download button -->
            <button
              @click="handleDownloadMismatchDetails"
              class="w-full px-3 py-2 text-xs font-medium border border-slate-500 text-slate-300 rounded hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Debug Info (JSON)
            </button>

            <!-- Mismatch list -->
            <div class="max-h-64 overflow-y-auto space-y-2 text-xs">
              <div
                v-for="detail in deployPlan.overwriteDurations.mismatchDetails"
                :key="detail.uuid"
                class="p-3 bg-slate-900 rounded border border-slate-700 space-y-2"
              >
                <!-- Text (if available) -->
                <div v-if="detail.text" class="text-white text-sm font-medium">
                  "{{ detail.text }}"
                  <span v-if="detail.role" class="text-slate-500 text-xs ml-1">({{ detail.role }})</span>
                </div>
                <div class="font-mono text-slate-500 text-xs truncate" :title="detail.uuid">{{ detail.uuid }}</div>
                <div class="flex flex-wrap gap-3 text-slate-500">
                  <span>Stage: <span class="text-white">{{ detail.expectedDuration?.toFixed(3) }}s</span></span>
                  <span>Prod: <span class="text-amber-400">{{ detail.actualDuration?.toFixed(3) }}s</span></span>
                  <span>Diff: <span class="text-red-400">{{ Math.abs(detail.difference || 0).toFixed(3) }}s</span></span>
                </div>
                <!-- Download buttons -->
                <div class="flex gap-2 mt-2">
                  <button
                    @click="handleDownloadAudioFiles(detail.uuid)"
                    :disabled="downloadingUuids.has(detail.uuid)"
                    class="flex-1 px-2 py-1 text-xs font-medium bg-slate-700 text-slate-200 rounded hover:bg-slate-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    <svg v-if="!downloadingUuids.has(detail.uuid)" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span v-if="downloadingUuids.has(detail.uuid)" class="spinner w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></span>
                    Download Both Files
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Safe deploy button (new only) -->
        <button
          v-if="!state.audioDeployed"
          @click="handleDeployNewOnly"
          :disabled="isDeploying"
          class="w-full px-4 py-3 text-sm font-bold bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <span v-if="isDeploying" class="spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          <span>{{ isDeploying ? 'Deploying...' : `Deploy ${deployPlan.newFiles.toLocaleString()} New Files Only` }}</span>
          <span class="text-emerald-200 text-xs">(safe)</span>
        </button>

        <!-- Deploy new + mismatched button -->
        <button
          v-if="!state.audioDeployed && getDifferentCount > 0"
          @click="handleDeployNewAndMismatched"
          :disabled="isDeploying"
          class="w-full px-4 py-3 text-sm font-bold bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <span v-if="isDeploying" class="spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          <span>{{ isDeploying ? 'Deploying...' : `Deploy ${deployPlan.newFiles.toLocaleString()} New + ${getDifferentCount} Mismatched` }}</span>
        </button>

        <!-- Overwrite confirmation section -->
        <div v-if="!state.audioDeployed" class="p-4 bg-slate-800 border border-slate-600 rounded-lg space-y-3">
          <label class="text-sm text-slate-400 block">
            Type "overwrite" to confirm overwriting all files:
          </label>
          <input
            v-model="confirmationText"
            type="text"
            placeholder="overwrite"
            class="w-full px-3 py-2 text-sm bg-slate-900 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
          <button
            @click="handleDeploy(confirmationText)"
            :disabled="isDeploying || confirmationText !== 'overwrite'"
            class="w-full px-4 py-2 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Overwrite All {{ deployPlan.total.toLocaleString() }} Files
          </button>
        </div>
      </div>

      <!-- LEGACY: No scenario (old plan format) -->
      <div v-else class="scenario-box p-4 bg-slate-700 border border-slate-600 rounded-lg space-y-4">
        <!-- Stats -->
        <div class="stats-grid grid grid-cols-3 gap-3 text-sm">
          <div class="stat-item flex flex-col p-3 bg-slate-800 rounded border border-slate-600">
            <span class="text-slate-400">Total</span>
            <span class="text-white font-semibold text-lg">{{ (deployPlan.total || 0).toLocaleString() }}</span>
          </div>
          <div class="stat-item flex flex-col p-3 bg-slate-800 rounded border border-slate-600">
            <span class="text-slate-400">New Files</span>
            <span class="text-emerald-400 font-semibold text-lg">{{ (deployPlan.newFiles || 0).toLocaleString() }}</span>
          </div>
          <div class="stat-item flex flex-col p-3 bg-slate-800 rounded border border-slate-600">
            <span class="text-slate-400">Overwrites</span>
            <span :class="(deployPlan.overwrites || 0) > 0 ? 'text-amber-400' : 'text-slate-400'" class="font-semibold text-lg">
              {{ (deployPlan.overwrites || 0).toLocaleString() }}
            </span>
          </div>
        </div>

        <!-- Overwrite warning (legacy mode) -->
        <div v-if="deployPlan.overwrites > 0" class="overwrite-warning p-4 bg-amber-900/30 border border-amber-700 rounded-lg space-y-3">
          <div class="flex items-start gap-3">
            <svg class="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p class="text-amber-400 font-medium text-sm">
                {{ deployPlan.overwrites }} files already exist in production
              </p>
              <p class="text-slate-400 text-xs mt-1">
                Overwriting affects ALL courses using these files.
                Time this with manifest deployment to avoid sync issues.
              </p>
            </div>
          </div>

          <!-- Confirmation input -->
          <div class="confirmation-input">
            <label class="text-sm text-slate-400 block mb-2">
              Type "overwrite" to confirm:
            </label>
            <input
              v-model="confirmationText"
              type="text"
              placeholder="overwrite"
              class="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <!-- Deploy button (legacy mode) -->
        <button
          v-if="!state.audioDeployed"
          @click="handleDeploy(confirmationText || undefined)"
          :disabled="isDeploying || (deployPlan.overwrites > 0 && confirmationText !== 'overwrite')"
          class="w-full px-4 py-3 text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <span v-if="isDeploying" class="spinner w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
          <span>{{ isDeploying ? 'Deploying...' : 'Deploy Audio to Production' }}</span>
        </button>
      </div>
    </div>

    <!-- Deploy progress -->
    <div v-if="isDeploying" class="progress-section space-y-4">
      <!-- Phase 1: Copying files -->
      <div v-if="!progress.verifying">
        <div class="flex justify-between text-sm text-slate-400 mb-2">
          <span>Deploying to production...</span>
          <span>{{ progress.deployed.toLocaleString() }} / {{ progress.total.toLocaleString() }}</span>
        </div>
        <div class="progress-bar-container bg-slate-700 rounded-full h-3 overflow-hidden">
          <div
            class="progress-bar bg-amber-500 h-full transition-all duration-300"
            :style="{ width: `${progressPercent}%` }"
          />
        </div>
        <p class="text-center text-xs text-slate-500 mt-2">
          {{ progressPercent }}% complete
        </p>
      </div>

      <!-- Phase 2: Post-deploy verification -->
      <div v-else>
        <div class="flex justify-between text-sm text-slate-400 mb-2">
          <span>Verifying production audio...</span>
          <span>{{ (progress.verifyChecked || 0).toLocaleString() }} / {{ (progress.verifyTotal || 0).toLocaleString() }}</span>
        </div>
        <div class="progress-bar-container bg-slate-700 rounded-full h-3 overflow-hidden">
          <div
            class="progress-bar bg-purple-500 h-full transition-all duration-300"
            :style="{ width: `${verifyPercent}%` }"
          />
        </div>
        <div class="grid grid-cols-3 gap-2 text-xs mt-2">
          <div class="text-center">
            <div class="text-emerald-400 font-medium">{{ (progress.verifyMatched || 0).toLocaleString() }}</div>
            <div class="text-slate-500">Matched</div>
          </div>
          <div class="text-center">
            <div class="text-amber-400 font-medium">{{ (progress.verifyMismatched || 0).toLocaleString() }}</div>
            <div class="text-slate-500">Mismatched</div>
          </div>
          <div class="text-center">
            <div class="text-red-400 font-medium">{{ (progress.verifyErrors || 0).toLocaleString() }}</div>
            <div class="text-slate-500">Errors</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Refresh plan button (hide after deployment) -->
    <button
      v-if="deployPlan && deployPlan.total !== undefined && !isDeploying && !isLoading && !state.audioDeployed"
      @click="handleCheckPlan"
      :disabled="isLoading"
      class="w-full px-4 py-2 text-sm font-medium border border-slate-500 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
    >
      <span v-if="isLoading" class="spinner w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></span>
      <span>{{ isLoading ? 'Checking...' : 'Refresh Plan' }}</span>
    </button>

    <!-- Deploy verification FAILED -->
    <div v-if="!state.audioDeployed && state.deployVerification && !isDeploying && !isLoading"
         class="failure-box p-4 bg-red-900/30 border border-red-700 rounded-lg space-y-3">
      <div class="flex items-center gap-2 text-red-400 font-medium">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
        <span>Deployment verification failed</span>
      </div>

      <p v-if="state.deployVerification.message" class="text-sm text-slate-300">
        {{ state.deployVerification.message }}
      </p>

      <!-- Stats grid -->
      <div class="grid grid-cols-4 gap-2 text-sm">
        <div class="text-center p-2 bg-slate-800 rounded">
          <div class="text-emerald-400 font-semibold">{{ (state.deployVerification.matched || 0).toLocaleString() }}</div>
          <div class="text-slate-500 text-xs">OK</div>
        </div>
        <div class="text-center p-2 bg-slate-800 rounded">
          <div :class="(state.deployVerification.mismatched || 0) > 0 ? 'text-amber-400' : 'text-slate-400'" class="font-semibold">{{ (state.deployVerification.mismatched || 0).toLocaleString() }}</div>
          <div class="text-slate-500 text-xs">Mismatched</div>
        </div>
        <div class="text-center p-2 bg-slate-800 rounded">
          <div :class="(state.deployVerification.errors || 0) > 0 ? 'text-red-400' : 'text-slate-400'" class="font-semibold">{{ (state.deployVerification.errors || 0).toLocaleString() }}</div>
          <div class="text-slate-500 text-xs">Errors</div>
        </div>
        <div class="text-center p-2 bg-slate-800 rounded">
          <div :class="(state.deployVerification as any).missing > 0 ? 'text-red-400' : 'text-slate-400'" class="font-semibold">{{ ((state.deployVerification as any).missing || 0).toLocaleString() }}</div>
          <div class="text-slate-500 text-xs">Missing</div>
        </div>
      </div>

      <!-- Issue details -->
      <div v-if="state.deployVerification.details && state.deployVerification.details.length > 0"
           class="p-3 bg-red-900/20 border border-red-800 rounded text-xs">
        <p class="text-red-400 font-medium mb-1">Issues ({{ state.deployVerification.details.length }}):</p>
        <div class="max-h-40 overflow-y-auto space-y-1 text-slate-400 font-mono">
          <div v-for="detail in state.deployVerification.details.slice(0, 10)" :key="detail.uuid">
            {{ detail.uuid.substring(0, 8) }}... {{ detail.issue }}
            <span v-if="detail.expected != null && detail.actual != null">
              (expected {{ detail.expected.toFixed(3) }}s, got {{ detail.actual.toFixed(3) }}s)
            </span>
          </div>
          <p v-if="state.deployVerification.details.length > 10" class="text-slate-500 italic">
            ...and {{ state.deployVerification.details.length - 10 }} more
          </p>
        </div>
      </div>

      <button @click="handleCheckPlan"
        class="w-full px-4 py-2 text-sm font-medium border border-slate-500 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors flex items-center justify-center gap-2">
        Re-check Production Status
      </button>
    </div>

    <!-- Deployed success -->
    <div v-if="state.audioDeployed" class="success-box p-4 bg-emerald-900/30 border border-emerald-700 rounded-lg space-y-3">
      <div class="flex items-center gap-2 text-emerald-400 font-medium">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        <span>Audio deployed to production</span>
      </div>

      <!-- Deployment summary -->
      <div v-if="state.deployVerification" class="space-y-2">
        <p v-if="state.deployVerification.message" class="text-sm text-slate-300">
          {{ state.deployVerification.message }}
        </p>

        <!-- Stats grid -->
        <div class="grid grid-cols-3 gap-2 text-sm">
          <div class="text-center p-2 bg-slate-800 rounded">
            <div class="text-emerald-400 font-semibold">{{ (state.deployVerification.matched || 0).toLocaleString() }}</div>
            <div class="text-slate-500 text-xs">Verified</div>
          </div>
          <div v-if="state.deployVerification.mismatched > 0" class="text-center p-2 bg-slate-800 rounded">
            <div class="text-amber-400 font-semibold">{{ (state.deployVerification.mismatched || 0).toLocaleString() }}</div>
            <div class="text-slate-500 text-xs">Mismatched</div>
          </div>
          <div v-if="state.deployVerification.errors > 0" class="text-center p-2 bg-slate-800 rounded">
            <div class="text-red-400 font-semibold">{{ (state.deployVerification.errors || 0).toLocaleString() }}</div>
            <div class="text-slate-500 text-xs">Errors</div>
          </div>
        </div>
      </div>

      <p class="text-xs text-slate-500">
        Deployed: {{ formatDate(state.audioDeployedAt) }}
      </p>

      <button
        @click="handleCheckPlan"
        :disabled="isLoading"
        class="w-full px-4 py-2 text-sm font-medium border border-slate-500 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <span v-if="isLoading" class="spinner w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full animate-spin"></span>
        <span>{{ isLoading ? 'Checking...' : 'Re-check Production Status' }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ExportState, DeployPlan } from '@/composables/useExportWorkflow'

const props = defineProps<{
  state: ExportState
  deployPlan: DeployPlan | null
  isLoading: boolean
  isDeploying: boolean
  isVerifying: boolean
  progress: {
    deployed: number
    total: number
    verifying?: boolean
    verifyChecked?: number
    verifyTotal?: number
    verifyMatched?: number
    verifyMismatched?: number
    verifyErrors?: number
  }
  planProgress: {
    phase: 'idle' | 'existence' | 'duration'
    checked: number
    total: number
    matched: number
    mismatched: number
    errors: number
  }
  formatDate: (date: string | null) => string
}>()

const emit = defineEmits<{
  checkPlan: []
  deploy: [confirmation: string | undefined]
  deployNewOnly: []
  deployNewAndMismatched: []
}>()

const confirmationText = ref('')
const showMismatchDetails = ref(false)
const downloadingUuids = ref(new Set<string>())

const progressPercent = computed(() => {
  if (props.progress.total === 0) return 0
  return Math.round((props.progress.deployed / props.progress.total) * 100)
})

const verifyPercent = computed(() => {
  if (!props.progress.verifyTotal) return 0
  return Math.round(((props.progress.verifyChecked || 0) / props.progress.verifyTotal) * 100)
})

const planProgressPercent = computed(() => {
  if (props.planProgress.total === 0) return 0
  return Math.round((props.planProgress.checked / props.planProgress.total) * 100)
})

const getDifferentCount = computed(() => {
  const durations = props.deployPlan?.overwriteDurations
  if (!durations) return props.deployPlan?.overwrites || 0
  return durations.mismatched + durations.errors
})

const identicalCount = computed(() => {
  const durations = props.deployPlan?.overwriteDurations
  if (!durations) return 0
  return durations.matched
})

function handleCheckPlan() {
  emit('checkPlan')
}

function handleDeploy(confirmation: string | undefined) {
  emit('deploy', confirmation)
}

function handleDeployNewOnly() {
  emit('deployNewOnly')
}

function handleDeployNewAndMismatched() {
  emit('deployNewAndMismatched')
}

function handleDownloadMismatchDetails() {
  const mismatchDetails = props.deployPlan?.overwriteDurations?.mismatchDetails
  if (!mismatchDetails || mismatchDetails.length === 0) return

  const debugInfo = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalOverwrites: props.deployPlan?.overwrites || 0,
      matched: props.deployPlan?.overwriteDurations?.matched || 0,
      mismatched: props.deployPlan?.overwriteDurations?.mismatched || 0,
      errors: props.deployPlan?.overwriteDurations?.errors || 0
    },
    mismatchDetails: mismatchDetails.map(detail => ({
      uuid: detail.uuid,
      text: detail.text || null,
      role: detail.role || null,
      sampleType: detail.sampleType || null,
      stageDuration: detail.expectedDuration,
      productionDuration: detail.actualDuration,
      difference: detail.difference,
      differenceMs: detail.difference ? Math.round(detail.difference * 1000) : null
    }))
  }

  const blob = new Blob([JSON.stringify(debugInfo, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `mismatch_debug_${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

async function handleDownloadAudioFiles(uuid: string) {
  if (downloadingUuids.value.has(uuid)) return

  downloadingUuids.value.add(uuid)
  try {
    // Get API base URL from localStorage
    const apiBase = localStorage.getItem('api_base_url') || ''

    // Download via backend proxy to avoid CORS issues
    const downloadFile = async (bucket: string, filename: string) => {
      const response = await fetch(`${apiBase}/api/production/audio/${uuid}/download/${bucket}`)
      if (!response.ok) {
        throw new Error(`Failed to download ${bucket} file: ${response.statusText}`)
      }
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    }

    // Download stage file first, then production (small delay between)
    await downloadFile('stage', `${uuid}_stage.mp3`)
    await new Promise(resolve => setTimeout(resolve, 500))
    await downloadFile('production', `${uuid}_production.mp3`)

  } catch (error) {
    console.error('Error downloading audio files:', error)
    alert(`Failed to download files: ${(error as Error).message}`)
  } finally {
    downloadingUuids.value.delete(uuid)
  }
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

.progress-bar-container {
  background: #334155;
}

.progress-bar {
  background: linear-gradient(90deg, #f59e0b, #d97706);
}

.progress-bar.bg-purple-500 {
  background: linear-gradient(90deg, #a855f7, #7c3aed);
}

.progress-bar.bg-emerald-500 {
  background: linear-gradient(90deg, #10b981, #059669);
}
</style>
