<template>
  <div class="script-viewer flex flex-col h-screen bg-slate-900">
    <!-- Header -->
    <div class="script-header bg-slate-800 border-b border-slate-700 px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="header-left flex items-center gap-4">
          <h1 class="text-xl font-bold text-white">Script Viewer</h1>
          <div v-if="totalSeeds > 0" class="stats text-sm text-slate-400">
            <template v-if="viewMode === 'listening'">
              <span class="text-purple-400">Listening Projection</span>
            </template>
            <template v-else-if="viewMode === 'journey'">
              <span v-if="journeySearching" class="text-emerald-400">Searching...</span>
              <span v-else-if="journeySearch.trim() && journeySearchResults !== null">
                {{ filteredJourneyRounds.length }} results
              </span>
              <span v-else>
                {{ filteredJourneyRounds.length }} rounds, {{ learningJourneyData?.stats?.totalItems || 0 }} items
              </span>
            </template>
            <template v-else>
              {{ loadedSeeds }} of {{ totalSeeds }} seeds, {{ totalPhrases.toLocaleString() }} phrases
            </template>
          </div>
          <!-- Search box -->
          <div class="relative">
            <input
              v-model="journeySearch"
              type="text"
              placeholder="Search text, seed, LEGO..."
              class="w-56 px-3 py-1.5 pl-8 text-sm bg-slate-700 text-white placeholder-slate-400 rounded border border-slate-600 focus:border-emerald-500 focus:outline-none"
              @keydown.escape="journeySearch = ''"
            />
            <!-- Spinner while searching, magnifying glass otherwise -->
            <svg v-if="journeySearching" class="absolute left-2.5 top-2 w-3.5 h-3.5 text-emerald-400 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <svg v-else class="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <button
              v-if="journeySearch"
              @click="journeySearch = ''"
              class="absolute right-2 top-1.5 text-slate-400 hover:text-white"
            >&times;</button>
          </div>
        </div>

        <div class="header-right flex items-center gap-3">
          <!-- View Mode Toggle Buttons -->
          <button
            @click="viewMode = 'journey'; if (!learningJourneyData) { journeyOffset = 0; loadLearningJourney(); }"
            :class="viewMode !== 'listening' ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'"
            class="px-4 py-2 text-sm rounded-lg flex items-center gap-2 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
            </svg>
            Course Preview
          </button>
          <button
            @click="viewMode = 'listening'; if (!learningJourneyData) { journeyOffset = 0; loadLearningJourney(); }"
            :class="viewMode === 'listening' ? 'bg-purple-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'"
            class="px-4 py-2 text-sm rounded-lg transition-colors"
          >
            Listening Projection
          </button>

          <!-- Collapse/Expand All (only in seed mode) -->
          <template v-if="viewMode === 'script'">
            <button
              @click="collapseAll"
              class="px-3 py-1.5 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded transition-colors flex items-center gap-1"
              title="Collapse all seeds"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
              </svg>
              Collapse All
            </button>

            <button
              @click="expandAll"
              class="px-3 py-1.5 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded transition-colors flex items-center gap-1"
              title="Expand all seeds"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
              Expand All
            </button>

            <!-- Pagination Controls for Seeds -->
            <div v-if="totalSeeds > 0" class="flex items-center gap-2">
              <button
                @click="prevSeedPage"
                :disabled="seedPageStart <= 1"
                class="px-2 py-1 text-sm rounded transition-colors"
                :class="seedPageStart <= 1
                  ? 'text-slate-500 cursor-not-allowed'
                  : 'text-slate-300 hover:text-white hover:bg-slate-600'"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
              <span class="text-sm text-slate-300">
                <span class="font-medium text-white">{{ seedPageStart }}-{{ seedPageEnd }}</span>
                <span class="text-slate-500"> of </span>
                <span class="text-white">{{ totalSeeds }}</span>
              </span>
              <button
                @click="nextSeedPage"
                :disabled="seedPageEnd >= totalSeeds"
                class="px-2 py-1 text-sm rounded transition-colors"
                :class="seedPageEnd >= totalSeeds
                  ? 'text-slate-500 cursor-not-allowed'
                  : 'text-slate-300 hover:text-white hover:bg-slate-600'"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            </div>

            <!-- Select Phrases Button -->
            <button
              v-if="!selectionMode"
              @click="toggleSelectionMode"
              class="px-3 py-1.5 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded transition-colors flex items-center gap-1"
              title="Select phrases for batch delete"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Select Phrases
            </button>
          </template>

          <!-- Pagination for journey mode -->
          <template v-if="viewMode === 'journey'">
            <!-- Collapse/Expand All Buttons (moved here from inside scroll area) -->
            <div class="flex gap-2">
              <button
                @click="collapseAllJourney"
                class="px-3 py-1.5 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded transition-colors"
              >
                Collapse All
              </button>
              <button
                @click="expandAllJourney"
                class="px-3 py-1.5 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded transition-colors"
              >
                Expand All
              </button>
              <button
                @click="hideListening = !hideListening"
                :class="hideListening ? 'bg-fuchsia-700 text-fuchsia-100 hover:bg-fuchsia-600' : 'text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600'"
                class="px-3 py-1.5 text-sm rounded transition-colors"
                :title="hideListening ? 'Show LISTEN / POD items' : 'Hide LISTEN / POD items so QA can scan main content'"
              >
                {{ hideListening ? 'Show Listening' : 'Hide Listening' }}
              </button>
              <button
                @click="exportLearnerScript"
                :disabled="!learningJourneyData"
                class="px-3 py-1.5 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded transition-colors flex items-center gap-1"
                :class="{ 'opacity-50 cursor-not-allowed': !learningJourneyData }"
                title="Export learner script as markdown"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export
              </button>
            </div>

            <!-- Pagination Controls (only show when data is loaded) -->
            <div v-if="totalJourneyRounds > 0" class="flex items-center gap-2">
              <button
                @click="prevPage"
                :disabled="journeyOffset === 0"
                class="px-2 py-1 text-sm rounded transition-colors"
                :class="journeyOffset === 0
                  ? 'text-slate-500 cursor-not-allowed'
                  : 'text-slate-300 hover:text-white hover:bg-slate-600'"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
              <span class="text-sm text-slate-300">
                <span class="font-medium text-white">{{ journeyPageStart }}-{{ journeyPageEnd }}</span>
                <span class="text-slate-500"> rounds</span>
              </span>
              <button
                @click="nextPage"
                :disabled="!journeyHasMore"
                class="px-2 py-1 text-sm rounded transition-colors"
                :class="!journeyHasMore
                  ? 'text-slate-500 cursor-not-allowed'
                  : 'text-slate-300 hover:text-white hover:bg-slate-600'"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Filter Bar (only in script mode) -->
    <FilterBar
      v-if="viewMode === 'script'"
      v-model:status="filterStatus"
      v-model:seed-start="filterSeedStart"
      v-model:seed-end="filterSeedEnd"
      v-model:search-text="filterSearchText"
      v-model:flagged-only="filterFlaggedOnly"
      :total-seeds="totalSeeds"
      @change="onFilterChange"
    />

    <!-- Main Content Area -->
    <div ref="scriptContentRef" class="script-content flex-1 overflow-y-auto p-6" :class="{ 'pb-24': journeyPlayerActive }">
      <!-- Loading State (only show full-screen spinner when no seeds loaded yet) -->
      <div v-if="isLoading && seeds.length === 0 && directFlaggedItems.length === 0" class="loading-state flex items-center justify-center h-64">
        <div class="text-center">
          <svg class="w-12 h-12 mx-auto mb-4 animate-spin text-emerald-500" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="text-slate-400">{{ loadingProgress || 'Loading course data...' }}</p>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="error-state flex items-center justify-center h-64">
        <div class="text-center max-w-md">
          <svg class="w-12 h-12 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 class="text-lg font-semibold text-white mb-2">Error Loading Course</h3>
          <p class="text-slate-400 mb-4">{{ error }}</p>
          <button
            @click="loadCourseData"
            class="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>

      <!-- Empty State for Regen Queue -->
      <div v-else-if="filterFlaggedOnly && flatFlaggedItems.length === 0" class="empty-state flex items-center justify-center h-64">
        <div class="text-center">
          <svg class="w-12 h-12 mx-auto mb-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 class="text-lg font-semibold text-white mb-2">Regen Queue Empty</h3>
          <p class="text-slate-400 mb-4">No audio marked for regeneration</p>
          <button
            @click="clearFilters"
            class="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
          >
            Clear Filters
          </button>
        </div>
      </div>

      <!-- Regen Queue Items View -->
      <div v-else-if="filterFlaggedOnly" class="flagged-items-list space-y-3">
        <div class="flagged-header flex items-center justify-between mb-4">
          <div class="text-sm text-slate-400">
            <span class="text-amber-400 font-semibold">{{ flatFlaggedItems.length }}</span>
            item{{ flatFlaggedItems.length !== 1 ? 's' : '' }} in regen queue
            <span v-if="orphanedFlagCount > 0" class="text-red-400 ml-2">
              ({{ orphanedFlagCount }} orphaned)
            </span>
          </div>
          <div class="flex items-center gap-2">
            <button
              v-if="orphanedFlagCount > 0"
              @click="deleteOrphanedFlags"
              :disabled="isDeletingOrphans"
              class="flex items-center gap-2 px-4 py-2 bg-red-500 bg-opacity-20 text-red-400 hover:bg-opacity-30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              <svg v-if="isDeletingOrphans" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Remove {{ orphanedFlagCount }} Orphaned
            </button>
            <router-link
              v-if="flatFlaggedItems.length > 0"
              :to="`/production/${courseCode}/pipeline?mode=flagged`"
              class="flex items-center gap-2 px-4 py-2 bg-emerald-500 bg-opacity-20 text-emerald-400 hover:bg-opacity-30 rounded-lg text-sm font-medium transition-colors"
            >
              Regenerate Queue
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </router-link>
          </div>
        </div>

        <FlaggedItemRow
          v-for="item in flatFlaggedItems"
          :key="item.uuid"
          :item="item"
          @play="playFlaggedItem"
          @edit="editFlaggedItem"
          @unflag="unflagItem"
        />
      </div>

      <!-- Learning Journey View Mode -->
      <template v-else-if="viewMode === 'journey'">
        <!-- Loading Journey -->
        <div v-if="isLoadingJourney" class="loading-state flex items-center justify-center h-64">
          <div class="text-center">
            <svg class="w-12 h-12 mx-auto mb-4 animate-spin text-emerald-500" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p class="text-slate-400">Generating learning journey...</p>
          </div>
        </div>

        <!-- Journey Error -->
        <div v-else-if="journeyError" class="error-state flex items-center justify-center h-64">
          <div class="text-center max-w-md">
            <svg class="w-12 h-12 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 class="text-lg font-semibold text-white mb-2">Error Generating Journey</h3>
            <p class="text-slate-400 mb-4">{{ journeyError }}</p>
            <button
              @click="reloadLearningJourney"
              class="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>

        <!-- Learning Journey View Component -->
        <LearningJourneyView
          v-else-if="learningJourneyData"
          ref="learningJourneyRef"
          :rounds="filteredJourneyRounds"
          :all-items="filteredJourneyAllItems"
          :course-code="courseCode"
          :stats="learningJourneyData.stats"
          :is-loading="isLoadingJourney"
          :hide-controls="true"
          :hide-listening="hideListening"
          :flagged-audio-uuids="flaggedAudioUuids"
          :regenerating-uuids="regeneratingAudioUuids"
          :flagged-phrase-ids="journeyFlaggedPhraseIds"
          @playback-state="onJourneyPlaybackState"
          @item-edit="onJourneyItemEdit"
          @presentation-edit="onJourneyPresentationEdit"
          @audio-flag="onJourneyAudioFlag"
          @audio-regen="onJourneyAudioRegen"
          @phrase-flag="onJourneyPhraseFlag"
        />
      </template>

      <!-- Listening Projection View Mode -->
      <template v-else-if="viewMode === 'listening'">
        <ListeningProjectionView
          :course-code="courseCode"
          :total-legos="learningJourneyData?.totalLegoCount || 600"
        />
      </template>

      <!-- Script View Mode (original) -->
      <template v-else>
        <!-- Empty State (standard) -->
        <div v-if="filteredSeeds.length === 0" class="empty-state flex items-center justify-center h-64">
          <div class="text-center">
            <svg class="w-12 h-12 mx-auto mb-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 class="text-lg font-semibold text-white mb-2">No Results</h3>
            <p class="text-slate-400 mb-4">No seeds match your current filters</p>
            <button
              @click="clearFilters"
              class="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>

        <!-- Seeds List (Virtualized) -->
        <div v-else class="seeds-list space-y-4">
        <!-- Show a message if using virtual scrolling would be beneficial -->
        <div v-if="filteredSeeds.length > 50" class="performance-notice bg-blue-500 bg-opacity-10 border border-blue-500 border-opacity-30 rounded-lg p-4 mb-4">
          <div class="flex items-start gap-3">
            <svg class="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div class="text-sm text-blue-300">
              <strong>Performance Notice:</strong> Rendering {{ filteredSeeds.length }} seeds. Consider using more specific filters for better performance.
            </div>
          </div>
        </div>

        <!-- Selection Toolbar -->
        <div v-if="selectionMode" class="selection-toolbar sticky top-0 z-20 bg-slate-900 border-b border-slate-700 px-4 py-3 mb-4 rounded-lg flex items-center justify-between">
          <div class="flex items-center gap-4">
            <span class="text-slate-300">
              <span class="font-medium text-white">{{ selectedCount }}</span> phrase{{ selectedCount !== 1 ? 's' : '' }} selected
            </span>
            <button
              v-if="selectedCount > 0"
              @click="clearSelection"
              class="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Clear selection
            </button>
          </div>
          <div class="flex items-center gap-3">
            <button
              v-if="selectedCount > 0"
              @click="showDeleteConfirmModal = true"
              class="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete {{ selectedCount }} phrase{{ selectedCount !== 1 ? 's' : '' }}
            </button>
            <button
              @click="toggleSelectionMode"
              class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Exit Selection
            </button>
          </div>
        </div>

        <!-- Seed Rows -->
        <SeedRow
          v-for="seed in visibleSeeds"
          :key="seed.seed_id"
          :seed="seed"
          :course-code="courseCode"
          :selection-mode="selectionMode"
          :selected-phrase-ids="selectedPhraseIds"
          @toggle="toggleSeed"
          @lego-toggle="toggleLego"
          @phrase-flag="openFlagModal"
          @phrase-edit="openPhraseEditModal"
          @phrase-delete="handlePhraseDelete"
          @audio-flag="handleAudioFlag"
          @toggle-selection="togglePhraseSelection"
          @phrase-play="playAudioSample"
          @phrase-pause="pauseAudio"
        />

        <!-- Progressive loading indicator (shown while chunks are still arriving) -->
        <div v-if="isLoading && seeds.length > 0" class="loading-more text-center py-6">
          <div class="inline-flex items-center gap-3 px-4 py-2 bg-slate-800 rounded-lg">
            <svg class="w-5 h-5 animate-spin text-emerald-500" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span class="text-sm text-slate-400">{{ loadingProgress }}</span>
          </div>
        </div>

        <!-- Load More (if using pagination) -->
        <div v-if="!isLoading && hasMoreSeeds" class="load-more text-center py-8">
          <button
            @click="loadMoreSeeds"
            class="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
          >
            Load More Seeds
          </button>
        </div>
      </div>
      </template>
    </div>

    <!-- Playback Bar (Sticky Bottom) -->
    <Transition name="slide-up">
      <div v-if="currentPlayingSample" class="playback-bar bg-slate-800 border-t border-slate-700 px-6 py-4">
        <div class="flex items-center justify-between gap-4">
          <div class="playback-info flex-1">
            <div class="text-sm font-medium text-white mb-1">{{ currentPlayingSample.text }}</div>
            <div class="text-xs text-slate-400">
              <span class="font-mono">{{ currentPlayingSample.uuid }}</span>
              <span class="mx-2">•</span>
              <span>{{ currentPlayingSample.role }} ({{ currentPlayingSample.cadence }})</span>
            </div>
          </div>

          <AudioPlayer
            :audio-url="currentPlayingSample.url"
            :show-waveform="false"
            :auto-play="true"
            @ended="onPlaybackEnded"
            @error="onPlaybackError"
          />

          <button
            @click="closePlaybackBar"
            class="p-2 text-slate-400 hover:text-white transition-colors"
            title="Close playback bar"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </Transition>

    <!-- Journey Playback Bar (4-Phase) — fixed bottom of viewport in journey mode -->
    <div v-if="journeyPlayerActive" class="journey-playback-bar fixed bottom-0 left-0 right-0 z-40 bg-slate-800 border-t border-slate-700 px-6 py-3">
      <div class="flex items-center gap-4">
        <template v-if="journeyPlayback?.currentItem">
          <!-- Position Info -->
          <div v-if="journeyPlayingRoundInfo" class="position-info text-xs text-slate-400 font-mono min-w-24">
            R{{ journeyPlayingRoundInfo.roundNumber }}, {{ journeyPlayingRoundInfo.itemIndex }}/{{ journeyPlayingRoundInfo.itemCount }}
          </div>

          <!-- Type Badge -->
          <div
            class="type-badge px-2 py-0.5 rounded text-xs font-medium uppercase"
            :class="{
              'bg-purple-500 bg-opacity-30 text-purple-300': journeyPlayback.currentItem.type === 'intro',
              'bg-emerald-500 bg-opacity-30 text-emerald-300': journeyPlayback.currentItem.type === 'debut',
              'bg-blue-500 bg-opacity-30 text-blue-300': journeyPlayback.currentItem.type === 'build',
              'bg-amber-500 bg-opacity-30 text-amber-300': journeyPlayback.currentItem.type === 'review',
              'bg-cyan-500 bg-opacity-30 text-cyan-300': journeyPlayback.currentItem.type === 'consolidate',
            }"
          >
            {{ journeyPlayback.currentItem.type }}
          </div>

          <!-- Current Item Text -->
          <div class="item-text flex-1 min-w-0">
            <div class="flex items-center gap-2 text-sm">
              <span class="text-slate-400 truncate">{{ journeyPlayback.currentItem.known_text || '' }}</span>
              <span class="text-slate-600 flex-shrink-0">&rarr;</span>
              <span class="text-white truncate">{{ journeyPlayback.currentItem.target_text || '' }}</span>
            </div>
          </div>

          <!-- 4-Phase Indicator -->
          <div class="phase-indicator flex gap-1 items-center">
            <div
              v-for="phase in ['prompt', 'pause', 'voice1', 'voice2']"
              :key="phase"
              class="phase-segment px-2 py-0.5 rounded text-xs font-mono transition-colors"
              :class="journeyPlayback?.currentPhase === phase
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-700 text-slate-500'"
            >
              {{ journeyPhaseLabel(phase) }}
            </div>
          </div>

          <!-- Progress Bar -->
          <div class="progress-bar w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              class="h-full bg-emerald-500 rounded-full transition-all duration-100"
              :style="{ width: (journeyPlayback?.progress || 0) + '%' }"
            ></div>
          </div>

          <!-- Controls -->
          <div class="controls flex items-center gap-1">
            <!-- Previous -->
            <button
              @click="journeyPlayerPrevious"
              class="p-2 text-slate-400 hover:text-white transition-colors"
              title="Previous"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
              </svg>
            </button>

            <!-- Play/Pause -->
            <button
              @click="journeyPlayback?.isPlaying ? journeyPlayerPause() : journeyPlayerPlay()"
              class="p-2 text-white hover:text-emerald-400 transition-colors"
              :title="journeyPlayback?.isPlaying ? 'Pause' : 'Play'"
            >
              <svg v-if="journeyPlayback?.isPlaying" class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
              </svg>
              <svg v-else class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </button>

            <!-- Next -->
            <button
              @click="journeyPlayerSkip"
              class="p-2 text-slate-400 hover:text-white transition-colors"
              title="Next"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
              </svg>
            </button>

            <!-- Stop -->
            <button
              @click="journeyPlayerStop"
              class="p-2 text-slate-400 hover:text-red-400 transition-colors"
              title="Stop"
            >
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h12v12H6z"/>
              </svg>
            </button>
          </div>

          <!-- Item Counter -->
          <div class="text-xs text-slate-500 font-mono">
            {{ (journeyPlayback?.currentIndex || 0) + 1 }}/{{ journeyPlayback?.totalItems || 0 }}
          </div>
        </template>

        <!-- Idle state — nothing playing yet -->
        <template v-else>
          <div class="text-sm text-slate-500 flex-1">Click play on any item or round to start preview</div>
          <div class="phase-indicator flex gap-1 items-center">
            <div
              v-for="phase in ['prompt', 'pause', 'voice1', 'voice2']"
              :key="phase"
              class="phase-segment px-2 py-0.5 rounded text-xs font-mono bg-slate-700 text-slate-500"
            >
              {{ journeyPhaseLabel(phase) }}
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Flag Modal -->
    <FlagModal
      :visible="flagModalVisible"
      :sample="selectedSample"
      @close="closeFlagModal"
      @submit="submitFlag"
    />

    <!-- Phrase Edit Modal -->
    <PhraseEditModal
      ref="phraseEditModalRef"
      :visible="phraseEditModalVisible"
      :phrase="phraseToEdit"
      :mode="phraseEditMode"
      @close="closePhraseEditModal"
      @save="savePhraseEdit"
    />

    <!-- Presentation (Intro Narration) Edit + Regenerate Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="presentationModalVisible"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          @click.self="closePresentationModal"
        >
          <div class="bg-slate-800 rounded-lg shadow-xl max-w-2xl w-full">
            <!-- Header -->
            <div class="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h3 class="text-lg font-semibold text-white flex items-center gap-2">
                <svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-14 0m7 7v3m0-3a4 4 0 01-4-4V7a4 4 0 118 0v7a4 4 0 01-4 4z" />
                </svg>
                Intro Narration
                <span class="text-sm font-mono text-slate-400">{{ presentationLegoId }}</span>
              </h3>
              <button @click="closePresentationModal" class="text-slate-400 hover:text-white">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Body -->
            <div class="px-6 py-5 space-y-4">
              <div class="text-sm text-slate-400">
                <span class="text-slate-300">{{ presentationKnownText }}</span>
                <span class="mx-2 text-slate-600">&rarr;</span>
                <span class="text-white">{{ presentationTargetText }}</span>
              </div>

              <!-- Loading current text -->
              <div v-if="presentationLoading" class="flex items-center gap-3 text-slate-400 text-sm py-6">
                <svg class="w-5 h-5 animate-spin text-purple-400" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading current narration text...
              </div>

              <template v-else>
                <label class="block text-xs font-medium text-slate-400 uppercase tracking-wide">
                  Presentation text (spoken in the known language)
                </label>
                <textarea
                  v-model="presentationText"
                  rows="4"
                  class="w-full px-3 py-2 text-sm bg-slate-900 text-white rounded border border-slate-600 focus:border-purple-500 focus:outline-none resize-y"
                  placeholder="The Chinese for 'to want', is: ... '想' ... '想'"
                ></textarea>
                <p class="text-xs text-slate-500">
                  This is the authoritative store for the intro audio. Saving regenerates only this LEGO's clip.
                </p>

                <!-- Result / audition -->
                <div v-if="presentationResult" class="bg-emerald-900 bg-opacity-20 border border-emerald-800 rounded-lg p-3 space-y-2">
                  <div class="text-sm text-emerald-300">
                    Regenerated ({{ presentationResult.duration_ms }}ms){{ presentationResult.created ? ' — created new row' : '' }}.
                  </div>
                  <audio
                    v-if="presentationAudioUrl"
                    :src="presentationAudioUrl"
                    controls
                    class="w-full h-9"
                  ></audio>
                </div>

                <div v-if="presentationError" class="bg-red-900 bg-opacity-20 border border-red-800 rounded-lg p-3 text-sm text-red-300">
                  {{ presentationError }}
                </div>
              </template>
            </div>

            <!-- Footer -->
            <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-700">
              <button
                @click="closePresentationModal"
                class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                @click="savePresentationAndRegen"
                :disabled="presentationBusy || presentationLoading || !presentationText.trim()"
                class="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <svg v-if="presentationBusy" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {{ presentationBusy ? 'Regenerating...' : 'Save & regenerate audio' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Batch Delete Confirmation Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showDeleteConfirmModal"
          class="delete-confirm-modal fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          @click.self="showDeleteConfirmModal = false"
        >
          <div class="modal-content bg-slate-800 rounded-lg shadow-xl max-w-md w-full">
            <!-- Header -->
            <div class="modal-header flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h3 class="text-lg font-semibold text-white flex items-center gap-2">
                <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Confirm Deletion
              </h3>
              <button
                @click="showDeleteConfirmModal = false"
                class="text-slate-400 hover:text-white transition-colors"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Body -->
            <div class="modal-body px-6 py-5">
              <p class="text-slate-300 mb-4">
                You are about to permanently delete
                <span class="font-semibold text-white">{{ selectedCount }}</span>
                phrase{{ selectedCount !== 1 ? 's' : '' }} from this course.
              </p>
              <div class="bg-red-900 bg-opacity-20 border border-red-800 rounded-lg p-4 text-sm text-red-300">
                <strong>Warning:</strong> This action cannot be undone. The phrases will be removed from the database.
              </div>
            </div>

            <!-- Footer -->
            <div class="modal-footer flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-700">
              <button
                @click="showDeleteConfirmModal = false"
                class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                @click="handleBatchDelete"
                :disabled="isDeleting"
                class="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-red-800 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <svg v-if="isDeleting" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {{ isDeleting ? 'Deleting...' : 'Delete Phrases' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Journey Phrase Flagging: Floating Action Bar -->
    <Transition name="modal">
      <div
        v-if="journeyFlaggedPhraseIds.size > 0 && viewMode === 'journey'"
        class="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 bg-red-900 bg-opacity-95 border border-red-700 rounded-lg shadow-xl px-5 py-3 flex items-center gap-4"
      >
        <span class="text-red-200 text-sm font-medium">
          {{ journeyFlaggedPhraseIds.size }} phrase{{ journeyFlaggedPhraseIds.size !== 1 ? 's' : '' }} flagged
        </span>
        <button
          @click="journeyFlaggedPhraseIds.clear()"
          class="px-3 py-1.5 text-sm text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-600 rounded transition-colors"
        >Clear</button>
        <button
          @click="showJourneyDeleteStep = 1"
          class="px-4 py-1.5 text-sm text-white bg-red-600 hover:bg-red-500 rounded font-medium transition-colors flex items-center gap-2"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
          Delete Flagged
        </button>
      </div>
    </Transition>

    <!-- Journey Phrase Delete: Two-Step Confirmation Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showJourneyDeleteStep > 0"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          @click.self="showJourneyDeleteStep = 0"
        >
          <div class="bg-slate-800 rounded-lg shadow-xl max-w-lg w-full">
            <!-- Step 1: Review flagged phrases -->
            <template v-if="showJourneyDeleteStep === 1">
              <div class="px-6 py-4 border-b border-slate-700">
                <h3 class="text-lg font-semibold text-white">Review Flagged Phrases</h3>
              </div>
              <div class="px-6 py-4 max-h-80 overflow-y-auto space-y-2">
                <div
                  v-for="item in journeyFlaggedPhraseDetails"
                  :key="item.phrase_id"
                  class="flex items-center gap-3 p-2 bg-slate-700 rounded text-sm"
                >
                  <span class="text-slate-400 truncate flex-1">{{ item.known_text }}</span>
                  <span class="text-slate-500">&rarr;</span>
                  <span class="text-white truncate flex-1">{{ item.target_text }}</span>
                  <button
                    @click="onRemoveJourneyFlaggedPhrase(item.phrase_id)"
                    class="text-slate-500 hover:text-red-400 flex-shrink-0"
                    title="Remove from list"
                  >&times;</button>
                </div>
                <p v-if="journeyFlaggedPhraseDetails.length === 0" class="text-slate-500 text-sm">No phrases flagged.</p>
              </div>
              <div class="px-6 py-4 border-t border-slate-700 flex justify-end gap-3">
                <button @click="showJourneyDeleteStep = 0" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors">Cancel</button>
                <button @click="showJourneyDeleteStep = 2" class="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors">Confirm Delete</button>
              </div>
            </template>

            <!-- Step 2: Final confirmation -->
            <template v-if="showJourneyDeleteStep === 2">
              <div class="px-6 py-4 border-b border-slate-700">
                <h3 class="text-lg font-semibold text-white flex items-center gap-2">
                  <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                  </svg>
                  Final Confirmation
                </h3>
              </div>
              <div class="px-6 py-5">
                <p class="text-slate-300 mb-4">
                  Delete <span class="font-semibold text-white">{{ journeyFlaggedPhraseIds.size }}</span>
                  phrase{{ journeyFlaggedPhraseIds.size !== 1 ? 's' : '' }}? This cannot be undone.
                </p>
                <div class="bg-red-900 bg-opacity-20 border border-red-800 rounded-lg p-4 text-sm text-red-300">
                  <strong>Warning:</strong> The phrases will be permanently removed from the database.
                </div>
              </div>
              <div class="px-6 py-4 border-t border-slate-700 flex justify-end gap-3">
                <button @click="showJourneyDeleteStep = 0" class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors">Cancel</button>
                <button
                  @click="handleJourneyBatchDelete"
                  :disabled="isDeletingJourneyPhrases"
                  class="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-red-800 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg v-if="isDeletingJourneyPhrases" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {{ isDeletingJourneyPhrases ? 'Deleting...' : 'Delete' }}
                </button>
              </div>
            </template>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Keyboard Shortcuts Help Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="showShortcutsHelp"
          class="shortcuts-modal fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          @click.self="showShortcutsHelp = false"
        >
          <div class="modal-content bg-slate-800 rounded-lg shadow-xl max-w-lg w-full p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-semibold text-white">Keyboard Shortcuts</h3>
              <button @click="showShortcutsHelp = false" class="text-slate-400 hover:text-white">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div class="shortcuts-list space-y-3">
              <div v-for="shortcut in keyboardShortcuts" :key="shortcut.key" class="shortcut-item flex items-center justify-between py-2 border-b border-slate-700">
                <span class="text-slate-300">{{ shortcut.description }}</span>
                <kbd class="px-2 py-1 bg-slate-700 text-slate-300 rounded text-sm font-mono">{{ shortcut.key }}</kbd>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Scroll buttons (fixed bottom-right) -->
    <div class="fixed bottom-6 right-6 flex flex-col gap-2 z-50">
      <button
        @click="scrollUp"
        class="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 text-white shadow-lg flex items-center justify-center transition-colors"
        title="Scroll up"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/>
        </svg>
      </button>
      <button
        @click="scrollDown"
        class="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 text-white shadow-lg flex items-center justify-center transition-colors"
        title="Scroll down"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRoute } from 'vue-router';
