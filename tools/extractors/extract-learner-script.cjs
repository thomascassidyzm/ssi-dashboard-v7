#!/usr/bin/env node
/**
 * Extract Learner Script to Markdown
 *
 * Generates a human-readable markdown file representing the actual
 * learner journey through a course's seeds. This is what agents should
 * analyze for pedagogical quality - not raw database queries.
 *
 * Usage:
 *   node tools/extractors/extract-learner-script.cjs <course_code> [seed_start] [seed_end]
 *
 * Examples:
 *   node tools/extractors/extract-learner-script.cjs deu_for_eng
 *   node tools/extractors/extract-learner-script.cjs deu_for_eng 1 50
 *   node tools/extractors/extract-learner-script.cjs zho_for_eng 1 10
 *
 * Output:
 *   temp/learner-scripts/<course_code>_seeds_<start>-<end>.md
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function extractLearnerScript(courseCode, seedStart = 1, seedEnd = 50) {
  console.log(`Extracting learner script for ${courseCode} (seeds ${seedStart}-${seedEnd})...`);

  // Fetch seeds
  const { data: seeds, error: seedsError } = await supabase
    .from('course_seeds')
    .select('seed_number, known_text, target_text')
    .eq('course_code', courseCode)
    .gte('seed_number', seedStart)
    .lte('seed_number', seedEnd)
    .order('seed_number');

  if (seedsError) throw new Error(`Seeds fetch error: ${seedsError.message}`);

  // Fetch LEGOs
  const { data: legos, error: legosError } = await supabase
    .from('course_legos')
    .select('*')
    .eq('course_code', courseCode)
    .gte('seed_number', seedStart)
    .lte('seed_number', seedEnd)
    .order('seed_number')
    .order('lego_index');

  if (legosError) throw new Error(`LEGOs fetch error: ${legosError.message}`);

  // Fetch phrases
  const { data: phrases, error: phrasesError } = await supabase
    .from('course_practice_phrases')
    .select('*')
    .eq('course_code', courseCode)
    .gte('seed_number', seedStart)
    .lte('seed_number', seedEnd)
    .order('seed_number')
    .order('lego_index');

  if (phrasesError) throw new Error(`Phrases fetch error: ${phrasesError.message}`);

  // Build the markdown
  let md = `# ${courseCode} - Learner Script\n\n`;
  md += `Seeds ${seedStart}-${seedEnd} | Generated ${new Date().toISOString().split('T')[0]}\n\n`;
  md += `---\n\n`;

  // Statistics
  const totalLegos = legos.length;
  const newLegos = legos.filter(l => l.is_new).length;
  const totalPhrases = phrases.length;

  md += `## Overview\n\n`;
  md += `| Metric | Value |\n`;
  md += `|--------|-------|\n`;
  md += `| Seeds | ${seeds.length} |\n`;
  md += `| Total LEGOs | ${totalLegos} |\n`;
  md += `| New LEGOs | ${newLegos} |\n`;
  md += `| Reused LEGOs | ${totalLegos - newLegos} |\n`;
  md += `| Total Phrases | ${totalPhrases} |\n`;
  md += `\n---\n\n`;

  // Track round number across the entire course
  let globalRound = 0;

  // Process each seed
  for (const seed of seeds) {
    md += `## SEED ${seed.seed_number}\n\n`;
    md += `**Known:** "${seed.known_text}"\n\n`;
    md += `**Target:** "${seed.target_text}"\n\n`;

    // Get LEGOs for this seed
    const seedLegos = legos.filter(l => l.seed_number === seed.seed_number);

    if (seedLegos.length === 0) {
      md += `*No LEGOs defined for this seed*\n\n`;
      md += `---\n\n`;
      continue;
    }

    // Process each LEGO as a round
    for (const lego of seedLegos) {
      globalRound++;

      const legoId = `S${String(seed.seed_number).padStart(4, '0')}L${String(lego.lego_index).padStart(2, '0')}`;
      const legoLabel = lego.is_new ? 'NEW' : 'REVIEW';
      const typeLabel = lego.type === 'M' ? 'M-LEGO' : 'A-LEGO';

      md += `### R${globalRound} - ${legoId} [${typeLabel}] [${legoLabel}]\n\n`;
      md += `**${lego.known_text}** = **${lego.target_text}**\n\n`;

      // Show components for M-LEGOs
      if (lego.type === 'M' && lego.components && lego.components.length > 0) {
        md += `Components:\n`;
        for (const comp of lego.components) {
          md += `- ${comp.known} → ${comp.target}\n`;
        }
        md += `\n`;
      }

      // Get phrases for this LEGO
      const legoPhrases = phrases.filter(p =>
        p.seed_number === seed.seed_number &&
        p.lego_index === lego.lego_index
      );

      if (legoPhrases.length === 0) {
        md += `*No practice phrases*\n\n`;
      } else {
        // Group phrases by role and organize
        const intro = legoPhrases.filter(p => p.phrase_role === 'intro');
        const legoPhrase = legoPhrases.filter(p => p.phrase_role === 'lego');
        const components = legoPhrases.filter(p => p.phrase_role === 'component');
        const build = legoPhrases.filter(p => p.phrase_role === 'build');
        const practice = legoPhrases.filter(p => p.phrase_role === 'practice');
        const consolidate = legoPhrases.filter(p => p.phrase_role === 'consolidate');
        const use = legoPhrases.filter(p => p.phrase_role === 'use');

        // Output in learning order
        if (intro.length > 0) {
          md += `**INTRO:**\n`;
          intro.forEach(p => md += `- ${p.known_text} → ${p.target_text}\n`);
          md += `\n`;
        }

        if (legoPhrase.length > 0) {
          md += `**LEGO:**\n`;
          legoPhrase.forEach(p => md += `- ${p.known_text} → ${p.target_text}\n`);
          md += `\n`;
        }

        if (components.length > 0) {
          md += `**COMPONENTS:**\n`;
          components.forEach(p => md += `- ${p.known_text} → ${p.target_text}\n`);
          md += `\n`;
        }

        // BUILD: could be 'build' or 'practice' role depending on course
        const buildPhrases = build.length > 0 ? build : practice;
        if (buildPhrases.length > 0) {
          md += `**BUILD:**\n`;
          buildPhrases.forEach((p, i) => md += `- BUILD-${i + 1}: ${p.known_text} → ${p.target_text}\n`);
          md += `\n`;
        }

        if (consolidate.length > 0) {
          md += `**CONSOLIDATE:**\n`;
          consolidate.forEach((p, i) => md += `- CONSOLIDATE-${i + 1}: ${p.known_text} → ${p.target_text}\n`);
          md += `\n`;
        }

        if (use.length > 0) {
          md += `**USE:**\n`;
          use.forEach((p, i) => md += `- USE-${i + 1}: ${p.known_text} → ${p.target_text}\n`);
          md += `\n`;
        }
      }
    }

    md += `---\n\n`;
  }

  // Summary at the end
  md += `## Summary Statistics\n\n`;
  md += `| Seed | LEGOs | New | Phrases |\n`;
  md += `|------|-------|-----|--------|\n`;

  for (const seed of seeds) {
    const seedLegos = legos.filter(l => l.seed_number === seed.seed_number);
    const seedPhrases = phrases.filter(p => p.seed_number === seed.seed_number);
    const newCount = seedLegos.filter(l => l.is_new).length;
    md += `| ${seed.seed_number} | ${seedLegos.length} | ${newCount} | ${seedPhrases.length} |\n`;
  }

  md += `\n---\n\n`;
  md += `*Generated by extract-learner-script.cjs*\n`;

  return md;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node extract-learner-script.cjs <course_code> [seed_start] [seed_end]');
    console.log('Example: node extract-learner-script.cjs deu_for_eng 1 50');
    process.exit(1);
  }

  const courseCode = args[0];
  const seedStart = parseInt(args[1]) || 1;
  const seedEnd = parseInt(args[2]) || 50;

  try {
    const markdown = await extractLearnerScript(courseCode, seedStart, seedEnd);

    // Ensure output directory exists
    const outputDir = path.join(process.cwd(), 'temp', 'learner-scripts');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write file
    const filename = `${courseCode}_seeds_${seedStart}-${seedEnd}.md`;
    const outputPath = path.join(outputDir, filename);
    fs.writeFileSync(outputPath, markdown);

    console.log(`\nScript extracted successfully!`);
    console.log(`Output: ${outputPath}`);
    console.log(`\nTo view: cat "${outputPath}" | head -200`);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
