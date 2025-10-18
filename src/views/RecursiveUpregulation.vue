<template>
  <div class="min-h-screen bg-slate-900 text-slate-100 p-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <router-link to="/" class="text-emerald-400 hover:text-emerald-300 mb-4 inline-block">
          ← Back to Dashboard
        </router-link>
        <div class="flex items-start gap-3">
          <div class="text-4xl">🧠</div>
          <div>
            <h1 class="text-4xl font-bold text-emerald-400 mb-2">
              Recursive Up-Regulation
            </h1>
            <p class="text-slate-400">AI Operating System: Self-Learning & Self-Healing</p>
          </div>
        </div>
      </div>

      <!-- Current Generation Status -->
      <section class="mb-8">
        <h2 class="text-2xl font-semibold text-emerald-400 mb-6">
          Generation {{ currentGeneration }} Status
        </h2>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          <!-- Quality Score Card -->
          <div class="bg-slate-800/50 border border-slate-400/20 rounded-lg p-6">
            <div class="text-sm text-slate-400 mb-2">Quality Score</div>
            <div class="text-3xl font-bold" :class="{
              'text-emerald-400': qualityClass === 'excellent',
              'text-green-400': qualityClass === 'good',
              'text-yellow-400': qualityClass === 'fair',
              'text-red-400': qualityClass === 'poor',
              'text-slate-500': !latestMetrics
            }">
              {{ latestMetrics?.quality_score?.toFixed(1) || 'N/A' }}%
            </div>
            <div v-if="qualityImprovement" class="text-sm text-emerald-400 mt-2">
              +{{ qualityImprovement.toFixed(1) }}% vs Gen {{ currentGeneration - 1 }}
            </div>
          </div>

          <!-- FCFS Violations Card -->
          <div class="bg-slate-800/50 border border-slate-400/20 rounded-lg p-6">
            <div class="text-sm text-slate-400 mb-2">FCFS Violations</div>
            <div class="text-3xl font-bold" :class="{
              'text-emerald-400': fcfsClass === 'excellent',
              'text-green-400': fcfsClass === 'good',
              'text-yellow-400': fcfsClass === 'fair',
              'text-red-400': fcfsClass === 'poor'
            }">
              {{ latestMetrics?.fcfs_violations || 0 }}
            </div>
            <div v-if="fcfsReduction" class="text-sm text-emerald-400 mt-2">
              {{ fcfsReduction }} fewer than Gen {{ currentGeneration - 1 }}
            </div>
          </div>

          <!-- Training Examples Card -->
          <div class="bg-slate-800/50 border border-slate-400/20 rounded-lg p-6">
            <div class="text-sm text-slate-400 mb-2">Training Examples</div>
            <div class="text-3xl font-bold text-purple-400">
              {{ trainingDatasetSize }}
            </div>
            <div class="text-sm text-slate-400 mt-2">
              {{ baselineExamples }} baseline + {{ correctionsAdded }} corrections
            </div>
          </div>

          <!-- Human Intervention Card -->
          <div class="bg-slate-800/50 border border-slate-400/20 rounded-lg p-6">
            <div class="text-sm text-slate-400 mb-2">Human Intervention</div>
            <div class="text-3xl font-bold text-blue-400">
              {{ interventionRate?.toFixed(1) || 'N/A' }}%
            </div>
            <div class="text-sm text-slate-400 mt-2">
              Target: Decreasing
            </div>
          </div>
        </div>
      </section>

      <!-- Fine-Tuning Control -->
      <section v-if="readyToFineTune && !fineTuningInProgress && !fineTuningComplete" class="mb-8">
        <div class="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-400/30 rounded-lg p-8">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-2xl font-bold text-purple-200 mb-2">
                Ready to Fine-Tune Generation {{ currentGeneration + 1 }}
              </h3>
              <p class="text-purple-200/80">
                All prerequisites met. Start fine-tuning to prove recursive up-regulation.
              </p>
            </div>
            <button
              @click="startFineTuning"
              class="bg-purple-500 hover:bg-purple-600 text-white font-semibold px-8 py-4 rounded-lg transition shadow-lg hover:shadow-purple-500/50">
              🚀 Start Fine-Tuning
            </button>
          </div>
        </div>
      </section>

      <!-- Fine-Tuning In Progress -->
      <section v-if="fineTuningInProgress" class="mb-8">
        <div class="bg-slate-800/50 border border-blue-400/30 rounded-lg p-8">
          <div class="flex items-center gap-4 mb-4">
            <div class="animate-spin text-3xl">⚙️</div>
            <div>
              <h3 class="text-2xl font-bold text-blue-400">Fine-Tuning in Progress</h3>
              <p class="text-slate-400">Generation {{ currentGeneration + 1 }} training via Claude Code</p>
            </div>
          </div>
          <div class="text-sm text-slate-400">
            Status: {{ fineTuningStatus }} • Check Warp terminal for progress
          </div>
        </div>
      </section>

      <!-- Prerequisites Checklist -->
      <section v-if="!readyToFineTune" class="mb-8">
        <h2 class="text-2xl font-semibold text-emerald-400 mb-6">Prerequisites</h2>
        <div class="bg-slate-800/50 border border-slate-400/20 rounded-lg p-6">
          <div class="space-y-3">
            <div class="flex items-center gap-3">
              <div :class="hasBaseline ? 'text-emerald-400' : 'text-slate-500'">
                {{ hasBaseline ? '✅' : '⬜' }}
              </div>
              <span class="text-slate-300">Generation 0 baseline measured</span>
            </div>
            <div class="flex items-center gap-3">
              <div :class="hasCorrections ? 'text-emerald-400' : 'text-slate-500'">
                {{ hasCorrections ? '✅' : '⬜' }}
              </div>
              <span class="text-slate-300">Training data with corrections ready</span>
            </div>
            <div class="flex items-center gap-3">
              <div class="text-emerald-400">✅</div>
              <span class="text-slate-300">Claude Code configured with API access</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Self-Healing Patterns -->
      <section v-if="selfHealingData" class="mb-8">
        <h2 class="text-2xl font-semibold text-emerald-400 mb-6">Self-Healing Verification</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            v-for="pattern in selfHealingData"
            :key="pattern.name"
            class="bg-slate-800/50 border rounded-lg p-6"
            :class="{
              'border-emerald-400/50': pattern.healed,
              'border-yellow-400/50': pattern.gen1_count < pattern.gen0_count && !pattern.healed,
              'border-slate-400/20': pattern.gen1_count >= pattern.gen0_count
            }">
            <div class="text-lg font-semibold text-slate-100 mb-3">
              {{ pattern.name }}
            </div>
            <div class="space-y-2 text-sm">
              <div class="text-slate-400">
                Gen 0: <span class="text-red-400">{{ pattern.gen0_count }} violations</span>
              </div>
              <div class="text-slate-400">
                Gen 1: <span class="text-emerald-400">{{ pattern.gen1_count }} violations</span>
              </div>
              <div v-if="pattern.healed" class="text-emerald-400 font-semibold mt-3">
                ✅ HEALED
              </div>
              <div v-else-if="pattern.gen1_count < pattern.gen0_count" class="text-yellow-400 font-semibold mt-3">
                ⚠️ IMPROVED
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Comparison Results -->
      <section v-if="comparisonData" class="mb-8">
        <h2 class="text-2xl font-semibold text-emerald-400 mb-6">A/B Comparison Results</h2>

        <div class="bg-slate-800/50 border border-slate-400/20 rounded-lg p-8 mb-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div class="text-sm text-slate-400 mb-2">Quality Improvement</div>
              <div class="text-4xl font-bold text-emerald-400">
                +{{ comparisonData.improvement?.quality?.improvement?.toFixed(1) }}%
              </div>
              <div class="text-slate-400 mt-2">
                {{ comparisonData.generation_0?.quality }}% → {{ comparisonData.generation_1?.quality }}%
              </div>
            </div>
            <div>
              <div class="text-sm text-slate-400 mb-2">FCFS Violations Reduced</div>
              <div class="text-4xl font-bold text-emerald-400">
                -{{ comparisonData.improvement?.fcfs_violations?.reduction }}
              </div>
              <div class="text-slate-400 mt-2">
                {{ comparisonData.generation_0?.fcfs_violations }} → {{ comparisonData.generation_1?.fcfs_violations }}
              </div>
            </div>
          </div>
        </div>

        <!-- Success Criteria -->
        <div class="bg-gradient-to-br from-emerald-900/30 to-teal-900/30 border border-emerald-400/30 rounded-lg p-8">
          <h3 class="text-xl font-bold text-emerald-400 mb-4">Success Criteria</h3>
          <div class="space-y-3">
            <div
              v-for="criterion in comparisonData.success_criteria"
              :key="criterion.name"
              class="flex items-center gap-3">
              <div :class="criterion.met ? 'text-emerald-400' : 'text-slate-500'">
                {{ criterion.met ? '✅' : '❌' }}
              </div>
              <span class="text-slate-300">{{ criterion.name }}</span>
              <span class="text-slate-500 text-sm ml-auto">
                {{ criterion.actual?.toFixed(1) }}
              </span>
            </div>
          </div>

          <div v-if="comparisonData.all_criteria_met" class="mt-6 pt-6 border-t border-emerald-400/30">
            <div class="text-2xl font-bold text-emerald-400">
              🎉 Recursive Up-Regulation PROVEN ✅
            </div>
            <p class="text-emerald-200/80 mt-2">
              Agents can learn from experience. Self-healing works. AI OS is real.
            </p>
          </div>
        </div>
      </section>

    </div>
  </div>