import FilterBar from './components/FilterBar.vue';
import SeedRow from './components/SeedRow.vue';
import AudioPlayer from './components/AudioPlayer.vue';
import FlagModal from './components/FlagModal.vue';
import PhraseEditModal from './components/PhraseEditModal.vue';
import FlaggedItemRow from './components/FlaggedItemRow.vue';
import LearningJourneyView from './components/LearningJourneyView.vue';
import ListeningProjectionView from './components/ListeningProjectionView.vue';
import { getApiUrl } from '@/services/api';
import { useAuth } from '@/composables/useAuth.js';
// CyclePlayer removed - not useful for QA workflow
import type {
  SeedRowData,
  LegoRowData,
  PhraseRowData,
  AudioSample,
  SampleStatus,
  FlagType,
  KeyboardShortcut
} from '@/types/production';

// Route
const route = useRoute();
const courseCode = computed(() => route.params.courseCode as string || 'spa_for_eng');

// Scroll refs
const scriptContentRef = ref<HTMLElement | null>(null);
const scrollUp = () => scriptContentRef.value?.scrollBy({ top: -400, behavior: 'smooth' });
const scrollDown = () => scriptContentRef.value?.scrollBy({ top: 400, behavior: 'smooth' });

// State
const isLoading = ref(false);
const loadingProgress = ref('');  // e.g. "Loading seeds 11-20..."
const error = ref<string | null>(null);
const seeds = ref<SeedRowData[]>([]);
const totalSeedsInCourse = ref(0);  // Total seeds in course (from API)

