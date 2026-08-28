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
          <span class="lane-lang">{{ languageName(getLanguageForRole(role.id)) }}</span>
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
              <span class="phrase-text bidi-isolate" :dir="dirFor(getCurrentPhrase(role.id))">{{ getCurrentPhrase(role.id) }}</span>
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

          <!-- Provider Toggle. xAI's button is GONE, not disabled: a new render
               may not use it (Tom, 2026-08-27), and a greyed-out button is an
               invitation to ask why. Existing xAI clips are untouched and still
               play — retirement is from selection only. -->
          <div class="provider-toggle">
            <button
              :class="['provider-btn', { active: selectedProvider === 'azure' }]"
              @click="selectedProvider = 'azure'; discoverVoices(role.id, 'azure')"
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

          <!-- Custom preview text (overrides cycled seed phrase across all tabs) -->
          <div class="custom-preview">
            <input
              type="text"
              v-model="customText[role.id]"
              :placeholder="`Type a word or phrase to preview (defaults to: ${getPhrasesForRole(role.id)[0] || '—'})`"
              class="custom-preview-input"
            />
            <button
              v-if="customText[role.id]"
              @click="customText[role.id] = ''"
              class="custom-preview-clear"
              title="Clear and use seed phrases"
            >
              x
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

    <!-- Learner Playback Section -->
    <div v-if="config" class="playback-section">
      <h3 class="playback-title">Learner Playback</h3>
      <p class="playback-subtitle">Controls how target audio plays in the learning app. Does not affect TTS generation.</p>

      <div class="playback-controls">
        <!-- Belt Ramp Toggle -->
        <div class="playback-row" @click="toggleBeltRamp">
          <div class="playback-info">
            <span class="playback-label">Beginner speed ramp</span>
            <span class="playback-desc">Slow target audio for early seeds (White belt 0.82x, Yellow 0.91x, then normal). Only enable for audio recorded at natural speed.</span>
          </div>
          <div :class="['playback-toggle', { active: config.target_speed?.belt_ramp }]">
            <div class="playback-toggle-track">
              <div class="playback-toggle-thumb"></div>
            </div>
          </div>
        </div>

        <!-- Global Speed -->
        <div class="playback-row">
          <div class="playback-info">
            <span class="playback-label">Global playback speed</span>
            <span class="playback-desc">Base speed multiplier for all target audio in the learner app. Use to compensate if a voice sounds naturally fast or slow.</span>
          </div>
          <div class="global-speed-control">
            <div class="speed-notches">
              <button
                v-for="speed in globalSpeedOptions"
                :key="speed"
                :class="['speed-notch', { active: isGlobalSpeedActive(speed) }]"
                @click="setGlobalSpeed(speed)"
                :title="`${speed}x`"
              >
                <span class="notch-mark"></span>
                <span class="notch-label">{{ speed === 1.0 ? '1x' : speed + 'x' }}</span>
              </button>
            </div>
            <span class="global-speed-value">{{ formatSpeed(config.target_speed?.global_speed || 1.0) }}</span>
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
import { getApiUrl } from '@/services/api'
import { languageName } from '@/utils/languageNames'
import { dirFor } from '@/utils/textDirection.js'
import { isConfigured as isSupabaseConfigured, getVoiceConfig, getSeedPhrasesPreview } from '@/services/supabase'

const props = defineProps({
  courseCode: {
    type: String,
    required: true
  },
  apiBaseUrl: {
    type: String,
    default: () => localStorage.getItem('api_base_url') || getApiUrl()
  }
})

const emit = defineEmits(['config-saved', 'config-loaded'])

// State
const loading = ref(true)
const error = ref(null)
const config = ref(null)
const expandedRole = ref(null)
const saveStatus = ref(null)

// Voice browser state. Set per-role on expand via defaultProviderForRole.
const selectedProvider = ref('azure')
const discovering = ref(false)
const discoveredVoices = ref([])
const genderFilter = ref('all')
const localeFilter = ref('all')
const searchQuery = ref('')
const previewingVoiceId = ref(null)
const testingRole = ref(null)

