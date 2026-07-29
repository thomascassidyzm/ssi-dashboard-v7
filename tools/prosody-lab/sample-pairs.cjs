#!/usr/bin/env node
/**
 * prosody-lab: sample same-phrase multi-voice pairs from course_audio and
 * download the clips locally for the invariance study.
 *
 * TTS-as-lab premise: the estate already contains the same text rendered by
 * multiple voices (male/female pairs, cross-provider renders, human Welsh
 * recordings). Across renditions of the SAME phrase, whatever stays constant
 * is a candidate "understandability core"; whatever varies freely is voice
 * identity / naturalness. See docs/course-optimization/prosody-lab-poc.md.
 *
 * Categories sampled:
 *   rerender        same language+text+voice, distinct files  (near-identical control)
 *   diffphrase      same voice, two DIFFERENT texts           (far control)
 *   crossvoice      same language+text, two voices, same provider (azure)
 *   crossprovider   same language+text, azure vs xai/other provider
 *   human_tts_eng   same English text, human recording vs TTS
 *   human_tts_cym   same Welsh text, human recording vs TTS (all of them)
 *
 * Resume-safe: re-running skips clips already on disk; the manifest is
 * rewritten atomically each run (sampling is ORDER BY md5(text) — stable).
 *
 * Usage: node tools/prosody-lab/sample-pairs.cjs [--limit-per-cat N] [--skip-download]
 * Reads DATABASE_URL from .env.psql, S3 creds from .env.
 * Download concurrency hard-capped at 4 (machine is shared with the audio batch).
 */

const fs = require('fs')
const path = require('path')
const REPO = path.resolve(__dirname, '..', '..')
require('dotenv').config({ path: path.join(REPO, '.env') })

const { Client } = require('pg')
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3')

const OUT_DIR = path.join(REPO, 'temp', 'prosody-lab')
const CLIP_DIR = path.join(OUT_DIR, 'clips')
const MANIFEST = path.join(OUT_DIR, 'pairs.json')
const S3_BUCKET = process.env.S3_AUDIO_BUCKET || process.env.S3_BUCKET || 'ssi-audio-stage'
const DOWNLOAD_CONCURRENCY = 4 // hard cap — do not raise on this machine

const PROVIDER_SQL = `case
  when voice_id like 'azure_%' or voice_id ~ '^[a-z]{2,3}-[A-Z]{2}-.*Neural' then 'azure'
  when voice_id like 'elevenlabs_%' then 'elevenlabs'
  when voice_id like 'xai_%' then 'xai'
  when origin = 'human' then 'human'
  else 'other' end`

function databaseUrl() {
  const envPsql = fs.readFileSync(path.join(REPO, '.env.psql'), 'utf8')
  const m = envPsql.match(/^DATABASE_URL=(.+)$/m)
  if (!m) throw new Error('DATABASE_URL not found in .env.psql')
  return m[1].trim()
}

// One representative rendition per (text-group, distinctCol); JS then pairs the
// first two rows of each group that differ on distinctCol. distinctCol ∈
// {'voice_id','provider','origin'}; havingCol is what must have ≥2 distinct values.
function groupPairQuery({ where, distinctCol, limit }) {
  return `
    with base as (
      select id::text, language, text, text_stripped, voice_id, origin, s3_key, duration_ms,
             course_code, role, ${PROVIDER_SQL} as provider
      from course_audio
      where role in ('known','target1','target2')
        and length(text_stripped) > 2
        and s3_key like '%.mp3'
        and ${where}
    ),
    grp as (
      select language, text_stripped
      from base
      group by 1, 2
      having count(distinct ${distinctCol}) >= 2 and count(distinct s3_key) >= 2
      order by md5(language || text_stripped)
      limit ${limit}
    ),
    ranked as (
      select b.*, row_number() over (
        partition by b.language, b.text_stripped, b.${distinctCol}
        order by md5(b.id)
      ) as rn
      from base b join grp g using (language, text_stripped)
    )
    select * from ranked where rn = 1 order by language, text_stripped, ${distinctCol}`
}

