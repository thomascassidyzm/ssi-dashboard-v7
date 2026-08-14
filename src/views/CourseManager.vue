<template>
  <div class="min-h-screen bg-canvas">
    <!-- Header -->
    <header class="bg-surface/50 border-b border-line/50 backdrop-blur-sm sticky top-0 z-10">
      <div class="max-w-6xl mx-auto px-6 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <router-link
              to="/courses"
              class="text-muted hover:text-ink transition-colors flex items-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              <span class="text-sm">Library</span>
            </router-link>
            <div class="w-px h-6 bg-surface-2"></div>
            <h1 class="text-xl font-semibold text-ink">Course Manager</h1>
            <span
              v-if="courseCode"
              class="px-3 py-1 bg-surface-2/50 border border-line/50 rounded text-sm font-mono text-emerald-400"
            >
              {{ courseCode }}
            </span>
          </div>

          <div class="flex items-center gap-3">
            <!-- Job Status Badge -->
            <div
              v-if="jobStatus !== 'idle'"
              class="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm"
              :class="statusBadgeClass"
            >
              <span class="status-dot" :class="statusDotClass"></span>
              <span>{{ statusLabel }}</span>
            </div>

            <!-- Data Source -->
            <span class="text-xs text-faint uppercase tracking-wide">Database</span>
          </div>
        </div>
      </div>
    </header>

    <main class="max-w-6xl mx-auto px-6 py-8 space-y-6">
      <!-- Configuration Section (Collapsible) -->
      <section class="bg-surface/30 border border-line/50 rounded-lg overflow-hidden">
        <button
          @click="configExpanded = !configExpanded"
          class="w-full px-6 py-4 flex items-center justify-between hover:bg-surface/50 transition-colors"
        >
          <div class="flex items-center gap-3">
            <span class="text-sm font-medium text-ink uppercase tracking-wide">Configuration</span>
            <span v-if="!configExpanded && courseCode" class="text-sm text-faint">
              {{ displayName }} &middot; {{ seedCount }} seeds &middot; {{ agentEngine.toUpperCase() }} &middot; {{ selectedMachineProfile }}{{ showLegacyMode ? ` · ${buildMode === 'builder' ? 'Course Builder' : 'Phases 1-3'}` : '' }}
            </span>
          </div>
          <svg
            class="w-5 h-5 text-muted transition-transform duration-200"
            :class="{ 'rotate-180': configExpanded }"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div
          v-show="configExpanded"
          class="px-6 pb-6 border-t border-line/50 space-y-6"
        >
          <!-- Language Pair -->
          <div class="pt-6">
            <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-3">
              Language Pair
            </label>
            <div v-if="isNewCourse" class="grid grid-cols-2 gap-4">
              <select
                v-model="knownLang"
                class="bg-surface-2/50 border border-line/50 rounded-lg px-4 py-3 text-ink focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
              >
                <option value="">Select known language</option>
                <option v-for="lang in languages" :key="lang.code" :value="lang.code">
                  {{ getLanguageName(lang.code) }}
                </option>
              </select>
              <select
                v-model="targetLang"
                class="bg-surface-2/50 border border-line/50 rounded-lg px-4 py-3 text-ink focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
              >
                <option value="">Select target language</option>
                <option v-for="lang in languages" :key="lang.code" :value="lang.code">
                  {{ getLanguageName(lang.code) }}
                </option>
              </select>
            </div>
            <div v-else class="text-lg text-ink">
              {{ displayName }}
            </div>

            <!-- Language Brief Editor -->
            <LanguageBriefEditor
              v-if="effectiveKnownCode && effectiveTargetCode"
              :known-code="effectiveKnownCode"
              :target-code="effectiveTargetCode"
              :known-name="effectiveKnownName"
              :target-name="effectiveTargetName"
              @brief-ready="onBriefReady"
              class="mt-4"
            />
          </div>

          <!-- Course Size -->
          <div>
            <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-3">
              Course Size
            </label>
            <div class="flex gap-2">
              <button
                v-for="size in courseSizes"
                :key="size.seeds"
                @click="seedCount = size.seeds"
                class="flex-1 px-4 py-3 rounded-lg border transition-all text-sm"
                :class="seedCount === size.seeds
                  ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400'
                  : 'bg-surface-2/30 border-line/50 text-muted hover:border-line/50'"
              >
                <div class="font-medium">{{ size.label }}</div>
                <div class="text-xs opacity-70 mt-0.5">{{ size.seeds }} seeds</div>
              </button>
            </div>
          </div>

          <!-- Agent Engine + Machine Profile Row -->
          <div class="grid grid-cols-2 gap-4">
            <!-- Agent Engine -->
            <div>
              <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-3">
                Agent Engine
              </label>
              <div class="flex gap-2">
                <button
                  v-for="engine in engines"
                  :key="engine.id"
                  @click="agentEngine = engine.id"
                  class="flex-1 px-3 py-2 rounded-lg border transition-all text-sm"
                  :class="agentEngine === engine.id
                    ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400'
                    : 'bg-surface-2/30 border-line/50 text-muted hover:border-line/50'"
                >
                  <div class="font-medium">{{ engine.label }}</div>
                  <div class="text-xs opacity-70 mt-0.5">{{ engine.description }}</div>
                </button>
              </div>
            </div>

            <!-- Machine Profile -->
            <div>
              <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-3">
                Machine Profile
              </label>
              <div class="flex gap-2">
                <button
                  v-for="profile in machineProfiles"
                  :key="profile.id"
                  @click="selectedMachineProfile = profile.id"
                  class="flex-1 px-3 py-2 rounded-lg border transition-all text-sm"
                  :class="selectedMachineProfile === profile.id
                    ? 'bg-purple-600/20 border-purple-500/50 text-purple-400'
                    : 'bg-surface-2/30 border-line/50 text-muted hover:border-line/50'"
                >
                  <div class="font-medium">{{ profile.name }}</div>
                  <div class="text-xs opacity-70 mt-0.5">{{ profile.description }}</div>
                </button>
              </div>
            </div>
          </div>

          <!-- Build Mode (hidden by default - legacy feature) -->
          <div v-if="showLegacyMode">
            <label class="block text-xs font-medium text-muted uppercase tracking-wide mb-3">
              Build Mode
            </label>
            <div class="flex gap-2">
              <button
                v-for="mode in buildModes"
                :key="mode.id"
                @click="buildMode = mode.id"
                class="flex-1 px-4 py-3 rounded-lg border transition-all text-sm"
                :class="buildMode === mode.id
                  ? 'bg-cyan-600/20 border-cyan-500/50 text-cyan-400'
                  : 'bg-surface-2/30 border-line/50 text-muted hover:border-line/50'"
              >
                <div class="font-medium">{{ mode.label }}</div>
                <div class="text-xs opacity-70 mt-0.5">{{ mode.description }}</div>
              </button>
            </div>
          </div>

          <!-- Create Course Button (New Course Only) -->
          <div v-if="isNewCourse" class="pt-2">
            <button
              @click="createCourse"
              :disabled="!canCreateCourse"
              class="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-surface-2 disabled:text-faint text-white font-medium rounded-lg transition-colors"
            >
              Create Course
            </button>
          </div>
        </div>
      </section>

      <!-- Phase Progress (Phases 1-3 mode) - Legacy, hidden by default -->
      <section v-if="showLegacyMode && buildMode === 'phases'" class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-medium text-muted uppercase tracking-wide">Phase Progress</h2>
          <div v-if="etaDisplay" class="text-sm text-muted">
            <span class="text-emerald-400">~{{ etaDisplay.time }}</span>
            <span class="text-faint"> at {{ etaDisplay.rate }}</span>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-4">
          <div
            v-for="phase in phases"
            :key="phase.number"
            class="phase-card"
            :class="phaseCardClass(phase)"
          >
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-3">
                <span class="status-dot" :class="statusDotClassFor(phase.status)"></span>
                <div>
                  <div class="text-xs text-faint uppercase tracking-wide">Phase {{ phase.number }}</div>
                  <div class="text-sm font-medium text-ink">{{ phase.name }}</div>
                </div>
              </div>
              <span
                class="text-xs uppercase tracking-wide px-2 py-0.5 rounded"
                :class="statusLabelClass(phase.status)"
              >
                {{ phase.status }}
              </span>
            </div>

            <!-- Progress Bar -->
            <div class="h-1.5 bg-surface-2/50 rounded-full overflow-hidden mb-2">
              <div
                class="h-full transition-all duration-500 rounded-full"
                :class="progressBarClass(phase.status)"
                :style="{ width: `${phase.progress}%` }"
              ></div>
            </div>

            <!-- Count -->
            <div class="flex items-baseline gap-1 font-mono text-sm">
              <span class="text-ink">{{ phase.completed.toLocaleString() }}</span>
              <span class="text-faint">/</span>
              <span class="text-faint">{{ phase.total.toLocaleString() }}</span>
              <span class="text-faint text-xs ml-1">{{ phase.unit }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Course Builder Progress (Builder mode) -->
      <section v-else class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-medium text-muted uppercase tracking-wide">Course Builder</h2>
          <div v-if="builderProgress.status === 'running'" class="text-sm text-muted">
            <span class="text-cyan-400">Building...</span>
          </div>
        </div>

        <div class="bg-surface/30 border rounded-lg p-6"
          :class="builderProgress.status === 'running' ? 'border-cyan-500/30' : 'border-line/50'"
        >
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-3">
              <span class="status-dot" :class="builderProgress.status === 'running' ? 'bg-cyan-500 animate-pulse' : builderProgress.status === 'complete' ? 'bg-emerald-500' : 'bg-surface-3'"></span>
              <div>
                <div class="text-xs text-faint uppercase tracking-wide">
                  {{ parallelPhase === 'finalizing' ? 'Finalizing' : '10 Parallel Agents' }}
                </div>
                <div class="text-sm font-medium text-ink">
                  {{ parallelPhase === 'finalizing' ? 'Merging to Live' : 'Drafting Seeds' }}
                </div>
              </div>
            </div>
            <span
              class="text-xs uppercase tracking-wide px-2 py-0.5 rounded"
              :class="builderProgress.status === 'running' ? 'bg-cyan-500/20 text-cyan-400' : builderProgress.status === 'complete' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-surface-2/50 text-faint'"
            >
              {{ builderProgress.status }}
            </span>
          </div>

          <!-- Progress Bar -->
          <div class="h-2 bg-surface-2/50 rounded-full overflow-hidden mb-3 flex">
            <!-- Draft progress (cyan) -->
            <div class="h-full bg-cyan-500 transition-all duration-500"
              :style="{ width: `${draftsExpected > 0 ? Math.min(100, draftsSubmitted / draftsExpected * 100) : 0}%` }">
            </div>
            <!-- Finalize progress (emerald, overlaid on top of drafts) -->
            <div v-if="parallelPhase === 'finalizing'" class="h-full bg-emerald-500 transition-all duration-500"
              :style="{ width: `${builderProgress.totalSeeds > 0 ? (builderProgress.currentSeed / builderProgress.totalSeeds * 100) : 0}%` }">
            </div>
          </div>

          <!-- Stats Row -->
          <div class="grid grid-cols-4 gap-4 text-center">
            <div>
              <div class="text-2xl font-mono font-semibold text-cyan-400">
                {{ draftsSubmitted }}
              </div>
              <div class="text-xs text-faint">/ {{ draftsExpected }} drafted</div>
            </div>
            <div>
              <div class="text-2xl font-mono font-semibold text-emerald-400">
                {{ builderProgress.currentSeed }}
              </div>
              <div class="text-xs text-faint">/ {{ builderProgress.totalSeeds || seedCount }} finalized</div>
            </div>
            <div>
              <div class="text-2xl font-mono font-semibold text-ink">
                {{ builderProgress.legosInserted }}
              </div>
              <div class="text-xs text-faint uppercase tracking-wide">LEGOs</div>
            </div>
            <div>
              <div class="text-2xl font-mono font-semibold text-ink">
                {{ builderProgress.phrasesInserted }}
              </div>
              <div class="text-xs text-faint uppercase tracking-wide">Phrases</div>
            </div>
          </div>
        </div>
      </section>

      <!-- Calibration Review Queue -->
      <section v-if="calibrationReview.pending > 0 || calibrationReview.approved > 0" class="bg-surface/30 border border-amber-500/30 rounded-lg p-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="status-dot bg-amber-500 animate-pulse"></span>
            <div>
              <div class="text-sm font-medium text-ink">Calibration Review Queue</div>
              <div class="text-xs text-faint">
                {{ calibrationReview.approved }}/{{ calibrationReview.total }} approved
                <span v-if="calibrationReview.pending > 0" class="text-amber-400 ml-1">
                  &middot; {{ calibrationReview.pending }} awaiting review
                </span>
              </div>
            </div>
          </div>
          <router-link
            :to="`/production/${courseCode}/calibration-review`"
            class="px-4 py-2 bg-amber-600/20 border border-amber-500/50 text-amber-400 rounded-lg hover:bg-amber-600/30 transition-colors text-sm font-medium"
          >
            Review Seeds
          </router-link>
        </div>
      </section>

      <!-- Stats Bar -->
      <section class="grid grid-cols-4 gap-4">
        <div
          v-for="stat in stats"
          :key="stat.label"
          class="bg-surface/30 border border-line/50 rounded-lg px-4 py-3"
        >
          <div class="text-2xl font-mono font-semibold text-ink">
            {{ stat.value.toLocaleString() }}
          </div>
          <div class="text-xs text-faint uppercase tracking-wide mt-1">
            {{ stat.label }}
          </div>
        </div>
      </section>

      <!-- Job Control -->
      <section
        v-if="jobStatus !== 'idle' || hasWorkToDo"
        class="bg-surface/30 border border-line/50 rounded-lg p-6"
      >
        <div class="flex items-center justify-between">
          <div>
            <div class="flex items-center gap-3 mb-2">
              <h3 class="text-sm font-medium text-ink uppercase tracking-wide">Job Control</h3>
              <span
                v-if="isStuck"
                class="px-2 py-0.5 bg-amber-500/20 border border-amber-500/30 rounded text-xs text-amber-400 uppercase tracking-wide"
              >
                Stuck
              </span>
            </div>

            <div v-if="jobStatus === 'running'" class="text-sm text-muted space-y-1">
              <div>Elapsed: <span class="font-mono text-ink">{{ elapsedTime }}</span></div>
              <div v-if="buildMode === 'phases'">Workers: <span class="font-mono text-ink">{{ activeWorkers }} active</span></div>
              <div v-if="buildMode === 'builder'">Seed: <span class="font-mono text-ink">{{ builderProgress.currentSeed }} / {{ builderProgress.totalSeeds }}</span></div>
              <div v-if="lastActivityAgo">Last activity: <span class="font-mono text-ink">{{ lastActivityAgo }}</span></div>
            </div>

            <div v-else-if="hasWorkToDo" class="text-sm text-muted">
              <template v-if="buildMode === 'builder'">
                Ready to build {{ seedCount }} seeds with single agent
              </template>
              <template v-else>
                {{ nextActionDescription }}
              </template>
            </div>
          </div>

          <div class="flex gap-3">
            <!-- PHASES MODE: Preview Button (when no preview shown) - Legacy -->
            <button
              v-if="showLegacyMode && buildMode === 'phases' && jobStatus === 'idle' && hasIncompletePhases && !previewExpanded"
              @click="fetchPreview"
              :disabled="previewLoading"
              class="px-5 py-2.5 bg-surface-2 hover:bg-surface-3 disabled:opacity-50 text-ink font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <svg v-if="previewLoading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{{ previewLoading ? 'Loading...' : 'Preview' }}</span>
            </button>

            <!-- PHASES MODE: Execute Button (when preview shown) - Legacy -->
            <button
              v-if="showLegacyMode && buildMode === 'phases' && jobStatus === 'idle' && hasIncompletePhases && previewExpanded"
              @click="startPhase"
              class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors"
            >
              Execute {{ nextPhaseAction }}
            </button>

            <!-- BUILDER MODE: Start Button -->
            <button
              v-if="buildMode === 'builder' && jobStatus === 'idle' && canStartBuilder"
              @click="startCourseBuilder"
              class="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors"
            >
              Start Course Builder
            </button>

            <!-- Cancel Preview Button -->
            <button
              v-if="previewExpanded"
              @click="closePreview"
              class="px-5 py-2.5 bg-surface-2 hover:bg-surface-3 text-ink font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>

            <!-- Clear Stale Job Button (when preview shows 0 work but phases incomplete) -->
            <button
              v-if="showClearStaleButton"
              @click="clearStaleJob"
              :disabled="clearingStale"
              class="px-5 py-2.5 bg-amber-600/80 hover:bg-amber-600 disabled:opacity-50 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <svg v-if="clearingStale" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>{{ clearingStale ? 'Clearing...' : 'Clear Stale Job' }}</span>
            </button>

            <!-- Stop Button -->
            <button
              v-if="jobStatus === 'running'"
              @click="stopJob"
              :disabled="jobStatus === 'stopping'"
              class="px-5 py-2.5 bg-surface-2 hover:bg-surface-3 disabled:opacity-50 text-ink font-medium rounded-lg transition-colors"
            >
              {{ jobStatus === 'stopping' ? 'Stopping...' : 'Stop Job' }}
            </button>

            <!-- Force Kill Button -->
            <button
              v-if="showForceKill"
              @click="forceKill"
              class="px-5 py-2.5 bg-red-600/80 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
            >
              Force Kill
            </button>
          </div>
        </div>

        <!-- Inline Preview Panel -->
        <div
          v-if="previewExpanded && previewData"
          class="border-t border-line/50 px-6 py-5 bg-surface/20"
        >
          <div class="flex items-start justify-between mb-4">
            <div>
              <h4 class="text-sm font-medium text-ink uppercase tracking-wide mb-1">Dry Run Preview</h4>
              <p class="text-sm text-muted">{{ previewData.summary }}</p>
            </div>
            <span class="text-xs text-emerald-400 uppercase tracking-wide px-2 py-1 bg-emerald-500/10 rounded">
              Phase {{ previewData.phase }}
            </span>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <!-- Work to do -->
            <div class="bg-surface/50 rounded-lg p-4">
              <div class="text-xs text-faint uppercase tracking-wide mb-1">Work</div>
              <div class="text-2xl font-semibold text-ink">
                {{ previewData.legosToProcess || previewData.seedsToProcess || 0 }}
              </div>
              <div class="text-xs text-muted">
                {{ previewData.phase === 3 ? 'LEGOs' : 'seeds' }} to process
              </div>
            </div>

            <!-- Mode -->
            <div class="bg-surface/50 rounded-lg p-4">
              <div class="text-xs text-faint uppercase tracking-wide mb-1">Mode</div>
              <div class="text-lg font-semibold" :class="previewData.isResumeMode ? 'text-amber-400' : 'text-emerald-400'">
                {{ previewData.isResumeMode ? 'Resume' : 'Fresh' }}
              </div>
              <div class="text-xs text-muted">
                {{ previewData.isResumeMode ? 'Continuing work' : 'Starting new' }}
              </div>
            </div>

            <!-- Workers -->
            <div class="bg-surface/50 rounded-lg p-4">
              <div class="text-xs text-faint uppercase tracking-wide mb-1">Workers</div>
              <div class="text-lg font-semibold text-ink">
                {{ previewData.browserTabs }} &times; {{ previewData.agentsPerBrowser }}
              </div>
              <div class="text-xs text-muted">
                {{ previewData.totalAgents }} total agents
              </div>
            </div>

            <!-- Estimate -->
            <div class="bg-surface/50 rounded-lg p-4">
              <div class="text-xs text-faint uppercase tracking-wide mb-1">Estimate</div>
              <div class="text-lg font-semibold text-ink">
                ~{{ previewData.estimatedMinutes }} min
              </div>
              <div class="text-xs text-muted">
                at {{ previewData.estimatedRate }} {{ previewData.phase === 3 ? 'LEGOs' : 'seeds' }}/min
              </div>
            </div>
          </div>

          <!-- LEGO type breakdown (Phase 3 only) -->
          <div v-if="previewData.typeBreakdown && Object.keys(previewData.typeBreakdown).length > 0" class="mt-4 pt-4 border-t border-line/30">
            <div class="text-xs text-faint uppercase tracking-wide mb-2">LEGO Types</div>
            <div class="flex gap-4">
              <div v-for="(count, type) in previewData.typeBreakdown" :key="type" class="text-sm">
                <span class="text-muted">{{ type }}-type:</span>
                <span class="text-ink font-mono ml-1">{{ count }}</span>
              </div>
            </div>
          </div>

          <!-- Preview error -->
          <div v-if="previewError" class="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <span class="text-red-400 text-sm">{{ previewError }}</span>
          </div>
        </div>
      </section>

      <!-- Pipeline Stepper -->
      <section v-if="courseCode && pipelineStatus" class="bg-surface/30 border border-line/50 rounded-lg overflow-hidden px-6 py-5">
        <div class="flex items-center justify-between mb-4">
          <span class="text-sm font-medium text-ink uppercase tracking-wide">Pipeline</span>
          <div class="flex items-center gap-3">
            <span v-if="pipelineStatus.is_running" class="flex items-center gap-1.5 text-xs text-emerald-400">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Running
            </span>
            <span v-else-if="pipelineStatus.human_gate" class="text-xs text-amber-400">Awaiting Review</span>
            <button
              v-if="!pipelineStatus.is_running && pipelineStatus.stage !== 'complete'"
              @click="startPipeline"
              :disabled="pipelineStarting"
              class="px-4 py-1.5 bg-emerald-600/20 border border-emerald-500/50 text-emerald-400 rounded text-xs font-medium hover:bg-emerald-600/30 transition-colors disabled:opacity-50"
            >
              {{ pipelineStarting ? 'Starting...' : (pipelineStatus.stage === 'not_started' ? 'Build Course' : 'Resume Pipeline') }}
            </button>
            <router-link
              v-if="pipelineStatus.human_gate"
              :to="`/production/${courseCode}/${pipelineStatus.stage === 'calibrate' ? 'calibration-review' : 'qa-review'}`"
              class="px-4 py-1.5 bg-amber-600/20 border border-amber-500/50 text-amber-400 rounded text-xs font-medium hover:bg-amber-600/30 transition-colors inline-block text-center no-underline"
            >
              Open Review
            </router-link>
          </div>
        </div>

        <!-- Stage steps -->
        <div class="flex items-center gap-1">
          <template v-for="(stage, idx) in pipelineStages" :key="stage.id">
            <div
              class="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-all"
              :class="stageClass(stage, idx)"
            >
              <span v-if="stageComplete(stage, idx)" class="text-emerald-400">&#10003;</span>
              <span v-else-if="stageCurrent(stage)" class="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
              <span>{{ stage.label }}</span>
            </div>
            <span v-if="idx < pipelineStages.length - 1" class="text-faint">&rarr;</span>
          </template>
        </div>
      </section>

      <!-- Seed Grid (Rebuild Visualization) -->
      <section v-if="seedGrid.length > 0" class="bg-surface/30 border border-line/50 rounded-lg overflow-hidden">
        <button
          @click="seedGridExpanded = !seedGridExpanded"
          class="w-full px-6 py-4 flex items-center justify-between hover:bg-surface/50 transition-colors"
        >
          <div class="flex items-center gap-3">
            <span class="text-sm font-medium text-ink uppercase tracking-wide">Seed Grid</span>
            <span class="text-xs text-faint">
              {{ seedGridFinalized }}/{{ seedGrid.length }} finalized
            </span>
            <span v-if="seedGridDrafted > 0" class="text-xs text-amber-400">
              {{ seedGridDrafted }} drafted
            </span>
            <span v-if="seedGridCollision > 0" class="text-xs text-red-400">
              {{ seedGridCollision }} collision
            </span>
          </div>
          <svg
            class="w-5 h-5 text-muted transition-transform duration-200"
            :class="{ 'rotate-180': seedGridExpanded }"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div v-show="seedGridExpanded" class="border-t border-line/50 px-6 py-5">
          <!-- Rebuild Controls -->
          <div class="flex items-center gap-4 mb-4">
            <div class="flex items-center gap-2">
              <label class="text-xs text-muted">From</label>
              <input
                v-model.number="rebuildFrom"
                type="number" min="1" :max="rebuildTo"
                class="w-20 bg-surface-2/50 border border-line/50 rounded px-2 py-1 text-sm text-ink font-mono"
              />
              <label class="text-xs text-muted">To</label>
              <input
                v-model.number="rebuildTo"
                type="number" :min="rebuildFrom" max="999"
                class="w-20 bg-surface-2/50 border border-line/50 rounded px-2 py-1 text-sm text-ink font-mono"
              />
            </div>
            <button
              v-if="!rebuildConfirming"
              @click="rebuildConfirming = true"
              :disabled="rebuildRunning"
              class="px-4 py-1.5 bg-red-600/80 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Rebuild
            </button>
            <template v-if="rebuildConfirming">
              <span class="text-xs text-red-400">Delete LEGOs + phrases for seeds {{ rebuildFrom }}-{{ rebuildTo }}?</span>
              <button
                @click="executeRebuild"
                :disabled="rebuildRunning"
                class="px-4 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {{ rebuildRunning ? 'Wiping...' : 'Confirm' }}
              </button>
              <button
                @click="rebuildConfirming = false"
                class="px-3 py-1.5 bg-surface-2 hover:bg-surface-3 text-ink text-sm rounded-lg transition-colors"
              >
                Cancel
              </button>
            </template>
          </div>

          <!-- Grid -->
          <div class="flex flex-wrap gap-1">
            <div
              v-for="cell in seedGrid"
              :key="cell.seed"
              class="w-5 h-5 rounded-sm cursor-default transition-colors"
              :class="seedCellClass(cell)"
              :title="`S${cell.seed}: ${cell.status} (${cell.legos}L, ${cell.phrases}P)`"
            ></div>
          </div>

          <!-- Legend -->
          <div class="flex items-center gap-4 mt-3 text-xs text-faint">
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-surface-2/80"></span> Empty</span>
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-amber-500/80"></span> Drafted</span>
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-red-500/80"></span> Collision</span>
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-emerald-500/80"></span> Finalized</span>
          </div>
        </div>
      </section>

      <!-- Wipe Course -->
      <section class="bg-surface/30 border border-red-900/30 rounded-lg overflow-hidden">
        <div class="px-6 py-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span class="text-sm font-medium text-red-400 uppercase tracking-wide">Wipe Course</span>
            <span class="text-xs text-faint">Delete all content, keep course shell</span>
          </div>
          <div class="flex items-center gap-3">
            <label class="flex items-center gap-2 text-xs text-muted cursor-pointer">
              <input type="checkbox" v-model="wipeKeepAudio" class="rounded border-line bg-surface-2" />
              Keep audio
            </label>
            <button
              v-if="!wipeConfirming"
              @click="wipeConfirming = true"
              :disabled="wipeRunning"
              class="px-4 py-1.5 bg-red-600/80 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Wipe
            </button>
            <template v-if="wipeConfirming">
              <span class="text-xs text-red-400">Delete all seeds, LEGOs, phrases{{ wipeKeepAudio ? '' : ', audio' }}?</span>
              <button
                @click="executeWipe"
                :disabled="wipeRunning"
                class="px-4 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {{ wipeRunning ? 'Wiping...' : 'Confirm Wipe' }}
              </button>
              <button
                @click="wipeConfirming = false"
                class="px-3 py-1.5 bg-surface-2 hover:bg-surface-3 text-ink text-sm rounded-lg transition-colors"
              >
                Cancel
              </button>
            </template>
          </div>
        </div>
      </section>

      <!-- Event Log (Collapsible) -->
      <section class="bg-surface/30 border border-line/50 rounded-lg overflow-hidden">
        <button
          @click="logExpanded = !logExpanded"
          class="w-full px-6 py-4 flex items-center justify-between hover:bg-surface/50 transition-colors"
        >
          <div class="flex items-center gap-3">
            <span class="text-sm font-medium text-ink uppercase tracking-wide">Event Log</span>
            <span class="text-xs text-faint">{{ events.length }} events</span>
          </div>
          <div class="flex items-center gap-3">
            <span
              v-if="isPolling"
              class="text-xs text-emerald-500 uppercase tracking-wide flex items-center gap-1.5"
            >
              <span class="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              Live
            </span>
            <svg
              class="w-5 h-5 text-muted transition-transform duration-200"
              :class="{ 'rotate-180': logExpanded }"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        <div
          v-show="logExpanded"
          class="border-t border-line/50 max-h-64 overflow-y-auto"
        >
          <div
            v-for="event in events"
            :key="event.id"
            class="px-6 py-2 border-b border-line/30 last:border-0 flex items-start gap-4 text-sm"
          >
            <span class="font-mono text-faint text-xs whitespace-nowrap">{{ event.time }}</span>
            <span class="text-ink">{{ event.message }}</span>
          </div>
          <div v-if="events.length === 0" class="px-6 py-8 text-center text-faint text-sm">
            No events yet
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { io } from 'socket.io-client'
import { LanguageBriefEditor } from '../components/generation'
import { getApiUrl } from '@/services/api'
import { useBuildMonitor } from '@/composables/useBuildMonitor'
import { useCourses } from '../composables/useCourses'

const route = useRoute()
const router = useRouter()
const { getCourseName, getLanguageName } = useCourses()

// WebSocket connection for real-time events
let socket = null

// Props
const props = defineProps({
  courseCode: {
    type: String,
    default: null
  }
})

// State
const configExpanded = ref(false)
const logExpanded = ref(false)
const isPolling = ref(false)

// Config state
const knownLang = ref('')
const targetLang = ref('')
const seedCount = ref(300)
const agentEngine = ref('browser')

// Progress state
const phases = ref([
  { number: 1, name: 'Translation', status: 'pending', completed: 0, total: 0, unit: 'seeds' },
  { number: 2, name: 'Conflicts', status: 'pending', completed: 0, total: 0, unit: 'LEGOs' },
  { number: 3, name: 'Baskets', status: 'pending', completed: 0, total: 0, unit: 'NEW LEGOs' }
])

const stats = ref([
  { label: 'Seeds', value: 0 },
  { label: 'LEGOs', value: 0 },
  { label: 'NEW LEGOs', value: 0 },
  { label: 'Phrases', value: 0 }
])

// Job state
const jobStatus = ref('idle') // idle, running, stopping, stuck
const activeWorkers = ref(0)
const jobStartTime = ref(null)
const lastProgressAt = ref(null)
const stopRequestedAt = ref(null)

// Preview state (dry run)
const previewExpanded = ref(false)
const previewData = ref(null)
const previewLoading = ref(false)
const previewError = ref(null)

// Stale job clearing
const clearingStale = ref(false)

// Seed grid state
const seedGrid = ref([])
const seedGridExpanded = ref(true)
const rebuildFrom = ref(11)
const rebuildTo = ref(seedCount.value)
const rebuildConfirming = ref(false)
const rebuildRunning = ref(false)

// Calibration review queue state
const calibrationReview = ref({ pending: 0, approved: 0, redo: 0, total: 0 })

// Pipeline state
const pipelineStatus = ref(null)

// Build monitor — direct Supabase reads + Realtime (replaces HTTP polling)
const effectiveCourseCodeForMonitor = computed(() => props.courseCode || route.params.courseCode)
const buildMonitor = useBuildMonitor(effectiveCourseCodeForMonitor)

// Sync buildMonitor data into existing component state
watch(buildMonitor.stats, (s) => {
  if (!s || buildMode.value !== 'builder') return
  stats.value = [
    { label: 'Seeds', value: builderProgress.value.currentSeed },
    { label: 'LEGOs', value: s.legos || 0 },
    { label: 'Phrases', value: s.practicePhrases || 0 },
    { label: 'Ratio', value: s.legos > 0 ? (s.practicePhrases / s.legos).toFixed(1) : 0 }
  ]
  builderProgress.value.legosInserted = s.legos || 0
  builderProgress.value.phrasesInserted = s.practicePhrases || 0
  lastProgressAt.value = new Date().toISOString()
}, { deep: true })

watch(buildMonitor.seedGrid, (grid) => {
  if (grid && grid.length > 0) {
    seedGrid.value = grid
  }
}, { deep: true })

watch(buildMonitor.buildStatus, (bs) => {
  if (!bs) return
  if (bs.progress) {
    builderProgress.value.currentSeed = bs.progress.completed || 0
    builderProgress.value.totalSeeds = bs.build?.total_seeds || seedCount.value
  }
  if (bs.active) {
    jobStatus.value = bs.build?.status === 'stalled' ? 'stuck' : 'running'
    builderProgress.value.status = 'running'
  } else if (bs.progress?.isComplete) {
    jobStatus.value = 'idle'
    builderProgress.value.status = 'complete'
  }
}, { deep: true })

watch(buildMonitor.pipeline, (p) => {
  if (p && p.stage) {
    pipelineStatus.value = p
  }
}, { deep: true })
const pipelineStarting = ref(false)
const pipelineStages = [
  { id: 'translate', label: 'Translate' },
  { id: 'calibrate', label: 'Calibrate' },
  { id: 'golden', label: 'Golden' },
  { id: 'build_mvp', label: 'Build MVP' },
  { id: 'qa_review', label: 'QA Review' },
  { id: 'gender_prep', label: 'Gender Prep' },
  { id: 'complete', label: 'Complete' },
]

function stageClass(stage, idx) {
  if (!pipelineStatus.value) return 'bg-surface/50 text-faint'
  if (stageComplete(stage, idx)) return 'bg-emerald-500/10 text-emerald-400'
  if (stageCurrent(stage)) return 'bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/30'
  return 'bg-surface/50 text-faint'
}

function stageComplete(stage, idx) {
  if (!pipelineStatus.value) return false
  if (pipelineStatus.value.stage === 'complete') return true
  return idx < pipelineStatus.value.stage_index
}

function stageCurrent(stage) {
  return pipelineStatus.value?.stage === stage.id
}

async function fetchPipelineStatus() {
  if (!props.courseCode) return
  try {
    const builderApiUrl = import.meta.env.VITE_COURSE_BUILDER_API_URL || 'http://localhost:3471'
    const resp = await fetch(`${builderApiUrl}/api/build/pipeline/${props.courseCode}`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    if (resp.ok) {
      pipelineStatus.value = await resp.json()
    }
  } catch (e) {
    console.error('[CourseManager] pipeline status error:', e)
  }
}

async function startPipeline() {
  if (!props.courseCode) return
  pipelineStarting.value = true
  try {
    const builderApiUrl = import.meta.env.VITE_COURSE_BUILDER_API_URL || 'http://localhost:3471'
    const resp = await fetch(`${builderApiUrl}/api/build/pipeline/${props.courseCode}`, {
      method: 'POST',
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    if (resp.ok) {
      await fetchPipelineStatus()
    }
  } catch (e) {
    console.error('[CourseManager] pipeline start error:', e)
  } finally {
    pipelineStarting.value = false
  }
}

// Wipe state
const wipeConfirming = ref(false)
const wipeRunning = ref(false)
const wipeKeepAudio = ref(true)
watch(seedCount, (val) => { rebuildTo.value = val })

const seedGridFinalized = computed(() => seedGrid.value.filter(s => s.status === 'complete').length)
const seedGridDrafted = computed(() => seedGrid.value.filter(s => s.status === 'drafted').length)
const seedGridCollision = computed(() => seedGrid.value.filter(s => s.status === 'collision' || s.status === 'rework').length)

function seedCellClass(cell) {
  if (cell.status === 'complete') return 'bg-emerald-500/80'
  if (cell.status === 'drafted') return 'bg-amber-500/80'
  if (cell.status === 'collision' || cell.status === 'rework') return 'bg-red-500/80'
  return 'bg-surface-2/80'
}

async function executeWipe() {
  const code = props.courseCode || route.params.courseCode
  if (!code) return

  wipeRunning.value = true
  try {
    const builderApiUrl = import.meta.env.VITE_COURSE_BUILDER_API_URL || 'http://localhost:3471'
    const keepAudioParam = wipeKeepAudio.value ? '&keep_audio=true' : ''
    const response = await fetch(`${builderApiUrl}/api/course/${code}/wipe?confirm=yes${keepAudioParam}`, {
      method: 'POST',
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })

    if (!response.ok) throw new Error((await response.clone().json().catch(() => ({}))).error || `HTTP ${response.status}`)
    const data = await response.json()
    if (data.ok) {
      const parts = Object.entries(data.deleted || {}).filter(([, v]) => v > 0).map(([k, v]) => `${v} ${k}`).join(', ')
      addEvent(`Wiped course: ${parts || 'nothing to delete'}. Re-created ${data.seeds_created} empty seeds.${data.audio_kept ? ' Audio kept.' : ''}`)
      wipeConfirming.value = false
      await fetchSeedGrid()
      await fetchStats()
    } else {
      addEvent(`Wipe failed: ${data.error}`)
    }
  } catch (err) {
    addEvent(`Wipe error: ${err.message}`)
  } finally {
    wipeRunning.value = false
  }
}

async function fetchSeedGrid() {
  const code = props.courseCode || route.params.courseCode
  if (!code) return
  try {
    const builderApiUrl = import.meta.env.VITE_COURSE_BUILDER_API_URL || 'http://localhost:3471'
    const response = await fetch(`${builderApiUrl}/api/build/seed-grid/${code}`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    if (response.ok) {
      const data = await response.json()
      seedGrid.value = data.seeds || []
    }
  } catch (err) {
    console.error('Failed to fetch seed grid:', err)
  }
}

async function executeRebuild() {
  const code = props.courseCode || route.params.courseCode
  if (!code) return

  rebuildRunning.value = true
  try {
    const builderApiUrl = import.meta.env.VITE_COURSE_BUILDER_API_URL || 'http://localhost:3471'
    const response = await fetch(`${builderApiUrl}/api/build/rebuild/${code}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({ from_seed: rebuildFrom.value, to_seed: rebuildTo.value, confirm: true })
    })

    if (!response.ok) throw new Error((await response.clone().json().catch(() => ({}))).error || `HTTP ${response.status}`)
    const data = await response.json()
    if (data.ok) {
      addEvent(`Rebuild started: wiped ${data.legos_deleted} LEGOs + ${data.phrases_deleted} phrases for seeds ${rebuildFrom.value}-${rebuildTo.value}`)
      rebuildConfirming.value = false
      await fetchSeedGrid()
    } else {
      addEvent(`Rebuild failed: ${data.error}`)
    }
  } catch (err) {
    addEvent(`Rebuild error: ${err.message}`)
  } finally {
    rebuildRunning.value = false
  }
}

// ETA tracking
const etaHistory = ref([])
const MAX_HISTORY = 30

// Events
const events = ref([])

// Selectable languages for a new course. The set is deliberately restricted
// (not every language Popty knows a name for is buildable here) — display
// names for these codes come from languageNames.js, not from this list.
const languages = ref([
  { code: 'eng' },
  { code: 'spa' },
  { code: 'fra' },
  { code: 'deu' },
  { code: 'ita' },
  { code: 'por' },
  { code: 'zho' },
  { code: 'jpn' },
  { code: 'kor' },
  { code: 'ara' }
])

const courseSizes = [
  { seeds: 30, label: 'Test' },
  { seeds: 300, label: 'MVP' },
  { seeds: 668, label: 'Full' }
]

const engines = [
  { id: 'cli', label: 'iTerm2', description: 'Pro Max #1' },
  { id: 'terminal', label: 'Terminal', description: 'Pro Max #2' },
  { id: 'browser', label: 'Safari', description: 'Browser-based' }
]

// Machine profiles for parallelization (synced with environment switcher)
const machineProfiles = ref([
  { id: 'tom', name: "Tom's MacBook", description: '24GB RAM' },
  { id: 'kai', name: "Kai's Machine", description: '8GB RAM' },
  { id: 'default', name: 'Default', description: '16GB assumed' }
])
// Read from localStorage (set by EnvironmentSwitcher based on selected environment)
const selectedMachineProfile = ref(localStorage.getItem('ssi_machine_profile') || 'tom')

// Build mode: phases (legacy 1-3) or builder (single agent)
// Default to builder mode - phases 1-3 is legacy
const buildMode = ref('builder')
const showLegacyMode = ref(false) // Set to true to show Phases 1-3 option
const buildModes = [
  { id: 'phases', label: 'Phases 1-3', description: 'Parallel agents' },
  { id: 'builder', label: 'Course Builder', description: 'Single agent' }
]

// Course Builder state
const builderProgress = ref({
  status: 'idle', // idle, running, paused, complete
  currentSeed: 0,
  totalSeeds: 0,
  legosInserted: 0,
  phrasesInserted: 0
})

// Parallel build state
const parallelPhase = ref('none')  // 'none' | 'drafting' | 'finalizing' | 'complete'
const draftsSubmitted = ref(0)
const draftsExpected = ref(0)

// Computed
const isNewCourse = computed(() => !props.courseCode && !route.params.courseCode)

const displayName = computed(() => {
  const code = props.courseCode || route.params.courseCode
  if (!code) return ''
  return getCourseName(code)
})

// Effective language codes (from existing course or new course selection)
const effectiveKnownCode = computed(() => {
  const code = props.courseCode || route.params.courseCode
  if (code) {
    const [, knownPart] = code.split('_for_')
    return knownPart
  }
  return knownLang.value
})

const effectiveTargetCode = computed(() => {
  const code = props.courseCode || route.params.courseCode
  if (code) {
    const [targetPart] = code.split('_for_')
    return targetPart.split('_')[0]
  }
  return targetLang.value
})

const effectiveKnownName = computed(() => getLanguageName(effectiveKnownCode.value))

const effectiveTargetName = computed(() => getLanguageName(effectiveTargetCode.value))

// Language brief state
const languageBrief = ref(null)

function onBriefReady(brief) {
  languageBrief.value = brief
}

const canCreateCourse = computed(() => {
  return knownLang.value && targetLang.value && knownLang.value !== targetLang.value
})

const hasIncompletePhases = computed(() => {
  return phases.value.some(p => p.status !== 'complete')
})

// Builder mode: can start if not already complete
const canStartBuilder = computed(() => {
  return builderProgress.value.status !== 'complete' && builderProgress.value.status !== 'running'
})

// Unified: has work to do based on mode
const hasWorkToDo = computed(() => {
  if (buildMode.value === 'builder') {
    return canStartBuilder.value
  }
  return hasIncompletePhases.value
})

const nextPhaseAction = computed(() => {
  // Pick earliest incomplete phase by number (pending or partial)
  const nextPhase = phases.value
    .filter(p => p.status === 'pending' || p.status === 'partial')
    .sort((a, b) => a.number - b.number)[0]

  if (nextPhase) {
    return nextPhase.status === 'partial'
      ? `Resume Phase ${nextPhase.number}`
      : `Start Phase ${nextPhase.number}`
  }

  return 'Start'
})

const nextActionDescription = computed(() => {
  // Pick earliest incomplete phase by number (pending or partial)
  const nextPhase = phases.value
    .filter(p => p.status === 'pending' || p.status === 'partial')
    .sort((a, b) => a.number - b.number)[0]

  if (nextPhase) {
    return nextPhase.status === 'partial'
      ? `Phase ${nextPhase.number} is ${nextPhase.completed}/${nextPhase.total} ${nextPhase.unit}`
      : `Ready to start Phase ${nextPhase.number}: ${nextPhase.name}`
  }

  return 'All phases complete'
})

const statusLabel = computed(() => {
  if (jobStatus.value === 'running') {
    if (buildMode.value === 'builder') {
      return 'Building Course'
    }
    const activePhase = phases.value.find(p => p.status === 'running')
    return activePhase ? `Phase ${activePhase.number} Running` : 'Running'
  }
  if (jobStatus.value === 'stopping') return 'Stopping...'
  if (jobStatus.value === 'stuck') return 'Stuck'
  return ''
})

const statusBadgeClass = computed(() => {
  switch (jobStatus.value) {
    case 'running': return 'bg-blue-500/20 border border-blue-500/30 text-blue-400'
    case 'stopping': return 'bg-amber-500/20 border border-amber-500/30 text-amber-400'
    case 'stuck': return 'bg-red-500/20 border border-red-500/30 text-red-400'
    default: return 'bg-surface-2/50 text-muted'
  }
})

const statusDotClass = computed(() => {
  switch (jobStatus.value) {
    case 'running': return 'bg-blue-500 animate-pulse'
    case 'stopping': return 'bg-amber-500'
    case 'stuck': return 'bg-red-500'
    default: return 'bg-surface-3'
  }
})

const isStuck = computed(() => {
  if (jobStatus.value !== 'running') return false
  if (!lastProgressAt.value) return false
  const minutesSinceUpdate = (Date.now() - new Date(lastProgressAt.value).getTime()) / 60000
  return minutesSinceUpdate > 5
})

const showForceKill = computed(() => {
  if (isStuck.value) return true
  if (jobStatus.value === 'stopping' && stopRequestedAt.value) {
    const secondsSinceStop = (Date.now() - stopRequestedAt.value) / 1000
    return secondsSinceStop > 30
  }
  return false
})

// Show clear stale button when preview shows 0 work but phases are incomplete
const showClearStaleButton = computed(() => {
  if (jobStatus.value !== 'idle') return false
  if (!hasIncompletePhases.value) return false
  // Show if preview is expanded and shows 0 work
  if (previewExpanded.value && previewData.value) {
    const work = previewData.value.legosToProcess || previewData.value.seedsToProcess || 0
    return work === 0
  }
  return false
})

const elapsedTime = computed(() => {
  if (!jobStartTime.value) return '00:00'
  const seconds = Math.floor((Date.now() - jobStartTime.value) / 1000)
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
})

const lastActivityAgo = computed(() => {
  if (!lastProgressAt.value) return null
  const seconds = Math.floor((Date.now() - new Date(lastProgressAt.value).getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const mins = Math.floor(seconds / 60)
  return `${mins}m ago`
})

const etaDisplay = computed(() => {
  if (etaHistory.value.length < 2) return null
  if (jobStatus.value !== 'running') return null

  const first = etaHistory.value[0]
  const last = etaHistory.value[etaHistory.value.length - 1]
  const minutes = (last.timestamp - first.timestamp) / 60000
  const items = last.completed - first.completed

  if (minutes <= 0 || items <= 0) return null

  const rate = items / minutes
  const activePhase = phases.value.find(p => p.status === 'running')
  if (!activePhase) return null

  const remaining = activePhase.total - activePhase.completed
  const etaMinutes = remaining / rate

  return {
    time: formatDuration(etaMinutes),
    rate: `${rate.toFixed(1)} ${activePhase.unit}/min`
  }
})

// Methods
function formatDuration(minutes) {
  if (minutes < 1) return '<1 min'
  if (minutes < 60) return `${Math.round(minutes)} min`
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  return `${hours}h ${mins}m`
}

function statusDotClassFor(status) {
  switch (status) {
    case 'running': return 'bg-blue-500 animate-pulse'
    case 'complete': return 'bg-emerald-500'
    case 'partial': return 'bg-amber-500'
    case 'failed': return 'bg-red-500'
    default: return 'bg-surface-3'
  }
}

function phaseCardClass(phase) {
  const base = 'bg-surface/30 border rounded-lg p-4 transition-all'
  switch (phase.status) {
    case 'running': return `${base} border-blue-500/30`
    case 'complete': return `${base} border-emerald-500/30`
    case 'partial': return `${base} border-amber-500/30`
    case 'failed': return `${base} border-red-500/30`
    default: return `${base} border-line/50`
  }
}

function statusLabelClass(status) {
  switch (status) {
    case 'running': return 'bg-blue-500/20 text-blue-400'
    case 'complete': return 'bg-emerald-500/20 text-emerald-400'
    case 'partial': return 'bg-amber-500/20 text-amber-400'
    case 'failed': return 'bg-red-500/20 text-red-400'
    default: return 'bg-surface-2/50 text-faint'
  }
}

function progressBarClass(status) {
  switch (status) {
    case 'running': return 'bg-blue-500'
    case 'complete': return 'bg-emerald-500'
    case 'partial': return 'bg-amber-500'
    case 'failed': return 'bg-red-500'
    default: return 'bg-surface-3'
  }
}

function addEvent(message) {
  const now = new Date()
  const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  events.value.unshift({
    id: Date.now(),
    time,
    message
  })
  // Keep only last 100 events
  if (events.value.length > 100) {
    events.value = events.value.slice(0, 100)
  }
}

async function fetchProgress() {
  const code = props.courseCode || route.params.courseCode
  if (!code) return

  // Builder mode: poll course-builder-api stats
  if (buildMode.value === 'builder') {
    try {
      const builderApiUrl = import.meta.env.VITE_COURSE_BUILDER_API_URL || 'http://localhost:3471'
      const response = await fetch(`${builderApiUrl}/api/stats/${code}`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      })

      if (response.ok) {
        const data = await response.json()
        builderProgress.value = {
          ...builderProgress.value,
          legosInserted: data.legos || 0,
          phrasesInserted: data.phrases || 0
        }

        // Update stats bar
        stats.value = [
          { label: 'Seeds', value: builderProgress.value.currentSeed },
          { label: 'LEGOs', value: data.legos || 0 },
          { label: 'Phrases', value: data.phrases || 0 },
          { label: 'Ratio', value: data.legos > 0 ? parseFloat(data.ratio) || 0 : 0 }
        ]

        lastProgressAt.value = new Date().toISOString()
      }

      // Also poll build status for parallel build info
      const statusResp = await fetch(`${builderApiUrl}/api/build/status/${code}`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      })
      if (statusResp.ok) {
        const statusData = await statusResp.json()

        // Update current seed from DB source of truth
        if (statusData.progress) {
          builderProgress.value.currentSeed = statusData.progress.completed || 0
          builderProgress.value.totalSeeds = statusData.build?.total_seeds || statusData.last_job_target || seedCount.value
        }

        // Update job status
        if (statusData.active) {
          jobStatus.value = statusData.build?.status === 'stalled' ? 'stuck' : 'running'
          builderProgress.value.status = 'running'
        } else if (statusData.progress?.isComplete) {
          jobStatus.value = 'idle'
          builderProgress.value.status = 'complete'
        }

        // Parallel build phase tracking
        if (statusData.parallel) {
          parallelPhase.value = statusData.parallel.phase
          draftsSubmitted.value = statusData.parallel.drafts_submitted
          draftsExpected.value = statusData.parallel.drafts_expected
        }
      }
    } catch (error) {
      console.error('Failed to fetch builder progress:', error)
    }

    // Also fetch seed grid for rebuild visualization
    fetchSeedGrid()

    return
  }

  // Phases mode: poll orchestrator progress
  try {
    const apiBase = localStorage.getItem('api_base_url') || getApiUrl()
    const response = await fetch(`${apiBase}/api/courses/${code}/progress`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })

    if (!response.ok) throw new Error('Failed to fetch progress')

    const data = await response.json()

    // Update phases
    if (data.phases) {
      phases.value[0] = {
        ...phases.value[0],
        status: data.phases.phase1?.status || 'pending',
        completed: data.phases.phase1?.seedsComplete || 0,
        total: data.phases.phase1?.seedsTarget || seedCount.value,
        progress: data.phases.phase1?.seedsTarget
          ? Math.round((data.phases.phase1.seedsComplete / data.phases.phase1.seedsTarget) * 100)
          : 0
      }

      phases.value[1] = {
        ...phases.value[1],
        status: data.phases.phase2?.status || 'pending',
        completed: data.phases.phase2?.legosComplete || data.stats?.legosGenerated || 0,
        total: data.phases.phase2?.legosTarget || data.stats?.legosGenerated || 0,
        progress: 100 // Phase 2 is typically all-or-nothing
      }

      phases.value[2] = {
        ...phases.value[2],
        status: data.phases.phase3?.status || 'pending',
        completed: data.phases.phase3?.legosComplete || 0,
        total: data.phases.phase3?.legosTarget || data.stats?.newLegos || 0,
        progress: data.phases.phase3?.legosTarget
          ? Math.round((data.phases.phase3.legosComplete / data.phases.phase3.legosTarget) * 100)
          : 0
      }
    }

    // Update stats
    stats.value = [
      { label: 'Seeds', value: data.stats?.seedsComplete || 0 },
      { label: 'LEGOs', value: data.stats?.legosGenerated || 0 },
      { label: 'NEW LEGOs', value: data.stats?.newLegos || 0 },
      { label: 'Phrases', value: data.stats?.basketsGenerated || 0 }
    ]

    // Update active workers from queue data (do this before job status check)
    if (data.queue) {
      activeWorkers.value = data.queue.processing || 0
    }

    // Check for active job on phase servers
    const hasActivePhase3Job = data.phases?.phase3?.masters?.some(m => m.status === 'running')
    const processingWorkers = data.queue?.processing || 0

    // Update job status - only consider "running" if there are actual workers
    // This prevents phantom "running" state when no job is actually active
    const statusSaysRunning = data.overallStatus?.includes('running') ||
                              phases.value.some(p => p.status === 'running')
    const isActuallyRunning = statusSaysRunning && (processingWorkers > 0 || hasActivePhase3Job)

    if (isActuallyRunning && jobStatus.value !== 'stopping') {
      jobStatus.value = 'running'
      if (!jobStartTime.value) {
        jobStartTime.value = Date.now()
      }
    } else if (jobStatus.value !== 'stopping') {
      jobStatus.value = 'idle'
    }

    // Track ETA
    const activePhase = phases.value.find(p => p.status === 'running')
    if (activePhase && activePhase.completed > 0) {
      etaHistory.value.push({
        timestamp: Date.now(),
        completed: activePhase.completed
      })
      if (etaHistory.value.length > MAX_HISTORY) {
        etaHistory.value.shift()
      }
      lastProgressAt.value = new Date().toISOString()
    }

  } catch (error) {
    console.error('Failed to fetch progress:', error)
  }
}

async function createCourse() {
  if (!canCreateCourse.value) return

  const newCode = `${targetLang.value}_for_${knownLang.value}`

  try {
    const apiBase = localStorage.getItem('api_base_url') || getApiUrl()
    const response = await fetch(`${apiBase}/api/courses/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        courseCode: newCode,
        target: targetLang.value,
        known: knownLang.value,
        seedCount: seedCount.value
      })
    })

    if (!response.ok) throw new Error('Failed to create course')

    addEvent(`Created course: ${getCourseName(newCode)}`)
    router.push(`/course/${newCode}`)

  } catch (error) {
    console.error('Failed to create course:', error)
    addEvent(`Error: ${error.message}`)
  }
}

async function fetchPreview() {
  const code = props.courseCode || route.params.courseCode
  if (!code) return

  // Find earliest incomplete phase by number (pending or partial)
  const targetPhase = phases.value
    .filter(p => p.status === 'pending' || p.status === 'partial')
    .sort((a, b) => a.number - b.number)[0]

  if (!targetPhase) return

  previewLoading.value = true
  previewError.value = null

  try {
    const apiBase = localStorage.getItem('api_base_url') || getApiUrl()
    const mode = seedCount.value === 30 ? 'quick_test' : seedCount.value === 300 ? 'mvp_course' : 'full_course'
    const response = await fetch(`${apiBase}/api/preview/${code}/${targetPhase.number}?mode=${mode}`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to fetch preview')
    }

    previewData.value = await response.json()
    previewExpanded.value = true
    addEvent(`Preview loaded for Phase ${targetPhase.number}`)

  } catch (error) {
    console.error('Failed to fetch preview:', error)
    previewError.value = error.message
    addEvent(`Preview error: ${error.message}`)
  } finally {
    previewLoading.value = false
  }
}

function closePreview() {
  previewExpanded.value = false
  previewData.value = null
  previewError.value = null
}

async function startPhase() {
  const code = props.courseCode || route.params.courseCode
  if (!code) return

  // Find earliest incomplete phase by number (pending or partial)
  const targetPhase = phases.value
    .filter(p => p.status === 'pending' || p.status === 'partial')
    .sort((a, b) => a.number - b.number)[0]

  if (!targetPhase) return

  // Close preview if open
  closePreview()

  try {
    const apiBase = localStorage.getItem('api_base_url') || getApiUrl()
    const response = await fetch(`${apiBase}/api/courses/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        courseCode: code,
        phaseSelection: `phase${targetPhase.number}`,
        spawnerMode: agentEngine.value,
        machineProfile: selectedMachineProfile.value,
        mode: seedCount.value === 30 ? 'quick_test' : seedCount.value === 300 ? 'mvp_course' : 'full_course'
      })
    })

    if (!response.ok) throw new Error('Failed to start phase')

    jobStatus.value = 'running'
    jobStartTime.value = Date.now()
    etaHistory.value = []

    addEvent(`Started Phase ${targetPhase.number}: ${targetPhase.name}`)

  } catch (error) {
    console.error('Failed to start phase:', error)
    addEvent(`Error: ${error.message}`)
  }
}

async function startCourseBuilder() {
  const code = props.courseCode || route.params.courseCode
  if (!code) return

  try {
    const builderApiUrl = import.meta.env.VITE_COURSE_BUILDER_API_URL || 'http://localhost:3471'
    const response = await fetch(`${builderApiUrl}/api/build/team-start/${code}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        terminal: agentEngine.value === 'cli' ? 'iTerm2' : agentEngine.value === 'terminal' ? 'Terminal' : 'iTerm2',
        targetSeeds: seedCount.value,
        parallel: true
      })
    })

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      throw new Error(errData.error || 'Failed to start course builder')
    }

    const result = await response.json()

    builderProgress.value = {
      status: 'running',
      currentSeed: result.progress?.completed || 0,
      totalSeeds: seedCount.value,
      legosInserted: 0,
      phrasesInserted: 0
    }
    jobStatus.value = 'running'
    jobStartTime.value = Date.now()
    parallelPhase.value = 'drafting'

    addEvent(`Started Parallel Build for ${getCourseName(code)} (${seedCount.value} seeds)`)

  } catch (error) {
    console.error('Failed to start course builder:', error)
    addEvent(`Error: ${error.message}`)
  }
}

