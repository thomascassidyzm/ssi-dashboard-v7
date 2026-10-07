/**
 * recordist-rerecord-all.cjs — "Re-record all" for one voice artist (job #838,
 * Tom 2026-10-07: Dan is re-recording after a mic-quality concern and should
 * get the ORIGINAL EMPTY-SLOT FLOW — go take by take, auto-advance — not a
 * line-at-a-time re-read).
 *
 * WHY THE QUEUE NEEDS NO CHANGE. take-selection.cjs says a line is recorded iff
 * a slot, or a stored take of the words, belongs to one of the artist's voice
 * spellings. Both facts are read from course_audio.voice_id. So the cheapest
 * reset that never touches the queue's rules is to make the old clips stop
 * being THE ARTIST'S: their voice_id is prefixed with an archive tag (so they
 * stay in course_audio, their S3 bytes and recording_provenance rows untouched),
 * and every slot that pointed at them is emptied. The ordinary queue then serves
 * every line as unrecorded, in its ordinary order.
 *
 * NEVER-LOSE-A-RECORDING (Tom 2026-09-11). Nothing is deleted: not a row, not
 * an S3 object. The manifest in recordist_take_resets names every archived clip
 * and every emptied slot, so restoreReset() can put them back exactly — except
 * a slot the artist has since re-filled with a new take (the new take wins) and
 * a clip whose line has since been re-recorded (it stays archived, reported).
 *
 * KNOWN LIMIT, SAID OUT LOUD: array-valued slots (takeg_audio_ids,
 * sentence_audio_ids, sentence_known_audio_ids) are NOT emptied; the archived
 * clips stay referenced there. They are counted in the preview as `arrayRefs`.
 */

'use strict'

const crypto = require('crypto')
const { databaseUrl } = require('../shared/round-index-refresh.cjs')
const { invalidateLanguageQueueCache } = require('./recordist-queue-cache.cjs')

/** The scalar slots that hold one clip id. Presentation text slot on legos is not a uuid. */
const SCALAR_SLOTS = Object.freeze([
  ['listening_pod_sentences', ['target_audio_id', 'known_audio_id', 'explainer_audio_id', 'note_audio_id']],
  ['course_seeds', ['target1_audio_id', 'target2_audio_id', 'known_audio_id']],
  ['course_legos', ['target1_audio_id', 'target2_audio_id', 'known_audio_id']],
  ['course_practice_phrases', ['target1_audio_id', 'target2_audio_id', 'known_audio_id', 'presentation_audio_id']],
])
const ARRAY_SLOTS = Object.freeze([
  ['listening_pod_sentences', ['takeg_audio_ids', 'sentence_audio_ids', 'sentence_known_audio_ids']],
])

// course_audio's identity trigger (canonical_voice_id) refuses a voice_id with
// no provider prefix, so the archive tag has to START with one: 'human_' is
// what an artist's clip carries anyway, and the original id follows the tag so
// the row still says whose take it was.
const ARCHIVE_PREFIX = 'human_archived-'

async function withClient(connect, fn) {
  const client = await connect()
  try { return await fn(client) } finally { await client.end().catch(() => {}) }
}

async function defaultConnect() {
  const { Client } = require('pg')
  const client = new Client({ connectionString: databaseUrl() })
  await client.connect()
  return client
}

/** What a reset WOULD do. Read-only; this is what the confirm dialog shows. */
async function previewReset({ voiceId, language, spellings, connect = defaultConnect }) {
  return withClient(connect, async (c) => {
    const clips = (await c.query(
      'select id from course_audio where language = $1 and voice_id = any($2)', [language, spellings])).rows
    const ids = clips.map((r) => r.id)
    const slots = {}
    let arrayRefs = 0
    if (ids.length) {
      for (const [table, cols] of SCALAR_SLOTS) {
        for (const col of cols) {
          const n = (await c.query(`select count(*)::int n from ${table} where ${col} = any($1)`, [ids])).rows[0].n
          if (n) slots[`${table}.${col}`] = n
        }
      }
      for (const [table, cols] of ARRAY_SLOTS) {
        for (const col of cols) {
          arrayRefs += (await c.query(`select count(*)::int n from ${table} where ${col} && $1::uuid[]`, [ids])).rows[0].n
        }
      }
    }
    const history = (await c.query(
      `select id, created_at, created_by, reason, restored_at, jsonb_array_length(manifest->'clips') as clips
         from recordist_take_resets where voice_id = $1 order by created_at desc limit 10`, [voiceId])).rows
    return { voiceId, clips: ids.length, slots, arrayRefs, history }
  })
}

