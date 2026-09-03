<template>
  <div class="text-generation">
    <div class="max-w-4xl mx-auto px-6 py-8 space-y-6">
      <!-- Language Selection (Create Mode) -->
      <section v-if="isCreateMode" class="bg-surface/30 border border-emerald-500/30 rounded-lg p-6">
        <h2 class="text-sm font-medium text-emerald-400 uppercase tracking-wide mb-4">New Course</h2>

        <div class="grid grid-cols-2 gap-6">
          <div>
            <label class="block text-xs text-faint mb-2">Known Language (Learning FROM)</label>
            <select
              v-model="knownLanguage"
              class="w-full bg-surface-2 border border-line rounded-lg px-3 py-2 text-ink text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="" disabled selected>{{ languagesLoading ? 'Loading...' : 'Select known language' }}</option>
              <option v-for="lang in languages" :key="lang.code" :value="lang.code">
                {{ lang.name }} ({{ lang.code }})
              </option>
            </select>
          </div>
          <div>
            <label class="block text-xs text-faint mb-2">Target Language (Learning TO)</label>
            <select
              v-model="targetLanguage"
              class="w-full bg-surface-2 border border-line rounded-lg px-3 py-2 text-ink text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="" disabled selected>{{ languagesLoading ? 'Loading...' : 'Select target language' }}</option>
              <option v-for="lang in languages" :key="lang.code" :value="lang.code">
                {{ lang.name }} ({{ lang.code }})
              </option>
            </select>
          </div>
        </div>

        <div v-if="computedCourseCode" class="mt-4 flex items-center justify-between bg-emerald-900/20 border border-emerald-500/20 rounded-lg p-3">
          <p class="text-sm">
            <span class="text-muted">Course code:</span>
            <span class="text-emerald-400 font-mono ml-2">{{ computedCourseCode }}</span>
          </p>
          <button
            @click="createCourse"
            :disabled="creatingCourse"
            class="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-surface-3 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-all"
          >
            {{ creatingCourse ? 'Creating...' : 'Create Course' }}
          </button>
        </div>
      </section>

      <!-- Target seeds control -->
      <section v-if="!isCreateMode" class="bg-surface/30 border border-line/50 rounded-lg px-4 py-2">
        <div class="flex items-center gap-4">
          <span class="text-xs text-faint uppercase">Target</span>
          <div class="flex items-center gap-2">
            <button
              v-for="size in courseSizes"
              :key="size.seeds"
              @click="seedCount = size.seeds"
              class="px-2.5 py-1 rounded border transition-all text-xs font-medium"
              :class="seedCount === size.seeds
                ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400'
                : 'bg-surface-2/30 border-line/50 text-muted hover:border-line/50'"
            >
              {{ size.label }}
            </button>
            <input
              v-model.number="seedCount"
              type="number"
              min="1"
              max="1000"
              class="w-16 px-2 py-1 rounded border bg-surface-2/50 border-line/50 text-ink text-xs text-center font-mono"
            />
          </div>
        </div>
      </section>

      <!-- Course Stats Summary Bar -->
      <section v-if="progress.currentSeed > 0 || progress.legosInserted > 0" class="bg-surface/30 border border-line/50 rounded-lg px-6 py-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-6">
            <div class="flex items-center gap-2">
              <span class="text-xs text-faint uppercase">Seeds</span>
              <span class="text-sm font-mono font-semibold text-ink">{{ progress.currentSeed }}/{{ progress.totalSeeds || seedCount }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-faint uppercase">LEGOs</span>
              <span class="text-sm font-mono font-semibold text-ink">{{ progress.legosInserted }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-faint uppercase">Phrases</span>
              <span class="text-sm font-mono font-semibold text-ink">{{ progress.phrasesInserted.toLocaleString() }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-faint uppercase">Ratio</span>
              <span class="text-sm font-mono font-semibold" :class="ratioClass">{{ ratio }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-faint uppercase">Quality</span>
              <span class="text-sm font-mono font-semibold" :class="qualityScoreClass">{{ progress.avgPhraseScore || '—' }}</span>
            </div>
          </div>
          <!-- Active Agents indicator -->
          <div v-if="agents.running_count > 0" class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
            <span class="text-xs text-cyan-400">{{ agents.running_count }} agent{{ agents.running_count > 1 ? 's' : '' }}</span>
          </div>
        </div>
      </section>

      <!-- PIPELINE -->
      <section v-if="!isCreateMode" class="space-y-2">
        <!-- Action Error Banner -->
        <div v-if="actionError" class="flex items-center justify-between bg-red-900/30 border border-red-500/50 rounded-lg px-4 py-2.5 mb-2">
          <span class="text-sm text-red-300">{{ actionError.message }}</span>
          <button @click="actionError = null" class="text-red-400 hover:text-red-300 text-xs ml-4">Dismiss</button>
        </div>

        <div class="flex items-center justify-between mb-3">
          <h2 class="text-xs font-medium text-faint uppercase tracking-wide">Pipeline</h2>
          <div class="flex items-center gap-2">
            <button
              @click="chatExpanded = !chatExpanded"
              class="px-2 py-1 rounded border text-xs font-medium transition-all relative"
              :class="chatExpanded
                ? 'bg-violet-600/20 border-violet-500/50 text-violet-400'
                : orchestratorHasPending
                  ? 'bg-amber-600/20 border-amber-500/50 text-amber-400 animate-pulse'
                  : 'bg-surface-2/30 border-line/50 text-faint hover:border-violet-500/50 hover:text-violet-400'"
            >
              Chat
              <span v-if="unreadChatCount > 0 && !chatExpanded" class="absolute -top-1.5 -right-1.5 min-w-[1.1rem] h-[1.1rem] flex items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-slate-900 px-1">{{ unreadChatCount > 99 ? '99+' : unreadChatCount }}</span>
            </button>
          </div>
        </div>

        <!-- Chat Panel -->
        <div v-if="chatExpanded" class="mb-3 bg-canvas/60 border rounded-lg overflow-hidden flex flex-col"
          :class="orchestratorHasPending ? 'border-amber-500/40' : 'border-line/40'"
        >
          <!-- Header -->
          <div class="flex items-center justify-between px-3 py-2 border-b border-line/50">
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full" :class="agents.running_count > 0 ? 'bg-emerald-400' : 'bg-surface-3'"></span>
              <span class="text-xs font-medium" :class="agents.running_count > 0 ? 'text-emerald-400' : 'text-faint'">
                Agent Chat
              </span>
              <span v-if="visibleChatMessages.length" class="text-xs text-faint">{{ visibleChatMessages.length }} messages</span>
            </div>
            <button @click="clearChat" class="text-xs text-faint hover:text-muted transition-colors">Clear</button>
          </div>

          <!-- Message thread -->
          <div ref="chatScrollEl" class="flex-1 overflow-y-auto px-3 py-2 space-y-2 max-h-72">
            <div v-if="!visibleChatMessages.length" class="text-xs text-faint text-center py-4">
              Messages with the decompose agent will appear here
            </div>
            <div
              v-for="msg in visibleChatMessages"
              :key="msg.id"
              class="flex"
              :class="msg.direction === 'human_to_agent' || msg._human ? 'justify-end' : 'justify-start'"
            >
              <div
                class="max-w-[85%] rounded-lg px-3 py-2 text-xs"
                :class="msg.direction === 'human_to_agent' || msg._human
                  ? 'bg-violet-600/20 border border-violet-500/30 text-white'
                  : msg.status === 'responded'
                    ? 'bg-surface/60 border border-line/40 text-muted'
                    : 'bg-surface/80 border border-line/40 text-ink'"
              >
                <div>{{ msg.message || msg.response }}</div>
                <div class="text-faint mt-1">{{ formatTime(msg.created_at) }}</div>
              </div>
            </div>
          </div>

          <!-- Input -->
          <div class="px-3 py-2 border-t border-line/50 flex gap-2">
            <textarea
              v-model="chatInput"
              placeholder="Message the agent… (redo seed N / undo seed N)"
              rows="2"
              class="flex-1 bg-surface/50 border border-line/40 rounded px-2 py-1.5 text-xs text-ink placeholder-faint resize-none focus:outline-none focus:border-violet-500/50"
              @keydown.meta.enter="sendChat"
            />
            <button
              @click="sendChat"
              :disabled="chatSending || !chatInput.trim()"
              class="px-3 py-1 rounded border text-xs font-medium self-end transition-all disabled:opacity-30"
              :class="chatSending ? 'bg-violet-600/20 border-violet-500/50 text-violet-400 animate-pulse' : 'bg-violet-600/20 border-violet-500/50 text-violet-400 hover:bg-violet-600/30'"
            >
              {{ chatSending ? '...' : 'Send' }}
            </button>
          </div>
        </div>

        <!-- Process Activity Banner -->
        <div v-if="processActive && latestProcessMessage" class="pipeline-card border-cyan-500/30 bg-cyan-500/5">
          <div class="flex items-center gap-3">
            <span class="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
            <span class="text-xs text-cyan-300">{{ latestProcessMessage }}</span>
            <span class="text-xs text-faint ml-auto">{{ formatSecondsAgo(secondsSince(lastProgressMessageAt)) }}</span>
          </div>
        </div>

        <!-- Stage 1: Translate -->
        <div class="pipeline-card" :class="stageCardClass('translate')">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="stage-number" :class="stageNumberClass('translate')">1</span>
              <div>
                <div class="text-sm font-medium text-ink">Translate</div>
                <div class="text-xs text-faint">{{ translateTotal }} seed translations</div>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-xs font-mono text-ink">{{ progress.seedsTranslated || 0 }}/{{ translateTotal }}</span>
              <span v-if="stageComplete('translate')" class="stage-badge-complete">Done</span>
              <button
                v-if="stageComplete('translate')"
                @click="confirmResetTranslations"
                :disabled="translateResetting"
                class="px-3 py-1 bg-surface-3/20 border border-line/50 text-muted hover:border-red-400/70 hover:text-red-400 disabled:opacity-50 text-xs font-medium rounded-lg transition-all"
              >
                {{ translateResetting ? 'Resetting...' : 'Reset' }}
              </button>
              <span v-else-if="translateActive" class="text-xs text-blue-400">
                Translating — last seed {{ translateLastActivity }}
              </span>
              <span v-else-if="translateSpawned" class="text-xs text-blue-400 animate-pulse">Spawned — waiting for first seed...</span>
              <template v-else-if="translateStale">
                <span class="text-xs text-amber-400">No new seeds for {{ translateLastActivity }}</span>
                <button
                  @click="buildMonitor.refresh()"
                  class="px-2 py-0.5 bg-surface-3/20 border border-line/50 text-ink hover:border-line/70 text-xs font-medium rounded-lg transition-all"
                >Check</button>
                <button
                  @click="startTranslation"
                  :disabled="translateStarting || processActive"
                  class="px-2 py-0.5 bg-blue-600/20 border border-blue-500/50 text-blue-400 hover:border-blue-400/70 disabled:opacity-50 text-xs font-medium rounded-lg transition-all"
                >{{ translateStarting ? 'Spawning...' : 'Restart' }}</button>
              </template>
              <button
                v-else
                @click="startTranslation"
                :disabled="translateStarting || processActive"
                class="px-3 py-1 bg-blue-600/20 border border-blue-500/50 text-blue-400 hover:border-blue-400/70 disabled:opacity-50 text-xs font-medium rounded-lg transition-all"
              >
                {{ translateStarting ? 'Spawning...' : (progress.seedsTranslated > 0 ? 'Continue Translate' : 'Start Translate') }}
              </button>
            </div>
          </div>
          <div class="mt-2 h-1 bg-surface-2/50 rounded-full overflow-hidden">
            <div class="h-full rounded-full bg-blue-500 transition-all duration-500" :style="{ width: `${translatePercent}%` }"></div>
          </div>
        </div>

        <!-- Stage 2: Build Team -->
        <div class="pipeline-card" :class="stageCardClass('build-team')">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="stage-number" :class="stageNumberClass('build-team')">2</span>
              <div>
                <div class="text-sm font-medium text-ink">Build Team</div>
                <div class="text-xs text-faint">{{ buildTeamSubtitle }}</div>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-xs font-mono text-ink">{{ progress.currentSeed || 0 }}/{{ seedCount }}</span>
              <span v-if="stageComplete('build-team')" class="stage-badge-complete">Done</span>
              <span v-else-if="stageLocked('build-team')" class="stage-badge-locked">Locked</span>
              <span v-else-if="buildActive" class="text-xs text-emerald-400">
                Building — last seed {{ buildLastActivity }}
              </span>
              <span v-else-if="buildTeamSpawned" class="text-xs text-emerald-400 animate-pulse">Spawned — waiting for first seed...</span>
              <template v-else-if="buildStale">
                <span class="text-xs text-amber-400">No new seeds for {{ buildLastActivity }}</span>
                <button
                  @click="buildMonitor.refresh()"
                  class="px-2 py-0.5 bg-surface-3/20 border border-line/50 text-ink hover:border-line/70 text-xs font-medium rounded-lg transition-all"
                >Check</button>
                <button
                  @click="startBuildTeam"
                  :disabled="buildTeamStarting || processActive"
                  class="px-2 py-0.5 bg-emerald-600/20 border border-emerald-500/50 text-emerald-400 hover:border-emerald-400/70 disabled:opacity-50 text-xs font-medium rounded-lg transition-all"
                >{{ buildTeamStarting ? 'Spawning...' : 'Restart' }}</button>
              </template>
              <button
                v-else
                @click="startBuildTeam"
                :disabled="buildTeamStarting || processActive"
                class="px-3 py-1 bg-emerald-600/20 border border-emerald-500/50 text-emerald-400 hover:border-emerald-400/70 disabled:opacity-50 text-xs font-medium rounded-lg transition-all"
              >
                {{ buildTeamStarting ? 'Spawning...' : buildTeamButtonLabel }}
              </button>
            </div>
          </div>
          <div v-if="!stageLocked('build-team')" class="mt-2 h-1 bg-surface-2/50 rounded-full overflow-hidden">
            <div class="h-full rounded-full bg-emerald-500 transition-all duration-500" :style="{ width: `${buildPercent}%` }"></div>
          </div>
        </div>

        <!-- Stage 3: Final Pass (wizard-style — one action at a time) -->
        <div class="pipeline-card" :class="stageCardClass('final-pass')">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="stage-number" :class="stageNumberClass('final-pass')">3</span>
              <div>
                <div class="text-sm font-medium text-ink">Final Pass</div>
                <div class="text-xs text-faint">{{ finalPassSubtitle }}</div>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span v-if="stageLocked('final-pass')" class="stage-badge-locked">Locked</span>
              <span v-else-if="stageComplete('final-pass')" class="stage-badge-complete">Done</span>
              <template v-else>
                <button
                  v-if="finalPassApproveAction"
                  @click="finalPassApproveAction.handler"
                  :disabled="finalPassApproveAction.disabled"
                  class="px-4 py-1.5 text-xs font-medium rounded-lg transition-all disabled:opacity-50"
                  :class="finalPassApproveAction.btnClass"
                >
                  {{ finalPassApproveAction.label }}
                </button>
                <button
                  @click="finalPassNextAction.handler"
                  :disabled="finalPassNextAction.disabled"
                  class="px-4 py-1.5 text-xs font-medium rounded-lg transition-all disabled:opacity-50"
                  :class="finalPassNextAction.btnClass"
                >
                  {{ finalPassNextAction.label }}
                </button>
              </template>
            </div>
          </div>
          <!-- Progress summary (when not locked and not complete) -->
          <div v-if="!stageLocked('final-pass') && !stageComplete('final-pass') && finalPassSummary" class="mt-2 text-xs text-faint">
            {{ finalPassSummary }}
          </div>
        </div>

        <!-- Stage 4: Verify Components -->
        <div class="pipeline-card" :class="componentCardClass">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="stage-number" :class="componentNumberClass">4</span>
              <div>
                <div class="text-sm font-medium text-ink">Verify Components</div>
                <div class="text-xs text-faint">
                  <template v-if="componentGaps === null">M-LEGO component completeness</template>
                  <template v-else-if="componentGaps.complete">All {{ componentGaps.total_m_legos }} M-LEGOs have components</template>
                  <template v-else>{{ componentGaps.gaps.total }} of {{ componentGaps.total_m_legos }} M-LEGOs need components</template>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <template v-if="componentGaps !== null && !componentGaps.complete">
                <span class="text-xs text-muted">
                  <span v-if="componentGaps.gaps.null_components" class="text-rose-400">{{ componentGaps.gaps.null_components }} missing</span>
                  <span v-if="componentGaps.gaps.empty_components" class="text-orange-400 ml-2">{{ componentGaps.gaps.empty_components }} empty</span>
                  <span v-if="componentGaps.gaps.partial_components" class="text-amber-400 ml-2">{{ componentGaps.gaps.partial_components }} partial</span>
                </span>
              </template>
              <span v-if="componentGaps !== null && componentGaps.complete" class="stage-badge-complete">Done</span>
              <button
                v-if="componentGaps === null"
                @click="checkComponentGaps"
                :disabled="componentCheckLoading"
                class="px-3 py-1 bg-teal-600/20 border border-teal-500/50 text-teal-400 hover:border-teal-400/70 disabled:opacity-50 text-xs font-medium rounded-lg transition-all"
              >
                {{ componentCheckLoading ? 'Checking...' : 'Check' }}
              </button>
              <button
                v-else-if="!componentGaps.complete"
                @click="startComponentBackfill"
                :disabled="componentBackfillStarting || componentBackfillSpawned"
                class="px-3 py-1 bg-teal-600/20 border border-teal-500/50 text-teal-400 hover:border-teal-400/70 disabled:opacity-50 text-xs font-medium rounded-lg transition-all"
              >
                {{ componentBackfillStarting ? 'Spawning...' : componentBackfillSpawned ? 'Agent working...' : `Fix ${componentGaps.gaps.total} M-LEGOs` }}
              </button>
              <button
                v-if="componentGaps !== null"
                @click="checkComponentGaps"
                :disabled="componentCheckLoading"
                class="px-3 py-1 bg-surface-3/20 border border-line/50 text-muted hover:border-line/70 disabled:opacity-50 text-xs font-medium rounded-lg transition-all"
              >
                {{ componentCheckLoading ? '...' : 'Recheck' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Stage: Zero Uncertainty (ZUT) — one English prompt → one answer -->
        <div class="pipeline-card" :class="zutCardClass">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="stage-number" :class="zutNumberClass">Z</span>
              <div>
                <div class="text-sm font-medium text-ink">Zero Uncertainty (ZUT)</div>
                <div class="text-xs text-faint">
                  <template v-if="zutCollisions === null">One English prompt → one answer</template>
                  <template v-else-if="zutCollisions.complete">No collisions — every prompt maps to one answer</template>
                  <template v-else>{{ zutCollisions.collisions.total }} prompts map to multiple answers</template>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span v-if="zutCollisions !== null && !zutCollisions.complete" class="text-xs text-rose-400">{{ zutCollisions.collisions.total }} collisions</span>
              <span v-if="zutCollisions !== null && zutCollisions.complete" class="stage-badge-complete">Done</span>
              <button
                v-if="zutCollisions === null"
                @click="checkZutCollisions"
                :disabled="zutCheckLoading"
                class="px-3 py-1 bg-teal-600/20 border border-teal-500/50 text-teal-400 hover:border-teal-400/70 disabled:opacity-50 text-xs font-medium rounded-lg transition-all"
              >
                {{ zutCheckLoading ? 'Checking...' : 'Check' }}
              </button>
              <button
                v-else-if="!zutCollisions.complete"
                @click="startZutResolve"
                :disabled="zutResolveStarting || zutResolveSpawned"
                class="px-3 py-1 bg-teal-600/20 border border-teal-500/50 text-teal-400 hover:border-teal-400/70 disabled:opacity-50 text-xs font-medium rounded-lg transition-all"
              >
                {{ zutResolveStarting ? 'Spawning...' : zutResolveSpawned ? 'Agent working...' : `Resolve ${zutCollisions.collisions.total}` }}
              </button>
              <button
                v-if="zutCollisions !== null"
                @click="checkZutCollisions"
                :disabled="zutCheckLoading"
                class="px-3 py-1 bg-surface-3/20 border border-line/50 text-muted hover:border-line/70 disabled:opacity-50 text-xs font-medium rounded-lg transition-all"
              >
                {{ zutCheckLoading ? '...' : 'Recheck' }}
              </button>
            </div>
          </div>
        </div>

        <!-- Stage 5: Gender Prep — always shown; the known-gendered list only
             changes the hint, it never hides the stage (e.g. Macedonian is
             gendered but was not on the original 6-language hard-code). -->
        <div class="pipeline-card" :class="stageCardClass('gender')">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="stage-number" :class="stageNumberClass('gender')">5</span>
              <div>
                <div class="text-sm font-medium text-ink">
                  Gender Prep
                  <span v-if="!genderPrepRecommended" class="ml-2 text-[10px] uppercase tracking-wide text-faint border border-line/60 rounded px-1.5 py-0.5 align-middle">Optional</span>
                </div>
                <div class="text-xs text-faint">
                  {{ genderPrepRecommended
                    ? 'Gender expansions — this language changes words depending on who is speaking or spoken about'
                    : 'Run this if the target language has masculine/feminine word forms; skip it if not' }}
                </div>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span v-if="stageComplete('gender')" class="stage-badge-complete">Done</span>
              <span v-else-if="stageLocked('gender')" class="stage-badge-locked">Locked</span>
              <button
                v-else
                @click="startGenderPrep"
                :disabled="genderStarting || genderSpawned"
                class="px-3 py-1 bg-pink-600/20 border border-pink-500/50 text-pink-400 hover:border-pink-400/70 disabled:opacity-50 text-xs font-medium rounded-lg transition-all"
              >
                {{ genderStarting ? 'Starting...' : genderSpawned ? 'Agent working...' : 'Start Gender Prep' }}
              </button>
            </div>
          </div>
        </div>

      </section>

      <!-- Seed Grid -->
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
            <span v-if="seedGridUnderThreshold > 0" class="text-xs text-orange-400">
              {{ seedGridUnderThreshold }} need phrases
            </span>
            <span v-if="seedGridFlagged > 0" class="text-xs text-rose-400">
              {{ seedGridFlagged }} flagged
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
          <!-- Grid -->
          <div class="flex flex-wrap gap-1">
            <div
              v-for="cell in seedGrid"
              :key="cell.seed"
              class="seed-cell w-5 h-5 rounded-sm cursor-pointer transition-colors"
              :class="[seedCellClass(cell), genderPairSeeds.has(cell.seed) ? 'has-gender-pair' : '', selectedSeed === cell.seed ? 'ring-2 ring-white/60 ring-offset-1 ring-offset-surface' : '']"
              :data-seed="genderPairSeeds.has(cell.seed) ? cell.seed + ' ♂/♀' : cell.seed"
              @click="selectSeed(cell.seed)"
            ></div>
          </div>

          <!-- Legend -->
          <div class="flex items-center gap-4 mt-3 text-xs text-faint">
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-surface-2/30"></span> Empty</span>
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-indigo-400/60"></span> Building</span>
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-cyan-500/60"></span> Decomposed</span>
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-rose-500/70 ring-1 ring-inset ring-rose-400"></span> Flagged</span>
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-amber-400/70"></span> Drafted</span>
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-emerald-500/80"></span> Complete</span>
            <span v-if="genderPairSeeds.size > 0" class="flex items-center gap-1.5">
              <span class="w-3 h-3 rounded-sm bg-surface-2/30 gender-pair-swatch"></span> ♂/♀ cue pair ({{ genderPairSeeds.size }})
            </span>
          </div>
        </div>
      </section>

      <!-- Phrase Viewer (standalone, below grid) -->
      <section v-if="selectedSeed !== null" class="bg-surface/30 border border-line/50 rounded-lg overflow-hidden">
        <div class="px-6 py-4">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-mono font-medium text-ink">Seed {{ selectedSeed }}</span>
            <button @click="selectedSeed = null; seedViewPhrases = []; seedViewSeedText = null" class="text-xs text-faint hover:text-ink transition-colors">✕ close</button>
          </div>
          <!-- Seed sentence -->
          <div v-if="seedViewSeedText" class="mb-4 p-3 bg-surface/60 border border-line/40 rounded">
            <div class="text-[10px] text-faint mb-1 font-mono tracking-wider uppercase">Seed</div>
            <div class="flex items-start gap-2 flex-wrap">
              <GenderPairText
                class="text-base font-medium text-ink"
                :text="seedViewSeedText.known_text || '…'"
                :pair="genderPairFor(seedViewSeedText.known_text)"
              />
              <span class="text-faint text-sm mt-0.5">→</span>
              <span
                class="text-base text-emerald-400"
                :dir="dirFor(seedViewSeedText.target_text)"
                style="unicode-bidi: isolate"
              >{{ seedViewSeedText.target_text || '…' }}</span>
            </div>
          </div>
          <div v-if="seedViewLoading" class="text-sm text-faint animate-pulse py-2">Loading...</div>
          <div v-else-if="seedViewPhrases.length === 0" class="text-sm text-faint py-2">No phrases found for this seed.</div>
          <div v-else class="space-y-3">
            <div v-for="lego in seedViewPhrases" :key="lego.lego_index" class="border border-line/40 rounded p-3">
              <!-- LEGO header -->
              <div class="flex items-center gap-2 mb-2">
                <span class="text-[10px] font-mono text-faint">L{{ lego.lego_index }}</span>
                <template v-if="lego.meta">
                  <span class="text-[10px] px-1 rounded font-mono" :class="(lego.meta.type || lego.meta.lego_type) === 'M' ? 'bg-violet-900/40 text-violet-400' : 'bg-surface-2/40 text-muted'">{{ lego.meta.type || lego.meta.lego_type }}</span>
                  <GenderPairText
                    class="text-base font-medium text-ink"
                    :text="lego.meta.known_text"
                    :pair="genderPairFor(lego.meta.known_text)"
                  />
                  <span class="text-faint text-sm">→</span>
                  <span
                    class="text-base font-medium text-emerald-400"
                    :dir="dirFor(lego.meta.target_text)"
                    style="unicode-bidi: isolate"
                  >{{ lego.meta.target_text }}</span>
                </template>
              </div>
              <!-- Phrases -->
              <div v-for="phrase in lego.phrases" :key="phrase.id" class="flex gap-2 text-sm py-0.5 pl-3">
                <span class="font-mono w-8 shrink-0 text-xs" :class="phrase.phrase_role === 'use' ? 'text-emerald-400/70' : phrase.phrase_role === 'component' ? 'text-faint' : 'text-amber-400/70'">
                  {{ phrase.phrase_role === 'use' ? 'USE' : phrase.phrase_role === 'component' ? 'CMP' : 'BLD' }}
                </span>
                <GenderPairText class="text-ink" :text="phrase.known_text" :pair="genderPairFor(phrase.known_text)" />
                <span class="text-faint shrink-0">→</span>
                <span
                  class="text-muted"
                  :dir="dirFor(phrase.target_text)"
                  style="unicode-bidi: isolate"
                >{{ phrase.target_text }}</span>
              </div>
            </div>
          </div>

          <!-- Approve / Redo controls -->
          <div class="mt-4 pt-4 border-t border-line/50 flex gap-3 items-start">
            <textarea
              v-model="seedReviewNotes"
              placeholder="Notes for redo (optional)..."
              rows="2"
              class="flex-1 bg-surface/80 border border-line rounded text-sm text-ink placeholder-faint px-3 py-2 resize-none"
            />
            <button
              @click="redoSeed"
              :disabled="seedRedoing"
              class="px-4 py-2 bg-orange-600/20 border border-orange-500/50 text-orange-400 hover:border-orange-400/70 disabled:opacity-50 text-sm font-medium rounded transition-all shrink-0"
            >{{ seedRedoing ? 'Sending...' : 'Redo' }}</button>
            <button
              @click="undoRedo"
              :disabled="seedUndoing"
              title="Restore the decomposition the last redo replaced"
              class="px-4 py-2 bg-sky-600/20 border border-sky-500/50 text-sky-400 hover:border-sky-400/70 disabled:opacity-50 text-sm font-medium rounded transition-all shrink-0"
            >{{ seedUndoing ? 'Restoring...' : 'Undo redo' }}</button>
            <button
              @click="approveSeed"
              :disabled="seedApproving"
              class="px-4 py-2 bg-emerald-600/20 border border-emerald-500/50 text-emerald-400 hover:border-emerald-400/70 disabled:opacity-50 text-sm font-medium rounded transition-all shrink-0"
            >{{ seedApproving ? 'Approving...' : 'Approve' }}</button>
          </div>
        </div>
      </section>


    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { getApiUrl, fetchJson } from '@/services/api'
import { dirFor } from '@/utils/textDirection.js'
import { useBuildMonitor } from '@/composables/useBuildMonitor'
import { isConfigured as isSupabaseConfigured, getCourseProgress, getSeedGrid as sbGetSeedGrid, getSeedDetail, getKnownGenderPairs } from '@/services/supabase'
import GenderPairText from '@/components/production/GenderPairText.vue'

const router = useRouter()

const props = defineProps({
  courseCode: {
    type: String,
    default: 'new'
  }
})

// Create mode detection
const isCreateMode = computed(() => props.courseCode === 'new')

// Language selection state
const knownLanguage = ref('')
const targetLanguage = ref('')
const languages = ref([])
const languagesLoading = ref(true)
const creatingCourse = ref(false)

// Computed course code from language selection
const computedCourseCode = computed(() => {
  if (!knownLanguage.value || !targetLanguage.value) return ''
  return `${targetLanguage.value}_for_${knownLanguage.value}`
})

// Effective course code (from prop or computed)
const effectiveCourseCode = computed(() => {
  return isCreateMode.value ? computedCourseCode.value : props.courseCode
})

// Configuration
const seedCount = ref(300)

const courseSizes = [
  { seeds: 300, label: 'MVP' },
  { seeds: 668, label: 'Full' }
]

// Progress state — derived from DB counts, no build_jobs
const progress = ref({
  currentSeed: 0,
  seedsTranslated: 0,
  totalSeeds: 0,
  legosInserted: 0,
  phrasesInserted: 0,
  genderExpansions: 0
})

// Agent tracking state
const agents = ref({
  running: [],
  running_count: 0,
  total_tracked: 0
})

// Chat state
const chatExpanded = ref(false)

// Fast-poll (5s) when chat is open so messages feel responsive
watch(chatExpanded, (open) => buildMonitor.setFastPolling(open))
const chatInput = ref('')
const chatSending = ref(false)
const chatClearedAt = ref(localStorage.getItem('chat_cleared_at') || null)
const chatScrollEl = ref(null)

// Orchestrator messages (used for chat display)
const orchestratorMessages = ref([])

// Starting state (optimistic UI while API call in flight)
const translateStarting = ref(false)
const translateSpawned = ref(false)
const translateResetting = ref(false)
const buildTeamStarting = ref(false)
const buildTeamSpawned = ref(false)
const finalPassStarting = ref(false)
const finalPassSpawned = ref(false)

// Activity tracking — detect when counts are changing (agent is working)
const lastSeedChangeAt = ref(null)    // timestamp of last decomposed_at count change
const lastTranslateChangeAt = ref(null) // timestamp of last seedsTranslated change
const lastProgressMessageAt = ref(null) // timestamp of latest system progress message
let statsBaselineSet = false           // skip first update (initial load isn't "activity")
const now = ref(Date.now())
let tickInterval = null
const massApproving = ref(false)
const genderStarting = ref(false)
const genderSpawned = ref(false)
const backfillPhrasesStarting = ref(false)
const backfillPhrasesSpawned = ref(false)
const componentCheckLoading = ref(false)
const componentBackfillStarting = ref(false)
const componentBackfillSpawned = ref(false)
const componentGaps = ref(null) // null = not checked yet, object = { total_m_legos, gaps: { total, null_components, empty_components, partial_components }, complete }

const zutCheckLoading = ref(false)
const zutResolveStarting = ref(false)
const zutResolveSpawned = ref(false)
const zutCollisions = ref(null) // null = not checked; object = { collisions: { total, items }, complete }
let zutResolveSpawnedMsgCount = 0
const actionError = ref(null) // { message, timestamp } — auto-dismisses after 8s
let actionErrorTimer = null
function showActionError(msg) {
  actionError.value = { message: msg, timestamp: Date.now() }
  if (actionErrorTimer) clearTimeout(actionErrorTimer)
  actionErrorTimer = setTimeout(() => { actionError.value = null }, 8000)
}

// Seed grid state
const seedGrid = ref([])
const seedGridExpanded = ref(true)

// Known-side gender pairs (male/female speaker wordings of the same cue).
// Loaded once per course, in one batched read; empty for ungendered courses.
const genderPairs = ref(new Map())
const genderPairSeeds = ref(new Set())
let genderPairsCourse = null
async function loadGenderPairs() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode || courseCode === genderPairsCourse || !isSupabaseConfigured()) return
  genderPairsCourse = courseCode
  try {
    const { pairs, seeds } = await getKnownGenderPairs(courseCode)
    genderPairs.value = pairs
    genderPairSeeds.value = seeds
  } catch (err) {
    console.warn('Failed to load known-side gender pairs:', err)
    genderPairs.value = new Map()
    genderPairSeeds.value = new Set()
  }
}
// Both speaker wordings for a known text, or null when it has no pair
function genderPairFor(text) {
  return (text && genderPairs.value.get(text)) || null
}

// Build monitor — direct Supabase reads + Realtime (replaces HTTP polling)
const buildMonitor = useBuildMonitor(effectiveCourseCode)

// Sync buildMonitor data into existing component state
watch(buildMonitor.stats, (s) => {
  if (!s) return
  const totalSeeds = progress.value.totalSeeds || seedCount.value
  const prevSeeds = progress.value.currentSeed || 0
  const prevTranslated = progress.value.seedsTranslated || 0
  progress.value = {
    ...progress.value,
    currentSeed: s.completeSeeds || 0,
    seedsTranslated: s.seedsTranslated ?? 0,
    genderExpansions: s.genderExpansions || 0,
    legosInserted: s.legos || 0,
    phrasesInserted: s.practicePhrases || 0,
    totalSeeds
  }
  // Track when counts change — this means an agent is actively working
  // Skip the first update (initial load from DB isn't real activity)
  if (!statsBaselineSet) {
    statsBaselineSet = true
    return
  }
  if ((s.completeSeeds || 0) > prevSeeds) {
    lastSeedChangeAt.value = Date.now()
    buildTeamSpawned.value = false
  }
  if ((s.seedsTranslated || 0) > prevTranslated) {
    lastTranslateChangeAt.value = Date.now()
    translateSpawned.value = false
  }
}, { deep: true })

let prevUnderThreshold = null
let prevDrafted = null
watch(buildMonitor.seedGrid, (grid) => {
  if (grid && grid.length > 0) {
    seedGrid.value = grid
    const ut = grid.filter(s => s.status === 'under-threshold').length
    const drafted = grid.filter(s => s.status === 'drafted').length
    if (prevUnderThreshold !== null && ut < prevUnderThreshold) {
      backfillPhrasesSpawned.value = false
    }
    if (prevDrafted !== null && drafted < prevDrafted) {
      finalPassSpawned.value = false
    }
    prevUnderThreshold = ut
    prevDrafted = drafted
  }
}, { deep: true })

let componentBackfillSpawnedMsgCount = 0
let genderSpawnedMsgCount = 0
watch(buildMonitor.messages, (msgs) => {
  if (msgs && msgs.length > 0) {
    orchestratorMessages.value = msgs
    // Track latest system progress message for activity detection
    const systemMsgs = msgs.filter(m => m.direction === 'agent_to_human' && m.metadata?.source === 'system')
    if (systemMsgs.length > 0) {
      const latest = systemMsgs[systemMsgs.length - 1]
      const latestTime = new Date(latest.created_at).getTime()
      if (!lastProgressMessageAt.value || latestTime > lastProgressMessageAt.value) {
        lastProgressMessageAt.value = latestTime
      }
    }
    // Reset spawned flags once agent posts a follow-up message (beyond the spawn confirmation)
    if (componentBackfillSpawned.value && msgs.length > componentBackfillSpawnedMsgCount + 1) {
      componentBackfillSpawned.value = false
    }
    if (genderSpawned.value && msgs.length > genderSpawnedMsgCount + 1) {
      genderSpawned.value = false
    }
  }
}, { deep: true })

// Seed grid phrase viewer state
const selectedSeed = ref(null)
const seedViewPhrases = ref([])
const seedViewSeedText = ref(null)
const seedViewLoading = ref(false)
const seedReviewNotes = ref('')
const seedApproving = ref(false)
const seedRedoing = ref(false)
const seedUndoing = ref(false)
const redoingFlagged = ref(false)

const seedGridFinalized = computed(() => seedGrid.value.filter(s => s.status === 'complete').length)
const seedGridDrafted = computed(() => seedGrid.value.filter(s => s.status === 'drafted').length)
const seedGridCollision = computed(() => seedGrid.value.filter(s => s.status === 'collision' || s.status === 'rework').length)
const seedGridFlagged = computed(() => seedGrid.value.filter(s => s.status === 'flagged').length)
const seedGridUnderThreshold = computed(() => seedGrid.value.filter(s => s.status === 'under-threshold').length)

// Group seeds into rows of blocks (each block = 10 seeds, max 3 blocks per row = 30 seeds)

// --- Pipeline computeds ---

// Denominator for the Translate stage — the course's own seed count,
// falling back to the selected target size (never a hard-coded canon size).
const translateTotal = computed(() => progress.value.totalSeeds || seedCount.value)

const translatePercent = computed(() => {
  const total = translateTotal.value || 1
  return Math.round(((progress.value.seedsTranslated || 0) / total) * 100)
})

const buildPercent = computed(() => {
  if (seedCount.value <= 0) return 0
  return Math.round(((progress.value.currentSeed || 0) / seedCount.value) * 100)
})

const pipelinePhase = computed(() => {
  if (!stageComplete('translate')) return 'translate'
  if (!stageComplete('build-team')) return 'build-team'
  if (!stageComplete('final-pass')) return 'final-pass'
  return 'gender'
})

// Languages where Gender Prep is KNOWN to be needed (recommendation only —
// the stage is shown for every course and works for any language; this list
// must never hide or exclude the stage for unlisted gendered languages).
const GENDER_PREP_RECOMMENDED_LANGUAGES = ['spa', 'ita', 'por', 'fra', 'ara', 'bre']
const courseTargetLang = computed(() => {
  // In create mode, use the dropdown; for existing courses, extract from course code (e.g. "spa_for_eng" → "spa")
  if (targetLanguage.value) return targetLanguage.value
  const code = effectiveCourseCode.value
  if (code && code.includes('_for_')) return code.split('_for_')[0].split('_')[0]
  return ''
})
const genderPrepRecommended = computed(() => GENDER_PREP_RECOMMENDED_LANGUAGES.includes(courseTargetLang.value))

// --- Activity detection — is an agent actively working? ---

const ACTIVE_THRESHOLD_MS = 300000 // 5 minutes — if no change in 5 min, consider idle

function secondsSince(timestamp) {
  if (!timestamp) return null
  return Math.floor((now.value - timestamp) / 1000)
}

function formatSecondsAgo(secs) {
  if (secs === null) return ''
  if (secs < 60) return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  return `${Math.floor(secs / 3600)}h ago`
}

// Is any background process active? (audio gen, presentation regen, gender prep, etc.)
// Based on system progress messages in orchestrator_messages
const processActive = computed(() => {
  const secs = secondsSince(lastProgressMessageAt.value)
  return secs !== null && secs * 1000 < ACTIVE_THRESHOLD_MS
})

// Latest process update message text (for display)
const latestProcessMessage = computed(() => {
  const systemMsgs = orchestratorMessages.value.filter(m => m.direction === 'agent_to_human' && m.metadata?.source === 'system')
  if (systemMsgs.length === 0) return null
  return systemMsgs[systemMsgs.length - 1].message
})

const buildActive = computed(() => {
  const secs = secondsSince(lastSeedChangeAt.value)
  return secs !== null && secs * 1000 < ACTIVE_THRESHOLD_MS
})

const translateActive = computed(() => {
  const secs = secondsSince(lastTranslateChangeAt.value)
  return secs !== null && secs * 1000 < ACTIVE_THRESHOLD_MS
})

const buildStale = computed(() => {
  const secs = secondsSince(lastSeedChangeAt.value)
  return secs !== null && secs * 1000 >= ACTIVE_THRESHOLD_MS
})

const translateStale = computed(() => {
  const secs = secondsSince(lastTranslateChangeAt.value)
  return secs !== null && secs * 1000 >= ACTIVE_THRESHOLD_MS
})

const buildLastActivity = computed(() => formatSecondsAgo(secondsSince(lastSeedChangeAt.value)))
const translateLastActivity = computed(() => formatSecondsAgo(secondsSince(lastTranslateChangeAt.value)))

// --- Build Team label logic ---

const buildTeamRemaining = computed(() => {
  const done = progress.value.currentSeed || 0
  const total = seedCount.value
  return Math.max(0, total - done)
})

const buildTeamButtonLabel = computed(() => {
  const remaining = buildTeamRemaining.value
  const done = progress.value.currentSeed || 0
  if (done === 0) return 'Start Build'
  return `Build ${remaining} remaining seed${remaining !== 1 ? 's' : ''}`
})

const buildTeamSubtitle = computed(() => {
  const done = progress.value.currentSeed || 0
  const total = seedCount.value
  const remaining = buildTeamRemaining.value
  if (stageLocked('build-team')) return 'Waiting for translations'
  if (stageComplete('build-team')) return `All ${total} seeds built`
  if (buildActive.value) return `Building — ${done}/${total} seeds, ${remaining} remaining`
  if (done === 0) return 'Creator/checker — Opus orchestrator'
  return `${remaining} of ${total} seeds still need building`
})

// --- Final Pass wizard logic (one action at a time) ---

const finalPassNextAction = computed(() => {
  const ut = seedGridUnderThreshold.value
  const flagged = seedGridFlagged.value
  const drafted = seedGridDrafted.value

  // Priority 1: backfill under-threshold seeds
  if (ut > 0) return {
    label: backfillPhrasesStarting.value ? 'Spawning...' : backfillPhrasesSpawned.value ? 'Agent working...' : `Backfill ${ut} seed${ut !== 1 ? 's' : ''}`,
    handler: startBackfillPhrases,
    disabled: backfillPhrasesStarting.value || backfillPhrasesSpawned.value,
    btnClass: 'bg-orange-600/20 border border-orange-500/50 text-orange-400 hover:border-orange-400/70'
  }

  // Priority 2: redo flagged seeds
  if (flagged > 0) return {
    label: redoingFlagged.value ? 'Spawning...' : `Redo ${flagged} flagged seed${flagged !== 1 ? 's' : ''}`,
    handler: redoAllFlagged,
    disabled: redoingFlagged.value,
    btnClass: 'bg-rose-600/20 border border-rose-500/50 text-rose-400 hover:border-rose-400/70'
  }

  // Priority 3: run final pass on drafted seeds
  if (drafted > 0) return {
    label: finalPassStarting.value ? 'Spawning...' : finalPassSpawned.value ? 'Agent working...' : `Review ${drafted} seed${drafted !== 1 ? 's' : ''}`,
    handler: () => startFinalPass('drafted'),
    disabled: finalPassStarting.value || finalPassSpawned.value,
    btnClass: 'bg-violet-600/20 border border-violet-500/50 text-violet-400 hover:border-violet-400/70'
  }

  // Priority 5: approve remaining
  if (seedGridFinalized.value < seedGrid.value.length && seedGrid.value.length > 0) return {
    label: massApproving.value ? 'Approving...' : 'Approve all seeds',
    handler: massApproveSeeds,
    disabled: massApproving.value,
    btnClass: 'bg-emerald-600/20 border border-emerald-500/50 text-emerald-400 hover:border-emerald-400/70'
  }

  return { label: 'Done', handler: () => {}, disabled: true, btnClass: '' }
})

// Approve button — shown alongside Review when there are drafted seeds and no blockers
const finalPassApproveAction = computed(() => {
  const ut = seedGridUnderThreshold.value
  const flagged = seedGridFlagged.value
  const drafted = seedGridDrafted.value
  if (ut > 0 || flagged > 0 || drafted === 0) return null
  return {
    label: massApproving.value ? 'Approving...' : `Approve ${drafted}`,
    handler: massApproveSeeds,
    disabled: massApproving.value,
    btnClass: 'bg-emerald-600/20 border border-emerald-500/50 text-emerald-400 hover:border-emerald-400/70'
  }
})

const finalPassSubtitle = computed(() => {
  const ut = seedGridUnderThreshold.value
  const flagged = seedGridFlagged.value
  const drafted = seedGridDrafted.value
  const finalized = seedGridFinalized.value

  if (stageLocked('final-pass')) return 'Waiting for Build Team to finish'
  if (stageComplete('final-pass')) return `All ${finalized} seeds approved`
  if (ut > 0) return `${ut} seed${ut !== 1 ? 's have' : ' has'} LEGOs with too few phrases — backfill first`
  if (flagged > 0) return `${flagged} seed${flagged !== 1 ? 's' : ''} failed grammar review — need rebuilding`
  const finalPassDone = buildMonitor.pipeline.value?.finalPassCompleted
  if (drafted > 0 && finalPassDone) return `Review complete — ${drafted} seed${drafted !== 1 ? 's' : ''} ready to approve`
  if (drafted > 0) return `${drafted} seed${drafted !== 1 ? 's' : ''} ready for grammar review`
  return 'Review and approve all seeds'
})

const finalPassSummary = computed(() => {
  const ut = seedGridUnderThreshold.value
  const flagged = seedGridFlagged.value
  const drafted = seedGridDrafted.value
  const finalized = seedGridFinalized.value
  const parts = []
  if (finalized > 0) parts.push(`${finalized} approved`)
  if (drafted > 0) parts.push(`${drafted} drafted`)
  if (ut > 0) parts.push(`${ut} need phrases`)
  if (flagged > 0) parts.push(`${flagged} flagged`)
  return parts.join(' · ')
})

function stageComplete(stage) {
  // Data-driven: derive status from actual data, not build_jobs flags
  switch (stage) {
    case 'translate': return translateTotal.value > 0 && (progress.value.seedsTranslated || 0) >= translateTotal.value
    case 'build-team': return (progress.value.currentSeed || 0) >= seedCount.value
    case 'final-pass': return seedGridFinalized.value > 0 && seedGridDrafted.value === 0 && seedGridFlagged.value === 0 && seedGridUnderThreshold.value === 0
    case 'gender': return (progress.value.genderExpansions || 0) > 0
    default: return false
  }
}

function stageLocked(stage) {
  switch (stage) {
    case 'translate': return false
    case 'build-team': return !stageComplete('translate')
    case 'final-pass': return !stageComplete('build-team')
    case 'gender': return !stageComplete('final-pass')
    default: return false
  }
}

function stageCardClass(stage) {
  if (stageLocked(stage)) return 'border-line/30 opacity-50'
  if (pipelinePhase.value === stage) return 'border-cyan-500/30'
  if (stageComplete(stage)) return 'border-emerald-500/20'
  return 'border-line/50'
}

function stageNumberClass(stage) {
  if (stageComplete(stage)) return 'bg-emerald-500/20 text-emerald-400'
  if (pipelinePhase.value === stage) return 'bg-cyan-500/20 text-cyan-400'
  if (stageLocked(stage)) return 'bg-surface-2/50 text-faint'
  return 'bg-surface-2/50 text-muted'
}

function seedCellClass(cell) {
  switch (cell.status) {
    case 'flagged':
      return 'bg-rose-500/70 ring-1 ring-inset ring-rose-400'
    case 'under-threshold':
      return 'bg-orange-400/70 ring-1 ring-inset ring-orange-300'
    case 'collision':
    case 'rework':
      return 'bg-rose-500/60 ring-1 ring-inset ring-rose-400'
    case 'complete':
      return 'bg-emerald-500/80'
    case 'decomposed':
      return 'bg-cyan-500/60'
    case 'drafted':
      return 'bg-amber-400/70'
    case 'building':
      return 'bg-indigo-400/60'
    default:
      return 'bg-surface-2/30'
  }
}

// Computed
const ratio = computed(() => {
  if (!progress.value.legosInserted) return '0.0'
  return (progress.value.phrasesInserted / progress.value.legosInserted).toFixed(1)
})

const ratioClass = computed(() => {
  const r = parseFloat(ratio.value)
  if (r >= 7) return 'text-emerald-400'
  if (r >= 5) return 'text-yellow-400'
  return 'text-ink'
})

const qualityScoreClass = computed(() => {
  const score = parseFloat(progress.value.avgPhraseScore)
  if (isNaN(score)) return 'text-muted'
  if (score >= 7.5) return 'text-emerald-400'
  if (score >= 6.5) return 'text-cyan-400'
  if (score >= 5.5) return 'text-yellow-400'
  return 'text-orange-400'
})

// Chat computeds
const orchestratorHasPending = computed(() =>
  orchestratorMessages.value.some(m => m.direction === 'agent_to_human' && m.status === 'pending')
)

const visibleChatMessages = computed(() => {
  if (!chatClearedAt.value) return orchestratorMessages.value
  return orchestratorMessages.value.filter(m => m.created_at > chatClearedAt.value)
})

const unreadChatCount = computed(() => visibleChatMessages.value.length)

// Methods
async function fetchProgress() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode) return

  try {
    if (isSupabaseConfigured()) {
      const statsData = await getCourseProgress(courseCode)
      const totalSeeds = statsData.seeds || seedCount.value
      progress.value = {
        ...progress.value,
        currentSeed: statsData.completedSeeds ?? 0,
        seedsTranslated: statsData.completedSeeds ?? 0,
        genderExpansions: 0,
        totalSeeds: totalSeeds,
        legosInserted: statsData.legos || 0,
        phrasesInserted: statsData.phrases || 0
      }
    } else {
      const apiBase = getApiUrl()
      const statsResponse = await fetch(`${apiBase}/api/stats/${courseCode}`, { headers: { 'ngrok-skip-browser-warning': 'true' } })
      if (statsResponse.ok) {
        const data = await statsResponse.json()
        const totalSeeds = data.total_seeds || seedCount.value
        progress.value = {
          ...progress.value,
          currentSeed: data.seeds_with_legos ?? 0,
          seedsTranslated: data.completed_seeds ?? data.seeds_translated ?? 0,
          genderExpansions: data.gender_expansions || 0,
          totalSeeds: totalSeeds,
          legosInserted: data.legos || 0,
          phrasesInserted: data.phrases || 0
        }
      }
    }

    fetchSeedGrid()
  } catch (error) {
    console.error('Failed to fetch progress:', error)
  }
}

async function fetchSeedGrid() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode) return
  try {
    if (isSupabaseConfigured()) {
      seedGrid.value = await sbGetSeedGrid(courseCode)
    } else {
      const apiBase = getApiUrl()
      const response = await fetch(`${apiBase}/api/build/seed-grid/${courseCode}`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      })
      if (response.ok) {
        const data = await response.json()
        seedGrid.value = data.seeds || []
      }
    }
  } catch (err) {
    console.error('Failed to fetch seed grid:', err)
  }
}

