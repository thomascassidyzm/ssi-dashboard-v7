/**
 * THE RE-RECORD GATE — no clip that already works is ever rendered again
 * without Tom's express permission.
 *
 * Tom, 2026-10-11 (r-2026-10-11): "there shouldn't be any re-recording done
 * without express permission by me." Asked after the ara_lb_for_eng resume
 * (#355/#195) planned 13,881 renders for a course that already plays Azure
 * Lebanese voices; see also the HARD RULE of 2026-09-20: a voice change never
 * re-renders existing audio.
 *
 * WHAT COUNTS AS A RE-RECORD. Filling a slot that has no clip is never one —
 * /generate, pods and every fill path render only NULL slots, and the door asks
 * every course's library before paying. A render can only replace a working
 * clip when its caller tells the door what it is replacing (`door.replacing`:
 * every /regenerate-* route and the /api/audio/render re-record do), or when
 * /api/audio/render is asked for words this course's slot role already holds
 * in another voice (`door.slotRole`, a re-voice). So a render is a RE-RECORD
 * when one of the clips it names
 *   - is still USABLE: a real file (not a <2000-byte dead stub), and
 *   - is still CURRENT: it speaks THESE words, or it is still linked in a
 *     phrase/LEGO known/target1/target2 slot, or the caller says it is a
 *     re-record whatever the words (`door.forceRerecord`). A text edit is new
 *     audio: the DB triggers null_phrase_audio_on_text_change /
 *     null_lego_audio_on_text_change unlink a slot's clip when its text changes,
 *     so the old clip is neither linked nor of these words. "Still linked" is
 *     what catches renders whose spoken words differ from the stored label —
 *     gender expansion and pronunciation overrides (course_audio.text is the
 *     lookup key, not always what was spoken).
 * A veracity-failed clip still counts as usable: the transcript check is a
 * signal for a human, not a licence to re-render.
 *
 * PERMISSION is a row in public.tts_rerecord_permissions, written only by
 * `TOM_SAID_RERECORD=yes node tools/audio/rerecord-permission.cjs grant …`:
 * course (+ optional roles), signed `by` Tom with his words in `why`, in date
 * (at most 31 days), not revoked, optional max_clips. No row → the door throws
 * RerecordRefusal (403 RERECORD_NOT_PERMITTED) before a character is sent.
 * Every refusal and every permitted re-record is written to tts_rerecord_log.
 */
const chain = require('./chain-context.cjs')
const { audioKeyCandidates } = require('./text-normalize.cjs')

const DEAD_STUB_BYTES = 2000   // same line as idx_course_audio_dead_stubs: below this a clip is not playable audio
const MAX_DAYS = 31
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

class RerecordRefusal extends Error {
  constructor(message, detail = {}) {
    super(`TTS door (403) RERECORD_NOT_PERMITTED: ${message}`)
    this.name = 'RerecordRefusal'
    this.code = 'RERECORD_NOT_PERMITTED'
    this.status = 403
    this.detail = detail
  }
}

/** A clip someone could play right now. */
function isUsable(row) {
  return !!row && !String(row.s3_key || '').startsWith('pending/') && (row.file_size_bytes == null || row.file_size_bytes >= DEAD_STUB_BYTES)
}

/** Is this permission row Tom's, in date, unrevoked and covering the role? */
function permissionCovers(p, { courseCode, role, now = Date.now() }) {
  if (!p || p.course_code !== courseCode || p.revoked_at) return false
  if (!/^\s*tom\b/i.test(String(p.by || '')) || !String(p.why || '').trim()) return false
  const at = Date.parse(p.at), until = Date.parse(p.until)
  if (!(until > now) || !(until <= at + MAX_DAYS * 86400e3)) return false
  if (Array.isArray(p.roles) && p.roles.length && !p.roles.includes(role)) return false
  if (p.max_clips != null && (p.used || 0) >= p.max_clips) return false
  return true
}

/**
 * The clips a render would replace that still work and speak these words.
 * Pure: `rows` are the course_audio rows the caller named.
 */
function replacedUsable(rows, { text, force = false, linked = new Set() }) {
  const keys = new Set(audioKeyCandidates(text))
  return rows.filter(r => isUsable(r) && (force || keys.has(r.text_normalized) || linked.has(r.id)))
}

