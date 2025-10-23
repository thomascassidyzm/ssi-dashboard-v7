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
          Phase {{ id }}: {{ phaseData.name }}
        </h1>
        <p class="mt-2 text-slate-400">
          {{ phaseData.description }}
        </p>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="bg-slate-800/50 rounded-lg border border-slate-400/20 p-8">

        <!-- Live Data Indicator -->
        <div v-if="promptMeta" class="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-4 mb-6">
          <div class="flex items-center gap-2">
            <svg class="w-5 h-5 text-emerald-400 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"/>
            </svg>
            <span class="text-emerald-300 font-medium">Live from APML Registry</span>
          </div>
          <div class="mt-2 text-sm text-slate-400 grid grid-cols-2 gap-4">
            <div>Version: {{ promptMeta.version }}</div>
            <div>Last Modified: {{ new Date(promptMeta.lastModified).toLocaleString() }}</div>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="bg-slate-900/80 border border-slate-400/20 rounded-lg p-6 mb-6 text-center">
          <div class="flex items-center justify-center gap-3 text-slate-400">
            <svg class="animate-spin w-6 h-6" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Loading prompt from APML registry...</span>
          </div>
        </div>

        <!-- Error State -->
        <div v-if="error" class="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6">
          <div class="flex items-center gap-2 text-red-400">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
            </svg>
            <span>{{ error }}</span>
          </div>
          <p class="text-sm text-slate-400 mt-2">Falling back to cached documentation</p>
        </div>

        <!-- Overview Section -->
        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-emerald-400 mb-4">Overview</h2>
          <div class="prose prose-invert prose-emerald max-w-none">
            <p class="text-slate-300">{{ phaseData.overview }}</p>
          </div>
        </section>

        <!-- Claude Code Prompt Section -->
        <section class="mb-8">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-2xl font-semibold text-emerald-400">Claude Code Prompt</h2>
            <div class="flex gap-2">
              <button @click="saveChanges" :disabled="saving" class="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition">
                {{ saving ? 'Saving...' : '💾 Save Changes' }}
              </button>
              <button @click="copyPrompt" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded transition">
                Copy
              </button>
              <button @click="downloadPrompt" class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition">
                Download
              </button>
            </div>
          </div>
          <div class="bg-slate-900/80 border border-slate-400/20 rounded-lg p-4">
            <textarea
              v-model="promptText"
              class="w-full h-96 bg-slate-950 text-slate-300 font-mono text-sm p-4 rounded border border-slate-400/20 focus:border-emerald-500 focus:outline-none resize-y"
              placeholder="Phase prompt will appear here..."
            ></textarea>
            <p class="text-slate-400 text-xs mt-2">
              ✏️ This prompt is editable. Modify it to customize agent behavior for this phase.
            </p>
          </div>
        </section>

        <!-- Key Objectives -->
        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-emerald-400 mb-4">Key Objectives</h2>
          <ul class="space-y-2">
            <li v-for="(objective, index) in phaseData.objectives" :key="index"
                class="flex items-start gap-3 text-slate-300">
              <span class="text-emerald-400 mt-1">✓</span>
              <span>{{ objective }}</span>
            </li>
          </ul>
        </section>

        <!-- Process Steps -->
        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-emerald-400 mb-4">Process Steps</h2>
          <div class="space-y-4">
            <div v-for="(step, index) in phaseData.steps" :key="index"
                 class="bg-slate-900/80 border border-slate-400/20 rounded-lg p-4">
              <div class="flex items-center gap-3 mb-2">
                <div class="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-slate-900 text-sm">
                  {{ index + 1 }}
                </div>
                <h3 class="font-semibold text-slate-100">{{ step.title }}</h3>
              </div>
              <p class="text-slate-300 ml-11">{{ step.description }}</p>
            </div>
          </div>
        </section>

        <!-- Version History -->
        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-emerald-400 mb-4">Version History</h2>
          <div v-if="loadingHistory" class="text-slate-400 text-center py-6">
            <svg class="animate-spin w-6 h-6 mx-auto mb-2" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading history...
          </div>
          <div v-else-if="versionHistory.length === 0" class="bg-slate-900/80 border border-slate-400/20 rounded-lg p-6 text-center text-slate-500">
            No version history available
          </div>
          <div v-else class="space-y-3">
            <div v-for="version in versionHistory" :key="version.hash"
                 class="bg-slate-900/80 border border-slate-400/20 rounded-lg p-4 hover:border-emerald-500/30 transition">
              <div class="flex items-start justify-between mb-2">
                <div class="flex-1">
                  <div class="text-slate-300 font-medium">{{ version.message }}</div>
                  <div class="text-xs text-slate-500 mt-1 flex items-center gap-3">
                    <span>by {{ version.author }}</span>
                    <span>•</span>
                    <span>{{ new Date(version.date).toLocaleDateString() }}</span>
                    <span>•</span>
                    <span class="font-mono">{{ version.hash.substring(0, 7) }}</span>
                  </div>
                </div>
                <span v-if="version.improved_by"
                      :class="version.improved_by === 'ai' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'"
                      class="text-xs px-2 py-1 rounded font-medium">
                  {{ version.improved_by }}
                </span>
              </div>
            </div>
          </div>
        </section>

        <!-- Important Notes -->
        <section v-if="phaseData.notes && phaseData.notes.length > 0" class="mb-8">
          <h2 class="text-2xl font-semibold text-emerald-400 mb-4">Important Notes</h2>
          <div class="bg-slate-900/80 border border-emerald-500/30 rounded-lg p-6">
            <ul class="space-y-2">
              <li v-for="(note, index) in phaseData.notes" :key="index"
                  class="flex items-start gap-3 text-slate-300">
                <span class="text-emerald-400">⚠️</span>
                <span>{{ note }}</span>
              </li>
            </ul>
          </div>
        </section>

        <!-- LEGO Architecture (Phase 3 specific) -->
        <section v-if="phaseData.lego_architecture" class="mb-8">
          <h2 class="text-2xl font-semibold text-emerald-400 mb-4">{{ phaseData.lego_architecture.title }}</h2>
          <div class="bg-slate-900/80 border border-slate-400/20 rounded-lg p-6">
            <pre class="text-slate-300 whitespace-pre-wrap font-sans text-sm leading-relaxed">{{ phaseData.lego_architecture.content }}</pre>
          </div>
        </section>

        <!-- Output Format -->
        <section v-if="phaseData.output" class="mb-8">
          <h2 class="text-2xl font-semibold text-emerald-400 mb-4">Expected Output</h2>
          <div class="bg-slate-900/80 border border-slate-400/20 rounded-lg p-6">
            <p class="text-slate-300">{{ phaseData.output }}</p>
          </div>
        </section>

      </div>
    </main>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { usePromptManager } from '../composables/usePromptManager'

const props = defineProps({
  id: {
    type: String,
    required: true
  }
})

