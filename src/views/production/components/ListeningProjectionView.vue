<template>
  <div class="listening-projection px-2">
    <!-- Controls Panel (collapsible) -->
    <div class="mb-4">
      <button
        @click="controlsOpen = !controlsOpen"
        class="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors mb-2"
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

      <div v-show="controlsOpen" class="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <!-- Row 1: Course shape -->
        <div class="text-xs text-slate-500 uppercase tracking-wider mb-2">Course shape</div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label class="block text-xs text-slate-400 mb-1">Total LEGOs (rounds)</label>
            <input
              v-model.number="params.totalLegos"
              type="number" min="1" max="700"
              class="w-full px-2 py-1.5 text-sm bg-slate-700 text-white rounded border border-slate-600 focus:border-purple-500 focus:outline-none"
            />
          </div>
          <div>
            <label class="block text-xs text-slate-400 mb-1">LEGOs per seed</label>
            <input
              v-model.number="params.legosPerSeed"
              type="number" min="1" max="5" step="0.1"
              class="w-full px-2 py-1.5 text-sm bg-slate-700 text-white rounded border border-slate-600 focus:border-purple-500 focus:outline-none"
            />
            <span class="text-xs text-slate-500">{{ derivedSeedCount }} seeds</span>
          </div>
          <div>
            <label class="block text-xs text-slate-400 mb-1">New content items/round</label>
            <input
              v-model.number="params.avgNewContentItems"
              type="number" min="5" max="25"
              class="w-full px-2 py-1.5 text-sm bg-slate-700 text-white rounded border border-slate-600 focus:border-purple-500 focus:outline-none"
            />
          </div>
          <div>
            <label class="block text-xs text-slate-400 mb-1">Target round time (s)</label>
            <input
              v-model.number="params.roundTimeTarget"
              type="number" min="120" max="600" step="30"
              class="w-full px-2 py-1.5 text-sm bg-slate-700 text-white rounded border border-slate-600 focus:border-purple-500 focus:outline-none"
            />
          </div>
        </div>

        <!-- Row 2: Listening parameters -->
        <div class="text-xs text-slate-500 uppercase tracking-wider mb-2">Listening</div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label class="block text-xs text-slate-400 mb-1">Listening offset: {{ params.listeningOffset }}</label>
            <input
              v-model.number="params.listeningOffset"
              type="range" min="30" max="150"
              class="w-full accent-purple-500"
            />
          </div>
          <div>
            <label class="block text-xs text-slate-400 mb-1">Seeds in listening pool</label>
            <input
              v-model.number="params.listeningSeedCount"
              type="number" min="1" max="100"
              class="w-full px-2 py-1.5 text-sm bg-slate-700 text-white rounded border border-slate-600 focus:border-purple-500 focus:outline-none"
            />
          </div>
          <div>
            <label class="block text-xs text-slate-400 mb-1">Build-up frequency: {{ params.buildupFrequency }}</label>
            <input
              v-model.number="params.buildupFrequency"
              type="range" min="1" max="5"
              class="w-full accent-purple-500"
            />
            <span class="text-xs text-slate-500">every {{ params.buildupFrequency }} rounds</span>
          </div>
          <div>
            <label class="block text-xs text-slate-400 mb-1">Steady frequency: {{ params.steadyFrequency }}</label>
            <input
              v-model.number="params.steadyFrequency"
              type="range" min="1" max="5"
              class="w-full accent-purple-500"
            />
            <span class="text-xs text-slate-500">every {{ params.steadyFrequency }} rounds</span>
          </div>
        </div>

        <!-- Row 3: Timing -->
        <div class="text-xs text-slate-500 uppercase tracking-wider mb-2">Item timing</div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label class="block text-xs text-slate-400 mb-1">Productive phrase (s)</label>
            <input
              v-model.number="params.productivePhraseTime"
              type="number" min="5" max="30"
              class="w-full px-2 py-1.5 text-sm bg-slate-700 text-white rounded border border-slate-600 focus:border-purple-500 focus:outline-none"
            />
          </div>
          <div>
            <label class="block text-xs text-slate-400 mb-1">Listening normal (s)</label>
            <input
              v-model.number="params.listeningNormalTime"
              type="number" min="2" max="10"
              class="w-full px-2 py-1.5 text-sm bg-slate-700 text-white rounded border border-slate-600 focus:border-purple-500 focus:outline-none"
            />
          </div>
          <div>
            <label class="block text-xs text-slate-400 mb-1">Listening double (s)</label>
            <input
              v-model.number="params.listeningFastTime"
              type="number" min="1" max="8"
              class="w-full px-2 py-1.5 text-sm bg-slate-700 text-white rounded border border-slate-600 focus:border-purple-500 focus:outline-none"
            />
          </div>
          <div>
            <label class="block text-xs text-slate-400 mb-1">Build-up mode</label>
            <select
              v-model="params.buildupMode"
              class="w-full px-2 py-1.5 text-sm bg-slate-700 text-white rounded border border-slate-600 focus:border-purple-500 focus:outline-none"
            >
              <option value="fixed_cadence">Fixed cadence</option>
              <option value="on_arrival">On seed arrival</option>
            </select>
          </div>
        </div>

        <!-- Speed progression (read-only display) -->
        <div class="text-xs text-slate-500 uppercase tracking-wider mb-2">Speed progression per seed</div>
        <div class="flex gap-3 text-xs text-slate-400">
          <span class="bg-slate-700 px-2 py-1 rounded">Plays 1-3: normal</span>
          <span class="bg-slate-700 px-2 py-1 rounded">Plays 4-6: normal + double</span>
          <span class="bg-slate-700 px-2 py-1 rounded">Plays 7-9: double + double</span>
          <span class="bg-slate-700 px-2 py-1 rounded">Plays 10+: double only</span>
        </div>
      </div>
    </div>

    <!-- Summary Stats -->
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
      <div class="bg-slate-800 rounded-lg p-3 border border-slate-700">
        <div class="text-xs text-slate-400">Avg round</div>
        <div class="text-lg font-bold text-white">{{ formatTime(summaryStats.avgRoundTime) }}</div>
      </div>
      <div class="bg-slate-800 rounded-lg p-3 border border-slate-700">
        <div class="text-xs text-slate-400">Max round</div>
        <div class="text-lg font-bold text-white">{{ formatTime(summaryStats.maxRoundTime) }}</div>
        <div class="text-xs text-slate-500">Round {{ summaryStats.maxRoundNumber }}</div>
      </div>
      <div class="bg-slate-800 rounded-lg p-3 border border-slate-700">
        <div class="text-xs text-slate-400">Listening starts</div>
        <div class="text-lg font-bold text-purple-400">Round {{ summaryStats.firstListeningRound || '—' }}</div>
      </div>
      <div class="bg-slate-800 rounded-lg p-3 border border-slate-700">
        <div class="text-xs text-slate-400">Pool full</div>
        <div class="text-lg font-bold text-purple-400">Round {{ summaryStats.poolFullRound || '—' }}</div>
        <div class="text-xs text-slate-500">{{ params.listeningSeedCount }} seeds</div>
      </div>
      <div v-for="milestone in summaryStats.milestones" :key="milestone.round"
        class="bg-slate-800 rounded-lg p-3 border border-slate-700">
        <div class="text-xs text-slate-400">Round {{ milestone.round }}</div>
        <div class="text-sm font-bold text-white">{{ formatTime(milestone.totalTime) }}</div>
        <div class="text-xs text-slate-500">
          {{ milestone.productive }}p + {{ milestone.listeningSeeds }}l
          <span v-if="milestone.isListeningRound" class="text-purple-400 ml-1">(listening)</span>
        </div>
      </div>
    </div>

    <!-- Chart -->
    <div class="bg-slate-800 rounded-lg border border-slate-700 p-4">
      <div ref="chartContainer" class="chart-container"></div>
    </div>

    <!-- Legend -->
    <div class="flex items-center gap-6 mt-3 text-xs text-slate-400 justify-center">
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