/**
 * The door's question. Returns null when this is not a re-record, or the
 * permission that allows it; throws RerecordRefusal otherwise.
 *
 * @param {object} want { text, language, voiceId, courseCode, replacing?, slotRole?, voiceBound?, forceRerecord?, dryRun?, job? }
 * @param {object} store { replacedRows(ids, keys), stillLinked(ids), sameWordsOtherVoice(want), permissions(courseCode), log(entry) }
 */
async function assertMayRerecord(want, store = rerecordStore()) {
  const named = [].concat(want.replacing || []).filter(Boolean).map(String)
  let rows = []
  if (named.length) {
    if (!want.courseCode) throw new RerecordRefusal(`a render replacing ${named.join(', ')} names no course — the gate cannot check what it replaces`, { replacing: named })
    rows = (await store.replacedRows(named.filter(x => UUID.test(x)), named.filter(x => !UUID.test(x)), want.courseCode))
      .filter(r => r.course_code === want.courseCode)
  } else if (want.slotRole && want.voiceBound && want.courseCode) {
    rows = await store.sameWordsOtherVoice(want)
  }
  const usable = rows.filter(isUsable)
  const linked = usable.length && named.length ? await store.stillLinked(usable.map(r => r.id)) : new Set()
  const hits = replacedUsable(usable, { text: want.text, force: !!want.forceRerecord, linked })
  if (!hits.length) return null

  const role = hits[0].role
  const perms = await store.permissions(want.courseCode)
  const p = perms.find(x => permissionCovers(x, { courseCode: want.courseCode, role }))
  const entry = {
    course_code: want.courseCode || null, role, language: want.language || null, voice_id: want.voiceId || null,
    text: String(want.text).slice(0, 500), replaced_audio_ids: hits.map(h => h.id),
    origin: chain.origin(), job: want.job || null, dry_run: !!want.dryRun,
  }
  if (!p) {
    try { await store.log({ ...entry, kind: 'refused', note: hits.map(h => `${h.id} ${h.voice_id} ${h.role}`).join('; ').slice(0, 500) }) } catch (e) { console.error(`[rerecord-gate] refusal not logged: ${e.message}`) }
    const msg = `${want.courseCode} ${role} "${String(want.text).slice(0, 60)}" already has a working clip (${hits.map(h => `${h.id} in ${h.voice_id}`).join(', ')}). ` +
      `Re-recording needs Tom's express permission (Tom 2026-10-11): TOM_SAID_RERECORD=yes node tools/audio/rerecord-permission.cjs grant ${want.courseCode} … — do not retry or route around this.`
    console.warn(`[rerecord-gate] REFUSED ${msg}`)
    throw new RerecordRefusal(msg, entry)
  }
  if (!want.dryRun) {
    // Check-then-log across two calls let two concurrent requests both pass a max_clips:1 grant (#229): the use is
    // reserved in ONE atomic step (the store locks the permission, rechecks the count, inserts), and a spent grant refuses.
    const used = { ...entry, kind: 'permitted', permission_id: p.id, note: `Tom's permission #${p.id}: ${String(p.why).slice(0, 200)}` }
    if (!(await store.reserve(p.id, used))) {
      try { await store.log({ ...entry, kind: 'refused', note: `permission #${p.id} spent by a concurrent request` }) } catch (e) { console.error(`[rerecord-gate] refusal not logged: ${e.message}`) }
      throw new RerecordRefusal(`${want.courseCode} ${role}: Tom's permission #${p.id} was used up by a concurrent re-record — do not retry or route around this.`, entry)
    }
  }
  return p
}

