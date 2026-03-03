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
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <!-- Total LEGOs -->
          <div>
            <label class="block text-xs text-slate-400 mb-1">Total LEGOs</label>
            <input
              v-model.number="params.totalLegos"
              type="number" min="1" max="700"
              class="w-full px-2 py-1.5 text-sm bg-slate-700 text-white rounded border border-slate-600 focus:border-purple-500 focus:outline-none"
            />
          </div>

          <!-- Productive Window -->
          <div>
            <label class="block text-xs text-slate-400 mb-1">Productive window: {{ params.productiveWindow }}</label>
            <input
              v-model.number="params.productiveWindow"
              type="range" min="3" max="30"
              class="w-full accent-purple-500"
            />
          </div>

          <!-- Speed Cutover -->
          <div>
            <label class="block text-xs text-slate-400 mb-1">Speed cutover: {{ params.speedCutover }}</label>
            <input
              v-model.number="params.speedCutover"
              type="range" min="1" max="10"
              class="w-full accent-purple-500"
            />
          </div>

          <!-- Extended Schedule -->
          <div class="flex items-end">
            <label class="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input
                v-model="params.extendedSchedule"
                type="checkbox"
                class="accent-purple-500 w-4 h-4"
              />
              Extended Fibonacci
            </label>
          </div>

          <!-- Productive Phrase Time -->
          <div>
            <label class="block text-xs text-slate-400 mb-1">Productive time (s)</label>
            <input
              v-model.number="params.productivePhraseTime"
              type="number" min="5" max="30"
              class="w-full px-2 py-1.5 text-sm bg-slate-700 text-white rounded border border-slate-600 focus:border-purple-500 focus:outline-none"
            />
          </div>

          <!-- Listening Normal Time -->
          <div>
            <label class="block text-xs text-slate-400 mb-1">Listening normal (s)</label>
            <input
              v-model.number="params.listeningNormalTime"
              type="number" min="2" max="10"
              class="w-full px-2 py-1.5 text-sm bg-slate-700 text-white rounded border border-slate-600 focus:border-purple-500 focus:outline-none"
            />
          </div>

          <!-- Listening Fast Time -->
          <div>
            <label class="block text-xs text-slate-400 mb-1">Listening fast (s)</label>
            <input
              v-model.number="params.listeningFastTime"
              type="number" min="1" max="8"
              class="w-full px-2 py-1.5 text-sm bg-slate-700 text-white rounded border border-slate-600 focus:border-purple-500 focus:outline-none"
            />
          </div>

          <!-- Avg New Content Items -->
          <div>
            <label class="block text-xs text-slate-400 mb-1">New content items</label>
            <input
              v-model.number="params.avgNewContentItems"
              type="number" min="5" max="25"
              class="w-full px-2 py-1.5 text-sm bg-slate-700 text-white rounded border border-slate-600 focus:border-purple-500 focus:outline-none"
            />
          </div>

          <!-- Round Time Target -->
          <div>
            <label class="block text-xs text-slate-400 mb-1">Target round (s)</label>
            <input
              v-model.number="params.roundTimeTarget"
              type="number" min="120" max="600" step="30"
              class="w-full px-2 py-1.5 text-sm bg-slate-700 text-white rounded border border-slate-600 focus:border-purple-500 focus:outline-none"
            />
          </div>

          <!-- Max Listening Items -->
          <div>
            <label class="block text-xs text-slate-400 mb-1">Max listening items</label>
            <input
              v-model.number="params.maxListeningItems"
              type="number" min="0" max="100" step="1"
              class="w-full px-2 py-1.5 text-sm bg-slate-700 text-white rounded border border-slate-600 focus:border-purple-500 focus:outline-none"
            />
            <span class="text-xs text-slate-500">0 = unlimited</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Summary Stats -->
    <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
      <div class="bg-slate-800 rounded-lg p-3 border border-slate-700">
        <div class="text-xs text-slate-400">Avg round</div>
        <div class="text-lg font-bold text-white">{{ formatTime(summaryStats.avgRoundTime) }}</div>
      </div>
      <div class="bg-slate-800 rounded-lg p-3 border border-slate-700">
        <div class="text-xs text-slate-400">Max round</div>
        <div class="text-lg font-bold text-white">{{ formatTime(summaryStats.maxRoundTime) }}</div>
        <div class="text-xs text-slate-500">Round {{ summaryStats.maxRoundNumber }}</div>
      </div>
      <div v-for="milestone in summaryStats.milestones" :key="milestone.round"
        class="bg-slate-800 rounded-lg p-3 border border-slate-700">
        <div class="text-xs text-slate-400">Round {{ milestone.round }}</div>
        <div class="text-sm font-bold text-white">{{ formatTime(milestone.totalTime) }}</div>
        <div class="text-xs text-slate-500">
          {{ milestone.productive }}p + {{ milestone.listening }}l
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
        Listening (fast)
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
const EXTENDED_FIBONACCI = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610];

