<template>
  <div class="min-h-screen bg-canvas text-ink p-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <div class="flex items-center gap-4 mb-4">
          <router-link to="/" class="text-accent-2 hover:opacity-80 inline-flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
            </svg>
            Home
          </router-link>
          <span class="text-faint">•</span>
          <router-link to="/courses" class="text-accent-2 hover:opacity-80">
            Course Library
          </router-link>
        </div>
        <div v-if="course" class="flex items-start justify-between">
          <div>
            <h1 class="text-4xl font-bold text-accent-2 mb-2">
              {{ getCourseName(course.course_code) }}
            </h1>
            <p class="text-muted">
              <template v-if="course.isEmpty">
                {{ getCourseName(course.course_code) }} • <span class="text-accent">Ready to generate</span>
              </template>
              <template v-else>
                {{ course.total_seeds }} seeds • Version {{ course.version }}
              </template>
            </p>
          </div>
          <div class="flex items-center gap-3">
            <router-link
              :to="`/production/${courseCode}`"
              class="bg-amber-600 hover:bg-amber-500 text-white px-6 py-2 rounded-lg transition-colors font-semibold flex items-center gap-2"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"></path>
              </svg>
              Production Suite
            </router-link>
            <router-link
              :to="generatorLink"
              class="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg transition-colors font-semibold flex items-center gap-2"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              Course Generator
            </router-link>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <div class="text-muted">Loading course...</div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-900/20 border border-red-500/50 rounded-lg p-6">
        <h3 class="text-danger font-semibold mb-2">Error Loading Course</h3>
        <p class="text-ink">{{ error }}</p>
      </div>

      <!-- Empty Course State - Show Generator UI -->
      <div v-else-if="course?.isEmpty" class="space-y-6">
        <div class="bg-surface border border-emerald-500/50 rounded-lg p-8 text-center">
          <div class="text-6xl mb-4">🌱</div>
          <h2 class="text-2xl font-bold text-accent-2 mb-2">New Course Created</h2>
          <p class="text-muted mb-6 max-w-lg mx-auto">
            <strong>{{ getCourseName(course.course_code) }}</strong> has been created but has no content yet.
            Start the generation pipeline to create translations and LEGOs.
          </p>
          <div class="flex flex-col items-center gap-4">
            <router-link
              :to="generatorLink"
              class="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-lg transition-colors font-semibold text-lg flex items-center gap-3"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
              Start Course Generator
            </router-link>
            <p class="text-sm text-faint">
              This will run Phase 1 (Translation) → Phase 2 (LEGO Extraction) → Phase 3 (Basket Generation)
            </p>
          </div>
        </div>

        <!-- Course Info Card -->
        <div class="bg-surface border border-line rounded-lg p-6">
          <h3 class="text-lg font-semibold text-ink mb-4">Course Details</h3>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div class="text-faint">Code</div>
              <div class="text-ink font-mono">{{ course.course_code }}</div>
            </div>
            <div>
              <div class="text-faint">Target Language</div>
              <div class="text-ink">{{ getLanguageName(course.target_lang) }}</div>
            </div>
            <div>
              <div class="text-faint">Known Language</div>
              <div class="text-ink">{{ getLanguageName(course.known_lang) }}</div>
            </div>
            <div>
              <div class="text-faint">Status</div>
              <div class="text-accent">{{ course.status }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Course Content -->
      <div v-else-if="course" class="space-y-6">
        <!-- Stats Overview (from database counts) -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="bg-surface border border-line rounded-lg p-6">
            <div class="text-sm text-muted mb-1">SEED_PAIRS</div>
            <div class="text-3xl font-bold text-accent-2">{{ course.seed_pairs || 0 }}</div>
            <div class="text-xs text-faint mt-1">Seeds in database</div>
          </div>
          <div class="bg-surface border border-line rounded-lg p-6">
            <div class="text-sm text-muted mb-1">LEGO_PAIRS</div>
            <div class="text-3xl font-bold text-accent-2">{{ course.lego_pairs || 0 }}</div>
            <div class="text-xs text-faint mt-1">LEGOs in database</div>
          </div>
          <div class="bg-surface border border-line rounded-lg p-6">
            <div class="text-sm text-muted mb-1">LEGO_BASKETS</div>
            <div class="text-3xl font-bold text-accent-2">{{ course.lego_baskets || 0 }}</div>
            <div class="text-xs text-faint mt-1">Baskets in database</div>
          </div>
          <div class="bg-surface border border-line rounded-lg p-6">
            <div class="text-sm text-muted mb-1">INTRODUCTIONS</div>
            <div class="text-3xl font-bold text-accent-2">{{ course.amino_acids?.introductions || 0 }}</div>
            <div class="text-xs text-faint mt-1">Presentations in database</div>
          </div>
        </div>

        <!-- QC Flags Panel -->
        <div v-if="unresolvedFlags.length > 0" class="bg-surface border border-amber-500/50 rounded-lg p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-xl font-semibold text-accent flex items-center gap-2">
              🚩 QC Flags
              <span class="bg-amber-600 text-white text-sm px-2 py-0.5 rounded-full">
                {{ unresolvedFlags.length }}
              </span>
            </h3>
            <button
              @click="showFlagsExpanded = !showFlagsExpanded"
              class="text-muted hover:text-ink text-sm"
            >
              {{ showFlagsExpanded ? 'Collapse' : 'Expand' }}
            </button>
          </div>

          <div v-if="showFlagsExpanded" class="space-y-3">
            <div
              v-for="flag in unresolvedFlags"
              :key="flag.id"
              class="bg-canvas/50 border border-line rounded-lg p-4"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-2">
                    <span class="text-sm font-mono text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded">
                      {{ flag.seedId }}
                    </span>
                    <span v-if="flag.legoId" class="text-sm font-mono text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded">
                      {{ flag.legoId }}
                    </span>
                    <span class="text-xs text-faint bg-surface-2 px-2 py-0.5 rounded">
                      {{ flag.issueType }}
                    </span>
                  </div>
                  <div v-if="flag.suggestedCorrection" class="text-sm text-accent-2 mb-1">
                    💡 {{ flag.suggestedCorrection }}
                  </div>
                  <div v-if="flag.notes" class="text-sm text-muted">
                    {{ flag.notes }}
                  </div>
                  <div class="text-xs text-faint mt-2">
                    {{ new Date(flag.created).toLocaleDateString() }}
                  </div>
                </div>
                <button
                  @click="resolveFlag(flag.id)"
                  class="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded transition-colors"
                  title="Mark as resolved"
                >
                  ✓ Resolve
                </button>
              </div>
            </div>
          </div>

          <div v-else class="text-sm text-muted">
            {{ unresolvedFlags.length }} flag{{ unresolvedFlags.length !== 1 ? 's' : '' }} pending review
          </div>
        </div>

        <!-- Progress Monitor (shown when basket generation is active) -->
        <ProgressMonitor
          v-if="showProgressMonitor"
          :course-code="courseCode"
          :poll-interval="5000"
        />

        <!-- Validation & Fix Panel -->
        <div v-if="showValidationPanel" class="bg-surface border border-emerald-500/50 rounded-lg p-6">
          <h3 class="text-xl font-semibold text-accent-2 mb-6">🔬 Quality Control & Basket Management</h3>

          <div class="grid grid-cols-4 gap-6">
            <!-- LUT Check -->
            <div class="bg-canvas/50 border border-line rounded-lg p-4">
              <h4 class="font-semibold text-accent-2 mb-2">LUT Check (Phase 3.6)</h4>
              <p class="text-sm text-muted mb-4">
                Check for LEGO collisions (same KNOWN → different TARGETs)
              </p>
              <button
                @click="runLUTCheck"
                :disabled="lutCheckLoading"
                class="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-surface-2 disabled:text-faint rounded-lg transition text-white flex items-center justify-center gap-2"
              >
                <span v-if="lutCheckLoading" class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                <span v-else>🔍</span>
                {{ lutCheckLoading ? 'Checking...' : 'Run LUT Check' }}
              </button>

              <!-- LUT Results -->
              <div v-if="lutCheckResult" class="mt-4 p-3 rounded-lg border" :class="{
                'bg-emerald-900/20 border-emerald-500/50': lutCheckResult.status === 'pass',
                'bg-red-900/20 border-red-500/50': lutCheckResult.status === 'fail'
              }">
                <div class="flex items-center gap-2 mb-2">
                  <span v-if="lutCheckResult.status === 'pass'" class="text-accent-2">✓</span>
                  <span v-else class="text-danger">✗</span>
                  <span class="font-semibold" :class="{
                    'text-accent-2': lutCheckResult.status === 'pass',
                    'text-danger': lutCheckResult.status === 'fail'
                  }">
                    {{ lutCheckResult.status === 'pass' ? 'No Collisions' : `${lutCheckResult.collisions} Collisions Found` }}
                  </span>
                </div>
                <p v-if="lutCheckResult.manifest" class="text-xs text-muted">
                  Affected seeds: {{ lutCheckResult.manifest.affected_seeds?.length || 0 }}
                </p>
              </div>
            </div>

            <!-- Infinitive Check (English only) -->
            <div class="bg-canvas/50 border border-line rounded-lg p-4">
              <h4 class="font-semibold text-accent-2 mb-2">Infinitive Check</h4>
              <p class="text-sm text-muted mb-4">
                Validate infinitive forms in English LEGOs
              </p>
              <button
                @click="runInfinitiveCheck"
                :disabled="infinitiveCheckLoading"
                class="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:bg-surface-2 disabled:text-faint rounded-lg transition text-white flex items-center justify-center gap-2"
              >
                <span v-if="infinitiveCheckLoading" class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                <span v-else>📝</span>
                {{ infinitiveCheckLoading ? 'Checking...' : 'Check Infinitives' }}
              </button>

              <!-- Infinitive Results -->
              <div v-if="infinitiveCheckResult" class="mt-4 p-3 rounded-lg border" :class="{
                'bg-emerald-900/20 border-emerald-500/50': infinitiveCheckResult.status === 'pass',
                'bg-yellow-900/20 border-yellow-500/50': infinitiveCheckResult.status === 'fail',
                'bg-canvas/20 border-line/50': infinitiveCheckResult.status === 'skip'
              }">
                <div class="flex items-center gap-2 mb-2">
                  <span v-if="infinitiveCheckResult.status === 'pass'" class="text-accent-2">✓</span>
                  <span v-else-if="infinitiveCheckResult.status === 'fail'" class="text-yellow-400">⚠</span>
                  <span v-else class="text-muted">—</span>
                  <span class="font-semibold text-sm" :class="{
                    'text-accent-2': infinitiveCheckResult.status === 'pass',
                    'text-yellow-400': infinitiveCheckResult.status === 'fail',
                    'text-muted': infinitiveCheckResult.status === 'skip'
                  }">
                    {{ infinitiveCheckResult.status === 'pass' ? 'All Valid' :
                       infinitiveCheckResult.status === 'skip' ? 'N/A' :
                       `${infinitiveCheckResult.violations} Issues` }}
                  </span>
                </div>
                <div v-if="infinitiveCheckResult.summary" class="text-xs text-muted space-y-1">
                  <div v-if="infinitiveCheckResult.summary.critical > 0">
                    Critical: {{ infinitiveCheckResult.summary.critical }}
                  </div>
                  <div v-if="infinitiveCheckResult.summary.high > 0">
                    High: {{ infinitiveCheckResult.summary.high }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Basket Gap Analysis -->
            <div class="bg-canvas/50 border border-line rounded-lg p-4">
              <h4 class="font-semibold text-accent-2 mb-2">Basket Gap Analysis</h4>
              <p class="text-sm text-muted mb-4">
                Identify missing baskets and deprecated baskets
              </p>
              <button
                @click="runBasketGapAnalysis"
                :disabled="gapAnalysisLoading"
                class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-surface-2 disabled:text-faint rounded-lg transition text-white flex items-center justify-center gap-2"
              >
                <span v-if="gapAnalysisLoading" class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                <span v-else>📊</span>
                {{ gapAnalysisLoading ? 'Analyzing...' : 'Analyze Gaps' }}
              </button>

              <!-- Gap Results -->
              <div v-if="gapAnalysisResult" class="mt-4 p-3 rounded-lg border bg-blue-900/20 border-blue-500/50">
                <div class="text-sm space-y-1">
                  <div class="flex justify-between text-ink">
                    <span>Coverage:</span>
                    <span class="font-semibold">{{ gapAnalysisResult.coverage_percentage }}%</span>
                  </div>
                  <div class="flex justify-between text-muted">
                    <span>Missing:</span>
                    <span>{{ gapAnalysisResult.baskets_missing?.length || 0 }}</span>
                  </div>
                  <div class="flex justify-between text-muted">
                    <span>To Delete:</span>
                    <span>{{ gapAnalysisResult.baskets_to_delete?.length || 0 }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Regenerate Baskets -->
            <div class="bg-canvas/50 border border-line rounded-lg p-4">
              <h4 class="font-semibold text-accent-2 mb-2">Regenerate Baskets</h4>
              <p class="text-sm text-muted mb-4">
                Generate missing baskets after collision fixes
              </p>
              <button
                @click="regenerateBaskets"
                :disabled="regenerationLoading || !gapAnalysisResult || (gapAnalysisResult.baskets_missing?.length || 0) === 0"
                class="w-full px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-surface-2 disabled:text-faint rounded-lg transition text-white flex items-center justify-center gap-2"
              >
                <span v-if="regenerationLoading" class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                <span v-else>🔄</span>
                {{ regenerationLoading ? 'Regenerating...' : 'Regenerate' }}
              </button>

              <!-- Regeneration Status -->
              <div v-if="regenerationResult" class="mt-4 p-3 rounded-lg border bg-purple-900/20 border-purple-500/50">
                <div class="text-sm text-ink">
                  <div>✓ Cleanup: {{ regenerationResult.cleanup?.deletedOldBaskets || 0 }} deleted</div>
                  <div>⏳ Generating {{ regenerationResult.segmentation?.totalBaskets || 0 }} baskets...</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Pipeline Actions (Manifest & Audio) -->
        <div class="bg-surface border border-purple-500/50 rounded-lg p-6">
          <h3 class="text-xl font-semibold text-purple-400 mb-6">🎵 Audio Generation</h3>

          <div class="grid grid-cols-2 gap-6">
            <!-- Manifest Status -->
            <div class="bg-canvas/50 border border-line rounded-lg p-4">
              <h4 class="font-semibold text-accent-2 mb-2">Manifest Status</h4>
              <p class="text-sm text-muted mb-4">
                Course manifest must be compiled before audio generation
              </p>
              <div class="p-3 rounded-lg border" :class="{
                'bg-emerald-900/20 border-emerald-500/50': isManifestComplete,
                'bg-canvas/20 border-line/50': !isManifestComplete
              }">
                <div class="flex items-center gap-2">
                  <span v-if="isManifestComplete" class="text-accent-2 text-lg">✓</span>
                  <span v-else class="text-faint text-lg">○</span>
                  <span class="font-semibold" :class="{
                    'text-accent-2': isManifestComplete,
                    'text-muted': !isManifestComplete
                  }">
                    {{ isManifestComplete ? 'Ready for Audio' : 'Manifest Not Compiled' }}
                  </span>
                </div>
                <p class="text-xs text-faint mt-2">
                  Phases completed: {{ course.phases_completed?.join(', ') || 'None' }}
                </p>
              </div>
            </div>

            <!-- Audio Generation -->
            <div class="bg-canvas/50 border border-line rounded-lg p-4">
              <h4 class="font-semibold text-purple-400 mb-2">Generate Audio (TTS)</h4>
              <p class="text-sm text-muted mb-4">
                Generate audio files for all course samples
              </p>
              <button
                @click="startAudioGeneration"
                :disabled="audioGenerationLoading || !isManifestComplete"
                class="w-full px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-surface-2 disabled:text-faint rounded-lg transition text-white flex items-center justify-center gap-2"
              >
                <span v-if="audioGenerationLoading" class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                <span v-else>🎵</span>
                {{ audioGenerationLoading ? 'Starting...' : 'Generate Audio' }}
              </button>

              <!-- Audio Generation Status -->
              <div v-if="audioGenerationResult" class="mt-4 p-3 rounded-lg border" :class="{
                'bg-purple-900/20 border-purple-500/50': audioGenerationResult.success,
                'bg-red-900/20 border-red-500/50': audioGenerationResult.error
              }">
                <div class="text-sm">
                  <div v-if="audioGenerationResult.success" class="text-purple-300">
                    <div>✓ Job started: {{ audioGenerationResult.jobId }}</div>
                    <div class="text-xs text-muted mt-1">
                      Phase: {{ audioGenerationResult.phase }}
                    </div>
                  </div>
                  <div v-else class="text-red-300">
                    {{ audioGenerationResult.error }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tabs -->
        <div class="bg-surface border border-line rounded-lg">
          <div class="flex border-b border-line">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              @click="activeTab = tab.id"
              class="px-6 py-3 text-sm font-medium transition-colors"
              :class="activeTab === tab.id
                ? 'text-accent-2 border-b-2 border-emerald-400'
                : 'text-muted hover:text-ink'"
            >
              {{ tab.label }}
            </button>
          </div>

          <div class="p-6">
            <!-- LEGOs Tab -->
            <div v-if="activeTab === 'legos'">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold text-accent-2">SEED → LEGO Breakdown (Phase 3)</h3>
                <div class="text-sm text-muted">
                  <span v-if="legoSearchQuery">{{ filteredLegoBreakdowns.length }} of </span>{{ legoBreakdowns.length }} seeds • {{ legos.length }} LEGO pairs
                </div>
              </div>

              <!-- Search Bar -->
              <div v-if="legoBreakdowns.length > 0" class="mb-4">
                <input
                  v-model="legoSearchQuery"
                  type="text"
                  placeholder="Search by SEED ID (e.g. S0001), target phrase, known phrase, or LEGO content..."
                  class="w-full bg-canvas border border-line rounded px-4 py-2 text-sm text-ink focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div v-if="legoBreakdowns.length === 0" class="text-center py-8 text-muted">
                No LEGO_PAIRS found. Run Phase 3-4 to generate them.
              </div>

              <div v-else-if="filteredLegoBreakdowns.length === 0" class="text-center py-8 text-muted">
                No breakdowns match your search.
              </div>

              <div v-else class="space-y-6">
                <div
                  v-for="breakdown in filteredLegoBreakdowns"
                  :key="breakdown.seed_id"
                  class="bg-surface border rounded-lg overflow-hidden"
                  :class="{
                    'border-emerald-500': breakdown.lego_pairs?.length > 0,
                    'border-yellow-500': !breakdown.lego_pairs || breakdown.lego_pairs.length === 0
                  }"
                >
                  <!-- Breakdown Header -->
                  <div class="px-6 py-4 border-b bg-surface/50 flex items-center justify-between border-line">
                    <div class="flex items-center gap-4">
                      <span class="text-sm font-mono text-cyan-400 bg-cyan-400/10 px-3 py-1 rounded">
                        {{ breakdown.seed_id }}
                      </span>
                      <span class="text-xs text-muted">
                        {{ breakdown.lego_pairs?.length || 0 }} LEGOs • {{ (breakdown.feeder_pairs || []).length }} FEEDERs
                      </span>
                      <span v-if="breakdown.lego_pairs?.some(lp => lp.lego_type === 'COMPOSITE')" class="text-xs text-purple-400">
                        ⚡ Contains composites
                      </span>
                    </div>
                    <button
                      @click="flagSeed(breakdown)"
                      class="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-sm rounded transition-colors flex items-center gap-1.5"
                      title="Flag this seed for review"
                    >
                      🚩 Flag
                    </button>
                  </div>

                  <!-- Breakdown Content -->
                  <div class="p-6">
                    <!-- Full Sentences (Reference) -->
                    <div class="mb-6 text-sm text-muted bg-canvas/50 rounded p-4">
                      <div class="mb-2">
                        <span class="text-accent-2 font-semibold">Target:</span> {{ breakdown.original_target }}
                      </div>
                      <div>
                        <span class="text-ink font-semibold">Known:</span> {{ breakdown.original_known }}
                      </div>
                    </div>

                    <!-- LEGO Breakdown Display -->
                    <div>
                      <div v-if="breakdown.lego_pairs && breakdown.lego_pairs.length > 0" class="space-y-6">

                        <!-- LEGO Containers (Target Language) -->
                        <div class="flex flex-wrap gap-3 justify-center">
                          <div
                            v-for="(pair, index) in breakdown.lego_pairs"
                            :key="pair.lego_id"
                            @click="openFlagModal(breakdown.seed_id, pair)"
                            class="px-4 py-3 rounded-lg transition-all cursor-pointer"
                            :class="[
                              pair.is_new ? 'border-2' : 'border border-dashed opacity-60',
                              pair.lego_type === 'COMPOSITE'
                                ? (pair.is_new ? 'bg-purple-900/30 border-purple-500 hover:bg-purple-900/50' : 'bg-purple-900/20 border-purple-600/50 hover:bg-purple-900/40')
                                : (pair.is_new ? 'bg-blue-900/30 border-blue-600 hover:bg-blue-900/50' : 'bg-surface/50 border-line/50 hover:bg-surface/70')
                            ]"
                            title="Click to flag this LEGO for review"
                          >
                            <div :class="pair.is_new ? 'text-blue-100' : 'text-muted'" class="font-medium text-center mb-1">
                              {{ pair.target_chunk }}
                            </div>
                            <div class="text-xs text-center font-mono" :class="pair.is_new ? 'text-blue-400' : 'text-faint'">
                              {{ pair.lego_id }}
                              <span v-if="pair.lego_type === 'COMPOSITE'" class="ml-1 text-purple-400">⚡</span>
                              <span v-if="!pair.is_new" class="ml-1 text-faint" title="Previously introduced">↺</span>
                            </div>
                          </div>
                        </div>

                        <!-- Arrow Down -->
                        <div class="flex justify-center">
                          <svg class="w-6 h-6 text-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
                          </svg>
                        </div>

                        <!-- LEGO Containers (Known Language) -->
                        <div class="flex flex-wrap gap-3 justify-center">
                          <div
                            v-for="(pair, index) in breakdown.lego_pairs"
                            :key="'known-' + pair.lego_id"
                            @click="openFlagModal(breakdown.seed_id, pair)"
                            class="px-4 py-3 rounded-lg transition-all cursor-pointer"
                            :class="[
                              pair.is_new ? 'border-2' : 'border border-dashed opacity-60',
                              pair.lego_type === 'COMPOSITE'
                                ? (pair.is_new ? 'bg-purple-900/20 border-purple-600/50 hover:bg-purple-900/30' : 'bg-purple-900/10 border-purple-700/30 hover:bg-purple-900/20')
                                : (pair.is_new ? 'bg-blue-900/20 border-blue-600/50 hover:bg-blue-900/30' : 'bg-blue-900/10 border-blue-700/30 hover:bg-blue-900/20')
                            ]"
                            title="Click to flag this LEGO for review"
                          >
                            <div :class="pair.is_new ? 'text-blue-100' : 'text-muted'" class="font-medium text-center">
                              {{ pair.known_chunk }}
                            </div>
                          </div>
                        </div>

                        <!-- COMPONENTIZATION Sections -->
                        <div
                          v-for="pair in breakdown.lego_pairs.filter(p => p.lego_type === 'COMPOSITE')"
                          :key="'comp-' + pair.lego_id"
                          class="bg-purple-900/10 border border-purple-700/50 rounded-lg p-4 mt-4"
                        >
                          <div class="text-sm font-semibold text-purple-300 mb-2">
                            {{ pair.lego_id }} COMPONENTIZATION:
                          </div>
                          <div class="text-sm text-ink font-mono bg-canvas/50 rounded p-3 mb-3">
                            {{ pair.componentization || 'No componentization details provided' }}
                          </div>

                          <!-- Associated Feeders (filtered by parent_lego_id) -->
                          <div v-if="getFeedersForLego(breakdown, pair.lego_id).length > 0" class="mt-3">
                            <div class="text-xs text-muted mb-2 uppercase">Associated Feeders:</div>
                            <div class="flex flex-wrap gap-2">
                              <div
                                v-for="feeder in getFeedersForLego(breakdown, pair.lego_id)"
                                :key="feeder.feeder_id"
                                class="bg-emerald-900/30 border border-emerald-700/50 rounded px-3 py-1.5 text-sm"
                              >
                                <div class="text-emerald-300 font-mono text-xs">{{ feeder.feeder_id }}</div>
                                <div class="text-emerald-200">{{ feeder.target_chunk }} ⟷ {{ feeder.known_chunk }}</div>
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>

                      <div v-else class="text-center py-8 text-muted">
                        No LEGO_PAIRS extracted yet
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Baskets Tab -->
            <div v-if="activeTab === 'baskets'">
              <LegoBasketViewer :course-code="courseCode" />
            </div>

            <!-- Introductions Tab -->
            <div v-if="activeTab === 'introductions'">
              <h3 class="text-lg font-semibold text-accent-2 mb-4">LEGO Presentations (Phase 6)</h3>

              <div v-if="!introductionsData || !introductionsData.presentations" class="text-center py-8 text-muted">
                No presentations found. Phase 6 may not be complete yet.
              </div>

              <div v-else class="space-y-3">
                <div
                  v-for="(presentation, legoId) in introductionsData.presentations"
                  :key="legoId"
                  class="bg-canvas/50 border border-line rounded-lg p-4 hover:border-emerald-500/50 transition-colors"
                >
                  <div class="flex items-start gap-4">
                    <div class="font-mono text-xs text-cyan-400 bg-cyan-900/30 px-2 py-1 rounded h-fit">
                      {{ legoId }}
                    </div>
                    <div class="flex-1">
                      <!-- View mode -->
                      <div v-if="editingIntro !== legoId">
                        <p class="text-ink text-sm leading-relaxed">{{ typeof presentation === 'string' ? presentation : presentation.text }}</p>
                        <span v-if="typeof presentation === 'object' && presentation.edited" class="inline-block mt-2 text-xs text-accent bg-amber-900/30 px-2 py-1 rounded">
                          ✏️ Custom edited
                        </span>
                      </div>

                      <!-- Edit mode -->
                      <div v-else>
                        <textarea
                          v-model="editedIntroText"
                          class="w-full bg-surface border border-line rounded px-3 py-2 text-ink text-sm leading-relaxed font-mono resize-none"
                          rows="3"
                          placeholder="Edit introduction text..."
                        ></textarea>
                        <div class="mt-2 text-xs text-faint">
                          Use <code class="bg-surface px-1 rounded">{target1}</code> for target language audio
                        </div>
                      </div>
                    </div>

                    <!-- Action buttons -->
                    <div class="flex gap-2">
                      <button
                        v-if="editingIntro !== legoId"
                        @click="startEditIntro(legoId, presentation)"
                        class="text-accent-2 hover:opacity-80 text-sm px-3 py-1 border border-emerald-500/30 hover:border-emerald-500/50 rounded transition-colors"
                      >
                        Edit
                      </button>
                      <template v-else>
                        <button
                          @click="saveIntro(legoId)"
                          :disabled="savingIntro"
                          class="text-accent-2 hover:opacity-80 text-sm px-3 py-1 border border-emerald-500/30 hover:border-emerald-500/50 rounded transition-colors disabled:opacity-50"
                        >
                          {{ savingIntro ? 'Saving...' : 'Save' }}
                        </button>
                        <button
                          @click="cancelEditIntro"
                          :disabled="savingIntro"
                          class="text-muted hover:text-ink text-sm px-3 py-1 border border-line hover:border-line rounded transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </template>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Hidden audio element for playback -->
    <audio ref="audioPlayerRef" @ended="isPlaying = false" @error="handleAudioError"></audio>

    <!-- Enhanced Regeneration Progress UI -->
    <div
      v-if="regenerationState.active"
      class="fixed bottom-4 right-4 bg-surface border border-emerald-500/30 rounded-lg p-6 w-96 shadow-2xl z-50"
    >
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-accent-2">Regenerating Course</h3>
        <button
          v-if="regenerationState.status === 'complete' || regenerationState.status === 'failed'"
          @click="dismissRegenerationProgress"
          class="text-muted hover:text-ink"
        >
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
          </svg>
        </button>
      </div>

      <!-- Status indicator -->
      <div class="mb-3">
        <div v-if="regenerationState.status === 'queued'" class="flex items-center gap-2 text-yellow-400">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd"/>
          </svg>
          <span>Queued...</span>
        </div>

        <div v-else-if="regenerationState.status === 'running'" class="flex items-center gap-2 text-blue-400">
          <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Phase {{ regenerationState.currentPhase }} in progress...</span>
        </div>

        <div v-else-if="regenerationState.status === 'complete'" class="flex items-center gap-2 text-green-400">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
          </svg>
          <span>Regeneration complete!</span>
        </div>

        <div v-else-if="regenerationState.status === 'failed'" class="flex items-center gap-2 text-danger">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
          </svg>
          <span>Regeneration failed</span>
        </div>
      </div>

      <!-- Progress bar -->
      <div v-if="regenerationState.status === 'running' || regenerationState.status === 'queued'" class="mb-3">
        <div class="w-full bg-surface-2 rounded-full h-2">
          <div
            class="bg-emerald-500 h-2 rounded-full transition-all duration-300"
            :style="{ width: regenerationState.progress + '%' }"
          ></div>
        </div>
        <div class="text-xs text-muted mt-1 text-right">
          {{ Math.round(regenerationState.progress) }}%
        </div>
      </div>

      <!-- Error message -->
      <div v-if="regenerationState.error" class="mt-3 text-sm text-danger bg-red-900/20 border border-red-500/30 rounded p-2">
        {{ regenerationState.error }}
      </div>

      <!-- Job ID for debugging -->
      <div class="text-xs text-faint mt-3">
        Job ID: {{ regenerationState.jobId }}
      </div>
    </div>

    <!-- Edit Modal -->
    <div
      v-if="editModal.open"
      class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      @click.self="closeEditModal"
    >
      <div class="bg-surface border border-line rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <!-- Modal Header -->
        <div class="flex items-center justify-between p-6 border-b border-line">
          <div>
            <h2 class="text-2xl font-bold text-accent">Flag for Review</h2>
            <p class="text-sm text-muted mt-1">{{ editModal.translation?.seed_id }}</p>
          </div>
          <button
            @click="closeEditModal"
            class="text-muted hover:text-ink text-2xl"
          >
            ×
          </button>
        </div>

        <!-- Modal Body -->
        <div class="p-6 space-y-6">
          <!-- Read-only Translation Display -->
          <div class="bg-canvas/50 border border-line rounded-lg p-4 space-y-3">
            <div>
              <div class="text-xs text-muted mb-1">Known</div>
              <div class="text-ink font-mono">{{ editModal.translation?.source }}</div>
            </div>
            <div>
              <div class="text-xs text-muted mb-1">Target</div>
              <div class="text-ink font-mono text-lg">{{ editModal.translation?.target }}</div>
            </div>
          </div>

          <!-- Flag Details Form -->
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-ink mb-2">Issue Type</label>
              <select v-model="editModal.issueType" class="w-full bg-canvas border border-line rounded px-4 py-2 text-ink">
                <option value="translation">Translation incorrect</option>
                <option value="lego_breakdown">LEGO breakdown issue</option>
                <option value="unnatural">Sounds unnatural</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-ink mb-2">Notes / Suggestion</label>
              <textarea
                v-model="editModal.notes"
                placeholder="Describe the issue or suggest a correction..."
                class="w-full bg-canvas border border-line rounded px-4 py-3 text-ink focus:outline-none focus:border-amber-500"
                rows="4"
              ></textarea>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="flex items-center justify-end gap-3 p-6 border-t border-line">
          <button
            @click="closeEditModal"
            class="px-4 py-2 bg-surface-2 hover:bg-surface-3 text-ink rounded transition-colors"
          >
            Cancel
          </button>
          <button
            @click="submitFlag"
            :disabled="editModal.saving"
            class="px-6 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-surface-2 disabled:text-faint text-white rounded transition-colors"
          >
            {{ editModal.saving ? 'Submitting...' : 'Submit Flag' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Regeneration Confirmation Modal -->
    <div v-if="regenerationResult?.confirming" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="bg-surface border border-purple-500/50 rounded-lg max-w-lg w-full p-6">
        <h3 class="text-2xl font-bold text-purple-400 mb-4">🔄 Regenerate Baskets?</h3>

        <div class="space-y-4 mb-6">
          <p class="text-ink">
            This will regenerate <span class="font-bold text-accent-2">{{ regenerationResult.missing }}</span> missing baskets.
          </p>

          <div class="bg-canvas/50 border border-line rounded-lg p-4 space-y-2 text-sm">
            <div class="flex items-center gap-2">
              <span class="text-muted">1.</span>
              <span class="text-ink">Delete <span class="font-semibold text-danger">{{ regenerationResult.toDelete }}</span> deprecated baskets</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-muted">2.</span>
              <span class="text-ink">Generate <span class="font-semibold text-accent-2">{{ regenerationResult.missing }}</span> new baskets</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-muted">3.</span>
              <span class="text-ink">Auto-merge when complete</span>
            </div>
          </div>

          <div class="bg-blue-900/20 border border-blue-500/50 rounded-lg p-3 text-sm">
            <div class="flex items-center gap-2">
              <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span class="text-ink">Estimated time: <span class="font-semibold text-blue-400">~{{ regenerationResult.estimatedMinutes }} minutes</span></span>
            </div>
          </div>
        </div>

        <div class="flex gap-3">
          <button
            @click="cancelRegeneration"
            class="flex-1 px-4 py-3 bg-surface-2 hover:bg-surface-3 text-ink rounded-lg transition font-semibold"
          >
            Cancel
          </button>
          <button
            @click="confirmRegeneration"
            :disabled="regenerationLoading"
            class="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-surface-2 disabled:text-faint text-white rounded-lg transition font-semibold flex items-center justify-center gap-2"
          >
            <span v-if="regenerationLoading" class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
            {{ regenerationLoading ? 'Starting...' : 'OK' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Regeneration Success/Error Modal -->
    <div v-if="regenerationResult && !regenerationResult.confirming && (regenerationResult.success || regenerationResult.error)" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="bg-surface border rounded-lg max-w-lg w-full p-6" :class="regenerationResult.error ? 'border-red-500/50' : 'border-emerald-500/50'">
        <h3 class="text-2xl font-bold mb-4" :class="regenerationResult.error ? 'text-danger' : 'text-accent-2'">
          {{ regenerationResult.error ? '❌ Error' : '✅ Started!' }}
        </h3>

        <div v-if="regenerationResult.error" class="mb-6">
          <p class="text-ink mb-2">Failed to start basket regeneration:</p>
          <div class="bg-red-900/20 border border-red-500/50 rounded-lg p-3 text-sm text-red-300">
            {{ regenerationResult.error }}
          </div>
        </div>

        <div v-else class="space-y-4 mb-6">
          <p class="text-ink">Basket regeneration has started!</p>

          <div class="bg-canvas/50 border border-line rounded-lg p-4 space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-muted">Browsers:</span>
              <span class="text-accent-2 font-semibold">{{ regenerationResult.segmentation?.browsersNeeded || 0 }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">Baskets:</span>
              <span class="text-accent-2 font-semibold">{{ regenerationResult.segmentation?.totalBaskets || 0 }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted">Estimated time:</span>
              <span class="text-blue-400 font-semibold">{{ regenerationResult.segmentation?.estimatedTime || 'Unknown' }}</span>
            </div>
          </div>

          <p class="text-sm text-muted">The process will run in the background. Baskets will auto-merge when complete.</p>
        </div>

        <button
          @click="regenerationResult = null"
          class="w-full px-4 py-3 bg-surface-2 hover:bg-surface-3 text-ink rounded-lg transition font-semibold"
        >
          Close
        </button>
      </div>
    </div>

    <!-- LEGO Flag Modal -->
    <div
      v-if="flagModal.open"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      @click.self="closeFlagModal"
    >
      <div class="bg-surface border border-line rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-line flex items-center justify-between">
          <h3 class="text-xl font-semibold text-accent-2">Flag {{ flagModal.legoId }}</h3>
          <button
            @click="closeFlagModal"
            class="text-muted hover:text-ink text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <!-- Content -->
        <div class="p-6 space-y-4">
          <!-- Target Phrase -->
          <div>
            <label class="block text-sm font-semibold text-ink mb-2">Target Phrase</label>
            <div class="bg-canvas/50 border border-line rounded px-4 py-3 text-ink">
              {{ flagModal.targetPhrase }}
            </div>
          </div>

          <!-- Known Translation -->
          <div>
            <label class="block text-sm font-semibold text-ink mb-2">Current Known Translation</label>
            <div class="bg-canvas/50 border border-line rounded px-4 py-3 text-ink">
              {{ flagModal.knownPhrase }}
            </div>
          </div>

          <!-- Suggested Correction -->
          <div>
            <label class="block text-sm font-semibold text-ink mb-2">Suggested Correction</label>
            <input
              v-model="flagModal.suggestedCorrection"
              type="text"
              placeholder="Enter your suggested correction (optional)"
              class="w-full bg-canvas border border-line rounded px-4 py-3 text-ink focus:outline-none focus:border-emerald-500"
            />
          </div>

          <!-- Notes -->
          <div>
            <label class="block text-sm font-semibold text-ink mb-2">Notes (optional)</label>
            <textarea
              v-model="flagModal.notes"
              rows="4"
              placeholder="Explain the issue or provide additional context..."
              class="w-full bg-canvas border border-line rounded px-4 py-3 text-ink focus:outline-none focus:border-emerald-500 resize-none"
            ></textarea>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-line flex gap-3 justify-end">
          <button
            @click="closeFlagModal"
            :disabled="flagModal.saving"
            class="px-6 py-2 bg-surface-2 hover:bg-surface-3 disabled:bg-surface disabled:text-faint text-ink rounded transition"
          >
            Cancel
          </button>
          <button
            @click="submitLegoFlag"
            :disabled="flagModal.saving"
            class="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:text-muted text-white rounded transition flex items-center gap-2"
          >
            <span v-if="flagModal.saving" class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
            <span>{{ flagModal.saving ? 'Submitting...' : 'Submit Flag' }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import api from '../services/api'
import { useCourses } from '../composables/useCourses'
import { GITHUB_CONFIG } from '../config/github'

import LegoBasketViewer from '../components/LegoBasketViewer.vue'
import ProgressMonitor from '../components/ProgressMonitor.vue'
import LearningCyclePlayer from '../components/LearningCyclePlayer.vue'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const courseCode = route.params.courseCode

// Parse course code for generator link (e.g., ita_for_eng → target=ita, known=eng)
const generatorLink = computed(() => {
  const parts = courseCode.split('_for_')
  if (parts.length === 2) {
    return {
      path: '/generate',
      query: { target: parts[0], known: parts[1] }
    }
  }
  return '/generate'
})

const { getCourseName, getLanguageName } = useCourses()

const course = ref(null)
const translations = ref([])
const legos = ref([])
const legoBreakdowns = ref([]) // Raw breakdown data for visualizer
const baskets = ref([])
const provenanceResult = ref(null) // traceProvenance() wrote to this before it was declared (ReferenceError)
const basketsData = ref(null) // LEGO_BASKETS data structure from baskets.json
const legoPairsData = ref(null) // LEGO_PAIRS data structure from lego_pairs.json
const expandedBaskets = ref({}) // Track which baskets are expanded
const loading = ref(true)
const error = ref(null)

const activeTab = ref('legos')
const searchQuery = ref('')
const legoSearchQuery = ref('') // Search for LEGO breakdowns
const selectedSeed = ref('')
const introductionsData = ref(null) // Introductions data from introductions.json

// Introduction edit state
const editingIntro = ref(null) // LEGO ID being edited
const editedIntroText = ref('') // Edited text
const savingIntro = ref(false) // Saving state

// Audio QA state
const audioRoles = [
  { id: 'target1', label: 'Target 1', icon: '🗣️', description: 'Primary target language (slow)' },
  { id: 'target2', label: 'Target 2', icon: '👥', description: 'Secondary target language (slow)' },
  { id: 'source', label: 'Known', icon: '🔊', description: 'Known language (natural)' },
  { id: 'presentation', label: 'Presentation', icon: '🎤', description: 'Introductions & explanations' }
]
const selectedAudioRole = ref(null)
const currentAudioSample = ref(null)
const audioSampleHistory = ref([])
const audioLoading = ref(false)
const isPlaying = ref(false)
const audioPlayerRef = ref(null)
const hasManifest = computed(() => {
  // Check if course has manifest (phases_completed includes manifest or 7)
  const phases = course.value?.phases_completed || []
  return phases.includes('manifest') || phases.includes('7')
})

// Validation & Fix panel state
const showValidationPanel = ref(false)
const showProgressMonitor = ref(false)
const lutCheckLoading = ref(false)
const lutCheckResult = ref(null)
const infinitiveCheckLoading = ref(false)
const infinitiveCheckResult = ref(null)
const gapAnalysisLoading = ref(false)
const gapAnalysisResult = ref(null)
const regenerationLoading = ref(false)
const regenerationResult = ref(null)
const audioGenerationLoading = ref(false)
const audioGenerationResult = ref(null)

// Edit modal state
const editModal = ref({
  open: false,
  translation: null,
  editedSource: '',
  editedTarget: '',
  impact: null,
  saving: false,
  issueType: 'translation',
  notes: ''
})

// LEGO flag modal state
const flagModal = ref({
  open: false,
  seedId: null,
  legoId: null,
  targetPhrase: '',
  knownPhrase: '',
  suggestedCorrection: '',
  notes: '',
  saving: false
})

// Regeneration state - Enhanced for real-time tracking
const regenerationState = ref({
  active: false,
  jobId: null,
  status: 'idle', // idle | queued | running | completed | failed
  currentPhase: null,
  progress: 0,
  startTime: null,
  completionTime: null,
  error: null
})
const pollingInterval = ref(null)

// Basket generation state
const generatingBaskets = ref(false)

// QC Flags state
const flags = ref([])
const showFlagsExpanded = ref(true)

const tabs = [
  { id: 'legos', label: 'LEGO_PAIRS' },
  { id: 'baskets', label: 'LEGO_BASKETS' },
  { id: 'introductions', label: 'INTRODUCTIONS' }
]

// Count baskets from database data or basketsData from S3
const actualBasketsCount = computed(() => {
  // First check if we have database data (baskets object directly)
  if (baskets.value && typeof baskets.value === 'object' && !Array.isArray(baskets.value)) {
    return Object.keys(baskets.value).length
  }
  // Fall back to basketsData from S3
  if (basketsData.value?.baskets) {
    return Object.keys(basketsData.value.baskets).length
  }
  return 0
})

// Count actual LEGOs (only new: true) from lego_pairs.json structure or database data
const actualLegoCount = computed(() => {
  // First check if we have database data (legos array directly)
  if (legos.value && legos.value.length > 0) {
    // Count only NEW LEGOs from database data
    return legos.value.filter(lego => lego.new !== false).length
  }

  // Fall back to legoPairsData from S3/VFS
  if (!legoPairsData.value?.seeds) return 0

  // Count only NEW LEGOs (new: true) - these are the actual teaching units
  // LEGOs with new: false are just references to earlier LEGOs
  let count = 0
  for (const seed of legoPairsData.value.seeds) {
    if (seed.legos) {
      count += seed.legos.filter(lego => lego.new === true).length
    }
  }
  return count
})

// Check if manifest is complete (supports both new and legacy phase identifiers)
const isManifestComplete = computed(() => {
  const phases = course.value?.phases_completed || []
  return phases.includes('manifest') || phases.includes('7')
})

// Filter unresolved flags
const unresolvedFlags = computed(() => {
  return flags.value.filter(f => !f.resolved)
})

const filteredTranslations = computed(() => {
  if (!searchQuery.value) return translations.value
  const query = searchQuery.value.toLowerCase()
  return translations.value.filter(t =>
    t.source.toLowerCase().includes(query) ||
    t.target.toLowerCase().includes(query) ||
    t.seed_id.toLowerCase().includes(query)
  )
})

const filteredLegoBreakdowns = computed(() => {
  if (!legoSearchQuery.value) return legoBreakdowns.value
  const query = legoSearchQuery.value.toLowerCase()
  return legoBreakdowns.value.filter(breakdown =>
    // Search by seed ID
    breakdown.seed_id.toLowerCase().includes(query) ||
    // Search in target language
    breakdown.original_target.toLowerCase().includes(query) ||
    // Search in known language
    breakdown.original_known.toLowerCase().includes(query) ||
    // Search in individual LEGO chunks
    (breakdown.lego_pairs || []).some(pair =>
      pair.target_chunk.toLowerCase().includes(query) ||
      pair.known_chunk.toLowerCase().includes(query) ||
      pair.lego_id.toLowerCase().includes(query)
    )
  )
})

onMounted(async () => {
  await loadCourse()
})

async function loadCourse() {
  loading.value = true
  error.value = null

  try {
    const response = await api.course.get(courseCode)
    course.value = response.course
    // Map API response to component format
    translations.value = (response.translations || []).map(t => ({
      ...t,
      source: t.known_phrase || t.source,
      target: t.target_phrase || t.target,
      uuid: t.uuid || t.seed_id
    }))
    baskets.value = response.baskets || []

    // Check if data came from database (has real-time data, no need to fetch from S3)
    const isFromDatabase = response.course?.data_source === 'database'

    if (isFromDatabase && response.lego_breakdowns?.length > 0) {
      // Use database data - transform to component format
      legoBreakdowns.value = response.lego_breakdowns.map(seed => ({
        seed_id: seed.seed_id,
        original_target: seed.seed_pair?.target || '',
        original_known: seed.seed_pair?.known || '',
        lego_pairs: (seed.legos || []).map(lego => ({
          lego_id: lego.id,
          target_chunk: lego.target,
          known_chunk: lego.known,
          lego_type: lego.type === 'M' ? 'COMPOSITE' : 'ATOMIC',
          is_new: lego.new !== false,
          ref: lego.ref || null,
          componentization: lego.components ?
            lego.components.map(c => `${c.known} = ${c.target}`).join(', ') :
            null
        }))
      }))

      legos.value = response.legos || []
    } else {
      // Legacy: load from S3/VFS files
      legos.value = []
      legoBreakdowns.value = []
    }

    // Skip S3 fetches for empty courses - no files exist yet
    if (response.course?.isEmpty) {
      console.log('🌱 Empty course - skipping S3 file fetches')
      basketsData.value = null
      introductionsData.value = null
      legoPairsData.value = null
      await loadFlags()
      return
    }

    // Load lego_baskets.json from S3 (via API proxy)
    try {
      // Add cache-busting timestamp
      const timestamp = Date.now()
      const url = `${GITHUB_CONFIG.getCourseFileUrl(courseCode, 'lego_baskets.json')}?_t=${timestamp}`
      console.log('🔍 Fetching lego_baskets.json from S3:', url)

      const basketsResponse = await fetch(url)

      if (basketsResponse.ok) {
        basketsData.value = await basketsResponse.json()
        console.log('📦 Loaded lego_baskets.json - baskets count:', Object.keys(basketsData.value?.baskets || {}).length)
      } else {
        console.log('lego_baskets.json not found (Phase 5 may not be complete)')
        basketsData.value = null
      }
    } catch (err) {
      console.log('Could not load lego_baskets.json:', err.message)
      basketsData.value = null
    }

    // Load introductions from S3 (introductions.json stores the text, not database)
    try {
      // Add cache-busting timestamp
      const timestamp = Date.now()
      const url = `${GITHUB_CONFIG.getCourseFileUrl(courseCode, 'introductions.json')}?_t=${timestamp}`
      console.log('🔍 Fetching introductions.json from S3:', url)

      const introsResponse = await fetch(url)

      if (introsResponse.ok) {
        introductionsData.value = await introsResponse.json()
        console.log('📦 Loaded introductions.json - count:', Object.keys(introductionsData.value?.presentations || {}).length)
      } else {
        console.log('introductions.json not found (Phase 6 may not be complete)')
        introductionsData.value = null
      }
    } catch (err) {
      console.log('Could not load introductions.json:', err.message)
      introductionsData.value = null
    }

    // Load lego_pairs.json from S3 (via API proxy) - only if not using database data
    if (!isFromDatabase || legoBreakdowns.value.length === 0) {
      console.log('🔍 Starting to load lego_pairs.json for course:', courseCode)
      try {
        // Add cache-busting timestamp
        const timestamp = Date.now()
        const url = `${GITHUB_CONFIG.getCourseFileUrl(courseCode, 'lego_pairs.json')}?_t=${timestamp}`
          console.log('🔍 Fetching lego_pairs.json from S3:', url)

        const legoPairsResponse = await fetch(url)

        console.log('🔍 Response status:', legoPairsResponse.status, legoPairsResponse.ok)

        if (legoPairsResponse.ok) {
        const loadedLegoPairsData = await legoPairsResponse.json()
        legoPairsData.value = loadedLegoPairsData
        console.log('📦 Loaded lego_pairs.json - seeds count:', loadedLegoPairsData.seeds?.length)
        console.log('📦 Data format version:', loadedLegoPairsData.version || 'v2 (object)')

        // Check format: v7.x array format vs v2 object format
        if (loadedLegoPairsData.seeds && Array.isArray(loadedLegoPairsData.seeds)) {
          console.log('🔍 Transforming seeds data...')

          // Detect format by checking first seed structure
          const firstSeed = loadedLegoPairsData.seeds[0]
          const isArrayFormat = Array.isArray(firstSeed)

          if (isArrayFormat) {
            // Detect v7 hybrid format: ["S0001", {k,t}, [[type, new, {k,t}, components?], ...]]
            // vs old array format: [seed_id, [target, known], [[lego_id, type, target, known], ...]]
            const [, seedPairTest] = firstSeed
            const isV7Hybrid = seedPairTest && typeof seedPairTest === 'object' && 'k' in seedPairTest

            if (isV7Hybrid) {
              // v7 hybrid format: ["S0001", {k:"known", t:"target"}, [[type, new, {k,t}, components?], ...]]
              console.log('🔍 Detected v7 hybrid compact format')
              legoBreakdowns.value = loadedLegoPairsData.seeds.map((seed, seedIdx) => {
                const [seedId, seedPair, legos] = seed
                return {
                  seed_id: seedId,
                  original_target: seedPair.t,
                  original_known: seedPair.k,
                  lego_pairs: (legos || []).map((lego, legoIdx) => {
                    // lego format: [type, new, {k,t}, components?] or [type, new, {k,t}, components?, ref?]
                    const [legoType, isNew, legoPair, components, ref] = lego
                    const legoId = `${seedId}L${String(legoIdx + 1).padStart(2, '0')}`
                    return {
                      lego_id: legoId,
                      target_chunk: legoPair.t,
                      known_chunk: legoPair.k,
                      lego_type: legoType === 'M' ? 'COMPOSITE' : 'ATOMIC',
                      is_new: isNew === 1 || isNew === true,
                      ref: ref || null,
                      componentization: components && components.length > 0 ?
                        components.map(c => `${c.k} = ${c.t}`).join(', ') :
                        null
                    }
                  })
                }
              })

              // Extract flat list of LEGOs
              legos.value = loadedLegoPairsData.seeds.flatMap((seed, seedIdx) => {
                const [seedId, , seedLegos] = seed
                return (seedLegos || []).map((lego, legoIdx) => {
                  const [type, isNew, legoPair] = lego
                  return {
                    id: `${seedId}L${String(legoIdx + 1).padStart(2, '0')}`,
                    target: legoPair.t,
                    known: legoPair.k,
                    type,
                    new: isNew === 1 || isNew === true
                  }
                })
              })
            } else {
              // Old v7.x array format: [seed_id, [target, known], [[lego_id, type, target, known, components?], ...]]
              console.log('🔍 Detected v7.x array format (legacy)')
              legoBreakdowns.value = loadedLegoPairsData.seeds.map(seed => {
                const [seedId, seedPair, legos] = seed
                return {
                  seed_id: seedId,
                  original_target: seedPair[0],
                  original_known: seedPair[1],
                  lego_pairs: legos.map(lego => {
                    // lego format: [lego_id, type, target, known, components?]
                    const [legoId, legoType, target, known, components] = lego
                    return {
                      lego_id: legoId,
                      target_chunk: target,
                      known_chunk: known,
                      lego_type: legoType === 'C' ? 'COMPOSITE' : 'ATOMIC',
                      is_new: true,
                      componentization: components ?
                        components.map(c => `${c[1]} = ${c[0]}`).join(', ') :
                        null
                    }
                  })
                }
              })

              // Extract flat list of LEGOs
              legos.value = loadedLegoPairsData.seeds.flatMap(seed => {
                const [, , seedLegos] = seed
                return seedLegos.map(lego => {
                  const [id, type, target, known] = lego
                  return { id, target, known, type }
                })
              })
            }
          } else {
            // v2 object format: { seed_id, seed_pair: { target, known }, legos: [...] }
            console.log('🔍 Detected v2 object format')
            legoBreakdowns.value = loadedLegoPairsData.seeds.map(seed => ({
              seed_id: seed.seed_id,
              original_target: seed.seed_pair.target || seed.seed_pair[0],
              original_known: seed.seed_pair.known || seed.seed_pair[1],
              lego_pairs: seed.legos.map(lego => ({
                lego_id: lego.id,
                target_chunk: lego.lego?.target || lego.target,
                known_chunk: lego.lego?.known || lego.known,
                lego_type: lego.type === 'M' ? 'COMPOSITE' : 'ATOMIC',
                is_new: lego.new !== false,
                componentization: lego.components ?
                  lego.components.map(c => `${c.known} = ${c.target}`).join(', ') :
                  null
              }))
            }))

            // Extract flat list of LEGOs
            legos.value = loadedLegoPairsData.seeds.flatMap(seed =>
              seed.legos.map(lego => ({
                id: lego.id,
                target: lego.lego?.target || lego.target,
                known: lego.lego?.known || lego.known,
                type: lego.type,
                new: lego.new
              }))
            )
          }

          console.log(`✅ SUCCESS: Loaded ${legoBreakdowns.value.length} seeds with ${legos.value.length} total LEGOs`)
          console.log('📊 First 3 seeds:', legoBreakdowns.value.slice(0, 3).map(s => s.seed_id))
          console.log('📊 Last 3 seeds:', legoBreakdowns.value.slice(-3).map(s => s.seed_id))
        } else {
          console.error('❌ ERROR: No seeds array found in lego_pairs.json')
        }
      } else {
        console.error('❌ ERROR: Failed to fetch lego_pairs.json - status:', legoPairsResponse.status)
      }
      } catch (err) {
        console.error('❌ ERROR loading lego_pairs.json:', err)
        console.error('Stack:', err.stack)
      }
    } else {
      console.log('🗄️ Skipping S3 fetch - using database data for lego_pairs')
    }

    // Load QC flags
    await loadFlags()
  } catch (err) {
    error.value = err.message || 'Failed to load course'
    console.error('Failed to load course:', err)
  } finally {
    loading.value = false
  }
}

async function loadFlags() {
  try {
    const response = await api.course.getFlags(courseCode)
    flags.value = response.flags || []
    console.log(`📋 Loaded ${flags.value.length} flags (${unresolvedFlags.value.length} unresolved)`)
  } catch (err) {
    console.log('Could not load flags:', err.message)
    flags.value = []
  }
}

async function resolveFlag(flagId) {
  try {
    await api.course.deleteFlag(courseCode, flagId)
    // Reload flags after deletion
    await loadFlags()
    toast.success('Flag resolved')
  } catch (err) {
    console.error('Failed to resolve flag:', err)
    toast.error('Failed to resolve flag: ' + err.message)
  }
}

async function generateBaskets() {
  if (generatingBaskets.value) return

  if (!confirm('Generate practice baskets for all LEGOs in this course?\n\nThis will spawn a Claude Code agent to run the universal basket generation system.')) {
    return
  }

  generatingBaskets.value = true
  showProgressMonitor.value = true // Show progress monitor

  try {
    const response = await fetch(`${getApiUrl()}/api/courses/${courseCode}/baskets/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        // Optional: specify seed range
        // startSeed: 1,
        // endSeed: 30
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to start basket generation')
      showProgressMonitor.value = false
    }

    // Success - monitor will show progress automatically

  } catch (err) {
    console.error('Failed to generate baskets:', err)
    alert(`❌ Failed to generate baskets:\n\n${err.message}`)
    showProgressMonitor.value = false
  } finally {
    generatingBaskets.value = false
  }
}

function formatStatus(status) {
  return status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown'
}

function getStatusClass(status) {
  if (status === 'complete' || status === 'ready_for_phase_2') {
    return 'bg-emerald-600 text-white'
  } else if (status === 'in_progress') {
    return 'bg-yellow-600 text-white'
  } else {
    return 'bg-surface-3 text-ink'
  }
}

function formatProvenance(provenance) {
  if (Array.isArray(provenance)) {
    return provenance.map(p => p.provenance).join(', ')
  }
  return provenance || 'N/A'
}

// LEGO Breakdown Editing Functions
function getWords(text) {
  if (!text) return []
  return text.split(/\s+/).filter(w => w.length > 0)
}

// Get feeders for a specific LEGO (view mode)
function getFeedersForLego(breakdown, legoId) {
  if (!breakdown.feeder_pairs) return []
  return breakdown.feeder_pairs.filter(f => f.parent_lego_id === legoId)
}

// Basket Management Functions
function toggleBasket(legoId) {
  expandedBaskets.value[legoId] = !expandedBaskets.value[legoId]
}

async function editTranslation(translation) {
  editModal.value.translation = translation
  editModal.value.editedSource = translation.source
  editModal.value.editedTarget = translation.target
  editModal.value.open = true

  // Fetch impact analysis
  try {
    const response = await api.course.traceProvenance(courseCode, translation.seed_id)
    editModal.value.impact = response
  } catch (err) {
    console.error('Failed to fetch impact:', err)
  }
}

function closeEditModal() {
  editModal.value.open = false
  editModal.value.translation = null
  editModal.value.editedSource = ''
  editModal.value.editedTarget = ''
  editModal.value.impact = null
}

// LEGO Flag Modal Handlers
function openFlagModal(seedId, legoPair) {
  flagModal.value.open = true
  flagModal.value.seedId = seedId
  flagModal.value.legoId = legoPair.lego_id
  flagModal.value.targetPhrase = legoPair.target_chunk
  flagModal.value.knownPhrase = legoPair.known_chunk
  flagModal.value.suggestedCorrection = ''
  flagModal.value.notes = ''
  flagModal.value.saving = false
}

// Flag entire seed (opens modal for general seed/translation issues)
function flagSeed(breakdown) {
  editModal.value.translation = {
    seed_id: breakdown.seed_id,
    source: breakdown.original_known,
    target: breakdown.original_target
  }
  editModal.value.issueType = 'translation'
  editModal.value.notes = ''
  editModal.value.open = true
}

function closeFlagModal() {
  flagModal.value.open = false
  flagModal.value.seedId = null
  flagModal.value.legoId = null
  flagModal.value.targetPhrase = ''
  flagModal.value.knownPhrase = ''
  flagModal.value.suggestedCorrection = ''
  flagModal.value.notes = ''
  flagModal.value.saving = false
}

async function submitLegoFlag() {
  if (!flagModal.value.seedId || !flagModal.value.legoId) return

  flagModal.value.saving = true
  try {
    await api.course.createFlag(courseCode, {
      seedId: flagModal.value.seedId,
      legoId: flagModal.value.legoId,
      issueType: 'translation',
      suggestedCorrection: flagModal.value.suggestedCorrection || undefined,
      notes: flagModal.value.notes || undefined
    })

    toast.success(`Flag submitted for ${flagModal.value.legoId}`)
    closeFlagModal()
  } catch (err) {
    console.error('Failed to submit flag:', err)
    toast.error('Failed to submit flag: ' + err.message)
  } finally {
    flagModal.value.saving = false
  }
}

// Introduction edit handlers
function startEditIntro(legoId, presentation) {
  editingIntro.value = legoId
  editedIntroText.value = typeof presentation === 'string' ? presentation : presentation.text
}

function cancelEditIntro() {
  editingIntro.value = null
  editedIntroText.value = ''
}

async function saveIntro(legoId) {
  if (!editedIntroText.value.trim()) {
    alert('Introduction text cannot be empty')
    return
  }

  savingIntro.value = true
  try {
    const response = await api.course.updateIntroduction(courseCode, legoId, {
      text: editedIntroText.value.trim(),
      edited: true
    })

    // Update local state
    if (typeof introductionsData.value.presentations[legoId] === 'string') {
      introductionsData.value.presentations[legoId] = {
        text: editedIntroText.value.trim(),
        edited: true
      }
    } else {
      introductionsData.value.presentations[legoId].text = editedIntroText.value.trim()
      introductionsData.value.presentations[legoId].edited = true
    }

    // Exit edit mode
    editingIntro.value = null
    editedIntroText.value = ''

    // Show GitHub commit confirmation
    if (response && response.github && response.github.sha) {
      const shortSha = response.github.sha.substring(0, 7)
      toast.success(`✅ Saved to GitHub! Commit: ${shortSha}`, { timeout: 4000 })
    } else {
      // This shouldn't happen - all saves go to GitHub
      toast.warning(`⚠️ Saved but GitHub commit unconfirmed`, { timeout: 4000 })
    }
  } catch (error) {
    console.error('Failed to save introduction:', error)
    toast.error(`❌ Save failed: ${error.message}`, { timeout: 5000 })
  } finally {
    savingIntro.value = false
  }
}

async function submitFlag() {
  if (!editModal.value.translation) return

  editModal.value.saving = true
  try {
    // Submit the flag with issue type and notes
    await api.course.createFlag(courseCode, {
      seedId: editModal.value.translation.seed_id,
      issueType: editModal.value.issueType,
      notes: editModal.value.notes
    })

    closeEditModal()

    // Show success message
    toast.success('Flag submitted successfully for review', { timeout: 4000 })
  } catch (err) {
    console.error('Failed to submit flag:', err)
    toast.error(`Failed to submit flag: ${err.message}`, { timeout: 5000 })
  } finally {
    editModal.value.saving = false
  }
}

async function traceProvenance() {
  if (!selectedSeed.value) return

  try {
    const response = await api.course.traceProvenance(courseCode, selectedSeed.value)
    provenanceResult.value = response
  } catch (err) {
    console.error('Failed to trace provenance:', err)
    alert('Failed to trace provenance: ' + err.message)
  }
}

function startRegenerationPolling() {
  if (pollingInterval.value) {
    clearInterval(pollingInterval.value)
  }

  pollingInterval.value = setInterval(async () => {
    try {
      const status = await api.course.getRegenerationStatus(
        courseCode,
        regenerationState.value.jobId
      )

      // Update regeneration state
      regenerationState.value.status = status.status
      regenerationState.value.currentPhase = status.currentPhase
      regenerationState.value.progress = status.progress || 0

      // Check if regeneration is complete or failed
      if (status.status === 'complete' || status.status === 'failed') {
        stopRegenerationPolling()
        regenerationState.value.completionTime = Date.now()

        if (status.status === 'failed') {
          regenerationState.value.error = status.error || 'Regeneration failed'
        }

        // Reload course data to show updated results
        if (status.status === 'complete') {
          await loadCourse()
        }
      }
    } catch (err) {
      console.error('Failed to poll regeneration status:', err)
      // Don't stop polling on error - might be temporary network issue
    }
  }, 3000) // Poll every 3 seconds
}

function stopRegenerationPolling() {
  if (pollingInterval.value) {
    clearInterval(pollingInterval.value)
    pollingInterval.value = null
  }
}

function dismissRegenerationProgress() {
  regenerationState.value.active = false
  regenerationState.value.jobId = null
  regenerationState.value.status = 'idle'
  regenerationState.value.currentPhase = null
  regenerationState.value.progress = 0
  regenerationState.value.error = null
}

// Validation & Fix Functions
async function runLUTCheck() {
  lutCheckLoading.value = true
  lutCheckResult.value = null

  try {
    const apiBase = getApiUrl()
    const response = await fetch(`${apiBase}/api/courses/${courseCode}/phase/3/validate`, {
      method: 'POST'
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()
    lutCheckResult.value = result

    // Auto-trigger gap analysis if collisions found
    if (result.status === 'fail' && result.reextractionNeeded) {
      console.log('Collisions detected, running gap analysis...')
      setTimeout(() => runBasketGapAnalysis(), 500)
    }
  } catch (err) {
    console.error('LUT Check error:', err)
    alert(`LUT Check failed: ${err.message}`)
  } finally {
    lutCheckLoading.value = false
  }
}

async function runInfinitiveCheck() {
  infinitiveCheckLoading.value = true
  infinitiveCheckResult.value = null

  try {
    const apiBase = getApiUrl()
    const response = await fetch(`${apiBase}/api/courses/${courseCode}/phase/3/infinitive-check`, {
      method: 'POST'
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()
    infinitiveCheckResult.value = result
  } catch (err) {
    console.error('Infinitive Check error:', err)
    alert(`Infinitive Check failed: ${err.message}`)
  } finally {
    infinitiveCheckLoading.value = false
  }
}

async function runBasketGapAnalysis() {
  gapAnalysisLoading.value = true
  gapAnalysisResult.value = null

  try {
    const apiBase = getApiUrl()
    const response = await fetch(`${apiBase}/api/courses/${courseCode}/baskets/gaps`)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()
    gapAnalysisResult.value = result
  } catch (err) {
    console.error('Gap Analysis error:', err)
    alert(`Gap Analysis failed: ${err.message}`)
  } finally {
    gapAnalysisLoading.value = false
  }
}

async function regenerateBaskets() {
  if (!gapAnalysisResult.value) {
    alert('Please run Gap Analysis first')
    return
  }

  const missing = gapAnalysisResult.value.baskets_missing?.length || 0
  if (missing === 0) {
    alert('No missing baskets to regenerate')
    return
  }

  // Show confirmation in regenerationResult state (will trigger modal)
  regenerationResult.value = {
    confirming: true,
    missing,
    toDelete: gapAnalysisResult.value.baskets_to_delete?.length || 0,
    estimatedMinutes: Math.ceil(missing / 50) * 12
  }
}

async function confirmRegeneration() {
  regenerationLoading.value = true
  const missing = regenerationResult.value.missing
  const apiBase = getApiUrl()

  try {
    // Call orchestrator which proxies to Phase 5 server
    const response = await fetch(`${apiBase}/api/courses/${courseCode}/baskets/regenerate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        legoIds: gapAnalysisResult.value.baskets_missing,
        target: course.value.target_language?.toLowerCase() || 'spa',
        known: course.value.source_language?.toLowerCase() || 'eng'
      })
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`HTTP ${response.status}: ${text}`)
    }

    const result = await response.json()
    regenerationResult.value = {
      ...result,
      success: true,
      confirming: false
    }
  } catch (err) {
    console.error('Regeneration error:', err)
    regenerationResult.value = {
      error: err.message,
      confirming: false
    }
  } finally {
    regenerationLoading.value = false
  }
}

function cancelRegeneration() {
  regenerationResult.value = null
}

// Phase 8: Audio Generation - Navigate to pipeline view
function startAudioGeneration() {
  router.push({
    name: 'AudioPipelineView',
    params: { courseCode: courseCode }
  })
}

// ============================================================================
// AUDIO QA FUNCTIONS
// ============================================================================

function selectAudioRole(roleId) {
  selectedAudioRole.value = roleId
  currentAudioSample.value = null
}

async function getRandomSample() {
  if (!selectedAudioRole.value) return

  audioLoading.value = true
  try {
    const response = await api.getRandomAudioSample(courseCode, selectedAudioRole.value)
    if (response.success && response.sample) {
      currentAudioSample.value = response.sample

      // Add to history (avoid duplicates)
      const exists = audioSampleHistory.value.find(s => s.id === response.sample.id)
      if (!exists) {
        audioSampleHistory.value.unshift(response.sample)
        // Keep history to 20 items
        if (audioSampleHistory.value.length > 20) {
          audioSampleHistory.value.pop()
        }
      }
    }
  } catch (err) {
    console.error('Failed to get random sample:', err)
    toast.error('Failed to load sample')
  } finally {
    audioLoading.value = false
  }
}

async function playCurrentSample() {
  if (!currentAudioSample.value || !audioPlayerRef.value) return

  if (isPlaying.value) {
    audioPlayerRef.value.pause()
    audioPlayerRef.value.currentTime = 0
    isPlaying.value = false
    return
  }

  audioLoading.value = true
  try {
    // Get audio URL from API (streams from S3)
    const audioUrl = api.getAudioStreamUrl(currentAudioSample.value.id)
    audioPlayerRef.value.src = audioUrl
    await audioPlayerRef.value.play()
    isPlaying.value = true
  } catch (err) {
    console.error('Failed to play audio:', err)
    toast.error('Failed to play audio')
  } finally {
    audioLoading.value = false
  }
}

function handleAudioError(e) {
  console.error('Audio playback error:', e)
  isPlaying.value = false
  toast.error('Audio playback failed')
}

function loadSampleFromHistory(sample) {
  currentAudioSample.value = sample
  selectedAudioRole.value = sample.role
}

async function flagCurrentSample() {
  if (!currentAudioSample.value) return

  toast.info("Flagging audio samples isn't available yet.")
}

// Handle flag from learning cycle player
function handleCycleFlag(sampleId) {
  toast.info("Flagging cycle samples isn't available yet.")
}

// Cleanup on component unmount
onUnmounted(() => {
  stopRegenerationPolling()
  // Stop any playing audio
  if (audioPlayerRef.value) {
    audioPlayerRef.value.pause()
  }
})
</script>

<!--
  Light-mode-only contrast fixes for raw Tailwind palette text colours that do
  NOT re-theme. The -400/-300/-200/-100 utilities below are near-invisible on the
  light canvas/surface (1.3:1–2.9:1). Scoped under [data-theme="light"] so DARK
  MODE IS COMPLETELY UNCHANGED. Same hue family, darkened to pass WCAG AA.
-->
<style scoped>
:root[data-theme="light"] .text-cyan-400  { color: #0e7490; } /* cyan-700  ~4.7:1 on white */
:root[data-theme="light"] .text-blue-400  { color: #1d4ed8; } /* blue-700  ~6.3:1 */
:root[data-theme="light"] .text-blue-100  { color: #1e3a8a; } /* blue-900  on pale-blue chip */
:root[data-theme="light"] .text-purple-400,
:root[data-theme="light"] .text-purple-300 { color: #7e22ce; } /* purple-700 ~5.1:1 */
:root[data-theme="light"] .text-yellow-400 { color: #a16207; } /* yellow-700 ~4.6:1 */
:root[data-theme="light"] .text-green-400  { color: #047857; } /* match --accent-2 5.5:1 */
:root[data-theme="light"] .text-emerald-300,
:root[data-theme="light"] .text-emerald-200 { color: #065f46; } /* emerald-800 on pale-emerald feeder chip */
</style>
