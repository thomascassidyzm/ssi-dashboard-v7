<template>
  <div class="min-h-screen bg-slate-900">
    <!-- Header -->
    <header class="bg-slate-800/50 border-b border-slate-400/10 backdrop-blur-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div class="flex items-start justify-between mb-4">
          <router-link to="/" class="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition">
            <span>←</span>
            <span>Back to Dashboard</span>
          </router-link>
          <button
            v-if="errorMessage && courseCode"
            @click="clearStuckJob"
            class="bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-400 text-sm font-semibold px-4 py-2 rounded-lg transition"
          >
            🔧 Clear Stuck Job
          </button>
        </div>
        <h1 class="text-3xl font-bold text-emerald-400">
          Generate New Course
        </h1>
        <p class="mt-2 text-slate-400">
          Popty v9.0.0 - SSi Course Production Dashboard
        </p>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      <!-- Generation Form -->
      <div v-if="!isGenerating && !isCompleted" class="bg-slate-800/50 rounded-lg border border-slate-400/20 p-8">
        <h2 class="text-2xl font-semibold text-slate-100 mb-6">Select Language Pair</h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <!-- Known Language -->
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">
              Known Language (Learning FROM)
            </label>
            <select
              v-model="knownLanguage"
              :disabled="languagesLoading"
              class="w-full bg-slate-700 border border-slate-400/20 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
            >
              <option value="" disabled>{{ languagesLoading ? 'Loading...' : 'Select known language' }}</option>
              <option
                v-for="lang in knownLanguages"
                :key="lang.code"
                :value="lang.code"
              >
                {{ lang.name }} ({{ lang.code }}) - {{ lang.native }}
              </option>
            </select>
          </div>

          <!-- Target Language -->
          <div>
            <label class="block text-sm font-medium text-slate-300 mb-2">
              Target Language (Learning TO)
            </label>
            <select
              v-model="targetLanguage"
              :disabled="languagesLoading"
              class="w-full bg-slate-700 border border-slate-400/20 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
            >
              <option value="" disabled>{{ languagesLoading ? 'Loading...' : 'Select target language' }}</option>
              <option
                v-for="lang in targetLanguages"
                :key="lang.code"
                :value="lang.code"
              >
                {{ lang.name }} ({{ lang.code }}) - {{ lang.native }}
              </option>
            </select>
          </div>
        </div>

        <!-- Analyze Course Button -->
        <div v-if="!analysis && knownLanguage && targetLanguage" class="mb-8">
          <button
            @click="analyzeCourse"
            :disabled="analyzing"
            class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-lg shadow-lg transition hover:-translate-y-0.5"
          >
            <span v-if="analyzing">Analyzing Course...</span>
            <span v-else>Analyze Course & Get Smart Recommendations</span>
          </button>
        </div>

        <!-- Analysis Loading -->
        <div v-if="analyzing" class="mb-8 text-center py-8">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
          <p class="text-slate-400 mt-3">Analyzing course progress...</p>
        </div>

        <!-- Smart Recommendations -->
        <div v-if="analysis && !isGenerating" class="mb-8">
          <div class="bg-slate-700/50 rounded-lg border border-slate-400/20 p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-medium text-slate-100">🎯 Smart Options</h3>
              <button
                @click="analysis = null"
                class="text-slate-400 hover:text-slate-300 text-sm"
              >
                ✕ Clear
              </button>
            </div>

            <!-- Course Status -->
            <div class="mb-6 p-4 bg-slate-800/50 rounded-lg">
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span class="text-slate-400">Phase 1 (Draft LEGOs):</span>
                  <span class="ml-2 font-semibold" :class="analysis.seed_pairs.exists ? 'text-green-400' : 'text-red-400'">
                    {{ analysis.seed_pairs.exists ? `✓ ${analysis.seed_pairs.count} seeds` : '✗ Missing' }}
                  </span>
                </div>
                <div>
                  <span class="text-slate-400">Phase 2 (lego_pairs.json):</span>
                  <span class="ml-2 font-semibold" :class="analysis.lego_pairs.exists ? 'text-green-400' : 'text-red-400'">
                    {{ analysis.lego_pairs.exists ? `✓ ${analysis.lego_pairs.count} LEGOs` : '✗ Missing' }}
                  </span>
                </div>
                <div v-if="analysis.baskets">
                  <span class="text-slate-400">Phase 3 (Baskets):</span>
                  <span class="ml-2 font-semibold" :class="analysis.lego_pairs.exists && analysis.baskets.missing_seeds === 0 ? 'text-green-400' : 'text-amber-400'">
                    {{ !analysis.lego_pairs.exists ? '⚠️ Requires Phase 2' : (analysis.baskets.missing_seeds === 0 ? '✓ Complete' : `⚠️ ${analysis.baskets.missing_seeds} seeds missing`) }}
                  </span>
                </div>
              </div>
              <div v-if="analysis.lego_pairs.missing && analysis.lego_pairs.missing.length > 0" class="mt-3 text-sm text-amber-400">
                ⚠️  {{ analysis.lego_pairs.missing.length }} seeds missing LEGOs
              </div>
            </div>

            <!-- Recommendations -->
            <div class="space-y-3">
              <button
                v-for="rec in analysis.recommendations"
                :key="rec.title"
                @click="selectRecommendation(rec)"
                class="w-full text-left p-4 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-600 hover:border-emerald-500 rounded-lg transition group"
              >
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-1">
                      <span v-if="rec.type === 'test'" class="text-xl">✨</span>
                      <span v-else-if="rec.type === 'resume-baskets'" class="text-xl">📦</span>
                      <span v-else-if="rec.type === 'resume'" class="text-xl">📝</span>
                      <span v-else-if="rec.type === 'full'" class="text-xl">🚀</span>
                      <span v-else class="text-xl">➡️</span>
                      <span class="font-semibold text-slate-100 group-hover:text-emerald-400 transition">
                        {{ rec.title }}
                      </span>
                    </div>
                    <p class="text-sm text-slate-400 ml-7">{{ rec.description }}</p>
                    <p v-if="rec.action.phases" class="text-xs text-emerald-500 ml-7 mt-1">
                      Phase {{ rec.phase }} only (intelligent resume - missing baskets)
                    </p>
                    <p v-else class="text-xs text-slate-500 ml-7 mt-1">
                      Seeds {{ rec.action.startSeed }}-{{ rec.action.endSeed }}
                      ({{ rec.action.endSeed - rec.action.startSeed + 1 }} seeds)
                    </p>
                  </div>
                  <span class="text-emerald-400 opacity-0 group-hover:opacity-100 transition">→</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        <!-- Execution Mode Selection -->
        <ExecutionModeSelector v-model="executionMode" />

        <!-- Course Size Selection -->
        <div v-if="!analysis" class="mb-8">

          <!-- Quick Presets -->
          <div class="mb-6">
            <h3 class="text-lg font-medium text-slate-300 mb-3">Course Size</h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <!-- 30 Seeds Test -->
              <button
                @click="selectPreset('test')"
                :class="[
                  'p-4 rounded-lg border-2 text-left transition-all',
                  selectedPreset === 'test'
                    ? 'bg-emerald-500/20 border-emerald-500 ring-2 ring-emerald-500/50'
                    : 'bg-slate-800/50 border-slate-600 hover:border-slate-500'
                ]"
              >
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-2xl">🧪</span>
                  <span class="font-semibold text-slate-100">30 Seeds (Test)</span>
                </div>
                <div class="text-sm text-slate-400">
                  <div>6 tabs × 5 workers × 1 seed</div>
                  <div class="text-emerald-400">~10-15 minutes</div>
                </div>
              </button>

              <!-- 668 Seeds Full -->
              <button
                @click="selectPreset('full')"
                :class="[
                  'p-4 rounded-lg border-2 text-left transition-all',
                  selectedPreset === 'full'
                    ? 'bg-emerald-500/20 border-emerald-500 ring-2 ring-emerald-500/50'
                    : 'bg-slate-800/50 border-slate-600 hover:border-slate-500'
                ]"
              >
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-2xl">🚀</span>
                  <span class="font-semibold text-slate-100">668 Seeds (Full)</span>
                </div>
                <div class="text-sm text-slate-400">
                  <div>15 tabs × 15 workers × 3 seeds</div>
                  <div class="text-blue-400">~2-3 hours</div>
                </div>
              </button>

              <!-- Custom -->
              <button
                @click="selectPreset('custom')"
                :class="[
                  'p-4 rounded-lg border-2 text-left transition-all',
                  selectedPreset === 'custom'
                    ? 'bg-emerald-500/20 border-emerald-500 ring-2 ring-emerald-500/50'
                    : 'bg-slate-800/50 border-slate-600 hover:border-slate-500'
                ]"
              >
                <div class="flex items-center gap-2 mb-2">
                  <span class="text-2xl">⚙️</span>
                  <span class="font-semibold text-slate-100">Custom Range</span>
                </div>
                <div class="text-sm text-slate-400">
                  <div>Specify seed range</div>
                  <div class="text-slate-500">Advanced users</div>
                </div>
              </button>
            </div>
          </div>

          <!-- Custom Range Input (only when custom selected) -->
          <div v-if="selectedPreset === 'custom'" class="mb-6 p-4 bg-slate-800/50 rounded-lg border border-slate-600">
            <div class="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label class="block text-xs font-medium text-slate-400 mb-1">Start Seed</label>
                <input
                  v-model.number="startSeed"
                  type="number"
                  min="1"
                  max="668"
                  class="w-full bg-slate-700 border border-slate-500 rounded px-3 py-2 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-400 mb-1">End Seed</label>
                <input
                  v-model.number="endSeed"
                  type="number"
                  min="1"
                  max="668"
                  class="w-full bg-slate-700 border border-slate-500 rounded px-3 py-2 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
            </div>
            <div v-if="startSeed && endSeed" class="text-xs text-emerald-400">
              ✓ {{ seedCount }} seeds (S{{ String(startSeed).padStart(4, '0') }}-S{{ String(endSeed).padStart(4, '0') }})
            </div>
          </div>

          <!-- Model Selection for Benchmarking -->
          <div class="mb-6">
            <h3 class="text-lg font-medium text-slate-300 mb-3">Model Selection</h3>
            <div class="grid grid-cols-3 gap-3">
              <button
                v-for="model in modelOptions"
                :key="model.value"
                @click="selectedModel = model.value"
                :class="[
                  'p-3 rounded-lg border-2 text-left transition-all',
                  selectedModel === model.value
                    ? 'bg-purple-500/20 border-purple-500 ring-2 ring-purple-500/50'
                    : 'bg-slate-800/50 border-slate-600 hover:border-slate-500'
                ]"
              >
                <div class="font-semibold text-slate-100 text-sm">{{ model.label }}</div>
                <div class="text-xs text-slate-400 mt-1">
                  <span class="text-purple-400">{{ model.speed }}</span> · {{ model.quality }}
                </div>
              </button>
            </div>
            <div class="mt-3 p-3 bg-purple-900/20 rounded-lg border border-purple-500/30">
              <div class="flex items-start gap-2">
                <span class="text-purple-400">⚡</span>
                <div class="text-sm">
                  <p class="text-purple-300 font-medium">Before starting, set your model in Claude Code on Web:</p>
                  <p class="text-slate-400 text-xs mt-1">Settings → Model → Select <strong class="text-purple-300">{{ modelOptions.find(m => m.value === selectedModel)?.label }}</strong></p>
                </div>
              </div>
            </div>
            <p class="text-xs text-slate-500 mt-2">
              Course will be saved as: <code class="text-purple-400">{{ targetLanguage }}_for_{{ knownLanguage }}_{{ selectedModel }}_test</code>
            </p>
          </div>

          <!-- Execution Plan -->
          <div class="mb-6 p-4 bg-blue-900/20 rounded-lg border border-blue-500/30">
            <h4 class="font-medium text-blue-300 mb-3">📋 Execution Plan</h4>
            <div class="space-y-2 text-sm">
              <div class="flex items-start gap-2">
                <span class="text-blue-400">Phase 1:</span>
                <span class="text-slate-300">{{ parallelConfig.tabs }} Safari tabs × {{ parallelConfig.workers }} Claude agents ({{ seedCount }} seeds total)</span>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-blue-400">Phase 2:</span>
                <span class="text-slate-300">Collision resolution + LEGO reuse tracking (automatic)</span>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-amber-400">Checkpoint:</span>
                <span class="text-slate-300">Review validation before Phase 3</span>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-blue-400">Phase 3:</span>
                <span class="text-slate-300">Basket generation</span>
              </div>
            </div>
            <div class="mt-3 p-2 bg-amber-900/20 rounded border border-amber-500/30 text-xs text-amber-300">
              ⚠️ Make sure Safari is open and logged into Claude Pro with Max mode enabled
            </div>
          </div>

          <!-- Phase Selection (advanced) -->
          <div class="mb-6">
            <label class="block text-xs font-medium text-slate-400 mb-1">Phases to Run</label>
            <select
              v-model="phaseSelection"
              class="w-full bg-slate-700 border border-slate-500 rounded px-3 py-2 text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="all">All Phases (1 → 2 → 3)</option>
              <option value="phase1">Phase 1 Only (Translation + LEGO Extraction)</option>
              <option value="phase2">Phase 2 Only (Conflict Resolution)</option>
              <option value="phase3">Phase 3 Only (Basket Generation)</option>
            </select>
            <p class="text-xs text-slate-500 mt-1">
              <span v-if="phaseSelection === 'phase2'">⚠️ Requires draft_lego_pairs.json from Phase 1</span>
              <span v-else-if="phaseSelection === 'phase3'">⚠️ Requires lego_pairs.json from Phase 2</span>
            </p>
          </div>

          <!-- Generate Button -->
          <div class="flex gap-4">
            <button
              @click="startGeneration"
              :disabled="!startSeed || !endSeed || startSeed > endSeed"
              class="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold px-8 py-4 rounded-lg shadow-lg transition hover:-translate-y-0.5"
            >
              <span v-if="startSeed && endSeed">Generate Course ({{ seedCount }} seeds: {{ startSeed }}-{{ endSeed }})</span>
              <span v-else>Enter Seed Range</span>
            </button>

            <button
              @click="clearJob"
              :disabled="clearingJob || !targetLanguage || !knownLanguage"
              class="bg-amber-500 hover:bg-amber-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold px-6 py-4 rounded-lg shadow-lg transition hover:-translate-y-0.5"
              title="Clear stuck jobs for this course (all phases)"
            >
              {{ clearingJob ? 'Clearing...' : '🔄 Reset Jobs' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Progress Monitor -->
      <div v-if="isGenerating || isCompleted" class="space-y-6">
        <!-- Friendly Pipeline Progress -->
        <PipelineProgress
          v-if="courseCode && !isCompleted"
          :course-code="courseCode"
          :current-phase="currentPhaseNumber"
          :seeds-processed="seedsProcessed"
          :total-seeds="seedCount"
          :started-at="generationStartedAt"
        />

        <!-- Completion Card -->
        <div v-if="isCompleted" class="bg-slate-800/50 rounded-lg border border-emerald-500/30 p-8">
          <div class="flex items-center gap-4 mb-4">
            <div class="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <svg class="w-6 h-6 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
              </svg>
            </div>
            <div>
              <h2 class="text-2xl font-semibold text-emerald-400">Course Ready!</h2>
              <p class="text-slate-400">{{ courseCode }} • {{ seedCount }} seeds</p>
            </div>
          </div>
        </div>

        <!-- Legacy ProgressMonitor (hidden, keeps polling working) -->
        <ProgressMonitor
          v-if="courseCode"
          :courseCode="courseCode"
          :executionMode="executionMode"
          :seedCount="seedCount"
          class="hidden"
        />

        <!-- Actions -->
        <div v-if="isCompleted" class="mt-8 space-y-4">
          <!-- Extend Button (if applicable) -->
          <div v-if="canExtendCourse" class="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div class="flex items-start gap-3">
              <div class="text-blue-400 text-xl">🚀</div>
              <div class="flex-1">
                <p class="font-medium text-blue-400 mb-1">Ready to Extend?</p>
                <p class="text-sm text-slate-300 mb-3">
                  Your {{ endSeed }} seed course is complete! Extend it to the full 668 seeds without regenerating existing work.
                </p>
                <button
                  @click="extendToFullCourse"
                  class="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition hover:-translate-y-0.5"
                >
                  🎯 Extend to Full Course (668 Seeds)
                </button>
              </div>
            </div>
          </div>

          <!-- Standard Actions -->
          <div class="flex gap-4">
            <button
              @click="startNew"
              class="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 rounded-lg transition hover:-translate-y-0.5"
            >
              Generate Another Course
            </button>
            <button
              @click="pushToGitHub"
              :disabled="pushing"
              class="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-lg transition hover:-translate-y-0.5"
              title="Push course data to GitHub (Vercel will auto-deploy)"
            >
              <span v-if="pushing">Pushing...</span>
              <span v-else>📤 Push to GitHub</span>
            </button>
            <button
              @click="viewCourse"
              class="bg-slate-600 hover:bg-slate-700 text-white font-semibold px-6 py-3 rounded-lg transition hover:-translate-y-0.5"
            >
              View Course Files
            </button>
          </div>
        </div>

        <!-- Error Message -->
        <div v-if="errorMessage" class="mt-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
          <div class="flex items-start justify-between gap-4">
            <p class="text-red-400 flex-1">{{ errorMessage }}</p>
            <button
              v-if="courseCode"
              @click="clearStuckJob"
              class="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition whitespace-nowrap"
            >
              Clear Stuck Job
            </button>
          </div>
        </div>
      </div>

    </main>

    <!-- Phase 2 Checkpoint Modal -->
    <div
      v-if="showPhase2Checkpoint"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <div class="bg-slate-800 border border-emerald-500/30 rounded-lg max-w-lg w-full shadow-2xl">
        <div class="p-6">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <span class="text-xl">✅</span>
            </div>
            <div>
              <h3 class="text-xl font-semibold text-emerald-400">Phase 2 Complete</h3>
              <p class="text-sm text-slate-400">Review validation before Phase 3</p>
            </div>
          </div>

          <div class="space-y-4 mb-6">
            <!-- Collision Resolution -->
            <div class="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
              <h4 class="text-sm font-medium text-slate-300 mb-2">Collision Resolution</h4>
              <div class="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span class="text-slate-400">Collisions detected:</span>
                  <span class="ml-2 font-semibold text-amber-400">{{ phase2ValidationStats.collisions.detected }}</span>
                </div>
                <div>
                  <span class="text-slate-400">Upchunks created:</span>
                  <span class="ml-2 font-semibold text-emerald-400">{{ phase2ValidationStats.collisions.resolved }}</span>
                </div>
              </div>
              <div v-if="phase2ValidationStats.collisions.detected === phase2ValidationStats.collisions.resolved" class="mt-2 text-xs text-emerald-400">
                ✓ All collisions resolved
              </div>
            </div>

            <!-- LEGO Reuse Tracking -->
            <div class="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
              <h4 class="text-sm font-medium text-slate-300 mb-2">LEGO Reuse Tracking</h4>
              <div class="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span class="text-slate-400">Total LEGOs:</span>
                  <span class="ml-2 font-semibold text-slate-100">{{ phase2ValidationStats.reuseTracking.totalLegos }}</span>
                </div>
                <div>
                  <span class="text-slate-400">Unique (new: true):</span>
                  <span class="ml-2 font-semibold text-emerald-400">{{ phase2ValidationStats.reuseTracking.uniqueLegos }}</span>
                </div>
                <div>
                  <span class="text-slate-400">Reused (new: false):</span>
                  <span class="ml-2 font-semibold text-blue-400">{{ phase2ValidationStats.reuseTracking.reusedLegos }}</span>
                </div>
                <div>
                  <span class="text-slate-400">Reuse rate:</span>
                  <span class="ml-2 font-semibold text-purple-400">{{ phase2ValidationStats.reuseTracking.reuseRate }}%</span>
                </div>
              </div>
            </div>

            <!-- Validation -->
            <div class="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
              <h4 class="text-sm font-medium text-slate-300 mb-2">Validation</h4>
              <div class="space-y-1 text-sm">
                <div class="flex items-center gap-2">
                  <span :class="phase2ValidationStats.validation.completeBreakdowns ? 'text-emerald-400' : 'text-red-400'">
                    {{ phase2ValidationStats.validation.completeBreakdowns ? '✓' : '✗' }}
                  </span>
                  <span class="text-slate-300">All seeds have complete breakdowns</span>
                </div>
                <div class="flex items-center gap-2">
                  <span :class="phase2ValidationStats.validation.allTilesValidate ? 'text-emerald-400' : 'text-red-400'">
                    {{ phase2ValidationStats.validation.allTilesValidate ? '✓' : '✗' }}
                  </span>
                  <span class="text-slate-300">All tiling validates</span>
                </div>
                <div class="flex items-center gap-2">
                  <span :class="phase2ValidationStats.validation.noFdViolations ? 'text-emerald-400' : 'text-red-400'">
                    {{ phase2ValidationStats.validation.noFdViolations ? '✓' : '✗' }}
                  </span>
                  <span class="text-slate-300">No FD violations</span>
                </div>
              </div>
            </div>
          </div>

          <div class="flex gap-3 justify-end">
            <button
              @click="viewLegoPairs"
              class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
            >
              View lego_pairs.json
            </button>
            <button
              @click="continueToPhase3"
              class="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium"
            >
              Continue to Phase 3 →
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Push to GitHub Confirmation Modal -->
    <div
      v-if="showPushModal"
      class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      @click.self="showPushModal = false"
    >
      <div class="bg-slate-800 border border-slate-700 rounded-lg max-w-lg w-full shadow-2xl">
        <div class="p-6">
          <h3 class="text-xl font-semibold text-emerald-400 mb-4">📤 Push to GitHub?</h3>

          <div class="mb-6 space-y-3">
            <p class="text-slate-300">
              Push <strong class="text-emerald-400">{{ courseCode }}</strong> course data to GitHub.
            </p>

            <div class="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
              <p class="text-sm font-medium text-slate-400 mb-2">What happens next:</p>
              <ul class="text-sm text-slate-300 space-y-1">
                <li>✓ Commits <code class="text-emerald-400">{{ courseCode }}/</code> changes</li>
                <li>✓ Pushes to <code class="text-emerald-400">main</code> branch</li>
                <li>✓ Triggers Vercel deployment (~30s)</li>
                <li>✓ Dashboard shows latest data</li>
              </ul>
            </div>

            <p class="text-xs text-slate-500">
              Note: If no changes exist, this will skip the commit.
            </p>
          </div>

          <div class="flex gap-3 justify-end">
            <button
              @click="showPushModal = false"
              class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              @click="confirmPush"
              :disabled="pushing"
              class="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition-colors font-medium"
            >
              <span v-if="pushing">Pushing...</span>
              <span v-else>Push to GitHub</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'vue-toastification'
import api, { apiClient } from '../services/api'
import ExecutionModeSelector from '../components/ExecutionModeSelector.vue'
import ProgressMonitor from '../components/ProgressMonitor.vue'
import PipelineProgress from '../components/PipelineProgress.vue'

const router = useRouter()
const route = useRoute()
const toast = useToast()

// State - initialize from query params if provided (from Course Editor link)
const knownLanguage = ref(route.query.known || 'eng')
const targetLanguage = ref(route.query.target || 'gle')
const startSeed = ref(1)
const endSeed = ref(30)
const executionMode = ref('web') // 'local', 'api', or 'web'
const phaseSelection = ref('all') // 'all', 'phase1', 'phase2', 'phase3', 'manifest'

// Model selection for benchmarking
const selectedModel = ref('sonnet') // 'haiku', 'sonnet', 'opus'
const modelOptions = [
  { value: 'haiku', label: 'Haiku 3.5', suffix: 'haiku', speed: 'Fastest', quality: 'Good' },
  { value: 'sonnet', label: 'Sonnet 4', suffix: 'sonnet', speed: 'Fast', quality: 'Great' },
  { value: 'opus', label: 'Opus 4', suffix: 'opus', speed: 'Slower', quality: 'Best' }
]

// Parallelization config
const selectedPreset = ref('test') // 'test', 'full', 'custom'
const parallelConfig = ref({
  tabs: 6,
  workers: 5,
  seedsPerWorker: 1
})

// Presets
const presets = {
  test: {
    label: '30 Seeds (Test)',
    icon: '🧪',
    seeds: 30,
    tabs: 6,
    workers: 5,
    seedsPerWorker: 1,
    estimate: '~10-15 minutes'
  },
  full: {
    label: '668 Seeds (Full)',
    icon: '🚀',
    seeds: 668,
    tabs: 15,
    workers: 15,
    seedsPerWorker: 3,
    estimate: '~2-3 hours'
  }
}

const targetLanguages = ref([])
const knownLanguages = ref([])
const languagesLoading = ref(false)

const isGenerating = ref(false)
const isCompleted = ref(false)
const courseCode = ref(null)
const currentPhase = ref('initializing')
const progress = ref(0)
const errorMessage = ref('')
const clearingJob = ref(false)
const pushing = ref(false)
const showPushModal = ref(false)

// Phase 2 Checkpoint
const showPhase2Checkpoint = ref(false)
const phase2ValidationStats = ref({
  collisions: { detected: 0, resolved: 0 },
  reuseTracking: { totalLegos: 0, uniqueLegos: 0, reusedLegos: 0, reuseRate: 0 },
  validation: { completeBreakdowns: true, allTilesValidate: true, noFdViolations: true }
})

// Enhanced tracking from phase servers
const phaseDetails = ref(null)
const estimatedCompletion = ref(null)

// Smart Resume
const analyzing = ref(false)
const analysis = ref(null)
const showManualInput = ref(false)

let pollInterval = null

// Phase names for UI (APML v9.0)
const phaseNames = [
  { id: 0, name: 'Phase 1: Translation + LEGO Extraction (Swarm)' },
  { id: 1, name: 'Phase 2: Conflict Resolution (Upchunking)' },
  { id: 2, name: 'Phase 3: Basket Generation' },
  { id: 3, name: 'Manifest: Course Compilation (Script)' },
  { id: 4, name: 'Audio: TTS Generation' }
]

// Computed
const seedCount = computed(() => {
  return endSeed.value - startSeed.value + 1
})

const currentPhaseIndex = computed(() => {
  const phase = currentPhase.value
  if (phase === 'initializing') return -1
  if (phase.includes('phase_1')) return 0
  if (phase.includes('phase_2')) return 1
  if (phase.includes('phase_3')) return 2
  if (phase.includes('manifest') || phase === 'compilation') return 3
  if (phase.includes('audio') || phase === 'tts') return 4
  if (phase === 'completed') return 5
  return -1
})

// For PipelineProgress component
const currentPhaseNumber = computed(() => {
  const phase = currentPhase.value.toLowerCase()
  // Handle both "Phase 2" and "phase_2" formats
  if (phase.includes('phase 1') || phase.includes('phase_1') || phase === '1') return 1
  if (phase.includes('phase 2') || phase.includes('phase_2') || phase === '2') return 2
  if (phase.includes('phase 3') || phase.includes('phase_3') || phase === '3') return 3
  if (phase.includes('manifest') || phase === 'compilation') return 'manifest'
  if (phase.includes('audio') || phase === 'tts') return 'audio'
  return 1 // default to phase 1
})

const seedsProcessed = computed(() => {
  // Extract from phaseDetails if available
  if (phaseDetails.value?.milestones?.branchesDetected) {
    // Rough estimate: assume ~20 seeds per branch
    return phaseDetails.value.milestones.branchesDetected * 20
  }
  if (phaseDetails.value?.seedsCompleted) {
    return phaseDetails.value.seedsCompleted
  }
  // If phase is complete, show all seeds
  if (currentPhaseIndex.value > 0) {
    return seedCount.value
  }
  return 0
})

const generationStartedAt = ref(null)

const canExtendCourse = computed(() => {
  // Show extend button if:
  // 1. Course is completed
  // 2. End seed is less than 668 (full course)
  // 3. Start seed was 1 (started from beginning)
  return isCompleted.value && endSeed.value < 668 && startSeed.value === 1
})

// Methods
// Fetch languages from API
const loadLanguages = async () => {
  languagesLoading.value = true
  try {
    const response = await apiClient.get('/api/languages')
    targetLanguages.value = response.data
    knownLanguages.value = response.data
  } catch (error) {
    console.error('Failed to load languages:', error)
    // Fallback to basic list
    const fallback = [
      { code: 'eng', name: 'English', native: 'English' },
      { code: 'ita', name: 'Italian', native: 'Italiano' },
      { code: 'spa', name: 'Spanish', native: 'Español' },
      { code: 'fra', name: 'French', native: 'Français' },
      { code: 'cym', name: 'Welsh', native: 'Cymraeg' },
      { code: 'gle', name: 'Irish', native: 'Gaeilge' }
    ]
    targetLanguages.value = fallback
    knownLanguages.value = fallback
  } finally {
    languagesLoading.value = false
  }
}

const selectPreset = (presetKey) => {
  selectedPreset.value = presetKey
  if (presetKey === 'custom') {
    // Keep current values for custom
    return
  }
  const preset = presets[presetKey]
  startSeed.value = 1
  endSeed.value = preset.seeds
  parallelConfig.value = {
    tabs: preset.tabs,
    workers: preset.workers,
    seedsPerWorker: preset.seedsPerWorker
  }
}

const analyzeCourse = async () => {
  try {
    analyzing.value = true
    errorMessage.value = ''

    const code = `${targetLanguage.value}_for_${knownLanguage.value}`
    const response = await apiClient.get(`/api/courses/${code}/analyze`)

    analysis.value = response.data
  } catch (error) {
    console.error('Failed to analyze course:', error)

    // If course doesn't exist, that's okay - show recommendations anyway
    if (error.response?.status === 404) {
      analysis.value = {
        courseCode: `${targetLanguage.value}_for_${knownLanguage.value}`,
        exists: false,
        seed_pairs: { exists: false },
        lego_pairs: { exists: false },
        recommendations: [
          {
            type: 'test',
            phase: 3,
            title: 'Test Run: First 50 Seeds',
            description: 'Test the pipeline on 50 seeds before full run',
            action: { startSeed: 1, endSeed: 50 }
          },
          {
            type: 'full',
            phase: 3,
            title: 'Full Run: All 668 Seeds',
            description: 'Generate complete course',
            action: { startSeed: 1, endSeed: 668 }
          }
        ]
      }
    } else {
      errorMessage.value = 'Failed to analyze course'
    }
  } finally {
    analyzing.value = false
  }
}

const selectRecommendation = (rec) => {
  startSeed.value = rec.action.startSeed
  if (rec.action.count) {
    // Quick test with random seeds
    endSeed.value = rec.action.startSeed + rec.action.count - 1
  } else {
    endSeed.value = rec.action.endSeed
  }

  // Handle phase-specific recommendations (e.g., Phase 5 only)
  if (rec.action.phases && rec.action.phases.includes('phase5')) {
    phaseSelection.value = 'phase5'
  } else {
    phaseSelection.value = 'all'
  }

  // Pass force flag from recommendation
  const force = rec.action.force || false
  startGeneration(force)
}

const extendToFullCourse = async () => {
  // Confirm with user
  const confirmed = confirm(
    `🚀 Extend to Full Course?\n\n` +
    `This will extend your existing ${endSeed.value}-seed course to 668 seeds.\n\n` +
    `✅ Keeps existing work (seeds 1-${endSeed.value})\n` +
    `✅ Only generates new content (seeds ${endSeed.value + 1}-668)\n` +
    `⏱️  Estimated time: ~2-3 hours\n\n` +
    `Continue?`
  )

  if (!confirmed) {
    return
  }

  // Update seed range to full course
  startSeed.value = 1
  endSeed.value = 668

  // Reset state and restart generation
  isCompleted.value = false
  isGenerating.value = true
  generationStartedAt.value = new Date().toISOString()
  currentPhase.value = 'initializing'
  progress.value = 0
  errorMessage.value = ''

  // Start generation (backend will detect existing work and extend)
  await startGeneration()
}

const clearJob = async () => {
  if (!targetLanguage.value || !knownLanguage.value) {
    errorMessage.value = 'Please select languages first'
    return
  }

  clearingJob.value = true
  errorMessage.value = ''

  try {
    const code = `${targetLanguage.value}_for_${knownLanguage.value}`
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'
    const headers = {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true'
    }

    // Clear jobs from all phases (1, 3, 5)
    // Phase 1 & 3 use /stop, Phase 5 uses /abort
    const clearPromises = [
      fetch(`${baseUrl}/phase1/stop/${code}`, { method: 'POST', headers }).catch(() => null),
      fetch(`${baseUrl}/phase3/stop/${code}`, { method: 'POST', headers }).catch(() => null),
      fetch(`${baseUrl}/phase5/abort/${code}`, { method: 'POST', headers }).catch(() => null)
    ]

    const results = await Promise.all(clearPromises)
    const cleared = []

    for (let i = 0; i < results.length; i++) {
      if (results[i] && results[i].ok) {
        const data = await results[i].json()
        if (data.success) cleared.push(`Phase ${[1, 3, 5][i]}`)
      }
    }

    if (cleared.length > 0) {
      console.log('✅ Jobs cleared:', cleared.join(', '))
      toast.success(`✅ Cleared jobs: ${cleared.join(', ')}`)
    } else {
      console.log('ℹ️ No active jobs found to clear')
      toast.info('No active jobs found')
    }

    // Reset UI state
    isGenerating.value = false
    isCompleted.value = false
    currentPhase.value = 'initializing'
    progress.value = 0
    generationStartedAt.value = null

  } catch (error) {
    console.error('Failed to clear job:', error)
    errorMessage.value = `Failed to clear job: ${error.message}`
  } finally {
    clearingJob.value = false
  }
}

const startGeneration = async (force = false) => {
  try {
    errorMessage.value = ''
    isGenerating.value = true
    generationStartedAt.value = new Date().toISOString()

    const response = await api.course.generate({
      target: targetLanguage.value,
      known: knownLanguage.value,
      startSeed: startSeed.value,
      endSeed: endSeed.value,
      executionMode: executionMode.value,
      phaseSelection: phaseSelection.value,
      force: force,
      modelSuffix: `${selectedModel.value}_test`  // Append model name for benchmarking
    })

    console.log('Course generation started:', response)
    courseCode.value = response.courseCode

    // Redirect to dedicated progress page (only for orchestrated pipelines)
    // Phase 5 standalone runs in browser windows (web mode) - no redirect needed
    if (phaseSelection.value === 'all' || phaseSelection.value === 'phase1') {
      router.push(`/courses/${response.courseCode}/progress`)
    } else {
      // For single-phase jobs (3, 5, 7), show inline message
      currentPhase.value = `Running ${phaseSelection.value}...`
      // Don't redirect - user watches browser windows for Phase 5
    }
  } catch (error) {
    console.error('Failed to start course generation:', error)

    // Handle "course already exists with data" warning (409 with existingFiles)
    if (error.response?.status === 409 && error.response?.data?.existingFiles) {
      const data = error.response.data
      const filesList = data.existingFiles.join(', ')

      const confirmed = confirm(
        `⚠️  Course "${data.courseCode}" already exists!\n\n` +
        `Existing files: ${filesList}\n\n` +
        `This will OVERWRITE all existing data.\n\n` +
        `Are you sure you want to proceed?`
      )

      if (confirmed) {
        // Retry with force=true
        startGeneration(true)
        return
      } else {
        errorMessage.value = 'Generation cancelled - course already exists'
        isGenerating.value = false
        return
      }
    }

    // Handle "job already in progress" error (409 with status)
    if (error.response?.status === 409 && error.response?.data?.courseCode) {
      courseCode.value = error.response.data.courseCode
      errorMessage.value = `Course generation already in progress for ${error.response.data.courseCode}. Click "Clear Stuck Job" to reset.`
      isGenerating.value = false
      return
    }

    errorMessage.value = error.response?.data?.error || 'Failed to start course generation. Check console for details.'
    isGenerating.value = false
  }
}

// Track previous phase to detect transitions
const previousPhase = ref(null)

const startPolling = (code) => {
  // Poll every 5 seconds for real-time updates
  pollInterval = setInterval(async () => {
    try {
      const status = await api.course.getStatus(code)
      const newPhase = status.currentPhase ? `Phase ${status.currentPhase}` : 'initializing'

      // Detect Phase 2 → Phase 3 transition (checkpoint moment)
      const wasPhase2 = previousPhase.value?.includes('2')
      const isPhase3OrLater = newPhase.includes('3') || newPhase.includes('manifest') || newPhase.includes('audio')

      if (wasPhase2 && isPhase3OrLater && !showPhase2Checkpoint.value) {
        // Phase 2 just completed - show checkpoint before continuing
        console.log('[CourseGeneration] Phase 2 completed - showing checkpoint')
        await fetchPhase2Stats()
        stopPolling()
        return
      }

      previousPhase.value = newPhase
      currentPhase.value = newPhase
      progress.value = status.progress || 0

      // Capture enhanced tracking
      if (status.phaseDetails) {
        phaseDetails.value = status.phaseDetails
      }

      // Capture estimated completion
      if (status.estimatedCompletion) {
        estimatedCompletion.value = status.estimatedCompletion
      }

      // Check if completed or error
      if (status.status === 'completed') {
        isCompleted.value = true
        isGenerating.value = false
        stopPolling()
      } else if (status.status === 'failed') {
        isGenerating.value = false
        stopPolling()
        errorMessage.value = status.error || 'Course generation failed'
      }
    } catch (error) {
      console.error('Failed to fetch course status:', error)
    }
  }, 5000) // Poll every 5 seconds
}

const stopPolling = () => {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

// Helper functions for formatting enhanced tracking data
const formatETA = (isoTimestamp) => {
  const eta = new Date(isoTimestamp)
  const now = new Date()
  const diffMs = eta - now
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'Less than 1m'
  if (diffMins < 60) return `${diffMins}m`

  const hours = Math.floor(diffMins / 60)
  const mins = diffMins % 60
  return `${hours}h ${mins}m`
}

const formatSeconds = (seconds) => {
  if (seconds < 60) return `${seconds}s`

  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60

  if (mins < 60) return `${mins}m ${secs}s`

  const hours = Math.floor(mins / 60)
  const remainingMins = mins % 60
  return `${hours}h ${remainingMins}m`
}

const formatTimestamp = (isoTimestamp) => {
  const time = new Date(isoTimestamp)
  const now = new Date()
  const diffMs = now - time
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'Just now'
  if (diffMins === 1) return '1 minute ago'
  if (diffMins < 60) return `${diffMins} minutes ago`

  const hours = Math.floor(diffMins / 60)
  if (hours === 1) return '1 hour ago'
  if (hours < 24) return `${hours} hours ago`

  const days = Math.floor(hours / 24)
  return days === 1 ? '1 day ago' : `${days} days ago`
}

const startNew = () => {
  isGenerating.value = false
  isCompleted.value = false
  courseCode.value = null
  currentPhase.value = 'initializing'
  progress.value = 0
  errorMessage.value = ''
  analysis.value = null
  showManualInput.value = false
}

const viewCourse = () => {
  alert(`Course files saved to: vfs/courses/${courseCode.value}`)
}

const clearStuckJob = async () => {
  if (!courseCode.value) {
    // If no courseCode, try to derive it from languages
    if (targetLanguage.value && knownLanguage.value) {
      courseCode.value = `${targetLanguage.value}_for_${knownLanguage.value}`
    } else {
      errorMessage.value = 'Cannot determine course code to clear'
      return
    }
  }

  try {
    console.log(`Clearing stuck job for: ${courseCode.value}`)
    await api.course.clearJob(courseCode.value)

    // Reset state
    errorMessage.value = ''
    isGenerating.value = false
    isCompleted.value = false
    stopPolling()

    console.log('Job cleared successfully - you can now retry generation')
  } catch (error) {
    console.error('Failed to clear job:', error)
    errorMessage.value = 'Failed to clear job: ' + (error.response?.data?.error || error.message)
  }
}

// Phase 2 Checkpoint methods
const fetchPhase2Stats = async () => {
  if (!courseCode.value) return

  try {
    const stats = await api.course.getPhase2Stats(courseCode.value)
    phase2ValidationStats.value = {
      collisions: stats.collisions,
      reuseTracking: stats.reuseTracking,
      validation: {
        completeBreakdowns: stats.validation.completeBreakdowns,
        allTilesValidate: stats.validation.allTilesValidate,
        noFdViolations: stats.validation.noFdViolations
      }
    }
    showPhase2Checkpoint.value = true
  } catch (error) {
    console.error('Failed to fetch Phase 2 stats:', error)
    // If fetch fails, show modal with placeholder data
    showPhase2Checkpoint.value = true
    toast.warning('Could not fetch Phase 2 stats - using placeholder data')
  }
}

const viewLegoPairs = () => {
  // Navigate to course editor to view lego_pairs
  if (courseCode.value) {
    router.push(`/courses/${courseCode.value}/edit`)
  }
}

const continueToPhase3 = async () => {
  showPhase2Checkpoint.value = false
  try {
    // Trigger Phase 3 continuation via orchestrator
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'
    const response = await fetch(`${baseUrl}/api/courses/${courseCode.value}/start-phase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({ phase: 3, totalSeeds: seedCount.value })
    })

    if (!response.ok) {
      throw new Error(`Failed to start Phase 3: ${response.statusText}`)
    }

    currentPhase.value = 'Phase 3'
    previousPhase.value = 'Phase 3'
    toast.success('Starting Phase 3...')

    // Resume polling for Phase 3 progress
    if (courseCode.value) {
      startPolling(courseCode.value)
    }
  } catch (error) {
    console.error('Failed to continue to Phase 3:', error)
    toast.error('Failed to start Phase 3')
  }
}

const pushToGitHub = () => {
  if (!courseCode.value) {
    toast.error('❌ No course selected')
    return
  }
  showPushModal.value = true
}

const confirmPush = async () => {
  pushing.value = true
  try {
    const response = await api.pushToGitHub(courseCode.value)

    if (response.skipped) {
      toast.info('ℹ️ No changes to push')
    } else {
      toast.success('✅ Course data pushed to GitHub! Vercel will deploy automatically.')
    }

    showPushModal.value = false
  } catch (err) {
    console.error('Failed to push to GitHub:', err)
    if (err.response?.status === 404) {
      toast.error('❌ Orchestrator doesn\'t support GitHub push. Make sure it\'s running and up to date.')
    } else if (err.message?.includes('Network Error') || err.code === 'ERR_NETWORK') {
      toast.error('❌ Cannot reach orchestrator.')
    } else {
      toast.error('❌ Failed to push to GitHub')
    }
  } finally {
    pushing.value = false
  }
}

// Lifecycle hooks
onMounted(async () => {
  await loadLanguages()
})

// Cleanup
onUnmounted(() => {
  stopPolling()
})
</script>
