<template>
  <div class="min-h-screen bg-slate-900 text-slate-100 p-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <div class="flex items-center gap-4 mb-4">
          <router-link to="/" class="text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
            </svg>
            Home
          </router-link>
          <span class="text-slate-600">•</span>
          <router-link to="/courses" class="text-emerald-400 hover:text-emerald-300">
            Course Library
          </router-link>
        </div>
        <div v-if="course" class="flex items-start justify-between">
          <div>
            <h1 class="text-4xl font-bold text-emerald-400 mb-2">
              {{ formatCourseCode(course.course_code) }}
            </h1>
            <p class="text-slate-400">{{ course.total_seeds }} seeds • Version {{ course.version }}</p>
          </div>
          <div class="flex items-center gap-3">
            <a
              href="https://ssi-dashboard-v7.vercel.app/generate"
              target="_blank"
              class="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg transition-colors font-semibold flex items-center gap-2"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              Course Generator
            </a>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <div class="text-slate-400">Loading course...</div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-900/20 border border-red-500/50 rounded-lg p-6">
        <h3 class="text-red-400 font-semibold mb-2">Error Loading Course</h3>
        <p class="text-slate-300">{{ error }}</p>
      </div>

      <!-- Course Content -->
      <div v-else-if="course" class="space-y-6">
        <!-- Stats Overview -->
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div class="text-sm text-slate-400 mb-1">SEED_PAIRS</div>
            <div class="text-3xl font-bold text-emerald-400">{{ course.seed_pairs || 0 }}</div>
            <div class="text-xs text-slate-500 mt-1">Phase 1 translations</div>
          </div>
          <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div class="text-sm text-slate-400 mb-1">LEGO_PAIRS</div>
            <div class="text-3xl font-bold text-emerald-400">{{ actualLegoCount }}</div>
            <div class="text-xs text-slate-500 mt-1">Phase 3 teaching units</div>
          </div>
          <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div class="text-sm text-slate-400 mb-1">LEGO_BASKETS</div>
            <div class="text-3xl font-bold text-emerald-400">{{ basketsData?.baskets ? Object.keys(basketsData.baskets).length : 0 }}</div>
            <div class="text-xs text-slate-500 mt-1">Phase 5 lesson groupings</div>
          </div>
          <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div class="text-sm text-slate-400 mb-1">INTRODUCTIONS</div>
            <div class="text-3xl font-bold text-emerald-400">{{ actualLegoCount }}</div>
            <div class="text-xs text-slate-500 mt-1">Known-only priming (1 per LEGO)</div>
          </div>
        </div>

        <!-- Progress Monitor (shown when basket generation is active) -->
        <ProgressMonitor
          v-if="showProgressMonitor"
          :course-code="courseCode"
          :poll-interval="5000"
        />

        <!-- Validation & Fix Panel -->
        <div v-if="showValidationPanel" class="bg-slate-800 border border-emerald-500/50 rounded-lg p-6">
          <h3 class="text-xl font-semibold text-emerald-400 mb-6">🔬 Quality Control & Basket Management</h3>

          <div class="grid grid-cols-4 gap-6">
            <!-- LUT Check -->
            <div class="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
              <h4 class="font-semibold text-emerald-400 mb-2">LUT Check (Phase 3.6)</h4>
              <p class="text-sm text-slate-400 mb-4">
                Check for LEGO collisions (same KNOWN → different TARGETs)
              </p>
              <button
                @click="runLUTCheck"
                :disabled="lutCheckLoading"
                class="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg transition text-white flex items-center justify-center gap-2"
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
                  <span v-if="lutCheckResult.status === 'pass'" class="text-emerald-400">✓</span>
                  <span v-else class="text-red-400">✗</span>
                  <span class="font-semibold" :class="{
                    'text-emerald-400': lutCheckResult.status === 'pass',
                    'text-red-400': lutCheckResult.status === 'fail'
                  }">
                    {{ lutCheckResult.status === 'pass' ? 'No Collisions' : `${lutCheckResult.collisions} Collisions Found` }}
                  </span>
                </div>
                <p v-if="lutCheckResult.manifest" class="text-xs text-slate-400">
                  Affected seeds: {{ lutCheckResult.manifest.affected_seeds?.length || 0 }}
                </p>
              </div>
            </div>

            <!-- Infinitive Check (English only) -->
            <div class="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
              <h4 class="font-semibold text-emerald-400 mb-2">Infinitive Check</h4>
              <p class="text-sm text-slate-400 mb-4">
                Validate infinitive forms in English LEGOs
              </p>
              <button
                @click="runInfinitiveCheck"
                :disabled="infinitiveCheckLoading"
                class="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg transition text-white flex items-center justify-center gap-2"
              >
                <span v-if="infinitiveCheckLoading" class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                <span v-else>📝</span>
                {{ infinitiveCheckLoading ? 'Checking...' : 'Check Infinitives' }}
              </button>

              <!-- Infinitive Results -->
              <div v-if="infinitiveCheckResult" class="mt-4 p-3 rounded-lg border" :class="{
                'bg-emerald-900/20 border-emerald-500/50': infinitiveCheckResult.status === 'pass',
                'bg-yellow-900/20 border-yellow-500/50': infinitiveCheckResult.status === 'fail',
                'bg-slate-900/20 border-slate-500/50': infinitiveCheckResult.status === 'skip'
              }">
                <div class="flex items-center gap-2 mb-2">
                  <span v-if="infinitiveCheckResult.status === 'pass'" class="text-emerald-400">✓</span>
                  <span v-else-if="infinitiveCheckResult.status === 'fail'" class="text-yellow-400">⚠</span>
                  <span v-else class="text-slate-400">—</span>
                  <span class="font-semibold text-sm" :class="{
                    'text-emerald-400': infinitiveCheckResult.status === 'pass',
                    'text-yellow-400': infinitiveCheckResult.status === 'fail',
                    'text-slate-400': infinitiveCheckResult.status === 'skip'
                  }">
                    {{ infinitiveCheckResult.status === 'pass' ? 'All Valid' :
                       infinitiveCheckResult.status === 'skip' ? 'N/A' :
                       `${infinitiveCheckResult.violations} Issues` }}
                  </span>
                </div>
                <div v-if="infinitiveCheckResult.summary" class="text-xs text-slate-400 space-y-1">
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
            <div class="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
              <h4 class="font-semibold text-emerald-400 mb-2">Basket Gap Analysis</h4>
              <p class="text-sm text-slate-400 mb-4">
                Identify missing baskets and deprecated baskets
              </p>
              <button
                @click="runBasketGapAnalysis"
                :disabled="gapAnalysisLoading"
                class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg transition text-white flex items-center justify-center gap-2"
              >
                <span v-if="gapAnalysisLoading" class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                <span v-else>📊</span>
                {{ gapAnalysisLoading ? 'Analyzing...' : 'Analyze Gaps' }}
              </button>

              <!-- Gap Results -->
              <div v-if="gapAnalysisResult" class="mt-4 p-3 rounded-lg border bg-blue-900/20 border-blue-500/50">
                <div class="text-sm space-y-1">
                  <div class="flex justify-between text-slate-300">
                    <span>Coverage:</span>
                    <span class="font-semibold">{{ gapAnalysisResult.coverage_percentage }}%</span>
                  </div>
                  <div class="flex justify-between text-slate-400">
                    <span>Missing:</span>
                    <span>{{ gapAnalysisResult.baskets_missing?.length || 0 }}</span>
                  </div>
                  <div class="flex justify-between text-slate-400">
                    <span>To Delete:</span>
                    <span>{{ gapAnalysisResult.baskets_to_delete?.length || 0 }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Regenerate Baskets -->
            <div class="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
              <h4 class="font-semibold text-emerald-400 mb-2">Regenerate Baskets</h4>
              <p class="text-sm text-slate-400 mb-4">
                Generate missing baskets after collision fixes
              </p>
              <button
                @click="regenerateBaskets"
                :disabled="regenerationLoading || !gapAnalysisResult || (gapAnalysisResult.baskets_missing?.length || 0) === 0"
                class="w-full px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg transition text-white flex items-center justify-center gap-2"
              >
                <span v-if="regenerationLoading" class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                <span v-else>🔄</span>
                {{ regenerationLoading ? 'Regenerating...' : 'Regenerate' }}
              </button>

              <!-- Regeneration Status -->
              <div v-if="regenerationResult" class="mt-4 p-3 rounded-lg border bg-purple-900/20 border-purple-500/50">
                <div class="text-sm text-slate-300">
                  <div>✓ Cleanup: {{ regenerationResult.cleanup?.deletedOldBaskets || 0 }} deleted</div>
                  <div>⏳ Generating {{ regenerationResult.segmentation?.totalBaskets || 0 }} baskets...</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Pipeline Actions (Phase 7 & 8) -->
        <div class="bg-slate-800 border border-purple-500/50 rounded-lg p-6">
          <h3 class="text-xl font-semibold text-purple-400 mb-6">🎵 Audio Generation (Phase 8)</h3>

          <div class="grid grid-cols-2 gap-6">
            <!-- Phase 7 Status -->
            <div class="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
              <h4 class="font-semibold text-emerald-400 mb-2">Phase 7 Status</h4>
              <p class="text-sm text-slate-400 mb-4">
                Course manifest must be compiled before audio generation
              </p>
              <div class="p-3 rounded-lg border" :class="{
                'bg-emerald-900/20 border-emerald-500/50': course.phases_completed?.includes('7'),
                'bg-slate-900/20 border-slate-500/50': !course.phases_completed?.includes('7')
              }">
                <div class="flex items-center gap-2">
                  <span v-if="course.phases_completed?.includes('7')" class="text-emerald-400 text-lg">✓</span>
                  <span v-else class="text-slate-500 text-lg">○</span>
                  <span class="font-semibold" :class="{
                    'text-emerald-400': course.phases_completed?.includes('7'),
                    'text-slate-400': !course.phases_completed?.includes('7')
                  }">
                    {{ course.phases_completed?.includes('7') ? 'Ready for Audio' : 'Manifest Not Compiled' }}
                  </span>
                </div>
                <p class="text-xs text-slate-500 mt-2">
                  Phases completed: {{ course.phases_completed?.join(', ') || 'None' }}
                </p>
              </div>
            </div>

            <!-- Phase 8 Audio Generation -->
            <div class="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
              <h4 class="font-semibold text-purple-400 mb-2">Generate Audio (TTS)</h4>
              <p class="text-sm text-slate-400 mb-4">
                Generate audio files for all course samples
              </p>
              <button
                @click="startAudioGeneration"
                :disabled="audioGenerationLoading || !course.phases_completed?.includes('7')"
                class="w-full px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg transition text-white flex items-center justify-center gap-2"
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
                    <div class="text-xs text-slate-400 mt-1">
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
        <div class="bg-slate-800 border border-slate-700 rounded-lg">
          <div class="flex border-b border-slate-700">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              @click="activeTab = tab.id"
              class="px-6 py-3 text-sm font-medium transition-colors"
              :class="activeTab === tab.id
                ? 'text-emerald-400 border-b-2 border-emerald-400'
                : 'text-slate-400 hover:text-slate-300'"
            >
              {{ tab.label }}
            </button>
          </div>

          <div class="p-6">
            <!-- Translations Tab -->
            <div v-if="activeTab === 'translations'">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold text-emerald-400">SEED_PAIRS (Phase 1)</h3>
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="Search translations..."
                  class="bg-slate-900 border border-slate-700 rounded px-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div v-if="filteredTranslations.length === 0" class="text-center py-8 text-slate-400">
                No translations found
              </div>

              <div v-else class="space-y-3">
                <div
                  v-for="translation in filteredTranslations"
                  :key="translation.seed_id || translation.uuid"
                  class="bg-slate-900/50 border border-slate-700 rounded-lg p-4 hover:border-emerald-500/50 transition-colors"
                >
                  <div class="flex items-start justify-between mb-2">
                    <div class="flex-1">
                      <div class="text-emerald-400 font-medium mb-1">{{ translation.source }}</div>
                      <div class="text-slate-300 text-sm">{{ translation.target }}</div>
                    </div>
                    <button
                      @click="editTranslation(translation)"
                      class="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded text-sm ml-4"
                    >
                      Edit
                    </button>
                  </div>
                  <div class="flex gap-4 text-xs text-slate-500 mt-3">
                    <span>Seed: {{ translation.seed_id }}</span>
                    <span v-if="translation.uuid">UUID: {{ translation.uuid.substring(0, 8) }}...</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- LEGOs Tab -->
            <div v-if="activeTab === 'legos'">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold text-emerald-400">SEED → LEGO Breakdown (Phase 3)</h3>
                <div class="text-sm text-slate-400">
                  <span v-if="legoSearchQuery">{{ filteredLegoBreakdowns.length }} of </span>{{ legoBreakdowns.length }} seeds • {{ legos.length }} LEGO pairs
                </div>
              </div>

              <!-- Search Bar -->
              <div v-if="legoBreakdowns.length > 0" class="mb-4">
                <input
                  v-model="legoSearchQuery"
                  type="text"
                  placeholder="Search by SEED ID (e.g. S0001), target phrase, known phrase, or LEGO content..."
                  class="w-full bg-slate-900 border border-slate-700 rounded px-4 py-2 text-sm text-slate-300 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div v-if="legoBreakdowns.length === 0" class="text-center py-8 text-slate-400">
                No LEGO_PAIRS found. Run Phase 3-4 to generate them.
              </div>

              <div v-else-if="filteredLegoBreakdowns.length === 0" class="text-center py-8 text-slate-400">
                No breakdowns match your search.
              </div>

              <div v-else class="space-y-6">
                <div
                  v-for="breakdown in filteredLegoBreakdowns"
                  :key="breakdown.seed_id"
                  class="bg-slate-800 border rounded-lg overflow-hidden"
                  :class="{
                    'border-emerald-500': breakdown.lego_pairs?.length > 0,
                    'border-yellow-500': !breakdown.lego_pairs || breakdown.lego_pairs.length === 0,
                    'border-blue-500 ring-2 ring-blue-500/50': editingBreakdown === breakdown.seed_id
                  }"
                >
                  <!-- Breakdown Header -->
                  <div class="px-6 py-4 border-b bg-slate-800/50 flex items-center justify-between"
                       :class="{
                         'border-slate-700': editingBreakdown !== breakdown.seed_id,
                         'border-blue-500': editingBreakdown === breakdown.seed_id
                       }">
                    <div class="flex items-center gap-4">
                      <span class="text-sm font-mono text-cyan-400 bg-cyan-400/10 px-3 py-1 rounded">
                        {{ breakdown.seed_id }}
                      </span>
                      <span class="text-xs text-slate-400">
                        {{ breakdown.lego_pairs?.length || 0 }} LEGOs • {{ (breakdown.feeder_pairs || []).length }} FEEDERs
                      </span>
                      <span v-if="breakdown.lego_pairs?.some(lp => lp.lego_type === 'COMPOSITE')" class="text-xs text-purple-400">
                        ⚡ Contains composites
                      </span>
                    </div>

                    <button
                      v-if="editingBreakdown !== breakdown.seed_id"
                      @click="startEditingBreakdown(breakdown)"
                      class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition"
                    >
                      Edit LEGOs
                    </button>
                    <div v-else class="flex gap-2">
                      <button
                        @click="saveBreakdown(breakdown)"
                        class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded transition"
                      >
                        Save Changes
                      </button>
                      <button
                        @click="cancelEditingBreakdown"
                        class="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white text-sm rounded transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>

                  <!-- Breakdown Content -->
                  <div class="p-6">
                    <!-- Full Sentences (Reference) -->
                    <div class="mb-6 text-sm text-slate-400 bg-slate-900/50 rounded p-4">
                      <div class="mb-2">
                        <span class="text-emerald-400 font-semibold">Target:</span> {{ breakdown.original_target }}
                      </div>
                      <div>
                        <span class="text-slate-300 font-semibold">Known:</span> {{ breakdown.original_known }}
                      </div>
                    </div>

                    <!-- View Mode: 3-Level Hierarchy Display -->
                    <div v-if="editingBreakdown !== breakdown.seed_id">
                      <div v-if="breakdown.lego_pairs && breakdown.lego_pairs.length > 0" class="space-y-6">

                        <!-- LEGO Containers (Target Language) -->
                        <div class="flex flex-wrap gap-3 justify-center">
                          <div
                            v-for="(pair, index) in breakdown.lego_pairs"
                            :key="pair.lego_id"
                            class="px-4 py-3 rounded-lg border-2 transition-all"
                            :class="pair.lego_type === 'COMPOSITE'
                              ? 'bg-purple-900/30 border-purple-500 hover:bg-purple-900/50'
                              : 'bg-blue-900/30 border-blue-600 hover:bg-blue-900/50'"
                          >
                            <div class="text-blue-100 font-medium text-center mb-1">
                              {{ pair.target_chunk }}
                            </div>
                            <div class="text-xs text-blue-400 text-center font-mono">
                              {{ pair.lego_id }}
                              <span v-if="pair.lego_type === 'COMPOSITE'" class="ml-1 text-purple-400">⚡</span>
                            </div>
                          </div>
                        </div>

                        <!-- Arrow Down -->
                        <div class="flex justify-center">
                          <svg class="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"/>
                          </svg>
                        </div>

                        <!-- LEGO Containers (Known Language) -->
                        <div class="flex flex-wrap gap-3 justify-center">
                          <div
                            v-for="(pair, index) in breakdown.lego_pairs"
                            :key="'known-' + pair.lego_id"
                            class="px-4 py-3 rounded-lg border-2 transition-all"
                            :class="pair.lego_type === 'COMPOSITE'
                              ? 'bg-purple-900/20 border-purple-600/50 hover:bg-purple-900/30'
                              : 'bg-slate-700/50 border-slate-600 hover:bg-slate-700'"
                          >
                            <div class="text-slate-100 font-medium text-center">
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
                          <div class="text-sm text-slate-300 font-mono bg-slate-900/50 rounded p-3 mb-3">
                            {{ pair.componentization || 'No componentization details provided' }}
                          </div>

                          <!-- Associated Feeders (filtered by parent_lego_id) -->
                          <div v-if="getFeedersForLego(breakdown, pair.lego_id).length > 0" class="mt-3">
                            <div class="text-xs text-slate-400 mb-2 uppercase">Associated Feeders:</div>
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

                      <div v-else class="text-center py-8 text-slate-400">
                        No LEGO_PAIRS extracted yet
                      </div>
                    </div>

                    <!-- Edit Mode: Word Divider Editor (New) or Container Editor (Classic) -->
                    <div v-else class="space-y-6">
                      <!-- Editor Mode Toggle -->
                      <div class="flex items-center justify-between mb-4">
                        <div class="text-sm text-slate-400">
                          Editing: {{ breakdown.seed_id }}
                        </div>
                        <button
                          @click="useNewEditor = !useNewEditor"
                          class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded transition flex items-center gap-2"
                        >
                          <span>{{ useNewEditor ? '📊 Classic Editor' : '✨ New Interactive Editor' }}</span>
                        </button>
                      </div>

                      <!-- New Word Divider Editor -->
                      <div v-if="useNewEditor">
                        <WordDividerEditor
                          :breakdown="breakdown"
                          @update-legos="handleLegoUpdate"
                        />
                      </div>

                      <!-- Classic Container-Based Editor -->
                      <div v-else>
                        <!-- Instructions -->
                        <div class="p-4 bg-blue-900/20 border border-blue-700/50 rounded">
                          <div class="text-sm text-blue-200">
                            <div class="font-semibold mb-2">✏️ Classic Editing Mode</div>
                            <p class="text-xs text-blue-300">
                              Edit LEGO containers, merge/split them, toggle BASE/COMPOSITE, edit componentization, and create FEEDERs. LEGOs must tile perfectly to cover the entire sentence.
                            </p>
                          </div>
                        </div>

                      <!-- Editable LEGO Containers -->
                      <div class="space-y-4">
                        <div class="text-sm font-semibold text-emerald-300 mb-2">LEGO Containers</div>
                        <div
                          v-for="(lego, index) in getEditableLegos(breakdown)"
                          :key="index"
                          class="border rounded-lg p-4"
                          :class="lego.lego_type === 'COMPOSITE' ? 'border-purple-500 bg-purple-900/10' : 'border-blue-600 bg-blue-900/10'"
                        >
                          <!-- LEGO Header -->
                          <div class="flex items-center justify-between mb-3">
                            <div class="flex items-center gap-3">
                              <span class="text-xs font-mono text-slate-400">{{ index + 1 }}</span>
                              <input
                                v-model="lego.lego_id"
                                class="text-xs font-mono bg-slate-900 border border-slate-700 rounded px-2 py-1 text-cyan-400 w-24"
                                placeholder="S0001L01"
                              />
                              <select
                                v-model="lego.lego_type"
                                class="text-xs bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-300"
                              >
                                <option value="BASE">BASE</option>
                                <option value="COMPOSITE">COMPOSITE ⚡</option>
                              </select>
                            </div>
                            <div class="flex items-center gap-2">
                              <button
                                v-if="index > 0"
                                @click="mergeLego(breakdown, index)"
                                class="text-xs px-2 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded"
                                title="Merge with previous LEGO"
                              >
                                ⬅️ Merge
                              </button>
                              <button
                                @click="splitLego(breakdown, index)"
                                class="text-xs px-2 py-1 bg-blue-700 hover:bg-blue-600 text-white rounded"
                                title="Split this LEGO"
                              >
                                ✂️ Split
                              </button>
                              <button
                                v-if="getEditableLegos(breakdown).length > 1"
                                @click="deleteLego(breakdown, index)"
                                class="text-xs px-2 py-1 bg-red-700 hover:bg-red-600 text-white rounded"
                                title="Delete this LEGO"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>

                          <!-- Target Language Input -->
                          <div class="mb-3">
                            <label class="text-xs text-blue-400 mb-1 block">Target Language</label>
                            <input
                              v-model="lego.target_chunk"
                              class="w-full bg-blue-900/30 border border-blue-700 rounded px-3 py-2 text-blue-100 focus:outline-none focus:border-blue-500"
                              placeholder="Target chunk..."
                            />
                          </div>

                          <!-- Known Language Input -->
                          <div class="mb-3">
                            <label class="text-xs text-slate-400 mb-1 block">Known Language</label>
                            <input
                              v-model="lego.known_chunk"
                              class="w-full bg-slate-700/50 border border-slate-600 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-slate-500"
                              placeholder="Known chunk..."
                            />
                          </div>

                          <!-- FD Validation Toggle -->
                          <div class="mb-3 flex items-center gap-2">
                            <input
                              type="checkbox"
                              v-model="lego.fd_validated"
                              class="rounded border-slate-600"
                            />
                            <label class="text-xs text-slate-400">FD Validated</label>
                          </div>

                          <!-- DEBUG: Show lego type for verification -->
                          <div class="text-xs text-slate-500 mb-2">
                            Type: {{ lego.lego_type }} | Has componentization: {{ !!lego.componentization }}
                          </div>

                          <!-- COMPONENTIZATION Editor (for COMPOSITE LEGOs) -->
                          <div v-if="lego.lego_type === 'COMPOSITE'" class="mt-3 pt-3 border-t border-purple-700/50 space-y-3">
                            <div>
                              <label class="text-xs text-purple-400 mb-1 block">Componentization (Target ⟷ Known pairs, one per line)</label>
                              <textarea
                                v-model="lego.componentization"
                                class="w-full bg-purple-900/20 border border-purple-700 rounded px-3 py-2 text-purple-100 focus:outline-none focus:border-purple-500 font-mono text-sm"
                                rows="4"
                                placeholder="lo más ⟷ as&#10;frecuentemente ⟷ often&#10;posible ⟷ possible"
                              ></textarea>
                              <div class="text-xs text-purple-400/60 mt-1">Format: target ⟷ known (one pair per line, or use commas/JSON)</div>
                            </div>

                            <!-- FEEDERs for this COMPOSITE LEGO -->
                            <div class="space-y-2">
                              <div class="flex items-center justify-between">
                                <label class="text-xs text-emerald-400 font-semibold">Associated FEEDERs</label>
                                <button
                                  @click="addFeederToLego(breakdown, lego.lego_id)"
                                  class="text-xs px-2 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded"
                                >
                                  + Add FEEDER
                                </button>
                              </div>

                              <div
                                v-for="(feeder, fIndex) in getFeedersForLegoInEdit(breakdown, lego.lego_id)"
                                :key="fIndex"
                                class="border border-emerald-700/30 bg-emerald-900/10 rounded p-2"
                              >
                                <div class="flex items-center justify-between mb-2">
                                  <input
                                    v-model="feeder.feeder_id"
                                    class="text-xs font-mono bg-slate-900 border border-slate-700 rounded px-2 py-1 text-emerald-400 w-24"
                                    placeholder="S0001F01"
                                  />
                                  <button
                                    @click="deleteFeederFromLego(breakdown, lego.lego_id, fIndex)"
                                    class="text-xs px-2 py-1 bg-red-700 hover:bg-red-600 text-white rounded"
                                  >
                                    🗑️
                                  </button>
                                </div>
                                <div class="grid grid-cols-2 gap-2">
                                  <div>
                                    <label class="text-xs text-blue-400 mb-1 block">Target</label>
                                    <input
                                      v-model="feeder.target_chunk"
                                      class="w-full bg-blue-900/30 border border-blue-700 rounded px-2 py-1 text-blue-100 text-xs"
                                      placeholder="target..."
                                    />
                                  </div>
                                  <div>
                                    <label class="text-xs text-slate-400 mb-1 block">Known</label>
                                    <input
                                      v-model="feeder.known_chunk"
                                      class="w-full bg-slate-700/50 border border-slate-600 rounded px-2 py-1 text-slate-100 text-xs"
                                      placeholder="known..."
                                    />
                                  </div>
                                </div>
                              </div>

                              <div v-if="getFeedersForLegoInEdit(breakdown, lego.lego_id).length === 0" class="text-center py-2 text-slate-500 text-xs">
                                No FEEDERs yet
                              </div>
                            </div>
                          </div>
                        </div>

                        <!-- Add New LEGO Button -->
                        <button
                          @click="addNewLego(breakdown)"
                          class="w-full py-2 border-2 border-dashed border-slate-600 hover:border-emerald-500 text-slate-400 hover:text-emerald-400 rounded-lg transition-colors"
                        >
                          + Add New LEGO Container
                        </button>
                      </div>
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
              <h3 class="text-lg font-semibold text-emerald-400 mb-4">LEGO Presentations (Phase 6)</h3>

              <div v-if="!introductionsData || !introductionsData.presentations" class="text-center py-8 text-slate-400">
                No presentations found. Phase 6 may not be complete yet.
              </div>

              <div v-else class="space-y-3">
                <div
                  v-for="(presentation, legoId) in introductionsData.presentations"
                  :key="legoId"
                  class="bg-slate-900/50 border border-slate-700 rounded-lg p-4 hover:border-emerald-500/50 transition-colors"
                >
                  <div class="flex items-start gap-4">
                    <div class="font-mono text-xs text-cyan-400 bg-cyan-900/30 px-2 py-1 rounded h-fit">
                      {{ legoId }}
                    </div>
                    <div class="flex-1">
                      <!-- View mode -->
                      <div v-if="editingIntro !== legoId">
                        <p class="text-slate-300 text-sm leading-relaxed">{{ typeof presentation === 'string' ? presentation : presentation.text }}</p>
                        <span v-if="typeof presentation === 'object' && presentation.edited" class="inline-block mt-2 text-xs text-amber-400 bg-amber-900/30 px-2 py-1 rounded">
                          ✏️ Custom edited
                        </span>
                      </div>

                      <!-- Edit mode -->
                      <div v-else>
                        <textarea
                          v-model="editedIntroText"
                          class="w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-slate-300 text-sm leading-relaxed font-mono resize-none"
                          rows="3"
                          placeholder="Edit introduction text..."
                        ></textarea>
                        <div class="mt-2 text-xs text-slate-500">
                          Use <code class="bg-slate-800 px-1 rounded">{target1}</code> for target language audio
                        </div>
                      </div>
                    </div>

                    <!-- Action buttons -->
                    <div class="flex gap-2">
                      <button
                        v-if="editingIntro !== legoId"
                        @click="startEditIntro(legoId, presentation)"
                        class="text-emerald-400 hover:text-emerald-300 text-sm px-3 py-1 border border-emerald-500/30 hover:border-emerald-500/50 rounded transition-colors"
                      >
                        Edit
                      </button>
                      <template v-else>
                        <button
                          @click="saveIntro(legoId)"
                          :disabled="savingIntro"
                          class="text-emerald-400 hover:text-emerald-300 text-sm px-3 py-1 border border-emerald-500/30 hover:border-emerald-500/50 rounded transition-colors disabled:opacity-50"
                        >
                          {{ savingIntro ? 'Saving...' : 'Save' }}
                        </button>
                        <button
                          @click="cancelEditIntro"
                          :disabled="savingIntro"
                          class="text-slate-400 hover:text-slate-300 text-sm px-3 py-1 border border-slate-600 hover:border-slate-500 rounded transition-colors disabled:opacity-50"
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

    <!-- Enhanced Regeneration Progress UI -->
    <div
      v-if="regenerationState.active"
      class="fixed bottom-4 right-4 bg-slate-800 border border-emerald-500/30 rounded-lg p-6 w-96 shadow-2xl z-50"
    >
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-emerald-400">Regenerating Course</h3>
        <button
          v-if="regenerationState.status === 'completed' || regenerationState.status === 'failed'"
          @click="dismissRegenerationProgress"
          class="text-slate-400 hover:text-slate-300"
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

        <div v-else-if="regenerationState.status === 'completed'" class="flex items-center gap-2 text-green-400">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
          </svg>
          <span>Regeneration complete!</span>
        </div>

        <div v-else-if="regenerationState.status === 'failed'" class="flex items-center gap-2 text-red-400">
          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
          </svg>
          <span>Regeneration failed</span>
        </div>
      </div>

      <!-- Progress bar -->
      <div v-if="regenerationState.status === 'running' || regenerationState.status === 'queued'" class="mb-3">
        <div class="w-full bg-slate-700 rounded-full h-2">
          <div
            class="bg-emerald-500 h-2 rounded-full transition-all duration-300"
            :style="{ width: regenerationState.progress + '%' }"
          ></div>
        </div>
        <div class="text-xs text-slate-400 mt-1 text-right">
          {{ Math.round(regenerationState.progress) }}%
        </div>
      </div>

      <!-- Error message -->
      <div v-if="regenerationState.error" class="mt-3 text-sm text-red-400 bg-red-900/20 border border-red-500/30 rounded p-2">
        {{ regenerationState.error }}
      </div>

      <!-- Job ID for debugging -->
      <div class="text-xs text-slate-500 mt-3">
        Job ID: {{ regenerationState.jobId }}
      </div>
    </div>

    <!-- Edit Modal -->
    <div
      v-if="editModal.open"
      class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      @click.self="closeEditModal"
    >
      <div class="bg-slate-800 border border-slate-700 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <!-- Modal Header -->
        <div class="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 class="text-2xl font-bold text-emerald-400">Edit Translation</h2>
            <p class="text-sm text-slate-400 mt-1">{{ editModal.translation?.seed_id }}</p>
          </div>
          <button
            @click="closeEditModal"
            class="text-slate-400 hover:text-slate-300 text-2xl"
          >
            ×
          </button>
        </div>

        <!-- Modal Body -->
        <div class="p-6 space-y-6">
          <!-- Impact Analysis -->
          <div v-if="editModal.impact" class="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-4">
            <div class="text-yellow-400 font-semibold mb-2">⚠️ Edit Impact</div>
            <div class="text-sm text-slate-300">
              Editing this translation will regenerate:
            </div>
            <div class="grid grid-cols-3 gap-4 mt-3">
              <div>
                <div class="text-xs text-slate-400">LEGOs</div>
                <div class="text-xl font-bold text-yellow-400">{{ editModal.impact.legos }}</div>
              </div>
              <div>
                <div class="text-xs text-slate-400">Deduplicated</div>
                <div class="text-xl font-bold text-yellow-400">{{ editModal.impact.deduplicated }}</div>
              </div>
              <div>
                <div class="text-xs text-slate-400">Baskets Affected</div>
                <div class="text-xl font-bold text-yellow-400">{{ editModal.impact.baskets }}</div>
              </div>
            </div>
          </div>

          <!-- Edit Form -->
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-slate-300 mb-2">
                Known Language (Source)
              </label>
              <textarea
                v-model="editModal.editedSource"
                class="w-full bg-slate-900 border border-slate-700 rounded px-4 py-3 text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                rows="3"
              ></textarea>
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-300 mb-2">
                Target Language
              </label>
              <textarea
                v-model="editModal.editedTarget"
                class="w-full bg-slate-900 border border-slate-700 rounded px-4 py-3 text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                rows="3"
              ></textarea>
            </div>
          </div>

          <!-- Original Values -->
          <div class="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
            <div class="text-xs text-slate-400 mb-2">Original Values</div>
            <div class="space-y-2 text-sm">
              <div>
                <span class="text-slate-500">Source:</span>
                <span class="text-slate-300 ml-2">{{ editModal.translation?.source }}</span>
              </div>
              <div>
                <span class="text-slate-500">Target:</span>
                <span class="text-slate-300 ml-2">{{ editModal.translation?.target }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="flex items-center justify-end gap-3 p-6 border-t border-slate-700">
          <button
            @click="closeEditModal"
            class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
          >
            Cancel
          </button>
          <button
            @click="saveTranslation"
            :disabled="editModal.saving"
            class="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded transition-colors"
          >
            {{ editModal.saving ? 'Saving...' : 'Save & Regenerate' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Regeneration Confirmation Modal -->
    <div v-if="regenerationResult?.confirming" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="bg-slate-800 border border-purple-500/50 rounded-lg max-w-lg w-full p-6">
        <h3 class="text-2xl font-bold text-purple-400 mb-4">🔄 Regenerate Baskets?</h3>

        <div class="space-y-4 mb-6">
          <p class="text-slate-300">
            This will regenerate <span class="font-bold text-emerald-400">{{ regenerationResult.missing }}</span> missing baskets.
          </p>

          <div class="bg-slate-900/50 border border-slate-700 rounded-lg p-4 space-y-2 text-sm">
            <div class="flex items-center gap-2">
              <span class="text-slate-400">1.</span>
              <span class="text-slate-300">Delete <span class="font-semibold text-red-400">{{ regenerationResult.toDelete }}</span> deprecated baskets</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-slate-400">2.</span>
              <span class="text-slate-300">Generate <span class="font-semibold text-emerald-400">{{ regenerationResult.missing }}</span> new baskets</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-slate-400">3.</span>
              <span class="text-slate-300">Auto-merge when complete</span>
            </div>
          </div>

          <div class="bg-blue-900/20 border border-blue-500/50 rounded-lg p-3 text-sm">
            <div class="flex items-center gap-2">
              <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span class="text-slate-300">Estimated time: <span class="font-semibold text-blue-400">~{{ regenerationResult.estimatedMinutes }} minutes</span></span>
            </div>
          </div>
        </div>

        <div class="flex gap-3">
          <button
            @click="cancelRegeneration"
            class="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition font-semibold"
          >
            Cancel
          </button>
          <button
            @click="confirmRegeneration"
            :disabled="regenerationLoading"
            class="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg transition font-semibold flex items-center justify-center gap-2"
          >
            <span v-if="regenerationLoading" class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
            {{ regenerationLoading ? 'Starting...' : 'OK' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Regeneration Success/Error Modal -->
    <div v-if="regenerationResult && !regenerationResult.confirming && (regenerationResult.success || regenerationResult.error)" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="bg-slate-800 border rounded-lg max-w-lg w-full p-6" :class="regenerationResult.error ? 'border-red-500/50' : 'border-emerald-500/50'">
        <h3 class="text-2xl font-bold mb-4" :class="regenerationResult.error ? 'text-red-400' : 'text-emerald-400'">
          {{ regenerationResult.error ? '❌ Error' : '✅ Started!' }}
        </h3>

        <div v-if="regenerationResult.error" class="mb-6">
          <p class="text-slate-300 mb-2">Failed to start basket regeneration:</p>
          <div class="bg-red-900/20 border border-red-500/50 rounded-lg p-3 text-sm text-red-300">
            {{ regenerationResult.error }}
          </div>
        </div>

        <div v-else class="space-y-4 mb-6">
          <p class="text-slate-300">Basket regeneration has started!</p>

          <div class="bg-slate-900/50 border border-slate-700 rounded-lg p-4 space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-slate-400">Browsers:</span>
              <span class="text-emerald-400 font-semibold">{{ regenerationResult.segmentation?.browsersNeeded || 0 }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Baskets:</span>
              <span class="text-emerald-400 font-semibold">{{ regenerationResult.segmentation?.totalBaskets || 0 }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Estimated time:</span>
              <span class="text-blue-400 font-semibold">{{ regenerationResult.segmentation?.estimatedTime || 'Unknown' }}</span>
            </div>
          </div>

          <p class="text-sm text-slate-400">The process will run in the background. Baskets will auto-merge when complete.</p>
        </div>

        <button
          @click="regenerationResult = null"
          class="w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition font-semibold"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '../services/api'
import { GITHUB_CONFIG } from '../config/github'
import WordDividerEditor from '../components/lego-editor/WordDividerEditor.vue'
import LegoBasketViewer from '../components/LegoBasketViewer.vue'
import ProgressMonitor from '../components/ProgressMonitor.vue'

const route = useRoute()
const courseCode = route.params.courseCode

const course = ref(null)
const translations = ref([])
const legos = ref([])
const legoBreakdowns = ref([]) // Raw breakdown data for visualizer
const baskets = ref([])
const basketsData = ref(null) // LEGO_BASKETS data structure from baskets.json
const legoPairsData = ref(null) // LEGO_PAIRS data structure from lego_pairs.json
const expandedBaskets = ref({}) // Track which baskets are expanded
const loading = ref(true)
const error = ref(null)
const editingBreakdown = ref(null) // Track which seed breakdown is being edited
const editDividers = ref({}) // Track divider positions for editing
const useNewEditor = ref(true) // Toggle between new word-divider editor and old container-based editor
const updatedLegos = ref({}) // Store LEGO updates from WordDividerEditor

const activeTab = ref('translations')
const searchQuery = ref('')
const legoSearchQuery = ref('') // Search for LEGO breakdowns
const selectedSeed = ref('')
const introductionsData = ref(null) // Introductions data from introductions.json

// Introduction edit state
const editingIntro = ref(null) // LEGO ID being edited
const editedIntroText = ref('') // Edited text
const savingIntro = ref(false) // Saving state

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

const tabs = [
  { id: 'translations', label: 'SEED_PAIRS' },
  { id: 'legos', label: 'LEGO_PAIRS' },
  { id: 'baskets', label: 'LEGO_BASKETS' },
  { id: 'introductions', label: 'INTRODUCTIONS' }
]

// Count actual LEGOs (only new: true) from lego_pairs.json structure
const actualLegoCount = computed(() => {
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

    // Don't use API data for legos/legoBreakdowns - we'll load directly from VFS below
    // This ensures we always get the latest data from the files, not from cache
    legos.value = []
    legoBreakdowns.value = []

    // Load lego_baskets.json from VFS (v7.7+ format)
    // ALWAYS use static files (GitHub SSoT)
    try {
      // Add cache-busting timestamp to force fresh data from Vercel CDN
      const timestamp = Date.now()
      const url = `${GITHUB_CONFIG.getCourseFileUrl(courseCode, 'lego_baskets.json')}?_t=${timestamp}`
      console.log('🔍 Fetching lego_baskets.json from GitHub:', url)

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

    // Load introductions.json from VFS (Phase 6)
    // ALWAYS use static files (GitHub SSoT)
    try {
      // Add cache-busting timestamp to force fresh data from Vercel CDN
      const timestamp = Date.now()
      const url = `${GITHUB_CONFIG.getCourseFileUrl(courseCode, 'introductions.json')}?_t=${timestamp}`
      console.log('🔍 Fetching introductions.json from GitHub:', url)

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

    // Load lego_pairs.json from VFS (v2 format with nested structure)
    // ALWAYS use static files (GitHub SSoT)
    console.log('🔍 Starting to load lego_pairs.json for course:', courseCode)
    try {
      // Add cache-busting timestamp to force fresh data from Vercel CDN
      const timestamp = Date.now()
      const url = `${GITHUB_CONFIG.getCourseFileUrl(courseCode, 'lego_pairs.json')}?_t=${timestamp}`
      console.log('🔍 Fetching from GitHub:', url)

      const legoPairsResponse = await fetch(url)

      console.log('🔍 Response status:', legoPairsResponse.status, legoPairsResponse.ok)

      if (legoPairsResponse.ok) {
        const loadedLegoPairsData = await legoPairsResponse.json()
        legoPairsData.value = loadedLegoPairsData
        console.log('📦 Loaded lego_pairs.json - seeds count:', loadedLegoPairsData.seeds?.length)

        // Parse v2 format: { seeds: [{ seed_id, seed_pair, legos: [...] }] }
        if (loadedLegoPairsData.seeds && Array.isArray(loadedLegoPairsData.seeds)) {
          console.log('🔍 Transforming seeds data...')

          // Transform to legoBreakdowns format for display
          legoBreakdowns.value = loadedLegoPairsData.seeds.map(seed => ({
            seed_id: seed.seed_id,
            original_target: seed.seed_pair.target || seed.seed_pair[0],
            original_known: seed.seed_pair.known || seed.seed_pair[1],
            lego_pairs: seed.legos.map(lego => ({
              lego_id: lego.id,
              target_chunk: lego.lego?.target || lego.target,
              known_chunk: lego.lego?.known || lego.known,
              lego_type: lego.type === 'M' ? 'COMPOSITE' : 'ATOMIC',
              componentization: lego.components ?
                lego.components.map(c => `${c[0]} = ${c[1]}`).join(', ') :
                null
            }))
          }))

          // Also extract flat list of all LEGOs for the count
          legos.value = loadedLegoPairsData.seeds.flatMap(seed =>
            seed.legos.map(lego => ({
              id: lego.id,
              target: lego.lego?.target || lego.target,
              known: lego.lego?.known || lego.known,
              type: lego.type,
              new: lego.new
            }))
          )

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
  } catch (err) {
    error.value = err.message || 'Failed to load course'
    console.error('Failed to load course:', err)
  } finally {
    loading.value = false
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
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'}/api/courses/${courseCode}/baskets/generate`, {
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

function formatCourseCode(code) {
  // Just return the course code as-is (e.g., "spa_for_eng")
  // This is a builder's tool, so showing the actual code is clearest
  return code
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
    return 'bg-slate-600 text-slate-300'
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

function startEditingBreakdown(breakdown) {
  editingBreakdown.value = breakdown.seed_id

  console.log(`[CourseEditor] Starting edit for ${breakdown.seed_id}`)
  console.log('[CourseEditor] Original lego_pairs:', breakdown.lego_pairs)

  // Initialize editable copies of LEGOs and FEEDERs
  editDividers.value[breakdown.seed_id] = {
    lego_pairs: JSON.parse(JSON.stringify(breakdown.lego_pairs || [])),
    feeder_pairs: JSON.parse(JSON.stringify(breakdown.feeder_pairs || []))
  }

  console.log('[CourseEditor] Copied lego_pairs:', editDividers.value[breakdown.seed_id].lego_pairs)

  // Verify componentization is preserved
  const composites = editDividers.value[breakdown.seed_id].lego_pairs.filter(l => l.lego_type === 'COMPOSITE')
  if (composites.length > 0) {
    console.log(`[CourseEditor] Found ${composites.length} COMPOSITE LEGOs:`)
    composites.forEach(c => {
      console.log(`  ${c.lego_id}: componentization =`, c.componentization ? 'PRESENT' : 'MISSING')
      if (c.componentization) {
        console.log(`    Value:`, c.componentization)
      }
    })
  }
}

function getEditableLegos(breakdown) {
  if (!editDividers.value[breakdown.seed_id]) return breakdown.lego_pairs || []
  return editDividers.value[breakdown.seed_id].lego_pairs || []
}

function getEditableFeeders(breakdown) {
  if (!editDividers.value[breakdown.seed_id]) return breakdown.feeder_pairs || []
  return editDividers.value[breakdown.seed_id].feeder_pairs || []
}

// Get feeders for a specific LEGO (view mode)
function getFeedersForLego(breakdown, legoId) {
  if (!breakdown.feeder_pairs) return []
  return breakdown.feeder_pairs.filter(f => f.parent_lego_id === legoId)
}

// Get feeders for a specific LEGO (edit mode)
function getFeedersForLegoInEdit(breakdown, legoId) {
  const feeders = getEditableFeeders(breakdown)
  return feeders.filter(f => f.parent_lego_id === legoId)
}

function mergeLego(breakdown, index) {
  const legos = getEditableLegos(breakdown)
  if (index === 0 || index >= legos.length) return

  const current = legos[index]
  const previous = legos[index - 1]

  // Helper: Smart concatenate with overlap detection
  function smartConcat(prev, curr) {
    const prevTrimmed = prev.trim()
    const currTrimmed = curr.trim()

    // Check for elision (no space needed)
    if (prevTrimmed.endsWith("'")) {
      return prevTrimmed + currTrimmed
    }

    // Check for overlapping words at boundary (e.g., "try to" + "to explain" → "try to explain")
    const prevWords = prevTrimmed.split(/\s+/)
    const currWords = currTrimmed.split(/\s+/)

    // Look for overlap (check if last word(s) of prev match first word(s) of curr)
    for (let overlapLen = Math.min(prevWords.length, currWords.length); overlapLen > 0; overlapLen--) {
      const prevEnd = prevWords.slice(-overlapLen).join(' ').toLowerCase()
      const currStart = currWords.slice(0, overlapLen).join(' ').toLowerCase()

      if (prevEnd === currStart) {
        // Found overlap - remove duplicate
        const resultWords = [...prevWords, ...currWords.slice(overlapLen)]
        return resultWords.join(' ')
      }
    }

    // No overlap, simple concatenation with space
    return prevTrimmed + ' ' + currTrimmed
  }

  previous.target_chunk = smartConcat(previous.target_chunk, current.target_chunk)
  previous.known_chunk = smartConcat(previous.known_chunk, current.known_chunk)

  // If merging creates COMPOSITE, update type and initialize componentization
  if (previous.lego_type === 'BASE' && current.lego_type === 'BASE') {
    previous.lego_type = 'COMPOSITE'
    // Initialize empty componentization for user to fill in
    if (!previous.componentization) {
      previous.componentization = ''
    }
  }

  // Remove current LEGO
  legos.splice(index, 1)
}

function splitLego(breakdown, index) {
  const legos = getEditableLegos(breakdown)
  if (index >= legos.length) return

  const lego = legos[index]
  const targetWords = lego.target_chunk.split(/\s+/)
  const knownWords = lego.known_chunk.split(/\s+/)

  if (targetWords.length < 2 || knownWords.length < 2) {
    alert('Cannot split LEGO with only one word')
    return
  }

  // Split roughly in half
  const targetMid = Math.ceil(targetWords.length / 2)
  const knownMid = Math.ceil(knownWords.length / 2)

  // Create new LEGO for second half
  const newLego = {
    lego_id: lego.lego_id.replace(/L(\d+)/, (match, num) => 'L' + (parseInt(num) + 1).toString().padStart(2, '0')),
    lego_type: 'BASE',
    target_chunk: targetWords.slice(targetMid).join(' '),
    known_chunk: knownWords.slice(knownMid).join(' '),
    fd_validated: false
  }

  // Update current LEGO with first half
  lego.target_chunk = targetWords.slice(0, targetMid).join(' ')
  lego.known_chunk = knownWords.slice(0, knownMid).join(' ')
  lego.fd_validated = false

  // Insert new LEGO
  legos.splice(index + 1, 0, newLego)
}

function deleteLego(breakdown, index) {
  const legos = getEditableLegos(breakdown)
  if (legos.length === 1) {
    alert('Cannot delete the last LEGO')
    return
  }
  legos.splice(index, 1)
}

function addNewLego(breakdown) {
  const legos = getEditableLegos(breakdown)
  const lastIndex = legos.length
  const newLego = {
    lego_id: `${breakdown.seed_id}L${String(lastIndex + 1).padStart(2, '0')}`,
    lego_type: 'BASE',
    target_chunk: '',
    known_chunk: '',
    fd_validated: false
  }
  legos.push(newLego)
}

function addFeederToLego(breakdown, legoId) {
  const feeders = getEditableFeeders(breakdown)
  const existingFeedersForLego = feeders.filter(f => f.parent_lego_id === legoId)
  const nextIndex = existingFeedersForLego.length + 1

  const newFeeder = {
    feeder_id: `${breakdown.seed_id}F${String(feeders.length + 1).padStart(2, '0')}`,
    parent_lego_id: legoId,
    target_chunk: '',
    known_chunk: ''
  }
  feeders.push(newFeeder)
}

function deleteFeederFromLego(breakdown, legoId, feederIndex) {
  const feeders = getEditableFeeders(breakdown)
  const feedersForLego = feeders.filter(f => f.parent_lego_id === legoId)
  const feederToDelete = feedersForLego[feederIndex]

  const globalIndex = feeders.findIndex(f => f.feeder_id === feederToDelete.feeder_id)
  if (globalIndex !== -1) {
    feeders.splice(globalIndex, 1)
  }
}

function validateTiling(breakdown) {
  const legos = getEditableLegos(breakdown)
  if (!legos || legos.length === 0) return false

  // Concatenate all target chunks
  const reconstructedTarget = legos.map(l => l.target_chunk).join(' ').trim()
  const reconstructedKnown = legos.map(l => l.known_chunk).join(' ').trim()

  // Normalize whitespace for comparison
  const normalizeWS = (str) => str.replace(/\s+/g, ' ').trim()

  return (
    normalizeWS(reconstructedTarget) === normalizeWS(breakdown.original_target) &&
    normalizeWS(reconstructedKnown) === normalizeWS(breakdown.original_known)
  )
}

function cancelEditingBreakdown() {
  if (editingBreakdown.value) {
    delete editDividers.value[editingBreakdown.value]
    delete updatedLegos.value[editingBreakdown.value]
  }
  editingBreakdown.value = null
}

function toggleDivider(breakdown, wordIndex) {
  const dividers = editDividers.value[breakdown.seed_id]
  if (!dividers) return

  dividers[wordIndex] = !dividers[wordIndex]
}

function isDividerActive(breakdown, wordIndex) {
  const dividers = editDividers.value[breakdown.seed_id]
  if (!dividers) return false
  return dividers[wordIndex] || false
}

function getPreviewLegoCount(breakdown) {
  const dividers = editDividers.value[breakdown.seed_id]
  if (!dividers) return 0

  const splits = dividers.filter(d => d).length
  return splits + 1
}

function getPreviewLegoPairs(breakdown) {
  const dividers = editDividers.value[breakdown.seed_id]
  if (!dividers) return []

  const knownWords = getWords(breakdown.original_known)
  const targetWords = getWords(breakdown.original_target)

  const pairs = []
  let knownStart = 0
  let targetStart = 0

  for (let i = 0; i < dividers.length; i++) {
    if (dividers[i] || i === dividers.length - 1) {
      const knownEnd = i + 1
      const targetEnd = i + 1

      const knownChunk = knownWords.slice(knownStart, knownEnd).join(' ')
      const targetChunk = targetWords.slice(targetStart, targetEnd).join(' ')

      if (knownChunk) {
        pairs.push({
          known: knownChunk,
          target: targetChunk
        })
      }

      knownStart = knownEnd
      targetStart = targetEnd
    }
  }

  // Add final LEGO if there are remaining words
  if (knownStart < knownWords.length) {
    pairs.push({
      known: knownWords.slice(knownStart).join(' '),
      target: targetWords.slice(targetStart).join(' ')
    })
  }

  return pairs
}

function handleLegoUpdate(update) {
  // Store the updated LEGOs from WordDividerEditor
  updatedLegos.value[update.seed_id] = {
    lego_pairs: update.lego_pairs,
    is_valid_tiling: update.is_valid_tiling
  }

  // Update the breakdown in editDividers for consistency
  if (editDividers.value[update.seed_id]) {
    editDividers.value[update.seed_id].lego_pairs = update.lego_pairs
  }
}

async function saveBreakdown(breakdown) {
  try {
    // Use LEGOs from WordDividerEditor if available, otherwise fall back to classic editor
    let editedLegos
    let editedFeeders

    if (useNewEditor.value && updatedLegos.value[breakdown.seed_id]) {
      editedLegos = updatedLegos.value[breakdown.seed_id].lego_pairs
      editedFeeders = getEditableFeeders(breakdown) // Feeders still from classic editor
    } else {
      editedLegos = getEditableLegos(breakdown)
      editedFeeders = getEditableFeeders(breakdown)
    }

    console.log(`[CourseEditor] Saving breakdown for ${breakdown.seed_id}`)
    console.log('LEGOs:', editedLegos)
    console.log('FEEDERs:', editedFeeders)

    // Send to API
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'}/api/courses/${courseCode}/breakdowns/${breakdown.seed_id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        lego_pairs: editedLegos,
        feeder_pairs: editedFeeders
      })
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    // Reload course data
    await loadCourse()

    // Clear edit state
    cancelEditingBreakdown()

    alert('✓ Breakdown saved successfully!')

  } catch (err) {
    console.error('Failed to save breakdown:', err)
    alert('Failed to save breakdown: ' + err.message)
  }
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
    await api.course.updateIntroduction(courseCode, legoId, {
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

    console.log(`✅ Updated introduction for ${legoId}`)
  } catch (error) {
    console.error('Failed to save introduction:', error)
    alert('Failed to save introduction. Please try again.')
  } finally {
    savingIntro.value = false
  }
}

async function saveTranslation() {
  if (!editModal.value.translation) return

  editModal.value.saving = true
  try {
    // Save the edited translation - backend will automatically trigger regeneration
    const response = await api.course.updateTranslation(
      courseCode,
      editModal.value.translation.uuid,
      {
        source: editModal.value.editedSource,
        target: editModal.value.editedTarget
      }
    )

    // Check if backend returned regeneration job info
    if (response.regeneration && response.regeneration.jobId) {
      // Initialize regeneration tracking
      regenerationState.value = {
        active: true,
        jobId: response.regeneration.jobId,
        status: response.regeneration.status || 'running',
        currentPhase: 3,
        progress: 0,
        startTime: Date.now(),
        completionTime: null,
        error: null
      }

      // Start polling for status updates
      startRegenerationPolling()
    }

    closeEditModal()

    // Show success message
    if (response.regeneration && response.regeneration.jobId) {
      console.log('Translation saved. Regeneration started with job ID:', response.regeneration.jobId)
    }
  } catch (err) {
    console.error('Failed to save translation:', err)
    alert('Failed to save: ' + err.message)
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
      if (status.status === 'completed' || status.status === 'failed') {
        stopRegenerationPolling()
        regenerationState.value.completionTime = Date.now()

        if (status.status === 'failed') {
          regenerationState.value.error = status.error || 'Regeneration failed'
        }

        // Reload course data to show updated results
        if (status.status === 'completed') {
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
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'
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
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'
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
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'
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
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'

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

// Phase 8: Audio Generation
async function startAudioGeneration() {
  if (!course.value?.phases_completed?.includes('7')) {
    alert('Phase 7 (Course Manifest) must be completed before audio generation')
    return
  }

  // Calculate estimates
  const seeds = course.value?.total_seeds || 668
  const phaseASamples = seeds * 3  // target1, target2, source per seed
  const phaseBSamples = actualLegoCount * 3  // 3 presentations per LEGO
  const totalSamples = phaseASamples + phaseBSamples + 74 + 3  // + encouragements + welcomes

  const confirmMessage = `Start Phase 8 Audio Generation?

━━━ PIPELINE ━━━

1️⃣  Pre-flight Checks
    → Voice config, API keys, S3 access

2️⃣  Phase A: Core Vocabulary (~${phaseASamples.toLocaleString()} samples)
    → target1 (native voice 1)
    → target2 (native voice 2)
    → source (${course.value.source_language})
    ⏸️  QC Checkpoint (manual review)

3️⃣  Phase B: Presentations (~${phaseBSamples.toLocaleString()} samples)
    → 3 presentation variants per LEGO
    ⏸️  QC Checkpoint (manual review)

4️⃣  Encouragements + Welcomes (77 samples)

5️⃣  S3 Upload + MAR Update

━━━ TOTAL: ~${totalSamples.toLocaleString()} audio files ━━━

⚠️  This uses Azure TTS + ElevenLabs
⚠️  Process pauses at QC checkpoints
⚠️  Requires voice configurations

Continue?`

  if (!confirm(confirmMessage)) {
    return
  }

  audioGenerationLoading.value = true
  audioGenerationResult.value = null

  const apiBase = localStorage.getItem('api_base_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'

  try {
    const response = await fetch(`${apiBase}/api/phase8/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        courseCode: courseCode,
        options: {
          phase: 'auto',  // Run both Phase A and Phase B
          skipUpload: false,
          skipQC: false
        }
      })
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`HTTP ${response.status}: ${text}`)
    }

    const result = await response.json()
    audioGenerationResult.value = {
      success: true,
      jobId: result.jobId,
      phase: result.phase
    }

    // Show toast notification
    alert(`✅ Audio generation started!\n\nJob ID: ${result.jobId}\n\nYou can monitor progress in the server logs.`)
  } catch (err) {
    console.error('Audio generation error:', err)
    audioGenerationResult.value = {
      success: false,
      error: err.message
    }
    alert(`❌ Failed to start audio generation: ${err.message}`)
  } finally {
    audioGenerationLoading.value = false
  }
}

// Cleanup on component unmount
onUnmounted(() => {
  stopRegenerationPolling()
})
</script>
