#!/usr/bin/env node
/**
 * proof.cjs — the false-negative measurement, on audio PROVEN complete.
 *
 * probe.cjs measures discrimination on a sample of live clips. The objection to
 * it is obvious and fair: maybe those clips are just damaged. This removes the
 * objection by only ever asking about clips whose contents are on independent
 * record.
 *
 * THE INDEPENDENT RECORD is course_audio.word_boundaries — Azure's own report of
 * what it spoke and when, written at synthesis time and never touched by whisper.
 * A clip qualifies here only if:
 *   - the boundary texts, concatenated, reproduce the script (CER < 0.1), and
 *   - the last boundary's audio offset lands inside the clip's duration, in its
 *     final stretch (nothing was truncated — the exact defect class this gate
 *     exists to catch).
 *
 * The first test is deliberately NOT "one boundary per whitespace word".
 * Azure tokenises its own way: German emits a separate boundary for a leading
 * quote mark, and Chinese emits one per CHARACTER (43 boundaries for a 12-word
 * line). Counting words rejected 100% of deu and zho rows — i.e. it threw away
 * the two controls the argument most needs — while rejecting nothing for the
 * languages under suspicion. Comparing the concatenated text instead asks the
 * question that actually matters, in any tokenisation.
 *
 * For such a clip the words ARE in the audio, on evidence that does not come
 * from the thing being tested. So every gate FAIL on this set is a FALSE
 * NEGATIVE, by construction, and the fail rate is the false-negative rate.
 *
 * Controls are mandatory, not decoration: deu and hin run through the identical
 * pipeline. A method that condemns every language proves nothing.
 *
 * Read-only. No TTS, no writes.
 * Usage: node tools/whisper-capability-probe/proof.cjs [--langs a,b] [--n 15]
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
const N = Number(arg('--n', 15))
const LANGS = (arg('--langs') || 'sin,kan,ben,pan,guj,tel,deu,hin,eng,zho,isl').split(',')
const OUT = arg('--out', path.join(__dirname, 'proof.json'))
const CONC = Number(arg('--concurrency', 5))
const TAIL_SLACK_MS = 400

const S3_BASE = `https://${(process.env.S3_BUCKET || 'ssi-audio-stage').trim()}.s3.${(process.env.AWS_REGION || 'eu-west-1').trim()}.amazonaws.com/`
const url = fs.readFileSync(path.join(__dirname, '..', '..', '.env.psql'), 'utf8').match(/DATABASE_URL=(\S+)/)[1]

const run = (cmd, args) => new Promise((res, rej) =>
  execFile(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 24 }, (e, so, se) =>
    e ? rej(new Error(String(se || e.message).slice(0, 200))) : res(so)))

/** Azure reports offsets in 100-ns ticks; some rows carry plain ms. Accept both. */
function boundaryEndMs (wb) {
  const last = wb[wb.length - 1]
  const off = last.audioOffset ?? last.offset ?? last.audio_offset
  const dur = last.duration ?? last.durationMs ?? 0
  if (off == null) return null
  // A 100-ns tick count for a clip of seconds is in the millions; ms is not.
  const scale = off > 1e6 ? 1e4 : 1
  return (off + dur) / scale
}

function wordsOf (text) { return String(text).trim().split(/\s+/).filter(Boolean) }

async function main () {
  const c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
  await c.connect()
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'whisper-proof-'))
  const out = {}

  for (const lang of LANGS) {
    // Over-fetch: most rows will fail the completeness test, and that is fine —
    // the point is to keep only the ones that cannot be argued with.
    const { rows } = await c.query(`
      select id, text, language, duration_ms, s3_key, word_boundaries
      from course_audio
      where language = $1 and s3_key is not null and word_boundaries is not null
        and origin is distinct from 'human'
        and role not in ('presentation') and role not like 'pod_%'
        and duration_ms between 1000 and 20000
        and length(text) >= 15
        and text !~ '[(\\[]'
      limit 400`, [lang])

    const eligible = []
    for (const r of rows) {
      const wb = r.word_boundaries
      if (!Array.isArray(wb) || !wb.length) continue
      if (wordsOf(r.text).length < 3) continue
      // Did Azure speak the script? Its own report, concatenated.
      const spoken = wb.map(w => w.text ?? w.word ?? '').join(' ')
      if (!veracity.normalise(spoken)) continue
      if (veracity.characterErrorRate(r.text, spoken) > 0.1) continue
      const endMs = boundaryEndMs(wb)
      if (endMs == null) continue
      if (endMs > r.duration_ms) continue               // record disagrees with the file
      if (r.duration_ms - endMs > TAIL_SLACK_MS + 600) continue // long dead tail
      if (endMs < r.duration_ms - r.duration_ms * 0.5) continue // speech ends mid-clip
      eligible.push(r)
      if (eligible.length >= N) break
    }
    if (eligible.length < 5) { console.log(`${lang}: only ${eligible.length} PROVEN-complete clips — skipped`); continue }

    const iso1 = veracity.WHISPER_ISO1[lang] || (lang.length === 2 ? lang : null)
    const res = []
    let i = 0
    const worker = async () => {
      while (i < eligible.length) {
        const row = eligible[i++]
        const mp3 = path.join(tmp, `${row.id}.mp3`)
        try {
          await run('curl', ['-sfS', '-o', mp3, S3_BASE + row.s3_key])
          const decode = await veracity.decodeAudio(mp3, iso1 || 'auto')
          const v = veracity.verdictFromDecode(decode, row.text, iso1)
          res.push({ id: row.id, text: row.text, decode, pass: v.pass, reason: v.reason, cer: +v.cer.toFixed(3) })
        } catch (e) {
          res.push({ id: row.id, text: row.text, error: e.message })
        } finally { try { fs.unlinkSync(mp3) } catch {} }
      }
    }
    await Promise.all(Array.from({ length: CONC }, worker))

    const scored = res.filter(r => !r.error)
    const failed = scored.filter(r => !r.pass)
    const reasons = {}
    for (const f of failed) reasons[f.reason] = (reasons[f.reason] || 0) + 1
    out[lang] = {
      iso1,
      proven_complete_clips: scored.length,
      false_negatives: failed.length,
      false_negative_pct: scored.length ? +(100 * failed.length / scored.length).toFixed(1) : null,
      reasons,
      results: res,
    }
    console.log(`${lang} (${iso1}): FALSE NEGATIVES ${failed.length}/${scored.length} = ${out[lang].false_negative_pct}%  ${JSON.stringify(reasons)}`)
    fs.writeFileSync(OUT, JSON.stringify(out, null, 1))
  }
  await c.end()
  try { fs.rmSync(tmp, { recursive: true }) } catch {}
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1))
  console.log('\nwrote', OUT)
}
main().catch(e => { console.error(e); process.exit(1) })
