<template>
  <div class="audio-pipeline text-slate-100">
    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-6 py-6">
      <!-- Loading State -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-20">
        <div class="relative">
          <div class="w-16 h-16 border-4 border-slate-700 rounded-full"></div>
          <div class="absolute top-0 left-0 w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p class="mt-6 text-slate-400">Loading pipeline data...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-900/20 border border-red-500/30 rounded-xl p-6">
        <div class="flex items-center gap-3 mb-2">
          <div class="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg class="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
          </div>
          <h2 class="text-lg font-semibold text-red-400">Error</h2>
        </div>
        <p class="text-slate-300 ml-13">{{ error }}</p>
      </div>

      <!-- Pipeline View -->
      <div v-else class="space-y-8">

        <!-- LIVE PROGRESS (when active) -->
        <div v-if="audioProgress.active" class="bg-gradient-to-br from-slate-800/80 to-slate-800/40 border border-emerald-500/30 rounded-xl p-6">
          <div class="flex items-center gap-6">
            <!-- Circular Progress -->
            <div class="relative w-28 h-28 flex-shrink-0">
              <svg class="w-28 h-28 transform -rotate-90">
                <circle cx="56" cy="56" r="48" stroke="currentColor" stroke-width="8" fill="none" class="text-slate-700"/>
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
                <h2 class="text-lg font-semibold text-slate-100">
                  {{ audioProgress.operation === 'regenerate-role' ? `Regenerating ${audioProgress.role}` : 'Generating Audio' }}
                </h2>
                <span class="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded-full font-medium">
                  LIVE
                </span>
              </div>

              <!-- Stats Row -->
              <div class="grid grid-cols-4 gap-4">
                <div>
                  <div class="text-2xl font-bold text-slate-100">{{ audioProgress.current }}</div>
                  <div class="text-xs text-slate-500 uppercase tracking-wide">Processed</div>
                </div>
                <div>
                  <div class="text-2xl font-bold text-slate-400">{{ audioProgress.total }}</div>
                  <div class="text-xs text-slate-500 uppercase tracking-wide">Total</div>
                </div>
                <div>
                  <div class="text-2xl font-bold text-emerald-400">{{ audioProgress.success }}</div>
                  <div class="text-xs text-slate-500 uppercase tracking-wide">Success</div>
                </div>
                <div>
                  <div class="text-2xl font-bold" :class="audioProgress.failed > 0 ? 'text-red-400' : 'text-slate-600'">{{ audioProgress.failed }}</div>
                  <div class="text-xs text-slate-500 uppercase tracking-wide">Failed</div>
                </div>
              </div>

              <!-- Current Item -->
              <div v-if="audioProgress.lastItem" class="mt-4 text-sm text-slate-500 truncate">
                Processing: <span class="text-slate-400">{{ audioProgress.lastItem }}...</span>
              </div>
            </div>
          </div>
        </div>

        <!-- VOICE CONFIGURATION Section -->
        <section>
          <div class="flex items-center gap-4 mb-4">
            <h2 class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Voice Configuration</h2>
            <div class="flex-1 h-px bg-slate-700/50"></div>
            <span v-if="voicesConfigured" class="px-2.5 py-1 text-xs bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
              ● Configured
            </span>
            <span v-else class="px-2.5 py-1 text-xs bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20">
              ● Setup Required
            </span>
          </div>

          <div class="bg-gradient-to-br from-slate-800/60 to-slate-800/30 border border-slate-700/50 rounded-xl overflow-hidden">
            <button
              @click="showVoiceConfig = !showVoiceConfig"
              class="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-700/20 transition-colors"
            >
              <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
                  </svg>
                </div>
                <div class="text-left">
                  <div class="font-medium text-slate-100">Configure Voices</div>
                  <div class="text-sm text-slate-400">Select TTS voices for each audio role</div>
                </div>
              </div>
              <svg
                class="w-5 h-5 text-slate-400 transition-transform duration-200"
                :class="{ 'rotate-180': showVoiceConfig }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            </button>
            <div v-show="showVoiceConfig" class="border-t border-slate-700/50">
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
            <h2 class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Audio Generation</h2>
            <div class="flex-1 h-px bg-slate-700/50"></div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <!-- Regenerate by Role Card -->
            <div class="bg-gradient-to-br from-slate-800/60 to-slate-800/30 border border-slate-700/50 rounded-xl p-6">
              <div class="flex items-start justify-between mb-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <svg class="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 class="font-semibold text-slate-100">Regenerate by Role</h3>
                    <p class="text-sm text-slate-400">Replace audio for a specific role</p>
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
                  class="w-full bg-slate-900/50 text-slate-100 px-4 py-3 rounded-lg border border-slate-600/50 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/20 transition-colors"
                >
                  <option value="">Select role...</option>
                  <option value="target1">Target 1 (Primary voice)</option>
                  <option value="target2">Target 2 (Secondary voice)</option>
                  <option value="known">Known (Source language)</option>
                  <option value="presentation">Presentation (Introductions)</option>
                </select>

                <label class="flex items-center gap-3 cursor-pointer group">
                  <div class="relative">
                    <input
                      type="checkbox"
                      v-model="flaggedOnly"
                      class="peer sr-only"
                    />
                    <div class="w-5 h-5 rounded border-2 border-slate-600 peer-checked:border-amber-500 peer-checked:bg-amber-500 transition-colors flex items-center justify-center">
                      <svg class="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                  <span class="text-sm text-slate-300 group-hover:text-slate-100 transition-colors">Regen queue only</span>
                </label>
              </div>

              <!-- Action Buttons -->
              <div class="flex gap-3">
                <button
                  @click="previewRegenerate"
                  :disabled="!regenerateRole || regenerating"
                  class="flex-1 px-4 py-2.5 bg-slate-700/50 hover:bg-slate-700 disabled:bg-slate-800 disabled:text-slate-600 text-slate-200 rounded-lg transition-colors text-sm font-medium"
                >
                  Preview
                </button>
                <button
                  @click="executeRegenerate"
                  :disabled="!regenerateRole || regenerating"
                  class="flex-1 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  {{ regenerating ? 'Working...' : 'Regenerate' }}
                </button>
              </div>

              <!-- Result -->
              <div v-if="regenerateResult" class="mt-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700/30">
                <div class="flex justify-between items-center">
                  <div class="flex items-center gap-2">
                    <div class="w-2 h-2 rounded-full" :class="regenerateResult.error ? 'bg-red-500' : regenerateResult.dryRun ? 'bg-amber-500' : 'bg-emerald-500'"></div>
                    <span class="text-sm font-medium" :class="regenerateResult.error ? 'text-red-400' : regenerateResult.dryRun ? 'text-amber-400' : 'text-emerald-400'">
                      {{ regenerateResult.error ? 'Error' : regenerateResult.dryRun ? 'Preview' : 'Complete' }}
                    </span>
                    <span v-if="regenerateResult.flaggedOnly" class="text-xs text-amber-400">(queue)</span>
                  </div>
                  <div class="text-right">
                    <span class="text-xl font-bold text-slate-100">{{ regenerateResult.count || regenerateResult.total || 0 }}</span>
                    <span class="text-xs text-slate-500 ml-1">items</span>
                  </div>
                </div>
                <div v-if="regenerateResult.voiceId" class="mt-2 text-xs text-slate-400">
                  Voice: <code class="text-emerald-400 bg-slate-800 px-1.5 py-0.5 rounded">{{ regenerateResult.voiceId }}</code>
                </div>
                <div v-if="regenerateResult.error" class="mt-2 text-sm text-red-400">{{ regenerateResult.error }}</div>
                <div v-if="regenerateResult.status === 'completed'" class="mt-2 text-sm text-emerald-400">
                  ✓ {{ regenerateResult.success }} generated, {{ regenerateResult.failed }} failed
                </div>

                <!-- Review Panel for Regenerated Items -->
                <div v-if="regenerateResult.regeneratedItems?.length > 0" class="mt-4 pt-4 border-t border-slate-700/50">
                  <div class="flex items-center justify-between mb-3">
                    <h4 class="text-sm font-medium text-slate-300">Review Regenerated Audio</h4>
                    <span class="text-xs text-slate-500">{{ regenerateResult.regeneratedItems.length }} items</span>
                  </div>
                  <div class="space-y-2 max-h-64 overflow-y-auto">
                    <div
                      v-for="item in regenerateResult.regeneratedItems"
                      :key="item.id"
                      class="flex items-center gap-3 p-2 bg-slate-800/50 rounded-lg border border-slate-700/30"
                    >
                      <!-- Play button (use item.id which is course_audio record ID) -->
                      <button
                        @click="playReviewAudio(item.id)"
                        class="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center hover:bg-emerald-500/20 transition-colors"
                        :class="{ 'bg-emerald-500/30': playingAudioId === item.id }"
                      >
                        <svg v-if="playingAudioId !== item.id" class="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                        <svg v-else class="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                        </svg>
                      </button>
                      <!-- Text -->
                      <div class="flex-1 min-w-0">
                        <p class="text-sm text-slate-200 truncate">{{ item.text }}</p>
                        <p class="text-xs text-slate-500">{{ item.role }}</p>
                      </div>
                      <!-- Done button (happy with this audio, delete flag) -->
                      <button
                        @click="markItemDone(item)"
                        class="px-2 py-1 text-xs bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                        title="Happy with audio - remove from regen queue"
                      >
                        ✓ Done
                      </button>
                    </div>
                  </div>
                  <!-- Bulk actions -->
                  <div class="flex gap-2 mt-3 pt-3 border-t border-slate-700/30">
                    <button
                      @click="markAllDone"
                      class="flex-1 px-3 py-2 text-sm bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                    >
                      ✓ All Done
                    </button>
                    <button
                      @click="clearReviewPanel"
                      class="px-3 py-2 text-sm bg-slate-700/50 text-slate-400 rounded-lg border border-slate-600/30 hover:bg-slate-700 transition-colors"
                      title="Close panel - items stay in regen queue"
                    >
                      Close
                    </button>
                  </div>
                  <p class="text-xs text-slate-500 mt-2 text-center">Not happy? Close and click Regenerate again</p>
                </div>
              </div>
            </div>

            <!-- Generate Presentation Text Card -->
            <div class="bg-gradient-to-br from-slate-800/60 to-slate-800/30 border border-slate-700/50 rounded-xl p-6">
              <div class="flex items-start justify-between mb-4">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                    <svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 class="font-semibold text-slate-100">Presentation Text</h3>
                    <p class="text-sm text-slate-400">Generate LEGO introduction scripts</p>
                  </div>
                </div>
                <span class="px-2 py-0.5 text-xs bg-purple-500/10 text-purple-400 rounded border border-purple-500/20">
                  TEXT
                </span>
              </div>

              <p class="text-sm text-slate-400 mb-4">
                Creates "The [language] for '[known]' is:" pattern for all LEGOs. Target words are played separately.
              </p>

              <!-- Action Buttons -->
              <div class="flex gap-3">
                <button
                  @click="previewPresentations"
                  :disabled="regeneratingPresentations"
                  class="flex-1 px-4 py-2.5 bg-slate-700/50 hover:bg-slate-700 disabled:bg-slate-800 disabled:text-slate-600 text-slate-200 rounded-lg transition-colors text-sm font-medium"
                >
                  Preview
                </button>
                <button
                  @click="executePresentations"
                  :disabled="regeneratingPresentations"
                  class="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  {{ regeneratingPresentations ? 'Working...' : 'Generate' }}
                </button>
              </div>

              <!-- Result -->
              <div v-if="presentationsResult" class="mt-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700/30">
                <div class="flex justify-between items-center">
                  <div class="flex items-center gap-2">
                    <div class="w-2 h-2 rounded-full" :class="presentationsResult.error ? 'bg-red-500' : presentationsResult.dryRun ? 'bg-purple-500' : 'bg-emerald-500'"></div>
                    <span class="text-sm font-medium" :class="presentationsResult.error ? 'text-red-400' : presentationsResult.dryRun ? 'text-purple-400' : 'text-emerald-400'">
                      {{ presentationsResult.error ? 'Error' : presentationsResult.dryRun ? 'Preview' : 'Complete' }}
                    </span>
                  </div>
                  <div class="text-right">
                    <span class="text-xl font-bold text-slate-100">{{ presentationsResult.count || presentationsResult.total || 0 }}</span>
                    <span class="text-xs text-slate-500 ml-1">LEGOs</span>
                  </div>
                </div>
                <div v-if="presentationsResult.template" class="mt-2 text-xs text-slate-400">
                  Template: <code class="text-purple-400 bg-slate-800 px-1.5 py-0.5 rounded">{{ presentationsResult.template }}</code>
                </div>
                <div v-if="presentationsResult.sample" class="mt-3 space-y-1.5">
                  <div v-for="(s, i) in presentationsResult.sample.slice(0, 2)" :key="i" class="text-xs bg-slate-800/50 p-2 rounded">
                    <span class="text-amber-400">{{ s.known }}</span>
                    <span class="text-slate-500 mx-1">→</span>
                    <span class="text-slate-300">{{ s.presentation_text }}</span>
                  </div>
                </div>
                <div v-if="presentationsResult.error" class="mt-2 text-sm text-red-400">{{ presentationsResult.error }}</div>
                <div v-if="presentationsResult.updated" class="mt-2 text-sm text-emerald-400">
                  ✓ {{ presentationsResult.updated }} updated
                </div>
              </div>
            </div>
          </div>

          <!-- Regenerate All Flagged Card -->
          <div class="bg-gradient-to-br from-slate-800/60 to-slate-800/30 border border-slate-700/50 rounded-xl p-6 lg:col-span-2">
            <div class="flex items-start justify-between mb-4">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                  </svg>
                </div>
                <div>
                  <h3 class="font-semibold text-slate-100">Regenerate All Flagged</h3>
                  <p class="text-sm text-slate-400">Process entire regen queue across all roles</p>
                </div>
              </div>
              <span class="px-2 py-0.5 text-xs bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20">
                BATCH
              </span>
            </div>

            <p class="text-sm text-slate-400 mb-4">
              Regenerate all samples in the queue in a single batch. Azure TTS handles concurrency internally,
              so this processes known, target1, and target2 roles simultaneously.
            </p>

            <!-- Queue Summary -->
            <div v-if="allFlaggedQueue" class="mb-4 grid grid-cols-4 gap-3">
              <div class="bg-slate-900/50 rounded-lg p-3 text-center">
                <div class="text-xl font-bold text-slate-100">{{ allFlaggedQueue.total }}</div>
                <div class="text-xs text-slate-500 uppercase">Total</div>
              </div>
              <div class="bg-slate-900/50 rounded-lg p-3 text-center">
                <div class="text-xl font-bold text-amber-400">{{ allFlaggedQueue.byRole?.known || 0 }}</div>
                <div class="text-xs text-slate-500 uppercase">Known</div>
              </div>
              <div class="bg-slate-900/50 rounded-lg p-3 text-center">
                <div class="text-xl font-bold text-emerald-400">{{ allFlaggedQueue.byRole?.target1 || 0 }}</div>
                <div class="text-xs text-slate-500 uppercase">Target1</div>
              </div>
              <div class="bg-slate-900/50 rounded-lg p-3 text-center">
                <div class="text-xl font-bold text-teal-400">{{ allFlaggedQueue.byRole?.target2 || 0 }}</div>
                <div class="text-xs text-slate-500 uppercase">Target2</div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="flex gap-3">
              <button
                @click="previewAllFlagged"
                :disabled="regeneratingAll"
                class="flex-1 px-4 py-2.5 bg-slate-700/50 hover:bg-slate-700 disabled:bg-slate-800 disabled:text-slate-600 text-slate-200 rounded-lg transition-colors text-sm font-medium"
              >
                {{ loadingAllFlaggedQueue ? 'Loading...' : 'Preview Queue' }}
              </button>
              <button
                @click="executeAllFlagged"
                :disabled="regeneratingAll || !allFlaggedQueue?.total"
                class="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-lg transition-colors text-sm font-medium"
              >
                {{ regeneratingAll ? 'Working...' : 'Regenerate All' }}
              </button>
            </div>

            <!-- Result -->
            <div v-if="allFlaggedResult" class="mt-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700/30">
              <div class="flex justify-between items-center">
                <div class="flex items-center gap-2">
                  <div class="w-2 h-2 rounded-full" :class="allFlaggedResult.error ? 'bg-red-500' : 'bg-emerald-500'"></div>
                  <span class="text-sm font-medium" :class="allFlaggedResult.error ? 'text-red-400' : 'text-emerald-400'">
                    {{ allFlaggedResult.error ? 'Error' : 'Triggered' }}
                  </span>
                </div>
                <div v-if="!allFlaggedResult.error" class="text-right">
                  <span class="text-xl font-bold text-slate-100">{{ allFlaggedResult.count }}</span>
                  <span class="text-xs text-slate-500 ml-1">samples</span>
                </div>
              </div>
              <div v-if="allFlaggedResult.error" class="mt-2 text-sm text-red-400">{{ allFlaggedResult.error }}</div>
              <div v-else-if="allFlaggedResult.jobId" class="mt-2 text-xs text-slate-400">
                Job ID: <code class="text-emerald-400 bg-slate-800 px-1.5 py-0.5 rounded">{{ allFlaggedResult.jobId }}</code>
              </div>
              <p v-if="!allFlaggedResult.error" class="mt-2 text-xs text-slate-500">
                Watch the live progress panel above for real-time updates.
              </p>
            </div>
          </div>
        </section>

        <!-- PIPELINE STATUS Section -->
        <section>
          <div class="flex items-center gap-4 mb-4">
            <h2 class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pipeline Status</h2>
            <div class="flex-1 h-px bg-slate-700/50"></div>
          </div>

          <!-- Progress Dashboard -->
          <PipelineProgress
            :total="progressStats.total"
            :generated="progressStats.generated"
            :pending="progressStats.pending"
            :failed="progressStats.failed"
            :estimated-cost="estimatedCost"
            :estimated-time="estimatedTime"
          />

          <!-- Concurrency Control -->
          <div class="mt-4 flex items-center gap-4 p-3 bg-slate-800/40 rounded-lg border border-slate-700/30">
            <div class="flex items-center gap-2">
              <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
              <span class="text-sm text-slate-400">Concurrency</span>
            </div>
            <input
              type="range"
              :value="concurrency"
              @input="updateConcurrency(Number(($event.target as HTMLInputElement).value))"
              min="1"
              max="20"
              class="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div class="flex items-center gap-2">
              <input
                type="number"
                :value="concurrency"
                @change="updateConcurrency(Number(($event.target as HTMLInputElement).value))"
                min="1"
                max="20"
                class="w-14 px-2 py-1 bg-slate-900/50 text-slate-100 text-center rounded border border-slate-600/50 text-sm"
              />
              <span class="text-xs text-slate-500">/ 20</span>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="mt-4 flex flex-wrap gap-3">
            <button
              @click="startGeneration"
              :disabled="!canStartGeneration || isGenerating || startingGeneration"
              class="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-700 disabled:to-slate-600 disabled:text-slate-500 rounded-lg font-medium transition-all text-sm flex items-center gap-2"
            >
              <svg v-if="isGenerating || startingGeneration" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              {{ isGenerating ? 'Generating...' : startingGeneration ? 'Starting...' : 'Start Generation' }}
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

          <!-- Plan Results Display -->
          <div v-if="showingPlan && planResult" class="mt-4 bg-gradient-to-br from-slate-800/80 to-slate-800/40 border border-purple-500/30 rounded-xl p-6">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                  <svg class="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                  </svg>
                </div>
                <span class="font-medium text-slate-100">Generation Plan</span>
              </div>
              <button
                @click="showingPlan = false"
                class="text-slate-400 hover:text-slate-200 transition-colors"
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
                <div class="bg-slate-900/50 rounded-lg p-3 text-center">
                  <div class="text-xl font-bold text-slate-100">{{ (planResult.total || 0).toLocaleString() }}</div>
                  <div class="text-xs text-slate-500 uppercase">Total Needed</div>
                </div>
                <div class="bg-slate-900/50 rounded-lg p-3 text-center">
                  <div class="text-xl font-bold text-emerald-400">{{ (planResult.existing || 0).toLocaleString() }}</div>
                  <div class="text-xs text-slate-500 uppercase">Already Done</div>
                </div>
                <div class="bg-slate-900/50 rounded-lg p-3 text-center">
                  <div class="text-xl font-bold text-amber-400">{{ (planResult.missing || 0).toLocaleString() }}</div>
                  <div class="text-xs text-slate-500 uppercase">To Generate</div>
                </div>
                <div class="bg-slate-900/50 rounded-lg p-3 text-center">
                  <div class="text-xl font-bold text-purple-400">{{ planResult.estimatedCost || '$0.00' }}</div>
                  <div class="text-xs text-slate-500 uppercase">Est. Cost</div>
                </div>
              </div>

              <div v-if="planResult.estimatedTime" class="text-sm text-slate-400 text-center">
                Estimated time: <span class="text-slate-200 font-medium">{{ planResult.estimatedTime }}</span>
              </div>

              <div v-if="planResult.missing > 0" class="pt-2">
                <button
                  @click="startGeneration(); showingPlan = false;"
                  :disabled="isGenerating"
                  class="w-full px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-700 disabled:to-slate-600 rounded-lg font-semibold transition-all text-sm flex items-center justify-center gap-2"
                >
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  Start Generation ({{ planResult.missing.toLocaleString() }} files)
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
            <h2 class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Missing Audio</h2>
            <div class="flex-1 h-px bg-slate-700/50"></div>
          </div>

          <MissingAudio :course-code="courseCode" :refresh-trigger="missingAudioKey" />
        </section>

      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useProductionStore } from '@/stores/production'