async function main() {
  const args = process.argv.slice(2)
  const limitPerCat = Number(args[args.indexOf('--limit-per-cat') + 1]) || 100
  const skipDownload = args.includes('--skip-download')

  fs.mkdirSync(CLIP_DIR, { recursive: true })
  const client = new Client({ connectionString: databaseUrl() })
  await client.connect()

  const categories = {}

  // -- rerender control: same language+text+voice, 2+ distinct files
  {
    const q = `
      with base as (
        select id::text, language, text, text_stripped, voice_id, origin, s3_key, duration_ms, course_code, role
        from course_audio
        where role in ('target1','target2') and length(text_stripped) > 2 and s3_key like '%.mp3' and origin = 'tts'
      ),
      grp as (
        select language, text_stripped, voice_id from base
        group by 1,2,3 having count(distinct s3_key) >= 2
        order by md5(language || text_stripped || voice_id) limit 40
      ),
      ranked as (
        select b.*, row_number() over (partition by b.language, b.text_stripped, b.voice_id order by md5(b.id)) rn
        from base b join grp g using (language, text_stripped, voice_id)
      )
      select * from ranked where rn <= 2 order by language, text_stripped, voice_id, rn`
    categories.rerender = pairsFromRows((await client.query(q)).rows, r => `${r.language}|${r.text_stripped}|${r.voice_id}`)
  }

  // -- crossvoice: same text, two different azure voices (same provider)
  {
    const q = groupPairQuery({
      where: `origin='tts' and language in ('fra','spa','ita','zho','por','kor','eus') and (${PROVIDER_SQL}) = 'azure'`,
      distinctCol: 'voice_id', limit: limitPerCat,
    })
    categories.crossvoice = pairsFromRows((await client.query(q)).rows, r => `${r.language}|${r.text_stripped}`)
      .filter(p => p.a.voice_id !== p.b.voice_id)
  }

  // -- crossprovider: same text, distinct providers (tts only)
  {
    const q = groupPairQuery({
      where: `origin='tts' and language in ('eng','fra','ita','zho')`,
      distinctCol: 'provider', limit: limitPerCat,
    })
    categories.crossprovider = pairsFromRows((await client.query(q)).rows, r => `${r.language}|${r.text_stripped}`)
      .filter(p => p.a.provider !== p.b.provider)
  }

  // -- human vs TTS, English
  {
    const q = groupPairQuery({ where: `language = 'eng'`, distinctCol: 'origin', limit: limitPerCat })
    categories.human_tts_eng = pairsFromRows((await client.query(q)).rows, r => `${r.language}|${r.text_stripped}`)
      .filter(p => (p.a.origin === 'human') !== (p.b.origin === 'human'))
  }

  // -- human vs TTS, Welsh (take everything there is)
  {
    const q = groupPairQuery({ where: `language like 'cym%'`, distinctCol: 'origin', limit: 1000 })
    categories.human_tts_cym = pairsFromRows((await client.query(q)).rows, r => `${r.language}|${r.text_stripped}`)
      .filter(p => (p.a.origin === 'human') !== (p.b.origin === 'human'))
  }

  // -- diffphrase control: same voice, different texts, similar length
  {
    const q = `
      select id::text, language, text, text_stripped, voice_id, origin, s3_key, duration_ms, course_code, role,
             ${PROVIDER_SQL} as provider
      from course_audio
      where role in ('target1','target2') and origin='tts' and s3_key like '%.mp3'
        and voice_id in ('azure_es-ES-AlvaroNeural','azure_fr-FR-HenriNeural','azure_es-ES-ElviraNeural')
        and length(text_stripped) between 15 and 60
      order by md5(id::text) limit 120`
    const rows = (await client.query(q)).rows
    const pairs = []
    for (let i = 0; i + 1 < rows.length && pairs.length < 60; i += 2) {
      const [a, b] = [rows[i], rows[i + 1]]
      if (a.voice_id === b.voice_id && a.text_stripped !== b.text_stripped) pairs.push({ a, b })
    }
    categories.diffphrase = pairs
  }

  await client.end()

  // flatten manifest
  const pairs = []
  const clips = new Map()
  for (const [cat, list] of Object.entries(categories)) {
    for (const { a, b } of list) {
      for (const r of [a, b]) if (!clips.has(r.id)) clips.set(r.id, clipEntry(r))
      pairs.push({
        pair_id: `${cat}:${a.id.slice(0, 8)}:${b.id.slice(0, 8)}`,
        category: cat, language: a.language,
        text_a: a.text, text_b: b.text,
        a: clipMeta(a), b: clipMeta(b),
      })
    }
  }
  const manifest = { generated_for: 'prosody-lab PoC', s3_bucket: S3_BUCKET, pairs, clips: [...clips.values()] }
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1))
  console.log('categories:', Object.fromEntries(Object.entries(categories).map(([k, v]) => [k, v.length])))
  console.log(`manifest: ${MANIFEST} (${pairs.length} pairs, ${clips.size} clips)`)

  if (skipDownload) return

  const s3 = new S3Client({ region: process.env.AWS_REGION || 'eu-west-1' })
  const todo = [...clips.values()].filter(c => !fs.existsSync(c.local_path))
  console.log(`downloading ${todo.length} clips (concurrency ${DOWNLOAD_CONCURRENCY})`)
  let done = 0, failed = 0
  const queue = [...todo]
  await Promise.all(Array.from({ length: DOWNLOAD_CONCURRENCY }, async () => {
    for (;;) {
      const c = queue.shift()
      if (!c) return
      try {
        const resp = await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: c.s3_key }))
        const chunks = []
        for await (const ch of resp.Body) chunks.push(ch)
        fs.writeFileSync(c.local_path, Buffer.concat(chunks))
        if (++done % 50 === 0) console.log(`  ${done}/${todo.length}`)
      } catch (e) {
        failed++
        console.error(`  FAIL ${c.s3_key}: ${e.message}`)
      }
    }
  }))
  console.log(`downloaded ${done}, failed ${failed}, cached ${clips.size - todo.length}`)
}

function clipEntry(r) {
  return {
    id: r.id, s3_key: r.s3_key, local_path: path.join(CLIP_DIR, `${r.id}.mp3`),
    language: r.language, text: r.text, voice_id: r.voice_id, origin: r.origin,
    provider: r.provider || null, course_code: r.course_code, role: r.role,
    duration_ms: r.duration_ms,
  }
}
function clipMeta(r) {
  return { id: r.id, voice_id: r.voice_id, origin: r.origin, provider: r.provider || null, course_code: r.course_code, role: r.role, s3_key: r.s3_key }
}
function pairsFromRows(rows, keyFn) {
  const groups = new Map()
  for (const r of rows) {
    const k = keyFn(r)
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k).push(r)
  }
  const pairs = []
  for (const g of groups.values()) if (g.length >= 2 && g[0].s3_key !== g[1].s3_key) pairs.push({ a: g[0], b: g[1] })
  return pairs
}

main().catch(e => { console.error(e); process.exit(1) })
