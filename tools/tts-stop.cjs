#!/usr/bin/env node
/**
 * TOM'S AUDIO STOP — the one switch (job #676).
 *
 * Tom, 2026-09-28 23:40Z: "stop ALL audio generation, every provider, every
 * caller, every person ... until the re-render problem is completely fixed.
 * Only Tom lifts it."
 *
 *   node tools/tts-stop.cjs status   # is it on? what does it hold?
 *   node tools/tts-stop.cjs stop     # impose it (idempotent)
 *   node tools/tts-stop.cjs lift     # ONLY on Tom's word: undo both layers
 *
 * Two layers, because one does not reach everything:
 *
 *  1. THE LEDGER ROW. One row, provider '*', in tts_spend_trips. Every render
 *     through the spend guard (services/shared/tts-spend-guard.cjs) reserves in
 *     that shared DB first, and tts_spend_reserve refuses every provider with
 *     STOPPED_BY_TOM while the row exists (ops/sql/20260928-tts-spend-tom-stop.sql).
 *     This binds every guarded process on every host at once, with no deploy
 *     and no restart.
 *
 *  2. THE KEYS ON THIS HOST. Checkouts older than the guard (wt-*, snapshots,
 *     the detached keystore checkout, anything at a pre-2026-09-27 commit) call
 *     providers with no ledger at all. The only thing they share with the
 *     guarded estate is the provider keys in their .env files, so `stop`
 *     replaces each TTS key value with a placeholder the provider rejects
 *     (401, never billed), keeping the real lines in a private vault; `lift`
 *     puts them back line by line, then restarts the Popty services that read
 *     the keys at boot. Not reached: any machine other than this one, and
 *     Vercel / Supabase edge env (job #676 found no TTS caller there).
 */

const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFileSync } = require('child_process')

const HOME = os.homedir()
const VAULT = path.join(HOME, '.local', 'state', 'ssi-tts-spend', 'tom-stop')
const MANIFEST = path.join(VAULT, 'manifest.json')
const PLACEHOLDER = 'STOPPED-BY-TOM-2026-09-28-see-tools-tts-stop'
/** The paid-TTS credentials. Not CARTESIA_ADMIN_API_KEY: that one only READS usage. */
const TTS_KEY_LINE = /^(\s*(?:export\s+)?(?:CARTESIA_API_KEY\w*|AZURE_SPEECH_KEY|AZURE_TTS_KEY|ELEVENLABS_API_KEY|XAI_API_KEY)\s*=)(.*)$/
const STOP_MESSAGE = "Tom ruled 2026-09-28 23:40Z: ALL audio generation is stopped, every provider (Cartesia, Azure, ElevenLabs, any other), every caller, every person, until the re-render problem is completely fixed (job #676)"
/** Services that load the keys at boot: restarted on lift so they see them again. */
const RESTART_ON_LIFT = ['popty-phase8-audio.service', 'popty-production-api.service', 'popty-course-builder-api.service']

