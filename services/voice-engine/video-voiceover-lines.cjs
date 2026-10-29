/**
 * VIDEO VOICEOVER CARDS — a video's narration, read line by line on a human voice's booth (Aran, 2026-10-29, job #572:
 * the NPTC "Neath video" from job #542 is voiced in HIS own voice, never a clone, never TTS).
 *
 *   voiceover:<videoSlug>:<lineKey>
 *
 * The script is data (video-voiceovers.json): one line per caption step, each with the length it should run (`aimSec`)
 * and the longest take its stretch of video holds (`fitSec`); the booth shows both, and
 * tools/video/neath-walkthrough/voiceover.py lays the takes onto the video by `segment`.
 *
 * NOT COURSE CONTENT. A take files as an English known-side clip of this voice under the video's `fileUnder` course
 * (the upload seam needs a course row) with no item identity, so it attaches to no seed, LEGO, phrase or pod slot, and
 * the take route runs no same-words fill. Recorded = this voice has any English take of the words (knownByText), the
 * test every known line uses — so the scripts are worded so no course line says the same thing.
 *
 * Pure: no I/O.
 */
'use strict'

const SCRIPTS = require('./video-voiceovers.json')

const VOICEOVER_PREFIX = 'voiceover:'

function voiceoverLineId(slug, key) { return `${VOICEOVER_PREFIX}${slug}:${key}` }

/** `voiceover:<slug>:<key>` → {slug, key}; null for anything else. */
function parseVoiceoverLineId(lineId) {
  const raw = String(lineId || '')
  if (!raw.startsWith(VOICEOVER_PREFIX)) return null
  const m = /^([a-z0-9-]+):([a-z0-9-]+)$/.exec(raw.slice(VOICEOVER_PREFIX.length))
  return m ? { slug: m[1], key: m[2] } : null
}

function spellingsOf(recordist) { return (recordist && (recordist.spellings || [recordist.voiceId])) || [] }

function videosFor(recordist, scripts = SCRIPTS) {
  const mine = spellingsOf(recordist)
  return (scripts.videos || []).filter((v) => (v.voiceIds || []).some((id) => mine.includes(id)))
}

/**
 * The words a parsed line stands for, if this recordist is the video's voice. Null = not theirs, or no such line: the
 * take route answers 404 and files nothing.
 */
function resolveVoiceoverLine(parsed, recordist, scripts = SCRIPTS) {
  if (!parsed || !recordist) return null
  const video = videosFor(recordist, scripts).find((v) => v.slug === parsed.slug)
  const line = video && video.lines.find((l) => l.key === parsed.key)
  return line ? { courseCode: video.fileUnder, slug: video.slug, key: line.key, text: line.text } : null
}

/** This recordist's voiceover lines, queue-shaped, in script order: one card per video (booth-home `voiceover.<course>`). */
function voiceoverLinesFor(recordist, scripts = SCRIPTS) {
  const out = []
  for (const video of videosFor(recordist, scripts)) {
    video.lines.forEach((line, i) => out.push({
      id: voiceoverLineId(video.slug, line.key),
      order: -900 + i,
      text: line.text,
      knownText: null,
      speaker: null,
      courseCode: video.fileUnder,
      kind: 'voiceover',
      role: 'known',
      knownByText: true,
      voiceId: recordist.voiceId,
      duplicateOf: [],
      podId: null,
      podSlug: null,
      // The card's name ("Neath video"), carried as the track title (booth-home podTitle).
      podTitle: video.title,
      readStyle: 'natural',
      // What the booth shows under the line: where it goes in the video and how long it may run.
      voiceover: { video: video.title, label: line.label, aimSec: line.aimSec, fitSec: line.fitSec },
    }))
  }
  return out
}

module.exports = { VOICEOVER_PREFIX, voiceoverLineId, parseVoiceoverLineId, resolveVoiceoverLine, voiceoverLinesFor, SCRIPTS }
