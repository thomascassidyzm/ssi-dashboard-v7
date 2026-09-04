/**
 * booth-settings.js — the booth remembers how you left it, PER ARTIST AND PER
 * MICROPHONE.
 *
 * Tom, 2026-09-03, after a session on a MacBook Air built-in mic: the settings
 * did not survive, so he had to set them again every time he opened the room.
 *
 * WHY THIS IS BACK, HAVING BEEN DELIBERATELY REMOVED THE DAY BEFORE. A single
 * flat `recordist.captureProfile` key used to pin a whole browser to whatever
 * had last been ticked — including one tick of a diagnostic — silently, for
 * every session afterwards, on every microphone. Measured 2026-09-02: the
 * desktop carrying a stale 'dry' arrived at -18.9 dBFS peak needing +19.5 dB of
 * lift; the phone, with no stored key, arrived at -2.5 dBFS. Same person, same
 * room, four minutes apart. The fix at the time was to stop remembering.
 *
 * THE REAL FAULT WAS NOT MEMORY, IT WAS THAT THE MEMORY WAS DEVICE-BLIND. A
 * capture profile is a fact about a MICROPHONE — Aran's Blue Snowball wants the
 * raw tap, a MacBook's built-in wants the device's own voice chain — so one
 * remembered value spanning both is wrong by construction. Remembering per mic
 * makes the memory mean what a person means when they set it, and the room
 * still draws its "this is not the usual setting on this device" warning
 * whenever a restored profile differs from the device's own recommendation, so
 * a stale choice can never again be invisible.
 *
 * A MIC THIS ARTIST HAS NEVER USED HERE INHERITS NOTHING. It starts from the
 * device-aware default (resolveCaptureProfile), which is the honest answer:
 * we have no evidence about a microphone we have never recorded through.
 *
 * Everything here is pure and synchronous. localStorage throws in private mode
 * and inside some in-app browsers, so every access is wrapped: a booth that
 * cannot remember must still record.
 */

const KEY = 'recordist.booth.v1'

/** The stable name of a microphone, as a person would mean it. */
export function micKeyFor(device) {
  if (!device) return 'unknown-mic'
  // The LABEL first, deliberately. deviceId is rotated by the browser whenever
  // permissions are reset or storage is cleared, and a rotated id would silently
  // present a mic the artist has used for weeks as one we have never seen.
  const label = String(device.label || '').trim()
  if (label) return `label:${label}`
  const id = String(device.deviceId || '').trim()
  if (id && id !== 'default') return `id:${id}`
  return 'unknown-mic'
}

function readAll() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return (parsed && typeof parsed === 'object') ? parsed : {}
  } catch { return {} }
}

function writeAll(all) {
  try { localStorage.setItem(KEY, JSON.stringify(all)) } catch { /* private mode */ }
}

/**
 * What this artist last used on this microphone, or — when `micKey` is omitted
 * or unknown to us — what they last used anywhere. Null when we have nothing.
 *
 * The fallback is what makes the common case feel like nothing was forgotten:
 * one person, one machine, one mic, opening the room again. It is only ever
 * reached when the mic has no record of its OWN, so a mic with its own settings
 * always wins over the artist's last session on a different one.
 */
export function loadBoothSettings(voiceId, micKey = null) {
  const forVoice = readAll()[voiceId]
  if (!forVoice) return null
  const byDevice = forVoice.byDevice || {}
  if (micKey && byDevice[micKey]) return { ...byDevice[micKey], micKey, source: 'device' }
  const last = forVoice.lastMicKey
  if (last && byDevice[last]) return { ...byDevice[last], micKey: last, source: 'last-session' }
  return null
}

/** Which mic this artist last recorded through here, or null. */
export function lastMicKey(voiceId) {
  const forVoice = readAll()[voiceId]
  return (forVoice && forVoice.lastMicKey) || null
}

/**
 * Remember. Called on every change rather than on leave: the booth is closed by
 * shutting a laptop lid at least as often as by navigating away.
 */
export function saveBoothSettings(voiceId, micKey, settings) {
  if (!voiceId) return
  const key = micKey || 'unknown-mic'
  const all = readAll()
  const forVoice = all[voiceId] || { byDevice: {} }
  forVoice.byDevice = forVoice.byDevice || {}
  forVoice.byDevice[key] = {
    captureProfile: settings.captureProfile,
    autoAdvance: !!settings.autoAdvance,
    includeRecorded: !!settings.includeRecorded,
    maxSeed: settings.maxSeed || null,
    savedAt: new Date().toISOString(),
  }
  forVoice.lastMicKey = key
  all[voiceId] = forVoice
  writeAll(all)
}

/** Forget everything for one artist. Nothing calls this yet; a person might. */
export function clearBoothSettings(voiceId) {
  const all = readAll()
  delete all[voiceId]
  writeAll(all)
}
