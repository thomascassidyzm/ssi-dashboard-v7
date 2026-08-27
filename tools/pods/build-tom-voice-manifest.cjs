#!/usr/bin/env node
/**
 * build-tom-voice-manifest.cjs — the Pod 1 work-list for Tom's Cartesia clone,
 * selected by CAST **and** by LANGUAGE.
 *
 * Replaces the hand-built `tools/tts-bakeoff/pod1-tom-voice-manifest-2026-08-27.json`,
 * whose selector was `speakers[<name>].known.voice_id in (Tom's xAI clone)` and
 * nothing else. That answers WHICH SPEAKER correctly and WHICH LANGUAGE not at
 * all — it trusts the convention that the known track holds English, a
 * convention enforced nowhere across 5,082 rows. Tom's standing policy of
 * 2026-08-27 is that his clone speaks English only, so the manifest must make
 * that true BY CONSTRUCTION rather than by anyone remembering.
 *
 * Two independent selectors, both required:
 *   CAST      — the speaker is voiced by Tom on the known side (unchanged).
 *   LANGUAGE  — the line's own TEXT is English, per tom-voice-language-gate.cjs,
 *               which reads the text and never the role, track or language field.
 *
 * ── Nothing is silently dropped ─────────────────────────────────────────────
 * Every cast-selected line lands in exactly one of three buckets and all three
 * are written to the manifest:
 *   lines    — cast + provably English. This is the render list.
 *   rejected — cast but NOT English. Never rendered. The defect bucket; if this
 *              is ever non-empty the pod has a real content problem to fix.
 *   held     — cast, English-looking, but the text cannot adjudicate it (short
 *              bare-noun drill lines). Never rendered without a human tick.
 * A manifest that quietly shrank would read as "covered everything" when it did
 * not, so the totals block carries all three counts and the run refuses to be
 * summarised by `lines` alone.
 *
 * Usage:
 *   node tools/pods/build-tom-voice-manifest.cjs                     # all 22 pods
 *   node tools/pods/build-tom-voice-manifest.cjs --course=spa_for_eng
 *   node tools/pods/build-tom-voice-manifest.cjs --out=<path>
 */
'use strict'

const path = require('path')
const fs = require('fs')
const REPO = path.join(__dirname, '..', '..')
require('dotenv').config({ path: path.join(REPO, '.env') })

const { createClient } = require('@supabase/supabase-js')
const { canonicalSpeakerName } = require(path.join(REPO, 'tools/pod-voice-colour-n.cjs'))
const { isEnglishLine } = require('./tom-voice-language-gate.cjs')

/** Tom's xAI clone, prefixed or bare — the CAST selector. */
const TOM_XAI = new Set(['gfzdpspr5fdp', 'xai_gfzdpspr5fdp'])
/** Tom's Cartesia clone — what these lines will be rendered on. */
const TOM_CARTESIA = 'cartesia_8fef4d59-0a7e-4ad2-a261-6a3bb50734d2'

