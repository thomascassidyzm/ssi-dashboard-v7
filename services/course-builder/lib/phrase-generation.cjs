/**
 * PHRASE GENERATION — the v3 prompt, on Opus, as the single tier.
 *
 * This is the production door for BUILD/USE phrase writing. It is the same
 * assembler the phrase lab measured (`tools/phrase-lab/build-prompt.cjs`),
 * called against the same per-seed inventory, so what ships is the artefact
 * that was tested rather than a re-typed cousin of it.
 *
 * WHY IN CODE RATHER THAN IN A BRIEF. The value of v3 is not its prose — it is
 * the computed AVAILABLE / BLOCKED inventory that makes the ZUT gate decidable
 * instead of guessed (the muy/bien rule, `tools/phrase-lab/inventory.cjs`). A
 * builder agent free-typing from a markdown brief cannot compute that table, so
 * a brief-only wiring would ship v3's sentences without v3's gate.
 *
 * MODEL: OPUS, SINGLE TIER. Tom's ruling, 2026-08-27, on the six-language
 * replication (`docs/course-optimization/phrase-lab-2026-08-27/SYNTHESIS.md`):
 * across 98 comparable LEGOs Opus 5 left 56 sets per 100 needing no human at
 * all against Sonnet 5's 22, and every call in this estate runs on the flat-rate
 * subscription, so the two arms cost the same zero dollars. There is no cheaper
 * tier to fall back to and no mixed-tier split to build — a fallback here would
 * silently reintroduce the arm the experiment rejected.
 *
 * ALL LLM CALLS GO THROUGH THE CLAUDE CLI, never the Anthropic SDK (estate rule;
 * a past SDK module silently billed ~$38/day).
 */

const path = require('path');
const os = require('os');
const { claudeChat } = require('../../shared/claude-cli.cjs');

// The CLI lives in ~/.local/bin. The course-builder systemd unit puts it on PATH;
// a shell, a cron job or a test harness that requires this module directly does
// not, and the failure is an ENOENT from execFile that reads like a model outage
// rather than a missing binary. Same guard the phrase lab carries.
const LOCAL_BIN = path.join(os.homedir(), '.local', 'bin');
if (!String(process.env.PATH || '').split(path.delimiter).includes(LOCAL_BIN)) {
  process.env.PATH = `${LOCAL_BIN}${path.delimiter}${process.env.PATH || ''}`;
}

const { buildPrompt } = require(path.join(__dirname, '../../../tools/phrase-lab/build-prompt.cjs'));

/**
 * The single tier. Not a default with an override: an override is a fallback,
 * and a fallback is the mixed-tier setup the ruling removed.
 */
const PHRASE_MODEL = 'opus';

/**
 * Extended thinking is ON, unlike the CLI wrapper's default of 0. That default
 * is right for the deterministic translation-flex work it was built for; this
 * is genuinely generative authoring, and the lab arms that produced the ruling
 * were all run with it on. Running production with it off would ship a
 * handicapped Opus under the name of the one that was measured.
 */
const THINKING_TOKENS = 10000;

/** A generation call spends its time waiting on the API, not computing. */
const DEFAULT_TIMEOUT_MS = 600000;

/** Parse the model's reply. Tolerates a code fence and stray prose either side. */
function parseModelJson(raw) {
  let s = String(raw || '').trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  const i = s.indexOf('{');
  const j = s.lastIndexOf('}');
  if (i === -1 || j === -1) throw new Error(`no JSON object in model output (first 200 chars: ${s.slice(0, 200)})`);
  return JSON.parse(s.slice(i, j + 1));
}

/**
 * Model output -> the submission shape used by POST /api/v2/phrases and by the
 * seed/complete markdown. Tolerant about shape, strict about content: a row
 * without both sides is dropped rather than submitted half-formed.
 *
 * `tiles` is carried through. It is the phrase showing its work — the thing that
 * makes the ZUT gate and the edge count exact rather than guessed — and it is
 * what a downstream checker adjudicates against.
 */
function normalise(parsed) {
  const out = { build: [], use: [] };
  for (const role of ['build', 'use']) {
    for (const p of parsed[role] || []) {
      if (!p || !p.known || !p.target) continue;
      out[role].push({
        known: String(p.known).trim(),
        target: String(p.target).trim(),
        tiles: (p.tiles || []).map((t) => ({ known: t.known, target: t.target, legoId: t.legoId })),
      });
    }
  }
  return out;
}

/**
 * Generate the BUILD + USE set for ONE LEGO.
 *
 * Returns the phrases and the model that actually produced them — the caller
 * records the model rather than assuming it, so "did this run on Opus?" is
 * answerable from the output and not only from the source.
 *
 * Writes nothing. Submission and validation stay where they already are
 * (POST /api/v2/phrases, POST /api/seed/complete), so the floors, the tiling
 * gate, the vocabulary gate and ZUT all run on this output exactly as they ran
 * on the last builder's.
 */
async function generateLegoPhrases(supabase, courseCode, seedNumber, legoIndex, opts = {}) {
  const { timeout = DEFAULT_TIMEOUT_MS, proposedLego } = opts;
  const { prompt, lego, seed } = await buildPrompt(supabase, courseCode, seedNumber, Number(legoIndex), { proposedLego });

  const started = Date.now();
  const raw = await claudeChat(prompt, {
    model: PHRASE_MODEL,
    timeout,
    thinkingTokens: THINKING_TOKENS,
  });
  const phrases = normalise(parseModelJson(raw));

  return {
    courseCode,
    seedNumber,
    legoIndex: Number(legoIndex),
    legoId: lego.lego_id,
    legoKnown: lego.known_text,
    legoTarget: lego.target_text,
    seedKnown: seed?.known_text || null,
    seedTarget: seed?.target_text || null,
    model: PHRASE_MODEL,
    promptChars: prompt.length,
    elapsedMs: Date.now() - started,
    build: phrases.build,
    use: phrases.use,
  };
}

module.exports = {
  PHRASE_MODEL,
  THINKING_TOKENS,
  generateLegoPhrases,
  parseModelJson,
  normalise,
  buildPhrasePrompt: buildPrompt,
};