async function createCourse() {
  const courseCode = computedCourseCode.value
  if (!courseCode) return

  creatingCourse.value = true
  try {
    const apiBase = getApiUrl()
    const response = await fetch(`${apiBase}/api/courses/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        courseCode,
        knownLanguage: knownLanguage.value,
        targetLanguage: targetLanguage.value,
        seedStart: 1,
        seedEnd: seedCount.value,
        seedCount: seedCount.value
      })
    })
    if (!response.ok) throw new Error((await response.clone().json().catch(() => ({}))).error || `HTTP ${response.status}`)
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'Failed to create course')
    router.push(`/production/${courseCode}/text`)
  } catch (error) {
    console.error('Failed to create course:', error)
    alert(`Failed to create course: ${error.message}`)
  } finally {
    creatingCourse.value = false
  }
}

async function startTranslation() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode) return

  translateStarting.value = true
  try {
    const apiBase = getApiUrl()
    const result = await fetchJson(`${apiBase}/api/build/translate/${courseCode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }
    })
    if (result.ok) {
      translateSpawned.value = true
      buildMonitor.refresh()
    } else {
      showActionError(`Translation failed: ${result.error}`)
    }
  } catch (err) {
    showActionError(`Translation failed: ${err.message}`)
  } finally {
    translateStarting.value = false
  }
}