import PipelineProgress from './components/PipelineProgress.vue'
import MissingAudio from './components/MissingAudio.vue'
import VoiceConfiguration from '@/components/VoiceConfiguration.vue'

const route = useRoute()
const productionStore = useProductionStore()

const courseCode = computed(() => route.params.courseCode as string)
const loading = ref(true)
const error = ref<string | null>(null)

// Voice configuration state
const showVoiceConfig = ref(false)
const voicesConfigured = ref(false)
const voiceConfig = ref<any>(null)

// Regenerate by role state
const regenerateRole = ref('')
const regenerating = ref(false)
const regenerateResult = ref<any>(null)
const flaggedOnly = ref(false)

// Review panel state
const playingAudioId = ref<string | null>(null)
const reviewAudioElement = ref<HTMLAudioElement | null>(null)

// Regenerate presentations state
const regeneratingPresentations = ref(false)
const presentationsResult = ref<any>(null)

// Regenerate all flagged state
const allFlaggedQueue = ref<any>(null)
const loadingAllFlaggedQueue = ref(false)
const regeneratingAll = ref(false)
const allFlaggedResult = ref<any>(null)

// Plan/dry run state (kept for plan panel compatibility)
const planResult = ref<any>(null)
const showingPlan = ref(false)
const loadingPlan = ref(false)

