#!/usr/bin/env node
/**
 * RECONCILE THE CLIP LIBRARY — does every clip we hold answer to a NAMED voice
 * and the words it really says? (job #703, Tom 2026-09-29: "index everything
 * named, then a nightly reconcile reporting drift (target 0)".)
 *
 *   node tools/voices/reconcile-library.cjs                  # report only, writes nothing
 *   node tools/voices/reconcile-library.cjs --apply          # fill missing, drop stale
 *   node tools/voices/reconcile-library.cjs --after <uuid>   # resume a pkey walk
 *   node tools/voices/reconcile-library.cjs --no-snapshot    # full walk, but probe clip_index per batch
 *   node tools/voices/reconcile-library.cjs --apply --only-evidenced
 *       # seconds, not an hour: only the clips something has spoken for (attributions, spoken-text verdicts) —
 *       # what to run right after naming a group
 *
 * Walks course_audio with ONE sequential-scan cursor on a read-only snapshot
 * (job #806; a resume or --only-evidenced walks in primary-key order), asks
 * indexEntryFor with the named-voice resolvers what each clip should be filed
 * under, and compares that with public.clip_index:
 *
 *   ok          the entry is there (or another clip already holds that key)
 *   missing     the clip should be indexed and is not            } DRIFT
 *   stale       an entry points at this clip under words/voice   } DRIFT
 *               it no longer answers to (the unexpanded label)
 *   unresolvable a machine voice nothing names (an ElevenLabs id the voices
 *               table never held, 'elevenlabs', 'azure_') — needs a human to
 *               say what voice it is; listed by voice, not counted as drift
 *   awaiting-name  a person's take nobody has named yet — honest, not drift,
 *               listed with its count until a human names the group
 *   not-indexable  pending upload, failed veracity, no language — by design
 *
 * TARGET: drift 0 (missing + stale — what a machine can fix). awaiting-name and
 * unresolvable are what needs a person, each listed with its count.
 *
 * --apply is INSERT-ONLY for `missing` (the index can only make a hit faster,
 * never turn one into a miss) and deletes a `stale` entry only after logging it
 * so it can be put back. Nothing here touches course_audio. Every statement runs
 * under a 15 s timeout, the walk sleeps between batches, and the first timeout
 * stops it and prints the watermark — the live Supabase is shared by learners,
 * staging, Popty and red.
 *
 * NOT SCHEDULED, and no spoken-text check (Tom, 2026-11-07: "remove any nightly check on gendered
 * clips"). Nothing listens to a gender-expanded clip any more, so one with no clip_spoken_text row
 * stays filed under its label; verdicts already in that table still count. This is a hand-run sync
 * of the clip index, and nothing runs it for you.
 */
const path = require('path')
const fs = require('fs')
const { Client } = require('pg')
const { entriesFromRows, clipLanguageKey, indexEntryFor, COURSE_LANGUAGE_FIELDS } = require('../../services/shared/clip-index.cjs')
const { buildVoiceResolver, whyUnnamed } = require('../../services/shared/named-voices.cjs')

const args = process.argv.slice(2)
const arg = (n, d = null) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d }
const BATCH = Number(arg('--batch', 2000))
const SLEEP_MS = Number(arg('--sleep', 300))
const INDEXED_BY = 'reconcile-703'
const EVIDENCE_DIR = path.join(process.env.HOME || '', 'ssi-evidence/ssi-dashboard-v7/703')
const NIL = '00000000-0000-0000-0000-000000000000'

const sleep = ms => new Promise(r => setTimeout(r, ms))
const log = (...a) => console.error(new Date().toISOString(), ...a)

