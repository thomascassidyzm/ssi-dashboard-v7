<template>
  <div class="voice-configuration">
    <!-- Header -->
    <div class="config-header">
      <h2 class="config-title">Voice Configuration</h2>
      <p class="config-subtitle">Configure voices and speed settings per role. Speed is voice-specific because TTS voices vary in natural pace.</p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <span>Loading voice configuration...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <span class="error-icon">!</span>
      <span>{{ error }}</span>
      <button @click="loadConfig" class="retry-btn">Retry</button>
    </div>

    <!-- Configuration Panel -->
    <div v-else class="config-panel">
      <!-- Role Tabs -->
      <div class="role-tabs">
        <button
          v-for="role in roles"
          :key="role.id"
          :class="['role-tab', { active: activeRole === role.id }]"
          @click="activeRole = role.id"
        >
          <span class="role-icon">{{ role.icon }}</span>
          <span class="role-name">{{ role.name }}</span>
          <span v-if="config.voices[role.id]?.voiceId" class="role-configured"></span>
        </button>
      </div>

      <!-- Active Role Configuration -->
      <div class="role-config">
        <div class="role-header">
          <h3>{{ activeRoleInfo.name }}</h3>
          <span class="role-description">{{ activeRoleInfo.description }}</span>
        </div>

        <!-- Provider Selection -->
        <div class="config-section">
          <label class="config-label">TTS Provider</label>
          <div class="provider-buttons">
            <button
              v-for="provider in providers"
              :key="provider.id"
              :class="['provider-btn', { active: currentVoice.provider === provider.id }]"
              @click="updateVoice({ provider: provider.id })"
            >
              {{ provider.name }}
            </button>
          </div>
        </div>

        <!-- Voice ID -->
        <div class="config-section">
          <label class="config-label">Voice ID</label>
          <input
            type="text"
            :value="currentVoice.voiceId"
            @input="updateVoice({ voiceId: $event.target.value })"
            :placeholder="currentVoice.provider === 'elevenlabs' ? 'e.g., 21m00Tcm4TlvDq8ikWAM' : 'e.g., es-ES-ElviraNeural'"
            class="config-input"
          />
          <span class="config-hint">
            {{ currentVoice.provider === 'elevenlabs' ? 'ElevenLabs Voice ID from your voice library' : 'Azure Neural voice name' }}
          </span>
        </div>

        <!-- Voice Name (Display) -->
        <div class="config-section">
          <label class="config-label">Voice Name (for display)</label>
          <input
            type="text"
            :value="currentVoice.name"
            @input="updateVoice({ name: $event.target.value })"
            placeholder="e.g., Sofia, Carlos"
            class="config-input"
          />
        </div>

        <!-- Speed Slider -->
        <div class="config-section">
          <label class="config-label">
            Speed
            <span class="speed-value">{{ (currentVoice.settings?.speed || 1.0).toFixed(2) }}x</span>
          </label>
          <div class="slider-container">
            <span class="slider-label">0.5x</span>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.05"
              :value="currentVoice.settings?.speed || 1.0"
              @input="updateVoiceSettings({ speed: parseFloat($event.target.value) })"
              class="speed-slider"
            />
            <span class="slider-label">1.5x</span>
          </div>
          <span class="config-hint">Adjust if this voice naturally speaks faster or slower</span>
        </div>

        <!-- ElevenLabs-specific settings -->
        <template v-if="currentVoice.provider === 'elevenlabs'">
          <div class="config-section">
            <label class="config-label">
              Stability
              <span class="speed-value">{{ (currentVoice.settings?.stability || 0.5).toFixed(2) }}</span>
            </label>
            <div class="slider-container">
              <span class="slider-label">Variable</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                :value="currentVoice.settings?.stability || 0.5"
                @input="updateVoiceSettings({ stability: parseFloat($event.target.value) })"
                class="speed-slider"
              />
              <span class="slider-label">Stable</span>
            </div>
          </div>

          <div class="config-section">
            <label class="config-label">
              Similarity Boost
              <span class="speed-value">{{ (currentVoice.settings?.similarityBoost || 0.75).toFixed(2) }}</span>
            </label>
            <div class="slider-container">
              <span class="slider-label">Low</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                :value="currentVoice.settings?.similarityBoost || 0.75"
                @input="updateVoiceSettings({ similarityBoost: parseFloat($event.target.value) })"
                class="speed-slider"
              />
              <span class="slider-label">High</span>
            </div>
          </div>
        </template>
      </div>

      <!-- Preview Section -->
      <div class="preview-section">
        <div class="preview-header">
          <h3>Preview</h3>
          <div class="preview-controls">
            <select v-model="previewCadence" class="cadence-select">
              <option value="natural">Natural Speed</option>
              <option value="slow">Slow (Learning)</option>
            </select>
            <button
              @click="generatePreview"
              :disabled="!canGeneratePreview || generatingPreview"
              class="generate-btn"
            >
              <span v-if="generatingPreview" class="btn-spinner"></span>
              {{ generatingPreview ? 'Generating...' : 'Generate Previews' }}
            </button>
          </div>
        </div>

        <!-- Preview Samples -->
        <div v-if="previewSamples.length > 0" class="preview-samples">
          <div
            v-for="sample in previewSamples"
            :key="sample.id"
            class="preview-sample"
          >
            <div class="sample-text">
              <span class="sample-target">{{ sample.text }}</span>
              <span v-if="sample.knownText" class="sample-known">{{ sample.knownText }}</span>
            </div>
            <div class="sample-controls">
              <button @click="playSample(sample)" class="play-btn" :disabled="playingId === sample.id">
                <span v-if="playingId === sample.id">Playing...</span>
                <span v-else>Play</span>
              </button>
              <span class="sample-meta">{{ sample.effectiveSpeed.toFixed(2) }}x</span>
            </div>
          </div>
        </div>

        <div v-else class="preview-empty">
          <p>Generate preview samples to hear how your voice settings sound</p>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="config-actions">
        <button @click="resetConfig" class="action-btn secondary">Reset to Defaults</button>
        <button @click="saveConfig" :disabled="saving" class="action-btn primary">
          {{ saving ? 'Saving...' : 'Save Configuration' }}
        </button>
      </div>
    </div>

    <!-- Hidden audio element -->
    <audio ref="audioPlayer" @ended="playingId = null"></audio>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'

