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

// Fetch actual prompt from APML when component mounts
onMounted(async () => {
  await fetchPrompt()
})

// Save changes back to APML file
const saveChanges = async () => {
  const changelog = prompt(`Enter changelog message for this update:`, `Update Phase ${props.id} prompt`)
  if (!changelog) return

  try {
    await savePrompt(changelog, 'human')
    alert('✅ Prompt saved successfully! Changes committed to APML and Git.')
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
- Source corpus (574 canonical seed pairs)
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
✓ All 574 seeds analyzed
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
    output: '574 translation amino acid JSON files stored in VFS with deterministic UUIDs',
    prompt: `# Phase 1: Pedagogical Translation

## Task
Apply 6 pedagogical heuristics to translate all 574 canonical seed pairs into optimized learning material.

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
2. Generate deterministic UUID: hash(source + target + metadata)
3. Store as translation amino acid JSON:
   - UUID as filename
   - Content: { source, target, seed_id, heuristics_applied, metadata }
4. Save to: vfs/amino_acids/translations/{uuid}.json

## Critical Rules
- Translations are NOT literal - they are pedagogically optimized
- Each translation is an immutable amino acid component
- UUIDs are content-based (deterministic)
- Preserve seed_id for provenance tracking

## Example Translation
Seed S42: "I would like to go"
Literal: "Hoffwn i fynd"
Pedagogical: "Dw i eisiau mynd" (more natural, higher frequency, clearer for learners)

## Success Criteria
✓ All 574 seeds translated
✓ All 6 heuristics applied to each
✓ Deterministic UUIDs generated
✓ Amino acids stored in VFS
✓ Provenance preserved (seed_id in each amino acid)`
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
    output: 'Corpus intelligence JSON with FCFS mappings and utility scores for each translation',
    prompt: `# Phase 2: Corpus Intelligence

## Task
Analyze translated corpus to determine FCFS (First-Can-First-Say) order and calculate utility scores.

## Input
- Translation amino acids: vfs/amino_acids/translations/*.json
- Phase 0 intelligence: vfs/phase_outputs/phase_0_intelligence.json

## Your Mission
1. **FCFS Mapping**: Determine chronological teaching order
   - Identify prerequisite knowledge (what must be learned first)
   - Map dependency chains (word A requires word B)
   - Establish natural learning progression

2. **Utility Scoring**: Calculate pedagogical value
   - Formula: Frequency × Versatility × Simplicity
   - Frequency: How often used in corpus
   - Versatility: How many contexts it appears in
   - Simplicity: How easy to learn/teach

3. **Generate Intelligence Report**:
   - FCFS rankings for all translations
   - Utility scores (0-100 scale)
   - Dependency maps
   - Teaching sequence recommendations

## Output Format
vfs/phase_outputs/phase_2_corpus_intelligence.json

{
  "fcfs_order": [ ... ],
  "utility_scores": { translation_uuid: score, ... },
  "dependencies": { ... },
  "recommendations": { ... }
}

## Critical Notes
- FCFS = "natural" chronological sequence
- Utility may override FCFS for high-value opportunities
- This data drives Phase 3 LEGO extraction algorithm

## Success Criteria
✓ FCFS order complete
✓ Utility scores calculated for all translations
✓ Dependency maps generated
✓ Ready for Phase 3 consumption`
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
    output: 'LEGO amino acid JSON files in VFS with provenance labels and deterministic UUIDs',
    prompt: `# Phase 3: LEGO Extraction

## Task
Extract optimal teaching phrases (LEGOs) from translations, balancing FCFS vs Utility while enforcing the IRON RULE.

## Input
- Translation amino acids: vfs/amino_acids/translations/*.json
- Corpus intelligence: vfs/phase_outputs/phase_2_corpus_intelligence.json

## THE IRON RULE (ABSOLUTE)
**No LEGO begins or ends with a preposition.**
- Examples: ✗ "to the", ✗ "with me", ✗ "in"
- This is NON-NEGOTIABLE

## Your Mission
For each translation:
1. **Identify LEGO candidates** (potential teaching phrases)
2. **Apply IRON RULE filter** - reject any LEGO with preposition boundaries
3. **Balance FCFS vs Utility**:
   - FCFS: Chronological learning order (baseline)
   - Utility: Pedagogical value (may override FCFS for high-value LEGOs)
4. **Assign Provenance**: S{seed}L{position}
   - Example: S12L3 = Seed 12, LEGO position 3
5. **Generate deterministic UUID**: hash(lego_text + source_translation + position)
6. **Store as LEGO amino acid**: vfs/amino_acids/legos/{uuid}.json

## LEGO Amino Acid Structure
{
  "uuid": "...",
  "text": "the LEGO phrase",
  "provenance": "S12L3",
  "source_translation_uuid": "...",
  "fcfs_score": 85,
  "utility_score": 92,
  "metadata": { ... }
}

## Critical Rules
- IRON RULE is absolute
- Each LEGO is immutable (edits create NEW LEGOs)
- Provenance enables edit propagation
- Balance FCFS (chronological) vs Utility (pedagogical value)

## Success Criteria
✓ All translations processed
✓ IRON RULE enforced (zero preposition boundaries)
✓ Provenance assigned (S{seed}L{position})
✓ UUIDs deterministic
✓ LEGO amino acids stored in VFS`
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
- This is NEW in APML v7.0 - graph intelligence!
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
   - vfs/amino_acids/baskets/{uuid}.json

## Basket Amino Acid Structure
{
  "uuid": "...",
  "lego_manifest": ["uuid1", "uuid2", ...],
  "edge_coverage": ["edge_A_B", "edge_C_D", ...],
  "fcfs_score": 78,
  "difficulty_level": "intermediate",
  "metadata": { ... }
}

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
- Basket amino acids: vfs/amino_acids/baskets/*.json
- Deduplicated LEGOs: vfs/amino_acids/legos_deduplicated/*.json

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
