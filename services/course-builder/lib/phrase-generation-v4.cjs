/**
 * PHRASE v4, ONE LEGO AT A TIME — the door builders call (job #544; Tom 2026-10-14,
 * r-2026-10-14-phrase-v4-is-the-phrase-builder: "phrase v4 is THE phrase builder").
 *
 * v4's objective (Tom 2026-10-02): the learner meets as many of the canon frames as the
 * course makes available, by putting each NEW LEGO "in concert with" taught material
 * that carries the frame — walking back through the network — and variety is bought with
 * frames the learner owns, never with a stapled opener ("thank you,", "of course"…).
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
 *   - extraCheck: every candidate is held to v4's rules and then to the door's own
 *     gateStagedRows — the SAME function the gap-fill door re-runs on landing — so a set that
 *     passes here is a set that lands there. A stapled opener, a USE that is not a sentence,
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

/** The v4 brief that stands in for v3's frame section. Pure. */
function buildV4Section({ available, carriers, patterns }) {
  const frameLines = available.map((id) => {
    const p = patterns.find((x) => x.id === id);
    if (!p) return null;
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
    'Across this basket (BUILD and USE together) use as many DIFFERENT frames as the basket allows; give no two USE phrases the same frame while an unused frame still fits. Put the frame id on each phrase as "frame":"P-id".',
    '',
    'NOT ALLOWED, and worth nothing: an interjection or discourse opener stapled on the front ("thank you,", "of course", "unfortunately", "no problem", "great", "well", "so", "really", "yes,", "no,"). A phrase that begins with one is refused. Variety is a frame change, never an opener.',
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
  data.phrases = [];
  let lego = data.legos.find((l) => l.seed_number === seedNumber && Number(l.lego_index) === Number(legoIndex));
  if (!lego) {
    // A builder asks BEFORE it submits the seed: the LEGO is a proposal, not yet a row.
    if (!proposedLego) throw new Error(`${courseCode} S${seedNumber}L${legoIndex} is not in the course; pass lego_known/lego_target/lego_type`);
    lego = { seed_number: seedNumber, lego_index: Number(legoIndex), known_text: proposedLego.known, target_text: proposedLego.target, type: proposedLego.type, is_new: true };
    data.legos.push(lego);
  }

  const noSpace = new Set(['zho', 'jpn', 'yue', 'hak', 'nan', 'tha']).has(String(courseCode.split('_for_')[1] || '').split('_')[0]);
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
    carriers = carriersByFrame([...data.legos, ...data.components].filter((c) => c.seed_number < seedNumber), available);
    tagged = true;
    report.frames = 'run';
    report.frames_available = available;
  } catch (e) {
    report.frames = `not run: ${e.message}`; // the opener check below is skipped with it, and says so
  }

  const section = tagged ? buildV4Section({ available, carriers, patterns: PATTERNS }) : '';

  async function extraCheck({ phrases }) {
    const reasons = [];
    const all = [...phrases.build.map((p) => ({ ...p, role: 'build' })), ...phrases.use.map((p) => ({ ...p, role: 'use' }))];
    let framesOfText = null;
    if (tagged) {
      try {
        await tagger.ensureTagged(all.map((p) => p.known), { knownLanguage });
        framesOfText = (k) => tagger.framesOf(k).filter((f) => available.includes(f));
        for (const p of all) {
          if (tagger.hasOpener(p.known)) reasons.push(`${p.role.toUpperCase()} "${p.known}": stapled opener (a detachable interjection at the front earns no frame and is refused) — rewrite it without`);
        }
      } catch (e) {
        report.frames = `not run: ${e.message}`;
      }
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

  return { section, extraCheck, report, lego };
}

/** Generate one LEGO's BUILD + USE set under v4. Writes nothing. */
async function generateLegoPhrasesV4(supabase, courseCode, seedNumber, legoIndex, opts = {}) {
  const generate = opts.generateFn || require('./phrase-generation.cjs').generateLegoPhrases;
  const v4 = await prepareV4(supabase, courseCode, seedNumber, Number(legoIndex), { proposedLego: opts.proposedLego, deps: opts.deps });
  const result = await generate(supabase, courseCode, seedNumber, legoIndex, {
    ...opts, frameSectionFn: () => v4.section, extraCheck: v4.extraCheck,
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