// Generation state for immediate button feedback
const startingGeneration = ref(false)

// Concurrency control (1-20, stored in localStorage, default 20 for paid Azure tier)
const concurrency = ref(parseInt(localStorage.getItem('audio_concurrency') || '20', 10))

// Voice config update key to trigger MissingAudio refresh
const missingAudioKey = ref(0)

// Global audio progress state (from phase 8)
const audioProgress = ref<any>({ active: false })
let progressPollInterval: ReturnType<typeof setInterval> | null = null

// API Base URL - use localStorage (set by EnvironmentSwitcher)
const apiBaseUrl = localStorage.getItem('api_base_url') || 'http://localhost:3470'

// Poll for audio generation progress
const pollAudioProgress = async () => {
  try {
    const response = await fetch(`${apiBaseUrl}/api/audio/status`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    if (response.ok) {
      audioProgress.value = await response.json()
    }
  } catch (err) {
    // Silently fail - server might not be running
  }
}

const startProgressPolling = () => {
  if (progressPollInterval) return
  pollAudioProgress() // Poll immediately
  progressPollInterval = setInterval(pollAudioProgress, 1000) // Then every second
}

const stopProgressPolling = () => {
  if (progressPollInterval) {
    clearInterval(progressPollInterval)
    progressPollInterval = null
  }
}

// Load data on mount
onMounted(async () => {
  try {
    loading.value = true
    error.value = null
    await productionStore.loadCourse(courseCode.value)
    // Start polling for audio progress
    startProgressPolling()

    // Check for mode=flagged query param (from Script Viewer link)
    if (route.query.mode === 'flagged') {
      flaggedOnly.value = true
    }
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
})

// Computed properties
const progressStats = computed(() => productionStore.pipelineStats)
const isGenerating = computed(() => productionStore.jobStatus === 'running')
const hasFailed = computed(() => progressStats.value.failed > 0)
const canStartGeneration = computed(() =>
  !isGenerating.value && progressStats.value.pending > 0
)
const estimatedCost = computed(() => productionStore.costEstimate.estimated)
const estimatedTime = computed(() => productionStore.costEstimate.estimatedTime)

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
    await productionStore.startGeneration(courseCode.value, { concurrency: concurrency.value })
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
        dryRun: true,
        flaggedOnly: flaggedOnly.value,
        limit: 1000
      })
    })

    const data = await response.json()
    if (!response.ok) {
      regenerateResult.value = { error: data.error || 'Preview failed' }
    } else {
      regenerateResult.value = {
        dryRun: true,
        flaggedOnly: flaggedOnly.value,
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

  const scope = flaggedOnly.value ? 'flagged' : 'all'
  const confirmed = confirm(
    `This will regenerate ${scope} ${regenerateRole.value} audio for ${courseCode.value}.\n\n` +
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
        dryRun: false,
        flaggedOnly: flaggedOnly.value,
        limit: 1000
      })
    })

    const data = await response.json()
    if (!response.ok) {
      regenerateResult.value = { error: data.error || 'Regeneration failed' }
    } else {
      regenerateResult.value = {
        dryRun: false,
        flaggedOnly: flaggedOnly.value,
        status: 'completed',
        total: data.total,
        success: data.success,
        failed: data.failed,
        voiceId: data.voiceId,
        language: data.language,
        regeneratedItems: data.regeneratedItems || []
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

// Review panel functions
const playReviewAudio = async (audioId: string) => {
  // Toggle if already playing
  if (playingAudioId.value === audioId) {
    reviewAudioElement.value?.pause()
    playingAudioId.value = null
    return
  }

  // Stop any currently playing audio
  if (reviewAudioElement.value) {
    reviewAudioElement.value.pause()
  }

  try {
    // Get signed URL for the audio
    const response = await fetch(`${apiBaseUrl}/api/production/${courseCode.value}/audio/${audioId}/url`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    if (!response.ok) throw new Error('Failed to get audio URL')

    const { url } = await response.json()

    // Create and play audio
    reviewAudioElement.value = new Audio(url)
    reviewAudioElement.value.onended = () => {
      playingAudioId.value = null
    }
    reviewAudioElement.value.onerror = () => {
      playingAudioId.value = null
    }

    playingAudioId.value = audioId
    await reviewAudioElement.value.play()
  } catch (err) {
    console.error('Error playing review audio:', err)
    playingAudioId.value = null
  }
}

const markItemDone = async (item: any) => {
  try {
    // Delete the flag using new audio-flags endpoint - user is happy with this audio
    await fetch(`${apiBaseUrl}/api/production/${courseCode.value}/audio-flags/${item.id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      }
    })
    // Remove from review list
    if (regenerateResult.value?.regeneratedItems) {
      regenerateResult.value.regeneratedItems = regenerateResult.value.regeneratedItems.filter(
        (i: any) => i.id !== item.id
      )
    }
  } catch (err) {
    console.error('Error marking item done:', err)
  }
}

const markAllDone = async () => {
  if (!regenerateResult.value?.regeneratedItems?.length) return

  try {
    // Delete all flags using new audio-flags endpoint - user is happy with all audio
    for (const item of regenerateResult.value.regeneratedItems) {
      await fetch(`${apiBaseUrl}/api/production/${courseCode.value}/audio-flags/${item.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        }
      })
    }
    // Clear review list
    regenerateResult.value.regeneratedItems = []
  } catch (err) {
    console.error('Error marking all done:', err)
  }
}

const clearReviewPanel = () => {
  if (regenerateResult.value) {
    regenerateResult.value.regeneratedItems = []
  }
  if (reviewAudioElement.value) {
    reviewAudioElement.value.pause()
  }
  playingAudioId.value = null
}

// Presentation text regeneration functions
const previewPresentations = async () => {
  regeneratingPresentations.value = true
  presentationsResult.value = null

  try {
    const response = await fetch(`${apiBaseUrl}/api/audio/regenerate-presentations/${courseCode.value}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        dryRun: true
      })
    })

    const data = await response.json()
    if (!response.ok) {
      presentationsResult.value = { error: data.error || 'Preview failed' }
    } else {
      presentationsResult.value = data
    }
  } catch (err: any) {
    presentationsResult.value = { error: err.message }
  } finally {
    regeneratingPresentations.value = false
  }
}

const executePresentations = async () => {
  const confirmed = confirm(
    `This will update presentation text for all LEGOs in ${courseCode.value}.\n\n` +
    `Existing presentation audio will need to be regenerated.\n\n` +
    `Continue?`
  )
  if (!confirmed) return

  regeneratingPresentations.value = true
  presentationsResult.value = null

  try {
    const response = await fetch(`${apiBaseUrl}/api/audio/regenerate-presentations/${courseCode.value}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        dryRun: false
      })
    })

    const data = await response.json()
    if (!response.ok) {
      presentationsResult.value = { error: data.error || 'Update failed' }
    } else {
      presentationsResult.value = data
    }
  } catch (err: any) {
    presentationsResult.value = { error: err.message }
  } finally {
    regeneratingPresentations.value = false
  }
}

