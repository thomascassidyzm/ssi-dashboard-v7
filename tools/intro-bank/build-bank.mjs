#!/usr/bin/env node
// MOVED to Popty from ssi-learning-app/tools/intro-bank/build-bank.mjs (job #699, Tom 2026-11-03: "we need everything that touches course content to be a popty tool"); behaviour unchanged, app paths via tools/lib/learning-app.mjs.
/**
 * Build the presentation-intro BANK (Tom 2026-10-11, job #544).
 *
 * The player assembles an English-known presentation intro from separate
 * Charlotte clips: "The <Base language> for" + the LEGO's own prompt clip +
 * "is". This script gets the pieces made through Popty's ONE audio door
 * (library-first, so anything already voiced costs nothing) and writes
 * packages/player-vue/src/playback/introBank.data.json, which the player
 * imports. One variant per slot today; the bank shape takes more.
 *
 *   node tools/intro-bank/build-bank.mjs [--dry-run]
 *
 * Env: POPTY_URL (default http://localhost:3470), AGENT_ID.
 * The door refusing (HTTP 402 / NOT_IN_CHAIN / caps) is the answer: it is
 * printed and the language is left out of the bank, so the player falls back
 * to the single presentation clip there. Never retried.
 */
import { appPath } from '../lib/learning-app.mjs'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const CHARLOTTE = '71a7ad14-091c-4e8e-a314-022ece01c121'
const POPTY = (process.env.POPTY_URL || 'http://localhost:3470').replace(/\/$/, '')
const dry = process.argv.includes('--dry-run')

// Base language = the course code's first segment (spa_mx_for_eng → spa, so
// the Mexican course says "The Spanish for"). English name as the learner
// hears it. Languages of released and beta English-known courses.
const LANGS = {
  afr: 'Afrikaans', ara: 'Arabic', ben: 'Bengali', bul: 'Bulgarian', cat: 'Catalan',
  ces: 'Czech', cym: 'Welsh', dan: 'Danish', deu: 'German', ell: 'Greek',
  est: 'Estonian', eus: 'Basque', fas: 'Persian', fra: 'French', gle: 'Irish',
  glg: 'Galician', heb: 'Hebrew', hin: 'Hindi', hrv: 'Croatian', hun: 'Hungarian',
  hye: 'Armenian', isl: 'Icelandic', ita: 'Italian', jpn: 'Japanese', kor: 'Korean',
  lav: 'Latvian', lit: 'Lithuanian', nep: 'Nepali', nld: 'Dutch', nor: 'Norwegian',
  pol: 'Polish', por: 'Portuguese', ron: 'Romanian', rus: 'Russian', spa: 'Spanish',
  srp: 'Serbian', swa: 'Swahili', swe: 'Swedish', tha: 'Thai', tur: 'Turkish',
  ukr: 'Ukrainian', zho: 'Chinese',
}

async function render(courseCode, role, text) {
  const res = await fetch(`${POPTY}/api/audio/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-agent-id': process.env.AGENT_ID || 'job-544' },
    body: JSON.stringify({
      courseCode, role, text, voiceId: CHARLOTTE, language: 'eng', dryRun: dry,
      purpose: 'job544: presentation intro bank piece (Tom ruling 2026-10-11)',
    }),
  })
  const out = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }))
  if (!res.ok || !out.ok) { console.error(`REFUSED ${courseCode} "${text}":`, JSON.stringify(out)); return null }
  console.log(`${out.source.padEnd(8)} ${String(out.charsSpent).padStart(3)} chars  ${courseCode}  "${text}"`)
  return { audioId: out.audioId, durationMs: out.durationMs }
}

const is = await render('deu_for_eng', 'known', 'is')
const asIn = await render('deu_for_eng', 'known', 'as in')
if (!is) { console.error('no "is" piece — nothing to assemble with; bank not written'); process.exit(2) }

const langFor = {}
for (const [code, name] of Object.entries(LANGS)) {
  const piece = await render(`${code}_for_eng`, 'presentation', `The ${name} for`)
  if (piece) langFor[code] = [{ id: piece.audioId, text: `The ${name} for`, ms: piece.durationMs }]
}

const bank = {
  version: 1,
  // Pieces are Charlotte. The player assembles only for a course whose known
  // voice is this one, so the LEGO prompt in the middle matches the pieces.
  voiceId: CHARLOTTE,
  is: [{ id: is.audioId, text: 'is', ms: is.durationMs }],
  asIn: asIn ? [{ id: asIn.audioId, text: 'as in', ms: asIn.durationMs }] : [],
  langFor,
}
if (dry) { console.log('dry run: bank not written'); process.exit(0) }
const out = appPath('packages/player-vue/src/playback/introBank.data.json')   // the player bundles it from the learning-app checkout
writeFileSync(out, JSON.stringify(bank, null, 2) + '\n')
console.log(`wrote ${out} — ${Object.keys(langFor).length}/${Object.keys(LANGS).length} languages`)
