/**
 * Markdown parser for seed submissions.
 * Agents can submit in markdown format instead of JSON — fewer tokens, more natural.
 * Pure functions (no DB, no state).
 */

/**
 * Detect if request body is markdown format.
 */
function isMarkdownSubmission(req) {
  const contentType = req.get('Content-Type') || '';
  if (contentType.includes('text/markdown') || contentType.includes('text/plain')) {
    return true;
  }
  if (typeof req.body === 'string') {
    const trimmed = req.body.trim();
    return trimmed.startsWith('# Seed') || trimmed.startsWith('## L');
  }
  if (req.body?.markdown && typeof req.body.markdown === 'string') {
    return true;
  }
  return false;
}

/**
 * Parse markdown seed submission into structured format.
 *
 * Expected format:
 * ```
 * # Seed 42
 * Known: I want to speak German with you now.
 * Target: Ich will jetzt Deutsch mit dir sprechen.
 *
 * ## L1 [M] "I want" → "ich will"
 * Components: I → ich, want → will
 *
 * BUILD:
 * - I want → ich will
 * - I want to speak → ich will sprechen
 *
 * USE:
 * - I want to speak German → Ich will Deutsch sprechen [7]
 * - Do you want to speak? → Willst du sprechen? [8]
 *
 * ## L2 [A] "to speak" → "sprechen"
 * ...
 * ```
 */
function parseMarkdownSeed(markdown, courseCode) {
  const result = {
    course_code: courseCode,
    seed_number: null,
    known_text: null,
    target_text: null,
    legos: [],
    attestation: { semantic_match_verified: true },
  };

  const lines = markdown.split('\n').map(l => l.trim());

  // Parse seed header
  const seedHeaderMatch = lines.find(l => l.match(/^#\s*Seed\s+(\d+)/i));
  if (seedHeaderMatch) {
    const match = seedHeaderMatch.match(/^#\s*Seed\s+(\d+)/i);
    result.seed_number = parseInt(match[1]);
  }

  // Parse Known/Target lines
  for (const line of lines) {
    const knownMatch = line.match(/^Known:\s*(.+)$/i);
    if (knownMatch) result.known_text = knownMatch[1].trim();
    const targetMatch = line.match(/^Target:\s*(.+)$/i);
    if (targetMatch) result.target_text = targetMatch[1].trim();
  }

  // Split into LEGO sections by ## L headers
  const legoSections = markdown.split(/(?=##\s*L\d+)/);

  let legoIndex = 0;
  for (const section of legoSections) {
    const headerMatch = section.match(/^##\s*L(\d+)\s*\[([AM])\]\s*"([^"]+)"\s*(?:→|->|:)\s*"([^"]+)"/m);
    if (!headerMatch) continue;

    legoIndex++;
    const lego = {
      idx: parseInt(headerMatch[1]) || legoIndex,
      type: headerMatch[2].toUpperCase(),
      known: headerMatch[3].trim(),
      target: headerMatch[4].trim(),
      components: [],
      phrases: [],
    };

    // Parse components for M-type
    if (lego.type === 'M') {
      const componentsMatch = section.match(/Components?:\s*(.+)/i);
      if (componentsMatch) {
        const pairs = componentsMatch[1].split(/,\s*/);
        for (const pair of pairs) {
          const pairMatch = pair.match(/([^→\->:]+)\s*(?:→|->|:)\s*(.+)/);
          if (pairMatch) {
            lego.components.push({
              known: pairMatch[1].trim(),
              target: pairMatch[2].trim(),
            });
          }
        }
      }
    }

    // Parse BUILD and USE sections
    const buildMatch = section.match(/BUILD:\s*([\s\S]*?)(?=USE:|##|$)/i);
    const useMatch = section.match(/USE:\s*([\s\S]*?)(?=##|$)/i);

    const buildPhrases = [];
    const usePhrases = [];

    if (buildMatch) {
      const buildLines = buildMatch[1].split('\n');
      for (const line of buildLines) {
        const phraseMatch = line.match(/^[-*]\s*(.+?)\s*(?:→|->|:)\s*(.+?)(?:\s*\[(\d+)\])?\s*$/);
        if (phraseMatch) {
          buildPhrases.push({
            known: phraseMatch[1].trim(),
            target: phraseMatch[2].trim(),
          });
        }
      }
    }

    if (useMatch) {
      const useLines = useMatch[1].split('\n');
      for (const line of useLines) {
        const phraseMatch = line.match(/^[-*]\s*(.+?)\s*(?:→|->|:)\s*(.+?)(?:\s*\[(\d+)(?:\/(\d+))?\])?\s*$/);
        if (phraseMatch) {
          const phrase = {
            known: phraseMatch[1].trim(),
            target: phraseMatch[2].trim(),
          };
          if (phraseMatch[3]) {
            if (phraseMatch[4]) {
              phrase.known_score = parseInt(phraseMatch[3]);
              phrase.target_score = parseInt(phraseMatch[4]);
              phrase.score = Math.round((phrase.known_score + phrase.target_score) / 2);
            } else {
              phrase.score = parseInt(phraseMatch[3]);
              phrase.known_score = phrase.score;
              phrase.target_score = phrase.score;
            }
          }
          usePhrases.push(phrase);
        }
      }
    }

    lego.build = buildPhrases;
    lego.use = usePhrases;

    // Fallback: flat phrases list
    if (buildPhrases.length === 0 && usePhrases.length === 0) {
      const phrasesMatch = section.match(/(?:PHRASES?|Practice):\s*([\s\S]*?)(?=##|$)/i);
      if (phrasesMatch) {
        const phraseLines = phrasesMatch[1].split('\n');
        const flatPhrases = [];
        for (const line of phraseLines) {
          const phraseMatch = line.match(/^[-*]\s*(.+?)\s*(?:→|->|:)\s*(.+?)(?:\s*\[(\d+)(?:\/(\d+))?\])?\s*$/);
          if (phraseMatch) {
            const phrase = {
              known: phraseMatch[1].trim(),
              target: phraseMatch[2].trim(),
            };
            if (phraseMatch[3]) {
              if (phraseMatch[4]) {
                phrase.known_score = parseInt(phraseMatch[3]);
                phrase.target_score = parseInt(phraseMatch[4]);
                phrase.score = Math.round((phrase.known_score + phrase.target_score) / 2);
              } else {
                phrase.score = parseInt(phraseMatch[3]);
                phrase.known_score = phrase.score;
                phrase.target_score = phrase.score;
              }
            }
            flatPhrases.push(phrase);
          }
        }
        lego.phrases = flatPhrases;
      }
    }

    result.legos.push(lego);
  }

  return result;
}

/**
 * Extract markdown from request body (handles various formats).
 */
function extractMarkdown(req) {
  if (typeof req.body === 'string') return req.body;
  if (req.body?.markdown) return req.body.markdown;
  if (req.body?.content) return req.body.content;
  return null;
}

module.exports = {
  isMarkdownSubmission,
  parseMarkdownSeed,
  extractMarkdown,
};
