<template>
  <div class="listening-projection px-2">
    <!-- Controls Panel (collapsible) -->
    <div class="mb-4">
      <button
        @click="controlsOpen = !controlsOpen"
        class="flex items-center gap-2 text-sm text-ink hover:text-ink transition-colors mb-2"
      >
        <svg
          class="w-4 h-4 transition-transform"
          :class="{ 'rotate-90': controlsOpen }"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
        Parameters
      </button>

      <div v-show="controlsOpen" class="bg-surface rounded-lg p-4 border border-line">
        <!-- Row 1: Course shape -->
        <div class="text-xs text-faint uppercase tracking-wider mb-2">Course shape</div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label class="block text-xs text-muted mb-1">Total LEGOs (rounds)</label>
            <input
              v-model.number="params.totalLegos"
              type="number" min="1" max="700"
              class="w-full px-2 py-1.5 text-sm bg-surface-2 text-ink rounded border border-line focus:border-purple-500 focus:outline-none"
            />
          </div>
          <div>
            <label class="block text-xs text-muted mb-1">LEGOs per seed</label>
            <input
              v-model.number="params.legosPerSeed"
              type="number" min="1" max="5" step="0.1"
              class="w-full px-2 py-1.5 text-sm bg-surface-2 text-ink rounded border border-line focus:border-purple-500 focus:outline-none"
            />
            <span class="text-xs text-faint">{{ derivedSeedCount }} seeds in course</span>
          </div>
          <div>
            <label class="block text-xs text-muted mb-1">New content items/round</label>
            <input
              v-model.number="params.avgNewContentItems"
              type="number" min="5" max="25"
              class="w-full px-2 py-1.5 text-sm bg-surface-2 text-ink rounded border border-line focus:border-purple-500 focus:outline-none"
            />
          </div>
          <div>
            <label class="block text-xs text-muted mb-1">Target round time (s)</label>
            <input
              v-model.number="params.roundTimeTarget"
              type="number" min="120" max="600" step="30"
              class="w-full px-2 py-1.5 text-sm bg-surface-2 text-ink rounded border border-line focus:border-purple-500 focus:outline-none"
            />
          </div>
        </div>

        <!-- Row 2: Listening parameters -->
        <div class="text-xs text-faint uppercase tracking-wider mb-2">Listening</div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label class="block text-xs text-muted mb-1">Graduation offset: {{ params.listeningOffset }}</label>
            <input
              v-model.number="params.listeningOffset"
              type="range" min="30" max="150"
              class="w-full accent-purple-500"
            />
            <span class="text-xs text-faint">rounds after last LEGO</span>
          </div>
          <div>
            <label class="block text-xs text-muted mb-1">Batch size</label>
            <input
              v-model.number="params.batchSize"
              type="number" min="5" max="50"
              class="w-full px-2 py-1.5 text-sm bg-surface-2 text-ink rounded border border-line focus:border-purple-500 focus:outline-none"
            />
          </div>
          <div>
            <label class="block text-xs text-muted mb-1">Batch count</label>
            <input
              v-model.number="params.batchCount"
              type="number" min="1" max="10"
              class="w-full px-2 py-1.5 text-sm bg-surface-2 text-ink rounded border border-line focus:border-purple-500 focus:outline-none"
            />
            <span class="text-xs text-faint">{{ params.batchSize * params.batchCount }} seeds total</span>
          </div>
          <div>
            <label class="block text-xs text-muted mb-1">Fibonacci max: {{ params.fibMax }}</label>
            <input
              v-model.number="params.fibMax"
              type="range" min="21" max="144" :step="1"
              class="w-full accent-purple-500"
            />
            <span class="text-xs text-faint">{{ activeFibonacci.join(', ') }}</span>
          </div>
        </div>

        <!-- Row 3: Timing -->
        <div class="text-xs text-faint uppercase tracking-wider mb-2">Item timing</div>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label class="block text-xs text-muted mb-1">Productive phrase (s)</label>
            <input
              v-model.number="params.productivePhraseTime"
              type="number" min="5" max="30"
              class="w-full px-2 py-1.5 text-sm bg-surface-2 text-ink rounded border border-line focus:border-purple-500 focus:outline-none"
            />
          </div>
          <div>
            <label class="block text-xs text-muted mb-1">Listening normal (s)</label>
            <input
              v-model.number="params.listeningNormalTime"
              type="number" min="2" max="10"
              class="w-full px-2 py-1.5 text-sm bg-surface-2 text-ink rounded border border-line focus:border-purple-500 focus:outline-none"
            />
          </div>
          <div>
            <label class="block text-xs text-muted mb-1">Listening double (s)</label>
            <input
              v-model.number="params.listeningFastTime"
              type="number" min="1" max="8"
              class="w-full px-2 py-1.5 text-sm bg-surface-2 text-ink rounded border border-line focus:border-purple-500 focus:outline-none"
            />
          </div>
        </div>

        <!-- Speed progression + trigger info -->
        <div class="flex flex-wrap gap-6 text-xs text-muted">
          <div>
            <span class="text-faint uppercase tracking-wider">Speed progression</span>
            <div class="flex gap-2 mt-1">
              <span class="bg-surface-2 px-2 py-1 rounded">1-3: normal</span>
              <span class="bg-surface-2 px-2 py-1 rounded">4-6: normal + double</span>
              <span class="bg-surface-2 px-2 py-1 rounded">7-9: double + double</span>
              <span class="bg-surface-2 px-2 py-1 rounded">10+: double only</span>
            </div>
          </div>
          <div>
            <span class="text-faint uppercase tracking-wider">Trigger</span>
            <div class="mt-1 text-ink">Each seed graduation triggers listening (one batch per trigger, rotating)</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Summary Stats -->
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 mb-4">
      <div class="bg-surface rounded-lg p-3 border border-line">
        <div class="text-xs text-muted">Avg round</div>
        <div class="text-lg font-bold text-ink">{{ formatTime(summaryStats.avgRoundTime) }}</div>
      </div>
      <div class="bg-surface rounded-lg p-3 border border-line">
        <div class="text-xs text-muted">Max round</div>
        <div class="text-lg font-bold text-ink">{{ formatTime(summaryStats.maxRoundTime) }}</div>
        <div class="text-xs text-faint">Round {{ summaryStats.maxRoundNumber }}</div>
      </div>
      <div class="bg-surface rounded-lg p-3 border border-line">
        <div class="text-xs text-muted">Listening starts</div>
        <div class="text-lg font-bold text-purple-400">Round {{ summaryStats.firstListeningRound || '—' }}</div>
      </div>
      <div class="bg-surface rounded-lg p-3 border border-line">
        <div class="text-xs text-muted">S80 graduates</div>
        <div class="text-lg font-bold text-purple-400">Round {{ summaryStats.lastListeningSeedRound || '—' }}</div>
        <div class="text-xs text-faint">all {{ params.batchSize * params.batchCount }} in batches</div>
      </div>
      <div class="bg-surface rounded-lg p-3 border border-line">
        <div class="text-xs text-muted">Batch rotation</div>
        <div class="text-sm font-bold text-purple-400">~{{ summaryStats.avgRoundsBetweenBatchReplay }} rounds</div>
        <div class="text-xs text-faint">between replays of same batch</div>
      </div>
      <div v-for="milestone in summaryStats.milestones" :key="milestone.round"
        class="bg-surface rounded-lg p-3 border border-line">
        <div class="text-xs text-muted">Round {{ milestone.round }}</div>
        <div class="text-sm font-bold text-ink">{{ formatTime(milestone.totalTime) }}</div>
        <div class="text-xs text-faint">
          {{ milestone.productive }}p
          <template v-if="milestone.isListeningRound">
            + B{{ milestone.batchPlayed }} ({{ milestone.listeningSeeds }}s)
          </template>
        </div>
      </div>
    </div>

    <!-- Chart -->
    <div class="bg-surface rounded-lg border border-line p-4">
      <div ref="chartContainer" class="chart-container"></div>
    </div>

    <!-- Legend -->
    <div class="flex items-center gap-6 mt-3 text-xs text-muted justify-center">
      <span class="flex items-center gap-1.5">
        <span class="w-3 h-3 rounded-sm bg-blue-500 inline-block"></span>
        New content
      </span>
      <span class="flex items-center gap-1.5">
        <span class="w-3 h-3 rounded-sm bg-emerald-500 inline-block"></span>
        Productive review
      </span>
      <span class="flex items-center gap-1.5">
        <span class="w-3 h-3 rounded-sm bg-amber-500 inline-block"></span>
        Listening (normal)
      </span>
      <span class="flex items-center gap-1.5">
        <span class="w-3 h-3 rounded-sm bg-purple-500 inline-block"></span>
        Listening (double)
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import * as d3 from 'd3';

