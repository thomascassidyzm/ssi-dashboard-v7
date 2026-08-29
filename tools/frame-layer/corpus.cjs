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

async function loadCorpus(sb, course, seed) {
  const [{ data: seedRow }, legos, priorSeeds, phrases] = await Promise.all([
    sb.from('course_seeds').select('seed_number,known_text,target_text')
      .eq('course_code', course).eq('seed_number', seed).maybeSingle(),
    pageAll(sb, 'course_legos', 'seed_number,lego_id,lego_index,type,known_text,target_text',
      q => q.eq('course_code', course).lte('seed_number', seed).order('seed_number').order('lego_index')),
    pageAll(sb, 'course_seeds', 'seed_number,known_text,target_text',
      q => q.eq('course_code', course).lt('seed_number', seed).order('seed_number')),
    pageAll(sb, 'course_practice_phrases', 'id,lego_index,position,phrase_role,known_text,target_text',
      q => q.eq('course_code', course).eq('seed_number', seed).order('lego_index').order('position')),
  ]);
  return { seedRow, legos, priorSeeds, phrases,
           ownLegos: legos.filter(l => l.seed_number === seed) };
}

module.exports = { loadCorpus, pageAll };