// Filter State - default to first 50 seeds for performance
const filterStatus = ref<SampleStatus | 'all' | 'flagged'>('all');
const filterSeedStart = ref('S0001');
const filterSeedEnd = ref('S0050');
const filterSearchText = ref('');
const filterFlaggedOnly = ref(false);

// Track when seed range changes to trigger reload
const lastLoadedRange = ref({ start: '', end: '' });

// Pagination (for rendering within loaded seeds)
const visibleSeedCount = ref(50);
const hasMoreSeeds = computed(() => visibleSeedCount.value < filteredSeeds.value.length);

// Playback State
const currentPlayingSample = ref<AudioSample | null>(null);

// Flag Modal State
const flagModalVisible = ref(false);
const selectedSample = ref<AudioSample | null>(null);
const selectedPhrase = ref<PhraseRowData | null>(null);

// Phrase Edit Modal State
const phraseEditModalVisible = ref(false);
const phraseEditModalRef = ref<InstanceType<typeof PhraseEditModal> | null>(null);
const phraseToEdit = ref<{
  id: string;
  known_text: string;
  target_text: string;
  known_audio_uuid?: string;
  target1_audio_uuid?: string;
  target2_audio_uuid?: string;
  // The live journey/seed row object — rebound in-place after regen so the
  // *_audio_uuid pointers update reactively without a full reload.
  sourceItem?: any;
} | null>(null);
const phraseEditMode = ref<'phrase' | 'lego'>('phrase');


