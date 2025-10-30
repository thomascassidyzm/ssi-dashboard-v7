<template>
  <div class="min-h-screen bg-slate-900">
    <!-- Header -->
    <header class="bg-slate-800/50 border-b border-slate-400/10 backdrop-blur-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <router-link to="/" class="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition mb-4">
          <span>←</span>
          <span>Back to Dashboard</span>
        </router-link>
        <h1 class="text-3xl font-bold text-emerald-400">
          Skills Library
        </h1>
        <p class="mt-2 text-slate-400">
          Progressive disclosure methodology modules for SSi course production
        </p>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      <!-- Architecture Visualization -->
      <SkillsArchitectureVisualizer class="mb-8" />

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
        <p class="text-slate-400 mt-4">Loading skills library...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="bg-red-900/20 border border-red-500/50 rounded-lg p-6">
        <p class="text-red-400">{{ error }}</p>
      </div>

      <!-- Skills Grid -->
      <div v-else class="space-y-6">

        <!-- Phase Filter -->
        <div class="bg-slate-800/50 rounded-lg border border-slate-400/20 p-6">
          <h2 class="text-xl font-semibold text-slate-100 mb-4">Filter by Phase</h2>
          <div class="flex flex-wrap gap-3">
            <button
              @click="selectedPhaseFilter = 'all'"
              :class="[
                'px-4 py-2 rounded-lg font-medium transition',
                selectedPhaseFilter === 'all'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              ]"
            >
              All Skills ({{ skills.length }})
            </button>
            <button
              v-for="phase in phases"
              :key="phase.id"
              @click="selectedPhaseFilter = phase.id"
              :class="[
                'px-4 py-2 rounded-lg font-medium transition',
                selectedPhaseFilter === phase.id
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              ]"
            >
              Phase {{ phase.id }}: {{ phase.name }}
              <span class="ml-2 text-xs opacity-75">({{ getSkillsForPhase(phase.id).length }})</span>
            </button>
          </div>
        </div>

        <!-- Filtered Skills -->
        <div class="bg-slate-800/50 rounded-lg border border-slate-400/20 p-6">
          <h2 class="text-xl font-semibold text-slate-100 mb-4">
            <span v-if="selectedPhaseFilter === 'all'">All Available Skills</span>
            <span v-else>Phase {{ selectedPhaseFilter }} Skills</span>
          </h2>
          <div v-if="filteredSkills.length === 0" class="text-center py-8 text-slate-400">
            No skills found for this phase
          </div>
          <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              v-for="skill in filteredSkills"
              :key="skill.id"
              @click="selectSkill(skill.id)"
              :class="[
                'p-4 rounded-lg border transition text-left',
                selectedSkillId === skill.id
                  ? 'bg-emerald-600 border-emerald-400 text-white'
                  : 'bg-slate-800 border-slate-600 text-slate-300 hover:border-emerald-500/50'
              ]"
            >
              <div class="flex items-center justify-between mb-2">
                <div class="font-mono text-sm font-bold">{{ skill.name }}</div>
                <div class="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">
                  Phase {{ skill.phase }}
                </div>
              </div>
              <div class="text-xs opacity-80 mb-2">v{{ skill.version }}</div>
              <div class="text-xs line-clamp-2">{{ skill.description }}</div>
            </button>
          </div>
        </div>

        <!-- Selected Skill Details -->
        <div v-if="selectedSkill" class="bg-slate-800/50 rounded-lg border border-slate-400/20 p-6">

          <!-- Skill Header -->
          <div class="flex items-start justify-between mb-6">
            <div>
              <h2 class="text-2xl font-bold text-slate-100">{{ selectedSkill.name }}</h2>
              <p class="text-slate-400 mt-1">{{ selectedSkill.description }}</p>
              <p class="text-xs text-slate-500 mt-2">Version {{ selectedSkill.version }}</p>
            </div>
          </div>

          <!-- Tabs -->
          <div class="border-b border-slate-600 mb-6">
            <div class="flex gap-4">
              <button
                @click="activeTab = 'overview'"
                :class="[
                  'pb-3 px-2 border-b-2 font-medium transition',
                  activeTab === 'overview'
                    ? 'border-emerald-400 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                ]"
              >
                Overview
              </button>
              <button
                @click="activeTab = 'structure'"
                :class="[
                  'pb-3 px-2 border-b-2 font-medium transition',
                  activeTab === 'structure'
                    ? 'border-emerald-400 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                ]"
              >
                Structure
              </button>
              <button
                @click="activeTab = 'content'"
                :class="[
                  'pb-3 px-2 border-b-2 font-medium transition',
                  activeTab === 'content'
                    ? 'border-emerald-400 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                ]"
              >
                SKILL.md
              </button>
            </div>
          </div>

          <!-- Tab Content -->
          <div v-if="activeTab === 'overview'" class="space-y-6">

            <!-- Description -->
            <div>
              <h3 class="text-lg font-semibold text-slate-100 mb-3">Description</h3>
              <p class="text-slate-300">{{ selectedSkill.description }}</p>
            </div>

            <!-- Structure Summary -->
            <div>
              <h3 class="text-lg font-semibold text-slate-100 mb-3">Structure</h3>
              <div class="bg-slate-900/50 rounded p-4 font-mono text-sm text-slate-300">
                <div v-for="item in selectedSkill.structure" :key="item.path">
                  <div v-if="item.type === 'directory'" class="mb-2">
                    <span class="text-emerald-400">📁 {{ item.name }}/</span>
                    <div v-if="item.children" class="ml-4">
                      <div v-for="child in item.children" :key="child.path" class="text-slate-400">
                        {{ child.type === 'directory' ? '📁' : '📄' }} {{ child.name }}
                      </div>
                    </div>
                  </div>
                  <div v-else class="text-slate-400">
                    📄 {{ item.name }}
                  </div>
                </div>
              </div>
            </div>

          </div>

          <div v-else-if="activeTab === 'structure'" class="space-y-4">

            <!-- File Tree -->
            <div class="bg-slate-900/50 rounded p-4">
              <FileTree
                :items="selectedSkill.structure"
                :skillId="selectedSkill.id"
                @select-file="selectFile"
              />
            </div>

            <!-- Selected File Content -->
            <div v-if="selectedFile" class="bg-slate-900/50 rounded p-4">
              <div class="flex items-center justify-between mb-3">
                <h4 class="font-mono text-sm text-emerald-400">{{ selectedFile.path }}</h4>
                <button
                  @click="selectedFile = null"
                  class="text-xs text-slate-500 hover:text-slate-300"
                >
                  Close
                </button>
              </div>
              <pre class="whitespace-pre-wrap font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto max-h-96">{{ selectedFile.content }}</pre>
            </div>

          </div>

          <div v-else-if="activeTab === 'content'">
            <pre class="whitespace-pre-wrap font-mono text-sm text-slate-300 leading-relaxed overflow-x-auto bg-slate-900/50 rounded p-4">{{ selectedSkill.content }}</pre>
          </div>

        </div>

      </div>

    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import SkillsArchitectureVisualizer from '../components/SkillsArchitectureVisualizer.vue'