// Per-role custom preview text. When non-empty, overrides the cycled seed phrase
// for both Test Voice and per-voice Preview buttons. Lets users audition voices
// on specific words (e.g. tone-sensitive single syllables in Mandarin).
const customText = ref({})

// Manual ElevenLabs entry
const manualVoiceId = ref('')
const manualVoiceName = ref('')

// Audio
const audioPlayer = ref(null)

// Speed options (discrete notches) - biased toward slower for learning
const speedOptions = [0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0, 1.2, 1.5]

// Global playback speed options (for learner app, not TTS)
const globalSpeedOptions = [0.8, 0.85, 0.9, 0.95, 1.0, 1.05, 1.1]

// Role definitions
const roles = [
  { id: 'target1', name: 'Voice 1', icon: '🎯', description: 'Target language — Voice 1', lang: 'target' },
  { id: 'target2', name: 'Voice 2', icon: '🎯', description: 'Target language — Voice 2', lang: 'target' },
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
  pol: [
    "Staram się ćwiczyć każdego dnia",
    "Chcę się nauczyć jak najwięcej",
    "To naprawdę dobrze działa"
  ],
  ron: [
    "Încerc să exersez în fiecare zi",
    "Vreau să învăț cât mai mult posibil",
    "Asta funcționează foarte bine pentru mine"
  ],
  ell: [
    "Προσπαθώ να εξασκούμαι κάθε μέρα",
    "Θέλω να μάθω όσο περισσότερα μπορώ",
    "Αυτό λειτουργεί πολύ καλά για μένα"
  ],
  hrv: [
    "Pokušavam vježbati svaki dan",
    "Želim naučiti što više mogu",
    "Ovo stvarno dobro funkcionira za mene"
  ],
  hin: [
    "मैं हर दिन अभ्यास करने की कोशिश कर रहा हूँ",
    "मैं जितना हो सके उतना सीखना चाहता हूँ",
    "यह मेरे लिए बहुत अच्छा काम कर रहा है"
  ],
  rus: [
    "Я стараюсь практиковаться каждый день",
    "Я хочу выучить как можно больше",
    "Это работает очень хорошо для меня"
  ],
  sin: [
    "මම සෑම දිනකම පුහුණු වීමට උත්සාහ කරනවා",
    "මට හැකි තරම් ඉගෙන ගන්න ඕනේ",
    "මේක මට හරිම හොඳින් වැඩ කරනවා"
  ],
  tam: [
    "நான் தினமும் பயிற்சி செய்ய முயற்சிக்கிறேன்",
    "என்னால் முடிந்தவரை கற்றுக்கொள்ள விரும்புகிறேன்",
    "இது எனக்கு மிகவும் நன்றாக வேலை செய்கிறது"
  ],
  fas: [
    "من هر روز سعی می‌کنم تمرین کنم",
    "می‌خواهم تا جایی که می‌توانم یاد بگیرم",
    "این روش برای من خیلی خوب کار می‌کند"
  ],
  prs: [
    "من هر روز کوشش می‌کنم تمرین کنم",
    "می‌خواهم هر قدر که بتوانم یاد بگیرم",
    "این برایم بسیار خوب کار می‌کند"
  ],
  pus: [
    "زه هره ورځ د تمرین هڅه کوم",
    "زه غواړم هر څومره چې وکولای شم زده کړم",
    "دا زما لپاره ډیره ښه کار کوي"
  ],
  nor: [
    "Jeg prøver å øve hver dag",
    "Jeg vil lære så mye som mulig",
    "Dette fungerer veldig bra for meg"
  ],
  nob: [
    "Jeg prøver å øve hver dag",
    "Jeg vil lære så mye som mulig",
    "Dette fungerer veldig bra for meg"
  ],
  nno: [
    "Eg prøver å øve kvar dag",
    "Eg vil lære så mykje som mogleg",
    "Dette fungerer veldig bra for meg"
  ],
  bul: [
    "Опитвам се да практикувам всеки ден",
    "Искам да науча колкото е възможно повече",
    "Това работи наистина добре за мен"
  ],
  gsw: [
    "Ich versuech jede Tag z üebe",
    "Ich wett so viel wie möglech lehre",
    "Das funktioniert würklech guet für mich"
  ],
  ukr: [
    "Я намагаюся практикуватися щодня",
    "Я хочу вивчити якомога більше",
    "Це працює дуже добре для мене"
  ],
  gla: [
    "Tha mi a' feuchainn ri cleachdadh a h-uile latha",
    "Tha mi airson ionnsachadh cho mòr 's a ghabhas",
    "Tha seo ag obair glè mhath dhomh"
  ],
  cat: [
    "Intento practicar cada dia",
    "Vull aprendre tant com pugui",
    "Això em funciona molt bé"
  ],
  isl: [
    "Ég reyni að æfa mig á hverjum degi",
    "Ég vil læra eins mikið og ég get",
    "Þetta virkar mjög vel fyrir mig"
  ],
  tha: [
    "ผมพยายามฝึกทุกวัน",
    "ผมอยากเรียนรู้ให้ได้มากที่สุด",
    "วิธีนี้ได้ผลดีมากสำหรับผม"
  ],
  hye: [
    "Ես փորձում եմ ամեն օր վարժել",
    "Ես ուզում եմ սովորել հնարավորինս շատ",
    "Սա շատ լավ է աշխատում ինձ համար"
  ],
  default: [
    "I'm trying to practice every day",
    "I want to learn as much as I can"
  ]
}

