// The play queue as the LISTENER experiences it (Tom, 2026-08-24).
//
// Two of these tests are the ones that matter. The scene-boundary test pins
// that a run started in scene 1 carries on into scene 2 — auditioning a pod
// means hearing the pod, not one scene. The dangling test pins that a dead
// reference is stepped over rather than ending the run: one bad clip silently
// stopping a hands-free listen is the failure this whole thing exists to avoid.

import { describe, it, expect } from 'vitest'
import {
  buildPlayQueue, nextPlayable, prevPlayable, indexOfLine, isPlayable, DEFAULT_OPTIONS,
} from './podPlayQueue.js'

const clip = (id, extra = {}) => ({
  id, ref: id, url: `https://saysomethingin.app/api/audio/${id}`,
  found: true, text: id, duration_ms: 1000, ...extra,
})

const line = (id, audio = {}, extra = {}) => ({
  id, sentence_number: 1, speaker: 'Neighbour',
  voice: { voice_id: 'x7avnu1k', name: 'Enzo' },
  target_text: `target ${id}`, known_text: `known ${id}`,
  audio: { target: null, known: null, explainer: null, target_splits: [], known_splits: [], ...audio },
  ...extra,
})

const scene = (n, lines) => ({ scene_number: n, lines })

describe('buildPlayQueue — what a hands-free listen actually plays', () => {
  it('defaults to the target whole turn, one entry per line', () => {
    const q = buildPlayQueue([scene(1, [
      line('a', { target: clip('a1') }),
      line('b', { target: clip('b1') }),
    ])])
    expect(q.map(e => e.clip.id)).toEqual(['a1', 'b1'])
    expect(q.map(e => e.kind)).toEqual(['target', 'target'])
    expect(q.map(e => e.index)).toEqual([0, 1])
  })

  it('runs past the end of a scene into the next one', () => {
    const q = buildPlayQueue([
      scene(1, [line('a', { target: clip('a1') })]),
      scene(2, [line('b', { target: clip('b1') })]),
      scene(3, [line('c', { target: clip('c1') })]),
    ])
    expect(q.map(e => e.sceneNumber)).toEqual([1, 2, 3])
    expect(q.map(e => e.clip.id)).toEqual(['a1', 'b1', 'c1'])
  })

  it('falls back to the target splits, in order, when a line has no whole turn', () => {
    const q = buildPlayQueue([scene(1, [
      line('a', { target_splits: [clip('a1'), clip('a2')] }),
    ])])
    expect(q.map(e => e.clip.id)).toEqual(['a1', 'a2'])
    expect(q.map(e => e.label)).toEqual(['Split 1', 'Split 2'])
  })

  it('plays splits INSTEAD of the whole turn when that toggle is on', () => {
    const q = buildPlayQueue([scene(1, [
      line('a', { target: clip('a0'), target_splits: [clip('a1'), clip('a2')] }),
    ])], { splits: true })
    expect(q.map(e => e.clip.id)).toEqual(['a1', 'a2'])
  })

  it('still plays the whole turn under the splits toggle when the line has no splits', () => {
    const q = buildPlayQueue([scene(1, [line('a', { target: clip('a0') })])], { splits: true })
    expect(q.map(e => e.clip.id)).toEqual(['a0'])
  })

  it('adds English only when asked, in the row\'s own button order', () => {
    const scenes = [scene(1, [line('a', { target: clip('a0'), known: clip('ak') })])]
    expect(buildPlayQueue(scenes).map(e => e.clip.id)).toEqual(['a0'])
    expect(buildPlayQueue(scenes, { known: true }).map(e => e.clip.id)).toEqual(['a0', 'ak'])
    expect(buildPlayQueue(scenes, { target: false, known: true }).map(e => e.clip.id)).toEqual(['ak'])
  })

  // Tom, 2026-08-24: "Explainers do not exist anymore. We don't do them.
  // Learners never hear them in app. Let's deprecate them completely."
  // The payload still carries the clip, so the queue has to ignore it on
  // purpose — and keep ignoring it if someone passes the old option.
  it('never queues an explainer, even though the payload still carries one', () => {
    const scenes = [scene(1, [line('a', {
      target: clip('a0'), known: clip('ak'), explainer: clip('ax'),
    })])]
    expect(buildPlayQueue(scenes).map(e => e.clip.id)).toEqual(['a0'])
    expect(buildPlayQueue(scenes, { known: true }).map(e => e.clip.id)).toEqual(['a0', 'ak'])
    // The dead option is inert, not a back door.
    expect(buildPlayQueue(scenes, { explainer: true }).map(e => e.clip.id)).toEqual(['a0'])
    expect(buildPlayQueue(scenes, { known: true, explainer: true }).map(e => e.kind))
      .toEqual(['target', 'known'])
    expect(DEFAULT_OPTIONS.explainer).toBeUndefined()
  })

  it('queues nothing for a line whose ONLY clip is an explainer', () => {
    const q = buildPlayQueue([scene(1, [
      line('a', { target: clip('a0') }),
      line('x', { explainer: clip('x0') }),
      line('c', { target: clip('c0') }),
    ])], { known: true, explainer: true })
    expect(q.map(e => e.clip.id)).toEqual(['a0', 'c0'])
  })

  it('produces nothing for a line with no clips at all, and does not stall on it', () => {
    const q = buildPlayQueue([scene(1, [
      line('a', { target: clip('a0') }),
      line('silent'),
      line('c', { target: clip('c0') }),
    ])])
    expect(q.map(e => e.clip.id)).toEqual(['a0', 'c0'])
  })

  it('carries what the now-playing strip needs on every entry', () => {
    const [e] = buildPlayQueue([scene(7, [line('a', { target: clip('a0') })])])
    expect(e).toMatchObject({
      sceneNumber: 7, lineId: 'a', speaker: 'Neighbour', voiceName: 'Enzo',
      kind: 'target', label: 'Whole turn',
    })
  })

  it('is empty for no scenes, and for scenes with no lines', () => {
    expect(buildPlayQueue([])).toEqual([])
    expect(buildPlayQueue(undefined)).toEqual([])
    expect(buildPlayQueue([scene(1, [])])).toEqual([])
  })

  it('does not mutate the caller\'s options', () => {
    const opts = { known: true }
    buildPlayQueue([scene(1, [line('a', { target: clip('a0') })])], opts)
    expect(opts).toEqual({ known: true })
    expect(DEFAULT_OPTIONS.target).toBe(true)
  })
})

