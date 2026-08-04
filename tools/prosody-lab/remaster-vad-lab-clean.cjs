#!/usr/bin/env node
/**
 * remaster-vad-lab-clean.cjs — clean-mastered copies of the VAD Lab's xAI
 * clips (founder ruling 2026-07-29: "we should not have that hissy mastering
 * stuff" — approval scoped STRICTLY to the VAD Lab clip set).
 *
 * The hiss: normalizeAudio()'s PRE_COMPRESS stage (acompressor 8:1 below
 * -24dB) plus make-up gain lifts the noise floor of the peaky xAI clones into
 * audibility. No raw pre-master copies of the estate renders are retained, so
 * each in-scope clip is RE-RENDERED via the xAI API (same voice, same text,
 * explicit language) and then mastered with normalizeAudioClean() — no
 * compressor, plain gain to target, true-peak limiter safety net, anti-click
 * fades kept (Tom 2026-06-26: a click-off MUST never happen). A fresh render
 * is a new TAKE of the phrase: contours/scores in the lab data still describe
 * the original master, and the lab UI labels the clean copy accordingly.
 *
 * WHAT THIS SCRIPT NEVER DOES: it never writes to course_audio, never touches
 * S3, never overwrites any production asset, and never regenerates non-VAD-Lab
 * audio. Output is ONLY public/vad-lab-clean/<clip_id>.mp3 + manifest.json in
 * this repo (committed, served statically by the dashboard — same pattern as
 * the lab-data part-files). Kai's pipeline and the paused audio batch are
 * untouched; the default normalizeAudio() chain is bit-identical to before.
 *
 * Scope: every lab-data pair side with origin 'tts' whose provider is neither
 * azure nor elevenlabs — i.e. the xai_* voices plus the opaque-id xAI clone
 * casts (e.g. the zho voices). Dry-run prints the exact voice/clip list.
 *
 * Needs: XAI_API_KEY (env, .env, or `node tools/secrets.cjs load`), ffmpeg,
 * lame. Run on a machine that has them (Camberley), then commit
 * public/vad-lab-clean/.
 *
 * Usage:
 *   node tools/prosody-lab/remaster-vad-lab-clean.cjs            # dry-run
 *   node tools/prosody-lab/remaster-vad-lab-clean.cjs --apply    # render + master
 * Resume-safe: clips already in public/vad-lab-clean/ are skipped.
 */

const fs = require('fs')
const path = require('path')
const os = require('os')

const REPO = path.resolve(__dirname, '..', '..')
require('dotenv').config({ path: path.join(REPO, '.env') })
const { generateXai } = require(path.join(REPO, 'services', 'tts-service.cjs'))
const { normalizeAudioClean } = require(path.join(REPO, 'services', 'audio-processor.cjs'))

const LAB_DIR = path.join(REPO, 'public', 'vad-lab')
const OUT_DIR = path.join(REPO, 'public', 'vad-lab-clean')
const APPLY = process.argv.includes('--apply')

// lang3 → BCP-47 for the xAI multilingual voices (explicit language is
// mandatory for course-language renders — see generateXai's warning).
const BCP47 = {
  eng: 'en', fra: 'fr', spa: 'es', ita: 'it', zho: 'zh',
  por: 'pt', kor: 'ko', eus: 'eu', cym: 'cy',
}

function loadLab() {
  const man = JSON.parse(fs.readFileSync(path.join(LAB_DIR, 'manifest.json'), 'utf8'))
  return JSON.parse(Buffer.concat(man.parts.map((p) => fs.readFileSync(path.join(LAB_DIR, p)))))
}

// The baked lab data carries provider:null on many pre-breadth pairs, so
// derive the provider from the voice id (same patterns as sample-pairs.cjs);
// 'legacy_import' is a human recording whatever its origin tag says.
function sideProvider(side) {
  const v = side.voice || ''
  if (side.origin === 'human' || v === 'legacy_import') return 'human'
  if (/^azure_/.test(v) || /^[a-z]{2,3}-[A-Z]{2}-.*Neural/.test(v)) return 'azure'
  if (/^elevenlabs_/.test(v)) return 'elevenlabs'
  if (/^xai_/.test(v)) return 'xai'
  return side.provider && side.provider !== 'other' ? side.provider : 'other'
}