// Live seed phrases fetched from DB (keyed by 'known' / 'target')
const livePhrases = ref({ known: [], target: [] })

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
  // Extract base language (first 3 chars), stripping dialect suffix
  // e.g. 'por_br' → 'por', 'spa_mx' → 'spa', 'deu_at' → 'deu'
  const target = parts[0].substring(0, 3)
  return role.lang === 'target' ? target : parts[1]
}

// xAI used to be the default here for the 18 languages it officially supported.
// It is RETIRED FROM SELECTION (Tom, 2026-08-27) and the picker no longer
// offers it, so the default is Azure — which is also where the server-side
// ladder lands today, since the estate holds exactly one Cartesia voice and
// nothing is cast per language yet (services/shared/tts-provider-policy.cjs).
//
// This picker deliberately does NOT try to mirror the ladder. It chooses which
// voice LIST to show a human first; the ladder decides what actually renders,
// and it is the one that has to be right. Two implementations of one policy is
// how they drift.
function defaultProviderForRole(_roleId) {
  return 'azure'
}

function getPhrasesForRole(roleId) {
  const role = roles.find(r => r.id === roleId)
  const side = role?.lang === 'target' ? 'target' : 'known'
  if (livePhrases.value[side].length > 0) return livePhrases.value[side]
  // Fallback to hardcoded phrases if no seeds loaded
  const lang = getLanguageForRole(roleId)
  return previewPhrases[lang] || previewPhrases['default']
}

function getCurrentPhrase(roleId) {
  const custom = (customText.value[roleId] || '').trim()
  if (custom) return custom
  const phrases = getPhrasesForRole(roleId)
  const idx = phraseIndex.value[roleId] || 0
  return phrases[idx % phrases.length]
}

function cyclePhrase(roleId) {
  const phrases = getPhrasesForRole(roleId)
  const current = phraseIndex.value[roleId] || 0
  phraseIndex.value[roleId] = (current + 1) % phrases.length
}

async function loadSeedPhrases() {
  try {
    const resp = await fetch(`${props.apiBaseUrl}/api/courses/${props.courseCode}/seed-phrases-preview`, {
      headers: { 'ngrok-skip-browser-warning': 'true' }
    })
    if (!resp.ok) return
    const data = await resp.json()
    if (data.known?.length) livePhrases.value.known = data.known
    if (data.target?.length) livePhrases.value.target = data.target
  } catch (e) {
    // Fallback to hardcoded phrases silently
  }
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
  // Auto-load the default provider's voices so they're the first ones shown.
  selectedProvider.value = defaultProviderForRole(roleId)
  if (selectedProvider.value !== 'elevenlabs') {
    discoverVoices(roleId, selectedProvider.value)
  }
}