async function confirmResetTranslations() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode) return

  const ok = window.confirm(
    `This will wipe all existing translations for ${courseCode}.\n\nYou will need to re-translate all seeds. Continue?`
  )
  if (!ok) return

  translateResetting.value = true
  try {
    const apiBase = getApiUrl()
    const result = await fetchJson(`${apiBase}/api/course/${courseCode}/reset-translations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }
    })
    if (result.ok) {
      console.log(`[reset] Wiped ${result.seeds_reset} translations for ${courseCode}`)
      buildMonitor.refresh()
    } else {
      showActionError(`Reset translations failed: ${result.error}`)
    }
  } catch (err) {
    showActionError(`Reset translations failed: ${err.message}`)
  } finally {
    translateResetting.value = false
  }
}

async function startBuildTeam() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode) return

  buildTeamStarting.value = true
  try {
    const apiBase = getApiUrl()
    const result = await fetchJson(`${apiBase}/api/build/team-start/${courseCode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      body: JSON.stringify({ targetSeeds: seedCount.value })
    })
    if (result.ok) {
      buildTeamSpawned.value = true
      buildMonitor.refresh()
    } else {
      showActionError(`Build team failed: ${result.error}`)
    }
  } catch (err) {
    showActionError(`Build team failed: ${err.message}`)
  } finally {
    buildTeamStarting.value = false
  }
}

