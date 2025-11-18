#!/usr/bin/env node

/**
 * Composability Graph Generator (Using Haiku 4.5)
 *
 * Generates a language-wide composability graph showing which word chunks
 * naturally combine in the target language. This informs optimal LEGO extraction.
 *
 * Uses Claude Haiku 4.5 for:
 * - Speed (fast analytical processing)
 * - Cost (50x cheaper than Sonnet for bulk analysis)
 * - Language knowledge (full understanding of target language structure)
 *
 * Usage: node scripts/generate-composability-graph.cjs <language_code>
 * Example: node scripts/generate-composability-graph.cjs italian
 */

const fs = require('fs-extra');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');

const HAIKU_MODEL = 'claude-3-5-haiku-20241022';
const BATCH_SIZE = 50; // Chunks per API call

/**
 * Extract all unique chunks from existing course data
 */
async function extractChunksFromCourse(courseCode) {
  const courseDir = path.join(__dirname, '..', 'vfs', 'courses', courseCode);
  const legoPairsPath = path.join(courseDir, 'lego_pairs.json');

  if (!await fs.pathExists(legoPairsPath)) {
    console.warn(`⚠️  Course not found: ${courseCode} - using bootstrap mode`);
    return [];
  }

  const data = await fs.readJson(legoPairsPath);
  const chunks = new Set();

  for (const seed of data.seeds) {
    const legos = seed[2];

    for (const lego of legos) {
      const targetChunk = lego[2];
      chunks.add(targetChunk);

      // Also add feeders if present
      const feeders = lego[4];
      if (feeders && feeders.length > 0) {
        for (const feeder of feeders) {
          chunks.add(feeder[2]);
        }
      }
    }
  }

  return Array.from(chunks);
}

/**
 * Analyze chunks using Haiku 4.5
 */
async function analyzeChunksWithHaiku(chunks, language, apiKey) {
  const client = new Anthropic({ apiKey });

  const prompt = `You are a linguistic analyst specializing in ${language} language structure.

Analyze the following ${language} word chunks for COMPOSABILITY - how well they combine with other words to form natural phrases.

Chunks to analyze:
${chunks.map((c, i) => `${i + 1}. "${c}"`).join('\n')}

For each chunk, provide:

1. **composability_score** (0-10): How naturally this chunk combines with other words
   - 10 = highly composable (rich edges, works in many contexts)
   - 5 = moderate (some limitations)
   - 0 = poor (rarely standalone, needs specific context)

2. **left_edges** (array): Common words/patterns that naturally PRECEDE this chunk
   Examples: verbs that take this as object, adjectives that modify it, etc.

3. **right_edges** (array): Common words/patterns that naturally FOLLOW this chunk
   Examples: adjectives, relative clauses, prepositional phrases, etc.

4. **standalone_frequency** (low/medium/high): How often this appears alone vs in larger phrases

5. **structural_notes**: Brief explanation (e.g., "needs article", "complete noun phrase", "verb + preposition")

6. **alternative_forms**: If this chunk has gender/number variants, list them

Output ONLY valid JSON in this exact format:
{
  "chunks": [
    {
      "chunk": "the chunk text",
      "composability_score": 8.5,
      "left_edges": ["word1", "word2"],
      "right_edges": ["word1", "word2"],
      "standalone_frequency": "high",
      "structural_notes": "explanation",
      "alternative_forms": ["variant1", "variant2"]
    }
  ]
}

Focus on PRACTICAL composability - what helps learners combine this chunk with other known vocabulary.`;

  console.log(`📡 Calling Haiku 4.5 for ${chunks.length} chunks...`);

  const response = await client.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 4096,
    temperature: 0,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  const content = response.content[0].text;

  try {
    const result = JSON.parse(content);
    return result.chunks;
  } catch (err) {
    console.error(`❌ Failed to parse Haiku response as JSON`);
    console.error('Response:', content);
    throw err;
  }
}

/**
 * Process all chunks in batches
 */
async function buildComposabilityGraph(chunks, language, apiKey) {
  const batches = [];
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    batches.push(chunks.slice(i, i + BATCH_SIZE));
  }

  console.log(`\n📊 Processing ${chunks.length} chunks in ${batches.length} batches`);
  console.log(`⚡ Using Haiku 4.5 (fast + economical)\n`);

  const allAnalyses = [];

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`Batch ${i + 1}/${batches.length} (${batch.length} chunks)...`);

    const analyses = await analyzeChunksWithHaiku(batch, language, apiKey);
    allAnalyses.push(...analyses);

    // Small delay to avoid rate limits
    if (i < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Build graph structure
  const graph = {
    language,
    generated: new Date().toISOString(),
    model: HAIKU_MODEL,
    total_chunks: allAnalyses.length,
    chunks: {}
  };

  for (const analysis of allAnalyses) {
    graph.chunks[analysis.chunk] = {
      composability_score: analysis.composability_score,
      left_edges: analysis.left_edges,
      right_edges: analysis.right_edges,
      standalone_frequency: analysis.standalone_frequency,
      structural_notes: analysis.structural_notes,
      alternative_forms: analysis.alternative_forms || []
    };
  }

  return graph;
}

/**
 * Main execution
 */
async function main() {
  const language = process.argv[2];

  if (!language) {
    console.error('Usage: node scripts/generate-composability-graph.cjs <language>');
    console.error('Example: node scripts/generate-composability-graph.cjs italian');
    process.exit(1);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('❌ ANTHROPIC_API_KEY environment variable not set');
    console.error('Set it with: export ANTHROPIC_API_KEY="your-key-here"');
    process.exit(1);
  }

  console.log(`\n🏗️  Building composability graph for: ${language}`);
  console.log(`${'='.repeat(80)}\n`);

  // Step 1: Extract chunks from existing course (if available)
  const courseCode = `${language.substring(0, 3)}_for_eng_10seeds`;
  console.log(`📚 Extracting chunks from course: ${courseCode}`);
  const chunks = await extractChunksFromCourse(courseCode);

  if (chunks.length === 0) {
    console.error('❌ No chunks found. Need at least one course to bootstrap from.');
    console.error('Generate a test course first, then run this script.');
    process.exit(1);
  }

  console.log(`✅ Found ${chunks.length} unique chunks\n`);

  // Step 2: Analyze with Haiku
  const graph = await buildComposabilityGraph(chunks, language, apiKey);

  // Step 3: Save graph
  const outputDir = path.join(__dirname, '..', 'vfs', 'language_graphs');
  await fs.ensureDir(outputDir);

  const outputPath = path.join(outputDir, `${language}_composability.json`);
  await fs.writeJson(outputPath, graph, { spaces: 2 });

  console.log(`\n${'='.repeat(80)}`);
  console.log('✅ COMPOSABILITY GRAPH GENERATED');
  console.log(`${'='.repeat(80)}\n`);
  console.log(`📁 Output: ${outputPath}`);
  console.log(`📊 Total chunks analyzed: ${graph.total_chunks}`);
  console.log(`🤖 Model used: ${HAIKU_MODEL}\n`);

  // Show sample entries
  console.log('Sample entries:');
  const sampleChunks = Object.keys(graph.chunks).slice(0, 3);
  for (const chunk of sampleChunks) {
    const data = graph.chunks[chunk];
    console.log(`\n  "${chunk}"`);
    console.log(`    Score: ${data.composability_score}/10`);
    console.log(`    Frequency: ${data.standalone_frequency}`);
    console.log(`    Notes: ${data.structural_notes}`);
  }

  console.log();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
