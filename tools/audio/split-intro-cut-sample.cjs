#!/usr/bin/env node
/**
 * split-intro-cut-sample.cjs — ear sample for job #839 (Tom 2026-10-05): can a presentation intro ("The Spanish for 'I love you' is:")
 * be built from a per-language PREFIX cut out of one natural whole take + a SHARED REMAINDER cut out of ANOTHER language's whole take?
 *
 * Uses the Pod 1 slicing technique (one natural take, cut at word timings with the gap padding of take-g-spans.paddedSpans);
 * no TTS, no spend, no course pointer touched. Source clips are existing Charlotte takes with course_audio.word_timings, read
 * from the learner audio route. Output: mp3s + index.json in the out dir.
 *
 *   node tools/audio/split-intro-cut-sample.cjs <outDir>
 */
const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const { paddedSpans } = require('../../services/shared/take-g-spans.cjs')

const BASE = process.env.LEARNER_AUDIO_BASE || 'https://saysomethingin.app/api/audio'
const PREFIX_WORDS = 3 // "The <Language> for" — in every source take the first three words
// pre/rem: the take the prefix / remainder is cut from; whole: the real whole take to compare against.
const PAIRS = [
  { label: 'Spanish — I love you', pre: 'ad5d4ba6-8021-4e87-adf6-7cb4dbe61bc3', rem: '7fc20a20-0256-40bd-bdd3-c79dea2d4913', remFrom: 'French take', whole: 'ad5d4ba6-8021-4e87-adf6-7cb4dbe61bc3' },
  { label: 'German — I love', pre: '8eb25059-d857-40f5-ad04-85aa0c72c4fb', rem: '5d52256c-40fb-422a-958e-6c8cbf2c5795', remFrom: 'Italian-course take', whole: '8eb25059-d857-40f5-ad04-85aa0c72c4fb' },
  { label: 'German — you', pre: 'cfc4fd80-87ae-4f27-ad51-d47607c80b57', rem: '0154d4ff-714a-4f03-a681-cd0c1276b446', remFrom: 'Italian-course take', whole: 'cfc4fd80-87ae-4f27-ad51-d47607c80b57' },
  { label: 'Italian — you', pre: '0154d4ff-714a-4f03-a681-cd0c1276b446', rem: 'cfc4fd80-87ae-4f27-ad51-d47607c80b57', remFrom: 'German take', whole: '0154d4ff-714a-4f03-a681-cd0c1276b446' },
]

async function timings(pg, id) {
  const { rows: [r] } = await pg.query('select text, word_timings from course_audio where id = $1', [id])
  if (!r || !r.word_timings) throw new Error('no word_timings for ' + id)
  return r
}
const sh = (cmd, args) => execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] })

async function main() {
  const out = process.argv[2]
  if (!out) throw new Error('usage: split-intro-cut-sample.cjs <outDir>')
  fs.mkdirSync(out, { recursive: true })
  require('dotenv').config({ path: path.join(__dirname, '../../.env.psql') })
  const { Client } = require('pg')
  const pg = new Client({ connectionString: process.env.DATABASE_URL })
  await pg.connect()
  const index = []
  const fetchClip = id => {
    const f = path.join(out, `src-${id}.mp3`)
    if (!fs.existsSync(f)) sh('curl', ['-sf', '-o', f, `${BASE}/${id}`])
    return f
  }
  const cut = (file, a, b, dest) => sh('ffmpeg', ['-y', '-v', 'error', '-i', file, '-ss', String(a / 1000), '-to', String(b / 1000),
    '-af', 'afade=t=in:d=0.004,afade=t=out:st=' + Math.max(0, (b - a) / 1000 - 0.004) + ':d=0.004', '-ar', '48000', '-ac', '1', dest])
  let n = 0
  for (const p of PAIRS) {
    n++
    const [A, B] = [await timings(pg, p.pre), await timings(pg, p.rem)]
    const durOf = f => Number(sh('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString()) * 1000
    const fa = fetchClip(p.pre), fb = fetchClip(p.rem), fw = fetchClip(p.whole)
    const span = (wt, from, to, f) => { // speech edges of words [from,to) padded into the neighbouring gaps
      const ms = i => [Math.round(wt.starts[i] * 1000), Math.round(wt.ends[i] * 1000)]
      const sp = []
      if (from > 0) sp.push({ start: ms(0)[0], end: ms(from - 1)[1] })
      sp.push({ start: ms(from)[0], end: ms(to - 1)[1] })
      if (to < wt.words.length) sp.push({ start: ms(to)[0], end: ms(wt.words.length - 1)[1] })
      return paddedSpans(sp, durOf(f))[from > 0 ? 1 : 0]
    }
    // prefix = words [0,3); remainder = words [3,end). Cut each at its own take's word edge.
    const sa = paddedSpans([{ start: A.word_timings.starts[0] * 1000, end: A.word_timings.ends[PREFIX_WORDS - 1] * 1000 },
      { start: A.word_timings.starts[PREFIX_WORDS] * 1000, end: A.word_timings.ends[A.word_timings.words.length - 1] * 1000 }], durOf(fa))[0]
    const sb = span(B.word_timings, PREFIX_WORDS, B.word_timings.words.length, fb)
    const pa = path.join(out, `${n}-prefix.mp3`), pb = path.join(out, `${n}-remainder.mp3`), joined = path.join(out, `${n}-spliced.mp3`), whole = path.join(out, `${n}-whole.mp3`)
    cut(fa, sa.start, sa.end, pa); cut(fb, sb.start, sb.end, pb)
    sh('ffmpeg', ['-y', '-v', 'error', '-i', pa, '-i', pb, '-filter_complex', '[0:a][1:a]concat=n=2:v=0:a=1', '-b:a', '64k', joined])
    fs.copyFileSync(fw, whole)
    index.push({ n, label: p.label, wholeText: A.text, prefixCutFrom: A.text, remainderCutFrom: `${B.text} (${p.remFrom})`, prefixMs: [sa.start, sa.end], remainderMs: [sb.start, sb.end],
      files: { whole: path.basename(whole), spliced: path.basename(joined) } })
  }
  fs.writeFileSync(path.join(out, 'index.json'), JSON.stringify(index, null, 2))
  console.log(JSON.stringify(index, null, 1))
  await pg.end()
}
main().catch(e => { console.error(e); process.exit(1) })