async function loadConfig() {
  loading.value = true
  error.value = null

  try {
    let voiceConfig = null
    if (isSupabaseConfigured()) {
      voiceConfig = await getVoiceConfig(props.courseCode)
    }
    if (!voiceConfig && props.apiBaseUrl) {
      // Fallback to API (handles RLS gaps or missing Supabase config)
      const response = await fetch(`${props.apiBaseUrl}/api/courses/${props.courseCode}/voice-config`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      })
      if (response.ok) {
        const data = await response.json()
        voiceConfig = data.config
      }
    }
    config.value = voiceConfig || {}
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

async function discoverVoices(roleId, provider = 'azure') {
  discovering.value = true
  discoveredVoices.value = []

  try {
    const langCode = getLanguageForRole(roleId)
    const url = `${props.apiBaseUrl}/api/voices/discover/${langCode}?provider=${provider}`
    const response = await fetch(url, {
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
    // Use the voice's declared provider (azure / elevenlabs / xai). Fall back to
    // the currently-selected provider button if the voice object doesn't carry one.
    const provider = voice.provider || selectedProvider.value || 'azure'
    const body = { voiceId: voice.id, text, speed: 1.0, provider }
    if (provider === 'xai') body.language = voice.locale  // BCP-47 for xAI

    const response = await fetch(`${props.apiBaseUrl}/api/voices/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify(body)
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
    const provider = voice.provider || 'azure'
    const body = {
      voiceId: voice.voiceId,
      text,
      speed: voice.settings?.speed || 1.0,
      provider
    }
    // xAI needs a BCP-47 language code — use the course's target language
    if (provider === 'xai') {
      body.language = getLanguageForRole(roleId)
    }
    const response = await fetch(`${props.apiBaseUrl}/api/voices/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify(body)
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
    provider: voice.provider || 'azure',
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

// Learner playback controls
async function toggleBeltRamp() {
  if (!config.value) return
  if (!config.value.target_speed) config.value.target_speed = {}
  config.value.target_speed.belt_ramp = !config.value.target_speed.belt_ramp
  await saveConfig()
}

function isGlobalSpeedActive(speed) {
  const current = config.value?.target_speed?.global_speed || 1.0
  return Math.abs(current - speed) < 0.01
}

async function setGlobalSpeed(speed) {
  if (!config.value) return
  if (!config.value.target_speed) config.value.target_speed = {}
  config.value.target_speed.global_speed = speed
  await saveConfig()
}

function onAudioEnded() {
  previewingVoiceId.value = null
  testingRole.value = null
}

// Watch for course code changes
watch(() => props.courseCode, () => {
  if (props.courseCode) {
    loadConfig()
    loadSeedPhrases()
  }
})

// Load on mount
onMounted(() => {
  if (props.courseCode) {
    loadConfig()
    loadSeedPhrases()
  }
})
</script>

<style scoped>
/* The preview phrase binds `dir`; the row it sits in does not move. */
.phrase-text { text-align: left; }

.voice-configuration {
  background: var(--surface);
  border-radius: 0 0 12px 12px;
  padding: 24px;
}

.config-header {
  margin-bottom: 24px;
}

.config-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--accent-2);
  margin: 0 0 8px 0;
}

.config-subtitle {
  color: var(--muted);
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
  color: var(--muted);
}

.spinner, .btn-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--surface-2);
  border-top-color: var(--accent-2);
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
  background: var(--surface-2);
  color: var(--ink);
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
  background: var(--canvas);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 16px;
  transition: all 0.2s;
}

:root[data-theme="light"] .swim-lane {
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
}

.swim-lane.expanded {
  border-color: var(--accent-2);
}

.lane-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--line);
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
  color: var(--ink);
}

.lane-lang {
  background: var(--surface-2);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--muted);
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
  color: var(--ink);
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
  background: var(--surface);
  padding: 12px;
  border-radius: 8px;
}

