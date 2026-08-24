#!/usr/bin/env node
/**
 * measure-loudness-by-voice.cjs — how loud is each VOICE, on the bytes a learner
 * actually receives?
 *
 * COMMISSIONED 2026-08-24 by Tom, listening to Italian Pod 1 on his phone:
 *   "Enzo is quite a LOT quieter than Ara and also the known language voices.
 *    Our mastering process — which now seems pretty good — probably needs
 *    tweaking for volume similarity"
 *
 * WHY THIS EXISTS AND NOTHING ELSE DOES. The estate already has a loudness BAND
 * (services/audio-intelligence/tiers/loudness.cjs) and a single 25-clip German
 * test behind it (docs/audio/deu-loudness-cluster-test-2026-08-06.md). Both ask
 * "is this clip near target?". Neither can answer Tom's question, which is a
 * question about DIFFERENCE: does voice A sound as loud as voice B to an ear
 * moving between them inside one pod. Consistency between voices is the product;
 * a per-clip verdict cannot see it. So this aggregates PER VOICE and reports the
 * pairwise gaps.
 *
 * THREE THINGS IT REFUSES TO DO WRONG, each for a recorded reason:
 *
 *  (1) It measures the SERVED bytes, fetched from the learner audio proxy, never
 *      a local re-render. The 2026-08-06 German investigation turned on exactly
 *      this distinction: what the server holds and what a device plays can be
 *      different files. A measurement of anything but the served bytes is a
 *      measurement of a population the learner never hears.
 *
 *  (2) It reuses `parseEbur128` / `measure` from the loudness gate tier rather
 *      than parsing ffmpeg a second time. Two parsers drift, and then the audit
 *      and the gate agree with themselves while disagreeing with each other.
 *
 *  (3) It canonicalises voice ids by stripping the provider prefix. `ara` and
 *      `xai_ara` are ONE voice recorded in two eras (the prefix dates the render,
 *      not the speaker), and grouping them apart would split every voice in this
 *      pod into a loud half and a quiet half that are not real populations. The
 *      render era is kept as a separate column instead, so an era effect stays
 *      visible without faking a voice split.
 *
 * READ-ONLY. It opens one read connection, fetches bytes over HTTPS and writes
 * one JSON file if you ask for it. It never writes to the database, never touches
 * S3 and never renders anything.
 *
 * USAGE
 *   node tools/audio/measure-loudness-by-voice.cjs --pod=ita_for_eng:pod-1
 *   node tools/audio/measure-loudness-by-voice.cjs --course=deu_for_eng --limit=150
 *   ... --json=$CS_SCRATCH/out.json --concurrency=4
 *
 * CONCURRENCY defaults to 4 ffmpeg processes: this box has 12 cores shared with
 * other workers and with Tom's own conversations, and a third of it is a fair
 * share. Raise it only if you own the box.
 */
'use strict'

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.psql') })
const fs = require('fs')
const { Client } = require('pg')
const { measure, verdict, DEFAULT_BAND } = require('../../services/audio-intelligence/tiers/loudness.cjs')

// ---------------------------------------------------------------------------
// PURE HELPERS — everything below this line that can be tested without ffmpeg,
// a network or a database, is tested in measure-loudness-by-voice.test.cjs.
// ---------------------------------------------------------------------------

/**
 * One voice, one id. The provider prefix records WHEN a clip was rendered, not
 * WHO spoke it — see the memory `bare-and-xai-prefixed-voice-ids-are-the-same-voice`.
 * @param {string} voiceId
 * @returns {string} the bare voice id, lowercased
 */
function canonicalVoice (voiceId) {
  return String(voiceId || '').trim().toLowerCase().replace(/^(xai_|azure_|eleven_|openai_|google_)/, '')
}

/** The era half of the id, kept so an era effect can be seen without splitting a voice. */
function voiceEra (voiceId) {
  const m = String(voiceId || '').trim().toLowerCase().match(/^(xai|azure|eleven|openai|google)_/)
  return m ? m[1] : 'bare'
}

