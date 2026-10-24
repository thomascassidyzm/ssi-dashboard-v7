#!/usr/bin/env node
/**
 * LIVE CLIP CENSUS — for every text the player plays, is there ONE clip that answers it, and is a pod's
 * Drill clip the same voice as the turn (immersion) clip it should have been cut from? (job #338)
 *
 * Tom, 2026-10-24: "we can't have drill clips in a different voice from the immersion clips. Also, we need
 * to make sure we're not recording multiple drill clips. We agreed that drill clips would be extracted from
 * the immersion clip (the full clip) by intelligent editing. We must have a better way to keep track of
 * what's actually the live chosen clip that the player will play for any text."
 *
 * READ-ONLY. Renders nothing, writes nothing to the database. Run it on the nightly QA copy:
 *
 *   set -a; . ~/ssi-restore/qa-copy.env; set +a
 *   node tools/audio/live-clip-census.cjs [--course zho_for_eng] [--json out.json] [--md out.md]
 *
 * WHAT IT MEASURES
 *   A. POD DRILL vs IMMERSION. Served pods only (pod_type 'core', slug 'pod-1', base rows) — what learners
 *      hear. A multi-sentence turn's Drill units are its sentence_audio_ids; the turn clip is target_audio_id.
 *        drill-off-turn   a Drill clip in a different voice from its own turn clip (cannot have been cut from it)
 *        turn-off-speaker the turn clip's voice is not the voice the pod casts for that speaker (listening_pods.speakers)
 *        drill-unsplit    a multi-sentence turn with no per-sentence clips (the player plays the whole turn)
 *   B. DRILL TEXT RECORDINGS. For every Drill sentence text, every course_audio row in that language with those
 *      words (any course, any voice, any role): more than one recording of one sentence is what Tom asked to stop.
 *   C. POINTER FORKS (main flow). Within a course, one target (or known) text whose rows point at MORE THAN ONE
 *      clip — no single answer to "which clip plays for this text". Text compared lower(btrim()) in SQL.
 *   D. RECORDING DUPLICATES (estate). Per language, (text, voice) pairs held as more than one distinct s3 object:
 *      the same words in the same voice recorded more than once. Rows sharing one s3 object are pointers, not
 *      recordings, and are not counted (Tom 2026-09-13: per-course ids point at the same recordings).
 *
 * The DB itself already forbids two rows per (course, text, language, role, voice) — unique_course_audio_per_voice
 * — so a second recording of a text can only appear in another voice, another course or another role. That is
 * exactly what B and D count.
 */
const fs = require('fs')
const { normalizeForAudio } = require('../../services/shared/text-normalize.cjs')
const { tryCanonicalVoiceId } = require('../../services/shared/clip-identity.cjs')

/**
 * The player's sentence boundary (podSentenceSplit.ts POD_SENTENCE_BOUNDARY) needs whitespace after the stop, so it
 * never splits CJK text; there the player takes each unit's words from the Drill clip itself. For COUNTING sentences
 * the census also stops after 。！？ so a Chinese turn is seen as multi-sentence; a unit's text is the clip's own.
 */
const BOUNDARY = /(?<=[.!?])\s+|(?<=[。！？])\s*/
const sentencesOf = (t) => String(t || '').split(BOUNDARY).map((s) => s.trim()).filter(Boolean)

/** Pure. One identity per voice ('xai_eve' and 'eve' are one voice); unknown strings stay as they are. */
function canonVoice(v, provider) {
  if (!v) return null
  const c = tryCanonicalVoiceId(v, provider ? { provider } : undefined) || tryCanonicalVoiceId(v) || String(v)
  // xAI custom voices are stored both bare ('jpi39icg') and prefixed ('xai_jpi39icg'), and the identity rule cannot
  // place a bare custom id. The provider prefix is dropped for comparison: one voice, one key.
  return c.replace(/^(xai|azure|cartesia|elevenlabs|google|openai)_/i, '')
}

/** Pure. The voice a pod casts for a speaker on the target track — the rule phase8 resolvePodSpeakerVoice applies. */
function speakerVoice(speakers, speaker) {
  const map = speakers || {}
  const canonName = String(speaker || '').replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim()
  const e = map[canonName] || map[speaker] || map._default
  if (!e) return null
  if (e.target && e.target.voice_id) return canonVoice(e.target.voice_id, e.target.provider || 'azure')
  if (e.voice_id) return canonVoice(e.voice_id, e.provider || 'azure')
  return null
}

/**
 * Pure. Section A for one served pod's rows.
 * @param rows  [{course_code, pod_id, speakers, id, global_order, speaker, target_text, target_audio_id, sentence_audio_ids}]
 * @param clips Map id → {voice_id, course_code, origin, text}
 * @returns {turns: [...flagged rows], drill: [{course, language, text, clipId, voice, turnVoice}]}
 */
