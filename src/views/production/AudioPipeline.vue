<template>
  <div class="audio-pipeline text-ink">
    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-6 py-6">
      <!-- Error State -->
      <div v-if="error" class="bg-red-900/20 border border-red-500/30 rounded-xl p-6">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
          </div>
          <h2 class="text-lg font-semibold text-red-400">Error</h2>
        </div>
        <p class="text-ink ml-13">{{ error }}</p>
      </div>

      <!-- Pipeline View -->
      <div v-else class="space-y-8">

        <!-- GENDER PREP BANNER -->
        <div v-if="genderPrepStatus.isGendered" class="rounded-xl p-4 flex items-center gap-4"
          :class="genderPrepStatus.processed
            ? 'bg-emerald-900/20 border border-emerald-500/20'
            : 'bg-amber-900/20 border border-amber-500/30'"
        >
          <div class="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            :class="genderPrepStatus.processed
              ? 'bg-emerald-500/10 border border-emerald-500/20'
              : 'bg-amber-500/10 border border-amber-500/20'"
          >
            <svg class="w-5 h-5" :class="genderPrepStatus.processed ? 'text-emerald-400' : 'text-amber-400'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
          </div>
          <div class="flex-1">
            <div class="text-sm font-medium" :class="genderPrepStatus.processed ? 'text-emerald-300' : 'text-amber-300'">
              {{ genderPrepStatus.processed ? 'Gender Prep' : 'Gender Prep not run' }}
            </div>
            <div class="text-xs" :class="genderPrepStatus.processed ? 'text-emerald-400/70' : 'text-amber-400/70'">
              <template v-if="genderPrepStatus.processed">
                {{ genderPrepStatus.totalExpansions }} expansions ready<template v-if="genderPrepFlagCount > 0">, {{ genderPrepFlagCount }} audio flagged for regen</template>
              </template>
              <template v-else>
                Audio will use masculine defaults until gender prep is run.
              </template>
            </div>
            <div v-if="genderPrepResult" class="text-xs mt-1" :class="genderPrepResult.ok ? 'text-emerald-400' : 'text-red-400'">
              {{ genderPrepResult.text }}
            </div>
          </div>
          <button
            v-if="!genderPrepStatus.processed && !genderPrepRunning"
            @click="startGenderPrep"
            class="px-4 py-2 bg-purple-600/20 border border-purple-500/50 text-purple-300 hover:border-purple-400/70 hover:text-purple-200 text-sm font-medium rounded-lg transition-all flex-shrink-0"
          >
            Run Gender Prep
          </button>
          <span v-if="genderPrepRunning" class="text-sm text-purple-400 animate-pulse flex-shrink-0">
            {{ genderPrepStatus.totalExpansions || 0 }} expansions...
          </span>
          <button
            v-if="genderPrepStatus.processed && genderPrepFlagCount > 0 && !genderRegenRunning"
            @click="regenerateFlagged"
            :disabled="regenerating || otherCourseJobActive"
            class="px-4 py-2 bg-amber-600/20 border border-amber-500/50 text-amber-300 hover:border-amber-400/70 hover:text-amber-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium rounded-lg transition-all flex-shrink-0"
          >
            Regenerate {{ genderPrepFlagCount }} flagged
          </button>
          <span v-if="genderRegenRunning" class="text-sm text-amber-400 animate-pulse flex-shrink-0">
            Queueing regen...
          </span>
        </div>

        <!-- OTHER COURSE JOB BANNER (when audio job is active for a different course) -->
        <div v-if="audioProgress.active && audioProgress.courseCode && audioProgress.courseCode !== courseCode" class="bg-gradient-to-br from-surface/80 to-surface/40 border border-amber-500/30 rounded-xl p-5 flex items-center gap-4">
          <div class="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
            <svg class="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
          <div class="flex-1">
            <div class="text-sm font-medium text-amber-300">Audio job running on another course</div>
            <div class="text-xs text-muted mt-1">
              Only one audio job can run at a time. Currently
              {{ audioProgress.operation === 'regenerate-role' ? 'regenerating' : audioProgress.operation === 'reuse-first' ? 'running reuse-first regeneration on' : 'generating' }}
              audio for <span class="text-amber-400 font-medium">{{ getCourseName(audioProgress.courseCode) }}</span>
              — {{ audioProgress.current }}/{{ audioProgress.total }} processed.
            </div>
          </div>
          <div class="flex-shrink-0">
            <div class="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
          </div>
        </div>

        <!-- LIVE PROGRESS (when active for THIS course) -->
        <div v-if="audioProgress.active && (!audioProgress.courseCode || audioProgress.courseCode === courseCode)" class="bg-gradient-to-br from-surface/80 to-surface/40 border border-emerald-500/30 rounded-xl p-6">
          <div class="flex items-center gap-6">
            <!-- Circular Progress -->
            <div class="relative w-28 h-28 flex-shrink-0">
              <svg class="w-28 h-28 transform -rotate-90">
                <circle cx="56" cy="56" r="48" stroke="currentColor" stroke-width="8" fill="none" class="text-faint"/>
                <circle
                  cx="56" cy="56" r="48"
                  stroke="currentColor"
                  stroke-width="8"
                  fill="none"
                  class="text-emerald-500 transition-all duration-300"
                  :stroke-dasharray="301.59"
                  :stroke-dashoffset="301.59 - (audioProgress.total > 0 ? (audioProgress.current / audioProgress.total) * 301.59 : 0)"
                  stroke-linecap="round"
                />
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <span class="text-2xl font-bold text-emerald-400">
                  {{ audioProgress.total > 0 ? Math.round((audioProgress.current / audioProgress.total) * 100) : 0 }}%
                </span>
              </div>
            </div>

            <!-- Progress Details -->
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-4">
                <div class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <h2 class="text-lg font-semibold text-ink">
                  {{ progressHeading }}
                </h2>
                <span class="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded-full font-medium">
                  LIVE
                </span>
              </div>

              <!-- Stats Row -->
              <div class="grid grid-cols-4 gap-4">
                <div>
                  <div class="text-2xl font-bold text-ink">{{ audioProgress.current }}</div>
                  <div class="text-xs text-faint uppercase tracking-wide">Processed</div>
                </div>
                <div>
                  <div class="text-2xl font-bold text-muted">{{ audioProgress.total }}</div>
                  <div class="text-xs text-faint uppercase tracking-wide">Total</div>
                </div>
                <div>
                  <div class="text-2xl font-bold text-emerald-400">{{ audioProgress.success }}</div>
                  <div class="text-xs text-faint uppercase tracking-wide">Success</div>
                </div>
                <div>
                  <div class="text-2xl font-bold" :class="audioProgress.failed > 0 ? 'text-red-400' : 'text-faint'">{{ audioProgress.failed }}</div>
                  <div class="text-xs text-faint uppercase tracking-wide">Failed</div>
                </div>
              </div>

              <!-- Current Item -->
              <div v-if="audioProgress.lastItem" class="mt-4 text-sm text-faint truncate">
                Processing: <span class="text-muted">{{ audioProgress.lastItem }}...</span>
              </div>
            </div>
          </div>
        </div>

        <!-- VOICE CONFIGURATION Section -->
        <section>
          <div class="flex items-center gap-4 mb-4">
            <h2 class="text-xs font-semibold text-faint uppercase tracking-wider">Voice Configuration</h2>
            <div class="flex-1 h-px bg-surface-2/50"></div>
            <span v-if="voicesConfigured" class="px-2.5 py-1 text-xs bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
              ● Configured
            </span>
            <span v-else class="px-2.5 py-1 text-xs bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20">
              ● Setup Required
            </span>
          </div>

          <div class="bg-gradient-to-br from-surface/60 to-surface/30 border border-line/50 rounded-xl overflow-hidden">
            <button
              @click="showVoiceConfig = !showVoiceConfig"
              class="w-full px-6 py-4 flex items-center justify-between hover:bg-surface-2/20 transition-colors"
            >
              <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
                  </svg>
                </div>
                <div class="text-left">
                  <div class="font-medium text-ink">Configure Voices</div>
                  <div class="text-sm text-muted">Select TTS voices for each audio role</div>
                </div>
              </div>
              <svg
                class="w-5 h-5 text-muted transition-transform duration-200"
                :class="{ 'rotate-180': showVoiceConfig }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>
            <div v-show="showVoiceConfig" class="border-t border-line/50">
              <VoiceConfiguration
                :course-code="courseCode"
                @config-saved="onVoiceConfigSaved"
                @config-loaded="onVoiceConfigLoaded"
              />
            </div>
          </div>
        </section>

        <!-- AUDIO GENERATION Section -->
        <section>
          <div class="flex items-center gap-4 mb-4">
            <h2 class="text-xs font-semibold text-faint uppercase tracking-wider">Audio Generation</h2>
            <div class="flex-1 h-px bg-surface-2/50"></div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <!-- Regenerate by Role Card -->
            <div class="bg-gradient-to-br from-surface/60 to-surface/30 border border-line/50 rounded-xl p-6">
              <div class="flex items-start justify-between mb-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <svg class="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 class="font-semibold text-ink">Regenerate by Role</h3>
                    <p class="text-sm text-muted">Replace audio for a specific role</p>
                  </div>
                </div>
                <span class="px-2 py-0.5 text-xs bg-amber-500/10 text-amber-400 rounded border border-amber-500/20">
                  TTS
                </span>
              </div>

              <!-- Role Selector -->
              <div class="space-y-3 mb-4">
                <select
                  v-model="regenerateRole"
                  class="w-full bg-canvas/50 text-ink px-4 py-3 rounded-lg border border-line/50 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/20 transition-colors"
                >
                  <option value="">Select role...</option>
                  <option value="target1">Voice 1</option>
                  <option value="target2">Voice 2</option>
                  <option value="known">Known language</option>
                  <option value="presentation">Presentation (Introductions)</option>
                </select>
                <label class="flex items-center gap-2 text-sm text-muted cursor-pointer select-none">
                  <input type="checkbox" v-model="regenerateFlaggedOnly" class="accent-amber-500" />
                  Flagged only<template v-if="genderPrepFlagCount > 0"> ({{ genderPrepFlagCount }} flagged)</template>
                </label>
              </div>

              <!-- Action Buttons -->
              <div class="flex gap-3">
                <button
                  @click="previewRegenerate"
                  :disabled="!regenerateRole || regenerating || otherCourseJobActive"
                  class="flex-1 px-4 py-2.5 bg-surface-2/50 hover:bg-surface-2 disabled:bg-surface disabled:text-faint text-ink rounded-lg transition-colors text-sm font-medium"
                >
                  Preview
                </button>
                <button
                  @click="executeRegenerate"
                  :disabled="!regenerateRole || regenerating || otherCourseJobActive"
                  class="flex-1 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:bg-surface disabled:text-faint text-white rounded-lg transition-colors text-sm font-medium"
                >
                  {{ regenerating ? 'Working...' : 'Regenerate' }}
                </button>
              </div>

              <!-- Result -->
              <div v-if="regenerateResult" class="mt-4 p-4 bg-canvas/50 rounded-lg border border-line/30">
                <div class="flex justify-between items-center">
                  <div class="flex items-center gap-2">
                    <div class="w-2 h-2 rounded-full" :class="regenerateResult.error ? 'bg-red-500' : regenerateResult.dryRun ? 'bg-amber-500' : regenerateResult.status === 'running' ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'"></div>
                    <span class="text-sm font-medium" :class="regenerateResult.error ? 'text-red-400' : regenerateResult.dryRun ? 'text-amber-400' : regenerateResult.status === 'running' ? 'text-blue-400' : 'text-emerald-400'">
                      {{ regenerateResult.error ? 'Error' : regenerateResult.dryRun ? 'Preview' : regenerateResult.status === 'running' ? 'Running...' : 'Complete' }}
                    </span>
                  </div>
                  <div class="text-right">
                    <span class="text-xl font-bold text-ink">{{ regenerateResult.count || regenerateResult.total || 0 }}</span>
                    <span class="text-xs text-faint ml-1">items</span>
                  </div>
                </div>
                <div v-if="regenerateResult.voiceId" class="mt-2 text-xs text-muted">
                  Voice: <code class="text-emerald-400 bg-surface px-1.5 py-0.5 rounded">{{ regenerateResult.voiceId }}</code>
                </div>
                <div v-if="regenerateResult.error" class="mt-2 text-sm text-red-400">{{ regenerateResult.error }}</div>
                <div v-if="regenerateResult.status === 'running'" class="mt-2 text-sm text-blue-400">
                  Regeneration running in background. Progress shown above.
                </div>
                <div v-if="regenerateResult.status === 'completed'" class="mt-2 text-sm text-emerald-400">
                  {{ regenerateResult.success }} generated, {{ regenerateResult.failed }} failed
                </div>
              </div>
            </div>

            <!-- Introductions: authored automatically during Generate (no separate stage) -->
            <div class="bg-gradient-to-br from-surface/60 to-surface/30 border border-line/50 rounded-xl p-6">
              <div class="flex items-start justify-between mb-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                    <svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 class="font-semibold text-ink">Introductions</h3>
                    <p class="text-sm text-muted">Authored automatically during Generate</p>
                  </div>
                </div>
                <span class="px-2 py-0.5 text-xs bg-purple-500/10 text-purple-400 rounded border border-purple-500/20">
                  AUTO
                </span>
              </div>

              <p class="text-sm text-muted mb-3">
                Intro scripts are no longer a separate stage. When you press <strong>Generate Missing Audio</strong>,
                each new LEGO's introduction is written from the course's frozen frame
                ("The Spanish for — 'I want' — as in — 'I want to speak Spanish' — is:"), and an agent
                decides per LEGO whether the "as in" context is needed to avoid ambiguity — fragments get
                their seed sentence, self-sufficient chunks go bare.
              </p>
              <p class="text-sm text-muted mb-2">
                Intros are spoken by the course's known-language voice and end at "is —"; the LEGO's
                existing target recordings play straight after.
              </p>
              <div v-if="progressStats.toAuthor > 0" class="mt-3 p-3 bg-canvas/50 rounded-lg border border-purple-500/20 text-sm">
                <span class="font-semibold text-purple-400">{{ progressStats.toAuthor.toLocaleString() }}</span>
                <span class="text-muted"> introduction(s) will be authored on the next Generate run.</span>
              </div>
              <p class="text-xs text-faint mt-3">
                The agent also flags suspected content errors (bad agreement, chunk/seed mismatch) —
                flags land in content feedback and are listed after each run.
              </p>
            </div>
          </div>

        </section>

        <!-- REUSE-FIRST REGENERATION Section -->
        <section>
          <div class="flex items-center gap-4 mb-4">
            <h2 class="text-xs font-semibold text-faint uppercase tracking-wider">Reuse-First Regeneration</h2>
            <div class="flex-1 h-px bg-surface-2/50"></div>
          </div>

          <ReuseFirstPanel
            :course-code="courseCode"
            :audio-progress="audioProgress"
            @started="startProgressPolling"
          />
        </section>

        <!-- PIPELINE STATUS Section -->
        <section>
          <div class="flex items-center gap-4 mb-4">
            <h2 class="text-xs font-semibold text-faint uppercase tracking-wider">Pipeline Status</h2>
            <div class="flex-1 h-px bg-surface-2/50"></div>
            <span v-if="productionStore.isLinkingAudio" class="text-xs text-teal-400/70 flex items-center gap-1">
              <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Linking unlinked audio...
            </span>
            <button
              @click="refreshAudioStats"
              class="text-xs text-faint hover:text-ink transition-colors flex items-center gap-1"
              :disabled="refreshingStats"
              title="Refresh stats"
            >
              <svg class="w-3.5 h-3.5" :class="{ 'animate-spin': refreshingStats }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>

          <!-- Progress Dashboard -->
          <PipelineProgress
            :total="progressStats.total"
            :generated="progressStats.generated"
            :pending="progressStats.pending"
            :failed="progressStats.failed"
            :linkable="progressStats.linkable"
            :ready-for-generate="progressStats.readyForGenerate"
            :presentation-status="progressStats.presentationStatus"
            :ledger="progressStats.ledger"
            :estimated-cost="estimatedCost"
            :estimated-time="estimatedTime"
            :loading="!statsLoaded"
          />

          <!-- Concurrency Control -->
          <div class="mt-4 flex items-center gap-4 p-3 bg-surface/40 rounded-lg border border-line/30">
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
              <span class="text-sm text-muted">Concurrency</span>
            </div>
            <input
              type="range"
              :value="concurrency"
              @input="updateConcurrency(Number(($event.target as HTMLInputElement).value))"
              min="1"
              max="20"
              class="flex-1 h-2 bg-surface-2 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div class="flex items-center gap-2">
              <input
                type="number"
                :value="concurrency"
                @change="updateConcurrency(Number(($event.target as HTMLInputElement).value))"
                min="1"
                max="20"
                class="w-14 px-2 py-1 bg-canvas/50 text-ink text-center rounded border border-line/50 text-sm"
              />
              <span class="text-xs text-faint">/ 20</span>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="mt-4 flex flex-wrap gap-3">
            <button
              @click="startGeneration"
              :disabled="!canStartGeneration || isGenerating || startingGeneration"
              class="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-surface-2 disabled:to-surface-3 disabled:text-faint rounded-lg font-medium transition-all text-sm flex items-center gap-2"
            >
              <svg v-if="isGenerating || startingGeneration" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              {{ generateButtonLabel }}
            </button>
            <button
              v-if="isGenerating"
              @click="cancelGeneration"
              class="px-5 py-2.5 bg-red-600/80 hover:bg-red-600 rounded-lg font-medium transition-colors text-sm flex items-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
              Cancel
            </button>
            <button
              v-if="hasFailed && !isGenerating"
              @click="retryFailed"
              class="px-5 py-2.5 bg-amber-600/80 hover:bg-amber-600 rounded-lg font-medium transition-colors text-sm flex items-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
              </svg>
              Retry Failed
            </button>
          </div>

          <!-- Audio Linking Result -->
          <div v-if="linkResult" class="mt-4 bg-gradient-to-br from-surface/80 to-surface/40 border border-teal-500/30 rounded-xl p-4 flex items-center gap-3">
            <svg class="w-5 h-5 text-teal-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
            </svg>
            <span class="text-teal-300 text-sm">Linked {{ linkResult.linked }} audio IDs to phrases, LEGOs and seeds</span>
          </div>

          <!-- Authoring summary: what the agent wrote + what it flagged -->
          <div v-if="generateSummary && (generateSummary.authored > 0 || generateSummary.flags > 0)" class="mt-4 bg-gradient-to-br from-surface/80 to-surface/40 border border-purple-500/30 rounded-xl p-4">
            <div class="flex items-center gap-3 mb-1">
              <svg class="w-5 h-5 text-purple-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              <span class="text-sm text-ink">
                <strong>{{ generateSummary.authored }}</strong> introduction(s) authored this run<span v-if="generateSummary.flags > 0"> — <strong class="text-amber-400">{{ generateSummary.flags }}</strong> content flag(s) raised</span>
              </span>
            </div>
            <div v-if="generateSummary.samples?.length" class="mt-2 space-y-1.5">
              <div v-for="(f, i) in generateSummary.samples" :key="i" class="text-xs bg-surface/50 p-2 rounded">
                <span class="text-amber-400">{{ f.lego_id || `phrase ${f.phrase_id}` }}</span>
                <span class="text-faint mx-1">·</span>
                <span class="text-muted">'{{ f.chunk }}'</span>
                <span class="text-faint mx-1">—</span>
                <span class="text-ink">{{ f.issue }}</span>
              </div>
              <p class="text-[11px] text-faint">Flags are recorded in content feedback for review — the audio was still generated faithfully.</p>
            </div>
          </div>

          <!-- Plan Results Display -->
          <div v-if="showingPlan && planResult" class="mt-4 bg-gradient-to-br from-surface/80 to-surface/40 border border-purple-500/30 rounded-xl p-6">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                  <svg class="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                  </svg>
                </div>
                <span class="font-medium text-ink">Generation Plan</span>
              </div>
              <button
                @click="showingPlan = false"
                class="text-muted hover:text-ink transition-colors"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <div v-if="planResult.error" class="text-red-400 text-sm">
              {{ planResult.error }}
            </div>

            <div v-else class="space-y-4">
              <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div class="bg-canvas/50 rounded-lg p-3 text-center">
                  <div class="text-xl font-bold text-ink">{{ (planResult.total || 0).toLocaleString() }}</div>
                  <div class="text-xs text-faint uppercase">Total Needed</div>
                </div>
                <div class="bg-canvas/50 rounded-lg p-3 text-center">
                  <div class="text-xl font-bold text-emerald-400">{{ (planResult.existing || 0).toLocaleString() }}</div>
                  <div class="text-xs text-faint uppercase">Already Done</div>
                </div>
                <div class="bg-canvas/50 rounded-lg p-3 text-center">
                  <div class="text-xl font-bold text-amber-400">{{ (planResult.missing || 0).toLocaleString() }}</div>
                  <div class="text-xs text-faint uppercase">To Generate</div>
                </div>
                <div class="bg-canvas/50 rounded-lg p-3 text-center">
                  <div class="text-xl font-bold text-purple-400">{{ planResult.estimatedCost || '$0.00' }}</div>
                  <div class="text-xs text-faint uppercase">Est. Cost</div>
                </div>
              </div>

              <div v-if="planResult.estimatedTime" class="text-sm text-muted text-center">
                Estimated time: <span class="text-ink font-medium">{{ planResult.estimatedTime }}</span>
              </div>

              <div v-if="planResult.missing > 0" class="pt-2">
                <button
                  @click="startGeneration(); showingPlan = false;"
                  :disabled="isGenerating"
                  class="w-full px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-surface-2 disabled:to-surface-3 rounded-lg font-semibold transition-all text-sm flex items-center justify-center gap-2"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  Generate Missing Audio ({{ planResult.missing.toLocaleString() }} files)
                </button>
              </div>
              <div v-else class="text-center py-2">
                <span class="text-emerald-400 font-medium">All audio already generated</span>
              </div>
            </div>
          </div>
        </section>

        <!-- MISSING AUDIO Section -->
        <section>
          <div class="flex items-center gap-4 mb-4">
            <h2 class="text-xs font-semibold text-faint uppercase tracking-wider">Missing Audio</h2>
            <div class="flex-1 h-px bg-surface-2/50"></div>
          </div>

          <MissingAudio :course-code="courseCode" :refresh-trigger="missingAudioKey" />
        </section>

        <!-- SHARED AUDIO Section (encouragements, instructions, welcome, paywall) -->
        <section>
          <div class="flex items-center gap-4 mb-4">
            <h2 class="text-xs font-semibold text-faint uppercase tracking-wider">Shared Audio</h2>
            <div class="flex-1 h-px bg-surface-2/50"></div>
          </div>

          <SharedAudio :course-code="courseCode" />
        </section>

      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { getApiUrl } from '@/services/api'
