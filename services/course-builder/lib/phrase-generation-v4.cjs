/**
 * PHRASE v4, ONE LEGO AT A TIME — the door builders call (job #544; Tom 2026-10-14,
 * r-2026-10-14-phrase-v4-is-the-phrase-builder: "phrase v4 is THE phrase builder").
 *
 * v4's objective (Tom 2026-10-02): the learner meets as many of the canon frames as the
 * course makes available, by putting each NEW LEGO "in concert with" taught material
 * that carries the frame — walking back through the network — and variety is bought with
 * frames the learner owns, never with a stapled opener ("thank you,", "of course"…). Since
 * Tom's ruling of 2026-11-05 the pod frames are offered too, and an interjection may appear
 * when it is already admitted for the basket, earning no frame.
 * tools/frame-layer/v4/generate-v4.cjs does that over a window of seeds, offline. This
 * is the same objective for the ONE basket a builder is writing right now, served from
 * Popty so the builder's call is a URL change from v3.
 *
 * It rides generateLegoPhrases (phrase-generation.cjs) rather than copying it: the same
 * not-new refusal (P25), the same structural stop, the same Opus call, the same real gates
 * (tiling, vocabulary, ZUT, containment, floors), the same scorer and the same retries. What
 * v4 adds, through the two seams that function exposes:
 *   - frameSectionFn: v4's walk-back brief (frames available by this seed + the taught
 *     chunks that carry each) in place of v3's frame section;
 *   - admitted: the LEGO's admitted list (services/shared/admitted-list.cjs; Tom r-2026-11-05) replaces
 *     v3's AVAILABLE inventory in the prompt, so the model is offered nothing outside it;
 *   - extraCheck: every candidate is held to v4's rules — both sides against that same list first and then to the door's own
 *     gateStagedRows — the SAME function the gap-fill door re-runs on landing — so a set that
 *     passes here is a set that lands there. An interjection not yet admitted, a USE that is not a sentence,
 *     an untaught known-side word, a ZUT clash with the whole course: refused, retried with
 *     the reason quoted, and if it cannot be made to pass the answer is ok:false/blocked.
 *
 * WRITES NOTHING. The response carries `staged_rows` in exactly the shape
 * POST /api/admin/phrase-v4/gap-fill takes, so landing an existing course's LEGO is
 * generate → gap-fill (preview by default, undo file, tom_go on a live course). A builder
 * mid-seed does what it did with v3: put the known → target pairs in the seed submission,
 * where every submission gate runs again.
 *
 * THE HONEST GAP. The opener check and the frame report need the frame tagger (a Haiku
 * call per never-seen text, cached estate-wide). If tagging fails the result says so in
 * `v4.frames` and the opener check is NOT run — it is reported as not run, never as passed.
 */

const path = require('path');
const ROOT = path.join(__dirname, '..', '..', '..');

/**
 * The v4 brief that stands in for v3's frame section. Pure. Frame lines and the
 * interjection rule are generate-v4's own (frameLine, interjectionRule), so the
 * offline generator and this door say the same words: pod frames (D, X) are listed
 * with the P-frames, and an interjection is allowed only when admitted (Tom 2026-11-05).
 * `patterns` is kept for callers that inject a P list; a frame it lacks falls through
 * to frameLine.
 */
function buildV4Section({ available, carriers, patterns = [], knownLanguage = 'English' }) {
  const { frameLine, interjectionRule } = require(path.join(ROOT, 'tools/frame-layer/v4/generate-v4.cjs'));
  const frameLines = available.map((id) => {
    const p = patterns.find((x) => x.id === id);
    if (!p) return frameLine(id, carriers);
    const cs = (carriers[id] || []).map((c) => `"${c.known_text}" = ${c.target_text}`).join(' · ');
    return `  ${id} ${p.name}  ${p.shape}${cs ? `\n      taught material that carries it: ${cs}` : ''}`;
  }).filter(Boolean).join('\n');
  return [
    '',
    '---',
    '',
    '## PHRASE v4 — frame diversity by walking back (this replaces any frame list above)',
    '',
    'Tom\'s objective: the learner should meet as many of the frames below as possible, each time by putting THIS LEGO in concert with material the learner already owns — the taught chunks named under each frame — never by adding words.',
    'Across this basket (BUILD and USE together) use as many DIFFERENT frames as the basket allows; give no two USE phrases the same frame while an unused frame still fits. Put the frame id on each phrase as "frame":"P-id" (or the D-id of a pod frame).',
    '',
    interjectionRule(knownLanguage),
    '',
    'FRAMES AVAILABLE BY THIS SEED:',
    frameLines,
    '',
  ].join('\n');
}

