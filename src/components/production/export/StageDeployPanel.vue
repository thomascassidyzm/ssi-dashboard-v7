<template>
  <div class="stage-deploy-panel space-y-3 p-4 bg-slate-700 rounded-lg border border-slate-600">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <p class="text-white text-sm font-medium">Deploy to stage</p>
        <p class="text-slate-400 text-xs">
          Runs <span class="font-mono">./check -e stage deploy</span> on apidev for
          <span class="font-mono text-slate-300">{{ courseConfigsLabel }}</span>
        </p>
      </div>
      <div class="flex-shrink-0">
        <StatusBadge :status="status" />
      </div>
    </div>

    <!-- New-course warning banner -->
    <div
      v-if="isNewCourse && (status === 'running' || isTerminal)"
      class="p-3 bg-amber-900/30 border border-amber-700 rounded text-amber-300 text-sm flex items-start gap-2"
    >
      <svg class="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <div>
        <p class="font-medium">New course — confirm with the tech team</p>
        <p class="text-amber-300/80 text-xs mt-1">
          This course isn't in the stage bucket yet. Confirm it's been added to the valid-courses list,
          or the stage server may fail to start.
        </p>
      </div>
    </div>

    <!-- Hint for retry-without-checks path (only when restart wasn't the failure) -->
    <div
      v-if="status === 'failed' && sawChecksPassed && restartPhase !== 'failed'"
      class="p-3 bg-amber-900/20 border border-amber-700/50 rounded text-amber-300 text-xs"
    >
      Deploy crashed after all checks passed (usually a transient S3FS mount issue).
      "Retry without checks" re-runs and skips the checks — safe only because they JUST passed.
    </div>


    <!-- Controls -->
    <div v-if="status === 'idle'" class="space-y-3">
      <label class="flex items-center gap-3 p-3 bg-slate-800 rounded border border-slate-600 cursor-pointer">
        <input
          v-model="deleteProgress"
          type="checkbox"
          class="w-4 h-4 rounded"
        />
        <div>
          <span class="text-white text-sm">Delete orphan progress records</span>
          <span class="text-slate-400 text-xs ml-2">
            (clears user progress for UUIDs no longer in this course)
          </span>
        </div>
      </label>
      <button
        @click="handleDeploy(false)"
        class="w-full px-4 py-2 text-sm font-medium bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
      >
        Deploy to stage
      </button>

      <!-- Unpushed-commits warning — mirrors Step 3 → Step 4 nextStep guard -->
      <div v-if="showPushWarning" class="mt-3 p-3 bg-amber-900/40 border border-amber-700 rounded-lg">
        <div class="flex items-start gap-3">
          <svg class="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div class="flex-1">
            <p class="text-amber-400 text-sm font-medium">
              course-configs has {{ unpushedCommitsAhead }} unpushed commit{{ unpushedCommitsAhead === 1 ? '' : 's' }}
            </p>
            <p class="text-slate-400 text-xs mt-1">Push to remote before deploying — apidev pulls from origin/author when it runs ./check.</p>
            <div class="flex gap-2 mt-2">
              <button
                @click="handlePushAndDeploy(false)"
                class="px-3 py-1.5 text-xs font-medium bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >Push &amp; Deploy</button>
              <button
                @click="showPushWarning = false"
                class="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-300 transition-colors"
              >Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="status === 'running'" class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-2 text-slate-300 text-sm">
        <span class="spinner w-4 h-4 border-2 border-slate-500 border-t-blue-400 rounded-full"></span>
        <span>Deploying…</span>
      </div>
      <button
        @click="handleCancel"
        class="px-3 py-1.5 text-xs font-medium border border-slate-500 text-slate-300 rounded hover:bg-slate-600 transition-colors"
      >
        Cancel
      </button>
    </div>

    <div v-else-if="isTerminal" class="flex flex-wrap gap-2">
      <button
        @click="handleDeploy(false)"
        class="px-3 py-1.5 text-xs font-medium bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      >
        {{ status === 'success' || status === 'identical' ? 'Deploy again' : 'Try again' }}
      </button>
      <button
        v-if="status === 'failed' && sawChecksPassed"
        @click="handleDeploy(true)"
        class="px-3 py-1.5 text-xs font-medium bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors"
      >
        Retry without checks
      </button>
      <button
        @click="handleClear"
        class="px-3 py-1.5 text-xs font-medium border border-slate-500 text-slate-400 rounded hover:bg-slate-600 transition-colors"
      >
        Reset panel
      </button>
    </div>

    <!-- Run summary -->
    <div v-if="status !== 'idle'" class="text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
      <span v-if="startedAt">Started: {{ workflow.formatDate(startedAt) }}</span>
      <span v-if="endedAt && isTerminal">Finished: {{ workflow.formatDate(endedAt) }}</span>
      <span v-if="usedSkipChecks" class="text-amber-400">checks skipped</span>
      <span v-if="exitCode !== null">exit {{ exitCode }}</span>
    </div>

    <!-- Restart stage server — separate button, shows after a terminal deploy -->
    <div
      v-if="isTerminal"
      class="restart-row flex items-center justify-between gap-3 pt-3 border-t border-slate-600"
    >
      <div class="text-sm">
        <p class="text-white font-medium">Restart stage server</p>
        <p class="text-slate-400 text-xs">
          <span v-if="restartPhase === 'pending'">
            Required after a fresh deploy so the new manifest is picked up.
            <span v-if="status === 'identical'" class="text-slate-500">
              (Optional — deploy was a no-op.)
            </span>
          </span>
          <span v-else-if="restartPhase === 'running'" class="text-blue-300">
            Watching for "Server started"<span v-if="restartTimeoutSeconds">  — timeout {{ restartTimeoutSeconds }}s</span>…
          </span>
          <span v-else-if="restartPhase === 'succeeded'" class="text-emerald-300">
            Server started successfully.
          </span>
          <span v-else-if="restartPhase === 'failed'" class="text-red-300">
            <strong>FAILED — contact the tech team.</strong>
            <span v-if="restartFailureReason" class="block opacity-90 mt-0.5">{{ restartFailureReason }}</span>
            <span class="block opacity-90 mt-0.5">The manifest is deployed but the API is likely crash-looping.</span>
          </span>
        </p>
      </div>
      <div class="flex-shrink-0 flex items-center gap-2">
        <RestartBadge :phase="restartPhase" />
        <button
          v-if="restartPhase === 'pending' || restartPhase === 'succeeded' || restartPhase === 'failed'"
          @click="handleRestart"
          :class="restartButtonClass"
          class="px-3 py-1.5 text-xs font-medium rounded transition-colors"
        >
          {{ restartButtonLabel }}
        </button>
        <button
          v-if="restartPhase === 'running'"
          @click="handleCancelRestart"
          class="px-3 py-1.5 text-xs font-medium border border-slate-500 text-slate-300 rounded hover:bg-slate-600 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>

    <!-- Live log -->
    <div v-if="logLines.length > 0">
      <div class="flex items-center justify-between mb-1">
        <span class="text-xs text-slate-400">Output</span>
        <button
          @click="showLog = !showLog"
          class="text-xs text-slate-500 hover:text-slate-300"
        >
          {{ showLog ? 'hide' : 'show' }}
        </button>
      </div>
      <pre
        v-if="showLog"
        ref="logEl"
        class="log-area max-h-64 overflow-auto p-2 bg-slate-900 border border-slate-600 rounded text-xs text-slate-300 font-mono whitespace-pre-wrap"
      ><span
          v-for="(entry, i) in logLines"
          :key="i"
          :class="entry.stream === 'stderr' ? 'text-amber-300' : ''"
        >{{ entry.line }}
</span></pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, nextTick, ref, watch } from 'vue'

