<template>
  <div class="voice-configuration">
    <!-- Header -->
    <div class="config-header">
      <h2 class="config-title">Voice Configuration</h2>
      <p class="config-subtitle">Select and preview voices for each role. Test different speeds before committing.</p>
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
          @click="selectRole(role.id)"
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

        <!-- Current Selection Summary -->
        <div v-if="currentVoice.voiceId" class="current-selection">
          <div class="selection-info">
            <span class="selection-label">Selected:</span>
            <span class="selection-value">{{ currentVoice.name || currentVoice.voiceId }}</span>
            <span class="selection-provider" :class="currentVoice.provider">{{ currentVoice.provider }}</span>
          </div>
          <button @click="clearSelection" class="clear-btn">Change</button>
        </div>

        <!-- Voice Browser (when no voice selected or changing) -->
        <div v-if="!currentVoice.voiceId || showVoiceBrowser" class="voice-browser">
          <!-- Provider Toggle -->
          <div class="provider-toggle">
            <button
              :class="['provider-btn', { active: selectedProvider === 'azure' }]"
              @click="selectedProvider = 'azure'"
            >
              Azure (Recommended)
            </button>
            <button
              :class="['provider-btn', { active: selectedProvider === 'elevenlabs' }]"
              @click="selectedProvider = 'elevenlabs'"
            >
              ElevenLabs
            </button>
          </div>

          <!-- Azure Voice Browser -->
          <div v-if="selectedProvider === 'azure'" class="azure-browser">
            <!-- Language Detection -->
            <div class="browser-info">
              <span class="info-label">Language:</span>
              <span class="info-value">{{ getLanguageForRole(activeRole) }}</span>
              <button @click="discoverVoices" :disabled="discovering" class="discover-btn">
                <span v-if="discovering" class="btn-spinner"></span>
                {{ discovering ? 'Loading...' : 'Refresh Voices' }}
              </button>
            </div>

            <!-- Voice List -->
            <div v-if="discoveredVoices.length > 0" class="voice-list">
              <!-- Recommended Section -->
              <div v-if="recommendedVoices.length > 0" class="voice-section">
                <h4 class="section-title">Recommended</h4>
                <div class="voice-grid">
                  <div
                    v-for="voice in recommendedVoices"
                    :key="voice.id"
                    :class="['voice-card', { selected: previewingVoiceId === voice.id }]"
                  >
                    <div class="voice-info">
                      <span class="voice-name">{{ voice.displayName || voice.name }}</span>
                      <span class="voice-meta">
                        <span :class="['gender-badge', voice.gender.toLowerCase()]">{{ voice.gender }}</span>
                        <span class="voice-locale">{{ voice.locale }}</span>
                      </span>
                      <span v-if="voice.reason" class="voice-reason">{{ voice.reason }}</span>
                    </div>
                    <div class="voice-actions">
                      <button
                        @click="previewVoice(voice)"
                        :disabled="previewingVoiceId === voice.id"
                        class="preview-btn"
                      >
                        <span v-if="previewingVoiceId === voice.id" class="btn-spinner"></span>
                        {{ previewingVoiceId === voice.id ? 'Playing...' : 'Preview' }}
                      </button>
                      <button @click="selectVoice(voice)" class="select-btn">Select</button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- All Voices Section -->
              <div class="voice-section">
                <h4 class="section-title">
                  All Voices ({{ filteredVoices.length }})
                  <div class="filter-controls">
                    <select v-model="genderFilter" class="gender-filter">
                      <option value="all">All Genders</option>
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                    </select>
                  </div>
                </h4>
                <div class="voice-grid">
                  <div
                    v-for="voice in filteredVoices.slice(0, showAllVoices ? undefined : 8)"
                    :key="voice.id"
                    :class="['voice-card', { selected: previewingVoiceId === voice.id }]"
                  >
                    <div class="voice-info">
                      <span class="voice-name">{{ voice.displayName || voice.name }}</span>
                      <span class="voice-meta">
                        <span :class="['gender-badge', voice.gender.toLowerCase()]">{{ voice.gender }}</span>
                        <span class="voice-locale">{{ voice.locale }}</span>
                      </span>
                    </div>
                    <div class="voice-actions">
                      <button
                        @click="previewVoice(voice)"
                        :disabled="previewingVoiceId === voice.id"
                        class="preview-btn"
                      >
                        {{ previewingVoiceId === voice.id ? 'Playing...' : 'Preview' }}
                      </button>
                      <button @click="selectVoice(voice)" class="select-btn">Select</button>
                    </div>
                  </div>
                </div>
                <button
                  v-if="filteredVoices.length > 8"
                  @click="showAllVoices = !showAllVoices"
                  class="show-more-btn"
                >
                  {{ showAllVoices ? 'Show Less' : `Show All (${filteredVoices.length})` }}
                </button>
              </div>
            </div>

            <!-- No Voices State -->
            <div v-else-if="!discovering" class="no-voices">
              <p>No voices discovered yet. Click "Refresh Voices" to load available voices.</p>
            </div>
          </div>

          <!-- ElevenLabs Manual Entry -->
          <div v-else class="elevenlabs-entry">
            <div class="config-section">
              <label class="config-label">ElevenLabs Voice ID</label>
              <input
                type="text"
                v-model="manualVoiceId"
                placeholder="e.g., 21m00Tcm4TlvDq8ikWAM"
                class="config-input"
              />
              <span class="config-hint">Enter your ElevenLabs Voice ID from your voice library</span>
            </div>
            <div class="config-section">
              <label class="config-label">Voice Name (for display)</label>
              <input
                type="text"
                v-model="manualVoiceName"
                placeholder="e.g., Sofia"
                class="config-input"
              />
            </div>
            <button
              @click="selectManualVoice"
              :disabled="!manualVoiceId"
              class="select-btn full-width"
            >
              Use This Voice
            </button>
          </div>
        </div>

        <!-- Speed Configuration (after voice selected) -->
        <div v-if="currentVoice.voiceId && !showVoiceBrowser" class="speed-config">
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

          <!-- Test with Speed -->
          <div class="test-section">
            <div class="test-header">
              <span>Test Voice</span>
              <select v-model="testText" class="test-select">
                <option v-for="sample in sampleSentences" :key="sample" :value="sample">
                  {{ sample.slice(0, 40) }}{{ sample.length > 40 ? '...' : '' }}
                </option>
              </select>
            </div>
            <button
              @click="testCurrentVoice"
              :disabled="testing"
              class="test-btn"
            >
              <span v-if="testing" class="btn-spinner"></span>
              {{ testing ? 'Generating...' : 'Test at Current Speed' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="config-actions">
        <button @click="resetConfig" class="action-btn secondary">Reset</button>
        <button @click="saveConfig" :disabled="saving || !hasChanges" class="action-btn primary">
          {{ saving ? 'Saving...' : 'Save Configuration' }}
        </button>
      </div>
    </div>

    <!-- Hidden audio element -->
    <audio ref="audioPlayer" @ended="onAudioEnded"></audio>
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
const originalConfig = ref(null)
const activeRole = ref('target1')

// Voice browser state
const showVoiceBrowser = ref(false)
const selectedProvider = ref('azure')
const discovering = ref(false)
const discoveredVoices = ref([])
const recommendedVoices = ref([])
const sampleSentences = ref([])
const genderFilter = ref('all')
const showAllVoices = ref(false)

// Preview state
const previewingVoiceId = ref(null)
const testing = ref(false)
const testText = ref('')
const audioPlayer = ref(null)

// Manual ElevenLabs entry
const manualVoiceId = ref('')
const manualVoiceName = ref('')

// Role definitions - using "known" not "source"
const roles = [
  { id: 'target1', name: 'Target 1', icon: '🎯', description: 'Primary target language voice (e.g., Chinese female)', lang: 'target' },
  { id: 'target2', name: 'Target 2', icon: '🎯', description: 'Secondary target language voice (e.g., Chinese male)', lang: 'target' },
  { id: 'known', name: 'Known', icon: '🏠', description: 'Known language voice (e.g., English)', lang: 'known' }
]

// Computed
const activeRoleInfo = computed(() => {
  return roles.find(r => r.id === activeRole.value) || roles[0]
})

const currentVoice = computed(() => {
  return config.value?.voices?.[activeRole.value] || {
    voiceId: '',
    provider: 'azure',
    name: '',
    settings: { speed: 1.0 }
  }
})

const filteredVoices = computed(() => {
  if (genderFilter.value === 'all') return discoveredVoices.value
  return discoveredVoices.value.filter(v => v.gender === genderFilter.value)
})

const hasChanges = computed(() => {
  return JSON.stringify(config.value) !== JSON.stringify(originalConfig.value)
})

// Get language code for role
function getLanguageForRole(roleId) {
  const role = roles.find(r => r.id === roleId)
  if (!role) return 'unknown'

  // Parse course code: zho_for_eng -> target=zho, known=eng
  const parts = props.courseCode.split('_for_')
  if (parts.length !== 2) return props.courseCode

  if (role.lang === 'target') {
    return parts[0] // e.g., 'zho'
  } else {
    return parts[1] // e.g., 'eng'
  }
}

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
    originalConfig.value = JSON.parse(JSON.stringify(data.config))
    emit('config-loaded', config.value)

    // Load sample sentences for the current role's language
    await loadSampleSentences()
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
    originalConfig.value = JSON.parse(JSON.stringify(data.config))
    emit('config-saved', config.value)
  } catch (err) {
    error.value = err.message
    console.error('[VoiceConfig] Save error:', err)
  } finally {
    saving.value = false
  }
}

