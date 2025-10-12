/**
 * Mock Data Generator for Quality Review Dashboard
 *
 * This module generates realistic mock data for testing the quality review
 * components before the actual API is ready.
 */

// Spanish example sentences for realistic mock data
const spanishExamples = [
  { source: 'I would like to go to the beach', target: 'Me gustaría ir a la playa' },
  { source: 'Where is the bathroom?', target: '¿Dónde está el baño?' },
  { source: 'Can you help me?', target: '¿Puedes ayudarme?' },
  { source: 'How much does this cost?', target: '¿Cuánto cuesta esto?' },
  { source: 'I am learning Spanish', target: 'Estoy aprendiendo español' },
  { source: 'What time is it?', target: '¿Qué hora es?' },
  { source: 'I like coffee', target: 'Me gusta el café' },
  { source: 'Where do you live?', target: '¿Dónde vives?' },
  { source: 'My name is John', target: 'Me llamo Juan' },
  { source: 'How are you?', target: '¿Cómo estás?' },
  { source: 'I am from America', target: 'Soy de América' },
  { source: 'Can I have the menu?', target: '¿Puedo ver el menú?' },
  { source: 'I need a taxi', target: 'Necesito un taxi' },
  { source: 'Where is the train station?', target: '¿Dónde está la estación de tren?' },
  { source: 'I don\'t understand', target: 'No entiendo' },
  { source: 'Please speak slowly', target: 'Por favor habla despacio' },
  { source: 'Thank you very much', target: 'Muchas gracias' },
  { source: 'You are welcome', target: 'De nada' },
  { source: 'See you tomorrow', target: 'Hasta mañana' },
  { source: 'Good morning', target: 'Buenos días' }
]

const concernTypes = [
  'boundary',
  'overlap',
  'missing',
  'semantic',
  'complex',
  'granularity'
]

const statusTypes = ['pending', 'flagged', 'accepted', 'rejected']

const legoTypes = [
  'verb_phrase',
  'noun_phrase',
  'prepositional_phrase',
  'temporal',
  'conditional_desire',
  'action_destination',
  'interrogative',
  'pronoun',
  'adjective',
  'adverb'
]

/**
 * Generate a random quality score with bias towards higher scores
 */
function generateQualityScore(bias = 0) {
  const base = Math.random() * 10
  // Add bias to push scores higher
  const biased = Math.min(10, base + bias + Math.random() * 2)
  return biased
}

/**
 * Generate LEGOs for a given Spanish sentence
 */
function generateLegosForSentence(sentence, quality) {
  const words = sentence.split(' ')
  const legos = []
  let position = 0

  // Generate 2-5 LEGOs per sentence
  const numLegos = Math.floor(Math.random() * 3) + 2
  const chunkSize = Math.ceil(words.length / numLegos)

  for (let i = 0; i < numLegos && position < words.length; i++) {
    const size = Math.min(chunkSize + Math.floor(Math.random() * 2 - 1), words.length - position)
    const chunk = words.slice(position, position + size)
    const text = chunk.join(' ')

    // Calculate character positions
    const start = sentence.indexOf(text, position > 0 ? legos[legos.length - 1].end : 0)
    const end = start + text.length

    legos.push({
      text,
      start,
      end,
      type: legoTypes[Math.floor(Math.random() * legoTypes.length)],
      confidence: Math.min(1, (quality / 10) + Math.random() * 0.2)
    })

    position += size
  }

  return legos
}

/**
 * Generate a single SEED with quality data
 */
