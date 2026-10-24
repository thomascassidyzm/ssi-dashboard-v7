#!/usr/bin/env node
/**
 * LIVE CLIP — one answer to "which clip will the player play for this text?", and the staged lists that make
 * that answer single (job #338, Tom 2026-10-24: "We must have a better way to keep track of what's actually the
 * live chosen clip that the player will play for any text … it depends on the learner settings now since we added
 * choose voice. But we DO have a default for all clips.").
 *
 * THE MODEL (no new table). Two stores already exist and between them hold the whole answer:
 *   DEFAULT      the row pointer the player plays when the learner has chosen nothing: course_legos /
 *                course_practice_phrases / course_seeds *_audio_id per seat (known, target1, target2), and a pod
 *                row's target_audio_id (immersion) and sentence_audio_ids (Drill). The app calls it the "house" clip
 *                (packages/player-vue/src/playback/clipCascade.ts).
 *   ALTERNATIVES clip_index: one clip per (language key, text key, voice). Choose-voice (VITE_CLIP_CASCADE, default
 *                OFF in every deployed build as of 2026-10-24) ranks these by the learner's voice list and falls back
 *                to the house clip when the chosen voice has no clip for the text.
 * What makes the answer NOT single today is a FORK: one (course, seat, text) whose rows point at different clips, so
 * the learner hears different takes of the same words depending on which row is playing. This tool names them.
 *
 *   set -a; . ~/ssi-restore/qa-copy.env; set +a
 *   node tools/audio/live-clip.cjs which --course zho_for_eng --text "谢谢你" [--voice xai_eve]
 *   node tools/audio/live-clip.cjs plan  --census ops/audio-tracking/census-all.json --out ops/audio-tracking/
 *
 * READ-ONLY on the database. `plan` writes DRY-RUN lists (with every old clip id, for rollback); nothing applies them.
 */
const fs = require('fs')
const path = require('path')
const { normalizeForAudio } = require('../../services/shared/text-normalize.cjs')

const voiceKey = (v) => (v ? String(v).trim().replace(/^(xai|azure|cartesia|elevenlabs|google|openai)_/i, '').toLowerCase() : null)
const SEATS = ['known', 'target1', 'target2']

/**
 * Pure. The default clip for one seat from the house pointers that name this text, and whether it is forked.
 * @param pointers [{ seat, audio, n }] — rows per (seat, clip)
 * @param clips    Map audio id → { voice_id, origin, created_at }
 * @returns {{ seat, default: string|null, forked: boolean, candidates: [...] }}
 */
function defaultFor(seat, pointers, clips) {
  const mine = pointers.filter((p) => p.seat === seat && p.audio)
  const ranked = mine.slice().sort((a, b) => {
    if (b.n !== a.n) return b.n - a.n // the clip most rows already play
    const ca = clips.get(a.audio) || {}, cb = clips.get(b.audio) || {}
    if ((ca.origin === 'human') !== (cb.origin === 'human')) return ca.origin === 'human' ? -1 : 1 // human is precious
    return String(cb.created_at || '').localeCompare(String(ca.created_at || '')) || a.audio.localeCompare(b.audio) // newest take
  })
  const voices = new Set(ranked.map((p) => voiceKey((clips.get(p.audio) || {}).voice_id)))
  return {
    seat,
    default: ranked.length ? ranked[0].audio : null,
    forked: ranked.length > 1,
    sameVoice: ranked.length > 1 && voices.size === 1,
    candidates: ranked.map((p) => ({ audio: p.audio, rows: p.n, voice: (clips.get(p.audio) || {}).voice_id || null })),
  }
}

/**
 * Pure. What the player plays for this seat: the learner's chosen voice when clip_index holds a clip of these words
 * in it, else the default (the house clip) — the fallback clipCascade.ts applies.
 * @param index Map voiceKey → audio id (clip_index rows for this language + text)
 */
function playedFor(def, index, choice) {
  if (choice) {
    const hit = index.get(voiceKey(choice))
    if (hit) return { audio: hit, why: `chosen voice ${choice}` }
  }
  return { audio: def.default, why: choice ? `no ${choice} clip of these words — default` : 'default (no voice chosen)' }
}

/**
 * Pure. Fork rows (one per course, seat, text, clip) → the consolidation list: keep the default, repoint the rest.
 * Same-voice forks are mechanical (two takes of one voice); cross-voice forks may be a deliberate male/female slot
 * pair and are listed apart for an ear. Rows touching fra_for_eng seeds 1-10 are held (job #320 is re-voicing them).
 */