const props = defineProps({
  courseCode: {
    type: String,
    required: true
  },
  apiBaseUrl: {
    type: String,
    default: () => import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'
  }
})

const emit = defineEmits(['config-saved', 'config-loaded'])

// State
const loading = ref(true)
const saving = ref(false)
const error = ref(null)
const config = ref(null)
const activeRole = ref('target1')
const previewCadence = ref('natural')
const previewSamples = ref([])
const generatingPreview = ref(false)
const playingId = ref(null)
const audioPlayer = ref(null)

// Role definitions
const roles = [
  { id: 'target1', name: 'Target 1', icon: '1', description: 'Primary target language voice' },
  { id: 'target2', name: 'Target 2', icon: '2', description: 'Secondary target language voice' },
  { id: 'source', name: 'Source', icon: 'S', description: 'Known language (English) voice' },
  { id: 'presentation', name: 'Presentation', icon: 'P', description: 'Voice for instructions/presentation' }
]

// Provider definitions
const providers = [
  { id: 'elevenlabs', name: 'ElevenLabs' },
  { id: 'azure', name: 'Azure' }
]

// Computed
const activeRoleInfo = computed(() => {
  return roles.find(r => r.id === activeRole.value) || roles[0]
})

const currentVoice = computed(() => {
  return config.value?.voices?.[activeRole.value] || {
    voiceId: '',
    provider: 'elevenlabs',
    name: '',
    settings: { speed: 1.0, stability: 0.5, similarityBoost: 0.75 }
  }
})

const canGeneratePreview = computed(() => {
  return currentVoice.value.voiceId && currentVoice.value.provider
})

