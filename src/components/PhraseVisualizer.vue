<template>
  <div class="phrase-visualizer">
    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <div class="text-slate-400">Loading baskets...</div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-900/20 border border-red-500/50 rounded-lg p-6">
      <h3 class="text-red-400 font-semibold mb-2">Error Loading Baskets</h3>
      <p class="text-slate-300">{{ error }}</p>
    </div>

    <!-- Basket Display -->
    <div v-else-if="currentBasket" class="space-y-4">
      <!-- Navigation Header -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3">
          <button
            @click="previousBasket"
            :disabled="currentBasketIndex === 0"
            class="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-300 rounded transition-colors"
          >
            ← Previous
          </button>
          <span class="text-slate-400">
            Basket {{ currentBasket.basket_id }} of {{ totalBaskets }}
          </span>
          <button
            @click="nextBasket"
            :disabled="currentBasketIndex === totalBaskets - 1"
            class="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-300 rounded transition-colors"
          >
            Next →
          </button>
        </div>
        <div class="text-sm text-slate-500">
          {{ currentBasket.metadata?.course_code || courseCode }}
        </div>
      </div>

      <!-- Basket Card -->
      <div class="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
        <!-- Basket Header -->
        <div class="bg-emerald-900/20 border-b border-emerald-700/30 p-6">
          <div class="flex items-start justify-between">
            <div>
              <h2 class="text-2xl font-bold text-emerald-400 mb-2">
                Basket {{ currentBasket.basket_id }}
              </h2>
              <div class="flex gap-4 text-sm text-slate-400">
                <span>{{ currentBasket.lego_count }} LEGOs</span>
                <span>Score: {{ currentBasket.metadata?.composite_score || 'N/A' }}</span>
              </div>
            </div>
            <div class="text-right">
              <div class="text-xs text-slate-500 mb-1">Patterns Included</div>
              <div class="flex flex-wrap gap-1 justify-end">
                <span
                  v-for="pattern in currentBasket.metadata?.patterns_included || []"
                  :key="pattern"
                  class="px-2 py-1 bg-emerald-600/20 text-emerald-400 rounded text-xs"
                >
                  {{ pattern }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- LEGO Phrases List -->
        <div class="p-6">
          <div class="space-y-3">
            <div
              v-for="(lego, index) in currentBasket.legos"
              :key="lego.uuid"
              class="group relative bg-slate-900/50 border border-slate-700 rounded-lg p-4 hover:border-emerald-500/50 transition-colors"
              :class="{ 'ring-2 ring-emerald-500': editingIndex === index }"
            >
              <!-- Reorder Controls -->
              <div v-if="editable" class="absolute left-2 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  @click="moveUp(index)"
                  :disabled="index === 0"
                  class="p-1 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-300 rounded text-xs"
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  @click="moveDown(index)"
                  :disabled="index === currentBasket.legos.length - 1"
                  class="p-1 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 text-slate-300 rounded text-xs"
                  title="Move down"
                >
                  ↓
                </button>
              </div>

              <div class="flex items-start gap-4 ml-8">
                <!-- Index Number -->
                <div class="flex-shrink-0 w-8 h-8 bg-emerald-600/20 text-emerald-400 rounded-full flex items-center justify-center text-sm font-semibold">
                  {{ index + 1 }}
                </div>

                <!-- Phrase Content -->
                <div class="flex-1">
                  <!-- Editable Phrase Text -->
                  <div v-if="editingIndex === index" class="space-y-2">
                    <textarea
                      v-model="editedText"
                      class="w-full bg-slate-800 border border-emerald-500 rounded px-3 py-2 text-emerald-300 text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium resize-none"
                      rows="2"
                      @keydown.enter.meta="saveEdit(index)"
                      @keydown.enter.ctrl="saveEdit(index)"
                      @keydown.escape="cancelEdit"
                    ></textarea>
                    <div class="flex gap-2">
                      <button
                        @click="saveEdit(index)"
                        class="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm"
                      >
                        Save
                      </button>
                      <button
                        @click="cancelEdit"
                        class="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-sm"
                      >
                        Cancel
                      </button>
                      <span class="text-xs text-slate-500 self-center ml-2">
                        Ctrl+Enter to save, Esc to cancel
                      </span>
                    </div>
                  </div>

                  <!-- Display Mode -->
                  <div v-else>
                    <div class="flex items-start justify-between mb-2">
                      <div class="text-emerald-300 text-lg font-medium">"{{ lego.text }}"</div>
                      <button
                        v-if="editable"
                        @click="startEdit(index, lego.text)"
                        class="opacity-0 group-hover:opacity-100 px-3 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded text-sm transition-all"
                      >
                        Edit
                      </button>
                    </div>

                    <!-- Provenance Info -->
                    <div class="space-y-1">
                      <div
                        v-for="(prov, provIndex) in lego.provenance"
                        :key="provIndex"
                        class="flex items-center gap-3 text-sm text-slate-400"
                      >
                        <span class="text-slate-500">from</span>
                        <span class="px-2 py-0.5 bg-slate-700 text-emerald-400 rounded font-mono text-xs">
                          {{ prov.source_seed_id }}
                        </span>
                        <span class="text-slate-500">({{ prov.provenance }})</span>
                      </div>
                    </div>

                    <!-- Scores -->
                    <div class="flex gap-4 mt-2 text-xs">
                      <span class="text-slate-500">
                        FCFS: <span class="text-emerald-400">{{ lego.fcfs_score }}</span>
                      </span>
                      <span class="text-slate-500">
                        Utility: <span class="text-emerald-400">{{ lego.utility_score }}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div v-if="editable" class="flex gap-3 mt-6 pt-6 border-t border-slate-700">
            <button
              @click="addNewLego"
              class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors"
            >
              + Add LEGO
            </button>
            <button
              v-if="hasChanges"
              @click="saveBasket"
              class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors"
            >
              Save Changes
            </button>
            <button
              v-if="hasChanges"
              @click="resetChanges"
              class="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        <!-- Basket Metadata Footer -->
        <div class="bg-slate-900/50 border-t border-slate-700 p-4">
          <div class="text-xs text-slate-500">
            <div class="mb-2">
              <strong class="text-slate-400">Pedagogical Notes:</strong>
              {{ currentBasket.metadata?.pedagogical_notes?.purpose || 'N/A' }}
            </div>
            <div class="flex gap-4">
              <span>Pattern Diversity: {{ currentBasket.metadata?.pedagogical_notes?.pattern_diversity || 'N/A' }}</span>
              <span>Created: {{ formatDate(currentBasket.metadata?.created_at) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- No Baskets Found -->
    <div v-else class="text-center py-12">
      <div class="text-slate-400">No baskets found for this course.</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'

// Props
const props = defineProps({
  courseCode: {
    type: String,
    required: true
  },
  basketId: {
    type: Number,
    default: null
  },
  editable: {
    type: Boolean,
    default: true
  }
})

// Emits
const emit = defineEmits(['basket-modified', 'phrase-edited'])

// State
const baskets = ref([])
const currentBasketIndex = ref(0)
const loading = ref(true)
const error = ref(null)
const editingIndex = ref(null)
const editedText = ref('')
const hasChanges = ref(false)
const originalBasket = ref(null)

// Computed
const currentBasket = computed(() => baskets.value[currentBasketIndex.value] || null)
const totalBaskets = computed(() => baskets.value.length)

// Watch for basket ID prop changes
watch(() => props.basketId, (newId) => {
  if (newId !== null) {
    const index = baskets.value.findIndex(b => b.basket_id === newId)
    if (index !== -1) {
      currentBasketIndex.value = index
    }
  }
})

// Lifecycle
onMounted(async () => {
  await loadBaskets()
})

// Methods
async function loadBaskets() {
  loading.value = true
  error.value = null

  try {
    // Fetch baskets from API endpoint
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:54321'
    const response = await fetch(`${API_BASE_URL}/api/visualization/phrases/${props.courseCode}`, {
      headers: {
        'ngrok-skip-browser-warning': 'true'
      }
    })

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    baskets.value = data.baskets || []

    // Set initial basket based on prop
    if (props.basketId !== null) {
      const index = baskets.value.findIndex(b => b.basket_id === props.basketId)
      if (index !== -1) {
        currentBasketIndex.value = index
      }
    }

    // Store original state
    if (currentBasket.value) {
      originalBasket.value = JSON.parse(JSON.stringify(currentBasket.value))
    }
  } catch (err) {
    error.value = err.message || 'Failed to load baskets'
    console.error('Failed to load baskets:', err)
  } finally {
    loading.value = false
  }
}

function nextBasket() {
  if (currentBasketIndex.value < totalBaskets.value - 1) {
    currentBasketIndex.value++
    resetChanges()
    originalBasket.value = JSON.parse(JSON.stringify(currentBasket.value))
  }
}

function previousBasket() {
  if (currentBasketIndex.value > 0) {
    currentBasketIndex.value--
    resetChanges()
    originalBasket.value = JSON.parse(JSON.stringify(currentBasket.value))
  }
}

function startEdit(index, text) {
  editingIndex.value = index
  editedText.value = text
}

function cancelEdit() {
  editingIndex.value = null
  editedText.value = ''
}

function saveEdit(index) {
  if (!currentBasket.value || editedText.value.trim() === '') {
    return
  }

  const lego = currentBasket.value.legos[index]
  const oldText = lego.text
  lego.text = editedText.value.trim()

  hasChanges.value = true
  editingIndex.value = null
  editedText.value = ''

  emit('phrase-edited', {
    basketId: currentBasket.value.basket_id,
    legoIndex: index,
    legoUuid: lego.uuid,
    oldText: oldText,
    newText: lego.text
  })
}

function moveUp(index) {
  if (index === 0 || !currentBasket.value) return

  const legos = currentBasket.value.legos
  const temp = legos[index]
  legos[index] = legos[index - 1]
  legos[index - 1] = temp

  hasChanges.value = true

  emit('basket-modified', {
    basketId: currentBasket.value.basket_id,
    action: 'reorder',
    fromIndex: index,
    toIndex: index - 1
  })
}

function moveDown(index) {
  if (!currentBasket.value || index === currentBasket.value.legos.length - 1) return

  const legos = currentBasket.value.legos
  const temp = legos[index]
  legos[index] = legos[index + 1]
  legos[index + 1] = temp

  hasChanges.value = true

  emit('basket-modified', {
    basketId: currentBasket.value.basket_id,
    action: 'reorder',
    fromIndex: index,
    toIndex: index + 1
  })
}

function addNewLego() {
  if (!currentBasket.value) return

  const newLego = {
    uuid: generateUUID(),
    text: 'New phrase',
    provenance: [],
    fcfs_score: 0,
    utility_score: 0
  }

  currentBasket.value.legos.push(newLego)
  currentBasket.value.lego_count++
  hasChanges.value = true

  // Start editing the new lego
  startEdit(currentBasket.value.legos.length - 1, newLego.text)

  emit('basket-modified', {
    basketId: currentBasket.value.basket_id,
    action: 'add',
    lego: newLego
  })
}

async function saveBasket() {
  if (!currentBasket.value) return

  // In a real app, this would save to the backend
  console.log('Saving basket:', currentBasket.value)

  hasChanges.value = false
  originalBasket.value = JSON.parse(JSON.stringify(currentBasket.value))

  emit('basket-modified', {
    basketId: currentBasket.value.basket_id,
    action: 'save',
    basket: currentBasket.value
  })
}

function resetChanges() {
  if (originalBasket.value) {
    const index = currentBasketIndex.value
    baskets.value[index] = JSON.parse(JSON.stringify(originalBasket.value))
  }
  hasChanges.value = false
  editingIndex.value = null
  editedText.value = ''
}

function formatDate(dateString) {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}
</script>

<style scoped>
.phrase-visualizer {
  @apply min-h-screen bg-slate-900 text-slate-100;
}

/* Smooth transitions for reordering */
.group {
  transition: all 0.2s ease;
}
</style>
