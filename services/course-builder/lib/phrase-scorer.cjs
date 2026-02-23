/**
 * Phrase scoring via Claude Haiku — shared by seed-complete and preflight routes.
 */

const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic();

// ─── Thresholds ──────────────────────────────────────────────────────────────

const PHRASE_FLOOR = 5;    // Any phrase scoring ≤ this → FAIL
const LEGO_AVG_MIN = 7;    // Average per LEGO must be ≥ this

// ─── Scoring via Claude Haiku ────────────────────────────────────────────────

async function scoreUsePhrases(seedNumber, knownText, targetText, legos) {
  const phraseList = [];
  for (const lego of legos) {
    const usePhrases = lego.use || [];
    for (const phrase of usePhrases) {
      phraseList.push({
        lego_id: lego.idx,
        lego_known: lego.known,
        lego_target: lego.target,
        known: phrase.known || phrase.known_text,
        target: phrase.target || phrase.target_text,
      });
    }
  }

  if (phraseList.length === 0) {
    return [];
  }

  const prompt = `You are a language-learning quality assessor for the SSi (SaySomethingin) method.

The learner is learning the TARGET language. The seed translation being practised is:
  English: "${knownText}"
  Target:  "${targetText}"

Score each USE phrase below on four dimensions (1–3 each, max 12 total):
1. Naturalness EN — would a fluent English speaker say this naturally?
2. Naturalness TL — would a fluent speaker of the target language say this naturally?
3. Value — is this a real, useful thing to learn to say? (not mechanical padding)
4. Variety — does this add something different from the other phrases in the same LEGO group?

Phrase types for variety: question, negation, conditional, different-subject, temporal-clause, etc.
Mechanical padding = adverbs/adjectives tacked on without changing meaning or structure.

Return ONLY a JSON array (no markdown, no explanation) with one object per phrase:
[
  {
    "lego_id": <number>,
    "known": "<English phrase>",
    "target": "<target phrase>",
    "naturalness_en": 1-3,
    "naturalness_tl": 1-3,
    "value": 1-3,
    "variety": 1-3,
    "score": <sum 1-12>,
    "feedback": "<one sentence, actionable if score < 8>"
  }
]

Phrases to score:
${JSON.stringify(phraseList, null, 2)}`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].text.trim();
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error('No JSON array found in Haiku response');
  return JSON.parse(match[0]);
}

// ─── Apply thresholds ────────────────────────────────────────────────────────

function applyThresholds(legos, scoredPhrases) {
  const byLego = {};
  for (const sp of scoredPhrases) {
    if (!byLego[sp.lego_id]) byLego[sp.lego_id] = [];
    byLego[sp.lego_id].push(sp);
  }

  const legoResults = [];
  let seedPass = true;
  const failReasons = [];

  for (const lego of legos) {
    const phrases = byLego[lego.idx] || [];
    if (phrases.length === 0) {
      legoResults.push({ lego_id: `L${lego.idx}`, pass: true, avg_score: null, phrases: [], note: 'no USE phrases' });
      continue;
    }

    const scores = phrases.map(p => p.score);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

    const floorFail = phrases.filter(p => p.score <= PHRASE_FLOOR);
    const avgFail = avg < LEGO_AVG_MIN;

    const legoPass = floorFail.length === 0 && !avgFail;
    if (!legoPass) {
      seedPass = false;
      if (floorFail.length > 0) failReasons.push(`L${lego.idx}: ${floorFail.length} phrase(s) at or below floor (${PHRASE_FLOOR}/12)`);
      if (avgFail) failReasons.push(`L${lego.idx}: avg score ${avg.toFixed(1)} < ${LEGO_AVG_MIN}`);
    }

    legoResults.push({
      lego_id: `L${lego.idx}`,
      pass: legoPass,
      avg_score: parseFloat(avg.toFixed(1)),
      phrases: phrases.map(p => ({
        known: p.known,
        target: p.target,
        score: p.score,
        feedback: p.feedback,
      })),
    });
  }

  return { seedPass, legoResults, failReasons };
}

module.exports = { scoreUsePhrases, applyThresholds, PHRASE_FLOOR, LEGO_AVG_MIN };
