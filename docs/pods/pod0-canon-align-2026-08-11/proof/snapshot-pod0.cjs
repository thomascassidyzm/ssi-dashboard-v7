#!/usr/bin/env node
/* Independent before/after snapshot of every live pod-0 in scope. Proof, not assertion. */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const fs = require('fs'), path = require('path'), crypto = require('crypto')
const { createClient } = require('@supabase/supabase-js')
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const COURSES = fs.readFileSync(path.join(__dirname, 'pod0-scope.txt'), 'utf8').trim().split(/\s+/)
const tag = process.argv[2]
if (!tag) { console.error('usage: snapshot-pod0.cjs <tag>'); process.exit(1) }
const OUT = path.join(__dirname, 'pod0-snap', tag)
fs.mkdirSync(OUT, { recursive: true })
;(async () => {
  const manifest = {}
  for (const c of COURSES) {
    const id = `${c}:pod-0`
    const { data, error } = await db.from('listening_pod_sentences')
      .select('id,pod_id,scene_number,sentence_number,global_order,speaker,known_text,target_text,target_text_draft,target_audio_id,known_audio_id')
      .eq('pod_id', id).order('id')
    if (error) throw new Error(`${id}: ${error.message}`)
    const { data: pod, error: pe } = await db.from('listening_pods').select('id,metadata,speakers,title,source_file').eq('id', id).single()
    if (pe) throw new Error(`${id} header: ${pe.message}`)
    const body = JSON.stringify({ sentences: data }, null, 1)
    fs.writeFileSync(path.join(OUT, `${c}.json`), JSON.stringify({ pod, sentences: data }, null, 1))
    manifest[id] = { rows: data.length, sentences_sha256: crypto.createHash('sha256').update(body).digest('hex') }
  }
  fs.writeFileSync(path.join(OUT, '_manifest.json'), JSON.stringify(manifest, null, 1))
  console.log(JSON.stringify({ tag, pods: Object.keys(manifest).length }, null, 2))
})().catch(e => { console.error('FAILED:', e.message); process.exit(1) })