import { isConfigured as isSupabaseConfigured, getAudioStats as sbGetAudioStats } from '@/services/supabase'
import { useProductionStore } from '@/stores/production'
import { useCourses } from '@/composables/useCourses'
import PipelineProgress from './components/PipelineProgress.vue'
import MissingAudio from './components/MissingAudio.vue'
import SharedAudio from './components/SharedAudio.vue'
import ReuseFirstPanel from './components/ReuseFirstPanel.vue'
import VoiceConfiguration from '@/components/VoiceConfiguration.vue'

const route = useRoute()
const productionStore = useProductionStore()
const { getCourseName } = useCourses()

const courseCode = computed(() => route.params.courseCode as string)
const loading = ref(true)
const error = ref<string | null>(null)

// Gender prep status state
const genderPrepStatus = ref<any>({ isGendered: false, processed: false, totalExpansions: 0 })
const genderPrepFlagCount = ref(0)
const genderPrepRunning = ref(false)
const genderPrepResult = ref<any>(null)

// Voice configuration state
const showVoiceConfig = ref(false)
const voicesConfigured = ref(false)
const voiceConfig = ref<any>(null)

// Regenerate by role state
const regenerateRole = ref('')
const regenerateFlaggedOnly = ref(false)
const regenerating = ref(false)
const regenerateResult = ref<any>(null)
const genderRegenRunning = ref(false)

