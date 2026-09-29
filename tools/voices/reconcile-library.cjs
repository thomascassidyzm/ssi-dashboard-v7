#!/usr/bin/env node
/**
 * RECONCILE THE CLIP LIBRARY — does every clip we hold answer to a NAMED voice
 * and the words it really says? (job #703, Tom 2026-09-29: "index everything
 * named, then a nightly reconcile reporting drift (target 0)".)
 *
 *   node tools/voices/reconcile-library.cjs                  # report only, writes nothing
 *   node tools/voices/reconcile-library.cjs --apply          # refresh spoken-text evidence, fill missing, drop stale
 *   node tools/voices/reconcile-library.cjs --after <uuid>   # resume a walk
 *
 * Walks course_audio in primary-key order (never a scan of the index), asks
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
 * SPOKEN-TEXT EVIDENCE. A gender-expanded take is stored under its unexpanded
 * label. Whether the clip SAYS the expansion is a fact about its audio, not its
 * row — see CANDIDATES_SQL for why an object date only nominates and whisper
 * decides. Verdicts are recorded in clip_spoken_text.
 */
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')
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

async function connect() {
  const client = new Client({ connectionString: databaseUrl(), statement_timeout: 15000, application_name: 'voices-reconcile' })
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

// ── spoken-text evidence ────────────────────────────────────────────────────

function s3Head(key) {
  const region = process.env.AWS_REGION || 'eu-west-1', bucket = process.env.S3_AUDIO_BUCKET || process.env.S3_BUCKET || 'ssi-audio-stage'
  return new Promise(resolve => {
    const c = spawn('curl', ['-sI', '--max-time', '20', '--aws-sigv4', `aws:amz:${region}:s3`, '--user', `${process.env.AWS_ACCESS_KEY_ID}:${process.env.AWS_SECRET_ACCESS_KEY}`,
      `https://${bucket}.s3.${region}.amazonaws.com/${key}`])
    let out = ''
    c.stdout.on('data', d => { out += d }); c.stderr.on('data', () => {})
    c.on('close', () => {
      if (!/^HTTP\/[\d.]+ 200/.test(out)) return resolve(null)
      const m = out.match(/^last-modified:\s*(.+)$/im)
      resolve(m ? new Date(m[1].trim()) : null)
    })
  })
}

/**
 * The clip's row says its label; does its audio say the expansion? Candidates only.
 *
 * TWO STEPS, because one was not enough (whisper-checked, job #703):
 *   1. S3 HEAD. An object written BEFORE the expansion row existed cannot say the
 *      expansion: it says its label (18/18 whisper-verified, hrv/heb/pol/rus).
 *   2. An object written AFTER might — phase8 applies the expansion at render time
 *      — but not every writer does: Italian rows Kai re-rendered on 2026-09 carry
 *      revision 2 and a fresh object and still say the LABEL (4/4 whisper-heard),
 *      because the one render route (POST /api/audio/render) speaks the text it is
 *      given. So the object date only nominates; whisper decides, and a clip is
 *      re-filed under the expansion only when the decode is CLOSER to the expansion
 *      than to the label by at least one character. Anything else stays under its
 *      label — the status quo — and is counted as undecided.
 */
const CANDIDATES_SQL = `
  SELECT ca.id, ca.s3_key, ca.text, ca.language, ca.audio_revision, e.processed_at,
         CASE WHEN ca.role = 'target1' THEN e.expanded_f ELSE e.expanded_m END AS spoken
    FROM course_audio ca
    JOIN course_gender_expansions e
      ON e.course_code = ca.course_code AND e.original_text = ca.text AND e.language = ca.language AND e.text_side = 'target'
    LEFT JOIN clip_spoken_text s ON s.audio_id = ca.id
   WHERE ca.role IN ('target1', 'target2') AND ca.origin = 'tts' AND ca.s3_key NOT LIKE 'pending/%'
     AND (CASE WHEN ca.role = 'target1' THEN e.expanded_f ELSE e.expanded_m END) IS NOT NULL
     AND lower(CASE WHEN ca.role = 'target1' THEN e.expanded_f ELSE e.expanded_m END) <> lower(ca.text)
     AND (ca.created_at >= e.processed_at OR ca.audio_revision > 1)
     AND (s.audio_id IS NULL OR s.audio_revision < ca.audio_revision)`

/** Whisper's verdict between two readings of one clip. Pure — tested. */
function judgeHeard(heard, label, expansion, characterErrorRate, normalise) {
  const len = t => normalise(t).length
  const dLabel = characterErrorRate(label, heard) * len(label)
  const dExp = characterErrorRate(expansion, heard) * len(expansion)
  const cerExp = characterErrorRate(expansion, heard), cerLabel = characterErrorRate(label, heard)
  if (dLabel - dExp >= 1 && cerExp <= 0.35) return 'says-expansion'
  if (dExp - dLabel >= 1 && cerLabel <= 0.35) return 'says-label'
  return 'undecided'
}

async function refreshSpokenEvidence(client, { apply, par = 2, limit = 0, headPar = 6 } = {}) {
  const veracity = require('../../services/audio-veracity.cjs')
  const evidenceLog = path.join(EVIDENCE_DIR, 'spoken-text-decodes.jsonl')
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true })
  await client.query("SET statement_timeout = '120s'")
  const { rows } = await client.query(CANDIDATES_SQL + (limit ? ` LIMIT ${limit}` : ''))
  await client.query("SET statement_timeout = '15s'")
  const tally = { candidates: rows.length, before_expansion: 0, says_expansion: 0, says_label: 0, undecided: 0, unreadable: 0 }
  const verdicts = []
  const flush = async () => {
    if (!apply || !verdicts.length) return
    const b = verdicts.splice(0), col = f => b.map(v => v[f])
    await client.query(
      `INSERT INTO clip_spoken_text (audio_id, spoken_text, basis, audio_revision)
       SELECT * FROM unnest($1::uuid[], $2::text[], $3::text[], $4::int[])
       ON CONFLICT (audio_id) DO UPDATE SET spoken_text = excluded.spoken_text, basis = excluded.basis,
         audio_revision = excluded.audio_revision, checked_at = now()`,
      [col('audio_id'), col('spoken_text'), col('basis'), col('audio_revision')])
  }
  // step 1: S3 HEAD nominates
  const nominated = []
  let i = 0
  await Promise.all(Array.from({ length: headPar }, async () => {
    while (i < rows.length) {
      const r = rows[i++]
      const lm = await s3Head(r.s3_key)
      if (!lm) { tally.unreadable++; continue }
      if (lm < new Date(r.processed_at)) {
        tally.before_expansion++
        verdicts.push({ audio_id: r.id, spoken_text: r.text, audio_revision: r.audio_revision, basis: 's3-written-before-expansion' })
      } else nominated.push(r)
    }
  }))
  await flush()
  // step 2: whisper decides
  const iso1Of = lang => veracity.WHISPER_ISO1[lang] || null
  let j = 0, done = 0
  await Promise.all(Array.from({ length: par }, async () => {
    while (j < nominated.length) {
      const r = nominated[j++]
      let verdict = 'undecided', heard = null
      try {
        const buf = await s3Get(r.s3_key)
        heard = await veracity.decodeAudio(buf, iso1Of(r.language))
        verdict = judgeHeard(heard, r.text, r.spoken, veracity.characterErrorRate, veracity.normalise)
      } catch (e) { heard = `ERROR ${e.message}`.slice(0, 200); tally.unreadable++ }
      if (verdict === 'says-expansion') tally.says_expansion++
      else if (verdict === 'says-label') tally.says_label++
      else tally.undecided++
      fs.appendFileSync(evidenceLog, JSON.stringify({ audio_id: r.id, verdict, heard, label: r.text, expansion: r.spoken }) + '\n')
      // undecided is filed under the label, exactly as before: only an affirmative hearing moves a clip
      verdicts.push({ audio_id: r.id, spoken_text: verdict === 'says-expansion' ? r.spoken : r.text, audio_revision: r.audio_revision, basis: `whisper-small:${verdict}` })
      if (verdicts.length >= 100) await flush()
      if (++done % 200 === 0) log(`whisper ${done}/${nominated.length}`)
    }
  }))
  await flush()
  return tally
}

