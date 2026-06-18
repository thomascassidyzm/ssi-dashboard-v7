<template>
  <div class="network-builder">
    <div class="header">
      <h1>Network Builder</h1>
      <p class="subtitle">Build LEGO networks in real-time - watch phrases emerge</p>

      <!-- Network Tabs -->
      <div class="network-tabs">
        <button
          v-for="net in networkList"
          :key="net.id"
          @click="switchNetwork(net.id)"
          class="network-tab"
          :class="{ active: currentNetwork === net.id }"
        >
          <span class="tab-name">{{ net.id }}</span>
          <span class="tab-stats">{{ net.legoCount }} LEGOs / {{ net.phraseCount }} phrases</span>
        </button>
        <button @click="createNetwork" class="network-tab new-network">+ New</button>
      </div>

      <div class="stats-bar">
        <span class="network-label">{{ currentNetwork }}</span>
        <span class="stat">
          <strong>{{ legos.length }}</strong> LEGOs
        </span>
        <span class="stat">
          <strong>{{ phrases.length }}</strong> Phrases
        </span>
        <span class="stat">
          <strong>{{ stats.edgeCount || 0 }}</strong> Edges
        </span>
        <button @click="resetNetwork" class="reset-btn">Reset Network</button>
        <button @click="fetchState" class="refresh-btn">Refresh</button>
      </div>
    </div>

    <div class="main-content">
      <!-- Network Graph -->
      <div class="network-panel">
        <h2>Network Graph</h2>
        <div class="network-container" ref="networkContainer">
          <svg ref="networkSvg" :width="svgWidth" :height="svgHeight">
            <!-- Edges -->
            <g class="edges">
              <line
                v-for="edge in edges"
                :key="`${edge.source}-${edge.target}`"
                :x1="getNodePosition(edge.source).x"
                :y1="getNodePosition(edge.source).y"
                :x2="getNodePosition(edge.target).x"
                :y2="getNodePosition(edge.target).y"
                class="edge"
              />
            </g>
            <!-- Nodes -->
            <g class="nodes">
              <g
                v-for="lego in legos"
                :key="lego.id"
                :transform="`translate(${getNodePosition(lego.id).x}, ${getNodePosition(lego.id).y})`"
                class="node"
                @click="selectLego(lego)"
              >
                <circle r="30" :class="{ selected: selectedLego?.id === lego.id }" />
                <text class="chinese" dy="-5">{{ lego.chinese }}</text>
                <text class="english" dy="12">{{ lego.english }}</text>
                <text class="id" dy="25">{{ lego.id }}</text>
              </g>
            </g>
          </svg>
        </div>
      </div>

      <!-- Side Panel -->
      <div class="side-panel">
        <!-- Add LEGO Form -->
        <div class="add-lego-panel">
          <h2>Add LEGO</h2>
          <form @submit.prevent="addLego">
            <div class="form-group">
              <label>Chinese</label>
              <input v-model="newLego.chinese" placeholder="e.g. 我" required />
            </div>
            <div class="form-group">
              <label>English</label>
              <input v-model="newLego.english" placeholder="e.g. I" required />
            </div>
            <div class="form-group">
              <label>Can Follow (parents)</label>
              <select v-model="newLego.canFollow" multiple>
                <option v-for="l in legos" :key="l.id" :value="l.id">
                  {{ l.id }}: {{ l.chinese }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Can Precede (children)</label>
              <select v-model="newLego.canPrecede" multiple>
                <option v-for="l in legos" :key="l.id" :value="l.id">
                  {{ l.id }}: {{ l.chinese }}
                </option>
              </select>
            </div>
            <button type="submit" class="add-btn">Add LEGO</button>
          </form>
        </div>

        <!-- LEGOs List -->
        <div class="legos-panel">
          <h2>LEGOs ({{ legos.length }})</h2>
          <div class="legos-list">
            <div
              v-for="lego in legos"
              :key="lego.id"
              class="lego-item"
              :class="{ selected: selectedLego?.id === lego.id }"
              @click="selectLego(lego)"
            >
              <span class="lego-id">{{ lego.id }}</span>
              <span class="lego-chinese">{{ lego.chinese }}</span>
              <span class="lego-english">"{{ lego.english }}"</span>
              <span class="lego-connections">
                ↑{{ lego.parents?.length || 0 }} ↓{{ lego.children?.length || 0 }}
              </span>
            </div>
          </div>
        </div>

        <!-- Phrases List -->
        <div class="phrases-panel">
          <h2>Phrases ({{ phrases.length }})</h2>
          <div class="phrases-list">
            <div
              v-for="(phrase, i) in phrases"
              :key="i"
              class="phrase-item"
              :class="`lego-count-${phrase.legoCount}`"
            >
              <span class="phrase-chinese">{{ phrase.chinese }}</span>
              <span class="phrase-arrow">→</span>
              <span class="phrase-english">"{{ phrase.english }}"</span>
              <span class="phrase-count">{{ phrase.legoCount }} LEGOs</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Selected LEGO Details -->
    <div v-if="selectedLego" class="selected-panel">
      <h3>{{ selectedLego.id }}: {{ selectedLego.chinese }} / "{{ selectedLego.english }}"</h3>
      <div class="connections">
        <div class="parents">
          <strong>Parents (can follow):</strong>
          <span v-if="selectedLego.parents?.length">
            {{ selectedLego.parents.join(', ') }}
          </span>
          <span v-else class="none">none</span>
        </div>
        <div class="children">
          <strong>Children (can precede):</strong>
          <span v-if="selectedLego.children?.length">
            {{ selectedLego.children.join(', ') }}
          </span>
          <span v-else class="none">none</span>
        </div>
      </div>
      <div class="phrases-containing">
        <strong>Phrases containing this LEGO:</strong>
        <div class="phrase-list">
          <div v-for="p in phrasesContaining(selectedLego.id)" :key="p.chinese" class="mini-phrase">
            {{ p.chinese }} → "{{ p.english }}"
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getApiUrl } from '@/services/api'