// Regenerate presentations state

// Plan/dry run state (kept for plan panel compatibility)
const planResult = ref<any>(null)
const showingPlan = ref(false)
const loadingPlan = ref(false)
const statsLoaded = ref(false)  // Track if pipeline stats have loaded

// Generation state for immediate button feedback
const startingGeneration = ref(false)
const refreshingStats = ref(false)
const linkResult = ref<{ linked: number } | null>(null)
const generateSummary = ref<{ authored: number; flags: number; samples: Array<{ lego_id: string | null; phrase_id: string | null; chunk: string; issue: string }> } | null>(null)

// Concurrency control (1-20, stored in localStorage, default 20 for paid Azure tier)
const concurrency = ref(parseInt(localStorage.getItem('audio_concurrency') || '20', 10))

// Voice config update key to trigger MissingAudio refresh
const missingAudioKey = ref(0)

// Global audio progress state (from phase 8)
const audioProgress = ref<any>({ active: false })
let progressPollInterval: ReturnType<typeof setInterval> | null = null

const apiBaseUrl = getApiUrl()

// Poll for audio generation progress
let wasGenerating = false
let consecutiveErrors = 0
const MAX_CONSECUTIVE_ERRORS = 3
const pollAudioProgress = async () => {
  try {
    const response = await fetch(`${apiBaseUrl}/api/audio/status`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    if (response.ok) {
      consecutiveErrors = 0
      const prev = audioProgress.value
      audioProgress.value = await response.json()

      // Detect generation completion: was active, now inactive
      const isActive = audioProgress.value?.active === true
      if (wasGenerating && !isActive) {
        // Generation just finished — refresh everything
        refreshAudioStats()
        // Update regenerateResult if it was showing "running"
        if (regenerateResult.value?.status === 'running') {
          regenerateResult.value = {
            ...regenerateResult.value,
            status: 'completed',
            success: prev?.current || regenerateResult.value.total,
            failed: prev?.failed || 0
          }
        }
      }
      wasGenerating = isActive
    } else {
      consecutiveErrors++
    }
  } catch (err) {
    consecutiveErrors++
    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      console.warn(`[AudioPipeline] Stopping poll after ${MAX_CONSECUTIVE_ERRORS} consecutive errors — server unreachable`)
      stopProgressPolling()
    }
  }
}