const props = defineProps<{
  courseCode: string;
  totalLegos: number;
}>();

const FULL_FIBONACCI = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144];

const controlsOpen = ref(false);
const chartContainer = ref<HTMLElement | null>(null);

const params = reactive({
  totalLegos: props.totalLegos || 600,
  legosPerSeed: 2.1,
  avgNewContentItems: 12,
  roundTimeTarget: 300,
  // Listening
  listeningOffset: 56,
  batchSize: 20,
  batchCount: 4,
  fibMax: 55,
  // Timing
  productivePhraseTime: 15,
  listeningNormalTime: 5,
  listeningFastTime: 3,
});

watch(() => props.totalLegos, (v) => {
  if (v && v > 0) params.totalLegos = v;
});

const derivedSeedCount = computed(() =>
  Math.floor(params.totalLegos / params.legosPerSeed)
);

const activeFibonacci = computed(() =>
  FULL_FIBONACCI.filter(f => f <= params.fibMax)
);

// Total seeds entering listening = batchSize * batchCount, capped by course size
const totalListeningSeeds = computed(() =>
  Math.min(params.batchSize * params.batchCount, derivedSeedCount.value)
);

// --- Speed progression ---
function listeningTimeForPlay(playCount: number, normalTime: number, fastTime: number): { normal: number; fast: number } {
  if (playCount <= 3) return { normal: normalTime, fast: 0 };
  if (playCount <= 6) return { normal: normalTime, fast: fastTime };
  if (playCount <= 9) return { normal: 0, fast: 2 * fastTime };
  return { normal: 0, fast: fastTime };
}

