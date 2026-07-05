<template>
  <section class="bg-surface/50 rounded-lg border border-line p-6">
    <h2 class="text-2xl font-semibold text-ink mb-1 flex items-center gap-2">
      <svg class="w-6 h-6 text-emerald-400 stat-emerald" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
      </svg>
      Audio Ledger
    </h2>
    <p class="text-sm text-muted mb-6">
      One unit: <strong>slots</strong> — every place a learner hears a clip (content row × role).
      Each slot is in exactly one state below.
    </p>

    <!-- Ledger grid (new model) -->
    <div v-if="ledger" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      <div class="bg-surface rounded-lg p-4 text-center border border-line shadow-sm">
        <div class="text-2xl font-bold text-ink">
          <span v-if="loading" class="inline-block w-5 h-5 border-2 border-line border-t-muted rounded-full animate-spin"></span>
          <span v-else>{{ ledger.inScope.toLocaleString() }}</span>
        </div>
        <div class="text-xs text-muted mt-1 uppercase tracking-wide">In scope</div>
        <div class="text-[11px] text-faint mt-0.5">all playable slots</div>
      </div>

      <div class="bg-surface rounded-lg p-4 text-center border border-emerald-500/30 stat-card-emerald shadow-sm">
        <div class="text-2xl font-bold text-emerald-400 stat-emerald">
          <span v-if="loading" class="inline-block w-5 h-5 border-2 border-emerald-900 border-t-emerald-400 rounded-full animate-spin"></span>
          <span v-else>{{ ledger.linked.toLocaleString() }}</span>
        </div>
        <div class="text-xs text-muted mt-1 uppercase tracking-wide">Linked</div>
        <div class="text-[11px] text-faint mt-0.5">real audio, bound, playable</div>
      </div>

      <div class="bg-surface rounded-lg p-4 text-center border border-cyan-500/30 shadow-sm">
        <div class="text-2xl font-bold text-cyan-400 stat-cyan">
          <span v-if="loading" class="inline-block w-5 h-5 border-2 border-cyan-900 border-t-cyan-400 rounded-full animate-spin"></span>
          <span v-else>{{ ledger.linkable.toLocaleString() }}</span>
        </div>
        <div class="text-xs text-muted mt-1 uppercase tracking-wide">Link ready</div>
        <div class="text-[11px] text-faint mt-0.5">audio exists — free bind</div>
      </div>

      <div class="bg-surface rounded-lg p-4 text-center border border-purple-500/30 shadow-sm">
        <div class="text-2xl font-bold text-purple-400 stat-purple">
          <span v-if="loading" class="inline-block w-5 h-5 border-2 border-purple-900 border-t-purple-400 rounded-full animate-spin"></span>
          <span v-else>{{ (ledger.toAuthor || 0).toLocaleString() }}</span>
        </div>
        <div class="text-xs text-muted mt-1 uppercase tracking-wide">Intros to author</div>
        <div class="text-[11px] text-faint mt-0.5">written during Generate</div>
      </div>

      <div class="bg-surface rounded-lg p-4 text-center border border-yellow-500/30 stat-card-yellow shadow-sm">
        <div class="text-2xl font-bold text-yellow-400 stat-yellow">
          <span v-if="loading" class="inline-block w-5 h-5 border-2 border-yellow-900 border-t-yellow-400 rounded-full animate-spin"></span>
          <span v-else>{{ ledger.ttsJobs.toLocaleString() }}</span>
        </div>
        <div class="text-xs text-muted mt-1 uppercase tracking-wide">TTS jobs</div>
        <div class="text-[11px] text-faint mt-0.5">
          costs money<span v-if="ledger.copyJobs"> · +{{ ledger.copyJobs }} free copies</span>
        </div>
      </div>

      <div class="bg-surface rounded-lg p-4 text-center border border-line shadow-sm">
        <div class="text-2xl font-bold text-faint">
          <span v-if="loading" class="inline-block w-5 h-5 border-2 border-line border-t-muted rounded-full animate-spin"></span>
          <span v-else>{{ ledger.ungeneratable.toLocaleString() }}</span>
        </div>
        <div class="text-xs text-muted mt-1 uppercase tracking-wide">Skipped</div>
        <div class="text-[11px] text-faint mt-0.5">punctuation-only</div>
      </div>
    </div>

    <!-- Legacy grid (until the backend redeploy delivers the ledger) -->
    <div v-else class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-surface rounded-lg p-4 text-center border border-line shadow-sm">
        <div class="text-3xl font-bold text-ink">
          <span v-if="loading" class="inline-block w-6 h-6 border-2 border-line border-t-muted rounded-full animate-spin"></span>
          <span v-else>{{ total }}</span>
        </div>
        <div class="text-sm text-muted mt-1">Total Audio</div>
      </div>
      <div class="bg-surface rounded-lg p-4 text-center border border-emerald-500/30 stat-card-emerald shadow-sm">
        <div class="text-3xl font-bold text-emerald-400 stat-emerald">
          <span v-if="loading" class="inline-block w-6 h-6 border-2 border-emerald-900 border-t-emerald-400 rounded-full animate-spin"></span>
          <span v-else>{{ generated }}</span>
        </div>
        <div class="text-sm text-muted mt-1">Generated</div>
      </div>
      <div class="bg-surface rounded-lg p-4 text-center border border-yellow-500/30 stat-card-yellow shadow-sm">
        <div class="text-3xl font-bold text-yellow-400 stat-yellow">
          <span v-if="loading" class="inline-block w-6 h-6 border-2 border-yellow-900 border-t-yellow-400 rounded-full animate-spin"></span>
          <span v-else>{{ pending }}</span>
        </div>
        <div class="text-sm text-muted mt-1">Pending</div>
        <div v-if="!loading && linkable > 0" class="text-xs text-cyan-400 stat-cyan mt-1" :title="`${linkable} rows have existing audio that just needs to be linked. No TTS spend.`">
          + {{ linkable }} to link (no TTS)
        </div>
      </div>
      <div class="bg-surface rounded-lg p-4 text-center border border-red-500/30 stat-card-red shadow-sm">
        <div class="text-3xl font-bold text-red-400 stat-red">
          <span v-if="loading" class="inline-block w-6 h-6 border-2 border-red-900 border-t-red-400 rounded-full animate-spin"></span>
          <span v-else>{{ failed }}</span>
        </div>
        <div class="text-sm text-muted mt-1">Failed</div>
      </div>
    </div>

    <!-- Progress Bar: linked ÷ in-scope -->
    <div class="mb-6">
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm text-muted">Linked (playable) coverage</span>
        <span v-if="loading" class="text-sm text-faint">--</span>
        <span v-else class="text-sm font-semibold text-ink">{{ progressPercent }}%</span>
      </div>
      <div class="w-full bg-surface-2 rounded-full h-4 overflow-hidden">
        <div v-if="loading" class="h-full w-full bg-surface-3 animate-pulse"></div>
        <div
          v-else
          class="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
          :style="{ width: progressPercent + '%' }"
        ></div>
      </div>
    </div>

    <!-- What Generate does — the one button, three stages -->
    <div v-if="!loading && hasWork" class="mb-6 bg-canvas/50 rounded-lg p-4 border border-line/40">
      <div class="text-xs text-muted uppercase tracking-wide mb-3">One button — Generate runs three stages</div>
      <div class="flex flex-col md:flex-row gap-3 text-sm">
        <div class="flex-1 flex items-start gap-2">
          <span class="w-5 h-5 rounded-full bg-purple-500/15 text-purple-400 stat-purple text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">1</span>
          <div>
            <div class="font-medium text-ink">Author</div>
            <div class="text-muted text-xs mt-0.5">
              <template v-if="ledger && ledger.toAuthor > 0">{{ ledger.toAuthor.toLocaleString() }} intro scripts — frozen frame, agent judges whether each needs its seed-sentence context, flags suspect content.</template>
              <template v-else>No intro scripts needed — all authored.</template>
            </div>
          </div>
        </div>
        <div class="flex-1 flex items-start gap-2">
          <span class="w-5 h-5 rounded-full bg-yellow-500/15 text-yellow-400 stat-yellow text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">2</span>
          <div>
            <div class="font-medium text-ink">Render</div>
            <div class="text-muted text-xs mt-0.5">
              <template v-if="ledger">{{ ledger.ttsJobs.toLocaleString() }} TTS jobs<span v-if="ledger.copyJobs"> + {{ ledger.copyJobs.toLocaleString() }} free copies</span> — voice per role from course config.</template>
              <template v-else>{{ pending }} TTS jobs.</template>
            </div>
          </div>
        </div>
        <div class="flex-1 flex items-start gap-2">
          <span class="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-400 stat-emerald text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">3</span>
          <div>
            <div class="font-medium text-ink">Bind</div>
            <div class="text-muted text-xs mt-0.5">
              Every clip linked where the player reads it<span v-if="ledger && ledger.linkable"> — including {{ ledger.linkable.toLocaleString() }} free binds of audio that already exists</span>.
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Complete Banner (when 100% done) -->
    <div v-if="isComplete" class="bg-emerald-900/30 emerald-panel rounded-lg p-6 border border-emerald-500/30 text-center">
      <div class="flex items-center justify-center gap-3 mb-2">
        <svg class="w-8 h-8 text-emerald-400 stat-emerald" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span class="text-2xl font-bold text-emerald-400 stat-emerald">Every slot linked</span>
      </div>
      <p class="text-muted">{{ ledger ? ledger.linked.toLocaleString() : generated }} clips playable</p>
    </div>

    <!-- Cost & Time Estimates (only show when there's work pending) -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Cost Estimate -->
      <CostEstimate
        v-if="estimatedCost"
        :estimated="estimatedCost"
        :actual="actualCost"
      />
      <div v-else class="bg-surface rounded-lg p-4 border border-line shadow-sm">
        <div class="flex items-center gap-2 mb-2">
          <svg class="w-5 h-5 text-emerald-400 stat-emerald" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span class="font-semibold text-ink">Cost Estimate</span>
        </div>
        <div class="text-sm text-faint">Run plan to estimate</div>
      </div>

      <!-- Time Estimate -->
      <div class="bg-surface rounded-lg p-4 border border-line shadow-sm">
        <div class="flex items-center gap-2 mb-2">
          <svg class="w-5 h-5 text-blue-400 stat-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span class="font-semibold text-ink">Estimated Time</span>
        </div>
        <div v-if="estimatedTime" class="text-2xl font-bold text-blue-400 stat-blue">{{ estimatedTime }}</div>
        <div v-else class="text-sm text-faint">Run plan to estimate</div>
        <div v-if="estimatedTime" class="text-xs text-faint mt-1">Remaining</div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import CostEstimate from './CostEstimate.vue'

interface PresentationStatus {
  ready: boolean
  missingLegoPresentations: number
  missingComponentPresentations: number
  totalMissing: number
}

interface Ledger {
  inScope: number
  linked: number
  linkable: number
  ttsJobs: number
  toAuthor: number
  copyJobs: number
  ungeneratable: number
}

interface Props {
  total: number
  generated: number
  pending: number
  failed: number
  estimatedCost: string | null
  estimatedTime: string | null
  loading?: boolean
  // Canonical fields from /audio-stats
  linkable?: number
  readyForGenerate?: boolean
  presentationStatus?: PresentationStatus | null
  // Slot ledger (present once the backend redeploy lands)
  ledger?: Ledger | null
}

const props = defineProps<Props>()

const progressPercent = computed(() => {
  if (props.ledger) {
    if (props.ledger.inScope === 0) return 0
    return Math.round((props.ledger.linked / props.ledger.inScope) * 100)
  }
  if (props.total === 0) return 0
  return Math.round((props.generated / props.total) * 100)
})

const hasWork = computed(() => {
  if (props.ledger) return props.ledger.ttsJobs > 0 || props.ledger.linkable > 0 || props.ledger.copyJobs > 0
  return props.pending > 0 || (props.linkable || 0) > 0
})

const isComplete = computed(() => {
  if (props.ledger) return props.ledger.inScope > 0 && !hasWork.value && props.failed === 0
  return props.total > 0 && props.pending === 0 && props.failed === 0
})

const actualCost = computed(() => {
  // Calculate actual cost based on generated samples
  // This would come from the store in a real implementation
  return '$0.00'
})
</script>

<style scoped>
/* Light-mode-only color corrections. Dark mode keeps the bright -400 hues. */
:global([data-theme="light"]) .stat-emerald { color: #047857; }   /* emerald-700 ~5.0:1 on #fff */
:global([data-theme="light"]) .stat-yellow  { color: #a16207; }   /* yellow-700 ~4.6:1 (yellow-400 was ~1.2:1) */
:global([data-theme="light"]) .stat-red     { color: #dc2626; }   /* red-600 ~4.5:1 (red-400 was ~2.5:1) */
:global([data-theme="light"]) .stat-cyan    { color: #0e7490; }   /* cyan-700 ~4.7:1 (cyan-400 was ~1.3:1) */
:global([data-theme="light"]) .stat-blue    { color: #2563eb; }   /* blue-600 ~4.6:1 (blue-400 was ~2.4:1) */
:global([data-theme="light"]) .stat-purple  { color: #7e22ce; }   /* purple-700 ~6.4:1 */

/* Tinted stat-card borders read on white without the dark-mode glow */
:global([data-theme="light"]) .stat-card-emerald { border-color: rgba(5, 150, 105, 0.45); }
:global([data-theme="light"]) .stat-card-yellow  { border-color: rgba(161, 98, 7, 0.40); }
:global([data-theme="light"]) .stat-card-red     { border-color: rgba(220, 38, 38, 0.40); }

/* Complete banner: dark emerald fill -> light emerald tint */
:global([data-theme="light"]) .emerald-panel { background-color: #d1fae5; border-color: rgba(5, 150, 105, 0.45); }
</style>