// Refresh audio stats from the fast /audio-stats endpoint + missing audio
const refreshAudioStats = async () => {
  refreshingStats.value = true
  try {
    // Always use the backend API — it calls get_audio_counts RPC directly.
    // Never use sbGetAudioStats (frontend direct Supabase) as it counts differently.
    const headers = { 'ngrok-skip-browser-warning': 'true' }
    const response = await fetch(`${apiBaseUrl}/api/production/${courseCode.value}/audio-stats?fresh=1`, { headers })
    if (response.ok) {
      const stats = await response.json()
      if (stats.total !== undefined) {
        productionStore.updatePipelineStats(stats.total, stats.existing, stats.missing || 0)
      }
    }
    // Also refresh MissingAudio component
    missingAudioKey.value++
  } catch (err) {
    // Silently fail
  } finally {
    refreshingStats.value = false
  }
}

// refreshPlanStats now just delegates to refreshAudioStats — both use the same
// get_audio_counts RPC via /audio-stats. No Phase 8 dependency.
const refreshPlanStats = () => refreshAudioStats()

const startProgressPolling = () => {
  if (progressPollInterval) return
  consecutiveErrors = 0
  pollAudioProgress() // Poll immediately
  progressPollInterval = setInterval(pollAudioProgress, 10000) // Then every 10 seconds
  // NOTE: No automatic plan refresh - user must explicitly request it
}

