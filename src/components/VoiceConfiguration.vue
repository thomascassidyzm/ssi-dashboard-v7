<template>
  <div class="voice-configuration">
    <!-- Header -->
    <div class="config-header">
      <h2 class="config-title">Voice Configuration</h2>
      <p class="config-subtitle">Select voices for each role. Changes save automatically.</p>
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

    <!-- Swim Lanes - All 3 roles visible -->
    <div v-else class="swim-lanes">
      <div
        v-for="role in roles"
        :key="role.id"
        :class="['swim-lane', { expanded: expandedRole === role.id }]"
      >
        <!-- Lane Header -->
        <div class="lane-header">
          <div class="lane-title">
            <span class="lane-icon">{{ role.icon }}</span>
            <span class="lane-name">{{ role.name }}</span>
          </div>
          <span class="lane-lang">{{ getLanguageForRole(role.id).toUpperCase() }}</span>
        </div>

        <!-- Current Selection -->
        <div v-if="getVoiceForRole(role.id).voiceId" class="lane-selection">
          <div class="selection-details">
            <span class="selection-name">{{ getVoiceForRole(role.id).name || getVoiceForRole(role.id).voiceId }}</span>
            <span class="selection-provider" :class="getVoiceForRole(role.id).provider">
              {{ getVoiceForRole(role.id).provider }}
            </span>
          </div>

          <!-- Speed Control -->
          <div class="speed-control">
            <label class="speed-label">
              Speed: <span class="speed-value">{{ formatSpeed(getVoiceForRole(role.id).settings?.speed || 1.0) }}</span>
            </label>
            <div class="speed-notches">
              <button
                v-for="speed in speedOptions"
                :key="speed"
                :class="['speed-notch', { active: isSpeedActive(role.id, speed) }]"
                @click="setSpeed(role.id, speed)"
                :title="`${speed}x`"
              >
                <span class="notch-mark"></span>
                <span class="notch-label">{{ speed === 1.0 ? '1x' : speed + 'x' }}</span>
              </button>
            </div>
          </div>

          <!-- Preview Phrase & Test -->
          <div class="preview-section">
            <div class="phrase-display">
              <span class="phrase-text">{{ getCurrentPhrase(role.id) }}</span>
              <button @click="cyclePhrase(role.id)" class="cycle-btn" title="Try another phrase">↻</button>
            </div>
            <button
              @click="testVoice(role.id)"
              :disabled="testingRole === role.id"
              class="test-btn"
            >
              <span v-if="testingRole === role.id" class="btn-spinner"></span>
              {{ testingRole === role.id ? 'Playing...' : '▶ Test Voice' }}
            </button>
          </div>

          <!-- Change Voice -->
          <button @click="expandRole(role.id)" class="change-btn">
            Change Voice
          </button>
        </div>

        <!-- Empty State -->
        <div v-else class="lane-empty">
          <button @click="expandRole(role.id)" class="select-voice-btn">
            Select Voice
          </button>
        </div>

        <!-- Expanded Voice Browser -->
        <div v-if="expandedRole === role.id" class="voice-browser">
          <div class="browser-header">
            <span>Choose a voice for {{ role.name }}</span>
            <button @click="expandedRole = null" class="close-btn">x</button>
          </div>

          <!-- Provider Toggle -->
          <div class="provider-toggle">
            <button
              :class="['provider-btn', { active: selectedProvider === 'azure' }]"
              @click="selectedProvider = 'azure'; discoverVoices(role.id)"
            >
              Azure
            </button>
            <button
              :class="['provider-btn', { active: selectedProvider === 'elevenlabs' }]"
              @click="selectedProvider = 'elevenlabs'"
            >
              ElevenLabs
            </button>
          </div>

          <!-- Azure Voices -->
          <div v-if="selectedProvider === 'azure'" class="azure-voices">
            <div v-if="discovering" class="discovering">
              <div class="btn-spinner"></div>
              <span>Loading voices...</span>
            </div>

            <div v-else-if="discoveredVoices.length > 0" class="voice-list">
              <!-- Search -->
              <div class="voice-search">
                <input
                  type="text"
                  v-model="searchQuery"
                  placeholder="Search voices..."
                  class="search-input"
                />
              </div>

              <!-- Locale Filter -->
              <div class="locale-filter">
                <select v-model="localeFilter" class="locale-select">
                  <option value="all">All Regions ({{ discoveredVoices.length }})</option>
                  <option
                    v-for="locale in availableLocales"
                    :key="locale.code"
                    :value="locale.code"
                  >
                    {{ locale.name }}
                  </option>
                </select>
              </div>

              <!-- Gender Filter -->
              <div class="voice-filter">
                <button
                  v-for="gender in ['all', 'Female', 'Male']"
                  :key="gender"
                  :class="['filter-btn', { active: genderFilter === gender }]"
                  @click="genderFilter = gender"
                >
                  {{ gender === 'all' ? 'All' : gender }}
                </button>
              </div>

              <!-- Voice Options -->
              <div class="voice-options">
                <button
                  v-for="voice in filteredVoices.slice(0, 20)"
                  :key="voice.id"
                  :class="['voice-option', { previewing: previewingVoiceId === voice.id }]"
                  @click="selectVoiceForRole(role.id, voice)"
                >
                  <div class="voice-info">
                    <span class="voice-name">{{ voice.displayName || voice.name }}</span>
                    <span :class="['voice-gender', voice.gender.toLowerCase()]">{{ voice.gender }}</span>
                    <span v-if="localeFilter === 'all'" class="voice-locale">{{ voice.locale }}</span>
                  </div>
                  <button
                    @click.stop="previewVoice(voice, role.id)"
                    :disabled="previewingVoiceId === voice.id"
                    class="preview-btn"
                  >
                    {{ previewingVoiceId === voice.id ? '...' : 'Preview' }}
                  </button>
                </button>
              </div>

              <div v-if="filteredVoices.length > 20" class="more-voices">
                + {{ filteredVoices.length - 20 }} more voices
              </div>
            </div>

            <button
              v-else
              @click="discoverVoices(role.id)"
              class="load-voices-btn"
            >
              Load Available Voices
            </button>
          </div>

          <!-- ElevenLabs Manual Entry -->
          <div v-else class="elevenlabs-entry">
            <input
              type="text"
              v-model="manualVoiceId"
              placeholder="Voice ID"
              class="voice-input"
            />
            <input
              type="text"
              v-model="manualVoiceName"
              placeholder="Display Name"
              class="voice-input"
            />
            <button
              @click="selectManualVoiceForRole(role.id)"
              :disabled="!manualVoiceId"
              class="use-voice-btn"
            >
              Use This Voice
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Save Status -->
    <div v-if="saveStatus" :class="['save-status', saveStatus.type]">
      {{ saveStatus.message }}
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
    default: () => localStorage.getItem('api_base_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3456'
  }
})

