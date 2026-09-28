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
 */
const fs = require('fs')
const os = require('os')
const path = require('path')

const listPath = () => process.env.MY_VOICE_CLONE_LIST || path.join(os.homedir(), '.config/command-surface/my-voice-clone-ids.json')
const bare = (id) => String(id || '').replace(/^cartesia_/, '').trim()

function listedIds () {
  try { return new Set((JSON.parse(fs.readFileSync(listPath(), 'utf8')).ids || []).map(bare)) } catch { return new Set() }
}

function isSurfaceClone (voiceId, name = null) {
  return listedIds().has(bare(voiceId)) || /^surface_/i.test(String(name || ''))
}

function assertNotSurfaceClone (voiceId, name = null) {
  if (!isSurfaceClone(voiceId, name)) return
  throw Object.assign(new Error(
    `Voice ${bare(voiceId)} is somebody's personal voice, cloned on the command surface for their own videos — ` +
    'it can never be registered or cast as an SSi course voice. Pick a catalogue voice, or clone one here in the Voice Lab with its own consent.'),
  { status: 409, code: 'SURFACE_PERSONAL_CLONE' })
}

module.exports = { isSurfaceClone, assertNotSurfaceClone, listPath }
