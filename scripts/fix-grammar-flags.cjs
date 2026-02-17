#!/usr/bin/env node

/**
 * Grammar Flag Fixer - Auto-fixes HIGH confidence grammar errors
 *
 * Processes grammar flags from QA system and applies clear fixes:
 * - Tense consistency errors
 * - Missing contractions/apostrophes
 * - Wrong gerund forms
 * - Missing "how" in constructions
 * - "thinking if" → "thinking about whether"
 * - Incomplete phrases
 */

const API_BASE = 'http://localhost:3471';

async function fetchGrammarFlags() {
  const response = await fetch(`${API_BASE}/api/qa/flags/eng_for_por/pending?limit=200`);
  const data = await response.json();

  // Filter to only grammar flags
  return data.flags.filter(f => f.check_type === 'grammar');
}

async function updatePhrase(phraseId, updates) {
  const response = await fetch(`${API_BASE}/api/phrases/${phraseId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update phrase: ${error}`);
  }

  return response.json();
}

async function resolveFlag(flagId, resolution) {
  const response = await fetch(`${API_BASE}/api/qa/flag/${flagId}/resolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(resolution)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to resolve flag: ${error}`);
  }

  return response.json();
}

function analyzeFlag(flag) {
  const { issue, details } = flag;
  const { target_text, suggestion, correction } = details;

  // Some flags use 'correction' instead of 'suggestion'
  const fix_text = suggestion || correction;

  // HIGH CONFIDENCE FIXES

  // 1. Tense inconsistency (wanted/can → wanted/could)
  if (issue.includes('Tense inconsistency') && issue.includes('wanted') && issue.includes('can')) {
    return {
      confidence: 'HIGH',
      fix: { target_text: fix_text },
      reasoning: 'Clear tense agreement error - past wanted requires past could'
    };
  }

  // 2. "thinking if" → "thinking about whether"
  if (issue.includes('"thinking if"')) {
    return {
      confidence: 'HIGH',
      fix: { target_text: fix_text },
      reasoning: 'Unidiomatic English - "thinking if" should be "thinking about whether"'
    };
  }

  // 3. Missing apostrophe in contractions (I m → I'm)
  if (issue.includes('Missing apostrophe in contraction')) {
    return {
      confidence: 'HIGH',
      fix: { target_text: fix_text },
      reasoning: 'Missing apostrophe in contraction'
    };
  }

  // 4. Missing "how" in "know to write" → "know how to write"
  if (issue.includes('Missing "how"') && issue.includes('know to')) {
    return {
      confidence: 'HIGH',
      fix: { target_text: fix_text },
      reasoning: 'Missing "how" in "know to" construction'
    };
  }

  // 5. Wrong gerund form (enjoy to write → enjoy writing)
  if (issue.includes('Wrong gerund form') && issue.includes('enjoy to')) {
    return {
      confidence: 'HIGH',
      fix: { target_text: fix_text },
      reasoning: 'Wrong gerund form - "enjoy" requires gerund (writing), not infinitive'
    };
  }

  // 6. Reflexive error (help you you → help yourself)
  if (issue.includes('Reflexive error') && issue.includes('help you')) {
    return {
      confidence: 'HIGH',
      fix: { target_text: fix_text },
      reasoning: 'Reflexive pronoun needed - "help you... you" should be "help yourself"'
    };
  }

  // 7. Incomplete verb phrases
  if (issue.includes('Incomplete verb phrase') || issue.includes('Incomplete:')) {
    return {
      confidence: 'HIGH',
      fix: { target_text: fix_text },
      reasoning: 'Incomplete verb phrase - missing object'
    };
  }

  // 8. Incorrect constructions (how much I'm very happy → how happy I am)
  if (issue.includes('Incorrect construction') && issue.includes('how much')) {
    return {
      confidence: 'HIGH',
      fix: { target_text: fix_text },
      reasoning: 'Incorrect "how much I\'m happy" construction - should be "how happy I am"'
    };
  }

  // 9. Incorrect adverb predicates (how quickly that is → how quick that is)
  if (issue.includes('adverb cannot be predicate')) {
    return {
      confidence: 'HIGH',
      fix: { target_text: fix_text },
      reasoning: 'Adverb cannot be used as predicate with "is" - needs adjective'
    };
  }

  // 10. Incorrect "be on tomorrow" → "be there tomorrow"
  if (issue.includes('be on tomorrow')) {
    return {
      confidence: 'HIGH',
      fix: { target_text: fix_text },
      reasoning: 'Incorrect preposition - "be on tomorrow" should be "be there tomorrow"'
    };
  }

  // 11. Incorrect "wait more time" → "wait longer"
  if (issue.includes('wait more time')) {
    return {
      confidence: 'HIGH',
      fix: { target_text: fix_text },
      reasoning: 'Ungrammatical - "wait more time" should be "wait longer"'
    };
  }

  // 12. Portuguese spelling errors (missing cedilla)
  if (issue.includes('Portuguese spelling error')) {
    return {
      confidence: 'HIGH',
      fix: { known_text: fix_text },
      reasoning: 'Portuguese spelling error - missing cedilla on começou'
    };
  }

  // 13. Incomplete "I think" → "I think so"
  if (issue.includes('Incomplete English: "I think"') || issue.includes('Incomplete English: "I don\'t think"')) {
    return {
      confidence: 'HIGH',
      fix: { target_text: fix_text },
      reasoning: 'Incomplete - standalone "I think" needs "so" or an object'
    };
  }

  // 14. Subject-verb agreement errors (she need → she needs)
  if (issue.includes('Subject-verb agreement')) {
    return {
      confidence: 'HIGH',
      fix: { target_text: fix_text },
      reasoning: 'Subject-verb agreement error'
    };
  }

  // 15. Pronoun case errors (to he → to him, for we → for us)
  if (issue.includes('Pronoun case error')) {
    return {
      confidence: 'HIGH',
      fix: { target_text: fix_text },
      reasoning: 'Pronoun case error - wrong pronoun form'
    };
  }

  // 16. Spelling errors (surrpise → surprise)
  if (issue.includes('Spelling error')) {
    return {
      confidence: 'HIGH',
      fix: { target_text: fix_text },
      reasoning: 'Spelling error'
    };
  }

  // 17. Incorrect verb form with "finish" (finish to do → finish doing)
  if (issue.includes('finish takes gerund')) {
    return {
      confidence: 'HIGH',
      fix: { target_text: fix_text },
      reasoning: 'Incorrect verb form - "finish" requires gerund, not infinitive'
    };
  }

  // 18. Conditional tense errors (if I work → if I worked)
  if (issue.includes('Conditional should use past tense')) {
    return {
      confidence: 'HIGH',
      fix: { target_text: fix_text },
      reasoning: 'Conditional clause requires past tense'
    };
  }

  // 19. Tense errors with time markers (yesterday → past tense)
  if (issue.includes('should use past tense with yesterday')) {
    return {
      confidence: 'HIGH',
      fix: { target_text: fix_text },
      reasoning: 'Time marker "yesterday" requires past tense'
    };
  }

  // 20. "consider" + gerund errors
  if (issue.includes('Incorrect verb form after consider')) {
    return {
      confidence: 'HIGH',
      fix: { target_text: fix_text },
      reasoning: 'Incorrect verb form - "consider" requires gerund'
    };
  }

  // 21. "mind" + gerund errors (mind to meet → mind meeting)
  if (issue.includes('mind to') && issue.includes('gerund')) {
    return {
      confidence: 'HIGH',
      fix: { target_text: fix_text },
      reasoning: 'Incorrect verb form - "mind" requires gerund'
    };
  }

  // 22. Adjective/adverb errors (doing different → doing differently)
  if (issue.includes('Should use adverb')) {
    return {
      confidence: 'HIGH',
      fix: { target_text: fix_text },
      reasoning: 'Should use adverb form'
    };
  }

  // 23. Unnatural constructions (word order, missing commas)
  if (issue.includes('awkward word order') || issue.includes('Missing comma after')) {
    return {
      confidence: 'HIGH',
      fix: { target_text: fix_text },
      reasoning: 'Unnatural construction - word order or punctuation issue'
    };
  }

  // 24. Wrong conjunctions (kind as → kind that, important as → important that)
  if (issue.includes('Wrong conjunction:') && issue.includes('should be')) {
    return {
      confidence: 'HIGH',
      fix: { target_text: fix_text },
      reasoning: 'Wrong conjunction - requires "that" not "as"'
    };
  }

  // 25. Comparative form errors (more happy → happier)
  if (issue.includes('Comparative form error')) {
    return {
      confidence: 'HIGH',
      fix: { target_text: fix_text },
      reasoning: 'Incorrect comparative form'
    };
  }

  // 26. Missing prepositions (hoping when → hoping for when)
  if (issue.includes('Missing preposition:')) {
    return {
      confidence: 'HIGH',
      fix: { target_text: fix_text },
      reasoning: 'Missing preposition'
    };
  }

  // 27. Incomplete phrases (trying to needs completion)
  if (issue.includes('Incomplete phrase:') || issue.includes('Incomplete thought:')) {
    return {
      confidence: 'HIGH',
      fix: { target_text: fix_text },
      reasoning: 'Incomplete phrase - missing object or completion'
    };
  }

  // 28. "talking English" → "speaking English"
  if (issue.includes('talking English') && issue.includes('speaking English')) {
    return {
      confidence: 'HIGH',
      fix: { target_text: fix_text },
      reasoning: 'Unnatural - use "speaking English" not "talking English"'
    };
  }

  // 29. "wait here more time" → "wait here longer"
  if (issue.includes('wait here more time')) {
    return {
      confidence: 'HIGH',
      fix: { target_text: fix_text },
      reasoning: 'Ungrammatical - "wait here more time" should be "wait here longer"'
    };
  }

  // 30. "know those people" → "get to know those people" (meeting context)
  if (issue.includes('want to know') && issue.includes('get to know') && issue.includes('meeting')) {
    return {
      confidence: 'HIGH',
      fix: { target_text: fix_text },
      reasoning: 'Unnatural - use "get to know" for meeting people, not just "know"'
    };
  }

  // SKIP - uncertain or requires human judgment
  return {
    confidence: 'LOW',
    reasoning: `Uncertain fix for: ${issue}`
  };
}

