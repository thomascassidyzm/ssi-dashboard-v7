// Pure shaping of the rows CourseEditor renders from the course API response.
// Lifted out of loadCourse() in CourseEditor.vue (job #146) so the mapping is
// testable on its own; the view's behaviour is unchanged.

/** API translation rows → editor rows: known/target aliased, uuid falls back to seed_id. */
export function shapeTranslations(rows) {
  return (rows || []).map(t => ({
    ...t,
    source: t.known_phrase || t.source,
    target: t.target_phrase || t.target,
    uuid: t.uuid || t.seed_id
  }))
}

/** API lego_breakdowns (database shape) → the editor's seed/lego_pairs shape. */
export function shapeLegoBreakdowns(rows) {
  return (rows || []).map(seed => ({
    seed_id: seed.seed_id,
    original_target: seed.seed_pair?.target || '',
    original_known: seed.seed_pair?.known || '',
    lego_pairs: (seed.legos || []).map(lego => ({
      lego_id: lego.id,
      target_chunk: lego.target,
      known_chunk: lego.known,
      lego_type: lego.type === 'M' ? 'COMPOSITE' : 'ATOMIC',
      is_new: lego.new !== false,
      ref: lego.ref || null,
      componentization: lego.components ?
        lego.components.map(c => `${c.known} = ${c.target}`).join(', ') :
        null
    }))
  }))
}
