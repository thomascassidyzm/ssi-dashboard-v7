#!/usr/bin/env node
/**
 * THE TTS DOOR GATE — fails when any tracked file other than the door calls a
 * Cartesia or Azure text-to-speech API.
 *
 * Tom, 2026-09-26: "when I say something I expect it to be turned into code and
 * used… we build deterministic systems so the stupidity of agents can't cost us
 * 300 USD in one day." The door is services/tts-service.cjs `speak()`: it asks
 * every course's clips for (language, voice, words) before paying for a render.
 * A script with its own fetch to /tts/bytes walks straight past that question,
 * so this gate makes such a script fail the test run instead of reaching Cartesia.
 *
 * Runs in `pretest` (so every `npm test` / nightly run), and as a vitest spec
 * (tools/check-tts-door.test.cjs). Scans EVERY tracked code file, archive/
 * included — an archived script still runs if someone runs it.
 *
 * Voice LISTING and cloning endpoints (/voices, /voices/list, /voices/clone)
 * are not synthesis and are not matched.
 *
 *   node tools/check-tts-door.cjs          # exit 1 and list offenders, or exit 0
 */

const { execFileSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')

/** The only file allowed to call a TTS provider. */
const DOOR = 'services/tts-service.cjs'

/**
 * Files that mention the endpoints without calling them: the door's own tests
 * assert the URL it sends to a stubbed fetch, and this gate names the patterns.
 */
const ALLOWED = new Set([
  DOOR,
  'services/tts-service.test.cjs',
  'tools/check-tts-door.cjs',
  'tools/check-tts-door.test.cjs',
])

const CODE = /\.(c|m)?js$|\.ts$|\.vue$|\.py$/

/** Each pattern names one way to reach a provider's synthesis. */
const SYNTHESIS_CALLS = [
  // The API host, or a base-URL template ending in a synthesis path. Docs links
  // (docs.cartesia.ai/…/tts/bytes) and prose mentioning /tts/bytes do not match.
  { name: 'Cartesia TTS endpoint', re: /api\.cartesia\.ai\/tts|\}\/tts\/(bytes|sse|websocket)\b|wss:\/\/[^'"`\s]*cartesia/ },
  { name: 'Cartesia SDK', re: /@cartesia\/cartesia-js|from\s+cartesia\s+import|import\s+cartesia\b/ },
  { name: 'Azure TTS REST endpoint', re: /tts\.speech\.microsoft\.com\/cognitiveservices\/v1|['"`]\/cognitiveservices\/v1['"`?]/ },
  { name: 'Azure Speech SDK synthesis', re: /SpeechSynthesizer\b|speak(Ssml|Text)Async\b|azure\.cognitiveservices\.speech/ },
]

function trackedFiles(root = ROOT) {
  return execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    .split('\0').filter(f => f && CODE.test(f))
}

/** Pure: offenders in { file: text }. */
function findBypasses(files) {
  const out = []
  for (const [file, text] of Object.entries(files)) {
    if (ALLOWED.has(file)) continue
    const lines = text.split('\n')
    lines.forEach((line, i) => {
      for (const p of SYNTHESIS_CALLS) {
        if (p.re.test(line)) out.push({ file, line: i + 1, kind: p.name, text: line.trim().slice(0, 140) })
      }
    })
  }
  return out
}

function scanRepo(root = ROOT) {
  const files = {}
  for (const f of trackedFiles(root)) {
    try { files[f] = fs.readFileSync(path.join(root, f), 'utf8') } catch { /* deleted in the worktree */ }
  }
  return findBypasses(files)
}

module.exports = { DOOR, ALLOWED, SYNTHESIS_CALLS, findBypasses, scanRepo }

if (require.main === module) {
  const offenders = scanRepo()
  if (offenders.length) {
    console.error(`✗ TTS door gate: ${offenders.length} call(s) to a TTS provider outside ${DOOR}:`)
    for (const o of offenders) console.error(`  ${o.file}:${o.line}  [${o.kind}]  ${o.text}`)
    console.error(`Route them through require('${DOOR}').speak(text, provider, config) — it looks every clip up before it renders.`)
    process.exit(1)
  }
  console.log(`✓ TTS door gate: no TTS provider calls outside ${DOOR}`)
}
