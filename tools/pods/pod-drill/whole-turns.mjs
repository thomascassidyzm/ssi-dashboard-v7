#!/usr/bin/env node
/**
 * WHOLE TURNS (job #836, Tom 2026-11-05: "these paragraphs are all coming as one chunk - which is nuts, because they
 * are ACTUAL different sentences - so there's no reason not to break them").
 *
 * The several-sentence pod rows the PLAYER plays as ONE clip: a row with fewer than two sentence clips, or whose
 * sentence clips no longer exist or no longer say its text (a text edit after the split: Italian Pod 1 SC04-S003
 * "Ma parliamo sabato" -> "Ma andiamo sabato" got a new whole-turn take and kept the old sentence clips, which the
 * player's split-existence oracle then rejects). Same rule as the player's splitRowUnits
 * (ssi-learning-app packages/player-vue/src/composables/podSentenceSplit.ts): fewer than 2 clips, any target or
 * known clip missing, or the clips' words not the turn's words -> the whole turn.
 *
 * For each such row it writes a card in the dump's shape (snapshot.mjs), keyed by the row id the player gives an
 * unsplit row, with the render's own stored Cartesia word timings on both sides, so `pair.mjs --lines` can cut the
 * turn at its sentence ends (spans of the existing clips; nothing rendered, nothing written to the database).
 *
 * READ-ONLY, by key, through the agent-db door, on the nightly QA copy:
 *   set -a; . ~/ssi-restore/qa-copy.env; set +a
 *   node tools/pods/pod-drill/whole-turns.mjs <course> [--pod=pod-1] [--write]
 * Without --write it prints the rows; with --write it writes ops/pod-drill-cuts/<course>.whole-turns.json.
 */
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { OPS } from './paths.mjs'

const require = createRequire(import.meta.url)
const { connect, clipsById } = require('../../../services/shared/agent-db.cjs')
const { normalizeForAudio } = require('../../../services/shared/text-normalize.cjs')

const argv = process.argv.slice(2)
const opt = Object.fromEntries(argv.filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? true] }))
const course = argv.find((a) => !a.startsWith('--'))
if (!course || !/^[a-z]{3}(_[a-z]+)?_for_[a-z]{3}$/.test(course)) { console.error('usage: whole-turns.mjs <course> [--pod=pod-1] [--write]'); process.exit(64) }
const podId = `${course}:${opt.pod || 'pod-1'}`

// Sentence ends, the player's POD_SENTENCE_BOUNDARY plus the CJK enders it cannot split on (Chinese turns have no spaces)
const sentences = (t) => String(t || '').split(/(?<=[.!?])\s+|(?<=[。！？])/u).map((s) => s.trim()).filter((s) => /[\p{L}\p{N}]/u.test(s))
const wordsOnly = (t) => String(t || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')
const bare = (id) => String(id || '').replace(/\.v\d+$/, '')
const ref = (c) => (c ? (c.audio_revision > 1 ? `${c.id}.v${c.audio_revision}` : c.id) : null)
const timingsOf = (c) => (c && (c.word_timings || c.word_boundaries)) || null

/** Pure: does the player split this row into its sentence clips? (splitRowUnits with its textById oracle) */
export function playerSplits(row, clipById) {
  const clips = (row.sentence_audio_ids || []).filter(Boolean)
  if (clips.length < 2) return false
  const known = (row.sentence_known_audio_ids || []).filter(Boolean)
  if (!clips.every((id) => clipById.has(bare(id))) || (known.length && !known.every((id) => clipById.has(bare(id))))) return false
  return clips.map((id) => wordsOnly(clipById.get(bare(id)).text)).join('') === wordsOnly(row.target_text)
}

const pg = await connect()
try {
  const { rows } = await pg.query(
    `SELECT id, scene_number, global_order, speaker, target_text, known_text, target_audio_id, known_audio_id,
            sentence_audio_ids, sentence_known_audio_ids, variant_key
       FROM listening_pod_sentences WHERE pod_id = $1 ORDER BY global_order`, [podId])
  const base = rows.filter((r) => r.variant_key == null)
  const walk = base.length ? base : rows
  const ids = new Set()
  for (const r of walk) for (const id of [r.target_audio_id, r.known_audio_id, ...(r.sentence_audio_ids || []), ...(r.sentence_known_audio_ids || [])]) if (id) ids.add(bare(id))
  const clipById = new Map((await clipsById(pg, [...ids], { cols: 'id, text, voice_id, origin, word_timings, word_boundaries, audio_revision' })).map((c) => [String(c.id), c]))
  const cards = []
  for (const r of walk) {
    if (sentences(r.target_text).length < 2 || playerSplits(r, clipById)) continue
    const t = clipById.get(bare(r.target_audio_id)), k = clipById.get(bare(r.known_audio_id))
    cards.push({
      id: r.id, pod: podId, scene: r.scene_number, speaker: r.speaker, target: r.target_text, known: r.known_text,
      targetAudioId: ref(t) || r.target_audio_id || null, knownAudioId: ref(k) || r.known_audio_id || null,
      targetVoice: t?.voice_id || null, knownVoice: k?.voice_id || null,
      targetOrigin: t?.origin || null, knownOrigin: k?.origin || null,
      sentenceKnownAudioIds: (r.sentence_known_audio_ids || []).filter(Boolean),
      wordTimings: timingsOf(t), knownWordTimings: timingsOf(k), chunks: [], kind: 'whole-turn',
      why: (r.sentence_audio_ids || []).filter(Boolean).length < 2 ? 'no sentence clips' : 'sentence clips missing or no longer say the turn',
    })
  }
  // --known-clips: every existing English clip of exactly each card's sentences, in the card's own English voice, any
  // course (job #71): the clips the Drill's by-text lookup would find, so a cut tool can tell before it relies on one.
  if (opt['known-clips']) {
    for (const c of cards) {
      const parts = String(c.known || '').split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean)
      const family = String(c.knownVoice || '').replace(/^(xai|azure|cartesia)_/, '')
      const voices = [family, `xai_${family}`, `azure_${family}`, `cartesia_${family}`]
      const { rows: hits } = await pg.query(
        `SELECT id, text, text_normalized, role, course_code, voice_id, origin FROM course_audio
          WHERE text_normalized = ANY($1) AND role IN ('known', 'pod_fine_known') AND voice_id = ANY($2)`,
        [parts.map((s) => normalizeForAudio(s)), voices])
      c.knownSentenceClips = parts.map((s) => ({ text: s, clips: hits.filter((h) => h.text_normalized === normalizeForAudio(s)) }))
    }
  }
  const out = { course, pod: podId, tool: 'tools/pods/pod-drill/whole-turns.mjs (#836)', rows: walk.length, cards }
  for (const c of cards) console.error(`${c.id}  ${c.why}  ${c.wordTimings ? 'timed' : 'UNTIMED'}/${c.knownWordTimings ? 'timed' : 'UNTIMED'}  ${c.target}`)
  console.error(`${course}: ${cards.length} several-sentence turns the player plays whole, of ${walk.length} rows`)
  if (opt.write) writeFileSync(path.join(OPS, `${course}.whole-turns.json`), JSON.stringify(out, null, 1) + '\n')
} finally { await pg.end() }
