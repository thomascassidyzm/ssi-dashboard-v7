/**
 * The clip_index walk for the voice-coverage refresh, split out so a test can drive it with a fake pg.
 *
 * Why it is its own function (job #499): the walk is the slow step (2.39M rows, one round trip per
 * page, ~25 min wall on a quiet box, past the timer's 60-minute cap under load) and it used to print
 * nothing until it finished, so a long walk looked like a hang. Now it logs every 50 pages, and a
 * filtered probe walks only the languages it needs. Cost is the per-row uuid-primary-key join (~0.6 ms a row,
 * measured: 5000-row pages took ~2.9 s and one hit the 5 s cap), so pages are 2000 and a page that times out
 * is retried once at a quarter the size instead of killing a 20-minute walk.
 */
const INDEX_PAGE = 2000
const pause = () => new Promise(r => setTimeout(r, 25))

async function loadIndex(pg, { languages = null, log = console.error, page = INDEX_PAGE } = {}) {
  const index = new Map(), voices = new Map(), flagged = new Map()
  let entries = 0, playable = 0, failing = 0, pages = 0
  const started = Date.now()
  const walk = async lang => {
    let cursor = [lang ?? '', '', '']
    for (;;) {
      // Materialise the bounded PK page BEFORE joining clips by UUID primary key.
      const fetchPage = limit => pg.query(`WITH page AS MATERIALIZED (
        SELECT language, text_key, voice_id, audio_id, origin FROM clip_index
        WHERE (language, text_key, voice_id) > ($1, $2, $3) ${lang == null ? '' : 'AND language = $4'}
        ORDER BY language, text_key, voice_id LIMIT ${limit})
        SELECT p.*, a.s3_key, a.duration_ms, a.veracity_pass FROM page p LEFT JOIN course_audio a ON a.id = p.audio_id
        ORDER BY p.language, p.text_key, p.voice_id`, lang == null ? cursor : [...cursor, lang])
      let size = page, rows
      try { ({ rows } = await fetchPage(size)) } catch (e) {
        if (!/statement timeout/.test(e.message)) throw e
        size = Math.max(100, Math.floor(page / 4)); log(`Index walk: page timed out, retrying at ${size} rows`)
        ;({ rows } = await fetchPage(size))
      }
      for (const r of rows) {
        if (!voices.has(r.language)) voices.set(r.language, new Set())
        voices.get(r.language).add(r.voice_id)
        entries++
        if (!r.s3_key || r.s3_key.startsWith('pending/') || Number(r.duration_ms || 0) <= 200) continue
        // A clip failing the speech check never enters a menu (design §6); counted, not held.
        if (r.veracity_pass === false) {
          const fk = `${r.language}\u001f${r.voice_id}`
          flagged.set(fk, (flagged.get(fk) || 0) + 1); failing++
          continue
        }
        const key = `${r.language}\u001f${r.text_key}`
        if (!index.has(key)) index.set(key, new Map())
        index.get(key).set(r.voice_id, r.origin === 'human' ? 'human' : 'tts'); playable++
      }
      if (++pages % 50 === 0) log(`Index walk: ${pages} pages, ${entries} entries, ${Math.round((Date.now() - started) / 1000)}s`)
      if (rows.length < size) break
      const last = rows.at(-1); cursor = [last.language, last.text_key, last.voice_id]
      await pause()
    }
  }
  if (languages) for (const lang of languages) await walk(lang)
  else await walk(null)
  return { index, voices, flagged, entries, playable, failing }
}

module.exports = { loadIndex, INDEX_PAGE }
