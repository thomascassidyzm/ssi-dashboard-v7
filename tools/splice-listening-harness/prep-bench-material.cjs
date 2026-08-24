#!/usr/bin/env node
/**
 * prep-bench-material.cjs — stage Sascha's real takes as PRE-LOADED material
 * for the splice bench, so the bench is not empty before Kai records anything.
 *
 * READ-ONLY on everything stored. Copies already-downloaded mp3s into the
 * evidence folder and emits a manifest. No DB writes, no S3 writes, no TTS,
 * and nothing of Sascha's is deleted, moved or altered.
 *
 * Only takes that the shipped aligner can actually cut are staged — a line the
 * bench cannot cut would show up as a broken example rather than as the honest
 * refusal it is, and the refusal is already reported in the numbers section.
 */

const fs = require('fs')
const path = require('path')

process.env.PATH = `${process.env.HOME}/.local/bin:${process.env.PATH}`
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') })

const { createClient } = require('@supabase/supabase-js')
const provenanceAdapter = require('../../services/voice-engine/provenance-adapter.cjs')
const align = require('../../services/voice-engine/align.cjs')

const COURSE = 'deu_at_for_eng'
const VOICE = 'human_sasha_wanasky_deu_at'
const RAW = '/home/tomcassidy/SSi/.splice-harness/raw'
const OUT = '/home/tomcassidy/command-surface/public/evidence/splice-bench-2026-08-24/sascha'

const norm = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[‘’]/g, "'").replace(/[?!.,;:'"()\[\]{}]/g, '').replace(/\s+/g, ' ').trim()
const words = t => norm(t).split(' ').filter(Boolean)

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  const { rows, error } = await provenanceAdapter.fetchProvenanceRows(supabase, { courseCode: COURSE, voiceId: VOICE })
  if (error) throw new Error(String(error.message || error))

  const superseded = new Set(rows.map(r => r.supersededBy).filter(Boolean))
  const live = rows.filter(r => !superseded.has(r.id))
  const slow = live.filter(r => r.cadence === 'slow' && r.chunksString)
  const naturalByText = new Map()
  for (const n of live.filter(r => r.cadence === 'natural')) {
    if (!naturalByText.has(norm(n.phraseText))) naturalByText.set(norm(n.phraseText), n)
  }

  // English known side, so the bench can show what each line means.
  const { data: phraseRows } = await supabase
    .from('course_practice_phrases')
    .select('target_text,known_text,seed_number')
    .eq('course_code', COURSE).lte('seed_number', 20).limit(3000)
  const englishFor = new Map()
  for (const p of phraseRows || []) if (p.target_text) englishFor.set(norm(p.target_text), p.known_text || '')

  const lines = []
  const spanKeys = new Set()
  for (const s of slow) {
    const slowPath = path.join(RAW, `${s.id}.mp3`)
    if (!fs.existsSync(slowPath)) continue
    const chunks = s.chunksString.split('|').map(c => c.trim()).filter(Boolean)
    if (chunks.length < 2) continue
    // Only stage what the shipped aligner can cut.
    const res = await align.alignSlowGapTake(slowPath, chunks)
    if (!res.ok) continue

    const nat = naturalByText.get(norm(s.phraseText))
    const natPath = nat ? path.join(RAW, `${nat.id}.mp3`) : null
    const rec = {
      text: s.phraseText,
      english: englishFor.get(norm(s.phraseText)) || '',
      chunks,
      chunksString: s.chunksString,
      slow: `${s.id}.mp3`,
    }
    fs.copyFileSync(slowPath, path.join(OUT, `${s.id}.mp3`))
    if (natPath && fs.existsSync(natPath)) {
      rec.natural = `${nat.id}.mp3`
      fs.copyFileSync(natPath, path.join(OUT, `${nat.id}.mp3`))
    }
    lines.push(rec)
    for (let i = 0; i < chunks.length; i++) {
      for (let j = i; j < chunks.length; j++) spanKeys.add(norm(chunks.slice(i, j + 1).join(' ')))
    }
  }

  // Targets: real course phrases Sascha did NOT read, ranked by how much of
  // each her pieces can actually cover. None reach 100% — that is the finding,
  // not a bug, so the bench shows the near misses and names what is missing.
  const readTexts = new Set(lines.map(l => norm(l.text)))
  const scored = []
  for (const p of phraseRows || []) {
    const t = p.target_text
    if (!t || readTexts.has(norm(t))) continue
    const toks = words(t)
    if (toks.length < 4) continue
    const covered = toks.filter((_, i) => {
      for (let len = Math.min(6, toks.length - i); len >= 1; len--) if (spanKeys.has(toks.slice(i, i + len).join(' '))) return true
      return false
    }).length
    scored.push({ text: t, english: p.known_text || '', seed: p.seed_number, coverage: covered / toks.length })
  }
  scored.sort((a, b) => b.coverage - a.coverage)
  const targets = scored.slice(0, 5).map(x => ({ text: x.text, english: x.english, seed: x.seed }))

  const manifest = {
    generatedAt: new Date().toISOString(),
    course: COURSE,
    voice: VOICE,
    note: 'Sascha Wanasky, recorded 19-23 August 2026. Read-only copies; the originals are untouched.',
    lines,
    targets,
    bestTargetCoverage: scored.length ? Number(scored[0].coverage.toFixed(3)) : 0,
  }
  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1))
  console.log(`[bench] staged ${lines.length} of Sascha's lines (${lines.filter(l => l.natural).length} with both reads)`)
  console.log(`[bench] ${spanKeys.size} distinct pieces; best target coverage ${(manifest.bestTargetCoverage * 100).toFixed(0)}%`)
}

main().catch(e => { console.error(e); process.exit(1) })