const controlsOpen = ref(false);
const chartContainer = ref<HTMLElement | null>(null);

const params = reactive({
  totalLegos: props.totalLegos || 50,
  productiveWindow: 10,
  speedCutover: 3,
  extendedSchedule: true,
  productivePhraseTime: 15,
  listeningNormalTime: 5,
  listeningFastTime: 3,
  avgNewContentItems: 12,
  roundTimeTarget: 300,
  maxListeningItems: 0,
});

// Sync prop changes
watch(() => props.totalLegos, (v) => {
  if (v && v > 0) params.totalLegos = v;
});

interface RoundData {
  round: number;
  newContentTime: number;
  productiveReviewTime: number;
  listeningNormalTime: number;
  listeningFastTime: number;
  newContentItems: number;
  productiveReviewItems: number;
  listeningNormalItems: number;
  listeningFastItems: number;
}

const roundData = computed<RoundData[]>(() => {
  const data: RoundData[] = [];
  const total = Math.max(1, params.totalLegos);
  const fibSet = params.extendedSchedule ? EXTENDED_FIBONACCI : FIBONACCI;

  for (let N = 1; N <= total; N++) {
    // 1. New content
    const newContentItems = params.avgNewContentItems;
    const newContentTime = newContentItems * params.productivePhraseTime;

    // 2. Productive review — Fibonacci offsets within productive window
    let productiveReviewItems = 0;
    for (const f of FIBONACCI) {
      if (f > params.productiveWindow) break;
      if (N - f >= 1) {
        productiveReviewItems += (f === 1) ? 3 : 1; // N-1 gets 3 items (isFirstRevisit)
      }
    }
    const productiveReviewTime = productiveReviewItems * params.productivePhraseTime;

    // 3. Listening review — Fibonacci offsets beyond productive window
    let listeningNormalItems = 0;
    let listeningFastItems = 0;
    let positionBeyond = 0;

    for (const f of fibSet) {
      if (f <= params.productiveWindow) continue;
      if (N - f < 1) continue;
      positionBeyond++;
      if (positionBeyond <= params.speedCutover) {
        listeningNormalItems++;
      } else {
        listeningFastItems++;
      }
    }

    // Apply max listening items cap
    if (params.maxListeningItems > 0) {
      const totalListening = listeningNormalItems + listeningFastItems;
      if (totalListening > params.maxListeningItems) {
        // Keep the most recent (normal speed) ones, trim fast ones first
        const excess = totalListening - params.maxListeningItems;
        const fastTrim = Math.min(excess, listeningFastItems);
        listeningFastItems -= fastTrim;
        const normalTrim = excess - fastTrim;
        listeningNormalItems -= normalTrim;
      }
    }

    const listeningNormalTime = listeningNormalItems * params.listeningNormalTime;
    const listeningFastTime = listeningFastItems * params.listeningFastTime;

    data.push({
      round: N,
      newContentTime,
      productiveReviewTime,
      listeningNormalTime,
      listeningFastTime,
      newContentItems,
      productiveReviewItems,
      listeningNormalItems,
      listeningFastItems,
    });
  }

  return data;
});

