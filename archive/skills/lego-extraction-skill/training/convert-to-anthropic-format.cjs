#!/usr/bin/env node

/**
 * Convert SSi Training Dataset to Anthropic Fine-Tuning Format
 *
 * Purpose: Transform our training examples into JSONL format for Claude fine-tuning
 *
 * Input: generation-1/*.json (training examples with input/output/reasoning)
 * Output: anthropic-training.jsonl + anthropic-validation.jsonl
 *
 * Format: https://docs.anthropic.com/en/docs/fine-tuning
 */

const fs = require('fs');
const path = require('path');

const SYSTEM_PROMPT = `You are an expert at extracting LEGO pairs from language learning translations.

You follow two critical rules:

1. FD (Functionally Deterministic): Learner sees known chunk → knows exactly ONE target response
   - No ambiguity allowed
   - Articles without nouns FAIL FD
   - Gender-ambiguous words without context FAIL FD

2. FCFS (First Come First Served): First occurrence of known chunk claims the mapping
   - Subsequent occurrences with different targets must chunk up with more context
   - This prevents learner confusion

You classify LEGOs as:
- BASE: Atomic, cannot be broken down further
- COMPOSITE: Multi-part with pedagogical value, includes componentization
- FEEDER: Component extracted from COMPOSITE parent

Always provide reasoning for your extraction decisions.`;

/**
 * Convert single training example to Anthropic format
 */
function convertExample(example) {
  // Build user message
  const userMessage = `Extract LEGO pairs from this translation:

**Seed:** ${example.input.seed_id}
**Target Language:** ${example.input.context.target_language}
**Known Language:** ${example.input.context.known_language}

**Target:** ${example.input.target}
**Known:** ${example.input.known}

Task: ${example.input.task}

${example.input.incorrect_output ? `\n**NOTE:** Previous attempt extracted incorrectly. Learn from the correct extraction below.\n` : ''}`;

  // Build assistant response
  const assistantResponse = `LEGO Extraction:

**LEGO ID:** ${example.output.lego_id || example.output.feeder_id || 'N/A'}
**Type:** ${example.output.lego_type}
**Target Chunk:** ${example.output.target_chunk}
**Known Chunk:** ${example.output.known_chunk}
${example.output.componentization ? `**Componentization:** ${example.output.componentization}\n` : ''}
**Reasoning:**
${example.reasoning}

${example.metadata?.error_type ? `\n**Correction Type:** ${example.metadata.error_type}\nThis example teaches the model to avoid ${example.metadata.error_type} errors.\n` : ''}`;

  return {
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: userMessage
      },
      {
        role: 'assistant',
        content: assistantResponse
      }
    ]
  };
}

/**
 * Load all training examples
 */
function loadTrainingExamples() {
  const generationDir = path.join(__dirname, 'generation-1');
  const files = fs.readdirSync(generationDir)
    .filter(f => f.endsWith('.json') && f !== 'manifest.json');

  const allExamples = [];

  for (const file of files) {
    const filePath = path.join(generationDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    console.log(`📄 Loading ${file}: ${data.examples.length} examples`);

    allExamples.push(...data.examples);
  }

  return allExamples;
}

/**
 * Split dataset into training and validation
 */
function splitDataset(examples, validationRatio = 0.1) {
  // Shuffle examples
  const shuffled = [...examples].sort(() => Math.random() - 0.5);

  const validationSize = Math.floor(examples.length * validationRatio);
  const validation = shuffled.slice(0, validationSize);
  const training = shuffled.slice(validationSize);

  return { training, validation };
}

/**
 * Write JSONL file
 */
function writeJSONL(examples, outputPath) {
  const lines = examples.map(ex => JSON.stringify(convertExample(ex)));
  fs.writeFileSync(outputPath, lines.join('\n'));
}

/**
 * Main execution
 */
function main() {
  console.log('🔄 Converting SSi Training Dataset to Anthropic Format\n');
  console.log('═'.repeat(70));

  // Load examples
  const allExamples = loadTrainingExamples();
  console.log(`\n✅ Loaded ${allExamples.length} total examples\n`);

  // Split dataset
  const { training, validation } = splitDataset(allExamples, 0.1);

  console.log('📊 Dataset Split:');
  console.log(`   Training: ${training.length} examples (${((training.length / allExamples.length) * 100).toFixed(1)}%)`);
  console.log(`   Validation: ${validation.length} examples (${((validation.length / allExamples.length) * 100).toFixed(1)}%)\n`);

  // Write JSONL files
  const outputDir = path.join(__dirname, 'anthropic-format');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const trainingPath = path.join(outputDir, 'training.jsonl');
  const validationPath = path.join(outputDir, 'validation.jsonl');

  writeJSONL(training, trainingPath);
  writeJSONL(validation, validationPath);

  console.log('💾 Output Files:');
  console.log(`   ${trainingPath}`);
  console.log(`   ${validationPath}\n`);

  // Calculate file sizes
  const trainingSize = (fs.statSync(trainingPath).size / 1024).toFixed(2);
  const validationSize = (fs.statSync(validationPath).size / 1024).toFixed(2);

  console.log('📈 File Sizes:');
  console.log(`   Training: ${trainingSize} KB`);
  console.log(`   Validation: ${validationSize} KB\n`);

  // Sample first example
  console.log('🔍 Sample Training Example (first entry):');
  console.log('─'.repeat(70));
  const sample = convertExample(training[0]);
  console.log(`System: ${sample.system.substring(0, 100)}...`);
  console.log(`\nUser:\n${sample.messages[0].content.substring(0, 200)}...`);
  console.log(`\nAssistant:\n${sample.messages[1].content.substring(0, 200)}...\n`);

  console.log('═'.repeat(70));
  console.log('✅ Conversion Complete!');
  console.log('\n🎯 Next Steps:');
  console.log('   1. Review training.jsonl format');
  console.log('   2. Upload to Anthropic fine-tuning API');
  console.log('   3. Trigger fine-tuning job');
  console.log('   4. Monitor training progress');
  console.log('   5. Test fine-tuned model vs base model\n');
}

if (require.main === module) {
  main();
}

module.exports = { convertExample, splitDataset };
