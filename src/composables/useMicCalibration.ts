// src/composables/useMicCalibration.ts
/**
 * The microphone check: two seconds of your room, then one short phrase.
 *
 * WHY THIS EXISTS (2026-08-19). The recorder decides where a take ends by
 * comparing a waveform RMS to a silence gate. Until now that gate was placed
 * against the ROOM alone and then clamped to an absolute [0.01, 0.08] — and in
 * practice the clamp won, so the gate was 0.01 on every microphone on earth.
 * A microphone is a gain stage: swap a phone for a quieter, lower-output
 * external mic and the whole signal drops ~13dB, at which point a gate that has
 * not moved is sitting inside the voice's own dynamic range, ordinary
 * mid-phrase dips read as silence, and phrases get cut in half. Kai hit exactly
 * this, same tool, same person, same day: fine on the phone, cut short on the
 * new mic. Measured on a replay of one real phrase through the real VAD, the
 * old gate sat 27.5dB under the voice on the phone and 14.4dB under it on the
 * external mic; with the room AND the voice measured it sits at 21dB on both.
 *
 * So the useful quantity is the GAP between the floor and the voice, and both
 * ends of it have to be measured. That is all this composable does.
 *
 * It owns three things beyond useVAD's arithmetic:
 *   - the SEQUENCE (room, then voice) and the state a UI needs to narrate it,
 *   - PERSISTENCE per device, so a returning recordist is not made to re-do it,
 *   - the guarantee that it is never a WALL: skip it, or fail it, and recording
 *     goes ahead on exactly the fixed threshold that shipped before this.
 *
 * It is deliberately free of any studio-specific knowledge so the recordist
 * tutorial can mount it as its own first step — see MicCheck.vue.
 */

import { ref, computed } from 'vue'
import { useVAD, type VADCalibration } from './useVAD'

export type MicCheckStep = 'idle' | 'room' | 'voice' | 'done' | 'failed'

// One stored per-device result.
export interface MicProfile {
  deviceKey: string
  label: string
  noiseFloor: number
  voiceLevel: number | null
  threshold: number
  headroomDb: number
  quality: VADCalibration['quality']
  // ms since epoch. Rooms change — a fan gets switched on, a window opens — so
  // a profile is a convenience, not a permanent ruling.
  at: number
}

const STORE_KEY = 'ssi.micCalibration.v1'
// Beyond this a stored profile is still SHOWN (so the recordist knows what is
// in force and when it was taken) but is treated as stale and offered for
// re-checking. Two weeks is roughly "a different day's room".
const STALE_AFTER_MS = 14 * 24 * 60 * 60 * 1000
// Keep the map small; a laptop that has seen a dozen headsets does not need
// them all remembered.
const MAX_PROFILES = 8

const ROOM_MS = 2000
const VOICE_MS = 3000

/**
 * A stable-enough key for "this microphone on this browser".
 *
 * deviceId is the right answer and is what desktop browsers give. iOS Safari
 * often returns an empty or rotating deviceId, so the label is the fallback and
 * a single shared bucket is the fallback's fallback — which degrades to "one
 * remembered calibration per browser", still far better than none.
 */
export function deviceKeyFor(track: MediaStreamTrack | null | undefined): { key: string, label: string } {
  const settings: any = track?.getSettings?.() || {}
  const label = track?.label || 'Microphone'
  const id = settings.deviceId && settings.deviceId !== 'default' ? String(settings.deviceId) : ''
  if (id) return { key: `id:${id}`, label }
  if (track?.label) return { key: `label:${track.label}`, label }
  return { key: 'default', label }
}