function forkPlan(forkRows, clips) {
  const groups = new Map()
  for (const r of forkRows) {
    const k = `${r.course_code}\t${r.seat}\t${r.text}`
    if (!groups.has(k)) groups.set(k, { course: r.course_code, seat: r.seat, text: r.text, pointers: [], minSeed: Infinity })
    const g = groups.get(k)
    g.pointers.push({ seat: r.seat, audio: r.audio, n: Number(r.n) })
    g.minSeed = Math.min(g.minSeed, Number(r.min_seed))
  }
  const out = []
  for (const g of groups.values()) {
    const d = defaultFor(g.seat, g.pointers, clips)
    if (!d.forked) continue
    const held = g.course === 'fra_for_eng' && g.minSeed <= 10 ? 'job #320 is re-voicing fra_for_eng seeds 1-10' : null
    out.push({
      course: g.course, seat: g.seat, text: g.text, keep: d.default, sameVoice: d.sameVoice, held,
      repoint: d.candidates.slice(1).map((c) => ({ from: c.audio, rows: c.rows, voice: c.voice })),
      rowsChanged: d.candidates.slice(1).reduce((n, c) => n + c.rows, 0),
    })
  }
  return out
}

/** Pure. Census turns flagged drill-off-turn → the re-cut list (free: ffmpeg from the turn take, no render). */
function recutPlan(turns, podRowsById) {
  return turns.filter((t) => t.flags.includes('drill-off-turn')).map((t) => {
    const row = podRowsById.get(t.rowId) || {}
    return {
      course: t.course, rowId: t.rowId, order: t.order, turnClip: t.turnClip, turnVoice: t.turnVoice,
      drillVoices: t.drillVoices, offTurn: t.offTurn.length,
      rollback: { sentence_audio_ids: row.sentence_audio_ids || null }, // what the row points at today
      command: `node tools/pods/splice-sentence-clips.cjs ${t.course} --orders=${t.order}`,
    }
  })
}

const FORK_DETAIL_SQL = `WITH ptr AS (
    SELECT course_code, seed_number s, target_text t, target1_audio_id a1, target2_audio_id a2, known_text k, known_audio_id ak FROM course_legos
    UNION ALL SELECT course_code, seed_number, target_text, target1_audio_id, target2_audio_id, known_text, known_audio_id FROM course_practice_phrases
    UNION ALL SELECT course_code, seed_number, target_text, target1_audio_id, target2_audio_id, known_text, known_audio_id FROM course_seeds),
  flat AS (
    SELECT course_code, s, 'target1' seat, lower(btrim(t)) text, a1 audio FROM ptr WHERE a1 IS NOT NULL
    UNION ALL SELECT course_code, s, 'target2', lower(btrim(t)), a2 FROM ptr WHERE a2 IS NOT NULL
    UNION ALL SELECT course_code, s, 'known', lower(btrim(k)), ak FROM ptr WHERE ak IS NOT NULL AND k IS NOT NULL),
  agg AS (SELECT course_code, seat, text, audio::text AS audio, count(*) n, min(s) min_seed FROM flat GROUP BY 1, 2, 3, 4)
  SELECT * FROM (SELECT agg.*, count(*) OVER (PARTITION BY course_code, seat, text) k FROM agg) z WHERE k > 1`

