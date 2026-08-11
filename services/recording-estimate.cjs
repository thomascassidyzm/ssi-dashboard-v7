/**
 * Recording Estimate — how much work is "record everything in full", really?
 *
 * Kai's blind listening test (2026-08-11) ruled that joins between glued LEGO
 * pieces ARE audible on real human recordings, and get MORE obvious deeper into
 * a course. The answer is a SEED CUTOFF: seeds 1..N get recorded as complete
 * whole utterances (nothing cut, nothing glued); everything past N keeps the
 * existing fast-and-slow covering-subset flow.
 *
 * Choosing N is a commitment of somebody's evenings, so the number has to be in
 * front of them BEFORE they pick. Everything here is derived from the course's
 * own rows in Supabase — course_seeds / course_legos / course_practice_phrases.
 * The ONLY constants in this file are speaking rates (seconds per utterance);
 * there is no hardcoded course size, item count or duration anywhere.
 *
 * Calibration of the one rate constant, against Kai's own two datapoints:
 *
 *   cym_n_for_eng  live rows = 6,298 utterances  → @4s = 7.00h   (Kai: "~6,300 things to say, ~7 hours")
 *   fin_for_eng    live rows = 16,094 utterances → @4s = 17.9h   (Kai: "~16,125 things, ~18 hours")
 *
 * Both land on 4 seconds per utterance, which is also the SECONDS_PER_PHRASE the
 * optimizer has always used. So the rate is not a guess either — it is Kai's
 * own working figure, reproduced from live data twice.
 */

const RATES = {
  // One whole utterance, read once at natural speed, including the breath and
  // the beat before the next one. Record-everything needs no second slow pass:
  // the whole point is that nothing gets sliced, so there is nothing to slice for.
  SECONDS_PER_FULL_UTTERANCE: 4,
  // Fast-and-slow (today's default, used beyond the cutoff) reads each selected
  // phrase TWICE — natural then slow-with-pauses — which is why the existing
  // /recording-script endpoint budgets ~6s per autocue item.
  SECONDS_PER_GLUE_ITEM: 6,
};

const PAGE = 1000;

/**
 * Every row of a table for one course, paged. The estate has courses with
 * 14k practice-phrase rows; a single select silently stops at 1,000.
 */
async function fetchAllRows(supabase, table, columns, courseCode, extra = q => q) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await extra(
      supabase.from(table).select(columns).eq('course_code', courseCode)
    ).range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

/**
 * Audio identity in this estate is one clip per (course, text, voice) — keyed on
 * the text EXACTLY as stored. So two rows are the same recording job only when
 * their text matches exactly (bar surrounding whitespace); differing punctuation
 * is a different clip and a different thing for the recorder to say.
 */
function identityKey(text) {
  return (text || '').trim();
}

/**
 * The cost curve for a course: for every seed number, what recording everything
 * in full up to and including that seed would cost.
 *
 * Returned once, covering every possible cutoff, so a slider can answer "what
 * about N=40?" without another round trip — and so the whole curve is auditable
 * against the DB in one shot.
 *
 * @returns {Promise<Object>} { courseCode, seedCount, rates, totals, curve, alreadyRecorded }
 */
