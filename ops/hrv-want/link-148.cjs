#!/usr/bin/env node
/**
 * cs #148·AI — point every silent hrv_for_eng želim slot at the clip the render route made for its words.
 * Why this step exists: the audio_autolink trigger only links a clip whose voice matches courses.voice_config,
 * and hrv's voice_config still names the Azure voices (Gabrijela/Srecko), so a new Sanja/Ivan clip fills nothing
 * by itself. POST /api/production/hrv_for_eng/link-clip checks the clip's voice against the Voice Lab cast instead
 * (resolveVoice), and is FILL-ONLY: a slot that already holds a clip is reported, never replaced.
 * HTTP only.
 *   node ops/hrv-want/link-148.cjs <silent.tsv> <render-out.tsv> <link-out.tsv> [--apply]
 */
const fs = require('fs')
const [silentF, renderF, outF] = process.argv.slice(2)
const apply = process.argv.includes('--apply')
const read = (f) => fs.readFileSync(f, 'utf8').trim().split('\n').map((l) => l.split('\t'))
const clipFor = new Map()
for (const [role, text, , source, audioId] of read(renderF).slice(1)) if ((source === 'rendered' || source === 'library') && audioId) clipFor.set(role + '\t' + text, audioId)
const links = []; const missing = []
for (const [kind, key, role, text] of read(silentF)) {
  const audioId = clipFor.get(role + '\t' + text)
  const slot = kind === 'seed' ? { seedNumber: Number(key) } : kind === 'lego' ? { legoId: key } : { phraseId: key }
  if (!audioId) { missing.push([kind, key, role, text]); continue }
  links.push({ ...slot, role, audioId, _k: [kind, key, role, text] })
}
fs.writeFileSync(outF, 'kind\tkey\trole\ttext\taudioId\tvoiceId\tresult\tcode\terror\n')
for (const m of missing) fs.appendFileSync(outF, [...m, '', '', 'NO_CLIP_RENDERED', '', ''].join('\t') + '\n')
;(async () => {
  let linked = 0, same = 0, refused = 0
  for (let i = 0; i < links.length; i += 200) {
    const chunk = links.slice(i, i + 200)
    const res = await fetch('http://localhost:3470/api/production/hrv_for_eng/link-clip', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': 'cs-148-hrv-zelim' },
      body: JSON.stringify({ dryRun: !apply, links: chunk.map(({ _k, ...l }) => l) }),
    })
    const o = await res.json().catch(() => ({ results: [] }))
    chunk.forEach((l, j) => {
      const r = (o.results || [])[j] || { ok: false, code: `HTTP ${res.status}`, error: o.error || '' }
      const result = !r.ok ? 'REFUSED' : r.changed ? (apply ? 'linked' : 'would-link') : 'already'
      if (result === 'REFUSED') refused++; else if (result === 'already') same++; else linked++
      fs.appendFileSync(outF, [...l._k, l.audioId, r.voiceId || '', result, r.code || '', String(r.error || '').replace(/\s+/g, ' ').slice(0, 200)].join('\t') + '\n')
    })
    await new Promise((r) => setTimeout(r, 300))
  }
  console.log(`${apply ? 'apply' : 'dry'}: ${linked} ${apply ? 'linked' : 'would link'}, ${same} already, ${refused} refused, ${missing.length} with no clip`)
})()