async function which(pg, db, { course, text, voice }) {
  const t = String(text).trim().toLowerCase()
  const q = await pg.query(`SELECT seat, audio, count(*) n FROM (
      SELECT 'target1' seat, target1_audio_id::text audio FROM course_legos WHERE course_code = $1 AND lower(btrim(target_text)) = $2
      UNION ALL SELECT 'target2', target2_audio_id::text FROM course_legos WHERE course_code = $1 AND lower(btrim(target_text)) = $2
      UNION ALL SELECT 'known', known_audio_id::text FROM course_legos WHERE course_code = $1 AND lower(btrim(known_text)) = $2
      UNION ALL SELECT 'target1', target1_audio_id::text FROM course_practice_phrases WHERE course_code = $1 AND lower(btrim(target_text)) = $2
      UNION ALL SELECT 'target2', target2_audio_id::text FROM course_practice_phrases WHERE course_code = $1 AND lower(btrim(target_text)) = $2
      UNION ALL SELECT 'known', known_audio_id::text FROM course_practice_phrases WHERE course_code = $1 AND lower(btrim(known_text)) = $2
      UNION ALL SELECT 'target1', target1_audio_id::text FROM course_seeds WHERE course_code = $1 AND lower(btrim(target_text)) = $2
      UNION ALL SELECT 'target2', target2_audio_id::text FROM course_seeds WHERE course_code = $1 AND lower(btrim(target_text)) = $2
      UNION ALL SELECT 'known', known_audio_id::text FROM course_seeds WHERE course_code = $1 AND lower(btrim(known_text)) = $2
    ) x WHERE audio IS NOT NULL GROUP BY 1, 2`, [course, t])
  const pointers = q.rows.map((r) => ({ seat: r.seat, audio: r.audio, n: Number(r.n) }))
  const clips = await db.clipMap(pg, pointers.map((p) => p.audio), { cols: 'id::text AS id, voice_id, origin, created_at, language' })
  const idx = await pg.query(`SELECT language, voice_id, audio_id::text AS audio FROM clip_index WHERE text_key = $1`, [normalizeForAudio(text)])
  const lang = (clips.values().next().value || {}).language
  const index = new Map(idx.rows.filter((r) => !lang || r.language.split('_')[0] === lang.split('_')[0]).map((r) => [voiceKey(r.voice_id), r.audio]))
  return SEATS.map((seat) => { const d = defaultFor(seat, pointers, clips); return { ...d, played: playedFor(d, index, voice) } }).filter((d) => d.candidates.length)
}

async function plan(pg, db, { census, out }) {
  const c = JSON.parse(fs.readFileSync(census, 'utf8'))
  const rowIds = c.turns.filter((t) => t.flags.includes('drill-off-turn')).map((t) => t.rowId)
  const podRows = (await pg.query(`SELECT id, sentence_audio_ids::text[] AS sentence_audio_ids FROM listening_pod_sentences WHERE id = ANY($1::text[])`, [rowIds])).rows
  const recut = recutPlan(c.turns, new Map(podRows.map((r) => [r.id, r])))
  const forkRows = (await pg.query(FORK_DETAIL_SQL)).rows
  const clips = await db.clipMap(pg, forkRows.map((r) => r.audio), { cols: 'id::text AS id, voice_id, origin, created_at' })
  const forks = forkPlan(forkRows, clips)
  const unpointed = c.drillRecordings.flatMap((d) => d.extra.filter((e) => !e.pointed).map((e) => ({ ...e, language: d.language, text: d.text })))
  const write = (name, data) => fs.writeFileSync(path.join(out, name), JSON.stringify(data, null, 1))
  write('dryrun-recut-drill.json', recut)
  write('dryrun-consolidate-forks.json', forks)
  write('dryrun-unpointed-drill-recordings.json', unpointed)
  const sum = {
    recut: { turns: recut.length, clips: recut.reduce((n, r) => n + r.offTurn, 0), renderChars: 0 },
    forks: {
      texts: forks.length, sameVoice: forks.filter((f) => f.sameVoice && !f.held).length, crossVoice: forks.filter((f) => !f.sameVoice && !f.held).length,
      held: forks.filter((f) => f.held).length, rowsChanged: forks.filter((f) => !f.held).reduce((n, f) => n + f.rowsChanged, 0),
      rowsChangedSameVoice: forks.filter((f) => f.sameVoice && !f.held).reduce((n, f) => n + f.rowsChanged, 0),
    },
    unpointedDrillRecordings: unpointed.length,
  }
  write('dryrun-summary.json', sum)
  return sum
}

async function main(argv) {
  const [cmd] = argv
  const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d }
  const db = require('../../services/shared/agent-db.cjs')
  const pg = await db.connect()
  try {
    if (cmd === 'which') console.log(JSON.stringify(await which(pg, db, { course: arg('course'), text: arg('text'), voice: arg('voice') }), null, 1))
    else if (cmd === 'plan') console.log(JSON.stringify(await plan(pg, db, { census: arg('census'), out: arg('out', '.') }), null, 1))
    else throw new Error('usage: live-clip.cjs which --course C --text T [--voice V] | plan --census FILE --out DIR')
  } finally { await pg.end() }
}

module.exports = { voiceKey, defaultFor, playedFor, forkPlan, recutPlan, FORK_DETAIL_SQL }
if (require.main === module) main(process.argv.slice(2)).catch((e) => { console.error(e.stack || e.message); process.exit(1) })
