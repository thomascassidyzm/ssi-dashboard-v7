<template>
  <div class="min-h-screen bg-slate-900 text-slate-100 p-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <router-link
          :to="`/quality/${courseCode}`"
          class="text-emerald-400 hover:text-emerald-300 mb-4 inline-block"
        >
          ← Back to Quality Dashboard
        </router-link>

        <div class="flex items-start justify-between">
          <div>
            <h1 class="text-4xl font-bold text-emerald-400 mb-2">Course Health Report</h1>
            <p class="text-slate-400">{{ courseCode }} - Last updated {{ lastUpdated }}</p>
          </div>

          <!-- Overall Health Score -->
          <div class="text-center">
            <div class="text-sm text-slate-400 mb-1">Overall Health</div>
            <div class="relative w-32 h-32">
              <svg class="transform -rotate-90" width="128" height="128">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  stroke-width="8"
                  fill="none"
                  class="text-slate-700"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  stroke-width="8"
                  fill="none"
                  :stroke-dasharray="`${healthScore * 3.52} 352`"
                  :class="getHealthColor(healthScore)"
                  class="transition-all duration-1000"
                />
              </svg>
              <div class="absolute inset-0 flex items-center justify-center">
                <div class="text-center">
                  <div class="text-3xl font-bold" :class="getHealthColor(healthScore)">
                    {{ healthScore }}
                  </div>
                  <div class="text-xs text-slate-500">/ 100</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Health Factors -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div
          v-for="factor in healthFactors"
          :key="factor.name"
          class="bg-slate-800 border border-slate-700 rounded-lg p-6"
        >
          <div class="flex items-start justify-between mb-3">
            <div class="flex-1">
              <div class="text-sm text-slate-400 mb-1">{{ factor.name }}</div>
              <div class="text-2xl font-bold mb-2" :class="getFactorColor(factor.score)">
                {{ factor.score }}/100
              </div>
            </div>
            <div class="text-3xl">{{ factor.icon }}</div>
          </div>
          <div class="w-full bg-slate-700 rounded-full h-2 mb-2">
            <div
              class="h-2 rounded-full transition-all"
              :class="getFactorColor(factor.score).replace('text-', 'bg-')"
              :style="{ width: `${factor.score}%` }"
            ></div>
          </div>
          <div class="text-xs text-slate-500">{{ factor.description }}</div>
        </div>
      </div>

      <!-- Quality Trend Over Time -->
      <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
        <h3 class="text-lg font-semibold text-emerald-400 mb-4">Quality Trend (Last 30 Days)</h3>

        <div class="h-64 flex items-end gap-1">
          <div
            v-for="(point, idx) in qualityTrend"
            :key="idx"
            class="flex-1 relative group cursor-pointer"
          >
            <!-- Quality bar -->
            <div
              class="absolute bottom-0 w-full rounded-t transition-all"
              :class="getQualityBarColor(point.avgQuality)"
              :style="{ height: `${(point.avgQuality / 10) * 100}%` }"
            >
              <div class="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors"></div>
            </div>

            <!-- Tooltip -->
            <div class="absolute -top-20 left-1/2 transform -translate-x-1/2 bg-slate-900 border border-slate-700 rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
              <div class="text-xs text-slate-400">{{ point.date }}</div>
              <div class="text-sm font-semibold" :class="getQualityColor(point.avgQuality)">
                {{ point.avgQuality.toFixed(1) }} avg quality
              </div>
              <div class="text-xs text-slate-500">{{ point.seedsProcessed }} SEEDs</div>
            </div>
          </div>
        </div>

        <div class="flex justify-between mt-4 text-xs text-slate-500">
          <span>{{ qualityTrend[0]?.date }}</span>
          <span>{{ qualityTrend[qualityTrend.length - 1]?.date }}</span>
        </div>
      </div>

      <!-- Phase Completion Status -->
      <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
        <h3 class="text-lg font-semibold text-emerald-400 mb-4">Phase Completion Status</h3>

        <div class="space-y-4">
          <div
            v-for="phase in phases"
            :key="phase.id"
            class="bg-slate-900/50 border border-slate-700 rounded-lg p-4"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-3">
                <div
                  class="w-8 h-8 rounded-full flex items-center justify-center border-2"
                  :class="getPhaseStatusClass(phase.status)"
                >
                  <span v-if="phase.status === 'complete'">✓</span>
                  <span v-else-if="phase.status === 'in_progress'">...</span>
                  <span v-else>{{ phase.id }}</span>
                </div>
                <div>
                  <div class="text-emerald-400 font-semibold">{{ phase.name }}</div>
                  <div class="text-xs text-slate-500">{{ phase.description }}</div>
                </div>
              </div>
              <div class="text-right">
                <div class="text-2xl font-bold" :class="getQualityColor(phase.quality)">
                  {{ phase.quality.toFixed(1) }}
                </div>
                <div class="text-xs text-slate-500">avg quality</div>
              </div>
            </div>

            <!-- Progress bar -->
            <div class="w-full bg-slate-700 rounded-full h-2 mt-3">
              <div
                class="h-2 rounded-full transition-all"
                :class="phase.status === 'complete' ? 'bg-emerald-600' : 'bg-blue-600'"
                :style="{ width: `${phase.progress}%` }"
              ></div>
            </div>
            <div class="flex justify-between mt-1 text-xs text-slate-500">
              <span>{{ phase.completed }} / {{ phase.total }} completed</span>
              <span>{{ phase.progress }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Re-run Statistics -->
      <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
        <h3 class="text-lg font-semibold text-emerald-400 mb-4">Re-run Statistics</h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Attempts Distribution -->
          <div>
            <div class="text-sm text-slate-400 mb-3">Distribution of Attempts</div>
            <div class="space-y-2">
              <div
                v-for="dist in attemptsDistribution"
                :key="dist.attempts"
                class="flex items-center gap-3"
              >
                <div class="text-sm text-slate-400 w-20">{{ dist.attempts }} attempt{{ dist.attempts > 1 ? 's' : '' }}</div>
                <div class="flex-1 bg-slate-700 rounded-full h-6">
                  <div
                    class="h-6 rounded-full flex items-center justify-end px-2 transition-all"
                    :class="getAttemptsColor(dist.attempts)"
                    :style="{ width: `${(dist.count / totalSeeds) * 100}%` }"
                  >
                    <span class="text-xs font-semibold text-white">{{ dist.count }}</span>
                  </div>
                </div>
                <div class="text-xs text-slate-500 w-12 text-right">
                  {{ ((dist.count / totalSeeds) * 100).toFixed(1) }}%
                </div>
              </div>
            </div>

            <div class="mt-4 pt-4 border-t border-slate-700">
              <div class="flex justify-between text-sm">
                <span class="text-slate-400">Average Attempts</span>
                <span class="text-emerald-400 font-semibold">{{ avgAttempts.toFixed(1) }}</span>
              </div>
              <div class="flex justify-between text-sm mt-2">
                <span class="text-slate-400">Total Re-runs</span>
                <span class="text-blue-400 font-semibold">{{ totalReruns }}</span>
              </div>
            </div>
          </div>

          <!-- Re-run Reasons -->
          <div>
            <div class="text-sm text-slate-400 mb-3">Common Re-run Triggers</div>
            <div class="space-y-2">
              <div
                v-for="reason in rerunReasons"
                :key="reason.type"
                class="bg-slate-900/50 border border-slate-700 rounded-lg p-3"
              >
                <div class="flex items-start justify-between mb-2">
                  <div class="flex-1">
                    <div class="text-sm font-medium text-emerald-400">{{ reason.type }}</div>
                    <div class="text-xs text-slate-500 mt-1">{{ reason.description }}</div>
                  </div>
                  <div class="text-right ml-3">
                    <div class="text-lg font-bold text-yellow-400">{{ reason.count }}</div>
                    <div class="text-xs text-slate-500">{{ ((reason.count / totalReruns) * 100).toFixed(0) }}%</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Common Concerns/Issues -->
      <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
        <h3 class="text-lg font-semibold text-emerald-400 mb-4">Common Concerns & Issues</h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            v-for="concern in commonConcerns"
            :key="concern.type"
            class="bg-slate-900/50 border border-yellow-700/50 rounded-lg p-4"
          >
            <div class="flex items-start gap-3">
              <div class="text-2xl">⚠️</div>
              <div class="flex-1">
                <div class="flex items-center justify-between mb-2">
                  <div class="text-yellow-400 font-semibold">{{ concern.type }}</div>
                  <div class="text-sm text-yellow-400">{{ concern.frequency }}%</div>
                </div>
                <div class="text-sm text-slate-300 mb-2">{{ concern.description }}</div>
                <div class="text-xs text-slate-500">Affects {{ concern.seedsAffected }} SEEDs</div>

                <!-- Suggested Action -->
                <div class="mt-3 pt-3 border-t border-slate-700">
                  <div class="text-xs text-slate-400 mb-1">Recommended Action:</div>
                  <div class="text-xs text-emerald-400">{{ concern.suggestion }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- System Information -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <!-- Current Configuration -->
        <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h3 class="text-lg font-semibold text-emerald-400 mb-4">Current Configuration</h3>
          <div class="space-y-3 text-sm">
            <div class="flex justify-between">
              <span class="text-slate-400">Prompt Version</span>
              <span class="text-slate-300 font-mono">{{ config.promptVersion }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Model</span>
              <span class="text-slate-300 font-mono">{{ config.model }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Active Rules</span>
              <span class="text-emerald-400 font-semibold">{{ config.activeRules }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Quality Threshold</span>
              <span class="text-emerald-400 font-semibold">{{ config.qualityThreshold }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Max Attempts</span>
              <span class="text-blue-400 font-semibold">{{ config.maxAttempts }}</span>
            </div>
          </div>
        </div>

        <!-- Performance Metrics -->
        <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <h3 class="text-lg font-semibold text-emerald-400 mb-4">Performance Metrics</h3>
          <div class="space-y-3 text-sm">
            <div class="flex justify-between">
              <span class="text-slate-400">Avg Processing Time</span>
              <span class="text-slate-300">{{ performance.avgProcessingTime }}ms</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Total API Calls</span>
              <span class="text-slate-300">{{ performance.totalApiCalls.toLocaleString() }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Success Rate</span>
              <span class="text-emerald-400 font-semibold">{{ performance.successRate }}%</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Error Rate</span>
              <span class="text-red-400 font-semibold">{{ performance.errorRate }}%</span>
            </div>
            <div class="flex justify-between">
              <span class="text-slate-400">Cache Hit Rate</span>
              <span class="text-blue-400 font-semibold">{{ performance.cacheHitRate }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Recommendations -->
      <div class="bg-slate-800 border border-emerald-700/50 rounded-lg p-6 mb-6">
        <h3 class="text-lg font-semibold text-emerald-400 mb-4">System Recommendations</h3>

        <div class="space-y-3">
          <div
            v-for="rec in recommendations"
            :key="rec.id"
            class="bg-slate-900/50 border border-slate-700 rounded-lg p-4"
          >
            <div class="flex items-start gap-3">
              <div
                class="px-2 py-1 rounded text-xs font-medium"
                :class="getPriorityClass(rec.priority)"
              >
                {{ rec.priority }}
              </div>
              <div class="flex-1">
                <div class="text-emerald-400 font-semibold mb-1">{{ rec.title }}</div>
                <div class="text-sm text-slate-300 mb-2">{{ rec.description }}</div>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-slate-500">Impact:</span>
                  <span class="text-xs text-emerald-400">{{ rec.impact }}</span>
                </div>
              </div>
              <button
                @click="applyRecommendation(rec.id)"
                class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Export Actions -->
      <div class="flex items-center justify-end gap-4 sticky bottom-8 bg-slate-800 border border-slate-700 rounded-lg p-6 shadow-xl">
        <button
          @click="exportReport('pdf')"
          class="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg text-lg font-medium transition-colors flex items-center gap-2"
        >
          <span>📄</span>
          Export PDF Report
        </button>
        <button
          @click="exportReport('csv')"
          class="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-lg font-medium transition-colors flex items-center gap-2"
        >
          <span>📊</span>
          Export CSV Data
        </button>
        <button
          @click="scheduleReport"
          class="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-lg font-medium transition-colors flex items-center gap-2"
        >
          <span>📅</span>
          Schedule Reports
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const props = defineProps({
  courseCode: {
    type: String,
    required: true
  }
})

// State
const healthScore = ref(87)
const lastUpdated = ref(new Date().toLocaleString())
const totalSeeds = ref(668)
const totalReruns = ref(423)
const avgAttempts = ref(1.63)

const healthFactors = ref([
  {
    name: 'Extraction Quality',
    score: 89,
    icon: '🎯',
    description: 'Average quality score of LEGO extractions'
  },
  {
    name: 'Coverage',
    score: 92,
    icon: '📊',
    description: 'Percentage of SEEDs with complete LEGO coverage'
  },
  {
    name: 'Consistency',
    score: 85,
    icon: '🔄',
    description: 'Reliability of extraction across similar patterns'
  },
  {
    name: 'Boundary Accuracy',
    score: 88,
    icon: '✂️',
    description: 'Precision of LEGO boundary detection'
  },
  {
    name: 'Semantic Coherence',
    score: 91,
    icon: '🧠',
    description: 'Alignment with semantic units'
  },
  {
    name: 'System Efficiency',
    score: 84,
    icon: '⚡',
    description: 'Re-run rate and processing speed'
  }
])

const qualityTrend = ref(
  Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    avgQuality: 7.0 + Math.random() * 2 + (i * 0.05), // Gradual improvement
    seedsProcessed: Math.floor(20 + Math.random() * 10)
  }))
)

const phases = ref([
  {
    id: 1,
    name: 'Phase 1: Translation Extraction',
    description: 'Extract source and target pairs from corpus',
    status: 'complete',
    progress: 100,
    completed: 668,
    total: 668,
    quality: 9.2
  },
  {
    id: 2,
    name: 'Phase 2: LEGO Extraction',
    description: 'Extract LEGOs from translations',
    status: 'complete',
    progress: 100,
    completed: 668,
    total: 668,
    quality: 8.7
  },
  {
    id: 3,
    name: 'Phase 3: Deduplication',
    description: 'Remove duplicate LEGOs',
    status: 'complete',
    progress: 100,
    completed: 2847,
    total: 2847,
    quality: 9.4
  },
  {
    id: 4,
    name: 'Phase 4: Quality Review',
    description: 'Human review and validation',
    status: 'in_progress',
    progress: 42,
    completed: 281,
    total: 668,
    quality: 8.9
  }
])

const attemptsDistribution = ref([
  { attempts: 1, count: 456 },
  { attempts: 2, count: 142 },
  { attempts: 3, count: 54 },
  { attempts: 4, count: 13 },
  { attempts: 5, count: 3 }
])

const rerunReasons = ref([
  {
    type: 'Low Quality Score',
    description: 'Initial extraction scored below threshold',
    count: 187
  },
  {
    type: 'Boundary Issues',
    description: 'Overlapping or missing LEGO boundaries',
    count: 142
  },
  {
    type: 'Manual Review Request',
    description: 'Human reviewer requested re-extraction',
    count: 68
  },
  {
    type: 'Prompt Update',
    description: 'New prompt version available',
    count: 26
  }
])

const commonConcerns = ref([
  {
    type: 'Overlapping Boundaries',
    description: 'LEGOs with overlapping character spans detected',
    frequency: 8.2,
    seedsAffected: 55,
    suggestion: 'Apply learned rule for verb phrase unification'
  },
  {
    type: 'Missing Coverage',
    description: 'Portions of sentences not covered by any LEGO',
    frequency: 5.1,
    seedsAffected: 34,
    suggestion: 'Review sentence structure patterns'
  },
  {
    type: 'Semantic Mismatch',
    description: 'LEGO boundaries do not align with semantic units',
    frequency: 12.4,
    seedsAffected: 83,
    suggestion: 'Enhance semantic boundary detection rules'
  },
  {
    type: 'Excessive Granularity',
    description: 'Too many small LEGOs reducing teaching utility',
    frequency: 6.7,
    seedsAffected: 45,
    suggestion: 'Adjust LEGO merging thresholds'
  }
])

const config = ref({
  promptVersion: 'v1.2.0',
  model: 'claude-3-5-sonnet-20241022',
  activeRules: 5,
  qualityThreshold: 8.0,
  maxAttempts: 5
})

const performance = ref({
  avgProcessingTime: 2147,
  totalApiCalls: 1891,
  successRate: 89.2,
  errorRate: 2.1,
  cacheHitRate: 34.7
})

const recommendations = ref([
  {
    id: 'rec_001',
    priority: 'High',
    title: 'Enable Experimental Rule: Compound Preposition Handling',
    description: 'A/B testing shows 96.2% confidence that this rule improves quality by +0.8 points',
    impact: '+7.2% quality improvement across 83 affected SEEDs'
  },
  {
    id: 'rec_002',
    priority: 'Medium',
    title: 'Increase Quality Threshold to 8.5',
    description: 'Current acceptance rate suggests threshold can be raised without excessive re-runs',
    impact: 'Higher quality output with estimated +3% re-run rate'
  },
  {
    id: 'rec_003',
    priority: 'Low',
    title: 'Review Phase 4 SEEDs Flagged for Manual Review',
    description: '281 SEEDs still pending human review',
    impact: 'Complete quality validation phase'
  }
])

// Methods
function getHealthColor(score) {
  if (score >= 85) return 'text-emerald-400'
  if (score >= 70) return 'text-lime-400'
  if (score >= 50) return 'text-yellow-400'
  return 'text-red-400'
}

function getFactorColor(score) {
  if (score >= 90) return 'text-emerald-400'
  if (score >= 80) return 'text-lime-400'
  if (score >= 70) return 'text-yellow-400'
  if (score >= 60) return 'text-orange-400'
  return 'text-red-400'
}

function getQualityColor(quality) {
  if (quality >= 9) return 'text-emerald-400'
  if (quality >= 8) return 'text-lime-400'
  if (quality >= 7) return 'text-yellow-400'
  if (quality >= 6) return 'text-orange-400'
  return 'text-red-400'
}

function getQualityBarColor(quality) {
  if (quality >= 9) return 'bg-emerald-600'
  if (quality >= 8) return 'bg-lime-600'
  if (quality >= 7) return 'bg-yellow-600'
  if (quality >= 6) return 'bg-orange-600'
  return 'bg-red-600'
}

function getPhaseStatusClass(status) {
  if (status === 'complete') return 'bg-emerald-600 border-emerald-400 text-white'
  if (status === 'in_progress') return 'bg-blue-600 border-blue-400 text-white'
  return 'bg-slate-700 border-slate-600 text-slate-400'
}

function getAttemptsColor(attempts) {
  if (attempts === 1) return 'bg-emerald-600'
  if (attempts === 2) return 'bg-lime-600'
  if (attempts === 3) return 'bg-yellow-600'
  if (attempts === 4) return 'bg-orange-600'
  return 'bg-red-600'
}

function getPriorityClass(priority) {
  const classes = {
    High: 'bg-red-900/50 text-red-400 border border-red-600/50',
    Medium: 'bg-yellow-900/50 text-yellow-400 border border-yellow-600/50',
    Low: 'bg-blue-900/50 text-blue-400 border border-blue-600/50'
  }
  return classes[priority] || 'bg-slate-700 text-slate-300'
}

function exportReport(format) {
  console.log(`Exporting health report as ${format}`)
  // TODO: Generate and download report
}

function scheduleReport() {
  console.log('Opening schedule report modal')
  // TODO: Open modal for scheduling periodic reports
}

function applyRecommendation(recId) {
  console.log('Applying recommendation:', recId)
  // TODO: API call to apply recommendation
}

// Lifecycle
onMounted(() => {
  console.log('Loading health report for course:', props.courseCode)
})
</script>