export function generateSeed(index, courseExamples = spanishExamples) {
  const example = courseExamples[index % courseExamples.length]
  const quality = generateQualityScore(index / 100) // Slight improvement over time
  const hasConcerns = quality < 7.5 || Math.random() > 0.75

  // Determine status based on quality
  let status
  if (quality >= 8.5) {
    status = 'accepted'
  } else if (quality < 6.5) {
    status = 'flagged'
  } else {
    status = statusTypes[Math.floor(Math.random() * statusTypes.length)]
  }

  const attemptCount = quality < 7 ? Math.floor(Math.random() * 4) + 2 : 1

  return {
    id: `SEED_${String(index + 1).padStart(4, '0')}`,
    source: example.source,
    target: example.target,
    quality_score: quality,
    attempt_count: attemptCount,
    status,
    concerns: hasConcerns
      ? [concernTypes[Math.floor(Math.random() * concernTypes.length)]]
      : [],
    agent_assessment: hasConcerns
      ? generateNegativeAssessment()
      : generatePositiveAssessment(),
    legos: generateLegosForSentence(example.target, quality),
    last_updated: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString()
  }
}

/**
 * Generate multiple SEEDs
 */
export function generateSeeds(count = 668) {
  const seeds = []
  // Cycle through examples to create variety
  const examples = [...spanishExamples]

  for (let i = 0; i < count; i++) {
    seeds.push(generateSeed(i, examples))
  }

  return seeds
}

/**
 * Generate extraction attempts for a SEED
 */
export function generateAttempts(seed, count = 3) {
  const attempts = []

  for (let i = 0; i < count; i++) {
    const quality = generateQualityScore(i * 1.5) // Each attempt gets better
    const timestamp = new Date(Date.now() - (count - i) * 86400000).toISOString()

    attempts.push({
      attempt_number: i + 1,
      timestamp,
      quality_score: quality,
      prompt_version: `v1.${i}.0`,
      model: 'claude-3-5-sonnet-20241022',
      processing_time: Math.floor(Math.random() * 1000) + 1500,
      agent_assessment: quality >= 8
        ? generatePositiveAssessment()
        : generateNegativeAssessment(),
      concerns: quality < 7.5
        ? [
            {
              type: concernTypes[Math.floor(Math.random() * concernTypes.length)],
              description: generateConcernDescription(),
              suggestion: generateSuggestion()
            }
          ]
        : [],
      suggestions: quality < 8.5 ? [generateSuggestion()] : [],
      quality_breakdown: [
        { name: 'Boundaries', score: quality + Math.random() * 2 - 1 },
        { name: 'Coverage', score: quality + Math.random() * 2 - 1 },
        { name: 'Semantics', score: quality + Math.random() * 2 - 1 },
        { name: 'Overlap', score: quality + Math.random() * 2 - 1 },
        { name: 'Complexity', score: quality + Math.random() * 2 - 1 }
      ].map(item => ({ ...item, score: Math.max(0, Math.min(10, item.score)) })),
      legos: generateLegosForSentence(seed.target, quality),
      prompt_text: generatePromptText(i)
    })
  }

  return attempts
}

/**
 * Generate quality overview stats
 */
export function generateQualityOverview(seeds) {
  const total = seeds.length
  const totalQuality = seeds.reduce((sum, s) => sum + s.quality_score, 0)
  const flagged = seeds.filter(s => s.status === 'flagged')
  const accepted = seeds.filter(s => s.status === 'accepted')
  const pending = seeds.filter(s => s.status === 'pending')
  const totalAttempts = seeds.reduce((sum, s) => sum + s.attempt_count, 0)

  return {
    avgQuality: totalQuality / total,
    flaggedCount: flagged.length,
    flaggedPercent: ((flagged.length / total) * 100).toFixed(1),
    acceptedCount: accepted.length,
    acceptedPercent: ((accepted.length / total) * 100).toFixed(1),
    avgAttempts: totalAttempts / total,
    pendingReview: pending.length
  }
}

/**
 * Generate learned rules for prompt evolution
 */
