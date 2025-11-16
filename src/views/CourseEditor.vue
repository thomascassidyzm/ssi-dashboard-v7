<template>
  <div class="min-h-screen bg-slate-900 text-slate-100 p-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <router-link to="/courses" class="text-emerald-400 hover:text-emerald-300 mb-4 inline-block">
          ← Back to Course Library
        </router-link>
        <div v-if="course" class="flex items-start justify-between">
          <div>
            <h1 class="text-4xl font-bold text-emerald-400 mb-2">
              {{ formatCourseCode(course.course_code) }}
            </h1>
            <p class="text-slate-400">{{ course.total_seeds }} seeds • Version {{ course.version }}</p>
          </div>
          <div class="flex items-center gap-3">
            <span
              class="px-4 py-2 rounded-lg text-sm font-medium"
              :class="getStatusClass(course.status)"
            >
              {{ formatStatus(course.status) }}
            </span>
            <router-link
              :to="`/courses/${course.course_code}/compile`"
              class="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg transition-colors font-semibold flex items-center gap-2"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path>
              </svg>
              Compile & Generate Audio
            </router-link>
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
            <div class="text-3xl font-bold text-emerald-400">{{ introductionsData?.presentations ? Object.keys(introductionsData.presentations).length : 0 }}</div>
            <div class="text-xs text-slate-500 mt-1">Known-only priming</div>
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
                    'border-yellow-500': !breakdown.lego_pairs || breakdown.lego_pairs.length === 0
                  }"
                >
                  <!-- Breakdown Header -->
                  <div class="px-6 py-4 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between">
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

                    <!-- LEGO editing removed - LEGOs are generated, not manually edited -->
                    <span class="text-xs text-slate-500 italic">
                      View only - LEGOs generated by Phase 3
                    </span>
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

                    <!-- View Mode: 3-Level Hierarchy Display (read-only) -->
                    <div>
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import api from '../services/api'
import { GITHUB_CONFIG } from '../config/github'
import WordDividerEditor from '../components/lego-editor/WordDividerEditor.vue'
import LegoBasketViewer from '../components/LegoBasketViewer.vue'

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
// LEGO editing removed - LEGOs are view-only, generated by Phase 3

const activeTab = ref('translations')
const searchQuery = ref('')
const legoSearchQuery = ref('') // Search for LEGO breakdowns
const selectedSeed = ref('')
const introductionsData = ref(null) // Introductions data from introductions.json

// Introduction edit state
const editingIntro = ref(null) // LEGO ID being edited
const editedIntroText = ref('') // Edited text
const savingIntro = ref(false) // Saving state

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

// Count actual LEGOs from lego_pairs.json structure
const actualLegoCount = computed(() => {
  if (!legoPairsData.value?.seeds) return 0

  // Count all LEGOs across all seeds
  let count = 0
  for (const seed of legoPairsData.value.seeds) {
    if (seed.legos) {
      count += seed.legos.length
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
            original_target: seed.seed_pair[0],
            original_known: seed.seed_pair[1],
            lego_pairs: seed.legos.map(lego => ({
              lego_id: lego.id,
              target_chunk: lego.target,
              known_chunk: lego.known,
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
              target: lego.target,
              known: lego.known,
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
    }

    alert(`✅ Basket generation started!\n\nJob ID: ${data.jobId}\n\nA Claude Code agent has been spawned in iTerm2. Check the terminal window for progress.\n\nRefresh this page when complete to see the generated baskets.`)

  } catch (err) {
    console.error('Failed to generate baskets:', err)
    alert(`❌ Failed to generate baskets:\n\n${err.message}`)
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

// Cleanup on component unmount
onUnmounted(() => {
  stopRegenerationPolling()
})
</script>