const emit = defineEmits(['config-saved', 'config-loaded'])

// State
const loading = ref(true)
const error = ref(null)
const config = ref(null)
const expandedRole = ref(null)
const saveStatus = ref(null)

// Voice browser state
const selectedProvider = ref('azure')
const discovering = ref(false)
const discoveredVoices = ref([])
const genderFilter = ref('all')
const localeFilter = ref('all')
const searchQuery = ref('')
const previewingVoiceId = ref(null)
const testingRole = ref(null)

// Manual ElevenLabs entry
const manualVoiceId = ref('')
const manualVoiceName = ref('')

// Audio
const audioPlayer = ref(null)

// Speed options (discrete notches) - biased toward slower for learning
const speedOptions = [0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0, 1.2, 1.5]

// Role definitions
const roles = [
  { id: 'target1', name: 'Target 1', icon: '🎯', description: 'Primary target voice', lang: 'target' },
  { id: 'target2', name: 'Target 2', icon: '🎯', description: 'Secondary target voice', lang: 'target' },
  { id: 'known', name: 'Known', icon: '🏠', description: 'Known language voice', lang: 'known' },
  { id: 'presentation', name: 'Presentation', icon: '🎬', description: 'LEGO introductions', lang: 'known' }
]

// SSi-style preview phrases per language (multiple options)
const previewPhrases = {
  eng: [
    "I'm trying to practice speaking every day",
    "I want to learn as much as I can",
    "This is working really well for me"
  ],
  spa: [
    "Estoy tratando de practicar cada día",
    "Quiero aprender todo lo que pueda",
    "Esto está funcionando muy bien"
  ],
  cym: [
    "Dw i'n trio ymarfer bob dydd",
    "Dw i isio dysgu cymaint â phosib",
    "Mae hyn yn gweithio'n dda iawn"
  ],
  zho: [
    "我每天都在练习",
    "我想尽可能多学一点",
    "这个方法对我很有效"
  ],
  cmn: [
    "我每天都在练习",
    "我想尽可能多学一点",
    "这个方法对我很有效"
  ],
  fra: [
    "J'essaie de pratiquer chaque jour",
    "Je veux apprendre autant que possible",
    "Ça marche très bien pour moi"
  ],
  deu: [
    "Ich versuche jeden Tag zu üben",
    "Ich möchte so viel wie möglich lernen",
    "Das funktioniert wirklich gut für mich"
  ],
  nld: [
    "Ik probeer elke dag te oefenen",
    "Ik wil zoveel mogelijk leren",
    "Dit werkt echt goed voor mij"
  ],
  ita: [
    "Cerco di praticare ogni giorno",
    "Voglio imparare il più possibile",
    "Questo sta funzionando molto bene"
  ],
  por: [
    "Estou tentando praticar todos os dias",
    "Quero aprender o máximo possível",
    "Isso está funcionando muito bem"
  ],
  jpn: [
    "毎日練習するようにしています",
    "できるだけたくさん学びたいです",
    "これはとてもうまくいっています"
  ],
  kor: [
    "매일 연습하려고 노력하고 있어요",
    "최대한 많이 배우고 싶어요",
    "이게 정말 잘 되고 있어요"
  ],
  ara: [
    "أحاول التدرب كل يوم",
    "أريد أن أتعلم قدر الإمكان",
    "هذا يعمل بشكل جيد جداً"
  ],
  gle: [
    "Táim ag iarraidh cleachtadh gach lá",
    "Ba mhaith liom oiread agus is féidir a fhoghlaim",
    "Tá sé seo ag obair go han-mhaith dom"
  ],
  swe: [
    "Jag försöker öva varje dag",
    "Jag vill lära mig så mycket som möjligt",
    "Det här fungerar verkligen bra för mig"
  ],
  fin: [
    "Yritän harjoitella joka päivä",
    "Haluan oppia niin paljon kuin mahdollista",
    "Tämä toimii todella hyvin minulle"
  ],
  tur: [
    "Her gün pratik yapmaya çalışıyorum",
    "Mümkün olduğunca çok şey öğrenmek istiyorum",
    "Bu benim için gerçekten iyi çalışıyor"
  ],
  eus: [
    "Egunero praktikatzeko saiatzen naiz",
    "Ahalik eta gehien ikasi nahi dut",
    "Hau oso ondo funtzionatzen du niretzat"
  ],
  bre: [
    "Klaskoù a ran pratiñ bemdez",
    "C'hoant am eus da zeskiñ kement ha ma c'hallan",
    "Labourat a ra mat-tre evidon"
  ],
  default: [
    "I'm trying to practice every day",
    "I want to learn as much as I can"
  ]
}