export function generateLearnedRules() {
  return [
    {
      id: 'rule_001',
      name: 'Destination Phrase Unification',
      version: 'v1.1.0',
      status: 'active',
      description: 'Treat "verb + a/de + location" as a single action-destination unit',
      rule: 'if verb in [ir, venir, llegar] and next_token in [a, de] and next_phrase is location: merge as single LEGO',
      improvement: 12.3,
      appliedCount: 247,
      beforeStats: { avgQuality: 6.8, successRate: 62 },
      afterStats: { avgQuality: 8.1, successRate: 84 },
      exampleSeeds: [
        { id: 'SEED_0042', text: 'Voy a la playa', beforeQuality: 6.5, afterQuality: 8.2 },
        { id: 'SEED_0103', text: 'Vengo de Madrid', beforeQuality: 6.9, afterQuality: 8.4 },
        { id: 'SEED_0178', text: 'Llego al aeropuerto', beforeQuality: 6.7, afterQuality: 8.0 }
      ]
    },
    {
      id: 'rule_002',
      name: 'Conditional Desire Expression',
      version: 'v1.1.0',
      status: 'active',
      description: 'Keep conditional verb phrases (gustaría, quisiera) as semantic units',
      rule: 'if verb in conditional_form and expresses_desire: keep as single LEGO',
      improvement: 8.7,
      appliedCount: 156,
      beforeStats: { avgQuality: 7.2, successRate: 70 },
      afterStats: { avgQuality: 8.5, successRate: 88 },
      exampleSeeds: [
        { id: 'SEED_0015', text: 'Me gustaría ir', beforeQuality: 7.1, afterQuality: 8.6 },
        { id: 'SEED_0089', text: 'Quisiera aprender', beforeQuality: 7.3, afterQuality: 8.5 }
      ]
    },
    {
      id: 'rule_003',
      name: 'Temporal Boundary Clarity',
      version: 'v1.2.0',
      status: 'active',
      description: 'Separate time expressions as distinct LEGOs unless part of compound structure',
      rule: 'if token is temporal_adverb and not part_of_compound: separate as LEGO',
      improvement: 6.2,
      appliedCount: 334,
      beforeStats: { avgQuality: 7.8, successRate: 75 },
      afterStats: { avgQuality: 8.6, successRate: 90 },
      exampleSeeds: [
        { id: 'SEED_0201', text: 'Voy mañana', beforeQuality: 7.7, afterQuality: 8.7 },
        { id: 'SEED_0245', text: 'Llego hoy', beforeQuality: 7.9, afterQuality: 8.5 }
      ]
    }
  ]
}

/**
 * Generate experimental rules
 */
export function generateExperimentalRules() {
  return [
    {
      id: 'exp_001',
      name: 'Pronoun Attachment Strategy',
      hypothesis: 'Attaching reflexive pronouns to verbs improves semantic coherence',
      controlStats: { avgQuality: 7.9, successRate: 82, sampleSize: 50 },
      treatmentStats: { avgQuality: 8.4, successRate: 88, sampleSize: 50 },
      confidence: 87.3
    },
    {
      id: 'exp_002',
      name: 'Compound Preposition Handling',
      hypothesis: 'Treating compound prepositions (a través de, en lugar de) as units improves boundaries',
      controlStats: { avgQuality: 8.1, successRate: 85, sampleSize: 30 },
      treatmentStats: { avgQuality: 8.9, successRate: 93, sampleSize: 30 },
      confidence: 96.2
    }
  ]
}

/**
 * Generate health report data
 */
