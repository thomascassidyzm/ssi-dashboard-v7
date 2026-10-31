/**
 * The outside-world half of clip-cut.cjs (job #410): the clip's SERVED bytes (the learner app's own audio proxy, so the
 * cut is measured on exactly what a learner hears), ffmpeg decode, and local whisper (whisper-cli behind its global
 * concurrency-cap wrapper, ~/.local/bin/whisper-cli). No render, no provider, no database.
 */
'use strict'

const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFile } = require('child_process')
const { promisify } = require('util')
const run = promisify(execFile)

const AUDIO_BASE = process.env.CLIP_CUT_AUDIO_BASE || 'https://staging.saysomethingin.app'
const WHISPER = process.env.CLIP_CUT_WHISPER || path.join(os.homedir(), '.local', 'bin', 'whisper-cli')
const MODEL = process.env.CLIP_CUT_MODEL || path.join(os.homedir(), '.local', 'share', 'whisper-models', 'ggml-small.bin')
const PROMPT = { zh: '以下是普通话的句子。' }
const UNSPACED = new Set(['zh', 'ja', 'th'])
const PAD_S = 0.4 // whisper hears a bare slice badly at its very edges; silence either side, as tools/pod-drill-cuts does

function wav(pcm) {
  const h = Buffer.alloc(44)
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8); h.write('fmt ', 12)
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(16000, 24)
  h.writeUInt32LE(32000, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40)
  return Buffer.concat([h, pcm])
}

async function whisperJson(pcm, lang, words) {
  const dir = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'clip-cut-'))
  try {
    const pad = Buffer.alloc(words ? 0 : Math.round(16000 * PAD_S) * 2)
    const f = path.join(dir, 'a.wav')
    fs.writeFileSync(f, wav(Buffer.concat([pad, pcm, pad])))
    const args = ['-m', MODEL, '-l', lang, '-oj', '-of', path.join(dir, 'a'), '-np', '-t', '2']
    // word timings: one token per segment. -sow (split on word) keeps a whole space-less Chinese line as ONE "word"
    // (#410: "whisper heard 1 word(s) for 4 pieces"), so an unspaced script is split per token instead
    if (words) args.push('-ml', '1', ...(UNSPACED.has(lang) ? [] : ['-sow']))
    if (PROMPT[lang]) args.push('--prompt', PROMPT[lang])
    args.push(f)
    await run(WHISPER, args, { timeout: 180_000, maxBuffer: 1 << 24 })
    return JSON.parse(fs.readFileSync(path.join(dir, 'a.json'), 'utf8')).transcription || []
  } finally { fs.rmSync(dir, { recursive: true, force: true }) }
}

function liveCutIo({ audioBase = AUDIO_BASE } = {}) {
  return {
    async clipBytes(id) {
      const r = await fetch(`${audioBase}/api/audio/${encodeURIComponent(id)}`)
      if (!r.ok) throw new Error(`clip ${id}: HTTP ${r.status} from the audio proxy`)
      return Buffer.from(await r.arrayBuffer())
    },
    async decode(mp3) {
      const dir = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'clip-cut-'))
      try {
        const f = path.join(dir, 'a.mp3'); fs.writeFileSync(f, mp3)
        const { stdout } = await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', f, '-f', 's16le', '-ac', '1', '-ar', '16000', '-'], { encoding: 'buffer', maxBuffer: 1 << 28 })
        return stdout
      } finally { fs.rmSync(dir, { recursive: true, force: true }) }
    },
    async words(pcm, lang) {
      return (await whisperJson(pcm, lang, true)).map((x) => ({ text: String(x.text || '').trim(), startMs: x.offsets.from, endMs: x.offsets.to }))
    },
    async hear(pcm, lang) {
      return (await whisperJson(pcm, lang, false)).map((x) => String(x.text || '').trim()).join(' ').trim()
    },
  }
}

module.exports = { liveCutIo, wav }
