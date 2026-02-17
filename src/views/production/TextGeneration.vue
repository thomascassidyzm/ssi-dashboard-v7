<template>
  <div class="text-generation">
    <div class="max-w-4xl mx-auto px-6 py-8 space-y-6">
      <!-- Language Selection (Create Mode) -->
      <section v-if="isCreateMode" class="bg-slate-800/30 border border-emerald-500/30 rounded-lg p-6">
        <h2 class="text-sm font-medium text-emerald-400 uppercase tracking-wide mb-4">New Course</h2>

        <div class="grid grid-cols-2 gap-6">
          <div>
            <label class="block text-xs text-slate-500 mb-2">Known Language (Learning FROM)</label>
            <select
              v-model="knownLanguage"
              class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="" disabled selected>{{ languagesLoading ? 'Loading...' : 'Select known language' }}</option>
              <option v-for="lang in languages" :key="lang.code" :value="lang.code">
                {{ lang.name }} ({{ lang.code }})
              </option>
            </select>
          </div>
          <div>
            <label class="block text-xs text-slate-500 mb-2">Target Language (Learning TO)</label>
            <select
              v-model="targetLanguage"
              class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
            <span class="text-slate-400">Course code:</span>
            <span class="text-emerald-400 font-mono ml-2">{{ computedCourseCode }}</span>
          </p>
          <button
            @click="createCourse"
            :disabled="creatingCourse"
            class="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-all"
          >
            {{ creatingCourse ? 'Creating...' : 'Create Course' }}
          </button>
        </div>
      </section>

      <!-- Config toolbar: target + engine in one compact row -->
      <section class="bg-slate-800/30 border border-slate-700/50 rounded-lg px-4 py-2">
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-2">
            <button
              v-for="size in courseSizes"
              :key="size.seeds"
              @click="seedCount = size.seeds"
              class="px-2.5 py-1 rounded border transition-all text-xs font-medium"
              :class="seedCount === size.seeds
                ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-400'
                : 'bg-slate-700/30 border-slate-600/50 text-slate-400 hover:border-slate-500/50'"
            >
              {{ size.label }}
            </button>
            <input
              v-model.number="seedCount"
              type="number"
              min="1"
              max="1000"
              class="w-16 px-2 py-1 rounded border bg-slate-700/50 border-slate-600/50 text-slate-200 text-xs text-center font-mono"
            />
          </div>
          <div class="flex items-center gap-1.5">
            <button
              v-for="engine in engines"
              :key="engine.id"
              @click="agentEngine = engine.id"
              class="px-2.5 py-1 rounded border transition-all text-xs font-medium"
              :class="agentEngine === engine.id
                ? 'bg-cyan-600/20 border-cyan-500/50 text-cyan-400'
                : 'bg-slate-700/30 border-slate-600/50 text-slate-400 hover:border-slate-500/50'"
            >
              {{ engine.label }}
            </button>
          </div>
        </div>
      </section>

      <!-- Course Stats Summary Bar -->
      <section v-if="progress.currentSeed > 0 || progress.legosInserted > 0" class="bg-slate-800/30 border border-slate-700/50 rounded-lg px-6 py-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-6">
            <div class="flex items-center gap-2">
              <span class="text-xs text-slate-500 uppercase">Seeds</span>
              <span class="text-sm font-mono font-semibold text-slate-200">{{ progress.currentSeed }}/{{ progress.totalSeeds || seedCount }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-slate-500 uppercase">LEGOs</span>
              <span class="text-sm font-mono font-semibold text-slate-200">{{ progress.legosInserted }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-slate-500 uppercase">Phrases</span>
              <span class="text-sm font-mono font-semibold text-slate-200">{{ progress.phrasesInserted.toLocaleString() }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-slate-500 uppercase">Ratio</span>
              <span class="text-sm font-mono font-semibold" :class="ratioClass">{{ ratio }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-slate-500 uppercase">Quality</span>
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
        <h2 class="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Pipeline</h2>

        <!-- Stage 1: Translate -->
        <div class="pipeline-card" :class="stageCardClass('translate')">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="stage-number" :class="stageNumberClass('translate')">1</span>
              <div>
                <div class="text-sm font-medium text-slate-200">Translate</div>
                <div class="text-xs text-slate-500">Pass 1: Seed translations</div>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-xs font-mono text-slate-300">{{ progress.seedsTranslated || 0 }}/{{ progress.totalSeeds || 668 }}</span>
              <span v-if="stageComplete('translate')" class="stage-badge-complete">Done</span>
              <button
                v-else-if="!translateRunning"
                @click="startTranslation"
                :disabled="translateStarting"
                class="px-3 py-1 bg-blue-600/20 border border-blue-500/50 text-blue-400 hover:border-blue-400/70 disabled:opacity-50 text-xs font-medium rounded-lg transition-all"
              >
                {{ translateStarting ? 'Spawning...' : 'Start Translate' }}
              </button>
              <span v-if="translateRunning" class="text-xs text-blue-400 animate-pulse">Running...</span>
            </div>
          </div>
          <div class="mt-2 h-1 bg-slate-700/50 rounded-full overflow-hidden">
            <div class="h-full rounded-full bg-blue-500 transition-all duration-500" :style="{ width: `${translatePercent}%` }"></div>
          </div>
        </div>

        <!-- Stage 2: Calibrate -->
        <div class="pipeline-card" :class="stageCardClass('calibrate')">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="stage-number" :class="stageNumberClass('calibrate')">2</span>
              <div>
                <div class="text-sm font-medium text-slate-200">Calibrate</div>
                <div class="text-xs text-slate-500">Seeds 1-10: Human + Creator collaboration</div>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-xs font-mono text-slate-300">{{ calibrationDone }}/10</span>
              <span v-if="stageComplete('calibrate')" class="stage-badge-complete">Done</span>
              <span v-else-if="stageLocked('calibrate')" class="stage-badge-locked">Locked</span>
              <button
                v-else-if="!goldenStatus.running"
                @click="startCalibrationBuild"
                :disabled="goldenStarting"
                class="px-3 py-1 bg-amber-600/20 border border-amber-500/50 text-amber-400 hover:border-amber-400/70 disabled:opacity-50 text-xs font-medium rounded-lg transition-all"
              >
                {{ goldenStarting ? 'Spawning...' : 'Spawn Creator' }}
              </button>
              <span v-if="goldenStatus.running && pipelinePhase === 'calibrate'" class="text-xs text-amber-400 animate-pulse">Running...</span>
              <router-link
                v-if="calibrationPendingReview > 0"
                :to="`/production/${courseCode}/calibration-review`"
                class="px-3 py-1 bg-cyan-600/20 border border-cyan-500/50 text-cyan-400 hover:border-cyan-400/70 text-xs font-medium rounded-lg transition-all"
              >
                Review ({{ calibrationPendingReview }})
              </router-link>
              <!-- Reset -->
              <template v-if="stageResetConfirm === 'calibrate'">
                <span class="text-xs text-red-400">Wipe seeds 1-10?</span>
                <button @click="resetStage('calibrate')" :disabled="stageResetting === 'calibrate'" class="px-2 py-0.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs rounded transition-colors">
                  {{ stageResetting === 'calibrate' ? 'Wiping...' : 'Confirm' }}
                </button>
                <button @click="stageResetConfirm = null" class="text-xs text-slate-400 hover:text-slate-200 transition-colors">Cancel</button>
              </template>
              <button
                v-else-if="!stageLocked('calibrate')"
                @click="stageResetConfirm = 'calibrate'"
                class="text-xs text-red-400/60 hover:text-red-400 transition-colors"
              >Reset</button>
            </div>
          </div>
          <div v-if="!stageLocked('calibrate')" class="mt-2 h-1 bg-slate-700/50 rounded-full overflow-hidden">
            <div class="h-full rounded-full bg-amber-500 transition-all duration-500" :style="{ width: `${calibrationPercent}%` }"></div>
          </div>
          <!-- Calibration seed mini-grid -->
          <div v-if="!stageLocked('calibrate') && goldenSeeds.length > 0" class="mt-2 flex flex-wrap gap-1">
            <div
              v-for="cell in calibrationSeeds"
              :key="cell.seed_number"
              class="w-6 h-6 rounded-sm flex items-center justify-center text-xs font-mono cursor-default"
              :class="goldenCellClass(cell)"
              :title="`S${cell.seed_number}: ${cell.status}`"
            >
              {{ cell.seed_number }}
            </div>
          </div>
        </div>

        <!-- Stage 3: Golden -->
        <div class="pipeline-card" :class="stageCardClass('golden')">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="stage-number" :class="stageNumberClass('golden')">3</span>
              <div>
                <div class="text-sm font-medium text-slate-200">Golden</div>
                <div class="text-xs text-slate-500">Seeds 11-50: Creator + Checker agents</div>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-xs font-mono text-slate-300">{{ goldenRangeDone }}/{{ goldenRangeTotal }}</span>
              <span v-if="stageComplete('golden')" class="stage-badge-complete">Done</span>
              <span v-else-if="stageLocked('golden')" class="stage-badge-locked">Locked</span>
              <button
                v-else-if="!goldenStatus.running"
                @click="startGoldenBuild"
                :disabled="goldenStarting"
                class="px-3 py-1 bg-amber-600/20 border border-amber-500/50 text-amber-400 hover:border-amber-400/70 disabled:opacity-50 text-xs font-medium rounded-lg transition-all"
              >
                {{ goldenStarting ? 'Spawning...' : 'Launch Creator + Checker' }}
              </button>
              <span v-if="goldenStatus.running && pipelinePhase === 'golden'" class="text-xs text-amber-400 animate-pulse">Running...</span>
              <!-- Reset -->
              <template v-if="stageResetConfirm === 'golden'">
                <span class="text-xs text-red-400">Wipe seeds 11-50?</span>
                <button @click="resetStage('golden')" :disabled="stageResetting === 'golden'" class="px-2 py-0.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs rounded transition-colors">
                  {{ stageResetting === 'golden' ? 'Wiping...' : 'Confirm' }}
                </button>
                <button @click="stageResetConfirm = null" class="text-xs text-slate-400 hover:text-slate-200 transition-colors">Cancel</button>
              </template>
              <button
                v-else-if="!stageLocked('golden')"
                @click="stageResetConfirm = 'golden'"
                class="text-xs text-red-400/60 hover:text-red-400 transition-colors"
              >Reset</button>
            </div>
          </div>
          <div v-if="!stageLocked('golden')" class="mt-2 h-1 bg-slate-700/50 rounded-full overflow-hidden">
            <div class="h-full rounded-full bg-amber-500 transition-all duration-500" :style="{ width: `${goldenRangePercent}%` }"></div>
          </div>
          <!-- Transition: Finalize Golden Seeds -->
          <div v-if="stageComplete('golden') && !goldenFinalized" class="mt-2">
            <button
              @click="finalizeGoldenSeeds"
              :disabled="goldenFinalizing"
              class="px-3 py-1 bg-emerald-600/20 border border-emerald-500/50 text-emerald-400 hover:border-emerald-400/70 disabled:opacity-50 text-xs font-medium rounded-lg transition-all"
            >
              {{ goldenFinalizing ? 'Finalizing...' : 'Finalize Golden Seeds' }}
            </button>
          </div>
        </div>

        <!-- Stage 4: Golden QA -->
        <div class="pipeline-card" :class="stageCardClass('golden-qa')">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="stage-number" :class="stageNumberClass('golden-qa')">4</span>
              <div>
                <div class="text-sm font-medium text-slate-200">Golden QA</div>
                <div class="text-xs text-slate-500">Seeds 1-50: Speakability + grammar check</div>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span v-if="stageComplete('golden-qa')" class="stage-badge-complete">Done</span>
              <span v-else-if="stageLocked('golden-qa')" class="stage-badge-locked">Locked</span>
              <template v-else>
                <button
                  @click="startStrictQA"
                  :disabled="goldenQaStatus.running"
                  class="px-3 py-1 bg-amber-600/20 border border-amber-500/50 text-amber-400 hover:border-amber-400/70 disabled:opacity-50 text-xs font-medium rounded-lg transition-all"
                >
                  1-50 QA Check
                </button>
                <span v-if="goldenQaStatus.running" class="text-xs text-amber-400 animate-pulse">Running...</span>
              </template>
            </div>
          </div>
        </div>

        <!-- Stage 5: Build MVP (V2 Pipeline — 4 sub-stages) -->
        <div class="pipeline-card" :class="stageCardClass('mvp')">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="stage-number" :class="stageNumberClass('mvp')">5</span>
              <div>
                <div class="text-sm font-medium text-slate-200">Build MVP</div>
                <div class="text-xs text-slate-500">Seeds 51-{{ seedCount }}: V2 staged pipeline</div>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span class="text-xs font-mono text-slate-300">{{ mvpDecomposed }}/{{ mvpTotal }}</span>
              <span v-if="stageComplete('mvp') && mvpPhrasesComplete" class="stage-badge-complete">Done</span>
              <button
                v-else-if="stageComplete('mvp') && !mvpPhrasesComplete && progress.status !== 'running'"
                @click="startV2PhraseResume"
                class="px-3 py-1 bg-amber-600/20 border border-amber-500/50 text-amber-400 hover:border-amber-400/70 text-xs font-medium rounded-lg transition-all"
              >
                Resume Phrases
              </button>
              <span v-else-if="stageLocked('mvp')" class="stage-badge-locked">Locked</span>
              <button
                v-else-if="progress.status !== 'running'"
                @click="startV2Build"
                class="px-3 py-1 bg-cyan-600/20 border border-cyan-500/50 text-cyan-400 hover:border-cyan-400/70 text-xs font-medium rounded-lg transition-all"
              >
                Start V2 Build
              </button>
              <button
                v-if="progress.status === 'running'"
                @click="stopBuilder"
                class="px-3 py-1 bg-slate-700/30 border border-slate-600/50 text-slate-400 hover:border-slate-500/50 text-xs font-medium rounded-lg transition-all"
              >
                Stop
              </button>
              <span v-if="progress.status === 'running'" class="text-xs text-cyan-400 animate-pulse">Running...</span>
              <!-- Reset -->
              <template v-if="stageResetConfirm === 'mvp'">
                <span class="text-xs text-red-400">Wipe seeds 51-{{ seedCount }}?</span>
                <button @click="resetStage('mvp')" :disabled="stageResetting === 'mvp'" class="px-2 py-0.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs rounded transition-colors">
                  {{ stageResetting === 'mvp' ? 'Wiping...' : 'Confirm' }}
                </button>
                <button @click="stageResetConfirm = null" class="text-xs text-slate-400 hover:text-slate-200 transition-colors">Cancel</button>
              </template>
              <button
                v-else-if="!stageLocked('mvp')"
                @click="stageResetConfirm = 'mvp'"
                class="text-xs text-red-400/60 hover:text-red-400 transition-colors"
              >Reset</button>
            </div>
          </div>
          <div v-if="!stageLocked('mvp')" class="mt-2 h-1 bg-slate-700/50 rounded-full overflow-hidden">
            <div class="h-full rounded-full bg-cyan-500 transition-all duration-500" :style="{ width: `${mvpPercent}%` }"></div>
          </div>

          <!-- V2 Sub-stages (visible when stage is active or complete) -->
          <div v-if="!stageLocked('mvp')" class="mt-3 space-y-1.5 pl-8">
            <!-- 4a: Decompose -->
            <div class="flex items-center justify-between text-xs">
              <div class="flex items-center gap-2">
                <span class="w-4 h-4 rounded-full flex items-center justify-center text-[0.6rem] font-semibold"
                  :class="stageComplete('mvp') || v2Status.decompose.finalized >= v2Status.decompose.target ? 'bg-emerald-500/20 text-emerald-400' : v2Status.phase === 'decompose' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-700/50 text-slate-500'">a</span>
                <span class="text-slate-300">Decompose</span>
                <span class="text-slate-600 font-mono">Sonnet</span>
              </div>
              <div class="flex items-center gap-2">
                <span v-if="v2Status.decompose.target > 0" class="font-mono text-slate-400">{{ v2Status.decompose.finalized }}/{{ v2Status.decompose.target }}</span>
                <span v-else-if="stageComplete('mvp')" class="font-mono text-slate-400">{{ mvpDecomposed }}/{{ mvpTotal }}</span>
                <span v-if="stageComplete('mvp') || (v2Status.decompose.finalized >= v2Status.decompose.target && v2Status.decompose.target > 0)" class="stage-badge-complete">Done</span>
                <span v-else-if="v2Status.phase === 'decompose'" class="text-cyan-400 animate-pulse">Active</span>
              </div>
            </div>

            <!-- 4b: Collisions -->
            <div class="flex items-center justify-between text-xs">
              <div class="flex items-center gap-2">
                <span class="w-4 h-4 rounded-full flex items-center justify-center text-[0.6rem] font-semibold"
                  :class="stageComplete('mvp') || (v2Status.decompose.collisions === 0 && v2Status.decompose.finalized > 0) ? 'bg-emerald-500/20 text-emerald-400' : v2Status.decompose.collisions > 0 ? 'bg-red-500/20 text-red-400' : 'bg-slate-700/50 text-slate-500'">b</span>
                <span class="text-slate-300">Collisions</span>
                <span class="text-slate-600 font-mono">Sonnet</span>
              </div>
              <div class="flex items-center gap-2">
                <span v-if="v2Status.decompose.collisions > 0" class="font-mono text-red-400">{{ v2Status.decompose.collisions }} collisions</span>
                <span v-else-if="stageComplete('mvp') || v2Status.decompose.finalized > 0" class="stage-badge-complete">Clean</span>
                <span v-else class="font-mono text-slate-600">—</span>
              </div>
            </div>

            <!-- 4c: Phrases -->
            <div class="flex items-center justify-between text-xs">
              <div class="flex items-center gap-2">
                <span class="w-4 h-4 rounded-full flex items-center justify-center text-[0.6rem] font-semibold"
                  :class="mvpPhrasesComplete ? 'bg-emerald-500/20 text-emerald-400' : v2Status.phase === 'phrases' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-700/50 text-slate-500'">c</span>
                <span class="text-slate-300">Phrases</span>
                <span class="text-slate-600 font-mono">Haiku</span>
              </div>
              <div class="flex items-center gap-2">
                <span v-if="v2Status.phrases.total_legos > 0" class="font-mono text-slate-400">{{ v2Status.phrases.legos_with_phrases }}/{{ v2Status.phrases.total_legos }}</span>
                <span v-else-if="mvpPhrasesComplete" class="font-mono text-slate-400">{{ progress.legosInserted }} LEGOs</span>
                <span v-if="mvpPhrasesComplete" class="stage-badge-complete">Done</span>
                <span v-else-if="v2Status.phase === 'phrases'" class="text-cyan-400 animate-pulse">Active</span>
              </div>
            </div>

            <!-- 4d: Validate -->
            <div class="flex items-center justify-between text-xs">
              <div class="flex items-center gap-2">
                <span class="w-4 h-4 rounded-full flex items-center justify-center text-[0.6rem] font-semibold"
                  :class="mvpPhrasesComplete || v2Status.phase === 'complete' ? 'bg-emerald-500/20 text-emerald-400' : v2Status.phase === 'validate' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-700/50 text-slate-500'">d</span>
                <span class="text-slate-300">Validate</span>
                <span class="text-slate-600 font-mono">Code</span>
              </div>
              <div class="flex items-center gap-2">
                <span v-if="mvpPhrasesComplete || v2Status.phase === 'complete'" class="stage-badge-complete">Pass</span>
                <span v-else-if="v2Status.phase === 'validate'" class="text-cyan-400 animate-pulse">Active</span>
                <span v-else class="font-mono text-slate-600">—</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Stage 6: QA Review -->
        <div class="pipeline-card" :class="stageCardClass('qa')">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="stage-number" :class="stageNumberClass('qa')">6</span>
              <div>
                <div class="text-sm font-medium text-slate-200">QA Review</div>
                <div class="text-xs text-slate-500">Full-course speakability check</div>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span v-if="qa.flags > 0" class="text-xs text-red-400">{{ qa.flags }} flagged</span>
              <span class="text-xs font-mono text-slate-300">{{ qa.progress }}%</span>
              <span v-if="stageComplete('qa')" class="stage-badge-complete">Done</span>
              <span v-else-if="stageLocked('qa')" class="stage-badge-locked">Locked</span>
              <button
                v-else-if="!qaRunning"
                @click="startQA"
                class="px-3 py-1 bg-cyan-600/20 border border-cyan-500/50 text-cyan-400 hover:border-cyan-400/70 text-xs font-medium rounded-lg transition-all"
              >
                Start QA
              </button>
              <span v-if="qaRunning" class="text-xs text-cyan-400 animate-pulse">Running...</span>
              <button
                v-if="!stageLocked('qa') && (qa.progress > 0 || stageComplete('qa'))"
                @click="resetQA"
                :disabled="qaResetting"
                class="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                {{ qaResetting ? 'Resetting...' : 'Reset' }}
              </button>
            </div>
          </div>
          <div v-if="!stageLocked('qa')" class="mt-2 h-1 bg-slate-700/50 rounded-full overflow-hidden">
            <div class="h-full rounded-full bg-cyan-500 transition-all duration-500" :style="{ width: `${qa.progress}%` }"></div>
          </div>
          <!-- QA Details (expanded when active) -->
          <div v-if="!stageLocked('qa') && qa.total > 0" class="mt-2 flex items-center gap-4 text-xs text-slate-500">
            <span>{{ qa.checked.toLocaleString() }}/{{ qa.total.toLocaleString() }} checked</span>
            <span v-if="qa.errors > 0" class="text-red-400">{{ qa.errors }} errors</span>
            <span v-if="qa.warnings > 0" class="text-amber-400">{{ qa.warnings }} warnings</span>
            <template v-if="qa.flags > 0">
              <button
                v-if="!deleteFlaggedConfirming"
                @click="deleteFlaggedConfirming = true"
                class="text-red-400 hover:text-red-300 transition-colors ml-auto"
              >
                Delete flagged phrases
              </button>
              <template v-if="deleteFlaggedConfirming">
                <span class="text-red-400 ml-auto">Delete {{ qa.flags }} flagged phrases?</span>
                <button
                  @click="deleteFlaggedPhrases"
                  :disabled="deletingFlagged"
                  class="px-2 py-0.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded transition-colors"
                >
                  {{ deletingFlagged ? 'Deleting...' : 'Confirm' }}
                </button>
                <button
                  @click="deleteFlaggedConfirming = false"
                  class="text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
              </template>
            </template>
          </div>
          <!-- Unchecked Phrases -->
          <div v-if="qa.progress > 0 && qa.progress < 100 && uncheckedPhrases.length > 0" class="mt-2 bg-slate-700/20 border border-slate-600/50 rounded-lg p-3">
            <div class="flex items-center justify-between">
              <span class="text-xs text-slate-300">
                {{ uncheckedPhrases.length }} unchecked phrases from {{ uncheckedGrouped.length }} seeds
              </span>
              <button
                @click="showUnchecked = !showUnchecked"
                class="text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                {{ showUnchecked ? 'Hide' : 'Show' }}
              </button>
            </div>
            <div v-if="showUnchecked" class="mt-2 space-y-2 max-h-60 overflow-y-auto">
              <div v-for="group in uncheckedGrouped" :key="group.seed">
                <div class="text-xs font-medium text-slate-400 mb-1">Seed {{ group.seed }} ({{ group.phrases.length }})</div>
                <div class="space-y-1">
                  <div
                    v-for="phrase in group.phrases"
                    :key="phrase.id"
                    class="text-xs text-slate-300 bg-slate-700/30 rounded px-2 py-1 font-mono"
                  >
                    "{{ phrase.known_text }}" → "{{ phrase.target_text }}"
                  </div>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-3 mt-2">
              <button
                @click="markAllChecked"
                :disabled="markingChecked"
                class="px-3 py-1 bg-cyan-600/20 border border-cyan-500/50 text-cyan-400 hover:border-cyan-400/70 disabled:opacity-50 text-xs font-medium rounded-lg transition-all"
              >
                {{ markingChecked ? 'Marking...' : 'Mark All Checked' }}
              </button>
              <button
                @click="startQA"
                :disabled="qaRunning"
                class="px-3 py-1 bg-slate-700/30 border border-slate-600/50 text-slate-400 hover:border-slate-500/50 disabled:opacity-50 text-xs font-medium rounded-lg transition-all"
              >
                Run QA Agent
              </button>
              <span v-if="uncheckedStatus" class="text-xs" :class="uncheckedStatus.ok ? 'text-cyan-400/70' : 'text-red-400'">
                {{ uncheckedStatus.message }}
              </span>
            </div>
          </div>
        </div>

        <!-- Stage 7: Gender Prep (only for gendered languages) -->
        <div v-if="genderPrep.isGendered" class="pipeline-card" :class="stageCardClass('gender-prep')">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="stage-number" :class="stageNumberClass('gender-prep')">7</span>
              <div>
                <div class="text-sm font-medium text-slate-200">Gender Prep</div>
                <div class="text-xs text-slate-500">Expand text for gendered TTS voices</div>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span v-if="genderPrep.processed" class="text-xs font-mono text-slate-300">{{ genderPrep.totalExpansions }} texts expanded</span>
              <span v-if="genderPrep.flagged > 0" class="text-xs text-amber-400">{{ genderPrep.flagged }} audio flagged</span>
              <span v-if="genderPrep.processed" class="stage-badge-complete">Done</span>
              <span v-else-if="stageLocked('gender-prep')" class="stage-badge-locked">Locked</span>
              <span v-else class="text-xs text-slate-500">Run from Audio tab</span>
            </div>
          </div>
        </div>

        <!-- Optional: Full Build -->
        <div v-if="stageComplete('mvp')" class="pipeline-card border-slate-700/30">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span class="stage-number bg-slate-700/50 text-slate-400">+</span>
              <div>
                <div class="text-sm font-medium text-slate-400">Full Build</div>
                <div class="text-xs text-slate-500">Seeds {{ seedCount + 1 }}-668 (optional)</div>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span v-if="fullBuildDecomposed > 0" class="text-xs font-mono text-slate-300">{{ fullBuildDecomposed }}/{{ fullBuildTotal }}</span>
              <button
                v-if="progress.status !== 'running'"
                @click="seedCount = 668; startBuilder()"
                class="px-3 py-1 bg-slate-700/30 border border-slate-600/50 text-slate-400 hover:border-slate-500/50 text-xs font-medium rounded-lg transition-all"
              >
                Continue to 668
              </button>
            </div>
          </div>
        </div>

        <!-- Active Agents -->
        <div v-if="agents.running_count > 0" class="bg-slate-800/20 border border-slate-700/30 rounded-lg px-4 py-3">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs text-slate-500 uppercase tracking-wide">Active Agents</span>
            <span class="text-xs text-cyan-400">{{ agents.running_count }} running</span>
          </div>
          <div class="space-y-1">
            <div
              v-for="agent in agents.running"
              :key="agent.pid"
              class="flex items-center justify-between bg-slate-700/20 rounded px-3 py-1.5"
            >
              <div class="flex items-center gap-4">
                <span class="text-xs font-mono text-slate-400">PID {{ agent.pid }}</span>
                <span class="text-xs text-slate-500">{{ agent.seedCount }} seeds</span>
                <span class="text-xs text-slate-500">{{ agent.runningMinutes }}m</span>
              </div>
              <button
                @click="killAgent(agent.pid)"
                class="text-xs px-2 py-0.5 rounded bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors"
              >
                Kill
              </button>
            </div>
          </div>
        </div>

        <!-- Status Message -->
        <div v-if="goldenStatusMessage" class="text-xs px-2" :class="goldenStatusMessage.ok ? 'text-emerald-400' : 'text-red-400'">
          {{ goldenStatusMessage.text }}
        </div>
      </section>

      <!-- Seed Grid -->
      <section v-if="seedGrid.length > 0" class="bg-slate-800/30 border border-slate-700/50 rounded-lg overflow-hidden">
        <button
          @click="seedGridExpanded = !seedGridExpanded"
          class="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
        >
          <div class="flex items-center gap-3">
            <span class="text-sm font-medium text-slate-300 uppercase tracking-wide">Seed Grid</span>
            <span class="text-xs text-slate-500">
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
            class="w-5 h-5 text-slate-400 transition-transform duration-200"
            :class="{ 'rotate-180': seedGridExpanded }"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div v-show="seedGridExpanded" class="border-t border-slate-700/50 px-6 py-5">
          <!-- Rebuild Controls -->
          <div class="flex items-center gap-4 mb-4">
            <div class="flex items-center gap-2">
              <label class="text-xs text-slate-400">From</label>
              <input
                v-model.number="rebuildFrom"
                type="number" min="1" :max="rebuildTo"
                class="w-20 bg-slate-700/50 border border-slate-600/50 rounded px-2 py-1 text-sm text-slate-200 font-mono"
              />
              <label class="text-xs text-slate-400">To</label>
              <input
                v-model.number="rebuildTo"
                type="number" :min="rebuildFrom" max="999"
                class="w-20 bg-slate-700/50 border border-slate-600/50 rounded px-2 py-1 text-sm text-slate-200 font-mono"
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
                class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors"
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

          <!-- Legend: build progress (primary) -->
          <div class="flex items-center gap-4 mt-3 text-xs text-slate-500">
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-slate-700/30"></span> Empty</span>
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-indigo-400/60"></span> Decomposed</span>
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-rose-500/60 ring-1 ring-inset ring-rose-400"></span> Collision</span>
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-amber-400/70"></span> Drafted</span>
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-emerald-500/80"></span> Complete</span>
          </div>
          <!-- Legend: range accents (secondary) -->
          <div class="flex items-center gap-4 mt-1 text-xs text-slate-500">
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-slate-700/30 border-t-2 border-t-orange-400"></span> Calibration (1-{{ goldenSeedCount }})</span>
            <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-slate-700/30 border-t-2 border-t-yellow-300/80"></span> Golden ({{ goldenSeedCount + 1 }}-50)</span>
            <span class="text-slate-600">No accent = MVP/Full</span>
          </div>
        </div>
      </section>

      <!-- Controls (simplified - only force reset now) -->
      <section class="flex justify-end gap-3">
        <button
          v-if="progress.status === 'running' && agents.running_count === 0"
          @click="forceResetBuilder"
          class="px-4 py-2 bg-orange-600/80 hover:bg-orange-500 text-white text-sm font-medium rounded-lg transition-colors"
          title="Force reset when Stop button fails (no agents running)"
        >
          Force Reset
        </button>
        <button
          v-if="progress.status === 'complete'"
          @click="resetBuilder"
          class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium rounded-lg transition-colors"
        >
          Reset
        </button>
      </section>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { getApiUrl } from '@/services/api'

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
const agentEngine = ref('cli')

const courseSizes = [
  { seeds: 300, label: 'MVP' },
  { seeds: 668, label: 'Full' }
]

const engines = [
  { id: 'cli', label: 'iTerm2', description: 'Pro Max #1' },
  { id: 'terminal', label: 'Terminal', description: 'Pro Max #2' }
]

// Progress state
const progress = ref({
  status: 'idle',
  currentSeed: 0,
  seedsTranslated: 0,
  totalSeeds: 0,
  legosInserted: 0,
  phrasesInserted: 0
})

// Agent tracking state
const agents = ref({
  running: [],
  running_count: 0,
  total_tracked: 0
})

// QA state
const qaRunning = ref(false)
const qaResetting = ref(false)
const qa = ref({
  total: 0,
  checked: 0,
  progress: 0,
  flags: 0,
  errors: 0,
  warnings: 0
})

// Unchecked phrases state
const uncheckedPhrases = ref([])
const showUnchecked = ref(false)
const markingChecked = ref(false)
const uncheckedStatus = ref(null)

// Delete flagged phrases state
const deleteFlaggedConfirming = ref(false)
const deletingFlagged = ref(false)

// Gender prep state
const genderPrep = ref({ isGendered: false, processed: false, totalExpansions: 0, processedAt: null, flagged: 0 })

const uncheckedGrouped = computed(() => {
  const groups = {}
  for (const p of uncheckedPhrases.value) {
    if (!groups[p.seed_number]) groups[p.seed_number] = { seed: p.seed_number, phrases: [] }
    groups[p.seed_number].phrases.push(p)
  }
  return Object.values(groups).sort((a, b) => a.seed - b.seed)
})

// Translation agent state
const translateStarting = ref(false)
const translateRunning = ref(false)

// Golden seed builder state
const goldenSeeds = ref([])
const goldenTargetSeeds = ref(50)
const goldenStarting = ref(false)
const goldenFinalizing = ref(false)
const goldenStatusMessage = ref(null)
const goldenFinalized = ref(false)
const goldenSeedCount = ref(10) // Calibrate = seeds 1-10, Golden = seeds 11-50

// Golden QA state
const goldenQaStatus = ref({ status: 'not_started', complete: false, running: false })

const goldenStatus = computed(() => {
  const seeds = goldenSeeds.value
  const approved = seeds.filter(s => s.status === 'approved').length
  const allApproved = seeds.length > 0 && approved === seeds.length
  // "running" = actual build job active, not just seeds awaiting QA
  const running = progress.value.status === 'running' &&
    ['golden', 'calibration'].includes(progress.value.buildPass)
  return { running, allApproved, finalized: goldenFinalized.value, approved }
})

const goldenSummary = computed(() => {
  const seeds = goldenSeeds.value
  return {
    approved: seeds.filter(s => s.status === 'approved').length,
    submitted: seeds.filter(s => s.status === 'submitted').length,
    checking: seeds.filter(s => s.status === 'checking').length,
    flagged: seeds.filter(s => s.status === 'flagged').length,
    escalated: seeds.filter(s => s.status === 'escalated').length,
    empty: seeds.filter(s => s.status === 'empty').length
  }
})

function goldenCellClass(cell) {
  switch (cell.status) {
    case 'approved': return 'bg-emerald-500/80 text-emerald-100'
    case 'submitted': return 'bg-cyan-500/80 text-cyan-100'
    case 'checking': return 'bg-amber-500/80 text-amber-100'
    case 'flagged': return 'bg-red-500/80 text-red-100'
    case 'escalated': return 'bg-orange-500/80 text-orange-100'
    default: return 'bg-slate-700/80 text-slate-500'
  }
}

// UI state
const isPolling = ref(false)

// Seed grid state
const seedGrid = ref([])
const seedGridExpanded = ref(true)
const rebuildFrom = ref(11)
const rebuildTo = ref(300)
const rebuildConfirming = ref(false)
const rebuildRunning = ref(false)

// Stage reset state
const stageResetConfirm = ref(null) // 'calibrate' | 'golden' | 'mvp' | null
const stageResetting = ref(null)    // which stage is currently wiping

const seedGridFinalized = computed(() => seedGrid.value.filter(s => s.status === 'complete').length)
const seedGridDrafted = computed(() => seedGrid.value.filter(s => s.status === 'drafted').length)
const seedGridCollision = computed(() => seedGrid.value.filter(s => s.status === 'collision' || s.status === 'rework').length)

// --- Pipeline computeds ---

// Seed grid helpers: count finalized seeds in a range (ground truth from actual DB data)
function seedGridFinalizedInRange(from, to) {
  return seedGrid.value.filter(s => s.seed >= from && s.seed <= to && s.status === 'complete').length
}

const calibrationSeeds = computed(() => {
  return goldenSeeds.value.filter(s => s.seed_number <= goldenSeedCount.value)
})

// Calibration done = either golden workflow approved OR seeds actually built (finalized in grid)
const calibrationDone = computed(() => {
  const goldenApproved = goldenSeeds.value.filter(s => s.seed_number <= goldenSeedCount.value && s.status === 'approved').length
  const gridFinalized = seedGridFinalizedInRange(1, goldenSeedCount.value)
  return Math.max(goldenApproved, gridFinalized)
})

const calibrationPendingReview = computed(() => {
  return goldenSeeds.value.filter(s => s.seed_number <= goldenSeedCount.value && s.status === 'pending_review').length
})

const calibrationPercent = computed(() => {
  if (goldenSeedCount.value === 0) return 0
  return Math.round((calibrationDone.value / goldenSeedCount.value) * 100)
})

// Golden range done = either golden workflow approved OR seeds actually built
const goldenRangeDone = computed(() => {
  const goldenApproved = goldenSeeds.value.filter(s => s.seed_number > goldenSeedCount.value && s.seed_number <= 50 && s.status === 'approved').length
  const gridFinalized = seedGridFinalizedInRange(goldenSeedCount.value + 1, 50)
  return Math.max(goldenApproved, gridFinalized)
})

const goldenRangeTotal = computed(() => {
  return Math.max(0, 50 - goldenSeedCount.value)
})

const goldenRangePercent = computed(() => {
  if (goldenRangeTotal.value === 0) return 0
  return Math.round((goldenRangeDone.value / goldenRangeTotal.value) * 100)
})

const translatePercent = computed(() => {
  const total = progress.value.totalSeeds || 668
  return Math.round(((progress.value.seedsTranslated || 0) / total) * 100)
})

const mvpTotal = computed(() => Math.max(0, seedCount.value - 50))
const mvpDecomposed = computed(() => Math.max(0, Math.min(progress.value.currentSeed, seedCount.value) - 50))
const mvpPercent = computed(() => {
  if (mvpTotal.value <= 0) return 0
  return Math.round((mvpDecomposed.value / mvpTotal.value) * 100)
})

const fullBuildTotal = computed(() => Math.max(0, 668 - seedCount.value))
const fullBuildDecomposed = computed(() => Math.max(0, progress.value.currentSeed - seedCount.value))

// V2 Pipeline state
const v2Status = ref({
  phase: 'idle',
  active: false,
  decompose: { drafts: 0, collisions: 0, finalized: 0, target: 0 },
  phrases: { legos_with_phrases: 0, total_legos: 0, percent: 0 }
})

// Phrase completion — uses v2Status when populated, falls back to progress stats
const mvpPhrasesComplete = computed(() => {
  if (v2Status.value.phrases.percent >= 100) return true
  if (v2Status.value.phase === 'complete') return true
  // Fallback: if all MVP seeds are decomposed and phrase/lego ratio is healthy
  if (stageComplete('mvp') && progress.value.phrasesInserted > 0 && progress.value.legosInserted > 0) {
    return (progress.value.phrasesInserted / progress.value.legosInserted) >= 4
  }
  return false
})

const pipelinePhase = computed(() => {
  const translated = progress.value.seedsTranslated || 0
  const totalSeeds = progress.value.totalSeeds || 668
  const decomposed = progress.value.currentSeed || 0
  const qaProgress = qa.value?.progress || 0
  const mvpTarget = seedCount.value

  if (translated < totalSeeds) return 'translate'
  if (calibrationDone.value < goldenSeedCount.value) return 'calibrate'
  if (goldenRangeDone.value < goldenRangeTotal.value) return 'golden'
  if (decomposed < mvpTarget) return 'mvp'
  if (qaProgress < 100) return 'qa'
  return 'golden-qa'
})

function stageComplete(stage) {
  switch (stage) {
    case 'translate': return (progress.value.seedsTranslated || 0) >= (progress.value.totalSeeds || 668)
    case 'calibrate': return calibrationDone.value >= goldenSeedCount.value
    case 'golden': return goldenRangeDone.value >= goldenRangeTotal.value && goldenRangeTotal.value > 0
    case 'mvp': return progress.value.currentSeed >= seedCount.value
    case 'qa': return qa.value.progress >= 100
    case 'golden-qa': return goldenQaStatus.value.complete
    case 'gender-prep': return genderPrep.value.processed
    default: return false
  }
}

function stageLocked(stage) {
  switch (stage) {
    case 'translate': return false
    case 'calibrate': return !stageComplete('translate')
    case 'golden': return !stageComplete('calibrate')
    case 'golden-qa': return !stageComplete('golden') // unlocks after golden
    case 'mvp': return !stageComplete('golden')        // also unlocks after golden (parallel with golden-qa)
    case 'qa': return !stageComplete('mvp')
    case 'gender-prep': return !stageComplete('mvp')   // unlocks after MVP complete
    default: return false
  }
}

function stageCardClass(stage) {
  if (stageLocked(stage)) return 'border-slate-700/30 opacity-50'
  if (pipelinePhase.value === stage) return 'border-cyan-500/30'
  if (stageComplete(stage)) return 'border-emerald-500/20'
  return 'border-slate-700/50'
}

function stageNumberClass(stage) {
  if (stageComplete(stage)) return 'bg-emerald-500/20 text-emerald-400'
  if (pipelinePhase.value === stage) return 'bg-cyan-500/20 text-cyan-400'
  if (stageLocked(stage)) return 'bg-slate-700/50 text-slate-500'
  return 'bg-slate-700/50 text-slate-400'
}

// Build-progress seed grid — primary: build status, secondary: range accent
function seedRangeAccent(seed) {
  if (seed <= goldenSeedCount.value) return 'border-t-2 border-t-orange-400'
  if (seed <= 50) return 'border-t-2 border-t-yellow-300/80'
  return ''
}

function seedCellClass(cell) {
  const accent = seedRangeAccent(cell.seed)

  // Build status is the primary visual encoding
  switch (cell.status) {
    case 'collision':
    case 'rework':
      return `${accent} bg-rose-500/60 ring-1 ring-inset ring-rose-400`
    case 'complete':
      return `${accent} bg-emerald-500/80`
    case 'drafted':
      return `${accent} bg-amber-400/70`
    case 'building':
      return `${accent} bg-indigo-400/60`
    default: // empty
      return `${accent} bg-slate-700/30`
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
  return 'text-slate-200'
})

const qualityScoreClass = computed(() => {
  const score = parseFloat(progress.value.avgPhraseScore)
  if (isNaN(score)) return 'text-slate-400'
  if (score >= 7.5) return 'text-emerald-400'
  if (score >= 6.5) return 'text-cyan-400'
  if (score >= 5.5) return 'text-yellow-400'
  return 'text-orange-400'
})

// Methods
async function fetchProgress() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode) return

  try {
    const apiBase = getApiUrl()

    const [statsResponse, buildResponse, activityResponse] = await Promise.all([
      fetch(`${apiBase}/api/stats/${courseCode}`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      }),
      fetch(`${apiBase}/api/build/status/${courseCode}`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      }),
      fetch(`${apiBase}/api/activity`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      })
    ])

    if (activityResponse.ok) {
      const activityData = await activityResponse.json()
      if (activityData.agents) {
        agents.value = activityData.agents
      }
    }

    if (statsResponse.ok) {
      const data = await statsResponse.json()
      const totalSeeds = data.total_seeds || seedCount.value

      progress.value = {
        ...progress.value,
        currentSeed: data.seeds_with_legos || data.seeds || 0,
        seedsTranslated: data.completed_seeds || data.seeds_translated || 0,
        totalSeeds: totalSeeds,
        legosInserted: data.legos || 0,
        phrasesInserted: data.phrases || 0,
        avgPhraseScore: data.avg_phrase_score || null,
        scoredPhrases: data.scored_phrases || 0
      }

      if (buildResponse.ok) {
        const buildData = await buildResponse.json()
        // Detect translate job running
        translateRunning.value = buildData.active && buildData.build?.pass === 'translate'
        if (buildData.active) {
          progress.value.status = 'running'
          progress.value.agentCount = buildData.build?.agent_count || 0
          progress.value.batchSeeds = buildData.build?.current_batch_seeds || 0
          progress.value.buildPass = buildData.build?.pass || null
          if (buildData.build?.total_seeds) {
            seedCount.value = buildData.build.total_seeds
          }
        } else {
          translateRunning.value = false
          progress.value.buildPass = null
          if (data.seeds_with_legos >= totalSeeds && data.seeds_with_legos > 0) {
            progress.value.status = 'complete'
          } else if (progress.value.status === 'running') {
            progress.value.status = 'idle'
          }
        }
      }

      if (data.seeds === 0 && progress.value.status === 'complete') {
        progress.value.status = 'idle'
      }
    }

    fetchSeedGrid()
    fetchQASummary()
    // Only poll golden/v2 when in relevant phases to avoid 404 console spam
    const phase = pipelinePhase.value
    if (['calibrate', 'golden', 'golden-qa'].includes(phase)) fetchGoldenStatus()
    if (['golden-qa'].includes(phase) || !goldenQaStatus.value.complete) fetchGoldenQAStatus()
    if (phase === 'mvp' || stageComplete('mvp')) fetchV2Status()
  } catch (error) {
    console.error('Failed to fetch progress:', error)
  }
}

