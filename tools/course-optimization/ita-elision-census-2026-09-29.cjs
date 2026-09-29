#!/usr/bin/env node
/**
 * ita_for_eng — whisper census of every Italian clip carrying an apostrophe
 * elision (l', c'è, dov'è, un'altra, quest', qualcos'…). Job #668·I, Kai's
 * widened scope 2026-09-29: "anything with the apostrophe was affected … happy
 * for you to trust the speech to text."
 *
 * Read-only. For each clip: download the live bytes, decode with whisper (the
 * veracity decoder, unprimed), and judge every elided token in the text the
 * voice was given: the token's HEAD (letters before the apostrophe) must be
 * heard immediately before its TAIL — "qualcos'altro" passes on "qualcos'altro",
 * "qualcosaltro" or "qualcos altro" and fails on "altro"; "dov'è" passes on
 * "dove è". Accents and apostrophes are folded on both sides, and only the
 * first four letters of the tail are required, so whisper's own spelling of an
 * ending does not fail a clip. What this catches is the defect Kai heard: the
 * head swallowed entirely.
 *
 * Resumable and shardable: each shard appends one JSON line per clip to
 * <out>/census-<shard>.jsonl and skips any id already present in ANY census
 * file there. Seeds 151, 159, 513 and 607 are excluded (sibling jobs).
 *
 *   node tools/course-optimization/ita-elision-census-2026-09-29.cjs --shard 0/2 [--out DIR]
 *   node tools/course-optimization/ita-elision-census-2026-09-29.cjs --summary [--out DIR]
 *   node tools/course-optimization/ita-elision-census-2026-09-29.cjs --plan
 */
const path = require('path')
const fs = require('fs')
const REPO = path.resolve(__dirname, '..', '..')
require(path.join(REPO, 'node_modules', 'dotenv')).config({ path: path.join(REPO, '.env') })
process.env.PHASE8_NO_LISTEN = '1'
const veracity = require(path.join(REPO, 'services', 'audio-veracity.cjs'))

const COURSE = 'ita_for_eng'
const LANG = 'ita'
const SKIP_SEEDS = new Set([151, 159, 513, 607])
const ELISION = /(\p{L}+)['’](\p{L}+)/gu

const args = process.argv.slice(2)
const flag = f => args.includes(f)
const opt = (f, d) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : d }
const OUT = opt('--out') || path.join(process.env.CS_SCRATCH || require('os').tmpdir(), 'elision-census')
const [SHARD_I, SHARD_N] = String(opt('--shard', '0/1')).split('/').map(Number)

