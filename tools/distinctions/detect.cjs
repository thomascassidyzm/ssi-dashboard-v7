/**
 * detect.cjs — the three detectors behind scan-course Check 19.
 *
 * All three are READ-ONLY and all three PROPOSE. None of them writes, and none of
 * them asserts that a course is wrong.
 *
 * A1  KNOWN RICHER, GENERATIVE — "the counterpart prompt is missing"
 *     Needs morphology for the known language. Swaps the marked forms and asks
 *     whether the course teaches the result. If not, that prompt is a proposal.
 *     Remedy: author the counterpart and drill it against the same answer.
 *
 * A2  KNOWN RICHER, OBSERVATIONAL — "the course already collapses these"
 *     Needs no configuration at all and therefore runs on every pair on the estate.
 *     Groups phrases by target answer; any answer reached from two or more different
 *     known prompts is a collapse the course already contains. The REACH TEST is what
 *     makes this useful rather than noisy: a collapse the learner would reach for is
 *     the method working, and a collapse they would not is a wall.
 *     This is where Kai's Welsh dysgu case lives — "I am learning" and "I am teaching"
 *     share one Welsh word, and no learner reaches from one to the other.
 *
 * B   TARGET RICHER — "the prompt does not determine the answer"
 *     Also configuration-free. Groups by known prompt; a prompt taught with two target
 *     forms that are inflectional neighbours of each other means the learner is being
 *     asked to produce a distinction their prompt never gave them.
 *     THESE ARE NEVER ASSERTED AS DEFECTS. Deliberate ambiguity is sometimes a
 *     teaching tool on this estate. They are candidates for a human to judge.
 */

const {
  swapSide, strandedAfterSwap, anchorsIn, knownKey, targetKey, axisPairKeys,
  paradigmsOf, cueFor,
} = require('./axes.cjs');
const { reachTest, VERDICTS } = require('./reach-test.cjs');

/** A component/one-word gloss has no sentence around it to make a relationship visible. */
const isFragment = (row) => row.phrase_role === 'component'
  || knownKey(row.known_text).split(/\s+/u).length <= 1;

function groupBy(rows, keyFn) {
  const m = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    if (!k) continue;
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  }
  return m;
}

/* ------------------------------------------------------------------ A1 ---- */

function detectA1(rows, dir, knownLang, otherLang) {
  const d = dir.morphology;
  const pairs = axisPairKeys(dir.richerLang, dir.axis);
  const paradigms = paradigmsOf(knownLang);
  const taught = groupBy(rows, (r) => knownKey(r.known_text));

  const buckets = {
    proposal: [], notADrill: [], attested: [], conflict: [], unanchored: [], rejected: [],
  };
  let carrying = 0;

  for (const r of rows) {
    const known = knownKey(r.known_text);
    const target = r.target_text || '';

    let side = null; let counterpart = null; let cpKey = null; let swapped = [];
    for (const s of d.sides) {
      const res = swapSide(r.known_text, d, s);
      if (knownKey(res.text) !== known) {
        side = s; counterpart = res.text; cpKey = knownKey(res.text); swapped = res.swapped;
        break;
      }
    }
    if (!side) continue;
    carrying += 1;

    const base = {
      detector: 'A1',
      direction: 'A',
      axis: dir.axis,
      seed_number: r.seed_number,
      lego_index: r.lego_index,
      phrase_role: r.phrase_role,
      side,
      known_text: r.known_text,
      counterpart_known_text: counterpart,
      target_text: target,
      swapped: swapped.map((s) => `${s.from}→${s.to}`),
    };

    const existing = taught.get(cpKey);
    if (existing) {
      const same = existing.find((e) => targetKey(e.target_text) === targetKey(target));
      if (same) { buckets.attested.push({ ...base, counterpart_seed: same.seed_number }); continue; }
      buckets.conflict.push({
        ...base,
        counterpart_seed: existing[0].seed_number,
        counterpart_target_text: existing[0].target_text,
      });
      continue;
    }

    const rej = (d.rejects || []).find(
      (rule) => rule.test({
        knownText: known,
        targetText: target,
        // The rules never name a language: "the other side" is whichever side is not
        // the one carrying the morphology.
        otherText: target,
        otherCue: cueFor(otherLang, dir.axis),
        swapped,
        side,
      }),
    );
    if (rej) { buckets.rejected.push({ ...base, rule: rej.id, why: rej.why }); continue; }

    const anchors = anchorsIn(known, d);
    const used = swapped.map((s) => d.classes.find((c) => c.id === s.class)).filter(Boolean);
    const needed = used.map((c) => c.requiresAnchor).filter(Boolean);
    const selfAnchored = used.length > 0 && used.every((c) => c.selfAnchoring);
    const anchored = selfAnchored
      || (needed.length ? needed.every((n) => anchors.includes(n)) : anchors.length > 0);
    if (!anchored) { buckets.unanchored.push({ ...base, anchors }); continue; }

    // A form we never swap, left stranded beside one we did, is mixed agreement — the
    // counterpart is not well-formed Hindi and must not be offered as a drill however
    // well it scores on reach.
    const stranded = strandedAfterSwap(counterpart, d);
    if (stranded) {
      buckets.notADrill.push({
        ...base,
        anchors,
        reach: {
          verdict: 'unreachable',
          reason: `the counterpart would leave ${stranded} unagreed beside a swapped verb `
            + '— mixed agreement, so this is not a well-formed prompt to offer',
          evidence: 'stranded-agreement',
        },
      });
      continue;
    }

    // THE GATE. Would the learner reach from the prompt they have to the one we propose?
    const reach = reachTest(known, cpKey, {
      paradigms, axisPairs: pairs, hasFrame: !isFragment(r),
    });
    const row = { ...base, anchors, reach };
    if (reach.verdict === VERDICTS.REACHES) buckets.proposal.push(row);
    else buckets.notADrill.push(row);
  }

  return { buckets, carrying };
}