function podFindings(rows, clips) {
  const turns = []
  const drill = []
  for (const r of rows) {
    const sents = sentencesOf(r.target_text)
    const turnClip = r.target_audio_id ? clips.get(String(r.target_audio_id)) : null
    const turnVoice = turnClip ? canonVoice(turnClip.voice_id) : null
    const castVoice = speakerVoice(r.speakers, r.speaker)
    const ids = (r.sentence_audio_ids || []).filter(Boolean).map(String)
    const drillClips = ids.map((id) => ({ id, row: clips.get(id) || null }))
    const flags = []
    if (!r.target_audio_id) flags.push('turn-missing')
    else if (!turnClip) flags.push('turn-no-row')
    if (turnClip && turnClip.origin !== 'human' && castVoice && turnVoice !== castVoice) flags.push('turn-off-speaker')
    if (sents.length > 1 && ids.length < 2) flags.push('drill-unsplit')
    const offTurn = drillClips.filter((d) => d.row && turnVoice && canonVoice(d.row.voice_id) !== turnVoice)
    if (offTurn.length) flags.push('drill-off-turn')
    if (drillClips.some((d) => !d.row)) flags.push('drill-no-row')
    const language = turnClip ? turnClip.language : (drillClips.find((d) => d.row) || {}).row?.language || null
    if (ids.length >= 2) {
      drillClips.forEach((d, i) => drill.push({
        course: r.course_code, language: d.row ? d.row.language : language, text: (d.row && d.row.text) || sents[i] || null,
        clipId: d.id, voice: d.row ? canonVoice(d.row.voice_id) : null, turnVoice, rowId: r.id,
      }))
    }
    turns.push({
      course: r.course_code, rowId: r.id, order: r.global_order, speaker: r.speaker, sentences: sents.length,
      turnClip: r.target_audio_id || null, turnVoice, castVoice, drillCount: ids.length,
      drillVoices: [...new Set(drillClips.map((d) => d.row && canonVoice(d.row.voice_id)).filter(Boolean))],
      offTurn: offTurn.map((d) => d.id), flags,
    })
  }
  return { turns, drill }
}

/**
 * Pure. Section B: group the course_audio rows that hold a Drill sentence's words, per (language, text).
 * @param drill     podFindings().drill
 * @param textRows  course_audio rows [{id, language, text_normalized, voice_id, course_code, role, s3_key, origin}]
 * @param pointed   Set of clip ids any learner-facing pointer names (course rows or pod rows)
 */
function drillRecordings(drill, textRows, pointed) {
  const byKey = new Map()
  for (const r of textRows) {
    const k = `${r.language}\t${r.text_normalized}`
    if (!byKey.has(k)) byKey.set(k, [])
    byKey.get(k).push(r)
  }
  const seen = new Set()
  const out = []
  for (const d of drill) {
    if (!d.text || !d.language) continue
    const k = `${d.language}\t${normalizeForAudio(d.text)}`
    if (seen.has(k)) continue
    seen.add(k)
    const rows = byKey.get(k) || []
    const objects = new Map() // s3 object → row (one recording)
    for (const r of rows) if (!objects.has(r.s3_key)) objects.set(r.s3_key, r)
    const recs = [...objects.values()]
    const keep = recs.filter((r) => r.id === d.clipId || r.s3_key === (rows.find((x) => x.id === d.clipId) || {}).s3_key)
    const others = recs.filter((r) => !keep.includes(r))
    out.push({
      language: d.language, text: d.text, drillClip: d.clipId, drillVoice: d.voice, turnVoice: d.turnVoice,
      recordings: recs.length, voices: [...new Set(recs.map((r) => canonVoice(r.voice_id)))],
      extra: others.map((r) => ({ id: r.id, voice: canonVoice(r.voice_id), course: r.course_code, role: r.role, origin: r.origin, pointed: pointed.has(r.id), chars: String(r.text_normalized || '').length })),
    })
  }
  return out
}