const loading = ref(true)
const error = ref(null)
const skills = ref([])
const selectedSkillId = ref(null)
const selectedSkill = ref(null)
const activeTab = ref('overview')
const selectedFile = ref(null)
const selectedPhaseFilter = ref('all')

const phases = ref([
  { id: '1', name: 'Translation' },
  { id: '3', name: 'LEGO Extraction' },
  { id: '5', name: 'Baskets' },
  { id: '6', name: 'Introductions' }
])

// Map skill names to phases
const skillPhaseMapping = {
  'translation-skill': '1',
  'lego-extraction-skill': '3',
  'basket-generation-skill': '5',
  'introductions-skill': '6'
}

// Computed property for filtered skills
const filteredSkills = computed(() => {
  if (selectedPhaseFilter.value === 'all') {
    return skills.value
  }
  return skills.value.filter(skill => {
    const phase = skillPhaseMapping[skill.id]
    return phase === selectedPhaseFilter.value
  })
})

// Function to get skills for a specific phase
function getSkillsForPhase(phaseId) {
  return skills.value.filter(skill => {
    const phase = skillPhaseMapping[skill.id]
    return phase === phaseId
  })
}

async function loadSkills() {
  try {
    const response = await fetch('http://localhost:3456/api/skills')
    if (!response.ok) throw new Error('Failed to load skills')

    const data = await response.json()

    // Add phase information to each skill
    skills.value = data.skills.map(skill => ({
      ...skill,
      phase: skillPhaseMapping[skill.id] || '?'
    }))

    // Auto-select first filtered skill
    if (filteredSkills.value.length > 0) {
      selectSkill(filteredSkills.value[0].id)
    }
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}

async function selectSkill(skillId) {
  selectedSkillId.value = skillId
  activeTab.value = 'overview'
  selectedFile.value = null

  try {
    const response = await fetch(`http://localhost:3456/api/skills/${skillId}`)
    if (!response.ok) throw new Error('Failed to load skill details')

    const data = await response.json()
    selectedSkill.value = data
  } catch (err) {
    error.value = err.message
  }
}

async function selectFile(filePath) {
  if (!selectedSkill.value) return

  try {
    const response = await fetch(`http://localhost:3456/api/skills/${selectedSkill.value.id}/file/${filePath}`)
    if (!response.ok) throw new Error('Failed to load file')

    const data = await response.json()
    selectedFile.value = data
  } catch (err) {
    error.value = err.message
  }
}

onMounted(() => {
  loadSkills()
})
</script>

<script>
// FileTree Component
export default {
  components: {
    FileTree: {
      props: ['items', 'skillId', 'depth'],
      emits: ['select-file'],
      template: `
        <div>
          <div v-for="item in items" :key="item.path" :style="{ marginLeft: (depth || 0) * 16 + 'px' }">
            <div v-if="item.type === 'directory'" class="mb-1">
              <span class="text-emerald-400 cursor-default">📁 {{ item.name }}/</span>
              <FileTree
                v-if="item.children"
                :items="item.children"
                :skillId="skillId"
                :depth="(depth || 0) + 1"
                @select-file="$emit('select-file', $event)"
              />
            </div>
            <div v-else class="mb-1">
              <button
                @click="$emit('select-file', item.path)"
                class="text-slate-400 hover:text-emerald-400 transition text-left"
              >
                📄 {{ item.name }}
              </button>
            </div>
          </div>
        </div>
      `
    }
  }
}
</script>
