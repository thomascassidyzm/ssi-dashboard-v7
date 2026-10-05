#!/usr/bin/env node
/**
 * ita-blind-ab-build.cjs — job #842 (Tom 2026-10-05): 24 blind A/B pairs, Italian, one Cartesia voice. One side is the real
 * whole take of a practice phrase; the other is the same phrase assembled by cutting LEGO-boundary chunks (slot-matched)
 * out of OTHER whole takes via take-g-spans.paddedSpans. No TTS, no course pointer touched.
 *   node tools/audio/ita-blind-ab-build.cjs <cands.json from ita-blind-ab-find.cjs> <outDir>
 * Writes pairs.mp4 (blind listen), key.json, key.md, per-pair mp3s.
 */
const fs = require('fs'), path = require('path')
const { execFileSync } = require('child_process')
const { paddedSpans } = require('../../services/shared/take-g-spans.cjs')
const BASE = process.env.LEARNER_AUDIO_BASE || 'https://saysomethingin.app/api/audio'
const N = 24
const sh = (c, a) => execFileSync(c, a, { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 28 })
let seed = 842; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }
const V = /[aeiouàèéìòùáíóú]/i

function seams(c) { // hard seams: elision (apostrophe at the join) or vowel meeting vowel
  const t = c.chunks.map(k => k.text); let hard = 0, why = []
  for (let i = 0; i < t.length - 1; i++) {
    const a = t[i], b = t[i + 1]
    if (/'$|^'/.test(a) || /'/.test(a.split(' ').pop()) || /'/.test(b.split(' ')[0])) { hard++; why.push('elision') }
    else if (V.test(a.slice(-1)) && V.test(b[0])) { hard++; why.push('vowel+vowel') }
  }
  return { hard, why }
}