.speed-label {
  display: block;
  font-size: 0.75rem;
  color: var(--faint);
  margin-bottom: 8px;
}

.speed-value {
  color: var(--accent-2);
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
  background: var(--line);
  border-radius: 2px;
  transition: all 0.15s;
}

.speed-notch:hover .notch-mark {
  background: var(--faint);
  height: 16px;
}

.speed-notch.active .notch-mark {
  background: var(--accent-2);
  height: 20px;
}

.notch-label {
  font-size: 0.6rem;
  color: var(--faint);
  opacity: 0;
  transition: opacity 0.15s;
}

.speed-notch:hover .notch-label,
.speed-notch.active .notch-label {
  opacity: 1;
}

.speed-notch.active .notch-label {
  color: var(--accent-2);
}

/* Preview Section */
.preview-section {
  background: var(--surface);
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
  color: var(--muted);
  font-style: italic;
  line-height: 1.4;
}

.cycle-btn {
  width: 24px;
  height: 24px;
  background: var(--surface-2);
  border: none;
  border-radius: 4px;
  color: var(--faint);
  cursor: pointer;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.cycle-btn:hover {
  background: var(--surface-3);
  color: var(--accent-2);
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
  background: var(--accent-2);
  color: var(--canvas);
}

.test-btn:hover:not(:disabled) {
  background: #059669;
}

.change-btn {
  background: transparent;
  border: 1px solid var(--line);
  color: var(--muted);
}

.change-btn:hover {
  border-color: var(--accent-2);
  color: var(--accent-2);
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
  background: var(--accent-2);
  color: var(--canvas);
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
  border-top: 1px solid var(--line);
}

.browser-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  color: var(--muted);
  font-size: 0.85rem;
}

.close-btn {
  width: 24px;
  height: 24px;
  background: var(--surface-2);
  border: none;
  border-radius: 4px;
  color: var(--muted);
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
}

.close-btn:hover {
  background: var(--surface-3);
  color: var(--ink);
}