async function stopJob() {
  const code = props.courseCode || route.params.courseCode
  if (!code) return

  jobStatus.value = 'stopping'
  stopRequestedAt.value = Date.now()

  try {
    const apiBase = localStorage.getItem('api_base_url') || getApiUrl()

    if (buildMode.value === 'builder') {
      // Course Builder mode: use Mission Control job stop endpoint
      // This routes through production-api -> orchestrator -> course-builder-api
      const response = await fetch(`${apiBase}/api/mission-control/jobs/${code}-build/stop`, {
        method: 'POST',
        headers: { 'ngrok-skip-browser-warning': 'true' }
      })

      if (response.ok) {
        addEvent('Course Builder job stopped')
      } else {
        const data = await response.json().catch(() => ({}))
        addEvent(`Stop response: ${data.error || response.statusText}`)
      }

      // Update builder progress state
      builderProgress.value = {
        ...builderProgress.value,
        status: 'idle'
      }
    } else {
      // Legacy Phases 1-3 mode: use orchestrator cancel endpoints
      await fetch(`${apiBase}/api/cancel/${code}`, {
        method: 'POST',
        headers: { 'ngrok-skip-browser-warning': 'true' }
      })

      addEvent('Stop request sent')

      // Also call force-kill to clear any phantom state on phase servers
      await fetch(`${apiBase}/api/force-kill/${code}`, {
        method: 'POST',
        headers: { 'ngrok-skip-browser-warning': 'true' }
      })

      addEvent('Job stopped')
    }

    // Reset to idle - the job is stopped (or was never running)
    jobStatus.value = 'idle'
    jobStartTime.value = null
    stopRequestedAt.value = null

  } catch (error) {
    console.error('Failed to stop job:', error)
    addEvent(`Error stopping: ${error.message}`)
    // Still reset to idle on error - don't leave stuck in "stopping"
    jobStatus.value = 'idle'
    stopRequestedAt.value = null
  }
}