const summaryStats = computed(() => {
  const data = roundData.value;
  if (data.length === 0) {
    return { avgRoundTime: 0, maxRoundTime: 0, maxRoundNumber: 0, milestones: [] };
  }

  const totalTime = (r: RoundData) =>
    r.newContentTime + r.productiveReviewTime + r.listeningNormalTime + r.listeningFastTime;

  const times = data.map(totalTime);
  const avgRoundTime = times.reduce((a, b) => a + b, 0) / times.length;
  const maxRoundTime = Math.max(...times);
  const maxRoundNumber = times.indexOf(maxRoundTime) + 1;

  const milestoneRounds = [50, 100, 200, 300].filter(r => r <= data.length);
  const milestones = milestoneRounds.map(r => {
    const rd = data[r - 1];
    return {
      round: r,
      totalTime: totalTime(rd),
      productive: rd.newContentItems + rd.productiveReviewItems,
      listening: rd.listeningNormalItems + rd.listeningFastItems,
    };
  });

  return { avgRoundTime, maxRoundTime, maxRoundNumber, milestones };
});

function formatTime(seconds: number): string {
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

  // Clear previous
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

  // Prepare stack data
  const keys = ['newContentTime', 'productiveReviewTime', 'listeningNormalTime', 'listeningFastTime'] as const;
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#a855f7']; // blue-500, emerald-500, amber-500, purple-500

  const stack = d3.stack<RoundData>()
    .keys(keys as any)
    .order(d3.stackOrderNone)
    .offset(d3.stackOffsetNone);

  const series = stack(data);

  // Scales
  const x = d3.scaleLinear()
    .domain([1, data.length])
    .range([0, width]);

  const maxY = d3.max(series, s => d3.max(s, d => d[1])) || 300;
  const y = d3.scaleLinear()
    .domain([0, Math.max(maxY * 1.05, params.roundTimeTarget * 1.2)])
    .range([height, 0]);

  // Area generator
  const area = d3.area<d3.SeriesPoint<RoundData>>()
    .x(d => x(d.data.round))
    .y0(d => y(d[0]))
    .y1(d => y(d[1]))
    .curve(d3.curveMonotoneX);

  // Draw stacked areas
  svg.selectAll('.area-layer')
    .data(series)
    .join('path')
    .attr('class', 'area-layer')
    .attr('d', area as any)
    .attr('fill', (_, i) => colors[i])
    .attr('opacity', 0.8);

  // Reference line (round time target)
  svg.append('line')
    .attr('x1', 0)
    .attr('x2', width)
    .attr('y1', y(params.roundTimeTarget))
    .attr('y2', y(params.roundTimeTarget))
    .attr('stroke', '#ef4444')
    .attr('stroke-width', 1.5)
    .attr('stroke-dasharray', '6,4')
    .attr('opacity', 0.8);

  // Target label
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

  // Hover line
  const hoverLine = svg.append('line')
    .attr('y1', 0)
    .attr('y2', height)
    .attr('stroke', '#cbd5e1')
    .attr('stroke-width', 1)
    .attr('stroke-dasharray', '3,3')
    .style('display', 'none');

  // Invisible overlay for mouse events
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

      tooltip
        .style('display', 'block')
        .style('left', `${mx + margin.left + 12}px`)
        .style('top', `${y(total) + margin.top - 10}px`)
        .html(`
          <div style="font-weight:600;margin-bottom:4px">Round ${clamped} — ${formatTime(total)}</div>
          <div style="color:#3b82f6">New content: ${rd.newContentItems} items (${formatTime(rd.newContentTime)})</div>
          <div style="color:#10b981">Productive review: ${rd.productiveReviewItems} items (${formatTime(rd.productiveReviewTime)})</div>
          <div style="color:#f59e0b">Listening normal: ${rd.listeningNormalItems} items (${formatTime(rd.listeningNormalTime)})</div>
          <div style="color:#a855f7">Listening fast: ${rd.listeningFastItems} items (${formatTime(rd.listeningFastTime)})</div>
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

// Watch for param changes and re-render
watch([roundData, () => params.roundTimeTarget], () => {
  nextTick(renderChart);
});

onMounted(() => {
  nextTick(renderChart);

  // Responsive resize
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
