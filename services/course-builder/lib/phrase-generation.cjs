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
const { scoreSet } = require(path.join(__dirname, '../../../tools/phrase-lab/score.cjs'));
const { makeCourseCtx, checkPhraseSet, failureFeedback } = require(path.join(__dirname, '../../../tools/phrase-gate/gate-check.cjs'));
const { computeDeclaration, checkDeclaration, recordDeclaration, frameSection } =
  require(path.join(__dirname, '../../../tools/frame-layer/declaration.cjs'));

/**
 * THE GATE IS A PRECONDITION, NOT AN INSTRUCTION. Tom's ruling on A-294,
 * 2026-08-28: "we should be doing is making sure that we do have the gate on
 * these, so they can't even come to me without having passed the gate
 * conditions, whatever ones we kept, as well as have the new scoring."
 *
 * So every generated set is run through the real /api/seed/complete gates
 * (tools/phrase-gate/gate-check.cjs) and the scorer (tools/phrase-lab/score.cjs)
 * before this function returns. A failing set is REGENERATED with its own
 * failures quoted back to the model — not returned with a warning, because a
 * warning is a thing a downstream sampler can ignore, and the whole point of
 * the ruling is that nothing ungated reaches a human.
 *
 * If it still fails after the retries, it comes back `blocked: true` carrying
 * its failure list. Blocked and named is honest; blocked and silently dropped
 * is not, so the caller gets the set and the reasons and must decide — and a
 * doc-builder showing sets to Tom shows only `gate.overallPass`.
 *
 * The retries are capped at 2 because each one is a full Opus call: the third
 * failure of the same LEGO is a fact about the LEGO or the inventory, not bad
 * luck, and burning more tokens on it buys a worse answer than telling someone.
 */
const MAX_GATE_RETRIES = 2;

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
        // The model's own frame claim rides along so the declaration check can
        // AUDIT it against the matchers — it is never trusted as a fact.
        ...(p.frame ? { frame: String(p.frame).trim() } : {}),
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
/**
 * The retry prompt: the original brief, then the set the model just wrote, then
 * the gate's own words about what is wrong with it. The failures are quoted
 * verbatim from the gate rather than paraphrased — a paraphrase is where a
 * frame error gets introduced, and the model needs the offending phrase, not a
 * description of the category it belongs to.
 */
function retryPrompt(basePrompt, phrases, reasons) {
  return [
    basePrompt,
    '',
    '---',
    '',
    '## Your previous attempt was REFUSED by the gate',
    '',
    'This is not a style note. These phrases cannot be submitted as they stand.',
    'Rewrite the whole set. Keep what was fine, replace what is named below.',
    '',
    '### What you wrote',
    '',
    ...phrases.build.map((p) => `- BUILD: ${p.known} → ${p.target}`),
    ...phrases.use.map((p) => `- USE: ${p.known} → ${p.target}`),
    '',
    '### Why it was refused',
    '',
    ...reasons.map((r) => `- ${r}`),
    '',
    'Return the same JSON shape as before, and nothing else.',
  ].join('\n');
}

