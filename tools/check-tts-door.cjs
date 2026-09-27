#!/usr/bin/env node
/**
 * THE TTS DOOR GATE — fails when any tracked file other than a guarded door
 * calls ANY paid text-to-speech API (Cartesia, Azure, ElevenLabs, xAI, Google,
 * OpenAI, MiniMax, Polly, and any api.* host serving a synthesis path).
 *
 * Tom, 2026-09-26: "when I say something I expect it to be turned into code and
 * used… we build deterministic systems so the stupidity of agents can't cost us
 * 300 USD in one day." The door is services/tts-service.cjs `speak()`: it asks
 * every course's clips for (language, voice, words) before paying for a render.
 * A script with its own fetch to /tts/bytes walks straight past that question,
 * so this gate makes such a script fail the test run instead of reaching Cartesia.
 *
 * Runs in `pretest` (every `npm test`) and as a vitest spec
 * (tools/check-tts-door.test.cjs). NOT yet in the watson-1 nightly: that list
 * lives in ~/command-surface/ops/ci/ci-checks.sh (dashboard leg), outside this
 * repo — it needs one line there: run tts-door "$SYSNODE" tools/check-tts-door.cjs Scans EVERY tracked code file, archive/
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

/** The door every course render goes through. */
const DOOR = 'services/tts-service.cjs'

/**
 * GUARDED DOORS (job #430): the files allowed to send text to a paid TTS
 * provider. Each one calls services/shared/tts-spend-guard.cjs
 * beforeProviderCall() immediately before every billed attempt — the
 * "guarded doors call the guard" test holds each of them to that, so a door
 * cannot lose its guard and keep its pass.
 */
const GUARDED_DOORS = [
  DOOR,
  'services/elevenlabs-service.cjs',
  'services/google-tts-service.cjs',
  'tools/tts-bakeoff/lib/adapter-utils.cjs',
]

/**
 * Files that mention the endpoints without calling them: the door's own tests
 * assert the URL it sends to a stubbed fetch, this gate names the patterns, and
 * the bake-off adapters are request DESCRIPTIONS whose only sender is
 * adapter-utils httpSynthesise (a guarded door) — the adapter test below holds
 * them to having no fetch of their own.
 */
const BAKEOFF_ADAPTERS = /^tools\/tts-bakeoff\/adapters\/[^/]+\.cjs$/
const ALLOWED = new Set([
  ...GUARDED_DOORS,
  'services/tts-service.test.cjs',
  'services/tts-spend-door.test.cjs',
  'services/shared/tts-spend-guard.cjs',
  'tools/check-tts-door.cjs',
  'tools/check-tts-door.test.cjs',
])
const isAllowed = (file) => ALLOWED.has(file) || BAKEOFF_ADAPTERS.test(file)

// Shell and Python count: a curl in a .sh file bills exactly like a fetch.
const CODE = /\.(c|m)?js$|\.ts$|\.vue$|\.py$|\.sh$/

/**
 * Each pattern names one way to reach a provider's synthesis. Job #430 widened
 * it from Cartesia/Azure to every provider the estate holds a key or an adapter
 * for, plus a catch-all for any API host serving a speech-synthesis path, so a
 * provider nobody has named yet still trips it.
 */