async function fetchSeedGrid() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode) return
  try {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    const apiBase = localStorage.getItem('api_base_url') || (isLocal ? 'http://localhost:3470' : 'https://popty.ngrok.app')
    const response = await fetch(`${apiBase}/api/build/seed-grid/${courseCode}`, {
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
  const courseCode = effectiveCourseCode.value
  if (!courseCode) return

  rebuildRunning.value = true
  try {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    const apiBase = localStorage.getItem('api_base_url') || (isLocal ? 'http://localhost:3470' : 'https://popty.ngrok.app')
    const response = await fetch(`${apiBase}/api/build/rebuild/${courseCode}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({ from_seed: rebuildFrom.value, to_seed: rebuildTo.value })
    })

    const data = await response.json()
    if (data.ok) {
      rebuildConfirming.value = false
      await fetchSeedGrid()
    }
  } catch (err) {
    console.error('Rebuild error:', err.message)
  } finally {
    rebuildRunning.value = false
  }
}

async function resetStage(stage) {
  const courseCode = effectiveCourseCode.value
  if (!courseCode) return

  const ranges = {
    calibrate: { from: 1, to: 10 },
    golden: { from: 11, to: 50 },
    mvp: { from: 51, to: seedCount.value }
  }
  const range = ranges[stage]
  if (!range) return

  stageResetting.value = stage
  try {
    const apiBase = localStorage.getItem('api_base_url') || getApiUrl()

    // Stop any active build job first (clears "Running..." state)
    await fetch(`${apiBase}/api/build/stop/${courseCode}`, {
      method: 'POST',
      headers: { 'ngrok-skip-browser-warning': 'true' }
    }).catch(() => {}) // ignore if no active build

    // Wipe seeds/LEGOs/phrases in the range
    const response = await fetch(`${apiBase}/api/build/rebuild/${courseCode}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({ from_seed: range.from, to_seed: range.to })
    })

    const data = await response.json()
    if (data.ok) {
      stageResetConfirm.value = null
      await Promise.all([fetchProgress(), fetchSeedGrid(), fetchGoldenStatus()])
    }
  } catch (err) {
    console.error(`Reset stage ${stage} error:`, err.message)
  } finally {
    stageResetting.value = null
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

async function startBuilder() {
  const courseCode = effectiveCourseCode.value

  if (isCreateMode.value && !courseCode) {
    console.error('Please select both languages')
    return
  }

  try {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    const apiBase = localStorage.getItem('api_base_url') || (isLocal ? 'http://localhost:3470' : 'https://popty.ngrok.app')

    if (isCreateMode.value) {
      const createResponse = await fetch(`${apiBase}/api/courses/create`, {
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
          seedEnd: seedCount.value
        })
      })

      if (!createResponse.ok) {
        const err = await createResponse.json()
        if (createResponse.status !== 409) {
          throw new Error(err.error || 'Failed to create course')
        }
      }
    }

    const terminalMap = { cli: 'iTerm2', terminal: 'Terminal' }
    const terminal = terminalMap[agentEngine.value] || 'iTerm2'

    const response = await fetch(`${apiBase}/api/build/start/${courseCode}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({ terminal, targetSeeds: seedCount.value })
    })

    const result = await response.json()
    if (!result.ok) throw new Error(result.error || 'Failed to start course builder')

    progress.value.status = 'running'
    progress.value.totalSeeds = result.progress?.total || seedCount.value
    progress.value.currentSeed = result.progress?.completed || 0
    if (isCreateMode.value) {
      router.push(`/production/${courseCode}/text`)
    }

  } catch (error) {
    console.error('Failed to start course builder:', error)
  }
}

async function stopBuilder() {
  try {
    const apiBase = localStorage.getItem('api_base_url') || getApiUrl()
    await fetch(`${apiBase}/api/build/stop/${effectiveCourseCode.value}`, {
      method: 'POST',
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    progress.value.status = 'idle'
  } catch (error) {
    console.error('Failed to stop builder:', error)
  }
}

function resetBuilder() {
  stopPolling()
  progress.value = {
    status: 'idle',
    currentSeed: 0,
    totalSeeds: 0,
    legosInserted: 0,
    phrasesInserted: 0
  }
}

async function forceResetBuilder() {
  try {
    const apiBase = localStorage.getItem('api_base_url') || getApiUrl()
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

// V2 Pipeline methods
async function fetchV2Status() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode) return
  try {
    const apiBase = getApiUrl()
    const response = await fetch(`${apiBase}/api/v2/build/status/${courseCode}`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    if (response.ok) {
      const data = await response.json()
      v2Status.value = {
        phase: data.phase || 'idle',
        active: data.active || false,
        decompose: data.decompose || { drafts: 0, collisions: 0, finalized: 0, target: 0 },
        phrases: data.phrases || { legos_with_phrases: 0, total_legos: 0, percent: 0 }
      }
    }
  } catch (err) {
    // V2 endpoints may not exist on older servers
  }
}

async function startV2Build() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode) return

  try {
    const apiBase = localStorage.getItem('api_base_url') || getApiUrl()
    const terminalMap = { cli: 'iTerm2', terminal: 'Terminal' }
    const terminal = terminalMap[agentEngine.value] || 'iTerm2'

    const response = await fetch(`${apiBase}/api/v2/build/start/${courseCode}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({ terminal, targetSeeds: seedCount.value })
    })

    const result = await response.json()
    if (!result.ok) throw new Error(result.error || 'Failed to start V2 build')

    progress.value.status = 'running'
    progress.value.totalSeeds = result.target_seeds || seedCount.value
    fetchV2Status()
  } catch (error) {
    console.error('Failed to start V2 build:', error)
  }
}