interface RoundData {
  round: number;
  newContentTime: number;
  productiveReviewTime: number;
  listeningNormalTime: number;
  listeningFastTime: number;
  newContentItems: number;
  productiveReviewItems: number;
  totalGraduated: number;
  listeningBatchPlayed: number; // -1 = no listening this round, 0-indexed batch
  listeningBatchSeedCount: number;
  listeningNormalPlays: number;
  listeningFastPlays: number;
  isListeningRound: boolean;
  graduatedFibSlots: number;
}

const roundData = computed<RoundData[]>(() => {
  const data: RoundData[] = [];
  const total = Math.max(1, params.totalLegos);
  const lps = params.legosPerSeed;
  const fib = activeFibonacci.value;

  // All seeds in course — any can graduate and trigger listening
  const allSeedCount = derivedSeedCount.value;
  // But only first totalListeningSeeds enter batches
  const listeningCap = totalListeningSeeds.value;
  const batchSz = params.batchSize;
  const batchCt = params.batchCount;

  // Precompute graduation round for every seed
  // Seed S's last LEGO is at round ceil(S * legosPerSeed)
  // Seed graduates at that round + listeningOffset
  const seedGraduatesAt: number[] = []; // index 0 = seed 1
  for (let s = 1; s <= allSeedCount; s++) {
    seedGraduatesAt.push(Math.ceil(s * lps) + params.listeningOffset);
  }

  // Batch state: array of batchCount maps, each seedNum → { playCount }
  const batches: Map<number, { playCount: number }>[] = [];
  for (let b = 0; b < batchCt; b++) batches.push(new Map());

  const graduatedSeeds = new Set<number>();
  let nextBatchRotation = 0;

  for (let N = 1; N <= total; N++) {
    // 1. Check for new graduates this round
    let newGraduateThisRound = false;
    for (let s = 0; s < allSeedCount; s++) {
      if (graduatedSeeds.has(s)) continue;
      if (N < seedGraduatesAt[s]) continue;

      graduatedSeeds.add(s);
      newGraduateThisRound = true;

      // Assign to batch if within listening cap (seeds are 0-indexed here)
      const seedNum = s + 1; // 1-indexed
      if (seedNum <= listeningCap) {
        const batchIndex = Math.floor((seedNum - 1) / batchSz);
        if (batchIndex < batchCt) {
          batches[batchIndex].set(seedNum, { playCount: 0 });
        }
      }
    }

    // 2. Determine which batch to play (if any)
    let isListeningRound = false;
    let batchPlayed = -1;
    let listeningNormalTime = 0;
    let listeningFastTime = 0;
    let listeningNormalPlays = 0;
    let listeningFastPlays = 0;
    let listeningBatchSeedCount = 0;

    if (newGraduateThisRound) {
      // Find active batches (non-empty)
      const activeBatchIndices: number[] = [];
      for (let b = 0; b < batchCt; b++) {
        if (batches[b].size > 0) activeBatchIndices.push(b);
      }

      if (activeBatchIndices.length > 0) {
        isListeningRound = true;

        if (activeBatchIndices.length === 1) {
          // Only B1 exists during initial build-up — always play it
          batchPlayed = activeBatchIndices[0];
        } else {
          // Rotate through active batches
          batchPlayed = activeBatchIndices[nextBatchRotation % activeBatchIndices.length];
          nextBatchRotation++;
        }

        // Play every seed in the chosen batch
        const batch = batches[batchPlayed];
        listeningBatchSeedCount = batch.size;
        for (const [, entry] of batch) {
          entry.playCount++;
          const timing = listeningTimeForPlay(
            entry.playCount,
            params.listeningNormalTime,
            params.listeningFastTime
          );
          listeningNormalTime += timing.normal;
          listeningFastTime += timing.fast;
          if (timing.normal > 0) listeningNormalPlays++;
          if (timing.fast > 0) listeningFastPlays += (entry.playCount >= 7 && entry.playCount <= 9) ? 2 : 1;
        }
      }
    }

    // 3. Productive review — Fibonacci offsets, skipping graduated LEGOs
    let productiveReviewItems = 0;
    let graduatedFibSlots = 0;
    for (const f of fib) {
      const legoRound = N - f;
      if (legoRound < 1) continue;

      // Which seed does this LEGO belong to?
      const legoSeedIdx = Math.ceil(legoRound / lps) - 1; // 0-indexed

      // Has this seed graduated?
      if (graduatedSeeds.has(legoSeedIdx)) {
        graduatedFibSlots++;
        continue;
      }

      productiveReviewItems += (f === 1) ? 3 : 1;
    }

    const productiveReviewTime = productiveReviewItems * params.productivePhraseTime;

    // 4. New content
    const newContentItems = params.avgNewContentItems;
    const newContentTime = newContentItems * params.productivePhraseTime;

    data.push({
      round: N,
      newContentTime,
      productiveReviewTime,
      listeningNormalTime,
      listeningFastTime,
      newContentItems,
      productiveReviewItems,
      totalGraduated: graduatedSeeds.size,
      listeningBatchPlayed: batchPlayed,
      listeningBatchSeedCount,
      listeningNormalPlays,
      listeningFastPlays,
      isListeningRound,
      graduatedFibSlots,
    });
  }

  return data;
});