async function forceKill() {
  const code = props.courseCode || route.params.courseCode
  if (!code) return

  try {
    const apiBase = localStorage.getItem('api_base_url') || getApiUrl()
    await fetch(`${apiBase}/api/force-kill/${code}`, {
      method: 'POST',
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })

    jobStatus.value = 'idle'
    jobStartTime.value = null
    stopRequestedAt.value = null

    addEvent('Force kill executed')

  } catch (error) {
    console.error('Failed to force kill:', error)
    addEvent(`Error: ${error.message}`)
  }
}

async function clearStaleJob() {
  const code = props.courseCode || route.params.courseCode
  if (!code) return

  clearingStale.value = true

  try {
    // Call abort on Phase 3 service directly
    const phase3Url = import.meta.env.VITE_PHASE3_URL || 'http://localhost:3459'
    await fetch(`${phase3Url}/abort/${code}`, {
      method: 'POST',
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })

    addEvent('Stale job cleared from Phase 3 server')

    // Close preview and refresh it
    closePreview()

    // Wait a moment then re-fetch preview
    setTimeout(() => {
      fetchPreview()
    }, 500)

  } catch (error) {
    console.error('Failed to clear stale job:', error)
    addEvent(`Error clearing stale job: ${error.message}`)
  } finally {
    clearingStale.value = false
  }
}