async function startFinalPass(mode = 'all') {
  const courseCode = effectiveCourseCode.value
  if (!courseCode) return

  finalPassStarting.value = true
  try {
    const apiBase = getApiUrl()
    let url = `${apiBase}/api/build/final-pass/${courseCode}`

    // If targeting drafted seeds only, pass their seed numbers
    if (mode === 'drafted') {
      const draftedSeeds = seedGrid.value
        .filter(s => s.status === 'drafted')
        .map(s => s.seed)
      if (draftedSeeds.length > 0) {
        url += `?seeds=${draftedSeeds.join(',')}`
      }
    }

    const result = await fetchJson(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }
    })
    if (result.ok) {
      finalPassSpawned.value = true
      buildMonitor.refresh()
    } else {
      showActionError(`Final pass failed: ${result.error}`)
    }
  } catch (err) {
    showActionError(`Final pass failed: ${err.message}`)
  } finally {
    finalPassStarting.value = false
  }
}

async function massApproveSeeds() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode) return

  massApproving.value = true
  try {
    const apiBase = getApiUrl()
    const result = await fetchJson(`${apiBase}/api/build/mass-approve/${courseCode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }
    })
    if (result.ok) {
      // Refresh the seed grid
      const data = await fetchJson(`${apiBase}/api/build/seed-grid/${courseCode}`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      })
      seedGrid.value = data.seeds || []
    } else {
      showActionError(`Mass approve failed: ${result.error}`)
    }
  } catch (err) {
    showActionError(`Mass approve failed: ${err.message}`)
  } finally {
    massApproving.value = false
  }
}

const componentCardClass = computed(() => {
  if (componentGaps.value !== null && componentGaps.value.complete) return 'border-emerald-500/20'
  if (componentGaps.value !== null && !componentGaps.value.complete) return 'border-teal-500/30'
  return 'border-line/50'
})

const componentNumberClass = computed(() => {
  if (componentGaps.value !== null && componentGaps.value.complete) return 'bg-emerald-500/20 text-emerald-400'
  return 'bg-surface-2/50 text-muted'
})

async function checkComponentGaps() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode) return

  componentCheckLoading.value = true
  try {
    const apiBase = getApiUrl()
    const data = await fetchJson(`${apiBase}/api/build/component-gaps/${courseCode}`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    componentGaps.value = data
  } catch (err) {
    console.error('Failed to check component gaps:', err)
  } finally {
    componentCheckLoading.value = false
  }
}

async function startComponentBackfill() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode) return

  componentBackfillStarting.value = true
  try {
    const apiBase = getApiUrl()
    const result = await fetchJson(`${apiBase}/api/build/component-backfill/${courseCode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }
    })
    if (result.ok) {
      componentBackfillSpawnedMsgCount = orchestratorMessages.value.length
      componentBackfillSpawned.value = true
      buildMonitor.refresh()
    } else {
      showActionError(`Component backfill failed: ${result.error}`)
    }
  } catch (err) {
    showActionError(`Component backfill failed: ${err.message}`)
  } finally {
    componentBackfillStarting.value = false
  }
}