// Shortcuts Help
const showShortcutsHelp = ref(false);

// Learning Journey View Mode
const viewMode = ref<'script' | 'journey' | 'listening'>('journey');
const learningJourneyData = ref<{
  rounds: any[];
  allItems: any[];
  stats: any;
  totalLegoCount?: number;
} | null>(null);
const isLoadingJourney = ref(false);
const journeyError = ref<string | null>(null);

// Server-side pagination for journey view (20 LEGOs per page)
const journeyPageSize = 20;
const journeyOffset = ref(0);
const journeyHasMore = ref(true);

// Journey search (server-side across all content)
const journeySearch = ref('');
const journeySearchResults = ref<any[] | null>(null);
const journeySearchAllItems = ref<any[] | null>(null);
const journeySearching = ref(false);
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

// Watch search input and debounce server-side search
watch(journeySearch, (q) => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  const trimmed = q.trim();
  if (!trimmed) {
    journeySearchResults.value = null;
    journeySearchAllItems.value = null;
    journeySearching.value = false;
    return;
  }
  journeySearching.value = true;
  searchDebounceTimer = setTimeout(() => searchJourney(trimmed), 400);
});

async function searchJourney(query: string) {
  try {
    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(
      `${apiBaseUrl}/api/production/${courseCode.value}/learning-journey/search?q=${encodeURIComponent(query)}`,
      { headers: { 'ngrok-skip-browser-warning': 'true' } }
    );
    if (!response.ok) throw new Error('Search failed');
    const data = await response.json();
    // Only update if search query hasn't changed during fetch
    if (journeySearch.value.trim() === query) {
      journeySearchResults.value = data.rounds || [];
      journeySearchAllItems.value = data.allItems || [];
    }
  } catch (err) {
    console.error('Journey search error:', err);
    journeySearchResults.value = [];
    journeySearchAllItems.value = [];
  } finally {
    journeySearching.value = false;
  }
}

// Use search results when searching, otherwise current page rounds
const filteredJourneyRounds = computed(() => {
  if (journeySearch.value.trim() && journeySearchResults.value !== null) {
    return journeySearchResults.value;
  }
  return learningJourneyData.value?.rounds || [];
});

// Player needs items for whichever rounds are currently displayed.
// When searching, the search endpoint returns full items for matched rounds
// (which may be outside the loaded page window) — use those so the player
// can resolve audio for hits like R603 even when only R1-R20 are loaded.
const filteredJourneyAllItems = computed(() => {
  if (journeySearch.value.trim() && journeySearchAllItems.value !== null) {
    return journeySearchAllItems.value;
  }
  return learningJourneyData.value?.allItems || [];
});

// Batch Selection State
const selectionMode = ref(false);
const selectedPhraseIds = ref<Set<string>>(new Set());
const showDeleteConfirmModal = ref(false);

// Selection methods
const toggleSelectionMode = () => {
  selectionMode.value = !selectionMode.value;
  if (!selectionMode.value) {
    selectedPhraseIds.value = new Set(); // Clear selection when exiting mode
  }
};

const togglePhraseSelection = (phraseId: string) => {
  const newSet = new Set(selectedPhraseIds.value);
  if (newSet.has(phraseId)) {
    newSet.delete(phraseId);
  } else {
    newSet.add(phraseId);
  }
  selectedPhraseIds.value = newSet;
};

const clearSelection = () => {
  selectedPhraseIds.value = new Set();
};

const isDeleting = ref(false);

