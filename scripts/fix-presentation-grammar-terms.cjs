#!/usr/bin/env node

/**
 * Fix Grammar Term Jargon in Presentation Text
 *
 * Replaces grammar jargon like "(possessive)", "question particle", etc.
 * with natural, functional explanations.
 *
 * Usage: node scripts/fix-presentation-grammar-terms.cjs <manifest-path>
 * Example: node scripts/fix-presentation-grammar-terms.cjs public/vfs/courses/cmn_for_eng/course_manifest.json
 */

const fs = require('fs-extra');
const path = require('path');

// =============================================================================
// REPLACEMENT RULES
// =============================================================================

// Exact replacements (case-sensitive)
const EXACT_REPLACEMENTS = {
  // Question particles
  'question particle': 'makes it a question',
  '(question particle)': 'makes it a question',
  '(question)': 'makes it a question',
  '[question particle]': 'makes it a question',
  'ma (question particle)': 'makes it a question',

  // Completion/aspect markers (了)
  'aspect particle': 'indicates completion',
  '(aspect particle)': 'indicates completion',
  '[aspect particle]': 'indicates completion',
  '(aspect marker)': 'indicates completion',
  '[aspect marker]': 'indicates completion',
  'aspect marker': 'indicates completion',
  'completion marker': 'indicates completion',
  '(completion marker)': 'indicates completion',
  '[completion marker]': 'indicates completion',
  'completed action particle': 'indicates completion',
  '(completion)': 'indicates completion',
  '(completion particle)': 'indicates completion',
  'perfective aspect': 'indicates completion',
  '(perfective aspect)': 'indicates completion',
  '(perfective)': 'indicates completion',
  '(completed state)': 'shows it is done',
  '(completed action)': 'indicates completion',
  'past marker': 'indicates past action',
  'past tense marker': 'indicates past action',
  'past tense particle': 'indicates past action',
  'change of state': 'shows a change',
  '(change of state)': 'shows a change',
  'change of state particle': 'shows a change',
  'le (change of state)': 'shows a change',
  '(completed change)': 'shows a change',
  '[state particle]': 'shows a change',
  'exclamation particle': 'adds emphasis',

  // Possessive markers (的)
  '(possessive)': 'indicates possession',
  'possessive': 'indicates possession',
  'possessive marker': 'indicates possession',
  '(possessive marker)': 'indicates possession',
  'possessive particle': 'indicates possession',
  '的 (possessive)': 'indicates possession',
  '[possessive marker]': 'indicates possession',
  '[possessive particle]': 'indicates possession',

  // Nominalizer (的)
  '(nominalizer)': 'turns it into a noun',
  'nominalizer': 'turns it into a noun',
  '(de-nominalizer)': 'turns it into a noun',
  'de (nominalizer)': 'turns it into a noun',
  '的 (nominalizer)': 'turns it into a noun',

  // Relative clause markers (的)
  '(relative clause marker)': 'links description',
  'relative clause marker': 'links description',
  '[relative clause marker]': 'links description',
  '的 (relative clause marker)': 'links description',
  'de (relative clause marker)': 'links description',
  '(relative marker)': 'links description',
  '[relative marker]': 'links description',
  'relative marker': 'links description',

  // Attributive/modifier markers (的)
  'attributive marker': 'describes what follows',
  '(attributive marker)': 'describes what follows',
  '(attributive)': 'describes what follows',
  '(modifier)': 'modifies what follows',
  'modifier': 'modifies what follows',
  '(modifier marker)': 'modifies what follows',
  '[modifier marker]': 'modifies what follows',
  '(modifier particle)': 'modifies what follows',
  '(de-modifier)': 'modifies what follows',
  'de (modifier)': 'modifies what follows',
  'emphasis marker': 'adds emphasis',
  '(adjective marker)': 'makes it descriptive',

  // Complement markers (得)
  'complement marker': 'links to how well',
  '(complement marker)': 'links to how well',
  '得 (complement marker)': 'links to how well',
  'de (complement marker)': 'links to how well',
  '(resultative marker)': 'shows the result',
  'result marker': 'shows the result',
  '[result complement]': 'shows the result',
  'degree complement marker': 'shows to what degree',
  '(resultative complement)': 'shows the result',

  // Progressive markers (在, 正在)
  '(progressive marker)': 'shows ongoing action',
  'progressive marker': 'shows ongoing action',
  '[progressive marker]': 'shows ongoing action',
  '(progressive)': 'shows ongoing action',
  '(progressive aspect)': 'shows ongoing action',
  'am (progressive)': 'am',
  'were (progressive)': 'were',
  'was (in process of)': 'was in the middle of',

  // Experiential markers (过)
  '(experiential)': 'shows past experience',
  '(experiential aspect)': 'shows past experience',
  'experience aspect': 'shows past experience',
  '(past experience marker)': 'shows past experience',
  'past experience marker': 'shows past experience',

  // Measure words/classifiers (个, 件, 本, etc.)
  'classifier': '',  // Remove - phrase demonstrates it
  '(classifier)': '',
  '[classifier]': '',
  '(measure word)': '',
  'measure word': '',
  '[measure word]': '',
  '[measure word for books]': 'for books',
  '[measure word for horses]': 'for horses',
  '(measure word for long things)': 'for long things',
  '(measure word for flat objects)': 'for flat things',
  'a (measure word)': 'a',
  'one (counter)': 'one',
  'a [classifier]': 'a',
  'MW': '',  // Remove
  'CL:film': 'for films',

  // BA construction (把)
  '[ba-marker]': 'marks the object',
  '(ba construction)': 'marks the object',
  'BA': 'marks the object',
  'disposal marker': 'marks what is affected',
  '(BA marker)': 'marks the object',
  'object marker': 'marks the object',
  'ba-construction marker': 'marks the object',
  'measure word for chair': '',  // Wrong - remove

  // Adverbial markers (地)
  '(adverbial marker)': 'shows how it is done',
  'adverb marker': 'shows how it is done',

  // Continuous aspect (着)
  'continuous aspect marker': 'shows ongoing state',
  'durative aspect marker': 'shows continuing action',

  // Suggestion particle (吧)
  'suggestion particle': 'makes it a suggestion',
  '(suggestion particle)': 'makes it a suggestion',

  // Noun suffix (子)
  '(noun suffix)': '',  // Remove - word demonstrates it

  // Conditional markers
  '(conditional marker)': 'makes it conditional',
  'if (conditional marker)': 'if',
  '(conditional)': 'makes it conditional',

  // Time markers
  '(time marker)': 'marks the time',
  '(when-marker)': 'when',
  'when (start)': 'when',
  'when (end)': 'when',
  'when marker': 'when',
  'since (temporal frame ending)': 'since',

  // Passive marker
  '(passive marker)': 'marks passive voice',

  // Emphasis
  '(emphasis)': 'adds emphasis',

  // Plural
  '(plural)': 'plural',
  'plural classifier': 'plural marker',

  // Softener
  '(softener)': '',  // Remove

  // Negative potential
  '(negative potential)': 'indicates inability',

  // Compound/ambiguous de explanations - simplify to most common usage
  '(indicates possession, or modifies what follows)': 'indicates possession',
  '(indicates possession, or descriptive )': 'indicates possession',
  '(indicates possession or modifies what follows)': 'indicates possession',

  // Relative clause 'that'
  '(that)': 'that',

  // Body/person reference
  '(person, or body)': 'on someone',
  '(person or body)': 'on someone',

  // Complement for 为
  '(complement)': '',  // Remove - context shows usage

  // Clause with trailing space
  '(clause )': '',  // Remove malformed
  '(clause)': '',

  // Generic particle labels - context dependent, try to handle
  'particle': '',  // Remove generic label
  '(particle)': '',
  '[particle]': '',
  '(marker)': '',
  '[marker]': '',
  'marker': '',
  '(de)': '',  // Remove
  'DE': '',
  'LE': '',
  'ZHI': '',
  'ZHE': '',

  // Action clarifications - integrate
  'park (car)': 'park a car',
  'move (house)': 'move house',
  'finish (drinking)': 'finish drinking',
  'love (each other)': 'love each other',
  'much (more)': 'much more',
  'to see (past)': 'saw',
  "can't (reach by seeing)": "can't reach",
  '(kind of)': 'kind of',
  '(each other)': 'each other',
  'to (prep)': 'to',
};