async function checkZutCollisions() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode) return
  zutCheckLoading.value = true
  try {
    const apiBase = getApiUrl()
    const data = await fetchJson(`${apiBase}/api/build/zut-collisions/${courseCode}`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    zutCollisions.value = data
  } catch (err) {
    console.error('Failed to check ZUT collisions:', err)
  } finally {
    zutCheckLoading.value = false
  }
}

async function startZutResolve() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode) return
  zutResolveStarting.value = true
  try {
    const apiBase = getApiUrl()
    const result = await fetchJson(`${apiBase}/api/build/zut-resolve/${courseCode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }
    })
    if (result.ok) {
      zutResolveSpawnedMsgCount = orchestratorMessages.value.length
      zutResolveSpawned.value = true
      buildMonitor.refresh()
    } else {
      showActionError(`ZUT resolve failed: ${result.error}`)
    }
  } catch (err) {
    showActionError(`ZUT resolve failed: ${err.message}`)
  } finally {
    zutResolveStarting.value = false
  }
}

const zutCardClass = computed(() => {
  if (zutCollisions.value !== null && zutCollisions.value.complete) return 'border-emerald-500/20'
  if (zutCollisions.value !== null && !zutCollisions.value.complete) return 'border-teal-500/30'
  return 'border-line/50'
})
const zutNumberClass = computed(() => {
  if (zutCollisions.value !== null && zutCollisions.value.complete) return 'bg-emerald-500/20 text-emerald-400'
  return 'bg-surface-2/50 text-muted'
})

async function startBackfillPhrases() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode) return

  backfillPhrasesStarting.value = true
  try {
    const apiBase = getApiUrl()
    const result = await fetchJson(`${apiBase}/api/build/backfill-phrases/${courseCode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }
    })
    if (result.ok) {
      backfillPhrasesSpawned.value = true
      buildMonitor.refresh()
    } else {
      showActionError(`Backfill failed: ${result.error}`)
    }
  } catch (err) {
    showActionError(`Backfill failed: ${err.message}`)
  } finally {
    backfillPhrasesStarting.value = false
  }
}