// Regenerate All Flagged functions
const previewAllFlagged = async () => {
  loadingAllFlaggedQueue.value = true
  allFlaggedResult.value = null

  try {
    const response = await fetch(`${apiBaseUrl}/api/production/${courseCode.value}/regeneration/queue`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })

    const data = await response.json()
    if (!response.ok) {
      allFlaggedQueue.value = null
      allFlaggedResult.value = { error: data.error || 'Failed to load queue' }
    } else {
      // Count by role
      const byRole: Record<string, number> = { known: 0, target1: 0, target2: 0, presentation: 0 }
      for (const item of data.items || []) {
        const role = item.audio?.role || 'unknown'
        if (byRole[role] !== undefined) {
          byRole[role]++
        }
      }

      allFlaggedQueue.value = {
        total: data.total || 0,
        items: data.items || [],
        byRole
      }
    }
  } catch (err: any) {
    allFlaggedQueue.value = null
    allFlaggedResult.value = { error: err.message }
  } finally {
    loadingAllFlaggedQueue.value = false
  }
}

const executeAllFlagged = async () => {
  if (!allFlaggedQueue.value?.total) return

  const confirmed = confirm(
    `This will regenerate ${allFlaggedQueue.value.total} flagged samples across all roles.\n\n` +
    `Breakdown:\n` +
    `• Known: ${allFlaggedQueue.value.byRole?.known || 0}\n` +
    `• Target1: ${allFlaggedQueue.value.byRole?.target1 || 0}\n` +
    `• Target2: ${allFlaggedQueue.value.byRole?.target2 || 0}\n` +
    `• Presentation: ${allFlaggedQueue.value.byRole?.presentation || 0}\n\n` +
    `Existing audio files will be replaced.\n\n` +
    `Continue?`
  )
  if (!confirmed) return

  regeneratingAll.value = true
  allFlaggedResult.value = null

  try {
    const response = await fetch(`${apiBaseUrl}/api/production/${courseCode.value}/regeneration/trigger-all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      }
    })

    const data = await response.json()
    if (!response.ok) {
      allFlaggedResult.value = { error: data.error || 'Regeneration failed' }
    } else {
      allFlaggedResult.value = {
        success: true,
        count: data.count,
        processed: data.processed,
        failed: data.failed
      }
      // Populate regenerateResult with items for the review panel
      if (data.regeneratedItems?.length > 0) {
        regenerateResult.value = {
          dryRun: false,
          flaggedOnly: true,
          status: 'completed',
          total: data.count,
          success: data.processed,
          failed: data.failed,
          regeneratedItems: data.regeneratedItems
        }
      }
      // Clear the queue preview since items have been regenerated
      allFlaggedQueue.value = null
      // Reload pipeline stats
      await productionStore.loadCourse(courseCode.value)
    }
  } catch (err: any) {
    allFlaggedResult.value = { error: err.message }
  } finally {
    regeneratingAll.value = false
  }
}
</script>

<style scoped>
.audio-pipeline {
  padding: 0;
}
</style>