// Polling — now handled by useBuildMonitor (Realtime + 30s fallback)
function startPolling() {
  isPolling.value = true
  buildMonitor.start()
  addEvent('Started monitoring (Supabase Realtime)')
}

function stopPolling() {
  buildMonitor.stop()
  isPolling.value = false
}

// WebSocket functions for real-time events
function connectWebSocket() {
  const code = props.courseCode || route.params.courseCode
  if (!code) return

  const apiBase = localStorage.getItem('api_base_url') || getApiUrl()

  socket = io(apiBase, {
    path: '/api/orchestrator/websocket',
    transports: ['websocket', 'polling']
  })

  socket.on('connect', () => {
    console.log('[WebSocket] Connected:', socket.id)
    socket.emit('subscribe', code)
    addEvent('WebSocket connected')
  })

  socket.on('seed:update', (data) => {
    // Add event for seed completion
    if (data.event === 'seed:complete') {
      addEvent(`Seed ${data.seed?.id || 'unknown'} completed`)
      lastProgressAt.value = new Date().toISOString()
    } else if (data.event === 'seed:failed') {
      addEvent(`Seed ${data.seed?.id || 'unknown'} failed`)
    }
    // Update active workers count
    if (data.stats) {
      activeWorkers.value = data.stats.processing || 0
    }
  })

  socket.on('progress', (data) => {
    console.log('[WebSocket] Progress:', data)
    // Update stats from WebSocket progress
    if (data.stats) {
      stats.value = [
        { label: 'Seeds', value: data.stats.seedsComplete || 0 },
        { label: 'LEGOs', value: data.stats.legosGenerated || 0 },
        { label: 'NEW LEGOs', value: data.stats.newLegos || 0 },
        { label: 'Phrases', value: data.stats.basketsGenerated || 0 }
      ]
    }
    // Update event log from recentLogs
    if (data.recentLogs && data.recentLogs.length > 0) {
      // Add new logs that aren't already in events
      const existingMessages = new Set(events.value.map(e => e.message))
      for (const log of data.recentLogs) {
        if (!existingMessages.has(log.message)) {
          const time = new Date(log.time).toLocaleTimeString('en-GB', {
            hour: '2-digit', minute: '2-digit', second: '2-digit'
          })
          events.value.unshift({
            id: Date.now() + Math.random(),
            time,
            message: log.message
          })
        }
      }
      // Keep only last 100 events
      if (events.value.length > 100) {
        events.value = events.value.slice(0, 100)
      }
    }
  })

  socket.on('batch:received', (data) => {
    addEvent(`Batch received: ${data.seedCount || data.seedIds?.length || 0} seeds`)
  })

  socket.on('browser:complete', (data) => {
    addEvent(`Browser ${data.browserId || data.masterNum} complete`)
  })

  socket.on('disconnect', () => {
    console.log('[WebSocket] Disconnected')
  })

  socket.on('connect_error', (err) => {
    console.error('[WebSocket] Connection error:', err.message)
  })
}

