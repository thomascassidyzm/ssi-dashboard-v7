#!/usr/bin/env node

/**
 * Generate Welcome Script
 *
 * Creates a welcome message for a specific course.
 * Uses Claude AI to generate appropriate welcome text based on course language pair.
 *
 * Usage: node scripts/generate-welcome.cjs <course_code>
 * Example: node scripts/generate-welcome.cjs ita_for_eng_10seeds
 */

const fs = require('fs-extra');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const welcomeService = require('../services/welcome-service.cjs');

require('dotenv').config();

const courseCode = process.argv[2];

if (!courseCode) {
  console.error('❌ Usage: node scripts/generate-welcome.cjs <course_code>');
  console.error('   Example: node scripts/generate-welcome.cjs ita_for_eng_10seeds');
  process.exit(1);
}

/**
 * Parse course code to extract language information
 * Format: <target>_for_<source>_<seeds>
 */
function parseCourseCode(courseCode) {
  const match = courseCode.match(/^([a-z]{3})_for_([a-z]{3})_(\d+)seeds$/);

  if (!match) {
    throw new Error(`Invalid course code format: ${courseCode}. Expected format: <lang>_for_<lang>_<seeds>`);
  }

  return {
    targetLang: match[1],
    sourceLang: match[2],
    seedCount: parseInt(match[3])
  };
}

/**
 * Get full language name from code
 */
function getLanguageName(code) {
  const names = {
    'eng': 'English',
    'ita': 'Italian',
    'fra': 'French',
    'spa': 'Spanish',
    'deu': 'German',
    'por': 'Portuguese',
    'cmn': 'Chinese',
    'jpn': 'Japanese',
    'kor': 'Korean',
    'gle': 'Irish',
    'mkd': 'Macedonian'
  };

  return names[code] || code.toUpperCase();
}

/**
 * Generate welcome text using Claude AI
 */
async function generateWelcomeText(targetLang, sourceLang, seedCount) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not found in environment variables');
  }

  const anthropic = new Anthropic({ apiKey });

  // Load template
  const templatePath = path.join(__dirname, '../vfs/canonical/eng_welcome_template.txt');
  const template = await fs.readFile(templatePath, 'utf-8');

  const targetLangName = getLanguageName(targetLang);
  const sourceLangName = getLanguageName(sourceLang);

  const prompt = `You are creating a welcome message for an SSi (SaySomethingIn) language learning course.

Course: ${targetLangName} for ${sourceLangName} speakers
Seeds: ${seedCount}
Language of welcome: ${sourceLangName} (the source/known language)

Base template (in English):
"${template}"

Please adapt this template for ${sourceLangName} speakers learning ${targetLangName}:

Requirements:
1. Write the welcome in ${sourceLangName} (NOT ${targetLangName})
2. Keep it warm, encouraging, and conversational
3. Mention the course (${targetLangName} for ${sourceLangName} speakers)
4. Keep it brief (aim for 30-60 seconds when spoken)
5. Emphasize the SSi method principles (speak out loud, don't worry about mistakes, build naturally)
6. Use informal "you" if the language has formal/informal distinction
7. Make it feel welcoming and exciting

Return ONLY the welcome text, no additional commentary.`;

  console.log('🤖 Generating welcome text using Claude...\n');

  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  const welcomeText = message.content[0].text.trim();

  console.log('Generated welcome:\n');
  console.log('─'.repeat(60));
  console.log(welcomeText);
  console.log('─'.repeat(60));
  console.log();

  return welcomeText;
}

/**
 * Main function
 */
async function main() {
  console.log(`\n📝 Generate Welcome for ${courseCode}\n`);

  try {
    // Parse course code
    const { targetLang, sourceLang, seedCount } = parseCourseCode(courseCode);

    console.log(`Target: ${getLanguageName(targetLang)}`);
    console.log(`Source: ${getLanguageName(sourceLang)}`);
    console.log(`Seeds: ${seedCount}\n`);

    // Check if welcome already exists
    const existing = await welcomeService.getWelcomeForCourse(courseCode);

    if (existing && existing.text) {
      console.log('⚠️  Welcome already exists for this course:\n');
      console.log('─'.repeat(60));
      console.log(existing.text);
      console.log('─'.repeat(60));
      console.log();

      // Ask if user wants to regenerate
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise(resolve => {
        rl.question('Regenerate? (y/n): ', resolve);
      });

      rl.close();

      if (answer.toLowerCase() !== 'y') {
        console.log('Cancelled.');
        return;
      }

      console.log();
    }

    // Generate welcome text
    const welcomeText = await generateWelcomeText(targetLang, sourceLang, seedCount);

    // Generate UUID
    const uuid = welcomeService.generateWelcomeUUID(courseCode, welcomeText);

    console.log(`UUID: ${uuid}\n`);

    // Save to registry
    await welcomeService.updateWelcomeRegistry(courseCode, {
      text: welcomeText,
      id: uuid,
      generated_date: new Date().toISOString(),
      voice: null,  // Will be set during audio generation
      duration: 0   // Will be set during audio generation
    });

    console.log(`✅ Welcome saved to registry`);
    console.log(`\nNext steps:`);
    console.log(`1. Run Phase 7 to include welcome in manifest`);
    console.log(`2. Run Phase 8 to generate welcome audio\n`);

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}\n`);
    process.exit(1);
  }
}

main();