/** Staged rows in the shape POST /api/admin/phrase-v4/gap-fill takes. Pure. */
function stagedRows({ phrases, lego, seedNumber, legoIndex, framesOfText }) {
  const rows = [];
  for (const role of ['build', 'use']) {
    for (const p of phrases[role] || []) {
      rows.push({ seed_number: seedNumber, lego_index: legoIndex, lego_known: lego.known_text, lego_target: lego.target_text,
        phrase_role: role, known_text: p.known, target_text: p.target, frames: framesOfText ? framesOfText(p.known) : [] });
    }
  }
  return rows;
}

/**
 * Build the v4 context for one LEGO: the brief and the checker. Everything the model's output
 * is judged by is assembled here, before the model is called.
 * `deps` is injectable so the unit test needs no database and no model.
 */
async function prepareV4(supabase, courseCode, seedNumber, legoIndex, { proposedLego, deps = {} } = {}) {
  const door = deps.door || require('../../shared/phrase-v4-door.cjs');
  const gateCheck = deps.gateCheck || require(path.join(ROOT, 'tools/phrase-gate/gate-check.cjs'));
  const checkPhraseZUT = deps.checkPhraseZUT || require('./validation.cjs').checkPhraseZUT;
  const tagger = deps.tagger || require(path.join(ROOT, 'tools/frame-layer/frame-tagger.cjs'));
  const PATTERNS = deps.patterns || require(path.join(ROOT, 'tools/frame-layer/patterns.cjs'));
  const { unitsOf } = require('../../shared/known-heard-check.cjs');

  const data = await door.readCourse(supabase, courseCode, { maxSeed: seedNumber, componentsOnly: true });
  if (!data) throw new Error(`no course ${courseCode}`);
  data.components = data.phrases.filter((p) => p.phrase_role === 'component');
  let lego = data.legos.find((l) => l.seed_number === seedNumber && Number(l.lego_index) === Number(legoIndex));
  if (!lego) {
    // A builder asks BEFORE it submits the seed: the LEGO is a proposal, not yet a row.
    if (!proposedLego) throw new Error(`${courseCode} S${seedNumber}L${legoIndex} is not in the course; pass lego_known/lego_target/lego_type`);
    lego = { seed_number: seedNumber, lego_index: Number(legoIndex), known_text: proposedLego.known, target_text: proposedLego.target, type: proposedLego.type, is_new: true };
    data.legos.push(lego);
  }

  // THE ADMITTED LIST (Tom r-2026-11-05), built once: seeds < N, LEGOs before S<N>L<L>, the LEGO,
  // components only as parts. The prompt shows only it; the check below holds both sides to it.
  const ADM = deps.admittedList || require('../../shared/admitted-list.cjs');
  const admitted = ADM.admittedList({ course: courseCode, seeds: data.seeds || [], legos: data.legos, components: data.components,
    seedNumber, legoIndex: Number(legoIndex), lego });
  const noSpace = ADM.knownNoSpace(courseCode);
  const knownLanguage = tagger.knownLanguageName(courseCode);
  const report = { frames: 'not run', frames_available: [], distinct_frames: null, per_phrase: [] };
  let available = [];
  let carriers = {};
  let tagged = false;
  try {
    const { tagCourse } = deps.tagCourse ? deps : require(path.join(ROOT, 'tools/frame-layer/v4/tag-course.cjs'));
    const { inventory, availableAt } = deps.inventory ? deps : require(path.join(ROOT, 'tools/frame-layer/v4/frame-inventory.cjs'));
    const { carriersByFrame } = deps.carriersByFrame ? deps : require(path.join(ROOT, 'tools/frame-layer/v4/generate-v4.cjs'));
    await tagCourse(courseCode, data);
    available = availableAt(inventory(courseCode, data), seedNumber);
    carriers = carriersByFrame(admitted.rows.filter((r) => r.kind === 'lego' || r.kind === 'component'), available, courseCode); // carriers only from admitted material
    tagged = true;
    report.frames = 'run';
    report.frames_available = available;
  } catch (e) {
    report.frames = `not run: ${e.message}`; // the opener check below is skipped with it, and says so
  }

  const section = tagged ? buildV4Section({ available, carriers, patterns: PATTERNS, knownLanguage }) : '';
  const basketVocab = admitted.rows; // the admitted-interjection check reads the same list

  async function extraCheck({ phrases }) {
    const reasons = [];
    const all = [...phrases.build.map((p) => ({ ...p, role: 'build' })), ...phrases.use.map((p) => ({ ...p, role: 'use' }))];
    let framesOfText = null;
    if (tagged) {
      try {
        const wc = deps.windowCoverage || require(path.join(ROOT, 'tools/frame-layer/v4/window-coverage.cjs'));
        const { admittedOpener } = deps.admittedOpener ? deps : require(path.join(ROOT, 'tools/frame-layer/v4/generate-v4.cjs'));
        await tagger.ensureTagged(all.map((p) => p.known), { knownLanguage });
        await wc.ensurePodTagged(all.map((p) => p.known), { knownLanguage });
        // Pod frames count; an interjection earns none (window-coverage.podFramesOf).
        framesOfText = (k) => wc.framesOfAll(k, available);
        for (const p of all) {
          // Allowed only when the interjection is a chunk this basket already owns (Tom 2026-11-05).
          if (tagger.hasOpener(p.known) && !admittedOpener(p.known, p.target, basketVocab, noSpace)) {
            reasons.push(`${p.role.toUpperCase()} "${p.known}": interjection at the front is not yet admitted for this basket (it must be a taught chunk this basket owns, with its taught target form) — rewrite it without`);
          }
        }
      } catch (e) {
        report.frames = `not run: ${e.message}`;
      }
    }
    // Both sides against the admitted list, every script (no free class, no no-space bypass).
    for (const p of all) {
      for (const why of ADM.admittedCheck({ known: p.known, target: p.target }, admitted, courseCode)) reasons.push(`${p.role.toUpperCase()} "${p.known}" → "${p.target}": ${why}`);
    }
    for (const p of all) {
      if (p.role === 'use' && unitsOf(p.known, noSpace).length < (noSpace ? 6 : 4)) reasons.push(`USE "${p.known}": too short to be a complete sentence`);
    }
    // The door's own gates, re-run — the same function the gap-fill door applies on landing.
    const staged = stagedRows({ phrases, lego, seedNumber, legoIndex: Number(legoIndex), framesOfText });
    if (staged.length) {
      const { refused } = await door.gateStagedRows({ sb: supabase, courseCode, rows: staged, data, deps: { ...gateCheck, checkPhraseZUT } });
      for (const r of refused) reasons.push(`${String(r.phrase_role).toUpperCase()} "${r.known_text}" → "${r.target_text}": ${r.reasons.join('; ')}`);
    }
    report.per_phrase = staged.map((r) => ({ role: r.phrase_role, known: r.known_text, frames: r.frames }));
    report.distinct_frames = framesOfText ? new Set(staged.flatMap((r) => r.frames)).size : null;
    report.staged = staged;
    return reasons;
  }

  return { section, extraCheck, report, lego, admitted };
}

/** Generate one LEGO's BUILD + USE set under v4. Writes nothing. */
async function generateLegoPhrasesV4(supabase, courseCode, seedNumber, legoIndex, opts = {}) {
  const generate = opts.generateFn || require('./phrase-generation.cjs').generateLegoPhrases;
  const v4 = await prepareV4(supabase, courseCode, seedNumber, Number(legoIndex), { proposedLego: opts.proposedLego, deps: opts.deps });
  const result = await generate(supabase, courseCode, seedNumber, legoIndex, {
    ...opts, frameSectionFn: () => v4.section, extraCheck: v4.extraCheck, admitted: v4.admitted,
  });
  const { staged, ...report } = v4.report;
  return {
    ...result,
    pipeline: 'v4',
    v4: report,
    // Only a set that passed everything is offered for landing.
    staged_rows: result.blocked ? [] : (staged || []),
  };
}

module.exports = { generateLegoPhrasesV4, prepareV4, buildV4Section, stagedRows };
