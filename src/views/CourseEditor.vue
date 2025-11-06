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

                    <!-- Edit Mode: Container-Based Editing -->
                    <div v-else class="space-y-6">
                      <!-- Instructions -->
                      <div class="p-4 bg-blue-900/20 border border-blue-700/50 rounded">
                        <div class="text-sm text-blue-200">
                          <div class="font-semibold mb-2">✏️ Editing Mode</div>
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

                          <!-- COMPONENTIZATION Editor (for COMPOSITE LEGOs) -->
                          <div v-if="lego.lego_type === 'COMPOSITE'" class="mt-3 pt-3 border-t border-purple-700/50 space-y-3">
                            <div>
                              <label class="text-xs text-purple-400 mb-1 block">Componentization</label>
                              <textarea
                                v-model="lego.componentization"
                                class="w-full bg-purple-900/20 border border-purple-700 rounded px-3 py-2 text-purple-100 focus:outline-none focus:border-purple-500 font-mono text-sm"
                                rows="2"
                                placeholder="e.g., I'm trying to = J'essaie d', where J'essaie = I'm trying and d' = to"
                              ></textarea>
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

                      <!-- Tiling Validation -->
                      <div class="mt-6 p-4 rounded-lg" :class="validateTiling(breakdown) ? 'bg-emerald-900/20 border border-emerald-700/50' : 'bg-red-900/20 border border-red-700/50'">
                        <div class="flex items-center gap-2">
                          <span v-if="validateTiling(breakdown)" class="text-emerald-400">✓ Tiling Valid</span>
                          <span v-else class="text-red-400">✗ Tiling Invalid</span>
                          <span class="text-xs text-slate-400">LEGOs must tile to cover entire sentence</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Baskets Tab -->
            <div v-if="activeTab === 'baskets'">
              <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold text-emerald-400">LEGO_BASKETS (Phase 5)</h3>
                <div class="text-sm text-slate-400">
                  {{ Object.keys(basketsData || {}).length }} baskets
                </div>
              </div>

              <div v-if="!basketsData || Object.keys(basketsData).length === 0" class="text-center py-8 text-slate-400">
                No LEGO_BASKETS found. Run Phase 5 to generate them.
              </div>

              <div v-else class="space-y-2">
                <div
                  v-for="(basket, legoId) in basketsData"
                  :key="legoId"
                  class="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden hover:border-slate-600 transition-colors"
                >
                  <!-- Basket Header (Always Visible) -->
                  <button
                    @click="toggleBasket(legoId)"
                    class="w-full p-4 hover:bg-slate-800/50 transition-colors flex items-center justify-between"
                  >
                    <div class="flex items-center gap-4 flex-1">
                      <!-- LEGO ID Badge -->
                      <div class="font-mono text-xs text-cyan-400 bg-cyan-900/30 px-2 py-1 rounded">
                        {{ legoId }}
                      </div>

                      <!-- LEGO Core Pair -->
                      <div class="flex items-center gap-2">
                        <span class="text-blue-300 font-medium">{{ basket.lego[0] }}</span>
                        <span class="text-slate-500">⟷</span>
                        <span class="text-slate-300">{{ basket.lego[1] }}</span>
                      </div>
                    </div>

                    <!-- Counts -->
                    <div class="flex items-center gap-4">
                      <div class="text-xs text-slate-400">
                        <span class="text-emerald-400 font-semibold">{{ basket.e.length }}</span> eternal
                      </div>
                      <div class="text-xs text-slate-400">
                        <span class="text-purple-400 font-semibold">{{ getTotalDebutCount(basket.d) }}</span> debut
                      </div>
                      <svg class="w-5 h-5 text-slate-500 transition-transform" :class="{ 'rotate-180': expandedBaskets[legoId] }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                      </svg>
                    </div>
                  </button>

                  <!-- Expanded Content -->
                  <div v-if="expandedBaskets[legoId]" class="border-t border-slate-700 p-4 bg-slate-900/50">
                    <!-- Eternal Phrases Section -->
                    <div class="mb-4">
                      <div class="text-sm font-semibold text-emerald-400 mb-2 flex items-center gap-2">
                        <span>Eternal Phrases</span>
                        <span class="text-xs text-emerald-400/60">({{ basket.e.length }})</span>
                      </div>
                      <div class="space-y-2">
                        <div
                          v-for="(phrase, idx) in basket.e"
                          :key="`${legoId}-e-${idx}`"
                          class="bg-emerald-900/10 border border-emerald-700/30 rounded p-3"
                        >
                          <div class="text-xs font-mono text-emerald-500/60 mb-1">{{ legoId }}_E{{ String(idx + 1).padStart(2, '0') }}</div>
                          <div class="text-sm text-blue-300">{{ phrase[0] }}</div>
                          <div class="text-sm text-slate-300">{{ phrase[1] }}</div>
                        </div>
                      </div>
                    </div>

                    <!-- Debut Phrases Section -->
                    <div v-if="Object.keys(basket.d).length > 0">
                      <div class="text-sm font-semibold text-purple-400 mb-2 flex items-center gap-2">
                        <span>Debut Phrases</span>
                        <span class="text-xs text-purple-400/60">({{ getTotalDebutCount(basket.d) }})</span>
                      </div>
                      <div class="space-y-2">
                        <!-- Each word length section -->
                        <div
                          v-for="wordLength in ['2', '3', '4', '5']"
                          :key="`${legoId}-d-${wordLength}`"
                          v-show="basket.d[wordLength] && basket.d[wordLength].length > 0"
                          class="bg-purple-900/10 border border-purple-700/30 rounded overflow-hidden"
                        >
                          <!-- Word Length Header -->
                          <button
                            @click="toggleDebutLength(legoId, wordLength)"
                            class="w-full px-3 py-2 hover:bg-purple-900/20 transition-colors flex items-center justify-between"
                          >
                            <div class="flex items-center gap-2">
                              <span class="text-xs font-semibold text-purple-400">{{ wordLength }}-word phrases</span>
                              <span class="text-xs text-purple-400/60">({{ basket.d[wordLength]?.length || 0 }})</span>
                            </div>
                            <svg class="w-4 h-4 text-purple-400 transition-transform" :class="{ 'rotate-180': expandedDebut[`${legoId}-${wordLength}`] }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                            </svg>
                          </button>

                          <!-- Debut Phrases for this word length -->
                          <div v-if="expandedDebut[`${legoId}-${wordLength}`]" class="px-3 pb-3 space-y-2">
                            <div
                              v-for="(phrase, idx) in basket.d[wordLength]"
                              :key="`${legoId}-d${wordLength}-${idx}`"
                              class="bg-slate-800 border border-purple-700/20 rounded p-2"
                            >
                              <div class="text-xs font-mono text-purple-500/60 mb-1">{{ legoId }}_D{{ wordLength }}_{{ String(idx + 1).padStart(2, '0') }}</div>
                              <div class="text-sm text-blue-300">{{ phrase[0] }}</div>
                              <div class="text-sm text-slate-300">{{ phrase[1] }}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Empty State -->
                    <div v-if="basket.e.length === 0 && getTotalDebutCount(basket.d) === 0" class="text-center py-4 text-slate-500 text-sm">
                      No phrases in this basket
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
const basketsData = ref(null) // LEGO_BASKETS data structure from baskets.json
const expandedBaskets = ref({}) // Track which baskets are expanded
const expandedDebut = ref({}) // Track which debut word-length sections are expanded
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

    // Use basketsData from response if available (VFS loader provides this)
    if (response.basketsData) {
      basketsData.value = response.basketsData
    } else {
      // Fallback: try to load lego_baskets.json from VFS (v7.7+ format)
      try {
        const basketsResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'}/api/courses/${courseCode}/vfs/lego_baskets.json`, {
          headers: {
            'ngrok-skip-browser-warning': 'true'
          }
        })
        if (basketsResponse.ok) {
          basketsData.value = await basketsResponse.json()
        } else {
          console.log('lego_baskets.json not found (Phase 5 may not be complete)')
          basketsData.value = null
        }
      } catch (err) {
        console.log('Could not load lego_baskets.json:', err.message)
        basketsData.value = null
      }
    }
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

  // Initialize editable copies of LEGOs and FEEDERs
  editDividers.value[breakdown.seed_id] = {
    lego_pairs: JSON.parse(JSON.stringify(breakdown.lego_pairs || [])),
    feeder_pairs: JSON.parse(JSON.stringify(breakdown.feeder_pairs || []))
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

  // If merging creates COMPOSITE, update type
  if (previous.lego_type === 'BASE' && current.lego_type === 'BASE') {
    previous.lego_type = 'COMPOSITE'
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
    // Validate tiling before saving
    if (!validateTiling(breakdown)) {
      alert('Tiling validation failed! LEGOs must tile perfectly to cover the entire sentence.')
      return
    }

    const editedLegos = getEditableLegos(breakdown)
    const editedFeeders = getEditableFeeders(breakdown)

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

function toggleDebutLength(legoId, length) {
  const key = `${legoId}-${length}`
  expandedDebut.value[key] = !expandedDebut.value[key]
}

function getTotalDebutCount(debutObj) {
  if (!debutObj) return 0
  return Object.values(debutObj).reduce((sum, arr) => sum + arr.length, 0)
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
