#!/usr/bin/env node
/**
 * Pod 3 round-6 POC voicing (cs #603·AK): script .md -> cue list -> one trial clip per spoken
 * line (through Popty's one audio route, tools/audio/render.cjs --trial) -> an overlapping stereo
 * mix + a timing map -> a self-contained follow-along page.
 *
 *   node voice.cjs parse  <script.md>                      cue list + character count, spends nothing
 *   node voice.cjs render <script.md> <workdir>            renders what the workdir does not hold yet
 *   node voice.cjs mix    <script.md> <workdir> <slug>     <workdir>/<slug>.mp3 + <slug>.timing.json
 *   node voice.cjs page   <script.md> <workdir> <slug> <outdir>   <outdir>/<slug>.html + .mp3
 *
 * Nothing here holds a provider key or touches a course: trial clips have no course row.
 * Audio is never committed; the workdir is scratch. manifest.json (clip ids, characters) is copied
 * next to this file as the record.
 */
'use strict'
const fs = require('fs'), path = require('path')
const { execFileSync, spawnSync } = require('child_process')

const POPTY = process.env.POPTY_CHECKOUT || path.join(process.env.HOME, 'SSi/ssi-dashboard-v7-clean')
const POPTY_URL = process.env.POPTY_URL || 'http://localhost:3470'
const JOB = '#603', AGENT = 'cs-603AK-pod3-voicing'
const SR = 44100

// The cast. pan: -1 left .. 1 right (light placement round the table). tempo/shelf: post-render
// (Aran's PRO clone ignores Cartesia speed; atempo keeps pitch; +3 dB low shelf per the 11-08 note).
const CAST = {
  HUGH:   { name: 'Hugh',   voice: 'cartesia_d293d509-eb96-4df4-8cfd-80a693aa49a9', label: 'Tom-006 (Tom\'s clone, Cartesia)', pan: -0.30 },
  DANNY:  { name: 'Danny',  voice: 'cartesia_a45a4855-c275-4fb6-89c5-e5c7de66981a', label: 'Aran PRO v2 clone (Cartesia), played 15% faster', pan: 0.32, tempo: 1.15, shelf: 3 },
  RHI:    { name: 'Rhi',    voice: 'cartesia_130629d3-320c-441b-85a7-cecbd8ad8987', label: 'Catrin\'s clone (Cartesia)', pan: -0.12 },
  SUNNY:  { name: 'Sunny',  voice: 'cartesia_71a7ad14-091c-4e8e-a314-022ece01c121', label: 'Charlotte (Cartesia, the estate\'s English pod voice)', pan: 0.14 },
  // No Azure (r-2026-11-22-azure-voices-are-catastrophically-bad-now). The account has no third British man, so two
  // parts double a real voice with a pitch shift (pitch: asetrate factor, tempo restored): Femi on Aran's instant
  // clone, lowered; the waiter (four lines) on Tom's first clone, raised.
  FEMI:   { name: 'Femi',   voice: 'cartesia_33890587-a29f-4416-ba61-2615c74f92fe', label: 'Aran instant clone aran_english_003 (Cartesia), pitched down 6%', pan: 0.05, pitch: 0.94 },
  JESS:   { name: 'Jess',   voice: 'cartesia_62ae83ad-4f6a-430b-af41-a9bede9286ca', label: 'Gemma (Cartesia)', pan: 0.20 },
  WAITER: { name: 'Waiter', voice: 'cartesia_8fef4d59-0a7e-4ad2-a261-6a3bb50734d2', label: 'Tom\'s first clone tom_001 (Cartesia), pitched up 7%', pan: -0.45, pitch: 1.07 },
}
const key = n => String(n).toUpperCase()