/** Pure. Totals for the summary. */
function summarise({ turns, drill }, recs, forks, dupes) {
  const flagCount = {}
  const byCourse = {}
  for (const t of turns) {
    const c = (byCourse[t.course] = byCourse[t.course] || { turns: 0, multi: 0, split: 0, drillOffTurn: 0, turnOffSpeaker: 0, unsplit: 0 })
    c.turns++
    if (t.sentences > 1) c.multi++
    if (t.drillCount >= 2) c.split++
    for (const f of t.flags) flagCount[f] = (flagCount[f] || 0) + 1
    if (t.flags.includes('drill-off-turn')) c.drillOffTurn++
    if (t.flags.includes('turn-off-speaker')) c.turnOffSpeaker++
    if (t.flags.includes('drill-unsplit')) c.unsplit++
  }
  const extra = recs.flatMap((r) => r.extra)
  return {
    pods: { turns: turns.length, drillClips: drill.length, flags: flagCount, drillOffTurnClips: turns.reduce((n, t) => n + t.offTurn.length, 0) },
    drillTexts: {
      texts: recs.length, withExtraRecordings: recs.filter((r) => r.extra.length).length,
      extraRecordings: extra.length, extraUnpointed: extra.filter((e) => !e.pointed).length,
      extraChars: extra.reduce((n, e) => n + e.chars, 0),
    },
    pointerForks: forks ? { texts: forks.length, byCourse: countBy(forks, 'course_code') } : null,
    recordingDuplicates: dupes || null,
    byCourse,
  }
}
const countBy = (xs, k) => xs.reduce((o, x) => ((o[x[k]] = (o[x[k]] || 0) + 1), o), {})

function markdown(report) {
  const s = report.summary
  const L = [`# Live clip census — ${report.scope} (${report.db})`, '']
  L.push(`Served pod turns ${s.pods.turns}; Drill clips ${s.pods.drillClips}. Flags: ` + Object.entries(s.pods.flags).map(([k, v]) => `${k} ${v}`).join(', ') + `. Drill clips off their turn's voice: ${s.pods.drillOffTurnClips}.`, '')
  L.push(`Drill texts ${s.drillTexts.texts}; with more than one recording ${s.drillTexts.withExtraRecordings}; extra recordings ${s.drillTexts.extraRecordings} (${s.drillTexts.extraUnpointed} pointed at by nothing), ${s.drillTexts.extraChars} chars.`, '')
  if (s.pointerForks) L.push(`Main-flow pointer forks (one text, several clips, one course): ${s.pointerForks.texts}.`, '')
  if (s.recordingDuplicates) {
    L.push('| language | (text, voice) recorded >1× | extra recordings | extra chars | texts in >1 voice |', '|---|---|---|---|---|')
    for (const d of s.recordingDuplicates) L.push(`| ${d.language} | ${d.groups} | ${d.extra} | ${d.chars} | ${d.voice_forks} |`)
    L.push('')
  }
  L.push('| course | turns | multi-sentence | split | drill off turn | turn off speaker | unsplit |', '|---|---|---|---|---|---|---|')
  for (const [c, v] of Object.entries(s.byCourse).sort()) L.push(`| ${c} | ${v.turns} | ${v.multi} | ${v.split} | ${v.drillOffTurn} | ${v.turnOffSpeaker} | ${v.unsplit} |`)
  return L.join('\n') + '\n'
}

// ── database (QA copy) ──────────────────────────────────────────────────────────────────────────────────────
const POD_SQL = `SELECT p.course_code, p.id AS pod_id, p.speakers, s.id, s.global_order, s.speaker, s.target_text,
  s.target_audio_id::text AS target_audio_id, s.sentence_audio_ids::text[] AS sentence_audio_ids
  FROM listening_pod_sentences s JOIN listening_pods p ON p.id = s.pod_id
  WHERE p.pod_type = 'core' AND p.slug = 'pod-1' AND s.variant_key IS NULL AND ($1::text IS NULL OR p.course_code = $1)
  ORDER BY p.course_code, s.global_order`

// One (course, side, text) pointed at several clips across legos, phrases and seeds.
const FORK_SQL = `WITH ptr AS (
    SELECT course_code, target_text t, target1_audio_id a1, target2_audio_id a2, known_text k, known_audio_id ak FROM course_legos WHERE ($1::text IS NULL OR course_code = $1)
    UNION ALL SELECT course_code, target_text, target1_audio_id, target2_audio_id, known_text, known_audio_id FROM course_practice_phrases WHERE ($1::text IS NULL OR course_code = $1)
    UNION ALL SELECT course_code, target_text, target1_audio_id, target2_audio_id, known_text, known_audio_id FROM course_seeds WHERE ($1::text IS NULL OR course_code = $1))
  SELECT course_code, 'target' AS side, lower(btrim(t)) AS text, count(DISTINCT a1) AS t1, count(DISTINCT a2) AS t2 FROM ptr
    GROUP BY 1, 3 HAVING count(DISTINCT a1) > 1 OR count(DISTINCT a2) > 1
  UNION ALL
  SELECT course_code, 'known', lower(btrim(k)), count(DISTINCT ak), 0 FROM ptr WHERE k IS NOT NULL
    GROUP BY 1, 3 HAVING count(DISTINCT ak) > 1`