// Methods
async function loadConfig() {
  loading.value = true
  error.value = null

  try {
    const response = await fetch(`${props.apiBaseUrl}/api/courses/${props.courseCode}/voice-config`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })

    if (!response.ok) {
      throw new Error('Failed to load voice configuration')
    }

    const data = await response.json()
    config.value = data.config
    emit('config-loaded', config.value)
  } catch (err) {
    error.value = err.message
    console.error('[VoiceConfig] Load error:', err)
  } finally {
    loading.value = false
  }
}

async function saveConfig() {
  saving.value = true

  try {
    const response = await fetch(`${props.apiBaseUrl}/api/courses/${props.courseCode}/voice-config`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify(config.value)
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to save configuration')
    }

    const data = await response.json()
    config.value = data.config
    emit('config-saved', config.value)
  } catch (err) {
    error.value = err.message
    console.error('[VoiceConfig] Save error:', err)
  } finally {
    saving.value = false
  }
}

function updateVoice(updates) {
  if (!config.value.voices[activeRole.value]) {
    config.value.voices[activeRole.value] = {
      voiceId: '',
      provider: 'elevenlabs',
      name: '',
      language: '',
      settings: { speed: 1.0, stability: 0.5, similarityBoost: 0.75 }
    }
  }

  config.value.voices[activeRole.value] = {
    ...config.value.voices[activeRole.value],
    ...updates
  }
}

function updateVoiceSettings(updates) {
  if (!config.value.voices[activeRole.value]) {
    updateVoice({})
  }

  config.value.voices[activeRole.value].settings = {
    ...config.value.voices[activeRole.value].settings,
    ...updates
  }
}

function resetConfig() {
  // Reset current role to defaults
  config.value.voices[activeRole.value] = {
    voiceId: '',
    provider: 'elevenlabs',
    name: '',
    language: '',
    settings: { speed: 1.0, stability: 0.5, similarityBoost: 0.75 }
  }
  previewSamples.value = []
}

