#!/usr/bin/env node
/**
 * CARTESIA PRO VOICE CLONE (PVC) — dataset → fine-tune → voices, through Cartesia's API
 * (docs.cartesia.ai clone-voices-pro/api, Cartesia-Version 2026-08-14). Job #560·AA, 2026-10-29.
 * Not a render: it spends a PVC SLOT (Startup plan = 2, slots count fine-tunes), not TTS characters.
 * Reads CARTESIA_API_KEY from the environment (source .env first); never prints it. Touches no course, cast or voices row.
 *
 *   node tools/voice/cartesia-pvc.cjs slots
 *   node tools/voice/cartesia-pvc.cjs create --name "Aran PRO ..." --language en --files a.wav,b.wav [--description ...]
 *   node tools/voice/cartesia-pvc.cjs status <fineTuneId>        (status + voices once completed)
 */
const fs = require('fs'), path = require('path')
const BASE = 'https://api.cartesia.ai', VERSION = '2026-08-14'
const KEY = process.env.CARTESIA_API_KEY
if (!KEY) { console.error('CARTESIA_API_KEY not set'); process.exit(2) }
const H = { Authorization: `Bearer ${KEY}`, 'Cartesia-Version': VERSION }
const arg = n => { const i = process.argv.indexOf(`--${n}`); return i < 0 ? null : process.argv[i + 1] }
async function call (method, p, body, form) {
  const res = await fetch(BASE + p, { method, headers: form ? H : { ...H, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: form || (body ? JSON.stringify(body) : undefined) })
  const text = await res.text()
  if (!res.ok) throw new Error(`${method} ${p} -> ${res.status}: ${text.slice(0, 400)}`)
  return text ? JSON.parse(text) : {}
}
async function main () {
  const cmd = process.argv[2]
  if (cmd === 'slots') {
    const r = await call('GET', '/fine-tunes')
    const list = r.data || []
    console.log(JSON.stringify({ used: list.length, of: 2, fineTunes: list.map(f => ({ id: f.id, name: f.name, status: f.status, language: f.language })) }, null, 1))
  } else if (cmd === 'create') {
    const name = arg('name'), language = arg('language') || 'en', files = (arg('files') || '').split(',').filter(Boolean)
    if (!name || !files.length) throw new Error('--name and --files required')
    const used = ((await call('GET', '/fine-tunes')).data || []).length
    if (used >= 2) throw new Error(`no free PVC slot (${used}/2 fine-tunes)`)
    const ds = await call('POST', '/datasets', { name, description: arg('description') || name })
    console.log('dataset', ds.id)
    for (const f of files) {
      const form = new FormData()
      form.append('file', new Blob([fs.readFileSync(f)]), path.basename(f))
      form.append('purpose', 'fine_tune')
      await call('POST', `/datasets/${ds.id}/files`, null, form)
      console.log('uploaded', path.basename(f))
    }
    const ft = await call('POST', '/fine-tunes', { name, description: arg('description') || name, language, dataset: ds.id })
    console.log('fineTune', ft.id, ft.status)
  } else if (cmd === 'status') {
    const f = await call('GET', `/fine-tunes/${process.argv[3]}`)
    console.log(JSON.stringify({ id: f.id, name: f.name, status: f.status }))
    if (f.status === 'completed') console.log(JSON.stringify(await call('GET', `/fine-tunes/${process.argv[3]}/voices`), null, 1))
  } else { console.error('usage: slots | create | status <id>'); process.exit(2) }
}
main().catch(e => { console.error(String(e.message)); process.exit(1) })