async function startGenderPrep() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode) return

  genderStarting.value = true
  try {
    const apiBase = getApiUrl()
    const result = await fetchJson(`${apiBase}/api/production/${courseCode}/gender-prep/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }
    })
    if (result.ok !== false) {
      genderSpawnedMsgCount = orchestratorMessages.value.length
      genderSpawned.value = true
      buildMonitor.refresh()
    } else {
      showActionError(`Gender prep failed: ${result.error}`)
    }
  } catch (err) {
    showActionError(`Gender prep failed: ${err.message}`)
  } finally {
    genderStarting.value = false
  }
}


async function stopBuilder() {
  try {
    const apiBase = getApiUrl()
    await fetch(`${apiBase}/api/build/stop/${effectiveCourseCode.value}`, {
      method: 'POST',
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    progress.value.status = 'idle'
  } catch (error) {
    showActionError(`Failed to stop builder: ${error.message}`)
  }
}

async function forceResetBuilder() {
  try {
    const apiBase = getApiUrl()
    await fetch(`${apiBase}/api/build/stop/${effectiveCourseCode.value}`, {
      method: 'POST',
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
  } catch (error) {
    console.warn('Stop API call failed during force reset:', error)
  }

  stopPolling()
  progress.value = {
    status: 'idle',
    currentSeed: progress.value.currentSeed,
    totalSeeds: progress.value.totalSeeds,
    legosInserted: progress.value.legosInserted,
    phrasesInserted: progress.value.phrasesInserted,
    avgPhraseScore: progress.value.avgPhraseScore,
    scoredPhrases: progress.value.scoredPhrases
  }
  startPolling()
}

async function killAgent(pid) {
  try {
    const apiBase = getApiUrl()
    const result = await fetchJson(`${apiBase}/api/agents/${pid}`, {
      method: 'DELETE',
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    if (result.ok) {
      fetchProgress()
    }
  } catch (error) {
    showActionError(`Failed to kill agent: ${error.message}`)
  }
}

// Seed grid phrase viewer
async function selectSeed(seedNum) {
  const courseCode = effectiveCourseCode.value
  if (selectedSeed.value === seedNum) {
    selectedSeed.value = null
    seedViewPhrases.value = []
    seedViewSeedText.value = null
    return
  }
  selectedSeed.value = seedNum
  seedViewPhrases.value = []
  seedViewSeedText.value = null
  seedViewLoading.value = true
  try {
    if (isSupabaseConfigured()) {
      const detail = await getSeedDetail(courseCode, seedNum)
      if (detail.seed) {
        seedViewSeedText.value = { known_text: detail.seed.known_text, target_text: detail.seed.target_text }
      }
      const legoMeta = {}
      for (const l of detail.legos) legoMeta[l.lego_index] = l
      const legoMap = new Map()
      for (const p of detail.phrases) {
        const key = p.lego_index ?? 0
        if (!legoMap.has(key)) legoMap.set(key, { lego_index: key, meta: legoMeta[key] || null, phrases: [] })
        legoMap.get(key).phrases.push(p)
      }
      for (const [idx, meta] of Object.entries(legoMeta)) {
        if (!legoMap.has(parseInt(idx))) legoMap.set(parseInt(idx), { lego_index: parseInt(idx), meta, phrases: [] })
      }
      seedViewPhrases.value = [...legoMap.values()].sort((a, b) => a.lego_index - b.lego_index)
    } else {
      const apiBase = getApiUrl()
      const h = { 'ngrok-skip-browser-warning': 'true' }
      const [legosResp, phrasesResp, seedsResp] = await Promise.all([
        fetch(`${apiBase}/api/legos/${courseCode}?seed=${seedNum}`, { headers: h }),
        fetch(`${apiBase}/api/phrases/${courseCode}?seed_min=${seedNum}&seed_max=${seedNum}&limit=300`, { headers: h }),
        fetch(`${apiBase}/api/seeds/${courseCode}?offset=${seedNum - 1}&limit=1`, { headers: h })
      ])
      if (seedsResp.ok) {
        const sd = await seedsResp.json()
        const seed = (sd.seeds || []).find(s => s.seed_number === seedNum)
        if (seed) seedViewSeedText.value = { known_text: seed.known_text, target_text: seed.target_text }
      }
      const legoMeta = {}
      if (legosResp.ok) {
        const d = await legosResp.json()
        for (const l of (d.legos || [])) legoMeta[l.lego_index] = l
      }
      if (phrasesResp.ok) {
        const data = await phrasesResp.json()
        const legoMap = new Map()
        for (const p of (data.phrases || [])) {
          const key = p.lego_index ?? 0
          if (!legoMap.has(key)) legoMap.set(key, { lego_index: key, meta: legoMeta[key] || null, phrases: [] })
          legoMap.get(key).phrases.push(p)
        }
        for (const [idx, meta] of Object.entries(legoMeta)) {
          if (!legoMap.has(parseInt(idx))) legoMap.set(parseInt(idx), { lego_index: parseInt(idx), meta, phrases: [] })
        }
        seedViewPhrases.value = [...legoMap.values()].sort((a, b) => a.lego_index - b.lego_index)
      }
    }
  } catch (err) {
    console.error('Failed to fetch seed phrases:', err)
  } finally {
    seedViewLoading.value = false
  }
}

// Approve / Redo seed — posts to chat endpoint, server finds & responds to pending agent message
async function approveSeed() {
  const courseCode = effectiveCourseCode.value
  const seedNum = selectedSeed.value
  if (!courseCode || !seedNum) return
  seedApproving.value = true
  try {
    const apiBase = getApiUrl()
    await fetch(`${apiBase}/api/orchestrator/chat/${courseCode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      body: JSON.stringify({ role: 'human', message: `Approved seed ${seedNum}`, action: 'approve', metadata: { seed_number: seedNum } })
    })
    seedReviewNotes.value = ''
    selectedSeed.value = null
    seedViewPhrases.value = []
    seedViewSeedText.value = null
    await Promise.all([buildMonitor.refresh(), fetchSeedGrid()])
    // Auto-select next amber (drafted) seed
    const nextDrafted = seedGrid.value.find(s => s.status === 'drafted')
    if (nextDrafted) selectSeed(nextDrafted.seed)
  } catch (err) {
    showActionError(`Failed to approve seed: ${err.message}`)
  } finally {
    seedApproving.value = false
  }
}

