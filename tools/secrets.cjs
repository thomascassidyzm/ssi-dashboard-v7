#!/usr/bin/env node
/**
 * secrets.cjs — central secret management via Supabase Vault (encrypted at rest).
 *
 * THE MODEL (Tom 2026-06-30): collapse N scattered secrets to ONE bootstrap
 * credential ("secret zero" = DATABASE_URL, the postgres connection string each
 * machine already holds). Every other secret (xAI / Anthropic / S3 / …) lives
 * ENCRYPTED in vault.secrets and is read through vault.decrypted_secrets — which
 * is direct-DB / service-role only (Vault is NOT exposed via PostgREST, so the
 * anon/REST path can never see it). The raw secret column is ciphertext at rest.
 *
 *   node tools/secrets.cjs list                  # names + descriptions (NO values)
 *   node tools/secrets.cjs get NAME              # one decrypted value (stdout, no newline)
 *   node tools/secrets.cjs set NAME value [desc] # create or update (upsert by name)
 *   node tools/secrets.cjs rm  NAME              # delete
 *   node tools/secrets.cjs load [--export]       # emit all as KEY=value (.env) or `export KEY=...`
 *
 * Bootstrap a machine:   node tools/secrets.cjs load > .env       (then app loads .env)
 * In-process (services):  await require('./tools/secrets').loadSecrets()  # fills process.env
 */
const { Client } = require('pg')

function connString() {
  const url = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL
  if (!url) { console.error('secrets: need DATABASE_URL (secret zero) in env'); process.exit(1) }
  return url
}
async function withDb(fn) {
  const c = new Client({ connectionString: connString() })
  await c.connect()
  try { return await fn(c) } finally { await c.end() }
}

/** Fill `target` (default process.env) from Vault; local env wins (only sets
 *  names not already present). Returns the count applied. For service startup. */
async function loadSecrets(target = process.env) {
  return withDb(async (c) => {
    const { rows } = await c.query('select name, decrypted_secret from vault.decrypted_secrets')
    let n = 0
    for (const r of rows) if (target[r.name] === undefined) { target[r.name] = r.decrypted_secret; n++ }
    return n
  })
}

async function setSecret(name, value, description = '') {
  return withDb(async (c) => {
    const { rows } = await c.query('select id from vault.secrets where name = $1', [name])
    if (rows.length) {
      await c.query('select vault.update_secret($1, $2, $3, $4)', [rows[0].id, value, name, description])
      return 'updated'
    }
    await c.query('select vault.create_secret($1, $2, $3)', [value, name, description])
    return 'created'
  })
}

const shQuote = (s) => "'" + String(s).replace(/'/g, "'\\''") + "'"

async function main() {
  const [cmd, ...args] = process.argv.slice(2)
  if (cmd === 'list') {
    await withDb(async (c) => {
      const { rows } = await c.query('select name, description from vault.secrets order by name')
      if (!rows.length) console.error('(no secrets yet)')
      for (const r of rows) console.log(`${r.name}\t${r.description || ''}`)
    })
  } else if (cmd === 'get') {
    if (!args[0]) { console.error('usage: get NAME'); process.exit(1) }
    await withDb(async (c) => {
      const { rows } = await c.query('select decrypted_secret from vault.decrypted_secrets where name = $1', [args[0]])
      if (!rows.length) { console.error(`secrets: no secret '${args[0]}'`); process.exit(1) }
      process.stdout.write(rows[0].decrypted_secret)
    })
  } else if (cmd === 'set') {
    const [name, value, ...descParts] = args
    if (!name || value === undefined) { console.error('usage: set NAME value [desc]'); process.exit(1) }
    console.error(`secrets: ${await setSecret(name, value, descParts.join(' '))} ${name}`)
  } else if (cmd === 'rm') {
    if (!args[0]) { console.error('usage: rm NAME'); process.exit(1) }
    await withDb(async (c) => { await c.query('delete from vault.secrets where name = $1', [args[0]]); console.error(`secrets: removed ${args[0]}`) })
  } else if (cmd === 'load') {
    const asExport = args.includes('--export')
    await withDb(async (c) => {
      const { rows } = await c.query('select name, decrypted_secret from vault.decrypted_secrets order by name')
      for (const r of rows) console.log(asExport ? `export ${r.name}=${shQuote(r.decrypted_secret)}` : `${r.name}=${r.decrypted_secret}`)
    })
  } else {
    console.error('usage: secrets.cjs list | get NAME | set NAME value [desc] | rm NAME | load [--export]')
    process.exit(1)
  }
}

if (require.main === module) main().catch((e) => { console.error('secrets:', e.message); process.exit(1) })
module.exports = { loadSecrets, setSecret }