function disconnectWebSocket() {
  if (socket) {
    const code = props.courseCode || route.params.courseCode
    if (code) {
      socket.emit('unsubscribe', code)
    }
    socket.disconnect()
    socket = null
  }
}

async function fetchCalibrationReview() {
  const code = props.courseCode || route.params.courseCode
  if (!code) return
  try {
    const builderApiUrl = import.meta.env.VITE_COURSE_BUILDER_API_URL || 'http://localhost:3471'
    const resp = await fetch(`${builderApiUrl}/api/golden/review-queue/${code}`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    if (resp.ok) {
      const data = await resp.json()
      calibrationReview.value = data.summary || { pending: 0, approved: 0, redo: 0, total: 0 }
    }
  } catch (err) {
    // Silently ignore — calibration review is optional
  }
}

// Lifecycle
onMounted(() => {
  const code = props.courseCode || route.params.courseCode

  if (code) {
    // Management mode - collapse config, start polling and WebSocket
    configExpanded.value = false
    startPolling()
    connectWebSocket()
    fetchCalibrationReview()
  } else {
    // Creation mode - expand config
    configExpanded.value = true
  }
})

onUnmounted(() => {
  stopPolling()
  disconnectWebSocket()
})

// Watch for route changes
watch(() => route.params.courseCode, (newCode, oldCode) => {
  // Disconnect from old course
  if (oldCode) {
    disconnectWebSocket()
  }

  if (newCode) {
    configExpanded.value = false
    startPolling()
    connectWebSocket()
  } else {
    stopPolling()
    disconnectWebSocket()
    configExpanded.value = true
  }
})

// Persist machine profile changes to localStorage (allows manual override)
watch(selectedMachineProfile, (newProfile) => {
  localStorage.setItem('ssi_machine_profile', newProfile)
})
</script>

<style scoped>
.status-dot {
  @apply w-2 h-2 rounded-full flex-shrink-0;
}

.phase-card {
  @apply transition-all duration-200;
}

/* Subtle animations */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.animate-pulse {
  animation: pulse 2s ease-in-out infinite;
}

/* Scrollbar styling for event log */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: theme('colors.slate.700');
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: theme('colors.slate.600');
}

