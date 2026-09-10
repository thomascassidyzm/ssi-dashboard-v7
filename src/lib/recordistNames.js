/**
 * WHO RECORDED A CLIP, by name — from the voice id the clip carries.
 *
 * A clip's voice_id is a database identity, and one person can own several:
 * Aran's Welsh takes sit under human_aran_cym_n and human_aran_cym_n_2, which
 * courses.voice_config.podCastAliases collapses into the first. The pods page
 * used to map only the cast voice ids to names and let everything else fall
 * through raw, so it read "154 human takes by Aran and Catrin and
 * human_aran_cym_n_2" — an id shown to a human as a third colleague (Tom,
 * 2026-09-10). This is the DISPLAY rule that stops that. It moves no data: the
 * alias split in the database is untouched and is somebody's separate call.
 */

/**
 * voice id → person's name, for every id the coverage payload can name: each
 * cast voice and every alias collapsed into it.
 * @param {Array<{voiceId?:string, name?:string, aliases?:string[]}>} voices
 *   the `voices` array of /api/production/<course>/pods/coverage
 * @returns {Record<string,string>}
 */
export function voiceNamesFromCoverage(voices) {
  const names = {}
  for (const v of voices || []) {
    if (!v || !v.voiceId || !v.name) continue
    names[v.voiceId] = v.name
    for (const alias of v.aliases || []) if (alias && !names[alias]) names[alias] = v.name
  }
  return names
}

/**
 * The distinct people behind a set of clip voice ids, in first-seen order.
 * An id nobody can name stays raw rather than vanishing — a take must never
 * read as unattributed because the cast forgot a name.
 * @param {Iterable<string>} voiceIds
 * @param {Record<string,string>} names
 * @returns {string[]}
 */
export function recordistNames(voiceIds, names) {
  const out = []
  for (const id of voiceIds || []) {
    if (!id) continue
    const label = names[id] || id
    if (!out.includes(label)) out.push(label)
  }
  return out
}
