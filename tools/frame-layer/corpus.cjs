/**
 * The one read of the course corpus the frame-layer tools share: this seed, its
 * own legos, and every seed before it. Supabase caps a select at 1000 rows, so
 * pagination is not optional — a course past seed 1000 silently loses its early
 * history otherwise, and the admission diff would then call old frames new.
 * READ-ONLY.
 */
async function pageAll(sb, table, sel, apply) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await apply(sb.from(table).select(sel)).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...data);
    if (data.length < 1000) break;
  }
  return out;
}

/**
 * COMPONENTS ARE AN ADMISSION LAYER (Tom, 2026-08-29). A CMP row is a component
 * of an M-LEGO — "this is really to show the learner HOW the internal structure
 * of the M-LEGO is broken down" — and, crucially, "all CMP rows are added to the
 * legitimate VOCAB for future legos to use for their phrase generation ... so
 * that the 'glue' that you often need when making stuff work in both languages
 * is pulling from legitimately seen pieces".
 *
 * So there are TWO KINDS OF ADMISSION and they are not interchangeable:
 *   a LEGO admission creates a LEARNING EVENT — a basket, floors, practice;
 *   a COMPONENT admission extends the AVAILABLE VOCABULARY and nothing else —
 *   no basket, no floors, no practice of its own.
 * Which is why components are read here for AVAILABILITY and for ZUT, and are
 * ignored when computing what a seed TEACHES.
 */
async function loadCorpus(sb, course, seed) {
  const [{ data: seedRow }, legos, priorSeeds, phrases, components] = await Promise.all([
    sb.from('course_seeds').select('seed_number,known_text,target_text')
      .eq('course_code', course).eq('seed_number', seed).maybeSingle(),
    pageAll(sb, 'course_legos', 'seed_number,lego_id,lego_index,type,known_text,target_text',
      q => q.eq('course_code', course).lte('seed_number', seed).order('seed_number').order('lego_index')),
    pageAll(sb, 'course_seeds', 'seed_number,known_text,target_text',
      q => q.eq('course_code', course).lt('seed_number', seed).order('seed_number')),
    pageAll(sb, 'course_practice_phrases', 'id,lego_index,position,phrase_role,known_text,target_text',
      q => q.eq('course_code', course).eq('seed_number', seed).order('lego_index').order('position')),
    // every component admitted at or before this seed — the availability layer
    pageAll(sb, 'course_practice_phrases', 'seed_number,lego_index,known_text,target_text',
      q => q.eq('course_code', course).eq('phrase_role', 'component').lte('seed_number', seed)
             .order('seed_number').order('lego_index')),
  ]);
  return { seedRow, legos, priorSeeds, phrases, components,
           ownLegos: legos.filter(l => l.seed_number === seed),
           priorLegos: legos.filter(l => l.seed_number < seed),
           priorComponents: components.filter(c => c.seed_number < seed),
           ownComponents: components.filter(c => c.seed_number === seed) };
}

/**
 * The pair a course code names: `spa_for_eng` teaches spa to a speaker of eng.
 * The frame layer's patterns are ENGLISH regexes, so they are only meaningful
 * where the KNOWN side is English — `cym_for_yor` has a Welsh known side and
 * every pattern would silently report "no frames" rather than "not applicable".
 */
function pairOf(course) {
  // The middle segment is a VARIANT, and it is the standing bug the sector
  // segment codes only make louder: `cym_n_for_eng` has an English known side
  // and the old regex said null, so every English pattern silently reported
  // "no frames" rather than running. Regional variants (`spa_mx_for_eng`,
  // `deu_at_for_eng`) and sector segments (`spa_health_for_eng`) take the same
  // shape, so one relaxation resolves all three to their base pair and carries
  // the variant rather than discarding it. Genuine rubbish is still null.
  const m = /^([a-z]{2,3})(?:_([a-z0-9]+(?:_[a-z0-9]+)*))?_for_([a-z]{2,3})$/.exec(String(course || ''));
  return m ? { target: m[1], known: m[3], variant: m[2] || null } : { target: null, known: null, variant: null };
}
const knownSideIsEnglish = (course) => pairOf(course).known === 'eng';