async function generateLegoPhrases(supabase, courseCode, seedNumber, legoIndex, opts = {}) {
  const { timeout = DEFAULT_TIMEOUT_MS, proposedLego, gate: runGate = true } = opts;
  const { prompt: basePrompt, inventory, lego, seed } = await buildPrompt(supabase, courseCode, seedNumber, Number(legoIndex), { proposedLego });

  // THE DECLARATION, computed and RECORDED before the model is called (Tom's
  // acceptance condition, 2026-09-05). It states the derived teaching job, the
  // frame pool this basket can instantiate, the split sides this LEGO admits
  // and the floors in force — and it is the QA spec everything downstream
  // judges against. For a non-English known side it says `applicable:false`
  // honestly and the door behaves exactly as it did before frames existed.
  // If it cannot be computed at all the generation still runs — a missing
  // declaration is reported, never a reason to refuse phrases.
  let declaration = null;
  let declarationPath = null;
  try {
    declaration = await computeDeclaration(supabase, courseCode, seedNumber, Number(legoIndex), { proposedLego });
    declarationPath = recordDeclaration(declaration);
  } catch (e) {
    declaration = { declares: false, applicable: false, reason: `declaration failed: ${e.message}` };
  }

  // The prompt is a MERGE, not a replacement: the v3 prompt keeps the computed
  // AVAILABLE/BLOCKED inventory and the doctrine; the declaration adds the
  // frame pool and the basket brief. Same object in the prompt and in QA, so
  // the two cannot drift apart.
  const prompt = basePrompt + frameSection(declaration);

  const started = Date.now();
  const gateCtx = runGate ? makeCourseCtx(supabase, courseCode) : null;
  const attempts = [];
  let phrases = null;
  let gate = null;
  let score = null;
  let declarationCheck = null;
  let currentPrompt = prompt;

  for (let attempt = 0; attempt <= (runGate ? MAX_GATE_RETRIES : 0); attempt += 1) {
    const raw = await claudeChat(currentPrompt, { model: PHRASE_MODEL, timeout, thinkingTokens: THINKING_TOKENS });
    phrases = normalise(parseModelJson(raw));
    if (!runGate) break;

    gate = await checkPhraseSet({
      courseCode,
      seedNumber,
      legoIndex: Number(legoIndex),
      legoId: lego.lego_id,
      legoKnown: lego.known_text,
      legoTarget: lego.target_text,
      components: lego.components,
      build: phrases.build,
      use: phrases.use,
    }, gateCtx);

    // The scorer is the second half of "the gate conditions ... as well as the
    // new scoring". It never blocks on its own — its shortfalls are named and
    // travel with the set — but its gate axis (a phrase the learner cannot
    // produce from their own prompt) is fed into the retry alongside the real
    // gates' failures, because that is the same defect seen from the other side.
    try {
      score = scoreSet(inventory, [
        ...phrases.build.map((p) => ({ ...p, role: 'build' })),
        ...phrases.use.map((p) => ({ ...p, role: 'use' })),
      ]);
    } catch (e) {
      score = { error: e.message };
    }

    // THE DECLARATION CHECK — did this batch instantiate what it declared?
    // Pure re-derivation from the matchers; the model's per-phrase frame tags
    // are audited, never believed. Its shortfalls join the retry exactly as
    // gate failures do, each carrying its own rewrite instruction — the tool
    // that satisfies this gate is the frame section merged into the prompt
    // above, shipped in the same commit (Tom's ruling on gates and tools).
    declarationCheck = checkDeclaration(declaration, [
      ...phrases.build.map((p) => ({ phrase_role: 'build', known_text: p.known, target_text: p.target, frame: p.frame })),
      ...phrases.use.map((p) => ({ phrase_role: 'use', known_text: p.known, target_text: p.target, frame: p.frame })),
    ]);
    const declPass = !declarationCheck.checked || declarationCheck.pass;

    const reasons = [
      ...failureFeedback(gate),
      ...(declPass ? [] : declarationCheck.rewrite_instructions),
    ];
    attempts.push({ attempt: attempt + 1, overallPass: gate.overallPass && declPass,
                    failingGates: gate.failingGates,
                    declarationFloors: declarationCheck.checked ? declarationCheck.floor_failures : null,
                    reasons });
    if (gate.overallPass && declPass) break;
    if (attempt === MAX_GATE_RETRIES) break;
    currentPrompt = retryPrompt(prompt, phrases, reasons);
  }

  const blocked = runGate
    ? !(gate.overallPass && (!declarationCheck || !declarationCheck.checked || declarationCheck.pass))
    : false;

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
    // The verdict travels WITH the set. A downstream sampler or doc-builder can
    // then only show what carries a pass, without re-deriving anything.
    gate,
    score,
    // The declaration IS the QA spec: what this batch was built to instantiate,
    // recorded before the model was called, and the mechanical verdict on
    // whether it did. `declarationPath` is where the record lives on disk,
    // keyed by the deterministic lego id, surviving regeneration.
    declaration,
    declarationCheck,
    declarationPath,
    blocked,
    attempts,
  };
}

module.exports = {
  PHRASE_MODEL,
  THINKING_TOKENS,
  MAX_GATE_RETRIES,
  generateLegoPhrases,
  parseModelJson,
  normalise,
  buildPhrasePrompt: buildPrompt,
};