const FIBONACCI = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

const controlsOpen = ref(false);
const chartContainer = ref<HTMLElement | null>(null);

const params = reactive({
  totalLegos: props.totalLegos || 300,
  legosPerSeed: 2.1,
  avgNewContentItems: 12,
  roundTimeTarget: 300,
  // Listening params
  listeningOffset: 90,
  listeningSeedCount: 20,
  buildupFrequency: 2,
  steadyFrequency: 3,
  buildupMode: 'fixed_cadence' as 'fixed_cadence' | 'on_arrival',
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

// --- Speed progression ---
// Each seed tracks how many "play events" it has had.
// Per play event, the audio plays are:
//   Plays 1-3:  1× normal
//   Plays 4-6:  1× normal + 1× double
//   Plays 7-9:  2× double
//   Plays 10+:  1× double
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
  listeningPoolSize: number;
  listeningNormalPlays: number;
  listeningFastPlays: number;
  isListeningRound: boolean;
  graduatedLegoCount: number;
}

const roundData = computed<RoundData[]>(() => {
  const data: RoundData[] = [];
  const total = Math.max(1, params.totalLegos);
  const lps = params.legosPerSeed;

  // Precompute: when does each seed become available for listening?
  // Seed S's last LEGO is at round ceil(S * legosPerSeed).
  // Seed S enters listening pool at that round + listeningOffset.
  const seedCount = Math.min(params.listeningSeedCount, Math.floor(total / lps));
  const seedAvailableAt: number[] = []; // index 0 = seed 1
  for (let s = 1; s <= seedCount; s++) {
    seedAvailableAt.push(Math.ceil(s * lps) + params.listeningOffset);
  }

  // Track play counts per seed
  const seedPlayCounts = new Array(seedCount).fill(0);

  // Track listening round cadence
  let firstListeningRound = -1;
  let poolFullRound = -1;
  let lastListeningRound = -1;

  for (let N = 1; N <= total; N++) {
    // 1. Determine listening pool at this round
    let poolSize = 0;
    let newSeedArrived = false;
    for (let s = 0; s < seedCount; s++) {
      if (N >= seedAvailableAt[s]) {
        poolSize++;
        if (N === seedAvailableAt[s]) newSeedArrived = true;
      }
    }

    if (poolSize > 0 && firstListeningRound < 0) firstListeningRound = N;
    if (poolSize >= seedCount && poolFullRound < 0) poolFullRound = N;

    // 2. Is this a listening round?
    let isListeningRound = false;
    if (poolSize > 0) {
      if (params.buildupMode === 'on_arrival') {
        // Trigger on any round a new seed arrives
        // In steady state (pool full), use steady frequency
        if (poolSize < seedCount) {
          isListeningRound = newSeedArrived;
        } else {
          if (lastListeningRound < 0) {
            isListeningRound = true;
          } else {
            isListeningRound = (N - lastListeningRound) >= params.steadyFrequency;
          }
        }
      } else {
        // Fixed cadence
        if (poolSize < seedCount) {
          // Build-up phase
          if (firstListeningRound > 0) {
            isListeningRound = ((N - firstListeningRound) % params.buildupFrequency === 0);
          }
        } else {
          // Steady state
          if (poolFullRound > 0) {
            isListeningRound = ((N - poolFullRound) % params.steadyFrequency === 0);
          }
        }
      }
    }

    // 3. Compute listening time
    let listeningNormalTime = 0;
    let listeningFastTime = 0;
    let listeningNormalPlays = 0;
    let listeningFastPlays = 0;

    if (isListeningRound) {
      lastListeningRound = N;
      for (let s = 0; s < seedCount; s++) {
        if (N >= seedAvailableAt[s]) {
          seedPlayCounts[s]++;
          const timing = listeningTimeForPlay(
            seedPlayCounts[s],
            params.listeningNormalTime,
            params.listeningFastTime
          );
          listeningNormalTime += timing.normal;
          listeningFastTime += timing.fast;
          if (timing.normal > 0) listeningNormalPlays++;
          if (timing.fast > 0) listeningFastPlays += (seedPlayCounts[s] >= 7 && seedPlayCounts[s] <= 9) ? 2 : 1;
        }
      }
    }

    // 4. Productive review — Fibonacci offsets, skipping graduated LEGOs
    // A LEGO introduced at round R belongs to seed ceil(R / legosPerSeed).
    // If that seed has entered the listening pool, skip it.
    let productiveReviewItems = 0;
    let graduatedLegoCount = 0;
    for (const f of FIBONACCI) {
      const legoRound = N - f;
      if (legoRound < 1) continue;

      // Which seed does this LEGO belong to?
      const legoSeed = Math.ceil(legoRound / lps); // 1-indexed

      // Has this seed graduated to listening?
      if (legoSeed <= seedCount && N >= seedAvailableAt[legoSeed - 1]) {
        graduatedLegoCount++;
        continue; // skip — graduated to listening
      }

      productiveReviewItems += (f === 1) ? 3 : 1;
    }

    const productiveReviewTime = productiveReviewItems * params.productivePhraseTime;

    // 5. New content
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
      listeningPoolSize: poolSize,
      listeningNormalPlays,
      listeningFastPlays,
      isListeningRound,
      graduatedLegoCount,
    });
  }

  return data;
});