/**
 * THE POD CANON, READ-ONLY AND PAGINATED. 1,446 rows today, so the 1000-row cap
 * bites already and pagination is not optional.
 *
 * `target_text`/`target_lang` are deliberately NOT selected. They exist on the
 * table now (populated for the Method Pod in Italian, null for pod-1) but
 * PODS DO NOT CUT: a rendering is a translation of shape-layer material, not an
 * agreement between a known chunk and a target chunk, and the whole safety
 * property of the frame layer rests on pod content contributing ATTESTATION and
 * ZERO VOCABULARY. Selecting the column would put target material one careless
 * line away from the generator; not selecting it makes that impossible here.
 */
async function loadPodCanon(sb, { pods = ['pod-1'] } = {}) {
  const rows = await pageAll(sb, 'canonical_pod_scenarios',
    'id,pod_slug,scene_number,scene_title,sentence_number,global_order,speaker,english_text,updated_at',
    q => q.in('pod_slug', pods).order('pod_slug').order('global_order'));
  return rows.map(r => ({ ...r, source: 'canon' }));
}

/**
 * WHICH POD CONTENT HAS THIS LEARNER HEARD BY SEED N? — the interface, the
 * schedule found, and an honest null.
 *
 * The design reported "where the pod-vs-seed interleaving schedule is defined"
 * as an unestablished gap. It is established now, by reading the delivery side
 * (ssi-learning-app):
 *   - pods start at `podActivationRound`, default 6
 *     (`packages/player-vue/src/providers/generateLearningScript.ts:174`,
 *      `src/composables/usePodActivation.ts`);
 *   - a lap then fires every `POD_ROUND_INTERVAL` main rounds, default 5
 *     (`generateLearningScript.ts:678-728`, `usePodLapScheduler.ts:624-631`);
 *   - each lap introduces ONE COHORT — one exchange, a speaker turn plus its
 *     reply, never crossing a scene boundary (`usePodLapScheduler.ts`, cohort
 *     intake; partition in `@ssi/core/pods/podCohorts.ts`);
 *   - a "round" is one LEGO (`course_round_index` → `{ r, legoId, seed }`,
 *     served by `api/courses/[code]/round-map.ts`).
 * So the arithmetic below is derivable, and `podLapsByRound` states it.
 *
 * What is NOT derivable at authoring time is the ANSWER. `completedPodRounds`
 * and `podActivationRound` are restored per ENROLMENT at scheduler init
 * (`usePodLapScheduler.ts:596-604`) and a lap can be deferred a round at
 * runtime, so "delivered by seed N" is per-learner runtime state, not a
 * property of the course. A generator scoring a basket has no learner.
 *
 * Hence null, deliberately. Every caller must read null as "no schedule
 * readable" and degrade to owned-only gating — which is not a degradation:
 * HEARD is a ranking signal and never a gate, so the safety property is
 * untouched. Returning `[]` would have been a lie: it would say "nothing heard
 * yet", which is a claim, and a wrong one from round 6 onward.
 */
async function deliveredPodRows(/* sb, course, seedNumber */) {
  return null;
}

/**
 * How many pod laps has a learner on main round `round` seen, under the
 * DEFAULT schedule? Pure arithmetic over the two published constants — an
 * upper bound on cohorts delivered, not a per-learner fact. Exported so the
 * next worker to wire "heard" has the arithmetic instead of a guess.
 */
function podLapsByRound(round, { activation = 6, interval = 5 } = {}) {
  if (!Number.isFinite(round) || round < activation) return 0;
  return Math.floor((round - activation) / Math.max(1, interval)) + 1;
}

module.exports = { loadCorpus, loadPodCanon, deliveredPodRows, podLapsByRound, pageAll, pairOf, knownSideIsEnglish };