async function redoSeed() {
  const courseCode = effectiveCourseCode.value
  const seedNum = selectedSeed.value
  if (!courseCode || !seedNum) return
  seedRedoing.value = true
  try {
    const apiBase = getApiUrl()
    const notes = seedReviewNotes.value.trim()
    await fetch(`${apiBase}/api/build/redo/${courseCode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      body: JSON.stringify({ seeds: [seedNum], notes })
    })
    seedReviewNotes.value = ''
    selectedSeed.value = null
    seedViewPhrases.value = []
    seedViewSeedText.value = null
    const cell = seedGrid.value.find(s => s.seed === seedNum)
    if (cell) cell.status = 'building'
    await Promise.all([buildMonitor.refresh(), fetchSeedGrid()])
    const nextDrafted = seedGrid.value.find(s => s.status === 'drafted')
    if (nextDrafted) selectSeed(nextDrafted.seed)
    seedRedoing.value = false
  } catch (err) {
    showActionError(`Failed to redo seed: ${err.message}`)
    seedRedoing.value = false
  }
}

// Undo the last redo on this seed: restore the decomposition snapshotted just
// before the redo deleted it. Errors clearly if the seed was redone before
// snapshots existed (no snapshot = nothing to restore).
async function undoRedo() {
  const courseCode = effectiveCourseCode.value
  const seedNum = selectedSeed.value
  if (!courseCode || !seedNum) return
  seedUndoing.value = true
  try {
    const apiBase = getApiUrl()
    const resp = await fetch(`${apiBase}/api/build/redo-undo/${courseCode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      body: JSON.stringify({ seed: seedNum })
    })
    const body = await resp.json().catch(() => ({}))
    if (!body.ok) {
      showActionError(`Undo failed: ${body.error || resp.status}`)
      return
    }
    await Promise.all([buildMonitor.refresh(), fetchSeedGrid()])
    await selectSeed(seedNum)
  } catch (err) {
    showActionError(`Failed to undo redo: ${err.message}`)
  } finally {
    seedUndoing.value = false
  }
}