async function generatePreview() {
  if (!canGeneratePreview.value) return

  generatingPreview.value = true
  previewSamples.value = []

  try {
    const response = await fetch(`${props.apiBaseUrl}/api/courses/${props.courseCode}/preview/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        role: activeRole.value,
        cadence: previewCadence.value,
        voiceConfig: currentVoice.value,
        count: 5
      })
    })

    if (!response.ok) {
      throw new Error('Failed to generate previews')
    }

    const data = await response.json()
    previewSamples.value = data.samples || []
  } catch (err) {
    error.value = err.message
    console.error('[VoiceConfig] Preview error:', err)
  } finally {
    generatingPreview.value = false
  }
}

function playSample(sample) {
  if (!audioPlayer.value || !sample.url) return

  playingId.value = sample.id
  audioPlayer.value.src = sample.url
  audioPlayer.value.play().catch(err => {
    console.error('Play error:', err)
    playingId.value = null
  })
}

// Watch for course code changes
watch(() => props.courseCode, () => {
  if (props.courseCode) {
    loadConfig()
    previewSamples.value = []
  }
})

// Load on mount
onMounted(() => {
  if (props.courseCode) {
    loadConfig()
  }
})
</script>

<style scoped>
.voice-configuration {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 24px;
}

.config-header {
  margin-bottom: 24px;
}

.config-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #10b981;
  margin: 0 0 8px 0;
}

.config-subtitle {
  color: #94a3b8;
  font-size: 0.875rem;
  margin: 0;
}

/* Loading & Error States */
.loading-state,
.error-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px;
  color: #94a3b8;
}

.spinner,
.btn-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #334155;
  border-top-color: #10b981;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.btn-spinner {
  width: 14px;
  height: 14px;
  display: inline-block;
  margin-right: 8px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-icon {
  width: 24px;
  height: 24px;
  background: #ef4444;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.retry-btn {
  padding: 8px 16px;
  background: #334155;
  color: #e2e8f0;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.retry-btn:hover {
  background: #475569;
}

/* Role Tabs */
.role-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 1px solid #334155;
  padding-bottom: 16px;
}

.role-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.2s;
}

.role-tab:hover {
  border-color: #10b981;
  color: #e2e8f0;
}

.role-tab.active {
  background: #10b981;
  border-color: #10b981;
  color: #0f172a;
}

.role-icon {
  width: 24px;
  height: 24px;
  background: #334155;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.75rem;
}

.role-tab.active .role-icon {
  background: #0f172a;
  color: #10b981;
}

.role-name {
  font-weight: 500;
}

.role-configured {
  width: 8px;
  height: 8px;
  background: #10b981;
  border-radius: 50%;
}

.role-tab.active .role-configured {
  background: #0f172a;
}

/* Role Configuration */
.role-config {
  margin-bottom: 24px;
}

.role-header {
  margin-bottom: 20px;
}

.role-header h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #e2e8f0;
  margin: 0 0 4px 0;
}

.role-description {
  font-size: 0.875rem;
  color: #64748b;
}

.config-section {
  margin-bottom: 20px;
}

.config-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.875rem;
  font-weight: 500;
  color: #94a3b8;
  margin-bottom: 8px;
}

.speed-value {
  color: #10b981;
  font-family: monospace;
}

.config-input {
  width: 100%;
  padding: 12px;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 0.875rem;
}

.config-input:focus {
  outline: none;
  border-color: #10b981;
}

.config-input::placeholder {
  color: #475569;
}

.config-hint {
  display: block;
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 6px;
}

/* Provider Buttons */
.provider-buttons {
  display: flex;
  gap: 8px;
}

.provider-btn {
  flex: 1;
  padding: 12px;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  color: #94a3b8;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.provider-btn:hover {
  border-color: #10b981;
}

.provider-btn.active {
  background: #10b981;
  border-color: #10b981;
  color: #0f172a;
}

/* Slider */
.slider-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.slider-label {
  font-size: 0.75rem;
  color: #64748b;
  min-width: 50px;
}

.slider-label:last-child {
  text-align: right;
}

.speed-slider {
  flex: 1;
  height: 6px;
  -webkit-appearance: none;
  background: #334155;
  border-radius: 3px;
  outline: none;
}

.speed-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  background: #10b981;
  border-radius: 50%;
  cursor: pointer;
}

.speed-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  background: #10b981;
  border-radius: 50%;
  cursor: pointer;
  border: none;
}

/* Preview Section */
.preview-section {
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 24px;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.preview-header h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #e2e8f0;
  margin: 0;
}

.preview-controls {
  display: flex;
  gap: 12px;
}

.cadence-select {
  padding: 8px 12px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
  color: #e2e8f0;
  font-size: 0.875rem;
}

.generate-btn {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  background: #10b981;
  border: none;
  border-radius: 6px;
  color: #0f172a;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.generate-btn:hover:not(:disabled) {
  background: #059669;
}

.generate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Preview Samples */
.preview-samples {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preview-sample {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #1e293b;
  border-radius: 6px;
}

.sample-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sample-target {
  color: #e2e8f0;
  font-size: 0.875rem;
}

.sample-known {
  color: #64748b;
  font-size: 0.75rem;
}

.sample-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.play-btn {
  padding: 6px 12px;
  background: #334155;
  border: none;
  border-radius: 4px;
  color: #e2e8f0;
  font-size: 0.75rem;
  cursor: pointer;
}

.play-btn:hover:not(:disabled) {
  background: #475569;
}

.play-btn:disabled {
  opacity: 0.7;
}

.sample-meta {
  font-size: 0.75rem;
  color: #64748b;
  font-family: monospace;
}

.preview-empty {
  text-align: center;
  padding: 24px;
  color: #64748b;
}

.preview-empty p {
  margin: 0;
}

/* Action Buttons */
.config-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.action-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn.secondary {
  background: #334155;
  color: #e2e8f0;
}

.action-btn.secondary:hover {
  background: #475569;
}

.action-btn.primary {
  background: #10b981;
  color: #0f172a;
}

.action-btn.primary:hover:not(:disabled) {
  background: #059669;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 768px) {
  .role-tabs {
    flex-wrap: wrap;
  }

  .role-tab {
    flex: 1 1 calc(50% - 4px);
  }

  .preview-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .preview-controls {
    width: 100%;
  }

  .cadence-select,
  .generate-btn {
    flex: 1;
  }
}
</style>
