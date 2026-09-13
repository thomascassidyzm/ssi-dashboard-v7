#!/usr/bin/env node
/**
 * Re-verify the 2026-08-13 English distinct-text recount against LIVE data before rendering.
 * Read-only. Reproduces docs/audio/english-distinct-text-recount-2026-08-13.md §1 exactly:
 * same scope (slug LIKE 'pod-0%'), same identity key (the text_stripped expression), same
 * speaker->gender->voice resolution, same reuse credit (on-cast clip anywhere in course_audio).
 */
const { q } = require('./db.cjs')
const fs = require('fs')

const NORM = `lower(btrim(regexp_replace(txt,'[。？！、，.!?,;:()（）「」『』\\[\\]…—–¿¡\\-]+','','g')))`

const SCOPE = `
WITH pod AS (
  SELECT p.id, p.slug, p.course_code, p.speakers, c.known_lang, c.target_lang
  FROM listening_pods p JOIN courses c ON c.course_code=p.course_code
  WHERE p.slug LIKE 'pod-0%'
), slot AS (
  SELECT pod.id AS pod_id, pod.slug, pod.course_code, pod.speakers, s.id AS sentence_id,
         s.speaker, 'known'::text AS side, s.known_text AS txt, s.known_audio_id AS aid
  FROM pod JOIN listening_pod_sentences s ON s.pod_id=pod.id WHERE pod.known_lang='eng'
  UNION ALL
  SELECT pod.id, pod.slug, pod.course_code, pod.speakers, s.id,
         s.speaker, 'target', s.target_text, s.target_audio_id
  FROM pod JOIN listening_pod_sentences s ON s.pod_id=pod.id WHERE pod.target_lang='eng'
)`

;(async () => {
  const head = await q(`${SCOPE} SELECT count(*)::int slots, count(DISTINCT course_code)::int courses,
    count(DISTINCT pod_id)::int pods, count(DISTINCT ${NORM})::int distinct_texts FROM slot`)
  console.log('SCOPE', head[0])

  // full slot dump with resolved speaker gender
  const rows = await q(`${SCOPE}
    SELECT slot.pod_id, slot.slug, slot.course_code, slot.sentence_id, slot.speaker, slot.side,
           slot.txt, slot.aid, ${NORM} AS norm,
           slot.speakers::text AS speakers_json,
           a.voice_id, a.s3_key, a.text_stripped
    FROM slot LEFT JOIN course_audio a ON a.id=slot.aid`)
  console.log('rows', rows.length)
  fs.writeFileSync(__dirname + '/slots.json', JSON.stringify(rows))
})().catch(e => { console.error(e); process.exit(1) })