const summaryStats = computed(() => {
  const data = roundData.value;
  if (data.length === 0) {
    return {
      avgRoundTime: 0, maxRoundTime: 0, maxRoundNumber: 0,
      firstListeningRound: 0, lastListeningSeedRound: 0,
      avgRoundsBetweenBatchReplay: 0, milestones: [],
    };
  }

  const totalTime = (r: RoundData) =>
    r.newContentTime + r.productiveReviewTime + r.listeningNormalTime + r.listeningFastTime;

  const times = data.map(totalTime);
  const avgRoundTime = times.reduce((a, b) => a + b, 0) / times.length;
  const maxRoundTime = Math.max(...times);
  const maxRoundNumber = times.indexOf(maxRoundTime) + 1;

  const firstListeningRound = data.find(r => r.isListeningRound)?.round || 0;

  // When does the last listening seed (S80) graduate?
  const cap = totalListeningSeeds.value;
  const lastListeningSeedRound = cap > 0
    ? Math.ceil(cap * params.legosPerSeed) + params.listeningOffset
    : 0;

  // Average rounds between replays of the same batch (in steady state)
  // Each graduation triggers one batch. With batchCount batches rotating,
  // each batch replays every ~(batchCount × avg rounds between graduations)
  const listeningRounds = data.filter(r => r.isListeningRound);
  let avgRoundsBetweenBatchReplay = 0;
  if (listeningRounds.length > 1) {
    const avgGap = (listeningRounds[listeningRounds.length - 1].round - listeningRounds[0].round) / (listeningRounds.length - 1);
    // Count how many batches are active at the end
    const activeBatches = params.batchCount;
    avgRoundsBetweenBatchReplay = Math.round(avgGap * activeBatches);
  }

  const milestoneRounds = [100, 200, 300, 500].filter(r => r <= data.length);
  const milestones = milestoneRounds.map(r => {
    const rd = data[r - 1];
    return {
      round: r,
      totalTime: totalTime(rd),
      productive: rd.newContentItems + rd.productiveReviewItems,
      listeningSeeds: rd.listeningBatchSeedCount,
      batchPlayed: rd.listeningBatchPlayed + 1, // 1-indexed for display
      isListeningRound: rd.isListeningRound,
    };
  });

  return {
    avgRoundTime, maxRoundTime, maxRoundNumber,
    firstListeningRound, lastListeningSeedRound: lastListeningSeedRound <= params.totalLegos ? lastListeningSeedRound : 0,
    avgRoundsBetweenBatchReplay, milestones,
  };
});