// Use prompt manager composable to fetch from APML registry
const { prompt: promptText, loading, saving, error, promptMeta, fetchPrompt, savePrompt } = usePromptManager(props.id)

// Version history state
const versionHistory = ref([])
const loadingHistory = ref(false)

// Fetch version history from API
const fetchVersionHistory = async () => {
  loadingHistory.value = true
  try {
    const response = await fetch(`http://localhost:54321/api/prompts/${props.id}/history`)
    const data = await response.json()
    if (response.ok) {
      versionHistory.value = data.history || []
    } else {
      console.error('Failed to load version history:', data.error)
    }
  } catch (err) {
    console.error('Failed to load version history:', err)
  } finally {
    loadingHistory.value = false
  }
}

// Fetch actual prompt from APML when component mounts
onMounted(async () => {
  await fetchPrompt()
  await fetchVersionHistory()
})

// Save changes back to APML file
const saveChanges = async () => {
  const changelog = prompt(`Enter changelog message for this update:`, `Update Phase ${props.id} prompt`)
  if (!changelog) return

  try {
    await savePrompt(changelog, 'human')
    alert('✅ Prompt saved successfully! Changes committed to APML and Git.')
    // Refresh version history after save
    await fetchVersionHistory()
  } catch (err) {
    alert(`❌ Failed to save prompt: ${err.message}`)
  }
}