async function startV2PhraseResume() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode) return

  try {
    const apiBase = localStorage.getItem('api_base_url') || getApiUrl()
    const terminalMap = { cli: 'iTerm2', terminal: 'Terminal' }
    const terminal = terminalMap[agentEngine.value] || 'iTerm2'

    const response = await fetch(`${apiBase}/api/v2/build/start/${courseCode}?from_stage=phrases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({ terminal, targetSeeds: seedCount.value })
    })

    const result = await response.json()
    if (!result.ok) throw new Error(result.error || 'Failed to resume phrases')

    progress.value.status = 'running'
    fetchV2Status()
  } catch (error) {
    console.error('Failed to resume phrases:', error)
  }
}

async function startQA() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode) return

  qaRunning.value = true
  try {
    const apiBase = localStorage.getItem('api_base_url') || getApiUrl()
    const response = await fetch(`${apiBase}/api/qa/start/${courseCode}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      }
    })
    const result = await response.json()
    if (!result.ok) {
      qaRunning.value = false
    }
  } catch (error) {
    console.error('Failed to start QA:', error)
    qaRunning.value = false
  }
}

async function startStrictQA() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode) return

  qaRunning.value = true
  try {
    const apiBase = localStorage.getItem('api_base_url') || getApiUrl()
    const response = await fetch(`${apiBase}/api/qa/strict/${courseCode}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      }
    })
    const result = await response.json()
    if (!result.ok) {
      qaRunning.value = false
    }
  } catch (error) {
    console.error('Failed to start strict QA:', error)
    qaRunning.value = false
  }
}

async function fetchQASummary() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode) return
  try {
    const apiBase = localStorage.getItem('api_base_url') || getApiUrl()
    const response = await fetch(`${apiBase}/api/qa/summary/${courseCode}`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    if (response.ok) {
      const data = await response.json()
      qa.value = {
        total: data.phrases?.total || 0,
        checked: data.phrases?.checked || 0,
        progress: data.phrases?.progress_percent || 0,
        flags: data.flags?.open || 0,
        errors: data.flags?.errors || 0,
        warnings: data.flags?.warnings || 0
      }
      if (qa.value.progress > 0 && qa.value.progress < 100) {
        qaRunning.value = true
      } else if (qa.value.progress >= 100) {
        qaRunning.value = false
      }
      if (qa.value.progress > 0 && qa.value.progress < 100) {
        fetchUncheckedPhrases()
      } else {
        uncheckedPhrases.value = []
      }
    }
  } catch (err) {
    // QA summary endpoint may not exist yet
  }
}

async function resetQA() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode) return
  qaResetting.value = true
  try {
    const apiBase = localStorage.getItem('api_base_url') || getApiUrl()
    const response = await fetch(`${apiBase}/api/qa/reset/${courseCode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      body: JSON.stringify({ clear_flags: true })
    })
    if (!response.ok) throw new Error('Reset failed')
    qaRunning.value = false
    qa.value = { total: 0, checked: 0, progress: 0, flags: 0, errors: 0, warnings: 0 }
    uncheckedPhrases.value = []
    await fetchQASummary()
  } catch (err) {
    console.error('Error resetting QA:', err)
  } finally {
    qaResetting.value = false
  }
}

