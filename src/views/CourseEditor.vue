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
          <span
            class="px-4 py-2 rounded-lg text-sm font-medium"
            :class="getStatusClass(course.status)"
          >
            {{ formatStatus(course.status) }}
          </span>
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
            <div class="text-3xl font-bold text-emerald-400">{{ course.lego_pairs || 0 }}</div>
            <div class="text-xs text-slate-500 mt-1">Phase 3 teaching units</div>
          </div>
          <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div class="text-sm text-slate-400 mb-1">LEGO_BASKETS</div>
            <div class="text-3xl font-bold text-emerald-400">{{ course.lego_baskets || 0 }}</div>
            <div class="text-xs text-slate-500 mt-1">Phase 5 lesson groupings</div>
          </div>
          <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
            <div class="text-sm text-slate-400 mb-1">Introductions</div>
            <div class="text-3xl font-bold text-emerald-400">{{ course.amino_acids?.introductions || 0 }}</div>
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
                  v-for="breakdown in filteredLegoBreakdowns.slice(0, 20)"
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

                          <!-- Associated Feeders (if available in data) -->
                          <div v-if="breakdown.feeder_pairs && breakdown.feeder_pairs.length > 0" class="mt-3">
                            <div class="text-xs text-slate-400 mb-2 uppercase">Associated Feeders:</div>
                            <div class="flex flex-wrap gap-2">
                              <div
                                v-for="feeder in breakdown.feeder_pairs"
                                :key="feeder.feeder_id"
                                class="bg-emerald-900/30 border border-emerald-700/50 rounded px-3 py-1.5 text-sm"
                              >
                                <div class="text-emerald-300 font-mono text-xs">{{ feeder.feeder_id }}</div>
                                <div class="text-emerald-200">{{ feeder.target_chunk }} ⟷ {{ feeder.known_chunk }}</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <!-- ALL SEED FEEDERS -->
                        <div v-if="breakdown.feeder_pairs && breakdown.feeder_pairs.length > 0" class="border-t border-slate-700 pt-4 mt-6">
                          <div class="text-sm font-semibold text-slate-300 mb-3 uppercase">All Seed Feeders:</div>
                          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div
                              v-for="feeder in breakdown.feeder_pairs"
                              :key="'all-' + feeder.feeder_id"
                              class="bg-emerald-900/20 border border-emerald-700/40 rounded-lg p-3"
                            >
                              <div class="text-emerald-400 font-mono text-xs mb-1">{{ feeder.feeder_id }}</div>
                              <div class="text-sm">
                                <span class="text-slate-300">{{ feeder.known_chunk }}</span>
                                <span class="text-emerald-500 mx-2">⟷</span>
                                <span class="text-blue-300">{{ feeder.target_chunk }}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>

                      <div v-else class="text-center py-8 text-slate-400">
                        No LEGO_PAIRS extracted yet
                      </div>
                    </div>

                    <!-- Edit Mode: Draggable Dividers -->
                    <div v-else class="space-y-6">
                      <!-- Instructions -->
                      <div class="p-4 bg-blue-900/20 border border-blue-700/50 rounded">
                        <div class="text-sm text-blue-200">
                          <div class="font-semibold mb-2">✏️ Editing Mode</div>
                          <p class="text-xs text-blue-300">
                            Click the vertical dividers between words to add/remove LEGO boundaries. LEGOs must tile perfectly to cover all words.
                          </p>
                        </div>
                      </div>

                      <!-- Known Language Editor -->
                      <div class="space-y-2">
                        <div class="text-sm font-semibold text-slate-300">Known Language</div>
                        <div class="bg-slate-700/50 border border-slate-600 rounded p-4">
                          <div class="flex flex-wrap items-center gap-1">
                            <template v-for="(word, wordIndex) in getWords(breakdown.original_known)" :key="'known-' + wordIndex">
                              <span class="px-2 py-1 bg-slate-600/50 rounded text-slate-100">{{ word }}</span>
                              <div
                                v-if="wordIndex < getWords(breakdown.original_known).length - 1"
                                @click="toggleDivider(breakdown, wordIndex)"
                                class="cursor-pointer group relative"
                              >
                                <div
                                  class="w-1 h-8 rounded transition-all"
                                  :class="isDividerActive(breakdown, wordIndex) ? 'bg-emerald-500' : 'bg-slate-500 group-hover:bg-slate-400'"
                                ></div>
                                <div class="absolute -top-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div class="text-xs bg-slate-700 px-2 py-1 rounded whitespace-nowrap">
                                    {{ isDividerActive(breakdown, wordIndex) ? 'Remove split' : 'Split here' }}
                                  </div>
                                </div>
                              </div>
                            </template>
                          </div>
                        </div>
                      </div>

                      <!-- Target Language Editor -->
                      <div class="space-y-2">
                        <div class="text-sm font-semibold text-blue-300">Target Language</div>
                        <div class="bg-blue-900/30 border border-blue-700 rounded p-4">
                          <div class="flex flex-wrap items-center gap-1">
                            <template v-for="(word, wordIndex) in getWords(breakdown.original_target)" :key="'target-' + wordIndex">
                              <span class="px-2 py-1 bg-blue-800/50 rounded text-blue-100">{{ word }}</span>
                              <div
                                v-if="wordIndex < getWords(breakdown.original_target).length - 1"
                                @click="toggleDivider(breakdown, wordIndex)"
                                class="cursor-pointer group relative"
                              >
                                <div
                                  class="w-1 h-8 rounded transition-all"
                                  :class="isDividerActive(breakdown, wordIndex) ? 'bg-emerald-500' : 'bg-slate-600 group-hover:bg-slate-400'"
                                ></div>
                                <div class="absolute -top-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div class="text-xs bg-slate-700 px-2 py-1 rounded whitespace-nowrap">
                                    {{ isDividerActive(breakdown, wordIndex) ? 'Remove split' : 'Split here' }}
                                  </div>
                                </div>
                              </div>
                            </template>
                          </div>
                        </div>
                      </div>

                      <!-- Preview of Current LEGO_PAIRS -->
                      <div class="space-y-2">
                        <div class="text-sm font-semibold text-emerald-300">Preview ({{ getPreviewLegoCount(breakdown) }} LEGOs)</div>
                        <div class="space-y-2">
                          <div
                            v-for="(lego, index) in getPreviewLegoPairs(breakdown)"
                            :key="index"
                            class="grid grid-cols-12 gap-2 items-center text-sm"
                          >
                            <div class="col-span-1 text-center text-slate-500 font-mono text-xs">
                              {{ index + 1 }}
                            </div>
                            <div class="col-span-5 bg-slate-700/30 border border-slate-600/30 rounded px-3 py-2">
                              <span class="text-slate-200">{{ lego.known }}</span>
                            </div>
                            <div class="col-span-1 flex justify-center">
                              <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                              </svg>
                            </div>
                            <div class="col-span-5 bg-blue-900/20 border border-blue-700/30 rounded px-3 py-2">
                              <span class="text-blue-200">{{ lego.target }}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Baskets Tab -->
            <div v-if="activeTab === 'baskets'">
              <h3 class="text-lg font-semibold text-emerald-400 mb-4">LEGO_BASKETS (Phase 5)</h3>

              <div v-if="baskets.length === 0" class="text-center py-8 text-slate-400">
                No LEGO_BASKETS found. Run Phase 5 to generate them.
              </div>

              <div v-else class="space-y-4">
                <div
                  v-for="basket in baskets"
                  :key="basket.uuid"
                  class="bg-slate-900/50 border border-slate-700 rounded-lg p-4"
                >
                  <div class="flex items-center justify-between mb-3">
                    <h4 class="text-lg font-semibold text-emerald-400">Basket {{ basket.basket_id }}</h4>
                    <span class="text-sm text-slate-400">{{ basket.lego_count }} LEGOs</span>
                  </div>
                  <div class="space-y-2">
                    <div
                      v-for="(lego, idx) in basket.legos.slice(0, 5)"
                      :key="idx"
                      class="text-sm text-slate-300 pl-4 border-l-2 border-emerald-600/30"
                    >
                      "{{ lego.text }}"
                    </div>
                    <div v-if="basket.lego_count > 5" class="text-xs text-slate-500 pl-4">
                      + {{ basket.lego_count - 5 }} more LEGOs
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Provenance Tab -->
            <div v-if="activeTab === 'provenance'">
              <h3 class="text-lg font-semibold text-emerald-400 mb-4">Provenance Tracking</h3>
              <div class="bg-slate-900/50 border border-slate-700 rounded-lg p-6">
                <p class="text-slate-300 mb-4">
                  Test the provenance system by selecting a seed to see its complete impact chain.
                </p>
                <div class="flex gap-3">
                  <select
                    v-model="selectedSeed"
                    class="bg-slate-800 border border-slate-700 rounded px-4 py-2 text-slate-300 flex-1"
                  >
                    <option value="">Select a seed...</option>
                    <option v-for="t in translations" :key="t.seed_id" :value="t.seed_id">
                      {{ t.seed_id }}: {{ t.source.substring(0, 50) }}...
                    </option>
                  </select>
                  <button
                    @click="traceProvenance"
                    :disabled="!selectedSeed"
                    class="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-6 py-2 rounded transition-colors"
                  >
                    Trace Impact
                  </button>
                </div>

                <div v-if="provenanceResult" class="mt-6 space-y-4">
                  <div class="bg-emerald-900/20 border border-emerald-500/50 rounded-lg p-4">
                    <div class="text-emerald-400 font-semibold mb-2">Impact Summary</div>
                    <div class="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div class="text-slate-400">LEGOs Generated</div>
                        <div class="text-2xl font-bold text-emerald-400">{{ provenanceResult.legos }}</div>
                      </div>
                      <div>
                        <div class="text-slate-400">Deduplicated LEGOs</div>
                        <div class="text-2xl font-bold text-emerald-400">{{ provenanceResult.deduplicated }}</div>
                      </div>
                      <div>
                        <div class="text-slate-400">Baskets Affected</div>
                        <div class="text-2xl font-bold text-emerald-400">{{ provenanceResult.baskets }}</div>
                      </div>
                    </div>
                  </div>
                  <div class="text-sm text-slate-400">
                    <strong class="text-emerald-400">Edit Impact:</strong> If you edit this seed,
                    {{ provenanceResult.legos }} LEGOs would need regeneration, affecting
                    {{ provenanceResult.baskets }} basket(s).
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