const props = defineProps<{
  workflow: any  // useExportWorkflow return type — used directly for ref access
}>()

const showLog = ref(true)
const deleteProgress = ref(true)  // default ON per Kai's preference
const logEl = ref<HTMLPreElement | null>(null)

// Unwrap reactive refs from the workflow composable
const status = computed(() => props.workflow.stageDeployStatus.value as
  'idle' | 'running' | 'success' | 'failed' | 'cancelled' | 'identical')
const startedAt = computed(() => props.workflow.stageDeployStartedAt.value)
const endedAt = computed(() => props.workflow.stageDeployEndedAt.value)
const logLines = computed(() => props.workflow.stageDeployLog.value)
const isNewCourse = computed(() => props.workflow.stageDeployIsNewCourse.value)
const sawChecksPassed = computed(() => props.workflow.stageDeploySawChecksPassed.value)
const exitCode = computed(() => props.workflow.stageDeployExitCode.value)
const usedSkipChecks = computed(() => props.workflow.stageDeployUsedSkipChecks.value)
const courseConfigsId = computed(() => props.workflow.stageDeployCourseConfigsId.value)
const restartPhase = computed(() => props.workflow.stageDeployRestartPhase.value as
  'pending' | 'running' | 'succeeded' | 'failed' | 'skipped')
const restartFailureReason = computed(() => props.workflow.stageDeployRestartFailureReason.value)
const restartTimeoutSeconds = computed(() => props.workflow.stageDeployRestartTimeoutSeconds.value)

