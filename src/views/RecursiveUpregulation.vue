<template>
  <div class="recursive-upregulation">
    <div class="header">
      <h1>🧠 Recursive Up-Regulation</h1>
      <p class="subtitle">AI Operating System: Self-Learning & Self-Healing</p>
    </div>

    <!-- Current Generation Status -->
    <div class="generation-status">
      <h2>Current Generation: {{ currentGeneration }}</h2>

      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">Quality Score</div>
          <div class="metric-value" :class="qualityClass">
            {{ latestMetrics?.quality_score?.toFixed(1) || 'N/A' }}%
          </div>
          <div class="metric-change" v-if="qualityImprovement">
            {{ qualityImprovement > 0 ? '+' : '' }}{{ qualityImprovement.toFixed(1) }}% vs Gen {{ currentGeneration - 1 }}
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-label">FCFS Violations</div>
          <div class="metric-value" :class="fcfsClass">
            {{ latestMetrics?.fcfs_violations || 0 }}
          </div>
          <div class="metric-change" v-if="fcfsReduction">
            {{ fcfsReduction }} fewer than Gen {{ currentGeneration - 1 }}
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-label">Training Examples</div>
          <div class="metric-value">{{ trainingDatasetSize }}</div>
          <div class="metric-change">
            {{ baselineExamples }} baseline + {{ correctionsAdded }} corrections
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-label">Human Intervention</div>
          <div class="metric-value">{{ interventionRate?.toFixed(1) || 'N/A' }}%</div>
          <div class="metric-target">Target: Decreasing over time</div>
        </div>
      </div>
    </div>

    <!-- Generation Timeline -->
    <div class="generation-timeline" v-if="generations.length > 0">
      <h2>Evolution Timeline</h2>
      <div class="timeline">
        <div
          v-for="gen in generations"
          :key="gen.generation"
          class="timeline-item"
          :class="{ active: gen.generation === currentGeneration }"
        >
          <div class="timeline-marker">Gen {{ gen.generation }}</div>
          <div class="timeline-content">
            <div class="timeline-quality">{{ gen.quality_score?.toFixed(1) }}%</div>
            <div class="timeline-model">{{ gen.model_short }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Fine-Tuning Control -->
    <div class="fine-tuning-control">
      <h2>Fine-Tuning Pipeline</h2>

      <!-- Ready to Fine-Tune -->
      <div v-if="readyToFineTune && !fineTuningInProgress" class="ready-state">
        <div class="ready-message">
          <span class="icon">✅</span>
          <div>
            <h3>Ready to Fine-Tune Generation {{ currentGeneration + 1 }}</h3>
            <p>
              Training dataset prepared: {{ trainingDatasetSize }} examples
              ({{ baselineExamples }} baseline + {{ correctionsAdded }} corrections from Gen {{ currentGeneration }})
            </p>
          </div>
        </div>

        <button @click="startFineTuning" class="btn-primary btn-large">
          🚀 Start Fine-Tuning Generation {{ currentGeneration + 1 }}
        </button>

        <div class="expected-improvements">
          <h4>Expected Improvements:</h4>
          <ul>
            <li>Quality: {{ latestMetrics?.quality_score?.toFixed(1) }}% → {{ (latestMetrics?.quality_score + 16).toFixed(1) }}% (+16%)</li>
            <li>FCFS Violations: {{ latestMetrics?.fcfs_violations }} → {{ Math.max(0, latestMetrics?.fcfs_violations - 12) }} (-75%)</li>
            <li>Self-Healing: Corrected patterns won't recur</li>
          </ul>
        </div>
      </div>

      <!-- Fine-Tuning In Progress -->
      <div v-if="fineTuningInProgress" class="progress-state">
        <div class="progress-header">
          <h3>Fine-Tuning Generation {{ currentGeneration + 1 }} in Progress...</h3>
          <div class="status-badge">{{ fineTuningStatus }}</div>
        </div>

        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: fineTuningProgress + '%' }"></div>
        </div>

        <div class="progress-details">
          <p>Job ID: {{ fineTuningJobId }}</p>
          <p>Estimated time remaining: {{ estimatedTimeRemaining }}</p>
          <p>Started: {{ fineTuningStartTime }}</p>
        </div>

        <button @click="refreshStatus" class="btn-secondary">
          🔄 Refresh Status
        </button>
      </div>

      <!-- Fine-Tuning Complete -->
      <div v-if="fineTuningComplete" class="complete-state">
        <div class="complete-message">
          <span class="icon">🎉</span>
          <div>
            <h3>Generation {{ currentGeneration }} Fine-Tuning Complete!</h3>
            <p>Model ID: {{ fineTunedModelId }}</p>
          </div>
        </div>

        <button @click="runComparison" class="btn-primary">
          📊 Run A/B Comparison
        </button>
      </div>

      <!-- Not Ready -->
      <div v-if="!readyToFineTune && !fineTuningInProgress" class="not-ready-state">
        <p>❌ Not ready to fine-tune. Need to:</p>
        <ul>
          <li v-if="!hasBaseline">Establish Generation 0 baseline</li>
          <li v-if="!hasCorrections">Add corrections to training dataset</li>
          <li v-if="!hasAnthropicKey">Configure Anthropic API key</li>
        </ul>
      </div>
    </div>

    <!-- Self-Healing Verification -->
    <div class="self-healing" v-if="selfHealingData">
      <h2>Self-Healing Verification</h2>
      <p class="subtitle">Did the model learn from corrections?</p>

      <div class="healing-patterns">
        <div
          v-for="pattern in selfHealingData.patterns"
          :key="pattern.name"
          class="pattern-card"
          :class="{ healed: pattern.healed, improved: pattern.improved }"
        >
          <div class="pattern-header">
            <h4>{{ pattern.name }}</h4>
            <span class="status-badge" :class="pattern.status">
              {{ pattern.status === 'healed' ? '✅ HEALED' : pattern.status === 'improved' ? '⚠️ IMPROVED' : '❌ NOT HEALED' }}
            </span>
          </div>

          <div class="pattern-metrics">
            <div class="metric">
              <span class="label">Gen {{ currentGeneration - 1 }}:</span>
              <span class="value">{{ pattern.gen0_count }} violations</span>
            </div>
            <div class="metric">
              <span class="label">Gen {{ currentGeneration }}:</span>
              <span class="value">{{ pattern.gen1_count }} violations</span>
            </div>
          </div>

          <div class="pattern-message" v-if="pattern.healed">
            🎯 Model learned this pattern - error doesn't recur!
          </div>
          <div class="pattern-message" v-else-if="pattern.improved">
            📈 Partial improvement - {{ pattern.gen0_count - pattern.gen1_count }} fewer violations
          </div>
        </div>
      </div>
    </div>

    <!-- A/B Comparison Results -->
    <div class="comparison-results" v-if="comparisonData">
      <h2>Generation {{ comparisonData.gen0 }} vs Generation {{ comparisonData.gen1 }} Comparison</h2>

      <div class="comparison-grid">
        <div class="comparison-card">
          <h3>Quality Improvement</h3>
          <div class="big-number" :class="{ positive: comparisonData.quality_improvement > 0 }">
            {{ comparisonData.quality_improvement > 0 ? '+' : '' }}{{ comparisonData.quality_improvement.toFixed(1) }}%
          </div>
          <div class="comparison-detail">
            {{ comparisonData.gen0_quality }}% → {{ comparisonData.gen1_quality }}%
          </div>
        </div>

        <div class="comparison-card">
          <h3>FCFS Violations</h3>
          <div class="big-number" :class="{ positive: comparisonData.fcfs_reduction > 0 }">
            -{{ comparisonData.fcfs_reduction }}
          </div>
          <div class="comparison-detail">
            {{ comparisonData.gen0_fcfs }} → {{ comparisonData.gen1_fcfs }} (-{{ comparisonData.fcfs_reduction_percent.toFixed(1) }}%)
          </div>
        </div>
      </div>

      <div class="success-criteria">
        <h3>Success Criteria</h3>
        <div
          v-for="criterion in comparisonData.criteria"
          :key="criterion.name"
          class="criterion"
          :class="{ met: criterion.met }"
        >
          <span class="icon">{{ criterion.met ? '✅' : '❌' }}</span>
          <span class="name">{{ criterion.name }}</span>
          <span class="value">Target: {{ criterion.target }} | Actual: {{ criterion.actual }}</span>
        </div>
      </div>

      <div class="final-verdict" :class="{ success: comparisonData.all_met }">
        <h2 v-if="comparisonData.all_met">🎉 ALL SUCCESS CRITERIA MET!</h2>
        <h2 v-else>{{ comparisonData.met_count }}/{{ comparisonData.total_count }} Criteria Met</h2>
        <p v-if="comparisonData.all_met">Recursive up-regulation PROVEN ✅</p>
      </div>
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
      trainingDatasetSize: 453,
      baselineExamples: 449,
      correctionsAdded: 4,
      readyToFineTune: false,
      hasBaseline: false,
      hasCorrections: false,
      hasAnthropicKey: false,
      fineTuningInProgress: false,
      fineTuningComplete: false,
      fineTuningStatus: '',
      fineTuningProgress: 0,
      fineTuningJobId: '',
      fineTuningStartTime: '',
      estimatedTimeRemaining: '',
      fineTunedModelId: '',
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

        this.generations = data.generations || [];
        this.currentGeneration = data.current_generation || 0;
        this.latestMetrics = data.latest_metrics || {};
        this.readyToFineTune = data.ready_to_fine_tune || false;
        this.hasBaseline = data.has_baseline || false;
        this.hasCorrections = data.has_corrections || false;
        this.hasAnthropicKey = data.has_anthropic_key || false;

        if (this.generations.length > 1) {
          const prev = this.generations[this.generations.length - 2];
          const curr = this.generations[this.generations.length - 1];
          this.qualityImprovement = curr.quality_score - prev.quality_score;
          this.fcfsReduction = prev.fcfs_violations - curr.fcfs_violations;
        }
      } catch (error) {
        console.error('Failed to load metrics:', error);
      }
    },

    async checkReadyState() {
      // Check if ready to fine-tune
      try {
        const response = await fetch(`${baseURL}/api/fine-tuning/ready`);
        const data = await response.json();
        this.readyToFineTune = data.ready;
        this.hasBaseline = data.has_baseline;
        this.hasCorrections = data.has_corrections;
        this.hasAnthropicKey = data.has_api_key;
      } catch (error) {
        console.error('Failed to check ready state:', error);
      }
    },

    async startFineTuning() {
      if (!confirm(`Start fine-tuning Generation ${this.currentGeneration + 1}?\n\nThis will take 2-4 hours and use your Anthropic API credits.`)) {
        return;
      }

      try {
        const response = await fetch(`${baseURL}/api/fine-tuning/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (data.success) {
          this.fineTuningInProgress = true;
          this.fineTuningJobId = data.job_id;
          this.fineTuningStartTime = new Date().toLocaleString();
          this.startProgressPolling();
        } else {
          alert(`Failed to start fine-tuning: ${data.error}`);
        }
      } catch (error) {
        console.error('Failed to start fine-tuning:', error);
        alert('Failed to start fine-tuning. Check console for details.');
      }
    },

    startProgressPolling() {
      this.progressInterval = setInterval(() => {
        this.refreshStatus();
      }, 60000); // Check every minute
    },

    async refreshStatus() {
      try {
        const response = await fetch(`${baseURL}/api/fine-tuning/status/${this.fineTuningJobId}`);
        const data = await response.json();

        this.fineTuningStatus = data.status;
        this.fineTuningProgress = data.progress || 0;
        this.estimatedTimeRemaining = data.estimated_time || 'Calculating...';

        if (data.status === 'succeeded') {
          this.fineTuningComplete = true;
          this.fineTuningInProgress = false;
          this.fineTunedModelId = data.model_id;
          clearInterval(this.progressInterval);
          this.loadMetrics();
        } else if (data.status === 'failed') {
          this.fineTuningInProgress = false;
          clearInterval(this.progressInterval);
          alert(`Fine-tuning failed: ${data.error}`);
        }
      } catch (error) {
        console.error('Failed to refresh status:', error);
      }
    },

    async runComparison() {
      try {
        const response = await fetch(`${baseURL}/api/fine-tuning/compare`, {
          method: 'POST'
        });

        const data = await response.json();

        this.comparisonData = data.comparison;
        this.selfHealingData = data.self_healing;
        this.loadMetrics();
      } catch (error) {
        console.error('Failed to run comparison:', error);
        alert('Failed to run comparison. Check console for details.');
      }
    }
  },

  beforeUnmount() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }
  }
};
</script>

<style scoped>
.recursive-upregulation {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.header {
  text-align: center;
  margin-bottom: 3rem;
}

.header h1 {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: #666;
  font-size: 1.1rem;
}

.generation-status {
  margin-bottom: 3rem;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-top: 1.5rem;
}

.metric-card {
  background: white;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  padding: 1.5rem;
  text-align: center;
}

.metric-label {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 0.5rem;
}

.metric-value {
  font-size: 2.5rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.metric-value.excellent { color: #22c55e; }
.metric-value.good { color: #3b82f6; }
.metric-value.fair { color: #f59e0b; }
.metric-value.poor { color: #ef4444; }

.metric-change {
  font-size: 0.9rem;
  color: #22c55e;
}

.metric-target {
  font-size: 0.85rem;
  color: #999;
}

.fine-tuning-control {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 2rem;
  margin-bottom: 3rem;
}

.ready-state {
  text-align: center;
}

.ready-message {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.ready-message .icon {
  font-size: 3rem;
}

.btn-primary, .btn-secondary {
  padding: 1rem 2rem;
  font-size: 1.1rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
}

.btn-large {
  padding: 1.5rem 3rem;
  font-size: 1.3rem;
}

.btn-secondary {
  background: #e0e0e0;
  color: #333;
}

.expected-improvements {
  margin-top: 2rem;
  text-align: left;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.progress-state {
  text-align: center;
}

.progress-bar {
  width: 100%;
  height: 30px;
  background: #e0e0e0;
  border-radius: 15px;
  overflow: hidden;
  margin: 2rem 0;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  transition: width 0.3s;
}

.status-badge {
  display: inline-block;
  padding: 0.5rem 1rem;
  background: #3b82f6;
  color: white;
  border-radius: 20px;
  font-size: 0.9rem;
}

.timeline {
  display: flex;
  gap: 1rem;
  overflow-x: auto;
  padding: 1rem 0;
}

.timeline-item {
  flex-shrink: 0;
  text-align: center;
  padding: 1rem;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  min-width: 120px;
}

.timeline-item.active {
  border-color: #3b82f6;
  background: #eff6ff;
}

.timeline-quality {
  font-size: 1.5rem;
  font-weight: bold;
  color: #3b82f6;
}

.self-healing {
  margin-bottom: 3rem;
}

.healing-patterns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.pattern-card {
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  padding: 1.5rem;
}

.pattern-card.healed {
  border-color: #22c55e;
  background: #f0fdf4;
}

.pattern-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.big-number {
  font-size: 3rem;
  font-weight: bold;
}

.big-number.positive {
  color: #22c55e;
}

.final-verdict {
  text-align: center;
  padding: 2rem;
  border-radius: 8px;
  margin-top: 2rem;
}

.final-verdict.success {
  background: #f0fdf4;
  border: 2px solid #22c55e;
}
</style>