// Current phrase index per role (for cycling through phrases)
const phraseIndex = ref({})

// Computed
const availableLocales = computed(() => {
  const locales = new Map()
  for (const v of discoveredVoices.value) {
    if (v.locale && !locales.has(v.locale)) {
      locales.set(v.locale, v.localeName || v.locale)
    }
  }
  // Sort by locale name, but put preferred locales first
  const preferred = ['en-GB', 'es-ES', 'pt-PT', 'fr-FR', 'de-DE', 'it-IT']
  return Array.from(locales.entries())
    .sort((a, b) => {
      const aPreferred = preferred.indexOf(a[0])
      const bPreferred = preferred.indexOf(b[0])
      if (aPreferred !== -1 && bPreferred === -1) return -1
      if (bPreferred !== -1 && aPreferred === -1) return 1
      if (aPreferred !== -1 && bPreferred !== -1) return aPreferred - bPreferred
      return a[1].localeCompare(b[1])
    })
    .map(([code, name]) => ({ code, name }))
})

const filteredVoices = computed(() => {
  let voices = discoveredVoices.value

  // Filter by gender
  if (genderFilter.value !== 'all') {
    voices = voices.filter(v => v.gender === genderFilter.value)
  }

  // Filter by locale
  if (localeFilter.value !== 'all') {
    voices = voices.filter(v => v.locale === localeFilter.value)
  }

  // Filter by search query
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase().trim()
    voices = voices.filter(v =>
      (v.displayName || v.name || '').toLowerCase().includes(query) ||
      (v.localeName || '').toLowerCase().includes(query)
    )
  }

  return voices
})

// Methods
function getVoiceForRole(roleId) {
  return config.value?.voices?.[roleId] || { voiceId: '', provider: 'azure', settings: { speed: 1.0 } }
}