function s3Get(key) {
  const region = process.env.AWS_REGION || 'eu-west-1', bucket = process.env.S3_AUDIO_BUCKET || process.env.S3_BUCKET || 'ssi-audio-stage'
  return new Promise((resolve, reject) => {
    const c = spawn('curl', ['-sf', '--max-time', '60', '--aws-sigv4', `aws:amz:${region}:s3`, '--user', `${process.env.AWS_ACCESS_KEY_ID}:${process.env.AWS_SECRET_ACCESS_KEY}`,
      `https://${bucket}.s3.${region}.amazonaws.com/${key}`])
    const out = []
    c.stdout.on('data', d => out.push(d)); c.stderr.on('data', () => {})
    c.on('close', code => code === 0 ? resolve(Buffer.concat(out)) : reject(new Error(`s3 get ${key}: curl exit ${code}`)))
  })
}

// ── the walk ────────────────────────────────────────────────────────────────

async function reconcile(client, { apply = false, after = NIL, batch = BATCH, sleepMs = SLEEP_MS, maxBatches = Infinity } = {}) {
  const { resolvers, courseOf } = await loadContext(client)
  const t = { read: 0, ok: 0, missing: 0, stale: 0, unresolvable: 0, awaitingName: 0, notIndexable: {}, inserted: 0, dropped: 0, batches: 0, watermark: after }
  const awaiting = {}
  const staleLog = []
  const unresolvableVoices = {}
  for (;;) {
    const { rows } = await client.query(
      `SELECT id, course_code, text, language, role, voice_id, s3_key, origin, veracity_pass FROM course_audio WHERE id > $1 ORDER BY id LIMIT $2`, [t.watermark, batch])
    if (!rows.length) break
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
    const ids = rows.map(r => r.id)
    const [byClip, byKey] = await Promise.all([
      client.query('SELECT audio_id, language, text_key, voice_id FROM clip_index WHERE audio_id = ANY($1::uuid[])', [ids]),
      client.query(
        `SELECT c.language, c.text_key, c.voice_id, c.audio_id FROM clip_index c
           JOIN unnest($1::text[], $2::text[], $3::text[]) AS k(language, text_key, voice_id)
             ON c.language = k.language AND c.text_key = k.text_key AND c.voice_id = k.voice_id`,
        (() => { const es = [...wanted.values()]; return [es.map(e => e.language), es.map(e => e.text_key), es.map(e => e.voice_id)] })()),
    ])
    const keyOf = (l, k, v) => `${l}\u001f${k}\u001f${v}`
    const held = new Set(byKey.rows.map(r => keyOf(r.language, r.text_key, r.voice_id)))
    const ownKeys = new Map()
    for (const r of byClip.rows) { (ownKeys.get(r.audio_id) || ownKeys.set(r.audio_id, []).get(r.audio_id)).push(r) }

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
      const es = [...toInsert.values()]
      if (es.length) {
        const col = f => es.map(e => e[f])
        const r = await client.query(
          `INSERT INTO clip_index (language, text_key, voice_id, audio_id, origin, indexed_by)
           SELECT * FROM unnest($1::text[], $2::text[], $3::text[], $4::uuid[], $5::text[], $6::text[])
           ON CONFLICT (language, text_key, voice_id) DO NOTHING RETURNING 1`,
          [col('language'), col('text_key'), col('voice_id'), col('audio_id'), col('origin'), col('indexed_by')])
        t.inserted += r.rowCount
      }
      const stale = staleLog.splice(0)
      if (stale.length) {
        fs.mkdirSync(EVIDENCE_DIR, { recursive: true })
        fs.appendFileSync(path.join(EVIDENCE_DIR, 'clip_index-stale-dropped.jsonl'), stale.map(s => JSON.stringify(s)).join('\n') + '\n')
        const r = await client.query(
          `DELETE FROM clip_index c USING unnest($1::text[], $2::text[], $3::text[], $4::uuid[]) AS k(language, text_key, voice_id, audio_id)
            WHERE c.language = k.language AND c.text_key = k.text_key AND c.voice_id = k.voice_id AND c.audio_id = k.audio_id`,
          [stale.map(s => s.language), stale.map(s => s.text_key), stale.map(s => s.voice_id), stale.map(s => s.audio_id)])
        t.dropped += r.rowCount
      }
    }
    t.watermark = rows[rows.length - 1].id
    t.batches++
    if (t.batches % 50 === 0) log(`batch ${t.batches} read=${t.read} missing=${t.missing} stale=${t.stale} watermark=${t.watermark}`)
    if (rows.length < batch || t.batches >= maxBatches) break
    await sleep(sleepMs)
  }
  t.drift = t.missing + t.stale
  return { ...t, awaiting, unresolvableVoices }
}

async function main() {
  const apply = args.includes('--apply')
  const client = await connect()
  try {
    const evidence = args.includes('--no-evidence') ? null : await refreshSpokenEvidence(client, { apply })
    log('spoken-text evidence', JSON.stringify(evidence))
    if (args.includes('--evidence-only')) { console.log(JSON.stringify({ apply, evidence }, null, 2)); return }
    const report = await reconcile(client, { apply, after: arg('--after', NIL), maxBatches: Number(arg('--max-batches', Infinity)) })
    // A read-only run's `missing` after evidence-not-applied is honest: it counts what apply would fix.
    console.log(JSON.stringify({ apply, evidence, ...report }, null, 2))
  } catch (e) {
    log(`STOPPED: ${e.code === '57014' ? 'STATEMENT TIMEOUT' : 'ERROR'}: ${e.message}`)
    process.exit(2)
  } finally { await client.end().catch(() => {}) }
}

if (require.main === module) main()
module.exports = { reconcile, refreshSpokenEvidence, loadContext, connect, CANDIDATES_SQL, judgeHeard }