// ───────────────────────────── parse ─────────────────────────────
// A cue: { id, speaker, display, spoken, slashWord|null, cutoff, kind: main|together|aside|back, group }
function parseScript(md) {
  const rows = []   // script order: cues and notes
  let title = '', block = null, group = 0, n = 0
  const cue = (speaker, raw, kind, grp) => {
    // split on bracketed listener noises: *(Rhi: mm)*
    const parts = raw.split(/\*\(([A-Za-z]+): ([^)]*)\)\*/)
    for (let i = 0; i < parts.length; i += 3) {
      const seg = parts[i].trim()
      if (seg) rows.push(mk(speaker, seg, kind, grp, i > 0))
      if (parts[i + 1]) rows.push({ ...mk(key(parts[i + 1]), parts[i + 2].trim(), 'back', grp, false), host: speaker })
    }
  }
  const mk = (speaker, seg, kind, grp, cont) => {
    let spoken = seg.replace(/^[—\s]+/, '')
    const si = spoken.indexOf('/')
    const slashWord = si < 0 ? null : spoken.slice(0, si).trim().split(/\s+/).filter(Boolean).length
    spoken = spoken.replace('/', '')
    return { type: 'cue', id: 'c' + String(++n).padStart(3, '0'), speaker, display: seg.replace('/', ''), spoken, slashWord, slashFrac: si < 0 ? null : si / spoken.length, cutoff: /—$/.test(spoken), kind, group: grp, cont }
  }
  for (const line of md.split('\n')) {
    const l = line.trim()
    if (!l) { if (block && !line.startsWith('>')) block = null; continue }
    let m
    if ((m = l.match(/^# (.*?)(\s*\(script.*)?$/))) { title = m[1]; continue }
    if (l.startsWith('*How to read it')) continue
    if ((m = l.match(/^>\s*\*(together|aside)(.*)\*$/))) { block = m[1]; group++; if (block === 'aside') rows.push({ type: 'note', text: 'aside' + m[2], aside: true, group }); continue }
    if (l === '>') continue
    if ((m = l.match(/^>\s*\*\*([A-Z]+)\*\*\s+(.*)$/))) { cue(m[1], m[2], block, group); continue }
    block = null
    if ((m = l.match(/^\*\*([A-Z]+)\*\*\s+(.*)$/))) { cue(m[1], m[2], 'main', 0); continue }
    if ((m = l.match(/^\*\[?(.*?)\]?\*$/))) { rows.push({ type: 'note', text: m[1] }); continue }
  }
  return { title, rows }
}

// ───────────────────────────── render ─────────────────────────────
function loadManifest(dir) { try { return JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8')) } catch { return {} } }
function render(script, dir) {
  fs.mkdirSync(dir, { recursive: true })
  const man = loadManifest(dir)
  let spent = 0
  for (const c of script.rows.filter(r => r.type === 'cue')) {
    const cast = CAST[c.speaker]; if (!cast) throw new Error('no voice for ' + c.speaker)
    const mk = cast.voice + '|' + c.spoken
    if (!man[mk]) {
      const r = spawnSync('node', [path.join(POPTY, 'tools/audio/render.cjs'), '--course', 'spa_for_eng', '--role', 'known', '--lang', 'eng', '--text', c.spoken,
        '--purpose', `pod 3 POC voicing (Tom-agreed, cs #603): ${cast.name}`, '--voice', cast.voice, '--job', JOB, '--trial'], { encoding: 'utf8', env: { ...process.env, AGENT_ID: AGENT, POPTY_URL } })
      let out; try { out = JSON.parse(r.stdout) } catch { out = { ok: false, error: r.stdout || r.stderr } }
      if (!out.ok) { fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(man, null, 1)); console.error('REFUSED/FAILED on', c.id, c.speaker, JSON.stringify(out)); process.exit(2) }  // a refusal is the answer: stop, never retry
      man[mk] = { audioId: out.audioId, charsSpent: out.charsSpent, durationMs: out.durationMs, provider: out.provider, wordTimings: out.wordTimings || null }
      spent += out.charsSpent || 0
      fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(man, null, 1))
    }
    const f = path.join(dir, man[mk].audioId + '.mp3')
    if (!fs.existsSync(f)) execFileSync('curl', ['-sf', '-o', f, `${POPTY_URL}/api/audio/trial/${man[mk].audioId}`])
    console.log(c.id, c.speaker.padEnd(6), man[mk].audioId, man[mk].durationMs + 'ms')
  }
  console.log('spent this run:', spent, '· total in manifest:', Object.values(man).reduce((a, m) => a + (m.charsSpent || 0), 0))
}

// ───────────────────────────── mix ─────────────────────────────
function decode(file, cast) {
  const af = [cast.pitch ? `aresample=${SR},asetrate=${Math.round(SR * cast.pitch)},aresample=${SR},atempo=${(1 / cast.pitch).toFixed(4)}` : null, cast.tempo ? `atempo=${cast.tempo}` : null, cast.shelf ? `lowshelf=g=${cast.shelf}:f=200` : null, 'highpass=f=70'].filter(Boolean).join(',')
  const buf = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-af', af, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-'], { maxBuffer: 1 << 28 })
  const all = new Float32Array(buf.buffer, buf.byteOffset, buf.length >> 2)
  const TH = 0.012, PAD = Math.round(0.02 * SR)
  let a = 0, b = all.length - 1
  while (a < b && Math.abs(all[a]) < TH) a++
  while (b > a && Math.abs(all[b]) < TH) b--
  a = Math.max(0, a - PAD); b = Math.min(all.length - 1, b + 3 * PAD)
  return { pcm: all.slice(a, b + 1), lead: a / SR }
}
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296) }