const route = useRoute()
const courseCode = route.params.courseCode

const course = ref(null)
const translations = ref([])
const legos = ref([])
const legoBreakdowns = ref([]) // Raw breakdown data for visualizer
const baskets = ref([])
const loading = ref(true)
const error = ref(null)
const editingBreakdown = ref(null) // Track which seed breakdown is being edited
const editDividers = ref({}) // Track divider positions for editing

const activeTab = ref('translations')
const searchQuery = ref('')
const legoSearchQuery = ref('') // Search for LEGO breakdowns
const selectedSeed = ref('')
const provenanceResult = ref(null)

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

const tabs = [
  { id: 'translations', label: 'SEED_PAIRS' },
  { id: 'legos', label: 'LEGO_PAIRS' },
  { id: 'baskets', label: 'LEGO_BASKETS' },
  { id: 'provenance', label: 'Provenance Tracking' }
]

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
    legos.value = response.legos || []
    legoBreakdowns.value = response.lego_breakdowns || []
    baskets.value = response.baskets || []
  } catch (err) {
    error.value = err.message || 'Failed to load course'
    console.error('Failed to load course:', err)
  } finally {
    loading.value = false
  }
}

function formatCourseCode(code) {
  const parts = code.split('_')
  const target = parts[0]?.toUpperCase() || ''
  const seeds = code.match(/(\d+)seeds/)?.[1] || ''
  return `${target} Course${seeds ? ` (${seeds} seeds)` : ''}`
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

  // Initialize divider positions from existing LEGO boundaries
  const knownWords = getWords(breakdown.original_known)
  const targetWords = getWords(breakdown.original_target)
  const dividers = new Array(Math.max(knownWords.length, targetWords.length) - 1).fill(false)

  // Mark existing LEGO boundaries
  let wordCount = 0
  for (const pair of breakdown.lego_pairs || []) {
    const pairWords = getWords(pair.known_chunk)
    wordCount += pairWords.length
    if (wordCount < knownWords.length) {
      dividers[wordCount - 1] = true
    }
  }

  editDividers.value[breakdown.seed_id] = dividers
}

function cancelEditingBreakdown() {
  if (editingBreakdown.value) {
    delete editDividers.value[editingBreakdown.value]
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

async function saveBreakdown(breakdown) {
  try {
    const editedPairs = getPreviewLegoPairs(breakdown)

    console.log(`[CourseEditor] Saving breakdown for ${breakdown.seed_id}`, editedPairs)

    // Send to API - we need to create this endpoint
    await api.put(`/api/courses/${courseCode}/breakdowns/${breakdown.seed_id}`, {
      lego_pairs: editedPairs
    })

    // Reload course data
    await loadCourse()

    // Clear edit state
    cancelEditingBreakdown()

  } catch (err) {
    console.error('Failed to save breakdown:', err)
    alert('Failed to save breakdown: ' + err.message)
  }
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