const API_BASE = `${getApiUrl()}/api/network-builder`

const currentNetwork = ref('default')
const networkList = ref([])
const legos = ref([])
const phrases = ref([])
const stats = ref({})
const selectedLego = ref(null)
const svgWidth = 600
const svgHeight = 500

const newLego = ref({
  chinese: '',
  english: '',
  canFollow: [],
  canPrecede: []
})

// Compute edges from LEGOs
const edges = computed(() => {
  const result = []
  for (const lego of legos.value) {
    for (const childId of lego.children || []) {
      result.push({ source: lego.id, target: childId })
    }
  }
  return result
})

// Simple force-directed layout positions
const nodePositions = computed(() => {
  const positions = {}
  const n = legos.value.length
  if (n === 0) return positions

  // Simple grid/circle layout
  const centerX = svgWidth / 2
  const centerY = svgHeight / 2
  const radius = Math.min(svgWidth, svgHeight) * 0.35

  legos.value.forEach((lego, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2
    positions[lego.id] = {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle)
    }
  })

  return positions
})

function getNodePosition(id) {
  return nodePositions.value[id] || { x: svgWidth / 2, y: svgHeight / 2 }
}

function selectLego(lego) {
  selectedLego.value = selectedLego.value?.id === lego.id ? null : lego
}

function phrasesContaining(legoId) {
  return phrases.value.filter(p => p.path?.includes(legoId))
}

async function fetchNetworks() {
  try {
    const res = await fetch(`${API_BASE}/networks`)
    if (!res.ok) throw new Error((await res.clone().json().catch(() => ({}))).error || `HTTP ${res.status}`)
    const data = await res.json()
    networkList.value = data.networks || []
  } catch (e) {
    console.error('Failed to fetch networks:', e)
  }
}

async function fetchState() {
  try {
    const res = await fetch(`${API_BASE}/state?network=${currentNetwork.value}`)
    if (!res.ok) throw new Error((await res.clone().json().catch(() => ({}))).error || `HTTP ${res.status}`)
    const data = await res.json()
    legos.value = data.legos || []
    phrases.value = data.phrases || []
    stats.value = data.stats || {}
    // Also refresh network list
    await fetchNetworks()
  } catch (e) {
    console.error('Failed to fetch state:', e)
  }
}

async function switchNetwork(networkId) {
  currentNetwork.value = networkId
  await fetchState()
}

async function createNetwork() {
  const name = prompt('Network name (e.g., opus, sonnet, haiku):')
  if (!name) return
  currentNetwork.value = name
  await fetchState()  // This will create the network on first access
}