async function fetchUncheckedPhrases() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode) return
  try {
    const apiBase = localStorage.getItem('api_base_url') || getApiUrl()
    const response = await fetch(`${apiBase}/api/qa/unchecked/${courseCode}?limit=500`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    if (response.ok) {
      const data = await response.json()
      uncheckedPhrases.value = data.phrases || data || []
    }
  } catch (err) {
    console.error('Failed to fetch unchecked phrases:', err)
  }
}

async function markAllChecked() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode || uncheckedPhrases.value.length === 0) return

  markingChecked.value = true
  uncheckedStatus.value = null
  try {
    const count = uncheckedPhrases.value.length
    const seeds = uncheckedPhrases.value.map(p => p.seed_number)
    const seedMin = Math.min(...seeds)
    const seedMax = Math.max(...seeds)

    const apiBase = localStorage.getItem('api_base_url') || getApiUrl()
    const response = await fetch(`${apiBase}/api/qa/bulk-mark-checked`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({ course_code: courseCode, seed_min: seedMin, seed_max: seedMax })
    })
    if (response.ok) {
      uncheckedStatus.value = { ok: true, message: `Marked ${count} phrases as checked` }
      uncheckedPhrases.value = []
      showUnchecked.value = false
      fetchQASummary()
    } else {
      const err = await response.json().catch(() => ({}))
      uncheckedStatus.value = { ok: false, message: err.error || `Failed (${response.status})` }
    }
  } catch (err) {
    uncheckedStatus.value = { ok: false, message: err.message }
  } finally {
    markingChecked.value = false
  }
}