/**
 * Mirror of the learner app's buildAudioRef (ssi-learning-app/api/_utils/audioAccess.ts).
 * A revised clip is addressed `<uuid>.v<N>`; revision 1 or unknown stays bare,
 * because the id IS the offline cache key.
 */
function buildAudioRef (id, revision) {
  return revision && Number(revision) > 1 ? `${id}.v${Number(revision)}` : id
}

/** Median of a numeric array. Returns null for an empty array rather than NaN. */
function median (xs) {
  const a = xs.filter((x) => Number.isFinite(x)).slice().sort((p, q) => p - q)
  if (!a.length) return null
  const mid = a.length >> 1
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2
}

function mean (xs) {
  const a = xs.filter((x) => Number.isFinite(x))
  return a.length ? a.reduce((s, x) => s + x, 0) / a.length : null
}

function stdev (xs) {
  const a = xs.filter((x) => Number.isFinite(x))
  if (a.length < 2) return null
  const m = mean(a)
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1))
}

const r2 = (x) => (Number.isFinite(x) ? Math.round(x * 100) / 100 : null)

/**
 * Aggregate measured clips into one row per canonical voice.
 *
 * UNMEASURED CLIPS ARE NOT DROPPED. A clip ffmpeg could not read is counted in
 * `unmeasured` and excluded from the statistics — "cannot measure" must never
 * look like "in band" (the gate-stack rule, applied here to an audit).
 *
 * @param {Array<{voiceId:string, lufs:number|null, truePeakDbtp:number|null,
 *                lra:number|null, durationMs:number|null, measured:boolean,
 *                language?:string, role?:string, era?:string}>} clips
 * @param {{targetLufs:number, toleranceDb:number}} [band]
 * @returns {Array<object>} one row per voice, loudest first
 */
function aggregateByVoice (clips, band = DEFAULT_BAND) {
  const low = band.targetLufs - band.toleranceDb
  const high = band.targetLufs + band.toleranceDb
  const byVoice = new Map()
  for (const c of clips || []) {
    const v = canonicalVoice(c.voiceId)
    if (!byVoice.has(v)) byVoice.set(v, [])
    byVoice.get(v).push(c)
  }
  const rows = []
  for (const [voice, cs] of byVoice) {
    const ok = cs.filter((c) => c.measured && Number.isFinite(c.lufs))
    const lufs = ok.map((c) => c.lufs)
    rows.push({
      voice,
      n: cs.length,
      measured: ok.length,
      unmeasured: cs.length - ok.length,
      meanLufs: r2(mean(lufs)),
      medianLufs: r2(median(lufs)),
      stdevLufs: r2(stdev(lufs)),
      minLufs: lufs.length ? r2(Math.min(...lufs)) : null,
      maxLufs: lufs.length ? r2(Math.max(...lufs)) : null,
      meanTruePeakDbtp: r2(mean(ok.map((c) => c.truePeakDbtp))),
      meanLra: r2(mean(ok.map((c) => c.lra))),
      outOfBand: ok.filter((c) => c.lufs < low || c.lufs > high).length,
      belowBand: ok.filter((c) => c.lufs < low).length,
      aboveBand: ok.filter((c) => c.lufs > high).length,
      languages: [...new Set(cs.map((c) => c.language).filter(Boolean))].sort(),
      roles: [...new Set(cs.map((c) => c.role).filter(Boolean))].sort(),
      // Era is DERIVED here rather than trusted from the caller: it is the one
      // field a caller can forget to pass, and its absence would silently hide
      // the very split this grouping exists to keep visible.
      eras: [...new Set(cs.map((c) => c.era || voiceEra(c.voiceId)))].sort(),
    })
  }
  return rows.sort((a, b) => (b.medianLufs ?? -999) - (a.medianLufs ?? -999))
}

/**
 * Every voice against every other voice, on MEDIAN loudness.
 *
 * Median rather than mean on purpose: one very short or very quiet clip drags a
 * mean by more than an ear would notice, and the question here is what the ear
 * meets on a typical line.
 *
 * `gapDb` is positive when `a` is LOUDER than `b`.
 */