/** fold: lowercase, strip accents and apostrophes, collapse spaces. */
const fold = s => veracity.normalise(s).replace(/'/g, '')
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** The elided tokens of `text` that are NOT heard in `decode`. Exported for the test. */
function missingElisions(text, decode) {
  const heard = ' ' + fold(decode) + ' '
  const missing = []
  for (const m of String(text).matchAll(ELISION)) {
    const head = fold(m[1]), tail = fold(m[2])
    const re = new RegExp(`(^| )${esc(head)}[aeiou]? ?${esc(tail.slice(0, 4))}`)
    if (!re.test(heard)) missing.push(m[0])
  }
  return missing
}
function doneIds() {
  const done = new Map()
  if (!fs.existsSync(OUT)) return done
  for (const f of fs.readdirSync(OUT).filter(f => /^census-.*\.jsonl$/.test(f)))
    for (const line of fs.readFileSync(path.join(OUT, f), 'utf8').split('\n').filter(Boolean)) { const r = JSON.parse(line); done.set(r.id, r) }
  return done
}

async function main() {
  if (flag('--summary')) return summary()
  fs.mkdirSync(path.join(OUT, 'clips'), { recursive: true })
  const { createClient } = require(path.join(REPO, 'node_modules', '@supabase/supabase-js'))
  const { GetObjectCommand } = require(path.join(REPO, 'node_modules', '@aws-sdk/client-s3'))
  const phase8 = require(path.join(REPO, 'services', 'phases', 'phase8-audio-v13.cjs'))
  const genderHaiku = require(path.join(REPO, 'services', 'gender-haiku-service.cjs'))
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
  const s3Bytes = async key => { const r = await phase8.s3.send(new GetObjectCommand({ Bucket: phase8.S3_BUCKET, Key: key })); const ch = []; for await (const c of r.Body) ch.push(c); return Buffer.concat(ch) }

  const clips = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('course_audio')
      .select('id, text, voice_id, role, s3_key, origin, audio_revision, created_at')
      .eq('course_code', COURSE).eq('language', LANG).like('text', "%'%").order('id').range(from, from + 999)
    if (error) throw error
    clips.push(...data.filter(c => new RegExp(ELISION.source, 'u').test(c.text))); if (data.length < 1000) break
  }
  const ids = clips.map(c => c.id)
  const holders = []
  for (const [table, idCol] of [['course_legos', 'lego_id'], ['course_practice_phrases', 'id'], ['course_seeds', 'seed_id']])
    for (const col of ['target1_audio_id', 'target2_audio_id'])
      for (let i = 0; i < ids.length; i += 200) {
        const { data, error } = await supabase.from(table).select(`${idCol}, seed_number, target_text, ${col}`).eq('course_code', COURSE).in(col, ids.slice(i, i + 200))
        if (error) throw error
        for (const h of data) holders.push({ table, id: h[idCol], seed: h.seed_number, text: h.target_text, slot: col, audio_id: h[col] })
      }
  const gmap = await genderHaiku.loadGenderMap(COURSE, supabase)
  const rows = clips.map(c => {
    const mine = holders.filter(h => h.audio_id === c.id)
    const seeds = [...new Set(mine.map(h => h.seed))]
    const texts = [...new Set(mine.map(h => h.text))]
    let status = 'check'
    if (!mine.length) status = 'skip: orphan'
    else if (texts.length > 1) status = 'skip: holders disagree'
    else if (seeds.some(s => SKIP_SEEDS.has(s))) status = `skip: seed ${seeds.filter(s => SKIP_SEEDS.has(s)).join(',')} (sibling job)`
    else if (c.origin === 'human') status = 'skip: human take'
    const holderText = texts[0] || c.text
    const textForTTS = genderHaiku.storedGenderReading(gmap, holderText, LANG, c.role) || holderText
    return { id: c.id, text: c.text, holderText, textForTTS, voice: c.voice_id, role: c.role, s3_key: c.s3_key, revision: c.audio_revision ?? 1, created_at: c.created_at, holders: mine.map(h => `${h.table}:${h.id}:${h.slot}`), seeds, status }
  })
  console.log(`${clips.length} clips with an elision; ${rows.filter(r => r.status === 'check').length} to check, ${rows.filter(r => r.status !== 'check').length} skipped`)
  if (flag('--plan')) { for (const r of rows.filter(r => r.status !== 'check')) console.log(`  ${r.id} "${r.text}" ${r.status}`); return }

  const done = doneIds()
  const mine = rows.filter((r, i) => i % SHARD_N === SHARD_I && !done.has(r.id))
  const outFile = path.join(OUT, `census-${SHARD_I}.jsonl`)
  console.log(`shard ${SHARD_I}/${SHARD_N}: ${mine.length} clips to do → ${outFile}`)
  for (const r of mine) {
    if (r.status !== 'check') { fs.appendFileSync(outFile, JSON.stringify(r) + '\n'); continue }
    try {
      const file = path.join(OUT, 'clips', `${r.id}.mp3`)
      if (!fs.existsSync(file)) fs.writeFileSync(file, await s3Bytes(r.s3_key))
      const v = await veracity.checkAudioVeracity(file, r.textForTTS, LANG)
      r.decode = v.decode; r.cer = v.cer
      r.missing = v.decode == null ? null : missingElisions(r.textForTTS, v.decode)
      r.status = v.decode == null ? `undecided: ${v.reason}` : r.missing.length ? 'missing' : 'fine'
      console.log(`${r.id} ${String(r.voice).replace('azure_', '').padEnd(20)} "${r.textForTTS}" → "${r.decode}" ${r.status}${r.missing?.length ? ' ' + r.missing.join(',') : ''}`)
    } catch (e) { r.status = `error: ${e.message.slice(0, 120)}`; console.log(`${r.id} ${r.status}`) }
    fs.appendFileSync(outFile, JSON.stringify(r) + '\n')
  }
  console.log('shard done')
}

function summary() {
  const rows = [...doneIds().values()]
  const by = {}; for (const r of rows) by[r.status.split(':')[0]] = (by[r.status.split(':')[0]] || 0) + 1
  console.log(JSON.stringify({ total: rows.length, ...by }))
  const tok = {}
  for (const r of rows.filter(r => r.status === 'missing')) for (const t of r.missing) tok[t.toLowerCase()] = (tok[t.toLowerCase()] || 0) + 1
  console.log('missing by token:', JSON.stringify(Object.entries(tok).sort((a, b) => b[1] - a[1])))
  const byVoice = {}; for (const r of rows.filter(r => r.status === 'missing')) byVoice[r.voice] = (byVoice[r.voice] || 0) + 1
  console.log('missing by voice:', JSON.stringify(byVoice))
  const chars = rows.filter(r => r.status === 'missing').reduce((n, r) => n + r.textForTTS.length, 0)
  console.log(`re-render chars if every missing clip is rendered once: ${chars} (≈ $${(chars * 16 / 1e6).toFixed(3)} at $16/M)`)
}

module.exports = { missingElisions, fold }
if (require.main === module) main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