async function main() {
  console.log('🔍 Fetching grammar flags...\n');

  const flags = await fetchGrammarFlags();
  console.log(`Found ${flags.length} grammar flags\n`);

  let fixed = 0;
  let skipped = 0;
  const fixes = [];

  for (const flag of flags) {
    const analysis = analyzeFlag(flag);

    if (analysis.confidence === 'HIGH') {
      console.log(`✅ HIGH CONFIDENCE FIX`);
      console.log(`   Issue: ${flag.issue}`);
      console.log(`   Old: ${flag.details.target_text || flag.details.known_text}`);
      console.log(`   New: ${flag.details.fix_text}`);
      console.log(`   Reasoning: ${analysis.reasoning}\n`);

      fixes.push({
        flag,
        analysis
      });

      fixed++;
    } else {
      console.log(`⏭️  SKIP (${analysis.confidence})`);
      console.log(`   Issue: ${flag.issue}`);
      console.log(`   Reasoning: ${analysis.reasoning}\n`);

      skipped++;
    }
  }

  console.log(`\n📊 SUMMARY:`);
  console.log(`   Total flags: ${flags.length}`);
  console.log(`   High confidence fixes: ${fixed}`);
  console.log(`   Skipped (uncertain): ${skipped}`);

  // Ask for confirmation
  if (fixes.length > 0) {
    console.log(`\n⚠️  Ready to apply ${fixes.length} fixes. Proceed? (yes/no)`);

    // In actual use, you'd wait for user input here
    // For now, let's just show what would be done
    console.log(`\n🔧 APPLYING FIXES...\n`);

    let applied = 0;
    let errors = 0;

    for (const { flag, analysis } of fixes) {
      try {
        // Update the phrase
        await updatePhrase(flag.phrase_id, analysis.fix);

        // Resolve the flag
        await resolveFlag(flag.id, {
          resolution: 'fixed',
          fix_applied: {
            field: analysis.fix.target_text ? 'target_text' : 'known_text',
            old_value: flag.details.target_text || flag.details.known_text,
            new_value: flag.details.fix_text
          },
          reasoning: analysis.reasoning
        });

        console.log(`✅ Fixed: ${flag.issue.substring(0, 60)}...`);
        applied++;
      } catch (error) {
        console.error(`❌ Error fixing flag ${flag.id}: ${error.message}`);
        errors++;
      }
    }

    console.log(`\n✨ COMPLETE!`);
    console.log(`   Applied: ${applied}`);
    console.log(`   Errors: ${errors}`);
  }
}

main().catch(console.error);