function pairwiseGaps (voiceRows) {
  const out = []
  const rows = voiceRows.filter((r) => Number.isFinite(r.medianLufs))
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      out.push({
        a: rows[i].voice,
        b: rows[j].voice,
        gapDb: r2(rows[i].medianLufs - rows[j].medianLufs),
      })
    }
  }
  return out.sort((x, y) => Math.abs(y.gapDb) - Math.abs(x.gapDb))
}

/**
 * The one sentence Tom asked for, built from the aggregate.
 * @param {Array<object>} voiceRows
 * @param {string} subject canonical voice id of the voice under suspicion
 * @param {Record<string,string>} [names] voice id → human name
 */
function headline (voiceRows, subject, names = {}) {
  const me = voiceRows.find((r) => r.voice === canonicalVoice(subject))
  if (!me || !Number.isFinite(me.medianLufs)) return `no measurement for ${subject}`
  const others = voiceRows.filter((r) => r.voice !== me.voice && Number.isFinite(r.medianLufs))
  if (!others.length) return `${names[me.voice] || me.voice} measured at ${me.medianLufs} LUFS; no other voice to compare`
  const parts = others.map((o) => {
    const d = r2(o.medianLufs - me.medianLufs)
    const dir = d >= 0 ? 'quieter than' : 'louder than'
    return `${Math.abs(d)} dB ${dir} ${names[o.voice] || o.voice}`
  })
  return `${names[me.voice] || me.voice} is ${parts.join(', ')} (median integrated LUFS, n=${me.measured})`
}

// ---------------------------------------------------------------------------
// I/O
// ---------------------------------------------------------------------------

const AUDIO_BASE = process.env.LEARNER_AUDIO_BASE || 'https://saysomethingin.app/api/audio'

/** Fetch the served bytes for one clip. Returns null on any non-200. */
async function fetchClipBytes (id, revision) {
  const url = `${AUDIO_BASE}/${buildAudioRef(id, revision)}`
  const res = await fetch(url)
  if (!res.ok) return { buffer: null, url, error: `HTTP ${res.status}` }
  return { buffer: Buffer.from(await res.arrayBuffer()), url, error: null }
}

/** Run `worker` over `items` with at most `limit` in flight. */
async function mapLimit (items, limit, worker) {
  const out = new Array(items.length)
  let next = 0
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = next++
      if (i >= items.length) return
      out[i] = await worker(items[i], i)
    }
  })
  await Promise.all(runners)
  return out
}

const POD_CLIP_SQL = `
with ids as (
  select target_audio_id  as id, 'target'::text as slot, scene_number, sentence_number, global_order, speaker
    from listening_pod_sentences where pod_id = $1 and target_audio_id is not null
  union all
  select known_audio_id, 'known', scene_number, sentence_number, global_order, speaker
    from listening_pod_sentences where pod_id = $1 and known_audio_id is not null
  union all
  select unnest(sentence_audio_ids)::uuid, 'split_target', scene_number, sentence_number, global_order, speaker
    from listening_pod_sentences where pod_id = $1 and sentence_audio_ids is not null
  union all
  select unnest(sentence_known_audio_ids)::uuid, 'split_known', scene_number, sentence_number, global_order, speaker
    from listening_pod_sentences where pod_id = $1 and sentence_known_audio_ids is not null
)
select distinct on (a.id)
       a.id, a.course_code, a.voice_id, a.language, a.role, a.audio_revision,
       a.duration_ms, a.s3_key, a.text, a.created_at,
       ids.slot, ids.scene_number, ids.sentence_number, ids.global_order, ids.speaker
  from ids join course_audio a on a.id = ids.id
 order by a.id, ids.global_order`

const COURSE_CLIP_SQL = `
select id, course_code, voice_id, language, role, audio_revision, duration_ms,
       s3_key, text, created_at,
       null::text as slot, null::int as scene_number, null::int as sentence_number,
       null::int as global_order, null::text as speaker
  from course_audio
 where course_code = $1 and s3_key is not null
 order by created_at desc
 limit $2`