/** The live store: course_audio + the two tables, through the service role. */
function supabaseRerecordStore({ supabase } = {}) {
  let client = supabase
  const db = () => {
    if (!client) {
      if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) throw new Error('re-record gate: SUPABASE_URL / SUPABASE_SERVICE_KEY not set — refusing to render a replacement it cannot check')
      const { createClient } = require('@supabase/supabase-js')
      client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
    }
    return client
  }
  const COLS = 'id, course_code, role, language, voice_id, text_normalized, s3_key, file_size_bytes'
  const must = (r, what) => { if (r.error) throw new Error(`re-record gate: ${what} unreadable (${r.error.message}) — refusing to render blind`); return r.data || [] }
  return {
    async replacedRows(ids, keys, courseCode) {
      const out = []
      if (ids.length) out.push(...must(await db().from('course_audio').select(COLS).in('id', ids), 'course_audio'))
      // s3_key has no index on the 2.6M-row table: scope by course (indexed) or the read times out (seen live 2026-10-11).
      if (keys.length) out.push(...must(await db().from('course_audio').select(COLS).eq('course_code', courseCode).in('s3_key', keys), 'course_audio'))
      return [...new Map(out.map(r => [r.id, r])).values()]
    },
    /** Ids still linked as a phrase's or LEGO's known/target1/target2 clip — the audio a learner hears now. */
    async stillLinked(ids) {
      const list = ids.join(',')
      const filter = `known_audio_id.in.(${list}),target1_audio_id.in.(${list}),target2_audio_id.in.(${list})`
      const out = new Set()
      for (const table of ['course_practice_phrases', 'course_legos']) {
        for (const r of must(await db().from(table).select('known_audio_id, target1_audio_id, target2_audio_id').or(filter).limit(1000), table)) {
          for (const v of [r.known_audio_id, r.target1_audio_id, r.target2_audio_id]) if (v && ids.includes(v)) out.add(v)
        }
      }
      return out
    },
    async sameWordsOtherVoice({ courseCode, slotRole, language, voiceId, text }) {
      const rows = must(await db().from('course_audio').select(COLS).eq('course_code', courseCode).eq('role', slotRole)
        .in('text_normalized', audioKeyCandidates(text)), 'course_audio')
      return rows.filter(r => (!language || r.language === language) && r.voice_id !== voiceId)
    },
    async permissions(courseCode) {
      const perms = must(await db().from('tts_rerecord_permissions').select('*').eq('course_code', courseCode).is('revoked_at', null), 'tts_rerecord_permissions')
      for (const p of perms) {
        if (p.max_clips == null) continue
        const { count, error } = await db().from('tts_rerecord_log').select('id', { count: 'exact', head: true }).eq('permission_id', p.id).eq('kind', 'permitted')
        if (error) throw new Error(`re-record gate: tts_rerecord_log unreadable (${error.message})`)
        p.used = count || 0
      }
      return perms
    },
    /** Atomic: public.reserve_rerecord_use locks the permission row, rechecks max_clips, inserts the 'permitted' row. */
    async reserve(permissionId, entry) {
      const { data, error } = await db().rpc('reserve_rerecord_use', { p_permission_id: permissionId, p_entry: entry })
      if (error) throw new Error(`re-record gate: reserve failed (${error.message}) — refusing to render unreserved`)
      return data === true
    },
    async log(entry) {
      const { error } = await db().from('tts_rerecord_log').insert(entry)
      if (error) throw new Error(`re-record gate: log write failed (${error.message})`)
    },
  }
}

/** Fixed rows, for tests: { clips, permissions } and a `logged` array to read back. */
function memoryRerecordStore({ clips = [], permissions = [] } = {}) {
  const logged = []
  return {
    logged,
    async replacedRows(ids, keys) { return clips.filter(c => ids.includes(c.id) || keys.includes(c.s3_key)) },
    async stillLinked(ids) { return new Set(clips.filter(c => c.linked && ids.includes(c.id)).map(c => c.id)) },
    async sameWordsOtherVoice({ courseCode, slotRole, language, voiceId, text }) {
      const k = new Set(audioKeyCandidates(text))
      return clips.filter(c => c.course_code === courseCode && c.role === slotRole && k.has(c.text_normalized) && (!language || c.language === language) && c.voice_id !== voiceId)
    },
    async permissions(courseCode) {
      return permissions.filter(p => p.course_code === courseCode && !p.revoked_at)
        .map(p => ({ ...p, used: logged.filter(l => l.kind === 'permitted' && l.permission_id === p.id).length }))
    },
    async log(entry) { logged.push(entry) },
    async reserve(permissionId, entry) {   // synchronous check+push = the atomicity the SQL function gives
      const p = permissions.find(x => x.id === permissionId)
      if (!p || p.revoked_at) return false
      if (p.max_clips != null && logged.filter(l => l.kind === 'permitted' && l.permission_id === permissionId).length >= p.max_clips) return false
      logged.push(entry)
      return true
    },
  }
}

let active = null
/** The store the door asks. Tests get an empty memory store unless they inject one. */
function rerecordStore() {
  if (!active) active = process.env.VITEST ? memoryRerecordStore() : supabaseRerecordStore()
  return active
}
function useRerecordStore(s) { active = s }

module.exports = {
  assertMayRerecord, permissionCovers, replacedUsable, isUsable, RerecordRefusal,
  supabaseRerecordStore, memoryRerecordStore, rerecordStore, useRerecordStore, DEAD_STUB_BYTES,
}