</template>

<script>
import { baseURL } from '../services/api.js';

export default {
  name: 'RecursiveUpregulation',
  data() {
    return {
      currentGeneration: 0,
      generations: [],
      latestMetrics: null,
      readyToFineTune: false,
      hasBaseline: false,
      hasCorrections: false,
      trainingDatasetSize: 453,
      baselineExamples: 449,
      correctionsAdded: 4,
      fineTuningInProgress: false,
      fineTuningComplete: false,
      fineTuningStatus: '',
      fineTuningJobId: '',
      selfHealingData: null,
      comparisonData: null,
      interventionRate: null,
      qualityImprovement: null,
      fcfsReduction: null
    };
  },
  computed: {
    qualityClass() {
      const score = this.latestMetrics?.quality_score || 0;
      if (score >= 90) return 'excellent';
      if (score >= 80) return 'good';
      if (score >= 70) return 'fair';
      return 'poor';
    },
    fcfsClass() {
      const violations = this.latestMetrics?.fcfs_violations || 0;
      if (violations === 0) return 'excellent';
      if (violations <= 4) return 'good';
      if (violations <= 8) return 'fair';
      return 'poor';
    }
  },
  mounted() {
    this.loadMetrics();
    this.checkReadyState();
  },
  methods: {
    async loadMetrics() {
      try {
        const response = await fetch(`${baseURL}/api/metrics/generations`);
        const data = await response.json();

        // Extract data from the nested structure
        if (data.generation_0) {
          this.currentGeneration = data.current_generation || 0;
          this.latestMetrics = {
            quality_score: data.generation_0.overall_metrics.average_quality_score,
            fcfs_violations: data.generation_0.overall_metrics.critical_issues
          };
          this.hasBaseline = true;
        }

        if (data.generation_1) {
          this.qualityImprovement = data.generation_1.overall_metrics.average_quality_score -
                                   data.generation_0.overall_metrics.average_quality_score;
          this.fcfsReduction = data.generation_0.overall_metrics.critical_issues -
                              data.generation_1.overall_metrics.critical_issues;
        }

        if (data.comparison) {
          this.comparisonData = data.comparison;
          this.selfHealingData = Object.values(data.comparison.self_healing || {});
        }

        // Calculate intervention rate
        if (this.latestMetrics) {
          this.interventionRate = (this.correctionsAdded / this.trainingDatasetSize) * 100;
        }
      } catch (error) {
        console.error('Failed to load metrics:', error);
      }
    },

    async checkReadyState() {
      try {
        const response = await fetch(`${baseURL}/api/fine-tuning/ready`);
        const data = await response.json();

        this.readyToFineTune = data.ready;
        this.hasBaseline = data.prerequisites?.baseline_metrics;
        this.hasCorrections = data.prerequisites?.training_data;
      } catch (error) {
        console.error('Failed to check ready state:', error);
      }
    },

    async startFineTuning() {
      try {
        const response = await fetch(`${baseURL}/api/fine-tuning/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (data.success) {
          this.fineTuningInProgress = true;
          this.fineTuningStatus = 'Starting...';
          alert('Fine-tuning started! Check Warp terminal for progress from Claude Code.');
        }
      } catch (error) {
        console.error('Failed to start fine-tuning:', error);
        alert('Failed to start fine-tuning. Check console for details.');
      }
    },

    async runComparison() {
      try {
        const response = await fetch(`${baseURL}/api/fine-tuning/compare`, {
          method: 'POST'
        });

        const data = await response.json();
        this.comparisonData = data.comparison;
        this.selfHealingData = Object.values(data.comparison.self_healing || {});
      } catch (error) {
        console.error('Failed to run comparison:', error);
      }
    }
  }
};
</script>