const arg = (n, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${n}=`))
  return a ? a.split('=').slice(1).join('=') : d
}
const ONLY = arg('course', '')
const OUT = arg('out', path.join(REPO, 'tools/tts-bakeoff/pod1-tom-voice-manifest.json'))

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

async function main () {
  const { data: pods, error } = await sb
    .from('listening_pods').select('id,course_code,slug,visibility,speakers').eq('slug', 'pod-1')
  if (error) throw new Error(`pod read failed: ${error.message}`)

  const courses = []
  const totals = { pods: 0, cast_selected: 0, english: 0, rejected: 0, held: 0, chars: 0 }

  for (const pod of pods.sort((a, b) => a.course_code.localeCompare(b.course_code))) {
    if (ONLY && pod.course_code !== ONLY) continue

    const { data: sentences, error: sErr } = await sb
      .from('listening_pod_sentences')
      .select('id,speaker,known_text,target_text,known_audio_id,scene_number,sentence_number')
      .eq('pod_id', pod.id).order('scene_number').order('sentence_number')
    if (sErr) throw new Error(`${pod.course_code}: sentences read failed: ${sErr.message}`)

    // SELECTOR 1 — the cast. Keyed on the CANONICAL speaker name, which is how
    // phase8 resolves a voice: "Neighbour (8 am)" is cast as "Neighbour".
    const tomSpeakers = new Set(Object.entries(pod.speakers || {})
      .filter(([, v]) => v && v.known && TOM_XAI.has(String(v.known.voice_id)))
      .map(([k]) => k))
    const cast = (sentences || []).filter((s) => tomSpeakers.has(canonicalSpeakerName(s.speaker)))

    // SELECTOR 2 — the language, read off the text itself.
    const lines = []; const rejected = []; const held = []
    for (const s of cast) {
      const v = isEnglishLine(s.known_text, { targetText: s.target_text })
      const row = {
        sentence_id: s.id,
        speaker: s.speaker,
        chars: (s.known_text || '').length,
        known_audio_id: s.known_audio_id,
        known_text: s.known_text,
        english_score: Number(v.score.toFixed(3)),
      }
      if (v.verdict === 'english') lines.push(row)
      else if (v.verdict === 'hold') held.push({ ...row, held_because: v.why })
      else rejected.push({ ...row, rejected_because: v.why })
    }

    const chars = lines.reduce((a, l) => a + l.chars, 0)
    courses.push({
      course_code: pod.course_code,
      pod_id: pod.id,
      visibility: pod.visibility,
      pod_lines: (sentences || []).length,
      cast_selected: cast.length,
      tom_lines: lines.length,
      chars,
      lines,
      rejected,
      held,
    })
    totals.pods++; totals.cast_selected += cast.length; totals.english += lines.length
    totals.rejected += rejected.length; totals.held += held.length; totals.chars += chars

    const flag = rejected.length ? `  ⚠ ${rejected.length} NOT ENGLISH` : ''
    console.log(`${pod.course_code.padEnd(16)} ${pod.visibility.padEnd(6)} cast ${String(cast.length).padStart(3)} → english ${String(lines.length).padStart(3)}, held ${held.length}${flag}`)
  }

  const manifest = {
    generated: new Date().toISOString().slice(0, 10),
    scope: 'listening_pods slug=pod-1 ONLY — the 231-line Pod 1 structure. Legacy pod_explainer/pod_fine_known deliberately NOT counted (Tom 2026-08-23).',
    policy: "STANDING (Tom, 2026-08-27): Tom's Cartesia clone tom_001 speaks ENGLISH ONLY and must never voice a target-language line.",
    selector: [
      "CAST: listening_pods.speakers[<canonical speaker>].known.voice_id in ('gfzdpspr5fdp','xai_gfzdpspr5fdp')",
      'LANGUAGE: tools/pods/tom-voice-language-gate.cjs says the line TEXT is English — script, known-vs-target identity, foreign function words and an English trigram model. Never the role, track or language field.',
    ],
    target_voice: TOM_CARTESIA,
    buckets: {
      lines: 'cast + provably English — the render list',
      rejected: 'cast but NOT English — never rendered; a non-empty bucket is a content defect to fix',
      held: 'cast, English-looking, text cannot adjudicate (short bare-noun drill lines) — never rendered without a human tick',
    },
    note: 'STAGED ONLY. Audio runs are human-triggered through popty.app. Nothing here renders itself.',
    totals,
    courses,
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, JSON.stringify(manifest, null, 1))
  console.log(`\nTOTALS  cast-selected ${totals.cast_selected} → english ${totals.english}, held ${totals.held}, rejected ${totals.rejected} | ${totals.chars} chars`)
  console.log(`manifest: ${OUT}`)
}

main().catch((e) => { console.error('FATAL', e.message); process.exit(1) })