async function main() {
  const [candFile, out] = process.argv.slice(2); if (!candFile || !out) throw new Error('usage: <cands.json> <outDir>')
  fs.mkdirSync(out, { recursive: true })
  require('dotenv').config({ path: path.join(__dirname, '../../.env.psql') })
  const { Client } = require('pg'); const pg = new Client({ connectionString: process.env.DATABASE_URL }); await pg.connect()
  let cands = JSON.parse(fs.readFileSync(candFile))
  // no rising question prosody leaking in from sources unless the target phrase is itself a question
  cands = cands.filter(c => /\?\s*$/.test(c.text) || c.chunks.every(k => !/\?\s*$/.test(k.srcText)))
  cands = cands.filter(c => new Set(c.chunks.map(k => k.srcId)).size === c.chunks.length)
  cands.forEach(c => { c.seam = seams(c) })
  // quotas: length bands x seam-hardness
  const bands = [[3, 4, 5], [5, 6, 7], [7, 9, 7], [10, 14, 5]] // [min,max,count]
  const picked = [], seenText = new Set(), seenSrc = new Set()
  const take = (c) => { if (seenText.has(c.text.toLowerCase()) || c.chunks.some(k => seenSrc.has(k.srcId))) return false; picked.push(c); seenText.add(c.text.toLowerCase()); c.chunks.forEach(k => seenSrc.add(k.srcId)); return true }
  for (const [lo, hi, cnt] of bands) {
    const pool = shuffle(cands.filter(c => c.nwords >= lo && c.nwords <= hi))
    const hard = pool.filter(c => c.seam.hard > 0), easy = pool.filter(c => !c.seam.hard)
    let got = 0
    const nHard = Math.ceil(cnt / 2)
    for (const c of hard) { if (got >= nHard) break; if (take(c)) got++ }
    for (const c of easy) { if (got >= cnt) break; if (take(c)) got++ }
    for (const c of hard) { if (got >= cnt) break; if (take(c)) got++ }
  }
  console.log('picked', picked.length)
  const ids = [...new Set(picked.flatMap(c => [c.aid, ...c.chunks.map(k => k.srcId)]))]
  const { rows } = await pg.query('select id, text, word_timings, duration_ms from course_audio where id = any($1)', [ids]); const R = new Map(rows.map(r => [r.id, r]))
  const fetchClip = id => { const f = path.join(out, `src-${id}.mp3`); if (!fs.existsSync(f)) sh('curl', ['-sf', '-o', f, `${BASE}/${id}`]); return f }
  const durOf = f => Number(sh('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString()) * 1000
  const cut = (file, a, b, dest) => sh('ffmpeg', ['-y', '-v', 'error', '-i', file, '-ss', String(a / 1000), '-to', String(b / 1000),
    '-af', 'afade=t=in:d=0.004,afade=t=out:st=' + Math.max(0, (b - a) / 1000 - 0.004) + ':d=0.004', '-ar', '48000', '-ac', '1', dest])
  // span of words [i,j) of a take, padded into neighbouring gaps exactly as the Pod 1 cutter does
  const spanOf = (r, f, i, j) => {
    const wt = r.word_timings, ms = k => [Math.round(wt.starts[k] * 1000), Math.round(wt.ends[k] * 1000)], nw = wt.words.length, sp = []
    if (i > 0) sp.push({ start: ms(0)[0], end: ms(i - 1)[1] })
    sp.push({ start: ms(i)[0], end: ms(j - 1)[1] })
    if (j < nw) sp.push({ start: ms(j)[0], end: ms(nw - 1)[1] })
    return paddedSpans(sp, durOf(f))[i > 0 ? 1 : 0]
  }
  // wordiness check: source word i..j must be present as the intended text in timing words
  const final = [], key = []
  const sides = shuffle(Array.from({ length: picked.length }, (_, i) => i % 2 === 0)) // exactly half the cuts land on A
  let n = 0
  for (const c of shuffle(picked.slice())) {
    n++
    const pieces = []
    c.chunks.forEach((k, ci) => {
      const r = R.get(k.srcId), f = fetchClip(k.srcId), s = spanOf(r, f, k.srcI, k.srcI + k.srcN), d = path.join(out, `p${n}-c${ci}.mp3`)
      cut(f, s.start, s.end, d); pieces.push(d)
    })
    const cutF = path.join(out, `p${n}-cut.wav`), wholeF = path.join(out, `p${n}-whole.wav`)
    const inputs = pieces.flatMap(p => ['-i', p])
    sh('ffmpeg', ['-y', '-v', 'error', ...inputs, '-filter_complex', pieces.map((_, i) => `[${i}:a]`).join('') + `concat=n=${pieces.length}:v=0:a=1`, '-ar', '48000', '-ac', '1', cutF])
    sh('ffmpeg', ['-y', '-v', 'error', '-i', fetchClip(c.aid), '-ar', '48000', '-ac', '1', wholeF])
    // identical processing for both sides: loudness-match to the same target so level is no tell
    const norm = (src, dst) => sh('ffmpeg', ['-y', '-v', 'error', '-i', src, '-af', 'loudnorm=I=-20:TP=-2:LRA=7', '-ar', '48000', '-ac', '1', dst])
    const cutN = path.join(out, `p${n}-cutN.wav`), wholeN = path.join(out, `p${n}-wholeN.wav`); norm(cutF, cutN); norm(wholeF, wholeN)
    const cutIsA = sides[n - 1]
    final.push({ n, a: cutIsA ? cutN : wholeN, b: cutIsA ? wholeN : cutN })
    key.push({ n, text: c.text, phraseId: c.pid, cutIs: cutIsA ? 'A' : 'B', wholeIs: cutIsA ? 'B' : 'A', words: c.nwords, seam: c.seam, chunks: c.chunks.map(k => ({ text: k.text, slot: k.slot, from: k.srcText })) })
  }
  // master audio: per pair [ding][A][gap][B][gap]; timeline for on-screen labels
  const sil = (s, f) => sh('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', `anullsrc=r=48000:cl=mono`, '-t', String(s), f])
  const gapS = path.join(out, 'gap-short.wav'), gapL = path.join(out, 'gap-long.wav'), ding = path.join(out, 'ding.wav')
  sil(0.9, gapS); sil(0.5, gapL)
  sh('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=880:duration=0.18', '-af', 'afade=t=out:st=0.08:d=0.1,volume=0.35', '-ar', '48000', '-ac', '1', ding])
  const parts = [], tl = []; let t = 0
  const add = (f, label) => { const d = durOf(f) / 1000; parts.push(f); if (label) tl.push({ ...label, t0: t, t1: t + d }); t += d }
  for (const p of final) {
    add(ding, { n: p.n, lab: '' }); add(gapL, { n: p.n, lab: '' })
    add(p.a, { n: p.n, lab: 'A' }); add(gapS, { n: p.n, lab: '' })
    add(p.b, { n: p.n, lab: 'B' }); add(gapS, null); add(gapS, null)
  }
  const list = path.join(out, 'concat.txt'); fs.writeFileSync(list, parts.map(p => `file '${p}'`).join('\n'))
  const master = path.join(out, 'master.wav'); sh('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', master])
  // video: pair number all the time within its span, A/B large while that clip plays
  const FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
  const pairSpan = {}; for (const e of tl) { const s = pairSpan[e.n] || (pairSpan[e.n] = { t0: e.t0, t1: e.t1 }); s.t0 = Math.min(s.t0, e.t0); s.t1 = Math.max(s.t1, e.t1) }
  const nums = Object.keys(pairSpan).map(k => { const s = pairSpan[k], end = Number(k) < N ? pairSpan[Number(k) + 1]?.t0 ?? t : t; return `drawtext=fontfile=${FONT}:text='Pair ${k} of ${final.length}':fontcolor=white:fontsize=64:x=(w-text_w)/2:y=h*0.18:enable='between(t,${s.t0.toFixed(3)},${end.toFixed(3)})'` })
  const labs = tl.filter(e => e.lab).map(e => `drawtext=fontfile=${FONT}:text='${e.lab}':fontcolor=0xffd54a:fontsize=320:x=(w-text_w)/2:y=(h-text_h)/2:enable='between(t,${e.t0.toFixed(3)},${e.t1.toFixed(3)})'`)
  fs.writeFileSync(path.join(out, 'vf.txt'), [...nums, ...labs].join(',\n'))
  sh('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', `color=c=0x111111:s=720x1280:r=10:d=${t.toFixed(3)}`, '-i', master, '-filter_script:v', path.join(out, 'vf.txt'),
    '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k', '-shortest', '-movflags', '+faststart', path.join(out, 'pairs.mp4')])
  fs.writeFileSync(path.join(out, 'key.json'), JSON.stringify(key, null, 1))
  const md = ['# Italian blind A/B — answer key', '', 'Voice: Cartesia (ita_for_eng target1 voice 0e21713a). Cut = chunks cut from OTHER whole takes at LEGO boundaries (slot-matched, Pod 1 cutter padding). Whole = the real take of the phrase.', '',
    '| Pair | Phrase | CUT is | Chunks (slot ← source take) | Hard seams |', '|---|---|---|---|---|',
    ...key.map(k => `| ${k.n} | ${k.text} | **${k.cutIs}** | ${k.chunks.map(c => `${c.text} (${c.slot} ← “${c.from}”)`).join(' + ')} | ${k.seam.why.join(', ') || '—'} |`)]
  fs.writeFileSync(path.join(out, 'key.md'), md.join('\n') + '\n')
  console.log('total s', t.toFixed(1)); await pg.end()
}
main().catch(e => { console.error(e); process.exit(1) })