async function addLego() {
  try {
    const res = await fetch(`${API_BASE}/lego?network=${currentNetwork.value}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLego.value)
    })
    if (!res.ok) throw new Error((await res.clone().json().catch(() => ({}))).error || `HTTP ${res.status}`)
    const data = await res.json()
    if (data.lego) {
      await fetchState()
      newLego.value = { chinese: '', english: '', canFollow: [], canPrecede: [] }
    }
  } catch (e) {
    console.error('Failed to add LEGO:', e)
  }
}

async function resetNetwork() {
  if (!confirm(`Reset the "${currentNetwork.value}" network?`)) return
  try {
    await fetch(`${API_BASE}/reset?network=${currentNetwork.value}`, { method: 'POST' })
    await fetchState()
    selectedLego.value = null
  } catch (e) {
    console.error('Failed to reset:', e)
  }
}

onMounted(() => {
  fetchState()
  // Poll for updates
  setInterval(fetchState, 2000)
})
</script>

<style scoped>
.network-builder {
  padding: 1rem;
  max-width: 1600px;
  margin: 0 auto;
  color: var(--ink);
}

.header {
  margin-bottom: 1rem;
}

.header h1 {
  margin: 0;
  color: var(--accent);
}

.subtitle {
  color: var(--muted);
  margin: 0.25rem 0;
}

.stats-bar {
  display: flex;
  gap: 1.5rem;
  align-items: center;
  margin-top: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 8px;
}

.stat {
  color: var(--muted);
}

.stat strong {
  color: var(--accent);
  font-size: 1.2em;
}

.reset-btn, .refresh-btn {
  margin-left: auto;
  padding: 0.4rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.reset-btn {
  background: var(--danger);
  color: #fff;
}

.refresh-btn {
  background: var(--surface-3);
  color: var(--ink);
  border: 1px solid var(--line);
  margin-left: 0.5rem;
}

.main-content {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 1rem;
}

.network-panel, .side-panel > div {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 1rem;
}

.network-panel h2, .side-panel h2 {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  color: var(--muted);
}

.network-container {
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 4px;
  overflow: hidden;
}

.edge {
  stroke: var(--accent);
  stroke-width: 2;
  stroke-opacity: 0.5;
}

.node circle {
  fill: var(--surface-2);
  stroke: var(--accent);
  stroke-width: 2;
  cursor: pointer;
  transition: all 0.2s;
}

.node circle:hover {
  fill: var(--surface-3);
}

.node circle.selected {
  fill: var(--accent);
  stroke: var(--ink);
}

.node text {
  fill: var(--ink);
  text-anchor: middle;
  font-size: 12px;
  pointer-events: none;
}

.node text.chinese {
  font-size: 16px;
  font-weight: bold;
}

.node text.id {
  fill: var(--faint);
  font-size: 9px;
}

.side-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.add-lego-panel {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 1rem;
}

.form-group {
  margin-bottom: 0.75rem;
}

.form-group label {
  display: block;
  font-size: 0.85rem;
  color: var(--muted);
  margin-bottom: 0.25rem;
}

.form-group input, .form-group select {
  width: 100%;
  padding: 0.5rem;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 4px;
  color: var(--ink);
}

.form-group select {
  height: 80px;
}

.add-btn {
  width: 100%;
  padding: 0.75rem;
  background: var(--accent-2);
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}

.add-btn:hover {
  background: var(--success);
  filter: brightness(1.1);
}

.legos-panel, .phrases-panel {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 1rem;
  max-height: 300px;
  overflow-y: auto;
}

.legos-list, .phrases-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.lego-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.5rem;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.lego-item:hover {
  background: var(--surface-3);
}

.lego-item.selected {
  background: var(--accent-2);
  color: #fff;
}

.lego-item.selected .lego-id,
.lego-item.selected .lego-chinese,
.lego-item.selected .lego-english,
.lego-item.selected .lego-connections {
  color: #fff;
}

.lego-id {
  color: var(--faint);
  font-size: 0.8rem;
  min-width: 40px;
}

.lego-chinese {
  font-weight: bold;
  color: var(--accent);
}

.lego-english {
  color: var(--muted);
  flex: 1;
}

.lego-connections {
  color: var(--faint);
  font-size: 0.8rem;
}

.phrase-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0.5rem;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 4px;
  font-size: 0.85rem;
}

.phrase-chinese {
  font-weight: bold;
  color: var(--ink);
}

.phrase-arrow {
  color: var(--faint);
}

.phrase-english {
  color: var(--muted);
  flex: 1;
}

.phrase-count {
  color: var(--faint);
  font-size: 0.75rem;
}

.phrase-item.lego-count-1 { border-left: 3px solid var(--faint); }
.phrase-item.lego-count-2 { border-left: 3px solid var(--accent); }
.phrase-item.lego-count-3 { border-left: 3px solid var(--accent-2); }
.phrase-item.lego-count-4 { border-left: 3px solid #d97706; }
.phrase-item.lego-count-5 { border-left: 3px solid var(--danger); }

.selected-panel {
  margin-top: 1rem;
  padding: 1rem;
  background: var(--surface);
  border: 1px solid var(--accent);
  border-radius: 8px;
}

.selected-panel h3 {
  margin: 0 0 0.5rem 0;
  color: var(--accent);
}

.connections {
  display: flex;
  gap: 2rem;
  margin-bottom: 0.5rem;
}

.connections .none {
  color: var(--faint);
  font-style: italic;
}

.phrases-containing {
  margin-top: 0.5rem;
}

.mini-phrase {
  font-size: 0.85rem;
  color: var(--muted);
  padding: 0.2rem 0;
}

/* Network Tabs */
.network-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}

.network-tab {
  padding: 0.5rem 1rem;
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;
  transition: all 0.2s;
}

.network-tab:hover {
  background: var(--surface-3);
  border-color: var(--accent);
}

.network-tab.active {
  background: var(--surface-3);
  border-color: var(--accent);
}

.network-tab .tab-name {
  font-weight: bold;
  color: var(--ink);
  text-transform: uppercase;
  font-size: 0.9rem;
}

.network-tab.active .tab-name {
  color: var(--accent);
}

.network-tab .tab-stats {
  font-size: 0.75rem;
  color: var(--faint);
}

.network-tab.new-network {
  background: var(--surface-2);
  border-style: dashed;
  color: var(--faint);
}

.network-tab.new-network:hover {
  color: var(--accent);
}

.network-label {
  background: var(--accent);
  color: var(--surface);
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  font-weight: bold;
  font-size: 0.85rem;
  text-transform: uppercase;
}
</style>