const stopProgressPolling = () => {
  if (progressPollInterval) {
    clearInterval(progressPollInterval)
    progressPollInterval = null
  }
}

// Gender prep status fetch
const fetchGenderPrepStatus = async () => {
  try {
    const response = await fetch(`${apiBaseUrl}/api/production/${courseCode.value}/gender-prep/status`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    if (response.ok) {
      genderPrepStatus.value = await response.json()
      if (genderPrepStatus.value.isGendered && genderPrepStatus.value.processed) {
        const flagResponse = await fetch(`${apiBaseUrl}/api/production/${courseCode.value}/gender-prep/flag-count`, {
          headers: { 'ngrok-skip-browser-warning': 'true' }
        })
        if (flagResponse.ok) {
          const flagData = await flagResponse.json()
          genderPrepFlagCount.value = flagData.flagged || 0
        }
      }
    }
  } catch (err) {
    // Silently fail - endpoint may not exist
  }
}

// Gender prep action + polling
let genderPrepPollTimer: ReturnType<typeof setInterval> | null = null

const startGenderPrep = async () => {
  genderPrepRunning.value = true
  genderPrepResult.value = null
  try {
    const response = await fetch(`${apiBaseUrl}/api/production/${courseCode.value}/gender-prep/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      }
    })
    const data = await response.json()
    if (response.ok) {
      genderPrepResult.value = {
        ok: true,
        text: `Spawned ${data.agents} Haiku agents (${data.totalTexts} texts, ${data.batchSize}/batch)`
      }
      // Start polling to track progress as agents insert rows
      startGenderPrepPolling()
    } else {
      genderPrepResult.value = { ok: false, text: data.error || 'Failed to spawn' }
      genderPrepRunning.value = false
    }
  } catch (err: any) {
    genderPrepResult.value = { ok: false, text: err.message }
    genderPrepRunning.value = false
  }
}

function startGenderPrepPolling() {
  if (genderPrepPollTimer) clearInterval(genderPrepPollTimer)
  let stableCount = 0
  let lastCount = 0
  genderPrepPollTimer = setInterval(async () => {
    await fetchGenderPrepStatus()
    const current = genderPrepStatus.value.totalExpansions || 0
    if (current > 0 && current === lastCount) {
      stableCount++
    } else {
      stableCount = 0
    }
    lastCount = current
    // If count hasn't changed for 4 polls (20s), agents are likely done
    if (stableCount >= 4 && current > 0) {
      clearInterval(genderPrepPollTimer!)
      genderPrepPollTimer = null
      genderPrepRunning.value = false
      genderPrepResult.value = {
        ok: true,
        text: `Done — ${current} gender expansions from ${genderPrepStatus.value.totalExpansions} texts`
      }
    }
  }, 5000)
}

// Load data on mount
onMounted(async () => {
  try {
    error.value = null
    // Load course data progressively (non-blocking)
    productionStore.loadCourse(courseCode.value)
    // Start polling for audio progress
    startProgressPolling()
    // Fetch gender prep status
    fetchGenderPrepStatus()

    // Stats come from the fast /audio-stats endpoint (via loadCourse).
    // Phase 8's generation plan (accurate "to generate" count) comes separately
    // via refreshPlanStats() below — it's slower (~3s) so it loads in background.
    statsLoaded.value = true

    // Fetch pipeline stats in background (for Progress Dashboard)
    refreshPlanStats().then(() => {
      statsLoaded.value = true
    })

    // (Removed 2026-04-29) The background linkAndRecount call here is now redundant
    // because /generate runs link first as Step A, and /audio-stats reports
    // toLink separately so the user can see linkable rows without doing them
    // first. Avoiding the extra Supabase RPC on every page load.
  } catch (err) {
    console.error('Failed to load pipeline:', err)
    error.value = 'Failed to load pipeline data. Please try again.'
  } finally {
    loading.value = false
  }
})

// Cleanup on unmount
onUnmounted(() => {
  stopProgressPolling()
  if (genderPrepPollTimer) clearInterval(genderPrepPollTimer)
})

// Computed properties
const progressStats = computed(() => productionStore.pipelineStats)
const isGenerating = computed(() => productionStore.jobStatus === 'running')
const otherCourseJobActive = computed(() =>
  audioProgress.value.active && audioProgress.value.courseCode && audioProgress.value.courseCode !== courseCode.value
)
const hasFailed = computed(() => progressStats.value.failed > 0)
// Phase 8 reports which job is running via `operation`; reuse-first shares this
// one progress panel with generate and regenerate-role.
const progressHeading = computed(() => {
  const op = audioProgress.value.operation
  if (op === 'regenerate-role') return `Regenerating ${audioProgress.value.role}`
  if (op === 'reuse-first') return 'Reuse-First Regeneration'
  return 'Generating Missing Audio'
})
// Generate is allowed when:
//  - There's TTS work (pending > 0), OR
//  - There's link-only work (linkable > 0) — Generate runs the linker even with no TTS
//  - AND presentation text is ready (LEGOs/components have pending course_audio rows)
const canStartGeneration = computed(() => {
  if (isGenerating.value || otherCourseJobActive.value) return false
  const ps = progressStats.value
  const hasWork = (ps.pending > 0) || ((ps.linkable || 0) > 0)
  const ready = ps.readyForGenerate !== false  // default true if undefined
  return hasWork && ready
})
const generateButtonLabel = computed(() => {
  if (isGenerating.value) return 'Generating...'
  if (startingGeneration.value) return 'Starting...'
  if (otherCourseJobActive.value) return `Busy (${getCourseName(audioProgress.value.courseCode)})`
  const ps = progressStats.value
  if (ps.readyForGenerate === false) return 'Presentation text required'
  if (ps.pending === 0 && (ps.linkable || 0) > 0) return `Link ${ps.linkable} audios (no TTS)`
  return 'Generate Missing Audio'
})
const estimatedCost = computed(() => productionStore.costEstimate.estimated || null)
const estimatedTime = computed(() => productionStore.costEstimate.estimatedTime || null)

// Concurrency update (save to localStorage)
const updateConcurrency = (value: number) => {
  concurrency.value = Math.max(1, Math.min(20, value))
  localStorage.setItem('audio_concurrency', String(concurrency.value))
}

// Actions
const startGeneration = async () => {
  startingGeneration.value = true
  error.value = null
  try {
    // Always call generate - even with 0 missing, it links audio IDs to phrases
    const result = await productionStore.startGeneration(courseCode.value, { concurrency: concurrency.value })
    if (result && (result.authored > 0 || result.authorFlags > 0)) {
      generateSummary.value = {
        authored: result.authored || 0,
        flags: result.authorFlags || 0,
        samples: result.authorFlagSamples || []
      }
    }
    if (result?.linked > 0) {
      linkResult.value = { linked: result.linked }
      setTimeout(() => { linkResult.value = null }, 10000)
    }
    // Refresh stats after generation starts (linking may have changed counts)
    refreshAudioStats()
  } catch (err: any) {
    error.value = err.message || 'Failed to start generation'
  } finally {
    startingGeneration.value = false
  }
}

const cancelGeneration = async () => {
  await productionStore.cancelGeneration(courseCode.value)
}

const retryFailed = async () => {
  await productionStore.retryFailed(courseCode.value)
}

const showPlan = async () => {
  loadingPlan.value = true
  planResult.value = null
  try {
    const data = await productionStore.generatePlan(courseCode.value)
    planResult.value = data
    showingPlan.value = true
    // Also update the dashboard stats — prefer Phase 8's generation plan (deduped unique clips)
    const gp = data.generationPlan
    if (gp && gp.total !== undefined) {
      productionStore.updatePipelineStats(gp.total, gp.existing, gp.missing || 0)
    } else if (data.total !== undefined && data.existing !== undefined) {
      productionStore.updatePipelineStats(data.total, data.existing, data.missing || 0)
    }
  } catch (err: any) {
    planResult.value = { error: err.message }
    showingPlan.value = true
  } finally {
    loadingPlan.value = false
  }
}

// Voice configuration handlers
const onVoiceConfigLoaded = (config: any) => {
  voiceConfig.value = config
  // Check if all required voices are configured
  const voices = config?.voices || {}
  voicesConfigured.value = !!(
    voices.target1?.voiceId &&
    voices.target2?.voiceId &&
    voices.known?.voiceId
  )
  // Auto-expand if not configured
  if (!voicesConfigured.value) {
    showVoiceConfig.value = true
  }
}

const onVoiceConfigSaved = (config: any) => {
  voiceConfig.value = config
  const voices = config?.voices || {}
  voicesConfigured.value = !!(
    voices.target1?.voiceId &&
    voices.target2?.voiceId &&
    voices.known?.voiceId
  )
  // Trigger MissingAudio component to refresh so Play Sample uses new voices
  missingAudioKey.value++
}

// Regenerate by role functions
const previewRegenerate = async () => {
  if (!regenerateRole.value) return

  regenerating.value = true
  regenerateResult.value = null

  try {
    const response = await fetch(`${apiBaseUrl}/api/audio/regenerate-role/${courseCode.value}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        role: regenerateRole.value,
        flaggedOnly: regenerateFlaggedOnly.value,
        dryRun: true
      })
    })

    const data = await response.json()
    if (!response.ok) {
      regenerateResult.value = { error: data.error || 'Preview failed' }
    } else {
      regenerateResult.value = {
        dryRun: true,
        count: data.count,
        voiceId: data.voiceId,
        language: data.language,
        sample: data.sample
      }
    }
  } catch (err: any) {
    regenerateResult.value = { error: err.message }
  } finally {
    regenerating.value = false
  }
}