async function deleteFlaggedPhrases() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode) return

  deletingFlagged.value = true
  try {
    const apiBase = localStorage.getItem('api_base_url') || getApiUrl()
    const response = await fetch(`${apiBase}/api/qa/flagged-phrases/${courseCode}`, {
      method: 'DELETE',
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    const result = await response.json()
    if (result.success) {
      deleteFlaggedConfirming.value = false
      fetchQASummary()
      fetchSeedGrid()
      fetchProgress()
    }
  } catch (err) {
    console.error('Failed to delete flagged phrases:', err)
  } finally {
    deletingFlagged.value = false
  }
}

// Gender prep methods
async function fetchGenderPrepStatus() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode || isCreateMode.value) return
  try {
    const apiBase = getApiUrl()
    const response = await fetch(`${apiBase}/api/production/${courseCode}/gender-prep/status`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    if (response.ok) {
      const data = await response.json()
      genderPrep.value = { ...genderPrep.value, ...data }
      // Also fetch flag count if processed
      if (data.isGendered && data.processed) {
        fetchGenderPrepFlagCount()
      }
    }
  } catch (err) {
    // Gender prep endpoint may not exist yet
  }
}

async function fetchGenderPrepFlagCount() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode) return
  try {
    const apiBase = getApiUrl()
    const response = await fetch(`${apiBase}/api/production/${courseCode}/gender-prep/flag-count`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    if (response.ok) {
      const data = await response.json()
      genderPrep.value.flagged = data.flagged || 0
    }
  } catch (err) {
    // Silently fail
  }
}