async function computeRecordingEstimate(supabase, courseCode, options = {}) {
  const { role = 'target1' } = options;

  const [seeds, legos, phrases] = await Promise.all([
    fetchAllRows(supabase, 'course_seeds', 'seed_number, target_text', courseCode),
    fetchAllRows(supabase, 'course_legos', 'seed_number, target_text', courseCode,
      q => q.eq('is_new', true)),
    fetchAllRows(supabase, 'course_practice_phrases', 'seed_number, target_text, phrase_role', courseCode),
  ]);

  if (seeds.length === 0) {
    return null;
  }

  // Bucket every utterance by the seed it belongs to. A seed's own sentence, the
  // LEGOs it introduces, and its practice phrases are all things a recorder says
  // out loud, so all three count as utterances.
  const bySeed = new Map();
  const bucket = (seedNumber) => {
    if (!bySeed.has(seedNumber)) {
      bySeed.set(seedNumber, { seeds: [], legos: [], build: [], use: [], components: [] });
    }
    return bySeed.get(seedNumber);
  };

  for (const s of seeds) bucket(s.seed_number).seeds.push(s.target_text);
  for (const l of legos) bucket(l.seed_number).legos.push(l.target_text);
  for (const p of phrases) {
    const b = bucket(p.seed_number);
    if (p.phrase_role === 'component') b.components.push(p.target_text);
    else if (p.phrase_role === 'use') b.use.push(p.target_text);
    else b.build.push(p.target_text);
  }

  // Which of these are already in the can for this voice. Minority-language
  // courses like cym have thousands of real takes already; a cutoff estimate
  // that ignores them overstates the work by hours.
  const recordedTexts = new Set(
    (await fetchAllRows(supabase, 'course_audio', 'text', courseCode,
      q => q.eq('role', role).eq('origin', 'human'))
    ).map(r => identityKey(r.text))
  );

  const seedNumbers = [...bySeed.keys()].sort((a, b) => a - b);

  // Walk the seeds in order, accumulating. `seen` makes the distinct count exact
  // rather than an estimate: a text repeated across seeds is one recording job.
  const seen = new Set();
  const curve = [];
  const running = {
    seedSentences: 0, legos: 0, buildPhrases: 0, usePhrases: 0, componentRows: 0,
    rows: 0, distinct: 0, distinctStillNeeded: 0,
  };

  // The last seed that actually contributes anything to say. cym_n_for_eng has
  // 668 seed rows but real Welsh only to seed 305 — the rest are empty
  // placeholders, so a cutoff of 400 there costs exactly the same as 305 and a
  // picker that does not say so is offering dead range.
  let lastContentSeed = 0;

  for (const seedNumber of seedNumbers) {
    const b = bySeed.get(seedNumber);
    const distinctBefore = running.distinct;
    running.seedSentences += b.seeds.length;
    running.legos += b.legos.length;
    running.buildPhrases += b.build.length;
    running.usePhrases += b.use.length;
    running.componentRows += b.components.length;

    for (const text of [...b.seeds, ...b.legos, ...b.build, ...b.use, ...b.components]) {
      running.rows += 1;
      const key = identityKey(text);
      if (key && !seen.has(key)) {
        seen.add(key);
        running.distinct += 1;
        if (!recordedTexts.has(key)) running.distinctStillNeeded += 1;
      }
    }

    if (running.distinct > distinctBefore) lastContentSeed = seedNumber;

    curve.push({
      seed: seedNumber,
      // Breakdown of what falls inside a cutoff here (cumulative).
      seedSentences: running.seedSentences,
      legos: running.legos,
      buildPhrases: running.buildPhrases,
      usePhrases: running.usePhrases,
      componentRows: running.componentRows,
      // Rows is the upper bound (every row recorded separately); distinct is the
      // real job count, since one clip per text serves every row that shares it.
      rows: running.rows,
      distinct: running.distinct,
      stillNeeded: running.distinctStillNeeded,
      hours: +(running.distinct * RATES.SECONDS_PER_FULL_UTTERANCE / 3600).toFixed(2),
      hoursIfEveryRow: +(running.rows * RATES.SECONDS_PER_FULL_UTTERANCE / 3600).toFixed(2),
      hoursStillNeeded: +(running.distinctStillNeeded * RATES.SECONDS_PER_FULL_UTTERANCE / 3600).toFixed(2),
    });
  }

  const last = curve[curve.length - 1];

  return {
    courseCode,
    role,
    generatedAt: new Date().toISOString(),
    seedCount: seedNumbers.length,
    lastSeed: last.seed,
    lastContentSeed,
    rates: RATES,
    // Whole-course figures — the "record everything, all of it" end of the dial.
    totals: last,
    curve,
    alreadyRecordedClips: recordedTexts.size,
    // Everything above is counted from these row totals; printed so a reader can
    // re-run the same three selects and reconcile by hand.
    sourceRowCounts: {
      course_seeds: seeds.length,
      course_legos_is_new: legos.length,
      course_practice_phrases: phrases.length,
    },
  };
}

/**
 * Read one cutoff off the curve. N=0 (or null) means the cutoff is off — nobody
 * records anything in full, which is today's default for every course.
 */
function estimateAtCutoff(estimate, cutoff) {
  if (!estimate || !cutoff || cutoff < 1) return null;
  // Cutoffs need not land on a seed that exists (courses can have gaps), so take
  // the last curve point at or below N.
  let match = null;
  for (const point of estimate.curve) {
    if (point.seed <= cutoff) match = point;
    else break;
  }
  return match;
}

module.exports = { computeRecordingEstimate, estimateAtCutoff, RATES };