async function redoAllFlagged() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode) return
  const flaggedSeeds = seedGrid.value.filter(s => s.status === 'flagged').map(s => s.seed)
  if (flaggedSeeds.length === 0) return
  redoingFlagged.value = true
  try {
    const apiBase = getApiUrl()
    await fetch(`${apiBase}/api/build/redo/${courseCode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      body: JSON.stringify({ seeds: flaggedSeeds, notes: 'Redo all flagged seeds' })
    })
    // Optimistically mark all flagged as building
    for (const s of seedGrid.value) {
      if (s.status === 'flagged') s.status = 'building'
    }
    await Promise.all([buildMonitor.refresh(), fetchSeedGrid()])
  } catch (err) {
    showActionError(`Failed to redo flagged seeds: ${err.message}`)
  } finally {
    redoingFlagged.value = false
  }
}

// Chat functions
function clearChat() {
  const now = new Date().toISOString()
  chatClearedAt.value = now
  localStorage.setItem('chat_cleared_at', now)
}

async function sendChat() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode || !chatInput.value.trim()) return
  chatSending.value = true
  const text = chatInput.value.trim()
  try {
    const apiBase = getApiUrl()

    // Optimistically append message so it appears instantly
    orchestratorMessages.value = [...orchestratorMessages.value, {
      id: `optimistic-${Date.now()}`,
      direction: 'human_to_agent',
      _human: true,
      message: text,
      created_at: new Date().toISOString()
    }]
    chatInput.value = ''
    await nextTick()
    if (chatScrollEl.value) chatScrollEl.value.scrollTop = chatScrollEl.value.scrollHeight

    // Detect "redo seed N" or "redo seeds 1, 4, 17" patterns and route to redo endpoint
    const redoMatch = text.match(/^redo\s+seeds?\s+([\d,\s]+)/i)
    if (redoMatch) {
      const seedNums = redoMatch[1].split(/[,\s]+/).map(Number).filter(n => n > 0)
      if (seedNums.length > 0) {
        const notesMatch = text.match(/^redo\s+seeds?\s+[\d,\s]+[.:]?\s*(.*)/i)
        const notes = notesMatch?.[1]?.trim() || ''
        await fetch(`${apiBase}/api/build/redo/${courseCode}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
          body: JSON.stringify({ seeds: seedNums, notes })
        })
        // Optimistically update grid
        for (const s of seedGrid.value) {
          if (seedNums.includes(s.seed)) s.status = 'building'
        }
        await Promise.all([buildMonitor.refresh(), fetchSeedGrid()])
        return
      }
    }

    // "undo seed N" / "undo redo seed N" — restore the decomposition the last
    // redo replaced, from the snapshot taken before it was deleted.
    const undoMatch = text.match(/^undo\s+(?:redo\s+)?seeds?\s+([\d,\s]+)/i)
    if (undoMatch) {
      const seedNums = undoMatch[1].split(/[,\s]+/).map(Number).filter(n => n > 0)
      if (seedNums.length > 0) {
        for (const seedNum of seedNums) {
          const resp = await fetch(`${apiBase}/api/build/redo-undo/${courseCode}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
            body: JSON.stringify({ seed: seedNum })
          })
          const body = await resp.json().catch(() => ({}))
          if (!body.ok) showActionError(`Undo failed for seed ${seedNum}: ${body.error || resp.status}`)
        }
        await Promise.all([buildMonitor.refresh(), fetchSeedGrid()])
        return
      }
    }

    await fetch(`${apiBase}/api/orchestrator/chat/${courseCode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      body: JSON.stringify({ role: 'human', message: text })
    })
    // Refresh to get server-assigned ID and pick up any agent response
    buildMonitor.refresh()
  } catch (err) {
    console.error('Failed to send chat:', err)
  } finally {
    chatSending.value = false
  }
}

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// Messages are now fetched exclusively via buildMonitor (Supabase direct).
// No separate HTTP endpoint needed.

// Polling — useBuildMonitor (Realtime + 30s fallback) when Supabase configured,
// otherwise fall back to HTTP polling via fetchProgress()
let httpFallbackInterval = null

function startPolling() {
  buildMonitor.start()
  // When Supabase isn't configured on the frontend, buildMonitor.start() is a no-op.
  // Fall back to HTTP polling via production-api.
  if (!isSupabaseConfigured()) {
    fetchProgress()
    httpFallbackInterval = setInterval(fetchProgress, 30000)
  }
}

function stopPolling() {
  buildMonitor.stop()
  if (httpFallbackInterval) {
    clearInterval(httpFallbackInterval)
    httpFallbackInterval = null
  }
}

// Load languages from API
async function loadLanguages() {
  languagesLoading.value = true
  try {
    const apiBase = getApiUrl()
    const response = await fetch(`${apiBase}/api/languages?tts=true&format=legacy`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    if (response.ok) {
      languages.value = await response.json()
    }
  } catch (error) {
    console.error('Failed to load languages:', error)
    languages.value = [
      { code: 'eng', name: 'English' },
      { code: 'deu', name: 'German' },
      { code: 'spa', name: 'Spanish' },
      { code: 'fra', name: 'French' },
      { code: 'zho', name: 'Chinese' },
      { code: 'jpn', name: 'Japanese' }
    ]
  } finally {
    languagesLoading.value = false
  }
}

// Lifecycle
onMounted(async () => {
  startPolling()
  if (!isCreateMode.value) {
    // Fetch seed grid and progress immediately (buildMonitor watcher may miss initial load)
    if (isSupabaseConfigured()) {
      fetchProgress()
      fetchSeedGrid()
      loadGenderPairs()
    }
    checkComponentGaps()
  }
  if (isCreateMode.value) {
    loadLanguages()
  }
  // Tick every 5s to update "Xs ago" displays
  tickInterval = setInterval(() => { now.value = Date.now() }, 5000)
})

onUnmounted(() => {
  stopPolling()
  if (tickInterval) { clearInterval(tickInterval); tickInterval = null }
})
</script>

<style scoped>
.text-generation {
  min-height: 100vh;
  background: var(--color-shadow, var(--surface));
}

.pipeline-card {
  background: rgba(30, 41, 59, 0.3);
  border: 1px solid;
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  transition: all 0.2s;
}

/* Light mode: the dark translucent fill above reads as a muddy grey on a
   white canvas. Use a true card surface with a visible border + subtle shadow
   so each pipeline card separates from the page. Dark mode untouched. */
:root[data-theme="light"] .pipeline-card {
  background: var(--surface);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
}

.stage-number {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 600;
  font-family: ui-monospace, monospace;
  flex-shrink: 0;
}

.stage-badge-complete {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  background: rgba(16, 185, 129, 0.2);
  color: rgb(52, 211, 153);
}
/* Light: emerald-400 text (#34d399) on a pale pill is ~1.4:1 — illegible.
   Deepen the fill + use a dark emerald ink (passes AA on the tinted pill). */
:root[data-theme="light"] .stage-badge-complete {
  background: rgba(5, 150, 105, 0.16);
  color: #065f46;
}

.stage-badge-locked {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  background: rgba(71, 85, 105, 0.3);
  color: rgb(148, 163, 184);
}
/* Light: slate-400 text (#94a3b8) on a pale slate pill is ~2.3:1 — fails.
   Use the muted token as ink on a faint surface tint. */
:root[data-theme="light"] .stage-badge-locked {
  background: rgba(71, 85, 105, 0.12);
  color: #334155;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.animate-pulse {
  animation: pulse 2s ease-in-out infinite;
}

.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: var(--color-graphite, var(--surface-3));
  border-radius: 3px;
}

/* Seed cell instant tooltip */
.seed-cell {
  position: relative;
}
.seed-cell::after {
  content: attr(data-seed);
  position: absolute;
  bottom: calc(100% + 4px);
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.6rem;
  font-family: ui-monospace, monospace;
  color: var(--ink);
  background: var(--surface);
  border: 1px solid rgba(100, 116, 139, 0.5);
  padding: 1px 4px;
  border-radius: 3px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.08s;
  z-index: 10;
}
.seed-cell:hover::after {
  opacity: 1;
}

/* Known-side gender pair: a corner dot on the cell, so a scan of the grid shows
   which cues have a male/female speaker wording. Status colours are untouched. */
.gender-pair-swatch,
.seed-cell.has-gender-pair {
  position: relative;
}
.gender-pair-swatch::before,
.seed-cell.has-gender-pair::before {
  content: '';
  position: absolute;
  top: 1px;
  right: 1px;
  width: 5px;
  height: 5px;
  border-radius: 9999px;
  background: rgb(232 121 249);
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.45);
  pointer-events: none;
}

/* ── LIGHT MODE status-text contrast ──
   Inline status pills/labels use bright Tailwind -400 (and a couple of -300)
   hues over very pale translucent (/20) fills. On a white card those texts run
   ~1.4–2.6:1 and fail WCAG AA. These light-scoped overrides deepen each to its
   -700 shade — same hue family, but >=4.5:1 on the pale fill / white card.
   Dark mode keeps the original -400/-300 utilities (these rules don't apply). */
:root[data-theme="light"] .text-emerald-400 { color: #047857 !important; }
:root[data-theme="light"] .text-blue-400    { color: #1d4ed8 !important; }
:root[data-theme="light"] .text-cyan-400,
:root[data-theme="light"] .text-cyan-300    { color: #0e7490 !important; }
:root[data-theme="light"] .text-violet-400  { color: #6d28d9 !important; }
:root[data-theme="light"] .text-amber-400   { color: #b45309 !important; }
:root[data-theme="light"] .text-teal-400    { color: #0f766e !important; }
:root[data-theme="light"] .text-rose-400    { color: #be123c !important; }
:root[data-theme="light"] .text-pink-400    { color: #be185d !important; }
:root[data-theme="light"] .text-orange-400  { color: #c2410c !important; }
:root[data-theme="light"] .text-indigo-400  { color: #4338ca !important; }
:root[data-theme="light"] .text-yellow-400  { color: #a16207 !important; }
:root[data-theme="light"] .text-red-400,
:root[data-theme="light"] .text-red-300     { color: #b91c1c !important; }

/* Light mode: section panels use bg-surface/30 (≈#f5f7f9) over the #eef2f6
   canvas with a 50%-alpha line border — ~1.04:1 fill separation and a barely
   visible edge. Make these panels a solid card surface with the full --line
   border so they read as distinct cards. Dark mode unaffected. */
:root[data-theme="light"] .bg-surface\/30 { background-color: var(--surface) !important; }
:root[data-theme="light"] .border-line\/50 { border-color: var(--line) !important; }
</style>