.provider-toggle {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.provider-btn {
  flex: 1;
  padding: 8px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 6px;
  color: var(--muted);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
}

.provider-btn.active {
  background: var(--accent-2);
  border-color: var(--accent-2);
  color: var(--canvas);
}

/* Custom preview text (overrides cycled seed phrases) */
.custom-preview {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-bottom: 12px;
}

.custom-preview-input {
  flex: 1;
  padding: 8px 12px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 6px;
  color: var(--ink);
  font-size: 0.85rem;
}

.custom-preview-input:focus {
  outline: none;
  border-color: var(--accent-2);
}

.custom-preview-input::placeholder {
  color: var(--faint);
  font-style: italic;
}

.custom-preview-clear {
  padding: 6px 10px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 6px;
  color: var(--muted);
  cursor: pointer;
  font-size: 0.85rem;
  line-height: 1;
}

.custom-preview-clear:hover {
  color: var(--ink);
  border-color: var(--surface-3);
}

/* Azure Voices */
.discovering {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  color: var(--faint);
  font-size: 0.85rem;
}

/* Search */
.voice-search {
  margin-bottom: 12px;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 6px;
  color: var(--ink);
  font-size: 0.85rem;
}

.search-input:focus {
  outline: none;
  border-color: var(--accent-2);
}

.search-input::placeholder {
  color: var(--faint);
}

/* Locale Filter */
.locale-filter {
  margin-bottom: 12px;
}

.locale-select {
  width: 100%;
  padding: 8px 12px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 6px;
  color: var(--ink);
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
  border-color: var(--accent-2);
}

.voice-filter {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
}

.filter-btn {
  flex: 1;
  padding: 6px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 4px;
  color: var(--faint);
  font-size: 0.7rem;
  cursor: pointer;
}

.filter-btn.active {
  background: var(--surface-2);
  color: var(--ink);
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
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.voice-option:hover {
  border-color: var(--accent-2);
  background: var(--surface-3);
}

.voice-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.voice-name {
  color: var(--ink);
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
  background: var(--surface-2);
  border-radius: 3px;
  font-size: 0.6rem;
  color: var(--muted);
  font-family: monospace;
}

.preview-btn {
  padding: 4px 10px;
  background: var(--surface-2);
  border: none;
  border-radius: 4px;
  color: var(--muted);
  font-size: 0.7rem;
  cursor: pointer;
}

.preview-btn:hover:not(:disabled) {
  background: var(--surface-3);
  color: var(--ink);
}

.more-voices {
  text-align: center;
  padding: 8px;
  color: var(--faint);
  font-size: 0.75rem;
}

.load-voices-btn {
  width: 100%;
  padding: 12px;
  background: var(--surface-2);
  border: none;
  border-radius: 6px;
  color: var(--ink);
  font-weight: 500;
  cursor: pointer;
}

.load-voices-btn:hover {
  background: var(--surface-3);
}

/* xAI voice list — similar to Azure but voices are multilingual */
.xai-voices {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.xai-note {
  font-size: 0.8rem;
  color: var(--muted);
  margin: 0 0 10px;
  padding: 8px 10px;
  background: var(--surface);
  border-left: 3px solid #8b5cf6;
  border-radius: 4px;
  line-height: 1.45;
}

/* ElevenLabs Entry */
.elevenlabs-entry {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.voice-input {
  padding: 10px;
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 6px;
  color: var(--ink);
  font-size: 0.85rem;
}

.voice-input:focus {
  outline: none;
  border-color: var(--accent-2);
}

.use-voice-btn {
  padding: 10px;
  background: var(--accent-2);
  border: none;
  border-radius: 6px;
  color: var(--canvas);
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
  background: var(--surface-2);
  color: var(--muted);
}

.save-status.success {
  background: rgba(16, 185, 129, 0.2);
  color: var(--accent-2);
}

.save-status.error {
  background: rgba(239, 68, 68, 0.2);
  color: var(--danger);
}

/* Learner Playback Section */
.playback-section {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--line);
}

.playback-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--ink);
  margin: 0 0 4px 0;
}

.playback-subtitle {
  color: var(--faint);
  font-size: 0.8rem;
  margin: 0 0 16px 0;
}

.playback-controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.playback-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: var(--canvas);
  border: 1px solid var(--line);
  border-radius: 10px;
  cursor: pointer;
}

:root[data-theme="light"] .playback-row {
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
}

.playback-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.playback-label {
  color: var(--ink);
  font-weight: 500;
  font-size: 0.9rem;
}

.playback-desc {
  color: var(--faint);
  font-size: 0.75rem;
  line-height: 1.4;
}

.playback-toggle {
  flex-shrink: 0;
}

.playback-toggle-track {
  width: 40px;
  height: 22px;
  background: var(--surface-2);
  border-radius: 11px;
  position: relative;
  transition: background 0.2s;
}

.playback-toggle.active .playback-toggle-track {
  background: var(--accent-2);
}

.playback-toggle-thumb {
  width: 18px;
  height: 18px;
  background: var(--ink);
  border-radius: 50%;
  position: absolute;
  top: 2px;
  left: 2px;
  transition: transform 0.2s;
}

.playback-toggle.active .playback-toggle-thumb {
  transform: translateX(18px);
}

.global-speed-control {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.global-speed-value {
  color: var(--accent-2);
  font-weight: 600;
  font-family: monospace;
  font-size: 0.85rem;
  min-width: 3.5em;
  text-align: right;
}

/* Light-mode: darken fixed-hue brand pills so small white text meets WCAG AA.
   Same hue family as dark; dark mode keeps the brighter fills above. */
:root[data-theme="light"] .selection-provider.azure,
:root[data-theme="light"] .voice-gender.male {
  background: #1d4ed8; /* blue-700, white text 5.2:1 */
}

:root[data-theme="light"] .selection-provider.elevenlabs {
  background: #6d28d9; /* violet-700, white text 5.7:1 */
}

:root[data-theme="light"] .voice-gender.female {
  background: #be185d; /* pink-700, white text 5.9:1 */
}
</style>