function mix(script, dir, slug) {
  const man = loadManifest(dir), rand = rng(slug.length * 7919 + 17)
  const U = (a, b) => a + (b - a) * rand()
  const cues = script.rows.filter(r => r.type === 'cue')
  for (const c of cues) {
    const cast = CAST[c.speaker], m = man[cast.voice + '|' + c.spoken]
    if (!m) throw new Error('not rendered: ' + c.id)
    const d = decode(path.join(dir, m.audioId + '.mp3'), cast)
    c.pcm = d.pcm; c.dur = d.pcm.length / SR; c.audioId = m.audioId
    if (c.slashWord != null) {   // where the next voice comes in: the word's own start when the route gave timings
      const wt = m.wordTimings
      let t = wt && wt.starts && wt.starts[c.slashWord] != null ? (wt.starts[c.slashWord] / (cast.tempo || 1)) - d.lead : c.slashFrac * c.dur
      c.slashAt = Math.min(Math.max(t, 0.25), c.dur - 0.15)
    }
  }
  // one gain per voice so every voice sits level (RMS of its speech), then a whole-mix loudness pass
  const byVoice = {}
  for (const c of cues) { const v = (byVoice[c.speaker] ||= { s: 0, n: 0 }); for (const x of c.pcm) if (Math.abs(x) > 0.02) { v.s += x * x; v.n++ } }
  const TARGET = 0.09
  for (const k in byVoice) byVoice[k].gain = TARGET / Math.sqrt(byVoice[k].s / Math.max(1, byVoice[k].n))

  // schedule
  const lastEnd = {}   // per speaker: nobody talks over themselves
  let cursor = 0.5, pendingSlash = null, pendingCut = false, pendingAside = null, asideLive = null
  const place = (c, t, gainDb = 0, panBias = 0) => { c.start = Math.max(t, (lastEnd[c.speaker] || 0) + 0.05); c.end = c.start + c.dur; lastEnd[c.speaker] = c.end; c.gainDb = gainDb; c.pan = Math.max(-0.8, Math.min(0.8, CAST[c.speaker].pan + panBias)); return c }
  const gapFor = (prev, next) => {
    if (pendingCut) return U(-0.14, -0.04)                       // finished for them / cut off: land on the tail
    if (next.spoken.length < 22 || (prev && prev.spoken.length < 14)) return U(0.07, 0.2)
    if (prev && /\?$/.test(prev.spoken)) return U(0.12, 0.28)
    return U(0.16, 0.4)
  }
  const rows = script.rows
  let prev = null
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    if (r.type === 'note') {
      if (r.aside) { pendingAside = r.group; r.at = null; continue }
      cursor += 0.9; r.at = cursor - 0.45; pendingSlash = null; pendingCut = false; prev = null; continue
    }
    if (r.kind === 'aside') { continue }   // placed when the next main line starts
    if (r.kind === 'back') {
      // a listener's noise lands on the end of the host's segment
      place(r, prev.end - Math.min(0.22, prev.dur * 0.3), -3)
      const q = /\?$/.test(r.spoken)
      cursor = q ? r.end - 0.08 : r.start + Math.min(0.4, r.dur * 0.55)
      r.q = q; pendingSlash = null; pendingCut = false
      continue
    }
    const members = r.kind === 'together' ? rows.filter(x => x.type === 'cue' && x.group === r.group && x.kind === 'together') : [r]
    let t0
    if (pendingSlash != null) t0 = pendingSlash
    else if (prev && rows[i - 1] && rows[i - 1].kind === 'back') t0 = cursor
    else if (r.cont && prev) t0 = cursor + 0.1
    else t0 = cursor + gapFor(prev, r)
    members.forEach((m, k) => place(m, t0 + k * U(0.06, 0.18)))
    if (pendingAside != null) {   // the side-conversation runs under whatever the table says next
      let t = t0 + 0.25
      for (const a of rows.filter(x => x.type === 'cue' && x.kind === 'aside' && x.group === pendingAside)) { place(a, t, -7.5, a.speaker === 'RHI' ? -0.45 : -0.3); t = a.end + U(0.12, 0.3) }
      rows.find(x => x.type === 'note' && x.aside && x.group === pendingAside).at = t0 + 0.25
      pendingAside = null
    }
    const last = members[members.length - 1], end = Math.max(...members.map(m => m.end))
    pendingSlash = last.slashAt != null && members.length === 1 ? last.start + last.slashAt : (members.find(m => m.slashAt != null) ? Math.max(...members.filter(m => m.slashAt != null).map(m => m.start + m.slashAt)) : null)
    pendingCut = pendingSlash == null && members.length === 1 && last.cutoff
    cursor = members.length > 1 ? end - 0.1 : Math.max(end, cursor - 0.25)
    prev = last
    i += members.length - 1
    // skip the other together members already placed (they are contiguous in rows)
  }
  const total = Math.max(...cues.map(c => c.end)) + 0.8
  const L = new Float32Array(Math.ceil(total * SR)), R = new Float32Array(L.length)
  for (const c of cues) {
    const g = byVoice[c.speaker].gain * Math.pow(10, c.gainDb / 20)
    const th = (c.pan + 1) * Math.PI / 4, gl = Math.cos(th) * g * Math.SQRT2, gr = Math.sin(th) * g * Math.SQRT2
    const o = Math.round(c.start * SR), N = c.pcm.length
    const sl = c.slashAt != null ? Math.round(c.slashAt * SR) : -1, fin = Math.round(0.012 * SR), fout = Math.round((c.cutoff ? 0.09 : 0.03) * SR)
    for (let j = 0; j < N; j++) {
      let e = 1
      if (j < fin) e = j / fin
      if (N - j < fout) e *= (N - j) / fout
      if (sl >= 0 && j > sl) e *= 1 - 0.45 * Math.min(1, (j - sl) / Math.max(1, (N - sl) * 0.6))   // the talked-over voice gives way
      const x = c.pcm[j] * e
      L[o + j] += x * gl; R[o + j] += x * gr
    }
  }
  const inter = new Float32Array(L.length * 2)
  for (let j = 0; j < L.length; j++) { inter[2 * j] = L[j]; inter[2 * j + 1] = R[j] }
  const raw = path.join(dir, slug + '.f32'); fs.writeFileSync(raw, Buffer.from(inter.buffer))
  const inArgs = ['-f', 'f32le', '-ar', String(SR), '-ac', '2', '-i', raw]
  const p1 = spawnSync('ffmpeg', ['-hide_banner', ...inArgs, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1 << 26 })
  const measured = parseFloat((p1.stderr.match(/"input_i"\s*:\s*"(-?[\d.]+)"/) || [])[1])
  const gainDb = isFinite(measured) ? -16 - measured : 0
  const mp3 = path.join(dir, slug + '.mp3')
  execFileSync('ffmpeg', ['-v', 'error', '-y', ...inArgs, '-af', `volume=${gainDb.toFixed(2)}dB,alimiter=limit=0.84:attack=3:release=60`, '-c:a', 'libmp3lame', '-b:a', '160k', '-f', 'mp3', mp3])
  fs.unlinkSync(raw)
  const timing = {
    title: script.title, duration: +total.toFixed(2),
    cast: [...new Set(cues.map(c => c.speaker))].map(k => ({ who: CAST[k].name, voice: CAST[k].label, id: CAST[k].voice })),
    rows: script.rows.map(r => r.type === 'note'
      ? { note: r.text, at: r.at == null ? null : +r.at.toFixed(2), aside: !!r.aside }
      : { who: CAST[r.speaker].name, text: r.display, s: +r.start.toFixed(2), e: +r.end.toFixed(2), kind: r.kind, clip: r.audioId }),
  }
  fs.writeFileSync(path.join(dir, slug + '.timing.json'), JSON.stringify(timing, null, 1))
  console.log(`${mp3}  ${total.toFixed(1)}s  measured ${measured} LUFS, gain ${gainDb.toFixed(1)} dB`)
  const ov = cues.filter(c => cues.some(o => o !== c && o.start < c.start && o.end > c.start + 0.05)).length
  console.log(`${cues.length} clips, ${ov} of them start while another voice is still speaking`)
}