const summaryStats = computed(() => {
  const data = roundData.value;
  if (data.length === 0) {
    return {
      avgRoundTime: 0, maxRoundTime: 0, maxRoundNumber: 0,
      firstListeningRound: 0, poolFullRound: 0, milestones: [],
    };
  }

  const totalTime = (r: RoundData) =>
    r.newContentTime + r.productiveReviewTime + r.listeningNormalTime + r.listeningFastTime;

  const times = data.map(totalTime);
  const avgRoundTime = times.reduce((a, b) => a + b, 0) / times.length;
  const maxRoundTime = Math.max(...times);
  const maxRoundNumber = times.indexOf(maxRoundTime) + 1;

  const firstListeningRound = data.find(r => r.isListeningRound)?.round || 0;
  const poolFullRound = data.find(r => r.listeningPoolSize >= params.listeningSeedCount)?.round || 0;

  const milestoneRounds = [100, 200, 300, 500].filter(r => r <= data.length);
  const milestones = milestoneRounds.map(r => {
    const rd = data[r - 1];
    return {
      round: r,
      totalTime: totalTime(rd),
      productive: rd.newContentItems + rd.productiveReviewItems,
      listeningSeeds: rd.listeningPoolSize,
      isListeningRound: rd.isListeningRound,
    };
  });

  return { avgRoundTime, maxRoundTime, maxRoundNumber, firstListeningRound, poolFullRound, milestones };
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

  const area = d3.area<d3.SeriesPoint<RoundData>>()
    .x(d => x(d.data.round))
    .y0(d => y(d[0]))
    .y1(d => y(d[1]))
    .curve(d3.curveMonotoneX);

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
      .text('listening starts');
  }

  // Pool full marker
  const pfr = summaryStats.value.poolFullRound;
  if (pfr > 0 && pfr <= data.length && pfr !== firstLR) {
    svg.append('line')
      .attr('x1', x(pfr))
      .attr('x2', x(pfr))
      .attr('y1', 0)
      .attr('y2', height)
      .attr('stroke', '#a855f7')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '4,3')
      .attr('opacity', 0.4);
    svg.append('text')
      .attr('x', x(pfr) + 4)
      .attr('y', 24)
      .attr('fill', '#a855f7')
      .attr('font-size', '10px')
      .text('pool full');
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

      const listeningLine = rd.isListeningRound
        ? `<div style="color:#a855f7;font-weight:500">Listening round — ${rd.listeningPoolSize} seeds in pool</div>`
        : `<div style="color:#64748b">${rd.listeningPoolSize > 0 ? rd.listeningPoolSize + ' seeds in pool (no listening this round)' : 'No listening yet'}</div>`;

      // Clamp tooltip to stay within chart
      const tooltipX = mx + margin.left + 12;
      const clampedX = Math.min(tooltipX, containerWidth - 220);

      tooltip
        .style('display', 'block')
        .style('left', `${clampedX}px`)
        .style('top', `${Math.max(0, y(total) + margin.top - 10)}px`)
        .html(`
          <div style="font-weight:600;margin-bottom:4px">Round ${clamped} — ${formatTime(total)}</div>
          <div style="color:#3b82f6">New content: ${rd.newContentItems} items (${formatTime(rd.newContentTime)})</div>
          <div style="color:#10b981">Productive review: ${rd.productiveReviewItems} items (${formatTime(rd.productiveReviewTime)})</div>
          ${rd.graduatedLegoCount > 0 ? `<div style="color:#64748b;font-size:11px">${rd.graduatedLegoCount} Fibonacci slots graduated</div>` : ''}
          ${listeningLine}
          ${rd.isListeningRound ? `<div style="color:#f59e0b">  Normal plays: ${rd.listeningNormalPlays} (${formatTime(rd.listeningNormalTime)})</div>` : ''}
          ${rd.isListeningRound ? `<div style="color:#a855f7">  Double plays: ${rd.listeningFastPlays} (${formatTime(rd.listeningFastTime)})</div>` : ''}
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
