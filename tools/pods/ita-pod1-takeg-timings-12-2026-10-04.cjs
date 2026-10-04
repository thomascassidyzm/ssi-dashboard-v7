#!/usr/bin/env node
/**
 * Job #652: re-record in place (replaceAudioId, same cast voice) the Take-G clips of ita_for_eng pod-1
 * groups that lack word_timings, so tools/slice-take-g.cjs can fill spans. Same post path as #645.
 *   PHASE8_URL=... node this --dry-run|--render [--ceiling CHARS]
 */
'use strict'
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') })
const { createClient } = require('@supabase/supabase-js')
const { servingPodId } = require('../lib/serving-pod-id.cjs')
const COURSE = 'ita_for_eng'
const ORDERS = [21, 22, 23, 33, 57, 90, 97, 110, 113, 123, 126, 127]
const BASE = process.env.POPTY_URL || 'http://localhost:3490'
const WHO = 'job-652-ita-takeg-timings'
const mode = ['--dry-run', '--render'].find((f) => process.argv.includes(f))
if (!mode) { console.error('say --dry-run or --render'); process.exit(1) }
const ci = process.argv.indexOf('--ceiling')
const CEILING = ci > -1 ? Number(process.argv[ci + 1]) : 5000
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
async function main () {
  const podId = await servingPodId(sb, COURSE)
  const { data: sents, error } = await sb.from('listening_pod_sentences').select('global_order,takeg_audio_ids').eq('pod_id', podId).in('global_order', ORDERS)
  if (error) throw error
  const ids = [...new Set(sents.flatMap((s) => s.takeg_audio_ids || []).filter(Boolean))]
  const { data: clips } = await sb.from('course_audio').select('id,role,text,voice_id,word_timings').in('id', ids)
  const todo = clips.filter((c) => !c.word_timings)
  const total = todo.reduce((n, c) => n + c.text.length, 0)
  console.log(`${sents.length} sentences, ${clips.length} clips, ${todo.length} without timings, ${total} chars`)
  if (total > CEILING) { console.error(`over ceiling ${CEILING}`); process.exit(1) }
  let spent = 0, would = 0, fail = 0
  for (const c of todo) {
    const res = await fetch(`${BASE}/api/audio/render`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-agent-id': WHO },
      body: JSON.stringify({ courseCode: COURSE, role: c.role, text: c.text, replaceAudioId: c.id, voiceId: c.voice_id, dryRun: mode === '--dry-run', job: '#652',
        purpose: '#652 Italian pod 1: re-record 12 Take-G groups in place with word timings (same voice)' }) })
    const r = await res.json().catch(() => ({}))
    if (!r.ok) { fail++; console.warn('x', c.id, res.status, r.code || r.error); continue }
    spent += r.charsSpent || 0; would += r.wouldSpendChars || 0
  }
  console.log(`${mode}: failed ${fail}, charsSpent ${spent}, wouldSpend ${would}`)
}
main().catch((e) => { console.error('FATAL', e.message || e); process.exit(1) })