function readStore(): Record<string, MicProfile> {
  try {
    const raw = globalThis.localStorage?.getItem(STORE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    // Private browsing, a quota error, or corrupt JSON. A calibration we cannot
    // remember is not a reason to refuse to record.
    return {}
  }
}

function writeStore(map: Record<string, MicProfile>) {
  try {
    const entries = Object.entries(map).sort((a, b) => b[1].at - a[1].at).slice(0, MAX_PROFILES)
    globalThis.localStorage?.setItem(STORE_KEY, JSON.stringify(Object.fromEntries(entries)))
  } catch { /* see readStore */ }
}

export function loadProfile(key: string): MicProfile | null {
  return readStore()[key] || null
}

export function saveProfile(profile: MicProfile) {
  const map = readStore()
  map[profile.deviceKey] = profile
  writeStore(map)
}

export function forgetProfile(key: string) {
  const map = readStore()
  delete map[key]
  writeStore(map)
}

export function isStale(profile: MicProfile | null, now = Date.now()): boolean {
  return !!profile && now - profile.at > STALE_AFTER_MS
}

/**
 * Run the mic check.
 *
 * @param existingVad drive an already-listening VAD (the studio's, mid-session)
 *   instead of opening a microphone of our own. When omitted the composable
 *   opens and closes its own stream, which is what a standalone check — the
 *   tutorial's first step — wants.
 */
export function useMicCalibration(options: { existingVad?: ReturnType<typeof useVAD>, stream?: MediaStream } = {}) {
  const step = ref<MicCheckStep>('idle')
  const result = ref<VADCalibration | null>(null)
  const profile = ref<MicProfile | null>(null)
  const error = ref<string | null>(null)
  const level = ref(0)

  const isRunning = computed(() => step.value === 'room' || step.value === 'voice')
  // What the recordist is being asked to do right now, in their own terms.
  const instruction = computed(() => {
    if (step.value === 'room') return 'Say nothing for a moment — just let me hear the room.'
    if (step.value === 'voice') return 'Now say something, in your normal recording voice.'
    return ''
  })

  let ownVad: ReturnType<typeof useVAD> | null = null
  let ownStream: MediaStream | null = null

  async function run(): Promise<MicProfile | null> {
    error.value = null
    let vad = options.existingVad || null
    let track: MediaStreamTrack | undefined

    try {
      if (!vad) {
        ownStream = options.stream || await navigator.mediaDevices.getUserMedia({
          // Deliberately the SAME constraints the studio records under. Measure
          // the signal that will actually be gated, processing and all — a
          // calibration taken on a raw stream would describe a mic the recorder
          // never hears.
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        })
        ownVad = useVAD()
        vad = ownVad
        await vad.startListening(ownStream)
      }
      track = (options.stream || ownStream)?.getAudioTracks?.()[0]

      const stopLevel = vad.onLevelChange((l: number) => { level.value = l })
      void stopLevel

      step.value = 'room'
      await vad.calibrate(ROOM_MS)

      step.value = 'voice'
      const cal = await vad.measureVoice(VOICE_MS)
      result.value = cal
      step.value = 'done'

      if (cal.voiceLevel == null) {
        // They said nothing, or the mic is dead. The room measurement alone is
        // the old behaviour, so it is what stays in force — but do not save a
        // half-measurement as if it were a checked microphone.
        error.value = 'I did not hear a voice. Check the microphone is not muted, then try the check again.'
        step.value = 'failed'
        return null
      }

      const { key, label } = deviceKeyFor(track)
      const saved: MicProfile = {
        deviceKey: key,
        label,
        noiseFloor: cal.noiseFloor,
        voiceLevel: cal.voiceLevel,
        threshold: cal.threshold,
        headroomDb: cal.headroomDb,
        quality: cal.quality,
        at: Date.now()
      }
      saveProfile(saved)
      profile.value = saved
      return saved
    } catch (e: any) {
      // Permission denied, no input device, an AudioContext the browser will
      // not start. None of these may stop a session.
      error.value = e?.message || 'Could not check the microphone'
      step.value = 'failed'
      return null
    } finally {
      if (ownVad) {
        ownVad.stopListening()
        ownVad = null
      }
      if (ownStream && !options.stream) {
        ownStream.getTracks().forEach(t => t.stop())
        ownStream = null
      }
    }
  }

  function reset() {
    step.value = 'idle'
    result.value = null
    error.value = null
    level.value = 0
  }

  return {
    step,
    isRunning,
    instruction,
    level,
    result,
    profile,
    error,
    roomMs: ROOM_MS,
    voiceMs: VOICE_MS,
    run,
    reset
  }
}