const restartButtonLabel = computed(() => {
  if (restartPhase.value === 'succeeded') return 'Restart again'
  if (restartPhase.value === 'failed')    return 'Retry restart'
  return 'Restart stage server'
})

const restartButtonClass = computed(() =>
  restartPhase.value === 'failed'
    ? 'bg-red-500 text-white hover:bg-red-600'
    : 'bg-blue-500 text-white hover:bg-blue-600'
)

const courseConfigsLabel = computed(() => courseConfigsId.value || '(derived on deploy)')

const isTerminal = computed(() =>
  status.value === 'success' || status.value === 'failed' ||
  status.value === 'cancelled' || status.value === 'identical'
)

const showPushWarning = ref(false)
const unpushedCommitsAhead = ref(0)

async function handleDeploy(skipChecks: boolean) {
  // Mirror the Step 3 → Step 4 nextStep() guard: refuse to deploy when
  // course-configs has unpushed commits. Otherwise apidev's ./check reads a
  // stale en-XX.json and the live manifest diverges from what we just
  // published locally.
  try {
    const apiBase = localStorage.getItem('api_base_url') || ''
    const res = await fetch(`${apiBase}/api/production/course-configs/status`)
    const status = await res.json()
    if (status.success && status.commitsAhead > 0) {
      unpushedCommitsAhead.value = status.commitsAhead
      showPushWarning.value = true
      return
    }
  } catch (err) {
    // If the status check itself errors, fall through and let the server-side
    // guard catch it.
    console.warn('Stage-deploy: course-configs status check failed:', err)
  }
  await props.workflow.deployStage({
    deleteProgress: deleteProgress.value,
    skipChecks
  })
}

async function handlePushAndDeploy(skipChecks: boolean) {
  try {
    const apiBase = localStorage.getItem('api_base_url') || ''
    const r = await fetch(`${apiBase}/api/production/course-configs/push`, { method: 'POST' })
    if (!r.ok) throw new Error(`push failed: ${r.status}`)
    showPushWarning.value = false
    unpushedCommitsAhead.value = 0
    await props.workflow.deployStage({
      deleteProgress: deleteProgress.value,
      skipChecks
    })
  } catch (err: any) {
    console.error('Push-then-deploy failed:', err)
  }
}

async function handleCancel() {
  await props.workflow.cancelStageDeploy()
}

async function handleRestart() {
  await props.workflow.restartStage()
}

async function handleCancelRestart() {
  await props.workflow.cancelStageRestart()
}

function handleClear() {
  props.workflow.clearStageDeploy()
}

// Auto-scroll the log to bottom on new output
watch(logLines, async () => {
  if (!showLog.value) return
  await nextTick()
  if (logEl.value) logEl.value.scrollTop = logEl.value.scrollHeight
}, { deep: true })

// Small badge component
const StatusBadge = defineComponent({
  props: { status: { type: String, required: true } },
  setup(p) {
    const map: Record<string, { label: string, cls: string }> = {
      idle:       { label: 'Ready',     cls: 'bg-slate-600 text-slate-200' },
      running:    { label: 'Running',   cls: 'bg-blue-500/30 text-blue-300 border border-blue-500/50' },
      success:    { label: 'Deployed',  cls: 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50' },
      identical:  { label: 'No change', cls: 'bg-slate-500/30 text-slate-300 border border-slate-500/50' },
      failed:     { label: 'Failed',    cls: 'bg-red-500/30 text-red-300 border border-red-500/50' },
      cancelled:  { label: 'Cancelled', cls: 'bg-amber-500/30 text-amber-300 border border-amber-500/50' }
    }
    return () => {
      const m = map[p.status] || map.idle
      return h('span', { class: `text-xs font-medium px-2 py-0.5 rounded ${m.cls}` }, m.label)
    }
  }
})

const RestartBadge = defineComponent({
  props: { phase: { type: String, required: true } },
  setup(p) {
    const map: Record<string, { label: string, cls: string }> = {
      pending:    { label: 'Not yet',   cls: 'bg-slate-600 text-slate-300' },
      running:    { label: 'Restarting',cls: 'bg-blue-500/30 text-blue-300 border border-blue-500/50' },
      succeeded:  { label: 'Restarted', cls: 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/50' },
      failed:     { label: 'Failed',    cls: 'bg-red-500/30 text-red-300 border border-red-500/50' },
      skipped:    { label: 'Skipped',   cls: 'bg-slate-600 text-slate-300' }
    }
    return () => {
      const m = map[p.phase] || map.pending
      return h('span', { class: `text-xs font-medium px-2 py-0.5 rounded ${m.cls}` }, m.label)
    }
  }
})
</script>

<style scoped>
.spinner {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.log-area {
  scrollbar-width: thin;
}
</style>
