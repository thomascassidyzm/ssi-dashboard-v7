/**
 * SURFACE MY-VOICE CLONES ARE NEVER COURSE VOICES (#587, Tom 2026-09-28).
 *
 * The command surface lets anyone on it clone their OWN voice, on the same Cartesia account this
 * lab registers course voices from, for their own videos. A personal clone was consented to for
 * that and nothing else, so it must never be cast into an SSi course. The surface keeps every clone
 * id it has ever made (deleted ones included) in a file on watson-1 — the same box Popty runs on —
 * and this reads it fresh on every call: registration is rare, the file is tiny, and a cache would
 * be a window in which a new clone is castable.
 *
 * Two signals, either one refuses: the id is on the list, or Cartesia's name for it starts with
 * `surface_` (how the surface names every clone). The name catches a clone the list missed; the
 * list catches a clone somebody renamed.
 *
 * ONE WAY THROUGH (#595, Tom 2026-09-28): the voice's OWNER may tick "may be used as a voice in Popty
 * courses" on the surface — off by default, their own tap only (the surface refuses agents and
 * anyone acting for them), dated and revocable. The surface writes those ids to `coursePermitted`
 * in the same file, and a permitted id passes here whatever its name. This is checked at
 * registration, at casting, and at render (tts-service assertConsentedVoice), so a withdrawal stops
 * new course audio in that voice; audio already rendered stays.
 */
const fs = require('fs')
const os = require('os')
const path = require('path')

const listPath = () => process.env.MY_VOICE_CLONE_LIST || path.join(os.homedir(), '.config/command-surface/my-voice-clone-ids.json')
const bare = (id) => String(id || '').replace(/^cartesia_/, '').trim()

function readList () {
  try {
    const j = JSON.parse(fs.readFileSync(listPath(), 'utf8'))
    return { ids: new Set((j.ids || []).map(bare)), permitted: new Set((j.coursePermitted || []).map(bare)) }
  } catch { return { ids: new Set(), permitted: new Set() } }
}

// True = a surface personal clone that is NOT course-permitted, i.e. refuse it.
function isSurfaceClone (voiceId, name = null) {
  const { ids, permitted } = readList()
  const id = bare(voiceId)
  if (permitted.has(id)) return false
  return ids.has(id) || /^surface_/i.test(String(name || ''))
}

function assertNotSurfaceClone (voiceId, name = null) {
  if (!isSurfaceClone(voiceId, name)) return
  throw Object.assign(new Error(
    `Voice ${bare(voiceId)} is somebody's personal voice, cloned on the command surface for their own videos — ` +
    'it is never registered, cast or rendered as an SSi course voice unless its owner switches on "may be used as a voice in Popty courses" in their My voice on the surface. Pick a catalogue voice, or clone one here in the Voice Lab with its own consent.'),
  { status: 409, code: 'SURFACE_PERSONAL_CLONE' })
}

module.exports = { isSurfaceClone, assertNotSurfaceClone, listPath }
