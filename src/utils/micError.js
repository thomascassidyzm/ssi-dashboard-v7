// src/utils/micError.js
//
// What to tell a recordist when the browser will not give us a microphone.
//
// Auke, fry_for_eng, 2026-11-02 (job #43): with no working mic, "Begin Recording" in the Record
// Room jumped straight to "Session Complete" and the only clue was "Requested device not found"
// in the console. getUserMedia fails with a named DOMException, and each name has a different
// remedy, so each gets its own plain sentence saying what is wrong and what to do.

const MESSAGES = {
  NotAllowedError: {
    title: 'Popty is not allowed to use your microphone.',
    action: 'Click the microphone or lock icon in the address bar, choose "Allow" for this site, then press Record again.',
  },
  NotFoundError: {
    title: 'No microphone was found.',
    action: 'Plug in your microphone (or check it is switched on and selected in your computer\'s sound settings), then press Record again.',
  },
  NotReadableError: {
    title: 'Your microphone is there, but it could not be started.',
    action: 'Another app (Zoom, Teams, a recording program) may be using it. Close that app, or unplug the mic and plug it back in, then press Record again.',
  },
  OverconstrainedError: {
    title: 'Your microphone could not record in the format Popty asked for.',
    action: 'Try a different microphone, or choose another input in your computer\'s sound settings, then press Record again.',
  },
  SecurityError: {
    title: 'The browser blocked the microphone for security reasons.',
    action: 'Make sure the address starts with https://popty.app, and that microphone access is not turned off for this browser, then press Record again.',
  },
  AbortError: {
    title: 'The microphone stopped while it was starting.',
    action: 'Wait a moment and press Record again. If it keeps happening, unplug the mic and plug it back in.',
  },
  NoMediaDevices: {
    title: 'This browser cannot reach a microphone on this page.',
    action: 'Use an up-to-date Chrome, Edge, Firefox or Safari, and open Popty at https://popty.app.',
  },
}

// Old Chrome names for the same failures.
const ALIASES = {
  PermissionDeniedError: 'NotAllowedError',
  DevicesNotFoundError: 'NotFoundError',
  TrackStartError: 'NotReadableError',
  ConstraintNotSatisfiedError: 'OverconstrainedError',
}

/**
 * @param {any} err — whatever getUserMedia (or the recorder that called it) threw
 * @returns {{ name: string, title: string, action: string, detail: string }}
 */
export function describeMicError(err) {
  let name = (err && err.name) || ''
  name = ALIASES[name] || name
  if (!MESSAGES[name] && typeof navigator !== 'undefined' && !navigator.mediaDevices?.getUserMedia) name = 'NoMediaDevices'
  const m = MESSAGES[name] || {
    title: 'The microphone could not be started.',
    action: 'Check your microphone is plugged in and allowed for this site, then press Record again. If it still fails, send Popty the message below.',
  }
  return { name: name || 'Error', title: m.title, action: m.action, detail: (err && err.message) || String(err || '') }
}