async function loadClips (client, { pod, course, limit }) {
  if (pod) {
    const { rows } = await client.query(POD_CLIP_SQL, [pod])
    return limit ? rows.slice(0, limit) : rows
  }
  return (await client.query(COURSE_CLIP_SQL, [course, limit || 200])).rows
}

async function main () {
  const arg = (n, d) => {
    const a = process.argv.find((x) => x.startsWith(`--${n}=`))
    return a ? a.split('=').slice(1).join('=') : d
  }
  const pod = arg('pod')
  const course = arg('course')
  const limit = parseInt(arg('limit', '0'), 10) || null
  const concurrency = parseInt(arg('concurrency', '4'), 10)
  const jsonOut = arg('json')
  const subject = arg('subject')
  if (!pod && !course) {
    console.error('FAILED: one of --pod=<pod_id> or --course=<course_code> is required')
    process.exit(1)
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  let clipRows
  try {
    clipRows = await loadClips(client, { pod, course, limit })
  } finally {
    await client.end()
  }
  console.error(`[measure] ${clipRows.length} clips from ${pod || course}; fetching served bytes at ${AUDIO_BASE}`)

  let done = 0
  const measured = await mapLimit(clipRows, concurrency, async (row) => {
    const { buffer, url, error } = await fetchClipBytes(row.id, row.audio_revision)
    let m = { measured: false, lufs: null, truePeakDbtp: null, lra: null, error }
    if (buffer) m = await measure(buffer)
    done++
    if (done % 25 === 0) console.error(`[measure] ${done}/${clipRows.length}`)
    return {
      id: row.id,
      url,
      courseCode: row.course_code,
      scene: row.scene_number,
      sentence: row.sentence_number,
      globalOrder: row.global_order,
      speaker: row.speaker,
      slot: row.slot,
      role: row.role,
      language: row.language,
      voiceId: row.voice_id,
      era: voiceEra(row.voice_id),
      audioRevision: row.audio_revision,
      createdAt: row.created_at,
      durationMs: row.duration_ms,
      bytes: buffer ? buffer.length : null,
      text: row.text,
      measured: m.measured,
      lufs: m.lufs,
      truePeakDbtp: m.truePeakDbtp,
      lra: m.lra,
      error: m.error || null,
      verdict: verdict(m).pass,
    }
  })

  const voices = aggregateByVoice(measured)
  const gaps = pairwiseGaps(voices)
  const result = {
    source: pod || course,
    band: DEFAULT_BAND,
    audioBase: AUDIO_BASE,
    totals: {
      clips: measured.length,
      measured: measured.filter((c) => c.measured).length,
      unmeasured: measured.filter((c) => !c.measured).length,
      outOfBand: voices.reduce((s, v) => s + v.outOfBand, 0),
    },
    voices,
    gaps,
    clips: measured,
  }
  if (subject) result.headline = headline(voices, subject)

  console.table(voices.map(({ voice, n, measured: mm, medianLufs, meanLufs, stdevLufs, minLufs, maxLufs, outOfBand, languages, roles, eras }) =>
    ({ voice, n, measured: mm, medianLufs, meanLufs, stdevLufs, minLufs, maxLufs, outOfBand, lang: languages.join('/'), roles: roles.join('/'), eras: eras.join('/') })))
  console.log('\nPairwise gaps (median LUFS, positive = a louder than b):')
  console.table(gaps)
  if (result.headline) console.log(`\nHEADLINE: ${result.headline}`)
  if (jsonOut) {
    fs.writeFileSync(jsonOut, JSON.stringify(result, null, 2))
    console.error(`[measure] wrote ${jsonOut}`)
  }
}

module.exports = {
  canonicalVoice, voiceEra, buildAudioRef, median, mean, stdev,
  aggregateByVoice, pairwiseGaps, headline, mapLimit,
}

if (require.main === module) {
  main().catch((e) => { console.error(`FAILED: ${e.message}`); process.exit(1) })
}
