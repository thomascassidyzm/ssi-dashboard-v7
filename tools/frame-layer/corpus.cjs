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
  const m = /^([a-z]{2,3})_for_([a-z]{2,3})$/.exec(String(course || ''));
  return m ? { target: m[1], known: m[2] } : { target: null, known: null };
}
const knownSideIsEnglish = (course) => pairOf(course).known === 'eng';

module.exports = { loadCorpus, pageAll, pairOf, knownSideIsEnglish };