function getLanguageForRole(roleId) {
  const role = roles.find(r => r.id === roleId)
  if (!role) return 'unknown'
  const parts = props.courseCode.split('_for_')
  if (parts.length !== 2) return props.courseCode
  return role.lang === 'target' ? parts[0] : parts[1]
}

function getPhrasesForRole(roleId) {
  const lang = getLanguageForRole(roleId)
  return previewPhrases[lang] || previewPhrases['default']
}

function getCurrentPhrase(roleId) {
  const phrases = getPhrasesForRole(roleId)
  const idx = phraseIndex.value[roleId] || 0
  return phrases[idx % phrases.length]
}

function cyclePhrase(roleId) {
  const phrases = getPhrasesForRole(roleId)
  const current = phraseIndex.value[roleId] || 0
  phraseIndex.value[roleId] = (current + 1) % phrases.length
}

function formatSpeed(speed) {
  // Show 2 decimals for values like 0.75, 0.85, 0.95; otherwise 1 decimal
  const formatted = speed % 0.1 === 0 ? speed.toFixed(1) : speed.toFixed(2)
  return formatted + 'x'
}

function isSpeedActive(roleId, speed) {
  const currentSpeed = getVoiceForRole(roleId).settings?.speed || 1.0
  // Use tight tolerance for discrete speed values
  return Math.abs(currentSpeed - speed) < 0.01
}

async function setSpeed(roleId, speed) {
  if (!config.value.voices[roleId]) return

  config.value.voices[roleId].settings = {
    ...config.value.voices[roleId].settings,
    speed
  }

  await saveConfig()
}

function expandRole(roleId) {
  expandedRole.value = roleId
  genderFilter.value = 'all'
  localeFilter.value = 'all'
  searchQuery.value = ''
  discoveredVoices.value = []
  if (selectedProvider.value === 'azure') {
    discoverVoices(roleId)
  }
}

async function loadConfig() {
  loading.value = true
  error.value = null

  try {
    const response = await fetch(`${props.apiBaseUrl}/api/courses/${props.courseCode}/voice-config`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })

    if (!response.ok) throw new Error('Failed to load voice configuration')

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
  saveStatus.value = { type: 'saving', message: 'Saving...' }

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
      throw new Error(data.error || 'Failed to save')
    }

    const data = await response.json()
    config.value = data.config
    emit('config-saved', config.value)

    saveStatus.value = { type: 'success', message: 'Saved!' }
    setTimeout(() => { saveStatus.value = null }, 2000)
  } catch (err) {
    saveStatus.value = { type: 'error', message: err.message }
    console.error('[VoiceConfig] Save error:', err)
  }
}

async function discoverVoices(roleId) {
  discovering.value = true
  discoveredVoices.value = []

  try {
    const langCode = getLanguageForRole(roleId)
    const response = await fetch(`${props.apiBaseUrl}/api/voices/discover/${langCode}`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })

    if (!response.ok) throw new Error('Failed to discover voices')

    const data = await response.json()
    discoveredVoices.value = data.voices || []
  } catch (err) {
    console.error('[VoiceConfig] Discovery error:', err)
  } finally {
    discovering.value = false
  }
}

async function previewVoice(voice, roleId) {
  if (previewingVoiceId.value === voice.id) return
  previewingVoiceId.value = voice.id

  try {
    const text = getCurrentPhrase(roleId)
    const response = await fetch(`${props.apiBaseUrl}/api/voices/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({ voiceId: voice.id, text, speed: 1.0, provider: 'azure' })
    })

    if (!response.ok) throw new Error('Failed to preview')

    const data = await response.json()
    if (data.audio && audioPlayer.value) {
      audioPlayer.value.src = data.audio
      audioPlayer.value.play()
    }
  } catch (err) {
    console.error('[VoiceConfig] Preview error:', err)
    previewingVoiceId.value = null
  }
}

async function testVoice(roleId) {
  const voice = getVoiceForRole(roleId)
  if (!voice.voiceId || testingRole.value === roleId) return

  testingRole.value = roleId

  try {
    const text = getCurrentPhrase(roleId)
    const response = await fetch(`${props.apiBaseUrl}/api/voices/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({
        voiceId: voice.voiceId,
        text,
        speed: voice.settings?.speed || 1.0,
        provider: voice.provider || 'azure'
      })
    })

    if (!response.ok) throw new Error('Failed to test')

    const data = await response.json()
    if (data.audio && audioPlayer.value) {
      audioPlayer.value.src = data.audio
      audioPlayer.value.play()
    }

    // Cycle to next phrase after playing
    cyclePhrase(roleId)
  } catch (err) {
    console.error('[VoiceConfig] Test error:', err)
  } finally {
    testingRole.value = null
  }
}