function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL
  const m = fs.readFileSync(path.join(__dirname, '..', '..', '.env.psql'), 'utf8').match(/DATABASE_URL=["']?([^"'\n]+)/)
  if (!m) throw new Error('DATABASE_URL not found in .env.psql')
  return m[1]
}

/**
 * Where the full walk READS (job #204, /d/d8c4e29d): the walk over course_audio and its clip_index
 * snapshot were the two biggest disk readers on the live database (280 GB + 161 GB in 17 days).
 * When QA_COPY_ENV names the nightly restored QA copy's env file (tools/qa-copy), the walk reads that
 * copy instead. Writes stay on the live connection, and stillAsSeen() re-reads every clip on live by
 * primary key before anything is written, so a copy up to a day old is as safe as the walk's own
 * snapshot: whatever changed since is left for the next night. No file, or no URL in it: live, as before.
 */
function readUrl(envFile = process.env.QA_COPY_ENV) {
  if (envFile && fs.existsSync(envFile)) {
    const m = fs.readFileSync(envFile, 'utf8').match(/^DATABASE_URL=["']?([^"'\n]+)/m)
    if (m) return { url: m[1], side: 'qa-copy' }
  }
  return { url: databaseUrl(), side: 'live' }
}

async function connect(url = databaseUrl()) {
  const client = new Client({ connectionString: url, statement_timeout: 15000, application_name: 'voices-reconcile' })
  await client.connect()
  await client.query("SET statement_timeout = '15s'")
  return client
}

/** Everything the resolvers read — small tables, one query each. */
async function loadContext(client) {
  const q = async sql => (await client.query(sql)).rows
  const [voices, policyRows, attributions, spoken, courses] = await Promise.all([
    q('SELECT voice_id, tts_engine FROM voices'),
    q('SELECT language, voices FROM language_recording_policy'),
    q('SELECT audio_id, voice_id FROM human_clip_attribution'),
    q('SELECT audio_id, spoken_text FROM clip_spoken_text'),
    q(`SELECT ${COURSE_LANGUAGE_FIELDS} FROM courses`),
  ])
  const resolvers = buildVoiceResolver({ voices, policyRows, attributions, spoken })
  const map = new Map(courses.map(c => [c.course_code, c]))
  return { resolvers, courseOf: code => map.get(code) || null }
}

// ── what the index holds ────────────────────────────────────────────────────

const keyOf = (l, k, v) => `${l}\u001f${k}\u001f${v}`
const keyParts = key => { const [language, text_key, voice_id] = key.split('\u001f'); return { language, text_key, voice_id } }

/** Per batch, from the database: the pkey walk's path, and the small residue checks. */
async function indexFromDb(client, ids, entries) {
  const [byClip, byKey] = await Promise.all([
    ids.length ? client.query('SELECT audio_id, language, text_key, voice_id FROM clip_index WHERE audio_id = ANY($1::uuid[])', [ids]) : { rows: [] },
    entries.length ? client.query(
      `SELECT c.language, c.text_key, c.voice_id, c.audio_id FROM clip_index c
         JOIN unnest($1::text[], $2::text[], $3::text[]) AS k(language, text_key, voice_id)
           ON c.language = k.language AND c.text_key = k.text_key AND c.voice_id = k.voice_id`,
      [entries.map(e => e.language), entries.map(e => e.text_key), entries.map(e => e.voice_id)]) : { rows: [] },
  ])
  const held = new Set(byKey.rows.map(r => keyOf(r.language, r.text_key, r.voice_id)))
  const ownKeys = new Map()
  for (const r of byClip.rows) { (ownKeys.get(r.audio_id) || ownKeys.set(r.audio_id, []).get(r.audio_id)).push(r) }
  return { held, ownKeys }
}

/**
 * The whole clip_index, read ONCE by a sequential-scan cursor on the read
 * connection (job #806). Probing it per batch by key and by audio_id was ~5 s
 * of random reads per 2,000 clips; one sequential pass is seconds for all of
 * it, and a plain seq scan of a table this size reads through Postgres's
 * small bulk-read ring rather than the shared cache learners use. Key strings
 * are shared by the Set and the Map: ~2.3M entries, ~1.3 GB RSS, once a night.
 */
async function loadIndexSnapshot(rd, fetchSize = 20000) {
  const snap = { held: new Set(), byAudio: new Map(), size: 0 }
  await rd.query('DECLARE ci NO SCROLL CURSOR FOR SELECT audio_id, language, text_key, voice_id FROM clip_index')
  for (;;) {
    const { rows } = await rd.query(`FETCH ${fetchSize} FROM ci`)
    if (!rows.length) break
    for (const r of rows) snapAdd(snap, r.audio_id, keyOf(r.language, r.text_key, r.voice_id))
  }
  await rd.query('CLOSE ci')
  return snap
}
function snapAdd(snap, audioId, key) {
  if (!snap.held.has(key)) { snap.held.add(key); snap.size++ }
  const own = snap.byAudio.get(audioId)
  if (!own) snap.byAudio.set(audioId, key)
  else if (Array.isArray(own)) { if (!own.includes(key)) own.push(key) }
  else if (own !== key) snap.byAudio.set(audioId, [own, key])
}
function snapDrop(snap, audioId, key) {
  if (snap.held.delete(key)) snap.size--
  const own = snap.byAudio.get(audioId)
  if (own === key) snap.byAudio.delete(audioId)
  else if (Array.isArray(own)) { const rest = own.filter(k => k !== key); if (rest.length) snap.byAudio.set(audioId, rest.length === 1 ? rest[0] : rest); else snap.byAudio.delete(audioId) }
}

/**
 * Per batch, from the snapshot — then the RESIDUE re-checked live, so a verdict
 * of missing or stale is never an artefact of the snapshot's age: a key the
 * snapshot lacks is looked up by key, and a clip the snapshot says is filed
 * under some other key is looked up by audio_id. Both residues are a handful
 * of rows, where the old per-batch probes were all 2,000.
 */
async function indexFromSnapshot(client, snap, rows, wanted) {
  const held = new Set(), ownKeys = new Map()
  const unknown = [], suspect = []
  for (const [, e] of wanted) {
    const k = keyOf(e.language, e.text_key, e.voice_id)
    if (snap.held.has(k)) held.add(k); else unknown.push(e)
  }
  for (const r of rows) {
    const own = snap.byAudio.get(r.id)
    if (!own) continue
    const keys = Array.isArray(own) ? own : [own]
    const e = wanted.get(r.id)
    const want = e ? keyOf(e.language, e.text_key, e.voice_id) : null
    if (keys.some(k => k !== want)) suspect.push(r.id)
    else ownKeys.set(r.id, keys.map(k => ({ audio_id: r.id, ...keyParts(k) })))
  }
  if (unknown.length || suspect.length) {
    const live = await indexFromDb(client, suspect, unknown)
    for (const k of live.held) held.add(k)
    for (const [id, own] of live.ownKeys) ownKeys.set(id, own)
  }
  return { held, ownKeys }
}

/**
 * Of these clip ids, the ones whose course_audio row still holds exactly what
 * the walk's snapshot read (every field indexEntryFor looks at). A deleted row
 * is simply absent. Job #806.
 */
const SEEN_FIELDS = ['course_code', 'text', 'language', 'role', 'voice_id', 's3_key', 'origin', 'veracity_pass']
async function stillAsSeen(client, ids, seenRows, { lock = false } = {}) {
  const ok = new Set()
  if (!ids.length) return ok
  const seen = new Map(seenRows.map(r => [r.id, r]))
  // lock: called inside the write transaction — FOR SHARE holds every row it
  // returns until COMMIT; ORDER BY id keeps lock order fixed.
  const { rows } = await client.query(`SELECT id, ${SEEN_FIELDS.join(', ')} FROM course_audio WHERE id = ANY($1::uuid[])${lock ? ' ORDER BY id FOR SHARE' : ''}`, [ids])
  for (const r of rows) {
    const was = seen.get(r.id)
    if (was && SEEN_FIELDS.every(f => r[f] === was[f])) ok.add(r.id)
  }
  return ok
}

// ── the walk ────────────────────────────────────────────────────────────────

async function reconcile(client, { apply = false, after = NIL, batch = BATCH, sleepMs = SLEEP_MS, maxBatches = Infinity, onlyEvidenced = false, snapshot = true, read = readUrl(), openRead = () => connect(read.url) } = {}) {
  const { resolvers, courseOf } = await loadContext(client)
  const t = { read: 0, ok: 0, missing: 0, stale: 0, unresolvable: 0, awaitingName: 0, notIndexable: {}, inserted: 0, dropped: 0, batches: 0, watermark: after }
  const awaiting = {}
  const staleLog = []
  const unresolvableVoices = {}
  // ONE SNAPSHOT, TWO SEQUENTIAL SCANS (job #806, adversary #828·P). A full
  // walk opens a second, READ ONLY REPEATABLE READ connection and reads both
  // course_audio and clip_index through plain seq-scan cursors: sequential IO
  // through the bulk-read ring, so the walk no longer empties the 512 MB cache
  // learners share; and one consistent snapshot, so no row is missed or counted
  // twice when an update moves it (course_audio updates are almost never HOT).
  // The pkey walk it replaces read the table in uuid order — every row on a
  // different page, ~34M random block reads a fortnight. Residue checks and
  // --apply writes run on the main connection, against the live index. The
  // cost: the read snapshot holds back vacuum's horizon for the few minutes
  // the walk takes, at 00:21Z. --after <uuid> and --only-evidenced keep the
  // pkey walk (a resume point is a uuid; the evidenced set is small).
  const full = !onlyEvidenced && after === NIL
  t.walk = full ? 'seqscan' : 'pkey'
  let rd = null, snap = null
  if (full) {
    t.walkReads = read.side
    log(`walk reads: ${read.side}`)
    rd = await openRead()
    await rd.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
    // From block 0 every night, not wherever another scan happens to be: the
    // walk is then reproducible row for row, and A/B-able (job #806).
    await rd.query('SET LOCAL synchronize_seqscans = off')
    if (snapshot) { snap = await loadIndexSnapshot(rd); t.snapshotEntries = snap.size; log(`clip_index snapshot: ${snap.size} entries`) }
    await rd.query('DECLARE ca NO SCROLL CURSOR FOR SELECT id, course_code, text, language, role, voice_id, s3_key, origin, veracity_pass FROM course_audio')
  }
  try {
  for (;;) {
    let rows
    if (full) {
      ;({ rows } = await rd.query(`FETCH ${Number(batch)} FROM ca`))
      if (!rows.length) break
    } else {
      ;({ rows } = await client.query(
        `SELECT id, course_code, text, language, role, voice_id, s3_key, origin, veracity_pass FROM course_audio WHERE id > $1${onlyEvidenced ? ' AND id IN (SELECT audio_id FROM clip_spoken_text UNION SELECT audio_id FROM human_clip_attribution)' : ''} ORDER BY id LIMIT $2`, [t.watermark, batch]))
      if (!rows.length) break
    }
    t.read += rows.length

    // what each clip should be filed under
    const wanted = new Map() // audio_id -> entry
    for (const row of rows) {
      const e = indexEntryFor(row, INDEXED_BY, courseOf, resolvers)
      if (e.skip) {
        if (e.skip === 'voice-unnamed') {
          const why = whyUnnamed(row)
          if (why === 'awaiting-name') { t.awaitingName++; const k = `${row.course_code}/${row.role}`; awaiting[k] = (awaiting[k] || 0) + 1; continue }
          t.unresolvable++; unresolvableVoices[row.voice_id] = (unresolvableVoices[row.voice_id] || 0) + 1; continue
        }
        t.notIndexable[e.skip] = (t.notIndexable[e.skip] || 0) + 1
        continue
      }
      wanted.set(row.id, e)
    }

    // what the index holds: entries for these clips, and holders of the wanted keys
    const { held, ownKeys } = snap
      ? await indexFromSnapshot(client, snap, rows, wanted)
      : await indexFromDb(client, rows.map(r => r.id), [...wanted.values()])

    const toInsert = new Map()
    for (const [id, e] of wanted) {
      const k = keyOf(e.language, e.text_key, e.voice_id)
      if (held.has(k)) t.ok++
      else { t.missing++; if (!toInsert.has(k)) toInsert.set(k, e) }
      for (const own of ownKeys.get(id) || []) {
        if (keyOf(own.language, own.text_key, own.voice_id) !== k) { t.stale++; staleLog.push({ audio_id: id, ...own }) }
      }
    }
    // an entry pointing at a clip that should NOT be indexed at all is stale too
    for (const [id, own] of ownKeys) {
      if (wanted.has(id)) continue
      for (const o of own) { t.stale++; staleLog.push({ audio_id: id, ...o }) }
    }

    if (apply) {
      // The full walk reads a SNAPSHOT up to the whole walk old, but these
      // writes land on live data (job #806, adversary round 2): a clip whose
      // words or voice changed meanwhile would be filed under its OLD key —
      // library-first reuse would then serve audio that says something else —
      // and its correct entry dropped as stale; a clip deleted meanwhile would
      // fail the insert's foreign key and stop the night. So write only for
      // clips still exactly as seen (re-read by primary key: a handful a batch);
      // the rest wait for tomorrow's walk, which sees them as they are.
      // The check and the writes are ONE transaction, and the check holds FOR
      // SHARE on the clips it passed, so none can change between being found
      // as seen and being written (cross-family check #849·P: a separate
      // re-read left that gap open). Writers to those rows wait milliseconds.
      let asSeen = null
      if (full) {
        await client.query('BEGIN')
        const ids = [...new Set([...[...toInsert.values()].map(e => e.audio_id), ...staleLog.map(x => x.audio_id)])]
        asSeen = await stillAsSeen(client, ids, rows, { lock: true })
      }
      try {
      const es = [...toInsert.values()].filter(e => !asSeen || asSeen.has(e.audio_id))
      t.changedSinceSnapshot = (t.changedSinceSnapshot || 0) + (toInsert.size - es.length)
      if (es.length) {
        const col = f => es.map(e => e[f])
        const r = await client.query(
          `INSERT INTO clip_index (language, text_key, voice_id, audio_id, origin, indexed_by)
           SELECT k.* FROM unnest($1::text[], $2::text[], $3::text[], $4::uuid[], $5::text[], $6::text[])
                    AS k(language, text_key, voice_id, audio_id, origin, indexed_by)
             JOIN course_audio ca ON ca.id = k.audio_id
           ON CONFLICT (language, text_key, voice_id) DO NOTHING RETURNING 1`,
          [col('language'), col('text_key'), col('voice_id'), col('audio_id'), col('origin'), col('indexed_by')])
        t.inserted += r.rowCount
        if (snap) for (const e of es) snapAdd(snap, e.audio_id, keyOf(e.language, e.text_key, e.voice_id))
      }
      const staleAll = staleLog.splice(0)
      const stale = staleAll.filter(x => !asSeen || asSeen.has(x.audio_id))
      t.changedSinceSnapshot += staleAll.length - stale.length
      if (stale.length) {
        fs.mkdirSync(EVIDENCE_DIR, { recursive: true })
        fs.appendFileSync(path.join(EVIDENCE_DIR, 'clip_index-stale-dropped.jsonl'), stale.map(s => JSON.stringify(s)).join('\n') + '\n')
        const r = await client.query(
          `DELETE FROM clip_index c USING unnest($1::text[], $2::text[], $3::text[], $4::uuid[]) AS k(language, text_key, voice_id, audio_id)
            WHERE c.language = k.language AND c.text_key = k.text_key AND c.voice_id = k.voice_id AND c.audio_id = k.audio_id`,
          [stale.map(s => s.language), stale.map(s => s.text_key), stale.map(s => s.voice_id), stale.map(s => s.audio_id)])
        t.dropped += r.rowCount
        if (snap) for (const x of stale) snapDrop(snap, x.audio_id, keyOf(x.language, x.text_key, x.voice_id))
      }
      if (full) await client.query('COMMIT')
      } catch (e) {
        if (full) await client.query('ROLLBACK').catch(() => {})
        throw e
      }
    }
    if (!full) t.watermark = rows[rows.length - 1].id
    t.batches++
    if (t.batches % 50 === 0) log(`batch ${t.batches} read=${t.read} missing=${t.missing} stale=${t.stale} ${full ? '(seqscan)' : `watermark=${t.watermark}`}`)
    if (rows.length < batch || t.batches >= maxBatches) break
    // The pause throttled the pkey walk's random reads; the full walk reads
    // sequentially, and pausing only lengthens the read snapshot's hold on
    // vacuum (1,445 x 300 ms = 7 min idle in transaction).
    if (!full) await sleep(sleepMs)
  }
  } finally {
    if (rd) { await rd.query('ROLLBACK').catch(() => {}); await rd.end().catch(() => {}) }
  }
  t.drift = t.missing + t.stale
  return { ...t, awaiting, unresolvableVoices }
}

async function main() {
  const apply = args.includes('--apply')
  const client = await connect()
  try {
    const report = await reconcile(client, { apply, after: arg('--after', NIL), maxBatches: Number(arg('--max-batches', Infinity)), snapshot: !args.includes('--no-snapshot'), onlyEvidenced: args.includes('--only-evidenced') })
    console.log(JSON.stringify({ apply, ...report }, null, 2))
  } catch (e) {
    log(`STOPPED: ${e.code === '57014' ? 'STATEMENT TIMEOUT' : 'ERROR'}: ${e.message}`)
    process.exit(2)
  } finally { await client.end().catch(() => {}) }
}

if (require.main === module) main()
module.exports = { reconcile, readUrl, stillAsSeen, loadIndexSnapshot, indexFromSnapshot, loadContext, connect }