async function discoverVoices() {
  discovering.value = true
  discoveredVoices.value = []
  recommendedVoices.value = []

  try {
    const langCode = getLanguageForRole(activeRole.value)
    const response = await fetch(`${props.apiBaseUrl}/api/voices/discover/${langCode}`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })

    if (!response.ok) {
      throw new Error('Failed to discover voices')
    }

    const data = await response.json()
    discoveredVoices.value = data.voices || []
    recommendedVoices.value = data.recommended || []
    sampleSentences.value = data.sampleSentences || []
    if (sampleSentences.value.length > 0) {
      testText.value = sampleSentences.value[0]
    }
  } catch (err) {
    console.error('[VoiceConfig] Discovery error:', err)
    error.value = err.message
  } finally {
    discovering.value = false
  }
}

async function loadSampleSentences() {
  try {
    const langCode = getLanguageForRole(activeRole.value)
    const response = await fetch(`${props.apiBaseUrl}/api/voices/samples/${langCode}`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })

    if (response.ok) {
      const data = await response.json()
      sampleSentences.value = data.samples || []
      if (sampleSentences.value.length > 0) {
        testText.value = sampleSentences.value[0]
      }
    }
  } catch (err) {
    console.error('[VoiceConfig] Failed to load samples:', err)
  }
}

