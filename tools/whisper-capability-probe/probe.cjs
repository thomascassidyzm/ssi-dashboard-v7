#!/usr/bin/env node
/**
 * whisper-capability-probe — WHICH languages can this decoder actually read?
 *
 * The question the veracity gate never asked. services/audio-veracity.cjs maps
 * 82 language codes to whisper ISO-639-1 and gates all of them identically.
 * whisper.cpp accepts every one of those codes — `-l si` does not error — so a
 * language the model cannot transcribe produces confident garbage, and the gate
 * reads garbage as "the words are not in this clip" and refuses the render.
 *
 * THE MEASUREMENT, and why it is not just "is CER low".
 * Some live clips really are broken, so a raw own-CER distribution confounds
 * "the decoder cannot read this language" with "this audio is bad". So the
 * probe measures DISCRIMINATION instead:
 *
 *   for each clip, decode it once (free, unprimed), then score that one decode
 *   against its OWN text and against N distractor texts drawn from other clips
 *   in the SAME language. Rank-1 = the own text scored strictly best.
 *
 * A decoder that reads the language identifies its own clip near-always, even
 * when a few clips are damaged. A decoder that cannot read the language scores
 * ~1/(N+1) — chance — because every candidate is equally unrelated to the
 * garbage it produced. Chance is the signature of a dead decoder, and it cannot
 * be faked by bad audio: bad audio lowers rank-1 by exactly the fraction of
 * clips that are bad, not to chance.
 *
 * Read-only. Downloads clips to a temp dir and deletes them. No TTS, no writes.
 *
 * Usage: node tools/whisper-capability-probe/probe.cjs [--langs a,b] [--n 20]
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') })
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFile } = require('child_process')
const { Client } = require('pg')
const veracity = require('../../services/audio-veracity.cjs')

const argv = process.argv.slice(2)
const arg = (f, d = null) => { const i = argv.indexOf(f); return i !== -1 && argv[i + 1] ? argv[i + 1] : d }
const N = Number(arg('--n', 20))
const DISTRACTORS = Number(arg('--distractors', 9))
const ONLY = arg('--langs') ? arg('--langs').split(',') : null
const OUT = arg('--out', path.join(__dirname, 'results.json'))
const CONC = Number(arg('--concurrency', 3))

const S3_BASE = `https://${(process.env.S3_BUCKET || 'ssi-audio-stage').trim()}.s3.${(process.env.AWS_REGION || 'eu-west-1').trim()}.amazonaws.com/`
const url = fs.readFileSync(path.join(__dirname, '..', '..', '.env.psql'), 'utf8').match(/DATABASE_URL=(\S+)/)[1]

const run = (cmd, args) => new Promise((res, rej) =>
  execFile(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 24 }, (e, so, se) =>
    e ? rej(new Error(String(se || e.message).slice(0, 200))) : res(so)))

/**
 * Sample candidate clips for one language.
 *
 * Filters exist to keep the sample as close to "healthy, comparable audio" as
 * the database can express:
 *  - >= 3 words and >= 15 chars: CER on a two-character text is meaningless
 *    (see MIN_EDIT_DISTANCE in audio-veracity.cjs), and short texts make the
 *    distractor test trivially noisy.
 *  - no '(' : gender markers and bracket tags make course_audio.text differ
 *    from what the voice was actually asked to say.
 *  - duration 1s..20s: excludes stubs and outliers.
 *  - not presentation/pod_*: those roles carry narration this gate never sees.
 *  - a fixed md5-prefix bucket on the id, so the sample is deterministic,
 *    unbiased with respect to age or course, and — unlike `order by md5(...)` —
 *    lets the planner stop as soon as it has N rows. Ordering 1M eng rows by a
 *    computed hash took longer than every decode in this probe put together.
 */
const SAMPLE_SQL = `
  select id, text, language, role, duration_ms, s3_key
  from course_audio
  where language = $1
    and s3_key is not null
    and origin is distinct from 'human'
    and role not in ('presentation')
    and role not like 'pod_%'
    and duration_ms between 1000 and 20000
    and length(text) >= 15
    and text !~ '[(\\[]'
    and array_length(regexp_split_to_array(btrim(text), '\\s+'), 1) >= 3
    and substr(md5(id::text), 1, 1) = '7'
  limit $2`

/** CJK/Thai/Lao/Khmer/Burmese have no spaces; the word filter would empty them. */
const NO_SPACE_SQL = SAMPLE_SQL.replace(
  "and array_length(regexp_split_to_array(btrim(text), '\\s+'), 1) >= 3", '')

