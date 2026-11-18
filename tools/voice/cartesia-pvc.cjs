#!/usr/bin/env node
/**
 * CARTESIA CLONES — Pro (PVC: dataset → fine-tune → voices) and instant (/voices/clone), through Cartesia's API
 * (docs.cartesia.ai, Cartesia-Version 2026-08-14). Job #560·AA wrote the PVC half, 2026-10-29; job #350·AC
 * (2026-11-02) added the instant clone and made the slot ceiling the plan's (Scale = 4 PVC slots, not Startup's 2).
 * Not a render: a PVC spends a SLOT (slots count fine-tunes), an instant clone spends nothing. Neither touches any
 * course, cast or voices row — Popty's own admin route (/api/voicelab/voices/cartesia/clone) is the door that also
 * registers the voice; this tool is for listening experiments that must not.
 * Reads CARTESIA_API_KEY from the environment (source .env first); never prints it.
 *
 *   node tools/voice/cartesia-pvc.cjs slots                       (fine-tunes in use vs the plan's slots)
 *   node tools/voice/cartesia-pvc.cjs create --name "..." --language en --files a.wav,b.wav [--description ...]
 *   node tools/voice/cartesia-pvc.cjs status <fineTuneId>         (status + voices once completed)
 *   node tools/voice/cartesia-pvc.cjs instant --name "..." --language en --file sample.wav [--description ...]
 *
 * PVC_SLOTS overrides the slot count (default 4, the Scale plan's). A create that would need a slot the plan does
 * not have is REFUSED before anything is uploaded: freeing a slot means deleting somebody's Pro voice, which is a
 * person's decision, never this tool's.
 */
const fs = require('fs'), path = require('path')
const BASE = 'https://api.cartesia.ai', VERSION = '2026-08-14'
const PLAN_SLOTS = Number(process.env.PVC_SLOTS || 4)

/** The slot rule, pure: may a new fine-tune be created given the fine-tunes listed? */
function slotVerdict (fineTunes, slots = PLAN_SLOTS) {
  const used = (fineTunes || []).length
  return used < slots
    ? { ok: true, used, of: slots, free: slots - used }
    : { ok: false, used, of: slots, free: 0, why: `no free PVC slot (${used}/${slots} fine-tunes) — creating one would displace an existing Pro voice; stop and ask` }
}

async function main () {
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
  const cmd = process.argv[2]
  if (cmd === 'slots') {
    const list = (await call('GET', '/fine-tunes')).data || []
    console.log(JSON.stringify({ ...slotVerdict(list), fineTunes: list.map(f => ({ id: f.id, name: f.name, status: f.status, language: f.language, created_at: f.created_at })) }, null, 1))
  } else if (cmd === 'create') {
    const name = arg('name'), language = arg('language') || 'en', files = (arg('files') || '').split(',').filter(Boolean)
    if (!name || !files.length) throw new Error('--name and --files required')
    const v = slotVerdict((await call('GET', '/fine-tunes')).data || [])
    if (!v.ok) throw new Error(v.why)
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
  } else if (cmd === 'instant') {
    const name = arg('name'), file = arg('file')
    if (!name || !file) throw new Error('--name and --file required')
    const form = new FormData()
    form.append('clip', new Blob([fs.readFileSync(file)]), path.basename(file))
    form.append('name', name)
    form.append('language', arg('language') || 'en')
    if (arg('description')) form.append('description', arg('description'))
    const v = await call('POST', '/voices/clone', null, form)
    console.log(JSON.stringify({ id: v.id, name: v.name, language: v.language, created_at: v.created_at }))
  } else { console.error('usage: slots | create | status <id> | instant'); process.exit(2) }
}

module.exports = { slotVerdict, PLAN_SLOTS }
if (require.main === module) main().catch(e => { console.error(String(e.message)); process.exit(1) })