const handleBatchDelete = async () => {
  if (selectedPhraseIds.value.size === 0) return;

  isDeleting.value = true;
  const apiBaseUrl = getApiBaseUrl();

  try {
    const phraseIdsToDelete = Array.from(selectedPhraseIds.value);

    // Call the batch delete API
    const response = await fetch(`${apiBaseUrl}/api/production/${courseCode.value}/phrases/batch-delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phraseIds: phraseIdsToDelete }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete phrases');
    }

    // Remove phrases from local state (optimistic update already done by API success)
    const idsToDelete = new Set(phraseIdsToDelete);

    seeds.value = seeds.value.map(seed => ({
      ...seed,
      introduction_phrases: seed.introduction_phrases.filter(
        phrase => !idsToDelete.has(phrase.phrase_id)
      ),
      legos: seed.legos.map(lego => ({
        ...lego,
        phrases: lego.phrases.filter(phrase => !idsToDelete.has(phrase.phrase_id)),
      })),
    }));

    // Close modal and exit selection mode
    showDeleteConfirmModal.value = false;
    selectedPhraseIds.value = new Set();
    selectionMode.value = false;

    console.log(`Successfully deleted ${phraseIdsToDelete.length} phrases`);
  } catch (err) {
    console.error('Failed to delete phrases:', err);
    error.value = err instanceof Error ? err.message : 'Failed to delete phrases';
  } finally {
    isDeleting.value = false;
  }
};

const selectedCount = computed(() => selectedPhraseIds.value.size);
const learningJourneyRef = ref<any>(null);

// Journey playback state (emitted by LearningJourneyView)
const journeyPlayback = ref<{
  isPlaying: boolean
  isPaused: boolean
  currentItem: any
  currentPhase: string | null
  currentIndex: number
  progress: number
  totalItems: number
} | null>(null);

const onJourneyPlaybackState = (state: any) => {
  journeyPlayback.value = state;
};

const journeyPlayerActive = computed(() => {
  return viewMode.value === 'journey';
});

const journeyPhaseLabel = (phase: string | null): string => {
  switch (phase) {
    case 'prompt': return 'PROMPT';
    case 'pause': return 'PAUSE';
    case 'voice1': return 'VOICE 1';
    case 'voice2': return 'VOICE 2';
    default: return '';
  }
};

// Find which round the current playing item belongs to
const journeyPlayingRoundInfo = computed(() => {
  if (!journeyPlayback.value || !learningJourneyData.value?.allItems) return null;
  const idx = journeyPlayback.value.currentIndex;
  const item = learningJourneyData.value.allItems[idx];
  if (!item) return null;

  // Find the round
  const round = learningJourneyData.value.rounds.find((r: any) => r.roundNumber === item.roundNumber);
  if (!round) return null;
  const localIdx = round.items.indexOf(item);
  return {
    roundNumber: item.roundNumber,
    itemIndex: localIdx + 1,
    itemCount: round.items.length,
  };
});

// Journey player controls (proxied through the ref)
const journeyPlayerPrevious = () => learningJourneyRef.value?.player?.previous();
const journeyPlayerPlay = () => learningJourneyRef.value?.player?.play();
const journeyPlayerPause = () => learningJourneyRef.value?.player?.pause();
const journeyPlayerSkip = () => learningJourneyRef.value?.player?.skip();
const journeyPlayerStop = () => learningJourneyRef.value?.player?.stop();

// Computed for pagination (server-side)
const totalJourneyRounds = computed(() => learningJourneyData.value?.rounds?.length || 0);
const journeyPageStart = computed(() => journeyOffset.value + 1);
const journeyPageEnd = computed(() => journeyOffset.value + totalJourneyRounds.value);

// Pagination methods (server-side — reload from API)
const prevPage = () => {
  const newOffset = Math.max(0, journeyOffset.value - journeyPageSize);
  if (newOffset !== journeyOffset.value) {
    journeyOffset.value = newOffset;
    loadLearningJourney();
  }
};

const nextPage = () => {
  if (journeyHasMore.value) {
    journeyOffset.value += journeyPageSize;
    loadLearningJourney();
  }
};

// Collapse/Expand all methods for journey view
const collapseAllJourney = () => {
  learningJourneyRef.value?.collapseAll();
};

const expandAllJourney = () => {
  learningJourneyRef.value?.expandAll();
};

// QA toggle: hide LISTEN/POD items in the journey view so reviewers (Deborah)
// can scan main course content without scrolling past listening cycles.
const hideListening = ref(false);

// Export learner script as markdown download
const exportLearnerScript = () => {
  if (!learningJourneyData.value?.rounds) return;

  const rounds = learningJourneyData.value.rounds;
  const stats = learningJourneyData.value.stats;
  const lines: string[] = [];

  lines.push(`# ${courseCode.value} — Learner Script`);
  lines.push('');
  lines.push(`> ${stats.roundsGenerated} rounds | ${stats.totalItems} items | ${stats.legosLoaded} LEGOs`);
  lines.push('');
  lines.push('---');
  lines.push('');

  for (const round of rounds) {
    const intro = round.items.find((i: any) => i.type === 'intro');
    const known = intro?.known_text || '';
    const target = intro?.target_text || '';
    const reviews = round.spacedRepReviews || [];
    const reviewStr = reviews.length > 0 ? `  [reviews: ${reviews.map((r: number) => 'R' + r).join(', ')}]` : '';

    lines.push(`## R${round.roundNumber}  ${round.legoId}  "${known}" = **${target}**${reviewStr}`);
    lines.push('');

    for (const item of round.items) {
      let label = item.type.toUpperCase();
      if (item.type === 'intro') label = 'INTRO';
      else if (item.type === 'debut') label = 'LEGO';
      else if (item.type === 'build') label = `BUILD-${item.phrasePosition || '?'}`;
      else if (item.type === 'use') label = `USE-${item.phrasePosition || '?'}`;
      else if (item.type === 'review') label = `REVIEW R${item.reviewOf || '?'}`;
      else if (item.type === 'consolidate') label = `CONSOLIDATE-${item.consolidateIndex || '?'}`;

      const pad = Math.max(1, 18 - label.length);
      lines.push(`  ${label}${' '.repeat(pad)}${item.known_text || ''}  →  ${item.target_text || ''}`);
    }

    lines.push('');
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${courseCode.value}-learner-script.md`;
  a.click();
  URL.revokeObjectURL(url);
};

// API Base URL - use localStorage (set by EnvironmentSwitcher), then env, then localhost orchestrator
const getApiBaseUrl = (): string => {
  const storedUrl = localStorage.getItem('api_base_url');
  if (storedUrl) return storedUrl;
  return getApiUrl();
};

// Admin-gated fetch — attach a fresh Supabase access token as Bearer.
// Mirrors the PodDetailView authedFetch pattern. Required for the
// regenerate-phrase endpoint (requireAdmin — it costs TTS, D3).
const { getAccessToken } = useAuth();
const authedFetch = async (path: string, init: RequestInit = {}): Promise<Response> => {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    'ngrok-skip-browser-warning': 'true',
    'Content-Type': 'application/json',
    ...((init.headers as Record<string, string>) || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${getApiBaseUrl()}${path}`, { ...init, headers });
};

// Computed
const totalSeeds = computed(() => totalSeedsInCourse.value || seeds.value.length);
const loadedSeeds = computed(() => seeds.value.length);

// Seed View pagination (server-side via filter range)
const seedPageSize = 50;
const seedPageStart = computed(() => {
  const n = parseInt(filterSeedStart.value.replace(/\D/g, ''));
  return isNaN(n) ? 1 : n;
});
const seedPageEnd = computed(() => {
  const n = parseInt(filterSeedEnd.value.replace(/\D/g, ''));
  return isNaN(n) ? seedPageSize : Math.min(n, totalSeeds.value);
});
const formatSeedNum = (n: number) => 'S' + String(n).padStart(4, '0');
const prevSeedPage = () => {
  const newStart = Math.max(1, seedPageStart.value - seedPageSize);
  const newEnd = newStart + seedPageSize - 1;
  filterSeedStart.value = formatSeedNum(newStart);
  filterSeedEnd.value = formatSeedNum(newEnd);
  loadCourseData(filterSeedStart.value, filterSeedEnd.value);
};
const nextSeedPage = () => {
  const newStart = seedPageEnd.value + 1;
  const newEnd = Math.min(newStart + seedPageSize - 1, totalSeeds.value);
  if (newStart <= totalSeeds.value) {
    filterSeedStart.value = formatSeedNum(newStart);
    filterSeedEnd.value = formatSeedNum(newEnd);
    loadCourseData(filterSeedStart.value, filterSeedEnd.value);
  }
};

const totalPhrases = computed(() => {
  return seeds.value.reduce((total, seed) => {
    const introCount = seed.introduction_phrases.length;
    const legoCount = seed.legos.reduce((sum, lego) => sum + lego.phrases.length, 0);
    return total + introCount + legoCount;
  }, 0);
});

const filteredSeeds = computed(() => {
  let result = seeds.value;

  // Filter by status
  if (filterStatus.value !== 'all') {
    result = result.filter(seed => {
      // Check if any phrase in this seed matches the status filter
      const hasMatchingStatus = (phrases: PhraseRowData[]) => {
        if (filterStatus.value === 'flagged') {
          return phrases.some(p => p.is_flagged);
        }
        return phrases.some(p => p.flag_status === filterStatus.value);
      };

      const introMatches = hasMatchingStatus(seed.introduction_phrases);
      const legoMatches = seed.legos.some(lego => hasMatchingStatus(lego.phrases));

      return introMatches || legoMatches;
    });
  }

  // Note: Seed range filtering is now done server-side via API params
  // No need to filter by range here since seeds are already pre-filtered

  // Filter by search text
  if (filterSearchText.value) {
    const searchLower = filterSearchText.value.toLowerCase();
    result = result.filter(seed => {
      const seedMatches = (seed.target_text?.toLowerCase() || '').includes(searchLower)
        || (seed.known_text?.toLowerCase() || '').includes(searchLower);

      const phraseMatches = (phrases: PhraseRowData[]) => {
        return phrases.some(p =>
          (p.target_text?.toLowerCase() || '').includes(searchLower)
          || (p.known_text?.toLowerCase() || '').includes(searchLower)
        );
      };

      const introMatches = phraseMatches(seed.introduction_phrases);
      const legoMatches = seed.legos.some(lego => phraseMatches(lego.phrases));

      return seedMatches || introMatches || legoMatches;
    });
  }

  // Filter flagged only
  if (filterFlaggedOnly.value) {
    result = result.filter(seed => {
      const hasFlags = (phrases: PhraseRowData[]) => phrases.some(p => p.is_flagged);
      const introFlags = hasFlags(seed.introduction_phrases);
      const legoFlags = seed.legos.some(lego => hasFlags(lego.phrases));
      return introFlags || legoFlags;
    });
  }

  return result;
});

const visibleSeeds = computed(() => {
  return filteredSeeds.value.slice(0, visibleSeedCount.value);
});

// Flat list of flagged audio items for "Flagged Only" view
interface FlaggedItem {
  uuid: string;
  seedId: string;
  legoId: string;
  phraseId: string;
  track: 'known' | 'target1' | 'target2';
  text: string;
  status: string;
  notes?: string;
  flaggedAt?: string;
  flaggedBy?: string;
}

// Direct flagged items from fast endpoint (bypasses seed loading)
const directFlaggedItems = ref<FlaggedItem[]>([]);

const orphanedFlagCount = computed(() => {
  return directFlaggedItems.value.filter(item => item.phraseId === '?').length;
});

const isDeletingOrphans = ref(false);

async function deleteOrphanedFlags() {
  isDeletingOrphans.value = true;
  try {
    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/api/production/${courseCode.value}/audio-flags/delete-orphaned`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }
    });
    if (!response.ok) throw new Error('Failed to delete orphaned flags');
    const result = await response.json();
    // Reload flagged items
    directFlaggedItems.value = directFlaggedItems.value.filter(item => item.phraseId !== '?');
  } catch (error) {
    console.error('Error deleting orphaned flags:', error);
  } finally {
    isDeletingOrphans.value = false;
  }
}

const flatFlaggedItems = computed((): FlaggedItem[] => {
  // If we have direct items from the fast endpoint, use those
  if (directFlaggedItems.value.length > 0) {
    return directFlaggedItems.value;
  }

  // Fallback: derive from loaded seeds (used in non-flagged mode)
  const items: FlaggedItem[] = [];

  seeds.value.forEach(seed => {
    seed.legos.forEach(lego => {
      lego.phrases.forEach(phrase => {
        if (phrase.known_flag?.status === 'flagged' && phrase.known_audio_uuid) {
          items.push({
            uuid: phrase.known_audio_uuid,
            seedId: seed.seed_id,
            legoId: lego.lego_id,
            phraseId: phrase.phrase_id,
            track: 'known',
            text: phrase.known_text,
            status: phrase.known_flag.status,
            notes: phrase.known_flag.notes,
            flaggedAt: phrase.known_flag.flagged_at,
            flaggedBy: phrase.known_flag.flagged_by,
          });
        }
        if (phrase.target1_flag?.status === 'flagged' && phrase.target1_audio_uuid) {
          items.push({
            uuid: phrase.target1_audio_uuid,
            seedId: seed.seed_id,
            legoId: lego.lego_id,
            phraseId: phrase.phrase_id,
            track: 'target1',
            text: phrase.target_text,
            status: phrase.target1_flag.status,
            notes: phrase.target1_flag.notes,
            flaggedAt: phrase.target1_flag.flagged_at,
            flaggedBy: phrase.target1_flag.flagged_by,
          });
        }
        if (phrase.target2_flag?.status === 'flagged' && phrase.target2_audio_uuid) {
          items.push({
            uuid: phrase.target2_audio_uuid,
            seedId: seed.seed_id,
            legoId: lego.lego_id,
            phraseId: phrase.phrase_id,
            track: 'target2',
            text: phrase.target_text,
            status: phrase.target2_flag.status,
            notes: phrase.target2_flag.notes,
            flaggedAt: phrase.target2_flag.flagged_at,
            flaggedBy: phrase.target2_flag.flagged_by,
          });
        }
      });
    });
  });

  // Deduplicate by UUID — same audio file can appear on multiple phrases
  const seen = new Set<string>();
  return items.filter(item => {
    if (seen.has(item.uuid)) return false;
    seen.add(item.uuid);
    return true;
  });
});

// Keyboard Shortcuts
const keyboardShortcuts: KeyboardShortcut[] = [
  { key: 'Space', description: 'Play/Pause audio', action: () => {/* handled by audio player */} },
  { key: 'F', description: 'Flag selected sample', action: () => {/* TODO: implement */} },
  { key: 'Esc', description: 'Close modals', action: () => { closeFlagModal(); closePhraseEditModal(); showShortcutsHelp.value = false; showDeleteConfirmModal.value = false; } },
  { key: '?', description: 'Show keyboard shortcuts', action: () => { showShortcutsHelp.value = !showShortcutsHelp.value; } },
];

// Methods
const CHUNK_SIZE = 10; // Load 10 seeds at a time to keep queries fast

const loadCourseData = async (seedStart?: string, seedEnd?: string) => {
  isLoading.value = true;
  error.value = null;
  loadingProgress.value = '';

  // Use provided values or current filter values
  const start = seedStart ?? filterSeedStart.value;
  const end = seedEnd ?? filterSeedEnd.value;

  try {
    const apiBaseUrl = getApiBaseUrl();

    if (filterFlaggedOnly.value) {
      // Fast path: use dedicated flagged-items endpoint instead of loading all seeds
      const flagUrl = `${apiBaseUrl}/api/production/${courseCode.value}/flagged-items`;
      const flagResponse = await fetch(flagUrl, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      if (!flagResponse.ok) throw new Error('Failed to load flagged items');
      const flagData = await flagResponse.json();
      directFlaggedItems.value = flagData.items || [];
      seeds.value = [];
    } else {
      directFlaggedItems.value = [];
      seeds.value = []; // Clear before progressive load

      const startNum = parseInt((start || 'S0001').replace(/\D/g, '')) || 1;
      const endNum = parseInt((end || 'S0050').replace(/\D/g, '')) || 50;

      // Load in chunks of CHUNK_SIZE, appending results as they arrive
      for (let chunkStart = startNum; chunkStart <= endNum; chunkStart += CHUNK_SIZE) {
        const chunkEnd = Math.min(chunkStart + CHUNK_SIZE - 1, endNum);
        const chunkStartStr = 'S' + String(chunkStart).padStart(4, '0');
        const chunkEndStr = 'S' + String(chunkEnd).padStart(4, '0');

        loadingProgress.value = `Loading seeds ${chunkStart}–${chunkEnd}...`;

        const params = new URLSearchParams();
        params.set('seedStart', chunkStartStr);
        params.set('seedEnd', chunkEndStr);

        const url = `${apiBaseUrl}/api/production/${courseCode.value}/script-view?${params.toString()}`;

        const response = await fetch(url, {
          headers: { 'ngrok-skip-browser-warning': 'true' },
          signal: AbortSignal.timeout(60000) // 60s per chunk (not 5 min for everything)
        });

        if (!response.ok) {
          console.warn(`Failed to load chunk ${chunkStartStr}-${chunkEndStr}, skipping`);
          continue;
        }

        const data = await response.json();
        const chunkSeeds = transformScriptViewToSeeds(data);

        // Append to existing seeds (progressive update)
        seeds.value = [...seeds.value, ...chunkSeeds];

        // Store total from first chunk's pagination
        if (data.pagination && !totalSeedsInCourse.value) {
          totalSeedsInCourse.value = data.pagination.total;
        }
      }

      lastLoadedRange.value = { start, end };
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unknown error occurred';
    console.error('Error loading course data:', err);
  } finally {
    isLoading.value = false;
    loadingProgress.value = '';
  }
};

// Load learning journey data (server-side pagination, 50 LEGOs per page)
const loadLearningJourney = async () => {
  isLoadingJourney.value = true;
  journeyError.value = null;

  try {
    const apiBaseUrl = getApiBaseUrl();
    const url = `${apiBaseUrl}/api/production/${courseCode.value}/learning-journey?maxLegos=${journeyPageSize}&offset=${journeyOffset.value}`;

    const response = await fetch(url, {
      headers: {
        'ngrok-skip-browser-warning': 'true'
      }
    });

    if (!response.ok) throw new Error('Failed to load learning journey');

    const data = await response.json();
    learningJourneyData.value = {
      rounds: data.rounds || [],
      allItems: data.allItems || [],
      stats: data.stats || null,
      totalLegoCount: data.totalLegoCount || 0,
    };

    // Detect if there are more pages
    journeyHasMore.value = (data.pagination?.returned || 0) >= journeyPageSize;

    // Load existing audio flags to show flagged state in journey view
    loadAudioFlags();
  } catch (err) {
    journeyError.value = err instanceof Error ? err.message : 'Unknown error occurred';
    console.error('Error loading learning journey:', err);
  } finally {
    isLoadingJourney.value = false;
  }
};

// Toggle between script view and learning journey view
const toggleViewMode = () => {
  if (viewMode.value === 'script') {
    viewMode.value = 'journey';
    if (!learningJourneyData.value) {
      journeyOffset.value = 0;
      loadLearningJourney();
    } else {
      // Refresh flags in case they changed while in script view
      loadAudioFlags();
    }
  } else {
    viewMode.value = 'script';
  }
};

// Reload learning journey
const reloadLearningJourney = () => {
  loadLearningJourney();
};

// Transform new /script-view endpoint data into SeedRowData format
const transformScriptViewToSeeds = (data: any): SeedRowData[] => {
  if (!data || !data.seeds) return [];

  return data.seeds.map((seed: any) => {
    // Transform LEGOs
    const legos = (seed.legos || []).map((lego: any) => {
      // Transform phrases
      const phrases: PhraseRowData[] = (lego.phrases || []).map((phrase: any) => {
        return {
          phrase_id: phrase.id,
          type: 'PRAC' as any, // All practice phrases for QA
          known_text: phrase.known_text,
          target_text: phrase.target_text,
          // Audio UUIDs from script-view (for direct S3 playback)
          known_audio_uuid: phrase.known_audio_uuid || null,
          target1_audio_uuid: phrase.target1_audio_uuid || null,
          target2_audio_uuid: phrase.target2_audio_uuid || null,
          // S3 keys for v13 audio URLs
          known_s3_key: phrase.known_s3_key || null,
          target1_s3_key: phrase.target1_s3_key || null,
          target2_s3_key: phrase.target2_s3_key || null,
          // Flag status from database
          is_flagged: phrase.is_flagged || false,
          known_flag: phrase.known_flag || null,
          target1_flag: phrase.target1_flag || null,
          target2_flag: phrase.target2_flag || null,
          seed_id: seed.seed_id,
          cycle_index: phrase.position,
          word_count: phrase.word_count,
          lego_count: phrase.lego_count,
          introduce: phrase.introduce,
        };
      });

      // Sort by target text character length (shortest first = DEBUT-like, longest = ETERNAL-like)
      phrases.sort((a, b) => a.target_text.length - b.target_text.length);

      return {
        lego_id: lego.lego_id,
        type: lego.type,
        target: lego.target_text,
        known: lego.known_text,
        is_new: lego.is_new ?? false,
        phrases,
        expanded: false,
      };
    });

    return {
      seed_id: seed.seed_id,
      known_text: seed.known_text,
      target_text: seed.target_text,
      legos,
      introduction_phrases: [], // Introduction phrases are now part of LEGOs
      expanded: false,
    };
  });
};

// Legacy transform function for manifest format (kept for backwards compatibility)
const transformManifestToSeeds = (manifest: any): SeedRowData[] => {
  if (!manifest || !manifest.seeds) return [];

  return manifest.seeds.map((seed: any) => {
    // Extract introduction cycles (type === 'introduction')
    const introductionCycles = seed.cycles?.filter((c: any) => c.type === 'introduction') || [];
    const introduction_phrases: PhraseRowData[] = introductionCycles.map((cycle: any, idx: number) => ({
      phrase_id: cycle.uuid,
      type: 'ETER' as any,
      known_text: cycle.known,
      target_text: cycle.target,
      known_audio: {
        uuid: cycle.known_audio_uuid,
        text: cycle.known,
        role: 'source' as any,
        cadence: 'natural' as any,
        voice_id: '',
      },
      target_audio_1: {
        uuid: cycle.target_audio_uuid,
        text: cycle.target,
        role: 'target' as any,
        cadence: 'natural' as any,
        voice_id: '',
      },
      is_flagged: false,
      seed_id: seed.seed_id,
      cycle_index: idx,
    }));

    // Build legos with their phrases
    const legos = (seed.legos || []).map((lego: any) => {
      // Get all cycles for this lego
      const legoCycles = seed.cycles?.filter((c: any) => c.lego_id === lego.id) || [];

      const phrases: PhraseRowData[] = legoCycles.map((cycle: any, idx: number) => {
        // Determine phrase type based on cycle type
        let phraseType = 'PRAC';
        if (cycle.type === 'lego_component') phraseType = 'COMP';
        else if (cycle.type === 'lego_debut') phraseType = 'DEBU';

        return {
          phrase_id: cycle.uuid,
          type: phraseType as any,
          known_text: cycle.known,
          target_text: cycle.target,
          known_audio: {
            uuid: cycle.known_audio_uuid,
            text: cycle.known,
            role: 'source' as any,
            cadence: 'natural' as any,
            voice_id: '',
          },
          target_audio_1: {
            uuid: cycle.target_audio_uuid,
            text: cycle.target,
            role: 'target' as any,
            cadence: 'natural' as any,
            voice_id: '',
          },
          is_flagged: false,
          seed_id: seed.seed_id,
          cycle_index: idx,
          is_debut: cycle.context?.is_debut,
          is_component: cycle.context?.is_component,
        };
      });

      return {
        lego_id: lego.id,
        type: lego.type,
        target: lego.target,
        known: lego.known,
        is_new: lego.is_new ?? false,
        phrases,
        expanded: false,
      };
    });

    return {
      seed_id: seed.seed_id,
      known_text: seed.seed_pair[1], // second element is known
      target_text: seed.seed_pair[0], // first element is target
      legos,
      introduction_phrases,
      expanded: false,
    };
  });
};

const toggleSeed = (seedId: string) => {
  const seed = seeds.value.find(s => s.seed_id === seedId);
  if (seed) {
    seed.expanded = !seed.expanded;
  }
};

const toggleLego = (legoId: string) => {
  seeds.value.forEach(seed => {
    const lego = seed.legos.find(l => l.lego_id === legoId);
    if (lego) {
      lego.expanded = !lego.expanded;
    }
  });
};

const collapseAll = () => {
  seeds.value.forEach(seed => {
    seed.expanded = false;
    seed.legos.forEach(lego => {
      lego.expanded = false;
    });
  });
};

const expandAll = () => {
  seeds.value.forEach(seed => {
    seed.expanded = true;
    seed.legos.forEach(lego => {
      lego.expanded = true;
    });
  });
};

const loadMoreSeeds = () => {
  visibleSeedCount.value += 50;
};

const onFilterChange = () => {
  // Reset pagination when filters change
  visibleSeedCount.value = 50;

  // Check if seed range changed - if so, reload from server
  const rangeChanged = lastLoadedRange.value.start !== filterSeedStart.value
    || lastLoadedRange.value.end !== filterSeedEnd.value;

  if (rangeChanged) {
    loadCourseData(filterSeedStart.value, filterSeedEnd.value);
  }
};

const clearFilters = () => {
  filterStatus.value = 'all';
  filterSeedStart.value = '';
  filterSeedEnd.value = '';
  filterSearchText.value = '';
  filterFlaggedOnly.value = false;
};

const playAudioSample = (sample: AudioSample) => {
  currentPlayingSample.value = sample;
};

// Play flagged item audio
const playFlaggedItem = async (item: FlaggedItem) => {
  console.log('[playFlaggedItem] Called with item:', item);
  try {
    const apiBaseUrl = getApiBaseUrl();
    const url = `${apiBaseUrl}/api/production/${courseCode.value}/audio/${item.uuid}/url`;
    console.log('[playFlaggedItem] Fetching audio URL from:', url);

    const response = await fetch(url, { headers: { 'ngrok-skip-browser-warning': 'true' } });
    if (!response.ok) throw new Error(`Failed to get audio URL: ${response.status}`);
    const data = await response.json();

    console.log('[playFlaggedItem] Got audio URL:', data.url?.substring(0, 100) + '...');

    currentPlayingSample.value = {
      uuid: item.uuid,
      text: item.text,
      role: item.track as any,
      cadence: 'natural' as any,
      voice_id: '',
      url: data.url,
    };
  } catch (err) {
    console.error('[playFlaggedItem] Error:', err);
  }
};

// Edit flagged item - find the phrase and open edit modal
const editFlaggedItem = (item: FlaggedItem) => {
  // Find the phrase in the seeds data
  for (const seed of seeds.value) {
    for (const lego of seed.legos) {
      const phrase = lego.phrases.find(p => p.phrase_id === item.phraseId);
      if (phrase) {
        openPhraseEditModal(phrase);
        return;
      }
    }
  }
  console.warn(`Could not find phrase ${item.phraseId} for editing`);
};

// Unflag/clear flag from item
const unflagItem = async (item: FlaggedItem) => {
  try {
    const apiBaseUrl = getApiBaseUrl();
    // Delete the flag using new audio-flags endpoint
    const response = await fetch(`${apiBaseUrl}/api/production/${courseCode.value}/audio-flags/${item.uuid}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      }
    });

    if (!response.ok) throw new Error('Failed to clear flag');

    // Update local state — remove from direct list or clear from seed data
    if (directFlaggedItems.value.length > 0) {
      directFlaggedItems.value = directFlaggedItems.value.filter(i => i.uuid !== item.uuid);
    } else {
      const audioUuidKey = `${item.track}_audio_uuid` as 'known_audio_uuid' | 'target1_audio_uuid' | 'target2_audio_uuid';
      const flagKey = `${item.track}_flag` as 'known_flag' | 'target1_flag' | 'target2_flag';
      for (const seed of seeds.value) {
        for (const lego of seed.legos) {
          for (const phrase of lego.phrases) {
            if ((phrase as any)[audioUuidKey] === item.uuid) {
              (phrase as any)[flagKey] = null;
            }
          }
        }
      }
    }
    console.log(`Cleared flag for ${item.uuid}`);
  } catch (err) {
    console.error('Error clearing flag:', err);
  }
};