const SYNTHESIS_CALLS = [
  // The API host, or a base-URL template ending in a synthesis path. Docs links
  // (docs.cartesia.ai/…/tts/bytes) and prose mentioning /tts/bytes do not match.
  { name: 'Cartesia TTS endpoint', re: /api\.cartesia\.ai\/tts|\}\/tts\/(bytes|sse|websocket)\b|wss:\/\/[^'"`\s]*cartesia/ },
  { name: 'Cartesia SDK', re: /@cartesia\/cartesia-js|from\s+cartesia\s+import|import\s+cartesia\b/ },
  { name: 'Azure TTS REST endpoint', re: /tts\.speech\.microsoft\.com\/cognitiveservices\/v1|['"`]\/cognitiveservices\/v1['"`?]/ },
  { name: 'Azure Speech SDK synthesis', re: /SpeechSynthesizer\b|speak(Ssml|Text)Async\b|azure\.cognitiveservices\.speech/ },
  { name: 'ElevenLabs TTS endpoint', re: /api\.elevenlabs\.io\/v\d+\/text-to-speech|\}\/text-to-speech\/|api\.elevenlabs\.io\/v\d+\/(speech-to-speech|sound-generation|text-to-dialogue)/ },
  { name: 'ElevenLabs SDK', re: /@elevenlabs\/elevenlabs-js|(require\(|from)\s*['"`]elevenlabs(-node|-js)?['"`]|from\s+elevenlabs(\.client)?\s+import|textToSpeech\.(convert|stream)|text_to_speech\.(convert|stream)/ },
  { name: 'xAI TTS endpoint', re: /api\.x\.ai\/v\d+\/tts(?!\/voices)|['"`]\/v1\/tts['"`]/ },
  { name: 'Google TTS', re: /texttospeech\.googleapis\.com|@google-cloud\/text-to-speech|google\.cloud\s*import\s*texttospeech|google\.cloud\.texttospeech|\.synthesizeSpeech\(/ },
  { name: 'OpenAI TTS', re: /api\.openai\.com\/v\d+\/audio\/speech|audio\.speech\.create|['"`]\/audio\/speech['"`]/ },
  { name: 'MiniMax TTS', re: /minimax[^'"`\s]*\/v\d+\/t2a|\/v1\/t2a_v\d/ },
  { name: 'Amazon Polly', re: /SynthesizeSpeechCommand|@aws-sdk\/client-polly|new\s+(AWS\.)?Polly\s*\(|client\(\s*['"]polly['"]/ },
  { name: 'Other TTS provider host', re: /api\.deepgram\.com\/v\d+\/speak|api\.play\.ht|api\.hume\.ai\/v\d+\/tts|api\.lmnt\.com|api\.fish\.audio|api\.murf\.ai|users\.rime\.ai|api\.sws\.speechify\.com|resemble\.ai\/(api|synthesize)|api\.neuphonic\.com|api\.inworld\.ai\/tts/ },
  // Catch-all: any https API host serving a speech-synthesis path.
  { name: 'Unnamed TTS API', re: /https?:\/\/api[.-][^'"`\s/]+\/[^'"`\s]*\b(tts|text-to-speech|text_to_speech|synthesi[sz]e|t2a)\b(?!\/voices)/ },
]

function trackedFiles(root = ROOT) {
  return execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    .split('\0').filter(f => f && CODE.test(f))
}

/** Pure: offenders in { file: text }. */
function findBypasses(files) {
  const out = []
  for (const [file, text] of Object.entries(files)) {
    if (isAllowed(file)) continue
    const lines = text.split('\n')
    lines.forEach((line, i) => {
      const p = SYNTHESIS_CALLS.find(p => p.re.test(line))
      if (p) out.push({ file, line: i + 1, kind: p.name, text: line.trim().slice(0, 140) })
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

module.exports = { DOOR, GUARDED_DOORS, ALLOWED, BAKEOFF_ADAPTERS, SYNTHESIS_CALLS, findBypasses, scanRepo }

if (require.main === module) {
  const offenders = scanRepo()
  if (offenders.length) {
    console.error(`✗ TTS door gate: ${offenders.length} call(s) to a TTS provider outside the guarded doors (${GUARDED_DOORS.join(', ')}):`)
    for (const o of offenders) console.error(`  ${o.file}:${o.line}  [${o.kind}]  ${o.text}`)
    console.error(`Route them through require('${DOOR}').speak(text, provider, config) — it looks every clip up and reserves the spend before it renders — or delete the tool if nothing runs it.`)
    process.exit(1)
  }
  console.log(`✓ TTS door gate: no TTS provider calls outside the ${GUARDED_DOORS.length} guarded doors`)
}
