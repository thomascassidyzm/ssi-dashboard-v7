<template>
  <span
    class="status-badge"
    :class="statusClass"
    :title="statusLabel"
  >
    <span class="status-dot"></span>
    <span class="status-text">{{ statusLabel }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: {
    type: String,
    default: 'pending'
  },
  size: {
    type: String,
    default: 'md' // sm, md, lg
  }
})

const statusConfig = {
  pending: { label: 'Pending', class: 'status-pending' },
  flagged_regen_tts: { label: 'TTS Regen', class: 'status-flagged' },
  flagged_human_needed: { label: 'Human Needed', class: 'status-flagged-human' },
  in_pipeline: { label: 'In Pipeline', class: 'status-in-progress' },
  in_recording: { label: 'Recording', class: 'status-in-progress' },
  needs_review: { label: 'Needs Review', class: 'status-review' },
  approved: { label: 'Approved', class: 'status-approved' },
  rejected: { label: 'Rejected', class: 'status-rejected' }
}

const statusLabel = computed(() => statusConfig[props.status]?.label || props.status)
const statusClass = computed(() => [
  statusConfig[props.status]?.class || 'status-pending',
  `status-${props.size}`
])
</script>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
  font-family: 'IBM Plex Mono', monospace;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* Size variants */
.status-sm { font-size: 0.65rem; }
.status-sm .status-dot { width: 6px; height: 6px; }

.status-md { font-size: 0.75rem; }

.status-lg { font-size: 0.85rem; }
.status-lg .status-dot { width: 10px; height: 10px; }

/* Status colors - cinematic palette */
.status-pending {
  background: rgba(52, 56, 74, 0.5);
  color: var(--muted);
}
.status-pending .status-dot { background: var(--muted); }

.status-flagged {
  background: rgba(255, 166, 48, 0.15);
  color: var(--accent);
}
.status-flagged .status-dot {
  background: var(--accent);
  box-shadow: 0 0 8px rgba(255, 166, 48, 0.6);
}

.status-flagged-human {
  background: rgba(230, 57, 70, 0.15);
  color: #e63946;
}
.status-flagged-human .status-dot {
  background: #e63946;
  box-shadow: 0 0 8px rgba(230, 57, 70, 0.6);
}

.status-in-progress {
  background: rgba(6, 182, 212, 0.15);
  color: #06b6d4;
}
.status-in-progress .status-dot {
  background: #06b6d4;
  animation: pulse 2s ease-in-out infinite;
}

.status-review {
  background: rgba(251, 191, 36, 0.15);
  color: #fbbf24;
}
.status-review .status-dot { background: #fbbf24; }

.status-approved {
  background: rgba(6, 255, 165, 0.15);
  color: #06ffa5;
}
.status-approved .status-dot {
  background: #06ffa5;
  box-shadow: 0 0 8px rgba(6, 255, 165, 0.5);
}

.status-rejected {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}
.status-rejected .status-dot { background: #ef4444; }

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
}

/* Light-mode overrides: the dark-mode neon text + faint tints fail WCAG on white.
   Darken text/dot and use a slightly stronger tint per hue family so each pill
   stays recognizably the same colour while passing AA. Dark mode is untouched. */
:root[data-theme="light"] .status-pending {
  background: var(--surface-2);
  color: var(--muted);
  border: 1px solid var(--line);
}
:root[data-theme="light"] .status-pending .status-dot { background: var(--muted); }

:root[data-theme="light"] .status-flagged {
  background: rgba(168, 85, 8, 0.12);
  color: var(--accent); /* #a85508 */
}
:root[data-theme="light"] .status-flagged .status-dot {
  background: var(--accent);
  box-shadow: none;
}

:root[data-theme="light"] .status-flagged-human {
  background: rgba(185, 28, 28, 0.12);
  color: #b91c1c;
}
:root[data-theme="light"] .status-flagged-human .status-dot {
  background: #b91c1c;
  box-shadow: none;
}

:root[data-theme="light"] .status-in-progress {
  background: rgba(14, 116, 144, 0.12);
  color: #0e7490;
}
:root[data-theme="light"] .status-in-progress .status-dot {
  background: #0e7490;
}

:root[data-theme="light"] .status-review {
  background: rgba(180, 83, 9, 0.12);
  color: #b45309;
}
:root[data-theme="light"] .status-review .status-dot { background: #b45309; }

:root[data-theme="light"] .status-approved {
  background: rgba(4, 120, 87, 0.12);
  color: var(--accent-2); /* #047857 */
}
:root[data-theme="light"] .status-approved .status-dot {
  background: var(--accent-2);
  box-shadow: none;
}

:root[data-theme="light"] .status-rejected {
  background: rgba(185, 28, 28, 0.12);
  color: #b91c1c;
}
:root[data-theme="light"] .status-rejected .status-dot { background: #b91c1c; }
</style>