async function applyReset({ voiceId, language, spellings, actor, reason = null, connect = defaultConnect }) {
  return withClient(connect, async (c) => {
    await c.query('begin')
    try {
      const clips = (await c.query(
        'select id, voice_id from course_audio where language = $1 and voice_id = any($2) for update',
        [language, spellings])).rows
      if (!clips.length) { await c.query('rollback'); return { resetId: null, archived: 0, slotsEmptied: 0 } }
      const ids = clips.map((r) => r.id)
      const resetId = crypto.randomUUID()
      const tag = `${ARCHIVE_PREFIX}${resetId.slice(0, 8)}-`
      const slots = []
      for (const [table, cols] of SCALAR_SLOTS) {
        for (const col of cols) {
          const found = (await c.query(`select id from ${table} where ${col} = any($1)`, [ids])).rows
          if (!found.length) continue
          const was = (await c.query(`select id, ${col} as was from ${table} where ${col} = any($1)`, [ids])).rows
          for (const r of was) slots.push({ table, column: col, id: r.id, was: r.was })
          await c.query(`update ${table} set ${col} = null where ${col} = any($1)`, [ids])
        }
      }
      await c.query('update course_audio set voice_id = $1 || voice_id where id = any($2)', [tag, ids])
      await c.query(
        `insert into recordist_take_resets (id, voice_id, language, archive_tag, reason, created_by, manifest)
         values ($1,$2,$3,$4,$5,$6,$7)`,
        [resetId, voiceId, language, tag, reason, actor, JSON.stringify({ clips: clips.map((r) => ({ id: r.id, voice_id: r.voice_id })), slots })])
      await c.query('commit')
      invalidateLanguageQueueCache(language)
      return { resetId, archived: clips.length, slotsEmptied: slots.length }
    } catch (err) {
      await c.query('rollback').catch(() => {})
      throw err
    }
  })
}

/** Put a reset back. Never overwrites: a slot or line the artist has since re-filled keeps the new take. */
async function restoreReset({ resetId, actor, connect = defaultConnect }) {
  return withClient(connect, async (c) => {
    await c.query('begin')
    try {
      const row = (await c.query('select * from recordist_take_resets where id = $1 for update', [resetId])).rows[0]
      if (!row) { await c.query('rollback'); return { error: 'No such reset', status: 404 } }
      if (row.restored_at) { await c.query('rollback'); return { error: 'That reset was already restored', status: 409 } }
      const { clips, slots } = row.manifest
      const restored = new Set()
      let blocked = 0
      for (const clip of clips) {
        const cur = (await c.query('select course_code, text_normalized, language, role, voice_id from course_audio where id = $1', [clip.id])).rows[0]
        if (!cur || !cur.voice_id.startsWith(row.archive_tag)) continue
        const clash = (await c.query(
          `select 1 from course_audio where course_code=$1 and text_normalized=$2 and language=$3 and role=$4 and voice_id=$5`,
          [cur.course_code, cur.text_normalized, cur.language, cur.role, clip.voice_id])).rows.length
        if (clash) { blocked += 1; continue }
        await c.query('update course_audio set voice_id = $1 where id = $2', [clip.voice_id, clip.id])
        restored.add(clip.id)
      }
      let slotsRestored = 0
      for (const s of slots) {
        if (!restored.has(s.was)) continue
        const r = await c.query(`update ${s.table} set ${s.column} = $1 where id = $2 and ${s.column} is null`, [s.was, s.id])
        slotsRestored += r.rowCount
      }
      await c.query('update recordist_take_resets set restored_at = now(), restored_by = $2 where id = $1', [resetId, actor])
      await c.query('commit')
      invalidateLanguageQueueCache(row.language)
      return { restored: restored.size, keptArchivedBecauseReRecorded: blocked, slotsRestored }
    } catch (err) {
      await c.query('rollback').catch(() => {})
      throw err
    }
  })
}

module.exports = { previewReset, applyReset, restoreReset, ARCHIVE_PREFIX, SCALAR_SLOTS }