async function selectVoiceForRole(roleId, voice) {
  if (!config.value.voices) config.value.voices = {}
  if (!config.value.voices[roleId]) config.value.voices[roleId] = {}

  config.value.voices[roleId] = {
    voiceId: voice.id,
    provider: 'azure',
    name: voice.displayName || voice.name,
    language: voice.locale,
    settings: { speed: 1.0 }
  }

  expandedRole.value = null
  await saveConfig()
}

async function selectManualVoiceForRole(roleId) {
  if (!manualVoiceId.value) return

  if (!config.value.voices) config.value.voices = {}
  if (!config.value.voices[roleId]) config.value.voices[roleId] = {}

  config.value.voices[roleId] = {
    voiceId: manualVoiceId.value,
    provider: 'elevenlabs',
    name: manualVoiceName.value || manualVoiceId.value,
    language: getLanguageForRole(roleId),
    settings: { speed: 1.0, stability: 0.5, similarityBoost: 0.75 }
  }

  expandedRole.value = null
  manualVoiceId.value = ''
  manualVoiceName.value = ''
  await saveConfig()
}

function onAudioEnded() {
  previewingVoiceId.value = null
  testingRole.value = null
}

// Watch for course code changes
watch(() => props.courseCode, () => {
  if (props.courseCode) loadConfig()
})