const DUPE_SQL = `WITH g AS (
    SELECT language, text_normalized, voice_id, count(DISTINCT s3_key) AS recs, max(length(text_normalized)) AS chars
    FROM course_audio WHERE role IN ('target1','target2','known') AND s3_key NOT LIKE 'pending/%' GROUP BY 1, 2, 3),
  v AS (SELECT language, text_normalized, count(*) AS nv FROM g GROUP BY 1, 2)
  SELECT g.language, count(*) FILTER (WHERE recs > 1) AS groups, coalesce(sum(recs - 1), 0) AS extra,
    coalesce(sum((recs - 1) * chars), 0) AS chars,
    (SELECT count(*) FROM v WHERE v.language = g.language AND nv > 1) AS voice_forks
  FROM g GROUP BY g.language ORDER BY extra DESC`

async function main(argv) {
  const arg = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d }
  const course = arg('course', null)
  const db = require('../../services/shared/agent-db.cjs')
  const pg = await db.connect()
  let report
  try {
    const podRows = (await pg.query(POD_SQL, [course])).rows
    const ids = podRows.flatMap((r) => [r.target_audio_id, ...(r.sentence_audio_ids || [])]).filter(Boolean)
    const clips = await db.clipMap(pg, ids, { cols: 'id::text AS id, course_code, role, language, voice_id, origin, s3_key, text' })
    const found = podFindings(podRows, clips)
    // B: every row holding a Drill sentence's words, matched on the stored key (language, text_normalized).
    const keys = new Map()
    for (const d of found.drill) if (d.language && d.text) keys.set(`${d.language}\t${normalizeForAudio(d.text)}`, [d.language, normalizeForAudio(d.text)])
    const langs = [...new Set([...keys.values()].map((k) => k[0]))]
    const textRows = []
    for (const lang of langs) {
      const texts = [...keys.values()].filter((k) => k[0] === lang).map((k) => k[1])
      textRows.push(...(await pg.query(`SELECT id::text AS id, language, text_normalized, voice_id, course_code, role, s3_key, origin
        FROM course_audio WHERE language = $1 AND text_normalized = ANY($2::text[])`, [lang, texts])).rows)
    }
    const cand = [...new Set(textRows.map((r) => r.id))]
    const pointed = new Set(ids.map(String))
    if (cand.length) {
      for (const t of ['course_legos', 'course_practice_phrases', 'course_seeds']) {
        const q = await pg.query(`SELECT unnest(ARRAY[target1_audio_id, target2_audio_id, known_audio_id])::text AS id FROM ${t}
          WHERE target1_audio_id = ANY($1::uuid[]) OR target2_audio_id = ANY($1::uuid[]) OR known_audio_id = ANY($1::uuid[])`, [cand])
        for (const r of q.rows) if (r.id) pointed.add(r.id)
      }
      const q = await pg.query(`SELECT unnest(array_append(coalesce(sentence_audio_ids, '{}'), target_audio_id))::text AS id FROM listening_pod_sentences
        WHERE target_audio_id = ANY($1::uuid[]) OR sentence_audio_ids && $1::uuid[]`, [cand])
      for (const r of q.rows) if (r.id) pointed.add(r.id)
    }
    const recs = drillRecordings(found.drill, textRows, pointed)
    const forks = argv.includes('--no-forks') ? null : (await pg.query(FORK_SQL, [course])).rows
    const dupes = argv.includes('--no-dupes') ? null : (await pg.query(DUPE_SQL)).rows.map((r) => ({ ...r, groups: +r.groups, extra: +r.extra, chars: +r.chars, voice_forks: +r.voice_forks }))
    const summary = summarise(found, recs, forks, dupes)
    const dbName = (/\/([^/?]+)\?/.exec(String(process.env.DATABASE_URL || '')) || [])[1] || 'db'
    report = { scope: course || 'all courses', db: dbName, generatedAt: new Date().toISOString(), summary, turns: found.turns.filter((t) => t.flags.length), drillRecordings: recs.filter((r) => r.extra.length || r.drillVoice !== r.turnVoice), forks }
  } finally { await pg.end() }
  if (arg('json')) fs.writeFileSync(arg('json'), JSON.stringify(report, null, 1))
  if (arg('md')) fs.writeFileSync(arg('md'), markdown(report))
  console.log(JSON.stringify(report.summary, null, 1))
}

module.exports = { sentencesOf, canonVoice, speakerVoice, podFindings, drillRecordings, summarise, markdown, POD_SQL, FORK_SQL, DUPE_SQL }
if (require.main === module) main(process.argv.slice(2)).catch((e) => { console.error(e.stack || e.message); process.exit(1) })