async function previewVoice(voice) {
  if (previewingVoiceId.value === voice.id) return

  previewingVoiceId.value = voice.id

  try {
    const text = sampleSentences.value[0] || 'Hello, this is a voice preview.'
    const response = await fetch(`${props.apiBaseUrl}/api/voices/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        voiceId: voice.id,
        text,
        speed: 1.0,
        provider: 'azure'
      })
    })

    if (!response.ok) {
      throw new Error('Failed to generate preview')
    }

    const data = await response.json()
    if (data.audio && audioPlayer.value) {
      audioPlayer.value.src = data.audio
      audioPlayer.value.play()
    }
  } catch (err) {
    console.error('[VoiceConfig] Preview error:', err)
  }
}

async function testCurrentVoice() {
  if (!currentVoice.value.voiceId || testing.value) return

  testing.value = true

  try {
    const response = await fetch(`${props.apiBaseUrl}/api/voices/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        voiceId: currentVoice.value.voiceId,
        text: testText.value,
        speed: currentVoice.value.settings?.speed || 1.0,
        provider: currentVoice.value.provider || 'azure'
      })
    })

    if (!response.ok) {
      throw new Error('Failed to generate test audio')
    }

    const data = await response.json()
    if (data.audio && audioPlayer.value) {
      audioPlayer.value.src = data.audio
      audioPlayer.value.play()
    }
  } catch (err) {
    console.error('[VoiceConfig] Test error:', err)
  } finally {
    testing.value = false
  }
}

function selectVoice(voice) {
  if (!config.value.voices[activeRole.value]) {
    config.value.voices[activeRole.value] = {}
  }

  config.value.voices[activeRole.value] = {
    voiceId: voice.id,
    provider: 'azure',
    name: voice.displayName || voice.name,
    language: voice.locale,
    settings: { speed: 1.0 }
  }

  showVoiceBrowser.value = false
}

function selectManualVoice() {
  if (!manualVoiceId.value) return

  if (!config.value.voices[activeRole.value]) {
    config.value.voices[activeRole.value] = {}
  }

  config.value.voices[activeRole.value] = {
    voiceId: manualVoiceId.value,
    provider: 'elevenlabs',
    name: manualVoiceName.value || manualVoiceId.value,
    language: getLanguageForRole(activeRole.value),
    settings: { speed: 1.0, stability: 0.5, similarityBoost: 0.75 }
  }

  showVoiceBrowser.value = false
  manualVoiceId.value = ''
  manualVoiceName.value = ''
}

function clearSelection() {
  showVoiceBrowser.value = true
}

function selectRole(roleId) {
  activeRole.value = roleId
  showVoiceBrowser.value = false
  discoveredVoices.value = []
  recommendedVoices.value = []
  genderFilter.value = 'all'
  showAllVoices.value = false
  loadSampleSentences()
}

function updateVoiceSettings(updates) {
  if (!config.value.voices[activeRole.value]) return

  config.value.voices[activeRole.value].settings = {
    ...config.value.voices[activeRole.value].settings,
    ...updates
  }
}

function resetConfig() {
  config.value = JSON.parse(JSON.stringify(originalConfig.value))
  showVoiceBrowser.value = false
}

function onAudioEnded() {
  previewingVoiceId.value = null
}

