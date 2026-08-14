<template>
  <div class="user-feedback min-h-screen bg-canvas text-ink">
    <!-- Header -->
    <div class="header bg-surface border-b border-line px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <router-link
            :to="`/production/${courseCode}`"
            class="text-muted hover:text-ink transition-colors"
            title="Back to Mission Control"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </router-link>
          <h1 class="text-2xl font-bold">User Feedback</h1>
          <span class="px-3 py-1 bg-emerald-600 text-white rounded-lg text-sm font-medium">
            {{ getCourseName(courseCode) }}
          </span>
        </div>

        <!-- Stats Summary -->
        <div class="flex items-center gap-6 text-sm">
          <div class="stat">
            <span class="text-muted">Total:</span>
            <span class="ml-1 font-medium">{{ stats.total }}</span>
          </div>
          <div class="stat stat-unresolved text-amber-400">
            <span class="text-muted">Unresolved:</span>
            <span class="ml-1 font-medium">{{ stats.unresolved }}</span>
          </div>
          <div class="stat stat-resolved text-emerald-400">
            <span class="text-muted">Resolved:</span>
            <span class="ml-1 font-medium">{{ stats.resolved }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Controls -->
    <div class="controls bg-surface border-b border-line px-6 py-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <!-- Threshold Control -->
          <div class="flex items-center gap-2">
            <label class="text-sm text-muted">Threshold:</label>
            <select
              v-model="threshold"
              @change="loadIssues"
              class="px-3 py-1.5 bg-surface-2 border border-line rounded-lg text-ink text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option :value="1">1+ flags</option>
              <option :value="2">2+ flags</option>
              <option :value="3">3+ flags</option>
              <option :value="5">5+ flags</option>
              <option :value="10">10+ flags</option>
            </select>
          </div>

          <!-- Type Filter -->
          <div class="flex items-center gap-2">
            <label class="text-sm text-muted">Type:</label>
            <select
              v-model="typeFilter"
              @change="loadIssues"
              class="px-3 py-1.5 bg-surface-2 border border-line rounded-lg text-ink text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Types</option>
              <option value="translation">Translation</option>
              <option value="audio_quality">Audio Quality</option>
              <option value="pronunciation">Pronunciation</option>
              <option value="too_fast">Too Fast</option>
              <option value="confusing">Confusing</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <button
          @click="loadIssues"
          :disabled="isLoading"
          class="px-4 py-2 bg-surface-2 text-ink rounded-lg hover:bg-surface-3 transition-colors flex items-center gap-2"
        >
          <svg v-if="isLoading" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Refresh</span>
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="content p-6">
      <!-- Loading State -->
      <div v-if="isLoading" class="flex items-center justify-center py-12">
        <svg class="w-8 h-8 animate-spin text-emerald-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>

      <!-- Empty State -->
      <div v-else-if="issues.length === 0" class="text-center py-12">
        <svg class="w-16 h-16 mx-auto mb-4 text-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 class="text-lg font-medium text-muted mb-2">No Issues Above Threshold</h3>
        <p class="text-faint">
          No content has received {{ threshold }}+ user reports yet.
        </p>
      </div>

      <!-- Issues List -->
      <div v-else class="space-y-4">
        <div class="text-sm text-muted mb-4">
          Showing {{ issues.length }} issue{{ issues.length !== 1 ? 's' : '' }} with {{ threshold }}+ flags
        </div>

        <div
          v-for="issue in issues"
          :key="`${issue.audio_id}-${issue.feedback_type}`"
          class="issue-card bg-surface rounded-lg p-4 border border-line border-l-4"
          :class="getIssueBorderClass(issue.feedback_type)"
        >
          <div class="flex items-start justify-between gap-4">
            <!-- Issue Info -->
            <div class="flex-1">
              <div class="flex items-center gap-3 mb-2">
                <!-- Flag Count Badge -->
                <span class="flag-count px-2 py-1 bg-red-600 text-white rounded-lg text-sm font-bold">
                  {{ issue.flag_count }} flags
                </span>

                <!-- Type Badge -->
                <span
                  class="type-badge px-2 py-1 rounded-lg text-xs font-medium"
                  :class="getTypeBadgeClass(issue.feedback_type)"
                >
                  {{ formatType(issue.feedback_type) }}
                </span>

                <!-- Voice Badge -->
                <span v-if="issue.voice_id" class="text-xs text-faint font-mono">
                  {{ issue.voice_id }}
                </span>
              </div>

              <!-- Text Content -->
              <div v-if="issue.text" class="text-content mb-2">
                <span class="text-ink font-medium">{{ issue.text }}</span>
                <span v-if="issue.language" class="ml-2 text-xs text-faint">({{ getLanguageName(issue.language) }})</span>
              </div>
              <div v-else class="text-faint italic mb-2">
                General feedback (no specific audio)
              </div>

              <!-- Comments -->
              <div v-if="issue.comments && issue.comments.length > 0" class="comments mt-3">
                <div class="text-xs text-muted mb-1">User comments:</div>
                <div class="space-y-1">
                  <div
                    v-for="(comment, idx) in issue.comments.slice(0, 3)"
                    :key="idx"
                    class="text-sm text-ink bg-surface-2 bg-opacity-50 px-2 py-1 rounded"
                  >
                    "{{ comment }}"
                  </div>
                  <div v-if="issue.comments.length > 3" class="text-xs text-faint">
                    +{{ issue.comments.length - 3 }} more comments
                  </div>
                </div>
              </div>

              <!-- Timestamps -->
              <div class="timestamps mt-3 text-xs text-faint">
                First reported: {{ formatDate(issue.first_flagged) }}
                <span class="mx-2">•</span>
                Last reported: {{ formatDate(issue.last_flagged) }}
              </div>
            </div>

            <!-- Actions -->
            <div class="actions flex flex-col gap-2">
              <!-- Play Audio -->
              <button
                v-if="issue.audio_id"
                @click="playAudio(issue.audio_id)"
                class="p-2 bg-surface-2 text-ink rounded-lg hover:bg-surface-3 hover:text-ink transition-colors"
                :class="{ 'bg-red-500 text-white': currentlyPlaying === issue.audio_id }"
                title="Play audio"
              >
                <svg v-if="currentlyPlaying === issue.audio_id" class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
                <svg v-else class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </button>

              <!-- Resolve -->
              <button
                @click="resolveIssue(issue)"
                class="p-2 bg-emerald-600 text-white rounded-lg hover:bg-opacity-30 transition-colors"
                title="Mark as resolved"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Resolve Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="resolveModalVisible"
          class="modal-overlay fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          @click.self="closeResolveModal"
        >
          <div class="modal-content bg-surface rounded-lg shadow-xl max-w-md w-full">
            <div class="modal-header px-6 py-4 border-b border-line">
              <h3 class="text-lg font-semibold text-ink">Resolve Issue</h3>
            </div>

            <div class="modal-body px-6 py-4 space-y-4">
              <div v-if="issueToResolve" class="issue-summary text-sm">
                <span class="type-badge px-2 py-1 rounded text-xs font-medium" :class="getTypeBadgeClass(issueToResolve.feedback_type)">
                  {{ formatType(issueToResolve.feedback_type) }}
                </span>
                <span class="ml-2 text-ink">{{ issueToResolve.text || 'General feedback' }}</span>
              </div>

              <div class="field">
                <label class="block text-sm text-muted mb-1">Resolution note (optional)</label>
                <textarea
                  v-model="resolutionNote"
                  rows="3"
                  class="w-full px-3 py-2 bg-surface-2 border border-line rounded-lg text-ink placeholder-muted focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Describe how the issue was resolved..."
                />
              </div>
            </div>

            <div class="modal-footer px-6 py-4 border-t border-line flex justify-end gap-3">
              <button
                @click="closeResolveModal"
                class="px-4 py-2 text-ink hover:text-ink transition-colors"
              >
                Cancel
              </button>
              <button
                @click="confirmResolve"
                :disabled="isResolving"
                class="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
              >
                {{ isResolving ? 'Resolving...' : 'Mark Resolved' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import { getApiUrl } from '@/services/api';
import { isConfigured as isSupabaseConfigured, getFeedbackAggregated, getFeedbackStats } from '@/services/supabase';
import { useCourses } from '@/composables/useCourses';

// Route
const route = useRoute();
const courseCode = computed(() => route.params.courseCode as string);
const { getCourseName, getLanguageName } = useCourses();

// State
const isLoading = ref(false);
const threshold = ref(3);
const typeFilter = ref('');
const issues = ref<any[]>([]);
const stats = ref({ total: 0, unresolved: 0, resolved: 0, by_type: {} });
const currentlyPlaying = ref<string | null>(null);
const audioElement = ref<HTMLAudioElement | null>(null);

// Resolve modal
const resolveModalVisible = ref(false);
const issueToResolve = ref<any>(null);
const resolutionNote = ref('');
const isResolving = ref(false);

// API Base URL - Vercel-aware
const getApiBaseUrl = (): string => {
  const storedUrl = localStorage.getItem('api_base_url');
  if (storedUrl) return storedUrl;

  // Use relative URLs on Vercel deployment
  const isVercel = typeof window !== 'undefined' && (
    window.location.hostname.includes('vercel.app') ||
    window.location.hostname === 'popty.app' ||
    window.location.hostname.endsWith('.popty.app')
  );
  if (isVercel) return '';

  return getApiUrl();
};

// S3 Audio Base
const S3_AUDIO_BASE = 'https://ssi-audio-stage.s3.eu-west-1.amazonaws.com/mastered';

// Load issues
const loadIssues = async () => {
  isLoading.value = true;
  try {
    if (isSupabaseConfigured()) {
      const data = await getFeedbackAggregated(courseCode.value, {
        threshold: threshold.value,
        type: typeFilter.value || null,
        limit: 100
      });
      issues.value = data.items || [];
    } else {
      const apiBaseUrl = getApiBaseUrl();
      const params = new URLSearchParams({
        threshold: threshold.value.toString(),
        limit: '100'
      });
      if (typeFilter.value) {
        params.append('type', typeFilter.value);
      }

      const response = await fetch(
        `${apiBaseUrl}/api/production/${courseCode.value}/feedback/aggregated?${params}`,
        { headers: { 'ngrok-skip-browser-warning': 'true' } }
      );

      if (!response.ok) throw new Error('Failed to load issues');

      const data = await response.json();
      issues.value = data.issues || [];
    }
  } catch (err) {
    console.error('Error loading issues:', err);
  } finally {
    isLoading.value = false;
  }
};

// Load stats
const loadStats = async () => {
  try {
    if (isSupabaseConfigured()) {
      stats.value = await getFeedbackStats(courseCode.value);
    } else {
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(
        `${apiBaseUrl}/api/production/${courseCode.value}/feedback/stats`,
        { headers: { 'ngrok-skip-browser-warning': 'true' } }
      );

      if (!response.ok) throw new Error('Failed to load stats');

      const data = await response.json();
      stats.value = data.stats || { total: 0, unresolved: 0, resolved: 0, by_type: {} };
    }
  } catch (err) {
    console.error('Error loading stats:', err);
  }
};

// Play audio
const playAudio = (audioId: string) => {
  if (currentlyPlaying.value === audioId) {
    audioElement.value?.pause();
    currentlyPlaying.value = null;
    return;
  }

  if (!audioElement.value) {
    audioElement.value = new Audio();
  }

  audioElement.value.src = `${S3_AUDIO_BASE}/${audioId.toUpperCase()}.mp3`;
  audioElement.value.play();
  currentlyPlaying.value = audioId;

  audioElement.value.onended = () => {
    currentlyPlaying.value = null;
  };
};

// Resolve issue
const resolveIssue = (issue: any) => {
  issueToResolve.value = issue;
  resolutionNote.value = '';
  resolveModalVisible.value = true;
};

const closeResolveModal = () => {
  resolveModalVisible.value = false;
  issueToResolve.value = null;
  resolutionNote.value = '';
};

const confirmResolve = async () => {
  if (!issueToResolve.value) return;

  isResolving.value = true;
  try {
    const apiBaseUrl = getApiBaseUrl();
    const response = await fetch(
      `${apiBaseUrl}/api/production/${courseCode.value}/feedback/resolve`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({
          audioId: issueToResolve.value.audio_id,
          feedbackType: issueToResolve.value.feedback_type,
          resolvedBy: 'dashboard_user',
          resolutionNote: resolutionNote.value || null
        })
      }
    );

    if (!response.ok) throw new Error('Failed to resolve');

    // Reload data
    await Promise.all([loadIssues(), loadStats()]);
    closeResolveModal();
  } catch (err) {
    console.error('Error resolving issue:', err);
  } finally {
    isResolving.value = false;
  }
};

// Helpers
const formatType = (type: string): string => {
  const labels: Record<string, string> = {
    translation: 'Translation',
    audio_quality: 'Audio Quality',
    pronunciation: 'Pronunciation',
    too_fast: 'Too Fast',
    confusing: 'Confusing',
    other: 'Other'
  };
  return labels[type] || type;
};

const getTypeBadgeClass = (type: string): string => {
  const classes: Record<string, string> = {
    translation: 'bg-blue-600 text-white',
    audio_quality: 'bg-red-600 text-white',
    pronunciation: 'bg-purple-600 text-white',
    too_fast: 'bg-orange-600 text-white',
    confusing: 'bg-yellow-600 text-white',
    other: 'bg-surface-3 bg-opacity-20 text-muted'
  };
  return classes[type] || 'bg-surface-3 bg-opacity-20 text-muted';
};

const getIssueBorderClass = (type: string): string => {
  const classes: Record<string, string> = {
    translation: 'border-blue-500',
    audio_quality: 'border-red-500',
    pronunciation: 'border-purple-500',
    too_fast: 'border-orange-500',
    confusing: 'border-yellow-500',
    other: 'border-line'
  };
  return classes[type] || 'border-line';
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Load on mount
onMounted(() => {
  loadIssues();
  loadStats();
});
</script>

<style scoped>
/* Modal transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform 0.2s ease;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.95);
}

/* Light-mode-only contrast fixes (dark mode untouched) */
:root[data-theme="light"] .stat-unresolved {
  color: var(--accent); /* #a85508 on white = 6.4:1 (amber-400 was 1.6:1) */
}
:root[data-theme="light"] .stat-resolved {
  color: var(--accent-2); /* #047857 on white = 8.9:1 (emerald-400 was 1.7:1) */
}
/* "confusing" type badge: white on yellow-600 #ca8a04 = 2.66:1 -> darken fill */
:root[data-theme="light"] .type-badge.bg-yellow-600 {
  background-color: #854d0e !important; /* white = 6.4:1 */
}
</style>