/* ------------------------------------------------------------------ A2 ---- */

function detectA2(rows, knownLang, axisPairs) {
  const paradigms = paradigmsOf(knownLang);
  const byTarget = groupBy(rows, (r) => targetKey(r.target_text));
  const healthy = []; const walls = []; const flagged = [];

  for (const [tgt, group] of byTarget) {
    const prompts = [...new Map(group.map((r) => [knownKey(r.known_text), r])).values()];
    if (prompts.length < 2) continue;

    // Pairwise, but only against the first-taught prompt: that is the one the learner
    // actually holds when the later one is asked of them.
    prompts.sort((a, b) => a.seed_number - b.seed_number);
    const anchor = prompts[0];
    for (const other of prompts.slice(1)) {
      const reach = reachTest(knownKey(anchor.known_text), knownKey(other.known_text), {
        paradigms,
        axisPairs,
        hasFrame: !isFragment(anchor) && !isFragment(other),
      });
      const finding = {
        detector: 'A2',
        direction: 'A',
        axis: null,
        target_text: tgt,
        first_taught: { seed: anchor.seed_number, known_text: anchor.known_text, role: anchor.phrase_role },
        also_taught: { seed: other.seed_number, known_text: other.known_text, role: other.phrase_role },
        fragment: isFragment(anchor) || isFragment(other),
        reach,
      };
      if (reach.verdict === VERDICTS.REACHES) healthy.push(finding);
      else if (reach.verdict === VERDICTS.UNREACHABLE) walls.push(finding);
      else flagged.push(finding);
    }
  }
  return { healthy, walls, flagged };
}

/* ------------------------------------------------------------------- B ---- */

function detectB(rows, targetLang, dirB) {
  // The reach test is used here on the TARGET side, to ask a different question:
  // are these two answers two forms of one word (an inflectional choice the prompt
  // failed to determine) or two different words (a synonym or a plain ZUT problem)?
  const paradigms = paradigmsOf(targetLang);
  const axisPairs = dirB ? axisPairKeys(dirB.richerLang, dirB.axis) : new Set();
  const byKnown = groupBy(rows, (r) => knownKey(r.known_text));

  const underdetermined = []; const outOfScope = [];

  for (const [prompt, group] of byKnown) {
    const answers = [...new Map(group.map((r) => [targetKey(r.target_text), r])).values()];
    if (answers.length < 2) continue;
    answers.sort((a, b) => a.seed_number - b.seed_number);

    for (let i = 1; i < answers.length; i += 1) {
      const a = answers[0]; const b = answers[i];
      const reach = reachTest(targetKey(a.target_text), targetKey(b.target_text), {
        paradigms, axisPairs, hasFrame: true,
      });
      const finding = {
        detector: 'B',
        direction: 'B',
        axis: dirB ? dirB.axis : null,
        known_text: prompt,
        answers: [
          { seed: a.seed_number, target_text: a.target_text },
          { seed: b.seed_number, target_text: b.target_text },
        ],
        fragment: isFragment(a) || isFragment(b),
        reach,
        // The remedy is the OPPOSITE of Direction A's, and it is never automatic.
        remedy: 'disambiguate the prompt, split the card, or confirm the ambiguity is '
          + 'deliberate teaching — a human decides, this check does not',
      };
      // Two forms of one word = the prompt under-determined an inflectional choice.
      // Two different words = a synonym/ZUT question, which is a different check.
      if (reach.verdict === VERDICTS.REACHES) underdetermined.push(finding);
      else outOfScope.push(finding);
    }
  }
  return { underdetermined, outOfScope };
}


