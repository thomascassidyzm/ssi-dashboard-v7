/**
 * The pod script viewer's play queue (Tom, 2026-08-24):
 * "Can we have the Popty pod script view tool play continuously?"
 *
 * Auditioning a pod by ear means hearing the conversation the way the learner
 * hears it, hands-free, from any line to the end of the pod. This module is the
 * pure half of that: given the scenes ALREADY ON SCREEN and a set of toggles,
 * it returns the ordered list of clips to play, in the same order the buttons
 * appear in each row.
 *
 * It is deliberately pure and deliberately dumb about audio — the view owns the
 * one shared <audio> element, this owns "what comes next". Two rules it must
 * never break:
 *
 *  1. The queue is built from the VISIBLE scenes. If a violation filter is
 *     hiding lines, continuous play plays what Tom can see, not what he can't.
 *  2. A dangling reference (found === false) and a clip with no URL stay IN the
 *     queue but are never played — `nextPlayable` steps over them. Keeping them
 *     in means the indices still line up with the page; stepping over them
 *     means one dead reference can never silently end the run, which is the
 *     failure mode that would make the whole thing useless.
 */

/** What the run includes. Target whole-turn only, by default: the conversation. */
export const DEFAULT_OPTIONS = Object.freeze({
  target: true,      // the target whole-turn clip for each line
  splits: false,     // play the target/known SPLITS instead of the whole turn
  known: false,      // the English clip too
})

/** A clip we can actually send to the audio element. */
export function isPlayable (clip) {
  return Boolean(clip && clip.url && clip.found !== false)
}

/**
 * The first index at or after `from` that holds a playable clip, or -1.
 * This is what makes a dangling clip a skip rather than a stall.
 */
export function nextPlayable (queue, from = 0) {
  for (let i = Math.max(0, from); i < queue.length; i++) {
    if (isPlayable(queue[i].clip)) return i
  }
  return -1
}

/** The last playable index at or before `from`, or -1. (Step backwards.) */
export function prevPlayable (queue, from) {
  for (let i = Math.min(from, queue.length - 1); i >= 0; i--) {
    if (isPlayable(queue[i].clip)) return i
  }
  return -1
}

/** The first queue index belonging to a given line, or -1. */
export function indexOfLine (queue, lineId) {
  for (let i = 0; i < queue.length; i++) if (queue[i].lineId === lineId) return i
  return -1
}

function push (out, entry) {
  entry.index = out.length
  out.push(entry)
}

/**
 * One line's clips, in the button order the row already renders them in.
 *
 * The splits toggle is a SUBSTITUTION, not an addition: "splits instead of
 * whole turn". Either way, a line that has only the other kind still plays —
 * falling back is better than a silent gap in the middle of a scene.
 */
function lineEntries (out, scene, line, opts) {
  const audio = line.audio || {}
  const targetSplits = audio.target_splits || []
  const knownSplits = audio.known_splits || []
  const base = {
    sceneNumber: scene.scene_number ?? null,
    lineId: line.id,
    sentenceNumber: line.sentence_number,
    speaker: line.speaker,
    voiceName: line.voice ? (line.voice.name || line.voice.voice_id) : null,
    text: line.target_text,
  }

  if (opts.target) {
    const wantSplits = opts.splits && targetSplits.length
    if (wantSplits) {
      targetSplits.forEach((clip, i) =>
        push(out, { ...base, kind: 'target-split', label: `Split ${i + 1}`, clip }))
    } else if (audio.target) {
      push(out, { ...base, kind: 'target', label: 'Whole turn', clip: audio.target })
    } else {
      // No whole turn: the splits ARE the line. Play them in order.
      targetSplits.forEach((clip, i) =>
        push(out, { ...base, kind: 'target-split', label: `Split ${i + 1}`, clip }))
    }
  }

  if (opts.known) {
    const wantSplits = opts.splits && knownSplits.length
    if (wantSplits) {
      knownSplits.forEach((clip, i) =>
        push(out, { ...base, kind: 'known-split', label: `EN ${i + 1}`, text: line.known_text, clip }))
    } else if (audio.known) {
      push(out, { ...base, kind: 'known', label: 'English', text: line.known_text, clip: audio.known })
    } else {
      knownSplits.forEach((clip, i) =>
        push(out, { ...base, kind: 'known-split', label: `EN ${i + 1}`, text: line.known_text, clip }))
    }
  }
}

/**
 * The whole run, scene by scene, line by line — and it runs THROUGH a scene
 * boundary into the next one, because auditioning a pod means hearing the pod.
 */
export function buildPlayQueue (scenes, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const out = []
  for (const scene of scenes || []) {
    for (const line of scene.lines || []) lineEntries(out, scene, line, opts)
  }
  return out
}