async function main () {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
  await c.connect()

  const census = await c.query(`
    select language, count(*) n from course_audio
    where s3_key is not null and origin is distinct from 'human'
    group by 1 having count(*) >= 5000 order by 2 desc`)
  let langs = census.rows.map(r => r.language).filter(l => l && l !== 'auto')
  if (ONLY) langs = ONLY

  const NO_SPACE = new Set(['zho', 'jpn', 'tha', 'lao', 'mya', 'khm', 'yue', 'cmn'])
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'whisper-cap-'))
  const results = {}
  const prior = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {}

  for (const lang of langs) {
    if (prior[lang]) { results[lang] = prior[lang]; console.log(`${lang}: cached`); continue }
    const sql = NO_SPACE.has(lang) ? NO_SPACE_SQL : SAMPLE_SQL
    const { rows } = await c.query(sql, [lang, N])
    if (rows.length < 5) { console.log(`${lang}: only ${rows.length} eligible clips — SKIPPED`); continue }

    const iso1 = veracity.WHISPER_ISO1[lang] || (lang.length === 2 ? lang : null)
    const clips = []
    let idx = 0
    const worker = async () => {
      while (idx < rows.length) {
        const row = rows[idx++]
        const mp3 = path.join(tmp, `${row.id}.mp3`)
        try {
          await run('curl', ['-sfS', '-o', mp3, S3_BASE + row.s3_key])
          const decode = await veracity.decodeAudio(mp3, iso1 || 'auto')
          clips.push({ id: row.id, text: row.text, role: row.role, decode })
        } catch (e) {
          clips.push({ id: row.id, text: row.text, role: row.role, decode: null, error: e.message })
        } finally { try { fs.unlinkSync(mp3) } catch {} }
      }
    }
    await Promise.all(Array.from({ length: CONC }, worker))

    const usable = clips.filter(c => c.decode != null)
    let rank1 = 0, scored = 0
    const ownCERs = [], crossCERs = []
    for (let i = 0; i < usable.length; i++) {
      const me = usable[i]
      const own = veracity.characterErrorRate(me.text, me.decode)
      ownCERs.push(own)
      // Distractors: the next DISTRACTORS clips in the ring, skipping any whose
      // text is identical to mine (duplicate scripts are common in this estate
      // and would make "identified its own clip" unanswerable).
      const others = []
      for (let k = 1; k < usable.length && others.length < DISTRACTORS; k++) {
        const o = usable[(i + k) % usable.length]
        if (veracity.normalise(o.text) !== veracity.normalise(me.text)) others.push(o)
      }
      if (others.length < 3) continue
      const cross = others.map(o => veracity.characterErrorRate(o.text, me.decode))
      crossCERs.push(...cross)
      scored++
      if (own < Math.min(...cross)) rank1++
    }
    const med = a => { const s = a.slice().sort((x, y) => x - y); return s.length ? +s[Math.floor(s.length / 2)].toFixed(3) : null }
    const nonSpeech = usable.filter(c => veracity.isNonSpeechDecode(c.decode)).length

    results[lang] = {
      iso1,
      mapped: !!veracity.WHISPER_ISO1[lang],
      clips: clips.length,
      usable: usable.length,
      scored,
      rank1,
      rank1_pct: scored ? +(100 * rank1 / scored).toFixed(1) : null,
      chance_pct: +(100 / (DISTRACTORS + 1)).toFixed(1),
      median_own_cer: med(ownCERs),
      median_cross_cer: med(crossCERs),
      non_speech_decodes: nonSpeech,
      // Every (text, decode) pair, so the ALLOW/DENY rule can be re-derived —
      // and re-argued — without paying for the decodes again. The rule itself
      // deliberately lives in decide.cjs, not here: this file measures, it does
      // not judge.
      pairs: usable.map(c => ({ text: c.text, decode: c.decode, role: c.role })),
    }
    console.log(`${lang} (${iso1}): rank1 ${results[lang].rank1_pct}% of ${scored}  own ${results[lang].median_own_cer} cross ${results[lang].median_cross_cer}  nonspeech ${nonSpeech}/${usable.length}`)
    fs.writeFileSync(OUT, JSON.stringify(results, null, 1))
  }
  await c.end()
  try { fs.rmSync(tmp, { recursive: true }) } catch {}
  fs.writeFileSync(OUT, JSON.stringify(results, null, 1))
  console.log('\nwrote', OUT)
}

main().catch(e => { console.error(e); process.exit(1) })