/* ── LIGHT-MODE CONTRAST FIXES (dark mode untouched) ──
   The status/badge palette uses Tailwind -400 colored TEXT, tuned for dark
   surfaces. On light's white/near-white surfaces those fail WCAG (1.4–2.8:1).
   Remap the colored TEXT utilities to deeper shades only under light, which pass
   on both #fff (≥5:1) and the tinted /10–/20 pills (≥4.3:1) while keeping the
   same hue identity. Backgrounds/borders stay as-is (theme-aware tints). */
:global([data-theme="light"]) .text-emerald-400 { color: #047857; }   /* 1.92 → 5.48 on #fff */
:global([data-theme="light"]) .text-emerald-500 { color: #047857; }   /* 2.54 → 5.48 */
:global([data-theme="light"]) .text-cyan-400    { color: #0e7490; }   /* 1.81 → 5.36 */
:global([data-theme="light"]) .text-amber-400   { color: #b45309; }   /* 1.67 → 5.02 */
:global([data-theme="light"]) .text-blue-400    { color: #1d4ed8; }   /* 2.54 → 6.70 */
:global([data-theme="light"]) .text-purple-400  { color: #7e22ce; }   /* 2.64 → 6.98 */
:global([data-theme="light"]) .text-red-400     { color: #b91c1c; }   /* 2.77 → 6.47 */

/* Card separation: panels use bg-surface/30 + border-line/50, which over the
   slate canvas barely separate in light (fill 1.04:1, border ~1.12:1). Make the
   card fill solid --surface (white) and the border solid --line under light so
   they read as crisp white cards on the slate canvas (the design target).
   Dark mode keeps the translucent look (these overrides are light-gated). */
:global([data-theme="light"]) .bg-surface\/30 { background-color: var(--surface); }
:global([data-theme="light"]) .bg-surface\/20 { background-color: var(--surface-2); }
:global([data-theme="light"]) .bg-surface\/50 { background-color: var(--surface); }
:global([data-theme="light"]) .border-line\/50 { border-color: var(--line); }
:global([data-theme="light"]) .border-line\/30 { border-color: var(--line); }

/* Scrollbar thumb is a hardcoded dark slate (theme() resolves to a fixed value,
   doesn't flip) — too dark on a light panel; lighten it for light mode. */
:global([data-theme="light"]) .overflow-y-auto::-webkit-scrollbar-thumb {
  background: theme('colors.slate.400');
}
:global([data-theme="light"]) .overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: theme('colors.slate.500');
}
</style>