const pauseAudio = () => {
  // Audio player handles pause internally
};

const closePlaybackBar = () => {
  currentPlayingSample.value = null;
};

const onPlaybackEnded = () => {
  // Keep playback bar visible after audio ends
  // User can manually close it
};

const onPlaybackError = (error: Error) => {
  console.error('Playback error:', error);
  // TODO: Show error toast
};

const openFlagModal = (phrase: PhraseRowData) => {
  selectedPhrase.value = phrase;
  // Create a synthetic AudioSample from the phrase's audio UUID
  // Use target1 audio as the primary sample to flag
  const uuid = phrase.target1_audio_uuid || phrase.known_audio_uuid || phrase.phrase_id;
  selectedSample.value = {
    uuid,
    text: phrase.target_text,
    role: 'target1' as any,
    cadence: 'natural' as any,
    voice_id: '',
  };
  flagModalVisible.value = true;
};

const closeFlagModal = () => {
  flagModalVisible.value = false;
  selectedSample.value = null;
  selectedPhrase.value = null;
};

// Audio track type
type AudioTrack = 'known' | 'target1' | 'target2';

// Handle per-audio flagging from PhraseRow (toggle: flag if not flagged, unflag if flagged)
const handleAudioFlag = async (phrase: PhraseRowData, track: AudioTrack, uuid: string) => {
  // Check if this track is currently flagged
  const flagKey = `${track}_flag` as 'known_flag' | 'target1_flag' | 'target2_flag';
  const currentFlag = phrase[flagKey];
  const isCurrentlyMarked = currentFlag?.status === 'flagged';

  const action = isCurrentlyMarked ? 'Clearing' : 'Marking for regen';
  console.log(`${action}: ${track} (${uuid}) for phrase ${phrase.phrase_id}`);

  try {
    const apiBaseUrl = getApiBaseUrl();

    if (isCurrentlyMarked) {
      // Delete the flag using new audio-flags endpoint (user is happy with audio)
      const response = await fetch(`${apiBaseUrl}/api/production/${courseCode.value}/audio-flags/${uuid}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete flag: ${response.statusText}`);
      }

      // Clear local state
      (phrase as any)[flagKey] = null;
    } else {
      // Create/update flag using new audio-flags endpoint
      const response = await fetch(`${apiBaseUrl}/api/production/${courseCode.value}/audio-flags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({
          audio_uuid: uuid,
          status: 'flagged',
          reason: `Marked ${track} audio for regeneration`,
          flagged_by: 'dashboard_user'
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Failed to update flag: ${errText}`);
      }

      // Set local state
      (phrase as any)[flagKey] = { status: 'flagged', notes: `Marked ${track} audio for regeneration` };
    }

    // Update is_flagged based on any flagged audio
    const isFlagged = (flag: any) => flag?.status === 'flagged';
    phrase.is_flagged = isFlagged(phrase.known_flag) || isFlagged(phrase.target1_flag) || isFlagged(phrase.target2_flag);

    console.log(`Successfully ${isCurrentlyMarked ? 'cleared' : 'marked for regen'} ${track} audio for phrase ${phrase.phrase_id}`);

  } catch (err) {
    console.error('Error updating flag:', err);
  }
};