const executeRegenerate = async () => {
  if (!regenerateRole.value) return

  const count = regenerateResult.value?.count || 'unknown number of'
  const scope = regenerateFlaggedOnly.value ? 'FLAGGED' : 'ALL'
  const confirmed = confirm(
    `This will regenerate ${count} ${scope} ${regenerateRole.value} audio files for ${getCourseName(courseCode.value)}.\n\n` +
    `Existing audio files will be replaced.\n\n` +
    `Continue?`
  )
  if (!confirmed) return

  regenerating.value = true
  regenerateResult.value = null

  try {
    const response = await fetch(`${apiBaseUrl}/api/audio/regenerate-role/${courseCode.value}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        role: regenerateRole.value,
        flaggedOnly: regenerateFlaggedOnly.value,
        dryRun: false
      })
    })

    const data = await response.json()
    if (!response.ok && response.status !== 202) {
      regenerateResult.value = { error: data.error || 'Regeneration failed' }
    } else if (response.status === 202 || data.accepted) {
      // Non-blocking: regeneration running in background
      regenerateResult.value = {
        dryRun: false,
        status: 'running',
        total: data.total,
        voiceId: data.voiceId,
        language: data.language,
        message: data.message
      }
      // Don't set regenerating=false — the audio progress poller shows live status
    } else {
      regenerateResult.value = {
        dryRun: false,
        status: 'completed',
        total: data.total,
        success: data.success,
        failed: data.failed,
        voiceId: data.voiceId,
        language: data.language
      }
      // Reload pipeline stats
      await productionStore.loadCourse(courseCode.value)
    }
  } catch (err: any) {
    regenerateResult.value = { error: err.message }
  } finally {
    regenerating.value = false
  }
}

// Regenerate all gender-flagged clips: one flaggedOnly regenerate-role job per
// target voice. Voice 1 gets expanded_f, Voice 2 gets expanded_m — the gendered
// text substitution happens in Phase 8 via the pre-computed gender map, and
// production-api clears each clip's flag once its job completes.
const regenerateFlagged = async () => {
  const confirmed = confirm(
    `This will re-voice ${genderPrepFlagCount.value} flagged clips for ${getCourseName(courseCode.value)} ` +
    `using the gendered text (Voice 1 = feminine forms, Voice 2 = masculine forms).\n\n` +
    `This costs TTS. Continue?`
  )
  if (!confirmed) return

  genderRegenRunning.value = true
  genderPrepResult.value = null
  try {
    for (const role of ['target1', 'target2']) {
      const response = await fetch(`${apiBaseUrl}/api/audio/regenerate-role/${courseCode.value}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ role, flaggedOnly: true, dryRun: false })
      })
      const data = await response.json()
      if (!response.ok && response.status !== 202) {
        genderPrepResult.value = { ok: false, text: `${role}: ${data.error || 'failed to queue regeneration'}` }
        return
      }
    }
    genderPrepResult.value = { ok: true, text: 'Queued flagged regeneration for both voices — flags clear as each job completes' }
    startProgressPolling()
  } catch (err: any) {
    genderPrepResult.value = { ok: false, text: err.message }
  } finally {
    genderRegenRunning.value = false
  }
}