describe('nextPlayable — a dead reference is a skip, never a stall', () => {
  it('steps over a dangling clip to the next live one', () => {
    const q = buildPlayQueue([scene(1, [
      line('a', { target: clip('a0') }),
      line('b', { target: clip('b0', { found: false }) }),
      line('c', { target: clip('c0') }),
    ])])
    expect(q).toHaveLength(3)          // it stays visible in the queue…
    expect(nextPlayable(q, 1)).toBe(2) // …but the run steps over it
  })

  it('steps over a clip with no URL', () => {
    const q = buildPlayQueue([scene(1, [
      line('a', { target: clip('a0', { url: null }) }),
      line('b', { target: clip('b0') }),
    ])])
    expect(nextPlayable(q, 0)).toBe(1)
  })

  it('steps over a whole run of dead clips', () => {
    const q = buildPlayQueue([scene(1, [
      line('a', { target: clip('a0') }),
      line('b', { target: clip('b0', { found: false }) }),
      line('c', { target: clip('c0', { found: false }) }),
      line('d', { target: clip('d0', { found: false }) }),
      line('e', { target: clip('e0') }),
    ])])
    expect(nextPlayable(q, 1)).toBe(4)
  })

  it('returns -1 when nothing playable is left — that is the end of the run', () => {
    const q = buildPlayQueue([scene(1, [
      line('a', { target: clip('a0') }),
      line('b', { target: clip('b0', { found: false }) }),
    ])])
    expect(nextPlayable(q, 1)).toBe(-1)
  })

  it('returns -1 for an empty queue, and clamps a negative start', () => {
    expect(nextPlayable([], 0)).toBe(-1)
    const q = buildPlayQueue([scene(1, [line('a', { target: clip('a0') })])])
    expect(nextPlayable(q, -5)).toBe(0)
  })

  it('steps backwards the same way', () => {
    const q = buildPlayQueue([scene(1, [
      line('a', { target: clip('a0') }),
      line('b', { target: clip('b0', { found: false }) }),
      line('c', { target: clip('c0') }),
    ])])
    expect(prevPlayable(q, 1)).toBe(0)
    expect(prevPlayable(q, 99)).toBe(2)
    expect(prevPlayable(q, -1)).toBe(-1)
  })
})

describe('isPlayable / indexOfLine', () => {
  it('refuses a dangling reference and a urlless clip', () => {
    expect(isPlayable(clip('a'))).toBe(true)
    expect(isPlayable(clip('a', { found: false }))).toBe(false)
    expect(isPlayable(clip('a', { url: '' }))).toBe(false)
    expect(isPlayable(null)).toBe(false)
  })

  it('finds where a line starts so "play from here" lands on it', () => {
    const q = buildPlayQueue([scene(1, [
      line('a', { target: clip('a0'), known: clip('ak') }),
      line('b', { target: clip('b0'), known: clip('bk') }),
    ])], { known: true })
    expect(indexOfLine(q, 'b')).toBe(2)
    expect(indexOfLine(q, 'nope')).toBe(-1)
  })
})