// Watch for course code changes
watch(() => props.courseCode, () => {
  if (props.courseCode) {
    loadConfig()
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
  border-radius: 0 0 12px 12px;
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
  font-size: 1rem;
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

/* Current Selection */
.current-selection {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  margin-bottom: 20px;
}

.selection-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.selection-label {
  color: #64748b;
  font-size: 0.875rem;
}

.selection-value {
  color: #e2e8f0;
  font-weight: 600;
}

.selection-provider {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.selection-provider.azure {
  background: #3b82f6;
  color: white;
}

.selection-provider.elevenlabs {
  background: #8b5cf6;
  color: white;
}

.clear-btn {
  padding: 8px 16px;
  background: #334155;
  border: none;
  border-radius: 6px;
  color: #e2e8f0;
  cursor: pointer;
}

.clear-btn:hover {
  background: #475569;
}

/* Provider Toggle */
.provider-toggle {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
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

/* Browser Info */
.browser-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding: 12px 16px;
  background: #0f172a;
  border-radius: 8px;
}

.info-label {
  color: #64748b;
}

.info-value {
  color: #e2e8f0;
  font-weight: 600;
  text-transform: uppercase;
}

.discover-btn {
  margin-left: auto;
  display: flex;
  align-items: center;
  padding: 8px 16px;
  background: #334155;
  border: none;
  border-radius: 6px;
  color: #e2e8f0;
  cursor: pointer;
}

.discover-btn:hover:not(:disabled) {
  background: #475569;
}

.discover-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Voice List */
.voice-section {
  margin-bottom: 24px;
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.875rem;
  font-weight: 600;
  color: #94a3b8;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.filter-controls {
  display: flex;
  gap: 8px;
}

.gender-filter {
  padding: 4px 8px;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 4px;
  color: #e2e8f0;
  font-size: 0.75rem;
}

.voice-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.voice-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 8px;
  transition: all 0.2s;
}

.voice-card:hover {
  border-color: #10b981;
}

.voice-card.selected {
  border-color: #10b981;
  background: #10b981/10;
}

.voice-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.voice-name {
  color: #e2e8f0;
  font-weight: 500;
}

.voice-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.gender-badge {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 500;
}

.gender-badge.female {
  background: #ec4899;
  color: white;
}

.gender-badge.male {
  background: #3b82f6;
  color: white;
}

.voice-locale {
  color: #64748b;
  font-size: 0.75rem;
}

.voice-reason {
  color: #10b981;
  font-size: 0.7rem;
}

.voice-actions {
  display: flex;
  gap: 8px;
}

.preview-btn,
.select-btn {
  padding: 6px 12px;
  border: none;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
}

.preview-btn {
  background: #334155;
  color: #e2e8f0;
}

.preview-btn:hover:not(:disabled) {
  background: #475569;
}

.preview-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.select-btn {
  background: #10b981;
  color: #0f172a;
  font-weight: 600;
}

.select-btn:hover {
  background: #059669;
}

.select-btn.full-width {
  width: 100%;
  padding: 12px;
  margin-top: 16px;
}

.show-more-btn {
  width: 100%;
  padding: 12px;
  background: #0f172a;
  border: 1px dashed #334155;
  border-radius: 8px;
  color: #94a3b8;
  cursor: pointer;
  margin-top: 12px;
}

.show-more-btn:hover {
  border-color: #10b981;
  color: #10b981;
}

.no-voices {
  text-align: center;
  padding: 40px;
  color: #64748b;
}

/* ElevenLabs Entry */
.elevenlabs-entry {
  padding: 20px;
  background: #0f172a;
  border-radius: 8px;
}

.config-section {
  margin-bottom: 20px;
}

.config-label {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  font-weight: 500;
  color: #94a3b8;
  margin-bottom: 8px;
}

.config-input {
  width: 100%;
  padding: 12px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 0.875rem;
}

.config-input:focus {
  outline: none;
  border-color: #10b981;
}

.config-hint {
  display: block;
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 6px;
}

/* Speed Config */
.speed-config {
  padding: 20px;
  background: #0f172a;
  border-radius: 8px;
  margin-bottom: 20px;
}

.speed-value {
  color: #10b981;
  font-family: monospace;
}

.slider-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.slider-label {
  font-size: 0.75rem;
  color: #64748b;
  min-width: 40px;
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

/* Test Section */
.test-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #334155;
}

.test-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  color: #94a3b8;
  font-size: 0.875rem;
}

.test-select {
  flex: 1;
  margin-left: 12px;
  padding: 8px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
  color: #e2e8f0;
  font-size: 0.875rem;
}

.test-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  background: #334155;
  border: none;
  border-radius: 8px;
  color: #e2e8f0;
  font-weight: 500;
  cursor: pointer;
}

.test-btn:hover:not(:disabled) {
  background: #475569;
}

.test-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Action Buttons */
.config-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #334155;
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

  .voice-grid {
    grid-template-columns: 1fr;
  }

  .current-selection {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .clear-btn {
    width: 100%;
  }
}
</style>
