/**
 * BUILD-phrase escalation — regenerate a lego's rejected BUILD phrases with a
 * stronger model after repeated anti-template gate rejections (3 strikes).
 *
 * Part of the template-stamp fix (docs/course-optimization/
 * build-phrase-template-stamp-audit-2026-07-24.md). NOTE: this predates the
 * 2026-08-27 ruling that phrase generation runs on Opus as the single tier, so
 * it is no longer an ESCALATION in model terms — it is a re-roll of a stuck
 * basket with a different, failure-aware prompt, at the same tier the builder
 * already runs at. All LLM calls go through the Claude CLI (claude-cli.cjs) —
 * never the SDK.
 */

const { claudeChat } = require('../../shared/claude-cli.cjs');
const { getLanguageName } = require('./language-config.cjs');

/**
 * Build the regeneration prompt for one lego's BUILD basket.
 *
 * @param {object} p
 * @param {string} p.courseCode
 * @param {object} p.lego - {known, target}
 * @param {Array}  p.usePhrases - this lego's USE phrases [{known, target}]
 * @param {Array}  p.priorPairs - previously-introduced legos [{known, target}], introduction order
 * @param {number} p.need - how many BUILD phrases to produce
 * @param {Array}  [p.rejected] - previously rejected attempts [{target, class}]
 */
function buildEscalationPrompt({ courseCode, lego, usePhrases, priorPairs, need, rejected }) {
  const targetName = getLanguageName(courseCode) || 'the target language';
  // Most recent material recombines best — cap the list, keep the tail.
  const pairs = priorPairs.length > 400 ? priorPairs.slice(-400) : priorPairs;
  const vocabLines = pairs.map(p => `- ${p.known} → ${p.target}`).join('\n');
  const useLines = (usePhrases || []).map(p => `- ${p.known} → ${p.target}`).join('\n');
  const rejectedLines = (rejected || []).slice(0, 8).map(r => `- "${r.target}" (${r.class || 'rejected'})`).join('\n');

  return `You are an SSi course author writing BUILD practice phrases in ${targetName}.

THE NEW LEGO (must appear whole, unmodified, in every phrase):
  ${lego.known} → ${lego.target}

BUILD phrase rules (ralph-methodology):
- Each BUILD phrase = the new LEGO plugging into PREVIOUSLY-INTRODUCED material below. Fragments are fine, but they must be extensible into full natural sentences.
- Use ONLY whole chunks from the introduced vocabulary list — no new words, no re-conjugation, no invented fillers.
- NEVER the bare LEGO alone. NEVER the LEGO (or a USE phrase) with a short tacked-on tag like ", yes / , here / , again / , please" — that is the template-stamp defect you are fixing.
- Do not duplicate any USE phrase below.
- One known prompt → one target form (ZUT). The known side may be slightly stilted as long as it tiles from known glosses.
- No parentheses or explanations anywhere.

INTRODUCED VOCABULARY (introduction order, known → target):
${vocabLines}

THIS LEGO'S USE PHRASES (do not duplicate their stems):
${useLines || '(none)'}
${rejectedLines ? `\nREJECTED ATTEMPTS (do not repeat these shapes):\n${rejectedLines}` : ''}

Produce exactly ${need} BUILD phrases. Respond with ONLY a JSON array, no prose:
[{"known": "...", "target": "..."}]`;
}

/** Parse the model's JSON reply (tolerates code fences / stray prose). */
function parseBuildReply(text) {
  if (!text) return null;
  const m = text.match(/\[[\s\S]*\]/);
  if (!m) return null;
  try {
    const arr = JSON.parse(m[0]);
    if (!Array.isArray(arr)) return null;
    return arr.filter(p => p && typeof p.known === 'string' && typeof p.target === 'string' && p.known.trim() && p.target.trim());
  } catch (_) {
    return null;
  }
}

/**
 * Regenerate BUILD phrases for one lego via the Claude CLI.
 * Returns [{known, target}] or null on failure. Caller re-validates through
 * the same gates — escalation output gets no special trust.
 */
async function escalateBuildPhrases(params, { model = 'opus', timeout = 180000 } = {}) {
  const prompt = buildEscalationPrompt(params);
  const reply = await claudeChat(prompt, { model, timeout });
  return parseBuildReply(reply);
}

module.exports = { escalateBuildPhrases, buildEscalationPrompt, parseBuildReply };