// Patterns to clean up (regex-based)
const PATTERN_REPLACEMENTS = [
  // Remove empty parentheses that might result from replacements
  [/\(\s*\)/g, ''],
  // Remove double spaces
  [/\s{2,}/g, ' '],
  // Remove trailing commas before end of component list
  [/,\s*$/g, ''],
  // Clean up "means ," to "means"
  [/means\s*,/g, 'means'],
  // Clean up "means  " (double space after means)
  [/means\s{2,}/g, 'means '],
  // Remove "means " at end (when meaning was removed entirely)
  [/means\s*$/g, ''],
  // Clean up orphaned {target1}'X' means patterns with no meaning
  [/\{target1\}'[^']+'\s+means\s*(?=,|\s*$)/g, ''],
];

// =============================================================================
// MAIN PROCESSING
// =============================================================================

function applyReplacements(text) {
  if (!text) return text;

  let result = text;
  let changesMade = [];

  // Apply exact replacements (longest first to avoid partial matches)
  const sortedKeys = Object.keys(EXACT_REPLACEMENTS).sort((a, b) => b.length - a.length);

  for (const key of sortedKeys) {
    if (result.includes(key)) {
      const replacement = EXACT_REPLACEMENTS[key];
      const before = result;
      result = result.split(key).join(replacement);
      if (result !== before) {
        changesMade.push(`"${key}" → "${replacement}"`);
      }
    }
  }

  // Apply pattern-based cleanups
  for (const [pattern, replacement] of PATTERN_REPLACEMENTS) {
    result = result.replace(pattern, replacement);
  }

  // Final trim
  result = result.trim();

  return { text: result, changes: changesMade };
}