/* ------------------------------------------------------------------ B1 ---- */

/**
 * B1 — TARGET RICHER, GENERATIVE. The mirror of A1, and the one that matters most.
 *
 * WHY IT EXISTS. The collision detector (detectB) can only see a distinction the
 * course contradicts itself about. Worker #262's hand pass over spa_for_eng proved
 * that is the small half of the problem: 690 rows put an English first-person subject
 * against a Spanish gender-marked adjective, and the course produces the FEMININE
 * first-person form exactly zero times in 668 seeds. There is no collision to find,
 * because the course is perfectly self-consistent in being masculine-only. A female
 * learner is drilled hundreds of times on a self-description that is wrong for her,
 * and a collision detector reports the course clean.
 *
 * So B1 asks the generative question instead: this answer carries a marked form; is
 * the OTHER form ever taught anywhere in the course, and does the prompt contain
 * anything that would tell the learner which one is wanted?
 *
 * THE REACH TEST IS NOT APPLIED HERE, deliberately. Reach is a question about drill
 * candidacy — would the learner get from one prompt to another. Direction B is not
 * proposing a drill. Its question is whether the prompt determines the answer.
 *
 * AND NOTHING HERE IS A DEFECT. Deliberate ambiguity is sometimes a teaching tool on
 * this estate; a course may legitimately teach the unmarked form first and add the
 * alternation later. These are candidates for a human.
 */
function detectB1(rows, dir, knownLang) {
  const d = dir.morphology;
  const cue = cueFor(knownLang, dir.axis);
  const taughtTargets = new Set(rows.map((r) => targetKey(r.target_text)));

  const buckets = {
    underdetermined: [], cued: [], bothTaught: [], unanchored: [], rejected: [],
  };
  let carrying = 0;

  for (const r of rows) {
    const target = targetKey(r.target_text);
    const known = knownKey(r.known_text);

    let side = null; let counterpart = null; let swapped = [];
    for (const s of d.sides) {
      const res = swapSide(r.target_text, d, s);
      if (targetKey(res.text) !== target) {
        side = s; counterpart = targetKey(res.text); swapped = res.swapped; break;
      }
    }
    if (!side) continue;
    carrying += 1;

    const base = {
      detector: 'B1',
      direction: 'B',
      axis: dir.axis,
      seed_number: r.seed_number,
      phrase_role: r.phrase_role,
      side,
      known_text: r.known_text,
      target_text: r.target_text,
      other_form: counterpart,
      swapped: swapped.map((s) => `${s.from}→${s.to}`),
    };

    // The prompt says it out loud, so the learner is not guessing.
    if (cue && cue.test(known)) { buckets.cued.push(base); continue; }

    const rej = (d.rejects || []).find(
      (rule) => rule.test({
        knownText: target, targetText: known, otherText: known, otherCue: cue, swapped, side,
      }),
    );
    if (rej) { buckets.rejected.push({ ...base, rule: rej.id, why: rej.why }); continue; }

    const anchors = anchorsIn(target, d);
    const used = swapped.map((s) => d.classes.find((c) => c.id === s.class)).filter(Boolean);
    const needed = used.map((c) => c.requiresAnchor).filter(Boolean);
    const selfAnchored = used.length > 0 && used.every((c) => c.selfAnchoring);
    const anchored = selfAnchored
      || (needed.length ? needed.every((n) => anchors.includes(n)) : anchors.length > 0);
    if (!anchored) { buckets.unanchored.push({ ...base, anchors }); continue; }

    // Does the course ever teach the other form at all?
    if (taughtTargets.has(counterpart)) { buckets.bothTaught.push(base); continue; }

    buckets.underdetermined.push({
      ...base,
      remedy: 'the prompt does not say which form is wanted and the course never teaches '
        + 'the other one — disambiguate the prompt, split the card, or confirm that '
        + 'teaching the unmarked form first is deliberate. A human decides.',
    });
  }

  return { buckets, carrying };
}

module.exports = {
  detectA1, detectA2, detectB, detectB1, isFragment,
};
