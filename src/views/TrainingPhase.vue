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

        <!-- Overview Section -->
        <section class="mb-8">
          <h2 class="text-2xl font-semibold text-emerald-400 mb-4">Overview</h2>
          <div class="prose prose-invert prose-emerald max-w-none">
            <p class="text-slate-300">{{ phaseData.overview }}</p>
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
import { computed } from 'vue'

const props = defineProps({
  id: {
    type: String,
    required: true
  }
})

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
    output: 'JSON intelligence report with frequency data, complexity metrics, and translation guidance'
  },
  '1': {
    name: 'Pedagogical Translation',
    description: '6 heuristics optimization for language learning',
    overview: 'Phase 1 applies six pedagogical heuristics to translate source sentences into optimal learning material. Translations prioritize naturalness, frequency, clarity, and pedagogical value over literal accuracy.',
    objectives: [
      'Apply 6 pedagogical heuristics to each seed translation',
      'Optimize for learner comprehension and retention',
      'Maintain natural target language expression',
      'Generate amino acid translation records with deterministic UUIDs'
    ],
    steps: [
      {
        title: 'Load Seed Pairs',
        description: 'Load all 574 canonical seed pairs for translation'
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
    output: '574 translation amino acid JSON files stored in VFS with deterministic UUIDs'
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
    output: 'Corpus intelligence JSON with FCFS mappings and utility scores for each translation'
  },
  '3': {
    name: 'LEGO Extraction',
    description: 'FCFS vs Utility optimization + IRON RULE enforcement',
    overview: 'Phase 3 extracts LEGO (teaching) phrases from translations by balancing FCFS chronological order against pedagogical utility, while strictly enforcing the IRON RULE: no LEGO begins or ends with a preposition.',
    objectives: [
      'Extract optimal teaching phrases (LEGOs) from translations',
      'Balance FCFS order vs utility scoring',
      'Enforce IRON RULE: no preposition boundaries',
      'Track provenance with S{seed}L{position} format',
      'Generate LEGO amino acids with deterministic UUIDs'
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
    output: 'LEGO amino acid JSON files in VFS with provenance labels and deterministic UUIDs'
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
      'This is a NEW phase in APML v7.0 - introduces graph intelligence',
      'Graph edges represent legitimate LEGO sequence patterns',
      'Phase 5 uses this graph to ensure pattern coverage in baskets',
      'Edge weights inform pattern selection during basket construction'
    ],
    output: 'LEGO adjacency graph JSON with directed edges and weights'
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
    output: 'Deduplicated LEGO set with merged provenance labels'
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
    output: 'Basket amino acids with LEGO manifests and graph coverage metadata'
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
    output: 'Introduction phrase amino acids with known-LEGO-only guarantees'
  }
}

const phaseData = computed(() => {
  return phaseContent[props.id] || {
    name: 'Unknown Phase',
    description: 'Phase not found',
    overview: 'No content available for this phase.',
    objectives: [],
    steps: [],
    notes: [],
    output: ''
  }
})
</script>
