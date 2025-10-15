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
            <h1 class="text-4xl font-bold text-emerald-400 mb-2">Prompt Evolution</h1>
            <p class="text-slate-400">Self-healing prompt learning system</p>
          </div>

          <div class="text-right space-y-2">
            <div>
              <div class="text-sm text-slate-400 mb-1">Current Version</div>
              <div class="text-3xl font-bold text-emerald-400">{{ currentVersion }}</div>
              <div class="text-xs text-slate-500 mt-1">{{ learnedRules.length }} learned rules</div>
            </div>
            <router-link
              :to="`/quality/${courseCode}/learned-rules`"
              class="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition"
            >
              🧠 View Self-Learning Rules
            </router-link>
          </div>
        </div>
      </div>

      <!-- Stats Overview -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div class="text-sm text-slate-400 mb-1">Success Rate</div>
          <div class="text-3xl font-bold text-emerald-400">{{ successRate }}%</div>
          <div class="text-xs text-slate-500 mt-1">
            <span class="text-emerald-400">+{{ improvementRate }}%</span> from v1.0
          </div>
        </div>
        <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div class="text-sm text-slate-400 mb-1">Learned Rules</div>
          <div class="text-3xl font-bold text-blue-400">{{ learnedRules.length }}</div>
          <div class="text-xs text-slate-500 mt-1">{{ experimentalRules.length }} experimental</div>
        </div>
        <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div class="text-sm text-slate-400 mb-1">Avg Quality</div>
          <div class="text-3xl font-bold text-lime-400">{{ avgQuality.toFixed(1) }}</div>
          <div class="text-xs text-slate-500 mt-1">Latest 100 extractions</div>
        </div>
        <div class="bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div class="text-sm text-slate-400 mb-1">Re-run Rate</div>
          <div class="text-3xl font-bold text-yellow-400">{{ rerunRate.toFixed(1) }}%</div>
          <div class="text-xs text-slate-500 mt-1">
            <span class="text-emerald-400">-{{ rerunReduction }}%</span> improvement
          </div>
        </div>
      </div>

      <!-- Version Timeline -->
      <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
        <h3 class="text-lg font-semibold text-emerald-400 mb-4">Version History</h3>

        <div class="relative">
          <!-- Timeline line -->
          <div class="absolute left-8 top-0 bottom-0 w-0.5 bg-slate-700"></div>

          <!-- Version entries -->
          <div class="space-y-6">
            <div
              v-for="version in versions"
              :key="version.version"
              class="relative pl-20 cursor-pointer group"
              @click="selectedVersion = version.version"
            >
              <!-- Timeline marker -->
              <div
                class="absolute left-6 w-5 h-5 rounded-full border-2 transition-all"
                :class="selectedVersion === version.version
                  ? 'bg-emerald-600 border-emerald-400 scale-125'
                  : 'bg-slate-800 border-slate-600 group-hover:border-emerald-500'"
              ></div>

              <!-- Version card -->
              <div
                class="bg-slate-900/50 border rounded-lg p-4 transition-all"
                :class="selectedVersion === version.version
                  ? 'border-emerald-500 shadow-lg shadow-emerald-500/20'
                  : 'border-slate-700 group-hover:border-slate-600'"
              >
                <div class="flex items-start justify-between mb-2">
                  <div>
                    <div class="flex items-center gap-3">
                      <span class="text-emerald-400 font-bold text-lg">{{ version.version }}</span>
                      <span
                        v-if="version.version === currentVersion"
                        class="px-2 py-1 rounded text-xs font-medium bg-emerald-900/50 text-emerald-400 border border-emerald-600/50"
                      >
                        Current
                      </span>
                    </div>
                    <div class="text-sm text-slate-400 mt-1">{{ formatDate(version.timestamp) }}</div>
                  </div>
                  <div class="text-right">
                    <div class="text-2xl font-bold" :class="getQualityColor(version.avgQuality)">
                      {{ version.avgQuality.toFixed(1) }}
                    </div>
                    <div class="text-xs text-slate-500">avg quality</div>
                  </div>
                </div>

                <div class="text-sm text-slate-300 mb-3">{{ version.description }}</div>

                <div class="flex items-center gap-4 text-xs">
                  <div class="flex items-center gap-1">
                    <span class="text-emerald-400">+{{ version.rulesAdded }}</span>
                    <span class="text-slate-500">rules</span>
                  </div>
                  <div class="flex items-center gap-1">
                    <span class="text-blue-400">{{ version.seedsTested }}</span>
                    <span class="text-slate-500">tested</span>
                  </div>
                  <div class="flex items-center gap-1">
                    <span class="text-yellow-400">{{ version.successRate }}%</span>
                    <span class="text-slate-500">success</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Learned Rules -->
      <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-emerald-400">Learned Rules</h3>
          <div class="flex gap-2">
            <button
              v-for="filter in ruleFilters"
              :key="filter.value"
              @click="ruleFilter = filter.value"
              class="px-3 py-1 rounded text-sm transition-colors"
              :class="ruleFilter === filter.value
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'"
            >
              {{ filter.label }}
            </button>
          </div>
        </div>

        <div class="space-y-3">
          <div
            v-for="rule in filteredRules"
            :key="rule.id"
            class="bg-slate-900/50 border border-slate-700 rounded-lg p-4 hover:border-emerald-500/50 transition-colors"
          >
            <div class="flex items-start justify-between mb-3">
              <div class="flex-1">
                <div class="flex items-center gap-3 mb-2">
                  <span class="text-emerald-400 font-semibold">{{ rule.name }}</span>
                  <span
                    class="px-2 py-1 rounded text-xs font-medium"
                    :class="getRuleStatusClass(rule.status)"
                  >
                    {{ rule.status }}
                  </span>
                  <span class="text-xs text-slate-500">Added in {{ rule.version }}</span>
                </div>
                <div class="text-sm text-slate-300 mb-2">{{ rule.description }}</div>
                <div class="text-xs text-slate-400 font-mono bg-slate-900 rounded px-3 py-2 border border-slate-700">
                  {{ rule.rule }}
                </div>
              </div>

              <!-- Rule Stats -->
              <div class="ml-6 text-right">
                <div class="text-2xl font-bold text-emerald-400 mb-1">
                  +{{ rule.improvement }}%
                </div>
                <div class="text-xs text-slate-500">improvement</div>
                <div class="text-xs text-slate-400 mt-2">
                  {{ rule.appliedCount }} applications
                </div>
              </div>
            </div>

            <!-- Before/After Stats -->
            <div class="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-slate-700">
              <div>
                <div class="text-xs text-slate-500 mb-1">Before Rule</div>
                <div class="flex items-center gap-2">
                  <div class="text-sm text-slate-400">{{ rule.beforeStats.avgQuality.toFixed(1) }} avg</div>
                  <div class="text-sm text-slate-500">|</div>
                  <div class="text-sm text-slate-400">{{ rule.beforeStats.successRate }}% success</div>
                </div>
              </div>
              <div>
                <div class="text-xs text-slate-500 mb-1">After Rule</div>
                <div class="flex items-center gap-2">
                  <div class="text-sm text-emerald-400">{{ rule.afterStats.avgQuality.toFixed(1) }} avg</div>
                  <div class="text-sm text-slate-500">|</div>
                  <div class="text-sm text-emerald-400">{{ rule.afterStats.successRate }}% success</div>
                </div>
              </div>
            </div>

            <!-- Example SEEDs -->
            <div class="mt-3">
              <button
                @click="toggleRuleExamples(rule.id)"
                class="text-xs text-emerald-400 hover:text-emerald-300"
              >
                {{ expandedRules.has(rule.id) ? 'Hide' : 'Show' }} example SEEDs ({{ rule.exampleSeeds.length }})
              </button>

              <div v-if="expandedRules.has(rule.id)" class="mt-3 space-y-2">
                <div
                  v-for="seed in rule.exampleSeeds.slice(0, 3)"
                  :key="seed.id"
                  class="bg-slate-900 border border-slate-700 rounded p-3 text-xs"
                >
                  <div class="text-slate-400 mb-1">{{ seed.id }}</div>
                  <div class="text-slate-300">{{ seed.text }}</div>
                  <div class="flex items-center gap-2 mt-2">
                    <span class="text-red-400">{{ seed.beforeQuality.toFixed(1) }}</span>
                    <span class="text-slate-500">→</span>
                    <span class="text-emerald-400">{{ seed.afterQuality.toFixed(1) }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Rule Actions -->
            <div class="flex items-center gap-2 mt-3 pt-3 border-t border-slate-700">
              <button
                v-if="rule.status === 'active'"
                @click="disableRule(rule.id)"
                class="px-3 py-1 bg-yellow-900/50 hover:bg-yellow-900/70 text-yellow-400 rounded text-xs transition-colors"
              >
                Disable Rule
              </button>
              <button
                v-if="rule.status === 'disabled'"
                @click="enableRule(rule.id)"
                class="px-3 py-1 bg-emerald-900/50 hover:bg-emerald-900/70 text-emerald-400 rounded text-xs transition-colors"
              >
                Enable Rule
              </button>
              <button
                @click="viewRuleDetails(rule.id)"
                class="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs transition-colors"
              >
                View Details
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Experimental Rules (A/B Testing) -->
      <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
        <h3 class="text-lg font-semibold text-purple-400 mb-4">Experimental Rules (A/B Testing)</h3>

        <div v-if="experimentalRules.length === 0" class="text-center py-8 text-slate-400">
          No experimental rules currently being tested
        </div>

        <div v-else class="space-y-4">
          <div
            v-for="rule in experimentalRules"
            :key="rule.id"
            class="bg-slate-900/50 border border-purple-700/50 rounded-lg p-4"
          >
            <div class="flex items-start justify-between mb-3">
              <div class="flex-1">
                <div class="flex items-center gap-3 mb-2">
                  <span class="text-purple-400 font-semibold">{{ rule.name }}</span>
                  <span class="px-2 py-1 rounded text-xs font-medium bg-purple-900/50 text-purple-400 border border-purple-600/50">
                    Testing
                  </span>
                </div>
                <div class="text-sm text-slate-300 mb-2">{{ rule.hypothesis }}</div>
              </div>
            </div>

            <!-- A/B Test Results -->
            <div class="grid grid-cols-2 gap-4 mb-3">
              <div class="bg-slate-900 border border-slate-700 rounded p-3">
                <div class="text-xs text-slate-400 mb-2">Control (Without Rule)</div>
                <div class="flex items-center justify-between">
                  <div>
                    <div class="text-2xl font-bold text-slate-300">{{ rule.controlStats.avgQuality.toFixed(1) }}</div>
                    <div class="text-xs text-slate-500">{{ rule.controlStats.sampleSize }} samples</div>
                  </div>
                  <div class="text-sm text-slate-400">{{ rule.controlStats.successRate }}%</div>
                </div>
              </div>

              <div class="bg-slate-900 border border-purple-700/50 rounded p-3">
                <div class="text-xs text-purple-400 mb-2">Treatment (With Rule)</div>
                <div class="flex items-center justify-between">
                  <div>
                    <div class="text-2xl font-bold text-purple-400">{{ rule.treatmentStats.avgQuality.toFixed(1) }}</div>
                    <div class="text-xs text-slate-500">{{ rule.treatmentStats.sampleSize }} samples</div>
                  </div>
                  <div class="text-sm text-purple-400">{{ rule.treatmentStats.successRate }}%</div>
                </div>
              </div>
            </div>

            <!-- Statistical Significance -->
            <div class="bg-slate-900 border border-slate-700 rounded p-3 mb-3">
              <div class="flex items-center justify-between">
                <div class="text-xs text-slate-400">Statistical Confidence</div>
                <div class="flex items-center gap-2">
                  <div class="w-32 bg-slate-700 rounded-full h-2">
                    <div
                      class="h-2 rounded-full transition-all"
                      :class="rule.confidence >= 95 ? 'bg-emerald-600' : 'bg-yellow-600'"
                      :style="{ width: `${rule.confidence}%` }"
                    ></div>
                  </div>
                  <span class="text-sm font-medium" :class="rule.confidence >= 95 ? 'text-emerald-400' : 'text-yellow-400'">
                    {{ rule.confidence }}%
                  </span>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-2">
              <button
                @click="promoteRule(rule.id)"
                :disabled="rule.confidence < 95"
                class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded text-sm transition-colors"
              >
                Promote to Production
              </button>
              <button
                @click="rejectRule(rule.id)"
                class="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded text-sm transition-colors"
              >
                Reject Rule
              </button>
              <button
                @click="extendTest(rule.id)"
                class="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm transition-colors"
              >
                Extend Test (+50 samples)
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Quality Trend Chart -->
      <div class="bg-slate-800 border border-slate-700 rounded-lg p-6 mb-6">
        <h3 class="text-lg font-semibold text-emerald-400 mb-4">Quality Improvement Over Time</h3>

        <div class="h-64 flex items-end gap-2">
          <div
            v-for="(point, idx) in qualityTrend"
            :key="idx"
            class="flex-1 relative group cursor-pointer"
          >
            <div
              class="absolute bottom-0 w-full rounded-t transition-all bg-emerald-600"
              :style="{ height: `${(point.quality / 10) * 100}%` }"
            >
              <div class="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors"></div>
            </div>
            <div class="absolute -bottom-6 left-0 right-0 text-center text-xs text-slate-500">
              {{ point.label }}
            </div>
            <div class="absolute -top-8 left-0 right-0 text-center text-xs font-semibold text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
              {{ point.quality.toFixed(1) }}
            </div>
          </div>
        </div>
        <div class="mt-8 text-xs text-slate-500 text-center">Average quality score by version</div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center justify-between gap-4 sticky bottom-8 bg-slate-800 border border-slate-700 rounded-lg p-6 shadow-xl">
        <div>
          <button
            @click="rollbackVersion"
            class="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg text-lg font-medium transition-colors"
          >
            ↶ Rollback to Previous Version
          </button>
        </div>

        <div class="flex gap-3">
          <button
            @click="exportPromptHistory"
            class="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-lg font-medium transition-colors"
          >
            Export History
          </button>
          <button
            @click="createManualRule"
            class="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-lg font-medium transition-colors"
          >
            + Add Manual Rule
          </button>
        </div>
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
const currentVersion = ref('v1.2.0')
const selectedVersion = ref('v1.2.0')
const ruleFilter = ref('all')
const expandedRules = ref(new Set())

const ruleFilters = [
  { value: 'all', label: 'All Rules' },
  { value: 'active', label: 'Active' },
  { value: 'disabled', label: 'Disabled' },
  { value: 'high-impact', label: 'High Impact' }
]

// Mock data
const successRate = ref(89.2)
const improvementRate = ref(23.4)
const avgQuality = ref(8.7)
const rerunRate = ref(12.3)
const rerunReduction = ref(45.2)

const versions = ref([
  {
    version: 'v1.0.0',
    timestamp: new Date(Date.now() - 86400000 * 14).toISOString(),
    description: 'Initial prompt with basic LEGO extraction rules',
    avgQuality: 7.1,
    successRate: 65.8,
    rulesAdded: 0,
    seedsTested: 668
  },
  {
    version: 'v1.1.0',
    timestamp: new Date(Date.now() - 86400000 * 7).toISOString(),
    description: 'Added rules for handling compound verb phrases and destination patterns',
    avgQuality: 8.0,
    successRate: 78.3,
    rulesAdded: 3,
    seedsTested: 668
  },
  {
    version: 'v1.2.0',
    timestamp: new Date(Date.now() - 86400000 * 1).toISOString(),
    description: 'Improved semantic boundary detection and temporal phrase handling',
    avgQuality: 8.7,
    successRate: 89.2,
    rulesAdded: 2,
    seedsTested: 668
  }
])

const learnedRules = ref([
  {
    id: 'rule_001',
    name: 'Destination Phrase Unification',
    version: 'v1.1.0',
    status: 'active',
    description: 'Treat "verb + a/de + location" as a single action-destination unit',
    rule: 'if verb in [ir, venir, llegar] and next_token in [a, de] and next_phrase is location: merge as single LEGO',
    improvement: 12.3,
    appliedCount: 247,
    beforeStats: { avgQuality: 6.8, successRate: 62 },
    afterStats: { avgQuality: 8.1, successRate: 84 },
    exampleSeeds: [
      { id: 'SEED_0042', text: 'Voy a la playa', beforeQuality: 6.5, afterQuality: 8.2 },
      { id: 'SEED_0103', text: 'Vengo de Madrid', beforeQuality: 6.9, afterQuality: 8.4 },
      { id: 'SEED_0178', text: 'Llego al aeropuerto', beforeQuality: 6.7, afterQuality: 8.0 }
    ]
  },
  {
    id: 'rule_002',
    name: 'Conditional Desire Expression',
    version: 'v1.1.0',
    status: 'active',
    description: 'Keep conditional verb phrases (gustaría, quisiera) as semantic units',
    rule: 'if verb in conditional_form and expresses_desire: keep as single LEGO',
    improvement: 8.7,
    appliedCount: 156,
    beforeStats: { avgQuality: 7.2, successRate: 70 },
    afterStats: { avgQuality: 8.5, successRate: 88 },
    exampleSeeds: [
      { id: 'SEED_0015', text: 'Me gustaría ir', beforeQuality: 7.1, afterQuality: 8.6 },
      { id: 'SEED_0089', text: 'Quisiera aprender', beforeQuality: 7.3, afterQuality: 8.5 }
    ]
  },
  {
    id: 'rule_003',
    name: 'Temporal Boundary Clarity',
    version: 'v1.2.0',
    status: 'active',
    description: 'Separate time expressions as distinct LEGOs unless part of compound structure',
    rule: 'if token is temporal_adverb and not part_of_compound: separate as LEGO',
    improvement: 6.2,
    appliedCount: 334,
    beforeStats: { avgQuality: 7.8, successRate: 75 },
    afterStats: { avgQuality: 8.6, successRate: 90 },
    exampleSeeds: [
      { id: 'SEED_0201', text: 'Voy mañana', beforeQuality: 7.7, afterQuality: 8.7 },
      { id: 'SEED_0245', text: 'Llego hoy', beforeQuality: 7.9, afterQuality: 8.5 }
    ]
  }
])

const experimentalRules = ref([
  {
    id: 'exp_001',
    name: 'Pronoun Attachment Strategy',
    hypothesis: 'Attaching reflexive pronouns to verbs improves semantic coherence',
    controlStats: { avgQuality: 7.9, successRate: 82, sampleSize: 50 },
    treatmentStats: { avgQuality: 8.4, successRate: 88, sampleSize: 50 },
    confidence: 87.3
  },
  {
    id: 'exp_002',
    name: 'Compound Preposition Handling',
    hypothesis: 'Treating compound prepositions (a través de, en lugar de) as units improves boundaries',
    controlStats: { avgQuality: 8.1, successRate: 85, sampleSize: 30 },
    treatmentStats: { avgQuality: 8.9, successRate: 93, sampleSize: 30 },
    confidence: 96.2
  }
])

const qualityTrend = ref([
  { label: 'v1.0.0', quality: 7.1 },
  { label: 'v1.0.1', quality: 7.3 },
  { label: 'v1.0.2', quality: 7.5 },
  { label: 'v1.1.0', quality: 8.0 },
  { label: 'v1.1.1', quality: 8.2 },
  { label: 'v1.1.2', quality: 8.4 },
  { label: 'v1.2.0', quality: 8.7 }
])

// Computed
const filteredRules = computed(() => {
  let rules = [...learnedRules.value]

  if (ruleFilter.value === 'active') {
    rules = rules.filter(r => r.status === 'active')
  } else if (ruleFilter.value === 'disabled') {
    rules = rules.filter(r => r.status === 'disabled')
  } else if (ruleFilter.value === 'high-impact') {
    rules = rules.filter(r => r.improvement >= 10)
  }

  return rules
})

// Methods
function getQualityColor(score) {
  if (score >= 9) return 'text-emerald-400'
  if (score >= 8) return 'text-lime-400'
  if (score >= 7) return 'text-yellow-400'
  if (score >= 6) return 'text-orange-400'
  return 'text-red-400'
}

function getRuleStatusClass(status) {
  const classes = {
    active: 'bg-emerald-900/50 text-emerald-400 border border-emerald-600/50',
    disabled: 'bg-slate-700 text-slate-400 border border-slate-600',
    testing: 'bg-purple-900/50 text-purple-400 border border-purple-600/50'
  }
  return classes[status] || 'bg-slate-700 text-slate-300'
}

function formatDate(timestamp) {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

function toggleRuleExamples(ruleId) {
  if (expandedRules.value.has(ruleId)) {
    expandedRules.value.delete(ruleId)
  } else {
    expandedRules.value.add(ruleId)
  }
  expandedRules.value = new Set(expandedRules.value)
}

function disableRule(ruleId) {
  const rule = learnedRules.value.find(r => r.id === ruleId)
  if (rule) {
    rule.status = 'disabled'
    console.log('Disabling rule:', ruleId)
  }
}

function enableRule(ruleId) {
  const rule = learnedRules.value.find(r => r.id === ruleId)
  if (rule) {
    rule.status = 'active'
    console.log('Enabling rule:', ruleId)
  }
}

function viewRuleDetails(ruleId) {
  console.log('Viewing rule details:', ruleId)
  // TODO: Open modal with detailed rule analysis
}

function promoteRule(ruleId) {
  const confirmed = confirm('Promote this experimental rule to production?')
  if (!confirmed) return

  const rule = experimentalRules.value.find(r => r.id === ruleId)
  if (rule) {
    console.log('Promoting rule to production:', ruleId)
    // TODO: API call to promote rule
  }
}

function rejectRule(ruleId) {
  const confirmed = confirm('Reject this experimental rule?')
  if (!confirmed) return

  console.log('Rejecting experimental rule:', ruleId)
  experimentalRules.value = experimentalRules.value.filter(r => r.id !== ruleId)
}

function extendTest(ruleId) {
  console.log('Extending A/B test:', ruleId)
  // TODO: API call to extend test
}

function rollbackVersion() {
  const confirmed = confirm('Rollback to the previous prompt version? This will affect all future extractions.')
  if (!confirmed) return

  console.log('Rolling back to previous version')
  // TODO: API call to rollback
}

function exportPromptHistory() {
  console.log('Exporting prompt history')
  // TODO: Generate export file
}

function createManualRule() {
  console.log('Creating manual rule')
  // TODO: Open modal for manual rule creation
}

// Lifecycle
onMounted(() => {
  // Load prompt evolution data
  console.log('Loading prompt evolution for course:', props.courseCode)
})
</script>
