<template>
  <div class="review-interface">
    <!-- Review Header -->
    <div class="review-header">
      <h2 class="review-title">Session Review</h2>
      <p class="review-subtitle">
        Recording complete! Review AI-detected segments and approve for upload.
      </p>
      <div class="review-summary">
        <div class="summary-stat">
          <span class="summary-value high">{{ stats.high }}</span>
          <span class="summary-label">High Confidence</span>
        </div>
        <div class="summary-stat">
          <span class="summary-value medium">{{ stats.medium }}</span>
          <span class="summary-label">Medium Confidence</span>
        </div>
        <div class="summary-stat">
          <span class="summary-value low">{{ stats.low }}</span>
          <span class="summary-label">Needs Review</span>
        </div>
      </div>
    </div>

    <!-- Batch Actions -->
    <div class="batch-actions">
      <button class="batch-btn" @click="$emit('approve-all', 'high')">
        <span class="btn-icon">✓</span> Approve All High ({{ stats.high }})
      </button>
      <button class="batch-btn" @click="$emit('filter', 'medium')">
        <span class="btn-icon">⚠</span> Review Medium ({{ stats.medium }})
      </button>
      <button class="batch-btn" @click="$emit('filter', 'low')">
        <span class="btn-icon">↻</span> Queue Low for Re-record ({{ stats.low }})
      </button>
      <button class="batch-btn" @click="$emit('play-all')">
        <span class="btn-icon">▶</span> Play All
      </button>
    </div>

    <!-- Segments Grid -->
    <div class="segments-grid">
      <SegmentCard
        v-for="segment in segments"
        :key="segment.id"
        :segment="segment"
        @play="$emit('play', $event)"
        @redo="$emit('reject', $event)"
        @approve="$emit('approve', $event)"
      />
    </div>

    <!-- Final Actions -->
    <div class="final-actions">
      <button class="control-btn" @click="$emit('back')">
        <span class="btn-icon">⬅️</span> Back to Recording
      </button>
      <button class="control-btn success" @click="$emit('finalize')">
        <span class="btn-icon">✓</span> Finalize & Upload Session
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import SegmentCard from './SegmentCard.vue'

const props = defineProps({
  segments: { type: Array, required: true }
})

defineEmits(['approve', 'reject', 'approve-all', 'filter', 'play', 'play-all', 'back', 'finalize'])

const stats = computed(() => {
  const high = props.segments.filter(s => s.confidenceLevel === 'high').length
  const medium = props.segments.filter(s => s.confidenceLevel === 'medium').length
  const low = props.segments.filter(s => s.confidenceLevel === 'low').length
  return { high, medium, low, total: props.segments.length }
})
</script>

<style scoped>
.review-interface {
  max-width: 1400px;
  margin: 0 auto;
}

.review-header {
  background: var(--color-shadow, #1e293b);
  border: 1px solid var(--color-graphite, #475569);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.review-title {
  font-family: 'Josefin Sans', sans-serif;
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--color-paper, #f7f7f2);
  margin: 0 0 0.5rem 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.review-subtitle {
  color: var(--color-paper-dim, #c1c1bb);
  margin: 0 0 1.5rem 0;
}

.review-summary {
  display: flex;
  gap: 1.5rem;
}

.summary-stat {
  flex: 1;
  text-align: center;
  padding: 1rem;
  background: var(--color-void, #0f172a);
  border-radius: 8px;
}

.summary-value {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 2rem;
  font-weight: 600;
  display: block;
  margin-bottom: 0.25rem;
}

.summary-value.high {
  color: var(--color-emerald, #06ffa5);
  text-shadow: 0 0 20px rgba(6, 255, 165, 0.5);
}

.summary-value.medium {
  color: var(--color-tungsten, #ffa630);
  text-shadow: 0 0 20px rgba(255, 166, 48, 0.5);
}

.summary-value.low {
  color: var(--color-film-red, #e63946);
  text-shadow: 0 0 20px rgba(230, 57, 70, 0.5);
}

.summary-label {
  font-size: 0.85rem;
  color: var(--color-paper-dim, #c1c1bb);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Batch Actions */
.batch-actions {
  background: var(--color-shadow, #1e293b);
  border: 1px solid var(--color-graphite, #475569);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  display: flex;
  gap: 0.75rem;
}

.batch-btn {
  flex: 1;
  background: var(--color-slate, #334155);
  border: 1px solid var(--color-graphite, #475569);
  color: var(--color-paper, #f7f7f2);
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-family: 'Josefin Sans', sans-serif;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn-icon {
  font-size: 1.1em;
}

.batch-btn:hover {
  background: var(--color-graphite, #475569);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

/* Segments Grid */
.segments-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

/* Final Actions */
.final-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid var(--color-graphite, #475569);
}

.control-btn {
  background: var(--color-slate, #334155);
  border: 2px solid var(--color-graphite, #475569);
  color: var(--color-paper, #f7f7f2);
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-family: 'Josefin Sans', sans-serif;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.control-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4);
  border-color: var(--color-tungsten, #ffa630);
}

.control-btn.success {
  background: linear-gradient(135deg, var(--color-emerald, #06ffa5), #04cc84);
  border-color: var(--color-emerald, #06ffa5);
  color: var(--color-void, #0f172a);
}

.control-btn.success:hover {
  box-shadow: 0 8px 32px rgba(6, 255, 165, 0.4);
}

@media (max-width: 768px) {
  .review-summary {
    flex-direction: column;
  }

  .batch-actions {
    flex-direction: column;
  }

  .segments-grid {
    grid-template-columns: 1fr;
  }

  .final-actions {
    flex-direction: column;
  }

  .control-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