export function generateHealthReport() {
  return {
    healthScore: 87,
    healthFactors: [
      {
        name: 'Extraction Quality',
        score: 89,
        icon: '🎯',
        description: 'Average quality score of LEGO extractions'
      },
      {
        name: 'Coverage',
        score: 92,
        icon: '📊',
        description: 'Percentage of SEEDs with complete LEGO coverage'
      },
      {
        name: 'Consistency',
        score: 85,
        icon: '🔄',
        description: 'Reliability of extraction across similar patterns'
      },
      {
        name: 'Boundary Accuracy',
        score: 88,
        icon: '✂️',
        description: 'Precision of LEGO boundary detection'
      },
      {
        name: 'Semantic Coherence',
        score: 91,
        icon: '🧠',
        description: 'Alignment with semantic units'
      },
      {
        name: 'System Efficiency',
        score: 84,
        icon: '⚡',
        description: 'Re-run rate and processing speed'
      }
    ],
    qualityTrend: Array.from({ length: 30 }, (_, i) => ({
      date: new Date(Date.now() - (29 - i) * 86400000).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      }),
      avgQuality: 7.0 + Math.random() * 2 + (i * 0.05),
      seedsProcessed: Math.floor(20 + Math.random() * 10)
    })),
    phases: [
      {
        id: 1,
        name: 'Phase 1: Translation Extraction',
        description: 'Extract source and target pairs from corpus',
        status: 'complete',
        progress: 100,
        completed: 668,
        total: 668,
        quality: 9.2
      },
      {
        id: 2,
        name: 'Phase 2: LEGO Extraction',
        description: 'Extract LEGOs from translations',
        status: 'complete',
        progress: 100,
        completed: 668,
        total: 668,
        quality: 8.7
      },
      {
        id: 3,
        name: 'Phase 3: Deduplication',
        description: 'Remove duplicate LEGOs',
        status: 'complete',
        progress: 100,
        completed: 2847,
        total: 2847,
        quality: 9.4
      },
      {
        id: 4,
        name: 'Phase 4: Quality Review',
        description: 'Human review and validation',
        status: 'in_progress',
        progress: 42,
        completed: 281,
        total: 668,
        quality: 8.9
      }
    ]
  }
}

// Helper functions for generating text

function generatePositiveAssessment() {
  const templates = [
    'Extraction successful with high confidence. All boundaries align with semantic units.',
    'High-quality extraction with clear semantic boundaries and optimal granularity.',
    'Excellent LEGO boundaries detected. No concerns identified.',
    'Clean extraction with proper semantic segmentation.',
    'All LEGOs properly bounded with strong confidence scores.'
  ]
  return templates[Math.floor(Math.random() * templates.length)]
}

function generateNegativeAssessment() {
  const templates = [
    'Identified potential boundary overlap between LEGOs. Recommend manual review.',
    'Some semantic misalignment detected in LEGO boundaries.',
    'Coverage gaps identified - parts of sentence not captured.',
    'Boundary precision could be improved for better semantic units.',
    'Multiple overlapping LEGOs detected requiring resolution.'
  ]
  return templates[Math.floor(Math.random() * templates.length)]
}

function generateConcernDescription() {
  const descriptions = [
    'LEGOs with overlapping character spans detected',
    'Potential semantic boundary mismatch',
    'Coverage incomplete - missing sentence portions',
    'LEGO granularity too fine for effective teaching',
    'Boundary alignment issues with syntactic structure'
  ]
  return descriptions[Math.floor(Math.random() * descriptions.length)]
}

function generateSuggestion() {
  const suggestions = [
    'Consider merging adjacent LEGOs into semantic unit',
    'Review boundary placement for syntactic alignment',
    'Apply learned rule for phrase unification',
    'Adjust LEGO splitting to match semantic structure',
    'Re-evaluate with updated prompt version'
  ]
  return suggestions[Math.floor(Math.random() * suggestions.length)]
}

function generatePromptText(version) {
  return `Extract LEGOs from the following Spanish sentence...

Version: v1.${version}.0

Learned rules:
${version >= 1 ? '- Treat "ir a [location]" as action+destination unit\n' : ''}${version >= 2 ? '- Conditional desires are semantic units\n' : ''}${version >= 3 ? '- Separate temporal adverbs unless part of compound\n' : ''}
Instructions:
1. Identify semantic boundaries
2. Extract meaningful phrases as LEGOs
3. Ensure no overlapping spans
4. Provide confidence scores

[Full detailed prompt would be here...]`
}

export default {
  generateSeed,
  generateSeeds,
  generateAttempts,
  generateQualityOverview,
  generateLearnedRules,
  generateExperimentalRules,
  generateHealthReport
}