// Phrase Edit Modal Methods
const openPhraseEditModal = (phrase: PhraseRowData) => {
  phraseEditMode.value = 'phrase';
  phraseToEdit.value = {
    id: phrase.phrase_id,
    known_text: phrase.known_text,
    target_text: phrase.target_text,
    known_audio_uuid: phrase.known_audio_uuid,
    target1_audio_uuid: phrase.target1_audio_uuid,
    target2_audio_uuid: phrase.target2_audio_uuid,
    // Live seed-grid row → rebind audio pointers in-place after regen.
    sourceItem: phrase,
  };
  phraseEditModalVisible.value = true;
};

const closePhraseEditModal = () => {
  phraseEditModalVisible.value = false;
  phraseToEdit.value = null;
};

// Handle phrase deletion
const handlePhraseDelete = async (phrase: PhraseRowData) => {
  // Confirm deletion
  if (!confirm(`Delete phrase: "${phrase.known_text}" / "${phrase.target_text}"?\n\nThis will remove the phrase from the course. Audio files will NOT be deleted.`)) {
    return;
  }

  try {
    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/api/production/${courseCode.value}/phrases/${phrase.phrase_id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to delete phrase: ${response.statusText}`);
    }

    // Reload data to reflect the deletion
    await loadCourseData();
  } catch (err) {
    console.error('Error deleting phrase:', err);
    alert('Failed to delete phrase. Please try again.');
  }
};

// RegenFlags type for per-audio regeneration
interface RegenFlags {
  known: boolean;
  target1: boolean;
  target2: boolean;
}

// Fetch a signed audition URL for a freshly-minted audio uuid (verbatim
// reuse of the savePresentationAndRegen audition snippet, ~2382-2395).
const fetchAuditionUrl = async (audioUuid: string): Promise<string | null> => {
  try {
    const urlResp = await fetch(
      `${getApiBaseUrl()}/api/production/${courseCode.value}/audio/${audioUuid}/url`,
      { headers: { 'ngrok-skip-browser-warning': 'true' } }
    );
    if (urlResp.ok) {
      const urlData = await urlResp.json();
      return urlData.url || null;
    }
  } catch (e) {
    // Non-fatal: regen succeeded, just couldn't fetch the audition URL
  }
  return null;
};

const savePhraseEdit = async (data: { known_text: string; target_text: string; regen_flags: RegenFlags }) => {
  if (!phraseToEdit.value) return;

  // LEGO text (course_legos) is NOT editable — editing is for phrases only.
  // Blocked path: even if 'lego' mode is somehow reached, never PATCH LEGO text.
  if (phraseEditMode.value === 'lego') {
    console.warn('LEGO text editing is disallowed — only phrases are editable.');
    phraseEditModalRef.value?.onSaveComplete(false, 'LEGO text is not editable.');
    return;
  }

  try {
    // Save phrase text changes (course_practice_phrases).
    // (LEGO/intro narration never reaches the regenerate-phrase path — D4 sends
    //  intro/component_intro narration edits through onJourneyPresentationEdit.)
    const response = await authedFetch(
      `/api/production/${courseCode.value}/phrase/${phraseToEdit.value.id}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          known_text: data.known_text,
          target_text: data.target_text,
        })
      }
    );

    if (!response.ok) throw new Error('Failed to save phrase');

    // Update local text state immediately
    const phraseId = phraseToEdit.value.id;
    const applyLocalText = () => {
      seeds.value.forEach(seed => {
        seed.legos.forEach(lego => {
          const phrase = lego.phrases.find(p => p.phrase_id === phraseId);
          if (phrase) {
            phrase.known_text = data.known_text;
            phrase.target_text = data.target_text;
          }
        });
      });
      if (phraseToEdit.value?.sourceItem) {
        phraseToEdit.value.sourceItem.known_text = data.known_text;
        phraseToEdit.value.sourceItem.target_text = data.target_text;
      }
    };
    applyLocalText();

    // ── Phrase mode: OPTIMISTIC auto-approved regen of ONLY the changed role(s) (D2) ──
    // A known_text edit → ['known']; a target_text edit → ['target1','target2']
    // (two voices of the same target text). We honour the modal's checkboxes,
    // which default to the changed role(s).
    const roles: Array<'known' | 'target1' | 'target2'> = [];
    if (data.regen_flags.known && phraseToEdit.value.known_audio_uuid) roles.push('known');
    if (data.regen_flags.target1 && phraseToEdit.value.target1_audio_uuid) roles.push('target1');
    if (data.regen_flags.target2 && phraseToEdit.value.target2_audio_uuid) roles.push('target2');

    // No roles selected → text-only save, no TTS cost. Done.
    if (roles.length === 0) {
      phraseEditModalRef.value?.onSaveComplete(true);
      if (viewMode.value === 'journey') reloadLearningJourney();
      return;
    }

    // Tell the modal which roles are regenerating (inline audition spinners)
    phraseEditModalRef.value?.beginAudition(roles);
    phraseEditModalRef.value?.onSaveComplete(true);

    // Admin-only endpoint (it costs TTS, D3). TTSes the NEW text, mints a fresh
    // UUID/S3 key per role, rebinds the phrase pointer, returns fresh *_audio_id.
    // CRITICAL: a TEXT edit must use regenerate-PHRASE, never regenerate-single
    // (which re-reads stale course_audio.text → audio/text desync).
    const regenResp = await authedFetch(
      `/api/audio/regenerate-phrase/${courseCode.value}/${encodeURIComponent(phraseId)}`,
      {
        method: 'POST',
        body: JSON.stringify({
          known_text: data.known_text,
          target_text: data.target_text,
          roles,
        }),
      }
    );

    if (!regenResp.ok) {
      const errBody = await regenResp.json().catch(() => ({}));
      const msg = errBody.error || `Regeneration failed (${regenResp.status})`;
      roles.forEach(r => phraseEditModalRef.value?.setAuditionError(r, msg));
      throw new Error(msg);
    }

    // Response: { known_audio_id, target1_audio_id, target2_audio_id, durations:{role:ms} }
    // Only regenerated roles carry fresh ids; HTTP 200 == success (no `success` field).
    const result = await regenResp.json();
    const REGEN_FIELDS = {
      known: { column: 'known_audio_id', uuidField: 'known_audio_uuid' },
      target1: { column: 'target1_audio_id', uuidField: 'target1_audio_uuid' },
      target2: { column: 'target2_audio_id', uuidField: 'target2_audio_uuid' },
    } as const;

    // Rebind the live row's *_audio_uuid pointers + audition each regenerated role.
    for (const role of roles) {
      const { column, uuidField } = REGEN_FIELDS[role];
      const newUuid: string | null = result[column] ?? null;

      // Rebind on the modal's working copy + the live source item (journey/seed row)
      if (phraseToEdit.value) (phraseToEdit.value as any)[uuidField] = newUuid;
      if (phraseToEdit.value?.sourceItem) phraseToEdit.value.sourceItem[uuidField] = newUuid;

      const durationMs: number | null = result.durations?.[role] ?? null;
      if (newUuid) {
        const url = await fetchAuditionUrl(newUuid);
        phraseEditModalRef.value?.setAuditionResult(role, { url, durationMs });
      } else {
        phraseEditModalRef.value?.setAuditionError(role, 'No audio returned for this role');
      }
    }

    console.log(`Regenerated phrase ${phraseId} roles [${roles.join(', ')}] → fresh audio`);

    // Refresh the journey so rows pick up the rebound audio on next load.
    if (viewMode.value === 'journey') reloadLearningJourney();
  } catch (err) {
    console.error('Error saving phrase:', err);
    phraseEditModalRef.value?.onSaveComplete(false, err instanceof Error ? err.message : 'Save failed');
  }
};

// Journey view: item edit handler
const onJourneyItemEdit = (item: any) => {
  // D4: intro / component_intro narration is NOT phrase-role audio — it lives in
  // course_audio as a presentation clip. Route those edits through the dedicated
  // presentation path (regenerate-presentation), never regenerate-phrase.
  if (item.type === 'intro' || item.type === 'component_intro') {
    onJourneyPresentationEdit(item);
    return;
  }

  // LEGO text (the 'debut' item, stored in course_legos) is NOT editable —
  // editing is for phrases only. Block the edit modal for LEGO-text items.
  if (item.type === 'debut') return;

  phraseEditMode.value = 'phrase';
  phraseToEdit.value = {
    id: item.phrase_id,
    known_text: item.known_text,
    target_text: item.target_text,
    known_audio_uuid: item.known_audio_uuid,
    target1_audio_uuid: item.target1_audio_uuid,
    target2_audio_uuid: item.target2_audio_uuid,
    // Keep a handle on the live journey row so regen can rebind its audio
    // pointers in-place (reactive) without waiting for a full reload.
    sourceItem: item,
  };
  phraseEditModalVisible.value = true;
};

// =========================================================================
// Presentation (intro narration) edit + surgical per-LEGO regen
// =========================================================================
const presentationModalVisible = ref(false);
const presentationLegoId = ref<string>('');
const presentationKnownText = ref<string>('');
const presentationTargetText = ref<string>('');
const presentationText = ref<string>('');
const presentationLoading = ref(false);
const presentationBusy = ref(false);
const presentationError = ref<string | null>(null);
const presentationResult = ref<{ audio_id: string; duration_ms: number; created: boolean } | null>(null);
const presentationAudioUrl = ref<string | null>(null);

