// src/composables/mic-input.js
//
// WHICH MICROPHONE IS THIS — THE PHONE'S OWN, OR A PROPER ONE PLUGGED IN?
//
// Tom, 2026-10-31 (r-2026-10-31-audio-quality-is-a-threshold-not): "it should
// know whether you've got a proper microphone plugged into it, or whether you're
// using the built-in iPhone microphone." Community recordists record straight
// off the phone and that has to stay good enough; Tom and Aran plug a pro mic
// into a phone or a laptop and the browser's voice processing must keep its
// hands off that signal.
//
// So the booth decides the capture setup from the microphone itself:
//
//   builtin  → 'phone' setup  (the browser's voice chain, exactly as before)
//   headset  → 'phone' setup  (AirPods, EarPods, a Bluetooth hands-free mic:
//                              a voice-CALL mic, not a proper one — it is better
//                              off with the call processing it was built for)
//   external → 'pro' setup    (echo cancellation, noise suppression and auto
//                              gain all OFF: the dry capture the server masters)
//   unknown  → 'phone' setup  (no evidence is the community case, and the
//                              community case is the one that must not regress)
//
// The evidence is the device label (enumerateDevices / track.label, which only
// exist once mic permission has been granted) and, weakly, the track's channel
// count. Labels are what browsers actually expose; nothing else distinguishes a
// Lightning mic from the iPhone's bottom mic. Everything here is pure so the
// label table can be tested without a browser.

// Chrome prefixes the OS default and communications devices; the real name follows.
const PREFIX = /^(default|communications)\s*-\s*/i

// Words that mean "this is the device's own microphone". Checked first: a
// MacBook's mic must never read as external because its label says "Pro".
const BUILTIN = [
  /\bbuilt[- ]?in\b/i,
  /\binternal\b/i,
  /\biphone\b/i, /\bipad\b/i,
  /\bmacbook\b/i, /\bimac\b/i, /\bstudio display\b/i,
  /\b(front|back|bottom|top|rear)\s+microphone\b/i, // iOS's own mic positions
  /\bmicrophone array\b/i, /\bmic(rophone)? array\b/i, // Windows laptop arrays
  /\brealtek\b/i, /\bintel\b.*\b(smart sound|sst)\b/i, /\bconexant\b/i, /\bcirrus logic\b/i,
  /\bspeakerphone\b/i, /\bhandset\b/i,
  /\bwebcam\b/i, /\bfacetime\b/i, /\bcamera\b/i,
]

// Voice-call mics: earbuds, headsets, anything over Bluetooth hands-free.
const HEADSET = [
  /\bairpods?\b/i, /\bearpods?\b/i, /\bbeats\b/i, /\bgalaxy buds\b/i, /\bpixel buds\b/i,
  /\bbluetooth\b/i, /\bhands[- ]?free\b/i, /\bhfp\b/i,
  /\bheadset\b/i, /\bearpiece\b/i, /\bear ?buds?\b/i, /\bheadphones?\b/i,
]

// A proper plugged-in microphone or audio interface.
const EXTERNAL = [
  /usb/i, /\blightning\b/i,
  /\bxlr\b/i, /\binterface\b/i,
  /\b(blue )?(yeti|snowball)\b/i, /\brode\b/i, /\brøde\b/i, /\bnt-?usb\b/i, /\bpodmic\b/i,
  /\bshure\b/i, /\bmv ?\d{2}\b/i, /\bsm7b?\b/i,
  /\bfocusrite\b/i, /\bscarlett\b/i, /\bclarett\b/i, /\bvocaster\b/i,
  /\baudio-?technica\b/i, /\bat ?20\d0/i, /\batr\d{4}\b/i,
  /\belgato\b/i, /\bwave:?\s?\d\b/i, /\bhyperx\b/i, /\bfifine\b/i, /\bsamson\b/i,
  /\bzoom\b/i, /\btascam\b/i, /\bmotu\b/i, /\bpresonus\b/i, /\bsteinberg\b/i,
  /\bbehringer\b/i, /\buniversal audio\b/i, /\bapollo\b/i, /\bvolt \d\b/i,
  /\birig\b/i, /\bik multimedia\b/i, /\bapogee\b/i, /\bsennheiser\b/i, /\bneumann\b/i,
  /\bdji mic\b/i, /\bwireless go\b/i, /\bhollyland\b/i, /\blark\b/i, /\bsaramonic\b/i,
  /\bboya\b/i, /\bmaono\b/i, /\btonor\b/i, /\bantlion\b/i,
]

/**
 * Classify one microphone.
 *
 * @param {{ label?: string, channelCount?: number }} input
 *   label: the device or track label (empty before permission is granted).
 *   channelCount: from track.getSettings(), if known.
 * @returns {{ kind: 'builtin'|'headset'|'external'|'unknown', reason: string }}
 */
export function classifyMicInput({ label = '', channelCount = null } = {}) {
  const name = String(label || '').replace(PREFIX, '').trim()
  if (!name) return { kind: 'unknown', reason: 'no label (permission not yet granted)' }
  const hit = (list) => list.find(re => re.test(name))
  // Built-in before external: "MacBook Pro Microphone" contains "Pro" and an
  // iPhone label never names a brand. Headset before external: "USB headset"
  // is still a headset.
  let re = hit(BUILTIN)
  if (re) return { kind: 'builtin', reason: `label matches ${re}` }
  re = hit(HEADSET)
  if (re) return { kind: 'headset', reason: `label matches ${re}` }
  re = hit(EXTERNAL)
  if (re) return { kind: 'external', reason: `label matches ${re}` }
  // Built-in phone and laptop mics are delivered mono; a stereo input with a
  // name we do not recognise is far more likely an interface than a lid mic.
  if (Number(channelCount) >= 2) return { kind: 'external', reason: `${channelCount}-channel input` }
  return { kind: 'unknown', reason: `unrecognised label "${name}"` }
}

/** The capture setup (a CAPTURE_PROFILES key) a microphone kind gets by default. */
export function setupForMicKind(kind) {
  return kind === 'external' ? 'pro' : 'phone'
}

/** Words for the booth: what the room thinks is plugged in. */
export function describeMicKind(kind) {
  if (kind === 'external') return 'plugged-in mic'
  if (kind === 'headset') return 'headset mic'
  if (kind === 'builtin') return 'built-in mic'
  return 'mic not yet identified'
}

/** Read the evidence off a live audio track. Never throws. */
export function classifyTrack(track) {
  if (!track) return { kind: 'unknown', reason: 'no track' }
  let s = {}
  try { s = track.getSettings ? track.getSettings() : {} } catch { s = {} }
  return classifyMicInput({ label: track.label, channelCount: s.channelCount })
}