async function killAgent(pid) {
  try {
    const apiBase = localStorage.getItem('api_base_url') || getApiUrl()
    const response = await fetch(`${apiBase}/api/agents/${pid}`, {
      method: 'DELETE',
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    const result = await response.json()
    if (result.ok) {
      fetchProgress()
    }
  } catch (error) {
    console.error('Failed to kill agent:', error)
  }
}

// Golden seed builder methods
async function fetchGoldenStatus() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode || isCreateMode.value) return
  try {
    const apiBase = getApiUrl()
    const response = await fetch(`${apiBase}/api/golden/status/${courseCode}?target=${goldenTargetSeeds.value}`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    if (response.ok) {
      const data = await response.json()
      goldenSeeds.value = data.seeds || []
      // Calibration count is always 10 (human-reviewed seeds)
      // golden_seed_count from API represents total golden range, not calibration boundary
    }
  } catch (err) {
    // Golden endpoints may not exist yet
  }
}

async function fetchGoldenQAStatus() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode || isCreateMode.value) return
  try {
    const apiBase = getApiUrl()
    const response = await fetch(`${apiBase}/api/qa/golden/status/${courseCode}`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    if (response.ok) {
      const data = await response.json()
      goldenQaStatus.value = data
    }
  } catch (err) {
    // Endpoint may not exist yet
  }
}