// ───────────────────────────── page ─────────────────────────────
function page(dir, slug, outdir) {
  fs.mkdirSync(outdir, { recursive: true })
  const timing = JSON.parse(fs.readFileSync(path.join(dir, slug + '.timing.json'), 'utf8'))
  fs.copyFileSync(path.join(dir, slug + '.mp3'), path.join(outdir, slug + '.mp3'))
  const html = fs.readFileSync(path.join(__dirname, 'page-template.html'), 'utf8')
    .replace(/__TITLE__/g, timing.title.replace(/&/g, '&amp;').replace(/</g, '&lt;'))
    .replace('__AUDIO__', slug + '.mp3?v=' + Date.now().toString(36))
    .replace('__DATA__', JSON.stringify(timing).replace(/</g, '\\u003c'))
  fs.writeFileSync(path.join(outdir, slug + '.html'), html)
  console.log(path.join(outdir, slug + '.html'))
}

// ───────────────────────────── cli ─────────────────────────────
const [cmd, md, dir, slug, outdir] = process.argv.slice(2)
if (!cmd || !md) { console.error('usage: voice.cjs parse|render|mix|page <script.md> [workdir] [slug] [outdir]'); process.exit(1) }
const script = parseScript(fs.readFileSync(md, 'utf8'))
if (cmd === 'parse') {
  const cues = script.rows.filter(r => r.type === 'cue'); const per = {}
  for (const c of cues) per[c.speaker] = (per[c.speaker] || 0) + c.spoken.length
  for (const r of script.rows) console.log(r.type === 'note' ? `   [${r.text}]` : `${r.id} ${r.kind.padEnd(8)} ${r.speaker.padEnd(6)} ${r.slashWord != null ? '/' + r.slashWord : '  '} ${r.spoken}`)
  console.log(script.title, '·', cues.length, 'clips ·', cues.reduce((a, c) => a + c.spoken.length, 0), 'characters', JSON.stringify(per))
} else if (cmd === 'render') render(script, dir)
else if (cmd === 'mix') mix(script, dir, slug)
else if (cmd === 'page') page(dir, slug, outdir)