// Load on mount
onMounted(() => {
  if (props.courseCode) loadConfig()
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

/* Loading & Error */
.loading-state, .error-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px;
  color: #94a3b8;
}

.spinner, .btn-spinner {
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

/* Swim Lanes */
.swim-lanes {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

@media (max-width: 1100px) {
  .swim-lanes {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .swim-lanes {
    grid-template-columns: 1fr;
  }
}

.swim-lane {
  background: #0f172a;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 16px;
  transition: all 0.2s;
}

.swim-lane.expanded {
  border-color: #10b981;
}

.lane-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #334155;
}

.lane-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.lane-icon {
  font-size: 1.25rem;
}

.lane-name {
  font-weight: 600;
  color: #e2e8f0;
}

.lane-lang {
  background: #334155;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  color: #94a3b8;
  letter-spacing: 0.05em;
}

/* Lane Selection */
.lane-selection {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.selection-details {
  display: flex;
  align-items: center;
  gap: 8px;
}

.selection-name {
  color: #e2e8f0;
  font-weight: 500;
  font-size: 0.9rem;
}

.selection-provider {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
}

.selection-provider.azure {
  background: #3b82f6;
  color: white;
}

.selection-provider.elevenlabs {
  background: #8b5cf6;
  color: white;
}

/* Speed Control with Notches */
.speed-control {
  background: #1e293b;
  padding: 12px;
  border-radius: 8px;
}

.speed-label {
  display: block;
  font-size: 0.75rem;
  color: #64748b;
  margin-bottom: 8px;
}

.speed-value {
  color: #10b981;
  font-weight: 600;
  font-family: monospace;
}

.speed-notches {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  height: 32px;
  padding: 0 4px;
}

.speed-notch {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}

.notch-mark {
  width: 3px;
  height: 12px;
  background: #334155;
  border-radius: 2px;
  transition: all 0.15s;
}

.speed-notch:hover .notch-mark {
  background: #64748b;
  height: 16px;
}

.speed-notch.active .notch-mark {
  background: #10b981;
  height: 20px;
}

.notch-label {
  font-size: 0.6rem;
  color: #64748b;
  opacity: 0;
  transition: opacity 0.15s;
}

.speed-notch:hover .notch-label,
.speed-notch.active .notch-label {
  opacity: 1;
}

.speed-notch.active .notch-label {
  color: #10b981;
}

/* Preview Section */
.preview-section {
  background: #1e293b;
  border-radius: 8px;
  padding: 12px;
}

.phrase-display {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.phrase-text {
  flex: 1;
  font-size: 0.8rem;
  color: #94a3b8;
  font-style: italic;
  line-height: 1.4;
}

.cycle-btn {
  width: 24px;
  height: 24px;
  background: #334155;
  border: none;
  border-radius: 4px;
  color: #64748b;
  cursor: pointer;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.cycle-btn:hover {
  background: #475569;
  color: #10b981;
}

/* Buttons */
.test-btn, .change-btn {
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.test-btn {
  width: 100%;
  background: #10b981;
  color: #0f172a;
}

.test-btn:hover:not(:disabled) {
  background: #059669;
}

.change-btn {
  background: transparent;
  border: 1px solid #334155;
  color: #94a3b8;
}

.change-btn:hover {
  border-color: #10b981;
  color: #10b981;
}

/* Lane Empty */
.lane-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
}

.select-voice-btn {
  padding: 16px 32px;
  background: #10b981;
  color: #0f172a;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.select-voice-btn:hover {
  background: #059669;
}

/* Voice Browser */
.voice-browser {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #334155;
}

.browser-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  color: #94a3b8;
  font-size: 0.85rem;
}

.close-btn {
  width: 24px;
  height: 24px;
  background: #334155;
  border: none;
  border-radius: 4px;
  color: #94a3b8;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
}

.close-btn:hover {
  background: #475569;
  color: #e2e8f0;
}

.provider-toggle {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.provider-btn {
  flex: 1;
  padding: 8px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
  color: #94a3b8;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
}

.provider-btn.active {
  background: #10b981;
  border-color: #10b981;
  color: #0f172a;
}

/* Azure Voices */
.discovering {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  color: #64748b;
  font-size: 0.85rem;
}

/* Search */
.voice-search {
  margin-bottom: 12px;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
  color: #e2e8f0;
  font-size: 0.85rem;
}

.search-input:focus {
  outline: none;
  border-color: #10b981;
}

.search-input::placeholder {
  color: #64748b;
}

/* Locale Filter */
.locale-filter {
  margin-bottom: 12px;
}

.locale-select {
  width: 100%;
  padding: 8px 12px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
  color: #e2e8f0;
  font-size: 0.8rem;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 16px;
  padding-right: 32px;
}

.locale-select:focus {
  outline: none;
  border-color: #10b981;
}

.voice-filter {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
}

.filter-btn {
  flex: 1;
  padding: 6px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 4px;
  color: #64748b;
  font-size: 0.7rem;
  cursor: pointer;
}

.filter-btn.active {
  background: #334155;
  color: #e2e8f0;
}

.voice-options {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 280px;
  overflow-y: auto;
}

.voice-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.voice-option:hover {
  border-color: #10b981;
  background: #10b981/10;
}

.voice-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.voice-name {
  color: #e2e8f0;
  font-size: 0.8rem;
  font-weight: 500;
}

.voice-gender {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 0.6rem;
  font-weight: 600;
}

.voice-gender.female {
  background: #ec4899;
  color: white;
}

.voice-gender.male {
  background: #3b82f6;
  color: white;
}

.voice-locale {
  padding: 2px 6px;
  background: #334155;
  border-radius: 3px;
  font-size: 0.6rem;
  color: #94a3b8;
  font-family: monospace;
}

.preview-btn {
  padding: 4px 10px;
  background: #334155;
  border: none;
  border-radius: 4px;
  color: #94a3b8;
  font-size: 0.7rem;
  cursor: pointer;
}

.preview-btn:hover:not(:disabled) {
  background: #475569;
  color: #e2e8f0;
}

.more-voices {
  text-align: center;
  padding: 8px;
  color: #64748b;
  font-size: 0.75rem;
}

.load-voices-btn {
  width: 100%;
  padding: 12px;
  background: #334155;
  border: none;
  border-radius: 6px;
  color: #e2e8f0;
  font-weight: 500;
  cursor: pointer;
}

.load-voices-btn:hover {
  background: #475569;
}

/* ElevenLabs Entry */
.elevenlabs-entry {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.voice-input {
  padding: 10px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
  color: #e2e8f0;
  font-size: 0.85rem;
}

.voice-input:focus {
  outline: none;
  border-color: #10b981;
}

.use-voice-btn {
  padding: 10px;
  background: #10b981;
  border: none;
  border-radius: 6px;
  color: #0f172a;
  font-weight: 600;
  cursor: pointer;
}

.use-voice-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Save Status */
.save-status {
  margin-top: 16px;
  padding: 12px 16px;
  border-radius: 8px;
  text-align: center;
  font-size: 0.85rem;
  font-weight: 500;
}

.save-status.saving {
  background: #334155;
  color: #94a3b8;
}

.save-status.success {
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
}

.save-status.error {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
}
</style>