async function startTranslation() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode) return

  translateStarting.value = true
  try {
    const apiBase = localStorage.getItem('api_base_url') || getApiUrl()
    const terminalMap = { cli: 'iTerm2', terminal: 'Terminal' }
    const terminal = terminalMap[agentEngine.value] || 'iTerm2'

    const response = await fetch(`${apiBase}/api/build/translate/${courseCode}?terminal=${terminal}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }
    })
    const result = await response.json()
    if (result.ok) {
      translateRunning.value = true
    } else {
      console.error('Failed to start translation:', result.error)
    }
  } catch (err) {
    console.error('Failed to start translation:', err)
  } finally {
    translateStarting.value = false
  }
}

async function startCalibrationBuild() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode) return

  goldenStarting.value = true
  goldenStatusMessage.value = null
  try {
    const apiBase = localStorage.getItem('api_base_url') || getApiUrl()
    const terminalMap = { cli: 'iTerm2', terminal: 'Terminal' }
    const terminal = terminalMap[agentEngine.value] || 'iTerm2'

    const response = await fetch(`${apiBase}/api/build/golden/${courseCode}?target=${goldenSeedCount.value}&terminal=${terminal}&phase=calibration`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }
    })
    const result = await response.json()
    if (result.ok) {
      goldenStatusMessage.value = { ok: true, text: result.message }
      fetchGoldenStatus()
    } else {
      goldenStatusMessage.value = { ok: false, text: result.error || 'Failed to start calibration build' }
    }
  } catch (err) {
    goldenStatusMessage.value = { ok: false, text: err.message }
  } finally {
    goldenStarting.value = false
  }
}

async function startGoldenBuild() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode) return

  goldenStarting.value = true
  goldenStatusMessage.value = null
  try {
    const apiBase = localStorage.getItem('api_base_url') || getApiUrl()
    const terminalMap = { cli: 'iTerm2', terminal: 'Terminal' }
    const terminal = terminalMap[agentEngine.value] || 'iTerm2'

    const response = await fetch(`${apiBase}/api/build/golden/${courseCode}?target=${goldenTargetSeeds.value}&terminal=${terminal}&phase=golden`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }
    })
    const result = await response.json()
    if (result.ok) {
      goldenStatusMessage.value = { ok: true, text: result.message }
      fetchGoldenStatus()
    } else {
      goldenStatusMessage.value = { ok: false, text: result.error || 'Failed to start golden build' }
    }
  } catch (err) {
    goldenStatusMessage.value = { ok: false, text: err.message }
  } finally {
    goldenStarting.value = false
  }
}

async function finalizeGoldenSeeds() {
  const courseCode = effectiveCourseCode.value
  if (!courseCode) return

  goldenFinalizing.value = true
  goldenStatusMessage.value = null
  try {
    const apiBase = localStorage.getItem('api_base_url') || getApiUrl()
    const response = await fetch(`${apiBase}/api/golden/finalize/${courseCode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
      body: JSON.stringify({ target_seeds: goldenTargetSeeds.value })
    })
    const result = await response.json()
    if (result.success) {
      goldenStatusMessage.value = { ok: true, text: result.message }
      goldenFinalized.value = true
    } else {
      goldenStatusMessage.value = { ok: false, text: result.error || 'Failed to finalize' }
    }
  } catch (err) {
    goldenStatusMessage.value = { ok: false, text: err.message }
  } finally {
    goldenFinalizing.value = false
  }
}

// Polling
let pollInterval = null

function startPolling() {
  if (pollInterval) return
  isPolling.value = true
  fetchProgress()
  pollInterval = setInterval(fetchProgress, 3000)
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
  isPolling.value = false
}

// Load languages from API
async function loadLanguages() {
  languagesLoading.value = true
  try {
    const apiBase = localStorage.getItem('api_base_url') || getApiUrl()
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
onMounted(() => {
  startPolling()
  if (isCreateMode.value) {
    loadLanguages()
  } else {
    fetchGenderPrepStatus()
  }
})

onUnmounted(() => {
  stopPolling()
})
</script>

<style scoped>
.text-generation {
  min-height: 100vh;
  background: var(--color-shadow, #1e293b);
}

.pipeline-card {
  background: rgba(30, 41, 59, 0.3);
  border: 1px solid;
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  transition: all 0.2s;
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

.stage-badge-locked {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.125rem 0.5rem;
  border-radius: 0.25rem;
  background: rgba(71, 85, 105, 0.3);
  color: rgb(148, 163, 184);
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
  background: var(--color-graphite, #475569);
  border-radius: 3px;
}
</style>
