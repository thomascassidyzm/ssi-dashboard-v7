// @vitest-environment jsdom
/**
 * "Take it again" in queue mode: the fluffed read is ABANDONED, not filed.
 *
 * Back's first tap restarts the take being read (Kai, 2026-08-21). In queue
 * mode that means the open MediaRecorder is stopped and its blob binned — if it
 * were stored, the fluffed read would sit under the phrase's name, and a
 * recordist who walked away before re-reading would ship exactly that.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAutocueState } from '@/composables/useAutocueState'

let recorders = []

class FakeMediaRecorder {
  static isTypeSupported() { return true }
  constructor(stream, opts) {
    this.stream = stream
    this.mimeType = opts?.mimeType || 'audio/webm'
    this.state = 'inactive'
    recorders.push(this)
  }
  start() { this.state = 'recording' }
  stop() {
    this.state = 'inactive'
    // A real MediaRecorder hands over its data before onstop.
    this.ondataavailable?.({ data: { size: 4096, type: this.mimeType } })
    this.onstop?.()
  }
}

beforeEach(async () => {
  recorders = []
  vi.useFakeTimers()
  vi.stubGlobal('MediaRecorder', FakeMediaRecorder)
  vi.stubGlobal('Blob', class { constructor(parts) { this.size = parts.length * 4096 } })
  vi.stubGlobal('URL', { createObjectURL: () => 'blob:take', revokeObjectURL: () => {} })
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: async () => ({ id: 'stream', getTracks: () => [{ stop() {} }] }) } })
})

async function queueModeSession() {
  const autocue = useAutocueState()
  autocue.resetSession()
  autocue.state.phrases = [
    { id: 'p-0', text: 'bore da', cadence: 'natural' },
    { id: 'p-1', text: 'sut mae', cadence: 'natural' }
  ]
  autocue.state.scriptMode = false
  autocue.state.currentPhase = 'recording'
  await autocue.initializeMicrophone()
  autocue.startRecording()
  return autocue
}

describe('restartCurrentTake (queue mode)', () => {
  it('stays on the same line', async () => {
    const autocue = await queueModeSession()
    autocue.restartCurrentTake()
    expect(autocue.state.currentPhraseIndex).toBe(0)
  })

  it('bins the abandoned take instead of filing it', async () => {
    const autocue = await queueModeSession()
    autocue.restartCurrentTake()
    vi.advanceTimersByTime(200)
    expect(autocue.state.audioRecordings.has('p-0')).toBe(false)
  })

  it('arms a fresh capture of the same phrase, whose take IS filed', async () => {
    const autocue = await queueModeSession()
    autocue.restartCurrentTake()
    vi.advanceTimersByTime(200)
    expect(recorders).toHaveLength(2)      // the abandoned one, and its replacement
    expect(recorders[1].state).toBe('recording')

    // The re-read finishes normally and lands under the same phrase.
    autocue.stopRecording()
    expect(autocue.state.audioRecordings.has('p-0')).toBe(true)
  })

  it('leaves an already-stored take of an earlier line alone', async () => {
    const autocue = await queueModeSession()
    autocue.navigatePhrase(1)              // files p-0, moves to p-1
    vi.advanceTimersByTime(200)
    autocue.restartCurrentTake()
    vi.advanceTimersByTime(200)
    expect(autocue.state.audioRecordings.has('p-0')).toBe(true)
    expect(autocue.state.audioRecordings.has('p-1')).toBe(false)
    expect(autocue.state.currentPhraseIndex).toBe(1)
  })

  it('does nothing in script mode — the VAD owns those take boundaries', async () => {
    const autocue = await queueModeSession()
    autocue.state.scriptMode = true
    const before = recorders.length
    expect(autocue.restartCurrentTake()).toBe(false)
    vi.advanceTimersByTime(200)
    expect(recorders.length).toBe(before)
    expect(autocue.state.currentPhraseIndex).toBe(0)
  })
})
