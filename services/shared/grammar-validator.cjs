/**
 * Grammar Validator - Uses Haiku to check English phrase naturalness
 *
 * This is a lightweight validation layer that runs after all other validations
 * (tiling, ZUT, vocabulary) pass. It catches grammar errors that slip through
 * because Opus was focused on constraint satisfaction.
 *
 * Examples of errors this catches:
 * - "She help me" → "She helps me" (3rd person -s)
 * - "to he" → "to him" (object pronouns)
 * - "before to go" → "before going" (gerund after preposition)
 * - "This make me happy" → "This makes me happy"
 */

const Anthropic = require('@anthropic-ai/sdk');

let anthropic = null;

function initClient() {
  if (!anthropic && process.env.ANTHROPIC_API_KEY) {
    anthropic = new Anthropic();
  }
  return anthropic;
}

/**
 * Validate English phrases for natural grammar
 *
 * @param {string[]} phrases - Array of English phrases to check
 * @returns {Promise<{valid: boolean, errors: Array<{phrase: string, issue: string, suggestion: string}>}>}
 */
async function validateGrammar(phrases) {
  const client = initClient();

  if (!client) {
    console.warn('[GrammarValidator] No API key - skipping grammar check');
    return { valid: true, errors: [], skipped: true };
  }

  if (!phrases || phrases.length === 0) {
    return { valid: true, errors: [] };
  }

  // Filter to only non-empty strings
  const validPhrases = phrases.filter(p => p && typeof p === 'string' && p.trim().length > 0);

  if (validPhrases.length === 0) {
    return { valid: true, errors: [] };
  }

  const prompt = `You are a grammar checker for a language learning app. Check these English phrases for grammar errors.

IMPORTANT: These phrases will be used to TEACH English to learners. Any grammar error will teach incorrect English.

Common errors to watch for:
1. Missing third-person singular -s: "She help" → "She helps", "He want" → "He wants"
2. Wrong pronouns after prepositions: "to he" → "to him", "with she" → "with her"
3. Wrong infinitive forms: "before to go" → "before going"
4. Subject-verb agreement: "This make" → "This makes", "My friend want" → "My friend wants"
5. Wrong tense: "Yesterday she help" → "Yesterday she helped"
6. Double negatives: "can't understand nothing" → "can't understand anything"

Phrases to check:
${validPhrases.map((p, i) => `${i + 1}. ${p}`).join('\n')}

For each phrase with an error, respond with JSON in this exact format:
{"errors": [{"index": 1, "phrase": "the phrase", "issue": "brief description", "suggestion": "corrected phrase"}]}

If ALL phrases are grammatically correct, respond with:
{"errors": []}

ONLY output the JSON, nothing else.`;

  try {
    const response = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content[0]?.text || '{"errors": []}';

    // Parse JSON response
    let result;
    try {
      // Handle potential markdown code blocks
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch (parseError) {
      console.warn('[GrammarValidator] Failed to parse response:', content);
      return { valid: true, errors: [], parseError: true };
    }

    const errors = (result.errors || []).map(e => ({
      phrase: e.phrase || validPhrases[e.index - 1],
      issue: e.issue,
      suggestion: e.suggestion
    }));

    return {
      valid: errors.length === 0,
      errors
    };

  } catch (apiError) {
    console.error('[GrammarValidator] API error:', apiError.message);
    return { valid: true, errors: [], apiError: apiError.message };
  }
}

/**
 * Validate a seed's USE phrases before insertion
 *
 * @param {Array} legos - Array of LEGO objects with 'use' arrays containing {target: string}
 * @returns {Promise<{valid: boolean, errors: Array}>}
 */
async function validateSeedPhrases(legos) {
  // Extract all English target phrases from USE arrays
  const allPhrases = [];

  for (const lego of legos) {
    if (lego.use && Array.isArray(lego.use)) {
      for (const phrase of lego.use) {
        if (phrase.target) {
          allPhrases.push(phrase.target);
        }
      }
    }
  }

  return validateGrammar(allPhrases);
}

module.exports = {
  validateGrammar,
  validateSeedPhrases
};