function inScope(side) {
  if (side.origin !== 'tts') return false
  const p = sideProvider(side)
  return p !== 'azure' && p !== 'elevenlabs' && p !== 'human'
}

async function main() {
  const lab = loadLab()
  const scope = new Map() // clip_id → { voice, language, text }
  for (const pair of lab.pairs) {
    for (const [side, text] of [[pair.a, pair.text_a], [pair.b, pair.text_b || pair.text_a]]) {
      if (inScope(side) && !scope.has(side.id))
        scope.set(side.id, { voice: side.voice, language: pair.language, text })
    }
  }

  const manifestPath = path.join(OUT_DIR, 'manifest.json')
  const manifest = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    : { note: 'clean-mastered VAD Lab xAI clips — tools/prosody-lab/remaster-vad-lab-clean.cjs', clips: {} }

  const todo = [...scope.entries()].filter(([id]) => !manifest.clips[id] || !fs.existsSync(path.join(OUT_DIR, `${id}.mp3`)))
  const voices = [...new Set([...scope.values()].map((s) => s.voice))].sort()

  console.log(`in scope: ${scope.size} clip sides (${voices.length} voices): ${voices.join(', ')}`)
  console.log(`already done: ${scope.size - todo.length}, to render: ${todo.length}`)
  if (!APPLY) {
    for (const [id, s] of todo) console.log(`  ${id} ${s.language} ${s.voice} "${String(s.text).slice(0, 50)}"`)
    console.log('\nDRY RUN — pass --apply to render and master (xAI API calls cost money;')
    console.log('founder approval 2026-07-29 covers exactly this VAD Lab clip set).')
    return
  }

  const apiKey = process.env.XAI_API_KEY
  if (!apiKey) {
    console.error('XAI_API_KEY missing — set it in env/.env or run `node tools/secrets.cjs load`.')
    process.exit(1)
  }
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vad-clean-'))
  let ok = 0, failed = 0
  for (const [id, s] of todo) {
    try {
      const voiceId = s.voice.replace(/^xai_/, '')
      const language = BCP47[s.language] || s.language
      const { audioBuffer } = await generateXai(s.text, { apiKey, voiceId, language })
      const rawPath = path.join(tmp, `${id}.raw.mp3`)
      fs.writeFileSync(rawPath, audioBuffer)
      const outPath = path.join(OUT_DIR, `${id}.mp3`)
      const lufs = await normalizeAudioClean(rawPath, outPath)
      manifest.clips[id] = {
        voice: s.voice,
        language: s.language,
        text: s.text,
        input_lufs: Math.round(lufs.inputLUFS * 10) / 10,
        output_lufs: Math.round(lufs.outputLUFS * 10) / 10,
        rendered: new Date().toISOString(),
      }
      fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1))
      ok++
      console.log(`ok  ${id} ${s.language} ${s.voice} → ${manifest.clips[id].output_lufs} LUFS`)
    } catch (e) {
      failed++
      console.error(`FAIL ${id} ${s.voice}: ${e.message}`)
    }
  }
  const lufsVals = Object.values(manifest.clips).map((c) => c.output_lufs).sort((a, b) => a - b)
  console.log(`\ndone: ${ok} rendered, ${failed} failed, ${Object.keys(manifest.clips).length} total clean clips`)
  if (lufsVals.length)
    console.log(`clean-clip LUFS: min ${lufsVals[0]}, median ${lufsVals[Math.floor(lufsVals.length / 2)]}, max ${lufsVals[lufsVals.length - 1]}`)
  console.log(`commit public/vad-lab-clean/ to ship — the VAD Lab picks the manifest up automatically.`)
}

main().catch((e) => { console.error(e); process.exit(1) })