function formatTime(seconds: number): string {
  if (!seconds && seconds !== 0) return '—';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// --- D3 Chart ---

let resizeObserver: ResizeObserver | null = null;

function renderChart() {
  const container = chartContainer.value;
  if (!container) return;

  const data = roundData.value;
  if (data.length === 0) return;

  d3.select(container).selectAll('*').remove();

  const containerWidth = container.clientWidth;
  const margin = { top: 20, right: 30, bottom: 40, left: 55 };
  const width = containerWidth - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  const svg = d3.select(container)
    .append('svg')
    .attr('width', containerWidth)
    .attr('height', 500)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const keys = ['newContentTime', 'productiveReviewTime', 'listeningNormalTime', 'listeningFastTime'] as const;
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#a855f7'];

  const stack = d3.stack<RoundData>()
    .keys(keys as any)
    .order(d3.stackOrderNone)
    .offset(d3.stackOffsetNone);

  const series = stack(data);

  const x = d3.scaleLinear()
    .domain([1, data.length])
    .range([0, width]);

  const maxY = d3.max(series, s => d3.max(s, d => d[1])) || 300;
  const y = d3.scaleLinear()
    .domain([0, Math.max(maxY * 1.05, params.roundTimeTarget * 1.2)])
    .range([height, 0]);

  // Use stepAfter to show the discrete nature of listening spikes
  const area = d3.area<d3.SeriesPoint<RoundData>>()
    .x(d => x(d.data.round))
    .y0(d => y(d[0]))
    .y1(d => y(d[1]))
    .curve(d3.curveStepAfter);

  // Stacked areas
  svg.selectAll('.area-layer')
    .data(series)
    .join('path')
    .attr('class', 'area-layer')
    .attr('d', area as any)
    .attr('fill', (_, i) => colors[i])
    .attr('opacity', 0.8);

  // Listening start marker
  const firstLR = summaryStats.value.firstListeningRound;
  if (firstLR > 0 && firstLR <= data.length) {
    svg.append('line')
      .attr('x1', x(firstLR))
      .attr('x2', x(firstLR))
      .attr('y1', 0)
      .attr('y2', height)
      .attr('stroke', '#a855f7')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,3')
      .attr('opacity', 0.6);
    svg.append('text')
      .attr('x', x(firstLR) + 4)
      .attr('y', 12)
      .attr('fill', '#a855f7')
      .attr('font-size', '10px')
      .text('S1 graduates');
  }

  // Batch boundary markers (when each new batch starts receiving seeds)
  const batchSz = params.batchSize;
  const batchCt = params.batchCount;
  for (let b = 1; b < batchCt; b++) {
    const boundarySeed = b * batchSz + 1; // first seed of batch b+1
    const boundaryRound = Math.ceil(boundarySeed * params.legosPerSeed) + params.listeningOffset;
    if (boundaryRound > 0 && boundaryRound <= data.length) {
      svg.append('line')
        .attr('x1', x(boundaryRound))
        .attr('x2', x(boundaryRound))
        .attr('y1', 0)
        .attr('y2', height)
        .attr('stroke', '#a855f7')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '2,4')
        .attr('opacity', 0.35);
      svg.append('text')
        .attr('x', x(boundaryRound) + 4)
        .attr('y', 12 + b * 12)
        .attr('fill', '#a855f7')
        .attr('font-size', '10px')
        .attr('opacity', 0.6)
        .text(`B${b + 1} starts (S${boundarySeed})`);
    }
  }

  // S80 graduated marker
  const s80Round = summaryStats.value.lastListeningSeedRound;
  if (s80Round > 0 && s80Round <= data.length) {
    svg.append('line')
      .attr('x1', x(s80Round))
      .attr('x2', x(s80Round))
      .attr('y1', 0)
      .attr('y2', height)
      .attr('stroke', '#a855f7')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '6,3')
      .attr('opacity', 0.5);
    svg.append('text')
      .attr('x', x(s80Round) + 4)
      .attr('y', height - 8)
      .attr('fill', '#a855f7')
      .attr('font-size', '10px')
      .text(`S${totalListeningSeeds.value} — all batches full`);
  }

  // Reference line (target)
  svg.append('line')
    .attr('x1', 0)
    .attr('x2', width)
    .attr('y1', y(params.roundTimeTarget))
    .attr('y2', y(params.roundTimeTarget))
    .attr('stroke', '#ef4444')
    .attr('stroke-width', 1.5)
    .attr('stroke-dasharray', '6,4')
    .attr('opacity', 0.8);

  svg.append('text')
    .attr('x', width - 4)
    .attr('y', y(params.roundTimeTarget) - 6)
    .attr('text-anchor', 'end')
    .attr('fill', '#ef4444')
    .attr('font-size', '11px')
    .text(`${formatTime(params.roundTimeTarget)} target`);

  // Axes
  const xAxis = d3.axisBottom(x)
    .ticks(Math.min(data.length, 20))
    .tickFormat(d => `${d}`);

  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(xAxis as any)
    .selectAll('text, line, path')
    .attr('fill', '#94a3b8')
    .attr('stroke', '#94a3b8');

  svg.append('text')
    .attr('x', width / 2)
    .attr('y', height + 35)
    .attr('text-anchor', 'middle')
    .attr('fill', '#94a3b8')
    .attr('font-size', '12px')
    .text('Round number');

  const yAxis = d3.axisLeft(y)
    .ticks(8)
    .tickFormat(d => formatTime(d as number));

  svg.append('g')
    .call(yAxis as any)
    .selectAll('text, line, path')
    .attr('fill', '#94a3b8')
    .attr('stroke', '#94a3b8');

  // Tooltip
  const tooltip = d3.select(container)
    .append('div')
    .style('position', 'absolute')
    .style('pointer-events', 'none')
    .style('background', 'rgba(15, 23, 42, 0.95)')
    .style('border', '1px solid #475569')
    .style('border-radius', '8px')
    .style('padding', '10px 14px')
    .style('font-size', '12px')
    .style('color', '#e2e8f0')
    .style('display', 'none')
    .style('z-index', '10')
    .style('white-space', 'nowrap');

  const hoverLine = svg.append('line')
    .attr('y1', 0)
    .attr('y2', height)
    .attr('stroke', '#cbd5e1')
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', '3,3')
    .style('display', 'none');

  svg.append('rect')
    .attr('width', width)
    .attr('height', height)
    .attr('fill', 'transparent')
    .on('mousemove', (event: MouseEvent) => {
      const [mx] = d3.pointer(event);
      const roundNum = Math.round(x.invert(mx));
      const clamped = Math.max(1, Math.min(data.length, roundNum));
      const rd = data[clamped - 1];
      if (!rd) return;

      const total = rd.newContentTime + rd.productiveReviewTime + rd.listeningNormalTime + rd.listeningFastTime;

      let listeningLine: string;
      if (rd.isListeningRound) {
        listeningLine = `<div style="color:#a855f7;font-weight:500">Listening: B${rd.listeningBatchPlayed + 1} (${rd.listeningBatchSeedCount} seeds)</div>`;
      } else if (rd.totalGraduated > 0) {
        listeningLine = `<div style="color:#64748b">${rd.totalGraduated} seeds graduated (no trigger this round)</div>`;
      } else {
        listeningLine = `<div style="color:#64748b">No listening yet</div>`;
      }

      const tooltipX = mx + margin.left + 12;
      const clampedX = Math.min(tooltipX, containerWidth - 260);

      tooltip
        .style('display', 'block')
        .style('left', `${clampedX}px`)
        .style('top', `${Math.max(0, y(total) + margin.top - 10)}px`)
        .html(`
          <div style="font-weight:600;margin-bottom:4px">Round ${clamped} — ${formatTime(total)}</div>
          <div style="color:#3b82f6">New content: ${rd.newContentItems} items (${formatTime(rd.newContentTime)})</div>
          <div style="color:#10b981">Productive review: ${rd.productiveReviewItems} items (${formatTime(rd.productiveReviewTime)})</div>
          ${rd.graduatedFibSlots > 0 ? `<div style="color:#64748b;font-size:11px">${rd.graduatedFibSlots} Fibonacci slots graduated</div>` : ''}
          ${listeningLine}
          ${rd.isListeningRound ? `<div style="color:#f59e0b">&nbsp;&nbsp;Normal: ${rd.listeningNormalPlays} plays (${formatTime(rd.listeningNormalTime)})</div>` : ''}
          ${rd.isListeningRound ? `<div style="color:#a855f7">&nbsp;&nbsp;Double: ${rd.listeningFastPlays} plays (${formatTime(rd.listeningFastTime)})</div>` : ''}
        `);

      hoverLine
        .attr('x1', x(clamped))
        .attr('x2', x(clamped))
        .style('display', 'block');
    })
    .on('mouseleave', () => {
      tooltip.style('display', 'none');
      hoverLine.style('display', 'none');
    });
}

watch([roundData, () => params.roundTimeTarget], () => {
  nextTick(renderChart);
});

onMounted(() => {
  nextTick(renderChart);

  if (chartContainer.value) {
    resizeObserver = new ResizeObserver(() => {
      renderChart();
    });
    resizeObserver.observe(chartContainer.value);
  }
});

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
});
</script>

<style scoped>
.chart-container {
  position: relative;
  width: 100%;
  min-height: 500px;
}
</style>
