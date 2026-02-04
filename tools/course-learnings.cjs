#!/usr/bin/env node
/**
 * Course Learnings Manager
 *
 * Simple CLI to capture language-pair specific learnings in the database.
 * These learnings accumulate over time and inform future course builds.
 *
 * Usage:
 *   # Add a learning
 *   node tools/course-learnings.cjs add <course_code> <category> "<learning>"
 *
 *   # List learnings for a course
 *   node tools/course-learnings.cjs list <course_code>
 *
 *   # List all learnings across all courses
 *   node tools/course-learnings.cjs list-all
 *
 * Examples:
 *   node tools/course-learnings.cjs add eng_for_ara components "Arabic definite 'al-' should never map to English indefinite 'a'"
 *   node tools/course-learnings.cjs add eng_for_zho grammar "Aspect marker 着 is NOT equivalent to English 'to' - it marks continuous action"
 *   node tools/course-learnings.cjs list eng_for_ara
 *
 * Categories:
 *   - components: LEGO decomposition issues
 *   - grammar: Grammar marker handling
 *   - phrases: Practice phrase quality
 *   - vocabulary: Word choice issues
 *   - methodology: Overall approach learnings
 *   - cultural: Cultural/pragmatic considerations
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const VALID_CATEGORIES = ['components', 'grammar', 'phrases', 'vocabulary', 'methodology', 'cultural'];

async function addLearning(courseCode, category, learning, source = 'manual') {
  if (!VALID_CATEGORIES.includes(category)) {
    console.error(`Invalid category: ${category}`);
    console.error(`Valid categories: ${VALID_CATEGORIES.join(', ')}`);
    process.exit(1);
  }

  // Get current quality_rules
  const { data: course, error: fetchError } = await supabase
    .from('courses')
    .select('quality_rules')
    .eq('course_code', courseCode)
    .single();

  if (fetchError) {
    console.error(`Course not found: ${courseCode}`);
    process.exit(1);
  }

  // Initialize or update quality_rules
  const qualityRules = course.quality_rules || { learnings: [] };
  if (!qualityRules.learnings) {
    qualityRules.learnings = [];
  }

  // Add new learning
  const newLearning = {
    discovered: new Date().toISOString().split('T')[0],
    category,
    learning,
    source
  };

  qualityRules.learnings.push(newLearning);

  // Update database
  const { error: updateError } = await supabase
    .from('courses')
    .update({ quality_rules: qualityRules })
    .eq('course_code', courseCode);

  if (updateError) {
    console.error('Failed to update:', updateError.message);
    process.exit(1);
  }

  console.log(`\n✓ Added learning to ${courseCode}:`);
  console.log(`  Category: ${category}`);
  console.log(`  Learning: ${learning}`);
  console.log(`  Total learnings for this course: ${qualityRules.learnings.length}`);
}

async function listLearnings(courseCode) {
  const { data: course, error } = await supabase
    .from('courses')
    .select('course_code, quality_rules')
    .eq('course_code', courseCode)
    .single();

  if (error) {
    console.error(`Course not found: ${courseCode}`);
    process.exit(1);
  }

  const learnings = course.quality_rules?.learnings || [];

  console.log(`\n=== Learnings for ${courseCode} (${learnings.length}) ===\n`);

  if (learnings.length === 0) {
    console.log('No learnings recorded yet.');
    return;
  }

  // Group by category
  const byCategory = {};
  learnings.forEach(l => {
    if (!byCategory[l.category]) byCategory[l.category] = [];
    byCategory[l.category].push(l);
  });

  for (const [cat, items] of Object.entries(byCategory)) {
    console.log(`[${cat.toUpperCase()}]`);
    items.forEach(l => {
      console.log(`  • ${l.learning}`);
      console.log(`    (${l.discovered}, source: ${l.source})`);
    });
    console.log();
  }
}

async function listAllLearnings() {
  const { data: courses, error } = await supabase
    .from('courses')
    .select('course_code, quality_rules')
    .not('quality_rules', 'is', null);

  if (error) {
    console.error('Failed to fetch:', error.message);
    process.exit(1);
  }

  const coursesWithLearnings = courses.filter(c => c.quality_rules?.learnings?.length > 0);

  console.log(`\n=== All Course Learnings ===\n`);

  if (coursesWithLearnings.length === 0) {
    console.log('No learnings recorded for any course yet.');
    return;
  }

  for (const course of coursesWithLearnings) {
    const learnings = course.quality_rules.learnings;
    console.log(`\n--- ${course.course_code} (${learnings.length} learnings) ---`);

    learnings.forEach(l => {
      console.log(`  [${l.category}] ${l.learning}`);
    });
  }
}

async function exportForPrompt(courseCode) {
  // Export learnings in a format suitable for including in an agent prompt
  const { data: course, error } = await supabase
    .from('courses')
    .select('course_code, known_lang, target_lang, quality_rules')
    .eq('course_code', courseCode)
    .single();

  if (error || !course) {
    return null;
  }

  const learnings = course.quality_rules?.learnings || [];
  if (learnings.length === 0) return null;

  let prompt = `## Language-Pair Specific Learnings for ${courseCode}\n\n`;
  prompt += `These learnings were discovered from previous course builds and QA. Apply them:\n\n`;

  const byCategory = {};
  learnings.forEach(l => {
    if (!byCategory[l.category]) byCategory[l.category] = [];
    byCategory[l.category].push(l.learning);
  });

  for (const [cat, items] of Object.entries(byCategory)) {
    prompt += `### ${cat.charAt(0).toUpperCase() + cat.slice(1)}\n`;
    items.forEach(item => {
      prompt += `- ${item}\n`;
    });
    prompt += '\n';
  }

  return prompt;
}

// CLI
const [,, command, ...args] = process.argv;

switch (command) {
  case 'add':
    if (args.length < 3) {
      console.log('Usage: node tools/course-learnings.cjs add <course_code> <category> "<learning>" [source]');
      console.log(`Categories: ${VALID_CATEGORIES.join(', ')}`);
      process.exit(1);
    }
    addLearning(args[0], args[1], args[2], args[3] || 'manual');
    break;

  case 'list':
    if (args.length < 1) {
      console.log('Usage: node tools/course-learnings.cjs list <course_code>');
      process.exit(1);
    }
    listLearnings(args[0]);
    break;

  case 'list-all':
    listAllLearnings();
    break;

  case 'export':
    if (args.length < 1) {
      console.log('Usage: node tools/course-learnings.cjs export <course_code>');
      process.exit(1);
    }
    exportForPrompt(args[0]).then(prompt => {
      if (prompt) {
        console.log(prompt);
      } else {
        console.log('No learnings found for this course.');
      }
    });
    break;

  default:
    console.log(`
Course Learnings Manager

Commands:
  add <course_code> <category> "<learning>" [source]
      Add a learning to a course

  list <course_code>
      List all learnings for a course

  list-all
      List learnings across all courses

  export <course_code>
      Export learnings in prompt-ready format

Categories: ${VALID_CATEGORIES.join(', ')}

Examples:
  node tools/course-learnings.cjs add eng_for_ara components "Arabic 'al-' is definite, never map to English 'a'"
  node tools/course-learnings.cjs add eng_for_zho grammar "着 is aspect marker, not infinitive 'to'"
  node tools/course-learnings.cjs list eng_for_ara
`);
}