async function fixManifest(manifestPath) {
  console.log(`\n[Fix Grammar Terms] Loading manifest: ${manifestPath}\n`);

  if (!await fs.pathExists(manifestPath)) {
    throw new Error(`Manifest not found: ${manifestPath}`);
  }

  const manifest = await fs.readJson(manifestPath);

  let totalPresentations = 0;
  let modifiedPresentations = 0;
  let totalChanges = 0;
  const allChanges = [];

  // Process all presentations
  manifest.slices.forEach(slice => {
    slice.seeds.forEach(seed => {
      seed.introduction_items.forEach(item => {
        if (item.presentation) {
          totalPresentations++;
          const { text: newText, changes } = applyReplacements(item.presentation);

          if (newText !== item.presentation) {
            modifiedPresentations++;
            totalChanges += changes.length;

            if (changes.length > 0) {
              allChanges.push({
                id: item.id,
                known: item.node?.known?.text,
                changes: changes,
                before: item.presentation.substring(0, 100),
                after: newText.substring(0, 100)
              });
            }

            item.presentation = newText;
          }
        }
      });
    });
  });

  // Backup original
  const backupPath = manifestPath + '.backup-before-grammar-fix';
  await fs.copy(manifestPath, backupPath);
  console.log(`[Fix Grammar Terms] Backup saved to: ${backupPath}`);

  // Write updated manifest
  await fs.writeJson(manifestPath, manifest, { spaces: 2 });

  console.log(`\n[Fix Grammar Terms] ✅ Processing complete!`);
  console.log(`[Fix Grammar Terms]    Total presentations: ${totalPresentations}`);
  console.log(`[Fix Grammar Terms]    Modified: ${modifiedPresentations}`);
  console.log(`[Fix Grammar Terms]    Total replacements: ${totalChanges}`);

  // Show sample changes
  if (allChanges.length > 0) {
    console.log(`\n[Fix Grammar Terms] Sample changes (first 10):\n`);
    allChanges.slice(0, 10).forEach((change, i) => {
      console.log(`${i + 1}. ${change.known}`);
      console.log(`   Changes: ${change.changes.join(', ')}`);
      console.log(`   Before: ${change.before}...`);
      console.log(`   After:  ${change.after}...`);
      console.log();
    });
  }

  // Check for remaining parentheses
  let remainingParens = 0;
  manifest.slices.forEach(slice => {
    slice.seeds.forEach(seed => {
      seed.introduction_items.forEach(item => {
        if (item.presentation && item.presentation.includes('(')) {
          remainingParens++;
        }
      });
    });
  });

  console.log(`[Fix Grammar Terms] Remaining presentations with parentheses: ${remainingParens}`);

  return {
    totalPresentations,
    modifiedPresentations,
    totalChanges,
    remainingParens
  };
}

// CLI
if (require.main === module) {
  const manifestPath = process.argv[2] || 'public/vfs/courses/cmn_for_eng/course_manifest.json';

  fixManifest(manifestPath)
    .then(result => {
      console.log(`\n[Fix Grammar Terms] Done!`);
      process.exit(0);
    })
    .catch(error => {
      console.error(`[Fix Grammar Terms] Error: ${error.message}`);
      process.exit(1);
    });
}

module.exports = { fixManifest, applyReplacements };