// Copy prompt to clipboard
const copyPrompt = async () => {
  try {
    await navigator.clipboard.writeText(promptText.value)
    alert('Prompt copied to clipboard!')
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}

// Download prompt as .txt file
const downloadPrompt = () => {
  const blob = new Blob([promptText.value], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `phase_${props.id}_prompt.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const phaseContent = {
  '0': {
    name: 'Corpus Pre-Analysis',
    description: 'Translation intelligence and corpus preparation',
    overview: 'Phase 0 analyzes the source corpus to inform pedagogical translation decisions. This phase examines word frequency, complexity patterns, and structural characteristics to optimize the translation process for language learning.',
    objectives: [
      'Analyze source corpus linguistic patterns',
      'Identify high-frequency vocabulary and structures',
      'Assess translation complexity and challenges',
      'Prepare intelligence data for Phase 1 translators'
    ],
    steps: [
      {
        title: 'Corpus Loading',
        description: 'Load and validate the source language corpus, ensuring proper encoding and format'
      },
      {
        title: 'Frequency Analysis',
        description: 'Calculate word and phrase frequency distributions to inform pedagogical priorities'
      },
      {
        title: 'Complexity Assessment',
        description: 'Evaluate grammatical structures and identify translation challenges'
      },
      {
        title: 'Intelligence Report',
        description: 'Generate comprehensive analysis report for translator guidance'
      }
    ],
    notes: [
      'This phase does NOT modify the corpus - only analyzes it',
      'Focus on patterns that affect pedagogical translation decisions',
      'Intelligence data informs Phase 1 heuristic application'
    ],
    output: 'JSON intelligence report with frequency data, complexity metrics, and translation guidance',
    prompt: `# Phase 0: Corpus Pre-Analysis

## Task
Analyze the source corpus to generate intelligence data for pedagogical translation.

## Input
- Source corpus (668 canonical seeds)
- Located in: vfs/seeds/canonical_seeds.json

## Your Mission
1. Load and validate the canonical seed corpus
2. Perform linguistic analysis:
   - Calculate word frequency distributions
   - Identify high-frequency vocabulary and grammatical patterns
   - Assess translation complexity (cognates, false friends, structural challenges)
   - Map grammatical dependencies and prerequisite knowledge
3. Generate intelligence report with:
   - Frequency rankings for words and phrases
   - Complexity scores for each seed
   - Translation guidance notes (tricky structures, idioms, etc.)
   - Recommendations for Phase 1 heuristic application

## Output Format
Store results as JSON:
vfs/phase_outputs/phase_0_intelligence.json

Structure:
{
  "frequency_analysis": { ... },
  "complexity_scores": { ... },
  "translation_guidance": { ... },
  "recommendations": { ... }
}

## Important Notes
- DO NOT modify the source corpus - analysis only
- Focus on patterns that affect pedagogical decisions
- This intelligence informs Phase 1's 6 heuristics
- Consider learner perspective (what's easy/hard to learn)

## Success Criteria
✓ All 668 seeds analyzed
✓ Intelligence report generated
✓ Frequency rankings accurate
✓ Complexity assessments complete
✓ Ready for Phase 1 consumption`
  },
  '1': {
    name: 'Pedagogical Translation',
    description: '6 heuristics optimization for language learning',
    overview: 'Phase 1 applies six pedagogical heuristics to translate source sentences into optimal learning material. Translations prioritize naturalness, frequency, clarity, and pedagogical value over literal accuracy.',
    objectives: [
      'Apply 6 pedagogical heuristics to each seed translation',
      'Optimize for learner comprehension and retention',
      'Maintain natural target language expression',
      'Generate SEED_PAIRS with target + known language'
    ],
    steps: [
      {
        title: 'Load Seed Pairs',
        description: 'Load all 668 canonical seeds for translation'
      },
      {
        title: 'Apply Heuristics',
        description: 'Apply naturalness, frequency, clarity, brevity, consistency, and utility heuristics'
      },
      {
        title: 'Generate Translations',
        description: 'Create pedagogically optimized translations for each seed'
      },
      {
        title: 'UUID Assignment',
        description: 'Generate deterministic content-based UUIDs for each translation amino acid'
      },
      {
        title: 'VFS Storage',
        description: 'Store translation amino acids in amino_acids/translations/ directory'
      }
    ],
    notes: [
      'Translations are NOT literal - they are pedagogically optimized',
      'Each translation is an immutable amino acid component',
      'UUIDs are deterministic: UUID = hash(source + target + metadata)',
      'Phase 1 creates the foundational translation layer for all downstream phases'
    ],
    output: 'SEED_PAIRS_COMPLETE.json containing all 668 translated seed pairs (target + known language)',
    prompt: `# Phase 1: Pedagogical Translation

## Task
Apply 6 pedagogical heuristics to translate all 668 canonical seeds into optimized SEED_PAIRS.

## Input
- Canonical seeds: vfs/seeds/canonical_seeds.json
- Phase 0 intelligence: vfs/phase_outputs/phase_0_intelligence.json

## The 6 Pedagogical Heuristics
1. **Naturalness**: Target language should sound native, not transliterated
2. **Frequency**: Prefer high-frequency vocabulary and common structures
3. **Clarity**: Prioritize clear, unambiguous expressions over idiomatic complexity
4. **Brevity**: Shorter translations preferred when pedagogically equivalent
5. **Consistency**: Maintain consistent terminology across seeds
6. **Utility**: Maximize teaching value (versatile phrases, reusable structures)

## Your Mission
For each seed:
1. Apply all 6 heuristics to create pedagogically optimized translation
2. Create SEED_PAIR with both target and known language
3. Store as SEED_PAIR with structure:
   {
     "seed_id": "S0001",
     "target": "[target language sentence]",
     "known": "[known language sentence]",
     "heuristics_applied": [...],
     "metadata": {...}
   }
4. Process in batches of 100 seeds
5. Save to: **seed_pairs.json** (all 668 seeds combined)

## Critical Rules
- Translations are NOT literal - they are pedagogically optimized
- Each SEED_PAIR is the foundation for LEGO decomposition (Phase 3)
- Both target AND known language must be natural and pedagogically sound
- Preserve seed_id for provenance tracking

## Example Translation
Seed S42: "I would like to go"
Literal Welsh: "Hoffwn i fynd"
Pedagogical Welsh: "Dw i eisiau mynd" (more natural, higher frequency, clearer)

## Output Format
Final consolidated file:
**seed_pairs.json** with structure:
\`\`\`json
{
  "version": "7.0",
  "translations": {
    "S0001": ["target_phrase", "known_phrase"],
    "S0002": ["target_phrase", "known_phrase"]
  }
}
\`\`\`

## Success Criteria
✓ All 668 seeds translated
✓ All 6 heuristics applied to each
✓ SEED_PAIRS stored with target + known language
✓ Batch files and complete file generated
✓ Provenance preserved (seed_id in each SEED_PAIR)`
  },
  '2': {
    name: 'Corpus Intelligence',
    description: 'FCFS mapping and utility scoring',
    overview: 'Phase 2 analyzes the translated corpus to determine First-Can-First-Say (FCFS) chronological order and calculate pedagogical utility scores for each translation unit.',
    objectives: [
      'Map FCFS (First-Can-First-Say) chronological dependencies',
      'Calculate utility scores for each translation',
      'Identify high-value teaching sequences',
      'Prepare data for LEGO extraction algorithm'
    ],
    steps: [
      {
        title: 'Dependency Mapping',
        description: 'Analyze which words/structures must be learned before others'
      },
      {
        title: 'FCFS Ordering',
        description: 'Establish chronological teaching order based on prerequisites'
      },
      {
        title: 'Utility Scoring',
        description: 'Calculate pedagogical value scores (frequency × versatility × simplicity)'
      },
      {
        title: 'Intelligence Export',
        description: 'Generate corpus intelligence data for Phase 3'
      }
    ],
    notes: [
      'FCFS order represents "natural" chronological learning sequence',
      'Utility scores may override FCFS for high-value teaching opportunities',
      'This phase prepares the key inputs for LEGO extraction decisions'
    ],
    output: 'Corpus intelligence JSON with FCFS mappings and utility scores for all SEED_PAIRS',
    prompt: `# Phase 2: Corpus Intelligence

## Task
Analyze SEED_PAIRS corpus to determine FCFS (First-Can-First-Say) order and calculate utility scores.

## Input
- SEED_PAIRS: SEED_PAIRS_COMPLETE.json (all 668 seeds)
- Phase 0 intelligence: vfs/phase_outputs/phase_0_intelligence.json

## Your Mission
1. **FCFS Mapping**: Determine chronological teaching order
   - Identify prerequisite knowledge (what must be learned first)
   - Map dependency chains (word A requires word B)
   - Establish natural learning progression
   - Analyze BOTH target and known language structures

2. **Utility Scoring**: Calculate pedagogical value
   - Formula: Frequency × Versatility × Simplicity
   - Frequency: How often used in corpus
   - Versatility: How many contexts it appears in
   - Simplicity: How easy to learn/teach
   - Consider both languages for complete assessment

3. **Generate Intelligence Report**:
   - FCFS rankings for all SEED_PAIRS
   - Utility scores (0-100 scale)
   - Dependency maps
   - Teaching sequence recommendations
   - Pattern analysis for LEGO extraction

## Output Format
vfs/phase_outputs/phase_2_corpus_intelligence.json

{
  "fcfs_order": [ "S0001", "S0042", ... ],
  "utility_scores": { "S0001": 85, "S0042": 92, ... },
  "dependencies": { ... },
  "patterns": { ... },
  "recommendations": { ... }
}

## Critical Notes
- FCFS = "natural" chronological sequence
- Utility may override FCFS for high-value opportunities
- This intelligence drives Phase 3 LEGO decomposition
- Analyze frequency patterns across the entire corpus
- Consider both target and known language complexity

## Success Criteria
✓ FCFS order complete for all 668 SEED_PAIRS
✓ Utility scores calculated
✓ Dependency maps generated
✓ Pattern analysis complete
✓ Ready for Phase 3 LEGO decomposition`
  },
  '3': {
    name: 'LEGO Extraction',
    description: 'FCFS vs Utility optimization + IRON RULE enforcement',
    overview: 'Phase 3 extracts LEGO (teaching) phrases from translations by balancing FCFS chronological order against pedagogical utility, while strictly enforcing the IRON RULE: no LEGO begins or ends with a preposition.',
    objectives: [
      'Decompose SEED_PAIRS into FD-compliant LEGO_PAIRS',
      'Apply FD_LOOP test to every LEGO chunk',
      'Use FCFS corpus frequency to claim semantic territory',
      'Track provenance with S{seed}L{position} format',
      'Generate LEGO_BREAKDOWNS_COMPLETE.json with all decompositions'
    ],
    steps: [
      {
        title: 'Load Translation Amino Acids',
        description: 'Load all translation amino acids from Phase 1 VFS storage'
      },
      {
        title: 'LEGO Candidate Identification',
        description: 'Identify all potential LEGO phrases within each translation'
      },
      {
        title: 'IRON RULE Filter',
        description: 'Reject any LEGO candidates that begin or end with prepositions'
      },
      {
        title: 'FCFS vs Utility Optimization',
        description: 'Select optimal LEGOs balancing chronological order and pedagogical value'
      },
      {
        title: 'Provenance Assignment',
        description: 'Assign S{seed}L{position} birth-parent labels to track LEGO origins'
      },
      {
        title: 'UUID Generation',
        description: 'Create deterministic UUIDs for each LEGO amino acid'
      },
      {
        title: 'VFS Storage',
        description: 'Store LEGO amino acids in amino_acids/legos/ directory'
      }
    ],
    notes: [
      'IRON RULE is absolute: no exceptions for preposition boundaries',
      'FCFS provides chronological baseline, utility may override',
      'Provenance S{seed}L{position} preserves birth-parent relationships',
      'LEGOs are immutable amino acids - edits create new LEGOs with updated provenance',
      'Each LEGO is a discrete component that will be used in pattern construction'
    ],
    lego_architecture: {
      title: 'LEGO Types & Architecture',
      content: `
## LEGO Types

### BASE LEGO
- Fundamental FD unit that cannot be broken down further
- Single, atomic unit
- Examples: "Voglio" = "I want", "voy" = "I'm going", "algo" = "something"

### COMPOSITE LEGO
- FD unit comprising BASE LEGOs + non-LEGO glue words
- BASE LEGOs within DO NOT TILE (don't concatenate cleanly)
- Examples:
  - "voy a decir" = "I'm going to say" (contains: voy + a + decir, where "a" is glue)
  - "sto per esercitarmi" = "I'm going to practice" (contains: sto + per + esercitarmi, where "per" is glue)

### FEEDERS
- BASE LEGOs that participate in a COMPOSITE LEGO
- Have dual existence: as independent BASE LEGOs AND as components within COMPOSITE
- Stored with F## suffix when referenced in COMPOSITE context
- Example: In "voy a decir" (S0005L02), "voy" is F01 and "decir" is F02

### TILING Concept (Critical Decision Rule)
- **TILES** = LEGOs concatenate cleanly without glue words
  - Example: "Voglio parlare" = "Voglio" + "parlare" ✅ TILES
  - Action: Keep as separate BASE LEGOs

- **DOESN'T TILE** = Additional words required between LEGOs
  - Example: "voy a decir" ≠ "voy" + "decir" ❌ (needs "a")
  - Action: Create COMPOSITE LEGO with FEEDERs

**Decision Tree**:
1. Is chunk FD? → YES, continue
2. Multiple BASE LEGOs? → YES, continue
3. Do they TILE? → YES: keep separate | NO: create COMPOSITE
4. Create COMPOSITE with FEEDERs

This architecture is documented in APML v7.6.
      `
    },
    output: 'LEGO_BREAKDOWNS_COMPLETE.json with all SEED_PAIR decompositions into LEGO_PAIRS',
    prompt: `# Phase 3: LEGO Decomposition

Break each SEED_PAIR into LEGO chunks that:
1. When placed side-by-side, EXACTLY reconstruct the original sentence
2. Each LEGO passes the FD_LOOP test independently
3. Are reusable across multiple sentences

## MANDATORY UID FORMAT
For seed S0001:
- LEGOs: S0001L01, S0001L02, S0001L03
- FEEDERs: S0001F01, S0001F02 (sub-components of multi-word LEGOs)
NEVER use L0001 or F0001 (missing parent seed ID)

## FD_LOOP TEST (MANDATORY FOR EVERY CHUNK)
Target → Known → Target = MUST BE IDENTICAL
✅ "importante" → "important" → "importante" (IDENTICAL)
❌ "bien" → "good" → "bueno" (DIFFERENT = FAIL)

## FCFS RULE (First Come, First Served)
When multiple valid mappings exist, use corpus frequency to CLAIM semantic territory:

### ARTISTIC CHOICE (flexible mapping allowed):
- "quiero" appears 15x as "I want" in corpus → CLAIM as "I want"
- "deseo" appears 2x → must use MORE SPECIFIC: "I desire" or "I really want"
- Once claimed, "I want" ALWAYS → "quiero" in this course

### GRAMMATICAL CONSTRAINT (NO flexibility):
- "estoy" CANNOT claim generic "I am" - MUST include temporal aspect
  ✅ "estoy aprendiendo" → "I'm learning" (temporary state)
  ❌ "estoy" → "I am" (loses critical grammar distinction)

## AUTOMATIC REJECTION LIST
**Function Words (ALWAYS FAIL FD):**
- Articles: el/la/los/las, un/una (gender ambiguous)
- Pronouns: le/lo/la (multiple meanings)
- Prepositions: en (in/on/at), de (of/from/about), por/para
- "que" (that/what/which) - context dependent

## DUAL-PASS METHODOLOGY

### PASS 1: Forward Analysis (Target → Known)
1. Start with first word of target sentence
2. Test for FD compliance using FD_LOOP
3. If fails, expand to include next word
4. Continue until FD passes or sentence complete

### PASS 2: Reverse Validation (Known → Target)
1. Take each known chunk
2. Verify it maps back to EXACT target chunk
3. If different → REJECT and re-decompose

### PASS 3: Corpus-Wide Validation
For EVERY chunk, search ALL other SEED_PAIRS:
- Find every occurrence of this chunk
- Count frequency of each mapping
- Apply FCFS: most frequent claims simple mapping
- Less frequent must differentiate with context

## COMPONENTIZATION (when BOTH languages are multi-word)
✅ REQUIRED: "parlare italiano" ↔ "parler italien" (BOTH are 2 words)
✅ REQUIRED: "para su hermana" ↔ "for his sister" (BOTH are 3 words)
❌ NOT NEEDED: "construir" ↔ "build" (both single words)

FORMAT: Simple word mappings ONLY
"[known LEGO] = [target LEGO], where [target1] = [known1] and [target2] = [known2]"

## THE IRON RULE (ABSOLUTE)
**No LEGO begins or ends with a preposition.**
- Examples: ✗ "to the", ✗ "with me", ✗ "in"
- This is NON-NEGOTIABLE

## INPUT DATA
Read ALL SEED_PAIRS from: **seed_pairs.json** (contains all 668 seeds)

Structure:
\`\`\`json
{
  "version": "7.0",
  "translations": {
    "S0001": ["target_sentence", "known_sentence"],
    "S0002": ["target_sentence", "known_sentence"]
  }
}
\`\`\`

## OUTPUT FILE
Final consolidated file: **lego_pairs.json** with ultra-compact v7.0 array format:

\`\`\`json
{
  "version": "7.0",
  "seeds": [
    [
      "S0001",
      ["target_sentence", "known_sentence"],
      [
        ["S0001L01", "B", "target_chunk", "known_chunk"],
        ["S0001L02", "C", "composite_target", "composite_known", [
          ["S0001F01", "F", "feeder1_target", "feeder1_known"],
          ["S0001F02", "F", "feeder2_target", "feeder2_known"]
        ]]
      ]
    ]
  ]
}
\`\`\`

**Type Codes:**
- `"B"` = BASE LEGO (atomic, indivisible)
- `"C"` = COMPOSITE LEGO (multi-word, contains feeders)
- `"F"` = FEEDER (component of composite)

**LEGO ID Format:**
- LEGOs: `S####L##` (e.g., S0001L01, S0001L02)
- FEEDERs: `S####F##` (e.g., S0001F01, S0001F02)

**FEEDER Rules:**
- FEEDERs ONLY appear inside COMPOSITE LEGOs (as 5th array element)
- FEEDERs are BASE LEGOs that participate in a COMPOSITE
- When COMPOSITE doesn't tile cleanly, include FEEDER breakdown

## Success Criteria
✓ All SEED_PAIRS processed
✓ FD_LOOP test passed for every LEGO
✓ FCFS rules applied corpus-wide
✓ Provenance assigned (S{seed}L{position})
✓ **lego_pairs.json** generated in v7.0 ultra-compact format`
  },
  '3.5': {
    name: 'Graph Construction',
    description: 'LEGO adjacency edge mapping',
    overview: 'Phase 3.5 (NEW in v7.0) builds a directed graph of LEGO relationships, mapping which LEGOs can follow which other LEGOs based on adjacency patterns in the source translations. This graph intelligence drives pattern-aware basket construction in Phase 5.',
    objectives: [
      'Build directed graph of LEGO adjacency relationships',
      'Map which LEGOs can legitimately follow other LEGOs',
      'Calculate edge weights based on co-occurrence frequency',
      'Prepare graph intelligence for pattern coverage optimization'
    ],
    steps: [
      {
        title: 'Load LEGO Amino Acids',
        description: 'Load all LEGO amino acids from Phase 3 VFS storage'
      },
      {
        title: 'Adjacency Detection',
        description: 'Scan source translations to find LEGO co-occurrence patterns'
      },
      {
        title: 'Edge Creation',
        description: 'Create directed edges: LEGO_A → LEGO_B when A precedes B in corpus'
      },
      {
        title: 'Weight Calculation',
        description: 'Assign edge weights based on co-occurrence frequency and pedagogical value'
      },
      {
        title: 'Graph Validation',
        description: 'Ensure graph is connected and has no invalid cycles'
      },
      {
        title: 'Graph Export',
        description: 'Export graph structure as JSON for Phase 5 consumption'
      }
    ],
    notes: [
      'This is a NEW phase in APML v7.6 - introduces graph intelligence',
      'Graph edges represent legitimate LEGO sequence patterns',
      'Phase 5 uses this graph to ensure pattern coverage in baskets',
      'Edge weights inform pattern selection during basket construction'
    ],
    output: 'LEGO adjacency graph JSON with directed edges and weights',
    prompt: `# Phase 3.5: Graph Construction (NEW in v7.0)

## Task
Build directed graph of LEGO adjacency relationships to enable pattern-aware basket construction.

## Input
- LEGO amino acids: vfs/amino_acids/legos/*.json
- Translation amino acids: vfs/amino_acids/translations/*.json (for co-occurrence analysis)

## Your Mission
1. **Detect Adjacency Patterns**:
   - Scan source translations to find which LEGOs appear adjacent to each other
   - Example: In "Dw i eisiau mynd", LEGOs "Dw i" and "eisiau" are adjacent

2. **Build Directed Graph**:
   - Nodes: All LEGO amino acids
   - Edges: LEGO_A → LEGO_B (A precedes B in corpus)
   - Direction matters (A→B ≠ B→A)

3. **Calculate Edge Weights**:
   - Weight = co-occurrence frequency × pedagogical value
   - Higher weight = more important pattern to teach

4. **Validate Graph**:
   - Ensure graph is connected
   - Check for invalid cycles
   - Verify all LEGOs represented

5. **Export Graph Structure**:
   - Adjacency list format
   - Include edge weights
   - Store metadata (total nodes, edges, density)

## Output Format
vfs/phase_outputs/phase_3.5_lego_graph.json

{
  "nodes": [ ... ],
  "edges": [
    { "from": "uuid_A", "to": "uuid_B", "weight": 42 },
    ...
  ],
  "metadata": { ... }
}

## Critical Notes
- This is NEW in APML v7.6 - graph intelligence!
- Phase 5 uses this graph for pattern coverage optimization
- Edges represent legitimate LEGO sequence patterns
- Replaces old DEBUT/ETERNAL pattern logic

## Success Criteria
✓ All LEGO adjacencies mapped
✓ Directed edges created
✓ Edge weights calculated
✓ Graph validated (connected, no invalid cycles)
✓ Ready for Phase 5 consumption`
  },
  '4': {
    name: 'Deduplication',
    description: 'Provenance preservation during deduplication',
    overview: 'Phase 4 identifies and merges duplicate LEGOs while carefully preserving provenance information. When identical LEGOs are found from different seed sources, their S{seed}L{position} labels are merged to maintain complete birth-parent history.',
    objectives: [
      'Identify duplicate LEGO amino acids across the corpus',
      'Merge duplicates while preserving all provenance data',
      'Maintain S{seed}L{position} history for all birth-parents',
      'Create deduplicated LEGO set with complete ancestry'
    ],
    steps: [
      {
        title: 'Load LEGO Amino Acids',
        description: 'Load all LEGO amino acids from Phase 3'
      },
      {
        title: 'Duplicate Detection',
        description: 'Identify LEGOs with identical content but different provenance'
      },
      {
        title: 'Provenance Merging',
        description: 'Combine S{seed}L{position} labels: S12L3, S45L1, S89L2'
      },
      {
        title: 'UUID Recalculation',
        description: 'Generate new deterministic UUID based on merged provenance'
      },
      {
        title: 'Deduplicated Export',
        description: 'Export merged LEGO set with complete provenance history'
      }
    ],
    notes: [
      'Deduplication is CRITICAL - many LEGOs appear in multiple seeds',
      'Provenance MUST be preserved - never lose birth-parent information',
      'Merged LEGOs maintain ALL source references for future edits',
      'If a source seed is edited, provenance enables surgical LEGO updates'
    ],
    output: 'Deduplicated LEGO set with merged provenance labels',
    prompt: `# Phase 4: Deduplication

## Task
Identify and merge duplicate LEGOs while preserving ALL provenance information.

## Input
- LEGO amino acids: vfs/amino_acids/legos/*.json

## Your Mission
1. **Detect Duplicates**:
   - Find LEGOs with identical text content
   - May have different UUIDs (different provenance)
   - Example: "Dw i" might appear from S1L1, S4L2, S12L3

2. **Merge Provenance**:
   - Combine all S{seed}L{position} labels
   - Example: Merge S1L1, S4L2, S12L3 → "S1L1, S4L2, S12L3"
   - NEVER lose any provenance information

3. **Recalculate UUID**:
   - Generate new deterministic UUID based on:
     - LEGO text
     - ALL merged provenance labels
     - Metadata

4. **Create Deduplicated Set**:
   - One LEGO per unique text
   - Complete provenance history preserved
   - Update graph references if needed

5. **Store Results**:
   - vfs/amino_acids/legos_deduplicated/*.json
   - Keep original LEGOs (immutable)
   - Deduplicated set is NEW amino acids

## Why This Matters
- Many LEGOs appear in multiple seeds
- Provenance enables edit propagation
- If seed S12 changes, we know which LEGOs to update
- Birth-parent history must NEVER be lost

## Output Structure
{
  "uuid": "new_deduplicated_uuid",
  "text": "the LEGO phrase",
  "provenance": ["S1L1", "S4L2", "S12L3"],
  "source_count": 3,
  "metadata": { ... }
}

## Success Criteria
✓ All duplicates identified
✓ Provenance fully merged (no data loss)
✓ New UUIDs generated
✓ Deduplicated set created
✓ Original LEGOs preserved (immutable)`
  },
  '5': {
    name: 'Pattern-Aware Baskets',
    description: 'Graph-driven edge coverage and pedagogical sequencing',
    overview: 'Phase 5 constructs learning baskets (lessons) using graph intelligence from Phase 3.5. Baskets are optimized for edge coverage (pattern diversity) while maintaining pedagogical coherence and FCFS/utility balance.',
    objectives: [
      'Construct pedagogical baskets (lessons) from deduplicated LEGOs',
      'Maximize graph edge coverage for pattern diversity',
      'Maintain FCFS chronological progression',
      'Balance utility scoring for high-value teaching sequences',
      'Generate basket amino acids with LEGO manifests'
    ],
    steps: [
      {
        title: 'Load Deduplicated LEGOs',
        description: 'Load deduplicated LEGO set from Phase 4'
      },
      {
        title: 'Load Graph Intelligence',
        description: 'Load LEGO adjacency graph from Phase 3.5'
      },
      {
        title: 'Edge Coverage Optimization',
        description: 'Select LEGOs to maximize unique graph edge coverage per basket'
      },
      {
        title: 'Pedagogical Sequencing',
        description: 'Order LEGOs within baskets using FCFS + utility guidance'
      },
      {
        title: 'Basket Construction',
        description: 'Create basket amino acids with LEGO manifests and metadata'
      },
      {
        title: 'VFS Storage',
        description: 'Store basket amino acids in amino_acids/baskets/ directory'
      }
    ],
    notes: [
      'Pattern coverage is KEY - each basket should expose diverse LEGO combinations',
      'Graph edges guide pattern selection - avoid redundant sequences',
      'This phase replaces old "DEBUT/ETERNAL" terminology with pattern-aware logic',
      'Baskets are still amino acids - they can be recompiled if LEGOs change'
    ],
    output: 'Basket amino acids with LEGO manifests and graph coverage metadata',
    prompt: `# Phase 5: Pattern-Aware Baskets

## Task
Construct learning baskets (lessons) optimized for graph edge coverage and pedagogical progression.

## Input
- Deduplicated LEGOs: vfs/amino_acids/legos_deduplicated/*.json
- LEGO graph: vfs/phase_outputs/phase_3.5_lego_graph.json
- Corpus intelligence: vfs/phase_outputs/phase_2_corpus_intelligence.json

## Your Mission
1. **Load Graph Intelligence**:
   - LEGO adjacency graph with edges and weights
   - This drives pattern coverage optimization

2. **Maximize Edge Coverage**:
   - Select LEGOs to expose DIVERSE patterns
   - Each basket should cover unique graph edges
   - Avoid redundant LEGO sequences across baskets
   - Goal: Learners experience maximum pattern variety

3. **Maintain Pedagogical Coherence**:
   - Follow FCFS chronological progression
   - Apply utility scoring for high-value sequences
   - Ensure smooth difficulty progression
   - Balance novelty with reinforcement

4. **Construct Basket Amino Acids**:
   - Each basket = collection of LEGO UUIDs (manifest)
   - Metadata: edge coverage stats, difficulty level, etc.
   - Deterministic UUID based on manifest content

5. **Store Results**:
   - **lego_baskets.json** (consolidated v7.0 format)

## Basket Structure (v7.0 Ultra-Compact Array Format)
\`\`\`json
{
  "version": "7.0",
  "baskets": {
    "S0001L01": [
      ["lego_target", "lego_known"],
      [["e_phrase_target", "e_phrase_known"]],
      [
        [["d2_target", "d2_known"]],
        [["d3_target", "d3_known"]],
        [["d4_target", "d4_known"]],
        [["d5_target", "d5_known"]]
      ]
    ]
  }
}
\`\`\`

**Format:**
- Key: LEGO ID
- Value: `[lego_pair, e_phrases, d_phrases]`
  - `lego_pair`: `[target, known]` - the LEGO itself
  - `e_phrases`: Array of enabling phrases (full sentence context)
  - `d_phrases`: Discovery phrases by length (d2, d3, d4, d5)

## This Replaces OLD Logic
- OLD: DEBUT/ETERNAL pattern terminology
- NEW: Graph-driven edge coverage
- BETTER: Measurable pattern diversity

## Success Criteria
✓ All LEGOs assigned to baskets
✓ Maximum edge coverage per basket
✓ FCFS/utility balance maintained
✓ Basket amino acids created with manifests
✓ Ready for Phase 6 (introductions)`
  },
  '6': {
    name: 'Introductions',
    description: 'Known-only priming with no unknown elements',
    overview: 'Phase 6 generates introduction phrases that prime learners using ONLY known LEGOs from previous baskets. Introductions contain zero unknown elements, creating a confidence-building entry point for each new basket.',
    objectives: [
      'Generate introduction phrases for each basket',
      'Use ONLY LEGOs the learner has already mastered',
      'Create confidence-building entry sequences',
      'Prime learners for new basket content without introducing unknowns'
    ],
    steps: [
      {
        title: 'Load Basket Amino Acids',
        description: 'Load all basket amino acids from Phase 5'
      },
      {
        title: 'Known LEGO Inventory',
        description: 'For each basket, identify all LEGOs from PREVIOUS baskets (known set)'
      },
      {
        title: 'Introduction Generation',
        description: 'Create intro phrases using ONLY known LEGOs - zero unknowns'
      },
      {
        title: 'Validation',
        description: 'Verify introductions contain no new vocabulary or structures'
      },
      {
        title: 'VFS Storage',
        description: 'Store introduction amino acids with basket references'
      }
    ],
    notes: [
      'Introductions MUST contain zero unknown elements - absolute rule',
      'Known-only priming builds confidence and reduces cognitive load',
      'Introductions activate prior knowledge before new learning',
      'This is the final phase before course compilation'
    ],
    output: 'Introduction phrase amino acids with known-LEGO-only guarantees',
    prompt: `# Phase 6: Introductions

## Task
Generate known-only introduction phrases for each basket to prime learners with zero unknowns.

## Input
- **lego_baskets.json** (Phase 5 output)
- **lego_pairs.json** (Phase 3 output - deduplicated LEGOs)

## Your Mission
For each basket:
1. **Identify Known LEGOs**:
   - Scan ALL previous baskets (baskets 1 to N-1)
   - Compile complete inventory of LEGOs learner has mastered
   - These are the ONLY LEGOs you can use

2. **Generate Introduction Phrases**:
   - Create warm-up phrases using ONLY known LEGOs
   - ZERO unknown vocabulary or structures
   - Goal: Activate prior knowledge, build confidence
   - Prepare learner for new basket content

3. **Validate Known-Only Rule**:
   - Double-check: NO new LEGOs in introductions
   - Every word/phrase must be from known set
   - Absolute rule - no exceptions

4. **Create Introduction Amino Acids**:
   - Deterministic UUID based on content + basket reference
   - Store: vfs/amino_acids/introductions/{uuid}.json

## Introduction Amino Acid Structure
{
  "uuid": "...",
  "basket_uuid": "...",
  "phrases": ["phrase1", "phrase2", ...],
  "known_legos_used": ["uuid1", "uuid2", ...],
  "validation": {
    "all_known": true,
    "unknown_count": 0
  }
}

## Why This Matters
- Reduces cognitive load before new learning
- Builds learner confidence (100% comprehension)
- Primes brain for new content
- Creates smooth entry point to each basket

## CRITICAL RULE
**ZERO unknown elements allowed in introductions.**
If you're unsure, DON'T use it.

## Success Criteria
✓ Introduction generated for each basket
✓ All LEGOs verified as "known" from previous baskets
✓ Zero unknown elements (validated)
✓ Introduction amino acids stored
✓ Course ready for final compilation`
  },
  '7': {
    name: 'Course Compilation',
    description: 'VFS amino acids → App JSON structure',
    overview: 'Phase 7 compiles all amino acids (translations, LEGOs, baskets, introductions) from the VFS into the final JSON structure required by the SSi mobile app. This phase assembles the course data into slices, seeds, samples, and introduction items.',
    objectives: [
      'Load all amino acids from VFS directories',
      'Compile into app-ready JSON format (slices, seeds, samples)',
      'Generate sample metadata (role, cadence, duration)',
      'Create course-level metadata (language names, version, ID)',
      'Output single JSON file ready for audio generation'
    ],
    steps: [
      {
        title: 'Load VFS Amino Acids',
        description: 'Read all amino acids from vfs/amino_acids: translations, legos, baskets, introductions'
      },
      {
        title: 'Build Seeds Array',
        description: 'Compile each translation into a seed with its introduction items (LEGO chunks)'
      },
      {
        title: 'Generate Samples Object',
        description: 'Create samples{} mapping of text → audio metadata for all unique phrases'
      },
      {
        title: 'Create Slices',
        description: 'Package seeds and samples into slices (typically 1 slice per course)'
      },
      {
        title: 'Add Course Metadata',
        description: 'Add course ID, languages, version, belt assessor, introduction audio'
      },
      {
        title: 'Write Course JSON',
        description: 'Output final JSON to vfs/courses/{course_code}/compiled.json'
      }
    ],
    notes: [
      'This is the bridge between VFS amino acids and the mobile app',
      'Output follows the en-ga-demo.json structure exactly',
      'Sample IDs are UUIDs that will be used for audio file names',
      'Roles: presentation (English narration), source (English), target1/target2 (Irish)',
      'Cadence options: natural, slow, ultra-slow',
      'Duration estimates can be calculated from text length initially'
    ],
    output: 'Complete course JSON file ready for Phase 8 audio generation',
    prompt: `# Phase 7: Course Compilation

## Task
Compile VFS amino acids into final app-ready JSON structure.

## Input
- **seed_pairs.json** (Phase 1 output - translations)
- **lego_pairs.json** (Phase 3 output - LEGO decompositions)
- **lego_baskets.json** (Phase 5 output - baskets with e/d phrases)
- **introductions.json** (Phase 6 output - introduction phrases)

## Your Mission

### 1. Load All Amino Acids
- Read all amino acid JSON files from VFS directories
- Build complete inventory of course components
- Map relationships (which LEGOs belong to which seeds, etc.)

### 2. Build Course Structure
Create JSON with this exact structure:

\`\`\`json
{
  "id": "{course-uuid}",
  "known": "{known_language_code}",
  "target": "{target_language_code}",
  "version": "1.0",
  "beltAssessor": { ... },
  "blackBeltBoundary": 0,
  "introduction": {
    "id": "{uuid}",
    "role": "presentation",
    "cadence": "natural",
    "duration": 0.0
  },
  "slices": [
    {
      "id": "{slice-uuid}",
      "version": "1.0",
      "seeds": [
        {
          "id": "{seed-uuid}",
          "node": {
            "id": "{seed-uuid}",
            "known": {
              "text": "I'd like to speak Irish with you now",
              "tokens": ["I'd", "like", "to", ...],
              "lemmas": [...]
            },
            "target": {
              "text": "ba mhaith liom Gaeilge a labhairt leat anois",
              "tokens": ["ba", "mhaith", ...],
              "lemmas": [...]
            }
          },
          "seedSentence": {
            "canonical": "I'd like to speak Irish with you now."
          },
          "introductionItems": [
            {
              "id": "{lego-uuid}",
              "node": { ... },
              "presentation": "Now, the Irish for 'I'd like' is 'ba mhaith liom', ba mhaith liom.",
              "nodes": []
            }
          ]
        }
      ],
      "samples": {
        "ba mhaith liom": [
          {
            "id": "{audio-sample-uuid}",
            "role": "target1",
            "cadence": "natural",
            "duration": 0.78
          },
          {
            "id": "{audio-sample-uuid-2}",
            "role": "target2",
            "cadence": "natural",
            "duration": 0.83
          }
        ],
        "I'd like": [
          {
            "id": "{audio-sample-uuid-3}",
            "role": "source",
            "cadence": "natural",
            "duration": 0.45
          }
        ],
        "Now, the Irish for 'I'd like' is 'ba mhaith liom', ba mhaith liom.": [
          {
            "id": "{audio-sample-uuid-4}",
            "role": "presentation",
            "cadence": "natural",
            "duration": 3.2
          }
        ]
      },
      "orderedEncouragements": [],
      "pooledEncouragements": []
    }
  ]
}
\`\`\`

### 3. Sample Generation Rules
For each unique text string in the course:
- **Target language chunks**: Create target1 AND target2 samples (two speakers)
- **Source language chunks**: Create source sample
- **Presentation narration**: Create presentation sample
- Generate unique UUIDs for each sample
- Estimate duration: ~0.15s per word as baseline

### 4. Output Location
Write compiled JSON to:
\`vfs/courses/{course_code}/compiled.json\`

## Audio Roles Explained
- **presentation**: English narration ("Now, the Irish for X is Y")
- **source**: English phrase audio
- **target1**: Target language (speaker 1)
- **target2**: Target language (speaker 2 - for variety/comparison)

## Important Notes
- Sample IDs become audio file names: {uuid}.mp3
- Every unique text needs corresponding audio samples
- Slices typically contain all seeds for small courses
- Larger courses may split into multiple slices
- UUIDs must be deterministic and content-based

## Success Criteria
✓ All amino acids loaded and compiled
✓ JSON structure matches app format exactly
✓ All unique texts have sample metadata
✓ UUIDs generated for all samples
✓ Output file created
✓ Ready for Phase 8 audio generation`
  },
  '8': {
    name: 'Audio Generation',
    description: 'TTS synthesis & S3 upload',
    overview: 'Phase 8 generates audio files for all samples defined in the compiled course JSON using Text-to-Speech services, then uploads them to AWS S3 for delivery to the mobile app. This is the final phase before deployment.',
    objectives: [
      'Check AWS S3 for existing audio files',
      'Generate missing audio using TTS (ElevenLabs/AWS Polly)',
      'Match voice characteristics to roles (presentation, source, target1, target2)',
      'Upload all audio files to S3 bucket',
      'Verify all required audio samples are available'
    ],
    steps: [
      {
        title: 'Load Compiled Course',
        description: 'Read compiled.json from Phase 7 to get all sample requirements'
      },
      {
        title: 'Check S3 Status',
        description: 'Query S3 bucket to identify which audio files already exist'
      },
      {
        title: 'Generate Missing Audio',
        description: 'Use TTS services to synthesize audio for missing samples'
      },
      {
        title: 'Upload to S3',
        description: 'Upload generated audio files to S3 with proper naming: {uuid}.mp3'
      },
      {
        title: 'Verify Deployment',
        description: 'Confirm all required samples are now available in S3'
      },
      {
        title: 'Update Course Record',
        description: 'Mark course as audio-complete and ready for app deployment'
      }
    ],
    notes: [
      'Audio files are named by sample UUID: {uuid}.mp3',
      'Use different voices for different roles (presentation, source, target1, target2)',
      'Target1 and target2 should be different native speakers for comparison',
      'Presentation voice should be warm, encouraging, instructional',
      'Respect cadence settings: natural, slow, ultra-slow',
      'S3 bucket structure: s3://ssi-audio/{language_pair}/{uuid}.mp3',
      'Failed TTS attempts should be logged and retried with fallback voices'
    ],
    output: 'All audio files uploaded to S3, course ready for deployment',
    prompt: `# Phase 8: Audio Generation

## Task
Generate and upload all required audio samples to AWS S3.

## Input
- Compiled course JSON: vfs/courses/{course_code}/compiled.json
- AWS S3 credentials (from environment)
- TTS service API keys (ElevenLabs, AWS Polly, etc.)

## Your Mission

### 1. Parse Course Requirements
- Load compiled.json
- Extract all samples from slices[].samples object
- Build complete list of required audio files (UUIDs + text + role + cadence)

### 2. Check S3 Status
Query S3 to determine which audio files already exist:
\`\`\`bash
aws s3 ls s3://ssi-audio/{language_pair}/
\`\`\`

Create two lists:
- **Available**: Sample UUIDs that exist in S3
- **Missing**: Sample UUIDs that need to be generated

### 3. Generate Missing Audio
For each missing sample:

**Presentation (English narration)**:
- Use warm, encouraging instructional voice
- Example: "Now, the Irish for 'I'd like' is 'ba mhaith liom', ba mhaith liom."
- Voice: ElevenLabs "Rachel" or AWS Polly "Joanna"

**Source (English phrases)**:
- Clear, neutral English voice
- Example: "I'd like"
- Voice: ElevenLabs "Drew" or AWS Polly "Matthew"

**Target1 (Target language speaker 1)**:
- Native target language speaker
- Example: "ba mhaith liom"
- Voice: ElevenLabs language-specific voice

**Target2 (Target language speaker 2)**:
- Different native speaker (for comparison/variety)
- Same text as target1, different voice
- Voice: Alternative language-specific voice

**Cadence handling**:
- natural: Normal speech rate
- slow: 0.75x speed
- ultra-slow: 0.5x speed

### 4. TTS Generation
\`\`\`javascript
async function generateAudio(text, role, cadence, sampleId) {
  const voice = selectVoice(role, targetLanguage)
  const speed = cadenceToSpeed(cadence)

  const audioBuffer = await ttsService.synthesize({
    text,
    voice,
    speed
  })

  return {
    id: sampleId,
    audioBuffer,
    format: 'mp3'
  }
}
\`\`\`

### 5. Upload to S3
\`\`\`javascript
async function uploadToS3(sampleId, audioBuffer, languagePair) {
  const key = \`\${languagePair}/\${sampleId}.mp3\`

  await s3.putObject({
    Bucket: 'ssi-audio',
    Key: key,
    Body: audioBuffer,
    ContentType: 'audio/mpeg',
    ACL: 'public-read'
  })

  return \`https://ssi-audio.s3.amazonaws.com/\${key}\`
}
\`\`\`

### 6. Progress Tracking
- Log generation progress to database
- Support job status queries: /api/audio/generation-status/{jobId}
- Return structure:
\`\`\`json
{
  "jobId": "...",
  "status": "running|completed|failed",
  "total": 447,
  "completed": 120,
  "failed": 2,
  "errors": [...]
}
\`\`\`

### 7. Verification
After generation:
- Re-query S3 to confirm all files uploaded
- Check file sizes (audio files should be > 0 bytes)
- Spot-check a few samples by downloading and playing
- Update course record: \`audio_status: "complete"\`

## Error Handling
- **TTS failures**: Retry with fallback voice
- **S3 upload failures**: Retry with exponential backoff
- **Invalid text**: Log and skip, report to admin
- **Rate limiting**: Implement queuing and throttling

## Voice Selection Guide
| Role | Language | Suggested Voice |
|------|----------|----------------|
| presentation | English | ElevenLabs "Rachel" / Polly "Joanna" |
| source | English | ElevenLabs "Drew" / Polly "Matthew" |
| target1 | Irish | ElevenLabs custom/Polly "Niamh" |
| target2 | Irish | Alternative Irish voice |
| target1 | Spanish | ElevenLabs Spanish voice |
| target2 | Spanish | Alternative Spanish voice |

## S3 Bucket Structure
\`\`\`
ssi-audio/
  en-ga/
    {uuid1}.mp3
    {uuid2}.mp3
    ...
  en-es/
    {uuid1}.mp3
    ...
\`\`\`

## Success Criteria
✓ All missing samples generated
✓ All audio files uploaded to S3
✓ S3 verification passed (100% available)
✓ Course marked as audio-complete
✓ Job status logged and accessible
✓ Course ready for app deployment`
  }
}

const phaseData = computed(() => {
  // Prioritize live data from APML registry
  if (promptMeta.value && promptMeta.value.name) {
    return {
      name: promptMeta.value.name || `Phase ${props.id}`,
      description: promptMeta.value.description || 'Live from APML Registry',
      overview: 'This phase prompt is fetched live from the APML registry and reflects the current working configuration.',
      objectives: phaseContent[props.id]?.objectives || [],
      steps: phaseContent[props.id]?.steps || [],
      notes: phaseContent[props.id]?.notes || [],
      output: phaseContent[props.id]?.output || '',
      prompt: promptText.value || ''
    }
  }

  // Fallback to hardcoded content if API fails
  return phaseContent[props.id] || {
    name: 'Unknown Phase',
    description: 'Phase not found',
    overview: 'No content available for this phase.',
    objectives: [],
    steps: [],
    notes: [],
    output: '',
    prompt: '# Unknown Phase\n\nNo prompt available for this phase.'
  }
})

// Watch for phase changes and update prompt text
watch(() => props.id, () => {
  promptText.value = phaseData.value.prompt || ''
}, { immediate: true })

// Also watch phaseData directly
watch(phaseData, (newData) => {
  promptText.value = newData.prompt || ''
}, { immediate: true })
</script>