// The separate presentation-text stage is gone: /generate authors intro
// scripts itself (frozen frame + context judgment) — see the Introductions
// card above and docs/presentation-authoring-redesign.md.
</script>

<style scoped>
.audio-pipeline {
  padding: 0;
}

/*
 * LIGHT-MODE CONTRAST OVERRIDES (dark mode untouched).
 * This view uses fixed Tailwind palette utilities (emerald/amber/purple/blue/
 * teal/red -400 and -300) that were tuned for dark card backgrounds. On the
 * light theme those shades sit on white/slate-50 surfaces at ~1.4:1–3.3:1 and
 * fail WCAG AA. Re-map the foreground swatches to their darker (-700/-600)
 * equivalents only under [data-theme="light"] so status text, stat numbers,
 * badge labels and inline <code> stay the same hue but become legible.
 * All ratios below are vs white (#ffffff, --surface) which is the worst case;
 * the slate-50 chip fills are darker so ratios there are marginally higher.
 */
:global([data-theme='light']) .audio-pipeline :deep(.text-emerald-400),
:global([data-theme='light']) .audio-pipeline :deep(.text-emerald-300) {
  color: #047857 !important; /* emerald-700: 4.9:1 on #fff (was #34d399 1.7:1) */
}
:global([data-theme='light']) .audio-pipeline :deep(.text-amber-400),
:global([data-theme='light']) .audio-pipeline :deep(.text-amber-300) {
  color: #b45309 !important; /* amber-700: 4.9:1 on #fff (was #fbbf24 1.4:1) */
}
:global([data-theme='light']) .audio-pipeline :deep(.text-purple-400),
:global([data-theme='light']) .audio-pipeline :deep(.text-purple-300),
:global([data-theme='light']) .audio-pipeline :deep(.text-purple-200) {
  color: #7e22ce !important; /* purple-700: 5.9:1 on #fff (was #c084fc 2.4:1) */
}
:global([data-theme='light']) .audio-pipeline :deep(.text-blue-400) {
  color: #1d4ed8 !important; /* blue-700: 6.3:1 on #fff (was #60a5fa 2.6:1) */
}
:global([data-theme='light']) .audio-pipeline :deep(.text-teal-400),
:global([data-theme='light']) .audio-pipeline :deep(.text-teal-300) {
  color: #0f766e !important; /* teal-700: 5.2:1 on #fff (was #2dd4bf 1.7:1) */
}
:global([data-theme='light']) .audio-pipeline :deep(.text-red-400) {
  color: #b91c1c !important; /* red-700: 6.0:1 on #fff (was #f87171 3.3:1) */
}
/* Opacity-modifier subtext variants (rgb a/0.7) — drop the alpha + darken. */
:global([data-theme='light']) .audio-pipeline :deep(.text-emerald-400\/70) {
  color: #047857 !important; /* emerald-700, full alpha */
}
:global([data-theme='light']) .audio-pipeline :deep(.text-amber-400\/70) {
  color: #b45309 !important; /* amber-700, full alpha */
}
:global([data-theme='light']) .audio-pipeline :deep(.text-teal-400\/70) {
  color: #0f766e !important; /* teal-700, full alpha */
}
</style>