function psql(sql) {
  const envPsql = [path.join(HOME, 'ssi-dashboard-v7-clean', '.env.psql'), path.join(HOME, 'SSi', 'ssi-dashboard-v7-clean', '.env.psql')].find(f => fs.existsSync(f))
  const url = process.env.DATABASE_URL || (envPsql && (fs.readFileSync(envPsql, 'utf8').match(/^DATABASE_URL=(.*)$/m) || [])[1])
  if (!url) throw new Error('no DATABASE_URL (.env.psql)')
  return execFileSync('psql', [url.trim().replace(/^["']|["']$/g, ''), '-v', 'ON_ERROR_STOP=1', '-Atc', sql], { encoding: 'utf8' }).trim()
}

/** Every real (not symlinked, not example) .env file under $HOME holding a TTS key. */
function keyFiles() {
  let out = ''
  try {
    out = execFileSync('find', [HOME, '-maxdepth', '6', '-type', 'f', '-name', '.env*',
      '-not', '-name', '*.example', '-not', '-path', '*/node_modules/*', '-not', '-path', '*/.cs-scratch/*', '-not', '-path', `${VAULT}/*`],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  } catch (e) { out = e.stdout || '' }
  // The key backups in ~/.secrets are copied into checkouts by hand: hold them too.
  const secrets = path.join(HOME, '.secrets')
  if (fs.existsSync(secrets)) out += '\n' + fs.readdirSync(secrets).filter(n => n.endsWith('.env')).map(n => path.join(secrets, n)).join('\n')
  return out.split('\n').filter(Boolean).filter(f => {
    try { return fs.readFileSync(f, 'utf8').split('\n').some(l => TTS_KEY_LINE.test(l)) } catch { return false }
  })
}

const loadManifest = () => { try { return JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) } catch { return { files: {} } } }
const saveManifest = (m) => { fs.mkdirSync(VAULT, { recursive: true, mode: 0o700 }); fs.writeFileSync(MANIFEST, JSON.stringify(m, null, 2), { mode: 0o600 }) }

function neutraliseKeys() {
  const m = loadManifest(); let changed = 0
  for (const f of keyFiles()) {
    const lines = fs.readFileSync(f, 'utf8').split('\n')
    const held = m.files[f] || []
    let touched = false
    const next = lines.map((l, i) => {
      const k = l.match(TTS_KEY_LINE)
      if (!k || k[2].trim() === '' || k[2].includes(PLACEHOLDER)) return l
      held.push({ line: i, original: l })
      touched = true
      return `${k[1]}${PLACEHOLDER}`
    })
    if (!touched) continue
    m.files[f] = held
    saveManifest(m)   // the vault holds the originals BEFORE the file changes
    const mode = fs.statSync(f).mode
    fs.writeFileSync(f, next.join('\n'), { mode })
    changed++
    console.log(`  keys held: ${f}`)
  }
  return changed
}

function restoreKeys() {
  const m = loadManifest(); let restored = 0
  for (const [f, held] of Object.entries(m.files)) {
    if (!fs.existsSync(f)) { console.log(`  gone, skipped: ${f}`); continue }
    const lines = fs.readFileSync(f, 'utf8').split('\n')
    for (const h of held) {
      const name = (h.original.match(TTS_KEY_LINE) || [])[1]
      // Restore by NAME at the placeholder, so edits elsewhere in the file survive.
      const i = lines.findIndex(l => l.includes(PLACEHOLDER) && name && l.startsWith(name))
      if (i >= 0) { lines[i] = h.original; restored++ }
    }
    fs.writeFileSync(f, lines.join('\n'))
    console.log(`  keys restored: ${f}`)
  }
  fs.renameSync(MANIFEST, `${MANIFEST}.lifted-${new Date().toISOString().replace(/[:.]/g, '-')}`)
  return restored
}

function status() {
  const row = psql("select coalesce((select json_build_object('code', code, 'at', at, 'message', message)::text from tts_spend_trips where provider = '*'), '')")
  const held = Object.keys(loadManifest().files).length
  const stillLive = keyFiles().filter(f => fs.readFileSync(f, 'utf8').split('\n').some(l => { const k = l.match(TTS_KEY_LINE); return k && k[2].trim() && !k[2].includes(PLACEHOLDER) }))
  console.log(row ? `STOP IS ON — ledger row: ${row}` : 'stop is OFF in the ledger (no * row)')
  console.log(`keys held in the vault: ${held} file(s); files on this host still holding a live TTS key: ${stillLive.length}`)
  for (const f of stillLive) console.log(`  live key: ${f}`)
  return { on: !!row, held, stillLive }
}

const cmd = process.argv[2] || 'status'
if (cmd === 'stop') {
  psql(`insert into tts_spend_trips (provider, code, message, host) values ('*', 'TOM_STOP', '${STOP_MESSAGE.replace(/'/g, "''")}', '${os.hostname()}') on conflict (provider) do nothing`)
  console.log(`ledger: stop row in place; keys neutralised in ${neutraliseKeys()} more file(s)`)
  status()
} else if (cmd === 'lift') {
  if (process.env.TOM_SAID_LIFT !== 'yes') {
    console.error('Only Tom lifts the stop. Run with TOM_SAID_LIFT=yes once he has said so, in his words, in chat.')
    process.exit(2)
  }
  psql("delete from tts_spend_trips where provider = '*' and code = 'TOM_STOP'")
  console.log(`ledger: stop row removed; ${restoreKeys()} key line(s) restored`)
  for (const u of RESTART_ON_LIFT) {
    try { execFileSync('systemctl', ['--user', 'restart', u]); console.log(`  restarted ${u} (it reads the keys at boot)`) } catch (e) { console.log(`  could not restart ${u}: ${e.message}`) }
  }
  status()
} else {
  status()
}