const onJourneyPresentationEdit = async (item: any) => {
  const legoId = item.legoId || item.lego_id;
  if (!legoId) return;
  presentationLegoId.value = legoId;
  presentationKnownText.value = item.known_text || '';
  presentationTargetText.value = item.target_text || '';
  presentationText.value = '';
  presentationError.value = null;
  presentationResult.value = null;
  presentationAudioUrl.value = null;
  presentationModalVisible.value = true;
  presentationLoading.value = true;

  // Fetch the current authoritative presentation text (course_audio.text)
  try {
    const apiBaseUrl = getApiBaseUrl();
    const resp = await fetch(
      `${apiBaseUrl}/api/production/${courseCode.value}/presentation/${encodeURIComponent(legoId)}`,
      { headers: { 'ngrok-skip-browser-warning': 'true' } }
    );
    if (resp.ok) {
      const data = await resp.json();
      presentationText.value = data.text || '';
    }
  } catch (err) {
    console.error('Failed to load presentation text:', err);
  } finally {
    presentationLoading.value = false;
  }
};

const closePresentationModal = () => {
  presentationModalVisible.value = false;
};

const savePresentationAndRegen = async () => {
  if (presentationBusy.value || !presentationText.value.trim()) return;
  presentationBusy.value = true;
  presentationError.value = null;
  presentationResult.value = null;
  presentationAudioUrl.value = null;

  try {
    const apiBaseUrl = getApiBaseUrl();
    const resp = await fetch(
      `${apiBaseUrl}/api/audio/regenerate-presentation/${courseCode.value}/${encodeURIComponent(presentationLegoId.value)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ text: presentationText.value.trim() }),
      }
    );
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error || `Regeneration failed (${resp.status})`);
    }
    const result = await resp.json();
    presentationResult.value = {
      audio_id: result.audio_id,
      duration_ms: result.duration_ms,
      created: !!result.created,
    };

    // Fetch a signed URL so the reviewer can audition the fresh clip
    if (result.audio_id) {
      try {
        const urlResp = await fetch(
          `${apiBaseUrl}/api/production/${courseCode.value}/audio/${result.audio_id}/url`,
          { headers: { 'ngrok-skip-browser-warning': 'true' } }
        );
        if (urlResp.ok) {
          const urlData = await urlResp.json();
          presentationAudioUrl.value = urlData.url || null;
        }
      } catch (e) {
        // Non-fatal: regen succeeded, just couldn't fetch audition URL
      }
    }

    console.log(`Regenerated presentation for ${presentationLegoId.value} → audio ${result.audio_id} (${result.duration_ms}ms)`);
    // Refresh the journey so the intro item picks up the new audio
    reloadLearningJourney();
  } catch (err) {
    console.error('Presentation regen failed:', err);
    presentationError.value = err instanceof Error ? err.message : 'Regeneration failed';
  } finally {
    presentationBusy.value = false;
  }
};

// Flagged audio UUID tracking for journey view
const flaggedAudioUuids = ref<Set<string>>(new Set());

// Load existing audio flags from server
const loadAudioFlags = async () => {
  try {
    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/api/production/${courseCode.value}/audio-flags`, {
      headers: { 'ngrok-skip-browser-warning': 'true' },
    });
    if (!response.ok) return;
    const data = await response.json();
    const uuids = (data.flags || [])
      .filter((f: any) => f.status === 'flagged')
      .map((f: any) => f.audio_uuid);
    flaggedAudioUuids.value = new Set(uuids);
  } catch (err) {
    console.error('Error loading audio flags:', err);
  }
};
const regeneratingAudioUuids = ref<Set<string>>(new Set());

// Journey view: toggle audio flag handler (flag if not flagged, unflag if flagged)
const onJourneyAudioFlag = async (item: any, track: 'target1' | 'target2') => {
  const uuid = track === 'target1' ? item.target1_audio_uuid : item.target2_audio_uuid;
  if (!uuid) return;

  const isCurrentlyFlagged = flaggedAudioUuids.value.has(uuid);

  try {
    const apiBaseUrl = getApiBaseUrl();

    if (isCurrentlyFlagged) {
      // Unflag: DELETE the flag
      await fetch(`${apiBaseUrl}/api/production/${courseCode.value}/audio-flags/${uuid}`, {
        method: 'DELETE',
        headers: { 'ngrok-skip-browser-warning': 'true' },
      });
      flaggedAudioUuids.value = new Set([...flaggedAudioUuids.value].filter(id => id !== uuid));
      console.log(`Unflagged ${track} audio ${uuid}`);
    } else {
      // Flag: POST new flag
      await fetch(`${apiBaseUrl}/api/production/${courseCode.value}/audio-flags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({
          audio_uuid: uuid,
          status: 'flagged',
          reason: `Quick-flagged ${track} from journey view`,
          flagged_by: 'dashboard_user'
        })
      });
      flaggedAudioUuids.value = new Set([...flaggedAudioUuids.value, uuid]);
      console.log(`Flagged ${track} audio ${uuid}`);
    }
  } catch (err) {
    console.error('Error toggling audio flag:', err);
  }
};

// Journey view: inline regenerate single audio
const onJourneyAudioRegen = async (item: any, track: 'target1' | 'target2', audioUuid: string) => {
  if (!audioUuid || regeneratingAudioUuids.value.has(audioUuid)) return;

  // Mark as regenerating
  regeneratingAudioUuids.value = new Set([...regeneratingAudioUuids.value, audioUuid]);

  try {
    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(`${apiBaseUrl}/api/audio/regenerate-single/${courseCode.value}/${audioUuid}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Regeneration failed');
    }

    const result = await response.json();
    console.log(`Regenerated ${track} audio ${audioUuid} → ${result.newS3Key} (${result.durationMs}ms, attempt #${result.regenCount})`);

    // Invalidate the audio URL cache so the player fetches the new S3 key
    // The signed URL endpoint will now resolve the updated s3_key from course_audio
    // Force a cache-bust by updating the item's duration (triggers reactivity)
    const durationKey = track === 'target1' ? 'target1_duration_ms' : 'target2_duration_ms';
    item[durationKey] = result.durationMs;

  } catch (err) {
    console.error('Error regenerating audio:', err);
  } finally {
    regeneratingAudioUuids.value = new Set([...regeneratingAudioUuids.value].filter(id => id !== audioUuid));
  }
};

// Journey view: phrase flagging for deletion
const journeyFlaggedPhraseIds = ref<Set<string>>(new Set());
const showJourneyDeleteStep = ref(0); // 0=hidden, 1=review list, 2=final confirm
const isDeletingJourneyPhrases = ref(false);

const onJourneyPhraseFlag = (item: any) => {
  if (!item.phrase_id) return;
  const newSet = new Set(journeyFlaggedPhraseIds.value);
  if (newSet.has(item.phrase_id)) {
    newSet.delete(item.phrase_id);
  } else {
    newSet.add(item.phrase_id);
  }
  journeyFlaggedPhraseIds.value = newSet;
};

// Build details for the review modal from allItems
const journeyFlaggedPhraseDetails = computed(() => {
  if (!learningJourneyData.value?.allItems) return [];
  return learningJourneyData.value.allItems
    .filter((item: any) => item.phrase_id && journeyFlaggedPhraseIds.value.has(item.phrase_id))
    .map((item: any) => ({ phrase_id: item.phrase_id, known_text: item.known_text, target_text: item.target_text }));
});

const onRemoveJourneyFlaggedPhrase = (phraseId: string) => {
  const newSet = new Set(journeyFlaggedPhraseIds.value);
  newSet.delete(phraseId);
  journeyFlaggedPhraseIds.value = newSet;
  if (newSet.size === 0) showJourneyDeleteStep.value = 0;
};

const handleJourneyBatchDelete = async () => {
  if (journeyFlaggedPhraseIds.value.size === 0) return;
  isDeletingJourneyPhrases.value = true;
  const apiBaseUrl = getApiBaseUrl();
  try {
    const phraseIds = Array.from(journeyFlaggedPhraseIds.value);
    const response = await fetch(`${apiBaseUrl}/api/production/${courseCode.value}/phrases/batch-delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phraseIds }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to delete phrases');
    }
    console.log(`Successfully deleted ${phraseIds.length} phrases from journey view`);
    journeyFlaggedPhraseIds.value = new Set();
    showJourneyDeleteStep.value = 0;
    reloadLearningJourney();
  } catch (err) {
    console.error('Failed to delete phrases:', err);
    error.value = err instanceof Error ? err.message : 'Failed to delete phrases';
  } finally {
    isDeletingJourneyPhrases.value = false;
  }
};

const submitFlag = async (data: { flagType: FlagType; notes: string }) => {
  if (!selectedSample.value || !selectedPhrase.value) return;

  try {
    const apiBaseUrl = getApiBaseUrl();
    // Use new audio-flags endpoint
    const response = await fetch(`${apiBaseUrl}/api/production/${courseCode.value}/audio-flags`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        audio_uuid: selectedSample.value.uuid,
        status: 'flagged',
        reason: `${data.flagType}: ${data.notes}`,
        flagged_by: 'reviewer',
      })
    });

    if (!response.ok) throw new Error('Failed to submit flag');

    // Update local state
    selectedPhrase.value.is_flagged = true;
    selectedPhrase.value.flag_status = `flagged_${data.flagType}` as SampleStatus;

    // Close modal
    closeFlagModal();

    console.log(`[ScriptViewer] Flag submitted: ${selectedSample.value.uuid} -> flagged_${data.flagType}`);
  } catch (err) {
    console.error('Error submitting flag:', err);
  }
};

// Keyboard event handler
const handleKeydown = (event: KeyboardEvent) => {
  // Ignore if typing in input field
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
    return;
  }

  switch (event.key) {
    case '?':
      event.preventDefault();
      showShortcutsHelp.value = !showShortcutsHelp.value;
      break;
    case 'Escape':
      event.preventDefault();
      closeFlagModal();
      closePhraseEditModal();
      showShortcutsHelp.value = false;
      break;
  }
};

// Reload data when flagged filter changes (needs different seeds from backend)
watch(filterFlaggedOnly, () => {
  loadCourseData();
});

// Lifecycle
onMounted(() => {
  // Check for view query param
  if (route.query.view === 'seed' || route.query.view === 'seed-view') {
    viewMode.value = 'script';
  } else if (route.query.view === 'listening') {
    viewMode.value = 'listening';
  } else if (route.query.view === 'journey' || route.query.view === 'script-view') {
    viewMode.value = 'journey';
  }
  // Load journey data when in journey or listening mode (listening needs stats)
  if (viewMode.value === 'journey' || viewMode.value === 'listening') {
    loadLearningJourney();
  }
  // Check for filter query param (from QA link)
  if (route.query.filter === 'flagged') {
    filterFlaggedOnly.value = true;
  }
  loadCourseData();
  window.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
/* Slide-up transition for playback bar */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}

/* Modal transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

/* Custom scrollbar for script content */
.script-content::-webkit-scrollbar {
  width: 8px;
}

.script-content::-webkit-scrollbar-track {
  background: #1e293b; /* slate-800 */
}

.script-content::-webkit-scrollbar-thumb {
  background: #475569; /* slate-600 */
  border-radius: 4px;
}

.script-content::-webkit-scrollbar-thumb:hover {
  background: #64748b; /* slate-500 */
}
</style>
